import { describe, it, expect, vi } from 'vitest';
import { State } from './state.js';
import { Effect } from './effect.js';

describe('effect', () => {
	it('becomes dirty when dependencies change', () => {
		const state = new State(0);
		const effect = new Effect(() => state.value += 1);
		expect(effect.dirty).toBe(false);
		expect(state.value).toBe(1);
		state.value = 0;
		expect(effect.dirty).toBe(true);
		expect(state.value).toBe(0);
	});

	it('runs on reevaluation only if dirty', () => {
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

	it('can be forced by the client to rerun', () => {
		const fn = vi.fn();
		const effect = new Effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);
		effect.forceRerun();
		expect(fn).toHaveBeenCalledTimes(2);
	});

	describe('lazy option', () => {
		it('is eager by default, and runs synchronously at creation', () => {
			const fn = vi.fn();
			new Effect(fn);
			expect(fn).toHaveBeenCalled();
		});
		it('do not run at creation is set to lazy', () => {
			const fn = vi.fn();
			const effect = new Effect(fn, { lazy: true });
			expect(effect.dirty).toBe(true);
			expect(fn).not.toHaveBeenCalled();
			effect.reevaluate();
			expect(effect.dirty).toBe(false);
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe('createImmediate static function', () => {
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
