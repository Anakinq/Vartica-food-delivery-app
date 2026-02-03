/**
 * Centralized logging utility with different log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    context?: Record<string, any>;
    error?: Error;
}

class Logger {
    private minLevel: LogLevel = 'info';
    private shouldLogToConsole: boolean = true;

    constructor() {
        // In production, only log warnings and errors
        if (process.env.NODE_ENV === 'production') {
            this.minLevel = 'warn';
            this.shouldLogToConsole = false;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.minLevel);
    }

    private formatMessage(entry: LogEntry): string {
        const timestamp = entry.timestamp.toISOString();
        const context = entry.context ? JSON.stringify(entry.context) : '';
        const errorMessage = entry.error ? `\nError: ${entry.error.message}\nStack: ${entry.error.stack}` : '';
        return `[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${context ? ` | Context: ${context}` : ''}${errorMessage}`;
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            context,
            error
        };

        // In development, log to console
        if (this.shouldLogToConsole && typeof console !== 'undefined') {
            const formattedMessage = this.formatMessage(entry);
            switch (level) {
                case 'debug':
                    console.debug(formattedMessage);
                    break;
                case 'info':
                    console.info(formattedMessage);
                    break;
                case 'warn':
                    console.warn(formattedMessage);
                    break;
                case 'error':
                    console.error(formattedMessage);
                    break;
            }
        }

        // In production, send to monitoring service (implement as needed)
        if (process.env.NODE_ENV === 'production') {
            // TODO: Send to monitoring service like Sentry, LogRocket, etc.
            // this.sendToMonitoringService(entry);
        }
    }

    debug(message: string, context?: Record<string, any>): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, any>): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, any>, error?: Error): void {
        this.log('warn', message, context, error);
    }

    error(message: string, context?: Record<string, any>, error?: Error): void {
        this.log('error', message, context, error);
    }

    // Specialized logging methods
    logAuthEvent(event: string, userId?: string, details?: Record<string, any>): void {
        this.info(`Auth Event: ${event}`, { userId, ...details });
    }

    logApiCall(method: string, url: string, status: number, duration: number): void {
        this.info('API Call', { method, url, status, duration: `${duration}ms` });
    }

    logError(error: Error, context?: Record<string, any>): void {
        this.error(error.message, context, error);
    }
}

// Create singleton instance
export const logger = new Logger();

// Export individual functions for convenience
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);

export default logger;
