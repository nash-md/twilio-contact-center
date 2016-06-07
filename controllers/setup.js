var twilio 			= require('twilio')
var async 			= require("async")

/* check if the application runs on heroku */
var util

if(process.env.DYNO){
	util = require("../util-pg.js")
} else {
	util = require("../util-file.js")
}

module.exports.get = function(req, res) {
	
	res.status(200).json(req.configuration)

}

module.exports.update = function(req, res) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)
	var configuration = req.body.configuration

	async.waterfall([

		function(callback){

			module.exports.syncQueues(configuration, function(err, options){	

				if(err){
					callback(err)
				} else {
					callback(null, configuration)
				}

			})

		}, function(configuration, callback){

			var workflowConfiguration = { task_routing: { filters: [] }}

			for (var i = 0; i < configuration.queues.length; i++) {

				var target = { 
					targets: [{ queue:  configuration.queues[i].taskQueueSid, expression: 'task.team == worker.team' }], 
					expression: configuration.queues[i].expression
				}
				workflowConfiguration.task_routing.filters.push(target)	
			}
			
			var workflow = { sid: configuration.twilio.workflowSid,
				friendlyName: 'Omni Channel Demo Workflow',
				assignmentCallbackUrl: req.protocol + '://' + req.hostname + '/api/taskrouter/assignment',
				taskReservationTimeout: '1200',
				configuration: JSON.stringify(workflowConfiguration)
			}

			module.exports.createOrUpdateWorkflow(workflow, function(err, workflow){	
				
				if (err){ 
					callback(err)
				} else {
					configuration.twilio.workflowSid = workflow.sid
					callback(null, configuration)
				}

			})

		}, function(configuration, callback){

			module.exports.createOrUpdateApplication(req, function(err, application){	
				
				if (err){ 
					callback(err)
				} else {
					configuration.twilio.applicationSid = application.sid
					callback(null, configuration)
				}

			})

		}, function(configuration, callback){

			module.exports.updateInboundPhoneNumber(req, configuration, function(err){	
				
				if (err){ 
					callback(err)
				} else {
					callback(null, configuration)
				}

			})

		}, function(configuration, callback){

			util.setConfiguration(configuration, function(err){
				if (err){ 
					callback(err)
				} else {
					callback()
				}
			})

		}], function (err){
			
			if(err){
				res.status(500).json({stack: err.stack, message: err.message })
				return
			}

			res.status(200).end()

		})

}

module.exports.syncQueues = function (configuration, callback) {

	var queues = configuration.queues

	/* create queues */
	async.eachSeries(queues, function (queue, next) {

		var queueForSync = { 
			sid: queue.taskQueueSid,
			friendlyName: queue.friendlyName,
			reservationActivitySid: configuration.twilio.workerReservationActivitySid,
			assignmentActivitySid: configuration.twilio.workerAssignmentActivitySid,
			targetWorkers: 'channels HAS "' + queue.id + '"'
		}

		module.exports.createOrUpdateQueue(queueForSync, function(err, queueFromApi){	

			if (err){ 
				callback(err)
			} else {
				queue.taskQueueSid = queueFromApi.sid
				next()
			}

		})
	}, function(){

		callback(null, configuration)

	})
}

module.exports.createOrUpdateQueue = function (queue, callback) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)

	if(queue.sid){

		client.workspace.taskQueues(queue.sid).update(queue, function(err, queueFromApi){

			if (err){ 
				callback(err)
			} else {
				callback(null, queue)		
			}

		})

	} else  {

		client.workspace.taskQueues.create(queue, function(err, queueFromApi){

			if (err){ 
				callback(err)
			} else {
				queue.sid = queueFromApi.sid
				callback(null, queue)		
			}

		})
	}
}

module.exports.createOrUpdateWorkflow = function (workflow, callback) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)

	if(workflow.sid){

		client.workspace.workflows(workflow.sid).update(workflow, function(err, workflowFromApi){

			if (err){ 
				callback(err)
			}else{
				callback(null, workflow)		
			}

		})

	} else  {

		client.workspace.workflows.create(workflow, function(err, workflowFromApi){

			if (err){ 
				callback(err)
			}else{
				workflow.sid = workflowFromApi.sid
				callback(null, workflow)		
			}

		})
	}
}

module.exports.createOrUpdateApplication = function (req, callback) {

	var client = new require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

	var url =  req.protocol + '://' + req.hostname + '/api/agents/call'

	if(req.configuration.twilio.applicationSid){

		client.applications(req.configuration.twilio.applicationSid).update({
			friendlyName: 'Twilio Contact Center Demo',
			voiceUrl: url,
			voiceMethod: 'GET'
		}, function(err, application) {
			if (err){ 
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
		}, function(err, application) {
			if (err){ 
				callback(err)
			} else {
				callback(null, application)		
			}
		})

	}
}

module.exports.updateInboundPhoneNumber = function (req, configuration, callback) {

	var client = new require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

	client.incomingPhoneNumbers.list({ PhoneNumber: configuration.twilio.callerId}, function(err, data) {

		/* we did not find the phone number provided */
		if(data.incomingPhoneNumbers.length == 0){
			return callback(new Error(configuration.twilio.callerId + ' not found'))
		}

		/* the query returned more than one number, something went wrong */
		if(data.incomingPhoneNumbers.length != 1){
			return callback(new Error('query for ' + configuration.twilio.callerId + ' returned more than one phone number'))
		} 

		var sid = data.incomingPhoneNumbers[0].sid

		console.log('configure phone number ' + sid + ' (' +  data.incomingPhoneNumbers[0].PhoneNumber + ')')

		var url =  req.protocol + '://' + req.hostname + '/api/ivr/welcome'

		client.incomingPhoneNumbers(sid).update({
			voiceUrl: url,
			voiceMethod: 'GET'
		}, function(err, number) {
			
			if (err){ 
				callback(err)
			} else {
				callback(null)		
			}

		})

	})

}

module.exports.getWorkspace = function(req, res) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)

	client.workspaces.list(function(err, data) {
		if(err) {
			res.status(500).json({stack: err.stack, message: err.message })
		} else {

			for (i = 0; i < data.workspaces.length; i++) {

				if(data.workspaces[i].sid == process.env.TWILIO_WORKSPACE_SID){
					var workspace = data.workspaces[i]
				}

			}
			res.status(200).json(workspace)
		}
	})

}

module.exports.getActivities = function(req, res) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)
	
	client.workspace.activities.list(function(err, data) {
		if(err) {
			res.status(500).json({stack: err.stack, message: err.message })
		} else {
			res.status(200).json(data.activities)
		}
	})

}
