export interface SpaceNode {
  id: string;
  type: string;
  name?: string;
  label?: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  radius?: number;
  active?: boolean;
  socketOffsets?: Record<string, {x: number; y: number}>;
  [key: string]: unknown;
}

export interface NodeConnection {
  fromNodeId: string;
  toNodeId: string;
  fromSocketId?: string;
  toSocketId?: string;
  fromPort?: string;
  toPort?: string;
  wireType?: string;
}

export interface PredictiveGhostNode {
  id: string;
  parentNodeId: string;
  parentSocketId: string;
  parentSocketPolarity: 'input' | 'output';
  parentSocketSignalType: string;
  parentSocketLabel: string;
  archetypeId: string;
  category: string;
  label: string;
  description: string;
  iconName: string;
  colorHex: string;
  badge: string;
  matchingSocketId: string;
  matchingSocketIndex?: number;
  spawnType: {type: string};
  worldPosition: [number, number, number];
  slotIndex: number;
  candidateIndex: number;
  totalCandidates: number;
  prototypeNode: SpaceNode;
}

export interface PredictiveTrace {
  id: string;
  ghostNodeId: string;
  sourceNodeId: string;
  sourceHandleId: string;
  targetNodeId: string;
  targetHandleId: string;
  wireType: string;
  isFromGhostToParent: boolean;
  color: string;
}

export interface PredictiveSelectionResult {
  ghostNodes: PredictiveGhostNode[];
  traces: PredictiveTrace[];
  selectedNodesWithGhosts: Map<string, PredictiveGhostNode[]>;
}

const TRACE_COLORS: Record<string, string> = {
  AUDIO: '#38bdf8', MIDI: '#ec4899', TRIGGER: '#eab308', DATA: '#10b981', DEFAULT: '#38bdf8',
};

export function computePredictiveGraph(
  selectedNodes: SpaceNode[],
  connections: NodeConnection[],
  scenarioIndex = 0,
): PredictiveSelectionResult {
  const ghostNodes: PredictiveGhostNode[] = [];
  const traces: PredictiveTrace[] = [];
  const selectedNodesWithGhosts = new Map<string, PredictiveGhostNode[]>();
  const connected = new Set(connections.map(c => `${c.fromNodeId}:${c.toNodeId}`));

  for (const parent of selectedNodes) {
    const available = selectedNodes.filter(candidate => candidate.id !== parent.id && candidate.type !== parent.type);
    const selected = available.slice(0, 2);
    const parentGhosts: PredictiveGhostNode[] = [];

    selected.forEach((candidate, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      const ghostId = `ghost-${parent.id}-${candidate.id}-${scenarioIndex}-${index}`;
      if (connected.has(`${parent.id}:${candidate.id}`)) return;
      const direction = side > 0 ? 'output' : 'input';
      const wireType = signalType(candidate.type);
      const ghost: PredictiveGhostNode = {
        id: ghostId, parentNodeId: parent.id, parentSocketId: `predictive-${direction}`,
        parentSocketPolarity: direction, parentSocketSignalType: wireType,
        parentSocketLabel: direction === 'output' ? 'Output' : 'Input',
        archetypeId: candidate.type, category: 'browser',
        label: candidate.label || candidate.name || candidate.type,
        description: 'Predicted browser-safe graph continuation',
        iconName: candidate.type, colorHex: TRACE_COLORS[wireType] || TRACE_COLORS.DEFAULT,
        badge: 'PREDICT', matchingSocketId: `predictive-${direction === 'output' ? 'input' : 'output'}`,
        spawnType: {type: candidate.type},
        worldPosition: [parent.position[0] + side * 5, parent.position[1], parent.position[2] + (index - .5) * 2.6],
        slotIndex: index, candidateIndex: index, totalCandidates: selected.length,
        prototypeNode: {...candidate},
      };
      parentGhosts.push(ghost);
      ghostNodes.push(ghost);
      traces.push({
        id: `ptrace-${ghostId}`, ghostNodeId: ghostId,
        sourceNodeId: side > 0 ? parent.id : ghost.id,
        sourceHandleId: 'predictive-output',
        targetNodeId: side > 0 ? ghost.id : parent.id,
        targetHandleId: 'predictive-input', wireType,
        isFromGhostToParent: side < 0,
        color: TRACE_COLORS[wireType] || TRACE_COLORS.DEFAULT,
      });
    });
    if (parentGhosts.length) selectedNodesWithGhosts.set(parent.id, parentGhosts);
  }
  return {ghostNodes, traces, selectedNodesWithGhosts};
}

function signalType(type: string): string {
  const value = type.toUpperCase();
  if (value.includes('AUDIO')) return 'AUDIO';
  if (value.includes('MIDI')) return 'MIDI';
  if (value.includes('TRIGGER')) return 'TRIGGER';
  return 'DATA';
}
