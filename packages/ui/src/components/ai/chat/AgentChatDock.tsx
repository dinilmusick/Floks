'use client';
import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import { AgentChatPanel, type AgentChatPanelProps } from './AgentChatPanel.js';

export type AgentChatDockProps = Omit<AgentChatPanelProps, 'onClose'>;

export function AgentChatDock(props: AgentChatDockProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <>
      <button type="button" aria-label="Agent Chat" aria-expanded={open} aria-controls={panelId}
        title="Agent Chat" onClick={() => setOpen(value => !value)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">
        <MessageCircle size={13} /> Chat
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div id={panelId}><AgentChatPanel {...props} onClose={() => setOpen(false)} /></div>,
        document.body
      )}
    </>
  );
}
