import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const service = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@ultrst-armada/kloks/services', () => ({
  MonacoIdeServiceFacade: service,
}));

vi.mock('./useMonaco.js', () => ({
  useMonaco: () => null,
}));

import { MonacoEditor } from './MonacoEditor.js';

afterEach(() => {
  cleanup();
  service.execute.mockClear();
});

describe('Floks MonacoEditor', () => {
  it('uses the canonical Kloks service by default and disposes its session', async () => {
    const view = render(<MonacoEditor value="const answer = 42" language="typescript" />);

    await waitFor(() => {
      expect(service.execute).toHaveBeenCalledWith('createSession', expect.objectContaining({
        language: 'typescript',
        value: 'const answer = 42',
      }));
    });

    const createCall = service.execute.mock.calls.find(([operation]) => operation === 'createSession');
    expect(createCall).toBeDefined();
    const created = createCall?.[1] as { sessionId: string };
    view.unmount();

    await waitFor(() => {
      expect(service.execute).toHaveBeenCalledWith('disposeSession', { sessionId: created.sessionId });
    });
  });

  it('allows an explicit service adapter to override the default', async () => {
    const explicitService = { execute: vi.fn().mockResolvedValue(undefined) };
    render(<MonacoEditor value="" ideService={explicitService} />);

    await waitFor(() => expect(explicitService.execute).toHaveBeenCalledWith(
      'createSession', expect.objectContaining({ value: '' }),
    ));
    expect(service.execute).not.toHaveBeenCalled();
  });
});
