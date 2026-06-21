import { cn } from '../../lib/cn';

import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'positive' | 'negative' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  positive: 'bg-primary-pale text-positive-deep',
  negative: 'bg-negative-bg text-canvas',
  neutral: 'bg-canvas-soft text-ink',
};

/**
 * Badge/pill primitive following DESIGN.md specifications.
 * - rounded-pill (9999px)
 * - body-sm-strong typography
 * - Three semantic variants
 */
export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-md py-xs',
        'rounded-pill text-sm font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
