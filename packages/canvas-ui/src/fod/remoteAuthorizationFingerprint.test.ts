import {describe, expect, it} from 'vitest';
import {filterRemoteDefinitions,type RemoteGraphDefinition} from './remoteGraphContract.js';
import {remoteAuthorizationFingerprint} from './remoteAuthorizationFingerprint.js';

const descriptor = (version = 'v7', workspace = 'target-a'): RemoteGraphDefinition => ({
  type:'remote.app.workflow',
  category:'backend-api',
  inputs:[{id:'count',name:'Count',direction:'input',dataType:'number'}],
  outputs:[{id:'result',name:'Result',direction:'output',dataType:'object'}],
  metadata:{appId:'app-a',targetWorkspaceId:workspace,operationId:'workflow-1',
    operationVersion:version,leaseExpiresAt:'2999-01-01T00:00:00.000Z',surface:'raw.backend'},
});

describe('passive graph discovery authorization fingerprint',()=>{
  it('treats ordering and lease renewal as stable while still filtering expired capabilities',()=>{
    const a=descriptor();
    const b={...descriptor('v3','target-b'),type:'remote.app.other'};
    const first=remoteAuthorizationFingerprint(filterRemoteDefinitions([a,b]));
    const renewal={...a,metadata:{...a.metadata,leaseExpiresAt:'2998-12-31T00:00:00.000Z'}};
    expect(remoteAuthorizationFingerprint(filterRemoteDefinitions([b,renewal]))).toBe(first);
    const expired={...a,metadata:{...a.metadata,leaseExpiresAt:'2000-01-01T00:00:00.000Z'}};
    expect(remoteAuthorizationFingerprint(filterRemoteDefinitions([expired,b]))).not.toBe(first);
  });
  it('changes when an exact version, workspace, port contract or consent surface changes',()=>{
    const first=remoteAuthorizationFingerprint([descriptor()]);
    expect(remoteAuthorizationFingerprint([descriptor('v8')])).not.toBe(first);
    expect(remoteAuthorizationFingerprint([descriptor('v7','target-b')])).not.toBe(first);
    const portDrift={...descriptor(),inputs:[{id:'count',name:'Count',direction:'input',dataType:'string'}]};
    expect(remoteAuthorizationFingerprint([portDrift])).not.toBe(first);
    const consent={...descriptor(),metadata:{...descriptor().metadata,surface:'raw.frontend.session'}};
    expect(remoteAuthorizationFingerprint([consent])).not.toBe(first);
  });
  it('includes other authorization-significant metadata while excluding lease timestamps',()=>{
    const first=remoteAuthorizationFingerprint([descriptor()]);
    const revised={...descriptor(),metadata:{...descriptor().metadata,grantRevision:'g2'}};
    expect(remoteAuthorizationFingerprint([revised])).not.toBe(first);
    expect(remoteAuthorizationFingerprint([])).not.toBe(first);
  });
});
