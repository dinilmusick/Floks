import React from 'react';
import { Search, Plus, Trash2, Edit3, LogOut, ArrowRight, FolderOpen, Cloud, HardDrive, FolderPlus, X } from 'lucide-react';
import { StorageOptionTiles, StorageSelection } from './StorageOptionTiles.js';
import { WorkspaceStorageReadonlyPanel } from './WorkspaceStorageReadonlyPanel.js';

/**
 * @public
 * Canonical Workspace Record contract.
 */
export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  workspacePath?: string;
  storageProvider?: string;
  localFolderName?: string;
  localFolderKey?: string;
  b2BucketName?: string;
  secondaryClones?: unknown[];
}

/**
 * @public
 * Canonical WorkspaceTilesMenu Props.
 */
export interface WorkspaceTilesMenuProps {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId?: string | null;
  currentUser?: { id: string; email: string; name?: string } | null;
  onSelectWorkspace: (workspace: WorkspaceRecord) => void;
  onCreateWorkspace: (input: { name: string; description?: string; storage: StorageSelection }) => Promise<void>;
  onUpdateWorkspace?: (workspaceId: string, patch: { name: string; description?: string }) => Promise<void>;
  onDeleteWorkspace?: (workspaceId: string) => Promise<void>;
  onLogout?: () => void;
  appName?: string;
  mode?: 'direct-vault' | 'working-workspace';
  loading?: boolean;
  error?: string | null;
  onDismissError?: () => void;
}

/**
 * @public
 * Canonical FLOKS WorkspaceTilesMenu section/modal component.
 * Single source of truth for workspace isolation, selection, and creation across DEPM, KRUSBL, and SKIPO apps.
 */
export const WorkspaceTilesMenu: React.FC<WorkspaceTilesMenuProps> = ({
  workspaces,
  activeWorkspaceId = null,
  currentUser = null,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onLogout,
  appName = 'APP',
  mode = 'working-workspace',
  loading = false,
  error = null,
  onDismissError,
}) => {
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<WorkspaceRecord | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [storage, setStorage] = React.useState<StorageSelection>({ provider: 'local_fs', localFolderName: 'Local-Vault' });

  const filtered = workspaces.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreateWorkspace({ name: name.trim(), description: description.trim(), storage });
    setName('');
    setDescription('');
    setCreating(false);
  };

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !onUpdateWorkspace || !name.trim()) return;
    await onUpdateWorkspace(editing.id, { name: name.trim(), description: description.trim() });
    setEditing(null);
  };

  const beginEdit = (w: WorkspaceRecord) => {
    setEditing(w);
    setName(w.name);
    setDescription(w.description || '');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 sm:p-8 backdrop-blur-md font-mono flex flex-col items-center select-none">
      <div className="w-full max-w-5xl my-4 sm:my-8">
        <div className="p-4 sm:p-5 mb-5 border-2 border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] rounded-lg shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[var(--skipo-accent)] text-black font-black flex items-center justify-center text-sm">{appName.slice(0, 2).toUpperCase()}</div>
              <div>
                <span className="text-lg sm:text-xl font-black text-[var(--skipo-accent)] tracking-wider">{appName.toUpperCase()} WORKSPACES</span>
                <div className="text-[10px] text-[var(--skipo-text-muted)]">{currentUser?.email || 'user'} · {mode}</div>
              </div>
            </div>
            {onLogout && <button type="button" onClick={onLogout} className="text-xs flex items-center gap-1.5 text-red-400 hover:bg-red-500/20 border border-red-500/50 px-2.5 py-1.5 rounded"><LogOut size={14}/> LOGOUT</button>}
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--skipo-border-color)] flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--skipo-text-muted)]"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces by name or description..." className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] rounded pl-9 pr-3 py-1.5 text-xs text-[var(--skipo-text)] outline-none focus:border-[var(--skipo-accent)]"/>
            </div>
            <button type="button" onClick={() => { setName(''); setDescription(''); setCreating(true); }} className="text-xs flex items-center justify-center gap-1.5 font-bold px-3 py-1.5 bg-[var(--skipo-accent)] text-black rounded"><Plus size={14}/> NEW WORKSPACE</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/15 border-2 border-red-500 text-red-400 text-xs flex items-center justify-between rounded"><b>{error}</b>{onDismissError && <button type="button" onClick={onDismissError} className="underline">DISMISS</button>}</div>}
        {loading && <div className="mb-4 p-8 border border-dashed border-[var(--skipo-border-color)] text-center text-xs text-[var(--skipo-text-muted)]">LOADING WORKSPACES...</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(w => {
            const active = w.id === activeWorkspaceId;
            const isB2 = w.storageProvider === 'backblaze_b2';
            return (
              <div key={w.id} onClick={() => onSelectWorkspace(w)} className={`group p-4 border-2 bg-[var(--skipo-surface)] rounded-lg transition-all cursor-pointer ${active ? 'border-[var(--skipo-accent)] shadow-[4px_4px_0px_var(--skipo-accent)]' : 'border-[var(--skipo-border-color)] hover:border-[var(--skipo-accent)]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--skipo-text-muted)]">{isB2 ? <Cloud size={12}/> : <HardDrive size={12}/>} {w.storageProvider || 'local_fs'} {active && <span className="text-[var(--skipo-accent)]">★ ACTIVE</span>}</div>
                  <div className="flex gap-1">
                    {onUpdateWorkspace && <button type="button" onClick={e => { e.stopPropagation(); beginEdit(w); }} className="p-1.5 border border-[var(--skipo-border-color)] rounded hover:bg-[var(--skipo-accent)] hover:text-black"><Edit3 size={13}/></button>}
                    {onDeleteWorkspace && <button type="button" onClick={e => { e.stopPropagation(); if (confirm(`Delete workspace "${w.name}"?`)) onDeleteWorkspace(w.id); }} className="p-1.5 border border-[var(--skipo-border-color)] rounded hover:bg-red-600 hover:text-white"><Trash2 size={13}/></button>}
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-black uppercase text-[var(--skipo-text)] truncate">{w.name}</h3>
                <div className="mt-1 text-[10px] text-[var(--skipo-accent)] flex items-center gap-1 truncate"><FolderOpen size={11}/>{w.workspacePath || w.localFolderName || w.b2BucketName || w.id}</div>
                <p className="text-xs text-[var(--skipo-text-muted)] mt-2 line-clamp-2">{w.description || 'Workspace deployment and application control plane.'}</p>
                <div className="mt-3 pt-3 border-t border-[var(--skipo-border-color)]"><WorkspaceStorageReadonlyPanel workspace={w}/></div>
                <div className="mt-3 flex justify-end"><button type="button" onClick={e => { e.stopPropagation(); onSelectWorkspace(w); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase border rounded bg-[var(--skipo-bg)] hover:bg-[var(--skipo-accent)] hover:text-black"><span>ENTER WORKSPACE</span><ArrowRight size={14}/></button></div>
              </div>
            );
          })}
          <button type="button" onClick={() => { setName(''); setDescription(''); setCreating(true); }} className="min-h-[220px] flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--skipo-border-color)] bg-[var(--skipo-surface)]/50 hover:border-[var(--skipo-accent)] rounded-lg">
            <FolderPlus size={22} className="mb-3 text-[var(--skipo-accent)]"/><b className="text-xs">ADD NEW WORKSPACE</b><span className="text-[11px] text-[var(--skipo-text-muted)] mt-1 text-center">Create an isolated workspace with dedicated storage.</span>
          </button>
        </div>
      </div>

      {(creating || editing) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 border-2 border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] rounded-lg shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--skipo-border-color)] mb-4">
              <b className="text-sm uppercase">{creating ? 'CREATE NEW WORKSPACE' : 'EDIT WORKSPACE SETTINGS'}</b>
              <button type="button" onClick={() => { setCreating(false); setEditing(null); }}><X size={16}/></button>
            </div>
            <form onSubmit={creating ? create : update} className="space-y-4">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Workspace Name" required className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] rounded px-3 py-2 text-xs"/>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] rounded px-3 py-2 text-xs"/>
              {creating && <StorageOptionTiles currentUser={currentUser} onSelectStorage={setStorage}/>}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="px-3 py-1.5 text-xs border rounded">CANCEL</button><button type="submit" className="px-3 py-1.5 text-xs font-black bg-[var(--skipo-accent)] text-black rounded">{creating ? 'CREATE & ENTER WORKSPACE' : 'SAVE SETTINGS'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
