import type {PredictiveGhostNode} from '../../state-graph/index.js';

export interface PredictiveGhostNodeCardProps {
  ghost: PredictiveGhostNode;
  screenPos: {x: number; y: number};
  zoom: number;
  onSolidify: (ghost: PredictiveGhostNode) => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}
