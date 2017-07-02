const Twilio 	= require('twilio')

const client = new Twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

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
		.then(result => {
			return validateWorkspace()
		})
		.then(function (result) {
			return validateApplication(req.configuration.twilio.applicationSid)
		})
		.then(function (result) {
			return validatePhoneNumber(req, req.configuration.twilio.callerId)
		})
		.then(function () {
			return res.status(200).end()
		}).catch(error => {
			return res.status(500).json({ code: error})
		})

}

var validateApplication = function (applicationSid) {

	return new Promise((resolve, reject) => {

		if (!applicationSid) {
			return reject('TWILIO_APPLICATION_SID_INVALID')
		}

		client.applications(applicationSid).fetch().then(application => {
			resolve(true)
		}).catch(error => {
			console.error(error)
			reject('TWILIO_APPLICATION_NOT_ACCESSIBLE')
		})

	})

}

var validateAccount = function () {

	return new Promise((resolve, reject) => {

		client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
			.then(account => {
				resolve(true)
			}).catch(error => {
				console.error(error)
				reject('TWILIO_ACCOUNT_NOT_ACCESSIBLE')
			})

	})

}

var validateWorkspace = function () {

	return new Promise((resolve, reject) => {
		client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID).fetch()
			.then(account => {
				resolve(true)
			}).catch(error => {
				console.error(error)
				reject('TWILIO_WORKSPACE_NOT_ACCESSIBLE')
			})

	})

}

var validatePhoneNumber = function (req, phoneNumber) {

	return new Promise((resolve, reject) => {
		if (!phoneNumber) {
			reject('TWILIO_PHONE_NUMBER_UNKNOWN')
			return
		}

		const filter = {
			phoneNumber: phoneNumber
		}

		client.incomingPhoneNumbers.list(filter)
			.then(phoneNumbers => {
				if (phoneNumbers.length === 0) {
					reject('TWILIO_PHONE_NUMBER_UNKNOWN')
					return
				}

				/* validate if the voiceUrl is configured and points to this server */
				const voiceUrl = (process.env.PROTOCOL || req.protocol) + '://'
					+ (process.env.DOCKER_HOST_DOMAIN || req.hostname) + '/api/ivr/welcome'

				if (phoneNumbers[0].voiceUrl !== voiceUrl) {
					reject('TWILIO_PHONE_NUMBER_VOICE_URL_INVALID')
					return
				}

				resolve(true)
			}).catch(error => {
				console.error(error)
				reject('TWILIO_UNKNOWN_ERROR')
			})

	})

}