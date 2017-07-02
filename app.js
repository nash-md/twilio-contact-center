'use-strict'

/**
 * Load Twilio configuration from .env config file - the following environment
 * variables should be set:
 * process.env.TWILIO_ACCOUNT_SID
 * process.env.TWILIO_AUTH_TOKEN
 * process.env.TWILIO_WORKSPACE_SID
 * process.env.TWILIO_CHAT_SERVICE_SID
 * process.env.TWILIO_API_KEY_SID
 * process.env.TWILIO_API_KEY_SECRET
 */
require('dotenv').load()

var express       = require('express')
var bodyParser    = require('body-parser')
var sessions      = require('express-session')
var compression   = require('compression')

/* check if the application runs on heroku */
var util

if (process.env.DYNO) {
	util = require('./util-pg.js')
} else {
	util = require('./util-file.js')
}

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

	util.getConfiguration(function (err, configuration) {
		if (err) {
			res.status(500).json({stack: err.stack, message: err.message})
		} else {
			req.configuration = configuration
			req.util = util
			next()
		}
	})

})

app.use('/', function (req, res, next) {
	if (req.path.substr(0,4) === '/api') {
		res.set({
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=0',
		})
	}

	/* override content type for twiml routes */
	if (req.path.includes('/api/ivr') || req.path.includes('/agents/call')) {
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
router.route('/agents/call').get(agents.call)

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
app.use('/scripts/bootstrap.min.js', express.static(__dirname + '/node_modules/bootstrap/dist/js/bootstrap.min.js'))
app.use('/styles/bootstrap.min.css', express.static(__dirname + '/node_modules/bootstrap/dist/css/bootstrap.min.css'))
app.use('/scripts/angular.min.js', express.static(__dirname + '/node_modules/angular/angular.min.js'))
app.use('/scripts/angular-messages.min.js', express.static(__dirname + '/node_modules/angular-messages/angular-messages.min.js'))
app.use('/scripts/checklist-model.js', express.static(__dirname + '/node_modules/checklist-model/checklist-model.js'))
app.use('/scripts/angular-scrollglue.js', express.static(__dirname + '/node_modules/angularjs-scroll-glue/src/scrollglue.js'))
app.use('/scripts/angular-translate.min.js', express.static(__dirname + '/node_modules/angular-translate/dist/angular-translate.min.js'))
app.use('/scripts/angular-translate-loader-static-files.min.js', express.static(__dirname + '/node_modules/angular-translate/dist/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js'))
app.use('/scripts/moment.min.js', express.static(__dirname + '/node_modules/moment/min/moment.min.js'))

app.listen(app.get('port'), function () {
	console.log('magic happens on port', app.get('port'))
})
