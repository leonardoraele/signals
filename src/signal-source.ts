import { SignalController, SignalEmitter } from 'signal-controller';

export interface SignalSource<T = unknown> {
	// readonly value: T;
	readonly events: SignalEmitter<{
		change(): void;
	}>;
}

export namespace SignalSource {
	const controller = new SignalController<{
		usage(source: SignalSource): void;
	}>();
	export const events = controller.signal;

	export function notifyUsage(source: SignalSource) {
		controller.emit('usage', source);
	}
}
