import * as Sentry from '@sentry/react';
import { logger } from './logger';

// Initialize Sentry for both development and production (but with different settings)
const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env.VITE_SENTRY_DSN;

// Only initialize if we have a DSN
if (sentryDsn && sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
    Sentry.init({
        dsn: sentryDsn,
        integrations: [
            // Use the updated BrowserTracing integration
            Sentry.browserTracingIntegration(),
            // Add replay integration
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],
        // Performance Monitoring
        tracesSampleRate: isProduction ? 1.0 : 0.1, // 100% in prod, 10% in dev
        // Session Replay
        replaysSessionSampleRate: isProduction ? 0.1 : 0, // 10% in prod, disabled in dev
        replaysOnErrorSampleRate: 1.0, // 100% when errors occur
        // Environment
        environment: process.env.NODE_ENV || 'development',
        // Release version
        release: 'vartica@' + (process.env.VITE_APP_VERSION || '1.0.0'),
        // Debug mode in development
        debug: !isProduction,
    });

    logger.info(`Sentry initialized for ${isProduction ? 'production' : 'development'} error tracking`);
} else {
    logger.warn('Sentry DSN not configured - error tracking disabled');
}

// Error boundary component for React
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Function to capture exceptions
export const captureException = (error: Error, context?: Record<string, any>) => {
    if (sentryDsn && sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
        Sentry.captureException(error, {
            contexts: {
                app: {
                    version: process.env.VITE_APP_VERSION || '1.0.0',
                    environment: process.env.NODE_ENV,
                    ...context
                }
            }
        });
    }
    logger.error('Error captured:', { error: error.message, context });
};

// Function to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
    if (sentryDsn && sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
        Sentry.captureMessage(message, level);
    }
    logger.info(`Message captured: ${message}`);
};

// Function to add user context
export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
    if (sentryDsn && sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username
        });
    }
};

// Function to clear user context
export const clearUserContext = () => {
    if (sentryDsn && sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
        Sentry.setUser(null);
    }
};

export default Sentry;