import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables (including those without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      splitVendorChunkPlugin(), // Add automatic vendor chunk splitting
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true
      }),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 3000000, // 3MB limit
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*supabase\.co/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Vartica Food Delivery',
          short_name: 'Vartica',
          description: 'University campus food delivery platform',
          theme_color: '#22c55e',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
      }),
    ],
    base: '/', // Keep as '/' for Vercel deployment
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: ['@supabase/supabase-js', 'react', 'react-dom', 'react-router-dom'], // Pre-bundle dependencies
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
          // Simplified chunking to avoid React bundling issues
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('lucide-react')) {
                return 'ui';
              }
              return 'vendor';
            }
          },
          // Optimize chunk naming
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      minify: 'terser',
      terserOptions: isProduction
        ? {
          compress: {
            drop_console: true, // Remove console.* in production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'console.info'], // Remove specific console methods
            passes: 1, // Single compression pass to avoid issues
          },
          mangle: false, // Disable mangling to prevent React issues
        }
        : undefined,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Enable asset inlining for small files
      assetsInlineLimit: 4096, // 4kb
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
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