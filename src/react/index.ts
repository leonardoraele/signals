import { useEffect, useMemo, useRef, useState } from 'react';
import { SignalComputed } from '../SignalComputed.js';
import { SignalEffect } from '../SignalEffect.js';
import { SignalState } from '../SignalState.js';
import { SignalController } from '../SignalController.js';
import { SignalPrimitive } from '../SignalPrimitive.js';

function useManualRerender() {
	const [, setState] = useState(false);
	return () => setState(s => !s);
}

/** Creates a signal, and rerenders the component whenever the signal changes. This is just like `useState`, but using
 * signals instead. */
export function useSignalState<T>(initialValue: T|(() => T)): SignalState<T> {
	const [state, setState] = useState<T>(initialValue);
	return useMemo(() => {
		const signal = new SignalState<T>(state);
		signal.events.addEventListener('change', newValue => setState(newValue));
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
export function useSignalComputed<T>(callbackfn: () => T, deps: unknown[] = []): SignalComputed<T> {
	const rerender = useManualRerender();
	const computed = useMemo(() => new SignalComputed(callbackfn), deps);

	useEffect(() => {
		computed.events.addEventListener('dirty', rerender);
		return () => computed.dispose();
	}, [computed]);

	return computed;
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
	const effect = useMemo(() => new SignalEffect(callbackfn, { lazy: true }), deps);
	useEffect(() => {
		effect.events.addEventListener('dirty', () => queueMicrotask(() => effect.reevaluate()));
		return () => effect.dispose();
	}, [effect]);
	useEffect(() => void effect.reevaluate());
}

export class SignalObservationToken {
	public constructor(
		private readonly callback: () => void,
	) {}

	public mount<T>(target: T): asserts target is T & Disposable {
		const original = (target as any)[Symbol.dispose];
		(target as any)[Symbol.dispose] = (...args: any[]) => {
			original?.apply(target, args);
			this[Symbol.dispose]();
			(target as any)[Symbol.dispose] = original;
		};
	}

	public [Symbol.dispose](): void {
		this.callback();
	}
}

/**
 * This function observes changes on signals and triggers a rerender whenever a signal changes.
 * @param signal
 */
export function useSignalObserver(): SignalObservationToken {
	const rerender = useManualRerender();
	const aborter = useRef<AbortController | null>(null);

	aborter.current ??= new AbortController();

	useEffect(() => {
		return () => {
			aborter.current?.abort();
			aborter.current = null;
		};
	});

	function onSignalUsed(primitive: SignalPrimitive) {
		primitive.addEventListener('change', () => {
			rerender();
			aborter.current?.abort();
			aborter.current = null;
		}, { signal: aborter.current?.signal });
	}

	SignalController.observe(onSignalUsed);

	return new SignalObservationToken(() => {
		SignalController.unobserve(onSignalUsed);
	});
}
