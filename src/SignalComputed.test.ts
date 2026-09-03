import { describe, it, expect } from 'vitest';
import { SignalState } from './SignalState.js';
import { SignalComputed } from './SignalComputed.js';

describe('computed state', () => {
	it('updates lazily, when dependencies change', () => {
		const a = new SignalState(2);
		const b = new SignalState(3);
		const sum = new SignalComputed(() => a.value + b.value);
		const doubleSum = new SignalComputed(() => sum.value * 2);

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
