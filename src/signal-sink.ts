import { SignalEmitter } from 'signal-controller';

export interface SignalSink {
	readonly events: SignalEmitter<{
		dirty(): void;
		clean(): void;
	}>;
	readonly dirty: boolean;

	forceReevaluation(): void;
	dispose(): void;
}
