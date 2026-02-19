import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast as ToastType, useToast } from '../contexts/ToastContext';

interface ToastProps {
    toast: ToastType;
}

const ToastComponent: React.FC<ToastProps> = ({ toast }) => {
    const { hideToast } = useToast();

    const getToastStyles = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-green-500 text-white border-green-600';
            case 'error':
                return 'bg-red-500 text-white border-red-600';
            case 'warning':
                return 'bg-yellow-500 text-white border-yellow-600';
            case 'info':
                return 'bg-blue-500 text-white border-blue-600';
            default:
                return 'bg-gray-500 text-white border-gray-600';
        }
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle className="h-5 w-5" />;
            case 'error':
                return <AlertCircle className="h-5 w-5" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5" />;
            case 'info':
                return <Info className="h-5 w-5" />;
            default:
                return <Info className="h-5 w-5" />;
        }
    };

    return (
        <div
            className={`flex items-center justify-between p-4 rounded-lg border shadow-lg transform transition-all duration-300 ${toast.isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                } ${getToastStyles()}`}
        >
            <div className="flex items-center space-x-3">
                {getIcon()}
                <span className="font-medium">{toast.message}</span>
            </div>
            <button
                onClick={() => hideToast(toast.id)}
                className="ml-4 text-white hover:text-gray-200 transition-colors"
                aria-label="Close toast"
            >
                <X className="h-5 w-5" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} />
            ))}
        </div>
    );
};

export default ToastComponent;