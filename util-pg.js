const { Client } = require('pg')
const { convertToString, generateSessionExirationDate } = require('./util-common.js')

const getConfiguration = (callback) => {
	const client = createClient()

	client.connect().then(() => {
		return readConfiguration(client)
	}).then((result) => {
		if (result.rows.length === 1) {
			callback(null, JSON.parse(result.rows[0].data))
		} else {
			callback(new Error(`configuration invalid, ${result.rows.length} rows found`))
		}
	}).catch((error) => {
		return callback(error)
	})

}

const setConfiguration = (configuration, callback) => {
	const configurationAsString =  JSON.stringify(configuration, null, 4)

	const client = createClient()

	client.connect().then(() => {
		return truncateTable(client)
	}).then((result) => {
		return writeConfiguration(client, configurationAsString)
	}).then((result) => {
		return callback(null)
	}).catch((error) => {
		console.log(error)
		return callback(error)
	})
}

const createClient = () => {
	return new Client({
		connectionString: process.env.DATABASE_URL,
	})
}

const createTableIfNotExists = (client) => {
	return client.query('CREATE TABLE IF NOT EXISTS configuration (id serial, data text)')
}

const truncateTable = (client) => {
	return client.query('TRUNCATE configuration')
}

const writeConfiguration = (client, configuration) => {
	const query = {
		text: 'INSERT INTO configuration(data) values($1)',
		values: [configuration],
	}

	return client.query(query)
}

const readConfiguration = (client) => {
	return client.query('SELECT * FROM configuration')
}

module.exports = {
	convertToString,
	generateSessionExirationDate,
	createClient,
	createTableIfNotExists,
	truncateTable,
	writeConfiguration,
	readConfiguration,
	getConfiguration,
	setConfiguration
}