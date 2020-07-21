/* this route creates tasks for our customers */
const taskrouterHelper = require('./helpers/taskrouter-helper.js');
const chatHelper = require('./helpers/chat-helper.js');
const videoHelper = require('./helpers/video-helper.js');

module.exports.createCallback = function (req, res) {
  taskrouterHelper
    .createTask(req.configuration.twilio.workflowSid, req.body)
    .then((task) => {
      res.status(200).end();
    })
    .catch((error) => {
      res.status(500).send(res.convertErrorToJSON(error));
    });
};

module.exports.createChat = function (req, res) {
  const friendlyName = 'Support Chat with ' + req.body.identity;
  const uniqueName = `chat_room_${Math.random().toString(36).substring(7)}`;

  let payload = {
    identity: req.body.identity,
    token: chatHelper.createAccessToken(req.body.identity, req.body.endpoint).toJwt()
  };

  chatHelper
    .createChannel(friendlyName, uniqueName)
    .then((channel) => {
      payload.chat = {
        sid: channel.sid,
        friendlyName: channel.friendlyName,
        uniqueName: channel.uniqueName
      };

      const attributes = {
        title: 'Chat request',
        text: 'Customer entered chat via support page',
        channel: 'chat',
        name: payload.identity,
        channelSid: channel.sid
      };

      return taskrouterHelper
        .createTask(req.configuration.twilio.workflowSid, attributes)
        .then((task) => {
          payload.task = task.sid;
          res.status(200).json(payload);
        });
    })
    .catch((error) => {
      res.status(500).json(error);
    });
};

module.exports.createVideo = function (req, res) {
  const uid = Math.random().toString(36).substring(7);

  let payload = {
    identity: req.body.identity,
    token: videoHelper.createAccessToken(req.body.identity, uid).toJwt(),
    video: {
      name: uid
    }
  };

  const attributes = {
    title: 'Video request',
    text: 'Customer requested video support on web page',
    channel: 'video',
    name: payload.identity,
    roomName: payload.video.name
  };

  taskrouterHelper
    .createTask(req.configuration.twilio.workflowSid, attributes)
    .then((task) => {
      payload.task = task.sid;
      res.status(200).json(payload);
    })
    .catch((error) => {
      res.status(500).send(res.convertErrorToJSON(error));
    });
};
