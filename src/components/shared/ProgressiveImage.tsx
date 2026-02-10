// src/components/shared/ProgressiveImage.tsx
// Progressive image loading component with lazy loading and placeholder support

import React, { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';

interface ProgressiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string;
    alt: string;
    placeholderColor?: string;
    aspectRatio?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    src,
    alt,
    placeholderColor = '#f3f4f6',
    aspectRatio = '4/3',
    objectFit = 'cover',
    className = '',
    style,
    ...props
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [inView, setInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '100px', // Start loading 100px before element is visible
                threshold: 0.01
            }
        );

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className={`progressive-image-container ${className}`}
            style={{
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: placeholderColor,
                aspectRatio,
                ...style
            }}
        >
            {/* Loading skeleton - shown when not loaded and in view */}
            {(!loaded || !inView) && (
                <div
                    className="progressive-image-skeleton"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(90deg, ${placeholderColor} 25%, #e5e7eb 50%, ${placeholderColor} 75%)`,
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite'
                    }}
                />
            )}

            {/* Actual image - only rendered when in view */}
            {inView && !error && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setLoaded(true)}
                    onError={() => {
                        setError(true);
                        console.warn(`Failed to load image: ${src}`);
                    }}
                    className={`progressive-image ${loaded ? 'loaded' : ''}`}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit,
                        opacity: loaded ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out'
                    }}
                    {...props}
                />
            )}

            {/* Error placeholder */}
            {error && (
                <div
                    className="progressive-image-error"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f9fafb',
                        color: '#9ca3af'
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
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
};

// Skeleton loader component for images
export const ImageSkeleton: React.FC<{ aspectRatio?: string; className?: string }> = ({
    aspectRatio = '4/3',
    className = ''
}) => (
    <div
        className={`animate-pulse bg-gray-200 ${className}`}
        style={{ aspectRatio }}
    />
);

export default ProgressiveImage;
