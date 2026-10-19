// ══════════════════════════════════════════════════════════════════════════════
// FLOKS CANONICAL PAGE SHELL (frnlPage)
// Base page for all frontend pages of Skipo-based apps (KrnlTS backend + FrnlTS frontend)
// Features: frnlTopBar & frnlBottomBar enabled by default (toggleable),
// global dynamic hover inspection listener, tab manager, and responsive shell.
// ══════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { mountFrnlOrchestration, type FrnlOrchestrationDefinition } from '@ultrst-armada/frnlts';
import {
  BottomStripProvider,
  useBottomStrip,
} from '../components/bottom-strip/BottomStripContext.js';
import {
  frnlTopBar,
  type FrnlBreadcrumbItem,
  type FrnlTopBarTab,
  type FrnlUserProfile,
} from './frnlTopBar.js';
import {
  frnlBottomBar,
  type FrnlApiRequestLog,
} from './frnlBottomBar.js';

export interface FrnlPageTab extends FrnlTopBarTab {
  content?: React.ReactNode;
}

export interface FrnlPageProps {
  id?: string;
  title?: string;
  appName?: string;
  appLogo?: React.ReactNode;
  breadcrumbs?: FrnlBreadcrumbItem[];
  tabs?: FrnlPageTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  showTopBar?: boolean;
  showBottomBar?: boolean;
  topBarActions?: React.ReactNode;
  user?: FrnlUserProfile | null;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  autoSaveEnabled?: boolean;
  recentApiRequests?: FrnlApiRequestLog[];
  orchestrations?: readonly FrnlOrchestrationDefinition[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * Global hover/focus listener that inspects DOM elements for title, data-hover,
 * data-skipo-label, data-skipo-desc, or aria-label attributes and forwards to the Bottom Strip.
 */
function FrnlGlobalHoverInspector() {
  const { setInspectionText } = useBottomStrip();

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const el = target.closest(
        '[data-skipo-label], [data-hover], [title], [aria-label], button, a, input, select, textarea, [role="tab"], [role="button"]'
      ) as HTMLElement | null;

      if (el) {
        const label =
          el.getAttribute('data-skipo-label') ||
          el.getAttribute('data-hover') ||
          el.getAttribute('title') ||
          el.getAttribute('aria-label');

        const desc = el.getAttribute('data-skipo-desc');

        if (label || desc) {
          // If native title exists, clear it temporarily to prevent ugly browser tooltips
          if (el.hasAttribute('title') && !el.hasAttribute('data-frnl-original-title')) {
            el.setAttribute('data-frnl-original-title', el.getAttribute('title') || '');
            el.removeAttribute('title');
          }
          setInspectionText(label || null, desc || null);
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const el = target.closest('[data-frnl-original-title]') as HTMLElement | null;
      if (el) {
        const orig = el.getAttribute('data-frnl-original-title');
        if (orig) {
          el.setAttribute('title', orig);
          el.removeAttribute('data-frnl-original-title');
        }
      }
      setInspectionText(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [setInspectionText]);

  return null;
}

function FrnlPageInner({
  id = 'frnl-page',
  appName = 'Skipo App',
  appLogo,
  breadcrumbs,
  tabs = [],
  activeTabId,
  onTabChange,
  showTopBar = true,
  showBottomBar = true,
  topBarActions,
  user,
  onLogout,
  onOpenSettings,
  onSave,
  isSaving = false,
  recentApiRequests = [],
  className = '',
  children,
}: FrnlPageProps) {
  const store = useFloksFrnlStore();
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);
  const activeTab = activeTabId ?? internalActiveTab;

  useEffect(() => {
    const cleanups = orchestrations.map((orchestration) =>
      mountFrnlOrchestration(store, orchestration),
    );
    return () => {
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [orchestrations, store]);

  const handleTabChange = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    else setInternalActiveTab(tabId);
  };

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div
      id={id}
      data-frnl-component="frnlPage"
      className={`h-screen w-screen flex flex-col bg-[var(--skipo-bg,#0a0c10)] text-[var(--skipo-text-primary,#f8fafc)] font-mono select-none overflow-hidden ${className}`}
    >
      <FrnlGlobalHoverInspector />

      {/* ── Top Bar (Enabled by Default, Can be Disabled) ── */}
      {showTopBar && (
        React.createElement(frnlTopBar, {
          appName,
          appLogo,
          breadcrumbs,
          tabs,
          activeTabId: activeTab,
          onTabChange: handleTabChange,
          user,
          onLogout,
          onOpenSettings,
          actions: topBarActions,
        })
      )}

      {/* ── Main App Content ── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto relative p-4">
        {currentTab?.content ?? children}
      </main>

      {/* ── Bottom Bar (Enabled by Default, Can be Disabled) ── */}
      {showBottomBar && (
        React.createElement(frnlBottomBar, {
          onManualSave: onSave,
          isSaving,
          recentApiRequests,
        })
      )}
    </div>
  );
}

export const frnlPage: React.FC<FrnlPageProps> = (props) => {
  return (
    <BottomStripProvider initialAutoSave={props.autoSaveEnabled ?? true}>
      <FrnlPageInner {...props} />
    </BottomStripProvider>
  );
};

frnlPage.displayName = 'frnlPage';
