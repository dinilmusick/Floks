// ══════════════════════════════════════════════════════════════════════════════════════════
// InputParent: Master Form Controls & Inputs Parent Class & Components
// Traced to: UIElementBase -> GraphEntityParent
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role skeleton
import React from 'react';
import { usePalette } from '../palette/ThemeContext.js';

export interface SliderInputProps {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  onChange: (val: number) => void;
  className?: string;
  disabled?: boolean;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  id,
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  onChange,
  className = '',
  disabled = false,
}) => {
  const palette = usePalette();

  return (
    <div id={id} data-ui-parent="InputParent" className={`flex flex-col gap-1 select-none font-mono ${className}`}>
      {label && (
        <div className="flex justify-between items-center text-[10px] tracking-wider uppercase">
          <span style={{ color: palette.textSecondary }}>{label}</span>
          <span style={{ color: palette.accentPrimary }} className="font-bold">
            {value}{unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          accentColor: palette.accentPrimary,
          backgroundColor: palette.bgInput,
        }}
        className="w-full h-1.5 rounded-none border cursor-pointer disabled:opacity-40"
      />
    </div>
  );
};

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  id,
  label,
  value,
  className = '',
  style,
  ...props
}) => {
  const palette = usePalette();

  return (
    <div data-ui-parent="InputParent" className="flex flex-col gap-1 select-none font-mono">
      {label && (
        <label style={{ color: palette.textSecondary }} className="text-[10px] uppercase font-bold tracking-wider">
          {label}
        </label>
      )}
      <input
        id={id}
        value={value}
        style={{
          backgroundColor: palette.bgInput,
          borderColor: palette.borderMedium,
          color: palette.textPrimary,
          ...style,
        }}
        className={`w-full px-2.5 py-1.5 text-xs border rounded-none focus:outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
};

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
}

export const SelectInput: React.FC<SelectInputProps> = ({
  id,
  label,
  value,
  options = [],
  children,
  className = '',
  style,
  ...props
}) => {
  const palette = usePalette();

  return (
    <div data-ui-parent="InputParent" className="flex flex-col gap-1 select-none font-mono">
      {label && (
        <label style={{ color: palette.textSecondary }} className="text-[10px] uppercase font-bold tracking-wider">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        style={{
          backgroundColor: palette.bgInput,
          borderColor: palette.borderMedium,
          color: palette.textPrimary,
          ...style,
        }}
        className={`w-full px-2.5 py-1.5 text-xs border rounded-none focus:outline-none transition-colors cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: palette.bgSurface, color: palette.textPrimary }}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
    </div>
  );
};

export interface ToggleInputProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const ToggleInput: React.FC<ToggleInputProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  const palette = usePalette();

  return (
    <label
      id={id}
      data-ui-parent="InputParent"
      className="inline-flex items-center gap-2 cursor-pointer select-none font-mono text-xs"
      style={{ color: palette.textPrimary }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: palette.accentPrimary }}
        className="w-3.5 h-3.5 cursor-pointer rounded-none border"
      />
      <span>{label}</span>
    </label>
  );
};

// ── Input Model ──
import { UIElementBase, UIVariant, UISize } from './UIElementBase';

export class InputModel extends UIElementBase {
  constructor(id: string, name: string, variant: UIVariant = 'primary', size: UISize = 'md') {
    super(id, name, 'input', variant, size);
  }
}

