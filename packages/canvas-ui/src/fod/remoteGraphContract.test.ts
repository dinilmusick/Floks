import {describe,expect,it} from 'vitest';
import {filterRemoteDefinitions,validateRemoteGraph} from './remoteGraphContract.js';
const def=(appId='skipo-one',operationId='run',version='v1')=>({
  type:`remote.${appId}.${operationId}`,category:'backend-api',
  inputs:[{id:'count',name:'Count',direction:'input',dataType:'number'}],
  outputs:[{id:'result',name:'Result',direction:'output',dataType:'string'}],
  metadata:{appId,targetWorkspaceId:'target-workspace',operationId,operationVersion:version}
});
const node=(d:ReturnType<typeof def>)=>({id:'remote-1',type:d.type,data:{...d.metadata,configuredInputs:{count:2}}});
describe('remote graph security and persistence contract',()=>{
  it('separates two Skipo application handles',()=>{
    const a=def('skipo-one'),b=def('skipo-two');
    expect(validateRemoteGraph([node(a)],[a,b]).ok).toBe(true);
    expect(validateRemoteGraph([node(b)],[a]).ok).toBe(false);
  });
  it('rejects stale versions and wrong target workspace',()=>{
    const a=def();
    expect(validateRemoteGraph([node(a)],[def('skipo-one','run','v2')]).message).toMatch(/version/);
    expect(validateRemoteGraph([{...node(a),data:{...node(a).data,targetWorkspaceId:'wrong'}}],[a]).ok).toBe(false);
  });
  it('preserves the saved graph on grant revoke and missing operation version',()=>{
    const a=def(),saved=node(a),before=JSON.stringify(saved);
    expect(validateRemoteGraph([saved],[]).ok).toBe(false);
    expect(validateRemoteGraph([{...saved,data:{appId:'skipo-one'}}],[a]).ok).toBe(false);
    expect(JSON.stringify(saved)).toBe(before);
  });
  it('validates known typed input payloads',()=>{
    const a=def();
    expect(validateRemoteGraph([{...node(a),data:{...node(a).data,configuredInputs:{count:'wrong'}}}],[a]).message).toMatch(/typed/);
    expect(validateRemoteGraph([{...node(a),data:{...node(a).data,configuredInputs:{missing:true}}}],[a]).ok).toBe(false);
  });
  it('never exposes ambiguous remote definitions or overrides local nodes',()=>{
    const a=def();
    expect(filterRemoteDefinitions([a,a])).toEqual([]);
    expect(filterRemoteDefinitions([a],[a.type])).toEqual([]);
    expect(validateRemoteGraph([node(a)],[a,a]).ok).toBe(false);
  });
  it('requires a separate live window for frontend operations',()=>{
    const a=def();
    const live={...a,metadata:{...a.metadata,surface:'raw.frontend.session'}};
    expect(validateRemoteGraph([node(a)],[live]).requiresWindowConsent).toBe(true);
  });
});