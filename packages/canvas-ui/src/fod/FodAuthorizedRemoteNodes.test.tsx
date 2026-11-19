// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FodModule, type FodRuntimeLike, type FodNodeDefinition } from './FodModule.js';

vi.mock('../frnl-editable-node-graph/index.js', () => ({ FrnlEditableNodeGraph: () => null }));
afterEach(cleanup);

const remote = (appId: string, operationId: string): FodNodeDefinition => ({
  type: `remote.${appId}.${operationId}`,
  label: `${appId}: ${operationId}`,
  description: 'Authorized remote operation',
  category: 'backend-api',
  group: 'Functions',
  inputs: [], outputs: [],
  metadata: { appId, targetWorkspaceId: 'workspace-001', operationId, operationVersion: 'v1' },
});

const makeRuntime = (listAuthorizedNodeDefinitions: NonNullable<FodRuntimeLike['listAuthorizedNodeDefinitions']>): FodRuntimeLike => ({
  listFlows: async () => [],
  getFlow: async () => null,
  saveFlow: async flow => flow,
  deleteFlow: async () => true,
  executeFlow: async () => ({success:true,output:null,errors:[]}),
  listAuthorizedNodeDefinitions,
});

it('uses workspace-authorized discovery rather than showing remote operations from other accounts', async () => {
  const ownerA = makeRuntime(vi.fn(async () => [
    remote('aiko', 'mine'),
    { ...remote('other', 'private'), metadata: { operationId:'private' } },
  ]));
  const ownerB = makeRuntime(vi.fn(async () => [remote('kone', 'mine')]));
  const { rerender } = render(<FodModule scopeKey='principal-session-grant-epoch' workspaceId="w-a" runtime={ownerA} nodeDefinitions={[]} />);
  await screen.findByRole('button', {name:'aiko: mine'});
  expect(screen.queryByRole('button', {name:'other: private'})).toBeNull();
  rerender(<FodModule scopeKey='principal-session-grant-epoch' workspaceId="w-b" runtime={ownerB} nodeDefinitions={[]} />);
  await screen.findByRole('button', {name:'kone: mine'});
  expect(screen.queryByRole('button', {name:'aiko: mine'})).toBeNull();
  expect(ownerA.listAuthorizedNodeDefinitions).toHaveBeenCalledWith('w-a');
  expect(ownerB.listAuthorizedNodeDefinitions).toHaveBeenCalledWith('w-b');
});

it('immediately removes revoked definitions and ignores stale asynchronous discovery', async () => {
  let onChange: (() => void) | undefined;
  let staleResolve!: (value: FodNodeDefinition[]) => void;
  let called = 0;
  const discover = vi.fn(async () => {
    called += 1;
    if (called === 1) return [remote('aiko','first')];
    if (called === 2) return await new Promise<FodNodeDefinition[]>(resolve => { staleResolve = resolve; });
    return [remote('aiko','latest')];
  });
  const runtime = {
    ...makeRuntime(discover),
    subscribeAuthorizedNodeChanges: vi.fn((_workspaceId:string, callback:()=>void) => {
      onChange = callback;
      return () => { onChange = undefined; };
    }),
  };
  render(<FodModule scopeKey='principal-session-grant-epoch' workspaceId="workspace-001" runtime={runtime} nodeDefinitions={[]} />);
  await screen.findByRole('button', {name:'aiko: first'});
  await act(async () => { onChange?.(); });
  await waitFor(() => expect(screen.queryByRole('button', {name:'aiko: first'})).toBeNull());
  await act(async () => { onChange?.(); });
  await screen.findByRole('button', {name:'aiko: latest'});
  await act(async () => { staleResolve([remote('aiko','obsolete')]); });
  expect(screen.queryByRole('button', {name:'aiko: obsolete'})).toBeNull();
  expect(screen.getByRole('button', {name:'aiko: latest'})).toBeTruthy();
});

it('saves exact canonical remote operation coordinates in workflow nodes', async () => {
  const saved: Array<Awaited<ReturnType<FodRuntimeLike['saveFlow']>>> = [];
  const runtime: FodRuntimeLike = {
    ...makeRuntime(async () => [remote('kone','trigger')]),
    saveFlow: async flow => { saved.push(flow); return flow; },
  };
  render(<FodModule scopeKey='principal-session-grant-epoch' workspaceId="workspace-001" runtime={runtime} nodeDefinitions={[]} />);
  await screen.findByRole('button', {name:'kone: trigger'});
  fireEvent.click(screen.getByRole('button', {name:'New flow'}));
  fireEvent.click(screen.getByRole('button', {name:'kone: trigger'}));
  fireEvent.click(screen.getByRole('button', {name:'Save as App Workflow'}));
  await waitFor(() => expect(saved).toHaveLength(1));
  expect(saved[0].nodes[0].data).toMatchObject({
    appId: 'kone', targetWorkspaceId: 'workspace-001', operationId: 'trigger', operationVersion: 'v1'
  });
});

it('lists all six eligible raw and agent surfaces from authenticated discovery', async () => {
  const surfaces=['raw.backend','raw.workflow','agent.endpoint','agent.workflow','raw.frontend.session','agent.app'];
  const definitions=surfaces.map((surface,index):FodNodeDefinition=>({
    ...remote(`app-${index}`,`op-${index}`),
    category:surface,
    metadata:{...remote(`app-${index}`,`op-${index}`).metadata,surface},
  }));
  render(<FodModule scopeKey='authenticated-principal/grants' workspaceId='source-w' runtime={makeRuntime(async()=>definitions)} nodeDefinitions={[]}/>);
  for(let index=0;index<surfaces.length;index++) {
    expect(await screen.findByRole('button',{name:`app-${index}: op-${index}`})).toBeTruthy();
  }
});
