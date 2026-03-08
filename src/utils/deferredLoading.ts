/**
 * Utilities for deferred/lazy loading of non-critical scripts
 * Chat widgets, tracking scripts, reviews, etc.
 */

/**
 * Load a script when the browser is idle
 * Uses requestIdleCallback or falls back to setTimeout
 */
export function loadScriptWhenIdle(src: string, id?: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if script already exists
        if (id && document.getElementById(id)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.id = id || '';

        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

        // Use requestIdleCallback for non-blocking load
        if ('requestIdleCallback' in window) {
            requestIdleCallback(
                () => {
                    document.head.appendChild(script);
                },
                { timeout: 5000 } // Wait max 5 seconds
            );
        } else {
            // Fallback: load after minimum delay
            setTimeout(() => {
                document.head.appendChild(script);
            }, 3000);
        }
    });
}

/**
 * Load multiple scripts in parallel when idle
 */
export async function loadScriptsWhenIdle(scripts: { src: string; id?: string }[]): Promise<void> {
    await Promise.all(scripts.map(({ src, id }) => loadScriptWhenIdle(src, id)));
}

/**
 * Check if the device is on low data mode or has slow connection
 */
export function isLowEndDevice(): boolean {
    // Check for reduced motion preference (often correlates with low-end devices)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check connection API if available (using any to avoid type issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    const connection = nav.connection;
    const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';

    return prefersReducedMotion || isSlowConnection;
}

/**
 * Defer loading until user interaction (click, scroll, etc.)
 */
export function loadOnUserInteraction(
    eventType: 'click' | 'scroll' | 'hover' | 'touchstart' = 'click',
    callback: () => void
): () => void {
    const handler = () => {
        callback();
        // Remove listener after first trigger
        document.removeEventListener(eventType, handler, true);
    };

    document.addEventListener(eventType, handler, { once: true, passive: true });

    // Also set a timeout as fallback (10 seconds)
    const timeoutId = setTimeout(() => {
        document.removeEventListener(eventType, handler, true);
    }, 10000);

    return () => {
        document.removeEventListener(eventType, handler, true);
        clearTimeout(timeoutId);
    };
}

/**
 * Create a tracking script loader with consent check
 */
export function loadTrackingScript(
    src: string,
    options: {
        id?: string;
        withConsent?: boolean;
        consentKey?: string;
    } = {}
): Promise<void> {
    const { id, withConsent = false, consentKey = 'analytics_consent' } = options;

    // If consent is required, check localStorage
    if (withConsent) {
        const consent = localStorage.getItem(consentKey);
        if (consent !== 'true') {
            console.log('Tracking script deferred - consent not given');
            return Promise.resolve();
        }
    }

    return loadScriptWhenIdle(src, id);
}

// Example usage for chat widgets (Tawk.to, Intercom, etc.)
export const chatWidgetConfig = {
    // Tawk.to
    tawkTo: (propertyId: string, widgetId?: string) => {
        const src = `https://embed.tawk.to/${propertyId}/${widgetId || 'default'}`;
        return loadScriptWhenIdle(src, 'tawkto-widget');
    },

    // Intercom
    intercom: (appId: string) => {
        const src = `https://widget.intercom.io/widget/${appId}`;
        return loadScriptWhenIdle(src, 'intercom-widget');
    },

    // Drift
    drift: (appId: string) => {
        const src = `https://js.driftt.com/include/${appId}`;
        return loadScriptWhenIdle(src, 'drift-widget');
    },
};

// Example usage for analytics (load only on admin pages)
export const analyticsConfig = {
    // Google Analytics
    googleAnalytics: (trackingId: string) => {
        const src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
        return loadScriptWhenIdle(src, 'ga-script');
    },

    // Facebook Pixel
    facebookPixel: (pixelId: string) => {
        const src = `https://connect.facebook.net/en_US/fbevents.js`;
        return loadScriptWhenIdle(src, 'fb-pixel');
    },
};
