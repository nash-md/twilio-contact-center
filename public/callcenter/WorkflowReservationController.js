function WorkflowReservationController ($scope, $rootScope, $timeout, $interval, $log) {

	/* contains task data pushed by the TaskRouter JavaScript SDK */
	$scope.reservation;
	$scope.counter;
	$scope.counterInterval;

	$scope.$on('InitializeReservation', function (event, data) {
		$log.log('InitializeReservation event received, %o', data);
		$scope.reservation = data.reservation;

		$scope.startCounter();
	});

	$scope.$on('DestroyReservation', function (event) {
		$log.log('DestroyReservation event received');
		$scope.reservation = null;
	});

	$scope.startCounter = function () {
		$scope.counter = $scope.reservation.task.age;

		$scope.counterInterval = $interval(function () {
			$scope.counter++;
		}, 1000);

	};

	$scope.stopCounter = function () {

		if (angular.isDefined($scope.counterInterval)) {
			$interval.cancel($scope.counterInterval);
			$scope.counter = null;
			$scope.counterInterval = undefined;
		}

	};

	$scope.accept = function (reservation) {
		$log.log('accept reservation with TaskRouter Worker JavaScript SDK');

		/* depending on the typ of taks that was created we handle the reservation differently */
		if (reservation.task.attributes.channel === 'video') {

			reservation.accept(

				function (error, reservation) {

					if (error) {
						$log.error(error);
						return;
					}

					$rootScope.$broadcast('ActivateVideo', { roomName: reservation.task.attributes.roomName });

				});

		}

		if (reservation.task.attributes.channel === 'chat') {

			reservation.accept(

				function (error, reservation) {

					if (error) {
						$log.error(error);
						return;
					}

					$rootScope.$broadcast('ActivateChat', { channelSid: reservation.task.attributes.channelSid });

				});

		}

		if (reservation.task.attributes.channel === 'phone' && reservation.task.attributes.type === 'inbound_call') {

			reservation.conference($scope.configuration.twilio.callerId, undefined, undefined, undefined, function (error, reservation) {

				if (error) {
					$log.error(error);
					return;
				}

			}, { 'EndConferenceOnExit': 'true' });

		}

		/* we accept the reservation and initiate a call to the customer's phone number */
		if (reservation.task.attributes.channel === 'phone' && reservation.task.attributes.type === 'callback_request') {

			reservation.accept(

				function (error, reservation) {

					if (error) {
						$log.error(error);
						return;
					}

					$rootScope.$broadcast('CallPhoneNumber', { phoneNumber: reservation.task.attributes.phone });

				});
		}
	};

}

angular
	.module('callcenterApplication')
	.controller('WorkflowReservationController', WorkflowReservationController);