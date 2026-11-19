import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createApplicationAuthClient,
  type ApplicationAuthClient,
  type LuthSessionResult,
} from '@dinilmusick/gutts/auth';
import { AuthLoadingScreen } from './AuthLoadingScreen.js';

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
 * app-origin cookie; Luth/Better Auth hosts the actual Google/email login.
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

  if (auth.initializing || auth.loading) {
    return <>{loadingContent ?? <AuthLoadingScreen label="VERIFYING LUTH SESSION..." />}</>;
  }
  if (auth.session.authenticated && auth.user) {
    return typeof authenticatedContent === 'function'
      ? <>{authenticatedContent(auth)}</> : <>{authenticatedContent}</>;
  }
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--skipo-bg,#0a0e17)] text-[var(--skipo-text,#f8fafc)]">
      <section className="w-full max-w-md rounded-lg border border-[var(--skipo-border-color,#252d3d)] bg-[var(--skipo-surface,#121722)] p-6 space-y-5">
        <h1 className="font-bold text-xl">{appName}</h1>
        <p className="text-sm opacity-80">
          Sign in securely through Luth. Google and email passwords are handled only by Luth.
        </p>
        {auth.error && <p role="alert" className="text-sm text-red-300">{auth.error}</p>}
        <button type="button" onClick={() => auth.signIn()}
          className="w-full rounded border border-[var(--skipo-accent,#6366f1)] px-4 py-3 font-semibold">
          Continue with Luth (Google or email)
        </button>
        {auth.error && (
          <button type="button" onClick={() => { void auth.refresh().catch(() => undefined); }}
            className="w-full rounded border px-4 py-2 text-sm">Retry session</button>
        )}
        {onContinueAsGuest && (
          <button type="button" onClick={onContinueAsGuest}
            className="w-full rounded border px-4 py-2 text-sm">Continue as guest</button>
        )}
      </section>
    </main>
  );
}

export default LuthOidcGate;
