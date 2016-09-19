'use strict'

const twilio 	= require('twilio')
const async 	= require('async')

/* client for Twilio Programmable Voice / SMS */
const client = new twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

/* client for Twilio IP Chat */
const chatClient = new twilio.IpMessagingClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

/* check if the application runs on heroku */
var util

if (process.env.DYNO) {
	util = require('../util-pg.js')
} else {
	util = require('../util-file.js')
}

module.exports.get = function (req, res) {
	res.status(200).json(req.configuration)
}

module.exports.update = function (req, res) {
	var config = req.body.configuration

	async.waterfall([

		function (callback) {

			module.exports.createOrUpdateApplication(config, req, function (err, application) {
				if (err) {
					callback(err)
				} else {
					config.twilio.applicationSid = application.sid

					callback(null, config)
				}
			})

		}, function (config, callback) {

			module.exports.updateInboundPhoneNumber(req, config, function (err) {
				if (err) {
					callback(err)
				} else {
					callback(null, config)
				}
			})

		}, function (config, callback) {

			module.exports.updateMessagingService(req, config, function (err) {
				if (err) {
					callback(err)
				} else {
					callback(null, config)
				}
			})

		}, function (config, callback) {

			module.exports.syncQueues(config, function (err) {
				if (err) {
					callback(err)
				} else {
					callback(null, config)
				}
			})

		}, function (config, callback) {
			var workflowConfiguration = { task_routing: { filters: [] }}

			for (var i = 0; i < config.queues.length; i++) {
				var target = {
					targets: [{
						queue: config.queues[i].taskQueueSid,
						expression: config.queues[i].targetWorkerExpression
					}],
					expression: config.queues[i].expression
				}

				workflowConfiguration.task_routing.filters.push(target)
			}

			var callbackUrl = req.protocol +
				'://' +
				req.hostname +
				'/api/taskrouter/assignment'

			var workflow = {
				sid: config.twilio.workflowSid,
				friendlyName: 'Twilio Contact Center Workflow',
				assignmentCallbackUrl: callbackUrl,
				taskReservationTimeout: 1200,
				configuration: JSON.stringify(workflowConfiguration)
			}

			module.exports.createOrUpdateWorkflow(workflow, function (err, workflow) {
				if (err) {
					callback(err)
				} else {
					config.twilio.workflowSid = workflow.sid
					callback(null, config)
				}
			})

		}, function (config, callback) {

			util.setConfiguration(config, function (err) {
				if (err) {
					callback(err)
				} else {
					callback()
				}
			})

		}
	], function (err) {
		if (err) {
			res.status(500).json({code: 'TWILIO_UNKNOWN_ERROR', message: util.convertToString(err)})
			return
		}

		res.status(200).end()
	})

}

module.exports.syncQueues = function (config, callback) {
	var queues = config.queues

	/* create queues */
	async.eachSeries(queues, function (queue, next) {
		var queueForSync = {
			sid: queue.taskQueueSid,
			friendlyName: queue.friendlyName,
			reservationActivitySid: config.twilio.workerReservationActivitySid,
			assignmentActivitySid: config.twilio.workerAssignmentActivitySid,
			targetWorkers: 'channels HAS "' + queue.id + '"'
		}

		module.exports.createOrUpdateQueue(queueForSync, function (err, queueFromApi) {
			if (err) {
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

		taskrouterClient.workspace.taskQueues(queue.sid).update(queue, function (err) {
			if (err) {
				callback(err)
			} else {
				callback(null, queue)
			}
		})

	} else  {

		taskrouterClient.workspace.taskQueues.create(queue, function (err, queueFromApi) {
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

		taskrouterClient.workspace.workflows(workflow.sid).update(workflow, function (err) {
			if (err) {
				callback(err)
			} else {
				callback(null, workflow)
			}
		})

	} else  {

		taskrouterClient.workspace.workflows.create(workflow, function (err, workflowFromApi) {
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
	var url =  req.protocol + '://' + req.hostname + '/api/agents/call'

	if (configuration.twilio.applicationSid) {

		client.applications(configuration.twilio.applicationSid).update({
			friendlyName: 'Twilio Contact Center Demo',
			voiceUrl: url,
			voiceMethod: 'GET'
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
			voiceMethod: 'GET'
		}, function (err, application) {
			if (err) {
				callback(err)
			} else {
				callback(null, application)
			}
		})

	}
}

module.exports.updateInboundPhoneNumber = function (req, config, callback) {
	var voiceUrl 	=  req.protocol + '://' + req.hostname + '/api/ivr/welcome'
	var smsUrl 		=  req.protocol + '://' + req.hostname + '/api/messaging-adapter/inbound'

	// if no call sid was provided, skip phone number configuration
	if (!req.body.sid) {
		return callback(null)
	}

	client.incomingPhoneNumbers(req.body.sid).update({
		voiceUrl: voiceUrl,
		voiceMethod: 'GET',
		smsUrl: smsUrl,
		smsMethod: 'POST'
	}, function (err) {
		if (err) {
			callback(err)
		} else {
			callback(null)
		}
	})

}

module.exports.updateMessagingService = function (req, config, callback) {
	var url = req.protocol + '://' + req.hostname + '/api/messaging-adapter/outbound'

	var webhooks = {}
	webhooks['Webhooks.OnMessageSent.Url'] = url
	webhooks['Webhooks.OnMessageSent.Method'] = 'POST'

	chatClient.services(process.env.TWILIO_IPM_SERVICE_SID).update(webhooks).then(function (res) {
		callback(null)
	}).catch(function (error) {
		callback(error)
	})

}

module.exports.getWorkspace = function (req, res) {

	taskrouterClient.workspace.get(function (err, workspace) {
		if (err) {
			res.status(500).json({stack: err.stack, message: err.message })
		} else {
			res.status(200).json(workspace)
		}
	})

}

module.exports.getActivities = function (req, res) {

	taskrouterClient.workspace.activities.list(function (err, data) {
		if (err) {
			res.status(500).json({stack: err.stack, message: err.message })
		} else {
			res.status(200).json(data.activities)
		}
	})

}
