var _ = require('underscore');
var logger = require(LIB_DIR + 'log_factory').create("recommender_client");
var request = require('request');
var jade = require('jade');
var fs=require('fs');

var aggregatorClient = require(CLIENTS_DIR + 'aggregator_client');
var auditorClient = require(CLIENTS_DIR + 'auditor_client');
var exchangeRatesClient = require(CLIENTS_DIR + 'exchange_rates_client');

var dir = VIEWS_DIR;
var templates = {};

fs.readdir(dir,function(err,files){
    if (err) throw err;
    var c=0;
    files.forEach(function(file){
        c++;
        fs.readFile(dir + file,'utf-8',function(err, text){
            if (err) throw err;
            
            if(file.indexOf(".html") != -1){
            	try{
	            	templates[file] = _.template(text);
	            	logger.debug("Compiled template : " + file);
            	}catch(e){
            		logger.error("failed to compile " + file, e)
            	}
        	}

        	// if(file.indexOf(".jade") != -1){
         //    	templates[file] = jade.compile(text);
         //    	logger.debug("Compiled template : " + file);
        	// }

            if (0===--c) {
                logger.info("Compiled all templates");
            }
        });
    });
});


var RecommenderClient = function (iSiteName, params){
	var ref = this;

	var widgetTitles = {
		'ALSO_VIEWED' : 'PEOPLE WHO VIEWED THIS ALSO VIEWED', 
		'ALSO_BOUGHT' : 'PEOPLE WHO BOUGHT THIS ALSO BOUGHT', 
		'RECENTLY_VIEWED' : 'RECENTLY VIEWED ITEMS', 
		'RECOMMENDED_FOR_YOU' : 'RECOMMENDED FOR YOU', 
		'MORE_LIKE_THESE' : 'RELATED PRODUCTS', 
		'TOP_SELLERS' : 'TOP SELLING PRODUCTS', 
		'CATEGORY_TOP_SELLERS' : 'TOP SELLING PRODUCTS IN THIS CATEGORY', 
		'BRAND_TOP_SELLERS' : 'TOP SELLING PRODUCTS IN THIS BRAND', 
		'PDP_TOP_SELLERS' : 'TOP SELLING PRODUCTS LIKE THIS', 
		'CART_RECOMMEND' : 'RECOMMENDATIONS BASED ON YOUR CART'
	}

	var currencyCodes = {
		"USD" : "$",
		"EUR" : "&#8364;",
		"GBP" : "&#163;",
		"CAD" : "$",
		"JPY" : "&#165;",
		"AUD" : "$",
		"INR" : "Rs. "
	}

	var pidBasedBWidgets = ['ALSO_VIEWED', 'ALSO_BOUGHT', 'MORE_LIKE_THESE', 'PDP_TOP_SELLERS'];
	var categoryBasedBWidgets = ['CATEGORY_TOP_SELLERS'];
	var brandBasedBWidgets = ['BRAND_TOP_SELLERS'];

	var getTemplateParams = function(body){
		var description = body.description && body.description.length > 0 
							? body.description 
							: 	[{
									fieldName : 'pname',
									fontSize : "12px"
								},{
									fieldName : 'price',
									fontSize : "12px",
									fontWeight : 'bold'
								}];

		var templateParams = {
			noOfItems : body.noOfItems,
			widgetSize : body.widgetSize,
			header : body.header,
			border : body.border,
			background : body.background,
			description : description,
			showHeader : body.showHeader,
			currencyCodes : currencyCodes
		};

		//Decode for UTF strings
		if(templateParams && templateParams['header'])
			templateParams.header.value = decodeURI(templateParams.header.value);

		return templateParams;
	}

	var sendEmptyResponse = function(callback){
		if(params.format == "html"){
			callback(null, "");
		}else{
			callback(null, "{}");
		}
	}

	var render = function(template, templateParams, callback){
		if(templates.hasOwnProperty(template) && typeof templates[template] == 'function'){
			fn = templates[template];
			try{
				var html = fn(templateParams);
				callback(null, html);
			}catch(e){
				logger.error("Error rendering recommendations", e);
				auditorClient.push("Recommendations", "Rendering engine", iSiteName, null, "Failed : Fatal", "Params : " + JSON.stringify(params) + ", ERROR : " + e.message);
				sendEmptyResponse(callback);
			}
		}else{
			logger.error("Couldn't find template : " + template);
			auditorClient.push("Recommendations", "Rendering engine", iSiteName, null, "Failed : Fatal", "Couldn't find template : " + template);
			sendEmptyResponse(callback);
		}
	}

	this.renderPreview = function(callback){
		var products = [];
		for(var i = 0; i < 16; i++){
			products.push({
				pname : "Smart Analog Watch",
				price : 200,
				catlevel2Name : "Men",
				catlevel2Name : "Watches",
				catlevel3Name : "Sports Watches",
				catlevel4Name : "Cool Sports Watches",
				brand : "Giordano",
				gender : "Men",
				pid : "SKU00X",
				image_link : ["//d21gpk1vhmjuf5.cloudfront.net/img/watch.jpg"]
			});
		}

		var templateParams = _.extend({boxType : params.boxType , products : products, titles : widgetTitles}, getTemplateParams(params));
		var template = params.layoutType == 'horizontal' ? 'hz-recommender.html' : 'vt-recommender.html';
		render(template, templateParams, callback);
	}

	var handleHtml = function(boxType, products, extraOpts, callback){
		var alignment = params.alignment || 'hz';

		var site = ref.site;

		var fieldsMap = site['feedFieldsMap'];
		if(fieldsMap != undefined){
			_.each(products, function(product){
				for(var field in fieldsMap){
					if (fieldsMap.hasOwnProperty(field)){
						product[fieldsMap[field]] = product[field];	
					}
				}
			})	
		}

		var templateOpts = {};
		if(site['templateOpts'] && site['templateOpts'][boxType]){
			templateOpts = site['templateOpts'][boxType];
			if(templateOpts['layoutType'] && templateOpts['layoutType'] == 'horizontal'){
				alignment = 'hz';
			}else{
				alignment = 'vt';
			}
		}

		// Show Saved Header
		if(templateOpts['header'] && templateOpts['header']['value'])
			widgetTitles[boxType] = templateOpts.header.value;

		var templateParams = {boxType: boxType, products: products, titles : widgetTitles};
		templateParams = _.extend(templateParams, extraOpts);

		// Put Source attributes
		if(pidBasedBWidgets.indexOf(boxType) != -1){
			templateParams['sourceAttr'] = "unbxdParam_source_pid";
			templateParams['sourceAttrValue'] = params.pid;
		}else if(categoryBasedBWidgets.indexOf(boxType) != -1){
			templateParams['sourceAttr'] = "unbxdParam_category";
			templateParams['sourceAttrValue'] = params.category;
		}else if(brandBasedBWidgets.indexOf(boxType) != -1){
			templateParams['sourceAttr'] = "unbxdParam_brand";
			templateParams['sourceAttrValue'] = params.brand;
		}

		// adding screen width
		if(params.screenWidth){
			templateParams['screenWidth'] = params.screenWidth;
		}

		var template = alignment + '-' + iSiteName + ".html";
		templateParams = _.extend(templateParams, getTemplateParams(templateOpts));

		if(!templates[template]){
			template = alignment + '-recommender.html';

			if(templateParams && templateParams.description && templateParams.description){
				_.each(templateParams.description, function(desc){
					if(desc['fieldName'] == 'price' || desc['currency']){
						if(params['currency'])
							desc['currency'] = params.currency || desc['currency'];
					}
				});
			}

			//Take value from getsite API
			if(site['numberOfRecommendations'][boxType] < products.length ){
				templateParams.products = templateParams.products.slice(0, site['numberOfRecommendations'][boxType]);
			}
		} else { // custom template
			var currency = params.currency || 'USD';
			templateParams['currency'] = currencyCodes[currency.trim()] || currency;
		}

		logger.debug('Render stats For site: ' + iSiteName + '/' + templateParams['boxType'] + 
				' - noOfItems: ' + templateParams['noOfItems'] + 
				', numberOfRecommendations: ' + products.length);
		render(template, templateParams, callback);
	}

	var handleResponse = function(callback){
		return function(error, response, body){
			if (!error && response.statusCode == 200) {
				logger.info("Cache : " + response.headers['x-cache'] + " for site : " + iSiteName + ", params : " + JSON.stringify(params));

				var obj = JSON.parse(body);
				var boxType = obj['boxType'];
				var count = obj['count'];
				var queryTime = obj['queryTime'];
				var products = obj['Recommendations'];

				// ========== API Hits tracking =======
				var hitsParams = {
					"box_type" : boxType,
					"results" : count,
					"query_time" : queryTime
				};

				if(params.pid)
					hitsParams['source_pid'] = params.pid;
				else if(params.category)
					hitsParams['source_category'] = params.category;
				else if(params.brand)
					hitsParams['source_brand'] = params.brand;

				aggregatorClient.sendHits(iSiteName, hitsParams);
				// ======================================

				// Handle single object in response
				if(products && !_.isArray(products))
					products = [products];

				_.each(products, function(product){
					if(product['price'] && product['currency'] && params.currency && product['currency'] != params.currency){
						// Need to convert
						product['price'] = exchangeRatesClient.convert(product['price'], product['currency'], params.currency)
						product['currency'] = params.currency;
					}
				});

				if(params.format == 'html'){
					if(count == 0){
						logger.warn("No recommendations for iSiteName : " + iSiteName + ", params : " + JSON.stringify(params));
						sendEmptyResponse(callback);
					}else{
						var extraOpts = {};
						if(obj['location'])
							extraOpts['location'] = obj['location'];
						handleHtml(boxType, products, extraOpts, callback);
					}
				}else{ // JSON
					if(count == 0)
						logger.warn("No recommendations for iSiteName : " + iSiteName + ", params : " + JSON.stringify(params));
					callback(null, body);
				}
			}else{
				if(error){
					logger.error('problem with fetching recommendations: ' + error + ', response: ' + response);
					callback({code : 500, body : error});
				}else{
					logger.warn("Get Recommendations. Status : " + response.statusCode);
					callback({code : response.statusCode, body : body});	
				}
			}
		}
	}

	var appendUid = function(url){
		if(params.uid){
			return url + "&uid=" + encodeURIComponent(params.uid);
		}

		return url;
	}

	var appendLocId = function(url){
		if(params.locId){
			return url + "&locId=" + encodeURIComponent(params.locId);
		}

		return url;
	}

	var generateUrl = function(region){
		var url = "http://" + region + "_" + CONFIG['recommender.host'] + CONFIG['recommender.recommendations.path'] + iSiteName;

		if(params.boxType == 'RECOMMENDED_FOR_YOU'){
			 url = url + '/recommend/' + (params.uid != undefined ? params.uid : "") + "?";
			 url = appendLocId(url);
		}else if(params.boxType == 'TOP_SELLERS'){
			 url = url + '/top-sellers/?';
			 // url = appendUid(url);
			 url = appendLocId(url);
		}else if(params.boxType == 'CATEGORY_TOP_SELLERS'){
			 url = url + '/category-top-sellers/' + params.category + "/?";
			 // url = appendUid(url);
			 url = appendLocId(url);
		}else if(params.boxType == 'BRAND_TOP_SELLERS'){
			 url = url + '/brand-top-sellers/' + params.brand + "/?";
			 // url = appendUid(url);
			 url = appendLocId(url);
		}else if(params.boxType == 'PDP_TOP_SELLERS'){
			 url = url + '/pdp-top-sellers/' + params.pid + "/?";
			 // url = appendUid(url);
			 url = appendLocId(url);
		}else if(params.boxType == 'RECENTLY_VIEWED'){
			 url = url + '/recently-viewed/' + params.uid + "/?";
		}else if(params.boxType == 'ALSO_VIEWED'){
			 url = url + '/also-viewed/' + params.pid + "/?";
			 // url = appendUid(url);
		}else if(params.boxType == 'ALSO_BOUGHT'){
			 url = url + '/also-bought/' + params.pid + "/?";
			 // url = appendUid(url);
		}else if(params.boxType == 'MORE_LIKE_THESE'){
			 url = url + '/more-like-these/' + params.pid + "/?";
			 // url = appendUid(url);
		}else if(params.boxType == 'CART_RECOMMEND'){
			 url = url + '/recommend_cart/' + params.uid + "/?";
		}

		return url;
	}

	this.getResults = function(callback){
		aggregatorClient.getSite(iSiteName, function(err, site){
			if(err){
				logger.error(err);
				sendEmptyResponse(callback);
			}else{
				ref.site = site;

				if(site["widgetsOffDevices"] && params.format == 'html'){
					if(site["widgetsOffDevices"]["mobile"] == true && params.mobile){
						logger.info("detected mobile device. Disabled. device : " + params.mobile + ", Params : " + JSON.stringify(params));
						sendEmptyResponse(callback);
						return;	
					}
				}

				var url = generateUrl(site['region'] || 'apac');
				var headers = {"Accept": "application/json"}
				if(params.uid){
					headers["X-UID"] = params.uid
				}

				logger.trace("Calling : " + url);
				var separateReqPool = {maxSockets: 20};
				request({url : url, headers : headers, pool:separateReqPool}, handleResponse(callback));
			}
		});		
	}
}

module.exports = RecommenderClient;
