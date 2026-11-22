import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const gate = fs.readFileSync(path.join(process.cwd(), 'packages/ui/src/components/auth/LuthOidcGate.tsx'), 'utf8');

describe('polished canonical OAuth login gate', () => {
  it('keeps canonical first-party auth and verified callback lifecycle', () => {
    expect(gate).toContain('createApplicationAuthClient()');
    expect(gate).toContain('client.getSession()');
    expect(gate).toContain('signIn: (returnTo?: string) => client.startSignIn(returnTo)');
    expect(gate).toContain('auth.client.signInWithGoogle()');
    expect(gate).toContain('onAuthenticatedRef.current?.(auth.user)');
    expect(gate).toContain('onContinueAsGuest');
  });

  it('preserves the original full-screen branded workspace aesthetic', () => {
    expect(gate).toContain('appSubtitle="WORKSPACE"');
    expect(gate).toContain('<AuthPage');
    expect(gate).not.toContain('SIGN IN TO WORKSPACE');
    expect(gate).not.toMatch(/>\s*OR\s*</);
    expect(gate).toContain('onGoogleSignIn={async () => {');
    expect(gate).not.toContain('CONTINUE WITH EMAIL');
    expect(gate).toContain('onLogin={signInEmail}');
    expect(gate).toContain('onRegister={signUpEmail}');
  });

  it('contains no user-facing provider attribution or obsolete sign-in button', () => {
    expect(gate).not.toContain('Sign in securely through Luth');
    expect(gate).not.toContain('Continue with Luth');
    expect(gate).not.toContain('handled on the secure Luth identity page');
    expect(gate).not.toContain('This application never asks for');
    expect(gate).not.toContain('Access your workspace with your existing account');
    expect(gate).not.toContain('WORKSPACE SYSTEM');
    expect(gate).not.toContain('VERIFYING LUTH SESSION');
    expect(gate).toContain('VERIFYING SESSION...');
    expect(gate).toContain('if (auth.initializing || auth.loading)');
    expect(gate).not.toContain('disabled={Boolean(auth.error)}');
    expect(gate).not.toContain('Session verification is unavailable');
    expect(gate).not.toContain('No authenticated workspace access');
    expect(gate).not.toContain('CONTINUE WITH EMAIL');
    expect(gate).not.toContain('RETRY SESSION');
    expect(gate).toContain('auth.client.signInWithGoogle()');
    expect(gate).not.toContain('onClick={() => auth.signIn()}');
    expect(gate).toContain('signUpWithEmailCredentials');
    expect(gate).not.toContain('localStorage');
  });
});
