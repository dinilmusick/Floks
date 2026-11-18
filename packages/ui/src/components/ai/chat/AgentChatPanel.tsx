'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { BaseButton } from '../../base/BaseButton.js';
import { BaseTextarea } from '../../base/BaseTextarea.js';
import { DirectChatMessageList, type ChatMessage } from './DirectChatMessageList.js';
import {
  agentChatLabel, matchAgentMentions, selectedAgentIsValid,
  type AgentChatInvoker, type AgentChatTarget,
} from './AgentChatTypes.js';

export interface AgentChatPanelProps {
  targets: readonly AgentChatTarget[];
  appAgentId?: string;
  onInvoke?: AgentChatInvoker;
  onClose: () => void;
}

export function AgentChatPanel({ targets, appAgentId, onInvoke, onClose }: AgentChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<AgentChatTarget | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [continuation, setContinuation] = useState<{ targetId: string; invocationId: string } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);
  const sequence = () => `agent-chat-${++nextId.current}`;
  useEffect(() => { textarea.current?.focus(); }, []);

  const mentionAt = draft.lastIndexOf('@');
  const hasMention = mentionAt >= 0 && (mentionAt === 0 || /\s/.test(draft[mentionAt - 1]));
  const mentionQuery = hasMention ? draft.slice(mentionAt + 1) : '';
  const mentionChoices = useMemo(() => {
    if (!hasMention || selected || mentionQuery.includes('@')) return [];
    return matchAgentMentions(targets, mentionQuery).slice(0, 8);
  }, [hasMention, mentionQuery, selected, targets]);
  const appAgent = targets.find(t => t.kind === 'app' && t.id === appAgentId);
  const activeTarget = selectedAgentIsValid(selected, targets) ? selected : appAgent;
  const canSend = !!onInvoke && !!activeTarget && !busy && !!draft.trim();
  const addMessage = (role: ChatMessage['role'], content: string) =>
    setMessages(items => [...items, { id: sequence(), role, content }]);

  const choose = (agent: AgentChatTarget) => {
    const prefix = draft.slice(0, mentionAt);
    setDraft(`${prefix}@${agentChatLabel(agent)} `);
    setSelected(agent);
    setContinuation(null);
    setError('');
    textarea.current?.focus();
  };

  const send = async () => {
    if (!canSend || !activeTarget || !onInvoke) return;
    const token = selected && `@${agentChatLabel(selected)}`;
    const prompt = token ? draft.replace(token, ' ').replace(/ {2,}/g, ' ').trim() : draft.trim();
    const count = (draft.match(/(^|\s)@/g) ?? []).length;
    if (count > 1) { setError('Choose one agent per message.'); return; }
    if (count > 0 && !selected) { setError('Select an agent from the list.'); return; }
    if (!prompt) { setError('Enter a message for the agent.'); return; }
    const resume = continuation?.targetId === activeTarget.id ? continuation.invocationId : undefined;
    const request = { targetId: activeTarget.id, targetKind: activeTarget.kind, prompt, ...(resume ? { resumeInvocationId: resume } : {}) };
    addMessage('user', draft.trim());
    setDraft('');
    setSelected(null);
    setError('');
    setBusy(true);
    try {
      const reply = await onInvoke(request);
      if (reply.kind === 'needs_input' && reply.invocationId) {
        setContinuation({ targetId: activeTarget.id, invocationId: reply.invocationId });
      } else {
        setContinuation(null);
      }
      addMessage('assistant', reply.text);
    } catch {
      setContinuation(null);
      addMessage('system', 'Agent request failed. Check the connection or permissions.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section role="dialog" aria-label="Agent Chat" aria-modal="false"
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onClose(); }}
      onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
      className="fixed bottom-10 right-3 z-[1000] flex flex-col overflow-hidden rounded-lg border border-slate-500 bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100"
      style={{ width: 'min(440px, calc(100vw - 24px))', height: 'min(560px, calc(100vh - 64px))' }}>
      <header className="flex items-center justify-between border-b border-slate-300 px-3 py-2 dark:border-slate-700">
        <strong>Agent Chat</strong>
        <BaseButton type="button" variant="ghost" title="Close chat" aria-label="Close chat" onClick={onClose}><X size={16} /></BaseButton>
      </header>
      <DirectChatMessageList messages={messages} isStreaming={busy} className="flex-1 min-h-0" />
      {!targets.length || !onInvoke ? (
        <p role="status" className="p-3 text-xs text-slate-500">No agents configured.</p>
      ) : (
        <div className="border-t border-slate-300 p-3 dark:border-slate-700">
          <p className="mb-2 text-xs" aria-live="polite">
            {selected ? `To: ${agentChatLabel(selected)}` : appAgent ? `To: ${agentChatLabel(appAgent)}` : 'Mention an agent with @'}
          </p>
          {mentionChoices.length > 0 && (
            <div role="listbox" aria-label="Available agents" className="max-h-32 overflow-y-auto rounded border border-slate-400">
              {mentionChoices.map(agent => (
                <button key={`${agent.kind}:${agent.id}`} type="button" role="option" aria-selected="false"
                  onClick={() => choose(agent)} className="block w-full px-2 py-1 text-left text-xs hover:bg-slate-200 dark:hover:bg-slate-800">
                  {agentChatLabel(agent)} <span className="opacity-60">({agent.kind})</span>
                </button>
              ))}
            </div>
          )}
          <BaseTextarea ref={textarea} rows={2} value={draft}
            onChange={e => {
              const text = e.target.value;
              setDraft(text);
              if (selected && !text.includes(`@${agentChatLabel(selected)}`)) setSelected(null);
              setError('');
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Message or @agent" disabled={busy} aria-label="Agent message" />
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end">
            <BaseButton type="button" onClick={() => void send()} disabled={!canSend} title="Send message">
              <Send size={14} /> Send
            </BaseButton>
          </div>
        </div>
      )}
    </section>
  );
}
