import { SignalController } from 'signal-controller';
import { SignalSource } from './SignalSource.js';
import { SignalSink } from './SignalSink.js';
import { AsyncIterator } from 'async-iterator-helpers-ponyfill';

export class Computed<T = unknown> implements SignalSource, SignalSink {
	public constructor(
		private readonly callbackfn: () => T,
	) {}

	private _abortController: AbortController|undefined = undefined;
	private _eventsController = new SignalController<{
		change(): void;
		dirty(): void;
		clean(): void;
	}>();
	private _value: T = undefined as any;
	private _dirty = true;
	public readonly events = this._eventsController.emitter;

	public get value(): T {
		if (this._dirty) {
			this.recompute();
		}
		SignalSource.notifyUsage(this);
		return this._value;
	}

	public get dirty(): boolean {
		return this._dirty;
	}

	public recompute(): void {
		const controller = new AbortController();
		const dependencies = new Set<SignalSource>();
		SignalSource.observeUsages({ signal: controller.signal })
			.on('usage', source => dependencies.add(source));
		try {
			this._value = this.callbackfn();
			this._dirty = false;
			this._eventsController.emit('clean');
		} finally {
			controller.abort();
			this._setDependencies(Array.from(dependencies));
		}
	}

	private _setDependencies(dependencies: SignalSource[]) {
		this._abortController?.abort();
		if (!dependencies.length) {
			this._abortController = undefined;
			return;
		}
		this._abortController = new AbortController();
		for (const dependency of dependencies) {
			AsyncIterator.from(dependency.observe(this._abortController.signal))
				.forEach(() => {
					this._dirty = true;
					this._abortController?.abort();
					this._eventsController.emit('change');
					this._eventsController.emit('dirty');
				});
		}
	}

	public async *observe(signal?: AbortSignal): AsyncGenerator<T> {
		let lastValue: T;
		yield lastValue = this.value;
		while (!signal?.aborted) {
			let resolve: () => void;
			let reject: (reason?: unknown) => void;
			try {
				await new Promise<void>((_resolve, _reject) => {
					resolve = _resolve;
					reject = _reject;
					this.events.on('change', resolve);
					signal?.addEventListener('abort', reject);
				});
				if (this.value !== lastValue) {
					yield lastValue = this.value;
				}
			} catch (error) {
				if (!signal?.aborted) {
					throw error;
				}
			} finally {
				this.events.off('change', resolve!);
				signal?.removeEventListener('abort', reject!);
			}
		}
	}


	public dispose(): void {
		this._abortController?.abort();
		this._eventsController.clear();
	}
}
