import {describe,expect,it} from 'vitest';
import {filterRemoteDefinitions,validateRemoteGraph,type RemoteGraphDefinition} from './remoteGraphContract.js';
import {
  readRemotePortSnapshot,remotePortFingerprint,snapshotRemotePorts,validateRemoteConnections,
} from './remoteGraphConnections.js';

const port=(id:string,direction:'input'|'output',dataType='number')=>
  ({id,name:id,direction,dataType});
const remote=(appId:string,workspace:string,operationId:string):RemoteGraphDefinition=>({
  type:`remote.${appId}.${workspace}.${operationId}`,category:'backend-api',
  inputs:[port('count','input')],outputs:[port('result','output')],
  metadata:{appId,targetWorkspaceId:workspace,operationId,operationVersion:'v1',surface:'raw.backend'},
});
const pinned=(id:string,descriptor:RemoteGraphDefinition,inputs:Record<string,unknown>={})=>({
  id,type:descriptor.type,data:{
    ...descriptor.metadata,configuredInputs:inputs,
    remotePorts:snapshotRemotePorts(descriptor),remotePortSignature:remotePortFingerprint(descriptor),
  },
});
const local={type:'local.number',category:'local',inputs:[],outputs:[port('result','output')]};
const edge=(id:string,source:string,target:string,sourceHandle='result',targetHandle='count')=>
  ({id,source,target,sourceHandle,targetHandle});

describe('pinned remote graph connection validation',()=>{
  it('pins/restores exact remote port types and keeps old sockets visible after revocation',()=>{
    const d=remote('aiko','workspace-1','calculate');
    const saved=JSON.parse(JSON.stringify(pinned('remote-1',d)));
    expect(readRemotePortSnapshot(saved.data.remotePorts)).toEqual(snapshotRemotePorts(d));
    expect(validateRemoteGraph([saved],[d]).ok).toBe(true);
    expect(validateRemoteConnections([saved],[],[d]).ok).toBe(true);
    expect(validateRemoteGraph([saved],[]).ok).toBe(false);
    expect(readRemotePortSnapshot(saved.data.remotePorts)?.inputs[0].id).toBe('count');
    expect(saved.data.operationVersion).toBe('v1');
  });

  it('runs a typed local output to two distinct authorized remote operations (fan-out)',()=>{
    const a=remote('aiko','workspace-a','execute');
    const b=remote('kone','workspace-b','execute');
    const nodes=[{id:'local',type:local.type,data:{}},pinned('a',a),pinned('b',b)];
    const edges=[edge('e1','local','a'),edge('e2','local','b')];
    expect(validateRemoteGraph(nodes,[a,b]).ok).toBe(true);
    const checked=validateRemoteConnections(nodes,edges,[local,a,b]);
    expect(checked.ok).toBe(true);
    expect(checked.connections).toHaveLength(2);
    expect(checked.connections.map(conn=>conn.targetNodeId)).toEqual(['a','b']);
    expect(checked.connections.every(conn=>conn.dataType==='number')).toBe(true);
    expect(JSON.parse(JSON.stringify(edges))).toEqual(edges);
  });

  it('refuses ambiguous producers and constants attached to the same remote input',()=>{
    const d=remote('aiko','w','run');
    const nodes=[{id:'local',type:local.type,data:{}},{id:'second',type:local.type,data:{}},pinned('dst',d)];
    expect(validateRemoteConnections(nodes,[edge('one','local','dst'),edge('two','second','dst')],[local,d]).message)
      .toMatch(/more than one producer/);
    expect(validateRemoteConnections([...nodes.slice(0,2),pinned('dst',d,{count:3})],[edge('one','local','dst')],[local,d]).message)
      .toMatch(/both an edge and a constant/);
  });

  it('rejects missing destinations, missing ports and incompatible typed connections',()=>{
    const d=remote('aiko','w','run');
    const nodes=[{id:'local',type:local.type,data:{}},pinned('dst',d)];
    expect(validateRemoteConnections(nodes,[edge('gone','local','missing')],[local,d]).ok).toBe(false);
    expect(validateRemoteConnections(nodes,[edge('missing-port','local','dst','unknown')],[local,d]).ok).toBe(false);
    const changed={...local,outputs:[port('result','output','string')]};
    expect(validateRemoteConnections(nodes,[edge('wrong-type','local','dst')],[changed,d]).message)
      .toMatch(/incompatible/);
    expect(validateRemoteConnections(nodes,[edge('e','local','dst'),edge('e','local','dst')],[local,d]).ok)
      .toBe(false);
  });

  it('fails closed on same-version port drift and forged snapshot',()=>{
    const d=remote('skipo','work','calculate'),saved=pinned('n',d);
    const drift={...d,inputs:[port('count','input','string')]};
    expect(validateRemoteGraph([saved],[drift]).ok).toBe(true); // version alone is not enough
    expect(validateRemoteConnections([saved],[],[drift]).message).toMatch(/typed port contract changed/);
    const forged={...saved,data:{...saved.data,remotePorts:{inputs:[],outputs:[]}}};
    expect(validateRemoteConnections([forged],[],[d]).ok).toBe(false);
    const reversed={...d,outputs:[port('another','output'),...d.outputs]};
    expect(remotePortFingerprint(reversed)).not.toBe(remotePortFingerprint(d));
  });

  it('isolates target workspaces and rejects colliding palette definitions',()=>{
    const a=remote('aiko','alpha','run'),b=remote('aiko','beta','run');
    expect(validateRemoteGraph([pinned('a',a)],[b]).ok).toBe(false);
    expect(validateRemoteConnections([pinned('a',a)],[],[b]).ok).toBe(false);
    const collision={...b,type:a.type};
    expect(filterRemoteDefinitions([a,collision])).toEqual([]);
  });

  it('does not mutate local graph semantics when no remote edge participates',()=>{
    const nodes=[{id:'local-1',type:local.type,data:{}},{id:'local-2',type:local.type,data:{}}];
    expect(validateRemoteConnections(nodes,[edge('local','local-1','local-2')],[local])).toEqual({ok:true,connections:[]});
  });
});
