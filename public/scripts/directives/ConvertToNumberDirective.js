app.directive('convertToNumber', function() {
 
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
  
});