import { SignalController, SignalEmitter } from "signal-controller";
import { SignalSource } from "./SignalSource";

export class ReactiveMap<K, V> extends Map<K, V> implements ReadonlyMap<K, V>, SignalSource {
	constructor(entries?: Iterable<readonly [K, V]>) {
		super(entries);
	}

	public async *observe(_signal?: AbortSignal): AsyncIterator<[K, V]> {
		// TODO
	}

	private _eventController = new SignalController<{
		change(): void;
	}>();

	get events(): SignalEmitter<{
		change(): void;
	}> {
		return this._eventController.emitter;
	}

	private _notifyChange(): void {
		this._eventController.emit('change');
	}

	override get size(): number {
		const result = super.size;
		SignalSource.notifyUsage(this);
		return result;
	}

	override clear(): void {
		super.clear();
		this._notifyChange();
	}

	override delete(key: K): boolean {
		SignalSource.notifyUsage(this);
		const result = super.delete(key);
		this._notifyChange();
		return result;
	}

	override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
		SignalSource.notifyUsage(this);
		super.forEach(callbackfn, thisArg);
	}

	override get(key: K): V | undefined {
		SignalSource.notifyUsage(this);
		return super.get(key);
	}

	override has(key: K): boolean {
		SignalSource.notifyUsage(this);
		return super.has(key);
	}

	override set(key: K, value: V): this {
		const result = super.set(key, value);
		this._notifyChange();
		return result;
	}

	override entries(): MapIterator<[K, V]> {
		SignalSource.notifyUsage(this);
		return super.entries();
	}

	override keys(): MapIterator<K> {
		SignalSource.notifyUsage(this);
		return super.keys();
	}

	override values(): MapIterator<V> {
		SignalSource.notifyUsage(this);
		return super.values();
	}

	override getOrInsert(key: K, defaultValue: V): V {
		SignalSource.notifyUsage(this);
		const result = super.getOrInsert(key, defaultValue);
		this._notifyChange();
		return result;
	}

	override getOrInsertComputed(key: K, callback: (key: K) => V): V {
		SignalSource.notifyUsage(this);
		const result = super.getOrInsertComputed(key, callback);
		this._notifyChange();
		return result;
	}

	override [Symbol.iterator](): MapIterator<[K, V]> {
		SignalSource.notifyUsage(this);
		return super[Symbol.iterator]();
	}

	override get [Symbol.toStringTag](): string {
		return ReactiveMap.name;
	}
}
