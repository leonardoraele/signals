import { EventController, EventEmitter } from '@leonardoraele/event-controller';

export interface SignalSource/*<T = unknown>*/ {
	// readonly value: T;
	readonly events: EventEmitter<{
		change(): void;
	}>;
	// notifyUsage(): void;
	// notifyChange(): void;
}

export namespace SignalSource {
	const controllers: EventController<{
		usage(source: SignalSource): void;
	}>[] = [];
	let untrackedCount = 0;

	export function listen({ signal = undefined as AbortSignal | undefined } = {}): EventEmitter<{
		usage(source: SignalSource): void;
	}> {
		const controller = new EventController<{
			usage(source: SignalSource): void;
		}>();
		controllers.push(controller);
		signal?.addEventListener('abort', () => {
			controllers.splice(controllers.indexOf(controller), 1);
		});
		return controller.emitter;
	}

	export function notifyUsage(source: SignalSource) {
		if (untrackedCount > 0) {
			return;
		}
		controllers.at(-1)?.emit('usage', source);
	}

	export function runUntracked<T>(callback: () => T): T {
		untrackedCount++;
		try {
			return callback();
		} finally {
			untrackedCount--;
		}
	}
}

export const runUntracked = SignalSource.runUntracked;
