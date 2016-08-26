var app = angular.module('supportApplication', ['ngMessages', 'glue.directives']);

app.controller('ChatController', function ($scope, $http, $timeout, $log) {

	$scope.configuration;
	$scope.channel;
	$scope.messages = [];
	$scope.session = { 
		token: null, 
		identity: null, 
		isInitialized: false, 
		isLoading: false, 
		expired: false 
	};

	$scope.init = function(){

		$http.get('/api/setup')

			.then(function onSuccess(response) {

				$scope.configuration = response.data;
				
			}, function onError(response) { 

				$log.error('error loading configuration');
				$log.error(response);

			});

	};     

	$scope.initChat = function(){

		/* clean up  */
		$scope.channel = null;
		$scope.messages = [];
		$scope.session = { 
			token: null, 
			identity: null, 
			isInitialized: false, 
			isLoading: false, 
			expired: false 
		};

		$scope.session.isLoading = true;

		var user = {
			identity: $scope.user.identity,
			endpoint: navigator.userAgent.toLowerCase() + Math.floor((Math.random() * 1000) + 1)
		};

		$http.post('/api/tasks/chat', user)

			.then(function onSuccess(response) {

				$scope.session.token = response.data.token;
				$scope.session.identity = response.data.identity;
				$scope.setupClient(response.data.channelSid);
				
			}, function onError(response) { 

				$scope.session.isLoading = false;
				$log.error('server returned error');
				$log.error(response);

			});

	};       

	$scope.setupClient = function(channelSid){

		$log.log('setup channel: ' + channelSid);
		var accessManager = new Twilio.AccessManager($scope.session.token); 

		/**
		 * you'll want to be sure to listen to the tokenExpired event either update 
		 * the token via accessManager.updateToken(<token>) or let your page tell the user
		 * the chat is not active anymore 
		**/
		accessManager.on('tokenExpired', function(){
			$log.warn('token expired');
			$scope.session.expired = true;
			$scope.$apply();
		}); 

		accessManager.on('error', function(err){
			$log.error('An error occurred');
			$log.error(err);
		});   

		var messagingClient = new Twilio.IPMessaging.Client(accessManager);

		var promise = messagingClient.getChannelBySid(channelSid);

		promise.then(function(channel) {
			$log.log('channel is: ' + channel.uniqueName);
			$scope.setupChannel(channel);
		}, function(reason) {
			/* client could not access the channel */
			$log.error('could not access channel');
			$log.error(reason);
		});

	};

	$scope.setupChannel = function(channel){

		channel.join().then(function(member) {
			$scope.messages.push({
				body: 'An agent will be available shortly',
				author: 'System'
			});
			
			/* use now joined the channel, display canvas */
			$scope.session.isInitialized = true;
			$scope.session.isLoading = false;
			$scope.$apply();
		});

		channel.on('messageAdded', function(message) {
			$scope.messages.push(message);
			$scope.$apply();
		});

		channel.on('memberJoined', function(member) {
			$log.log(member.identity + ' has joined the channel.');
			$scope.messages.push({
				body: member.identity + ' has joined the channel.',
				author: 'System'
			});
			$scope.$apply();
		});

		channel.on('memberLeft', function(member) {
			$scope.messages.push({
				body: member.identity + ' has left the channel.',
				author: 'System'
			});
			$scope.$apply();
		});

		channel.on('typingStarted', function(member) {
			$log.log(member.identity + ' started typing');
			$scope.typingNotification = member.identity + ' is typing ...';
			$scope.$apply();
		});

		channel.on('typingEnded', function(member) {
			$log.log(member.identity + ' stopped typing');
			$scope.typingNotification = '';
			$scope.$apply();
		});

		$scope.channel = channel;

	};

	$scope.$watch('message', function(newValue, oldValue) {
		if($scope.channel){
			$log.log('send typing notification to channel');
			$scope.channel.typing();
		}    
	});

	$scope.send = function(){
		$scope.channel.sendMessage($scope.message);
		$scope.message = '';
	};

});

app.filter('time', function() {

	return function(value) {
		return moment(value).format('HH:mm');
	};

});
