var async 	= require("async")
var pg    	= require("pg")

async.waterfall([

	function(callback){

		pg.connect(process.env.DATABASE_URL, function(error, client, done) {

			if(error){
				console.log(error)
				process.exit(1);
			} else {
				callback(null, client)
			}

		})

	},	
	function(client, callback){

		client.query('CREATE TABLE IF NOT EXISTS configuration (id serial, data text)', function(error, result) {

			if(error){
				console.log(error)
				process.exit(1);
			} else {
				callback(null, client)
			}

		})

	}, 
	function(client, callback){

		client.query("TRUNCATE configuration", function(error, result) {

			if(error){
				console.log(error)
				process.exit(1);
			} else {
				callback(null, client)
			}

		})

	},
	function(client, callback){

		var configuraton =  {
			ivr: { text: 'Welcome to my call center, please press 1 for sales, press 2 for support', options : [{ friendlyName: 'Sales', digit: 1, id: 'sales'}, { friendlyName: 'Support', digit: 2, id: 'support'}]},
			queues: [{ friendlyName: 'Email Queue', id: 'email', taskQueueSid: null, expression: 'channel == "email"'},
					 { friendlyName: 'Chat Queue', id: 'chat', taskQueueSid: null, expression: 'channel == "chat"'},
					 { friendlyName: 'Phone Queue', id: 'phone', taskQueueSid: null, expression: 'channel == "phone"'},
					 { friendlyName: 'Video Queue', id: 'phone', taskQueueSid: null, expression: 'channel == "video"'}],
			twilio: { 
				workerOfflineActivitySid: null,
				workerIdleActivitySid: null,
				workerReservationActivitySid: null,
				workerAssignmentActivitySid: null
			}
		}

		client.query("INSERT INTO configuration(data) values($1)", [JSON.stringify(configuraton)], function(error, result) {

			if(error){
				console.log(error)
				process.exit(1);
			} else {
				callback(null, 'tables successfully created')
			}

		})
	}
],function(error, message) {
  console.log(message)
  process.exit(0);
})

