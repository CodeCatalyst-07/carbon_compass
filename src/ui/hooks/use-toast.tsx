/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

import { Toast, type ToastVariant } from '../components/toast';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast stack — fixed to bottom-right */}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="fixed bottom-xl right-xl z-50 flex flex-col gap-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              message={t.message}
              variant={t.variant}
              onDismiss={() => {
                removeToast(t.id);
              }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}
