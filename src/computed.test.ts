import { describe, it, expect } from 'vitest';
import { State } from './state.js';
import { Computed } from './computed.js';

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
