var log4js = require('log4js');
var _ = require('underscore');

log4js.configure('log4js.json', { cwd: CONFIG['log.dir'], reloadSecs: 60 });

exports.create = function(path){
	return new log4js.getLogger(path);
};