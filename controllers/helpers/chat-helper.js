const twilio 	= require('twilio')

const AccessToken 	= twilio.jwt.AccessToken
const ChatGrant 		= twilio.jwt.AccessToken.ChatGrant

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
});

module.exports.createChannel = async (friendlyName, uniqueName) => {
	return client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.create({
		friendlyName: friendlyName,
		uniqueName: uniqueName
	})
}

module.exports.createAccessToken = (identity, endpointId) => {
		/* create token */
		const accessToken = new AccessToken(
			process.env.TWILIO_ACCOUNT_SID,
			process.env.TWILIO_API_KEY_SID,
			process.env.TWILIO_API_KEY_SECRET,
			{ ttl: 3600 })
	
		/* grant the access token Twilio Programmable Chat capabilities */
		const chatGrant = new ChatGrant({
			serviceSid: process.env.TWILIO_CHAT_SERVICE_SID,
			endpointId: endpointId
		})
	
		accessToken.addGrant(chatGrant)
		accessToken.identity = identity

		return accessToken
}