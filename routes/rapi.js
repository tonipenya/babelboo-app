
var youtube = require('googleapis').youtube('v3');

var API_KEY = 'AIzaSyB53eOcfiDxRuIr-kakVIl1vIzBa9rQHD8';

var express = require('express');

var router = express.Router();

router.get('/playlist/', function(req, res) {
    var collection = req.db.get('playlists');

    try {
        collection.find({},{},function (err, result) {
            res.json( result );
        });
    } catch (err2) {
        res.json();
    }
});

router.get('/playlist/:playlist_id', function(req, res) {
    var collection = req.db.get('playlists');

    try {
        collection.find({_id: req.params.playlist_id},{},function (err, result) {
            res.json( result[0] );
        });
    } catch (err2) {
        res.json();
    }
});

router.delete('/playlist/:playlist_id', function(req, res) {
    var collection = req.db.get('playlists');
    collection.remove({_id: req.params.playlist_id});
    res.status = 204;
    res.json();
});

router.put('/playlists/:playlist_id', function(req, res) {
    console.log ("PUT: ", req.body);

    upsertPlaylist(req.body, req.params.playlist_id, req.db);

    res.status = 200; // OK
    res.json();
});

router.post('/playlists', function(req, res) {
    console.log ("POST: ", req.body);

    upsertPlaylist(req.body, null, req.db);

    res.status = 201; // CREATED
    res.json();
});


function upsertPlaylist(body, playlistId, db) {
    var collection = db.get('playlists');

    if (playlistId) {
        collection.update({"_id": playlistId}, body,
            function (err, doc) {
                if (err) throw err;
            });
    } else {
        collection.insert(body,
            function (err, doc) {
                if (err) throw err;
            });
    }
}

module.exports = router;
