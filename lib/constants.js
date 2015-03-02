var settings = require("./../settings");

CONFIG = {};
for(var key in settings) {
  if(settings.hasOwnProperty(key)) {
    CONFIG[key] = settings[key];
  }
}

/**
 * Paths
 */
LIB_DIR = __dirname + '/';
IMPL_DIR = __dirname + '/../impls/';
CLIENTS_DIR = __dirname + '/../clients/';
VIEWS_DIR = __dirname + '/../views/';

/**
 * Environment related
 */
ENVIRONMENT = process.env.NODE_ENV;
IS_PROD = ENVIRONMENT == 'production';

COUNT = 0;