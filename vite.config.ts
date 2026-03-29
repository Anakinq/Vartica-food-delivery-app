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
        injectManifest: true,
        workbox: {
          maximumFileSizeToCacheInBytes: 3000000, // 3MB limit
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
          runtimeCaching: [
            // EXCLUDE OpenStreetMap tiles from caching - always fetch from network
            {
              urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
              handler: 'NetworkOnly',
              options: {
                cacheName: 'openstreetmap-tiles',
                expiration: {
                  maxEntries: 0,
                  maxAgeSeconds: 0,
                },
              },
            },
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
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js'
      ],
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
          // Manual chunk splitting for better caching and lazy loading
          manualChunks: {
            // Core React ecosystem - loaded first
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Heavy charting library - loaded only on analytics pages
            'vendor-charts': ['recharts'],
            // Maps libraries - loaded only on map pages
            'vendor-maps': ['@react-google-maps/api', 'leaflet', 'react-leaflet'],
            // Analytics and error tracking - loaded on demand
            'vendor-analytics': ['@vercel/analytics', '@sentry/react', '@sentry/browser'],
            // Payment processing - loaded only on checkout
            'vendor-payment': ['react-paystack'],
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Use default esbuild minifier - terser can cause React issues
      minify: 'esbuild',
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Enable asset inlining for small files
      assetsInlineLimit: 8192, // 8kb - inline more small files
      // Optimize chunk size
      chunkSizeWarningLimit: 1500,
      // Inline all CSS to avoid render blocking (small app)
      inlineStylesheets: true,
      // Improve tree-shaking
      treeShaking: true,
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