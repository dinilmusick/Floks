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

function launch(props: { targets?: AgentChatTarget[]; appAgentId?: string; onInvoke?: AgentChatInvoker; scopeKey?: string } = {}) {
  render(<AppShell agentChat={{ scopeKey: props.scopeKey ?? 'user-a:workspace-a:session-1:grants-1',
    targets: props.targets ?? targets, appAgentId: props.appAgentId, onInvoke: props.onInvoke }}>
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

  it('resumes an endpoint clarification directly instead of falling back to the app agent', async () => {
    const onInvoke = vi.fn()
      .mockResolvedValueOnce({ kind: 'needs_input', text: 'Which SKU?', invocationId: 'endpoint-inv-9' })
      .mockResolvedValueOnce(completed);
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    const composer = within(dialog).getByRole('textbox', { name: 'Agent message' });
    fireEvent.change(composer, { target: { value: '@Warehouse' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /Warehouse Helper/ }));
    fireEvent.change(composer, { target: { value: '@Warehouse Helper check stock' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByText('Which SKU?')).toBeTruthy());
    fireEvent.change(composer, { target: { value: 'SKU-23' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenNthCalledWith(2, {
      targetId: 'endpoint-1', targetKind: 'endpoint', prompt: 'SKU-23', resumeInvocationId: 'endpoint-inv-9',
    }));
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

  it('fails closed when no verified scope is bound even if an invoker is provided', () => {
    const onInvoke = vi.fn().mockResolvedValue(completed);
    render(<AppShell agentChat={{ targets, appAgentId: 'app-1', onInvoke }}><div>App canvas</div></AppShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    const dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    expect(within(dialog).getByText('No agents configured.')).toBeTruthy();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(onInvoke).not.toHaveBeenCalled();
  });

  it('closes and destroys prior chat transcript on authenticated workspace change', async () => {
    const onInvoke = vi.fn().mockResolvedValue({ kind: 'completed', text: 'Private workspace A result' });
    const renderShell = (scopeKey: string) =>
      <AppShell agentChat={{ scopeKey, targets, appAgentId: 'app-1', onInvoke }}><div>App canvas</div></AppShell>;
    const app = render(renderShell('user-a:workspace-a:session-1:grants-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    const dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), { target: { value: 'private message' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByText('Private workspace A result')).toBeTruthy());
    app.rerender(renderShell('user-a:workspace-b:session-1:grants-1'));
    expect(screen.queryByRole('dialog', { name: 'Agent Chat' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    const newDialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    expect(within(newDialog).queryByText('Private workspace A result')).toBeNull();
    expect(within(newDialog).queryByText('private message')).toBeNull();
  });

  it('invalidates a pending clarification when authorization revision changes', async () => {
    const onInvoke = vi.fn()
      .mockResolvedValueOnce({ kind: 'needs_input', text: 'Which account?', invocationId: 'old-invocation' })
      .mockResolvedValueOnce(completed);
    const shell = (scopeKey: string, enabled = true) =>
      <AppShell agentChat={{ scopeKey, targets: enabled ? targets : [],
        appAgentId: enabled ? 'app-1' : undefined,
        onInvoke: enabled ? onInvoke : undefined }}><div>App canvas</div></AppShell>;
    const app = render(shell('user-a:workspace-a:session-1:grants-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    let dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), { target: { value: 'run report' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByText('Which account?')).toBeTruthy());
    app.rerender(shell('user-a:workspace-a:session-1:grants-2', false));
    expect(screen.queryByRole('dialog', { name: 'Agent Chat' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    expect(within(dialog).getByText('No agents configured.')).toBeTruthy();
    expect(onInvoke).toHaveBeenCalledTimes(1);
    app.rerender(shell('user-a:workspace-a:session-1:grants-3'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), { target: { value: 'new report' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenNthCalledWith(2, {
      targetId: 'app-1', targetKind: 'app', prompt: 'new report',
    }));
  });


  it('fails closed instead of rerouting a revoked selected endpoint to the app agent', () => {
    const onInvoke = vi.fn().mockResolvedValue(completed);
    const shell = (currentTargets: AgentChatTarget[]) =>
      <AppShell agentChat={{ scopeKey: 'scope-a', targets: currentTargets, appAgentId: 'app-1', onInvoke }}>
        <div>App canvas</div>
      </AppShell>;
    const app = render(shell(targets));
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    let dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    const composer = within(dialog).getByRole('textbox', { name: 'Agent message' });
    fireEvent.change(composer, { target: { value: '@Warehouse' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /Warehouse Helper/ }));
    app.rerender(shell([targets[0]]));
    dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    expect(within(dialog).getByRole('alert').textContent).toContain('unavailable');
    expect(within(dialog).getByRole('button', { name: 'Send message' }).hasAttribute('disabled')).toBe(true);
    expect(onInvoke).not.toHaveBeenCalled();
  });

  it('cannot redirect a revoked pending clarification to a different app agent', async () => {
    const onInvoke = vi.fn().mockResolvedValueOnce({
      kind: 'needs_input', text: 'Which SKU?', invocationId: 'sensitive-continuation',
    });
    const shell = (currentTargets: AgentChatTarget[]) =>
      <AppShell agentChat={{ scopeKey: 'scope-a', targets: currentTargets, appAgentId: 'app-1', onInvoke }}>
        <div>App canvas</div>
      </AppShell>;
    const app = render(shell(targets));
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    let dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    const composer = within(dialog).getByRole('textbox', { name: 'Agent message' });
    fireEvent.change(composer, { target: { value: '@Warehouse' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /Warehouse Helper/ }));
    fireEvent.change(composer, { target: { value: '@Warehouse Helper check stock' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByText('Which SKU?')).toBeTruthy());
    app.rerender(shell([targets[0]]));
    dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    expect(within(dialog).getByRole('alert').textContent).toContain('unavailable');
    expect(within(dialog).getByRole('button', { name: 'Send message' }).hasAttribute('disabled')).toBe(true);
    expect(onInvoke).toHaveBeenCalledTimes(1);
  });

  it('sends typed clarification values on the same invocation ID', async () => {
    const onInvoke = vi.fn().mockResolvedValueOnce({
      kind: 'needs_input', text: 'How many?', invocationId: 'typed-inv',
      fields: [{ key: 'count', label: 'Count', type: 'number', required: true }],
    }).mockResolvedValueOnce(completed);
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), {
      target: { value: 'Count inventory' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByText('How many?')).toBeTruthy());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    expect(within(dialog).getByRole('alert').textContent).toContain('Enter Count');
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Count/ }), { target: { value: '7' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenNthCalledWith(2, {
      targetId: 'app-1', targetKind: 'app', prompt: '',
      resumeInvocationId: 'typed-inv', parameters: { count: 7 },
    }));
  });

  it('cancels an in-flight invocation and ignores its late response', async () => {
    let finish!: (value: { kind: 'completed'; text: string }) => void;
    const onInvoke = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const onCancel = vi.fn().mockResolvedValue(undefined);
    render(<AppShell agentChat={{ scopeKey: 'scope-a', targets, appAgentId: 'app-1', onInvoke, onCancel }}>
      <div>App canvas</div>
    </AppShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Agent Chat' }));
    const dialog = screen.getByRole('dialog', { name: 'Agent Chat' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), {
      target: { value: 'Generate report' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(onInvoke).toHaveBeenCalledTimes(1));
    const options = onInvoke.mock.calls[0][1];
    expect(options.signal.aborted).toBe(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel agent request' }));
    expect(options.signal.aborted).toBe(true);
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith({
      targetId: 'app-1', targetKind: 'app',
    }));
    finish({ kind: 'completed', text: 'Late private result' });
    await waitFor(() => expect(within(dialog).queryByText('Late private result')).toBeNull());
  });

  it('surfaces denied or failed invocations without injecting a success transcript', async () => {
    const onInvoke = vi.fn().mockResolvedValue({ kind: 'failed', text: 'Private backend details' });
    const dialog = launch({ appAgentId: 'app-1', onInvoke });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Agent message' }), {
      target: { value: 'Blocked call' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(within(dialog).getByRole('alert').textContent).toContain('denied'));
    expect(within(dialog).queryByText('Private backend details')).toBeNull();
  });
});
