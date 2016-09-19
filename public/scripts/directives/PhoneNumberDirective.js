app.directive('phoneNumber', function () {
    var pattern = /^\+[0-9]{8,20}$/;

    return {
      require: 'ngModel',
      link: function (scope, element, attrs, ctrl) {

        ctrl.$validators.integer = function (ngModelValue) {
          if(ngModelValue == undefined || ngModelValue == null){
            ctrl.$setValidity('invalidPhone', true);
            return ngModelValue;
          }
          
          if (pattern.test(ngModelValue) == false) {
            ctrl.$setValidity('invalidPhone', false);
            return ngModelValue;
          }

          ctrl.$setValidity('invalidPhone', true);

          return ngModelValue;
        };
      }
    };
  });
