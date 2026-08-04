/**
 * Fruit Havoc Page — 4-Scene Game Architecture
 * Scene 1: 1. 布置場地 (Build/Trap Placement)
 * Scene 2: 2. 開始玩場地 (Mario Race Controls)
 * Scene 3: 3. 記分 (Dynamic Animated Scoreboard Progress Bar)
 * Scene 4: 4. 獲勝影片 (3-Second Character Victory Celebration Video Canvas)
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
    { id: 'strawberry', name: '草莓吉伊', icon: '🍓', img: './assets/images/char_strawberry_berry.png', speed: 4.8, jump: -11.5, color: '#ef4444' },
    { id: 'banana', name: '香蕉烏薩奇', icon: '🍌', img: './assets/images/char_banana_usagi.png', speed: 4.2, jump: -13.5, color: '#eab308' },
    { id: 'melon', name: '哈密瓜小八', icon: '🍈', img: './assets/images/char_melon_hachi.png', speed: 4.4, jump: -12.0, color: '#22c55e' },
    { id: 'peach', name: '水桃栗饅頭', icon: '🍑', img: './assets/images/char_peach_kuriman.png', speed: 3.8, jump: -11.0, color: '#f97316' },
    { id: 'grape', name: '飛天葡萄飛鼠', icon: '🍇', img: './assets/images/char_grape_momonga.png', speed: 5.2, jump: -12.5, color: '#a855f7' }
  ];

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

  // Player Objects
  let players = [
    { id: 1, char: FRUIT_CHARACTERS[0], name: '玩家 1', x: 80, y: 360, vx: 0, vy: 0, isGrounded: true, isDead: false, reached: false, score: 0, prevScore: 0, finishRank: 0 },
    { id: 2, char: FRUIT_CHARACTERS[1], name: '玩家 2', x: 100, y: 360, vx: 0, vy: 0, isGrounded: true, isDead: false, reached: false, score: 0, prevScore: 0, finishRank: 0 }
  ];

  let activePlacementPlayerIdx = 0;
  let selectedTrap = TRAP_ITEMS[0];
  let placedTraps = [
    { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 9, placedBy: 1 },
    { id: 2, trap: TRAP_ITEMS[8], gridX: 8, gridY: 10, placedBy: 2 }
  ];
  let hoverGrid = null;

  // 4 Scenes State: 1 = 'BUILD', 2 = 'RACE', 3 = 'SCORE', 4 = 'VICTORY'
  let currentScene = 1;
  let animFrameId = null;
  let victoryAnimId = null;
  let isPeerConnected = false;
  let winnerPlayer = null;

  // Key Input States
  const keysState = {
    p1Left: false, p1Right: false, p1Jump: false,
    p2Left: false, p2Right: false, p2Jump: false
  };

  const PLATFORMS = [
    { x: 40, y: 400, w: 160, h: 40 },  // 起點
    { x: 240, y: 320, w: 120, h: 20 }, // 中間高台
    { x: 440, y: 200, w: 160, h: 40 }  // 終點高台
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
      <div class="fruit-havoc-main">
        <!-- 1. 場景 1: 布置場地 (Build Scene) 的左側選單 -->
        <aside class="fruit-panel-left" id="panel-left-sidebar">
          <div class="panel-card glass" style="background:#fff7ed;border-color:#fdba74;">
            <h4 class="panel-title" style="color:#ea580c;" id="turn-title">
              👉 當前擺放：${players[activePlacementPlayerIdx]?.char.icon} ${players[activePlacementPlayerIdx]?.name}
            </h4>
            <p style="font-size:0.8rem;color:#c2410c;margin:4px 0 0 0;" id="turn-desc">
              請從下方拖拉 1 個陷阱放置在地圖網格！
            </p>
          </div>

          <!-- Draggable Trap Selector -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">擺放/拆除陷阱 (20種)</h4>
              <span class="badge badge-warning" style="font-size:0.7rem;">拖放至網格 ✋</span>
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

        <!-- 右側主要舞台區域 (包容場景 1, 2, 3, 4) -->
        <main class="fruit-stage-area glass" style="flex:1;position:relative;overflow:hidden;">
          <!-- 核心地圖 Canvas (場景 1 與 場景 2) -->
          <div class="canvas-wrapper" id="canvas-wrapper-box" style="display:block;">
            <div class="stage-header" style="margin-bottom:8px;">
              <span class="stage-tip" id="stage-tip">🖐️ 請拖拉道具放置地圖！完成後開啟對戰！</span>
            </div>
            <canvas id="fruit-canvas" width="640" height="480"></canvas>

            <!-- 場景 2 獨佔的瑪利歐觸控按鍵 (場景 1, 3, 4 時完全隱藏) -->
            <div class="mobile-touch-controls" id="mobile-touch-controls" style="display:none;">
              <div style="display:flex;gap:6px;">
                <button class="dpad-btn" id="tbtn-p1-left">⬅️ P1</button>
                <button class="dpad-btn" id="tbtn-p1-right">➡️ P1</button>
                <button class="jump-btn" id="tbtn-p1-jump">🦘 P1 跳躍</button>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="dpad-btn" id="tbtn-p2-left">⬅️ P2</button>
                <button class="dpad-btn" id="tbtn-p2-right">➡️ P2</button>
                <button class="jump-btn" id="tbtn-p2-jump" style="background:linear-gradient(135deg,#0284c7,#38bdf8);">🦘 P2 跳躍</button>
              </div>
            </div>

            <!-- 場景 1 的步驟推進按鈕 -->
            <div class="canvas-overlay-ui" id="canvas-overlay-ui">
              <button class="btn btn-primary btn-lg" id="btn-build-finish" style="background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;box-shadow:0 4px 16px rgba(255,117,68,0.4);">
                🚀 布置完成！開始 2. 開始玩場地競速
              </button>
            </div>
          </div>

          <!-- 3. 場景 3: 記分場景 (Scoreboard Scene) 全螢幕 UI -->
          <div class="scene-container" id="scene-score" style="display:none;padding:24px;flex-direction:column;gap:20px;align-items:center;justify-content:center;min-height:480px;">
            <div style="text-align:center;">
              <h3 style="font-size:1.6rem;color:var(--color-text-primary);margin:0;">📊 第 ${currentRound} 輪比賽分數結算</h3>
              <p style="color:var(--color-text-secondary);font-size:0.9rem;margin:4px 0 0 0;" id="score-summary-reason">黃金結算結果展報...</p>
            </div>

            <div class="animated-score-bars" id="animated-score-bars" style="width:100%;max-width:500px;display:flex;flex-direction:column;gap:14px;">
              <!-- 這裡會動態插入每位玩家的計分進度條動畫 -->
            </div>

            <button class="btn btn-primary btn-lg" id="btn-score-next" style="background:linear-gradient(135deg,#0284c7,#38bdf8);border:none;padding:12px 32px;font-size:1.05rem;">
              ➡️ 進入下一輪：1. 布置場地
            </button>
          </div>

          <!-- 4. 場景 4: 獲勝影片場景 (Victory Scene) 3 秒 AI 畫風慶祝動態 Canvas -->
          <div class="scene-container" id="scene-victory" style="display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:480px;text-align:center;">
            <h2 style="font-size:2rem;margin:0;color:#ea580c;text-shadow:0 2px 10px rgba(234,88,12,0.2);" id="victory-title-text">
              👑 恭喜獲得總冠軍！
            </h2>
            <div style="position:relative;width:400px;height:300px;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.25);border:3px solid #fdba74;">
              <canvas id="victory-video-canvas" width="400" height="300"></canvas>
            </div>
            <p style="font-size:1.1rem;font-weight:700;color:var(--color-text-primary);" id="victory-winner-desc">水果大師強勢登頂！</p>
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
    if (victoryAnimId) cancelAnimationFrame(victoryAnimId);
    _removeKeyListeners();
    navigate('/');
  });
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('/guide?game=fruitHavoc'));

  // Player Count Selector
  container.querySelector('#select-player-count')?.addEventListener('change', (e) => {
    playerCount = parseInt(e.target.value, 10);
    _reinitPlayers();
    _updateScoreboardUI();
    showToast(`對戰人數已調整為 ${playerCount} 人！`, 'info');
  });

  function _reinitPlayers() {
    players = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: i + 1,
        char: FRUIT_CHARACTERS[i % FRUIT_CHARACTERS.length],
        name: `玩家 ${i + 1}`,
        x: 80 + i * 24,
        y: 360,
        vx: 0,
        vy: 0,
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
  // 🏛️ 4大場景切換引擎 (4 Scenes Switcher System)
  // ----------------------------------------------------
  function switchScene(targetScene) {
    currentScene = targetScene;
    const sceneBadge = container.querySelector('#scene-badge');
    const panelLeft = container.querySelector('#panel-left-sidebar');
    const canvasWrapper = container.querySelector('#canvas-wrapper-box');
    const touchControls = container.querySelector('#mobile-touch-controls');
    const overlayUI = container.querySelector('#canvas-overlay-ui');
    const sceneScore = container.querySelector('#scene-score');
    const sceneVictory = container.querySelector('#scene-victory');

    if (victoryAnimId) cancelAnimationFrame(victoryAnimId);

    // Hide all scenes first
    canvasWrapper.style.display = 'none';
    touchControls.style.display = 'none';
    overlayUI.style.display = 'none';
    sceneScore.style.display = 'none';
    sceneVictory.style.display = 'none';

    if (targetScene === 1) { // 1. 布置場地
      if (sceneBadge) sceneBadge.textContent = '1. 布置場地';
      panelLeft.style.display = 'flex';
      canvasWrapper.style.display = 'block';
      overlayUI.style.display = 'block';
      _updateTurnUI();
    } else if (targetScene === 2) { // 2. 開始玩場地 (競速跑跳)
      if (sceneBadge) sceneBadge.textContent = '2. 開始玩場地競速';
      panelLeft.style.display = 'none'; // 隱藏左側選單讓視野擴展
      canvasWrapper.style.display = 'block';
      touchControls.style.display = 'flex'; // 顯示獨佔觸控按鍵
      showToast('🎮 倒數開跑！使用鍵盤 A/D/W 或下按鍵親自操控跑跳！', 'success');
    } else if (targetScene === 3) { // 3. 記分場景
      if (sceneBadge) sceneBadge.textContent = '3. 記分場景';
      panelLeft.style.display = 'none';
      sceneScore.style.display = 'flex';
      _renderScoreboardSceneAnimation();
    } else if (targetScene === 4) { // 4. 獲勝影片場景 (3秒 AI 風格動態影片)
      if (sceneBadge) sceneBadge.textContent = '4. 獲勝慶典影片';
      panelLeft.style.display = 'none';
      sceneVictory.style.display = 'flex';
      _startVictoryVideoCanvas();
    }
  }

  // ----------------------------------------------------
  // 3. 場景 3: 記分場景與動態計分條 (Animated Score Progress Bar)
  // ----------------------------------------------------
  function _renderScoreboardSceneAnimation() {
    const barsContainer = container.querySelector('#animated-score-bars');
    if (!barsContainer) return;

    barsContainer.innerHTML = players.map(p => `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.9rem;">
          <span>${p.char.icon} ${p.name}</span>
          <span style="color:${p.char.color};">${p.score} / ${targetScore} 分</span>
        </div>
        <div style="width:100%;height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.1);">
          <div class="score-progress-fill-${p.id}" style="width:${Math.min(100, (p.prevScore / targetScore) * 100)}%;height:100%;background:${p.char.color};transition:width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
        </div>
      </div>
    `).join('');

    // Trigger Bar Fill Animation
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
  // 4. 場景 4: 獲勝影片場景 (3秒 AI 風格角色慶祝動態 Canvas)
  // ----------------------------------------------------
  function _startVictoryVideoCanvas() {
    const vCanvas = container.querySelector('#victory-video-canvas');
    if (!vCanvas || !winnerPlayer) return;
    const vCtx = vCanvas.getContext('2d');

    const winnerImg = new Image();
    winnerImg.src = winnerPlayer.char.img;

    const winnerText = container.querySelector('#victory-winner-desc');
    if (winnerText) winnerText.textContent = `👑 恭喜 ${winnerPlayer.char.icon} ${winnerPlayer.name} 贏得全場總冠軍！`;

    // Confetti Particles Array (40 顆彩帶雨)
    const confetti = Array.from({ length: 40 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 300 - 300,
      size: Math.random() * 8 + 4,
      color: ['#ff7544', '#ff70a6', '#38bdf8', '#facc15', '#4ade80'][Math.floor(Math.random() * 5)],
      vy: Math.random() * 2 + 1.5,
      vx: Math.sin(Math.random() * Math.PI) * 1
    }));

    let startTime = Date.now();

    const renderVictoryFrame = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      vCtx.fillStyle = '#f0f9ff';
      vCtx.fillRect(0, 0, 400, 300);

      // Gold Glow Background
      const grad = vCtx.createRadialGradient(200, 150, 20, 200, 150, 180);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.6)');
      grad.addColorStop(1, 'rgba(253, 186, 116, 0.1)');
      vCtx.fillStyle = grad;
      vCtx.fillRect(0, 0, 400, 300);

      // Draw Character Image with Bounce Animation (3秒 歡快跳躍)
      const bounceY = Math.abs(Math.sin(elapsed * 5)) * 25;
      if (winnerImg.complete && winnerImg.naturalWidth !== 0) {
        vCtx.drawImage(winnerImg, 140, 90 - bounceY, 120, 120);
      } else {
        vCtx.font = '64px sans-serif';
        vCtx.textAlign = 'center';
        vCtx.fillText(winnerPlayer.char.icon, 200, 150 - bounceY);
      }

      // Draw Trophy 🏆
      vCtx.font = '36px sans-serif';
      vCtx.textAlign = 'center';
      vCtx.fillText('🏆', 200, 230);

      // Render Falling Confetti
      confetti.forEach(c => {
        c.y += c.vy;
        c.x += c.vx;
        if (c.y > 300) c.y = -10;

        vCtx.fillStyle = c.color;
        vCtx.beginPath();
        vCtx.arc(c.x, c.y, c.size / 2, 0, Math.PI * 2);
        vCtx.fill();
      });

      victoryAnimId = requestAnimationFrame(renderVictoryFrame);
    };

    renderVictoryFrame();
  }

  // ----------------------------------------------------
  // 2D Physics Mario Racing Engine (場景 2 競速運算)
  // ----------------------------------------------------
  const canvas = container.querySelector('#fruit-canvas');
  const dropZone = container.querySelector('#canvas-drop-zone');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const TILE_SIZE = 40;

  const resetAllPlayersPos = () => {
    players.forEach((p, idx) => {
      p.x = 80 + idx * 24;
      p.y = 360;
      p.vx = 0;
      p.vy = 0;
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

  // Touch Controls
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

      if (isLeft) p.vx = -p.char.speed;
      else if (isRight) p.vx = p.char.speed;
      else p.vx *= 0.82;

      p.vy += 0.55;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 20) p.x = 20;
      if (p.x > 620) p.x = 620;

      p.isGrounded = false;
      PLATFORMS.forEach(plat => {
        if (
          p.x + 14 > plat.x &&
          p.x - 14 < plat.x + plat.w &&
          p.y + 16 >= plat.y &&
          p.y + 16 <= plat.y + plat.h + 10 &&
          p.vy >= 0
        ) {
          p.y = plat.y - 16;
          p.vy = 0;
          p.isGrounded = true;
        }
      });

      placedTraps.forEach(pt => {
        const tx = pt.gridX * TILE_SIZE + 20;
        const ty = pt.gridY * TILE_SIZE + 20;
        const dist = Math.hypot(p.x - tx, p.y - ty);

        if (dist < 28) {
          if (pt.trap.id === 9) {
            p.vy = -16;
            p.isGrounded = false;
          } else if (pt.trap.id === 1) {
            p.vx = 10;
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

      if (p.x >= 520 && p.y <= 210) {
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

  /**
   * 黃金結算並準備進入【場景 3: 記分】
   */
  const _evaluateRoundResults = () => {
    players.forEach(p => p.prevScore = p.score); // 保存舊分數供進度條過渡動畫

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

    // 切換至場景 3: 記分場景！
    setTimeout(() => {
      switchScene(3);
    }, 800);
  };

  // Main Canvas Render
  const drawStage = () => {
    if (!ctx || (currentScene !== 1 && currentScene !== 2)) return;

    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 640; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y <= 480; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    PLATFORMS.forEach(plat => {
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#ea580c';
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', 540, 180);
    ctx.fillText('🎂', 480, 180);

    placedTraps.forEach(pt => {
      const px = pt.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = pt.gridY * TILE_SIZE + TILE_SIZE / 2;

      ctx.fillStyle = 'rgba(255, 237, 213, 0.85)';
      ctx.fillRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#fdba74';
      ctx.strokeRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.font = '24px sans-serif';
      ctx.fillText(pt.trap.icon, px, py);
    });

    if (currentScene === 1 && hoverGrid) {
      const gx = hoverGrid.gridX * TILE_SIZE;
      const gy = hoverGrid.gridY * TILE_SIZE;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fillRect(gx + 2, gy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + 2, gy + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.font = '26px sans-serif';
      ctx.fillText(selectedTrap.icon, gx + TILE_SIZE / 2, gy + TILE_SIZE / 2);
    }

    players.forEach(p => {
      if (!p.isDead) {
        ctx.font = '32px sans-serif';
        ctx.fillText(p.char.icon, p.x, p.y);
        ctx.fillStyle = p.char.color;
        ctx.font = '10px sans-serif';
        ctx.fillText(p.name, p.x, p.y - 22);
      }
    });
  };

  const gameLoop = () => {
    updatePhysics();
    drawStage();
    animFrameId = requestAnimationFrame(gameLoop);
  };

  animFrameId = requestAnimationFrame(gameLoop);

  // Drag & Drop Handlers
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

  if (dropZone && canvas) {
    dropZone.addEventListener('dragover', (e) => {
      if (currentScene !== 1) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 640 && relY >= 0 && relY < 480) {
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

      if (relX >= 0 && relX < 640 && relY >= 0 && relY < 480) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
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
      }
    });
  }

  // ----------------------------------------------------
  // 按鈕點擊切換 4大場景
  // ----------------------------------------------------
  // 1. 布置完成按鈕 (場景 1 -> 場景 2)
  container.querySelector('#btn-build-finish')?.addEventListener('click', () => {
    resetAllPlayersPos();
    finishOrderCounter = 0;
    switchScene(2); // 進入「2. 開始玩場地」
  });

  // 2. 記分場景按鈕 (場景 3 -> 場景 1 或 場景 4)
  container.querySelector('#btn-score-next')?.addEventListener('click', () => {
    _updateScoreboardUI();

    const winner = players.find(p => p.score >= targetScore);

    if (winner) {
      winnerPlayer = winner;
      switchScene(4); // 進入「4. 獲勝影片場景」
    } else if (currentRound >= maxRounds) {
      winnerPlayer = [...players].sort((a, b) => b.score - a.score)[0];
      switchScene(4); // 已達 8 輪次上限 -> 進入「4. 獲勝影片場景」
    } else {
      currentRound++;
      activePlacementPlayerIdx = 0;
      resetAllPlayersPos();
      container.querySelector('#round-counter-tag').textContent = `第 ${currentRound} / ${maxRounds} 輪`;
      switchScene(1); // 繼續進入下一輪「1. 布置場地」
    }
  });

  // 3. 獲勝影片重新開始按鈕 (場景 4 -> 場景 1)
  container.querySelector('#btn-victory-restart')?.addEventListener('click', () => {
    currentRound = 1;
    players.forEach(p => { p.score = 0; p.prevScore = 0; });
    activePlacementPlayerIdx = 0;
    placedTraps = [
      { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 9, placedBy: 1 },
      { id: 2, trap: TRAP_ITEMS[8], gridX: 8, gridY: 10, placedBy: 2 }
    ];
    _reinitPlayers();
    _updateScoreboardUI();
    resetAllPlayersPos();
    container.querySelector('#round-counter-tag').textContent = `第 ${currentRound} / ${maxRounds} 輪`;
    switchScene(1); // 重置開局「1. 布置場地」
  });

  // 開局初始切換至「場景 1: 布置場地」
  switchScene(1);

  return () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (victoryAnimId) cancelAnimationFrame(victoryAnimId);
    _removeKeyListeners();
  };
}
