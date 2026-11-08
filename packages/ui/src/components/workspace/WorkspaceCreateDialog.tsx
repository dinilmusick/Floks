import React, { useEffect, useMemo, useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import {
  GoogleDriveWorkspacePicker,
  type GoogleDriveConnection,
  type GoogleDriveFolder,
} from './GoogleDriveWorkspacePicker.js';

export type WorkspaceStorageProvider =
  | 'local_fs'
  | 'backblaze_b2'
  | 'google_drive'
  | 'cloudflare_r2'
  | 'aws_s3'
  | 'supabase_storage'
  | (string & {});

export interface BackblazeBucket {
  id?: string;
  bucketId?: string;
  name?: string;
  bucketName?: string;
}

export interface BackblazeAccount {
  id: string;
  name: string;
  provider?: string;
  credentials?: { region?: string; endpoint?: string; [key: string]: unknown };
}

export interface WorkspaceStorageOption {
  id: string;
  provider: WorkspaceStorageProvider;
  label?: string;
  name?: string;
  role?: 'primary' | 'redundant_clone';
  enabled?: boolean;
  localFolderName?: string;
  localFolderKey?: string;
  localFolderPathHint?: string;
  bucketName?: string;
  b2BucketName?: string;
  b2Endpoint?: string;
  b2Region?: string;
  endpoint?: string;
  region?: string;
  googleEmail?: string;
  googleRootFolderId?: string;
  googleRootFolderName?: string;
  credentials?: Record<string, unknown>;
}

export interface WorkspaceStorageSelection {
  provider: WorkspaceStorageProvider;
  connectionId?: string;
  localFolderName?: string;
  localFolderKey?: string;
  b2BucketName?: string;
  b2Endpoint?: string;
  b2Region?: string;
  googleEmail?: string;
  googleRootFolderId?: string;
  googleRootFolderName?: string;
}

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
  storage: WorkspaceStorageSelection;
  storageProvider: WorkspaceStorageProvider;
  storageConnectionId?: string;
  localFolderName?: string;
  localFolderKey?: string;
  b2BucketName?: string;
  b2Endpoint?: string;
  b2Region?: string;
  googleEmail?: string;
  googleRootFolderId?: string;
  googleRootFolderName?: string;
  storageConnection?: WorkspaceStorageOption;
}

export interface WorkspaceStorageService {
  listStorageConnections?: (userId: string) => Promise<WorkspaceStorageOption[]>;
  listBackblazeAccounts?: (userId: string) => Promise<BackblazeAccount[]>;
  listBackblazeBuckets?: (accountId: string, userId?: string) => Promise<BackblazeBucket[]>;
  connectGoogleDrive?: (userId: string) => Promise<WorkspaceStorageOption>;
  listGoogleDriveFolders?: (connectionId: string, parentFolderId?: string) => Promise<GoogleDriveFolder[]>;
}

export type WorkspaceCreateDialogHiddenField =
  | 'description'
  | 'localFolderName'
  | 'manageStorage'
  | 'backblaze'
  | 'canonicalFolderPreview';

export interface WorkspaceCreateDialogVisibility {
  /** Whitelist of storage providers to render. Unspecified means all providers. */
  availableStorageProviders?: WorkspaceStorageProvider[];
  /** Providers hidden even when included in availableStorageProviders. */
  hiddenStorageProviders?: WorkspaceStorageProvider[];
  /** Optional generic fields/sections to hide from the shared dialog. */
  hiddenFields?: WorkspaceCreateDialogHiddenField[];
}

export interface WorkspaceCreateDialogProps {
  open: boolean;
  userId?: string;
  currentUser?: { id: string; email?: string; name?: string; username?: string } | null;
  appName?: string;
  storageOptions?: WorkspaceStorageOption[];
  storageService?: WorkspaceStorageService;
  visibility?: WorkspaceCreateDialogVisibility;
  onManageStorage?: () => void;
  onClose: () => void;
  onSubmit: (input: WorkspaceCreateInput) => Promise<void> | void;
}

const LOCAL_STORAGE_OPTION: WorkspaceStorageOption = {
  id: 'local_fs',
  provider: 'local_fs',
  label: 'Local Folder',
};

const PROVIDER_LABELS: Record<string, string> = {
  local_fs: 'Local Folder',
  backblaze_b2: 'Backblaze B2',
  google_drive: 'Google Drive',
  cloudflare_r2: 'Cloudflare R2',
  aws_s3: 'Amazon S3',
  supabase_storage: 'Supabase Storage',
};

function providerLabel(option: WorkspaceStorageOption): string {
  return PROVIDER_LABELS[option.provider] || option.provider.replace(/[_-]+/g, ' ');
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'workspace';
}

export function formatWorkspaceFolderPreview(appName: string, userName: string, workspaceName: string): string {
  return 'ultrst_' + slug(appName) + '_' + slug(userName) + '_' + slug(workspaceName);
}

export function buildWorkspaceCreateInput(
  name: string,
  description: string,
  option: WorkspaceStorageOption,
): WorkspaceCreateInput {
  const provider = option.provider || 'local_fs';
  const connectionId = option.id && option.id !== 'local_fs' ? option.id : undefined;
  const localFolderName = provider === 'local_fs'
    ? (option.localFolderName || name.trim())
    : undefined;
  const b2BucketName = option.b2BucketName || option.bucketName;
  const b2Endpoint = option.b2Endpoint || option.endpoint;
  const b2Region = option.b2Region || option.region;
  const storage: WorkspaceStorageSelection = {
    provider,
    connectionId,
    localFolderName,
    localFolderKey: provider === 'local_fs' ? option.localFolderKey : undefined,
    b2BucketName,
    b2Endpoint,
    b2Region,
    googleEmail: option.googleEmail,
    googleRootFolderId: option.googleRootFolderId,
    googleRootFolderName: option.googleRootFolderName,
  };

  const storageConnection = !connectionId
    ? undefined
    : provider === 'google_drive'
      ? {
          id: option.id,
          provider,
          label: option.label,
          name: option.name,
          role: option.role,
          enabled: option.enabled,
          googleEmail: option.googleEmail,
          googleRootFolderId: option.googleRootFolderId,
          googleRootFolderName: option.googleRootFolderName,
        }
      : option;

  return {
    name: name.trim(),
    description: description.trim() || undefined,
    storage,
    storageProvider: provider,
    storageConnectionId: connectionId,
    localFolderName,
    localFolderKey: storage.localFolderKey,
    b2BucketName,
    b2Endpoint,
    b2Region,
    googleEmail: option.googleEmail,
    googleRootFolderId: option.googleRootFolderId,
    googleRootFolderName: option.googleRootFolderName,
    storageConnection,
  };
}

async function fetchStorageConnections(userId: string): Promise<WorkspaceStorageOption[]> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'X-User-Id': userId });
  for (const endpoint of ['/api/auth/storage/connections', '/api/storage/connections']) {
    try {
      const response = await fetch(endpoint, { headers, credentials: 'include' });
      if (!response.ok) continue;
      const data = await response.json();
      const connections = Array.isArray(data?.connections)
        ? data.connections
        : Array.isArray(data?.storage_connections)
          ? data.storage_connections
          : [];
      if (connections.length > 0) {
        return connections.filter((item: any) => item && typeof item.id === 'string' && typeof item.provider === 'string');
      }
    } catch {
      // Try the other canonical app route before reporting an empty list.
    }
  }
  return [];
}

async function fetchBackblazeAccounts(userId: string): Promise<BackblazeAccount[]> {
  try {
    const response = await fetch('/api/srkl/accounts?service=backblaze&userId=' + encodeURIComponent(userId));
    const data = await response.json().catch(() => ({}));
    return Array.isArray(data?.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

async function fetchBackblazeBuckets(accountId: string, userId?: string): Promise<BackblazeBucket[]> {
  try {
    const response = await fetch('/api/srkl/backblaze/buckets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, userId }),
    });
    const data = await response.json().catch(() => ({}));
    return Array.isArray(data?.buckets) ? data.buckets : [];
  } catch {
    return [];
  }
}

async function fetchDefaultStorageOptions(userId: string): Promise<WorkspaceStorageOption[]> {
  const stored = await fetchStorageConnections(userId);
  if (stored.length > 0) return stored;
  // SRKL remains the legacy Backblaze account source only. Google Drive authorization
  // and user Drive data must never be discovered through SRKL account credentials.
  const backblaze = await fetchBackblazeAccounts(userId);
  return backblaze.map((account: any) => {
    const credentials = account.credentials || {};
    const value = (key: string, alternate?: string) => {
      const item = credentials[key] ?? (alternate ? credentials[alternate] : undefined);
      return typeof item === 'string' && item.length > 0 ? item : undefined;
    };
    return {
      id: String(account.id),
      provider: String(account.provider || account.serviceId || 'backblaze_b2') as WorkspaceStorageProvider,
      label: String(account.label || account.name || account.id),
      b2BucketName: value('bucketName', 'b2BucketName'),
      b2Endpoint: value('endpoint', 'b2Endpoint'),
      b2Region: value('region', 'b2Region'),
    };
  });
}

export const defaultWorkspaceStorageService: WorkspaceStorageService = {
  listStorageConnections: fetchDefaultStorageOptions,
  listBackblazeAccounts: fetchBackblazeAccounts,
  listBackblazeBuckets: fetchBackblazeBuckets,
};

export interface KloksServiceInvoker {
  invoke: (serviceId: string, operation: string, input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Drive operations are intentionally supplied by the canonical Kloks storage
 * service. Floks does not implement OAuth, exchange codes, or store Drive tokens.
 */
export interface KloksGoogleDriveWorkspaceApi {
  connectGoogleDrive: (userId: string) => Promise<WorkspaceStorageOption>;
  listGoogleDriveFolders: (connectionId: string, parentFolderId?: string) => Promise<GoogleDriveFolder[]>;
}

export function createKloksWorkspaceStorageService(
  invoker: KloksServiceInvoker,
  googleDrive?: KloksGoogleDriveWorkspaceApi,
): WorkspaceStorageService {
  const listSrklAccounts = async (userId: string, service?: string): Promise<BackblazeAccount[]> => {
    const result = await invoker.invoke('srkl', 'getAccounts', { userId, service });
    return Array.isArray((result as any)?.accounts) ? (result as any).accounts : [];
  };

  const mapStorageConnection = (connection: any): WorkspaceStorageOption | null => {
    if (!connection || typeof connection.id !== 'string' || typeof connection.provider !== 'string') return null;
    return {
      id: connection.id,
      provider: connection.provider as WorkspaceStorageProvider,
      label: String(connection.label || connection.name || connection.id),
      role: connection.role,
      enabled: connection.enabled,
      localFolderName: connection.localFolderName,
      localFolderKey: connection.localFolderKey,
      localFolderPathHint: connection.localFolderPathHint,
      b2BucketName: connection.b2BucketName,
      b2Endpoint: connection.b2Endpoint,
      b2Region: connection.b2Region,
      googleEmail: connection.googleEmail,
      googleRootFolderId: connection.googleRootFolderId,
      googleRootFolderName: connection.googleRootFolderName,
    };
  };

  return {
    listStorageConnections: async (userId) => {
      const [kloksResult, backblazeAccounts] = await Promise.all([
        invoker.invoke('kloks.service.storage', 'getConnections', {}),
        listSrklAccounts(userId, 'backblaze'),
      ]);
      const storedConnections = Array.isArray(kloksResult)
        ? kloksResult
        : Array.isArray((kloksResult as any)?.connections)
          ? (kloksResult as any).connections
          : [];
      const canonical = storedConnections.map(mapStorageConnection).filter((item): item is WorkspaceStorageOption => Boolean(item));
      const backblaze = backblazeAccounts.map((account: any) => {
        const credentials = (account.credentials || {}) as Record<string, unknown>;
        const value = (key: string, alternate?: string) => {
          const item = credentials[key] ?? (alternate ? credentials[alternate] : undefined);
          return typeof item === 'string' && item.length > 0 ? item : undefined;
        };
        return {
          id: String(account.id),
          provider: 'backblaze_b2' as const,
          label: String(account.name || account.label || account.id),
          b2BucketName: value('bucketName', 'b2BucketName'),
          b2Endpoint: value('endpoint', 'b2Endpoint'),
          b2Region: value('region', 'b2Region'),
        };
      });
      const seen = new Set(canonical.map((item) => item.id));
      return [...canonical, ...backblaze.filter((item) => !seen.has(item.id))];
    },
    listBackblazeAccounts: (userId) => listSrklAccounts(userId, 'backblaze'),
    listBackblazeBuckets: async (accountId, userId) => {
      const result = await invoker.invoke('srkl', 'listBackblazeBuckets', { accountId, userId });
      return Array.isArray((result as any)?.buckets) ? (result as any).buckets : [];
    },
    ...(googleDrive
      ? {
          connectGoogleDrive: googleDrive.connectGoogleDrive,
          listGoogleDriveFolders: googleDrive.listGoogleDriveFolders,
        }
      : {}),
  };
}

export function WorkspaceCreateDialog({
  open,
  userId = 'system',
  currentUser,
  appName = 'app',
  storageOptions,
  storageService = defaultWorkspaceStorageService,
  visibility,
  onManageStorage,
  onClose,
  onSubmit,
}: WorkspaceCreateDialogProps) {
  const [loadedOptions, setLoadedOptions] = useState<WorkspaceStorageOption[]>([]);
  const [connectedDriveOption, setConnectedDriveOption] = useState<WorkspaceStorageOption | null>(null);
  const [googleDriveFolder, setGoogleDriveFolder] = useState<GoogleDriveFolder | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localFolderName, setLocalFolderName] = useState('');
  const [selectedStorageId, setSelectedStorageId] = useState('local_fs');
  const [defaultStorageApplied, setDefaultStorageApplied] = useState(false);
  const [backblazeMode, setBackblazeMode] = useState(false);
  const [backblazeAccounts, setBackblazeAccounts] = useState<BackblazeAccount[]>([]);
  const [backblazeAccountId, setBackblazeAccountId] = useState('');
  const [backblazeBuckets, setBackblazeBuckets] = useState<BackblazeBucket[]>([]);
  const [backblazeBucketName, setBackblazeBucketName] = useState('');
  const [loadingBackblazeAccounts, setLoadingBackblazeAccounts] = useState(false);
  const [loadingBackblazeBuckets, setLoadingBackblazeBuckets] = useState(false);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effectiveUserId = userId || currentUser?.id || 'system';

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setLocalFolderName('');
    setError(null);
    setSelectedStorageId('local_fs');
    setDefaultStorageApplied(false);
    setBackblazeMode(false);
    setBackblazeAccounts([]);
    setBackblazeAccountId('');
    setBackblazeBuckets([]);
    setBackblazeBucketName('');
    setConnectedDriveOption(null);
    setGoogleDriveFolder(null);
  }, [open]);

  useEffect(() => {
    if (!open || storageOptions) return;
    let active = true;
    const listConnections = storageService.listStorageConnections;
    if (!listConnections) {
      setLoadingStorage(false);
      return () => { active = false; };
    }
    setLoadingStorage(true);
    listConnections(effectiveUserId)
      .then((options) => { if (active) setLoadedOptions(Array.isArray(options) ? options : []); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load storage connections.'); })
      .finally(() => { if (active) setLoadingStorage(false); });
    return () => { active = false; };
  }, [open, effectiveUserId, storageOptions, storageService]);

  const availableOptions = useMemo(() => {
    const supplied = storageOptions ?? loadedOptions;
    const providers = visibility?.availableStorageProviders;
    const hidden = new Set(visibility?.hiddenStorageProviders || []);
    const isVisible = (provider: WorkspaceStorageProvider) =>
      !hidden.has(provider) && (!providers || providers.includes(provider));
    const enabled = supplied.filter((option) =>
      option
      && option.enabled !== false
      && typeof option.id === 'string'
      && isVisible(option.provider),
    );
    const local = enabled.find((option) => option.provider === 'local_fs');
    const external = enabled.filter((option) => option.provider !== 'local_fs');
    const driveConnections = [
      ...external.filter((option) => option.provider === 'google_drive'),
      ...(connectedDriveOption && connectedDriveOption.enabled !== false ? [connectedDriveOption] : []),
    ].filter((option, index, items) => items.findIndex((candidate) => candidate.id === option.id) === index);
    const connectDriveOption: WorkspaceStorageOption[] = isVisible('google_drive')
      && !driveConnections.some((option) => option.id === 'google_drive')
      ? [{ id: 'google_drive', provider: 'google_drive', label: driveConnections.length ? 'Connect another account' : 'Connect Google Drive' }]
      : [];
    return [
      ...(local ? [local] : isVisible('local_fs') ? [LOCAL_STORAGE_OPTION] : []),
      ...external.filter((option) => option.provider !== 'google_drive'),
      ...driveConnections,
      ...connectDriveOption,
    ];
  }, [storageOptions, loadedOptions, connectedDriveOption, visibility]);

  useEffect(() => {
    if (!open || loadingStorage || defaultStorageApplied) return;
    const primary = availableOptions.find((option) => option.role === 'primary')
      || availableOptions.find((option) => option.provider !== 'local_fs' && option.id !== 'google_drive');
    const preferred = primary || availableOptions[0];
    if (preferred) setSelectedStorageId(preferred.id);
    setDefaultStorageApplied(true);
  }, [open, loadingStorage, availableOptions, defaultStorageApplied]);

  useEffect(() => {
    if (!open) return;
    const selectedStillExists = backblazeMode || availableOptions.some((option) => option.id === selectedStorageId);
    if (!selectedStillExists) {
      const primary = availableOptions.find((option) => option.role === 'primary');
      setSelectedStorageId(primary?.id || availableOptions[0]?.id || '');
    }
  }, [open, availableOptions, selectedStorageId, backblazeMode]);

  if (!open) return null;

  const selectedOption = availableOptions.find((option) => option.id === selectedStorageId)
    || availableOptions[0]
    || LOCAL_STORAGE_OPTION;
  const googleDriveConnection = selectedOption.provider === 'google_drive' && selectedOption.id !== 'google_drive'
    ? selectedOption as WorkspaceStorageOption & GoogleDriveConnection
    : undefined;
  const hiddenFields = new Set(visibility?.hiddenFields || []);
  const userName = currentUser?.username || currentUser?.name || currentUser?.email?.split('@')[0] || 'user';
  const folderPreview = formatWorkspaceFolderPreview(appName, userName, name || 'workspace');

  const handleSelectBackblaze = async () => {
    setBackblazeMode(true);
    setSelectedStorageId('backblaze_srkl');
    setBackblazeAccountId('');
    setBackblazeBuckets([]);
    setBackblazeBucketName('');
    setError(null);
    if (!storageService.listBackblazeAccounts) {
      setBackblazeAccounts([]);
      return;
    }
    setLoadingBackblazeAccounts(true);
    try {
      const accounts = await storageService.listBackblazeAccounts(effectiveUserId);
      setBackblazeAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load SRKL Backblaze accounts.');
    } finally {
      setLoadingBackblazeAccounts(false);
    }
  };

  const handleBackblazeAccountChange = async (accountId: string) => {
    setBackblazeAccountId(accountId);
    setBackblazeBuckets([]);
    setBackblazeBucketName('');
    if (!accountId || !storageService.listBackblazeBuckets) return;
    setLoadingBackblazeBuckets(true);
    try {
      const buckets = await storageService.listBackblazeBuckets(accountId, effectiveUserId);
      setBackblazeBuckets(Array.isArray(buckets) ? buckets : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load Backblaze buckets.');
    } finally {
      setLoadingBackblazeBuckets(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    if (backblazeMode && (!backblazeAccountId || !backblazeBucketName)) {
      setError('Select an SRKL Backblaze account and bucket.');
      return;
    }
    if (!backblazeMode && !availableOptions.some((option) => option.id === selectedStorageId)) {
      setError('No visible storage provider is available for this workspace.');
      return;
    }
    if (selectedOption.provider === 'google_drive' && (!googleDriveConnection || !googleDriveFolder)) {
      setError('Connect Google Drive and select a folder for this workspace.');
      return;
    }
    if (loadingStorage || loadingBackblazeAccounts || loadingBackblazeBuckets || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const backblazeAccount = backblazeAccounts.find((account) => account.id === backblazeAccountId);
      const option: WorkspaceStorageOption = backblazeMode
        ? {
            id: backblazeAccountId,
            provider: 'backblaze_b2',
            label: backblazeAccount?.name || 'SRKL Backblaze B2',
            b2BucketName: backblazeBucketName,
            bucketName: backblazeBucketName,
            b2Endpoint: backblazeAccount?.credentials?.endpoint,
            endpoint: backblazeAccount?.credentials?.endpoint,
            b2Region: backblazeAccount?.credentials?.region,
            region: backblazeAccount?.credentials?.region,
          }
        : selectedOption.provider === 'local_fs'
          ? { ...selectedOption, localFolderName: localFolderName.trim() || selectedOption.localFolderName || name.trim() }
          : selectedOption.provider === 'google_drive' && googleDriveFolder
            ? {
                ...selectedOption,
                googleRootFolderId: googleDriveFolder.id,
                googleRootFolderName: googleDriveFolder.name,
              }
            : selectedOption;
      await onSubmit(buildWorkspaceCreateInput(name, description, option));
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Workspace creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const surface = 'var(--skipo-surface, var(--color-surface, #1e1e24))';
  const background = 'var(--skipo-bg, var(--color-bg, #121116))';
  const border = 'var(--skipo-border-color, var(--color-border, #383838))';
  const accent = 'var(--skipo-accent, var(--color-accent, #d4af37))';
  const muted = 'var(--skipo-text-muted, var(--color-text-muted, #999))';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
      <form
        onSubmit={submit}
        aria-label="Create workspace"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto border-2 p-5 font-mono shadow-[7px_7px_0px_var(--skipo-border-color,var(--color-border,#383838))]"
        style={{ backgroundColor: surface, borderColor: border }}
      >
        <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: border }}>
          <div>
            <h2 className="text-sm font-black uppercase">Create Workspace</h2>
            <p className="mt-1 text-[10px]" style={{ color: muted }}>Create an isolated workspace and select its persistent storage.</p>
          </div>
          <HardDrive size={18} style={{ color: accent }} />
        </div>

        {error && <div role="alert" className="mt-3 border border-red-500 p-2 text-xs text-red-300">{error}</div>}

        <div className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase">Workspace Name *</span>
            <input
              aria-label="Workspace name"
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Production Matrix"
              className="h-9 w-full border px-3 text-xs"
              style={{ backgroundColor: background, borderColor: border }}
            />
          </label>

          {!hiddenFields.has('description') && (
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase">Description</span>
              <textarea
                aria-label="Workspace description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this workspace for?"
                rows={2}
                className="w-full border p-3 text-xs"
                style={{ backgroundColor: background, borderColor: border }}
              />
            </label>
          )}

          <div className="space-y-1">
            <label htmlFor="floks-workspace-storage" className="block text-[10px] font-black uppercase">Persistent Storage</label>
            <div className="flex gap-2">
              <select
                id="floks-workspace-storage"
                aria-label="Workspace storage"
                value={selectedStorageId}
                onChange={(event) => { setBackblazeMode(false); setSelectedStorageId(event.target.value); }}
                disabled={loadingStorage || submitting}
                className="h-10 min-w-0 flex-1 border px-2 text-xs"
                style={{ backgroundColor: background, borderColor: border }}
              >
                {availableOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {providerLabel(option) + ' — ' + (option.label || option.name || option.id)}
                  </option>
                ))}
              </select>
              {!hiddenFields.has('backblaze') && (
                <button
                  type="button"
                  onClick={handleSelectBackblaze}
                  disabled={submitting || loadingBackblazeAccounts}
                  aria-pressed={backblazeMode}
                  className="shrink-0 border px-3 text-[10px] font-black uppercase disabled:opacity-50"
                  style={{ borderColor: backblazeMode ? accent : border, color: backblazeMode ? accent : undefined }}
                >
                  Backblaze B2 / SRKL
                </button>
              )}
              {!hiddenFields.has('manageStorage') && onManageStorage && (
                <button type="button" onClick={onManageStorage} className="shrink-0 border px-3 text-[10px] font-black uppercase" style={{ borderColor: border }}>
                  Manage
                </button>
              )}
            </div>
            {!hiddenFields.has('backblaze') && backblazeMode && (
              <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: border }}>
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase">Backblaze account</span>
                  <select
                    aria-label="Backblaze account"
                    value={backblazeAccountId}
                    onChange={(event) => handleBackblazeAccountChange(event.target.value)}
                    disabled={loadingBackblazeAccounts || submitting}
                    className="h-9 w-full border px-2 text-xs"
                    style={{ backgroundColor: background, borderColor: border }}
                  >
                    <option value="">Select SRKL Backblaze account</option>
                    {backblazeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  {loadingBackblazeAccounts && <span className="text-[10px]" style={{ color: muted }}>Loading SRKL accounts…</span>}
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-black uppercase">Backblaze bucket</span>
                  <select
                    aria-label="Backblaze bucket"
                    value={backblazeBucketName}
                    onChange={(event) => setBackblazeBucketName(event.target.value)}
                    disabled={!backblazeAccountId || loadingBackblazeBuckets || submitting}
                    className="h-9 w-full border px-2 text-xs"
                    style={{ backgroundColor: background, borderColor: border }}
                  >
                    <option value="">Select bucket</option>
                    {backblazeBuckets.map((bucket) => {
                      const bucketName = bucket.bucketName || bucket.name || '';
                      return <option key={bucket.bucketId || bucket.id || bucketName} value={bucketName}>{bucketName}</option>;
                    })}
                  </select>
                  {loadingBackblazeBuckets && <span className="text-[10px]" style={{ color: muted }}>Loading buckets…</span>}
                </label>
              </div>
            )}
            {loadingStorage ? (
              <p className="flex items-center gap-2 text-[10px]" style={{ color: muted }}><Loader2 size={12} className="animate-spin" /> Loading storage connections…</p>
            ) : availableOptions.length === 1 && availableOptions[0].provider === 'local_fs' ? (
              <p className="text-[10px]" style={{ color: muted }}>No cloud storage connection is available yet. You can create a local workspace or manage storage connections.</p>
            ) : (
              <p className="text-[10px]" style={{ color: muted }}>Cloud storage is selected from connections already authorized for this account.</p>
            )}
          </div>

          {selectedOption.provider === 'google_drive' && (
            <GoogleDriveWorkspacePicker
              userId={effectiveUserId}
              connection={googleDriveConnection}
              connectGoogleDrive={storageService.connectGoogleDrive}
              listGoogleDriveFolders={storageService.listGoogleDriveFolders}
              selectedFolder={googleDriveFolder}
              onConnected={(connection) => {
                if (connection.provider !== 'google_drive') {
                  setError('The storage service returned a non-Google Drive connection.');
                  return;
                }
                setConnectedDriveOption(connection as WorkspaceStorageOption);
                setSelectedStorageId(connection.id);
                setGoogleDriveFolder(null);
                setError(null);
              }}
              onSelectFolder={setGoogleDriveFolder}
            />
          )}

          {selectedOption.provider === 'local_fs' && !hiddenFields.has('localFolderName') && (
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase">Local Folder Name</span>
              <input
                aria-label="Local folder name"
                value={localFolderName}
                onChange={(event) => setLocalFolderName(event.target.value)}
                placeholder={name.trim() || 'Workspace folder'}
                className="h-9 w-full border px-3 text-xs"
                style={{ backgroundColor: background, borderColor: border }}
              />
            </label>
          )}

          {!hiddenFields.has('canonicalFolderPreview') && (
          <div className="border p-3" style={{ borderColor: border, backgroundColor: background }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase" style={{ color: accent }}>Canonical Workspace Folder</span>
              <span className="text-[9px] uppercase" style={{ color: muted }}>Ecosystem Standard</span>
            </div>
            <code className="mt-1 block truncate text-xs font-bold text-emerald-400">{folderPreview}</code>
          </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t pt-3" style={{ borderColor: border }}>
          <button type="button" onClick={onClose} disabled={submitting} className="h-9 border px-3 text-xs" style={{ borderColor: border }}>Cancel</button>
          <button type="submit" disabled={submitting || loadingStorage || loadingBackblazeAccounts || loadingBackblazeBuckets || !name.trim()} className="h-9 px-4 text-xs font-black uppercase text-black disabled:opacity-50" style={{ backgroundColor: accent }}>
            {submitting ? 'Creating…' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
}
