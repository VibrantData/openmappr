'use strict';
var express       = require('express'),
    passport      = require('passport'),
    path          = require('path'),
    _             = require("lodash"),
    mongoose      = require('mongoose'),
    fs            = require('fs'),
    process       = require('process'),
    Promise       = require('bluebird'),
    elasticsearch = require('elasticsearch'),
    moment        = require('moment'),
    AWS           = require('aws-sdk'),
    clim          = require("clim");

var logger         = require('morgan'),
    compress       = require('compression'),
    cookieParser   = require('cookie-parser'),
    methodOverride = require('method-override'),
    session        = require('express-session'),
    MongoStore     = require('connect-mongo')(session),
    bodyParser     = require('body-parser'),
    multer         = require('multer'),
    serveStatic    = require('serve-static'),
    exp_promise    = require('express-promise');

// the 1st thing to load
var AppConfig            = require('./services/AppConfig');
// var CacheMaster          = require('./services/CacheMaster.js');
// var defaultEntities      = require('./migrators/defaultEntities.js');
var globals              = require('./services/globals');
var RecipeTracker        = require('./services/RecipeTracker');
var PlayerTracker        = require('./services/PlayerTracker');
var AthenaAPI            = require('./services/AthenaAPI');
var ElasticSearchService = require('./services/elasticsearch');
var db_old               = require('./db_old.js');
var mapping              = require('../mapping.json');
var sc = require('./etl/script_runner.js');

// var GenNW = require("./migrators/CountGenNetworks");

// vars
var appDir        = path.dirname(require.main.filename);
// var privateKey    = fs.readFileSync(appDir + '/../../certs/mappr.key', 'utf8');
// var certificate   = fs.readFileSync(appDir + '/../../certs/2b24131e1269aedd.crt', 'utf8');
// var dad           = fs.readFileSync(appDir + '/../../certs/gdig2_bundle.crt', 'utf8');

// var credentials   = {key: privateKey, cert: certificate, ca: dad};

Promise.longStackTraces();
require('http').globalAgent.maxSockets = 10;
// use bluebird for promises
mongoose.Promise = Promise;
// AWS.config.setPromisesDependency(require('bluebird'));

// setup console log timestamp
clim.getTime = function(){
    return new Date().toISOString().replace('T', ' ').substr(0,19);
};
clim(console, true);

moment.utc(); // switch to UTC mode

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
};

//forcing SSL
var forceSsl = function (req, res, next) {
    if(!req.secure){
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    return next();
};

//
// The main init function
//
function init (app) {
    var config = AppConfig.init(app);

    console.log("Loaded config:", config);
    // serve app files
    if(app.get('env') === 'production') {
        app.use(serveStatic(path.resolve('./client/build/prod/' + mapping.version)));
        app.set('views', path.resolve('./client/build/prod/builds/build-' + mapping.version + '/views'));
        // the default engine to use when extension is not provided
        app.set('view engine', 'html');
    } else {
        app.use(serveStatic(path.resolve('./client/build/dev')));
        app.set('views', path.resolve('./client/build/dev/views'));
        // the default engine to use when extension is not provided
        app.set('view engine', 'jade');
    }

    //configure app ====================================
    app.set('title', 'Mappr');

    // all environments
    app.use(logger('dev'));

    app.engine('jade', require('jade').__express);
    app.engine('html', require('ejs').renderFile);
    app.use(cookieParser(process.env.COOKIE_SECRET || "Superdupersecret"));
    app.use(bodyParser.json({ limit : '50mb' }));
    app.use(bodyParser.urlencoded({ limit : '5mb', extended: true }));
    app.use(methodOverride());
    app.use(session({
        secret: process.env.COOKIE_SECRET || "Superdupersecret",
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({
            url: config.sessiondbUrl,
            touchAfter: 24 * 3600
        })
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(allowCrossDomain);
    app.use(exp_promise());
    app.use(compress());
    app.use(multer({
        dest: path.resolve('../uploads/'),
        limits: {
            fileSize : 100 * 1024 * 1024 // 50mb
        }
    }).any());


    // configure database ==================================
    mongoose.connect(config.dbUrl, { promiseLibrary : Promise, useMongoClient: true });
    var oldDbConn = mongoose.createConnection(config.oldDbUrl, { promiseLibrary : Promise, useMongoClient: true });
    db_old.onConnect(oldDbConn);

    // configure search ====================================
    // var esClient = new elasticsearch.Client(config.elasticSearchConfig);
    ElasticSearchService.init(function () {
        return new elasticsearch.Client(_.extend(_.clone(config.elasticSearchConfig), {
            defer: function () {
                return Promise.defer();
            }
        }));
    });
    
    // configure passport ====================================
    require('./auth/passport')(passport);

    // configure routes    =================================
    require('./main_router')(app);

    // startup express server
    var httpServer = app.listen(8080, () => { console.log("Express server started"); });
    //configure globals ====================================
    AthenaAPI.init(config.beanstalk.host, config.beanstalk.port);
    sc.set_cluster()
    .catch(function(err) {
        throw err;
    });
    // Pre load caches
    mongoose.connection.once('open', function() {
        console.log("Connected to Mongo");
        // GenNW.setupAllGenNWIds()
        // .then(function() {
        //     console.log("All networks counts have been initialized");
        // });
        // var config = app.get('config');
        // defaultEntities.assertMonsterExist(function() {
        //  CacheMaster.preloadCaches();
        // });
    });
    globals.setupIO(httpServer, null, function() {
        console.log("[JobTracker] Express server listening on http port 8080");
        RecipeTracker.setupTracker();
        PlayerTracker.setupTracker();

        // Hack to show server start message
        setTimeout(function() {
            console.info("The project is now running, you may access it at http://localhost:8080")
        }, 7000)
    });

}

module.exports = init;
