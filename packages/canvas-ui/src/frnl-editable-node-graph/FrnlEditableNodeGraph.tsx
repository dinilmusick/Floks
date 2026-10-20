'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { GraphEdge, GraphNode, NodeDefinition, Trace, ViewportState } from '@kloks/state-graph';
import { ConnectionRuleStore, MagneticGraphManager } from '@kloks/state-graph';
import { defineFrnlComponent } from '@ultrst-armada/frnlts';
import { useFrnlComponent } from '@ultrst-armada/frnlts/react';
import { useFloksFrnlStore } from '@floks/ui';
import { NodeGraphCanvas } from '../NodeGraphCanvas.js';
import { usePredictiveGraph2D } from '../predictive/usePredictiveGraph2D.js';

export interface FrnlEditableNodeGraphProps {
  id?: string;
  parentId?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport?: ViewportState;
  selectedNodeIds?: Set<string>;
  availableNodeTypes?: NodeDefinition[];
  magneticEnabled?: boolean;
  autoSolidifyEnabled?: boolean;
  magneticCutoff?: number;
  className?: string;
  style?: React.CSSProperties;
  onNodesChange?: (nodes: GraphNode[]) => void;
  onEdgesChange?: (edges: GraphEdge[]) => void;
  onViewportChange?: (viewport: ViewportState) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onMagneticTracesChange?: (traces: Trace[]) => void;
  onMagneticTraceSolidify?: (trace: Trace) => void;
}

export const frnlEditableNodeGraphDefinition = defineFrnlComponent({
  name: 'frnlEditableNodeGraph',
  states: {
    idle: {
      name: 'idle',
      events: {
        nodesChange: { functionId: 'frnlEditableNodeGraph.idle.nodesChange' },
        edgesChange: { functionId: 'frnlEditableNodeGraph.idle.edgesChange' },
        selectionChange: { functionId: 'frnlEditableNodeGraph.idle.selectionChange' },
        viewportChange: { functionId: 'frnlEditableNodeGraph.idle.viewportChange' },
        magneticTraceSolidify: { functionId: 'frnlEditableNodeGraph.idle.magneticTraceSolidify' },
      },
      visualParameters: {
        canvasBackground: 'var(--frnl-editable-node-graph-background, var(--skipo-surface-dark, #181a1f))',
        magneticColor: 'var(--frnl-editable-node-graph-magnetic, #38bdf8)',
      },
      phases: { sustainPhase: { visualDefinition: { parameters: {} } } },
    },
    disabled: {
      name: 'disabled',
      events: {
        nodesChange: { functionId: 'frnlEditableNodeGraph.disabled.nodesChange' },
        edgesChange: { functionId: 'frnlEditableNodeGraph.disabled.edgesChange' },
        selectionChange: { functionId: 'frnlEditableNodeGraph.disabled.selectionChange' },
        viewportChange: { functionId: 'frnlEditableNodeGraph.disabled.viewportChange' },
        magneticTraceSolidify: { functionId: 'frnlEditableNodeGraph.disabled.magneticTraceSolidify' },
      },
      visualParameters: { opacity: 0.6 },
      phases: { sustainPhase: { visualDefinition: { parameters: {} } } },
    },
  },
});

function socketPoint(node: GraphNode, socketId: string, output: boolean, viewport: ViewportState) {
  const sockets = output ? node.outputs ?? [] : node.inputs ?? [];
  const index = Math.max(0, sockets.findIndex((socket) => socket.id === socketId));
  const width = node.width ?? 150;
  const height = node.height ?? 100;
  const y = height / 2 + (index - Math.max(0, sockets.length - 1) / 2) * 28;
  const x = output ? width : 0;
  return {
    x: node.position.x * viewport.zoom + viewport.panX + x * viewport.zoom,
    y: node.position.y * viewport.zoom + viewport.panY + y * viewport.zoom,
  };
}

export const FrnlEditableNodeGraph: React.FC<FrnlEditableNodeGraphProps> = ({
  id = 'frnlEditableNodeGraph',
  parentId,
  nodes,
  edges,
  viewport = { panX: 0, panY: 0, zoom: 1 },
  selectedNodeIds = new Set<string>(),
  availableNodeTypes,
  magneticEnabled = true,
  autoSolidifyEnabled = false,
  magneticCutoff = 320,
  className,
  style,
  onNodesChange,
  onEdgesChange,
  onViewportChange,
  onSelectionChange,
  onNodeDoubleClick,
  onMagneticTracesChange,
  onMagneticTraceSolidify,
}) => {
  const store = useFloksFrnlStore();
  const [traces, setTraces] = useState<Trace[]>([]);
  const manager = useMemo(() => new MagneticGraphManager(magneticCutoff), [magneticCutoff]);
  const predictive = usePredictiveGraph2D({
    nodes: nodes as any,
    connections: edges as any,
    selectedNodeId: selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null,
    selectedNodeIds: Array.from(selectedNodeIds),
    onSolidifyPredictiveNodes: (ghosts) => {
      for (const ghost of ghosts) onPredictiveSolidify?.(ghost.id);
    },
  });

  useEffect(() => {
    if (!ConnectionRuleStore.isInitialized()) ConnectionRuleStore.initializeDefaults();
  }, []);

  const handlers = useMemo(() => ({
    'frnlEditableNodeGraph.idle.nodesChange': (value: unknown) => onNodesChange?.(value as GraphNode[]),
    'frnlEditableNodeGraph.idle.edgesChange': (value: unknown) => onEdgesChange?.(value as GraphEdge[]),
    'frnlEditableNodeGraph.idle.selectionChange': (value: unknown) => onSelectionChange?.(value as Set<string>),
    'frnlEditableNodeGraph.idle.viewportChange': (value: unknown) => onViewportChange?.(value as ViewportState),
    'frnlEditableNodeGraph.idle.magneticTraceSolidify': (value: unknown) => onMagneticTraceSolidify?.(value as Trace),
    'frnlEditableNodeGraph.idle.predictiveSolidify': (value: unknown) => onPredictiveSolidify?.(String(value)),
    'frnlEditableNodeGraph.idle.predictiveSolidifyAll': () => onPredictiveSolidifyAll?.(),
    'frnlEditableNodeGraph.disabled.nodesChange': () => {},
    'frnlEditableNodeGraph.disabled.edgesChange': () => {},
    'frnlEditableNodeGraph.disabled.selectionChange': () => {},
    'frnlEditableNodeGraph.disabled.viewportChange': () => {},
    'frnlEditableNodeGraph.disabled.magneticTraceSolidify': () => {},
    'frnlEditableNodeGraph.disabled.predictiveSolidify': () => {},
    'frnlEditableNodeGraph.disabled.predictiveSolidifyAll': () => {},
  }), [onEdgesChange, onMagneticTraceSolidify, onNodesChange, onSelectionChange, onViewportChange, onPredictiveSolidify, onPredictiveSolidifyAll]);

  const effectivePredictiveMode = predictiveMode || predictive.isActive;
  const effectiveGhostNodes = predictiveGhostNodes.length > 0 ? predictiveGhostNodes : predictive.ghostNodes as any;
  const effectivePredictiveTraces = predictiveTraces.length > 0 ? predictiveTraces : predictive.traces as any;

  const frnl = useFrnlComponent({
    id,
    parentId,
    definition: frnlEditableNodeGraphDefinition,
    store,
    state: 'idle',
    properties: { nodeCount: nodes.length, edgeCount: edges.length, magneticEnabled, autoSolidifyEnabled },
    handlers,
  });

  useEffect(() => {
    if (!magneticEnabled) {
      setTraces([]);
      onMagneticTracesChange?.([]);
      return;
    }
    const next = manager.computeTraces(nodes);
    setTraces(next);
    onMagneticTracesChange?.(next);

    if (autoSolidifyEnabled && next.length > 0) {
      const resolved = manager.resolveAutoSolidification(nodes, next, edges);
      for (const trace of resolved) {
        frnl.events.magneticTraceSolidify(trace);
      }
    }
  }, [autoSolidifyEnabled, edges, magneticEnabled, manager, nodes, onMagneticTracesChange]);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <div
      id={id}
      data-frnl-component="frnlEditableNodeGraph"
      data-frnl-state={frnl.state}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', background: frnl.visualParameters.canvasBackground as string, ...style }}
    >
      <NodeGraphCanvas
        nodes={nodes}
        edges={edges}
        viewport={viewport}
        selectedNodeIds={selectedNodeIds}
        availableNodeTypes={availableNodeTypes}
        onNodesChange={(next) => frnl.events.nodesChange(next)}
        onEdgesChange={(next) => frnl.events.edgesChange(next)}
        onViewportChange={(next) => frnl.events.viewportChange(next)}
        onSelectionChange={(next) => frnl.events.selectionChange(next)}
        onNodeDoubleClick={onNodeDoubleClick}
        getSocketTelemetry={signalTelemetryEnabled && getSocketTelemetry ? (node, socketId, isOutput) => getSocketTelemetry(node, socketId, isOutput) : undefined}
      />
      {traces.length > 0 && (
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}
        >
          {traces.map((trace) => {
            const source = nodeMap.get(trace.sourceNodeId);
            const target = nodeMap.get(trace.targetNodeId);
            if (!source || !target) return null;
            const a = socketPoint(source, trace.sourceHandleId, true, viewport);
            const b = socketPoint(target, trace.targetHandleId, false, viewport);
            return (
              <line
                key={trace.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={String(frnl.visualParameters.magneticColor ?? '#38bdf8')}
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.8}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

FrnlEditableNodeGraph.displayName = 'FrnlEditableNodeGraph';
