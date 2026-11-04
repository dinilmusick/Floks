export {
  LuthAuthClient,
  createLuthAuthClient,
  resolveClientOrigin,
  resolveClientEnvironment,
} from '@dinilmusick/gutts';

export type {
  DeploymentEnvironment,
  EmailSignInCredentials,
  EmailSignUpData,
  GoogleSignInOptions,
  LuthAuthClientConfig,
  LuthAuthTokenStore,
  LuthSessionResult,
  RegisterApplicationResult,
} from '@dinilmusick/gutts';

export { LuthAuthError } from '@dinilmusick/gutts';

export const resolveLuthOrigin = resolveClientOrigin;
export const resolveLuthEnvironment = resolveClientEnvironment;
