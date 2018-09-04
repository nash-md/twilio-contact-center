const generateSessionExirationDate = (seconds) => {
	const now = new Date()
	const offset = (now.getTimezoneOffset() * 60 * 1000) * -1
	const date = new Date(now.getTime() + offset + (seconds * 1000))

	return date
}

const convertToString = (error) => {
	return JSON.stringify(error, Object.getOwnPropertyNames(error))
}

module.exports = {
	generateSessionExirationDate,
	convertToString
}