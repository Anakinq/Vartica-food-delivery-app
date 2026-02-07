import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminErrorBoundaryProps {
    children: React.ReactNode;
}

interface AdminErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class AdminErrorBoundary extends React.Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
    constructor(props: AdminErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Admin dashboard error:', error, errorInfo);
        // Log to external service if in production
        if (process.env.NODE_ENV === 'production') {
            // Log to monitoring service
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Admin Dashboard Error</h2>
                        <p className="text-gray-600 mb-6">There was an issue with the admin dashboard. Please try refreshing the page.</p>
                        <div className="space-y-3">
                            <button
                                onClick={() => this.setState({ hasError: false, error: undefined })}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
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

export default AdminErrorBoundary;