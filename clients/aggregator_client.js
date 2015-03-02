var _ = require('underscore');
var request = require('request');

var logger = require(LIB_DIR + 'log_factory').create("aggregator_client");

var AggregatorClient = function() {
    this.sitesCache = {};

    var ref = this;

    setInterval(function() {
        // ref.sitesCache = {};
        logger.debug("Updating sites cache");
        _.each(ref.sitesCache, function(value, key, list) {
            var iSiteName = key;
            var url = "http://" + CONFIG['aggregator.host'] + CONFIG['aggregator.sites.path'] + '/get-site/' + iSiteName + "?templateOpts=true";
            request({
                url: url,
                headers: {
                    "Accept": "application/json"
                }
            }, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var obj = JSON.parse(body);
                    var sites = obj['Sites'];
                    // Handle single object in response
                    if (sites && !_.isArray(sites))
                        sites = [sites];

                    var site = sites[0];
                    ref.sitesCache[iSiteName] = site;
                    logger.debug("Updated site cache for " + iSiteName);
                } else {
                    if (error) {
                        logger.error('problem with fetching site: ' + error);
                    } else {
                        logger.warn("Get Site. Status : " + response.statusCode);
                    }
                }
            });

        });
    }, 180 * 1000); // Every 3 minutes

    this.getSite = function(iSiteName, callback) {
        var ref = this;
        if (_.has(this.sitesCache, iSiteName) === true) {
            callback(null, this.sitesCache[iSiteName]);
            return;
        } else {
            logger.info("Coudn't find " + iSiteName + " in cache");
        }

        var url = "http://" + CONFIG['aggregator.host'] + CONFIG['aggregator.sites.path'] + '/get-site/' + iSiteName + "?templateOpts=true";
        request({
            url: url,
            headers: {
                "Accept": "application/json"
            }
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var obj = JSON.parse(body);
                var sites = obj['Sites'];
                // Handle single object in response
                if (sites && !_.isArray(sites))
                    sites = [sites];

                var site = sites[0];
                ref.sitesCache[iSiteName] = site;
                callback(null, site);
            } else {
                if (error) {
                    logger.error('problem with fetching site: ' + error);
                    callback({
                        code: 500,
                        body: error
                    });
                } else {
                    logger.warn("Get Site. Status : " + response.statusCode);
                    callback({
                        code: response.statusCode,
                        body: body
                    });
                }
            }
        });
    }

    var payload = {}
    var payloadCount = 0;

    var flushPayload = function() {
        var url = "http://" + CONFIG['aggregator.host'] + '/analytics-aggregator/categorize-query/recommendations';
        var data = payload;
        logger.info('url : ' + url + ', payload : ' + data);
        request.post({
            url: url,
            json: data,
            headers: {
                "Accept": "application/json"
            }
        }, function(error, response, body) {
            if (error) {
                logger.error('problem with sending hits : ' + error.message + " url : " + url + ', payload : ' + JSON.stringify(data));
            } else {
                if (response.statusCode != 204) {
                    logger.warn("Post to Aggregator. Status : " + response.statusCode)
                }
            }
        });
    }

    this.sendHits = function(iSiteName, params) {
        payload[iSiteName] = payload[iSiteName] || [];
        payload[iSiteName].push(params);

        if (++payloadCount >= 10) {
            flushPayload();
            payload = {};
            payloadCount = 0;
        }
    }
}

module.exports = new AggregatorClient();