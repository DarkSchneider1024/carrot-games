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
import { initAuth, getUserProfile, getCurrentUser } from '../../network/auth-manager.js';
import { showAuthModal } from '../../components/auth-modal.js';

export async function renderHome(container) {
  let unsubRooms = null;
  let unsubChat = null;

  const user = getCurrentUser();
  const currentProfile = getUserProfile();
  const isLoggedUser = !!(user && !user.isAnonymous);
  const initialName = currentProfile?.displayName || user?.displayName || getPlayerName() || '匿名訪客';
  const initialChipsText = isLoggedUser ? `$${(currentProfile?.chips !== undefined ? currentProfile.chips : 1000).toLocaleString()}` : '匿名訪客';
  const initialBadgeClass = isLoggedUser ? 'badge-warning' : 'badge-info';

  container.innerHTML = `
    <div class="home">
      <!-- Background Cyber Grid -->
      <div class="home-grid-bg"></div>

      <!-- Header -->
      <header class="home-header animate-fade-in-down">
        <div class="home-logo">
          <img src="./assets/images/logo_carrot.png" alt="Carrot Logo" class="home-logo-img" />
          <div>
            <h1 class="home-title">CARROT <span class="accent-text">GAMES</span></h1>
            <p class="home-subtitle">線上休閒對戰遊戲大廳</p>
          </div>
        </div>

        <!-- 🖥️ 桌面 lativ 極簡風格導覽列 (Lativ Minimalist Style Desktop Nav Menu) -->
        <div class="home-header-actions desktop-nav-menu lativ-style-nav">
          <button class="lativ-nav-btn" id="btn-game-guide">
            遊戲玩法說明
          </button>
          
          <span class="lativ-divider">|</span>

          <button class="lativ-nav-btn" id="btn-pwa-guide">
            ${SVG_ICONS.smartphone} 手機安裝指南
          </button>

          <span class="lativ-divider">|</span>

          <div class="lativ-nav-badge" id="storage-badge">
            ${SVG_ICONS.storage} 存檔準備中...
          </div>

          <span class="lativ-divider">|</span>

          <div class="lativ-auth-box">
            ${isLoggedUser ? `
              <button class="lativ-nav-btn pill-user" id="btn-player-profile" title="點擊開啟帳號與戰績管理">
                ${SVG_ICONS.user} <span id="display-player-name">${initialName}</span>
                <span class="pill-badge warning" id="display-user-chips">${initialChipsText}</span>
              </button>
            ` : `
              <button class="lativ-nav-btn pill-gradient" id="btn-auth-login">
                ${SVG_ICONS.user} 登入 / 註冊
              </button>
              <div class="lativ-nav-badge pill-guest-badge" id="guest-info-badge" title="當前模式：訪客 (不可點擊)">
                ${SVG_ICONS.user} <span id="display-player-name">${initialName}</span>
                <span class="pill-badge info" id="display-user-chips">訪客</span>
              </div>
            `}
          </div>
        </div>

        <!-- 🍔 響應式 / 手機端 漢堡選單觸發鈕 (Mobile Hamburger Menu Toggle Button) -->
        <button class="mobile-menu-toggle-btn" id="btn-toggle-menu" aria-label="開啟選單">
          ${SVG_ICONS.menu}
        </button>
      </header>

      <!-- 📱 Nike 風格右側側滑 Offcanvas 抽屜選單 (Right Side Drawer Menu) -->
      <div class="nav-drawer-backdrop" id="nav-drawer-backdrop"></div>
      <aside class="nav-drawer" id="nav-drawer">
        <div class="nav-drawer-header">
          <div class="nav-drawer-brand">
            <img src="./assets/images/logo_carrot.png" alt="Logo" class="nav-drawer-logo" />
            <span class="nav-drawer-title">功能選單</span>
          </div>
          <button class="nav-drawer-close" id="btn-close-drawer" aria-label="關閉選單">
            ${SVG_ICONS.close}
          </button>
        </div>

        <div class="nav-drawer-body">
          <!-- 帳號 / 登入卡片 -->
          <div class="drawer-user-card" id="drawer-user-card">
            <div class="drawer-avatar">
              ${SVG_ICONS.user}
            </div>
            <div class="drawer-user-info">
              <strong id="drawer-display-name">${initialName}</strong>
              <span id="drawer-display-chips" class="badge ${initialBadgeClass}" style="margin-top:2px;display:inline-block;">
                ${initialChipsText}
              </span>
            </div>
          </div>

          <!-- 功能選單列表 -->
          <div class="drawer-menu-list">
            <button class="drawer-menu-item" id="drawer-btn-auth-login">
              <span class="drawer-item-icon">${SVG_ICONS.user}</span>
              <div class="drawer-item-text">
                <strong>帳號登入 / 註冊</strong>
                <small>開戶即贈 $1,000 本金紀錄</small>
              </div>
              <span class="drawer-chevron">›</span>
            </button>

            <button class="drawer-menu-item" id="drawer-btn-profile">
              <span class="drawer-item-icon">${SVG_ICONS.user}</span>
              <div class="drawer-item-text">
                <strong>帳號與戰績管理</strong>
                <small>查看對戰勝率與籌碼本金</small>
              </div>
              <span class="drawer-chevron">›</span>
            </button>

            <button class="drawer-menu-item" id="drawer-btn-game-guide">
              <span class="drawer-item-icon" style="color:#ea580c;">📖</span>
              <div class="drawer-item-text">
                <strong>遊戲玩法說明全書</strong>
                <small>3D 角色技能與寶箱說明</small>
              </div>
              <span class="drawer-chevron">›</span>
            </button>

            <button class="drawer-menu-item" id="drawer-btn-pwa-guide">
              <span class="drawer-item-icon">${SVG_ICONS.smartphone}</span>
              <div class="drawer-item-text">
                <strong>手機 App 安裝指南</strong>
                <small>體驗無邊框全螢幕與極速載入</small>
              </div>
              <span class="drawer-chevron">›</span>
            </button>
          </div>

          <div class="drawer-footer">
            <div id="drawer-storage-badge">
              <span class="badge badge-info">${SVG_ICONS.storage} 存檔準備中...</span>
            </div>
            <p class="drawer-footer-copyright">CARROT GAMES © 2026</p>
          </div>
        </div>
      </aside>

      <!-- Hero Section -->
      <section class="home-hero animate-fade-in-up">
        <div class="hero-tagline">
          <span class="badge badge-warning">免下載 點擊即玩</span>
        </div>
        <h2 class="home-hero-title">
          蘿蔔大亂鬥 <span class="gradient-text">隨時開戰</span>
        </h2>
        <p class="home-hero-desc">
          無需安裝任何 App，開啟網頁即可享受流暢對戰、智慧 AI 陪練與好友跨平台連線！
        </p>
      </section>

      <!-- Category Filter Section -->
      <div class="home-filter-section animate-fade-in-up">
        <div class="home-filter-title">
          <span>遊戲庫分類</span>
          <span class="home-filter-count" id="filter-count">共 5 款遊戲</span>
        </div>
        <div class="home-filter-pills" id="home-filter-pills">
          <button class="filter-pill active" data-filter="all">全部遊戲</button>
          <button class="filter-pill" data-filter="board">🎴 棋牌對戰</button>
          <button class="filter-pill" data-filter="strategy">⚔️ 戰略遊戲</button>
          <button class="filter-pill" data-filter="party">🥳 派對遊戲</button>
          <button class="filter-pill" data-filter="mahjong">🀄 麻將</button>
        </div>
      </div>

      <!-- Games Showcase Grid -->
      <section class="home-games" id="home-games-grid">
        <!-- Taiwan Mahjong 16 Card -->
        <div class="game-card animate-fade-in-up stagger-1" id="card-mahjong" data-category="board mahjong">
          <div class="game-card-banner">
            <img src="./assets/images/icon_fruit_havoc.png" alt="台灣16張麻將" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">棋牌 / 麻將</span>
            <span class="badge badge-warning game-card-status" style="background:linear-gradient(135deg,#10b981,#047857);color:#fff;">傳統重磅</span>
          </div>
          <div class="game-card-content">
            <h3>台灣 16 張麻將 (TAIWAN MAHJONG)</h3>
            <p>傳統十六張正宗麻將！具備智慧 AI 聽牌提示、吃碰槓與經典台數計算。</p>
            
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} 正宗16張</span>
              <span class="tag">${SVG_ICONS.globe} 聽牌分析提示</span>
              <span class="tag">${SVG_ICONS.storage} 台數自動計分</span>
            </div>

            <div class="game-card-actions">
              <button class="btn btn-primary" id="btn-mahjong-ai">
                ${SVG_ICONS.bot} 開局對戰 AI
              </button>
              <button class="btn btn-cyan" id="btn-mahjong-online">
                ${SVG_ICONS.globe} 線上開房
              </button>
            </div>
          </div>
        </div>

        <!-- Chinese Chess Card -->
        <div class="game-card animate-fade-in-up stagger-2" id="card-xiangqi" data-category="board">
          <div class="game-card-banner">
            <img src="./assets/images/icon_xiangqi.png" alt="中國象棋" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">棋牌對戰</span>
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
        <div class="game-card animate-fade-in-up stagger-3" id="card-tetris" data-category="party">
          <div class="game-card-banner">
            <img src="./assets/images/icon_gomoku.png" alt="俄羅斯方塊對戰" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">派對遊戲</span>
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
        <div class="game-card animate-fade-in-up stagger-4" id="card-poker" data-category="board">
          <div class="game-card-banner">
            <img src="./assets/images/icon_poker.png" alt="德州撲克" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">棋牌對戰</span>
            <span class="badge badge-success game-card-status">熱門推薦</span>
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

        <!-- Magic Fighter Card -->
        <div class="game-card animate-fade-in-up stagger-5" id="card-magic-fighter" data-category="strategy">
          <div class="game-card-banner">
            <img src="./assets/images/icon_magic_fighter.png" alt="魔法對戰" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">戰略遊戲</span>
            <span class="badge badge-warning game-card-status">3D上市</span>
          </div>
          <div class="game-card-content">
            <h3>魔法對戰 (MAGIC FIGHTER)</h3>
            <p>傳承經典《坦克大戰》靈魂！重塑為魔法戰機空戰對決，保護蘿蔔水晶基地！</p>
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.cpu} 36關卡進程</span>
              <span class="tag">${SVG_ICONS.globe} 火龍Boss戰</span>
              <span class="tag">${SVG_ICONS.smartphone} 魔法道具升級</span>
            </div>

            <div class="game-card-actions">
              <button class="btn btn-primary" id="btn-magic-fighter-ai">
                ${SVG_ICONS.bot} 對戰 AI
              </button>
              <button class="btn btn-cyan" id="btn-magic-fighter-online">
                ${SVG_ICONS.globe} 連線開房
              </button>
            </div>
          </div>
        </div>

        <!-- Fruit Havoc Card -->
        <div class="game-card animate-fade-in-up stagger-6" id="card-fruit-havoc" data-category="party">
          <div class="game-card-banner">
            <img src="./assets/images/icon_fruit_havoc.png" alt="水果極限闖關" class="game-card-img" />
            <div class="game-card-overlay"></div>
            <span class="badge badge-category">派對遊戲</span>
            <span class="badge badge-warning game-card-status" style="background:linear-gradient(135deg,#ff7544,#ff70a6);color:#fff;">全新派對</span>
          </div>
          <div class="game-card-content">
            <h3>水果極限闖關 (FRUIT EXTREME)</h3>
            <p>類似《超級雞馬》的派對平台對戰！支援單機同屏輪流擺放 20 種陷阱道具，闖過重重危險衝向終點！</p>
            <div class="game-card-tags">
              <span class="tag">${SVG_ICONS.user} 單機同屏對戰</span>
              <span class="tag">${SVG_ICONS.globe} 20種陷阱道具</span>
              <span class="tag">${SVG_ICONS.smartphone} 5位水果角色</span>
            </div>

            <div class="game-card-actions">
              <button class="btn btn-primary" id="btn-fruit-havoc-local">
                ${SVG_ICONS.user} 單機同屏
              </button>
              <button class="btn btn-cyan" id="btn-fruit-havoc-online">
                ${SVG_ICONS.globe} 線上對戰
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
              全球線上房間大廳 <span class="badge badge-success" style="font-size:11px;">即時連線</span>
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
            <h4 class="chat-title">大廳玩家頻道</h4>
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
          <span>目前尚無開放中的房間</span>
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

  // 📱 Offcanvas Drawer Menu Control (Nike Style Slide-over)
  const backdrop = document.getElementById('nav-drawer-backdrop');
  const drawer = document.getElementById('nav-drawer');

  const openNavDrawer = () => {
    backdrop?.classList.add('active');
    drawer?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeNavDrawer = () => {
    backdrop?.classList.remove('active');
    drawer?.classList.remove('active');
    document.body.style.overflow = '';
  };

  document.getElementById('btn-toggle-menu')?.addEventListener('click', openNavDrawer);
  document.getElementById('btn-close-drawer')?.addEventListener('click', closeNavDrawer);
  backdrop?.addEventListener('click', closeNavDrawer);

  // Init Auth System & Subscribe Profile UI Changes
  const updateHeaderUI = (user, profile) => {
    const displayEl = document.getElementById('display-player-name');
    const chipBadge = document.getElementById('display-user-chips');
    const authLoginBtn = document.getElementById('btn-auth-login');

    const drawerNameEl = document.getElementById('drawer-display-name');
    const drawerChipsEl = document.getElementById('drawer-display-chips');
    const drawerAuthLoginBtn = document.getElementById('drawer-btn-auth-login');

    const activeUser = user || getCurrentUser();
    const activeProfile = profile || getUserProfile();
    const isLogged = !!(activeUser && !activeUser.isAnonymous);
    const nameText = activeProfile?.displayName || activeUser?.displayName || getPlayerName() || '匿名訪客';

    if (displayEl) displayEl.textContent = nameText;
    if (drawerNameEl) drawerNameEl.textContent = nameText;

    if (isLogged) {
      const chips = activeProfile?.chips !== undefined ? activeProfile.chips : 1000;
      const chipsText = `$${chips.toLocaleString()}`;
      if (chipBadge) {
        chipBadge.textContent = chipsText;
        chipBadge.className = 'badge badge-warning';
      }
      if (drawerChipsEl) {
        drawerChipsEl.textContent = chipsText;
        drawerChipsEl.className = 'badge badge-warning';
      }
    } else {
      if (chipBadge) {
        chipBadge.textContent = '訪客';
        chipBadge.className = 'badge badge-info';
      }
      if (drawerChipsEl) {
        drawerChipsEl.textContent = '訪客模式';
        drawerChipsEl.className = 'badge badge-info';
      }
    }

    // Hide the Login/Register CTA button after user logs in
    if (authLoginBtn) authLoginBtn.style.display = isLogged ? 'none' : '';
    if (drawerAuthLoginBtn) drawerAuthLoginBtn.style.display = isLogged ? 'none' : '';
  };

  initAuth(updateHeaderUI);
  updateHeaderUI(getCurrentUser(), getUserProfile());

  // Desktop & Mobile Drawer Button Event Listeners
  const handleProfileModal = () => {
    closeNavDrawer();
    const user = getCurrentUser();
    // 只有當用戶是正式登入會員時，點擊身分頭像才開啟個人檔案與戰績管理 Modal
    if (user && !user.isAnonymous) {
      showAuthModal();
    }
  };

  const handleLoginModal = () => {
    closeNavDrawer();
    showAuthModal();
  };

  document.getElementById('btn-player-profile')?.addEventListener('click', handleProfileModal);
  document.getElementById('btn-auth-login')?.addEventListener('click', handleLoginModal);
  document.getElementById('drawer-btn-auth-login')?.addEventListener('click', handleLoginModal);
  document.getElementById('drawer-btn-profile')?.addEventListener('click', handleProfileModal);

  document.getElementById('btn-game-guide')?.addEventListener('click', () => {
    closeNavDrawer();
    navigate('/guide');
  });
  document.getElementById('drawer-btn-game-guide')?.addEventListener('click', () => {
    closeNavDrawer();
    navigate('/guide');
  });

  document.getElementById('btn-pwa-guide')?.addEventListener('click', () => {
    closeNavDrawer();
    navigate('/pwa-guide');
  });
  document.getElementById('drawer-btn-pwa-guide')?.addEventListener('click', () => {
    closeNavDrawer();
    navigate('/pwa-guide');
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
        const category = card.getAttribute('data-category') || '';
        if (selectedFilter === 'all' || category.includes(selectedFilter)) {
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
  document.getElementById('btn-mahjong-ai')?.addEventListener('click', () => navigate('/mahjong/ai'));
  document.getElementById('btn-mahjong-online')?.addEventListener('click', () => navigate('/mahjong/online'));
  document.getElementById('btn-xiangqi-ai')?.addEventListener('click', () => navigate('/xiangqi/ai'));
  document.getElementById('btn-xiangqi-online')?.addEventListener('click', () => navigate('/xiangqi/online'));
  document.getElementById('btn-tetris-ai')?.addEventListener('click', () => navigate('/tetris/ai'));
  document.getElementById('btn-tetris-online')?.addEventListener('click', () => navigate('/tetris/online'));
  document.getElementById('btn-poker-ai')?.addEventListener('click', () => navigate('/poker/ai'));
  document.getElementById('btn-poker-online')?.addEventListener('click', () => navigate('/poker/online'));
  document.getElementById('btn-magic-fighter-ai')?.addEventListener('click', () => navigate('/magic-fighter/ai'));
  document.getElementById('btn-magic-fighter-online')?.addEventListener('click', () => navigate('/magic-fighter/online'));
  document.getElementById('btn-fruit-havoc-local')?.addEventListener('click', () => navigate('/fruit-havoc/local'));
  document.getElementById('btn-fruit-havoc-online')?.addEventListener('click', () => navigate('/fruit-havoc/online'));

  // Initialize storage badge
  try {
    await storage.init();
    const badge = document.getElementById('storage-badge');
    const drawerBadge = document.getElementById('drawer-storage-badge');
    if (badge) badge.innerHTML = `${SVG_ICONS.storage} 本機存檔已就緒`;
    if (drawerBadge) drawerBadge.innerHTML = `<span class="badge badge-success">${SVG_ICONS.storage} 本機存檔已就緒</span>`;
  } catch (e) {
    console.warn('Storage init failed:', e);
  }

  return () => {
    if (unsubRooms) unsubRooms();
    if (unsubChat) unsubChat();
  };
}
