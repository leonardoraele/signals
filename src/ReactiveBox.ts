import { SignalController } from 'signal-controller';
import { SignalSource } from './SignalSource.js';

/**
 * Represents a mutable variable that holds a value and can be observed when the value is set.
 *
 * It only emits `change` events if the value is set to a new value that is different from the current value in the box.
 * You can optionally provide a custom equality comparer function to determine whether two values are considered equal.
 */
export class ReactiveBox<T = unknown> implements SignalSource {
	static readonly #ABORT_ITERATION_SYMBOL = Symbol();
	static readonly #DEFAULT_EQUALITY_COMPARER: EqualityComparer<unknown> = (a, b) => a === b;

	constructor(initialValue: T, private readonly options?: StateOptions<T>) {
		this.#value = initialValue;
	}

	readonly #instanceController = new SignalController<{
		change(newValue: T, oldValue: T): void;
	}>();
	#value: T;
	readonly events = this.#instanceController.emitter;

	get #equalityComparer(): EqualityComparer<T> {
		return this.options?.equalityComparer ?? ReactiveBox.#DEFAULT_EQUALITY_COMPARER;
	}

	get value(): T {
		SignalSource.notifyUsage(this);
		return this.#value;
	}

	set value(newValue: T) {
		if (this.#equalityComparer(this.#value, newValue) === false) {
			const oldValue = this.#value;
			this.#value = newValue;
			this.#instanceController.emit('change', newValue, oldValue);
		}
	}

	async *toIterator(signal?: AbortSignal): AsyncGenerator<T> {
		for (let value: T = this.#value;;) {
			yield value;
			try {
				value = await new Promise<T>((resolve, reject) => {
					this.events.on('change', { once: true, ...signal ? { signal } : undefined }, resolve);
					signal?.addEventListener('abort', () => reject(ReactiveBox.#ABORT_ITERATION_SYMBOL));
				});
			} catch (error) {
				if (error === ReactiveBox.#ABORT_ITERATION_SYMBOL) {
					break;
				}
				throw error;
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
