import {
  resolveClientOrigin,
  resolveClientEnvironment,
} from '@dinilmusick/gutts/auth';

export {
  LuthAuthClient,
  createLuthAuthClient,
} from '@dinilmusick/gutts/auth';

export type {
  DeploymentEnvironment,
  EmailSignInCredentials,
  EmailSignUpData,
  GoogleSignInOptions,
  LuthAuthClientConfig,
  LuthAuthTokenStore,
  LuthSessionResult,
  RegisterApplicationResult,
} from '@dinilmusick/gutts/auth';

export { LuthAuthError } from '@dinilmusick/gutts/auth';

export const resolveLuthOrigin = resolveClientOrigin;
export const resolveLuthEnvironment = resolveClientEnvironment;
