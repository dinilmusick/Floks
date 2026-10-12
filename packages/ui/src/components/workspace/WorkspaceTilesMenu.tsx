import React from 'react';
import { StorageOptionTiles, StorageSelection } from './StorageOptionTiles.js';
import { WorkspaceStorageReadonlyPanel } from './WorkspaceStorageReadonlyPanel.js';
import { WorkspaceSecondaryClonesPanel, type WorkspaceSecondaryClone } from './WorkspaceSecondaryClonesPanel.js';

export interface WorkspaceRecord {
  id: string;
  name: string;
  storageProvider?: string;
  localFolderName?: string;
  b2BucketName?: string;
  secondaryClones?: WorkspaceSecondaryClone[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceTilesMenuProps {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspace: WorkspaceRecord) => void;
  onCreateWorkspace: (name: string, storage: StorageSelection) => Promise<void>;
  onDeleteWorkspace?: (workspaceId: string) => Promise<void>;
  appName?: string;
  currentUser?: { id: string; email: string; name?: string } | null;
  mode?: 'direct-vault' | 'working-workspace';
}

export const WorkspaceTilesMenu: React.FC<WorkspaceTilesMenuProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  appName = 'app',
  currentUser = null,
  mode = 'working-workspace'
}) => {
  const [isCreating, setIsCreating] = React.useState(false);
  const [newWsName, setNewWsName] = React.useState('');
  const [storageConfig, setStorageConfig] = React.useState<StorageSelection>({
    provider: 'backblaze_b2',
    b2BucketName: 'ultrst-apps'
  });
  const [activeTab, setActiveTab] = React.useState<'workspaces' | 'clones'>('workspaces');
  const [activeWorkspaceForClones, setActiveWorkspaceForClones] = React.useState<WorkspaceRecord | null>(null);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await onCreateWorkspace(newWsName.trim(), storageConfig);
    setNewWsName('');
    setIsCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--skipo-bg-app, #0f172a)', color: 'var(--skipo-text-primary, #f8fafc)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Workspaces ({mode})</h2>
          <span style={{ fontSize: '12px', color: 'var(--skipo-text-muted, #94a3b8)' }}>{currentUser?.email || 'user'} • {appName}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('workspaces')}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #334155', background: activeTab === 'workspaces' ? '#38bdf8' : 'transparent', color: activeTab === 'workspaces' ? '#0f172a' : 'inherit', cursor: 'pointer' }}
          >
            List
          </button>
          {activeWs && (
            <button
              onClick={() => { setActiveWorkspaceForClones(activeWs); setActiveTab('clones'); }}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #334155', background: activeTab === 'clones' ? '#38bdf8' : 'transparent', color: activeTab === 'clones' ? '#0f172a' : 'inherit', cursor: 'pointer' }}
            >
              Clones ({activeWs.secondaryClones?.length || 0})
            </button>
          )}
          <button
            onClick={() => setIsCreating(!isCreating)}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #38bdf8', background: isCreating ? 'transparent' : '#38bdf8', color: isCreating ? '#38bdf8' : '#0f172a', cursor: 'pointer' }}
          >
            {isCreating ? 'Cancel' : '+ New Workspace'}
          </button>
        </div>
      </div>

      {isCreating ? (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#94a3b8' }}>Workspace Name</label>
            <input
              type="text"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="e.g. Production Vault"
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              autoFocus
            />
          </div>
          <StorageOptionTiles currentUser={currentUser} onSelectStorage={setStorageConfig} />
          <button type="submit" style={{ padding: '10px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            Create Workspace
          </button>
        </form>
      ) : activeTab === 'clones' && activeWorkspaceForClones ? (
        <WorkspaceSecondaryClonesPanel
          workspace={activeWorkspaceForClones}
          onClose={() => setActiveTab('workspaces')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto' }}>
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                onClick={() => onSelectWorkspace(ws)}
                style={{ padding: '16px', borderRadius: '8px', background: isActive ? 'rgba(56, 189, 248, 0.08)' : '#1e293b', border: isActive ? '1px solid #38bdf8' : '1px solid #334155', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{ws.name}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {ws.secondaryClones && ws.secondaryClones.length > 0 && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                        +{ws.secondaryClones.length} CLONES
                      </span>
                    )}
                    {isActive && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#38bdf8', color: '#0f172a', fontWeight: 600 }}>ACTIVE</span>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <WorkspaceStorageReadonlyPanel workspace={ws} />
                </div>
                {onDeleteWorkspace && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete workspace "${ws.name}"?`)) onDeleteWorkspace(ws.id);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
