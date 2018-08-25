function VideoController ($scope, $http, $timeout, $log, $window) {
	$scope.configuration;

	/* Twilio Video */
	$scope.room;

	$scope.localVideoTrack;
	$scope.localAudioTrack;

	/* UI */
	$scope.UI = { warning: null, state: null };

	if ($window.location.protocol !== 'https:') {
		let message = `Depending on your browser and/or settings capturing audio and video 
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
				$scope.setupLocalTracks(response.data.token, response.data.roomName);
			}, function onError (response) {
				$log.error('Connect to Room failed, %o', response);
				$scope.UI.warning = 'Connect to Room failed, check JavaScript console';
			});

	};

	$scope.enterRoom = function (token, roomName) {
		let options = {
			name: roomName,
			tracks: [$scope.localVideoTrack, $scope.localAudioTrack]
		};

		Twilio.Video.connect(token, options).then(room => {
			$log.log('Connected to Room "%s"', room.name);

			$scope.room = room;
			$scope.UI.state = 'WAITING_FOR_AGENT';

			$scope.$apply();

			$scope.participantConnected = function (participant) {
				console.log('Participant "%s" connected', participant.identity);

				$scope.UI.state = 'CONVERSATION_ACTIVE';

				participant.on('trackAdded', track => $scope.addTrack(participant, track));
				participant.on('trackRemoved', track => $scope.removeTrack(participant, track));

				$timeout(function () {
					$scope.$apply();
				});
			};

			$scope.addTrack = function (participant, track) {
				$log.log(participant.identity + ' added track: ' + track.kind);

				document.getElementById('remote-media').appendChild(track.attach());

				$timeout(function () {
					$scope.$apply();
				});
			};

			$scope.removeTrack = function (participant, track) {
				$log.log(participant.identity + ' removed track: ' + track.kind);

				track.detach().forEach(element => element.remove());

				$timeout(function () {
					$scope.$apply();
				});
			};

			$scope.room.on('participantConnected', participant => {
				$scope.participantConnected(participant);
			});

			$scope.room.on('participantDisconnected', participant => {
				$log.log('Participant "%s" disconnected', participant.identity);

				participant.tracks.forEach(function (track) {
					track.detach().forEach(function (detachedElement) {
						detachedElement.remove();
					});
				});

				$scope.leaveRoom(); /* agent left the room, let's disconnect */
			});

			$scope.room.on('disconnected', function () {
				$log.log('Disconnect from Room complete');
				$scope.localVideoTrack.disable();
				$scope.localVideoTrack.stop();

				$scope.localAudioTrack.disable();
				$scope.localAudioTrack.stop();

				$scope.UI.state = 'CLOSED';
				$timeout(function () {
					$scope.$apply();
				});
			});

			$scope.room.participants.forEach(function (participant) {
				$log.log(`${participant.identity} is already in room`);

				$scope.participantConnected(participant);
			});

		}).catch(function (error) {
			$log.error('Connect to Room failed, %o', error);
			$scope.UI.warning = 'Connect to Room failed, check JavaScript console';
			$timeout(function () {
				$scope.$apply();
			});
		});

	};

	$scope.setupLocalTracks = function (token, room) {
		Twilio.Video.createLocalTracks().then(function (tracks) {

			for (let track of tracks) {
				if (track.kind === 'video') {
					document.getElementById('local-media').appendChild(track.attach());
					$scope.localVideoTrack = track;
				}

				if (track.kind === 'audio') {
					$scope.localAudioTrack = track;
				}
			}

			$scope.enterRoom(token, room);

			$timeout(function () {
				$scope.$apply();
			});
		}).catch(function (error) {
			$log.error('Unable to access local media, %o', error);
			$scope.UI.warning = 'Unable to access Camera and Microphone';

			$timeout(function () {
				$scope.$apply();
			});
		});
	};

	$scope.toggleVideoStream = function () {
		$log.log('toggle video, current status is: ' + $scope.localVideoTrack.isEnabled);
		if ($scope.localVideoTrack.isEnabled) {
			$scope.localVideoTrack.disable();
		} else {
			$scope.localVideoTrack.enable();
		}
	};

	$scope.toggleAudioStream = function () {
		$log.log('toggle audio, current status is: ' + $scope.localAudioTrack.isEnabled);
		if ($scope.localAudioTrack.isEnabled) {
			$scope.localAudioTrack.disable();
		} else {
			$scope.localAudioTrack.enable();
		}
	};

	$scope.leaveRoom = function () {
		$scope.room.disconnect();
	};

}

angular
	.module('supportApplication', ['ngMessages'])
	.controller('VideoController', VideoController);