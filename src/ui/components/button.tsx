import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-active',
  secondary: 'bg-canvas-soft text-ink hover:bg-canvas-soft/80',
  tertiary: 'bg-canvas text-ink border border-ink hover:bg-canvas-soft/40',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'px-xl py-md text-base',
  sm: 'px-lg py-sm text-sm',
};

/**
 * Button primitive following DESIGN.md specifications.
 * - rounded-xl (24px) pill shape
 * - font-semibold (600)
 * - Three variants: primary (lime CTA), secondary (sage), tertiary (outline)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-sm',
        'rounded-xl font-semibold leading-6',
        'transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});
