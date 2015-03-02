var request = require('request');

var logger = require(LIB_DIR + 'log_factory').create("auditor_client");

var AuditorClient = function(){

	this.push = function(topic, entity, actor, fromState, toState, comments){
		var url = CONFIG['auditor.url'] + topic;
		request.post({
			url : url, 
			json : {
				entity : entity,
				actor : actor,
				"from_state" : fromState,
				"to_state" : toState,
				comments : comments 
			}
		}, function(error, response, body){
			if(error){
				logger.error('problem with posting data to auditor: ' + error.message + " url : " + url);
			}else{
				if(response.statusCode != 204){
					logger.warn("Post to Auditor. Status : " + response.statusCode)
				}
			}
		});
	}
}

module.exports = new AuditorClient();