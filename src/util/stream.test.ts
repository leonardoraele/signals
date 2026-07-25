import { describe, it, expect } from 'vitest';
import { createReadableStreamWithController } from './stream.js';

describe(createReadableStreamWithController.name, () => {
	it('should yield values as they are pushed', async () => {
		const { controller, stream } = createReadableStreamWithController<number>();
		const reader = stream.getReader();

		{
			const promise = expect(reader.read()).resolves.toEqual({ value: 1, done: false });
			controller.enqueue(1);
			await new Promise<void>(queueMicrotask);
			await promise;
		}

		{
			const promise = expect(reader.read()).resolves.toEqual({ value: 2, done: false });
			controller.enqueue(2);
			await new Promise<void>(queueMicrotask);
			await promise;
		}

		{
			const promise = expect(reader.read()).resolves.toEqual({ value: undefined, done: true });
			controller.close();
			await new Promise<void>(queueMicrotask);
			await promise;
		}
	});

	it('should yield pushed values in order', async () => {
		const { controller, stream } = createReadableStreamWithController<number>();

		controller.enqueue(1);
		controller.enqueue(2);
		controller.enqueue(3);
		controller.close();

		const results: number[] = [];
		for await (const value of stream) {
			results.push(value);
		}

		expect(results).toEqual([1, 2, 3]);
	});

	it('should throw when throw is called', async () => {
		const iteratorWithPusher = createReadableStreamWithController<number>();
		const { controller, stream } = iteratorWithPusher;
		const errorInstance = new Error('Test error');

		controller.enqueue(1);
		controller.enqueue(2);
		controller.error(errorInstance);

		const results: number[] = [];
		let caughtError: Error | null = null;

		try {
			for await (const value of stream) {
				results.push(value);
			}
		} catch (error) {
			caughtError = error as Error;
		}

		expect(results).toEqual([]);
		expect(caughtError).toBe(errorInstance);
	});

	it ('should resolve promises returned by next() in the same order as the values were pushed', async () => {
		const iteratorWithPusher = createReadableStreamWithController<number>();
		const { controller, stream } = iteratorWithPusher;
		const reader = stream.getReader();

		const nextPromises = [reader.read(), reader.read(), reader.read(), reader.read()];

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
