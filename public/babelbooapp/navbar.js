(function() {
    var app = angular.module('navbar', []);
    app.controller('NavbarController', function($analytics, $route, $location, $scope, user, ranking) {
        var rankData; 
        var controller = this;
        controller.user = {};
        controller.showLogout = false;
        controller.userLogged = false;

        $scope.$on('$routeChangeSuccess', function($currentRoute, $previousRoute) {
            updateMedalsAndRank();
        });

        user.fillUser(function (user) {
            controller.user = user;
            controller.userLogged = true;
        });

        ranking.getUserRank(function (rank) {
            rankData = rank;
            updateMedalsAndRank();
        });

        controller.pointsClicked = function () {
            $analytics.eventTrack('pointsClicked', {
                    category: 'navigation', label: controller.user._id
                });
        };

        controller.goToPlaylists = function () {
            $location.path('/playlists'); // FIXME: prevent controller from being loaded twice
            $route.reload();
        };

        controller.goToBooTV = function () {
            $location.path('/tv'); // FIXME: prevent controller from being loaded twice
            $route.reload();
        };

        function updateMedalsAndRank() {
            controller.rank = rankData.rank;
            controller.golds = rankData.golds;
            controller.silvers = rankData.silvers;
            controller.bronzes = rankData.bronzes;
        }
    });

    app.controller('LoginController', function($analytics, $http){
        var controller = this;
        controller.formVisible = false;
        controller.showPassword = false;

        this.toggleForm = function() {
            controller.formVisible = !controller.formVisible;
            $analytics.eventTrack('callToAction', {
                category: 'conversion'
            });
        }

        this.submit = function($event) {
            if (!controller.showPassword && (this.username == 'sepha' || this.username == 'toni' || this.username == 'fran')) {
                controller.showPassword = true;
                $event.preventDefault()
            }
        }
    });
})();