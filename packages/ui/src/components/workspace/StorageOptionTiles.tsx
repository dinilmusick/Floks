/**
 * Deprecated internal storage-option tile screen.
 *
 * New application workspace creation should use WorkspaceCreateDialog. This
 * compatibility screen can only enumerate opaque Kloks connection IDs through
 * an injected service; it has no SRKL endpoint fallback and never accepts or
 * emits provider credentials.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, Cloud, RefreshCw } from 'lucide-react';
import { StoragePresetTile } from './StoragePresetTile.js';
import {
  BackblazeConnectionTile,
  type BackblazeWorkspaceConnection,
} from './SrklBackblazeTile.js';

export interface StorageSelection {
  provider: 'local_fs' | 'backblaze_b2';
  connectionId?: string;
  localFolderName?: string;
  localFolderKey?: string;
  b2BucketName?: string;
}

interface Props {
  currentUser?: { id: string; email?: string; name?: string } | null;
  userId?: string;
  selectedConnectionId?: string;
  storageService?: {
    listBackblazeAccounts?: (userId: string) => Promise<BackblazeWorkspaceConnection[]>;
    listBackblazeBuckets?: (connectionId: string, userId: string) => Promise<any[]>;
  };
  onSelectStorage: (selection: StorageSelection) => void;
}

export const StorageOptionTiles: React.FC<Props> = ({
  currentUser,
  userId,
  selectedConnectionId,
  storageService,
  onSelectStorage,
}) => {
  const [activeId, setActiveId] = useState<string>(selectedConnectionId || 'local_default');
  const [selectedBucket, setSelectedBucket] = useState('');
  const [backblazeConnections, setBackblazeConnections] = useState<BackblazeWorkspaceConnection[]>([]);
  const [loadingBackblaze, setLoadingBackblaze] = useState(false);
  const effectiveUserId = currentUser?.id || userId || '';

  const fetchBackblazeConnections = useCallback(async () => {
    if (!effectiveUserId || !storageService?.listBackblazeAccounts) {
      setBackblazeConnections([]);
      return;
    }
    setLoadingBackblaze(true);
    try {
      const result = await storageService.listBackblazeAccounts(effectiveUserId);
      setBackblazeConnections(Array.isArray(result)
        ? result.filter((item) => item && typeof item.id === 'string' && typeof item.provider === 'string')
        : []);
    } catch {
      setBackblazeConnections([]);
    } finally {
      setLoadingBackblaze(false);
    }
  }, [effectiveUserId, storageService]);

  useEffect(() => {
    void fetchBackblazeConnections();
  }, [fetchBackblazeConnections]);

  const handleSelectLocal = (connection: any) => {
    setActiveId(connection.id);
    setSelectedBucket('');
    onSelectStorage({
      provider: 'local_fs',
      connectionId: connection.id,
      localFolderName: connection.localFolderName || 'Local-Vault',
      localFolderKey: connection.localFolderKey,
    });
  };

  const handleSelectBackblazeBucket = (connection: BackblazeWorkspaceConnection, bucketName: string) => {
    setActiveId(connection.id);
    setSelectedBucket(bucketName);
    // The canonical Kloks registry resolves B2 keys, endpoint, and region server-side.
    onSelectStorage({
      provider: 'backblaze_b2',
      connectionId: connection.id,
      b2BucketName: bucketName,
    });
  };

  const defaultLocalConnection = {
    id: 'local_default',
    label: 'Local Workstation Vault',
    localFolderName: 'Local-Vault',
    provider: 'local_fs',
  };

  return (
    <div className="space-y-4 font-mono select-none">
      <div className="space-y-2">
        <span className="text-[9px] font-black uppercase text-[var(--skipo-text-muted)] flex items-center gap-1">
          <HardDrive size={11} /> Local Filesystem
        </span>
        <StoragePresetTile
          conn={defaultLocalConnection}
          isSelected={activeId === defaultLocalConnection.id && !selectedBucket}
          onSelect={handleSelectLocal}
        />
      </div>

      <div className="space-y-2 pt-1 border-t border-[var(--skipo-border-color)]/60">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase text-amber-300 flex items-center gap-1">
            <Cloud size={11} /> Backblaze B2 connections
          </span>
          <button
            type="button"
            onClick={() => void fetchBackblazeConnections()}
            disabled={loadingBackblaze || !storageService?.listBackblazeAccounts}
            className="p-1 rounded text-[var(--skipo-text-muted)] hover:text-amber-300 cursor-pointer"
            title="Refresh Backblaze connections"
          >
            <RefreshCw size={11} className={loadingBackblaze ? 'animate-spin text-amber-300' : ''} />
          </button>
        </div>

        {backblazeConnections.length === 0 && !loadingBackblaze && (
          <div className="p-3 border border-dashed border-[var(--skipo-border-color)] text-[11px] text-[var(--skipo-text-muted)] rounded">
            No Backblaze B2 connections are available through Kloks for this account.
          </div>
        )}

        {backblazeConnections.map((connection) => (
          <BackblazeConnectionTile
            key={connection.id}
            account={connection}
            selectedBucketName={selectedBucket}
            isSelectedAccount={connection.id === activeId}
            onSelectBucket={handleSelectBackblazeBucket}
            userId={effectiveUserId}
            storageService={storageService}
          />
        ))}
      </div>
    </div>
  );
};
