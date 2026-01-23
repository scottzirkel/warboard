'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Toast, ToastType } from '@/stores/uiStore';

// ============================================================================
// Toast Icon and Styles
// ============================================================================

const toastIcons: Record<ToastType, ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-green-900/80',
    border: 'border-green-700',
    icon: 'text-green-400',
    text: 'text-green-100',
  },
  error: {
    bg: 'bg-red-900/80',
    border: 'border-red-700',
    icon: 'text-red-400',
    text: 'text-red-100',
  },
  warning: {
    bg: 'bg-yellow-900/80',
    border: 'border-yellow-700',
    icon: 'text-yellow-400',
    text: 'text-yellow-100',
  },
  info: {
    bg: 'bg-blue-900/80',
    border: 'border-blue-700',
    icon: 'text-blue-400',
    text: 'text-blue-100',
  },
};

// ============================================================================
// Single Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = toastStyles[toast.type];

  // Handle dismiss with exit animation
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 150);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg shadow-lg
        border backdrop-blur-sm
        ${styles.bg} ${styles.border}
        transform transition-all duration-150
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
        animate-in slide-in-from-right-4 fade-in
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {toastIcons[toast.type]}
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm ${styles.text}`}>
        {toast.message}
      </p>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors ${styles.icon}`}
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Toast Container Component
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed ${positionStyles[position]} z-50 flex flex-col gap-2 w-80 max-w-full pointer-events-auto`}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ============================================================================
// Standalone Toast Notification (for use without container)
// ============================================================================

interface ToastNotificationProps {
  type: ToastType;
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function ToastNotification({
  type,
  message,
  isVisible,
  onDismiss,
  duration = 3000,
}: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = toastStyles[type];

  // Auto-dismiss after duration
  useEffect(() => {
    if (!isVisible || duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 150);
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onDismiss]);

  // Handle manual dismiss
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 150);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 w-80 max-w-full
        flex items-start gap-3 p-3 rounded-lg shadow-lg
        border backdrop-blur-sm
        ${styles.bg} ${styles.border}
        transform transition-all duration-150
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
        animate-in slide-in-from-right-4 fade-in
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {toastIcons[type]}
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm ${styles.text}`}>
        {message}
      </p>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors ${styles.icon}`}
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
