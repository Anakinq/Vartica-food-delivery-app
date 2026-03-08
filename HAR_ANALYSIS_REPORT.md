# HAR Analysis - Performance & Security Report

Based on the HTTP Archive (HAR) log analysis for `varticafooddelivery.vercel.app`, the following issues were identified and verified against the codebase.

---

## 1. Performance Optimization

### 1.1 High Server Wait Times

**Finding:** Auth callback shows 4172.93ms wait time; Supabase API shows 2166.80ms

**Database Index Status:** ✅ Already configured
- `vendor_reviews` table has indexes on `vendor_id`, `customer_id`, and `order_id`
- `orders` table has composite indexes for status/customer lookups

**Recommendation:** The 4-second delay likely indicates server-side processing issues in the auth callback handler. Consider adding caching or async processing.

### 1.2 Multiple API Requests (No Batching) - CRITICAL

**Finding:** Confirmed in code - multiple components make individual requests for vendor reviews

**Evidence in code:**
- `src/components/customer/VendorList.tsx` lines 43-46 - loops through vendors calling `getVendorAverageRating()` and `getVendorReviewCount()` for EACH vendor
- `src/components/customer/CustomerHome.tsx` lines 363-366 - same pattern
- `src/components/customer/MenuItemDetail.tsx` lines 56-58 - same pattern

**Solution:** Add batch method to `src/services/supabase/vendor.service.ts`

### 1.3 Font Loading

**Finding:** Current config in `index.html` only loads basic Google Sans without explicit subsets

**Status:** ✅ Already optimized

---

## 2. Security Enhancements

### 2.1 CSP Configuration - CRITICAL

**Finding:** `vercel.json` line 11 contains:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

**Risk:** 
- `unsafe-eval` allows `eval()` execution (XSS vector)
- `unsafe-inline` allows inline scripts

**Recommendation:** 
1. Remove `'unsafe-eval'` if possible
2. Replace `'unsafe-inline'` with nonce-based or hash-based CSP
3. For React/Vite apps, move all inline styles to CSS modules

### 2.2 API Key Exposure

**Finding:** ✅ Verified as SAFE

The codebase uses `VITE_SUPABASE_ANON_KEY` which is the public read-only key (JWT payload shows `"role":"anon"`). This is the intended public key for client-side use.

**⚠️ Warning:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env` files should NEVER be exposed to the frontend.

---

## 3. Error Handling & Reliability

### 3.1 ERR_ABORTED / Status 0

**Potential Sources:**
- Google Maps scripts (third-party dependency)
- Navigation-related aborted preloads
- Possible ad-blocker interference

**Recommendation:** Add error boundaries and graceful degradation for Maps.

### 3.2 Empty API Responses

**Finding:** `vendor_reviews` returns empty for vendors with no reviews

**Status:** This is expected behavior, not an error.

---

## 4. Caching Strategy

### 4.1 Static Assets

**Status:** ✅ Excellent - `vercel.json` sets `max-age=31536000, immutable` for JS/CSS

### 4.2 API Caching

**Finding:** `cf-cache-status: DYNAMIC` means no CDN caching

**Recommendation:** Add cache headers in Vercel API routes.

---

## Priority Action Items

| Priority | Action | Files to Modify |
|----------|--------|-----------------|
| 🔴 High | Remove `'unsafe-eval'` from CSP | `vercel.json` line 11 |
| 🟠 High | Implement batch vendor review fetching | `vendor.service.ts` + components |
| 🟡 Medium | Add API response caching | Vercel API routes |
| 🟡 Medium | Add error boundary for failed requests | `App.tsx` |
| 🟢 Low | Remove `unsafe-inline` | CSS modules + `vercel.json` |

---

## Quick Fix: CSP Security

Update `vercel.json` Content-Security-Policy to remove unsafe-eval:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://js.paystack.co https://checkout.paystack.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://js.pusher.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://paystack.com https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' wss://*.supabase.co https://*.supabase.co https://*.vercel.app https://*.sentry.io https://api.paystack.co https://checkout.paystack.com https://s3-eu-west-1.amazonaws.com https://*.pusher.com;"
}
```

Remove `'unsafe-eval'` from script-src if not using dynamic code generation.
