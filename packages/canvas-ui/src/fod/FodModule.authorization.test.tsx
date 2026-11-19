import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {FodModule, type FodRuntimeLike} from './FodModule.js';

vi.mock('../frnl-editable-node-graph/index.js', () => ({
  FrnlEditableNodeGraph: ({nodes}: {nodes: Array<{id:string;label:string}>}) => (
    <div data-testid="graph-canvas">{nodes.map(node => <span key={node.id}>{node.label}</span>)}</div>
  ),
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
    // FOD revalidates once on opening the canvas and again immediately
    // before execution. The passive poll is a third independent read.
    const prePollChecks = listAuthorizedNodeDefinitions.mock.calls.length;

    await act(async()=>{hooks.poll?.(); await Promise.resolve();});
    await waitFor(()=>expect(listAuthorizedNodeDefinitions).toHaveBeenCalledTimes(prePollChecks + 1));
    expect(signal.aborted).toBe(false);
    expect(screen.getByRole('button',{name:'Authorized workflow'})).toBeTruthy();

    listAuthorizedNodeDefinitions.mockResolvedValue([]);
    await act(async()=>{hooks.poll?.(); await Promise.resolve();});
    await waitFor(()=>expect(listAuthorizedNodeDefinitions).toHaveBeenCalledTimes(prePollChecks + 2));
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
  it('saves and reloads the exact remote target/version and port snapshot without invoking on navigation', async()=>{
    let persisted: typeof flow | null = null;
    const listAuthorizedNodeDefinitions=vi.fn(async()=>[definition]);
    const executeAuthorizedRemoteFlow=vi.fn(async()=>({
      success:true,output:'would be remote',errors:[],
    }));
    const runtime:FodRuntimeLike={
      listFlows:vi.fn(async()=>persisted ? [persisted] : []),
      getFlow:vi.fn(async()=>persisted),
      saveFlow:vi.fn(async(value)=>{
        persisted=JSON.parse(JSON.stringify(value));
        return persisted!;
      }),
      deleteFlow:vi.fn(async()=>true),
      executeFlow:vi.fn(async()=>({success:false,output:null,errors:[]})),
      listAuthorizedNodeDefinitions,
      executeAuthorizedRemoteFlow,
    };
    const mount=()=>render(<FodModule runtime={runtime}
      nodeDefinitions={[]} workspaceId="source-a" scopeKey="luth-user-a:source-a:grant-1"/>);
    const first=mount();
    await waitFor(()=>expect(screen.getByRole('button',{name:'Authorized workflow'})).toBeTruthy());
    fireEvent.click(screen.getByRole('button',{name:'New flow'}));
    fireEvent.click(screen.getByRole('button',{name:'Authorized workflow'}));
    fireEvent.click(screen.getByRole('button',{name:'Save as App Workflow'}));
    await waitFor(()=>expect(runtime.saveFlow).toHaveBeenCalledOnce());
    expect(persisted).toBeTruthy();
    const original=(persisted as any).nodes[0].data;
    expect({
      appId:original.appId,
      targetWorkspaceId:original.targetWorkspaceId,
      operationId:original.operationId,
      operationVersion:original.operationVersion,
    }).toEqual({
      appId:'app-a',targetWorkspaceId:'target-a',
      operationId:'workflow-a',operationVersion:'v1',
    });
    expect(original.remotePorts).toEqual({inputs:[],outputs:[]});
    expect(typeof original.remotePortSignature).toBe('string');
    expect(executeAuthorizedRemoteFlow).not.toHaveBeenCalled();
    first.unmount();

    // Reload a flow after a source-workspace change or user revisit.
    const reload=mount();
    await waitFor(()=>expect(screen.getByText('Authorized workflow')).toBeTruthy());
    expect(runtime.getFlow).toHaveBeenCalledWith((persisted as any).id);
    expect(executeAuthorizedRemoteFlow).not.toHaveBeenCalled();
    reload.unmount();

    // A target silently reusing a display name at a new immutable revision
    // must not rewrite the original saved operation or auto-run it.
    listAuthorizedNodeDefinitions.mockResolvedValue([{
      ...definition,metadata:{...definition.metadata,operationVersion:'v2'},
    }]);
    const stale=mount();
    await waitFor(()=>expect(screen.getByText(/Unavailable remote operation/)).toBeTruthy());
    expect((persisted as any).nodes[0].data.operationVersion).toBe('v1');
    expect(executeAuthorizedRemoteFlow).not.toHaveBeenCalled();
    stale.unmount();
  });

});
