import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables (including those without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');

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

    // ✅ Add security headers to allow Supabase Functions & Paystack
    server: {
      headers: {
        'Content-Security-Policy': `
          default-src 'self';
          connect-src 'self'
            https://jbqhbuogmxqzotlorahn.supabase.co
            https://jbqhbuogmxqzotlorahn.functions.supabase.co
            https://api.paystack.co;
        `.replace(/\n/g, ' '),
      },
    },
  };
});
