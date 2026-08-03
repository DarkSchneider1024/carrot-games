/**
 * Home Page — Game Lobby with Realtime Public Room Directory & Global Chat
 */

import { navigate } from '../../router.js';
import { storage } from '../../storage/storage-manager.js';
import { SVG_ICONS } from '../../components/icons.js';
import { subscribePublicRooms, subscribeGlobalChat, sendGlobalChatMessage } from '../../network/firebase-manager.js';
import { showToast } from '../../components/toast.js';
import { showModal, closeModal } from '../../components/modal.js';
import { getPlayerName, setPlayerName } from '../../utils/player-profile.js';
import { initAuth, getUserProfile } from '../../network/auth-manager.js';
import { showAuthModal } from '../../components/auth-modal.js';

export async function renderHome(container) {
  let unsubRooms = null;
  let unsubChat = null;

  const currentProfile = getUserProfile();

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
            <p class="home-subtitle">線上休閒對戰遊戲大廳</p>
          </div>
        </div>
        <div class="home-header-actions">
          <button class="btn btn-secondary btn-sm" id="btn-player-profile" title="點擊開啟帳號與戰績管理">
            👤 <span id="display-player-name">${currentProfile?.displayName || getPlayerName()}</span>
            <span class="badge badge-warning" id="display-user-chips" style="margin-left:4px;">
              ${currentProfile?.isAnonymous ? '匿名訪客' : `$${(currentProfile?.chips || 1000).toLocaleString()}`}
            </span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-pwa-guide">
            ${SVG_ICONS.smartphone} 手機安裝指南
          </button>
          <div class="home-storage-badge" id="storage-badge">
            <span class="badge badge-info">${SVG_ICONS.storage} 存檔準備中...</span>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="home-hero animate-fade-in-up">
        <div class="hero-tagline">
          <span class="badge badge-warning">免下載 點擊即玩</span>
        </div>
        <h2 class="home-hero-title">
          經典棋藝 <span class="gradient-text">即時對決</span>
        </h2>
        <p class="home-hero-desc">
          無需安裝任何 App，開啟網頁即可享受流暢對戰、智慧 AI 陪練與好友跨平台連線！
        </p>
      </section>

      <!-- Category Filter Section -->
      <div class="home-filter-section animate-fade-in-up">
        <div class="home-filter-title">
          <span>🎮 遊戲庫分類</span>
          <span class="home-filter-count" id="filter-count">共 3 款遊戲</span>
        </div>
        <div class="home-filter-pills" id="home-filter-pills">
          <button class="filter-pill active" data-filter="all">🌟 全部遊戲</button>
          <button class="filter-pill" data-filter="board">♟️ 棋牌對戰</button>
          <button class="filter-pill" data-filter="puzzle">🧩 益智街機</button>
          <button class="filter-pill" data-filter="card">🃏 撲克娛樂</button>
        </div>
      </div>

      <!-- Games Showcase Grid -->
      <section class="home-games" id="home-games-grid">
        <!-- Chinese Chess Card -->
        <div class="game-card animate-fade-in-up stagger-2" id="card-xiangqi" data-category="board">
          <div class="game-card-banner">
            <img src="/carrot-games/assets/images/icon_xiangqi.png" alt="中國象棋" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">♟️ 棋牌對戰</span>
            <span class="badge badge-success game-card-status">經典推廣</span>
          </div>
          <div class="game-card-content">
            <h3>中國象棋 (XIANGQI)</h3>
            <p>楚河漢界戰術攻防！提供高智能 AI 陪練與線上好友連線對弈。</p>
            
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} 高智能 AI</span>
              <span class="tag">${SVG_ICONS.globe} 線上對戰</span>
              <span class="tag">${SVG_ICONS.storage} 自動存檔</span>
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

        <!-- Tetris Battle Card -->
        <div class="game-card animate-fade-in-up stagger-3" id="card-tetris" data-category="puzzle">
          <div class="game-card-banner">
            <img src="/carrot-games/assets/images/icon_gomoku.png" alt="俄羅斯方塊對戰" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">🧩 益智街機</span>
            <span class="badge badge-success game-card-status">熱門推薦</span>
          </div>
          <div class="game-card-content">
            <h3>俄羅斯方塊 (TETRIS BATTLE 2P)</h3>
            <p>經典 2 分鐘對決！考驗反應與消除技巧，支援 K.O. 擊倒與反制攻擊。</p>

            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} 雙人對決</span>
              <span class="tag">${SVG_ICONS.globe} 單手搖桿</span>
              <span class="tag">${SVG_ICONS.smartphone} 快節奏</span>
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
        <div class="game-card animate-fade-in-up stagger-4" id="card-poker" data-category="card">
          <div class="game-card-banner">
            <img src="/carrot-games/assets/images/icon_poker.png" alt="德州撲克" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">🃏 撲克娛樂</span>
            <span class="badge badge-success game-card-status">新品上市</span>
          </div>
          <div class="game-card-content">
            <h3>德州撲克 (POKER)</h3>
            <p>心理博弈與籌碼決戰！支援可愛 AI 電腦對決與好友連線開房。</p>
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} 可愛 AI 對決</span>
              <span class="tag">${SVG_ICONS.globe} 多人同樂</span>
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

      <!-- Realtime Online Lobby & Global Chat -->
      <section class="home-lobby-container animate-fade-in-up stagger-5">
        <div class="lobby-left">
          <div class="lobby-header">
            <h3 class="lobby-title">
              🔥 全球線上房間大廳 <span class="badge badge-success" style="font-size:11px;">即時連線</span>
            </h3>
            <span class="lobby-subtitle">點擊房間可直接加入對戰</span>
          </div>
          <div class="rooms-list-container" id="rooms-list">
            <div class="empty-rooms">
              <span class="spinner" style="width:20px;height:20px;"></span> 載入大廳房間中...
            </div>
          </div>
        </div>

        <div class="lobby-right">
          <div class="chat-header">
            <h4 class="chat-title">💬 大廳玩家頻道</h4>
          </div>
          <div class="chat-messages" id="chat-messages">
            <div class="empty-chat">歡迎來到 Carrot Games 聊天頻道！</div>
          </div>
          <form class="chat-input-form" id="chat-form">
            <input type="text" class="input chat-input" id="chat-text" placeholder="發送訊息..." maxlength="100" autocomplete="off" />
            <button type="submit" class="btn btn-primary btn-sm" id="btn-send-chat">送出</button>
          </form>
        </div>
      </section>

      <!-- Footer -->
      <footer class="home-footer">
        <p>CARROT GAMES © 2026 — 歡樂線上遊戲平台</p>
        <p class="home-footer-sub" id="storage-info"></p>
      </footer>
    </div>
  `;

  // Subscribe to Realtime Public Rooms
  unsubRooms = subscribePublicRooms((rooms) => {
    const listEl = document.getElementById('rooms-list');
    if (!listEl) return;

    if (rooms.length === 0) {
      listEl.innerHTML = `
        <div class="empty-rooms">
          <span>🥕 目前尚無開放中的房間</span>
          <p style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">點擊上方「連線開房」立刻建立第一個公開房間吧！</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = rooms.map(room => `
      <div class="room-row glass">
        <div class="room-row-info">
          <span class="room-game-badge badge badge-info">${room.gameName || room.gameType}</span>
          <strong class="room-host">${room.hostName || '匿名玩家'} 的房間</strong>
          <span class="room-id">房號: <code>${room.roomId}</code></span>
        </div>
        <div class="room-row-actions">
          <span class="room-players">${room.currentPlayers || 1}/${room.maxPlayers || 2} 人</span>
          <button class="btn btn-primary btn-sm btn-join-room" data-room-id="${room.roomId}" data-game="${room.gameType}">
            ${SVG_ICONS.link} 一鍵加入
          </button>
        </div>
      </div>
    `).join('');

    // Bind Join Room Click Handlers
    listEl.querySelectorAll('.btn-join-room').forEach(btn => {
      btn.addEventListener('click', () => {
        const roomId = btn.dataset.roomId;
        const gameType = btn.dataset.game || 'xiangqi';
        showToast(`正在加入 ${roomId} 房間...`, 'info');
        navigate(`/${gameType}/online?room=${roomId}`);
      });
    });
  });

  // Subscribe to Global Lobby Chat
  unsubChat = subscribeGlobalChat((messages) => {
    const chatEl = document.getElementById('chat-messages');
    if (!chatEl) return;

    if (messages.length === 0) {
      chatEl.innerHTML = `<div class="empty-chat">尚無對話訊息</div>`;
      return;
    }

    chatEl.innerHTML = messages.map(msg => {
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="chat-msg-item">
          <span class="msg-author">${msg.author}:</span>
          <span class="msg-text">${msg.text}</span>
          <span class="msg-time">${timeStr}</span>
        </div>
      `;
    }).join('');

    chatEl.scrollTop = chatEl.scrollHeight;
  });

  // Init Auth System & Subscribe Profile UI Changes
  initAuth((user, profile) => {
    const displayEl = document.getElementById('display-player-name');
    const chipBadge = document.getElementById('display-user-chips');
    if (displayEl) {
      displayEl.textContent = profile?.displayName || getPlayerName() || '玩家';
    }
    if (chipBadge) {
      if (user && !user.isAnonymous) {
        chipBadge.textContent = `$${(profile?.chips || 1000).toLocaleString()}`;
        chipBadge.className = 'badge badge-warning';
      } else {
        chipBadge.textContent = '匿名訪客';
        chipBadge.className = 'badge badge-info';
      }
    }
  });

  // Open Auth Modal
  document.getElementById('btn-player-profile')?.addEventListener('click', () => {
    showAuthModal();
  });

  // Chat Form Submission
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-text');
      if (input && input.value.trim()) {
        const author = getPlayerName();
        const result = await sendGlobalChatMessage(author, input.value);
        if (result && !result.success) {
          showToast(result.reason, 'warning');
        } else {
          input.value = '';
        }
      }
    });
  }

  // Category Filter Pills Listener
  const filterPills = document.querySelectorAll('#home-filter-pills .filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const selectedFilter = pill.getAttribute('data-filter');
      
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const gameCards = document.querySelectorAll('#home-games-grid .game-card');
      let visibleCount = 0;

      gameCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (selectedFilter === 'all' || category === selectedFilter) {
          card.style.display = 'flex';
          card.classList.remove('filter-hidden');
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.classList.add('filter-hidden');
        }
      });

      const countEl = document.getElementById('filter-count');
      if (countEl) {
        countEl.textContent = selectedFilter === 'all' ? `共 ${visibleCount} 款遊戲` : `已篩選 ${visibleCount} 款遊戲`;
      }
    });
  });

  // Event handlers
  document.getElementById('btn-pwa-guide')?.addEventListener('click', () => navigate('/pwa-guide'));
  document.getElementById('btn-xiangqi-ai')?.addEventListener('click', () => navigate('/xiangqi/ai'));
  document.getElementById('btn-xiangqi-online')?.addEventListener('click', () => navigate('/xiangqi/online'));
  document.getElementById('btn-tetris-ai')?.addEventListener('click', () => navigate('/tetris/ai'));
  document.getElementById('btn-tetris-online')?.addEventListener('click', () => navigate('/tetris/online'));
  document.getElementById('btn-poker-ai')?.addEventListener('click', () => navigate('/poker/ai'));
  document.getElementById('btn-poker-online')?.addEventListener('click', () => navigate('/poker/online'));

  // Initialize storage badge
  try {
    await storage.init();
    const badge = document.getElementById('storage-badge');
    if (badge) {
      badge.innerHTML = `<span class="badge badge-success">${SVG_ICONS.storage} 本機存檔已就緒</span>`;
    }
  } catch (e) {
    console.warn('Storage init failed:', e);
  }

  return () => {
    if (unsubRooms) unsubRooms();
    if (unsubChat) unsubChat();
  };
}
