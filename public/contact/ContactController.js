var app = angular.module('supportApplication', ['ngMessages']);

app.controller('ContactController', function ($scope, $http, $timeout, $log) {

	$scope.submitted = false;
	$scope.question = { };

	$scope.init = function(){

		$http.get('/api/setup')
			.then(function onSuccess(response) {
				$scope.configuration = response.data;
			}, function onError(response) { 
				$log.error('error loading configuration');
				$log.error(response);
			});

	};        

	$scope.submit = function(){

		var task = { 
			channel: 'phone',
			type: 'callback_request',
			phone: $scope.question.phone,
			name: $scope.question.name, 
			text: $scope.question.text, 
			team: $scope.question.team,
			title: 'Callback request'
		};

		$http.post('/api/tasks/callback', task)

			.then(function onSuccess(response) {

				$scope.submitted = true;
				$scope.question = { };

				$scope.supportForm.$setUntouched();
				
				$timeout(function(){
					$scope.submitted = false;
				}, 6000);
				
			}, function onError(response) { 

				$log('error creating task');
				$log(response);

			});

	};

});
