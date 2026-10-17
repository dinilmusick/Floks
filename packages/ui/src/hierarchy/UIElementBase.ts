// ══════════════════════════════════════════════════════════════════════════════════════════
// UIElementBase: Root Template / Base Class for all UI Elements in Floks
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role skeleton
import React from 'react';
import { GraphEntityParent } from '@kloks/state-graph';
import type { GraphEntityMetadata } from '@kloks/state-graph';
export type { GraphEntityMetadata };

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

export type ColorPalette = Record<string, any>;
let activePaletteResolver: () => ColorPalette = () => ({});
export function registerPaletteResolver(fn: () => ColorPalette): void {
  activePaletteResolver = fn;
}
function getActivePalette(): ColorPalette {
  return activePaletteResolver();
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

/**
 * UIElementBase: Universal Base Class tracing to GraphEntityParent
 * @deprecated Legacy compatibility wrapper.
 * FrnlTS (@dinilmusick/frnlts) is the authoritative semantic layer for all Floks UI components and entities.
 * Concrete Floks UI components now inherit contracts from FrnlPrimitive and FrnlComposite.
 */
export abstract class UIElementBase extends GraphEntityParent {
  public readonly themeRole: UIRole;
  public variant: UIVariant;
  public size: UISize;
  public isDisabled: boolean;
  public isHighlighted: boolean;
  public tooltipText?: string;
  public tooltipDir: TooltipDirection;

  constructor(
    id: string,
    name: string,
    themeRole: UIRole,
    variant: UIVariant = 'primary',
    size: UISize = 'md',
    metadata: GraphEntityMetadata = {}
  ) {
    super(id, name, 'ui', metadata);
    this.themeRole = themeRole;
    this.variant = variant;
    this.size = size;
    this.isDisabled = false;
    this.isHighlighted = false;
    this.tooltipDir = 'bottom';
  }

  public getPalette(): ColorPalette {
    return getActivePalette();
  }

  public setDisabled(disabled: boolean): void {
    if (this.isDisabled !== disabled) {
      this.isDisabled = disabled;
      this.emit('disabled_changed', disabled);
    }
  }

  public setHighlighted(highlighted: boolean): void {
    if (this.isHighlighted !== highlighted) {
      this.isHighlighted = highlighted;
      this.emit('highlighted_changed', highlighted);
    }
  }

  public setVariant(variant: UIVariant): void {
    this.variant = variant;
    this.emit('variant_changed', variant);
  }

  public initialize(): void {
    this.emit('ui_element_initialized', { id: this.id, role: this.themeRole });
  }

  public dispose(): void {
    this.emit('ui_element_disposed', { id: this.id });
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      role: this.themeRole,
      variant: this.variant,
      size: this.size,
      disabled: this.isDisabled,
      metadata: this.metadata,
    };
  }
}
