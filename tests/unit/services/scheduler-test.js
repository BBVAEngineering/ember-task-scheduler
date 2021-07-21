/* eslint no-magic-numbers:0 */
import { scheduleOnce } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { settled, waitUntil } from '@ember/test-helpers';
import sinon from 'sinon';

module('Unit | Service | scheduler', (hooks) => {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.service = this.owner.factoryFor('service:scheduler').create({
      onError(e) {
        throw e;
      },
    });
  });

  hooks.afterEach(async function () {
    await waitUntil(() => !this.service.hasPendingTasks());
  });

  test('it computes milliseconds per frame', function (assert) {
    this.service.FPS = 60;

    assert.equal(this.service.millisecondsPerFrame, (1 / 60) * 1000);

    this.service.FPS = 30;

    assert.equal(this.service.millisecondsPerFrame, (1 / 30) * 1000);
  });

  test('it starts without tasks', function (assert) {
    assert.notOk(
      this.service.hasPendingTasks(),
      'service has no pending tasks'
    );
  });

  test('it returns when there are pending tasks', function (assert) {
    const func = () => {};

    this.service.schedule(func);

    assert.ok(this.service.hasPendingTasks(), 'service has pending tasks');
  });

  test('it schedules a task by function', async function (assert) {
    const func = sinon.mock().once();

    this.service.schedule(func);

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called with arguments');
  });

  test('it calls onError on task error', async function (assert) {
    const error = new Error();
    const onError = sinon.mock().once().withArgs(error);
    const func = () => {
      throw error;
    };

    this.service.onError = onError;

    this.service.schedule(func);

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(onError.verify(), 'onError is called on error');
  });

  test('it schedules a task by object and method string with arguments', async function (assert) {
    const func = sinon.mock().once().withArgs('foo', 'bar');
    const context = {
      func,
    };

    func.on(context);

    this.service.schedule(context, 'func', 'foo', 'bar');

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called on context with arguments');
  });

  test('it schedules a task by object and method function with arguments', async function (assert) {
    const context = Object.create(null);
    const func = sinon.mock().once().on(context).withArgs('foo', 'bar');

    this.service.schedule(context, func, 'foo', 'bar');

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called on context with arguments');
  });

  test('it throws an error when cannot find a method', function (assert) {
    assert.throws(() => {
      this.service.schedule(null, 'func', 'foo', 'bar');
    }, 'error is thrown when method on target is null');

    assert.throws(() => {
      this.service.schedule({ func: 'method' }, 'func', 'foo', 'bar');
    }, 'error is thrown when method on target is not a function');

    assert.throws(() => {
      this.service.schedule();
    }, 'error is thrown when called without method');
  });

  test('it schedules small tasks on same frame', async function (assert) {
    assert.expect(1);

    let currentInstance;
    const func = () => {
      currentInstance = this.service._currentInstance;
    };
    const func2 = () => {
      assert.equal(
        this.service._currentInstance,
        currentInstance,
        'function executes on same frame'
      );
    };

    this.service.FPS = 15; // configure scheduler to prevent slow computing fail.

    this.service.schedule(func);
    this.service.schedule(func2);

    await waitUntil(() => !this.service.hasPendingTasks());
  });

  test('it schedules heavy tasks on several frames', async function (assert) {
    assert.expect(1);

    let currentInstance;
    const func = () => {
      currentInstance = this.service._currentInstance;
      Array(10000000).fill(0); // eslint-disable-line no-magic-numbers
    };
    const func2 = () => {
      assert.notEqual(
        this.service._currentInstance,
        currentInstance,
        'function executes on next frame'
      );
    };

    this.service.FPS = 120; // configure scheduler to prevent slow computing fail.

    this.service.schedule(func);
    this.service.schedule(func2);

    await waitUntil(() => !this.service.hasPendingTasks());
  });

  test('it continues executing next task when first fails', async function (assert) {
    assert.expect(1);

    const func = () => {
      throw new Error();
    };
    const func2 = () => {
      assert.ok(true, 'func2 is called');
    };

    this.service.onError = null;

    this.service.schedule(func);
    this.service.schedule(func2);

    await waitUntil(() => !this.service.hasPendingTasks());
  });

  test('it throttles same task and changes arguments', async function (assert) {
    const func = sinon.mock().once().withArgs('bar');
    const context = {
      func,
    };

    this.service.schedule(context, 'func', 'foo');
    this.service.scheduleOnce(context, 'func', 'bar');

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called once with arguments');
  });

  test('it cancels a pending task', async function (assert) {
    const func = sinon.mock().never();

    this.service.schedule(func);

    this.service.cancel(func);

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is never called');
  });

  test('it cannot cancel a finished task', async function (assert) {
    const func = sinon.mock().once();

    this.service.schedule(func);

    await waitUntil(() => !this.service.hasPendingTasks());

    this.service.cancel(func);

    assert.ok(func.verify(), 'func is called');
  });

  test('it can schedule a task inside another task on same frame', async function (assert) {
    const func = sinon.mock().once();
    const func2 = () => {
      this.service.schedule(func);
    };

    this.service.schedule(func2);

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called');
  });

  test('it can cancel a task inside another task', async function (assert) {
    const func = sinon.mock().never();
    const func2 = () => {
      this.service.cancel(func);
    };

    this.service.schedule(func2);
    this.service.schedule(func);

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called');
  });

  test('it schedules a task inside a full ember run loop', async function (assert) {
    const func = sinon.mock().once();
    const func2 = () => {
      scheduleOnce('afterRender', func);
    };

    this.service.schedule(func2);

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called');
  });

  test('it does not cancels a pending task if does not match', async function (assert) {
    const func = sinon.mock().once();

    this.service.schedule(func);

    this.service.cancel(() => {});

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called once');
  });

  test('it throttles same task and changes arguments with once', async function (assert) {
    const func = sinon.mock().once().withArgs('bar');
    const context = {
      func,
    };

    this.service.scheduleOnce(context, 'func', 'foo');
    this.service.scheduleOnce(context, 'func', 'bar');

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func.verify(), 'func is called once with arguments');
  });

  test('it does not throttle two different tasks', async function (assert) {
    const func1 = sinon.stub();
    const func2 = sinon.stub();
    const context = {
      func1,
      func2,
    };

    this.service.scheduleOnce(context, 'func1', 'foo');
    this.service.scheduleOnce(context, 'func2', 'bar');

    await waitUntil(() => !this.service.hasPendingTasks());

    assert.ok(func1.calledOnce, 'func1 is called once with arguments');
    assert.ok(func2.calledOnce, 'func2 is called once with arguments');
  });

  test('it waits for settled', async function (assert) {
    const func = sinon.mock().thrice();

    this.service.schedule(func);
    this.service.schedule(func);
    this.service.schedule(func);

    await settled();

    assert.ok(func.verify(), 'func is called with arguments');
  });
});
