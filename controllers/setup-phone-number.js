const twilio 	= require('twilio')

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.update = function (req, res) {
	console.log('configure number: ' + req.body.sid)
	const voiceUrl 	=  req.protocol + '://' + req.hostname + '/api/ivr/welcome'
	const smsUrl 		=  req.protocol + '://' + req.hostname + '/api/messaging-adapter/inbound'

	client.incomingPhoneNumbers(req.body.sid).update({
		voiceUrl: voiceUrl,
		voiceMethod: 'GET',
		smsUrl: smsUrl,
		smsMethod: 'POST'
	}).then(phoneNumber => {
		res.status(200).end()
	}).catch(error => {
		console.log('Setup Failure: Error setting up URLs for voice and SMS channels.')
		res.status(500).send(res.convertErrorToJSON(error))
	})

}

module.exports.validate = function (req, res) {
	const filter = {
		phoneNumber: req.body.callerId
	}

	client.incomingPhoneNumbers.list(filter).then(phoneNumbers => {
		/* phone number not found */
		if (phoneNumbers.length === 0) {
			return res.status(404).json({ code: 'TWILIO_PHONE_NUMBER_NOT_FOUND'})
		}

		/* the query returned more than one number, something went wrong */
		if (phoneNumbers.length !== 1) {
			return res.status(500).json({ code: 'TWILIO_MULTIPLE_PHONE_NUMBERS'})
		}

		/* the number does not support voice */
		if (phoneNumbers[0].capabilities.voice === false) {
			return res.status(500).json({ code: 'TWILIO_PHONE_NUMBER_NOT_VOICE_CAPABLE'})
		}

		let sid = phoneNumbers[0].sid
		let capabilities = phoneNumbers[0].capabilities

		res.status(200).json({sid: sid, capabilities: capabilities})
	}).catch(error => {
		res.status(500).json({
			code: 'TWILIO_UNKNOWN_ERROR', message: req.util.convertToString(error)
		})
	})

}