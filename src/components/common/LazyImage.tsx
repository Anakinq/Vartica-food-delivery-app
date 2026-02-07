import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string; // Optional low-quality placeholder
    fallback?: string; // Optional fallback image
    width?: number | string;
    height?: number | string;
    onLoad?: () => void;
    onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className = '',
    placeholder,
    fallback,
    width,
    height,
    onLoad,
    onError
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(placeholder || src);
    const imgRef = useRef<HTMLImageElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        // Set up intersection observer to detect when image enters viewport
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Load the actual image
                        setCurrentSrc(src);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 } // Trigger when 10% of the image is visible
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current && imgRef.current) {
                observerRef.current.unobserve(imgRef.current);
            }
        };
    }, [src]);

    const handleLoad = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
    };

    const handleError = () => {
        setHasError(true);
        if (fallback) {
            setCurrentSrc(fallback);
        }
        if (onError) onError();
    };

    const imageStyle: React.CSSProperties = {
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        width,
        height,
    };

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <img
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                loading="lazy"
                onLoad={handleLoad}
                onError={handleError}
                style={imageStyle}
                className="w-full h-full object-cover"
            />
            {!isLoaded && !hasError && placeholder && (
                <img
                    src={placeholder}
                    alt=""
                    className="absolute top-0 left-0 w-full h-full object-cover blur-sm scale-105"
                    aria-hidden="true"
                />
            )}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
        </div>
    );
};

export default LazyImage;