const twilio 	= require('twilio')

const AccessToken 	= twilio.jwt.AccessToken
const VideoGrant 		= twilio.jwt.AccessToken.VideoGrant

module.exports.createAccessToken = (identity, roomName) => {
		/* create token */
	const accessToken = new AccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY_SID,
		process.env.TWILIO_API_KEY_SECRET,
		{ ttl: 3600 }
	)

	/* grant the access token Twilio Programmable Video capabilities and access to the video room */
	const videoGrant = new VideoGrant({
		room: roomName
	})

	accessToken.addGrant(videoGrant)
	accessToken.identity = identity

	return accessToken
}