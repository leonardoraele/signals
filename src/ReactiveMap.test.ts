import { describe, it, expect } from 'vitest';
import { Computed } from './Computed';
import { ReactiveMap } from './ReactiveMap';

describe(ReactiveMap.name, () => {
	it('works', () => {
		const map = new ReactiveMap<string, number>([['a', 1], ['b', 2], ['c', 3]]);
		const size = new Computed(() => map.size);
		const sum = new Computed(() => map.values().reduce((a, b) => a + b, 0));
		const keys = new Computed(() => map.keys().toArray().sort());

		// { a: 1, b: 2, c: 3 }
		expect(size.value).toBe(3);
		expect(sum.value).toBe(6);
		expect(keys.value).toEqual(['a', 'b', 'c']);

		map.set('d', 4);

		// { a: 1, b: 2, c: 3, d: 4 }
		expect(size.value).toBe(4);
		expect(sum.value).toBe(10);
		expect(keys.value).toEqual(['a', 'b', 'c', 'd']);

		map.set('a', 5);

		// { a: 5, b: 2, c: 3, d: 4 }
		expect(size.value).toBe(4);
		expect(sum.value).toBe(14);
		expect(keys.value).toEqual(['a', 'b', 'c', 'd']);

		map.delete('c');

		// { a: 5, b: 2, d: 4 }
		expect(size.value).toBe(3);
		expect(sum.value).toBe(11);
		expect(keys.value).toEqual(['a', 'b', 'd']);

		// no change
		expect(map.getOrInsert('b', 10)).toBe(2);
		expect(size.value).toBe(3);
		expect(sum.value).toBe(11);
		expect(keys.value).toEqual(['a', 'b', 'd']);

		// { a: 5, b: 2, c: 7, d: 4 }
		expect(map.getOrInsert('c', 7)).toBe(7);
		expect(size.value).toBe(4);
		expect(sum.value).toBe(18);
		expect(keys.value).toEqual(['a', 'b', 'c', 'd']);

		map.clear();

		// {}
		expect(size.value).toBe(0);
		expect(sum.value).toBe(0);
		expect(keys.value).toEqual([]);
	});
});
