import React, { useEffect, useMemo, useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';

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
  [key: string]: unknown;
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
}

export interface WorkspaceCreateDialogProps {
  open: boolean;
  userId?: string;
  currentUser?: { id: string; email?: string; name?: string; username?: string } | null;
  appName?: string;
  storageOptions?: WorkspaceStorageOption[];
  storageService?: WorkspaceStorageService;
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
    storageConnection: connectionId ? option : undefined,
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
  const [backblaze, googleDrive] = await Promise.all([
    fetchBackblazeAccounts(userId),
    fetch('/api/srkl/accounts?service=google_drive&userId=' + encodeURIComponent(userId))
      .then((response) => response.ok ? response.json() : {})
      .then((data) => Array.isArray(data?.accounts) ? data.accounts : [])
      .catch(() => []),
  ]);
  return [...backblaze, ...googleDrive].map((account: any) => {
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
      googleEmail: value('email', 'googleEmail'),
      googleRootFolderId: value('rootFolderId', 'googleRootFolderId'),
      googleRootFolderName: value('rootFolderName', 'googleRootFolderName'),
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

export function createKloksWorkspaceStorageService(invoker: KloksServiceInvoker): WorkspaceStorageService {
  const listSrklAccounts = async (userId: string, service?: string): Promise<BackblazeAccount[]> => {
    const result = await invoker.invoke('srkl', 'getAccounts', { userId, service });
    return Array.isArray((result as any)?.accounts) ? (result as any).accounts : [];
  };
  return {
    listStorageConnections: async (userId) => {
      const accounts = await listSrklAccounts(userId);
      return accounts.map((account: any) => {
        const credentials = (account.credentials || {}) as Record<string, unknown>;
        const value = (key: string, alternate?: string) => {
          const item = credentials[key] ?? (alternate ? credentials[alternate] : undefined);
          return typeof item === 'string' && item.length > 0 ? item : undefined;
        };
        return {
          id: String(account.id),
          provider: String(account.provider || account.serviceId || 'backblaze_b2') as WorkspaceStorageProvider,
          label: String(account.name || account.label || account.id),
          b2BucketName: value('bucketName', 'b2BucketName'),
          b2Endpoint: value('endpoint', 'b2Endpoint'),
          b2Region: value('region', 'b2Region'),
          googleEmail: value('email', 'googleEmail'),
          googleRootFolderId: value('rootFolderId', 'googleRootFolderId'),
          googleRootFolderName: value('rootFolderName', 'googleRootFolderName'),
        };
      });
    },
    listBackblazeAccounts: (userId) => listSrklAccounts(userId, 'backblaze'),
    listBackblazeBuckets: async (accountId, userId) => {
      const result = await invoker.invoke('srkl', 'listBackblazeBuckets', { accountId, userId });
      return Array.isArray((result as any)?.buckets) ? (result as any).buckets : [];
    },
  };
}

export function WorkspaceCreateDialog({
  open,
  userId = 'system',
  currentUser,
  appName = 'app',
  storageOptions,
  storageService = defaultWorkspaceStorageService,
  onManageStorage,
  onClose,
  onSubmit,
}: WorkspaceCreateDialogProps) {
  const [loadedOptions, setLoadedOptions] = useState<WorkspaceStorageOption[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localFolderName, setLocalFolderName] = useState('');
  const [selectedStorageId, setSelectedStorageId] = useState('local_fs');
  const [defaultStorageApplied, setDefaultStorageApplied] = useState(false);
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
  }, [open]);

  useEffect(() => {
    if (!open || storageOptions) return;
    let active = true;
    setLoadingStorage(true);
    storageService.listStorageConnections?.(effectiveUserId)
      .then((options) => { if (active) setLoadedOptions(Array.isArray(options) ? options : []); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load storage connections.'); })
      .finally(() => { if (active) setLoadingStorage(false); });
    return () => { active = false; };
  }, [open, effectiveUserId, storageOptions, storageService]);

  const availableOptions = useMemo(() => {
    const supplied = storageOptions ?? loadedOptions;
    const enabled = supplied.filter((option) => option && option.enabled !== false && typeof option.id === 'string');
    const local = enabled.find((option) => option.provider === 'local_fs') || LOCAL_STORAGE_OPTION;
    const external = enabled.filter((option) => option.provider !== 'local_fs');
    return [local, ...external];
  }, [storageOptions, loadedOptions]);

  useEffect(() => {
    if (!open || loadingStorage || defaultStorageApplied) return;
    const primary = availableOptions.find((option) => option.role === 'primary')
      || availableOptions.find((option) => option.provider !== 'local_fs');
    if (primary) setSelectedStorageId(primary.id);
    setDefaultStorageApplied(true);
  }, [open, loadingStorage, availableOptions, defaultStorageApplied]);

  useEffect(() => {
    if (!open) return;
    const selectedStillExists = availableOptions.some((option) => option.id === selectedStorageId);
    if (!selectedStillExists) {
      const primary = availableOptions.find((option) => option.role === 'primary');
      setSelectedStorageId(primary?.id || 'local_fs');
    }
  }, [open, availableOptions, selectedStorageId]);

  if (!open) return null;

  const selectedOption = availableOptions.find((option) => option.id === selectedStorageId) || LOCAL_STORAGE_OPTION;
  const userName = currentUser?.username || currentUser?.name || currentUser?.email?.split('@')[0] || 'user';
  const folderPreview = formatWorkspaceFolderPreview(appName, userName, name || 'workspace');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    if (loadingStorage || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const option = selectedOption.provider === 'local_fs'
        ? { ...selectedOption, localFolderName: localFolderName.trim() || selectedOption.localFolderName || name.trim() }
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

          <div className="space-y-1">
            <label htmlFor="floks-workspace-storage" className="block text-[10px] font-black uppercase">Persistent Storage</label>
            <div className="flex gap-2">
              <select
                id="floks-workspace-storage"
                aria-label="Workspace storage"
                value={selectedStorageId}
                onChange={(event) => setSelectedStorageId(event.target.value)}
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
              {onManageStorage && (
                <button type="button" onClick={onManageStorage} className="shrink-0 border px-3 text-[10px] font-black uppercase" style={{ borderColor: border }}>
                  Manage
                </button>
              )}
            </div>
            {loadingStorage ? (
              <p className="flex items-center gap-2 text-[10px]" style={{ color: muted }}><Loader2 size={12} className="animate-spin" /> Loading storage connections…</p>
            ) : availableOptions.length === 1 && availableOptions[0].provider === 'local_fs' ? (
              <p className="text-[10px]" style={{ color: muted }}>No cloud storage connection is available yet. You can create a local workspace or manage storage connections.</p>
            ) : (
              <p className="text-[10px]" style={{ color: muted }}>Cloud storage is selected from connections already authorized for this account.</p>
            )}
          </div>

          {selectedOption.provider === 'local_fs' && (
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

          <div className="border p-3" style={{ borderColor: border, backgroundColor: background }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase" style={{ color: accent }}>Canonical Workspace Folder</span>
              <span className="text-[9px] uppercase" style={{ color: muted }}>Ecosystem Standard</span>
            </div>
            <code className="mt-1 block truncate text-xs font-bold text-emerald-400">{folderPreview}</code>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t pt-3" style={{ borderColor: border }}>
          <button type="button" onClick={onClose} disabled={submitting} className="h-9 border px-3 text-xs" style={{ borderColor: border }}>Cancel</button>
          <button type="submit" disabled={submitting || loadingStorage || !name.trim()} className="h-9 px-4 text-xs font-black uppercase text-black disabled:opacity-50" style={{ backgroundColor: accent }}>
            {submitting ? 'Creating…' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
}
