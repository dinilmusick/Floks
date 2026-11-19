import {
  isRemoteGraphNode,
  readRemoteHandle,
  type RemoteGraphDefinition,
  type RemoteGraphPort,
  type RemoteSavedNode,
} from './remoteGraphContract.js';

/**
 * A snapshot is display-only after a grant is removed; it never authorizes a call.
 * The fingerprint pins the original typed interface even if a provider illegally
 * reuses an operation version with different ports.
 */
export interface RemotePortSnapshot {
  inputs: RemoteGraphPort[];
  outputs: RemoteGraphPort[];
}
export interface FodConnectionEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}
export interface ValidatedRemoteConnection {
  edgeId: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  dataType: string;
}
export interface RemoteConnectionValidation {
  ok: boolean;
  connections: ValidatedRemoteConnection[];
  message?: string;
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value === value.trim();
const portValid = (port: unknown, direction: 'input' | 'output'): port is RemoteGraphPort => {
  if (!port || typeof port !== 'object' || Array.isArray(port)) return false;
  const item = port as Record<string, unknown>;
  return nonEmpty(item.id) && nonEmpty(item.name) && nonEmpty(item.dataType) &&
    item.direction === direction;
};
const validPorts = (ports: unknown, direction: 'input' | 'output'): ports is RemoteGraphPort[] =>
  Array.isArray(ports) &&
  ports.every(port => portValid(port, direction)) &&
  new Set(ports.map(port => port.id)).size === ports.length;

export function snapshotRemotePorts(definition: RemoteGraphDefinition): RemotePortSnapshot {
  return {
    inputs: definition.inputs.map(({id, name, direction, dataType}) => ({id, name, direction, dataType})),
    outputs: definition.outputs.map(({id, name, direction, dataType}) => ({id, name, direction, dataType})),
  };
}

/** Parse saved port labels for an unavailable node without trusting them as live capabilities. */
export function readRemotePortSnapshot(value: unknown): RemotePortSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (!validPorts(snapshot.inputs, 'input') || !validPorts(snapshot.outputs, 'output')) return null;
  return {inputs: snapshot.inputs, outputs: snapshot.outputs};
}

export function remotePortFingerprint(definition: RemoteGraphDefinition): string {
  const ports = (items: readonly RemoteGraphPort[]) =>
    items.map(({id, direction, dataType}) => [id, direction, dataType] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify({inputs: ports(definition.inputs), outputs: ports(definition.outputs)});
}

function matchingPort(
  ports: readonly RemoteGraphPort[],
  handle: string | undefined,
  legacyDefault: 'input' | 'result',
): RemoteGraphPort | undefined {
  if (nonEmpty(handle)) {
    const exact = ports.find(port => port.id === handle);
    if (exact) return exact;
    // Older FOD edges serialized a default handle for single-port nodes.
    if (handle !== legacyDefault) return undefined;
  }
  return ports.length === 1 ? ports[0] : undefined;
}

/**
 * Validate the graph wiring against *fresh scoped discovery*. The normal Kloks
 * engine still owns ordering, fan-out, lifecycle, transport and authorization.
 * This check only rejects corrupt or ambiguous client graph configuration.
 */
export function validateRemoteConnections(
  nodes: readonly RemoteSavedNode[],
  edges: readonly FodConnectionEdge[],
  definitions: readonly RemoteGraphDefinition[],
): RemoteConnectionValidation {
  const deny = (message: string): RemoteConnectionValidation => ({ok: false, connections: [], message});
  if (!Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(definitions))
    return deny('Graph nodes, edges or operation definitions are malformed');

  const byId = new Map<string, RemoteSavedNode>();
  for (const node of nodes) {
    if (!node || !nonEmpty(node.id) || !nonEmpty(node.type) || byId.has(node.id))
      return deny('Graph contains an invalid or duplicate node ID');
    byId.set(node.id, node);
  }

  const byType = new Map<string, RemoteGraphDefinition>();
  const duplicates = new Set<string>();
  for (const definition of definitions) {
    if (!definition || !nonEmpty(definition.type)) continue;
    if (byType.has(definition.type)) duplicates.add(definition.type);
    byType.set(definition.type, definition);
  }

  for (const node of nodes) {
    if (!isRemoteGraphNode(node)) continue;
    const descriptor = byType.get(node.type);
    const saved = readRemoteHandle(node.data);
    const authorized = descriptor && readRemoteHandle(descriptor.metadata);
    if (!saved || !authorized || duplicates.has(node.type))
      return deny(`Remote node ${node.id}: operation unavailable or ambiguous`);
    if (Object.keys(saved).some(key =>
      saved[key as keyof typeof saved] !== authorized[key as keyof typeof authorized]))
      return deny(`Remote node ${node.id}: authorized workspace or version changed`);
    const snapshot = node.data?.remotePorts;
    const signature = node.data?.remotePortSignature;
    if (snapshot !== undefined && !readRemotePortSnapshot(snapshot))
      return deny(`Remote node ${node.id}: stored port snapshot is invalid`);
    if (signature !== undefined &&
      (!nonEmpty(signature) || signature !== remotePortFingerprint(descriptor)))
      return deny(`Remote node ${node.id}: typed port contract changed`);
    if (snapshot !== undefined &&
      remotePortFingerprint(snapshot as RemoteGraphDefinition) !== remotePortFingerprint(descriptor))
      return deny(`Remote node ${node.id}: saved port types changed`);
  }

  const connections: ValidatedRemoteConnection[] = [];
  const edgeIds = new Set<string>();
  const remoteInputs = new Set<string>();
  for (const edge of edges) {
    if (!edge || !nonEmpty(edge.id) || edgeIds.has(edge.id))
      return deny('Graph contains a duplicate or invalid edge ID');
    edgeIds.add(edge.id);
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target)
      return deny(`Edge ${edge.id}: source or target node is missing`);
    if (!isRemoteGraphNode(source) && !isRemoteGraphNode(target)) continue;

    const sourceDef = byType.get(source.type);
    const targetDef = byType.get(target.type);
    if (!sourceDef || !targetDef || duplicates.has(source.type) || duplicates.has(target.type))
      return deny(`Edge ${edge.id}: endpoint port definition unavailable`);
    if (!validPorts(sourceDef.outputs, 'output') || !validPorts(targetDef.inputs, 'input'))
      return deny(`Edge ${edge.id}: endpoint ports are invalid`);
    const output = matchingPort(sourceDef.outputs, edge.sourceHandle, 'result');
    const input = matchingPort(targetDef.inputs, edge.targetHandle, 'input');
    if (!output || !input)
      return deny(`Edge ${edge.id}: source or destination port unavailable`);
    if (output.dataType !== input.dataType)
      return deny(`Edge ${edge.id}: incompatible port types (${output.dataType} -> ${input.dataType})`);

    if (isRemoteGraphNode(target)) {
      const inputKey = `${target.id}\u0000${input.id}`;
      if (remoteInputs.has(inputKey))
        return deny(`Edge ${edge.id}: remote input ${input.id} has more than one producer`);
      remoteInputs.add(inputKey);
      const configured = target.data?.configuredInputs;
      if (configured && typeof configured === 'object' &&
        Object.prototype.hasOwnProperty.call(configured, input.id))
        return deny(`Edge ${edge.id}: remote input ${input.id} has both an edge and a constant`);
    }

    connections.push({
      edgeId: edge.id, sourceNodeId: source.id, sourcePortId: output.id,
      targetNodeId: target.id, targetPortId: input.id, dataType: input.dataType,
    });
  }
  return {ok: true, connections};
}
