(function() {
    'use strict';

    angular
        .module('app.dashboard')
        .config(config);

    config.$inject = ['$stateProvider'];
    /* @ngInject */
    function config($stateProvider) {
        $stateProvider
        .state('dashboard', {
            url: '/dashboard',
            title: 'Dashboard',
            templateUrl: 'src/client/app/components/dashboard/dashboard.html',
            controller: 'DashboardController',
            controllerAs: 'vm',
            settings: {
                nav: 1,
                content: 'Dashboard'
            }
        });
    }
})();
