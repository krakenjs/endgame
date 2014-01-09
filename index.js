'use strict';

var EventEmitter = require('events').EventEmitter;


var UNCAUGHT = 'uncaughtException', // sooo lazy
    NEW = 'newListener';


function failsafe(err) {
    console.error(new Date().toUTCString(), UNCAUGHT, err.message);
    console.error(err.stack);
    process.exit(1);
}


function unlisten(event, listener) {
    if (event === UNCAUGHT && listener !== failsafe) {
        process.removeListener(UNCAUGHT, failsafe);
        process.removeListener(NEW, unlisten);
    }
}


/**
 * Configures a default `uncaughtException` handler, but removes itself should
 * a handler be added elsewhere.
 */
module.exports = function endgame() {
    if (!EventEmitter.listenerCount(process, UNCAUGHT)) {
        process.on(UNCAUGHT, failsafe);
        process.on(NEW, unlisten);
    }

    return unlisten.bind(null, UNCAUGHT, undefined);
};