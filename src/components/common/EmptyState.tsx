import React from 'react';
import { RefreshCw, Search, ShoppingBag } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: 'search' | 'cart' | 'package' | 'custom';
    customIcon?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    isLoading?: boolean;
}

const icons = {
    search: Search,
    cart: ShoppingBag,
    package: ShoppingBag,
    custom: null,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon = 'package',
    customIcon,
    actionLabel,
    onAction,
    isLoading = false,
}) => {
    const IconComponent = icon && !customIcon ? icons[icon] : null;

    return (
        <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
            role="status"
            aria-live="polite"
        >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {customIcon || (IconComponent && (
                    <IconComponent className="h-12 w-12 text-gray-400" />
                ))}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {title}
            </h3>

            <p className="text-gray-600 mb-6 max-w-md">
                {description}
            </p>

            {actionLabel && onAction && (
                <Button
                    variant="primary"
                    onClick={onAction}
                    isLoading={isLoading}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
