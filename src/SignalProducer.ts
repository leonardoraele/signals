import { EventController, EventEmitter } from '@leonardoraele/event-controller';

export interface SignalProducer {
	// readonly value: T;
	readonly events: EventEmitter<{
		change(): void;
	}>;
}

export namespace SignalProducer {
	const controllers: EventController<{
		usage(source: SignalProducer): void;
	}>[] = [];

	export function listen({ signal = undefined as AbortSignal | undefined } = {}): EventEmitter<{
		usage(source: SignalProducer): void;
	}> {
		const controller = new EventController<{
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
