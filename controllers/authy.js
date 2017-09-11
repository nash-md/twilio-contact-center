const Client = require('authy-client').Client
const client = new Client({key: process.env.TWILIO_AUTHY_KEY})

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)
const fs = require('fs')

module.exports.getAuthyUsers = function (req, res) {

	fs.readFile('authyusers.json', 'utf8', function (err, data) {
		if (err) {
			console.log('Error reading authyusers.json file: ', err)
			res.status(500).send()
		}

		try {
			var configuration = JSON.parse(data)
			res.status(200).json(configuration)
		} catch (exception) {
			console.error('Error parsing authyusers.json file: ', exception)
			console.error('Lets just create a new empty json object... ')
			writeBlankJSONFile(function (status) {
				if (status) {
					res.status(200).json({})
				} else {
					res.status(500).send()
				}
			})
		}
	})
}

function writeBlankJSONFile (cb) {
	fs.writeFile('authyusers.json', '{}', function (err) {
		if (err) {
			console.error('Error writing authyusers.json file: ', err)
			cb(false)
		} else {
			cb(true)
		}
	});
}


module.exports.setAuthyUsers = function (req, res) {
	const configurationAsString = JSON.stringify(req.body.authy_users, null, 4)

	fs.writeFile('authyusers.json', configurationAsString, function (err) {
		if (err) {
			console.error('Error writing authyusers.json file: ', err)
			res.status(500).send()
		} else {
			res.status(200).send()
		}
	})
}


module.exports.registerUser = function (req, res) {
	client.registerUser({countryCode: req.body.cc, email: req.body.email, phone: req.body.pn})
		.then(function (response) {
			// Lets call this every time even if a user is already registered.
			console.log('Authy Id from Registration', response.user.id)
			res.status(200).json({'authyId': response.user.id})
		})
		.catch(function (error) {
			console.log('Error registering user ', error);
			res.status(500).send()
			throw error
		})
}

module.exports.verifyRequest = function (req, res) {

	client.startPhoneVerification({
		countryCode: req.body.cc,
		locale: 'en',
		phone: req.body.pn,
		via: 'sms'
	})
		.then(function (response) {
			console.log('Request Phone Verification: ', response)
			res.status(200).send()
		})
		.catch(function (error) {
			console.log('Error Requesting Phone Verification: ', error)
			res.status(500).send()
			throw error
		})
}

module.exports.otpVerify = function (req, res) {
	client.verifyPhone({countryCode: req.body.cc, phone: req.body.pn, token: req.body.otp})
		.then(function (response) {
			console.log('Verification code is correct: ', response)
			res.status(200).send()
		})
		.catch(function (error) {
			res.status(500).send()
			throw error
		})
}


module.exports.startOneTouch = function (req, res) {
	client.createApprovalRequest({
		authyId: req.body.authyId,
		details: {
			visible: {
				'Account Number': req.body.authyId,
			}
		},
		logos: [{
			res: 'default',
			url: 'https://example.com/logos/default.png'
		}, {
			res: 'low',
			url: 'https://example.com/logos/low.png'
		}],
		message: req.body.message,
	}, {
		ttl: 120
	}).then(function (response) {
		console.log('OneTouch approval request UUID', response.approval_request.uuid)
		res.status(200).json({'uuid': response.approval_request.uuid})
	}).catch(function (error) {
		console.log('OneTouch Start Error: ', error)
		res.status(500).send();
		throw error
	})
}

module.exports.statusOneTouch = function (req, res) {

	client.getApprovalRequest({id: req.body.uuid})
		.then(function (response) {
			console.log('OneTouch status request: ', response.approval_request)
			res.status(200).json({'response': response.approval_request})
		})
		.catch(function (error) {
			console.log('OneTouch status error: ', error)
			res.status(500).send()
			throw error
		})
}

module.exports.verifySoftToken = function (req, res) {

	client.verifyToken({authyId: req.body.authyId, token: req.body.token})
		.then(function (response) {
			console.log('SoftToken verify response: ', response)
			res.status(200).json({'response': response})
		})
		.catch(function (error) {
			console.log('OneTouch status error: ', error)
			res.status(500).send()
			throw error
		})
}


module.exports.executeLookup = function (req, resp) {

	twilio.lookups.v1
		.phoneNumbers(req.body.pn)
		.fetch()
		.then(function (number) {
			console.log('Success with Lookup: ', number)
			resp.status(200).json({'national_format': number.nationalFormat, 'cc': number.countryCode})
		})
		.catch(function (error) {
			console.log('Error with Lookup: ', error)
			resp.status(500).send()
			throw error
		})
}

