// ══════════════════════════════════════════════════════════════════════════════════════════
// ButtonParent: Master Core Button Parent Class & Component
// Traced to: UIElementBase -> GraphEntityParent
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role component
import React, { useMemo } from 'react';
import { UIVariant, UISize, TooltipDirection } from './UIElementBase';
import { usePalette } from '../palette/ThemeContext.js';
import { useBottomStrip } from '../components/bottom-strip/index.js';

export interface ButtonParentProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: UIVariant;
  size?: UISize;
  label?: string;
  tooltip?: string;
  description?: string;
  tooltipDirection?: TooltipDirection;
  shortcutHint?: string;
  isActive?: boolean;
  icon?: React.ReactNode;
}

const SIZE_STYLES: Record<UISize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px] gap-1',
  sm: 'px-2 py-1 text-[10px] gap-1.5',
  md: 'px-3 py-1.5 text-xs gap-2',
  lg: 'px-4 py-2 text-sm gap-2.5',
  xl: 'px-5 py-2.5 text-base gap-3',
};

export const ButtonParent: React.FC<ButtonParentProps> = ({
  id,
  variant = 'primary',
  size = 'md',
  label,
  tooltip,
  description,
  tooltipDirection = 'bottom',
  shortcutHint,
  isActive = false,
  icon,
  className = '',
  disabled = false,
  children,
  onClick,
  style,
  ...rest
}) => {
  const palette = usePalette();
  const { setInspectionText } = useBottomStrip();

  const variantStyle = useMemo<React.CSSProperties>(() => {
    switch (variant) {
      case 'accent':
        return {
          backgroundColor: palette.accentPrimary,
          borderColor: palette.accentSecondary,
          color: palette.textInverse,
          boxShadow: `0 0 10px ${palette.accentGlow}`,
        };
      case 'dock':
        return {
          backgroundColor: palette.bgPrimary,
          borderColor: isActive ? palette.accentPrimary : palette.borderMedium,
          color: isActive ? palette.accentPrimary : palette.textPrimary,
        };
      case 'danger':
        return {
          backgroundColor: `${palette.danger}25`,
          borderColor: `${palette.danger}80`,
          color: palette.danger,
        };
      case 'emerald':
        return {
          backgroundColor: `${palette.success}25`,
          borderColor: `${palette.success}80`,
          color: palette.success,
        };
      case 'sky':
        return {
          backgroundColor: `${palette.info}25`,
          borderColor: `${palette.info}80`,
          color: palette.info,
        };
      case 'amber':
        return {
          backgroundColor: `${palette.warning}25`,
          borderColor: `${palette.warning}80`,
          color: palette.warning,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          color: palette.textMuted,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: palette.borderMedium,
          color: palette.textPrimary,
        };
      case 'secondary':
        return {
          backgroundColor: palette.bgSurface,
          borderColor: palette.borderSubtle,
          color: palette.textSecondary,
        };
      case 'primary':
      default:
        return {
          backgroundColor: palette.bgElevated,
          borderColor: palette.borderMedium,
          color: palette.textPrimary,
        };
    }
  }, [variant, palette, isActive]);

  const activeDynamicStyle: React.CSSProperties = isActive
    ? {
        borderColor: palette.accentPrimary,
        boxShadow: `0 0 12px ${palette.accentGlow}`,
        color: variant === 'accent' ? palette.textInverse : palette.accentPrimary,
      }
    : {};

  const handleMouseEnter = () => {
    const effectiveLabel = label || tooltip || (typeof children === 'string' ? children : undefined);
    const effectiveDesc = description || (shortcutHint ? `[${shortcutHint}]` : undefined);
    if (effectiveLabel || effectiveDesc) {
      setInspectionText({
        label: effectiveLabel,
        description: effectiveDesc,
      });
    }
  };

  const handleMouseLeave = () => {
    setInspectionText(null);
  };

  return (
    <button
      id={id}
      data-ui-parent="ButtonParent"
      type="button"
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
      }}
      style={{ ...variantStyle, ...activeDynamicStyle, ...style }}
      className={`inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider border transition-all duration-150 active:scale-95 select-none disabled:opacity-40 disabled:pointer-events-none ${SIZE_STYLES[size]} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

// ── Button Models & Specialized Button Archetypes ──
import { UIElementBase } from './UIElementBase';

export class ButtonModel extends UIElementBase {
  constructor(id: string, name: string, variant: UIVariant = 'primary', size: UISize = 'md') {
    super(id, name, 'button', variant, size);
  }
}

export type ButtonVariant = UIVariant;
export type ButtonSize = UISize;
export type ButtonProps = ButtonParentProps;

export const ActionButton: React.FC<ButtonParentProps> = (props) => (
  <ButtonParent variant="accent" {...props} />
);

export const IconButton: React.FC<ButtonParentProps> = (props) => (
  <ButtonParent variant="secondary" {...props} />
);

export const ToggleButton: React.FC<ButtonParentProps> = (props) => (
  <ButtonParent variant="dock" {...props} />
);

export const DangerButton: React.FC<ButtonParentProps> = (props) => (
  <ButtonParent variant="danger" {...props} />
);

export const GhostButton: React.FC<ButtonParentProps> = (props) => (
  <ButtonParent variant="ghost" {...props} />
);

