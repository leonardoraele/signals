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
 * Similar to `useEffect`, but also watches for signals that are used inside the callback function. The callback reruns
 * when any of the dependant signals change, even if the explicit array of dependencies don't change. Different from
 * `useEffect`, the callback is not run on every rerender by default, but only when the dependant signals change.
 */
export function useSignalEffect(callbackfn: () => void, deps: any[] = []): void {
	const effect = useMemo(() => new Effect(callbackfn, { lazy: true }), deps);
	useEffect(() => {
		const controller = new AbortController();
		effect.events.on('dirty', { signal: controller.signal }, () => effect.reevaluate());
		effect.reevaluate();
		return () => controller.abort();
	}, [effect]);
}
