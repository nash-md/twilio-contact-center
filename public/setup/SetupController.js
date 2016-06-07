var app = angular.module('setupApplication', ['ui.bootstrap', 'ngMessages']);

app.controller('SetupController', function ($scope, $http) {

  $scope.isSaving = false;

  $scope.init = function(){

    $scope.workspace;
    $scope.activities;

    $scope.workerOfflineActivity;
    $scope.workerIdleActivity;

    $http.get('/api/setup', null).success(function(data, status){

      $scope.configuration = data;

      $http.get('/api/setup/activities', null).success(function(data, status){

        $scope.activities = data;
        
        // FIXME
        for (i = 0; i < $scope.activities.length; i++) {
          
          if($scope.activities[i].sid == $scope.configuration.twilio.workerIdleActivitySid){
            $scope.workerIdleActivity = $scope.activities[i];
          }

          if($scope.activities[i].sid == $scope.configuration.twilio.workerOfflineActivitySid){
            $scope.workerOfflineActivity = $scope.activities[i];
          }

          if($scope.activities[i].sid == $scope.configuration.twilio.workerReservationActivitySid){
            $scope.workerReservationActivity = $scope.activities[i];
          }

           if($scope.activities[i].sid == $scope.configuration.twilio.workerAssignmentActivitySid){
            $scope.workerAssignmentActivity = $scope.activities[i];
          }

        }

      });  

    });

    $http.get('/api/setup/workspace', null).success(function(data, status){

      $scope.workspace = data;

    });

  }
  
  $scope.setOfflineActivity = function (activity) {

    $scope.workerOfflineActivity = activity;
    $scope.configuration.twilio.workerOfflineActivitySid = activity.sid;

  }

  $scope.setIdleActivity = function (activity) {

    $scope.workerIdleActivity = activity;
    $scope.configuration.twilio.workerIdleActivitySid = activity.sid;

  }

  $scope.setReservationActivity = function (activity) {

    $scope.workerReservationActivity = activity;
    $scope.configuration.twilio.workerReservationActivitySid = activity.sid;

  }

  $scope.setAssignmentActivity = function (activity) {

    $scope.workerAssignmentActivity = activity;
    $scope.configuration.twilio.workerAssignmentActivitySid = activity.sid;

  }

  $scope.saveConfig = function(){

    $scope.isSaving = true;

    $http.post('/api/setup', { configuration: $scope.configuration })

      .then(function onSuccess(response) {

        $scope.isSaving = false;
 
      }, function onError(response) { 

        $scope.isSaving = false;

        alert('Error: ' +  response.data.message);

      });

  }

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
