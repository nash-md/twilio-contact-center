/* this route creates tasks for our customers */

const twilio 	= require('twilio')

const AccessToken 	= twilio.jwt.AccessToken
const VideoGrant 		= twilio.jwt.AccessToken.VideoGrant
const ChatGrant 		= twilio.jwt.AccessToken.ChatGrant

const taskrouterHelper = require('./helpers/taskrouter-helper.js')
const chatHelper = require('./helpers/chat-helper.js')

module.exports.createCallback = function (req, res) {

	taskrouterHelper.createTask(req.configuration.twilio.workflowSid, req.body)
		.then(task => {
			res.status(200).end()
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}

module.exports.createChat = function (req, res) {
	/* create token */
	const accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: 3600 })

	/* grant the access token Twilio Programmable Chat capabilities */
	const chatGrant = new ChatGrant({
		serviceSid: process.env.TWILIO_CHAT_SERVICE_SID,
		endpointId: req.body.endpoint
	})

	accessToken.addGrant(chatGrant)
	accessToken.identity = req.body.identity

	let payload = {
		identity: req.body.identity,
		token: accessToken.toJwt()
	}

	chatHelper.createChannel(req.body.identity).then(channel => {
		payload.channel = {
			sid: channel.sid,
			friendlyName: channel.friendlyName,
			uniqueName: channel.uniqueName,
		}

		const attributes = {
			title: 'Chat request',
			text: 'Customer entered chat via support page',
			channel: 'chat',
			name: payload.identity,
			channelSid: channel.sid
		}

		return taskrouterHelper.createTask(req.configuration.twilio.workflowSid, attributes)
			.then(task => {
				payload.task = task.sid
				res.status(200).json(payload)
			})

	}).catch(error => {
		res.status(500).json(error)
	})

}

module.exports.createVideo = function (req, res) {
	/* create token */
	const accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: 3600 }
	)

	/* grant the access token Twilio Programmable Video capabilities */
	const videoGrant = new VideoGrant()

	accessToken.addGrant(videoGrant)
	accessToken.identity = req.body.identity

	const uid = Math.random().toString(36).substring(7)

	let payload = {
		identity: req.body.identity,
		token: accessToken.toJwt(),
		roomName: uid
	}

	const attributes = {
		title: 'Video request',
		text: 'Customer requested video support on web page',
		channel: 'video',
		name: payload.identity,
		roomName: payload.roomName
	}

	taskrouterHelper.createTask(req.configuration.twilio.workflowSid, attributes)
		.then(task => {
			payload.task = task.sid
			res.status(200).json(payload)
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}