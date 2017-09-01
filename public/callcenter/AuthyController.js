app.controller('AuthyModalController', function ($scope, $uibModalInstance, $interval, $http, $log, verified, orig_pn) {

	/* polling id for checking the Authy OneTouch Status */
	$scope.pollingID = null;

	/* UI bits */
	$scope.sms = false;
	$scope.auth = false;
	$scope.register = false;

	/* PhoneVerification OTP */
	$scope.opt = '';

	/* Authy SoftToken */
	$scope.token = '';
	$scope.verified = verified;
	$scope.lookup = {};
	$scope.authyId = 0;

	/* original E164 number */
	$scope.orig_pn = orig_pn;

	$scope.ok = function () {
		$uibModalInstance.close($scope.selected.item);
	};

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.requestVerify = function () {

		$scope.otp = '';
		$http.post('/api/verify/request', {'cc': $scope.lookup.cc, 'pn': $scope.lookup.national_format})
			.then(function onSuccess (response) {
				$log.log('OTP request successfully executed ', response);
			}, function onError (response) {
				$log.error(response);
			});
	};

	$scope.otpVerify = function () {

		$http.post('/api/verify/otp', {'cc': $scope.lookup.cc, 'pn': $scope.lookup.national_format, 'otp': $scope.otp})
			.then(function onSuccess (response) {
				$scope.opt = '';
				$scope.verified = true;
				verifiedDone();
			}, function onError (error) {
				$log.error(error);
			});
	};

	function executeLookup () {
		$http.post('/api/lookup', {'pn': $scope.orig_pn})
			.then(function onSuccess (response) {
				// removing national number formatting
				const authyNumber = response.data.national_format.replace(/\D+/g, '');
				$scope.lookup = response.data;
				$scope.lookup.national_format = authyNumber;
				$scope.lookup.email = '';
			}, function onError (error) {
				$log.error(error);
			});
	}

	$scope.registerAuthyUser = function () {
		$http.post('/api/authy/register', {
			'cc': $scope.lookup.cc,
			'pn': $scope.lookup.national_format,
			'email': $scope.lookup.email
		}).then(function onSuccess (response) {
			$scope.authyId = response.data.authyId;
			$scope.sms = false;
			$scope.register = false;
			$scope.authy = true;
		}, function onError (error) {
			$log.error(error);
		});
	};

	/**
	 * Polling against OneTouch UUID
	 */
	function checkOneTouchStatus () {
		$http.post('/api/onetouch/status', {
			'uuid': $scope.uuid
		}).then(function onSuccess (response) {
			if (response.data.response.status === 'approved') {
				$interval.cancel($scope.pollingID);
				$scope.verified = true;
				verifiedDone();
			}
		}, function onError (error) {
			$log.error(error);
		});
	}

	$scope.startOneTouch = function () {
		$scope.verified = false;
		$http.post('/api/onetouch/start', {
			'authyId': $scope.authyId
		}).then(function onSuccess (response) {
			$scope.pollingID = $interval(checkOneTouchStatus, 4000, 30);
			$scope.uuid = response.data.uuid;
		}, function onError (error) {
			$log.error(error);
		});
	};

	$scope.softTokenVerify = function () {

		$http.post('/api/authy/verify', {'authyId': $scope.authyId, 'token': $scope.token})
			.then(function onSuccess (response) {
				$scope.token = '';
				$scope.verified = true;
				verifiedDone();
			}, function onError (error) {
				$log.error(error);
			});
	};

	$scope.ok = verifiedDone;

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	};

	function verifiedDone () {
		$uibModalInstance.close($scope.verified);
	}

	/* Take the caller phone number and do a lookup to get the country code and nationally formatted number */
	executeLookup();
});
