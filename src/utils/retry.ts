/**
 * Retry utility for handling failed operations
 */

export interface RetryOptions {
    maxRetries?: number;
    delay?: number;
    exponentialBackoff?: boolean;
    shouldRetry?: (error: any) => boolean;
}

/**
 * Retry an async operation with configurable options
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        delay = 1000,
        exponentialBackoff = true,
        shouldRetry = () => true
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Check if we should retry this error
            if (!shouldRetry(error)) {
                throw error;
            }

            // If this was the last attempt, don't retry
            if (attempt === maxRetries) {
                break;
            }

            // Calculate delay
            const currentDelay = exponentialBackoff
                ? delay * Math.pow(2, attempt)
                : delay;

            // Add some jitter to prevent thundering herd
            const jitter = Math.random() * 0.5 + 0.75; // 0.75 to 1.25 multiplier

            console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(currentDelay * jitter)}ms...`, error);

            await new Promise(resolve => setTimeout(resolve, currentDelay * jitter));
        }
    }

    throw lastError;
}

/**
 * Default retry configuration for network operations
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    delay: 1000,
    exponentialBackoff: true,
    shouldRetry: (error: any) => {
        // Retry on network errors, timeouts, and 5xx server errors
        if (error?.message?.includes('Network Error') ||
            error?.message?.includes('timeout') ||
            error?.status >= 500) {
            return true;
        }
        return false;
    }
};

/**
 * Retry configuration for database operations
 */
export const DATABASE_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 2,
    delay: 500,
    exponentialBackoff: true,
    shouldRetry: (error: any) => {
        // Retry on database connection issues and 5xx errors
        if (error?.message?.includes('Connection') ||
            error?.status >= 500) {
            return true;
        }
        return false;
    }
};