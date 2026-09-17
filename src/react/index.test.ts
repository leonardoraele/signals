import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

type HookModule = typeof import('./index.js');
type SignalStateModule = typeof import('../SignalState.js');
type StateUpdater<T> = T | ((previousState: T) => T);
type EffectCallback = () => void | (() => void);

function ensureMapGetOrInsert() {
	type MapWithGetOrInsert = Map<unknown, unknown> & {
		getOrInsert(key: unknown, defaultValue: unknown): unknown;
	};
	const prototype = Map.prototype as MapWithGetOrInsert;
	if (!('getOrInsert' in prototype)) {
		Object.defineProperty(prototype, 'getOrInsert', {
			configurable: true,
			value(key: unknown, defaultValue: unknown) {
				if (!this.has(key)) {
					this.set(key, defaultValue);
				}
				return this.get(key);
			},
			writable: true,
		});
	}
}

function depsChanged(previousDeps: readonly unknown[] | undefined, nextDeps: readonly unknown[] | undefined): boolean {
	if (previousDeps === undefined || nextDeps === undefined) {
		return true;
	}
	if (previousDeps.length !== nextDeps.length) {
		return true;
	}
	return previousDeps.some((dependency, index) => !Object.is(dependency, nextDeps[index]));
}

class MockReactRuntime {
	private _currentInstance: HookInstance<unknown>|undefined = undefined;

	public readonly module = {
		useEffect: (callbackfn: EffectCallback, deps?: readonly unknown[]) => this.#currentInstance.useEffect(callbackfn, deps),
		useMemo: <T>(callbackfn: () => T, deps?: readonly unknown[]) => this.#currentInstance.useMemo(callbackfn, deps),
		useState: <T>(initialValue: T|(() => T)) => this.#currentInstance.useState(initialValue),
	};

	get #currentInstance() {
		if (!this._currentInstance) {
			throw new Error('Hooks can only be called while a component is rendering.');
		}
		return this._currentInstance;
	}

	public mount<T>(hook: () => T): HookInstance<T> {
		const instance = new HookInstance(this, hook);
		instance.render();
		return instance;
	}

	public beginRender(instance: HookInstance<unknown>) {
		this._currentInstance = instance;
	}

	public endRender() {
		this._currentInstance = undefined;
	}
}

class HookInstance<T> {
	private readonly _states: unknown[] = [];
	private readonly _memos: { deps: readonly unknown[]|undefined; value: unknown }[] = [];
	private readonly _effects: { cleanup: (() => void)|undefined; deps: readonly unknown[]|undefined }[] = [];
	private _stateIndex = 0;
	private _memoIndex = 0;
	private _effectIndex = 0;
	private _pendingEffects: Array<() => void> = [];

	public currentValue!: T;
	public renderCount = 0;

	public constructor(private readonly runtime: MockReactRuntime, private readonly hook: () => T) {}

	public render(): T {
		this._stateIndex = 0;
		this._memoIndex = 0;
		this._effectIndex = 0;
		this._pendingEffects = [];
		this.runtime.beginRender(this);
		try {
			this.currentValue = this.hook();
		} finally {
			this.runtime.endRender();
		}
		this.renderCount++;
		for (const runEffect of this._pendingEffects) {
			runEffect();
		}
		return this.currentValue;
	}

	public useState<S>(initialValue: S|(() => S)): [S, (newValue: StateUpdater<S>) => void] {
		const index = this._stateIndex++;
		if (index >= this._states.length) {
			this._states.push(typeof initialValue === 'function' ? (initialValue as () => S)() : initialValue);
		}
		return [this._states[index] as S, newValue => {
			const previousValue = this._states[index] as S;
			this._states[index] = typeof newValue === 'function'
				? (newValue as (previousState: S) => S)(previousValue)
				: newValue;
			this.render();
		}];
	}

	public useMemo<S>(callbackfn: () => S, deps: readonly unknown[] = []): S {
		const index = this._memoIndex++;
		const slot = this._memos[index];
		if (!slot || depsChanged(slot.deps, deps)) {
			const value = callbackfn();
			this._memos[index] = { deps, value };
			return value;
		}
		return slot.value as S;
	}

	public useEffect(callbackfn: EffectCallback, deps?: readonly unknown[]) {
		const index = this._effectIndex++;
		const slot = this._effects[index];
		if (!slot || depsChanged(slot.deps, deps)) {
			this._pendingEffects.push(() => {
				slot?.cleanup?.();
				const cleanup = callbackfn();
				this._effects[index] = {
					cleanup: typeof cleanup === 'function' ? cleanup : undefined,
					deps,
				};
			});
		}
	}

	public unmount() {
		for (const effect of this._effects) {
			effect.cleanup?.();
		}
	}
}

async function importHookModule(): Promise<{ hooks: HookModule; runtime: MockReactRuntime; signals: SignalStateModule }> {
	const runtime = new MockReactRuntime();
	vi.doMock('react', () => runtime.module);
	return {
		hooks: await import('./index.js'),
		runtime,
		signals: await import('../SignalState.js'),
	};
}

describe('react hooks', () => {
	beforeEach(() => {
		ensureMapGetOrInsert();
		vi.resetModules();
	});

	afterEach(() => {
		vi.doUnmock('react');
	});

	it('useReactiveBox creates a stable signal and rerenders when its value changes', async () => {
		const { hooks, runtime, signals } = await importHookModule();
		const initializer = vi.fn(() => 1);
		const instance = runtime.mount(() => hooks.useReactiveBox(initializer));

		expect(instance.currentValue).toBeInstanceOf(signals.SignalState);
		expect(instance.currentValue.value).toBe(1);
		expect(initializer).toHaveBeenCalledTimes(1);
		expect(instance.renderCount).toBe(1);

		const signal = instance.currentValue;
		signal.value = 2;

		expect(instance.currentValue).toBe(signal);
		expect(signal.value).toBe(2);
		expect(instance.renderCount).toBe(2);
		expect(initializer).toHaveBeenCalledTimes(1);
	});

	it('useSignalComputed rerenders on dependency changes and recreates the computed value when deps change', async () => {
		const { hooks, runtime, signals } = await importHookModule();
		const source = new signals.SignalState(2);
		let multiplier = 2;
		const instance = runtime.mount(() => hooks.useSignalComputed(() => source.value * multiplier, [multiplier]));

		expect(instance.currentValue.value).toBe(4);
		expect(instance.renderCount).toBe(1);

		const firstComputed = instance.currentValue;
		const dispose = vi.spyOn(firstComputed, 'dispose');
		source.value = 3;

		expect(instance.currentValue).toBe(firstComputed);
		expect(instance.currentValue.value).toBe(6);
		expect(instance.renderCount).toBe(2);

		multiplier = 4;
		instance.render();

		expect(dispose).toHaveBeenCalledTimes(1);
		expect(instance.currentValue).not.toBe(firstComputed);
		expect(instance.currentValue.value).toBe(12);
	});

	it('useSignalEffect runs on mount, reruns asynchronously when dependencies change, and disposes on unmount', async () => {
		const { hooks, runtime, signals } = await importHookModule();
		const source = new signals.SignalState(1);
		const callbackfn = vi.fn(() => {
			source.value;
		});
		const instance = runtime.mount(() => hooks.useSignalEffect(callbackfn));

		expect(callbackfn).toHaveBeenCalledTimes(1);

		source.value = 2;
		await new Promise<void>(resolve => queueMicrotask(resolve));
		expect(callbackfn).toHaveBeenCalledTimes(2);

		instance.unmount();
		source.value = 3;
		await new Promise<void>(resolve => queueMicrotask(resolve));
		expect(callbackfn).toHaveBeenCalledTimes(2);
	});
});
