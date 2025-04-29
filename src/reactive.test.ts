import { describe, it, expect } from 'vitest';
import { makeReactive, isReactive, unwrapReactive } from './reactive';
import { Computed } from './computed';

describe('reactive proxy', () => {
	it('should create an reactive proxy', () => {
		const obj = { a: 1 };
		const proxy = makeReactive(obj);
		expect(isReactive(proxy)).toBe(true);
		expect(proxy.a).toBe(1);
		proxy.a = 2;
		expect(proxy.a).toBe(2);
	});

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

	it('should not observe nested objects when deep option is disabled', () => {
		const obj = { a: { b: 2 } };
		const proxy = makeReactive(obj, { deep: false });
		const doubleAB = new Computed(() => proxy.a.b * 2);
		expect(doubleAB.value).toBe(4);
		expect(isReactive(proxy.a)).toBe(false);
		proxy.a.b = 3;
		expect(doubleAB.dirty).toBe(false);
		expect(doubleAB.value).toBe(4);
	});

	it('should handle nested objects with deep option', () => {
		const obj = { a: { b: 2 } };
		const proxy = makeReactive(obj, { deep: true });
		const doubleAB = new Computed(() => proxy.a.b * 2);
		expect(isReactive(proxy.a)).toBe(true);
		expect(doubleAB.value).toBe(4);
		proxy.a.b = 3;
		expect(doubleAB.value).toBe(6);
		expect(proxy.a.b).toBe(3);
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

	it('should observe arrays', () => {
		const arr = [0, 1, 2, 3, 4];
		const proxy = makeReactive(arr);
		const sum = new Computed(() => proxy.reduce((acc, val) => acc + val, 0));
		expect(sum.value).toBe(10);
		expect(sum.dirty).toBe(false);
		proxy.splice(1, 3, -1);
		expect(sum.dirty).toBe(true);
		expect(sum.value).toBe(3);
		expect(proxy.length).toBe(3);
		expect(proxy).toEqual([0, -1, 4]);
	});
});
