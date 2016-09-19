var app = angular.module('setupApplication', ['ngMessages']);

app.controller('SetupController', function ($scope, $http, $q) {
  
  $scope.phoneNumber    = { isValid: true, message: null, code: null};
  $scope.isSaving       = false;
  $scope.configuration  = null;
  $scope.workspace      = null;
  $scope.activities     = [];

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
        deferred.reject('The application could not access the your Twilio TaskRouter workspace activities please verify the Workspace Sid.');
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
    $scope.phoneNumber.isValid = true;
    $scope.isSaving = true;

    var verifyPhoneNumber = function() {
      var deferred = $q.defer();

      $http.post('/api/validate/phone-number', { callerId: $scope.configuration.twilio.callerId }).then(function(response){
        deferred.resolve(response.data);
      }, function(error) {
        deferred.reject(error);
      });

      return deferred.promise;

    };

    var saveConfiguration = function(sid, configuration) {
      var deferred = $q.defer();

      $http.post('/api/setup', { sid: sid, configuration: configuration }).then(function(response){
        deferred.resolve();
      }, function(error) {
        deferred.reject(error);
      });

      return deferred.promise;

    };

    /* verify phone number and save configuration */
    verifyPhoneNumber().then(function(phoneNumber){

      return saveConfiguration(phoneNumber.sid, $scope.configuration).then(function(){
        $scope.isSaving = false;
        $scope.phoneNumber = { isValid: true, message: null, code: null};
      });

    }).catch(function(error) {
      $scope.phoneNumber.isValid = false;
      $scope.phoneNumber.code = error.data.code;
      $scope.phoneNumber.message = error.data.message;
      $scope.isSaving = false;
    });

  };

});  
