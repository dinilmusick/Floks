// ══════════════════════════════════════════════════════════════════════════════════════════
// UIParent: Compatibility & Intermediate Layer connecting to UIElementBase
// ══════════════════════════════════════════════════════════════════════════════════════════
import {
  UIElementBase,
  UIVariant,
  UISize,
  UIBaseProps,
  TooltipDirection,
} from './UIElementBase';

export type { UIVariant, UISize, TooltipDirection };
export type UIProps = UIBaseProps;

/**
 * UIModel: Abstract intermediate model tracing to UIElementBase -> GraphEntityParent
 */
export abstract class UIModel extends UIElementBase {
  constructor(
    id: string,
    name: string,
    variant: UIVariant = 'primary',
    size: UISize = 'md'
  ) {
    super(id, name, 'panel', variant, size);
  }
}
