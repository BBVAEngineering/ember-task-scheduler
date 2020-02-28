'use strict';

const path = require('path');

module.exports = {
	name: require('./package').name,

	importPolyfill(app) {
		const polyfill = path.join(__dirname, 'vendor/performance-polyfill.js'); // use absolute path to support monorepos

		if (this.import) { // support for ember-cli >= 2.7
			this.import(polyfill, { prepend: true });
		} else if (app.import) { // support ember-cli < 2.7
			app.import(polyfill, { prepend: true });
		} else {
			console.warn('Please run: ember install ember-cli-import-polyfill'); // eslint-disable
		}
	},

	included(app) {
		this._super.included.apply(this, arguments);
		this.app = app;
		this.importPolyfill(app);
	}
};
