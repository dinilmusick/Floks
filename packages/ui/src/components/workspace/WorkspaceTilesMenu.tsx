import React, { useId, useMemo, useState } from 'react';
import { FolderOpen, HardDrive, Cloud, LogOut } from 'lucide-react';
import { defineFrnlComponent } from '@ultrst-armada/frnlts';
import { useFrnlComponent } from '@ultrst-armada/frnlts/react';
import { useFloksFrnlStore } from '../../frnl/store.js';
import { TilesMenu } from '../tiles/TilesMenu.js';
import { WorkspaceCreateDialog, type WorkspaceCreateInput, type WorkspaceStorageService } from './WorkspaceCreateDialog.js';

export const WORKSPACE_TILES_MENU_REQUIRED_SERVICES = ['auth', 'workspace', 'storage', 'srkl'] as const;

export interface WorkspaceRecord {
  id: string;
  title: string;
  description?: string;
  workspacePath?: string;
  storageProvider?: string;
  storageConnectionId?: string;
  b2BucketName?: string;
  b2Endpoint?: string;
  b2Region?: string;
  metadata?: React.ReactNode;
}

export interface WorkspaceTilesMenuProps {
  workspaces: WorkspaceRecord[];
  userId: string;
  activeWorkspaceId?: string | null;
  storageService: WorkspaceStorageService;
  onSelectWorkspace: (workspace: WorkspaceRecord) => void;
  onCreateWorkspace: (input: WorkspaceCreateInput) => Promise<void>;
  onUpdateWorkspace?: (workspaceId: string, patch: { name: string; description?: string }) => Promise<void>;
  onDeleteWorkspace?: (workspaceId: string) => Promise<void>;
  onLogout?: () => void;
  loading?: boolean;
  error?: string | null;
}

export const workspaceTilesMenuDefinition = defineFrnlComponent({
  name: 'workspaceTilesMenu',
  states: {
    idle: { name: 'idle', events: { select: { functionId: 'workspaceTilesMenu.idle.select' }, create: { functionId: 'workspaceTilesMenu.idle.create' }, logout: { functionId: 'workspaceTilesMenu.idle.logout' } }, visualParameters: {}, phases: { sustainPhase: { visualDefinition: { parameters: {} } } } },
    loading: { name: 'loading', events: {}, visualParameters: { opacity: 0.7 }, phases: { sustainPhase: { visualDefinition: { parameters: {} } } } },
    error: { name: 'error', events: {}, visualParameters: {}, phases: { sustainPhase: { visualDefinition: { parameters: {} } } } },
  },
});

export function WorkspaceTilesMenu({
  workspaces,
  userId,
  activeWorkspaceId = null,
  storageService,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace: _onUpdateWorkspace,
  onDeleteWorkspace: _onDeleteWorkspace,
  onLogout,
  loading = false,
  error = null,
}: WorkspaceTilesMenuProps) {
  const store = useFloksFrnlStore();
  const generated = useId().replace(/[:/]/g, '');
  const componentId = `workspaceTilesMenu.${generated}`;
  const [creating, setCreating] = useState(false);
  const handlers = useMemo(() => ({
    'workspaceTilesMenu.idle.select': (value: unknown) => onSelectWorkspace(value as WorkspaceRecord),
    'workspaceTilesMenu.idle.create': () => setCreating(true),
    'workspaceTilesMenu.idle.logout': () => onLogout?.(),
  }), [onLogout, onSelectWorkspace]);
  const frnl = useFrnlComponent({
    id: componentId,
    definition: workspaceTilesMenuDefinition,
    store,
    state: error ? 'error' : loading ? 'loading' : 'idle',
    properties: { activeWorkspaceId, workspaceCount: workspaces.length },
    handlers,
  });

  return (
    <section id={componentId} data-frnl-component="workspaceTilesMenu" data-frnl-state={frnl.state} className="space-y-3">
      <div className="flex justify-end gap-2">
        {onLogout && <button type="button" onClick={() => frnl.events.logout(undefined)} className="h-8 px-3 border border-red-500/60 text-red-300 text-[10px] font-black flex items-center gap-1"><LogOut size={12} /> LOGOUT</button>}
      </div>
      <TilesMenu
        id={componentId + '.tiles'}
        title="Workspaces"
        subtitle="Workspace isolation and storage selection."
        tiles={workspaces}
        loading={loading}
        error={error}
        createLabel="NEW WORKSPACE"
        onSelect={(ws) => frnl.events.select(ws)}
        onCreate={() => frnl.events.create(undefined)}
        renderTile={(ws, selected) => (
          <>
            <div className="flex items-center gap-2 text-xs font-black uppercase">{ws.storageProvider === 'backblaze_b2' ? <Cloud size={14} /> : <HardDrive size={14} />}{ws.title}</div>
            <p className="mt-2 text-[11px] text-[var(--skipo-text-muted)]">{ws.description}</p>
            <div className={`mt-2 text-[10px] ${selected || ws.id === activeWorkspaceId ? 'text-[var(--skipo-accent)]' : 'text-[var(--skipo-text-muted)]'}`}><FolderOpen size={11} className="inline mr-1" />{ws.workspacePath ?? ws.b2BucketName ?? ws.id}</div>
          </>
        )}
      />
      <WorkspaceCreateDialog open={creating} userId={userId} storageService={storageService} onClose={() => setCreating(false)} onSubmit={onCreateWorkspace} />
    </section>
  );
}
