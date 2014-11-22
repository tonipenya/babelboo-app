var express = require('express');
var router = express.Router();

var youtube = require('googleapis').youtube('v3');

var API_KEY = 'AIzaSyB53eOcfiDxRuIr-kakVIl1vIzBa9rQHD8';


router.get('/', function(req, res){
    res.render('createPlaylist', { message: req.flash('error') });
});

router.post('/', function(req, res){
    var collection = req.db.get('playlists');
    console.log(req.body.title);
    console.log(req.body.idlist);

    var playlistTitle = req.body.title;
    var videoIds = req.body.idlist;
    var tags = req.body.tags;
    tags = tags.split(',');
    youtube.videos.list({part:'snippet,id,contentDetails', id:videoIds, key:API_KEY},
        function createPlaylist(err, resp) {
            var videos = [];
            for (var i = 0; i < resp.items.length; i++) {
                var id = resp.items[i].id;
                var duration = resp.items[i].contentDetails.duration;
                var title = resp.items[i].snippet.title;
                var thumbnail = resp.items[i].snippet.thumbnails.medium.url; // default/medium/high
                videos.push({ source: "youtube", id: id, duration: duration, title: title, thumbnail: thumbnail });
            }

            collection.insert({title: playlistTitle, entries:videos, tags:tags}, function (err, doc) {
                if (err) throw err;
            });
        });

    req.flash('playlistCreated', 'New playlist created. Wait while it\'s added.');
    res.redirect('/allPlaylists');
});

module.exports = router;