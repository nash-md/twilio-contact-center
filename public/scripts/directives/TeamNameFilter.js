function TeamName() {
  
  return function(value, configuration) {

    for (let i = 0; i < configuration.ivr.options.length; i++) {

      if(configuration.ivr.options[i].id === value){
        return configuration.ivr.options[i].friendlyName;
      }

    }

  };

}

angular
  .module('administrationApplication')
  .filter('TeamName', TeamName)