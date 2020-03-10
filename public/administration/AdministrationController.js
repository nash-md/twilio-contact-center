function AdministrationController ($scope, $http, $log, $q) {
	/* misc configuration data, for instance callerId for outbound calls */
	$scope.configuration;

	/* list of TaskRouter workers */
	$scope.workers = [];

	/* a new agent template */
	$scope.agent = null;

	/* UI */
	$scope.UI = { warning: null, tab: 'agents', isSaving: false, showForm: false };

	$scope.channels = [
		{id: 'phone', friendlyName: 'Phone'},
		{id: 'chat', friendlyName: 'Chat (Web, SMS, Facebook)'},
		{id: 'video', friendlyName: 'Video'}
	];

	let retrieveSetup = function () {
		let deferred = $q.defer();

		$http.get('/api/setup').then(function (response) {
			$scope.configuration = response.data;
			deferred.resolve();
		}, function (response) {
			deferred.reject(response);
		});
		return deferred.promise;

	};

	let retrieveWorkers = function () {
		let deferred = $q.defer();

		$http.get('/api/workers').then(function (response) {
			$scope.workers = [];

			response.data.forEach(function (worker) {
				$scope.workers.push(worker);
			});

			deferred.resolve();
		}, function (response) {
			deferred.reject(response);
		});
		return deferred.promise;

	};

	let createWorker = function (worker) {
		let deferred = $q.defer();

		$http.post('/api/workers', worker).then(function (response) {
			deferred.resolve();
		}, function (response) {
			deferred.reject(response);
		});

		return deferred.promise;

	};

	let deleteWorker = function (worker) {
		let deferred = $q.defer();

		$http.delete('/api/workers/' + worker.sid).then(function (response) {
			deferred.resolve();
		}, function (response) {
			deferred.reject(response);
		});

		return deferred.promise;

	};

	$scope.init = function () {

		$q.all([retrieveSetup(), retrieveWorkers()])
			.then(function (data) {
				$log.log('configuration and worker loaded');
			}).catch(function (error) {
				$scope.UI.warning = error;
				$scope.$apply();
			});

	};

	$scope.showAgentForm = function () {
		$scope.UI.showForm = true;
		if (!$scope.agent) {
			$scope.agent = { channels: []};
		}
	};

	$scope.createAgent = function () {
		$scope.UI.isSaving = true;

		/* create attributes which are used for TaskRouter routing */
		let attributes = {
			contact_uri: 'client:' + $scope.agent.friendlyName,
			channels: $scope.agent.channels,
			team: $scope.agent.team
		};

		/* create the worker JSON entity */
		let worker = {
			friendlyName: $scope.agent.friendlyName,
			attributes: JSON.stringify(attributes)
		};

		createWorker(worker).then(function () {
			return retrieveWorkers();
		}).then(function (data) {
			$log.log('worker successfully created');
			$scope.UI.isSaving = false;
			$scope.UI.showForm = false;
      // reset agent field
			$scope.agent.friendlyName = null;
			$scope.agent.contact_uri = null;
			$scope.agent.team = null;
			$scope.agent.channels = [];
		}).catch(function (error) {
			$scope.UI.warning = error;
			$scope.$apply();
		});

	};

	$scope.deleteAgent = function (worker) {

		for (let i = 0; i < $scope.workers.length; i++) {

			if ($scope.workers[i].sid === worker.sid) {
				$scope.workers.splice(i, 1);
				break;
			}

		}

		deleteWorker(worker)
			.then(function (data) {
				$log.log('worker successfully deleted');
			}).catch(function (error) {
				$scope.UI.warning = error;
				$scope.$apply();
			});

	};

	$scope.showTab = function (name) {
		$scope.UI.tab = name;
	};

	$scope.removeIvrOption = function (array, index) {
		$scope.configuration.ivr.options.splice(index, 1);
	};

	$scope.createIvrOption = function () {
		let option = { friendlyName: 'unknown' };

		$scope.configuration.ivr.options.push(option);
	};

	$scope.saveIvr = function () {
		$scope.UI.isSaving = true;

		for (let i = 0; i < $scope.configuration.ivr.options.length; i++) {
			let tmpId = $scope.configuration.ivr.options[i].friendlyName.toLowerCase();

			tmpId = tmpId.replace(/[^a-z0-9 ]/g, '');
			tmpId = tmpId.replace(/[ ]/g, '_');

			$scope.configuration.ivr.options[i].id = tmpId;
		}

		$http.post('/api/setup', { configuration: $scope.configuration })
			.then(function onSuccess (response) {
				$scope.UI.isSaving = false;
				$scope.$apply();
			}, function (response) {
				$scope.UI.warning = response;
			});

	};

}

angular
	.module('administrationApplication', ['checklist-model', 'client-name', 'convert-to-number'])
	.controller('AdministrationController', AdministrationController);