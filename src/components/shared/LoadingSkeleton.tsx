import React from 'react';

interface SkeletonProps {
    className?: string;
    count?: number;
    variant?: 'card' | 'list' | 'table' | 'text' | 'avatar';
}

// Brand colors for Vartica
const BRAND_COLORS = {
    primary: 'bg-orange-500',
    primaryLight: 'bg-orange-200',
    secondary: 'bg-gray-200',
    secondaryLight: 'bg-gray-100',
};

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    count = 1,
    variant = 'card'
}) => {
    const baseClasses = 'animate-pulse rounded';

    const variantClasses = {
        card: `h-48 rounded-xl ${BRAND_COLORS.secondaryLight}`,
        list: 'h-16 rounded-lg bg-white border border-gray-100',
        table: 'h-12 rounded bg-white',
        text: `h-4 rounded ${BRAND_COLORS.secondary}`,
        avatar: `h-10 w-10 rounded-full ${BRAND_COLORS.primaryLight}`
    };

    const skeletons = Array.from({ length: count }, (_, index) => (
        <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        />
    ));

    return <>{skeletons}</>;
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex items-start justify-between mb-4">
                    <Skeleton variant="avatar" className="mb-0" />
                    <div className="flex-1 ml-4">
                        <Skeleton variant="text" className="w-3/4 h-5 mb-2" />
                        <Skeleton variant="text" className="w-1/2 h-4" />
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <Skeleton variant="text" className="w-full h-4" />
                    <Skeleton variant="text" className="w-2/3 h-4" />
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <Skeleton variant="text" className="w-20 h-6" />
                    <Skeleton variant="text" className="w-24 h-10 rounded-lg" />
                </div>
            </div>
        ))}
    </div>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-gray-100">
                <Skeleton variant="avatar" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-3/4 h-5" />
                    <Skeleton variant="text" className="w-1/2 h-4" />
                </div>
                <Skeleton variant="text" className="w-16 h-8 rounded-lg" />
            </div>
        ))}
    </div>
);

export const TableSkeleton: React.FC<{ rows?: number, cols?: number }> = ({
    rows = 5,
    cols = 4
}) => (
    <div className="overflow-hidden rounded-lg border border-gray-100">
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50">
            {Array.from({ length: cols }, (_, i) => (
                <Skeleton key={`header-${i}`} variant="text" className="h-6 bg-gray-200" />
            ))}
        </div>
        <div className="divide-y">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 p-4">
                    {Array.from({ length: cols }, (_, j) => (
                        <Skeleton key={`cell-${i}-${j}`} variant="text" className="h-5" />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <Skeleton variant="text" className="w-20 h-4" />
                        <div className={`w-10 h-10 rounded-full ${BRAND_COLORS.primaryLight}`}></div>
                    </div>
                    <Skeleton variant="text" className="w-16 h-8" />
                </div>
            ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                <Skeleton variant="text" className="w-48 h-6 mb-4" />
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <Skeleton variant="avatar" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="text" className="w-3/4 h-4" />
                                <Skeleton variant="text" className="w-1/2 h-3" />
                            </div>
                            <Skeleton variant="text" className="w-16 h-6 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <Skeleton variant="text" className="w-32 h-6 mb-4" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                            <Skeleton variant="avatar" />
                            <div className="flex-1 space-y-1">
                                <Skeleton variant="text" className="w-3/4 h-4" />
                                <Skeleton variant="text" className="w-1/2 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Payment-specific skeleton
export const PaymentSkeleton = () => (
    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto">
        <div className="text-center mb-6">
            <Skeleton variant="text" className="w-48 h-8 mx-auto mb-2" />
            <Skeleton variant="text" className="w-64 h-4 mx-auto" />
        </div>

        <div className={`w-24 h-24 rounded-full mx-auto mb-6 ${BRAND_COLORS.primaryLight} flex items-center justify-center`}>
            <div className={`w-12 h-12 rounded-full ${BRAND_COLORS.primary}`}></div>
        </div>

        <div className="space-y-3 mb-6">
            <Skeleton variant="text" className="w-full h-4" />
            <Skeleton variant="text" className="w-3/4 mx-auto h-4" />
            <Skeleton variant="text" className="w-1/2 mx-auto h-4" />
        </div>

        <Skeleton variant="text" className="w-full h-12 rounded-xl" />
    </div>
);

// Cart skeleton
export const CartSkeleton = () => (
    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <Skeleton variant="text" className="w-32 h-8" />
            <Skeleton variant="text" className="w-10 h-10 rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 bg-gray-50 rounded-xl p-4">
                    <Skeleton variant="avatar" className="w-16 h-16" />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" className="w-3/4 h-5" />
                        <Skeleton variant="text" className="w-1/3 h-4" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Skeleton variant="text" className="w-8 h-8 rounded-full" />
                        <Skeleton variant="text" className="w-8 h-6" />
                        <Skeleton variant="text" className="w-8 h-8 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
        <div className="border-t border-gray-100 p-6 space-y-4">
            <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                        <Skeleton variant="text" className="w-20 h-4" />
                        <Skeleton variant="text" className="w-16 h-4" />
                    </div>
                ))}
            </div>
            <div className="flex space-x-3">
                <Skeleton variant="text" className="flex-1 h-12 rounded-full" />
                <Skeleton variant="text" className="flex-1 h-12 rounded-full" />
            </div>
        </div>
    </div>
);
