const twilio 	= require('twilio')

const TaskRouterCapability = twilio.jwt.taskrouter.TaskRouterCapability

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN)

module.exports.createTask = function (workflowSid, attributes) {
	attributes = attributes || {}

	const data = {
		workflowSid: workflowSid,
		attributes: JSON.stringify(attributes),
		timeout: 3600,
	}

	return new Promise((resolve, reject) => {

		client.taskrouter.v1.workspaces(process.env.TWILIO_WORKSPACE_SID).tasks.create(data)
			.then(task => {
				resolve(task)
			}).catch(error => {
				reject(error)
			})

	})

}

module.exports.getOngoingTasks = function (name) {

	return new Promise(function (resolve, reject) {
		let query = {}
		query.assignmentStatus = 'pending,assigned,reserved'
		query.evaluateTaskAttributes = 'name=\'' + name + '\''

		client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).tasks.list(query)
			.then(tasks => {
				return resolve(tasks)
			}).catch(error => {
				return reject(error)
			})

	})

}

const buildWorkspacePolicy = (options) => {
	options = options || {}

	const resources = options.resources || []
	const urlComponents = ['https://taskrouter.twilio.com', 'v1', 'Workspaces', process.env.TWILIO_WORKSPACE_SID]

	return new TaskRouterCapability.Policy({
		url: urlComponents.concat(resources).join('/'),
		method: options.method || 'GET',
		allow: true
	})
}

module.exports.createWorkerCapabilityToken = function (sid) {
	const workerCapability = new TaskRouterCapability({
		accountSid: process.env.TWILIO_ACCOUNT_SID,
		authToken: process.env.TWILIO_AUTH_TOKEN,
		workspaceSid: process.env.TWILIO_WORKSPACE_SID,
		channelId: sid,
		ttl: 3600,
	})

	const eventBridgePolicies = twilio.jwt.taskrouter.util.defaultEventBridgePolicies(process.env.TWILIO_ACCOUNT_SID, sid)

	const workspacePolicies = [
		// Workspace fetch Policy
		buildWorkspacePolicy(),
		// Workspace subresources fetch Policy
		buildWorkspacePolicy({ resources: ['**'] }),
		// Workspace resources update Policy
		buildWorkspacePolicy({ resources: ['**'], method: 'POST' }),
	]

	eventBridgePolicies.concat(workspacePolicies).forEach(policy => {
		workerCapability.addPolicy(policy)
	})

	return workerCapability
}

