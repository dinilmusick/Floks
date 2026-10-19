// ══════════════════════════════════════════════════════════════════════════════════════════
// ButtonParent: Master Core Button Parent Class & Component
// Floks Concrete UI Vocabulary -> Built on FrnlTS Semantic UI Contracts
// Simple Button -> UI Primitive
// Split Button  -> UI Composite
// ══════════════════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { useFloksFrnlStore } from '../frnl/store.js';
import { UIVariant, UISize, TooltipDirection } from './UIElementBase.js';
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
      setInspectionText(effectiveLabel || null, effectiveDesc || null);
    }
  };

  const handleMouseLeave = () => {
    setInspectionText(null);
  };

  const store = useFloksFrnlStore();
  const autoId = React.useId().replace(/[:/]/g, '');
  const effectiveId = id ?? (label ? `floks.button.${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${autoId}` : `floks.button.${autoId}`);
  const effectiveState = disabled ? 'disabled' : isActive ? 'active' : 'default';

  React.useEffect(() => {
    store.getState().registerEntity(effectiveId, {
      state: effectiveState,
      properties: { variant, size, disabled, isActive, label, kind: 'primitive' },
    });
    return () => {
      store.getState().unregisterEntity(effectiveId);
    };
  }, [effectiveId, store]);

  React.useEffect(() => {
    const entity = store.getState().entities[effectiveId];
    if (entity) {
      if (entity.state !== effectiveState) {
        store.getState().setEntityState(effectiveId, effectiveState);
      }
      store.getState().setEntityProperties(effectiveId, {
        variant,
        size,
        disabled,
        isActive,
        label,
        kind: 'primitive',
      });
    }
  }, [effectiveId, effectiveState, variant, size, disabled, isActive, label, store]);

  return (
    <button
      {...rest}
      id={effectiveId}
      data-ui-parent="ButtonParent"
      data-frnl-id={effectiveId}
      data-frnl-kind="ui-primitive"
      data-frnl-state={effectiveState}
      type="button"
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider border transition-all duration-150 active:scale-95 select-none disabled:opacity-40 disabled:pointer-events-none ${SIZE_STYLES[size]} ${className}`}
      style={{ ...variantStyle, ...activeDynamicStyle, ...style }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

// ── SplitButton: Concrete UI Composite ──

export interface SplitButtonProps {
  id?: string;
  label: string;
  onPrimaryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDropdownClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: UIVariant;
  size?: UISize;
  disabled?: boolean;
  isOpen?: boolean;
  dropdownMenu?: React.ReactNode;
  menuOccupants?: Record<string, React.ReactNode>;
  className?: string;
  style?: React.CSSProperties;
}

export const SplitButton: React.FC<SplitButtonProps> = ({
  id,
  label,
  onPrimaryClick,
  onDropdownClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isOpen = false,
  dropdownMenu,
  menuOccupants,
  className = '',
  style,
}) => {
  const store = useFloksFrnlStore();
  const autoId = React.useId().replace(/[:/]/g, '');
  const compositeId = id ?? (label ? `floks.splitbutton.${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${autoId}` : `floks.splitbutton.${autoId}`);
  const effectiveState = disabled ? 'disabled' : isOpen ? 'open' : 'default';

  React.useEffect(() => {
    store.getState().registerEntity(compositeId, {
      state: effectiveState,
      properties: { variant, size, isOpen, label, kind: 'composite' },
    });
    return () => {
      store.getState().unregisterEntity(compositeId);
    };
  }, [compositeId, store]);

  React.useEffect(() => {
    const entity = store.getState().entities[compositeId];
    if (entity) {
      if (entity.state !== effectiveState) {
        store.getState().setEntityState(compositeId, effectiveState);
      }
      store.getState().setEntityProperties(compositeId, {
        variant,
        size,
        isOpen,
        label,
        kind: 'composite',
      });
    }
  }, [compositeId, effectiveState, variant, size, isOpen, label, store]);

  return (
    <div
      id={compositeId}
      data-frnl-id={compositeId}
      data-frnl-kind="ui-composite"
      data-frnl-state={effectiveState}
      className={`inline-flex items-center relative ${className}`}
      style={style}
    >
      <ButtonParent
        id={`${compositeId}.primaryAction`}
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onPrimaryClick}
        className="rounded-r-none border-r-0"
      >
        {label}
      </ButtonParent>
      <ButtonParent
        id={`${compositeId}.dropdownAction`}
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onDropdownClick}
        className="rounded-l-none px-2"
        aria-label="Toggle Menu"
        aria-expanded={isOpen}
      >
        ▾
      </ButtonParent>
      {isOpen && (dropdownMenu || menuOccupants) && (
        <div className="absolute top-full left-0 mt-1 z-50">
          {dropdownMenu || (menuOccupants && Object.values(menuOccupants)[0])}
        </div>
      )}
    </div>
  );
};

// ── Specialized Button Archetypes ──
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
