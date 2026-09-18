import 'global-jsdom/register';
import { describe, expect, it } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useSignalState, useSignalComputed, useSignalEffect, useSignalObserverToken, useSignalStore } from './index.js';
import { type ReactNode } from 'react';
import { SignalState } from '../SignalState.js';
import * as React from 'react';

describe('React Signal Hooks', () => {
	describe(useSignalState.name, () => {
		it('creates a signal and rerenders when the value changes', async () => {
			function TestComponent(): ReactNode {
				const state = useSignalState(0);
				return (
					<button data-testid="button" onClick={() => state.value++}>{state.value}</button>
				);
			}

			const { getByTestId } = render(<TestComponent />);

			expect(getByTestId('button').textContent).toBe('0');

			await fireEvent.click(getByTestId('button'));

			expect(getByTestId('button').textContent).toBe('1');

			await fireEvent.click(getByTestId('button'));

			expect(getByTestId('button').textContent).toBe('2');
		});
	});

	describe(useSignalComputed.name, () => {
		it('computes a value based on a signal and updates when the signal changes', async () => {
			function TestComponent(): ReactNode {
				const state = useSignalState(0);
				const computed = useSignalComputed(() => state.value * 2);
				return (
					<>
						<button data-testid="button" onClick={() => state.value++}>{state.value}</button>
						<span data-testid="computed">{computed.value}</span>
					</>
				);
			}

			const { getByTestId } = render(<TestComponent />);

			expect(getByTestId('button').textContent).toBe('0');
			expect(getByTestId('computed').textContent).toBe('0');

			await fireEvent.click(getByTestId('button'));

			expect(getByTestId('button').textContent).toBe('1');
			expect(getByTestId('computed').textContent).toBe('2');

			await fireEvent.click(getByTestId('button'));

			expect(getByTestId('button').textContent).toBe('2');
			expect(getByTestId('computed').textContent).toBe('4');
		});

		it('works with external signals', async () => {
			const signal = new SignalState(1);

			function TestComponent(): ReactNode {
				const computed = useSignalComputed(() => signal.value * 2);
				return (
					<>
						<span data-testid="computed">{computed.value}</span>
					</>
				);
			}

			const { getByTestId } = render(<TestComponent />);

			expect(signal.value).toBe(1);
			expect(getByTestId('computed').textContent).toBe('2');

			signal.value++;

			expect(signal.value).toBe(2);
			await waitFor(() => expect(getByTestId('computed').textContent).toBe('4'));
		});
	});

	describe(useSignalEffect.name, () => {
		it('runs an effect when the signal changes', async () => {
			const signal = new SignalState(0);
			let effectRunCount = 0;

			function TestComponent(): ReactNode {
				useSignalEffect(() => {
					signal.value; // Simulate dependency on runCount
					effectRunCount += 1;
				});
				return null;
			}

			render(<TestComponent />);

			expect(effectRunCount).toBe(1);

			signal.value++;

			expect(effectRunCount).toBe(1);

			await waitFor(() => expect(effectRunCount).toBe(2));

			signal.value++;

			expect(effectRunCount).toBe(2);

			await waitFor(() => expect(effectRunCount).toBe(3));
		});
	});

	describe(useSignalObserverToken.name, () => {
		it('triggers a rerender when a signal changes', async () => {
			const signal = new SignalState(0);
			let renderCount = 0;

			function TestComponent(): ReactNode {
				using _token = useSignalObserverToken();
				renderCount += 1;
				return <span data-testid="value">{signal.value}</span>;
			}

			const { getByTestId } = render(<TestComponent />);

			expect(getByTestId('value').textContent).toBe('0');
			expect(renderCount).toBe(1);

			signal.value++;

			await waitFor(() => expect(getByTestId('value').textContent).toBe('1'));
			expect(renderCount).toBe(2);

			signal.value++;

			await waitFor(() => expect(getByTestId('value').textContent).toBe('2'));
			expect(renderCount).toBe(3);
		});
	});

	describe(useSignalStore.name, () => {
		it('mounts a store with a disposable token', async () => {
			const store = {
				data: new SignalState(0),
			};
			let renderCount = 0;

			function TestComponent(): ReactNode {
				using storeWithToken = useSignalStore(store);
				renderCount += 1;
				return <span data-testid="value">{storeWithToken.data.value}</span>;
			}

			const { getByTestId } = render(<TestComponent />);

			expect(getByTestId('value').textContent).toBe('0');
			expect(renderCount).toBe(1);

			store.data.value++;

			await waitFor(() => expect(getByTestId('value').textContent).toBe('1'));
			expect(renderCount).toBe(2);

			store.data.value++;

			await waitFor(() => expect(getByTestId('value').textContent).toBe('2'));
			expect(renderCount).toBe(3);
		});
	});
});
