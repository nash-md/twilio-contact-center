const twilio = require('twilio')

const AccessToken = twilio.jwt.AccessToken

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN
)

const taskrouterHelper = require('./helpers/taskrouter-helper.js')
const clientHelper = require('./helpers/client-helper.js')

module.exports.login = function (req, res) {
	const friendlyName = req.body.worker.friendlyName

	const filter = { friendlyName: friendlyName }

	client.taskrouter
		.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.workers.list(filter)
		.then(workers => {

			let worker = workers.find(worker => worker.friendlyName === friendlyName)

			if (worker) {
				const tokens = createWorkerTokens(
					req.configuration,
					worker,
					req.body.endpoint
				)

				req.session.tokens = tokens
				req.session.worker = {
					sid: worker.sid,
					friendlyName: worker.friendlyName,
					attributes: worker.attributes
				}

				res.status(200).end()
			} else {
				res.status(404).end()
			}

		})
		.catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})
}

var createWorkerTokens = function (configuration, worker, endpoint) {
	/* all token we generate are valid for 1 hour */
	const lifetime = 3600

	/* create a token for Twilio TaskRouter */
	const workerCapability = taskrouterHelper.createWorkerCapabilityToken(
		worker.sid
	)

	/* create a token for Twilio TaskRouter */
	const clientAccessToken = clientHelper.createAccessToken(
		worker.friendlyName, configuration.twilio.applicationSid, lifetime
	)

	const accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: lifetime }
	)

	accessToken.identity = worker.friendlyName

	/* grant the token Twilio Programmable Chat capabilities */
	const chatGrant = new AccessToken.ChatGrant({
		serviceSid: process.env.TWILIO_CHAT_SERVICE_SID,
		endpointId: endpoint
	})

	/* grant the access token Twilio Video capabilities */
	const videoGrant = new AccessToken.VideoGrant()

	accessToken.addGrant(chatGrant)
	accessToken.addGrant(videoGrant)

	return {
		worker: workerCapability.toJwt(),
		access: accessToken.toJwt(),
		voice: clientAccessToken.toJwt()
	}
}

module.exports.logout = function (req, res) {
	req.session.destroy(function (error) {
		if (error) {
			res.status(500).send(res.convertErrorToJSON(error))
		} else {
			res.status(200).end()
		}
	})
}

module.exports.getSession = function (req, res) {
	if (!req.session.worker) {
		res.status(403).end()
	} else {
		res.status(200).json({
			tokens: req.session.tokens,
			worker: req.session.worker,
			configuration: {
				twilio: req.configuration.twilio
			}
		})
	}
}
