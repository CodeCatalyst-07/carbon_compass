import { Info } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useId } from 'react';

import { cn } from '../../lib/cn';

interface TooltipProps {
  /** Text content to display in the tooltip. */
  content: string;
  className?: string;
}

/**
 * Inline tooltip triggered by an info icon button.
 *
 * Interaction model (amendment 6):
 * - Hover: opens on mouseenter, closes on mouseleave (unless pinned)
 * - Keyboard focus: opens on focus, closes on blur (unless pinned)
 * - Touch/click: toggles pinned state
 * - Escape: closes and returns focus to trigger
 * - aria-describedby: trigger button references tooltip via id
 *
 * The tooltip positions above the trigger by default.
 */
export function Tooltip({ content, className }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setIsPinned(false);
  }, []);

  // Click/touch: toggle pinned state
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isPinned) {
        close();
      } else {
        setIsPinned(true);
        open();
      }
    },
    [isPinned, open, close],
  );

  // Hover: open/close only when NOT pinned
  const handleMouseEnter = useCallback(() => {
    if (!isPinned) open();
  }, [isPinned, open]);

  const handleMouseLeave = useCallback(() => {
    if (!isPinned) setIsOpen(false);
  }, [isPinned]);

  // Focus: open; blur: close only when NOT pinned
  const handleFocus = useCallback(() => {
    if (!isPinned) open();
  }, [isPinned, open]);

  const handleBlur = useCallback(() => {
    if (!isPinned) setIsOpen(false);
  }, [isPinned]);

  // Escape: always close and return focus
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [isOpen, close]);

  // Click outside: close pinned tooltip
  useEffect(() => {
    if (!isPinned) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    // Use setTimeout to avoid catching the same click that pinned it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isPinned, close]);

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 rounded-full text-mute hover:text-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'transition-colors duration-150',
        )}
      >
        <Info size={14} aria-hidden="true" />
        <span className="sr-only">More information</span>
      </button>
      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'w-64 max-w-[calc(100vw-2rem)]',
            'rounded-lg bg-ink text-canvas p-md',
            'text-xs leading-relaxed shadow-lg',
          )}
        >
          {content}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink"
            aria-hidden="true"
          />
        </div>
      )}
    </span>
  );
}
