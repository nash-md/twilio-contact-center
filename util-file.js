const util = require('util')
const fs = require('fs')
const path = require('path')
const { convertToString, generateSessionExirationDate } = require('./util-common.js')

const readConfigurationFromFile = () => {
	const readFile = util.promisify(fs.readFile)

	return readFile(path.join(process.cwd(), './configuration.json'))
}

const writeConfigurationToFile = (configuration) => {
	const configurationAsString =  JSON.stringify(configuration, null, 4)
	const writeFile = util.promisify(fs.writeFile)

	return writeFile(path.join(process.cwd(), './configuration.json'), configurationAsString)
}

const getConfiguration = (callback) => {
	readConfigurationFromFile().then((data) => {
		callback(null, JSON.parse(data.toString()))
	}).catch((error) => {
		console.log(error)
		return callback(error)
	})
}

const setConfiguration = (configuration, callback) => {
	writeConfigurationToFile(configuration).then(() => {
		callback(null)
	}).catch((error) => {
		return callback(error)
	})
}

module.exports = {
	convertToString,
	generateSessionExirationDate,
	readConfigurationFromFile,
	writeConfigurationToFile,
	getConfiguration,
	setConfiguration
}