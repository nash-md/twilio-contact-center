function VideoController ($scope, $http, $timeout, $log, $window) {
	$scope.configuration;

	/* Twilio Video */
	$scope.client;
	$scope.room;
	$scope.localMedia;
	$scope.localMediaPreview = true;

	/* UI */
	$scope.UI = { warning: null, state: null };

	if ($window.location.protocol !== 'https:') {
		let message =  `Depending on your browser and/or settings capturing audio and video 
										requires a secure (HTTPS) page. The demo may not work.`;
		$scope.UI.warning = message;
	}

	$http.get('/api/setup')
		.then(function onSuccess (response) {
			$scope.configuration = response.data;
			$scope.UI.state = 'WAITING_FOR_INPUT';
		}, function onError (response) {
			$log.error('Error loading configuration, %o', response);
			$scope.UI.warning = 'Error loading configuration:' + JSON.stringify(response);
		});

	$scope.initVideo = function () {
		$scope.UI.state = 'INITIALIZING';

		let user = {
			identity: $scope.user.identity
		};

		$http.post('/api/tasks/video', user)
			.then(function onSuccess (response) {
				$scope.client = new Twilio.Video.Client(response.data.token);

				$scope.client.on('error', function (error) {
					$log.error('Twilio Video Client failed, %o', error);
					$scope.UI.warning = 'Twilio Video Client failed, check JavaScript console';
				});

				$scope.setupLocalMedia(response.data.room);

			}, function onError (response) {
				$log.error('Connect to Room failed, %o', response);
				$scope.UI.warning = 'Connect to Room failed, check JavaScript console';
			});

	};

	$scope.enterRoom = function (room) {

		$scope.client.connect({ to: room, localMedia: $scope.localMedia }).then(room => {
			$log.log('Connected to Room "%s"', room.name);

			$scope.room = room;
			$scope.UI.state = 'WAITING_FOR_AGENT';

			$scope.$apply();

			$scope.room.on('participantConnected', participant => {
				$log.log('Participant "%s" connected', participant.identity);

				participant.media.attach('#remote-media');

				$scope.UI.state = 'CONVERSATION_ACTIVE';
				$scope.$apply();
			});

			$scope.room.on('participantDisconnected', participant => {
				$log.log('Participant "%s" disconnected', participant.identity);

				participant.media.detach();

				$scope.leaveRoom(); /* agent left the room, let's disconnect */

				$scope.UI.state = 'CLOSED';
				$timeout(function () {
					$scope.$apply();
				});
			});

			$scope.room.on('disconnected', function () {
				$scope.localMedia.detach();
				$scope.localMedia.stop();

				$scope.UI.state = 'CLOSED';
				$timeout(function () {
					$scope.$apply();
				});
			});

		});

	};

	$scope.setupLocalMedia = function (room) {
		$scope.localMedia = new Twilio.Video.LocalMedia();

		Twilio.Video.getUserMedia().then(
			function (mediaStream) {
				$scope.localMedia.addStream(mediaStream);
				$scope.localMedia.attach('#local-media');

				$scope.enterRoom(room);

				$timeout(function () {
					$scope.$apply();
				});
			},
			function (error) {
				$log.error('Unable to access local media, %o', error);
				$scope.UI.warning = 'Unable to access Camera and Microphone';

				$timeout(function () {
					$scope.$apply();
				});
			});
	};

	$scope.toggleMediaStream = function () {
		if (!$scope.localMediaPreview) {
			$scope.room.localParticipant.media.pause(false);
			$scope.localMediaPreview = true;
		} else {
			$scope.room.localParticipant.media.pause(true);
			$scope.localMediaPreview = false;
		}
	};

	$scope.leaveRoom = function () {
		$scope.room.disconnect();
	};

}

angular
	.module('supportApplication', ['ngMessages'])
	.controller('VideoController', VideoController);