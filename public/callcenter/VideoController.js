function VideoController ($scope, $rootScope, $http, $timeout, $log) {
	/* Twilio Video */
	$scope.client;
	$scope.room;

	$scope.$on('DestroyVideo', function (event) {
		$log.log('DestroyVideo event received');

		$scope.room.disconnect();

	});

	$scope.$on('InitializeVideo', function (event, data) {
		$log.log('InitializeVideo event received, %o', data);

		$scope.client = new Twilio.Video.Client(data.token);

	});

	$scope.$on('ActivateVideo', function (event, data) {

		$log.log('ActivateVideo event received, %o', data);

		$scope.client.connect({ to: data.room }).then(room => {
			$log.log('Connected to Room "%s"', room.name);

			$scope.room = room;

			room.participants.forEach(participant => {
				$log.log('Participant "%s" is connected', participant.identity);
				participant.media.attach('#remote-media');
			});

			room.on('participantDisconnected', participant => {
				$log.log('Participant "%s" disconnected', participant.identity);
				participant.media.detach();
			});

			room.on('disconnected', function () {
				room.localParticipant.media.detach();
				room.participants.forEach(function (participant) {
					participant.media.detach();
				});

				$scope.state = 'CLOSED';
				$timeout(function () {
					$scope.$apply();
				});
			});

		});

	});

}

angular
	.module('callcenterApplication')
	.controller('VideoController', VideoController);