import { describe, it, expect } from 'vitest';
import { State } from './state.js';
import { Computed } from './computed.js';
import { Effect } from './effect.js';

describe('state', () => {
	it('is set synchronously', () => {
		const state = new State(1);
		expect(state.value).toBe(1);
		state.value = 2;
		expect(state.value).toBe(2);
	});
});

describe('computed state', () => {
	it('updates lazily, when dependencies change', () => {
		const a = new State(2);
		const b = new State(3);
		const sum = new Computed(() => a.value + b.value);
		const doubleSum = new Computed(() => sum.value * 2);

		expect(sum.dirty).toBe(true);
		expect(sum.value).toBe(5);
		expect(sum.dirty).toBe(false);

		expect(doubleSum.dirty).toBe(true);
		expect(doubleSum.value).toBe(10);
		expect(doubleSum.dirty).toBe(false);

		a.value = 5;

		expect(sum.dirty).toBe(true);
		expect(sum.value).toBe(8);
		expect(sum.dirty).toBe(false);

		expect(doubleSum.dirty).toBe(true);
		expect(doubleSum.value).toBe(16);
		expect(doubleSum.dirty).toBe(false);
	});
});

describe('effect', () => {
	it('becomes dirty when dependencies change', () => {
		const state = new State(0);
		const effect = new Effect(() => state.value += 1);
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
		const state = new State(0);
		const effect = new Effect(() => state.value += 1);
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		effect.dispose();
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		state.value = 0;
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(0);
	});

	describe('createImmediate', () => {
		it('executes immediately', { timeout: 200 }, async () => {
			const state = new State(1);
			const effect = Effect.createImmediate(() => state.value *= 2);
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
});
