#### endgame
A tiny module for ensuring uncaught exceptions are handled in Node.js.

#### Usage
##### Basic
Simply `require` and invoke.

```javascript
// failed.js
var endgame = require('endgame');

endgame();

throw new Error('y u no work?');

// Thu, 09 Jan 2014 20:03:18 GMT uncaughtException y u no work?
// Error: y u no work?
//    at Object._onImmediate (/Users/me/src/git/myapp/failed.js:7:0)
//    at processImmediate [as _immediateCallback] (timers.js:330:15)
```

##### Undo
If an `uncaughtException` handler has already been registered, `endgame` becomes a noop. If an `uncaughtException` handler
is registered *after* `endgame` has been invoked, `endgame`'s default handler is automatically removed in favor of the newly
registered handler.


`endgame` also returns a function that can be invoked to undo `endgame`'s behavior.
```javascript
// undo.js
var endgame = require('endgame'),
    undo = endgame();

// do stuff and decide to revert `endgame` changes

undo();
```


##### Custom handler
```javascript
// custom.js
var endgame, undo;

endgame = require('endgame');
undo = endgame(function (err) {
    console.error(err.message);
    process.exit(1);
});

// ...

// implicit endgame undo
process.on('uncaughtException', function (err) {
    console.error(JSON.stringify(err)));
    process.exit(1);
});

// or `undo();`

```