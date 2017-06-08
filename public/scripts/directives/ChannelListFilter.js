function ChannelListFilter() {
  
  return function(list, channels) {
    let friendlyName = '';

    for (let i = 0; i < list.length; i++) {
      
      for (let n = 0; n < channels.length; n++) {

        if(list[i] === channels[n].id) {
          friendlyName += channels[n].friendlyName;
        }

      }

      if(i < (list.length -1)) {
        friendlyName += ', ';
      }

    }    

    return friendlyName;
  };

}

angular
  .module('administrationApplication')
  .filter('ChannelListFilter', ChannelListFilter)