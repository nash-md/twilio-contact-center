angular.module('client-name', [])
	.directive('clientName', ['$parse', '$compile', function($parse, $compile) {
		const REGEX = /^[a-zA-Z0-9_]*$/;

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
		
	}])

