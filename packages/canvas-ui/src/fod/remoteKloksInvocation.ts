import {readRemoteHandle,type RemoteGraphHandle} from './remoteGraphContract.js';

/**
 * Kloks FOD W5 uses a positive numeric immutable workflow revision. Generic
 * Skipo operation versions remain opaque strings; NEVER coerce those unless
 * the descriptor identifies an explicitly published FOD workflow.
 *
 * See Kloks packages/fod/WORKFLOW_BACKEND_CONTRACT.md (#113).
 */
export interface KloksPublishedWorkflowCall {
  targetAppId: string;
  targetWorkspaceId: string;
  workflowId: string;
  version: number;
  input?: unknown;
}

/** Narrow structural contract for the existing Kloks BackendClient's fod domain. */
export interface KloksBackendClientLike {
  domain(domainName: string): {
    execute(operation: string, payload: KloksPublishedWorkflowCall): Promise<unknown>;
  };
}

const validApp = (value:string):boolean => /^[a-z][a-z0-9-]{0,62}$/.test(value);
const validWorkflow = (value:string):boolean =>
  value!=='.' && value!=='..' && !value.includes('/') && !value.includes('\\');

export function toKloksPublishedWorkflowCall(
  candidate: unknown,
  input?: unknown,
): KloksPublishedWorkflowCall {
  const handle:RemoteGraphHandle|null=readRemoteHandle(candidate);
  if(!handle || !validApp(handle.appId) || !validWorkflow(handle.operationId) ||
      !/^[1-9][0-9]*$/.test(handle.operationVersion)) {
    throw new Error('Invalid published workflow graph handle');
  }
  const version=Number(handle.operationVersion);
  if(!Number.isSafeInteger(version) || version<1)
    throw new Error('Invalid published workflow revision');
  return {
    targetAppId:handle.appId,targetWorkspaceId:handle.targetWorkspaceId,
    workflowId:handle.operationId,version,...(input===undefined?{}:{input}),
  };
}

/**
 * A typed adapter, not a new engine or authorization service. Host code must
 * call it from the existing scoped graph executor, carrying authenticated
 * source-workspace and ancestry via its trusted Kloks transport context.
 * Target-side Kloks FOD W5 verifies the Luth principal, grant, version, cycle
 * and owning workspace independently on EVERY invocation.
 */
export async function invokeKloksPublishedWorkflow<R=unknown>(
  client:KloksBackendClientLike,
  handle:unknown,
  input?:unknown,
):Promise<R> {
  if(!client || typeof client.domain!=='function')
    throw new Error('Authenticated Kloks BackendClient is required');
  const call=toKloksPublishedWorkflowCall(handle,input);
  const facade=client.domain('fod');
  if(!facade || typeof facade.execute!=='function')
    throw new Error('Kloks FOD BackendFacade command is unavailable');
  return await facade.execute('executePublishedWorkflow',call) as R;
}
