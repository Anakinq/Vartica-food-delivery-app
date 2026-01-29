import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext'; // ✅ Adjust path if needed
import './index.css';
// import { SpeedInsights } from '@vercel/speed-insights/react';
// import { Analytics } from '@vercel/analytics/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      {/* <SpeedInsights /> */}
      {/* <Analytics /> */}
    </AuthProvider>
  </StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                // Show notification instead of confirm dialog for better UX
                const showUpdateNotification = () => {
                  if (typeof window !== 'undefined') {
                    // Create a simple notification or update banner instead of confirm dialog
                    console.log('New version available! Refresh to update.');
                    // You could show a custom UI element here instead
                  }
                  showUpdateNotification();

                  // Auto-update after a delay or when user interacts with notification
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                };

                // Trigger update notification
                showUpdateNotification();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}