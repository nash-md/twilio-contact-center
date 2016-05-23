app.controller('ChatController', function ($scope, $rootScope, $http, $sce, $compile) {

  $scope.message = null;
  $scope.channel;
  $scope.messages = [];
  $scope.session = { token: null, identity: null, isInitialized: false, isLoading: false };
  
  $scope.$on('DestroyChat', function(event) { 

    console.log('DestroyChat event received');
    
    $scope.message = null;
    $scope.channel.leave();
    $scope.session.isInitialized = false;

  });

  $scope.$on('InitializeChat', function(event, data) { 

    console.log('InitializeChat event received');
    console.log(data);

    /* clean up  */
    $scope.message = null;
    $scope.channel = null
    $scope.messages = []
    $scope.session = { token: null, identity: null, isInitialized: false, isLoading: false };

    $scope.session.token = data.token;
    $scope.session.identity = data.identity;
        
  });      

  $scope.$on('ActivateChat', function(event, data) { 

    console.log('ActivateChat event received');
    console.log(data);

    $scope.session.channelSid = data.channelSid;

    $scope.session.isLoading = true;
    $scope.setupClient($scope.session.channelSid);

  });

  $scope.setupClient = function(channelSid){

    console.log('setup channel: ' + channelSid);
    accessManager = new Twilio.AccessManager($scope.session.token); 
    messagingClient = new Twilio.IPMessaging.Client(accessManager);

    var promise = messagingClient.getChannelBySid(channelSid);

    promise.then(function(channel) {
      console.log('channel is: ' + channel.uniqueName);
      $scope.setupChannel(channel);
    });

  }

  $scope.setupChannel = function(channel){

    channel.join().then(function(member) {

        $scope.messages.push({
          body: 'You are now connected to the customer',
          author: 'System'
        });

         /* use now joined the channel, display canvas */
        $scope.session.isInitialized = true;
        $scope.session.isLoading = false;

        $scope.$apply();
    });

    channel.on('messageAdded', function(message) {

        var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

        var m = message.body;

        if (pattern.test(message.body) == true) {
          var m = message.body.replace(pattern, "<p>$1<span class=\"chat-inline-number\" ng-click=\"callInlineNumber($2)\">$2</span>$3</p>");
        } 

        $scope.messages.push({body: m, author: message.author, timestamp: message.timestamp});
        $scope.$apply();

    });

    channel.on('memberJoined', function(member) {

      $scope.messages.push({
          body: member.identity + ' has joined the channel.',
          author: 'System'
        });
        $scope.$apply();

    });

    channel.on('memberLeft', function(member) {

       $scope.messages.push({
          body: member.identity + ' has left the channel.',
          author: 'System'
        });
        $scope.$apply();

    });

    channel.on('typingStarted', function(member) {
       console.log(member.identity + ' started typing');
       $scope.typingNotification = member.identity + ' is typing ...';
       $scope.$apply();
    });

    channel.on('typingEnded', function(member) {
      console.log(member.identity + ' stopped typing');
      $scope.typingNotification = '';
      $scope.$apply();
    });

    $scope.channel = channel;

  }

  $scope.$watch('message', function(newValue, oldValue) {
    if($scope.channel){
      console.log('send typing notification to channel');
      $scope.channel.typing();
    }    
  });

  $scope.send = function(){
    $scope.channel.sendMessage($scope.message)
    $scope.message = '';
  }

  $scope.callInlineNumber = function(phone){
    console.log('call inline number ' + phone)
     $rootScope.$broadcast('CallPhoneNumber', { phoneNumber: phone });
  }

});

/* this is a demo, please don't do that in production */
app.filter('unsafe', function($sce) { return $sce.trustAsHtml; });

app.directive('dynamic', function ($compile) {
  return {
    restrict: 'A',
    replace: true,
    link: function (scope, ele, attrs) {
      scope.$watch(attrs.dynamic, function(html) {
        ele.html(html);
        $compile(ele.contents())(scope);
      });
    }
  };
});

app.filter('timeChat', function() {

  return function(value) {
    return moment(value).format('LTS')
  }

});

