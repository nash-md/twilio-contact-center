'use strict'

const twilio = require('twilio')
const async = require('async')

/* client for Twilio Programmable Voice */
const client = new twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

/* client for Twilio IP Chat */
const chatClient = new twilio.IpMessagingClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

const service = chatClient.services(process.env.TWILIO_IPM_SERVICE_SID)

module.exports.inbound = function (req, res) {
	req.direction = 'inbound: '

	console.log(req.direction + 'request received: %j', req.body)

	/* basic request body validation */
	if (!req.body.From) {
		return res.status(500).json({ message: 'Invalid request body. "From" is required' })
	}

	if (!req.body.Body) {
		return res.status(500).json({ message: 'Invalid request body. "Body" is required' })
	}

	module.exports.retrieveChannel(req).then(function (channel) {
		console.log(req.direction + 'channel ' + channel.sid + ' received')

		return module.exports.getOngoingTasks(req.body.From).then(function (tasks) {
			console.log(req.direction +  'user ' + req.body.From + ' has ' + tasks.length + ' ongoing task(s)')

			if (tasks.length === 0) {
				return module.exports.createTask(req, channel)
			}

		}).then(function () {

			return service.channels(channel.sid).messages.create({
				from: req.body.From,
				body: req.body.Body
			}).then(function (message) {
				console.log(req.direction + 'chat message for ' + message.from + ' on channel ' + channel.sid + ' created, body "' + message.body + '"')
				res.setHeader('Content-Type', 'application/xml')
				res.status(200).end()
			})

		})

	}).catch(function (err) {
		console.log(req.direction + 'create chat message failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
		res.setHeader('Content-Type', 'application/xml')
		res.status(500).send(JSON.stringify(err, Object.getOwnPropertyNames(err)))
	})

}

module.exports.retrieveChannel = function (req) {
	return new Promise(function (resolve, reject) {

		console.log(req.direction + 'retrieve channel via API for user ', req.body.From)

		return service.channels('support_channel_' + req.body.From).get().then(function (channel) {
			resolve(channel)
		}).catch(function (err) {
			console.error(req.direction + 'retrieve channel failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
			return module.exports.createChannel(req).then(function (channel) {
				resolve(channel)
			}).catch(function (err) {
				reject(err)
			})
		})

	})

}

module.exports.createChannel = function (req) {

	return new Promise(function (resolve, reject) {

		async.waterfall([

			function (callback) {

				service.channels.create({
					friendlyName: 'Support Chat with ' + req.body.From,
					uniqueName: 'support_channel_' + req.body.From,
					attributes: JSON.stringify({ forwarding: true})
				}).then(function (channel) {
					console.log(req.direction + 'channel ' + channel.sid + ' created')
					callback(null, channel)
				}).catch(function (err) {
					console.error(req.direction + 'create channel failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
					callback(err)
				})

			}, function (channel, callback) {

				service.channels(channel.sid).members.create({
					identity: req.body.From
				}).then(function (identity) {
					console.log(req.direction + 'added member ' + identity.sid  + '(' + req.body.From + ') to channel ' + channel.sid)
					callback(null, channel)
				}).catch(function (err) {
					console.error(req.direction + 'added member ' + req.body.From + ' to channel ' + channel.sid + 'failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
					callback(err)
				})

			}, function (channel, callback) {

				module.exports.createTask(req, channel).then(function (task) {
					callback(null, channel)
				}).catch(function (error) {
					callback(error)
				})

			}
		], function (err, channel) {
			if (err) {
				reject(err)
			} else {
				resolve(channel)
			}
		})

	})

}

module.exports.getOngoingTasks = function (name) {

	return new Promise(function (resolve, reject) {
		var query = {}
		query.AssignmentStatus = 'pending,assigned,reserved'
		query.EvaluateTaskAttributes = 'name=\'' + name + '\''

		taskrouterClient.workspace.tasks.list(query, function (err, data) {
			if (err) {
				return reject(err)
			}

			return resolve(data.tasks)
		})

	})

}

module.exports.createTask = function (req, channel) {

	return new Promise(function (resolve, reject) {
		var title 		= null
		var text 			= null
		var endpoint	= null

		if (req.body.From.includes('Messenger')) {
			title 		= 'Facebook Messenger request'
			text 			= 'Customer requested support on Faceboook'
			endpoint 	= 'messenger'
		} else {
			title 		= 'SMS request'
			text 			= 'Customer requested support by sending SMS'
			endpoint 	= 'sms'
		}

		taskrouterClient.workspace.tasks.create({
			workflowSid: req.configuration.twilio.workflowSid,
			attributes: JSON.stringify({
				title: title,
				text: text,
				channel: 'chat',
				endpoint: endpoint,
				team: 'support',
				name: req.body.From,
				channelSid: channel.sid
			}), timeout: 3600
		}, function (err, task) {
			if (err) {
				console.error('create task failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
				reject(err)
			} else {
				console.log(req.direction + 'task ' + task.sid + ' created with attributes %j', task.attributes)
				resolve(task)
			}
		})

	})

}

module.exports.forwardChannel = function (channel, req) {

	return service.channels(channel.sid).members.list().then(function (data) {

		return new Promise(function (resolve, reject) {
			console.log(req.direction + 'channel ' + channel.sid + ' has ' + data.members.length + ' member(s)')

			async.each(data.members, function (member, callback) {

				/* never forward message the user who created it */
				if (req.body.From === member.identity) {
					return callback()
				}

				console.log(req.direction + 'forward message "' + req.body.Body + '" to identity ' + member.identity)

				module.exports.forwardMessage(member.identity, req.body.Body, req).then(function (message) {
					callback()
				}).catch(function (err) {
					callback(err)
				})

			}, function (err) {
				if (err) {
					return reject(err)
				}

				resolve()
			})

		})

	})
}

module.exports.forwardMessage = function (to, body, req) {

	return new Promise(function (resolve, reject) {
		var from

		if (to.includes('Messenger')) {
			from = 'Messenger:' + req.configuration.twilio.facebookPageId
		} else {
			from = req.configuration.twilio.callerId
		}

		client.messages.create({
			to: to,
			from: from,
			body: body
		}, function (err, message) {
			if (err) {
				console.error(req.direction + ' sending message failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
				reject(err)
			} else {
				console.log(req.direction + 'message ' + message.sid + ' create, body is "' + body + '" sent to endpoint ' + to + ', sender is ' + from)
				resolve(message)
			}
		})

	})

}

module.exports.outbound = function (req, res) {
	req.direction = 'outbound: '

	console.log(req.direction + 'request received: %j', req.body)

	service.channels(req.body.ChannelSid).get().then(function (channel) {
		console.log(req.direction + 'channel ' + channel.sid + ' received')

		var attributes = JSON.parse(channel.attributes)

		if (!attributes.forwarding) {
			console.log(req.direction + 'channel ' + channel.sid + ' needs no forwarding')
			res.status(200).end()
		} else {

			return module.exports.forwardChannel(channel, req).then(function () {
			}).then(function () {
				console.log(req.direction + 'message forwarding for channel ' + channel.sid + ' done')
				res.setHeader('Content-Type', 'application/xml')
				res.status(200).end()
			})

		}

	}).catch(function (err) {
		console.log(req.direction + 'forwarding chat message failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
		res.setHeader('Content-Type', 'application/xml')
		res.status(500).send(JSON.stringify(err, Object.getOwnPropertyNames(err)))
	})
}