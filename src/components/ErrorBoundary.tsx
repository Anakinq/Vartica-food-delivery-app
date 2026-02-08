import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './common/Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({
            error,
            errorInfo,
        });

        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // TODO: Send error to error tracking service (e.g., Sentry)
        this.reportError(error, errorInfo);
    }

    private reportError(error: Error, errorInfo: ErrorInfo): void {
        // In production, send to error tracking service
        const errorData = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : 'server',
        };

        // Example: Send to Sentry or other service
        // await fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(errorData),
        // });

        console.error('Error reported:', errorData);
    }

    private handleRefresh = (): void => {
        window.location.reload();
    };

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    className="min-h-screen flex items-center justify-center p-4"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-gray-600 mb-6">
                            We apologize for the inconvenience. An unexpected error occurred.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-red-600 mb-2">
                                    {this.state.error.message}
                                </p>
                                {this.state.errorInfo && (
                                    <p className="text-xs font-mono text-gray-500 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={this.handleReset}
                                leftIcon={<RefreshCw className="h-4 w-4" />}
                            >
                                Try Again
                            </Button>
                            <Button
                                variant="primary"
                                onClick={this.handleRefresh}
                            >
                                Refresh Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
