const Twilio = require('twilio')
const async = require('async')

const client = new Twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.update = function (req, res) {
	console.log('configure number: ' + req.body.numberSids.callSid)
	console.log('configure number: ' + req.body.numberSids.smsSid)

	const voiceUrl = (process.env.PROTOCOL || req.protocol) + '://'
		+ (process.env.DOCKER_HOST_DOMAIN || req.hostname) + '/api/ivr/welcome'
	const smsUrl = (process.env.PROTOCOL || req.protocol) + '://'
		+ (process.env.DOCKER_HOST_DOMAIN || req.hostname) + '/api/messaging-adapter/inbound'

	client.incomingPhoneNumbers(req.body.numberSids.callSid).update({
		voiceUrl: voiceUrl,
		voiceMethod: 'GET'
	}).then(phoneNumber => {
		res.status(200).end()
	}).catch(error => {
		res.status(500).send(res.convertErrorToJSON(error))
	})

	client.incomingPhoneNumbers(req.body.numberSids.smsSid).update({
		smsUrl: smsUrl,
		smsMethod: 'POST'
	}).then(phoneNumber => {
		res.status(200).end()
	}).catch(error => {
		res.status(500).send(res.convertErrorToJSON(error))
	})

}

module.exports.validate = function (req, res) {

	const numberSids = { callSid: null, smsSid: null }
	const ids = [ req.body.callerId, req.body.smsId ]

	async.eachOf(ids, function (id, idx, callback) {

		const filter = {
			phoneNumber: id
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

			if (idx === 0) {
				numberSids.callSid = sid
			} else {
				numberSids.smsSid = sid
			}

			callback()

		}).catch(error => {
			res.status(500).json({
				code: 'TWILIO_UNKNOWN_ERROR', message: req.util.convertToString(error)
			})
		})

	}, function () {
		res.status(200).json({numberSids: numberSids})
	})

}