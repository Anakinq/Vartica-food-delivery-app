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
            return null;
        }
    }

    setItem(key: string, value: string): void {
        try {
            if (this.storage) {
                // Check if storage is full before setting
                this.storage.setItem(key, value);
            }
        } catch (error) {
            // Check for specific error types
            if (error instanceof DOMException) {
                if (error.name === 'QuotaExceededError') {
                    console.warn('Storage quota exceeded, clearing some items');
                    // Clear oldest items or clear all if needed
                    this.clearOldItems();
                    try {
                        this.storage?.setItem(key, value);
                    } catch (retryError) {
                        console.warn('Failed to set item even after clearing storage:', retryError);
                    }
                } else {
                    console.warn(`Storage error (type: ${error.name}):`, error);
                }
            } else {
                console.warn('Failed to set item in storage:', error);
            }
        }
    }

    removeItem(key: string): void {
        try {
            if (this.storage) {
                this.storage.removeItem(key);
            }
        } catch (error) {
            console.warn(`Failed to remove item from storage:`, error);
        }
    }

    key(index: number): string | null {
        try {
            return this.storage ? this.storage.key(index) : null;
        } catch (error) {
            console.warn(`Failed to get key at index ${index} from storage:`, error);
            return null;
        }
    }

    get length(): number {
        try {
            return this.storage ? this.storage.length : 0;
        } catch (error) {
            console.warn('Failed to get storage length:', error);
            return 0;
        }
    }

    clear(): void {
        try {
            if (this.storage) {
                this.storage.clear();
            }
        } catch (error) {
            console.warn('Failed to clear storage:', error);
        }
    }

    private clearOldItems(): void {
        try {
            if (this.storage) {
                // Clear all items as a fallback when quota is exceeded
                this.storage.clear();
            }
        } catch (error) {
            console.warn('Failed to clear storage:', error);
        }
    }
}

const safeStorage = new SafeStorage();

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.'
    );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: safeStorage,
        storageKey: 'vartica-auth-token'
    }
});