'use client';
import { useState, useMemo } from 'react';
import type { NodeDefinition } from '@kloks/state-graph';
import { useSearchKeyboardNavigation, BaseButton, BaseInput } from '@floks/ui';

export interface NodeSearchPaletteProps {
  x: number;
  y: number;
  availableNodeTypes?: NodeDefinition[];
  onSpawnNode: (type: string) => void;
  onClose: () => void;
}

export function NodeSearchPalette({
  x,
  y,
  availableNodeTypes = [],
  onSpawnNode,
  onClose
}: NodeSearchPaletteProps) {
  const [query, setQuery] = useState('');

  const filteredNodes = useMemo(() => {
    if (!availableNodeTypes || availableNodeTypes.length === 0) {
      return [{ type: 'default', label: 'Default Node', description: 'Standard dual-port node' }];
    }
    if (!query.trim()) return availableNodeTypes;
    const q = query.toLowerCase();
    return availableNodeTypes.filter(
      n => n.type.toLowerCase().includes(q) || n.label.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)
    );
  }, [availableNodeTypes, query]);

  const {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    listContainerRef
  } = useSearchKeyboardNavigation<NodeDefinition | { type: string; label: string; description: string }>({
    items: filteredNodes,
    onSelect: (node) => {
      onSpawnNode(node.type);
      onClose();
    },
    onClose
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, 0)',
        width: '290px',
        maxHeight: '380px',
        backgroundColor: 'var(--skipo-surface)',
        border: 'var(--skipo-border)',
        borderRadius: 'var(--skipo-radius)',
        boxShadow: 'var(--skipo-shadow)',
        color: 'var(--skipo-text)',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--skipo-font)'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: 'var(--skipo-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--skipo-matte-bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--skipo-accent)' }}>
            Spawn Node
          </span>
          <span style={{ fontSize: '9px', color: 'var(--skipo-text-muted)', fontFamily: 'var(--skipo-font-mono)', backgroundColor: 'var(--skipo-surface)', padding: '1px 4px', borderRadius: 'var(--skipo-radius-sm)' }}>
            hotkey [N]
          </span>
        </div>
        <BaseButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close search"
          style={{ padding: '2px 6px', fontSize: '12px' }}
        >
          ✕
        </BaseButton>
      </div>

      {/* Search Input */}
      <div style={{ padding: '8px', borderBottom: 'var(--skipo-border)' }}>
        <BaseInput
          autoFocus
          placeholder="Search nodes... (↑↓ navigate, ↵ spawn)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Node Search Results */}
      <div ref={listContainerRef} style={{ flex: 1, overflowY: 'auto', maxHeight: '220px', padding: '4px 6px' }}>
        {filteredNodes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--skipo-text-muted)' }}>
            No matching nodes
          </div>
        ) : (
          filteredNodes.map((node, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={node.type}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  onSpawnNode(node.type);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 'var(--skipo-radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: isHighlighted ? 'var(--skipo-surface-hover)' : 'transparent',
                  border: isHighlighted ? 'var(--skipo-border)' : '1px solid transparent',
                  marginBottom: '2px',
                  transition: 'background-color 0.1s ease'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: isHighlighted ? 600 : 500, color: isHighlighted ? 'var(--skipo-accent)' : 'inherit' }}>
                    {node.label || node.type}
                  </div>
                  {node.description && (
                    <div style={{ fontSize: '9px', color: 'var(--skipo-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.description}
                    </div>
                  )}
                </div>
                {isHighlighted && (
                  <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--skipo-accent)', padding: '2px 5px', borderRadius: 'var(--skipo-radius-sm)', backgroundColor: 'var(--skipo-matte-bg)', border: 'var(--skipo-border)', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                    ↵ Spawn
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 10px',
        borderTop: 'var(--skipo-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--skipo-matte-bg)',
        fontSize: '9px',
        color: 'var(--skipo-text-muted)'
      }}>
        <span>{filteredNodes.length} nodes available</span>
        <span>Press <strong>Enter ↵</strong> to spawn</span>
      </div>
    </div>
  );
}
