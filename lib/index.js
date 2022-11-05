const objectRegistry = new WeakMap();

/**
 * Gets the map of named events for an object. If it doesn't exist yet,
 * creates it.
 * 
 * The mapping is weak &mdash; it alone will *not* keep the object in memory.
 * 
 * @param {*} o Any object
 * @returns {{[string]: NamedEvent}} Events registered for the object
 */
const events = o => {
	if (!objectRegistry.has(o)) {
		objectRegistry.set(o, {});
	}
	return objectRegistry.get(o);
};

/**
 * An event -> subscriber stream handle.
 */
class EventStream {

	/**
	 * Creates a handle between the given `event` and `subscriber` to provide
	 * concrete control over the relationship.
	 * 
	 * @param {NamedEvent} event 
	 * @param {Function} subscriber 
	 */
	constructor(event, subscriber) {
		this.event = event;
		this.subscriber = subscriber;

		/**
		 * If present, this is an intermediate callback used
		 * to self-unsubscribe.
		 */
		this.proxy = undefined;
	}

	/**
	 * Stop sending this stream's events to the subscriber.
	 */
	stop() {
		this.proxy ? this.proxy.stop() : this.event.disconnect(this.subscriber);

		// clear everything. the stream is dead and shall not be used again.
		this.event = undefined;
		this.subscriber = undefined;
		this.proxy = undefined;
	};

	/**
	 * When the next event arrives, remove the stream instead if this
	 * condition returns a truthy value.
	 * 
	 * Repeated calls to `until()` will *replace* existing "until" conditions.
	 * 
	 * @param {*} o Function that should return a falsey value as long as
	 * events are still desired.
	 */
	until(isCanceled) {
		// the mechanism for this is to just end the original stream and
		// create a new one that knows how to proxy events and cancel itself.
		if (typeof isCanceled !== 'function') {
			throw new Error("`isCanceled` must be a function!");
		}

		// ok. so, disconnect the existing subscriber.
		this.proxy ? this.proxy.stop() : this.event.disconnect(this.subscriber);

		// and proxy it.
		this.proxy = this.event.then((...args) => {
			if (isCanceled()) {
				this.proxy.stop();
			} else {
				this.subscriber(...args);
			}
		});

		return this;
	}
}

class NamedEvent {
	subscribers = [];
	interceptors = [];
	_internals_hasFired = false;

	/**
	 * Invokes the given callback every time the event fires until
	 * explicitly stopped.
	 * 
	 * @param {Function} subscriber Callback function.
	 * @returns {EventStream}
	 */
	then(subscriber) {
		this.subscribers.push(subscriber);
		return new EventStream(this, subscriber);
	}

	/**
	 * Resolves once the event has *ever* fired. This could be "immediately"
	 * or some time in the future.
	 * 
	 * Resolves once and only once per caller.
	 * 
	 * @returns {Promise<true>}
	 */
	get hasFired() {
		return new Promise(resolve => {
			if (this._internals_hasFired) {
				resolve(true);
				return;
			}
			const stream = this.then(() => {
				stream.stop();
				resolve(true);
			});
		});
	}

	/**
	 * Removes a subscriber from the event, stopping it from receiving any
	 * more event messages.
	 * 
	 * @param {Function} subscriber 
	 */
	disconnect(subscriber) {
		this.subscribers = this.subscribers.filter(s => s !== subscriber);
	}

	/**
	 * Calls all subscribers with the given arguments.
	 * 
	 * @param  {...any} args Arguments to send to all subscribers.
	 */
	fire(...args) {
		this._internals_hasFired = true;
		for (const subscriber of this.subscribers) {
			if (typeof(subscriber) !== 'function') continue;
			subscriber(...args);
		}
	}
};

/**
 * @param {any} target
 * @param {string} eventName 
 * @returns {NamedEvent}
 */
const on = function (target, eventName) {
	const objectEvents = events(target);

	if (typeof (objectEvents[eventName]) === 'undefined') {
		objectEvents[eventName] = new NamedEvent();
	}

	return objectEvents[eventName];
};

const onready = function (target) {
	return once(target, 'ready');
};

const once = function(target, eventName) {
	const event = on(target, eventName);
	return {
		then: callback => event.hasFired.then(callback),
		fire: (...args) => event.fire(...args)
	};
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