var _ = require('underscore');
var Encoder = require('node-html-encoder').Encoder;
var MobileDetect = require('mobile-detect');

var logger = require(LIB_DIR + 'log_factory').create("recommender_route");

var locationsClient = require(CLIENTS_DIR + 'locations_client');
var RecommenderClient = require(CLIENTS_DIR + 'recommender_client');

var RecommenderRoute = function(app){
	// {
	//     "boxType": "recommended",
	//     "layoutType": "horizontal",
	//     "noOfItems": 5,
	//	   "background" : "#478911",
	//	   "showHeader" : true,
	//     "header": {
	//         "value": "recommendations by snapdeal",
	//         "fontSize": "12px",
	//         "fontWeight": 100,
	//         "align": "left",
	//         "color": "#838B8B",
	//     },
	//     "widgetSize": {
	//         "width": 780,
	//         "maxHeight": 470
	//     },
	//     "border": {
	//         "size": 2,
	//         "color": "#838B8B"
	//     },
	//     "background": {
	//         "header": "#838B8B",
	//         "main": "#838B8B",
	//         "footer": "#838B8B"
	//     },
	//     "description": [
	//         {
	//             "fieldName": "prodct name",
	//             "fontSize": "12px",
	//             "float": "left"
	//         },
	//         {
	//             "fieldName": "price",
	//             "fontSize": "12px",
	//             "float": "left",
	//             "currency": "INR"
	//         }
	//     ]
	// }
	app.post("/preview", function(req, res){
		var body = req.body;
		var client = new RecommenderClient(null, body);
		client.renderPreview(function(err, html){
			if(err){
				res.send(500, err);
			}else{
				res.send(html);
			}
		});
	});

	var getDefaultCallback = function(req, res){
		return function(err, body){
			if(err){
				logger.error(err);
				res.send(err.code, err.body);
			}else{
				if(req.query['json.wrf'] && req.query['json.wrf'] != '?') {    
				    body = req.query['json.wrf'] + "(" + body + ");";
				    res.set('Content-Type', 'application/javascript');
				    res.send(body);
				}else if(req.query.cont){
					var encoder = new Encoder('entity');
					var body = encoder.htmlEncode(body);
					res.set('Content-Type', 'application/javascript');
					res.send("(function($){" +
								"var decoded = $('<div/>').html(\"" + body + "\").text();" +
								"$('#" + req.query.cont + "').html(decoded); " +
							"})(jQuery);");
				}else{
					res.send(body);
				}
			}
		}
	}

	var detectIP = function(req){
		if(req.query['json.wrf'] || req.query.cont){
			// Looks like a request from the browser.
			var ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
			if(ip){
				var ips = ip.split(",");
				if(ips.length >= 2){
					ip = ips[0].trim();
				}

				logger.trace("Detected IP : " + ip);
				return ip;
			}
		}
	}

	var detectMobile = function(req){
		var md = new MobileDetect(req.headers['user-agent']);
		return md.mobile();
	}

	// Deprecated
	app.get("/v1.0/:key/:iSiteName/recently-viewed", function(req, res){
		var iSiteName = req.params.iSiteName;
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		var client = new RecommenderClient(iSiteName, 
		{
			boxType : 'RECENTLY_VIEWED',
			uid : uid,
			format : format,
			currency : currency,
			mobile : mobile,
			screenWidth : screenWidth,
			alignment : req.query.alignment			
		});

		client.getResults(getDefaultCallback(req, res));
	});

	app.get("/v1.0/:key/:iSiteName/recently-viewed/:uid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var uid = req.params.uid;
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		var client = new RecommenderClient(iSiteName, 
		{
			boxType : 'RECENTLY_VIEWED',
			uid : uid,
			format : format,
			currency : currency,
			mobile : mobile,
			screenWidth : screenWidth,
			alignment : req.query.alignment			
		});

		client.getResults(getDefaultCallback(req, res));
	});

	app.get("/v1.0/:key/:iSiteName/recommend", function(req, res){
		var iSiteName = req.params.iSiteName;
		var ip = req.query.ip || detectIP(req);
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'RECOMMENDED_FOR_YOU',
				locId : locId,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});
	});

	app.get("/v1.0/:key/:iSiteName/recommend/:uid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var uid = req.params.uid;
		var ip = req.query.ip || detectIP(req);
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'RECOMMENDED_FOR_YOU',
				uid : uid,
				locId : locId,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});
	});

	app.get("/v1.0/:key/:iSiteName/more-like-these/:pid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var pid = req.params.pid;
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		var client = new RecommenderClient(iSiteName, 
		{
			boxType : 'MORE_LIKE_THESE',
			pid : pid,
			uid : uid,
			format : format,
			currency : currency,
			mobile : mobile,
			screenWidth : screenWidth,
			alignment : req.query.alignment			
		});

		client.getResults(getDefaultCallback(req, res));
	});

	app.get("/v1.0/:key/:iSiteName/also-viewed/:pid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var pid = req.params.pid;
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		var client = new RecommenderClient(iSiteName, 
		{
			boxType : 'ALSO_VIEWED',
			pid : pid,
			uid : uid,
			format : format,
			currency : currency,
			mobile : mobile,
			screenWidth : screenWidth,
			alignment : req.query.alignment			
		});

		client.getResults(getDefaultCallback(req, res));
	});

	app.get("/v1.0/:key/:iSiteName/also-bought/:pid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var pid = req.params.pid;
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		var client = new RecommenderClient(iSiteName, 
		{
			boxType : 'ALSO_BOUGHT',
			pid : pid,
			uid : uid,
			format : format,
			currency : currency,
			mobile : mobile,
			screenWidth : screenWidth,
			alignment : req.query.alignment			
		});

		client.getResults(getDefaultCallback(req, res));
	});

	app.get("/v1.0/:key/:iSiteName/top-sellers", function(req, res){
		var iSiteName = req.params.iSiteName;
		var ip = req.query.ip || detectIP(req);
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'TOP_SELLERS',
				uid : uid,
				locId : locId,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});
	});

	app.get("/v1.0/:key/:iSiteName/category-top-sellers/:categoryId", function(req, res){
		var iSiteName = req.params.iSiteName;
		var ip = req.query.ip || detectIP(req);
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var category = req.params.categoryId;
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'CATEGORY_TOP_SELLERS',
				uid : uid,
				locId : locId,
				category : category,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});
	});

	app.get("/v1.0/:key/:iSiteName/brand-top-sellers/:brandId", function(req, res){
		var iSiteName = req.params.iSiteName;
		var ip = req.query.ip || detectIP(req);
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var brand = req.params.brandId;
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'BRAND_TOP_SELLERS',
				uid : uid,
				locId : locId,
				brand : brand,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});
		
	});

	app.get("/v1.0/:key/:iSiteName/pdp-top-sellers/:pid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var ip = req.query.ip || detectIP(req);
		var uid = req.query.uid;
		var format = req.query.format || 'html';
		var pid = req.params.pid;
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'PDP_TOP_SELLERS',
				uid : uid,
				locId : locId,
				pid : pid,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});
	});

	app.get("/v1.0/:key/:iSiteName/cart-recommend/:uid", function(req, res){
		var iSiteName = req.params.iSiteName;
		var ip = req.query.ip || detectIP(req);
		var format = req.query.format || 'html';
		var uid = req.params.uid;
		var currency = req.query.currency;
		var mobile = detectMobile(req);
		var screenWidth = req.query.screenWidth;

		locationsClient.lookup(ip, function(err, location){
			var locId = null;
			if(err){
				logger.warn("Couldn't lookup : " + ip);
			}else{
				locId = location['locId'];
			}

			var client = new RecommenderClient(iSiteName, 
			{
				boxType : 'CART_RECOMMEND',
				uid : uid,
				locId : locId,
				format : format,
				currency : currency,
				mobile : mobile,
				screenWidth : screenWidth,
				alignment : req.query.alignment			
			});

			client.getResults(getDefaultCallback(req, res));
		});		
	});
};

module.exports = function(app){
	return new RecommenderRoute(app);
};
