'use strict'

const twilio 	= require('twilio')
const async 	= require('async')

/* client for Twilio IP Chat */
const chatClient = new twilio.IpMessagingClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

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
						expression: 'task.team == worker.team'
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
				taskReservationTimeout: '1200',
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
			return res.status(500).json({ code: 'TWILIO_UNKNOWN_ERROR', message: JSON.stringify(err, Object.getOwnPropertyNames(err)) })
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
	var client = new twilio.TaskRouterClient(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN,
		process.env.TWILIO_WORKSPACE_SID
	)

	if (queue.sid) {

		client.workspace.taskQueues(queue.sid).update(queue, function (err) {
			if (err) {
				callback(err)
			} else {
				callback(null, queue)
			}
		})

	} else  {

		client.workspace.taskQueues.create(queue, function (err, queueFromApi) {
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
	var client = new twilio.TaskRouterClient(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN,
		process.env.TWILIO_WORKSPACE_SID
	)

	if (workflow.sid) {
		client.workspace.workflows(workflow.sid).update(workflow, function (err) {
			if (err) {
				callback(err)
			} else {
				callback(null, workflow)
			}
		})
	} else  {
		client.workspace.workflows.create(workflow, function (err, workflowFromApi) {
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
	var client = new twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

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
	var client = new twilio(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN
	)

	var voiceUrl 	=  req.protocol + '://' + req.hostname + '/api/ivr/welcome'
	var smsUrl 		=  req.protocol + '://' + req.hostname + '/api/messaging-adapter/inbound'
	
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
	var webhooks = {}

	var url = req.protocol + '://' + req.hostname + '/api/messaging-adapter/outbound'

	webhooks['Webhooks.OnMessageSent.Url'] = url
	webhooks['Webhooks.OnMessageSent.Method'] = 'POST'


console.log(webhooks)
// "Webhooks.OnMessageSent.Url" => "https://hooks.yoursite.com",

//	webhooks.onMessageSent.Url = req.protocol + '://' + req.hostname + '/api/messaging-adapter/outbound'
//	webhooks.onMessageSent.Method = 'POST'
console.log(webhooks)
	chatClient.services(process.env.TWILIO_IPM_SERVICE_SID).update(webhooks).then(function(response) {
		console.log(response)
		callback(null)
	}).catch(function(error) {
		callback(error);
	})

}

module.exports.getWorkspace = function (req, res) {
	var client = new twilio.TaskRouterClient(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN,
		process.env.TWILIO_WORKSPACE_SID
	)

	client.workspace.get(function (err, workspace) {
		if (err) {
			res.status(500).json({stack: err.stack, message: err.message })
		} else {
			res.status(200).json(workspace)
		}
	})
	
}

module.exports.getActivities = function (req, res) {
	var client = new twilio.TaskRouterClient(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_AUTH_TOKEN,
		process.env.TWILIO_WORKSPACE_SID
	)

	client.workspace.activities.list(function (err, data) {
		if (err) {
			res.status(500).json({stack: err.stack, message: err.message })
		} else {
			res.status(200).json(data.activities)
		}
	})

}

module.exports.verifyPhoneNumber = function (req, res) {	
	var client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN)
	var filter = {
		PhoneNumber: req.body.callerId
	}

	client.incomingPhoneNumbers.list(filter, function (err, data) {
		if(err){
			return res.status(500).json({ code: 'TWILIO_UNKNOWN_ERROR', message: JSON.stringify(err, Object.getOwnPropertyNames(err)) })
		}

		/* phone number not found */
		if (data.incomingPhoneNumbers.length === 0) {
			return res.status(404).json({ code: 'TWILIO_UNKNOWN_PHONE_NUMBER'})
		}

		/* the query returned more than one number, something went wrong */
		if (data.incomingPhoneNumbers.length !== 1) {
			return res.status(500).json({ code: 'TWILIO_MULTIPLE_PHONE_NUMBERS'})
		}

		/* the number does not support voice */
		if (data.incomingPhoneNumbers[0].capabilities.voice === false) {
			return res.status(500).json({ code: 'TWILIO_PHONE_NUMBER_NOT_VOICE_CAPABLE'})
		}

		var sid = data.incomingPhoneNumbers[0].sid
		var capabilities = data.incomingPhoneNumbers[0].capabilities

		res.status(200).json({sid: sid, capabilities: capabilities})

	})
}

module.exports.validate = function (req, res) {
	if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.length !== 34) {
		res.status(500).json({ code: 'TWILIO_ACCOUNT_SID_INVALID'})
		return
	}

	if (!process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN.length !== 32) {
		res.status(500).json({ code: 'TWILIO_AUTH_TOKEN_INVALID'})
		return
	}

	if (!process.env.TWILIO_WORKSPACE_SID || process.env.TWILIO_WORKSPACE_SID.length !== 34) {
		res.status(500).json({ code: 'TWILIO_WORKSPACE_SID_INVALID'})
		return
	}

	async.waterfall([

		function (callback) {

			/* try to access the twilio account */
			module.exports.verifyAccount().then(function (result) {
				callback(null)
			}).catch(function (reason) {
				callback(reason)
			})

		}, function (callback) {

			/* try to access the twilio workspace */
			module.exports.verifyWorkspace().then(function (result) {
				callback(null)
			}).catch(function (reason) {
				callback(reason)
			})

		}, function (callback) {

			if (req.configuration.twilio.applicationSid) {
				callback()
			} else {
				callback('TWILIO_APPLICATION_SID_INVALID')
			}

		},  function (callback) {

			/* try to access the twilio application */
			module.exports.verifyApplication(req.configuration.twilio.applicationSid).then(function (result) {
				callback(null)
			}).catch(function (reason) {
				callback(reason)
			})

		}
	], function (err) {
		if (err) {
			res.status(500).json({ code: err})
			return
		}
		res.status(200).end()
	})

}

module.exports.verifyApplication = function (applicationSid) {
	return new Promise(function (resolve, reject) {
		var client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN)

		client.applications(applicationSid).get(function (err, application) {
			if (err) {
				reject('TWILIO_APPLICATION_NOT_ACCESSIBLE')
			} else {
				resolve()
			}
		})

	})

}

module.exports.verifyAccount = function () {
	return new Promise(function (resolve, reject) {
		var client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN)

		client.accounts(process.env.TWILIO_ACCOUNT_SID).get(function (err, account) {
			if (err) {
				reject('TWILIO_ACCOUNT_NOT_ACCESSIBLE')
			} else {
				resolve()
			}
		})

	})
}

module.exports.verifyWorkspace = function (callback) {
	return new Promise(function (resolve, reject) {
		var client = new twilio.TaskRouterClient(
			process.env.TWILIO_ACCOUNT_SID,
			process.env.TWILIO_AUTH_TOKEN,
			process.env.TWILIO_WORKSPACE_SID
		)

		client.workspace.get(function (err, workspace) {
			if (err) {
				reject('TWILIO_WORKSPACE_NOT_ACCESSIBLE')
			} else {
				resolve()
			}
		})

	})
}

