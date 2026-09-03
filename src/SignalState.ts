import { EventController } from '@leonardoraele/event-controller';
import { SignalSource } from './SignalSource.js';

/**
 * Represents a mutable variable that holds a value and can be observed when the value is set.
 *
 * It only emits `change` events if the value is set to a new value that is different from the current value in the box.
 * You can optionally provide a custom equality comparer function to determine whether two values are considered equal.
 */
export class SignalState<T = unknown> implements SignalSource {
	static readonly #DEFAULT_EQUALITY_COMPARER: EqualityComparer<unknown> = (a, b) => a === b;

	constructor(initialValue: T, private readonly options?: StateOptions<T>) {
		this.#value = initialValue;
	}

	readonly #instanceController = new EventController<{
		change(newValue: T, oldValue: T): void;
	}>();
	#value: T;
	readonly events = this.#instanceController.emitter;

	get #equalityComparer(): EqualityComparer<T> {
		return this.options?.equalityComparer ?? SignalState.#DEFAULT_EQUALITY_COMPARER;
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

	async *observe(signal: AbortSignal): AsyncGenerator<T> {
		yield this.value;
		while (!signal.aborted) {
			let resolve: (value: T | PromiseLike<T>) => void;
			let reject: (reason?: any) => void;
			try {
				await new Promise<T>((_resolve, _reject) => {
					resolve = _resolve;
					reject = _reject;
					this.events.addEventListener('change', resolve);
					signal.addEventListener('abort', reject);
				});
				yield this.value;
			} catch (error) {
				if (signal.aborted) {
					break;
				}
				throw error;
			} finally {
				this.events.removeEventListener('change', resolve!);
				signal.removeEventListener('abort', reject!);
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
