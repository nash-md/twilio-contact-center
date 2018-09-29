const twilio 	= require('twilio')

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.delete = function (req, res) {
	let id = req.params.id

	client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workers(id).remove()
		.then(worker => {
			res.status(200).end()
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}

module.exports.create = function (req, res) {
	const worker = {
		friendlyName: req.body.friendlyName,
		attributes: req.body.attributes
	}

	client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workers.create(worker)
		.then(worker => {
			const payload = {
				sid: worker.sid,
				friendlyName: worker.friendlyName,
				attributes: worker.attributes,
				activityName: worker.activityName
			}

			res.status(200).json(payload)
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}

module.exports.list = function (req, res) {

	client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workers.list()
		.then(workers => {
			let payload =[]

			for (let i = 0; i < workers.length; i++) {
				const worker = {
					sid: workers[i].sid,
					friendlyName: workers[i].friendlyName,
					attributes: JSON.parse(workers[i].attributes),
					activityName: workers[i].activityName
				}

				payload.push(worker)
			}

			res.status(200).json(payload)
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}
