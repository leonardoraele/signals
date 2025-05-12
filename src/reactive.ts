import { SignalController, SignalEmitter } from 'signal-controller';
import { SignalSource } from './signal-source.js';
import { searchPropertiesDeep } from './util/property-iterator.js';

const PROXY_ESCAPE_SYMBOL = Symbol('observable');

export interface MakeReactiveOptions {
	/** If `true`, the object is not recursively made reactive. */
	shallow?: boolean;
}

export function makeReactive<T extends object>(subject: T, { shallow = false }: MakeReactiveOptions = {}): T {
	if (!shallow) {
		searchPropertiesDeep<any>(subject, { yield: 'objects', order: 'depth-first' })
			.filter(([_path, object]) => !isReactive(object))
			.forEach(([path, object, owner]) => {
				owner[path.at(-1)!] = makeReactive(object);
			});
	}
	if (isReactive(subject)) {
		return subject;
	}
	const sources = {} as { // TODO Does it makes sense to use `WeakMap` here?
		[key: string|symbol]: {
			controller: SignalController<{ change(): void; }>;
			events: SignalEmitter<{ change(): void; }>;
		};
	};
	const notifyUsage = (key: string|symbol) => {
		const source = sources[key] ??= (() => {
			const controller = new SignalController<{ change(): void; }>();
			return {
				_debug: key,
				controller,
				events: controller.signal,
			};
		})();
		SignalSource.notifyUsage(source);
	};
	const notifyChange = (key: string|symbol) => sources[key]?.controller.emit('change');;
	const self = Symbol('self');
	return new Proxy(subject, {
		apply(target: any, thisArg, argArray) {
			notifyUsage(self);
			return Reflect.apply(target, thisArg, argArray);
		},
		construct(target, args, newTarget) {
			notifyUsage(self);
			return Reflect.construct(target, args, newTarget);
		},
		defineProperty(target, key, descriptor) {
			notifyChange(key);
			notifyChange(self);
			const result = Reflect.defineProperty(target, key, descriptor);
			if (!shallow) {
				const value = descriptor.value ?? descriptor.get?.();
				if (typeof value === 'object' && value !== null) {
					Reflect.set(target, key, makeReactive(value, { shallow }));
				}
			}
			return result;
		},
		deleteProperty(target, key) {
			notifyChange(key);
			return Reflect.deleteProperty(target, key);
		},
		get(target, key, receiver) {
			if (key === PROXY_ESCAPE_SYMBOL) {
				return subject;
			}
			notifyUsage(key);
			return Reflect.get(target, key, receiver);
		},
		getOwnPropertyDescriptor(target, key) {
			notifyUsage(key);
			return Reflect.getOwnPropertyDescriptor(target, key);
		},
		getPrototypeOf(target) {
			notifyUsage(self);
			return Reflect.getPrototypeOf(target);
		},
		has(target, key) {
			if (key === PROXY_ESCAPE_SYMBOL) {
				return true;
			}
			notifyUsage(key);
			return Reflect.has(target, key);
		},
		isExtensible(target) {
			notifyUsage(self);
			return Reflect.isExtensible(target);
		},
		ownKeys(target) {
			const keys = Reflect.ownKeys(target);
			[...keys, self].forEach(key => notifyUsage(key));
			return keys;
		},
		preventExtensions(target) {
			notifyChange(self);
			return Reflect.preventExtensions(target);
		},
		set(target, key, newValue, receiver) {
			if (!shallow && typeof newValue === 'object' && newValue !== null) {
				newValue = makeReactive(newValue, { shallow });
			}
			notifyChange(key);
			return Reflect.set(target, key, newValue, receiver);
		},
		setPrototypeOf(target, value) {
			notifyChange(self);
			return Reflect.setPrototypeOf(target, value);
		},
	});
}

export function isReactive(subject: object): boolean {
	return PROXY_ESCAPE_SYMBOL in subject;
}

export function unwrapReactive<T extends object>(subject: T): T {
	return PROXY_ESCAPE_SYMBOL in subject
		? subject[PROXY_ESCAPE_SYMBOL] as T
		: subject;
}

export function unmakeReactive<T extends object>(subject: T): T {
	searchPropertiesDeep<any>(subject, { yield: 'objects', order: 'depth-first' })
		.filter(([_path, object]) => !isReactive(object))
		.forEach(([path, object, owner]) => {
			owner[path.at(-1)!] = unwrapReactive(object);
		});
	return unwrapReactive(subject);
}
