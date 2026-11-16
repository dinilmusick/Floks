/**
 * Deprecated compatibility component for older internal screens.
 *
 * Bucket discovery is only performed through an injected canonical Kloks
 * storage service. This component accepts opaque connection metadata only;
 * it never receives provider keys or calls application-local SRKL routes.
 */
import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, RefreshCw } from 'lucide-react';

export interface SrklBackblazeAccount {
  id: string;
  name: string;
  provider: string;
}

interface Props {
  account: SrklBackblazeAccount;
  selectedBucketName?: string;
  isSelectedAccount: boolean;
  onSelectBucket: (account: SrklBackblazeAccount, bucketName: string) => void;
  userId?: string;
  storageService?: {
    listBackblazeBuckets?: (connectionId: string, userId: string) => Promise<any[]>;
  };
}

export const SrklBackblazeTile: React.FC<Props> = ({
  account,
  selectedBucketName,
  isSelectedAccount,
  onSelectBucket,
  userId,
  storageService,
}) => {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBuckets = async () => {
    if (!storageService?.listBackblazeBuckets || !userId) {
      setBuckets([]);
      return;
    }
    setLoading(true);
    try {
      const result = await storageService.listBackblazeBuckets(account.id, userId);
      setBuckets(Array.isArray(result) ? result : []);
    } catch {
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBuckets();
  }, [account.id, userId, storageService]);

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
          onClick={() => void fetchBuckets()}
          disabled={loading || !storageService?.listBackblazeBuckets}
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
          {buckets.map((bucket) => {
            const bucketName = bucket.bucketName || bucket.name;
            if (!bucketName) return null;
            const selected = isSelectedAccount && selectedBucketName === bucketName;
            return (
              <button
                key={bucket.bucketId || bucketName}
                type="button"
                onClick={() => onSelectBucket(account, bucketName)}
                className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 border transition-all cursor-pointer ${
                  selected
                    ? 'border-amber-400 bg-amber-400 text-black shadow-sm font-black'
                    : 'border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] hover:border-amber-400/80 text-[var(--skipo-text)]'
                }`}
              >
                {selected && <CheckCircle2 size={10} />}
                <span>{bucketName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
