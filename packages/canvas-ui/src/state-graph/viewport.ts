import type {GraphNode, NodeGraphConfig, ViewportState} from './types.js';

export function zoomAtPoint(
  mouseX: number,
  mouseY: number,
  delta: number,
  viewport: ViewportState,
  config: NodeGraphConfig = {},
): ViewportState {
  const currentZoom = viewport.zoom;
  const newZoom = clampZoom(currentZoom + delta, config);
  const graphX = (mouseX - viewport.panX) / currentZoom;
  const graphY = (mouseY - viewport.panY) / currentZoom;
  return {
    zoom: newZoom,
    panX: mouseX - graphX * newZoom,
    panY: mouseY - graphY * newZoom,
  };
}

export function clampZoom(zoom: number, config: NodeGraphConfig = {}): number {
  return Math.max(config.minZoom ?? 0.25, Math.min(config.maxZoom ?? 2.5, zoom));
}

export function fitToView(
  nodes: GraphNode[],
  containerWidth: number,
  containerHeight: number,
  padding = 50,
): ViewportState {
  if (nodes.length === 0) {
    return {panX: containerWidth / 2, panY: containerHeight / 2, zoom: 1};
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    const width = node.width ?? 150;
    const height = node.height ?? 100;
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }
  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;
  const zoomX = (containerWidth - padding * 2) / graphWidth;
  const zoomY = (containerHeight - padding * 2) / graphHeight;
  const zoom = Math.min(zoomX, zoomY, 1);
  return {
    zoom,
    panX: (containerWidth - graphWidth * zoom) / 2 - minX * zoom,
    panY: (containerHeight - graphHeight * zoom) / 2 - minY * zoom,
  };
}
