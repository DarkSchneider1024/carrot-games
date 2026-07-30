/**
 * Carrot Games — Main Entry Point
 */

import './styles/index.css';
import './pages/home/home.css';
import './pages/xiangqi/xiangqi.css';
import './pages/tetris/tetris.css';
import './pages/pwa-guide/pwa-guide.css';

import { registerRoute, initRouter } from './router.js';
import { renderHome } from './pages/home/home.js';
import { renderXiangqi } from './pages/xiangqi/xiangqi.js';
import { renderTetris } from './pages/tetris/tetris.js';
import { renderPwaGuide } from './pages/pwa-guide/pwa-guide.js';

// ── Register Routes ──
registerRoute('/', renderHome);
registerRoute('/xiangqi/:mode', renderXiangqi);
registerRoute('/tetris/:mode', renderTetris);
registerRoute('/pwa-guide', renderPwaGuide);

// ── Register PWA Service Worker ──
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/carrot-games/sw.js')
      .then((reg) => console.log('⚡ [PWA] ServiceWorker registered with scope:', reg.scope))
      .catch((err) => console.warn('⚠️ [PWA] ServiceWorker registration failed:', err));
  });
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  console.log('🥕 Carrot Games initialized with WASM, P2P & PWA Support');
});
