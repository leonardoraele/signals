import { SignalController } from 'signal-controller';
import { SignalSource } from './signal-source.js';
import { SignalSink } from './signal-sink.js';

export class Effect implements SignalSink {
	static createImmediate(callbackfn: () => unknown, { signal = null as AbortSignal|null } = {}): Effect {
		const effect = new Effect(callbackfn);
		effect.events.on('dirty', signal ? { signal } : {}, () => queueMicrotask(() => effect.forceRerun()))
		return effect;
	}

	constructor(
		private readonly callbackfn: () => unknown,
		{ signal = null as AbortSignal|null } = {}
	) {
		signal?.addEventListener('abort', () => this.dispose());
		this.forceRerun();
	}

	#dirty = true;
	#eventsController = new SignalController<{
		dirty(): void;
		clean(): void;
	}>();
	#abortController: AbortController|undefined = undefined;
	readonly events = this.#eventsController.signal;

	get dirty(): boolean {
		return this.#dirty;
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
				this.#dirty = true;
				this.#abortController?.abort();
				this.#eventsController.emit('dirty');
			});
		}
	}

	dispose(): void {
		this.#abortController?.abort();
		this.#eventsController.clear();
	}
}
