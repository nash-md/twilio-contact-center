function VideoController ($scope, $rootScope, $http, $timeout, $log) {
	/* Twilio Video */
	$scope.token;
	$scope.room;

	$scope.$on('DestroyVideo', function (event) {
		$log.log('DestroyVideo event received');
		$scope.room.disconnect();
	});

	$scope.$on('InitializeVideo', function (event, data) {
		$log.log('InitializeVideo event received, %o', data);
		$scope.token = data.token;
	});

	$scope.$on('ActivateVideo', function (event, data) {
		$log.log('ActivateVideo event received, %o', data);

		Twilio.Video.connect($scope.token, { name: data.roomName }).then(room => {
			$log.log('Connected to Room "%s"', room.name);

			$scope.room = room;

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

			room.on('participantDisconnected', participant => {
				$log.log('Participant "%s" disconnected', participant.identity);

				participant.tracks.forEach(function (track) {
					track.detach().forEach(function (detachedElement) {
						detachedElement.remove();
					});
				});

				$scope.room.disconnect(); /* customer left the room, let's disconnect */
			});

			room.on('disconnected', function () {
				$log.log('Disconnect from Room complete');
				var tracks = Array.from($scope.room.localParticipant.tracks.values());

				tracks.forEach(function (track) {
					track.disable();
					track.stop();
				});

			});

		});

	});

}

angular
	.module('callcenterApplication')
	.controller('VideoController', VideoController);