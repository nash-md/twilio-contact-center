'use strict'

const twilio = require('twilio')

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

module.exports.delete = function (req, res) {

	taskrouterClient.workspace.workers(req.params.id).delete(null)
		.then(function (result) {
			res.status(200).end()
		}).catch(function (err) {
			res.status(500).json(err)
		})

}

module.exports.create = function (req, res) {

	var worker = {
		friendlyName: req.body.friendlyName,
		attributes: req.body.attributes
	}

	taskrouterClient.workspace.workers.create(worker)
		.then(function (worker) {
			res.status(200).json(worker)
		}).catch(function (err) {
			res.status(500).json(err)
		})

}

module.exports.list = function (req, res) {

	taskrouterClient.workspace.workers.list()
		.then(function (data) {
			res.status(200).json(data.workers)
		}).catch(function (err) {
			res.status(500).json(err)
		})

}
