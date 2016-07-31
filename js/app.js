/* global Log: false, angular: false */

'use strict';

// function isNumber(n) {
//   return !isNaN(parseFloat(n)) && isFinite(n);
// }

var log = new Log('logging');
log.write('hello app.js');

angular
 .module('tmApp1', ['ui.bootstrap', 'ui.bootstrap.modal', 'ngRoute', 'smart-table'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.htm',
        controller: 'MainController'
      })
      .otherwise({
        redirectTo: '/'
      });
      //$locationProvider.html5Mode(true);
  });

log.write('ng configured');
