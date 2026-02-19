import { captureException } from './sentry';
import { logger } from './logger';

// Image optimization utilities
class ImageOptimizer {
    private imageCache: Map<string, string> = new Map();
    private supportedFormats: string[] = ['webp', 'avif'];
    private maxWidth: number = 1920;
    private quality: number = 80;

    // Check if browser supports modern image formats
    supportsFormat(format: string): boolean {
        if (typeof window === 'undefined') return false;

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        try {
            return ctx
                .toDataURL(`image/${format}`)
                .startsWith(`data:image/${format}`);
        } catch (error) {
            return false;
        }
    }

    // Get best supported format
    getBestFormat(): string {
        for (const format of this.supportedFormats) {
            if (this.supportsFormat(format)) {
                return format;
            }
        }
        return 'jpeg'; // fallback
    }

    // Optimize image URL with CDN parameters
    optimizeImageUrl(
        url: string,
        options: {
            width?: number;
            height?: number;
            quality?: number;
            format?: string;
        } = {}
    ): string {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            // Add optimization parameters
            if (options.width) {
                params.set('w', Math.min(options.width, this.maxWidth).toString());
            }
            if (options.height) {
                params.set('h', options.height.toString());
            }
            if (options.quality) {
                params.set('q', options.quality.toString());
            }

            // Use best format if not specified
            const format = options.format || this.getBestFormat();
            params.set('f', format);

            urlObj.search = params.toString();
            return urlObj.toString();
        } catch (error) {
            captureException(error as Error, { context: 'imageOptimization', url });
            return url; // Return original URL on error
        }
    }

    // Generate responsive image srcset
    generateSrcSet(
        baseUrl: string,
        sizes: number[] = [320, 640, 1024, 1280, 1920]
    ): string {
        return sizes
            .map(size => {
                const optimizedUrl = this.optimizeImageUrl(baseUrl, { width: size });
                return `${optimizedUrl} ${size}w`;
            })
            .join(', ');
    }

    // Preload critical images
    preloadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    // Lazy load images with intersection observer
    lazyLoadImages(): void {
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    const src = img.dataset.src;

                    if (src) {
                        img.src = src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                }
            });
        });

        // Observe all images with data-src attribute
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Generate blur-up placeholder
    async generatePlaceholder(
        imageUrl: string,
        width: number = 10
    ): Promise<string> {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) throw new Error('Canvas context not available');

            const img = new Image();
            img.src = URL.createObjectURL(blob);

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    canvas.width = width;
                    canvas.height = (img.height / img.width) * width;
                    ctx.drawImage(img, 0, 0, width, canvas.height);

                    const placeholder = canvas.toDataURL('image/jpeg', 0.1);
                    URL.revokeObjectURL(img.src);
                    resolve(placeholder);
                };

                img.onerror = reject;
            });
        } catch (error) {
            captureException(error as Error, { context: 'placeholderGeneration', imageUrl });
            return ''; // Return empty string on error
        }
    }
}

// Responsive image component helper
export const generateResponsiveImageProps = (
    src: string,
    alt: string,
    className: string = ''
) => {
    const optimizer = new ImageOptimizer();

    return {
        src: optimizer.optimizeImageUrl(src, { width: 1280 }),
        srcSet: optimizer.generateSrcSet(src),
        sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
        alt,
        className: `lazy ${className}`,
        'data-src': src,
        loading: 'lazy' as const,
        decoding: 'async' as const
    };
};

// Image compression utilities
export const compressImage = async (
    file: File,
    options: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
    } = {}
): Promise<Blob> => {
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        const img = new Image();
        img.onload = () => {
            // Calculate new dimensions
            let { width, height } = img;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};

// Export optimized image optimizer
export const imageOptimizer = new ImageOptimizer();

export default {
    ImageOptimizer,
    imageOptimizer,
    generateResponsiveImageProps,
    compressImage
};