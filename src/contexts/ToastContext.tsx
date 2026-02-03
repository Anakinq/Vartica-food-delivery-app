import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'>) => void;
    hideToast: (id: string) => void;
    success: (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => void;
    error: (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => void;
    warning: (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => void;
    info: (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

const DEFAULT_DURATION = 5000;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const hideToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const showToast = (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = {
            id,
            duration: DEFAULT_DURATION,
            ...toast
        };

        setToasts(prev => [...prev, newToast]);

        // Auto dismiss after duration
        if (newToast.duration !== 0) {
            setTimeout(() => {
                hideToast(id);
            }, newToast.duration);
        }
    };

    const success = (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => {
        showToast({
            type: 'success',
            message,
            ...options
        });
    };

    const error = (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => {
        showToast({
            type: 'error',
            message,
            duration: options?.duration ?? 7000, // Longer duration for errors
            ...options
        });
    };

    const warning = (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => {
        showToast({
            type: 'warning',
            message,
            ...options
        });
    };

    const info = (message: string, options?: Omit<Toast, 'id' | 'type' | 'message'>) => {
        showToast({
            type: 'info',
            message,
            ...options
        });
    };

    return (
        <ToastContext.Provider
            value={{
                toasts,
                showToast,
                hideToast,
                success,
                error,
                warning,
                info
            }}
        >
            {children}
            <ToastContainer toasts={toasts} onDismiss={hideToast} />
        </ToastContext.Provider>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-md">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={() => onDismiss(toast.id)}
                />
            ))}
        </div>
    );
};

interface ToastItemProps {
    toast: Toast;
    onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
    const { type, message, action } = toast;
    const [isVisible, setIsVisible] = useState(true);
    // const [height, setHeight] = useState(0); // Unused

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'info':
                return <Info className="h-5 w-5 text-blue-500" />;
            default:
                return null;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-white border-gray-200';
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success':
                return 'border-l-4 border-l-green-500';
            case 'error':
                return 'border-l-4 border-l-red-500';
            case 'warning':
                return 'border-l-4 border-l-yellow-500';
            case 'info':
                return 'border-l-4 border-l-blue-500';
            default:
                return 'border-l-4 border-l-gray-500';
        }
    };

    const handleActionClick = () => {
        if (action?.onClick) {
            action.onClick();
            onDismiss();
        }
    };

    return (
        <div
            className={`transform transition-all duration-300 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
            onTransitionEnd={() => {
                if (!isVisible) {
                    onDismiss();
                }
            }}
        >
            <div
                className={`rounded-lg border shadow-lg p-4 ${getBackgroundColor()} ${getBorderColor()} flex items-start`}
            >
                <div className="flex-shrink-0 mt-0.5">
                    {getIcon()}
                </div>

                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                        {message}
                    </p>

                    {action && (
                        <div className="mt-2">
                            <button
                                onClick={handleActionClick}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                                {action.label}
                            </button>
                        </div>
                    )}
                </div>

                <div className="ml-4 flex-shrink-0">
                    <button
                        onClick={() => {
                            setIsVisible(false);
                        }}
                        className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ToastContext;