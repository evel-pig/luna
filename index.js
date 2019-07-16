module.exports = require('./lib/app').default;
module.exports.useDispatch = require('react-redux').useDispatch;
module.exports.useSelector = require('react-redux').useSelector;
module.exports.useModel = require('./lib/hooks/useModel').default;
module.exports.useApi = require('./lib/hooks/useApi').default;
