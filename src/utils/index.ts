/**
 * Utility functions for the Vartica Food Delivery System
 */

export { fetchCurrentUserProfile, isUserAuthenticated, getCurrentUserId } from './profileFetcher';
export { runSupabaseDiagnostics, printDiagnostics } from './diagnostics';
export { debugUserLogin, checkUserExists, printAuthDebug } from './authDebugger';
export { measurePerformance, debounce, throttle } from './performance';
export { validateSignupForm, validateLoginForm, formatValidationErrors, ValidationRules, type ValidationError } from './validation';
export { RATE_LIMITS, checkRateLimit, withRateLimit, RateLimitError, createRateLimiter, type RateLimitConfig } from './rateLimiter';
export { LazyImage, Skeleton, CardSkeleton, ListSkeleton, skeletonStyles, type LazyImageProps } from './LazyImage';
