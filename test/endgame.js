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

        t.equal(count(), 0);
        endgame();
        t.equal(count(), 1);
        t.equal(peek().name, 'failsafe');

        resetListeners();
        t.end();
    });


    t.test('existing handler', function (t) {
        t.equal(count(), 1);
        endgame();
        t.equal(count(), 1);
        t.notEqual(peek().name, 'failsafe');
        t.end();
    });


    t.test('late handler', function (t) {
        var resetListeners = prepareListeners();

        t.equal(count(), 0);
        endgame();
        t.equal(count(), 1);
        t.equal(peek().name, 'failsafe');

        process.on(UE, function noop() {
            // foo
        });

        t.equal(count(), 1);
        t.equal(peek().name, 'noop');

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

            t.equal(code, 1);
            t.ok(errmsg.match('uncaughtException'));
            t.ok(errmsg.match('y u no work?'));
            t.end();
        });

        t.equal(count(), 0);
        endgame();
        t.equal(count(), 1);
        t.equal(peek().name, 'failsafe');

        setImmediate(function () {
            throw new Error('y u no work?');
        });
    });


    t.test('undo', function (t) {
        var resetListeners, undo;
        resetListeners = prepareListeners();

        t.equal(count(), 0);

        undo = endgame();

        t.equal(typeof undo, 'function');
        t.equal(count(), 1);
        t.equal(peek().name, 'failsafe');

        undo();

        t.equal(count(), 0);

        resetListeners();
        t.end();
    });


    t.test('other events', function (t) {
        var resetListeners, undo;

        resetListeners = prepareListeners();

        t.equal(count(), 0);
        undo = endgame();

        t.equal(count(), 1);
        process.on('foo', function noop(msg) {
            t.equal(msg, 'foo');
        });

        undo();
        t.equal(count(), 0);

        process.emit('foo', 'foo');
        resetListeners();
        t.end();
    });

});