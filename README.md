# Signals

My own implementation of JavaScript signals, with transparent effect scheduling.

This is intended for apps not based on frontend frameworks that still want to use signals to track state dependencies.

## Features

- **Transparent Effect Scheduling**: You decide when effects run, which can be immediately, or later.
- **Lazy Computed States.** Computed states are evaluated only when needed.
<!-- - **Lightweight**: Minimal overhead with a focus on performance. -->
- **Supports `AbortSignal`.** It can be used to dispose of effects.
- **TypeScript Support**: Fully typed.

## Installation

```bash
npm install @leonardoraele/signals
```

## Usage

### State

A `State` is a wrapper over a value, and it emites events when the value changes.

```js
import { State } from '@leonardoraele/signals';

const state = new State(1);

console.log(state.value); // 1

state.events.on('change', (newValue, oldValue) => {
	console.log({ newValue, oldValue });
});

state.value = 2; // { newValue: 2, oldValue: 1 }
```

### Computed States

Create computed states by combining one or more other states. Computed states are automatically updated when their dependencies change. The function runs lazily, only when the `value` property is accessed.

```js
import { State, Computed } from '@leonardoraele/signals';

const state = new State(2);
const computed = new Computed(() => state.value * 2);

console.log(computed.value); // 4

state.value = 3;

console.log(computed.value); // 6
```

You can also create computed states that depend on other computed states.

```js
const state = new State(2);
const double = new Computed(() => state.value * 2);
const textValue = new Computed(() => String(double.value));
```

### Effects

Effects are functions that automatically track change of the values they depend on. When the value of a dependency changes, it is said that the effect becomes *dirty*.

```js
import { State, Effect } from '@leonardoraele/signals';

const message = new State('Signals are cool');
const effect = new Effect(() => console.log(message.value)); // Prints the message immediately

// Later on, call `effect.reevaluate()` and the effect function will rerun
// only if the effect is dirty.

effect.reevaluate(); // Prints the current value of `message`, if it has changed.

// Alternativelly, you can listen to `dirty` updates to be notified when
// dependencies change:

effect.events.on('dirty', () => console.log(message.value)); // Prints the new message immediately when it changes.
```

Alternatively, if you want the effect to run immediately, you can use the `Effect.createImmediate` function:

```js
const message = new State('Signals are cool');
Effect.createImmediate(() => console.log(message.value)); // Reruns whenever the message changes, asynchronously.
```

## API Reference

TBD (for now, refer to the `*.d.ts` typing files)

## License

This project is licensed under the MIT License.
See the [LICENSE.txt](./LICENSE.txt) file for the license's full text.
