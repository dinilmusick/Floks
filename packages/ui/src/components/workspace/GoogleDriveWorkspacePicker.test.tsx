import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  GoogleDriveWorkspacePicker,
  describeGoogleDriveError,
  type GoogleDriveConnection,
} from './GoogleDriveWorkspacePicker.js';

const connection: GoogleDriveConnection = {
  id: 'drive-connection-1',
  provider: 'google_drive',
  googleEmail: 'artist@example.test',
};

describe('canonical Google Drive workspace picker', () => {
  it('starts authorization without exposing OAuth credentials or requesting a Google password', async () => {
    const connectGoogleDrive = vi.fn().mockResolvedValue(connection);
    const onConnected = vi.fn();

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connectGoogleDrive={connectGoogleDrive}
        onConnected={onConnected}
        onSelectFolder={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add Google account' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/google password|client secret|client id/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Google account' }));

    await waitFor(() => expect(connectGoogleDrive).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(connection));
  });

  it('reuses a saved Google account without starting OAuth and offers Add account separately', async () => {
    const authorize = vi.fn().mockResolvedValue(undefined);
    const folders = vi.fn().mockResolvedValue([{ id: 'existing-folder', name: 'Existing Folder' }]);
    render(<GoogleDriveWorkspacePicker userId="owner-1" connection={connection}
      connectGoogleDrive={authorize} listGoogleDriveFolders={folders}
      onConnected={() => undefined} onSelectFolder={() => undefined} />);
    expect(await screen.findByText('Existing Folder')).toBeInTheDocument();
    expect(authorize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add Google account' }));
    await waitFor(() => expect(authorize).toHaveBeenCalledWith('owner-1'));
  });

  it('browses the authenticated Drive and returns the selected folder', async () => {
    const listGoogleDriveFolders = vi.fn().mockResolvedValue([
      { id: 'folder-shared', name: 'Shared Projects', mimeType: 'application/vnd.google-apps.folder' },
    ]);
    const onSelectFolder = vi.fn();

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connection={connection}
        listGoogleDriveFolders={listGoogleDriveFolders}
        onConnected={() => undefined}
        onSelectFolder={onSelectFolder}
      />,
    );

    expect(await screen.findByText('Shared Projects')).toBeInTheDocument();
    expect(listGoogleDriveFolders).toHaveBeenCalledWith(connection.id, undefined, 'user-1');
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelectFolder).toHaveBeenCalledWith({
      id: 'folder-shared',
      name: 'Shared Projects',
      mimeType: 'application/vnd.google-apps.folder',
    });
  });

  it('handles nested folder browsing and parent navigation', async () => {
    const listGoogleDriveFolders = vi.fn()
      .mockResolvedValueOnce([{ id: 'folder-parent', name: 'Projects' }])
      .mockResolvedValueOnce([{ id: 'folder-child', name: 'Current Project' }])
      .mockResolvedValueOnce([{ id: 'folder-parent', name: 'Projects' }]);

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connection={connection}
        listGoogleDriveFolders={listGoogleDriveFolders}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Current Project')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Projects')).toBeInTheDocument();
    expect(listGoogleDriveFolders).toHaveBeenNthCalledWith(2, connection.id, 'folder-parent', 'user-1');
    expect(listGoogleDriveFolders).toHaveBeenNthCalledWith(3, connection.id, undefined, 'user-1');
  });

  it('represents authorization cancellation without treating it as an unexpected failure', async () => {
    const connectGoogleDrive = vi.fn().mockRejectedValue({ code: 'GOOGLE_DRIVE_CANCELLED' });

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connectGoogleDrive={connectGoogleDrive}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Google account' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/cancelled or declined/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('represents authorization failures and expired access clearly', async () => {
    const connectGoogleDrive = vi.fn().mockRejectedValue(new Error('OAuth exchange failed'));

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connectGoogleDrive={connectGoogleDrive}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Google account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('OAuth exchange failed');
    expect(describeGoogleDriveError({ status: 401 })).toMatch(/authorization has expired/i);
    expect(describeGoogleDriveError({ status: 403 })).toMatch(/access was not granted/i);
    expect(describeGoogleDriveError({ code: 'SERVICE_UNAVAILABLE' })).toMatch(/currently unavailable/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_TOKEN_EXCHANGE_FAILED' })).toMatch(/rejected the Drive authorization exchange/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_PROFILE_FAILED' })).toMatch(/Google Drive API/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_PERSIST_FAILED' })).toMatch(/connection could not be stored/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_CREDENTIALS_MISSING' })).toMatch(/Reconnect your Google account/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_CREDENTIALS_INVALID' })).toMatch(/Reconnect your Google account/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_RECONNECT_REQUIRED' })).toMatch(/Reconnect your Google account/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_CONNECTION_NOT_FOUND' })).toMatch(/Reconnect your Google account/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_IDENTITY_MISMATCH' })).toMatch(/different account/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_HTTP_401' })).toMatch(/authorization has expired/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_HTTP_403' })).toMatch(/access was not granted/i);
    expect(describeGoogleDriveError({ code: 'GOOGLE_DRIVE_HTTP_403', reason: 'accessNotConfigured' })).toMatch(/Enable the Google Drive API/i);
  });

  it('shows the backend availability reason when Drive authorization is disabled', () => {
    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
        availabilityReason="[STORAGE_PROVIDER_CONFIGURATION_MISSING] Google Drive OAuth system configuration is incomplete: client secret."
      />,
    );

    const button = screen.getByRole('button', { name: 'Google Drive authorization unavailable' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(/STORAGE_PROVIDER_CONFIGURATION_MISSING/);
    expect(screen.getByRole('note')).toHaveTextContent(/client secret/);
  });

  it('omits the availability note when no reason is supplied', () => {
    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Google Drive authorization unavailable' })).toBeDisabled();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('surfaces authenticated Drive access errors from folder browsing', async () => {
    const listGoogleDriveFolders = vi.fn().mockRejectedValue({ status: 401 });

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connection={connection}
        listGoogleDriveFolders={listGoogleDriveFolders}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/authorization has expired/i);
  });

  it('does not claim a connection exists when the authorization callback returns no connection id', async () => {
    const connectGoogleDrive = vi.fn().mockResolvedValue({ id: 'google_drive', provider: 'google_drive' });

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connectGoogleDrive={connectGoogleDrive as any}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Google account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid connection/i);
  });

  it('represents an aborted folder browse as a clear cancellation and allows an immediate retry', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    const listGoogleDriveFolders = vi.fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce([{ id: 'folder-retry', name: 'Recovered Projects' }]);

    render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connection={connection}
        listGoogleDriveFolders={listGoogleDriveFolders}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/cancelled or declined/i);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Recovered Projects')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('fences stale folder responses so a superseded request cannot clobber the current one', async () => {
    let resolveFirst: (items: { id: string; name: string }[]) => void = () => undefined;
    const listGoogleDriveFolders = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ id: 'folder-new', name: 'Latest Folder' }]);

    const { rerender } = render(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connection={connection}
        listGoogleDriveFolders={listGoogleDriveFolders}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );

    expect(await screen.findByText(/loading google drive folders/i)).toBeInTheDocument();
    rerender(
      <GoogleDriveWorkspacePicker
        userId="user-1"
        connection={{ ...connection, id: 'drive-connection-2' }}
        listGoogleDriveFolders={listGoogleDriveFolders}
        onConnected={() => undefined}
        onSelectFolder={() => undefined}
      />,
    );
    expect(await screen.findByText('Latest Folder')).toBeInTheDocument();

    resolveFirst([{ id: 'folder-stale', name: 'Stale Folder' }]);
    await waitFor(() => expect(screen.queryByText('Stale Folder')).not.toBeInTheDocument());
    expect(screen.getByText('Latest Folder')).toBeInTheDocument();
  });
});
