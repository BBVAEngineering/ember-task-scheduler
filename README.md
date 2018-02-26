# ember-task-scheduler

[![Build Status](https://travis-ci.org/BBVAEngineering/ember-task-scheduler.svg?branch=master)](https://travis-ci.org/BBVAEngineering/ember-task-scheduler)
[![GitHub version](https://badge.fury.io/gh/BBVAEngineering%2Fember-task-scheduler.svg)](https://badge.fury.io/gh/BBVAEngineering%2Fember-task-scheduler)
[![npm version](https://badge.fury.io/js/ember-storages.svg)](https://badge.fury.io/js/ember-task-scheduler)
[![Dependency Status](https://david-dm.org/BBVAEngineering/ember-task-scheduler.svg)](https://david-dm.org/BBVAEngineering/ember-task-scheduler)

An [ember-cli addon](http://www.ember-cli.com/) to schedule tasks to try to preserve 60 FPS rate on browsers.

## Information

[![NPM](https://nodei.co/npm/ember-task-scheduler.png?downloads=true&downloadRank=true)](https://nodei.co/npm/ember-task-scheduler/)

## Install in ember-cli application

In your application's directory:

    ember install ember-task-scheduler

## Usage

```javascript
// Inject the service
scheduler: Ember.inject.service(),
```

```javascript
// To schedule a callback you can use the same syntax as with Ember.run.
this.get('scheduler').schedule(this, 'method', arg1, arg2);

// To schedule a unique method.
this.get('scheduler').scheduleOnce(this, 'method', arg1, arg2);

// You can also run callbacks without context.
this.get('scheduler').schedule(() => {
  // Do job here.
});

// All exceptions will be throw to Ember.onerror method.
```

## Configuration

To setup, you can set the following variables on `config/environment` file:

```json
{
taskScheduler: {
    FPS: 60
  }
}

```

If variables are unset, the will default to above configuration.

## Motivation

When using `requestAnimationFrame` method, there are some problems when developing big applications.

Some times, `requestAnimationFrame` method will be executed several times on same browser frame. This will make the browser to execute all code on the next available frame. This can cause the browser to freeze due to the lack of frame scheduling.

This addon will handle this type of scheduling by running a FIFO queue with callbacks. On other words, when you run `schedule` method twice on same frame. This addon will try to execute the first callback on the next available frame and, if the frame can fit the next callback (execution under 60 FPS rate), will try run it. Otherwise, it will be executed on the next available frame.

## Contribute

If you want to contribute to this addon, please read the [CONTRIBUTING.md](CONTRIBUTING.md).

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/BBVAEngineering/ember-task-scheduler/tags).


## Authors

See the list of [contributors](https://github.com/BBVAEngineering/ember-task-scheduler/graphs/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
