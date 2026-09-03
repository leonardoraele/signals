import { SignalController } from 'signal-controller';
import { SignalProducer } from './SignalProducer.js';
import { SignalConsumer } from './SignalConsumer.js';

export class Computed<T = unknown> implements SignalProducer, SignalConsumer {
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
	readonly events = this.#eventsController.emitter;

	get value(): T {
		if (this.#dirty) {
			this.forceRerun();
		}
		SignalProducer.notifyUsage(this);
		return this.#value;
	}

	get dirty(): boolean {
		return this.#dirty;
	}

	forceRerun(): void {
		const controller = new AbortController();
		const dependencies = new Set<SignalProducer>();
		SignalProducer.listen({ signal: controller.signal }).on('usage', source => dependencies.add(source));
		try {
			this.#value = this.callbackfn();
			this.#dirty = false;
			this.#eventsController.emit('clean');
		} finally {
			controller.abort();
			this.#setDependencies(Iterator.from(dependencies).toArray());
		}
	}

	#setDependencies(dependencies: SignalProducer[]) {
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
