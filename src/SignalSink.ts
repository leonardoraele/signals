import { EventEmitter } from '@leonardoraele/event-controller';

export interface SignalSink {
	readonly events: EventEmitter<{
		dirty(): void;
		clean(): void;
	}>;
	readonly dirty: boolean;

	forceRerun(): void;
	dispose(): void;
}
