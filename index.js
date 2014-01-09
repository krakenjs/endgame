'use strict';

var EventEmitter = require('events').EventEmitter;



function failsafe(err) {
    console.error(new Date().toUTCString(), 'uncaughtException', err.message);
    console.error(err.stack);
    process.exit(1);
}


function unlisten(event, listener) {
    if (event === 'uncaughtException' && listener !== failsafe) {
        process.removeListener('uncaughtException', failsafe);
        process.removeListener('newListener', unlisten);
    }
}


/**
 * Configures a default `uncaughtException` handler, but removes itself should
 * a handler be added elsewhere.
 */
module.exports = function lastresort(config) {
    if (!EventEmitter.listenerCount(process, 'uncaughtException')) {
        process.on('uncaughtException', failsafe);
        process.on('newListener', unlisten);
    }
};