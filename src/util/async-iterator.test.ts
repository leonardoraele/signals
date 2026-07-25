import { describe, it, expect } from 'vitest';
import { createAsyncIteratorWithController } from './async-iterator.js';

describe(createAsyncIteratorWithController.name, () => {
	it('should yield pushed values in order', async () => {
		const { controller, iterator } = createAsyncIteratorWithController<number>();

		controller.push(1);
		controller.push(2);
		controller.push(3);
		controller.return();

		const results: number[] = [];
		for await (const value of iterator) {
			results.push(value);
		}

		expect(results).toEqual([1, 2, 3]);
		await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
	});

	it('should complete when return is called', async () => {
		const iteratorWithPusher = createAsyncIteratorWithController<number, number>();
		const { controller, iterator } = iteratorWithPusher;

		controller.push(1);
		controller.push(2);
		controller.return(42);

		const results: number[] = [];
		for await (const value of iterator) {
			results.push(value);
		}

		expect(results).toEqual([1, 2]);
		await expect(iterator.next()).resolves.toEqual({ value: 42, done: true });
	});

	it('should throw when throw is called', async () => {
		const iteratorWithPusher = createAsyncIteratorWithController<number>();
		const { controller, iterator } = iteratorWithPusher;

		controller.push(1);
		controller.push(2);
		controller.throw(new Error('Test error'));

		const results: number[] = [];
		let caughtError: Error | null = null;

		try {
			for await (const value of iterator) {
				results.push(value);
			}
		} catch (error) {
			caughtError = error as Error;
		}

		expect(results).toEqual([1, 2]);
		expect(caughtError).toBeInstanceOf(Error);
		expect(caughtError?.message).toBe('Test error');
	});

	it ('should resolve promises returned by next() in the same order as the values were pushed', async () => {
		const iteratorWithPusher = createAsyncIteratorWithController<number>();
		const { controller, iterator } = iteratorWithPusher;

		const nextPromises = [iterator.next(), iterator.next(), iterator.next()];

		controller.push(1);
		controller.push(2);
		controller.push(3);

		const results = await Promise.all(nextPromises);

		expect(results).toEqual([
			{ value: 1, done: false },
			{ value: 2, done: false },
			{ value: 3, done: false },
		]);
	});
});
