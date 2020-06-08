function LoginController ($scope, $http) {

	$scope.reset = function () {
		$scope.loginForm.$setValidity('notFound', true);
		$scope.loginForm.$setValidity('serverError', true);
	};

	$scope.login = function () {
		var endpointId = navigator.userAgent.toLowerCase() + Math.floor((Math.random() * 1000) + 1);

		$http.post('/api/agents/login', { worker: $scope.worker, endpointId: endpointId })

			.then(function onSuccess (response) {
				window.location.replace('/callcenter/workplace.html');
			}, function onError (response) {

				if (response.status === 404) {
					$scope.loginForm.$setValidity('notFound', false);
				} else {
					$scope.loginForm.$setValidity('serverError', false);
				}

			});

	};

}

angular
	.module('callcenterApplication', ['ngMessages'])
	.controller('LoginController', LoginController);