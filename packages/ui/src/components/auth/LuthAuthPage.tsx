import React, { useEffect, useMemo, useState } from 'react';
import { AuthPage, type AuthPageProps, type AuthResult } from './AuthPage.js';
import { AuthLoadingScreen } from './AuthLoadingScreen.js';
import { createLuthAuthClient as createClient } from './LuthAuthClient.js';
import type { LuthAuthClient } from './LuthAuthClient.js';

export interface LuthAuthPageProps extends Omit<AuthPageProps, 'onLogin' | 'onRegister' | 'onGoogleSignIn' | 'onSuccess'> {
  ecosystemId: string;
  applicationId: string;
  luthUrl?: string;
  onAuthenticated?: (user: unknown) => void;
  onSuccess?: (result: AuthResult) => void;
}

export function createLuthAuthClientForApplication(input: {
  ecosystemId: string;
  applicationId: string;
  luthUrl?: string;
}): LuthAuthClient {
  return createClient({
    ecosystemId: input.ecosystemId,
    applicationId: input.applicationId,
    ...(input.luthUrl ? { luthUrl: input.luthUrl } : {}),
  });
}

export const LuthAuthPage: React.FC<LuthAuthPageProps> = ({
  ecosystemId,
  applicationId,
  luthUrl,
  onAuthenticated,
  onSuccess,
  ...presentation
}) => {
  const auth = useMemo(
    () => createLuthAuthClientForApplication({ ecosystemId, applicationId, luthUrl }),
    [ecosystemId, applicationId, luthUrl],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void auth.getSession()
      .then((session) => {
        if (active && session.authenticated && session.user) onAuthenticated?.(session.user);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [auth, onAuthenticated]);

  const result = (value: unknown): AuthResult => {
    const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      success: true,
      user: payload.user ?? (payload.data as Record<string, unknown> | undefined)?.user ?? value,
      redirectUrl: typeof payload.url === 'string' ? payload.url : undefined,
    };
  };

  if (!ready) return <AuthLoadingScreen label="CONNECTING TO LUTH..." />;

  return (
    <AuthPage
      {...presentation}
      onLogin={async (email, password) => result(await auth.signInWithEmail({ email, password }))}
      onRegister={async ({ name, email, password }) => result(await auth.signUpWithEmail({ name, email, password }))}
      onGoogleSignIn={async () => {
        const response = result(await auth.signInWithGoogle());
        if (response.redirectUrl && typeof window !== 'undefined') window.location.assign(response.redirectUrl);
        return response;
      }}
      onSuccess={(value) => {
        onSuccess?.(value);
        if (value.user) onAuthenticated?.(value.user);
      }}
    />
  );
};

export default LuthAuthPage;
