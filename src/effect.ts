import { SignalController } from 'signal-controller';
import { SignalSource } from './signal-source.js';
import { SignalSink } from './signal-sink.js';

export class Effect implements SignalSink {
	static createImmediate(callbackfn: () => unknown, { signal = null as AbortSignal|null } = {}): Effect {
		const effect = new Effect(callbackfn, { signal });
		effect.events.on('dirty', signal ? { signal } : {}, () => queueMicrotask(() => effect.forceRerun()))
		return effect;
	}

	constructor(
		private readonly callbackfn: () => unknown,
		{ signal = null as AbortSignal|null, lazy = false, scheduler = null as ReadableStream<void>|null } = {}
	) {
		signal?.addEventListener('abort', () => this.dispose());
		if (!lazy) {
			this.forceRerun();
		}
		if (scheduler) {
			this.schedule(scheduler).then(() => this.dispose());
		}
	}

	#dirty = true;
	#eventsController = new SignalController<{
		dirty(): void;
		clean(): void;
	}>();
	#abortController: AbortController|undefined = undefined;
	readonly events = this.#eventsController.emitter;

	get dirty(): boolean {
		return this.#dirty;
	}

	async schedule(scheduler: ReadableStream<void>): Promise<void> {
		for await (const _ of scheduler) {
			this.reevaluate();
		}
	}

	reevaluate(): void {
		if (this.#dirty) {
			this.forceRerun();
		}
	}

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
		this.#eventsController.destroy();
		this.#setDependencies([]);
	}
}
