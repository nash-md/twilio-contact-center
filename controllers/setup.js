const twilio = require('twilio');
const context = require('../context')

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
});

module.exports.get = (req, res) => {
	res.status(200).json(req.configuration);
};

module.exports.update = async (req, res) => {
	let configuration = req.body.configuration;

	try {
		const { sid: applicationSid } = await createOrUpdateApplication(configuration.twilio.applicationSid, req);

		configuration.twilio.applicationSid = applicationSid;

		await updateChatService(req);
		await syncQueues(configuration);

		const { sid: workflowSid } = await createOrUpdateWorkflow(
			configuration.twilio.workflowSid,
			configuration.queues
		);

		configuration.twilio.workflowSid = workflowSid;

		req.util.setConfiguration(configuration, (error) => {
			if (error) {
				throw error;
			} else {
				context.set({ configuration: configuration })

				res.status(200).end();
			}
		});
	} catch (error) {
		res.status(500).send(res.convertErrorToJSON(error));
	}
};

const syncQueues = async (configuration) => {
	return Promise.all(
		configuration.queues.map(async (queue) => {
			let payload = {
				sid: queue.taskQueueSid,
				friendlyName: queue.friendlyName,
				targetWorkers: `channels HAS "${queue.id}"`
			};

			const { sid } = await createOrUpdateQueue(payload);
			queue.taskQueueSid = sid;
		})
	);
};

const createOrUpdateQueue = async (queue) => {
	if (queue.sid) {
		return client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).taskQueues(queue.sid).update(queue);
	} else {
		return client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).taskQueues.create(queue);
	}
};

const createOrUpdateWorkflow = async (sid, queues) => {
	let workflow = { task_routing: { filters: [] } };

	for (let i = 0; i < queues.length; i++) {
		let target = {
			queue: queues[i].taskQueueSid
		};

		if (queues[i].targetWorkerExpression) {
			target.expression = queues[i].targetWorkerExpression;
		}

		let item = {
			targets: [ target ],
			expression: queues[i].expression,
			filterFriendlyName: queues[i].filterFriendlyName
		};

		workflow.task_routing.filters.push(item);
	}

	const payload = {
		sid: sid,
		friendlyName: 'Twilio Contact Center Workflow',
		taskReservationTimeout: 1200,
		configuration: JSON.stringify(workflow)
	};

	if (sid) {
		return client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workflows(sid).update(payload);
	} else {
		return client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).workflows.create(payload);
	}
};

const createOrUpdateApplication = async (sid, req) => {
	const payload = {
		friendlyName: 'Twilio Contact Center Demo',
		voiceUrl: `${req.protocol}://${req.hostname}/api/phone/call`,
		voiceMethod: 'POST'
	};

	if (sid) {
		return client.applications(sid).update(payload);
	} else {
		return client.applications.create(payload);
	}
};

const updateChatService = async (req) => {
	let webhooks = {};

	webhooks.postWebhookUrl = `${req.protocol}://${req.hostname}/api/messaging-adapter/outbound`;
	webhooks.webhookFilters = 'onMessageSent';
	webhooks.webhookMethod = 'POST';

	return client.chat.services(process.env.TWILIO_CHAT_SERVICE_SID).update(webhooks);
};
