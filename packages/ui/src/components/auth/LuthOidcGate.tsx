import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createApplicationAuthClient,
  type ApplicationAuthClient,
  type LuthSessionResult,
} from '@dinilmusick/gutts/auth';
import { AuthLoadingScreen } from './AuthLoadingScreen.js';
import { AuthPage, type AuthResult } from './AuthPage.js';
export interface ApplicationOidcAuth {
  client: ApplicationAuthClient;
  session: LuthSessionResult;
  user: LuthSessionResult['user'];
  initializing: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<LuthSessionResult>;
  signIn: (returnTo?: string) => void;
  signOut: () => Promise<void>;
}
/**
 * Canonical application identity gate. Browser receives only an opaque
 * app-origin cookie; Luth/Better Auth verifies identity, while the
 * shared Floks form offers first-party email and registration inline.
 * All Skipo-generated and migrated app shells should use this one gate,
 * rather than reimplementing callback or session hydration.
 */
export function useApplicationOidcAuth(): ApplicationOidcAuth {
  const client = useMemo(() => createApplicationAuthClient(), []);
  const [session, setSession] = useState<LuthSessionResult>({ authenticated: false });
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const signingOut = useRef(false);
  const refresh = useCallback(async () => {
    if (signingOut.current) return { authenticated: false } as LuthSessionResult;
    const expected = ++revision.current;
    setLoading(true);
    try {
      const verified = await client.getSession();
      if (expected === revision.current && !signingOut.current) {
        setSession(verified);
        setError(null);
      }
      return verified;
    } catch (cause) {
      if (expected === revision.current && !signingOut.current) {
        // Hide protected UI on network uncertainty. Do not erase the opaque
        // first-party cookie or falsely claim the user explicitly logged out.
        setSession({ authenticated: false });
        setError(cause instanceof Error ? cause.message : 'Authentication service unavailable.');
      }
      throw cause;
    } finally {
      if (expected === revision.current && !signingOut.current) {
        setLoading(false);
        setInitializing(false);
      }
    }
  }, [client]);
  useEffect(() => {
    void refresh().catch(() => undefined);
    if (typeof window === 'undefined') return;
    const retry = () => { void refresh().catch(() => undefined); };
    window.addEventListener('focus', retry);
    window.addEventListener('online', retry);
    return () => {
      ++revision.current;
      window.removeEventListener('focus', retry);
      window.removeEventListener('online', retry);
    };
  }, [refresh]);
  const signOut = useCallback(async () => {
    signingOut.current = true;
    ++revision.current;
    setSession({ authenticated: false });
    setLoading(true);
    try {
      await client.signOut();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Logout failed.');
      throw cause;
    } finally {
      signingOut.current = false;
      setLoading(false);
    }
  }, [client]);
  return {
    client, session, user: session.user, loading, initializing, error, refresh, signOut,
    signIn: (returnTo?: string) => client.startSignIn(returnTo),
  };
}
export interface LuthOidcGateProps {
  appName?: string;
  authenticatedContent: React.ReactNode | ((auth: ApplicationOidcAuth) => React.ReactNode);
  loadingContent?: React.ReactNode;
  onAuthenticated?: (user: NonNullable<LuthSessionResult['user']>) => void;
  onContinueAsGuest?: () => void;
}
export function LuthOidcGate({
  appName = 'ULTRST APP',
  authenticatedContent,
  loadingContent,
  onAuthenticated,
  onContinueAsGuest,
}: LuthOidcGateProps) {
  const auth = useApplicationOidcAuth();
  const notified = useRef<string | null>(null);
  const onAuthenticatedRef = useRef(onAuthenticated);
  useEffect(() => { onAuthenticatedRef.current = onAuthenticated; }, [onAuthenticated]);
  useEffect(() => {
    if (!auth.session.authenticated || !auth.user) {
      notified.current = null;
    } else if (notified.current !== auth.user.id) {
      notified.current = auth.user.id;
      onAuthenticatedRef.current?.(auth.user);
    }
  }, [auth.session.authenticated, auth.user]);
  // Do not render the sign-in form while any initial or return-from-OAuth
  // session verification is pending. Otherwise the login page flashes briefly
  // after the provider redirects back, before the app session is hydrated.
  // Protected content is still allowed only for positively verified sessions.
  if (auth.initializing || auth.loading) {
    return <>{loadingContent ?? <AuthLoadingScreen label="VERIFYING SESSION..." />}</>;
  }
  if (auth.session.authenticated && auth.user) {
    return typeof authenticatedContent === 'function'
      ? <>{authenticatedContent(auth)}</> : <>{authenticatedContent}</>;
  }
  const resultFor = (verified: LuthSessionResult): AuthResult =>
    verified.authenticated && verified.user
      ? { success: true, user: verified.user }
      : { success: false, error: 'The application session could not be verified.' };

  const signInEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const session = await auth.client.signInWithEmailCredentials({ email, password });
      if (!session.authenticated) return resultFor(session);
      // Only the canonical session endpoint establishes the authenticated gate.
      return resultFor(await auth.refresh());
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Email sign-in failed.' };
    }
  };

  const signUpEmail = async (input: { name: string; email: string; password: string }): Promise<AuthResult> => {
    try {
      const session = await auth.client.signUpWithEmailCredentials(input);
      if (!session.authenticated) return resultFor(session);
      return resultFor(await auth.refresh());
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Account creation failed.' };
    }
  };

  return (
    <AuthPage
      appName={appName}
      appSubtitle="WORKSPACE"
      footerText=""
      onLogin={signInEmail}
      onRegister={signUpEmail}
      onGoogleSignIn={async () => {
        auth.client.signInWithGoogle();
        return { success: true };
      }}
      onContinueAsGuest={onContinueAsGuest}
    />
  );
}

export default LuthOidcGate;
