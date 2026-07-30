/**
 * Carrot Games — Main Entry Point
 */

import './styles/index.css';
import './pages/home/home.css';
import './pages/xiangqi/xiangqi.css';

import { registerRoute, initRouter } from './router.js';
import { renderHome } from './pages/home/home.js';
import { renderXiangqi } from './pages/xiangqi/xiangqi.js';

// ── Register Routes ──
registerRoute('/', renderHome);
registerRoute('/xiangqi/:mode', renderXiangqi);

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  console.log('🥕 Carrot Games initialized');
});
