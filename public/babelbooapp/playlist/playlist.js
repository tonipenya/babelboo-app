(function() {
    var app = angular.module('playlist', []);
    
    app.config(function ($locationProvider) {
        $locationProvider.html5Mode(true);
    })
    
    app.controller('SearchController', function ($scope, $http, $location, $routeParams) {
        var controller = this;
        controller.videos = [];
        controller.query = '';
        controller.playlist = {};
        controller.playlist.entries = [];
        controller.playlist.title = '';
        controller.playlist.tags = [];
        controller.showWarning = false;
        
        var playlistId = $routeParams.playlistId;

        var addedVideos = controller.playlist.entries;

        if (playlistId) {
            $http.get('/api/playlist/' + playlistId).success(function(data){
                controller.playlist = data;
                addedVideos = controller.playlist.entries;
                for (var i = 0; i < addedVideos.length; i++) {
                    if (!addedVideos[i].answers)
                        addedVideos[i].answers = [{text: ''},{text: ''},{text: ''}];
                }
            });
        }

        this.search = function(query) {
            var request = gapi.client.youtube.search.list({
                q: query,
                part: 'id,snippet',
                type: 'video'
            });

            request.execute(function(response) {
                var items = response.result.items.map(function (element, index) {
                    var result = {};
                    result.thumbnail = element.snippet.thumbnails.medium.url;
                    result.title = element.snippet.title;
                    result.description = element.snippet.description;
                    result.answers = [{text: ''},{text: ''},{text: ''}];
                    result.id = element.id.videoId;
                    result.source = "youtube";
                    return result;
                });
                controller.videos = items;
                $scope.$apply();
            });
        }

        this.add = function(video) {
            if (addedVideos.indexOf(video) == -1) { // verify that the video doesn't exist
                video.answers = [{text: ''},{text: ''},{text: ''}];
                addedVideos.push(video);
            }
        }

        this.rmvideo = function(index) {
            addedVideos.splice(index, 1);
        }

        this.addanswer = function (video) {
            video.answers.push({text: ''})
        }

        this.rmanswer = function (video, answeridx) {
            if (video.answers.length > 3)
                video.answers.splice(answeridx, 1);
        }

        this.submit = function() {
            var title = controller.title;

            if (title === '') {
                controller.warningMessage = 'Cannot create a playlist without a name.'
                controller.showWarning = true;
                return;
            }

            if (addedVideos.length == 0) {
                controller.warningMessage = 'Cannot create a playlist without videos.'
                controller.showWarning = true;
                return;
            }

            for (var i = 0; i < addedVideos.length; i++) {
                var video = addedVideos[i];
                var questiontext = video.question;
                var answers = video.answers;

                if (questiontext) {
                    var validanswers = [];
                    for (var j = 0; j < answers.length; j++) {
                        if(!answers[j].text) {
                            answers.splice(j,1);
                            continue;
                        }
                    }

                    if (answers.length < 3) {
                        controller.warningMessage = 'Write at least three answers to question: ' + questiontext + '.';
                        controller.showWarning = true;
                        return;
                    }

                    if (typeof video.correctanswer === 'undefined') {
                        controller.warningMessage = 'Correct answer not selected for question: ' + questiontext + '.';
                        controller.showWarning = true;
                        return;
                    }
                } else { // in case the video doesn't include a question
                    delete video.questiontext;
                    delete video.answers;
                    delete video.correctanswer;
                }
            }

            if (playlistId) {
                $http.put('/api/playlist/' + playlistId, controller.playlist).success(function() {
                    window.location.href = "/playlists";
                });
            } else {
                $http.post('/api/playlist', controller.playlist).success(function() {
                    window.location.href = "/playlists";
                });
            }
        };

    });


    app.directive('videoCard', function() {
        return {
            restrict: 'E',
            templateUrl: '/babelbooapp/playlist/video-card.html'
        }
    });

    app.directive('videoqaCard', function() {
        return {
            restrict: 'E',
            templateUrl: '/babelbooapp/playlist/videoqa-card.html'
        }
    });

    app.directive('answerCard', function() {
        return {
            restrict: 'E',
            templateUrl: '/babelbooapp/playlist/answer-card.html'
        }
    });
})();

var API_KEY = 'AIzaSyB53eOcfiDxRuIr-kakVIl1vIzBa9rQHD8';

function handleClientLoad() {
    gapi.client.setApiKey(API_KEY);
    gapi.client.load('youtube', 'v3');
}
