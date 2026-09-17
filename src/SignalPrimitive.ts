import { EventEmitter } from '@leonardoraele/event-controller';

export interface SignalPrimitive extends EventEmitter<{ change(): void; }> {}
