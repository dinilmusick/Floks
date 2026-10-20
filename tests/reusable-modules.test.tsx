import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  AuthPage,
  authPageDefinition,
  TilesMenu,
  tilesMenuDefinition,
  WorkspaceTilesMenu,
  workspaceTilesMenuDefinition,
  WorkspaceCreateDialog,
  GraphsMenu,
} from '../packages/ui/src/index.js';
import { floksFrnlStore } from '../packages/ui/src/frnl/store.js';

afterEach(() => cleanup());

describe('reusable application modules', () => {
  it('defines FRNL state/events for auth and menus', () => {
    expect(authPageDefinition.states.idle.events.login.functionId).toBe('AuthPage.idle.login');
    expect(tilesMenuDefinition.states.idle.events.select.functionId).toBe('tilesMenu.idle.select');
    expect(workspaceTilesMenuDefinition.states.idle.events.create.functionId).toBe('workspaceTilesMenu.idle.create');
    expect(authPageDefinition.states.loading.phases.sustainPhase).toBeDefined();
    expect(workspaceTilesMenuDefinition.states.loading.phases.sustainPhase).toBeDefined();
  });

  it('registers AuthPage in the FRNL store and invokes the supplied auth service', async () => {
    let loginCalled = false;
    render(
      <AuthPage
        onLogin={async () => { loginCalled = true; return { success: true }; }}
        onRegister={async () => ({ success: true })}
      />,
    );
    expect(Object.keys(floksFrnlStore.getState().entities).some((id) => id.startsWith('AuthPage.'))).toBe(true);
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loginCalled).toBe(true);
  });

  it('uses TilesMenu as the base interaction surface', () => {
    let selected = '';
    render(
      <TilesMenu
        title="Tiles"
        tiles={[{ id: 'one', title: 'One', description: 'First' }]}
        onSelect={(tile) => { selected = tile.id; }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /one/i }));
    expect(selected).toBe('one');
  });

  it('loads SRKL accounts then buckets in the workspace creation dialog', async () => {
    const calls: string[] = [];
    const storageService = {
      listBackblazeAccounts: async (userId: string) => { calls.push('accounts:' + userId); return [{ id: 'acct-1', name: 'SRKL B2' }]; },
      listBackblazeBuckets: async (accountId: string) => { calls.push('buckets:' + accountId); return [{ bucketId: 'b1', bucketName: 'workspace-bucket' }]; },
    };
    render(
      <WorkspaceCreateDialog
        open
        userId="user-1"
        storageService={storageService}
        onClose={() => {}}
        onSubmit={async () => {}}
      />,
    );
    expect(await screen.findByText('SRKL B2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Backblaze account'), { target: { value: 'acct-1' } });
    expect(await screen.findByText('workspace-bucket')).toBeInTheDocument();
    expect(calls).toEqual(['accounts:user-1', 'buckets:acct-1']);
  });

  it('renders the workspace menu with the reusable creation flow', () => {
    const storageService = {
      listBackblazeAccounts: async () => [],
      listBackblazeBuckets: async () => [],
    };
    render(
      <WorkspaceTilesMenu
        workspaces={[{ id: 'ws1', title: 'Docs', storageProvider: 'local_fs' }]}
        userId="user-1"
        storageService={storageService}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={async () => {}}
      />,
    );
    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /docs/i })).toBeInTheDocument();
  });

  it('renders an empty reusable graphs menu without requiring a domain implementation', () => {
    render(<GraphsMenu graphs={[]} onSelectGraph={() => {}} />);
    expect(screen.getByText('Graphs')).toBeInTheDocument();
    expect(screen.getByText('No tiles found.')).toBeInTheDocument();
  });
});
