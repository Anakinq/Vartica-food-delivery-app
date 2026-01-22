// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a storage wrapper that handles tracking prevention
// Implements the Supabase AuthStorage interface
class SafeStorage {
    private storage: Storage | null;

    constructor() {
        if (typeof window === 'undefined') {
            // We're in a server environment, no storage available
            this.storage = null;
            return;
        }

        try {
            // Test if storage is accessible
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            this.storage = window.localStorage;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Storage access blocked by tracking prevention:', error);
            }
            this.storage = null;
        }
    }

    getItem(key: string): string | null {
        try {
            return this.storage ? this.storage.getItem(key) : null;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Failed to get item from storage:`, error);
            }
            // Try alternative storage mechanisms if available
            try {
                // Attempt to use sessionStorage as fallback
                if (typeof sessionStorage !== 'undefined') {
                    return sessionStorage.getItem(key);
                }
            } catch (sessionError) {
                // If both fail, return null
            }
            return null;
        }
    }

    setItem(key: string, value: string): void {
        try {
            if (this.storage) {
                // Check if storage is full before setting
                this.storage.setItem(key, value);
            } else {
                // Try alternative storage mechanisms if available
                try {
                    // Attempt to use sessionStorage as fallback
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.setItem(key, value);
                    }
                } catch (sessionError) {
                    // If both fail, log the issue but don't crash the app
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`Failed to set item in any storage:`, sessionError);
                    }
                }
            }
        } catch (error) {
            // Check for specific error types
            if (error instanceof DOMException) {
                if (error.name === 'QuotaExceededError') {
                    console.warn('Storage quota exceeded, clearing some items');
                    // Clear oldest items or clear all if needed
                    this.clearOldItems();
                    try {
                        if (this.storage) {
                            this.storage.setItem(key, value);
                        } else if (typeof sessionStorage !== 'undefined') {
                            sessionStorage.setItem(key, value);
                        }
                    } catch (retryError) {
                        console.warn('Failed to set item even after clearing storage:', retryError);
                    }
                } else if (error.name === 'SecurityError') {
                    // This happens when storage is blocked by tracking prevention
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('Storage access blocked by security/tracking prevention:', error);
                    }
                    // Attempt to use sessionStorage as fallback
                    try {
                        if (typeof sessionStorage !== 'undefined') {
                            sessionStorage.setItem(key, value);
                        }
                    } catch (sessionError) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn(`Failed to set item in sessionStorage:`, sessionError);
                        }
                    }
                } else {
                    console.warn(`Storage error (type: ${error.name}):`, error);
                }
            } else {
                console.warn('Failed to set item in storage:', error);
                // Attempt to use sessionStorage as fallback
                try {
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.setItem(key, value);
                    }
                } catch (sessionError) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`Failed to set item in sessionStorage:`, sessionError);
                    }
                }
            }
        }
    }

    removeItem(key: string): void {
        try {
            if (this.storage) {
                this.storage.removeItem(key);
            } else {
                // Try alternative storage mechanisms if available
                try {
                    // Attempt to use sessionStorage as fallback
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.removeItem(key);
                    }
                } catch (sessionError) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`Failed to remove item from sessionStorage:`, sessionError);
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to remove item from storage:`, error);
            // Try alternative storage mechanisms if available
            try {
                // Attempt to use sessionStorage as fallback
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem(key);
                }
            } catch (sessionError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`Failed to remove item from sessionStorage:`, sessionError);
                }
            }
        }
    }

    key(index: number): string | null {
        try {
            return this.storage ? this.storage.key(index) : null;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Failed to get key at index ${index} from storage:`, error);
            }
            // Try alternative storage mechanisms if available
            try {
                if (typeof sessionStorage !== 'undefined') {
                    return sessionStorage.key(index);
                }
            } catch (sessionError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`Failed to get key from sessionStorage:`, sessionError);
                }
            }
            return null;
        }
    }

    get length(): number {
        try {
            return this.storage ? this.storage.length : 0;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to get storage length:', error);
            }
            // Try alternative storage mechanisms if available
            try {
                if (typeof sessionStorage !== 'undefined') {
                    return sessionStorage.length;
                }
            } catch (sessionError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Failed to get sessionStorage length:', sessionError);
                }
            }
            return 0;
        }
    }

    clear(): void {
        try {
            if (this.storage) {
                this.storage.clear();
            } else {
                // Try alternative storage mechanisms if available
                try {
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.clear();
                    }
                } catch (sessionError) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('Failed to clear sessionStorage:', sessionError);
                    }
                }
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to clear storage:', error);
            }
            // Try alternative storage mechanisms if available
            try {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.clear();
                }
            } catch (sessionError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Failed to clear sessionStorage:', sessionError);
                }
            }
        }
    }

    private clearOldItems(): void {
        try {
            if (this.storage) {
                // Clear all items as a fallback when quota is exceeded
                this.storage.clear();
            } else {
                // Try alternative storage mechanisms if available
                try {
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.clear();
                    }
                } catch (sessionError) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('Failed to clear sessionStorage:', sessionError);
                    }
                }
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to clear storage:', error);
            }
            // Try alternative storage mechanisms if available
            try {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.clear();
                }
            } catch (sessionError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Failed to clear sessionStorage:', sessionError);
                }
            }
        }
    }
}

const safeStorage = new SafeStorage();

// Validate required environment variables in development
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.');

    // In production builds, we'll set default empty values to allow build to proceed
    // The actual error handling will happen at runtime
    if (typeof window !== 'undefined') {
        // Only throw error in browser environment, not during build
        if (process.env.NODE_ENV === 'development') {
            throw new Error(
                'Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.'
            );
        }
    }
} else if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: safeStorage,
        storageKey: 'vartica-auth-token'
    },
    global: {
        headers: {
            'X-Client-Info': 'vartica-food-app/1.0.0'
        }
    }
});