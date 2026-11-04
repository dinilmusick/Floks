import {
  resolveClientOrigin,
  resolveClientEnvironment,
} from '@ultrst-armada/kloks/auth';

export {
  DEFAULT_LUTH_URL,
  LuthAuthClient,
  createLuthAuthClient,
} from '@ultrst-armada/kloks/auth';

export type {
  DeploymentEnvironment,
  EmailSignInCredentials,
  EmailSignUpData,
  GoogleSignInOptions,
  LuthAuthClientConfig,
  LuthAuthTokenStore,
  LuthSession,
  LuthUser,
  LuthSessionResult,
  RegisterApplicationResult,
} from '@ultrst-armada/kloks/auth';

export { LuthAuthError } from '@ultrst-armada/kloks/auth';

export const resolveLuthOrigin = resolveClientOrigin;
export const resolveLuthEnvironment = resolveClientEnvironment;
