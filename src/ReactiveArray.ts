import { makeReactive } from "./makeReactive";

export class ReactiveArray<T> extends Array<T> {
	public constructor() {
		super();
		return makeReactive(this, { atomic: true });
	}
}
