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
  /** Opaque account/connection identifier; provider credentials remain server-side. */
  id: string;
  name: string;
  provider?: string;
}

export interface BackblazeCredentialInput {
  label?: string;
  keyId: string;
  applicationKey: string;
}

export interface BackblazeCredentialTestResult {
  success: boolean;
  accountId?: string;
  buckets: BackblazeBucket[];
  error?: string;
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
  googleEmail?: string;
  googleRootFolderId?: string;
  googleRootFolderName?: string;
}

export interface WorkspaceStorageSelection {
  provider: WorkspaceStorageProvider;
  connectionId?: string;
  localFolderName?: string;
  localFolderKey?: string;
  b2BucketName?: string;
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
  googleEmail?: string;
  googleRootFolderId?: string;
  googleRootFolderName?: string;
  storageConnection?: WorkspaceStorageOption;
}

export interface StorageProviderCapability {
  id: WorkspaceStorageProvider;
  displayName: string;
  enabled: boolean;
  availabilityReason?: string;
  canSelectExistingConnection: boolean;
  canCreateConnection: boolean;
  requiredConfigurationFields: string[];
  authorizationMode: string;
  discoveryCapabilities: {
    accounts: boolean;
    buckets: boolean;
    folders: boolean;
  };
}

export interface WorkspaceStorageService {
  listStorageProviderCapabilities?: (userId: string) => Promise<StorageProviderCapability[]>;
  listStorageConnections?: (userId: string) => Promise<WorkspaceStorageOption[]>;
  listBackblazeAccounts?: (userId: string) => Promise<BackblazeAccount[]>;
  listBackblazeBuckets?: (accountId: string, userId?: string) => Promise<BackblazeBucket[]>;
  testBackblazeCredentials?: (input: BackblazeCredentialInput) => Promise<BackblazeCredentialTestResult>;
  createBackblazeConnection?: (userId: string, input: BackblazeCredentialInput & { bucketName: string }) => Promise<BackblazeAccount>;
  connectGoogleDrive?: (userId: string) => Promise<WorkspaceStorageOption>;
  listGoogleDriveFolders?: (connectionId: string, parentFolderId?: string) => Promise<GoogleDriveFolder[]>;
}

export type WorkspaceCreateDialogHiddenField =
  | 'description'
  | 'localFolderName'
  | 'backblaze'
  | 'canonicalFolderPreview';

export interface WorkspaceStoragePolicy {
  /** Ordered allow-list declared by the consuming application. No implicit providers are enabled. */
  providers: WorkspaceStorageProvider[];
}

export interface WorkspaceCreateDialogVisibility {
  /** Canonical application-level storage policy. */
  storagePolicy?: WorkspaceStoragePolicy;
  /** Backwards-compatible explicit allow-list. Prefer storagePolicy.providers. */
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
  googleDriveConnectionId?: string;
  onClose: () => void;
  onSubmit: (input: WorkspaceCreateInput) => Promise<void> | void;
}

const LOCAL_STORAGE_OPTION: WorkspaceStorageOption = {
  id: 'local_fs',
  provider: 'local_fs',
  label: 'Local Folder',
};

const NO_STORAGE_OPTION: WorkspaceStorageOption = {
  id: '',
  provider: '__none__',
  label: 'No storage provider enabled',
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
  const storage: WorkspaceStorageSelection = {
    provider,
    connectionId,
    localFolderName,
    localFolderKey: provider === 'local_fs' ? option.localFolderKey : undefined,
    b2BucketName,
    googleEmail: option.googleEmail,
    googleRootFolderId: option.googleRootFolderId,
    googleRootFolderName: option.googleRootFolderName,
  };

  // Never echo arbitrary provider objects into a workspace payload. Credentials,
  // tokens, endpoints, and provider configuration remain inside Kloks.
  const storageConnection = !connectionId
    ? undefined
    : {
        id: option.id,
        provider,
        label: option.label,
        name: option.name,
        role: option.role,
        enabled: option.enabled,
        ...(provider === 'backblaze_b2' && b2BucketName ? { b2BucketName } : {}),
        ...(provider === 'google_drive' ? {
          googleEmail: option.googleEmail,
          googleRootFolderId: option.googleRootFolderId,
          googleRootFolderName: option.googleRootFolderName,
        } : {}),
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
    googleEmail: option.googleEmail,
    googleRootFolderId: option.googleRootFolderId,
    googleRootFolderName: option.googleRootFolderName,
    storageConnection,
  };
}

/**
 * Floks is a browser UI boundary, not an application backend.
 * Consumers inject a browser-safe Kloks client/service adapter.
 * This compatibility default is intentionally inert and performs no network I/O.
 */
export const defaultWorkspaceStorageService: WorkspaceStorageService = Object.freeze({});

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
  const mapStorageConnection = (connection: any): WorkspaceStorageOption | null => {
    if (!connection || typeof connection.id !== 'string' || typeof connection.provider !== 'string') return null;
    return {
      id: connection.id,
      provider: connection.provider as WorkspaceStorageProvider,
      label: String(connection.label || connection.name || connection.id),
      role: connection.role,
      enabled: connection.enabled,
      localFolderName: connection.localFolderName,
      b2BucketName: connection.b2BucketName,
      googleEmail: connection.googleEmail,
      googleRootFolderId: connection.googleRootFolderId,
      googleRootFolderName: connection.googleRootFolderName,
    };
  };

  const listStorageConnections = async (userId: string): Promise<WorkspaceStorageOption[]> => {
    const result = await invoker.invoke('kloks.backend.storage', 'getConnections', { userId });
    const storedConnections = Array.isArray(result)
      ? result
      : Array.isArray((result as any)?.connections)
        ? (result as any).connections
        : [];
    return storedConnections
      .map(mapStorageConnection)
      .filter((item): item is WorkspaceStorageOption => Boolean(item));
  };

  return {
    listStorageProviderCapabilities: async (userId: string) => {
      const result = await invoker.invoke('kloks.backend.storage', 'getProviderCapabilities', { userId });
      const capabilities = Array.isArray(result)
        ? result
        : Array.isArray((result as any)?.providers)
          ? (result as any).providers
          : [];
      return capabilities.filter((item: any) =>
        item && typeof item.id === 'string' && typeof item.displayName === 'string',
      ) as StorageProviderCapability[];
    },
    listStorageConnections,
    listBackblazeAccounts: async (userId: string) => (await listStorageConnections(userId))
      .filter((item) => item.provider === 'backblaze_b2')
      .map((item) => ({ id: item.id, name: item.label || item.name || item.id, provider: item.provider })),
    listBackblazeBuckets: async (accountId: string, userId = '') => {
      const result = await invoker.invoke('kloks.backend.storage', 'listBackblazeConnectionBuckets', {
        userId,
        connectionId: accountId,
      });
      return Array.isArray(result) ? result as BackblazeBucket[] : Array.isArray((result as any)?.buckets) ? (result as any).buckets : [];
    },
    testBackblazeCredentials: async (input) => {
      const result = await invoker.invoke('kloks.backend.storage', 'testBackblazeCredentials', { ...input });
      return result as BackblazeCredentialTestResult;
    },
    createBackblazeConnection: async (userId, input) => {
      const result = await invoker.invoke('kloks.backend.storage', 'createBackblazeConnection', {
        userId,
        ...input,
      });
      const connection = (result as any)?.connection || result;
      if (!connection || typeof connection.id !== 'string') {
        throw new Error('Kloks did not return a valid Backblaze storage connection.');
      }
      return {
        id: connection.id,
        name: String(connection.label || connection.name || connection.id),
        provider: String(connection.provider || 'backblaze_b2'),
      };
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
  googleDriveConnectionId,
  onClose,
  onSubmit,
}: WorkspaceCreateDialogProps) {
  const [loadedOptions, setLoadedOptions] = useState<WorkspaceStorageOption[]>([]);
  const [providerCapabilities, setProviderCapabilities] = useState<StorageProviderCapability[]>([]);
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
  const [addingBackblazeAccount, setAddingBackblazeAccount] = useState(false);
  const [newBackblazeLabel, setNewBackblazeLabel] = useState('');
  const [newBackblazeKeyId, setNewBackblazeKeyId] = useState('');
  const [newBackblazeApplicationKey, setNewBackblazeApplicationKey] = useState('');
  const [newBackblazeBuckets, setNewBackblazeBuckets] = useState<BackblazeBucket[]>([]);
  const [newBackblazeBucketName, setNewBackblazeBucketName] = useState('');
  const [backblazeCredentialsTested, setBackblazeCredentialsTested] = useState(false);
  const [testingBackblazeCredentials, setTestingBackblazeCredentials] = useState(false);
  const [savingBackblazeConnection, setSavingBackblazeConnection] = useState(false);
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
    setAddingBackblazeAccount(false);
    setNewBackblazeLabel('');
    setNewBackblazeKeyId('');
    setNewBackblazeApplicationKey('');
    setNewBackblazeBuckets([]);
    setNewBackblazeBucketName('');
    setBackblazeCredentialsTested(false);
    setConnectedDriveOption(null);
    setGoogleDriveFolder(null);
  }, [open]);

  useEffect(() => {
    if (!open || !storageService.listStorageProviderCapabilities) return;
    let active = true;
    storageService.listStorageProviderCapabilities(effectiveUserId)
      .then((items) => { if (active) setProviderCapabilities(Array.isArray(items) ? items : []); })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load storage provider capabilities.');
      });
    return () => { active = false; };
  }, [open, effectiveUserId, storageService]);

  useEffect(() => {
    if (!open || !googleDriveConnectionId) return;
    const exists = (storageOptions ?? loadedOptions).some((option) => option.id === googleDriveConnectionId);
    if (exists) {
      setSelectedStorageId(googleDriveConnectionId);
      setBackblazeMode(false);
    }
  }, [open, googleDriveConnectionId, storageOptions, loadedOptions]);

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
    // Existing user connections remain selectable even when new provider
    // authorization is currently unavailable (for example, an OAuth system
    // credential rotation). Capabilities control discovery/creation state;
    // they do not erase existing user-owned connections from the selector.
    const providerOrder = visibility?.storagePolicy?.providers
      ?? visibility?.availableStorageProviders
      ?? providerCapabilities.map((capability) => capability.id);
    const hidden = new Set(visibility?.hiddenStorageProviders || []);
    const enabled = supplied.filter((option) =>
      option
      && option.enabled !== false
      && typeof option.id === 'string'
      && !hidden.has(option.provider),
    );
    const forProvider = (provider: WorkspaceStorageProvider) =>
      enabled.filter((option) => option.provider === provider);

    // Provider availability is opt-in per consuming application; no shared defaults.
    return providerOrder
      .filter((provider, index) => providerOrder.indexOf(provider) === index && !hidden.has(provider))
      .flatMap((provider): WorkspaceStorageOption[] => {
        if (provider === 'local_fs') return [forProvider(provider)[0] || LOCAL_STORAGE_OPTION];
        if (provider === 'google_drive') {
          const connections = [
            ...forProvider(provider),
            ...(connectedDriveOption && connectedDriveOption.enabled !== false ? [connectedDriveOption] : []),
          ].filter((option, index, items) => items.findIndex((candidate) => candidate.id === option.id) === index);
          const capability = providerCapabilities.find((item) => item.id === provider);
          const label = capability?.enabled
            ? 'Connect Google Drive'
            : 'Google Drive authorization unavailable';
          return connections.length > 0 ? connections : [{ id: 'google_drive', provider: 'google_drive', label }];
        }
        if (provider === 'backblaze_b2') {
          const connections = forProvider(provider);
          return [
            ...connections,
            { id: 'backblaze_external', provider: 'backblaze_b2', label: 'Add or choose a Backblaze account' },
          ];
        }
        return forProvider(provider);
      });
  }, [storageOptions, loadedOptions, connectedDriveOption, visibility, providerCapabilities]);

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
    || NO_STORAGE_OPTION;
  const googleDriveConnection = selectedOption.provider === 'google_drive' && selectedOption.id !== 'google_drive'
    ? selectedOption as WorkspaceStorageOption & GoogleDriveConnection
    : undefined;
  const hiddenFields = new Set(visibility?.hiddenFields || []);
  const userName = currentUser?.username || currentUser?.name || currentUser?.email?.split('@')[0] || 'user';
  const folderPreview = formatWorkspaceFolderPreview(appName, userName, name || 'workspace');

  const handleSelectBackblaze = async () => {
    setBackblazeMode(true);
    setSelectedStorageId('backblaze_external');
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
      setError(reason instanceof Error ? reason.message : 'Failed to load Backblaze accounts.');
    } finally {
      setLoadingBackblazeAccounts(false);
    }
  };

  const beginAddBackblazeAccount = () => {
    setAddingBackblazeAccount(true);
    setNewBackblazeLabel('');
    setNewBackblazeKeyId('');
    setNewBackblazeApplicationKey('');
    setNewBackblazeBuckets([]);
    setNewBackblazeBucketName('');
    setBackblazeCredentialsTested(false);
    setError(null);
  };

  const cancelAddBackblazeAccount = () => {
    setAddingBackblazeAccount(false);
    setNewBackblazeLabel('');
    setNewBackblazeKeyId('');
    setNewBackblazeApplicationKey('');
    setNewBackblazeBuckets([]);
    setNewBackblazeBucketName('');
    setBackblazeCredentialsTested(false);
    setError(null);
  };

  const testNewBackblazeCredentials = async () => {
    if (!storageService.testBackblazeCredentials) {
      setError('Backblaze credential validation is not configured for this storage service.');
      return;
    }
    if (!newBackblazeKeyId.trim() || !newBackblazeApplicationKey.trim()) {
      setError('Enter the Backblaze Key ID and Application Key before testing.');
      return;
    }
    setTestingBackblazeCredentials(true);
    setError(null);
    setBackblazeCredentialsTested(false);
    setNewBackblazeBuckets([]);
    setNewBackblazeBucketName('');
    try {
      const result = await storageService.testBackblazeCredentials({
        keyId: newBackblazeKeyId.trim(),
        applicationKey: newBackblazeApplicationKey.trim(),
      });
      if (!result.success) {
        throw new Error(result.error || 'Backblaze credentials could not be validated.');
      }
      if (!Array.isArray(result.buckets) || result.buckets.length === 0) {
        throw new Error('The Backblaze credentials are valid but no accessible buckets were discovered.');
      }
      setNewBackblazeBuckets(result.buckets);
      setBackblazeCredentialsTested(true);
      setNewBackblazeBucketName(result.buckets.length === 1
        ? String(result.buckets[0].bucketName || result.buckets[0].name || '')
        : '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Backblaze credential validation failed.');
    } finally {
      setTestingBackblazeCredentials(false);
    }
  };

  const saveNewBackblazeConnection = async () => {
    if (!storageService.createBackblazeConnection) {
      setError('Creating Backblaze connections is not configured for this storage service.');
      return;
    }
    if (!backblazeCredentialsTested) {
      setError('Test the Backblaze credentials before saving this connection.');
      return;
    }
    if (!newBackblazeBucketName) {
      setError('Select an accessible bucket before saving this connection.');
      return;
    }
    setSavingBackblazeConnection(true);
    setError(null);
    try {
      const saved = await storageService.createBackblazeConnection(effectiveUserId, {
        label: newBackblazeLabel.trim() || undefined,
        keyId: newBackblazeKeyId.trim(),
        applicationKey: newBackblazeApplicationKey.trim(),
        bucketName: newBackblazeBucketName,
      });
      if (!saved || !saved.id) throw new Error('Kloks did not return a saved Backblaze connection.');
      const savedAccount: BackblazeAccount = {
        id: saved.id,
        name: saved.name || newBackblazeLabel.trim() || 'Backblaze B2',
        provider: saved.provider || 'backblaze_b2',
      };
      setBackblazeAccounts((current) => [
        ...current.filter((account) => account.id !== savedAccount.id),
        savedAccount,
      ]);
      setBackblazeAccountId(savedAccount.id);
      setBackblazeBuckets(newBackblazeBuckets);
      setBackblazeBucketName(newBackblazeBucketName);
      setAddingBackblazeAccount(false);
      setNewBackblazeLabel('');
      setNewBackblazeKeyId('');
      setNewBackblazeApplicationKey('');
      setNewBackblazeBuckets([]);
      setNewBackblazeBucketName('');
      setBackblazeCredentialsTested(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the Backblaze connection.');
    } finally {
      setSavingBackblazeConnection(false);
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
      setError('Select a Backblaze account and bucket.');
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
    if (loadingStorage || loadingBackblazeAccounts || loadingBackblazeBuckets || testingBackblazeCredentials || savingBackblazeConnection || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const backblazeAccount = backblazeAccounts.find((account) => account.id === backblazeAccountId);
      const option: WorkspaceStorageOption = backblazeMode
        ? {
            id: backblazeAccountId,
            provider: 'backblaze_b2',
            label: backblazeAccount?.name || 'Backblaze B2',
            b2BucketName: backblazeBucketName,
            bucketName: backblazeBucketName,
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
                onChange={(event) => {
                  const nextId = event.target.value;
                  if (nextId === 'backblaze_external') {
                    void handleSelectBackblaze();
                    return;
                  }
                  setBackblazeMode(false);
                  setSelectedStorageId(nextId);
                }}
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

            </div>
            {!hiddenFields.has('backblaze') && backblazeMode && (
              <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: border }}>
                {!addingBackblazeAccount ? (
                  <>
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
                        <option value="">Select Backblaze account</option>
                        {backblazeAccounts.map((account) => (
                          <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                      </select>
                      {loadingBackblazeAccounts && <span className="text-[10px]" style={{ color: muted }}>Loading Backblaze accounts…</span>}
                    </label>
                    <button
                      type="button"
                      onClick={beginAddBackblazeAccount}
                      disabled={submitting}
                      className="h-9 border px-3 text-xs font-bold disabled:opacity-50"
                      style={{ borderColor: accent, color: accent }}
                    >
                      + Add new Backblaze account
                    </button>
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
                  </>
                ) : (
                  <div className="space-y-2 border p-3" style={{ borderColor: border, backgroundColor: background }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase">Add Backblaze account</span>
                      <button type="button" onClick={cancelAddBackblazeAccount} disabled={testingBackblazeCredentials || savingBackblazeConnection} className="text-[10px] underline">Cancel</button>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black uppercase">Account label</span>
                      <input
                        aria-label="Backblaze account label"
                        value={newBackblazeLabel}
                        onChange={(event) => setNewBackblazeLabel(event.target.value)}
                        placeholder="Production B2 account"
                        className="h-9 w-full border px-3 text-xs"
                        style={{ backgroundColor: surface, borderColor: border }}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black uppercase">B2 Key ID</span>
                      <input
                        aria-label="Backblaze Key ID"
                        autoComplete="off"
                        value={newBackblazeKeyId}
                        onChange={(event) => { setNewBackblazeKeyId(event.target.value); setBackblazeCredentialsTested(false); }}
                        className="h-9 w-full border px-3 text-xs"
                        style={{ backgroundColor: surface, borderColor: border }}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black uppercase">Application Key</span>
                      <input
                        aria-label="Backblaze Application Key"
                        type="password"
                        autoComplete="new-password"
                        value={newBackblazeApplicationKey}
                        onChange={(event) => { setNewBackblazeApplicationKey(event.target.value); setBackblazeCredentialsTested(false); }}
                        className="h-9 w-full border px-3 text-xs"
                        style={{ backgroundColor: surface, borderColor: border }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void testNewBackblazeCredentials()}
                      disabled={testingBackblazeCredentials || savingBackblazeConnection || !newBackblazeKeyId.trim() || !newBackblazeApplicationKey.trim()}
                      className="h-9 border px-3 text-xs font-bold disabled:opacity-50"
                      style={{ borderColor: border }}
                    >
                      {testingBackblazeCredentials ? 'Testing credentials…' : 'Test B2 credentials'}
                    </button>
                    {backblazeCredentialsTested && (
                      <>
                        <p role="status" className="text-[10px] text-emerald-400">Credentials verified. Select the bucket to associate with this account.</p>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-black uppercase">Accessible bucket</span>
                          <select
                            aria-label="New Backblaze bucket"
                            value={newBackblazeBucketName}
                            onChange={(event) => setNewBackblazeBucketName(event.target.value)}
                            disabled={savingBackblazeConnection}
                            className="h-9 w-full border px-2 text-xs"
                            style={{ backgroundColor: surface, borderColor: border }}
                          >
                            <option value="">Select bucket</option>
                            {newBackblazeBuckets.map((bucket) => {
                              const bucketName = bucket.bucketName || bucket.name || '';
                              return <option key={bucket.bucketId || bucket.id || bucketName} value={bucketName}>{bucketName}</option>;
                            })}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void saveNewBackblazeConnection()}
                          disabled={savingBackblazeConnection || !newBackblazeBucketName}
                          className="h-9 px-3 text-xs font-bold text-black disabled:opacity-50"
                          style={{ backgroundColor: accent }}
                        >
                          {savingBackblazeConnection ? 'Saving connection…' : 'Save account and use it'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {loadingStorage ? (
              <p className="flex items-center gap-2 text-[10px]" style={{ color: muted }}><Loader2 size={12} className="animate-spin" /> Loading storage connections…</p>
            ) : availableOptions.length === 0 ? (
              <p className="text-[10px]" style={{ color: muted }}>This application has not enabled a workspace storage provider.</p>
            ) : (
              <p className="text-[10px]" style={{ color: muted }}>Choose from the storage providers explicitly enabled by this application.</p>
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
          <button type="submit" disabled={submitting || loadingStorage || loadingBackblazeAccounts || loadingBackblazeBuckets || testingBackblazeCredentials || savingBackblazeConnection || !availableOptions.length || !name.trim()} className="h-9 px-4 text-xs font-black uppercase text-black disabled:opacity-50" style={{ backgroundColor: accent }}>
            {submitting ? 'Creating…' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
}
