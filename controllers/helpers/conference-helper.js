const twilio = require('twilio')

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
});

module.exports.getConferenceByName = name => {
	const options = {
		status: 'in-progress',
		friendlyName: name
	}

	return new Promise((resolve, reject) => {
		client.conferences
			.list(options)
			.then(conferences => {
				if (conferences.length === 0) {
					reject('NOT_FOUND')
				} else {
					resolve(conferences[0])
				}
			})
			.catch(error => {
				reject(error)
			})
	})
}

module.exports.getConferenceParticipants = conferenceSid => {
	return new Promise((resolve, reject) => {
		client
			.conferences(conferenceSid)
			.participants.list()
			.then(participants => {
				const list = []

				participants.map(participant => {
					list.push(participant.callSid)
				})

				resolve(list)
			})
			.catch(error => {
				reject(error)
			})
	})
}
