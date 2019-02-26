module.exports = require('./lib/model');
module.exports.configureModel = require('./lib/model').configureModel;
module.exports.restApi = require('./lib/model/restApi').default;
module.exports.normalActions = require('./lib/model/normalActions').default;
module.exports.setRequestHeaders = require('./lib/model').setRequestHeaders;
