(function () {
    'use strict';

    angular.module('app', [
        'app.dashboard',
        'bolza.map',
        'ui.router'
    ])
    .config(appConfig)
    .run(run);

    appConfig.$inject = ['$httpProvider', '$stateProvider', '$urlRouterProvider',
        '$locationProvider'];
    /* @ngInject */
    function appConfig($httpProvider, $stateProvider, $urlRouterProvider, $locationProvider) {
        //$httpProvider.defaults.cache = true;
        $urlRouterProvider.otherwise('/dashboard');
        $locationProvider.html5Mode(false).hashPrefix('!');
        $httpProvider.defaults.headers.common['Accept'] = 'application/json';

        $stateProvider
        .state('404', {
            url: '/404',
            templateUrl: 'src/client/app/core/404.html',
            title: '404',
            noAuthRequired: true
        });

    }

    /* @ngInject */
    function run($rootScope, $state, $stateParams) {
        $state.default = function() {
            $state.go('dashboard');
        };
        $state.back = function(options) {
            if ($state.previousState) {
                $state.transitionTo($state.previousState.name, $state.previousState.params, options);
            }
            else {
                $state.default();
            }
        };
        $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams) {
            console.warn('$stateChangeError - fired when an error occurs during transition.');
            console.warn(arguments);
        });
        //having app.run($rootScope, $state) solves page refresh and getting back to $state bug
        //will be fixed with Angular 1.4 deleting UI Router
    }
})();
