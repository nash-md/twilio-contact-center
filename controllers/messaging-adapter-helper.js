module.exports.getFrom = (to, configuration) => {
  switch (getMessengerChannelKey(to)) {
    case 'messenger':
      return 'messenger:' + configuration.twilio.facebookPageId;
    case 'whatsapp':
      return 'whatsapp:' + configuration.twilio.whatsAppPhoneNumber;
    default:
      return configuration.twilio.callerId;
  }
};

module.exports.createTaskAttributes = (from, channel) => {
  return {
    title: `${getMessengerChannelDetail(from).friendlyName} request`,
    text: getMessengerChannelDetail(from).text,
    channel: 'chat',
    endpoint: getMessengerChannelKey(from),
    team: 'support',
    name: from,
    channelSid: channel.sid
  };
};

const getMessengerChannelKey = (from) => {
  if (from.includes('messenger')) {
    return 'messenger';
  } else if (from.includes('whatsapp')) {
    return 'whatsapp';
  }

  return 'sms';
};

const getMessengerChannelDetail = (from) => {
  const meta = new Map();

  meta.set('messenger', {
    friendlyName: 'Facebook Messenger',
    text: 'Customer requested support on Faceboook'
  });

  meta.set('whatsapp', {
    friendlyName: 'WhatsApp',
    text: 'Customer requested support on WhatsApp'
  });

  meta.set('sms', {
    friendlyName: 'SMS',
    text: 'Customer requested support via SMS'
  });

  return meta.get(getMessengerChannelKey(from));
};
