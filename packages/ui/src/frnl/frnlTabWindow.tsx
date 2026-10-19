// ══════════════════════════════════════════════════════════════════════════════
// FLOKS CANONICAL TAB WINDOW (frnlTabWindow)
// Strictly flat tab navigation and content pane manager
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { frnlButton } from './frnlButton.js';
import { useBottomStrip } from '../components/bottom-strip/index.js';

export interface FrnlTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface FrnlTabWindowProps {
  id?: string;
  tabs: FrnlTabItem[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const frnlTabWindow: React.FC<FrnlTabWindowProps> = ({
  id = 'frnl-tab-window',
  tabs,
  activeTabId,
  onTabChange,
  className = '',
  children,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);
  const activeId = activeTabId ?? internalActiveTab;
  const { setInspectionText } = useBottomStrip();

  const handleSelect = (tab: FrnlTabItem) => {
    if (tab.disabled) return;
    if (onTabChange) onTabChange(tab.id);
    else setInternalActiveTab(tab.id);
  };

  const currentTab = tabs.find((t) => t.id === activeId);

  return (
    <div
      id={id}
      data-frnl-component="frnlTabWindow"
      className={`flex flex-col w-full h-full min-h-0 bg-[var(--skipo-bg,#0a0c10)] text-[var(--skipo-text-primary,#f8fafc)] font-mono ${className}`}
    >
      {/* Flat Tab Bar (Zero Nested Tabs) */}
      <div className="h-10 border-b border-[var(--skipo-border-color,#334155)] bg-[var(--skipo-surface,#14171f)] px-3 flex items-center gap-1 shrink-0 select-none overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => handleSelect(tab)}
              onMouseEnter={() => {
                if (tab.label || tab.description) {
                  setInspectionText(
                    `TAB: ${tab.label.toUpperCase()}`,
                    tab.description || `Switch to ${tab.label} tab view`
                  );
                }
              }}
              onMouseLeave={() => setInspectionText(null)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-[var(--skipo-bg-panel,#0f172a)] text-[var(--skipo-accent,#38bdf8)] border border-[var(--skipo-border-subtle,#334155)]'
                  : 'text-[var(--skipo-text-muted,#94a3b8)] hover:text-white hover:bg-[var(--skipo-bg-subtle,#1e293b)] border border-transparent'
              }`}
            >
              {tab.icon && <span className="w-3.5 h-3.5 shrink-0 flex items-center">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Viewport */}
      <div className="flex-1 overflow-auto p-4 min-h-0 relative">
        {currentTab?.content ?? children}
      </div>
    </div>
  );
};

frnlTabWindow.displayName = 'frnlTabWindow';
