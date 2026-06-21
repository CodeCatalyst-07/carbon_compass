import { type InputHTMLAttributes, forwardRef, useId } from 'react';

import { cn } from '../../lib/cn';

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
}

/**
 * Text input primitive following DESIGN.md specifications.
 * - 1px solid ink border, rounded-md (12px)
 * - Associated label, optional hint and error text
 * - Accessible: auto-generates unique IDs, uses aria-describedby
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, hint, id: externalId, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

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
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-md border px-lg py-md',
          'text-base text-ink bg-canvas',
          'placeholder:text-mute',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-negative' : 'border-ink',
          className,
        )}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
