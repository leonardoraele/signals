import { EventController } from '@leonardoraele/event-controller';
import { SignalController } from './SignalController.js';
import { SignalPrimitive } from './SignalPrimitive.js';

export class SignalComputed<T = unknown> {
	public constructor(
		private readonly callbackfn: () => T,
	) {}

	private _abortController: AbortController|undefined = undefined;
	private readonly _eventController = new EventController<{
		change(): void;
		dirty(): void;
		clean(): void;
	}>();
	private _value: T = undefined as any;
	private _dirty = true;
	public readonly events = this._eventController.emitter;

	public get value(): T {
		if (this._dirty) {
			this.forceRerun();
		}
		SignalController.notifyUsage(this.events);
		return this._value;
	}

	public get dirty(): boolean {
		return this._dirty;
	}

	public forceRerun(): void {
		const dependencies = new Set<SignalPrimitive>();
		SignalController.pushScope();
		SignalController.observe(source => dependencies.add(source));
		try {
			this._value = this.callbackfn();
			this._dirty = false;
			this._eventController.emit('clean');
		} finally {
			SignalController.popScope();
			this._setDependencies(Iterator.from(dependencies).toArray());
		}
	}

	private _setDependencies(dependencies: SignalPrimitive[]) {
		this._abortController?.abort();
		if (!dependencies.length) {
			this._abortController = undefined;
			return;
		}
		this._abortController = new AbortController();
		for (const dependency of dependencies) {
			dependency.addEventListener('change', () => {
				this._dirty = true;
				this._abortController?.abort();
				this._eventController.emit('change');
				this._eventController.emit('dirty');
			}, { signal: this._abortController.signal });
		}
	}

	public dispose(): void {
		this._abortController?.abort();
		this._abortController = undefined;
		this._eventController.clear();
	}
}
