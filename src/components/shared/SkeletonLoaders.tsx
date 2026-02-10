// src/components/shared/SkeletonLoaders.tsx
// Skeleton loaders for better loading states

import React, { memo } from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'shimmer' | 'none';
}

export const Skeleton = memo<SkeletonProps>(({
    className = '',
    variant = 'text',
    width,
    height,
    animation = 'pulse'
}) => {
    const baseStyles = 'bg-gray-200 dark:bg-gray-700';

    const variantStyles = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg'
    };

    const animationStyles = {
        pulse: 'animate-pulse',
        shimmer: 'shimmer',
        none: ''
    };

    return (
        <div
            className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height
            }}
            aria-hidden="true"
        />
    );
});

Skeleton.displayName = 'Skeleton';

// Menu Item Card Skeleton
export const MenuItemCardSkeleton = memo(() => (
    <div className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 flex items-center">
        <Skeleton
            variant="rectangular"
            width={96}
            height={96}
            className="rounded-lg mr-3 sm:mr-4 flex-shrink-0"
        />
        <div className="flex-1">
            <Skeleton width="60%" height={20} className="mb-2" />
            <Skeleton width="40%" height={14} className="mb-3" />
            <div className="flex items-center space-x-2">
                <Skeleton width={32} height={32} variant="circular" />
                <Skeleton width={24} height={24} variant="circular" />
                <Skeleton width={24} height={24} variant="circular" />
            </div>
        </div>
    </div>
));

MenuItemCardSkeleton.displayName = 'MenuItemCardSkeleton';

// Vendor Card Skeleton
export const VendorCardSkeleton = memo(() => (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <Skeleton
            variant="rectangular"
            width="100%"
            height={180}
            className="rounded-lg mb-4"
        />
        <Skeleton width="70%" height={20} className="mb-2" />
        <Skeleton width="50%" height={14} />
    </div>
));

VendorCardSkeleton.displayName = 'VendorCardSkeleton';

// Stats Card Skeleton
export const StatsCardSkeleton = memo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <Skeleton width={40} height={40} variant="circular" className="mb-3" />
        <Skeleton width={60} height={24} className="mb-1" />
        <Skeleton width={80} height={14} />
    </div>
));

StatsCardSkeleton.displayName = 'StatsCardSkeleton';

// Order Card Skeleton
export const OrderCardSkeleton = memo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3">
        <div className="flex justify-between items-start mb-3">
            <Skeleton width={100} height={20} />
            <Skeleton width={60} height={20} variant="rectangular" />
        </div>
        <Skeleton width="80%" height={14} className="mb-2" />
        <Skeleton width="60%" height={14} className="mb-3" />
        <div className="flex justify-between items-center">
            <Skeleton width={80} height={16} />
            <Skeleton width={70} height={24} variant="rectangular" />
        </div>
    </div>
));

OrderCardSkeleton.displayName = 'OrderCardSkeleton';

// Profile Header Skeleton
export const ProfileHeaderSkeleton = memo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center space-x-4">
            <Skeleton width={80} height={80} variant="circular" />
            <div className="flex-1">
                <Skeleton width={150} height={24} className="mb-2" />
                <Skeleton width={200} height={16} />
            </div>
        </div>
    </div>
));

ProfileHeaderSkeleton.displayName = 'ProfileHeaderSkeleton';

// Chat Message Skeleton
export const ChatMessageSkeleton = memo(() => (
    <div className="flex space-x-3 mb-4">
        <Skeleton width={36} height={36} variant="circular" />
        <div className="flex-1">
            <Skeleton width={80} height={12} className="mb-1" />
            <Skeleton width="70%" height={40} className="rounded-lg" />
        </div>
    </div>
));

ChatMessageSkeleton.displayName = 'ChatMessageSkeleton';

// Table Row Skeleton
export const TableRowSkeleton = memo(() => (
    <tr className="border-b border-gray-100 dark:border-gray-700">
        <td className="p-4"><Skeleton width={40} height={40} variant="circular" /></td>
        <td className="p-4"><Skeleton width={100} height={16} /></td>
        <td className="p-4"><Skeleton width={60} height={16} /></td>
        <td className="p-4"><Skeleton width={80} height={16} /></td>
        <td className="p-4"><Skeleton width={50} height={24} variant="rectangular" /></td>
    </tr>
));

TableRowSkeleton.displayName = 'TableRowSkeleton';

// Grid of skeletons
interface SkeletonGridProps {
    count: number;
    children: React.ReactNode;
}

export const SkeletonGrid = memo<SkeletonGridProps>(({ count, children }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <React.Fragment key={i}>{children}</React.Fragment>
        ))}
    </div>
));

SkeletonGrid.displayName = 'SkeletonGrid';

export default Skeleton;
