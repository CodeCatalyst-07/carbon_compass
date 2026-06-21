import { Minus, Plus } from 'lucide-react';
import { forwardRef, useId } from 'react';

import { cn } from '../../lib/cn';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  hint?: string;
  id?: string;
  unit?: string;
  disabled?: boolean;
}

/**
 * Numeric input with accessible stepper buttons.
 * - Increment/decrement bounded by min/max
 * - Optional unit suffix displayed inline
 * - Hides native spin buttons for consistent cross-browser appearance
 * - Proper label, hint, and error associations via aria-describedby
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { label, value, onChange, min = 0, max, step = 1, error, hint, id: externalId, unit, disabled },
  ref,
) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const handleIncrement = () => {
    const newVal = Math.round((value + step) * 100) / 100;
    if (max !== undefined && newVal > max) return;
    onChange(newVal);
  };

  const handleDecrement = () => {
    const newVal = Math.round((value - step) * 100) / 100;
    if (newVal < min) return;
    onChange(newVal);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(min);
      return;
    }
    const val = parseFloat(raw);
    if (Number.isNaN(val)) return;
    onChange(val);
  };

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-mute">
          {hint}
        </p>
      )}
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled ?? value <= min}
          className={cn(
            'flex shrink-0 items-center justify-center w-10 h-10 rounded-xl',
            'bg-canvas-soft text-ink hover:bg-primary-pale',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'transition-colors duration-150',
          )}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <div className="relative flex-1 min-w-0">
          <input
            ref={ref}
            id={inputId}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              'w-full rounded-md border px-lg py-md text-center',
              'text-base text-ink bg-canvas',
              '[appearance:textfield]',
              '[&::-webkit-outer-spin-button]:appearance-none',
              '[&::-webkit-inner-spin-button]:appearance-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-negative' : 'border-ink',
              unit ? 'pr-12' : '',
            )}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
          {unit && (
            <span className="absolute right-lg top-1/2 -translate-y-1/2 text-sm text-mute pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled ?? (max !== undefined && value >= max)}
          className={cn(
            'flex shrink-0 items-center justify-center w-10 h-10 rounded-xl',
            'bg-canvas-soft text-ink hover:bg-primary-pale',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'transition-colors duration-150',
          )}
          aria-label={`Increase ${label}`}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
