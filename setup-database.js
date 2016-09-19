const async 	= require('async')
const pg    	= require('pg')
const fs 			= require('fs')
const path 		= require('path')

async.waterfall([

	function (callback) {

		pg.connect(process.env.DATABASE_URL, function (err, client, done) {
			if (err) {
				callback(err)
			} else {
				callback(null, client)
			}
		})

	}, function (client, callback) {

		client.query('CREATE TABLE IF NOT EXISTS configuration (id serial, data text)',
			function (err, result) {
				if (err) {
					callback(err)
				} else {
					callback(null, client)
				}
			}
		)

	}, function (client, callback) {

		client.query('TRUNCATE configuration', function (err, result) {
			if (err) {
				callback(err)
			} else {
				callback(null, client)
			}
		})

	}, function (client, callback) {

		/* load configuration template */
		fs.readFile(path.join(process.cwd(), './configuration.json'), 'utf8', function (err, data) {
			if (err) {
				callback(err)
			}
			callback(null, client, data)
		})

	}, function (client, configuration, callback) {

		client.query('INSERT INTO configuration(data) values($1)', [configuration],
			function (err, result) {
				if (err) {
					callback(err)
				} else {
					callback(null, 'table successfully created, configuration saved')
				}
			}
		)

	}
],function (err, message) {
	if (err) {
		console.log(err)
		process.exit(1)
	} else {
		console.log(message)
	}
	process.exit(0)
})
