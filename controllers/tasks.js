/* this route creates tasks for our customers */
const taskrouterHelper = require('./helpers/taskrouter-helper.js');
const chatHelper = require('./helpers/chat-helper.js');
const videoHelper = require('./helpers/video-helper.js');

module.exports.createCallback = async (req, res) => {
  const attributes = {
    title: 'Callback request',
    text: req.body.text,
    channel: 'callback',
    name: req.body.name,
    team: req.body.team,
    phone: req.body.phone
  };

  try {
    const task = await taskrouterHelper.createTask(attributes);

    const response = {
      taskSid: task.sid
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(res.convertErrorToJSON(error));
  }
};

module.exports.createChat = async (req, res) => {
  const friendlyName = 'Support Chat with ' + req.body.identity;
  const uniqueName = `chat_room_${Math.random().toString(36).substring(7)}`;

  try {
    const channel = await chatHelper.createChannel(friendlyName, uniqueName);

    const attributes = {
      title: 'Chat request',
      text: 'Customer entered chat via support page',
      channel: 'chat',
      name: req.body.identity,
      chat: {
        sid: channel.sid,
        friendlyName: channel.friendlyName,
        uniqueName: channel.uniqueName
      }
    };

    const task = await taskrouterHelper.createTask(attributes);

    const response = {
      identity: req.body.identity,
      token: chatHelper.createAccessToken(req.body.identity, req.body.endpointId).toJwt(),
      chat: {
        sid: channel.sid,
        friendlyName: channel.friendlyName,
        uniqueName: channel.uniqueName
      },
      taskSid: task.sid
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(res.convertErrorToJSON(error));
  }
};

module.exports.createVideo = async (req, res) => {
  const roomName = `video_room_${Math.random().toString(36).substring(7)}`;

  const attributes = {
    title: 'Video request',
    text: 'Customer requested video support on web page',
    channel: 'video',
    name: req.body.identity,
    video: {
      roomName: roomName
    }
  };

  try {
    const task = await taskrouterHelper.createTask(attributes);

    const response = {
      identity: req.body.identity,
      token: videoHelper.createAccessToken(req.body.identity, roomName).toJwt(),
      video: {
        roomName: roomName
      },
      taskSid: task.sid
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(res.convertErrorToJSON(error));
  }
};
