export interface GetKeysOptions {
	nonEnumerables?: boolean;
	symbols?: boolean;
	inherited?: boolean;
}

export function getKeys(subject: object, options?: GetKeysOptions): Set<string|symbol> {
	let keys = new Set<string|symbol>(Object.keys(subject));

	if (options?.symbols) {
		keys = keys.union(new Set(Object.getOwnPropertySymbols(subject)));
	}

	if (options?.nonEnumerables) {
		keys = keys.union(new Set(Object.getOwnPropertyNames(subject)));
	}

	if (options?.inherited) {
		const prototype = Object.getPrototypeOf(subject);
		if (typeof prototype === 'object' && prototype !== null) {
			keys = keys.union(getKeys(prototype, options));
		}
	}

	return keys;
}

export interface SearchPropertiesDeepOptions extends GetKeysOptions {
	order?: 'depth-first' | 'breadth-first' | 'drilldown';
	yield?: 'objects' | 'primitives' | 'all';
}

/**
 * Recursively searches for properties in an object and the objects it contains.
 *
 * This method returns a generator that yields a tuple for each property found. Each tuple has the following values:
 * 0. The path to the property, as an array of keys. It is guaranteed not to be empty.
 * 1. The value of the property.
 * 2. The object containing the property.
 * 3. The searched object. (the object passed as argument to this function)
 *
 * @example
 *
 * const tuples = searchPropertiesDeep({
 *     a: {
 *         b: {
 *             c: 1,
 *         },
 *         d: 2,
 *     },
 *     e: 3,
 * }).toArray();
 * assert.deepEqual(tuples, [
 *     [
 *         ['a', 'b', 'c'],
 *         1,
 *         { c: 1 },
 *         { a: { b: { c: 1 }, d: 2 }, e: 3 },
 *     ],
 *     [
 *         ['a', 'd'],
 *         2,
 *         { b: { c: 1 }, d: 2 },
 *         { a: { b: { c: 1 }, d: 2 }, e: 3 },
 *     ],
 *     [
 *         ['e'],
 *         3,
 *         { a: { b: { c: 1 }, d: 2 }, e: 3 },
 *         { a: { b: { c: 1 }, d: 2 }, e: 3 },
 *     ],
 * ]);
 */
export type SearchPropertiesDeepResult<ValueType = unknown, SubjectType = object> = [(string|symbol)[], ValueType, Record<(string|symbol), ValueType>, SubjectType];

export function* searchPropertiesDeep<T = unknown, S extends object = object>(subject: S, options?: SearchPropertiesDeepOptions): Generator<SearchPropertiesDeepResult<T, S>> {
	options ??= {};
	options.order ??= 'depth-first';
	options.yield ??= 'primitives';

	function* _searchPropertiesDeep(object: object, objectPath: (string|symbol)[]): Generator<SearchPropertiesDeepResult<T, S>> {
		const keys = getKeys(object, options);

		if (options?.order === 'breadth-first') {
			for (const key of keys) {
				const propertyPath = [...objectPath, key];
				const propertyValue = (object as Record<string|symbol, T>)[key]!;
				yield [propertyPath, propertyValue, object as any, subject];
			}
		}

		for (const key of keys) {
			const propertyPath = [...objectPath, key];
			const propertyValue = (object as Record<string|symbol, T>)[key]!;

			if (options?.order === 'drilldown') {
				yield [propertyPath, propertyValue, object as any, subject];
			}

			if (typeof propertyValue === 'object' && propertyValue !== null) {
				yield* _searchPropertiesDeep(propertyValue, propertyPath);
			}

			if (options?.order === 'depth-first') {
				yield [propertyPath, propertyValue, object as any, subject];
			}
		}
	}

	yield* _searchPropertiesDeep(subject, [])
		.filter(([_path, value]) =>
			options?.yield === 'objects' ? typeof value === 'object' && value !== null
			: options?.yield === 'primitives' ? typeof value !== 'object' || value === null
			: options?.yield === 'all'
		);
}

export function getPropDeep<T = unknown>(subject: object, path: (string|symbol)[]): T|undefined {
	for (let i = 0; i < path.length; i++) {
		const key = path[i]!;
		if (typeof subject !== 'object' || subject === null) {
			return undefined;
		}
		subject = (subject as Record<string|symbol, unknown>)[key] as any;
	}
	return subject as T;
}
