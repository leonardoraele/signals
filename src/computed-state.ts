import { SignalController } from 'signal-controller';
import { SignalSource } from './signal-source.js';
import { SignalSink } from './signal-sink.js';

export class ComputedState<T = unknown> implements SignalSource<T>, SignalSink {
	constructor(
		private readonly callbackfn: () => T,
	) {}

	#abortController: AbortController|undefined = undefined;
	#eventsController = new SignalController<{
		change(): void;
		dirty(): void;
		clean(): void;
	}>();
	#value: T = undefined as any;
	#dirty = true;
	readonly events = this.#eventsController.signal;

	get value(): T {
		if (this.#dirty) {
			this.forceReevaluation();
		}
		SignalSource.notifyUsage(this);
		return this.#value;
	}

	get dirty(): boolean {
		return this.#dirty;
	}

	forceReevaluation(): void {
		const controller = new AbortController();
		const dependencies = new Set<SignalSource>();
		SignalSource.events.on('usage', { signal: controller.signal }, source => dependencies.add(source));
		try {
			this.#value = this.callbackfn();
			this.#dirty = false;
			this.#eventsController.emit('clean');
		} finally {
			controller.abort();
			this.#setDependencies(Iterator.from(dependencies).toArray());
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
				this.#eventsController.emit('change');
				this.#eventsController.emit('dirty');
			});
		}
	}

	dispose(): void {
		this.#abortController?.abort();
		this.#eventsController.clear();
	}
}
