import { useState, useEffect, useRef, RefObject } from 'react';

interface IntersectionObserverOptions {
    threshold?: number | number[];
    root?: Element | null;
    rootMargin?: string;
    triggerOnce?: boolean;
}

/**
 * Hook for detecting when an element enters the viewport
 * Useful for lazy loading content like reviews, images, etc.
 */
export function useIntersectionObserver(
    options: IntersectionObserverOptions = {}
): {
    isIntersecting: boolean;
    ref: RefObject<HTMLDivElement>;
} {
    const {
        threshold = 0.1,
        root = null,
        rootMargin = '100px',
        triggerOnce = true,
    } = options;

    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const hasTriggered = useRef(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // If triggerOnce is true and we've already triggered, don't set up observer
        if (triggerOnce && hasTriggered.current) {
            setIsIntersecting(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsIntersecting(true);
                        hasTriggered.current = true;

                        if (triggerOnce) {
                            observer.disconnect();
                        }
                    } else if (!triggerOnce) {
                        setIsIntersecting(false);
                    }
                });
            },
            {
                threshold,
                root,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, root, rootMargin, triggerOnce]);

    return { isIntersecting, ref };
}

/**
 * Hook for loading scripts lazily when browser is idle
 * Useful for chat widgets, analytics, etc.
 */
export function useIdleCallback(callback: () => void, deps: unknown[] = []): void {
    useEffect(() => {
        // Check if requestIdleCallback is available
        if ('requestIdleCallback' in window) {
            const idleId = requestIdleCallback(() => {
                callback();
            });

            return () => {
                cancelIdleCallback(idleId);
            };
        } else {
            // Fallback: wait 5 seconds before executing
            const timeoutId = setTimeout(() => {
                callback();
            }, 5000);

            return () => {
                clearTimeout(timeoutId);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/**
 * Hook for lazy loading external scripts
 */
export function useScriptLoader(src: string): {
    isLoading: boolean;
    error: boolean;
    loaded: boolean;
} {
    const [state, setState] = useState({
        isLoading: true,
        error: false,
        loaded: false,
    });

    useEffect(() => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = () => {
            setState({ isLoading: false, error: false, loaded: true });
        };

        script.onerror = () => {
            setState({ isLoading: false, error: true, loaded: false });
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [src]);

    return state;
}
