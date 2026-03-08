// Lazy load external scripts on demand to improve initial page load
// This helps reduce the initial bundle size and improves Lighthouse scores

interface ScriptLoaderOptions {
    src: string;
    id: string;
    async?: boolean;
    defer?: boolean;
    onload?: () => void;
    onerror?: () => void;
}

export function loadScript(options: ScriptLoaderOptions): void {
    const { src, id, async = true, defer = true, onload, onerror } = options;

    // Check if script already exists
    const existingScript = document.getElementById(id);
    if (existingScript) {
        if (onload) {
            // Script already loaded, call onload immediately
            onload();
        }
        return;
    }

    // Create and append new script
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = async;
    script.defer = defer;

    if (onload) {
        script.onload = onload;
    }

    if (onerror) {
        script.onerror = onerror;
    }

    document.head.appendChild(script);
}

// Preload Paystack only when needed (on checkout page)
export function preloadPaystack(onload?: () => void): void {
    loadScript({
        src: 'https://js.paystack.co/v1/inline.js',
        id: 'paystack-inline-js',
        onload,
    });
}

// Preload Pusher only when needed (for real-time features)
export function preloadPusher(onload?: () => void): void {
    loadScript({
        src: 'https://js.pusher.com/7.0/pusher.min.js',
        id: 'pusher-js',
        onload,
    });
}

// Load Google Maps only when needed
export function loadGoogleMaps(apiKey: string, onload?: () => void): void {
    loadScript({
        src: `https://maps.googleapis.com/maps/api/js?key=${apiKey}`,
        id: 'google-maps-js',
        async: false, // Maps should not be async
        defer: false,
        onload,
    });
}
