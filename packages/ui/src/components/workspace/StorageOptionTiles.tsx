// ══════════════════════════════════════════════════════════════════════════════
// SKIPO COMPONENT: Storage Option Tiles (Local Workstation vs SRKL Backblaze B2)
// Automatically discovers Backblaze accounts from SRKL (< 200 lines).
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, Cloud, RefreshCw } from 'lucide-react';
import { StoragePresetTile } from './StoragePresetTile.js';
import { SrklBackblazeTile, SrklBackblazeAccount } from './SrklBackblazeTile.js';

export interface StorageSelection {
  provider: 'local_fs' | 'backblaze_b2';
  connectionId?: string;
  localFolderName?: string;
  localFolderKey?: string;
  b2BucketName?: string;
  b2Endpoint?: string;
  b2Region?: string;
}

interface Props {
  currentUser?: { id: string; email: string; name?: string } | null;
  userId?: string;
  selectedProvider?: string;
  selectedConnectionId?: string;
  storageService?: {
    listBackblazeAccounts?: (userId: string) => Promise<any[]>;
    listBackblazeBuckets?: (accountId: string, userId: string) => Promise<any[]>;
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
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [srklAccounts, setSrklAccounts] = useState<SrklBackblazeAccount[]>([]);
  const [loadingSrkl, setLoadingSrkl] = useState(false);
  const effectiveUserId = currentUser?.id || userId || '';

  const fetchSrklAccounts = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoadingSrkl(true);
    try {
      if (storageService?.listBackblazeAccounts) {
        const accs = await storageService.listBackblazeAccounts(effectiveUserId);
        if (Array.isArray(accs) && accs.length > 0) {
          setSrklAccounts(accs);
          return;
        }
      }
      const uId = encodeURIComponent(effectiveUserId);
      const res = await fetch(`/api/srkl/accounts?service=backblaze&userId=${uId}`);
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.accounts)) {
        setSrklAccounts(data.accounts);
      }
    } catch {
      // fallback
    } finally {
      setLoadingSrkl(false);
    }
  }, [effectiveUserId, storageService]);

  useEffect(() => {
    fetchSrklAccounts();
  }, [fetchSrklAccounts]);

  const handleSelectLocal = (conn: any) => {
    setActiveId(conn.id);
    setSelectedBucket('');
    onSelectStorage({
      provider: 'local_fs',
      connectionId: conn.id,
      localFolderName: conn.localFolderName || 'Local-Vault',
      localFolderKey: conn.localFolderKey,
    });
  };

  const handleSelectSrklBucket = (account: SrklBackblazeAccount, bucketName: string) => {
    setActiveId(account.id);
    setSelectedBucket(bucketName);
    const creds = account.credentials || {};
    onSelectStorage({
      provider: 'backblaze_b2',
      connectionId: account.id,
      b2BucketName: bucketName,
      b2Endpoint: creds.endpoint,
      b2Region: creds.region || 'us-east-005',
    });
  };

  const defaultLocalConn = {
    id: 'local_default',
    label: 'Local Workstation Vault',
    localFolderName: 'Local-Vault',
    provider: 'local_fs',
  };

  return (
    <div className="space-y-4 font-mono select-none">
      {/* 1. Local Storage Vault Option */}
      <div className="space-y-2">
        <span className="text-[9px] font-black uppercase text-[var(--skipo-text-muted)] flex items-center gap-1">
          <HardDrive size={11} /> 1. Local Filesystem (Workstation Vault)
        </span>
        <StoragePresetTile
          conn={defaultLocalConn}
          isSelected={activeId === defaultLocalConn.id && !selectedBucket}
          onSelect={handleSelectLocal}
        />
      </div>

      {/* 2. SRKL Federated Backblaze B2 Accounts */}
      <div className="space-y-2 pt-1 border-t border-[var(--skipo-border-color)]/60">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase text-amber-300 flex items-center gap-1">
            <Cloud size={11} /> 2. Backblaze B2 (Federated from SRKL)
          </span>
          <button
            type="button"
            onClick={fetchSrklAccounts}
            disabled={loadingSrkl}
            className="p-1 rounded text-[var(--skipo-text-muted)] hover:text-amber-300 cursor-pointer"
            title="Refresh SRKL Accounts"
          >
            <RefreshCw size={11} className={loadingSrkl ? 'animate-spin text-amber-300' : ''} />
          </button>
        </div>

        {srklAccounts.length === 0 && !loadingSrkl && (
          <div className="p-3 border border-dashed border-[var(--skipo-border-color)] text-[11px] text-[var(--skipo-text-muted)] rounded">
            No Backblaze B2 accounts linked in your SRKL profile. Configure Backblaze in SRKL to pick buckets here.
          </div>
        )}

        {srklAccounts.map((account) => (
          <SrklBackblazeTile
            key={account.id}
            account={account}
            selectedBucketName={selectedBucket}
            isSelectedAccount={account.id === activeId}
            onSelectBucket={handleSelectSrklBucket}
            userId={effectiveUserId}
            storageService={storageService}
          />
        ))}
      </div>
    </div>
  );
};
