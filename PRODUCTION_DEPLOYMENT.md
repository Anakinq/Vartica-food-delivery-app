# Vartica Food Delivery - Production Deployment Guide

This guide covers everything needed to deploy your app to production with proper caching, security, and performance optimizations.

---

## 🚀 Quick Deploy Checklist

### Before Deployment

1. **Update Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Increment Cache Version**
   - Open `public/sw.js`
   - Change `CACHE_VERSION` (e.g., `v2.0.0` → `v2.0.1`)

3. **Remove Console Logs** (if not done already)
   - Search for `console.log` and `console.error` in src/
   - Remove or guard with `process.env.NODE_ENV === 'development'`

### Deployment

```bash
# Build the app
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 🔧 Cache Busting Strategy

### Service Worker (`public/sw.js`)

The service worker uses a cache version that MUST be incremented on each deployment:

```javascript
const CACHE_VERSION = 'v2.0.1'; // ← CHANGE THIS ON EVERY DEPLOY
```

**How it works:**
1. On deploy, increment `CACHE_VERSION`
2. Users visiting the site will automatically get the new service worker
3. Old caches are cleaned up on activation
4. Fresh content is fetched immediately

### Vercel Headers (`vercel.json`)

| File Type | Cache Strategy |
|-----------|--------------|
| `index.html` | `no-cache, no-store, must-revalidate` |
| `sw.js` | `no-cache, no-store, must-revalidate` |
| `.js` files | `public, max-age=31536000, immutable` |
| `.css` files | `public, max-age=31536000, immutable` |
| Images | `public, max-age=86400` |

---

## 🔐 Security Checklist

### Environment Variables Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack live key | Paystack Dashboard → Settings → API Keys |

### Never Commit
- `.env` files
- API keys
- Database credentials

---

## 📱 PWA Setup

### Icons Required
Place in `/public/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `favicon.ico`

### Manifest (`public/manifest.json`)
Already configured. Update these fields for production:
- `name`: "Vartica Food Delivery"
- `short_name`: "Vartica"
- `start_url`: "/"
- `theme_color`: "#FF9500"

---

## 🐛 Troubleshooting

### "Users not seeing updates"

**Solution:**
1. Increment `CACHE_VERSION` in `public/sw.js`
2. Deploy again
3. Users will automatically get the new version on next visit

### "Clear cache" messages from users

**Root Cause:** Service worker caching old files

**Solution:**
1. Increment `CACHE_VERSION` (see above)
2. Consider adding an "Update Available" banner using `pwa.ts` utility

### Service Worker Not Registering

Check browser console for errors:
```javascript
// Add this to App.tsx for debugging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('SW registered:', registration);
  }).catch(error => {
    console.error('SW registration failed:', error);
  });
}
```

---

## 📊 Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|---------------|
| First Contentful Paint | < 1.5s | Optimized images, lazy loading |
| Time to Interactive | < 3s | Code splitting, memoization |
| Lighthouse Score | > 90 | Proper caching, accessibility |
| Bundle Size | < 500KB | Tree shaking, remove unused deps |

---

## 🔄 Automated Cache Busting (Optional)

For automatic versioning without manual changes:

### Option 1: Git Hash
```javascript
// public/sw.js
const CACHE_VERSION = 'v' + process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev';
```

### Option 2: Build Timestamp
```javascript
const CACHE_VERSION = 'v' + Date.now();
```

Add to `vite.config.ts`:
```javascript
define: {
  'import.meta.env.VITE_BUILD_TIME': JSON.stringify(Date.now().toString()),
}
```

---

## 📝 Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Cache version incremented in `sw.js`
- [ ] Console.logs removed from production code
- [ ] Icons updated with correct app name
- [ ] Paystack in live mode (not test)
- [ ] Supabase project in production mode
- [ ] ErrorBoundary wrapping the app
- [ ] Analytics configured (optional)
- [ ] 404 page created (optional)

---

## 🆘 Rollback Procedure

If a deployment causes issues:

1. **Vercel Dashboard:**
   - Go to Deployments
   - Click on previous working deployment
   - Click "Deploy"

2. **Revert Cache Version:**
   ```javascript
   // public/sw.js
   const CACHE_VERSION = 'v2.0.0'; // Previous version
   ```

3. **Clear Caches (users):**
   - Increment version again
   - Users will get fresh content automatically

---

## 📞 Support

For issues with:
- **Vercel:** Check Vercel Dashboard logs
- **Supabase:** Check Supabase Dashboard logs
- **Paystack:** Check Paystack Dashboard for failed transactions
- **Service Worker:** Open DevTools → Application → Service Workers
