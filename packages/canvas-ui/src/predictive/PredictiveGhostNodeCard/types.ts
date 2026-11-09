import type {PredictiveGhostNode} from '@kloks/state-graph/browser';

export interface PredictiveGhostNodeCardProps {
  ghost: PredictiveGhostNode;
  screenPos: {x: number; y: number};
  zoom: number;
  onSolidify: (ghost: PredictiveGhostNode) => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}
