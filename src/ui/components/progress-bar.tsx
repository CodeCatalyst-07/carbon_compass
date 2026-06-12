import { cn } from '../../lib/cn';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  className?: string;
}

/**
 * Multi-step progress bar.
 * - role="progressbar" with aria-valuenow/valuemin/valuemax
 * - Step labels visible on desktop, dot indicators on mobile
 * - Current step text always visible as a caption on mobile
 */
export function ProgressBar({ currentStep, totalSteps, stepLabels, className }: ProgressBarProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={cn('flex flex-col gap-sm', className)}>
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep} of ${totalSteps}: ${stepLabels[currentStep - 1] ?? ''}`}
        className="h-2 w-full rounded-pill bg-canvas-soft overflow-hidden"
      >
        <div
          className="h-full rounded-pill bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Desktop: step labels */}
      <div className="hidden md:flex justify-between" aria-hidden="true">
        {stepLabels.map((label, i) => (
          <span
            key={i}
            className={cn(
              'text-xs transition-colors',
              i + 1 <= currentStep ? 'text-ink font-semibold' : 'text-mute',
              i + 1 === currentStep && 'text-ink-deep',
            )}
          >
            {label}
          </span>
        ))}
      </div>
      {/* Mobile: dots */}
      <div className="flex md:hidden justify-center gap-sm" aria-hidden="true">
        {stepLabels.map((_, i) => (
          <span
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i + 1 <= currentStep ? 'bg-primary' : 'bg-canvas-soft',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-mute text-center md:hidden">
        Step {currentStep} of {totalSteps} — {stepLabels[currentStep - 1]}
      </p>
    </div>
  );
}
