const twilio 	= require('twilio')
const async = require('async')

const taskrouterHelper = require('./helpers/taskrouter-helper.js')

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

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

	retrieveChannel(req).then(function (channel) {
		console.log(req.direction + 'channel ' + channel.sid + ' received')

		return taskrouterHelper.getOngoingTasks(req.body.From).then(function (tasks) {
			console.log(req.direction +  'user ' + req.body.From + ' has ' + tasks.length + ' ongoing task(s)')

			if (tasks.length === 0) {
				return createTask(req, channel)
			}

		}).then(function () {

			return client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels(channel.sid).messages.create({
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

var retrieveChannel = function (req) {
	return new Promise(function (resolve, reject) {

		console.log(req.direction + 'retrieve channel via API for user ', req.body.From)

		return client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels('support_channel_' + req.body.From).fetch()
			.then(function (channel) {
				resolve(channel)
			}).catch(function (err) {
				console.error(req.direction + 'retrieve channel failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
				return createChannel(req).then(function (channel) {
					resolve(channel)
				}).catch(function (err) {
					reject(err)
				})
			})

	})

}

var createChannel = function (req) {

	return new Promise(function (resolve, reject) {

		async.waterfall([

			function (callback) {

				client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.create({
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

				client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels(channel.sid).members.create({
					identity: req.body.From
				}).then(function (identity) {
					console.log(req.direction + 'added member ' + identity.sid  + '(' + req.body.From + ') to channel ' + channel.sid)
					callback(null, channel)
				}).catch(function (err) {
					console.error(req.direction + 'added member ' + req.body.From + ' to channel ' + channel.sid + 'failed: %s', JSON.stringify(err, Object.getOwnPropertyNames(err)))
					callback(err)
				})

			}, function (channel, callback) {

				createTask(req, channel).then(function (task) {
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

var createTask = function (req, channel) {

	return new Promise(function (resolve, reject) {
		let title 		= null
		let text 			= null
		let endpoint	= null

		if (req.body.From.includes('messenger')) {
			title 		= 'Facebook Messenger request'
			text 			= 'Customer requested support on Faceboook'
			endpoint 	= 'messenger'
		} else {
			title 		= 'SMS request'
			text 			= 'Customer requested support by sending SMS'
			endpoint 	= 'sms'
		}

		const attributes = {
			title: title,
			text: text,
			channel: 'chat',
			endpoint: endpoint,
			team: 'support',
			name: req.body.From,
			channelSid: channel.sid
		}

		taskrouterHelper.createTask(req.configuration.twilio.workflowSid, attributes).then(task => {
			console.log(req.direction + 'task ' + task.sid + ' created with attributes %j', task.attributes)
			resolve(task)
		}).catch(error => {
			console.error('create task failed: %s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
			reject(error)
		})

	})

}

var forwardChannel = function (channel, req) {

	return client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels(channel.sid).members.list()
		.then(function (members) {

			return new Promise(function (resolve, reject) {
				console.log(req.direction + 'channel ' + channel.sid + ' has ' + members.length + ' member(s)')

				async.each(members, function (member, callback) {

					/* never forward message the user who created it */
					if (req.body.From === member.identity) {
						return callback()
					}

					console.log(req.direction + 'forward message "' + req.body.Body + '" to identity ' + member.identity)

					forwardMessage(member.identity, req.body.Body, req).then(function (message) {
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

var forwardMessage = function (to, body, req) {

	return new Promise(function (resolve, reject) {
		let from

		if (to.includes('messenger')) {
			from = 'messenger:' + req.configuration.twilio.facebookPageId
		} else {
			from = req.configuration.twilio.callerId
		}

		client.messages.create({
			to: to,
			from: from,
			body: body
		})
		.then(message => {
			console.log(req.direction + 'message ' + message.sid + ' create, body is "' + body + '" sent to endpoint ' + to + ', sender is ' + from)
			resolve(message)
		}).catch(error => {
			console.error(req.direction + ' sending message failed: %s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
			reject(error)
		})

	})

}

module.exports.outbound = function (req, res) {
	req.direction = 'outbound: '

	console.log(req.direction + 'request received: %j', req.body.Body + ' - ' + new Date())

	client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels(req.body.ChannelSid).fetch()
		.then(function (channel) {
			console.log(req.direction + 'channel ' + channel.sid + ' received')

			let attributes = JSON.parse(channel.attributes)

			if (!attributes.forwarding) {
				console.log(req.direction + 'channel ' + channel.sid + ' needs no forwarding')
				res.status(200).end()
			} else {

				forwardChannel(channel, req)
					.then(function () {
						console.log(req.direction + 'message forwarding for channel ' + channel.sid + ' done')
						res.status(200).send('blah')
					})

			}

		}).catch(function (err) {
			console.log(req.direction + 'forwarding chat message failed: %s', res.convertErrorToJSON(err))
			res.status(500).send(res.convertErrorToJSON(err))
		})
}