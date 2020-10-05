/* eslint no-magic-numbers:0 */
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { waitUntil } from '@ember/test-helpers';
import sinon from 'sinon';

let service;

module('Unit | Service | scheduler', (hooks) => {
	setupTest(hooks);

	hooks.beforeEach(function() {
		service = this.owner.factoryFor('service:scheduler').create({
			onError(e) {
				throw e;
			}
		});
	});

	test('it computes milliseconds per frame', (assert) => {
		service.set('FPS', 60);

		assert.equal(service.get('millisecondsPerFrame'), 1 / 60 * 1000);

		service.set('FPS', 30);

		assert.equal(service.get('millisecondsPerFrame'), 1 / 30 * 1000);
	});

	test('it starts without tasks', (assert) => {
		assert.notOk(service.hasPendingTasks(), 'service has no pending tasks');
	});

	test('it returns when there are pending tasks', (assert) => {
		const func = () => {};

		service.schedule(func);

		assert.ok(service.hasPendingTasks(), 'service has pending tasks');
	});

	test('it schedules a task by function', async(assert) => {
		const func = sinon.mock().once();

		service.schedule(func);

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called with arguments');
	});

	test('it calls onError on task error', async(assert) => {
		const error = new Error();
		const onError = sinon.mock().once().withArgs(error);
		const func = () => {
			throw error;
		};

		service.set('onError', onError);

		service.schedule(func);

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(onError.verify(), 'onError is called on error');
	});

	test('it schedules a task by object and method string with arguments', async(assert) => {
		const func = sinon.mock().once().withArgs('foo', 'bar');
		const context = {
			func
		};

		func.on(context);

		service.schedule(context, 'func', 'foo', 'bar');

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called on context with arguments');
	});

	test('it schedules a task by object and method function with arguments', async(assert) => {
		const context = Object.create(null);
		const func = sinon.mock().once().on(context).withArgs('foo', 'bar');

		service.schedule(context, func, 'foo', 'bar');

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called on context with arguments');
	});

	test('it throws an error when cannot find a method', (assert) => {
		assert.throws(() => {
			service.schedule(null, 'func', 'foo', 'bar');
		}, 'error is thrown when method on target is null');

		assert.throws(() => {
			service.schedule({ func: 'method' }, 'func', 'foo', 'bar');
		}, 'error is thrown when method on target is not a function');

		assert.throws(() => {
			service.schedule();
		}, 'error is thrown when called without method');
	});

	test('it schedules small tasks on same frame', async(assert) => {
		let currentInstance;
		const func = () => {
			currentInstance = service.get('_currentInstance');
		};
		const func2 = () => {
			assert.equal(service.get('_currentInstance'), currentInstance, 'function executes on same frame');
		};

		service.set('FPS', 15); // configure scheduler to prevent slow computing fail.

		service.schedule(func);
		service.schedule(func2);

		await waitUntil(() => !service.hasPendingTasks());
	});

	test('it schedules heavy tasks on several frames', async(assert) => {
		let currentInstance;
		const func = () => {
			currentInstance = service.get('_currentInstance');
			Array(10000000).fill(0); // eslint-disable-line no-magic-numbers
		};
		const func2 = () => {
			assert.notEqual(service.get('_currentInstance'), currentInstance, 'function executes on next frame');
		};

		service.set('FPS', 120); // configure scheduler to prevent slow computing fail.

		service.schedule(func);
		service.schedule(func2);

		await waitUntil(() => !service.hasPendingTasks());
	});

	test('it continues executing next task when first fails', async(assert) => {
		const func = () => {
			throw new Error();
		};
		const func2 = () => {
			assert.ok(true, 'func2 is called');
		};

		service.set('onError', null);

		service.schedule(func);
		service.schedule(func2);

		await waitUntil(() => !service.hasPendingTasks());
	});

	test('it throttles same task and changes arguments', async(assert) => {
		const func = sinon.mock().once().withArgs('bar');
		const context = {
			func
		};

		service.schedule(context, 'func', 'foo');
		service.scheduleOnce(context, 'func', 'bar');

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called once with arguments');
	});

	test('it cancels a pending task', async(assert) => {
		const func = sinon.mock().never();

		service.schedule(func);

		service.cancel(func);

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is never called');
	});

	test('it cannot cancel a finished task', async(assert) => {
		const func = sinon.mock().once();

		service.schedule(func);

		await waitUntil(() => !service.hasPendingTasks());

		service.cancel(func);

		assert.ok(func.verify(), 'func is called');
	});

	test('it can schedule a task inside another task on same frame', async(assert) => {
		const func = sinon.mock().once();
		const func2 = () => {
			service.schedule(func);
		};

		service.schedule(func2);

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called');
	});

	test('it can cancel a task inside another task', async(assert) => {
		const func = sinon.mock().never();
		const func2 = () => {
			service.cancel(func);
		};

		service.schedule(func2);
		service.schedule(func);

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called');
	});

	test('it schedules a task inside a full ember run loop', async(assert) => {
		const func = sinon.mock().once();
		const func2 = () => {
			run.scheduleOnce('afterRender', func);
		};

		service.schedule(func2);

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called');
	});

	test('it does not cancels a pending task if does not match', async(assert) => {
		const func = sinon.mock().once();

		service.schedule(func);

		service.cancel(() => {});

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called once');
	});

	test('it throttles same task and changes arguments', async(assert) => {
		const func = sinon.mock().once().withArgs('bar');
		const context = {
			func
		};

		service.scheduleOnce(context, 'func', 'foo');
		service.scheduleOnce(context, 'func', 'bar');

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func.verify(), 'func is called once with arguments');
	});

	test('it does not throttle two different tasks', async(assert) => {
		const func1 = sinon.stub();
		const func2 = sinon.stub();
		const context = {
			func1,
			func2
		};

		service.scheduleOnce(context, 'func1', 'foo');
		service.scheduleOnce(context, 'func2', 'bar');

		await waitUntil(() => !service.hasPendingTasks());

		assert.ok(func1.calledOnce, 'func1 is called once with arguments');
		assert.ok(func2.calledOnce, 'func2 is called once with arguments');
	});
});
