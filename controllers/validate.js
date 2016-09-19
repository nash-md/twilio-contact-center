'use strict'

const twilio 	= require('twilio')

/* client for Twilio Programmable Voice / SMS */
const client = new twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

/* client for Twilio TaskRouter */
const taskrouterClient = new twilio.TaskRouterClient(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
	process.env.TWILIO_WORKSPACE_SID)

module.exports.validateSetup = function (req, res) {
	if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.length !== 34) {
		res.status(500).json({ code: 'TWILIO_ACCOUNT_SID_INVALID'})
		return
	}

	if (!process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN.length !== 32) {
		res.status(500).json({ code: 'TWILIO_AUTH_TOKEN_INVALID'})
		return
	}

	if (!process.env.TWILIO_WORKSPACE_SID || process.env.TWILIO_WORKSPACE_SID.length !== 34) {
		res.status(500).json({ code: 'TWILIO_WORKSPACE_SID_INVALID'})
		return
	}

	validateAccount()
		.then(function (result) {
			return validateWorkspace()
		})
		.then(function (result) {
			return validateApplication(req.configuration.twilio.applicationSid)
		})
		.then(function () {
			return res.status(200).end()
		}).catch(function (err) {
			console.log(err)
			return res.status(500).json({ code: err})
		})

}

var validateApplication = function (applicationSid) {

	return new Promise(function (resolve, reject) {

		if (!applicationSid) {
			return reject('TWILIO_APPLICATION_SID_INVALID')
		}

		client.applications(applicationSid).get(function (err, application) {
			if (err) {
				reject('TWILIO_APPLICATION_NOT_ACCESSIBLE')
			} else {
				resolve(true)
			}
		})

	})

}

var validateAccount = function () {

	return new Promise(function (resolve, reject) {

		client.accounts(process.env.TWILIO_ACCOUNT_SID).get(function (err, account) {
			if (err) {
				reject('TWILIO_ACCOUNT_NOT_ACCESSIBLE')
			} else {
				resolve(true)
			}
		})

	})

}

var validateWorkspace = function () {

	return new Promise(function (resolve, reject) {

		taskrouterClient.workspace.get(function (err, workspace) {
			if (err) {
				reject('TWILIO_WORKSPACE_NOT_ACCESSIBLE')
			} else {
				resolve()
			}
		})

	})

}

module.exports.validatePhoneNumber = function (req, res) {
	var filter = {
		PhoneNumber: req.body.callerId
	}

	client.incomingPhoneNumbers.list(filter, function (err, data) {
		if (err) {
			return res.status(500).json({ code: 'TWILIO_UNKNOWN_ERROR', message: req.util.convertToString(err)})
		}

		/* phone number not found */
		if (data.incomingPhoneNumbers.length === 0) {
			return res.status(404).json({ code: 'TWILIO_UNKNOWN_PHONE_NUMBER'})
		}

		/* the query returned more than one number, something went wrong */
		if (data.incomingPhoneNumbers.length !== 1) {
			return res.status(500).json({ code: 'TWILIO_MULTIPLE_PHONE_NUMBERS'})
		}

		/* the number does not support voice */
		if (data.incomingPhoneNumbers[0].capabilities.voice === false) {
			return res.status(500).json({ code: 'TWILIO_PHONE_NUMBER_NOT_VOICE_CAPABLE'})
		}

		var sid = data.incomingPhoneNumbers[0].sid
		var capabilities = data.incomingPhoneNumbers[0].capabilities

		res.status(200).json({sid: sid, capabilities: capabilities})

	})

}