const validatePhoneNumber = function($parse, $compile) {
  const pattern = /^\+[1-9]{1}[0-9]{7,20}$/;

  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ctrl) {
      ctrl.$validators.integer = function(ngModelValue) {

        if (pattern.test(ngModelValue) == false) {
          ctrl.$setValidity('invalidPhone', false);
          return ngModelValue;
        }

        ctrl.$setValidity('invalidPhone', true);

        return ngModelValue;
      };
    }
  };
};

angular.module('phone-number', []).directive('phoneNumber', validatePhoneNumber);
