# Signals

[![Static Badge](https://img.shields.io/badge/github-gray?logo=github)
](https://github.com/leonardoraele/signals)
[![NPM Version](https://img.shields.io/npm/v/%40leonardoraele%2Fsignals)
](https://www.npmjs.com/package/signals)
[![GitHub License](https://img.shields.io/github/license/leonardoraele/signals)](./LICENSE.txt)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/signals)](https://bundlephobia.com/package/signals)

My own implementation of JavaScript signals, with transparent effect scheduling.

This is intended for apps not based on frontend frameworks that still want to use signals to track state dependencies.

## Features

- **Transparent Effect Scheduling**: You decide when effects run, which can be immediately, or later.
- **Lazy Computed States.** Computed states are evaluated only when needed.
- **Supports `AbortSignal`.** It can be used to dispose of effects.
- **Nested Effects.** Create effects within other effects.
- **TypeScript Support**: Fully typed.

## Installation

```bash
npm install @leonardoraele/signals
```

## Usage

### `SignalState`

A `SignalState` is a wrapper around a mutable value, and it emits events whenever the value changes.

```js
import { SignalState } from '@leonardoraele/signals';

const state = new SignalState(1);

console.log(state.value); // 1

state.events.on('change', (newValue, oldValue) => {
	console.log({ newValue, oldValue });
});

state.value = 2; // { newValue: 2, oldValue: 1 }
```

### `SignalComputed`

A computed signal, defined by a function. It keeps track of the signals used within the expression and automatically updates its value when any of those signals change. Computed signals are lazy, the function is only executed when the its `value` property is accessed.

```js
import { SignalState, SignalComputed } from '@leonardoraele/signals';

const state = new SignalState(2);
const computed = new SignalComputed(() => state.value * 2);

console.log(computed.value); // 4

state.value = 3;

console.log(computed.value); // 6
```

You can also create computed signals that depend on other computed signals:

```js
const state = new SignalState(2);
const double = new SignalComputed(() => state.value * 2);
const textValue = new SignalComputed(() => String(double.value));
```

### `SignalEffect`

Effects are functions that automatically keep track of the signals it uses. When those signals change, the effect becomes *dirty*, meaning it should be re-evaluated. You can control when the effect runs by manually calling `effect.reevaluate()`, or have it be called immediately (but asynchronously) when it becomes dirty.

Immediate effect:

```js
const message = new State('Signals are cool');

// Create an effect that reruns immediately after the message changes, asynchronously.
const effect = SignalEffect.createImmediate(() => console.log(message.value));

// ...later, call `effect.dispose()` to destroy the effect object,
// freeing resources and stopping it from responding to signal changes.
effect.dispose();
```

Manual effect scheduling:

```js
import { SignalState, SignalEffect } from '@leonardoraele/signals';

const message = new SignalState('Signals are cool');
const effect = new SignalEffect(() => console.log(message.value));

// Changing the depending signal makes the effect become dirty,
// but it won't run immediately.
message.value = 'Signals are awesome';

// Reevaluates the effect. It will run now, synchronously, if it is dirty.
effect.reevaluate(); // Effect runs

// You can call `effect.reevaluate()` multiple times. The effect will only be rerun if it is dirty.
// At this point, the effect is not dirty anymore, so calling `effect.reevaluate()` will not run it.
effect.reevaluate(); // Effect not run

// You can also make multiple changes to the depending signals before reevaluating the effect.
// The effect will only run when `effect.reevaluate()` is called.
message.value = 'Signals are fantastic';
message.value = 'Signals are incredible';
message.value = 'Signals are extraordinary';

effect.reevaluate(); // Effect runs

// Output:
// Signals are cool
// Signals are awesome
// Signals are extraordinary
```

## API Reference

TBD (for now, refer to the `*.d.ts` and `*.test.ts` files)

## License

This project is licensed under the MIT License.
See the [LICENSE.txt](./LICENSE.txt) file for the license's full text.
