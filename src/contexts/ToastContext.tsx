import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
    isVisible: boolean;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType) => void;
    hideToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = toastId++;
        const newToast: Toast = {
            id,
            message,
            type,
            isVisible: true
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideToast(id);
        }, 5000);
    };

    const hideToast = (id: number) => {
        setToasts(prev =>
            prev.map(toast =>
                toast.id === id ? { ...toast, isVisible: false } : toast
            )
        );

        // Remove from DOM after animation
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 300);
    };

    return (
        <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};