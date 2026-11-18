// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EmbeddedAikoModule, type EmbeddedAikoRuntime } from './AikoModule.js';

afterEach(cleanup);

it('loads and executes an agent without requesting central credential access', async () => {
  const runtime: EmbeddedAikoRuntime = {
    listAgents: async () => [{ id: 'mix', name: 'Mixer', agentType: 'ENDPOINT' }],
    executeAgent: vi.fn(async () => ({ level: 4 })),
  };
  render(<EmbeddedAikoModule runtime={runtime} workspaceId="studio" />);
  await screen.findByRole('heading', { name: 'Mixer' });
  expect(screen.queryByText('API Keys')).toBeNull();
  expect(screen.queryByText('Fetch from Aiko Engine')).toBeNull();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Read level' } });
  fireEvent.click(screen.getByRole('button', { name: 'Execute' }));
  await waitFor(() => expect(runtime.executeAgent).toHaveBeenCalledWith('mix', 'Read level'));
  await screen.findByText(/"level": 4/);
});
