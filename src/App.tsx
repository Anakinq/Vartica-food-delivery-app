// src/App.tsx - Modern React Router Implementation
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { router } from './routes';
import { Analytics } from '@vercel/analytics/react';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  useEffect(() => {
    // Filter out browser extension errors
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('Extension context invalidated')) return;
      originalError.apply(console, args);
    };

    // Validate environment variables (silent check)
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Configuration error: Missing Supabase credentials. Check your .env file.');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <div>
            {/* Accessibility elements */}
            <div role="status" aria-live="polite" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              Loading application
            </div>
            <div role="alert" aria-live="assertive" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              {/* For error messages */}
            </div>
            <RouterProvider router={router} />
            <Analytics />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;