// src/utils/dataCache.ts
// Enhanced data caching system for improved performance

class DataCache {
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    /**
     * Get cached data if it exists and is still valid
     * @param key Cache key
     * @returns Cached data or null if expired/missing
     */
    get(key: string) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * Set data in cache with TTL
     * @param key Cache key
     * @param data Data to cache
     * @param ttl Time to live in milliseconds (default: 5 minutes)
     */
    set(key: string, data: any, ttl: number = 300000) {
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
    }

    /**
     * Delete specific cache entry
     * @param key Cache key to delete
     */
    delete(key: string) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            expired: Array.from(this.cache.entries()).filter(
                ([_, item]) => Date.now() - item.timestamp > item.ttl
            ).length
        };
    }

    /**
     * Clean expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Create singleton instance
export const dataCache = new DataCache();

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        dataCache.cleanup();
    }, 5 * 60 * 1000);
}

export default dataCache;