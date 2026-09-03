import { EventController, EventEmitter } from '@leonardoraele/event-controller';
import { SignalSource } from './SignalSource.js';
import { searchPropertiesDeep } from './util/property-iterator.js';

const PROXY_ESCAPE_SYMBOL = Symbol('observable');

/**
 * This function takes an object and returns a reactive proxy of that object. The reactive proxy will emit change events
 * whenever any property of the object is changed.
 *
 * If the `deep` option is set to `true`, the function will also make all nested objects reactive.
 *
 * If the `atomic` option is set to `true`, the function will treat the entire object as a single unit, and any change
 * to any property will emit a change event for the entire object. This means any effect that depends on one property of
 * the object will be re-run whenever that property or any other property of the object changes.
 */
export function makeReactive<T extends object>(subject: T, { deep = false, atomic = false } = {}): T {
	if (deep) {
		searchPropertiesDeep<any>(subject, { yield: 'objects', order: 'depth-first' })
			.filter(([_path, object]) => !isReactiveProxy(object))
			.forEach(([path, object, owner]) => {
				owner[path.at(-1)!] = makeReactive(object);
			});
	}
	if (isReactiveProxy(subject)) {
		return subject;
	}
	const sources = Object.create(null) as { // TODO Does it makes sense to use `WeakMap` here?
		[key: PropertyKey]: {
			controller: EventController<{ change(): void; }>;
			events: EventEmitter<{ change(): void; }>;
		};
	};
	const notifyUsage = (key: PropertyKey) => {
		if (atomic) {
			key = self;
		}
		const source = sources[key] ??= (() => {
			const controller = new EventController<{ change(): void; }>();
			return {
				_debug: key,
				controller,
				events: controller.emitter,
			};
		})();
		SignalSource.notifyUsage(source);
	};
	const notifyChange = (key: PropertyKey) => {
		if (atomic) {
			key = self;
		}
		sources[key]?.controller.emit('change');
	};
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
			if (deep) {
				const value = descriptor.value ?? descriptor.get?.();
				if (typeof value === 'object' && value !== null) {
					Reflect.set(target, key, makeReactive(value, { deep }));
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
			if (deep && typeof newValue === 'object' && newValue !== null) {
				newValue = makeReactive(newValue, { deep });
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

/**
 * This function checks if the given object is a reactive proxy created by the {@link makeReactive} function.
 */
export function isReactiveProxy(subject: object): boolean {
	return PROXY_ESCAPE_SYMBOL in subject;
}

/**
 * This function takes a reactive proxy and returns the original wrapped object. If the input is not a reactive proxy,
 * it simply returns the input object.
 */
export function unwrapReactiveProxy<T extends object>(subject: T): T {
	return PROXY_ESCAPE_SYMBOL in subject
		? subject[PROXY_ESCAPE_SYMBOL] as T
		: subject;
}

/**
 * This function takes a reactive proxy and returns the original object that was made reactive. It also recursively
 * unwraps any nested reactive proxies within the object. This is useful if the reactive proxy was created with the
 * `deep` option set to `true`, and you want to get the original object without any reactive proxies.
 */
export function unmakeReactive<T extends object>(subject: T): T {
	searchPropertiesDeep<any>(subject, { yield: 'objects', order: 'depth-first' })
		.filter(([_path, object]) => !isReactiveProxy(object))
		.forEach(([path, object, owner]) => {
			owner[path.at(-1)!] = unwrapReactiveProxy(object);
		});
	return unwrapReactiveProxy(subject);
}
