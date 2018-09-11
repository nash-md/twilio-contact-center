const { readConfigurationFromFile } = require('./util-file')
const { createClient, createTableIfNotExists, truncateTable, writeConfiguration } = require('./util-pg')

const client = createClient()

client.connect().then(() => {
	return createTableIfNotExists(client)
}).then((result) => {
	return truncateTable(client)
}).then((result) => {
	return readConfigurationFromFile()
}).then((configurationAsString) => {
	return writeConfiguration(client, configurationAsString)
}).then((result) => {
	console.log('table successfully created, configuration saved')
	process.exit(0)
}).catch((error) => {
	console.log(error)
	process.exit(1)
}).then(() => client.end())
