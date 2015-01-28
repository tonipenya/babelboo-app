
var express = require('express');

var router = express.Router();

router.get('/playlist', function(req, res) {
    var collection = req.db.get('playlists');

    var query = {};

    if (req.query.level && req.query.level != -1) {
        query.level = parseInt(req.query.level);
    }

    if (req.query.tags) {
        query.tags = { $all : req.query.tags.split(',') };
    }

    if (req.query.related) {
        collection.find({ _id: req.query.related },{},function (err, result) {
            var tags = result[0].tags;
            query._id = { $ne: collection.id(req.query.related) };
            query.tags = { $in: tags };
            runQuery(query);
        });
    } else if (req.query.popular) {
        collection.find({visitcount: { $exists: true }}, {sort: {visitcount: -1}, limit: req.query.num_results}, function (err, result) {
            res.json( result );
        });
    } else if (req.query.all == 'true') {
        runQueryAll(query);
    } else {
        runQuery(query);
    }

    function runQueryAll (query) {
        try {
            collection.find(query, function (err, result) {
                res.json( result );
            });
        } catch (err2) {
            res.json();
        }
    }

    function runQuery (query) {
        try {
            collection.find(query, function (err, result) {
                for (var i = 0; i < result.length; i++) {
                    var current = result[i];
                    var newentries = [];
                    for (var j = 0; j < current.entries.length; j++) {
                        var newvid = {};
                        newvid.thumbnail = current.entries[j].thumbnail;
                        newentries[j] = newvid;
                    }

                    current.entries = newentries;
                }
                res.json( result );
            });
        } catch (err2) {
            res.json();
        }
    }
});

router.get('/tag', function(req, res) {
    var collection = req.db.get('tags');

    try {
        collection.find({},{},function (err, result) {
            res.json( result );
        });
    } catch (err2) {
        res.json();
    }
});

router.get('/user', function(req, res) {
    var collection = req.db.get('usercollection');

    res.json(req.user);
});

router.post('/user/:username/correctanswer/:playlist_id', function(req, res) {
    if (req.params.username != req.user.username) {
        res.status(403); // FORBIDDEN
        res.json();
        return;
    }

    var collection = req.db.get('usercollection');

    var videoId = req.body.id;
    var newRatio = req.body.ratio;
    var playlistId = req.params.playlist_id;

    var query = {
        username: req.user.username
    };

    var setop = {};
    setop['playlistprogress.' + playlistId + '.correct.' + videoId] = true;
    setop['playlistprogress.' + playlistId + '.ratio'] = newRatio;

    collection.update(query, {$set: setop});
    res.json();

    var newMedal = getMedal(newRatio);
    try {
        var oldMedal = getMedal(req.user.playlistprogress[playlistId].ratio);
        if (newMedal <= oldMedal) {
            return;
        }
    } catch(err) {}

    var now = new Date();

    if (req.user.medalhistory) {
        var medalHistory = req.user.medalhistory;
        for (var i = medalHistory.length-1; i >= 0 && sameDay(now, medalHistory[i].date); i--) {
            if (medalHistory[i].playlistid == playlistId) {
                collection.update(query, {$pull: {medalhistory: medalHistory[i]}});
                break;
            }
        }
    }

    var entry = {
        playlistid: playlistId,
        medal: newMedal,
        date: now
    };

    collection.update(query, {$push: {medalhistory: entry}});
});

var BRONZE = 1;
var SILVER = 2;
var GOLD = 3;

function getMedal(ratio) {
    if (0 < ratio && ratio <= 0.5) {
        return BRONZE;
    } else if (0.5 < ratio && ratio < 1) {
        return SILVER;
    } else {
        return GOLD;
    }
}

function sameDay(aDate, anotherDate) {
    return aDate.toLocaleDateString() == anotherDate.toLocaleDateString();
}

router.post('/user/:username/finished/:playlist_id', function(req, res) {
    if (req.params.username != req.user.username) {
        res.status(403); // FORBIDDEN
        res.json();
        return;
    }

    var playlistId = req.params.playlist_id;

    try {
        if (req.user.playlistprogress[playlistId].finished) {
            return;
        }
    } catch(err) {
        return;
    }

    var setop = {};
    setop['playlistprogress.' + playlistId + '.finished'] = true;

    var query = {
        username: req.user.username
    }

    var collection = req.db.get('usercollection');
    collection.update(query, {$set: setop});

    collection = req.db.get('playlists');
    query = {
        _id: playlistId
    }

    collection.update(query, {$inc: {visitcount: 1}});
    res.json();
});

router.post('/feedback', function(req, res) {
    var collection = req.db.get('feedback');

    var id = req.user._id;
    var username = req.user.username;
    var message = req.body.message;

    var object = {
        userid: id,
        username: username,
        message: message,
        date: new Date()
    };

    collection.insert(object);

    res.json();
});

router.post('/video', function(req, res) {
    var collection = req.db.get('videos');

    var videoIds = req.body;
    var videos = videoIds.map(function (currentValue) {
        return {
            videoId: currentValue.id,
            title: currentValue.title,
            level: currentValue.level,
            source: 'YouTube'
        }
    });

    for (var i = 0; i < videoIds.length; i++) {
        collection.insert(videos);
    }

    res.json();
});

router.get('/ranking/:period', function(req, res) {
    // var period = req.params.period;
    
    var collection = req.db.get('usercollection');
    var fields = {username: 1, nickname: 1, medalhistory: 1, _id: 0};
    collection.find({}, {fields: fields}, function(err, result) {
        var ranking = [];
        
        for (var i = 0; i < result.length; i++) {
            var entry  = {
                username: result[i].username,
                nickname: result[i].nickname,
                golds: 0,
                silvers: 0,
                bronzes: 0
            }
            
            var nMedals = result[i].medalhistory? result[i].medalhistory.length: 0;
            for (var j = 0; j < nMedals; j++) {
                var hEntry = result[i].medalhistory[j];
                if (hEntry.medal == GOLD) {
                    entry.golds++;
                } else if (hEntry.medal == SILVER) {
                    entry.silvers++;
                } else if (hEntry.medal == BRONZE) {
                    entry.bronzes++;
                }
            }
            
            ranking.push(entry);
        }
        
        ranking.sort(function(a, b) {
            return b.golds - a.golds;
        });
        
        for (var i = 0; i < ranking.length; i ++) {
            ranking[i].rank = i+1;
        }
        
        res.json(ranking);
        
    });
    
    
});


module.exports = router;
