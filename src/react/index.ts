import { useEffect, useMemo, useState } from 'react';
import { Computed } from '../computed.js';
import { Effect } from '../effect.js';
import { State } from '../state.js';
import { useManualRerender } from './manual.js';

/** Creates a signal, and rerenders the component whenever the signal changes. This is just like `useState`, but using
 * signals instead. */
export function useSignalState<T>(initialValue: T|(() => T)): State<T> {
	const [state, setState] = useState<T>(initialValue);
	return useMemo(() => {
		const signal = new State<T>(state);
		signal.events.on('change', newValue => setState(newValue));
		return signal;
	}, []);
}

/**
 * Creates a computed value that depends on signals. Whenever a dependant signal changes, the component rerenders and
 * the computed value is recalculated.
 *
 * You can also pass an array of explicit dependencies, as is traditional for react hooks. The computed value is
 * recalculated whenever any of the dependencies change.
 */
export function useSignalComputed<T>(callbackfn: () => T, deps: any[] = []): T {
	const rerender = useManualRerender();
	const computed = useMemo(() => new Computed(callbackfn), deps);
	useEffect(() => {
		if (computed.dirty) {
			rerender();
		}
		computed.events.on('dirty', rerender);
		return () => computed.events.off('dirty', rerender);
	}, [computed]);
	return computed.value;
}

/**
 * Creates an effect with the lifecycle bound to the component. The effect runs when the component mounts, similar to
 * `useEffect`, and again asynchronously whenever a dependant signal changes. The effect is disposed when the component
 * unmounts.
 *
 * This hook also accepts an array of explicit dependencies, as is traditional for react hooks. If one of the
 * dependencies changes after a rerender, the effect is re-evaluated.
 */
export function useSignalEffect(callbackfn: () => void, deps: unknown[] = []): void {
	const effect = useMemo(() => new Effect(callbackfn, { lazy: true }), deps);
	useEffect(() => {
		effect.events.on('dirty', () => queueMicrotask(() => effect.reevaluate()));
		return () => effect.dispose();
	}, [effect]);
	useEffect(() => void effect.reevaluate());
}
