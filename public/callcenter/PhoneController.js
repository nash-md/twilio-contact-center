app.controller('PhoneController', function ($scope, $rootScope, $http, $timeout, $log, $q) {
	$scope.debug = null;
	$scope.phoneNumber = '';
	$scope.connection = null;
	$scope.direction = null;
	$scope.transfer = {
		workers: [],
		to: null,
		isLoading: false
	};
	$scope.devices = {
		available: { input: [], output: [] },
		selected: { input: null, output: null }
	};

	$scope.UI = { devices: false, hold: false, mute: false, transfer: false, state: 'idle'};

	$scope.$on('InitializePhone', function (event, data) {
		$log.log('InitializePhone event received');

		Twilio.Device.setup(data.token, {
			debug: true, 
			codecPreferences: ['opus', 'pcmu']
		});

		Twilio.Device.ready(function (device) {
			$scope.debug = 'Ready';

			$timeout(function () {
				$scope.$apply();
			});
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
		/*
		Twilio.Device.audio.on('deviceChange', (lostActiveDevices) => {
			$log.error('active device lost: ')
			$log.error(lostActiveDevices)
		})
*/
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

			$http.get('/api/phone/call/' + callSid + '/conference')
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

	$scope.transfer = function () {
		$scope.transfer.isLoading = true;

		getConference($scope.connection.parameters.CallSid).then(function (payload) {
			const request = {
				to: $scope.transfer.to
			};

			$scope.transfer.to = null;

			$http.post(`/api/phone/transfer/${payload.callSid}`, request)
				.then(function onSuccess (response) {
					$log.info('Phone: transfer: ' + $scope.UI.transfer);
					$scope.transfer.isLoading = false;
					$scope.UI.transfer = false;
					$scope.transfer.workers = [];
					$scope.transfer.to = null;

					$timeout(function () {
						Twilio.Device.disconnectAll();
					});

				}).catch(function (error) {
					$log.info('Phone: transfer failed');
					$log.error(error);
				});

		}).catch(error => {
			$log.error(error);
		});

	};

	$scope.toggleTransferPanel = function () {
		$scope.UI.transfer = !$scope.UI.transfer;

		if ($scope.UI.transfer) {
			$scope.transfer.isLoading = true;

			$http.get('/api/phone/transfer/available-workers').then(function (response) {
				$scope.transfer.workers = response.data;
				$scope.transfer.isLoading = false;

				/* always select the first worker */
				if ($scope.transfer.workers[0]) {
					$scope.transfer.to = $scope.transfer.workers[0].sid;
				}
			}, function (error) {
				$log.error(error);
			});
		} else {
			$scope.transfer.workers = [];
		}

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
			$log.error(error);
		});

	};

	$scope.toggleMute = function () {
		$scope.UI.mute = !$scope.UI.mute;

		$log.info('Phone: set mute: ' + $scope.UI.mute);

		$scope.connection.mute($scope.UI.mute);
	};

	/**
	 * Prompts the user for access to audio devices
	 * Currently only tested on Chrome v. 68.0.3440.106
	 */
	$scope.unknownDevices = function () {
		navigator.mediaDevices.getUserMedia({audio: true});
	};

	/**
	 * Checks for Chrome, Firefox, and Safari
	 * The prompt works on OSX Chrome, Firefox, Safari, and iOS Safari (not iOS Chrome)
	 * @returns {boolean}
	 */
	$scope.showAudioPrompt = function () {
		var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
		var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
		var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

		return isChrome || (isFirefox || isSafari);
	};

	$scope.toggleAudioDevicePanel = function () {
		$scope.UI.devices = !$scope.UI.devices;

		$scope.devices.available.output = [];
		$scope.devices.available.input = [];

		Twilio.Device.audio.availableOutputDevices.forEach(function (device, id) {
			$log.info(`Available Output Device: ${id} - label '${device.label}'`);
			$scope.devices.available.output.push({id: id, label: device.label});
		});

		Twilio.Device.audio.availableInputDevices.forEach(function (device, id) {
			$log.info(`Available Input Device: ${id} - label '${device.label}'`);
			$scope.devices.available.input.push({id: id, label: device.label});
		});

	};

	$scope.selectInputDevice = function (id) {
		$log.info(`Audio Device: ${id} - selected`);

		Twilio.Device.audio.setInputDevice(id).then(function () {
			$log.info(`Twilio Device: ${id} successfully set`);
		}).catch((error) => {
			$log.error(error);
		});
	};

	$scope.selectOutputDevice = function (id) {
		$log.info(`Audio Device: ${id} - selected`);

		Twilio.Device.audio.speakerDevices.set(id).then(function () {
			$log.info(`Twilio Device: ${id} successfully set`);
		}).catch((error) => {
			$log.error(error);
		});

		Twilio.Device.audio.ringtoneDevices.set(id).then(function () {
			$log.info(`Twilio Device: ${id} successfully set`);
		}).catch((error) => {
			$log.error(error);
		});
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