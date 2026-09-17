import 'global-jsdom/register';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useSignalState, useSignalComputed, useSignalEffect } from './index.js';
import { type ReactNode } from 'react';
import { SignalState } from '../SignalState.js';

describe('React Signal Hooks', () => {
	beforeEach(() => {
		// Reset any global state if necessary before each test

	});

	describe(useSignalState.name, () => {
		it('creates a signal and rerenders when the value changes', async () => {
			function TestComponent(): ReactNode {
				const state = useSignalState(0);
				return (
					<button data-testid="button" onClick={() => state.value += 1}>{state.value}</button>
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
						<button data-testid="button" onClick={() => state.value += 1}>{state.value}</button>
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

			signal.value += 1;

			expect(signal.value).toBe(2);
			await waitFor(() => expect(getByTestId('computed').textContent).toBe('4'));
		});
	});

	describe(useSignalEffect.name, () => {
		it('runs an effect when the signal changes', async () => {
			const signal = new SignalState(false);
			let effectRunCount = 0;

			function TestComponent(): ReactNode {
				useSignalEffect(() => {
					signal.value; // Simulate dependency on runCount
					effectRunCount += 1;
				});
				return effectRunCount;
			}

			const { container } = render(<TestComponent />);

			expect(container.textContent).toBe('0');

			await waitFor(() => expect(container.textContent).toBe('1'));

			signal.value = !signal.value;

			await waitFor(() => expect(container.textContent).toBe('2'));

			signal.value = !signal.value;

			await waitFor(() => expect(container.textContent).toBe('3'));
		});
	});
});
