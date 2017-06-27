angular.module('convert-to-number', [])
  .directive('convertToNumber', ['$parse', '$compile', function($parse, $compile) {

    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {

        ngModel.$parsers.push(function(value) {
          return value ? parseInt(value, 10) : null;
        });
        
        ngModel.$formatters.push(function(value) {
          return value ? '' + value : null;
        });
      }
    };

  }])