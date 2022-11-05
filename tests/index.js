
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

QUnit.test("once() : single-fire events subscribers are called exactly once", async function (assert) {
	var o = {};
	var s1 = 0;
	var s2 = 0;

	once(o, 'action').then(function () { s1++; }, true);
	once(o, 'action').then(function () { s2++; }, true);
	once(o, 'action').fire()

	await Promise.resolve();

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

QUnit.test("onready() operates like a single-fire event", async function (assert) {
	var o = {};
	var s1 = 0;
	var s2 = 0;

	onready(o).then(function () { s1++; });
	onready(o).then(function () { s2++; });
	onready(o).fire();

	await Promise.resolve();

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

QUnit.test("Event streams can be stopped with stop()", function (assert) {
	const o = {};
	let fired = 0;

	const stream = on(o, 'happening').then(() => fired++);

	// sanity check
	on(o, 'happening').fire();
	assert.equal(fired, 1, "the stream should have fired once");

	// test
	stream.stop();
	on(o, 'happening').fire();

	assert.equal(fired, 1, "the stream should not have fired after ending");
});

QUnit.test("Event streams can be canceled by an `until` condition", function (assert) {
	// In other words, the stream can be auto-stopped when a given
	// object ceases to exist.

	const o = {};
	let fired = 0;

	on(o, 'happening').then(() => fired++).until(() => fired > 1);

	// sanity check
	on(o, 'happening').fire();
	on(o, 'happening').fire();
	on(o, 'happening').fire();
	on(o, 'happening').fire();
	assert.equal(fired, 2, "the stream should have fired exactly twice");
});
