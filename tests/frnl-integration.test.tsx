import { describe, expect, it, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import {
  ButtonParent,
  SplitButton,
  floksFrnlStore,
  useFloksFrnlStore,
  FrnlStoreProvider,
} from '../packages/ui/src/index.js';
import { createFrnlStore } from '@dinilmusick/frnlts';

afterEach(() => {
  cleanup();
});

describe('Floks FrnlTS Semantic Integration Suite', () => {
  it('1. Simple Button registers as UI Primitive in shared floksFrnlStore', () => {
    render(
      <ButtonParent id="test-btn-1" label="Launch">
        Launch
      </ButtonParent>
    );

    const entity = floksFrnlStore.getState().entities['test-btn-1'];
    expect(entity).toBeDefined();
    expect(entity.kind).toBe('primitive');
    expect(entity.state).toBe('default');

    const button = screen.getByRole('button', { name: /launch/i });
    expect(button).toHaveAttribute('data-frnl-kind', 'ui-primitive');
    expect(button).toHaveAttribute('data-frnl-id', 'test-btn-1');
  });

  it('2. Button state is represented through Frnl state (disabled, active, default)', () => {
    const { rerender } = render(
      <ButtonParent id="stateful-btn" label="Stateful" disabled={false} isActive={false}>
        Stateful
      </ButtonParent>
    );

    expect(floksFrnlStore.getState().entities['stateful-btn'].state).toBe('default');

    rerender(
      <ButtonParent id="stateful-btn" label="Stateful" disabled={false} isActive={true}>
        Stateful
      </ButtonParent>
    );

    expect(floksFrnlStore.getState().entities['stateful-btn'].state).toBe('active');

    rerender(
      <ButtonParent id="stateful-btn" label="Stateful" disabled={true} isActive={false}>
        Stateful
      </ButtonParent>
    );

    expect(floksFrnlStore.getState().entities['stateful-btn'].state).toBe('disabled');
  });

  it('3. Button properties are represented through Frnl properties', () => {
    render(
      <ButtonParent id="props-btn" label="Propped" variant="accent" size="lg">
        Propped
      </ButtonParent>
    );

    const entity = floksFrnlStore.getState().entities['props-btn'];
    expect(entity).toBeDefined();
    expect(entity.properties.variant).toBe('accent');
    expect(entity.properties.size).toBe('lg');
    expect(entity.properties.label).toBe('Propped');
  });

  it('4. Button interaction reaches event boundary and fires onClick', () => {
    let clicked = false;
    render(
      <ButtonParent id="click-btn" label="Clickable" onClick={() => { clicked = true; }}>
        Clickable
      </ButtonParent>
    );

    const button = screen.getByRole('button', { name: /clickable/i });
    fireEvent.click(button);
    expect(clicked).toBe(true);

    // If disabled, click must be blocked
    let disabledClicked = false;
    render(
      <ButtonParent id="disabled-click-btn" label="Disabled" disabled onClick={() => { disabledClicked = true; }}>
        Disabled
      </ButtonParent>
    );

    const disabledBtn = screen.getByRole('button', { name: /disabled/i });
    fireEvent.click(disabledBtn);
    expect(disabledClicked).toBe(false);
  });

  it('5. Complex Composite control (SplitButton) registers as composite and contains Frnl Slots', () => {
    render(
      <SplitButton
        id="split-ctrl"
        label="Deploy"
        onPrimaryClick={() => {}}
        onDropdownClick={() => {}}
        isOpen={false}
      />
    );

    const composite = floksFrnlStore.getState().entities['split-ctrl'];
    expect(composite).toBeDefined();
    expect(composite.kind).toBe('composite');

    // Both internal slots registered in floksFrnlStore
    const primarySlot = floksFrnlStore.getState().slots['split-ctrl.primary'];
    const dropdownSlot = floksFrnlStore.getState().slots['split-ctrl.dropdown'];

    expect(primarySlot).toBeDefined();
    expect(primarySlot.address).toBe('split-ctrl.primary');
    expect(primarySlot.occupantKind).toBe('primitive');

    expect(dropdownSlot).toBeDefined();
    expect(dropdownSlot.address).toBe('split-ctrl.dropdown');
    expect(dropdownSlot.occupantKind).toBe('primitive');
  });

  it('6. Live Slot replacement updates both store and rendered DOM in complex control', () => {
    render(
      <SplitButton
        id="live-split"
        label="Save"
        isOpen={true}
        dropdownMenu={<div data-testid="default-menu">Default Menu</div>}
        menuOccupants={{
          'custom-menu': <div data-testid="custom-menu">Custom Replaced Menu</div>,
        }}
      />
    );

    // Initial occupant rendered in DOM
    expect(screen.getByTestId('default-menu')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-menu')).not.toBeInTheDocument();

    // Replace slot occupant with custom-menu
    act(() => {
      floksFrnlStore.getState().replaceSlotOccupant('live-split.menu', {
        id: 'custom-menu',
        kind: 'composite',
      });
    });

    const menuSlot = floksFrnlStore.getState().slots['live-split.menu'];
    expect(menuSlot.occupantId).toBe('custom-menu');
    expect(menuSlot.id).toBe('live-split.menu');
    expect(menuSlot.address).toBe('live-split.menu');

    // DOM reflects the swapped occupant
    expect(screen.queryByTestId('default-menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-menu')).toBeInTheDocument();

    // Now replace occupant with null (empty slot)
    act(() => {
      floksFrnlStore.getState().replaceSlotOccupant('live-split.menu', null);
    });

    expect(floksFrnlStore.getState().slots['live-split.menu'].occupantId).toBeNull();
    expect(screen.queryByTestId('custom-menu')).not.toBeInTheDocument();
  });

  it('7. Floks enforces exact two semantic entity categories (Primitive and Composite)', () => {
    const allEntities = Object.values(floksFrnlStore.getState().entities);
    expect(allEntities.length).toBeGreaterThan(0);

    for (const entity of allEntities) {
      expect(['primitive', 'composite']).toContain(entity.kind);
    }
  });

  it('8. Supports custom injectable Frnl store via FrnlStoreProvider', () => {
    const customStore = createFrnlStore();

    render(
      <FrnlStoreProvider store={customStore}>
        <ButtonParent id="isolated-btn" label="Isolated">
          Isolated
        </ButtonParent>
      </FrnlStoreProvider>
    );

    // Entity registered in customStore, NOT in default global store
    expect(customStore.getState().entities['isolated-btn']?.kind).toBe('primitive');
    expect(floksFrnlStore.getState().entities['isolated-btn']).toBeUndefined();
  });

  it('9. Anonymous ButtonParent instances receive collision-free unique IDs', () => {
    render(
      <>
        <ButtonParent>Save</ButtonParent>
        <ButtonParent>Save</ButtonParent>
        <ButtonParent>Submit</ButtonParent>
      </>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    const ids = buttons.map((b) => b.getAttribute('data-frnl-id')).filter(Boolean) as string[];
    // All rendered button IDs must be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Ensure entities are separately registered in the store
    for (const id of ids) {
      expect(floksFrnlStore.getState().entities[id]).toBeDefined();
    }
  });

  it('10. Anonymous SplitButton instances receive collision-free unique IDs', () => {
    render(
      <>
        <SplitButton label="Export" />
        <SplitButton label="Export" />
      </>
    );

    const allEntities = floksFrnlStore.getState().entities;
    const splitButtonCompositeIds = Object.keys(allEntities).filter((k) =>
      k.startsWith('floks.splitbutton.export')
    );

    // Must have registered at least two distinct composite entities
    expect(splitButtonCompositeIds.length).toBeGreaterThanOrEqual(2);
  });
});
