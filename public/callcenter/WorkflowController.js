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
	$scope.UI = { warning: { browser: null, worker: null, phone: null } };
	$scope.UI.isOnQueue = false;

	if ($window.location.protocol !== 'https:') {
		let message = `Depending on your browser and/or settings capturing audio and video 
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
				$scope.$broadcast('InitializePhone', { token: response.data.tokens.access });

				/* initialize Twilio Chat client with token received from the backend */
				$scope.$broadcast('InitializeChat', { token: response.data.tokens.access, identity: response.data.worker.friendlyName });

				// initialize Twilio Video client
				$scope.$broadcast('InitializeVideo', { token: response.data.tokens.access });

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

	};

	$scope.initWorker = function (token) {

		/* create TaskRouter Worker */
		$scope.workerJS = new Twilio.TaskRouter.Worker(token, true, $scope.configuration.twilio.workerOfflineActivitySid, $scope.configuration.twilio.workerOfflineActivitySid);

		$scope.workerJS.on('ready', function (worker) {
			$log.log(`TaskRouter Worker: ${worker.sid} - "${worker.friendlyName}" is ready`);

			$scope.worker = worker;
			$scope.$apply();
		});

		$scope.workerJS.on('reservation.created', function (reservation) {
			$log.log('TaskRouter Worker: reservation.created');
			$log.log(reservation);

			$scope.reservation = reservation;

			$scope.$broadcast('InitializeReservation', { reservation: reservation });
			$scope.$apply();
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

			$scope.$broadcast('DestroyReservation');
		});

		$scope.workerJS.on('reservation.timeout', function (reservation) {
			$log.log('TaskRouter Worker: reservation.timeout');
			$scope.resetWorkspace();
		});

		$scope.workerJS.on('reservation.rescinded', function (reservation) {
			$log.log('TaskRouter Worker: reservation.rescinded');
			$scope.resetWorkspace();
		});

		$scope.workerJS.on('reservation.canceled', function (reservation) {
			$log.log('TaskRouter Worker: reservation.cancelled');
			$scope.resetWorkspace();
		});

		$scope.workerJS.on('reservation.rejected', function (reservation) {
			$log.log('TaskRouter Worker: reservation.rejected');
			$scope.resetWorkspace();
		});

		$scope.workerJS.on('task.completed', function (reservation) {
			$log.log('TaskRouter Worker: task.completed');
			$scope.resetWorkspace();
		});

		$scope.workerJS.on('activity.update', function (worker) {
			$log.log(`TaskRouter Worker: activity.update, new activity is ${worker.activitySid} - "${worker.activityName}"`);

			$scope.worker = worker;
			$scope.$apply();
		});

		$scope.workerJS.on('token.expired', function () {
			$log.log('TaskRouter Worker: token.expired');

			/* the worker token expired, the agent shoud log in again, token is generated upon log in */
			window.location.replace('/callcenter/');
		});

		/* the agent's browser conntected to Twilio */
		$scope.workerJS.on('connected', function () {
			$log.log('TaskRouter Worker: WebSocket has connected');
			$scope.UI.warning.worker = null;
			$scope.$apply();
		});

		/* the agent's browser lost the connection to Twilio */
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

	$scope.complete = function () {

		$scope.workerJS.completeTask($scope.task.sid, function (error, task) {
			if (error) {
				$log.error(error);
				return;
			}

			$log.log(`TaskRouter Worker: Completed Task: ${task.sid}`);
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

	$scope.toggleIsOnQueue = function () {
		const activitySid = $scope.UI.isOnQueue ? $scope.configuration.twilio.workerAvailableActivitySid : $scope.configuration.twilio.workerUnavailableActivitySid;

		console.log(`toogle to activitySid ${activitySid}`);

		$scope.updateActivity(!$scope.UI.isOnQueue, activitySid, function (error) {
			if (error) {
				$log.error(error);
			}
		});

	};

	$scope.updateActivity = function (isOnQueue, activitySid, callback) {
		const payload = {
			'ActivitySid': activitySid
		};

		if (isOnQueue) {
			payload.RejectPendingReservations = true;
		}

		$scope.workerJS.update(payload, function (error, worker) {
			callback(error);
		});
	};

	$scope.resetWorkspace = function () {
		$scope.reservation = null;
		$scope.task = null;

		$scope.$broadcast('DestroyReservation');
		$scope.$broadcast('DestroyVideo');
		$scope.$broadcast('DestroyChat');

		$scope.$apply();
	};
});