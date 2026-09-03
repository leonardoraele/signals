import { EventEmitter } from '@leonardoraele/event-controller';

export interface SignalConsumer {
	readonly events: EventEmitter<{
		dirty(): void;
		clean(): void;
	}>;
	readonly dirty: boolean;

	forceRerun(): void;
	dispose(): void;
}
