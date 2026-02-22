// src/utils/performanceMonitoring.ts
// Performance monitoring and optimization utilities

/**
 * Initialize performance monitoring
 */
export const initPerformanceMonitoring = () => {
    if (typeof window === 'undefined') return;

    // Custom performance metrics
    observeLongTasks();
    measureFirstInputDelay();
    monitorNetworkPerformance();
};

/**
 * Observe long tasks that block the main thread
 */
const observeLongTasks = () => {
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.duration > 50) {
                    console.warn('Long task detected:', entry.duration, 'ms');
                }
            });
        });

        observer.observe({ entryTypes: ['longtask'] });
    }
};

/**
 * Measure First Input Delay
 */
const measureFirstInputDelay = () => {
    if ('PerformanceObserver' in window && 'PerformanceEventTiming' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
                if (entry.processingStart && entry.startTime) {
                    const fid = entry.processingStart - entry.startTime;
                    if (fid > 100) {
                        console.warn('High First Input Delay:', fid, 'ms');
                    }
                }
            });
        });

        observer.observe({ entryTypes: ['first-input'] });
    }
};

/**
 * Measure component render times
 */
export const measureRenderTime = (componentName: string, callback: () => void) => {
    if (typeof performance === 'undefined') {
        callback();
        return;
    }

    const start = performance.now();
    callback();
    const end = performance.now();

    const renderTime = end - start;
    if (renderTime > 16) { // More than 1 frame (60fps)
        console.warn(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
    }
};

/**
 * Memory usage monitoring
 */
export const monitorMemoryUsage = () => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        const usageMB = Math.round(memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);

        if (usageMB > limitMB * 0.8) {
            console.warn(`High memory usage: ${usageMB}MB / ${limitMB}MB`);
        }
    }
};

/**
 * Network performance monitoring
 */
export const monitorNetworkPerformance = () => {
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
                if (entry.transferSize && entry.transferSize > 100000) { // 100KB
                    console.warn('Large resource loaded:', entry.name, `${Math.round(entry.transferSize / 1024)}KB`);
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
    }
};

export default {
    initPerformanceMonitoring,
    measureRenderTime,
    monitorMemoryUsage,
    monitorNetworkPerformance
};