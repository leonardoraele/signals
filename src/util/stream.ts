/**
 * Creates a readable stream with a transparently exposed controller that can be used to control the flow of data.
 *
 * Once you are done pushing values to the stream, you can call `controller.close()` to signal that no more values will
 * be pushed, or `controller.error(error)` to signal that an error has occurred.
 */
export function createReadableStreamWithController<T = unknown>() {
	let controller: ReadableStreamDefaultController<T>;
	const stream = new ReadableStream<T>({ start: c => controller = c });
	return { controller: controller!, stream };
}
