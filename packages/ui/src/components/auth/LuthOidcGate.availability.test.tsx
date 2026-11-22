import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LuthOidcGate } from './LuthOidcGate.js';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  startSignIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithEmailCredentials: vi.fn(),
  signUpWithEmailCredentials: vi.fn(),
}));

vi.mock('@dinilmusick/gutts/auth', () => ({
  createApplicationAuthClient: () => mocks,
}));

describe('LuthOidcGate public sign-in availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ authenticated: false });
  });

  it('shows session verification instead of flashing login during OAuth return hydration', async () => {
    let resolveSession!: (value: { authenticated: boolean }) => void;
    mocks.getSession.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveSession = resolve; }));
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);

    expect(screen.getByText('VERIFYING SESSION...')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'CONTINUE WITH GOOGLE' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'CONTINUE WITH EMAIL' })).toBeNull();
    expect(screen.queryByText('Protected workspace')).toBeNull();
    expect(screen.queryByText('SIGN IN TO WORKSPACE')).toBeNull();
    expect(screen.queryByText('OR')).toBeNull();
    expect(screen.queryByText('Protected workspace')).toBeNull();

    await act(async () => { resolveSession({ authenticated: false }); });
    expect(screen.getByRole('button', { name: 'CONTINUE WITH GOOGLE' })).toBeTruthy();
  });

  it('keeps login usable after a failed session check without disclosing session diagnostics', async () => {
    mocks.getSession.mockRejectedValueOnce(new Error('[AUTH_SESSION_UNAVAILABLE] Application authentication service is unavailable.'));
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'CONTINUE WITH GOOGLE' })).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Protected workspace')).toBeNull();
  });

  it('shows a loading screen during revalidation after a verified login', async () => {
    const verified = { authenticated: true, user: { id: 'verified-user', email: 'test@example.test' } };
    mocks.getSession.mockResolvedValueOnce(verified);
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);
    expect(await screen.findByText('Protected workspace')).toBeTruthy();

    let resolveSession!: (value: typeof verified) => void;
    mocks.getSession.mockImplementationOnce(() => new Promise((resolve) => { resolveSession = resolve; }));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(screen.getByText('VERIFYING SESSION...')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'CONTINUE WITH GOOGLE' })).toBeNull();
    expect(screen.queryByText('Protected workspace')).toBeNull();

    await act(async () => { resolveSession(verified); });
    expect(screen.getByText('Protected workspace')).toBeTruthy();
  });

  it('shows email and password on the initial login UI with inline account creation', async () => {
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);
    expect(await screen.findByLabelText('Email Address')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.queryByText('CONTINUE WITH EMAIL')).toBeNull();
    expect(screen.getByRole('button', { name: 'CONTINUE WITH GOOGLE' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'CREATE ACCOUNT' }));
    expect(screen.getByLabelText('Full Name')).toBeTruthy();
    expect(screen.getByLabelText('Email Address')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('submits email credentials through the canonical client and verifies the actual session', async () => {
    const verified = {
      authenticated: true,
      user: { id: 'verified-user', email: 'person@example.test' },
      session: { id: 'opaque-app-session' },
    };
    mocks.getSession.mockResolvedValueOnce({ authenticated: false }).mockResolvedValue(verified);
    mocks.signInWithEmailCredentials.mockResolvedValue(verified);
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);
    fireEvent.change(await screen.findByLabelText('Email Address'), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } });
    const submit = screen.getAllByRole('button', { name: 'SIGN IN' }).at(-1)!;
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.signInWithEmailCredentials).toHaveBeenCalledWith({
      email: 'person@example.test', password: 'correct-password',
    }));
    expect(await screen.findByText('Protected workspace')).toBeTruthy();
    expect(mocks.getSession).toHaveBeenCalledTimes(2);
  });

  it('uses the canonical client for Google sign-in and does not display the Luth second email screen', async () => {
    render(<LuthOidcGate appName="Sample" authenticatedContent={<main>Protected workspace</main>} />);
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUE WITH GOOGLE' }));
    expect(mocks.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('CONTINUE WITH EMAIL')).toBeNull();
  });

  it('never reveals protected content until the session endpoint verifies a user', async () => {
    mocks.getSession.mockResolvedValueOnce({ authenticated: true, user: { id: 'verified-user', email: 'test@example.test' } });
    render(<LuthOidcGate authenticatedContent={<main>Protected workspace</main>} />);
    expect(await screen.findByText('Protected workspace')).toBeTruthy();
  });
});
