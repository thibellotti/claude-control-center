import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';

// Per-toast type styles using CSS variable tokens
const TYPE_STYLES = {
  info: 'border-border-default text-text-secondary',
  success: 'border-status-active text-status-active',
  warning: 'border-status-dirty text-status-dirty',
} as const;

// Simple text icons for each type
const TYPE_ICONS = {
  success: '✓',
  warning: '⚠',
  info: '•',
} as const;

interface ToastItemProps {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  onDismiss: (id: string) => void;
}

function ToastItem({ id, message, type, onDismiss }: ToastItemProps) {
  // Control enter animation: start hidden, become visible on mount
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger transition on next frame so CSS transition fires
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => onDismiss(id)}
      className={[
        // Layout
        'flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer select-none',
        // Surface
        'bg-surface-3',
        // Type-specific border + text color
        TYPE_STYLES[type],
        // Enter animation via Tailwind transition utilities
        'transition-all duration-200 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2',
      ].join(' ')}
    >
      <span className="text-sm font-medium leading-none" aria-hidden="true">
        {TYPE_ICONS[type]}
      </span>
      <span className="text-sm leading-snug">{message}</span>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}
