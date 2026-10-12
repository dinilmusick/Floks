// ══════════════════════════════════════════════════════════════════════════════
// SKIPO COMPONENT: SRKL Federated Backblaze B2 Tile (< 200 lines)
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, RefreshCw } from 'lucide-react';

export interface SrklBackblazeAccount {
  id: string;
  name: string;
  provider: string;
  credentials?: {
    keyId?: string;
    b2KeyId?: string;
    applicationKey?: string;
    b2ApplicationKey?: string;
    bucketName?: string;
    region?: string;
    endpoint?: string;
  };
}

interface Props {
  account: SrklBackblazeAccount;
  selectedBucketName?: string;
  isSelectedAccount: boolean;
  onSelectBucket: (account: SrklBackblazeAccount, bucketName: string) => void;
  userId?: string;
}

export const SrklBackblazeTile: React.FC<Props> = ({
  account,
  selectedBucketName,
  isSelectedAccount,
  onSelectBucket,
  userId,
}) => {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const creds = account.credentials || (account as any).metadata?.credentials || {};
      const keyId = creds.keyId || creds.b2KeyId || '';
      const applicationKey = creds.applicationKey || creds.b2ApplicationKey || '';
      const defaultBucket = creds.bucketName || 'ultrst-apps';

      const res = await fetch('/api/srkl/backblaze/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, applicationKey, userId, bucketName: defaultBucket }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.buckets)) {
        setBuckets(data.buckets);
      } else {
        setBuckets([{ bucketId: 'default', bucketName: defaultBucket }]);
      }
    } catch {
      setBuckets([{ bucketId: 'default', bucketName: 'ultrst-apps' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, [account.id]);

  return (
    <div className={`p-3 border-2 rounded transition-all font-mono select-none ${
      isSelectedAccount
        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
        : 'border-[var(--skipo-border-color)] bg-[var(--skipo-bg)] hover:border-amber-400/60'
    }`}>
      <div className="flex items-center justify-between pb-2 border-b border-[var(--skipo-border-color)]/60">
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-amber-400" />
          <span className="text-xs font-black uppercase text-[var(--skipo-text)] truncate max-w-[180px]">
            {account.name}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchBuckets}
          disabled={loading}
          className="p-1 text-[var(--skipo-text-muted)] hover:text-amber-300 rounded cursor-pointer"
          title="Refresh buckets"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin text-amber-400' : ''} />
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        <span className="text-[9px] font-bold uppercase text-[var(--skipo-text-muted)] block">
          Select Target B2 Bucket:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {buckets.map((b) => {
            const bName = b.bucketName || b.name || 'ultrst-apps';
            const isSelected = isSelectedAccount && selectedBucketName === bName;
            return (
              <button
                key={b.bucketId || bName}
                type="button"
                onClick={() => onSelectBucket(account, bName)}
                className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400 text-black shadow-sm font-black'
                    : 'border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] hover:border-amber-400/80 text-[var(--skipo-text)]'
                }`}
              >
                {isSelected && <CheckCircle2 size={10} />}
                <span>{bName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
