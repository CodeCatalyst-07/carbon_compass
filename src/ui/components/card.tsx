import { type HTMLAttributes, forwardRef } from 'react';

import { cn } from '../../lib/cn';

export type CardVariant = 'content' | 'sage' | 'green' | 'dark';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  as?: 'div' | 'section' | 'article';
}

const variantClasses: Record<CardVariant, string> = {
  content: 'bg-canvas text-ink',
  sage: 'bg-canvas-soft text-ink',
  green: 'bg-primary-pale text-ink',
  dark: 'bg-ink text-primary',
};

/**
 * Card primitive following DESIGN.md specifications.
 * - rounded-xl (24px) brand radius
 * - p-xl (24px) interior padding
 * - Four variants matching card-content, card-feature-sage, card-feature-green, card-feature-dark
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'content', as: Component = 'div', className, children, ...props },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn('rounded-xl p-xl', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
});
