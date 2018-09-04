function VideoController ($scope, $rootScope, $http, $timeout, $log) {
	/* Twilio Video */
	$scope.token;
	$scope.room;
	$scope.UI = { warning: null, state: null };

	$scope.$on('DestroyVideo', function (event) {
		$log.log('DestroyVideo event received');

		if ($scope.room) {
			$scope.room.disconnect();
		}

		$scope.UI = { warning: null, state: null };
	});

	$scope.$on('InitializeVideo', function (event, data) {
		$log.log('InitializeVideo event received, %o', data);
		$scope.token = data.token;
	});

	$scope.$on('ActivateVideo', function (event, data) {
		$log.log('ActivateVideo event received, %o', data);
		$scope.UI.state = 'WAITING_FOR_CUSTOMER';

		$timeout(function () {
			$scope.$apply();
		});

		Twilio.Video.connect($scope.token, { name: data.roomName }).then(room => {
			$log.log('Connected to Room "%s"', room.name);

			$scope.room = room;

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

				$scope.UI.state = 'CLOSED';
				$timeout(function () {
					$scope.$apply();
				});

			});

			$scope.room.participants.forEach(function (participant) {
				$log.log(`${participant.identity} is already in room`);

				$scope.participantConnected(participant);
			});

			$scope.room.on('disconnected', function () {
				$log.log('Disconnect from room complete');
				const tracks = Array.from($scope.room.localParticipant.tracks.values());

				tracks.forEach(function (track) {
					track.detach().forEach(function (detachedElement) {
						detachedElement.remove();
					});

					track.disable();
					track.stop();
				});

				/* clean up remote tracks */
				$scope.room.participants.forEach(function (participant) {
					const remoteTracks = Array.from(participant.tracks.values());

					remoteTracks.forEach(function (track) {
						track.detach().forEach(function (detachedElement) {
							detachedElement.remove();
						});
					});

				});

			});

		}).catch(function (error) {
			$log.error('Connect to Room failed, %o', error);
		});

	});

}

angular
	.module('callcenterApplication')
	.controller('VideoController', VideoController);