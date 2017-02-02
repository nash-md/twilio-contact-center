function VideoController ($scope, $http, $timeout, $log) {
	$scope.configuration;

	/* Twilio Video */
	$scope.client;
	$scope.room;
	$scope.localMedia;
	$scope.mediaStrea;

	/* UI state */
	$scope.state;

	/*load configuration */
	$http.get('/api/setup')
		.then(function onSuccess (response) {
			$scope.configuration = response.data;
			$scope.state = 'WAITING_FOR_INPUT';
		}, function onError (response) {
			$log.error('error loading configuration, %o', response);
		});

	$scope.initVideo = function () {
		$scope.state = 'INITIALIZING';

		var user = {
			identity: $scope.user.identity
		};

		$http.post('/api/tasks/video', user)

			.then(function onSuccess (response) {
				$scope.client = new Twilio.Video.Client(response.data.token);

				$scope.client.connect({ to: response.data.room }).then(room => {
					$log.log('Connected to Room "%s"', room.name);

					$scope.room = room;
					$scope.state = 'WAITING_FOR_AGENT';

					$scope.toggleMediaStream();
					$scope.$apply();

					$scope.room.on('participantConnected', participant => {
						$log.log('Participant "%s" connected', participant.identity);

						participant.media.attach('#remote-media');

						$scope.state = 'CONVERSATION_ACTIVE';
						$scope.$apply();
					});

					$scope.room.on('participantDisconnected', participant => {
						$log.log('Participant "%s" disconnected', participant.identity);

						participant.media.detach('#remote-media');

						$scope.leaveRoom(); /* agent left the room, let's disconnect */

						$scope.state = 'CLOSED';
						$timeout(function () {
							$scope.$apply();
						});
					});

					$scope.room.on('disconnected', function () {
						$scope.localMedia.stop();

						$scope.state = 'CLOSED';
						$timeout(function () {
							$scope.$apply();
						});
					});

				});
			}, function onError (response) {
				$log.error('server returned an error, %o', response);
			});

	};

	$scope.toggleMediaStream = function () {
		if (!$scope.localMedia) {
			$scope.room.localParticipant.media.pause(false);

			$scope.localMedia = new Twilio.Video.LocalMedia();

			Twilio.Video.getUserMedia().then(
				function (mediaStream) {
					$scope.localMedia.addStream(mediaStream);
					$scope.localMedia.attach('#local-media');
					$scope.$apply();
				},
				function (error) {
					$log.error('Unable to access local media, %o', error);
				});

		} else {
			$scope.room.localParticipant.media.pause(true);
			$scope.localMedia.detach();
			$scope.localMedia = null;
		}

	};

	$scope.leaveRoom = function () {
		$scope.room.disconnect();
	};

}

angular
	.module('supportApplication', ['ngMessages'])
	.controller('VideoController', VideoController);