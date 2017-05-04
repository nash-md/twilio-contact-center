function VideoController ($scope, $http, $timeout, $log, $window) {
	$scope.configuration;

	/* Twilio Video */
	$scope.room;

	$scope.localVideoTrack;
	$scope.localAudioTrack;

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
				$scope.setupLocalTracks(response.data.token, response.data.roomName);
			}, function onError (response) {
				$log.error('Connect to Room failed, %o', response);
				$scope.UI.warning = 'Connect to Room failed, check JavaScript console';
			});

	};

	$scope.enterRoom = function (token, roomName) {
		let options = {
			name: roomName,
			tracks: [ $scope.localVideoTrack, $scope.localAudioTrack ]
		};

		Twilio.Video.connect(token, options).then(room => {
			$log.log('Connected to Room "%s"', room.name);

			$scope.room = room;
			$scope.UI.state = 'WAITING_FOR_AGENT';

			$scope.$apply();

			$scope.room.participants.forEach(function (participant) {
				$log.log('Already in Room: ' + participant.identity);

				var tracks = Array.from(participant.tracks.values());
				var remoteMediaContainer = document.getElementById('remote-media');

				tracks.forEach(function (track) {
					remoteMediaContainer.appendChild(track.attach());
				});

			});

			$scope.room.on('trackAdded', function (track, participant) {
				$log.log(participant.identity + ' added track: ' + track.kind);

				document.getElementById('remote-media').appendChild(track.attach());
			});

			$scope.room.on('participantConnected', participant => {
				$log.log('Participant "%s" connected', participant.identity);
				$scope.UI.state = 'CONVERSATION_ACTIVE';
				$scope.$apply();
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

	$scope.toggleMediaStream = function () {
		console.log('isEnabled: ' + $scope.localVideoTrack.isEnabled);
		if ($scope.localVideoTrack.isEnabled) {
			$scope.localVideoTrack.disable();
		} else {
			$scope.localVideoTrack.enable();
		}
	};

	$scope.leaveRoom = function () {
		$scope.room.disconnect();
	};

}

angular
	.module('supportApplication', ['ngMessages'])
	.controller('VideoController', VideoController);