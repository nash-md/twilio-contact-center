const twilio 	= require('twilio')

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
});

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

			const payload = workers.map(worker => {
				return { 
					sid: worker.sid,
					friendlyName: worker.friendlyName,
					attributes: JSON.parse(worker.attributes),
					activityName: worker.activityName
				}
			})

			res.status(200).json(payload)
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}
