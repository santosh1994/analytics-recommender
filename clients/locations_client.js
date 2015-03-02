var _ = require('underscore');
var request = require('request');

var logger = require(LIB_DIR + 'log_factory').create("location_client");

var LocationsClient = function(){
	this.lookup = function(ip, callback){
		var url = "http://" + CONFIG['locations.host'] + '/' + ip;
		request.get({url : url}, function(error, response, body){
			if(error){
				logger.error('problem while ip lookup : ' + error.message + " url : " + url);
				callback(error);
			}else{
				if(response.statusCode != 200){
					logger.warn("IP lookup. Status : " + response.statusCode)
					callback(response.statusCode);
				}else{
					try{
						callback(null, JSON.parse(body));
					}catch(e){
						callback(e);
					}
				}
			}
		});
	}
};

module.exports = new LocationsClient();