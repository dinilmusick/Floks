import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { frnlButton, FrnlStoreProvider } from '../packages/ui/src/index.js';
import { createFrnlStore } from '@ultrst-armada/frnlts';

afterEach(() => cleanup());

describe('Floks FrnlTS integration', () => {
  it('renders a canonical Frnl button and exposes Frnl state', () => {
    render(<frnlButton id="test-button" label="Launch">Launch</frnlButton>);
    const button = screen.getByRole('button', { name: /launch/i });
    expect(button).toHaveAttribute('data-frnl-component', 'frnlButton');
    expect(button).toHaveAttribute('data-frnl-state', 'idle');
    expect(button).toHaveAttribute('id', 'test-button');
  });

  it('derives active, disabled and loading states from ordinary React props', () => {
    const { rerender } = render(<frnlButton id="stateful" label="Stateful">Stateful</frnlButton>);
    const button = screen.getByRole('button', { name: /stateful/i });

    expect(button).toHaveAttribute('data-frnl-state', 'idle');
    rerender(<frnlButton id="stateful" label="Stateful" isActive>Stateful</frnlButton>);
    expect(button).toHaveAttribute('data-frnl-state', 'active');
    rerender(<frnlButton id="stateful" label="Stateful" disabled>Stateful</frnlButton>);
    expect(button).toHaveAttribute('data-frnl-state', 'disabled');
    rerender(<frnlButton id="stateful" label="Stateful" loading>Stateful</frnlButton>);
    expect(button).toHaveAttribute('data-frnl-state', 'loading');
    expect(button).toBeDisabled();
  });

  it('routes React click through the Frnl event handle', () => {
    let clicked = 0;
    render(<frnlButton id="clickable" label="Clickable" onClick={() => { clicked += 1; }}>Clickable</frnlButton>);
    fireEvent.click(screen.getByRole('button', { name: /clickable/i }));
    expect(clicked).toBe(1);
  });

  it('blocks Frnl click handlers while disabled or loading', () => {
    let clicked = 0;
    const { rerender } = render(<frnlButton id="blocked" label="Blocked" disabled onClick={() => { clicked += 1; }}>Blocked</frnlButton>);
    fireEvent.click(screen.getByRole('button', { name: /blocked/i }));
    expect(clicked).toBe(0);
    rerender(<frnlButton id="blocked" label="Blocked" loading onClick={() => { clicked += 1; }}>Blocked</frnlButton>);
    fireEvent.click(screen.getByRole('button', { name: /blocked/i }));
    expect(clicked).toBe(0);
  });

  it('supports an injected Frnl store without the retired entity taxonomy', () => {
    const store = createFrnlStore();
    render(
      <FrnlStoreProvider store={store}>
        <frnlButton id="isolated" label="Isolated">Isolated</frnlButton>
      </FrnlStoreProvider>
    );
    const button = screen.getByRole('button', { name: /isolated/i });
    expect(button).toHaveAttribute('data-frnl-component', 'frnlButton');
    expect(button).toHaveAttribute('data-frnl-state', 'idle');
  });
});
