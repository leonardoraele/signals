import { useEffect, useMemo, useState } from 'react';
import { SignalComputed } from '../SignalComputed.js';
import { SignalEffect } from '../SignalEffect.js';
import { SignalState } from '../SignalState.js';
import { SignalController } from '../SignalController.js';
import { SignalPrimitive } from '../SignalPrimitive.js';

function useManualRerender() {
	const [, setState] = useState(false);
	return () => setState(s => !s);
}

/**
 * Creates a signal, and rerenders the component whenever the signal changes. This is just like `useState`, but using
 * signals instead.
 *
 * @deprecated
 */
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
 *
 * @deprecated
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
 *
 * @deprecated
 */
export function useSignalEffect(callbackfn: () => void, deps: unknown[] = []): void {
	const effect = useMemo(() => new SignalEffect(callbackfn, { lazy: true }), deps);
	useEffect(() => {
		effect.events.addEventListener('dirty', () => queueMicrotask(() => effect.reevaluate()));
		return () => effect.dispose();
	}, [effect]);
	useEffect(() => void effect.reevaluate());
}

export class DisposableToken {
	public constructor(
		private readonly callback: () => void,
	) {}

	public [Symbol.dispose](): void {
		this.callback();
	}
}

/**
 * This hook tracks signals used during the component's render phase, and rerenders the component if any of those
 * signals change later.
 *
 * Note that the returned token is a disposable object. It **MUST** be assigned to a `using` variable in the body of the
 * component to prevent memory leaks and errors caused when signals change after the component unmounts.
 *
 * @param signal
 */
export function useSignalObserverToken(): DisposableToken {
	const rerender = useManualRerender();
	const aborter = new AbortController();

	useEffect(() => {
		return () => {
			if (!aborter.signal.aborted) {
				aborter.abort();
			}
		};
	});

	function onSignalUsed(primitive: SignalPrimitive) {
		primitive.addEventListener('change', () => {
			rerender();
			aborter.abort();
		}, { signal: aborter.signal });
	}

	SignalController.pushScope();
	SignalController.observe(onSignalUsed);

	function onDispose() {
		SignalController.unobserve(onSignalUsed);
		SignalController.popScope();
	}

	return new DisposableToken(onDispose);
}

/**
 * This hook tracks signals used during the component's render phase, and rerenders the component if any of those
 * signals change later. It returns a disposable proxy-like wrapper of the store, which **MUST** be assigned to a
 * `using` variable in the component body.
 *
 * @remarks
 *
 * This hook works just like `useSignalObserverToken()`, but instead of returning a token, it wraps the provided object
 * into a disposable proxy-like object that behaves just like the token when it disposes. It is intended to be used
 * inside of your stores' hook functions to ensure that the disposable token is properly managed; so that you don't need
 * to manually call `useSignalObserverToken()` in every component.
 *
 * Note that you cannot simply call `useSignalObserverToken()` inside of your store's hook functions because the token
 * must be assigned to a `using` variable in the component's body.
 *
 * Because this method returns a new object with the original as prototype, then writes to it will be stored on the new
 * object, leaving the original object unchanged. This is why the function returns a `Readonly` version of the store.
 * This is fine because the store's mutable properties must all be readonly SignalState types anyway.
 */
export function useSignalStore<T extends object>(store: T): Readonly<T> & Disposable;
export function useSignalStore<T extends object>(store: T | null): Readonly<T> & Disposable | null;
export function useSignalStore<T extends object>(store: T | undefined): Readonly<T> & Disposable | undefined;
export function useSignalStore<T extends object>(store: T | null | undefined):
	Readonly<T> & Disposable | null | undefined;
export function useSignalStore<T extends object>(store: T | null | undefined):
	Readonly<T> & Disposable | null | undefined
{
	// Must call this hook even if the store is null or undefined, because of react hook rules.
	const token = useSignalObserverToken();
	if (!store) {
		token[Symbol.dispose]();
		return store;
	}
	return Object.create(store, {
		[Symbol.dispose]: {
			configurable: true,
			enumerable: false,
			value() {
				token[Symbol.dispose]();
				super[Symbol.dispose]?.();
			},
			writable: true,
		}
	});
}


export function useMutableSignalStore<T extends object>(store: T): T & Disposable;
export function useMutableSignalStore<T extends object>(store: T | null): T & Disposable | null;
export function useMutableSignalStore<T extends object>(store: T | undefined): T & Disposable | undefined;
export function useMutableSignalStore<T extends object>(store: T | null | undefined): T & Disposable | null | undefined;
export function useMutableSignalStore<T extends object>(store: T | null | undefined): T & Disposable | null | undefined
{
	const token = useSignalObserverToken();
	if (!store) {
		token[Symbol.dispose]();
		return store;
	}

	function dispose(this: T, ...args: any[]) {
		token[Symbol.dispose]();
		(store as any)[Symbol.dispose]?.apply(this, args);
	}

	return new Proxy<T>(store, {
		get(target, p, receiver) {
			if (p === Symbol.dispose) {
				return dispose;
			}
			return Reflect.get(target, p, receiver);
		},
	}) as T & Disposable;
}
