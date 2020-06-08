const twilio = require('twilio')

const AccessToken = twilio.jwt.AccessToken

const taskrouterHelper = require('./helpers/taskrouter-helper.js')

module.exports.login = function (req, res) {

	taskrouterHelper.findWorker(req.body.worker.friendlyName).then((worker) => {

		if (worker) {
			req.session.tokens = {
				access: createAccessToken(req.configuration.twilio.applicationSid, worker.friendlyName, req.body.endpointId),
				worker: createWorkerTokens(worker.sid)
			}
			req.session.worker = {
				sid: worker.sid,
				friendlyName: worker.friendlyName,
				attributes: worker.attributes
			}
			res.status(200).end()
		} else {
			res.status(404).end()
		}

	}).catch(error => {
		res.status(500).send(res.convertErrorToJSON(error))
	})

}

const createAccessToken = (applicationSid, friendlyName, endpointId) => {
	const lifetime = 3600

	const accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: lifetime }
	)

	accessToken.identity = friendlyName

	/* grant the token Twilio Programmable Chat capabilities */
	const chatGrant = new AccessToken.ChatGrant({
		serviceSid: process.env.TWILIO_CHAT_SERVICE_SID,
		endpointId: endpointId
	})

	/* grant the access token Twilio Video capabilities */
	const videoGrant = new AccessToken.VideoGrant()

	/* grant the token Twilio Client capabilities */
	const clientGrant = new AccessToken.VoiceGrant({
		incomingAllow: true,
		outgoingApplicationSid: applicationSid
	})

	accessToken.addGrant(chatGrant)
	accessToken.addGrant(videoGrant)
	accessToken.addGrant(clientGrant)

	return accessToken.toJwt()

}

const createWorkerTokens = (sid) => {
	/* all token we generate are valid for 1 hour */
	const lifetime = 3600

	/* create a token for Twilio TaskRouter */
	const workerCapability = taskrouterHelper.createWorkerCapabilityToken(sid)

	return workerCapability.toJwt()
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
