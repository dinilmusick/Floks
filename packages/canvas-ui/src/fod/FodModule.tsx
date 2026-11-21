'use client';
import React,{useEffect,useMemo,useRef,useState} from 'react';
export interface FodNodeDefinition {type:string;label:string;description:string;category:string;group:string;inputs:Array<{id:string;name:string;direction:string;dataType:string}>;outputs:Array<{id:string;name:string;direction:string;dataType:string}>;metadata?:Record<string,any>;}
interface FodFlow {id:string;name:string;description?:string;version:number;createdAt:string;updatedAt:string;nodes:any[];edges:any[];viewport?:any;metadata?:Record<string,unknown>;}
import {FrnlEditableNodeGraph} from '../frnl-editable-node-graph/index.js';
import {filterRemoteDefinitions,isRemoteGraphNode,readRemoteHandle,validateRemoteGraph,type RemoteGraphHandle} from './remoteGraphContract.js';
import {readRemotePortSnapshot,remotePortFingerprint,snapshotRemotePorts,validateRemoteConnections} from './remoteGraphConnections.js';
import {remoteAuthorizationFingerprint} from './remoteAuthorizationFingerprint.js';
import {authorizedRemoteCategories,filteredCapabilityPicker,remoteCapabilityCategory} from './remoteCapabilityPicker.js';
import {remoteExecutionFeedback} from './remoteExecutionFeedback.js';

export interface FodRuntimeLike {
  listFlows():Promise<FodFlow[]>;
  getFlow(id:string):Promise<FodFlow|null>;
  saveFlow(flow:FodFlow):Promise<FodFlow>;
  deleteFlow(id:string):Promise<boolean>;
  executeFlow(id:string):Promise<{success:boolean;output:unknown;errors:Array<{message:string;code?:string;status?:number}>}>;
  /** Kloks BackendFacade must reauthorize all target-side and nested calls. */
  executeAuthorizedRemoteFlow?(request:{flowId:string;sourceWorkspaceId:string;handles:RemoteGraphHandle[]},options:{signal:AbortSignal}):ReturnType<FodRuntimeLike['executeFlow']>;
  /** Live frontend action requires separately scoped, active-window approval. */
  authorizeActiveFrontendWindow?(request:{sourceWorkspaceId:string;handles:RemoteGraphHandle[]},options:{signal:AbortSignal}):Promise<boolean>;
  /**
   * Return only operations authorized for the active principal AND workspace.
   * The application backend must derive this list from Luth-scoped discovery;
   * these descriptions do not themselves grant permission to invoke a node.
   */
  listAuthorizedNodeDefinitions?(workspaceId:string):Promise<FodNodeDefinition[]>;
  /** Called on grant, publication, deployment-lease or session changes. */
  subscribeAuthorizedNodeChanges?(workspaceId:string,onChange:()=>void):()=>void;
}

export interface FodModuleProps {
  runtime:FodRuntimeLike;
  nodeDefinitions:FodNodeDefinition[];
  workspaceId:string;
  className?:string;
  /** Host-derived principal/session/grant epoch; must never contain bearer tokens. */
  scopeKey?:string;
}

function toGraphNodes(flow:FodFlow,nodeDefinitions:FodNodeDefinition[]):any[]{
  const defs=new Map(nodeDefinitions.map(def=>[def.type,def]));
  return flow.nodes.map(node=>{
    const candidate=defs.get(node.type);
    const saved=isRemoteGraphNode(node)?readRemoteHandle(node.data):null;
    const current=candidate && isRemoteGraphNode(node)?readRemoteHandle(candidate.metadata):null;
    const incompatiblePorts=Boolean(saved && candidate && node.data?.remotePortSignature &&
      node.data.remotePortSignature!==remotePortFingerprint(candidate));
    const def=saved && (!current || incompatiblePorts || Object.keys(saved).some(key=>saved[key as keyof typeof saved]!==current[key as keyof typeof current]))
      ? undefined : candidate;
    // Retain the original visible sockets on unavailable nodes, without treating
    // these stored labels as a live authority to execute anything.
    const retained=saved ? readRemotePortSnapshot(node.data?.remotePorts):null;
    const inputs=def?.inputs ?? retained?.inputs ?? [];
    const outputs=def?.outputs ?? retained?.outputs ?? [];
    return {
      id:node.id,type:node.type,label:def?.label ?? (isRemoteGraphNode(node) ? 'Unavailable remote operation (permission/version/ports changed)' : String(node.data?.label ?? node.type)),
      position:node.position,data:node.data,
      inputs:inputs.map(port=>({id:port.id,label:port.name,type:'input',dataType:port.dataType})),
      outputs:outputs.map(port=>({id:port.id,label:port.name,type:'output',dataType:port.dataType})),
      width:190,height:Math.max(90,60+Math.max(inputs.length,outputs.length)*24)
    };
  });
}

class FodLocalValidationError extends Error {}

function toGraphEdges(flow:FodFlow):any[]{
  return flow.edges.map(edge=>({id:edge.id,source:edge.source,sourceSocket:edge.sourceHandle ?? 'result',target:edge.target,targetSocket:edge.targetHandle ?? 'input'}));
}

export function FodModule(props:FodModuleProps){
  return <WorkspaceFlows key={`${props.workspaceId}:${props.scopeKey ?? ''}`} {...props} />;
}

function WorkspaceFlows({runtime,nodeDefinitions,workspaceId,className,scopeKey}:FodModuleProps){
  const drafts = useRef(new Map<string, FodFlow>());
  const [flows,setFlows]=useState<FodFlow[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [flow,setFlow]=useState<FodFlow|null>(null);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [message,setMessage]=useState('');
  const [running,setRunning]=useState(false);
  const [authorizedNodes,setAuthorizedNodes]=useState<FodNodeDefinition[]>([]);
  const [remoteAppFilter,setRemoteAppFilter]=useState('');
  const [remoteWorkspaceFilter,setRemoteWorkspaceFilter]=useState('');
  const [remoteCategoryFilter,setRemoteCategoryFilter]=useState('');
  const permissionEpoch=useRef(0);
  const runningAbort=useRef<AbortController|null>(null);

  useEffect(() => {
    let alive = true;
    let revision = 0;
    let authorizationFingerprint: string | null = null;
    const revoke = () => {
      permissionEpoch.current++;
      runningAbort.current?.abort();
      setAuthorizedNodes([]);
    };
    const refresh = (invalidation = false) => {
      const request = ++revision;
      // A pushed permission/session invalidation must revoke immediately,
      // before the replacement directory is fetched. Passive polling does
      // not revoke an unchanged grant or abort an otherwise valid execution.
      if (invalidation) { authorizationFingerprint = null; revoke(); }
      if (!scopeKey) {
        revoke();
        setMessage('Authenticated graph scope required for remote discovery');
        return;
      }
      if (!runtime.listAuthorizedNodeDefinitions) { revoke(); return; }
      void runtime.listAuthorizedNodeDefinitions(workspaceId).then(definitions => {
        if (!alive || request !== revision) return;
        if (!Array.isArray(definitions)) {
          authorizationFingerprint = null; revoke();
          setMessage('Authorized app operations unavailable');
          return;
        }
        const current = filterRemoteDefinitions(definitions,nodeDefinitions.map(definition=>definition.type));
        const fingerprint = remoteAuthorizationFingerprint(current);
        // A grant, target, operation version, port or consent surface
        // change invalidates an active execution before updating the palette.
        if (authorizationFingerprint !== null && fingerprint !== authorizationFingerprint) revoke();
        authorizationFingerprint = fingerprint;
        setAuthorizedNodes(current);
      }).catch(() => {
        if (alive && request === revision) {
          authorizationFingerprint = null;
          revoke();
          setMessage('Authorized app operations unavailable');
        }
      });
    };
    refresh();
    const unsubscribe = runtime.subscribeAuthorizedNodeChanges?.(workspaceId, () => refresh(true));
    // The fallback rechecks permission without clearing the editor every 30s.
    const fallbackRefresh=scopeKey ? setInterval(() => refresh(),30_000) : null;
    return () => { alive = false; ++revision; permissionEpoch.current++; runningAbort.current?.abort(); if(fallbackRefresh!==null)clearInterval(fallbackRefresh); unsubscribe?.(); };
  }, [runtime,workspaceId,nodeDefinitions,scopeKey]);

  const visibleNodeDefinitions=useMemo(
    () => [...nodeDefinitions,...authorizedNodes],
    [nodeDefinitions,authorizedNodes]
  );

  const refresh = async () => {
    const saved = await runtime.listFlows();
    const merged = new Map(saved.map(item => [item.id, item]));
    for (const [id, draft] of drafts.current) merged.set(id, draft);
    const next = [...merged.values()];
    setFlows(next);
    setActiveId(current => current ?? next[0]?.id ?? null);
  };
  useEffect(() => {
    void refresh().catch(error => setMessage(String(error)));
  }, [runtime]);
  useEffect(() => {
    let current = true;
    const draft = activeId ? drafts.current.get(activeId) : undefined;
    setFlow(draft ?? null);
    if (activeId && !draft) {
      void runtime.getFlow(activeId).then(saved => {
        if (current) setFlow(saved);
      }).catch(error => {
        if (current) setMessage(String(error));
      });
    }
    return () => { current = false; };
  }, [activeId, runtime]);

  useEffect(() => {
    if (flow && drafts.current.has(flow.id)) drafts.current.set(flow.id, flow);
  }, [flow]);

  const graphNodes=useMemo(()=>flow?toGraphNodes(flow,visibleNodeDefinitions):[],[flow,visibleNodeDefinitions]);
  const graphEdges=useMemo(()=>flow?toGraphEdges(flow):[],[flow]);

  const updateNodes=(next:any[])=>{
    if(!flow)return;
    const nextFlow:FodFlow={...flow,nodes:next.map(node=>{
      const prior=flow.nodes.find(item=>item.id===node.id);
      // A graph drag/selection callback must never erase or rewrite pinned
      // remote coordinates or typed configurations saved in node.data.
      const data=prior && isRemoteGraphNode(prior)
        ? {...(node.data ?? {}),...(prior.data ?? {})} : node.data;
      return {...prior,id:node.id,type:prior && isRemoteGraphNode(prior)?prior.type:node.type,position:node.position,data};
    })};
    setFlow(nextFlow);
  };
  const updateEdges=(next:any[])=>{
    if(!flow)return;
    const nextFlow:FodFlow={...flow,edges:next.map(edge=>({id:edge.id,source:edge.source,sourceHandle:edge.sourceSocket,target:edge.target,targetHandle:edge.targetSocket}))};
    setFlow(nextFlow);
  };
  const createFlow=()=>{
    const now=new Date().toISOString();
    const next:FodFlow={id:`flow-${crypto.randomUUID()}`,name:'New Flow',version:1,createdAt:now,updatedAt:now,nodes:[],edges:[],metadata:{workspaceId}};
    drafts.current.set(next.id, next);
    setFlows(current=>[...current,next]);setActiveId(next.id);setFlow(next);
  };
  const save = async () => {
    if (!flow) return;
    const saved = await runtime.saveFlow(flow);
    drafts.current.delete(flow.id);
    setFlow(current => current?.id === flow.id ? saved : current);
    await refresh();
    setMessage('Saved');
  };
  const addMagneticEdge=(trace:any)=>{
    if(!flow)return;
    const id=`edge-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const exists=flow.edges.some(edge=>edge.source===trace.sourceNodeId&&edge.target===trace.targetNodeId&&edge.sourceHandle===trace.sourceHandleId&&edge.targetHandle===trace.targetHandleId);
    if(!exists)setFlow({...flow,edges:[...flow.edges,{id,source:trace.sourceNodeId,sourceHandle:trace.sourceHandleId,target:trace.targetNodeId,targetHandle:trace.targetHandleId}]});
  };
  const solidifyGhost=(ghost:any)=>{
    if(!flow||!ghost?.prototypeNode)return;
    const node=ghost.prototypeNode;
    const exists=flow.nodes.some(item=>item.id===ghost.id);
    let next=flow;
    if(!exists)next={...next,nodes:[...next.nodes,{id:ghost.id,type:node.type,position:{x:Number(ghost.worldPosition?.[0]??node.position?.x??0),y:Number(ghost.worldPosition?.[2]??node.position?.y??0)},data:node.data??{}}]};
    const edge={id:`edge-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,source:ghost.parentSocketPolarity==='input'?ghost.id:ghost.parentNodeId,sourceHandle:ghost.parentSocketPolarity==='input'?ghost.matchingSocketId:ghost.parentSocketId,target:ghost.parentSocketPolarity==='input'?ghost.parentNodeId:ghost.id,targetHandle:ghost.parentSocketPolarity==='input'?ghost.parentSocketId:ghost.matchingSocketId};
    if(!next.edges.some(item=>item.source===edge.source&&item.target===edge.target&&item.sourceHandle===edge.sourceHandle&&item.targetHandle===edge.targetHandle))next={...next,edges:[...next.edges,edge]};
    setFlow(next);
  };
  const run=async()=>{
    if(!flow)return;
    const isRemoteExecution=flow.nodes.some(isRemoteGraphNode);
    const epoch=permissionEpoch.current;
    const abort=new AbortController();
    runningAbort.current=abort;
    setRunning(true);
    try{
      // Preserve saved graph even after a grant, version, or deployment expires.
      await save();
      if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new FodLocalValidationError('Authorization changed; retry');
      const remoteNodes=flow.nodes.filter(isRemoteGraphNode);
      let result:Awaited<ReturnType<FodRuntimeLike['executeFlow']>>;
      if(remoteNodes.length){
        if(!scopeKey || !runtime.listAuthorizedNodeDefinitions || !runtime.executeAuthorizedRemoteFlow)
          throw new FodLocalValidationError('Remote execution unavailable: authenticated Kloks BackendFacade required');
        const fresh=await runtime.listAuthorizedNodeDefinitions(workspaceId);
        if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new FodLocalValidationError('Authorization changed; retry');
        const scoped=filterRemoteDefinitions(fresh,nodeDefinitions.map(definition=>definition.type));
        const check=validateRemoteGraph(flow.nodes,scoped);
        if(!check.ok) throw new FodLocalValidationError(check.message ?? 'Remote operation denied');
        const wiring=validateRemoteConnections(flow.nodes,flow.edges,[...nodeDefinitions,...scoped]);
        if(!wiring.ok) throw new FodLocalValidationError(wiring.message ?? 'Remote graph connections denied');
        // Kloks must load the just-saved source workflow by flowId/workspaceId,
        // use its typed edges for fan-out and reauthorize every remote target.
        if(check.requiresWindowConsent){
          if(!runtime.authorizeActiveFrontendWindow ||
            !await runtime.authorizeActiveFrontendWindow({sourceWorkspaceId:workspaceId,handles:check.handles},{signal:abort.signal}))
              throw new FodLocalValidationError('Active frontend window consent required');
        }
        if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new FodLocalValidationError('Authorization changed; retry');
        result=await runtime.executeAuthorizedRemoteFlow(
          {flowId:flow.id,sourceWorkspaceId:workspaceId,handles:check.handles},{signal:abort.signal});
      }else{
        result=await runtime.executeFlow(flow.id);
      }
      if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new FodLocalValidationError('Authorization changed; retry');
      setMessage(result.success?'Execution completed':isRemoteExecution
         ? remoteExecutionFeedback(result.errors?.[0]).message
         : result.errors?.[0]?.message ?? 'Execution failed');
    }catch(error){
      setMessage(error instanceof FodLocalValidationError ? error.message
        : isRemoteExecution ? remoteExecutionFeedback(error).message : String(error));
    }
    finally{if(runningAbort.current===abort)runningAbort.current=null;setRunning(false);}
  };

  const selectedRemote=flow?.nodes.find(node=>selected.has(node.id) && isRemoteGraphNode(node));
  const selectedDefinition=selectedRemote && visibleNodeDefinitions.find(definition=>{
    if(definition.type!==selectedRemote.type)return false;
    const stored=readRemoteHandle(selectedRemote.data),live=readRemoteHandle(definition.metadata);
    return !!stored && !!live && Object.keys(stored).every(key=>stored[key as keyof typeof stored]===live[key as keyof typeof live]) &&
      (!selectedRemote.data?.remotePortSignature || selectedRemote.data.remotePortSignature===remotePortFingerprint(definition));
  });
  const configureInput=(key:string,value:unknown)=>{
    if(!flow || !selectedRemote)return;
    const configured={...(selectedRemote.data?.configuredInputs ?? {})};
    if(value===undefined)delete configured[key];else configured[key]=value;
    setFlow({...flow,nodes:flow.nodes.map(node=>node.id===selectedRemote.id
      ? {...node,data:{...node.data,configuredInputs:configured}}:node)});
  };
  const remoteApps=useMemo(()=>[...new Set(authorizedNodes.map(node=>String(node.metadata?.appId ?? '')))].filter(Boolean).sort(),[authorizedNodes]);
  const remoteWorkspaces=useMemo(()=>[...new Set(authorizedNodes.filter(node=>!remoteAppFilter || node.metadata?.appId===remoteAppFilter)
    .map(node=>String(node.metadata?.targetWorkspaceId ?? '')))].filter(Boolean).sort(),[authorizedNodes,remoteAppFilter]);
  const selectedApp=remoteApps.includes(remoteAppFilter) ? remoteAppFilter : '';
  const selectedWorkspace=remoteWorkspaces.includes(remoteWorkspaceFilter) ? remoteWorkspaceFilter : '';
  const remoteCategories=useMemo(
    ()=>authorizedRemoteCategories(authorizedNodes,{appId:selectedApp,workspaceId:selectedWorkspace}),
    [authorizedNodes,selectedApp,selectedWorkspace]);
  const selectedCategory=remoteCategories.includes(remoteCategoryFilter) ? remoteCategoryFilter : '';
  const pickerNodes=useMemo(
    ()=>filteredCapabilityPicker(nodeDefinitions,authorizedNodes,{
      appId:selectedApp,workspaceId:selectedWorkspace,category:selectedCategory}),
    [nodeDefinitions,authorizedNodes,selectedApp,selectedWorkspace,selectedCategory]);
  const grouped=useMemo(()=>{
    const groups=new Map<string,FodNodeDefinition[]>();
    for(const node of pickerNodes){
      const appId=node.metadata?.appId;
      const targetWorkspaceId=node.metadata?.targetWorkspaceId;
      if(typeof appId==='string' && (selectedApp && appId!==selectedApp ||
          selectedWorkspace && targetWorkspaceId!==selectedWorkspace)) continue;
      const group=(typeof appId==='string' && appId.trim())
        ? `App ${appId} / workspace ${targetWorkspaceId} / ${node.group} / ${remoteCapabilityCategory(node)}` : node.group;
      const current=groups.get(group) ?? [];
      current.push(node);groups.set(group,current);
    }
    return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b));
  },[pickerNodes]);

  return <div className={className} style={{display:'grid',gridTemplateColumns:'220px 1fr',gridTemplateRows:'44px 1fr',height:'100%',minHeight:500}}>
    <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderBottom:'1px solid var(--skipo-border,#333)',background:'var(--skipo-matte-bg,#111)'}}>
      <strong>FOD</strong><select value={activeId ?? ''} onChange={e=>setActiveId(e.target.value || null)}><option value=''>Select flow</option>{flows.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button type='button' onClick={createFlow}>New flow</button>
      {flow && <input aria-label="Workflow name" value={flow.name} onChange={event=>setFlow({...flow,name:event.target.value})} />}
      <button type='button' onClick={()=>void save().catch(error=>setMessage(String(error)))} disabled={!flow?.name.trim()}>Save as App Workflow</button><button type='button' onClick={()=>void run()} disabled={!flow||running}>{running?'Running…':'Run'}</button><span>{message}</span>
    </div>
    <aside style={{overflow:'auto',padding:10,borderRight:'1px solid var(--skipo-border,#333)'}}>
      <label style={{display:'block',fontSize:12}}>Remote application
        <select aria-label='Remote application' value={selectedApp} onChange={event=>{setRemoteAppFilter(event.target.value);setRemoteWorkspaceFilter('');}}>
          <option value=''>All authorized apps</option>{remoteApps.map(app=><option key={app} value={app}>{app}</option>)}
        </select>
      </label>
      <label style={{display:'block',fontSize:12}}>Target workspace
        <select aria-label='Target workspace' value={selectedWorkspace} onChange={event=>setRemoteWorkspaceFilter(event.target.value)}>
          <option value=''>All authorized workspaces</option>{remoteWorkspaces.map(workspace=><option key={workspace} value={workspace}>{workspace}</option>)}
        </select>
      </label>
      <label style={{display:'block',fontSize:12}}>Remote capability category
        <select aria-label='Remote capability category' value={selectedCategory} onChange={event=>setRemoteCategoryFilter(event.target.value)}>
          <option value=''>All authorized categories</option>{remoteCategories.map(category=><option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      {grouped.map(([group,nodes])=><section key={group}><h4 style={{margin:'8px 0'}}>{group}</h4>{nodes.map(node=><button key={node.type} type='button' style={{display:'block',width:'100%',textAlign:'left',marginBottom:4}} onClick={()=>{
        if(!flow)return;
        const id=`${node.type}-${Date.now()}`;
        const remoteHandle=readRemoteHandle(node.metadata);
        setFlow({...flow,nodes:[...flow.nodes,{id,type:node.type,position:{x:100+flow.nodes.length*24,y:100+flow.nodes.length*24},data:{endpointId:node.metadata?.endpointId,apiId:node.metadata?.apiId,...(remoteHandle ? {...remoteHandle,remotePortSignature:remotePortFingerprint(node),remotePorts:snapshotRemotePorts(node)} : {})}}]});
      }}>{node.label}</button>)}</section>)}
      {selectedRemote && <section aria-label='Remote node configuration' style={{borderTop:'1px solid var(--skipo-border,#333)',paddingTop:10,marginTop:12}}>
        <strong>Remote operation</strong>
        <div style={{fontSize:12,overflowWrap:'anywhere'}}>{selectedRemote.data?.appId} / {selectedRemote.data?.operationId} @ {selectedRemote.data?.operationVersion}</div>
        {!selectedDefinition ? <p>Operation unavailable or contract changed. Saved node data is retained.</p>
        : selectedDefinition.inputs.map(port=><label key={port.id} style={{display:'block',marginTop:8}}>
          {port.name} ({port.dataType})
          {port.dataType==='boolean'
            ? <select aria-label={port.name} value={String(selectedRemote.data?.configuredInputs?.[port.id] ?? '')} onChange={e=>configureInput(port.id,e.target.value===''?undefined:e.target.value==='true')}>
                <option value=''>Unset</option><option value='true'>True</option><option value='false'>False</option>
              </select>
            : port.dataType==='object' || port.dataType==='array'
              ? <textarea aria-label={port.name} defaultValue={JSON.stringify(selectedRemote.data?.configuredInputs?.[port.id] ?? (port.dataType==='array'?[]:{}))}
                  onBlur={e=>{try{configureInput(port.id,JSON.parse(e.target.value));}catch{setMessage('Invalid JSON input for '+port.name);}}}/>
              : <input aria-label={port.name} type={port.dataType==='number'?'number':'text'}
                  value={String(selectedRemote.data?.configuredInputs?.[port.id] ?? '')}
                  onChange={e=>configureInput(port.id,e.target.value===''?undefined:port.dataType==='number'?Number(e.target.value):e.target.value)}/>}
        </label>)}
      </section>}
    </aside>
    <main style={{minWidth:0,minHeight:0}}>
      {flow ? <FrnlEditableNodeGraph nodes={graphNodes} edges={graphEdges} selectedNodeIds={selected} onSelectionChange={setSelected} onNodesChange={updateNodes} onEdgesChange={updateEdges} magneticEnabled autoSolidifyEnabled={false} signalTelemetryEnabled onMagneticTraceSolidify={addMagneticEdge} onPredictiveSolidify={(_id,ghost)=>solidifyGhost(ghost)} onPredictiveSolidifyAll={(ghosts)=>ghosts?.forEach(solidifyGhost)} onPredictiveSolidifyAllForNode={(_nodeId,ghosts)=>ghosts?.forEach(solidifyGhost)} /> : <div style={{padding:30}}>Create or select a flow.</div>}
    </main>
  </div>;
}
FodModule.displayName='FodModule';
