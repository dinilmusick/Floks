import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const service = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue(undefined),
}));
const monacoHarness = vi.hoisted(() => ({ current: null as any }));

vi.mock('@ultrst-armada/kloks/services', () => ({
  MonacoIdeServiceFacade: service,
}));

vi.mock('./useMonaco.js', () => ({
  useMonaco: () => monacoHarness.current,
}));

import { MonacoEditor } from './MonacoEditor.js';

afterEach(() => {
  cleanup();
  service.execute.mockClear();
  monacoHarness.current = null;
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


it('wires diagnostics, validation results, and language completions into Monaco', async () => {
  let currentValue = 'const answer';
  let changeHandler: (() => void) | undefined;
  let completionRegistration: any;
  const externalDiagnostic = {
    message: 'External warning', severity: 'warning' as const,
    startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 3,
  };
  const validationDiagnostic = {
    message: 'Validated error', severity: 'error' as const,
    startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 8,
  };
  const model = {
    getValue: () => currentValue,
    getLanguageId: () => 'typescript',
    getOffsetAt: () => currentValue.length,
    getWordUntilPosition: () => ({ startColumn: 1, endColumn: 4 }),
    uri: { toString: () => 'inmemory://test.ts' },
  };
  const editor = {
    getModel: () => model,
    getValue: () => currentValue,
    onDidChangeModelContent: (callback: () => void) => {
      changeHandler = callback;
      return { dispose: vi.fn() };
    },
    updateOptions: vi.fn(),
    dispose: vi.fn(),
    setValue: vi.fn((value: string) => { currentValue = value; }),
  };
  const setModelMarkers = vi.fn();
  const providerDispose = vi.fn();
  monacoHarness.current = {
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
    editor: {
      create: vi.fn(() => editor),
      setModelLanguage: vi.fn(),
      setTheme: vi.fn(),
      setModelMarkers,
    },
    languages: {
      CompletionItemKind: { Text: 0, Function: 1 },
      registerCompletionItemProvider: vi.fn((_language: string, provider: any) => {
        completionRegistration = provider;
        return { dispose: providerDispose };
      }),
    },
  };
  const validate = vi.fn(async () => [validationDiagnostic]);
  const completionProvider = vi.fn(async () => [{ label: 'answer', kind: 'Function' }]);
  const view = render(
    <MonacoEditor
      value={currentValue}
      language="typescript"
      diagnostics={[externalDiagnostic]}
      onValidate={validate}
      completionProvider={completionProvider}
    />,
  );

  await waitFor(() => expect(setModelMarkers).toHaveBeenCalled());
  expect(setModelMarkers).toHaveBeenCalledWith(model, 'kloks', expect.arrayContaining([
    expect.objectContaining({ message: 'External warning', severity: 4, source: 'kloks' }),
  ]));

  currentValue = 'const answer = 42';
  changeHandler?.();
  await waitFor(() => expect(validate).toHaveBeenCalledWith(expect.objectContaining({
    value: 'const answer = 42', language: 'typescript', uri: expect.stringMatching(/^inmemory:\/\/editor-/),
  })));
  await waitFor(() => expect(service.execute).toHaveBeenCalledWith(
    'setDiagnostics',
    expect.objectContaining({ diagnostics: [validationDiagnostic] }),
  ));

  const completionResult = await completionRegistration.provideCompletionItems(model, { lineNumber: 1, column: 6 });
  expect(completionProvider).toHaveBeenCalledWith(expect.objectContaining({
    language: 'typescript', value: 'const answer = 42',
  }));
  expect(completionResult.suggestions[0]).toMatchObject({ label: 'answer', insertText: 'answer', kind: 1 });

  view.unmount();
  expect(providerDispose).toHaveBeenCalled();
});
