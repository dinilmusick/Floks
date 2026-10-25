import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

describe('canonical auth UI contract', () => {
  it('exposes Google sign-in and live email validation', () => {
    const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'AuthPage.tsx'), 'utf8');
    expect(source).toContain('onGoogleSignIn');
    expect(source).toContain('emailValid');
    expect(source).toContain('Enter a valid email address.');
    expect(source).toContain('GoogleSignInButton');
  });

  it('keeps Google Drive authorization out of the sign-in control', () => {
    const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'GoogleSignInButton.tsx'), 'utf8');
    expect(source).not.toContain('drive');
    expect(source).not.toContain('scope');
  });
});
