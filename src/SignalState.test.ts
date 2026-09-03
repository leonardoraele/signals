import { describe, it, expect, vi } from 'vitest';
import { SignalState } from './SignalState.js';

describe(SignalState.name, () => {
	it('is set synchronously', () => {
		const state = new SignalState(1);
		expect(state.value).toBe(1);
		state.value = 2;
		expect(state.value).toBe(2);
	});

	it('emits events when changed', async () =>{
		const state = new SignalState(1);
		const fn = vi.fn();
		state.events.addEventListener('change', fn);
		state.value = 2;
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
