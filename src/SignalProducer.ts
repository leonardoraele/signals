import { SignalController, SignalEmitter } from 'signal-controller';

export interface SignalProducer {
	// readonly value: T;
	readonly events: SignalEmitter<{
		change(): void;
	}>;
}

export namespace SignalProducer {
	const controllers: SignalController<{
		usage(source: SignalProducer): void;
	}>[] = [];

	export function listen({ signal = undefined as AbortSignal | undefined } = {}): SignalEmitter<{
		usage(source: SignalProducer): void;
	}> {
		const controller = new SignalController<{
			usage(source: SignalProducer): void;
		}>();
		controllers.push(controller);
		signal?.addEventListener('abort', () => {
			controllers.splice(controllers.indexOf(controller), 1);
		});
		return controller.emitter;
	}

	export function notifyUsage(source: SignalProducer) {
		controllers.at(-1)?.emit('usage', source);
	}
}
