// @vitest-environment happy-dom
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {FodModule,type FodNodeDefinition,type FodRuntimeLike} from './FodModule.js';
vi.mock('../frnl-editable-node-graph/index.js',()=>({
  FrnlEditableNodeGraph:(props:{nodes:Array<{id:string}>;edges:unknown[];onSelectionChange:(ids:Set<string>)=>void;onEdgesChange:(edges:unknown[])=>void})=>
    <><button type='button' onClick={()=>props.onSelectionChange(new Set(props.nodes.slice(0,1).map(n=>n.id)))}>Select graph node</button>
    <button type='button' onClick={()=>{if(props.nodes.length>=3)props.onEdgesChange([
      {id:'fan-1',source:props.nodes[0].id,sourceSocket:'result',target:props.nodes[1].id,targetSocket:'count'},
      {id:'fan-2',source:props.nodes[0].id,sourceSocket:'result',target:props.nodes[2].id,targetSocket:'count'},
    ]);}}>Wire fan-out</button></>
}));
afterEach(cleanup);
const descriptor=(appId:string,version='v1',surface='raw.backend'):FodNodeDefinition=>({
  type:`remote.${appId}.calculate`,label:`${appId} calculate`,description:'Mock scoped operation',
  category:surface==='raw.frontend.session'?'frontend-session':'backend-api',
  group:'Functions',inputs:[{id:'count',name:'Count',direction:'input',dataType:'number'}],
  outputs:[{id:'result',name:'Result',direction:'output',dataType:'number'}],
  metadata:{appId,targetWorkspaceId:'remote-workspace',operationId:'calculate',operationVersion:version,surface}
});
const result={success:true,output:{result:3},errors:[]};
const mockRuntime=(discover:NonNullable<FodRuntimeLike['listAuthorizedNodeDefinitions']>)=>{
  const stored:Array<Awaited<ReturnType<FodRuntimeLike['saveFlow']>>>=[];
  const invoke=vi.fn(async(_request:{flowId:string;sourceWorkspaceId:string;handles:Array<{appId:string;targetWorkspaceId:string;operationId:string;operationVersion:string}>},_options:{signal:AbortSignal})=>result);
  const runtime:FodRuntimeLike={
    listFlows:async()=>stored,
    getFlow:async id=>stored.find(flow=>flow.id===id)??null,
    saveFlow:async flow=>{const index=stored.findIndex(saved=>saved.id===flow.id);if(index<0)stored.push(flow);else stored[index]=flow;return flow;},
    deleteFlow:async()=>true,executeFlow:vi.fn(async()=>result),
    listAuthorizedNodeDefinitions:discover,executeAuthorizedRemoteFlow:invoke
  };
  return {runtime,stored,invoke};
};
it('places/configures/saves/reloads and invokes a pinned remote handle through the authorized backend',async()=>{
  const mock=mockRuntime(async()=>[descriptor('skipo-one'),descriptor('skipo-two')]);
  const ui=render(<FodModule workspaceId='source-workspace' scopeKey='user-a/grants-1' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-one calculate'}));
  fireEvent.click(screen.getByRole('button',{name:'Select graph node'}));
  fireEvent.change(screen.getByRole('spinbutton',{name:'Count'}),{target:{value:'3'}});
  fireEvent.click(screen.getByRole('button',{name:'Save as App Workflow'}));
  await waitFor(()=>expect(mock.stored).toHaveLength(1));
  expect(mock.stored[0].nodes[0].data).toMatchObject({
    appId:'skipo-one',targetWorkspaceId:'remote-workspace',operationId:'calculate',
    operationVersion:'v1',configuredInputs:{count:3}
  });
  ui.unmount();
  render(<FodModule workspaceId='source-workspace' scopeKey='user-a/grants-1' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Run'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(1));
  expect(mock.invoke.mock.calls[0][0]).toMatchObject({
    sourceWorkspaceId:'source-workspace',
    handles:[{appId:'skipo-one',targetWorkspaceId:'remote-workspace',operationId:'calculate',operationVersion:'v1'}]
  });
  expect(mock.runtime.executeFlow).not.toHaveBeenCalled();
});
it('rejects a stale version without invoking after reload',async()=>{
  let version='v1';
  const mock=mockRuntime(async()=>[descriptor('skipo-two',version)]);
  render(<FodModule scopeKey='principal-session-grant-epoch' workspaceId='source-workspace' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-two calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-two calculate'}));
  version='v2';
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await screen.findByText(/operation version or authorized target changed/);
  expect(mock.invoke).not.toHaveBeenCalled();
  expect(mock.stored[0].nodes[0].data.operationVersion).toBe('v1');
});
it('treats revocation during execution as invalidation, not a successful result',async()=>{
  let invalidate:(()=>void)|undefined;
  let complete!: (v:typeof result)=>void;
  const mock=mockRuntime(async()=>[descriptor('skipo-one')]);
  mock.runtime.executeAuthorizedRemoteFlow=vi.fn(async()=>await new Promise<typeof result>(resolve=>{complete=resolve;}));
  mock.runtime.subscribeAuthorizedNodeChanges=(_workspace,callback)=>{invalidate=callback;return()=>{invalidate=undefined;};};
  render(<FodModule scopeKey='principal-session-grant-epoch' workspaceId='source-workspace' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-one calculate'}));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await waitFor(()=>expect(mock.runtime.executeAuthorizedRemoteFlow).toHaveBeenCalledTimes(1));
  await act(async()=>{invalidate?.();complete(result);});
  await screen.findByText(/Authorization changed; retry/);
  expect(screen.queryByText('Execution completed')).toBeNull();
});
it('requires separate active-window consent before frontend operation execution',async()=>{
  const mock=mockRuntime(async()=>[descriptor('skipo-two','v1','raw.frontend.session')]);
  render(<FodModule scopeKey='principal-session-grant-epoch' workspaceId='source-workspace' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-two calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-two calculate'}));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await screen.findByText(/Active frontend window consent required/);
  expect(mock.invoke).not.toHaveBeenCalled();
});
it('selecting a graph node is navigation, never an invocation',async()=>{
  const mock=mockRuntime(async()=>[descriptor('skipo-one')]);
  render(<FodModule workspaceId='source-workspace' scopeKey='authorized' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-one calculate'}));
  fireEvent.click(screen.getByRole('button',{name:'Select graph node'}));
  expect(mock.invoke).not.toHaveBeenCalled();
  expect(mock.runtime.executeFlow).not.toHaveBeenCalled();
});
it('persists two typed fan-out branches before invoking the owning backend',async()=>{
  const mock=mockRuntime(async()=>[descriptor('skipo-one'),descriptor('skipo-two'),descriptor('skipo-three')]);
  render(<FodModule workspaceId='source-workspace' scopeKey='authorized' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  for(const app of ['skipo-one','skipo-two','skipo-three'])
    fireEvent.click(screen.getByRole('button',{name:`${app} calculate`}));
  fireEvent.click(screen.getByRole('button',{name:'Wire fan-out'}));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(1));
  expect(mock.stored[0].edges).toHaveLength(2);
  expect(mock.stored[0].edges.map(edge=>edge.source)).toEqual([
    mock.stored[0].nodes[0].id,mock.stored[0].nodes[0].id,
  ]);
  expect(mock.invoke.mock.calls[0][0].handles).toHaveLength(3);
});
it('filters target workspace without leaking operations from another target',async()=>{
  const first={...descriptor('skipo-one'),metadata:{...descriptor('skipo-one').metadata,targetWorkspaceId:'workspace-one'}};
  const second={...descriptor('skipo-two'),metadata:{...descriptor('skipo-two').metadata,targetWorkspaceId:'workspace-two'}};
  const mock=mockRuntime(async()=>[first,second]);
  render(<FodModule workspaceId='source-workspace' scopeKey='authorized' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.change(screen.getByRole('combobox',{name:'Remote application'}),{target:{value:'skipo-one'}});
  expect(screen.getByRole('button',{name:'skipo-one calculate'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'skipo-two calculate'})).toBeNull();
  fireEvent.change(screen.getByRole('combobox',{name:'Remote application'}),{target:{value:''}});
  fireEvent.change(screen.getByRole('combobox',{name:'Target workspace'}),{target:{value:'workspace-two'}});
  expect(screen.queryByRole('button',{name:'skipo-one calculate'})).toBeNull();
  expect(screen.getByRole('button',{name:'skipo-two calculate'})).toBeTruthy();
});

it('filters authenticated remote category surface without changing execution',async()=>{
  const backend=descriptor('skipo-one');
  const workflow={...descriptor('skipo-one'),type:'remote.skipo-one.workflow',label:'skipo-one workflow',
    category:'agent.workflow',metadata:{...descriptor('skipo-one').metadata,surface:'agent.workflow'}};
  const mock=mockRuntime(async()=>[backend,workflow]);
  render(<FodModule workspaceId='source-workspace' scopeKey='authorized' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one workflow'});
  fireEvent.change(screen.getByRole('combobox',{name:'Remote capability category'}),{target:{value:'raw.backend'}});
  expect(screen.getByRole('button',{name:'skipo-one calculate'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'skipo-one workflow'})).toBeNull();
  fireEvent.change(screen.getByRole('combobox',{name:'Remote capability category'}),{target:{value:'agent.workflow'}});
  expect(screen.getByRole('button',{name:'skipo-one workflow'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'skipo-one calculate'})).toBeNull();
});
it('presents timeout without leaking backend errors or retrying on another transport',async()=>{
  const mock=mockRuntime(async()=>[descriptor('skipo-one')]);
  const call=vi.fn(async()=>{throw Object.assign(new Error('Bearer secret-session'),{code:'TIMEOUT'});});
  mock.runtime.executeAuthorizedRemoteFlow=call;
  render(<FodModule workspaceId='source-workspace' scopeKey='authorized' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-one calculate'}));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await screen.findByText(/timed out; completion may be unknown/);
  expect(screen.queryByText(/secret-session/)).toBeNull();
  expect(call).toHaveBeenCalledTimes(1);
  expect(mock.runtime.executeFlow).not.toHaveBeenCalled();
});
it('renders 403 denial and exhausted fallback without another implicit dispatch',async()=>{
  const mock=mockRuntime(async()=>[descriptor('skipo-one')]);
  const call=vi.fn()
    .mockResolvedValueOnce({success:false,output:null,errors:[{status:403,message:'secret'}]})
    .mockResolvedValueOnce({success:false,output:null,errors:[{code:'FALLBACK_EXHAUSTED',message:'secret'}]});
  mock.runtime.executeAuthorizedRemoteFlow=call;
  render(<FodModule workspaceId='source-workspace' scopeKey='authorized' runtime={mock.runtime} nodeDefinitions={[]}/>);
  await screen.findByRole('button',{name:'skipo-one calculate'});
  fireEvent.click(screen.getByRole('button',{name:'New flow'}));
  fireEvent.click(screen.getByRole('button',{name:'skipo-one calculate'}));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await screen.findByText(/Operation denied by the target/);
  expect(call).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await screen.findByText(/fallback exhausted/);
  expect(call).toHaveBeenCalledTimes(2);
  expect(mock.runtime.executeFlow).not.toHaveBeenCalled();
});
