import type { UIAuthoringNode } from './types.js';

export function getAuthoringDepth(node: UIAuthoringNode, nodes: UIAuthoringNode[]): number {
  let depth = 0;
  let parentId = node.parentId;
  while (parentId) {
    const parent = nodes.find((item) => item.id === parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}

export function getAuthoringChildren(nodeId: string, nodes: UIAuthoringNode[]): UIAuthoringNode[] {
  return nodes.filter((node) => node.parentId === nodeId);
}
