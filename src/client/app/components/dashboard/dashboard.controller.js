(function() {
    'use strict';

    angular
        .module('app.dashboard')
        .controller('DashboardController', ctrlFunc);

    /* @ngInject */
    function ctrlFunc(bolzaMap, $scope) {
        /*jshint validthis: true */
        var vm = this;
        var tour = [];
        vm.tour = tour;
        $scope.tour = [];
        bolzaMap.onSearch(function(places) {
            $scope.$apply(function() {
                vm.tour.push(places[0]);
                console.log(places[0]);
            })
        });
    }
})();
