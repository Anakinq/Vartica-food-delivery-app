/**
 * Rate limiting utility for preventing brute force attacks
 */

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests per window
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
    // 5 attempts per 15 minutes for login
    LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
    // 3 attempts per hour for password reset
    PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
    // 10 attempts per minute for general API calls
    GENERAL: { windowMs: 60 * 1000, maxRequests: 60 },
    // 5 attempts per hour for signup
    SIGNUP: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
};

/**
 * Get client identifier for rate limiting
 */
function getClientId(): string {
    // Use IP address or browser fingerprint
    if (typeof window !== 'undefined') {
        // Generate a simple fingerprint
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset(),
        ].join('|');

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `ip_${Math.abs(hash)}`;
    }
    return 'server';
}

/**
 * Check if request should be rate limited
 * @param key - Unique identifier for the rate limit
 * @param config - Rate limit configuration
 * @returns Object with { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // If no record exists or window has expired, allow request
    if (!record || now > record.resetTime) {
        const newRecord = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, newRecord);

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: newRecord.resetTime,
        };
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            resetTime: record.resetTime,
            retryAfter,
        };
    }

    // Increment count
    record.count++;
    rateLimitStore.set(key, record);

    return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetTime: record.resetTime,
    };
}

/**
 * Wrapper for async functions with rate limiting
 * @param key - Unique identifier for the rate limit
 * @param config - Rate limit configuration
 * @param fn - Async function to execute
 * @returns Result of the async function or throws RateLimitError
 */
export async function withRateLimit<T>(
    key: string,
    config: RateLimitConfig,
    fn: () => Promise<T>
): Promise<T> {
    const result = checkRateLimit(key, config);

    if (!result.allowed) {
        throw new RateLimitError(
            'Too many requests. Please try again later.',
            result.retryAfter || Math.ceil(config.windowMs / 1000),
            result.resetTime
        );
    }

    return fn();
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
    retryAfter: number;
    resetTime: number;

    constructor(message: string, retryAfter: number, resetTime: number) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
        this.resetTime = resetTime;
    }
}

/**
 * Clean up expired rate limit records
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Clean up every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimitStore, 10 * 60 * 1000);
}

/**
 * Create a rate limiter for a specific action
 * @param actionName - Name of the action being rate limited
 * @param config - Rate limit configuration
 * @returns Object with check and withRateLimit methods
 */
export function createRateLimiter(actionName: string, config: RateLimitConfig) {
    const keyPrefix = `${actionName}:`;

    return {
        check: (identifier?: string) =>
            checkRateLimit(keyPrefix + (identifier || getClientId()), config),

        withRateLimit: <T>(identifier: string | undefined, fn: () => Promise<T>) =>
            withRateLimit(keyPrefix + (identifier || getClientId()), config, fn),
    };
}
