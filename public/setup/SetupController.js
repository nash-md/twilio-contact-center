var app = angular.module('setupApplication', ['ngMessages']);

app.controller('SetupController', function ($scope, $http, $q) {

  $scope.isSaving = false;
  $scope.configuration = null;
  $scope.workspace = null;
  $scope.activities = [];

  $scope.init = function(){

    var retrieveSetup = function() {

      var deferred = $q.defer();

      $http.get('/api/setup').then(function(response){
        $scope.configuration = response.data;
        deferred.resolve();
      }, function(response) {
        deferred.reject('The application could not access the configuration');
      });
      return deferred.promise;

    };

    var retrieveActivities = function() {

      var deferred = $q.defer();

      $http.get('/api/setup/activities').then(function(response){
        $scope.activities = response.data;
        deferred.resolve();
      }, function(response) {
        deferred.reject('The application could not access the your Twilio Taskrouter workspace activities please verify the Workspace Sid.');
      });
      return deferred.promise;

    };

    var retrieveWorkspace = function() {

      var deferred = $q.defer();

      $http.get('/api/setup/workspace').then(function(response){
        $scope.workspace = response.data;
        deferred.resolve();
      }, function(response) {
        deferred.reject('The application could not access the your Twilio Taskrouter workspace please verify the Workspace Sid.');
      });
      return deferred.promise;

    };

    $q.all([retrieveSetup(), retrieveActivities(), retrieveWorkspace()])
      .then(function(data) {})
      .catch(function(err) {
        alert(err);
      });

  };
  
  $scope.saveConfig = function(){

    $scope.isSaving = true;

    $http.post('/api/setup', { configuration: $scope.configuration })

      .then(function onSuccess(response) {
        $scope.isSaving = false;
      }, function onError(response) { 
        $scope.isSaving = false;
        alert('Error: ' +  response.data.message);
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
