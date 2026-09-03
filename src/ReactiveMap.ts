import { EventController, EventEmitter } from "@leonardoraele/event-controller";
import { SignalSource } from "./SignalSource";

export class ReactiveMap<K, V> extends Map<K, V> implements ReadonlyMap<K, V>, SignalSource {
	public constructor(entries?: Iterable<readonly [K, V]>) {
		super(entries);
	}

	private _eventController = new EventController<{
		change(): void;
	}>();

	public get events(): EventEmitter<{
		change(): void;
	}> {
		return this._eventController.emitter;
	}

	private notifyChange(): void {
		this._eventController?.emit("change");
	}

	public override get size(): number {
		const result = super.size;
		SignalSource.notifyUsage(this);
		return result;
	}

	public override clear(): void {
		super.clear();
		this.notifyChange();
	}

	public override delete(key: K): boolean {
		SignalSource.notifyUsage(this);
		const result = super.delete(key);
		this.notifyChange();
		return result;
	}

	public override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
		SignalSource.notifyUsage(this);
		super.forEach(callbackfn, thisArg);
	}

	public override get(key: K): V | undefined {
		SignalSource.notifyUsage(this);
		return super.get(key);
	}

	public override has(key: K): boolean {
		SignalSource.notifyUsage(this);
		return super.has(key);
	}

	public override set(key: K, value: V): this {
		const result = super.set(key, value);
		this.notifyChange();
		return result;
	}

	public override entries(): MapIterator<[K, V]> {
		SignalSource.notifyUsage(this);
		return super.entries();
	}

	public override keys(): MapIterator<K> {
		SignalSource.notifyUsage(this);
		return super.keys();
	}

	public override values(): MapIterator<V> {
		SignalSource.notifyUsage(this);
		return super.values();
	}

	public override getOrInsert(key: K, defaultValue: V): V {
		SignalSource.notifyUsage(this);
		if (super.has(key)) {
			return super.get(key)!;
		}
		super.set(key, defaultValue);
		this.notifyChange();
		return defaultValue;
	}

	public override getOrInsertComputed(key: K, callback: (key: K) => V): V {
		SignalSource.notifyUsage(this);
		if (super.has(key)) {
			return super.get(key)!;
		}
		const value = callback(key);
		super.set(key, value);
		this.notifyChange();
		return value;
	}

	public override [Symbol.iterator](): MapIterator<[K, V]> {
		SignalSource.notifyUsage(this);
		return super[Symbol.iterator]();
	}

	public override get [Symbol.toStringTag](): string {
		return ReactiveMap.name;
	}
}
