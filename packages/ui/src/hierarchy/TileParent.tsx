// ══════════════════════════════════════════════════════════════════════════════════════════
// TileParent: Master Grid Tile & Sortable Card Parent Class & Component
// Traced to: UIElementBase -> GraphEntityParent
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role component
import React, { useState, useRef, useEffect } from 'react';
import { usePalette } from '../palette/ThemeContext.js';
import { useBottomStrip } from '../components/bottom-strip/index.js';

export interface TileParentProps {
  id: string;
  icon?: React.ReactNode;
  accentColor?: string;
  badge?: string;
  badgeColor?: string;
  title?: string;
  description?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  isSelected?: boolean;
  isPlaying?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  hideDecorations?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const TileParent: React.FC<TileParentProps> = ({
  id,
  icon,
  accentColor,
  badge,
  badgeColor,
  title,
  description,
  primaryActionText = 'Click to focus',
  secondaryActionText = 'Double-click to open',
  isSelected = false,
  isPlaying = false,
  onClick,
  onDoubleClick,
  children,
  hideDecorations = false,
  className = '',
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const palette = usePalette();
  const { setInspectionText } = useBottomStrip();

  useEffect(() => {
    if (isHovered && title) {
      const words = title.trim().split(/\s+/);
      const label = words.slice(0, 3).join(' ').toUpperCase();
      const descRest = words.length > 3 ? words.slice(3).join(' ') : '';
      const descItems = [descRest, description, primaryActionText || 'Click to focus'].filter(Boolean);
      const desc = descItems.join(' • ');
      setInspectionText({
        label,
        description: desc || undefined,
      });
    }
    return () => {
      if (isHovered) {
        setInspectionText(null);
      }
    };
  }, [isHovered, title, description, badge, primaryActionText, setInspectionText]);

  const effectiveAccent = accentColor || palette.accentPrimary;
  const isHighlighted = isSelected || isHovered;

  const dynamicStyle: React.CSSProperties = {
    backgroundColor: isSelected ? palette.bgElevated : palette.bgSurface,
    borderColor: isSelected ? effectiveAccent : isHovered ? palette.accentHover : palette.borderSubtle,
    boxShadow: isHighlighted ? `0 0 12px ${palette.accentGlow}` : 'none',
    ...style,
  };

  return (
    <div
      ref={tileRef}
      id={id}
      data-ui-parent="TileParent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={dynamicStyle}
      className={`relative group flex flex-col items-center justify-center w-full aspect-square border-2 transition-all cursor-pointer select-none font-mono ${
        isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'
      } ${className}`}
    >
      {/* Icon Area */}
      {!hideDecorations && icon && (
        <div
          style={{
            backgroundColor: isSelected ? palette.bgPrimary : palette.bgInput,
            borderColor: isSelected ? effectiveAccent : palette.borderSubtle,
            color: isSelected ? palette.accentHover : palette.textPrimary,
          }}
          className={`p-3 border transition-all flex items-center justify-center ${
            isPlaying ? 'animate-pulse ring-2 ring-rose-500' : ''
          }`}
        >
          {icon}
        </div>
      )}

      {children}

      {/* Domain Accent Indicator Dot */}
      {!hideDecorations && (
        <div
          className={`w-1.5 h-1.5 rounded-full mt-1.5 transition-transform ${
            isSelected ? 'scale-150 ring-2 ring-white/40' : 'group-hover:scale-125'
          }`}
          style={{ backgroundColor: effectiveAccent }}
        />
      )}

    </div>
  );
};

// ── Tile Models & Specialized Tile Archetypes ──
import { UIElementBase, UIVariant, UISize } from './UIElementBase';

export class TileModel extends UIElementBase {
  constructor(id: string, name: string, variant: UIVariant = 'primary', size: UISize = 'md') {
    super(id, name, 'tile', variant, size);
  }
}

export type TileVariant = 'default' | 'clip' | 'category' | 'strip';

export const SpawnOptionTile: React.FC<TileParentProps> = (props) => (
  <TileParent {...props} />
);

export const CategoryCardTile: React.FC<TileParentProps> = (props) => (
  <TileParent {...props} />
);

export const ClipCardTile: React.FC<TileParentProps> = (props) => (
  <TileParent {...props} />
);

export const ChannelStripTile: React.FC<TileParentProps> = (props) => (
  <TileParent {...props} />
);

