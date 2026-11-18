import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../layout/AppShell.js';
import type { AgentChatInvoker, AgentChatTarget } from './AgentChatTypes.js';

const targets: AgentChatTarget[] = [
  { id: 'app-1', kind: 'app', name: 'Desk' },
  { id: 'endpoint-1', kind: 'endpoint', name: 'Inventory', alias: 'Warehouse Helper' },
  { id: 'workflow-1', kind: 'workflow', name: 'Evening Report' },
];
const completed = { kind: 'completed' as const, text: 'Done.' };

function launch(props: { targets?: AgentChatTarget[]; appAgentId?: string; onInvoke?: AgentChatInvoker } = {}) {
  render(<AppShell agentChat={{ targets: props.targets ?? targets, appAgentId: props.appAgentId, onInvoke: props.onInvoke }}>
    <div>App canvas</div>
  </AppShell>);
  fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
  return screen.getByRole('dialog', { name: 'Agent Chat' });
}

describe('Agent Chat bottom strip', () => {
  it('opens a useful state without loading or invoking agents', () => {
    const dialog = launch({ targets: [] });
    expect(within(dialog).getByText('No agents configured.')).toBeTruthy();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close chat' }));
    expect(screen.queryByRole('dialog', { name: 'Agent Chat' })).toBeNull();
  });

  it('routes an unaddressed message to the configured app agent', async () => {
    const onInvoke = vi.fn().mockResolvedValue(completed);
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), { target: { value: 'Summarize today' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenCalledWith({ targetId: 'app-1', targetKind: 'app', prompt: 'Summarize today' }));
    expect(within(dialog).getByText('Done.')).toBeTruthy();
  });

  it('uses the stable endpoint ID, not the editable @alias', async () => {
    const onInvoke = vi.fn().mockResolvedValue(completed);
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    const composer = within(dialog).getByRole('textbox', { name: 'Agent message' });
    fireEvent.change(composer, { target: { value: 'please @Warehouse' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /Warehouse Helper/ }));
    fireEvent.change(composer, { target: { value: 'please @Warehouse Helper check stock' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenCalledWith({ targetId: 'endpoint-1', targetKind: 'endpoint', prompt: 'please check stock' }));
  });

  it('rejects an unresolved mention instead of incorrectly invoking the app agent', () => {
    const onInvoke = vi.fn().mockResolvedValue(completed);
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), { target: { value: '@unknown check' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    expect(within(dialog).getByRole('alert').textContent).toContain('Select an agent');
    expect(onInvoke).not.toHaveBeenCalled();
  });

  it('resumes a typed clarification on the same invocation', async () => {
    const onInvoke = vi.fn()
      .mockResolvedValueOnce({ kind: 'needs_input', text: 'Which date?', invocationId: 'inv-123' })
      .mockResolvedValueOnce(completed);
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    const composer = within(dialog).getByRole('textbox', { name: 'Agent message' });
    fireEvent.change(composer, { target: { value: 'Run report' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByText('Which date?')).toBeTruthy());
    fireEvent.change(composer, { target: { value: 'Tomorrow' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenNthCalledWith(2, { targetId: 'app-1', targetKind: 'app', prompt: 'Tomorrow', resumeInvocationId: 'inv-123' }));
  });
});
