var twilio  = require('twilio')
var async   = require('async')

module.exports.createCallback = function(req, res) {

	var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)

	client.workspace.tasks.create({
		WorkflowSid: req.configuration.twilio.workflowSid,
		attributes: JSON.stringify(req.body)
	}, function(err, task) {
		if(err) {
			res.status(500).json(err)
		} else {
			res.status(200).end()
		}
	})
}

module.exports.createChat = function(req, res) {

  /* create a chat room */
  async.waterfall([

    function(callback){

      /* create token */
      var grant = new twilio.AccessToken.IpMessagingGrant({
          serviceSid: process.env.TWILIO_IPM_SERVICE_SID,
          endpointId: req.body.endpoint
      })

      var accessToken = new twilio.AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY,
        process.env.TWILIO_API_SECRET,
        { ttl: 3600 }
      )

      accessToken.addGrant(grant)
      accessToken.identity = req.body.identity

      var payload = {
          identity: req.body.identity,
          token: accessToken.toJwt(),
      }

      callback(null, payload)

    },
    function(payload, callback){

      var client = new twilio.IpMessagingClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

      var service = client.services(process.env.TWILIO_IPM_SERVICE_SID)

          service.channels.create({
              friendlyName: 'Support Chat with ' + req.body.identity,
              uniqueName: 'support_channel_' + Math.random().toString(36).substring(7)
          }, function(err, channel) {
          if(err) {
              callback(err)
          } else {
              payload.channelSid = channel.sid
              payload.channel_unique_name = channel.uniqueName
              callback(null, payload)
          }
       })

    }, 
    function(payload, callback){

      var client = new twilio.TaskRouterClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_WORKSPACE_SID)

      client.workspace.tasks.create({
          workflowSid: req.configuration.twilio.workflowSid,
          attributes: JSON.stringify({  type: 'Chat request', text: 'Customer entered chat via support page', channel: 'chat', team: 'support', name: payload.identity, channelSid: payload.channelSid, channel_unique_name: payload.channel_unique_name})
      }, function(err, task) {
          if(err) {
            callback(err)
          } else {
            payload.task = task.sid
            callback(null, payload)
          }
      })

    }
  ], 
  function (err, payload){

    if(err){
      console.log(err)
      res.status(500).json(err)
      return
    }

    res.status(200).send(payload)

  })

}