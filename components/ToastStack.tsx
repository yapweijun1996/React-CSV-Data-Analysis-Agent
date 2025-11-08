import React from 'react';
import { useAppStore } from '../store/useAppStore';

const typeStyles: Record<'info' | 'success' | 'error', string> = {
    info: 'bg-slate-800 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
};

export const ToastStack: React.FC = () => {
    const { toasts, dismissToast } = useAppStore(state => ({
        toasts: state.toasts,
        dismissToast: state.dismissToast,
    }));

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-start justify-between rounded-lg shadow-lg px-4 py-3 text-sm ${typeStyles[toast.type]}`}
                >
                    <p className="pr-4">{toast.message}</p>
                    <button
                        onClick={() => dismissToast(toast.id)}
                        className="text-white/70 hover:text-white text-lg leading-none"
                        aria-label="Dismiss notification"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};
