(function() {
    'use strict';

    angular.module('bolza.map', [])
    .constant('GMaps', window.google.maps);

}());

(function () {
    'use strict';

    angular
    .module('bolza.map')
    .directive('bolzaMap', directiveFunc);

    /* @ngInject */
    function directiveFunc(bolzaMap) {
        return {
            restrict: 'AE',
            replace: false,
            link: function(scope, elem, attrs, ctrl) {
                function activate() {
                    var plain = elem[0];
                    bolzaMap.init(plain);
                    bolzaMap.addSearchBox();
                }
                activate();
            }
        };
    }
})();


(function() {
    'use strict';

    angular
    .module('bolza.map')
    .factory('bolzaMap', factory);

    /* @ngInject */
    factory.$inject = ['GMaps'];
    function factory(GMaps) {
        var _currentMap = null;
        var own = {
            onSearchCallback: function() {}
        };
        var Geocoder;
        var service = {
            'init': setCurrentMap,
            'centerOnLocation': centerOnLocation,
            'centerOnUser': centerOnUser,
            'addSearchBox': addSearchBox,
            'onSearch': onSearch
        };
        activate();

        return service;

        function setCurrentMap(mapElement) {
            _currentMap = new GMaps.Map(mapElement, {
                zoom: 8,
                center: {lat: 51.519, lng: -0.1019}
            });

            GMaps.event.addListenerOnce(_currentMap, 'idle', function() {
                GMaps.event.trigger(_currentMap, 'resize');
            });
            centerOnUser();

            return _currentMap;
        }

        function centerOnLocation(address) {
            Geocoder.geocode({'address': address}, function(results, status) {
                if (status === GMaps.GeocoderStatus.OK) {
                    _currentMap.setCenter(results[0].geometry.location);
                }
            });
        }

        function markerOnLocationName() {
            var marker = new GMaps.Marker({
                position: new google.maps.LatLng( -12.043333,-77.028333),
                map: map,
                title: 'Hello World!'
            });
        }

        function addSearchBox() {
            // Create the search box and link it to the UI element.
            var input = document.querySelector('#searchInput');
            var searchBox = new GMaps.places.SearchBox(input);
            _currentMap.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
            _currentMap.addListener('bounds_changed', function() {
                searchBox.setBounds(_currentMap.getBounds());
            });
            var markers = [];
            searchBox.addListener('places_changed', function() {
                var places = searchBox.getPlaces();
                if (places.length == 0) {
                    return;
                }

                // TODO wont work
                // Clear out the old markers.
                // markers.forEach(function(marker) {
                //     marker.setMap(null);
                // });
                // markers = [];

                // For each place, get the icon, name and location.
                var bounds = new google.maps.LatLngBounds();
                centerOnLocation(places[0].formatted_address)
                own.onSearchCallback.call(this, places)
                /*
                places.forEach(function(place) {
                    var icon = {
                        url: place.icon,
                        size: new google.maps.Size(71, 71),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(17, 34),
                        scaledSize: new google.maps.Size(25, 25)
                    };

                    // TODO wont work
                    // Create a marker for each place.
                    markers.push(new google.maps.Marker({
                        map: _currentMap,
                        icon: icon,
                        title: place.name,
                        position: place.geometry.location
                    }));

                    if (place.geometry.viewport) {
                        // Only geocodes have viewport.
                        bounds.union(place.geometry.viewport);
                    }
                    else {
                        bounds.extend(place.geometry.location);
                    }
                });
                */
                _currentMap.fitBounds(bounds);
            });
        }

        function onSearch(cb) {
            own.onSearchCallback = cb;
        }

        function centerOnUser() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    var pos = new GMaps.LatLng(position.coords.latitude, position.coords.longitude);
                    _currentMap.setCenter(pos);
                    // drawRadius(_currentMap, pos);
                });
            }
        }

        function activate() {
            Geocoder = new GMaps.Geocoder();
        }
    }
}());
