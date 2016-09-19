app.directive('clientName', function () {
  var REGEX = /^[a-zA-Z0-9_]*$/;

  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ctrl) {

      ctrl.$validators.integer = function (ngModelValue) {
        if (REGEX.test(ngModelValue)) {
          ctrl.$setValidity('invalidCharacter', true);
          return ngModelValue;
        } else {
          ctrl.$setValidity('invalidCharacter', false);
          return ngModelValue;     
        }
      };

    }
  };
  
});