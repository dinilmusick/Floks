'use client';
import React,{useEffect,useMemo,useRef,useState} from 'react';
export interface FodNodeDefinition {type:string;label:string;description:string;category:string;group:string;inputs:Array<{id:string;name:string;direction:string;dataType:string}>;outputs:Array<{id:string;name:string;direction:string;dataType:string}>;metadata?:Record<string,any>;}
interface FodFlow {id:string;name:string;description?:string;version:number;createdAt:string;updatedAt:string;nodes:any[];edges:any[];viewport?:any;metadata?:Record<string,unknown>;}
import {FrnlEditableNodeGraph} from '../frnl-editable-node-graph/index.js';
import {filterRemoteDefinitions,isRemoteGraphNode,validateRemoteGraph,type RemoteGraphHandle} from './remoteGraphContract.js';

export interface FodRuntimeLike {
  listFlows():Promise<FodFlow[]>;
  getFlow(id:string):Promise<FodFlow|null>;
  saveFlow(flow:FodFlow):Promise<FodFlow>;
  deleteFlow(id:string):Promise<boolean>;
  executeFlow(id:string):Promise<{success:boolean;output:unknown;errors:Array<{message:string}>}>;
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
    const def=defs.get(node.type);
    return {
      id:node.id,type:node.type,label:def?.label ?? (isRemoteGraphNode(node) ? 'Unavailable remote operation (permission/version required)' : String(node.data?.label ?? node.type)),
      position:node.position,data:node.data,
      inputs:(def?.inputs ?? []).map(port=>({id:port.id,label:port.name,type:'input',dataType:port.dataType})),
      outputs:(def?.outputs ?? []).map(port=>({id:port.id,label:port.name,type:'output',dataType:port.dataType})),
      width:190,height:Math.max(90,60+Math.max(def?.inputs.length ?? 0,def?.outputs.length ?? 0)*24)
    };
  });
}

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
  const permissionEpoch=useRef(0);
  const runningAbort=useRef<AbortController|null>(null);

  useEffect(() => {
    let alive = true;
    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      permissionEpoch.current++;
      runningAbort.current?.abort();
      // Fail closed immediately on an invalidation, account switch or revoke.
      setAuthorizedNodes([]);
      if (!runtime.listAuthorizedNodeDefinitions) return;
      void runtime.listAuthorizedNodeDefinitions(workspaceId).then(definitions => {
        if (!alive || request !== revision) return;
        if (!Array.isArray(definitions)) { setAuthorizedNodes([]); return; }
        setAuthorizedNodes(filterRemoteDefinitions(definitions,nodeDefinitions.map(definition=>definition.type)));
      }).catch(() => {
        if (alive && request === revision) {
          setAuthorizedNodes([]);
          setMessage('Authorized app operations unavailable');
        }
      });
    };
    refresh();
    const unsubscribe = runtime.subscribeAuthorizedNodeChanges?.(workspaceId, refresh);
    return () => { alive = false; ++revision; permissionEpoch.current++; runningAbort.current?.abort(); unsubscribe?.(); };
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
    const nextFlow:FodFlow={...flow,nodes:next.map(node=>({...flow.nodes.find(item=>item.id===node.id),id:node.id,type:node.type,position:node.position,data:node.data}))};
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
    const epoch=permissionEpoch.current;
    const abort=new AbortController();
    runningAbort.current=abort;
    setRunning(true);
    try{
      // Preserve saved graph even after a grant, version, or deployment expires.
      await save();
      if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new Error('Authorization changed; retry');
      const remoteNodes=flow.nodes.filter(isRemoteGraphNode);
      let result:Awaited<ReturnType<FodRuntimeLike['executeFlow']>>;
      if(remoteNodes.length){
        if(!runtime.listAuthorizedNodeDefinitions || !runtime.executeAuthorizedRemoteFlow)
          throw new Error('Remote execution unavailable: authenticated Kloks BackendFacade required');
        const fresh=await runtime.listAuthorizedNodeDefinitions(workspaceId);
        if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new Error('Authorization changed; retry');
        const scoped=filterRemoteDefinitions(fresh,nodeDefinitions.map(definition=>definition.type));
        const check=validateRemoteGraph(flow.nodes,scoped);
        if(!check.ok) throw new Error(check.message ?? 'Remote operation denied');
        if(check.requiresWindowConsent){
          if(!runtime.authorizeActiveFrontendWindow ||
            !await runtime.authorizeActiveFrontendWindow({sourceWorkspaceId:workspaceId,handles:check.handles},{signal:abort.signal}))
              throw new Error('Active frontend window consent required');
        }
        if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new Error('Authorization changed; retry');
        result=await runtime.executeAuthorizedRemoteFlow(
          {flowId:flow.id,sourceWorkspaceId:workspaceId,handles:check.handles},{signal:abort.signal});
      }else{
        result=await runtime.executeFlow(flow.id);
      }
      if(abort.signal.aborted || epoch!==permissionEpoch.current) throw new Error('Authorization changed; retry');
      setMessage(result.success?'Execution completed':result.errors?.[0]?.message ?? 'Execution failed');
    }catch(error){setMessage(String(error));}
    finally{if(runningAbort.current===abort)runningAbort.current=null;setRunning(false);}
  };

  const grouped=useMemo(()=>{
    const groups=new Map<string,FodNodeDefinition[]>();
    for(const node of visibleNodeDefinitions){
      const appId=node.metadata?.appId;
      const group=(typeof appId==='string' && appId.trim()) ? `App ${appId} / ${node.group}` : node.group;
      const current=groups.get(group) ?? [];
      current.push(node);groups.set(group,current);
    }
    return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b));
  },[visibleNodeDefinitions]);

  return <div className={className} style={{display:'grid',gridTemplateColumns:'220px 1fr',gridTemplateRows:'44px 1fr',height:'100%',minHeight:500}}>
    <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderBottom:'1px solid var(--skipo-border,#333)',background:'var(--skipo-matte-bg,#111)'}}>
      <strong>FOD</strong><select value={activeId ?? ''} onChange={e=>setActiveId(e.target.value || null)}><option value=''>Select flow</option>{flows.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button type='button' onClick={createFlow}>New flow</button>
      {flow && <input aria-label="Workflow name" value={flow.name} onChange={event=>setFlow({...flow,name:event.target.value})} />}
      <button type='button' onClick={()=>void save().catch(error=>setMessage(String(error)))} disabled={!flow?.name.trim()}>Save as App Workflow</button><button type='button' onClick={()=>void run()} disabled={!flow||running}>{running?'Running…':'Run'}</button><span>{message}</span>
    </div>
    <aside style={{overflow:'auto',padding:10,borderRight:'1px solid var(--skipo-border,#333)'}}>
      {grouped.map(([group,nodes])=><section key={group}><h4 style={{margin:'8px 0'}}>{group}</h4>{nodes.map(node=><button key={node.type} type='button' style={{display:'block',width:'100%',textAlign:'left',marginBottom:4}} onClick={()=>{
        if(!flow)return;
        const id=`${node.type}-${Date.now()}`;
        setFlow({...flow,nodes:[...flow.nodes,{id,type:node.type,position:{x:100+flow.nodes.length*24,y:100+flow.nodes.length*24},data:{endpointId:node.metadata?.endpointId,apiId:node.metadata?.apiId,appId:node.metadata?.appId,targetWorkspaceId:node.metadata?.targetWorkspaceId,operationId:node.metadata?.operationId,operationVersion:node.metadata?.operationVersion}}]});
      }}>{node.label}</button>)}</section>)}
    </aside>
    <main style={{minWidth:0,minHeight:0}}>
      {flow ? <FrnlEditableNodeGraph nodes={graphNodes} edges={graphEdges} selectedNodeIds={selected} onSelectionChange={setSelected} onNodesChange={updateNodes} onEdgesChange={updateEdges} magneticEnabled autoSolidifyEnabled={false} signalTelemetryEnabled onMagneticTraceSolidify={addMagneticEdge} onPredictiveSolidify={(_id,ghost)=>solidifyGhost(ghost)} onPredictiveSolidifyAll={(ghosts)=>ghosts?.forEach(solidifyGhost)} onPredictiveSolidifyAllForNode={(_nodeId,ghosts)=>ghosts?.forEach(solidifyGhost)} /> : <div style={{padding:30}}>Create or select a flow.</div>}
    </main>
  </div>;
}
FodModule.displayName='FodModule';
