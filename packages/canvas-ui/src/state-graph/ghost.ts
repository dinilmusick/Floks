import type {
  GhostCandidate, GhostInferenceOptions, GhostNodeRecord, GhostSocketMapping, GhostTraceRecord,
  GraphNode, NodeDefinition, Socket,
} from './types.js';

export class GhostStore {
  private static instance: GhostStore | null = null;
  public isActive = false;
  public ghostNodes: GhostNodeRecord[] = [];
  public ghostTraces: GhostTraceRecord[] = [];
  public scenarioIndex = 0;
  public hoveredGhostId: string | null = null;
  public sourceNodeIds: string[] = [];
  private listeners = new Set<() => void>();

  static getInstance(): GhostStore {
    return (this.instance ??= new GhostStore());
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  setPredictions(nodes: GhostNodeRecord[], traces: GhostTraceRecord[], sourceNodeIds: string[]): void {
    this.ghostNodes = nodes;
    this.ghostTraces = traces;
    this.sourceNodeIds = [...sourceNodeIds];
    this.isActive = nodes.length > 0;
    this.scenarioIndex = 0;
    this.hoveredGhostId = null;
    this.notify();
  }
  cycleScenario(maxScenarios = 3): void {
    const count = Math.max(1, Math.max(this.ghostNodes.map(n => n.scenarioIndex + 1).reduce((a, b) => Math.max(a, b), 0), maxScenarios));
    this.scenarioIndex = (this.scenarioIndex + 1) % count;
    this.notify();
  }
  setHoveredGhostId(id: string | null): void {
    if (this.hoveredGhostId !== id) {
      this.hoveredGhostId = id;
      this.notify();
    }
  }
  getActiveGhostNodes(): GhostNodeRecord[] {
    return this.ghostNodes.filter(n => n.scenarioIndex === this.scenarioIndex);
  }
  getActiveGhostTraces(): GhostTraceRecord[] {
    return this.ghostTraces.filter(t => t.scenarioIndex === this.scenarioIndex);
  }
  clear(): void {
    this.isActive = false;
    this.ghostNodes = [];
    this.ghostTraces = [];
    this.scenarioIndex = 0;
    this.hoveredGhostId = null;
    this.sourceNodeIds = [];
    this.notify();
  }
  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export class ConnectionRuleStore {
  private static nodeTypes = new Map<string, NodeDefinition>();
  static registerNodeTypes(defs: NodeDefinition[]): void {
    for (const def of defs) this.nodeTypes.set(def.type, def);
  }
  static listNodeTypes(): NodeDefinition[] {
    return [...this.nodeTypes.values()];
  }
  static canConnect(source: {dataType?: string}, target: {dataType?: string}): boolean {
    const sourceType = (source.dataType || 'ANY').toUpperCase();
    const targetType = (target.dataType || 'ANY').toUpperCase();
    return sourceType === 'ANY' || targetType === 'ANY' || sourceType === '*' || targetType === '*' || sourceType === targetType;
  }
  static resolve(source: {dataType?: string}, target: {dataType?: string}): {wireType: string; allowed: boolean} {
    return {wireType: 'DEFAULT', allowed: this.canConnect(source, target)};
  }
}

export function inferGhostNodes(selectedNodes: GraphNode[], defs: NodeDefinition[], options: GhostInferenceOptions = {}): GhostCandidate[] {
  const scenarioCount = Math.max(1, options.scenarioCount ?? 3);
  const maxSuggestions = options.maxSuggestionsPerNode ?? 2;
  const candidates: GhostCandidate[] = [];
  for (const source of selectedNodes) {
    const outputs = source.outputs ?? [];
    if (!outputs.length) continue;
    const scored = defs
      .filter(def => def.type !== source.type)
      .map(def => ({def, mappings: resolveMappings(outputs, def)}))
      .filter(x => x.mappings.length)
      .map(x => ({...x, score: x.mappings.length * 10 + (options.customScorer?.(source.type, x.def.type) ?? affinity(source.type, x.def.type))}))
      .sort((a, b) => b.score - a.score);
    for (let scenarioIndex = 0; scenarioIndex < scenarioCount; scenarioIndex++) {
      for (const [index, match] of scored.slice(scenarioIndex * maxSuggestions, (scenarioIndex + 1) * maxSuggestions).entries()) {
        candidates.push({
          id: `ghost-${source.id}-${match.def.type}-s${scenarioIndex}-${index}`,
          nodeType: match.def.type,
          label: match.def.label || match.def.type,
          scenarioIndex,
          score: match.score,
          sourceNodeId: source.id,
          socketMappings: match.mappings,
          relativeOffset: {x: 260, y: (index - (Math.min(maxSuggestions, scored.length) - 1) / 2) * 140},
        });
      }
    }
  }
  return candidates;
}

export function resolveGhostLayout(candidates: GhostCandidate[], existingNodes: GraphNode[], defs: NodeDefinition[]): GhostNodeRecord[] {
  const nodeMap = new Map(existingNodes.map(n => [n.id, n]));
  const defMap = new Map(defs.map(d => [d.type, d]));
  const occupied = existingNodes.map(n => ({x: n.position.x, y: n.position.y, width: n.width ?? 180, height: n.height ?? 120}));
  return candidates.map(candidate => {
    const source = nodeMap.get(candidate.sourceNodeId);
    const def = defMap.get(candidate.nodeType);
    const rect = place({x: (source?.position.x ?? 0) + (source?.width ?? 180) + 80, y: (source?.position.y ?? 0) + candidate.relativeOffset.y, width: 180, height: 120}, occupied);
    occupied.push(rect);
    return {
      id: candidate.id, nodeType: candidate.nodeType, label: candidate.label, position: {x: rect.x, y: rect.y},
      size: {width: rect.width, height: rect.height}, scenarioIndex: candidate.scenarioIndex, sourceNodeId: candidate.sourceNodeId,
      socketMappings: candidate.socketMappings,
      inputs: (def?.inputs ?? []).map(h => ({id: h.id, label: h.label || h.id, type: 'input' as const, dataType: h.dataType})),
      outputs: (def?.outputs ?? []).map(h => ({id: h.id, label: h.label || h.id, type: 'output' as const, dataType: h.dataType})),
    };
  });
}

export function buildGhostTraces(ghosts: GhostNodeRecord[], existingNodes: GraphNode[]): GhostTraceRecord[] {
  const nodes = new Map(existingNodes.map(n => [n.id, n]));
  const traces: GhostTraceRecord[] = [];
  for (const ghost of ghosts) {
    const source = nodes.get(ghost.sourceNodeId);
    if (!source) continue;
    for (const mapping of ghost.socketMappings) {
      const start = socketPosition(source, mapping.sourceSocketId, 'output');
      const end = ghostSocketPosition(ghost, mapping.targetSocketId);
      traces.push({
        id: `trace-ghost-${source.id}-${mapping.sourceSocketId}->${ghost.id}-${mapping.targetSocketId}`,
        sourceNodeId: source.id, sourceSocketId: mapping.sourceSocketId, targetGhostNodeId: ghost.id,
        targetSocketId: mapping.targetSocketId, wireType: mapping.wireType, scenarioIndex: ghost.scenarioIndex,
        pathD: `M ${start.x},${start.y} C ${start.x + Math.max(Math.abs(end.x - start.x) * .5, 45)},${start.y} ${end.x - Math.max(Math.abs(end.x - start.x) * .5, 45)},${end.y} ${end.x},${end.y}`,
      });
    }
  }
  return traces;
}

function resolveMappings(outputs: Socket[], target: NodeDefinition): GhostSocketMapping[] {
  return outputs.flatMap(output => {
    const input = target.inputs?.find(candidate => ConnectionRuleStore.canConnect(output, candidate));
    if (!input) return [];
    return [{sourceSocketId: output.id, targetSocketId: input.id, wireType: ConnectionRuleStore.resolve(output, input).wireType}];
  });
}

function affinity(source: string, target: string): number {
  const s = source.toLowerCase(), t = target.toLowerCase();
  if ((s.includes('source') || s.includes('input')) && (t.includes('process') || t.includes('filter'))) return 15;
  if ((s.includes('process') || s.includes('filter')) && (t.includes('sink') || t.includes('output'))) return 15;
  if (s.includes('audio') && t.includes('audio')) return 12;
  if (s.includes('data') && t.includes('data')) return 10;
  return 5;
}

function place(ideal: {x: number; y: number; width: number; height: number}, occupied: Array<{x: number; y: number; width: number; height: number}>) {
  let current = {...ideal};
  for (let attempt = 0; attempt < 15; attempt++) {
    const collision = occupied.find(box => !(current.x + current.width + 20 <= box.x || box.x + box.width + 20 <= current.x || current.y + current.height + 20 <= box.y || box.y + box.height + 20 <= current.y));
    if (!collision) return current;
    current = {x: ideal.x + (attempt % 2 ? 24 : 0), y: collision.y + collision.height + 20, width: ideal.width, height: ideal.height};
  }
  return current;
}

function socketPosition(node: GraphNode, socketId: string, type: SocketType): {x: number; y: number} {
  const sockets = type === 'input' ? node.inputs : node.outputs;
  const index = Math.max(0, sockets?.findIndex(s => s.id === socketId) ?? 0);
  const count = Math.max(1, sockets?.length ?? 1);
  return {
    x: node.position.x + (type === 'input' ? 0 : node.width ?? 180),
    y: node.position.y + ((index + 1) * (node.height ?? 120)) / (count + 1),
  };
}

function ghostSocketPosition(ghost: GhostNodeRecord, socketId: string): {x: number; y: number} {
  const sockets = ghost.inputs ?? [];
  const index = Math.max(0, sockets.findIndex(s => s.id === socketId));
  const count = Math.max(1, sockets.length);
  return {x: ghost.position.x, y: ghost.position.y + ((index + 1) * ghost.size.height) / (count + 1)};
}

type SocketType = 'input' | 'output';
