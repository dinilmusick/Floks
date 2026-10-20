import React, { useEffect, useState } from 'react';
import { Cloud, HardDrive, Loader2 } from 'lucide-react';
import { frnlButton } from '../../frnl/frnlButton.js';
import { frnlTextInput } from '../../frnl/frnlTextInput.js';

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
  credentials?: { region?: string; endpoint?: string };
}

export interface WorkspaceStorageService {
  listBackblazeAccounts: (userId: string) => Promise<BackblazeAccount[]>;
  listBackblazeBuckets: (accountId: string) => Promise<BackblazeBucket[]>;
}

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
  storageProvider: 'local_fs' | 'backblaze_b2';
  storageConnectionId?: string;
  localFolderName?: string;
  b2BucketName?: string;
  b2Endpoint?: string;
  b2Region?: string;
}

export interface WorkspaceCreateDialogProps {
  open: boolean;
  userId: string;
  storageService: WorkspaceStorageService;
  onClose: () => void;
  onSubmit: (input: WorkspaceCreateInput) => Promise<void>;
}

export function WorkspaceCreateDialog({ open, userId, storageService, onClose, onSubmit }: WorkspaceCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<'local_fs' | 'backblaze_b2'>('local_fs');
  const [accounts, setAccounts] = useState<BackblazeAccount[]>([]);
  const [buckets, setBuckets] = useState<BackblazeBucket[]>([]);
  const [accountId, setAccountId] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setError(null);
    storageService.listBackblazeAccounts(userId).then(setAccounts).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load SRKL accounts.'));
  }, [open, userId, storageService]);

  useEffect(() => {
    if (provider !== 'backblaze_b2' || !accountId) return;
    setLoadingBuckets(true);
    storageService.listBackblazeBuckets(accountId).then((items) => {
      setBuckets(items);
      setBucketName('');
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load Backblaze buckets.')).finally(() => setLoadingBuckets(false));
  }, [provider, accountId, storageService]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Workspace name is required.');
    if (provider === 'backblaze_b2' && (!accountId || !bucketName)) return setError('Select an SRKL Backblaze account and bucket.');
    setLoading(true);
    try {
      const account = accounts.find((a) => a.id === accountId);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        storageProvider: provider,
        storageConnectionId: accountId || undefined,
        localFolderName: provider === 'local_fs' ? name.trim() : undefined,
        b2BucketName: provider === 'backblaze_b2' ? bucketName : undefined,
        b2Endpoint: account?.credentials?.endpoint,
        b2Region: account?.credentials?.region,
      });
      setName('');
      setDescription('');
      setProvider('local_fs');
      setAccountId('');
      setBucketName('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workspace creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-xl bg-[var(--skipo-surface)] border-2 border-[var(--skipo-border-color)] shadow-[7px_7px_0px_var(--skipo-border-color)] p-5 font-mono">
        <h2 className="text-sm font-black uppercase">Create Workspace</h2>
        <p className="mt-1 text-[10px] text-[var(--skipo-text-muted)]">Storage is selected from the authenticated user's SRKL-backed accounts.</p>
        {error && <div className="mt-3 border border-red-500 p-2 text-xs text-red-300">{error}</div>}
        <div className="mt-4 space-y-3">
          <input aria-label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" className="w-full h-9 bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] px-3 text-xs" />
          <textarea aria-label="Workspace description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] p-3 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setProvider('local_fs')} className={`p-3 border text-left text-xs ${provider === 'local_fs' ? 'border-[var(--skipo-accent)]' : 'border-[var(--skipo-border-color)]'}`}><HardDrive size={15} /> LOCAL FILESYSTEM</button>
            <button type="button" onClick={() => setProvider('backblaze_b2')} className={`p-3 border text-left text-xs ${provider === 'backblaze_b2' ? 'border-[var(--skipo-accent)]' : 'border-[var(--skipo-border-color)]'}`}><Cloud size={15} /> BACKBLAZE B2 / SRKL</button>
          </div>
          {provider === 'backblaze_b2' && <div className="space-y-2 border-t border-[var(--skipo-border-color)] pt-3">
            <select aria-label="Backblaze account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full h-9 bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] px-2 text-xs">
              <option value="">Select SRKL Backblaze account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {loadingBuckets ? <div className="text-xs flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Loading buckets...</div> :
              <select aria-label="Backblaze bucket" value={bucketName} onChange={(e) => setBucketName(e.target.value)} className="w-full h-9 bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] px-2 text-xs">
                <option value="">Select bucket</option>
                {buckets.map((b) => { const n = b.bucketName ?? b.name ?? ''; return <option key={b.bucketId ?? b.id ?? n} value={n}>{n}</option>; })}
              </select>}
          </div>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 px-3 border border-[var(--skipo-border-color)] text-xs">CANCEL</button>
          <button type="submit" disabled={loading} className="h-8 px-3 bg-[var(--skipo-accent)] text-black text-xs font-black">{loading ? 'CREATING...' : 'CREATE WORKSPACE'}</button>
        </div>
      </form>
    </div>
  );
}
