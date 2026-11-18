'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { BaseButton } from '../../base/BaseButton.js';
import { BaseTextarea } from '../../base/BaseTextarea.js';
import { DirectChatMessageList, type ChatMessage } from './DirectChatMessageList.js';
import {
  agentChatLabel, matchAgentMentions, selectedAgentIsValid,
  type AgentChatInvoker, type AgentChatTarget, type AgentChatCanceller, type AgentChatClarificationField,
} from './AgentChatTypes.js';

export interface AgentChatPanelProps {
  targets: readonly AgentChatTarget[];
  appAgentId?: string;
  onInvoke?: AgentChatInvoker;
  /** Host-side cancellation of an authenticated invocation. */
  onCancel?: AgentChatCanceller;
  onClose: () => void;
}

export function AgentChatPanel({ targets, appAgentId, onInvoke, onCancel, onClose }: AgentChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<AgentChatTarget | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [continuation, setContinuation] = useState<{
    targetId: string; targetKind: AgentChatTarget['kind']; invocationId: string;
    fields?: readonly AgentChatClarificationField[];
  } | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);
  const inFlight = useRef(false);
  const requestRevision = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const currentRequest = useRef<{ targetId: string; targetKind: AgentChatTarget['kind']; invocationId?: string } | null>(null);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  useEffect(() => () => {
    requestRevision.current++;
    controller.current?.abort();
  }, []);
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
  const continuationTarget = continuation && targets.find(t =>
    t.id === continuation.targetId && t.kind === continuation.targetKind);
  // Never route a revoked mention or continuation to the default app agent.
  const activeTarget = selected
    ? (selectedAgentIsValid(selected, targets) ? selected : undefined)
    : continuation ? continuationTarget : appAgent;
  const unavailable = (!!selected && !selectedAgentIsValid(selected, targets)) ||
    (!!continuation && !continuationTarget);
  const hasTypedFields = !!continuation?.fields?.length;
  const canSend = !!onInvoke && !!activeTarget && !unavailable && !busy &&
    (!!draft.trim() || hasTypedFields);
  const addMessage = (role: ChatMessage['role'], content: string) =>
    setMessages(items => [...items, { id: sequence(), role, content }]);

  const choose = (agent: AgentChatTarget) => {
    const prefix = draft.slice(0, mentionAt);
    setDraft(`${prefix}@${agentChatLabel(agent)} `);
    setSelected(agent);
    setContinuation(null);
    setFieldValues({});
    setError('');
    textarea.current?.focus();
  };

  const cancel = () => {
    const active = currentRequest.current;
    requestRevision.current++;
    controller.current?.abort();
    controller.current = null;
    currentRequest.current = null;
    inFlight.current = false;
    setBusy(false);
    setContinuation(null);
    setFieldValues({});
    if (active && onCancel) {
      void Promise.resolve().then(() => onCancel(active)).catch(() => {
        setError('Unable to confirm remote cancellation.');
      });
    }
  };

  const send = async () => {
    if (!canSend || !activeTarget || !onInvoke || inFlight.current) return;
    const token = selected && `@${agentChatLabel(selected)}`;
    const prompt = token ? draft.replace(token, ' ').replace(/ {2,}/g, ' ').trim() : draft.trim();
    const count = (draft.match(/(^|\s)@/g) ?? []).length;
    if (count > 1) { setError('Choose one agent per message.'); return; }
    if (count > 0 && !selected && !continuation) { setError('Select an agent from the list.'); return; }
    if (unavailable || !targetsRef.current.some(t => t.id === activeTarget.id && t.kind === activeTarget.kind)) {
      setError('This agent is no longer available. Refresh the authorized agent list.');
      return;
    }
    const fields = continuation?.fields ?? [];
    const parameters: Record<string, string | number | boolean> = {};
    for (const field of fields) {
      const raw = fieldValues[field.key];
      if (field.type === 'boolean') {
        parameters[field.key] = raw === true;
      } else if (field.type === 'number') {
        if (raw === undefined || raw === '') {
          if (field.required) { setError(`Enter ${field.label}.`); return; }
          continue;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) { setError(`${field.label} must be a number.`); return; }
        parameters[field.key] = parsed;
      } else {
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (!value) { if (field.required) { setError(`Enter ${field.label}.`); return; } continue; }
        parameters[field.key] = value;
      }
    }
    if (!prompt && !fields.length) { setError('Enter a message for the agent.'); return; }
    const resume = continuation?.targetId === activeTarget.id &&
      continuation.targetKind === activeTarget.kind ? continuation.invocationId : undefined;
    const request = { targetId: activeTarget.id, targetKind: activeTarget.kind, prompt,
      ...(resume ? { resumeInvocationId: resume } : {}),
      ...(fields.length ? { parameters } : {}) };
    addMessage('user', prompt || 'Submitted clarification fields');
    setDraft('');
    setSelected(null);
    setError('');
    inFlight.current = true;
    setBusy(true);
    const revision = ++requestRevision.current;
    const abort = new AbortController();
    controller.current = abort;
    currentRequest.current = { targetId: activeTarget.id, targetKind: activeTarget.kind,
      ...(resume ? { invocationId: resume } : {}) };
    try {
      // Legacy invokers remain compatible. Cancellation-aware hosts accept an AbortSignal.
      const reply = onCancel ? await onInvoke(request, { signal: abort.signal }) : await onInvoke(request);
      if (revision !== requestRevision.current || abort.signal.aborted) return;
      if (!targetsRef.current.some(t => t.id === activeTarget.id && t.kind === activeTarget.kind)) {
        setContinuation(null);
        setFieldValues({});
        setError('The agent is no longer authorized or available.');
        return;
      }
      if (reply.kind === 'needs_input' && reply.invocationId) {
        // UI hints are advisory; authoritative parsing and validation remain server-side.
        const seen = new Set<string>();
        const fields = (reply.fields ?? []).filter(field => {
          if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(field.key) || seen.has(field.key) ||
            !['text', 'number', 'boolean'].includes(field.type) || !field.label.trim()) return false;
          seen.add(field.key); return true;
        }).slice(0, 16);
        setContinuation({ targetId: activeTarget.id, targetKind: activeTarget.kind,
          invocationId: reply.invocationId, fields });
        setFieldValues({});
      } else {
        setContinuation(null);
        setFieldValues({});
      }
      if (reply.kind === 'failed') setError('Agent request failed or was denied.');
      else addMessage('assistant', reply.text);
    } catch {
      if (revision !== requestRevision.current || abort.signal.aborted) return;
      setContinuation(null);
      setFieldValues({});
      setError('Agent request failed. Check the connection or permissions.');
    } finally {
      if (revision === requestRevision.current) {
        inFlight.current = false;
        controller.current = null;
        currentRequest.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <section role="dialog" aria-label="Agent Chat" aria-modal="false"
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { if (busy) cancel(); onClose(); } }}
      onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
      className="fixed bottom-10 right-3 z-[1000] flex flex-col overflow-hidden rounded-lg border border-slate-500 bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100"
      style={{ width: 'min(440px, calc(100vw - 24px))', height: 'min(560px, calc(100vh - 64px))' }}>
      <header className="flex items-center justify-between border-b border-slate-300 px-3 py-2 dark:border-slate-700">
        <strong>Agent Chat</strong>
        <BaseButton type="button" variant="ghost" title="Close chat" aria-label="Close chat" onClick={() => { if (busy) cancel(); onClose(); }}><X size={16} /></BaseButton>
      </header>
      <DirectChatMessageList messages={messages} isStreaming={busy} className="flex-1 min-h-0" />
      {!targets.length || !onInvoke ? (
        <p role="status" className="p-3 text-xs text-slate-500">No agents configured.</p>
      ) : (
        <div className="border-t border-slate-300 p-3 dark:border-slate-700">
          {unavailable && <p role="alert" className="mb-2 text-xs text-red-600">
            The selected agent is unavailable. Refresh your authorized agents.
          </p>}
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
          {continuation?.fields?.map(field => (
            <label key={field.key} className="mb-2 block text-xs">
              <span>{field.label}{field.required ? ' (required)' : ''}</span>
              {field.type === 'boolean' ? (
                <input type="checkbox" className="ml-2" checked={fieldValues[field.key] === true}
                  disabled={busy || unavailable}
                  onChange={e => setFieldValues(values => ({ ...values, [field.key]: e.target.checked }))} />
              ) : (
                <input type={field.type === 'number' ? 'number' : 'text'}
                  value={String(fieldValues[field.key] ?? '')}
                  disabled={busy || unavailable}
                  onChange={e => setFieldValues(values => ({ ...values, [field.key]: e.target.value }))}
                  className="mt-1 block w-full rounded border border-slate-400 bg-transparent p-2" />
              )}
            </label>
          ))}
          <BaseTextarea ref={textarea} rows={2} value={draft}
            onChange={e => {
              const text = e.target.value;
              setDraft(text);
              if (selected && !text.includes(`@${agentChatLabel(selected)}`)) setSelected(null);
              setError('');
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={hasTypedFields ? 'Optional clarification note' : 'Message or @agent'}
            disabled={busy || unavailable} aria-label="Agent message" />
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            {onCancel && (busy || !!continuation) && (
              <BaseButton type="button" variant="ghost" onClick={cancel}
                title="Cancel agent request" aria-label="Cancel agent request">
                Cancel
              </BaseButton>
            )}
            <BaseButton type="button" onClick={() => void send()} disabled={!canSend} title="Send message" aria-label="Send message">
              <Send size={14} /> Send
            </BaseButton>
          </div>
        </div>
      )}
    </section>
  );
}
