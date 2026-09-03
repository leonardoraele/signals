import { describe, it, expect, vi } from 'vitest';
import { SignalState } from './SignalState.js';
import { SignalEffect } from './SignalEffect.js';

describe('effect', () => {
	it('becomes dirty when dependencies change', () => {
		const state = new SignalState(0);
		const effect = new SignalEffect(() => state.value += 1);
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		state.value = 0;
		expect(effect.dirty).toBe(true);
		expect(state.value).toBe(0);
	});

	it('runs on reevaluation only if dirty', () => {
		const state = new SignalState(0);
		const effect = new SignalEffect(() => state.value += 1);
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		effect.reevaluate();
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		state.value = 0;
		expect(effect.dirty).toBe(true);
		expect(state.value).toBe(0);
		effect.reevaluate();
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
	});

	it('stops tracking dependencies after being disposed', () => {
		const state = new SignalState(0);
		const effect = new SignalEffect(() => state.value += 1);
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		effect.dispose();
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		state.value = 0;
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(0);
	});

	it('can be forced by the client to rerun', () => {
		const fn = vi.fn();
		const effect = new SignalEffect(fn);
		expect(fn).toHaveBeenCalledTimes(1);
		effect.forceRerun();
		expect(fn).toHaveBeenCalledTimes(2);
	});

	describe('lazy option', () => {
		it('is eager by default, and runs synchronously at creation', () => {
			const fn = vi.fn();
			new SignalEffect(fn);
			expect(fn).toHaveBeenCalled();
		});
		it('do not run at creation is set to lazy', () => {
			const fn = vi.fn();
			const effect = new SignalEffect(fn, { lazy: true });
			expect(effect.dirty).toBe(true);
			expect(fn).not.toHaveBeenCalled();
			effect.reevaluate();
			expect(effect.dirty).toBe(false);
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe('createImmediate static function', () => {
		it('executes immediately', { timeout: 200 }, async () => {
			const state = new SignalState(1);
			const effect = SignalEffect.createImmediate(() => state.value *= 2);
			expect(effect.dirty).toBe(false);
			expect(state.value).toBe(2);
			state.value = 5;
			expect(effect.dirty).toBe(true);
			expect(state.value).toBe(5);
			await effect.events.next('clean');
			expect(effect.dirty).toBe(false);
			expect(state.value).toBe(10);
			effect.dispose();
			state.value = 7;
			expect(effect.dirty).toBe(false);
			expect(state.value).toBe(7);
			await expect(new Promise((resolve, reject) => {
				effect.events.next('clean').then(resolve);
				setTimeout(reject, 100);
			})).rejects.toThrow();
		});
	});

	describe('scheduler option', () => {
		it('can be used to schedule effect reevaluation', { timeout: 200 }, async () => {
			const state = new SignalState(1);
			let runCount = 0;
			const scheduler = new ReadableStream<void>({
				pull(controller) {
					setTimeout(() => controller.enqueue(), 100);
				},
			});
			const effect = new SignalEffect(() => {
				runCount++;
				state.value *= 2;
			}, { scheduler });
			expect(effect.dirty).toBe(false);
			expect(runCount).toBe(1);
			expect(state.value).toBe(2);

			state.value = 5;

			expect(effect.dirty).toBe(true);
			expect(runCount).toBe(1);
			expect(state.value).toBe(5);

			await new Promise(resolve => setTimeout(resolve, 10));

			expect(effect.dirty).toBe(true);
			expect(runCount).toBe(1);
			expect(state.value).toBe(5);

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(effect.dirty).toBe(false);
			expect(runCount).toBe(2);
			expect(state.value).toBe(10);
		});

		it('accepts an async iterator as scheduler', { timeout: 200 }, async () => {
			const bus = new EventTarget();
			const scheduler = (async function* () {
				while (true) {
					await new Promise(resolve => bus.addEventListener('next', resolve, { once: true }));
					yield;
				}
			})();
			const next = () => bus.dispatchEvent(new Event('next'));

			let sum = 0;
			const addend = new SignalState(0);
			const effect = new SignalEffect(() => {
				sum += addend.value;
				addend.value = 0;
			}, { scheduler: scheduler as AsyncGenerator<void> });

			expect(effect.dirty).toBe(false);
			expect(sum).toBe(0);

			addend.value = 5;

			expect(effect.dirty).toBe(true);
			expect(sum).toBe(0);

			next();
			await new Promise<void>(queueMicrotask);
			await new Promise<void>(queueMicrotask);

			expect(effect.dirty).toBe(false);
			expect(sum).toBe(5);

			addend.value = 3;

			expect(effect.dirty).toBe(true);
			expect(sum).toBe(5);

			next();
			await new Promise<void>(queueMicrotask);
			await new Promise<void>(queueMicrotask);

			expect(effect.dirty).toBe(false);
			expect(sum).toBe(8);
		});
	});
});
