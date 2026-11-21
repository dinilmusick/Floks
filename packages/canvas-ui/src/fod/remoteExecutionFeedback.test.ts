import {describe,expect,it} from 'vitest';
import {remoteExecutionFeedback} from './remoteExecutionFeedback.js';
describe('remote invocation failure feedback',()=>{
 it.each([
   [{status:401},'authentication'],[{status:403},'denied'],
   [{code:'GRANT_REVOKED'},'revoked'],[{code:'STALE_REVISION'},'stale-revision'],
   [{code:'TIMEOUT'},'timeout'],[{status:504},'timeout'],
   [{code:'FALLBACK_EXHAUSTED'},'fallback-exhausted'],
   [{code:'REPLAY_UNSAFE'},'replay-unsafe'],[{code:'MALFORMED_TARGET'},'malformed-target'],[{status:503},'unavailable'],
 ])('classifies %p as %s without permitting client replay', (source,kind)=>{
   const result=remoteExecutionFeedback(source);
   expect(result.kind).toBe(kind);
   expect(result.automaticRetryAllowed).toBe(false);
   expect(result.automaticFallbackAllowed).toBe(false);
 });
 it('never renders a server error message containing credentials',()=>{
   expect(remoteExecutionFeedback(Object.assign(new Error('Bearer secret'),{status:403})).message).not.toMatch(/secret/i);
   expect(remoteExecutionFeedback(new Error('token=secret')).message).not.toMatch(/token=secret/);
 });
});
