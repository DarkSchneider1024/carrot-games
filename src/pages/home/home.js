/**
 * Home Page — Game Lobby (Happy Hues Fresh Cute Redesign)
 */

import { navigate } from '../../router.js';
import { storage } from '../../storage/storage-manager.js';
import { SVG_ICONS } from '../../components/icons.js';

export async function renderHome(container) {
  container.innerHTML = `
    <div class="home">
      <!-- Background Cyber Grid -->
      <div class="home-grid-bg"></div>

      <!-- Header -->
      <header class="home-header animate-fade-in-down">
        <div class="home-logo">
          <img src="/carrot-games/assets/images/logo_carrot.png" alt="Carrot Logo" class="home-logo-img" />
          <div>
            <h1 class="home-title">CARROT <span class="accent-text">GAMES</span></h1>
            <p class="home-subtitle">PURE FRONTEND BATTLE PLATFORM</p>
          </div>
        </div>
        <div class="home-header-actions">
          <button class="btn btn-secondary btn-sm" id="btn-pwa-guide">
            ${SVG_ICONS.smartphone} PWA 安裝指南
          </button>
          <div class="home-storage-badge" id="storage-badge">
            <span class="badge badge-info">${SVG_ICONS.storage} 初始化中...</span>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="home-hero animate-fade-in-up">
        <div class="hero-tagline">
          <span class="badge badge-warning">NEXT-GEN WEB TECH & PWA</span>
        </div>
        <h2 class="home-hero-title">
          戰術棋藝 <span class="gradient-text">即時對決</span>
        </h2>
        <p class="home-hero-desc">
          極速 WebAssembly 深度引擎 ✕ WebRTC 無伺服器 P2P 對戰 ✕ OPFS 高效本機存儲 ✕ PWA 全螢幕 App
        </p>
      </section>

      <!-- Games Showcase Grid -->
      <section class="home-games">
        <!-- Chinese Chess Card -->
        <div class="game-card animate-fade-in-up stagger-2" id="card-xiangqi">
          <div class="game-card-banner">
            <img src="/carrot-games/assets/images/icon_xiangqi.png" alt="中國象棋" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-success game-card-status">已上位</span>
          </div>
          <div class="game-card-content">
            <h3>中國象棋 (XIANGQI)</h3>
            <p>楚河漢界戰術攻防！內建 Negamax Alpha-Beta 引擎與 P2P 開房間對弈。</p>
            
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} Minimax AI</span>
              <span class="tag">${SVG_ICONS.globe} WebRTC P2P</span>
              <span class="tag">${SVG_ICONS.storage} OPFS Save</span>
            </div>

            <div class="game-card-actions">
              <button class="btn btn-primary" id="btn-xiangqi-ai">
                ${SVG_ICONS.bot} 對戰 AI
              </button>
              <button class="btn btn-cyan" id="btn-xiangqi-online">
                ${SVG_ICONS.globe} 連線開房
              </button>
            </div>
          </div>
        </div>

        <!-- Tetris Battle Card (WebAssembly Enabled) -->
        <div class="game-card animate-fade-in-up stagger-3" id="card-tetris">
          <div class="game-card-banner">
            <img src="/carrot-games/assets/images/icon_gomoku.png" alt="俄羅斯方塊對戰" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-success game-card-status">WASM 引擎</span>
          </div>
          <div class="game-card-content">
            <h3>俄羅斯方塊 (TETRIS BATTLE 2P)</h3>
            <p>經典 2 分鐘 Tetris Battle 對決！WASM 核心引擎、K.O. 擊倒機制與垃圾行攻擊反制。</p>

            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} WebAssembly</span>
              <span class="tag">${SVG_ICONS.globe} 2P Battle</span>
              <span class="tag">${SVG_ICONS.smartphone} Mobile Touch</span>
            </div>

            <div class="game-card-actions">
              <button class="btn btn-primary" id="btn-tetris-ai">
                ${SVG_ICONS.bot} 對戰 AI
              </button>
              <button class="btn btn-cyan" id="btn-tetris-online">
                ${SVG_ICONS.globe} 連線開房
              </button>
            </div>
          </div>
        </div>

        <!-- Poker Card -->
        <div class="game-card animate-fade-in-up stagger-4" id="card-poker">
          <div class="game-card-banner">
            <img src="/carrot-games/assets/images/icon_poker.png" alt="德州撲克" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-success game-card-status">熱門上線</span>
          </div>
          <div class="game-card-content">
            <h3>德州撲克 (POKER)</h3>
            <p>多玩家 P2P 心理博弈與籌碼決戰。支援 AI 電腦玩家對決與 P2P 連線開房。</p>
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} Poker AI</span>
              <span class="tag">${SVG_ICONS.globe} Multi-Peer</span>
            </div>

            <div class="game-card-actions">
              <button class="btn btn-primary" id="btn-poker-ai">
                ${SVG_ICONS.bot} 對戰 AI
              </button>
              <button class="btn btn-cyan" id="btn-poker-online">
                ${SVG_ICONS.globe} 連線開房
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Tech Architecture Banner -->
      <section class="home-tech animate-fade-in-up stagger-5">
        <h4 class="home-tech-title">核心技術棧 (TECH STACK)</h4>
        <div class="home-tech-grid">
          <div class="tech-item">
            <span class="tech-icon">${SVG_ICONS.cpu}</span>
            <span>WebAssembly Engine</span>
          </div>
          <div class="tech-item">
            <span class="tech-icon">${SVG_ICONS.smartphone}</span>
            <span>PWA & Offline Support</span>
          </div>
          <div class="tech-item">
            <span class="tech-icon">${SVG_ICONS.storage}</span>
            <span>OPFS Filesystem</span>
          </div>
          <div class="tech-item">
            <span class="tech-icon">${SVG_ICONS.storage}</span>
            <span>IndexedDB fallback</span>
          </div>
          <div class="tech-item">
            <span class="tech-icon">${SVG_ICONS.globe}</span>
            <span>WebRTC P2P Room</span>
          </div>
          <div class="tech-item">
            <span class="tech-icon">${SVG_ICONS.settings}</span>
            <span>Mobile RWD Touch</span>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="home-footer">
        <p>CARROT GAMES © 2026 — Pure Frontend Architecture</p>
        <p class="home-footer-sub" id="storage-info"></p>
      </footer>
    </div>
  `;

  // Event handlers
  document.getElementById('btn-pwa-guide')?.addEventListener('click', () => {
    navigate('/pwa-guide');
  });

  document.getElementById('btn-xiangqi-ai')?.addEventListener('click', () => {
    navigate('/xiangqi/ai');
  });

  document.getElementById('btn-xiangqi-online')?.addEventListener('click', () => {
    navigate('/xiangqi/online');
  });

  document.getElementById('btn-tetris-ai')?.addEventListener('click', () => {
    navigate('/tetris/ai');
  });

  document.getElementById('btn-tetris-online')?.addEventListener('click', () => {
    navigate('/tetris/online');
  });

  document.getElementById('btn-poker-ai')?.addEventListener('click', () => {
    navigate('/poker/ai');
  });

  document.getElementById('btn-poker-online')?.addEventListener('click', () => {
    navigate('/poker/online');
  });

  // Initialize storage badge
  try {
    await storage.init();
    const info = storage.getInfo();
    const badge = document.getElementById('storage-badge');
    if (badge) {
      badge.innerHTML = `<span class="badge badge-success">${SVG_ICONS.storage} ${info.adapter} ACTIVE</span>`;
    }
    const storageInfoEl = document.getElementById('storage-info');
    if (storageInfoEl) {
      storageInfoEl.textContent = `Storage Adapter: ${info.adapter}`;
    }
  } catch (e) {
    console.warn('Storage init failed:', e);
  }

  return () => {};
}
