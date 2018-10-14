app.controller('ChatController', function ($scope, $rootScope, $http, $sce, $compile, $log) {

	$scope.client;
	$scope.channel;
	$scope.messages = [];
	$scope.session = {
		token: null,
		identity: null,
		isInitialized: false,
		isLoading: false,
		expired: false
	};

	$scope.$on('DestroyChat', function (event) {
		$log.log('DestroyChat event received');

		if ($scope.channel) {

			$scope.channel.leave().then(function () {
				$log.log('channel left');
				$scope.channel = null;

				$scope.client.shutdown();
			});

		}

		$scope.messages = [];
		$scope.session.isInitialized = false;
		$scope.session.channelSid = null;

	});

	$scope.$on('InitializeChat', function (event, data) {

		$log.log('InitializeChat event received');
		$log.log(data);

		/* clean up  */
		$scope.client = null;
		$scope.message = null;
		$scope.channel = null;
		$scope.messages = [];
		$scope.session = {
			token: null,
			identity: null,
			isInitialized: false,
			isLoading: false,
			expired: false
		};

		$scope.session.token = data.token;
		$scope.session.identity = data.identity;
	});

	$scope.$on('ActivateChat', function (event, data) {
		$log.log('ActivateChat event received');
		$log.log(data);

		$scope.session.channelSid = data.channelSid;

		$scope.session.isLoading = true;
		$scope.setupClient($scope.session.channelSid);

	});

	$scope.setupClient = function (channelSid) {

		$log.log('Initiate Twilio Chat, channelSid: ' + channelSid);
		const accessManager = new Twilio.AccessManager($scope.session.token);

		/**
		 * you'll want to be sure to listen to the tokenExpired event either update
		 * the token via accessManager.updateToken(<token>) or let your page tell the user
		 * the chat is not active anymore
		**/
		accessManager.on('tokenExpired', function () {
			$log.warn('token expired');
			$scope.session.expired = true;
			$scope.$apply();
		});

		accessManager.on('error', function (err) {
			$log.error('An error occurred');
			$log.error(err);
		});

		Twilio.Chat.Client.create($scope.session.token, { logLevel: 'debug' }).then((client) => {
			$scope.client = client;

			return client.getChannelBySid(channelSid);
		}).then((channel) => {
			$scope.setupChannel(channel);
		}).catch((error) => {
			$log.error('Setting up chat client failed');
			$log.error(error);
		});

	};

	$scope.setupChannel = function (channel) {

		/* let the agent join the channel */
		channel.join().then(function (member) {
			return member;
		}).catch(function (error) {
			$log.error(error);

			return;
		}).then(() => {

			/* read the message history of this channel */
			channel.getMessages().then(function (messages) {
				$log.log('Recent Messages in Channel:' + messages.items.length);

				messages.items.map((message) => {
					$scope.addMessage(message);
				});

				$scope.messages.push({
					body: 'You are now connected to the customer',
					author: 'System'
				});

				/* display chat canvas */
				$scope.session.isInitialized = true;
				$scope.session.isLoading = false;

				$scope.$apply();
			});

		});

		channel.on('messageAdded', function (message) {
			$scope.addMessage(message);
		});

		channel.on('memberJoined', function (member) {
			$scope.messages.push({
				body: member.identity + ' has joined the channel.',
				author: 'System'
			});
			$scope.$apply();

		});

		channel.on('memberLeft', function (member) {
			$scope.messages.push({
				body: member.identity + ' has left the channel.',
				author: 'System'
			});
			$scope.$apply();
		});

		channel.on('typingStarted', function (member) {
			$log.log(member.identity + ' started typing');
			$scope.typingNotification = member.identity + ' is typing ...';
			$scope.$apply();
		});

		channel.on('typingEnded', function (member) {
			$log.log(member.identity + ' stopped typing');
			$scope.typingNotification = '';
			$scope.$apply();
		});

		$scope.channel = channel;

	};

	/* if the message input changes the user is typing */
	$scope.$watch('message', function (newValue, oldValue) {
		if ($scope.channel) {
			$log.log('send typing notification to channel');
			$scope.channel.typing();
		}
	});

	$scope.send = function () {
		$scope.channel.sendMessage($scope.message);
		$scope.message = '';
	};

	$scope.callInlineNumber = function (phone) {
		$log.log('call inline number ' + phone);
		$rootScope.$broadcast('CallPhoneNumber', { phoneNumber: phone });
	};

	$scope.addMessage = function (message) {
		var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

		var m = message.body;
		var template = '<p>$1<span class="chat-inline-number" ng-click="callInlineNumber(\'$2\')">$2</span>$3</p>';

		if (pattern.test(message.body) === true) {
			m = message.body.replace(pattern, template);
		}

		$scope.messages.push({ body: m, author: message.author, timestamp: message.timestamp });
		$scope.$apply();

	};

});

/* this is a demo, please don't do that in production */
app.filter('unsafe', function ($sce) { return $sce.trustAsHtml; });

app.directive('dynamic', function ($compile) {
	return {
		restrict: 'A',
		replace: true,
		link: function (scope, ele, attrs) {
			scope.$watch(attrs.dynamic, function (html) {
				ele.html(html);
				$compile(ele.contents())(scope);
			});
		}
	};
});

app.filter('time', function () {
	return function (value) {
		return moment(value).format('HH:mm');
	};
});
