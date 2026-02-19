import { logger, Logger } from '../logger';

describe('Logger', () => {
    let consoleSpy: {
        debug: any;
        info: any;
        warn: any;
        error: any;
    };

    beforeEach(() => {
        consoleSpy = {
            debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
            info: vi.spyOn(console, 'info').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { })
        };
    });

    afterEach(() => {
        Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    it('creates logger instance', () => {
        expect(logger).toBeInstanceOf(Logger);
    });

    it('logs debug messages', () => {
        logger.debug('Debug message', { test: 'data' });

        expect(consoleSpy.debug).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'debug',
                message: 'Debug message',
                context: { test: 'data' }
            })
        );
    });

    it('logs info messages', () => {
        logger.info('Info message');

        expect(consoleSpy.info).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                message: 'Info message'
            })
        );
    });

    it('logs warning messages', () => {
        const error = new Error('Test error');
        logger.warn('Warning message', { warning: 'test' }, error);

        expect(consoleSpy.warn).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'warn',
                message: 'Warning message',
                context: { warning: 'test' },
                error
            })
        );
    });

    it('logs error messages', () => {
        const error = new Error('Test error');
        logger.error('Error message', { error: 'test' }, error);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'error',
                message: 'Error message',
                context: { error: 'test' },
                error
            })
        );
    });

    it('logs authentication events', () => {
        logger.logAuthEvent('user_login', 'user123', { method: 'email' });

        expect(consoleSpy.info).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                message: 'Auth Event: user_login',
                context: { userId: 'user123', method: 'email' }
            })
        );
    });

    it('logs API calls', () => {
        logger.logApiCall('GET', '/api/users', 200, 150);

        expect(consoleSpy.info).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                message: 'API Call',
                context: {
                    method: 'GET',
                    url: '/api/users',
                    status: 200,
                    duration: '150ms'
                }
            })
        );
    });

    it('logs errors properly', () => {
        const error = new Error('Test error');
        logger.logError(error, { component: 'TestComponent' });

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'error',
                message: 'Test error',
                context: { component: 'TestComponent' },
                error
            })
        );
    });

    it('uses correct log levels', () => {
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');

        expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
        expect(consoleSpy.info).toHaveBeenCalledTimes(1);
        expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
});