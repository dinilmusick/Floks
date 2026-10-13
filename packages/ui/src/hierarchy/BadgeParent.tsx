// ══════════════════════════════════════════════════════════════════════════════════════════
// BadgeParent: Master Badges, Telemetry & Status Indicators Parent Class & Components
// Traced to: UIElementBase -> GraphEntityParent
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role component
import React from 'react';
import { usePalette } from '../palette/ThemeContext.js';

export interface BadgeProps {
  id?: string;
  label: string;
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  id,
  label,
  variant = 'primary',
  size = 'sm',
  className = '',
}) => {
  const palette = usePalette();

  const colorStyle = React.useMemo(() => {
    switch (variant) {
      case 'accent':
        return {
          backgroundColor: `${palette.accentPrimary}25`,
          borderColor: palette.accentPrimary,
          color: palette.accentHover,
        };
      case 'success':
        return {
          backgroundColor: `${palette.success}25`,
          borderColor: palette.success,
          color: palette.success,
        };
      case 'warning':
        return {
          backgroundColor: `${palette.warning}25`,
          borderColor: palette.warning,
          color: palette.warning,
        };
      case 'danger':
        return {
          backgroundColor: `${palette.danger}25`,
          borderColor: palette.danger,
          color: palette.danger,
        };
      case 'info':
        return {
          backgroundColor: `${palette.info}25`,
          borderColor: palette.info,
          color: palette.info,
        };
      case 'primary':
      default:
        return {
          backgroundColor: palette.bgInput,
          borderColor: palette.borderMedium,
          color: palette.textSecondary,
        };
    }
  }, [variant, palette]);

  const sizeClasses = size === 'xs' ? 'text-[8px] px-1 py-0.2' : size === 'md' ? 'text-xs px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';

  return (
    <span
      id={id}
      data-ui-parent="BadgeParent"
      style={colorStyle}
      className={`inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider border select-none ${sizeClasses} ${className}`}
    >
      {label}
    </span>
  );
};

export interface TelemetryPillProps {
  id?: string;
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}

export const TelemetryPill: React.FC<TelemetryPillProps> = ({
  id,
  label,
  value,
  unit,
  accent = false,
}) => {
  const palette = usePalette();

  return (
    <div
      id={id}
      data-ui-parent="BadgeParent"
      style={{
        backgroundColor: palette.bgPrimary,
        borderColor: accent ? palette.accentPrimary : palette.borderSubtle,
      }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[10px] select-none"
    >
      <span style={{ color: palette.textMuted }} className="uppercase text-[8px] font-bold">
        {label}
      </span>
      <span
        style={{ color: accent ? palette.accentHover : palette.textPrimary }}
        className="font-black"
      >
        {value}
        {unit && <span style={{ color: palette.textMuted }} className="ml-0.5 text-[8px] font-normal">{unit}</span>}
      </span>
    </div>
  );
};

export interface StatusDotProps {
  id?: string;
  active?: boolean;
  color?: string;
  pulse?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  id,
  active = true,
  color,
  pulse = false,
}) => {
  const palette = usePalette();
  const effectiveColor = color || (active ? palette.accentPrimary : palette.borderMedium);

  return (
    <span
      id={id}
      data-ui-parent="BadgeParent"
      style={{
        backgroundColor: effectiveColor,
        boxShadow: active ? `0 0 6px ${effectiveColor}` : 'none',
      }}
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        pulse && active ? 'animate-pulse' : ''
      }`}
    />
  );
};

// ── Badge Model & Tone ──
import { UIElementBase, UIVariant, UISize } from './UIElementBase';

export class BadgeModel extends UIElementBase {
  constructor(id: string, name: string, variant: UIVariant = 'primary', size: UISize = 'md') {
    super(id, name, 'badge', variant, size);
  }
}

export type BadgeTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

