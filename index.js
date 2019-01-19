'use strict';

var EventEmitter = require('events').EventEmitter;


var UNCAUGHT = 'uncaughtException', // sooo lazy
    NEW = 'newListener';


function failsafe(err) {
    console.error(new Date().toUTCString(), UNCAUGHT, err.message);
    console.error(err.stack);
    process.exit(1);
}


function unlistener(handler) {
    return function unlisten(event, listener) {
        if (event === UNCAUGHT && listener !== handler) {
            process.removeListener(UNCAUGHT, handler);
            process.removeListener(NEW, unlisten);
        }
    };
}


/**
 * Configures a default `uncaughtException` handler, but removes itself should
 * a handler be added elsewhere.
 */
module.exports = function endgame(handler) {
    var undo,
        numberOfListeners;

    handler = handler || failsafe;
    undo = unlistener(handler);

    numberOfListeners = Object.prototype.hasOwnProperty.call(EventEmitter, 'listenerCount')
        ? EventEmitter.listenerCount(process, UNCAUGHT)
        : process.listenerCount(UNCAUGHT);

    if (!numberOfListeners) {
        process.on(UNCAUGHT, handler);
        process.on(NEW, undo);
    }

    return undo.bind(null, UNCAUGHT, undefined);
};
