import { SignalController, SignalEmitter } from 'signal-controller';

export interface SignalSource {
	observe(signal?: AbortSignal): AsyncIterator<unknown>;
}

export namespace SignalSource {
	const controllers: SignalController<{
		usage(source: SignalSource): void;
	}>[] = [];

	export function observeUsages({ signal = undefined as AbortSignal | undefined } = {}): SignalEmitter<{
		usage(source: SignalSource): void;
	}> {
		const controller = new SignalController<{
			usage(source: SignalSource): void;
		}>();
		controllers.push(controller);
		signal?.addEventListener('abort', () => {
			controllers.splice(controllers.indexOf(controller), 1);
		});
		return controller.emitter;
	}

	export function notifyUsage(source: SignalSource) {
		controllers.at(-1)?.emit('usage', source);
	}
}
