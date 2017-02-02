'use strict'

const twilio = require('twilio')

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

module.exports.login = function (req, res) {
	var friendlyName = req.body.worker.friendlyName

	/* all token we generate are valid for 1 hour */
	var lifetime = 3600

	taskrouterClient.workspace.workers.get({FriendlyName: friendlyName}, function (err, data) {
		if (err) {
			res.status(500).json(err)
			return
		}

		for (var i = 0; i < data.workers.length; i++) {
			var worker = data.workers[i]

			if (worker.friendlyName === friendlyName) {
				/* create a token for taskrouter */
				var workerCapability = new twilio.TaskRouterWorkerCapability(
					process.env.TWILIO_ACCOUNT_SID,
					process.env.TWILIO_AUTH_TOKEN,
					process.env.TWILIO_WORKSPACE_SID, worker.sid)

				workerCapability.allowActivityUpdates()
				workerCapability.allowReservationUpdates()
				workerCapability.allowFetchSubresources()

				/* create a token for Twilio Client */
				var phoneCapability = new twilio.Capability(
					process.env.TWILIO_ACCOUNT_SID,
					process.env.TWILIO_AUTH_TOKEN)

				phoneCapability.allowClientOutgoing(req.configuration.twilio.applicationSid)
				phoneCapability.allowClientIncoming(friendlyName.toLowerCase())

				var accessToken = new twilio.AccessToken(
					process.env.TWILIO_ACCOUNT_SID,
					process.env.TWILIO_API_KEY_SID,
					process.env.TWILIO_API_KEY_SECRET,
					{ ttl: lifetime })

				accessToken.identity = worker.friendlyName
				
				/* grant the access token Twilio Programmable Chat capabilities */
				var chatGrant = new twilio.AccessToken.IpMessagingGrant({
					serviceSid: process.env.TWILIO_CHAT_SERVICE_SID,
					endpointId: req.body.endpoint
				})

				accessToken.addGrant(chatGrant)

				/* grant the access token Twilio Video capabilities */
				var videoGrant = new twilio.AccessToken.VideoGrant({
					configurationProfileSid: process.env.TWILIO_VIDEO_CONFIGURATION_SID
				})

				accessToken.addGrant(videoGrant)

				var tokens = {
					worker: workerCapability.generate(lifetime),
					phone: phoneCapability.generate(lifetime),
					chatAndVideo: accessToken.toJwt()
				}

				req.session.tokens = tokens
				req.session.worker = worker

				res.status(200).end()

				return
			}

		}
		res.status(404).end()

		return
	})
}

module.exports.logout = function (req, res) {

	req.session.destroy(function (err) {
		if (err) {
			res.status(500).json(err)
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

module.exports.call = function (req, res) {
	var twiml = new twilio.TwimlResponse()

	twiml.dial({ callerId: req.configuration.twilio.callerId }, function (node) {
		node.number(req.query.phone)
	})

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())
}
