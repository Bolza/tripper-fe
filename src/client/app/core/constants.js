/* global moment:false, UIkit:false */
(function() {
    'use strict';

    var dict = {
        appErrorPrefix: 'trapper [ Error] ',
        appTitle: 'trapper'
    };

    angular
        .module('app')
        .constant('GMaps', window.google.maps);
})();
