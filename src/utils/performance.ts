import { captureException } from './sentry';
import { logger } from './logger';

// Performance monitoring utilities
class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    private startTime: number = 0;

    constructor() {
        this.startTime = performance.now();
    }

    // Measure function execution time
    measure<T>(name: string, fn: () => T): T {
        const start = performance.now();
        try {
            const result = fn();
            const end = performance.now();
            this.recordMetric(name, end - start);
            return result;
        } catch (error) {
            const end = performance.now();
            this.recordMetric(`${name}_error`, end - start);
            throw error;
        }
    }

    // Async version for promises
    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const end = performance.now();
            this.recordMetric(name, end - start);
            return result;
        } catch (error) {
            const end = performance.now();
            this.recordMetric(`${name}_error`, end - start);
            throw error;
        }
    }

    // Record a metric
    private recordMetric(name: string, value: number): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(value);

        // Keep only last 100 measurements
        const measurements = this.metrics.get(name)!;
        if (measurements.length > 100) {
            measurements.shift();
        }

        // Log slow operations
        if (value > 1000) {
            logger.warn(`Slow operation detected: ${name} took ${value}ms`);
        }
    }

    // Get average for a metric
    getAverage(name: string): number {
        const measurements = this.metrics.get(name);
        if (!measurements || measurements.length === 0) return 0;
        return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    }

    // Get all metrics
    getAllMetrics(): Record<string, { average: number; count: number; min: number; max: number }> {
        const result: Record<string, any> = {};

        this.metrics.forEach((measurements, name) => {
            if (measurements.length > 0) {
                result[name] = {
                    average: this.getAverage(name),
                    count: measurements.length,
                    min: Math.min(...measurements),
                    max: Math.max(...measurements)
                };
            }
        });

        return result;
    }

    // Reset all metrics
    reset(): void {
        this.metrics.clear();
    }
}

// Core Web Vitals monitoring
class CoreWebVitals {
    private clsValue: number = 0;
    private fidValue: number = 0;
    private lcpValue: number = 0;

    init(): void {
        if (typeof window !== 'undefined' && 'performance' in window) {
            this.observeCLS();
            this.observeFID();
            this.observeLCP();
        }
    }

    private observeCLS(): void {
        try {
            // @ts-ignore - CLS API might not be available
            if ('PerformanceObserver' in window && 'LayoutShift' in window) {
                // @ts-ignore
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // @ts-ignore
                        if (!entry.hadRecentInput) {
                            // @ts-ignore
                            this.clsValue += entry.value;
                        }
                    }
                });

                // @ts-ignore
                observer.observe({ entryTypes: ['layout-shift'] });
            }
        } catch (error) {
            captureException(error as Error, { context: 'CLS monitoring' });
        }
    }

    private observeFID(): void {
        try {
            // @ts-ignore - FID API might not be available
            if ('PerformanceObserver' in window && 'firstInput' in window) {
                // @ts-ignore
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // @ts-ignore
                        const fid = entry.processingStart - entry.startTime;
                        this.fidValue = Math.max(this.fidValue, fid);
                    }
                });

                // @ts-ignore
                observer.observe({ entryTypes: ['first-input'] });
            }
        } catch (error) {
            captureException(error as Error, { context: 'FID monitoring' });
        }
    }

    private observeLCP(): void {
        try {
            // @ts-ignore - LCP API might not be available
            if ('PerformanceObserver' in window && 'largest-contentful-paint' in window) {
                // @ts-ignore
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    // @ts-ignore
                    this.lcpValue = lastEntry.renderTime || lastEntry.loadTime;
                });

                // @ts-ignore
                observer.observe({ entryTypes: ['largest-contentful-paint'] });
            }
        } catch (error) {
            captureException(error as Error, { context: 'LCP monitoring' });
        }
    }

    // Get current Core Web Vitals values
    getMetrics(): { cls: number; fid: number; lcp: number } {
        return {
            cls: this.clsValue,
            fid: this.fidValue,
            lcp: this.lcpValue
        };
    }

    // Report metrics to monitoring service
    reportMetrics(): void {
        const metrics = this.getMetrics();
        logger.info('Core Web Vitals:', metrics);

        // In production, send to analytics service
        if (process.env.NODE_ENV === 'production') {
            // Send to your analytics service
            // Example: analytics.track('web_vitals', metrics);
        }
    }
}

// Resource loading monitoring
class ResourceMonitor {
    private resources: Map<string, { loaded: boolean; duration: number }> = new Map();

    init(): void {
        if (typeof window !== 'undefined' && 'performance' in window) {
            this.observeResources();
        }
    }

    private observeResources(): void {
        try {
            // @ts-ignore
            if ('PerformanceObserver' in window) {
                // @ts-ignore
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // @ts-ignore
                        this.resources.set(entry.name, {
                            // @ts-ignore
                            loaded: entry.responseEnd > 0,
                            // @ts-ignore
                            duration: entry.responseEnd - entry.startTime
                        });
                    }
                });

                // @ts-ignore
                observer.observe({ entryTypes: ['resource'] });
            }
        } catch (error) {
            captureException(error as Error, { context: 'Resource monitoring' });
        }
    }

    getSlowResources(threshold: number = 1000): Array<{ name: string; duration: number }> {
        const slowResources: Array<{ name: string; duration: number }> = [];

        this.resources.forEach((resource, name) => {
            if (resource.duration > threshold) {
                slowResources.push({ name, duration: resource.duration });
            }
        });

        return slowResources;
    }
}

// Export instances
export const performanceMonitor = new PerformanceMonitor();
export const coreWebVitals = new CoreWebVitals();
export const resourceMonitor = new ResourceMonitor();

// Initialize monitoring
if (typeof window !== 'undefined') {
    // Initialize Core Web Vitals
    coreWebVitals.init();

    // Initialize resource monitoring
    resourceMonitor.init();

    // Report metrics when page is unloaded
    window.addEventListener('beforeunload', () => {
        coreWebVitals.reportMetrics();
    });

    // Report metrics periodically
    setInterval(() => {
        coreWebVitals.reportMetrics();
    }, 30000); // Every 30 seconds
}

export default {
    performanceMonitor,
    coreWebVitals,
    resourceMonitor
};