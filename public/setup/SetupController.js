var app = angular.module('setupApplication', ['ngMessages', 'phone-number', 'convert-to-boolean']);

app.controller('SetupController', function ($scope, $http, $timeout, $q) {
	$scope.phoneNumber    = { isValid: true, message: null, code: null};
	$scope.configuration  = null;
	$scope.workspace      = null;
	$scope.activities     = [];

	/* UI */
	$scope.UI = { warning: null, isSaving: false, error: null, isSaved: false };

	$scope.init = function () {

		var retrieveSetup = function () {
			var deferred = $q.defer();

			$http.get('/api/setup').then(function (response) {
				$scope.configuration = response.data;
				deferred.resolve();
			}, function (response) {
				deferred.reject('The application could not access the configuration');
			});

			return deferred.promise;
		};

		var retrieveActivities = function () {
			var deferred = $q.defer();

			$http.get('/api/taskrouter/activities').then(function (response) {
				$scope.activities = response.data;
				deferred.resolve();
			}, function (response) {
				deferred.reject('The application could not access the your Twilio TaskRouter workspace activities please verify the Workspace Sid.');
			});

			return deferred.promise;
		};

		var retrieveWorkspace = function () {
			var deferred = $q.defer();

			$http.get('/api/taskrouter/workspace').then(function (response) {
				$scope.workspace = response.data;
				deferred.resolve();
			}, function (response) {
				deferred.reject('The application could not access the your Twilio Taskrouter workspace please verify the Workspace Sid.');
			});

			return deferred.promise;
		};

		$q.all([retrieveSetup(), retrieveActivities(), retrieveWorkspace()])
			.then(function (data) {})
			.catch(function (error) {
				$scope.UI.warning = error;
			});

	};

	$scope.saveConfig = function () {
		$scope.phoneNumber.isValid = true;
		$scope.UI.isSaving = true;
		$scope.UI.isSaved = false;
		$scope.UI.warning = null;

		var verifyPhoneNumber = function () {
			var deferred = $q.defer();

			$http.post('/api/setup/phone-number/validate', { callerId: $scope.configuration.twilio.callerId })
				.then(function (response) {
					deferred.resolve(response.data);
				}, function (error) {
					deferred.reject(error);
				});

			return deferred.promise;
		};

		var setupPhonenumber = function (sid, configuration) {
			var deferred = $q.defer();

			$http.post('/api/setup/phone-number', { sid: sid }).then(function (response) {
				deferred.resolve();
			}, function (error) {
				deferred.reject(error);
			});

			return deferred.promise;
		};

		var saveConfiguration = function (sid, configuration) {
			var deferred = $q.defer();

			$http.post('/api/setup', { sid: sid, configuration: configuration }).then(function (response) {
				deferred.resolve();
			}, function (error) {
				deferred.reject(error);
			});

			return deferred.promise;
		};

		/* verify phone number and save configuration */
		verifyPhoneNumber().then(function (phoneNumber) {

			return setupPhonenumber(phoneNumber.sid).then(function () {
				return saveConfiguration(phoneNumber.sid, $scope.configuration);
			}).then(function () {
				$scope.UI.isSaving = false;
				$scope.UI.isSaved = true;

				$timeout(function () {
					$scope.$apply();
				});

			}).catch(function (error) {
				$scope.UI.warning = error.data;
				$scope.UI.isSaving = false;
				console.log(error);

				$timeout(function () {
					$scope.$apply();
				});
			});

		}).catch(function (error) {
			$scope.phoneNumber.isValid = false;
			$scope.phoneNumber.code = error.data.code;
			$scope.phoneNumber.message = error.data.message;
			$scope.UI.isSaving = false;

			$timeout(function () {
				$scope.$apply();
			});
		});

	};

});
