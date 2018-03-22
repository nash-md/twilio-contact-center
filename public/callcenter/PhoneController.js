app.controller('PhoneController', function ($scope, $rootScope, $http, $timeout, $log, $q) {
	$scope.debug = null;
	$scope.phoneNumber = '';
	$scope.connection = null;
	$scope.direction = null;

	$scope.UI = { hold: false, mute: false, state: 'idle'};

	$scope.$on('InitializePhone', function (event, data) {
		$log.log('InitializePhone event received');

		Twilio.Device.setup(data.token, {debug: true });

		Twilio.Device.ready(function (device) {
			$scope.debug = 'Ready';
		});

		Twilio.Device.error(function (error) {
			$scope.debug = 'error: ' + error.code + ' - ' + error.message;
			$scope.reset();
		});

		Twilio.Device.connect(function (connection) {
			$scope.connection = connection;
			$scope.debug = 'successfully established call';
			$scope.UI.state = 'busy';

			$scope.registerConnectionHandler($scope.connection);

			$timeout(function () {
				$scope.$apply();
			});

		});

		Twilio.Device.disconnect(function (connection) {
			$scope.debug = 'call disconnected';
			$scope.reset();
		});

		Twilio.Device.offline(function (device) {
			$scope.debug = 'offline';
			$scope.reset();
		});

		Twilio.Device.incoming(function (connection) {
			$scope.debug = 'incoming connection from ' + connection.parameters.From;
			$scope.UI.state = 'busy';
			$scope.connection = connection;
			$scope.direction = 'inbound';
			$scope.phoneNumber = connection.parameters.From;

			connection.accept();

			connection.disconnect(function (connection) {
				$scope.debug = 'call has ended';
				$scope.reset();
			});

			$scope.registerConnectionHandler($scope.connection);
		});

	});

	$scope.hangUp = function (reservation) {
		$log.info('Phone: hang-up: ' + $scope.UI.hold);

		$timeout(function () {
			Twilio.Device.disconnectAll();
		});

	};

	$scope.reset = function () {
		$scope.UI = { hold: false, mute: false, state: 'idle'};
		$scope.connection = null;
		$scope.direction = null;

		/* clear all connection quality warnings */
		$scope.$emit('HideCallQualityWarning');

		$timeout(function () {
			$scope.$apply();
		});
	};

	$scope.call = function (phoneNumber) {
		$scope.$broadcast('CallPhoneNumber', { phoneNumber: phoneNumber});
	};

	const getConference = function (callSid) {
		var deferred = $q.defer();

		if ($scope.direction === 'outbound') {

			$http.post('/api/phone/call/' + callSid + '/conference')
			.then(function onSuccess (response) {
				deferred.resolve(response.data);
			}).catch(function (error) {
				$log.error(error);
				deferred.reject(error);
			});

		} else {
			deferred.resolve({
				conferenceSid: $scope.$parent.task.attributes.conference.sid,
				callSid: $scope.$parent.task.attributes.conference.participants.customer
			});
		}

		return deferred.promise;
	};

	$scope.toggleHold = function () {
		$scope.UI.hold = !$scope.UI.hold;

		getConference($scope.connection.parameters.CallSid).then(function (payload) {
			const request = {
				conferenceSid: payload.conferenceSid,
				callSid: payload.callSid,
				hold: $scope.UI.hold
			};

			$http.post('/api/phone/hold', request)
				.then(function onSuccess (response) {
					$log.info('Phone: hold: ' + $scope.UI.hold);
				}).catch(function (error) {
					$log.info('Phone: hold failed');
					$log.error(error);
				});

		}).catch(error => {
			console.log(error);
		});

	};

	$scope.toggleMute = function () {
		$scope.UI.mute = !$scope.UI.mute;

		$log.info('Phone: set mute: ' + $scope.UI.mute);

		$scope.connection.mute($scope.UI.mute);
	};

	$scope.addDigit = function (digit) {
		$log.log('Phone: send digit: ' + digit);
		$scope.phoneNumber = $scope.phoneNumber + digit;

		if ($scope.connection) {
			$scope.connection.sendDigits(digit);
		}

	};

	$scope.registerConnectionHandler = function (connection) {
		$log.info('Phone: register connection handler');

		connection.on('warning', function (name) {
			$scope.$emit('ShowCallQualityWarning', { message: `We have detected poor call quality conditions. You may experience degraded call quality. (${name})`});
		});

		connection.on('warning-cleared', function (name) {
			$scope.$emit('HideCallQualityWarning');
		});
	};

	$scope.$on('CallPhoneNumber', function (event, data) {
		$log.log('Phone: call: ' + data.phoneNumber);
		$scope.phoneNumber = data.phoneNumber;
		$scope.direction = 'outbound';

		$scope.connection = Twilio.Device.connect({ phone: data.phoneNumber });
	});

});