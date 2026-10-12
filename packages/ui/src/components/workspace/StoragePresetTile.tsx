// ══════════════════════════════════════════════════════════════════════════════
// SKIPO COMPONENT: Local Storage Preset Tile (< 200 lines)
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { HardDrive, CheckCircle2 } from 'lucide-react';

interface Props {
  conn: any;
  isSelected: boolean;
  onSelect: (conn: any) => void;
}

export const StoragePresetTile: React.FC<Props> = ({ conn, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(conn)}
      className={`p-3 border-2 rounded transition-all font-mono select-none cursor-pointer flex items-center justify-between ${
        isSelected
          ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
          : 'border-[var(--skipo-border-color)] bg-[var(--skipo-bg)] hover:border-emerald-500/60'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded border ${isSelected ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[var(--skipo-surface)] text-emerald-400 border-[var(--skipo-border-color)]'}`}>
          <HardDrive size={16} />
        </div>
        <div>
          <span className="text-xs font-black uppercase text-[var(--skipo-text)] block">
            {conn.label || conn.localFolderName || 'Local Workstation Vault'}
          </span>
          <span className="text-[10px] text-[var(--skipo-text-muted)] block">
            Directory: ./{conn.localFolderName || 'workspace'} (Deterministic local storage)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isSelected && (
          <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 rounded flex items-center gap-1">
            <CheckCircle2 size={10} /> SELECTED
          </span>
        )}
      </div>
    </div>
  );
};
