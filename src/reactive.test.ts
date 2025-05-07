import { describe, it, expect, beforeEach } from 'vitest';
import { makeReactive, isReactive, unwrapReactive, unmakeReactive } from './reactive';
import { Computed } from './computed';

describe('reactive proxy', () => {
	describe('property reactivity', () => {
		it('should notify changes on property set', () => {
			const obj = { a: 1 };
			const proxy = makeReactive(obj);
			const doubleA = new Computed(() => proxy.a * 2);
			expect(doubleA.value).toBe(2);
			expect(doubleA.dirty).toBe(false);
			proxy.a = 3;
			expect(doubleA.dirty).toBe(true);
			expect(doubleA.value).toBe(6);
		});

		it('should notify changes on property delete', () => {
			const obj = { a: 1 } as { a?: number };
			const proxy = makeReactive(obj);
			const doubleA = new Computed(() => 'a' in proxy ? proxy.a * 2 : 0);
			expect(doubleA.value).toBe(2);
			expect(doubleA.dirty).toBe(false);
			delete proxy.a;
			expect(doubleA.dirty).toBe(true);
			expect(doubleA.value).toBe(0);
		});

		it('should notify changes to individual properties separately', () => {
			const obj = { a: 1, b: 2 };
			const proxy = makeReactive(obj);
			const doubleA = new Computed(() => proxy.a * 2);
			const doubleB = new Computed(() => proxy.b * 2);
			doubleA.forceRerun(); // Force clean for this test
			doubleB.forceRerun(); // Force clean for this test
			proxy.a = 3;
			expect(doubleA.dirty).toBe(true);
			expect(doubleB.dirty).toBe(false);
		});

		describe('new properties', () => {
			it('should make new properties reactive', () => {
				const obj = {} as { nested?: { a: number } };
				const proxy = makeReactive(obj);
				proxy.nested = { a: 1 };
				expect(isReactive(proxy.nested)).toBe(true);
			});
		});

		describe('property accessors', () => {
			let obj: Record<string, number>;
			let proxy: Record<string, number>;

			beforeEach(() => {
				obj = { a: 1, b: 2 } as Record<string, number>;
				proxy = makeReactive(obj);
			});

			it('works with for..in loop', () => {
				const entries = new Computed(() => function*() {
					for (const key in proxy) {
						yield [key, proxy[key]];
					}
				}().toArray());
				expect(entries.value).toEqual([['a', 1], ['b', 2]]);
				proxy.c = 3;
				expect(entries.value).toEqual([['a', 1], ['b', 2], ['c', 3]]);
			});

			it('works with for..of loop', () => {
				const values = new Computed(() => function*() {
					for (const value of Object.values(proxy)) {
						yield value;
					}
				}().toArray());
				expect(values.value).toEqual([1, 2]);
				proxy.c = 3;
				expect(values.value).toEqual([1, 2, 3]);
			});

			it('works with Object.keys', () => {
				const keys = new Computed(() => Object.keys(proxy));
				expect(keys.value).toEqual(['a', 'b']);
				proxy.c = 3;
				expect(keys.value).toEqual(['a', 'b', 'c']);
			});

			it('works with Object.values', () => {
				const values = new Computed(() => Object.values(proxy));
				expect(values.value).toEqual([1, 2]);
				proxy.c = 3;
				expect(values.value).toEqual([1, 2, 3]);
			});

			it('works with Object.entries', () => {
				const entries = new Computed(() => Object.entries(proxy));
				expect(entries.value).toEqual([['a', 1], ['b', 2]]);
				proxy.c = 3;
				expect(entries.value).toEqual([['a', 1], ['b', 2], ['c', 3]]);
			});
		});

		describe('reactive arrays', () => {
			let arr: number[];
			let proxy: number[];
			let len: Computed<number>;
			let set: Computed<Set<number>>;
			let sum: Computed<number>;
			let sec: Computed<number|undefined>;
			let last: Computed<number|undefined>;

			beforeEach(() => {
				arr = [0, 1, 2, 3, 4];
				proxy = makeReactive(arr);
				len = new Computed(() => proxy.length);
				set = new Computed(() => new Set(proxy));
				sum = new Computed(() => proxy.reduce((acc, val) => acc + val, 0));
				sec = new Computed(() => proxy[1]);
				last = new Computed(() => proxy[proxy.length - 1]);
			});

			it('should compute the sum and set correctly', () => {
				expect(len.value).toBe(5);
				expect(sum.value).toBe(10);
				expect(set.value).toEqual(new Set([0, 1, 2, 3, 4]));
				expect(sec.value).toBe(1);
				expect(last.value).toBe(4);
				expect(len.dirty).toBe(false);
				expect(sum.dirty).toBe(false);
				expect(set.dirty).toBe(false);
				expect(sec.dirty).toBe(false);
				expect(last.dirty).toBe(false);
			});

			it('should react to push', () => {
				proxy.push(3);
				expect(proxy).toEqual([0, 1, 2, 3, 4, 3]);
				expect(len.value).toBe(6);
				expect(sum.value).toBe(13);
				expect(set.value).toEqual(new Set([0, 1, 2, 3, 4, 3]));
				expect(sec.value).toBe(1);
				expect(last.value).toBe(3);
			});

			it('should react to splice', () => {
				proxy.splice(1, 3, -1);
				expect(proxy).toEqual([0, -1, 4]);
				expect(sum.value).toBe(3);
				expect(proxy.length).toBe(3);
				expect(set.value).toEqual(new Set([0, -1, 4]));
				expect(len.value).toBe(3);
				expect(sec.value).toBe(-1);
				expect(last.value).toBe(4);
			});

			it('should react to length being overriden', () => {
				proxy.length = 0;
				expect(proxy).toEqual([]);
				expect(len.value).toBe(0);
				expect(sum.value).toBe(0);
				expect(set.value).toEqual(new Set());
				expect(sec.value).toBe(undefined);
				expect(last.value).toBe(undefined);
			});

			it('should react to being cleared', () => {
				proxy.splice(0, proxy.length);
				expect(proxy).toEqual([]);
				expect(len.value).toBe(0);
				expect(sum.value).toBe(0);
				expect(set.value).toEqual(new Set());
				expect(sec.value).toBe(undefined);
				expect(last.value).toBe(undefined);
			});
		});
	});

	describe('isReactive', () => {
		it('should check whether a value is reactive', () => {
			const obj = { a: 1 };
			const proxy = makeReactive(obj);
			expect(isReactive(proxy)).toBe(true);
			expect(proxy.a).toBe(1);
			proxy.a = 2;
			expect(proxy.a).toBe(2);
		});

		it('should return false for non-reactive values', () => {
			const obj = { a: 1 };
			expect(isReactive(obj)).toBe(false);
		});
	});

	describe('unwrapReactive', () => {
		it('should unwrap reactive proxy', () => {
			const obj = { a: 1 } as { a?: number };
			const proxy = makeReactive(obj);
			const doubleA = new Computed(() => 'a' in proxy ? proxy.a * 2 : 0);
			expect(doubleA.value).toBe(2);
			expect(doubleA.dirty).toBe(false);
			const unwrapped = unwrapReactive(proxy);
			unwrapped.a = 3;
			delete unwrapped.a;
			expect(doubleA.dirty).toBe(false);
			expect(doubleA.value).toBe(2);
		});
	});

	describe('shallow option', () => {
		it('should not observe nested objects when shallow option is set', () => {
			const obj = { a: { b: 2 } };
			const proxy = makeReactive(obj, { shallow: true });
			const doubleAB = new Computed(() => proxy.a.b * 2);
			expect(doubleAB.value).toBe(4);
			expect(isReactive(proxy.a)).toBe(false);
			proxy.a.b = 3;
			expect(doubleAB.dirty).toBe(false);
			expect(doubleAB.value).toBe(4);
		});

		it('should handle nested objects with shallow option', () => {
			const obj = { a: { b: 2 } };
			const proxy = makeReactive(obj, { shallow: false });
			const doubleAB = new Computed(() => proxy.a.b * 2);
			expect(isReactive(proxy.a)).toBe(true);
			expect(doubleAB.value).toBe(4);
			proxy.a.b = 3;
			expect(doubleAB.value).toBe(6);
			expect(proxy.a.b).toBe(3);
		});

		it('should not make new properties reactive when shallow option is set', () => {
			const obj = {} as { nested?: { a: number } };
			const proxy = makeReactive(obj, { shallow: true });
			proxy.nested = { a: 1 };
			expect(isReactive(proxy.nested)).toBe(false);
		});
	});

	describe('unmakeReactive', () => {
		it('should make a reactive reactive object not reactive', () => {
			const obj = { a: 1 };
			const proxy = makeReactive(obj);
			const doubleA = new Computed(() => proxy.a * 2);
			expect(doubleA.value).toBe(2);
			expect(doubleA.dirty).toBe(false);
			const unreactive = unmakeReactive(proxy);
			expect(unreactive).toBe(obj);
			unreactive.a = 3;
			expect(doubleA.dirty).toBe(false);
			expect(doubleA.value).toBe(2);
			proxy.a = 4;
			expect(doubleA.dirty).toBe(true);
			expect(doubleA.value).toBe(8);
		});
	});
});
