/* jshint  -W079, -W117, -W030 */
var mockData = {

};
mockData.newResource = function(data) {
    var obj = angular.extend({}, data);
    obj.toJSON = function(newObj) {
        var pure = angular.copy(obj);
        delete pure.toJSON;
        return pure;
    };
    return obj;
};

mockData.newDeferred = function ($q) {
    var defer = $q.defer();
    defer.$promise = defer.promise;
    return defer;
};

mockData.newCallback = function (and, definedCb, definedData) {
    return function(data) {
        var obj = {};
        obj[and] = definedCb || function(cb) {
            cb(definedData || data);
        };
        return obj;
    };
};

mockData.asyncService = function () {
    return function($q) {
        var defers = {};
        return {
            $$defer: function() {
                return defers;
            },
            $$resolve: function(name, res) {
                if (typeof name !== 'string') {
                    throw new Error ('$$resolve called with invalid first arg');
                }
                if (defers[name]) {
                    defers[name].resolve(res);
                }
            },
            $$reject: function(name, res) {
                if (typeof name !== 'string') {
                    throw new Error ('$$reject called with invalid first arg');
                }
                defers[name].reject(res);
            }
        };
    };
};
mockData.getLineItemPolicy = function (custom) {
    var data = {
        'id': custom || 'lite',
        'display_name': custom || 'Admedo LITE',
        'created_at': '2015-04-28T17:01:39Z',
        'updated_at': '2015-04-30T12:12:03Z'
    };
    return mockData.newResource(data);
};
mockData.$stateService = function() {
    return function() {
        return {
            'go': function() {},
            'default': function() {},
            'get': function() {}
        };
    };
};
mockData.makeUrl = function(apiUrl, params) {
    var str =  apiUrl.replace(/(\/\:\w+)/g, function(match) {
        var key = match.slice(2);
        if (!params[key]) {
            return '';
        }
        else {
            var tmp = '/' + (params[key]).toString();
            delete params[key];
            return tmp;
        }
    });
    if (Object.keys(params).length) {
        str += '?';
    }
    for (var k in params) {
        str += k + '=' + params[k] + '&';
    }
    if (str[str.length - 1] === '&') {
        str = str.substring(0, str.length - 1);
    }
    return str;
};
