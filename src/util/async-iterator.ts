export interface AsyncIteratorWithController<T, TReturn = void> {
	controller: {
		push(value: T): void;
		return(value: TReturn): void;
		throw(error: Error): void;
	};
	iterator: AsyncIterator<T, TReturn> & AsyncIterable<T, TReturn>;
}

/**
 * Creates an async iterator with a pusher function that allows pushing values into the iterator. The iterator will
 * yield the pushed values in the order they were pushed.
 *
 * The iterator can be closed by calling the return function, which will cause the iterator to yield a final value and
 * then complete.
 *
 * The iterator can also be closed by calling the throw function, which will cause the promise returned by the next()
 * method to be rejected with the provided error.
 */
export function createAsyncIteratorWithController<T = unknown, TReturn = void>(): AsyncIteratorWithController<T, TReturn> {
	let returnValue: TReturn | undefined;
	let errorValue: Error | undefined;
	let done = false;
	let bus = new EventTarget();
	const queue: T[] = [];
	return {
		controller: {
			push(value: T) {
				queue.push(value);
				bus.dispatchEvent(new Event('change'));
			},
			return(value: TReturn): void {
				returnValue = value;
				done = true;
				bus.dispatchEvent(new Event('change'));
			},
			throw(error: Error): void {
				errorValue = error;
				done = true;
				bus.dispatchEvent(new Event('change'));
			},
		},
		iterator: {
			async next(): Promise<IteratorResult<T, TReturn>> {
				while (queue.length === 0 && !done && !errorValue) {
					await new Promise<void>(resolve => bus.addEventListener('change', () => resolve(), { once: true }));
				}
				if (queue.length > 0) {
					return { value: queue.shift()!, done: false };
				}
				if (errorValue) {
					throw errorValue;
				}
				return { value: returnValue!, done: true };
			},
			return(value: TReturn): Promise<IteratorResult<T, TReturn>> {
				returnValue = value;
				done = true;
				return Promise.resolve({ value, done });
			},
			throw(e: Error): Promise<IteratorResult<T, TReturn>> {
				errorValue = e;
				done = true;
				return Promise.resolve({ value: undefined as unknown as TReturn, done });
			},
			[Symbol.asyncIterator](): AsyncIterator<T, TReturn> {
				return this;
			},
		},
	};
}
