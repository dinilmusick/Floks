// ══════════════════════════════════════════════════════════════════════════════════════════
// UI Styling Tokens & Archetypes for Floks UI Hierarchy
// ══════════════════════════════════════════════════════════════════════════════════════════
import React from 'react';

export interface UIInteractionState {
  isHovered?: boolean;
  isActive?: boolean;
  isFocused?: boolean;
  isDisabled?: boolean;
  isSelected?: boolean;
}

export interface UIStyleTokens {
  bgPrimary?: string;
  bgSecondary?: string;
  bgSurface?: string;
  bgElevated?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  accentPrimary?: string;
  accentSecondary?: string;
  borderSubtle?: string;
  borderMedium?: string;
  [key: string]: any;
}

export type UIRole = 'panel' | 'button' | 'input' | 'tile' | 'badge';
export type UIVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'amber'
  | 'sky'
  | 'emerald'
  | 'danger'
  | 'ghost'
  | 'dock'
  | 'outline';
export type UISize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type TooltipDirection = 'top' | 'bottom' | 'left' | 'right';

export interface UIBaseProps {
  id?: string;
  className?: string;
  variant?: UIVariant;
  size?: UISize;
  disabled?: boolean;
  isActive?: boolean;
  tooltip?: string;
  tooltipDirection?: TooltipDirection;
  shortcutHint?: string;
  children?: React.ReactNode;
}
