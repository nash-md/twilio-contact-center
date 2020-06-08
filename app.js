'use-strict'

var express       = require('express')
var bodyParser    = require('body-parser')
var sessions      = require('express-session')
var compression   = require('compression')

const context = require('./context')

var { isRunningOnHeroku, isRunningOnGoogle } = require('./util-cloud-provider')

/* check the environment the application is running on */
let util

if (isRunningOnHeroku()) {
	console.log('application is running on Heroku')
	util = require('./util-heroku-pg.js')
	util.createConfigurationIfNotExists()
} else if (isRunningOnGoogle()) {
	console.log('application is running on Google App Engine')
	util = require('./util-google-cloud-datastore.js')
	util.createConfigurationIfNotExists()
} else {
	console.log('application is running on unknown host with local configuration')
	util = require('./util-file.js')
}

util.getConfiguration(function (error, configuration) {
	if (error) {
		console.log(error)
	} else {
		context.set({ configuration: configuration })
	}
})

var app = express()

app.set('port', (process.env.PORT || 5000))

app.use(compression())
app.use(sessions({
	resave: true,
	saveUninitialized: false,
	secret: 'keyboard cat',
	name: 'twilio_call_center_session',
	cookie: { maxAge: 3600000 }
}))

app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({
	extended: true
}))

app.enable('trust proxy')

app.use(function (req, res, next) {

	var replaceErrors = function (key, value) {
		if (value instanceof Error) {
			var error = {}

			Object.getOwnPropertyNames(value).forEach(function (key) {
				error[key] = value[key]
			})

			return error
		}

		return value
	}

	res.convertErrorToJSON = (error) => {
		console.log(error)

		return JSON.stringify(error, replaceErrors)
	}

	next()
})

app.use(function (req, res, next) {

	if (!context.get() || !context.get().configuration) {
		res.status(500).send('error: configuration could not be loaded')
	} else {
		req.configuration = context.get().configuration
		req.util = util
		next()
	}

})

app.use('/', function (req, res, next) {
	if (req.path.substr(0,4) === '/api') {
		res.set({
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=0',
		})
	}

	/* override content type for twiml routes */
	if (req.path.includes('/api/ivr')) {
		res.set({
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=0',
		})
	}

	next()
})

var router = express.Router()

var setup = require('./controllers/setup.js')

router.route('/setup').get(setup.get)
router.route('/setup').post(setup.update)

var setupPhoneNumber = require('./controllers/setup-phone-number.js')

router.route('/setup/phone-number/validate').post(setupPhoneNumber.validate)
router.route('/setup/phone-number').post(setupPhoneNumber.update)

var validate = require('./controllers/validate.js')

router.route('/validate/setup').post(validate.validateSetup)

var tasks = require('./controllers/tasks.js')

router.route('/tasks/callback').post(tasks.createCallback)
router.route('/tasks/chat').post(tasks.createChat)
router.route('/tasks/video').post(tasks.createVideo)

/* routes for agent interface and phone */
var agents = require('./controllers/agents.js')

router.route('/agents/login').post(agents.login)
router.route('/agents/logout').post(agents.logout)
router.route('/agents/session').get(agents.getSession)

var phone = require('./controllers/phone.js')

router.route('/phone/call').post(phone.call)
router.route('/phone/call/:sid/add-participant/:phone').post(phone.addParticipant)
router.route('/phone/call/:sid/conference').get(phone.getConference)
router.route('/phone/hold').post(phone.hold)

var phoneTransfer = require('./controllers/phone-transfer.js')

router.route('/phone/transfer/available-workers').get(phoneTransfer.getAvailableWorkers)
router.route('/phone/transfer/:sid').post(phoneTransfer.create)
router.route('/phone/transfer/:sid/forward/:to/initiated-by/:from').post(phoneTransfer.forward)

/* routes for IVR */
var ivr = require('./controllers/ivr.js')

router.route('/ivr/welcome').get(ivr.welcome)
router.route('/ivr/select-team').get(ivr.selectTeam)
router.route('/ivr/create-task').get(ivr.createTask)

/* routes called by the Twilio TaskRouter */
var taskrouter = require('./controllers/taskrouter.js')

router.route('/taskrouter/workspace').get(taskrouter.getWorkspace)
router.route('/taskrouter/activities').get(taskrouter.getActivities)

var workers = require('./controllers/workers.js')

router.route('/workers').get(workers.list)
router.route('/workers').post(workers.create)
router.route('/workers/:id').delete(workers.delete)

/* routes for messaging adapter */
var messagingAdapter = require('./controllers/messaging-adapter.js')

router.route('/messaging-adapter/inbound').post(messagingAdapter.inbound)
router.route('/messaging-adapter/outbound').post(messagingAdapter.outbound)

app.use('/api', router)
app.use('/', express.static(__dirname + '/public'))

app.listen(app.get('port'), function () {
	console.log('magic happens on port', app.get('port'))
})
