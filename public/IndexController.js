var app = angular.module('indexApplication', []);

app.controller('IndexController', function ($scope, $http) {

  $scope.setup;
  $scope.code;

  $scope.validateSetup = function(){

    $http.get('/api/setup/validate')

      .then(function onSuccess(response) {

        $scope.setup = 'VALID';
        $scope.code = null;

      }, function onError(response) { 

        $scope.setup = 'INVALID';
        $scope.code = response.data.code;

      });

  };

});
