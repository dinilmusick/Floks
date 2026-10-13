// ══════════════════════════════════════════════════════════════════════════════════════════
// PanelParent: Master Window / Modal / Floating Deck Parent Class & Component
// Traced to: UIElementBase -> GraphEntityParent
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role skeleton
import React, { useMemo } from 'react';
import { Pin, X, Move } from 'lucide-react';
import { usePalette } from '../palette/ThemeContext.js';
import { ButtonParent } from './ButtonParent';

export interface PanelParentProps {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  isPinned?: boolean;
  accentColor?: string;
  zIndex?: number;
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
  onTogglePin?: () => void;
  onClose?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const PanelParent: React.FC<PanelParentProps> = ({
  id,
  title,
  subtitle,
  badge,
  isPinned = false,
  accentColor,
  zIndex = 50,
  width,
  height,
  position,
  children,
  headerActions,
  className = '',
  onTogglePin,
  onClose,
  onMouseDown,
}) => {
  const palette = usePalette();
  const effectiveAccent = accentColor || palette.accentPrimary;

  const style: React.CSSProperties = useMemo(() => ({
    zIndex,
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    left: position ? `${position.x}px` : undefined,
    top: position ? `${position.y}px` : undefined,
    position: position ? 'fixed' : 'relative',
    backgroundColor: palette.bgSurface,
    borderColor: palette.borderMedium,
    boxShadow: `4px 4px 0px ${palette.bgPrimary}, 0 0 20px rgba(0,0,0,0.6)`,
    color: palette.textPrimary,
  }), [zIndex, width, height, position, palette]);

  return (
    <div
      id={id}
      data-ui-parent="PanelParent"
      onMouseDown={onMouseDown}
      style={style}
      className={`flex flex-col border-2 select-none font-mono transition-colors ${className}`}
    >
      {/* Draggable Header Bar */}
      <div
        style={{
          backgroundColor: palette.bgElevated,
          borderBottomColor: palette.borderSubtle,
        }}
        className="flex items-center justify-between px-3 py-2 border-b cursor-move"
      >
        <div className="flex items-center gap-2 truncate">
          <Move className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-1.5 truncate">
              <span
                style={{ color: effectiveAccent }}
                className="text-xs font-black uppercase tracking-wider truncate"
              >
                {title}
              </span>
              {badge && (
                <span
                  style={{
                    backgroundColor: palette.bgInput,
                    borderColor: palette.borderSubtle,
                    color: palette.textSecondary,
                  }}
                  className="text-[8px] border px-1 py-0.2 rounded font-bold"
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <span style={{ color: palette.textMuted }} className="text-[9px] truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {headerActions}

          {onTogglePin && (
            <ButtonParent
              variant={isPinned ? 'accent' : 'ghost'}
              size="xs"
              tooltip={isPinned ? 'Unpin Window' : 'Pin Window in Workspace'}
              tooltipDirection="bottom"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'rotate-45' : ''}`} />
            </ButtonParent>
          )}

          {onClose && (
            <ButtonParent
              variant="danger"
              size="xs"
              tooltip="Close Window"
              tooltipDirection="bottom"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="w-3.5 h-3.5" />
            </ButtonParent>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
};
