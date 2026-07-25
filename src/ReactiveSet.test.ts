import { describe, it, expect } from 'vitest';
import { Computed } from './computed';
import { ReactiveSet } from './ReactiveSet';

describe(ReactiveSet.name, () => {
	it('works', () => {
		const set1 = new ReactiveSet<number>([1, 2, 3]);
		const set2 = new ReactiveSet<number>([2, 3, 4, 5, 6]);
		const size1 = new Computed(() => set1.size);
		const size2 = new Computed(() => set2.size);
		const sum1 = new Computed(() => set1.values().reduce((a, b) => a + b, 0));
		const sum2 = new Computed(() => set2.values().reduce((a, b) => a + b, 0));
		const unique1 = new Computed(() => set1.difference(set2).values().toArray().sort());
		const unique2 = new Computed(() => set2.difference(set1).values().toArray().sort());
		const union = new Computed(() => set1.union(set2).values().toArray().sort());
		const inters = new Computed(() => set1.intersection(set2).values().toArray().sort());
		const sdiff = new Computed(() => set1.symmetricDifference(set2).values().toArray().sort());

		expect(Array.from(set1).sort()).toEqual([1, 2, 3]);
		expect(Array.from(set2).sort()).toEqual([2, 3, 4, 5, 6]);
		expect(size1.value).toBe(3);
		expect(size2.value).toBe(5);
		expect(sum1.value).toBe(6);
		expect(sum2.value).toBe(20);
		expect(unique1.value).toEqual([1]);
		expect(unique2.value).toEqual([4, 5, 6]);
		expect(union.value).toEqual([1, 2, 3, 4, 5, 6]);
		expect(inters.value).toEqual([2, 3]);
		expect(sdiff.value).toEqual([1, 4, 5, 6]);

		set1.add(4);

		expect(Array.from(set1).sort()).toEqual([1, 2, 3, 4]);
		expect(Array.from(set2).sort()).toEqual([2, 3, 4, 5, 6]);
		expect(size1.value).toBe(4);
		expect(size2.value).toBe(5);
		expect(sum1.value).toBe(10);
		expect(sum2.value).toBe(20);
		expect(unique1.value).toEqual([1]);
		expect(unique2.value).toEqual([5, 6]);
		expect(union.value).toEqual([1, 2, 3, 4, 5, 6]);
		expect(inters.value).toEqual([2, 3, 4]);
		expect(sdiff.value).toEqual([1, 5, 6]);

		set2.delete(2);

		expect(Array.from(set1).sort()).toEqual([1, 2, 3, 4]);
		expect(Array.from(set2).sort()).toEqual([3, 4, 5, 6]);
		expect(size1.value).toBe(4);
		expect(size2.value).toBe(4);
		expect(sum1.value).toBe(10);
		expect(sum2.value).toBe(18);
		expect(unique1.value).toEqual([1, 2]);
		expect(unique2.value).toEqual([5, 6]);
		expect(union.value).toEqual([1, 2, 3, 4, 5, 6]);
		expect(inters.value).toEqual([3, 4]);
		expect(sdiff.value).toEqual([1, 2, 5, 6]);

		set1.clear();

		expect(Array.from(set1).sort()).toEqual([]);
		expect(Array.from(set2).sort()).toEqual([3, 4, 5, 6]);
		expect(size1.value).toBe(0);
		expect(size2.value).toBe(4);
		expect(sum1.value).toBe(0);
		expect(sum2.value).toBe(18);
		expect(unique1.value).toEqual([]);
		expect(unique2.value).toEqual([3, 4, 5, 6]);
		expect(union.value).toEqual([3, 4, 5, 6]);
		expect(inters.value).toEqual([]);
		expect(sdiff.value).toEqual([3, 4, 5, 6]);

		set2.clear();

		expect(Array.from(set1).sort()).toEqual([]);
		expect(Array.from(set2).sort()).toEqual([]);
		expect(size1.value).toBe(0);
		expect(size2.value).toBe(0);
		expect(sum1.value).toBe(0);
		expect(sum2.value).toBe(0);
		expect(unique1.value).toEqual([]);
		expect(unique2.value).toEqual([]);
		expect(union.value).toEqual([]);
		expect(inters.value).toEqual([]);
		expect(sdiff.value).toEqual([]);
	});
});
