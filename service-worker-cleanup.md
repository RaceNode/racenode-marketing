# Service Worker Cleanup - Marketing Site Issue

## Context

Users who visited the old React app have a Service Worker cached in their browser that intercepts requests and blocks the new Astro marketing site, causing a blank page.

## Problem Analysis

### What Happened

1. **Old React App** - Had a Service Worker (from Vite PWA) that cached assets
2. **Migration to Astro** - New marketing site doesn't use Service Worker
3. **User Impact** - Old Service Worker intercepts requests → serves cached HTML → references old Vite chunks → blank page

### Why Simple Solutions Don't Work

The chicken-egg problem:
- If Service Worker intercepts requests and returns old cached HTML
- The old page references old Vite chunks → blank page
- New cleanup script never executes because old HTML is served

## Solution

### Step 1: Create Self-Destroying Service Worker

Create `public/sw.js` in the **marketing site (Astro)** project:

```javascript
// Self-destroying service worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister();
  caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
});
```

### Step 2: Add Cleanup Script

In `BaseLayout.astro`, add this script in `<head>` (before other scripts):

```html
<script is:inline>
  if ('serviceWorker' in navigator) {
    // Register the "killer" SW that will self-destruct
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      reg.update();
    });
    // Also clear caches
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        keys.forEach(function(key) { caches.delete(key); });
      });
    }
  }
</script>
```

### Step 3: Purge Cloudflare Cache

After deployment:
1. Go to Cloudflare dashboard
2. Your site → Caching → Purge Everything

## How It Works

The trick is to register a new Service Worker (the "killer") that will replace the old one:
1. Browser fetches `/sw.js` from server (not from cache)
2. Browser installs the new SW
3. New SW self-destructs and clears all caches
4. Site works normally again

## Implementation Target

**⚠️ Important**: This fix goes in the **marketing site (Astro/Cloudflare)** project, NOT in the RaceNode app.

## Alternative Approaches (Not Recommended)

- **Script in old HTML**: Won't work because old SW serves old HTML
- **Only cache clearing**: Won't work because SW remains active
- **404 for old assets**: Helps but doesn't fix the root cause
