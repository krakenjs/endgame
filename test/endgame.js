'use strict';

var test = require('tape').test,
    EventEmitter = require('events').EventEmitter,
    endgame = require('../');


test('endgame', function (t) {

    var UE, count;

    UE = 'uncaughtException';
    count = EventEmitter.listenerCount.bind(null, process, UE);

    function peek() {
        return process.listeners(UE)[0];
    }

    function prepareListeners() {
        var listeners = process.listeners(UE);
        process.removeAllListeners(UE);

        return function resetListeners() {
            process.removeAllListeners(UE);
            listeners.forEach(process.on.bind(process, UE));
            listeners = undefined;
        };
    }


    function prepareExit(fn) {
        var exit = process.exit;
        process.exit = function () {
            fn.apply(null, arguments);
        };

        return function resetExit() {
            process.exit = exit;
        };
    }


    function prepareStderr(fn) {
        var write = process.stderr.write;

        process.stderr.write = function write(data) {
            fn.apply(null, arguments);
            return true;
        };

        return function resetStderr() {
            process.stderr.write = write;
        }
    }


    t.test('no handler', function (t) {
        var resetListeners = prepareListeners();

        t.equal(count(), 0, 'no handlers registered');
        endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        resetListeners();
        t.end();
    });


    t.test('existing handler', function (t) {
        t.equal(count(), 1, 'one handler registered');
        endgame();
        t.equal(count(), 1, 'one handler still registered');
        t.notEqual(peek().name, 'failsafe', 'handler is not endgame handler');
        t.end();
    });


    t.test('late handler', function (t) {
        var resetListeners = prepareListeners();

        t.equal(count(), 0, 'no handlers registered');
        endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        process.on(UE, function noop() {
            // foo
        });

        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'noop', 'handler is alternate handler');

        resetListeners();
        t.end();
    });



    t.test('handle', function (t) {
        var resetListeners, resetStderr, resetExit, errmsg;

        resetListeners = prepareListeners();

        resetStderr = prepareStderr(function data(msg) {
            typeof errmsg == 'string' ? errmsg += msg : errmsg = msg;
        });

        resetExit = prepareExit(function onexit(code) {
            resetExit();
            resetListeners();
            resetStderr();

            t.equal(code, 1, 'correct exit code');
            t.ok(errmsg.match('uncaughtException'), 'err message is uncaught exception');
            t.ok(errmsg.match('y u no work?'), 'error is custom error');
            t.end();
        });

        t.equal(count(), 0, 'no handlers registered');
        endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        setImmediate(function () {
            throw new Error('y u no work?');
        });
    });


    t.test('undo', function (t) {
        var resetListeners, undo;
        resetListeners = prepareListeners();

        t.equal(count(), 0, 'no handlers registered');

        undo = endgame();

        t.equal(typeof undo, 'function');
        t.equal(count(), 1, 'handler is endgame handler');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        undo();

        t.equal(count(), 0, 'no handlers registered');

        resetListeners();
        t.end();
    });


    t.test('other events', function (t) {
        var resetListeners, undo;

        resetListeners = prepareListeners();

        t.equal(count(), 0, 'no handlers registered');
        undo = endgame();

        t.equal(count(), 1, 'one handler registered');
        process.on('foo', function noop(msg) {
            t.equal(msg, 'foo', 'event triggered');
        });

        undo();
        t.equal(count(), 0, 'no handlers registered');

        process.emit('foo', 'foo');
        resetListeners();
        t.end();
    });


    t.test('multiple invocations', function (t) {
        var resetListeners = prepareListeners();

        t.equal(count(), 0, 'no handlers registered');

        endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        resetListeners();
        t.end();
    });


    t.test('multiple undo', function (t) {
        var resetListeners, undo1, undo2;

        resetListeners = prepareListeners();

        t.equal(count(), 0, 'no handlers registered');

        undo1 = endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        undo2 = endgame();
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'failsafe', 'handler is endgame handler');

        undo2();
        t.equal(count(), 0, 'no handlers registered');

        undo1();
        t.equal(count(), 0, 'no handlers registered');

        resetListeners();
        t.end();
    });


    t.test('custom handler', function (t) {
        var resetListeners, undo;

        function custom() {
            console.log('foo');
        }

        resetListeners = prepareListeners();
        t.equal(count(), 0, 'no handlers registered');

        undo = endgame(custom);
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'custom', 'handler is alternate handler');

        undo();
        t.equal(count(), 0, 'no handlers registered');

        resetListeners();
        t.end();
    });


    t.test('multiple custom handler (only first one is used)', function (t) {
        var resetListeners, undo1, undo2;

        function custom1() {
            console.log('foo');
        }

        function custom2() {
            console.log('bar');
        }

        resetListeners = prepareListeners();
        t.equal(count(), 0, 'no handlers registered');

        undo1 = endgame(custom1);
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'custom1', 'registered handler is initial handler');

        // noop
        undo2 = endgame(custom2);
        t.equal(count(), 1, 'one handler registered');
        t.equal(peek().name, 'custom1', 'registered handler is initial handler');

        // noop
        undo2();
        t.equal(count(), 1, 'one handler registered');

        undo1();
        t.equal(count(), 0, 'no handlers registered');

        resetListeners();
        t.end();
    });

});