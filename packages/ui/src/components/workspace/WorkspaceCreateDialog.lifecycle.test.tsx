import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkspaceCreateDialog, type WorkspaceStorageService } from './WorkspaceCreateDialog.js';
import { WorkspaceTilesMenu } from './WorkspaceTilesMenu.js';
import { GoogleDriveWorkspacePicker, describeGoogleDriveError } from './GoogleDriveWorkspacePicker.js';

const capabilities = [{
  id: 'google_drive' as const,
  displayName: 'Google Drive',
  enabled: true,
  canSelectExistingConnection: true,
  canCreateConnection: true,
  requiredConfigurationFields: [],
  authorizationMode: 'oauth2',
  discoveryCapabilities: { accounts: true, buckets: false, folders: true },
}];

const drive = (id: string) => ({
  id, provider: 'google_drive' as const, label: id, googleEmail: id + '@example.test',
});

function options() {
  return [{ id: 'local_fs', provider: 'local_fs' as const }, drive('drive-a'), drive('drive-b')];
}

describe('workspace connection lifecycle and isolation', () => {
  it('verifies one account once despite unstable storageService props and connected option enrichment', async () => {
    const identity = vi.fn().mockResolvedValue({ accountId: 'google-subject', email: 'a@example.test' });
    const folders = vi.fn().mockResolvedValue([{ id: 'folder-a', name: 'Folder A' }]);
    const props = {
      open: true, userId: 'user-a',
      storageOptions: [drive('drive-a')],
      visibility: { storagePolicy: { providers: ['google_drive' as const] } },
      onClose: vi.fn(), onSubmit: vi.fn(),
    };
    const { rerender } = render(<WorkspaceCreateDialog {...props} storageService={{
      getGoogleDriveAccountIdentity: identity, listGoogleDriveFolders: folders,
    }} />);
    expect(await screen.findByText('Folder A')).toBeInTheDocument();
    await waitFor(() => expect(identity).toHaveBeenCalledTimes(1));
    rerender(<WorkspaceCreateDialog {...props} storageOptions={[drive('drive-a')]}
      storageService={{ getGoogleDriveAccountIdentity: identity, listGoogleDriveFolders: folders }} />);
    await waitFor(() => expect(identity).toHaveBeenCalledTimes(1));
    expect(folders).toHaveBeenCalledTimes(1);
  });

  it('allows multiple Google accounts and new-account authorization while preserving independent workspace folders', async () => {
    const identity = vi.fn().mockImplementation(async (_user: string, id: string) => ({ accountId: id, email: id + '@example.test' }));
    const folders = vi.fn().mockImplementation(async (id: string) => [{
      id: id === 'drive-a' ? 'folder-a' : 'folder-b',
      name: id === 'drive-a' ? 'Folder A' : 'Folder B',
    }]);
    const updateSharedRoot = vi.fn();
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<WorkspaceCreateDialog open userId="user-a" storageOptions={options()}
      storageService={{ getGoogleDriveAccountIdentity: identity, listGoogleDriveFolders: folders,
        selectGoogleDriveRootFolder: updateSharedRoot }}
      visibility={{ storagePolicy: { providers: ['google_drive'] } }}
      onClose={() => undefined} onSubmit={submit} />);

    const storage = screen.getByLabelText('Workspace storage');
    expect(within(storage).getAllByRole('option')).toHaveLength(2);
    fireEvent.change(storage, { target: { value: 'drive-a' } });
    await screen.findByText('Folder A');
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByText(/Selected workspace root:/)).toHaveTextContent('Folder A');

    fireEvent.change(storage, { target: { value: 'drive-b' } });
    expect(await screen.findByText('Folder B')).toBeInTheDocument();
    expect(screen.queryByText(/Selected workspace root:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Second Workspace' } });
    await waitFor(() => expect(identity).toHaveBeenCalledWith('user-a', 'drive-b'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0][0].storage).toMatchObject({
      provider: 'google_drive', connectionId: 'drive-b',
      googleRootFolderId: 'folder-b', googleRootFolderName: 'Folder B',
    });
    expect(updateSharedRoot).not.toHaveBeenCalled();
  });

  it('offers Connect Google Drive with already-connected accounts when broker authorization is enabled', async () => {
    render(<WorkspaceCreateDialog open userId="user-a" storageOptions={[drive('drive-a'), drive('drive-b')]}
      storageService={{ listStorageProviderCapabilities: vi.fn().mockResolvedValue(capabilities) }}
      visibility={{ storagePolicy: { providers: ['google_drive'] } }}
      onClose={() => undefined} onSubmit={() => undefined} />);
    expect(await screen.findByRole('option', { name: /Connect Google Drive/ })).toBeInTheDocument();
    const storage = screen.getByLabelText('Workspace storage');
    fireEvent.change(storage, { target: { value: 'google_drive' } });
    expect(screen.getByRole('button', { name: /Google Drive authorization unavailable/i })).toBeDisabled();
  });

  it('refreshes the canonical owner connection list and restores only the returned opaque connection ID', async () => {
    const listConnections = vi.fn().mockResolvedValue([drive('drive-a'), drive('drive-b')]);
    const service: WorkspaceStorageService = {
      listStorageConnections: listConnections,
      getGoogleDriveAccountIdentity: vi.fn().mockResolvedValue({ accountId: 'subject-b' }),
      listGoogleDriveFolders: vi.fn().mockResolvedValue([{ id: 'folder-b', name: 'Folder B' }]),
    };
    render(<WorkspaceCreateDialog open userId="user-a" storageOptions={[drive('stale-drive')]}
      googleDriveConnectionId="drive-b" storageService={service}
      visibility={{ storagePolicy: { providers: ['google_drive'] } }}
      onClose={() => undefined} onSubmit={() => undefined} />);
    await waitFor(() => expect(listConnections).toHaveBeenCalledWith('user-a'));
    await waitFor(() => expect((screen.getByLabelText('Workspace storage') as HTMLSelectElement).value).toBe('drive-b'));
    expect(within(screen.getByLabelText('Workspace storage')).queryByRole('option', { name: /stale-drive/ })).not.toBeInTheDocument();
    expect(await screen.findByText('Folder B')).toBeInTheDocument();
  });

  it('rejects cross-user callback connections and stale user-scoped storage after principal change', async () => {
    const listConnections = vi.fn().mockImplementation(async (userId: string) =>
      userId === 'user-a' ? [drive('drive-a')] : [drive('drive-b')]);
    const identity = vi.fn().mockResolvedValue({ accountId: 'subject' });
    const props = {
      open: true, googleDriveConnectionId: 'drive-a',
      storageService: { listStorageConnections: listConnections, getGoogleDriveAccountIdentity: identity },
      visibility: { storagePolicy: { providers: ['google_drive' as const] } },
      onClose: vi.fn(), onSubmit: vi.fn(),
    };
    const { rerender } = render(<WorkspaceCreateDialog {...props} userId="user-a" />);
    await waitFor(() => expect((screen.getByLabelText('Workspace storage') as HTMLSelectElement).value).toBe('drive-a'));
    rerender(<WorkspaceCreateDialog {...props} userId="user-b" />);
    await waitFor(() => expect(listConnections).toHaveBeenCalledWith('user-b'));
    await waitFor(() => expect(screen.getAllByRole('alert').some((alert) =>
      /could not be restored for this account/i.test(alert.textContent || ''))).toBe(true));
    expect(within(screen.getByLabelText('Workspace storage')).queryByRole('option', { name: 'drive-a' })).not.toBeInTheDocument();
    expect(identity).not.toHaveBeenCalledWith('user-b', 'drive-a');
  });

  it('restores connection after a component remount without persisting any OAuth credential in Floks', async () => {
    const service: WorkspaceStorageService = {
      listStorageConnections: vi.fn().mockResolvedValue([drive('drive-b')]),
      getGoogleDriveAccountIdentity: vi.fn().mockResolvedValue({ accountId: 'subject-b' }),
      listGoogleDriveFolders: vi.fn().mockResolvedValue([{ id: 'folder-b', name: 'Folder B' }]),
    };
    const props = {
      open: true, userId: 'user-a', googleDriveConnectionId: 'drive-b',
      storageService: service, visibility: { storagePolicy: { providers: ['google_drive' as const] } },
      onClose: vi.fn(), onSubmit: vi.fn(),
    };
    const first = render(<WorkspaceCreateDialog {...props} />);
    expect(await screen.findByText('Folder B')).toBeInTheDocument();
    first.unmount();
    render(<WorkspaceCreateDialog {...props} />);
    expect(await screen.findByText('Folder B')).toBeInTheDocument();
    expect(service.listStorageConnections).toHaveBeenCalledTimes(2);
  });

  it('restores browser callback without destroying unrelated URL parameters or fragments', async () => {
    window.history.replaceState(null, '', '/workspaces?view=tiles&googleDriveConnected=1&googleDriveConnectionId=drive-b#panel');
    try {
      render(<WorkspaceTilesMenu workspaces={[]} userId="user-a" appName="App"
        storageService={{
          listStorageConnections: vi.fn().mockResolvedValue([drive('drive-b')]),
          getGoogleDriveAccountIdentity: vi.fn().mockResolvedValue({ accountId: 'subject-b' }),
          listGoogleDriveFolders: vi.fn().mockResolvedValue([]),
        }}
        visibility={{ storagePolicy: { providers: ['google_drive'] } }}
        onSelectWorkspace={() => undefined} onCreateWorkspace={() => undefined} />);
      await waitFor(() => expect(screen.getByRole('form', { name: 'Create workspace' })).toBeInTheDocument());
      await waitFor(() => expect((screen.getByLabelText('Workspace storage') as HTMLSelectElement).value).toBe('drive-b'));
      expect(window.location.search).toBe('?view=tiles');
      expect(window.location.hash).toBe('#panel');
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  it('preserves callback authorization errors and differentiates cancellation, revocation, expiry and retry', () => {
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_CANCELLED' })).toMatch(/cancelled/i);
    expect(describeGoogleDriveError({ code: 'INVALID_GRANT' })).toMatch(/revoked/i);
    expect(describeGoogleDriveError({ status: 401 })).toMatch(/expired/i);
    expect(describeGoogleDriveError({ code: 'SERVICE_UNAVAILABLE' })).toMatch(/unavailable/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_MISSING_CONNECTION' })).toMatch(/Retry authorization/i);
  });

  it('drops stale folder results when the user or account changes', async () => {
    let resolveOld!: (folders: { id: string; name: string }[]) => void;
    const oldRequest = new Promise<{ id: string; name: string }[]>((resolve) => { resolveOld = resolve; });
    const folders = vi.fn().mockImplementation((id: string) =>
      id === 'drive-a' ? oldRequest : Promise.resolve([{ id: 'new-folder', name: 'New Folder' }]));
    const onSelect = vi.fn();
    const { rerender } = render(<GoogleDriveWorkspacePicker userId="user-a"
      connection={drive('drive-a')} listGoogleDriveFolders={folders}
      onConnected={() => undefined} onSelectFolder={onSelect} />);
    rerender(<GoogleDriveWorkspacePicker userId="user-b" connection={drive('drive-b')}
      listGoogleDriveFolders={folders} onConnected={() => undefined} onSelectFolder={onSelect} />);
    expect(await screen.findByText('New Folder')).toBeInTheDocument();
    resolveOld([{ id: 'old-folder', name: 'Old Folder' }]);
    await waitFor(() => expect(screen.queryByText('Old Folder')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelect).toHaveBeenCalledWith({ id: 'new-folder', name: 'New Folder' });
  });

  it('keeps denied provider policy separate from the connection list', () => {
    render(<WorkspaceCreateDialog open userId="user-a" storageOptions={options()}
      visibility={{ storagePolicy: { providers: ['local_fs', 'backblaze_b2'] } }}
      onClose={() => undefined} onSubmit={() => undefined} />);
    const values = within(screen.getByLabelText('Workspace storage')).getAllByRole('option')
      .map((node) => (node as HTMLOptionElement).value);
    expect(values).toContain('local_fs');
    expect(values).not.toContain('drive-a');
    expect(values).not.toContain('drive-b');
    expect(values).not.toContain('google_drive');
  });
});
