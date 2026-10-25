import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('canonical auth UI contract', () => {
  it('exposes Google sign-in and live email validation', () => {
    const source = fs.readFileSync(new URL('./AuthPage.tsx', import.meta.url), 'utf8');
    expect(source).toContain('onGoogleSignIn');
    expect(source).toContain('emailValid');
    expect(source).toContain('Enter a valid email address.');
    expect(source).toContain('GoogleSignInButton');
  });

  it('keeps Google Drive authorization out of the sign-in control', () => {
    const source = fs.readFileSync(new URL('./GoogleSignInButton.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('drive');
    expect(source).not.toContain('scope');
  });
});
