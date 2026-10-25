'use client';
import { useEffect, useRef } from 'react';
import { useMonaco } from './useMonaco.js';
import type { EditorConfig } from './types.js';

export interface MonacoIdeServicePort {
  execute<TIn = unknown, TOut = unknown>(operation: string, input?: TIn): Promise<TOut>;
}

export interface MonacoEditorProps extends EditorConfig {
  sessionId?: string;
  uri?: string;
  ideService?: MonacoIdeServicePort;
  onChange?: (value: string) => void;
  height?: string | number;
  width?: string | number;
}

export function MonacoEditor({
  value, language = 'javascript', readOnly = false, minimap = false, theme = 'skipo-dark',
  fontSize = 14, sessionId, uri, ideService, onChange, height = '100%', width = '100%',
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const sessionRef = useRef<string | undefined>(sessionId);
  const monaco = useMonaco();
  const service = ideService || { execute: async () => undefined };


  useEffect(() => {
    if (!sessionRef.current) sessionRef.current = sessionId || `editor-${Date.now().toString(36)}`;
    void service.execute('createSession', {
      sessionId: sessionRef.current, uri: uri || `inmemory://${sessionRef.current}`, language, value,
      options: { readOnly, minimap, fontSize },
    });
    return () => {\n      if (sessionRef.current) void service.execute('disposeSession', { sessionId: sessionRef.current });\n    };\n  }, []);

  useEffect(() => {
    if (!monaco || !containerRef.current) return;
    if (!editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value, language, theme, readOnly, fontSize, minimap: { enabled: minimap },
        automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 },
      });
      editorRef.current.onDidChangeModelContent(() => {
        const nextValue = editorRef.current.getValue();
        void service.execute('updateDocument', {
          sessionId: sessionRef.current, value: nextValue, language,
        });
        onChange?.(nextValue);
      });
    }
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [monaco]);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) editorRef.current.setValue(value);
  }, [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    monaco?.editor.setModelLanguage(editorRef.current.getModel(), language);
    editorRef.current.updateOptions({ readOnly, fontSize, minimap: { enabled: minimap } });
    if (theme) monaco?.editor.setTheme(theme);
    if (sessionRef.current) {
      void service.execute('setOptions', {
        sessionId: sessionRef.current, options: { readOnly, minimap, fontSize },
      });
    }
  }, [language, readOnly, fontSize, minimap, theme, monaco]);

  return <div ref={containerRef} style={{ width, height, overflow: 'hidden', borderRadius: '8px' }} />;
}
