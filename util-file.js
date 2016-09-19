var fs = require('fs')
var uc = require('./util-common.js')

module.exports.convertToString = function (err) {
	return uc.convertToString(err)
}

module.exports.generateSessionExirationDate = function (seconds) {
	return uc.generateSessionExirationDate(seconds)
}

module.exports.getConfiguration = function (callback) {

	fs.readFile('configuration.json', 'utf8', function (err, data) {
		if (err) {
			return callback(err)
		}

		try {
			var configuration = JSON.parse(data)
		} catch (exception) {
			return callback(exception)
		}

		callback(null, configuration)
	})

}

exports.setConfiguration = function (configuration, callback) {
	var configurationAsString =  JSON.stringify(configuration, null, 4)

	fs.writeFile('configuration.json', configurationAsString, function (err) {
		if (err) {
			callback(err)
		} else {
			callback(null)
		}
	})

}
