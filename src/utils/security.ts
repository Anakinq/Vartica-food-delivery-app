import { captureException } from './sentry';
import { logger } from './logger';

// Security headers configuration
export const securityHeaders = {
    // Content Security Policy
    'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://api.paystack.co;
    frame-src 'self' https://js.paystack.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s+/g, ' ').trim(),

    // Prevent XSS attacks
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',

    // Strict Transport Security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': `
    geolocation=(),
    microphone=(),
    camera=(),
    payment=()
  `.replace(/\s+/g, ' ').trim(),
};

// Validate and sanitize user inputs
export const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous characters
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .trim();
};

// Validate email format
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number format
export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
};

// Rate limiting for API calls
class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private maxRequests: number = 100;
    private windowMs: number = 15 * 60 * 1000; // 15 minutes

    checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number } {
        const now = Date.now();
        const requests = this.requests.get(identifier) || [];

        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < this.windowMs);

        if (validRequests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...validRequests);
            const resetTime = oldestRequest + this.windowMs;
            return { allowed: false, resetTime };
        }

        // Add current request
        validRequests.push(now);
        this.requests.set(identifier, validRequests);

        return { allowed: true };
    }
}

export const rateLimiter = new RateLimiter();

// Security middleware for API routes
export const securityMiddleware = (req: Request, res: Response, next: Function) => {
    try {
        // Apply security headers
        Object.entries(securityHeaders).forEach(([header, value]) => {
            res.setHeader(header, value);
        });

        // Rate limiting check
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const { allowed, resetTime } = rateLimiter.checkRateLimit(ip as string);

        if (!allowed) {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded',
                resetTime
            });
            return;
        }

        next();
    } catch (error) {
        captureException(error as Error, { context: 'securityMiddleware' });
        logger.error('Security middleware error:', error);
        next(error);
    }
};

// Input validation for forms
export const validateFormInput = (data: Record<string, any>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
            // Check for dangerous content
            if (value.includes('<script') || value.includes('javascript:')) {
                errors.push(`${key} contains invalid content`);
            }

            // Check length limits
            if (value.length > 1000) {
                errors.push(`${key} is too long`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};

export default {
    securityHeaders,
    sanitizeInput,
    validateEmail,
    validatePhone,
    rateLimiter,
    securityMiddleware,
    validateFormInput
};