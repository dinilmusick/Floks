// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FodModule, type FodRuntimeLike } from './FodModule.js';

vi.mock('../frnl-editable-node-graph/index.js', () => ({ FrnlEditableNodeGraph: () => null }));
afterEach(cleanup);

it('saves a named new workflow in the current workspace without loading an unsaved id', async () => {
  const flows = new Map<string, Awaited<ReturnType<FodRuntimeLike['saveFlow']>>>();
  const runtime: FodRuntimeLike = {
    listFlows: async () => [...flows.values()],
    getFlow: vi.fn(async id => flows.get(id) ?? null),
    saveFlow: async flow => { flows.set(flow.id, flow); return flow; },
    deleteFlow: async id => flows.delete(id),
    executeFlow: vi.fn(),
  };
  render(<FodModule workspaceId="studio" runtime={runtime} nodeDefinitions={[]} />);
  fireEvent.click(screen.getByRole('button', { name: 'New flow' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Workflow name' }), { target: { value: 'Soundcheck' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save as App Workflow' }));
  await screen.findByText('Saved');
  expect([...flows.values()]).toMatchObject([{ name: 'Soundcheck', metadata: { workspaceId: 'studio' } }]);
  expect(runtime.getFlow).not.toHaveBeenCalled();
});
