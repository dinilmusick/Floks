import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {FodModule, type FodRuntimeLike} from './FodModule.js';

vi.mock('../frnl-editable-node-graph/index.js', () => ({
  FrnlEditableNodeGraph: () => <div data-testid="graph-canvas"/>,
}));

const definition = {
  type:'remote.app-a.target-a.workflow-a',label:'Authorized workflow',description:'',
  category:'backend-api',group:'remote',
  inputs:[],outputs:[],
  metadata:{appId:'app-a',targetWorkspaceId:'target-a',operationId:'workflow-a',
    operationVersion:'v1',leaseExpiresAt:'2999-01-01T00:00:00.000Z'},
};

const flow = {
  id:'flow-one',name:'Source workflow',version:1,
  createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',
  nodes:[{id:'remote-one',type:definition.type,position:{x:0,y:0},
    data:{appId:'app-a',targetWorkspaceId:'target-a',operationId:'workflow-a',
      operationVersion:'v1'}}],edges:[],metadata:{workspaceId:'source-a'},
};

afterEach(()=>vi.restoreAllMocks());

describe('FOD graph authorization refresh during remote execution',()=>{
  it('does not abort active work during unchanged passive polling, but aborts when the grant is removed',async()=>{
    const hooks: {poll?:()=>void}={};
    vi.spyOn(globalThis,'setInterval').mockImplementation(((handler:()=>void,delay:number) => {
      if(delay===30_000) hooks.poll=handler;
      return 1 as any;
    }) as any);
    const listAuthorizedNodeDefinitions=vi.fn(async()=>[definition]);
    const executeAuthorizedRemoteFlow=vi.fn(
      async (_request:unknown,options:{signal:AbortSignal}) =>
        await new Promise<{success:boolean;output:unknown;errors:Array<{message:string}>}>(()=>{}),
    );
    const runtime: FodRuntimeLike={
      listFlows:vi.fn(async()=>[flow]), getFlow:vi.fn(async()=>flow),
      saveFlow:vi.fn(async(value)=>value),
      deleteFlow:vi.fn(async()=>true),
      executeFlow:vi.fn(async()=>({success:false,output:null,errors:[{message:'not configured'}]})),
      listAuthorizedNodeDefinitions,
      executeAuthorizedRemoteFlow,
    };
    const ui=render(<FodModule runtime={runtime} workspaceId="source-a"
      scopeKey="principal-a/session-a/grant-1" nodeDefinitions={[]}/>);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Run'}).hasAttribute('disabled')).toBe(false));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Authorized workflow'})).toBeTruthy());
    fireEvent.click(screen.getByRole('button',{name:'Run'}));
    await waitFor(()=>expect(executeAuthorizedRemoteFlow).toHaveBeenCalledOnce());
    const signal=executeAuthorizedRemoteFlow.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);
    expect(hooks.poll).toBeTruthy();

    await act(async()=>{hooks.poll?.(); await Promise.resolve();});
    await waitFor(()=>expect(listAuthorizedNodeDefinitions).toHaveBeenCalledTimes(2));
    expect(signal.aborted).toBe(false);
    expect(screen.getByRole('button',{name:'Authorized workflow'})).toBeTruthy();

    listAuthorizedNodeDefinitions.mockResolvedValue([]);
    await act(async()=>{hooks.poll?.(); await Promise.resolve();});
    await waitFor(()=>expect(listAuthorizedNodeDefinitions).toHaveBeenCalledTimes(3));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByRole('button',{name:'Authorized workflow'})).toBeNull();
    ui.unmount();
  });

  it('immediately denies a push revocation instead of awaiting stale catalogue refresh',async()=>{
    const hooks: {invalidate?:()=>void}={};
    const listAuthorizedNodeDefinitions=vi.fn(async()=>[definition]);
    const runtime:FodRuntimeLike={
      listFlows:vi.fn(async()=>[flow]),getFlow:vi.fn(async()=>flow),
      saveFlow:vi.fn(async(value)=>value),deleteFlow:vi.fn(async()=>true),
      executeFlow:vi.fn(async()=>({success:false,output:null,errors:[]})),
      listAuthorizedNodeDefinitions,
      subscribeAuthorizedNodeChanges:vi.fn((_workspaceId,onChange)=>{hooks.invalidate=onChange;return ()=>{};}),
    };
    const view=render(<FodModule runtime={runtime} nodeDefinitions={[]}
      workspaceId="source-a" scopeKey="principal-a/session-a/grant-1"/>);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Authorized workflow'})).toBeTruthy());
    const pending = new Promise<(typeof definition)[]>(()=>{});
    listAuthorizedNodeDefinitions.mockImplementation(async()=>await pending as any);
    act(()=>{hooks.invalidate?.();});
    expect(screen.queryByRole('button',{name:'Authorized workflow'})).toBeNull();
    view.unmount();
  });
});
