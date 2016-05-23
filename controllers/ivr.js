var twilio = require('twilio')

module.exports.welcome = function(req, res) {

	var twiml = new twilio.TwimlResponse()

	twiml.gather({ action: 'select-team', 
		method: 'GET', 
		numDigits: 1, 
		timeout: 10
	}, function(node){
		node.say(req.configuration.ivr.text)
	})

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

}

module.exports.selectTeam = function(req, res) {

	var team = null;

	for(var i = 0; i < req.configuration.ivr.options.length; i++){

		if(req.query.Digits == req.configuration.ivr.options[i].digit){
			team = req.configuration.ivr.options[i]
		}

	}

	var twiml = new twilio.TwimlResponse()

	/* the caller pressed a key that does not match any team */
	if(team == null){
		// redirect the call to the previous twiml	
		twiml.say('Your selection was not valid, please try again')
		twiml.pause({length: 5})
		twiml.redirect({ method: 'GET' }, 'select-team')
	} else {
		twiml.gather({ 
				action: 'create-task?teamId=' + team.id + '&teamFriendlyName=' + team.friendlyName, 
				method: 'GET', 
				numDigits: 1, 
				timeout: 5 
			}, function(node){
			node.say('Press any key if you want a callback, if you want to talk to an agent please wait in the line')
		})

		/* create task attributes */
		var attributes = {  text: 'Caller answered IVR with option "' + team.friendlyName + '"',   
							channel: 'phone', 
							phone: req.query.From, 
							name: req.query.From, 
							channel: 'phone',
							type: 'Inbound call',
							team: team.id }

		twiml.enqueue({ workflowSid: req.configuration.twilio.workflowSid }, function(node){
			node.task(JSON.stringify(attributes), { 
				priority: 1, 
				timeout: 1200 
			})
		})
	}

	res.setHeader('Content-Type', 'application/xml')
	res.setHeader('Cache-Control', 'public, max-age=0')
	res.send(twiml.toString())

}

module.exports.createTask = function(req, res) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)

	/* create task attributes */
	var attributes = {  text: 'Caller answered IVR with option "' + req.query.teamFriendlyName + '"',   
						channel: 'phone', 
						phone: req.query.From, 
						name: req.query.From, 
						channel: 'phone',
						type: 'Callback request',
						team: req.query.teamId }

	client.workspace.tasks.create({
		WorkflowSid: req.configuration.twilio.workflowSid,
		attributes: JSON.stringify(attributes)
	}, function(err, task) {
		
		var twiml = new twilio.TwimlResponse()

		if(err) {
			console.log(err)
			twiml.say('An application error occured, the demo ends now')
		}  else {
			twiml.say('Thanks for your callback request, an agent will call you back a soon as possible')
			twiml.hangup();
		}

		res.setHeader('Content-Type', 'application/xml')
		res.setHeader('Cache-Control', 'public, max-age=0')
		res.send(twiml.toString())
	
	})

}

module.exports.assignment = function(req, res) {

	res.setHeader('Content-Type', 'application/json')
	res.setHeader('Cache-Control', 'public, max-age=0')
    res.send(JSON.stringify({ }, null, 3))

}