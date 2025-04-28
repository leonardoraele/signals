import { SignalController } from 'signal-controller';
import { SignalSource } from './signal-source.js';

export class State<T = unknown> implements SignalSource<T>{
	static readonly #defaultEqualityComparer: EqualityComparer<unknown> = (a, b) => a === b;

	constructor(initialValue: T, private readonly options?: StateOptions<T>) {
		this.#value = initialValue;
	}

	readonly #instanceController = new SignalController<{
		change(newValue: T, oldValue: T): void;
	}>();
	#value: T;
	readonly events = this.#instanceController.signal;

	get value(): T {
		SignalSource.notifyUsage(this);
		return this.#value;
	}

	set value(newValue: T) {
		if ((this.options?.equalityComparer ?? State.#defaultEqualityComparer)(this.#value, newValue) === false) {
			const oldValue = this.#value;
			this.#value = newValue;
			this.#instanceController.emit('change', newValue, oldValue);
		}
	}
}

export interface StateOptions<T> {
	equalityComparer?: EqualityComparer<T>;
}

export interface EqualityComparer<T> {
	(a: T, b: T): boolean;
}
