import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables (including those without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    base: '/', // Keep as '/' for Vercel deployment
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      // Make process.env available in the browser
      'process.env': env,
    },
    build: {
      minify: 'terser',
      terserOptions: isProduction
        ? {
          compress: {
            drop_console: true, // Remove console.* in production
            drop_debugger: true,
          },
        }
        : undefined,
    },

    // Development server configuration
    server: {
      host: true,
      strictPort: false,
    },
  };
});