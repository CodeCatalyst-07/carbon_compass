import { useId } from 'react';

import { cn } from '../../lib/cn';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
  name?: string;
  disabled?: boolean;
}

/**
 * Segmented control — radio group rendered as pill segments.
 * - Uses <fieldset> + <legend> for accessible grouping
 * - Each option is a <label> wrapping a visually-hidden radio
 * - Selected state uses primary brand color
 * - Supports optional description text per option
 */
export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  error,
  name: externalName,
  disabled,
}: SegmentedControlProps<T>) {
  const generatedId = useId();
  const groupName = externalName ?? generatedId;
  const errorId = error ? `${groupName}-error` : undefined;

  return (
    <fieldset className="flex flex-col gap-sm" aria-describedby={errorId} disabled={disabled}>
      <legend className="text-sm font-semibold text-ink mb-xs">{legend}</legend>
      <div className="flex flex-wrap gap-sm">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          const optionId = `${groupName}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={optionId}
              className={cn(
                'flex-1 min-w-[100px] cursor-pointer select-none',
                'rounded-xl px-lg py-md text-center',
                'text-sm font-semibold transition-colors duration-150',
                'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
                isSelected
                  ? 'bg-primary text-on-primary'
                  : 'bg-canvas-soft text-ink hover:bg-primary-pale',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={isSelected}
                onChange={() => {
                  onChange(opt.value);
                }}
                disabled={disabled}
                className="sr-only"
              />
              <span className="block">{opt.label}</span>
              {opt.description && (
                <span className="block text-xs font-normal opacity-80 mt-1">{opt.description}</span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
