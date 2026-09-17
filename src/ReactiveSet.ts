import { EventController, EventEmitter } from "@leonardoraele/event-controller";
import { SignalController } from "./SignalController";

export class ReactiveSet<T> extends Set<T> implements ReadonlySet<T> {
	constructor(values?: Iterable<T>) {
		super(values);
	}

	private _eventController = new EventController<{
		change(): void;
	}>()

	get events(): EventEmitter<{
		change(): void;
	}> {
		return this._eventController.emitter;
	}

	override get size(): number {
		SignalController.notifyUsage(this.events);
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
		SignalController.notifyUsage(this.events);
		const result = super.delete(value);
		this._eventController?.emit('change');
		return result;
	}

	override forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
		SignalController.notifyUsage(this.events);
		super.forEach(callbackfn, thisArg);
	}

	override has(value: T): boolean {
		SignalController.notifyUsage(this.events);
		return super.has(value);
	}

	override entries(): SetIterator<[T, T]> {
		SignalController.notifyUsage(this.events);
		return super.entries();
	}

	override keys(): SetIterator<T> {
		SignalController.notifyUsage(this.events);
		return super.keys();
	}

	override values(): SetIterator<T> {
		SignalController.notifyUsage(this.events);
		return super.values();
	}

	override union<U>(other: ReadonlySetLike<U>): Set<T | U> {
		SignalController.notifyUsage(this.events);
		return super.union(other);
	}

	override intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
		SignalController.notifyUsage(this.events);
		return super.intersection(other);
	}

	override difference<U>(other: ReadonlySetLike<U>): Set<T> {
		SignalController.notifyUsage(this.events);
		return super.difference(other);
	}

	override symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
		SignalController.notifyUsage(this.events);
		return super.symmetricDifference(other);
	}

	override isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
		SignalController.notifyUsage(this.events);
		return super.isSubsetOf(other);
	}

	override isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
		SignalController.notifyUsage(this.events);
		return super.isSupersetOf(other);
	}

	override isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
		SignalController.notifyUsage(this.events);
		return super.isDisjointFrom(other);
	}

	override [Symbol.iterator](): SetIterator<T> {
		SignalController.notifyUsage(this.events);
		return super[Symbol.iterator]();
	}

	override get [Symbol.toStringTag](): string {
		return ReactiveSet.name;
	}
}
