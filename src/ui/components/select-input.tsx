import { type SelectHTMLAttributes, forwardRef, useId } from 'react';

import { cn } from '../../lib/cn';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  id?: string;
  placeholder?: string;
}

/**
 * Select input primitive following DESIGN.md specifications.
 * - 1px solid ink border, rounded-md (12px)
 * - Associated label, optional hint and error text
 * - Accessible: auto-generates unique IDs
 */
export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { label, options, error, hint, id: externalId, placeholder, className, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = externalId ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={selectId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-mute">
          {hint}
        </p>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'w-full rounded-md border px-lg py-md',
          'text-base text-ink bg-canvas',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-negative' : 'border-ink',
          className,
        )}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
