/**
 * Carrot Games — Main Entry Point with PWA Auto-Update Manager
 */

import './styles/index.css';
import './pages/home/home.css';
import './pages/xiangqi/xiangqi.css';
import './pages/tetris/tetris.css';
import './pages/pwa-guide/pwa-guide.css';
import './pages/poker/poker.css';
import './pages/magic-fighter/magic-fighter.css';

import { registerRoute, initRouter } from './router.js';
import { renderHome } from './pages/home/home.js';
import { renderXiangqi } from './pages/xiangqi/xiangqi.js';
import { renderTetris } from './pages/tetris/tetris.js';
import { renderPwaGuide } from './pages/pwa-guide/pwa-guide.js';
import { renderPoker } from './pages/poker/poker.js';
import { renderMagicFighter } from './pages/magic-fighter/magic-fighter.js';
import { showToast } from './components/toast.js';
import { updateLoadingProgress, hideLoadingScreen } from './utils/loading-manager.js';

// Progress Update
updateLoadingProgress(45, '⚡ 正在初始化遊戲對戰引擎與模組...');

// ── Register Routes ──
registerRoute('/', renderHome);
registerRoute('/xiangqi/:mode', renderXiangqi);
registerRoute('/tetris/:mode', renderTetris);
registerRoute('/poker/:mode', renderPoker);
registerRoute('/magic-fighter/:mode', renderMagicFighter);
registerRoute('/pwa-guide', renderPwaGuide);

// ── PWA Service Worker & Auto-Update Manager ──
function registerPWA() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    showToast('⚡ 已更新至最新版本！正在重新載入...', 'success');
    setTimeout(() => window.location.reload(), 800);
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/carrot-games/sw.js');
      console.log('⚡ [PWA] ServiceWorker registered with scope:', reg.scope);

      window.addEventListener('focus', () => reg.update());
      setInterval(() => reg.update(), 10 * 60 * 1000);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('⚡ [PWA] New update available! Activating immediately.');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (err) {
      console.warn('⚠️ [PWA] ServiceWorker registration failed:', err);
    }
  });
}

registerPWA();

// ── Initialize App ──
document.addEventListener('DOMContentLoaded', () => {
  updateLoadingProgress(75, '🎮 載入遊戲大廳與連線系統...');
  initRouter();
  console.log('🥕 Carrot Games initialized with Xiangqi, Tetris & Poker');
  
  // Smoothly fade out loading screen
  hideLoadingScreen();
});
