// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FodModule, type FodNodeDefinition, type FodRuntimeLike } from './FodModule.js';

vi.mock('../frnl-editable-node-graph/index.js', () => ({
  FrnlEditableNodeGraph: (props: {
    nodes: Array<{ id: string }>;
    edges: unknown[];
    onSelectionChange: (ids: Set<string>) => void;
    onNodesChange: (nodes: Array<{ id: string; position: { x: number; y: number } }>) => void;
    onEdgesChange: (edges: unknown[]) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => props.onSelectionChange(new Set(props.nodes.map(n => n.id)))}
      >
        Select all nodes
      </button>
      <button
        type="button"
        onClick={() => props.onSelectionChange(new Set())}
      >
        Clear selection
      </button>
      <button
        type="button"
        onClick={() =>
          props.onNodesChange(
            props.nodes.map((n, i) => ({ id: n.id, position: { x: i * 100 + 50, y: i * 100 + 50 } }))
          )
        }
      >
        Drag and pan nodes
      </button>
    </>
  ),
}));

afterEach(cleanup);

const makeDescriptor = (id: string): FodNodeDefinition => ({
  type: `remote.${id}.op`,
  label: `${id} Operation`,
  description: 'Adversarial passive navigation test node',
  category: 'backend-api',
  group: 'Test',
  inputs: [{ id: 'x', name: 'X', direction: 'input', dataType: 'number' }],
  outputs: [{ id: 'y', name: 'Y', direction: 'output', dataType: 'number' }],
  metadata: {
    appId: id,
    targetWorkspaceId: 'remote-target-ws',
    operationId: 'op',
    operationVersion: 'v1',
    surface: 'raw.backend',
  },
});

function createMockRuntime() {
  const invokeMock = vi.fn(async () => ({ success: true, output: { y: 42 }, errors: [] }));
  const executeFlowMock = vi.fn(async () => ({ success: true, output: { y: 42 }, errors: [] }));
  const stored: any[] = [];

  const runtime: FodRuntimeLike = {
    listFlows: async () => stored,
    getFlow: async id => stored.find(f => f.id === id) ?? null,
    saveFlow: async flow => {
      const idx = stored.findIndex(f => f.id === flow.id);
      if (idx < 0) stored.push(flow);
      else stored[idx] = flow;
      return flow;
    },
    deleteFlow: async () => true,
    executeFlow: executeFlowMock,
    listAuthorizedNodeDefinitions: async () => [makeDescriptor('app-alpha'), makeDescriptor('app-beta')],
    executeAuthorizedRemoteFlow: invokeMock,
  };

  return { runtime, invokeMock, executeFlowMock };
}

describe('Floks Adversarial Stress Test: Passive Graph Navigation Safety', () => {
  it('strictly isolates node selection from execution: selection events NEVER invoke backend', async () => {
    const { runtime, invokeMock, executeFlowMock } = createMockRuntime();

    render(
      <FodModule
        workspaceId="ws-source"
        scopeKey="user:ws:session:grants"
        runtime={runtime}
        nodeDefinitions={[]}
      />
    );

    await screen.findByRole('button', { name: 'app-alpha Operation' });
    fireEvent.click(screen.getByRole('button', { name: 'New flow' }));

    // Add nodes to graph
    fireEvent.click(screen.getByRole('button', { name: 'app-alpha Operation' }));
    fireEvent.click(screen.getByRole('button', { name: 'app-beta Operation' }));

    // Repeated passive selections
    fireEvent.click(screen.getByRole('button', { name: 'Select all nodes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select all nodes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    // Zero execution calls must have occurred
    expect(invokeMock).not.toHaveBeenCalled();
    expect(executeFlowMock).not.toHaveBeenCalled();
  });

  it('strictly isolates node movement, dragging, and canvas panning from execution', async () => {
    const { runtime, invokeMock, executeFlowMock } = createMockRuntime();

    render(
      <FodModule
        workspaceId="ws-source"
        scopeKey="user:ws:session:grants"
        runtime={runtime}
        nodeDefinitions={[]}
      />
    );

    await screen.findByRole('button', { name: 'app-alpha Operation' });
    fireEvent.click(screen.getByRole('button', { name: 'New flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'app-alpha Operation' }));

    // Drag and pan nodes repeatedly
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Drag and pan nodes' }));
    }

    // Zero execution calls must have occurred
    expect(invokeMock).not.toHaveBeenCalled();
    expect(executeFlowMock).not.toHaveBeenCalled();
  });

  it('requires explicit user click on Run button to trigger remote execution', async () => {
    const { runtime, invokeMock, executeFlowMock } = createMockRuntime();

    render(
      <FodModule
        workspaceId="ws-source"
        scopeKey="user:ws:session:grants"
        runtime={runtime}
        nodeDefinitions={[]}
      />
    );

    await screen.findByRole('button', { name: 'app-alpha Operation' });
    fireEvent.click(screen.getByRole('button', { name: 'New flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'app-alpha Operation' }));

    // Select and drag
    fireEvent.click(screen.getByRole('button', { name: 'Select all nodes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drag and pan nodes' }));
    expect(invokeMock).not.toHaveBeenCalled();

    // Now explicitly click Run
    const runButton = screen.getByRole('button', { name: 'Run' });
    expect(runButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(runButton);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceWorkspaceId: 'ws-source',
        handles: [
          expect.objectContaining({
            appId: 'app-alpha',
            targetWorkspaceId: 'remote-target-ws',
            operationId: 'op',
          }),
        ],
      }),
      expect.anything()
    );
  });
});
