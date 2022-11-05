# wirejs-events

A simple events/observable library.

In all honesty, it was copy-pasted from a project I did well before
the days of zen-observable. And I use it to avoid re-writing a very
small number of LOC. But, hey. Here it is. 

## Basics

Here's sort of how to use it.

```js
const { on } = require('wirejs-events');

// subscribe
on(someObject, 'eventName').then(() => {
	console.log('hey yeah. it did the thing.');
});

// fire
on(someObject, 'eventName').fire();
```

Yep. You can pass things through the event as well.

```js
const { on } = require('wirejs-events');

// subscribe
on(someObject, 'eventName').then((a, b) => {
	console.log('Received', a, b);
});

// fire
on(someObject, 'eventName').fire(
	"first something",
	"second something"
);
```

What's that you say? You just want to know if a thing happened
**at some time in the past!??** Sure.

```js
const { once } = require('wirejs-events');

// fire
once(someObject, 'eventName').fire();

// subscribe
once(someObject, 'eventName').then(() => {
	console.log("the thing happened. or already happened. it doesn't matter.")
});
```

Unsubscribe you say?

Umm ... well no. Not really. Maybe later.

### Contributing

Really!?

Ok. Umm ... yeah. Do this:

```
git clone git@github.com:svidgen/wirejs-events.git wirejs-events
cd wirejs-events
npm install
```

And run the tests.

**In the web**

```
npm run test:web
```

**Or in the CLI**

```
npm run test
```

And then just write code and stuff. (And submit a pull request.)