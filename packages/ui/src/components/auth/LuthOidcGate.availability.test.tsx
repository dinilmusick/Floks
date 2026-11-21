import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LuthOidcGate } from './LuthOidcGate.js';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  startSignIn: vi.fn(),
}));

vi.mock('@dinilmusick/gutts/auth', () => ({
  createApplicationAuthClient: () => mocks,
}));

describe('LuthOidcGate public sign-in availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ authenticated: false });
  });

  it('renders the Google link while initial session verification is still pending', async () => {
    let resolveSession!: (value: { authenticated: boolean }) => void;
    mocks.getSession.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveSession = resolve; }));
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);

    const google = screen.getByRole('link', { name: 'CONTINUE WITH GOOGLE' });
    expect(google.getAttribute('href')).toBe('/api/auth/oidc/start');
    expect(screen.queryByText('Protected workspace')).toBeNull();

    await act(async () => { resolveSession({ authenticated: false }); });
    expect(screen.getByRole('link', { name: 'CONTINUE WITH GOOGLE' })).toBeTruthy();
  });

  it('keeps login usable on network failure without disclosing session diagnostics', async () => {
    mocks.getSession.mockRejectedValueOnce(new Error('[AUTH_SESSION_UNAVAILABLE] Application authentication service is unavailable.'));
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('link', { name: 'CONTINUE WITH GOOGLE' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Protected workspace')).toBeNull();
  });

  it('never reveals protected content until the session endpoint verifies a user', async () => {
    mocks.getSession.mockResolvedValueOnce({ authenticated: true, user: { id: 'verified-user', email: 'test@example.test' } });
    render(<LuthOidcGate authenticatedContent={<main>Protected workspace</main>} />);
    expect(await screen.findByText('Protected workspace')).toBeTruthy();
  });
});
