import { SignalSource } from './SignalSource.js';

const DEFAULT_EQUALITY_COMPARER: EqualityComparer<unknown> = (a, b) => a === b;

/**
 * Represents a mutable variable that holds a value and can be observed when the value is set.
 *
 * It only emits `change` events if the value is set to a new value that is different from the current value in the box.
 * You can optionally provide a custom equality comparer function to determine whether two values are considered equal.
 */
export class ReactiveBox<T = unknown> implements SignalSource {
	public constructor(initialValue: T, private readonly options?: StateOptions<T>) {
		this._value = initialValue;
	}

	private _value: T;
	private _observers = new Set<(value: T) => void>();

	private get _equalityComparer(): EqualityComparer<T> {
		return this.options?.equalityComparer ?? DEFAULT_EQUALITY_COMPARER;
	}

	public get value(): T {
		SignalSource.notifyUsage(this);
		return this._value;
	}

	public set value(newValue: T) {
		if (this._equalityComparer(this._value, newValue) === false) {
			this._value = newValue;
			Iterator.from(this._observers).forEach(observer => observer(newValue));
		}
	}

	public async *observe(signal?: AbortSignal): AsyncGenerator<T> {
		yield this._value;
		while (!signal?.aborted) {
			let resolve: (value: T | PromiseLike<T>) => void;
			let reject: (reason?: unknown) => void;
			try {
				yield await new Promise<T>((_resolve, _reject) => {
					resolve = _resolve;
					reject = _reject;
					this._observers.add(resolve);
					signal?.addEventListener('abort', reject);
				});
			} catch (error) {
				if (!signal?.aborted) {
					throw error;
				}
			} finally {
				this._observers.delete(resolve!);
				signal?.removeEventListener('abort', reject!);
			}
		}
	}
}

export interface StateOptions<T> {
	equalityComparer?: EqualityComparer<T>;
}

export interface EqualityComparer<T> {
	(a: T, b: T): boolean;
}
