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
            debug: jest.spyOn(console, 'debug').mockImplementation(() => { }),
            info: jest.spyOn(console, 'info').mockImplementation(() => { }),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => { }),
            error: jest.spyOn(console, 'error').mockImplementation(() => { })
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
            expect.stringContaining('Debug message')
        );
    });

    it('logs info messages', () => {
        logger.info('Info message');

        expect(consoleSpy.info).toHaveBeenCalledWith(
            expect.stringContaining('Info message')
        );
    });

    it('logs warning messages', () => {
        const error = new Error('Test error');
        logger.warn('Warning message', { warning: 'test' }, error);

        expect(consoleSpy.warn).toHaveBeenCalledWith(
            expect.stringContaining('Warning message')
        );
    });

    it('logs error messages', () => {
        const error = new Error('Test error');
        logger.error('Error message', { error: 'test' }, error);

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Error message')
        );
    });

    it('logs authentication events', () => {
        logger.logAuthEvent('user_login', 'user123', { method: 'email' });

        expect(consoleSpy.info).toHaveBeenCalledWith(
            expect.stringContaining('Auth Event: user_login')
        );
    });

    it('logs API calls', () => {
        logger.logApiCall('GET', '/api/users', 200, 150);

        expect(consoleSpy.info).toHaveBeenCalledWith(
            expect.stringContaining('API Call')
        );
    });

    it('logs errors properly', () => {
        const error = new Error('Test error');
        logger.logError(error, { component: 'TestComponent' });

        expect(consoleSpy.error).toHaveBeenCalledWith(
            expect.stringContaining('Test error')
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