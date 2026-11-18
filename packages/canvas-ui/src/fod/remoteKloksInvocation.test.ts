import {describe,expect,it,vi} from 'vitest';
import {invokeKloksPublishedWorkflow,toKloksPublishedWorkflowCall} from './remoteKloksInvocation.js';

const handle={appId:'aiko',targetWorkspaceId:'workspace-2',operationId:'published-flow',operationVersion:'3'};

describe('Kloks published workflow graph adapter',()=>{
  it('maps exact Floks handle to documented Kloks FOD W5 request',()=>{
    expect(toKloksPublishedWorkflowCall(handle,{count:2})).toEqual({
      targetAppId:'aiko',targetWorkspaceId:'workspace-2',
      workflowId:'published-flow',version:3,input:{count:2},
    });
  });
  it.each(['v3','0','03','-1','1.5','9007199254740992','NaN'])(
    'fails closed on invalid workflow revision %s',version=>{
      expect(()=>toKloksPublishedWorkflowCall({...handle,operationVersion:version}))
        .toThrow(/revision|handle/);
    }
  );
  it('rejects malformed app, missing workspace and path-like workflow IDs',()=>{
    expect(()=>toKloksPublishedWorkflowCall({...handle,appId:'https://example.com'})).toThrow();
    expect(()=>toKloksPublishedWorkflowCall({...handle,targetWorkspaceId:''})).toThrow();
    expect(()=>toKloksPublishedWorkflowCall({...handle,operationId:'../private'})).toThrow();
  });
  it('invokes only the canonical BackendFacade command and passes no caller-supplied grant',async()=>{
    const execute=vi.fn(async()=>({success:true,output:{done:true}}));
    const domain=vi.fn(()=>({execute}));
    const result=await invokeKloksPublishedWorkflow({domain},handle,{count:2});
    expect(domain).toHaveBeenCalledExactlyOnceWith('fod');
    expect(execute).toHaveBeenCalledExactlyOnceWith('executePublishedWorkflow',{
      targetAppId:'aiko',targetWorkspaceId:'workspace-2',
      workflowId:'published-flow',version:3,input:{count:2},
    });
    expect(result).toEqual({success:true,output:{done:true}});
    expect(JSON.stringify(execute.mock.calls[0][1])).not.toContain('grant');
    expect(JSON.stringify(execute.mock.calls[0][1])).not.toContain('ownerUserId');
  });
  it('fails closed if the canonical client is absent',async()=>{
    await expect(invokeKloksPublishedWorkflow(null as never,handle)).rejects.toThrow(/BackendClient/);
    await expect(invokeKloksPublishedWorkflow({domain:()=>({execute:null as never})},handle))
      .rejects.toThrow(/unavailable/);
  });
});
