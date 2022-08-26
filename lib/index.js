const objectRegistry = new WeakMap();

const events = o => {
	if (!objectRegistry.has(o)) {
		objectRegistry.set(o, {});
	}
	return objectRegistry.get(o);
}

const WirejsEvent = function (singleFire, o, a) {

	this.target = o;
	this.action = a;
	this.subscribers = [];
	this.interceptors = [];
	this.fired = 0;
	this.singleFire = singleFire || false;
	this.args = [];

	this.register = function (fn) {
		if (this.singleFire && this.fired > 0) {
			fn();
		} else {
			this.subscribers.push(fn);
		}
		return this;
	}; // register()

	this.then = this.register;
	this.and = this.then;

	this.fire = function (arg1, arg2, etc) {
		this.args = arguments;
		this.fireWithInterception();
		this.fired += 1;
		return this;
	}; // fire()

	this.fireOnce = function(arg1, arg2, etc) {
		this.singleFire = true;
		return this.fire.apply(this, arguments);
	}; // fireOnce()

	this.fireWithInterception = function (i) {
		var i = i || 0;

		if (typeof (this.interceptors[i]) == 'function') {
			var _t = this;
			this.interceptors[i]({
			    /* include other/all properties of _t as necessary */
                arguments: _t.args,
				resume: function () {
				    _t.fireWithInterception(i + 1);
				}
			});
			return;
		}

		this.fired += 1;
		var firedFns = [];

		while (this.subscribers.length > 0) {
			var fn = this.subscribers.pop();
			if (typeof(fn) !== 'function') continue;
			fn.apply(null, this.args);
			firedFns.push(fn);
		}

		if (!this.singleFire) {
			this.subscribers = firedFns;
		}
	}; // fire()

	this.intercept = function (fn) {
		if (typeof (fn) === 'function') {
			this.interceptors.push(fn);
		}
	}; // intercept()
}; // WirejsEvent()

const on = function (o, eventName, f, singleFire = false) {
	// todo: add other enumerable types:
	if (o instanceof Array || o instanceof NodeList) {
		var _o = [];
		for (var i = 0; i < o.length; i++) {
			if (o instanceof Element || o instanceof Node) {
				_o.push(o[i]);
			}
		}
		var registry = {
			count: _o.length,
			fired: 0,
			fn: f,
			singleFire: singleFire,
			fire: function () {
				this.fired++;
				if (this.fired >= this.count) {
					on(this, 'complete').fire();
				}
			},

			// for debugging and/or monitoring
			objects: _o,
			eventName
		};

		if (_o.length > 0) {
			for (var i = 0; i < _o.length; i++) {
				on(_o[i], eventName, function () { registry.fire(); }, singleFire);
			}
		} else {
			registry.fire();
		}

		return on(registry, 'complete');
	}

	const objectEvents = events(o);

	if (typeof (objectEvents[eventName]) === 'undefined') {
		objectEvents[eventName] = new WirejsEvent(singleFire, o, eventName);
	}

	if (typeof(f) == 'function') {
		objectEvents[eventName].register(f);
	}

	return objectEvents[eventName];
};

const onready = function (o, f) {
	return on(o, 'ready', f, true);
};

const once = function(object, name) {
	return on(object, name, undefined, true);
}

const upon = function(test, fn) {
	if (typeof(test) == 'function' && test()) {
		fn();
	} else if (typeof(test) == 'string' && window[test]) {
		fn();
	} else {
		setTimeout(function() { upon(test, fn); }, 50);
	}
};

module.exports = {
	on, once, onready, upon
}