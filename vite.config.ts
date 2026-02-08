import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables (including those without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      splitVendorChunkPlugin(), // Add automatic vendor chunk splitting
    ],
    base: '/', // Keep as '/' for Vercel deployment
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: ['@supabase/supabase-js'], // Pre-bundle dependencies
    },
    define: {
      // Make process.env available in the browser
      'process.env': env,
      // Enable React production optimizations
      __DEV__: mode === 'development',
      __PROD__: mode === 'production',
    },
    build: {
      sourcemap: !isProduction, // Generate source maps in development
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks to improve caching
            'react-vendor': ['react', 'react-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': ['lucide-react'],
          },
        },
      },
      minify: 'terser',
      terserOptions: isProduction
        ? {
          compress: {
            drop_console: true, // Remove console.* in production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'console.info'], // Remove specific console methods
          },
        }
        : undefined,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Enable asset inlining for small files
      assetsInlineLimit: 4096, // 4kb
    },

    // Development server configuration
    server: {
      host: true,
      strictPort: false,
      // Enable compression in development for better performance testing
      proxy: {},
    },

    // Preview server configuration
    preview: {
      host: true,
      port: 4173,
    },
  };
});