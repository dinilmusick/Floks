export type SocketType = 'input' | 'output';

export interface Socket {
  id: string;
  label: string;
  type: SocketType;
  dataType?: string;
  offset?: { x: number; y: number };
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  data?: Record<string, unknown>;
  inputs?: Socket[];
  outputs?: Socket[];
  width?: number;
  height?: number;
  positionLocked?: boolean;
  minimized?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  sourceSocket: string;
  target: string;
  targetSocket: string;
  label?: string;
  color?: string;
  wireType?: string;
  locked?: boolean;
  deletable?: boolean;
}

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface NodeGraphConfig {
  minZoom?: number;
  maxZoom?: number;
  gridSize?: number;
  snapToGrid?: boolean;
  wireStyle?: 'bezier' | 'straight' | 'step';
  tracingEnabled?: boolean;
  magneticTracesEnabled?: boolean;
  autoSolidify?: boolean;
  traceCutoffDistance?: number;
  ghostRoutingEnabled?: boolean;
  ghostScenarioCount?: number;
  ghostDecayMs?: number;
}

export interface NodeHandleDefinition {
  id: string;
  label?: string;
  dataType?: string;
}

export interface NodeDefinition {
  type: string;
  label?: string;
  inputs?: NodeHandleDefinition[];
  outputs?: NodeHandleDefinition[];
}

export interface GhostSocketMapping {
  sourceSocketId: string;
  targetSocketId: string;
  wireType: string;
}

export interface GhostCandidate {
  id: string;
  nodeType: string;
  label: string;
  scenarioIndex: number;
  score: number;
  sourceNodeId: string;
  socketMappings: GhostSocketMapping[];
  relativeOffset: { x: number; y: number };
}

export interface GhostNodeRecord {
  id: string;
  nodeType: string;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  scenarioIndex: number;
  sourceNodeId: string;
  socketMappings: GhostSocketMapping[];
  inputs?: Socket[];
  outputs?: Socket[];
}

export interface GhostTraceRecord {
  id: string;
  sourceNodeId: string;
  sourceSocketId: string;
  targetGhostNodeId: string;
  targetSocketId: string;
  wireType: string;
  pathD: string;
  scenarioIndex: number;
}

export interface GhostInferenceOptions {
  scenarioCount?: number;
  maxSuggestionsPerNode?: number;
  customScorer?: (sourceType: string, candidateType: string) => number;
}
