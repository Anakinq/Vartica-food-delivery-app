import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { logger } from './logger';

// Initialize Sentry only in production
if (process.env.NODE_ENV === 'production') {
    Sentry.init({
        dsn: process.env.VITE_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
        integrations: [
            new BrowserTracing({
                // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
                tracePropagationTargets: ['localhost', /^https:\/\/your-server-name\.vercel\.app/],
            }),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0, // Capture 100% of the transactions
        // Session Replay
        replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
        replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    });

    logger.info('Sentry initialized for error tracking');
}

// Error boundary component for React
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Function to capture exceptions
export const captureException = (error: Error, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
            contexts: {
                app: {
                    version: '1.0.0',
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
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(message, level);
    }
    logger.info(`Message captured: ${message}`);
};

// Function to add user context
export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
    if (process.env.NODE_ENV === 'production') {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username
        });
    }
};

export default Sentry;