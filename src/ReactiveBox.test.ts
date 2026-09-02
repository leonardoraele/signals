import { describe, it, expect, vi } from 'vitest';
import { ReactiveBox } from './ReactiveBox.js';
import { AsyncIterator } from 'async-iterator-helpers-ponyfill';

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
		AsyncIterator.from(state.observe()).forEach(fn);
		state.value = 2;
		await new Promise<void>(resolve => setTimeout(resolve, 0));
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
