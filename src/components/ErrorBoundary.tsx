import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error?: Error; resetError?: () => void }>;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // In production, you might want to log this to a monitoring service
        if (process.env.NODE_ENV === 'production') {
            // Log to external service like Sentry, LogRocket, etc.
            // Example: Sentry.captureException(error);
        }
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided, otherwise use default
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
                        <p className="text-gray-600 mb-6">We're sorry, but something unexpected happened. Please try refreshing the page.</p>
                        <div className="space-y-3">
                            <button
                                onClick={this.resetError}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => {
                                    // Try to recover through context refresh first
                                    if (typeof window !== 'undefined' && window.location) {
                                        window.location.reload();
                                    }
                                }}
                                className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 text-left text-sm text-red-600 bg-red-50 p-3 rounded">
                                <summary>Error details</summary>
                                <p>{this.state.error.toString()}</p>
                                <p>{this.state.error.stack}</p>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;