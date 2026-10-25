import React from 'react';
import type { UIAuthoringNode } from './types.js';

export function UiAuthoringInspector(props: {
  node?: UIAuthoringNode;
  onChange: (patch: Partial<UIAuthoringNode>) => void;
}) {
  if (!props.node) return <aside className="w-72 border-l border-black/10 p-3 text-xs opacity-60">Select a node.</aside>;
  const description = String(props.node.props.description || '');
  return (
    <aside className="w-72 border-l border-black/10 p-3">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide">{props.node.kind}</div>
      <label className="block text-xs">
        Name
        <input className="mt-1 w-full rounded border px-2 py-1.5" value={props.node.name} onChange={(e) => props.onChange({ name: e.target.value })} />
      </label>
      <label className="mt-3 block text-xs">
        Description
        <textarea className="mt-1 min-h-20 w-full rounded border px-2 py-1.5" value={description} onChange={(e) => props.onChange({ props: { ...props.node?.props, description: e.target.value } })} />
      </label>
    </aside>
  );
}
