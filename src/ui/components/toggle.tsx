import { useId } from 'react';
import { cn } from '../../lib/cn';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Accessible toggle switch.
 * - Uses role="switch" with aria-checked
 * - Labelled via aria-labelledby
 * - Optional hint with aria-describedby
 * - Smooth transition for the thumb
 */
export function Toggle({ label, checked, onChange, hint, id: externalId, disabled }: ToggleProps) {
  const generatedId = useId();
  const toggleId = externalId ?? generatedId;
  const labelId = `${toggleId}-label`;
  const hintId = hint ? `${toggleId}-hint` : undefined;

  return (
    <div className="flex items-center justify-between gap-lg">
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="text-sm font-semibold text-ink">
          {label}
        </span>
        {hint && (
          <p id={hintId} className="text-sm text-mute">
            {hint}
          </p>
        )}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 rounded-pill',
          'transition-colors duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-primary' : 'bg-mute',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-canvas shadow-sm',
            'transition-transform duration-200',
            checked && 'translate-x-5',
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
