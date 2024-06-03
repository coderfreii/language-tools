try {
	module.exports = require('./out/nodeClientMain');
} catch (e) {
	module.exports = require('./dist/client');
}
