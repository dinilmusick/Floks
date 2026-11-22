import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Floks shared authentication UI contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'packages/ui/src/components/auth/AuthPage.tsx'), 'utf8');

  it('exposes Google sign-in as a consumer-supplied canonical auth action', () => {
    expect(source).toMatch(/onGoogleSignIn\?: \(\) => Promise<AuthResult>/);
    expect(source).toMatch(/\{onGoogleSignIn &&/);
    expect(source).toMatch(/await onGoogleSignIn\(\)/);
    expect(source).toMatch(/onSuccess\?\.\(result\)/);
  });

  it('routes email sign-in and registration through injected handlers', () => {
    expect(source).toMatch(/await onLogin\(cleanEmail, password\)/);
    expect(source).toMatch(/await onRegister\(\{ name: name\.trim\(\), email: cleanEmail, password \}\)/);
    expect(source).toMatch(/if \(!result\.success\) throw new Error/);
  });

  it('keeps the hosted email form concise and allows a blank footer', () => {
    expect(source).not.toContain("'SIGN IN TO WORKSPACE'");
    expect(source).not.toMatch(/>\\s*OR\\s*</);
    expect(source).toContain('footerText === undefined || footerText.length > 0');
    expect(source).toContain('onGoogleSignIn && enableGoogleSignIn');
  });

  it('keeps Google loading and error state independent from email form state', () => {
    expect(source).toMatch(/const \[googleLoading, setGoogleLoading\]/);
    expect(source).toMatch(/setGoogleLoading\(true\)/);
    expect(source).toMatch(/setGoogleLoading\(false\)/);
    expect(source).toMatch(/Google sign-in failed/);
  });
});
