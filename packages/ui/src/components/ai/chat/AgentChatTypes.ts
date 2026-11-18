export type AgentChatKind = 'app' | 'endpoint' | 'workflow';

export interface AgentChatTarget {
  id: string;
  kind: AgentChatKind;
  name: string;
  alias?: string;
}
export interface AgentChatInvocation {
  targetId: string;
  targetKind: AgentChatKind;
  prompt: string;
  resumeInvocationId?: string;
}
export interface AgentChatReply {
  kind: 'completed' | 'needs_input' | 'failed';
  text: string;
  invocationId?: string;
}
export type AgentChatInvoker = (invocation: AgentChatInvocation) => Promise<AgentChatReply>;

export function agentChatLabel(target: AgentChatTarget): string {
  return target.alias?.trim() || target.name.trim() || target.id;
}

export function matchAgentMentions(targets: readonly AgentChatTarget[], query: string): AgentChatTarget[] {
  const normalized = query.trim().toLocaleLowerCase();
  return targets.filter(target =>
    agentChatLabel(target).toLocaleLowerCase().includes(normalized) ||
    target.name.toLocaleLowerCase().includes(normalized)
  );
}

export function selectedAgentIsValid(target: AgentChatTarget | null, targets: readonly AgentChatTarget[]): boolean {
  return !!target && targets.some(candidate => candidate.id === target.id && candidate.kind === target.kind);
}
