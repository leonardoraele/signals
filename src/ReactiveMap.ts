import { EventController, EventEmitter } from "@leonardoraele/event-controller";
import { SignalProducer } from "./SignalProducer";

export class ReactiveMap<K, V> extends Map<K, V> implements ReadonlyMap<K, V>, SignalProducer {
	private _eventController = new EventController<{
		change(): void;
	}>();

	constructor(entries?: Iterable<readonly [K, V]>) {
		super(entries);
	}

	private notifyChange(): void {
		this._eventController?.emit("change");
	}

	get events(): EventEmitter<{
		change(): void;
	}> {
		return this._eventController.emitter;
	}

	override get size(): number {
		const result = super.size;
		SignalProducer.notifyUsage(this);
		return result;
	}

	override clear(): void {
		super.clear();
		this.notifyChange();
	}

	override delete(key: K): boolean {
		SignalProducer.notifyUsage(this);
		const result = super.delete(key);
		this.notifyChange();
		return result;
	}

	override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
		SignalProducer.notifyUsage(this);
		super.forEach(callbackfn, thisArg);
	}

	override get(key: K): V | undefined {
		SignalProducer.notifyUsage(this);
		return super.get(key);
	}

	override has(key: K): boolean {
		SignalProducer.notifyUsage(this);
		return super.has(key);
	}

	override set(key: K, value: V): this {
		const result = super.set(key, value);
		this.notifyChange();
		return result;
	}

	override entries(): MapIterator<[K, V]> {
		SignalProducer.notifyUsage(this);
		return super.entries();
	}

	override keys(): MapIterator<K> {
		SignalProducer.notifyUsage(this);
		return super.keys();
	}

	override values(): MapIterator<V> {
		SignalProducer.notifyUsage(this);
		return super.values();
	}

	override getOrInsert(key: K, defaultValue: V): V {
		SignalProducer.notifyUsage(this);
		const result = super.getOrInsert(key, defaultValue);
		this.notifyChange();
		return result;
	}

	override getOrInsertComputed(key: K, callback: (key: K) => V): V {
		SignalProducer.notifyUsage(this);
		const result = super.getOrInsertComputed(key, callback);
		this.notifyChange();
		return result;
	}

	override [Symbol.iterator](): MapIterator<[K, V]> {
		SignalProducer.notifyUsage(this);
		return super[Symbol.iterator]();
	}

	override get [Symbol.toStringTag](): string {
		return ReactiveMap.name;
	}
}
