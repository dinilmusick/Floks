'use client';
import { useEffect, useRef } from 'react';
import { useMonaco } from './useMonaco.js';
import type { EditorConfig } from './types.js';

interface MonacoEditorProps extends EditorConfig {
  onChange?: (value: string) => void;
  height?: string | number;
  width?: string | number;
}

export function MonacoEditor({
  value,
  language = 'javascript',
  readOnly = false,
  minimap = false,
  theme = 'skipo-dark',
  fontSize = 14,
  onChange,
  height = '100%',
  width = '100%'
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco || !containerRef.current) return;

    if (!editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language,
        theme,
        readOnly,
        fontSize,
        minimap: { enabled: minimap },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
      });

      if (onChange) {
        editorRef.current.onDidChangeModelContent(() => {
          onChange(editorRef.current.getValue());
        });
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [monaco]); // Create once when monaco loads

  // Update value if changed externally
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update other options
  useEffect(() => {
    if (editorRef.current) {
      monaco?.editor.setModelLanguage(editorRef.current.getModel(), language);
      editorRef.current.updateOptions({ readOnly, fontSize, minimap: { enabled: minimap } });
      if (theme) monaco?.editor.setTheme(theme);
    }
  }, [language, readOnly, fontSize, minimap, theme, monaco]);

  return (
    <div ref={containerRef} style={{ width, height, overflow: 'hidden', borderRadius: '8px' }} />
  );
}
