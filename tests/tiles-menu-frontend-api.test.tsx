import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TilesMenu } from '../packages/ui/src/components/tiles/TilesMenu.js';
import { floksFrnlFrontendApi } from '../packages/ui/src/frnl/store.js';

it('discovers rendered tiles and selects the same record through the UI and runtime', () => {
  const tiles = [{ id: 'one', title: 'First tile' }, { id: 'two', title: 'Second tile' }];
  const onSelect = vi.fn();
  render(<TilesMenu id="test-tiles" title="Example tiles" tiles={tiles} onSelect={onSelect} />);
  const api = floksFrnlFrontendApi.component('test-tiles');

  expect(api.inspect().properties.visibleTiles).toEqual(tiles);
  fireEvent.click(screen.getByRole('button', { name: 'First tile' }));
  expect(onSelect).toHaveBeenLastCalledWith(tiles[0]);
  expect(api.inspect().properties.selectedId).toBe('one');

  act(() => { api.invoke('select', 'two'); });
  expect(onSelect).toHaveBeenLastCalledWith(tiles[1]);
  expect(api.inspect().properties.selectedId).toBe('two');

  act(() => { api.invoke('search', 'first'); });
  expect(api.inspect().properties.visibleTiles).toEqual([tiles[0]]);
  expect(screen.queryByRole('button', { name: 'Second tile' })).toBeNull();
  expect(() => api.invoke('select', 'two')).toThrow(/not visible/);
  expect(onSelect).toHaveBeenCalledTimes(2);
});
