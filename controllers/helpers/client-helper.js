const twilio 	= require('twilio')

const AccessToken = twilio.jwt.AccessToken

module.exports.createAccessToken = function (identity, applicationSid, lifetime) {

	const token = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: lifetime }
	)

	token.identity = identity.toLowerCase()

	/* grant the token Twilio Client capabilities */
	const grant = new AccessToken.VoiceGrant({
		incomingAllow: true,
		outgoingApplicationSid: applicationSid
	})

	token.addGrant(grant)

	return token
}

