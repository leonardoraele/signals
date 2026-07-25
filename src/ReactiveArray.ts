import { makeReactive } from "./makeReactive";

export class ReactiveArray<T> extends Array<T> {
	constructor() {
		super();
		return makeReactive(this, { atomic: true });
	}
}
