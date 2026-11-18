'use client';
import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import { AgentChatPanel, type AgentChatPanelProps } from './AgentChatPanel.js';

/**
 * The host supplies an opaque, non-secret scope revision for the authenticated
 * principal, app, workspace, active session, and permission/grant revision.
 * Changing any of those MUST change scopeKey. No agent invocation is exposed
 * until a valid scopeKey and host-authorized invoker are supplied.
 */
export type AgentChatDockProps = Omit<AgentChatPanelProps, 'onClose'> & {
  scopeKey?: string;
};

export function AgentChatDock(props: AgentChatDockProps) {
  const scope = props.scopeKey?.trim() || null;
  const [openedForScope, setOpenedForScope] = useState<{ scope: string | null } | null>(null);
  const panelId = useId();
  // A changed scope invalidates the open panel in the same render, before an
  // effect runs; the old chat history and continuation are unmounted.
  const open = openedForScope !== null && openedForScope.scope === scope;

  useEffect(() => {
    setOpenedForScope(null);
  }, [scope]);

  // A disabled/unbound app can show the dock but cannot send calls; the host
  // must not expose an authorized catalogue or invoker without a scope.
  const active = scope !== null && !!props.onInvoke;
  const targets = active ? props.targets : [];

  return (
    <>
      <button type="button" aria-label="Agent Chat" aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="Agent Chat" onClick={() => setOpenedForScope(current =>
          current?.scope === scope ? null : { scope })}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">
        <MessageCircle size={13} /> Chat
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div id={panelId} key={scope ?? 'unbound'}>
          <AgentChatPanel targets={targets} appAgentId={active ? props.appAgentId : undefined}
            onInvoke={active ? props.onInvoke : undefined} onClose={() => setOpenedForScope(null)} />
        </div>,
        document.body
      )}
    </>
  );
}
