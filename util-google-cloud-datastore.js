const { Datastore } = require('@google-cloud/datastore')
const { readConfigurationFromFile } = require('./util-file')

const datastore = new Datastore()

const key = datastore.key(['configuration', 1])

const getConfiguration = async callback => {
	try {
		const [entity] = await datastore.get(key)

		if (typeof entity !== 'undefined') {
			callback(null, entity)
		} else {
			callback(new Error('configuration invalid, entity not found'))
		}
	} catch (error) {
		return callback(error)
	}
}

const createConfigurationIfNotExists = () => {
	hasConfiguration(error => {
		if (error) {
			readConfigurationFromFile().then(configurationAsString => {
				const entity = {
					key: key,
					data: JSON.parse(configurationAsString)
				}

				datastore.save(entity).then(result => {
					console.log('entity successfully created, configuration saved')
				}).catch(error => { console.log(error) })
			})
		}
	})
}

const setConfiguration = async (configuration, callback) => {
	const entity = {
		key: key,
		data: configuration
	}

	try {
		await datastore.upsert(entity)
		callback(null)
	} catch (error) {
		callback(error)
	}
}

const hasConfiguration = callback => {
	getConfiguration(callback)
}

module.exports = {
	createConfigurationIfNotExists,
	getConfiguration,
	setConfiguration
}
