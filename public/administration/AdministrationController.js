var app = angular.module('administrationApplication', ['checklist-model']);

app.controller('AdministrationController', function ($scope, $http, $log) {

  $scope.init = function(){

    $scope.tab = 'agents';

    $scope.channels = {
      phone: 'Phone',
      chat: 'Chat',
      video: 'Video'
    };

    $scope.createForm = false;
    $scope.configuration = null;
    $scope.agent = { channels: []};

    $http.get('/api/setup')

      .then(function onSuccess(response) {

        $scope.configuration = response.data;
        $scope.listWorkers();
        
      }, function onError(response) { 

        alert(response.data);

      });

  };

  $scope.listWorkers = function(){

    $http.get('/api/workers')

      .then(function onSuccess(response) {

        $scope.workers = [];

        response.data.forEach(function(worker) {

        var attributes = JSON.parse(worker.attributes);

        worker.attributes = attributes;

        for (var i = 0; i < $scope.configuration.ivr.options.length; i++) {
          if($scope.configuration.ivr.options[i].id == worker.attributes.team){
            worker.team = $scope.configuration.ivr.options[i].friendlyName;
          }
        }

        worker.channelsFriendlyName = '';

        for (i = 0; i < worker.attributes.channels.length; i++) {
          worker.channelsFriendlyName += $scope.channels[worker.attributes.channels[i]];
          
          if(i < (worker.attributes.channels.length -1)){
            worker.channelsFriendlyName += ', ';
          }

        }    
    
        $scope.workers.push(worker);

      });
      
    }, function onError(response) { 

      alert(response.data);

    });

  };

  $scope.expandAgentCreate = function(){

    $scope.createForm = true;

  };

  $scope.createWorker = function(){

    var attributes = { 
      contact_uri: 'client:' + $scope.agent.friendlyName.toLowerCase(), 
      channels: $scope.agent.channels, 
      team: $scope.agent.team
    };

    var worker =  { 
      friendlyName:  $scope.agent.friendlyName, 
      attributes: JSON.stringify(attributes) 
    };

    $http.post('/api/workers', worker)

      .then(function onSuccess(response) {

        $log.log(response.data);

        $scope.createForm = false;
        $scope.agent = { channels: []};

        $scope.listWorkers();
        
      }, function onError(response) { 

        $log.error(response);
        alert(response.data);

      });

  };

  $scope.removeWorker = function(worker){

    for (var i = 0; i < $scope.workers.length; i++) {

      if($scope.workers[i].sid == worker.sid){            
        $scope.workers.splice(i, 1);    
        break;
      }

    } 

    $http.delete('/api/workers/' + worker.sid);

  };

  $scope.setTab = function (tab) {

    $scope.tab = tab;

  };

  $scope.removeIvrOption = function(array, index) {

    $scope.configuration.ivr.options.splice(index, 1);

  };

  $scope.createIvrOption = function(){

    var option = { friendlyName: 'unknown' };

    $scope.configuration.ivr.options.push(option);
    $scope.createForm = false;

  };

  $scope.saveConfig = function(){

    for (var i = 0; i < $scope.configuration.ivr.options.length; i++) {
      var tmpId = $scope.configuration.ivr.options[i].friendlyName.toLowerCase();

      tmpId = tmpId.replace(/[^a-z0-9 ]/g, '');
      tmpId = tmpId.replace(/[ ]/g, '_');

      $scope.configuration.ivr.options[i].id = tmpId;

    }

    $http.post('/api/setup', { configuration: $scope.configuration })

      .then(function onSuccess(response) {

        $log.log('setup saved');
        $log.log(response.data);
        
      }, function onError(response) { 

        alert(response.data);

      });

  };

}); 