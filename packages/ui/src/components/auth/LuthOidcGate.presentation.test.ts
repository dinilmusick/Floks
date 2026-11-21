import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const gate = fs.readFileSync(path.join(process.cwd(), 'packages/ui/src/components/auth/LuthOidcGate.tsx'), 'utf8');

describe('polished canonical OAuth login gate', () => {
  it('keeps canonical first-party auth and verified callback lifecycle', () => {
    expect(gate).toContain('createApplicationAuthClient()');
    expect(gate).toContain('client.getSession()');
    expect(gate).toContain('signIn: (returnTo?: string) => client.startSignIn(returnTo)');
    expect(gate).toContain('href="/api/auth/oidc/start"');
    expect(gate).toContain('onAuthenticatedRef.current?.(auth.user)');
    expect(gate).toContain('onContinueAsGuest');
  });

  it('preserves the original full-screen branded workspace aesthetic', () => {
    expect(gate).toContain('border-b-2 border-[var(--skipo-border-color');
    expect(gate).toContain('shadow-[6px_6px_0px_var(--skipo-border-color');
    expect(gate).toContain('SIGN IN TO WORKSPACE');
    expect(gate).toContain('CONTINUE WITH GOOGLE');
    expect(gate).toContain('CONTINUE WITH EMAIL');
    expect(gate).toContain('CREATE ACCOUNT');
    expect(gate).toContain('<GoogleSignInButton');
    expect(gate).toContain('{appName} WORKSPACE SYSTEM');
  });

  it('contains no user-facing provider attribution or obsolete sign-in button', () => {
    expect(gate).not.toContain('Sign in securely through Luth');
    expect(gate).not.toContain('Continue with Luth');
    expect(gate).not.toContain('VERIFYING LUTH SESSION');
    expect(gate).toContain('VERIFYING SESSION...');
    expect(gate).not.toContain('disabled={Boolean(auth.error)}');
    expect(gate).toContain('Session verification is unavailable');
    expect(gate).toContain('No authenticated workspace access');
    expect(gate).toContain('CONTINUE WITH EMAIL');
    expect(gate).toContain('href="/api/auth/oidc/start"');
    expect(gate).not.toContain('onClick={() => auth.signIn()}');
    expect(gate).not.toContain('<input type="password"');
    expect(gate).not.toContain('localStorage');
  });
});
