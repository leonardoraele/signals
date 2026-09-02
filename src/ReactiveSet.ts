import { SignalController, SignalEmitter } from "signal-controller";
import { SignalSource } from "./SignalSource";

export class ReactiveSet<T> extends Set<T> implements ReadonlySet<T>, SignalSource {
	constructor(values?: Iterable<T>) {
		super(values);
	}

	private _eventController = new SignalController<{
		change(): void;
	}>()

	get events(): SignalEmitter<{
		change(): void;
	}> {
		return this._eventController.emitter;
	}

	public async *observe(_signal?: AbortSignal): AsyncIterator<unknown> {
		// TODO
	}

	override get size(): number {
		SignalSource.notifyUsage(this);
		return super.size;
	}

	override add(value: T): this {
		super.add(value);
		this._eventController?.emit('change');
		return this;
	}

	override clear(): void {
		super.clear();
		this._eventController?.emit('change');
	}

	override delete(value: T): boolean {
		SignalSource.notifyUsage(this);
		const result = super.delete(value);
		this._eventController?.emit('change');
		return result;
	}

	override forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
		SignalSource.notifyUsage(this);
		super.forEach(callbackfn, thisArg);
	}

	override has(value: T): boolean {
		SignalSource.notifyUsage(this);
		return super.has(value);
	}

	override entries(): SetIterator<[T, T]> {
		SignalSource.notifyUsage(this);
		return super.entries();
	}

	override keys(): SetIterator<T> {
		SignalSource.notifyUsage(this);
		return super.keys();
	}

	override values(): SetIterator<T> {
		SignalSource.notifyUsage(this);
		return super.values();
	}

	override union<U>(other: ReadonlySetLike<U>): Set<T | U> {
		SignalSource.notifyUsage(this);
		return super.union(other);
	}

	override intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
		SignalSource.notifyUsage(this);
		return super.intersection(other);
	}

	override difference<U>(other: ReadonlySetLike<U>): Set<T> {
		SignalSource.notifyUsage(this);
		return super.difference(other);
	}

	override symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
		SignalSource.notifyUsage(this);
		return super.symmetricDifference(other);
	}

	override isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
		SignalSource.notifyUsage(this);
		return super.isSubsetOf(other);
	}

	override isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
		SignalSource.notifyUsage(this);
		return super.isSupersetOf(other);
	}

	override isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
		SignalSource.notifyUsage(this);
		return super.isDisjointFrom(other);
	}

	override [Symbol.iterator](): SetIterator<T> {
		SignalSource.notifyUsage(this);
		return super[Symbol.iterator]();
	}

	override get [Symbol.toStringTag](): string {
		return ReactiveSet.name;
	}
}
