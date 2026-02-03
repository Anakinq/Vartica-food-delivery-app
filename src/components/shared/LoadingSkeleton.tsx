import React from 'react';

interface SkeletonProps {
    className?: string;
    count?: number;
    variant?: 'card' | 'list' | 'table' | 'text' | 'avatar';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    count = 1,
    variant = 'card'
}) => {
    const baseClasses = 'animate-pulse bg-gray-200 rounded';

    const variantClasses = {
        card: 'h-48 rounded-xl',
        list: 'h-16 rounded-lg',
        table: 'h-12 rounded',
        text: 'h-4 rounded',
        avatar: 'h-10 w-10 rounded-full'
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
                <Skeleton variant="avatar" className="mb-4" />
                <Skeleton variant="text" className="w-3/4 mb-2" />
                <Skeleton variant="text" className="w-1/2" />
            </div>
        ))}
    </div>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 bg-white rounded-lg border">
                <Skeleton variant="avatar" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-3/4" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

export const TableSkeleton: React.FC<{ rows?: number, cols?: number }> = ({
    rows = 5,
    cols = 4
}) => (
    <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-4 gap-4 p-4">
            {Array.from({ length: cols }, (_, i) => (
                <Skeleton key={`header-${i}`} variant="text" className="h-6" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                    <Skeleton variant="text" className="w-1/2 h-6 mb-2" />
                    <Skeleton variant="text" className="w-3/4 h-8" />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Skeleton variant="card" className="h-96" />
            </div>
            <div>
                <Skeleton variant="card" className="h-96" />
            </div>
        </div>
    </div>
);