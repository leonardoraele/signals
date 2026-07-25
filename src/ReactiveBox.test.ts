import { describe, it, expect, vi } from 'vitest';
import { ReactiveBox } from './ReactiveBox.js';

describe(ReactiveBox.name, () => {
	it('is set synchronously', () => {
		const state = new ReactiveBox(1);
		expect(state.value).toBe(1);
		state.value = 2;
		expect(state.value).toBe(2);
	});

	it('emits events when changed', async () =>{
		const state = new ReactiveBox(1);
		const fn = vi.fn();
		state.events.on('change', fn);
		state.value = 2;
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
