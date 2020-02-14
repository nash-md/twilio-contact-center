const twilio = require('twilio');

const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
	accountSid: process.env.TWILIO_ACCOUNT_SID
});

module.exports.getWorkspace = function(req, res) {
	client.taskrouter
		.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.fetch()
		.then((workspace) => {
			const payload = {
				sid: workspace.sid,
				friendlyName: workspace.friendlyName
			};

			res.status(200).json(payload);
		})
		.catch((error) => {
			res.status(500).send(res.convertErrorToJSON(error));
		});
};

module.exports.getActivities = function(req, res) {
	client.taskrouter
		.workspaces(process.env.TWILIO_WORKSPACE_SID)
		.activities.list()
		.then((activities) => {
			const payload = activities.map((activity) => {
				return { sid: activity.sid, friendlyName: activity.friendlyName };
			});

			res.status(200).json(payload);
		})
		.catch((error) => {
			res.status(500).send(res.convertErrorToJSON(error));
		});
};
