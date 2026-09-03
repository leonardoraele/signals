import { SignalEmitter } from 'signal-controller';

export interface SignalConsumer {
	readonly events: SignalEmitter<{
		dirty(): void;
		clean(): void;
	}>;
	readonly dirty: boolean;

	forceRerun(): void;
	dispose(): void;
}
