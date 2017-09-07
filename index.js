/* eslint-env node */
'use strict';

module.exports = {
	name: 'ember-task-scheduler',

	importPolyfill: function(app) {
		var polyfill = 'vendor/performance-polyfill.js';

		if (this.import) {  // support for ember-cli >= 2.7
			this.import(polyfill, { prepend: true });
		} else if (app.import) { // support ember-cli < 2.7
			app.import(polyfill, { prepend: true });
		} else {
			console.warn('Please run: ember install ember-cli-import-polyfill');
		}
	},

	included: function(app) {
		this._super.included.apply(this, arguments);
		this.app = app;
		this.importPolyfill(app);
	}

};
