import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables (including those without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    base: './', // ✅ fixes 404 errors on Vercel by using relative asset paths
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

    // ✅ Add security headers to allow Supabase Functions & Paystack
    server: {
      headers: {
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' https://js.paystack.co https://checkout.paystack.com;
          connect-src 'self'
            https://jbqhbuogmxqzotlorahn.supabase.co
            https://jbqhbuogmxqzotlorahn.functions.supabase.co
            https://api.paystack.co
            https://checkout.paystack.com;
          frame-src https://checkout.paystack.com https://*.paystack.com;
          style-src 'self' 'unsafe-inline' https://paystack.com https://*.paystack.com;
          style-src-elem 'self' 'unsafe-inline' https://paystack.com https://*.paystack.com;
          img-src 'self' blob: data:
            https://jbqhbuogmxqzotlorahn.supabase.co
            https://images.unsplash.com
            https://via.placeholder.com
            https://res.cloudinary.com
            https://*.paystack.com
            https://checkout.paystack.com
            https://paystack.com
            https://cdn-cgi.challenge-platform.hcaptcha.com;
          font-src 'self' data:;
          object-src 'none';
          base-uri 'self';
          form-action 'self';
        `.replace(/\n/g, ' '),
      },
    },
  };
});
