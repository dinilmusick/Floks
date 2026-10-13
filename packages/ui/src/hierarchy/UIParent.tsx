// ══════════════════════════════════════════════════════════════════════════════════════════
// UIParent: Compatibility & Intermediate Layer connecting to UIElementBase
// ══════════════════════════════════════════════════════════════════════════════════════════
import React from 'react';
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

export interface UIParentProps extends UIBaseProps {
  as?: React.ElementType;
}

export const UIParent: React.FC<UIParentProps> = ({
  as: Component = 'div',
  children,
  className = '',
  ...props
}) => {
  return React.createElement(Component, { className, ...props }, children);
};

