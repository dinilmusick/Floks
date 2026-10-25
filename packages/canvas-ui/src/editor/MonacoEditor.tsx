'use client';
import { useEffect, useRef } from 'react';
import { MonacoIdeServiceFacade } from '@ultrst-armada/kloks/services';
import { useMonaco } from './useMonaco.js';
import type { EditorConfig } from './types.js';

export interface MonacoEditorProps extends EditorConfig {
  sessionId?: string;
  uri?: string;
  onChange?: (value: string) => void;
  height?: string | number;
  width?: string | number;
}

export function MonacoEditor({
  value, language = 'javascript', readOnly = false, minimap = false, theme = 'skipo-dark',
  fontSize = 14, sessionId, uri, onChange, height = '100%', width = '100%',
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const sessionRef = useRef<string | undefined>(sessionId);
  const monaco = useMonaco();

  useEffect(() => {
    if (!sessionRef.current) sessionRef.current = sessionId || `editor-${Date.now().toString(36)}`;
    void MonacoIdeServiceFacade.execute('createSession', {
      sessionId: sessionRef.current, uri: uri || `inmemory://${sessionRef.current}`, language, value,
      options: { readOnly, minimap, fontSize },
    });
  }, []);

  useEffect(() => {
    if (!monaco || !containerRef.current) return;
    if (!editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value, language, theme, readOnly, fontSize, minimap: { enabled: minimap },
        automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 },
      });
      editorRef.current.onDidChangeModelContent(() => {
        const nextValue = editorRef.current.getValue();
        void MonacoIdeServiceFacade.execute('updateDocument', {
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
      void MonacoIdeServiceFacade.execute('setOptions', {
        sessionId: sessionRef.current, options: { readOnly, minimap, fontSize },
      });
    }
  }, [language, readOnly, fontSize, minimap, theme, monaco]);

  return <div ref={containerRef} style={{ width, height, overflow: 'hidden', borderRadius: '8px' }} />;
}
