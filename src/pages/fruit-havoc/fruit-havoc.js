/**
 * Fruit Havoc Page — 2.5D Storybook Platformer (半3D 繪本冒險派對)
 * Features Player Character Selection System (玩家自由挑選 5 大水果角色), HD Sprite Rendering, & Random AI Video Celebrations.
 */

import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import {
  initFruitPeer,
  sendTrapPlacement,
  sendMovementState,
  closeFruitPeer
} from '../../network/fruit-peer-manager.js';

export async function renderFruitHavoc(container, params = {}) {
  const mode = params.mode || 'local'; // 'local' or 'online'

  const FRUIT_CHARACTERS = [
    { id: 'strawberry', name: '草莓吉伊', icon: '🍓', img: './assets/images/char_strawberry_berry.png', trait: '速度型 (靈活移動)', speed: 5.2, jump: -12.5, color: '#ef4444' },
    { id: 'banana', name: '香蕉烏薩奇', icon: '🍌', img: './assets/images/char_banana_usagi.png', trait: '高跳型 (超強跳躍)', speed: 4.6, jump: -14.2, color: '#eab308' },
    { id: 'melon', name: '哈密瓜小八', icon: '🍈', img: './assets/images/char_melon_hachi.png', trait: '均衡型 (穩健控球)', speed: 4.8, jump: -13.0, color: '#22c55e' },
    { id: 'peach', name: '水桃栗饅頭', icon: '🍑', img: './assets/images/char_peach_kuriman.png', trait: '重裝型 (抗推霸體)', speed: 4.2, jump: -12.0, color: '#f97316' },
    { id: 'grape', name: '飛天葡萄飛鼠', icon: '🍇', img: './assets/images/char_grape_momonga.png', trait: '滑翔型 (空中滯空)', speed: 5.6, jump: -13.5, color: '#a855f7' }
  ];

  // Preload Character 2.5D HD Sprites
  const charSpriteImages = {};
  FRUIT_CHARACTERS.forEach(c => {
    const img = new Image();
    img.src = c.img;
    charSpriteImages[c.id] = img;
  });

  const TRAP_ITEMS = [
    { id: 1, name: '彈簧拳擊手套', icon: '🥊', desc: '向前猛力彈出擊飛玩家' },
    { id: 2, name: '草莓電鋸擺錘', icon: '🪚', desc: '半空來回擺動的切割刀' },
    { id: 3, name: '香蕉皮滑行區', icon: '🍌', desc: '踩中失控向前滑行' },
    { id: 4, name: '蜂蜜黏黏膠', icon: '🍯', desc: '踩中移動速度 -70%' },
    { id: 5, name: '西瓜大砲', icon: '💣', desc: '定時發射重型西瓜砲彈' },
    { id: 6, name: '龍捲風漩渦', icon: '🌪️', desc: '高空向上強勁風場吹升' },
    { id: 7, name: '葡萄十字弩', icon: '🏹', desc: '感應式連環葡萄箭矢' },
    { id: 8, name: '仙人掌刺球', icon: '🌵', desc: '滾動刺球觸碰即陣亡' },
    { id: 9, name: '超高跳跳菇', icon: '🍄', desc: '踩中向上猛烈彈飛跳躍' },
    { id: 10, name: '雷電檸檬', icon: '⚡', desc: '釋放 360 度麻痺電流' },
    { id: 11, name: '奇異果傳送門', icon: '🌀', desc: '入口與出口瞬間轉移' },
    { id: 12, name: '冰棒極速檔板', icon: '🧊', desc: '光滑冰面牆阻擋或滑行' },
    { id: 13, name: '黑洞塌陷箱', icon: '🕳️', desc: '踩上去 0.5 秒後破裂' },
    { id: 14, name: '強風大風扇', icon: '扇', desc: '持續強風干擾跳躍軌跡' },
    { id: 15, name: '櫻桃雷射炮塔', icon: '🍒', desc: '旋轉掃射紅外能量極光' },
    { id: 16, name: '飄飄熱氣球', icon: '🎈', desc: '停留過久會下沉的浮台' },
    { id: 17, name: '椰子防禦盾', icon: '🛡️', desc: '阻擋弩箭與砲彈的壁壘' },
    { id: 18, name: '蘋果極性磁鐵', icon: '🧲', desc: '強烈吸引或排斥玩家' },
    { id: 19, name: '履帶跑道', icon: '🏃', desc: '滾動傳送帶加速或阻退' },
    { id: 20, name: '拆除大炸彈', icon: '💥', desc: '拖放至已有陷阱可炸毀拆除' }
  ];

  // Match Configuration
  let maxRounds = 8;
  let currentRound = 1;
  let targetScore = 10;
  let playerCount = 2; // 2P default
  let selectedPlayerIdx = 0; // 當前正在編輯/挑選角色的玩家

  // Player Objects Array
  let players = [
    { id: 1, char: FRUIT_CHARACTERS[0], name: '玩家 1', x: 100, y: 360, vx: 0, vy: 0, facing: 'right', isGrounded: true, isDead: false, reached: false, score: 0, prevScore: 0, finishRank: 0 },
    { id: 2, char: FRUIT_CHARACTERS[1], name: '玩家 2', x: 130, y: 360, vx: 0, vy: 0, facing: 'right', isGrounded: true, isDead: false, reached: false, score: 0, prevScore: 0, finishRank: 0 }
  ];

  let activePlacementPlayerIdx = 0;
  let selectedTrap = TRAP_ITEMS[0];
  let placedTraps = [
    { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 7, placedBy: 1 },
    { id: 2, trap: TRAP_ITEMS[8], gridX: 9, gridY: 8, placedBy: 2 }
  ];
  let hoverGrid = null;

  // 4 Scenes State: 1 = 'BUILD', 2 = 'RACE', 3 = 'SCORE', 4 = 'VICTORY'
  let currentScene = 1;
  let animFrameId = null;
  let isPeerConnected = false;
  let winnerPlayer = null;

  // Key Input States
  const keysState = {
    p1Left: false, p1Right: false, p1Jump: false,
    p2Left: false, p2Right: false, p2Jump: false
  };

  // 2.5D Platforms (800x480 resolution)
  const PLATFORMS = [
    { x: 50, y: 400, w: 200, h: 50 },   // 起點大台
    { x: 300, y: 320, w: 150, h: 30 },  // 中間跳板
    { x: 550, y: 220, w: 200, h: 50 }   // 終點大台
  ];

  container.innerHTML = `
    <div class="fruit-havoc-page animate-fade-in">
      <!-- Topbar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">🍓 水果傷害 (FRUIT HAVOC)</span>
            <span class="badge badge-warning" id="scene-badge">1. 布置場地</span>
          </div>
        </div>
        <div class="topbar-actions" style="display:flex;gap:8px;">
          <select id="select-player-count" style="padding:4px 8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg-card);font-size:0.85rem;">
            <option value="2" ${playerCount === 2 ? 'selected' : ''}>2 人對戰</option>
            <option value="3" ${playerCount === 3 ? 'selected' : ''}>3 人對戰</option>
            <option value="4" ${playerCount === 4 ? 'selected' : ''}>4 人對戰</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="遊戲說明">
            📖 規則說明
          </button>
        </div>
      </div>

      ${mode === 'online' ? `
        <!-- WebRTC PeerJS Room Bar -->
        <div class="peer-room-bar glass" style="padding:10px 16px;border-radius:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--color-bg-card);">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="btn btn-primary btn-sm" id="btn-create-room" style="background:linear-gradient(135deg,#0284c7,#38bdf8);border:none;">
              🏠 創建房間
            </button>
            <div style="display:flex;align-items:center;gap:6px;">
              <input type="text" id="input-room-code" placeholder="輸入4位對戰碼" style="width:120px;padding:5px 10px;border-radius:8px;border:1px solid var(--color-border);font-size:0.85rem;" />
              <button class="btn btn-cyan btn-sm" id="btn-join-room">
                🔗 加入連線
              </button>
            </div>
          </div>
          <div id="peer-status-bar" style="font-size:0.85rem;font-weight:600;color:var(--color-text-secondary);">
            ⚪ 未連線 (請創建或輸入房間號)
          </div>
        </div>
      ` : ''}

      <!-- Top Scoreboard Bar -->
      <div class="scoreboard-bar glass" style="padding:10px 16px;border-radius:14px;background:var(--color-bg-card);display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="badge badge-info" id="round-counter-tag">第 ${currentRound} / ${maxRounds} 輪</span>
          <span style="font-size:0.85rem;color:var(--color-text-secondary);font-weight:600;">目標分數：${targetScore} 分</span>
        </div>
        <div class="player-scores-grid" id="player-scores-grid" style="display:flex;gap:16px;">
          ${players.map(p => `
            <div class="player-score-item" style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:1.2rem;">${p.char.icon}</span>
              <span style="font-weight:700;font-size:0.88rem;color:${p.char.color};">${p.name}: <strong>${p.score} 分</strong></span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Main Game Content Wrapper -->
      <div class="fruit-havoc-main" id="fruit-havoc-main-box">
        <!-- 1. 場景 1 的左側選單 -->
        <aside class="fruit-panel-left" id="panel-left-sidebar">
          <div class="panel-card glass" style="background:#fff7ed;border-color:#fdba74;">
            <h4 class="panel-title" style="color:#ea580c;" id="turn-title">
              👉 當前擺放：${players[activePlacementPlayerIdx]?.char.icon} ${players[activePlacementPlayerIdx]?.name}
            </h4>
            <p style="font-size:0.8rem;color:#c2410c;margin:4px 0 0 0;" id="turn-desc">
              請從下方拖拉 1 個陷阱放置在地圖網格！
            </p>
          </div>

          <!-- 🎨 玩家自由自訂選擇角色面板 (Player Character Selector) -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">1. 選擇玩家角色</h4>
              <!-- 切換編輯哪位玩家 -->
              <div class="player-selector-tabs" id="player-tabs-box" style="display:flex;gap:4px;">
                ${players.map((p, idx) => `
                  <button class="btn btn-xs ${idx === selectedPlayerIdx ? 'btn-primary' : 'btn-ghost'}" data-pidx="${idx}">
                    ${p.char.icon} P${p.id}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- 5 大水果角色選擇按鈕 -->
            <div class="char-selector-grid" id="char-selector-grid">
              ${FRUIT_CHARACTERS.map(c => `
                <div class="char-select-item ${c.id === players[selectedPlayerIdx]?.char.id ? 'active' : ''}" data-char-id="${c.id}">
                  <img src="${c.img}" alt="${c.name}" class="char-select-img" />
                  <span class="char-select-name">${c.name}</span>
                </div>
              `).join('')}
            </div>

            <div class="char-details-box" id="char-details-box">
              <strong id="cdetail-name">${players[selectedPlayerIdx]?.char.name}</strong>
              <p id="cdetail-trait" style="font-size:0.8rem;color:#ea580c;margin:2px 0 6px 0;">${players[selectedPlayerIdx]?.char.trait}</p>
              <div class="stat-bar"><span id="cdetail-bar" style="width:${(players[selectedPlayerIdx]?.char.speed || 5) * 15}%;"></span></div>
            </div>
          </div>

          <!-- Draggable Trap Selector -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">2. 擺放/拆除陷阱 (20種)</h4>
              <span class="badge badge-warning" style="font-size:0.7rem;">拖放/點擊放置 ✋</span>
            </div>
            <div class="trap-selector-grid">
              ${TRAP_ITEMS.map(t => `
                <div class="trap-select-item ${t.id === selectedTrap.id ? 'active' : ''}" 
                     draggable="true" 
                     data-trap-id="${t.id}" 
                     title="${t.name}: ${t.desc}">
                  <span class="trap-icon">${t.icon}</span>
                  <span class="trap-name">${t.name}</span>
                  <span class="drag-handle-hint">⋮⋮</span>
                </div>
              `).join('')}
            </div>
          </div>
        </aside>

        <!-- 主要 2.5D 冒險舞台區域 -->
        <main class="fruit-stage-area glass">
          <div class="stage-header" style="width:100%;max-width:800px;">
            <span class="stage-tip" id="stage-tip">🖐️ 請 ${players[activePlacementPlayerIdx]?.name} 選擇道具拖放至地圖！</span>
          </div>

          <!-- 2.5D HD Stage Canvas Wrapper (800x480) -->
          <div class="canvas-wrapper" id="canvas-wrapper-box" style="display:block;">
            <canvas id="fruit-canvas" width="800" height="480"></canvas>

            <!-- 場景 1 推進按鈕 Overlay -->
            <div class="canvas-overlay-ui" id="canvas-overlay-ui">
              <button class="btn btn-primary btn-lg" id="btn-build-finish" style="background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;box-shadow:0 4px 16px rgba(255,117,68,0.4);">
                🚀 布置完成！開始 2. 開始玩場地競速
              </button>
            </div>
          </div>

          <!-- 外置瑪利歐觸控按鍵 -->
          <div class="mobile-touch-controls-bar" id="mobile-touch-controls" style="display:none;">
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="color:#ff7544;font-size:0.85rem;font-weight:700;">🍓 P1:</span>
              <button class="dpad-btn" id="tbtn-p1-left">⬅️</button>
              <button class="dpad-btn" id="tbtn-p1-right">➡️</button>
              <button class="jump-btn" id="tbtn-p1-jump">🦘 跳躍</button>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="color:#38bdf8;font-size:0.85rem;font-weight:700;">🍌 P2:</span>
              <button class="dpad-btn" id="tbtn-p2-left">⬅️</button>
              <button class="dpad-btn" id="tbtn-p2-right">➡️</button>
              <button class="jump-btn" id="tbtn-p2-jump" style="background:linear-gradient(135deg,#0284c7,#38bdf8);">🦘 跳躍</button>
            </div>
          </div>

          <!-- 3. 場景 3: 記分場景 UI -->
          <div class="scene-container" id="scene-score" style="display:none;padding:24px;flex-direction:column;gap:20px;align-items:center;justify-content:center;min-height:480px;width:100%;">
            <div style="text-align:center;">
              <h3 style="font-size:1.6rem;color:var(--color-text-primary);margin:0;">📊 第 ${currentRound} 輪比賽分數結算</h3>
              <p style="color:var(--color-text-secondary);font-size:0.9rem;margin:4px 0 0 0;" id="score-summary-reason">黃金結算結果展報...</p>
            </div>

            <div class="animated-score-bars" id="animated-score-bars" style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:14px;">
              <!-- 插入動態計分條 -->
            </div>

            <button class="btn btn-primary btn-lg" id="btn-score-next" style="background:linear-gradient(135deg,#0284c7,#38bdf8);border:none;padding:12px 32px;font-size:1.05rem;">
              ➡️ 進入下一輪：1. 布置場地
            </button>
          </div>

          <!-- 4. 場景 4: 獲勝影片場景 -->
          <div class="scene-container" id="scene-victory" style="display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:480px;text-align:center;width:100%;">
            <h2 style="font-size:2rem;margin:0;color:#ea580c;text-shadow:0 2px 10px rgba(234,88,12,0.2);" id="victory-title-text">
              👑 恭喜獲得總冠軍！
            </h2>
            <div style="position:relative;width:560px;height:315px;border-radius:20px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.3);border:3px solid #fdba74;background:#000;">
              <video id="victory-video-player" width="560" height="315" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
            </div>
            <p style="font-size:1.15rem;font-weight:700;color:var(--color-text-primary);" id="victory-winner-desc">水果大師強勢登頂！</p>
            <button class="btn btn-primary btn-lg" id="btn-victory-restart" style="background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;padding:12px 36px;font-size:1.1rem;">
              🔄 重新開始全場比賽
            </button>
          </div>
        </main>
      </div>
    </div>
  `;

  // Navigation Listeners
  container.querySelector('#btn-back')?.addEventListener('click', () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    _removeKeyListeners();
    navigate('/');
  });
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('/guide?game=fruitHavoc'));

  // Player Count Selector
  container.querySelector('#select-player-count')?.addEventListener('change', (e) => {
    playerCount = parseInt(e.target.value, 10);
    _reinitPlayers();
    _updateScoreboardUI();
    _renderPlayerCharacterSelectorUI();
    showToast(`對戰人數已調整為 ${playerCount} 人！`, 'info');
  });

  function _reinitPlayers() {
    players = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: i + 1,
        char: FRUIT_CHARACTERS[i % FRUIT_CHARACTERS.length],
        name: `玩家 ${i + 1}`,
        x: 100 + i * 30,
        y: 360,
        vx: 0,
        vy: 0,
        facing: 'right',
        isGrounded: true,
        isDead: false,
        reached: false,
        score: 0,
        prevScore: 0,
        finishRank: 0
      });
    }
  }

  function _updateScoreboardUI() {
    const grid = container.querySelector('#player-scores-grid');
    if (grid) {
      grid.innerHTML = players.map(p => `
        <div class="player-score-item" style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:1.2rem;">${p.char.icon}</span>
          <span style="font-weight:700;font-size:0.88rem;color:${p.char.color};">${p.name}: <strong>${p.score} 分</strong></span>
        </div>
      `).join('');
    }
  }

  function _updateTurnUI() {
    const turnTitle = container.querySelector('#turn-title');
    const turnDesc = container.querySelector('#turn-desc');
    const tipEl = container.querySelector('#stage-tip');
    const activeP = players[activePlacementPlayerIdx];

    if (activeP) {
      if (turnTitle) turnTitle.textContent = `👉 當前擺放：${activeP.char.icon} ${activeP.name}`;
      if (turnDesc) turnDesc.textContent = `請從下方拖拉 1 個陷阱放置在地圖網格！`;
      if (tipEl) tipEl.textContent = `🖐️ 請 ${activeP.name} 選擇道具拖放至地圖！`;
    }
  }

  // ----------------------------------------------------
  // 🎮 玩家自訂角色切換與介面更新 (Player Character Selector Logic)
  // ----------------------------------------------------
  function _renderPlayerCharacterSelectorUI() {
    const tabsBox = container.querySelector('#player-tabs-box');
    const gridBox = container.querySelector('#char-selector-grid');
    const curP = players[selectedPlayerIdx] || players[0];

    if (tabsBox) {
      tabsBox.innerHTML = players.map((p, idx) => `
        <button class="btn btn-xs ${idx === selectedPlayerIdx ? 'btn-primary' : 'btn-ghost'}" data-pidx="${idx}">
          ${p.char.icon} P${p.id}
        </button>
      `).join('');

      tabsBox.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedPlayerIdx = parseInt(btn.dataset.pidx, 10);
          _renderPlayerCharacterSelectorUI();
        });
      });
    }

    if (gridBox) {
      gridBox.innerHTML = FRUIT_CHARACTERS.map(c => `
        <div class="char-select-item ${c.id === curP.char.id ? 'active' : ''}" data-char-id="${c.id}">
          <img src="${c.img}" alt="${c.name}" class="char-select-img" />
          <span class="char-select-name">${c.name}</span>
        </div>
      `).join('');

      gridBox.querySelectorAll('.char-select-item').forEach(item => {
        item.addEventListener('click', () => {
          const charId = item.dataset.charId;
          const chosenChar = FRUIT_CHARACTERS.find(c => c.id === charId);
          if (chosenChar) {
            curP.char = chosenChar;
            _updateScoreboardUI();
            _updateTurnUI();
            _renderPlayerCharacterSelectorUI();
            showToast(`🎉 ${curP.name} 選擇了角色：${chosenChar.icon} ${chosenChar.name}！`, 'success');
          }
        });
      });
    }

    const nameEl = container.querySelector('#cdetail-name');
    const traitEl = container.querySelector('#cdetail-trait');
    const barEl = container.querySelector('#cdetail-bar');

    if (nameEl) nameEl.textContent = curP.char.name;
    if (traitEl) traitEl.textContent = curP.char.trait;
    if (barEl) barEl.style.width = `${curP.char.speed * 15}%`;
  }

  _renderPlayerCharacterSelectorUI();

  // ----------------------------------------------------
  // 🏛️ 4大場景切換引擎
  // ----------------------------------------------------
  function switchScene(targetScene) {
    currentScene = targetScene;
    const sceneBadge = container.querySelector('#scene-badge');
    const mainBox = container.querySelector('#fruit-havoc-main-box');
    const panelLeft = container.querySelector('#panel-left-sidebar');
    const canvasWrapper = container.querySelector('#canvas-wrapper-box');
    const touchControls = container.querySelector('#mobile-touch-controls');
    const overlayUI = container.querySelector('#canvas-overlay-ui');
    const sceneScore = container.querySelector('#scene-score');
    const sceneVictory = container.querySelector('#scene-victory');

    canvasWrapper.style.display = 'none';
    touchControls.style.display = 'none';
    overlayUI.style.display = 'none';
    sceneScore.style.display = 'none';
    sceneVictory.style.display = 'none';
    mainBox.classList.remove('mode-race');

    if (targetScene === 1) { // 1. 布置場地
      if (sceneBadge) sceneBadge.textContent = '1. 布置場地';
      panelLeft.style.display = 'flex';
      canvasWrapper.style.display = 'block';
      overlayUI.style.display = 'block';
      _updateTurnUI();
    } else if (targetScene === 2) { // 2. 開始玩場地競速
      if (sceneBadge) sceneBadge.textContent = '2. 開始玩場地競速';
      panelLeft.style.display = 'none';
      mainBox.classList.add('mode-race');
      canvasWrapper.style.display = 'block';
      touchControls.style.display = 'flex';
      showToast('🎮 倒數開跑！使用鍵盤 A/D/W 或下方按鈕操控角色的跑跳！', 'success');
    } else if (targetScene === 3) { // 3. 記分場景
      if (sceneBadge) sceneBadge.textContent = '3. 記分場景';
      panelLeft.style.display = 'none';
      mainBox.classList.add('mode-race');
      sceneScore.style.display = 'flex';
      _renderScoreboardSceneAnimation();
    } else if (targetScene === 4) { // 4. 獲勝慶典影片
      if (sceneBadge) sceneBadge.textContent = '4. 獲勝慶典影片';
      panelLeft.style.display = 'none';
      mainBox.classList.add('mode-race');
      sceneVictory.style.display = 'flex';
      _startVictoryVideoPlayer();
    }
  }

  // ----------------------------------------------------
  // 3. 場景 3: 動態計分條動畫
  // ----------------------------------------------------
  function _renderScoreboardSceneAnimation() {
    const barsContainer = container.querySelector('#animated-score-bars');
    if (!barsContainer) return;

    barsContainer.innerHTML = players.map(p => `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.95rem;">
          <span>${p.char.icon} ${p.name}</span>
          <span style="color:${p.char.color};">${p.score} / ${targetScore} 分</span>
        </div>
        <div style="width:100%;height:14px;background:#e2e8f0;border-radius:7px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.15);">
          <div class="score-progress-fill-${p.id}" style="width:${Math.min(100, (p.prevScore / targetScore) * 100)}%;height:100%;background:${p.char.color};transition:width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
        </div>
      </div>
    `).join('');

    setTimeout(() => {
      players.forEach(p => {
        const fillEl = container.querySelector(`.score-progress-fill-${p.id}`);
        if (fillEl) {
          fillEl.style.width = `${Math.min(100, (p.score / targetScore) * 100)}%`;
        }
      });
    }, 150);
  }

  // ----------------------------------------------------
  // 4. 場景 4: 隨機 AI 獲勝短影片
  // ----------------------------------------------------
  function _startVictoryVideoPlayer() {
    const videoPlayer = container.querySelector('#victory-video-player');
    if (!videoPlayer || !winnerPlayer) return;

    const charId = winnerPlayer.char.id;
    const randomIdx = Math.random() < 0.5 ? 1 : 2;
    const videoSrc = `./assets/video/victory_${charId}_${randomIdx}.mp4`;

    videoPlayer.src = videoSrc;
    videoPlayer.load();
    videoPlayer.play().catch(e => console.warn('Autoplay blocked:', e));

    const winnerText = container.querySelector('#victory-winner-desc');
    if (winnerText) winnerText.textContent = `👑 恭喜 ${winnerPlayer.char.icon} ${winnerPlayer.name} 贏得全場總冠軍！`;
  }

  // ----------------------------------------------------
  // 2.5D Storybook Platformer Physics Engine (800x480)
  // ----------------------------------------------------
  const canvas = container.querySelector('#fruit-canvas');
  const dropZone = container.querySelector('#canvas-wrapper-box');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const TILE_SIZE = 50; // 50px

  const resetAllPlayersPos = () => {
    players.forEach((p, idx) => {
      p.x = 100 + idx * 30;
      p.y = 360;
      p.vx = 0;
      p.vy = 0;
      p.facing = 'right';
      p.isGrounded = true;
      p.isDead = false;
      p.reached = false;
      p.finishRank = 0;
    });
  };

  const onKeyDown = (e) => {
    if (currentScene !== 2) return;
    if (['KeyA'].includes(e.code)) keysState.p1Left = true;
    if (['KeyD'].includes(e.code)) keysState.p1Right = true;
    if (['KeyW'].includes(e.code)) {
      if (!keysState.p1Jump) _playerJump(players[0]);
      keysState.p1Jump = true;
    }
    if (['ArrowLeft'].includes(e.code)) keysState.p2Left = true;
    if (['ArrowRight'].includes(e.code)) keysState.p2Right = true;
    if (['ArrowUp'].includes(e.code)) {
      if (!keysState.p2Jump) _playerJump(players[1]);
      keysState.p2Jump = true;
    }
  };

  const onKeyUp = (e) => {
    if (['KeyA'].includes(e.code)) keysState.p1Left = false;
    if (['KeyD'].includes(e.code)) keysState.p1Right = false;
    if (['KeyW'].includes(e.code)) keysState.p1Jump = false;

    if (['ArrowLeft'].includes(e.code)) keysState.p2Left = false;
    if (['ArrowRight'].includes(e.code)) keysState.p2Right = false;
    if (['ArrowUp'].includes(e.code)) keysState.p2Jump = false;
  };

  const _playerJump = (player) => {
    if (player && player.isGrounded && !player.isDead && !player.reached) {
      player.vy = player.char.jump;
      player.isGrounded = false;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const _removeKeyListeners = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  // Touch controls
  const bindTouch = (id, fnStart, fnEnd) => {
    const btn = container.querySelector(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); fnStart(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); fnEnd(); });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); fnStart(); });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); fnEnd(); });
  };

  bindTouch('#tbtn-p1-left', () => keysState.p1Left = true, () => keysState.p1Left = false);
  bindTouch('#tbtn-p1-right', () => keysState.p1Right = true, () => keysState.p1Right = false);
  bindTouch('#tbtn-p1-jump', () => _playerJump(players[0]), () => {});

  bindTouch('#tbtn-p2-left', () => keysState.p2Left = true, () => keysState.p2Left = false);
  bindTouch('#tbtn-p2-right', () => keysState.p2Right = true, () => keysState.p2Right = false);
  bindTouch('#tbtn-p2-jump', () => _playerJump(players[1]), () => {});

  let finishOrderCounter = 0;

  const updatePhysics = () => {
    if (currentScene !== 2) return;

    players.forEach((p, idx) => {
      if (p.isDead || p.reached) return;

      let isLeft = idx === 0 ? keysState.p1Left : (idx === 1 ? keysState.p2Left : false);
      let isRight = idx === 0 ? keysState.p1Right : (idx === 1 ? keysState.p2Right : false);
      if (idx >= 2) isRight = true;

      if (isLeft) {
        p.vx = -p.char.speed;
        p.facing = 'left';
      } else if (isRight) {
        p.vx = p.char.speed;
        p.facing = 'right';
      } else {
        p.vx *= 0.82;
      }

      p.vy += 0.58;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 25) p.x = 25;
      if (p.x > 775) p.x = 775;

      p.isGrounded = false;
      PLATFORMS.forEach(plat => {
        if (
          p.x + 18 > plat.x &&
          p.x - 18 < plat.x + plat.w &&
          p.y + 20 >= plat.y &&
          p.y + 20 <= plat.y + plat.h + 10 &&
          p.vy >= 0
        ) {
          p.y = plat.y - 20;
          p.vy = 0;
          p.isGrounded = true;
        }
      });

      placedTraps.forEach(pt => {
        const tx = pt.gridX * TILE_SIZE + 25;
        const ty = pt.gridY * TILE_SIZE + 25;
        const dist = Math.hypot(p.x - tx, p.y - ty);

        if (dist < 32) {
          if (pt.trap.id === 9) {
            p.vy = -17;
            p.isGrounded = false;
          } else if (pt.trap.id === 1) {
            p.vx = 12;
            p.vy = -6;
          } else if (pt.trap.id === 2 || pt.trap.id === 8) {
            p.isDead = true;
            showToast(`💥 ${p.name} 踩中【${pt.trap.name}】陣亡！`, 'warning');
            const killerP = players.find(player => player.id === pt.placedBy);
            if (killerP && killerP.id !== p.id) {
              killerP.score += 1;
            }
          }
        }
      });

      if (p.y > 470) {
        p.isDead = true;
        showToast(`🕳️ ${p.name} 掉入深淵陣亡！`, 'warning');
      }

      if (p.x >= 650 && p.y <= 230) {
        p.reached = true;
        finishOrderCounter++;
        p.finishRank = finishOrderCounter;
        showToast(`🚩 ${p.name} 成功到達終點！(第 ${p.finishRank} 名)`, 'success');
      }
    });

    const allEnded = players.every(p => p.isDead || p.reached);
    if (allEnded) {
      _evaluateRoundResults();
    }
  };

  const _evaluateRoundResults = () => {
    players.forEach(p => p.prevScore = p.score);

    const reachedPlayers = players.filter(p => p.reached);
    const totalCount = players.length;
    const reasonEl = container.querySelector('#score-summary-reason');

    let summaryText = '';

    if (reachedPlayers.length === totalCount) {
      summaryText = '❌ 本輪全員皆到達終點！關卡太簡單，所有人得 0 分！';
    } else if (reachedPlayers.length === 0) {
      summaryText = '💥 本輪全體陣亡無人到達！關卡太危險，所有人得 0 分！';
    } else {
      summaryText = '🏆 本輪關卡難易度適中！順利得分：';
      reachedPlayers.forEach(p => {
        let pts = 1;
        if (p.finishRank === 1) pts += 1;
        if (reachedPlayers.length === 1) pts += 2;
        p.score += pts;
        summaryText += ` ${p.char.icon} ${p.name}(+${pts}分)`;
      });
    }

    if (reasonEl) reasonEl.textContent = summaryText;

    setTimeout(() => {
      switchScene(3);
    }, 800);
  };

  // ----------------------------------------------------
  // 🎨 2.5D HD Storybook Render Engine (800x480)
  // ----------------------------------------------------
  const drawStage = () => {
    if (!ctx || (currentScene !== 1 && currentScene !== 2)) return;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, 480);
    bgGrad.addColorStop(0, '#e0f2fe');
    bgGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 480);

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 800; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y <= 480; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }

    PLATFORMS.forEach(plat => {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 14);

      const platGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
      platGrad.addColorStop(0, '#fcd34d');
      platGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = platGrad;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      ctx.fillStyle = '#4ade80';
      ctx.fillRect(plat.x, plat.y - 4, plat.w, 6);
    });

    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', 680, 190);
    ctx.fillText('🎂', 620, 190);

    placedTraps.forEach(pt => {
      const px = pt.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = pt.gridY * TILE_SIZE + TILE_SIZE / 2;

      ctx.fillStyle = 'rgba(255, 237, 213, 0.9)';
      ctx.fillRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 2;
      ctx.strokeRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.font = '28px sans-serif';
      ctx.fillText(pt.trap.icon, px, py);
    });

    if (currentScene === 1 && hoverGrid) {
      const gx = hoverGrid.gridX * TILE_SIZE;
      const gy = hoverGrid.gridY * TILE_SIZE;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fillRect(gx + 2, gy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gx + 2, gy + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.font = '30px sans-serif';
      ctx.fillText(selectedTrap.icon, gx + TILE_SIZE / 2, gy + TILE_SIZE / 2);
    }

    // Render Players with Chosen Character Sprites
    players.forEach(p => {
      if (!p.isDead) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 18, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        const spriteImg = charSpriteImages[p.char.id];
        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.facing === 'left') {
          ctx.scale(-1, 1);
        }

        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth !== 0) {
          ctx.drawImage(spriteImg, -26, -30, 52, 52);
        } else {
          ctx.font = '36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.char.icon, 0, 0);
        }
        ctx.restore();

        ctx.fillStyle = p.char.color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.name} (${p.char.icon})`, p.x, p.y - 32);
      }
    });
  };

  const gameLoop = () => {
    updatePhysics();
    drawStage();
    animFrameId = requestAnimationFrame(gameLoop);
  };

  animFrameId = requestAnimationFrame(gameLoop);

  // Trap Selection & Drop Logic
  let draggedTrapId = null;

  container.querySelectorAll('.trap-select-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.trap-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const trapId = parseInt(item.dataset.trapId, 10);
      selectedTrap = TRAP_ITEMS.find(t => t.id === trapId);
      draggedTrapId = trapId;

      showToast(`已選中道具：${selectedTrap.name}`, 'info');
    });

    item.addEventListener('dragstart', (e) => {
      if (currentScene !== 1) return;
      const trapId = parseInt(item.dataset.trapId, 10);
      draggedTrapId = trapId;
      selectedTrap = TRAP_ITEMS.find(t => t.id === trapId);

      container.querySelectorAll('.trap-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      item.classList.add('is-dragging');

      e.dataTransfer.setData('text/plain', trapId.toString());
      e.dataTransfer.effectAllowed = 'copy';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
      hoverGrid = null;
    });
  });

  const handlePlaceTrapAtGrid = (gridX, gridY) => {
    if (currentScene !== 1) return;
    const targetTrap = TRAP_ITEMS.find(t => t.id === (draggedTrapId || selectedTrap.id)) || selectedTrap;
    const currentP = players[activePlacementPlayerIdx];

    if (targetTrap.id === 20) {
      placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
      showToast(`💥 ${currentP.name} 拆除了位置 (${gridX}, ${gridY}) 的障礙物！`, 'warning');
    } else {
      placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
      placedTraps.push({ id: Date.now(), trap: targetTrap, gridX, gridY, placedBy: currentP.id });
      showToast(`🎉 ${currentP.name} 放置【${targetTrap.icon} ${targetTrap.name}】至 (${gridX}, ${gridY})！`, 'success');
    }

    activePlacementPlayerIdx = (activePlacementPlayerIdx + 1) % players.length;
    _updateTurnUI();

    if (mode === 'online' && isPeerConnected) {
      sendTrapPlacement(gridX, gridY, targetTrap.id);
    }
  };

  if (dropZone && canvas) {
    dropZone.addEventListener('dragover', (e) => {
      if (currentScene !== 1) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 800 && relY >= 0 && relY < 480) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
        hoverGrid = { gridX, gridY };
      }
    });

    dropZone.addEventListener('dragleave', () => {
      hoverGrid = null;
    });

    dropZone.addEventListener('drop', (e) => {
      if (currentScene !== 1) return;
      e.preventDefault();
      hoverGrid = null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 800 && relY >= 0 && relY < 480) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
        handlePlaceTrapAtGrid(gridX, gridY);
      }
    });

    canvas.addEventListener('click', (e) => {
      if (currentScene !== 1) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 800 && relY >= 0 && relY < 480) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
        handlePlaceTrapAtGrid(gridX, gridY);
      }
    });
  }

  // Buttons
  container.querySelector('#btn-build-finish')?.addEventListener('click', () => {
    resetAllPlayersPos();
    finishOrderCounter = 0;
    switchScene(2);
  });

  container.querySelector('#btn-score-next')?.addEventListener('click', () => {
    _updateScoreboardUI();

    const winner = players.find(p => p.score >= targetScore);

    if (winner) {
      winnerPlayer = winner;
      switchScene(4);
    } else if (currentRound >= maxRounds) {
      winnerPlayer = [...players].sort((a, b) => b.score - a.score)[0];
      switchScene(4);
    } else {
      currentRound++;
      activePlacementPlayerIdx = 0;
      resetAllPlayersPos();
      container.querySelector('#round-counter-tag').textContent = `第 ${currentRound} / ${maxRounds} 輪`;
      switchScene(1);
    }
  });

  container.querySelector('#btn-victory-restart')?.addEventListener('click', () => {
    currentRound = 1;
    players.forEach(p => { p.score = 0; p.prevScore = 0; });
    activePlacementPlayerIdx = 0;
    placedTraps = [
      { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 7, placedBy: 1 },
      { id: 2, trap: TRAP_ITEMS[8], gridX: 9, gridY: 8, placedBy: 2 }
    ];
    _reinitPlayers();
    _updateScoreboardUI();
    _renderPlayerCharacterSelectorUI();
    resetAllPlayersPos();
    container.querySelector('#round-counter-tag').textContent = `第 ${currentRound} / ${maxRounds} 輪`;
    switchScene(1);
  });

  switchScene(1);

  return () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    _removeKeyListeners();
  };
}
