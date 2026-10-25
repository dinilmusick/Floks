export type UIAuthoringContext = 'service' | 'general-component' | 'application';
export type UIAuthoringNodeKind = 'page' | 'section' | 'component';

export interface AuthoringAssetRef {
  packageId: string;
  packageVersion: string;
  exportPath: string;
  assetId: string;
  assetVersion: string;
}

export interface UIAuthoringNode {
  id: string;
  kind: UIAuthoringNodeKind;
  name: string;
  componentId?: string;
  assetRef?: AuthoringAssetRef;
  parentId?: string;
  props: Record<string, string | number | boolean>;
}

export interface UIAuthoringSession {
  sessionId: string;
  context: UIAuthoringContext;
  nodes: UIAuthoringNode[];
  bindings: Array<{
    componentId: string;
    property: string;
    target: { kind: string; apiId: string; field: string; fieldType?: string };
  }>;
  operations: Array<{ operationId: string; name: string; description?: string }>;
  metadata: Record<string, string>;
}

export interface MonacoIdeServicePort {
  execute<TIn = unknown, TOut = unknown>(operation: string, input?: TIn): Promise<TOut>;
}
