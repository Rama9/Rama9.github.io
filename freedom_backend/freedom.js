/**
 * This is freedom.js. - https://freedomjs.org
 *
 * Copyright 2014 The freedom.js authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * @license apache2.0
 * @see https://freedomjs.org
 */
 
/** Version: 0.6.5 **/

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Promise = require("./promise/promise").Promise;
var polyfill = require("./promise/polyfill").polyfill;
exports.Promise = Promise;
exports.polyfill = polyfill;
},{"./promise/polyfill":5,"./promise/promise":6}],2:[function(require,module,exports){
"use strict";
/* global toString */

var isArray = require("./utils").isArray;
var isFunction = require("./utils").isFunction;

/**
  Returns a promise that is fulfilled when all the given promises have been
  fulfilled, or rejected if any of them become rejected. The return promise
  is fulfilled with an array that gives all the values in the order they were
  passed in the `promises` array argument.

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.resolve(2);
  var promise3 = RSVP.resolve(3);
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `RSVP.all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.reject(new Error("2"));
  var promise3 = RSVP.reject(new Error("3"));
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @for RSVP
  @param {Array} promises
  @param {String} label
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
*/
function all(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to all.');
  }

  return new Promise(function(resolve, reject) {
    var results = [], remaining = promises.length,
    promise;

    if (remaining === 0) {
      resolve([]);
    }

    function resolver(index) {
      return function(value) {
        resolveAll(index, value);
      };
    }

    function resolveAll(index, value) {
      results[index] = value;
      if (--remaining === 0) {
        resolve(results);
      }
    }

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && isFunction(promise.then)) {
        promise.then(resolver(i), reject);
      } else {
        resolveAll(i, promise);
      }
    }
  });
}

exports.all = all;
},{"./utils":10}],3:[function(require,module,exports){
(function (process,global){
"use strict";
var browserGlobal = (typeof window !== 'undefined') ? window : {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

// node
function useNextTick() {
  return function() {
    process.nextTick(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}

function useSetTimeout() {
  return function() {
    local.setTimeout(flush, 1);
  };
}

var queue = [];
function flush() {
  for (var i = 0; i < queue.length; i++) {
    var tuple = queue[i];
    var callback = tuple[0], arg = tuple[1];
    callback(arg);
  }
  queue = [];
}

var scheduleFlush;

// Decide what async method to use to triggering processing of queued callbacks:
if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else {
  scheduleFlush = useSetTimeout();
}

function asap(callback, arg) {
  var length = queue.push([callback, arg]);
  if (length === 1) {
    // If length is 1, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    scheduleFlush();
  }
}

exports.asap = asap;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":12}],4:[function(require,module,exports){
"use strict";
var config = {
  instrument: false
};

function configure(name, value) {
  if (arguments.length === 2) {
    config[name] = value;
  } else {
    return config[name];
  }
}

exports.config = config;
exports.configure = configure;
},{}],5:[function(require,module,exports){
(function (global){
"use strict";
/*global self*/
var RSVPPromise = require("./promise").Promise;
var isFunction = require("./utils").isFunction;

function polyfill() {
  var local;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof window !== 'undefined' && window.document) {
    local = window;
  } else {
    local = self;
  }

  var es6PromiseSupport = 
    "Promise" in local &&
    // Some of these methods are missing from
    // Firefox/Chrome experimental implementations
    "resolve" in local.Promise &&
    "reject" in local.Promise &&
    "all" in local.Promise &&
    "race" in local.Promise &&
    // Older version of the spec had a resolver object
    // as the arg rather than a function
    (function() {
      var resolve;
      new local.Promise(function(r) { resolve = r; });
      return isFunction(resolve);
    }());

  if (!es6PromiseSupport) {
    local.Promise = RSVPPromise;
  }
}

exports.polyfill = polyfill;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./promise":6,"./utils":10}],6:[function(require,module,exports){
"use strict";
var config = require("./config").config;
var configure = require("./config").configure;
var objectOrFunction = require("./utils").objectOrFunction;
var isFunction = require("./utils").isFunction;
var now = require("./utils").now;
var all = require("./all").all;
var race = require("./race").race;
var staticResolve = require("./resolve").resolve;
var staticReject = require("./reject").reject;
var asap = require("./asap").asap;

var counter = 0;

config.async = asap; // default async is asap;

function Promise(resolver) {
  if (!isFunction(resolver)) {
    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
  }

  if (!(this instanceof Promise)) {
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  this._subscribers = [];

  invokeResolver(resolver, this);
}

function invokeResolver(resolver, promise) {
  function resolvePromise(value) {
    resolve(promise, value);
  }

  function rejectPromise(reason) {
    reject(promise, reason);
  }

  try {
    resolver(resolvePromise, rejectPromise);
  } catch(e) {
    rejectPromise(e);
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    try {
      value = callback(detail);
      succeeded = true;
    } catch(e) {
      failed = true;
      error = e;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (handleThenable(promise, value)) {
    return;
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    resolve(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

var PENDING   = void 0;
var SEALED    = 0;
var FULFILLED = 1;
var REJECTED  = 2;

function subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;

  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment;
  subscribers[length + REJECTED]  = onRejection;
}

function publish(promise, settled) {
  var child, callback, subscribers = promise._subscribers, detail = promise._detail;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    invokeCallback(settled, child, callback, detail);
  }

  promise._subscribers = null;
}

Promise.prototype = {
  constructor: Promise,

  _state: undefined,
  _detail: undefined,
  _subscribers: undefined,

  then: function(onFulfillment, onRejection) {
    var promise = this;

    var thenPromise = new this.constructor(function() {});

    if (this._state) {
      var callbacks = arguments;
      config.async(function invokePromiseCallback() {
        invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
      });
    } else {
      subscribe(this, thenPromise, onFulfillment, onRejection);
    }

    return thenPromise;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = all;
Promise.race = race;
Promise.resolve = staticResolve;
Promise.reject = staticReject;

function handleThenable(promise, value) {
  var then = null,
  resolved;

  try {
    if (promise === value) {
      throw new TypeError("A promises callback cannot return that same promise.");
    }

    if (objectOrFunction(value)) {
      then = value.then;

      if (isFunction(then)) {
        then.call(value, function(val) {
          if (resolved) { return true; }
          resolved = true;

          if (value !== val) {
            resolve(promise, val);
          } else {
            fulfill(promise, val);
          }
        }, function(val) {
          if (resolved) { return true; }
          resolved = true;

          reject(promise, val);
        });

        return true;
      }
    }
  } catch (error) {
    if (resolved) { return true; }
    reject(promise, error);
    return true;
  }

  return false;
}

function resolve(promise, value) {
  if (promise === value) {
    fulfill(promise, value);
  } else if (!handleThenable(promise, value)) {
    fulfill(promise, value);
  }
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = value;

  config.async(publishFulfillment, promise);
}

function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = reason;

  config.async(publishRejection, promise);
}

function publishFulfillment(promise) {
  publish(promise, promise._state = FULFILLED);
}

function publishRejection(promise) {
  publish(promise, promise._state = REJECTED);
}

exports.Promise = Promise;
},{"./all":2,"./asap":3,"./config":4,"./race":7,"./reject":8,"./resolve":9,"./utils":10}],7:[function(require,module,exports){
"use strict";
/* global toString */
var isArray = require("./utils").isArray;

/**
  `RSVP.race` allows you to watch a series of promises and act as soon as the
  first promise given to the `promises` argument fulfills or rejects.

  Example:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 2");
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // result === "promise 2" because it was resolved before promise1
    // was resolved.
  });
  ```

  `RSVP.race` is deterministic in that only the state of the first completed
  promise matters. For example, even if other promises given to the `promises`
  array argument are resolved, but the first completed promise has become
  rejected before the other promises became fulfilled, the returned promise
  will become rejected:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error("promise 2"));
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // Code here never runs because there are rejected promises!
  }, function(reason){
    // reason.message === "promise2" because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  @method race
  @for RSVP
  @param {Array} promises array of promises to observe
  @param {String} label optional string for describing the promise returned.
  Useful for tooling.
  @return {Promise} a promise that becomes fulfilled with the value the first
  completed promises is resolved with if the first completed promise was
  fulfilled, or rejected with the reason that the first completed promise
  was rejected with.
*/
function race(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to race.');
  }
  return new Promise(function(resolve, reject) {
    var results = [], promise;

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && typeof promise.then === 'function') {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
  });
}

exports.race = race;
},{"./utils":10}],8:[function(require,module,exports){
"use strict";
/**
  `RSVP.reject` returns a promise that will become rejected with the passed
  `reason`. `RSVP.reject` is essentially shorthand for the following:

  ```javascript
  var promise = new RSVP.Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  var promise = RSVP.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @for RSVP
  @param {Any} reason value that the returned promise will be rejected with.
  @param {String} label optional string for identifying the returned promise.
  Useful for tooling.
  @return {Promise} a promise that will become rejected with the given
  `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Promise = this;

  return new Promise(function (resolve, reject) {
    reject(reason);
  });
}

exports.reject = reject;
},{}],9:[function(require,module,exports){
"use strict";
function resolve(value) {
  /*jshint validthis:true */
  if (value && typeof value === 'object' && value.constructor === this) {
    return value;
  }

  var Promise = this;

  return new Promise(function(resolve) {
    resolve(value);
  });
}

exports.resolve = resolve;
},{}],10:[function(require,module,exports){
"use strict";
function objectOrFunction(x) {
  return isFunction(x) || (typeof x === "object" && x !== null);
}

function isFunction(x) {
  return typeof x === "function";
}

function isArray(x) {
  return Object.prototype.toString.call(x) === "[object Array]";
}

// Date.now is not available in browsers < IE9
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
var now = Date.now || function() { return new Date().getTime(); };


exports.objectOrFunction = objectOrFunction;
exports.isFunction = isFunction;
exports.isArray = isArray;
exports.now = now;
},{}],11:[function(require,module,exports){

},{}],12:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],13:[function(require,module,exports){
/*! JSON.minify()
	v0.1.3-a (c) Kyle Simpson
	MIT License
*/

module.exports = function(json) {
	
	var tokenizer = /"|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
		in_string = false,
		in_multiline_comment = false,
		in_singleline_comment = false,
		tmp, tmp2, new_str = [], ns = 0, from = 0, lc, rc
	;
	
	tokenizer.lastIndex = 0;
	
	while (tmp = tokenizer.exec(json)) {
		lc = RegExp.leftContext;
		rc = RegExp.rightContext;
		if (!in_multiline_comment && !in_singleline_comment) {
			tmp2 = lc.substring(from);
			if (!in_string) {
				tmp2 = tmp2.replace(/(\n|\r|\s)*/g,"");
			}
			new_str[ns++] = tmp2;
		}
		from = tokenizer.lastIndex;
		
		if (tmp[0] == "\"" && !in_multiline_comment && !in_singleline_comment) {
			tmp2 = lc.match(/(\\)*$/);
			if (!in_string || !tmp2 || (tmp2[0].length % 2) == 0) {	// start of string with ", or unescaped " character found to end string
				in_string = !in_string;
			}
			from--; // include " character in next catch
			rc = json.substring(from);
		}
		else if (tmp[0] == "/*" && !in_string && !in_multiline_comment && !in_singleline_comment) {
			in_multiline_comment = true;
		}
		else if (tmp[0] == "*/" && !in_string && in_multiline_comment && !in_singleline_comment) {
			in_multiline_comment = false;
		}
		else if (tmp[0] == "//" && !in_string && !in_multiline_comment && !in_singleline_comment) {
			in_singleline_comment = true;
		}
		else if ((tmp[0] == "\n" || tmp[0] == "\r") && !in_string && !in_multiline_comment && in_singleline_comment) {
			in_singleline_comment = false;
		}
		else if (!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))) {
			new_str[ns++] = tmp[0];
		}
	}
	new_str[ns++] = rc;
	return new_str.join("");
};


},{}],14:[function(require,module,exports){
/*jslint node:true*/
/*globals RTCPeerConnection, mozRTCPeerConnection, webkitRTCPeerConnection */
/*globals RTCSessionDescription, mozRTCSessionDescription */
/*globals RTCIceCandidate, mozRTCIceCandidate */
'use strict';

var myRTCPeerConnection = null;
var myRTCSessionDescription = null;
var myRTCIceCandidate = null;

var renameIceURLs = function (config) {
  if (!config) {
    return;
  }
  if (!config.iceServers) {
    return config;
  }
  config.iceServers.forEach(function (server) {
    server.url = server.urls;
    delete server.urls;
  });
  return config;
};

var fixChromeStatsResponse = function(response) {
  var standardReport = {};
  var reports = response.result();
  reports.forEach(function(report) {
    var standardStats = {
      id: report.id,
      timestamp: report.timestamp,
      type: report.type
    };
    report.names().forEach(function(name) {
      standardStats[name] = report.stat(name);
    });
    standardReport[standardStats.id] = standardStats;
  });

  return standardReport;
};

// Unify PeerConnection Object.
if (typeof RTCPeerConnection !== 'undefined') {
  myRTCPeerConnection = RTCPeerConnection;
} else if (typeof mozRTCPeerConnection !== 'undefined') {
  // Firefox uses 'url' rather than 'urls' for RTCIceServer.urls
  myRTCPeerConnection = function (configuration, constraints) {
    return new mozRTCPeerConnection(renameIceURLs(configuration), constraints);
  };
} else if (typeof webkitRTCPeerConnection !== 'undefined') {
  // Chrome returns a nonstandard, non-JSON-ifiable response from getStats.
  myRTCPeerConnection = function(configuration, constraints) {
    var pc = new webkitRTCPeerConnection(configuration, constraints);
    var boundGetStats = pc.getStats.bind(pc);
    pc.getStats = function(selector, successCallback, failureCallback) {
      var successCallbackWrapper = function(chromeStatsResponse) {
        successCallback(fixChromeStatsResponse(chromeStatsResponse));
      };
      // Chrome also takes its arguments in the wrong order.
      boundGetStats(successCallbackWrapper, failureCallback, selector);
    };
    return pc;
  };
}

// Unify SessionDescrption Object.
if (typeof RTCSessionDescription !== 'undefined') {
  myRTCSessionDescription = RTCSessionDescription;
} else if (typeof mozRTCSessionDescription !== 'undefined') {
  myRTCSessionDescription = mozRTCSessionDescription;
}

// Unify IceCandidate Object.
if (typeof RTCIceCandidate !== 'undefined') {
  myRTCIceCandidate = RTCIceCandidate;
} else if (typeof mozRTCIceCandidate !== 'undefined') {
  myRTCIceCandidate = mozRTCIceCandidate;
}

exports.RTCPeerConnection = myRTCPeerConnection;
exports.RTCSessionDescription = myRTCSessionDescription;
exports.RTCIceCandidate = myRTCIceCandidate;

},{}],15:[function(require,module,exports){
(function (process){
/*globals process, console */
/*jslint indent:2,sloppy:true, node:true */
var util = require('../../src/util');

/**
 * A freedom.js logging provider that logs to chrome, firefox, and node consoles.
 * @Class Logger_console
 * @constructor
 * @private
 * @param {App} app The application creating this provider, in practice unset.
 */
var Logger_console = function (app) {
  this.level = (app.config && app.config.debug) || 'log';
  this.console = (app.config && app.config.global.console);
  util.handleEvents(this);
};


/**
 * Logging levels, for filtering output.
 * @private
 * @static
 */
Logger_console.level = {
  "debug": 0,
  "info": 1,
  "log": 2,
  "warn": 3,
  "error": 4
};

/**
 * Print a message with appropriate formatting.
 * @method print
 */
Logger_console.prototype.print = function (severity, source, msg) {
  var arr = msg;
  if (typeof this.console === 'undefined' ||
      this.console.freedom === true) {
    return;
  }
  if (typeof arr === 'string') {
    arr = [arr];
  }
  
  if (Logger_console.level[this.level] !== undefined &&
      Logger_console.level[severity] < Logger_console.level[this.level]) {
    return;
  }
  
  if (typeof process !== 'undefined' &&
      {}.toString.call(process) === '[object process]' && source) {
    arr.unshift('\x1B[39m');
    arr.unshift('\x1B[31m' + source);
    /*jslint nomen: true*/
  } else if (this.console.__mozillaConsole__ && source) {
    arr.unshift(source.toUpperCase());
    /*jslint nomen: false*/
  } else if (source) {
    arr.unshift('color: red');
    arr.unshift('%c ' + source);
  }
  if (!this.console[severity] && this.console.log) {
    severity = 'log';
  }
  this.console[severity].apply(this.console, arr);
};

/**
 * Log a message to the console.
 * @param {String} source The source of the message.
 * @param {String} msg The message to log.
 * @method log
 */
Logger_console.prototype.log = function (source, msg, continuation) {
  this.print('log', source, msg);
  continuation();
};

/**
 * Log a message to the console with debug priority.
 * @param {String} source The source of the message.
 * @param {String} msg The message to log.
 * @method log
 */
Logger_console.prototype.debug = function (source, msg, continuation) {
  this.print('debug', source, msg);
  continuation();
};

/**
 * Log a message to the console with info priority.
 * @param {String} source The source of the message.
 * @param {String} msg The message to log.
 * @method log
 */
Logger_console.prototype.info = function (source, msg, continuation) {
  this.print('info', source, msg);
  continuation();
};

/**
 * Log a message to the console with warn priority.
 * @param {String} source The source of the message.
 * @param {String} msg The message to log.
 * @method log
 */
Logger_console.prototype.warn = function (source, msg, continuation) {
  this.print('warn', source, msg);
  continuation();
};

/**
 * Log a message to the console with error priority.
 * @param {String} source The source of the message.
 * @param {String} msg The message to log.
 * @method log
 */
Logger_console.prototype.error = function (source, msg, continuation) {
  this.print('error', source, msg);
  continuation();
};

/** REGISTER PROVIDER **/
exports.provider = Logger_console;
exports.name = 'core.console';

}).call(this,require('_process'))
},{"../../src/util":44,"_process":12}],16:[function(require,module,exports){
/*globals console */
/*jslint indent:2,white:true,sloppy:true,node:true */

/**
 * An oAuth meta-provider allowing multiple platform-dependant
 * oAuth implementations to serve as the redirectURL for an oAuth flow.
 * The core implementations are provided in providers/oauth, and are
 * supplemented in platform-dependent repositories.
 *
 */
var OAuth = function (handlers, mod, dispatchEvent) {
  this.handlers = handlers;
  this.mod = mod;
  this.dispatchEvent = dispatchEvent;
  this.ongoing = {};
};

/**
 * Register oAuth handlers.
 * This method should be called before provider is used, and binds the current
 * oAuth provider to be associated with registered handlers. This is used so
 * that handlers which are registered by the user apply only the the freedom()
 * setup call they are associated with, while still being registered across
 * multiple instances of OAuth providers.
 *
 * @method register
 * @param {[constructor]} handlers
 * @private
 */
OAuth.register = function (handlers) {
  var i,
      boundHandlers = [];
  if (!handlers || !handlers.length) {
    return OAuth.reset();
  }

  for (i = 0; i < handlers.length; i += 1) {
    boundHandlers.push(new handlers[i]());
  }
  exports.provider = OAuth.bind(this, boundHandlers);
};

/**
 * Reset the oAuth provider registrations.
 * @method reset
 * @private
 */
OAuth.reset = function () {
  exports.provider = OAuth.bind(this, []);
};

/**
 * Indicate the intention to initiate an oAuth flow, allowing an appropriate
 * oAuth provider to begin monitoring for redirection.
 *
 * @method initiateOAuth
 * @param {string[]} redirectURIs - oAuth redirection URIs registered with the
 *     provider.
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a value of schema: {{redirect:String, state:String}}
 *    where 'redirect' is the chosen redirect URI
 *    and 'state' is the state to pass to the URI on completion of oAuth
 */
OAuth.prototype.initiateOAuth = function (redirectURIs, continuation) {
  var promise, i;
  var successCallback = function(result) {
    this.ongoing[result.state] = this.handlers[i];
    continuation(result);
  }.bind(this);

  for (i = 0; i < this.handlers.length; i += 1) {
    if (this.handlers[i].initiateOAuth(redirectURIs, successCallback)) {
      return;
    }
  }
  //If here, we have no compatible providers
  continuation(null, {
    'errcode': 'UNKNOWN',
    'message': 'No requested redirects can be handled.'
  });
  return;
};

/**
 * oAuth client-side flow - launch the provided URL
 * This must be called after initiateOAuth with the returned state object
 *
 * @method launchAuthFlow
 * @param {String} authUrl - The URL that initiates the auth flow.
 * @param {Object.<string, string>} stateObj - The return value from initiateOAuth
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a String value that is the response Url containing the access token
 */
OAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  if (!this.ongoing.hasOwnProperty(stateObj.state)) {
    continuation(undefined, {
      'errcode': 'UNKNOWN',
      'message': 'You must begin the oAuth flow with initiateOAuth first'
    });
    return;
  }

  this.ongoing[stateObj.state].launchAuthFlow(authUrl, stateObj, continuation);
  delete this.ongoing[stateObj.state];
};

exports.register = OAuth.register;
exports.reset = OAuth.reset;
exports.provider = OAuth.bind(this, []);
exports.name = 'core.oauth';

},{}],17:[function(require,module,exports){
/*jslint indent:2,sloppy:true, node:true */

var util = require('../../src/util');

var unAttachedChannels = {};
var allocateChannel = function (dataChannel) {
  var id = util.getId();
  unAttachedChannels[id] = dataChannel;
  return id;
};

var RTCDataChannelAdapter = function (app, dispatchEvents, id) {
  this.dispatchEvent = dispatchEvents;
  if (!unAttachedChannels[id]) {
    console.warn('Invalid ID, creating acting on unattached DataChannel');
    var Connection = require('./core.rtcpeerconnection').provider,
      provider = new Connection();
    id = provider.createDataChannel();
    provider.close();
  }

  this.channel = unAttachedChannels[id];
  delete unAttachedChannels[id];

  this.events = [
    'onopen',
    'onerror',
    'onclose',
    'onmessage'
  ];
  this.manageEvents(true);
};

// Attach or detach listeners for events against the connection.
RTCDataChannelAdapter.prototype.manageEvents = function (attach) {
  this.events.forEach(function (event) {
    if (attach) {
      this[event] = this[event].bind(this);
      this.channel[event] = this[event];
    } else {
      delete this.channel[event];
    }
  }.bind(this));
};

RTCDataChannelAdapter.prototype.getLabel = function (callback) {
  callback(this.channel.label);
};

RTCDataChannelAdapter.prototype.getOrdered = function (callback) {
  callback(this.channel.ordered);
};

RTCDataChannelAdapter.prototype.getMaxPacketLifeTime = function (callback) {
  callback(this.channel.maxPacketLifeTime);
};

RTCDataChannelAdapter.prototype.getMaxRetransmits = function (callback) {
  callback(this.channel.maxRetransmits);
};

RTCDataChannelAdapter.prototype.getProtocol = function (callback) {
  callback(this.channel.protocol);
};

RTCDataChannelAdapter.prototype.getNegotiated = function (callback) {
  callback(this.channel.negotiated);
};

RTCDataChannelAdapter.prototype.getId = function (callback) {
  callback(this.channel.id);
};

RTCDataChannelAdapter.prototype.getReadyState = function (callback) {
  callback(this.channel.readyState);
};

RTCDataChannelAdapter.prototype.getBufferedAmount = function (callback) {
  callback(this.channel.bufferedAmount);
};

RTCDataChannelAdapter.prototype.getBinaryType = function (callback) {
  callback(this.channel.binaryType);
};
RTCDataChannelAdapter.prototype.setBinaryType = function (binaryType, callback) {
  this.channel.binaryType = binaryType;
  callback();
};

RTCDataChannelAdapter.prototype.send = function (text, callback) {
  this.channel.send(text);
  callback();
};

RTCDataChannelAdapter.prototype.sendBuffer = function (buffer, callback) {
  this.channel.send(buffer);
  callback();
};

RTCDataChannelAdapter.prototype.close = function (callback) {
  if (!this.channel) {
    return callback();
  }
  this.manageEvents(false);
  this.channel.close();
  callback();
};

RTCDataChannelAdapter.prototype.onopen = function (event) {
  this.dispatchEvent('onopen', event.message);
};

RTCDataChannelAdapter.prototype.onerror = function (event) {
  this.dispatchEvent('onerror', {
    errcode: event.type,
    message: event.message
  });
};

RTCDataChannelAdapter.prototype.onclose = function (event) {
  this.dispatchEvent('onclose', event.message);
};

RTCDataChannelAdapter.prototype.onmessage = function (event) {
  if (typeof event.data === 'string') {
    this.dispatchEvent('onmessage', {text: event.data});
  } else {
    this.dispatchEvent('onmessage', {buffer: event.data});
  }
};

exports.name = "core.rtcdatachannel";
exports.provider = RTCDataChannelAdapter;
exports.allocate = allocateChannel;

},{"../../src/util":44,"./core.rtcpeerconnection":18}],18:[function(require,module,exports){
/*jslint indent:2,sloppy:true, node:true */

var adapter = require('webrtc-adapter');
var RTCPeerConnection = adapter.RTCPeerConnection;
var RTCSessionDescription = adapter.RTCSessionDescription;
var RTCIceCandidate = adapter.RTCIceCandidate;

var DataChannel = require('./core.rtcdatachannel');

var RTCPeerConnectionAdapter = function (app, dispatchEvent, configuration) {
  this.dispatchEvent = dispatchEvent;
  this.connection = new RTCPeerConnection(configuration);

  this.events = [
    'ondatachannel',
    'onnegotiationneeded',
    'onicecandidate',
    'onsignalingstatechange',
    'onaddstream',
    'onremovestream',
    'oniceconnectionstatechange'
  ];
  this.manageEvents(true);
};

// Attach or detach listeners for events against the connection.
RTCPeerConnectionAdapter.prototype.manageEvents = function (attach) {
  this.events.forEach(function (event) {
    if (attach) {
      this[event] = this[event].bind(this);
      this.connection[event] = this[event];
    } else if (this.connection) {
      delete this.connection[event];
    }
  }.bind(this));
};

RTCPeerConnectionAdapter.prototype.createOffer = function (constraints, callback) {
  this.connection.createOffer(callback, callback.bind({}, undefined), constraints);
};

RTCPeerConnectionAdapter.prototype.createAnswer = function (callback) {
  this.connection.createAnswer(callback, callback.bind({}, undefined));
};

RTCPeerConnectionAdapter.prototype.setLocalDescription = function (description, callback) {
  this.connection.setLocalDescription(new RTCSessionDescription(description),
    callback,
    callback.bind({}, undefined));
};

RTCPeerConnectionAdapter.prototype.getLocalDescription = function (callback) {
  callback(this.connection.localDescription);
};

RTCPeerConnectionAdapter.prototype.setRemoteDescription = function (description, callback) {
  this.connection.setRemoteDescription(new RTCSessionDescription(description),
    callback,
    callback.bind({}, undefined));
};

RTCPeerConnectionAdapter.prototype.getRemoteDescription = function (callback) {
  callback(this.connection.remoteDescription);
};

RTCPeerConnectionAdapter.prototype.getSignalingState = function (callback) {
  callback(this.connection.signalingState);
};

RTCPeerConnectionAdapter.prototype.updateIce = function (configuration, callback) {
  this.connection.updateIce(configuration);
  callback();
};

RTCPeerConnectionAdapter.prototype.addIceCandidate = function (candidate, callback) {
  this.connection.addIceCandidate(new RTCIceCandidate(candidate),
    callback,
    callback.bind({}, undefined));
};

RTCPeerConnectionAdapter.prototype.getIceGatheringState = function (callback) {
  callback(this.connection.iceGatheringState);
};

RTCPeerConnectionAdapter.prototype.getIceConnectionState = function (callback) {
  callback(this.connection.iceConnectionState);
};

RTCPeerConnectionAdapter.prototype.getConfiguration = function (callback) {
  var configuration = this.connection.getConfiguration();
  callback(configuration);
};

RTCPeerConnectionAdapter.prototype.getLocalStreams = function (callback) {
  callback(undefined, {
    errcode: -1,
    message: "Not Implemented"
  });
};

RTCPeerConnectionAdapter.prototype.getRemoteStreams = function (callback) {
  callback(undefined, {
    errcode: -1,
    message: "Not Implemented"
  });
};

RTCPeerConnectionAdapter.prototype.getStreamById = function (id, callback) {
  callback(undefined, {
    errcode: -1,
    message: "Not Implemented"
  });
};

RTCPeerConnectionAdapter.prototype.addStream = function (id, callback) {
  callback(undefined, {
    errcode: -1,
    message: "Not Implemented"
  });
};

RTCPeerConnectionAdapter.prototype.removeStream = function (id, callback) {
  callback(undefined, {
    errcode: -1,
    message: "Not Implemented"
  });
};

RTCPeerConnectionAdapter.prototype.close = function (callback) {
  if (!this.connection) {
    return callback();
  }
  this.manageEvents(false);
  try {
    this.connection.close();
    callback();
  } catch (e) {
    callback(undefined, {
      errcode: e.name,
      message: e.message
    });
  }
};

RTCPeerConnectionAdapter.prototype.createDataChannel = function (label, dataChannelDict, callback) {
  var id = DataChannel.allocate(this.connection.createDataChannel(label, dataChannelDict));
  callback(id);
};

RTCPeerConnectionAdapter.prototype.getStats = function (selector, callback) {
  this.connection.getStats(selector, callback, callback.bind(this, undefined));
};

RTCPeerConnectionAdapter.prototype.ondatachannel = function (event) {
  var id = DataChannel.allocate(event.channel);
  this.dispatchEvent('ondatachannel', {channel: id});
};

RTCPeerConnectionAdapter.prototype.onnegotiationneeded = function (event) {
  console.warn('on negotiation eeded');
  this.dispatchEvent('onnegotiationneeded', event.message);
};

RTCPeerConnectionAdapter.prototype.onicecandidate = function (event) {
  var msg;
  if (event.candidate && event.candidate.candidate) {
    msg = {
      candidate: {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex
      }
    };
  } else {
    msg = {
      candidate: null
    };
  }
  this.dispatchEvent('onicecandidate', msg);
};
  
RTCPeerConnectionAdapter.prototype.onsignalingstatechange = function (event) {
  this.dispatchEvent('onsignalingstatechange', event.message);
};
  
RTCPeerConnectionAdapter.prototype.onaddstream = function (event) {
  //TODO: provide ID of allocated stream.
  this.dispatchEvent('onaddstream', event.stream);
};
  
RTCPeerConnectionAdapter.prototype.onremovestream = function (event) {
  //TODO: provide ID of deallocated stream.
  this.dispatchEvent('onremovestream', event.stream);
};
  
RTCPeerConnectionAdapter.prototype.oniceconnectionstatechange = function (event) {
  this.dispatchEvent('oniceconnectionstatechange', event.message);
};
  

exports.name = "core.rtcpeerconnection";
exports.provider = RTCPeerConnectionAdapter;

},{"./core.rtcdatachannel":17,"webrtc-adapter":14}],19:[function(require,module,exports){
/*jslint indent:2,white:true,sloppy:true,node:true */
var EventInterface = require('../../src/proxy/eventInterface');
var Consumer = require('../../src/consumer');
var util = require('../../src/util');

/**
 * Core freedom services available to all modules.
 * Created by the environment helper in response to a 'core' request.
 * @Class Core_unprivileged
 * @constructor
 * @param {Manager} manager The manager this core is connected with.
 * @private
 */
var Core_unprivileged = function(manager, postMessage) {
  this.manager = manager;
  this.debug = this.manager.debug;
};

Core_unprivileged.unboundChannels = {};

Core_unprivileged.contextId = undefined;

/**
 * Create a custom channel.
 * Returns the structure {channel: Proxy, identifier: Object},
 * where the identifier can be 'redeemed' by another module or provider using
 * bind channel, at which point the deferred object will resolve with a channel
 * between the two endpoints.
 * @method createChannel
 * @params {Function} continuation Method to call with the cosntructed structure.
 */
Core_unprivileged.prototype.createChannel = function(continuation) {
  var proxy = new Consumer(EventInterface, this.manager.debug),
      id = util.getId(),
      chan = this.getChannel(proxy);
  this.manager.setup(proxy);

  if (this.manager.delegate && this.manager.toDelegate.core) {
    this.manager.emit(this.manager.delegate, {
      type: 'Delegation',
      request: 'handle',
      flow: 'core',
      message: {
        type: 'register',
        id: id
      }
    });
  }
  Core_unprivileged.unboundChannels[id] = {
    local: true,
    proxy: proxy
  };

  proxy.once('start', this.getChannel.bind(this, proxy));

  continuation({
    channel: chan,
    identifier: id
  });
};

Core_unprivileged.prototype.getChannel = function(proxy) {
  var iface = proxy.getProxyInterface(),
      chan = iface();
  chan.close = iface.close;
  chan.onClose = iface.onClose;
  iface.onClose(chan, function() {
    proxy.doClose();
  });
  return chan;
};

/**
 * Receive a message from another core instance.
 * Note: Core_unprivileged is not registered on the hub. it is a provider,
 *     as it's location and name would indicate. This function is called by
 *     port-app to relay messages up to higher levels.  More generally, the
 *     messages emitted by the core to 'this.manager.emit(this.mananage.delegate'
 *     Should be onMessaged to the controlling core.
 * @param {String} source The source of the message.
 * @param {Object} msg The messsage from an isolated core provider.
 */
Core_unprivileged.prototype.onMessage = function(source, msg) {
  if (msg.type === 'register') {
    Core_unprivileged.unboundChannels[msg.id] = {
      remote: true,
      resolve: msg.reply,
      source: source
    };
  } else if (msg.type === 'clear') {
    delete Core_unprivileged.unboundChannels[msg.id];
  } else if (msg.type === 'bind') {
    if (Core_unprivileged.unboundChannels[msg.id]) {
      this.bindChannel(msg.id, function() {}, source);
    }
  }
};

/**
 * Bind a custom channel.
 * Creates a proxy interface to the custom channel, which will be bound to
 * the proxy obtained through an earlier createChannel call.
 * channel to a proxy.
 * @method bindChannel
 * @param {Object} identifier An identifier obtained through createChannel.
 * @param {Function} continuation A function to be called with the proxy.
 */
Core_unprivileged.prototype.bindChannel = function(identifier, continuation, source) {
  var toBind = Core_unprivileged.unboundChannels[identifier],
      newSource = !source;

  // when bindChannel is called directly, source will be undefined.
  // When it is propogated by onMessage, a source for binding will already exist.
  if (newSource) {
    this.debug.debug('making local proxy for core binding');
    source = new Consumer(EventInterface, this.debug);
    this.manager.setup(source);
  }

  // If this is a known identifier and is in the same context, binding is easy.
  if (toBind && toBind.local) {
    this.debug.debug('Binding a channel to port on this hub:' + source);
    this.manager.createLink(source, identifier, toBind.proxy, 'default');
    delete Core_unprivileged.unboundChannels[identifier];
    if (this.manager.delegate && this.manager.toDelegate.core) {
      this.manager.emit(this.manager.delegate, {
        type: 'Delegation',
        request: 'handle',
        flow: 'core',
        message: {
          type: 'clear',
          id: identifier
        }
      });
    }
  } else if (toBind && toBind.remote) {
    this.debug.debug('Binding a channel into a module.');
    this.manager.createLink(
        source,
        newSource ? 'default' : identifier,
        toBind.source,
        identifier);
    toBind.resolve({
      type: 'Bind Channel',
      request:'core',
      flow: 'core',
      message: {
        type: 'bind',
        id: identifier
      }
    });
    delete Core_unprivileged.unboundChannels[identifier];
  } else if (this.manager.delegate && this.manager.toDelegate.core) {
    this.debug.info('delegating channel bind for an unknown ID:' + identifier);
    this.manager.emit(this.manager.delegate, {
      type: 'Delegation',
      request: 'handle',
      flow: 'core',
      message: {
        type: 'bind',
        id: identifier
      }
    });
    source.once('start', function(p, cb) {
      cb(this.getChannel(p));
    }.bind(this, source, continuation));
    this.manager.createLink(source,
        'default',
        this.manager.hub.getDestination(this.manager.delegate),
        identifier);
    delete Core_unprivileged.unboundChannels[identifier];
    return;
  } else {
    this.debug.warn('Asked to bind unknown channel: ' + identifier);
    this.debug.log(Core_unprivileged.unboundChannels);
    continuation();
    return;
  }

  if (source.getInterface) {
    continuation(this.getChannel(source));
  } else {
    continuation();
  }
};

/**
 * Get the ID of the current freedom.js context.  Provides an
 * array of module URLs, the lineage of the current context.
 * When not in an application context, the ID is the lineage
 * of the current View.
 * @method getId
 * @param {Function} callback The function called with ID information.
 */
Core_unprivileged.prototype.getId = function(callback) {
  // TODO: make sure contextID is properly frozen.
  callback(Core_unprivileged.contextId);
};

/**
 * Get a logger for logging to the freedom.js logger. Provides a
 * log object with an interface similar to the standard javascript console,
 * which logs via debug.
 * @method getLogger
 * @param {String} name The name of the logger, used as its 'source'
 * @param {Function} callback The function to call with the logger.
 */
Core_unprivileged.prototype.getLogger = function(name, callback) {
  callback(this.manager.debug.getLogger(name));
};

/**
 * Set the ID of the current freedom.js context.
 * @method setId
 * @private
 * @param {String[]} id The lineage of the current context.
 */
Core_unprivileged.prototype.setId = function(id) {
  Core_unprivileged.contextId = id;
};

exports.provider = Core_unprivileged;
exports.name = "core";

},{"../../src/consumer":29,"../../src/proxy/eventInterface":41,"../../src/util":44}],20:[function(require,module,exports){
/*globals document */
/*jslint indent:2,sloppy:true,node:true */
var util = require('../../src/util');
var PromiseCompat = require('es6-promise').Promise;

/**
 * A freedom.js view is the interface for user interaction.
 * A view exists as an iFrame, which is shown to the user in some way.
 * communication between the view and the freedom.js module is performed
 * through the HTML5 postMessage mechanism, which this provider translates
 * to freedom.js message events.
 * @Class View_unprivileged
 * @constructor
 * @private
 * @param {View Provider} provider
 * @param {port.Module} caller The module creating this provider.
 * @param {Function} dispatchEvent Function to call to emit events.
 */
var Core_View = function (provider, caller, dispatchEvent) {
  this.provider = provider;
  this.dispatchEvent = dispatchEvent;
  this.module = caller;
  this.module.once('close', this.close.bind(this, function () {}));
  util.handleEvents(this);
};

/**
 * The is the default provider for core.view, unless overridden by context or
 * a user supplied provider. The interface is documented at:
 * https://github.com/freedomjs/freedom/wiki/freedom.js-Views
 *
 * Generally, a view provider consists of 3 methods:
 * onOpen is called when a view should be shown.
 *     id - is a unique identifier for this view, used on subsequent calls
 *          for communication and to eventually close the view.
 *     name - is the name of the view (as defined in the manifest),
 *            in order to place it appropriately.
 *     page - is the resolved URL to open.
 *     resources - is an array of resolved URLs which are referenced.
 *     postMessage - is a function to call when messages are emitted
 *                   by the window in which the view is opened.
 * onOpen returns a promise that completes when the view is loaded.
 * onMessage is called to send a message to an open view.
 *     id - is the unique identifier for the open view.
 *     message - is the message to postMessage to the view's window.
 * onClose is called to close a view.
 *     id - is the unique identifier for the view.
 */
Core_View.provider = {
  listener: undefined,
  active: {},
  onOpen: function (id, name, page, resources, postMessage) {
    var container = document.body,
      root,
      frame;
    
    if (!this.listener) {
      this.listener = function (msg) {
        var i;
        for (i in this.active) {
          if (this.active.hasOwnProperty(i) &&
              this.active[i].source === msg.source) {
            this.active[i].postMessage(msg.data);
          }
        }
      }.bind(this);
      window.addEventListener('message', this.listener, true);
    }

    // Views open by default in an element with their ID, or fill the page
    // otherwise.
    if (document.getElementById(name)) {
      container = document.getElementById(name);
    }

    root = document.createElement("div");
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.display = "relative";

    container.appendChild(root);
    
    return new PromiseCompat(function (resolve, reject) {
      frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts allow-forms");
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.border = "0";
      frame.style.background = "transparent";
      frame.src = page;
      frame.addEventListener('load', resolve, true);
      frame.addEventListener('error', reject, true);

      root.appendChild(frame);

      this.active[id] = {
        postMessage: postMessage,
        container: container,
        root: root,
        source: frame.contentWindow
      };
    }.bind(this));
  },
  onMessage: function (id, message) {
    this.active[id].source.postMessage(message, '*');
  },
  onClose: function (id) {
    this.active[id].container.removeChild(this.active[id].root);
    delete this.active[id];
    
    if (Object.keys(this.active).length === 0) {
      window.removeEventListener('message', this.listener, true);
      this.listener = undefined;
    }
  }
};

/**
 * Ask for this view to open a specific location, either a File relative to
 * the loader, or an explicit code location.
 * @method show
 * @param {String} name The identifier of the view.
 * @param {Function} continuation Function to call when view is loaded.
 */
Core_View.prototype.show = function (name, continuation) {
  if (this.id) {
    return continuation(undefined, {
      errcode: 'ALREADY_OPEN',
      message: 'Cannot show multiple views through one instance.'
    });
  }
  this.id = util.getId();

  var config = this.module.manifest.views,
    toResolve = [];
  if (!config || !config[name]) {
    return continuation(undefined, {
      errcode: 'NON_EXISTANT',
      message: 'View not found: ' + name
    });
  }

  if (config[name].main && config[name].files) {
    toResolve = config[name].files.concat(config[name].main);
    PromiseCompat.all(toResolve.map(function (fname) {
      return this.module.resource.get(this.module.manifestId, fname);
    }.bind(this))).then(function (files) {
      this.provider.onOpen(this.id,
          name,
          files[files.length - 1],
          files,
          this.dispatchEvent.bind(this, 'message')).then(
        continuation,
        continuation.bind({}, undefined)
      );
    }.bind(this), function (err) {
      this.module.debug.error('Unable to open view ' + name + ': ', err);
      continuation(undefined, {
        errcode: 'VIEW_MALFORMED',
        message: 'Malformed View Declaration: ' + err
      });
    });
  } else {
    continuation(undefined, {
      errcode: 'NON_EXISTANT',
      message: 'View not found: ' + name
    });
  }
};

/**
 * isSecure determines whether the module can have confidence that its
 * communication with its view cannot be intercepted by an untrusted 3rd party.
 * In practice, this means that its okay for the runtime to have access to the
 * messages, and if the context is a web server or a browser extension then
 * that context is trusted. However, if a provider wants to allow their e.g.
 * social provider to be used on arbitrary websites, this mechanism means that
 * if the website uses a trusted version of the freedom.js library, then the
 * module can be used.
 * @method isSecure
 * @returns {Boolean} if the channel to the view is secure.
 */
Core_View.prototype.isSecure = function (continuation) {
  continuation(false);
};

/**
 * Send a message to an open view.
 * @method postMessage
 */
Core_View.prototype.postMessage = function (msg, continuation) {
  if (!this.id) {
    return continuation(undefined, {
      errcode: 'NOT_OPEN',
      message: 'Cannot post message to uninitialized view.'
    });
  }
  this.provider.onMessage(this.id, msg);
  continuation();
};

/**
 * Close an active view.
 * @method close
 */
Core_View.prototype.close = function (continuation) {
  if (!this.id) {
    return continuation(undefined, {
      errcode: 'NOT_OPEN',
      message: 'Cannot close uninitialized view.'
    });
  }
  this.provider.onClose(this.id);
  delete this.id;

  continuation();
};


/**
 * Allow a web page to redefine behavior for how views are shown.
 * @method register
 * @static
 * @param {Function} PageProvider The custom view behavior.
 */
Core_View.register = function (PageProvider) {
  var provider = PageProvider ? new PageProvider() : Core_View.provider;
  exports.provider = Core_View.bind(this, provider);
};

exports.provider = Core_View.bind(this, Core_View.provider);
exports.name = 'core.view';
exports.register = Core_View.register;

},{"../../src/util":44,"es6-promise":1}],21:[function(require,module,exports){
/*globals console */
/*jslint indent:2,white:true,sloppy:true, node:true */
var util = require('../../src/util');

/**
 * A minimal provider implementing the core.echo interface for interaction with
 * custom channels.  Primarily used for testing the robustness of the custom
 * channel implementation.
 * @Class Echo_unprivileged
 * @constructor
 * @param {Module} mod The module creating this provider.
 */
var Echo_unprivileged = function(mod, dispatchEvent) {
  this.mod = mod;
  this.dispatchEvent = dispatchEvent;
  util.handleEvents(this);

  // The Core object for managing channels.
  this.mod.once('core', function(Core) {
    this.core = new Core();
  }.bind(this));
  this.mod.emit(this.mod.controlChannel, {
    type: 'core request delegated to echo',
    request: 'core'
  });
};

/**
 * Setup the provider to echo on a specific proxy. Subsequent messages
 * From the custom channel bound here will be re-emitted as a message
 * from the provider.  Subsequent messages to the provider will be
 * emitted on the bound channel.
 * @param {Object} proxy The identifier for the custom channel to bind.
 * @param {Function} continuation Function to call when setup is complete.
 * @method setup
 */
Echo_unprivileged.prototype.setup = function(proxy, continuation) {
  continuation();
  if (!this.core) {
    this.dispatchEvent('message', 'no core available to setup proxy with at echo');
    return;
  }

  this.core.bindChannel(proxy, function(chan) {
    if (this.chan) {
      this.chan.close();
    }
    this.chan = chan;
    this.chan.onClose(function() {
      delete this.chan;
    }.bind(this));
    this.dispatchEvent('message', 'channel bound to echo');
    this.chan.on('message', function(m) {
      this.dispatchEvent('message', 'from custom channel: ' + m);
    }.bind(this));
  }.bind(this));
};

/**
 * Send a message to the bound custom channel.
 * @param {String} str The string to send.
 * @param {Function} continuation Function to call when sending is complete.
 * @method send
 */
Echo_unprivileged.prototype.send = function(str, continuation) {
  continuation();
  if (this.chan) {
    this.chan.emit('message', str);
  } else {
    this.dispatchEvent('message', 'no channel available');
  }
};

exports.provider = Echo_unprivileged;
exports.name = "core.echo";

},{"../../src/util":44}],22:[function(require,module,exports){
/*globals console, RTCPeerConnection, webkitRTCPeerConnection */
/*globals mozRTCPeerConnection, RTCSessionDescription, RTCIceCandidate */
/*globals mozRTCSessionDescription, mozRTCIceCandidate */
/*globals ArrayBuffer, Blob */
/*jslint indent:2,sloppy:true,node:true */
/**
 * DataPeer - a class that wraps peer connections and data channels.
 */
// TODO: check that Handling of pranswer is treated appropriately.
var SimpleDataPeerState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED'
};

function SimpleDataPeer(peerName, stunServers, dataChannelCallbacks, mocks) {
  var constraints,
    config,
    i;
  this.peerName = peerName;
  this.channels = {};
  this.dataChannelCallbacks = dataChannelCallbacks;
  this.onConnectedQueue = [];

  if (typeof mocks.RTCPeerConnection !== "undefined") {
    this.RTCPeerConnection = mocks.RTCPeerConnection;
  } else if (typeof webkitRTCPeerConnection !== "undefined") {
    this.RTCPeerConnection = webkitRTCPeerConnection;
  } else if (typeof mozRTCPeerConnection !== "undefined") {
    this.RTCPeerConnection = mozRTCPeerConnection;
  } else {
    throw new Error("This environment does not appear to support RTCPeerConnection");
  }

  if (typeof mocks.RTCSessionDescription !== "undefined") {
    this.RTCSessionDescription = mocks.RTCSessionDescription;
  } else if (typeof RTCSessionDescription !== "undefined") {
    this.RTCSessionDescription = RTCSessionDescription;
  } else if (typeof mozRTCSessionDescription !== "undefined") {
    this.RTCSessionDescription = mozRTCSessionDescription;
  } else {
    throw new Error("This environment does not appear to support RTCSessionDescription");
  }

  if (typeof mocks.RTCIceCandidate !== "undefined") {
    this.RTCIceCandidate = mocks.RTCIceCandidate;
  } else if (typeof RTCIceCandidate !== "undefined") {
    this.RTCIceCandidate = RTCIceCandidate;
  } else if (typeof mozRTCIceCandidate !== "undefined") {
    this.RTCIceCandidate = mozRTCIceCandidate;
  } else {
    throw new Error("This environment does not appear to support RTCIceCandidate");
  }


  constraints = {
    optional: [{DtlsSrtpKeyAgreement: true}]
  };
  // A way to speak to the peer to send SDP headers etc.
  this.sendSignalMessage = null;

  this.pc = null;  // The peer connection.
  // Get TURN servers for the peer connection.
  config = {iceServers: []};
  for (i = 0; i < stunServers.length; i += 1) {
    config.iceServers.push({
      'url' : stunServers[i]
    });
  }
  this.pc = new this.RTCPeerConnection(config, constraints);
  // Add basic event handlers.
  this.pc.addEventListener("icecandidate",
                            this.onIceCallback.bind(this));
  this.pc.addEventListener("negotiationneeded",
                            this.onNegotiationNeeded.bind(this));
  this.pc.addEventListener("datachannel",
                            this.onDataChannel.bind(this));
  this.pc.addEventListener("signalingstatechange", function () {
    // TODO: come up with a better way to detect connection.  We start out
    // as "stable" even before we are connected.
    // TODO: this is not fired for connections closed by the other side.
    // This will be fixed in m37, at that point we should dispatch an onClose
    // event here for freedom.transport to pick up.
    if (this.pc.signalingState === "stable") {
      this.pcState = SimpleDataPeerState.CONNECTED;
      this.onConnectedQueue.map(function (callback) { callback(); });
    }
  }.bind(this));
  // This state variable is used to fake offer/answer when they are wrongly
  // requested and we really just need to reuse what we already have.
  this.pcState = SimpleDataPeerState.DISCONNECTED;

  // Note: to actually do something with data channels opened by a peer, we
  // need someone to manage "datachannel" event.
}

SimpleDataPeer.prototype.createOffer = function (constaints, continuation) {
  this.pc.createOffer(continuation, function () {
    console.error('core.peerconnection createOffer failed.');
  }, constaints);
};

SimpleDataPeer.prototype.runWhenConnected = function (func) {
  if (this.pcState === SimpleDataPeerState.CONNECTED) {
    func();
  } else {
    this.onConnectedQueue.push(func);
  }
};

SimpleDataPeer.prototype.send = function (channelId, message, continuation) {
  this.channels[channelId].send(message);
  continuation();
};

SimpleDataPeer.prototype.openDataChannel = function (channelId, continuation) {
  var dataChannel = this.pc.createDataChannel(channelId, {});
  dataChannel.onopen = function () {
    this.addDataChannel(channelId, dataChannel);
    continuation();
  }.bind(this);
  dataChannel.onerror = function (err) {
    //@(ryscheng) todo - replace with errors that work across the interface
    console.error(err);
    continuation(undefined, err);
  };
  // Firefox does not fire "negotiationneeded", so we need to
  // negotate here if we are not connected.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=840728
  if (typeof mozRTCPeerConnection !== "undefined" &&
      this.pcState === SimpleDataPeerState.DISCONNECTED) {
    this.negotiateConnection();
  }
};

SimpleDataPeer.prototype.closeChannel = function (channelId) {
  if (this.channels[channelId] !== undefined) {
    this.channels[channelId].close();
    delete this.channels[channelId];
  }
};

SimpleDataPeer.prototype.getBufferedAmount = function (channelId,
                                                       continuation) {
  if (this.channels[channelId] !== undefined) {
    var dataChannel = this.channels[channelId];
    return dataChannel.bufferedAmount;
  }
  throw new Error("No channel with id: " + channelId);
};

SimpleDataPeer.prototype.setSendSignalMessage = function (sendSignalMessageFn) {
  this.sendSignalMessage = sendSignalMessageFn;
};

// Handle a message send on the signalling channel to this peer.
SimpleDataPeer.prototype.handleSignalMessage = function (messageText) {
  //console.log(this.peerName + ": " + "handleSignalMessage: \n" + messageText);
  var json = JSON.parse(messageText),
    ice_candidate;

  // TODO: If we are offering and they are also offerring at the same time,
  // pick the one who has the lower randomId?
  // (this.pc.signalingState == "have-local-offer" && json.sdp &&
  //    json.sdp.type == "offer" && json.sdp.randomId < this.localRandomId)
  if (json.sdp) {
    // Set the remote description.
    this.pc.setRemoteDescription(
      new this.RTCSessionDescription(json.sdp),
      // Success
      function () {
        //console.log(this.peerName + ": setRemoteDescription succeeded");
        if (this.pc.remoteDescription.type === "offer") {
          this.pc.createAnswer(this.onDescription.bind(this),
                               console.error);
        }
      }.bind(this),
      // Failure
      function (e) {
        console.error(this.peerName + ": " +
            "setRemoteDescription failed:", e);
      }.bind(this)
    );
  } else if (json.candidate) {
    // Add remote ice candidate.
    //console.log(this.peerName + ": Adding ice candidate: " + JSON.stringify(json.candidate));
    ice_candidate = new this.RTCIceCandidate(json.candidate);
    this.pc.addIceCandidate(ice_candidate);
  } else {
    console.warn(this.peerName + ": " +
        "handleSignalMessage got unexpected message: ", messageText);
  }
};

// Connect to the peer by the signalling channel.
SimpleDataPeer.prototype.negotiateConnection = function () {
  this.pcState = SimpleDataPeerState.CONNECTING;
  this.pc.createOffer(
    this.onDescription.bind(this),
    function (e) {
      console.error(this.peerName + ": " +
          "createOffer failed: ", e.toString());
      this.pcState = SimpleDataPeerState.DISCONNECTED;
    }.bind(this)
  );
};

SimpleDataPeer.prototype.isClosed = function () {
  return !this.pc || this.pc.signalingState === "closed";
};

SimpleDataPeer.prototype.close = function () {
  if (!this.isClosed()) {
    this.pc.close();
  }
  //console.log(this.peerName + ": " + "Closed peer connection.");
};

SimpleDataPeer.prototype.addDataChannel = function (channelId, channel) {
  var callbacks = this.dataChannelCallbacks;
  this.channels[channelId] = channel;

  if (channel.readyState === "connecting") {
    channel.onopen = callbacks.onOpenFn.bind(this, channel, {label: channelId});
  }

  channel.onclose = callbacks.onCloseFn.bind(this, channel, {label: channelId});

  channel.onmessage = callbacks.onMessageFn.bind(this, channel,
                                                 {label: channelId});

  channel.onerror = callbacks.onErrorFn.bind(this, channel, {label: channel});
};

// When we get our description, we set it to be our local description and
// send it to the peer.
SimpleDataPeer.prototype.onDescription = function (description) {
  if (this.sendSignalMessage) {
    this.pc.setLocalDescription(
      description,
      function () {
        //console.log(this.peerName + ": setLocalDescription succeeded");
        this.sendSignalMessage(JSON.stringify({'sdp': description}));
      }.bind(this),
      function (e) {
        console.error(this.peerName + ": " +
            "setLocalDescription failed:", e);
      }.bind(this)
    );
  } else {
    console.error(this.peerName + ": " +
        "_onDescription: _sendSignalMessage is not set, so we did not " +
            "set the local description. ");
  }
};

SimpleDataPeer.prototype.onNegotiationNeeded = function (e) {
  //console.log(this.peerName + ": " + "onNegotiationNeeded",
  //            JSON.stringify(this._pc), e);
  if (this.pcState !== SimpleDataPeerState.DISCONNECTED) {
    // Negotiation messages are falsely requested for new data channels.
    //   https://code.google.com/p/webrtc/issues/detail?id=2431
    // This code is a hack to simply reset the same local and remote
    // description which will trigger the appropriate data channel open event.
    // TODO: fix/remove this when Chrome issue is fixed.
    var logSuccess = function (op) {
      return function () {
        //console.log(this.peerName + ": " + op + " succeeded ");
      }.bind(this);
    }.bind(this),
      logFail = function (op) {
        return function (e) {
          //console.log(this.peerName + ": " + op + " failed: " + e);
        }.bind(this);
      }.bind(this);
    if (this.pc.localDescription && this.pc.remoteDescription &&
        this.pc.localDescription.type === "offer") {
      this.pc.setLocalDescription(this.pc.localDescription,
                                   logSuccess("setLocalDescription"),
                                   logFail("setLocalDescription"));
      this.pc.setRemoteDescription(this.pc.remoteDescription,
                                    logSuccess("setRemoteDescription"),
                                    logFail("setRemoteDescription"));
    } else if (this.pc.localDescription && this.pc.remoteDescription &&
        this.pc.localDescription.type === "answer") {
      this.pc.setRemoteDescription(this.pc.remoteDescription,
                                    logSuccess("setRemoteDescription"),
                                    logFail("setRemoteDescription"));
      this.pc.setLocalDescription(this.pc.localDescription,
                                   logSuccess("setLocalDescription"),
                                   logFail("setLocalDescription"));
    } else {
      console.error(this.peerName + ', onNegotiationNeeded failed');
    }
    return;
  }
  this.negotiateConnection();
};

SimpleDataPeer.prototype.onIceCallback = function (event) {
  if (event.candidate) {
    // Send IceCandidate to peer.
    //console.log(this.peerName + ": " + "ice callback with candidate", event);
    if (this.sendSignalMessage) {
      this.sendSignalMessage(JSON.stringify({'candidate': event.candidate}));
    } else {
      console.warn(this.peerName + ": " + "_onDescription: _sendSignalMessage is not set.");
    }
  }
};

SimpleDataPeer.prototype.onSignalingStateChange = function () {
  //console.log(this.peerName + ": " + "onSignalingStateChange: ", this._pc.signalingState);
  if (this.pc.signalingState === "stable") {
    this.pcState = SimpleDataPeerState.CONNECTED;
    this.onConnectedQueue.map(function (callback) { callback(); });
  }
};

SimpleDataPeer.prototype.onDataChannel = function (event) {
  this.addDataChannel(event.channel.label, event.channel);
  // RTCDataChannels created by a RTCDataChannelEvent have an initial
  // state of open, so the onopen event for the channel will not
  // fire. We need to fire the onOpenDataChannel event here
  // http://www.w3.org/TR/webrtc/#idl-def-RTCDataChannelState

  // Firefox channels do not have an initial state of "open"
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1000478
  if (event.channel.readyState === "open") {
    this.dataChannelCallbacks.onOpenFn(event.channel,
                                       {label: event.channel.label});
  }
};

// _signallingChannel is a channel for emitting events back to the freedom Hub.
function PeerConnection(portModule, dispatchEvent,
                        RTCPeerConnection, RTCSessionDescription,
                        RTCIceCandidate) {
  // Channel for emitting events to consumer.
  this.dispatchEvent = dispatchEvent;

  // a (hopefully unique) ID for debugging.
  this.peerName = "p" + Math.random();

  // This is the portApp (defined in freedom/src/port-app.js). A way to speak
  // to freedom.
  this.freedomModule = portModule;

  // For tests we may mock out the PeerConnection and
  // SessionDescription implementations
  this.RTCPeerConnection = RTCPeerConnection;
  this.RTCSessionDescription = RTCSessionDescription;
  this.RTCIceCandidate = RTCIceCandidate;

  // This is the a channel to send signalling messages.
  this.signallingChannel = null;

  // The DataPeer object for talking to the peer.
  this.peer = null;

  // The Core object for managing channels.
  this.freedomModule.once('core', function (Core) {
    this.core = new Core();
  }.bind(this));
  this.freedomModule.emit(this.freedomModule.controlChannel, {
    type: 'core request delegated to peerconnection',
    request: 'core'
  });
}

// Start a peer connection using the given freedomChannelId as the way to
// communicate with the peer. The argument |freedomChannelId| is a way to speak
// to an identity provide to send them SDP headers negotiate the address/port to
// setup the peer to peerConnection.
//
// options: {
//   peerName: string,   // For pretty printing messages about this peer.
//   debug: boolean           // should we add extra
// }
PeerConnection.prototype.setup = function (signallingChannelId, peerName,
                                           stunServers, initiateConnection,
                                           continuation) {
  this.peerName = peerName;
  var mocks = {RTCPeerConnection: this.RTCPeerConnection,
               RTCSessionDescription: this.RTCSessionDescription,
               RTCIceCandidate: this.RTCIceCandidate},
    self = this,
    dataChannelCallbacks = {
      // onOpenFn is called at the point messages will actually get through.
      onOpenFn: function (dataChannel, info) {
        self.dispatchEvent("onOpenDataChannel",
                         { channelId: info.label});
      },
      onCloseFn: function (dataChannel, info) {
        self.dispatchEvent("onCloseDataChannel",
                         { channelId: info.label});
      },
      // Default on real message prints it to console.
      onMessageFn: function (dataChannel, info, event) {
        if (event.data instanceof ArrayBuffer) {
          self.dispatchEvent('onReceived', {
            'channelLabel': info.label,
            'buffer': event.data
          });
        } else if (event.data instanceof Blob) {
          self.dispatchEvent('onReceived', {
            'channelLabel': info.label,
            'binary': event.data
          });
        } else if (typeof (event.data) === 'string') {
          self.dispatchEvent('onReceived', {
            'channelLabel': info.label,
            'text': event.data
          });
        }
      },
      // Default on error, prints it.
      onErrorFn: function (dataChannel, info, err) {
        console.error(dataChannel.peerName + ": dataChannel(" +
                      dataChannel.dataChannel.label + "): error: ", err);
      }
    },
    channelId,
    openDataChannelContinuation;

  this.peer = new SimpleDataPeer(this.peerName, stunServers,
                                 dataChannelCallbacks, mocks);

  // Setup link between Freedom messaging and _peer's signalling.
  // Note: the signalling channel should only be sending receiveing strings.
  this.core.bindChannel(signallingChannelId, function (channel) {
    this.signallingChannel = channel;
    this.peer.setSendSignalMessage(function (msg) {
      this.signallingChannel.emit('message', msg);
    }.bind(this));
    this.signallingChannel.on('message',
        this.peer.handleSignalMessage.bind(this.peer));
    this.signallingChannel.emit('ready');
    if (!initiateConnection) {
      this.peer.runWhenConnected(continuation);
    }
  }.bind(this));

  if (initiateConnection) {
    // Setup a connection right away, then invoke continuation.
    console.log(this.peerName + ' initiating connection');
    channelId = 'hello' + Math.random().toString();
    openDataChannelContinuation = function (success, error) {
      if (error) {
        continuation(undefined, error);
      } else {
        this.closeDataChannel(channelId, continuation);
      }
    }.bind(this);
    this.openDataChannel(channelId, openDataChannelContinuation);
  }
};

PeerConnection.prototype.createOffer = function (constraints, continuation) {
  this.peer.createOffer(constraints, continuation);
};

// TODO: delay continuation until the open callback from _peer is called.
PeerConnection.prototype.openDataChannel = function (channelId, continuation) {
  this.peer.openDataChannel(channelId, continuation);
};

PeerConnection.prototype.closeDataChannel = function (channelId, continuation) {
  this.peer.closeChannel(channelId);
  continuation();
};

// Called to send a message over the given datachannel to a peer. If the data
// channel doesn't already exist, the DataPeer creates it.
PeerConnection.prototype.send = function (sendInfo, continuation) {
  var objToSend = sendInfo.text || sendInfo.buffer || sendInfo.binary;
  if (typeof objToSend === 'undefined') {
    console.error("No valid data to send has been provided.", sendInfo);
    return;
  }
  //DEBUG
  // objToSend = new ArrayBuffer(4);
  //DEBUG
  this.peer.send(sendInfo.channelLabel, objToSend, continuation);
};

PeerConnection.prototype.getBufferedAmount = function (channelId, continuation) {
  continuation(this.peer.getBufferedAmount(channelId));
};

PeerConnection.prototype.close = function (continuation) {
  if (this.peer.isClosed()) {
    // Peer already closed, run continuation without dispatching event.
    continuation();
    return;
  }
  this.peer.close();
  this.dispatchEvent("onClose");
  continuation();
};

exports.provider = PeerConnection;
exports.name = 'core.peerconnection';

},{}],23:[function(require,module,exports){
/*globals localStorage */
/*jslint indent:2,sloppy:true,node:true */
var util = require('../../src/util');

/**
 * A FreeDOM core.storage provider that depends on localStorage
 * Thus, this only works in the context of a webpage and has
 * some size limitations.
 * Note that this can conflict with other scripts using localStorage
 * as keys are raw
 * @Class Storage_unprivileged
 * @constructor
 * @private
 * @param {App} app The application creating this provider.
 */
var Storage_unprivileged = function (app, dispatchEvent) {
  this.app = app;
  util.handleEvents(this);
};

/**
 * Lists keys in the storage repository
 * @method keys
 */
Storage_unprivileged.prototype.keys = function (continuation) {
  var result = [],
    i;
  for (i = 0; i < localStorage.length; i += 1) {
    result.push(localStorage.key(i));
  }
  continuation(result);
};

/**
 * Get a key from the storage repository.
 * @param {String} key The item to get from storage.
 * @method get
 */
Storage_unprivileged.prototype.get = function (key, continuation) {
  try {
    var val = localStorage.getItem(key);
    continuation(val);
  } catch (e) {
    continuation(null);
  }
};

/**
 * Set a key in the storage repository.
 * @param {String} key The item to save in storage.
 * @param {String} value The value to save in storage.
 * @method set
 */
Storage_unprivileged.prototype.set = function (key, value, continuation) {
  var ret = localStorage.getItem(key);
  localStorage.setItem(key, value);
  continuation(ret);
};

/**
 * Remove a key from the storage repository.
 * @param {String} key The item to remove from storage;
 * @method remove
 */
Storage_unprivileged.prototype.remove = function (key, continuation) {
  var ret = localStorage.getItem(key);
  localStorage.removeItem(key);
  continuation(ret);
};

/**
 * Reset the contents of the storage repository.
 * @method clear
 */
Storage_unprivileged.prototype.clear = function (continuation) {
  localStorage.clear();
  continuation();
};

exports.provider = Storage_unprivileged;
exports.name = 'core.storage';

},{"../../src/util":44}],24:[function(require,module,exports){
/*globals WebSocket, ArrayBuffer, Blob, Uint8Array, console */
/*jslint sloppy:true, node:true */

var WSHandle = null;
var nodeStyle = false;

/**
 * A WebSocket core provider
 *
 * @param {port.Module} module The Module requesting this provider
 * @param {Function} dispatchEvent Function to dispatch events.
 * @param {String} url The Remote URL to connect with.
 * @param {String[]} protocols SubProtocols to open.
 * @param {WebSocket?} socket An alternative socket class to use.
 */
var WS = function (module, dispatchEvent, url, protocols, socket) {
  var WSImplementation = null,
    error;
  this.isNode = nodeStyle;
  if (typeof socket !== 'undefined') {
    WSImplementation = socket;
  } else if (WSHandle !== null) {
    WSImplementation = WSHandle;
  } else if (typeof WebSocket !== 'undefined') {
    WSImplementation = WebSocket;
  } else {
    console.error('Platform does not support WebSocket');
  }

  this.dispatchEvent = dispatchEvent;
  try {
    if (protocols) {
      this.websocket = new WSImplementation(url, protocols);
    } else {
      this.websocket = new WSImplementation(url);
    }
    this.websocket.binaryType = 'arraybuffer';
  } catch (e) {
    error = {};
    if (e instanceof SyntaxError) {
      error.errcode = 'SYNTAX';
    } else {
      error.errcode = e.name;
    }
    error.message = e.message;
    dispatchEvent('onError', error);
    return;
  }

  if (this.isNode) {
    this.websocket.on('message', this.onMessage.bind(this));
    this.websocket.on('open', this.onOpen.bind(this));
    // node.js websocket implementation not compliant
    this.websocket.on('close', this.onClose.bind(this, {
      code: 0,
      reason: 'UNKNOWN',
      wasClean: true
    }));
    this.websocket.on('error', this.onError.bind(this));
  } else {
    this.websocket.onopen = this.onOpen.bind(this);
    this.websocket.onclose = this.onClose.bind(this);
    this.websocket.onmessage = this.onMessage.bind(this);
    this.websocket.onerror = this.onError.bind(this);
  }
};

WS.prototype.send = function (data, continuation) {
  var toSend = data.text || data.binary || data.buffer,
    errcode,
    message;

  if (toSend) {
    try {
      // For node.js, we have to do weird buffer stuff
      if (this.isNode && toSend instanceof ArrayBuffer) {
        this.websocket.send(
          new Uint8Array(toSend),
          { binary: true },
          this.onError.bind(this)
        );
      } else {
        this.websocket.send(toSend);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        errcode = "SYNTAX";
      } else {
        errcode = "INVALID_STATE";
      }
      message = e.message;
    }
  } else {
    errcode = "BAD_SEND";
    message = "No text, binary, or buffer data found.";
  }

  if (errcode) {
    continuation(undefined, {
      errcode: errcode,
      message: message
    });
  } else {
    continuation();
  }
};

WS.prototype.getReadyState = function (continuation) {
  continuation(this.websocket.readyState);
};

WS.prototype.getBufferedAmount = function (continuation) {
  continuation(this.websocket.bufferedAmount);
};

WS.prototype.close = function (code, reason, continuation) {
  try {
    if (code && reason) {
      this.websocket.close(code, reason);
    } else {
      this.websocket.close();
    }
    continuation();
  } catch (e) {
    var errorCode;
    if (e instanceof SyntaxError) {
      errorCode = "SYNTAX";
    } else {
      errorCode = "INVALID_ACCESS";
    }
    continuation(undefined, {
      errcode: errorCode,
      message: e.message
    });
  }
};

WS.prototype.onOpen = function (event) {
  this.dispatchEvent('onOpen');
};

WS.prototype.onMessage = function (event, flags) {
  var data = {};
  if (this.isNode && flags && flags.binary) {
    data.buffer = new Uint8Array(event).buffer;
  } else if (this.isNode) {
    data.text = event;
  } else if (typeof ArrayBuffer !== 'undefined' && event.data instanceof ArrayBuffer) {
    data.buffer = event.data;
  } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
    data.binary = event.data;
  } else if (typeof event.data === 'string') {
    data.text = event.data;
  }
  this.dispatchEvent('onMessage', data);
};

WS.prototype.onError = function (event) {
  // Nothing to pass on
  // See: http://stackoverflow.com/a/18804298/300539
  this.dispatchEvent('onError');
};

WS.prototype.onClose = function (event) {
  this.dispatchEvent('onClose',
                     {code: event.code,
                      reason: event.reason,
                      wasClean: event.wasClean});
};

exports.provider = WS;
exports.name = 'core.websocket';
exports.setSocket = function(impl, isNode) {
  WSHandle = impl;
  nodeStyle = isNode;
};

},{}],25:[function(require,module,exports){
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

var oAuthRedirectId = 'freedom.oauth.redirect.handler';

var loadedOnStartup = false;
/**
 * If there is redirection back to the page, and oAuthRedirectID is set,
 * then report the auth and close the window.
 */
if (typeof window !== 'undefined' && window && window.location &&
    window.addEventListener) {
  window.addEventListener('load', function () {
    "use strict";
    loadedOnStartup = true;
  }, true);

  if (window.localStorage &&
      window.location.href.indexOf(oAuthRedirectId) > 0) {
    // This will trigger a 'storage' event on the window. See storageListener
    window.localStorage.setItem(oAuthRedirectId, new Date());
    window.close();
  }
}

var LocalPageAuth = function() {
  "use strict";
  this.listeners = {};
};

/**
 * Indicate the intention to initiate an oAuth flow, allowing an appropriate
 * oAuth provider to begin monitoring for redirection.
 *
 * @method initiateOAuth
 * @param {string[]} redirectURIs - oAuth redirection URIs registered with the
 *     provider.
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a value of schema: {{redirect:String, state:String}}
 *    where 'redirect' is the chosen redirect URI
 *    and 'state' is the state to pass to the URI on completion of oAuth
 * @return {Boolean} true if can handle, false otherwise
 */
LocalPageAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  "use strict";
  if (typeof window !== 'undefined' && window && loadedOnStartup) {
    var here = window.location.protocol + "//" + window.location.host +
        window.location.pathname;
    if (redirectURIs.indexOf(here) > -1) {
      continuation({
        redirect: here,
        state: oAuthRedirectId + Math.random()
      });
      return true;
    }
  }

  return false;
};

/**
 * oAuth client-side flow - launch the provided URL
 * This must be called after initiateOAuth with the returned state object
 *
 * @method launchAuthFlow
 * @param {String} authUrl - The URL that initiates the auth flow.
 * @param {Object.<string, string>} stateObj - The return value from initiateOAuth
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a String value that is the response Url containing the access token
 */
LocalPageAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  "use strict";
  var listener = this.storageListener.bind(this, continuation, stateObj);
  this.listeners[stateObj.state] = listener;
  window.addEventListener("storage", listener, false);
  // Start 'er up
  window.open(authUrl);
};

/**
 * Handler for storage events, which relays them to waiting clients.
 * For the schema of the storage msg, see:
 * http://tutorials.jenkov.com/html5/local-storage.html#storage-events
 * @param {Function} continuation function to call with result
 * @param {Object.<string, string>} stateObj the return value from initiateOAuth
 * @param {Object} msg storage event
 */
LocalPageAuth.prototype.storageListener = function(continuation, stateObj, msg) {
  'use strict';
  if (msg.url.indexOf(stateObj.state) > -1) {
    window.removeEventListener("storage", this.listeners[stateObj.state], false);
    delete this.listeners[stateObj.state];
    continuation(msg.url);
  }
};

/**
 * If we have a local domain, and freedom.js is loaded at startup, we can use
 * the local page as a redirect URI.
 */
module.exports = LocalPageAuth;

},{"es6-promise":1}],26:[function(require,module,exports){
(function (global){
/*jslint indent:2,browser:true, node:true */
var PromiseCompat = require('es6-promise').Promise;

var oAuthRedirectId = 'freedom.oauth.redirect.handler';

function RemotePageAuth() {
  "use strict";
  this.listeners = {};
}

/**
 * Indicate the intention to initiate an oAuth flow, allowing an appropriate
 * oAuth provider to begin monitoring for redirection.
 *
 * @method initiateOAuth
 * @param {string[]} redirectURIs - oAuth redirection URIs registered with the
 *     provider.
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a value of schema: {{redirect:String, state:String}}
 *    where 'redirect' is the chosen redirect URI
 *    and 'state' is the state to pass to the URI on completion of oAuth
 * @return {Boolean} true if can handle, false otherwise
 */
RemotePageAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  "use strict";
  if (typeof global !== 'undefined' && global && global.document) {
    for (var i=0; i<redirectURIs.length; i++) {
      // TODO: remove restriction on URL pattern match.
      if ((redirectURIs[i].indexOf('http://') === 0 ||
          redirectURIs[i].indexOf('https://') === 0) &&
          redirectURIs[i].indexOf('oauth-relay.html') > 0) {
        continuation({
          redirect: redirectURIs[i],
          state: oAuthRedirectId + Math.random()
        });
        return true;
      }
    }
  }
  return false;
};

/**
 * oAuth client-side flow - launch the provided URL
 * This must be called after initiateOAuth with the returned state object
 *
 * @method launchAuthFlow
 * @param {String} authUrl - The URL that initiates the auth flow.
 * @param {Object.<string, string>} stateObj - The return value from initiateOAuth
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a String value that is the response Url containing the access token
 */
RemotePageAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  "use strict";
  var frame = global.document.createElement('iframe');
  frame.src = stateObj.redirect;
  frame.style.display = 'none';

  global.document.body.appendChild(frame);
  frame.addEventListener('load', function () {
    this.listeners[stateObj.state] = continuation;
    window.open(authUrl);

    frame.contentWindow.postMessage(stateObj.state, '*');
  }.bind(this));

  window.addEventListener('message', function (frame, msg) {
    if (msg.data && msg.data.key && msg.data.url && this.listeners[msg.data.key]) {
      this.listeners[msg.data.key](msg.data.url);
      delete this.listeners[msg.data.key];
      try {
        document.body.removeChild(frame);
      } catch (e) {
        console.warn(e);
      }
    }
  }.bind(this, frame), false);
};

/**
 * If we have a local domain, and freedom.js is loaded at startup, we can use
 * the local page as a redirect URI.
 */
module.exports = RemotePageAuth;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"es6-promise":1}],27:[function(require,module,exports){
/*jslint indent:2,white:true,node:true,sloppy:true */
var PromiseCompat = require('es6-promise').Promise;

/**
 * The API registry for freedom.js.  Used to look up requested APIs,
 * and provides a bridge for core APIs to act like normal APIs.
 * @Class API
 * @param {Debug} debug The debugger to use for logging.
 * @constructor
 */
var Api = function(debug) {
  this.debug = debug;
  this.apis = {};
  this.providers = {};
  this.waiters = {};
};

/**
 * Get an API.
 * @method get
 * @param {String} api The API name to get.
 * @returns {{name:String, definition:API}} The API if registered.
 */
Api.prototype.get = function(api) {
  if (!this.apis[api]) {
    return false;
  }
  return {
    name: api,
    definition: this.apis[api]
  };
};

/**
 * Set an API to a definition.
 * @method set
 * @param {String} name The API name.
 * @param {API} definition The JSON object defining the API.
 */
Api.prototype.set = function(name, definition) {
  this.apis[name] = definition;
};

/**
 * Register a core API provider.
 * @method register
 * @param {String} name the API name.
 * @param {Function} constructor the function to create a provider for the API.
 * @param {String?} style The style the provider is written in. Valid styles
 *   are documented in fdom.port.Provider.prototype.getInterface. Defaults to
 *   provideAsynchronous
 */
Api.prototype.register = function(name, constructor, style) {
  var i;

  this.providers[name] = {
    constructor: constructor,
    style: style || 'provideAsynchronous'
  };

  if (this.waiters[name]) {
    for (i = 0; i < this.waiters[name].length; i += 1) {
      this.waiters[name][i].resolve(constructor.bind({},
          this.waiters[name][i].from));
    }
    delete this.waiters[name];
  }
};

/**
 * Get a core API connected to a given FreeDOM module.
 * @method getCore
 * @param {String} name the API to retrieve.
 * @param {port.App} from The instantiating App.
 * @returns {Promise} A promise of a fdom.App look-alike matching
 * a local API definition.
 */
Api.prototype.getCore = function(name, from) {
  return new PromiseCompat(function(resolve, reject) {
    if (this.apis[name]) {
      if (this.providers[name]) {
        resolve(this.providers[name].constructor.bind({}, from));
      } else {
        if (!this.waiters[name]) {
          this.waiters[name] = [];
        }
        this.waiters[name].push({
          resolve: resolve,
          reject: reject,
          from: from
        });
      }
    } else {
      this.debug.warn('Api.getCore asked for unknown core: ' + name);
      reject(null);
    }
  }.bind(this));
};

/**
 * Get the style in which a core API is written.
 * This method is guaranteed to know the style of a provider returned from
 * a previous getCore call, and so does not use promises.
 * @method getInterfaceStyle
 * @param {String} name The name of the provider.
 * @returns {String} The coding style, as used by
 *   fdom.port.Provider.prototype.getInterface.
 */
Api.prototype.getInterfaceStyle = function(name) {
  if (this.providers[name]) {
    return this.providers[name].style;
  } else {
    this.debug.warn('Api.getInterfaceStyle for unknown provider: ' + name);
    return undefined;
  }
};

/**
 * Defines the apis module and provider registry.
 */
module.exports = Api;

},{"es6-promise":1}],28:[function(require,module,exports){
/*jslint indent:2,node:true */
var includeFolder = undefined;
var minify = require('node-json-minify');

var util = require('./util');

var Bundle = function () {
  'use strict';
  var found;
  this.interfaces = [];
  /*jslint nomen: true */
  try {
    found = (function(){var self={},fs = require('fs');
self.console = "{\n  \"name\": \"console\",\n  \"api\": {\n    // Log(source, message)\n    \"log\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"debug\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"info\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"warn\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"error\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]}\n  }\n}\n";
self.coreConsole = "{\n  \"name\": \"core.console\",\n  \"api\": {\n    // Log(source, message)\n    \"log\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"debug\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"info\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"warn\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]},\n    \"error\": {\"type\": \"method\", \"value\": [\"string\", \"string\"]}\n  }\n}\n";
self.coreEcho = "{\n  \"name\": \"core.echo\",\n  \"api\": {\n    \"setup\": {\"type\": \"method\", \"value\": [\"string\"]},\n    \"send\": {\"type\": \"method\", \"value\": [\"string\"]},\n    \"message\": {\"type\": \"event\", \"value\": \"string\"}\n  }\n}";
self.core = "{\n  \"name\": \"core\",\n  \"api\": {\n    \"createChannel\": {\"type\": \"method\", \"value\": [], \"ret\": {\n      \"channel\": \"proxy\",\n      \"identifier\": \"string\"\n    }},\n    \"bindChannel\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": \"proxy\"},\n    \"getId\": {\"type\": \"method\", \"value\": [], \"ret\": [\"array\", \"string\"]},\n    \"getLogger\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": \"proxy\"}\n  }\n}\n";
self.coreOauth = "{\n  \"name\": \"core.oauth\",\n  \"api\": {\n    /**\n     * Indicate the intention to initiate an oAuth flow, allowing an appropriate\n     * oAuth provider to begin monitoring for redirection.\n     * This will generate a token, which must be passed to the single subsequent call\n     * to launchAuthFlow. \n     * \n     * \n     * @method initiateOAuth\n     * @param {String[]} Valid oAuth redirect URIs for your application\n     * @return {{redirect: String, state: String}} A chosen redirect URI and\n     *   state which will be monitored for oAuth redirection if available\n     **/\n    \"initiateOAuth\": {\n      \"type\": \"method\",\n      \"value\": [[\"array\", \"string\"]],\n      \"ret\": {\n        \"redirect\": \"string\",\n        \"state\": \"string\"\n      },\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * oAuth client-side flow - launch the provided URL\n     * This must be called after initiateOAuth with the returned state object\n     *\n     * @method launchAuthFlow\n     * @param {String} The URL that initiates the auth flow.\n     * @param {Object.<string, string>} The return value from initiateOAuth\n     * @return {String} responseUrl - containing the access token\n     */\n    \"launchAuthFlow\": {\n      \"type\": \"method\",\n      \"value\": [\"string\", {\n        \"redirect\": \"string\",\n        \"state\": \"string\"\n      }],\n      \"ret\": \"string\",\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    }\n  }\n}\n";
self.corePeerconnection = "{\n  \"name\": \"core.peerconnection\",\n  \"api\": {\n    // Setup the link to the peer and options for this peer connection.\n    \"setup\": {\n      \"type\": \"method\",\n      \"value\": [\n        // The freedom.js channel identifier used to setup a signalling chanel.\n        \"string\",\n        // The peerName, used debugging and console messages.\n        \"string\",\n        // The list of STUN servers to use.\n        // The format of a single entry is stun:HOST:PORT, where HOST\n        // and PORT are a stun server hostname and port, respectively.\n        [\"array\", \"string\"],\n        // Whether to immediately initiate a connection before fulfilling return\n        // promise.\n        \"boolean\"\n      ]\n    },\n  \n    // Send a message to the peer.\n    \"send\": {\"type\": \"method\", \"value\": [{\n      // Data channel id. If provided, will be used as the channel label.\n      // The behavior is undefined if the channel label doesn't exist.\n      \"channelLabel\": \"string\",\n      // One of the bellow should be defined; this is the data to send.\n      \"text\": \"string\",\n      \"binary\": \"blob\",\n      \"buffer\": \"buffer\"\n    }]},\n  \n    // Called when we get a message from the peer.\n    \"onReceived\": {\"type\": \"event\", \"value\": {\n      // The label/id of the data channel.\n      \"channelLabel\": \"string\",\n      // One the below will be specified.\n      \"text\": \"string\",\n      \"binary\": \"blob\",\n      \"buffer\": \"buffer\"\n    }},\n  \n    // Open the data channel with this label.\n    \"openDataChannel\": {\"type\": \"method\", \"value\": [\"string\"]},\n    // Close the data channel with this label.\n    \"closeDataChannel\": {\"type\": \"method\", \"value\": [\"string\"]},\n  \n    // A channel with this id has been opened.\n    \"onOpenDataChannel\": {\"type\": \"event\", \"value\": {\"channelId\": \"string\"}},\n    // The channale with this id has been closed.\n    \"onCloseDataChannel\": {\"type\": \"event\", \"value\": {\"channelId\": \"string\"}},\n  \n    // Returns the number of bytes that have queued using \"send\", but not\n    // yet sent out. Currently just exposes:\n    // http://www.w3.org/TR/webrtc/#widl-RTCDataChannel-bufferedAmount\n    \"getBufferedAmount\": {\"type\": \"method\",\n                          \"value\": [\"string\"],\n                          \"ret\": \"number\"},\n  \n    // Returns local SDP headers from createOffer.\n    \"getInfo\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n  \n    \"createOffer\": {\n      \"type\": \"method\",\n      \"value\": [{\n        // Optional :RTCOfferOptions object.\n        \"offerToReceiveVideo\": \"number\",\n        \"offerToReceiveAudio\": \"number\",\n        \"voiceActivityDetection\": \"boolean\",\n        \"iceRestart\": \"boolean\"\n      }],\n      \"ret\": {\n        // Fulfills with a :RTCSessionDescription\n        \"type\": \"string\",  // Should always be \"offer\".\n        \"sdp\": \"string\"\n      }\n    },\n  \n    // Close the peer connection.\n    \"close\": {\"type\": \"method\", \"value\": []},\n    // The peer connection has been closed.\n    \"onClose\": {\"type\": \"event\", \"value\": {}}\n  }\n}\n";
self.coreRtcdatachannel = "{\n  \"name\": \"core.rtcdatachannel\",\n  // API follows http://w3c.github.io/webrtc-pc/\n  \"api\": {\n\n    \"constructor\": {\n      // Numeric ID retreaved from core.rtcpeerconnection.createDataChannel\n      // or from an ondatachannel event.\n      \"value\": [\"string\"]\n    },\n\n    \"getLabel\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n    \"getOrdered\": {\"type\": \"method\", \"value\": [], \"ret\": \"boolean\"},\n    \"getMaxPacketLifeTime\": {\"type\": \"method\", \"value\": [], \"ret\": \"number\"},\n    \"getMaxRetransmits\": {\"type\": \"method\", \"value\": [], \"ret\": \"number\"},\n    \"getProtocol\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n    \"getNegotiated\": {\"type\": \"method\", \"value\": [], \"ret\": \"boolean\"},\n    \"getId\": {\"type\": \"method\", \"value\": [], \"ret\": \"number\"},\n    \"getReadyState\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n    \"getBufferedAmount\": {\"type\": \"method\", \"value\": [], \"ret\": \"number\"},\n\n    \"onopen\": {\"type\": \"event\", \"value\": []},\n    \"onerror\": {\"type\": \"event\", \"value\": []},\n    \"onclose\": {\"type\": \"event\", \"value\": []},\n    \"close\": {\"type\": \"method\", \"value\": []},\n    \"onmessage\": {\"type\": \"event\", \"value\": {\n      \"text\": \"string\",\n      \"binary\": \"buffer\"\n    }},\n    \"getBinaryType\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n    \"setBinaryType\": {\"type\": \"method\", \"value\": [\"string\"]},\n    \"send\": {\"type\": \"method\", \"value\": [\"string\"]},\n    // Note: renamed from 'send' to handle the overloaded type.\n    \"sendBuffer\": {\"type\": \"method\", \"value\": [\"buffer\"]}\n  }\n}\n";
self.coreRtcpeerconnection = "{\n  \"name\": \"core.rtcpeerconnection\",\n  // API follows http://w3c.github.io/webrtc-pc/\n  \"api\": {\n    // Arguments: iceServers, iceTransports, peerIdentity\n    // Deviation from spec: iceServers, and iceServers.urls when specified must\n    // be an array, even if only 1 is specified.\n    \"constructor\": {\n      \"value\": [{\n        \"iceServers\": [\"array\", {\n          \"urls\": [\"array\", \"string\"],\n          \"username\": \"string\",\n          \"credential\": \"string\"\n        }],\n        \"iceTransports\": \"string\",\n        \"peerIdentity\": \"string\"\n      }]\n    },\n\n    // Per http://w3c.github.io/webrtc-pc/#idl-def-RTCOfferOptions\n    \"createOffer\": {\"type\": \"method\", \"value\": [{\n      \"offerToReceiveAudio\": \"number\",\n      \"offerToReceiveVideo\": \"number\",\n      \"iceRestart\": \"boolean\",\n      \"voiceActivityDetection\": \"boolean\"\n    }], \"ret\": {\n      \"type\": \"string\",\n      \"sdp\": \"string\"\n    }},\n    \"createAnswer\": {\"type\": \"method\", \"value\": [], \"ret\": {\n      \"type\": \"string\",\n      \"sdp\": \"string\"\n    }},\n\n    // Per http://w3c.github.io/webrtc-pc/#idl-def-RTCSessionDescription\n    \"setLocalDescription\": {\"type\": \"method\", \"value\": [{\n      \"type\": \"string\",\n      \"sdp\": \"string\"\n    }]},\n    \"getLocalDescription\": {\"type\": \"method\", \"value\": [], \"ret\": {\n      \"type\": \"string\",\n      \"sdp\": \"string\"\n    }},\n    \"setRemoteDescription\": {\"type\": \"method\", \"value\": [{\n      \"type\": \"string\",\n      \"sdp\": \"string\"\n    }], \"ret\": {}},\n    \"getRemoteDescription\": {\"type\": \"method\", \"value\": [], \"ret\": {\n      \"type\": \"string\",\n      \"sdp\": \"string\"\n    }},\n\n    // Per http://w3c.github.io/webrtc-pc/#idl-def-RTCSignalingState\n    \"getSignalingState\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n\n    // Per http://w3c.github.io/webrtc-pc/#idl-def-RTCConfiguration\n    \"updateIce\": {\"type\": \"method\", \"value\": [{\n        \"iceServers\": [\"array\", {\n          \"urls\": [\"array\", \"string\"],\n          \"username\": \"string\",\n          \"credential\": \"string\"\n        }],\n        \"iceTransports\": \"string\",\n        \"peerIdentity\": \"string\"\n      }], \"ret\": {}},\n\n    // Per http://w3c.github.io/webrtc-pc/#idl-def-RTCIceCandidate\n    \"addIceCandidate\": {\"type\": \"method\", \"value\": [{\n      \"candidate\": \"string\",\n      \"sdpMid\": \"string\",\n      \"sdpMLineIndex\": \"number\"\n    }], \"ret\": {}},\n\n    \"getIceGatheringState\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n    \"getIceConnectionState\": {\"type\": \"method\", \"value\": [], \"ret\": \"string\"},\n\n    \"getConfiguration\": {\"type\": \"method\", \"value\": [], \"ret\": {\n      \"iceServers\": [\"array\", {\n        \"urls\": [\"array\", \"string\"],\n        \"username\": \"string\",\n        \"credential\": \"string\"\n      }],\n      \"iceTransports\": \"string\",\n      \"peerIdentity\": \"string\"\n    }},\n\n    // Numbers for stream API are IDs with which to make core.mediastream.\n    \"getLocalStreams\": {\"type\": \"method\", \"value\": [], \"ret\": [\"array\", \"string\"]},\n    \"getRemoteStreams\": {\"type\": \"method\", \"value\": [], \"ret\": [\"array\", \"string\"]},\n    \"getStreamById\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": \"string\"},\n    \"addStream\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": {}},\n    \"removeStream\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": {}},\n\n    \"close\": {\"type\": \"method\", \"value\": [], \"ret\": {}},\n\n    // Per http://w3c.github.io/webrtc-pc/#idl-def-RTCDataChannelInit\n    // Note: Numbers are IDs used to create core.datachannel objects.\n    \"createDataChannel\": {\"type\": \"method\", \"value\": [\"string\", {\n      \"ordered\": \"boolean\",\n      \"maxPacketLifeTime\": \"number\",\n      \"maxRetransmits\": \"number\",\n      \"protocol\": \"string\",\n      \"negotiated\": \"boolean\",\n      \"id\": \"number\"\n    }], \"ret\": \"string\"},\n    //Note: only reports channels opened by the remote peer.\n    \"ondatachannel\": {\"type\": \"event\", \"value\": {\n      \"channel\": \"string\"\n    }},\n\n    //TODO: Support DTMF Extension.\n    //\"createDTMFSender\": {},\n\n    //per http://w3c.github.io/webrtc-pc/#idl-def-RTCStatsCallback\n    //Number if sepecified represents a core.mediastreamtrack.\n    //Returned object is a serialization of the RTCStatsReport.\n    \"getStats\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\":\"object\"},\n\n    //TODO: Support Identity Extension.\n    /*\n    \"setIdentityProvider\": {},\n    \"getIdentityAssertion\": {},\n    \"getPeerIdentity\": {},\n    \"onidentityresult\": {\"type\": \"event\", \"value\": []},\n    \"onpeeridentity\":{\"type\": \"event\", \"value\": []},\n    \"onidpassertionerror\":{\"type\": \"event\", \"value\": []},\n    \"onidpvalidationerror\":{\"type\": \"event\", \"value\": []},\n    */\n\n    \"onnegotiationneeded\": {\"type\": \"event\", \"value\": []},\n    \"onicecandidate\": {\"type\": \"event\", \"value\": {\n      \"candidate\": {\n        \"candidate\": \"string\",\n        \"sdpMid\": \"string\",\n        \"sdpMLineIndex\": \"number\"\n      }\n    }},\n    \"onsignalingstatechange\": {\"type\": \"event\", \"value\": []},\n    \"onaddstream\": {\"type\": \"event\", \"value\": {\n      \"stream\": \"number\"\n    }},\n    \"onremovestream\": {\"type\": \"event\", \"value\": {\n      \"stream\": \"number\"\n    }},\n    \"oniceconnectionstatechange\": {\"type\": \"event\", \"value\": []}\n  }\n}\n";
self.coreStorage = "{\n  \"name\": \"core.storage\",\n  \"api\": {\n    \"keys\": {\"type\": \"method\", \"value\": [], \"ret\": [\"array\", \"string\"]},\n    \"get\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": \"string\"},\n    \"set\": {\"type\": \"method\", \"value\": [\"string\", \"string\"], \"ret\": \"string\"},\n    \"remove\": {\"type\": \"method\", \"value\": [\"string\"], \"ret\": \"string\"},\n    \"clear\": {\"type\": \"method\", \"value\": []}\n  }\n}";
self.coreTcpsocket = "{\n  \"name\": \"core.tcpsocket\",\n  \"api\": {\n    // Sockets may be constructed bound to a pre-existing id, as in the case of\n    // interacting with a socket accpeted by a server.  If no Id is specified, a\n    // new socket will be created, which can be either connect'ed or listen'ed.\n    \"constructor\": {\n      \"value\": [\"number\"]\n    },\n  \n    // Get info about a socket.  Tells you whether the socket is active and\n    // available host information.\n    \"getInfo\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"ret\": {\n        \"connected\": \"boolean\",\n        \"localAddress\": \"string\",\n        \"localPort\": \"number\",\n        \"peerAddress\": \"string\",\n        \"peerPort\": \"number\"\n      }\n    },\n  \n    /** \n     * error codes and default messages that may be returned on failures.\n     */\n    \"ERRCODE\": {\"type\": \"constant\", \"value\": {\n      /** GENERAL **/\n      \"SUCCESS\": \"Success!\",\n      // Unknown\n      \"UNKNOWN\": \"Unknown error\",\n      \n      // Socket is already connected\n      \"ALREADY_CONNECTED\": \"Socket already connected\",\n      // Invalid Argument, client error\n      \"INVALID_ARGUMENT\": \"Invalid argument\",\n      // Connection timed out.\n      \"TIMED_OUT\": \"Timed out\",\n      // Operation cannot complete because socket is not connected.\n      \"NOT_CONNECTED\": \"Socket not connected\",\n      // Socket reset because of change in network state.\n      \"NETWORK_CHANGED\": \"Network changed\",\n      // Connection closed\n      \"CONNECTION_CLOSED\": \"Connection closed gracefully\",\n      // Connection Reset\n      \"CONNECTION_RESET\": \"Connection reset\",\n      // Connection Refused\n      \"CONNECTION_REFUSED\": \"Connection refused\",\n      // Generic Failure\n      \"CONNECTION_FAILED\": \"Connection failed\"\n    }},\n    \n    // Close a socket. Will Fail if the socket is not connected or already\n    // closed.\n    \"close\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Receive notification that the socket has disconnected.\n    \"onDisconnect\": {\"type\": \"event\", \"value\": {\n      \"errcode\": \"string\",\n      \"message\": \"string\"\n    }},\n  \n    // Connect to a host and port.\n    // Fails with an error if connection fails.\n    \"connect\": {\n      \"type\": \"method\",\n      \"value\": [\"string\", \"number\"],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Upgrades a socket to TLS, expected to be invoked after connect.\n    \"secure\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Prepares a socket for becoming secure after the next read event.\n    // See details at\n    // https://github.com/freedomjs/freedom/wiki/prepareSecure-API-Usage\n    // This should be called one read prior to calling .secure, e.g. in XMPP\n    // this should be called before sending \"starttls\", then after a \"proceed\"\n    // message is read .secure should be called.\n    \"prepareSecure\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Write buffer data to a socket.\n    // Fails with an error if write fails.\n    \"write\": {\n      \"type\": \"method\",\n      \"value\": [\"buffer\"],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Receive data on a connected socket.\n    \"onData\": {\n      \"type\": \"event\",\n      \"value\": {\"data\": \"buffer\"}\n    },\n  \n    // Listen as a server at a specified host and port.\n    // After calling listen the client should listen for 'onConnection' events.\n    // Fails with an error if errors occur while binding or listening.\n    \"listen\": {\n      \"type\": \"method\",\n      \"value\": [\"string\", \"number\"],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Receive a connection.\n    // The socket parameter may be used to construct a new socket.\n    // Host and port information provide information about the remote peer.\n    \"onConnection\": {\"type\": \"event\", \"value\": {\n      \"socket\": \"number\",\n      \"host\": \"string\",\n      \"port\": \"number\"\n    }}\n  }\n}\n";
self.coreUdpsocket = "// A UDP socket.\n// Generally, to use you just need to call bind() at which point onData\n// events will start to flow. Note that bind() should only be called\n// once per instance.\n{\n  \"name\": \"core.udpsocket\",\n  \"api\": {\n    /** \n     * error codes and default messages that may be returned on failures.\n     */\n    \"ERRCODE\": {\"type\": \"constant\", \"value\": {\n      /** GENERAL **/\n      \"SUCCESS\": \"Success!\",\n      // Unknown\n      \"UNKNOWN\": \"Unknown error\",\n      \n      // Socket is already bound\n      \"ALREADY_BOUND\": \"Socket already bound\",\n      // Invalid Argument, client error\n      \"INVALID_ARGUMENT\": \"Invalid argument\",\n      // Socket reset because of change in network state.\n      \"NETWORK_CHANGED\": \"Network changed\",\n      // Failure to send data\n      \"SNED_FAILED\": \"Send failed\"\n    }},\n  \n    // Creates a socket, binds it to an interface and port and listens for\n    // messages, dispatching each message as on onData event.\n    // Returns on success, or fails with an error on failure.\n    \"bind\": {\n      \"type\": \"method\",\n      \"value\": [\n        // Interface (address) on which to bind.\n        \"string\",\n        // Port on which to bind.\n        \"number\"\n      ],\n      \"ret\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Retrieves the state of the socket.\n    // Returns an object with the following properties:\n    //  - localAddress: the socket's local address, if bound\n    //  - localPort: the socket's local port, if bound\n    \"getInfo\": {\"type\": \"method\", \"value\": [], \"ret\": {\n      \"localAddress\": \"string\",\n      \"localPort\": \"number\"\n    }},\n  \n    // Sends data to a server.\n    // The socket must be bound.\n    // Returns an integer indicating the number of bytes written, with no\n    // guarantee that the remote side received the data.\n    \"sendTo\": {\n      \"type\": \"method\",\n      \"value\": [\n        // Data to send.\n        \"buffer\",\n        // Destination address.\n        \"string\",\n        // Destination port.\n        \"number\"\n      ],\n      \"ret\": \"number\",\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    // Releases all resources associated with this socket.\n    // No-op if the socket is not bound.\n    \"destroy\": {\"type\": \"method\", \"value\": []},\n  \n    // Called once for each message received on this socket, once it's\n    // been successfully bound.\n    \"onData\": {\n      \"type\": \"event\",\n      \"value\": {\n        // Zero means success, any other \"value\" is implementation-dependent.\n        \"resultCode\": \"number\",\n        // Address from which data was received.\n        \"address\": \"string\",\n        // Port from which data was received.\n        \"port\": \"number\",\n        // Data received.\n        \"data\": \"buffer\"\n      }\n    }\n  }\n}\n";
self.coreView = "{\n  \"name\": \"core.view\",\n  \"api\": {\n    \"show\": {\"type\": \"method\", \"value\": [\"string\"]},\n    \"isSecure\": {\"type\": \"method\", \"value\": [], \"ret\": \"boolean\" },\n    \"close\": {\"type\": \"method\", \"value\": []},\n    \"postMessage\": {\"type\": \"method\", \"value\": [\"object\"]},\n  \n    \"message\": {\"type\": \"event\", \"value\": \"object\"},\n    \"onClose\": {\"type\": \"event\", \"value\": []}\n  }\n}\n";
self.coreWebsocket = "{\n  \"name\": \"core.websocket\",\n  \"api\": {\n    // Constructs new websocket. Errors in construction are passed on\n    // through the onError event.\n    \"constructor\": {\"value\": [\n      // URL to connect through\n      \"string\",\n      // Protocols\n      [\"array\", \"string\"]\n    ]},\n    // Send the data to the other side of this connection. Only one of\n    // the entries in the dictionary that is passed will be sent.\n    \"send\": {\n      \"type\": \"method\",\n      \"value\": [{\n        \"text\": \"string\",\n        \"binary\": \"blob\",\n        \"buffer\": \"buffer\"\n      }],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n    \"getReadyState\": {\n      \"type\": \"method\",\n      \"value\": [],\n      // 0 -> CONNECTING\n      // 1 -> OPEN\n      // 2 -> CLOSING\n      // 3 -> CLOSED\n      \"ret\": \"number\"\n    },\n    \"getBufferedAmount\": {\"type\": \"method\",\n                          \"value\": [\"string\"],\n                          \"ret\": \"number\"},\n    \"close\": {\n      \"type\": \"method\",\n      // The first argument is a status code from\n      // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent\n      \"value\": [\"number\", \"string\"],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n    \"onMessage\": {\n      \"type\": \"event\",\n      // The data will be stored in one of the keys,\n      // corresponding with the \"type\" received\n      \"value\": {\n        \"text\": \"string\",\n        \"binary\": \"blob\",\n        \"buffer\": \"buffer\"\n      }\n    },\n    \"onOpen\": {\n      \"type\": \"event\",\n      \"value\": []\n    },\n    \"onError\": {\n      \"type\": \"event\",\n      \"value\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n    \"onClose\": {\n      \"type\": \"event\",\n      // \"value\"s given by WebSockets spec:\n      // http://www.w3.org/TR/websockets/#closeevent\n      \"value\": {\n        \"code\": \"number\",\n        \"reason\": \"string\",\n        \"wasClean\": \"boolean\"\n      }\n    }\n  }\n}\n";
self.social = "/**\n * SOCIAL API\n *\n * API for connecting to social networks and messaging of users.\n * An instance of a social provider encapsulates a single user logging into\n * a single network.\n *\n * This API distinguishes between a \"user\" and a \"client\". A client is a\n * user's point of access to the social provider. Thus, a user that has\n * multiple connections to a provider (e.g., on multiple devices or in multiple\n * browsers) has multiple clients.\n *\n * The semantics of some properties are defined by the specific provider, e.g.:\n * - Edges in the social network (who is on your roster)\n * - Reliable message passing (or unreliable)\n * - In-order message delivery (or out of order)\n * - Persistent clientId - Whether your clientId changes between logins when\n *    connecting from the same device\n *\n * A <client_state>, used in this API, is defined as:\n * - Information related to a specific client of a user\n * - Use cases: \n *   - Returned on changes for friends or my instance in 'onClientState'\n *   - Returned in a global list from 'getClients'\n * {\n *   // Mandatory\n *   'userId': 'string',      // Unique ID of user (e.g. alice@gmail.com)\n *   'clientId': 'string',    // Unique ID of client\n *                            // (e.g. alice@gmail.com/Android-23nadsv32f)\n *   'status': 'string',      // Status of the client. 'STATUS' member.\n *   'lastUpdated': 'number', // Timestamp of the last time client_state was updated\n *   'lastSeen': 'number'     // Timestamp of the last seen time of this device.\n *                            // Note: 'lastSeen' DOES NOT trigger an 'onClientState' event\n * }\n * \n * A <user_profile>, used in this API, is defined as:\n * - Information related to a specific user (profile information)\n * - Use cases:\n *   - Returned on changes for friends or myself in 'onUserProfile'\n *   - Returned in a global list from 'getUsers'\n * {\n *   // Mandatory\n *   \"userId\": \"string\",    // Unique ID of user (e.g. alice@gmail.com)\n *   \"lastUpdated\": \"number\"  // Timestamp of last change to the profile\n *   // Optional\n *   \"name\": \"string\",      // Name (e.g. Alice)\n *   \"url\": \"string\",       // Homepage URL\n *   \"imageData\": \"string\", // URI of a profile image.\n * }\n **/\n{\n  \"name\": \"social\",\n  \"api\": {\n    /** \n     * error codes and default messages that may be returned on failures.\n     */\n    \"ERRCODE\": {\"type\": \"constant\", \"value\": {\n      /** GENERAL **/\n      \"SUCCESS\": \"Success!\",\n      // Unknown\n      \"UNKNOWN\": \"Unknown error\",\n      // User is currently offline\n      \"OFFLINE\": \"User is currently offline\",\n      // Improper parameters\n      \"MALFORMEDPARAMETERS\": \"Parameters are malformed\",\n  \n      /** LOGIN **/\n      // Error authenticating to the server (e.g. invalid credentials)\n      \"LOGIN_BADCREDENTIALS\": \"Error authenticating with server\",\n      // Error with connecting to the server\n      \"LOGIN_FAILEDCONNECTION\": \"Error connecting to server\",\n      // User is already logged in\n      \"LOGIN_ALREADYONLINE\": \"User is already logged in\",\n      // OAuth Error\n      \"LOGIN_OAUTHERROR\": \"OAuth Error\",\n  \n      /** SENDMESSAGE **/\n      // Message sent to invalid destination (e.g. not in user's roster)\n      \"SEND_INVALIDDESTINATION\": \"Message sent to an invalid destination\"\n    }},\n    \n    /**\n     * List of possible statuses for <client_state>.status\n     **/\n    \"STATUS\": {\"type\": \"constant\", \"value\": {\n      // Not logged in\n      \"OFFLINE\": \"OFFLINE\",\n      // This client runs the same freedom.js app as you and is online\n      \"ONLINE\": \"ONLINE\",\n      // This client is online, but does not run the same app (chat client)\n      // (i.e. can be useful to invite others to your freedom.js app)\n      \"ONLINE_WITH_OTHER_APP\": \"ONLINE_WITH_OTHER_APP\"\n    }},\n  \n    /**\n     * Log into the network (See below for parameters)\n     * e.g. social.login(Object options)\n     *\n     * @method login\n     * @param {Object} loginOptions - See below\n     * @return {Object} <client_state>\n     **/\n    \"login\": {\n      \"type\": \"method\",\n      \"value\": [{\n        // Optional\n        \"agent\": \"string\",         // Name of the application\n        \"version\": \"string\",       // Version of application\n        \"url\": \"string\",           // URL of application\n        \"interactive\": \"boolean\",  // Allow user interaction from provider.\n                                   // If not set, interpreted as true.\n        \"rememberLogin\": \"boolean\" // Cache login credentials. If not set,\n                                   // interpreted as true.\n      }],\n      \"ret\": {                       // <client_state>, defined above.\n        \"userId\": \"string\",\n        \"clientId\": \"string\",\n        \"status\": \"string\",\n        \"lastUpdated\": \"number\",\n        \"lastSeen\": \"number\"\n      },\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Clears cached credentials of the provider.\n     *\n     * @method clearCachedCredentials\n     * @return nothing\n     **/\n    \"clearCachedCredentials\": {\"type\": \"method\", \"value\": []},\n  \n    /**\n     * Get <client_state>s that have been observed.\n     * The provider implementation may act as a client, in which case its\n     * <client_state> will be in this list.\n     * getClients may not represent an entire roster, since it may not be\n     * enumerable.\n     * \n     * @method getClients\n     * @return {Object} { \n     *    \"clientId1\": <client_state>,\n     *    \"clientId2\": <client_state>,\n     *     ...\n     * } List of <client_state>s indexed by clientId\n     *   On failure, rejects with an error code.\n     **/\n    \"getClients\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"ret\": \"object\",\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Get <user_profile>s that have been observed.\n     * The provider implementation may act as a client, in which case its\n     * <user_profile> will be in this list.\n     * getUsers may not represent an entire roster, since it may not be\n     * enumerable.\n     *\n     * @method getUsers\n     * @return {Object} { \n     *    \"userId1\": <user_profile>,\n     *    \"userId2\": <user_profile>,\n     *     ...\n     * } List of <user_profile>s indexed by userId\n     *   On failure, rejects with an error code.\n     **/\n    \"getUsers\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"ret\": \"object\",\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /** \n     * Send a message.\n     * Destination may be a userId or a clientId. If it is a userId, all clients\n     * for that user should receive the message.\n     * \n     * @method sendMessage\n     * @param {String} destination_id The userId or clientId to send to\n     * @param {String} message The message to send.\n     * @return nothing\n     *  On failure, rejects with an error code\n     **/\n    \"sendMessage\": {\n      \"type\": \"method\",\n      \"value\": [\"string\", \"string\"],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Log out of the network.\n     * \n     * @method logout\n     * @return nothing\n     *  On failure, rejects with an error code\n     **/\n    \"logout\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Receive an incoming message.\n     **/\n    \"onMessage\": {\"type\": \"event\", \"value\": {\n      \"from\": {               // <client_state>, defined above.\n        \"userId\": \"string\",\n        \"clientId\": \"string\",\n        \"status\": \"string\",\n        \"lastUpdated\": \"number\",\n        \"lastSeen\": \"number\"\n      },\n      \"message\": \"string\"     // message contents\n    }},\n  \n    /**\n     * Receive a change to a <user_profile>.\n     **/\n    \"onUserProfile\": {\"type\": \"event\", \"value\": { // <user_profile>, defined above.\n      \"userId\": \"string\",\n      \"lastUpdated\": \"number\",\n      \"name\": \"string\",\n      \"url\": \"string\",\n      \"imageData\": \"string\"\n    }},\n  \n    /**\n     * Receive a change to a <client_state>.\n     **/\n    \"onClientState\": {\"type\": \"event\", \"value\": { // <client_state>, defined above.\n      \"userId\": \"string\",\n      \"clientId\": \"string\",\n      \"status\": \"string\",\n      \"lastUpdated\": \"number\",\n      \"lastSeen\": \"number\"\n    }}\n  }\n}\n";
self.storage = "/**\r\n * STORAGE API\r\n *\r\n * API for Persistent Storage\r\n * Exposes a key-value get/put interface\r\n **/\r\n{\r\n  \"name\": \"storage\",\r\n  \"api\": {\r\n    /** \r\n     * List of scopes that can preferred when accessing storage.\r\n    **/\r\n    \"scope\": {\"type\": \"constant\", \"value\": {\r\n      // Storage should only last while the app is active.\r\n      \"SESSION\": 0,\r\n      // Storage should be limited to host the app is bound to.\r\n      \"DEVICE_LOCAL\": 1,\r\n      // Storage should be synchronized between user devices.\r\n      \"USER_LOCAL\": 2,\r\n      // Storage should be synchronized across users.\r\n      \"SHARED\": 3\r\n    }},\r\n  \r\n    /** \r\n     * error codes and default messages that may be returned on failures.\r\n     */\r\n    \"ERRCODE\": {\"type\": \"constant\", \"value\": {\r\n      /** GENERAL **/\r\n      \"SUCCESS\": \"Success!\",\r\n      // Unknown\r\n      \"UNKNOWN\": \"Unknown error\",\r\n      // Database not ready\r\n      \"OFFLINE\": \"Database not reachable\",\r\n      // Improper parameters\r\n      \"MALFORMEDPARAMETERS\": \"Parameters are malformed\"\r\n    }},\r\n  \r\n    /**\r\n     * Create a storage provider.\r\n     * @param {Object} options\r\n     *    scope {storage.scope} The preferred storage scope.\r\n     * @constructor\r\n     */\r\n    \"constructor\": { \"value\": [{\r\n      \"scope\": \"number\"\r\n    }]},\r\n  \r\n    /**\r\n     * Fetch an array of all keys\r\n     * e.g. storage.keys() => [string]\r\n     *\r\n     * @method keys\r\n     * @return an array with all keys in the store \r\n     **/\r\n    \"keys\": {\r\n      \"type\": \"method\",\r\n      \"value\": [],\r\n      \"ret\": [\"array\", \"string\"],\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n  \r\n    /**\r\n     * Fetch a value for a key\r\n     * e.g. storage.get(String key) => string\r\n     *\r\n     * @method get\r\n     * @param {String} key - key to fetch\r\n     * @return {String} Returns a string with the value, null if doesn't exist\r\n     **/\r\n    \"get\": {\r\n      \"type\": \"method\",\r\n      \"value\": [\"string\"],\r\n      \"ret\": \"string\",\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n  \r\n    /**\r\n     * Sets a value to a key\r\n     * e.g. storage.set(String key, String value)\r\n     *\r\n     * @method set\r\n     * @param {String} key - key of value to set\r\n     * @param {String} value - value\r\n     * @return {String} previous value of key if there was one.\r\n     **/\r\n    \"set\": {\r\n      \"type\": \"method\",\r\n      \"value\": [\"string\", \"string\"],\r\n      \"ret\": \"string\",\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n    \r\n    /**\r\n     * Removes a single key\r\n     * e.g. storage.remove(String key)\r\n     *\r\n     * @method remove\r\n     * @param {String} key - key to remove\r\n     * @return {String} previous value of key if there was one.\r\n     **/\r\n    \"remove\": {\r\n      \"type\": \"method\",\r\n      \"value\": [\"string\"],\r\n      \"ret\": \"string\",\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n    \r\n    /**\r\n     * Removes all data from storage\r\n     * e.g. storage.clear()\r\n     *\r\n     * @method clear\r\n     * @return nothing\r\n     **/\r\n    \"clear\": {\r\n      \"type\": \"method\",\r\n      \"value\": [],\r\n      \"ret\": [],\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    }\r\n  }\r\n}\r\n";
self.storebuffer = "\r\n/**\r\n * STORAGE API\r\n *\r\n * API for Persistent Storage\r\n * Exposes a key-value get/put interface\r\n **/\r\n{\r\n  \"name\": \"storebuffer\",\r\n  \"api\": {\r\n    /** \r\n     * List of scopes that can preferred when accessing storage.\r\n    **/\r\n    \"scope\": {\"type\": \"constant\", \"value\": {\r\n      // Storage should only last while the app is active.\r\n      \"SESSION\": 0,\r\n      // Storage should be limited to host the app is bound to.\r\n      \"DEVICE_LOCAL\": 1,\r\n      // Storage should be synchronized between user devices.\r\n      \"USER_LOCAL\": 2,\r\n      // Storage should be synchronized across users.\r\n      \"SHARED\": 3\r\n    }},\r\n  \r\n    /** \r\n     * error codes and default messages that may be returned on failures.\r\n     */\r\n    \"ERRCODE\": {\"type\": \"constant\", \"value\": {\r\n      /** GENERAL **/\r\n      \"SUCCESS\": \"Success!\",\r\n      // Unknown\r\n      \"UNKNOWN\": \"Unknown error\",\r\n      // Database not ready\r\n      \"OFFLINE\": \"Database not reachable\",\r\n      // Improper parameters\r\n      \"MALFORMEDPARAMETERS\": \"Parameters are malformed\"\r\n    }},\r\n  \r\n    /**\r\n     * Create a storage provider.\r\n     * @param {Object} options\r\n     *    scope {storage.scope} The preferred storage scope.\r\n     * @constructor\r\n     */\r\n    \"constructor\": { \"value\": [{\r\n      \"scope\": \"number\"\r\n    }]},\r\n  \r\n    /**\r\n     * Fetch an array of all keys\r\n     * e.g. storage.keys() => [string]\r\n     *\r\n     * @method keys\r\n     * @return an array with all keys in the store \r\n     **/\r\n    \"keys\": {\r\n      \"type\": \"method\",\r\n      \"value\": [],\r\n      \"ret\": [\"array\", \"string\"],\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n  \r\n    /**\r\n     * Fetch a value for a key\r\n     * e.g. storage.get(String key) => string\r\n     *\r\n     * @method get\r\n     * @param {String} key - key to fetch\r\n     * @return {ArrayBuffer} Returns value, null if doesn't exist\r\n     **/\r\n    \"get\": {\r\n      \"type\": \"method\",\r\n      \"value\": [\"string\"],\r\n      \"ret\": \"buffer\",\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n  \r\n    /**\r\n     * Sets a value to a key\r\n     * e.g. storage.set(String key, String value)\r\n     *\r\n     * @method set\r\n     * @param {String} key - key of value to set\r\n     * @param {ArrayBuffer} value - value\r\n     * @return {String} previous value of key if there was one.\r\n     **/\r\n    \"set\": {\r\n      \"type\": \"method\",\r\n      \"value\": [\"string\", \"buffer\"],\r\n      \"ret\": \"buffer\",\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n    \r\n    /**\r\n     * Removes a single key\r\n     * e.g. storage.remove(String key)\r\n     *\r\n     * @method remove\r\n     * @param {String} key - key to remove\r\n     * @return {String} previous value of key if there was one.\r\n     **/\r\n    \"remove\": {\r\n      \"type\": \"method\",\r\n      \"value\": [\"string\"],\r\n      \"ret\": \"buffer\",\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    },\r\n    \r\n    /**\r\n     * Removes all data from storage\r\n     * e.g. storage.clear()\r\n     *\r\n     * @method clear\r\n     * @return nothing\r\n     **/\r\n    \"clear\": {\r\n      \"type\": \"method\",\r\n      \"value\": [],\r\n      \"ret\": [],\r\n      \"err\": {\r\n        \"errcode\": \"string\",\r\n        \"message\": \"string\"\r\n      }\r\n    }\r\n  }\r\n}\r\n";
self.transport = "/**\n * TRANSPORT API\n *\n * API for peer-to-peer communication\n * Useful for sending large binary data between instances\n **/\n{\n  \"name\": \"transport\",\n  \"api\": {\n    /** \n     * error codes and default messages that may be returned on failures.\n     */\n    \"ERRCODE\": {\"type\": \"constant\", \"value\": {\n      /** GENERAL **/\n      \"SUCCESS\": \"Success!\",\n      // Unknown\n      \"UNKNOWN\": \"Unknown error\",\n      // Database not ready\n      \"OFFLINE\": \"Not reachable\",\n      // Improper parameters\n      \"MALFORMEDPARAMETERS\": \"Parameters are malformed\"\n    }},\n  \n    /**\n     * Prepare a P2P connection with initialization parameters\n     * Takes in a signalling pathway (freedom.js channel), which is used\n     * by the transport provider to send/receive signalling messages\n     * to the other side of the P2P connection for setup.\n     *\n     * @method setup\n     * @param {String} name - give this connection a name for logging\n     * @param {Proxy} channel - signalling channel\n     * @return nothing.\n     **/\n    \"setup\": {\n      \"type\": \"method\",\n      \"value\": [\"string\", \"proxy\"],\n      \"ret\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Send binary data to the peer\n     * All data is labelled with a string tag\n     * Any data sent with the same tag is sent in order,\n     * but there is no guarantees between tags\n     *\n     * @method send\n     * @param {string} tag\n     * @param {buffer} data\n     * @return nothing\n     **/\n    \"send\": {\n      \"type\": \"method\",\n      \"value\": [\"string\", \"buffer\"],\n      \"ret\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Close the connection. Any data queued for sending, or in the\n     * process of sending, may be dropped. If the state of the promse of\n     * the send method is \"pending\" then the data for that send call may\n     * be sending or queued.\n     * \n     * @method close\n     * @return nothing\n     **/\n    \"close\": {\n      \"type\": \"method\",\n      \"value\": [],\n      \"ret\": [],\n      \"err\": {\n        \"errcode\": \"string\",\n        \"message\": \"string\"\n      }\n    },\n  \n    /**\n     * Event on incoming data (ArrayBuffer)\n     **/\n    \"onData\": {\n      \"type\": \"event\",\n      \"value\": {\n        \"tag\": \"string\",\n        \"data\": \"buffer\"\n      }\n    },\n  \n    /**\n     * Event on successful closing of the connection\n     **/\n    \"onClose\": {\n      \"type\": \"event\",\n      \"value\": []\n    }\n  }\n}\n";
return self})();
  } catch (e) {
    // pass.
  }
  /*jslint nomen: false */
  util.eachProp(found, function (json) {
    this.interfaces.push(JSON.parse(minify(json)));
  }.bind(this));
};


/**
 * Populate an API registry with provided providers, and with known API
 * definitions.
 * @static
 * @method register
 * @param {{name: string, provider: Function, style?: string}[]} providers
 *   The core providers made available to this freedom.js instance.
 * @param {Api} registry The API registry to populate.
 */
exports.register = function (providers, registry) {
  'use strict';
  var bundle = new Bundle();
  bundle.interfaces.forEach(function (api) {
    if (api && api.name && api.api) {
      registry.set(api.name, api.api);
    }
  });

  providers.forEach(function (provider) {
    if (provider.name) {
      registry.register(provider.name, provider.provider, provider.style);
    }
  });
};

},{"./util":44,"fs":11,"node-json-minify":13}],29:[function(require,module,exports){
/*globals Blob, ArrayBuffer, DataView */
/*jslint indent:2, node:true, sloppy:true */
var util = require('./util');

/**
 * A freedom port for a user-accessable api.
 * @class Consumer
 * @implements Port
 * @uses handleEvents
 * @param {Object} interfaceCls The api interface exposed by this consumer.
 * @param {Debug} debug The debugger to use for logging.
 * @constructor
 */
var Consumer = function (interfaceCls, debug) {
  this.id = Consumer.nextId();
  this.interfaceCls = interfaceCls;
  this.debug = debug;
  util.handleEvents(this);
  
  this.ifaces = {};
  this.closeHandlers = {};
  this.errorHandlers = {};
  this.emits = {};
};

/**
 * Receive incoming messages for this consumer.
 * @method onMessage
 * @param {String} source The source of the message.
 * @param {Object} message The received message.
 */
Consumer.prototype.onMessage = function (source, message) {
  if (source === 'control' && message.reverse) {
    this.emitChannel = message.channel;
    this.emit(this.emitChannel, {
      type: 'channel announcement',
      channel: message.reverse
    });
    this.emit('start');
  } else if (source === 'control' && message.type === 'setup') {
    this.controlChannel = message.channel;
  } else if (source === 'control' && message.type === 'close') {
    delete this.controlChannel;
    this.doClose();
  } else {
    if (!this.emitChannel && message.channel) {
      this.emitChannel = message.channel;
      this.emit('start');
      return;
    }
    if (message.type === 'close' && message.to) {
      this.teardown(message.to);
      return;
    }
    if (message.type === 'error') {
      this.error(message.to, message.message);
      return;
    }
    if (message.to) {
      if (this.emits[message.to]) {
        this.emits[message.to]('message', message.message);
      } else {
        this.debug.warn('Could not deliver message, no such interface: ' + message.to);
      }
    } else {
      var msg = message.message;
      util.eachProp(this.emits, function (iface) {
        iface('message', message.message);
      });
    }
  }
};

/**
 * Create a consumer.Interface associated with this consumer.
 * An interface is returned, which is supplied with important control of the
 * api via constructor arguments: (bound below in getInterfaceConstructor)
 * 
 * onMsg: function(binder) sets the function to call when messages for this
 *    interface arrive on the channel,
 * emit: function(msg) allows this interface to emit messages,
 * id: string is the Identifier for this interface.
 * @method getInterface
 */
Consumer.prototype.getInterface = function () {
  var Iface = this.getInterfaceConstructor(),
    args = Array.prototype.slice.call(arguments, 0);
  if (args.length) {
    Iface = Iface.bind.apply(Iface, [Iface].concat(args));
  }
  return new Iface();
};

/**
 * Attach an 'onEvent' listener to an interface, allowing external consumers
 * to either listen to channel state, or register callbacks on lifetime events
 * of individual instances of the interface.
 * @method getListener
 * @parma {String} name The event to listen to.
 * @private
 */
Consumer.prototype.getListener = function (name) {
  return function (instance, handler) {
    // Listen to the channel directly.
    if (typeof instance === 'function' && handler === undefined) {
      this.once(name, instance);
      return;
    }

    // Listen to a specific instance.
    var handlers = name + 'Handlers';
    util.eachProp(this.ifaces, function (candidate, id) {
      if (candidate === instance) {
        if (this[handlers][id]) {
          this[handlers][id].push(handler);
        } else {
          this[handlers][id] = [handler];
        }
        return true;
      }
    }.bind(this));
  }.bind(this);
};

/**
 * Create a function that can be used to get interfaces from this api consumer
 * from a user-visible point.
 * @method getProxyInterface
 */
Consumer.prototype.getProxyInterface = function () {
  var func = function (p) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length > 0) {
      return p.getInterface.apply(p, args);
    } else {
      return p.getInterface();
    }
  }.bind({}, this);

  func.close = function (iface) {
    if (iface) {
      util.eachProp(this.ifaces, function (candidate, id) {
        if (candidate === iface) {
          this.teardown(id);
          this.emit(this.emitChannel, {
            type: 'close',
            to: id
          });
          return true;
        }
      }.bind(this));
    } else {
      // Close the channel.
      this.doClose();
    }
  }.bind(this);

  func.onClose = this.getListener('close');
  func.onError = this.getListener('error');

  return func;
};

/**
 * Provides a bound class for creating a consumer.Interface associated
 * with this api. This partial level of construction can be used
 * to allow the consumer to be used as a provider for another API.
 * @method getInterfaceConstructor
 * @private
 */
Consumer.prototype.getInterfaceConstructor = function () {
  var id = Consumer.nextId();
  return this.interfaceCls.bind(
    {},
    function (id, obj, binder) {
      this.ifaces[id] = obj;
      this.emits[id] = binder;
    }.bind(this, id),
    this.doEmit.bind(this, id),
    this.debug
  );
};

/**
 * Emit a message on the channel once setup is complete.
 * @method doEmit
 * @private
 * @param {String} to The ID of the flow sending the message.
 * @param {Object} msg The message to emit
 * @param {Boolean} all Send message to all recipients.
 */
Consumer.prototype.doEmit = function (to, msg, all) {
  if (all) {
    to = false;
  }
  if (this.emitChannel) {
    this.emit(this.emitChannel, {to: to, type: 'message', message: msg});
  } else {
    this.once('start', this.doEmit.bind(this, to, msg));
  }
};

/**
 * Teardown a single interface of this api.
 * @method teardown
 * @param {String} id The id of the interface to tear down.
 */
Consumer.prototype.teardown = function (id) {
  delete this.emits[id];
  if (this.closeHandlers[id]) {
    util.eachProp(this.closeHandlers[id], function (prop) {
      prop();
    });
  }
  delete this.ifaces[id];
  delete this.closeHandlers[id];
  delete this.errorHandlers[id];
};

/**
 * Handle a message error reported to this api.
 * @method error
 * @param {String?} id The id of the interface where the error occured.
 * @param {Object} message The message which failed, if relevant.
 */
Consumer.prototype.error = function (id, message) {
  if (id && this.errorHandlers[id]) {
    util.eachProp(this.errorHandlers[id], function (prop) {
      prop(message);
    });
  } else if (!id) {
    this.emit('error', message);
  }
};


/**
 * Close / teardown the flow this api terminates.
 * @method doClose
 */
Consumer.prototype.doClose = function () {
  if (this.controlChannel) {
    this.emit(this.controlChannel, {
      type: 'Channel Closing',
      request: 'close'
    });
  }

  util.eachProp(this.emits, function (emit, id) {
    this.teardown(id);
  }.bind(this));

  this.emit('close');
  this.off();

  this.emitChannel = null;
};

/**
 * Get the textual description of this port.
 * @method toString
 * @return The description of this port.
 */
Consumer.prototype.toString = function () {
  if (this.emitChannel) {
    return "[Consumer " + this.emitChannel + "]";
  } else {
    return "[unbound Consumer]";
  }
};

/**
 * Get the next ID for an api channel.
 * @method nextId
 * @static
 * @private
 */
Consumer.nextId = function () {
  if (!Consumer.id) {
    Consumer.id = 1;
  }
  return (Consumer.id += 1);
};

/**
 * Convert a structured data structure into a message stream conforming to
 * a template and an array of binary data elements.
 * @static
 * @method messageToPortable
 * @param {Object} template The template to conform to
 * @param {Object} value The instance of the data structure to confrom
 * @param {Debug} debug A debugger for errors.
 * @return {{text: Object, binary: Array}} Separated data streams.
 */
Consumer.messageToPortable = function (template, value, debug) {
  var externals = [],
    message = Consumer.conform(template, value, externals, true, debug);
  return {
    text: message,
    binary: externals
  };
};

/**
 * Convert Structured Data streams into a data structure conforming to a
 * template.
 * @static
 * @method portableToMessage
 * @param {Object} template The template to conform to
 * @param {{text: Object, binary: Array}} streams The streams to conform
 * @param {Debug} debug A debugger for errors.
 * @return {Object} The data structure matching the template.
 */
Consumer.portableToMessage = function (template, streams, debug) {
  return Consumer.conform(template, streams.text, streams.binary, false, debug);
};

/**
 * Force a collection of values to look like the types and length of an API
 * template.
 * @static
 * @method conform
 * @param {Object} template The template to conform to
 * @param {Object} from The value to conform
 * @param {Array} externals Listing of binary elements in the template
 * @param {Boolean} Whether to to separate or combine streams.
 * @aparam {Debug} debug A debugger for errors.
 */
Consumer.conform = function (template, from, externals, separate, debug) {
  /* jshint -W086 */
  if (typeof (from) === 'function') {
    //from = undefined;
    //throw "Trying to conform a function";
    return undefined;
  } else if (typeof (from) === 'undefined') {
    return undefined;
  } else if (from === null) {
    return null;
  } else if (template === undefined) {
    debug.error("Message discarded for not matching declared type!", from);
    return undefined;
  }

  switch (template) {
  case 'string':
    return String('') + from;
  case 'number':
    return Number(1) * from;
  case 'boolean':
    return Boolean(from === true);
  case 'object':
    // TODO(willscott): Allow removal if sandboxing enforces this.
    if (typeof from === 'undefined') {
      return undefined;
    } else {
      return JSON.parse(JSON.stringify(from));
    }
  case 'blob':
    if (separate) {
      if (from instanceof Blob) {
        externals.push(from);
        return externals.length - 1;
      } else {
        debug.error('conform expecting Blob, but saw ' + (typeof from));
        externals.push(new Blob([]));
        return externals.length - 1;
      }
    } else {
      return externals[from];
    }
  case 'buffer':
    if (separate) {
      externals.push(Consumer.makeArrayBuffer(from, debug));
      return externals.length - 1;
    } else {
      return Consumer.makeArrayBuffer(externals[from], debug);
    }
  case 'proxy':
    return from;
  }
  var val, i;
  if (Array.isArray(template) && from !== undefined) {
    val = [];
    i = 0;
    if (template.length === 2 && template[0] === 'array') {
      //console.log("template is array, value is " + JSON.stringify(value));
      for (i = 0; i < from.length; i += 1) {
        val.push(Consumer.conform(template[1], from[i], externals,
                                  separate, debug));
      }
    } else {
      for (i = 0; i < template.length; i += 1) {
        if (from[i] !== undefined) {
          val.push(Consumer.conform(template[i], from[i], externals,
                                    separate, debug));
        } else {
          val.push(undefined);
        }
      }
    }
    return val;
  } else if (typeof template === 'object' && from !== undefined) {
    val = {};
    util.eachProp(template, function (prop, name) {
      if (from[name] !== undefined) {
        val[name] = Consumer.conform(prop, from[name], externals, separate,
                                     debug);
      }
    });
    return val;
  }
  debug.error('Unknown template provided: ' + template);
};

/**
 * Make a thing into an Array Buffer
 * @static
 * @method makeArrayBuffer
 * @param {Object} thing
 * @param {Debug} debug A debugger in case of errors.
 * @return {ArrayBuffer} An Array Buffer
 */
Consumer.makeArrayBuffer = function (thing, debug) {
  if (!thing) {
    return new ArrayBuffer(0);
  }

  if (thing instanceof ArrayBuffer) {
    return thing;
  } else if (thing.constructor.name === "ArrayBuffer" &&
      typeof thing.prototype === "undefined") {
    // Workaround for webkit origin ownership issue.
    // https://github.com/UWNetworksLab/freedom/issues/28
    return new DataView(thing).buffer;
  } else {
    debug.error('expecting ArrayBuffer, but saw ' +
        (typeof thing) + ': ' + JSON.stringify(thing));
    return new ArrayBuffer(0);
  }
};

/**
 * Recursively traverse a [nested] object and freeze its keys from being
 * writable. Note, the result can have new keys added to it, but existing ones
 * cannot be  overwritten. Doesn't do anything for arrays or other collections.
 *
 * @method recursiveFreezeObject
 * @static
 * @param {Object} obj - object to be frozen
 * @return {Object} obj
 **/
Consumer.recursiveFreezeObject = function (obj) {
  var k, ret = {};
  if (typeof obj !== 'object') {
    return obj;
  }
  for (k in obj) {
    if (obj.hasOwnProperty(k)) {
      Object.defineProperty(ret, k, {
        value: Consumer.recursiveFreezeObject(obj[k]),
        writable: false,
        enumerable: true
      });
    }
  }
  return ret;
};

module.exports = Consumer;

},{"./util":44}],30:[function(require,module,exports){
/*jslint indent:2, node:true, sloppy:true */
var util = require('./util');

/**
 * A freedom entry point for debugging.
 * @uses handleEvents
 * @implements Port
 * @constructor
 */
var Debug = function (logger) {
  this.id = 'debug';
  this.emitChannel = false;
  this.config = false;
  util.handleEvents(this);
};

/**
 * Provide a textual description of this port.
 * @method toString
 * @return {String} the textual description.
 */
Debug.prototype.toString = function () {
  return '[Console]';
};

/**
 * Register a logger for outputting debugging messages.
 * @method setLogger
 * @param {Console} logger The logger to register
 */
Debug.prototype.setLogger = function (logger) {
  if (this.logger) {
    this.info('Replacing Logger.');
  }
  this.logger = logger;
  this.emit('logger');
};

/**
 * Handler for receiving messages sent to the debug port.
 * These messages are used to retreive config for exposing console.
 * @method onMessage
 * @param {String} source the source identifier for the message.
 * @param {Object} message the received message.
 */
Debug.prototype.onMessage = function (source, message) {
  if (source === 'control' && message.channel && !this.emitChannel) {
    this.emitChannel = message.channel;
    this.config = message.config;
    if (!this.config.global.console) {
      if (typeof console !== 'undefined') {
        this.config.global.console = console;
      } else {
        this.config.global.console = this.getLogger('Console');
      }
    }
    this.emit('ready');
  }
};

/**
 * Dispatch a debug message with arbitrary severity.
 * All debug messages are routed through the manager, to allow for delegation.
 * @method format
 * @param {String} severity the severity of the message.
 * @param {String} source The location of message.
 * @param {String[]} args The contents of the message.
 * @private
 */
Debug.prototype.format = function (severity, source, args) {
  var i, alist = [], argarr;
  if (typeof args === "string" && source) {
    try {
      argarr = JSON.parse(args);
      if (argarr instanceof Array) {
        args = argarr;
      }
    } catch (e) {
      // pass.
    }
  }

  if (typeof args === "string") {
    alist.push(args);
  } else {
    for (i = 0; i < args.length; i += 1) {
      alist.push(args[i]);
    }
  }
  if (!this.emitChannel) {
    this.on('ready', this.format.bind(this, severity, source, alist));
    return;
  }
  this.emit(this.emitChannel, {
    severity: severity,
    source: source,
    quiet: true,
    request: 'debug',
    msg: JSON.stringify(alist)
  });
};

/**
 * Print received messages on the console.
 * This is called by the manager in response to an emission from format.
 * @method print
 * @param {Object} message The message emitted by {@see format} to print.
 */
Debug.prototype.print = function (message) {
  if (!this.logger) {
    this.once('logger', this.print.bind(this, message));
    return;
  }

  var args, arr = [], i = 0;
  args = JSON.parse(message.msg);
  if (typeof args === "string") {
    arr.push(args);
  } else {
    while (args[i] !== undefined) {
      arr.push(args[i]);
      i += 1;
    }
  }
  this.logger[message.severity].call(this.logger, message.source, arr, function () {});
};

/**
 * Print a log message to the console.
 * @method log
 */
Debug.prototype.log = function () {
  this.format('log', undefined, arguments);
};

/**
 * Print an info message to the console.
 * @method log
 */
Debug.prototype.info = function () {
  this.format('info', undefined, arguments);
};

/**
 * Print a debug message to the console.
 * @method log
 */
Debug.prototype.debug = function () {
  this.format('debug', undefined, arguments);
};

/**
 * Print a warning message to the console.
 * @method warn
 */
Debug.prototype.warn = function () {
  this.format('warn', undefined, arguments);
};

/**
 * Print an error message to the console.
 * @method error
 */
Debug.prototype.error = function () {
  this.format('error', undefined, arguments);
};

/**
 * Get a logger that logs messages prefixed by a given name.
 * @method getLogger
 * @param {String} name The prefix for logged messages.
 * @returns {Console} A console-like object.
 */
Debug.prototype.getLogger = function (name) {
  var log = function (severity, source) {
    var args = Array.prototype.splice.call(arguments, 2);
    this.format(severity, source, args);
  },
    logger = {
      freedom: true,
      debug: log.bind(this, 'debug', name),
      info: log.bind(this, 'info', name),
      log: log.bind(this, 'log', name),
      warn: log.bind(this, 'warn', name),
      error: log.bind(this, 'error', name)
    };
  return logger;
};

module.exports = Debug;

},{"./util":44}],31:[function(require,module,exports){
(function (global){
/*jslint indent:2,node:true */
var PromiseCompat = require('es6-promise').Promise;

var Api = require('./api');
var Debug = require('./debug');
var Hub = require('./hub');
var Manager = require('./manager');
var Policy = require('./policy');
var ProxyBinder = require('./proxybinder');
var Resource = require('./resource');
var util = require('./util');
var Bundle = require('./bundle');

var freedomGlobal;
var getGlobal = function () {
  'use strict';
  
  // Node.js
  if (typeof global !== 'undefined' && global.prototype === undefined) {
    freedomGlobal = global;
  // Browsers
  } else {
    setTimeout(function () {
      freedomGlobal = this;
    }, 0);
  }
};
getGlobal();

/**
 * Create a new freedom context.
 * @param {Object} context Information about the local context.
 * @see {util/workerEntry.js}
 * @param {String} manifest The manifest to load.
 * @param {Object} config Configuration keys set by the user.
 * @returns {Promise} A promise for the module defined in the manifest.
 */
var setup = function (context, manifest, config) {
  'use strict';
  var debug = new Debug(),
    hub = new Hub(debug),
    resource = new Resource(debug),
    api = new Api(debug),
    manager = new Manager(hub, resource, api),
    binder = new ProxyBinder(manager),
    policy,
    site_cfg = {
      'debug': 'log',
      'manifest': manifest,
      'moduleContext': (!context || typeof (context.isModule) === "undefined") ?
          util.isModuleContext() :
          context.isModule
    },
    link,
    Port;

  if (config) {
    util.mixin(site_cfg, config, true);
  }
  site_cfg.global = freedomGlobal;
  if (context) {
    util.mixin(site_cfg, context, true);
  }

  // Register user-supplied extensions.
  // For example the 'core.oauth' provider defines a register function,
  // which enables site_cfg.oauth to be registered with it.
  context.providers.forEach(function (provider) {
    if (provider.name.indexOf('core.') === 0 &&
        typeof provider.register === 'function') {
      provider.register(
        (typeof site_cfg[provider.name.substr(5)] !== 'undefined') ?
            site_cfg[provider.name.substr(5)] :
            undefined
      );
    }
  });
  
  Bundle.register(context.providers, api);
  resource.register(context.resolvers || []);

  return new PromiseCompat(function (resolve, reject) {
    if (site_cfg.moduleContext) {
      Port = site_cfg.portType;
      link = new Port('Outbound', resource);
      manager.setup(link);

      // Delay debug messages until delegation to the parent context is setup.
      manager.once('delegate', manager.setup.bind(manager, debug));
    } else {
      manager.setup(debug);
      policy = new Policy(manager, resource, site_cfg);

      // Define how to load a root module.
      var fallbackLogger, getIface;
      fallbackLogger = function (message) {
        api.getCore('core.console', debug).then(function (Logger) {
          debug.setLogger(new Logger());
          if (message) {
            debug.error(message);
          }
        });
      };
      getIface = function (manifest) {
        return resource.get(site_cfg.location, manifest).then(
          function (canonical_manifest) {
            return policy.get([], canonical_manifest);
          }
        ).then(function (instance) {
          manager.setup(instance);
          return binder.bindDefault(instance, api, instance.manifest);
        });
      };

      // Load appropriate Logger.
      if (site_cfg.logger) {
        getIface(site_cfg.logger).then(function (iface) {
          if (iface.external.api !== 'console') {
            fallbackLogger("Unwilling to use logger with unknown API:",
              iface.external.api);
          } else {
            debug.setLogger(iface.external());
          }
        }, fallbackLogger);
      } else {
        fallbackLogger();
      }

      // Load root module.
      getIface(site_cfg.manifest).then(function (iface) {
        return iface.external;
      }, function (err) {
        debug.error('Failed to retrieve manifest: ' + err);
        throw err;
      }).then(resolve, reject);
    }

    hub.emit('config', site_cfg);
  });
};

module.exports = setup;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./api":27,"./bundle":28,"./debug":30,"./hub":32,"./manager":35,"./policy":38,"./proxybinder":42,"./resource":43,"./util":44,"es6-promise":1}],32:[function(require,module,exports){
/*jslint indent:2,sloppy:true,node:true */
var util = require('./util');

/**
 * Defines fdom.Hub, the core message hub between freedom modules.
 * Incomming messages from apps are sent to hub.onMessage()
 * @class Hub
 * @param {Debug} debug Logger for debugging.
 * @constructor
 */
var Hub = function (debug) {
  this.debug = debug;
  this.config = {};
  this.apps = {};
  this.routes = {};
  this.unbound = [];

  util.handleEvents(this);
  this.on('config', function (config) {
    util.mixin(this.config, config);
  }.bind(this));
};

/**
 * Handle an incoming message from a freedom app.
 * @method onMessage
 * @param {String} source The identifiying source of the message.
 * @param {Object} message The sent message.
 */
Hub.prototype.onMessage = function (source, message) {
  var destination = this.routes[source], type;
  if (!destination || !destination.app) {
    this.debug.warn("Message dropped from unregistered source " + source);
    return;
  }

  if (!this.apps[destination.app]) {
    this.debug.warn("Message dropped to destination " + destination.app);
    return;
  }

  // The firehose tracing all internal freedom.js messages.
  if (!message.quiet && !destination.quiet && this.config && this.config.trace) {
    type = message.type;
    if (message.type === 'message' && message.message &&
        message.message.action === 'method') {
      type = 'method.' + message.message.type;
    } else if (message.type === 'method' && message.message &&
        message.message.type === 'method') {
      type = 'return.' + message.message.name;
    } else if (message.type === 'message' && message.message &&
        message.message.type === 'event') {
      type = 'event.' + message.message.name;
    }
    this.debug.debug(this.apps[destination.source].toString() +
        " -" + type + "-> " +
        this.apps[destination.app].toString() + "." + destination.flow);
  }

  this.apps[destination.app].onMessage(destination.flow, message);
};

/**
 * Get the local destination port of a flow.
 * @method getDestination
 * @param {String} source The flow to retrieve.
 * @return {Port} The destination port.
 */
Hub.prototype.getDestination = function (source) {
  var destination = this.routes[source];
  if (!destination) {
    return null;
  }
  return this.apps[destination.app];
};

/**
 * Get the local source port of a flow.
 * @method getSource
 * @param {Port} source The flow identifier to retrieve.
 * @return {Port} The source port.
 */
Hub.prototype.getSource = function (source) {
  if (!source) {
    return false;
  }
  if (!this.apps[source.id]) {
    this.debug.warn("No registered source '" + source.id + "'");
    return false;
  }
  return this.apps[source.id];
};

/**
 * Register a destination for messages with this hub.
 * @method register
 * @param {Port} app The Port to register.
 * @param {Boolean} [force] Whether to override an existing port.
 * @return {Boolean} Whether the app was registered.
 */
Hub.prototype.register = function (app, force) {
  if (!this.apps[app.id] || force) {
    this.apps[app.id] = app;
    return true;
  } else {
    return false;
  }
};

/**
 * Deregister a destination for messages with the hub.
 * Note: does not remove associated routes. As such, deregistering will
 * prevent the installation of new routes, but will not distrupt existing
 * hub routes.
 * @method deregister
 * @param {Port} app The Port to deregister
 * @return {Boolean} Whether the app was deregistered.
 */
Hub.prototype.deregister = function (app) {
  if (!this.apps[app.id]) {
    return false;
  }
  delete this.apps[app.id];
  return true;
};

/**
 * Install a new route in the hub.
 * @method install
 * @param {Port} source The source of the route.
 * @param {Port} destination The destination of the route.
 * @param {String} flow The flow where the destination will receive messages.
 * @param {Boolean} quiet Whether messages on this route should be suppressed.
 * @return {String} A routing source identifier for sending messages.
 */
Hub.prototype.install = function (source, destination, flow, quiet) {
  source = this.getSource(source);
  if (!source) {
    return;
  }
  if (!destination) {
    this.debug.warn("Unwilling to generate blackhole flow from " + source.id);
    return;
  }

  var route = this.generateRoute();
  this.routes[route] = {
    app: destination,
    flow: flow,
    source: source.id,
    quiet: quiet
  };
  if (typeof source.on === 'function') {
    source.on(route, this.onMessage.bind(this, route));
  }

  return route;
};

/**
 * Uninstall a hub route.
 * @method uninstall
 * @param {Port} source The source of the route.
 * @param {String} flow The route to uninstall.
 * @return {Boolean} Whether the route was able to be uninstalled.
 */
Hub.prototype.uninstall = function (source, flow) {
  source = this.getSource(source);
  if (!source) {
    return;
  }

  var route = this.routes[flow];
  if (!route) {
    return false;
  } else if (route.source !== source.id) {
    this.debug.warn("Flow " + flow + " does not belong to port " + source.id);
    return false;
  }

  delete this.routes[flow];
  if (typeof source.off === 'function') {
    source.off(route);
  }
  return true;
};

/**
 * Generate a unique routing identifier.
 * @method generateRoute
 * @return {String} a routing source identifier.
 * @private
 */
Hub.prototype.generateRoute = function () {
  return util.getId();
};

module.exports = Hub;

},{"./util":44}],33:[function(require,module,exports){
/*jslint indent:2, node:true, sloppy:true */
var util = require('./util');

/**
 * A link connects two freedom hubs. This is an abstract class
 * providing common functionality of translating control channels,
 * and integrating config information.
 * @class Link
 * @implements Port
 * @constructor
 */
var Link = function (name, resource) {
  this.id = 'Link' + Math.random();
  this.name = name;
  this.resource = resource;
  this.config = {};
  this.src = null;

  util.handleEvents(this);
  util.mixin(this, Link.prototype);
};

/**
 * Receive messages from the hub to this port.
 * Manages startup, and passes others to 'deliverMessage' implemented
 * in derived classes.
 * @method onMessage
 * @param {String} flow the channel/flow of the message.
 * @param {Object} message The Message.
 */
Link.prototype.onMessage = function (flow, message) {
  if (flow === 'control' && !this.controlChannel) {
    if (!this.controlChannel && message.channel) {
      this.controlChannel = message.channel;
      util.mixin(this.config, message.config);
      this.start();
    }
  } else {
    this.deliverMessage(flow, message);
  }
};

/**
 * Register a handler to alert of errors on this port.
 * @method addErrorHandler
 * @param {Function} handler Method to call with errors.
 */
Link.prototype.addErrorHandler = function (handler) {
  this.onError = handler;
};

/**
 * Report an error on this link.
 * @method onerror
 * @param {Error} err The error that occurred.
 */
Link.prototype.onError = function (err) {
  //Filled in by addErrorHandler
};

/**
 * Emit messages to the the hub, mapping control channels.
 * @method emitMessage
 * @param {String} flow the flow to emit the message on.
 * @param {Object} messgae The message to emit.
 */
Link.prototype.emitMessage = function (flow, message) {
  if (flow === 'control' && this.controlChannel) {
    flow = this.controlChannel;
  }
  this.emit(flow, message);
};

module.exports = Link;

},{"./util":44}],34:[function(require,module,exports){
/*globals Worker */
/*jslint indent:2, white:true, node:true, sloppy:true, browser:true */
var Link = require('../link');

/**
 * A port providing message transport between two freedom contexts via Worker.
 * @class Worker
 * @extends Link
 * @uses handleEvents
 * @constructor
 */
var WorkerLink = function(id, resource) {
  Link.call(this, id, resource);
  if (id) {
    this.id = id;
  }
};

/**
 * Start this port by listening or creating a worker.
 * @method start
 * @private
 */
WorkerLink.prototype.start = function() {
  if (this.config.moduleContext) {
    this.setupListener();
  } else {
    this.setupWorker();
  }
};

/**
 * Stop this port by destroying the worker.
 * @method stop
 * @private
 */
WorkerLink.prototype.stop = function() {
  // Function is determined by setupListener or setupFrame as appropriate.
};

/**
 * Get the textual description of this port.
 * @method toString
 * @return {String} the description of this port.
 */
WorkerLink.prototype.toString = function() {
  return "[Worker " + this.id + "]";
};

/**
 * Set up a global listener to handle incoming messages to this
 * freedom.js context.
 * @method setupListener
 */
WorkerLink.prototype.setupListener = function() {
  var onMsg = function(msg) {
    this.emitMessage(msg.data.flow, msg.data.message);
  }.bind(this);
  this.obj = this.config.global;
  this.obj.addEventListener('message', onMsg, true);
  this.stop = function() {
    this.obj.removeEventListener('message', onMsg, true);
    delete this.obj;
  };
  this.emit('started');
  this.obj.postMessage("Ready For Messages");
};

/**
 * Set up a worker with an isolated freedom.js context inside.
 * @method setupWorker
 */
WorkerLink.prototype.setupWorker = function() {
  var worker,
    blob,
    self = this;
  worker = new Worker(this.config.source + '#' + this.id);

  worker.addEventListener('error', function(err) {
    this.onError(err);
  }.bind(this), true);
  worker.addEventListener('message', function(worker, msg) {
    if (!this.obj) {
      this.obj = worker;
      this.emit('started');
      return;
    }
    this.emitMessage(msg.data.flow, msg.data.message);
  }.bind(this, worker), true);
  this.stop = function() {
    worker.terminate();
    if (this.obj) {
      delete this.obj;
    }
  };
};

/**
 * Receive messages from the hub to this port.
 * Received messages will be emitted from the other side of the port.
 * @method deliverMessage
 * @param {String} flow the channel/flow of the message.
 * @param {Object} message The Message.
 */
WorkerLink.prototype.deliverMessage = function(flow, message) {
  if (flow === 'control' && message.type === 'close' &&
      message.channel === 'control') {
    this.stop();
  } else {
    if (this.obj) {
      this.obj.postMessage({
        flow: flow,
        message: message
      });
    } else {
      this.once('started', this.onMessage.bind(this, flow, message));
    }
  }
};

module.exports = WorkerLink;


},{"../link":33}],35:[function(require,module,exports){
/*jslint indent:2,node:true,sloppy:true */
var util = require('./util');
var ModuleInternal = require('./moduleinternal');

/**
 * A freedom port which manages the control plane of of changing hub routes.
 * @class Manager
 * @implements Port
 * @param {Hub} hub The routing hub to control.
 * @param {Resource} resource The resource manager for the runtime.
 * @param {Api} api The API manager for the runtime.
 * @constructor
 */
var Manager = function (hub, resource, api) {
  this.id = 'control';
  this.config = {};
  this.controlFlows = {};
  this.dataFlows = {};
  this.dataFlows[this.id] = [];
  this.reverseFlowMap = {};

  this.debug = hub.debug;
  this.hub = hub;
  this.resource = resource;
  this.api = api;

  this.delegate = null;
  this.toDelegate = {};
  
  this.hub.on('config', function (config) {
    util.mixin(this.config, config);
    this.emit('config');
  }.bind(this));
  
  util.handleEvents(this);
  this.hub.register(this);
};

/**
 * Provide a textual description of this port.
 * @method toString
 * @return {String} the description of this port.
 */
Manager.prototype.toString = function () {
  return "[Local Controller]";
};

/**
 * Process messages sent to this port.
 * The manager, or 'control' destination handles several types of messages,
 * identified by the request property.  The actions are:
 * 1. debug. Prints the message to the console.
 * 2. link. Creates a link between the source and a provided destination port.
 * 3. environment. Instantiate a module environment defined in ModuleInternal.
 * 4. delegate. Routes a defined set of control messages to another location.
 * 5. resource. Registers the source as a resource resolver.
 * 6. core. Generates a core provider for the requester.
 * 7. close. Tears down routes involing the requesting port.
 * 8. unlink. Tears down a route from the requesting port.
 * @method onMessage
 * @param {String} flow The source identifier of the message.
 * @param {Object} message The received message.
 */
Manager.prototype.onMessage = function (flow, message) {
  var reverseFlow = this.controlFlows[flow], origin;
  if (!reverseFlow) {
    this.debug.warn("Unknown message source: " + flow);
    return;
  }
  origin = this.hub.getDestination(reverseFlow);

  if (this.delegate && reverseFlow !== this.delegate &&
      this.toDelegate[flow]) {
    // Ship off to the delegee
    this.emit(this.delegate, {
      type: 'Delegation',
      request: 'handle',
      quiet: true,
      flow: flow,
      message: message
    });
    return;
  }

  if (message.request === 'debug') {
    this.debug.print(message);
    return;
  }

  if (message.request === 'link') {
    this.createLink(origin, message.name, message.to, message.overrideDest);
  } else if (message.request === 'environment') {
    this.createLink(origin, message.name, new ModuleInternal(this));
  } else if (message.request === 'delegate') {
    // Initate Delegation.
    if (this.delegate === null) {
      this.delegate = reverseFlow;
    }
    this.toDelegate[message.flow] = true;
    this.emit('delegate');
  } else if (message.request === 'resource') {
    this.resource.addResolver(message.args[0]);
    this.resource.addRetriever(message.service, message.args[1]);
  } else if (message.request === 'core') {
    if (this.core && reverseFlow === this.delegate) {
      (new this.core()).onMessage(origin, message.message);
      return;
    }
    this.getCore(function (to, core) {
      this.hub.onMessage(to, {
        type: 'core',
        core: core
      });
    }.bind(this, reverseFlow));
  } else if (message.request === 'close') {
    this.destroy(origin);
  } else if (message.request === 'unlink') {
    this.removeLink(origin, message.to);
  } else {
    this.debug.warn("Unknown control request: " + message.request);
    this.debug.log(JSON.stringify(message));
    return;
  }
};

/**
 * Get the port messages will be routed to given its id.
 * @method getPort
 * @param {String} portId The ID of the port.
 * @returns {fdom.Port} The port with that ID.
 */
Manager.prototype.getPort = function (portId) {
  return this.hub.getDestination(this.controlFlows[portId]);
};

/**
 * Set up a port with the hub.
 * @method setup
 * @param {Port} port The port to register.
 */
Manager.prototype.setup = function (port) {
  if (!port.id) {
    this.debug.warn("Refusing to setup unidentified port ");
    return false;
  }

  if (this.controlFlows[port.id]) {
    this.debug.warn("Refusing to re-initialize port " + port.id);
    return false;
  }

  if (!this.config.global) {
    this.once('config', this.setup.bind(this, port));
    return;
  }

  this.hub.register(port);
  var flow = this.hub.install(this, port.id, "control"),
    reverse = this.hub.install(port, this.id, port.id);
  this.controlFlows[port.id] = flow;
  this.dataFlows[port.id] = [reverse];
  this.reverseFlowMap[flow] = reverse;
  this.reverseFlowMap[reverse] = flow;

  if (port.lineage) {
    this.emit('moduleAdd', {id: port.id, lineage: port.lineage});
  }
  
  this.hub.onMessage(flow, {
    type: 'setup',
    channel: reverse,
    config: this.config
  });

  return true;
};

/**
 * Tear down a port on the hub.
 * @method destroy
 * @apram {Port} port The port to unregister.
 */
Manager.prototype.destroy = function (port) {
  if (!port.id) {
    this.debug.warn("Unable to tear down unidentified port");
    return false;
  }

  if (port.lineage) {
    this.emit('moduleRemove', {id: port.id, lineage: port.lineage});
  }

  // Remove the port.
  delete this.controlFlows[port.id];

  // Remove associated links.
  var i;
  for (i = this.dataFlows[port.id].length - 1; i >= 0; i -= 1) {
    this.removeLink(port, this.dataFlows[port.id][i]);
  }

  // Remove the port.
  delete this.dataFlows[port.id];
  this.hub.deregister(port);
};

/**
 * Create a link between two ports.  Links are created in both directions,
 * and a message with those capabilities is sent to the source port.
 * @method createLink
 * @param {Port} port The source port.
 * @param {String} name The flow for messages from destination to port.
 * @param {Port} destination The destination port.
 * @param {String} [destName] The flow name for messages to the destination.
 * @param {Boolean} [toDest] Tell the destination about the link.
 */
Manager.prototype.createLink = function (port, name, destination, destName,
                                         toDest) {
  if (!this.config.global) {
    this.once('config',
      this.createLink.bind(this, port, name, destination, destName));
    return;
  }
  
  if (!this.controlFlows[port.id]) {
    this.debug.warn('Unwilling to link from non-registered source.');
    return;
  }

  if (!this.controlFlows[destination.id]) {
    if (this.setup(destination) === false) {
      this.debug.warn('Could not find or setup destination.');
      return;
    }
  }
  var quiet = destination.quiet || false,
    outgoingName = destName || 'default',
    outgoing = this.hub.install(port, destination.id, outgoingName, quiet),
    reverse;

  // Recover the port so that listeners are installed.
  destination = this.hub.getDestination(outgoing);
  reverse = this.hub.install(destination, port.id, name, quiet);

  this.reverseFlowMap[outgoing] = reverse;
  this.dataFlows[port.id].push(outgoing);
  this.reverseFlowMap[reverse] = outgoing;
  this.dataFlows[destination.id].push(reverse);

  if (toDest) {
    this.hub.onMessage(this.controlFlows[destination.id], {
      type: 'createLink',
      name: outgoingName,
      channel: reverse,
      reverse: outgoing
    });
  } else {
    this.hub.onMessage(this.controlFlows[port.id], {
      name: name,
      type: 'createLink',
      channel: outgoing,
      reverse: reverse
    });
  }
};

/**
 * Remove a link between to ports. The reverse link will also be removed.
 * @method removeLink
 * @param {Port} port The source port.
 * @param {String} name The flow to be removed.
 */
Manager.prototype.removeLink = function (port, name) {
  var reverse = this.hub.getDestination(name),
    rflow = this.reverseFlowMap[name],
    i;

  if (!reverse || !rflow) {
    this.debug.warn("Could not find metadata to remove flow: " + name);
    return;
  }

  if (this.hub.getDestination(rflow).id !== port.id) {
    this.debug.warn("Source port does not own flow " + name);
    return;
  }

  // Notify ports that a channel is closing.
  i = this.controlFlows[port.id];
  if (i) {
    this.hub.onMessage(i, {
      type: 'close',
      channel: name
    });
  }
  i = this.controlFlows[reverse.id];
  if (i) {
    this.hub.onMessage(i, {
      type: 'close',
      channel: rflow
    });
  }

  // Uninstall the channel.
  this.hub.uninstall(port, name);
  this.hub.uninstall(reverse, rflow);

  delete this.reverseFlowMap[name];
  delete this.reverseFlowMap[rflow];
  this.forgetFlow(reverse.id, rflow);
  this.forgetFlow(port.id, name);
};

/**
 * Forget the flow from id with a given name.
 * @method forgetFlow
 * @private
 * @param {String} id The port ID of the source.
 * @param {String} name The flow name.
 */
Manager.prototype.forgetFlow = function (id, name) {
  var i;
  if (this.dataFlows[id]) {
    for (i = 0; i < this.dataFlows[id].length; i += 1) {
      if (this.dataFlows[id][i] === name) {
        this.dataFlows[id].splice(i, 1);
        break;
      }
    }
  }
};

/**
 * Get the core freedom.js API active on the current hub.
 * @method getCore
 * @private
 * @param {Function} cb Callback to fire with the core object.
 */
Manager.prototype.getCore = function (cb) {
  if (this.core) {
    cb(this.core);
  } else {
    this.api.getCore('core', this).then(function (core) {
      this.core = core;
      cb(this.core);
    }.bind(this));
  }
};

module.exports = Manager;

},{"./moduleinternal":37,"./util":44}],36:[function(require,module,exports){
/*jslint indent:2,node:true,sloppy:true */
var util = require('./util');
var Provider = require('./provider');

/**
 * The external Port face of a module on a hub.
 * @class Module
 * @extends Port
 * @param {String} manifestURL The manifest this module loads.
 * @param {String[]} creator The lineage of creation for this module.
 * @param {Policy} Policy The policy loader for dependencies.
 * @constructor
 */
var Module = function (manifestURL, manifest, creator, policy) {
  this.api = policy.api;
  this.policy = policy;
  this.resource = policy.resource;
  this.debug = policy.debug;

  this.config = {};

  this.id = manifestURL + Math.random();
  this.manifestId = manifestURL;
  this.manifest = manifest;
  this.lineage = [this.manifestId].concat(creator);

  this.quiet = this.manifest.quiet || false;

  this.externalPortMap = {};
  this.internalPortMap = {};
  this.dependantChannels = [];
  this.started = false;

  util.handleEvents(this);
};

/**
 * Receive a message for the Module.
 * @method onMessage
 * @param {String} flow The origin of the message.
 * @param {Object} message The message received.
 */
Module.prototype.onMessage = function (flow, message) {
  if (flow === 'control') {
    if (message.type === 'setup') {
      this.controlChannel = message.channel;
      util.mixin(this.config, message.config);
      this.emit(this.controlChannel, {
        type: 'Core Provider',
        request: 'core'
      });
      this.start();
      return;
    } else if (message.type === 'createLink' && message.channel) {
      this.debug.debug(this + 'got create link for ' + message.name);
      this.externalPortMap[message.name] = message.channel;
      if (this.internalPortMap[message.name] === undefined) {
        this.internalPortMap[message.name] = false;
      }
      var msg = {
        type: 'default channel announcement',
        channel: message.reverse
      };
      if (this.manifest.dependencies &&
          this.manifest.dependencies[message.name]) {
        msg.api = this.manifest.dependencies[message.name].api;
      }
      this.emit(message.channel, msg);
      return;
    } else if (message.core) {
      this.core = new message.core();
      this.emit('core', message.core);
      return;
    } else if (message.type === 'close') {
      // Closing channel.
      if (message.channel === 'control') {
        this.stop();
      }
      this.deregisterFlow(message.channel, false);
    } else {
      this.port.onMessage(flow, message);
    }
  } else {
    if ((this.externalPortMap[flow] === false ||
        !this.externalPortMap[flow]) && message.channel) {
      this.debug.debug(this + 'handling channel announcement for ' + flow);
      this.externalPortMap[flow] = message.channel;
      if (this.internalPortMap[flow] === undefined) {
        this.internalPortMap[flow] = false;

        // New incoming connection attempts should get routed to modInternal.
        if (this.manifest.provides && this.modInternal) {
          this.port.onMessage(this.modInternal, {
            type: 'Connection',
            channel: flow,
            api: message.api
          });
        } else if (this.manifest.provides) {
          this.once('modInternal', function (flow, api) {
            this.port.onMessage(this.modInternal, {
              type: 'Connection',
              channel: flow,
              api: api
            });
          }.bind(this, flow, message.api));
        // First connection retains legacy mapping as 'default'.
        } else if (!this.externalPortMap['default'] && message.channel) {
          this.externalPortMap['default'] = message.channel;
          this.once('internalChannelReady', function (flow) {
            this.internalPortMap[flow] = this.internalPortMap['default'];
          }.bind(this, flow));
        }
      }
      return;
    } else if (!this.started) {
      this.once('start', this.onMessage.bind(this, flow, message));
    } else {
      if (this.internalPortMap[flow] === false) {
        console.warn('waiting on internal channel for msg');
        this.once('internalChannelReady', this.onMessage.bind(this, flow, message));
      } else if (!this.internalPortMap[flow]) {
        this.debug.error('Unexpected message from ' + flow);
        return;
      } else {
        this.port.onMessage(this.internalPortMap[flow], message);
      }
    }
  }
};

/**
 * Clean up after a flow which is no longer used / needed.
 * @method deregisterFLow
 * @param {String} flow The flow to remove mappings for.
 * @param {Boolean} internal If the flow name is the internal identifier.
 * @returns {Boolean} Whether the flow was successfully deregistered.
 * @private
 */
Module.prototype.deregisterFlow = function (flow, internal) {
  var key,
    map = internal ? this.internalPortMap : this.externalPortMap;
  // TODO: this is inefficient, but seems less confusing than a 3rd
  // reverse lookup map.
  for (key in map) {
    if (map[key] === flow) {
      if (internal) {
        this.emit(this.controlChannel, {
          type: 'Channel Teardown',
          request: 'unlink',
          to: this.externalPortMap[key]
        });
      } else {
        this.port.onMessage('control', {
          type: 'close',
          channel: this.internalPortMap[key]
        });
      }
      delete this.externalPortMap[key];
      delete this.internalPortMap[key];

      // When there are still non-dependant channels, keep running
      for (key in this.externalPortMap) {
        if (this.externalPortMap.hasOwnProperty(key)) {
          if (this.dependantChannels.indexOf(key) < 0) {
            return true;
          }
        }
      }
      // Otherwise shut down the module.
      this.stop();
      return true;
    }
  }
  return false;
};

/**
 * Attempt to start the module once the remote freedom context
 * exists.
 * @method start
 * @private
 */
Module.prototype.start = function () {
  var Port;
  if (this.started || this.port) {
    return false;
  }
  if (this.controlChannel) {
    this.loadLinks();
    Port = this.config.portType;
    this.port = new Port(this.manifest.name, this.resource);
    // Listen to all port messages.
    this.port.on(this.emitMessage.bind(this));
    this.port.addErrorHandler(function (err) {
      this.debug.warn('Module Failed', err);
      this.stop();
    }.bind(this));
    // Tell the local port to ask us for help.
    this.port.onMessage('control', {
      channel: 'control',
      config: this.config
    });

    // Tell the remote location to delegate debugging.
    this.port.onMessage('control', {
      type: 'Redirect',
      request: 'delegate',
      flow: 'debug'
    });
    this.port.onMessage('control', {
      type: 'Redirect',
      request: 'delegate',
      flow: 'core'
    });
    
    // Tell the container to instantiate the counterpart to this external view.
    this.port.onMessage('control', {
      type: 'Environment Configuration',
      request: 'environment',
      name: 'ModInternal'
    });
  }
};

/**
 * Stop the module when it is no longer needed, and tear-down state.
 * @method stop
 * @private
 */
Module.prototype.stop = function () {
  if (!this.started) {
    return;
  }
  this.emit('close');
  if (this.port) {
    this.port.off();
    this.port.onMessage('control', {
      type: 'close',
      channel: 'control'
    });
    this.port.stop();
    delete this.port;
  }
  this.started = false;
};

/**
 * Textual Description of the Port
 * @method toString
 * @return {String} The description of this Port.
 */
Module.prototype.toString = function () {
  return "[Module " + this.manifest.name + "]";
};

/**
 * Intercept messages as they arrive from the module,
 * mapping them between internal and external flow names.
 * @method emitMessage
 * @param {String} name The destination the module wants to send to.
 * @param {Object} message The message to send.
 * @private
 */
Module.prototype.emitMessage = function (name, message) {
  if (this.internalPortMap[name] === false && message.channel) {
    this.internalPortMap[name] = message.channel;
    this.emit('internalChannelReady');
    return;
  }
  // Terminate debug redirection requested in start().
  if (name === 'control') {
    if (message.flow === 'debug' && message.message) {
      this.debug.format(message.message.severity,
          message.message.source || this.toString(),
          message.message.msg);
    } else if (message.flow === 'core' && message.message) {
      if (!this.core) {
        this.once('core', this.emitMessage.bind(this, name, message));
        return;
      }
      if (message.message.type === 'register') {
        message.message.reply = this.port.onMessage.bind(this.port, 'control');
        this.externalPortMap[message.message.id] = false;
      }
      this.core.onMessage(this, message.message);
    } else if (message.name === 'ModInternal' && !this.modInternal) {
      this.modInternal = message.channel;
      this.port.onMessage(this.modInternal, {
        type: 'Initialization',
        id: this.manifestId,
        appId: this.id,
        manifest: this.manifest,
        lineage: this.lineage,
        channel: message.reverse
      });
      this.emit('modInternal');
    } else if (message.type === 'createLink') {
      this.internalPortMap[message.name] = message.channel;
      this.port.onMessage(message.channel, {
        type: 'channel announcement',
        channel: message.reverse
      });
      this.emit('internalChannelReady');
    } else if (message.type === 'close') {
      this.deregisterFlow(message.channel, true);
    }
  } else if (name === 'ModInternal' && message.type === 'ready' && !this.started) {
    this.started = true;
    this.emit('start');
  } else if (name === 'ModInternal' && message.type === 'resolve') {
    this.resource.get(this.manifestId, message.data).then(function (id, data) {
      this.port.onMessage(this.modInternal, {
        type: 'resolve response',
        id: id,
        data: data
      });
    }.bind(this, message.id), function () {
      this.debug.warn('Error Resolving URL for Module.');
    }.bind(this));
  } else {
    this.emit(this.externalPortMap[name], message);
  }
  return false;
};

/**
 * Request the external routes used by this module.
 * @method loadLinks
 * @private
 */
Module.prototype.loadLinks = function () {
  var i, channels = ['default'], name, dep,
    finishLink = function (dep, name, provider) {
      var style = this.api.getInterfaceStyle(name);
      dep.getInterface()[style](provider);
    };
  if (this.manifest.permissions) {
    for (i = 0; i < this.manifest.permissions.length; i += 1) {
      name = this.manifest.permissions[i];
      if (channels.indexOf(name) < 0 && name.indexOf('core.') === 0) {
        channels.push(name);
        this.dependantChannels.push(name);
        dep = new Provider(this.api.get(name).definition, this.debug);
        this.api.getCore(name, this).then(finishLink.bind(this, dep, name));

        this.emit(this.controlChannel, {
          type: 'Core Link to ' + name,
          request: 'link',
          name: name,
          to: dep
        });
      }
    }
  }
  if (this.manifest.dependencies) {
    util.eachProp(this.manifest.dependencies, function (desc, name) {
      if (channels.indexOf(name) < 0) {
        channels.push(name);
        this.dependantChannels.push(name);
      }
      this.resource.get(this.manifestId, desc.url).then(function (url) {
        this.policy.get(this.lineage, url).then(function (dep) {
          this.updateEnv(name, dep.manifest);
          this.emit(this.controlChannel, {
            type: 'Link to ' + name,
            request: 'link',
            name: name,
            overrideDest: name + '.' + this.id,
            to: dep
          });
        }.bind(this), function (err) {
          this.debug.warn('failed to load dep: ', name, err);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }
  // Note that messages can be synchronous, so some ports may already be bound.
  for (i = 0; i < channels.length; i += 1) {
    this.externalPortMap[channels[i]] = this.externalPortMap[channels[i]] || false;
    this.internalPortMap[channels[i]] = false;
  }
};

/**
 * Update the module environment with information about a dependent manifest.
 * @method updateEnv
 * @param {String} dep The dependency
 * @param {Object} manifest The manifest of the dependency
 */
Module.prototype.updateEnv = function (dep, manifest) {
  if (!manifest) {
    return;
  }
  if (!this.modInternal) {
    this.once('modInternal', this.updateEnv.bind(this, dep, manifest));
    return;
  }
  
  var metadata;

  // Decide if/what other properties should be exported.
  // Keep in sync with ModuleInternal.updateEnv
  metadata = {
    name: manifest.name,
    icon: manifest.icon,
    description: manifest.description,
    api: manifest.api
  };
  
  this.port.onMessage(this.modInternal, {
    type: 'manifest',
    name: dep,
    manifest: metadata
  });
};

module.exports = Module;

},{"./provider":39,"./util":44}],37:[function(require,module,exports){
/*jslint indent:2, node:true,sloppy:true */
var PromiseCompat = require('es6-promise').Promise;

var ApiInterface = require('./proxy/apiInterface');
var Provider = require('./provider');
var ProxyBinder = require('./proxybinder');
var util = require('./util');

/**
 * The internal logic for module setup, which makes sure the public
 * facing exports have appropriate properties, and load user scripts.
 * @class ModuleInternal
 * @extends Port
 * @param {Port} manager The manager in this module to use for routing setup.
 * @constructor
 */
var ModuleInternal = function (manager) {
  this.config = {};
  this.manager = manager;
  this.debug = manager.debug;
  this.binder = new ProxyBinder(this.manager);
  this.api = this.manager.api;
  this.manifests = {};
  this.providers = {};
  
  this.id = 'ModuleInternal';
  this.pendingPorts = 0;
  this.requests = {};

  util.handleEvents(this);
};

/**
 * Message handler for this port.
 * This port only handles two messages:
 * The first is its setup from the manager, which it uses for configuration.
 * The second is from the module controller (fdom.port.Module), which provides
 * the manifest info for the module.
 * @method onMessage
 * @param {String} flow The detination of the message.
 * @param {Object} message The message.
 */
ModuleInternal.prototype.onMessage = function (flow, message) {
  if (flow === 'control') {
    if (!this.controlChannel && message.channel) {
      this.controlChannel = message.channel;
      util.mixin(this.config, message.config);
    }
  } else if (flow === 'default' && !this.appId) {
    // Recover the ID of this module:
    this.port = this.manager.hub.getDestination(message.channel);
    this.externalChannel = message.channel;
    this.appId = message.appId;
    this.lineage = message.lineage;

    var objects = this.mapProxies(message.manifest);

    this.generateEnv(message.manifest, objects).then(function () {
      return this.loadLinks(objects);
    }.bind(this)).then(this.loadScripts.bind(this, message.id,
        message.manifest.app.script));
  } else if (flow === 'default' && this.requests[message.id]) {
    this.requests[message.id](message.data);
    delete this.requests[message.id];
  } else if (flow === 'default' && message.type === 'manifest') {
    this.emit('manifest', message);
    this.updateManifest(message.name, message.manifest);
  } else if (flow === 'default' && message.type === 'Connection') {
    // Multiple connections can be made to the default provider.
    if (message.api && this.providers[message.api]) {
      this.manager.createLink(this.providers[message.api], message.channel,
                             this.port, message.channel);
    } else if (this.defaultPort &&
               (message.api === this.defaultPort.api || !message.api)) {
      this.manager.createLink(this.defaultPort, message.channel,
                              this.port, message.channel);
    } else {
      this.once('start', this.onMessage.bind(this, flow, message));
    }
  }
};

/**
 * Get a textual description of this Port.
 * @method toString
 * @return {String} a description of this Port.
 */
ModuleInternal.prototype.toString = function () {
  return "[Environment Helper]";
};

/**
 * Generate an externaly visisble namespace
 * @method generateEnv
 * @param {Object} manifest The manifest of the module.
 * @param {Object[]} items Other interfaces to load.
 * @returns {Promise} A promise when the external namespace is visible.
 * @private
 */
ModuleInternal.prototype.generateEnv = function (manifest, items) {
  return this.binder.bindDefault(this.port, this.api, manifest, true).then(
    function (binding) {
      var i = 0;
      binding.port.api = binding.external.api;
      this.defaultPort = binding.port;
      if (binding.external.api) {
        for (i = 0; i < items.length; i += 1) {
          if (items[i].name === binding.external.api && items[i].def.provides) {
            items.splice(i, 1);
            break;
          }
        }
      }
      this.config.global.freedom = binding.external;
    }.bind(this)
  );
};

/**
 * Attach a proxy to the externally visible namespace.
 * @method attach
 * @param {String} name The name of the proxy.
 * @param {Boolean} provides If this proxy is a provider.
 * @param {ProxyInterface} proxy The proxy to attach.
 * @param {String} api The API the proxy implements.
 * @private.
 */
ModuleInternal.prototype.attach = function (name, provides, proxy) {
  var exp = this.config.global.freedom;
  
  if (provides) {
    this.providers[name] = proxy.port;
  }

  if (!exp[name]) {
    exp[name] = proxy.external;
    if (this.manifests[name]) {
      exp[name].manifest = this.manifests[name];
    }
  }

  this.pendingPorts -= 1;
  if (this.pendingPorts === 0) {
    this.emit('start');
  }
};

/**
 * Request a set of proxy interfaces, and bind them to the external
 * namespace.
 * @method loadLinks
 * @param {Object[]} items Descriptors of the proxy ports to load.
 * @private
 * @returns {Promise} Promise for when all links are loaded.
 */
//TODO(willscott): promise should be chained, rather than going through events.
ModuleInternal.prototype.loadLinks = function (items) {
  var i, proxy, provider, core,
    manifestPredicate = function (name, flow, msg) {
      return flow === 'manifest' && msg.name === name;
    },
    onManifest = function (item, msg) {
      var definition = {
        name: item.api
      };
      if (!msg.manifest.api || !msg.manifest.api[item.api]) {
        definition.definition = null;
      } else {
        definition.definition = msg.manifest.api[item.api];
      }
      this.binder.getExternal(this.port, item.name, definition).then(
        this.attach.bind(this, item.name, false)
      );
    }.bind(this),
    promise = new PromiseCompat(function (resolve, reject) {
      this.once('start', resolve);
    }.bind(this));

  for (i = 0; i < items.length; i += 1) {
    if (items[i].api && !items[i].def) {
      if (this.manifests[items[i].name]) {
        onManifest(items[i], {
          manifest: this.manifests[items[i].name]
        });
      } else {
        this.once(manifestPredicate.bind({}, items[i].name),
                  onManifest.bind(this, items[i]));
      }
    } else {
      this.binder.getExternal(this.port, items[i].name, items[i].def).then(
        this.attach.bind(this, items[i].name, items[i].def &&
                         items[i].def.provides)
      );
    }
    this.pendingPorts += 1;
  }
  
  // Allow resolution of files by parent.
  this.manager.resource.addResolver(function (manifest, url, resolve) {
    var id = util.getId();
    this.requests[id] = resolve;
    this.emit(this.externalChannel, {
      type: 'resolve',
      id: id,
      data: url
    });
    return true;
  }.bind(this));

  // Attach Core.
  this.pendingPorts += 1;

  core = this.api.get('core').definition;
  provider = new Provider(core, this.debug);
  this.manager.getCore(function (CoreProv) {
    new CoreProv(this.manager).setId(this.lineage);
    provider.getInterface().provideAsynchronous(CoreProv);
  }.bind(this));

  this.emit(this.controlChannel, {
    type: 'Link to core',
    request: 'link',
    name: 'core',
    to: provider
  });
  
  this.binder.getExternal(provider, 'default', {
    name: 'core',
    definition: core
  }).then(
    this.attach.bind(this, 'core', false)
  );


//  proxy = new Proxy(ApiInterface.bind({}, core), this.debug);
//  this.manager.createLink(provider, 'default', proxy);
//  this.attach('core', {port: pr, external: proxy});

  if (this.pendingPorts === 0) {
    this.emit('start');
  }

  return promise;
};

/**
 * Update the exported manifest of a dependency.
 * Sets it internally if not yet exported, or attaches the property if it
 * is loaded after the module has started (we don't delay start to retreive
 * the manifest of the dependency.)
 * @method updateManifest
 * @param {String} name The Dependency
 * @param {Object} manifest The manifest of the dependency
 */
ModuleInternal.prototype.updateManifest = function (name, manifest) {
  var exp = this.config.global.freedom;

  if (exp && exp[name]) {
    exp[name].manifest = manifest;
  } else {
    this.manifests[name] = manifest;
  }
};

/**
 * Determine which proxy ports should be exposed by this module.
 * @method mapProxies
 * @param {Object} manifest the module JSON manifest.
 * @return {Object[]} proxy descriptors defined in the manifest.
 */
ModuleInternal.prototype.mapProxies = function (manifest) {
  var proxies = [], seen = ['core'], i, obj;
  
  if (manifest.permissions) {
    for (i = 0; i < manifest.permissions.length; i += 1) {
      obj = {
        name: manifest.permissions[i],
        def: undefined
      };
      obj.def = this.api.get(obj.name);
      if (seen.indexOf(obj.name) < 0 && obj.def) {
        proxies.push(obj);
        seen.push(obj.name);
      }
    }
  }
  
  if (manifest.dependencies) {
    util.eachProp(manifest.dependencies, function (desc, name) {
      obj = {
        name: name,
        api: desc.api
      };
      if (seen.indexOf(name) < 0) {
        if (desc.api) {
          obj.def = this.api.get(desc.api);
        }
        proxies.push(obj);
        seen.push(name);
      }
    }.bind(this));
  }
  
  if (manifest.provides) {
    for (i = 0; i < manifest.provides.length; i += 1) {
      obj = {
        name: manifest.provides[i],
        def: undefined
      };
      obj.def = this.api.get(obj.name);
      if (obj.def) {
        obj.def.provides = true;
      } else if (manifest.api && manifest.api[obj.name]) {
        obj.def = {
          name: obj.name,
          definition: manifest.api[obj.name],
          provides: true
        };
      } else {
        this.debug.warn('Module will not provide "' + obj.name +
          '", since no declaration can be found.');
        /*jslint continue:true*/
        continue;
      }
      /*jslint continue:false*/
      if (seen.indexOf(obj.name) < 0) {
        proxies.push(obj);
        seen.push(obj.name);
      }
    }
  }

  return proxies;
};

/**
 * Load external scripts into this namespace.
 * @method loadScripts
 * @param {String} from The URL of this modules's manifest.
 * @param {String[]} scripts The URLs of the scripts to load.
 */
ModuleInternal.prototype.loadScripts = function (from, scripts) {
  // TODO(salomegeo): add a test for failure.
  var importer = function (script, resolve, reject) {
    try {
      this.config.global.importScripts(script);
      resolve(true);
    } catch (e) {
      reject(e);
    }
  }.bind(this),
    scripts_count,
    load;
  if (typeof scripts === 'string') {
    scripts_count = 1;
  } else {
    scripts_count = scripts.length;
  }

  load = function (next) {
    if (next === scripts_count) {
      this.emit(this.externalChannel, {
        type: "ready"
      });
      return;
    }

    var script;
    if (typeof scripts === 'string') {
      script = scripts;
    } else {
      script = scripts[next];
    }

    this.manager.resource.get(from, script).then(function (url) {
      this.tryLoad(importer, url).then(function () {
        load(next + 1);
      }.bind(this));
    }.bind(this));
  }.bind(this);



  if (!this.config.global.importScripts) {
    importer = function (url, resolve, reject) {
      var script = this.config.global.document.createElement('script');
      script.src = url;
      script.addEventListener('load', resolve, true);
      this.config.global.document.body.appendChild(script);
    }.bind(this);
  }

  load(0);
};

/**
 * Attempt to load resolved scripts into the namespace.
 * @method tryLoad
 * @private
 * @param {Function} importer The actual import function
 * @param {String[]} urls The resoved URLs to load.
 * @returns {Promise} completion of load
 */
ModuleInternal.prototype.tryLoad = function (importer, url) {
  return new PromiseCompat(importer.bind({}, url)).then(function (val) {
    return val;
  }, function (e) {
    this.debug.warn(e.stack);
    this.debug.error("Error loading " + url, e);
    this.debug.error("If the stack trace is not useful, see https://" +
        "github.com/freedomjs/freedom/wiki/Debugging-Script-Parse-Errors");
  }.bind(this));
};

module.exports = ModuleInternal;

},{"./provider":39,"./proxy/apiInterface":40,"./proxybinder":42,"./util":44,"es6-promise":1}],38:[function(require,module,exports){
/*globals XMLHttpRequest */
/*jslint indent:2,white:true,node:true,sloppy:true */
var PromiseCompat = require('es6-promise').Promise;
var Module = require('./module');
var util = require('./util');

/**
 * The Policy registry for freedom.js.  Used to look up modules and provide
 * migration and coallesing of execution.
 * @Class Policy
 * @param {Manager} manager The manager of the active runtime.
 * @param {Resource} resource The resource loader of the active runtime.
 * @param {Object} config The local config.
 * @constructor
 */
var Policy = function(manager, resource, config) {
  this.api = manager.api;
  this.debug = manager.debug;
  this.location = config.location;
  this.resource = resource;

  this.config = config;
  this.runtimes = [];
  this.policies = [];
  this.pending = {};
  util.handleEvents(this);

  this.add(manager, config.policy);
  this.runtimes[0].local = true;
};

/**
 * The policy a runtime is expected to have unless it specifies
 * otherwise.
 * TODO: consider making static
 * @property defaultPolicy
 */
Policy.prototype.defaultPolicy = {
  background: false, // Can this runtime run 'background' modules?
  interactive: true // Is there a view associated with this runtime?
  // TODO: remaining runtime policy.
};

/**
 * The constraints a code modules is expected to have unless it specifies
 * otherwise.
 * TODO: consider making static
 * @property defaultConstraints
 */
Policy.prototype.defaultConstraints = {
  isolation: "always", // values: always, app, never
  placement: "local" // values: local, stable, redundant
  // TODO: remaining constraints, express platform-specific dependencies.
};

/**
 * Resolve a module from its canonical URL.
 * Reponds with the promise of a port representing the module, 
 * @method get
 * @param {String[]} lineage The lineage of the requesting module.
 * @param {String} id The canonical ID of the module to get.
 * @returns {Promise} A promise for the local port towards the module.
 */
Policy.prototype.get = function(lineage, id) {
  
  // Make sure that a module isn't getting located twice at the same time.
  // This is resolved by delaying if it until we see it in a 'moduleAdd' event.
  if (this.pending[id]) {
    return new PromiseCompat(function (resolve, reject) {
      this.once('placed', function(l, i) {
        this.get(l, i).then(resolve, reject);
      }.bind(this, lineage, id));
    }.bind(this));
  } else {
    this.pending[id] = true;
  }

  return this.loadManifest(id).then(function(manifest) {
    var constraints = this.overlay(this.defaultConstraints, manifest.constraints),
        runtime = this.findDestination(lineage, id, constraints),
        portId;
    if (runtime.local) {
      portId = this.isRunning(runtime, id, lineage,
                             constraints.isolation !== 'never');
      if(constraints.isolation !== 'always' && portId) {
        this.debug.info('Reused port ' + portId);
        delete this.pending[id];
        this.emit('placed');
        return runtime.manager.getPort(portId);
      } else {
        return new Module(id, manifest, lineage, this);
      }
    } else {
      // TODO: Create a port to go to the remote runtime.
      this.debug.error('Unexpected location selected for module placement');
      return false;
    }
  }.bind(this), function(err) {
    this.debug.error('Policy Error Resolving ' + id, err);
    throw(err);
  }.bind(this));
};

/**
 * Find the runtime destination for a module given its constraints and the
 * module creating it.
 * @method findDestination
 * @param {String[]} lineage The identity of the module creating this module.
 * @param {String] id The canonical url of the module
 * @param {Object} constraints Constraints for the module.
 * @returns {Object} The element of this.runtimes where the module should run.
 */
Policy.prototype.findDestination = function(lineage, id, constraints) {
  var i;

  // Step 1: if an instance already exists, the m
  if (constraints.isolation !== 'always') {
    for (i = 0; i < this.policies.length; i += 1) {
      if (this.isRunning(this.runtimes[i], id, lineage,
                         constraints.isolation !== 'never')) {
        return this.runtimes[i];
      }
    }
  }

  // Step 2: if the module wants stability, it may need to be remote.
  if (constraints.placement === 'local') {
    return this.runtimes[0];
  } else if (constraints.placement === 'stable') {
    for (i = 0; i < this.policies.length; i += 1) {
      if (this.policies[i].background) {
        return this.runtimes[i];
      }
    }
  }

  // Step 3: if the module needs longevity / interactivity, it may want to be remote.
  return this.runtimes[0];
};

/**
 * Determine if a known runtime is running an appropriate instance of a module.
 * @method isRunning
 * @param {Object} runtime The runtime to check.
 * @param {String} id The module to look for.
 * @param {String[]} from The identifier of the requesting module.
 * @param {Boolean} fullMatch If the module needs to be in the same app.
 * @returns {String|Boolean} The Module id if it is running, or false if not.
 */
Policy.prototype.isRunning = function(runtime, id, from, fullMatch) {
  var i = 0, j = 0, okay;
  for (i = 0; i < runtime.modules.length; i += 1) {
    if (fullMatch && runtime.modules[i].length === from.length + 1) {
      okay = true;
      for (j = 0; j < from.length; j += 1) {
        if (runtime.modules[i][j + 1].indexOf(from[j]) !== 0) {
          okay = false;
          break;
        }
      }
      if (runtime.modules[i][0].indexOf(id) !== 0) {
        okay = false;
      }

      if (okay) {
        return runtime.modules[i][0];
      }
    } else if (!fullMatch && runtime.modules[i][0].indexOf(id) === 0) {
      return runtime.modules[i][0];
    }
  }
  return false;
};

/**
 * Get a promise of the manifest for a module ID.
 * @method loadManifest
 * @param {String} manifest The canonical ID of the manifest
 * @returns {Promise} Promise for the json contents of the manifest.
 */
Policy.prototype.loadManifest = function(manifest) {
  return this.resource.getContents(manifest).then(function(data) {
    var resp = {};
    try {
      return JSON.parse(data);
    } catch(err) {
      this.debug.error("Failed to load " + manifest + ": " + err);
      throw new Error("No Manifest Available");
    }
  }.bind(this));
};

/**
 * Add a runtime to keep track of in this policy.
 * @method add
 * @param {fdom.port} port The port to use for module lifetime info
 * @param {Object} policy The policy of the runtime.
 */
Policy.prototype.add = function(port, policy) {
  var runtime = {
    manager: port,
    modules: []
  };
  this.runtimes.push(runtime);
  this.policies.push(this.overlay(this.defaultPolicy, policy));

  port.on('moduleAdd', function(runtime, info) {
    var lineage = [];
    lineage = lineage.concat(info.lineage);
    lineage[0] = info.id;
    runtime.modules.push(lineage);
    if (this.pending[info.lineage[0]]) {
      delete this.pending[info.lineage[0]];
      this.emit('placed');
    }
  }.bind(this, runtime));
  port.on('moduleRemove', function(runtime, info) {
    var lineage = [], i, modFingerprint;
    lineage = lineage.concat(info.lineage);
    lineage[0] = info.id;
    modFingerprint = lineage.toString();

    for (i = 0; i < runtime.modules.length; i += 1) {
      if (runtime.modules[i].toString() === modFingerprint) {
        runtime.modules.splice(i, 1);
        return;
      }
    }
    this.debug.warn('Unknown module to remove: ', info.id);
  }.bind(this, runtime));
};

/**
 * Overlay a specific policy or constraint instance on default settings.
 * TODO: consider making static.
 * @method overlay
 * @private
 * @param {Object} base The default object
 * @param {Object} overlay The superceeding object
 * @returns {Object} A new object with base parameters when not set in overlay.
 */
Policy.prototype.overlay = function(base, overlay) {
  var ret = {};

  util.mixin(ret, base);
  if (overlay) {
    util.mixin(ret, overlay, true);
  }
  return ret;
};

module.exports = Policy;

},{"./module":36,"./util":44,"es6-promise":1}],39:[function(require,module,exports){
/*jslint indent:2, node:true, sloppy:true, browser:true */
var Consumer = require('./consumer');
var util = require('./util');

/**
 * A freedom port for a user-accessable provider.
 * @class Provider
 * @implements Port
 * @uses handleEvents
 * @param {Object} def The interface of the provider.
 * @param {Debug} debug The debugger to use for logging.
 * @contructor
 */
var Provider = function (def, debug) {
  this.id = Consumer.nextId();
  util.handleEvents(this);
  this.debug = debug;
  
  this.definition = def;
  this.mode = Provider.mode.synchronous;
  this.channels = {};
  this.iface = null;
  this.providerCls = null;
  this.providerInstances = {};
};

/**
 * Provider modes of operation.
 * @property mode
 * @static
 * @type number
 */
Provider.mode = {
  synchronous: 0,
  asynchronous: 1,
  promises: 2
};

/**
 * Receive external messages for the provider.
 * @method onMessage
 * @param {String} source the source identifier of the message.
 * @param {Object} message The received message.
 */
Provider.prototype.onMessage = function (source, message) {
  if (source === 'control' && message.reverse) {
    this.channels[message.name] = message.channel;
    this.emit(message.channel, {
      type: 'channel announcement',
      channel: message.reverse
    });
    this.emit('start');
  } else if (source === 'control' && message.type === 'setup') {
    this.controlChannel = message.channel;
  } else if (source === 'control' && message.type === 'close') {
    if (message.channel === this.controlChannel) {
      delete this.controlChannel;
    }
    this.close();
  } else {
    if (!this.channels[source] && message.channel) {
      this.channels[source] = message.channel;
      this.emit('start');
      return;
    } else if (!this.channels[source]) {
      this.debug.warn('Message from unconfigured source: ' + source);
      return;
    }

    if (message.type === 'close' && message.to) {
      delete this.providerInstances[source][message.to];
    } else if (message.to && this.providerInstances[source] &&
               this.providerInstances[source][message.to]) {
      message.message.to = message.to;
      this.providerInstances[source][message.to](message.message);
    } else if (message.to && message.message &&
        message.message.type === 'construct') {
      var args = Consumer.portableToMessage(
          (this.definition.constructor && this.definition.constructor.value) ?
              this.definition.constructor.value : [],
          message.message,
          this.debug
        );
      if (!this.providerInstances[source]) {
        this.providerInstances[source] = {};
      }
      this.providerInstances[source][message.to] = this.getProvider(source, message.to, args);
    } else {
      this.debug.warn(this.toString() + ' dropping message ' +
          JSON.stringify(message));
    }
  }
};

/**
 * Close / teardown the flow this provider terminates.
 * @method close
 */
Provider.prototype.close = function () {
  if (this.controlChannel) {
    this.emit(this.controlChannel, {
      type: 'Provider Closing',
      request: 'close'
    });
    delete this.controlChannel;
  }
  this.emit('close');

  this.providerInstances = {};
  this.emitChannel = null;
};

/**
 * Get an interface to expose externally representing this port.
 * Providers are registered with the port using either
 * provideSynchronous or provideAsynchronous depending on the desired
 * return interface.
 * @method getInterface
 * @return {Object} The external interface of this Provider.
 */
Provider.prototype.getInterface = function () {
  if (this.iface) {
    return this.iface;
  } else {
    this.iface = {
      provideSynchronous: function (prov) {
        this.providerCls = prov;
        this.mode = Provider.mode.synchronous;
      }.bind(this),
      provideAsynchronous: function (prov) {
        this.providerCls = prov;
        this.mode = Provider.mode.asynchronous;
      }.bind(this),
      providePromises: function (prov) {
        this.providerCls = prov;
        this.mode = Provider.mode.promises;
      }.bind(this),
      close: function () {
        this.close();
      }.bind(this)
    };

    util.eachProp(this.definition, function (prop, name) {
      switch (prop.type) {
      case "constant":
        Object.defineProperty(this.iface, name, {
          value: Consumer.recursiveFreezeObject(prop.value),
          writable: false
        });
        break;
      }
    }.bind(this));

    return this.iface;
  }
};

/**
 * Create a function that can be used to get interfaces from this provider from
 * a user-visible point.
 * @method getProxyInterface
 */
Provider.prototype.getProxyInterface = function () {
  var func = function (p) {
    return p.getInterface();
  }.bind({}, this);

  func.close = function (iface) {
    if (iface) {
      util.eachProp(this.ifaces, function (candidate, id) {
        if (candidate === iface) {
          this.teardown(id);
          this.emit(this.emitChannel, {
            type: 'close',
            to: id
          });
          return true;
        }
      }.bind(this));
    } else {
      // Close the channel.
      this.close();
    }
  }.bind(this);

  func.onClose = function (iface, handler) {
    if (typeof iface === 'function' && handler === undefined) {
      // Add an on-channel-closed handler.
      this.once('close', iface);
      return;
    }

    util.eachProp(this.ifaces, function (candidate, id) {
      if (candidate === iface) {
        if (this.handlers[id]) {
          this.handlers[id].push(handler);
        } else {
          this.handlers[id] = [handler];
        }
        return true;
      }
    }.bind(this));
  }.bind(this);

  return func;
};

/**
 * Get a new instance of the registered provider.
 * @method getProvider
 * @param {String} source The port this instance is interactign with.
 * @param {String} identifier the messagable address for this provider.
 * @param {Array} args Constructor arguments for the provider.
 * @return {Function} A function to send messages to the provider.
 */
Provider.prototype.getProvider = function (source, identifier, args) {
  if (!this.providerCls) {
    this.debug.warn('Cannot instantiate provider, since it is not provided');
    return null;
  }

  var events = {},
    dispatchEvent,
    BoundClass,
    instance;

  util.eachProp(this.definition, function (prop, name) {
    if (prop.type === 'event') {
      events[name] = prop;
    }
  });

  dispatchEvent = function (src, ev, id, name, value) {
    if (ev[name]) {
      var streams = Consumer.messageToPortable(ev[name].value, value,
                                                   this.debug);
      this.emit(this.channels[src], {
        type: 'message',
        to: id,
        message: {
          name: name,
          type: 'event',
          text: streams.text,
          binary: streams.binary
        }
      });
    }
  }.bind(this, source, events, identifier);

  // this is all to say: new providerCls(dispatchEvent, args[0], args[1],...)
  BoundClass = this.providerCls.bind.apply(this.providerCls,
      [this.providerCls, dispatchEvent].concat(args || []));
  instance = new BoundClass();

  return function (port, src, msg) {
    if (msg.action === 'method') {
      if (typeof this[msg.type] !== 'function') {
        port.debug.warn("Provider does not implement " + msg.type + "()!");
        return;
      }
      var prop = port.definition[msg.type],
        debug = port.debug,
        args = Consumer.portableToMessage(prop.value, msg, debug),
        ret = function (src, msg, prop, resolve, reject) {
          var streams = Consumer.messageToPortable(prop.ret, resolve,
                                                       debug);
          this.emit(this.channels[src], {
            type: 'method',
            to: msg.to,
            message: {
              to: msg.to,
              type: 'method',
              reqId: msg.reqId,
              name: msg.type,
              text: streams.text,
              binary: streams.binary,
              error: reject
            }
          });
        }.bind(port, src, msg, prop);
      if (!Array.isArray(args)) {
        args = [args];
      }
      if (port.mode === Provider.mode.synchronous) {
        try {
          ret(this[msg.type].apply(this, args));
        } catch (e) {
          ret(undefined, e.message);
        }
      } else if (port.mode === Provider.mode.asynchronous) {
        this[msg.type].apply(instance, args.concat(ret));
      } else if (port.mode === Provider.mode.promises) {
        this[msg.type].apply(this, args).then(ret, ret.bind({}, undefined));
      }
    }
  }.bind(instance, this, source);
};

/**
 * Get a textual description of this port.
 * @method toString
 * @return {String} the description of this port.
 */
Provider.prototype.toString = function () {
  if (this.emitChannel) {
    return "[Provider " + this.emitChannel + "]";
  } else {
    return "[unbound Provider]";
  }
};

module.exports = Provider;

},{"./consumer":29,"./util":44}],40:[function(require,module,exports){
/*jslint indent:2, white:true, node:true, sloppy:true, browser:true */
var PromiseCompat = require('es6-promise').Promise;

var util = require('../util');
var Consumer = require('../consumer');

var ApiInterface = function(def, onMsg, emit, debug) {
  var inflight = {},
      events = null,
      emitter = null,
      reqId = 0,
      args = arguments;

  util.eachProp(def, function(prop, name) {
    switch(prop.type) {
    case 'method':
      this[name] = function() {
        // Note: inflight should be registered before message is passed
        // in order to prepare for synchronous in-window pipes.
        var thisReq = reqId,
            promise = new PromiseCompat(function(resolve, reject) {
              inflight[thisReq] = {
                resolve:resolve,
                reject:reject,
                template: prop.ret
              };
            }),
            streams = Consumer.messageToPortable(prop.value,
                Array.prototype.slice.call(arguments, 0),
                debug);
        reqId += 1;
        emit({
          action: 'method',
          type: name,
          reqId: thisReq,
          text: streams.text,
          binary: streams.binary
        });
        return promise;
      };
      break;
    case 'event':
      if(!events) {
        util.handleEvents(this);
        emitter = this.emit;
        delete this.emit;
        events = {};
      }
      events[name] = prop;
      break;
    case 'constant':
      Object.defineProperty(this, name, {
        value: Consumer.recursiveFreezeObject(prop.value),
        writable: false
      });
      break;
    }
  }.bind(this));

  onMsg(this, function(type, msg) {
    if (type === 'close') {
      this.off();
      delete this.inflight;
      return;
    }
    if (!msg) {
      return;
    }
    if (msg.type === 'method') {
      if (inflight[msg.reqId]) {
        var resolver = inflight[msg.reqId],
            template = resolver.template;
        delete inflight[msg.reqId];
        if (msg.error) {
          resolver.reject(msg.error);
        } else {
          resolver.resolve(Consumer.portableToMessage(template, msg, debug));
        }
      } else {
        debug.error('Incoming message claimed to be an RPC ' +
                         'returning for unregistered call', msg.reqId);
      }
    } else if (msg.type === 'event') {
      if (events[msg.name]) {
        emitter(msg.name, Consumer.portableToMessage(events[msg.name].value,
                msg, debug));
      }
    }
  }.bind(this));

  args = Consumer.messageToPortable(
      (def.constructor && def.constructor.value) ? def.constructor.value : [],
      Array.prototype.slice.call(args, 4),
      debug);

  emit({
    type: 'construct',
    text: args.text,
    binary: args.binary
  });
};

module.exports = ApiInterface;

},{"../consumer":29,"../util":44,"es6-promise":1}],41:[function(require,module,exports){
/*jslint indent:2, white:true, node:true, sloppy:true, browser:true */
var util = require('../util');

var EventInterface = function(onMsg, emit, debug) {
  util.handleEvents(this);
  
  onMsg(this, function(emit, type, msg) {
    emit(msg.type, msg.message);
  }.bind(this, this.emit));

  this.emit = function(emitter, type, msg) {
    emitter({type: type, message: msg}, true);
  }.bind({}, emit);
};

module.exports = EventInterface;

},{"../util":44}],42:[function(require,module,exports){
/*jslint indent:2, node:true */
var PromiseCompat = require('es6-promise').Promise;

var ApiInterface = require('./proxy/apiInterface');
var EventInterface = require('./proxy/eventInterface');
var Consumer = require('./consumer');
var Provider = require('./provider');

/**
 * A Proxy Binder manages the external interface, and creates one of
 * the different types of objects exposed by freedom either as a global
 * within a worker / module context, or returned by an external call to
 * create a freedom runtime.
 * @Class ProxyBinder
 * @param {Manager} manager The manager for the active runtime.
 */
var ProxyBinder = function (manager) {
  'use strict';
  this.manager = manager;
};

/**
 * Create a proxy for a freedom port, and return it once loaded.
 * @method getExternal
 * @param {Port} port The port for the proxy to communicate with.
 * @param {String} name The name of the proxy.
 * @param {Object} [definition] The definition of the API to expose.
 * @param {String} definition.name The name of the API.
 * @param {Object} definition.definition The definition of the API.
 * @param {Boolean} definition.provides Whether this is a consumer or provider.
 * @returns {Promise} A promise for the active proxy interface.
 */
ProxyBinder.prototype.getExternal = function (port, name, definition) {
  'use strict';
  var proxy, api;
  return new PromiseCompat(function (resolve, reject) {
    if (definition) {
      api = definition.name;
      if (definition.provides) {
        proxy = new Provider(definition.definition, this.manager.debug);
      } else {
        proxy = new Consumer(ApiInterface.bind({},
            definition.definition),
            this.manager.debug);
      }
    } else {
      proxy = new Consumer(EventInterface, this.manager.debug);
    }

    proxy.once('start', function () {
      var iface = proxy.getProxyInterface();
      if (api) {
        iface.api = api;
      }
      resolve({
        port: proxy,
        external: iface
      });
    });

    this.manager.createLink(port, name, proxy);
  }.bind(this));
};

/**
 * Bind the default proxy for a freedom port.
 * @method bindDefault
 * @param {Port} port The port for the proxy to communicate with.
 * @param {Api} api The API loader with API definitions.
 * @param {Object} manifest The manifest of the module to expose.
 * @param {Boolean} internal Whether the interface is for inside the module.
 * @returns {Promise} A promise for a proxy interface.
 * @private
 */
ProxyBinder.prototype.bindDefault = function (port, api, manifest, internal) {
  'use strict';
  var metadata = {
    name: manifest.name,
    icon: manifest.icon,
    description: manifest.description
  }, def;

  if (manifest['default']) {
    def = api.get(manifest['default']);
    if (!def && manifest.api && manifest.api[manifest['default']]) {
      def = {
        name: manifest['default'],
        definition: manifest.api[manifest['default']]
      };
    }
    if (internal && manifest.provides &&
        manifest.provides.indexOf(manifest['default']) !== false) {
      def.provides = true;
    } else if (internal) {
      api.debug.warn("default API not provided, " +
                     "are you missing a provides key in your manifest?");
    }
  }

  return this.getExternal(port, 'default', def).then(
    function (metadata, info) {
      info.external.manifest = metadata;
      return info;
    }.bind(this, metadata)
  );
};

module.exports = ProxyBinder;

},{"./consumer":29,"./provider":39,"./proxy/apiInterface":40,"./proxy/eventInterface":41,"es6-promise":1}],43:[function(require,module,exports){
/*globals XMLHttpRequest */
/*jslint indent:2,node:true,sloppy:true */
var PromiseCompat = require('es6-promise').Promise;

var util = require('./util');

/**
 * The Resource registry for FreeDOM.  Used to look up requested Resources,
 * and provide lookup and migration of resources.
 * @Class Resource
 * @param {Debug} debug The logger to use for debugging.
 * @constructor
 */
var Resource = function (debug) {
  this.debug = debug;
  this.files = {};
  this.resolvers = [this.httpResolver, this.nullResolver];
  this.contentRetrievers = {
    'http': this.xhrRetriever,
    'https': this.xhrRetriever,
    'chrome-extension': this.xhrRetriever,
    'resource': this.xhrRetriever,
    'chrome': this.xhrRetriever,
    'app': this.xhrRetriever,
    'manifest': this.manifestRetriever
  };
};

/**
 * Resolve a resurce URL requested from a module.
 * @method get
 * @param {String} manifest The canonical address of the module requesting.
 * @param {String} url The resource to get.
 * @returns {Promise} A promise for the resource address.
 */
Resource.prototype.get = function (manifest, url) {
  var key = JSON.stringify([manifest, url]);
  
  return new PromiseCompat(function (resolve, reject) {
    if (this.files[key]) {
      resolve(this.files[key]);
    } else {
      this.resolve(manifest, url).then(function (key, resolve, address) {
        this.files[key] = address;
        //fdom.debug.log('Resolved ' + key + ' to ' + address);
        resolve(address);
      }.bind(this, key, resolve), reject);
    }
  }.bind(this));
};

/**
 * Get the contents of a resource.
 * @method getContents
 * @param {String} url The resource to read.
 * @returns {Promise} A promise for the resource contents.
 */
Resource.prototype.getContents = function (url) {
  return new PromiseCompat(function (resolve, reject) {
    var prop;
    if (!url) {
      this.debug.warn("Asked to get contents of undefined URL.");
      return reject();
    }
    for (prop in this.contentRetrievers) {
      if (this.contentRetrievers.hasOwnProperty(prop)) {
        if (url.indexOf(prop + "://") === 0) {
          return this.contentRetrievers[prop].call(this, url, resolve, reject);
        } else if (url.indexOf("://") === -1 && prop === "null") {
          return this.contentRetrievers[prop].call(this, url, resolve, reject);
        }
      }
    }
    reject();
  }.bind(this));
};

/**
 * Return a promise that resolves when the first of an array of promises
 * resolves, or rejects after all promises reject. Can be thought of as
 * the missing 'Promise.any' - race is no good, since early rejections
 * preempt a subsequent resolution.
 * @private
 * @static
 * @method FirstPromise
 * @param {Promise[]} Promises to select from
 * @returns {Promise} Promise resolving with a value from arguments.
 */
var firstPromise = function(promises) {
  return new PromiseCompat(function(resolve, reject) {
    var errors = [];
    promises.forEach(function(promise) {
      promise.then(resolve, function(err) {
        errors.push(err);
        if (errors.length === promises.length) {
          reject(errors);
        }
      });
    });
  });
};

/**
 * Resolve a resource using known resolvers. Unlike get, resolve does
 * not cache resolved resources.
 * @method resolve
 * @private
 * @param {String} manifest The module requesting the resource.
 * @param {String} url The resource to resolve;
 * @returns {Promise} A promise for the resource address.
 */
Resource.prototype.resolve = function (manifest, url) {
  return new PromiseCompat(function (resolve, reject) {
    var promises = [];
    if (url === undefined) {
      return reject();
    }
    util.eachReverse(this.resolvers, function (resolver) {
      promises.push(new PromiseCompat(resolver.bind({}, manifest, url)));
    }.bind(this));
    firstPromise(promises).then(resolve, function() {
      reject('No resolvers to handle url: ' + JSON.stringify([manifest, url]));
    });
  }.bind(this));
};

/**
 * Register resolvers: code that knows how to get resources
 * needed by the runtime. A resolver will be called with four
 * arguments: the absolute manifest of the requester, the
 * resource being requested, and a resolve / reject pair to
 * fulfill a promise.
 * @method addResolver
 * @param {Function} resolver The resolver to add.
 */
Resource.prototype.addResolver = function (resolver) {
  this.resolvers.push(resolver);
};

/**
 * Register retrievers: code that knows how to load resources
 * needed by the runtime. A retriever will be called with a URL
 * to retrieve with a protocol that it is able to handle.
 * @method addRetriever
 * @param {String} proto The protocol to register for.
 * @param {Function} retriever The retriever to add.
 */
Resource.prototype.addRetriever = function (proto, retriever) {
  if (this.contentRetrievers[proto]) {
    this.debug.warn("Unwilling to override file retrieval for " + proto);
    return;
  }
  this.contentRetrievers[proto] = retriever;
};

/**
 * Register external resolvers and retreavers
 * @method register
 * @param {{"proto":String, "resolver":Function, "retreaver":Function}[]}
 *     resolvers The list of retreivers and resolvers.
 */
Resource.prototype.register = function (resolvers) {
  if (!resolvers.length) {
    return;
  }

  resolvers.forEach(function (item) {
    if (item.resolver) {
      this.addResolver(item.resolver);
    } else if (item.proto && item.retriever) {
      this.addRetriever(item.proto, item.retriever);
    }
  }.bind(this));
};

/**
 * Determine if a URL is an absolute URL of a given Scheme.
 * @method hasScheme
 * @static
 * @private
 * @param {String[]} protocols Whitelisted protocols
 * @param {String} URL the URL to match.
 * @returns {Boolean} If the URL is an absolute example of one of the schemes.
 */
Resource.hasScheme = function (protocols, url) {
  var i;
  for (i = 0; i < protocols.length; i += 1) {
    if (url.indexOf(protocols[i] + "://") === 0) {
      return true;
    }
  }
  return false;
};

/**
 * Remove './' and '../' from a URL
 * Required because Chrome Apps for Mobile (cca) doesn't understand
 * XHR paths with these relative components in the URL.
 * @method removeRelativePath
 * @param {String} url The URL to modify
 * @returns {String} url without './' and '../'
 **/
Resource.removeRelativePath = function (url) {
  var idx = url.indexOf("://") + 3,
    stack,
    toRemove,
    result;
  // Remove all instances of /./
  url = url.replace(/\/\.\//g, "/");
  //Weird bug where in cca, manifest starts with 'chrome:////'
  //This forces there to only be 2 slashes
  while (url.charAt(idx) === "/") {
    url = url.slice(0, idx) + url.slice(idx + 1, url.length);
  }

  // Advance to next /
  idx = url.indexOf("/", idx);
  // Removing ../
  stack = url.substr(idx + 1).split("/");
  while (stack.indexOf("..") !== -1) {
    toRemove = stack.indexOf("..");
    if (toRemove === 0) {
      stack.shift();
    } else {
      stack.splice((toRemove - 1), 2);
    }
  }
  
  //Rebuild string
  result = url.substr(0, idx);
  for (idx = 0; idx < stack.length; idx += 1) {
    result += "/" + stack[idx];
  }
  return result;
};

/**
 * Resolve URLs which can be accessed using standard HTTP requests.
 * @method httpResolver
 * @private
 * @param {String} manifest The Manifest URL.
 * @param {String} url The URL to resolve.
 * @param {Function} resolve The promise to complete.
 * @param {Function} reject The promise to reject.
 * @returns {Boolean} True if the URL could be resolved.
 */
Resource.prototype.httpResolver = function (manifest, url, resolve, reject) {
  var protocols = ["http", "https", "chrome", "chrome-extension", "resource",
                   "app"],
    dirname,
    protocolIdx,
    pathIdx,
    path,
    base,
    result;

  if (Resource.hasScheme(protocols, url)) {
    resolve(Resource.removeRelativePath(url));
    return true;
  }
  
  if (!manifest) {
    reject();
    return false;
  }
  if (Resource.hasScheme(protocols, manifest) &&
      url.indexOf("://") === -1) {
    dirname = manifest.substr(0, manifest.lastIndexOf("/"));
    protocolIdx = dirname.indexOf("://");
    pathIdx = protocolIdx + 3 + dirname.substr(protocolIdx + 3).indexOf("/");
    path = dirname.substr(pathIdx);
    base = dirname.substr(0, pathIdx);
    if (url.indexOf("/") === 0) {
      resolve(Resource.removeRelativePath(base + url));
    } else {
      resolve(Resource.removeRelativePath(base + path + "/" + url));
    }
    return true;
  }
  reject();
};

/**
 * Resolve URLs which are self-describing.
 * @method nullResolver
 * @private
 * @param {String} manifest The Manifest URL.
 * @param {String} url The URL to resolve.
 * @param {Function} resolve The promise to complete.
 * @param {Function} reject The promise to reject.
 * @returns {Boolean} True if the URL could be resolved.
 */
Resource.prototype.nullResolver = function (manifest, url, resolve, reject) {
  var protocols = ["manifest"];
  if (Resource.hasScheme(protocols, url)) {
    resolve(url);
    return true;
  } else if (url.indexOf('data:') === 0) {
    resolve(url);
    return true;
  }
  reject();
};

/**
 * Retrieve manifest content from a self-descriptive manifest url.
 * These urls are used to reference a manifest without requiring subsequent,
 * potentially non-CORS requests.
 * @method manifestRetriever
 * @private
 * @param {String} manifest The Manifest URL
 * @param {Function} resolve The promise to complete.
 * @param {Function} reject The promise to reject.
 */
Resource.prototype.manifestRetriever = function (manifest, resolve, reject) {
  var data;
  try {
    data = manifest.substr(11);
    JSON.parse(data);
    resolve(data);
  } catch (e) {
    this.debug.warn("Invalid manifest URL referenced:" + manifest);
    reject();
  }
};

/**
 * Retrieve resource contents using an XHR request.
 * @method xhrRetriever
 * @private
 * @param {String} url The resource to fetch.
 * @param {Function} resolve The promise to complete.
 * @param {Function} reject The promise to reject.
 */
Resource.prototype.xhrRetriever = function (url, resolve, reject) {
  var ref = new XMLHttpRequest();
  ref.addEventListener("readystatechange", function (resolve, reject) {
    if (ref.readyState === 4 && ref.responseText) {
      resolve(ref.responseText);
    } else if (ref.readyState === 4) {
      this.debug.warn("Failed to load file " + url + ": " + ref.status);
      reject(ref.status);
    }
  }.bind(this, resolve, reject), false);
  ref.overrideMimeType("application/json");
  ref.open("GET", url, true);
  ref.send();
};

module.exports = Resource;

},{"./util":44,"es6-promise":1}],44:[function(require,module,exports){
/*globals crypto, WebKitBlobBuilder, Blob, URL */
/*globals webkitURL, Uint8Array, Uint16Array, ArrayBuffer */
/*jslint indent:2,white:true,browser:true,node:true,sloppy:true */

/**
 * Utility method used within the freedom Library.
 * @class util
 * @static
 */
var util = {};


/**
 * Helper function for iterating over an array backwards. If the func
 * returns a true value, it will break out of the loop.
 * @method eachReverse
 * @static
 */
util.eachReverse = function(ary, func) {
  if (ary) {
    var i;
    for (i = ary.length - 1; i > -1; i -= 1) {
      if (ary[i] && func(ary[i], i, ary)) {
        break;
      }
    }
  }
};

/**
 * @method hasProp
 * @static
 */
util.hasProp = function(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

/**
 * Cycles over properties in an object and calls a function for each
 * property value. If the function returns a truthy value, then the
 * iteration is stopped.
 * @method eachProp
 * @static
 */
util.eachProp = function(obj, func) {
  var prop;
  for (prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (func(obj[prop], prop)) {
        break;
      }
    }
  }
};

/**
 * Simple function to mix in properties from source into target,
 * but only if target does not already have a property of the same name.
 * This is not robust in IE for transferring methods that match
 * Object.prototype names, but the uses of mixin here seem unlikely to
 * trigger a problem related to that.
 * @method mixin
 * @static
 */
util.mixin = function(target, source, force) {
  if (source) {
    util.eachProp(source, function (value, prop) {
      if (force || !util.hasProp(target, prop)) {
        target[prop] = value;
      }
    });
  }
  return target;
};

/**
 * Get a unique ID.
 * @method getId
 * @static
 */
util.getId = function() {
  var guid = 'guid',
      domain = 12,
      buffer;
  // Chrome / Firefox.
  if (typeof crypto === 'object' && crypto.getRandomValues) {
    buffer = new Uint8Array(domain);
    crypto.getRandomValues(buffer);
    util.eachReverse(buffer, function(n) {
      guid += '-' + n;
    });
  // Node
  } else if (typeof crypto === 'object' && crypto.randomBytes) {
    buffer = crypto.randomBytes(domain);
    util.eachReverse(buffer, function(n) {
      guid += '-' + n;
    });
  } else {
    while (domain > 0) {
      guid += '-' + Math.ceil(255 * Math.random());
      domain -= 1;
    }
  }

  return guid;
};

/**
 * Encode a string into a binary array buffer, by treating each character as a
 * utf16 encoded character - the native javascript encoding.
 * @method str2ab
 * @static
 * @param {String} str The string to encode.
 * @returns {ArrayBuffer} The encoded string.
 */
util.str2ab = function(str) {
  var length = str.length,
      buffer = new ArrayBuffer(length * 2), // 2 bytes for each char
      bufferView = new Uint16Array(buffer),
      i;
  for (i = 0; i < length; i += 1) {
    bufferView[i] = str.charCodeAt(i);
  }

  return buffer;
};

/**
 * Convert an array buffer containing an encoded string back into a string.
 * @method ab2str
 * @static
 * @param {ArrayBuffer} buffer The buffer to unwrap.
 * @returns {String} The decoded buffer.
 */
util.ab2str = function(buffer) {
  return String.fromCharCode.apply(null, new Uint16Array(buffer));
};

/**
 * Add 'on' and 'emit' methods to an object, which act as a light weight
 * event handling structure.
 * @class handleEvents
 * @static
 */
util.handleEvents = function(obj) {
  var eventState = {
    multiple: {},
    maybemultiple: [],
    single: {},
    maybesingle: []
  }, filter, push;

  /**
   * Filter a list based on a predicate. The list is filtered in place, with
   * selected items removed and returned by the function.
   * @method
   * @param {Array} list The list to filter
   * @param {Function} predicate The method to run on each item.
   * @returns {Array} Selected items
   */
  filter = function(list, predicate) {
    var ret = [], i;

    if (!list || !list.length) {
      return [];
    }

    for (i = list.length - 1; i >= 0; i -= 1) {
      if (predicate(list[i])) {
        ret.push(list.splice(i, 1));
      }
    }
    return ret;
  };

  /**
   * Enqueue a handler for a specific type.
   * @method
   * @param {String} to The queue ('single' or 'multiple') to queue on.
   * @param {String} type The type of event to wait for.
   * @param {Function} handler The handler to enqueue.
   */
  push = function(to, type, handler) {
    if (typeof type === 'function') {
      this['maybe' + to].push([type, handler]);
    } else if (this[to][type]) {
      this[to][type].push(handler);
    } else {
      this[to][type] = [handler];
    }
  };

  /**
   * Register a method to be executed when an event of a specific type occurs.
   * @method on
   * @param {String|Function} type The type of event to register against.
   * @param {Function} handler The handler to run when the event occurs.
   */
  obj.on = push.bind(eventState, 'multiple');

  /**
   * Register a method to be execute the next time an event occurs.
   * @method once
   * @param {String|Function} type The type of event to wait for.
   * @param {Function} handler The handler to run the next time a matching event
   *     is raised.
   */
  obj.once = push.bind(eventState, 'single');

  /**
   * Emit an event on this object.
   * @method emit
   * @param {String} type The type of event to raise.
   * @param {Object} data The payload of the event.
   */
  obj.emit = function(type, data) {
    var i, queue;
    if (this.multiple[type]) {
      for (i = 0; i < this.multiple[type].length; i += 1) {
        if (this.multiple[type][i](data) === false) {
          return;
        }
      }
    }
    if (this.single[type]) {
      queue = this.single[type];
      this.single[type] = [];
      for (i = 0; i < queue.length; i += 1) {
        queue[i](data);
      }
    }
    for (i = 0; i < this.maybemultiple.length; i += 1) {
      if (this.maybemultiple[i][0](type, data)) {
        this.maybemultiple[i][1](data);
      }
    }
    for (i = this.maybesingle.length - 1; i >= 0; i -= 1) {
      if (this.maybesingle[i][0](type, data)) {
        queue = this.maybesingle.splice(i, 1);
        queue[0][1](data);
      }
    }
  }.bind(eventState);

  /**
   * Remove an event handler
   * @method off
   * @param {String} type The type of event to remove.
   * @param {Function?} handler The handler to remove.
   */
  obj.off = function(type, handler) {
    if (!type) {
      this.multiple = {};
      this.maybemultiple = [];
      this.single = {};
      this.maybesingle = [];
      return;
    }

    if (typeof type === 'function') {
      filter(this.maybesingle, function(item) {
        return item[0] === type && (!handler || item[1] === handler);
      });
      filter(this.maybemultiple, function(item) {
        return item[0] === type && (!handler || item[1] === handler);
      });
    }

    if (!handler) {
      delete this.multiple[type];
      delete this.single[type];
    } else {
      filter(this.multiple[type], function(item) {
        return item === handler;
      });
      filter(this.single[type], function(item) {
        return item === handler;
      });
    }
  }.bind(eventState);
};

/**
 * When run without a window, or specifically requested.
 * Note: Declaration can be redefined in forceModuleContext below.
 * @method isModuleContext
 * @for util
 * @static
 */
/*!@preserve StartModuleContextDeclaration*/
util.isModuleContext = function() {
  return (typeof document === 'undefined');
};

/**
 * Get a Blob object of a string.
 * Polyfills implementations which don't have a current Blob constructor, like
 * phantomjs.
 * @method getBlob
 * @static
 */
util.getBlob = function(data, type) {
  if (typeof Blob !== 'function' && typeof WebKitBlobBuilder !== 'undefined') {
    var builder = new WebKitBlobBuilder();
    builder.append(data);
    return builder.getBlob(type);
  } else {
    return new Blob([data], {type: type});
  }
};

/**
 * Find all scripts on the given page.
 * @method scripts
 * @static
 */
util.scripts = function(global) {
  return global.document.getElementsByTagName('script');
};

module.exports = util;

},{}],45:[function(require,module,exports){
(function (global){
/*jslint node:true*/

var providers = [
  require('../../providers/core/core.unprivileged'),
  require('../../providers/core/echo.unprivileged'),
  require('../../providers/core/console.unprivileged'),
  require('../../providers/core/peerconnection.unprivileged'),
  require('../../providers/core/core.rtcpeerconnection'),
  require('../../providers/core/core.rtcdatachannel'),
  require('../../providers/core/storage.localstorage'),
  require('../../providers/core/core.view'),
  require('../../providers/core/core.oauth'),
  require('../../providers/core/websocket.unprivileged')
];

function getFreedomScript() {
  'use strict';
  var script;
  if (window.document.currentScript) {
    // New browser API
    script = window.document.currentScript.src;
  } else if (document.readyState !== "complete" &&
             document.readyState !== "loaded") {
    // Included in HTML or through document.write
    script = window.document.getElementsByTagName('script');
    script = script[script.length - 1].src;
  } else {
    // Loaded through dom manipulation or async.
    script = document.querySelector(
      "script[src*='freedom.js'],script[src*='freedom-']"
    );
    if (script.length !== 1) {
      console.error("Could not determine freedom.js script tag.");
    }
    script = script[0].src;
  }
  return script;
}

if (typeof window !== 'undefined') {
  window.freedom = require('../entry').bind({}, {
    location: window.location.href,
    portType: require('../link/worker'),
    source: getFreedomScript(),
    providers: providers,
    oauth: [
      require('../../providers/oauth/oauth.localpageauth'),
      require('../../providers/oauth/oauth.remotepageauth')
    ]
  });
} else {
  require('../entry')({
    isModule: true,
    portType: require('../link/worker'),
    providers: providers,
    global: global
  });
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../providers/core/console.unprivileged":15,"../../providers/core/core.oauth":16,"../../providers/core/core.rtcdatachannel":17,"../../providers/core/core.rtcpeerconnection":18,"../../providers/core/core.unprivileged":19,"../../providers/core/core.view":20,"../../providers/core/echo.unprivileged":21,"../../providers/core/peerconnection.unprivileged":22,"../../providers/core/storage.localstorage":23,"../../providers/core/websocket.unprivileged":24,"../../providers/oauth/oauth.localpageauth":25,"../../providers/oauth/oauth.remotepageauth":26,"../entry":31,"../link/worker":34}]},{},[45])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9hbGwuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL2FzYXAuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL2NvbmZpZy5qcyIsIm5vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcG9seWZpbGwuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3Byb21pc2UuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3JhY2UuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3JlamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcmVzb2x2ZS5qcyIsIm5vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9ub2RlLWpzb24tbWluaWZ5L2pzb24ubWluaWZ5LmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2FkYXB0ZXIuanMiLCJwcm92aWRlcnMvY29yZS9jb25zb2xlLnVucHJpdmlsZWdlZC5qcyIsInByb3ZpZGVycy9jb3JlL2NvcmUub2F1dGguanMiLCJwcm92aWRlcnMvY29yZS9jb3JlLnJ0Y2RhdGFjaGFubmVsLmpzIiwicHJvdmlkZXJzL2NvcmUvY29yZS5ydGNwZWVyY29ubmVjdGlvbi5qcyIsInByb3ZpZGVycy9jb3JlL2NvcmUudW5wcml2aWxlZ2VkLmpzIiwicHJvdmlkZXJzL2NvcmUvY29yZS52aWV3LmpzIiwicHJvdmlkZXJzL2NvcmUvZWNoby51bnByaXZpbGVnZWQuanMiLCJwcm92aWRlcnMvY29yZS9wZWVyY29ubmVjdGlvbi51bnByaXZpbGVnZWQuanMiLCJwcm92aWRlcnMvY29yZS9zdG9yYWdlLmxvY2Fsc3RvcmFnZS5qcyIsInByb3ZpZGVycy9jb3JlL3dlYnNvY2tldC51bnByaXZpbGVnZWQuanMiLCJwcm92aWRlcnMvb2F1dGgvb2F1dGgubG9jYWxwYWdlYXV0aC5qcyIsInByb3ZpZGVycy9vYXV0aC9vYXV0aC5yZW1vdGVwYWdlYXV0aC5qcyIsInNyYy9hcGkuanMiLCJzcmMvYnVuZGxlLmpzIiwic3JjL2NvbnN1bWVyLmpzIiwic3JjL2RlYnVnLmpzIiwic3JjL2VudHJ5LmpzIiwic3JjL2h1Yi5qcyIsInNyYy9saW5rLmpzIiwic3JjL2xpbmsvd29ya2VyLmpzIiwic3JjL21hbmFnZXIuanMiLCJzcmMvbW9kdWxlLmpzIiwic3JjL21vZHVsZWludGVybmFsLmpzIiwic3JjL3BvbGljeS5qcyIsInNyYy9wcm92aWRlci5qcyIsInNyYy9wcm94eS9hcGlJbnRlcmZhY2UuanMiLCJzcmMvcHJveHkvZXZlbnRJbnRlcmZhY2UuanMiLCJzcmMvcHJveHliaW5kZXIuanMiLCJzcmMvcmVzb3VyY2UuanMiLCJzcmMvdXRpbC5qcyIsInNyYy91dGlsL3dvcmtlckVudHJ5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9OQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIFByb21pc2UgPSByZXF1aXJlKFwiLi9wcm9taXNlL3Byb21pc2VcIikuUHJvbWlzZTtcbnZhciBwb2x5ZmlsbCA9IHJlcXVpcmUoXCIuL3Byb21pc2UvcG9seWZpbGxcIikucG9seWZpbGw7XG5leHBvcnRzLlByb21pc2UgPSBQcm9taXNlO1xuZXhwb3J0cy5wb2x5ZmlsbCA9IHBvbHlmaWxsOyIsIlwidXNlIHN0cmljdFwiO1xuLyogZ2xvYmFsIHRvU3RyaW5nICovXG5cbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIi4vdXRpbHNcIikuaXNBcnJheTtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbHNcIikuaXNGdW5jdGlvbjtcblxuLyoqXG4gIFJldHVybnMgYSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIHRoZSBnaXZlbiBwcm9taXNlcyBoYXZlIGJlZW5cbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuIFRoZSByZXR1cm4gcHJvbWlzZVxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSB0aGF0IGdpdmVzIGFsbCB0aGUgdmFsdWVzIGluIHRoZSBvcmRlciB0aGV5IHdlcmVcbiAgcGFzc2VkIGluIHRoZSBgcHJvbWlzZXNgIGFycmF5IGFyZ3VtZW50LlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZTEgPSBSU1ZQLnJlc29sdmUoMSk7XG4gIHZhciBwcm9taXNlMiA9IFJTVlAucmVzb2x2ZSgyKTtcbiAgdmFyIHByb21pc2UzID0gUlNWUC5yZXNvbHZlKDMpO1xuICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBSU1ZQLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gVGhlIGFycmF5IGhlcmUgd291bGQgYmUgWyAxLCAyLCAzIF07XG4gIH0pO1xuICBgYGBcblxuICBJZiBhbnkgb2YgdGhlIGBwcm9taXNlc2AgZ2l2ZW4gdG8gYFJTVlAuYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgdmFyIHByb21pc2UyID0gUlNWUC5yZWplY3QobmV3IEVycm9yKFwiMlwiKSk7XG4gIHZhciBwcm9taXNlMyA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBSU1ZQLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBmb3IgUlNWUFxuICBAcGFyYW0ge0FycmF5fSBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWxcbiAgQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aGVuIGFsbCBgcHJvbWlzZXNgIGhhdmUgYmVlblxuICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIGlmIGFueSBvZiB0aGVtIGJlY29tZSByZWplY3RlZC5cbiovXG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gIGlmICghaXNBcnJheShwcm9taXNlcykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIGFsbC4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdLCByZW1haW5pbmcgPSBwcm9taXNlcy5sZW5ndGgsXG4gICAgcHJvbWlzZTtcblxuICAgIGlmIChyZW1haW5pbmcgPT09IDApIHtcbiAgICAgIHJlc29sdmUoW10pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmVyKGluZGV4KSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmVzb2x2ZUFsbChpbmRleCwgdmFsdWUpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlQWxsKGluZGV4LCB2YWx1ZSkge1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvbWlzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlc1tpXTtcblxuICAgICAgaWYgKHByb21pc2UgJiYgaXNGdW5jdGlvbihwcm9taXNlLnRoZW4pKSB7XG4gICAgICAgIHByb21pc2UudGhlbihyZXNvbHZlcihpKSwgcmVqZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmVBbGwoaSwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0cy5hbGwgPSBhbGw7IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciBicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xudmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbnZhciBsb2NhbCA9ICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykgPyBnbG9iYWwgOiAodGhpcyA9PT0gdW5kZWZpbmVkPyB3aW5kb3c6dGhpcyk7XG5cbi8vIG5vZGVcbmZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gIHZhciBpdGVyYXRpb25zID0gMDtcbiAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgbG9jYWwuc2V0VGltZW91dChmbHVzaCwgMSk7XG4gIH07XG59XG5cbnZhciBxdWV1ZSA9IFtdO1xuZnVuY3Rpb24gZmx1c2goKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdHVwbGUgPSBxdWV1ZVtpXTtcbiAgICB2YXIgY2FsbGJhY2sgPSB0dXBsZVswXSwgYXJnID0gdHVwbGVbMV07XG4gICAgY2FsbGJhY2soYXJnKTtcbiAgfVxuICBxdWV1ZSA9IFtdO1xufVxuXG52YXIgc2NoZWR1bGVGbHVzaDtcblxuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xufSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTXV0YXRpb25PYnNlcnZlcigpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gIHZhciBsZW5ndGggPSBxdWV1ZS5wdXNoKFtjYWxsYmFjaywgYXJnXSk7XG4gIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAvLyBJZiBsZW5ndGggaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgc2NoZWR1bGVGbHVzaCgpO1xuICB9XG59XG5cbmV4cG9ydHMuYXNhcCA9IGFzYXA7XG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNvbmZpZyA9IHtcbiAgaW5zdHJ1bWVudDogZmFsc2Vcbn07XG5cbmZ1bmN0aW9uIGNvbmZpZ3VyZShuYW1lLCB2YWx1ZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbmZpZ1tuYW1lXSA9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjb25maWdbbmFtZV07XG4gIH1cbn1cblxuZXhwb3J0cy5jb25maWcgPSBjb25maWc7XG5leHBvcnRzLmNvbmZpZ3VyZSA9IGNvbmZpZ3VyZTsiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcbi8qZ2xvYmFsIHNlbGYqL1xudmFyIFJTVlBQcm9taXNlID0gcmVxdWlyZShcIi4vcHJvbWlzZVwiKS5Qcm9taXNlO1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgdmFyIGxvY2FsO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gZ2xvYmFsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgIGxvY2FsID0gd2luZG93O1xuICB9IGVsc2Uge1xuICAgIGxvY2FsID0gc2VsZjtcbiAgfVxuXG4gIHZhciBlczZQcm9taXNlU3VwcG9ydCA9IFxuICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAvLyBGaXJlZm94L0Nocm9tZSBleHBlcmltZW50YWwgaW1wbGVtZW50YXRpb25zXG4gICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIFwiYWxsXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgIC8vIGFzIHRoZSBhcmcgcmF0aGVyIHRoYW4gYSBmdW5jdGlvblxuICAgIChmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXNvbHZlO1xuICAgICAgbmV3IGxvY2FsLlByb21pc2UoZnVuY3Rpb24ocikgeyByZXNvbHZlID0gcjsgfSk7XG4gICAgICByZXR1cm4gaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICB9KCkpO1xuXG4gIGlmICghZXM2UHJvbWlzZVN1cHBvcnQpIHtcbiAgICBsb2NhbC5Qcm9taXNlID0gUlNWUFByb21pc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpLmNvbmZpZztcbnZhciBjb25maWd1cmUgPSByZXF1aXJlKFwiLi9jb25maWdcIikuY29uZmlndXJlO1xudmFyIG9iamVjdE9yRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsc1wiKS5vYmplY3RPckZ1bmN0aW9uO1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0Z1bmN0aW9uO1xudmFyIG5vdyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLm5vdztcbnZhciBhbGwgPSByZXF1aXJlKFwiLi9hbGxcIikuYWxsO1xudmFyIHJhY2UgPSByZXF1aXJlKFwiLi9yYWNlXCIpLnJhY2U7XG52YXIgc3RhdGljUmVzb2x2ZSA9IHJlcXVpcmUoXCIuL3Jlc29sdmVcIikucmVzb2x2ZTtcbnZhciBzdGF0aWNSZWplY3QgPSByZXF1aXJlKFwiLi9yZWplY3RcIikucmVqZWN0O1xudmFyIGFzYXAgPSByZXF1aXJlKFwiLi9hc2FwXCIpLmFzYXA7XG5cbnZhciBjb3VudGVyID0gMDtcblxuY29uZmlnLmFzeW5jID0gYXNhcDsgLy8gZGVmYXVsdCBhc3luYyBpcyBhc2FwO1xuXG5mdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gIH1cblxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xuICB9XG5cbiAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICBpbnZva2VSZXNvbHZlcihyZXNvbHZlciwgdGhpcyk7XG59XG5cbmZ1bmN0aW9uIGludm9rZVJlc29sdmVyKHJlc29sdmVyLCBwcm9taXNlKSB7XG4gIGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKSB7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWplY3RQcm9taXNlKHJlYXNvbikge1xuICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICByZXNvbHZlcihyZXNvbHZlUHJvbWlzZSwgcmVqZWN0UHJvbWlzZSk7XG4gIH0gY2F0Y2goZSkge1xuICAgIHJlamVjdFByb21pc2UoZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICB2YXIgaGFzQ2FsbGJhY2sgPSBpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhbHVlID0gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgZXJyb3IgPSBlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKGhhbmRsZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKSkge1xuICAgIHJldHVybjtcbiAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IEZVTEZJTExFRCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IFJFSkVDVEVEKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG52YXIgUEVORElORyAgID0gdm9pZCAwO1xudmFyIFNFQUxFRCAgICA9IDA7XG52YXIgRlVMRklMTEVEID0gMTtcbnZhciBSRUpFQ1RFRCAgPSAyO1xuXG5mdW5jdGlvbiBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICBzdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIHN1YnNjcmliZXJzW2xlbmd0aCArIEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICBzdWJzY3JpYmVyc1tsZW5ndGggKyBSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2gocHJvbWlzZSwgc2V0dGxlZCkge1xuICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzLCBkZXRhaWwgPSBwcm9taXNlLl9kZXRhaWw7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gIH1cblxuICBwcm9taXNlLl9zdWJzY3JpYmVycyA9IG51bGw7XG59XG5cblByb21pc2UucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogUHJvbWlzZSxcblxuICBfc3RhdGU6IHVuZGVmaW5lZCxcbiAgX2RldGFpbDogdW5kZWZpbmVkLFxuICBfc3Vic2NyaWJlcnM6IHVuZGVmaW5lZCxcblxuICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcblxuICAgIHZhciB0aGVuUHJvbWlzZSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGZ1bmN0aW9uKCkge30pO1xuXG4gICAgaWYgKHRoaXMuX3N0YXRlKSB7XG4gICAgICB2YXIgY2FsbGJhY2tzID0gYXJndW1lbnRzO1xuICAgICAgY29uZmlnLmFzeW5jKGZ1bmN0aW9uIGludm9rZVByb21pc2VDYWxsYmFjaygpIHtcbiAgICAgICAgaW52b2tlQ2FsbGJhY2socHJvbWlzZS5fc3RhdGUsIHRoZW5Qcm9taXNlLCBjYWxsYmFja3NbcHJvbWlzZS5fc3RhdGUgLSAxXSwgcHJvbWlzZS5fZGV0YWlsKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzY3JpYmUodGhpcywgdGhlblByb21pc2UsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhlblByb21pc2U7XG4gIH0sXG5cbiAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgfVxufTtcblxuUHJvbWlzZS5hbGwgPSBhbGw7XG5Qcm9taXNlLnJhY2UgPSByYWNlO1xuUHJvbWlzZS5yZXNvbHZlID0gc3RhdGljUmVzb2x2ZTtcblByb21pc2UucmVqZWN0ID0gc3RhdGljUmVqZWN0O1xuXG5mdW5jdGlvbiBoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkge1xuICB2YXIgdGhlbiA9IG51bGwsXG4gIHJlc29sdmVkO1xuXG4gIHRyeSB7XG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLlwiKTtcbiAgICB9XG5cbiAgICBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHRoZW4gPSB2YWx1ZS50aGVuO1xuXG4gICAgICBpZiAoaXNGdW5jdGlvbih0aGVuKSkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIGlmIChyZXNvbHZlZCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdmFsKSB7XG4gICAgICAgICAgICByZXNvbHZlKHByb21pc2UsIHZhbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIGlmIChyZXNvbHZlZCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICAgIHJlamVjdChwcm9taXNlLCB2YWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfSBlbHNlIGlmICghaGFuZGxlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gIHByb21pc2UuX3N0YXRlID0gU0VBTEVEO1xuICBwcm9taXNlLl9kZXRhaWwgPSB2YWx1ZTtcblxuICBjb25maWcuYXN5bmMocHVibGlzaEZ1bGZpbGxtZW50LCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gIHByb21pc2UuX3N0YXRlID0gU0VBTEVEO1xuICBwcm9taXNlLl9kZXRhaWwgPSByZWFzb247XG5cbiAgY29uZmlnLmFzeW5jKHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBwdWJsaXNoRnVsZmlsbG1lbnQocHJvbWlzZSkge1xuICBwdWJsaXNoKHByb21pc2UsIHByb21pc2UuX3N0YXRlID0gRlVMRklMTEVEKTtcbn1cblxuZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gIHB1Ymxpc2gocHJvbWlzZSwgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRCk7XG59XG5cbmV4cG9ydHMuUHJvbWlzZSA9IFByb21pc2U7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKiBnbG9iYWwgdG9TdHJpbmcgKi9cbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIi4vdXRpbHNcIikuaXNBcnJheTtcblxuLyoqXG4gIGBSU1ZQLnJhY2VgIGFsbG93cyB5b3UgdG8gd2F0Y2ggYSBzZXJpZXMgb2YgcHJvbWlzZXMgYW5kIGFjdCBhcyBzb29uIGFzIHRoZVxuICBmaXJzdCBwcm9taXNlIGdpdmVuIHRvIHRoZSBgcHJvbWlzZXNgIGFyZ3VtZW50IGZ1bGZpbGxzIG9yIHJlamVjdHMuXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlMSA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKFwicHJvbWlzZSAxXCIpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIHZhciBwcm9taXNlMiA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKFwicHJvbWlzZSAyXCIpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFJTVlAucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gXCJwcm9taXNlIDJcIiBiZWNhdXNlIGl0IHdhcyByZXNvbHZlZCBiZWZvcmUgcHJvbWlzZTFcbiAgICAvLyB3YXMgcmVzb2x2ZWQuXG4gIH0pO1xuICBgYGBcblxuICBgUlNWUC5yYWNlYCBpcyBkZXRlcm1pbmlzdGljIGluIHRoYXQgb25seSB0aGUgc3RhdGUgb2YgdGhlIGZpcnN0IGNvbXBsZXRlZFxuICBwcm9taXNlIG1hdHRlcnMuIEZvciBleGFtcGxlLCBldmVuIGlmIG90aGVyIHByb21pc2VzIGdpdmVuIHRvIHRoZSBgcHJvbWlzZXNgXG4gIGFycmF5IGFyZ3VtZW50IGFyZSByZXNvbHZlZCwgYnV0IHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZSBoYXMgYmVjb21lXG4gIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkIHByb21pc2VcbiAgd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZTEgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZShcInByb21pc2UgMVwiKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICB2YXIgcHJvbWlzZTIgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcihcInByb21pc2UgMlwiKSk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUlNWUC5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09IFwicHJvbWlzZTJcIiBiZWNhdXNlIHByb21pc2UgMiBiZWNhbWUgcmVqZWN0ZWQgYmVmb3JlXG4gICAgLy8gcHJvbWlzZSAxIGJlY2FtZSBmdWxmaWxsZWRcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAZm9yIFJTVlBcbiAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXMgYXJyYXkgb2YgcHJvbWlzZXMgdG8gb2JzZXJ2ZVxuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBkZXNjcmliaW5nIHRoZSBwcm9taXNlIHJldHVybmVkLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IGJlY29tZXMgZnVsZmlsbGVkIHdpdGggdGhlIHZhbHVlIHRoZSBmaXJzdFxuICBjb21wbGV0ZWQgcHJvbWlzZXMgaXMgcmVzb2x2ZWQgd2l0aCBpZiB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2Ugd2FzXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgd2l0aCB0aGUgcmVhc29uIHRoYXQgdGhlIGZpcnN0IGNvbXBsZXRlZCBwcm9taXNlXG4gIHdhcyByZWplY3RlZCB3aXRoLlxuKi9cbmZ1bmN0aW9uIHJhY2UocHJvbWlzZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gIGlmICghaXNBcnJheShwcm9taXNlcykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJyk7XG4gIH1cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXN1bHRzID0gW10sIHByb21pc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9taXNlID0gcHJvbWlzZXNbaV07XG5cbiAgICAgIGlmIChwcm9taXNlICYmIHR5cGVvZiBwcm9taXNlLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydHMucmFjZSA9IHJhY2U7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAgYFJTVlAucmVqZWN0YCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlamVjdGVkIHdpdGggdGhlIHBhc3NlZFxuICBgcmVhc29uYC4gYFJTVlAucmVqZWN0YCBpcyBlc3NlbnRpYWxseSBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZSA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZSA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlamVjdFxuICBAZm9yIFJTVlBcbiAgQHBhcmFtIHtBbnl9IHJlYXNvbiB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aC5cbiAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsIG9wdGlvbmFsIHN0cmluZyBmb3IgaWRlbnRpZnlpbmcgdGhlIHJldHVybmVkIHByb21pc2UuXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVqZWN0ZWQgd2l0aCB0aGUgZ2l2ZW5cbiAgYHJlYXNvbmAuXG4qL1xuZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZWplY3QocmVhc29uKTtcbiAgfSk7XG59XG5cbmV4cG9ydHMucmVqZWN0ID0gcmVqZWN0OyIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gcmVzb2x2ZSh2YWx1ZSkge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gdGhpcykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHZhciBQcm9taXNlID0gdGhpcztcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHJlc29sdmUodmFsdWUpO1xuICB9KTtcbn1cblxuZXhwb3J0cy5yZXNvbHZlID0gcmVzb2x2ZTsiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICByZXR1cm4gaXNGdW5jdGlvbih4KSB8fCAodHlwZW9mIHggPT09IFwib2JqZWN0XCIgJiYgeCAhPT0gbnVsbCk7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gaXNBcnJheSh4KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbn1cblxuLy8gRGF0ZS5ub3cgaXMgbm90IGF2YWlsYWJsZSBpbiBicm93c2VycyA8IElFOVxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRGF0ZS9ub3cjQ29tcGF0aWJpbGl0eVxudmFyIG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cblxuZXhwb3J0cy5vYmplY3RPckZ1bmN0aW9uID0gb2JqZWN0T3JGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuZXhwb3J0cy5ub3cgPSBub3c7IixudWxsLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiLyohIEpTT04ubWluaWZ5KClcblx0djAuMS4zLWEgKGMpIEt5bGUgU2ltcHNvblxuXHRNSVQgTGljZW5zZVxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihqc29uKSB7XG5cdFxuXHR2YXIgdG9rZW5pemVyID0gL1wifChcXC9cXCopfChcXCpcXC8pfChcXC9cXC8pfFxcbnxcXHIvZyxcblx0XHRpbl9zdHJpbmcgPSBmYWxzZSxcblx0XHRpbl9tdWx0aWxpbmVfY29tbWVudCA9IGZhbHNlLFxuXHRcdGluX3NpbmdsZWxpbmVfY29tbWVudCA9IGZhbHNlLFxuXHRcdHRtcCwgdG1wMiwgbmV3X3N0ciA9IFtdLCBucyA9IDAsIGZyb20gPSAwLCBsYywgcmNcblx0O1xuXHRcblx0dG9rZW5pemVyLmxhc3RJbmRleCA9IDA7XG5cdFxuXHR3aGlsZSAodG1wID0gdG9rZW5pemVyLmV4ZWMoanNvbikpIHtcblx0XHRsYyA9IFJlZ0V4cC5sZWZ0Q29udGV4dDtcblx0XHRyYyA9IFJlZ0V4cC5yaWdodENvbnRleHQ7XG5cdFx0aWYgKCFpbl9tdWx0aWxpbmVfY29tbWVudCAmJiAhaW5fc2luZ2xlbGluZV9jb21tZW50KSB7XG5cdFx0XHR0bXAyID0gbGMuc3Vic3RyaW5nKGZyb20pO1xuXHRcdFx0aWYgKCFpbl9zdHJpbmcpIHtcblx0XHRcdFx0dG1wMiA9IHRtcDIucmVwbGFjZSgvKFxcbnxcXHJ8XFxzKSovZyxcIlwiKTtcblx0XHRcdH1cblx0XHRcdG5ld19zdHJbbnMrK10gPSB0bXAyO1xuXHRcdH1cblx0XHRmcm9tID0gdG9rZW5pemVyLmxhc3RJbmRleDtcblx0XHRcblx0XHRpZiAodG1wWzBdID09IFwiXFxcIlwiICYmICFpbl9tdWx0aWxpbmVfY29tbWVudCAmJiAhaW5fc2luZ2xlbGluZV9jb21tZW50KSB7XG5cdFx0XHR0bXAyID0gbGMubWF0Y2goLyhcXFxcKSokLyk7XG5cdFx0XHRpZiAoIWluX3N0cmluZyB8fCAhdG1wMiB8fCAodG1wMlswXS5sZW5ndGggJSAyKSA9PSAwKSB7XHQvLyBzdGFydCBvZiBzdHJpbmcgd2l0aCBcIiwgb3IgdW5lc2NhcGVkIFwiIGNoYXJhY3RlciBmb3VuZCB0byBlbmQgc3RyaW5nXG5cdFx0XHRcdGluX3N0cmluZyA9ICFpbl9zdHJpbmc7XG5cdFx0XHR9XG5cdFx0XHRmcm9tLS07IC8vIGluY2x1ZGUgXCIgY2hhcmFjdGVyIGluIG5leHQgY2F0Y2hcblx0XHRcdHJjID0ganNvbi5zdWJzdHJpbmcoZnJvbSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHRtcFswXSA9PSBcIi8qXCIgJiYgIWluX3N0cmluZyAmJiAhaW5fbXVsdGlsaW5lX2NvbW1lbnQgJiYgIWluX3NpbmdsZWxpbmVfY29tbWVudCkge1xuXHRcdFx0aW5fbXVsdGlsaW5lX2NvbW1lbnQgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlIGlmICh0bXBbMF0gPT0gXCIqL1wiICYmICFpbl9zdHJpbmcgJiYgaW5fbXVsdGlsaW5lX2NvbW1lbnQgJiYgIWluX3NpbmdsZWxpbmVfY29tbWVudCkge1xuXHRcdFx0aW5fbXVsdGlsaW5lX2NvbW1lbnQgPSBmYWxzZTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodG1wWzBdID09IFwiLy9cIiAmJiAhaW5fc3RyaW5nICYmICFpbl9tdWx0aWxpbmVfY29tbWVudCAmJiAhaW5fc2luZ2xlbGluZV9jb21tZW50KSB7XG5cdFx0XHRpbl9zaW5nbGVsaW5lX2NvbW1lbnQgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlIGlmICgodG1wWzBdID09IFwiXFxuXCIgfHwgdG1wWzBdID09IFwiXFxyXCIpICYmICFpbl9zdHJpbmcgJiYgIWluX211bHRpbGluZV9jb21tZW50ICYmIGluX3NpbmdsZWxpbmVfY29tbWVudCkge1xuXHRcdFx0aW5fc2luZ2xlbGluZV9jb21tZW50ID0gZmFsc2U7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKCFpbl9tdWx0aWxpbmVfY29tbWVudCAmJiAhaW5fc2luZ2xlbGluZV9jb21tZW50ICYmICEoL1xcbnxcXHJ8XFxzLy50ZXN0KHRtcFswXSkpKSB7XG5cdFx0XHRuZXdfc3RyW25zKytdID0gdG1wWzBdO1xuXHRcdH1cblx0fVxuXHRuZXdfc3RyW25zKytdID0gcmM7XG5cdHJldHVybiBuZXdfc3RyLmpvaW4oXCJcIik7XG59O1xuXG4iLCIvKmpzbGludCBub2RlOnRydWUqL1xuLypnbG9iYWxzIFJUQ1BlZXJDb25uZWN0aW9uLCBtb3pSVENQZWVyQ29ubmVjdGlvbiwgd2Via2l0UlRDUGVlckNvbm5lY3Rpb24gKi9cbi8qZ2xvYmFscyBSVENTZXNzaW9uRGVzY3JpcHRpb24sIG1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbiAqL1xuLypnbG9iYWxzIFJUQ0ljZUNhbmRpZGF0ZSwgbW96UlRDSWNlQ2FuZGlkYXRlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBteVJUQ1BlZXJDb25uZWN0aW9uID0gbnVsbDtcbnZhciBteVJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IG51bGw7XG52YXIgbXlSVENJY2VDYW5kaWRhdGUgPSBudWxsO1xuXG52YXIgcmVuYW1lSWNlVVJMcyA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgaWYgKCFjb25maWcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFjb25maWcuaWNlU2VydmVycykge1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbiAgY29uZmlnLmljZVNlcnZlcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VydmVyKSB7XG4gICAgc2VydmVyLnVybCA9IHNlcnZlci51cmxzO1xuICAgIGRlbGV0ZSBzZXJ2ZXIudXJscztcbiAgfSk7XG4gIHJldHVybiBjb25maWc7XG59O1xuXG52YXIgZml4Q2hyb21lU3RhdHNSZXNwb25zZSA9IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gIHZhciBzdGFuZGFyZFJlcG9ydCA9IHt9O1xuICB2YXIgcmVwb3J0cyA9IHJlc3BvbnNlLnJlc3VsdCgpO1xuICByZXBvcnRzLmZvckVhY2goZnVuY3Rpb24ocmVwb3J0KSB7XG4gICAgdmFyIHN0YW5kYXJkU3RhdHMgPSB7XG4gICAgICBpZDogcmVwb3J0LmlkLFxuICAgICAgdGltZXN0YW1wOiByZXBvcnQudGltZXN0YW1wLFxuICAgICAgdHlwZTogcmVwb3J0LnR5cGVcbiAgICB9O1xuICAgIHJlcG9ydC5uYW1lcygpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgc3RhbmRhcmRTdGF0c1tuYW1lXSA9IHJlcG9ydC5zdGF0KG5hbWUpO1xuICAgIH0pO1xuICAgIHN0YW5kYXJkUmVwb3J0W3N0YW5kYXJkU3RhdHMuaWRdID0gc3RhbmRhcmRTdGF0cztcbiAgfSk7XG5cbiAgcmV0dXJuIHN0YW5kYXJkUmVwb3J0O1xufTtcblxuLy8gVW5pZnkgUGVlckNvbm5lY3Rpb24gT2JqZWN0LlxuaWYgKHR5cGVvZiBSVENQZWVyQ29ubmVjdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgbXlSVENQZWVyQ29ubmVjdGlvbiA9IFJUQ1BlZXJDb25uZWN0aW9uO1xufSBlbHNlIGlmICh0eXBlb2YgbW96UlRDUGVlckNvbm5lY3Rpb24gIT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIEZpcmVmb3ggdXNlcyAndXJsJyByYXRoZXIgdGhhbiAndXJscycgZm9yIFJUQ0ljZVNlcnZlci51cmxzXG4gIG15UlRDUGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbiAoY29uZmlndXJhdGlvbiwgY29uc3RyYWludHMpIHtcbiAgICByZXR1cm4gbmV3IG1velJUQ1BlZXJDb25uZWN0aW9uKHJlbmFtZUljZVVSTHMoY29uZmlndXJhdGlvbiksIGNvbnN0cmFpbnRzKTtcbiAgfTtcbn0gZWxzZSBpZiAodHlwZW9mIHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAvLyBDaHJvbWUgcmV0dXJucyBhIG5vbnN0YW5kYXJkLCBub24tSlNPTi1pZmlhYmxlIHJlc3BvbnNlIGZyb20gZ2V0U3RhdHMuXG4gIG15UlRDUGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbihjb25maWd1cmF0aW9uLCBjb25zdHJhaW50cykge1xuICAgIHZhciBwYyA9IG5ldyB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbihjb25maWd1cmF0aW9uLCBjb25zdHJhaW50cyk7XG4gICAgdmFyIGJvdW5kR2V0U3RhdHMgPSBwYy5nZXRTdGF0cy5iaW5kKHBjKTtcbiAgICBwYy5nZXRTdGF0cyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgdmFyIHN1Y2Nlc3NDYWxsYmFja1dyYXBwZXIgPSBmdW5jdGlvbihjaHJvbWVTdGF0c1Jlc3BvbnNlKSB7XG4gICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhmaXhDaHJvbWVTdGF0c1Jlc3BvbnNlKGNocm9tZVN0YXRzUmVzcG9uc2UpKTtcbiAgICAgIH07XG4gICAgICAvLyBDaHJvbWUgYWxzbyB0YWtlcyBpdHMgYXJndW1lbnRzIGluIHRoZSB3cm9uZyBvcmRlci5cbiAgICAgIGJvdW5kR2V0U3RhdHMoc3VjY2Vzc0NhbGxiYWNrV3JhcHBlciwgZmFpbHVyZUNhbGxiYWNrLCBzZWxlY3Rvcik7XG4gICAgfTtcbiAgICByZXR1cm4gcGM7XG4gIH07XG59XG5cbi8vIFVuaWZ5IFNlc3Npb25EZXNjcnB0aW9uIE9iamVjdC5cbmlmICh0eXBlb2YgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICBteVJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcbn0gZWxzZSBpZiAodHlwZW9mIG1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgbXlSVENTZXNzaW9uRGVzY3JpcHRpb24gPSBtb3pSVENTZXNzaW9uRGVzY3JpcHRpb247XG59XG5cbi8vIFVuaWZ5IEljZUNhbmRpZGF0ZSBPYmplY3QuXG5pZiAodHlwZW9mIFJUQ0ljZUNhbmRpZGF0ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgbXlSVENJY2VDYW5kaWRhdGUgPSBSVENJY2VDYW5kaWRhdGU7XG59IGVsc2UgaWYgKHR5cGVvZiBtb3pSVENJY2VDYW5kaWRhdGUgIT09ICd1bmRlZmluZWQnKSB7XG4gIG15UlRDSWNlQ2FuZGlkYXRlID0gbW96UlRDSWNlQ2FuZGlkYXRlO1xufVxuXG5leHBvcnRzLlJUQ1BlZXJDb25uZWN0aW9uID0gbXlSVENQZWVyQ29ubmVjdGlvbjtcbmV4cG9ydHMuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gbXlSVENTZXNzaW9uRGVzY3JpcHRpb247XG5leHBvcnRzLlJUQ0ljZUNhbmRpZGF0ZSA9IG15UlRDSWNlQ2FuZGlkYXRlO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qZ2xvYmFscyBwcm9jZXNzLCBjb25zb2xlICovXG4vKmpzbGludCBpbmRlbnQ6MixzbG9wcHk6dHJ1ZSwgbm9kZTp0cnVlICovXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uLy4uL3NyYy91dGlsJyk7XG5cbi8qKlxuICogQSBmcmVlZG9tLmpzIGxvZ2dpbmcgcHJvdmlkZXIgdGhhdCBsb2dzIHRvIGNocm9tZSwgZmlyZWZveCwgYW5kIG5vZGUgY29uc29sZXMuXG4gKiBAQ2xhc3MgTG9nZ2VyX2NvbnNvbGVcbiAqIEBjb25zdHJ1Y3RvclxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXBwfSBhcHAgVGhlIGFwcGxpY2F0aW9uIGNyZWF0aW5nIHRoaXMgcHJvdmlkZXIsIGluIHByYWN0aWNlIHVuc2V0LlxuICovXG52YXIgTG9nZ2VyX2NvbnNvbGUgPSBmdW5jdGlvbiAoYXBwKSB7XG4gIHRoaXMubGV2ZWwgPSAoYXBwLmNvbmZpZyAmJiBhcHAuY29uZmlnLmRlYnVnKSB8fCAnbG9nJztcbiAgdGhpcy5jb25zb2xlID0gKGFwcC5jb25maWcgJiYgYXBwLmNvbmZpZy5nbG9iYWwuY29uc29sZSk7XG4gIHV0aWwuaGFuZGxlRXZlbnRzKHRoaXMpO1xufTtcblxuXG4vKipcbiAqIExvZ2dpbmcgbGV2ZWxzLCBmb3IgZmlsdGVyaW5nIG91dHB1dC5cbiAqIEBwcml2YXRlXG4gKiBAc3RhdGljXG4gKi9cbkxvZ2dlcl9jb25zb2xlLmxldmVsID0ge1xuICBcImRlYnVnXCI6IDAsXG4gIFwiaW5mb1wiOiAxLFxuICBcImxvZ1wiOiAyLFxuICBcIndhcm5cIjogMyxcbiAgXCJlcnJvclwiOiA0XG59O1xuXG4vKipcbiAqIFByaW50IGEgbWVzc2FnZSB3aXRoIGFwcHJvcHJpYXRlIGZvcm1hdHRpbmcuXG4gKiBAbWV0aG9kIHByaW50XG4gKi9cbkxvZ2dlcl9jb25zb2xlLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uIChzZXZlcml0eSwgc291cmNlLCBtc2cpIHtcbiAgdmFyIGFyciA9IG1zZztcbiAgaWYgKHR5cGVvZiB0aGlzLmNvbnNvbGUgPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICB0aGlzLmNvbnNvbGUuZnJlZWRvbSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodHlwZW9mIGFyciA9PT0gJ3N0cmluZycpIHtcbiAgICBhcnIgPSBbYXJyXTtcbiAgfVxuICBcbiAgaWYgKExvZ2dlcl9jb25zb2xlLmxldmVsW3RoaXMubGV2ZWxdICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIExvZ2dlcl9jb25zb2xlLmxldmVsW3NldmVyaXR5XSA8IExvZ2dlcl9jb25zb2xlLmxldmVsW3RoaXMubGV2ZWxdKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIFxuICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScgJiYgc291cmNlKSB7XG4gICAgYXJyLnVuc2hpZnQoJ1xceDFCWzM5bScpO1xuICAgIGFyci51bnNoaWZ0KCdcXHgxQlszMW0nICsgc291cmNlKTtcbiAgICAvKmpzbGludCBub21lbjogdHJ1ZSovXG4gIH0gZWxzZSBpZiAodGhpcy5jb25zb2xlLl9fbW96aWxsYUNvbnNvbGVfXyAmJiBzb3VyY2UpIHtcbiAgICBhcnIudW5zaGlmdChzb3VyY2UudG9VcHBlckNhc2UoKSk7XG4gICAgLypqc2xpbnQgbm9tZW46IGZhbHNlKi9cbiAgfSBlbHNlIGlmIChzb3VyY2UpIHtcbiAgICBhcnIudW5zaGlmdCgnY29sb3I6IHJlZCcpO1xuICAgIGFyci51bnNoaWZ0KCclYyAnICsgc291cmNlKTtcbiAgfVxuICBpZiAoIXRoaXMuY29uc29sZVtzZXZlcml0eV0gJiYgdGhpcy5jb25zb2xlLmxvZykge1xuICAgIHNldmVyaXR5ID0gJ2xvZyc7XG4gIH1cbiAgdGhpcy5jb25zb2xlW3NldmVyaXR5XS5hcHBseSh0aGlzLmNvbnNvbGUsIGFycik7XG59O1xuXG4vKipcbiAqIExvZyBhIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIFRoZSBzb3VyY2Ugb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIFRoZSBtZXNzYWdlIHRvIGxvZy5cbiAqIEBtZXRob2QgbG9nXG4gKi9cbkxvZ2dlcl9jb25zb2xlLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbiAoc291cmNlLCBtc2csIGNvbnRpbnVhdGlvbikge1xuICB0aGlzLnByaW50KCdsb2cnLCBzb3VyY2UsIG1zZyk7XG4gIGNvbnRpbnVhdGlvbigpO1xufTtcblxuLyoqXG4gKiBMb2cgYSBtZXNzYWdlIHRvIHRoZSBjb25zb2xlIHdpdGggZGVidWcgcHJpb3JpdHkuXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIFRoZSBzb3VyY2Ugb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIFRoZSBtZXNzYWdlIHRvIGxvZy5cbiAqIEBtZXRob2QgbG9nXG4gKi9cbkxvZ2dlcl9jb25zb2xlLnByb3RvdHlwZS5kZWJ1ZyA9IGZ1bmN0aW9uIChzb3VyY2UsIG1zZywgY29udGludWF0aW9uKSB7XG4gIHRoaXMucHJpbnQoJ2RlYnVnJywgc291cmNlLCBtc2cpO1xuICBjb250aW51YXRpb24oKTtcbn07XG5cbi8qKlxuICogTG9nIGEgbWVzc2FnZSB0byB0aGUgY29uc29sZSB3aXRoIGluZm8gcHJpb3JpdHkuXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIFRoZSBzb3VyY2Ugb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIFRoZSBtZXNzYWdlIHRvIGxvZy5cbiAqIEBtZXRob2QgbG9nXG4gKi9cbkxvZ2dlcl9jb25zb2xlLnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24gKHNvdXJjZSwgbXNnLCBjb250aW51YXRpb24pIHtcbiAgdGhpcy5wcmludCgnaW5mbycsIHNvdXJjZSwgbXNnKTtcbiAgY29udGludWF0aW9uKCk7XG59O1xuXG4vKipcbiAqIExvZyBhIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgd2l0aCB3YXJuIHByaW9yaXR5LlxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSBUaGUgc291cmNlIG9mIHRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyBUaGUgbWVzc2FnZSB0byBsb2cuXG4gKiBAbWV0aG9kIGxvZ1xuICovXG5Mb2dnZXJfY29uc29sZS5wcm90b3R5cGUud2FybiA9IGZ1bmN0aW9uIChzb3VyY2UsIG1zZywgY29udGludWF0aW9uKSB7XG4gIHRoaXMucHJpbnQoJ3dhcm4nLCBzb3VyY2UsIG1zZyk7XG4gIGNvbnRpbnVhdGlvbigpO1xufTtcblxuLyoqXG4gKiBMb2cgYSBtZXNzYWdlIHRvIHRoZSBjb25zb2xlIHdpdGggZXJyb3IgcHJpb3JpdHkuXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIFRoZSBzb3VyY2Ugb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIFRoZSBtZXNzYWdlIHRvIGxvZy5cbiAqIEBtZXRob2QgbG9nXG4gKi9cbkxvZ2dlcl9jb25zb2xlLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChzb3VyY2UsIG1zZywgY29udGludWF0aW9uKSB7XG4gIHRoaXMucHJpbnQoJ2Vycm9yJywgc291cmNlLCBtc2cpO1xuICBjb250aW51YXRpb24oKTtcbn07XG5cbi8qKiBSRUdJU1RFUiBQUk9WSURFUiAqKi9cbmV4cG9ydHMucHJvdmlkZXIgPSBMb2dnZXJfY29uc29sZTtcbmV4cG9ydHMubmFtZSA9ICdjb3JlLmNvbnNvbGUnO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIvKmdsb2JhbHMgY29uc29sZSAqL1xuLypqc2xpbnQgaW5kZW50OjIsd2hpdGU6dHJ1ZSxzbG9wcHk6dHJ1ZSxub2RlOnRydWUgKi9cblxuLyoqXG4gKiBBbiBvQXV0aCBtZXRhLXByb3ZpZGVyIGFsbG93aW5nIG11bHRpcGxlIHBsYXRmb3JtLWRlcGVuZGFudFxuICogb0F1dGggaW1wbGVtZW50YXRpb25zIHRvIHNlcnZlIGFzIHRoZSByZWRpcmVjdFVSTCBmb3IgYW4gb0F1dGggZmxvdy5cbiAqIFRoZSBjb3JlIGltcGxlbWVudGF0aW9ucyBhcmUgcHJvdmlkZWQgaW4gcHJvdmlkZXJzL29hdXRoLCBhbmQgYXJlXG4gKiBzdXBwbGVtZW50ZWQgaW4gcGxhdGZvcm0tZGVwZW5kZW50IHJlcG9zaXRvcmllcy5cbiAqXG4gKi9cbnZhciBPQXV0aCA9IGZ1bmN0aW9uIChoYW5kbGVycywgbW9kLCBkaXNwYXRjaEV2ZW50KSB7XG4gIHRoaXMuaGFuZGxlcnMgPSBoYW5kbGVycztcbiAgdGhpcy5tb2QgPSBtb2Q7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudCA9IGRpc3BhdGNoRXZlbnQ7XG4gIHRoaXMub25nb2luZyA9IHt9O1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBvQXV0aCBoYW5kbGVycy5cbiAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgYmVmb3JlIHByb3ZpZGVyIGlzIHVzZWQsIGFuZCBiaW5kcyB0aGUgY3VycmVudFxuICogb0F1dGggcHJvdmlkZXIgdG8gYmUgYXNzb2NpYXRlZCB3aXRoIHJlZ2lzdGVyZWQgaGFuZGxlcnMuIFRoaXMgaXMgdXNlZCBzb1xuICogdGhhdCBoYW5kbGVycyB3aGljaCBhcmUgcmVnaXN0ZXJlZCBieSB0aGUgdXNlciBhcHBseSBvbmx5IHRoZSB0aGUgZnJlZWRvbSgpXG4gKiBzZXR1cCBjYWxsIHRoZXkgYXJlIGFzc29jaWF0ZWQgd2l0aCwgd2hpbGUgc3RpbGwgYmVpbmcgcmVnaXN0ZXJlZCBhY3Jvc3NcbiAqIG11bHRpcGxlIGluc3RhbmNlcyBvZiBPQXV0aCBwcm92aWRlcnMuXG4gKlxuICogQG1ldGhvZCByZWdpc3RlclxuICogQHBhcmFtIHtbY29uc3RydWN0b3JdfSBoYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuT0F1dGgucmVnaXN0ZXIgPSBmdW5jdGlvbiAoaGFuZGxlcnMpIHtcbiAgdmFyIGksXG4gICAgICBib3VuZEhhbmRsZXJzID0gW107XG4gIGlmICghaGFuZGxlcnMgfHwgIWhhbmRsZXJzLmxlbmd0aCkge1xuICAgIHJldHVybiBPQXV0aC5yZXNldCgpO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgYm91bmRIYW5kbGVycy5wdXNoKG5ldyBoYW5kbGVyc1tpXSgpKTtcbiAgfVxuICBleHBvcnRzLnByb3ZpZGVyID0gT0F1dGguYmluZCh0aGlzLCBib3VuZEhhbmRsZXJzKTtcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIG9BdXRoIHByb3ZpZGVyIHJlZ2lzdHJhdGlvbnMuXG4gKiBAbWV0aG9kIHJlc2V0XG4gKiBAcHJpdmF0ZVxuICovXG5PQXV0aC5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgZXhwb3J0cy5wcm92aWRlciA9IE9BdXRoLmJpbmQodGhpcywgW10pO1xufTtcblxuLyoqXG4gKiBJbmRpY2F0ZSB0aGUgaW50ZW50aW9uIHRvIGluaXRpYXRlIGFuIG9BdXRoIGZsb3csIGFsbG93aW5nIGFuIGFwcHJvcHJpYXRlXG4gKiBvQXV0aCBwcm92aWRlciB0byBiZWdpbiBtb25pdG9yaW5nIGZvciByZWRpcmVjdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGluaXRpYXRlT0F1dGhcbiAqIEBwYXJhbSB7c3RyaW5nW119IHJlZGlyZWN0VVJJcyAtIG9BdXRoIHJlZGlyZWN0aW9uIFVSSXMgcmVnaXN0ZXJlZCB3aXRoIHRoZVxuICogICAgIHByb3ZpZGVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29udGludWF0aW9uIC0gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIGNvbXBsZXRlXG4gKiAgICBFeHBlY3RlZCB0byBzZWUgYSB2YWx1ZSBvZiBzY2hlbWE6IHt7cmVkaXJlY3Q6U3RyaW5nLCBzdGF0ZTpTdHJpbmd9fVxuICogICAgd2hlcmUgJ3JlZGlyZWN0JyBpcyB0aGUgY2hvc2VuIHJlZGlyZWN0IFVSSVxuICogICAgYW5kICdzdGF0ZScgaXMgdGhlIHN0YXRlIHRvIHBhc3MgdG8gdGhlIFVSSSBvbiBjb21wbGV0aW9uIG9mIG9BdXRoXG4gKi9cbk9BdXRoLnByb3RvdHlwZS5pbml0aWF0ZU9BdXRoID0gZnVuY3Rpb24gKHJlZGlyZWN0VVJJcywgY29udGludWF0aW9uKSB7XG4gIHZhciBwcm9taXNlLCBpO1xuICB2YXIgc3VjY2Vzc0NhbGxiYWNrID0gZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgdGhpcy5vbmdvaW5nW3Jlc3VsdC5zdGF0ZV0gPSB0aGlzLmhhbmRsZXJzW2ldO1xuICAgIGNvbnRpbnVhdGlvbihyZXN1bHQpO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHRoaXMuaGFuZGxlcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAodGhpcy5oYW5kbGVyc1tpXS5pbml0aWF0ZU9BdXRoKHJlZGlyZWN0VVJJcywgc3VjY2Vzc0NhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICAvL0lmIGhlcmUsIHdlIGhhdmUgbm8gY29tcGF0aWJsZSBwcm92aWRlcnNcbiAgY29udGludWF0aW9uKG51bGwsIHtcbiAgICAnZXJyY29kZSc6ICdVTktOT1dOJyxcbiAgICAnbWVzc2FnZSc6ICdObyByZXF1ZXN0ZWQgcmVkaXJlY3RzIGNhbiBiZSBoYW5kbGVkLidcbiAgfSk7XG4gIHJldHVybjtcbn07XG5cbi8qKlxuICogb0F1dGggY2xpZW50LXNpZGUgZmxvdyAtIGxhdW5jaCB0aGUgcHJvdmlkZWQgVVJMXG4gKiBUaGlzIG11c3QgYmUgY2FsbGVkIGFmdGVyIGluaXRpYXRlT0F1dGggd2l0aCB0aGUgcmV0dXJuZWQgc3RhdGUgb2JqZWN0XG4gKlxuICogQG1ldGhvZCBsYXVuY2hBdXRoRmxvd1xuICogQHBhcmFtIHtTdHJpbmd9IGF1dGhVcmwgLSBUaGUgVVJMIHRoYXQgaW5pdGlhdGVzIHRoZSBhdXRoIGZsb3cuXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBzdGF0ZU9iaiAtIFRoZSByZXR1cm4gdmFsdWUgZnJvbSBpbml0aWF0ZU9BdXRoXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb250aW51YXRpb24gLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gY29tcGxldGVcbiAqICAgIEV4cGVjdGVkIHRvIHNlZSBhIFN0cmluZyB2YWx1ZSB0aGF0IGlzIHRoZSByZXNwb25zZSBVcmwgY29udGFpbmluZyB0aGUgYWNjZXNzIHRva2VuXG4gKi9cbk9BdXRoLnByb3RvdHlwZS5sYXVuY2hBdXRoRmxvdyA9IGZ1bmN0aW9uKGF1dGhVcmwsIHN0YXRlT2JqLCBjb250aW51YXRpb24pIHtcbiAgaWYgKCF0aGlzLm9uZ29pbmcuaGFzT3duUHJvcGVydHkoc3RhdGVPYmouc3RhdGUpKSB7XG4gICAgY29udGludWF0aW9uKHVuZGVmaW5lZCwge1xuICAgICAgJ2VycmNvZGUnOiAnVU5LTk9XTicsXG4gICAgICAnbWVzc2FnZSc6ICdZb3UgbXVzdCBiZWdpbiB0aGUgb0F1dGggZmxvdyB3aXRoIGluaXRpYXRlT0F1dGggZmlyc3QnXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5vbmdvaW5nW3N0YXRlT2JqLnN0YXRlXS5sYXVuY2hBdXRoRmxvdyhhdXRoVXJsLCBzdGF0ZU9iaiwgY29udGludWF0aW9uKTtcbiAgZGVsZXRlIHRoaXMub25nb2luZ1tzdGF0ZU9iai5zdGF0ZV07XG59O1xuXG5leHBvcnRzLnJlZ2lzdGVyID0gT0F1dGgucmVnaXN0ZXI7XG5leHBvcnRzLnJlc2V0ID0gT0F1dGgucmVzZXQ7XG5leHBvcnRzLnByb3ZpZGVyID0gT0F1dGguYmluZCh0aGlzLCBbXSk7XG5leHBvcnRzLm5hbWUgPSAnY29yZS5vYXV0aCc7XG4iLCIvKmpzbGludCBpbmRlbnQ6MixzbG9wcHk6dHJ1ZSwgbm9kZTp0cnVlICovXG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vLi4vc3JjL3V0aWwnKTtcblxudmFyIHVuQXR0YWNoZWRDaGFubmVscyA9IHt9O1xudmFyIGFsbG9jYXRlQ2hhbm5lbCA9IGZ1bmN0aW9uIChkYXRhQ2hhbm5lbCkge1xuICB2YXIgaWQgPSB1dGlsLmdldElkKCk7XG4gIHVuQXR0YWNoZWRDaGFubmVsc1tpZF0gPSBkYXRhQ2hhbm5lbDtcbiAgcmV0dXJuIGlkO1xufTtcblxudmFyIFJUQ0RhdGFDaGFubmVsQWRhcHRlciA9IGZ1bmN0aW9uIChhcHAsIGRpc3BhdGNoRXZlbnRzLCBpZCkge1xuICB0aGlzLmRpc3BhdGNoRXZlbnQgPSBkaXNwYXRjaEV2ZW50cztcbiAgaWYgKCF1bkF0dGFjaGVkQ2hhbm5lbHNbaWRdKSB7XG4gICAgY29uc29sZS53YXJuKCdJbnZhbGlkIElELCBjcmVhdGluZyBhY3Rpbmcgb24gdW5hdHRhY2hlZCBEYXRhQ2hhbm5lbCcpO1xuICAgIHZhciBDb25uZWN0aW9uID0gcmVxdWlyZSgnLi9jb3JlLnJ0Y3BlZXJjb25uZWN0aW9uJykucHJvdmlkZXIsXG4gICAgICBwcm92aWRlciA9IG5ldyBDb25uZWN0aW9uKCk7XG4gICAgaWQgPSBwcm92aWRlci5jcmVhdGVEYXRhQ2hhbm5lbCgpO1xuICAgIHByb3ZpZGVyLmNsb3NlKCk7XG4gIH1cblxuICB0aGlzLmNoYW5uZWwgPSB1bkF0dGFjaGVkQ2hhbm5lbHNbaWRdO1xuICBkZWxldGUgdW5BdHRhY2hlZENoYW5uZWxzW2lkXTtcblxuICB0aGlzLmV2ZW50cyA9IFtcbiAgICAnb25vcGVuJyxcbiAgICAnb25lcnJvcicsXG4gICAgJ29uY2xvc2UnLFxuICAgICdvbm1lc3NhZ2UnXG4gIF07XG4gIHRoaXMubWFuYWdlRXZlbnRzKHRydWUpO1xufTtcblxuLy8gQXR0YWNoIG9yIGRldGFjaCBsaXN0ZW5lcnMgZm9yIGV2ZW50cyBhZ2FpbnN0IHRoZSBjb25uZWN0aW9uLlxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5tYW5hZ2VFdmVudHMgPSBmdW5jdGlvbiAoYXR0YWNoKSB7XG4gIHRoaXMuZXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKGF0dGFjaCkge1xuICAgICAgdGhpc1tldmVudF0gPSB0aGlzW2V2ZW50XS5iaW5kKHRoaXMpO1xuICAgICAgdGhpcy5jaGFubmVsW2V2ZW50XSA9IHRoaXNbZXZlbnRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgdGhpcy5jaGFubmVsW2V2ZW50XTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLmdldExhYmVsID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHRoaXMuY2hhbm5lbC5sYWJlbCk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLmdldE9yZGVyZWQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodGhpcy5jaGFubmVsLm9yZGVyZWQpO1xufTtcblxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5nZXRNYXhQYWNrZXRMaWZlVGltZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBjYWxsYmFjayh0aGlzLmNoYW5uZWwubWF4UGFja2V0TGlmZVRpbWUpO1xufTtcblxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5nZXRNYXhSZXRyYW5zbWl0cyA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBjYWxsYmFjayh0aGlzLmNoYW5uZWwubWF4UmV0cmFuc21pdHMpO1xufTtcblxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5nZXRQcm90b2NvbCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBjYWxsYmFjayh0aGlzLmNoYW5uZWwucHJvdG9jb2wpO1xufTtcblxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5nZXROZWdvdGlhdGVkID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHRoaXMuY2hhbm5lbC5uZWdvdGlhdGVkKTtcbn07XG5cblJUQ0RhdGFDaGFubmVsQWRhcHRlci5wcm90b3R5cGUuZ2V0SWQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodGhpcy5jaGFubmVsLmlkKTtcbn07XG5cblJUQ0RhdGFDaGFubmVsQWRhcHRlci5wcm90b3R5cGUuZ2V0UmVhZHlTdGF0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBjYWxsYmFjayh0aGlzLmNoYW5uZWwucmVhZHlTdGF0ZSk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLmdldEJ1ZmZlcmVkQW1vdW50ID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHRoaXMuY2hhbm5lbC5idWZmZXJlZEFtb3VudCk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLmdldEJpbmFyeVR5cGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodGhpcy5jaGFubmVsLmJpbmFyeVR5cGUpO1xufTtcblJUQ0RhdGFDaGFubmVsQWRhcHRlci5wcm90b3R5cGUuc2V0QmluYXJ5VHlwZSA9IGZ1bmN0aW9uIChiaW5hcnlUeXBlLCBjYWxsYmFjaykge1xuICB0aGlzLmNoYW5uZWwuYmluYXJ5VHlwZSA9IGJpbmFyeVR5cGU7XG4gIGNhbGxiYWNrKCk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAodGV4dCwgY2FsbGJhY2spIHtcbiAgdGhpcy5jaGFubmVsLnNlbmQodGV4dCk7XG4gIGNhbGxiYWNrKCk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLnNlbmRCdWZmZXIgPSBmdW5jdGlvbiAoYnVmZmVyLCBjYWxsYmFjaykge1xuICB0aGlzLmNoYW5uZWwuc2VuZChidWZmZXIpO1xuICBjYWxsYmFjaygpO1xufTtcblxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBpZiAoIXRoaXMuY2hhbm5lbCkge1xuICAgIHJldHVybiBjYWxsYmFjaygpO1xuICB9XG4gIHRoaXMubWFuYWdlRXZlbnRzKGZhbHNlKTtcbiAgdGhpcy5jaGFubmVsLmNsb3NlKCk7XG4gIGNhbGxiYWNrKCk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLm9ub3BlbiA9IGZ1bmN0aW9uIChldmVudCkge1xuICB0aGlzLmRpc3BhdGNoRXZlbnQoJ29ub3BlbicsIGV2ZW50Lm1lc3NhZ2UpO1xufTtcblxuUlRDRGF0YUNoYW5uZWxBZGFwdGVyLnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudCgnb25lcnJvcicsIHtcbiAgICBlcnJjb2RlOiBldmVudC50eXBlLFxuICAgIG1lc3NhZ2U6IGV2ZW50Lm1lc3NhZ2VcbiAgfSk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLm9uY2xvc2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbmNsb3NlJywgZXZlbnQubWVzc2FnZSk7XG59O1xuXG5SVENEYXRhQ2hhbm5lbEFkYXB0ZXIucHJvdG90eXBlLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICBpZiAodHlwZW9mIGV2ZW50LmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbm1lc3NhZ2UnLCB7dGV4dDogZXZlbnQuZGF0YX0pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnb25tZXNzYWdlJywge2J1ZmZlcjogZXZlbnQuZGF0YX0pO1xuICB9XG59O1xuXG5leHBvcnRzLm5hbWUgPSBcImNvcmUucnRjZGF0YWNoYW5uZWxcIjtcbmV4cG9ydHMucHJvdmlkZXIgPSBSVENEYXRhQ2hhbm5lbEFkYXB0ZXI7XG5leHBvcnRzLmFsbG9jYXRlID0gYWxsb2NhdGVDaGFubmVsO1xuIiwiLypqc2xpbnQgaW5kZW50OjIsc2xvcHB5OnRydWUsIG5vZGU6dHJ1ZSAqL1xuXG52YXIgYWRhcHRlciA9IHJlcXVpcmUoJ3dlYnJ0Yy1hZGFwdGVyJyk7XG52YXIgUlRDUGVlckNvbm5lY3Rpb24gPSBhZGFwdGVyLlJUQ1BlZXJDb25uZWN0aW9uO1xudmFyIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IGFkYXB0ZXIuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uO1xudmFyIFJUQ0ljZUNhbmRpZGF0ZSA9IGFkYXB0ZXIuUlRDSWNlQ2FuZGlkYXRlO1xuXG52YXIgRGF0YUNoYW5uZWwgPSByZXF1aXJlKCcuL2NvcmUucnRjZGF0YWNoYW5uZWwnKTtcblxudmFyIFJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlciA9IGZ1bmN0aW9uIChhcHAsIGRpc3BhdGNoRXZlbnQsIGNvbmZpZ3VyYXRpb24pIHtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50ID0gZGlzcGF0Y2hFdmVudDtcbiAgdGhpcy5jb25uZWN0aW9uID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGNvbmZpZ3VyYXRpb24pO1xuXG4gIHRoaXMuZXZlbnRzID0gW1xuICAgICdvbmRhdGFjaGFubmVsJyxcbiAgICAnb25uZWdvdGlhdGlvbm5lZWRlZCcsXG4gICAgJ29uaWNlY2FuZGlkYXRlJyxcbiAgICAnb25zaWduYWxpbmdzdGF0ZWNoYW5nZScsXG4gICAgJ29uYWRkc3RyZWFtJyxcbiAgICAnb25yZW1vdmVzdHJlYW0nLFxuICAgICdvbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSdcbiAgXTtcbiAgdGhpcy5tYW5hZ2VFdmVudHModHJ1ZSk7XG59O1xuXG4vLyBBdHRhY2ggb3IgZGV0YWNoIGxpc3RlbmVycyBmb3IgZXZlbnRzIGFnYWluc3QgdGhlIGNvbm5lY3Rpb24uXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLm1hbmFnZUV2ZW50cyA9IGZ1bmN0aW9uIChhdHRhY2gpIHtcbiAgdGhpcy5ldmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoYXR0YWNoKSB7XG4gICAgICB0aGlzW2V2ZW50XSA9IHRoaXNbZXZlbnRdLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLmNvbm5lY3Rpb25bZXZlbnRdID0gdGhpc1tldmVudF07XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbm5lY3Rpb24pIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmNvbm5lY3Rpb25bZXZlbnRdO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiAoY29uc3RyYWludHMsIGNhbGxiYWNrKSB7XG4gIHRoaXMuY29ubmVjdGlvbi5jcmVhdGVPZmZlcihjYWxsYmFjaywgY2FsbGJhY2suYmluZCh7fSwgdW5kZWZpbmVkKSwgY29uc3RyYWludHMpO1xufTtcblxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5jcmVhdGVBbnN3ZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgdGhpcy5jb25uZWN0aW9uLmNyZWF0ZUFuc3dlcihjYWxsYmFjaywgY2FsbGJhY2suYmluZCh7fSwgdW5kZWZpbmVkKSk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLnNldExvY2FsRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoZGVzY3JpcHRpb24sIGNhbGxiYWNrKSB7XG4gIHRoaXMuY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oZGVzY3JpcHRpb24pLFxuICAgIGNhbGxiYWNrLFxuICAgIGNhbGxiYWNrLmJpbmQoe30sIHVuZGVmaW5lZCkpO1xufTtcblxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5nZXRMb2NhbERlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHRoaXMuY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoZGVzY3JpcHRpb24sIGNhbGxiYWNrKSB7XG4gIHRoaXMuY29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGRlc2NyaXB0aW9uKSxcbiAgICBjYWxsYmFjayxcbiAgICBjYWxsYmFjay5iaW5kKHt9LCB1bmRlZmluZWQpKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuZ2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodGhpcy5jb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuZ2V0U2lnbmFsaW5nU3RhdGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodGhpcy5jb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUudXBkYXRlSWNlID0gZnVuY3Rpb24gKGNvbmZpZ3VyYXRpb24sIGNhbGxiYWNrKSB7XG4gIHRoaXMuY29ubmVjdGlvbi51cGRhdGVJY2UoY29uZmlndXJhdGlvbik7XG4gIGNhbGxiYWNrKCk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChjYW5kaWRhdGUsIGNhbGxiYWNrKSB7XG4gIHRoaXMuY29ubmVjdGlvbi5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZShjYW5kaWRhdGUpLFxuICAgIGNhbGxiYWNrLFxuICAgIGNhbGxiYWNrLmJpbmQoe30sIHVuZGVmaW5lZCkpO1xufTtcblxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5nZXRJY2VHYXRoZXJpbmdTdGF0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBjYWxsYmFjayh0aGlzLmNvbm5lY3Rpb24uaWNlR2F0aGVyaW5nU3RhdGUpO1xufTtcblxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5nZXRJY2VDb25uZWN0aW9uU3RhdGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodGhpcy5jb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLmdldENvbmZpZ3VyYXRpb24gPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgdmFyIGNvbmZpZ3VyYXRpb24gPSB0aGlzLmNvbm5lY3Rpb24uZ2V0Q29uZmlndXJhdGlvbigpO1xuICBjYWxsYmFjayhjb25maWd1cmF0aW9uKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuZ2V0TG9jYWxTdHJlYW1zID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHVuZGVmaW5lZCwge1xuICAgIGVycmNvZGU6IC0xLFxuICAgIG1lc3NhZ2U6IFwiTm90IEltcGxlbWVudGVkXCJcbiAgfSk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLmdldFJlbW90ZVN0cmVhbXMgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodW5kZWZpbmVkLCB7XG4gICAgZXJyY29kZTogLTEsXG4gICAgbWVzc2FnZTogXCJOb3QgSW1wbGVtZW50ZWRcIlxuICB9KTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuZ2V0U3RyZWFtQnlJZCA9IGZ1bmN0aW9uIChpZCwgY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sodW5kZWZpbmVkLCB7XG4gICAgZXJyY29kZTogLTEsXG4gICAgbWVzc2FnZTogXCJOb3QgSW1wbGVtZW50ZWRcIlxuICB9KTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24gKGlkLCBjYWxsYmFjaykge1xuICBjYWxsYmFjayh1bmRlZmluZWQsIHtcbiAgICBlcnJjb2RlOiAtMSxcbiAgICBtZXNzYWdlOiBcIk5vdCBJbXBsZW1lbnRlZFwiXG4gIH0pO1xufTtcblxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiAoaWQsIGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHVuZGVmaW5lZCwge1xuICAgIGVycmNvZGU6IC0xLFxuICAgIG1lc3NhZ2U6IFwiTm90IEltcGxlbWVudGVkXCJcbiAgfSk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGlmICghdGhpcy5jb25uZWN0aW9uKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gIH1cbiAgdGhpcy5tYW5hZ2VFdmVudHMoZmFsc2UpO1xuICB0cnkge1xuICAgIHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIHtcbiAgICAgIGVycmNvZGU6IGUubmFtZSxcbiAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZVxuICAgIH0pO1xuICB9XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLmNyZWF0ZURhdGFDaGFubmVsID0gZnVuY3Rpb24gKGxhYmVsLCBkYXRhQ2hhbm5lbERpY3QsIGNhbGxiYWNrKSB7XG4gIHZhciBpZCA9IERhdGFDaGFubmVsLmFsbG9jYXRlKHRoaXMuY29ubmVjdGlvbi5jcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgZGF0YUNoYW5uZWxEaWN0KSk7XG4gIGNhbGxiYWNrKGlkKTtcbn07XG5cblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gIHRoaXMuY29ubmVjdGlvbi5nZXRTdGF0cyhzZWxlY3RvciwgY2FsbGJhY2ssIGNhbGxiYWNrLmJpbmQodGhpcywgdW5kZWZpbmVkKSk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgdmFyIGlkID0gRGF0YUNoYW5uZWwuYWxsb2NhdGUoZXZlbnQuY2hhbm5lbCk7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudCgnb25kYXRhY2hhbm5lbCcsIHtjaGFubmVsOiBpZH0pO1xufTtcblxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIGNvbnNvbGUud2Fybignb24gbmVnb3RpYXRpb24gZWVkZWQnKTtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbm5lZ290aWF0aW9ubmVlZGVkJywgZXZlbnQubWVzc2FnZSk7XG59O1xuXG5SVENQZWVyQ29ubmVjdGlvbkFkYXB0ZXIucHJvdG90eXBlLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHZhciBtc2c7XG4gIGlmIChldmVudC5jYW5kaWRhdGUgJiYgZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSkge1xuICAgIG1zZyA9IHtcbiAgICAgIGNhbmRpZGF0ZToge1xuICAgICAgICBjYW5kaWRhdGU6IGV2ZW50LmNhbmRpZGF0ZS5jYW5kaWRhdGUsXG4gICAgICAgIHNkcE1pZDogZXZlbnQuY2FuZGlkYXRlLnNkcE1pZCxcbiAgICAgICAgc2RwTUxpbmVJbmRleDogZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXhcbiAgICAgIH1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG1zZyA9IHtcbiAgICAgIGNhbmRpZGF0ZTogbnVsbFxuICAgIH07XG4gIH1cbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbmljZWNhbmRpZGF0ZScsIG1zZyk7XG59O1xuICBcblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUub25zaWduYWxpbmdzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICB0aGlzLmRpc3BhdGNoRXZlbnQoJ29uc2lnbmFsaW5nc3RhdGVjaGFuZ2UnLCBldmVudC5tZXNzYWdlKTtcbn07XG4gIFxuUlRDUGVlckNvbm5lY3Rpb25BZGFwdGVyLnByb3RvdHlwZS5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAvL1RPRE86IHByb3ZpZGUgSUQgb2YgYWxsb2NhdGVkIHN0cmVhbS5cbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbmFkZHN0cmVhbScsIGV2ZW50LnN0cmVhbSk7XG59O1xuICBcblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUub25yZW1vdmVzdHJlYW0gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgLy9UT0RPOiBwcm92aWRlIElEIG9mIGRlYWxsb2NhdGVkIHN0cmVhbS5cbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbnJlbW92ZXN0cmVhbScsIGV2ZW50LnN0cmVhbSk7XG59O1xuICBcblJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlci5wcm90b3R5cGUub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsIGV2ZW50Lm1lc3NhZ2UpO1xufTtcbiAgXG5cbmV4cG9ydHMubmFtZSA9IFwiY29yZS5ydGNwZWVyY29ubmVjdGlvblwiO1xuZXhwb3J0cy5wcm92aWRlciA9IFJUQ1BlZXJDb25uZWN0aW9uQWRhcHRlcjtcbiIsIi8qanNsaW50IGluZGVudDoyLHdoaXRlOnRydWUsc2xvcHB5OnRydWUsbm9kZTp0cnVlICovXG52YXIgRXZlbnRJbnRlcmZhY2UgPSByZXF1aXJlKCcuLi8uLi9zcmMvcHJveHkvZXZlbnRJbnRlcmZhY2UnKTtcbnZhciBDb25zdW1lciA9IHJlcXVpcmUoJy4uLy4uL3NyYy9jb25zdW1lcicpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuLi8uLi9zcmMvdXRpbCcpO1xuXG4vKipcbiAqIENvcmUgZnJlZWRvbSBzZXJ2aWNlcyBhdmFpbGFibGUgdG8gYWxsIG1vZHVsZXMuXG4gKiBDcmVhdGVkIGJ5IHRoZSBlbnZpcm9ubWVudCBoZWxwZXIgaW4gcmVzcG9uc2UgdG8gYSAnY29yZScgcmVxdWVzdC5cbiAqIEBDbGFzcyBDb3JlX3VucHJpdmlsZWdlZFxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge01hbmFnZXJ9IG1hbmFnZXIgVGhlIG1hbmFnZXIgdGhpcyBjb3JlIGlzIGNvbm5lY3RlZCB3aXRoLlxuICogQHByaXZhdGVcbiAqL1xudmFyIENvcmVfdW5wcml2aWxlZ2VkID0gZnVuY3Rpb24obWFuYWdlciwgcG9zdE1lc3NhZ2UpIHtcbiAgdGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcbiAgdGhpcy5kZWJ1ZyA9IHRoaXMubWFuYWdlci5kZWJ1Zztcbn07XG5cbkNvcmVfdW5wcml2aWxlZ2VkLnVuYm91bmRDaGFubmVscyA9IHt9O1xuXG5Db3JlX3VucHJpdmlsZWdlZC5jb250ZXh0SWQgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogQ3JlYXRlIGEgY3VzdG9tIGNoYW5uZWwuXG4gKiBSZXR1cm5zIHRoZSBzdHJ1Y3R1cmUge2NoYW5uZWw6IFByb3h5LCBpZGVudGlmaWVyOiBPYmplY3R9LFxuICogd2hlcmUgdGhlIGlkZW50aWZpZXIgY2FuIGJlICdyZWRlZW1lZCcgYnkgYW5vdGhlciBtb2R1bGUgb3IgcHJvdmlkZXIgdXNpbmdcbiAqIGJpbmQgY2hhbm5lbCwgYXQgd2hpY2ggcG9pbnQgdGhlIGRlZmVycmVkIG9iamVjdCB3aWxsIHJlc29sdmUgd2l0aCBhIGNoYW5uZWxcbiAqIGJldHdlZW4gdGhlIHR3byBlbmRwb2ludHMuXG4gKiBAbWV0aG9kIGNyZWF0ZUNoYW5uZWxcbiAqIEBwYXJhbXMge0Z1bmN0aW9ufSBjb250aW51YXRpb24gTWV0aG9kIHRvIGNhbGwgd2l0aCB0aGUgY29zbnRydWN0ZWQgc3RydWN0dXJlLlxuICovXG5Db3JlX3VucHJpdmlsZWdlZC5wcm90b3R5cGUuY3JlYXRlQ2hhbm5lbCA9IGZ1bmN0aW9uKGNvbnRpbnVhdGlvbikge1xuICB2YXIgcHJveHkgPSBuZXcgQ29uc3VtZXIoRXZlbnRJbnRlcmZhY2UsIHRoaXMubWFuYWdlci5kZWJ1ZyksXG4gICAgICBpZCA9IHV0aWwuZ2V0SWQoKSxcbiAgICAgIGNoYW4gPSB0aGlzLmdldENoYW5uZWwocHJveHkpO1xuICB0aGlzLm1hbmFnZXIuc2V0dXAocHJveHkpO1xuXG4gIGlmICh0aGlzLm1hbmFnZXIuZGVsZWdhdGUgJiYgdGhpcy5tYW5hZ2VyLnRvRGVsZWdhdGUuY29yZSkge1xuICAgIHRoaXMubWFuYWdlci5lbWl0KHRoaXMubWFuYWdlci5kZWxlZ2F0ZSwge1xuICAgICAgdHlwZTogJ0RlbGVnYXRpb24nLFxuICAgICAgcmVxdWVzdDogJ2hhbmRsZScsXG4gICAgICBmbG93OiAnY29yZScsXG4gICAgICBtZXNzYWdlOiB7XG4gICAgICAgIHR5cGU6ICdyZWdpc3RlcicsXG4gICAgICAgIGlkOiBpZFxuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIENvcmVfdW5wcml2aWxlZ2VkLnVuYm91bmRDaGFubmVsc1tpZF0gPSB7XG4gICAgbG9jYWw6IHRydWUsXG4gICAgcHJveHk6IHByb3h5XG4gIH07XG5cbiAgcHJveHkub25jZSgnc3RhcnQnLCB0aGlzLmdldENoYW5uZWwuYmluZCh0aGlzLCBwcm94eSkpO1xuXG4gIGNvbnRpbnVhdGlvbih7XG4gICAgY2hhbm5lbDogY2hhbixcbiAgICBpZGVudGlmaWVyOiBpZFxuICB9KTtcbn07XG5cbkNvcmVfdW5wcml2aWxlZ2VkLnByb3RvdHlwZS5nZXRDaGFubmVsID0gZnVuY3Rpb24ocHJveHkpIHtcbiAgdmFyIGlmYWNlID0gcHJveHkuZ2V0UHJveHlJbnRlcmZhY2UoKSxcbiAgICAgIGNoYW4gPSBpZmFjZSgpO1xuICBjaGFuLmNsb3NlID0gaWZhY2UuY2xvc2U7XG4gIGNoYW4ub25DbG9zZSA9IGlmYWNlLm9uQ2xvc2U7XG4gIGlmYWNlLm9uQ2xvc2UoY2hhbiwgZnVuY3Rpb24oKSB7XG4gICAgcHJveHkuZG9DbG9zZSgpO1xuICB9KTtcbiAgcmV0dXJuIGNoYW47XG59O1xuXG4vKipcbiAqIFJlY2VpdmUgYSBtZXNzYWdlIGZyb20gYW5vdGhlciBjb3JlIGluc3RhbmNlLlxuICogTm90ZTogQ29yZV91bnByaXZpbGVnZWQgaXMgbm90IHJlZ2lzdGVyZWQgb24gdGhlIGh1Yi4gaXQgaXMgYSBwcm92aWRlcixcbiAqICAgICBhcyBpdCdzIGxvY2F0aW9uIGFuZCBuYW1lIHdvdWxkIGluZGljYXRlLiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBieVxuICogICAgIHBvcnQtYXBwIHRvIHJlbGF5IG1lc3NhZ2VzIHVwIHRvIGhpZ2hlciBsZXZlbHMuICBNb3JlIGdlbmVyYWxseSwgdGhlXG4gKiAgICAgbWVzc2FnZXMgZW1pdHRlZCBieSB0aGUgY29yZSB0byAndGhpcy5tYW5hZ2VyLmVtaXQodGhpcy5tYW5hbmFnZS5kZWxlZ2F0ZSdcbiAqICAgICBTaG91bGQgYmUgb25NZXNzYWdlZCB0byB0aGUgY29udHJvbGxpbmcgY29yZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzb3VyY2UgVGhlIHNvdXJjZSBvZiB0aGUgbWVzc2FnZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBtc2cgVGhlIG1lc3NzYWdlIGZyb20gYW4gaXNvbGF0ZWQgY29yZSBwcm92aWRlci5cbiAqL1xuQ29yZV91bnByaXZpbGVnZWQucHJvdG90eXBlLm9uTWVzc2FnZSA9IGZ1bmN0aW9uKHNvdXJjZSwgbXNnKSB7XG4gIGlmIChtc2cudHlwZSA9PT0gJ3JlZ2lzdGVyJykge1xuICAgIENvcmVfdW5wcml2aWxlZ2VkLnVuYm91bmRDaGFubmVsc1ttc2cuaWRdID0ge1xuICAgICAgcmVtb3RlOiB0cnVlLFxuICAgICAgcmVzb2x2ZTogbXNnLnJlcGx5LFxuICAgICAgc291cmNlOiBzb3VyY2VcbiAgICB9O1xuICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnY2xlYXInKSB7XG4gICAgZGVsZXRlIENvcmVfdW5wcml2aWxlZ2VkLnVuYm91bmRDaGFubmVsc1ttc2cuaWRdO1xuICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnYmluZCcpIHtcbiAgICBpZiAoQ29yZV91bnByaXZpbGVnZWQudW5ib3VuZENoYW5uZWxzW21zZy5pZF0pIHtcbiAgICAgIHRoaXMuYmluZENoYW5uZWwobXNnLmlkLCBmdW5jdGlvbigpIHt9LCBzb3VyY2UpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBCaW5kIGEgY3VzdG9tIGNoYW5uZWwuXG4gKiBDcmVhdGVzIGEgcHJveHkgaW50ZXJmYWNlIHRvIHRoZSBjdXN0b20gY2hhbm5lbCwgd2hpY2ggd2lsbCBiZSBib3VuZCB0b1xuICogdGhlIHByb3h5IG9idGFpbmVkIHRocm91Z2ggYW4gZWFybGllciBjcmVhdGVDaGFubmVsIGNhbGwuXG4gKiBjaGFubmVsIHRvIGEgcHJveHkuXG4gKiBAbWV0aG9kIGJpbmRDaGFubmVsXG4gKiBAcGFyYW0ge09iamVjdH0gaWRlbnRpZmllciBBbiBpZGVudGlmaWVyIG9idGFpbmVkIHRocm91Z2ggY3JlYXRlQ2hhbm5lbC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnRpbnVhdGlvbiBBIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBwcm94eS5cbiAqL1xuQ29yZV91bnByaXZpbGVnZWQucHJvdG90eXBlLmJpbmRDaGFubmVsID0gZnVuY3Rpb24oaWRlbnRpZmllciwgY29udGludWF0aW9uLCBzb3VyY2UpIHtcbiAgdmFyIHRvQmluZCA9IENvcmVfdW5wcml2aWxlZ2VkLnVuYm91bmRDaGFubmVsc1tpZGVudGlmaWVyXSxcbiAgICAgIG5ld1NvdXJjZSA9ICFzb3VyY2U7XG5cbiAgLy8gd2hlbiBiaW5kQ2hhbm5lbCBpcyBjYWxsZWQgZGlyZWN0bHksIHNvdXJjZSB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgLy8gV2hlbiBpdCBpcyBwcm9wb2dhdGVkIGJ5IG9uTWVzc2FnZSwgYSBzb3VyY2UgZm9yIGJpbmRpbmcgd2lsbCBhbHJlYWR5IGV4aXN0LlxuICBpZiAobmV3U291cmNlKSB7XG4gICAgdGhpcy5kZWJ1Zy5kZWJ1ZygnbWFraW5nIGxvY2FsIHByb3h5IGZvciBjb3JlIGJpbmRpbmcnKTtcbiAgICBzb3VyY2UgPSBuZXcgQ29uc3VtZXIoRXZlbnRJbnRlcmZhY2UsIHRoaXMuZGVidWcpO1xuICAgIHRoaXMubWFuYWdlci5zZXR1cChzb3VyY2UpO1xuICB9XG5cbiAgLy8gSWYgdGhpcyBpcyBhIGtub3duIGlkZW50aWZpZXIgYW5kIGlzIGluIHRoZSBzYW1lIGNvbnRleHQsIGJpbmRpbmcgaXMgZWFzeS5cbiAgaWYgKHRvQmluZCAmJiB0b0JpbmQubG9jYWwpIHtcbiAgICB0aGlzLmRlYnVnLmRlYnVnKCdCaW5kaW5nIGEgY2hhbm5lbCB0byBwb3J0IG9uIHRoaXMgaHViOicgKyBzb3VyY2UpO1xuICAgIHRoaXMubWFuYWdlci5jcmVhdGVMaW5rKHNvdXJjZSwgaWRlbnRpZmllciwgdG9CaW5kLnByb3h5LCAnZGVmYXVsdCcpO1xuICAgIGRlbGV0ZSBDb3JlX3VucHJpdmlsZWdlZC51bmJvdW5kQ2hhbm5lbHNbaWRlbnRpZmllcl07XG4gICAgaWYgKHRoaXMubWFuYWdlci5kZWxlZ2F0ZSAmJiB0aGlzLm1hbmFnZXIudG9EZWxlZ2F0ZS5jb3JlKSB7XG4gICAgICB0aGlzLm1hbmFnZXIuZW1pdCh0aGlzLm1hbmFnZXIuZGVsZWdhdGUsIHtcbiAgICAgICAgdHlwZTogJ0RlbGVnYXRpb24nLFxuICAgICAgICByZXF1ZXN0OiAnaGFuZGxlJyxcbiAgICAgICAgZmxvdzogJ2NvcmUnLFxuICAgICAgICBtZXNzYWdlOiB7XG4gICAgICAgICAgdHlwZTogJ2NsZWFyJyxcbiAgICAgICAgICBpZDogaWRlbnRpZmllclxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodG9CaW5kICYmIHRvQmluZC5yZW1vdGUpIHtcbiAgICB0aGlzLmRlYnVnLmRlYnVnKCdCaW5kaW5nIGEgY2hhbm5lbCBpbnRvIGEgbW9kdWxlLicpO1xuICAgIHRoaXMubWFuYWdlci5jcmVhdGVMaW5rKFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIG5ld1NvdXJjZSA/ICdkZWZhdWx0JyA6IGlkZW50aWZpZXIsXG4gICAgICAgIHRvQmluZC5zb3VyY2UsXG4gICAgICAgIGlkZW50aWZpZXIpO1xuICAgIHRvQmluZC5yZXNvbHZlKHtcbiAgICAgIHR5cGU6ICdCaW5kIENoYW5uZWwnLFxuICAgICAgcmVxdWVzdDonY29yZScsXG4gICAgICBmbG93OiAnY29yZScsXG4gICAgICBtZXNzYWdlOiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgaWQ6IGlkZW50aWZpZXJcbiAgICAgIH1cbiAgICB9KTtcbiAgICBkZWxldGUgQ29yZV91bnByaXZpbGVnZWQudW5ib3VuZENoYW5uZWxzW2lkZW50aWZpZXJdO1xuICB9IGVsc2UgaWYgKHRoaXMubWFuYWdlci5kZWxlZ2F0ZSAmJiB0aGlzLm1hbmFnZXIudG9EZWxlZ2F0ZS5jb3JlKSB7XG4gICAgdGhpcy5kZWJ1Zy5pbmZvKCdkZWxlZ2F0aW5nIGNoYW5uZWwgYmluZCBmb3IgYW4gdW5rbm93biBJRDonICsgaWRlbnRpZmllcik7XG4gICAgdGhpcy5tYW5hZ2VyLmVtaXQodGhpcy5tYW5hZ2VyLmRlbGVnYXRlLCB7XG4gICAgICB0eXBlOiAnRGVsZWdhdGlvbicsXG4gICAgICByZXF1ZXN0OiAnaGFuZGxlJyxcbiAgICAgIGZsb3c6ICdjb3JlJyxcbiAgICAgIG1lc3NhZ2U6IHtcbiAgICAgICAgdHlwZTogJ2JpbmQnLFxuICAgICAgICBpZDogaWRlbnRpZmllclxuICAgICAgfVxuICAgIH0pO1xuICAgIHNvdXJjZS5vbmNlKCdzdGFydCcsIGZ1bmN0aW9uKHAsIGNiKSB7XG4gICAgICBjYih0aGlzLmdldENoYW5uZWwocCkpO1xuICAgIH0uYmluZCh0aGlzLCBzb3VyY2UsIGNvbnRpbnVhdGlvbikpO1xuICAgIHRoaXMubWFuYWdlci5jcmVhdGVMaW5rKHNvdXJjZSxcbiAgICAgICAgJ2RlZmF1bHQnLFxuICAgICAgICB0aGlzLm1hbmFnZXIuaHViLmdldERlc3RpbmF0aW9uKHRoaXMubWFuYWdlci5kZWxlZ2F0ZSksXG4gICAgICAgIGlkZW50aWZpZXIpO1xuICAgIGRlbGV0ZSBDb3JlX3VucHJpdmlsZWdlZC51bmJvdW5kQ2hhbm5lbHNbaWRlbnRpZmllcl07XG4gICAgcmV0dXJuO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGVidWcud2FybignQXNrZWQgdG8gYmluZCB1bmtub3duIGNoYW5uZWw6ICcgKyBpZGVudGlmaWVyKTtcbiAgICB0aGlzLmRlYnVnLmxvZyhDb3JlX3VucHJpdmlsZWdlZC51bmJvdW5kQ2hhbm5lbHMpO1xuICAgIGNvbnRpbnVhdGlvbigpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzb3VyY2UuZ2V0SW50ZXJmYWNlKSB7XG4gICAgY29udGludWF0aW9uKHRoaXMuZ2V0Q2hhbm5lbChzb3VyY2UpKTtcbiAgfSBlbHNlIHtcbiAgICBjb250aW51YXRpb24oKTtcbiAgfVxufTtcblxuLyoqXG4gKiBHZXQgdGhlIElEIG9mIHRoZSBjdXJyZW50IGZyZWVkb20uanMgY29udGV4dC4gIFByb3ZpZGVzIGFuXG4gKiBhcnJheSBvZiBtb2R1bGUgVVJMcywgdGhlIGxpbmVhZ2Ugb2YgdGhlIGN1cnJlbnQgY29udGV4dC5cbiAqIFdoZW4gbm90IGluIGFuIGFwcGxpY2F0aW9uIGNvbnRleHQsIHRoZSBJRCBpcyB0aGUgbGluZWFnZVxuICogb2YgdGhlIGN1cnJlbnQgVmlldy5cbiAqIEBtZXRob2QgZ2V0SWRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiBjYWxsZWQgd2l0aCBJRCBpbmZvcm1hdGlvbi5cbiAqL1xuQ29yZV91bnByaXZpbGVnZWQucHJvdG90eXBlLmdldElkID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgLy8gVE9ETzogbWFrZSBzdXJlIGNvbnRleHRJRCBpcyBwcm9wZXJseSBmcm96ZW4uXG4gIGNhbGxiYWNrKENvcmVfdW5wcml2aWxlZ2VkLmNvbnRleHRJZCk7XG59O1xuXG4vKipcbiAqIEdldCBhIGxvZ2dlciBmb3IgbG9nZ2luZyB0byB0aGUgZnJlZWRvbS5qcyBsb2dnZXIuIFByb3ZpZGVzIGFcbiAqIGxvZyBvYmplY3Qgd2l0aCBhbiBpbnRlcmZhY2Ugc2ltaWxhciB0byB0aGUgc3RhbmRhcmQgamF2YXNjcmlwdCBjb25zb2xlLFxuICogd2hpY2ggbG9ncyB2aWEgZGVidWcuXG4gKiBAbWV0aG9kIGdldExvZ2dlclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGxvZ2dlciwgdXNlZCBhcyBpdHMgJ3NvdXJjZSdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdpdGggdGhlIGxvZ2dlci5cbiAqL1xuQ29yZV91bnByaXZpbGVnZWQucHJvdG90eXBlLmdldExvZ2dlciA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrKHRoaXMubWFuYWdlci5kZWJ1Zy5nZXRMb2dnZXIobmFtZSkpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIElEIG9mIHRoZSBjdXJyZW50IGZyZWVkb20uanMgY29udGV4dC5cbiAqIEBtZXRob2Qgc2V0SWRcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBpZCBUaGUgbGluZWFnZSBvZiB0aGUgY3VycmVudCBjb250ZXh0LlxuICovXG5Db3JlX3VucHJpdmlsZWdlZC5wcm90b3R5cGUuc2V0SWQgPSBmdW5jdGlvbihpZCkge1xuICBDb3JlX3VucHJpdmlsZWdlZC5jb250ZXh0SWQgPSBpZDtcbn07XG5cbmV4cG9ydHMucHJvdmlkZXIgPSBDb3JlX3VucHJpdmlsZWdlZDtcbmV4cG9ydHMubmFtZSA9IFwiY29yZVwiO1xuIiwiLypnbG9iYWxzIGRvY3VtZW50ICovXHJcbi8qanNsaW50IGluZGVudDoyLHNsb3BweTp0cnVlLG5vZGU6dHJ1ZSAqL1xyXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uLy4uL3NyYy91dGlsJyk7XHJcbnZhciBQcm9taXNlQ29tcGF0ID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xyXG5cclxuLyoqXHJcbiAqIEEgZnJlZWRvbS5qcyB2aWV3IGlzIHRoZSBpbnRlcmZhY2UgZm9yIHVzZXIgaW50ZXJhY3Rpb24uXHJcbiAqIEEgdmlldyBleGlzdHMgYXMgYW4gaUZyYW1lLCB3aGljaCBpcyBzaG93biB0byB0aGUgdXNlciBpbiBzb21lIHdheS5cclxuICogY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHRoZSB2aWV3IGFuZCB0aGUgZnJlZWRvbS5qcyBtb2R1bGUgaXMgcGVyZm9ybWVkXHJcbiAqIHRocm91Z2ggdGhlIEhUTUw1IHBvc3RNZXNzYWdlIG1lY2hhbmlzbSwgd2hpY2ggdGhpcyBwcm92aWRlciB0cmFuc2xhdGVzXHJcbiAqIHRvIGZyZWVkb20uanMgbWVzc2FnZSBldmVudHMuXHJcbiAqIEBDbGFzcyBWaWV3X3VucHJpdmlsZWdlZFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtWaWV3IFByb3ZpZGVyfSBwcm92aWRlclxyXG4gKiBAcGFyYW0ge3BvcnQuTW9kdWxlfSBjYWxsZXIgVGhlIG1vZHVsZSBjcmVhdGluZyB0aGlzIHByb3ZpZGVyLlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkaXNwYXRjaEV2ZW50IEZ1bmN0aW9uIHRvIGNhbGwgdG8gZW1pdCBldmVudHMuXHJcbiAqL1xyXG52YXIgQ29yZV9WaWV3ID0gZnVuY3Rpb24gKHByb3ZpZGVyLCBjYWxsZXIsIGRpc3BhdGNoRXZlbnQpIHtcclxuICB0aGlzLnByb3ZpZGVyID0gcHJvdmlkZXI7XHJcbiAgdGhpcy5kaXNwYXRjaEV2ZW50ID0gZGlzcGF0Y2hFdmVudDtcclxuICB0aGlzLm1vZHVsZSA9IGNhbGxlcjtcclxuICB0aGlzLm1vZHVsZS5vbmNlKCdjbG9zZScsIHRoaXMuY2xvc2UuYmluZCh0aGlzLCBmdW5jdGlvbiAoKSB7fSkpO1xyXG4gIHV0aWwuaGFuZGxlRXZlbnRzKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBpcyB0aGUgZGVmYXVsdCBwcm92aWRlciBmb3IgY29yZS52aWV3LCB1bmxlc3Mgb3ZlcnJpZGRlbiBieSBjb250ZXh0IG9yXHJcbiAqIGEgdXNlciBzdXBwbGllZCBwcm92aWRlci4gVGhlIGludGVyZmFjZSBpcyBkb2N1bWVudGVkIGF0OlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZnJlZWRvbWpzL2ZyZWVkb20vd2lraS9mcmVlZG9tLmpzLVZpZXdzXHJcbiAqXHJcbiAqIEdlbmVyYWxseSwgYSB2aWV3IHByb3ZpZGVyIGNvbnNpc3RzIG9mIDMgbWV0aG9kczpcclxuICogb25PcGVuIGlzIGNhbGxlZCB3aGVuIGEgdmlldyBzaG91bGQgYmUgc2hvd24uXHJcbiAqICAgICBpZCAtIGlzIGEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoaXMgdmlldywgdXNlZCBvbiBzdWJzZXF1ZW50IGNhbGxzXHJcbiAqICAgICAgICAgIGZvciBjb21tdW5pY2F0aW9uIGFuZCB0byBldmVudHVhbGx5IGNsb3NlIHRoZSB2aWV3LlxyXG4gKiAgICAgbmFtZSAtIGlzIHRoZSBuYW1lIG9mIHRoZSB2aWV3IChhcyBkZWZpbmVkIGluIHRoZSBtYW5pZmVzdCksXHJcbiAqICAgICAgICAgICAgaW4gb3JkZXIgdG8gcGxhY2UgaXQgYXBwcm9wcmlhdGVseS5cclxuICogICAgIHBhZ2UgLSBpcyB0aGUgcmVzb2x2ZWQgVVJMIHRvIG9wZW4uXHJcbiAqICAgICByZXNvdXJjZXMgLSBpcyBhbiBhcnJheSBvZiByZXNvbHZlZCBVUkxzIHdoaWNoIGFyZSByZWZlcmVuY2VkLlxyXG4gKiAgICAgcG9zdE1lc3NhZ2UgLSBpcyBhIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBtZXNzYWdlcyBhcmUgZW1pdHRlZFxyXG4gKiAgICAgICAgICAgICAgICAgICBieSB0aGUgd2luZG93IGluIHdoaWNoIHRoZSB2aWV3IGlzIG9wZW5lZC5cclxuICogb25PcGVuIHJldHVybnMgYSBwcm9taXNlIHRoYXQgY29tcGxldGVzIHdoZW4gdGhlIHZpZXcgaXMgbG9hZGVkLlxyXG4gKiBvbk1lc3NhZ2UgaXMgY2FsbGVkIHRvIHNlbmQgYSBtZXNzYWdlIHRvIGFuIG9wZW4gdmlldy5cclxuICogICAgIGlkIC0gaXMgdGhlIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgb3BlbiB2aWV3LlxyXG4gKiAgICAgbWVzc2FnZSAtIGlzIHRoZSBtZXNzYWdlIHRvIHBvc3RNZXNzYWdlIHRvIHRoZSB2aWV3J3Mgd2luZG93LlxyXG4gKiBvbkNsb3NlIGlzIGNhbGxlZCB0byBjbG9zZSBhIHZpZXcuXHJcbiAqICAgICBpZCAtIGlzIHRoZSB1bmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIHZpZXcuXHJcbiAqL1xyXG5Db3JlX1ZpZXcucHJvdmlkZXIgPSB7XHJcbiAgbGlzdGVuZXI6IHVuZGVmaW5lZCxcclxuICBhY3RpdmU6IHt9LFxyXG4gIG9uT3BlbjogZnVuY3Rpb24gKGlkLCBuYW1lLCBwYWdlLCByZXNvdXJjZXMsIHBvc3RNZXNzYWdlKSB7XHJcbiAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuYm9keSxcclxuICAgICAgcm9vdCxcclxuICAgICAgZnJhbWU7XHJcbiAgICBcclxuICAgIGlmICghdGhpcy5saXN0ZW5lcikge1xyXG4gICAgICB0aGlzLmxpc3RlbmVyID0gZnVuY3Rpb24gKG1zZykge1xyXG4gICAgICAgIHZhciBpO1xyXG4gICAgICAgIGZvciAoaSBpbiB0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuYWN0aXZlLmhhc093blByb3BlcnR5KGkpICYmXHJcbiAgICAgICAgICAgICAgdGhpcy5hY3RpdmVbaV0uc291cmNlID09PSBtc2cuc291cmNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlW2ldLnBvc3RNZXNzYWdlKG1zZy5kYXRhKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0uYmluZCh0aGlzKTtcclxuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLmxpc3RlbmVyLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWaWV3cyBvcGVuIGJ5IGRlZmF1bHQgaW4gYW4gZWxlbWVudCB3aXRoIHRoZWlyIElELCBvciBmaWxsIHRoZSBwYWdlXHJcbiAgICAvLyBvdGhlcndpc2UuXHJcbiAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSkpIHtcclxuICAgICAgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmFtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcm9vdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICByb290LnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XHJcbiAgICByb290LnN0eWxlLmhlaWdodCA9IFwiMTAwJVwiO1xyXG4gICAgcm9vdC5zdHlsZS5kaXNwbGF5ID0gXCJyZWxhdGl2ZVwiO1xyXG5cclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChyb290KTtcclxuICAgIFxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlQ29tcGF0KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xyXG4gICAgICBmcmFtZS5zZXRBdHRyaWJ1dGUoXCJzYW5kYm94XCIsIFwiYWxsb3ctc2NyaXB0cyBhbGxvdy1mb3Jtc1wiKTtcclxuICAgICAgZnJhbWUuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcclxuICAgICAgZnJhbWUuc3R5bGUuaGVpZ2h0ID0gXCIxMDAlXCI7XHJcbiAgICAgIGZyYW1lLnN0eWxlLmJvcmRlciA9IFwiMFwiO1xyXG4gICAgICBmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kID0gXCJ0cmFuc3BhcmVudFwiO1xyXG4gICAgICBmcmFtZS5zcmMgPSBwYWdlO1xyXG4gICAgICBmcmFtZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgcmVzb2x2ZSwgdHJ1ZSk7XHJcbiAgICAgIGZyYW1lLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgcmVqZWN0LCB0cnVlKTtcclxuXHJcbiAgICAgIHJvb3QuYXBwZW5kQ2hpbGQoZnJhbWUpO1xyXG5cclxuICAgICAgdGhpcy5hY3RpdmVbaWRdID0ge1xyXG4gICAgICAgIHBvc3RNZXNzYWdlOiBwb3N0TWVzc2FnZSxcclxuICAgICAgICBjb250YWluZXI6IGNvbnRhaW5lcixcclxuICAgICAgICByb290OiByb290LFxyXG4gICAgICAgIHNvdXJjZTogZnJhbWUuY29udGVudFdpbmRvd1xyXG4gICAgICB9O1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICB9LFxyXG4gIG9uTWVzc2FnZTogZnVuY3Rpb24gKGlkLCBtZXNzYWdlKSB7XHJcbiAgICB0aGlzLmFjdGl2ZVtpZF0uc291cmNlLnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XHJcbiAgfSxcclxuICBvbkNsb3NlOiBmdW5jdGlvbiAoaWQpIHtcclxuICAgIHRoaXMuYWN0aXZlW2lkXS5jb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5hY3RpdmVbaWRdLnJvb3QpO1xyXG4gICAgZGVsZXRlIHRoaXMuYWN0aXZlW2lkXTtcclxuICAgIFxyXG4gICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuYWN0aXZlKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLmxpc3RlbmVyLCB0cnVlKTtcclxuICAgICAgdGhpcy5saXN0ZW5lciA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQXNrIGZvciB0aGlzIHZpZXcgdG8gb3BlbiBhIHNwZWNpZmljIGxvY2F0aW9uLCBlaXRoZXIgYSBGaWxlIHJlbGF0aXZlIHRvXHJcbiAqIHRoZSBsb2FkZXIsIG9yIGFuIGV4cGxpY2l0IGNvZGUgbG9jYXRpb24uXHJcbiAqIEBtZXRob2Qgc2hvd1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgaWRlbnRpZmllciBvZiB0aGUgdmlldy5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29udGludWF0aW9uIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB2aWV3IGlzIGxvYWRlZC5cclxuICovXHJcbkNvcmVfVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uIChuYW1lLCBjb250aW51YXRpb24pIHtcclxuICBpZiAodGhpcy5pZCkge1xyXG4gICAgcmV0dXJuIGNvbnRpbnVhdGlvbih1bmRlZmluZWQsIHtcclxuICAgICAgZXJyY29kZTogJ0FMUkVBRFlfT1BFTicsXHJcbiAgICAgIG1lc3NhZ2U6ICdDYW5ub3Qgc2hvdyBtdWx0aXBsZSB2aWV3cyB0aHJvdWdoIG9uZSBpbnN0YW5jZS4nXHJcbiAgICB9KTtcclxuICB9XHJcbiAgdGhpcy5pZCA9IHV0aWwuZ2V0SWQoKTtcclxuXHJcbiAgdmFyIGNvbmZpZyA9IHRoaXMubW9kdWxlLm1hbmlmZXN0LnZpZXdzLFxyXG4gICAgdG9SZXNvbHZlID0gW107XHJcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZ1tuYW1lXSkge1xyXG4gICAgcmV0dXJuIGNvbnRpbnVhdGlvbih1bmRlZmluZWQsIHtcclxuICAgICAgZXJyY29kZTogJ05PTl9FWElTVEFOVCcsXHJcbiAgICAgIG1lc3NhZ2U6ICdWaWV3IG5vdCBmb3VuZDogJyArIG5hbWVcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKGNvbmZpZ1tuYW1lXS5tYWluICYmIGNvbmZpZ1tuYW1lXS5maWxlcykge1xyXG4gICAgdG9SZXNvbHZlID0gY29uZmlnW25hbWVdLmZpbGVzLmNvbmNhdChjb25maWdbbmFtZV0ubWFpbik7XHJcbiAgICBQcm9taXNlQ29tcGF0LmFsbCh0b1Jlc29sdmUubWFwKGZ1bmN0aW9uIChmbmFtZSkge1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2R1bGUucmVzb3VyY2UuZ2V0KHRoaXMubW9kdWxlLm1hbmlmZXN0SWQsIGZuYW1lKTtcclxuICAgIH0uYmluZCh0aGlzKSkpLnRoZW4oZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgIHRoaXMucHJvdmlkZXIub25PcGVuKHRoaXMuaWQsXHJcbiAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgZmlsZXNbZmlsZXMubGVuZ3RoIC0gMV0sXHJcbiAgICAgICAgICBmaWxlcyxcclxuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudC5iaW5kKHRoaXMsICdtZXNzYWdlJykpLnRoZW4oXHJcbiAgICAgICAgY29udGludWF0aW9uLFxyXG4gICAgICAgIGNvbnRpbnVhdGlvbi5iaW5kKHt9LCB1bmRlZmluZWQpXHJcbiAgICAgICk7XHJcbiAgICB9LmJpbmQodGhpcyksIGZ1bmN0aW9uIChlcnIpIHtcclxuICAgICAgdGhpcy5tb2R1bGUuZGVidWcuZXJyb3IoJ1VuYWJsZSB0byBvcGVuIHZpZXcgJyArIG5hbWUgKyAnOiAnLCBlcnIpO1xyXG4gICAgICBjb250aW51YXRpb24odW5kZWZpbmVkLCB7XHJcbiAgICAgICAgZXJyY29kZTogJ1ZJRVdfTUFMRk9STUVEJyxcclxuICAgICAgICBtZXNzYWdlOiAnTWFsZm9ybWVkIFZpZXcgRGVjbGFyYXRpb246ICcgKyBlcnJcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29udGludWF0aW9uKHVuZGVmaW5lZCwge1xyXG4gICAgICBlcnJjb2RlOiAnTk9OX0VYSVNUQU5UJyxcclxuICAgICAgbWVzc2FnZTogJ1ZpZXcgbm90IGZvdW5kOiAnICsgbmFtZVxyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIGlzU2VjdXJlIGRldGVybWluZXMgd2hldGhlciB0aGUgbW9kdWxlIGNhbiBoYXZlIGNvbmZpZGVuY2UgdGhhdCBpdHNcclxuICogY29tbXVuaWNhdGlvbiB3aXRoIGl0cyB2aWV3IGNhbm5vdCBiZSBpbnRlcmNlcHRlZCBieSBhbiB1bnRydXN0ZWQgM3JkIHBhcnR5LlxyXG4gKiBJbiBwcmFjdGljZSwgdGhpcyBtZWFucyB0aGF0IGl0cyBva2F5IGZvciB0aGUgcnVudGltZSB0byBoYXZlIGFjY2VzcyB0byB0aGVcclxuICogbWVzc2FnZXMsIGFuZCBpZiB0aGUgY29udGV4dCBpcyBhIHdlYiBzZXJ2ZXIgb3IgYSBicm93c2VyIGV4dGVuc2lvbiB0aGVuXHJcbiAqIHRoYXQgY29udGV4dCBpcyB0cnVzdGVkLiBIb3dldmVyLCBpZiBhIHByb3ZpZGVyIHdhbnRzIHRvIGFsbG93IHRoZWlyIGUuZy5cclxuICogc29jaWFsIHByb3ZpZGVyIHRvIGJlIHVzZWQgb24gYXJiaXRyYXJ5IHdlYnNpdGVzLCB0aGlzIG1lY2hhbmlzbSBtZWFucyB0aGF0XHJcbiAqIGlmIHRoZSB3ZWJzaXRlIHVzZXMgYSB0cnVzdGVkIHZlcnNpb24gb2YgdGhlIGZyZWVkb20uanMgbGlicmFyeSwgdGhlbiB0aGVcclxuICogbW9kdWxlIGNhbiBiZSB1c2VkLlxyXG4gKiBAbWV0aG9kIGlzU2VjdXJlXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBpZiB0aGUgY2hhbm5lbCB0byB0aGUgdmlldyBpcyBzZWN1cmUuXHJcbiAqL1xyXG5Db3JlX1ZpZXcucHJvdG90eXBlLmlzU2VjdXJlID0gZnVuY3Rpb24gKGNvbnRpbnVhdGlvbikge1xyXG4gIGNvbnRpbnVhdGlvbihmYWxzZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2VuZCBhIG1lc3NhZ2UgdG8gYW4gb3BlbiB2aWV3LlxyXG4gKiBAbWV0aG9kIHBvc3RNZXNzYWdlXHJcbiAqL1xyXG5Db3JlX1ZpZXcucHJvdG90eXBlLnBvc3RNZXNzYWdlID0gZnVuY3Rpb24gKG1zZywgY29udGludWF0aW9uKSB7XHJcbiAgaWYgKCF0aGlzLmlkKSB7XHJcbiAgICByZXR1cm4gY29udGludWF0aW9uKHVuZGVmaW5lZCwge1xyXG4gICAgICBlcnJjb2RlOiAnTk9UX09QRU4nLFxyXG4gICAgICBtZXNzYWdlOiAnQ2Fubm90IHBvc3QgbWVzc2FnZSB0byB1bmluaXRpYWxpemVkIHZpZXcuJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHRoaXMucHJvdmlkZXIub25NZXNzYWdlKHRoaXMuaWQsIG1zZyk7XHJcbiAgY29udGludWF0aW9uKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2xvc2UgYW4gYWN0aXZlIHZpZXcuXHJcbiAqIEBtZXRob2QgY2xvc2VcclxuICovXHJcbkNvcmVfVmlldy5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoY29udGludWF0aW9uKSB7XHJcbiAgaWYgKCF0aGlzLmlkKSB7XHJcbiAgICByZXR1cm4gY29udGludWF0aW9uKHVuZGVmaW5lZCwge1xyXG4gICAgICBlcnJjb2RlOiAnTk9UX09QRU4nLFxyXG4gICAgICBtZXNzYWdlOiAnQ2Fubm90IGNsb3NlIHVuaW5pdGlhbGl6ZWQgdmlldy4nXHJcbiAgICB9KTtcclxuICB9XHJcbiAgdGhpcy5wcm92aWRlci5vbkNsb3NlKHRoaXMuaWQpO1xyXG4gIGRlbGV0ZSB0aGlzLmlkO1xyXG5cclxuICBjb250aW51YXRpb24oKTtcclxufTtcclxuXHJcblxyXG4vKipcclxuICogQWxsb3cgYSB3ZWIgcGFnZSB0byByZWRlZmluZSBiZWhhdmlvciBmb3IgaG93IHZpZXdzIGFyZSBzaG93bi5cclxuICogQG1ldGhvZCByZWdpc3RlclxyXG4gKiBAc3RhdGljXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFBhZ2VQcm92aWRlciBUaGUgY3VzdG9tIHZpZXcgYmVoYXZpb3IuXHJcbiAqL1xyXG5Db3JlX1ZpZXcucmVnaXN0ZXIgPSBmdW5jdGlvbiAoUGFnZVByb3ZpZGVyKSB7XHJcbiAgdmFyIHByb3ZpZGVyID0gUGFnZVByb3ZpZGVyID8gbmV3IFBhZ2VQcm92aWRlcigpIDogQ29yZV9WaWV3LnByb3ZpZGVyO1xyXG4gIGV4cG9ydHMucHJvdmlkZXIgPSBDb3JlX1ZpZXcuYmluZCh0aGlzLCBwcm92aWRlcik7XHJcbn07XHJcblxyXG5leHBvcnRzLnByb3ZpZGVyID0gQ29yZV9WaWV3LmJpbmQodGhpcywgQ29yZV9WaWV3LnByb3ZpZGVyKTtcclxuZXhwb3J0cy5uYW1lID0gJ2NvcmUudmlldyc7XHJcbmV4cG9ydHMucmVnaXN0ZXIgPSBDb3JlX1ZpZXcucmVnaXN0ZXI7XHJcbiIsIi8qZ2xvYmFscyBjb25zb2xlICovXG4vKmpzbGludCBpbmRlbnQ6Mix3aGl0ZTp0cnVlLHNsb3BweTp0cnVlLCBub2RlOnRydWUgKi9cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vLi4vc3JjL3V0aWwnKTtcblxuLyoqXG4gKiBBIG1pbmltYWwgcHJvdmlkZXIgaW1wbGVtZW50aW5nIHRoZSBjb3JlLmVjaG8gaW50ZXJmYWNlIGZvciBpbnRlcmFjdGlvbiB3aXRoXG4gKiBjdXN0b20gY2hhbm5lbHMuICBQcmltYXJpbHkgdXNlZCBmb3IgdGVzdGluZyB0aGUgcm9idXN0bmVzcyBvZiB0aGUgY3VzdG9tXG4gKiBjaGFubmVsIGltcGxlbWVudGF0aW9uLlxuICogQENsYXNzIEVjaG9fdW5wcml2aWxlZ2VkXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7TW9kdWxlfSBtb2QgVGhlIG1vZHVsZSBjcmVhdGluZyB0aGlzIHByb3ZpZGVyLlxuICovXG52YXIgRWNob191bnByaXZpbGVnZWQgPSBmdW5jdGlvbihtb2QsIGRpc3BhdGNoRXZlbnQpIHtcbiAgdGhpcy5tb2QgPSBtb2Q7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudCA9IGRpc3BhdGNoRXZlbnQ7XG4gIHV0aWwuaGFuZGxlRXZlbnRzKHRoaXMpO1xuXG4gIC8vIFRoZSBDb3JlIG9iamVjdCBmb3IgbWFuYWdpbmcgY2hhbm5lbHMuXG4gIHRoaXMubW9kLm9uY2UoJ2NvcmUnLCBmdW5jdGlvbihDb3JlKSB7XG4gICAgdGhpcy5jb3JlID0gbmV3IENvcmUoKTtcbiAgfS5iaW5kKHRoaXMpKTtcbiAgdGhpcy5tb2QuZW1pdCh0aGlzLm1vZC5jb250cm9sQ2hhbm5lbCwge1xuICAgIHR5cGU6ICdjb3JlIHJlcXVlc3QgZGVsZWdhdGVkIHRvIGVjaG8nLFxuICAgIHJlcXVlc3Q6ICdjb3JlJ1xuICB9KTtcbn07XG5cbi8qKlxuICogU2V0dXAgdGhlIHByb3ZpZGVyIHRvIGVjaG8gb24gYSBzcGVjaWZpYyBwcm94eS4gU3Vic2VxdWVudCBtZXNzYWdlc1xuICogRnJvbSB0aGUgY3VzdG9tIGNoYW5uZWwgYm91bmQgaGVyZSB3aWxsIGJlIHJlLWVtaXR0ZWQgYXMgYSBtZXNzYWdlXG4gKiBmcm9tIHRoZSBwcm92aWRlci4gIFN1YnNlcXVlbnQgbWVzc2FnZXMgdG8gdGhlIHByb3ZpZGVyIHdpbGwgYmVcbiAqIGVtaXR0ZWQgb24gdGhlIGJvdW5kIGNoYW5uZWwuXG4gKiBAcGFyYW0ge09iamVjdH0gcHJveHkgVGhlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXN0b20gY2hhbm5lbCB0byBiaW5kLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29udGludWF0aW9uIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBzZXR1cCBpcyBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgc2V0dXBcbiAqL1xuRWNob191bnByaXZpbGVnZWQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24ocHJveHksIGNvbnRpbnVhdGlvbikge1xuICBjb250aW51YXRpb24oKTtcbiAgaWYgKCF0aGlzLmNvcmUpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ21lc3NhZ2UnLCAnbm8gY29yZSBhdmFpbGFibGUgdG8gc2V0dXAgcHJveHkgd2l0aCBhdCBlY2hvJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5jb3JlLmJpbmRDaGFubmVsKHByb3h5LCBmdW5jdGlvbihjaGFuKSB7XG4gICAgaWYgKHRoaXMuY2hhbikge1xuICAgICAgdGhpcy5jaGFuLmNsb3NlKCk7XG4gICAgfVxuICAgIHRoaXMuY2hhbiA9IGNoYW47XG4gICAgdGhpcy5jaGFuLm9uQ2xvc2UoZnVuY3Rpb24oKSB7XG4gICAgICBkZWxldGUgdGhpcy5jaGFuO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdtZXNzYWdlJywgJ2NoYW5uZWwgYm91bmQgdG8gZWNobycpO1xuICAgIHRoaXMuY2hhbi5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG0pIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnbWVzc2FnZScsICdmcm9tIGN1c3RvbSBjaGFubmVsOiAnICsgbSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIGJvdW5kIGN1c3RvbSBjaGFubmVsLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgc3RyaW5nIHRvIHNlbmQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb250aW51YXRpb24gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIHNlbmRpbmcgaXMgY29tcGxldGUuXG4gKiBAbWV0aG9kIHNlbmRcbiAqL1xuRWNob191bnByaXZpbGVnZWQucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihzdHIsIGNvbnRpbnVhdGlvbikge1xuICBjb250aW51YXRpb24oKTtcbiAgaWYgKHRoaXMuY2hhbikge1xuICAgIHRoaXMuY2hhbi5lbWl0KCdtZXNzYWdlJywgc3RyKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ21lc3NhZ2UnLCAnbm8gY2hhbm5lbCBhdmFpbGFibGUnKTtcbiAgfVxufTtcblxuZXhwb3J0cy5wcm92aWRlciA9IEVjaG9fdW5wcml2aWxlZ2VkO1xuZXhwb3J0cy5uYW1lID0gXCJjb3JlLmVjaG9cIjtcbiIsIi8qZ2xvYmFscyBjb25zb2xlLCBSVENQZWVyQ29ubmVjdGlvbiwgd2Via2l0UlRDUGVlckNvbm5lY3Rpb24gKi9cbi8qZ2xvYmFscyBtb3pSVENQZWVyQ29ubmVjdGlvbiwgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uLCBSVENJY2VDYW5kaWRhdGUgKi9cbi8qZ2xvYmFscyBtb3pSVENTZXNzaW9uRGVzY3JpcHRpb24sIG1velJUQ0ljZUNhbmRpZGF0ZSAqL1xuLypnbG9iYWxzIEFycmF5QnVmZmVyLCBCbG9iICovXG4vKmpzbGludCBpbmRlbnQ6MixzbG9wcHk6dHJ1ZSxub2RlOnRydWUgKi9cbi8qKlxuICogRGF0YVBlZXIgLSBhIGNsYXNzIHRoYXQgd3JhcHMgcGVlciBjb25uZWN0aW9ucyBhbmQgZGF0YSBjaGFubmVscy5cbiAqL1xuLy8gVE9ETzogY2hlY2sgdGhhdCBIYW5kbGluZyBvZiBwcmFuc3dlciBpcyB0cmVhdGVkIGFwcHJvcHJpYXRlbHkuXG52YXIgU2ltcGxlRGF0YVBlZXJTdGF0ZSA9IHtcbiAgRElTQ09OTkVDVEVEOiAnRElTQ09OTkVDVEVEJyxcbiAgQ09OTkVDVElORzogJ0NPTk5FQ1RJTkcnLFxuICBDT05ORUNURUQ6ICdDT05ORUNURUQnXG59O1xuXG5mdW5jdGlvbiBTaW1wbGVEYXRhUGVlcihwZWVyTmFtZSwgc3R1blNlcnZlcnMsIGRhdGFDaGFubmVsQ2FsbGJhY2tzLCBtb2Nrcykge1xuICB2YXIgY29uc3RyYWludHMsXG4gICAgY29uZmlnLFxuICAgIGk7XG4gIHRoaXMucGVlck5hbWUgPSBwZWVyTmFtZTtcbiAgdGhpcy5jaGFubmVscyA9IHt9O1xuICB0aGlzLmRhdGFDaGFubmVsQ2FsbGJhY2tzID0gZGF0YUNoYW5uZWxDYWxsYmFja3M7XG4gIHRoaXMub25Db25uZWN0ZWRRdWV1ZSA9IFtdO1xuXG4gIGlmICh0eXBlb2YgbW9ja3MuUlRDUGVlckNvbm5lY3Rpb24gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB0aGlzLlJUQ1BlZXJDb25uZWN0aW9uID0gbW9ja3MuUlRDUGVlckNvbm5lY3Rpb247XG4gIH0gZWxzZSBpZiAodHlwZW9mIHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdGhpcy5SVENQZWVyQ29ubmVjdGlvbiA9IHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb3pSVENQZWVyQ29ubmVjdGlvbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHRoaXMuUlRDUGVlckNvbm5lY3Rpb24gPSBtb3pSVENQZWVyQ29ubmVjdGlvbjtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGVudmlyb25tZW50IGRvZXMgbm90IGFwcGVhciB0byBzdXBwb3J0IFJUQ1BlZXJDb25uZWN0aW9uXCIpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2Nrcy5SVENTZXNzaW9uRGVzY3JpcHRpb24gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB0aGlzLlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IG1vY2tzLlJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcbiAgfSBlbHNlIGlmICh0eXBlb2YgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdGhpcy5SVENTZXNzaW9uRGVzY3JpcHRpb24gPSBSVENTZXNzaW9uRGVzY3JpcHRpb247XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHRoaXMuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gbW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3QgYXBwZWFyIHRvIHN1cHBvcnQgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uXCIpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBtb2Nrcy5SVENJY2VDYW5kaWRhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB0aGlzLlJUQ0ljZUNhbmRpZGF0ZSA9IG1vY2tzLlJUQ0ljZUNhbmRpZGF0ZTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgUlRDSWNlQ2FuZGlkYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdGhpcy5SVENJY2VDYW5kaWRhdGUgPSBSVENJY2VDYW5kaWRhdGU7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1velJUQ0ljZUNhbmRpZGF0ZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHRoaXMuUlRDSWNlQ2FuZGlkYXRlID0gbW96UlRDSWNlQ2FuZGlkYXRlO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3QgYXBwZWFyIHRvIHN1cHBvcnQgUlRDSWNlQ2FuZGlkYXRlXCIpO1xuICB9XG5cblxuICBjb25zdHJhaW50cyA9IHtcbiAgICBvcHRpb25hbDogW3tEdGxzU3J0cEtleUFncmVlbWVudDogdHJ1ZX1dXG4gIH07XG4gIC8vIEEgd2F5IHRvIHNwZWFrIHRvIHRoZSBwZWVyIHRvIHNlbmQgU0RQIGhlYWRlcnMgZXRjLlxuICB0aGlzLnNlbmRTaWduYWxNZXNzYWdlID0gbnVsbDtcblxuICB0aGlzLnBjID0gbnVsbDsgIC8vIFRoZSBwZWVyIGNvbm5lY3Rpb24uXG4gIC8vIEdldCBUVVJOIHNlcnZlcnMgZm9yIHRoZSBwZWVyIGNvbm5lY3Rpb24uXG4gIGNvbmZpZyA9IHtpY2VTZXJ2ZXJzOiBbXX07XG4gIGZvciAoaSA9IDA7IGkgPCBzdHVuU2VydmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbmZpZy5pY2VTZXJ2ZXJzLnB1c2goe1xuICAgICAgJ3VybCcgOiBzdHVuU2VydmVyc1tpXVxuICAgIH0pO1xuICB9XG4gIHRoaXMucGMgPSBuZXcgdGhpcy5SVENQZWVyQ29ubmVjdGlvbihjb25maWcsIGNvbnN0cmFpbnRzKTtcbiAgLy8gQWRkIGJhc2ljIGV2ZW50IGhhbmRsZXJzLlxuICB0aGlzLnBjLmFkZEV2ZW50TGlzdGVuZXIoXCJpY2VjYW5kaWRhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uSWNlQ2FsbGJhY2suYmluZCh0aGlzKSk7XG4gIHRoaXMucGMuYWRkRXZlbnRMaXN0ZW5lcihcIm5lZ290aWF0aW9ubmVlZGVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbk5lZ290aWF0aW9uTmVlZGVkLmJpbmQodGhpcykpO1xuICB0aGlzLnBjLmFkZEV2ZW50TGlzdGVuZXIoXCJkYXRhY2hhbm5lbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25EYXRhQ2hhbm5lbC5iaW5kKHRoaXMpKTtcbiAgdGhpcy5wYy5hZGRFdmVudExpc3RlbmVyKFwic2lnbmFsaW5nc3RhdGVjaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xuICAgIC8vIFRPRE86IGNvbWUgdXAgd2l0aCBhIGJldHRlciB3YXkgdG8gZGV0ZWN0IGNvbm5lY3Rpb24uICBXZSBzdGFydCBvdXRcbiAgICAvLyBhcyBcInN0YWJsZVwiIGV2ZW4gYmVmb3JlIHdlIGFyZSBjb25uZWN0ZWQuXG4gICAgLy8gVE9ETzogdGhpcyBpcyBub3QgZmlyZWQgZm9yIGNvbm5lY3Rpb25zIGNsb3NlZCBieSB0aGUgb3RoZXIgc2lkZS5cbiAgICAvLyBUaGlzIHdpbGwgYmUgZml4ZWQgaW4gbTM3LCBhdCB0aGF0IHBvaW50IHdlIHNob3VsZCBkaXNwYXRjaCBhbiBvbkNsb3NlXG4gICAgLy8gZXZlbnQgaGVyZSBmb3IgZnJlZWRvbS50cmFuc3BvcnQgdG8gcGljayB1cC5cbiAgICBpZiAodGhpcy5wYy5zaWduYWxpbmdTdGF0ZSA9PT0gXCJzdGFibGVcIikge1xuICAgICAgdGhpcy5wY1N0YXRlID0gU2ltcGxlRGF0YVBlZXJTdGF0ZS5DT05ORUNURUQ7XG4gICAgICB0aGlzLm9uQ29ubmVjdGVkUXVldWUubWFwKGZ1bmN0aW9uIChjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9KTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG4gIC8vIFRoaXMgc3RhdGUgdmFyaWFibGUgaXMgdXNlZCB0byBmYWtlIG9mZmVyL2Fuc3dlciB3aGVuIHRoZXkgYXJlIHdyb25nbHlcbiAgLy8gcmVxdWVzdGVkIGFuZCB3ZSByZWFsbHkganVzdCBuZWVkIHRvIHJldXNlIHdoYXQgd2UgYWxyZWFkeSBoYXZlLlxuICB0aGlzLnBjU3RhdGUgPSBTaW1wbGVEYXRhUGVlclN0YXRlLkRJU0NPTk5FQ1RFRDtcblxuICAvLyBOb3RlOiB0byBhY3R1YWxseSBkbyBzb21ldGhpbmcgd2l0aCBkYXRhIGNoYW5uZWxzIG9wZW5lZCBieSBhIHBlZXIsIHdlXG4gIC8vIG5lZWQgc29tZW9uZSB0byBtYW5hZ2UgXCJkYXRhY2hhbm5lbFwiIGV2ZW50LlxufVxuXG5TaW1wbGVEYXRhUGVlci5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiAoY29uc3RhaW50cywgY29udGludWF0aW9uKSB7XG4gIHRoaXMucGMuY3JlYXRlT2ZmZXIoY29udGludWF0aW9uLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5lcnJvcignY29yZS5wZWVyY29ubmVjdGlvbiBjcmVhdGVPZmZlciBmYWlsZWQuJyk7XG4gIH0sIGNvbnN0YWludHMpO1xufTtcblxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLnJ1bldoZW5Db25uZWN0ZWQgPSBmdW5jdGlvbiAoZnVuYykge1xuICBpZiAodGhpcy5wY1N0YXRlID09PSBTaW1wbGVEYXRhUGVlclN0YXRlLkNPTk5FQ1RFRCkge1xuICAgIGZ1bmMoKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm9uQ29ubmVjdGVkUXVldWUucHVzaChmdW5jKTtcbiAgfVxufTtcblxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAoY2hhbm5lbElkLCBtZXNzYWdlLCBjb250aW51YXRpb24pIHtcbiAgdGhpcy5jaGFubmVsc1tjaGFubmVsSWRdLnNlbmQobWVzc2FnZSk7XG4gIGNvbnRpbnVhdGlvbigpO1xufTtcblxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLm9wZW5EYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uIChjaGFubmVsSWQsIGNvbnRpbnVhdGlvbikge1xuICB2YXIgZGF0YUNoYW5uZWwgPSB0aGlzLnBjLmNyZWF0ZURhdGFDaGFubmVsKGNoYW5uZWxJZCwge30pO1xuICBkYXRhQ2hhbm5lbC5vbm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hZGREYXRhQ2hhbm5lbChjaGFubmVsSWQsIGRhdGFDaGFubmVsKTtcbiAgICBjb250aW51YXRpb24oKTtcbiAgfS5iaW5kKHRoaXMpO1xuICBkYXRhQ2hhbm5lbC5vbmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgIC8vQChyeXNjaGVuZykgdG9kbyAtIHJlcGxhY2Ugd2l0aCBlcnJvcnMgdGhhdCB3b3JrIGFjcm9zcyB0aGUgaW50ZXJmYWNlXG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgIGNvbnRpbnVhdGlvbih1bmRlZmluZWQsIGVycik7XG4gIH07XG4gIC8vIEZpcmVmb3ggZG9lcyBub3QgZmlyZSBcIm5lZ290aWF0aW9ubmVlZGVkXCIsIHNvIHdlIG5lZWQgdG9cbiAgLy8gbmVnb3RhdGUgaGVyZSBpZiB3ZSBhcmUgbm90IGNvbm5lY3RlZC5cbiAgLy8gU2VlIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTg0MDcyOFxuICBpZiAodHlwZW9mIG1velJUQ1BlZXJDb25uZWN0aW9uICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICB0aGlzLnBjU3RhdGUgPT09IFNpbXBsZURhdGFQZWVyU3RhdGUuRElTQ09OTkVDVEVEKSB7XG4gICAgdGhpcy5uZWdvdGlhdGVDb25uZWN0aW9uKCk7XG4gIH1cbn07XG5cblNpbXBsZURhdGFQZWVyLnByb3RvdHlwZS5jbG9zZUNoYW5uZWwgPSBmdW5jdGlvbiAoY2hhbm5lbElkKSB7XG4gIGlmICh0aGlzLmNoYW5uZWxzW2NoYW5uZWxJZF0gIT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuY2hhbm5lbHNbY2hhbm5lbElkXS5jbG9zZSgpO1xuICAgIGRlbGV0ZSB0aGlzLmNoYW5uZWxzW2NoYW5uZWxJZF07XG4gIH1cbn07XG5cblNpbXBsZURhdGFQZWVyLnByb3RvdHlwZS5nZXRCdWZmZXJlZEFtb3VudCA9IGZ1bmN0aW9uIChjaGFubmVsSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWF0aW9uKSB7XG4gIGlmICh0aGlzLmNoYW5uZWxzW2NoYW5uZWxJZF0gIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBkYXRhQ2hhbm5lbCA9IHRoaXMuY2hhbm5lbHNbY2hhbm5lbElkXTtcbiAgICByZXR1cm4gZGF0YUNoYW5uZWwuYnVmZmVyZWRBbW91bnQ7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiTm8gY2hhbm5lbCB3aXRoIGlkOiBcIiArIGNoYW5uZWxJZCk7XG59O1xuXG5TaW1wbGVEYXRhUGVlci5wcm90b3R5cGUuc2V0U2VuZFNpZ25hbE1lc3NhZ2UgPSBmdW5jdGlvbiAoc2VuZFNpZ25hbE1lc3NhZ2VGbikge1xuICB0aGlzLnNlbmRTaWduYWxNZXNzYWdlID0gc2VuZFNpZ25hbE1lc3NhZ2VGbjtcbn07XG5cbi8vIEhhbmRsZSBhIG1lc3NhZ2Ugc2VuZCBvbiB0aGUgc2lnbmFsbGluZyBjaGFubmVsIHRvIHRoaXMgcGVlci5cblNpbXBsZURhdGFQZWVyLnByb3RvdHlwZS5oYW5kbGVTaWduYWxNZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2VUZXh0KSB7XG4gIC8vY29uc29sZS5sb2codGhpcy5wZWVyTmFtZSArIFwiOiBcIiArIFwiaGFuZGxlU2lnbmFsTWVzc2FnZTogXFxuXCIgKyBtZXNzYWdlVGV4dCk7XG4gIHZhciBqc29uID0gSlNPTi5wYXJzZShtZXNzYWdlVGV4dCksXG4gICAgaWNlX2NhbmRpZGF0ZTtcblxuICAvLyBUT0RPOiBJZiB3ZSBhcmUgb2ZmZXJpbmcgYW5kIHRoZXkgYXJlIGFsc28gb2ZmZXJyaW5nIGF0IHRoZSBzYW1lIHRpbWUsXG4gIC8vIHBpY2sgdGhlIG9uZSB3aG8gaGFzIHRoZSBsb3dlciByYW5kb21JZD9cbiAgLy8gKHRoaXMucGMuc2lnbmFsaW5nU3RhdGUgPT0gXCJoYXZlLWxvY2FsLW9mZmVyXCIgJiYganNvbi5zZHAgJiZcbiAgLy8gICAganNvbi5zZHAudHlwZSA9PSBcIm9mZmVyXCIgJiYganNvbi5zZHAucmFuZG9tSWQgPCB0aGlzLmxvY2FsUmFuZG9tSWQpXG4gIGlmIChqc29uLnNkcCkge1xuICAgIC8vIFNldCB0aGUgcmVtb3RlIGRlc2NyaXB0aW9uLlxuICAgIHRoaXMucGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICBuZXcgdGhpcy5SVENTZXNzaW9uRGVzY3JpcHRpb24oanNvbi5zZHApLFxuICAgICAgLy8gU3VjY2Vzc1xuICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMucGVlck5hbWUgKyBcIjogc2V0UmVtb3RlRGVzY3JpcHRpb24gc3VjY2VlZGVkXCIpO1xuICAgICAgICBpZiAodGhpcy5wYy5yZW1vdGVEZXNjcmlwdGlvbi50eXBlID09PSBcIm9mZmVyXCIpIHtcbiAgICAgICAgICB0aGlzLnBjLmNyZWF0ZUFuc3dlcih0aGlzLm9uRGVzY3JpcHRpb24uYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgLy8gRmFpbHVyZVxuICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLnBlZXJOYW1lICsgXCI6IFwiICtcbiAgICAgICAgICAgIFwic2V0UmVtb3RlRGVzY3JpcHRpb24gZmFpbGVkOlwiLCBlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgICk7XG4gIH0gZWxzZSBpZiAoanNvbi5jYW5kaWRhdGUpIHtcbiAgICAvLyBBZGQgcmVtb3RlIGljZSBjYW5kaWRhdGUuXG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLnBlZXJOYW1lICsgXCI6IEFkZGluZyBpY2UgY2FuZGlkYXRlOiBcIiArIEpTT04uc3RyaW5naWZ5KGpzb24uY2FuZGlkYXRlKSk7XG4gICAgaWNlX2NhbmRpZGF0ZSA9IG5ldyB0aGlzLlJUQ0ljZUNhbmRpZGF0ZShqc29uLmNhbmRpZGF0ZSk7XG4gICAgdGhpcy5wYy5hZGRJY2VDYW5kaWRhdGUoaWNlX2NhbmRpZGF0ZSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS53YXJuKHRoaXMucGVlck5hbWUgKyBcIjogXCIgK1xuICAgICAgICBcImhhbmRsZVNpZ25hbE1lc3NhZ2UgZ290IHVuZXhwZWN0ZWQgbWVzc2FnZTogXCIsIG1lc3NhZ2VUZXh0KTtcbiAgfVxufTtcblxuLy8gQ29ubmVjdCB0byB0aGUgcGVlciBieSB0aGUgc2lnbmFsbGluZyBjaGFubmVsLlxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLm5lZ290aWF0ZUNvbm5lY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMucGNTdGF0ZSA9IFNpbXBsZURhdGFQZWVyU3RhdGUuQ09OTkVDVElORztcbiAgdGhpcy5wYy5jcmVhdGVPZmZlcihcbiAgICB0aGlzLm9uRGVzY3JpcHRpb24uYmluZCh0aGlzKSxcbiAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnBlZXJOYW1lICsgXCI6IFwiICtcbiAgICAgICAgICBcImNyZWF0ZU9mZmVyIGZhaWxlZDogXCIsIGUudG9TdHJpbmcoKSk7XG4gICAgICB0aGlzLnBjU3RhdGUgPSBTaW1wbGVEYXRhUGVlclN0YXRlLkRJU0NPTk5FQ1RFRDtcbiAgICB9LmJpbmQodGhpcylcbiAgKTtcbn07XG5cblNpbXBsZURhdGFQZWVyLnByb3RvdHlwZS5pc0Nsb3NlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICF0aGlzLnBjIHx8IHRoaXMucGMuc2lnbmFsaW5nU3RhdGUgPT09IFwiY2xvc2VkXCI7XG59O1xuXG5TaW1wbGVEYXRhUGVlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5pc0Nsb3NlZCgpKSB7XG4gICAgdGhpcy5wYy5jbG9zZSgpO1xuICB9XG4gIC8vY29uc29sZS5sb2codGhpcy5wZWVyTmFtZSArIFwiOiBcIiArIFwiQ2xvc2VkIHBlZXIgY29ubmVjdGlvbi5cIik7XG59O1xuXG5TaW1wbGVEYXRhUGVlci5wcm90b3R5cGUuYWRkRGF0YUNoYW5uZWwgPSBmdW5jdGlvbiAoY2hhbm5lbElkLCBjaGFubmVsKSB7XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLmRhdGFDaGFubmVsQ2FsbGJhY2tzO1xuICB0aGlzLmNoYW5uZWxzW2NoYW5uZWxJZF0gPSBjaGFubmVsO1xuXG4gIGlmIChjaGFubmVsLnJlYWR5U3RhdGUgPT09IFwiY29ubmVjdGluZ1wiKSB7XG4gICAgY2hhbm5lbC5vbm9wZW4gPSBjYWxsYmFja3Mub25PcGVuRm4uYmluZCh0aGlzLCBjaGFubmVsLCB7bGFiZWw6IGNoYW5uZWxJZH0pO1xuICB9XG5cbiAgY2hhbm5lbC5vbmNsb3NlID0gY2FsbGJhY2tzLm9uQ2xvc2VGbi5iaW5kKHRoaXMsIGNoYW5uZWwsIHtsYWJlbDogY2hhbm5lbElkfSk7XG5cbiAgY2hhbm5lbC5vbm1lc3NhZ2UgPSBjYWxsYmFja3Mub25NZXNzYWdlRm4uYmluZCh0aGlzLCBjaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtsYWJlbDogY2hhbm5lbElkfSk7XG5cbiAgY2hhbm5lbC5vbmVycm9yID0gY2FsbGJhY2tzLm9uRXJyb3JGbi5iaW5kKHRoaXMsIGNoYW5uZWwsIHtsYWJlbDogY2hhbm5lbH0pO1xufTtcblxuLy8gV2hlbiB3ZSBnZXQgb3VyIGRlc2NyaXB0aW9uLCB3ZSBzZXQgaXQgdG8gYmUgb3VyIGxvY2FsIGRlc2NyaXB0aW9uIGFuZFxuLy8gc2VuZCBpdCB0byB0aGUgcGVlci5cblNpbXBsZURhdGFQZWVyLnByb3RvdHlwZS5vbkRlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG4gIGlmICh0aGlzLnNlbmRTaWduYWxNZXNzYWdlKSB7XG4gICAgdGhpcy5wYy5zZXRMb2NhbERlc2NyaXB0aW9uKFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5wZWVyTmFtZSArIFwiOiBzZXRMb2NhbERlc2NyaXB0aW9uIHN1Y2NlZWRlZFwiKTtcbiAgICAgICAgdGhpcy5zZW5kU2lnbmFsTWVzc2FnZShKU09OLnN0cmluZ2lmeSh7J3NkcCc6IGRlc2NyaXB0aW9ufSkpO1xuICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLnBlZXJOYW1lICsgXCI6IFwiICtcbiAgICAgICAgICAgIFwic2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQ6XCIsIGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmVycm9yKHRoaXMucGVlck5hbWUgKyBcIjogXCIgK1xuICAgICAgICBcIl9vbkRlc2NyaXB0aW9uOiBfc2VuZFNpZ25hbE1lc3NhZ2UgaXMgbm90IHNldCwgc28gd2UgZGlkIG5vdCBcIiArXG4gICAgICAgICAgICBcInNldCB0aGUgbG9jYWwgZGVzY3JpcHRpb24uIFwiKTtcbiAgfVxufTtcblxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLm9uTmVnb3RpYXRpb25OZWVkZWQgPSBmdW5jdGlvbiAoZSkge1xuICAvL2NvbnNvbGUubG9nKHRoaXMucGVlck5hbWUgKyBcIjogXCIgKyBcIm9uTmVnb3RpYXRpb25OZWVkZWRcIixcbiAgLy8gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh0aGlzLl9wYyksIGUpO1xuICBpZiAodGhpcy5wY1N0YXRlICE9PSBTaW1wbGVEYXRhUGVlclN0YXRlLkRJU0NPTk5FQ1RFRCkge1xuICAgIC8vIE5lZ290aWF0aW9uIG1lc3NhZ2VzIGFyZSBmYWxzZWx5IHJlcXVlc3RlZCBmb3IgbmV3IGRhdGEgY2hhbm5lbHMuXG4gICAgLy8gICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTI0MzFcbiAgICAvLyBUaGlzIGNvZGUgaXMgYSBoYWNrIHRvIHNpbXBseSByZXNldCB0aGUgc2FtZSBsb2NhbCBhbmQgcmVtb3RlXG4gICAgLy8gZGVzY3JpcHRpb24gd2hpY2ggd2lsbCB0cmlnZ2VyIHRoZSBhcHByb3ByaWF0ZSBkYXRhIGNoYW5uZWwgb3BlbiBldmVudC5cbiAgICAvLyBUT0RPOiBmaXgvcmVtb3ZlIHRoaXMgd2hlbiBDaHJvbWUgaXNzdWUgaXMgZml4ZWQuXG4gICAgdmFyIGxvZ1N1Y2Nlc3MgPSBmdW5jdGlvbiAob3ApIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5wZWVyTmFtZSArIFwiOiBcIiArIG9wICsgXCIgc3VjY2VlZGVkIFwiKTtcbiAgICAgIH0uYmluZCh0aGlzKTtcbiAgICB9LmJpbmQodGhpcyksXG4gICAgICBsb2dGYWlsID0gZnVuY3Rpb24gKG9wKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIC8vY29uc29sZS5sb2codGhpcy5wZWVyTmFtZSArIFwiOiBcIiArIG9wICsgXCIgZmFpbGVkOiBcIiArIGUpO1xuICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICB9LmJpbmQodGhpcyk7XG4gICAgaWYgKHRoaXMucGMubG9jYWxEZXNjcmlwdGlvbiAmJiB0aGlzLnBjLnJlbW90ZURlc2NyaXB0aW9uICYmXG4gICAgICAgIHRoaXMucGMubG9jYWxEZXNjcmlwdGlvbi50eXBlID09PSBcIm9mZmVyXCIpIHtcbiAgICAgIHRoaXMucGMuc2V0TG9jYWxEZXNjcmlwdGlvbih0aGlzLnBjLmxvY2FsRGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ1N1Y2Nlc3MoXCJzZXRMb2NhbERlc2NyaXB0aW9uXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dGYWlsKFwic2V0TG9jYWxEZXNjcmlwdGlvblwiKSk7XG4gICAgICB0aGlzLnBjLnNldFJlbW90ZURlc2NyaXB0aW9uKHRoaXMucGMucmVtb3RlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dTdWNjZXNzKFwic2V0UmVtb3RlRGVzY3JpcHRpb25cIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dGYWlsKFwic2V0UmVtb3RlRGVzY3JpcHRpb25cIikpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5wYy5sb2NhbERlc2NyaXB0aW9uICYmIHRoaXMucGMucmVtb3RlRGVzY3JpcHRpb24gJiZcbiAgICAgICAgdGhpcy5wYy5sb2NhbERlc2NyaXB0aW9uLnR5cGUgPT09IFwiYW5zd2VyXCIpIHtcbiAgICAgIHRoaXMucGMuc2V0UmVtb3RlRGVzY3JpcHRpb24odGhpcy5wYy5yZW1vdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ1N1Y2Nlc3MoXCJzZXRSZW1vdGVEZXNjcmlwdGlvblwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ0ZhaWwoXCJzZXRSZW1vdGVEZXNjcmlwdGlvblwiKSk7XG4gICAgICB0aGlzLnBjLnNldExvY2FsRGVzY3JpcHRpb24odGhpcy5wYy5sb2NhbERlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dTdWNjZXNzKFwic2V0TG9jYWxEZXNjcmlwdGlvblwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nRmFpbChcInNldExvY2FsRGVzY3JpcHRpb25cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMucGVlck5hbWUgKyAnLCBvbk5lZ290aWF0aW9uTmVlZGVkIGZhaWxlZCcpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5uZWdvdGlhdGVDb25uZWN0aW9uKCk7XG59O1xuXG5TaW1wbGVEYXRhUGVlci5wcm90b3R5cGUub25JY2VDYWxsYmFjayA9IGZ1bmN0aW9uIChldmVudCkge1xuICBpZiAoZXZlbnQuY2FuZGlkYXRlKSB7XG4gICAgLy8gU2VuZCBJY2VDYW5kaWRhdGUgdG8gcGVlci5cbiAgICAvL2NvbnNvbGUubG9nKHRoaXMucGVlck5hbWUgKyBcIjogXCIgKyBcImljZSBjYWxsYmFjayB3aXRoIGNhbmRpZGF0ZVwiLCBldmVudCk7XG4gICAgaWYgKHRoaXMuc2VuZFNpZ25hbE1lc3NhZ2UpIHtcbiAgICAgIHRoaXMuc2VuZFNpZ25hbE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoeydjYW5kaWRhdGUnOiBldmVudC5jYW5kaWRhdGV9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2Fybih0aGlzLnBlZXJOYW1lICsgXCI6IFwiICsgXCJfb25EZXNjcmlwdGlvbjogX3NlbmRTaWduYWxNZXNzYWdlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgfVxufTtcblxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLm9uU2lnbmFsaW5nU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIC8vY29uc29sZS5sb2codGhpcy5wZWVyTmFtZSArIFwiOiBcIiArIFwib25TaWduYWxpbmdTdGF0ZUNoYW5nZTogXCIsIHRoaXMuX3BjLnNpZ25hbGluZ1N0YXRlKTtcbiAgaWYgKHRoaXMucGMuc2lnbmFsaW5nU3RhdGUgPT09IFwic3RhYmxlXCIpIHtcbiAgICB0aGlzLnBjU3RhdGUgPSBTaW1wbGVEYXRhUGVlclN0YXRlLkNPTk5FQ1RFRDtcbiAgICB0aGlzLm9uQ29ubmVjdGVkUXVldWUubWFwKGZ1bmN0aW9uIChjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9KTtcbiAgfVxufTtcblxuU2ltcGxlRGF0YVBlZXIucHJvdG90eXBlLm9uRGF0YUNoYW5uZWwgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgdGhpcy5hZGREYXRhQ2hhbm5lbChldmVudC5jaGFubmVsLmxhYmVsLCBldmVudC5jaGFubmVsKTtcbiAgLy8gUlRDRGF0YUNoYW5uZWxzIGNyZWF0ZWQgYnkgYSBSVENEYXRhQ2hhbm5lbEV2ZW50IGhhdmUgYW4gaW5pdGlhbFxuICAvLyBzdGF0ZSBvZiBvcGVuLCBzbyB0aGUgb25vcGVuIGV2ZW50IGZvciB0aGUgY2hhbm5lbCB3aWxsIG5vdFxuICAvLyBmaXJlLiBXZSBuZWVkIHRvIGZpcmUgdGhlIG9uT3BlbkRhdGFDaGFubmVsIGV2ZW50IGhlcmVcbiAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvd2VicnRjLyNpZGwtZGVmLVJUQ0RhdGFDaGFubmVsU3RhdGVcblxuICAvLyBGaXJlZm94IGNoYW5uZWxzIGRvIG5vdCBoYXZlIGFuIGluaXRpYWwgc3RhdGUgb2YgXCJvcGVuXCJcbiAgLy8gU2VlIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEwMDA0NzhcbiAgaWYgKGV2ZW50LmNoYW5uZWwucmVhZHlTdGF0ZSA9PT0gXCJvcGVuXCIpIHtcbiAgICB0aGlzLmRhdGFDaGFubmVsQ2FsbGJhY2tzLm9uT3BlbkZuKGV2ZW50LmNoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bGFiZWw6IGV2ZW50LmNoYW5uZWwubGFiZWx9KTtcbiAgfVxufTtcblxuLy8gX3NpZ25hbGxpbmdDaGFubmVsIGlzIGEgY2hhbm5lbCBmb3IgZW1pdHRpbmcgZXZlbnRzIGJhY2sgdG8gdGhlIGZyZWVkb20gSHViLlxuZnVuY3Rpb24gUGVlckNvbm5lY3Rpb24ocG9ydE1vZHVsZSwgZGlzcGF0Y2hFdmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFJUQ1BlZXJDb25uZWN0aW9uLCBSVENTZXNzaW9uRGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBSVENJY2VDYW5kaWRhdGUpIHtcbiAgLy8gQ2hhbm5lbCBmb3IgZW1pdHRpbmcgZXZlbnRzIHRvIGNvbnN1bWVyLlxuICB0aGlzLmRpc3BhdGNoRXZlbnQgPSBkaXNwYXRjaEV2ZW50O1xuXG4gIC8vIGEgKGhvcGVmdWxseSB1bmlxdWUpIElEIGZvciBkZWJ1Z2dpbmcuXG4gIHRoaXMucGVlck5hbWUgPSBcInBcIiArIE1hdGgucmFuZG9tKCk7XG5cbiAgLy8gVGhpcyBpcyB0aGUgcG9ydEFwcCAoZGVmaW5lZCBpbiBmcmVlZG9tL3NyYy9wb3J0LWFwcC5qcykuIEEgd2F5IHRvIHNwZWFrXG4gIC8vIHRvIGZyZWVkb20uXG4gIHRoaXMuZnJlZWRvbU1vZHVsZSA9IHBvcnRNb2R1bGU7XG5cbiAgLy8gRm9yIHRlc3RzIHdlIG1heSBtb2NrIG91dCB0aGUgUGVlckNvbm5lY3Rpb24gYW5kXG4gIC8vIFNlc3Npb25EZXNjcmlwdGlvbiBpbXBsZW1lbnRhdGlvbnNcbiAgdGhpcy5SVENQZWVyQ29ubmVjdGlvbiA9IFJUQ1BlZXJDb25uZWN0aW9uO1xuICB0aGlzLlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcbiAgdGhpcy5SVENJY2VDYW5kaWRhdGUgPSBSVENJY2VDYW5kaWRhdGU7XG5cbiAgLy8gVGhpcyBpcyB0aGUgYSBjaGFubmVsIHRvIHNlbmQgc2lnbmFsbGluZyBtZXNzYWdlcy5cbiAgdGhpcy5zaWduYWxsaW5nQ2hhbm5lbCA9IG51bGw7XG5cbiAgLy8gVGhlIERhdGFQZWVyIG9iamVjdCBmb3IgdGFsa2luZyB0byB0aGUgcGVlci5cbiAgdGhpcy5wZWVyID0gbnVsbDtcblxuICAvLyBUaGUgQ29yZSBvYmplY3QgZm9yIG1hbmFnaW5nIGNoYW5uZWxzLlxuICB0aGlzLmZyZWVkb21Nb2R1bGUub25jZSgnY29yZScsIGZ1bmN0aW9uIChDb3JlKSB7XG4gICAgdGhpcy5jb3JlID0gbmV3IENvcmUoKTtcbiAgfS5iaW5kKHRoaXMpKTtcbiAgdGhpcy5mcmVlZG9tTW9kdWxlLmVtaXQodGhpcy5mcmVlZG9tTW9kdWxlLmNvbnRyb2xDaGFubmVsLCB7XG4gICAgdHlwZTogJ2NvcmUgcmVxdWVzdCBkZWxlZ2F0ZWQgdG8gcGVlcmNvbm5lY3Rpb24nLFxuICAgIHJlcXVlc3Q6ICdjb3JlJ1xuICB9KTtcbn1cblxuLy8gU3RhcnQgYSBwZWVyIGNvbm5lY3Rpb24gdXNpbmcgdGhlIGdpdmVuIGZyZWVkb21DaGFubmVsSWQgYXMgdGhlIHdheSB0b1xuLy8gY29tbXVuaWNhdGUgd2l0aCB0aGUgcGVlci4gVGhlIGFyZ3VtZW50IHxmcmVlZG9tQ2hhbm5lbElkfCBpcyBhIHdheSB0byBzcGVha1xuLy8gdG8gYW4gaWRlbnRpdHkgcHJvdmlkZSB0byBzZW5kIHRoZW0gU0RQIGhlYWRlcnMgbmVnb3RpYXRlIHRoZSBhZGRyZXNzL3BvcnQgdG9cbi8vIHNldHVwIHRoZSBwZWVyIHRvIHBlZXJDb25uZWN0aW9uLlxuLy9cbi8vIG9wdGlvbnM6IHtcbi8vICAgcGVlck5hbWU6IHN0cmluZywgICAvLyBGb3IgcHJldHR5IHByaW50aW5nIG1lc3NhZ2VzIGFib3V0IHRoaXMgcGVlci5cbi8vICAgZGVidWc6IGJvb2xlYW4gICAgICAgICAgIC8vIHNob3VsZCB3ZSBhZGQgZXh0cmFcbi8vIH1cblBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uIChzaWduYWxsaW5nQ2hhbm5lbElkLCBwZWVyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHVuU2VydmVycywgaW5pdGlhdGVDb25uZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVhdGlvbikge1xuICB0aGlzLnBlZXJOYW1lID0gcGVlck5hbWU7XG4gIHZhciBtb2NrcyA9IHtSVENQZWVyQ29ubmVjdGlvbjogdGhpcy5SVENQZWVyQ29ubmVjdGlvbixcbiAgICAgICAgICAgICAgIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjogdGhpcy5SVENTZXNzaW9uRGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICBSVENJY2VDYW5kaWRhdGU6IHRoaXMuUlRDSWNlQ2FuZGlkYXRlfSxcbiAgICBzZWxmID0gdGhpcyxcbiAgICBkYXRhQ2hhbm5lbENhbGxiYWNrcyA9IHtcbiAgICAgIC8vIG9uT3BlbkZuIGlzIGNhbGxlZCBhdCB0aGUgcG9pbnQgbWVzc2FnZXMgd2lsbCBhY3R1YWxseSBnZXQgdGhyb3VnaC5cbiAgICAgIG9uT3BlbkZuOiBmdW5jdGlvbiAoZGF0YUNoYW5uZWwsIGluZm8pIHtcbiAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KFwib25PcGVuRGF0YUNoYW5uZWxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICB7IGNoYW5uZWxJZDogaW5mby5sYWJlbH0pO1xuICAgICAgfSxcbiAgICAgIG9uQ2xvc2VGbjogZnVuY3Rpb24gKGRhdGFDaGFubmVsLCBpbmZvKSB7XG4gICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChcIm9uQ2xvc2VEYXRhQ2hhbm5lbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHsgY2hhbm5lbElkOiBpbmZvLmxhYmVsfSk7XG4gICAgICB9LFxuICAgICAgLy8gRGVmYXVsdCBvbiByZWFsIG1lc3NhZ2UgcHJpbnRzIGl0IHRvIGNvbnNvbGUuXG4gICAgICBvbk1lc3NhZ2VGbjogZnVuY3Rpb24gKGRhdGFDaGFubmVsLCBpbmZvLCBldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQuZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KCdvblJlY2VpdmVkJywge1xuICAgICAgICAgICAgJ2NoYW5uZWxMYWJlbCc6IGluZm8ubGFiZWwsXG4gICAgICAgICAgICAnYnVmZmVyJzogZXZlbnQuZGF0YVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KCdvblJlY2VpdmVkJywge1xuICAgICAgICAgICAgJ2NoYW5uZWxMYWJlbCc6IGluZm8ubGFiZWwsXG4gICAgICAgICAgICAnYmluYXJ5JzogZXZlbnQuZGF0YVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiAoZXZlbnQuZGF0YSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KCdvblJlY2VpdmVkJywge1xuICAgICAgICAgICAgJ2NoYW5uZWxMYWJlbCc6IGluZm8ubGFiZWwsXG4gICAgICAgICAgICAndGV4dCc6IGV2ZW50LmRhdGFcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIERlZmF1bHQgb24gZXJyb3IsIHByaW50cyBpdC5cbiAgICAgIG9uRXJyb3JGbjogZnVuY3Rpb24gKGRhdGFDaGFubmVsLCBpbmZvLCBlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihkYXRhQ2hhbm5lbC5wZWVyTmFtZSArIFwiOiBkYXRhQ2hhbm5lbChcIiArXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YUNoYW5uZWwuZGF0YUNoYW5uZWwubGFiZWwgKyBcIik6IGVycm9yOiBcIiwgZXJyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGNoYW5uZWxJZCxcbiAgICBvcGVuRGF0YUNoYW5uZWxDb250aW51YXRpb247XG5cbiAgdGhpcy5wZWVyID0gbmV3IFNpbXBsZURhdGFQZWVyKHRoaXMucGVlck5hbWUsIHN0dW5TZXJ2ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YUNoYW5uZWxDYWxsYmFja3MsIG1vY2tzKTtcblxuICAvLyBTZXR1cCBsaW5rIGJldHdlZW4gRnJlZWRvbSBtZXNzYWdpbmcgYW5kIF9wZWVyJ3Mgc2lnbmFsbGluZy5cbiAgLy8gTm90ZTogdGhlIHNpZ25hbGxpbmcgY2hhbm5lbCBzaG91bGQgb25seSBiZSBzZW5kaW5nIHJlY2VpdmVpbmcgc3RyaW5ncy5cbiAgdGhpcy5jb3JlLmJpbmRDaGFubmVsKHNpZ25hbGxpbmdDaGFubmVsSWQsIGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgdGhpcy5zaWduYWxsaW5nQ2hhbm5lbCA9IGNoYW5uZWw7XG4gICAgdGhpcy5wZWVyLnNldFNlbmRTaWduYWxNZXNzYWdlKGZ1bmN0aW9uIChtc2cpIHtcbiAgICAgIHRoaXMuc2lnbmFsbGluZ0NoYW5uZWwuZW1pdCgnbWVzc2FnZScsIG1zZyk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnNpZ25hbGxpbmdDaGFubmVsLm9uKCdtZXNzYWdlJyxcbiAgICAgICAgdGhpcy5wZWVyLmhhbmRsZVNpZ25hbE1lc3NhZ2UuYmluZCh0aGlzLnBlZXIpKTtcbiAgICB0aGlzLnNpZ25hbGxpbmdDaGFubmVsLmVtaXQoJ3JlYWR5Jyk7XG4gICAgaWYgKCFpbml0aWF0ZUNvbm5lY3Rpb24pIHtcbiAgICAgIHRoaXMucGVlci5ydW5XaGVuQ29ubmVjdGVkKGNvbnRpbnVhdGlvbik7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGlmIChpbml0aWF0ZUNvbm5lY3Rpb24pIHtcbiAgICAvLyBTZXR1cCBhIGNvbm5lY3Rpb24gcmlnaHQgYXdheSwgdGhlbiBpbnZva2UgY29udGludWF0aW9uLlxuICAgIGNvbnNvbGUubG9nKHRoaXMucGVlck5hbWUgKyAnIGluaXRpYXRpbmcgY29ubmVjdGlvbicpO1xuICAgIGNoYW5uZWxJZCA9ICdoZWxsbycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCk7XG4gICAgb3BlbkRhdGFDaGFubmVsQ29udGludWF0aW9uID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY29udGludWF0aW9uKHVuZGVmaW5lZCwgZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jbG9zZURhdGFDaGFubmVsKGNoYW5uZWxJZCwgY29udGludWF0aW9uKTtcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcGVuRGF0YUNoYW5uZWwoY2hhbm5lbElkLCBvcGVuRGF0YUNoYW5uZWxDb250aW51YXRpb24pO1xuICB9XG59O1xuXG5QZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiAoY29uc3RyYWludHMsIGNvbnRpbnVhdGlvbikge1xuICB0aGlzLnBlZXIuY3JlYXRlT2ZmZXIoY29uc3RyYWludHMsIGNvbnRpbnVhdGlvbik7XG59O1xuXG4vLyBUT0RPOiBkZWxheSBjb250aW51YXRpb24gdW50aWwgdGhlIG9wZW4gY2FsbGJhY2sgZnJvbSBfcGVlciBpcyBjYWxsZWQuXG5QZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub3BlbkRhdGFDaGFubmVsID0gZnVuY3Rpb24gKGNoYW5uZWxJZCwgY29udGludWF0aW9uKSB7XG4gIHRoaXMucGVlci5vcGVuRGF0YUNoYW5uZWwoY2hhbm5lbElkLCBjb250aW51YXRpb24pO1xufTtcblxuUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlRGF0YUNoYW5uZWwgPSBmdW5jdGlvbiAoY2hhbm5lbElkLCBjb250aW51YXRpb24pIHtcbiAgdGhpcy5wZWVyLmNsb3NlQ2hhbm5lbChjaGFubmVsSWQpO1xuICBjb250aW51YXRpb24oKTtcbn07XG5cbi8vIENhbGxlZCB0byBzZW5kIGEgbWVzc2FnZSBvdmVyIHRoZSBnaXZlbiBkYXRhY2hhbm5lbCB0byBhIHBlZXIuIElmIHRoZSBkYXRhXG4vLyBjaGFubmVsIGRvZXNuJ3QgYWxyZWFkeSBleGlzdCwgdGhlIERhdGFQZWVyIGNyZWF0ZXMgaXQuXG5QZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChzZW5kSW5mbywgY29udGludWF0aW9uKSB7XG4gIHZhciBvYmpUb1NlbmQgPSBzZW5kSW5mby50ZXh0IHx8IHNlbmRJbmZvLmJ1ZmZlciB8fCBzZW5kSW5mby5iaW5hcnk7XG4gIGlmICh0eXBlb2Ygb2JqVG9TZW5kID09PSAndW5kZWZpbmVkJykge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2YWxpZCBkYXRhIHRvIHNlbmQgaGFzIGJlZW4gcHJvdmlkZWQuXCIsIHNlbmRJbmZvKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy9ERUJVR1xuICAvLyBvYmpUb1NlbmQgPSBuZXcgQXJyYXlCdWZmZXIoNCk7XG4gIC8vREVCVUdcbiAgdGhpcy5wZWVyLnNlbmQoc2VuZEluZm8uY2hhbm5lbExhYmVsLCBvYmpUb1NlbmQsIGNvbnRpbnVhdGlvbik7XG59O1xuXG5QZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0QnVmZmVyZWRBbW91bnQgPSBmdW5jdGlvbiAoY2hhbm5lbElkLCBjb250aW51YXRpb24pIHtcbiAgY29udGludWF0aW9uKHRoaXMucGVlci5nZXRCdWZmZXJlZEFtb3VudChjaGFubmVsSWQpKTtcbn07XG5cblBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChjb250aW51YXRpb24pIHtcbiAgaWYgKHRoaXMucGVlci5pc0Nsb3NlZCgpKSB7XG4gICAgLy8gUGVlciBhbHJlYWR5IGNsb3NlZCwgcnVuIGNvbnRpbnVhdGlvbiB3aXRob3V0IGRpc3BhdGNoaW5nIGV2ZW50LlxuICAgIGNvbnRpbnVhdGlvbigpO1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnBlZXIuY2xvc2UoKTtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50KFwib25DbG9zZVwiKTtcbiAgY29udGludWF0aW9uKCk7XG59O1xuXG5leHBvcnRzLnByb3ZpZGVyID0gUGVlckNvbm5lY3Rpb247XG5leHBvcnRzLm5hbWUgPSAnY29yZS5wZWVyY29ubmVjdGlvbic7XG4iLCIvKmdsb2JhbHMgbG9jYWxTdG9yYWdlICovXG4vKmpzbGludCBpbmRlbnQ6MixzbG9wcHk6dHJ1ZSxub2RlOnRydWUgKi9cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vLi4vc3JjL3V0aWwnKTtcblxuLyoqXG4gKiBBIEZyZWVET00gY29yZS5zdG9yYWdlIHByb3ZpZGVyIHRoYXQgZGVwZW5kcyBvbiBsb2NhbFN0b3JhZ2VcbiAqIFRodXMsIHRoaXMgb25seSB3b3JrcyBpbiB0aGUgY29udGV4dCBvZiBhIHdlYnBhZ2UgYW5kIGhhc1xuICogc29tZSBzaXplIGxpbWl0YXRpb25zLlxuICogTm90ZSB0aGF0IHRoaXMgY2FuIGNvbmZsaWN0IHdpdGggb3RoZXIgc2NyaXB0cyB1c2luZyBsb2NhbFN0b3JhZ2VcbiAqIGFzIGtleXMgYXJlIHJhd1xuICogQENsYXNzIFN0b3JhZ2VfdW5wcml2aWxlZ2VkXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FwcH0gYXBwIFRoZSBhcHBsaWNhdGlvbiBjcmVhdGluZyB0aGlzIHByb3ZpZGVyLlxuICovXG52YXIgU3RvcmFnZV91bnByaXZpbGVnZWQgPSBmdW5jdGlvbiAoYXBwLCBkaXNwYXRjaEV2ZW50KSB7XG4gIHRoaXMuYXBwID0gYXBwO1xuICB1dGlsLmhhbmRsZUV2ZW50cyh0aGlzKTtcbn07XG5cbi8qKlxuICogTGlzdHMga2V5cyBpbiB0aGUgc3RvcmFnZSByZXBvc2l0b3J5XG4gKiBAbWV0aG9kIGtleXNcbiAqL1xuU3RvcmFnZV91bnByaXZpbGVnZWQucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbiAoY29udGludWF0aW9uKSB7XG4gIHZhciByZXN1bHQgPSBbXSxcbiAgICBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbG9jYWxTdG9yYWdlLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgcmVzdWx0LnB1c2gobG9jYWxTdG9yYWdlLmtleShpKSk7XG4gIH1cbiAgY29udGludWF0aW9uKHJlc3VsdCk7XG59O1xuXG4vKipcbiAqIEdldCBhIGtleSBmcm9tIHRoZSBzdG9yYWdlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBpdGVtIHRvIGdldCBmcm9tIHN0b3JhZ2UuXG4gKiBAbWV0aG9kIGdldFxuICovXG5TdG9yYWdlX3VucHJpdmlsZWdlZC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSwgY29udGludWF0aW9uKSB7XG4gIHRyeSB7XG4gICAgdmFyIHZhbCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gICAgY29udGludWF0aW9uKHZhbCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb250aW51YXRpb24obnVsbCk7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0IGEga2V5IGluIHRoZSBzdG9yYWdlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBpdGVtIHRvIHNhdmUgaW4gc3RvcmFnZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2F2ZSBpbiBzdG9yYWdlLlxuICogQG1ldGhvZCBzZXRcbiAqL1xuU3RvcmFnZV91bnByaXZpbGVnZWQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlLCBjb250aW51YXRpb24pIHtcbiAgdmFyIHJldCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUpO1xuICBjb250aW51YXRpb24ocmV0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGEga2V5IGZyb20gdGhlIHN0b3JhZ2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGl0ZW0gdG8gcmVtb3ZlIGZyb20gc3RvcmFnZTtcbiAqIEBtZXRob2QgcmVtb3ZlXG4gKi9cblN0b3JhZ2VfdW5wcml2aWxlZ2VkLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoa2V5LCBjb250aW51YXRpb24pIHtcbiAgdmFyIHJldCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gIGNvbnRpbnVhdGlvbihyZXQpO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgY29udGVudHMgb2YgdGhlIHN0b3JhZ2UgcmVwb3NpdG9yeS5cbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuU3RvcmFnZV91bnByaXZpbGVnZWQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKGNvbnRpbnVhdGlvbikge1xuICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgY29udGludWF0aW9uKCk7XG59O1xuXG5leHBvcnRzLnByb3ZpZGVyID0gU3RvcmFnZV91bnByaXZpbGVnZWQ7XG5leHBvcnRzLm5hbWUgPSAnY29yZS5zdG9yYWdlJztcbiIsIi8qZ2xvYmFscyBXZWJTb2NrZXQsIEFycmF5QnVmZmVyLCBCbG9iLCBVaW50OEFycmF5LCBjb25zb2xlICovXG4vKmpzbGludCBzbG9wcHk6dHJ1ZSwgbm9kZTp0cnVlICovXG5cbnZhciBXU0hhbmRsZSA9IG51bGw7XG52YXIgbm9kZVN0eWxlID0gZmFsc2U7XG5cbi8qKlxuICogQSBXZWJTb2NrZXQgY29yZSBwcm92aWRlclxuICpcbiAqIEBwYXJhbSB7cG9ydC5Nb2R1bGV9IG1vZHVsZSBUaGUgTW9kdWxlIHJlcXVlc3RpbmcgdGhpcyBwcm92aWRlclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZGlzcGF0Y2hFdmVudCBGdW5jdGlvbiB0byBkaXNwYXRjaCBldmVudHMuXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBSZW1vdGUgVVJMIHRvIGNvbm5lY3Qgd2l0aC5cbiAqIEBwYXJhbSB7U3RyaW5nW119IHByb3RvY29scyBTdWJQcm90b2NvbHMgdG8gb3Blbi5cbiAqIEBwYXJhbSB7V2ViU29ja2V0P30gc29ja2V0IEFuIGFsdGVybmF0aXZlIHNvY2tldCBjbGFzcyB0byB1c2UuXG4gKi9cbnZhciBXUyA9IGZ1bmN0aW9uIChtb2R1bGUsIGRpc3BhdGNoRXZlbnQsIHVybCwgcHJvdG9jb2xzLCBzb2NrZXQpIHtcbiAgdmFyIFdTSW1wbGVtZW50YXRpb24gPSBudWxsLFxuICAgIGVycm9yO1xuICB0aGlzLmlzTm9kZSA9IG5vZGVTdHlsZTtcbiAgaWYgKHR5cGVvZiBzb2NrZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgV1NJbXBsZW1lbnRhdGlvbiA9IHNvY2tldDtcbiAgfSBlbHNlIGlmIChXU0hhbmRsZSAhPT0gbnVsbCkge1xuICAgIFdTSW1wbGVtZW50YXRpb24gPSBXU0hhbmRsZTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIFdTSW1wbGVtZW50YXRpb24gPSBXZWJTb2NrZXQ7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignUGxhdGZvcm0gZG9lcyBub3Qgc3VwcG9ydCBXZWJTb2NrZXQnKTtcbiAgfVxuXG4gIHRoaXMuZGlzcGF0Y2hFdmVudCA9IGRpc3BhdGNoRXZlbnQ7XG4gIHRyeSB7XG4gICAgaWYgKHByb3RvY29scykge1xuICAgICAgdGhpcy53ZWJzb2NrZXQgPSBuZXcgV1NJbXBsZW1lbnRhdGlvbih1cmwsIHByb3RvY29scyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud2Vic29ja2V0ID0gbmV3IFdTSW1wbGVtZW50YXRpb24odXJsKTtcbiAgICB9XG4gICAgdGhpcy53ZWJzb2NrZXQuYmluYXJ5VHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlcnJvciA9IHt9O1xuICAgIGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcbiAgICAgIGVycm9yLmVycmNvZGUgPSAnU1lOVEFYJztcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3IuZXJyY29kZSA9IGUubmFtZTtcbiAgICB9XG4gICAgZXJyb3IubWVzc2FnZSA9IGUubWVzc2FnZTtcbiAgICBkaXNwYXRjaEV2ZW50KCdvbkVycm9yJywgZXJyb3IpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0aGlzLmlzTm9kZSkge1xuICAgIHRoaXMud2Vic29ja2V0Lm9uKCdtZXNzYWdlJywgdGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzKSk7XG4gICAgdGhpcy53ZWJzb2NrZXQub24oJ29wZW4nLCB0aGlzLm9uT3Blbi5iaW5kKHRoaXMpKTtcbiAgICAvLyBub2RlLmpzIHdlYnNvY2tldCBpbXBsZW1lbnRhdGlvbiBub3QgY29tcGxpYW50XG4gICAgdGhpcy53ZWJzb2NrZXQub24oJ2Nsb3NlJywgdGhpcy5vbkNsb3NlLmJpbmQodGhpcywge1xuICAgICAgY29kZTogMCxcbiAgICAgIHJlYXNvbjogJ1VOS05PV04nLFxuICAgICAgd2FzQ2xlYW46IHRydWVcbiAgICB9KSk7XG4gICAgdGhpcy53ZWJzb2NrZXQub24oJ2Vycm9yJywgdGhpcy5vbkVycm9yLmJpbmQodGhpcykpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMud2Vic29ja2V0Lm9ub3BlbiA9IHRoaXMub25PcGVuLmJpbmQodGhpcyk7XG4gICAgdGhpcy53ZWJzb2NrZXQub25jbG9zZSA9IHRoaXMub25DbG9zZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMub25NZXNzYWdlLmJpbmQodGhpcyk7XG4gICAgdGhpcy53ZWJzb2NrZXQub25lcnJvciA9IHRoaXMub25FcnJvci5iaW5kKHRoaXMpO1xuICB9XG59O1xuXG5XUy5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChkYXRhLCBjb250aW51YXRpb24pIHtcbiAgdmFyIHRvU2VuZCA9IGRhdGEudGV4dCB8fCBkYXRhLmJpbmFyeSB8fCBkYXRhLmJ1ZmZlcixcbiAgICBlcnJjb2RlLFxuICAgIG1lc3NhZ2U7XG5cbiAgaWYgKHRvU2VuZCkge1xuICAgIHRyeSB7XG4gICAgICAvLyBGb3Igbm9kZS5qcywgd2UgaGF2ZSB0byBkbyB3ZWlyZCBidWZmZXIgc3R1ZmZcbiAgICAgIGlmICh0aGlzLmlzTm9kZSAmJiB0b1NlbmQgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICB0aGlzLndlYnNvY2tldC5zZW5kKFxuICAgICAgICAgIG5ldyBVaW50OEFycmF5KHRvU2VuZCksXG4gICAgICAgICAgeyBiaW5hcnk6IHRydWUgfSxcbiAgICAgICAgICB0aGlzLm9uRXJyb3IuYmluZCh0aGlzKVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy53ZWJzb2NrZXQuc2VuZCh0b1NlbmQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcbiAgICAgICAgZXJyY29kZSA9IFwiU1lOVEFYXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJjb2RlID0gXCJJTlZBTElEX1NUQVRFXCI7XG4gICAgICB9XG4gICAgICBtZXNzYWdlID0gZS5tZXNzYWdlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBlcnJjb2RlID0gXCJCQURfU0VORFwiO1xuICAgIG1lc3NhZ2UgPSBcIk5vIHRleHQsIGJpbmFyeSwgb3IgYnVmZmVyIGRhdGEgZm91bmQuXCI7XG4gIH1cblxuICBpZiAoZXJyY29kZSkge1xuICAgIGNvbnRpbnVhdGlvbih1bmRlZmluZWQsIHtcbiAgICAgIGVycmNvZGU6IGVycmNvZGUsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgY29udGludWF0aW9uKCk7XG4gIH1cbn07XG5cbldTLnByb3RvdHlwZS5nZXRSZWFkeVN0YXRlID0gZnVuY3Rpb24gKGNvbnRpbnVhdGlvbikge1xuICBjb250aW51YXRpb24odGhpcy53ZWJzb2NrZXQucmVhZHlTdGF0ZSk7XG59O1xuXG5XUy5wcm90b3R5cGUuZ2V0QnVmZmVyZWRBbW91bnQgPSBmdW5jdGlvbiAoY29udGludWF0aW9uKSB7XG4gIGNvbnRpbnVhdGlvbih0aGlzLndlYnNvY2tldC5idWZmZXJlZEFtb3VudCk7XG59O1xuXG5XUy5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoY29kZSwgcmVhc29uLCBjb250aW51YXRpb24pIHtcbiAgdHJ5IHtcbiAgICBpZiAoY29kZSAmJiByZWFzb24pIHtcbiAgICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKGNvZGUsIHJlYXNvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud2Vic29ja2V0LmNsb3NlKCk7XG4gICAgfVxuICAgIGNvbnRpbnVhdGlvbigpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdmFyIGVycm9yQ29kZTtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIFN5bnRheEVycm9yKSB7XG4gICAgICBlcnJvckNvZGUgPSBcIlNZTlRBWFwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvckNvZGUgPSBcIklOVkFMSURfQUNDRVNTXCI7XG4gICAgfVxuICAgIGNvbnRpbnVhdGlvbih1bmRlZmluZWQsIHtcbiAgICAgIGVycmNvZGU6IGVycm9yQ29kZSxcbiAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZVxuICAgIH0pO1xuICB9XG59O1xuXG5XUy5wcm90b3R5cGUub25PcGVuID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudCgnb25PcGVuJyk7XG59O1xuXG5XUy5wcm90b3R5cGUub25NZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50LCBmbGFncykge1xuICB2YXIgZGF0YSA9IHt9O1xuICBpZiAodGhpcy5pc05vZGUgJiYgZmxhZ3MgJiYgZmxhZ3MuYmluYXJ5KSB7XG4gICAgZGF0YS5idWZmZXIgPSBuZXcgVWludDhBcnJheShldmVudCkuYnVmZmVyO1xuICB9IGVsc2UgaWYgKHRoaXMuaXNOb2RlKSB7XG4gICAgZGF0YS50ZXh0ID0gZXZlbnQ7XG4gIH0gZWxzZSBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBldmVudC5kYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICBkYXRhLmJ1ZmZlciA9IGV2ZW50LmRhdGE7XG4gIH0gZWxzZSBpZiAodHlwZW9mIEJsb2IgIT09ICd1bmRlZmluZWQnICYmIGV2ZW50LmRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgZGF0YS5iaW5hcnkgPSBldmVudC5kYXRhO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBldmVudC5kYXRhID09PSAnc3RyaW5nJykge1xuICAgIGRhdGEudGV4dCA9IGV2ZW50LmRhdGE7XG4gIH1cbiAgdGhpcy5kaXNwYXRjaEV2ZW50KCdvbk1lc3NhZ2UnLCBkYXRhKTtcbn07XG5cbldTLnByb3RvdHlwZS5vbkVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIC8vIE5vdGhpbmcgdG8gcGFzcyBvblxuICAvLyBTZWU6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE4ODA0Mjk4LzMwMDUzOVxuICB0aGlzLmRpc3BhdGNoRXZlbnQoJ29uRXJyb3InKTtcbn07XG5cbldTLnByb3RvdHlwZS5vbkNsb3NlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHRoaXMuZGlzcGF0Y2hFdmVudCgnb25DbG9zZScsXG4gICAgICAgICAgICAgICAgICAgICB7Y29kZTogZXZlbnQuY29kZSxcbiAgICAgICAgICAgICAgICAgICAgICByZWFzb246IGV2ZW50LnJlYXNvbixcbiAgICAgICAgICAgICAgICAgICAgICB3YXNDbGVhbjogZXZlbnQud2FzQ2xlYW59KTtcbn07XG5cbmV4cG9ydHMucHJvdmlkZXIgPSBXUztcbmV4cG9ydHMubmFtZSA9ICdjb3JlLndlYnNvY2tldCc7XG5leHBvcnRzLnNldFNvY2tldCA9IGZ1bmN0aW9uKGltcGwsIGlzTm9kZSkge1xuICBXU0hhbmRsZSA9IGltcGw7XG4gIG5vZGVTdHlsZSA9IGlzTm9kZTtcbn07XG4iLCIvKmpzbGludCBpbmRlbnQ6Mixicm93c2VyOnRydWUsIG5vZGU6dHJ1ZSAqL1xudmFyIFByb21pc2VDb21wYXQgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG5cbnZhciBvQXV0aFJlZGlyZWN0SWQgPSAnZnJlZWRvbS5vYXV0aC5yZWRpcmVjdC5oYW5kbGVyJztcblxudmFyIGxvYWRlZE9uU3RhcnR1cCA9IGZhbHNlO1xuLyoqXG4gKiBJZiB0aGVyZSBpcyByZWRpcmVjdGlvbiBiYWNrIHRvIHRoZSBwYWdlLCBhbmQgb0F1dGhSZWRpcmVjdElEIGlzIHNldCxcbiAqIHRoZW4gcmVwb3J0IHRoZSBhdXRoIGFuZCBjbG9zZSB0aGUgd2luZG93LlxuICovXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93ICYmIHdpbmRvdy5sb2NhdGlvbiAmJlxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGxvYWRlZE9uU3RhcnR1cCA9IHRydWU7XG4gIH0sIHRydWUpO1xuXG4gIGlmICh3aW5kb3cubG9jYWxTdG9yYWdlICYmXG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKG9BdXRoUmVkaXJlY3RJZCkgPiAwKSB7XG4gICAgLy8gVGhpcyB3aWxsIHRyaWdnZXIgYSAnc3RvcmFnZScgZXZlbnQgb24gdGhlIHdpbmRvdy4gU2VlIHN0b3JhZ2VMaXN0ZW5lclxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShvQXV0aFJlZGlyZWN0SWQsIG5ldyBEYXRlKCkpO1xuICAgIHdpbmRvdy5jbG9zZSgpO1xuICB9XG59XG5cbnZhciBMb2NhbFBhZ2VBdXRoID0gZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB0aGlzLmxpc3RlbmVycyA9IHt9O1xufTtcblxuLyoqXG4gKiBJbmRpY2F0ZSB0aGUgaW50ZW50aW9uIHRvIGluaXRpYXRlIGFuIG9BdXRoIGZsb3csIGFsbG93aW5nIGFuIGFwcHJvcHJpYXRlXG4gKiBvQXV0aCBwcm92aWRlciB0byBiZWdpbiBtb25pdG9yaW5nIGZvciByZWRpcmVjdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGluaXRpYXRlT0F1dGhcbiAqIEBwYXJhbSB7c3RyaW5nW119IHJlZGlyZWN0VVJJcyAtIG9BdXRoIHJlZGlyZWN0aW9uIFVSSXMgcmVnaXN0ZXJlZCB3aXRoIHRoZVxuICogICAgIHByb3ZpZGVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29udGludWF0aW9uIC0gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIGNvbXBsZXRlXG4gKiAgICBFeHBlY3RlZCB0byBzZWUgYSB2YWx1ZSBvZiBzY2hlbWE6IHt7cmVkaXJlY3Q6U3RyaW5nLCBzdGF0ZTpTdHJpbmd9fVxuICogICAgd2hlcmUgJ3JlZGlyZWN0JyBpcyB0aGUgY2hvc2VuIHJlZGlyZWN0IFVSSVxuICogICAgYW5kICdzdGF0ZScgaXMgdGhlIHN0YXRlIHRvIHBhc3MgdG8gdGhlIFVSSSBvbiBjb21wbGV0aW9uIG9mIG9BdXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlIGlmIGNhbiBoYW5kbGUsIGZhbHNlIG90aGVyd2lzZVxuICovXG5Mb2NhbFBhZ2VBdXRoLnByb3RvdHlwZS5pbml0aWF0ZU9BdXRoID0gZnVuY3Rpb24ocmVkaXJlY3RVUklzLCBjb250aW51YXRpb24pIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cgJiYgbG9hZGVkT25TdGFydHVwKSB7XG4gICAgdmFyIGhlcmUgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcbiAgICBpZiAocmVkaXJlY3RVUklzLmluZGV4T2YoaGVyZSkgPiAtMSkge1xuICAgICAgY29udGludWF0aW9uKHtcbiAgICAgICAgcmVkaXJlY3Q6IGhlcmUsXG4gICAgICAgIHN0YXRlOiBvQXV0aFJlZGlyZWN0SWQgKyBNYXRoLnJhbmRvbSgpXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogb0F1dGggY2xpZW50LXNpZGUgZmxvdyAtIGxhdW5jaCB0aGUgcHJvdmlkZWQgVVJMXG4gKiBUaGlzIG11c3QgYmUgY2FsbGVkIGFmdGVyIGluaXRpYXRlT0F1dGggd2l0aCB0aGUgcmV0dXJuZWQgc3RhdGUgb2JqZWN0XG4gKlxuICogQG1ldGhvZCBsYXVuY2hBdXRoRmxvd1xuICogQHBhcmFtIHtTdHJpbmd9IGF1dGhVcmwgLSBUaGUgVVJMIHRoYXQgaW5pdGlhdGVzIHRoZSBhdXRoIGZsb3cuXG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBzdGF0ZU9iaiAtIFRoZSByZXR1cm4gdmFsdWUgZnJvbSBpbml0aWF0ZU9BdXRoXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb250aW51YXRpb24gLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gY29tcGxldGVcbiAqICAgIEV4cGVjdGVkIHRvIHNlZSBhIFN0cmluZyB2YWx1ZSB0aGF0IGlzIHRoZSByZXNwb25zZSBVcmwgY29udGFpbmluZyB0aGUgYWNjZXNzIHRva2VuXG4gKi9cbkxvY2FsUGFnZUF1dGgucHJvdG90eXBlLmxhdW5jaEF1dGhGbG93ID0gZnVuY3Rpb24oYXV0aFVybCwgc3RhdGVPYmosIGNvbnRpbnVhdGlvbikge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIGxpc3RlbmVyID0gdGhpcy5zdG9yYWdlTGlzdGVuZXIuYmluZCh0aGlzLCBjb250aW51YXRpb24sIHN0YXRlT2JqKTtcbiAgdGhpcy5saXN0ZW5lcnNbc3RhdGVPYmouc3RhdGVdID0gbGlzdGVuZXI7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwic3RvcmFnZVwiLCBsaXN0ZW5lciwgZmFsc2UpO1xuICAvLyBTdGFydCAnZXIgdXBcbiAgd2luZG93Lm9wZW4oYXV0aFVybCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXIgZm9yIHN0b3JhZ2UgZXZlbnRzLCB3aGljaCByZWxheXMgdGhlbSB0byB3YWl0aW5nIGNsaWVudHMuXG4gKiBGb3IgdGhlIHNjaGVtYSBvZiB0aGUgc3RvcmFnZSBtc2csIHNlZTpcbiAqIGh0dHA6Ly90dXRvcmlhbHMuamVua292LmNvbS9odG1sNS9sb2NhbC1zdG9yYWdlLmh0bWwjc3RvcmFnZS1ldmVudHNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnRpbnVhdGlvbiBmdW5jdGlvbiB0byBjYWxsIHdpdGggcmVzdWx0XG4gKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBzdGF0ZU9iaiB0aGUgcmV0dXJuIHZhbHVlIGZyb20gaW5pdGlhdGVPQXV0aFxuICogQHBhcmFtIHtPYmplY3R9IG1zZyBzdG9yYWdlIGV2ZW50XG4gKi9cbkxvY2FsUGFnZUF1dGgucHJvdG90eXBlLnN0b3JhZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uKGNvbnRpbnVhdGlvbiwgc3RhdGVPYmosIG1zZykge1xuICAndXNlIHN0cmljdCc7XG4gIGlmIChtc2cudXJsLmluZGV4T2Yoc3RhdGVPYmouc3RhdGUpID4gLTEpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInN0b3JhZ2VcIiwgdGhpcy5saXN0ZW5lcnNbc3RhdGVPYmouc3RhdGVdLCBmYWxzZSk7XG4gICAgZGVsZXRlIHRoaXMubGlzdGVuZXJzW3N0YXRlT2JqLnN0YXRlXTtcbiAgICBjb250aW51YXRpb24obXNnLnVybCk7XG4gIH1cbn07XG5cbi8qKlxuICogSWYgd2UgaGF2ZSBhIGxvY2FsIGRvbWFpbiwgYW5kIGZyZWVkb20uanMgaXMgbG9hZGVkIGF0IHN0YXJ0dXAsIHdlIGNhbiB1c2VcbiAqIHRoZSBsb2NhbCBwYWdlIGFzIGEgcmVkaXJlY3QgVVJJLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsUGFnZUF1dGg7XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBpbmRlbnQ6Mixicm93c2VyOnRydWUsIG5vZGU6dHJ1ZSAqL1xudmFyIFByb21pc2VDb21wYXQgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG5cbnZhciBvQXV0aFJlZGlyZWN0SWQgPSAnZnJlZWRvbS5vYXV0aC5yZWRpcmVjdC5oYW5kbGVyJztcblxuZnVuY3Rpb24gUmVtb3RlUGFnZUF1dGgoKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB0aGlzLmxpc3RlbmVycyA9IHt9O1xufVxuXG4vKipcbiAqIEluZGljYXRlIHRoZSBpbnRlbnRpb24gdG8gaW5pdGlhdGUgYW4gb0F1dGggZmxvdywgYWxsb3dpbmcgYW4gYXBwcm9wcmlhdGVcbiAqIG9BdXRoIHByb3ZpZGVyIHRvIGJlZ2luIG1vbml0b3JpbmcgZm9yIHJlZGlyZWN0aW9uLlxuICpcbiAqIEBtZXRob2QgaW5pdGlhdGVPQXV0aFxuICogQHBhcmFtIHtzdHJpbmdbXX0gcmVkaXJlY3RVUklzIC0gb0F1dGggcmVkaXJlY3Rpb24gVVJJcyByZWdpc3RlcmVkIHdpdGggdGhlXG4gKiAgICAgcHJvdmlkZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb250aW51YXRpb24gLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gY29tcGxldGVcbiAqICAgIEV4cGVjdGVkIHRvIHNlZSBhIHZhbHVlIG9mIHNjaGVtYToge3tyZWRpcmVjdDpTdHJpbmcsIHN0YXRlOlN0cmluZ319XG4gKiAgICB3aGVyZSAncmVkaXJlY3QnIGlzIHRoZSBjaG9zZW4gcmVkaXJlY3QgVVJJXG4gKiAgICBhbmQgJ3N0YXRlJyBpcyB0aGUgc3RhdGUgdG8gcGFzcyB0byB0aGUgVVJJIG9uIGNvbXBsZXRpb24gb2Ygb0F1dGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWUgaWYgY2FuIGhhbmRsZSwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cblJlbW90ZVBhZ2VBdXRoLnByb3RvdHlwZS5pbml0aWF0ZU9BdXRoID0gZnVuY3Rpb24ocmVkaXJlY3RVUklzLCBjb250aW51YXRpb24pIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyAmJiBnbG9iYWwgJiYgZ2xvYmFsLmRvY3VtZW50KSB7XG4gICAgZm9yICh2YXIgaT0wOyBpPHJlZGlyZWN0VVJJcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIHJlc3RyaWN0aW9uIG9uIFVSTCBwYXR0ZXJuIG1hdGNoLlxuICAgICAgaWYgKChyZWRpcmVjdFVSSXNbaV0uaW5kZXhPZignaHR0cDovLycpID09PSAwIHx8XG4gICAgICAgICAgcmVkaXJlY3RVUklzW2ldLmluZGV4T2YoJ2h0dHBzOi8vJykgPT09IDApICYmXG4gICAgICAgICAgcmVkaXJlY3RVUklzW2ldLmluZGV4T2YoJ29hdXRoLXJlbGF5Lmh0bWwnKSA+IDApIHtcbiAgICAgICAgY29udGludWF0aW9uKHtcbiAgICAgICAgICByZWRpcmVjdDogcmVkaXJlY3RVUklzW2ldLFxuICAgICAgICAgIHN0YXRlOiBvQXV0aFJlZGlyZWN0SWQgKyBNYXRoLnJhbmRvbSgpXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBvQXV0aCBjbGllbnQtc2lkZSBmbG93IC0gbGF1bmNoIHRoZSBwcm92aWRlZCBVUkxcbiAqIFRoaXMgbXVzdCBiZSBjYWxsZWQgYWZ0ZXIgaW5pdGlhdGVPQXV0aCB3aXRoIHRoZSByZXR1cm5lZCBzdGF0ZSBvYmplY3RcbiAqXG4gKiBAbWV0aG9kIGxhdW5jaEF1dGhGbG93XG4gKiBAcGFyYW0ge1N0cmluZ30gYXV0aFVybCAtIFRoZSBVUkwgdGhhdCBpbml0aWF0ZXMgdGhlIGF1dGggZmxvdy5cbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsIHN0cmluZz59IHN0YXRlT2JqIC0gVGhlIHJldHVybiB2YWx1ZSBmcm9tIGluaXRpYXRlT0F1dGhcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnRpbnVhdGlvbiAtIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBjb21wbGV0ZVxuICogICAgRXhwZWN0ZWQgdG8gc2VlIGEgU3RyaW5nIHZhbHVlIHRoYXQgaXMgdGhlIHJlc3BvbnNlIFVybCBjb250YWluaW5nIHRoZSBhY2Nlc3MgdG9rZW5cbiAqL1xuUmVtb3RlUGFnZUF1dGgucHJvdG90eXBlLmxhdW5jaEF1dGhGbG93ID0gZnVuY3Rpb24oYXV0aFVybCwgc3RhdGVPYmosIGNvbnRpbnVhdGlvbikge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIGZyYW1lID0gZ2xvYmFsLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICBmcmFtZS5zcmMgPSBzdGF0ZU9iai5yZWRpcmVjdDtcbiAgZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblxuICBnbG9iYWwuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmcmFtZSk7XG4gIGZyYW1lLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5saXN0ZW5lcnNbc3RhdGVPYmouc3RhdGVdID0gY29udGludWF0aW9uO1xuICAgIHdpbmRvdy5vcGVuKGF1dGhVcmwpO1xuXG4gICAgZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZShzdGF0ZU9iai5zdGF0ZSwgJyonKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChmcmFtZSwgbXNnKSB7XG4gICAgaWYgKG1zZy5kYXRhICYmIG1zZy5kYXRhLmtleSAmJiBtc2cuZGF0YS51cmwgJiYgdGhpcy5saXN0ZW5lcnNbbXNnLmRhdGEua2V5XSkge1xuICAgICAgdGhpcy5saXN0ZW5lcnNbbXNnLmRhdGEua2V5XShtc2cuZGF0YS51cmwpO1xuICAgICAgZGVsZXRlIHRoaXMubGlzdGVuZXJzW21zZy5kYXRhLmtleV07XG4gICAgICB0cnkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGZyYW1lKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgfVxuICAgIH1cbiAgfS5iaW5kKHRoaXMsIGZyYW1lKSwgZmFsc2UpO1xufTtcblxuLyoqXG4gKiBJZiB3ZSBoYXZlIGEgbG9jYWwgZG9tYWluLCBhbmQgZnJlZWRvbS5qcyBpcyBsb2FkZWQgYXQgc3RhcnR1cCwgd2UgY2FuIHVzZVxuICogdGhlIGxvY2FsIHBhZ2UgYXMgYSByZWRpcmVjdCBVUkkuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gUmVtb3RlUGFnZUF1dGg7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qanNsaW50IGluZGVudDoyLHdoaXRlOnRydWUsbm9kZTp0cnVlLHNsb3BweTp0cnVlICovXG52YXIgUHJvbWlzZUNvbXBhdCA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcblxuLyoqXG4gKiBUaGUgQVBJIHJlZ2lzdHJ5IGZvciBmcmVlZG9tLmpzLiAgVXNlZCB0byBsb29rIHVwIHJlcXVlc3RlZCBBUElzLFxuICogYW5kIHByb3ZpZGVzIGEgYnJpZGdlIGZvciBjb3JlIEFQSXMgdG8gYWN0IGxpa2Ugbm9ybWFsIEFQSXMuXG4gKiBAQ2xhc3MgQVBJXG4gKiBAcGFyYW0ge0RlYnVnfSBkZWJ1ZyBUaGUgZGVidWdnZXIgdG8gdXNlIGZvciBsb2dnaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBBcGkgPSBmdW5jdGlvbihkZWJ1Zykge1xuICB0aGlzLmRlYnVnID0gZGVidWc7XG4gIHRoaXMuYXBpcyA9IHt9O1xuICB0aGlzLnByb3ZpZGVycyA9IHt9O1xuICB0aGlzLndhaXRlcnMgPSB7fTtcbn07XG5cbi8qKlxuICogR2V0IGFuIEFQSS5cbiAqIEBtZXRob2QgZ2V0XG4gKiBAcGFyYW0ge1N0cmluZ30gYXBpIFRoZSBBUEkgbmFtZSB0byBnZXQuXG4gKiBAcmV0dXJucyB7e25hbWU6U3RyaW5nLCBkZWZpbml0aW9uOkFQSX19IFRoZSBBUEkgaWYgcmVnaXN0ZXJlZC5cbiAqL1xuQXBpLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihhcGkpIHtcbiAgaWYgKCF0aGlzLmFwaXNbYXBpXSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6IGFwaSxcbiAgICBkZWZpbml0aW9uOiB0aGlzLmFwaXNbYXBpXVxuICB9O1xufTtcblxuLyoqXG4gKiBTZXQgYW4gQVBJIHRvIGEgZGVmaW5pdGlvbi5cbiAqIEBtZXRob2Qgc2V0XG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgQVBJIG5hbWUuXG4gKiBAcGFyYW0ge0FQSX0gZGVmaW5pdGlvbiBUaGUgSlNPTiBvYmplY3QgZGVmaW5pbmcgdGhlIEFQSS5cbiAqL1xuQXBpLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gIHRoaXMuYXBpc1tuYW1lXSA9IGRlZmluaXRpb247XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgY29yZSBBUEkgcHJvdmlkZXIuXG4gKiBAbWV0aG9kIHJlZ2lzdGVyXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgQVBJIG5hbWUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvciB0aGUgZnVuY3Rpb24gdG8gY3JlYXRlIGEgcHJvdmlkZXIgZm9yIHRoZSBBUEkuXG4gKiBAcGFyYW0ge1N0cmluZz99IHN0eWxlIFRoZSBzdHlsZSB0aGUgcHJvdmlkZXIgaXMgd3JpdHRlbiBpbi4gVmFsaWQgc3R5bGVzXG4gKiAgIGFyZSBkb2N1bWVudGVkIGluIGZkb20ucG9ydC5Qcm92aWRlci5wcm90b3R5cGUuZ2V0SW50ZXJmYWNlLiBEZWZhdWx0cyB0b1xuICogICBwcm92aWRlQXN5bmNocm9ub3VzXG4gKi9cbkFwaS5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBjb25zdHJ1Y3Rvciwgc3R5bGUpIHtcbiAgdmFyIGk7XG5cbiAgdGhpcy5wcm92aWRlcnNbbmFtZV0gPSB7XG4gICAgY29uc3RydWN0b3I6IGNvbnN0cnVjdG9yLFxuICAgIHN0eWxlOiBzdHlsZSB8fCAncHJvdmlkZUFzeW5jaHJvbm91cydcbiAgfTtcblxuICBpZiAodGhpcy53YWl0ZXJzW25hbWVdKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMud2FpdGVyc1tuYW1lXS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdGhpcy53YWl0ZXJzW25hbWVdW2ldLnJlc29sdmUoY29uc3RydWN0b3IuYmluZCh7fSxcbiAgICAgICAgICB0aGlzLndhaXRlcnNbbmFtZV1baV0uZnJvbSkpO1xuICAgIH1cbiAgICBkZWxldGUgdGhpcy53YWl0ZXJzW25hbWVdO1xuICB9XG59O1xuXG4vKipcbiAqIEdldCBhIGNvcmUgQVBJIGNvbm5lY3RlZCB0byBhIGdpdmVuIEZyZWVET00gbW9kdWxlLlxuICogQG1ldGhvZCBnZXRDb3JlXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgQVBJIHRvIHJldHJpZXZlLlxuICogQHBhcmFtIHtwb3J0LkFwcH0gZnJvbSBUaGUgaW5zdGFudGlhdGluZyBBcHAuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIG9mIGEgZmRvbS5BcHAgbG9vay1hbGlrZSBtYXRjaGluZ1xuICogYSBsb2NhbCBBUEkgZGVmaW5pdGlvbi5cbiAqL1xuQXBpLnByb3RvdHlwZS5nZXRDb3JlID0gZnVuY3Rpb24obmFtZSwgZnJvbSkge1xuICByZXR1cm4gbmV3IFByb21pc2VDb21wYXQoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKHRoaXMuYXBpc1tuYW1lXSkge1xuICAgICAgaWYgKHRoaXMucHJvdmlkZXJzW25hbWVdKSB7XG4gICAgICAgIHJlc29sdmUodGhpcy5wcm92aWRlcnNbbmFtZV0uY29uc3RydWN0b3IuYmluZCh7fSwgZnJvbSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF0aGlzLndhaXRlcnNbbmFtZV0pIHtcbiAgICAgICAgICB0aGlzLndhaXRlcnNbbmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndhaXRlcnNbbmFtZV0ucHVzaCh7XG4gICAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgICByZWplY3Q6IHJlamVjdCxcbiAgICAgICAgICBmcm9tOiBmcm9tXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlYnVnLndhcm4oJ0FwaS5nZXRDb3JlIGFza2VkIGZvciB1bmtub3duIGNvcmU6ICcgKyBuYW1lKTtcbiAgICAgIHJlamVjdChudWxsKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgc3R5bGUgaW4gd2hpY2ggYSBjb3JlIEFQSSBpcyB3cml0dGVuLlxuICogVGhpcyBtZXRob2QgaXMgZ3VhcmFudGVlZCB0byBrbm93IHRoZSBzdHlsZSBvZiBhIHByb3ZpZGVyIHJldHVybmVkIGZyb21cbiAqIGEgcHJldmlvdXMgZ2V0Q29yZSBjYWxsLCBhbmQgc28gZG9lcyBub3QgdXNlIHByb21pc2VzLlxuICogQG1ldGhvZCBnZXRJbnRlcmZhY2VTdHlsZVxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHByb3ZpZGVyLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIGNvZGluZyBzdHlsZSwgYXMgdXNlZCBieVxuICogICBmZG9tLnBvcnQuUHJvdmlkZXIucHJvdG90eXBlLmdldEludGVyZmFjZS5cbiAqL1xuQXBpLnByb3RvdHlwZS5nZXRJbnRlcmZhY2VTdHlsZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKHRoaXMucHJvdmlkZXJzW25hbWVdKSB7XG4gICAgcmV0dXJuIHRoaXMucHJvdmlkZXJzW25hbWVdLnN0eWxlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGVidWcud2FybignQXBpLmdldEludGVyZmFjZVN0eWxlIGZvciB1bmtub3duIHByb3ZpZGVyOiAnICsgbmFtZSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufTtcblxuLyoqXG4gKiBEZWZpbmVzIHRoZSBhcGlzIG1vZHVsZSBhbmQgcHJvdmlkZXIgcmVnaXN0cnkuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQXBpO1xuIiwiLypqc2xpbnQgaW5kZW50OjIsbm9kZTp0cnVlICovXG52YXIgaW5jbHVkZUZvbGRlciA9IHVuZGVmaW5lZDtcbnZhciBtaW5pZnkgPSByZXF1aXJlKCdub2RlLWpzb24tbWluaWZ5Jyk7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBCdW5kbGUgPSBmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGZvdW5kO1xuICB0aGlzLmludGVyZmFjZXMgPSBbXTtcbiAgLypqc2xpbnQgbm9tZW46IHRydWUgKi9cbiAgdHJ5IHtcbiAgICBmb3VuZCA9IChmdW5jdGlvbigpe3ZhciBzZWxmPXt9LGZzID0gcmVxdWlyZSgnZnMnKTtcbnNlbGYuY29uc29sZSA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29uc29sZVxcXCIsXFxuICBcXFwiYXBpXFxcIjoge1xcbiAgICAvLyBMb2coc291cmNlLCBtZXNzYWdlKVxcbiAgICBcXFwibG9nXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIiwgXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgXFxcImRlYnVnXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIiwgXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgXFxcImluZm9cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwic3RyaW5nXFxcIl19LFxcbiAgICBcXFwid2FyblxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIFxcXCJzdHJpbmdcXFwiXX0sXFxuICAgIFxcXCJlcnJvclxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIFxcXCJzdHJpbmdcXFwiXX1cXG4gIH1cXG59XFxuXCI7XG5zZWxmLmNvcmVDb25zb2xlID0gXCJ7XFxuICBcXFwibmFtZVxcXCI6IFxcXCJjb3JlLmNvbnNvbGVcXFwiLFxcbiAgXFxcImFwaVxcXCI6IHtcXG4gICAgLy8gTG9nKHNvdXJjZSwgbWVzc2FnZSlcXG4gICAgXFxcImxvZ1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIFxcXCJzdHJpbmdcXFwiXX0sXFxuICAgIFxcXCJkZWJ1Z1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIFxcXCJzdHJpbmdcXFwiXX0sXFxuICAgIFxcXCJpbmZvXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIiwgXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgXFxcIndhcm5cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwic3RyaW5nXFxcIl19LFxcbiAgICBcXFwiZXJyb3JcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwic3RyaW5nXFxcIl19XFxuICB9XFxufVxcblwiO1xuc2VsZi5jb3JlRWNobyA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS5lY2hvXFxcIixcXG4gIFxcXCJhcGlcXFwiOiB7XFxuICAgIFxcXCJzZXR1cFxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgXFxcInNlbmRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXX0sXFxuICAgIFxcXCJtZXNzYWdlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogXFxcInN0cmluZ1xcXCJ9XFxuICB9XFxufVwiO1xuc2VsZi5jb3JlID0gXCJ7XFxuICBcXFwibmFtZVxcXCI6IFxcXCJjb3JlXFxcIixcXG4gIFxcXCJhcGlcXFwiOiB7XFxuICAgIFxcXCJjcmVhdGVDaGFubmVsXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjoge1xcbiAgICAgIFxcXCJjaGFubmVsXFxcIjogXFxcInByb3h5XFxcIixcXG4gICAgICBcXFwiaWRlbnRpZmllclxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgIH19LFxcbiAgICBcXFwiYmluZENoYW5uZWxcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXSwgXFxcInJldFxcXCI6IFxcXCJwcm94eVxcXCJ9LFxcbiAgICBcXFwiZ2V0SWRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBbXFxcImFycmF5XFxcIiwgXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgXFxcImdldExvZ2dlclxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLCBcXFwicmV0XFxcIjogXFxcInByb3h5XFxcIn1cXG4gIH1cXG59XFxuXCI7XG5zZWxmLmNvcmVPYXV0aCA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS5vYXV0aFxcXCIsXFxuICBcXFwiYXBpXFxcIjoge1xcbiAgICAvKipcXG4gICAgICogSW5kaWNhdGUgdGhlIGludGVudGlvbiB0byBpbml0aWF0ZSBhbiBvQXV0aCBmbG93LCBhbGxvd2luZyBhbiBhcHByb3ByaWF0ZVxcbiAgICAgKiBvQXV0aCBwcm92aWRlciB0byBiZWdpbiBtb25pdG9yaW5nIGZvciByZWRpcmVjdGlvbi5cXG4gICAgICogVGhpcyB3aWxsIGdlbmVyYXRlIGEgdG9rZW4sIHdoaWNoIG11c3QgYmUgcGFzc2VkIHRvIHRoZSBzaW5nbGUgc3Vic2VxdWVudCBjYWxsXFxuICAgICAqIHRvIGxhdW5jaEF1dGhGbG93LiBcXG4gICAgICogXFxuICAgICAqIFxcbiAgICAgKiBAbWV0aG9kIGluaXRpYXRlT0F1dGhcXG4gICAgICogQHBhcmFtIHtTdHJpbmdbXX0gVmFsaWQgb0F1dGggcmVkaXJlY3QgVVJJcyBmb3IgeW91ciBhcHBsaWNhdGlvblxcbiAgICAgKiBAcmV0dXJuIHt7cmVkaXJlY3Q6IFN0cmluZywgc3RhdGU6IFN0cmluZ319IEEgY2hvc2VuIHJlZGlyZWN0IFVSSSBhbmRcXG4gICAgICogICBzdGF0ZSB3aGljaCB3aWxsIGJlIG1vbml0b3JlZCBmb3Igb0F1dGggcmVkaXJlY3Rpb24gaWYgYXZhaWxhYmxlXFxuICAgICAqKi9cXG4gICAgXFxcImluaXRpYXRlT0F1dGhcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbW1xcXCJhcnJheVxcXCIsIFxcXCJzdHJpbmdcXFwiXV0sXFxuICAgICAgXFxcInJldFxcXCI6IHtcXG4gICAgICAgIFxcXCJyZWRpcmVjdFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcInN0YXRlXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICB9LFxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gIFxcbiAgICAvKipcXG4gICAgICogb0F1dGggY2xpZW50LXNpZGUgZmxvdyAtIGxhdW5jaCB0aGUgcHJvdmlkZWQgVVJMXFxuICAgICAqIFRoaXMgbXVzdCBiZSBjYWxsZWQgYWZ0ZXIgaW5pdGlhdGVPQXV0aCB3aXRoIHRoZSByZXR1cm5lZCBzdGF0ZSBvYmplY3RcXG4gICAgICpcXG4gICAgICogQG1ldGhvZCBsYXVuY2hBdXRoRmxvd1xcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gVGhlIFVSTCB0aGF0IGluaXRpYXRlcyB0aGUgYXV0aCBmbG93LlxcbiAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBUaGUgcmV0dXJuIHZhbHVlIGZyb20gaW5pdGlhdGVPQXV0aFxcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IHJlc3BvbnNlVXJsIC0gY29udGFpbmluZyB0aGUgYWNjZXNzIHRva2VuXFxuICAgICAqL1xcbiAgICBcXFwibGF1bmNoQXV0aEZsb3dcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIHtcXG4gICAgICAgIFxcXCJyZWRpcmVjdFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcInN0YXRlXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICB9XSxcXG4gICAgICBcXFwicmV0XFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9XFxuICB9XFxufVxcblwiO1xuc2VsZi5jb3JlUGVlcmNvbm5lY3Rpb24gPSBcIntcXG4gIFxcXCJuYW1lXFxcIjogXFxcImNvcmUucGVlcmNvbm5lY3Rpb25cXFwiLFxcbiAgXFxcImFwaVxcXCI6IHtcXG4gICAgLy8gU2V0dXAgdGhlIGxpbmsgdG8gdGhlIHBlZXIgYW5kIG9wdGlvbnMgZm9yIHRoaXMgcGVlciBjb25uZWN0aW9uLlxcbiAgICBcXFwic2V0dXBcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxuICAgICAgICAvLyBUaGUgZnJlZWRvbS5qcyBjaGFubmVsIGlkZW50aWZpZXIgdXNlZCB0byBzZXR1cCBhIHNpZ25hbGxpbmcgY2hhbmVsLlxcbiAgICAgICAgXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICAvLyBUaGUgcGVlck5hbWUsIHVzZWQgZGVidWdnaW5nIGFuZCBjb25zb2xlIG1lc3NhZ2VzLlxcbiAgICAgICAgXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICAvLyBUaGUgbGlzdCBvZiBTVFVOIHNlcnZlcnMgdG8gdXNlLlxcbiAgICAgICAgLy8gVGhlIGZvcm1hdCBvZiBhIHNpbmdsZSBlbnRyeSBpcyBzdHVuOkhPU1Q6UE9SVCwgd2hlcmUgSE9TVFxcbiAgICAgICAgLy8gYW5kIFBPUlQgYXJlIGEgc3R1biBzZXJ2ZXIgaG9zdG5hbWUgYW5kIHBvcnQsIHJlc3BlY3RpdmVseS5cXG4gICAgICAgIFtcXFwiYXJyYXlcXFwiLCBcXFwic3RyaW5nXFxcIl0sXFxuICAgICAgICAvLyBXaGV0aGVyIHRvIGltbWVkaWF0ZWx5IGluaXRpYXRlIGEgY29ubmVjdGlvbiBiZWZvcmUgZnVsZmlsbGluZyByZXR1cm5cXG4gICAgICAgIC8vIHByb21pc2UuXFxuICAgICAgICBcXFwiYm9vbGVhblxcXCJcXG4gICAgICBdXFxuICAgIH0sXFxuICBcXG4gICAgLy8gU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIHBlZXIuXFxuICAgIFxcXCJzZW5kXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFt7XFxuICAgICAgLy8gRGF0YSBjaGFubmVsIGlkLiBJZiBwcm92aWRlZCwgd2lsbCBiZSB1c2VkIGFzIHRoZSBjaGFubmVsIGxhYmVsLlxcbiAgICAgIC8vIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWQgaWYgdGhlIGNoYW5uZWwgbGFiZWwgZG9lc24ndCBleGlzdC5cXG4gICAgICBcXFwiY2hhbm5lbExhYmVsXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgLy8gT25lIG9mIHRoZSBiZWxsb3cgc2hvdWxkIGJlIGRlZmluZWQ7IHRoaXMgaXMgdGhlIGRhdGEgdG8gc2VuZC5cXG4gICAgICBcXFwidGV4dFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJiaW5hcnlcXFwiOiBcXFwiYmxvYlxcXCIsXFxuICAgICAgXFxcImJ1ZmZlclxcXCI6IFxcXCJidWZmZXJcXFwiXFxuICAgIH1dfSxcXG4gIFxcbiAgICAvLyBDYWxsZWQgd2hlbiB3ZSBnZXQgYSBtZXNzYWdlIGZyb20gdGhlIHBlZXIuXFxuICAgIFxcXCJvblJlY2VpdmVkXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIC8vIFRoZSBsYWJlbC9pZCBvZiB0aGUgZGF0YSBjaGFubmVsLlxcbiAgICAgIFxcXCJjaGFubmVsTGFiZWxcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAvLyBPbmUgdGhlIGJlbG93IHdpbGwgYmUgc3BlY2lmaWVkLlxcbiAgICAgIFxcXCJ0ZXh0XFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcImJpbmFyeVxcXCI6IFxcXCJibG9iXFxcIixcXG4gICAgICBcXFwiYnVmZmVyXFxcIjogXFxcImJ1ZmZlclxcXCJcXG4gICAgfX0sXFxuICBcXG4gICAgLy8gT3BlbiB0aGUgZGF0YSBjaGFubmVsIHdpdGggdGhpcyBsYWJlbC5cXG4gICAgXFxcIm9wZW5EYXRhQ2hhbm5lbFxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgLy8gQ2xvc2UgdGhlIGRhdGEgY2hhbm5lbCB3aXRoIHRoaXMgbGFiZWwuXFxuICAgIFxcXCJjbG9zZURhdGFDaGFubmVsXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIl19LFxcbiAgXFxuICAgIC8vIEEgY2hhbm5lbCB3aXRoIHRoaXMgaWQgaGFzIGJlZW4gb3BlbmVkLlxcbiAgICBcXFwib25PcGVuRGF0YUNoYW5uZWxcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLCBcXFwidmFsdWVcXFwiOiB7XFxcImNoYW5uZWxJZFxcXCI6IFxcXCJzdHJpbmdcXFwifX0sXFxuICAgIC8vIFRoZSBjaGFubmFsZSB3aXRoIHRoaXMgaWQgaGFzIGJlZW4gY2xvc2VkLlxcbiAgICBcXFwib25DbG9zZURhdGFDaGFubmVsXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcXCJjaGFubmVsSWRcXFwiOiBcXFwic3RyaW5nXFxcIn19LFxcbiAgXFxuICAgIC8vIFJldHVybnMgdGhlIG51bWJlciBvZiBieXRlcyB0aGF0IGhhdmUgcXVldWVkIHVzaW5nIFxcXCJzZW5kXFxcIiwgYnV0IG5vdFxcbiAgICAvLyB5ZXQgc2VudCBvdXQuIEN1cnJlbnRseSBqdXN0IGV4cG9zZXM6XFxuICAgIC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL3dlYnJ0Yy8jd2lkbC1SVENEYXRhQ2hhbm5lbC1idWZmZXJlZEFtb3VudFxcbiAgICBcXFwiZ2V0QnVmZmVyZWRBbW91bnRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIl0sXFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcXFwicmV0XFxcIjogXFxcIm51bWJlclxcXCJ9LFxcbiAgXFxuICAgIC8vIFJldHVybnMgbG9jYWwgU0RQIGhlYWRlcnMgZnJvbSBjcmVhdGVPZmZlci5cXG4gICAgXFxcImdldEluZm9cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwic3RyaW5nXFxcIn0sXFxuICBcXG4gICAgXFxcImNyZWF0ZU9mZmVyXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW3tcXG4gICAgICAgIC8vIE9wdGlvbmFsIDpSVENPZmZlck9wdGlvbnMgb2JqZWN0LlxcbiAgICAgICAgXFxcIm9mZmVyVG9SZWNlaXZlVmlkZW9cXFwiOiBcXFwibnVtYmVyXFxcIixcXG4gICAgICAgIFxcXCJvZmZlclRvUmVjZWl2ZUF1ZGlvXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgICBcXFwidm9pY2VBY3Rpdml0eURldGVjdGlvblxcXCI6IFxcXCJib29sZWFuXFxcIixcXG4gICAgICAgIFxcXCJpY2VSZXN0YXJ0XFxcIjogXFxcImJvb2xlYW5cXFwiXFxuICAgICAgfV0sXFxuICAgICAgXFxcInJldFxcXCI6IHtcXG4gICAgICAgIC8vIEZ1bGZpbGxzIHdpdGggYSA6UlRDU2Vzc2lvbkRlc2NyaXB0aW9uXFxuICAgICAgICBcXFwidHlwZVxcXCI6IFxcXCJzdHJpbmdcXFwiLCAgLy8gU2hvdWxkIGFsd2F5cyBiZSBcXFwib2ZmZXJcXFwiLlxcbiAgICAgICAgXFxcInNkcFxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8vIENsb3NlIHRoZSBwZWVyIGNvbm5lY3Rpb24uXFxuICAgIFxcXCJjbG9zZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXX0sXFxuICAgIC8vIFRoZSBwZWVyIGNvbm5lY3Rpb24gaGFzIGJlZW4gY2xvc2VkLlxcbiAgICBcXFwib25DbG9zZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IHt9fVxcbiAgfVxcbn1cXG5cIjtcbnNlbGYuY29yZVJ0Y2RhdGFjaGFubmVsID0gXCJ7XFxuICBcXFwibmFtZVxcXCI6IFxcXCJjb3JlLnJ0Y2RhdGFjaGFubmVsXFxcIixcXG4gIC8vIEFQSSBmb2xsb3dzIGh0dHA6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy9cXG4gIFxcXCJhcGlcXFwiOiB7XFxuXFxuICAgIFxcXCJjb25zdHJ1Y3RvclxcXCI6IHtcXG4gICAgICAvLyBOdW1lcmljIElEIHJldHJlYXZlZCBmcm9tIGNvcmUucnRjcGVlcmNvbm5lY3Rpb24uY3JlYXRlRGF0YUNoYW5uZWxcXG4gICAgICAvLyBvciBmcm9tIGFuIG9uZGF0YWNoYW5uZWwgZXZlbnQuXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXVxcbiAgICB9LFxcblxcbiAgICBcXFwiZ2V0TGFiZWxcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwic3RyaW5nXFxcIn0sXFxuICAgIFxcXCJnZXRPcmRlcmVkXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjogXFxcImJvb2xlYW5cXFwifSxcXG4gICAgXFxcImdldE1heFBhY2tldExpZmVUaW1lXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjogXFxcIm51bWJlclxcXCJ9LFxcbiAgICBcXFwiZ2V0TWF4UmV0cmFuc21pdHNcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwibnVtYmVyXFxcIn0sXFxuICAgIFxcXCJnZXRQcm90b2NvbFxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IFxcXCJzdHJpbmdcXFwifSxcXG4gICAgXFxcImdldE5lZ290aWF0ZWRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwiYm9vbGVhblxcXCJ9LFxcbiAgICBcXFwiZ2V0SWRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwibnVtYmVyXFxcIn0sXFxuICAgIFxcXCJnZXRSZWFkeVN0YXRlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjogXFxcInN0cmluZ1xcXCJ9LFxcbiAgICBcXFwiZ2V0QnVmZmVyZWRBbW91bnRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwibnVtYmVyXFxcIn0sXFxuXFxuICAgIFxcXCJvbm9wZW5cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLCBcXFwidmFsdWVcXFwiOiBbXX0sXFxuICAgIFxcXCJvbmVycm9yXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogW119LFxcbiAgICBcXFwib25jbG9zZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfSxcXG4gICAgXFxcImNsb3NlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfSxcXG4gICAgXFxcIm9ubWVzc2FnZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IHtcXG4gICAgICBcXFwidGV4dFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJiaW5hcnlcXFwiOiBcXFwiYnVmZmVyXFxcIlxcbiAgICB9fSxcXG4gICAgXFxcImdldEJpbmFyeVR5cGVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwic3RyaW5nXFxcIn0sXFxuICAgIFxcXCJzZXRCaW5hcnlUeXBlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIl19LFxcbiAgICBcXFwic2VuZFxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdfSxcXG4gICAgLy8gTm90ZTogcmVuYW1lZCBmcm9tICdzZW5kJyB0byBoYW5kbGUgdGhlIG92ZXJsb2FkZWQgdHlwZS5cXG4gICAgXFxcInNlbmRCdWZmZXJcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJidWZmZXJcXFwiXX1cXG4gIH1cXG59XFxuXCI7XG5zZWxmLmNvcmVSdGNwZWVyY29ubmVjdGlvbiA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS5ydGNwZWVyY29ubmVjdGlvblxcXCIsXFxuICAvLyBBUEkgZm9sbG93cyBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvXFxuICBcXFwiYXBpXFxcIjoge1xcbiAgICAvLyBBcmd1bWVudHM6IGljZVNlcnZlcnMsIGljZVRyYW5zcG9ydHMsIHBlZXJJZGVudGl0eVxcbiAgICAvLyBEZXZpYXRpb24gZnJvbSBzcGVjOiBpY2VTZXJ2ZXJzLCBhbmQgaWNlU2VydmVycy51cmxzIHdoZW4gc3BlY2lmaWVkIG11c3RcXG4gICAgLy8gYmUgYW4gYXJyYXksIGV2ZW4gaWYgb25seSAxIGlzIHNwZWNpZmllZC5cXG4gICAgXFxcImNvbnN0cnVjdG9yXFxcIjoge1xcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IFt7XFxuICAgICAgICBcXFwiaWNlU2VydmVyc1xcXCI6IFtcXFwiYXJyYXlcXFwiLCB7XFxuICAgICAgICAgIFxcXCJ1cmxzXFxcIjogW1xcXCJhcnJheVxcXCIsIFxcXCJzdHJpbmdcXFwiXSxcXG4gICAgICAgICAgXFxcInVzZXJuYW1lXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICAgIFxcXCJjcmVkZW50aWFsXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICAgIH1dLFxcbiAgICAgICAgXFxcImljZVRyYW5zcG9ydHNcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJwZWVySWRlbnRpdHlcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1dXFxuICAgIH0sXFxuXFxuICAgIC8vIFBlciBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvI2lkbC1kZWYtUlRDT2ZmZXJPcHRpb25zXFxuICAgIFxcXCJjcmVhdGVPZmZlclxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbe1xcbiAgICAgIFxcXCJvZmZlclRvUmVjZWl2ZUF1ZGlvXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgXFxcIm9mZmVyVG9SZWNlaXZlVmlkZW9cXFwiOiBcXFwibnVtYmVyXFxcIixcXG4gICAgICBcXFwiaWNlUmVzdGFydFxcXCI6IFxcXCJib29sZWFuXFxcIixcXG4gICAgICBcXFwidm9pY2VBY3Rpdml0eURldGVjdGlvblxcXCI6IFxcXCJib29sZWFuXFxcIlxcbiAgICB9XSwgXFxcInJldFxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJzZHBcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICB9fSxcXG4gICAgXFxcImNyZWF0ZUFuc3dlclxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJzZHBcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICB9fSxcXG5cXG4gICAgLy8gUGVyIGh0dHA6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jaWRsLWRlZi1SVENTZXNzaW9uRGVzY3JpcHRpb25cXG4gICAgXFxcInNldExvY2FsRGVzY3JpcHRpb25cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW3tcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJzZHBcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICB9XX0sXFxuICAgIFxcXCJnZXRMb2NhbERlc2NyaXB0aW9uXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcInNkcFxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgIH19LFxcbiAgICBcXFwic2V0UmVtb3RlRGVzY3JpcHRpb25cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW3tcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJzZHBcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICB9XSwgXFxcInJldFxcXCI6IHt9fSxcXG4gICAgXFxcImdldFJlbW90ZURlc2NyaXB0aW9uXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcInNkcFxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgIH19LFxcblxcbiAgICAvLyBQZXIgaHR0cDovL3czYy5naXRodWIuaW8vd2VicnRjLXBjLyNpZGwtZGVmLVJUQ1NpZ25hbGluZ1N0YXRlXFxuICAgIFxcXCJnZXRTaWduYWxpbmdTdGF0ZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IFxcXCJzdHJpbmdcXFwifSxcXG5cXG4gICAgLy8gUGVyIGh0dHA6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jaWRsLWRlZi1SVENDb25maWd1cmF0aW9uXFxuICAgIFxcXCJ1cGRhdGVJY2VcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW3tcXG4gICAgICAgIFxcXCJpY2VTZXJ2ZXJzXFxcIjogW1xcXCJhcnJheVxcXCIsIHtcXG4gICAgICAgICAgXFxcInVybHNcXFwiOiBbXFxcImFycmF5XFxcIiwgXFxcInN0cmluZ1xcXCJdLFxcbiAgICAgICAgICBcXFwidXNlcm5hbWVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgICAgXFxcImNyZWRlbnRpYWxcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgICAgfV0sXFxuICAgICAgICBcXFwiaWNlVHJhbnNwb3J0c1xcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcInBlZXJJZGVudGl0eVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfV0sIFxcXCJyZXRcXFwiOiB7fX0sXFxuXFxuICAgIC8vIFBlciBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvI2lkbC1kZWYtUlRDSWNlQ2FuZGlkYXRlXFxuICAgIFxcXCJhZGRJY2VDYW5kaWRhdGVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW3tcXG4gICAgICBcXFwiY2FuZGlkYXRlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcInNkcE1pZFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJzZHBNTGluZUluZGV4XFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgfV0sIFxcXCJyZXRcXFwiOiB7fX0sXFxuXFxuICAgIFxcXCJnZXRJY2VHYXRoZXJpbmdTdGF0ZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IFxcXCJzdHJpbmdcXFwifSxcXG4gICAgXFxcImdldEljZUNvbm5lY3Rpb25TdGF0ZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IFxcXCJzdHJpbmdcXFwifSxcXG5cXG4gICAgXFxcImdldENvbmZpZ3VyYXRpb25cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiB7XFxuICAgICAgXFxcImljZVNlcnZlcnNcXFwiOiBbXFxcImFycmF5XFxcIiwge1xcbiAgICAgICAgXFxcInVybHNcXFwiOiBbXFxcImFycmF5XFxcIiwgXFxcInN0cmluZ1xcXCJdLFxcbiAgICAgICAgXFxcInVzZXJuYW1lXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwiY3JlZGVudGlhbFxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfV0sXFxuICAgICAgXFxcImljZVRyYW5zcG9ydHNcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICBcXFwicGVlcklkZW50aXR5XFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgfX0sXFxuXFxuICAgIC8vIE51bWJlcnMgZm9yIHN0cmVhbSBBUEkgYXJlIElEcyB3aXRoIHdoaWNoIHRvIG1ha2UgY29yZS5tZWRpYXN0cmVhbS5cXG4gICAgXFxcImdldExvY2FsU3RyZWFtc1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IFtcXFwiYXJyYXlcXFwiLCBcXFwic3RyaW5nXFxcIl19LFxcbiAgICBcXFwiZ2V0UmVtb3RlU3RyZWFtc1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXSwgXFxcInJldFxcXCI6IFtcXFwiYXJyYXlcXFwiLCBcXFwic3RyaW5nXFxcIl19LFxcbiAgICBcXFwiZ2V0U3RyZWFtQnlJZFxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLCBcXFwicmV0XFxcIjogXFxcInN0cmluZ1xcXCJ9LFxcbiAgICBcXFwiYWRkU3RyZWFtXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIl0sIFxcXCJyZXRcXFwiOiB7fX0sXFxuICAgIFxcXCJyZW1vdmVTdHJlYW1cXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXSwgXFxcInJldFxcXCI6IHt9fSxcXG5cXG4gICAgXFxcImNsb3NlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjoge319LFxcblxcbiAgICAvLyBQZXIgaHR0cDovL3czYy5naXRodWIuaW8vd2VicnRjLXBjLyNpZGwtZGVmLVJUQ0RhdGFDaGFubmVsSW5pdFxcbiAgICAvLyBOb3RlOiBOdW1iZXJzIGFyZSBJRHMgdXNlZCB0byBjcmVhdGUgY29yZS5kYXRhY2hhbm5lbCBvYmplY3RzLlxcbiAgICBcXFwiY3JlYXRlRGF0YUNoYW5uZWxcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCB7XFxuICAgICAgXFxcIm9yZGVyZWRcXFwiOiBcXFwiYm9vbGVhblxcXCIsXFxuICAgICAgXFxcIm1heFBhY2tldExpZmVUaW1lXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgXFxcIm1heFJldHJhbnNtaXRzXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgXFxcInByb3RvY29sXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcIm5lZ290aWF0ZWRcXFwiOiBcXFwiYm9vbGVhblxcXCIsXFxuICAgICAgXFxcImlkXFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgfV0sIFxcXCJyZXRcXFwiOiBcXFwic3RyaW5nXFxcIn0sXFxuICAgIC8vTm90ZTogb25seSByZXBvcnRzIGNoYW5uZWxzIG9wZW5lZCBieSB0aGUgcmVtb3RlIHBlZXIuXFxuICAgIFxcXCJvbmRhdGFjaGFubmVsXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIFxcXCJjaGFubmVsXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgfX0sXFxuXFxuICAgIC8vVE9ETzogU3VwcG9ydCBEVE1GIEV4dGVuc2lvbi5cXG4gICAgLy9cXFwiY3JlYXRlRFRNRlNlbmRlclxcXCI6IHt9LFxcblxcbiAgICAvL3BlciBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvI2lkbC1kZWYtUlRDU3RhdHNDYWxsYmFja1xcbiAgICAvL051bWJlciBpZiBzZXBlY2lmaWVkIHJlcHJlc2VudHMgYSBjb3JlLm1lZGlhc3RyZWFtdHJhY2suXFxuICAgIC8vUmV0dXJuZWQgb2JqZWN0IGlzIGEgc2VyaWFsaXphdGlvbiBvZiB0aGUgUlRDU3RhdHNSZXBvcnQuXFxuICAgIFxcXCJnZXRTdGF0c1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLCBcXFwicmV0XFxcIjpcXFwib2JqZWN0XFxcIn0sXFxuXFxuICAgIC8vVE9ETzogU3VwcG9ydCBJZGVudGl0eSBFeHRlbnNpb24uXFxuICAgIC8qXFxuICAgIFxcXCJzZXRJZGVudGl0eVByb3ZpZGVyXFxcIjoge30sXFxuICAgIFxcXCJnZXRJZGVudGl0eUFzc2VydGlvblxcXCI6IHt9LFxcbiAgICBcXFwiZ2V0UGVlcklkZW50aXR5XFxcIjoge30sXFxuICAgIFxcXCJvbmlkZW50aXR5cmVzdWx0XFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogW119LFxcbiAgICBcXFwib25wZWVyaWRlbnRpdHlcXFwiOntcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfSxcXG4gICAgXFxcIm9uaWRwYXNzZXJ0aW9uZXJyb3JcXFwiOntcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfSxcXG4gICAgXFxcIm9uaWRwdmFsaWRhdGlvbmVycm9yXFxcIjp7XFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLCBcXFwidmFsdWVcXFwiOiBbXX0sXFxuICAgICovXFxuXFxuICAgIFxcXCJvbm5lZ290aWF0aW9ubmVlZGVkXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogW119LFxcbiAgICBcXFwib25pY2VjYW5kaWRhdGVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLCBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgXFxcImNhbmRpZGF0ZVxcXCI6IHtcXG4gICAgICAgIFxcXCJjYW5kaWRhdGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJzZHBNaWRcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJzZHBNTGluZUluZGV4XFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgICB9XFxuICAgIH19LFxcbiAgICBcXFwib25zaWduYWxpbmdzdGF0ZWNoYW5nZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfSxcXG4gICAgXFxcIm9uYWRkc3RyZWFtXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIFxcXCJzdHJlYW1cXFwiOiBcXFwibnVtYmVyXFxcIlxcbiAgICB9fSxcXG4gICAgXFxcIm9ucmVtb3Zlc3RyZWFtXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIFxcXCJzdHJlYW1cXFwiOiBcXFwibnVtYmVyXFxcIlxcbiAgICB9fSxcXG4gICAgXFxcIm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogW119XFxuICB9XFxufVxcblwiO1xuc2VsZi5jb3JlU3RvcmFnZSA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS5zdG9yYWdlXFxcIixcXG4gIFxcXCJhcGlcXFwiOiB7XFxuICAgIFxcXCJrZXlzXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjogW1xcXCJhcnJheVxcXCIsIFxcXCJzdHJpbmdcXFwiXX0sXFxuICAgIFxcXCJnZXRcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXSwgXFxcInJldFxcXCI6IFxcXCJzdHJpbmdcXFwifSxcXG4gICAgXFxcInNldFxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIFxcXCJzdHJpbmdcXFwiXSwgXFxcInJldFxcXCI6IFxcXCJzdHJpbmdcXFwifSxcXG4gICAgXFxcInJlbW92ZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLCBcXFwicmV0XFxcIjogXFxcInN0cmluZ1xcXCJ9LFxcbiAgICBcXFwiY2xlYXJcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW119XFxuICB9XFxufVwiO1xuc2VsZi5jb3JlVGNwc29ja2V0ID0gXCJ7XFxuICBcXFwibmFtZVxcXCI6IFxcXCJjb3JlLnRjcHNvY2tldFxcXCIsXFxuICBcXFwiYXBpXFxcIjoge1xcbiAgICAvLyBTb2NrZXRzIG1heSBiZSBjb25zdHJ1Y3RlZCBib3VuZCB0byBhIHByZS1leGlzdGluZyBpZCwgYXMgaW4gdGhlIGNhc2Ugb2ZcXG4gICAgLy8gaW50ZXJhY3Rpbmcgd2l0aCBhIHNvY2tldCBhY2NwZXRlZCBieSBhIHNlcnZlci4gIElmIG5vIElkIGlzIHNwZWNpZmllZCwgYVxcbiAgICAvLyBuZXcgc29ja2V0IHdpbGwgYmUgY3JlYXRlZCwgd2hpY2ggY2FuIGJlIGVpdGhlciBjb25uZWN0J2VkIG9yIGxpc3RlbidlZC5cXG4gICAgXFxcImNvbnN0cnVjdG9yXFxcIjoge1xcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IFtcXFwibnVtYmVyXFxcIl1cXG4gICAgfSxcXG4gIFxcbiAgICAvLyBHZXQgaW5mbyBhYm91dCBhIHNvY2tldC4gIFRlbGxzIHlvdSB3aGV0aGVyIHRoZSBzb2NrZXQgaXMgYWN0aXZlIGFuZFxcbiAgICAvLyBhdmFpbGFibGUgaG9zdCBpbmZvcm1hdGlvbi5cXG4gICAgXFxcImdldEluZm9cXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXSxcXG4gICAgICBcXFwicmV0XFxcIjoge1xcbiAgICAgICAgXFxcImNvbm5lY3RlZFxcXCI6IFxcXCJib29sZWFuXFxcIixcXG4gICAgICAgIFxcXCJsb2NhbEFkZHJlc3NcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJsb2NhbFBvcnRcXFwiOiBcXFwibnVtYmVyXFxcIixcXG4gICAgICAgIFxcXCJwZWVyQWRkcmVzc1xcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcInBlZXJQb3J0XFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgICB9XFxuICAgIH0sXFxuICBcXG4gICAgLyoqIFxcbiAgICAgKiBlcnJvciBjb2RlcyBhbmQgZGVmYXVsdCBtZXNzYWdlcyB0aGF0IG1heSBiZSByZXR1cm5lZCBvbiBmYWlsdXJlcy5cXG4gICAgICovXFxuICAgIFxcXCJFUlJDT0RFXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImNvbnN0YW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIC8qKiBHRU5FUkFMICoqL1xcbiAgICAgIFxcXCJTVUNDRVNTXFxcIjogXFxcIlN1Y2Nlc3MhXFxcIixcXG4gICAgICAvLyBVbmtub3duXFxuICAgICAgXFxcIlVOS05PV05cXFwiOiBcXFwiVW5rbm93biBlcnJvclxcXCIsXFxuICAgICAgXFxuICAgICAgLy8gU29ja2V0IGlzIGFscmVhZHkgY29ubmVjdGVkXFxuICAgICAgXFxcIkFMUkVBRFlfQ09OTkVDVEVEXFxcIjogXFxcIlNvY2tldCBhbHJlYWR5IGNvbm5lY3RlZFxcXCIsXFxuICAgICAgLy8gSW52YWxpZCBBcmd1bWVudCwgY2xpZW50IGVycm9yXFxuICAgICAgXFxcIklOVkFMSURfQVJHVU1FTlRcXFwiOiBcXFwiSW52YWxpZCBhcmd1bWVudFxcXCIsXFxuICAgICAgLy8gQ29ubmVjdGlvbiB0aW1lZCBvdXQuXFxuICAgICAgXFxcIlRJTUVEX09VVFxcXCI6IFxcXCJUaW1lZCBvdXRcXFwiLFxcbiAgICAgIC8vIE9wZXJhdGlvbiBjYW5ub3QgY29tcGxldGUgYmVjYXVzZSBzb2NrZXQgaXMgbm90IGNvbm5lY3RlZC5cXG4gICAgICBcXFwiTk9UX0NPTk5FQ1RFRFxcXCI6IFxcXCJTb2NrZXQgbm90IGNvbm5lY3RlZFxcXCIsXFxuICAgICAgLy8gU29ja2V0IHJlc2V0IGJlY2F1c2Ugb2YgY2hhbmdlIGluIG5ldHdvcmsgc3RhdGUuXFxuICAgICAgXFxcIk5FVFdPUktfQ0hBTkdFRFxcXCI6IFxcXCJOZXR3b3JrIGNoYW5nZWRcXFwiLFxcbiAgICAgIC8vIENvbm5lY3Rpb24gY2xvc2VkXFxuICAgICAgXFxcIkNPTk5FQ1RJT05fQ0xPU0VEXFxcIjogXFxcIkNvbm5lY3Rpb24gY2xvc2VkIGdyYWNlZnVsbHlcXFwiLFxcbiAgICAgIC8vIENvbm5lY3Rpb24gUmVzZXRcXG4gICAgICBcXFwiQ09OTkVDVElPTl9SRVNFVFxcXCI6IFxcXCJDb25uZWN0aW9uIHJlc2V0XFxcIixcXG4gICAgICAvLyBDb25uZWN0aW9uIFJlZnVzZWRcXG4gICAgICBcXFwiQ09OTkVDVElPTl9SRUZVU0VEXFxcIjogXFxcIkNvbm5lY3Rpb24gcmVmdXNlZFxcXCIsXFxuICAgICAgLy8gR2VuZXJpYyBGYWlsdXJlXFxuICAgICAgXFxcIkNPTk5FQ1RJT05fRkFJTEVEXFxcIjogXFxcIkNvbm5lY3Rpb24gZmFpbGVkXFxcIlxcbiAgICB9fSxcXG4gICAgXFxuICAgIC8vIENsb3NlIGEgc29ja2V0LiBXaWxsIEZhaWwgaWYgdGhlIHNvY2tldCBpcyBub3QgY29ubmVjdGVkIG9yIGFscmVhZHlcXG4gICAgLy8gY2xvc2VkLlxcbiAgICBcXFwiY2xvc2VcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXSxcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICB9XFxuICAgIH0sXFxuICBcXG4gICAgLy8gUmVjZWl2ZSBub3RpZmljYXRpb24gdGhhdCB0aGUgc29ja2V0IGhhcyBkaXNjb25uZWN0ZWQuXFxuICAgIFxcXCJvbkRpc2Nvbm5lY3RcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLCBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgIH19LFxcbiAgXFxuICAgIC8vIENvbm5lY3QgdG8gYSBob3N0IGFuZCBwb3J0LlxcbiAgICAvLyBGYWlscyB3aXRoIGFuIGVycm9yIGlmIGNvbm5lY3Rpb24gZmFpbHMuXFxuICAgIFxcXCJjb25uZWN0XFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwibnVtYmVyXFxcIl0sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8vIFVwZ3JhZGVzIGEgc29ja2V0IHRvIFRMUywgZXhwZWN0ZWQgdG8gYmUgaW52b2tlZCBhZnRlciBjb25uZWN0LlxcbiAgICBcXFwic2VjdXJlXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW10sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8vIFByZXBhcmVzIGEgc29ja2V0IGZvciBiZWNvbWluZyBzZWN1cmUgYWZ0ZXIgdGhlIG5leHQgcmVhZCBldmVudC5cXG4gICAgLy8gU2VlIGRldGFpbHMgYXRcXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2ZyZWVkb21qcy9mcmVlZG9tL3dpa2kvcHJlcGFyZVNlY3VyZS1BUEktVXNhZ2VcXG4gICAgLy8gVGhpcyBzaG91bGQgYmUgY2FsbGVkIG9uZSByZWFkIHByaW9yIHRvIGNhbGxpbmcgLnNlY3VyZSwgZS5nLiBpbiBYTVBQXFxuICAgIC8vIHRoaXMgc2hvdWxkIGJlIGNhbGxlZCBiZWZvcmUgc2VuZGluZyBcXFwic3RhcnR0bHNcXFwiLCB0aGVuIGFmdGVyIGEgXFxcInByb2NlZWRcXFwiXFxuICAgIC8vIG1lc3NhZ2UgaXMgcmVhZCAuc2VjdXJlIHNob3VsZCBiZSBjYWxsZWQuXFxuICAgIFxcXCJwcmVwYXJlU2VjdXJlXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW10sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8vIFdyaXRlIGJ1ZmZlciBkYXRhIHRvIGEgc29ja2V0LlxcbiAgICAvLyBGYWlscyB3aXRoIGFuIGVycm9yIGlmIHdyaXRlIGZhaWxzLlxcbiAgICBcXFwid3JpdGVcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxcImJ1ZmZlclxcXCJdLFxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gIFxcbiAgICAvLyBSZWNlaXZlIGRhdGEgb24gYSBjb25uZWN0ZWQgc29ja2V0LlxcbiAgICBcXFwib25EYXRhXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiB7XFxcImRhdGFcXFwiOiBcXFwiYnVmZmVyXFxcIn1cXG4gICAgfSxcXG4gIFxcbiAgICAvLyBMaXN0ZW4gYXMgYSBzZXJ2ZXIgYXQgYSBzcGVjaWZpZWQgaG9zdCBhbmQgcG9ydC5cXG4gICAgLy8gQWZ0ZXIgY2FsbGluZyBsaXN0ZW4gdGhlIGNsaWVudCBzaG91bGQgbGlzdGVuIGZvciAnb25Db25uZWN0aW9uJyBldmVudHMuXFxuICAgIC8vIEZhaWxzIHdpdGggYW4gZXJyb3IgaWYgZXJyb3JzIG9jY3VyIHdoaWxlIGJpbmRpbmcgb3IgbGlzdGVuaW5nLlxcbiAgICBcXFwibGlzdGVuXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwibnVtYmVyXFxcIl0sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8vIFJlY2VpdmUgYSBjb25uZWN0aW9uLlxcbiAgICAvLyBUaGUgc29ja2V0IHBhcmFtZXRlciBtYXkgYmUgdXNlZCB0byBjb25zdHJ1Y3QgYSBuZXcgc29ja2V0LlxcbiAgICAvLyBIb3N0IGFuZCBwb3J0IGluZm9ybWF0aW9uIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHJlbW90ZSBwZWVyLlxcbiAgICBcXFwib25Db25uZWN0aW9uXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIFxcXCJzb2NrZXRcXFwiOiBcXFwibnVtYmVyXFxcIixcXG4gICAgICBcXFwiaG9zdFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgIFxcXCJwb3J0XFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgfX1cXG4gIH1cXG59XFxuXCI7XG5zZWxmLmNvcmVVZHBzb2NrZXQgPSBcIi8vIEEgVURQIHNvY2tldC5cXG4vLyBHZW5lcmFsbHksIHRvIHVzZSB5b3UganVzdCBuZWVkIHRvIGNhbGwgYmluZCgpIGF0IHdoaWNoIHBvaW50IG9uRGF0YVxcbi8vIGV2ZW50cyB3aWxsIHN0YXJ0IHRvIGZsb3cuIE5vdGUgdGhhdCBiaW5kKCkgc2hvdWxkIG9ubHkgYmUgY2FsbGVkXFxuLy8gb25jZSBwZXIgaW5zdGFuY2UuXFxue1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS51ZHBzb2NrZXRcXFwiLFxcbiAgXFxcImFwaVxcXCI6IHtcXG4gICAgLyoqIFxcbiAgICAgKiBlcnJvciBjb2RlcyBhbmQgZGVmYXVsdCBtZXNzYWdlcyB0aGF0IG1heSBiZSByZXR1cm5lZCBvbiBmYWlsdXJlcy5cXG4gICAgICovXFxuICAgIFxcXCJFUlJDT0RFXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImNvbnN0YW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcbiAgICAgIC8qKiBHRU5FUkFMICoqL1xcbiAgICAgIFxcXCJTVUNDRVNTXFxcIjogXFxcIlN1Y2Nlc3MhXFxcIixcXG4gICAgICAvLyBVbmtub3duXFxuICAgICAgXFxcIlVOS05PV05cXFwiOiBcXFwiVW5rbm93biBlcnJvclxcXCIsXFxuICAgICAgXFxuICAgICAgLy8gU29ja2V0IGlzIGFscmVhZHkgYm91bmRcXG4gICAgICBcXFwiQUxSRUFEWV9CT1VORFxcXCI6IFxcXCJTb2NrZXQgYWxyZWFkeSBib3VuZFxcXCIsXFxuICAgICAgLy8gSW52YWxpZCBBcmd1bWVudCwgY2xpZW50IGVycm9yXFxuICAgICAgXFxcIklOVkFMSURfQVJHVU1FTlRcXFwiOiBcXFwiSW52YWxpZCBhcmd1bWVudFxcXCIsXFxuICAgICAgLy8gU29ja2V0IHJlc2V0IGJlY2F1c2Ugb2YgY2hhbmdlIGluIG5ldHdvcmsgc3RhdGUuXFxuICAgICAgXFxcIk5FVFdPUktfQ0hBTkdFRFxcXCI6IFxcXCJOZXR3b3JrIGNoYW5nZWRcXFwiLFxcbiAgICAgIC8vIEZhaWx1cmUgdG8gc2VuZCBkYXRhXFxuICAgICAgXFxcIlNORURfRkFJTEVEXFxcIjogXFxcIlNlbmQgZmFpbGVkXFxcIlxcbiAgICB9fSxcXG4gIFxcbiAgICAvLyBDcmVhdGVzIGEgc29ja2V0LCBiaW5kcyBpdCB0byBhbiBpbnRlcmZhY2UgYW5kIHBvcnQgYW5kIGxpc3RlbnMgZm9yXFxuICAgIC8vIG1lc3NhZ2VzLCBkaXNwYXRjaGluZyBlYWNoIG1lc3NhZ2UgYXMgb24gb25EYXRhIGV2ZW50LlxcbiAgICAvLyBSZXR1cm5zIG9uIHN1Y2Nlc3MsIG9yIGZhaWxzIHdpdGggYW4gZXJyb3Igb24gZmFpbHVyZS5cXG4gICAgXFxcImJpbmRcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxuICAgICAgICAvLyBJbnRlcmZhY2UgKGFkZHJlc3MpIG9uIHdoaWNoIHRvIGJpbmQuXFxuICAgICAgICBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIC8vIFBvcnQgb24gd2hpY2ggdG8gYmluZC5cXG4gICAgICAgIFxcXCJudW1iZXJcXFwiXFxuICAgICAgXSxcXG4gICAgICBcXFwicmV0XFxcIjogW10sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8vIFJldHJpZXZlcyB0aGUgc3RhdGUgb2YgdGhlIHNvY2tldC5cXG4gICAgLy8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XFxuICAgIC8vICAtIGxvY2FsQWRkcmVzczogdGhlIHNvY2tldCdzIGxvY2FsIGFkZHJlc3MsIGlmIGJvdW5kXFxuICAgIC8vICAtIGxvY2FsUG9ydDogdGhlIHNvY2tldCdzIGxvY2FsIHBvcnQsIGlmIGJvdW5kXFxuICAgIFxcXCJnZXRJbmZvXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdLCBcXFwicmV0XFxcIjoge1xcbiAgICAgIFxcXCJsb2NhbEFkZHJlc3NcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICBcXFwibG9jYWxQb3J0XFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgfX0sXFxuICBcXG4gICAgLy8gU2VuZHMgZGF0YSB0byBhIHNlcnZlci5cXG4gICAgLy8gVGhlIHNvY2tldCBtdXN0IGJlIGJvdW5kLlxcbiAgICAvLyBSZXR1cm5zIGFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgbnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW4sIHdpdGggbm9cXG4gICAgLy8gZ3VhcmFudGVlIHRoYXQgdGhlIHJlbW90ZSBzaWRlIHJlY2VpdmVkIHRoZSBkYXRhLlxcbiAgICBcXFwic2VuZFRvXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcbiAgICAgICAgLy8gRGF0YSB0byBzZW5kLlxcbiAgICAgICAgXFxcImJ1ZmZlclxcXCIsXFxuICAgICAgICAvLyBEZXN0aW5hdGlvbiBhZGRyZXNzLlxcbiAgICAgICAgXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICAvLyBEZXN0aW5hdGlvbiBwb3J0LlxcbiAgICAgICAgXFxcIm51bWJlclxcXCJcXG4gICAgICBdLFxcbiAgICAgIFxcXCJyZXRcXFwiOiBcXFwibnVtYmVyXFxcIixcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICB9XFxuICAgIH0sXFxuICBcXG4gICAgLy8gUmVsZWFzZXMgYWxsIHJlc291cmNlcyBhc3NvY2lhdGVkIHdpdGggdGhpcyBzb2NrZXQuXFxuICAgIC8vIE5vLW9wIGlmIHRoZSBzb2NrZXQgaXMgbm90IGJvdW5kLlxcbiAgICBcXFwiZGVzdHJveVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXX0sXFxuICBcXG4gICAgLy8gQ2FsbGVkIG9uY2UgZm9yIGVhY2ggbWVzc2FnZSByZWNlaXZlZCBvbiB0aGlzIHNvY2tldCwgb25jZSBpdCdzXFxuICAgIC8vIGJlZW4gc3VjY2Vzc2Z1bGx5IGJvdW5kLlxcbiAgICBcXFwib25EYXRhXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgICAvLyBaZXJvIG1lYW5zIHN1Y2Nlc3MsIGFueSBvdGhlciBcXFwidmFsdWVcXFwiIGlzIGltcGxlbWVudGF0aW9uLWRlcGVuZGVudC5cXG4gICAgICAgIFxcXCJyZXN1bHRDb2RlXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgICAvLyBBZGRyZXNzIGZyb20gd2hpY2ggZGF0YSB3YXMgcmVjZWl2ZWQuXFxuICAgICAgICBcXFwiYWRkcmVzc1xcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgLy8gUG9ydCBmcm9tIHdoaWNoIGRhdGEgd2FzIHJlY2VpdmVkLlxcbiAgICAgICAgXFxcInBvcnRcXFwiOiBcXFwibnVtYmVyXFxcIixcXG4gICAgICAgIC8vIERhdGEgcmVjZWl2ZWQuXFxuICAgICAgICBcXFwiZGF0YVxcXCI6IFxcXCJidWZmZXJcXFwiXFxuICAgICAgfVxcbiAgICB9XFxuICB9XFxufVxcblwiO1xuc2VsZi5jb3JlVmlldyA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS52aWV3XFxcIixcXG4gIFxcXCJhcGlcXFwiOiB7XFxuICAgIFxcXCJzaG93XFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIl19LFxcbiAgICBcXFwiaXNTZWN1cmVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIiwgXFxcInZhbHVlXFxcIjogW10sIFxcXCJyZXRcXFwiOiBcXFwiYm9vbGVhblxcXCIgfSxcXG4gICAgXFxcImNsb3NlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfSxcXG4gICAgXFxcInBvc3RNZXNzYWdlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtcXFwib2JqZWN0XFxcIl19LFxcbiAgXFxuICAgIFxcXCJtZXNzYWdlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogXFxcIm9iamVjdFxcXCJ9LFxcbiAgICBcXFwib25DbG9zZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IFtdfVxcbiAgfVxcbn1cXG5cIjtcbnNlbGYuY29yZVdlYnNvY2tldCA9IFwie1xcbiAgXFxcIm5hbWVcXFwiOiBcXFwiY29yZS53ZWJzb2NrZXRcXFwiLFxcbiAgXFxcImFwaVxcXCI6IHtcXG4gICAgLy8gQ29uc3RydWN0cyBuZXcgd2Vic29ja2V0LiBFcnJvcnMgaW4gY29uc3RydWN0aW9uIGFyZSBwYXNzZWQgb25cXG4gICAgLy8gdGhyb3VnaCB0aGUgb25FcnJvciBldmVudC5cXG4gICAgXFxcImNvbnN0cnVjdG9yXFxcIjoge1xcXCJ2YWx1ZVxcXCI6IFtcXG4gICAgICAvLyBVUkwgdG8gY29ubmVjdCB0aHJvdWdoXFxuICAgICAgXFxcInN0cmluZ1xcXCIsXFxuICAgICAgLy8gUHJvdG9jb2xzXFxuICAgICAgW1xcXCJhcnJheVxcXCIsIFxcXCJzdHJpbmdcXFwiXVxcbiAgICBdfSxcXG4gICAgLy8gU2VuZCB0aGUgZGF0YSB0byB0aGUgb3RoZXIgc2lkZSBvZiB0aGlzIGNvbm5lY3Rpb24uIE9ubHkgb25lIG9mXFxuICAgIC8vIHRoZSBlbnRyaWVzIGluIHRoZSBkaWN0aW9uYXJ5IHRoYXQgaXMgcGFzc2VkIHdpbGwgYmUgc2VudC5cXG4gICAgXFxcInNlbmRcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbe1xcbiAgICAgICAgXFxcInRleHRcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJiaW5hcnlcXFwiOiBcXFwiYmxvYlxcXCIsXFxuICAgICAgICBcXFwiYnVmZmVyXFxcIjogXFxcImJ1ZmZlclxcXCJcXG4gICAgICB9XSxcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICB9XFxuICAgIH0sXFxuICAgIFxcXCJnZXRSZWFkeVN0YXRlXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW10sXFxuICAgICAgLy8gMCAtPiBDT05ORUNUSU5HXFxuICAgICAgLy8gMSAtPiBPUEVOXFxuICAgICAgLy8gMiAtPiBDTE9TSU5HXFxuICAgICAgLy8gMyAtPiBDTE9TRURcXG4gICAgICBcXFwicmV0XFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgfSxcXG4gICAgXFxcImdldEJ1ZmZlcmVkQW1vdW50XFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXFxcInJldFxcXCI6IFxcXCJudW1iZXJcXFwifSxcXG4gICAgXFxcImNsb3NlXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgLy8gVGhlIGZpcnN0IGFyZ3VtZW50IGlzIGEgc3RhdHVzIGNvZGUgZnJvbVxcbiAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DbG9zZUV2ZW50XFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJudW1iZXJcXFwiLCBcXFwic3RyaW5nXFxcIl0sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgICBcXFwib25NZXNzYWdlXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIixcXG4gICAgICAvLyBUaGUgZGF0YSB3aWxsIGJlIHN0b3JlZCBpbiBvbmUgb2YgdGhlIGtleXMsXFxuICAgICAgLy8gY29ycmVzcG9uZGluZyB3aXRoIHRoZSBcXFwidHlwZVxcXCIgcmVjZWl2ZWRcXG4gICAgICBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgICBcXFwidGV4dFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcImJpbmFyeVxcXCI6IFxcXCJibG9iXFxcIixcXG4gICAgICAgIFxcXCJidWZmZXJcXFwiOiBcXFwiYnVmZmVyXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gICAgXFxcIm9uT3BlblxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW11cXG4gICAgfSxcXG4gICAgXFxcIm9uRXJyb3JcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLFxcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgICBcXFwib25DbG9zZVxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsXFxuICAgICAgLy8gXFxcInZhbHVlXFxcInMgZ2l2ZW4gYnkgV2ViU29ja2V0cyBzcGVjOlxcbiAgICAgIC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL3dlYnNvY2tldHMvI2Nsb3NlZXZlbnRcXG4gICAgICBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgICBcXFwiY29kZVxcXCI6IFxcXCJudW1iZXJcXFwiLFxcbiAgICAgICAgXFxcInJlYXNvblxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIndhc0NsZWFuXFxcIjogXFxcImJvb2xlYW5cXFwiXFxuICAgICAgfVxcbiAgICB9XFxuICB9XFxufVxcblwiO1xuc2VsZi5zb2NpYWwgPSBcIi8qKlxcbiAqIFNPQ0lBTCBBUElcXG4gKlxcbiAqIEFQSSBmb3IgY29ubmVjdGluZyB0byBzb2NpYWwgbmV0d29ya3MgYW5kIG1lc3NhZ2luZyBvZiB1c2Vycy5cXG4gKiBBbiBpbnN0YW5jZSBvZiBhIHNvY2lhbCBwcm92aWRlciBlbmNhcHN1bGF0ZXMgYSBzaW5nbGUgdXNlciBsb2dnaW5nIGludG9cXG4gKiBhIHNpbmdsZSBuZXR3b3JrLlxcbiAqXFxuICogVGhpcyBBUEkgZGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGEgXFxcInVzZXJcXFwiIGFuZCBhIFxcXCJjbGllbnRcXFwiLiBBIGNsaWVudCBpcyBhXFxuICogdXNlcidzIHBvaW50IG9mIGFjY2VzcyB0byB0aGUgc29jaWFsIHByb3ZpZGVyLiBUaHVzLCBhIHVzZXIgdGhhdCBoYXNcXG4gKiBtdWx0aXBsZSBjb25uZWN0aW9ucyB0byBhIHByb3ZpZGVyIChlLmcuLCBvbiBtdWx0aXBsZSBkZXZpY2VzIG9yIGluIG11bHRpcGxlXFxuICogYnJvd3NlcnMpIGhhcyBtdWx0aXBsZSBjbGllbnRzLlxcbiAqXFxuICogVGhlIHNlbWFudGljcyBvZiBzb21lIHByb3BlcnRpZXMgYXJlIGRlZmluZWQgYnkgdGhlIHNwZWNpZmljIHByb3ZpZGVyLCBlLmcuOlxcbiAqIC0gRWRnZXMgaW4gdGhlIHNvY2lhbCBuZXR3b3JrICh3aG8gaXMgb24geW91ciByb3N0ZXIpXFxuICogLSBSZWxpYWJsZSBtZXNzYWdlIHBhc3NpbmcgKG9yIHVucmVsaWFibGUpXFxuICogLSBJbi1vcmRlciBtZXNzYWdlIGRlbGl2ZXJ5IChvciBvdXQgb2Ygb3JkZXIpXFxuICogLSBQZXJzaXN0ZW50IGNsaWVudElkIC0gV2hldGhlciB5b3VyIGNsaWVudElkIGNoYW5nZXMgYmV0d2VlbiBsb2dpbnMgd2hlblxcbiAqICAgIGNvbm5lY3RpbmcgZnJvbSB0aGUgc2FtZSBkZXZpY2VcXG4gKlxcbiAqIEEgPGNsaWVudF9zdGF0ZT4sIHVzZWQgaW4gdGhpcyBBUEksIGlzIGRlZmluZWQgYXM6XFxuICogLSBJbmZvcm1hdGlvbiByZWxhdGVkIHRvIGEgc3BlY2lmaWMgY2xpZW50IG9mIGEgdXNlclxcbiAqIC0gVXNlIGNhc2VzOiBcXG4gKiAgIC0gUmV0dXJuZWQgb24gY2hhbmdlcyBmb3IgZnJpZW5kcyBvciBteSBpbnN0YW5jZSBpbiAnb25DbGllbnRTdGF0ZSdcXG4gKiAgIC0gUmV0dXJuZWQgaW4gYSBnbG9iYWwgbGlzdCBmcm9tICdnZXRDbGllbnRzJ1xcbiAqIHtcXG4gKiAgIC8vIE1hbmRhdG9yeVxcbiAqICAgJ3VzZXJJZCc6ICdzdHJpbmcnLCAgICAgIC8vIFVuaXF1ZSBJRCBvZiB1c2VyIChlLmcuIGFsaWNlQGdtYWlsLmNvbSlcXG4gKiAgICdjbGllbnRJZCc6ICdzdHJpbmcnLCAgICAvLyBVbmlxdWUgSUQgb2YgY2xpZW50XFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKGUuZy4gYWxpY2VAZ21haWwuY29tL0FuZHJvaWQtMjNuYWRzdjMyZilcXG4gKiAgICdzdGF0dXMnOiAnc3RyaW5nJywgICAgICAvLyBTdGF0dXMgb2YgdGhlIGNsaWVudC4gJ1NUQVRVUycgbWVtYmVyLlxcbiAqICAgJ2xhc3RVcGRhdGVkJzogJ251bWJlcicsIC8vIFRpbWVzdGFtcCBvZiB0aGUgbGFzdCB0aW1lIGNsaWVudF9zdGF0ZSB3YXMgdXBkYXRlZFxcbiAqICAgJ2xhc3RTZWVuJzogJ251bWJlcicgICAgIC8vIFRpbWVzdGFtcCBvZiB0aGUgbGFzdCBzZWVuIHRpbWUgb2YgdGhpcyBkZXZpY2UuXFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90ZTogJ2xhc3RTZWVuJyBET0VTIE5PVCB0cmlnZ2VyIGFuICdvbkNsaWVudFN0YXRlJyBldmVudFxcbiAqIH1cXG4gKiBcXG4gKiBBIDx1c2VyX3Byb2ZpbGU+LCB1c2VkIGluIHRoaXMgQVBJLCBpcyBkZWZpbmVkIGFzOlxcbiAqIC0gSW5mb3JtYXRpb24gcmVsYXRlZCB0byBhIHNwZWNpZmljIHVzZXIgKHByb2ZpbGUgaW5mb3JtYXRpb24pXFxuICogLSBVc2UgY2FzZXM6XFxuICogICAtIFJldHVybmVkIG9uIGNoYW5nZXMgZm9yIGZyaWVuZHMgb3IgbXlzZWxmIGluICdvblVzZXJQcm9maWxlJ1xcbiAqICAgLSBSZXR1cm5lZCBpbiBhIGdsb2JhbCBsaXN0IGZyb20gJ2dldFVzZXJzJ1xcbiAqIHtcXG4gKiAgIC8vIE1hbmRhdG9yeVxcbiAqICAgXFxcInVzZXJJZFxcXCI6IFxcXCJzdHJpbmdcXFwiLCAgICAvLyBVbmlxdWUgSUQgb2YgdXNlciAoZS5nLiBhbGljZUBnbWFpbC5jb20pXFxuICogICBcXFwibGFzdFVwZGF0ZWRcXFwiOiBcXFwibnVtYmVyXFxcIiAgLy8gVGltZXN0YW1wIG9mIGxhc3QgY2hhbmdlIHRvIHRoZSBwcm9maWxlXFxuICogICAvLyBPcHRpb25hbFxcbiAqICAgXFxcIm5hbWVcXFwiOiBcXFwic3RyaW5nXFxcIiwgICAgICAvLyBOYW1lIChlLmcuIEFsaWNlKVxcbiAqICAgXFxcInVybFxcXCI6IFxcXCJzdHJpbmdcXFwiLCAgICAgICAvLyBIb21lcGFnZSBVUkxcXG4gKiAgIFxcXCJpbWFnZURhdGFcXFwiOiBcXFwic3RyaW5nXFxcIiwgLy8gVVJJIG9mIGEgcHJvZmlsZSBpbWFnZS5cXG4gKiB9XFxuICoqL1xcbntcXG4gIFxcXCJuYW1lXFxcIjogXFxcInNvY2lhbFxcXCIsXFxuICBcXFwiYXBpXFxcIjoge1xcbiAgICAvKiogXFxuICAgICAqIGVycm9yIGNvZGVzIGFuZCBkZWZhdWx0IG1lc3NhZ2VzIHRoYXQgbWF5IGJlIHJldHVybmVkIG9uIGZhaWx1cmVzLlxcbiAgICAgKi9cXG4gICAgXFxcIkVSUkNPREVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiY29uc3RhbnRcXFwiLCBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgLyoqIEdFTkVSQUwgKiovXFxuICAgICAgXFxcIlNVQ0NFU1NcXFwiOiBcXFwiU3VjY2VzcyFcXFwiLFxcbiAgICAgIC8vIFVua25vd25cXG4gICAgICBcXFwiVU5LTk9XTlxcXCI6IFxcXCJVbmtub3duIGVycm9yXFxcIixcXG4gICAgICAvLyBVc2VyIGlzIGN1cnJlbnRseSBvZmZsaW5lXFxuICAgICAgXFxcIk9GRkxJTkVcXFwiOiBcXFwiVXNlciBpcyBjdXJyZW50bHkgb2ZmbGluZVxcXCIsXFxuICAgICAgLy8gSW1wcm9wZXIgcGFyYW1ldGVyc1xcbiAgICAgIFxcXCJNQUxGT1JNRURQQVJBTUVURVJTXFxcIjogXFxcIlBhcmFtZXRlcnMgYXJlIG1hbGZvcm1lZFxcXCIsXFxuICBcXG4gICAgICAvKiogTE9HSU4gKiovXFxuICAgICAgLy8gRXJyb3IgYXV0aGVudGljYXRpbmcgdG8gdGhlIHNlcnZlciAoZS5nLiBpbnZhbGlkIGNyZWRlbnRpYWxzKVxcbiAgICAgIFxcXCJMT0dJTl9CQURDUkVERU5USUFMU1xcXCI6IFxcXCJFcnJvciBhdXRoZW50aWNhdGluZyB3aXRoIHNlcnZlclxcXCIsXFxuICAgICAgLy8gRXJyb3Igd2l0aCBjb25uZWN0aW5nIHRvIHRoZSBzZXJ2ZXJcXG4gICAgICBcXFwiTE9HSU5fRkFJTEVEQ09OTkVDVElPTlxcXCI6IFxcXCJFcnJvciBjb25uZWN0aW5nIHRvIHNlcnZlclxcXCIsXFxuICAgICAgLy8gVXNlciBpcyBhbHJlYWR5IGxvZ2dlZCBpblxcbiAgICAgIFxcXCJMT0dJTl9BTFJFQURZT05MSU5FXFxcIjogXFxcIlVzZXIgaXMgYWxyZWFkeSBsb2dnZWQgaW5cXFwiLFxcbiAgICAgIC8vIE9BdXRoIEVycm9yXFxuICAgICAgXFxcIkxPR0lOX09BVVRIRVJST1JcXFwiOiBcXFwiT0F1dGggRXJyb3JcXFwiLFxcbiAgXFxuICAgICAgLyoqIFNFTkRNRVNTQUdFICoqL1xcbiAgICAgIC8vIE1lc3NhZ2Ugc2VudCB0byBpbnZhbGlkIGRlc3RpbmF0aW9uIChlLmcuIG5vdCBpbiB1c2VyJ3Mgcm9zdGVyKVxcbiAgICAgIFxcXCJTRU5EX0lOVkFMSURERVNUSU5BVElPTlxcXCI6IFxcXCJNZXNzYWdlIHNlbnQgdG8gYW4gaW52YWxpZCBkZXN0aW5hdGlvblxcXCJcXG4gICAgfX0sXFxuICAgIFxcbiAgICAvKipcXG4gICAgICogTGlzdCBvZiBwb3NzaWJsZSBzdGF0dXNlcyBmb3IgPGNsaWVudF9zdGF0ZT4uc3RhdHVzXFxuICAgICAqKi9cXG4gICAgXFxcIlNUQVRVU1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJjb25zdGFudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IHtcXG4gICAgICAvLyBOb3QgbG9nZ2VkIGluXFxuICAgICAgXFxcIk9GRkxJTkVcXFwiOiBcXFwiT0ZGTElORVxcXCIsXFxuICAgICAgLy8gVGhpcyBjbGllbnQgcnVucyB0aGUgc2FtZSBmcmVlZG9tLmpzIGFwcCBhcyB5b3UgYW5kIGlzIG9ubGluZVxcbiAgICAgIFxcXCJPTkxJTkVcXFwiOiBcXFwiT05MSU5FXFxcIixcXG4gICAgICAvLyBUaGlzIGNsaWVudCBpcyBvbmxpbmUsIGJ1dCBkb2VzIG5vdCBydW4gdGhlIHNhbWUgYXBwIChjaGF0IGNsaWVudClcXG4gICAgICAvLyAoaS5lLiBjYW4gYmUgdXNlZnVsIHRvIGludml0ZSBvdGhlcnMgdG8geW91ciBmcmVlZG9tLmpzIGFwcClcXG4gICAgICBcXFwiT05MSU5FX1dJVEhfT1RIRVJfQVBQXFxcIjogXFxcIk9OTElORV9XSVRIX09USEVSX0FQUFxcXCJcXG4gICAgfX0sXFxuICBcXG4gICAgLyoqXFxuICAgICAqIExvZyBpbnRvIHRoZSBuZXR3b3JrIChTZWUgYmVsb3cgZm9yIHBhcmFtZXRlcnMpXFxuICAgICAqIGUuZy4gc29jaWFsLmxvZ2luKE9iamVjdCBvcHRpb25zKVxcbiAgICAgKlxcbiAgICAgKiBAbWV0aG9kIGxvZ2luXFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBsb2dpbk9wdGlvbnMgLSBTZWUgYmVsb3dcXG4gICAgICogQHJldHVybiB7T2JqZWN0fSA8Y2xpZW50X3N0YXRlPlxcbiAgICAgKiovXFxuICAgIFxcXCJsb2dpblxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLFxcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IFt7XFxuICAgICAgICAvLyBPcHRpb25hbFxcbiAgICAgICAgXFxcImFnZW50XFxcIjogXFxcInN0cmluZ1xcXCIsICAgICAgICAgLy8gTmFtZSBvZiB0aGUgYXBwbGljYXRpb25cXG4gICAgICAgIFxcXCJ2ZXJzaW9uXFxcIjogXFxcInN0cmluZ1xcXCIsICAgICAgIC8vIFZlcnNpb24gb2YgYXBwbGljYXRpb25cXG4gICAgICAgIFxcXCJ1cmxcXFwiOiBcXFwic3RyaW5nXFxcIiwgICAgICAgICAgIC8vIFVSTCBvZiBhcHBsaWNhdGlvblxcbiAgICAgICAgXFxcImludGVyYWN0aXZlXFxcIjogXFxcImJvb2xlYW5cXFwiLCAgLy8gQWxsb3cgdXNlciBpbnRlcmFjdGlvbiBmcm9tIHByb3ZpZGVyLlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgbm90IHNldCwgaW50ZXJwcmV0ZWQgYXMgdHJ1ZS5cXG4gICAgICAgIFxcXCJyZW1lbWJlckxvZ2luXFxcIjogXFxcImJvb2xlYW5cXFwiIC8vIENhY2hlIGxvZ2luIGNyZWRlbnRpYWxzLiBJZiBub3Qgc2V0LFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW50ZXJwcmV0ZWQgYXMgdHJ1ZS5cXG4gICAgICB9XSxcXG4gICAgICBcXFwicmV0XFxcIjogeyAgICAgICAgICAgICAgICAgICAgICAgLy8gPGNsaWVudF9zdGF0ZT4sIGRlZmluZWQgYWJvdmUuXFxuICAgICAgICBcXFwidXNlcklkXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwiY2xpZW50SWRcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJzdGF0dXNcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJsYXN0VXBkYXRlZFxcXCI6IFxcXCJudW1iZXJcXFwiLFxcbiAgICAgICAgXFxcImxhc3RTZWVuXFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgICB9LFxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gIFxcbiAgICAvKipcXG4gICAgICogQ2xlYXJzIGNhY2hlZCBjcmVkZW50aWFscyBvZiB0aGUgcHJvdmlkZXIuXFxuICAgICAqXFxuICAgICAqIEBtZXRob2QgY2xlYXJDYWNoZWRDcmVkZW50aWFsc1xcbiAgICAgKiBAcmV0dXJuIG5vdGhpbmdcXG4gICAgICoqL1xcbiAgICBcXFwiY2xlYXJDYWNoZWRDcmVkZW50aWFsc1xcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLCBcXFwidmFsdWVcXFwiOiBbXX0sXFxuICBcXG4gICAgLyoqXFxuICAgICAqIEdldCA8Y2xpZW50X3N0YXRlPnMgdGhhdCBoYXZlIGJlZW4gb2JzZXJ2ZWQuXFxuICAgICAqIFRoZSBwcm92aWRlciBpbXBsZW1lbnRhdGlvbiBtYXkgYWN0IGFzIGEgY2xpZW50LCBpbiB3aGljaCBjYXNlIGl0c1xcbiAgICAgKiA8Y2xpZW50X3N0YXRlPiB3aWxsIGJlIGluIHRoaXMgbGlzdC5cXG4gICAgICogZ2V0Q2xpZW50cyBtYXkgbm90IHJlcHJlc2VudCBhbiBlbnRpcmUgcm9zdGVyLCBzaW5jZSBpdCBtYXkgbm90IGJlXFxuICAgICAqIGVudW1lcmFibGUuXFxuICAgICAqIFxcbiAgICAgKiBAbWV0aG9kIGdldENsaWVudHNcXG4gICAgICogQHJldHVybiB7T2JqZWN0fSB7IFxcbiAgICAgKiAgICBcXFwiY2xpZW50SWQxXFxcIjogPGNsaWVudF9zdGF0ZT4sXFxuICAgICAqICAgIFxcXCJjbGllbnRJZDJcXFwiOiA8Y2xpZW50X3N0YXRlPixcXG4gICAgICogICAgIC4uLlxcbiAgICAgKiB9IExpc3Qgb2YgPGNsaWVudF9zdGF0ZT5zIGluZGV4ZWQgYnkgY2xpZW50SWRcXG4gICAgICogICBPbiBmYWlsdXJlLCByZWplY3RzIHdpdGggYW4gZXJyb3IgY29kZS5cXG4gICAgICoqL1xcbiAgICBcXFwiZ2V0Q2xpZW50c1xcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLFxcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IFtdLFxcbiAgICAgIFxcXCJyZXRcXFwiOiBcXFwib2JqZWN0XFxcIixcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXG4gICAgICB9XFxuICAgIH0sXFxuICBcXG4gICAgLyoqXFxuICAgICAqIEdldCA8dXNlcl9wcm9maWxlPnMgdGhhdCBoYXZlIGJlZW4gb2JzZXJ2ZWQuXFxuICAgICAqIFRoZSBwcm92aWRlciBpbXBsZW1lbnRhdGlvbiBtYXkgYWN0IGFzIGEgY2xpZW50LCBpbiB3aGljaCBjYXNlIGl0c1xcbiAgICAgKiA8dXNlcl9wcm9maWxlPiB3aWxsIGJlIGluIHRoaXMgbGlzdC5cXG4gICAgICogZ2V0VXNlcnMgbWF5IG5vdCByZXByZXNlbnQgYW4gZW50aXJlIHJvc3Rlciwgc2luY2UgaXQgbWF5IG5vdCBiZVxcbiAgICAgKiBlbnVtZXJhYmxlLlxcbiAgICAgKlxcbiAgICAgKiBAbWV0aG9kIGdldFVzZXJzXFxuICAgICAqIEByZXR1cm4ge09iamVjdH0geyBcXG4gICAgICogICAgXFxcInVzZXJJZDFcXFwiOiA8dXNlcl9wcm9maWxlPixcXG4gICAgICogICAgXFxcInVzZXJJZDJcXFwiOiA8dXNlcl9wcm9maWxlPixcXG4gICAgICogICAgIC4uLlxcbiAgICAgKiB9IExpc3Qgb2YgPHVzZXJfcHJvZmlsZT5zIGluZGV4ZWQgYnkgdXNlcklkXFxuICAgICAqICAgT24gZmFpbHVyZSwgcmVqZWN0cyB3aXRoIGFuIGVycm9yIGNvZGUuXFxuICAgICAqKi9cXG4gICAgXFxcImdldFVzZXJzXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW10sXFxuICAgICAgXFxcInJldFxcXCI6IFxcXCJvYmplY3RcXFwiLFxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gIFxcbiAgICAvKiogXFxuICAgICAqIFNlbmQgYSBtZXNzYWdlLlxcbiAgICAgKiBEZXN0aW5hdGlvbiBtYXkgYmUgYSB1c2VySWQgb3IgYSBjbGllbnRJZC4gSWYgaXQgaXMgYSB1c2VySWQsIGFsbCBjbGllbnRzXFxuICAgICAqIGZvciB0aGF0IHVzZXIgc2hvdWxkIHJlY2VpdmUgdGhlIG1lc3NhZ2UuXFxuICAgICAqIFxcbiAgICAgKiBAbWV0aG9kIHNlbmRNZXNzYWdlXFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkZXN0aW5hdGlvbl9pZCBUaGUgdXNlcklkIG9yIGNsaWVudElkIHRvIHNlbmQgdG9cXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gc2VuZC5cXG4gICAgICogQHJldHVybiBub3RoaW5nXFxuICAgICAqICBPbiBmYWlsdXJlLCByZWplY3RzIHdpdGggYW4gZXJyb3IgY29kZVxcbiAgICAgKiovXFxuICAgIFxcXCJzZW5kTWVzc2FnZVxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLFxcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIiwgXFxcInN0cmluZ1xcXCJdLFxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gIFxcbiAgICAvKipcXG4gICAgICogTG9nIG91dCBvZiB0aGUgbmV0d29yay5cXG4gICAgICogXFxuICAgICAqIEBtZXRob2QgbG9nb3V0XFxuICAgICAqIEByZXR1cm4gbm90aGluZ1xcbiAgICAgKiAgT24gZmFpbHVyZSwgcmVqZWN0cyB3aXRoIGFuIGVycm9yIGNvZGVcXG4gICAgICoqL1xcbiAgICBcXFwibG9nb3V0XFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW10sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8qKlxcbiAgICAgKiBSZWNlaXZlIGFuIGluY29taW5nIG1lc3NhZ2UuXFxuICAgICAqKi9cXG4gICAgXFxcIm9uTWVzc2FnZVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IHtcXG4gICAgICBcXFwiZnJvbVxcXCI6IHsgICAgICAgICAgICAgICAvLyA8Y2xpZW50X3N0YXRlPiwgZGVmaW5lZCBhYm92ZS5cXG4gICAgICAgIFxcXCJ1c2VySWRcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICAgIFxcXCJjbGllbnRJZFxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcInN0YXR1c1xcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcImxhc3RVcGRhdGVkXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgICBcXFwibGFzdFNlZW5cXFwiOiBcXFwibnVtYmVyXFxcIlxcbiAgICAgIH0sXFxuICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIiAgICAgLy8gbWVzc2FnZSBjb250ZW50c1xcbiAgICB9fSxcXG4gIFxcbiAgICAvKipcXG4gICAgICogUmVjZWl2ZSBhIGNoYW5nZSB0byBhIDx1c2VyX3Byb2ZpbGU+LlxcbiAgICAgKiovXFxuICAgIFxcXCJvblVzZXJQcm9maWxlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIiwgXFxcInZhbHVlXFxcIjogeyAvLyA8dXNlcl9wcm9maWxlPiwgZGVmaW5lZCBhYm92ZS5cXG4gICAgICBcXFwidXNlcklkXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcImxhc3RVcGRhdGVkXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgXFxcIm5hbWVcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICBcXFwidXJsXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcImltYWdlRGF0YVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgIH19LFxcbiAgXFxuICAgIC8qKlxcbiAgICAgKiBSZWNlaXZlIGEgY2hhbmdlIHRvIGEgPGNsaWVudF9zdGF0ZT4uXFxuICAgICAqKi9cXG4gICAgXFxcIm9uQ2xpZW50U3RhdGVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiZXZlbnRcXFwiLCBcXFwidmFsdWVcXFwiOiB7IC8vIDxjbGllbnRfc3RhdGU+LCBkZWZpbmVkIGFib3ZlLlxcbiAgICAgIFxcXCJ1c2VySWRcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICBcXFwiY2xpZW50SWRcXFwiOiBcXFwic3RyaW5nXFxcIixcXG4gICAgICBcXFwic3RhdHVzXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgXFxcImxhc3RVcGRhdGVkXFxcIjogXFxcIm51bWJlclxcXCIsXFxuICAgICAgXFxcImxhc3RTZWVuXFxcIjogXFxcIm51bWJlclxcXCJcXG4gICAgfX1cXG4gIH1cXG59XFxuXCI7XG5zZWxmLnN0b3JhZ2UgPSBcIi8qKlxcclxcbiAqIFNUT1JBR0UgQVBJXFxyXFxuICpcXHJcXG4gKiBBUEkgZm9yIFBlcnNpc3RlbnQgU3RvcmFnZVxcclxcbiAqIEV4cG9zZXMgYSBrZXktdmFsdWUgZ2V0L3B1dCBpbnRlcmZhY2VcXHJcXG4gKiovXFxyXFxue1xcclxcbiAgXFxcIm5hbWVcXFwiOiBcXFwic3RvcmFnZVxcXCIsXFxyXFxuICBcXFwiYXBpXFxcIjoge1xcclxcbiAgICAvKiogXFxyXFxuICAgICAqIExpc3Qgb2Ygc2NvcGVzIHRoYXQgY2FuIHByZWZlcnJlZCB3aGVuIGFjY2Vzc2luZyBzdG9yYWdlLlxcclxcbiAgICAqKi9cXHJcXG4gICAgXFxcInNjb3BlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImNvbnN0YW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcclxcbiAgICAgIC8vIFN0b3JhZ2Ugc2hvdWxkIG9ubHkgbGFzdCB3aGlsZSB0aGUgYXBwIGlzIGFjdGl2ZS5cXHJcXG4gICAgICBcXFwiU0VTU0lPTlxcXCI6IDAsXFxyXFxuICAgICAgLy8gU3RvcmFnZSBzaG91bGQgYmUgbGltaXRlZCB0byBob3N0IHRoZSBhcHAgaXMgYm91bmQgdG8uXFxyXFxuICAgICAgXFxcIkRFVklDRV9MT0NBTFxcXCI6IDEsXFxyXFxuICAgICAgLy8gU3RvcmFnZSBzaG91bGQgYmUgc3luY2hyb25pemVkIGJldHdlZW4gdXNlciBkZXZpY2VzLlxcclxcbiAgICAgIFxcXCJVU0VSX0xPQ0FMXFxcIjogMixcXHJcXG4gICAgICAvLyBTdG9yYWdlIHNob3VsZCBiZSBzeW5jaHJvbml6ZWQgYWNyb3NzIHVzZXJzLlxcclxcbiAgICAgIFxcXCJTSEFSRURcXFwiOiAzXFxyXFxuICAgIH19LFxcclxcbiAgXFxyXFxuICAgIC8qKiBcXHJcXG4gICAgICogZXJyb3IgY29kZXMgYW5kIGRlZmF1bHQgbWVzc2FnZXMgdGhhdCBtYXkgYmUgcmV0dXJuZWQgb24gZmFpbHVyZXMuXFxyXFxuICAgICAqL1xcclxcbiAgICBcXFwiRVJSQ09ERVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJjb25zdGFudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IHtcXHJcXG4gICAgICAvKiogR0VORVJBTCAqKi9cXHJcXG4gICAgICBcXFwiU1VDQ0VTU1xcXCI6IFxcXCJTdWNjZXNzIVxcXCIsXFxyXFxuICAgICAgLy8gVW5rbm93blxcclxcbiAgICAgIFxcXCJVTktOT1dOXFxcIjogXFxcIlVua25vd24gZXJyb3JcXFwiLFxcclxcbiAgICAgIC8vIERhdGFiYXNlIG5vdCByZWFkeVxcclxcbiAgICAgIFxcXCJPRkZMSU5FXFxcIjogXFxcIkRhdGFiYXNlIG5vdCByZWFjaGFibGVcXFwiLFxcclxcbiAgICAgIC8vIEltcHJvcGVyIHBhcmFtZXRlcnNcXHJcXG4gICAgICBcXFwiTUFMRk9STUVEUEFSQU1FVEVSU1xcXCI6IFxcXCJQYXJhbWV0ZXJzIGFyZSBtYWxmb3JtZWRcXFwiXFxyXFxuICAgIH19LFxcclxcbiAgXFxyXFxuICAgIC8qKlxcclxcbiAgICAgKiBDcmVhdGUgYSBzdG9yYWdlIHByb3ZpZGVyLlxcclxcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xcclxcbiAgICAgKiAgICBzY29wZSB7c3RvcmFnZS5zY29wZX0gVGhlIHByZWZlcnJlZCBzdG9yYWdlIHNjb3BlLlxcclxcbiAgICAgKiBAY29uc3RydWN0b3JcXHJcXG4gICAgICovXFxyXFxuICAgIFxcXCJjb25zdHJ1Y3RvclxcXCI6IHsgXFxcInZhbHVlXFxcIjogW3tcXHJcXG4gICAgICBcXFwic2NvcGVcXFwiOiBcXFwibnVtYmVyXFxcIlxcclxcbiAgICB9XX0sXFxyXFxuICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIEZldGNoIGFuIGFycmF5IG9mIGFsbCBrZXlzXFxyXFxuICAgICAqIGUuZy4gc3RvcmFnZS5rZXlzKCkgPT4gW3N0cmluZ11cXHJcXG4gICAgICpcXHJcXG4gICAgICogQG1ldGhvZCBrZXlzXFxyXFxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCBhbGwga2V5cyBpbiB0aGUgc3RvcmUgXFxyXFxuICAgICAqKi9cXHJcXG4gICAgXFxcImtleXNcXFwiOiB7XFxyXFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXHJcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXSxcXHJcXG4gICAgICBcXFwicmV0XFxcIjogW1xcXCJhcnJheVxcXCIsIFxcXCJzdHJpbmdcXFwiXSxcXHJcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcclxcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXHJcXG4gICAgICB9XFxyXFxuICAgIH0sXFxyXFxuICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIEZldGNoIGEgdmFsdWUgZm9yIGEga2V5XFxyXFxuICAgICAqIGUuZy4gc3RvcmFnZS5nZXQoU3RyaW5nIGtleSkgPT4gc3RyaW5nXFxyXFxuICAgICAqXFxyXFxuICAgICAqIEBtZXRob2QgZ2V0XFxyXFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgLSBrZXkgdG8gZmV0Y2hcXHJcXG4gICAgICogQHJldHVybiB7U3RyaW5nfSBSZXR1cm5zIGEgc3RyaW5nIHdpdGggdGhlIHZhbHVlLCBudWxsIGlmIGRvZXNuJ3QgZXhpc3RcXHJcXG4gICAgICoqL1xcclxcbiAgICBcXFwiZ2V0XFxcIjoge1xcclxcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxyXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXSxcXHJcXG4gICAgICBcXFwicmV0XFxcIjogXFxcInN0cmluZ1xcXCIsXFxyXFxuICAgICAgXFxcImVyclxcXCI6IHtcXHJcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxyXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxyXFxuICAgICAgfVxcclxcbiAgICB9LFxcclxcbiAgXFxyXFxuICAgIC8qKlxcclxcbiAgICAgKiBTZXRzIGEgdmFsdWUgdG8gYSBrZXlcXHJcXG4gICAgICogZS5nLiBzdG9yYWdlLnNldChTdHJpbmcga2V5LCBTdHJpbmcgdmFsdWUpXFxyXFxuICAgICAqXFxyXFxuICAgICAqIEBtZXRob2Qgc2V0XFxyXFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgLSBrZXkgb2YgdmFsdWUgdG8gc2V0XFxyXFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIHZhbHVlXFxyXFxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gcHJldmlvdXMgdmFsdWUgb2Yga2V5IGlmIHRoZXJlIHdhcyBvbmUuXFxyXFxuICAgICAqKi9cXHJcXG4gICAgXFxcInNldFxcXCI6IHtcXHJcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJtZXRob2RcXFwiLFxcclxcbiAgICAgIFxcXCJ2YWx1ZVxcXCI6IFtcXFwic3RyaW5nXFxcIiwgXFxcInN0cmluZ1xcXCJdLFxcclxcbiAgICAgIFxcXCJyZXRcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcclxcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXHJcXG4gICAgICB9XFxyXFxuICAgIH0sXFxyXFxuICAgIFxcclxcbiAgICAvKipcXHJcXG4gICAgICogUmVtb3ZlcyBhIHNpbmdsZSBrZXlcXHJcXG4gICAgICogZS5nLiBzdG9yYWdlLnJlbW92ZShTdHJpbmcga2V5KVxcclxcbiAgICAgKlxcclxcbiAgICAgKiBAbWV0aG9kIHJlbW92ZVxcclxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IC0ga2V5IHRvIHJlbW92ZVxcclxcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IHByZXZpb3VzIHZhbHVlIG9mIGtleSBpZiB0aGVyZSB3YXMgb25lLlxcclxcbiAgICAgKiovXFxyXFxuICAgIFxcXCJyZW1vdmVcXFwiOiB7XFxyXFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXHJcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLFxcclxcbiAgICAgIFxcXCJyZXRcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcclxcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXHJcXG4gICAgICB9XFxyXFxuICAgIH0sXFxyXFxuICAgIFxcclxcbiAgICAvKipcXHJcXG4gICAgICogUmVtb3ZlcyBhbGwgZGF0YSBmcm9tIHN0b3JhZ2VcXHJcXG4gICAgICogZS5nLiBzdG9yYWdlLmNsZWFyKClcXHJcXG4gICAgICpcXHJcXG4gICAgICogQG1ldGhvZCBjbGVhclxcclxcbiAgICAgKiBAcmV0dXJuIG5vdGhpbmdcXHJcXG4gICAgICoqL1xcclxcbiAgICBcXFwiY2xlYXJcXFwiOiB7XFxyXFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXHJcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXSxcXHJcXG4gICAgICBcXFwicmV0XFxcIjogW10sXFxyXFxuICAgICAgXFxcImVyclxcXCI6IHtcXHJcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxyXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxyXFxuICAgICAgfVxcclxcbiAgICB9XFxyXFxuICB9XFxyXFxufVxcclxcblwiO1xuc2VsZi5zdG9yZWJ1ZmZlciA9IFwiXFxyXFxuLyoqXFxyXFxuICogU1RPUkFHRSBBUElcXHJcXG4gKlxcclxcbiAqIEFQSSBmb3IgUGVyc2lzdGVudCBTdG9yYWdlXFxyXFxuICogRXhwb3NlcyBhIGtleS12YWx1ZSBnZXQvcHV0IGludGVyZmFjZVxcclxcbiAqKi9cXHJcXG57XFxyXFxuICBcXFwibmFtZVxcXCI6IFxcXCJzdG9yZWJ1ZmZlclxcXCIsXFxyXFxuICBcXFwiYXBpXFxcIjoge1xcclxcbiAgICAvKiogXFxyXFxuICAgICAqIExpc3Qgb2Ygc2NvcGVzIHRoYXQgY2FuIHByZWZlcnJlZCB3aGVuIGFjY2Vzc2luZyBzdG9yYWdlLlxcclxcbiAgICAqKi9cXHJcXG4gICAgXFxcInNjb3BlXFxcIjoge1xcXCJ0eXBlXFxcIjogXFxcImNvbnN0YW50XFxcIiwgXFxcInZhbHVlXFxcIjoge1xcclxcbiAgICAgIC8vIFN0b3JhZ2Ugc2hvdWxkIG9ubHkgbGFzdCB3aGlsZSB0aGUgYXBwIGlzIGFjdGl2ZS5cXHJcXG4gICAgICBcXFwiU0VTU0lPTlxcXCI6IDAsXFxyXFxuICAgICAgLy8gU3RvcmFnZSBzaG91bGQgYmUgbGltaXRlZCB0byBob3N0IHRoZSBhcHAgaXMgYm91bmQgdG8uXFxyXFxuICAgICAgXFxcIkRFVklDRV9MT0NBTFxcXCI6IDEsXFxyXFxuICAgICAgLy8gU3RvcmFnZSBzaG91bGQgYmUgc3luY2hyb25pemVkIGJldHdlZW4gdXNlciBkZXZpY2VzLlxcclxcbiAgICAgIFxcXCJVU0VSX0xPQ0FMXFxcIjogMixcXHJcXG4gICAgICAvLyBTdG9yYWdlIHNob3VsZCBiZSBzeW5jaHJvbml6ZWQgYWNyb3NzIHVzZXJzLlxcclxcbiAgICAgIFxcXCJTSEFSRURcXFwiOiAzXFxyXFxuICAgIH19LFxcclxcbiAgXFxyXFxuICAgIC8qKiBcXHJcXG4gICAgICogZXJyb3IgY29kZXMgYW5kIGRlZmF1bHQgbWVzc2FnZXMgdGhhdCBtYXkgYmUgcmV0dXJuZWQgb24gZmFpbHVyZXMuXFxyXFxuICAgICAqL1xcclxcbiAgICBcXFwiRVJSQ09ERVxcXCI6IHtcXFwidHlwZVxcXCI6IFxcXCJjb25zdGFudFxcXCIsIFxcXCJ2YWx1ZVxcXCI6IHtcXHJcXG4gICAgICAvKiogR0VORVJBTCAqKi9cXHJcXG4gICAgICBcXFwiU1VDQ0VTU1xcXCI6IFxcXCJTdWNjZXNzIVxcXCIsXFxyXFxuICAgICAgLy8gVW5rbm93blxcclxcbiAgICAgIFxcXCJVTktOT1dOXFxcIjogXFxcIlVua25vd24gZXJyb3JcXFwiLFxcclxcbiAgICAgIC8vIERhdGFiYXNlIG5vdCByZWFkeVxcclxcbiAgICAgIFxcXCJPRkZMSU5FXFxcIjogXFxcIkRhdGFiYXNlIG5vdCByZWFjaGFibGVcXFwiLFxcclxcbiAgICAgIC8vIEltcHJvcGVyIHBhcmFtZXRlcnNcXHJcXG4gICAgICBcXFwiTUFMRk9STUVEUEFSQU1FVEVSU1xcXCI6IFxcXCJQYXJhbWV0ZXJzIGFyZSBtYWxmb3JtZWRcXFwiXFxyXFxuICAgIH19LFxcclxcbiAgXFxyXFxuICAgIC8qKlxcclxcbiAgICAgKiBDcmVhdGUgYSBzdG9yYWdlIHByb3ZpZGVyLlxcclxcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xcclxcbiAgICAgKiAgICBzY29wZSB7c3RvcmFnZS5zY29wZX0gVGhlIHByZWZlcnJlZCBzdG9yYWdlIHNjb3BlLlxcclxcbiAgICAgKiBAY29uc3RydWN0b3JcXHJcXG4gICAgICovXFxyXFxuICAgIFxcXCJjb25zdHJ1Y3RvclxcXCI6IHsgXFxcInZhbHVlXFxcIjogW3tcXHJcXG4gICAgICBcXFwic2NvcGVcXFwiOiBcXFwibnVtYmVyXFxcIlxcclxcbiAgICB9XX0sXFxyXFxuICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIEZldGNoIGFuIGFycmF5IG9mIGFsbCBrZXlzXFxyXFxuICAgICAqIGUuZy4gc3RvcmFnZS5rZXlzKCkgPT4gW3N0cmluZ11cXHJcXG4gICAgICpcXHJcXG4gICAgICogQG1ldGhvZCBrZXlzXFxyXFxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCBhbGwga2V5cyBpbiB0aGUgc3RvcmUgXFxyXFxuICAgICAqKi9cXHJcXG4gICAgXFxcImtleXNcXFwiOiB7XFxyXFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXHJcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXSxcXHJcXG4gICAgICBcXFwicmV0XFxcIjogW1xcXCJhcnJheVxcXCIsIFxcXCJzdHJpbmdcXFwiXSxcXHJcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcclxcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXHJcXG4gICAgICB9XFxyXFxuICAgIH0sXFxyXFxuICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIEZldGNoIGEgdmFsdWUgZm9yIGEga2V5XFxyXFxuICAgICAqIGUuZy4gc3RvcmFnZS5nZXQoU3RyaW5nIGtleSkgPT4gc3RyaW5nXFxyXFxuICAgICAqXFxyXFxuICAgICAqIEBtZXRob2QgZ2V0XFxyXFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgLSBrZXkgdG8gZmV0Y2hcXHJcXG4gICAgICogQHJldHVybiB7QXJyYXlCdWZmZXJ9IFJldHVybnMgdmFsdWUsIG51bGwgaWYgZG9lc24ndCBleGlzdFxcclxcbiAgICAgKiovXFxyXFxuICAgIFxcXCJnZXRcXFwiOiB7XFxyXFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXHJcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCJdLFxcclxcbiAgICAgIFxcXCJyZXRcXFwiOiBcXFwiYnVmZmVyXFxcIixcXHJcXG4gICAgICBcXFwiZXJyXFxcIjoge1xcclxcbiAgICAgICAgXFxcImVycmNvZGVcXFwiOiBcXFwic3RyaW5nXFxcIixcXHJcXG4gICAgICAgIFxcXCJtZXNzYWdlXFxcIjogXFxcInN0cmluZ1xcXCJcXHJcXG4gICAgICB9XFxyXFxuICAgIH0sXFxyXFxuICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIFNldHMgYSB2YWx1ZSB0byBhIGtleVxcclxcbiAgICAgKiBlLmcuIHN0b3JhZ2Uuc2V0KFN0cmluZyBrZXksIFN0cmluZyB2YWx1ZSlcXHJcXG4gICAgICpcXHJcXG4gICAgICogQG1ldGhvZCBzZXRcXHJcXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGtleSAtIGtleSBvZiB2YWx1ZSB0byBzZXRcXHJcXG4gICAgICogQHBhcmFtIHtBcnJheUJ1ZmZlcn0gdmFsdWUgLSB2YWx1ZVxcclxcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IHByZXZpb3VzIHZhbHVlIG9mIGtleSBpZiB0aGVyZSB3YXMgb25lLlxcclxcbiAgICAgKiovXFxyXFxuICAgIFxcXCJzZXRcXFwiOiB7XFxyXFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXHJcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXFxcInN0cmluZ1xcXCIsIFxcXCJidWZmZXJcXFwiXSxcXHJcXG4gICAgICBcXFwicmV0XFxcIjogXFxcImJ1ZmZlclxcXCIsXFxyXFxuICAgICAgXFxcImVyclxcXCI6IHtcXHJcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxyXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxyXFxuICAgICAgfVxcclxcbiAgICB9LFxcclxcbiAgICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIFJlbW92ZXMgYSBzaW5nbGUga2V5XFxyXFxuICAgICAqIGUuZy4gc3RvcmFnZS5yZW1vdmUoU3RyaW5nIGtleSlcXHJcXG4gICAgICpcXHJcXG4gICAgICogQG1ldGhvZCByZW1vdmVcXHJcXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGtleSAtIGtleSB0byByZW1vdmVcXHJcXG4gICAgICogQHJldHVybiB7U3RyaW5nfSBwcmV2aW91cyB2YWx1ZSBvZiBrZXkgaWYgdGhlcmUgd2FzIG9uZS5cXHJcXG4gICAgICoqL1xcclxcbiAgICBcXFwicmVtb3ZlXFxcIjoge1xcclxcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxyXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiXSxcXHJcXG4gICAgICBcXFwicmV0XFxcIjogXFxcImJ1ZmZlclxcXCIsXFxyXFxuICAgICAgXFxcImVyclxcXCI6IHtcXHJcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxyXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxyXFxuICAgICAgfVxcclxcbiAgICB9LFxcclxcbiAgICBcXHJcXG4gICAgLyoqXFxyXFxuICAgICAqIFJlbW92ZXMgYWxsIGRhdGEgZnJvbSBzdG9yYWdlXFxyXFxuICAgICAqIGUuZy4gc3RvcmFnZS5jbGVhcigpXFxyXFxuICAgICAqXFxyXFxuICAgICAqIEBtZXRob2QgY2xlYXJcXHJcXG4gICAgICogQHJldHVybiBub3RoaW5nXFxyXFxuICAgICAqKi9cXHJcXG4gICAgXFxcImNsZWFyXFxcIjoge1xcclxcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxyXFxuICAgICAgXFxcInZhbHVlXFxcIjogW10sXFxyXFxuICAgICAgXFxcInJldFxcXCI6IFtdLFxcclxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxyXFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcclxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcclxcbiAgICAgIH1cXHJcXG4gICAgfVxcclxcbiAgfVxcclxcbn1cXHJcXG5cIjtcbnNlbGYudHJhbnNwb3J0ID0gXCIvKipcXG4gKiBUUkFOU1BPUlQgQVBJXFxuICpcXG4gKiBBUEkgZm9yIHBlZXItdG8tcGVlciBjb21tdW5pY2F0aW9uXFxuICogVXNlZnVsIGZvciBzZW5kaW5nIGxhcmdlIGJpbmFyeSBkYXRhIGJldHdlZW4gaW5zdGFuY2VzXFxuICoqL1xcbntcXG4gIFxcXCJuYW1lXFxcIjogXFxcInRyYW5zcG9ydFxcXCIsXFxuICBcXFwiYXBpXFxcIjoge1xcbiAgICAvKiogXFxuICAgICAqIGVycm9yIGNvZGVzIGFuZCBkZWZhdWx0IG1lc3NhZ2VzIHRoYXQgbWF5IGJlIHJldHVybmVkIG9uIGZhaWx1cmVzLlxcbiAgICAgKi9cXG4gICAgXFxcIkVSUkNPREVcXFwiOiB7XFxcInR5cGVcXFwiOiBcXFwiY29uc3RhbnRcXFwiLCBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgLyoqIEdFTkVSQUwgKiovXFxuICAgICAgXFxcIlNVQ0NFU1NcXFwiOiBcXFwiU3VjY2VzcyFcXFwiLFxcbiAgICAgIC8vIFVua25vd25cXG4gICAgICBcXFwiVU5LTk9XTlxcXCI6IFxcXCJVbmtub3duIGVycm9yXFxcIixcXG4gICAgICAvLyBEYXRhYmFzZSBub3QgcmVhZHlcXG4gICAgICBcXFwiT0ZGTElORVxcXCI6IFxcXCJOb3QgcmVhY2hhYmxlXFxcIixcXG4gICAgICAvLyBJbXByb3BlciBwYXJhbWV0ZXJzXFxuICAgICAgXFxcIk1BTEZPUk1FRFBBUkFNRVRFUlNcXFwiOiBcXFwiUGFyYW1ldGVycyBhcmUgbWFsZm9ybWVkXFxcIlxcbiAgICB9fSxcXG4gIFxcbiAgICAvKipcXG4gICAgICogUHJlcGFyZSBhIFAyUCBjb25uZWN0aW9uIHdpdGggaW5pdGlhbGl6YXRpb24gcGFyYW1ldGVyc1xcbiAgICAgKiBUYWtlcyBpbiBhIHNpZ25hbGxpbmcgcGF0aHdheSAoZnJlZWRvbS5qcyBjaGFubmVsKSwgd2hpY2ggaXMgdXNlZFxcbiAgICAgKiBieSB0aGUgdHJhbnNwb3J0IHByb3ZpZGVyIHRvIHNlbmQvcmVjZWl2ZSBzaWduYWxsaW5nIG1lc3NhZ2VzXFxuICAgICAqIHRvIHRoZSBvdGhlciBzaWRlIG9mIHRoZSBQMlAgY29ubmVjdGlvbiBmb3Igc2V0dXAuXFxuICAgICAqXFxuICAgICAqIEBtZXRob2Qgc2V0dXBcXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSBnaXZlIHRoaXMgY29ubmVjdGlvbiBhIG5hbWUgZm9yIGxvZ2dpbmdcXG4gICAgICogQHBhcmFtIHtQcm94eX0gY2hhbm5lbCAtIHNpZ25hbGxpbmcgY2hhbm5lbFxcbiAgICAgKiBAcmV0dXJuIG5vdGhpbmcuXFxuICAgICAqKi9cXG4gICAgXFxcInNldHVwXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwicHJveHlcXFwiXSxcXG4gICAgICBcXFwicmV0XFxcIjogW10sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8qKlxcbiAgICAgKiBTZW5kIGJpbmFyeSBkYXRhIHRvIHRoZSBwZWVyXFxuICAgICAqIEFsbCBkYXRhIGlzIGxhYmVsbGVkIHdpdGggYSBzdHJpbmcgdGFnXFxuICAgICAqIEFueSBkYXRhIHNlbnQgd2l0aCB0aGUgc2FtZSB0YWcgaXMgc2VudCBpbiBvcmRlcixcXG4gICAgICogYnV0IHRoZXJlIGlzIG5vIGd1YXJhbnRlZXMgYmV0d2VlbiB0YWdzXFxuICAgICAqXFxuICAgICAqIEBtZXRob2Qgc2VuZFxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGFnXFxuICAgICAqIEBwYXJhbSB7YnVmZmVyfSBkYXRhXFxuICAgICAqIEByZXR1cm4gbm90aGluZ1xcbiAgICAgKiovXFxuICAgIFxcXCJzZW5kXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcIm1ldGhvZFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW1xcXCJzdHJpbmdcXFwiLCBcXFwiYnVmZmVyXFxcIl0sXFxuICAgICAgXFxcInJldFxcXCI6IFtdLFxcbiAgICAgIFxcXCJlcnJcXFwiOiB7XFxuICAgICAgICBcXFwiZXJyY29kZVxcXCI6IFxcXCJzdHJpbmdcXFwiLFxcbiAgICAgICAgXFxcIm1lc3NhZ2VcXFwiOiBcXFwic3RyaW5nXFxcIlxcbiAgICAgIH1cXG4gICAgfSxcXG4gIFxcbiAgICAvKipcXG4gICAgICogQ2xvc2UgdGhlIGNvbm5lY3Rpb24uIEFueSBkYXRhIHF1ZXVlZCBmb3Igc2VuZGluZywgb3IgaW4gdGhlXFxuICAgICAqIHByb2Nlc3Mgb2Ygc2VuZGluZywgbWF5IGJlIGRyb3BwZWQuIElmIHRoZSBzdGF0ZSBvZiB0aGUgcHJvbXNlIG9mXFxuICAgICAqIHRoZSBzZW5kIG1ldGhvZCBpcyBcXFwicGVuZGluZ1xcXCIgdGhlbiB0aGUgZGF0YSBmb3IgdGhhdCBzZW5kIGNhbGwgbWF5XFxuICAgICAqIGJlIHNlbmRpbmcgb3IgcXVldWVkLlxcbiAgICAgKiBcXG4gICAgICogQG1ldGhvZCBjbG9zZVxcbiAgICAgKiBAcmV0dXJuIG5vdGhpbmdcXG4gICAgICoqL1xcbiAgICBcXFwiY2xvc2VcXFwiOiB7XFxuICAgICAgXFxcInR5cGVcXFwiOiBcXFwibWV0aG9kXFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiBbXSxcXG4gICAgICBcXFwicmV0XFxcIjogW10sXFxuICAgICAgXFxcImVyclxcXCI6IHtcXG4gICAgICAgIFxcXCJlcnJjb2RlXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwibWVzc2FnZVxcXCI6IFxcXCJzdHJpbmdcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8qKlxcbiAgICAgKiBFdmVudCBvbiBpbmNvbWluZyBkYXRhIChBcnJheUJ1ZmZlcilcXG4gICAgICoqL1xcbiAgICBcXFwib25EYXRhXFxcIjoge1xcbiAgICAgIFxcXCJ0eXBlXFxcIjogXFxcImV2ZW50XFxcIixcXG4gICAgICBcXFwidmFsdWVcXFwiOiB7XFxuICAgICAgICBcXFwidGFnXFxcIjogXFxcInN0cmluZ1xcXCIsXFxuICAgICAgICBcXFwiZGF0YVxcXCI6IFxcXCJidWZmZXJcXFwiXFxuICAgICAgfVxcbiAgICB9LFxcbiAgXFxuICAgIC8qKlxcbiAgICAgKiBFdmVudCBvbiBzdWNjZXNzZnVsIGNsb3Npbmcgb2YgdGhlIGNvbm5lY3Rpb25cXG4gICAgICoqL1xcbiAgICBcXFwib25DbG9zZVxcXCI6IHtcXG4gICAgICBcXFwidHlwZVxcXCI6IFxcXCJldmVudFxcXCIsXFxuICAgICAgXFxcInZhbHVlXFxcIjogW11cXG4gICAgfVxcbiAgfVxcbn1cXG5cIjtcbnJldHVybiBzZWxmfSkoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIHBhc3MuXG4gIH1cbiAgLypqc2xpbnQgbm9tZW46IGZhbHNlICovXG4gIHV0aWwuZWFjaFByb3AoZm91bmQsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgdGhpcy5pbnRlcmZhY2VzLnB1c2goSlNPTi5wYXJzZShtaW5pZnkoanNvbikpKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cblxuLyoqXG4gKiBQb3B1bGF0ZSBhbiBBUEkgcmVnaXN0cnkgd2l0aCBwcm92aWRlZCBwcm92aWRlcnMsIGFuZCB3aXRoIGtub3duIEFQSVxuICogZGVmaW5pdGlvbnMuXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIHJlZ2lzdGVyXG4gKiBAcGFyYW0ge3tuYW1lOiBzdHJpbmcsIHByb3ZpZGVyOiBGdW5jdGlvbiwgc3R5bGU/OiBzdHJpbmd9W119IHByb3ZpZGVyc1xuICogICBUaGUgY29yZSBwcm92aWRlcnMgbWFkZSBhdmFpbGFibGUgdG8gdGhpcyBmcmVlZG9tLmpzIGluc3RhbmNlLlxuICogQHBhcmFtIHtBcGl9IHJlZ2lzdHJ5IFRoZSBBUEkgcmVnaXN0cnkgdG8gcG9wdWxhdGUuXG4gKi9cbmV4cG9ydHMucmVnaXN0ZXIgPSBmdW5jdGlvbiAocHJvdmlkZXJzLCByZWdpc3RyeSkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBidW5kbGUgPSBuZXcgQnVuZGxlKCk7XG4gIGJ1bmRsZS5pbnRlcmZhY2VzLmZvckVhY2goZnVuY3Rpb24gKGFwaSkge1xuICAgIGlmIChhcGkgJiYgYXBpLm5hbWUgJiYgYXBpLmFwaSkge1xuICAgICAgcmVnaXN0cnkuc2V0KGFwaS5uYW1lLCBhcGkuYXBpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHByb3ZpZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChwcm92aWRlcikge1xuICAgIGlmIChwcm92aWRlci5uYW1lKSB7XG4gICAgICByZWdpc3RyeS5yZWdpc3Rlcihwcm92aWRlci5uYW1lLCBwcm92aWRlci5wcm92aWRlciwgcHJvdmlkZXIuc3R5bGUpO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiLypnbG9iYWxzIEJsb2IsIEFycmF5QnVmZmVyLCBEYXRhVmlldyAqL1xuLypqc2xpbnQgaW5kZW50OjIsIG5vZGU6dHJ1ZSwgc2xvcHB5OnRydWUgKi9cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogQSBmcmVlZG9tIHBvcnQgZm9yIGEgdXNlci1hY2Nlc3NhYmxlIGFwaS5cbiAqIEBjbGFzcyBDb25zdW1lclxuICogQGltcGxlbWVudHMgUG9ydFxuICogQHVzZXMgaGFuZGxlRXZlbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gaW50ZXJmYWNlQ2xzIFRoZSBhcGkgaW50ZXJmYWNlIGV4cG9zZWQgYnkgdGhpcyBjb25zdW1lci5cbiAqIEBwYXJhbSB7RGVidWd9IGRlYnVnIFRoZSBkZWJ1Z2dlciB0byB1c2UgZm9yIGxvZ2dpbmcuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENvbnN1bWVyID0gZnVuY3Rpb24gKGludGVyZmFjZUNscywgZGVidWcpIHtcbiAgdGhpcy5pZCA9IENvbnN1bWVyLm5leHRJZCgpO1xuICB0aGlzLmludGVyZmFjZUNscyA9IGludGVyZmFjZUNscztcbiAgdGhpcy5kZWJ1ZyA9IGRlYnVnO1xuICB1dGlsLmhhbmRsZUV2ZW50cyh0aGlzKTtcbiAgXG4gIHRoaXMuaWZhY2VzID0ge307XG4gIHRoaXMuY2xvc2VIYW5kbGVycyA9IHt9O1xuICB0aGlzLmVycm9ySGFuZGxlcnMgPSB7fTtcbiAgdGhpcy5lbWl0cyA9IHt9O1xufTtcblxuLyoqXG4gKiBSZWNlaXZlIGluY29taW5nIG1lc3NhZ2VzIGZvciB0aGlzIGNvbnN1bWVyLlxuICogQG1ldGhvZCBvbk1lc3NhZ2VcbiAqIEBwYXJhbSB7U3RyaW5nfSBzb3VyY2UgVGhlIHNvdXJjZSBvZiB0aGUgbWVzc2FnZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIFRoZSByZWNlaXZlZCBtZXNzYWdlLlxuICovXG5Db25zdW1lci5wcm90b3R5cGUub25NZXNzYWdlID0gZnVuY3Rpb24gKHNvdXJjZSwgbWVzc2FnZSkge1xuICBpZiAoc291cmNlID09PSAnY29udHJvbCcgJiYgbWVzc2FnZS5yZXZlcnNlKSB7XG4gICAgdGhpcy5lbWl0Q2hhbm5lbCA9IG1lc3NhZ2UuY2hhbm5lbDtcbiAgICB0aGlzLmVtaXQodGhpcy5lbWl0Q2hhbm5lbCwge1xuICAgICAgdHlwZTogJ2NoYW5uZWwgYW5ub3VuY2VtZW50JyxcbiAgICAgIGNoYW5uZWw6IG1lc3NhZ2UucmV2ZXJzZVxuICAgIH0pO1xuICAgIHRoaXMuZW1pdCgnc3RhcnQnKTtcbiAgfSBlbHNlIGlmIChzb3VyY2UgPT09ICdjb250cm9sJyAmJiBtZXNzYWdlLnR5cGUgPT09ICdzZXR1cCcpIHtcbiAgICB0aGlzLmNvbnRyb2xDaGFubmVsID0gbWVzc2FnZS5jaGFubmVsO1xuICB9IGVsc2UgaWYgKHNvdXJjZSA9PT0gJ2NvbnRyb2wnICYmIG1lc3NhZ2UudHlwZSA9PT0gJ2Nsb3NlJykge1xuICAgIGRlbGV0ZSB0aGlzLmNvbnRyb2xDaGFubmVsO1xuICAgIHRoaXMuZG9DbG9zZSgpO1xuICB9IGVsc2Uge1xuICAgIGlmICghdGhpcy5lbWl0Q2hhbm5lbCAmJiBtZXNzYWdlLmNoYW5uZWwpIHtcbiAgICAgIHRoaXMuZW1pdENoYW5uZWwgPSBtZXNzYWdlLmNoYW5uZWw7XG4gICAgICB0aGlzLmVtaXQoJ3N0YXJ0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjbG9zZScgJiYgbWVzc2FnZS50bykge1xuICAgICAgdGhpcy50ZWFyZG93bihtZXNzYWdlLnRvKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgdGhpcy5lcnJvcihtZXNzYWdlLnRvLCBtZXNzYWdlLm1lc3NhZ2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAobWVzc2FnZS50bykge1xuICAgICAgaWYgKHRoaXMuZW1pdHNbbWVzc2FnZS50b10pIHtcbiAgICAgICAgdGhpcy5lbWl0c1ttZXNzYWdlLnRvXSgnbWVzc2FnZScsIG1lc3NhZ2UubWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRlYnVnLndhcm4oJ0NvdWxkIG5vdCBkZWxpdmVyIG1lc3NhZ2UsIG5vIHN1Y2ggaW50ZXJmYWNlOiAnICsgbWVzc2FnZS50byk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBtc2cgPSBtZXNzYWdlLm1lc3NhZ2U7XG4gICAgICB1dGlsLmVhY2hQcm9wKHRoaXMuZW1pdHMsIGZ1bmN0aW9uIChpZmFjZSkge1xuICAgICAgICBpZmFjZSgnbWVzc2FnZScsIG1lc3NhZ2UubWVzc2FnZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY29uc3VtZXIuSW50ZXJmYWNlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGNvbnN1bWVyLlxuICogQW4gaW50ZXJmYWNlIGlzIHJldHVybmVkLCB3aGljaCBpcyBzdXBwbGllZCB3aXRoIGltcG9ydGFudCBjb250cm9sIG9mIHRoZVxuICogYXBpIHZpYSBjb25zdHJ1Y3RvciBhcmd1bWVudHM6IChib3VuZCBiZWxvdyBpbiBnZXRJbnRlcmZhY2VDb25zdHJ1Y3RvcilcbiAqIFxuICogb25Nc2c6IGZ1bmN0aW9uKGJpbmRlcikgc2V0cyB0aGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIG1lc3NhZ2VzIGZvciB0aGlzXG4gKiAgICBpbnRlcmZhY2UgYXJyaXZlIG9uIHRoZSBjaGFubmVsLFxuICogZW1pdDogZnVuY3Rpb24obXNnKSBhbGxvd3MgdGhpcyBpbnRlcmZhY2UgdG8gZW1pdCBtZXNzYWdlcyxcbiAqIGlkOiBzdHJpbmcgaXMgdGhlIElkZW50aWZpZXIgZm9yIHRoaXMgaW50ZXJmYWNlLlxuICogQG1ldGhvZCBnZXRJbnRlcmZhY2VcbiAqL1xuQ29uc3VtZXIucHJvdG90eXBlLmdldEludGVyZmFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIElmYWNlID0gdGhpcy5nZXRJbnRlcmZhY2VDb25zdHJ1Y3RvcigpLFxuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICBpZiAoYXJncy5sZW5ndGgpIHtcbiAgICBJZmFjZSA9IElmYWNlLmJpbmQuYXBwbHkoSWZhY2UsIFtJZmFjZV0uY29uY2F0KGFyZ3MpKTtcbiAgfVxuICByZXR1cm4gbmV3IElmYWNlKCk7XG59O1xuXG4vKipcbiAqIEF0dGFjaCBhbiAnb25FdmVudCcgbGlzdGVuZXIgdG8gYW4gaW50ZXJmYWNlLCBhbGxvd2luZyBleHRlcm5hbCBjb25zdW1lcnNcbiAqIHRvIGVpdGhlciBsaXN0ZW4gdG8gY2hhbm5lbCBzdGF0ZSwgb3IgcmVnaXN0ZXIgY2FsbGJhY2tzIG9uIGxpZmV0aW1lIGV2ZW50c1xuICogb2YgaW5kaXZpZHVhbCBpbnN0YW5jZXMgb2YgdGhlIGludGVyZmFjZS5cbiAqIEBtZXRob2QgZ2V0TGlzdGVuZXJcbiAqIEBwYXJtYSB7U3RyaW5nfSBuYW1lIFRoZSBldmVudCB0byBsaXN0ZW4gdG8uXG4gKiBAcHJpdmF0ZVxuICovXG5Db25zdW1lci5wcm90b3R5cGUuZ2V0TGlzdGVuZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKGluc3RhbmNlLCBoYW5kbGVyKSB7XG4gICAgLy8gTGlzdGVuIHRvIHRoZSBjaGFubmVsIGRpcmVjdGx5LlxuICAgIGlmICh0eXBlb2YgaW5zdGFuY2UgPT09ICdmdW5jdGlvbicgJiYgaGFuZGxlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9uY2UobmFtZSwgaW5zdGFuY2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIExpc3RlbiB0byBhIHNwZWNpZmljIGluc3RhbmNlLlxuICAgIHZhciBoYW5kbGVycyA9IG5hbWUgKyAnSGFuZGxlcnMnO1xuICAgIHV0aWwuZWFjaFByb3AodGhpcy5pZmFjZXMsIGZ1bmN0aW9uIChjYW5kaWRhdGUsIGlkKSB7XG4gICAgICBpZiAoY2FuZGlkYXRlID09PSBpbnN0YW5jZSkge1xuICAgICAgICBpZiAodGhpc1toYW5kbGVyc11baWRdKSB7XG4gICAgICAgICAgdGhpc1toYW5kbGVyc11baWRdLnB1c2goaGFuZGxlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpc1toYW5kbGVyc11baWRdID0gW2hhbmRsZXJdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG4gIH0uYmluZCh0aGlzKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB0byBnZXQgaW50ZXJmYWNlcyBmcm9tIHRoaXMgYXBpIGNvbnN1bWVyXG4gKiBmcm9tIGEgdXNlci12aXNpYmxlIHBvaW50LlxuICogQG1ldGhvZCBnZXRQcm94eUludGVyZmFjZVxuICovXG5Db25zdW1lci5wcm90b3R5cGUuZ2V0UHJveHlJbnRlcmZhY2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmdW5jID0gZnVuY3Rpb24gKHApIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHAuZ2V0SW50ZXJmYWNlLmFwcGx5KHAsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcC5nZXRJbnRlcmZhY2UoKTtcbiAgICB9XG4gIH0uYmluZCh7fSwgdGhpcyk7XG5cbiAgZnVuYy5jbG9zZSA9IGZ1bmN0aW9uIChpZmFjZSkge1xuICAgIGlmIChpZmFjZSkge1xuICAgICAgdXRpbC5lYWNoUHJvcCh0aGlzLmlmYWNlcywgZnVuY3Rpb24gKGNhbmRpZGF0ZSwgaWQpIHtcbiAgICAgICAgaWYgKGNhbmRpZGF0ZSA9PT0gaWZhY2UpIHtcbiAgICAgICAgICB0aGlzLnRlYXJkb3duKGlkKTtcbiAgICAgICAgICB0aGlzLmVtaXQodGhpcy5lbWl0Q2hhbm5lbCwge1xuICAgICAgICAgICAgdHlwZTogJ2Nsb3NlJyxcbiAgICAgICAgICAgIHRvOiBpZFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9LmJpbmQodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDbG9zZSB0aGUgY2hhbm5lbC5cbiAgICAgIHRoaXMuZG9DbG9zZSgpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpO1xuXG4gIGZ1bmMub25DbG9zZSA9IHRoaXMuZ2V0TGlzdGVuZXIoJ2Nsb3NlJyk7XG4gIGZ1bmMub25FcnJvciA9IHRoaXMuZ2V0TGlzdGVuZXIoJ2Vycm9yJyk7XG5cbiAgcmV0dXJuIGZ1bmM7XG59O1xuXG4vKipcbiAqIFByb3ZpZGVzIGEgYm91bmQgY2xhc3MgZm9yIGNyZWF0aW5nIGEgY29uc3VtZXIuSW50ZXJmYWNlIGFzc29jaWF0ZWRcbiAqIHdpdGggdGhpcyBhcGkuIFRoaXMgcGFydGlhbCBsZXZlbCBvZiBjb25zdHJ1Y3Rpb24gY2FuIGJlIHVzZWRcbiAqIHRvIGFsbG93IHRoZSBjb25zdW1lciB0byBiZSB1c2VkIGFzIGEgcHJvdmlkZXIgZm9yIGFub3RoZXIgQVBJLlxuICogQG1ldGhvZCBnZXRJbnRlcmZhY2VDb25zdHJ1Y3RvclxuICogQHByaXZhdGVcbiAqL1xuQ29uc3VtZXIucHJvdG90eXBlLmdldEludGVyZmFjZUNvbnN0cnVjdG9yID0gZnVuY3Rpb24gKCkge1xuICB2YXIgaWQgPSBDb25zdW1lci5uZXh0SWQoKTtcbiAgcmV0dXJuIHRoaXMuaW50ZXJmYWNlQ2xzLmJpbmQoXG4gICAge30sXG4gICAgZnVuY3Rpb24gKGlkLCBvYmosIGJpbmRlcikge1xuICAgICAgdGhpcy5pZmFjZXNbaWRdID0gb2JqO1xuICAgICAgdGhpcy5lbWl0c1tpZF0gPSBiaW5kZXI7XG4gICAgfS5iaW5kKHRoaXMsIGlkKSxcbiAgICB0aGlzLmRvRW1pdC5iaW5kKHRoaXMsIGlkKSxcbiAgICB0aGlzLmRlYnVnXG4gICk7XG59O1xuXG4vKipcbiAqIEVtaXQgYSBtZXNzYWdlIG9uIHRoZSBjaGFubmVsIG9uY2Ugc2V0dXAgaXMgY29tcGxldGUuXG4gKiBAbWV0aG9kIGRvRW1pdFxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSB0byBUaGUgSUQgb2YgdGhlIGZsb3cgc2VuZGluZyB0aGUgbWVzc2FnZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBtc2cgVGhlIG1lc3NhZ2UgdG8gZW1pdFxuICogQHBhcmFtIHtCb29sZWFufSBhbGwgU2VuZCBtZXNzYWdlIHRvIGFsbCByZWNpcGllbnRzLlxuICovXG5Db25zdW1lci5wcm90b3R5cGUuZG9FbWl0ID0gZnVuY3Rpb24gKHRvLCBtc2csIGFsbCkge1xuICBpZiAoYWxsKSB7XG4gICAgdG8gPSBmYWxzZTtcbiAgfVxuICBpZiAodGhpcy5lbWl0Q2hhbm5lbCkge1xuICAgIHRoaXMuZW1pdCh0aGlzLmVtaXRDaGFubmVsLCB7dG86IHRvLCB0eXBlOiAnbWVzc2FnZScsIG1lc3NhZ2U6IG1zZ30pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMub25jZSgnc3RhcnQnLCB0aGlzLmRvRW1pdC5iaW5kKHRoaXMsIHRvLCBtc2cpKTtcbiAgfVxufTtcblxuLyoqXG4gKiBUZWFyZG93biBhIHNpbmdsZSBpbnRlcmZhY2Ugb2YgdGhpcyBhcGkuXG4gKiBAbWV0aG9kIHRlYXJkb3duXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBpbnRlcmZhY2UgdG8gdGVhciBkb3duLlxuICovXG5Db25zdW1lci5wcm90b3R5cGUudGVhcmRvd24gPSBmdW5jdGlvbiAoaWQpIHtcbiAgZGVsZXRlIHRoaXMuZW1pdHNbaWRdO1xuICBpZiAodGhpcy5jbG9zZUhhbmRsZXJzW2lkXSkge1xuICAgIHV0aWwuZWFjaFByb3AodGhpcy5jbG9zZUhhbmRsZXJzW2lkXSwgZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgIHByb3AoKTtcbiAgICB9KTtcbiAgfVxuICBkZWxldGUgdGhpcy5pZmFjZXNbaWRdO1xuICBkZWxldGUgdGhpcy5jbG9zZUhhbmRsZXJzW2lkXTtcbiAgZGVsZXRlIHRoaXMuZXJyb3JIYW5kbGVyc1tpZF07XG59O1xuXG4vKipcbiAqIEhhbmRsZSBhIG1lc3NhZ2UgZXJyb3IgcmVwb3J0ZWQgdG8gdGhpcyBhcGkuXG4gKiBAbWV0aG9kIGVycm9yXG4gKiBAcGFyYW0ge1N0cmluZz99IGlkIFRoZSBpZCBvZiB0aGUgaW50ZXJmYWNlIHdoZXJlIHRoZSBlcnJvciBvY2N1cmVkLlxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgVGhlIG1lc3NhZ2Ugd2hpY2ggZmFpbGVkLCBpZiByZWxldmFudC5cbiAqL1xuQ29uc3VtZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGlkLCBtZXNzYWdlKSB7XG4gIGlmIChpZCAmJiB0aGlzLmVycm9ySGFuZGxlcnNbaWRdKSB7XG4gICAgdXRpbC5lYWNoUHJvcCh0aGlzLmVycm9ySGFuZGxlcnNbaWRdLCBmdW5jdGlvbiAocHJvcCkge1xuICAgICAgcHJvcChtZXNzYWdlKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICghaWQpIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbWVzc2FnZSk7XG4gIH1cbn07XG5cblxuLyoqXG4gKiBDbG9zZSAvIHRlYXJkb3duIHRoZSBmbG93IHRoaXMgYXBpIHRlcm1pbmF0ZXMuXG4gKiBAbWV0aG9kIGRvQ2xvc2VcbiAqL1xuQ29uc3VtZXIucHJvdG90eXBlLmRvQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmNvbnRyb2xDaGFubmVsKSB7XG4gICAgdGhpcy5lbWl0KHRoaXMuY29udHJvbENoYW5uZWwsIHtcbiAgICAgIHR5cGU6ICdDaGFubmVsIENsb3NpbmcnLFxuICAgICAgcmVxdWVzdDogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgdXRpbC5lYWNoUHJvcCh0aGlzLmVtaXRzLCBmdW5jdGlvbiAoZW1pdCwgaWQpIHtcbiAgICB0aGlzLnRlYXJkb3duKGlkKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmVtaXQoJ2Nsb3NlJyk7XG4gIHRoaXMub2ZmKCk7XG5cbiAgdGhpcy5lbWl0Q2hhbm5lbCA9IG51bGw7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgdGV4dHVhbCBkZXNjcmlwdGlvbiBvZiB0aGlzIHBvcnQuXG4gKiBAbWV0aG9kIHRvU3RyaW5nXG4gKiBAcmV0dXJuIFRoZSBkZXNjcmlwdGlvbiBvZiB0aGlzIHBvcnQuXG4gKi9cbkNvbnN1bWVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuZW1pdENoYW5uZWwpIHtcbiAgICByZXR1cm4gXCJbQ29uc3VtZXIgXCIgKyB0aGlzLmVtaXRDaGFubmVsICsgXCJdXCI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFwiW3VuYm91bmQgQ29uc3VtZXJdXCI7XG4gIH1cbn07XG5cbi8qKlxuICogR2V0IHRoZSBuZXh0IElEIGZvciBhbiBhcGkgY2hhbm5lbC5cbiAqIEBtZXRob2QgbmV4dElkXG4gKiBAc3RhdGljXG4gKiBAcHJpdmF0ZVxuICovXG5Db25zdW1lci5uZXh0SWQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghQ29uc3VtZXIuaWQpIHtcbiAgICBDb25zdW1lci5pZCA9IDE7XG4gIH1cbiAgcmV0dXJuIChDb25zdW1lci5pZCArPSAxKTtcbn07XG5cbi8qKlxuICogQ29udmVydCBhIHN0cnVjdHVyZWQgZGF0YSBzdHJ1Y3R1cmUgaW50byBhIG1lc3NhZ2Ugc3RyZWFtIGNvbmZvcm1pbmcgdG9cbiAqIGEgdGVtcGxhdGUgYW5kIGFuIGFycmF5IG9mIGJpbmFyeSBkYXRhIGVsZW1lbnRzLlxuICogQHN0YXRpY1xuICogQG1ldGhvZCBtZXNzYWdlVG9Qb3J0YWJsZVxuICogQHBhcmFtIHtPYmplY3R9IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBjb25mb3JtIHRvXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgVGhlIGluc3RhbmNlIG9mIHRoZSBkYXRhIHN0cnVjdHVyZSB0byBjb25mcm9tXG4gKiBAcGFyYW0ge0RlYnVnfSBkZWJ1ZyBBIGRlYnVnZ2VyIGZvciBlcnJvcnMuXG4gKiBAcmV0dXJuIHt7dGV4dDogT2JqZWN0LCBiaW5hcnk6IEFycmF5fX0gU2VwYXJhdGVkIGRhdGEgc3RyZWFtcy5cbiAqL1xuQ29uc3VtZXIubWVzc2FnZVRvUG9ydGFibGUgPSBmdW5jdGlvbiAodGVtcGxhdGUsIHZhbHVlLCBkZWJ1Zykge1xuICB2YXIgZXh0ZXJuYWxzID0gW10sXG4gICAgbWVzc2FnZSA9IENvbnN1bWVyLmNvbmZvcm0odGVtcGxhdGUsIHZhbHVlLCBleHRlcm5hbHMsIHRydWUsIGRlYnVnKTtcbiAgcmV0dXJuIHtcbiAgICB0ZXh0OiBtZXNzYWdlLFxuICAgIGJpbmFyeTogZXh0ZXJuYWxzXG4gIH07XG59O1xuXG4vKipcbiAqIENvbnZlcnQgU3RydWN0dXJlZCBEYXRhIHN0cmVhbXMgaW50byBhIGRhdGEgc3RydWN0dXJlIGNvbmZvcm1pbmcgdG8gYVxuICogdGVtcGxhdGUuXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIHBvcnRhYmxlVG9NZXNzYWdlXG4gKiBAcGFyYW0ge09iamVjdH0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRvIGNvbmZvcm0gdG9cbiAqIEBwYXJhbSB7e3RleHQ6IE9iamVjdCwgYmluYXJ5OiBBcnJheX19IHN0cmVhbXMgVGhlIHN0cmVhbXMgdG8gY29uZm9ybVxuICogQHBhcmFtIHtEZWJ1Z30gZGVidWcgQSBkZWJ1Z2dlciBmb3IgZXJyb3JzLlxuICogQHJldHVybiB7T2JqZWN0fSBUaGUgZGF0YSBzdHJ1Y3R1cmUgbWF0Y2hpbmcgdGhlIHRlbXBsYXRlLlxuICovXG5Db25zdW1lci5wb3J0YWJsZVRvTWVzc2FnZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZSwgc3RyZWFtcywgZGVidWcpIHtcbiAgcmV0dXJuIENvbnN1bWVyLmNvbmZvcm0odGVtcGxhdGUsIHN0cmVhbXMudGV4dCwgc3RyZWFtcy5iaW5hcnksIGZhbHNlLCBkZWJ1Zyk7XG59O1xuXG4vKipcbiAqIEZvcmNlIGEgY29sbGVjdGlvbiBvZiB2YWx1ZXMgdG8gbG9vayBsaWtlIHRoZSB0eXBlcyBhbmQgbGVuZ3RoIG9mIGFuIEFQSVxuICogdGVtcGxhdGUuXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIGNvbmZvcm1cbiAqIEBwYXJhbSB7T2JqZWN0fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gY29uZm9ybSB0b1xuICogQHBhcmFtIHtPYmplY3R9IGZyb20gVGhlIHZhbHVlIHRvIGNvbmZvcm1cbiAqIEBwYXJhbSB7QXJyYXl9IGV4dGVybmFscyBMaXN0aW5nIG9mIGJpbmFyeSBlbGVtZW50cyBpbiB0aGUgdGVtcGxhdGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gV2hldGhlciB0byB0byBzZXBhcmF0ZSBvciBjb21iaW5lIHN0cmVhbXMuXG4gKiBAYXBhcmFtIHtEZWJ1Z30gZGVidWcgQSBkZWJ1Z2dlciBmb3IgZXJyb3JzLlxuICovXG5Db25zdW1lci5jb25mb3JtID0gZnVuY3Rpb24gKHRlbXBsYXRlLCBmcm9tLCBleHRlcm5hbHMsIHNlcGFyYXRlLCBkZWJ1Zykge1xuICAvKiBqc2hpbnQgLVcwODYgKi9cbiAgaWYgKHR5cGVvZiAoZnJvbSkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvL2Zyb20gPSB1bmRlZmluZWQ7XG4gICAgLy90aHJvdyBcIlRyeWluZyB0byBjb25mb3JtIGEgZnVuY3Rpb25cIjtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKHR5cGVvZiAoZnJvbSkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChmcm9tID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIGRlYnVnLmVycm9yKFwiTWVzc2FnZSBkaXNjYXJkZWQgZm9yIG5vdCBtYXRjaGluZyBkZWNsYXJlZCB0eXBlIVwiLCBmcm9tKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgc3dpdGNoICh0ZW1wbGF0ZSkge1xuICBjYXNlICdzdHJpbmcnOlxuICAgIHJldHVybiBTdHJpbmcoJycpICsgZnJvbTtcbiAgY2FzZSAnbnVtYmVyJzpcbiAgICByZXR1cm4gTnVtYmVyKDEpICogZnJvbTtcbiAgY2FzZSAnYm9vbGVhbic6XG4gICAgcmV0dXJuIEJvb2xlYW4oZnJvbSA9PT0gdHJ1ZSk7XG4gIGNhc2UgJ29iamVjdCc6XG4gICAgLy8gVE9ETyh3aWxsc2NvdHQpOiBBbGxvdyByZW1vdmFsIGlmIHNhbmRib3hpbmcgZW5mb3JjZXMgdGhpcy5cbiAgICBpZiAodHlwZW9mIGZyb20gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShmcm9tKSk7XG4gICAgfVxuICBjYXNlICdibG9iJzpcbiAgICBpZiAoc2VwYXJhdGUpIHtcbiAgICAgIGlmIChmcm9tIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICBleHRlcm5hbHMucHVzaChmcm9tKTtcbiAgICAgICAgcmV0dXJuIGV4dGVybmFscy5sZW5ndGggLSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVidWcuZXJyb3IoJ2NvbmZvcm0gZXhwZWN0aW5nIEJsb2IsIGJ1dCBzYXcgJyArICh0eXBlb2YgZnJvbSkpO1xuICAgICAgICBleHRlcm5hbHMucHVzaChuZXcgQmxvYihbXSkpO1xuICAgICAgICByZXR1cm4gZXh0ZXJuYWxzLmxlbmd0aCAtIDE7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBleHRlcm5hbHNbZnJvbV07XG4gICAgfVxuICBjYXNlICdidWZmZXInOlxuICAgIGlmIChzZXBhcmF0ZSkge1xuICAgICAgZXh0ZXJuYWxzLnB1c2goQ29uc3VtZXIubWFrZUFycmF5QnVmZmVyKGZyb20sIGRlYnVnKSk7XG4gICAgICByZXR1cm4gZXh0ZXJuYWxzLmxlbmd0aCAtIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBDb25zdW1lci5tYWtlQXJyYXlCdWZmZXIoZXh0ZXJuYWxzW2Zyb21dLCBkZWJ1Zyk7XG4gICAgfVxuICBjYXNlICdwcm94eSc6XG4gICAgcmV0dXJuIGZyb207XG4gIH1cbiAgdmFyIHZhbCwgaTtcbiAgaWYgKEFycmF5LmlzQXJyYXkodGVtcGxhdGUpICYmIGZyb20gIT09IHVuZGVmaW5lZCkge1xuICAgIHZhbCA9IFtdO1xuICAgIGkgPSAwO1xuICAgIGlmICh0ZW1wbGF0ZS5sZW5ndGggPT09IDIgJiYgdGVtcGxhdGVbMF0gPT09ICdhcnJheScpIHtcbiAgICAgIC8vY29uc29sZS5sb2coXCJ0ZW1wbGF0ZSBpcyBhcnJheSwgdmFsdWUgaXMgXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGZyb20ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgdmFsLnB1c2goQ29uc3VtZXIuY29uZm9ybSh0ZW1wbGF0ZVsxXSwgZnJvbVtpXSwgZXh0ZXJuYWxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcGFyYXRlLCBkZWJ1ZykpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgdGVtcGxhdGUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKGZyb21baV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhbC5wdXNoKENvbnN1bWVyLmNvbmZvcm0odGVtcGxhdGVbaV0sIGZyb21baV0sIGV4dGVybmFscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcGFyYXRlLCBkZWJ1ZykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbC5wdXNoKHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbDtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdGVtcGxhdGUgPT09ICdvYmplY3QnICYmIGZyb20gIT09IHVuZGVmaW5lZCkge1xuICAgIHZhbCA9IHt9O1xuICAgIHV0aWwuZWFjaFByb3AodGVtcGxhdGUsIGZ1bmN0aW9uIChwcm9wLCBuYW1lKSB7XG4gICAgICBpZiAoZnJvbVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhbFtuYW1lXSA9IENvbnN1bWVyLmNvbmZvcm0ocHJvcCwgZnJvbVtuYW1lXSwgZXh0ZXJuYWxzLCBzZXBhcmF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Zyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuICBkZWJ1Zy5lcnJvcignVW5rbm93biB0ZW1wbGF0ZSBwcm92aWRlZDogJyArIHRlbXBsYXRlKTtcbn07XG5cbi8qKlxuICogTWFrZSBhIHRoaW5nIGludG8gYW4gQXJyYXkgQnVmZmVyXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIG1ha2VBcnJheUJ1ZmZlclxuICogQHBhcmFtIHtPYmplY3R9IHRoaW5nXG4gKiBAcGFyYW0ge0RlYnVnfSBkZWJ1ZyBBIGRlYnVnZ2VyIGluIGNhc2Ugb2YgZXJyb3JzLlxuICogQHJldHVybiB7QXJyYXlCdWZmZXJ9IEFuIEFycmF5IEJ1ZmZlclxuICovXG5Db25zdW1lci5tYWtlQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAodGhpbmcsIGRlYnVnKSB7XG4gIGlmICghdGhpbmcpIHtcbiAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApO1xuICB9XG5cbiAgaWYgKHRoaW5nIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICByZXR1cm4gdGhpbmc7XG4gIH0gZWxzZSBpZiAodGhpbmcuY29uc3RydWN0b3IubmFtZSA9PT0gXCJBcnJheUJ1ZmZlclwiICYmXG4gICAgICB0eXBlb2YgdGhpbmcucHJvdG90eXBlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgLy8gV29ya2Fyb3VuZCBmb3Igd2Via2l0IG9yaWdpbiBvd25lcnNoaXAgaXNzdWUuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1VXTmV0d29ya3NMYWIvZnJlZWRvbS9pc3N1ZXMvMjhcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KHRoaW5nKS5idWZmZXI7XG4gIH0gZWxzZSB7XG4gICAgZGVidWcuZXJyb3IoJ2V4cGVjdGluZyBBcnJheUJ1ZmZlciwgYnV0IHNhdyAnICtcbiAgICAgICAgKHR5cGVvZiB0aGluZykgKyAnOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpbmcpKTtcbiAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApO1xuICB9XG59O1xuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlIGEgW25lc3RlZF0gb2JqZWN0IGFuZCBmcmVlemUgaXRzIGtleXMgZnJvbSBiZWluZ1xuICogd3JpdGFibGUuIE5vdGUsIHRoZSByZXN1bHQgY2FuIGhhdmUgbmV3IGtleXMgYWRkZWQgdG8gaXQsIGJ1dCBleGlzdGluZyBvbmVzXG4gKiBjYW5ub3QgYmUgIG92ZXJ3cml0dGVuLiBEb2Vzbid0IGRvIGFueXRoaW5nIGZvciBhcnJheXMgb3Igb3RoZXIgY29sbGVjdGlvbnMuXG4gKlxuICogQG1ldGhvZCByZWN1cnNpdmVGcmVlemVPYmplY3RcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBvYmplY3QgdG8gYmUgZnJvemVuXG4gKiBAcmV0dXJuIHtPYmplY3R9IG9ialxuICoqL1xuQ29uc3VtZXIucmVjdXJzaXZlRnJlZXplT2JqZWN0ID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIgaywgcmV0ID0ge307XG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgZm9yIChrIGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIGssIHtcbiAgICAgICAgdmFsdWU6IENvbnN1bWVyLnJlY3Vyc2l2ZUZyZWV6ZU9iamVjdChvYmpba10pLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb25zdW1lcjtcbiIsIi8qanNsaW50IGluZGVudDoyLCBub2RlOnRydWUsIHNsb3BweTp0cnVlICovXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIEEgZnJlZWRvbSBlbnRyeSBwb2ludCBmb3IgZGVidWdnaW5nLlxuICogQHVzZXMgaGFuZGxlRXZlbnRzXG4gKiBAaW1wbGVtZW50cyBQb3J0XG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIERlYnVnID0gZnVuY3Rpb24gKGxvZ2dlcikge1xuICB0aGlzLmlkID0gJ2RlYnVnJztcbiAgdGhpcy5lbWl0Q2hhbm5lbCA9IGZhbHNlO1xuICB0aGlzLmNvbmZpZyA9IGZhbHNlO1xuICB1dGlsLmhhbmRsZUV2ZW50cyh0aGlzKTtcbn07XG5cbi8qKlxuICogUHJvdmlkZSBhIHRleHR1YWwgZGVzY3JpcHRpb24gb2YgdGhpcyBwb3J0LlxuICogQG1ldGhvZCB0b1N0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSB0aGUgdGV4dHVhbCBkZXNjcmlwdGlvbi5cbiAqL1xuRGVidWcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ1tDb25zb2xlXSc7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgbG9nZ2VyIGZvciBvdXRwdXR0aW5nIGRlYnVnZ2luZyBtZXNzYWdlcy5cbiAqIEBtZXRob2Qgc2V0TG9nZ2VyXG4gKiBAcGFyYW0ge0NvbnNvbGV9IGxvZ2dlciBUaGUgbG9nZ2VyIHRvIHJlZ2lzdGVyXG4gKi9cbkRlYnVnLnByb3RvdHlwZS5zZXRMb2dnZXIgPSBmdW5jdGlvbiAobG9nZ2VyKSB7XG4gIGlmICh0aGlzLmxvZ2dlcikge1xuICAgIHRoaXMuaW5mbygnUmVwbGFjaW5nIExvZ2dlci4nKTtcbiAgfVxuICB0aGlzLmxvZ2dlciA9IGxvZ2dlcjtcbiAgdGhpcy5lbWl0KCdsb2dnZXInKTtcbn07XG5cbi8qKlxuICogSGFuZGxlciBmb3IgcmVjZWl2aW5nIG1lc3NhZ2VzIHNlbnQgdG8gdGhlIGRlYnVnIHBvcnQuXG4gKiBUaGVzZSBtZXNzYWdlcyBhcmUgdXNlZCB0byByZXRyZWl2ZSBjb25maWcgZm9yIGV4cG9zaW5nIGNvbnNvbGUuXG4gKiBAbWV0aG9kIG9uTWVzc2FnZVxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSB0aGUgc291cmNlIGlkZW50aWZpZXIgZm9yIHRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgdGhlIHJlY2VpdmVkIG1lc3NhZ2UuXG4gKi9cbkRlYnVnLnByb3RvdHlwZS5vbk1lc3NhZ2UgPSBmdW5jdGlvbiAoc291cmNlLCBtZXNzYWdlKSB7XG4gIGlmIChzb3VyY2UgPT09ICdjb250cm9sJyAmJiBtZXNzYWdlLmNoYW5uZWwgJiYgIXRoaXMuZW1pdENoYW5uZWwpIHtcbiAgICB0aGlzLmVtaXRDaGFubmVsID0gbWVzc2FnZS5jaGFubmVsO1xuICAgIHRoaXMuY29uZmlnID0gbWVzc2FnZS5jb25maWc7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5nbG9iYWwuY29uc29sZSkge1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmNvbmZpZy5nbG9iYWwuY29uc29sZSA9IGNvbnNvbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbmZpZy5nbG9iYWwuY29uc29sZSA9IHRoaXMuZ2V0TG9nZ2VyKCdDb25zb2xlJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZW1pdCgncmVhZHknKTtcbiAgfVxufTtcblxuLyoqXG4gKiBEaXNwYXRjaCBhIGRlYnVnIG1lc3NhZ2Ugd2l0aCBhcmJpdHJhcnkgc2V2ZXJpdHkuXG4gKiBBbGwgZGVidWcgbWVzc2FnZXMgYXJlIHJvdXRlZCB0aHJvdWdoIHRoZSBtYW5hZ2VyLCB0byBhbGxvdyBmb3IgZGVsZWdhdGlvbi5cbiAqIEBtZXRob2QgZm9ybWF0XG4gKiBAcGFyYW0ge1N0cmluZ30gc2V2ZXJpdHkgdGhlIHNldmVyaXR5IG9mIHRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSBUaGUgbG9jYXRpb24gb2YgbWVzc2FnZS5cbiAqIEBwYXJhbSB7U3RyaW5nW119IGFyZ3MgVGhlIGNvbnRlbnRzIG9mIHRoZSBtZXNzYWdlLlxuICogQHByaXZhdGVcbiAqL1xuRGVidWcucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uIChzZXZlcml0eSwgc291cmNlLCBhcmdzKSB7XG4gIHZhciBpLCBhbGlzdCA9IFtdLCBhcmdhcnI7XG4gIGlmICh0eXBlb2YgYXJncyA9PT0gXCJzdHJpbmdcIiAmJiBzb3VyY2UpIHtcbiAgICB0cnkge1xuICAgICAgYXJnYXJyID0gSlNPTi5wYXJzZShhcmdzKTtcbiAgICAgIGlmIChhcmdhcnIgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBhcmdzID0gYXJnYXJyO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHBhc3MuXG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBhcmdzID09PSBcInN0cmluZ1wiKSB7XG4gICAgYWxpc3QucHVzaChhcmdzKTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgYWxpc3QucHVzaChhcmdzW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKCF0aGlzLmVtaXRDaGFubmVsKSB7XG4gICAgdGhpcy5vbigncmVhZHknLCB0aGlzLmZvcm1hdC5iaW5kKHRoaXMsIHNldmVyaXR5LCBzb3VyY2UsIGFsaXN0KSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuZW1pdCh0aGlzLmVtaXRDaGFubmVsLCB7XG4gICAgc2V2ZXJpdHk6IHNldmVyaXR5LFxuICAgIHNvdXJjZTogc291cmNlLFxuICAgIHF1aWV0OiB0cnVlLFxuICAgIHJlcXVlc3Q6ICdkZWJ1ZycsXG4gICAgbXNnOiBKU09OLnN0cmluZ2lmeShhbGlzdClcbiAgfSk7XG59O1xuXG4vKipcbiAqIFByaW50IHJlY2VpdmVkIG1lc3NhZ2VzIG9uIHRoZSBjb25zb2xlLlxuICogVGhpcyBpcyBjYWxsZWQgYnkgdGhlIG1hbmFnZXIgaW4gcmVzcG9uc2UgdG8gYW4gZW1pc3Npb24gZnJvbSBmb3JtYXQuXG4gKiBAbWV0aG9kIHByaW50XG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBUaGUgbWVzc2FnZSBlbWl0dGVkIGJ5IHtAc2VlIGZvcm1hdH0gdG8gcHJpbnQuXG4gKi9cbkRlYnVnLnByb3RvdHlwZS5wcmludCA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gIGlmICghdGhpcy5sb2dnZXIpIHtcbiAgICB0aGlzLm9uY2UoJ2xvZ2dlcicsIHRoaXMucHJpbnQuYmluZCh0aGlzLCBtZXNzYWdlKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGFyZ3MsIGFyciA9IFtdLCBpID0gMDtcbiAgYXJncyA9IEpTT04ucGFyc2UobWVzc2FnZS5tc2cpO1xuICBpZiAodHlwZW9mIGFyZ3MgPT09IFwic3RyaW5nXCIpIHtcbiAgICBhcnIucHVzaChhcmdzKTtcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoYXJnc1tpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhcnIucHVzaChhcmdzW2ldKTtcbiAgICAgIGkgKz0gMTtcbiAgICB9XG4gIH1cbiAgdGhpcy5sb2dnZXJbbWVzc2FnZS5zZXZlcml0eV0uY2FsbCh0aGlzLmxvZ2dlciwgbWVzc2FnZS5zb3VyY2UsIGFyciwgZnVuY3Rpb24gKCkge30pO1xufTtcblxuLyoqXG4gKiBQcmludCBhIGxvZyBtZXNzYWdlIHRvIHRoZSBjb25zb2xlLlxuICogQG1ldGhvZCBsb2dcbiAqL1xuRGVidWcucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5mb3JtYXQoJ2xvZycsIHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUHJpbnQgYW4gaW5mbyBtZXNzYWdlIHRvIHRoZSBjb25zb2xlLlxuICogQG1ldGhvZCBsb2dcbiAqL1xuRGVidWcucHJvdG90eXBlLmluZm8gPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZm9ybWF0KCdpbmZvJywgdW5kZWZpbmVkLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBQcmludCBhIGRlYnVnIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUuXG4gKiBAbWV0aG9kIGxvZ1xuICovXG5EZWJ1Zy5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZm9ybWF0KCdkZWJ1ZycsIHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUHJpbnQgYSB3YXJuaW5nIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUuXG4gKiBAbWV0aG9kIHdhcm5cbiAqL1xuRGVidWcucHJvdG90eXBlLndhcm4gPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZm9ybWF0KCd3YXJuJywgdW5kZWZpbmVkLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBQcmludCBhbiBlcnJvciBtZXNzYWdlIHRvIHRoZSBjb25zb2xlLlxuICogQG1ldGhvZCBlcnJvclxuICovXG5EZWJ1Zy5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZm9ybWF0KCdlcnJvcicsIHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogR2V0IGEgbG9nZ2VyIHRoYXQgbG9ncyBtZXNzYWdlcyBwcmVmaXhlZCBieSBhIGdpdmVuIG5hbWUuXG4gKiBAbWV0aG9kIGdldExvZ2dlclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIHByZWZpeCBmb3IgbG9nZ2VkIG1lc3NhZ2VzLlxuICogQHJldHVybnMge0NvbnNvbGV9IEEgY29uc29sZS1saWtlIG9iamVjdC5cbiAqL1xuRGVidWcucHJvdG90eXBlLmdldExvZ2dlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIHZhciBsb2cgPSBmdW5jdGlvbiAoc2V2ZXJpdHksIHNvdXJjZSkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNwbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdGhpcy5mb3JtYXQoc2V2ZXJpdHksIHNvdXJjZSwgYXJncyk7XG4gIH0sXG4gICAgbG9nZ2VyID0ge1xuICAgICAgZnJlZWRvbTogdHJ1ZSxcbiAgICAgIGRlYnVnOiBsb2cuYmluZCh0aGlzLCAnZGVidWcnLCBuYW1lKSxcbiAgICAgIGluZm86IGxvZy5iaW5kKHRoaXMsICdpbmZvJywgbmFtZSksXG4gICAgICBsb2c6IGxvZy5iaW5kKHRoaXMsICdsb2cnLCBuYW1lKSxcbiAgICAgIHdhcm46IGxvZy5iaW5kKHRoaXMsICd3YXJuJywgbmFtZSksXG4gICAgICBlcnJvcjogbG9nLmJpbmQodGhpcywgJ2Vycm9yJywgbmFtZSlcbiAgICB9O1xuICByZXR1cm4gbG9nZ2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEZWJ1ZztcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IGluZGVudDoyLG5vZGU6dHJ1ZSAqL1xyXG52YXIgUHJvbWlzZUNvbXBhdCA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcclxuXHJcbnZhciBBcGkgPSByZXF1aXJlKCcuL2FwaScpO1xyXG52YXIgRGVidWcgPSByZXF1aXJlKCcuL2RlYnVnJyk7XHJcbnZhciBIdWIgPSByZXF1aXJlKCcuL2h1YicpO1xyXG52YXIgTWFuYWdlciA9IHJlcXVpcmUoJy4vbWFuYWdlcicpO1xyXG52YXIgUG9saWN5ID0gcmVxdWlyZSgnLi9wb2xpY3knKTtcclxudmFyIFByb3h5QmluZGVyID0gcmVxdWlyZSgnLi9wcm94eWJpbmRlcicpO1xyXG52YXIgUmVzb3VyY2UgPSByZXF1aXJlKCcuL3Jlc291cmNlJyk7XHJcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBCdW5kbGUgPSByZXF1aXJlKCcuL2J1bmRsZScpO1xyXG5cclxudmFyIGZyZWVkb21HbG9iYWw7XHJcbnZhciBnZXRHbG9iYWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG4gIFxyXG4gIC8vIE5vZGUuanNcclxuICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgJiYgZ2xvYmFsLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBmcmVlZG9tR2xvYmFsID0gZ2xvYmFsO1xyXG4gIC8vIEJyb3dzZXJzXHJcbiAgfSBlbHNlIHtcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICBmcmVlZG9tR2xvYmFsID0gdGhpcztcclxuICAgIH0sIDApO1xyXG4gIH1cclxufTtcclxuZ2V0R2xvYmFsKCk7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgbmV3IGZyZWVkb20gY29udGV4dC5cclxuICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgSW5mb3JtYXRpb24gYWJvdXQgdGhlIGxvY2FsIGNvbnRleHQuXHJcbiAqIEBzZWUge3V0aWwvd29ya2VyRW50cnkuanN9XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBtYW5pZmVzdCBUaGUgbWFuaWZlc3QgdG8gbG9hZC5cclxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBDb25maWd1cmF0aW9uIGtleXMgc2V0IGJ5IHRoZSB1c2VyLlxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIGZvciB0aGUgbW9kdWxlIGRlZmluZWQgaW4gdGhlIG1hbmlmZXN0LlxyXG4gKi9cclxudmFyIHNldHVwID0gZnVuY3Rpb24gKGNvbnRleHQsIG1hbmlmZXN0LCBjb25maWcpIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgdmFyIGRlYnVnID0gbmV3IERlYnVnKCksXHJcbiAgICBodWIgPSBuZXcgSHViKGRlYnVnKSxcclxuICAgIHJlc291cmNlID0gbmV3IFJlc291cmNlKGRlYnVnKSxcclxuICAgIGFwaSA9IG5ldyBBcGkoZGVidWcpLFxyXG4gICAgbWFuYWdlciA9IG5ldyBNYW5hZ2VyKGh1YiwgcmVzb3VyY2UsIGFwaSksXHJcbiAgICBiaW5kZXIgPSBuZXcgUHJveHlCaW5kZXIobWFuYWdlciksXHJcbiAgICBwb2xpY3ksXHJcbiAgICBzaXRlX2NmZyA9IHtcclxuICAgICAgJ2RlYnVnJzogJ2xvZycsXHJcbiAgICAgICdtYW5pZmVzdCc6IG1hbmlmZXN0LFxyXG4gICAgICAnbW9kdWxlQ29udGV4dCc6ICghY29udGV4dCB8fCB0eXBlb2YgKGNvbnRleHQuaXNNb2R1bGUpID09PSBcInVuZGVmaW5lZFwiKSA/XHJcbiAgICAgICAgICB1dGlsLmlzTW9kdWxlQ29udGV4dCgpIDpcclxuICAgICAgICAgIGNvbnRleHQuaXNNb2R1bGVcclxuICAgIH0sXHJcbiAgICBsaW5rLFxyXG4gICAgUG9ydDtcclxuXHJcbiAgaWYgKGNvbmZpZykge1xyXG4gICAgdXRpbC5taXhpbihzaXRlX2NmZywgY29uZmlnLCB0cnVlKTtcclxuICB9XHJcbiAgc2l0ZV9jZmcuZ2xvYmFsID0gZnJlZWRvbUdsb2JhbDtcclxuICBpZiAoY29udGV4dCkge1xyXG4gICAgdXRpbC5taXhpbihzaXRlX2NmZywgY29udGV4dCwgdHJ1ZSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZWdpc3RlciB1c2VyLXN1cHBsaWVkIGV4dGVuc2lvbnMuXHJcbiAgLy8gRm9yIGV4YW1wbGUgdGhlICdjb3JlLm9hdXRoJyBwcm92aWRlciBkZWZpbmVzIGEgcmVnaXN0ZXIgZnVuY3Rpb24sXHJcbiAgLy8gd2hpY2ggZW5hYmxlcyBzaXRlX2NmZy5vYXV0aCB0byBiZSByZWdpc3RlcmVkIHdpdGggaXQuXHJcbiAgY29udGV4dC5wcm92aWRlcnMuZm9yRWFjaChmdW5jdGlvbiAocHJvdmlkZXIpIHtcclxuICAgIGlmIChwcm92aWRlci5uYW1lLmluZGV4T2YoJ2NvcmUuJykgPT09IDAgJiZcclxuICAgICAgICB0eXBlb2YgcHJvdmlkZXIucmVnaXN0ZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgcHJvdmlkZXIucmVnaXN0ZXIoXHJcbiAgICAgICAgKHR5cGVvZiBzaXRlX2NmZ1twcm92aWRlci5uYW1lLnN1YnN0cig1KV0gIT09ICd1bmRlZmluZWQnKSA/XHJcbiAgICAgICAgICAgIHNpdGVfY2ZnW3Byb3ZpZGVyLm5hbWUuc3Vic3RyKDUpXSA6XHJcbiAgICAgICAgICAgIHVuZGVmaW5lZFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIFxyXG4gIEJ1bmRsZS5yZWdpc3Rlcihjb250ZXh0LnByb3ZpZGVycywgYXBpKTtcclxuICByZXNvdXJjZS5yZWdpc3Rlcihjb250ZXh0LnJlc29sdmVycyB8fCBbXSk7XHJcblxyXG4gIHJldHVybiBuZXcgUHJvbWlzZUNvbXBhdChmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICBpZiAoc2l0ZV9jZmcubW9kdWxlQ29udGV4dCkge1xyXG4gICAgICBQb3J0ID0gc2l0ZV9jZmcucG9ydFR5cGU7XHJcbiAgICAgIGxpbmsgPSBuZXcgUG9ydCgnT3V0Ym91bmQnLCByZXNvdXJjZSk7XHJcbiAgICAgIG1hbmFnZXIuc2V0dXAobGluayk7XHJcblxyXG4gICAgICAvLyBEZWxheSBkZWJ1ZyBtZXNzYWdlcyB1bnRpbCBkZWxlZ2F0aW9uIHRvIHRoZSBwYXJlbnQgY29udGV4dCBpcyBzZXR1cC5cclxuICAgICAgbWFuYWdlci5vbmNlKCdkZWxlZ2F0ZScsIG1hbmFnZXIuc2V0dXAuYmluZChtYW5hZ2VyLCBkZWJ1ZykpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbWFuYWdlci5zZXR1cChkZWJ1Zyk7XHJcbiAgICAgIHBvbGljeSA9IG5ldyBQb2xpY3kobWFuYWdlciwgcmVzb3VyY2UsIHNpdGVfY2ZnKTtcclxuXHJcbiAgICAgIC8vIERlZmluZSBob3cgdG8gbG9hZCBhIHJvb3QgbW9kdWxlLlxyXG4gICAgICB2YXIgZmFsbGJhY2tMb2dnZXIsIGdldElmYWNlO1xyXG4gICAgICBmYWxsYmFja0xvZ2dlciA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICAgICAgYXBpLmdldENvcmUoJ2NvcmUuY29uc29sZScsIGRlYnVnKS50aGVuKGZ1bmN0aW9uIChMb2dnZXIpIHtcclxuICAgICAgICAgIGRlYnVnLnNldExvZ2dlcihuZXcgTG9nZ2VyKCkpO1xyXG4gICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgZGVidWcuZXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcbiAgICAgIGdldElmYWNlID0gZnVuY3Rpb24gKG1hbmlmZXN0KSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc291cmNlLmdldChzaXRlX2NmZy5sb2NhdGlvbiwgbWFuaWZlc3QpLnRoZW4oXHJcbiAgICAgICAgICBmdW5jdGlvbiAoY2Fub25pY2FsX21hbmlmZXN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwb2xpY3kuZ2V0KFtdLCBjYW5vbmljYWxfbWFuaWZlc3QpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICkudGhlbihmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICAgICAgICAgIG1hbmFnZXIuc2V0dXAoaW5zdGFuY2UpO1xyXG4gICAgICAgICAgcmV0dXJuIGJpbmRlci5iaW5kRGVmYXVsdChpbnN0YW5jZSwgYXBpLCBpbnN0YW5jZS5tYW5pZmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBMb2FkIGFwcHJvcHJpYXRlIExvZ2dlci5cclxuICAgICAgaWYgKHNpdGVfY2ZnLmxvZ2dlcikge1xyXG4gICAgICAgIGdldElmYWNlKHNpdGVfY2ZnLmxvZ2dlcikudGhlbihmdW5jdGlvbiAoaWZhY2UpIHtcclxuICAgICAgICAgIGlmIChpZmFjZS5leHRlcm5hbC5hcGkgIT09ICdjb25zb2xlJykge1xyXG4gICAgICAgICAgICBmYWxsYmFja0xvZ2dlcihcIlVud2lsbGluZyB0byB1c2UgbG9nZ2VyIHdpdGggdW5rbm93biBBUEk6XCIsXHJcbiAgICAgICAgICAgICAgaWZhY2UuZXh0ZXJuYWwuYXBpKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlYnVnLnNldExvZ2dlcihpZmFjZS5leHRlcm5hbCgpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBmYWxsYmFja0xvZ2dlcik7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZmFsbGJhY2tMb2dnZXIoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gTG9hZCByb290IG1vZHVsZS5cclxuICAgICAgZ2V0SWZhY2Uoc2l0ZV9jZmcubWFuaWZlc3QpLnRoZW4oZnVuY3Rpb24gKGlmYWNlKSB7XHJcbiAgICAgICAgcmV0dXJuIGlmYWNlLmV4dGVybmFsO1xyXG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgICAgZGVidWcuZXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSBtYW5pZmVzdDogJyArIGVycik7XHJcbiAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICB9KS50aGVuKHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICB9XHJcblxyXG4gICAgaHViLmVtaXQoJ2NvbmZpZycsIHNpdGVfY2ZnKTtcclxuICB9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gc2V0dXA7XHJcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLypqc2xpbnQgaW5kZW50OjIsc2xvcHB5OnRydWUsbm9kZTp0cnVlICovXHJcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcblxyXG4vKipcclxuICogRGVmaW5lcyBmZG9tLkh1YiwgdGhlIGNvcmUgbWVzc2FnZSBodWIgYmV0d2VlbiBmcmVlZG9tIG1vZHVsZXMuXHJcbiAqIEluY29tbWluZyBtZXNzYWdlcyBmcm9tIGFwcHMgYXJlIHNlbnQgdG8gaHViLm9uTWVzc2FnZSgpXHJcbiAqIEBjbGFzcyBIdWJcclxuICogQHBhcmFtIHtEZWJ1Z30gZGVidWcgTG9nZ2VyIGZvciBkZWJ1Z2dpbmcuXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxudmFyIEh1YiA9IGZ1bmN0aW9uIChkZWJ1Zykge1xyXG4gIHRoaXMuZGVidWcgPSBkZWJ1ZztcclxuICB0aGlzLmNvbmZpZyA9IHt9O1xyXG4gIHRoaXMuYXBwcyA9IHt9O1xyXG4gIHRoaXMucm91dGVzID0ge307XHJcbiAgdGhpcy51bmJvdW5kID0gW107XHJcblxyXG4gIHV0aWwuaGFuZGxlRXZlbnRzKHRoaXMpO1xyXG4gIHRoaXMub24oJ2NvbmZpZycsIGZ1bmN0aW9uIChjb25maWcpIHtcclxuICAgIHV0aWwubWl4aW4odGhpcy5jb25maWcsIGNvbmZpZyk7XHJcbiAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgYW4gaW5jb21pbmcgbWVzc2FnZSBmcm9tIGEgZnJlZWRvbSBhcHAuXHJcbiAqIEBtZXRob2Qgb25NZXNzYWdlXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzb3VyY2UgVGhlIGlkZW50aWZpeWluZyBzb3VyY2Ugb2YgdGhlIG1lc3NhZ2UuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIFRoZSBzZW50IG1lc3NhZ2UuXHJcbiAqL1xyXG5IdWIucHJvdG90eXBlLm9uTWVzc2FnZSA9IGZ1bmN0aW9uIChzb3VyY2UsIG1lc3NhZ2UpIHtcclxuICB2YXIgZGVzdGluYXRpb24gPSB0aGlzLnJvdXRlc1tzb3VyY2VdLCB0eXBlO1xyXG4gIGlmICghZGVzdGluYXRpb24gfHwgIWRlc3RpbmF0aW9uLmFwcCkge1xyXG4gICAgdGhpcy5kZWJ1Zy53YXJuKFwiTWVzc2FnZSBkcm9wcGVkIGZyb20gdW5yZWdpc3RlcmVkIHNvdXJjZSBcIiArIHNvdXJjZSk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoIXRoaXMuYXBwc1tkZXN0aW5hdGlvbi5hcHBdKSB7XHJcbiAgICB0aGlzLmRlYnVnLndhcm4oXCJNZXNzYWdlIGRyb3BwZWQgdG8gZGVzdGluYXRpb24gXCIgKyBkZXN0aW5hdGlvbi5hcHApO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gVGhlIGZpcmVob3NlIHRyYWNpbmcgYWxsIGludGVybmFsIGZyZWVkb20uanMgbWVzc2FnZXMuXHJcbiAgaWYgKCFtZXNzYWdlLnF1aWV0ICYmICFkZXN0aW5hdGlvbi5xdWlldCAmJiB0aGlzLmNvbmZpZyAmJiB0aGlzLmNvbmZpZy50cmFjZSkge1xyXG4gICAgdHlwZSA9IG1lc3NhZ2UudHlwZTtcclxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdtZXNzYWdlJyAmJiBtZXNzYWdlLm1lc3NhZ2UgJiZcclxuICAgICAgICBtZXNzYWdlLm1lc3NhZ2UuYWN0aW9uID09PSAnbWV0aG9kJykge1xyXG4gICAgICB0eXBlID0gJ21ldGhvZC4nICsgbWVzc2FnZS5tZXNzYWdlLnR5cGU7XHJcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ21ldGhvZCcgJiYgbWVzc2FnZS5tZXNzYWdlICYmXHJcbiAgICAgICAgbWVzc2FnZS5tZXNzYWdlLnR5cGUgPT09ICdtZXRob2QnKSB7XHJcbiAgICAgIHR5cGUgPSAncmV0dXJuLicgKyBtZXNzYWdlLm1lc3NhZ2UubmFtZTtcclxuICAgIH0gZWxzZSBpZiAobWVzc2FnZS50eXBlID09PSAnbWVzc2FnZScgJiYgbWVzc2FnZS5tZXNzYWdlICYmXHJcbiAgICAgICAgbWVzc2FnZS5tZXNzYWdlLnR5cGUgPT09ICdldmVudCcpIHtcclxuICAgICAgdHlwZSA9ICdldmVudC4nICsgbWVzc2FnZS5tZXNzYWdlLm5hbWU7XHJcbiAgICB9XHJcbiAgICB0aGlzLmRlYnVnLmRlYnVnKHRoaXMuYXBwc1tkZXN0aW5hdGlvbi5zb3VyY2VdLnRvU3RyaW5nKCkgK1xyXG4gICAgICAgIFwiIC1cIiArIHR5cGUgKyBcIi0+IFwiICtcclxuICAgICAgICB0aGlzLmFwcHNbZGVzdGluYXRpb24uYXBwXS50b1N0cmluZygpICsgXCIuXCIgKyBkZXN0aW5hdGlvbi5mbG93KTtcclxuICB9XHJcblxyXG4gIHRoaXMuYXBwc1tkZXN0aW5hdGlvbi5hcHBdLm9uTWVzc2FnZShkZXN0aW5hdGlvbi5mbG93LCBtZXNzYWdlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgdGhlIGxvY2FsIGRlc3RpbmF0aW9uIHBvcnQgb2YgYSBmbG93LlxyXG4gKiBAbWV0aG9kIGdldERlc3RpbmF0aW9uXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzb3VyY2UgVGhlIGZsb3cgdG8gcmV0cmlldmUuXHJcbiAqIEByZXR1cm4ge1BvcnR9IFRoZSBkZXN0aW5hdGlvbiBwb3J0LlxyXG4gKi9cclxuSHViLnByb3RvdHlwZS5nZXREZXN0aW5hdGlvbiA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcclxuICB2YXIgZGVzdGluYXRpb24gPSB0aGlzLnJvdXRlc1tzb3VyY2VdO1xyXG4gIGlmICghZGVzdGluYXRpb24pIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5hcHBzW2Rlc3RpbmF0aW9uLmFwcF07XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IHRoZSBsb2NhbCBzb3VyY2UgcG9ydCBvZiBhIGZsb3cuXHJcbiAqIEBtZXRob2QgZ2V0U291cmNlXHJcbiAqIEBwYXJhbSB7UG9ydH0gc291cmNlIFRoZSBmbG93IGlkZW50aWZpZXIgdG8gcmV0cmlldmUuXHJcbiAqIEByZXR1cm4ge1BvcnR9IFRoZSBzb3VyY2UgcG9ydC5cclxuICovXHJcbkh1Yi5wcm90b3R5cGUuZ2V0U291cmNlID0gZnVuY3Rpb24gKHNvdXJjZSkge1xyXG4gIGlmICghc291cmNlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIGlmICghdGhpcy5hcHBzW3NvdXJjZS5pZF0pIHtcclxuICAgIHRoaXMuZGVidWcud2FybihcIk5vIHJlZ2lzdGVyZWQgc291cmNlICdcIiArIHNvdXJjZS5pZCArIFwiJ1wiKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuYXBwc1tzb3VyY2UuaWRdO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyIGEgZGVzdGluYXRpb24gZm9yIG1lc3NhZ2VzIHdpdGggdGhpcyBodWIuXHJcbiAqIEBtZXRob2QgcmVnaXN0ZXJcclxuICogQHBhcmFtIHtQb3J0fSBhcHAgVGhlIFBvcnQgdG8gcmVnaXN0ZXIuXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2ZvcmNlXSBXaGV0aGVyIHRvIG92ZXJyaWRlIGFuIGV4aXN0aW5nIHBvcnQuXHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFdoZXRoZXIgdGhlIGFwcCB3YXMgcmVnaXN0ZXJlZC5cclxuICovXHJcbkh1Yi5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiAoYXBwLCBmb3JjZSkge1xyXG4gIGlmICghdGhpcy5hcHBzW2FwcC5pZF0gfHwgZm9yY2UpIHtcclxuICAgIHRoaXMuYXBwc1thcHAuaWRdID0gYXBwO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogRGVyZWdpc3RlciBhIGRlc3RpbmF0aW9uIGZvciBtZXNzYWdlcyB3aXRoIHRoZSBodWIuXHJcbiAqIE5vdGU6IGRvZXMgbm90IHJlbW92ZSBhc3NvY2lhdGVkIHJvdXRlcy4gQXMgc3VjaCwgZGVyZWdpc3RlcmluZyB3aWxsXHJcbiAqIHByZXZlbnQgdGhlIGluc3RhbGxhdGlvbiBvZiBuZXcgcm91dGVzLCBidXQgd2lsbCBub3QgZGlzdHJ1cHQgZXhpc3RpbmdcclxuICogaHViIHJvdXRlcy5cclxuICogQG1ldGhvZCBkZXJlZ2lzdGVyXHJcbiAqIEBwYXJhbSB7UG9ydH0gYXBwIFRoZSBQb3J0IHRvIGRlcmVnaXN0ZXJcclxuICogQHJldHVybiB7Qm9vbGVhbn0gV2hldGhlciB0aGUgYXBwIHdhcyBkZXJlZ2lzdGVyZWQuXHJcbiAqL1xyXG5IdWIucHJvdG90eXBlLmRlcmVnaXN0ZXIgPSBmdW5jdGlvbiAoYXBwKSB7XHJcbiAgaWYgKCF0aGlzLmFwcHNbYXBwLmlkXSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICBkZWxldGUgdGhpcy5hcHBzW2FwcC5pZF07XHJcbiAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vKipcclxuICogSW5zdGFsbCBhIG5ldyByb3V0ZSBpbiB0aGUgaHViLlxyXG4gKiBAbWV0aG9kIGluc3RhbGxcclxuICogQHBhcmFtIHtQb3J0fSBzb3VyY2UgVGhlIHNvdXJjZSBvZiB0aGUgcm91dGUuXHJcbiAqIEBwYXJhbSB7UG9ydH0gZGVzdGluYXRpb24gVGhlIGRlc3RpbmF0aW9uIG9mIHRoZSByb3V0ZS5cclxuICogQHBhcmFtIHtTdHJpbmd9IGZsb3cgVGhlIGZsb3cgd2hlcmUgdGhlIGRlc3RpbmF0aW9uIHdpbGwgcmVjZWl2ZSBtZXNzYWdlcy5cclxuICogQHBhcmFtIHtCb29sZWFufSBxdWlldCBXaGV0aGVyIG1lc3NhZ2VzIG9uIHRoaXMgcm91dGUgc2hvdWxkIGJlIHN1cHByZXNzZWQuXHJcbiAqIEByZXR1cm4ge1N0cmluZ30gQSByb3V0aW5nIHNvdXJjZSBpZGVudGlmaWVyIGZvciBzZW5kaW5nIG1lc3NhZ2VzLlxyXG4gKi9cclxuSHViLnByb3RvdHlwZS5pbnN0YWxsID0gZnVuY3Rpb24gKHNvdXJjZSwgZGVzdGluYXRpb24sIGZsb3csIHF1aWV0KSB7XHJcbiAgc291cmNlID0gdGhpcy5nZXRTb3VyY2Uoc291cmNlKTtcclxuICBpZiAoIXNvdXJjZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZiAoIWRlc3RpbmF0aW9uKSB7XHJcbiAgICB0aGlzLmRlYnVnLndhcm4oXCJVbndpbGxpbmcgdG8gZ2VuZXJhdGUgYmxhY2tob2xlIGZsb3cgZnJvbSBcIiArIHNvdXJjZS5pZCk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgcm91dGUgPSB0aGlzLmdlbmVyYXRlUm91dGUoKTtcclxuICB0aGlzLnJvdXRlc1tyb3V0ZV0gPSB7XHJcbiAgICBhcHA6IGRlc3RpbmF0aW9uLFxyXG4gICAgZmxvdzogZmxvdyxcclxuICAgIHNvdXJjZTogc291cmNlLmlkLFxyXG4gICAgcXVpZXQ6IHF1aWV0XHJcbiAgfTtcclxuICBpZiAodHlwZW9mIHNvdXJjZS5vbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgc291cmNlLm9uKHJvdXRlLCB0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMsIHJvdXRlKSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcm91dGU7XHJcbn07XHJcblxyXG4vKipcclxuICogVW5pbnN0YWxsIGEgaHViIHJvdXRlLlxyXG4gKiBAbWV0aG9kIHVuaW5zdGFsbFxyXG4gKiBAcGFyYW0ge1BvcnR9IHNvdXJjZSBUaGUgc291cmNlIG9mIHRoZSByb3V0ZS5cclxuICogQHBhcmFtIHtTdHJpbmd9IGZsb3cgVGhlIHJvdXRlIHRvIHVuaW5zdGFsbC5cclxuICogQHJldHVybiB7Qm9vbGVhbn0gV2hldGhlciB0aGUgcm91dGUgd2FzIGFibGUgdG8gYmUgdW5pbnN0YWxsZWQuXHJcbiAqL1xyXG5IdWIucHJvdG90eXBlLnVuaW5zdGFsbCA9IGZ1bmN0aW9uIChzb3VyY2UsIGZsb3cpIHtcclxuICBzb3VyY2UgPSB0aGlzLmdldFNvdXJjZShzb3VyY2UpO1xyXG4gIGlmICghc291cmNlKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgcm91dGUgPSB0aGlzLnJvdXRlc1tmbG93XTtcclxuICBpZiAoIXJvdXRlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChyb3V0ZS5zb3VyY2UgIT09IHNvdXJjZS5pZCkge1xyXG4gICAgdGhpcy5kZWJ1Zy53YXJuKFwiRmxvdyBcIiArIGZsb3cgKyBcIiBkb2VzIG5vdCBiZWxvbmcgdG8gcG9ydCBcIiArIHNvdXJjZS5pZCk7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBkZWxldGUgdGhpcy5yb3V0ZXNbZmxvd107XHJcbiAgaWYgKHR5cGVvZiBzb3VyY2Uub2ZmID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICBzb3VyY2Uub2ZmKHJvdXRlKTtcclxuICB9XHJcbiAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYSB1bmlxdWUgcm91dGluZyBpZGVudGlmaWVyLlxyXG4gKiBAbWV0aG9kIGdlbmVyYXRlUm91dGVcclxuICogQHJldHVybiB7U3RyaW5nfSBhIHJvdXRpbmcgc291cmNlIGlkZW50aWZpZXIuXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5IdWIucHJvdG90eXBlLmdlbmVyYXRlUm91dGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHV0aWwuZ2V0SWQoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSHViO1xyXG4iLCIvKmpzbGludCBpbmRlbnQ6Miwgbm9kZTp0cnVlLCBzbG9wcHk6dHJ1ZSAqL1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLyoqXG4gKiBBIGxpbmsgY29ubmVjdHMgdHdvIGZyZWVkb20gaHVicy4gVGhpcyBpcyBhbiBhYnN0cmFjdCBjbGFzc1xuICogcHJvdmlkaW5nIGNvbW1vbiBmdW5jdGlvbmFsaXR5IG9mIHRyYW5zbGF0aW5nIGNvbnRyb2wgY2hhbm5lbHMsXG4gKiBhbmQgaW50ZWdyYXRpbmcgY29uZmlnIGluZm9ybWF0aW9uLlxuICogQGNsYXNzIExpbmtcbiAqIEBpbXBsZW1lbnRzIFBvcnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgTGluayA9IGZ1bmN0aW9uIChuYW1lLCByZXNvdXJjZSkge1xuICB0aGlzLmlkID0gJ0xpbmsnICsgTWF0aC5yYW5kb20oKTtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5yZXNvdXJjZSA9IHJlc291cmNlO1xuICB0aGlzLmNvbmZpZyA9IHt9O1xuICB0aGlzLnNyYyA9IG51bGw7XG5cbiAgdXRpbC5oYW5kbGVFdmVudHModGhpcyk7XG4gIHV0aWwubWl4aW4odGhpcywgTGluay5wcm90b3R5cGUpO1xufTtcblxuLyoqXG4gKiBSZWNlaXZlIG1lc3NhZ2VzIGZyb20gdGhlIGh1YiB0byB0aGlzIHBvcnQuXG4gKiBNYW5hZ2VzIHN0YXJ0dXAsIGFuZCBwYXNzZXMgb3RoZXJzIHRvICdkZWxpdmVyTWVzc2FnZScgaW1wbGVtZW50ZWRcbiAqIGluIGRlcml2ZWQgY2xhc3Nlcy5cbiAqIEBtZXRob2Qgb25NZXNzYWdlXG4gKiBAcGFyYW0ge1N0cmluZ30gZmxvdyB0aGUgY2hhbm5lbC9mbG93IG9mIHRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgVGhlIE1lc3NhZ2UuXG4gKi9cbkxpbmsucHJvdG90eXBlLm9uTWVzc2FnZSA9IGZ1bmN0aW9uIChmbG93LCBtZXNzYWdlKSB7XG4gIGlmIChmbG93ID09PSAnY29udHJvbCcgJiYgIXRoaXMuY29udHJvbENoYW5uZWwpIHtcbiAgICBpZiAoIXRoaXMuY29udHJvbENoYW5uZWwgJiYgbWVzc2FnZS5jaGFubmVsKSB7XG4gICAgICB0aGlzLmNvbnRyb2xDaGFubmVsID0gbWVzc2FnZS5jaGFubmVsO1xuICAgICAgdXRpbC5taXhpbih0aGlzLmNvbmZpZywgbWVzc2FnZS5jb25maWcpO1xuICAgICAgdGhpcy5zdGFydCgpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLmRlbGl2ZXJNZXNzYWdlKGZsb3csIG1lc3NhZ2UpO1xuICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgaGFuZGxlciB0byBhbGVydCBvZiBlcnJvcnMgb24gdGhpcyBwb3J0LlxuICogQG1ldGhvZCBhZGRFcnJvckhhbmRsZXJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXIgTWV0aG9kIHRvIGNhbGwgd2l0aCBlcnJvcnMuXG4gKi9cbkxpbmsucHJvdG90eXBlLmFkZEVycm9ySGFuZGxlciA9IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gIHRoaXMub25FcnJvciA9IGhhbmRsZXI7XG59O1xuXG4vKipcbiAqIFJlcG9ydCBhbiBlcnJvciBvbiB0aGlzIGxpbmsuXG4gKiBAbWV0aG9kIG9uZXJyb3JcbiAqIEBwYXJhbSB7RXJyb3J9IGVyciBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZC5cbiAqL1xuTGluay5wcm90b3R5cGUub25FcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgLy9GaWxsZWQgaW4gYnkgYWRkRXJyb3JIYW5kbGVyXG59O1xuXG4vKipcbiAqIEVtaXQgbWVzc2FnZXMgdG8gdGhlIHRoZSBodWIsIG1hcHBpbmcgY29udHJvbCBjaGFubmVscy5cbiAqIEBtZXRob2QgZW1pdE1lc3NhZ2VcbiAqIEBwYXJhbSB7U3RyaW5nfSBmbG93IHRoZSBmbG93IHRvIGVtaXQgdGhlIG1lc3NhZ2Ugb24uXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2dhZSBUaGUgbWVzc2FnZSB0byBlbWl0LlxuICovXG5MaW5rLnByb3RvdHlwZS5lbWl0TWVzc2FnZSA9IGZ1bmN0aW9uIChmbG93LCBtZXNzYWdlKSB7XG4gIGlmIChmbG93ID09PSAnY29udHJvbCcgJiYgdGhpcy5jb250cm9sQ2hhbm5lbCkge1xuICAgIGZsb3cgPSB0aGlzLmNvbnRyb2xDaGFubmVsO1xuICB9XG4gIHRoaXMuZW1pdChmbG93LCBtZXNzYWdlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGluaztcbiIsIi8qZ2xvYmFscyBXb3JrZXIgKi9cbi8qanNsaW50IGluZGVudDoyLCB3aGl0ZTp0cnVlLCBub2RlOnRydWUsIHNsb3BweTp0cnVlLCBicm93c2VyOnRydWUgKi9cbnZhciBMaW5rID0gcmVxdWlyZSgnLi4vbGluaycpO1xuXG4vKipcbiAqIEEgcG9ydCBwcm92aWRpbmcgbWVzc2FnZSB0cmFuc3BvcnQgYmV0d2VlbiB0d28gZnJlZWRvbSBjb250ZXh0cyB2aWEgV29ya2VyLlxuICogQGNsYXNzIFdvcmtlclxuICogQGV4dGVuZHMgTGlua1xuICogQHVzZXMgaGFuZGxlRXZlbnRzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFdvcmtlckxpbmsgPSBmdW5jdGlvbihpZCwgcmVzb3VyY2UpIHtcbiAgTGluay5jYWxsKHRoaXMsIGlkLCByZXNvdXJjZSk7XG4gIGlmIChpZCkge1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgfVxufTtcblxuLyoqXG4gKiBTdGFydCB0aGlzIHBvcnQgYnkgbGlzdGVuaW5nIG9yIGNyZWF0aW5nIGEgd29ya2VyLlxuICogQG1ldGhvZCBzdGFydFxuICogQHByaXZhdGVcbiAqL1xuV29ya2VyTGluay5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY29uZmlnLm1vZHVsZUNvbnRleHQpIHtcbiAgICB0aGlzLnNldHVwTGlzdGVuZXIoKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnNldHVwV29ya2VyKCk7XG4gIH1cbn07XG5cbi8qKlxuICogU3RvcCB0aGlzIHBvcnQgYnkgZGVzdHJveWluZyB0aGUgd29ya2VyLlxuICogQG1ldGhvZCBzdG9wXG4gKiBAcHJpdmF0ZVxuICovXG5Xb3JrZXJMaW5rLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIC8vIEZ1bmN0aW9uIGlzIGRldGVybWluZWQgYnkgc2V0dXBMaXN0ZW5lciBvciBzZXR1cEZyYW1lIGFzIGFwcHJvcHJpYXRlLlxufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRleHR1YWwgZGVzY3JpcHRpb24gb2YgdGhpcyBwb3J0LlxuICogQG1ldGhvZCB0b1N0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSB0aGUgZGVzY3JpcHRpb24gb2YgdGhpcyBwb3J0LlxuICovXG5Xb3JrZXJMaW5rLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJbV29ya2VyIFwiICsgdGhpcy5pZCArIFwiXVwiO1xufTtcblxuLyoqXG4gKiBTZXQgdXAgYSBnbG9iYWwgbGlzdGVuZXIgdG8gaGFuZGxlIGluY29taW5nIG1lc3NhZ2VzIHRvIHRoaXNcbiAqIGZyZWVkb20uanMgY29udGV4dC5cbiAqIEBtZXRob2Qgc2V0dXBMaXN0ZW5lclxuICovXG5Xb3JrZXJMaW5rLnByb3RvdHlwZS5zZXR1cExpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvbk1zZyA9IGZ1bmN0aW9uKG1zZykge1xuICAgIHRoaXMuZW1pdE1lc3NhZ2UobXNnLmRhdGEuZmxvdywgbXNnLmRhdGEubWVzc2FnZSk7XG4gIH0uYmluZCh0aGlzKTtcbiAgdGhpcy5vYmogPSB0aGlzLmNvbmZpZy5nbG9iYWw7XG4gIHRoaXMub2JqLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbk1zZywgdHJ1ZSk7XG4gIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbk1zZywgdHJ1ZSk7XG4gICAgZGVsZXRlIHRoaXMub2JqO1xuICB9O1xuICB0aGlzLmVtaXQoJ3N0YXJ0ZWQnKTtcbiAgdGhpcy5vYmoucG9zdE1lc3NhZ2UoXCJSZWFkeSBGb3IgTWVzc2FnZXNcIik7XG59O1xuXG4vKipcbiAqIFNldCB1cCBhIHdvcmtlciB3aXRoIGFuIGlzb2xhdGVkIGZyZWVkb20uanMgY29udGV4dCBpbnNpZGUuXG4gKiBAbWV0aG9kIHNldHVwV29ya2VyXG4gKi9cbldvcmtlckxpbmsucHJvdG90eXBlLnNldHVwV29ya2VyID0gZnVuY3Rpb24oKSB7XG4gIHZhciB3b3JrZXIsXG4gICAgYmxvYixcbiAgICBzZWxmID0gdGhpcztcbiAgd29ya2VyID0gbmV3IFdvcmtlcih0aGlzLmNvbmZpZy5zb3VyY2UgKyAnIycgKyB0aGlzLmlkKTtcblxuICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcbiAgICB0aGlzLm9uRXJyb3IoZXJyKTtcbiAgfS5iaW5kKHRoaXMpLCB0cnVlKTtcbiAgd29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbih3b3JrZXIsIG1zZykge1xuICAgIGlmICghdGhpcy5vYmopIHtcbiAgICAgIHRoaXMub2JqID0gd29ya2VyO1xuICAgICAgdGhpcy5lbWl0KCdzdGFydGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZW1pdE1lc3NhZ2UobXNnLmRhdGEuZmxvdywgbXNnLmRhdGEubWVzc2FnZSk7XG4gIH0uYmluZCh0aGlzLCB3b3JrZXIpLCB0cnVlKTtcbiAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgIGlmICh0aGlzLm9iaikge1xuICAgICAgZGVsZXRlIHRoaXMub2JqO1xuICAgIH1cbiAgfTtcbn07XG5cbi8qKlxuICogUmVjZWl2ZSBtZXNzYWdlcyBmcm9tIHRoZSBodWIgdG8gdGhpcyBwb3J0LlxuICogUmVjZWl2ZWQgbWVzc2FnZXMgd2lsbCBiZSBlbWl0dGVkIGZyb20gdGhlIG90aGVyIHNpZGUgb2YgdGhlIHBvcnQuXG4gKiBAbWV0aG9kIGRlbGl2ZXJNZXNzYWdlXG4gKiBAcGFyYW0ge1N0cmluZ30gZmxvdyB0aGUgY2hhbm5lbC9mbG93IG9mIHRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgVGhlIE1lc3NhZ2UuXG4gKi9cbldvcmtlckxpbmsucHJvdG90eXBlLmRlbGl2ZXJNZXNzYWdlID0gZnVuY3Rpb24oZmxvdywgbWVzc2FnZSkge1xuICBpZiAoZmxvdyA9PT0gJ2NvbnRyb2wnICYmIG1lc3NhZ2UudHlwZSA9PT0gJ2Nsb3NlJyAmJlxuICAgICAgbWVzc2FnZS5jaGFubmVsID09PSAnY29udHJvbCcpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhpcy5vYmopIHtcbiAgICAgIHRoaXMub2JqLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgZmxvdzogZmxvdyxcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub25jZSgnc3RhcnRlZCcsIHRoaXMub25NZXNzYWdlLmJpbmQodGhpcywgZmxvdywgbWVzc2FnZSkpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBXb3JrZXJMaW5rO1xuXG4iLCIvKmpzbGludCBpbmRlbnQ6Mixub2RlOnRydWUsc2xvcHB5OnRydWUgKi9cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTW9kdWxlSW50ZXJuYWwgPSByZXF1aXJlKCcuL21vZHVsZWludGVybmFsJyk7XG5cbi8qKlxuICogQSBmcmVlZG9tIHBvcnQgd2hpY2ggbWFuYWdlcyB0aGUgY29udHJvbCBwbGFuZSBvZiBvZiBjaGFuZ2luZyBodWIgcm91dGVzLlxuICogQGNsYXNzIE1hbmFnZXJcbiAqIEBpbXBsZW1lbnRzIFBvcnRcbiAqIEBwYXJhbSB7SHVifSBodWIgVGhlIHJvdXRpbmcgaHViIHRvIGNvbnRyb2wuXG4gKiBAcGFyYW0ge1Jlc291cmNlfSByZXNvdXJjZSBUaGUgcmVzb3VyY2UgbWFuYWdlciBmb3IgdGhlIHJ1bnRpbWUuXG4gKiBAcGFyYW0ge0FwaX0gYXBpIFRoZSBBUEkgbWFuYWdlciBmb3IgdGhlIHJ1bnRpbWUuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE1hbmFnZXIgPSBmdW5jdGlvbiAoaHViLCByZXNvdXJjZSwgYXBpKSB7XG4gIHRoaXMuaWQgPSAnY29udHJvbCc7XG4gIHRoaXMuY29uZmlnID0ge307XG4gIHRoaXMuY29udHJvbEZsb3dzID0ge307XG4gIHRoaXMuZGF0YUZsb3dzID0ge307XG4gIHRoaXMuZGF0YUZsb3dzW3RoaXMuaWRdID0gW107XG4gIHRoaXMucmV2ZXJzZUZsb3dNYXAgPSB7fTtcblxuICB0aGlzLmRlYnVnID0gaHViLmRlYnVnO1xuICB0aGlzLmh1YiA9IGh1YjtcbiAgdGhpcy5yZXNvdXJjZSA9IHJlc291cmNlO1xuICB0aGlzLmFwaSA9IGFwaTtcblxuICB0aGlzLmRlbGVnYXRlID0gbnVsbDtcbiAgdGhpcy50b0RlbGVnYXRlID0ge307XG4gIFxuICB0aGlzLmh1Yi5vbignY29uZmlnJywgZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHV0aWwubWl4aW4odGhpcy5jb25maWcsIGNvbmZpZyk7XG4gICAgdGhpcy5lbWl0KCdjb25maWcnKTtcbiAgfS5iaW5kKHRoaXMpKTtcbiAgXG4gIHV0aWwuaGFuZGxlRXZlbnRzKHRoaXMpO1xuICB0aGlzLmh1Yi5yZWdpc3Rlcih0aGlzKTtcbn07XG5cbi8qKlxuICogUHJvdmlkZSBhIHRleHR1YWwgZGVzY3JpcHRpb24gb2YgdGhpcyBwb3J0LlxuICogQG1ldGhvZCB0b1N0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSB0aGUgZGVzY3JpcHRpb24gb2YgdGhpcyBwb3J0LlxuICovXG5NYW5hZ2VyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFwiW0xvY2FsIENvbnRyb2xsZXJdXCI7XG59O1xuXG4vKipcbiAqIFByb2Nlc3MgbWVzc2FnZXMgc2VudCB0byB0aGlzIHBvcnQuXG4gKiBUaGUgbWFuYWdlciwgb3IgJ2NvbnRyb2wnIGRlc3RpbmF0aW9uIGhhbmRsZXMgc2V2ZXJhbCB0eXBlcyBvZiBtZXNzYWdlcyxcbiAqIGlkZW50aWZpZWQgYnkgdGhlIHJlcXVlc3QgcHJvcGVydHkuICBUaGUgYWN0aW9ucyBhcmU6XG4gKiAxLiBkZWJ1Zy4gUHJpbnRzIHRoZSBtZXNzYWdlIHRvIHRoZSBjb25zb2xlLlxuICogMi4gbGluay4gQ3JlYXRlcyBhIGxpbmsgYmV0d2VlbiB0aGUgc291cmNlIGFuZCBhIHByb3ZpZGVkIGRlc3RpbmF0aW9uIHBvcnQuXG4gKiAzLiBlbnZpcm9ubWVudC4gSW5zdGFudGlhdGUgYSBtb2R1bGUgZW52aXJvbm1lbnQgZGVmaW5lZCBpbiBNb2R1bGVJbnRlcm5hbC5cbiAqIDQuIGRlbGVnYXRlLiBSb3V0ZXMgYSBkZWZpbmVkIHNldCBvZiBjb250cm9sIG1lc3NhZ2VzIHRvIGFub3RoZXIgbG9jYXRpb24uXG4gKiA1LiByZXNvdXJjZS4gUmVnaXN0ZXJzIHRoZSBzb3VyY2UgYXMgYSByZXNvdXJjZSByZXNvbHZlci5cbiAqIDYuIGNvcmUuIEdlbmVyYXRlcyBhIGNvcmUgcHJvdmlkZXIgZm9yIHRoZSByZXF1ZXN0ZXIuXG4gKiA3LiBjbG9zZS4gVGVhcnMgZG93biByb3V0ZXMgaW52b2xpbmcgdGhlIHJlcXVlc3RpbmcgcG9ydC5cbiAqIDguIHVubGluay4gVGVhcnMgZG93biBhIHJvdXRlIGZyb20gdGhlIHJlcXVlc3RpbmcgcG9ydC5cbiAqIEBtZXRob2Qgb25NZXNzYWdlXG4gKiBAcGFyYW0ge1N0cmluZ30gZmxvdyBUaGUgc291cmNlIGlkZW50aWZpZXIgb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBUaGUgcmVjZWl2ZWQgbWVzc2FnZS5cbiAqL1xuTWFuYWdlci5wcm90b3R5cGUub25NZXNzYWdlID0gZnVuY3Rpb24gKGZsb3csIG1lc3NhZ2UpIHtcbiAgdmFyIHJldmVyc2VGbG93ID0gdGhpcy5jb250cm9sRmxvd3NbZmxvd10sIG9yaWdpbjtcbiAgaWYgKCFyZXZlcnNlRmxvdykge1xuICAgIHRoaXMuZGVidWcud2FybihcIlVua25vd24gbWVzc2FnZSBzb3VyY2U6IFwiICsgZmxvdyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIG9yaWdpbiA9IHRoaXMuaHViLmdldERlc3RpbmF0aW9uKHJldmVyc2VGbG93KTtcblxuICBpZiAodGhpcy5kZWxlZ2F0ZSAmJiByZXZlcnNlRmxvdyAhPT0gdGhpcy5kZWxlZ2F0ZSAmJlxuICAgICAgdGhpcy50b0RlbGVnYXRlW2Zsb3ddKSB7XG4gICAgLy8gU2hpcCBvZmYgdG8gdGhlIGRlbGVnZWVcbiAgICB0aGlzLmVtaXQodGhpcy5kZWxlZ2F0ZSwge1xuICAgICAgdHlwZTogJ0RlbGVnYXRpb24nLFxuICAgICAgcmVxdWVzdDogJ2hhbmRsZScsXG4gICAgICBxdWlldDogdHJ1ZSxcbiAgICAgIGZsb3c6IGZsb3csXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UucmVxdWVzdCA9PT0gJ2RlYnVnJykge1xuICAgIHRoaXMuZGVidWcucHJpbnQobWVzc2FnZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UucmVxdWVzdCA9PT0gJ2xpbmsnKSB7XG4gICAgdGhpcy5jcmVhdGVMaW5rKG9yaWdpbiwgbWVzc2FnZS5uYW1lLCBtZXNzYWdlLnRvLCBtZXNzYWdlLm92ZXJyaWRlRGVzdCk7XG4gIH0gZWxzZSBpZiAobWVzc2FnZS5yZXF1ZXN0ID09PSAnZW52aXJvbm1lbnQnKSB7XG4gICAgdGhpcy5jcmVhdGVMaW5rKG9yaWdpbiwgbWVzc2FnZS5uYW1lLCBuZXcgTW9kdWxlSW50ZXJuYWwodGhpcykpO1xuICB9IGVsc2UgaWYgKG1lc3NhZ2UucmVxdWVzdCA9PT0gJ2RlbGVnYXRlJykge1xuICAgIC8vIEluaXRhdGUgRGVsZWdhdGlvbi5cbiAgICBpZiAodGhpcy5kZWxlZ2F0ZSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5kZWxlZ2F0ZSA9IHJldmVyc2VGbG93O1xuICAgIH1cbiAgICB0aGlzLnRvRGVsZWdhdGVbbWVzc2FnZS5mbG93XSA9IHRydWU7XG4gICAgdGhpcy5lbWl0KCdkZWxlZ2F0ZScpO1xuICB9IGVsc2UgaWYgKG1lc3NhZ2UucmVxdWVzdCA9PT0gJ3Jlc291cmNlJykge1xuICAgIHRoaXMucmVzb3VyY2UuYWRkUmVzb2x2ZXIobWVzc2FnZS5hcmdzWzBdKTtcbiAgICB0aGlzLnJlc291cmNlLmFkZFJldHJpZXZlcihtZXNzYWdlLnNlcnZpY2UsIG1lc3NhZ2UuYXJnc1sxXSk7XG4gIH0gZWxzZSBpZiAobWVzc2FnZS5yZXF1ZXN0ID09PSAnY29yZScpIHtcbiAgICBpZiAodGhpcy5jb3JlICYmIHJldmVyc2VGbG93ID09PSB0aGlzLmRlbGVnYXRlKSB7XG4gICAgICAobmV3IHRoaXMuY29yZSgpKS5vbk1lc3NhZ2Uob3JpZ2luLCBtZXNzYWdlLm1lc3NhZ2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmdldENvcmUoZnVuY3Rpb24gKHRvLCBjb3JlKSB7XG4gICAgICB0aGlzLmh1Yi5vbk1lc3NhZ2UodG8sIHtcbiAgICAgICAgdHlwZTogJ2NvcmUnLFxuICAgICAgICBjb3JlOiBjb3JlXG4gICAgICB9KTtcbiAgICB9LmJpbmQodGhpcywgcmV2ZXJzZUZsb3cpKTtcbiAgfSBlbHNlIGlmIChtZXNzYWdlLnJlcXVlc3QgPT09ICdjbG9zZScpIHtcbiAgICB0aGlzLmRlc3Ryb3kob3JpZ2luKTtcbiAgfSBlbHNlIGlmIChtZXNzYWdlLnJlcXVlc3QgPT09ICd1bmxpbmsnKSB7XG4gICAgdGhpcy5yZW1vdmVMaW5rKG9yaWdpbiwgbWVzc2FnZS50byk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5kZWJ1Zy53YXJuKFwiVW5rbm93biBjb250cm9sIHJlcXVlc3Q6IFwiICsgbWVzc2FnZS5yZXF1ZXN0KTtcbiAgICB0aGlzLmRlYnVnLmxvZyhKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vKipcbiAqIEdldCB0aGUgcG9ydCBtZXNzYWdlcyB3aWxsIGJlIHJvdXRlZCB0byBnaXZlbiBpdHMgaWQuXG4gKiBAbWV0aG9kIGdldFBvcnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBwb3J0SWQgVGhlIElEIG9mIHRoZSBwb3J0LlxuICogQHJldHVybnMge2Zkb20uUG9ydH0gVGhlIHBvcnQgd2l0aCB0aGF0IElELlxuICovXG5NYW5hZ2VyLnByb3RvdHlwZS5nZXRQb3J0ID0gZnVuY3Rpb24gKHBvcnRJZCkge1xuICByZXR1cm4gdGhpcy5odWIuZ2V0RGVzdGluYXRpb24odGhpcy5jb250cm9sRmxvd3NbcG9ydElkXSk7XG59O1xuXG4vKipcbiAqIFNldCB1cCBhIHBvcnQgd2l0aCB0aGUgaHViLlxuICogQG1ldGhvZCBzZXR1cFxuICogQHBhcmFtIHtQb3J0fSBwb3J0IFRoZSBwb3J0IHRvIHJlZ2lzdGVyLlxuICovXG5NYW5hZ2VyLnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gIGlmICghcG9ydC5pZCkge1xuICAgIHRoaXMuZGVidWcud2FybihcIlJlZnVzaW5nIHRvIHNldHVwIHVuaWRlbnRpZmllZCBwb3J0IFwiKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAodGhpcy5jb250cm9sRmxvd3NbcG9ydC5pZF0pIHtcbiAgICB0aGlzLmRlYnVnLndhcm4oXCJSZWZ1c2luZyB0byByZS1pbml0aWFsaXplIHBvcnQgXCIgKyBwb3J0LmlkKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXRoaXMuY29uZmlnLmdsb2JhbCkge1xuICAgIHRoaXMub25jZSgnY29uZmlnJywgdGhpcy5zZXR1cC5iaW5kKHRoaXMsIHBvcnQpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLmh1Yi5yZWdpc3Rlcihwb3J0KTtcbiAgdmFyIGZsb3cgPSB0aGlzLmh1Yi5pbnN0YWxsKHRoaXMsIHBvcnQuaWQsIFwiY29udHJvbFwiKSxcbiAgICByZXZlcnNlID0gdGhpcy5odWIuaW5zdGFsbChwb3J0LCB0aGlzLmlkLCBwb3J0LmlkKTtcbiAgdGhpcy5jb250cm9sRmxvd3NbcG9ydC5pZF0gPSBmbG93O1xuICB0aGlzLmRhdGFGbG93c1twb3J0LmlkXSA9IFtyZXZlcnNlXTtcbiAgdGhpcy5yZXZlcnNlRmxvd01hcFtmbG93XSA9IHJldmVyc2U7XG4gIHRoaXMucmV2ZXJzZUZsb3dNYXBbcmV2ZXJzZV0gPSBmbG93O1xuXG4gIGlmIChwb3J0LmxpbmVhZ2UpIHtcbiAgICB0aGlzLmVtaXQoJ21vZHVsZUFkZCcsIHtpZDogcG9ydC5pZCwgbGluZWFnZTogcG9ydC5saW5lYWdlfSk7XG4gIH1cbiAgXG4gIHRoaXMuaHViLm9uTWVzc2FnZShmbG93LCB7XG4gICAgdHlwZTogJ3NldHVwJyxcbiAgICBjaGFubmVsOiByZXZlcnNlLFxuICAgIGNvbmZpZzogdGhpcy5jb25maWdcbiAgfSk7XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFRlYXIgZG93biBhIHBvcnQgb24gdGhlIGh1Yi5cbiAqIEBtZXRob2QgZGVzdHJveVxuICogQGFwcmFtIHtQb3J0fSBwb3J0IFRoZSBwb3J0IHRvIHVucmVnaXN0ZXIuXG4gKi9cbk1hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAocG9ydCkge1xuICBpZiAoIXBvcnQuaWQpIHtcbiAgICB0aGlzLmRlYnVnLndhcm4oXCJVbmFibGUgdG8gdGVhciBkb3duIHVuaWRlbnRpZmllZCBwb3J0XCIpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChwb3J0LmxpbmVhZ2UpIHtcbiAgICB0aGlzLmVtaXQoJ21vZHVsZVJlbW92ZScsIHtpZDogcG9ydC5pZCwgbGluZWFnZTogcG9ydC5saW5lYWdlfSk7XG4gIH1cblxuICAvLyBSZW1vdmUgdGhlIHBvcnQuXG4gIGRlbGV0ZSB0aGlzLmNvbnRyb2xGbG93c1twb3J0LmlkXTtcblxuICAvLyBSZW1vdmUgYXNzb2NpYXRlZCBsaW5rcy5cbiAgdmFyIGk7XG4gIGZvciAoaSA9IHRoaXMuZGF0YUZsb3dzW3BvcnQuaWRdLmxlbmd0aCAtIDE7IGkgPj0gMDsgaSAtPSAxKSB7XG4gICAgdGhpcy5yZW1vdmVMaW5rKHBvcnQsIHRoaXMuZGF0YUZsb3dzW3BvcnQuaWRdW2ldKTtcbiAgfVxuXG4gIC8vIFJlbW92ZSB0aGUgcG9ydC5cbiAgZGVsZXRlIHRoaXMuZGF0YUZsb3dzW3BvcnQuaWRdO1xuICB0aGlzLmh1Yi5kZXJlZ2lzdGVyKHBvcnQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBsaW5rIGJldHdlZW4gdHdvIHBvcnRzLiAgTGlua3MgYXJlIGNyZWF0ZWQgaW4gYm90aCBkaXJlY3Rpb25zLFxuICogYW5kIGEgbWVzc2FnZSB3aXRoIHRob3NlIGNhcGFiaWxpdGllcyBpcyBzZW50IHRvIHRoZSBzb3VyY2UgcG9ydC5cbiAqIEBtZXRob2QgY3JlYXRlTGlua1xuICogQHBhcmFtIHtQb3J0fSBwb3J0IFRoZSBzb3VyY2UgcG9ydC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBmbG93IGZvciBtZXNzYWdlcyBmcm9tIGRlc3RpbmF0aW9uIHRvIHBvcnQuXG4gKiBAcGFyYW0ge1BvcnR9IGRlc3RpbmF0aW9uIFRoZSBkZXN0aW5hdGlvbiBwb3J0LlxuICogQHBhcmFtIHtTdHJpbmd9IFtkZXN0TmFtZV0gVGhlIGZsb3cgbmFtZSBmb3IgbWVzc2FnZXMgdG8gdGhlIGRlc3RpbmF0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBbdG9EZXN0XSBUZWxsIHRoZSBkZXN0aW5hdGlvbiBhYm91dCB0aGUgbGluay5cbiAqL1xuTWFuYWdlci5wcm90b3R5cGUuY3JlYXRlTGluayA9IGZ1bmN0aW9uIChwb3J0LCBuYW1lLCBkZXN0aW5hdGlvbiwgZGVzdE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvRGVzdCkge1xuICBpZiAoIXRoaXMuY29uZmlnLmdsb2JhbCkge1xuICAgIHRoaXMub25jZSgnY29uZmlnJyxcbiAgICAgIHRoaXMuY3JlYXRlTGluay5iaW5kKHRoaXMsIHBvcnQsIG5hbWUsIGRlc3RpbmF0aW9uLCBkZXN0TmFtZSkpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgaWYgKCF0aGlzLmNvbnRyb2xGbG93c1twb3J0LmlkXSkge1xuICAgIHRoaXMuZGVidWcud2FybignVW53aWxsaW5nIHRvIGxpbmsgZnJvbSBub24tcmVnaXN0ZXJlZCBzb3VyY2UuJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCF0aGlzLmNvbnRyb2xGbG93c1tkZXN0aW5hdGlvbi5pZF0pIHtcbiAgICBpZiAodGhpcy5zZXR1cChkZXN0aW5hdGlvbikgPT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRlYnVnLndhcm4oJ0NvdWxkIG5vdCBmaW5kIG9yIHNldHVwIGRlc3RpbmF0aW9uLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICB2YXIgcXVpZXQgPSBkZXN0aW5hdGlvbi5xdWlldCB8fCBmYWxzZSxcbiAgICBvdXRnb2luZ05hbWUgPSBkZXN0TmFtZSB8fCAnZGVmYXVsdCcsXG4gICAgb3V0Z29pbmcgPSB0aGlzLmh1Yi5pbnN0YWxsKHBvcnQsIGRlc3RpbmF0aW9uLmlkLCBvdXRnb2luZ05hbWUsIHF1aWV0KSxcbiAgICByZXZlcnNlO1xuXG4gIC8vIFJlY292ZXIgdGhlIHBvcnQgc28gdGhhdCBsaXN0ZW5lcnMgYXJlIGluc3RhbGxlZC5cbiAgZGVzdGluYXRpb24gPSB0aGlzLmh1Yi5nZXREZXN0aW5hdGlvbihvdXRnb2luZyk7XG4gIHJldmVyc2UgPSB0aGlzLmh1Yi5pbnN0YWxsKGRlc3RpbmF0aW9uLCBwb3J0LmlkLCBuYW1lLCBxdWlldCk7XG5cbiAgdGhpcy5yZXZlcnNlRmxvd01hcFtvdXRnb2luZ10gPSByZXZlcnNlO1xuICB0aGlzLmRhdGFGbG93c1twb3J0LmlkXS5wdXNoKG91dGdvaW5nKTtcbiAgdGhpcy5yZXZlcnNlRmxvd01hcFtyZXZlcnNlXSA9IG91dGdvaW5nO1xuICB0aGlzLmRhdGFGbG93c1tkZXN0aW5hdGlvbi5pZF0ucHVzaChyZXZlcnNlKTtcblxuICBpZiAodG9EZXN0KSB7XG4gICAgdGhpcy5odWIub25NZXNzYWdlKHRoaXMuY29udHJvbEZsb3dzW2Rlc3RpbmF0aW9uLmlkXSwge1xuICAgICAgdHlwZTogJ2NyZWF0ZUxpbmsnLFxuICAgICAgbmFtZTogb3V0Z29pbmdOYW1lLFxuICAgICAgY2hhbm5lbDogcmV2ZXJzZSxcbiAgICAgIHJldmVyc2U6IG91dGdvaW5nXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5odWIub25NZXNzYWdlKHRoaXMuY29udHJvbEZsb3dzW3BvcnQuaWRdLCB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgdHlwZTogJ2NyZWF0ZUxpbmsnLFxuICAgICAgY2hhbm5lbDogb3V0Z29pbmcsXG4gICAgICByZXZlcnNlOiByZXZlcnNlXG4gICAgfSk7XG4gIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgbGluayBiZXR3ZWVuIHRvIHBvcnRzLiBUaGUgcmV2ZXJzZSBsaW5rIHdpbGwgYWxzbyBiZSByZW1vdmVkLlxuICogQG1ldGhvZCByZW1vdmVMaW5rXG4gKiBAcGFyYW0ge1BvcnR9IHBvcnQgVGhlIHNvdXJjZSBwb3J0LlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIGZsb3cgdG8gYmUgcmVtb3ZlZC5cbiAqL1xuTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlTGluayA9IGZ1bmN0aW9uIChwb3J0LCBuYW1lKSB7XG4gIHZhciByZXZlcnNlID0gdGhpcy5odWIuZ2V0RGVzdGluYXRpb24obmFtZSksXG4gICAgcmZsb3cgPSB0aGlzLnJldmVyc2VGbG93TWFwW25hbWVdLFxuICAgIGk7XG5cbiAgaWYgKCFyZXZlcnNlIHx8ICFyZmxvdykge1xuICAgIHRoaXMuZGVidWcud2FybihcIkNvdWxkIG5vdCBmaW5kIG1ldGFkYXRhIHRvIHJlbW92ZSBmbG93OiBcIiArIG5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0aGlzLmh1Yi5nZXREZXN0aW5hdGlvbihyZmxvdykuaWQgIT09IHBvcnQuaWQpIHtcbiAgICB0aGlzLmRlYnVnLndhcm4oXCJTb3VyY2UgcG9ydCBkb2VzIG5vdCBvd24gZmxvdyBcIiArIG5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIE5vdGlmeSBwb3J0cyB0aGF0IGEgY2hhbm5lbCBpcyBjbG9zaW5nLlxuICBpID0gdGhpcy5jb250cm9sRmxvd3NbcG9ydC5pZF07XG4gIGlmIChpKSB7XG4gICAgdGhpcy5odWIub25NZXNzYWdlKGksIHtcbiAgICAgIHR5cGU6ICdjbG9zZScsXG4gICAgICBjaGFubmVsOiBuYW1lXG4gICAgfSk7XG4gIH1cbiAgaSA9IHRoaXMuY29udHJvbEZsb3dzW3JldmVyc2UuaWRdO1xuICBpZiAoaSkge1xuICAgIHRoaXMuaHViLm9uTWVzc2FnZShpLCB7XG4gICAgICB0eXBlOiAnY2xvc2UnLFxuICAgICAgY2hhbm5lbDogcmZsb3dcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFVuaW5zdGFsbCB0aGUgY2hhbm5lbC5cbiAgdGhpcy5odWIudW5pbnN0YWxsKHBvcnQsIG5hbWUpO1xuICB0aGlzLmh1Yi51bmluc3RhbGwocmV2ZXJzZSwgcmZsb3cpO1xuXG4gIGRlbGV0ZSB0aGlzLnJldmVyc2VGbG93TWFwW25hbWVdO1xuICBkZWxldGUgdGhpcy5yZXZlcnNlRmxvd01hcFtyZmxvd107XG4gIHRoaXMuZm9yZ2V0RmxvdyhyZXZlcnNlLmlkLCByZmxvdyk7XG4gIHRoaXMuZm9yZ2V0Rmxvdyhwb3J0LmlkLCBuYW1lKTtcbn07XG5cbi8qKlxuICogRm9yZ2V0IHRoZSBmbG93IGZyb20gaWQgd2l0aCBhIGdpdmVuIG5hbWUuXG4gKiBAbWV0aG9kIGZvcmdldEZsb3dcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIHBvcnQgSUQgb2YgdGhlIHNvdXJjZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBmbG93IG5hbWUuXG4gKi9cbk1hbmFnZXIucHJvdG90eXBlLmZvcmdldEZsb3cgPSBmdW5jdGlvbiAoaWQsIG5hbWUpIHtcbiAgdmFyIGk7XG4gIGlmICh0aGlzLmRhdGFGbG93c1tpZF0pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5kYXRhRmxvd3NbaWRdLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBpZiAodGhpcy5kYXRhRmxvd3NbaWRdW2ldID09PSBuYW1lKSB7XG4gICAgICAgIHRoaXMuZGF0YUZsb3dzW2lkXS5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBHZXQgdGhlIGNvcmUgZnJlZWRvbS5qcyBBUEkgYWN0aXZlIG9uIHRoZSBjdXJyZW50IGh1Yi5cbiAqIEBtZXRob2QgZ2V0Q29yZVxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIENhbGxiYWNrIHRvIGZpcmUgd2l0aCB0aGUgY29yZSBvYmplY3QuXG4gKi9cbk1hbmFnZXIucHJvdG90eXBlLmdldENvcmUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgaWYgKHRoaXMuY29yZSkge1xuICAgIGNiKHRoaXMuY29yZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5hcGkuZ2V0Q29yZSgnY29yZScsIHRoaXMpLnRoZW4oZnVuY3Rpb24gKGNvcmUpIHtcbiAgICAgIHRoaXMuY29yZSA9IGNvcmU7XG4gICAgICBjYih0aGlzLmNvcmUpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFuYWdlcjtcbiIsIi8qanNsaW50IGluZGVudDoyLG5vZGU6dHJ1ZSxzbG9wcHk6dHJ1ZSAqL1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBQcm92aWRlciA9IHJlcXVpcmUoJy4vcHJvdmlkZXInKTtcblxuLyoqXG4gKiBUaGUgZXh0ZXJuYWwgUG9ydCBmYWNlIG9mIGEgbW9kdWxlIG9uIGEgaHViLlxuICogQGNsYXNzIE1vZHVsZVxuICogQGV4dGVuZHMgUG9ydFxuICogQHBhcmFtIHtTdHJpbmd9IG1hbmlmZXN0VVJMIFRoZSBtYW5pZmVzdCB0aGlzIG1vZHVsZSBsb2Fkcy5cbiAqIEBwYXJhbSB7U3RyaW5nW119IGNyZWF0b3IgVGhlIGxpbmVhZ2Ugb2YgY3JlYXRpb24gZm9yIHRoaXMgbW9kdWxlLlxuICogQHBhcmFtIHtQb2xpY3l9IFBvbGljeSBUaGUgcG9saWN5IGxvYWRlciBmb3IgZGVwZW5kZW5jaWVzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBNb2R1bGUgPSBmdW5jdGlvbiAobWFuaWZlc3RVUkwsIG1hbmlmZXN0LCBjcmVhdG9yLCBwb2xpY3kpIHtcbiAgdGhpcy5hcGkgPSBwb2xpY3kuYXBpO1xuICB0aGlzLnBvbGljeSA9IHBvbGljeTtcbiAgdGhpcy5yZXNvdXJjZSA9IHBvbGljeS5yZXNvdXJjZTtcbiAgdGhpcy5kZWJ1ZyA9IHBvbGljeS5kZWJ1ZztcblxuICB0aGlzLmNvbmZpZyA9IHt9O1xuXG4gIHRoaXMuaWQgPSBtYW5pZmVzdFVSTCArIE1hdGgucmFuZG9tKCk7XG4gIHRoaXMubWFuaWZlc3RJZCA9IG1hbmlmZXN0VVJMO1xuICB0aGlzLm1hbmlmZXN0ID0gbWFuaWZlc3Q7XG4gIHRoaXMubGluZWFnZSA9IFt0aGlzLm1hbmlmZXN0SWRdLmNvbmNhdChjcmVhdG9yKTtcblxuICB0aGlzLnF1aWV0ID0gdGhpcy5tYW5pZmVzdC5xdWlldCB8fCBmYWxzZTtcblxuICB0aGlzLmV4dGVybmFsUG9ydE1hcCA9IHt9O1xuICB0aGlzLmludGVybmFsUG9ydE1hcCA9IHt9O1xuICB0aGlzLmRlcGVuZGFudENoYW5uZWxzID0gW107XG4gIHRoaXMuc3RhcnRlZCA9IGZhbHNlO1xuXG4gIHV0aWwuaGFuZGxlRXZlbnRzKHRoaXMpO1xufTtcblxuLyoqXG4gKiBSZWNlaXZlIGEgbWVzc2FnZSBmb3IgdGhlIE1vZHVsZS5cbiAqIEBtZXRob2Qgb25NZXNzYWdlXG4gKiBAcGFyYW0ge1N0cmluZ30gZmxvdyBUaGUgb3JpZ2luIG9mIHRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgcmVjZWl2ZWQuXG4gKi9cbk1vZHVsZS5wcm90b3R5cGUub25NZXNzYWdlID0gZnVuY3Rpb24gKGZsb3csIG1lc3NhZ2UpIHtcbiAgaWYgKGZsb3cgPT09ICdjb250cm9sJykge1xuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdzZXR1cCcpIHtcbiAgICAgIHRoaXMuY29udHJvbENoYW5uZWwgPSBtZXNzYWdlLmNoYW5uZWw7XG4gICAgICB1dGlsLm1peGluKHRoaXMuY29uZmlnLCBtZXNzYWdlLmNvbmZpZyk7XG4gICAgICB0aGlzLmVtaXQodGhpcy5jb250cm9sQ2hhbm5lbCwge1xuICAgICAgICB0eXBlOiAnQ29yZSBQcm92aWRlcicsXG4gICAgICAgIHJlcXVlc3Q6ICdjb3JlJ1xuICAgICAgfSk7XG4gICAgICB0aGlzLnN0YXJ0KCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjcmVhdGVMaW5rJyAmJiBtZXNzYWdlLmNoYW5uZWwpIHtcbiAgICAgIHRoaXMuZGVidWcuZGVidWcodGhpcyArICdnb3QgY3JlYXRlIGxpbmsgZm9yICcgKyBtZXNzYWdlLm5hbWUpO1xuICAgICAgdGhpcy5leHRlcm5hbFBvcnRNYXBbbWVzc2FnZS5uYW1lXSA9IG1lc3NhZ2UuY2hhbm5lbDtcbiAgICAgIGlmICh0aGlzLmludGVybmFsUG9ydE1hcFttZXNzYWdlLm5hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5pbnRlcm5hbFBvcnRNYXBbbWVzc2FnZS5uYW1lXSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIG1zZyA9IHtcbiAgICAgICAgdHlwZTogJ2RlZmF1bHQgY2hhbm5lbCBhbm5vdW5jZW1lbnQnLFxuICAgICAgICBjaGFubmVsOiBtZXNzYWdlLnJldmVyc2VcbiAgICAgIH07XG4gICAgICBpZiAodGhpcy5tYW5pZmVzdC5kZXBlbmRlbmNpZXMgJiZcbiAgICAgICAgICB0aGlzLm1hbmlmZXN0LmRlcGVuZGVuY2llc1ttZXNzYWdlLm5hbWVdKSB7XG4gICAgICAgIG1zZy5hcGkgPSB0aGlzLm1hbmlmZXN0LmRlcGVuZGVuY2llc1ttZXNzYWdlLm5hbWVdLmFwaTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZW1pdChtZXNzYWdlLmNoYW5uZWwsIG1zZyk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLmNvcmUpIHtcbiAgICAgIHRoaXMuY29yZSA9IG5ldyBtZXNzYWdlLmNvcmUoKTtcbiAgICAgIHRoaXMuZW1pdCgnY29yZScsIG1lc3NhZ2UuY29yZSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjbG9zZScpIHtcbiAgICAgIC8vIENsb3NpbmcgY2hhbm5lbC5cbiAgICAgIGlmIChtZXNzYWdlLmNoYW5uZWwgPT09ICdjb250cm9sJykge1xuICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVyZWdpc3RlckZsb3cobWVzc2FnZS5jaGFubmVsLCBmYWxzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UoZmxvdywgbWVzc2FnZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICgodGhpcy5leHRlcm5hbFBvcnRNYXBbZmxvd10gPT09IGZhbHNlIHx8XG4gICAgICAgICF0aGlzLmV4dGVybmFsUG9ydE1hcFtmbG93XSkgJiYgbWVzc2FnZS5jaGFubmVsKSB7XG4gICAgICB0aGlzLmRlYnVnLmRlYnVnKHRoaXMgKyAnaGFuZGxpbmcgY2hhbm5lbCBhbm5vdW5jZW1lbnQgZm9yICcgKyBmbG93KTtcbiAgICAgIHRoaXMuZXh0ZXJuYWxQb3J0TWFwW2Zsb3ddID0gbWVzc2FnZS5jaGFubmVsO1xuICAgICAgaWYgKHRoaXMuaW50ZXJuYWxQb3J0TWFwW2Zsb3ddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5pbnRlcm5hbFBvcnRNYXBbZmxvd10gPSBmYWxzZTtcblxuICAgICAgICAvLyBOZXcgaW5jb21pbmcgY29ubmVjdGlvbiBhdHRlbXB0cyBzaG91bGQgZ2V0IHJvdXRlZCB0byBtb2RJbnRlcm5hbC5cbiAgICAgICAgaWYgKHRoaXMubWFuaWZlc3QucHJvdmlkZXMgJiYgdGhpcy5tb2RJbnRlcm5hbCkge1xuICAgICAgICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UodGhpcy5tb2RJbnRlcm5hbCwge1xuICAgICAgICAgICAgdHlwZTogJ0Nvbm5lY3Rpb24nLFxuICAgICAgICAgICAgY2hhbm5lbDogZmxvdyxcbiAgICAgICAgICAgIGFwaTogbWVzc2FnZS5hcGlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm1hbmlmZXN0LnByb3ZpZGVzKSB7XG4gICAgICAgICAgdGhpcy5vbmNlKCdtb2RJbnRlcm5hbCcsIGZ1bmN0aW9uIChmbG93LCBhcGkpIHtcbiAgICAgICAgICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UodGhpcy5tb2RJbnRlcm5hbCwge1xuICAgICAgICAgICAgICB0eXBlOiAnQ29ubmVjdGlvbicsXG4gICAgICAgICAgICAgIGNoYW5uZWw6IGZsb3csXG4gICAgICAgICAgICAgIGFwaTogYXBpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9LmJpbmQodGhpcywgZmxvdywgbWVzc2FnZS5hcGkpKTtcbiAgICAgICAgLy8gRmlyc3QgY29ubmVjdGlvbiByZXRhaW5zIGxlZ2FjeSBtYXBwaW5nIGFzICdkZWZhdWx0Jy5cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5leHRlcm5hbFBvcnRNYXBbJ2RlZmF1bHQnXSAmJiBtZXNzYWdlLmNoYW5uZWwpIHtcbiAgICAgICAgICB0aGlzLmV4dGVybmFsUG9ydE1hcFsnZGVmYXVsdCddID0gbWVzc2FnZS5jaGFubmVsO1xuICAgICAgICAgIHRoaXMub25jZSgnaW50ZXJuYWxDaGFubmVsUmVhZHknLCBmdW5jdGlvbiAoZmxvdykge1xuICAgICAgICAgICAgdGhpcy5pbnRlcm5hbFBvcnRNYXBbZmxvd10gPSB0aGlzLmludGVybmFsUG9ydE1hcFsnZGVmYXVsdCddO1xuICAgICAgICAgIH0uYmluZCh0aGlzLCBmbG93KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMub25jZSgnc3RhcnQnLCB0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMsIGZsb3csIG1lc3NhZ2UpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuaW50ZXJuYWxQb3J0TWFwW2Zsb3ddID09PSBmYWxzZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ3dhaXRpbmcgb24gaW50ZXJuYWwgY2hhbm5lbCBmb3IgbXNnJyk7XG4gICAgICAgIHRoaXMub25jZSgnaW50ZXJuYWxDaGFubmVsUmVhZHknLCB0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMsIGZsb3csIG1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaW50ZXJuYWxQb3J0TWFwW2Zsb3ddKSB7XG4gICAgICAgIHRoaXMuZGVidWcuZXJyb3IoJ1VuZXhwZWN0ZWQgbWVzc2FnZSBmcm9tICcgKyBmbG93KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wb3J0Lm9uTWVzc2FnZSh0aGlzLmludGVybmFsUG9ydE1hcFtmbG93XSwgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIENsZWFuIHVwIGFmdGVyIGEgZmxvdyB3aGljaCBpcyBubyBsb25nZXIgdXNlZCAvIG5lZWRlZC5cbiAqIEBtZXRob2QgZGVyZWdpc3RlckZMb3dcbiAqIEBwYXJhbSB7U3RyaW5nfSBmbG93IFRoZSBmbG93IHRvIHJlbW92ZSBtYXBwaW5ncyBmb3IuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGludGVybmFsIElmIHRoZSBmbG93IG5hbWUgaXMgdGhlIGludGVybmFsIGlkZW50aWZpZXIuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gV2hldGhlciB0aGUgZmxvdyB3YXMgc3VjY2Vzc2Z1bGx5IGRlcmVnaXN0ZXJlZC5cbiAqIEBwcml2YXRlXG4gKi9cbk1vZHVsZS5wcm90b3R5cGUuZGVyZWdpc3RlckZsb3cgPSBmdW5jdGlvbiAoZmxvdywgaW50ZXJuYWwpIHtcbiAgdmFyIGtleSxcbiAgICBtYXAgPSBpbnRlcm5hbCA/IHRoaXMuaW50ZXJuYWxQb3J0TWFwIDogdGhpcy5leHRlcm5hbFBvcnRNYXA7XG4gIC8vIFRPRE86IHRoaXMgaXMgaW5lZmZpY2llbnQsIGJ1dCBzZWVtcyBsZXNzIGNvbmZ1c2luZyB0aGFuIGEgM3JkXG4gIC8vIHJldmVyc2UgbG9va3VwIG1hcC5cbiAgZm9yIChrZXkgaW4gbWFwKSB7XG4gICAgaWYgKG1hcFtrZXldID09PSBmbG93KSB7XG4gICAgICBpZiAoaW50ZXJuYWwpIHtcbiAgICAgICAgdGhpcy5lbWl0KHRoaXMuY29udHJvbENoYW5uZWwsIHtcbiAgICAgICAgICB0eXBlOiAnQ2hhbm5lbCBUZWFyZG93bicsXG4gICAgICAgICAgcmVxdWVzdDogJ3VubGluaycsXG4gICAgICAgICAgdG86IHRoaXMuZXh0ZXJuYWxQb3J0TWFwW2tleV1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBvcnQub25NZXNzYWdlKCdjb250cm9sJywge1xuICAgICAgICAgIHR5cGU6ICdjbG9zZScsXG4gICAgICAgICAgY2hhbm5lbDogdGhpcy5pbnRlcm5hbFBvcnRNYXBba2V5XVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLmV4dGVybmFsUG9ydE1hcFtrZXldO1xuICAgICAgZGVsZXRlIHRoaXMuaW50ZXJuYWxQb3J0TWFwW2tleV07XG5cbiAgICAgIC8vIFdoZW4gdGhlcmUgYXJlIHN0aWxsIG5vbi1kZXBlbmRhbnQgY2hhbm5lbHMsIGtlZXAgcnVubmluZ1xuICAgICAgZm9yIChrZXkgaW4gdGhpcy5leHRlcm5hbFBvcnRNYXApIHtcbiAgICAgICAgaWYgKHRoaXMuZXh0ZXJuYWxQb3J0TWFwLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodGhpcy5kZXBlbmRhbnRDaGFubmVscy5pbmRleE9mKGtleSkgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIE90aGVyd2lzZSBzaHV0IGRvd24gdGhlIG1vZHVsZS5cbiAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogQXR0ZW1wdCB0byBzdGFydCB0aGUgbW9kdWxlIG9uY2UgdGhlIHJlbW90ZSBmcmVlZG9tIGNvbnRleHRcbiAqIGV4aXN0cy5cbiAqIEBtZXRob2Qgc3RhcnRcbiAqIEBwcml2YXRlXG4gKi9cbk1vZHVsZS5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBQb3J0O1xuICBpZiAodGhpcy5zdGFydGVkIHx8IHRoaXMucG9ydCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodGhpcy5jb250cm9sQ2hhbm5lbCkge1xuICAgIHRoaXMubG9hZExpbmtzKCk7XG4gICAgUG9ydCA9IHRoaXMuY29uZmlnLnBvcnRUeXBlO1xuICAgIHRoaXMucG9ydCA9IG5ldyBQb3J0KHRoaXMubWFuaWZlc3QubmFtZSwgdGhpcy5yZXNvdXJjZSk7XG4gICAgLy8gTGlzdGVuIHRvIGFsbCBwb3J0IG1lc3NhZ2VzLlxuICAgIHRoaXMucG9ydC5vbih0aGlzLmVtaXRNZXNzYWdlLmJpbmQodGhpcykpO1xuICAgIHRoaXMucG9ydC5hZGRFcnJvckhhbmRsZXIoZnVuY3Rpb24gKGVycikge1xuICAgICAgdGhpcy5kZWJ1Zy53YXJuKCdNb2R1bGUgRmFpbGVkJywgZXJyKTtcbiAgICAgIHRoaXMuc3RvcCgpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgLy8gVGVsbCB0aGUgbG9jYWwgcG9ydCB0byBhc2sgdXMgZm9yIGhlbHAuXG4gICAgdGhpcy5wb3J0Lm9uTWVzc2FnZSgnY29udHJvbCcsIHtcbiAgICAgIGNoYW5uZWw6ICdjb250cm9sJyxcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWdcbiAgICB9KTtcblxuICAgIC8vIFRlbGwgdGhlIHJlbW90ZSBsb2NhdGlvbiB0byBkZWxlZ2F0ZSBkZWJ1Z2dpbmcuXG4gICAgdGhpcy5wb3J0Lm9uTWVzc2FnZSgnY29udHJvbCcsIHtcbiAgICAgIHR5cGU6ICdSZWRpcmVjdCcsXG4gICAgICByZXF1ZXN0OiAnZGVsZWdhdGUnLFxuICAgICAgZmxvdzogJ2RlYnVnJ1xuICAgIH0pO1xuICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UoJ2NvbnRyb2wnLCB7XG4gICAgICB0eXBlOiAnUmVkaXJlY3QnLFxuICAgICAgcmVxdWVzdDogJ2RlbGVnYXRlJyxcbiAgICAgIGZsb3c6ICdjb3JlJ1xuICAgIH0pO1xuICAgIFxuICAgIC8vIFRlbGwgdGhlIGNvbnRhaW5lciB0byBpbnN0YW50aWF0ZSB0aGUgY291bnRlcnBhcnQgdG8gdGhpcyBleHRlcm5hbCB2aWV3LlxuICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UoJ2NvbnRyb2wnLCB7XG4gICAgICB0eXBlOiAnRW52aXJvbm1lbnQgQ29uZmlndXJhdGlvbicsXG4gICAgICByZXF1ZXN0OiAnZW52aXJvbm1lbnQnLFxuICAgICAgbmFtZTogJ01vZEludGVybmFsJ1xuICAgIH0pO1xuICB9XG59O1xuXG4vKipcbiAqIFN0b3AgdGhlIG1vZHVsZSB3aGVuIGl0IGlzIG5vIGxvbmdlciBuZWVkZWQsIGFuZCB0ZWFyLWRvd24gc3RhdGUuXG4gKiBAbWV0aG9kIHN0b3BcbiAqIEBwcml2YXRlXG4gKi9cbk1vZHVsZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLnN0YXJ0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5lbWl0KCdjbG9zZScpO1xuICBpZiAodGhpcy5wb3J0KSB7XG4gICAgdGhpcy5wb3J0Lm9mZigpO1xuICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UoJ2NvbnRyb2wnLCB7XG4gICAgICB0eXBlOiAnY2xvc2UnLFxuICAgICAgY2hhbm5lbDogJ2NvbnRyb2wnXG4gICAgfSk7XG4gICAgdGhpcy5wb3J0LnN0b3AoKTtcbiAgICBkZWxldGUgdGhpcy5wb3J0O1xuICB9XG4gIHRoaXMuc3RhcnRlZCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBUZXh0dWFsIERlc2NyaXB0aW9uIG9mIHRoZSBQb3J0XG4gKiBAbWV0aG9kIHRvU3RyaW5nXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBkZXNjcmlwdGlvbiBvZiB0aGlzIFBvcnQuXG4gKi9cbk1vZHVsZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBcIltNb2R1bGUgXCIgKyB0aGlzLm1hbmlmZXN0Lm5hbWUgKyBcIl1cIjtcbn07XG5cbi8qKlxuICogSW50ZXJjZXB0IG1lc3NhZ2VzIGFzIHRoZXkgYXJyaXZlIGZyb20gdGhlIG1vZHVsZSxcbiAqIG1hcHBpbmcgdGhlbSBiZXR3ZWVuIGludGVybmFsIGFuZCBleHRlcm5hbCBmbG93IG5hbWVzLlxuICogQG1ldGhvZCBlbWl0TWVzc2FnZVxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIGRlc3RpbmF0aW9uIHRoZSBtb2R1bGUgd2FudHMgdG8gc2VuZCB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIHNlbmQuXG4gKiBAcHJpdmF0ZVxuICovXG5Nb2R1bGUucHJvdG90eXBlLmVtaXRNZXNzYWdlID0gZnVuY3Rpb24gKG5hbWUsIG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMuaW50ZXJuYWxQb3J0TWFwW25hbWVdID09PSBmYWxzZSAmJiBtZXNzYWdlLmNoYW5uZWwpIHtcbiAgICB0aGlzLmludGVybmFsUG9ydE1hcFtuYW1lXSA9IG1lc3NhZ2UuY2hhbm5lbDtcbiAgICB0aGlzLmVtaXQoJ2ludGVybmFsQ2hhbm5lbFJlYWR5Jyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIFRlcm1pbmF0ZSBkZWJ1ZyByZWRpcmVjdGlvbiByZXF1ZXN0ZWQgaW4gc3RhcnQoKS5cbiAgaWYgKG5hbWUgPT09ICdjb250cm9sJykge1xuICAgIGlmIChtZXNzYWdlLmZsb3cgPT09ICdkZWJ1ZycgJiYgbWVzc2FnZS5tZXNzYWdlKSB7XG4gICAgICB0aGlzLmRlYnVnLmZvcm1hdChtZXNzYWdlLm1lc3NhZ2Uuc2V2ZXJpdHksXG4gICAgICAgICAgbWVzc2FnZS5tZXNzYWdlLnNvdXJjZSB8fCB0aGlzLnRvU3RyaW5nKCksXG4gICAgICAgICAgbWVzc2FnZS5tZXNzYWdlLm1zZyk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLmZsb3cgPT09ICdjb3JlJyAmJiBtZXNzYWdlLm1lc3NhZ2UpIHtcbiAgICAgIGlmICghdGhpcy5jb3JlKSB7XG4gICAgICAgIHRoaXMub25jZSgnY29yZScsIHRoaXMuZW1pdE1lc3NhZ2UuYmluZCh0aGlzLCBuYW1lLCBtZXNzYWdlKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChtZXNzYWdlLm1lc3NhZ2UudHlwZSA9PT0gJ3JlZ2lzdGVyJykge1xuICAgICAgICBtZXNzYWdlLm1lc3NhZ2UucmVwbHkgPSB0aGlzLnBvcnQub25NZXNzYWdlLmJpbmQodGhpcy5wb3J0LCAnY29udHJvbCcpO1xuICAgICAgICB0aGlzLmV4dGVybmFsUG9ydE1hcFttZXNzYWdlLm1lc3NhZ2UuaWRdID0gZmFsc2U7XG4gICAgICB9XG4gICAgICB0aGlzLmNvcmUub25NZXNzYWdlKHRoaXMsIG1lc3NhZ2UubWVzc2FnZSk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLm5hbWUgPT09ICdNb2RJbnRlcm5hbCcgJiYgIXRoaXMubW9kSW50ZXJuYWwpIHtcbiAgICAgIHRoaXMubW9kSW50ZXJuYWwgPSBtZXNzYWdlLmNoYW5uZWw7XG4gICAgICB0aGlzLnBvcnQub25NZXNzYWdlKHRoaXMubW9kSW50ZXJuYWwsIHtcbiAgICAgICAgdHlwZTogJ0luaXRpYWxpemF0aW9uJyxcbiAgICAgICAgaWQ6IHRoaXMubWFuaWZlc3RJZCxcbiAgICAgICAgYXBwSWQ6IHRoaXMuaWQsXG4gICAgICAgIG1hbmlmZXN0OiB0aGlzLm1hbmlmZXN0LFxuICAgICAgICBsaW5lYWdlOiB0aGlzLmxpbmVhZ2UsXG4gICAgICAgIGNoYW5uZWw6IG1lc3NhZ2UucmV2ZXJzZVxuICAgICAgfSk7XG4gICAgICB0aGlzLmVtaXQoJ21vZEludGVybmFsJyk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjcmVhdGVMaW5rJykge1xuICAgICAgdGhpcy5pbnRlcm5hbFBvcnRNYXBbbWVzc2FnZS5uYW1lXSA9IG1lc3NhZ2UuY2hhbm5lbDtcbiAgICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UobWVzc2FnZS5jaGFubmVsLCB7XG4gICAgICAgIHR5cGU6ICdjaGFubmVsIGFubm91bmNlbWVudCcsXG4gICAgICAgIGNoYW5uZWw6IG1lc3NhZ2UucmV2ZXJzZVxuICAgICAgfSk7XG4gICAgICB0aGlzLmVtaXQoJ2ludGVybmFsQ2hhbm5lbFJlYWR5Jyk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjbG9zZScpIHtcbiAgICAgIHRoaXMuZGVyZWdpc3RlckZsb3cobWVzc2FnZS5jaGFubmVsLCB0cnVlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAobmFtZSA9PT0gJ01vZEludGVybmFsJyAmJiBtZXNzYWdlLnR5cGUgPT09ICdyZWFkeScgJiYgIXRoaXMuc3RhcnRlZCkge1xuICAgIHRoaXMuc3RhcnRlZCA9IHRydWU7XG4gICAgdGhpcy5lbWl0KCdzdGFydCcpO1xuICB9IGVsc2UgaWYgKG5hbWUgPT09ICdNb2RJbnRlcm5hbCcgJiYgbWVzc2FnZS50eXBlID09PSAncmVzb2x2ZScpIHtcbiAgICB0aGlzLnJlc291cmNlLmdldCh0aGlzLm1hbmlmZXN0SWQsIG1lc3NhZ2UuZGF0YSkudGhlbihmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgIHRoaXMucG9ydC5vbk1lc3NhZ2UodGhpcy5tb2RJbnRlcm5hbCwge1xuICAgICAgICB0eXBlOiAncmVzb2x2ZSByZXNwb25zZScsXG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgZGF0YTogZGF0YVxuICAgICAgfSk7XG4gICAgfS5iaW5kKHRoaXMsIG1lc3NhZ2UuaWQpLCBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmRlYnVnLndhcm4oJ0Vycm9yIFJlc29sdmluZyBVUkwgZm9yIE1vZHVsZS4nKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZW1pdCh0aGlzLmV4dGVybmFsUG9ydE1hcFtuYW1lXSwgbWVzc2FnZSk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBSZXF1ZXN0IHRoZSBleHRlcm5hbCByb3V0ZXMgdXNlZCBieSB0aGlzIG1vZHVsZS5cbiAqIEBtZXRob2QgbG9hZExpbmtzXG4gKiBAcHJpdmF0ZVxuICovXG5Nb2R1bGUucHJvdG90eXBlLmxvYWRMaW5rcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGksIGNoYW5uZWxzID0gWydkZWZhdWx0J10sIG5hbWUsIGRlcCxcbiAgICBmaW5pc2hMaW5rID0gZnVuY3Rpb24gKGRlcCwgbmFtZSwgcHJvdmlkZXIpIHtcbiAgICAgIHZhciBzdHlsZSA9IHRoaXMuYXBpLmdldEludGVyZmFjZVN0eWxlKG5hbWUpO1xuICAgICAgZGVwLmdldEludGVyZmFjZSgpW3N0eWxlXShwcm92aWRlcik7XG4gICAgfTtcbiAgaWYgKHRoaXMubWFuaWZlc3QucGVybWlzc2lvbnMpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5tYW5pZmVzdC5wZXJtaXNzaW9ucy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgbmFtZSA9IHRoaXMubWFuaWZlc3QucGVybWlzc2lvbnNbaV07XG4gICAgICBpZiAoY2hhbm5lbHMuaW5kZXhPZihuYW1lKSA8IDAgJiYgbmFtZS5pbmRleE9mKCdjb3JlLicpID09PSAwKSB7XG4gICAgICAgIGNoYW5uZWxzLnB1c2gobmFtZSk7XG4gICAgICAgIHRoaXMuZGVwZW5kYW50Q2hhbm5lbHMucHVzaChuYW1lKTtcbiAgICAgICAgZGVwID0gbmV3IFByb3ZpZGVyKHRoaXMuYXBpLmdldChuYW1lKS5kZWZpbml0aW9uLCB0aGlzLmRlYnVnKTtcbiAgICAgICAgdGhpcy5hcGkuZ2V0Q29yZShuYW1lLCB0aGlzKS50aGVuKGZpbmlzaExpbmsuYmluZCh0aGlzLCBkZXAsIG5hbWUpKTtcblxuICAgICAgICB0aGlzLmVtaXQodGhpcy5jb250cm9sQ2hhbm5lbCwge1xuICAgICAgICAgIHR5cGU6ICdDb3JlIExpbmsgdG8gJyArIG5hbWUsXG4gICAgICAgICAgcmVxdWVzdDogJ2xpbmsnLFxuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgdG86IGRlcFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHRoaXMubWFuaWZlc3QuZGVwZW5kZW5jaWVzKSB7XG4gICAgdXRpbC5lYWNoUHJvcCh0aGlzLm1hbmlmZXN0LmRlcGVuZGVuY2llcywgZnVuY3Rpb24gKGRlc2MsIG5hbWUpIHtcbiAgICAgIGlmIChjaGFubmVscy5pbmRleE9mKG5hbWUpIDwgMCkge1xuICAgICAgICBjaGFubmVscy5wdXNoKG5hbWUpO1xuICAgICAgICB0aGlzLmRlcGVuZGFudENoYW5uZWxzLnB1c2gobmFtZSk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc291cmNlLmdldCh0aGlzLm1hbmlmZXN0SWQsIGRlc2MudXJsKS50aGVuKGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgdGhpcy5wb2xpY3kuZ2V0KHRoaXMubGluZWFnZSwgdXJsKS50aGVuKGZ1bmN0aW9uIChkZXApIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUVudihuYW1lLCBkZXAubWFuaWZlc3QpO1xuICAgICAgICAgIHRoaXMuZW1pdCh0aGlzLmNvbnRyb2xDaGFubmVsLCB7XG4gICAgICAgICAgICB0eXBlOiAnTGluayB0byAnICsgbmFtZSxcbiAgICAgICAgICAgIHJlcXVlc3Q6ICdsaW5rJyxcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICBvdmVycmlkZURlc3Q6IG5hbWUgKyAnLicgKyB0aGlzLmlkLFxuICAgICAgICAgICAgdG86IGRlcFxuICAgICAgICAgIH0pO1xuICAgICAgICB9LmJpbmQodGhpcyksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICB0aGlzLmRlYnVnLndhcm4oJ2ZhaWxlZCB0byBsb2FkIGRlcDogJywgbmFtZSwgZXJyKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfVxuICAvLyBOb3RlIHRoYXQgbWVzc2FnZXMgY2FuIGJlIHN5bmNocm9ub3VzLCBzbyBzb21lIHBvcnRzIG1heSBhbHJlYWR5IGJlIGJvdW5kLlxuICBmb3IgKGkgPSAwOyBpIDwgY2hhbm5lbHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGlzLmV4dGVybmFsUG9ydE1hcFtjaGFubmVsc1tpXV0gPSB0aGlzLmV4dGVybmFsUG9ydE1hcFtjaGFubmVsc1tpXV0gfHwgZmFsc2U7XG4gICAgdGhpcy5pbnRlcm5hbFBvcnRNYXBbY2hhbm5lbHNbaV1dID0gZmFsc2U7XG4gIH1cbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBtb2R1bGUgZW52aXJvbm1lbnQgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCBhIGRlcGVuZGVudCBtYW5pZmVzdC5cbiAqIEBtZXRob2QgdXBkYXRlRW52XG4gKiBAcGFyYW0ge1N0cmluZ30gZGVwIFRoZSBkZXBlbmRlbmN5XG4gKiBAcGFyYW0ge09iamVjdH0gbWFuaWZlc3QgVGhlIG1hbmlmZXN0IG9mIHRoZSBkZXBlbmRlbmN5XG4gKi9cbk1vZHVsZS5wcm90b3R5cGUudXBkYXRlRW52ID0gZnVuY3Rpb24gKGRlcCwgbWFuaWZlc3QpIHtcbiAgaWYgKCFtYW5pZmVzdCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIXRoaXMubW9kSW50ZXJuYWwpIHtcbiAgICB0aGlzLm9uY2UoJ21vZEludGVybmFsJywgdGhpcy51cGRhdGVFbnYuYmluZCh0aGlzLCBkZXAsIG1hbmlmZXN0KSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIFxuICB2YXIgbWV0YWRhdGE7XG5cbiAgLy8gRGVjaWRlIGlmL3doYXQgb3RoZXIgcHJvcGVydGllcyBzaG91bGQgYmUgZXhwb3J0ZWQuXG4gIC8vIEtlZXAgaW4gc3luYyB3aXRoIE1vZHVsZUludGVybmFsLnVwZGF0ZUVudlxuICBtZXRhZGF0YSA9IHtcbiAgICBuYW1lOiBtYW5pZmVzdC5uYW1lLFxuICAgIGljb246IG1hbmlmZXN0Lmljb24sXG4gICAgZGVzY3JpcHRpb246IG1hbmlmZXN0LmRlc2NyaXB0aW9uLFxuICAgIGFwaTogbWFuaWZlc3QuYXBpXG4gIH07XG4gIFxuICB0aGlzLnBvcnQub25NZXNzYWdlKHRoaXMubW9kSW50ZXJuYWwsIHtcbiAgICB0eXBlOiAnbWFuaWZlc3QnLFxuICAgIG5hbWU6IGRlcCxcbiAgICBtYW5pZmVzdDogbWV0YWRhdGFcbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZHVsZTtcbiIsIi8qanNsaW50IGluZGVudDoyLCBub2RlOnRydWUsc2xvcHB5OnRydWUgKi9cbnZhciBQcm9taXNlQ29tcGF0ID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuXG52YXIgQXBpSW50ZXJmYWNlID0gcmVxdWlyZSgnLi9wcm94eS9hcGlJbnRlcmZhY2UnKTtcbnZhciBQcm92aWRlciA9IHJlcXVpcmUoJy4vcHJvdmlkZXInKTtcbnZhciBQcm94eUJpbmRlciA9IHJlcXVpcmUoJy4vcHJveHliaW5kZXInKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogVGhlIGludGVybmFsIGxvZ2ljIGZvciBtb2R1bGUgc2V0dXAsIHdoaWNoIG1ha2VzIHN1cmUgdGhlIHB1YmxpY1xuICogZmFjaW5nIGV4cG9ydHMgaGF2ZSBhcHByb3ByaWF0ZSBwcm9wZXJ0aWVzLCBhbmQgbG9hZCB1c2VyIHNjcmlwdHMuXG4gKiBAY2xhc3MgTW9kdWxlSW50ZXJuYWxcbiAqIEBleHRlbmRzIFBvcnRcbiAqIEBwYXJhbSB7UG9ydH0gbWFuYWdlciBUaGUgbWFuYWdlciBpbiB0aGlzIG1vZHVsZSB0byB1c2UgZm9yIHJvdXRpbmcgc2V0dXAuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE1vZHVsZUludGVybmFsID0gZnVuY3Rpb24gKG1hbmFnZXIpIHtcbiAgdGhpcy5jb25maWcgPSB7fTtcbiAgdGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcbiAgdGhpcy5kZWJ1ZyA9IG1hbmFnZXIuZGVidWc7XG4gIHRoaXMuYmluZGVyID0gbmV3IFByb3h5QmluZGVyKHRoaXMubWFuYWdlcik7XG4gIHRoaXMuYXBpID0gdGhpcy5tYW5hZ2VyLmFwaTtcbiAgdGhpcy5tYW5pZmVzdHMgPSB7fTtcbiAgdGhpcy5wcm92aWRlcnMgPSB7fTtcbiAgXG4gIHRoaXMuaWQgPSAnTW9kdWxlSW50ZXJuYWwnO1xuICB0aGlzLnBlbmRpbmdQb3J0cyA9IDA7XG4gIHRoaXMucmVxdWVzdHMgPSB7fTtcblxuICB1dGlsLmhhbmRsZUV2ZW50cyh0aGlzKTtcbn07XG5cbi8qKlxuICogTWVzc2FnZSBoYW5kbGVyIGZvciB0aGlzIHBvcnQuXG4gKiBUaGlzIHBvcnQgb25seSBoYW5kbGVzIHR3byBtZXNzYWdlczpcbiAqIFRoZSBmaXJzdCBpcyBpdHMgc2V0dXAgZnJvbSB0aGUgbWFuYWdlciwgd2hpY2ggaXQgdXNlcyBmb3IgY29uZmlndXJhdGlvbi5cbiAqIFRoZSBzZWNvbmQgaXMgZnJvbSB0aGUgbW9kdWxlIGNvbnRyb2xsZXIgKGZkb20ucG9ydC5Nb2R1bGUpLCB3aGljaCBwcm92aWRlc1xuICogdGhlIG1hbmlmZXN0IGluZm8gZm9yIHRoZSBtb2R1bGUuXG4gKiBAbWV0aG9kIG9uTWVzc2FnZVxuICogQHBhcmFtIHtTdHJpbmd9IGZsb3cgVGhlIGRldGluYXRpb24gb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBUaGUgbWVzc2FnZS5cbiAqL1xuTW9kdWxlSW50ZXJuYWwucHJvdG90eXBlLm9uTWVzc2FnZSA9IGZ1bmN0aW9uIChmbG93LCBtZXNzYWdlKSB7XG4gIGlmIChmbG93ID09PSAnY29udHJvbCcpIHtcbiAgICBpZiAoIXRoaXMuY29udHJvbENoYW5uZWwgJiYgbWVzc2FnZS5jaGFubmVsKSB7XG4gICAgICB0aGlzLmNvbnRyb2xDaGFubmVsID0gbWVzc2FnZS5jaGFubmVsO1xuICAgICAgdXRpbC5taXhpbih0aGlzLmNvbmZpZywgbWVzc2FnZS5jb25maWcpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChmbG93ID09PSAnZGVmYXVsdCcgJiYgIXRoaXMuYXBwSWQpIHtcbiAgICAvLyBSZWNvdmVyIHRoZSBJRCBvZiB0aGlzIG1vZHVsZTpcbiAgICB0aGlzLnBvcnQgPSB0aGlzLm1hbmFnZXIuaHViLmdldERlc3RpbmF0aW9uKG1lc3NhZ2UuY2hhbm5lbCk7XG4gICAgdGhpcy5leHRlcm5hbENoYW5uZWwgPSBtZXNzYWdlLmNoYW5uZWw7XG4gICAgdGhpcy5hcHBJZCA9IG1lc3NhZ2UuYXBwSWQ7XG4gICAgdGhpcy5saW5lYWdlID0gbWVzc2FnZS5saW5lYWdlO1xuXG4gICAgdmFyIG9iamVjdHMgPSB0aGlzLm1hcFByb3hpZXMobWVzc2FnZS5tYW5pZmVzdCk7XG5cbiAgICB0aGlzLmdlbmVyYXRlRW52KG1lc3NhZ2UubWFuaWZlc3QsIG9iamVjdHMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRoaXMubG9hZExpbmtzKG9iamVjdHMpO1xuICAgIH0uYmluZCh0aGlzKSkudGhlbih0aGlzLmxvYWRTY3JpcHRzLmJpbmQodGhpcywgbWVzc2FnZS5pZCxcbiAgICAgICAgbWVzc2FnZS5tYW5pZmVzdC5hcHAuc2NyaXB0KSk7XG4gIH0gZWxzZSBpZiAoZmxvdyA9PT0gJ2RlZmF1bHQnICYmIHRoaXMucmVxdWVzdHNbbWVzc2FnZS5pZF0pIHtcbiAgICB0aGlzLnJlcXVlc3RzW21lc3NhZ2UuaWRdKG1lc3NhZ2UuZGF0YSk7XG4gICAgZGVsZXRlIHRoaXMucmVxdWVzdHNbbWVzc2FnZS5pZF07XG4gIH0gZWxzZSBpZiAoZmxvdyA9PT0gJ2RlZmF1bHQnICYmIG1lc3NhZ2UudHlwZSA9PT0gJ21hbmlmZXN0Jykge1xuICAgIHRoaXMuZW1pdCgnbWFuaWZlc3QnLCBtZXNzYWdlKTtcbiAgICB0aGlzLnVwZGF0ZU1hbmlmZXN0KG1lc3NhZ2UubmFtZSwgbWVzc2FnZS5tYW5pZmVzdCk7XG4gIH0gZWxzZSBpZiAoZmxvdyA9PT0gJ2RlZmF1bHQnICYmIG1lc3NhZ2UudHlwZSA9PT0gJ0Nvbm5lY3Rpb24nKSB7XG4gICAgLy8gTXVsdGlwbGUgY29ubmVjdGlvbnMgY2FuIGJlIG1hZGUgdG8gdGhlIGRlZmF1bHQgcHJvdmlkZXIuXG4gICAgaWYgKG1lc3NhZ2UuYXBpICYmIHRoaXMucHJvdmlkZXJzW21lc3NhZ2UuYXBpXSkge1xuICAgICAgdGhpcy5tYW5hZ2VyLmNyZWF0ZUxpbmsodGhpcy5wcm92aWRlcnNbbWVzc2FnZS5hcGldLCBtZXNzYWdlLmNoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9ydCwgbWVzc2FnZS5jaGFubmVsKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZGVmYXVsdFBvcnQgJiZcbiAgICAgICAgICAgICAgIChtZXNzYWdlLmFwaSA9PT0gdGhpcy5kZWZhdWx0UG9ydC5hcGkgfHwgIW1lc3NhZ2UuYXBpKSkge1xuICAgICAgdGhpcy5tYW5hZ2VyLmNyZWF0ZUxpbmsodGhpcy5kZWZhdWx0UG9ydCwgbWVzc2FnZS5jaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3J0LCBtZXNzYWdlLmNoYW5uZWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9uY2UoJ3N0YXJ0JywgdGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzLCBmbG93LCBtZXNzYWdlKSk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldCBhIHRleHR1YWwgZGVzY3JpcHRpb24gb2YgdGhpcyBQb3J0LlxuICogQG1ldGhvZCB0b1N0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSBhIGRlc2NyaXB0aW9uIG9mIHRoaXMgUG9ydC5cbiAqL1xuTW9kdWxlSW50ZXJuYWwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gXCJbRW52aXJvbm1lbnQgSGVscGVyXVwiO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBleHRlcm5hbHkgdmlzaXNibGUgbmFtZXNwYWNlXG4gKiBAbWV0aG9kIGdlbmVyYXRlRW52XG4gKiBAcGFyYW0ge09iamVjdH0gbWFuaWZlc3QgVGhlIG1hbmlmZXN0IG9mIHRoZSBtb2R1bGUuXG4gKiBAcGFyYW0ge09iamVjdFtdfSBpdGVtcyBPdGhlciBpbnRlcmZhY2VzIHRvIGxvYWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIHdoZW4gdGhlIGV4dGVybmFsIG5hbWVzcGFjZSBpcyB2aXNpYmxlLlxuICogQHByaXZhdGVcbiAqL1xuTW9kdWxlSW50ZXJuYWwucHJvdG90eXBlLmdlbmVyYXRlRW52ID0gZnVuY3Rpb24gKG1hbmlmZXN0LCBpdGVtcykge1xuICByZXR1cm4gdGhpcy5iaW5kZXIuYmluZERlZmF1bHQodGhpcy5wb3J0LCB0aGlzLmFwaSwgbWFuaWZlc3QsIHRydWUpLnRoZW4oXG4gICAgZnVuY3Rpb24gKGJpbmRpbmcpIHtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIGJpbmRpbmcucG9ydC5hcGkgPSBiaW5kaW5nLmV4dGVybmFsLmFwaTtcbiAgICAgIHRoaXMuZGVmYXVsdFBvcnQgPSBiaW5kaW5nLnBvcnQ7XG4gICAgICBpZiAoYmluZGluZy5leHRlcm5hbC5hcGkpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgaWYgKGl0ZW1zW2ldLm5hbWUgPT09IGJpbmRpbmcuZXh0ZXJuYWwuYXBpICYmIGl0ZW1zW2ldLmRlZi5wcm92aWRlcykge1xuICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmNvbmZpZy5nbG9iYWwuZnJlZWRvbSA9IGJpbmRpbmcuZXh0ZXJuYWw7XG4gICAgfS5iaW5kKHRoaXMpXG4gICk7XG59O1xuXG4vKipcbiAqIEF0dGFjaCBhIHByb3h5IHRvIHRoZSBleHRlcm5hbGx5IHZpc2libGUgbmFtZXNwYWNlLlxuICogQG1ldGhvZCBhdHRhY2hcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm94eS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvdmlkZXMgSWYgdGhpcyBwcm94eSBpcyBhIHByb3ZpZGVyLlxuICogQHBhcmFtIHtQcm94eUludGVyZmFjZX0gcHJveHkgVGhlIHByb3h5IHRvIGF0dGFjaC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhcGkgVGhlIEFQSSB0aGUgcHJveHkgaW1wbGVtZW50cy5cbiAqIEBwcml2YXRlLlxuICovXG5Nb2R1bGVJbnRlcm5hbC5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gKG5hbWUsIHByb3ZpZGVzLCBwcm94eSkge1xuICB2YXIgZXhwID0gdGhpcy5jb25maWcuZ2xvYmFsLmZyZWVkb207XG4gIFxuICBpZiAocHJvdmlkZXMpIHtcbiAgICB0aGlzLnByb3ZpZGVyc1tuYW1lXSA9IHByb3h5LnBvcnQ7XG4gIH1cblxuICBpZiAoIWV4cFtuYW1lXSkge1xuICAgIGV4cFtuYW1lXSA9IHByb3h5LmV4dGVybmFsO1xuICAgIGlmICh0aGlzLm1hbmlmZXN0c1tuYW1lXSkge1xuICAgICAgZXhwW25hbWVdLm1hbmlmZXN0ID0gdGhpcy5tYW5pZmVzdHNbbmFtZV07XG4gICAgfVxuICB9XG5cbiAgdGhpcy5wZW5kaW5nUG9ydHMgLT0gMTtcbiAgaWYgKHRoaXMucGVuZGluZ1BvcnRzID09PSAwKSB7XG4gICAgdGhpcy5lbWl0KCdzdGFydCcpO1xuICB9XG59O1xuXG4vKipcbiAqIFJlcXVlc3QgYSBzZXQgb2YgcHJveHkgaW50ZXJmYWNlcywgYW5kIGJpbmQgdGhlbSB0byB0aGUgZXh0ZXJuYWxcbiAqIG5hbWVzcGFjZS5cbiAqIEBtZXRob2QgbG9hZExpbmtzXG4gKiBAcGFyYW0ge09iamVjdFtdfSBpdGVtcyBEZXNjcmlwdG9ycyBvZiB0aGUgcHJveHkgcG9ydHMgdG8gbG9hZC5cbiAqIEBwcml2YXRlXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSBmb3Igd2hlbiBhbGwgbGlua3MgYXJlIGxvYWRlZC5cbiAqL1xuLy9UT0RPKHdpbGxzY290dCk6IHByb21pc2Ugc2hvdWxkIGJlIGNoYWluZWQsIHJhdGhlciB0aGFuIGdvaW5nIHRocm91Z2ggZXZlbnRzLlxuTW9kdWxlSW50ZXJuYWwucHJvdG90eXBlLmxvYWRMaW5rcyA9IGZ1bmN0aW9uIChpdGVtcykge1xuICB2YXIgaSwgcHJveHksIHByb3ZpZGVyLCBjb3JlLFxuICAgIG1hbmlmZXN0UHJlZGljYXRlID0gZnVuY3Rpb24gKG5hbWUsIGZsb3csIG1zZykge1xuICAgICAgcmV0dXJuIGZsb3cgPT09ICdtYW5pZmVzdCcgJiYgbXNnLm5hbWUgPT09IG5hbWU7XG4gICAgfSxcbiAgICBvbk1hbmlmZXN0ID0gZnVuY3Rpb24gKGl0ZW0sIG1zZykge1xuICAgICAgdmFyIGRlZmluaXRpb24gPSB7XG4gICAgICAgIG5hbWU6IGl0ZW0uYXBpXG4gICAgICB9O1xuICAgICAgaWYgKCFtc2cubWFuaWZlc3QuYXBpIHx8ICFtc2cubWFuaWZlc3QuYXBpW2l0ZW0uYXBpXSkge1xuICAgICAgICBkZWZpbml0aW9uLmRlZmluaXRpb24gPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVmaW5pdGlvbi5kZWZpbml0aW9uID0gbXNnLm1hbmlmZXN0LmFwaVtpdGVtLmFwaV07XG4gICAgICB9XG4gICAgICB0aGlzLmJpbmRlci5nZXRFeHRlcm5hbCh0aGlzLnBvcnQsIGl0ZW0ubmFtZSwgZGVmaW5pdGlvbikudGhlbihcbiAgICAgICAgdGhpcy5hdHRhY2guYmluZCh0aGlzLCBpdGVtLm5hbWUsIGZhbHNlKVxuICAgICAgKTtcbiAgICB9LmJpbmQodGhpcyksXG4gICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlQ29tcGF0KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHRoaXMub25jZSgnc3RhcnQnLCByZXNvbHZlKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChpdGVtc1tpXS5hcGkgJiYgIWl0ZW1zW2ldLmRlZikge1xuICAgICAgaWYgKHRoaXMubWFuaWZlc3RzW2l0ZW1zW2ldLm5hbWVdKSB7XG4gICAgICAgIG9uTWFuaWZlc3QoaXRlbXNbaV0sIHtcbiAgICAgICAgICBtYW5pZmVzdDogdGhpcy5tYW5pZmVzdHNbaXRlbXNbaV0ubmFtZV1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm9uY2UobWFuaWZlc3RQcmVkaWNhdGUuYmluZCh7fSwgaXRlbXNbaV0ubmFtZSksXG4gICAgICAgICAgICAgICAgICBvbk1hbmlmZXN0LmJpbmQodGhpcywgaXRlbXNbaV0pKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5iaW5kZXIuZ2V0RXh0ZXJuYWwodGhpcy5wb3J0LCBpdGVtc1tpXS5uYW1lLCBpdGVtc1tpXS5kZWYpLnRoZW4oXG4gICAgICAgIHRoaXMuYXR0YWNoLmJpbmQodGhpcywgaXRlbXNbaV0ubmFtZSwgaXRlbXNbaV0uZGVmICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaV0uZGVmLnByb3ZpZGVzKVxuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5wZW5kaW5nUG9ydHMgKz0gMTtcbiAgfVxuICBcbiAgLy8gQWxsb3cgcmVzb2x1dGlvbiBvZiBmaWxlcyBieSBwYXJlbnQuXG4gIHRoaXMubWFuYWdlci5yZXNvdXJjZS5hZGRSZXNvbHZlcihmdW5jdGlvbiAobWFuaWZlc3QsIHVybCwgcmVzb2x2ZSkge1xuICAgIHZhciBpZCA9IHV0aWwuZ2V0SWQoKTtcbiAgICB0aGlzLnJlcXVlc3RzW2lkXSA9IHJlc29sdmU7XG4gICAgdGhpcy5lbWl0KHRoaXMuZXh0ZXJuYWxDaGFubmVsLCB7XG4gICAgICB0eXBlOiAncmVzb2x2ZScsXG4gICAgICBpZDogaWQsXG4gICAgICBkYXRhOiB1cmxcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICAvLyBBdHRhY2ggQ29yZS5cbiAgdGhpcy5wZW5kaW5nUG9ydHMgKz0gMTtcblxuICBjb3JlID0gdGhpcy5hcGkuZ2V0KCdjb3JlJykuZGVmaW5pdGlvbjtcbiAgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXIoY29yZSwgdGhpcy5kZWJ1Zyk7XG4gIHRoaXMubWFuYWdlci5nZXRDb3JlKGZ1bmN0aW9uIChDb3JlUHJvdikge1xuICAgIG5ldyBDb3JlUHJvdih0aGlzLm1hbmFnZXIpLnNldElkKHRoaXMubGluZWFnZSk7XG4gICAgcHJvdmlkZXIuZ2V0SW50ZXJmYWNlKCkucHJvdmlkZUFzeW5jaHJvbm91cyhDb3JlUHJvdik7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5lbWl0KHRoaXMuY29udHJvbENoYW5uZWwsIHtcbiAgICB0eXBlOiAnTGluayB0byBjb3JlJyxcbiAgICByZXF1ZXN0OiAnbGluaycsXG4gICAgbmFtZTogJ2NvcmUnLFxuICAgIHRvOiBwcm92aWRlclxuICB9KTtcbiAgXG4gIHRoaXMuYmluZGVyLmdldEV4dGVybmFsKHByb3ZpZGVyLCAnZGVmYXVsdCcsIHtcbiAgICBuYW1lOiAnY29yZScsXG4gICAgZGVmaW5pdGlvbjogY29yZVxuICB9KS50aGVuKFxuICAgIHRoaXMuYXR0YWNoLmJpbmQodGhpcywgJ2NvcmUnLCBmYWxzZSlcbiAgKTtcblxuXG4vLyAgcHJveHkgPSBuZXcgUHJveHkoQXBpSW50ZXJmYWNlLmJpbmQoe30sIGNvcmUpLCB0aGlzLmRlYnVnKTtcbi8vICB0aGlzLm1hbmFnZXIuY3JlYXRlTGluayhwcm92aWRlciwgJ2RlZmF1bHQnLCBwcm94eSk7XG4vLyAgdGhpcy5hdHRhY2goJ2NvcmUnLCB7cG9ydDogcHIsIGV4dGVybmFsOiBwcm94eX0pO1xuXG4gIGlmICh0aGlzLnBlbmRpbmdQb3J0cyA9PT0gMCkge1xuICAgIHRoaXMuZW1pdCgnc3RhcnQnKTtcbiAgfVxuXG4gIHJldHVybiBwcm9taXNlO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIGV4cG9ydGVkIG1hbmlmZXN0IG9mIGEgZGVwZW5kZW5jeS5cbiAqIFNldHMgaXQgaW50ZXJuYWxseSBpZiBub3QgeWV0IGV4cG9ydGVkLCBvciBhdHRhY2hlcyB0aGUgcHJvcGVydHkgaWYgaXRcbiAqIGlzIGxvYWRlZCBhZnRlciB0aGUgbW9kdWxlIGhhcyBzdGFydGVkICh3ZSBkb24ndCBkZWxheSBzdGFydCB0byByZXRyZWl2ZVxuICogdGhlIG1hbmlmZXN0IG9mIHRoZSBkZXBlbmRlbmN5LilcbiAqIEBtZXRob2QgdXBkYXRlTWFuaWZlc3RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBEZXBlbmRlbmN5XG4gKiBAcGFyYW0ge09iamVjdH0gbWFuaWZlc3QgVGhlIG1hbmlmZXN0IG9mIHRoZSBkZXBlbmRlbmN5XG4gKi9cbk1vZHVsZUludGVybmFsLnByb3RvdHlwZS51cGRhdGVNYW5pZmVzdCA9IGZ1bmN0aW9uIChuYW1lLCBtYW5pZmVzdCkge1xuICB2YXIgZXhwID0gdGhpcy5jb25maWcuZ2xvYmFsLmZyZWVkb207XG5cbiAgaWYgKGV4cCAmJiBleHBbbmFtZV0pIHtcbiAgICBleHBbbmFtZV0ubWFuaWZlc3QgPSBtYW5pZmVzdDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1hbmlmZXN0c1tuYW1lXSA9IG1hbmlmZXN0O1xuICB9XG59O1xuXG4vKipcbiAqIERldGVybWluZSB3aGljaCBwcm94eSBwb3J0cyBzaG91bGQgYmUgZXhwb3NlZCBieSB0aGlzIG1vZHVsZS5cbiAqIEBtZXRob2QgbWFwUHJveGllc1xuICogQHBhcmFtIHtPYmplY3R9IG1hbmlmZXN0IHRoZSBtb2R1bGUgSlNPTiBtYW5pZmVzdC5cbiAqIEByZXR1cm4ge09iamVjdFtdfSBwcm94eSBkZXNjcmlwdG9ycyBkZWZpbmVkIGluIHRoZSBtYW5pZmVzdC5cbiAqL1xuTW9kdWxlSW50ZXJuYWwucHJvdG90eXBlLm1hcFByb3hpZXMgPSBmdW5jdGlvbiAobWFuaWZlc3QpIHtcbiAgdmFyIHByb3hpZXMgPSBbXSwgc2VlbiA9IFsnY29yZSddLCBpLCBvYmo7XG4gIFxuICBpZiAobWFuaWZlc3QucGVybWlzc2lvbnMpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbWFuaWZlc3QucGVybWlzc2lvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIG9iaiA9IHtcbiAgICAgICAgbmFtZTogbWFuaWZlc3QucGVybWlzc2lvbnNbaV0sXG4gICAgICAgIGRlZjogdW5kZWZpbmVkXG4gICAgICB9O1xuICAgICAgb2JqLmRlZiA9IHRoaXMuYXBpLmdldChvYmoubmFtZSk7XG4gICAgICBpZiAoc2Vlbi5pbmRleE9mKG9iai5uYW1lKSA8IDAgJiYgb2JqLmRlZikge1xuICAgICAgICBwcm94aWVzLnB1c2gob2JqKTtcbiAgICAgICAgc2Vlbi5wdXNoKG9iai5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIGlmIChtYW5pZmVzdC5kZXBlbmRlbmNpZXMpIHtcbiAgICB1dGlsLmVhY2hQcm9wKG1hbmlmZXN0LmRlcGVuZGVuY2llcywgZnVuY3Rpb24gKGRlc2MsIG5hbWUpIHtcbiAgICAgIG9iaiA9IHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgYXBpOiBkZXNjLmFwaVxuICAgICAgfTtcbiAgICAgIGlmIChzZWVuLmluZGV4T2YobmFtZSkgPCAwKSB7XG4gICAgICAgIGlmIChkZXNjLmFwaSkge1xuICAgICAgICAgIG9iai5kZWYgPSB0aGlzLmFwaS5nZXQoZGVzYy5hcGkpO1xuICAgICAgICB9XG4gICAgICAgIHByb3hpZXMucHVzaChvYmopO1xuICAgICAgICBzZWVuLnB1c2gobmFtZSk7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfVxuICBcbiAgaWYgKG1hbmlmZXN0LnByb3ZpZGVzKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IG1hbmlmZXN0LnByb3ZpZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBvYmogPSB7XG4gICAgICAgIG5hbWU6IG1hbmlmZXN0LnByb3ZpZGVzW2ldLFxuICAgICAgICBkZWY6IHVuZGVmaW5lZFxuICAgICAgfTtcbiAgICAgIG9iai5kZWYgPSB0aGlzLmFwaS5nZXQob2JqLm5hbWUpO1xuICAgICAgaWYgKG9iai5kZWYpIHtcbiAgICAgICAgb2JqLmRlZi5wcm92aWRlcyA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG1hbmlmZXN0LmFwaSAmJiBtYW5pZmVzdC5hcGlbb2JqLm5hbWVdKSB7XG4gICAgICAgIG9iai5kZWYgPSB7XG4gICAgICAgICAgbmFtZTogb2JqLm5hbWUsXG4gICAgICAgICAgZGVmaW5pdGlvbjogbWFuaWZlc3QuYXBpW29iai5uYW1lXSxcbiAgICAgICAgICBwcm92aWRlczogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kZWJ1Zy53YXJuKCdNb2R1bGUgd2lsbCBub3QgcHJvdmlkZSBcIicgKyBvYmoubmFtZSArXG4gICAgICAgICAgJ1wiLCBzaW5jZSBubyBkZWNsYXJhdGlvbiBjYW4gYmUgZm91bmQuJyk7XG4gICAgICAgIC8qanNsaW50IGNvbnRpbnVlOnRydWUqL1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8qanNsaW50IGNvbnRpbnVlOmZhbHNlKi9cbiAgICAgIGlmIChzZWVuLmluZGV4T2Yob2JqLm5hbWUpIDwgMCkge1xuICAgICAgICBwcm94aWVzLnB1c2gob2JqKTtcbiAgICAgICAgc2Vlbi5wdXNoKG9iai5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJveGllcztcbn07XG5cbi8qKlxuICogTG9hZCBleHRlcm5hbCBzY3JpcHRzIGludG8gdGhpcyBuYW1lc3BhY2UuXG4gKiBAbWV0aG9kIGxvYWRTY3JpcHRzXG4gKiBAcGFyYW0ge1N0cmluZ30gZnJvbSBUaGUgVVJMIG9mIHRoaXMgbW9kdWxlcydzIG1hbmlmZXN0LlxuICogQHBhcmFtIHtTdHJpbmdbXX0gc2NyaXB0cyBUaGUgVVJMcyBvZiB0aGUgc2NyaXB0cyB0byBsb2FkLlxuICovXG5Nb2R1bGVJbnRlcm5hbC5wcm90b3R5cGUubG9hZFNjcmlwdHMgPSBmdW5jdGlvbiAoZnJvbSwgc2NyaXB0cykge1xuICAvLyBUT0RPKHNhbG9tZWdlbyk6IGFkZCBhIHRlc3QgZm9yIGZhaWx1cmUuXG4gIHZhciBpbXBvcnRlciA9IGZ1bmN0aW9uIChzY3JpcHQsIHJlc29sdmUsIHJlamVjdCkge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmNvbmZpZy5nbG9iYWwuaW1wb3J0U2NyaXB0cyhzY3JpcHQpO1xuICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZWplY3QoZSk7XG4gICAgfVxuICB9LmJpbmQodGhpcyksXG4gICAgc2NyaXB0c19jb3VudCxcbiAgICBsb2FkO1xuICBpZiAodHlwZW9mIHNjcmlwdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgc2NyaXB0c19jb3VudCA9IDE7XG4gIH0gZWxzZSB7XG4gICAgc2NyaXB0c19jb3VudCA9IHNjcmlwdHMubGVuZ3RoO1xuICB9XG5cbiAgbG9hZCA9IGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgaWYgKG5leHQgPT09IHNjcmlwdHNfY291bnQpIHtcbiAgICAgIHRoaXMuZW1pdCh0aGlzLmV4dGVybmFsQ2hhbm5lbCwge1xuICAgICAgICB0eXBlOiBcInJlYWR5XCJcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzY3JpcHQ7XG4gICAgaWYgKHR5cGVvZiBzY3JpcHRzID09PSAnc3RyaW5nJykge1xuICAgICAgc2NyaXB0ID0gc2NyaXB0cztcbiAgICB9IGVsc2Uge1xuICAgICAgc2NyaXB0ID0gc2NyaXB0c1tuZXh0XTtcbiAgICB9XG5cbiAgICB0aGlzLm1hbmFnZXIucmVzb3VyY2UuZ2V0KGZyb20sIHNjcmlwdCkudGhlbihmdW5jdGlvbiAodXJsKSB7XG4gICAgICB0aGlzLnRyeUxvYWQoaW1wb3J0ZXIsIHVybCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxvYWQobmV4dCArIDEpO1xuICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICB9LmJpbmQodGhpcyk7XG5cblxuXG4gIGlmICghdGhpcy5jb25maWcuZ2xvYmFsLmltcG9ydFNjcmlwdHMpIHtcbiAgICBpbXBvcnRlciA9IGZ1bmN0aW9uICh1cmwsIHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHNjcmlwdCA9IHRoaXMuY29uZmlnLmdsb2JhbC5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdC5zcmMgPSB1cmw7XG4gICAgICBzY3JpcHQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHJlc29sdmUsIHRydWUpO1xuICAgICAgdGhpcy5jb25maWcuZ2xvYmFsLmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICB9LmJpbmQodGhpcyk7XG4gIH1cblxuICBsb2FkKDApO1xufTtcblxuLyoqXG4gKiBBdHRlbXB0IHRvIGxvYWQgcmVzb2x2ZWQgc2NyaXB0cyBpbnRvIHRoZSBuYW1lc3BhY2UuXG4gKiBAbWV0aG9kIHRyeUxvYWRcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBpbXBvcnRlciBUaGUgYWN0dWFsIGltcG9ydCBmdW5jdGlvblxuICogQHBhcmFtIHtTdHJpbmdbXX0gdXJscyBUaGUgcmVzb3ZlZCBVUkxzIHRvIGxvYWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gY29tcGxldGlvbiBvZiBsb2FkXG4gKi9cbk1vZHVsZUludGVybmFsLnByb3RvdHlwZS50cnlMb2FkID0gZnVuY3Rpb24gKGltcG9ydGVyLCB1cmwpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlQ29tcGF0KGltcG9ydGVyLmJpbmQoe30sIHVybCkpLnRoZW4oZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB2YWw7XG4gIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgdGhpcy5kZWJ1Zy53YXJuKGUuc3RhY2spO1xuICAgIHRoaXMuZGVidWcuZXJyb3IoXCJFcnJvciBsb2FkaW5nIFwiICsgdXJsLCBlKTtcbiAgICB0aGlzLmRlYnVnLmVycm9yKFwiSWYgdGhlIHN0YWNrIHRyYWNlIGlzIG5vdCB1c2VmdWwsIHNlZSBodHRwczovL1wiICtcbiAgICAgICAgXCJnaXRodWIuY29tL2ZyZWVkb21qcy9mcmVlZG9tL3dpa2kvRGVidWdnaW5nLVNjcmlwdC1QYXJzZS1FcnJvcnNcIik7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZHVsZUludGVybmFsO1xuIiwiLypnbG9iYWxzIFhNTEh0dHBSZXF1ZXN0ICovXG4vKmpzbGludCBpbmRlbnQ6Mix3aGl0ZTp0cnVlLG5vZGU6dHJ1ZSxzbG9wcHk6dHJ1ZSAqL1xudmFyIFByb21pc2VDb21wYXQgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG52YXIgTW9kdWxlID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogVGhlIFBvbGljeSByZWdpc3RyeSBmb3IgZnJlZWRvbS5qcy4gIFVzZWQgdG8gbG9vayB1cCBtb2R1bGVzIGFuZCBwcm92aWRlXG4gKiBtaWdyYXRpb24gYW5kIGNvYWxsZXNpbmcgb2YgZXhlY3V0aW9uLlxuICogQENsYXNzIFBvbGljeVxuICogQHBhcmFtIHtNYW5hZ2VyfSBtYW5hZ2VyIFRoZSBtYW5hZ2VyIG9mIHRoZSBhY3RpdmUgcnVudGltZS5cbiAqIEBwYXJhbSB7UmVzb3VyY2V9IHJlc291cmNlIFRoZSByZXNvdXJjZSBsb2FkZXIgb2YgdGhlIGFjdGl2ZSBydW50aW1lLlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgbG9jYWwgY29uZmlnLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBQb2xpY3kgPSBmdW5jdGlvbihtYW5hZ2VyLCByZXNvdXJjZSwgY29uZmlnKSB7XG4gIHRoaXMuYXBpID0gbWFuYWdlci5hcGk7XG4gIHRoaXMuZGVidWcgPSBtYW5hZ2VyLmRlYnVnO1xuICB0aGlzLmxvY2F0aW9uID0gY29uZmlnLmxvY2F0aW9uO1xuICB0aGlzLnJlc291cmNlID0gcmVzb3VyY2U7XG5cbiAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gIHRoaXMucnVudGltZXMgPSBbXTtcbiAgdGhpcy5wb2xpY2llcyA9IFtdO1xuICB0aGlzLnBlbmRpbmcgPSB7fTtcbiAgdXRpbC5oYW5kbGVFdmVudHModGhpcyk7XG5cbiAgdGhpcy5hZGQobWFuYWdlciwgY29uZmlnLnBvbGljeSk7XG4gIHRoaXMucnVudGltZXNbMF0ubG9jYWwgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBUaGUgcG9saWN5IGEgcnVudGltZSBpcyBleHBlY3RlZCB0byBoYXZlIHVubGVzcyBpdCBzcGVjaWZpZXNcbiAqIG90aGVyd2lzZS5cbiAqIFRPRE86IGNvbnNpZGVyIG1ha2luZyBzdGF0aWNcbiAqIEBwcm9wZXJ0eSBkZWZhdWx0UG9saWN5XG4gKi9cblBvbGljeS5wcm90b3R5cGUuZGVmYXVsdFBvbGljeSA9IHtcbiAgYmFja2dyb3VuZDogZmFsc2UsIC8vIENhbiB0aGlzIHJ1bnRpbWUgcnVuICdiYWNrZ3JvdW5kJyBtb2R1bGVzP1xuICBpbnRlcmFjdGl2ZTogdHJ1ZSAvLyBJcyB0aGVyZSBhIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcnVudGltZT9cbiAgLy8gVE9ETzogcmVtYWluaW5nIHJ1bnRpbWUgcG9saWN5LlxufTtcblxuLyoqXG4gKiBUaGUgY29uc3RyYWludHMgYSBjb2RlIG1vZHVsZXMgaXMgZXhwZWN0ZWQgdG8gaGF2ZSB1bmxlc3MgaXQgc3BlY2lmaWVzXG4gKiBvdGhlcndpc2UuXG4gKiBUT0RPOiBjb25zaWRlciBtYWtpbmcgc3RhdGljXG4gKiBAcHJvcGVydHkgZGVmYXVsdENvbnN0cmFpbnRzXG4gKi9cblBvbGljeS5wcm90b3R5cGUuZGVmYXVsdENvbnN0cmFpbnRzID0ge1xuICBpc29sYXRpb246IFwiYWx3YXlzXCIsIC8vIHZhbHVlczogYWx3YXlzLCBhcHAsIG5ldmVyXG4gIHBsYWNlbWVudDogXCJsb2NhbFwiIC8vIHZhbHVlczogbG9jYWwsIHN0YWJsZSwgcmVkdW5kYW50XG4gIC8vIFRPRE86IHJlbWFpbmluZyBjb25zdHJhaW50cywgZXhwcmVzcyBwbGF0Zm9ybS1zcGVjaWZpYyBkZXBlbmRlbmNpZXMuXG59O1xuXG4vKipcbiAqIFJlc29sdmUgYSBtb2R1bGUgZnJvbSBpdHMgY2Fub25pY2FsIFVSTC5cbiAqIFJlcG9uZHMgd2l0aCB0aGUgcHJvbWlzZSBvZiBhIHBvcnQgcmVwcmVzZW50aW5nIHRoZSBtb2R1bGUsIFxuICogQG1ldGhvZCBnZXRcbiAqIEBwYXJhbSB7U3RyaW5nW119IGxpbmVhZ2UgVGhlIGxpbmVhZ2Ugb2YgdGhlIHJlcXVlc3RpbmcgbW9kdWxlLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBjYW5vbmljYWwgSUQgb2YgdGhlIG1vZHVsZSB0byBnZXQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIGZvciB0aGUgbG9jYWwgcG9ydCB0b3dhcmRzIHRoZSBtb2R1bGUuXG4gKi9cblBvbGljeS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obGluZWFnZSwgaWQpIHtcbiAgXG4gIC8vIE1ha2Ugc3VyZSB0aGF0IGEgbW9kdWxlIGlzbid0IGdldHRpbmcgbG9jYXRlZCB0d2ljZSBhdCB0aGUgc2FtZSB0aW1lLlxuICAvLyBUaGlzIGlzIHJlc29sdmVkIGJ5IGRlbGF5aW5nIGlmIGl0IHVudGlsIHdlIHNlZSBpdCBpbiBhICdtb2R1bGVBZGQnIGV2ZW50LlxuICBpZiAodGhpcy5wZW5kaW5nW2lkXSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZUNvbXBhdChmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB0aGlzLm9uY2UoJ3BsYWNlZCcsIGZ1bmN0aW9uKGwsIGkpIHtcbiAgICAgICAgdGhpcy5nZXQobCwgaSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfS5iaW5kKHRoaXMsIGxpbmVhZ2UsIGlkKSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBlbmRpbmdbaWRdID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmxvYWRNYW5pZmVzdChpZCkudGhlbihmdW5jdGlvbihtYW5pZmVzdCkge1xuICAgIHZhciBjb25zdHJhaW50cyA9IHRoaXMub3ZlcmxheSh0aGlzLmRlZmF1bHRDb25zdHJhaW50cywgbWFuaWZlc3QuY29uc3RyYWludHMpLFxuICAgICAgICBydW50aW1lID0gdGhpcy5maW5kRGVzdGluYXRpb24obGluZWFnZSwgaWQsIGNvbnN0cmFpbnRzKSxcbiAgICAgICAgcG9ydElkO1xuICAgIGlmIChydW50aW1lLmxvY2FsKSB7XG4gICAgICBwb3J0SWQgPSB0aGlzLmlzUnVubmluZyhydW50aW1lLCBpZCwgbGluZWFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludHMuaXNvbGF0aW9uICE9PSAnbmV2ZXInKTtcbiAgICAgIGlmKGNvbnN0cmFpbnRzLmlzb2xhdGlvbiAhPT0gJ2Fsd2F5cycgJiYgcG9ydElkKSB7XG4gICAgICAgIHRoaXMuZGVidWcuaW5mbygnUmV1c2VkIHBvcnQgJyArIHBvcnRJZCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnBlbmRpbmdbaWRdO1xuICAgICAgICB0aGlzLmVtaXQoJ3BsYWNlZCcpO1xuICAgICAgICByZXR1cm4gcnVudGltZS5tYW5hZ2VyLmdldFBvcnQocG9ydElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgTW9kdWxlKGlkLCBtYW5pZmVzdCwgbGluZWFnZSwgdGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE86IENyZWF0ZSBhIHBvcnQgdG8gZ28gdG8gdGhlIHJlbW90ZSBydW50aW1lLlxuICAgICAgdGhpcy5kZWJ1Zy5lcnJvcignVW5leHBlY3RlZCBsb2NhdGlvbiBzZWxlY3RlZCBmb3IgbW9kdWxlIHBsYWNlbWVudCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpLCBmdW5jdGlvbihlcnIpIHtcbiAgICB0aGlzLmRlYnVnLmVycm9yKCdQb2xpY3kgRXJyb3IgUmVzb2x2aW5nICcgKyBpZCwgZXJyKTtcbiAgICB0aHJvdyhlcnIpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBydW50aW1lIGRlc3RpbmF0aW9uIGZvciBhIG1vZHVsZSBnaXZlbiBpdHMgY29uc3RyYWludHMgYW5kIHRoZVxuICogbW9kdWxlIGNyZWF0aW5nIGl0LlxuICogQG1ldGhvZCBmaW5kRGVzdGluYXRpb25cbiAqIEBwYXJhbSB7U3RyaW5nW119IGxpbmVhZ2UgVGhlIGlkZW50aXR5IG9mIHRoZSBtb2R1bGUgY3JlYXRpbmcgdGhpcyBtb2R1bGUuXG4gKiBAcGFyYW0ge1N0cmluZ10gaWQgVGhlIGNhbm9uaWNhbCB1cmwgb2YgdGhlIG1vZHVsZVxuICogQHBhcmFtIHtPYmplY3R9IGNvbnN0cmFpbnRzIENvbnN0cmFpbnRzIGZvciB0aGUgbW9kdWxlLlxuICogQHJldHVybnMge09iamVjdH0gVGhlIGVsZW1lbnQgb2YgdGhpcy5ydW50aW1lcyB3aGVyZSB0aGUgbW9kdWxlIHNob3VsZCBydW4uXG4gKi9cblBvbGljeS5wcm90b3R5cGUuZmluZERlc3RpbmF0aW9uID0gZnVuY3Rpb24obGluZWFnZSwgaWQsIGNvbnN0cmFpbnRzKSB7XG4gIHZhciBpO1xuXG4gIC8vIFN0ZXAgMTogaWYgYW4gaW5zdGFuY2UgYWxyZWFkeSBleGlzdHMsIHRoZSBtXG4gIGlmIChjb25zdHJhaW50cy5pc29sYXRpb24gIT09ICdhbHdheXMnKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMucG9saWNpZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmICh0aGlzLmlzUnVubmluZyh0aGlzLnJ1bnRpbWVzW2ldLCBpZCwgbGluZWFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50cy5pc29sYXRpb24gIT09ICduZXZlcicpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJ1bnRpbWVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFN0ZXAgMjogaWYgdGhlIG1vZHVsZSB3YW50cyBzdGFiaWxpdHksIGl0IG1heSBuZWVkIHRvIGJlIHJlbW90ZS5cbiAgaWYgKGNvbnN0cmFpbnRzLnBsYWNlbWVudCA9PT0gJ2xvY2FsJykge1xuICAgIHJldHVybiB0aGlzLnJ1bnRpbWVzWzBdO1xuICB9IGVsc2UgaWYgKGNvbnN0cmFpbnRzLnBsYWNlbWVudCA9PT0gJ3N0YWJsZScpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5wb2xpY2llcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKHRoaXMucG9saWNpZXNbaV0uYmFja2dyb3VuZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ydW50aW1lc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTdGVwIDM6IGlmIHRoZSBtb2R1bGUgbmVlZHMgbG9uZ2V2aXR5IC8gaW50ZXJhY3Rpdml0eSwgaXQgbWF5IHdhbnQgdG8gYmUgcmVtb3RlLlxuICByZXR1cm4gdGhpcy5ydW50aW1lc1swXTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEga25vd24gcnVudGltZSBpcyBydW5uaW5nIGFuIGFwcHJvcHJpYXRlIGluc3RhbmNlIG9mIGEgbW9kdWxlLlxuICogQG1ldGhvZCBpc1J1bm5pbmdcbiAqIEBwYXJhbSB7T2JqZWN0fSBydW50aW1lIFRoZSBydW50aW1lIHRvIGNoZWNrLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBtb2R1bGUgdG8gbG9vayBmb3IuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBmcm9tIFRoZSBpZGVudGlmaWVyIG9mIHRoZSByZXF1ZXN0aW5nIG1vZHVsZS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZnVsbE1hdGNoIElmIHRoZSBtb2R1bGUgbmVlZHMgdG8gYmUgaW4gdGhlIHNhbWUgYXBwLlxuICogQHJldHVybnMge1N0cmluZ3xCb29sZWFufSBUaGUgTW9kdWxlIGlkIGlmIGl0IGlzIHJ1bm5pbmcsIG9yIGZhbHNlIGlmIG5vdC5cbiAqL1xuUG9saWN5LnByb3RvdHlwZS5pc1J1bm5pbmcgPSBmdW5jdGlvbihydW50aW1lLCBpZCwgZnJvbSwgZnVsbE1hdGNoKSB7XG4gIHZhciBpID0gMCwgaiA9IDAsIG9rYXk7XG4gIGZvciAoaSA9IDA7IGkgPCBydW50aW1lLm1vZHVsZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoZnVsbE1hdGNoICYmIHJ1bnRpbWUubW9kdWxlc1tpXS5sZW5ndGggPT09IGZyb20ubGVuZ3RoICsgMSkge1xuICAgICAgb2theSA9IHRydWU7XG4gICAgICBmb3IgKGogPSAwOyBqIDwgZnJvbS5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICBpZiAocnVudGltZS5tb2R1bGVzW2ldW2ogKyAxXS5pbmRleE9mKGZyb21bal0pICE9PSAwKSB7XG4gICAgICAgICAgb2theSA9IGZhbHNlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocnVudGltZS5tb2R1bGVzW2ldWzBdLmluZGV4T2YoaWQpICE9PSAwKSB7XG4gICAgICAgIG9rYXkgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9rYXkpIHtcbiAgICAgICAgcmV0dXJuIHJ1bnRpbWUubW9kdWxlc1tpXVswXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFmdWxsTWF0Y2ggJiYgcnVudGltZS5tb2R1bGVzW2ldWzBdLmluZGV4T2YoaWQpID09PSAwKSB7XG4gICAgICByZXR1cm4gcnVudGltZS5tb2R1bGVzW2ldWzBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEdldCBhIHByb21pc2Ugb2YgdGhlIG1hbmlmZXN0IGZvciBhIG1vZHVsZSBJRC5cbiAqIEBtZXRob2QgbG9hZE1hbmlmZXN0XG4gKiBAcGFyYW0ge1N0cmluZ30gbWFuaWZlc3QgVGhlIGNhbm9uaWNhbCBJRCBvZiB0aGUgbWFuaWZlc3RcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciB0aGUganNvbiBjb250ZW50cyBvZiB0aGUgbWFuaWZlc3QuXG4gKi9cblBvbGljeS5wcm90b3R5cGUubG9hZE1hbmlmZXN0ID0gZnVuY3Rpb24obWFuaWZlc3QpIHtcbiAgcmV0dXJuIHRoaXMucmVzb3VyY2UuZ2V0Q29udGVudHMobWFuaWZlc3QpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgIHZhciByZXNwID0ge307XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICB0aGlzLmRlYnVnLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyBtYW5pZmVzdCArIFwiOiBcIiArIGVycik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBNYW5pZmVzdCBBdmFpbGFibGVcIik7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBBZGQgYSBydW50aW1lIHRvIGtlZXAgdHJhY2sgb2YgaW4gdGhpcyBwb2xpY3kuXG4gKiBAbWV0aG9kIGFkZFxuICogQHBhcmFtIHtmZG9tLnBvcnR9IHBvcnQgVGhlIHBvcnQgdG8gdXNlIGZvciBtb2R1bGUgbGlmZXRpbWUgaW5mb1xuICogQHBhcmFtIHtPYmplY3R9IHBvbGljeSBUaGUgcG9saWN5IG9mIHRoZSBydW50aW1lLlxuICovXG5Qb2xpY3kucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHBvcnQsIHBvbGljeSkge1xuICB2YXIgcnVudGltZSA9IHtcbiAgICBtYW5hZ2VyOiBwb3J0LFxuICAgIG1vZHVsZXM6IFtdXG4gIH07XG4gIHRoaXMucnVudGltZXMucHVzaChydW50aW1lKTtcbiAgdGhpcy5wb2xpY2llcy5wdXNoKHRoaXMub3ZlcmxheSh0aGlzLmRlZmF1bHRQb2xpY3ksIHBvbGljeSkpO1xuXG4gIHBvcnQub24oJ21vZHVsZUFkZCcsIGZ1bmN0aW9uKHJ1bnRpbWUsIGluZm8pIHtcbiAgICB2YXIgbGluZWFnZSA9IFtdO1xuICAgIGxpbmVhZ2UgPSBsaW5lYWdlLmNvbmNhdChpbmZvLmxpbmVhZ2UpO1xuICAgIGxpbmVhZ2VbMF0gPSBpbmZvLmlkO1xuICAgIHJ1bnRpbWUubW9kdWxlcy5wdXNoKGxpbmVhZ2UpO1xuICAgIGlmICh0aGlzLnBlbmRpbmdbaW5mby5saW5lYWdlWzBdXSkge1xuICAgICAgZGVsZXRlIHRoaXMucGVuZGluZ1tpbmZvLmxpbmVhZ2VbMF1dO1xuICAgICAgdGhpcy5lbWl0KCdwbGFjZWQnKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzLCBydW50aW1lKSk7XG4gIHBvcnQub24oJ21vZHVsZVJlbW92ZScsIGZ1bmN0aW9uKHJ1bnRpbWUsIGluZm8pIHtcbiAgICB2YXIgbGluZWFnZSA9IFtdLCBpLCBtb2RGaW5nZXJwcmludDtcbiAgICBsaW5lYWdlID0gbGluZWFnZS5jb25jYXQoaW5mby5saW5lYWdlKTtcbiAgICBsaW5lYWdlWzBdID0gaW5mby5pZDtcbiAgICBtb2RGaW5nZXJwcmludCA9IGxpbmVhZ2UudG9TdHJpbmcoKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBydW50aW1lLm1vZHVsZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmIChydW50aW1lLm1vZHVsZXNbaV0udG9TdHJpbmcoKSA9PT0gbW9kRmluZ2VycHJpbnQpIHtcbiAgICAgICAgcnVudGltZS5tb2R1bGVzLnNwbGljZShpLCAxKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmRlYnVnLndhcm4oJ1Vua25vd24gbW9kdWxlIHRvIHJlbW92ZTogJywgaW5mby5pZCk7XG4gIH0uYmluZCh0aGlzLCBydW50aW1lKSk7XG59O1xuXG4vKipcbiAqIE92ZXJsYXkgYSBzcGVjaWZpYyBwb2xpY3kgb3IgY29uc3RyYWludCBpbnN0YW5jZSBvbiBkZWZhdWx0IHNldHRpbmdzLlxuICogVE9ETzogY29uc2lkZXIgbWFraW5nIHN0YXRpYy5cbiAqIEBtZXRob2Qgb3ZlcmxheVxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBiYXNlIFRoZSBkZWZhdWx0IG9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IG92ZXJsYXkgVGhlIHN1cGVyY2VlZGluZyBvYmplY3RcbiAqIEByZXR1cm5zIHtPYmplY3R9IEEgbmV3IG9iamVjdCB3aXRoIGJhc2UgcGFyYW1ldGVycyB3aGVuIG5vdCBzZXQgaW4gb3ZlcmxheS5cbiAqL1xuUG9saWN5LnByb3RvdHlwZS5vdmVybGF5ID0gZnVuY3Rpb24oYmFzZSwgb3ZlcmxheSkge1xuICB2YXIgcmV0ID0ge307XG5cbiAgdXRpbC5taXhpbihyZXQsIGJhc2UpO1xuICBpZiAob3ZlcmxheSkge1xuICAgIHV0aWwubWl4aW4ocmV0LCBvdmVybGF5LCB0cnVlKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQb2xpY3k7XG4iLCIvKmpzbGludCBpbmRlbnQ6Miwgbm9kZTp0cnVlLCBzbG9wcHk6dHJ1ZSwgYnJvd3Nlcjp0cnVlICovXG52YXIgQ29uc3VtZXIgPSByZXF1aXJlKCcuL2NvbnN1bWVyJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIEEgZnJlZWRvbSBwb3J0IGZvciBhIHVzZXItYWNjZXNzYWJsZSBwcm92aWRlci5cbiAqIEBjbGFzcyBQcm92aWRlclxuICogQGltcGxlbWVudHMgUG9ydFxuICogQHVzZXMgaGFuZGxlRXZlbnRzXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmIFRoZSBpbnRlcmZhY2Ugb2YgdGhlIHByb3ZpZGVyLlxuICogQHBhcmFtIHtEZWJ1Z30gZGVidWcgVGhlIGRlYnVnZ2VyIHRvIHVzZSBmb3IgbG9nZ2luZy5cbiAqIEBjb250cnVjdG9yXG4gKi9cbnZhciBQcm92aWRlciA9IGZ1bmN0aW9uIChkZWYsIGRlYnVnKSB7XG4gIHRoaXMuaWQgPSBDb25zdW1lci5uZXh0SWQoKTtcbiAgdXRpbC5oYW5kbGVFdmVudHModGhpcyk7XG4gIHRoaXMuZGVidWcgPSBkZWJ1ZztcbiAgXG4gIHRoaXMuZGVmaW5pdGlvbiA9IGRlZjtcbiAgdGhpcy5tb2RlID0gUHJvdmlkZXIubW9kZS5zeW5jaHJvbm91cztcbiAgdGhpcy5jaGFubmVscyA9IHt9O1xuICB0aGlzLmlmYWNlID0gbnVsbDtcbiAgdGhpcy5wcm92aWRlckNscyA9IG51bGw7XG4gIHRoaXMucHJvdmlkZXJJbnN0YW5jZXMgPSB7fTtcbn07XG5cbi8qKlxuICogUHJvdmlkZXIgbW9kZXMgb2Ygb3BlcmF0aW9uLlxuICogQHByb3BlcnR5IG1vZGVcbiAqIEBzdGF0aWNcbiAqIEB0eXBlIG51bWJlclxuICovXG5Qcm92aWRlci5tb2RlID0ge1xuICBzeW5jaHJvbm91czogMCxcbiAgYXN5bmNocm9ub3VzOiAxLFxuICBwcm9taXNlczogMlxufTtcblxuLyoqXG4gKiBSZWNlaXZlIGV4dGVybmFsIG1lc3NhZ2VzIGZvciB0aGUgcHJvdmlkZXIuXG4gKiBAbWV0aG9kIG9uTWVzc2FnZVxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSB0aGUgc291cmNlIGlkZW50aWZpZXIgb2YgdGhlIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBUaGUgcmVjZWl2ZWQgbWVzc2FnZS5cbiAqL1xuUHJvdmlkZXIucHJvdG90eXBlLm9uTWVzc2FnZSA9IGZ1bmN0aW9uIChzb3VyY2UsIG1lc3NhZ2UpIHtcbiAgaWYgKHNvdXJjZSA9PT0gJ2NvbnRyb2wnICYmIG1lc3NhZ2UucmV2ZXJzZSkge1xuICAgIHRoaXMuY2hhbm5lbHNbbWVzc2FnZS5uYW1lXSA9IG1lc3NhZ2UuY2hhbm5lbDtcbiAgICB0aGlzLmVtaXQobWVzc2FnZS5jaGFubmVsLCB7XG4gICAgICB0eXBlOiAnY2hhbm5lbCBhbm5vdW5jZW1lbnQnLFxuICAgICAgY2hhbm5lbDogbWVzc2FnZS5yZXZlcnNlXG4gICAgfSk7XG4gICAgdGhpcy5lbWl0KCdzdGFydCcpO1xuICB9IGVsc2UgaWYgKHNvdXJjZSA9PT0gJ2NvbnRyb2wnICYmIG1lc3NhZ2UudHlwZSA9PT0gJ3NldHVwJykge1xuICAgIHRoaXMuY29udHJvbENoYW5uZWwgPSBtZXNzYWdlLmNoYW5uZWw7XG4gIH0gZWxzZSBpZiAoc291cmNlID09PSAnY29udHJvbCcgJiYgbWVzc2FnZS50eXBlID09PSAnY2xvc2UnKSB7XG4gICAgaWYgKG1lc3NhZ2UuY2hhbm5lbCA9PT0gdGhpcy5jb250cm9sQ2hhbm5lbCkge1xuICAgICAgZGVsZXRlIHRoaXMuY29udHJvbENoYW5uZWw7XG4gICAgfVxuICAgIHRoaXMuY2xvc2UoKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoIXRoaXMuY2hhbm5lbHNbc291cmNlXSAmJiBtZXNzYWdlLmNoYW5uZWwpIHtcbiAgICAgIHRoaXMuY2hhbm5lbHNbc291cmNlXSA9IG1lc3NhZ2UuY2hhbm5lbDtcbiAgICAgIHRoaXMuZW1pdCgnc3RhcnQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLmNoYW5uZWxzW3NvdXJjZV0pIHtcbiAgICAgIHRoaXMuZGVidWcud2FybignTWVzc2FnZSBmcm9tIHVuY29uZmlndXJlZCBzb3VyY2U6ICcgKyBzb3VyY2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjbG9zZScgJiYgbWVzc2FnZS50bykge1xuICAgICAgZGVsZXRlIHRoaXMucHJvdmlkZXJJbnN0YW5jZXNbc291cmNlXVttZXNzYWdlLnRvXTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudG8gJiYgdGhpcy5wcm92aWRlckluc3RhbmNlc1tzb3VyY2VdICYmXG4gICAgICAgICAgICAgICB0aGlzLnByb3ZpZGVySW5zdGFuY2VzW3NvdXJjZV1bbWVzc2FnZS50b10pIHtcbiAgICAgIG1lc3NhZ2UubWVzc2FnZS50byA9IG1lc3NhZ2UudG87XG4gICAgICB0aGlzLnByb3ZpZGVySW5zdGFuY2VzW3NvdXJjZV1bbWVzc2FnZS50b10obWVzc2FnZS5tZXNzYWdlKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudG8gJiYgbWVzc2FnZS5tZXNzYWdlICYmXG4gICAgICAgIG1lc3NhZ2UubWVzc2FnZS50eXBlID09PSAnY29uc3RydWN0Jykge1xuICAgICAgdmFyIGFyZ3MgPSBDb25zdW1lci5wb3J0YWJsZVRvTWVzc2FnZShcbiAgICAgICAgICAodGhpcy5kZWZpbml0aW9uLmNvbnN0cnVjdG9yICYmIHRoaXMuZGVmaW5pdGlvbi5jb25zdHJ1Y3Rvci52YWx1ZSkgP1xuICAgICAgICAgICAgICB0aGlzLmRlZmluaXRpb24uY29uc3RydWN0b3IudmFsdWUgOiBbXSxcbiAgICAgICAgICBtZXNzYWdlLm1lc3NhZ2UsXG4gICAgICAgICAgdGhpcy5kZWJ1Z1xuICAgICAgICApO1xuICAgICAgaWYgKCF0aGlzLnByb3ZpZGVySW5zdGFuY2VzW3NvdXJjZV0pIHtcbiAgICAgICAgdGhpcy5wcm92aWRlckluc3RhbmNlc1tzb3VyY2VdID0ge307XG4gICAgICB9XG4gICAgICB0aGlzLnByb3ZpZGVySW5zdGFuY2VzW3NvdXJjZV1bbWVzc2FnZS50b10gPSB0aGlzLmdldFByb3ZpZGVyKHNvdXJjZSwgbWVzc2FnZS50bywgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGVidWcud2Fybih0aGlzLnRvU3RyaW5nKCkgKyAnIGRyb3BwaW5nIG1lc3NhZ2UgJyArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBDbG9zZSAvIHRlYXJkb3duIHRoZSBmbG93IHRoaXMgcHJvdmlkZXIgdGVybWluYXRlcy5cbiAqIEBtZXRob2QgY2xvc2VcbiAqL1xuUHJvdmlkZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5jb250cm9sQ2hhbm5lbCkge1xuICAgIHRoaXMuZW1pdCh0aGlzLmNvbnRyb2xDaGFubmVsLCB7XG4gICAgICB0eXBlOiAnUHJvdmlkZXIgQ2xvc2luZycsXG4gICAgICByZXF1ZXN0OiAnY2xvc2UnXG4gICAgfSk7XG4gICAgZGVsZXRlIHRoaXMuY29udHJvbENoYW5uZWw7XG4gIH1cbiAgdGhpcy5lbWl0KCdjbG9zZScpO1xuXG4gIHRoaXMucHJvdmlkZXJJbnN0YW5jZXMgPSB7fTtcbiAgdGhpcy5lbWl0Q2hhbm5lbCA9IG51bGw7XG59O1xuXG4vKipcbiAqIEdldCBhbiBpbnRlcmZhY2UgdG8gZXhwb3NlIGV4dGVybmFsbHkgcmVwcmVzZW50aW5nIHRoaXMgcG9ydC5cbiAqIFByb3ZpZGVycyBhcmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBwb3J0IHVzaW5nIGVpdGhlclxuICogcHJvdmlkZVN5bmNocm9ub3VzIG9yIHByb3ZpZGVBc3luY2hyb25vdXMgZGVwZW5kaW5nIG9uIHRoZSBkZXNpcmVkXG4gKiByZXR1cm4gaW50ZXJmYWNlLlxuICogQG1ldGhvZCBnZXRJbnRlcmZhY2VcbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIGV4dGVybmFsIGludGVyZmFjZSBvZiB0aGlzIFByb3ZpZGVyLlxuICovXG5Qcm92aWRlci5wcm90b3R5cGUuZ2V0SW50ZXJmYWNlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5pZmFjZSkge1xuICAgIHJldHVybiB0aGlzLmlmYWNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuaWZhY2UgPSB7XG4gICAgICBwcm92aWRlU3luY2hyb25vdXM6IGZ1bmN0aW9uIChwcm92KSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXJDbHMgPSBwcm92O1xuICAgICAgICB0aGlzLm1vZGUgPSBQcm92aWRlci5tb2RlLnN5bmNocm9ub3VzO1xuICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgcHJvdmlkZUFzeW5jaHJvbm91czogZnVuY3Rpb24gKHByb3YpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlckNscyA9IHByb3Y7XG4gICAgICAgIHRoaXMubW9kZSA9IFByb3ZpZGVyLm1vZGUuYXN5bmNocm9ub3VzO1xuICAgICAgfS5iaW5kKHRoaXMpLFxuICAgICAgcHJvdmlkZVByb21pc2VzOiBmdW5jdGlvbiAocHJvdikge1xuICAgICAgICB0aGlzLnByb3ZpZGVyQ2xzID0gcHJvdjtcbiAgICAgICAgdGhpcy5tb2RlID0gUHJvdmlkZXIubW9kZS5wcm9taXNlcztcbiAgICAgIH0uYmluZCh0aGlzKSxcbiAgICAgIGNsb3NlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG5cbiAgICB1dGlsLmVhY2hQcm9wKHRoaXMuZGVmaW5pdGlvbiwgZnVuY3Rpb24gKHByb3AsIG5hbWUpIHtcbiAgICAgIHN3aXRjaCAocHJvcC50eXBlKSB7XG4gICAgICBjYXNlIFwiY29uc3RhbnRcIjpcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMuaWZhY2UsIG5hbWUsIHtcbiAgICAgICAgICB2YWx1ZTogQ29uc3VtZXIucmVjdXJzaXZlRnJlZXplT2JqZWN0KHByb3AudmFsdWUpLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHJldHVybiB0aGlzLmlmYWNlO1xuICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHVzZWQgdG8gZ2V0IGludGVyZmFjZXMgZnJvbSB0aGlzIHByb3ZpZGVyIGZyb21cbiAqIGEgdXNlci12aXNpYmxlIHBvaW50LlxuICogQG1ldGhvZCBnZXRQcm94eUludGVyZmFjZVxuICovXG5Qcm92aWRlci5wcm90b3R5cGUuZ2V0UHJveHlJbnRlcmZhY2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmdW5jID0gZnVuY3Rpb24gKHApIHtcbiAgICByZXR1cm4gcC5nZXRJbnRlcmZhY2UoKTtcbiAgfS5iaW5kKHt9LCB0aGlzKTtcblxuICBmdW5jLmNsb3NlID0gZnVuY3Rpb24gKGlmYWNlKSB7XG4gICAgaWYgKGlmYWNlKSB7XG4gICAgICB1dGlsLmVhY2hQcm9wKHRoaXMuaWZhY2VzLCBmdW5jdGlvbiAoY2FuZGlkYXRlLCBpZCkge1xuICAgICAgICBpZiAoY2FuZGlkYXRlID09PSBpZmFjZSkge1xuICAgICAgICAgIHRoaXMudGVhcmRvd24oaWQpO1xuICAgICAgICAgIHRoaXMuZW1pdCh0aGlzLmVtaXRDaGFubmVsLCB7XG4gICAgICAgICAgICB0eXBlOiAnY2xvc2UnLFxuICAgICAgICAgICAgdG86IGlkXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENsb3NlIHRoZSBjaGFubmVsLlxuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpO1xuXG4gIGZ1bmMub25DbG9zZSA9IGZ1bmN0aW9uIChpZmFjZSwgaGFuZGxlcikge1xuICAgIGlmICh0eXBlb2YgaWZhY2UgPT09ICdmdW5jdGlvbicgJiYgaGFuZGxlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBBZGQgYW4gb24tY2hhbm5lbC1jbG9zZWQgaGFuZGxlci5cbiAgICAgIHRoaXMub25jZSgnY2xvc2UnLCBpZmFjZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdXRpbC5lYWNoUHJvcCh0aGlzLmlmYWNlcywgZnVuY3Rpb24gKGNhbmRpZGF0ZSwgaWQpIHtcbiAgICAgIGlmIChjYW5kaWRhdGUgPT09IGlmYWNlKSB7XG4gICAgICAgIGlmICh0aGlzLmhhbmRsZXJzW2lkXSkge1xuICAgICAgICAgIHRoaXMuaGFuZGxlcnNbaWRdLnB1c2goaGFuZGxlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5oYW5kbGVyc1tpZF0gPSBbaGFuZGxlcl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHJldHVybiBmdW5jO1xufTtcblxuLyoqXG4gKiBHZXQgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIHJlZ2lzdGVyZWQgcHJvdmlkZXIuXG4gKiBAbWV0aG9kIGdldFByb3ZpZGVyXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIFRoZSBwb3J0IHRoaXMgaW5zdGFuY2UgaXMgaW50ZXJhY3RpZ24gd2l0aC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBpZGVudGlmaWVyIHRoZSBtZXNzYWdhYmxlIGFkZHJlc3MgZm9yIHRoaXMgcHJvdmlkZXIuXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIENvbnN0cnVjdG9yIGFyZ3VtZW50cyBmb3IgdGhlIHByb3ZpZGVyLlxuICogQHJldHVybiB7RnVuY3Rpb259IEEgZnVuY3Rpb24gdG8gc2VuZCBtZXNzYWdlcyB0byB0aGUgcHJvdmlkZXIuXG4gKi9cblByb3ZpZGVyLnByb3RvdHlwZS5nZXRQcm92aWRlciA9IGZ1bmN0aW9uIChzb3VyY2UsIGlkZW50aWZpZXIsIGFyZ3MpIHtcbiAgaWYgKCF0aGlzLnByb3ZpZGVyQ2xzKSB7XG4gICAgdGhpcy5kZWJ1Zy53YXJuKCdDYW5ub3QgaW5zdGFudGlhdGUgcHJvdmlkZXIsIHNpbmNlIGl0IGlzIG5vdCBwcm92aWRlZCcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmFyIGV2ZW50cyA9IHt9LFxuICAgIGRpc3BhdGNoRXZlbnQsXG4gICAgQm91bmRDbGFzcyxcbiAgICBpbnN0YW5jZTtcblxuICB1dGlsLmVhY2hQcm9wKHRoaXMuZGVmaW5pdGlvbiwgZnVuY3Rpb24gKHByb3AsIG5hbWUpIHtcbiAgICBpZiAocHJvcC50eXBlID09PSAnZXZlbnQnKSB7XG4gICAgICBldmVudHNbbmFtZV0gPSBwcm9wO1xuICAgIH1cbiAgfSk7XG5cbiAgZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uIChzcmMsIGV2LCBpZCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAoZXZbbmFtZV0pIHtcbiAgICAgIHZhciBzdHJlYW1zID0gQ29uc3VtZXIubWVzc2FnZVRvUG9ydGFibGUoZXZbbmFtZV0udmFsdWUsIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWJ1Zyk7XG4gICAgICB0aGlzLmVtaXQodGhpcy5jaGFubmVsc1tzcmNdLCB7XG4gICAgICAgIHR5cGU6ICdtZXNzYWdlJyxcbiAgICAgICAgdG86IGlkLFxuICAgICAgICBtZXNzYWdlOiB7XG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICB0eXBlOiAnZXZlbnQnLFxuICAgICAgICAgIHRleHQ6IHN0cmVhbXMudGV4dCxcbiAgICAgICAgICBiaW5hcnk6IHN0cmVhbXMuYmluYXJ5XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMsIHNvdXJjZSwgZXZlbnRzLCBpZGVudGlmaWVyKTtcblxuICAvLyB0aGlzIGlzIGFsbCB0byBzYXk6IG5ldyBwcm92aWRlckNscyhkaXNwYXRjaEV2ZW50LCBhcmdzWzBdLCBhcmdzWzFdLC4uLilcbiAgQm91bmRDbGFzcyA9IHRoaXMucHJvdmlkZXJDbHMuYmluZC5hcHBseSh0aGlzLnByb3ZpZGVyQ2xzLFxuICAgICAgW3RoaXMucHJvdmlkZXJDbHMsIGRpc3BhdGNoRXZlbnRdLmNvbmNhdChhcmdzIHx8IFtdKSk7XG4gIGluc3RhbmNlID0gbmV3IEJvdW5kQ2xhc3MoKTtcblxuICByZXR1cm4gZnVuY3Rpb24gKHBvcnQsIHNyYywgbXNnKSB7XG4gICAgaWYgKG1zZy5hY3Rpb24gPT09ICdtZXRob2QnKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXNbbXNnLnR5cGVdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHBvcnQuZGVidWcud2FybihcIlByb3ZpZGVyIGRvZXMgbm90IGltcGxlbWVudCBcIiArIG1zZy50eXBlICsgXCIoKSFcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wID0gcG9ydC5kZWZpbml0aW9uW21zZy50eXBlXSxcbiAgICAgICAgZGVidWcgPSBwb3J0LmRlYnVnLFxuICAgICAgICBhcmdzID0gQ29uc3VtZXIucG9ydGFibGVUb01lc3NhZ2UocHJvcC52YWx1ZSwgbXNnLCBkZWJ1ZyksXG4gICAgICAgIHJldCA9IGZ1bmN0aW9uIChzcmMsIG1zZywgcHJvcCwgcmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgdmFyIHN0cmVhbXMgPSBDb25zdW1lci5tZXNzYWdlVG9Qb3J0YWJsZShwcm9wLnJldCwgcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Zyk7XG4gICAgICAgICAgdGhpcy5lbWl0KHRoaXMuY2hhbm5lbHNbc3JjXSwge1xuICAgICAgICAgICAgdHlwZTogJ21ldGhvZCcsXG4gICAgICAgICAgICB0bzogbXNnLnRvLFxuICAgICAgICAgICAgbWVzc2FnZToge1xuICAgICAgICAgICAgICB0bzogbXNnLnRvLFxuICAgICAgICAgICAgICB0eXBlOiAnbWV0aG9kJyxcbiAgICAgICAgICAgICAgcmVxSWQ6IG1zZy5yZXFJZCxcbiAgICAgICAgICAgICAgbmFtZTogbXNnLnR5cGUsXG4gICAgICAgICAgICAgIHRleHQ6IHN0cmVhbXMudGV4dCxcbiAgICAgICAgICAgICAgYmluYXJ5OiBzdHJlYW1zLmJpbmFyeSxcbiAgICAgICAgICAgICAgZXJyb3I6IHJlamVjdFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LmJpbmQocG9ydCwgc3JjLCBtc2csIHByb3ApO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGFyZ3MpKSB7XG4gICAgICAgIGFyZ3MgPSBbYXJnc107XG4gICAgICB9XG4gICAgICBpZiAocG9ydC5tb2RlID09PSBQcm92aWRlci5tb2RlLnN5bmNocm9ub3VzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0KHRoaXNbbXNnLnR5cGVdLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldCh1bmRlZmluZWQsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocG9ydC5tb2RlID09PSBQcm92aWRlci5tb2RlLmFzeW5jaHJvbm91cykge1xuICAgICAgICB0aGlzW21zZy50eXBlXS5hcHBseShpbnN0YW5jZSwgYXJncy5jb25jYXQocmV0KSk7XG4gICAgICB9IGVsc2UgaWYgKHBvcnQubW9kZSA9PT0gUHJvdmlkZXIubW9kZS5wcm9taXNlcykge1xuICAgICAgICB0aGlzW21zZy50eXBlXS5hcHBseSh0aGlzLCBhcmdzKS50aGVuKHJldCwgcmV0LmJpbmQoe30sIHVuZGVmaW5lZCkpO1xuICAgICAgfVxuICAgIH1cbiAgfS5iaW5kKGluc3RhbmNlLCB0aGlzLCBzb3VyY2UpO1xufTtcblxuLyoqXG4gKiBHZXQgYSB0ZXh0dWFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgcG9ydC5cbiAqIEBtZXRob2QgdG9TdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ30gdGhlIGRlc2NyaXB0aW9uIG9mIHRoaXMgcG9ydC5cbiAqL1xuUHJvdmlkZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5lbWl0Q2hhbm5lbCkge1xuICAgIHJldHVybiBcIltQcm92aWRlciBcIiArIHRoaXMuZW1pdENoYW5uZWwgKyBcIl1cIjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gXCJbdW5ib3VuZCBQcm92aWRlcl1cIjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm92aWRlcjtcbiIsIi8qanNsaW50IGluZGVudDoyLCB3aGl0ZTp0cnVlLCBub2RlOnRydWUsIHNsb3BweTp0cnVlLCBicm93c2VyOnRydWUgKi9cbnZhciBQcm9taXNlQ29tcGF0ID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcbnZhciBDb25zdW1lciA9IHJlcXVpcmUoJy4uL2NvbnN1bWVyJyk7XG5cbnZhciBBcGlJbnRlcmZhY2UgPSBmdW5jdGlvbihkZWYsIG9uTXNnLCBlbWl0LCBkZWJ1Zykge1xuICB2YXIgaW5mbGlnaHQgPSB7fSxcbiAgICAgIGV2ZW50cyA9IG51bGwsXG4gICAgICBlbWl0dGVyID0gbnVsbCxcbiAgICAgIHJlcUlkID0gMCxcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgdXRpbC5lYWNoUHJvcChkZWYsIGZ1bmN0aW9uKHByb3AsIG5hbWUpIHtcbiAgICBzd2l0Y2gocHJvcC50eXBlKSB7XG4gICAgY2FzZSAnbWV0aG9kJzpcbiAgICAgIHRoaXNbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gTm90ZTogaW5mbGlnaHQgc2hvdWxkIGJlIHJlZ2lzdGVyZWQgYmVmb3JlIG1lc3NhZ2UgaXMgcGFzc2VkXG4gICAgICAgIC8vIGluIG9yZGVyIHRvIHByZXBhcmUgZm9yIHN5bmNocm9ub3VzIGluLXdpbmRvdyBwaXBlcy5cbiAgICAgICAgdmFyIHRoaXNSZXEgPSByZXFJZCxcbiAgICAgICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZUNvbXBhdChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgaW5mbGlnaHRbdGhpc1JlcV0gPSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZTpyZXNvbHZlLFxuICAgICAgICAgICAgICAgIHJlamVjdDpyZWplY3QsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHByb3AucmV0XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHN0cmVhbXMgPSBDb25zdW1lci5tZXNzYWdlVG9Qb3J0YWJsZShwcm9wLnZhbHVlLFxuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCksXG4gICAgICAgICAgICAgICAgZGVidWcpO1xuICAgICAgICByZXFJZCArPSAxO1xuICAgICAgICBlbWl0KHtcbiAgICAgICAgICBhY3Rpb246ICdtZXRob2QnLFxuICAgICAgICAgIHR5cGU6IG5hbWUsXG4gICAgICAgICAgcmVxSWQ6IHRoaXNSZXEsXG4gICAgICAgICAgdGV4dDogc3RyZWFtcy50ZXh0LFxuICAgICAgICAgIGJpbmFyeTogc3RyZWFtcy5iaW5hcnlcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2V2ZW50JzpcbiAgICAgIGlmKCFldmVudHMpIHtcbiAgICAgICAgdXRpbC5oYW5kbGVFdmVudHModGhpcyk7XG4gICAgICAgIGVtaXR0ZXIgPSB0aGlzLmVtaXQ7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmVtaXQ7XG4gICAgICAgIGV2ZW50cyA9IHt9O1xuICAgICAgfVxuICAgICAgZXZlbnRzW25hbWVdID0gcHJvcDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NvbnN0YW50JzpcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCB7XG4gICAgICAgIHZhbHVlOiBDb25zdW1lci5yZWN1cnNpdmVGcmVlemVPYmplY3QocHJvcC52YWx1ZSksXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgb25Nc2codGhpcywgZnVuY3Rpb24odHlwZSwgbXNnKSB7XG4gICAgaWYgKHR5cGUgPT09ICdjbG9zZScpIHtcbiAgICAgIHRoaXMub2ZmKCk7XG4gICAgICBkZWxldGUgdGhpcy5pbmZsaWdodDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG1zZy50eXBlID09PSAnbWV0aG9kJykge1xuICAgICAgaWYgKGluZmxpZ2h0W21zZy5yZXFJZF0pIHtcbiAgICAgICAgdmFyIHJlc29sdmVyID0gaW5mbGlnaHRbbXNnLnJlcUlkXSxcbiAgICAgICAgICAgIHRlbXBsYXRlID0gcmVzb2x2ZXIudGVtcGxhdGU7XG4gICAgICAgIGRlbGV0ZSBpbmZsaWdodFttc2cucmVxSWRdO1xuICAgICAgICBpZiAobXNnLmVycm9yKSB7XG4gICAgICAgICAgcmVzb2x2ZXIucmVqZWN0KG1zZy5lcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZXIucmVzb2x2ZShDb25zdW1lci5wb3J0YWJsZVRvTWVzc2FnZSh0ZW1wbGF0ZSwgbXNnLCBkZWJ1ZykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWJ1Zy5lcnJvcignSW5jb21pbmcgbWVzc2FnZSBjbGFpbWVkIHRvIGJlIGFuIFJQQyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAncmV0dXJuaW5nIGZvciB1bnJlZ2lzdGVyZWQgY2FsbCcsIG1zZy5yZXFJZCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2V2ZW50Jykge1xuICAgICAgaWYgKGV2ZW50c1ttc2cubmFtZV0pIHtcbiAgICAgICAgZW1pdHRlcihtc2cubmFtZSwgQ29uc3VtZXIucG9ydGFibGVUb01lc3NhZ2UoZXZlbnRzW21zZy5uYW1lXS52YWx1ZSxcbiAgICAgICAgICAgICAgICBtc2csIGRlYnVnKSk7XG4gICAgICB9XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGFyZ3MgPSBDb25zdW1lci5tZXNzYWdlVG9Qb3J0YWJsZShcbiAgICAgIChkZWYuY29uc3RydWN0b3IgJiYgZGVmLmNvbnN0cnVjdG9yLnZhbHVlKSA/IGRlZi5jb25zdHJ1Y3Rvci52YWx1ZSA6IFtdLFxuICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgNCksXG4gICAgICBkZWJ1Zyk7XG5cbiAgZW1pdCh7XG4gICAgdHlwZTogJ2NvbnN0cnVjdCcsXG4gICAgdGV4dDogYXJncy50ZXh0LFxuICAgIGJpbmFyeTogYXJncy5iaW5hcnlcbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwaUludGVyZmFjZTtcbiIsIi8qanNsaW50IGluZGVudDoyLCB3aGl0ZTp0cnVlLCBub2RlOnRydWUsIHNsb3BweTp0cnVlLCBicm93c2VyOnRydWUgKi9cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgRXZlbnRJbnRlcmZhY2UgPSBmdW5jdGlvbihvbk1zZywgZW1pdCwgZGVidWcpIHtcbiAgdXRpbC5oYW5kbGVFdmVudHModGhpcyk7XG4gIFxuICBvbk1zZyh0aGlzLCBmdW5jdGlvbihlbWl0LCB0eXBlLCBtc2cpIHtcbiAgICBlbWl0KG1zZy50eXBlLCBtc2cubWVzc2FnZSk7XG4gIH0uYmluZCh0aGlzLCB0aGlzLmVtaXQpKTtcblxuICB0aGlzLmVtaXQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlLCBtc2cpIHtcbiAgICBlbWl0dGVyKHt0eXBlOiB0eXBlLCBtZXNzYWdlOiBtc2d9LCB0cnVlKTtcbiAgfS5iaW5kKHt9LCBlbWl0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRJbnRlcmZhY2U7XG4iLCIvKmpzbGludCBpbmRlbnQ6Miwgbm9kZTp0cnVlICovXG52YXIgUHJvbWlzZUNvbXBhdCA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcblxudmFyIEFwaUludGVyZmFjZSA9IHJlcXVpcmUoJy4vcHJveHkvYXBpSW50ZXJmYWNlJyk7XG52YXIgRXZlbnRJbnRlcmZhY2UgPSByZXF1aXJlKCcuL3Byb3h5L2V2ZW50SW50ZXJmYWNlJyk7XG52YXIgQ29uc3VtZXIgPSByZXF1aXJlKCcuL2NvbnN1bWVyJyk7XG52YXIgUHJvdmlkZXIgPSByZXF1aXJlKCcuL3Byb3ZpZGVyJyk7XG5cbi8qKlxuICogQSBQcm94eSBCaW5kZXIgbWFuYWdlcyB0aGUgZXh0ZXJuYWwgaW50ZXJmYWNlLCBhbmQgY3JlYXRlcyBvbmUgb2ZcbiAqIHRoZSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cyBleHBvc2VkIGJ5IGZyZWVkb20gZWl0aGVyIGFzIGEgZ2xvYmFsXG4gKiB3aXRoaW4gYSB3b3JrZXIgLyBtb2R1bGUgY29udGV4dCwgb3IgcmV0dXJuZWQgYnkgYW4gZXh0ZXJuYWwgY2FsbCB0b1xuICogY3JlYXRlIGEgZnJlZWRvbSBydW50aW1lLlxuICogQENsYXNzIFByb3h5QmluZGVyXG4gKiBAcGFyYW0ge01hbmFnZXJ9IG1hbmFnZXIgVGhlIG1hbmFnZXIgZm9yIHRoZSBhY3RpdmUgcnVudGltZS5cbiAqL1xudmFyIFByb3h5QmluZGVyID0gZnVuY3Rpb24gKG1hbmFnZXIpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBwcm94eSBmb3IgYSBmcmVlZG9tIHBvcnQsIGFuZCByZXR1cm4gaXQgb25jZSBsb2FkZWQuXG4gKiBAbWV0aG9kIGdldEV4dGVybmFsXG4gKiBAcGFyYW0ge1BvcnR9IHBvcnQgVGhlIHBvcnQgZm9yIHRoZSBwcm94eSB0byBjb21tdW5pY2F0ZSB3aXRoLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHByb3h5LlxuICogQHBhcmFtIHtPYmplY3R9IFtkZWZpbml0aW9uXSBUaGUgZGVmaW5pdGlvbiBvZiB0aGUgQVBJIHRvIGV4cG9zZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBkZWZpbml0aW9uLm5hbWUgVGhlIG5hbWUgb2YgdGhlIEFQSS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZpbml0aW9uLmRlZmluaXRpb24gVGhlIGRlZmluaXRpb24gb2YgdGhlIEFQSS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZGVmaW5pdGlvbi5wcm92aWRlcyBXaGV0aGVyIHRoaXMgaXMgYSBjb25zdW1lciBvciBwcm92aWRlci5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBBIHByb21pc2UgZm9yIHRoZSBhY3RpdmUgcHJveHkgaW50ZXJmYWNlLlxuICovXG5Qcm94eUJpbmRlci5wcm90b3R5cGUuZ2V0RXh0ZXJuYWwgPSBmdW5jdGlvbiAocG9ydCwgbmFtZSwgZGVmaW5pdGlvbikge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBwcm94eSwgYXBpO1xuICByZXR1cm4gbmV3IFByb21pc2VDb21wYXQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmIChkZWZpbml0aW9uKSB7XG4gICAgICBhcGkgPSBkZWZpbml0aW9uLm5hbWU7XG4gICAgICBpZiAoZGVmaW5pdGlvbi5wcm92aWRlcykge1xuICAgICAgICBwcm94eSA9IG5ldyBQcm92aWRlcihkZWZpbml0aW9uLmRlZmluaXRpb24sIHRoaXMubWFuYWdlci5kZWJ1Zyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eSA9IG5ldyBDb25zdW1lcihBcGlJbnRlcmZhY2UuYmluZCh7fSxcbiAgICAgICAgICAgIGRlZmluaXRpb24uZGVmaW5pdGlvbiksXG4gICAgICAgICAgICB0aGlzLm1hbmFnZXIuZGVidWcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm94eSA9IG5ldyBDb25zdW1lcihFdmVudEludGVyZmFjZSwgdGhpcy5tYW5hZ2VyLmRlYnVnKTtcbiAgICB9XG5cbiAgICBwcm94eS5vbmNlKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpZmFjZSA9IHByb3h5LmdldFByb3h5SW50ZXJmYWNlKCk7XG4gICAgICBpZiAoYXBpKSB7XG4gICAgICAgIGlmYWNlLmFwaSA9IGFwaTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoe1xuICAgICAgICBwb3J0OiBwcm94eSxcbiAgICAgICAgZXh0ZXJuYWw6IGlmYWNlXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMubWFuYWdlci5jcmVhdGVMaW5rKHBvcnQsIG5hbWUsIHByb3h5KTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogQmluZCB0aGUgZGVmYXVsdCBwcm94eSBmb3IgYSBmcmVlZG9tIHBvcnQuXG4gKiBAbWV0aG9kIGJpbmREZWZhdWx0XG4gKiBAcGFyYW0ge1BvcnR9IHBvcnQgVGhlIHBvcnQgZm9yIHRoZSBwcm94eSB0byBjb21tdW5pY2F0ZSB3aXRoLlxuICogQHBhcmFtIHtBcGl9IGFwaSBUaGUgQVBJIGxvYWRlciB3aXRoIEFQSSBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBtYW5pZmVzdCBUaGUgbWFuaWZlc3Qgb2YgdGhlIG1vZHVsZSB0byBleHBvc2UuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGludGVybmFsIFdoZXRoZXIgdGhlIGludGVyZmFjZSBpcyBmb3IgaW5zaWRlIHRoZSBtb2R1bGUuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIGZvciBhIHByb3h5IGludGVyZmFjZS5cbiAqIEBwcml2YXRlXG4gKi9cblByb3h5QmluZGVyLnByb3RvdHlwZS5iaW5kRGVmYXVsdCA9IGZ1bmN0aW9uIChwb3J0LCBhcGksIG1hbmlmZXN0LCBpbnRlcm5hbCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBtZXRhZGF0YSA9IHtcbiAgICBuYW1lOiBtYW5pZmVzdC5uYW1lLFxuICAgIGljb246IG1hbmlmZXN0Lmljb24sXG4gICAgZGVzY3JpcHRpb246IG1hbmlmZXN0LmRlc2NyaXB0aW9uXG4gIH0sIGRlZjtcblxuICBpZiAobWFuaWZlc3RbJ2RlZmF1bHQnXSkge1xuICAgIGRlZiA9IGFwaS5nZXQobWFuaWZlc3RbJ2RlZmF1bHQnXSk7XG4gICAgaWYgKCFkZWYgJiYgbWFuaWZlc3QuYXBpICYmIG1hbmlmZXN0LmFwaVttYW5pZmVzdFsnZGVmYXVsdCddXSkge1xuICAgICAgZGVmID0ge1xuICAgICAgICBuYW1lOiBtYW5pZmVzdFsnZGVmYXVsdCddLFxuICAgICAgICBkZWZpbml0aW9uOiBtYW5pZmVzdC5hcGlbbWFuaWZlc3RbJ2RlZmF1bHQnXV1cbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChpbnRlcm5hbCAmJiBtYW5pZmVzdC5wcm92aWRlcyAmJlxuICAgICAgICBtYW5pZmVzdC5wcm92aWRlcy5pbmRleE9mKG1hbmlmZXN0WydkZWZhdWx0J10pICE9PSBmYWxzZSkge1xuICAgICAgZGVmLnByb3ZpZGVzID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGludGVybmFsKSB7XG4gICAgICBhcGkuZGVidWcud2FybihcImRlZmF1bHQgQVBJIG5vdCBwcm92aWRlZCwgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgXCJhcmUgeW91IG1pc3NpbmcgYSBwcm92aWRlcyBrZXkgaW4geW91ciBtYW5pZmVzdD9cIik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXMuZ2V0RXh0ZXJuYWwocG9ydCwgJ2RlZmF1bHQnLCBkZWYpLnRoZW4oXG4gICAgZnVuY3Rpb24gKG1ldGFkYXRhLCBpbmZvKSB7XG4gICAgICBpbmZvLmV4dGVybmFsLm1hbmlmZXN0ID0gbWV0YWRhdGE7XG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9LmJpbmQodGhpcywgbWV0YWRhdGEpXG4gICk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb3h5QmluZGVyO1xuIiwiLypnbG9iYWxzIFhNTEh0dHBSZXF1ZXN0ICovXG4vKmpzbGludCBpbmRlbnQ6Mixub2RlOnRydWUsc2xvcHB5OnRydWUgKi9cbnZhciBQcm9taXNlQ29tcGF0ID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIFRoZSBSZXNvdXJjZSByZWdpc3RyeSBmb3IgRnJlZURPTS4gIFVzZWQgdG8gbG9vayB1cCByZXF1ZXN0ZWQgUmVzb3VyY2VzLFxuICogYW5kIHByb3ZpZGUgbG9va3VwIGFuZCBtaWdyYXRpb24gb2YgcmVzb3VyY2VzLlxuICogQENsYXNzIFJlc291cmNlXG4gKiBAcGFyYW0ge0RlYnVnfSBkZWJ1ZyBUaGUgbG9nZ2VyIHRvIHVzZSBmb3IgZGVidWdnaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBSZXNvdXJjZSA9IGZ1bmN0aW9uIChkZWJ1Zykge1xuICB0aGlzLmRlYnVnID0gZGVidWc7XG4gIHRoaXMuZmlsZXMgPSB7fTtcbiAgdGhpcy5yZXNvbHZlcnMgPSBbdGhpcy5odHRwUmVzb2x2ZXIsIHRoaXMubnVsbFJlc29sdmVyXTtcbiAgdGhpcy5jb250ZW50UmV0cmlldmVycyA9IHtcbiAgICAnaHR0cCc6IHRoaXMueGhyUmV0cmlldmVyLFxuICAgICdodHRwcyc6IHRoaXMueGhyUmV0cmlldmVyLFxuICAgICdjaHJvbWUtZXh0ZW5zaW9uJzogdGhpcy54aHJSZXRyaWV2ZXIsXG4gICAgJ3Jlc291cmNlJzogdGhpcy54aHJSZXRyaWV2ZXIsXG4gICAgJ2Nocm9tZSc6IHRoaXMueGhyUmV0cmlldmVyLFxuICAgICdhcHAnOiB0aGlzLnhoclJldHJpZXZlcixcbiAgICAnbWFuaWZlc3QnOiB0aGlzLm1hbmlmZXN0UmV0cmlldmVyXG4gIH07XG59O1xuXG4vKipcbiAqIFJlc29sdmUgYSByZXN1cmNlIFVSTCByZXF1ZXN0ZWQgZnJvbSBhIG1vZHVsZS5cbiAqIEBtZXRob2QgZ2V0XG4gKiBAcGFyYW0ge1N0cmluZ30gbWFuaWZlc3QgVGhlIGNhbm9uaWNhbCBhZGRyZXNzIG9mIHRoZSBtb2R1bGUgcmVxdWVzdGluZy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIHJlc291cmNlIHRvIGdldC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBBIHByb21pc2UgZm9yIHRoZSByZXNvdXJjZSBhZGRyZXNzLlxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG1hbmlmZXN0LCB1cmwpIHtcbiAgdmFyIGtleSA9IEpTT04uc3RyaW5naWZ5KFttYW5pZmVzdCwgdXJsXSk7XG4gIFxuICByZXR1cm4gbmV3IFByb21pc2VDb21wYXQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmICh0aGlzLmZpbGVzW2tleV0pIHtcbiAgICAgIHJlc29sdmUodGhpcy5maWxlc1trZXldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXNvbHZlKG1hbmlmZXN0LCB1cmwpLnRoZW4oZnVuY3Rpb24gKGtleSwgcmVzb2x2ZSwgYWRkcmVzcykge1xuICAgICAgICB0aGlzLmZpbGVzW2tleV0gPSBhZGRyZXNzO1xuICAgICAgICAvL2Zkb20uZGVidWcubG9nKCdSZXNvbHZlZCAnICsga2V5ICsgJyB0byAnICsgYWRkcmVzcyk7XG4gICAgICAgIHJlc29sdmUoYWRkcmVzcyk7XG4gICAgICB9LmJpbmQodGhpcywga2V5LCByZXNvbHZlKSwgcmVqZWN0KTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY29udGVudHMgb2YgYSByZXNvdXJjZS5cbiAqIEBtZXRob2QgZ2V0Q29udGVudHNcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIHJlc291cmNlIHRvIHJlYWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIGZvciB0aGUgcmVzb3VyY2UgY29udGVudHMuXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5nZXRDb250ZW50cyA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlQ29tcGF0KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcHJvcDtcbiAgICBpZiAoIXVybCkge1xuICAgICAgdGhpcy5kZWJ1Zy53YXJuKFwiQXNrZWQgdG8gZ2V0IGNvbnRlbnRzIG9mIHVuZGVmaW5lZCBVUkwuXCIpO1xuICAgICAgcmV0dXJuIHJlamVjdCgpO1xuICAgIH1cbiAgICBmb3IgKHByb3AgaW4gdGhpcy5jb250ZW50UmV0cmlldmVycykge1xuICAgICAgaWYgKHRoaXMuY29udGVudFJldHJpZXZlcnMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKHByb3AgKyBcIjovL1wiKSA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRlbnRSZXRyaWV2ZXJzW3Byb3BdLmNhbGwodGhpcywgdXJsLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9IGVsc2UgaWYgKHVybC5pbmRleE9mKFwiOi8vXCIpID09PSAtMSAmJiBwcm9wID09PSBcIm51bGxcIikge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRlbnRSZXRyaWV2ZXJzW3Byb3BdLmNhbGwodGhpcywgdXJsLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlamVjdCgpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgZmlyc3Qgb2YgYW4gYXJyYXkgb2YgcHJvbWlzZXNcbiAqIHJlc29sdmVzLCBvciByZWplY3RzIGFmdGVyIGFsbCBwcm9taXNlcyByZWplY3QuIENhbiBiZSB0aG91Z2h0IG9mIGFzXG4gKiB0aGUgbWlzc2luZyAnUHJvbWlzZS5hbnknIC0gcmFjZSBpcyBubyBnb29kLCBzaW5jZSBlYXJseSByZWplY3Rpb25zXG4gKiBwcmVlbXB0IGEgc3Vic2VxdWVudCByZXNvbHV0aW9uLlxuICogQHByaXZhdGVcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgRmlyc3RQcm9taXNlXG4gKiBAcGFyYW0ge1Byb21pc2VbXX0gUHJvbWlzZXMgdG8gc2VsZWN0IGZyb21cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHJlc29sdmluZyB3aXRoIGEgdmFsdWUgZnJvbSBhcmd1bWVudHMuXG4gKi9cbnZhciBmaXJzdFByb21pc2UgPSBmdW5jdGlvbihwcm9taXNlcykge1xuICByZXR1cm4gbmV3IFByb21pc2VDb21wYXQoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuICAgIHByb21pc2VzLmZvckVhY2goZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgcHJvbWlzZS50aGVuKHJlc29sdmUsIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBlcnJvcnMucHVzaChlcnIpO1xuICAgICAgICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gcHJvbWlzZXMubGVuZ3RoKSB7XG4gICAgICAgICAgcmVqZWN0KGVycm9ycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbi8qKlxuICogUmVzb2x2ZSBhIHJlc291cmNlIHVzaW5nIGtub3duIHJlc29sdmVycy4gVW5saWtlIGdldCwgcmVzb2x2ZSBkb2VzXG4gKiBub3QgY2FjaGUgcmVzb2x2ZWQgcmVzb3VyY2VzLlxuICogQG1ldGhvZCByZXNvbHZlXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IG1hbmlmZXN0IFRoZSBtb2R1bGUgcmVxdWVzdGluZyB0aGUgcmVzb3VyY2UuXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSByZXNvdXJjZSB0byByZXNvbHZlO1xuICogQHJldHVybnMge1Byb21pc2V9IEEgcHJvbWlzZSBmb3IgdGhlIHJlc291cmNlIGFkZHJlc3MuXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24gKG1hbmlmZXN0LCB1cmwpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlQ29tcGF0KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICBpZiAodXJsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICB9XG4gICAgdXRpbC5lYWNoUmV2ZXJzZSh0aGlzLnJlc29sdmVycywgZnVuY3Rpb24gKHJlc29sdmVyKSB7XG4gICAgICBwcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlQ29tcGF0KHJlc29sdmVyLmJpbmQoe30sIG1hbmlmZXN0LCB1cmwpKSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICBmaXJzdFByb21pc2UocHJvbWlzZXMpLnRoZW4ocmVzb2x2ZSwgZnVuY3Rpb24oKSB7XG4gICAgICByZWplY3QoJ05vIHJlc29sdmVycyB0byBoYW5kbGUgdXJsOiAnICsgSlNPTi5zdHJpbmdpZnkoW21hbmlmZXN0LCB1cmxdKSk7XG4gICAgfSk7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIHJlc29sdmVyczogY29kZSB0aGF0IGtub3dzIGhvdyB0byBnZXQgcmVzb3VyY2VzXG4gKiBuZWVkZWQgYnkgdGhlIHJ1bnRpbWUuIEEgcmVzb2x2ZXIgd2lsbCBiZSBjYWxsZWQgd2l0aCBmb3VyXG4gKiBhcmd1bWVudHM6IHRoZSBhYnNvbHV0ZSBtYW5pZmVzdCBvZiB0aGUgcmVxdWVzdGVyLCB0aGVcbiAqIHJlc291cmNlIGJlaW5nIHJlcXVlc3RlZCwgYW5kIGEgcmVzb2x2ZSAvIHJlamVjdCBwYWlyIHRvXG4gKiBmdWxmaWxsIGEgcHJvbWlzZS5cbiAqIEBtZXRob2QgYWRkUmVzb2x2ZXJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVyIFRoZSByZXNvbHZlciB0byBhZGQuXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5hZGRSZXNvbHZlciA9IGZ1bmN0aW9uIChyZXNvbHZlcikge1xuICB0aGlzLnJlc29sdmVycy5wdXNoKHJlc29sdmVyKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgcmV0cmlldmVyczogY29kZSB0aGF0IGtub3dzIGhvdyB0byBsb2FkIHJlc291cmNlc1xuICogbmVlZGVkIGJ5IHRoZSBydW50aW1lLiBBIHJldHJpZXZlciB3aWxsIGJlIGNhbGxlZCB3aXRoIGEgVVJMXG4gKiB0byByZXRyaWV2ZSB3aXRoIGEgcHJvdG9jb2wgdGhhdCBpdCBpcyBhYmxlIHRvIGhhbmRsZS5cbiAqIEBtZXRob2QgYWRkUmV0cmlldmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvdG8gVGhlIHByb3RvY29sIHRvIHJlZ2lzdGVyIGZvci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJldHJpZXZlciBUaGUgcmV0cmlldmVyIHRvIGFkZC5cbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLmFkZFJldHJpZXZlciA9IGZ1bmN0aW9uIChwcm90bywgcmV0cmlldmVyKSB7XG4gIGlmICh0aGlzLmNvbnRlbnRSZXRyaWV2ZXJzW3Byb3RvXSkge1xuICAgIHRoaXMuZGVidWcud2FybihcIlVud2lsbGluZyB0byBvdmVycmlkZSBmaWxlIHJldHJpZXZhbCBmb3IgXCIgKyBwcm90byk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuY29udGVudFJldHJpZXZlcnNbcHJvdG9dID0gcmV0cmlldmVyO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBleHRlcm5hbCByZXNvbHZlcnMgYW5kIHJldHJlYXZlcnNcbiAqIEBtZXRob2QgcmVnaXN0ZXJcbiAqIEBwYXJhbSB7e1wicHJvdG9cIjpTdHJpbmcsIFwicmVzb2x2ZXJcIjpGdW5jdGlvbiwgXCJyZXRyZWF2ZXJcIjpGdW5jdGlvbn1bXX1cbiAqICAgICByZXNvbHZlcnMgVGhlIGxpc3Qgb2YgcmV0cmVpdmVycyBhbmQgcmVzb2x2ZXJzLlxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiAocmVzb2x2ZXJzKSB7XG4gIGlmICghcmVzb2x2ZXJzLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHJlc29sdmVycy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKGl0ZW0ucmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuYWRkUmVzb2x2ZXIoaXRlbS5yZXNvbHZlcik7XG4gICAgfSBlbHNlIGlmIChpdGVtLnByb3RvICYmIGl0ZW0ucmV0cmlldmVyKSB7XG4gICAgICB0aGlzLmFkZFJldHJpZXZlcihpdGVtLnByb3RvLCBpdGVtLnJldHJpZXZlcik7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSBVUkwgaXMgYW4gYWJzb2x1dGUgVVJMIG9mIGEgZ2l2ZW4gU2NoZW1lLlxuICogQG1ldGhvZCBoYXNTY2hlbWVcbiAqIEBzdGF0aWNcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBwcm90b2NvbHMgV2hpdGVsaXN0ZWQgcHJvdG9jb2xzXG4gKiBAcGFyYW0ge1N0cmluZ30gVVJMIHRoZSBVUkwgdG8gbWF0Y2guXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gSWYgdGhlIFVSTCBpcyBhbiBhYnNvbHV0ZSBleGFtcGxlIG9mIG9uZSBvZiB0aGUgc2NoZW1lcy5cbiAqL1xuUmVzb3VyY2UuaGFzU2NoZW1lID0gZnVuY3Rpb24gKHByb3RvY29scywgdXJsKSB7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgcHJvdG9jb2xzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHVybC5pbmRleE9mKHByb3RvY29sc1tpXSArIFwiOi8vXCIpID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgJy4vJyBhbmQgJy4uLycgZnJvbSBhIFVSTFxuICogUmVxdWlyZWQgYmVjYXVzZSBDaHJvbWUgQXBwcyBmb3IgTW9iaWxlIChjY2EpIGRvZXNuJ3QgdW5kZXJzdGFuZFxuICogWEhSIHBhdGhzIHdpdGggdGhlc2UgcmVsYXRpdmUgY29tcG9uZW50cyBpbiB0aGUgVVJMLlxuICogQG1ldGhvZCByZW1vdmVSZWxhdGl2ZVBhdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byBtb2RpZnlcbiAqIEByZXR1cm5zIHtTdHJpbmd9IHVybCB3aXRob3V0ICcuLycgYW5kICcuLi8nXG4gKiovXG5SZXNvdXJjZS5yZW1vdmVSZWxhdGl2ZVBhdGggPSBmdW5jdGlvbiAodXJsKSB7XG4gIHZhciBpZHggPSB1cmwuaW5kZXhPZihcIjovL1wiKSArIDMsXG4gICAgc3RhY2ssXG4gICAgdG9SZW1vdmUsXG4gICAgcmVzdWx0O1xuICAvLyBSZW1vdmUgYWxsIGluc3RhbmNlcyBvZiAvLi9cbiAgdXJsID0gdXJsLnJlcGxhY2UoL1xcL1xcLlxcLy9nLCBcIi9cIik7XG4gIC8vV2VpcmQgYnVnIHdoZXJlIGluIGNjYSwgbWFuaWZlc3Qgc3RhcnRzIHdpdGggJ2Nocm9tZTovLy8vJ1xuICAvL1RoaXMgZm9yY2VzIHRoZXJlIHRvIG9ubHkgYmUgMiBzbGFzaGVzXG4gIHdoaWxlICh1cmwuY2hhckF0KGlkeCkgPT09IFwiL1wiKSB7XG4gICAgdXJsID0gdXJsLnNsaWNlKDAsIGlkeCkgKyB1cmwuc2xpY2UoaWR4ICsgMSwgdXJsLmxlbmd0aCk7XG4gIH1cblxuICAvLyBBZHZhbmNlIHRvIG5leHQgL1xuICBpZHggPSB1cmwuaW5kZXhPZihcIi9cIiwgaWR4KTtcbiAgLy8gUmVtb3ZpbmcgLi4vXG4gIHN0YWNrID0gdXJsLnN1YnN0cihpZHggKyAxKS5zcGxpdChcIi9cIik7XG4gIHdoaWxlIChzdGFjay5pbmRleE9mKFwiLi5cIikgIT09IC0xKSB7XG4gICAgdG9SZW1vdmUgPSBzdGFjay5pbmRleE9mKFwiLi5cIik7XG4gICAgaWYgKHRvUmVtb3ZlID09PSAwKSB7XG4gICAgICBzdGFjay5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFjay5zcGxpY2UoKHRvUmVtb3ZlIC0gMSksIDIpO1xuICAgIH1cbiAgfVxuICBcbiAgLy9SZWJ1aWxkIHN0cmluZ1xuICByZXN1bHQgPSB1cmwuc3Vic3RyKDAsIGlkeCk7XG4gIGZvciAoaWR4ID0gMDsgaWR4IDwgc3RhY2subGVuZ3RoOyBpZHggKz0gMSkge1xuICAgIHJlc3VsdCArPSBcIi9cIiArIHN0YWNrW2lkeF07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogUmVzb2x2ZSBVUkxzIHdoaWNoIGNhbiBiZSBhY2Nlc3NlZCB1c2luZyBzdGFuZGFyZCBIVFRQIHJlcXVlc3RzLlxuICogQG1ldGhvZCBodHRwUmVzb2x2ZXJcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gbWFuaWZlc3QgVGhlIE1hbmlmZXN0IFVSTC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byByZXNvbHZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBUaGUgcHJvbWlzZSB0byBjb21wbGV0ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBUaGUgcHJvbWlzZSB0byByZWplY3QuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgVVJMIGNvdWxkIGJlIHJlc29sdmVkLlxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUuaHR0cFJlc29sdmVyID0gZnVuY3Rpb24gKG1hbmlmZXN0LCB1cmwsIHJlc29sdmUsIHJlamVjdCkge1xuICB2YXIgcHJvdG9jb2xzID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiY2hyb21lXCIsIFwiY2hyb21lLWV4dGVuc2lvblwiLCBcInJlc291cmNlXCIsXG4gICAgICAgICAgICAgICAgICAgXCJhcHBcIl0sXG4gICAgZGlybmFtZSxcbiAgICBwcm90b2NvbElkeCxcbiAgICBwYXRoSWR4LFxuICAgIHBhdGgsXG4gICAgYmFzZSxcbiAgICByZXN1bHQ7XG5cbiAgaWYgKFJlc291cmNlLmhhc1NjaGVtZShwcm90b2NvbHMsIHVybCkpIHtcbiAgICByZXNvbHZlKFJlc291cmNlLnJlbW92ZVJlbGF0aXZlUGF0aCh1cmwpKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBcbiAgaWYgKCFtYW5pZmVzdCkge1xuICAgIHJlamVjdCgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoUmVzb3VyY2UuaGFzU2NoZW1lKHByb3RvY29scywgbWFuaWZlc3QpICYmXG4gICAgICB1cmwuaW5kZXhPZihcIjovL1wiKSA9PT0gLTEpIHtcbiAgICBkaXJuYW1lID0gbWFuaWZlc3Quc3Vic3RyKDAsIG1hbmlmZXN0Lmxhc3RJbmRleE9mKFwiL1wiKSk7XG4gICAgcHJvdG9jb2xJZHggPSBkaXJuYW1lLmluZGV4T2YoXCI6Ly9cIik7XG4gICAgcGF0aElkeCA9IHByb3RvY29sSWR4ICsgMyArIGRpcm5hbWUuc3Vic3RyKHByb3RvY29sSWR4ICsgMykuaW5kZXhPZihcIi9cIik7XG4gICAgcGF0aCA9IGRpcm5hbWUuc3Vic3RyKHBhdGhJZHgpO1xuICAgIGJhc2UgPSBkaXJuYW1lLnN1YnN0cigwLCBwYXRoSWR4KTtcbiAgICBpZiAodXJsLmluZGV4T2YoXCIvXCIpID09PSAwKSB7XG4gICAgICByZXNvbHZlKFJlc291cmNlLnJlbW92ZVJlbGF0aXZlUGF0aChiYXNlICsgdXJsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUoUmVzb3VyY2UucmVtb3ZlUmVsYXRpdmVQYXRoKGJhc2UgKyBwYXRoICsgXCIvXCIgKyB1cmwpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmVqZWN0KCk7XG59O1xuXG4vKipcbiAqIFJlc29sdmUgVVJMcyB3aGljaCBhcmUgc2VsZi1kZXNjcmliaW5nLlxuICogQG1ldGhvZCBudWxsUmVzb2x2ZXJcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gbWFuaWZlc3QgVGhlIE1hbmlmZXN0IFVSTC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byByZXNvbHZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBUaGUgcHJvbWlzZSB0byBjb21wbGV0ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBUaGUgcHJvbWlzZSB0byByZWplY3QuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgVVJMIGNvdWxkIGJlIHJlc29sdmVkLlxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUubnVsbFJlc29sdmVyID0gZnVuY3Rpb24gKG1hbmlmZXN0LCB1cmwsIHJlc29sdmUsIHJlamVjdCkge1xuICB2YXIgcHJvdG9jb2xzID0gW1wibWFuaWZlc3RcIl07XG4gIGlmIChSZXNvdXJjZS5oYXNTY2hlbWUocHJvdG9jb2xzLCB1cmwpKSB7XG4gICAgcmVzb2x2ZSh1cmwpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKHVybC5pbmRleE9mKCdkYXRhOicpID09PSAwKSB7XG4gICAgcmVzb2x2ZSh1cmwpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJlamVjdCgpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZSBtYW5pZmVzdCBjb250ZW50IGZyb20gYSBzZWxmLWRlc2NyaXB0aXZlIG1hbmlmZXN0IHVybC5cbiAqIFRoZXNlIHVybHMgYXJlIHVzZWQgdG8gcmVmZXJlbmNlIGEgbWFuaWZlc3Qgd2l0aG91dCByZXF1aXJpbmcgc3Vic2VxdWVudCxcbiAqIHBvdGVudGlhbGx5IG5vbi1DT1JTIHJlcXVlc3RzLlxuICogQG1ldGhvZCBtYW5pZmVzdFJldHJpZXZlclxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBtYW5pZmVzdCBUaGUgTWFuaWZlc3QgVVJMXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlIFRoZSBwcm9taXNlIHRvIGNvbXBsZXRlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0IFRoZSBwcm9taXNlIHRvIHJlamVjdC5cbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLm1hbmlmZXN0UmV0cmlldmVyID0gZnVuY3Rpb24gKG1hbmlmZXN0LCByZXNvbHZlLCByZWplY3QpIHtcbiAgdmFyIGRhdGE7XG4gIHRyeSB7XG4gICAgZGF0YSA9IG1hbmlmZXN0LnN1YnN0cigxMSk7XG4gICAgSlNPTi5wYXJzZShkYXRhKTtcbiAgICByZXNvbHZlKGRhdGEpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy5kZWJ1Zy53YXJuKFwiSW52YWxpZCBtYW5pZmVzdCBVUkwgcmVmZXJlbmNlZDpcIiArIG1hbmlmZXN0KTtcbiAgICByZWplY3QoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXRyaWV2ZSByZXNvdXJjZSBjb250ZW50cyB1c2luZyBhbiBYSFIgcmVxdWVzdC5cbiAqIEBtZXRob2QgeGhyUmV0cmlldmVyXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgcmVzb3VyY2UgdG8gZmV0Y2guXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlIFRoZSBwcm9taXNlIHRvIGNvbXBsZXRlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0IFRoZSBwcm9taXNlIHRvIHJlamVjdC5cbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLnhoclJldHJpZXZlciA9IGZ1bmN0aW9uICh1cmwsIHJlc29sdmUsIHJlamVjdCkge1xuICB2YXIgcmVmID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlZi5hZGRFdmVudExpc3RlbmVyKFwicmVhZHlzdGF0ZWNoYW5nZVwiLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKHJlZi5yZWFkeVN0YXRlID09PSA0ICYmIHJlZi5yZXNwb25zZVRleHQpIHtcbiAgICAgIHJlc29sdmUocmVmLnJlc3BvbnNlVGV4dCk7XG4gICAgfSBlbHNlIGlmIChyZWYucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgdGhpcy5kZWJ1Zy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgZmlsZSBcIiArIHVybCArIFwiOiBcIiArIHJlZi5zdGF0dXMpO1xuICAgICAgcmVqZWN0KHJlZi5zdGF0dXMpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMsIHJlc29sdmUsIHJlamVjdCksIGZhbHNlKTtcbiAgcmVmLm92ZXJyaWRlTWltZVR5cGUoXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICByZWYub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuICByZWYuc2VuZCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZTtcbiIsIi8qZ2xvYmFscyBjcnlwdG8sIFdlYktpdEJsb2JCdWlsZGVyLCBCbG9iLCBVUkwgKi9cbi8qZ2xvYmFscyB3ZWJraXRVUkwsIFVpbnQ4QXJyYXksIFVpbnQxNkFycmF5LCBBcnJheUJ1ZmZlciAqL1xuLypqc2xpbnQgaW5kZW50OjIsd2hpdGU6dHJ1ZSxicm93c2VyOnRydWUsbm9kZTp0cnVlLHNsb3BweTp0cnVlICovXG5cbi8qKlxuICogVXRpbGl0eSBtZXRob2QgdXNlZCB3aXRoaW4gdGhlIGZyZWVkb20gTGlicmFyeS5cbiAqIEBjbGFzcyB1dGlsXG4gKiBAc3RhdGljXG4gKi9cbnZhciB1dGlsID0ge307XG5cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gZm9yIGl0ZXJhdGluZyBvdmVyIGFuIGFycmF5IGJhY2t3YXJkcy4gSWYgdGhlIGZ1bmNcbiAqIHJldHVybnMgYSB0cnVlIHZhbHVlLCBpdCB3aWxsIGJyZWFrIG91dCBvZiB0aGUgbG9vcC5cbiAqIEBtZXRob2QgZWFjaFJldmVyc2VcbiAqIEBzdGF0aWNcbiAqL1xudXRpbC5lYWNoUmV2ZXJzZSA9IGZ1bmN0aW9uKGFyeSwgZnVuYykge1xuICBpZiAoYXJ5KSB7XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gYXJ5Lmxlbmd0aCAtIDE7IGkgPiAtMTsgaSAtPSAxKSB7XG4gICAgICBpZiAoYXJ5W2ldICYmIGZ1bmMoYXJ5W2ldLCBpLCBhcnkpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBAbWV0aG9kIGhhc1Byb3BcbiAqIEBzdGF0aWNcbiAqL1xudXRpbC5oYXNQcm9wID0gZnVuY3Rpb24ob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn07XG5cbi8qKlxuICogQ3ljbGVzIG92ZXIgcHJvcGVydGllcyBpbiBhbiBvYmplY3QgYW5kIGNhbGxzIGEgZnVuY3Rpb24gZm9yIGVhY2hcbiAqIHByb3BlcnR5IHZhbHVlLiBJZiB0aGUgZnVuY3Rpb24gcmV0dXJucyBhIHRydXRoeSB2YWx1ZSwgdGhlbiB0aGVcbiAqIGl0ZXJhdGlvbiBpcyBzdG9wcGVkLlxuICogQG1ldGhvZCBlYWNoUHJvcFxuICogQHN0YXRpY1xuICovXG51dGlsLmVhY2hQcm9wID0gZnVuY3Rpb24ob2JqLCBmdW5jKSB7XG4gIHZhciBwcm9wO1xuICBmb3IgKHByb3AgaW4gb2JqKSB7XG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgaWYgKGZ1bmMob2JqW3Byb3BdLCBwcm9wKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogU2ltcGxlIGZ1bmN0aW9uIHRvIG1peCBpbiBwcm9wZXJ0aWVzIGZyb20gc291cmNlIGludG8gdGFyZ2V0LFxuICogYnV0IG9ubHkgaWYgdGFyZ2V0IGRvZXMgbm90IGFscmVhZHkgaGF2ZSBhIHByb3BlcnR5IG9mIHRoZSBzYW1lIG5hbWUuXG4gKiBUaGlzIGlzIG5vdCByb2J1c3QgaW4gSUUgZm9yIHRyYW5zZmVycmluZyBtZXRob2RzIHRoYXQgbWF0Y2hcbiAqIE9iamVjdC5wcm90b3R5cGUgbmFtZXMsIGJ1dCB0aGUgdXNlcyBvZiBtaXhpbiBoZXJlIHNlZW0gdW5saWtlbHkgdG9cbiAqIHRyaWdnZXIgYSBwcm9ibGVtIHJlbGF0ZWQgdG8gdGhhdC5cbiAqIEBtZXRob2QgbWl4aW5cbiAqIEBzdGF0aWNcbiAqL1xudXRpbC5taXhpbiA9IGZ1bmN0aW9uKHRhcmdldCwgc291cmNlLCBmb3JjZSkge1xuICBpZiAoc291cmNlKSB7XG4gICAgdXRpbC5lYWNoUHJvcChzb3VyY2UsIGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgaWYgKGZvcmNlIHx8ICF1dGlsLmhhc1Byb3AodGFyZ2V0LCBwcm9wKSkge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gKiBHZXQgYSB1bmlxdWUgSUQuXG4gKiBAbWV0aG9kIGdldElkXG4gKiBAc3RhdGljXG4gKi9cbnV0aWwuZ2V0SWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGd1aWQgPSAnZ3VpZCcsXG4gICAgICBkb21haW4gPSAxMixcbiAgICAgIGJ1ZmZlcjtcbiAgLy8gQ2hyb21lIC8gRmlyZWZveC5cbiAgaWYgKHR5cGVvZiBjcnlwdG8gPT09ICdvYmplY3QnICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShkb21haW4pO1xuICAgIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYnVmZmVyKTtcbiAgICB1dGlsLmVhY2hSZXZlcnNlKGJ1ZmZlciwgZnVuY3Rpb24obikge1xuICAgICAgZ3VpZCArPSAnLScgKyBuO1xuICAgIH0pO1xuICAvLyBOb2RlXG4gIH0gZWxzZSBpZiAodHlwZW9mIGNyeXB0byA9PT0gJ29iamVjdCcgJiYgY3J5cHRvLnJhbmRvbUJ5dGVzKSB7XG4gICAgYnVmZmVyID0gY3J5cHRvLnJhbmRvbUJ5dGVzKGRvbWFpbik7XG4gICAgdXRpbC5lYWNoUmV2ZXJzZShidWZmZXIsIGZ1bmN0aW9uKG4pIHtcbiAgICAgIGd1aWQgKz0gJy0nICsgbjtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoZG9tYWluID4gMCkge1xuICAgICAgZ3VpZCArPSAnLScgKyBNYXRoLmNlaWwoMjU1ICogTWF0aC5yYW5kb20oKSk7XG4gICAgICBkb21haW4gLT0gMTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZ3VpZDtcbn07XG5cbi8qKlxuICogRW5jb2RlIGEgc3RyaW5nIGludG8gYSBiaW5hcnkgYXJyYXkgYnVmZmVyLCBieSB0cmVhdGluZyBlYWNoIGNoYXJhY3RlciBhcyBhXG4gKiB1dGYxNiBlbmNvZGVkIGNoYXJhY3RlciAtIHRoZSBuYXRpdmUgamF2YXNjcmlwdCBlbmNvZGluZy5cbiAqIEBtZXRob2Qgc3RyMmFiXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBzdHJpbmcgdG8gZW5jb2RlLlxuICogQHJldHVybnMge0FycmF5QnVmZmVyfSBUaGUgZW5jb2RlZCBzdHJpbmcuXG4gKi9cbnV0aWwuc3RyMmFiID0gZnVuY3Rpb24oc3RyKSB7XG4gIHZhciBsZW5ndGggPSBzdHIubGVuZ3RoLFxuICAgICAgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGxlbmd0aCAqIDIpLCAvLyAyIGJ5dGVzIGZvciBlYWNoIGNoYXJcbiAgICAgIGJ1ZmZlclZpZXcgPSBuZXcgVWludDE2QXJyYXkoYnVmZmVyKSxcbiAgICAgIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZmZlclZpZXdbaV0gPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgfVxuXG4gIHJldHVybiBidWZmZXI7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgYW4gYXJyYXkgYnVmZmVyIGNvbnRhaW5pbmcgYW4gZW5jb2RlZCBzdHJpbmcgYmFjayBpbnRvIGEgc3RyaW5nLlxuICogQG1ldGhvZCBhYjJzdHJcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IGJ1ZmZlciBUaGUgYnVmZmVyIHRvIHVud3JhcC5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBkZWNvZGVkIGJ1ZmZlci5cbiAqL1xudXRpbC5hYjJzdHIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgbmV3IFVpbnQxNkFycmF5KGJ1ZmZlcikpO1xufTtcblxuLyoqXG4gKiBBZGQgJ29uJyBhbmQgJ2VtaXQnIG1ldGhvZHMgdG8gYW4gb2JqZWN0LCB3aGljaCBhY3QgYXMgYSBsaWdodCB3ZWlnaHRcbiAqIGV2ZW50IGhhbmRsaW5nIHN0cnVjdHVyZS5cbiAqIEBjbGFzcyBoYW5kbGVFdmVudHNcbiAqIEBzdGF0aWNcbiAqL1xudXRpbC5oYW5kbGVFdmVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIGV2ZW50U3RhdGUgPSB7XG4gICAgbXVsdGlwbGU6IHt9LFxuICAgIG1heWJlbXVsdGlwbGU6IFtdLFxuICAgIHNpbmdsZToge30sXG4gICAgbWF5YmVzaW5nbGU6IFtdXG4gIH0sIGZpbHRlciwgcHVzaDtcblxuICAvKipcbiAgICogRmlsdGVyIGEgbGlzdCBiYXNlZCBvbiBhIHByZWRpY2F0ZS4gVGhlIGxpc3QgaXMgZmlsdGVyZWQgaW4gcGxhY2UsIHdpdGhcbiAgICogc2VsZWN0ZWQgaXRlbXMgcmVtb3ZlZCBhbmQgcmV0dXJuZWQgYnkgdGhlIGZ1bmN0aW9uLlxuICAgKiBAbWV0aG9kXG4gICAqIEBwYXJhbSB7QXJyYXl9IGxpc3QgVGhlIGxpc3QgdG8gZmlsdGVyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgbWV0aG9kIHRvIHJ1biBvbiBlYWNoIGl0ZW0uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gU2VsZWN0ZWQgaXRlbXNcbiAgICovXG4gIGZpbHRlciA9IGZ1bmN0aW9uKGxpc3QsIHByZWRpY2F0ZSkge1xuICAgIHZhciByZXQgPSBbXSwgaTtcblxuICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaSAtPSAxKSB7XG4gICAgICBpZiAocHJlZGljYXRlKGxpc3RbaV0pKSB7XG4gICAgICAgIHJldC5wdXNoKGxpc3Quc3BsaWNlKGksIDEpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogRW5xdWV1ZSBhIGhhbmRsZXIgZm9yIGEgc3BlY2lmaWMgdHlwZS5cbiAgICogQG1ldGhvZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdG8gVGhlIHF1ZXVlICgnc2luZ2xlJyBvciAnbXVsdGlwbGUnKSB0byBxdWV1ZSBvbi5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIHR5cGUgb2YgZXZlbnQgdG8gd2FpdCBmb3IuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXIgVGhlIGhhbmRsZXIgdG8gZW5xdWV1ZS5cbiAgICovXG4gIHB1c2ggPSBmdW5jdGlvbih0bywgdHlwZSwgaGFuZGxlcikge1xuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpc1snbWF5YmUnICsgdG9dLnB1c2goW3R5cGUsIGhhbmRsZXJdKTtcbiAgICB9IGVsc2UgaWYgKHRoaXNbdG9dW3R5cGVdKSB7XG4gICAgICB0aGlzW3RvXVt0eXBlXS5wdXNoKGhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzW3RvXVt0eXBlXSA9IFtoYW5kbGVyXTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgbWV0aG9kIHRvIGJlIGV4ZWN1dGVkIHdoZW4gYW4gZXZlbnQgb2YgYSBzcGVjaWZpYyB0eXBlIG9jY3Vycy5cbiAgICogQG1ldGhvZCBvblxuICAgKiBAcGFyYW0ge1N0cmluZ3xGdW5jdGlvbn0gdHlwZSBUaGUgdHlwZSBvZiBldmVudCB0byByZWdpc3RlciBhZ2FpbnN0LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBoYW5kbGVyIFRoZSBoYW5kbGVyIHRvIHJ1biB3aGVuIHRoZSBldmVudCBvY2N1cnMuXG4gICAqL1xuICBvYmoub24gPSBwdXNoLmJpbmQoZXZlbnRTdGF0ZSwgJ211bHRpcGxlJyk7XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgbWV0aG9kIHRvIGJlIGV4ZWN1dGUgdGhlIG5leHQgdGltZSBhbiBldmVudCBvY2N1cnMuXG4gICAqIEBtZXRob2Qgb25jZVxuICAgKiBAcGFyYW0ge1N0cmluZ3xGdW5jdGlvbn0gdHlwZSBUaGUgdHlwZSBvZiBldmVudCB0byB3YWl0IGZvci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaGFuZGxlciBUaGUgaGFuZGxlciB0byBydW4gdGhlIG5leHQgdGltZSBhIG1hdGNoaW5nIGV2ZW50XG4gICAqICAgICBpcyByYWlzZWQuXG4gICAqL1xuICBvYmoub25jZSA9IHB1c2guYmluZChldmVudFN0YXRlLCAnc2luZ2xlJyk7XG5cbiAgLyoqXG4gICAqIEVtaXQgYW4gZXZlbnQgb24gdGhpcyBvYmplY3QuXG4gICAqIEBtZXRob2QgZW1pdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgdHlwZSBvZiBldmVudCB0byByYWlzZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBheWxvYWQgb2YgdGhlIGV2ZW50LlxuICAgKi9cbiAgb2JqLmVtaXQgPSBmdW5jdGlvbih0eXBlLCBkYXRhKSB7XG4gICAgdmFyIGksIHF1ZXVlO1xuICAgIGlmICh0aGlzLm11bHRpcGxlW3R5cGVdKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5tdWx0aXBsZVt0eXBlXS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBpZiAodGhpcy5tdWx0aXBsZVt0eXBlXVtpXShkYXRhKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuc2luZ2xlW3R5cGVdKSB7XG4gICAgICBxdWV1ZSA9IHRoaXMuc2luZ2xlW3R5cGVdO1xuICAgICAgdGhpcy5zaW5nbGVbdHlwZV0gPSBbXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBxdWV1ZVtpXShkYXRhKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMubWF5YmVtdWx0aXBsZS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKHRoaXMubWF5YmVtdWx0aXBsZVtpXVswXSh0eXBlLCBkYXRhKSkge1xuICAgICAgICB0aGlzLm1heWJlbXVsdGlwbGVbaV1bMV0oZGF0YSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoaSA9IHRoaXMubWF5YmVzaW5nbGUubGVuZ3RoIC0gMTsgaSA+PSAwOyBpIC09IDEpIHtcbiAgICAgIGlmICh0aGlzLm1heWJlc2luZ2xlW2ldWzBdKHR5cGUsIGRhdGEpKSB7XG4gICAgICAgIHF1ZXVlID0gdGhpcy5tYXliZXNpbmdsZS5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHF1ZXVlWzBdWzFdKGRhdGEpO1xuICAgICAgfVxuICAgIH1cbiAgfS5iaW5kKGV2ZW50U3RhdGUpO1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gZXZlbnQgaGFuZGxlclxuICAgKiBAbWV0aG9kIG9mZlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgdHlwZSBvZiBldmVudCB0byByZW1vdmUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb24/fSBoYW5kbGVyIFRoZSBoYW5kbGVyIHRvIHJlbW92ZS5cbiAgICovXG4gIG9iai5vZmYgPSBmdW5jdGlvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICB0aGlzLm11bHRpcGxlID0ge307XG4gICAgICB0aGlzLm1heWJlbXVsdGlwbGUgPSBbXTtcbiAgICAgIHRoaXMuc2luZ2xlID0ge307XG4gICAgICB0aGlzLm1heWJlc2luZ2xlID0gW107XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmaWx0ZXIodGhpcy5tYXliZXNpbmdsZSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbVswXSA9PT0gdHlwZSAmJiAoIWhhbmRsZXIgfHwgaXRlbVsxXSA9PT0gaGFuZGxlcik7XG4gICAgICB9KTtcbiAgICAgIGZpbHRlcih0aGlzLm1heWJlbXVsdGlwbGUsIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1bMF0gPT09IHR5cGUgJiYgKCFoYW5kbGVyIHx8IGl0ZW1bMV0gPT09IGhhbmRsZXIpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICBkZWxldGUgdGhpcy5tdWx0aXBsZVt0eXBlXTtcbiAgICAgIGRlbGV0ZSB0aGlzLnNpbmdsZVt0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsdGVyKHRoaXMubXVsdGlwbGVbdHlwZV0sIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0gPT09IGhhbmRsZXI7XG4gICAgICB9KTtcbiAgICAgIGZpbHRlcih0aGlzLnNpbmdsZVt0eXBlXSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbSA9PT0gaGFuZGxlcjtcbiAgICAgIH0pO1xuICAgIH1cbiAgfS5iaW5kKGV2ZW50U3RhdGUpO1xufTtcblxuLyoqXG4gKiBXaGVuIHJ1biB3aXRob3V0IGEgd2luZG93LCBvciBzcGVjaWZpY2FsbHkgcmVxdWVzdGVkLlxuICogTm90ZTogRGVjbGFyYXRpb24gY2FuIGJlIHJlZGVmaW5lZCBpbiBmb3JjZU1vZHVsZUNvbnRleHQgYmVsb3cuXG4gKiBAbWV0aG9kIGlzTW9kdWxlQ29udGV4dFxuICogQGZvciB1dGlsXG4gKiBAc3RhdGljXG4gKi9cbi8qIUBwcmVzZXJ2ZSBTdGFydE1vZHVsZUNvbnRleHREZWNsYXJhdGlvbiovXG51dGlsLmlzTW9kdWxlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpO1xufTtcblxuLyoqXG4gKiBHZXQgYSBCbG9iIG9iamVjdCBvZiBhIHN0cmluZy5cbiAqIFBvbHlmaWxscyBpbXBsZW1lbnRhdGlvbnMgd2hpY2ggZG9uJ3QgaGF2ZSBhIGN1cnJlbnQgQmxvYiBjb25zdHJ1Y3RvciwgbGlrZVxuICogcGhhbnRvbWpzLlxuICogQG1ldGhvZCBnZXRCbG9iXG4gKiBAc3RhdGljXG4gKi9cbnV0aWwuZ2V0QmxvYiA9IGZ1bmN0aW9uKGRhdGEsIHR5cGUpIHtcbiAgaWYgKHR5cGVvZiBCbG9iICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBXZWJLaXRCbG9iQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgYnVpbGRlciA9IG5ldyBXZWJLaXRCbG9iQnVpbGRlcigpO1xuICAgIGJ1aWxkZXIuYXBwZW5kKGRhdGEpO1xuICAgIHJldHVybiBidWlsZGVyLmdldEJsb2IodHlwZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6IHR5cGV9KTtcbiAgfVxufTtcblxuLyoqXG4gKiBGaW5kIGFsbCBzY3JpcHRzIG9uIHRoZSBnaXZlbiBwYWdlLlxuICogQG1ldGhvZCBzY3JpcHRzXG4gKiBAc3RhdGljXG4gKi9cbnV0aWwuc2NyaXB0cyA9IGZ1bmN0aW9uKGdsb2JhbCkge1xuICByZXR1cm4gZ2xvYmFsLmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6dHJ1ZSovXG5cbnZhciBwcm92aWRlcnMgPSBbXG4gIHJlcXVpcmUoJy4uLy4uL3Byb3ZpZGVycy9jb3JlL2NvcmUudW5wcml2aWxlZ2VkJyksXG4gIHJlcXVpcmUoJy4uLy4uL3Byb3ZpZGVycy9jb3JlL2VjaG8udW5wcml2aWxlZ2VkJyksXG4gIHJlcXVpcmUoJy4uLy4uL3Byb3ZpZGVycy9jb3JlL2NvbnNvbGUudW5wcml2aWxlZ2VkJyksXG4gIHJlcXVpcmUoJy4uLy4uL3Byb3ZpZGVycy9jb3JlL3BlZXJjb25uZWN0aW9uLnVucHJpdmlsZWdlZCcpLFxuICByZXF1aXJlKCcuLi8uLi9wcm92aWRlcnMvY29yZS9jb3JlLnJ0Y3BlZXJjb25uZWN0aW9uJyksXG4gIHJlcXVpcmUoJy4uLy4uL3Byb3ZpZGVycy9jb3JlL2NvcmUucnRjZGF0YWNoYW5uZWwnKSxcbiAgcmVxdWlyZSgnLi4vLi4vcHJvdmlkZXJzL2NvcmUvc3RvcmFnZS5sb2NhbHN0b3JhZ2UnKSxcbiAgcmVxdWlyZSgnLi4vLi4vcHJvdmlkZXJzL2NvcmUvY29yZS52aWV3JyksXG4gIHJlcXVpcmUoJy4uLy4uL3Byb3ZpZGVycy9jb3JlL2NvcmUub2F1dGgnKSxcbiAgcmVxdWlyZSgnLi4vLi4vcHJvdmlkZXJzL2NvcmUvd2Vic29ja2V0LnVucHJpdmlsZWdlZCcpXG5dO1xuXG5mdW5jdGlvbiBnZXRGcmVlZG9tU2NyaXB0KCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBzY3JpcHQ7XG4gIGlmICh3aW5kb3cuZG9jdW1lbnQuY3VycmVudFNjcmlwdCkge1xuICAgIC8vIE5ldyBicm93c2VyIEFQSVxuICAgIHNjcmlwdCA9IHdpbmRvdy5kb2N1bWVudC5jdXJyZW50U2NyaXB0LnNyYztcbiAgfSBlbHNlIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9PSBcImNvbXBsZXRlXCIgJiZcbiAgICAgICAgICAgICBkb2N1bWVudC5yZWFkeVN0YXRlICE9PSBcImxvYWRlZFwiKSB7XG4gICAgLy8gSW5jbHVkZWQgaW4gSFRNTCBvciB0aHJvdWdoIGRvY3VtZW50LndyaXRlXG4gICAgc2NyaXB0ID0gd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcbiAgICBzY3JpcHQgPSBzY3JpcHRbc2NyaXB0Lmxlbmd0aCAtIDFdLnNyYztcbiAgfSBlbHNlIHtcbiAgICAvLyBMb2FkZWQgdGhyb3VnaCBkb20gbWFuaXB1bGF0aW9uIG9yIGFzeW5jLlxuICAgIHNjcmlwdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICBcInNjcmlwdFtzcmMqPSdmcmVlZG9tLmpzJ10sc2NyaXB0W3NyYyo9J2ZyZWVkb20tJ11cIlxuICAgICk7XG4gICAgaWYgKHNjcmlwdC5sZW5ndGggIT09IDEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgZGV0ZXJtaW5lIGZyZWVkb20uanMgc2NyaXB0IHRhZy5cIik7XG4gICAgfVxuICAgIHNjcmlwdCA9IHNjcmlwdFswXS5zcmM7XG4gIH1cbiAgcmV0dXJuIHNjcmlwdDtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5mcmVlZG9tID0gcmVxdWlyZSgnLi4vZW50cnknKS5iaW5kKHt9LCB7XG4gICAgbG9jYXRpb246IHdpbmRvdy5sb2NhdGlvbi5ocmVmLFxuICAgIHBvcnRUeXBlOiByZXF1aXJlKCcuLi9saW5rL3dvcmtlcicpLFxuICAgIHNvdXJjZTogZ2V0RnJlZWRvbVNjcmlwdCgpLFxuICAgIHByb3ZpZGVyczogcHJvdmlkZXJzLFxuICAgIG9hdXRoOiBbXG4gICAgICByZXF1aXJlKCcuLi8uLi9wcm92aWRlcnMvb2F1dGgvb2F1dGgubG9jYWxwYWdlYXV0aCcpLFxuICAgICAgcmVxdWlyZSgnLi4vLi4vcHJvdmlkZXJzL29hdXRoL29hdXRoLnJlbW90ZXBhZ2VhdXRoJylcbiAgICBdXG4gIH0pO1xufSBlbHNlIHtcbiAgcmVxdWlyZSgnLi4vZW50cnknKSh7XG4gICAgaXNNb2R1bGU6IHRydWUsXG4gICAgcG9ydFR5cGU6IHJlcXVpcmUoJy4uL2xpbmsvd29ya2VyJyksXG4gICAgcHJvdmlkZXJzOiBwcm92aWRlcnMsXG4gICAgZ2xvYmFsOiBnbG9iYWxcbiAgfSk7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
