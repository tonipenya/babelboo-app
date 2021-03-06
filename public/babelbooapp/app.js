(function() {
    var app = angular.module('babelbooapp', [
        'ngRoute', 'navbar', 'betaregistration', 'share', 'recover', 'resetpassword',
        'services', 'video', 'tv', 'player', 'playlist', 'playlists',
        'ranking', 'plot', 'profile', 'managePlaylists', 'angulartics',
        'angulartics.google.analytics', 'angularFileUpload' ]);

    var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){ // Initialize a new promise
        var deferred = $q.defer();

        // Make an AJAX call to check if the user is logged in
        $http.get('/loggedin').success(function(user) {
            if (user !== '0') { // Authenticated
                if($location.path() == '/login') {
                    $timeout(function(){deferred.reject();}, 0);
                    $location.url('/');
                } else {
                    deferred.resolve(user);
                }
            } else { // Not Authenticated
                if($location.path() != '/login') {
                    $rootScope.message = 'You need to log in.';
                    $timeout(function(){deferred.reject();}, 0);
                    $location.url('/login');
                } else {
                    $timeout(deferred.resolve, 0);
                }
            }
        });

        return deferred.promise;
    };

    var getUser = function($q, $http, $timeout) {
        var deferred = $q.defer();

        // Make an AJAX call to check if the user is logged in
        $http.get('/loggedin').success(function(user) {
            if (user !== '0') { // Authenticated
                $timeout(function () {
                    deferred.resolve(user);
                }, 0);
            } else { // Not Authenticated
                $timeout(function () {
                    deferred.resolve(null);
                }, 0);
            }
        });

        return deferred.promise;
    };

    var getPlaylist = function ($q, $timeout, $route, $location, playlists) {
        var playlistId = $route.current.params.playlistId;
        var deferred = $q.defer();

        playlists.getPlaylist(playlistId, function (data) {
            if (data._id == playlistId) {
                $timeout(function(){deferred.reject();}, 0);
                $location.url('/play/' + data.slug);
            } else {
                $timeout(function () {
                    deferred.resolve(data);
                }, 0);
            }
        });

        return deferred.promise;
    }

    app.factory('submitFeedback', function($http) {
        var service;

        service = function (feedback) {
            $http.post('/api/feedback', { "message": feedback });
        }

        return service;
    });

    app.controller('FeedbackController', function($location, $scope, $rootScope, user, submitFeedback){
        this.user = {};
        var controller = this;
        controller.userLogged = false;
        controller.formVisible = false;

        $scope.$on('$routeChangeSuccess', function() {
            controller.formVisible = false;
        });

        $rootScope.$on('feedback.toggle', function () {
            controller.toggleForm()
        });

        user.fillUser(function (user) {
            controller.user = user;
            controller.userLogged = true;
        });

        controller.toggleForm = function() {
            controller.formVisible = !controller.formVisible;
        }

        controller.submit = function(feedback) {
            submitFeedback('Feedback submitted from route ' + $location.path() + ' : ' + feedback);
            controller.formVisible = false;
        }
    });

    app.config(function ($analyticsProvider) {
        $analyticsProvider.firstPageview(true); /* Records pages that don't use $state or $route */
        $analyticsProvider.withAutoBase(true);  /* Records full path */
    });

    app.config(function ($locationProvider) {
        $locationProvider.html5Mode(true);
    })

    app.config(function($routeProvider) {
        $routeProvider.
            when('/', {
                redirectTo: '/playlists'
            }).
            when('/login', {
                templateUrl: '/babelbooapp/landing/landing-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/register', {
                templateUrl: '/babelbooapp/betaregistration/betaregistration-fragment.html'
            }).
            when('/playlist', {
                templateUrl: '/babelbooapp/playlist/playlist-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/playlist/:playlistId', {
                templateUrl: '/babelbooapp/playlist/playlist-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/playlists', {
                templateUrl: '/babelbooapp/playlists/playlists-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/play/:playlistId', {
                templateUrl: '/babelbooapp/play/play-fragment.html',
                controller: 'PlayController as playCtrl',
                resolve: {
                    userData: getUser,
                    playlistData: getPlaylist
                }
            }).
            when('/tv', {
                templateUrl: '/babelbooapp/tv/tv-fragment.html'
            }).
            when('/manage', {
                templateUrl: '/babelbooapp/editPlaylists/playlists-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/video', {
                templateUrl: '/babelbooapp/video/video-fragment.html'
            }).
            when('/progress', {
                templateUrl: '/babelbooapp/progress/progress-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/recover', {
                templateUrl: '/babelbooapp/recover/recover-fragment.html',
            }).
            when('/resetpassword', {
                templateUrl: '/babelbooapp/resetpassword/resetpassword-fragment.html',
            }).
            when('/profile', {
                templateUrl: '/babelbooapp/profile/profile-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            when('/tutorial', {
                templateUrl: '/babelbooapp/tutorial/tutorial-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            }).
            otherwise({
                templateUrl: '/babelbooapp/error-fragment.html',
                resolve: {
                    loggedin: checkLoggedin
                }
            });
    });

    app.directive('navbar', function() {
        return {
            restrict: 'E',
            templateUrl: '/babelbooapp/navbar-fragment.html'
        };
    });

})();

// compatibility definition of indexOf for IE8
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj, fromIndex) {
        if (fromIndex == null) {
            fromIndex = 0;
        } else if (fromIndex < 0) {
            fromIndex = Math.max(0, this.length + fromIndex);
        }
        for (var i = fromIndex, j = this.length; i < j; i++) {
            if (this[i] === obj)
                return i;
        }
        return -1;
    };
}
