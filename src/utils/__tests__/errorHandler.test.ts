import {
    AppError,
    ValidationError,
    RateLimitError,
    AuthError
} from '../errorHandler';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
    }
}));

describe('Error Handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AppError', () => {
        it('creates error with correct properties', () => {
            const error = new AppError('Test error', 'TEST_CODE', 'high', { userId: '123' });

            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.severity).toBe('high');
            expect(error.context).toEqual({ userId: '123' });
            expect(error.isOperational).toBe(true);
        });

        it('defaults to medium severity', () => {
            const error = new AppError('Test error');
            expect(error.severity).toBe('medium');
        });

        it('defaults to UNKNOWN_ERROR code', () => {
            const error = new AppError('Test error');
            expect(error.code).toBe('UNKNOWN_ERROR');
        });
    });

    describe('ValidationError', () => {
        it('creates validation error with field', () => {
            const error = new ValidationError('email', 'Invalid email format');

            expect(error).toBeInstanceOf(AppError);
            expect(error.field).toBe('email');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.severity).toBe('low');
        });
    });

    describe('RateLimitError', () => {
        it('creates rate limit error with retry info', () => {
            const error = new RateLimitError('Rate limit exceeded', 60, Date.now() + 60000);

            expect(error).toBeInstanceOf(AppError);
            expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(error.severity).toBe('medium');
            expect(error.retryAfter).toBe(60);
        });
    });

    describe('AuthError', () => {
        it('creates authentication error', () => {
            const error = new AuthError('Invalid credentials');

            expect(error).toBeInstanceOf(AppError);
            expect(error.code).toBe('AUTH_ERROR');
            expect(error.severity).toBe('high');
        });
    });
});