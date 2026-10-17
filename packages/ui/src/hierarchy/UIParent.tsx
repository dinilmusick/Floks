// ══════════════════════════════════════════════════════════════════════════════════════════
// UIParent: Concrete Semantic Wrapper Component
// ══════════════════════════════════════════════════════════════════════════════════════════
import React from 'react';
import {
  UIVariant,
  UISize,
  UIBaseProps,
  TooltipDirection,
} from './UIElementBase.js';

export type { UIVariant, UISize, TooltipDirection };
export type UIProps = UIBaseProps;

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
