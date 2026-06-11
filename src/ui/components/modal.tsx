import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog using <dialog> element.
 * - Focus-trapped via native dialog behavior
 * - Closes on Escape key (native)
 * - Closes on backdrop click
 * - DESIGN.md: rounded-xl, bg-canvas, p-xl
 */
export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // Handle native close event (Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Click was on the backdrop (the dialog element itself, not its children)
    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (!isInDialog) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'rounded-xl p-xl bg-canvas text-ink',
        'max-w-lg w-[calc(100%-2rem)]',
        'backdrop:bg-ink/50',
        'open:flex open:flex-col open:gap-lg',
        className,
      )}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
    >
      <header className="flex items-center justify-between">
        <h2 id="modal-title" className="text-xl font-semibold text-ink">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="rounded-full p-sm text-mute hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Close dialog"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div>{children}</div>
    </dialog>
  );
}
