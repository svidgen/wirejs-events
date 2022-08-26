
const QUnit = require('qunit');

let fixture = document.createElement('div');
document.body.appendChild(fixture);

const { on, once, onready, upon } = require('../lib');

QUnit.test("on() : subscribers are called exactly once per fire()", function (assert) {
	var o = {};
	var s1 = 0;
	var s2 = 0;

	on(o, 'action').then(function () { s1++; });
	on(o, 'action').then(function () { s2++; });
	on(o, 'action').fire()

	assert.ok(s1 >= 1, "first subscriber notified at least once");
	assert.ok(s1 <= 1, "first subscriber noticed only once");
	assert.ok(s2 >= 1, "second subscriber notified at least once");
	assert.ok(s2 <= 1, "second subscriber noticed only once");

	on(o, 'action').fire();
	assert.ok(s1 >= 2, "first subscriber was notified at least once on a subsequent fire()");
	assert.ok(s1 <= 2, "first subscriber was notified only once on a subsequent fire()");
	assert.ok(s2 >= 2, "second subscriber was notified at least once on a subsequent fire()");
	assert.ok(s2 <= 2, "second subscriber was notified only once on a subsequent fire()");

});

QUnit.test("once() : single-fire events subscribers are called exactly once", function (assert) {
	var o = {};
	var s1 = 0;
	var s2 = 0;

	once(o, 'action').then(function () { s1++; }, true);
	once(o, 'action').then(function () { s2++; }, true);
	once(o, 'action').fire()

	assert.equal(s1, 1, "first subscriber notified exactly once");
	assert.equal(s2, 1, "second subscriber notified exactly once");

	once(o, 'action').fire();
	assert.equal(s1, 1, "first subscriber was [correctly] not re-notified on a subsequent fire()");
	assert.equal(s2, 1, "second subscriber was [correctly] not re-notified on a subsequent fire()");

});

QUnit.test("on() with immediate callback passes parameters", function(assert) {
	var o = {};
	var a = null;
	var b = null;
	var c = null;

	on(o, 'action').then(function(_a, _b, _c) { a = _a; b = _b; c = _c; });
	on(o, 'action').fire(1,2,3);

	assert.ok(a === 1 && b === 2 && c === 3, "all parameters were received by the subscriber");
});

QUnit.test("on() with delayed callback passes parameters", async function(assert) {
	var o = {};
	var a = null;
	var b = null;
	var c = null;

	on(o, 'action').then(function(_a, _b, _c) { a = _a; b = _b; c = _c; });

	return new Promise(resolve => {
		setTimeout(function() {
			on(o, 'action').fire(1,2,3);
			assert.ok(a === 1 && b === 2 && c === 3, "all parameters were received by the subscriber");
			resolve();
		}, 50);
	})
});

QUnit.test("on().intercept(interceptor) stops an event", function (assert) {
	var o = {};
	var subscriberCalled = 0;
	var interceptorCalled = 0;

	on(o, 'action').then(function () { subscriberCalled++; });
	on(o, 'action').intercept(function (evt) { interceptorCalled++; });
	on(o, 'action').fire();

	assert.equal(interceptorCalled, 1, "the interceptor was called");
	assert.equal(subscriberCalled, 0, "the subscriber was not called");
});

QUnit.test("on().intercept(interceptor) passes a resume()able event [proxy] to the interceptor", function (assert) {
	var o = {};
	var subscriberCalled = 0;
	var interceptorCalled = 0;

	on(o, 'action').then(function () { subscriberCalled = subscriberCalled * 2; });
	on(o, 'action').intercept(function (evt) { interceptorCalled = 1; subscriberCalled = 1; evt.resume(); });
	on(o, 'action').fire();

	assert.equal(interceptorCalled, 1, "the interceptor was called");
	assert.equal(subscriberCalled, 2, "the subscriber called, and the interceptor was called first");
});

QUnit.test("on().intercept(interceptor) succeeds with multiple true-returning intercetpors", function (assert) {
	var o = {};
	var subscriberCalled = 0;
	var interceptorCalled = 0;

	on(o, 'action').then(function () { subscriberCalled = subscriberCalled * 2; });
	on(o, 'action').intercept(function (evt) { interceptorCalled++; subscriberCalled++; evt.resume(); });
	on(o, 'action').intercept(function (evt) { interceptorCalled++; subscriberCalled++; evt.resume(); });
	on(o, 'action').fire();

	assert.equal(interceptorCalled, 2, "both interceptors were called");
	assert.equal(subscriberCalled, 4, "the subscriber called, and both interceptors were called first");
});

QUnit.test("on().intercept(interceptor) stops entirely on the first non-resuming interceptor", function (assert) {
	var o = {};
	var subscriberCalled = 0;
	var interceptorCalled = 0;

	on(o, 'action').then(function () { subscriberCalled++; });
	on(o, 'action').intercept(function (evt) { interceptorCalled++; });
	on(o, 'action').intercept(function (evt) { interceptorCalled++; evt.resume(); });
	on(o, 'action').fire();

	assert.equal(interceptorCalled, 1, "only one interceptor was called");
	assert.equal(subscriberCalled, 0, "the subscriber was not called");
});

QUnit.test("onready() operates like a single-fire event", function (assert) {
	var o = {};
	var s1 = 0;
	var s2 = 0;

	onready(o).then(function () { s1++; });
	onready(o).then(function () { s2++; });
	onready(o).fire();

	assert.ok(s1 == 1, "first subscriber notified exactly once");
	assert.ok(s2 == 1, "second subscriber notified exactly once");

	onready(o).fire();
	assert.ok(s1 == 1, "first subscriber was [correctly] not re-notified on a subsequent fire()");
	assert.ok(s2 == 1, "second subscriber was [correctly] not re-notified on a subsequent fire()");

});

QUnit.test("upon() performs callback immediately when possible", function (assert) {
	var r = false;
	upon(function () { return true; }, function () { r = true; });
	assert.ok(r, "immediately performed callback for a test that always returns true");
});

QUnit.test("upon() doesn't prematurely perform callback on delayed test-conditions", function (assert) {
	var t = false;
	var r = false;
	setTimeout(function () { t = true; }, 1000);
	upon(function () { return t; }, function () { r = true; });
	assert.ok(r === false, "didn't prematurely perform callback");
});

QUnit.test("upon() performs callback 'soon' after a delayed test-condition is true", async function (assert) {
	return new Promise(resolve => {
		var startTime = (new Date()).getTime();
		var endTime = 0;
		setTimeout(function () { endTime = (new Date()).getTime(); }, 200);
	
		upon(function () { return endTime > startTime; }, function () {
			var fireTime = (new Date()).getTime();
			assert.ok(true, "callback was called");
			assert.ok(fireTime - endTime < 100, "less than 100 ms passed between state change and callback");
			resolve();
		});
	})
});

QUnit.test("Objects with on() events can be serialized without pollution", function (assert) {
	const o = {
		value: 'abc'
	};

	on(o, 'someEvent').then(() => {
		// do nothing
	});

	const serialization = JSON.stringify(o);
	const deserialized = JSON.parse(serialization);

	assert.deepEqual(o, deserialized);
});