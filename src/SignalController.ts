import type { SignalPrimitive } from './SignalPrimitive.js';

export interface ObserverCallback {
	(source: SignalPrimitive): void;
}

export namespace SignalController {
	const observers: Set<ObserverCallback>[] = [new Set<ObserverCallback>()];
	let untrackedCount = 0;

	export function pushScope({ signal = undefined as AbortSignal | undefined } = {}): void {
		observers.push(new Set<ObserverCallback>());
		signal?.addEventListener('abort', () => popScope());
	}

	export function popScope(): void {
		if (observers.length === 1) {
			throw new Error('Cannot pop the root observer scope.');
		}
		observers.pop();
	}

	export function observe(
		callback: ObserverCallback,
		{ signal = undefined as AbortSignal | undefined } = {},
	): void {
		observers.at(-1)?.add(callback);
		signal?.addEventListener('abort', () => unobserve(callback));
	}

	export function unobserve(callback: ObserverCallback): void {
		observers.at(-1)?.delete(callback);
	}

	export function notifyUsage(source: SignalPrimitive) {
		if (untrackedCount > 0) return;
		observers.at(-1)?.values().forEach(callback => callback(source));
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
