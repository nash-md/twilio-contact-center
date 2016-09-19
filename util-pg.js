var pg = require('pg')
var uc = require('./util-common.js')

module.exports.convertToString = function (err) {
	return uc.convertToString(err)
}

module.exports.generateSessionExirationDate = function (seconds) {
	return uc.generateSessionExirationDate(seconds)
}

module.exports.getConfiguration = function (callback) {

	pg.connect(process.env.DATABASE_URL, function (err, client, done) {

		client.query('SELECT * FROM configuration', function (err, result) {
			done()

			if (err) {
				return callback(err)
			} else {
				if (result.rows.length) {
					callback(null, JSON.parse(result.rows[0].data))
				} else {
					callback(new Error('configuration database is empty'))
				}
			}

		})

	})

}

exports.setConfiguration = function (configuration, callback) {
	var configurationAsString =  JSON.stringify(configuration, null, 4)

	pg.connect(process.env.DATABASE_URL, function (err, client, done) {

		client.query('TRUNCATE configuration', function (err, result) {

			if (err) {
				return callback (err)
			} else {

				client.query('INSERT INTO configuration(data) values($1)', [configurationAsString],
					function (err, result) {
						done()

						if (err) {
							callback(err)
						} else {
							callback(null)
						}

					}
				)

			}

		})

	})

}
