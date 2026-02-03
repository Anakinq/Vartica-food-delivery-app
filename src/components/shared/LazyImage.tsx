import React, { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';

/**
 * Enhanced lazy loading image component with optimization features
 */
interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string;
    alt: string;
    placeholder?: string;
    aspectRatio?: string; // e.g., '16/9', '1/1', '4/3'
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
    showLoadingSpinner?: boolean;
    blurDataURL?: string; // For blur-up effect
    quality?: 'low' | 'medium' | 'high'; // Image quality hint
    priority?: boolean; // Load immediately without lazy loading
    sizes?: string; // Responsive image sizes
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    placeholder,
    aspectRatio = '16/9',
    objectFit = 'cover',
    showLoadingSpinner = true,
    className = '',
    style,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);
    const loadingTimeoutRef = useRef<NodeJS.Timeout>();

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '50px', // Start loading 50px before element is visible
                threshold: 0.01,
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            observer.disconnect();
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const handleError = () => {
        setError(true);
        setIsLoaded(true);
    };

    return (
        <div
            ref={imgRef}
            className={`lazy-image-container ${className}`}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio,
                overflow: 'hidden',
                backgroundColor: '#f3f4f6',
                ...style,
            }}
        >
            {/* Placeholder or skeleton */}
            {!isLoaded && !error && (
                <div
                    className="lazy-image-placeholder"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#e5e7eb',
                    }}
                >
                    {showLoadingSpinner && (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    )}
                </div>
            )}

            {/* Error state */}
            {error && (
                <div
                    className="lazy-image-error"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                    }}
                >
                    <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
            )}

            {/* Actual image */}
            {isInView && !error && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit,
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out',
                    }}
                    {...props}
                />
            )}
        </div>
    );
};

/**
 * Skeleton loader component for cards and lists
 */
interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'text',
    width,
    height,
    className = '',
}) => {
    const baseStyles: React.CSSProperties = {
        backgroundColor: '#e5e7eb',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    };

    const variantStyles: Record<string, React.CSSProperties> = {
        text: {
            height: '1em',
            borderRadius: '0.25rem',
            width: width || '100%',
        },
        circular: {
            width: width || 40,
            height: height || 40,
            borderRadius: '50%',
        },
        rectangular: {
            width: width || '100%',
            height: height || 100,
            borderRadius: '0.5rem',
        },
    };

    return (
        <div
            className={`skeleton ${className}`}
            style={{
                ...baseStyles,
                ...variantStyles[variant],
            }}
        />
    );
};

/**
 * Card skeleton for loading states
 */
export const CardSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
        <Skeleton variant="rectangular" height={160} />
        <div className="p-4 space-y-3">
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="80%" height={16} />
            <div className="flex justify-between items-center pt-2">
                <Skeleton variant="text" width="30%" height={20} />
                <Skeleton variant="circular" width={32} height={32} />
            </div>
        </div>
    </div>
);

/**
 * List skeleton for loading states
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
        ))}
    </div>
);

// Add pulse animation to global styles if not present
export const skeletonStyles = `
@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}
`;
