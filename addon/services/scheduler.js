import Ember from 'ember';

const FPS = 60;
const MILLISECONDS = 1000;
const {
	Service,
	run,
	assert,
	computed,
	warn,
	onerror,
	getOwner
} = Ember;
const {
	requestAnimationFrame,
	cancelAnimationFrame,
	performance
} = window;

/**
 * Bind context to method and call requestAnimationFrame with generated function.
 *
 * @method scheduleFrame
 * @param {Object} context
 * @param {String} method
 * @return Number
 * @private
 */
function scheduleFrame(context, method) {
	method = context[method];

	return requestAnimationFrame(method.bind(context));
}

/**
 * Try to exec a function with target and args.
 *
 * When function throws an error it calls onError function with error and stack.
 *
 * @method exec
 * @param {Object} target
 * @param {Function|String} method
 * @param {Array} args
 * @param {Function} onError
 * @param {Error} stack
 * @private
 */
function exec(target, method, args, onError, stack) {
	try {
		method.apply(target, args);
	} catch (e) {
		if (onError) {
			onError(e, stack);
		}
	}
}

function _logWarn(title, stack, test, options) {
	if (test) {
		return;
	}

	const { groupCollapsed, log, trace, groupEnd } = console;

	if (groupCollapsed && trace && groupEnd) {
		groupCollapsed(title);
		log(options.id);
		trace(stack.stack);
		groupEnd(title);
	} else {
		warn(`${title}\n${stack.stack}`, test, options);
	}
}

/**
 * Service that schedules tasks into browser frames within a given FPS rate.
 *
 * When there are several tasks that fits into the same frame, it tries to execute them.
 * Otherwise, when there are heavy tasks, it tries to spare them into several frames.
 *
 * Methods:
 *  * schedule: add a task into the scheduler.
 *  * scheduleOnce: add a unique task into the scheduler.
 *  * cancel [Array]: array with deleted tasks. Format of each item: [target, method, args].
 *  * hasPendingTasks [Boolean]: return true when there are pending tasks.
 *
 * @namespace App
 * @class SchedulerService
 * @extends Ember.Service
 * @public
 */
export default Service.extend({

	/**
	 * Proxy to app environment configuration.
	 *
	 * @property config
	 * @type Object
	 */
	config: computed(function() {
		return getOwner(this).resolveRegistration('config:environment');
	}).readOnly(),

	/**
	 * Setup number of frames per second.
	 *
	 * @property FPS
	 * @type Number
	 * @public
	 */
	FPS: computed.reads('config.taskScheduler.FPS'),

	/**
	 * On error hook executed when a task fails.
	 *
	 * @method onError
	 * @param {Error} e
	 * @public
	 */
	onError: onerror,

	/**
	 * Array of tasks of the instance.
	 *
	 * @property _tasks
	 * @type Array
	 * @private
	 */
	_tasks: null,

	/**
	 * ID of the current frame.
	 *
	 * @property _currentInstance
	 * @type Number
	 * @private
	 */
	_currentInstance: null,

	/**
	 * Computed value of milliseconds per frame of current FPS configuration.
	 *
	 * @property millisecondsPerFrame
	 * @type Float
	 * @public
	 */
	millisecondsPerFrame: computed('FPS', function() {
		const fps = this.get('FPS') || FPS;

		return 1 / fps * MILLISECONDS;
	}),

	/**
	 * Initializes array of tasks.
	 *
	 * @method init
	 */
	init() {
		this._super(...arguments);

		this.set('_tasks', []);
	},

	/**
	 * Return when has pending tasks.
	 *
	 * @method hasPendingTasks
	 * @returns Boolean
	 * @public
	 */
	hasPendingTasks() {
		return this.get('_tasks.length') !== 0;
	},

	/**
	 * Schedules a task into the scheduler.
	 *
	 * When first argument is a function it ignores the rest.
	 *
	 * @method schedule
	 * @param {Object} target
	 * @param {Function|String} method
	 * @param {...Mixed} args
	 * @public
	 */
	schedule() {
		const tasks = this.get('_tasks');
		const currentInstance = this.get('_currentInstance');

		tasks.push(this._sliceArguments(...arguments));

		if (!currentInstance) {
			this._begin();
		}
	},

	/**
	 * Schedule a unique task into the scheduler.
	 *
	 * When first argument is a function it ignores the rest.
	 *
	 * @method scheduleOnce
	 * @param {Object} target
	 * @param {Function|String} method
	 * @param {...Mixed} args
	 * @public
	 */
	scheduleOnce() {
		const currentInstance = this.get('_currentInstance');

		this._pushUnique(this._sliceArguments(...arguments));

		if (!currentInstance) {
			this._begin();
		}
	},

	/**
	 * Try to cancel a given task.
	 *
	 * When first argument is a function it ignores the rest.
	 *
	 * @method cancel
	 * @param {Object} target
	 * @param {Function|String} method
	 * @returns Array
	 * @public
	 */
	cancel() {
		const currentInstance = this.get('_currentInstance');
		const [target, method] = this._sliceArguments(...arguments);
		const tasks = this.get('_tasks');
		const removedTasks = [];
		const removedIndexes = [];

		// Find removable tasks.
		for (let i = 0; i < tasks.length; i++) {
			const [currentTarget, currentMethod] = tasks[i];

			if (currentTarget === target && currentMethod === method) {
				removedIndexes.push(i);
			}
		}

		// Remove tasks.
		for (let i = 0; i < removedIndexes.length; i++) {
			const index = removedIndexes[i];

			removedTasks.push(tasks.splice(index, 1));
		}

		if (currentInstance && tasks.length === 0) {
			this._end();
		}

		return removedTasks;
	},

	/**
	 * Push unique task into scheduler.
	 *
	 * When a duplicate is found, replace old arguments with new one.
	 *
	 * @method _pushUnique
	 * @param {Array} params
	 * @private
	 */
	_pushUnique(params) {
		const [target, method, args, stack] = params;
		const tasks = this.get('_tasks');

		for (let i = 0; i < tasks.length; i++) {
			const [currentTarget, currentMethod] = tasks[i];

			if (currentTarget === target && currentMethod === method) {
				tasks[i][2] = args; // replace args
				tasks[i][3] = stack; // eslint-disable-line no-magic-numbers
				return;
			}
		}

		tasks.push(params);
	},

	/**
	 * Begin a new frame scheduling loop.
	 *
	 * @method _begin
	 * @private
	 */
	_begin() {
		assert('Could not schedule a new frame. Scheduler instance is already started', !this.get('_currentInstance'));

		this.set('_currentInstance', scheduleFrame(this, '_loop'));
	},

	/**
	 * Schedule a new frame loop.
	 *
	 * @method _next
	 * @private
	 */
	_next() {
		assert('Could not schedule next frame. Scheduler instance is not running', this.get('_currentInstance'));
		assert('Could not schedule next frame. Scheduler has no tasks', this.hasPendingTasks());

		this.set('_currentInstance', scheduleFrame(this, '_loop'));
	},

	/**
	 * End current frame loop.
	 *
	 * If frame loop is not started, it will be canceled.
	 *
	 * @method _end
	 * @private
	 */
	_end() {
		const currentInstance = this.get('_currentInstance');

		assert('Could not stop scheduler. Service instance is not running', currentInstance);

		cancelAnimationFrame(currentInstance);

		this.set('_currentInstance', null);
	},

	/**
	 * Frame running loop. It tries to fit tasks in a given frame until frame takes too long.
	 *
	 * @method _loop
	 * @param {Float} startTime
	 * @private
	 */
	_loop(startTime) {
		if (this.isDestroyed) {
			return;
		}

		const millisecondsPerFrame = this.get('millisecondsPerFrame');
		const tasks = this.get('_tasks');
		let target, method, args, stack;

		assert('Could not run current loop. Service instance has no tasks.', tasks.length !== 0);

		do {
			[target, method, args, stack] = tasks.shift();

			this._exec(target, method, args, stack);
		} while (!this.isDestroyed && tasks.length > 0 && performance.now() - startTime < millisecondsPerFrame);

		// After exec, service could be destroyed. Recheck.
		if (this.isDestroyed) {
			return;
		}

		if (tasks.length > 0) {
			this._next();
			return;
		}

		const currentInstance = this.get('_currentInstance');

		if (currentInstance) {
			this._end();
		}
	},

	/**
	 * Execute function inside ember run loop.
	 *
	 * @method _exec
	 * @param {Object} target
	 * @param {Function|String} method
	 * @param {Mixed} args
	 * @param {Error} stack
	 * @private
	 */
	_exec(target, method, args, stack) {
		const env = this.get('config.environment');
		const millisecondsPerFrame = this.get('millisecondsPerFrame');
		const onError = this.get('onError');
		let startTime;

		if (env === 'development') {
			startTime = performance.now();
		}

		run.begin();

		exec(target, method, args, onError, stack);

		run.end();

		if (env === 'development') {
			const diff = performance.now() - startTime;

			_logWarn(
				`Scheduled callback took too long (${diff} ms)`,
				stack,
				diff < millisecondsPerFrame,
				{ id: 'ember-task-scheduler.services.callback-took-too-long' }
			);
		}
	},

	/**
	 * Parse arguments and try to extract target, method and args.
	 *
	 * When first argument is a function ignore the rest and set target to null.
	 *
	 * @method _sliceArguments
	 * @param {Object} target
	 * @param {Function|String} method
	 * @param {...Mixed} args
	 * @private
	 */
	_sliceArguments(target, method, ...args) {
		const env = this.get('config.environment');
		const length = arguments.length;

		if (length === 1) {
			method = target;
			target = null;
		}

		if (typeof method === 'string') {
			method = target[method];
		}

		const stack = env === 'development' ? new Error() : null;

		assert('Could not find a valid method to call', method && typeof method === 'function');

		return [target, method, args, stack];
	}

});
