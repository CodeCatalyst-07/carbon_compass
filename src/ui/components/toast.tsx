import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastProps {
  message: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: () => void;
}

const variantClasses: Record<ToastVariant, string> = {
  info: 'bg-canvas text-ink border-canvas-soft',
  success: 'bg-canvas text-positive-deep border-positive',
  error: 'bg-canvas text-negative-deep border-negative',
};

/**
 * Toast notification following DESIGN.md ex-toast spec.
 * - rounded-xl, bg-canvas
 * - Auto-dismisses after duration (default 4 seconds)
 * - Accessible: uses role="status" for polite announcements
 */
export function Toast({ message, variant = 'info', duration = 4000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 200); // Allow exit transition
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-xl right-xl z-50',
        'rounded-xl border px-lg py-md shadow-lg',
        'text-sm font-semibold',
        'transition-all duration-200',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        variantClasses[variant],
      )}
    >
      <div className="flex items-center gap-md">
        <span>{message}</span>
        <button
          onClick={onDismiss}
          className="rounded-full p-xs text-mute hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Dismiss notification"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
