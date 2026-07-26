import { SignalEmitter } from 'signal-controller';
import { createReadableStreamWithController } from './util/stream';

export interface SignalSource {
	// readonly value: T;
	readonly events: SignalEmitter<{
		change(): void;
	}>;
}

export namespace SignalSource {
	const controllers: ReadableStreamDefaultController<SignalSource>[] = [];

	export function listen({ signal = undefined as AbortSignal | undefined } = {}): AsyncIterator<SignalSource> {
		const { stream, controller } = createReadableStreamWithController<SignalSource>();
		controllers.push(controller);
		signal?.addEventListener('abort', () => {
			controller.close();
			controllers.splice(0, controllers.length, ...controllers.filter(c => c !== controller));
		});
		return stream[Symbol.asyncIterator]();
	}

	export function notifyUsage(source: SignalSource) {
		controllers.at(-1)?.enqueue(source);
	}
}
