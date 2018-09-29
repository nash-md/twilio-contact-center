const twilio = require('twilio')

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN
)

module.exports.create = function (req, res) {
	console.log(`transfer call to ${req.body.to} customer's call leg ${req.params.sid}`)

	const url = `${req.protocol}://${req.hostname}/api/phone/transfer/${req.params.sid}/forward/${req.body.to}/initiated-by/${req.session.worker.sid}`

	client
		.calls(req.params.sid)
		.update({ method: 'POST', url: url })
		.then((call) => {
			res.status(200).end()
		}).catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})
}

module.exports.forward = function (req, res) {

	client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.workers(req.params.from)
		.fetch()
		.then((worker) => {

			let phone = req.body.From

			/* the agent should see the customer's phone number, check if the call was outbound */
			if (req.body.From === req.configuration.twilio.callerId) {
				phone = req.body.To
			}

			/* create task attributes */
			const attributes = {
				title: 'Call Transfer',
				text: 'Initiated by ' + worker.friendlyName,
				phone: phone,
				name: phone,
				channel: 'phone',
				type: 'inbound_call',
				transferToWorkerSid: req.params.to
			}

			/* call transfer is enqueued with a higher priority */
			const twiml = new twilio.twiml.VoiceResponse()

			twiml
				.enqueue({ workflowSid: req.configuration.twilio.workflowSid })
				.task({ priority: 10, timeout: 3600 }, JSON.stringify(attributes))

			res.set({
				'Content-Type': 'application/xml',
				'Cache-Control': 'public, max-age=0',
			})

			res.send(twiml.toString())

		})

}

module.exports.getAvailableWorkers = function (req, res) {
	client.taskrouter
		.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.workers.list()
		.then(workers => {
			const payload = []

			workers.forEach(worker => {
				const attributes = JSON.parse(worker.attributes)

				if (req.session.worker.sid !== worker.sid && worker.available && attributes.channels.includes('phone')) {
					payload.push({
						sid: worker.sid,
						friendlyName: worker.friendlyName
					})
				}
			})

			res.status(200).json(payload)
		})
		.catch(error => {
			res.status(500).send(res.convertErrorToJSON(error))
		})
}
