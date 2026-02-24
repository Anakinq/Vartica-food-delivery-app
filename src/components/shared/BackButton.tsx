import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface BackButtonProps {
    onBack: () => void;
    onClose?: () => void;
    title?: string;
    showClose?: boolean;
    className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
    onBack,
    onClose,
    title,
    showClose = true,
    className = ''
}) => {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`}>
            <div className="flex items-center">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                {title && (
                    <h2 className="text-xl font-bold text-black">{title}</h2>
                )}
            </div>
            {showClose && onClose && (
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <X className="h-6 w-6" />
                </button>
            )}
        </div>
    );
};

interface BackNavigationContextType {
    history: string[];
    push: (path: string) => void;
    pop: () => string | null;
    canGoBack: boolean;
}

const BackNavigationContext = React.createContext<BackNavigationContextType | null>(null);

export const BackNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [history, setHistory] = React.useState<string[]>([]);

    const push = (path: string) => {
        setHistory(prev => [...prev, path]);
    };

    const pop = () => {
        if (history.length === 0) return null;
        const newHistory = [...history];
        const lastPath = newHistory.pop();
        setHistory(newHistory);
        return lastPath || null;
    };

    const canGoBack = history.length > 0;

    return (
        <BackNavigationContext.Provider value={{ history, push, pop, canGoBack }}>
            {children}
        </BackNavigationContext.Provider>
    );
};

export const useBackNavigation = () => {
    const context = React.useContext(BackNavigationContext);
    if (!context) {
        throw new Error('useBackNavigation must be used within BackNavigationProvider');
    }
    return context;
};

// Enhanced Back Button with History Support
export const EnhancedBackButton: React.FC<BackButtonProps & {
    useHistory?: boolean;
    fallbackPath?: string;
}> = ({
    onBack,
    onClose,
    title,
    showClose = true,
    className = '',
    useHistory = false,
    fallbackPath = '/'
}) => {
        const { pop, canGoBack } = useBackNavigation();

        const handleBack = () => {
            if (useHistory && canGoBack) {
                const previousPath = pop();
                if (previousPath) {
                    window.location.hash = previousPath;
                    return;
                }
            }
            onBack();
        };

        return (
            <BackButton
                onBack={handleBack}
                onClose={onClose}
                title={title}
                showClose={showClose}
                className={className}
            />
        );
    };