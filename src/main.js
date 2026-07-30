/**
 * Carrot Games — Main Entry Point
 */

import './styles/index.css';
import './pages/home/home.css';
import './pages/xiangqi/xiangqi.css';
import './pages/tetris/tetris.css';

import { registerRoute, initRouter } from './router.js';
import { renderHome } from './pages/home/home.js';
import { renderXiangqi } from './pages/xiangqi/xiangqi.js';
import { renderTetris } from './pages/tetris/tetris.js';

// ── Register Routes ──
registerRoute('/', renderHome);
registerRoute('/xiangqi/:mode', renderXiangqi);
registerRoute('/tetris/:mode', renderTetris);

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  console.log('🥕 Carrot Games initialized with WASM & P2P Engine');
});
