import './coffee-advisor-app.js';
import './install-banner.js';

// Register the service worker so the app is installable and works offline.
// Only in production builds — the SW would otherwise interfere with Vite's dev
// server / HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failing (e.g. unsupported / insecure context) is non-fatal.
    });
  });
}
