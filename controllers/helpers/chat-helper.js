const twilio 	= require('twilio')

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.createChannel = (name) => {
	return client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.create({
		friendlyName: 'Support Chat with ' + name,
		uniqueName: 'support_channel_' + Math.random().toString(36).substring(7)
	})
}