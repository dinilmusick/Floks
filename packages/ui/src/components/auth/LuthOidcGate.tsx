import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createApplicationAuthClient,
  type ApplicationAuthClient,
  type LuthSessionResult,
} from '@dinilmusick/gutts/auth';
import { AuthLoadingScreen } from './AuthLoadingScreen.js';
import { GoogleSignInButton } from './GoogleSignInButton.js';
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
  // Do not hold an unauthenticated sign-in screen behind a network session check.
  // Authenticated content remains gated by a positively verified app session.
  if (auth.session.authenticated && (auth.initializing || auth.loading)) {
    return <>{loadingContent ?? <AuthLoadingScreen label="VERIFYING SESSION..." />}</>;
  }
  if (auth.session.authenticated && auth.user) {
    return typeof authenticatedContent === 'function'
      ? <>{authenticatedContent(auth)}</> : <>{authenticatedContent}</>;
  }
  return (
    <div
      data-frnl-component="LuthOidcGate"
      className="min-h-screen h-screen w-screen bg-[var(--skipo-bg,#0a0e17)] text-[var(--skipo-text,#f8fafc)] font-mono flex flex-col overflow-hidden"
    >
      <header className="border-b-2 border-[var(--skipo-border-color,#252d3d)] bg-[var(--skipo-surface,#121722)] px-6 py-3.5 flex items-center gap-3 shrink-0">
        <div aria-hidden="true" className="w-8 h-8 shrink-0 bg-[var(--skipo-accent,#6366f1)] text-black font-black flex items-center justify-center text-xs rounded-sm">
          ▲
        </div>
        <span className="text-sm font-black uppercase tracking-wider">{appName}</span>
        <span className="text-[10px] text-[var(--skipo-text-muted,#94a3b8)] tracking-tight">WORKSPACE</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <section
          aria-label={`${appName} sign in`}
          className="w-full max-w-md border-2 border-[var(--skipo-border-color,#252d3d)] bg-[var(--skipo-surface,#121722)] shadow-[6px_6px_0px_var(--skipo-border-color,#252d3d)] p-6 my-auto"
        >
          <h1 className="font-black text-sm tracking-wider uppercase mb-5">SIGN IN TO WORKSPACE</h1>
          <GoogleSignInButton
            label="CONTINUE WITH GOOGLE"
            href="/api/auth/oidc/start?method=google"
            className="mb-3"
          />
          <div className="flex items-center gap-2 mb-3 text-[9px] text-[var(--skipo-text-muted,#94a3b8)]">
            <span className="h-px flex-1 bg-[var(--skipo-border-color,#252d3d)]" />
            OR
            <span className="h-px flex-1 bg-[var(--skipo-border-color,#252d3d)]" />
          </div>
          <a
            href="/api/auth/oidc/start?method=email"
            className="block text-center w-full py-3 px-4 text-xs font-black uppercase tracking-wide border-2 border-[var(--skipo-accent,#6366f1)] bg-[var(--skipo-accent,#6366f1)] text-[var(--skipo-accent-fg,#000000)] hover:brightness-110 transition-all cursor-pointer"
          >
            CONTINUE WITH EMAIL
          </a>
          {onContinueAsGuest && (
            <>
              <div aria-hidden="true" className="my-4 flex items-center gap-2 text-[9px] text-[var(--skipo-text-muted,#94a3b8)]">
                <span className="h-px flex-1 bg-[var(--skipo-border-color,#252d3d)]" />
                OR
                <span className="h-px flex-1 bg-[var(--skipo-border-color,#252d3d)]" />
              </div>
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full py-2 text-[10px] font-black border-2 border-[var(--skipo-border-color,#252d3d)] text-[var(--skipo-text-muted,#94a3b8)] hover:text-[var(--skipo-text,#f8fafc)] transition-colors cursor-pointer"
              >
                CONTINUE AS GUEST
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default LuthOidcGate;
