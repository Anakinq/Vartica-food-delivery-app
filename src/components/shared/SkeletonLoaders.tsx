import React from 'react';

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Base skeleton component
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`bg-gray-200 rounded animate-pulse ${className}`}
        style={style}
    />
);

/**
 * Text skeleton for placeholder text
 */
interface TextSkeletonProps extends SkeletonProps {
    width?: string | number;
    height?: string | number;
    lines?: number;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
    width = '100%',
    height = '1em',
    lines = 1,
    className = '',
    style
}) => {
    if (lines === 1) {
        return (
            <Skeleton
                className={className}
                style={{
                    width,
                    height,
                    borderRadius: '0.25rem',
                    ...style
                }}
            />
        );
    }

    return (
        <div className={className} style={{ width }}>
            {Array.from({ length: lines }).map((_, index) => (
                <div key={index} className="space-y-2">
                    <Skeleton
                        style={{
                            width: index === lines - 1 ? '70%' : '100%',
                            height,
                            borderRadius: '0.25rem',
                            ...style
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

/**
 * Card skeleton for loading states
 */
export const CardSkeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`bg-white rounded-xl shadow-sm overflow-hidden animate-pulse ${className}`}
        style={style}
    >
        <Skeleton className="w-full h-48" />
        <div className="p-4 space-y-3">
            <TextSkeleton width="70%" height="1.25rem" />
            <TextSkeleton width="90%" height="1rem" lines={2} />
            <div className="flex justify-between items-center pt-2">
                <TextSkeleton width="40%" height="1.5rem" />
                <Skeleton className="w-8 h-8 rounded-full" />
            </div>
        </div>
    </div>
);

/**
 * Menu item skeleton
 */
export const MenuItemSkeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`bg-white rounded-lg shadow-sm overflow-hidden animate-pulse ${className}`}
        style={style}
    >
        <Skeleton className="w-full h-32" />
        <div className="p-3 space-y-2">
            <TextSkeleton width="80%" height="1.125rem" />
            <TextSkeleton width="60%" height="0.875rem" />
            <div className="flex justify-between items-center pt-1">
                <TextSkeleton width="30%" height="1.25rem" />
                <Skeleton className="w-6 h-6 rounded" />
            </div>
        </div>
    </div>
);

/**
 * Vendor card skeleton
 */
export const VendorCardSkeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`bg-white rounded-xl shadow-md overflow-hidden animate-pulse ${className}`}
        style={style}
    >
        <Skeleton className="w-full h-32" />
        <div className="p-4 space-y-3">
            <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-1">
                    <TextSkeleton width="70%" height="1.125rem" />
                    <TextSkeleton width="50%" height="0.875rem" />
                </div>
            </div>
            <TextSkeleton width="90%" height="0.875rem" lines={2} />
            <div className="flex justify-between items-center">
                <TextSkeleton width="40%" height="1rem" />
                <Skeleton className="w-20 h-6 rounded-full" />
            </div>
        </div>
    </div>
);

/**
 * Dashboard skeleton for admin panels
 */
export const DashboardSkeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`space-y-6 animate-pulse ${className}`}
        style={style}
    >
        {/* Header stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4">
                    <TextSkeleton width="60%" height="1rem" />
                    <TextSkeleton width="80%" height="1.5rem" className="mt-2" />
                    <TextSkeleton width="40%" height="0.75rem" className="mt-1" />
                </div>
            ))}
        </div>

        {/* Charts placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
            <TextSkeleton width="30%" height="1.25rem" className="mb-4" />
            <Skeleton className="w-full h-64 rounded" />
        </div>

        {/* Tables */}
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
                <TextSkeleton width="25%" height="1.25rem" />
            </div>
            <div className="p-6">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <TextSkeleton width="20%" height="1rem" />
                        <TextSkeleton width="15%" height="1rem" />
                        <TextSkeleton width="25%" height="1rem" />
                        <TextSkeleton width="15%" height="1rem" />
                        <Skeleton className="w-8 h-8 rounded" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/**
 * Profile skeleton
 */
export const ProfileSkeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`bg-white rounded-xl shadow-sm p-6 animate-pulse ${className}`}
        style={style}
    >
        <div className="flex flex-col items-center space-y-4 mb-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="text-center space-y-2">
                <TextSkeleton width="60%" height="1.25rem" />
                <TextSkeleton width="40%" height="0.875rem" />
            </div>
        </div>

        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                    <TextSkeleton width="30%" height="1rem" />
                    <TextSkeleton width="60%" height="1rem" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * List skeleton with specified count
 */
interface ListSkeletonProps extends SkeletonProps {
    count?: number;
    variant?: 'card' | 'menu' | 'vendor';
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
    count = 6,
    variant = 'card',
    className = '',
    style
}) => {
    const getSkeletonComponent = () => {
        switch (variant) {
            case 'menu':
                return MenuItemSkeleton;
            case 'vendor':
                return VendorCardSkeleton;
            case 'card':
            default:
                return CardSkeleton;
        }
    };

    const SkeletonComponent = getSkeletonComponent();

    return (
        <div
            className={`space-y-4 ${className}`}
            style={style}
        >
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonComponent key={index} />
            ))}
        </div>
    );
};

/**
 * Form skeleton
 */
export const FormSkeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
    <div
        className={`bg-white rounded-lg shadow-sm p-6 animate-pulse space-y-6 ${className}`}
        style={style}
    >
        {/* Form header */}
        <TextSkeleton width="40%" height="1.5rem" />

        {/* Form fields */}
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                    <TextSkeleton width="30%" height="0.875rem" />
                    <Skeleton className="w-full h-10 rounded" />
                </div>
            ))}
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
            <Skeleton className="w-24 h-10 rounded" />
        </div>
    </div>
);

/**
 * Table skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number } & SkeletonProps> = ({
    rows = 5,
    columns = 4,
    className = '',
    style
}) => (
    <div
        className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}
        style={style}
    >
        {/* Table header */}
        <div className="bg-gray-50 px-6 py-3 border-b">
            <div className="flex justify-between items-center">
                <TextSkeleton width="20%" height="1.25rem" />
                <Skeleton className="w-10 h-8 rounded" />
            </div>
        </div>

        {/* Table body */}
        <div className="divide-y">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="px-6 py-4 flex items-center justify-between">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <TextSkeleton
                            key={colIndex}
                            width="20%"
                            height="1rem"
                            className="mx-2"
                        />
                    ))}
                    <Skeleton className="w-8 h-8 rounded" />
                </div>
            ))}
        </div>

        {/* Table footer */}
        <div className="bg-gray-50 px-6 py-3 border-t flex justify-between items-center">
            <TextSkeleton width="15%" height="0.875rem" />
            <div className="flex space-x-2">
                <Skeleton className="w-20 h-8 rounded" />
                <Skeleton className="w-20 h-8 rounded" />
            </div>
        </div>
    </div>
);

// Export all skeletons as a single object for convenience
export const skeletons = {
    Skeleton,
    TextSkeleton,
    CardSkeleton,
    MenuItemSkeleton,
    VendorCardSkeleton,
    DashboardSkeleton,
    ProfileSkeleton,
    ListSkeleton,
    FormSkeleton,
    TableSkeleton
};