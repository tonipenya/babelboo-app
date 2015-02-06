var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var MongoStore = require('connect-mongo')(session);

var app = express();
var dbpath;

if (process.env.NODE_ENV === 'test') {
    dbpath = 'localhost:27017/test';
} else {
    dbpath = 'localhost:27017/babelboo';
}

app.db = require('monk')(dbpath);

function findByUserName(username, callback) {
    var collection;
    if (process.env.NODE_ENV === 'test')
        collection = app.db.get('testlogin');
    else {
        collection = app.db.get('usercollection');
    }
    
    collection.find({ $or: [{username: username}, {nickname: username}] },{},function (err, result) {
        if (result.length === 0)
            return callback(null, null);
        else
            return callback(null, result[0]);
    });
}

function findById(id, callback) {
    var collection;
    if (process.env.NODE_ENV === 'test')
        collection = app.db.get('testlogin');
    else {
        collection = app.db.get('usercollection');
    }
    
    collection.findById(id, function(err, user){
        if (user != null) {
            callback(null, user);
        } else {
            callback(new Error('User ' + id + ' does not exist'));
        }

    });
}

passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

passport.deserializeUser(function(id, done) {
        findById(id, function (err, user) {
            done(err, user);
        });
    });

passport.use(new LocalStrategy(
    function(username, password, done) {
        findByUserName( username, function(err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username. Try again.' });
            }

            if (user.password != password) {
                return done(null, false, { message: 'Incorrect password. Try again.' });
            }

            return done(null, user);
        });
    }
    ));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
if (process.env.NODE_ENV === 'development') {
    app.use(logger('dev'));
} else if (process.env.NODE_ENV === 'test') {
    // do nothing
} else {
    app.use(logger('combined', {
        skip: function (req, res) { return res.statusCode < 400 }
    }));
}
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser()); // cookies need to be added before sessions
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var sessionConnected = false;
var sessionConnectedCallback = null;
app.onSessionConnected = function (callback) {
    if (sessionConnected) {
        callback();
    } else {
        sessionConnectedCallback = callback;
    }
};

app.use(session({
    store: new MongoStore({
        url: 'mongodb://' + dbpath
    }, function () {
        sessionConnected = true;
        if (sessionConnectedCallback) {
            sessionConnectedCallback();
        }
    }),
    secret: '1234567890QWERTY',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge : 1296000000 }}
  )); // TODO: learn about the session security requirements and change key
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req,res,next){
    req.db = app.db;
    next();
});

var bbooapp = require('./routes/rbbooapp');
var login = require('./routes/rlogin');
var logout = require('./routes/rlogout');
var api = require('./routes/rapi');
var publicapi = require('./routes/rpublicapi');
var restrictedapi = require('./routes/rrestrictedapi');
var defaultapi = require('./routes/rdefaultapi');

var auth = function(req, res, next) {
    if (!req.isAuthenticated()) {
        res.status(401).end();
    } else {
        next();
    }
}

var restrictedAuth = function(req, res, next) {
    if (req.isAuthenticated() && (req.user.username == 'sepha' || req.user.username == 'toni' || req.user.username == 'fran')) {
        next();
    } else {
        res.status(401).end();
    }
}

app.get('/loggedin', function(req, res) {
    var user = '0';

    if (req.isAuthenticated()) {
        user = req.user;
        updateLastLogin(user);
    }

    res.send(user);
});

app.use('/api', publicapi);
app.use('/api', auth, api);
app.use('/api', restrictedAuth, restrictedapi);
app.use('/api', defaultapi);

app.use('/login', login);
app.use('/logout', logout);
app.use('/', bbooapp);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (process.env.NODE_ENV === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
} else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

if (process.env.NODE_ENV === 'development') {
    app.locals.pretty = true;
    app.set('json spaces', 4);
}

function updateLastLogin(user) {
    var collection = app.db.get('usercollection');

    if (!user.lastvisit || user.lastvisit.toLocaleDateString() != new Date().toLocaleDateString()) {
        user.daysvisited += 1;
        user.lastvisit = new Date();

        var find = {"_id" : user._id};
        var update = {$set: {"daysvisited": user.daysvisited,
                             "lastvisit": user.lastvisit}
        };

        collection.update(find, update);
    }
}


module.exports = app;
