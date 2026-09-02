import { describe, it, expect } from 'vitest';
import { createAsyncIteratorWithController } from './async-iterator.js';

describe(createAsyncIteratorWithController.name, () => {
	it('should yield values as they are pushed', async () => {
		const { controller, iterator } = createAsyncIteratorWithController<number>();

		{
			const promise = expect(iterator.next()).resolves.toEqual({ value: 1, done: false });
			controller.enqueue(1);
			await new Promise<void>(queueMicrotask);
			await promise;
		}

		{
			const promise = expect(iterator.next()).resolves.toEqual({ value: 2, done: false });
			controller.enqueue(2);
			await new Promise<void>(queueMicrotask);
			await promise;
		}

		{
			const promise = expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
			controller.close();
			await new Promise<void>(queueMicrotask);
			await promise;
		}
	});

	it('should yield pushed values in order', async () => {
		const { controller, iterator } = createAsyncIteratorWithController<number>();

		controller.enqueue(1);
		controller.enqueue(2);
		controller.enqueue(3);
		controller.close();

		const results: number[] = [];
		for await (const value of iterator) {
			results.push(value);
		}

		expect(results).toEqual([1, 2, 3]);
	});

	it('should throw when throw is called', async () => {
		const iteratorWithPusher = createAsyncIteratorWithController<number>();
		const { controller, iterator } = iteratorWithPusher;
		const errorInstance = new Error('Test error');

		controller.enqueue(1);
		controller.enqueue(2);
		controller.error(errorInstance);

		const results: number[] = [];
		let caughtError: Error | null = null;

		try {
			for await (const value of iterator) {
				results.push(value);
			}
		} catch (error) {
			caughtError = error as Error;
		}

		expect(results).toEqual([]);
		expect(caughtError).toBe(errorInstance);
	});

	it ('should resolve promises returned by next() in the same order as the values were pushed', async () => {
		const iteratorWithPusher = createAsyncIteratorWithController<number>();
		const { controller, iterator } = iteratorWithPusher;

		const nextPromises = [iterator.next(), iterator.next(), iterator.next(), iterator.next()];

		controller.enqueue(1);
		controller.enqueue(2);
		controller.enqueue(3);
		controller.close();

		const results = await Promise.all(nextPromises);

		expect(results).toEqual([
			{ value: 1, done: false },
			{ value: 2, done: false },
			{ value: 3, done: false },
			{ value: undefined, done: true },
		]);
	});
});
