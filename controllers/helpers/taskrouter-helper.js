const twilio = require('twilio');
const context = require('../../context');

const TaskRouterCapability = twilio.jwt.taskrouter.TaskRouterCapability;

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

module.exports.createTask = async (attributes = {}) => {
  const configuration = context.get().configuration;

  const payload = {
    workflowSid: configuration.twilio.workflowSid,
    attributes: JSON.stringify(attributes),
    timeout: 3600,
    taskChannel: 'voice'
  };

  return client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).tasks.create(payload);
};

module.exports.findWorker = (friendlyName) => {
  const filter = { friendlyName: friendlyName };

  return client.taskrouter
    .workspaces(process.env.TWILIO_WORKSPACE_SID)
    .workers.list(filter)
    .then((workers) => workers[0]);
};

module.exports.getOngoingTasks = (name) => {
  let query = {};
  query.assignmentStatus = 'pending,assigned,reserved';
  query.evaluateTaskAttributes = "name='" + name + "'";

  return client.taskrouter.workspaces(process.env.TWILIO_WORKSPACE_SID).tasks.list(query);
};

const buildWorkspacePolicy = (options) => {
  options = options || {};

  const resources = options.resources || [];
  const urlComponents = [
    'https://taskrouter.twilio.com',
    'v1',
    'Workspaces',
    process.env.TWILIO_WORKSPACE_SID
  ];

  return new TaskRouterCapability.Policy({
    url: urlComponents.concat(resources).join('/'),
    method: options.method || 'GET',
    allow: true
  });
};

module.exports.createWorkerCapabilityToken = (sid) => {
  const workerCapability = new TaskRouterCapability({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    workspaceSid: process.env.TWILIO_WORKSPACE_SID,
    channelId: sid,
    ttl: 3600
  });

  const eventBridgePolicies = twilio.jwt.taskrouter.util.defaultEventBridgePolicies(
    process.env.TWILIO_ACCOUNT_SID,
    sid
  );

  const workspacePolicies = [
    // Workspace fetch Policy
    buildWorkspacePolicy(),
    // Workspace subresources fetch Policy
    buildWorkspacePolicy({ resources: ['**'] }),
    // Workspace resources update Policy
    buildWorkspacePolicy({ resources: ['**'], method: 'POST' })
  ];

  eventBridgePolicies.concat(workspacePolicies).forEach((policy) => {
    workerCapability.addPolicy(policy);
  });

  return workerCapability;
};
