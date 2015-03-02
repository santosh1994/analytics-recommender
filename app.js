var express = require('express');
var _ = require('underscore');
var http = require('http');
var path = require('path');
var url = require('url');
var log4js = require('log4js');

var constants = require('./lib/constants');
var logger = require(LIB_DIR + 'log_factory').create("app");
var aggregatorClient = require(CLIENTS_DIR + 'aggregator_client');

var app = express();

var reqFreq = {};

//Increase Max Sockets
http.globalAgent.maxSockets = Infinity;

app.configure(function() {
	app.set('port', CONFIG.port);
	app.use(log4js.connectLogger(logger, { level: log4js.levels.TRACE, format: ':method :url :status :response-time ms' }));
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.enable('view cache');
	app.use(express.compress());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	
	app.use(function(req, res, next){
		var path = req.path;
		if(path.indexOf('/v1.0') != -1){ // Api Called
			//console.log(req);
			var tokens = req.path.split('/');
			if(tokens.length >= 4){
				var apiKey = tokens[2];
				var iSiteName = tokens[3];

				reqFreq[iSiteName] = reqFreq[iSiteName] || 0;
				reqFreq[iSiteName]++;

				if(apiKey != 'master_key'){
					aggregatorClient.getSite(iSiteName, function(err, site){
						if(err){
							logger.error(err);
							res.send(err.code, err.body);
						}else{
							if(site['apiKey'] == apiKey){
								next();
							}else{
								res.send(401);
							}
						}
					});
				}else{
					next();
				}
			}else{
				res.send(401);
			}
		}else{
			next();
		}
	});

	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public'), { etag: false}));

	app.use(function(err, req, res, next) {
		// only handle `next(err)` calls
		console.log("Error occurred");
		logger.error(err);
		next();
	});
});

/**
 * Routes
 */
require('./routes')(app);

app.get('/getStatus', function(req, res){
	res.send(reqFreq);
});

/**
 * Initialize the Server
 */
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

logger.info("Started with settings : " + JSON.stringify(app.settings));

// Sample requests per hour
setInterval(function(){
	logger.info("Req freq : " + reqFreq + "/min");
	reqFreq = {};
}, 60000 * 60);
