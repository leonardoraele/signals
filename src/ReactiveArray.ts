import { makeReactive } from "./reactive";

export class ReactiveArray<T> extends Array<T> {
	constructor() {
		super();
		return makeReactive(this);
	}
}
