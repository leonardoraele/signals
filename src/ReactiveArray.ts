import { makeReactive } from './makeReactive.js';

export class ReactiveArray<T> extends Array<T> {
	constructor() {
		super();
		return makeReactive(this, { atomic: true });
	}
}
