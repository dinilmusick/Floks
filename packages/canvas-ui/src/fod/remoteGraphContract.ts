/** Fail-closed remote graph handles. Authorization remains with Kloks/Luth at the target. */
export interface RemoteGraphHandle {
  appId: string;
  targetWorkspaceId: string;
  operationId: string;
  operationVersion: string;
}
export interface RemoteGraphPort { id: string; name: string; direction: string; dataType: string; }
export interface RemoteGraphDefinition {
  type: string;
  category: string;
  inputs: RemoteGraphPort[];
  outputs: RemoteGraphPort[];
  metadata?: Record<string, unknown>;
}
export interface RemoteSavedNode { id: string; type: string; data?: Record<string, unknown>; }
export interface RemoteGraphValidation {
  ok: boolean;
  handles: RemoteGraphHandle[];
  message?: string;
  requiresWindowConsent: boolean;
}
const fields = ['appId', 'targetWorkspaceId', 'operationId', 'operationVersion'] as const;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.trim() === v;
export function readRemoteHandle(value: unknown): RemoteGraphHandle | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!fields.every(field => text(record[field]))) return null;
  return {appId:record.appId as string,targetWorkspaceId:record.targetWorkspaceId as string,
    operationId:record.operationId as string,operationVersion:record.operationVersion as string};
}
export function isRemoteGraphNode(node: RemoteSavedNode): boolean {
  return node.type.startsWith('remote.') ||
    Boolean(node.data && fields.some(field => own(node.data as object, field)));
}
export function isLiveFrontendDefinition(definition: RemoteGraphDefinition): boolean {
  return definition.metadata?.surface === 'raw.frontend.session' ||
    definition.category === 'frontend-session' || definition.category === 'frontend-operation';
}
function portsValid(ports: RemoteGraphPort[], direction: 'input' | 'output'): boolean {
  return Array.isArray(ports) && ports.every(port => port && text(port.id) &&
    text(port.dataType) && text(port.name) && port.direction === direction) &&
    new Set(ports.map(port => port.id)).size === ports.length;
}
export function filterRemoteDefinitions<T extends RemoteGraphDefinition>(
  definitions: readonly T[], localTypes: readonly string[] = []
): T[] {
  const seen = new Set(localTypes);
  const counts = new Map<string, number>();
  for (const definition of definitions) if (definition && typeof definition.type === 'string')
    counts.set(definition.type, (counts.get(definition.type) ?? 0) + 1);
  const result: T[] = [];
  if (!Array.isArray(definitions)) return result;
  for (const definition of definitions) {
    if (!definition || !text(definition.type) || seen.has(definition.type) || counts.get(definition.type) !== 1 ||
        !readRemoteHandle(definition.metadata) ||
        !portsValid(definition.inputs, 'input') || !portsValid(definition.outputs, 'output')) continue;
    seen.add(definition.type);
    result.push(definition);
  }
  return result;
}
function sameHandle(a: RemoteGraphHandle,b: RemoteGraphHandle): boolean {
  return fields.every(key => a[key] === b[key]);
}
function inputIsType(value: unknown,type: string): boolean {
  switch (type.toLowerCase()) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'boolean': return typeof value === 'boolean';
    case 'object': return !!value && typeof value === 'object' && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    default: return true; // Target validates opaque/advanced schemas.
  }
}
/** Reconcile saved handles against fresh principal/workspace-scoped discovery before dispatch. */
export function validateRemoteGraph(
  nodes: readonly RemoteSavedNode[], definitions: readonly RemoteGraphDefinition[]
): RemoteGraphValidation {
  const handles: RemoteGraphHandle[] = [];
  let requiresWindowConsent = false;
  const descriptors = new Map<string, RemoteGraphDefinition>();
  const ambiguous = new Set<string>();
  for (const definition of definitions) {
    if (!definition || !text(definition.type)) continue;
    if (descriptors.has(definition.type)) ambiguous.add(definition.type);
    descriptors.set(definition.type, definition);
  }
  const deny = (message: string): RemoteGraphValidation => ({ok:false,handles:[],requiresWindowConsent,message});
  for (const node of nodes) {
    if (!isRemoteGraphNode(node)) continue;
    const saved = readRemoteHandle(node.data);
    if (!saved) return deny(`Remote node ${node.id}: missing immutable app/workspace/operation/version handle`);
    if (ambiguous.has(node.type)) return deny(`Remote node ${node.id}: ambiguous operation definition`);
    const descriptor = descriptors.get(node.type);
    const live = descriptor && readRemoteHandle(descriptor.metadata);
    if (!descriptor || !live) return deny(`Remote node ${node.id}: operation unavailable or permission revoked`);
    if (!sameHandle(saved, live)) return deny(`Remote node ${node.id}: operation version or authorized target changed`);
    if (!portsValid(descriptor.inputs, 'input') || !portsValid(descriptor.outputs, 'output'))
      return deny(`Remote node ${node.id}: typed port contract changed`);
    const configured = node.data?.configuredInputs;
    if (configured !== undefined) {
      if (!configured || typeof configured !== 'object' || Array.isArray(configured))
        return deny(`Remote node ${node.id}: invalid typed input payload`);
      const inputs = new Map(descriptor.inputs.map(port => [port.id, port]));
      for (const [key,value] of Object.entries(configured)) {
        const port = inputs.get(key);
        if (!port || !inputIsType(value, port.dataType))
          return deny(`Remote node ${node.id}: invalid typed input ${key}`);
      }
    }
    requiresWindowConsent ||= isLiveFrontendDefinition(descriptor);
    handles.push(saved);
  }
  return {ok:true,handles,requiresWindowConsent};
}
