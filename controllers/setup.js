const Twilio 	= require('twilio')
const async 	= require('async')

const client = new Twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.get = function (req, res) {
	res.status(200).json(req.configuration)
}

module.exports.update = function (req, res) {
	let config = req.body.configuration

	async.waterfall([

		function (callback) {

			module.exports.createOrUpdateApplication(config, req, function (err, application) {
				if (err) {
					console.log('Setup Failure: Error setting up Twilio client application.')
					callback(err)
				} else {
					config.twilio.applicationSid = application.sid

					callback(null, config)
				}
			})

		}, function (config, callback) {

			module.exports.updateMessagingService(req, config, function (err) {
				if (err) {
					console.log('Setup Failure: Error updating messaging service.')
					callback(err)
				} else {
					callback(null, config)
				}
			})

		}, function (config, callback) {

			module.exports.syncQueues(config, function (err) {
				if (err) {
					console.log('Setup Failure: Error establishing queues.')
					callback(err)
				} else {
					callback(null, config)
				}
			})

		}, function (config, callback) {
			let workflowConfiguration = { task_routing: { filters: [] }}

			for (let i = 0; i < config.queues.length; i++) {
				let target = {
					queue: config.queues[i].taskQueueSid
				}

				if (config.queues[i].targetWorkerExpression) {
					target.expression = config.queues[i].targetWorkerExpression
				}

				let item = {
					targets: [target],
					expression: config.queues[i].expression,
					filterFriendlyName: config.queues[i].filterFriendlyName
				}

				workflowConfiguration.task_routing.filters.push(item)
			}

			const workflow = {
				sid: config.twilio.workflowSid,
				friendlyName: 'Twilio Contact Center Workflow',
				taskReservationTimeout: 1200,
				configuration: JSON.stringify(workflowConfiguration)
			}

			module.exports.createOrUpdateWorkflow(workflow, function (err, workflow) {

				if (err) {
					console.log('Setup Failure: Error setting up workflows.')
					callback(err)
				} else {
					config.twilio.workflowSid = workflow.sid
					callback(null, config)
				}
			})

		}, function (config, callback) {

			req.util.setConfiguration(config, function (err) {
				if (err) {
					callback(err)
				} else {
					callback()
				}
			})

		}
	], function (err) {
		if (err) {
			res.status(500).send(res.convertErrorToJSON(err))
			return
		}

		res.status(200).end()
	})

}

module.exports.syncQueues = function (config, callback) {
	let queues = config.queues

	/* create queues */
	async.eachSeries(queues, function (queue, next) {
		let queueForSync = {
			sid: queue.taskQueueSid,
			friendlyName: queue.friendlyName,
			reservationActivitySid: config.twilio.workerReservationActivitySid,
			assignmentActivitySid: config.twilio.workerAssignmentActivitySid,
			targetWorkers: 'channels HAS "' + queue.id + '"'
		}

		module.exports.createOrUpdateQueue(queueForSync, function (err, queueFromApi) {
			if (err) {
				console.log('Queue Setup Failure: Problem setting up specific queue.')
				callback(err)
			} else {
				queue.taskQueueSid = queueFromApi.sid
				next()
			}
		})
	}, function () {
		callback(null, config)
	})
}

module.exports.createOrUpdateQueue = function (queue, callback) {
	if (queue.sid) {

		client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).taskQueues(queue.sid).update(queue, function (err) {
			if (err) {
				callback(err)
			} else {
				callback(null, queue)
			}
		})

	} else  {

		client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).taskQueues.create(queue, function (err, queueFromApi) {
			if (err) {
				callback(err)
			} else {
				queue.sid = queueFromApi.sid
				callback(null, queue)
			}
		})
	}
}

module.exports.createOrUpdateWorkflow = function (workflow, callback) {
	if (workflow.sid) {

		client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workflows(workflow.sid).update(workflow, function (err) {
			if (err) {
				callback(err)
			} else {
				callback(null, workflow)
			}
		})

	} else  {

		client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workflows.create(workflow, function (err, workflowFromApi) {
			if (err) {
				callback(err)
			} else {
				workflow.sid = workflowFromApi.sid
				callback(null, workflow)
			}
		})

	}
}

module.exports.createOrUpdateApplication = function (configuration, req, callback) {
	const url =  req.protocol + '://' + req.hostname + '/api/phone/call'

	if (configuration.twilio.applicationSid) {

		client.applications(configuration.twilio.applicationSid).update({
			friendlyName: 'Twilio Contact Center Demo',
			voiceUrl: url,
			voiceMethod: 'POST'
		}, function (err, application) {
			if (err) {
				callback(err)
			} else {
				callback(null, application)
			}
		})

	} else  {

		client.applications.create({
			friendlyName: 'Twilio Contact Center Demo',
			voiceUrl: url,
			voiceMethod: 'POST'
		}, function (err, application) {
			if (err) {
				callback(err)
			} else {
				callback(null, application)
			}
		})

	}
}

module.exports.updateMessagingService = function (req, config, callback) {
	const url = req.protocol + '://' + req.hostname + '/api/messaging-adapter/outbound'

	let webhooks = {}

	webhooks.postWebhookUrl = url
	webhooks.webhookFilters = 'onMessageSent'
	webhooks.webhookMethod = 'POST'

	client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).update(webhooks)
		.then(function (res) {
			callback(null)
		}).catch(function (err) {
			console.log(err)
			callback(err)
		})

}