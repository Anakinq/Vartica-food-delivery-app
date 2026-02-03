/**
 * Standardized error handling utilities
 */

export class AppError extends Error {
    code: string;
    severity: 'low' | 'medium' | 'high';
    context?: Record<string, any>;
    isOperational: boolean;

    constructor(
        message: string,
        code: string = 'UNKNOWN_ERROR',
        severity: 'low' | 'medium' | 'high' = 'medium',
        context?: Record<string, any>
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.severity = severity;
        this.context = context;
        this.isOperational = true;

        // Maintains proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

export class ValidationError extends AppError {
    field: string;

    constructor(field: string, message: string) {
        super(message, 'VALIDATION_ERROR', 'low');
        this.field = field;
    }
}

export class RateLimitError extends AppError {
    retryAfter: number;
    resetTime: number;

    constructor(message: string, retryAfter: number, resetTime: number) {
        super(message, 'RATE_LIMIT_EXCEEDED', 'medium');
        this.retryAfter = retryAfter;
        this.resetTime = resetTime;
    }
}

export class AuthError extends AppError {
    constructor(message: string, code: string = 'AUTH_ERROR') {
        super(message, code, 'high');
    }
}

export class NetworkError extends AppError {
    constructor(message: string, originalError?: Error) {
        super(message, 'NETWORK_ERROR', 'medium', originalError ? { originalError: originalError.message } : undefined);
    }
}

// Error handling utilities
export function handleError(error: unknown, context: string = 'Unknown'): void {
    if (error instanceof AppError) {
        // Log operational errors
        console.error(`[${error.severity}] ${context}: ${error.message}`, {
            code: error.code,
            context: error.context
        });
    } else if (error instanceof Error) {
        // Log unexpected errors
        console.error(`[HIGH] ${context}: ${error.message}`, {
            stack: error.stack
        });
    } else {
        // Log unknown errors
        console.error(`[HIGH] ${context}: Unknown error`, { error });
    }
}

export function createErrorReporter(componentName: string) {
    return {
        report: (error: unknown, additionalContext?: Record<string, any>) => {
            const context = {
                component: componentName,
                ...additionalContext
            };
            handleError(error, `${componentName} Error`);
        }
    };
}

// Error boundary error info
export interface ErrorInfo {
    componentStack: string;
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof AppError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}

export function isOperationalError(error: unknown): boolean {
    return error instanceof AppError && error.isOperational;
}
