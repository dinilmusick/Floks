import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  WorkspaceCreateDialog,
  createKloksWorkspaceStorageService,
  type WorkspaceStorageOption,
} from './WorkspaceCreateDialog.js';

describe('WorkspaceCreateDialog Google Drive integration', () => {
  it('connects through the injected OAuth service and returns the selected Drive folder in the canonical workspace contract', async () => {
    const driveConnection = {
      id: 'drive-auth-1',
      provider: 'google_drive',
      label: 'Drive — artist@example.test',
      googleEmail: 'artist@example.test',
      credentials: {
        accessToken: 'must-not-enter-workspace-payload',
        refreshToken: 'must-not-enter-workspace-payload',
        clientSecret: 'must-not-enter-workspace-payload',
      },
    } as unknown as WorkspaceStorageOption;
    const folder = { id: 'drive-folder-1', name: 'Studio Archive', mimeType: 'application/vnd.google-apps.folder' };
    const connectGoogleDrive = vi.fn().mockResolvedValue(driveConnection);
    const listGoogleDriveFolders = vi.fn().mockResolvedValue([folder]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceCreateDialog
        open
        userId="user-1"
        storageOptions={[{ id: 'local_fs', provider: 'local_fs', label: 'Local Folder' }]}
        storageService={{ connectGoogleDrive, listGoogleDriveFolders }}
        visibility={{ storagePolicy: { providers: ['local_fs', 'google_drive'] } }}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Studio' } });
    fireEvent.change(screen.getByLabelText('Workspace storage'), { target: { value: 'google_drive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google Drive' }));

    await waitFor(() => expect(connectGoogleDrive).toHaveBeenCalledWith('user-1'));
    expect(await screen.findByText('Studio Archive')).toBeInTheDocument();
    expect(listGoogleDriveFolders).toHaveBeenCalledWith('drive-auth-1', undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0];
    expect(input.storageProvider).toBe('google_drive');
    expect(input.storage.provider).toBe('google_drive');
    expect(input.storageConnectionId).toBe('drive-auth-1');
    expect(input.storage.connectionId).toBe('drive-auth-1');
    expect(input.storage.googleEmail).toBe('artist@example.test');
    expect(input.storage.googleRootFolderId).toBe('drive-folder-1');
    expect(input.storage.googleRootFolderName).toBe('Studio Archive');
    expect(input.storageConnection).toMatchObject({
      id: 'drive-auth-1',
      provider: 'google_drive',
    });
    expect(input.storageConnection).not.toHaveProperty('credentials');
    expect(JSON.stringify(input)).not.toContain('must-not-enter-workspace-payload');
    expect(input.storageConnection).not.toHaveProperty('credentials');
    expect(input.storageConnection).not.toHaveProperty('endpoint');
    expect(input.storageConnection).not.toHaveProperty('region');
  });

  it('requires a connected Drive account and selected folder before workspace creation', async () => {
    const onSubmit = vi.fn();

    render(
      <WorkspaceCreateDialog
        open
        storageOptions={[]}
        visibility={{ storagePolicy: { providers: ['google_drive'] } }}
        storageService={{ connectGoogleDrive: vi.fn(), listGoogleDriveFolders: vi.fn() }}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Studio' } });
    fireEvent.change(screen.getByLabelText('Workspace storage'), { target: { value: 'google_drive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/connect google drive and select a folder/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('applies provider and field visibility overrides without replacing the dialog', () => {
    const { container } = render(
      <WorkspaceCreateDialog
        open
        storageOptions={[
          { id: 'local_fs', provider: 'local_fs' },
          { id: 'b2-1', provider: 'backblaze_b2', label: 'Archive bucket' },
        ]}
        visibility={{
          storagePolicy: { providers: ['google_drive'] },
          hiddenFields: ['description', 'localFolderName', 'backblaze', 'canonicalFolderPreview'],
        }}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const storage = screen.getByLabelText('Workspace storage');
    const options = within(storage).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Google Drive');
    expect(screen.getByRole('form', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Workspace description')).not.toBeInTheDocument();
    expect(screen.queryByText('Backblaze B2')).not.toBeInTheDocument();
    expect(screen.queryByText('Canonical Workspace Folder')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('Archive bucket');
  });

  it('can hide a provider without hiding existing local and Backblaze options', () => {
    render(
      <WorkspaceCreateDialog
        open
        storageOptions={[
          { id: 'local_fs', provider: 'local_fs', label: 'Local' },
          { id: 'drive-1', provider: 'google_drive', label: 'Existing Drive' },
          { id: 'b2-1', provider: 'backblaze_b2', label: 'Archive' },
        ]}
        visibility={{ storagePolicy: { providers: ['local_fs', 'google_drive', 'backblaze_b2'] }, hiddenStorageProviders: ['google_drive'] }}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const options = within(screen.getByLabelText('Workspace storage')).getAllByRole('option');
    expect(options.map((option) => option.textContent).join(' ')).toContain('Local');
    expect(options.map((option) => option.textContent).join(' ')).toContain('Backblaze B2');
    expect(options.map((option) => option.textContent).join(' ')).not.toContain('Google Drive');
  });

  it('uses Kloks StorageClientService for canonical connections without application-specific account coupling', async () => {
    const invoke = vi.fn(async (serviceId: string, operation: string) => {
      if (serviceId === 'kloks.service.storage' && operation === 'getConnections') {
        return [
          { id: 'local-1', provider: 'local_fs', label: 'Local Workstation' },
          { id: 'drive-1', provider: 'google_drive', label: 'Google Drive', googleEmail: 'artist@example.test' },
        ];
      }
      return {};
    });
    const connectGoogleDrive = vi.fn().mockResolvedValue({
      id: 'drive-2',
      provider: 'google_drive',
      googleEmail: 'artist@example.test',
    });
    const listGoogleDriveFolders = vi.fn().mockResolvedValue([]);

    const service = createKloksWorkspaceStorageService(
      { invoke },
      { connectGoogleDrive, listGoogleDriveFolders },
    );
    const connections = await service.listStorageConnections?.('user-1');

    expect(invoke).toHaveBeenCalledWith('kloks.service.storage', 'getConnections', {});
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(connections).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'local-1', provider: 'local_fs' }),
      expect.objectContaining({ id: 'drive-1', provider: 'google_drive' }),
    ]));
    await expect(service.connectGoogleDrive?.('user-1')).resolves.toMatchObject({ id: 'drive-2', provider: 'google_drive' });
    await expect(service.listGoogleDriveFolders?.('drive-2')).resolves.toEqual([]);
  });
});
