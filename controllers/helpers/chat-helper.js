const Twilio 	= require('twilio')

const client = new Twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.createChannel = (name) => {
	const data = {
		friendlyName: 'Support Chat with ' + name,
		uniqueName: 'support_channel_' + Math.random().toString(36).substring(7)
	}

	return new Promise((resolve, reject) => {
		client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).channels.create(data)
			.then(channel => {
				resolve(channel)
			}).catch(error => {
				reject(error)
			})

	})

}