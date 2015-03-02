var _ = require('underscore');
var logger = require(LIB_DIR + 'log_factory').create("exchange_rates_client");
var request = require('request');

var ExchangeRatesClient = function (iSiteName, params){

	var rates = {};

	var ref = this;
	setInterval(function(){
		ref.fetch();
		logger.debug("re-populated exchange rates");
	}, 60 * 60 * 6 * 1000); // 6 Hrs


	this.fetch = function(){
		var url = 'https://openexchangerates.org/api/latest.json?app_id=cb6e303f7ffb4170a7f24fde7f4c8067';
		request({url : url}, function(error, response, body){
			if (!error && response.statusCode == 200) {
				var obj = JSON.parse(body);
				rates = obj['rates'];

				logger.info("Fetched exchange rates");
			}
		});
	}

	this.convert = function(amount, from, to){
		try{
			if(!_.isNumber(amount)){
				amount = parseInt(amount);
			}

			if(from.trim() == 'USD'){
				if(rates[to.trim()]){
					amount = amount * rates[to.trim()]; 	
				}
			}else{
				if(rates[from.trim()] && rates[to.trim()]){
					amount = amount * (rates[to.trim()] / rates[from.trim()]); 	
				}
			}

			amount = Math.round(amount * 100) / 100
		}catch(e){
			logger.error(e);
		}

		return amount;
	}

	this.fetch();
}

module.exports = new ExchangeRatesClient();