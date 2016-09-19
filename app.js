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
app.use(sessions({resave: true,
									saveUninitialized: false,
									secret: 'keyboard cat',
									name: 'twilio_call_center_session',
									cookie: { expires: util.generateSessionExirationDate(3600)}
								}))

app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({
	extended: true
}))


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

var router = express.Router()

var setup = require('./controllers/setup.js')

router.route('/setup').get(setup.get)
router.route('/setup').post(setup.update)
router.route('/setup/workspace').get(setup.getWorkspace)
router.route('/setup/activities').get(setup.getActivities)

var validate = require('./controllers/validate.js')

router.route('/validate/setup').post(validate.validateSetup)
router.route('/validate/phone-number').post(validate.validatePhoneNumber)

var tasks = require('./controllers/tasks.js')

router.route('/tasks/callback').post(tasks.createCallback)
router.route('/tasks/chat').post(tasks.createChat)

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

router.route('/taskrouter/assignment').post(taskrouter.assignment)

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