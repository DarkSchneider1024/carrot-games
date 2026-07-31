/**
 * Carrot Games — SPA Router
 * Hash-based router for static hosting compatibility (GitHub Pages)
 */

const routes = {};
let currentCleanup = null;

/**
 * Register a route
 * @param {string} path - Route path (e.g. '/', '/xiangqi')
 * @param {Function} handler - async function(container, params) that renders the page and returns cleanup fn
 */
export function registerRoute(path, handler) {
  routes[path] = handler;
}

/**
 * Navigate to a route
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = '#' + path;
}

/**
 * Get current route path (with normalized trailing slashes)
 */
function getCurrentPath() {
  let hash = window.location.hash.slice(1) || '/';
  if (hash.length > 1 && hash.endsWith('/')) {
    hash = hash.slice(0, -1);
  }
  return hash;
}

/**
 * Route matching — extract params from the path
 */
function matchRoute(path) {
  // Exact match first
  if (routes[path]) return { handler: routes[path], params: {} };

  // Pattern matching (e.g., /xiangqi/:mode, /poker/:mode)
  for (const [pattern, handler] of Object.entries(routes)) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return { handler, params };
  }

  return null;
}

/**
 * Render the current route
 */
async function renderRoute() {
  const path = getCurrentPath();
  const app = document.getElementById('app');

  // Clean up previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const match = matchRoute(path);

  if (match) {
    // Fade out
    app.style.opacity = '0';
    app.style.transition = 'opacity 0.15s ease';

    await new Promise(r => setTimeout(r, 150));
    app.innerHTML = '';

    currentCleanup = await match.handler(app, match.params);

    // Fade in
    requestAnimationFrame(() => {
      app.style.opacity = '1';
    });
  } else {
    // 404
    app.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;background-color:var(--color-bg-primary);color:var(--color-text-primary);">
        <h1 style="font-size:4rem;">🥕</h1>
        <h2>找不到頁面</h2>
        <p style="color:var(--color-text-secondary)">這裡什麼都沒有...</p>
        <a href="#/" class="btn btn-primary" style="margin-top:1rem;">回到首頁</a>
      </div>
    `;
  }
}

/**
 * Initialize the router
 */
export function initRouter() {
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}
