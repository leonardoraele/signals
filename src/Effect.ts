import { SignalController } from 'signal-controller';
import { SignalSource } from './SignalSource.js';
import { SignalSink } from './SignalSink.js';
import { createReadableStreamWithController } from './util/stream.js';

export interface EffectOptions {
	signal?: AbortSignal | null | undefined;
	lazy?: boolean;
	scheduler?: AsyncIterable<unknown> | AsyncIterator<unknown> | null | undefined;
}

/**
 * An {@link Effect} is a reactive procedure that is executed if its dependencies change. It can be used to perform side
 * effects in response to changes in reactive state.
 *
 * @remarks
 *
 * You have control over when the effect is executed. By default, the effect is not executed automatically when changes
 * are detected. You can check if the effect needs to be executed by checking the {@link Effect.dirty} property, and you
 * can run the effect by calling the {@link Effect.reevaluate} or {@link Effect.forceRerun} methods.
 *
 * To have the effect executed automatically whenever any of its dependencies change, you can create the effect by
 * calling the static {@link Effect.createImmediate} method instead of this class' constructor. In this case, you don't
 * need to call the {@link Effect.reevaluate} or {@link Effect.forceRerun} methods manually.
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
	 * The effect will be automatically disposed when the provided {@link AbortSignal} is triggered, if any. If you not
	 * provide an {@link AbortSignal}, you must call {@link Effect.dispose} manually to clean up the effect when it is
	 * no longer needed, otherwise it will continue to listen for changes in its dependencies indefinitely.
	 *
	 * @param callbackfn - The callback function to be executed whenever the effect is run.
	 * @param options - Optional configuration for the effect.
	 * @returns The created {@link Effect} instance.
	 */
	static createImmediate(callbackfn: () => unknown, options?: Omit<EffectOptions, 'scheduler'>): Effect {
		const { controller, stream: scheduler } = createReadableStreamWithController<void>();
		const effect = new Effect(callbackfn, { ...options, scheduler });
		effect.events.on('dirty', options?.signal ? { signal: options.signal } : {}, () => controller.enqueue());
		return effect;
	}

	constructor(private readonly callbackfn: () => unknown, { signal, lazy = false, scheduler }: EffectOptions = {}) {
		signal?.addEventListener('abort', () => this.dispose());
		if (!lazy) {
			this.forceRerun();
		}
		if (scheduler) {
			const ireator = Symbol.asyncIterator in scheduler
				? scheduler[Symbol.asyncIterator]()
				: scheduler;
			this.schedule(ireator).then(() => this.dispose());
		}
	}

	#dirty = true;
	#eventsController = new SignalController<{
		dirty(): void;
		clean(): void;
	}>();
	#abortController: AbortController|undefined = undefined;
	readonly events = this.#eventsController.emitter;

	/**
	 * Indicates whether the effect is dirty, meaning that one or more of its dependencies have changed since the last
	 * time it was executed. If this is true, calling {@link reevaluate} will execute the effect.
	 *
	 * If the effect is not dirty, it means that it has already been executed and is up to date with its dependencies.
	 */
	get dirty(): boolean {
		return this.#dirty;
	}

	private async schedule(scheduler: AsyncIterator<unknown>): Promise<void> {
		for (let done: boolean; { done = false } = await scheduler.next(), !done;) {
			this.reevaluate();
		}
	}

	/**
	 * Reevaluates the effect if it is dirty. If the effect is dirty, the effect is executed synchronously and the
	 * effect is marked as clean. If the effect is not dirty, nothing happens.
	 */
	reevaluate(): void {
		if (this.#dirty) {
			this.forceRerun();
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
	forceRerun(): void {
		const controller = new AbortController();
		const dependencies = new Set<SignalSource>();
		SignalSource.events.on('usage', { signal: controller.signal }, source => dependencies.add(source));
		try {
			this.callbackfn();
		} finally {
			controller.abort();
			this.#dirty = false;
			this.#setDependencies(Iterator.from(dependencies).toArray());
			this.#eventsController.emit('clean');
		}
	}

	#setDependencies(dependencies: SignalSource[]) {
		this.#abortController?.abort();
		if (!dependencies.length) {
			this.#abortController = undefined;
			return;
		}
		this.#abortController = new AbortController();
		for (const dependency of dependencies) {
			dependency.events.on('change', { signal: this.#abortController.signal }, () => {
				this.#abortController?.abort();
				if (!this.dirty) {
					this.#dirty = true;
					this.#eventsController.emit('dirty');
				}
			});
		}
	}

	[Symbol.dispose]() {
		this.dispose();
	}

	dispose(): void {
		this.#dirty = false;
		this.#eventsController.destroy();
		this.#setDependencies([]);
	}
}
