var twilio = require('twilio')

module.exports.pushEvent = function(req, res) {

	console.log('Event: ' + req.body.EventType)
	console.log('Task: ' + req.body.TaskSid)
	console.log('Queue: ' + req.body.TaskQueueSid)
	console.log('Description: ' + req.body.EventDescription)

	res.status(200).end()

}
