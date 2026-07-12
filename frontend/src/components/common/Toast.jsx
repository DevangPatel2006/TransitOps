import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

/**
 * Toast system — success (green) / error (red) notifications surfacing raw backend messages.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Vehicle created');
 *   toast.error(err.response?.data?.error || 'Something went wrong');
 */

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-[10px] border shadow-elevated text-sm
              ${t.type === 'success'
                ? 'bg-status-available-bg border-status-available/30 text-green-300'
                : 'bg-status-retired-bg border-status-retired/30 text-red-300'
              }`}
          >
            {t.type === 'success'
              ? <CheckCircle className="w-5 h-5 text-status-available flex-shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-status-retired flex-shrink-0 mt-0.5" />
            }
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-content-muted hover:text-content-primary flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
