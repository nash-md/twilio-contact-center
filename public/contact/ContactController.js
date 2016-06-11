var app = angular.module('supportApplication', ['ngMessages']);

app.controller('ContactController', function ($scope, $http, $timeout, $log) {

	$scope.submitted = false;
	$scope.question = { 
		channel: 'phone', 
		phone: null, 
		name: null, 
		text: null, 
		team: null,
		type: null
	};

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
			phone: $scope.question.phone,
			name: $scope.question.name, 
			text: $scope.question.text, 
			team: $scope.question.team,
			type: 'Callback request'
		};

		$http.post('/api/tasks/callback', task)

			.then(function onSuccess(response) {

				$scope.submitted = true;
				$scope.question = { 
					channel: 'phone', 
					phone: null, 
					name: null, 
					text: null,
					team: null,
					type: null
				};

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

app.directive('phoneNumber', function () {

	var pattern = /^\+[0-9]{8,20}$/;

	return {
		require: 'ngModel',
		link: function (scope, element, attrs, ctrl) {

			ctrl.$validators.integer = function (ngModelValue) {
				if(ngModelValue == undefined || ngModelValue == null){
					ctrl.$setValidity('invalidPhone', true);
					return ngModelValue;
				}
				if (pattern.test(ngModelValue) == false) {
					ctrl.$setValidity('invalidPhone', false);
					return ngModelValue;
				}

				ctrl.$setValidity('invalidPhone', true);
				return ngModelValue;

			};
		}
	};
});
