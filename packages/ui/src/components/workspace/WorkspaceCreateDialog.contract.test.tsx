import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  WorkspaceCreateDialog,
  buildWorkspaceCreateInput,
  formatWorkspaceFolderPreview,
} from './WorkspaceCreateDialog.js';

describe('canonical Floks workspace creation', () => {
  it('renders the shared fields and the storage providers connected to the account', () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceCreateDialog, {
        open: true,
        appName: 'DocuStack',
        currentUser: { id: 'user-1', email: 'user@example.test', username: 'user' },
        storageOptions: [
          { id: 'drive-1', provider: 'google_drive' as const, label: 'Google Drive — user@example.test' },
          { id: 'b2-1', provider: 'backblaze_b2', label: 'Production Bucket' },
        ],
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    );

    expect(markup).toContain('Create Workspace');
    expect(markup).toContain('Workspace Name');
    expect(markup).toContain('Description');
    expect(markup).toContain('Persistent Storage');
    expect(markup).toContain('Google Drive');
    expect(markup).toContain('Backblaze B2');
    expect(markup).toContain('Canonical Workspace Folder');
  });

  it('maps a selected Drive connection into the canonical workspace creation contract', () => {
    const connection = {
      id: 'drive-1',
      provider: 'google_drive',
      label: 'My Drive',
      googleEmail: 'user@example.test',
      googleRootFolderId: 'folder-1',
      googleRootFolderName: 'Workspace root',
    };
    const input = buildWorkspaceCreateInput('Research', 'Research notes', connection);

    expect(input.storageProvider).toBe('google_drive');
    expect(input.storageConnectionId).toBe('drive-1');
    expect(input.storage.googleRootFolderId).toBe('folder-1');
    expect(input.storageConnection?.id).toBe('drive-1');
  });

  it('generates the same deterministic folder preview for every app using the component', () => {
    expect(formatWorkspaceFolderPreview('DocuStack', 'Dinil James', 'Research Lab'))
      .toBe('ultrst_docustack_dinil_james_research_lab');
  });
  it('renders the default Skipo provider policy from the canonical provider dropdown', () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceCreateDialog, {
        open: true,
        appName: 'Skipo',
        storageOptions: [],
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    );

    expect(markup).toContain('Local Folder');
    expect(markup).toContain('Connect Google Drive');
    expect(markup).toContain('Backblaze B2');
    expect(markup).not.toContain('Manage');
    expect(markup).not.toContain('Add Storage');
  });

  it('respects an application provider policy without rendering Local Directory for SRKL', () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceCreateDialog, {
        open: true,
        appName: 'SRKL',
        storageOptions: [],
        visibility: { storagePolicy: { providers: ['google_drive', 'backblaze_b2'] } },
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    );

    expect(markup).toContain('Connect Google Drive');
    expect(markup).toContain('Backblaze B2');
    expect(markup).not.toContain('Local Folder');
    expect(markup).not.toContain('Manage');
    expect(markup).not.toContain('Add Storage');
  });

});
