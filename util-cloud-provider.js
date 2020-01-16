const isRunningOnHeroku = () => {
	return (process.env.DYNO) ? true : false
}

const isRunningOnGoogle = () => {
	return (process.env.GAE_ENV === 'standard')
}

module.exports = {
	isRunningOnHeroku,
	isRunningOnGoogle
}