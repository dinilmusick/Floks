/** Presentation-only feedback from the authenticated, transport-neutral executor. */
export type RemoteFailureKind='authentication'|'denied'|'revoked'|'consent'|'stale-revision'|'malformed-target'|'timeout'|'unavailable'|'fallback-exhausted'|'replay-unsafe'|'cancelled'|'unknown';
export interface RemoteExecutionFeedback {
  kind:RemoteFailureKind;message:string;
  /** Only the target-aware backend can choose another deployment or replay effects. */
  automaticRetryAllowed:false;automaticFallbackAllowed:false;
}
const messages:Record<RemoteFailureKind,string>={
  authentication:'Authentication required. Sign in through Luth before retrying.',
  denied:'Operation denied by the target (403). No fallback was attempted.',
  revoked:'Operation grant revoked. Reload authorized capabilities before retrying.',
  consent:'Active frontend window consent is required.',
  'stale-revision':'Operation revision or typed contract is stale. Reload the authorized operation.',
  'malformed-target':'Target identity or operation is malformed. Invocation blocked.',
  timeout:'Execution timed out; completion may be unknown. Do not replay side effects automatically.',
  unavailable:'Authorized target unavailable. Only the backend can select a safe fallback.',
  'fallback-exhausted':'No eligible authorized deployment remains; fallback exhausted.',
  'replay-unsafe':'Execution outcome is uncertain. Retry requires backend-enforced idempotency.',
  cancelled:'Execution cancelled. Confirm outcome before attempting a new call.',
  unknown:'Remote execution failed. Inspect authorized backend diagnostics.',
};
const codes:Record<string,RemoteFailureKind>={
  UNAUTHENTICATED:'authentication',UNAUTHORIZED:'authentication',AUTH_REQUIRED:'authentication',
  FORBIDDEN:'denied',DENIED:'denied',PERMISSION_DENIED:'denied',
  REVOKED:'revoked',GRANT_REVOKED:'revoked',AUTHORIZATION_CHANGED:'revoked',
  CONSENT_REQUIRED:'consent',ACTIVE_WINDOW_CONSENT_REQUIRED:'consent',
  STALE_REVISION:'stale-revision',VERSION_MISMATCH:'stale-revision',STALE_VERSION:'stale-revision',CONTRACT_CHANGED:'stale-revision',
  MALFORMED_TARGET:'malformed-target',INVALID_TARGET:'malformed-target',INVALID_HANDLE:'malformed-target',
  TIMEOUT:'timeout',DEADLINE_EXCEEDED:'timeout',ETIMEDOUT:'timeout',
  UNAVAILABLE:'unavailable',TARGET_UNAVAILABLE:'unavailable',NO_AVAILABLE_TARGET:'unavailable',
  FALLBACK_EXHAUSTED:'fallback-exhausted',NO_ELIGIBLE_DEPLOYMENT:'fallback-exhausted',
  REPLAY_UNSAFE:'replay-unsafe',IDEMPOTENCY_REQUIRED:'replay-unsafe',DUPLICATE_EXECUTION_UNCERTAIN:'replay-unsafe',
  ABORT_ERR:'cancelled',ABORTERROR:'cancelled',
};
/** Untrusted backend message strings can contain tokens, so never render them. */
export function remoteExecutionFeedback(error:unknown):RemoteExecutionFeedback {
  let kind:RemoteFailureKind='unknown';
  if(error && typeof error==='object' && !Array.isArray(error)){
    const value=error as Record<string,unknown>,status=value.status??value.statusCode;
    if(status===401)kind='authentication';
    else if(status===403)kind='denied';
    else if(status===408 || status===504)kind='timeout';
    else if(status===503)kind='unavailable';
    else for(const raw of [value.code,value.errorCode,value.name]){
      if(typeof raw!=='string')continue;
      const code=raw.toUpperCase().replace(/[^A-Z0-9]+/g,'_');
      if(Object.prototype.hasOwnProperty.call(codes,code)){kind=codes[code];break;}
    }
  }
  return {kind,message:messages[kind],automaticRetryAllowed:false,automaticFallbackAllowed:false};
}
