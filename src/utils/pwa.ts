/**
 * PWA Update Utility
 * Handles service worker updates and cache busting
 */

export interface SWUpdateInfo {
    version: string;
    needsUpdate: boolean;
}

let updateListener: ((info: SWUpdateInfo) => void) | null = null;

/**
 * Register service worker and set up update detection
 */
export function registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.ready.then((registration) => {
        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        if (updateListener) {
                            updateListener({
                                version: registration.active?.scriptURL || 'unknown',
                                needsUpdate: true,
                            });
                        }
                    }
                });
            }
        });
    });

    // Listen for controller change (when a new SW takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Page is being controlled by a new service worker
        window.location.reload();
    });
}

/**
 * Set a callback to be notified when an update is available
 */
export function onSWUpdate(callback: (info: SWUpdateInfo) => void): void {
    updateListener = callback;
}

/**
 * Force update by skipping waiting
 */
export async function skipWaiting(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
}

/**
 * Check if there's an update available
 */
export async function checkForUpdates(): Promise<SWUpdateInfo | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
        return null;
    }

    return {
        version: registration.active?.scriptURL || 'unknown',
        needsUpdate: !!registration.waiting,
    };
}

/**
 * Get current service worker version
 */
export async function getSWVersion(): Promise<string | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.scriptURL || null;
}

/**
 * Clear all caches on update
 */
export async function clearAllCaches(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return;
    }

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
}

/**
 * Request notification permission and subscribe to push
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        return 'denied';
    }

    return Notification.requestPermission();
}

/**
 * Unregister service worker (for debugging or logout)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.unregister() || false;
}
