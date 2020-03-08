const convertToPhoneNumber = [
  '$filter',
  function($filter) {
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {
          if (viewValue && viewValue[0] !== '+' && viewValue.length === 1) {
            elem.val(`+${viewValue}`);
          } else {
            return viewValue;
          }
        });
      }
    };
  }
];

angular.module('convert-to-phone-number', []).directive('convertToPhoneNumber', convertToPhoneNumber);
