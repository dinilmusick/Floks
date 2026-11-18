'use client';
import React from 'react';
import { AgentWorkspace } from './AgentWorkspace.js';

export interface AikoIntelligenceSpec { [key: string]: unknown; }
export interface AikoAgentDefinition {
  schemaVersion?: '1.0.0' | string;
  id: string;
  name: string;
  description?: string;
  agentType: 'TOOL' | 'ENDPOINT' | 'AIKO';
  tool?: Record<string, unknown>;
  intelligenceSpec?: AikoIntelligenceSpec;
  intelligenceSpecId?: string;
  sourceKind?: 'endpoint' | 'fod-flow' | 'gutts-api' | 'custom';
  sourceId?: string;
  allowedToolIds?: string[];
  custom?: boolean;
}
export interface AikoCapability {
  id: string;
  name: string;
  description?: string;
  sourceKind?: 'endpoint' | 'fod-flow' | 'gutts-api' | 'custom';
  sourceId?: string;
}
export interface AikoKey { id: string; providerId: string; label: string; status?: string; isActive?: boolean; emailGroup?: string; expiresAt?: string | null; }
export interface EmbeddedAikoRuntime {
  listAgents(): Promise<AikoAgentDefinition[]>;
  executeAgent(agentId: string, input: string): Promise<unknown>;
  listCapabilities?(): Promise<AikoCapability[]>;
  createCustomAgent?(name: string, capabilityIds: string[], specId?: string): Promise<AikoAgentDefinition>;
}
export interface AikoRuntimeLike extends EmbeddedAikoRuntime {
  listKeys(): Promise<AikoKey[]>;
  getActiveKey(providerId: string): Promise<AikoKey | null>;
  rotateKey(providerId: string): Promise<AikoKey | null>;
  addKey?(input: { providerId: string; label: string; key: string; emailGroup?: string }): Promise<unknown>;
  syncFromAikoEngine(): Promise<{ synced: number; message?: string }>;
}
export interface AikoModuleProps { runtime: AikoRuntimeLike; workspaceId: string; className?: string; }

export function AikoModule({ runtime, workspaceId, className }: AikoModuleProps) {
  return <AgentWorkspace key={workspaceId} runtime={runtime} keyManager={runtime} workspaceId={workspaceId} className={className} />;
}

/** Downstream applications receive agent operations only. Credentials stay in central Aiko. */
export function EmbeddedAikoModule(props: { runtime: EmbeddedAikoRuntime; workspaceId: string; className?: string }) {
  return <AgentWorkspace key={props.workspaceId} {...props} />;
}

AikoModule.displayName = 'AikoModule';
