const Twilio 	= require('twilio')

const client = new Twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.getWorkspace = function (req, res) {

	client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID).fetch()
		.then(workspace => {
			let payload = {
				sid: workspace.sid,
				friendlyName: workspace.friendlyName
			}

			res.status(200).json(payload)
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}

module.exports.getActivities = function (req, res) {

	client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID).activities.list()
		.then(activities => {
			let payload =[]

			for (let i = 0; i < activities.length; i++) {
				const activity = {
					sid: activities[i].sid,
					friendlyName: activities[i].friendlyName,
				}

				payload.push(activity)
			}

			res.status(200).json(payload)
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})

}