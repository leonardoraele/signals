import { SignalController } from 'signal-controller';
import { SignalSource } from './SignalSource.js';
import { SignalSink } from './SignalSink.js';
import { createReadableStreamWithController } from './util/stream.js';
import { AsyncIterator } from 'async-iterator-helpers-ponyfill';

export interface EffectOptions {
	/**
	 * An {@link AbortSignal} that can be used to automatically dispose the effect when the signal is triggered. If you
	 * do not provide an {@link AbortSignal}, you must call {@link Effect.dispose} manually to clean up the effect when
	 * it is no longer needed, otherwise it will continue to listen for changes in its dependencies indefinitely.
	 */
	signal?: AbortSignal | null | undefined;

	/**
	 * By default, the effect is immediately, and synchronously, executed when it is created. If you set this option to
	 * true, the effect will not be executed until you call the {@link Effect.reevaluate} or {@link Effect.recompute}
	 * methods manually. (or the scheduler determines it should, if you provided one)
	 *
	 * @remarks
	 *
	 * This is useful if you do not want the effect to be executed immediately when it is created, or if you want to
	 * control when the effect is executed for the first time.
	 */
	lazy?: boolean;

	/**
	 * An asynchronous iterable or iterator that is used to determine when the effect should be executed. Whenever the
	 * scheduler yields a value, the effect is executed.
	 *
	 * @remarks
	 *
	 * The effect is only executed if it is dirty, meaning that one or more of its dependencies have changed since the
	 * last time it was executed. If the scheduler yields a value and the effect is not dirty, nothing happens.
	 *
	 * If a scheduler is provided, the effect will be automatically disposed if the scheduler ends iteration, and the
	 * iterator will be aborted if the effect is manually disposed.
	 */
	scheduler?: globalThis.AsyncIterable<unknown> | globalThis.AsyncIterator<unknown> | null | undefined;
}

/**
 * An {@link Effect} is a reactive procedure that is executed if its dependencies change. It can be used to perform side
 * effects in response to changes in reactive state.
 *
 * @remarks
 *
 * You have control over when the effect is executed. By default, the effect is not executed automatically when changes
 * are detected. You can check if the effect needs to be executed by checking the {@link Effect.dirty} property, and you
 * can run the effect by calling the {@link Effect.reevaluate} or {@link Effect.recompute} methods.
 *
 * To have the effect executed automatically whenever any of its dependencies change, you can create the effect by
 * calling the static {@link Effect.createImmediate} method instead of this class' constructor. In this case, you don't
 * need to call the {@link Effect.reevaluate} or {@link Effect.recompute} methods manually.
 *
 * Alternatively, you can also provide a {@link EffectOptions.scheduler} object to determine when the effects need to be
 * executed. The scheduler is an asynchronous iterable or iterator that is used to determine when the effect should run.
 * Whenever the scheduler yields a value, the effect will be executed. The effect will be automatically disposed if the
 * effect ends, and the scheduler will be aborted if the effect is disposed earlier.
 *
 * You must call {@link Effect.dispose} to clean up the effect when it is no longer needed, otherwise it will continue
 * to listen for changes in its dependencies indefinitely. You can also provide an {@link AbortSignal} when you create
 * the effect, and the effect will be automatically disposed when the signal is triggered.
 */
export class Effect implements SignalSink {
	/**
	 * Creates an {@link Effect} that is executed immediately whenever any of its dependencies change.
	 *
	 * @remarks
	 *
	 * The effect will be automatically disposed when the provided {@link AbortSignal} is triggered, if any. If you not
	 * provide an {@link AbortSignal}, you must call {@link Effect.dispose} manually to clean up the effect when it is
	 * no longer needed, otherwise it will continue to listen for changes in its dependencies indefinitely.
	 *
	 * @param callbackfn - The callback function to be executed whenever the effect is run.
	 * @param options - Optional configuration for the effect.
	 * @returns The created {@link Effect} instance.
	 */
	public static createImmediate(callbackfn: () => unknown, options?: Omit<EffectOptions, 'scheduler'>): Effect {
		const { controller, stream: scheduler } = createReadableStreamWithController<void>();
		const effect = new Effect(callbackfn, { ...options, scheduler });
		effect.events.on('dirty', options?.signal ? { signal: options.signal } : {}, () => controller.enqueue());
		return effect;
	}

	public constructor(private readonly callbackfn: () => unknown, { signal, lazy = false, scheduler }: EffectOptions = {}) {
		signal?.addEventListener('abort', () => this.dispose());
		if (!lazy) {
			this.recompute();
		}
		if (scheduler) {
			const iterator = Symbol.asyncIterator in scheduler
				? scheduler[Symbol.asyncIterator]()
				: scheduler;
			this.schedule(iterator).then(() => this.dispose());
		}
	}

	private _dirty = true;
	private _eventsController = new SignalController<{
		dirty(): void;
		clean(): void;
	}>();
	private _abortController: AbortController|undefined = undefined;
	public readonly events = this._eventsController.emitter;

	/**
	 * Indicates whether the effect is dirty, meaning that one or more of its dependencies have changed since the last
	 * time it was executed. If this is true, calling {@link reevaluate} will execute the effect.
	 *
	 * If the effect is not dirty, it means that it has already been executed and is up to date with its dependencies.
	 */
	public get dirty(): boolean {
		return this._dirty;
	}

	private async schedule(scheduler: globalThis.AsyncIterator<unknown>): Promise<void> {
		for (let done: boolean; { done = false } = await scheduler.next(), !done;) {
			this.reevaluate();
		}
	}

	/**
	 * Reevaluates the effect if it is dirty. If the effect is dirty, the effect is executed synchronously and the
	 * effect is marked as clean. If the effect is not dirty, nothing happens.
	 */
	public reevaluate(): void {
		if (this._dirty) {
			this.recompute();
		}
	}

	/**
	 * Forces the effect to be executed immediately, regardless of whether it is dirty or not. The effect is executed
	 * synchronously, and the effect is marked as clean after execution.
	 *
	 * If the effect is already dirty, calling this method will have the same effect as calling {@link reevaluate}.
	 *
	 * @throws {Error} If the effect has been disposed, calling this method will throw an error.
	 */
	public recompute(): void {
		const controller = new AbortController();
		const dependencies = new Set<SignalSource>();
		SignalSource.observeUsages({ signal: controller.signal })
			.on('usage', source => dependencies.add(source));
		try {
			this.callbackfn();
		} finally {
			controller.abort();
			this._dirty = false;
			this._setDependencies(Array.from(dependencies));
			this._eventsController.emit('clean');
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
					this._abortController?.abort();
					if (!this.dirty) {
						this._dirty = true;
						this._eventsController.emit('dirty');
					}
				});
		}
	}

	public [Symbol.dispose]() {
		this.dispose();
	}

	public dispose(): void {
		this._dirty = false;
		this._eventsController.destroy();
		this._setDependencies([]);
	}
}
