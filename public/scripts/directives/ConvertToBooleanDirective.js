angular.module('convert-to-boolean', [])
  .directive('convertToBoolean', ['$parse', '$compile', function($parse, $compile) {

    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {

        ngModel.$parsers.push(function(value) {
          return (value === "true" ? true : false);
        });
        
        ngModel.$formatters.push(function(value) {
          return value ? '' + value : null;
        });
      }
    };

  }])