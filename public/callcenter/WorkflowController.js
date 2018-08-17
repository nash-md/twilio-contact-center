var app = angular.module('callcenterApplication', ['ngMessages', 'glue.directives']);

app.controller('WorkflowController', function ($scope, $rootScope, $http, $interval, $log, $window, $q) {

	/* misc configuration data, for instance callerId for outbound calls */
	$scope.configuration;

	/* contains task data pushed by the TaskRouter JavaScript SDK */
	$scope.reservation;
	$scope.tasks;

	/* contains worker record received by the Twilio API or the TaskRouter JavaScript SDK */
	$scope.worker;

	/* TaskRouter Worker */
	$scope.workerJS;

	/* UI */
	$scope.UI = { warning: { browser: null, worker: null, phone: null}};

	if ($window.location.protocol !== 'https:') {
		let message =  `Depending on your browser and/or settings capturing audio and video 
										requires a secure (HTTPS) page. The demo may not work.`;
		$scope.UI.warning.browser = message;
	}

	/* request configuration data and tokens from the backend */
	$scope.init = function () {

		$http.get('/api/agents/session')
			.then(function onSuccess (response) {

				/* keep a local copy of the configuration and the worker */
				$scope.configuration = response.data.configuration;

				/* initialize Twilio worker js with token received from the backend */
				$scope.initWorker(response.data.tokens.worker);

				/* initialize Twilio client with token received from the backend */
				$scope.$broadcast('InitializePhone', { token: response.data.tokens.phone});

				/* initialize Twilio Chat client with token received from the backend */
				$scope.$broadcast('InitializeChat', { token: response.data.tokens.chatAndVideo, identity: response.data.worker.friendlyName});

				// initialize Twilio Video client
				$scope.$broadcast('InitializeVideo', { token: response.data.tokens.chatAndVideo });

			}, function onError (response) {
				/* session is not valid anymore */
				if (response.status === 403) {
					window.location.replace('/callcenter/');
				} else {
					$log.error(JSON.stringify(response));
					$scope.UI.warning.worker = JSON.stringify(response);
					$scope.$apply();
				}

			});

		$http.get('/api/taskrouter/activities')
			.then(function (response) {
				$scope.activities = response.data;
			}, function (response) {});

	};

	$scope.initWorker = function (token) {

		/* create TaskRouter Worker */
		$scope.workerJS = new Twilio.TaskRouter.Worker(token, true, $scope.configuration.twilio.workerIdleActivitySid, $scope.configuration.twilio.workerOfflineActivitySid);

		$scope.workerJS.on('ready', function (worker) {

			$log.log('TaskRouter Worker: ready');

			$scope.worker = worker;
			$scope.$apply();

		});

		$scope.workerJS.on('reservation.created', function (reservation) {

			$log.log('TaskRouter Worker: reservation.created');
			$log.log(reservation);

			$scope.reservation = reservation;
			$scope.$apply();

			$scope.startReservationCounter();

		});

		$scope.workerJS.on('reservation.accepted', function (reservation) {

			$log.log('TaskRouter Worker: reservation.accepted');
			$log.log(reservation);

			$scope.task = reservation.task;

			/* check if the customer name is a phone number */
			var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

			if (pattern.test($scope.task.attributes.name) === true) {
				$scope.task.attributes.nameIsPhoneNumber = true;
			}

			$scope.task.completed = false;
			$scope.reservation = null;
			$scope.stopReservationCounter();

			$scope.$apply();

		});

		$scope.workerJS.on('reservation.timeout', function (reservation) {

			$log.log('TaskRouter Worker: reservation.timeout');
			$log.log(reservation);

			/* reset all data */
			$scope.reservation = null;
			$scope.task = null;
			$scope.$apply();

		});

		$scope.workerJS.on('reservation.rescinded', function (reservation) {

			$log.log('TaskRouter Worker: reservation.rescinded');
			$log.log(reservation);

			/* reset all data */
			$scope.reservation = null;
			$scope.task = null;
			$scope.$apply();

		});

		$scope.workerJS.on('reservation.canceled', function (reservation) {

			$log.log('TaskRouter Worker: reservation.cancelled');
			$log.log(reservation);

			$scope.reservation = null;
			$scope.task = null;
			$scope.$apply();

		});

		$scope.workerJS.on('activity.update', function (worker) {

			$log.log('TaskRouter Worker: activity.update');
			$log.log(worker);

			$scope.worker = worker;
			$scope.$apply();

		});

		$scope.workerJS.on('token.expired', function () {

			$log.log('TaskRouter Worker: token.expired');

			$scope.reservation = null;
			$scope.task = null;
			$scope.$apply();

			/* the worker token expired, the agent shoud log in again, token is generated upon log in */
			window.location.replace('/callcenter/');

		});

		/* the agent's browser lost the connection to Twilio */
		$scope.workerJS.on('connected', function () {
			$log.log('TaskRouter Worker: WebSocket has connected');
			$scope.UI.warning.worker = null;
			$scope.$apply();
		});

		$scope.workerJS.on('disconnected', function () {
			$log.error('TaskRouter Worker: WebSocket has disconnected');
			$scope.UI.warning.worker = 'TaskRouter Worker: WebSocket has disconnected';
			$scope.$apply();
		});

		$scope.workerJS.on('error', function (error) {
			$log.error('TaskRouter Worker: an error occurred: ' + error.response + ' with message: ' + error.message);
			$scope.UI.warning.worker = 'TaskRouter Worker: an error occured: ' + error.response + ' with message: ' + error.message;
			$scope.$apply();
		});

	};

	$scope.acceptReservation = function (reservation) {

		$log.log('accept reservation with TaskRouter Worker JavaScript SDK');

		/* depending on the typ of taks that was created we handle the reservation differently */
		if (reservation.task.attributes.channel === 'video') {

			reservation.accept(

				function (err, reservation) {

					if (err) {
						$log.error(err);
						return;
					}

					$scope.$broadcast('ActivateVideo', { roomName: reservation.task.attributes.roomName });

				});

		}

		if (reservation.task.attributes.channel === 'chat') {

			reservation.accept(

				function (err, reservation) {

					if (err) {
						$log.error(err);
						return;
					}

					$scope.$broadcast('ActivateChat', { channelSid: reservation.task.attributes.channelSid });

				});

		}

		if (reservation.task.attributes.channel === 'phone' && reservation.task.attributes.type === 'inbound_call') {

			$log.log('dequeue reservation with  callerId: ' + $scope.configuration.twilio.callerId);
			reservation.conference($scope.configuration.twilio.callerId, undefined, undefined, function (err, reservation) {

				if (err) {
					$log.error(err);
					return;
				}

			});

		}

		/* we accept the reservation and initiate a call to the customer's phone number */
		if (reservation.task.attributes.channel === 'phone' && reservation.task.attributes.type === 'callback_request') {

			reservation.accept(

				function (err, reservation) {

					if (err) {
						$log.error(err);
						return;
					}

					$scope.$broadcast('CallPhoneNumber', { phoneNumber: reservation.task.attributes.phone });

				});
		}
	};

	$scope.complete = function (reservation) {

		switch ($scope.task.attributes.channel) {
		case 'video':
			$scope.$broadcast('DestroyVideo');
			break;
		case 'chat':
			$scope.$broadcast('DestroyChat');
			break;
		default:
		// do nothing
		}

		$scope.workerJS.completeTask($scope.task.sid, function (error, completedTask) {
			if (error) {
				$log.error(error.code);
				$log.error(error.message);
				return;
			}
			$log.log('Completed Task: ' + completedTask.assignmentStatus);

		});

		$scope.workerJS.update('ActivitySid', $scope.configuration.twilio.workerIdleActivitySid, function (err, worker) {

			if (err) {
				$log.error(err);
				return;
			}

			$scope.reservation = null;
			$scope.task = null;
			$scope.$apply();

		});

	};

	$scope.callPhoneNumber = function (phoneNumber) {
		$rootScope.$broadcast('CallPhoneNumber', { phoneNumber: phoneNumber });
	};

	$scope.$on('ShowCallQualityWarning', function (event, data) {
		$log.log('event: ShowCallQualityWarning');
		$scope.UI.warning.phone = data.message;
		$scope.$apply();
	});

	$scope.$on('HideCallQualityWarning', function (event, data) {
		$log.log('event: HideCallQualityWarning');
		$scope.UI.warning.phone = null;
		$scope.$apply();
	});

	$scope.logout = function () {

		$http.post('/api/agents/logout')
			.then(function onSuccess (response) {
				window.location.replace('/callcenter/index.html');
			}, function onError (response) {
				$log.error(response);
			});

	};

	$scope.startReservationCounter = function () {

		$log.log('start reservation counter');
		$scope.reservationCounter = $scope.reservation.task.age;

		$scope.reservationInterval = $interval(function () {
			$scope.reservationCounter++;
		}, 1000);

	};

	$scope.stopReservationCounter = function () {

		if (angular.isDefined($scope.reservationInterval)) {
			$interval.cancel($scope.reservationInterval);
			$scope.reservationInterval = undefined;
		}

	};

	$scope.updateActivity = function () {
		$scope.workerJS.update('ActivitySid', $scope.worker.selectedActivitySid, function (error, worker) {
			if (error) {
				console.log(error.code);
				console.log(error.message);
			} else {
				console.log(worker.activityName);
			}
		});
	};
});