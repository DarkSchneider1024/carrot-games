/**
 * Fruit Havoc Page — Mobile-First 360x360 Square Stage Edition (手機優先直向版面)
 * High Quality Three.js 3D & 2.5D Mobile World, Web Audio Synth, & Random Victory Video Celebrations.
 */

import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { FruitHavoc3DRenderer } from './fruit-havoc-3d-renderer.js';
import {
  initFruitPeer,
  sendTrapPlacement,
  sendMovementState,
  closeFruitPeer
} from '../../network/fruit-peer-manager.js';

// Web Audio Synth Sound Engine
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const playSound = (type) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'jump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'spring') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'place') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.1);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'hit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'goal') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.2);
      });
    }
  } catch (e) {
    console.warn('Audio play error:', e);
  }
};

export async function renderFruitHavoc(container, params = {}) {
  const mode = params.mode || 'local'; // 'local' or 'online'

  const FRUIT_CHARACTERS = [
    { id: 'strawberry', name: '草莓吉伊', icon: '🍓', img: './assets/images/char_strawberry_berry.png', trait: '速度型 (靈活移動)', speed: 4.8, jump: -11.5, color: '#ef4444' },
    { id: 'banana', name: '香蕉烏薩奇', icon: '🍌', img: './assets/images/char_banana_usagi.png', trait: '高跳型 (超強跳躍)', speed: 4.2, jump: -13.2, color: '#eab308' },
    { id: 'melon', name: '哈密瓜小八', icon: '🍈', img: './assets/images/char_melon_hachi.png', trait: '均衡型 (穩健控球)', speed: 4.5, jump: -12.0, color: '#22c55e' },
    { id: 'peach', name: '水桃栗饅頭', icon: '🍑', img: './assets/images/char_peach_kuriman.png', trait: '重裝型 (抗推霸體)', speed: 3.8, jump: -11.0, color: '#f97316' },
    { id: 'grape', name: '飛天葡萄飛鼠', icon: '🍇', img: './assets/images/char_grape_momonga.png', trait: '滑翔型 (空中滯空)', speed: 5.0, jump: -12.5, color: '#a855f7' }
  ];

  // Preload Character Sprites
  const charSpriteImages = {};
  FRUIT_CHARACTERS.forEach(c => {
    const img = new Image();
    img.src = c.img;
    charSpriteImages[c.id] = img;
  });

  const TRAP_ITEMS = [
    { id: 1, name: '彈簧拳擊', icon: '🥊', desc: '向前猛力彈出擊飛玩家' },
    { id: 2, name: '草莓電鋸', icon: '🪚', desc: '半空來回擺動切割' },
    { id: 3, name: '香蕉滑道', icon: '🍌', desc: '踩中失控向前滑行' },
    { id: 4, name: '蜂蜜黏膠', icon: '🍯', desc: '踩中移動速度 -70%' },
    { id: 5, name: '西瓜大砲', icon: '💣', desc: '定時發射重型西瓜砲彈' },
    { id: 6, name: '龍捲風場', icon: '🌪️', desc: '向上強勁風場吹升' },
    { id: 7, name: '葡萄連弩', icon: '🏹', desc: '感應式葡萄箭矢' },
    { id: 8, name: '仙人掌刺', icon: '🌵', desc: '觸碰即陣亡' },
    { id: 9, name: '跳跳菇', icon: '🍄', desc: '踩中高空彈飛跳躍' },
    { id: 10, name: '雷電檸檬', icon: '⚡', desc: '釋放 360 度麻痺電流' },
    { id: 11, name: '傳送門', icon: '🌀', desc: '入口與出口瞬間轉移' },
    { id: 12, name: '冰棒檔板', icon: '🧊', desc: '光滑冰面牆阻擋' },
    { id: 13, name: '黑洞陷阱', icon: '🕳️', desc: '踩上去 0.5 秒後破裂' },
    { id: 14, name: '強風扇', icon: '扇', desc: '強風干擾跳躍軌跡' },
    { id: 15, name: '櫻桃雷射', icon: '🍒', desc: '旋轉掃射紅外極光' },
    { id: 16, name: '熱氣球', icon: '🎈', desc: '停留過久會下沉浮台' },
    { id: 17, name: '椰子盾', icon: '🛡️', desc: '阻擋弩箭與砲彈' },
    { id: 18, name: '蘋果磁鐵', icon: '🧲', desc: '強烈吸引或排斥' },
    { id: 19, name: '履帶跑道', icon: '🏃', desc: '滾動傳送帶加速' },
    { id: 20, name: '拆除炸彈', icon: '💥', desc: '拖放至已有陷阱可炸毀拆除' }
  ];

  // Match Configuration
  let maxRounds = 8;
  let currentRound = 1;
  let targetScore = 10;
  let playerCount = 2;
  let selectedPlayerIdx = 0;

  // Player Objects Array (360x360 Mobile Coords)
  let players = [
    { id: 1, char: FRUIT_CHARACTERS[0], name: '玩家 1', x: 50, y: 270, vx: 0, vy: 0, facing: 'right', isGrounded: true, isDead: false, reached: false, score: 0, prevScore: 0, finishRank: 0 },
    { id: 2, char: FRUIT_CHARACTERS[1], name: '玩家 2', x: 75, y: 270, vx: 0, vy: 0, facing: 'right', isGrounded: true, isDead: false, reached: false, score: 0, prevScore: 0, finishRank: 0 }
  ];

  let activePlacementPlayerIdx = 0;
  let selectedTrap = TRAP_ITEMS[0];
  let placedTraps = [
    { id: 1, trap: TRAP_ITEMS[0], gridX: 3, gridY: 4, placedBy: 1 },
    { id: 2, trap: TRAP_ITEMS[8], gridX: 4, gridY: 5, placedBy: 2 }
  ];
  let hoverGrid = null;

  let currentScene = 1;
  let animFrameId = null;
  let isPeerConnected = false;
  let winnerPlayer = null;

  const keysState = {
    p1Left: false, p1Right: false, p1Jump: false,
    p2Left: false, p2Right: false, p2Jump: false
  };

  // 360x360 Square Stage Platforms
  const PLATFORMS = [
    { x: 20, y: 290, w: 120, h: 35 },   // 起點台
    { x: 140, y: 210, w: 90, h: 25 },   // 中間台
    { x: 230, y: 130, w: 110, h: 35 }   // 終點台
  ];

  container.innerHTML = `
    <div class="fruit-havoc-page animate-fade-in">
      <!-- Topbar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-xs" id="btn-back" title="返回大廳">
            ${SVG_ICONS.back}
          </button>
          <div class="topbar-title">
            <span class="game-name">🍓 水果傷害</span>
          </div>
        </div>
        <div class="topbar-actions" style="display:flex;gap:6px;align-items:center;">
          <select id="select-player-count" style="padding:4px 6px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg-card);font-size:0.8rem;">
            <option value="2" ${playerCount === 2 ? 'selected' : ''}>👥 2P 對戰</option>
            ${mode === 'online' ? `
              <option value="3" ${playerCount === 3 ? 'selected' : ''}>🌐 3P 連線</option>
              <option value="4" ${playerCount === 4 ? 'selected' : ''}>🌐 4P 連線</option>
            ` : ''}
          </select>
          <button class="btn btn-ghost btn-xs" id="btn-settings" title="遊戲說明">📖</button>
        </div>
      </div>

      <!-- Top Scoreboard Bar -->
      <div class="scoreboard-bar glass">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="badge badge-info" id="round-counter-tag" style="font-size:0.75rem;">第 ${currentRound} / ${maxRounds} 輪</span>
          <span style="font-size:0.75rem;color:var(--color-text-secondary);font-weight:700;">目標：${targetScore} 分</span>
        </div>
        <div class="player-scores-grid" id="player-scores-grid" style="display:flex;gap:12px;justify-content:center;">
          ${players.map(p => `
            <div class="player-score-item" style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:1.05rem;">${p.char.icon}</span>
              <span style="font-weight:700;font-size:0.82rem;color:${p.char.color};">${p.name}: <strong>${p.score}</strong></span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Main Game Content Wrapper -->
      <div class="fruit-havoc-main" id="fruit-havoc-main-box">
        <!-- 核心 360x360 手機直向舞台區 -->
        <main class="fruit-stage-area glass">
          <div style="width:100%;text-align:center;">
            <span class="stage-tip" id="stage-tip" style="font-size:0.8rem;font-weight:700;color:#ea580c;">🖐️ 請 ${players[activePlacementPlayerIdx]?.name} 選擇道具點擊/拖放地圖！</span>
          </div>

          <!-- 360x360 Square Stage Canvas -->
          <div class="canvas-wrapper" id="canvas-wrapper-box">
            <canvas id="fruit-canvas" width="360" height="360"></canvas>
          </div>
        </main>

        <!-- 1. 場景 1 下方布置選單與角色選單 -->
        <aside class="fruit-panel-left" id="panel-left-sidebar">
          <!-- 🎨 選擇角色 -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">1. 選擇角色</h4>
              <div class="player-selector-tabs" id="player-tabs-box" style="display:flex;gap:4px;">
                ${players.map((p, idx) => `
                  <button class="btn btn-xs ${idx === selectedPlayerIdx ? 'btn-primary' : 'btn-ghost'}" data-pidx="${idx}">
                    ${p.char.icon} P${p.id}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="char-selector-grid" id="char-selector-grid">
              ${FRUIT_CHARACTERS.map(c => `
                <div class="char-select-item ${c.id === players[selectedPlayerIdx]?.char.id ? 'active' : ''}" data-char-id="${c.id}">
                  <img src="${c.img}" alt="${c.name}" class="char-select-img" />
                  <span class="char-select-name">${c.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 2. 擺放/拆除陷阱 -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">2. 選擇陷阱 (點擊地圖擺放)</h4>
            </div>
            <div class="trap-selector-grid">
              ${TRAP_ITEMS.map(t => `
                <div class="trap-select-item ${t.id === selectedTrap.id ? 'active' : ''}" 
                     draggable="true" 
                     data-trap-id="${t.id}" 
                     title="${t.name}">
                  <span class="trap-icon">${t.icon}</span>
                  <span class="trap-name">${t.name}</span>
                </div>
              `).join('')}
            </div>

            <button class="btn btn-primary btn-md" id="btn-build-finish" style="width:100%;background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;margin-top:4px;">
              🚀 布置完成！開始競速跑跳
            </button>
          </div>
        </aside>

        <!-- 2. 場景 2: 手機瑪利歐觸控按鍵 -->
        <div class="mobile-touch-controls-bar" id="mobile-touch-controls" style="display:none;">
          <div style="display:flex;justify-content:space-around;align-items:center;width:100%;">
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="dpad-btn" id="tbtn-p1-left">⬅️</button>
              <button class="dpad-btn" id="tbtn-p1-right">➡️</button>
            </div>
            <button class="jump-btn" id="tbtn-p1-jump">🦘 跳躍</button>
          </div>
          ${playerCount >= 2 ? `
            <div style="display:flex;justify-content:space-around;align-items:center;width:100%;margin-top:4px;padding-top:4px;border-top:1px dashed var(--color-border);">
              <span style="font-size:0.75rem;font-weight:700;color:#38bdf8;">P2:</span>
              <button class="dpad-btn" id="tbtn-p2-left" style="padding:6px 12px;font-size:0.9rem;">⬅️</button>
              <button class="dpad-btn" id="tbtn-p2-right" style="padding:6px 12px;font-size:0.9rem;">➡️</button>
              <button class="jump-btn" id="tbtn-p2-jump" style="padding:6px 14px;font-size:0.85rem;background:linear-gradient(135deg,#0284c7,#38bdf8);">🦘 P2跳</button>
            </div>
          ` : ''}
        </div>

        <!-- 3. 場景 3: 記分場景 -->
        <div class="scene-container" id="scene-score" style="display:none;padding:16px;flex-direction:column;gap:14px;align-items:center;justify-content:center;width:100%;">
          <div style="text-align:center;">
            <h3 style="font-size:1.3rem;color:var(--color-text-primary);margin:0;">📊 第 ${currentRound} 輪分數結算</h3>
            <p style="color:var(--color-text-secondary);font-size:0.82rem;margin:4px 0 0 0;" id="score-summary-reason">黃金結算展報...</p>
          </div>

          <div class="animated-score-bars" id="animated-score-bars" style="width:100%;display:flex;flex-direction:column;gap:10px;">
            <!-- 插入動態計分條 -->
          </div>

          <button class="btn btn-primary btn-md" id="btn-score-next" style="width:100%;background:linear-gradient(135deg,#0284c7,#38bdf8);border:none;">
            ➡️ 進入下一輪：1. 布置場地
          </button>
        </div>

        <!-- 4. 場景 4: 獲勝影片 -->
        <div class="scene-container" id="scene-victory" style="display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;width:100%;">
          <h3 style="font-size:1.5rem;margin:0;color:#ea580c;" id="victory-title-text">
            👑 恭喜獲得總冠軍！
          </h3>
          <div style="position:relative;width:100%;max-width:340px;height:200px;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.3);border:2px solid #fdba74;background:#000;">
            <video id="victory-video-player" width="340" height="200" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
          </div>
          <p style="font-size:0.95rem;font-weight:700;color:var(--color-text-primary);" id="victory-winner-desc">水果大師強勢登頂！</p>
          <button class="btn btn-primary btn-md" id="btn-victory-restart" style="width:100%;background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;">
            🔄 重新開始全場比賽
          </button>
        </div>
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
    const val = parseInt(e.target.value, 10);
    if (mode === 'local' && val > 2) {
      showToast('單機同屏模式最多支援 2P！若需 3P/4P 請使用線上對戰', 'warning');
      e.target.value = '2';
      return;
    }
    playerCount = val;
    _reinitPlayers();
    _updateScoreboardUI();
    _renderPlayerCharacterSelectorUI();
    showToast(`對戰人數設定為 ${playerCount} 人！`, 'info');
  });

  function _reinitPlayers() {
    players = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: i + 1,
        char: FRUIT_CHARACTERS[i % FRUIT_CHARACTERS.length],
        name: `玩家 ${i + 1}`,
        x: 40 + i * 25,
        y: 270,
        vx: 0, vy: 0,
        facing: 'right',
        isGrounded: true, isDead: false, reached: false,
        score: 0, prevScore: 0, finishRank: 0
      });
    }
  }

  function _updateScoreboardUI() {
    const grid = container.querySelector('#player-scores-grid');
    if (grid) {
      grid.innerHTML = players.map(p => `
        <div class="player-score-item" style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:1.05rem;">${p.char.icon}</span>
          <span style="font-weight:700;font-size:0.82rem;color:${p.char.color};">${p.name}: <strong>${p.score}</strong></span>
        </div>
      `).join('');
    }
  }

  function _updateTurnUI() {
    const tipEl = container.querySelector('#stage-tip');
    const activeP = players[activePlacementPlayerIdx];
    if (activeP && tipEl) {
      tipEl.textContent = `🖐️ 請 ${activeP.char.icon} ${activeP.name} 選擇道具點擊/拖放地圖！`;
    }
  }

  // 🎮 選擇角色 UI
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
            playSound('place');
            _updateScoreboardUI();
            _updateTurnUI();
            _renderPlayerCharacterSelectorUI();
            showToast(`🎉 ${curP.name} 選擇角色：${chosenChar.icon} ${chosenChar.name}！`, 'success');
          }
        });
      });
    }
  }

  _renderPlayerCharacterSelectorUI();

  // ----------------------------------------------------
  // 🏛️ 4大場景切換引擎
  // ----------------------------------------------------
  function switchScene(targetScene) {
    currentScene = targetScene;
    const panelLeft = container.querySelector('#panel-left-sidebar');
    const touchControls = container.querySelector('#mobile-touch-controls');
    const sceneScore = container.querySelector('#scene-score');
    const sceneVictory = container.querySelector('#scene-victory');

    touchControls.style.display = 'none';
    sceneScore.style.display = 'none';
    sceneVictory.style.display = 'none';
    panelLeft.style.display = 'none';

    if (targetScene === 1) { // 1. 布置場地
      panelLeft.style.display = 'flex';
      _updateTurnUI();
    } else if (targetScene === 2) { // 2. 開始競速
      touchControls.style.display = 'flex';
      showToast('🎮 競速開跑！使用鍵盤 A/D/W 或下方按鈕操控角色的跑跳！', 'success');
    } else if (targetScene === 3) { // 3. 記分場景
      sceneScore.style.display = 'flex';
      _renderScoreboardSceneAnimation();
    } else if (targetScene === 4) { // 4. 獲勝影片
      sceneVictory.style.display = 'flex';
      playSound('goal');
      _startVictoryVideoPlayer();
    }
  }

  function _renderScoreboardSceneAnimation() {
    const barsContainer = container.querySelector('#animated-score-bars');
    if (!barsContainer) return;

    barsContainer.innerHTML = players.map(p => `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.85rem;">
          <span>${p.char.icon} ${p.name}</span>
          <span style="color:${p.char.color};">${p.score} / ${targetScore} 分</span>
        </div>
        <div style="width:100%;height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;">
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

  function _startVictoryVideoPlayer() {
    const videoPlayer = container.querySelector('#victory-video-player');
    if (!videoPlayer || !winnerPlayer) return;

    const charId = winnerPlayer.char.id;
    const randomIdx = Math.random() < 0.5 ? 1 : 2;
    videoPlayer.src = `./assets/video/victory_${charId}_${randomIdx}.mp4`;
    videoPlayer.load();
    videoPlayer.play().catch(e => console.warn('Autoplay blocked:', e));

    const winnerText = container.querySelector('#victory-winner-desc');
    if (winnerText) winnerText.textContent = `👑 恭喜 ${winnerPlayer.char.icon} ${winnerPlayer.name} 贏得全場總冠軍！`;
  }

  // ----------------------------------------------------
  // 360x360 Square Stage Physics & Render Engine
  // ----------------------------------------------------
  const canvas = container.querySelector('#fruit-canvas');
  const dropZone = container.querySelector('#canvas-wrapper-box');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const TILE_SIZE = 45; // 45px grid (8x8 = 360px)

  const renderer3D = new FruitHavoc3DRenderer();
  let is3DModeSupported = false;

  if (canvas) {
    try {
      is3DModeSupported = renderer3D.init(canvas, 360, 360);
      if (is3DModeSupported !== false) {
        renderer3D.updatePlatforms(PLATFORMS);
        is3DModeSupported = true;
      }
    } catch (e) {
      console.warn('WebGL Renderer Init Error, falling back to 2.5D Engine:', e);
      is3DModeSupported = false;
    }
  }

  const resetAllPlayersPos = () => {
    players.forEach((p, idx) => {
      p.x = 40 + idx * 25;
      p.y = 270;
      p.vx = 0; p.vy = 0;
      p.facing = 'right';
      p.isGrounded = true; p.isDead = false; p.reached = false;
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
      playSound('jump');
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

      p.vy += 0.55;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 15) p.x = 15;
      if (p.x > 345) p.x = 345;

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
        const tx = pt.gridX * TILE_SIZE + 22;
        const ty = pt.gridY * TILE_SIZE + 22;
        const dist = Math.hypot(p.x - tx, p.y - ty);

        if (dist < 26) {
          if (pt.trap.id === 9) {
            p.vy = -15;
            p.isGrounded = false;
            playSound('spring');
          } else if (pt.trap.id === 1) {
            p.vx = 10;
            p.vy = -5;
            playSound('hit');
          } else if (pt.trap.id === 2 || pt.trap.id === 8) {
            p.isDead = true;
            playSound('hit');
            showToast(`💥 ${p.name} 踩中【${pt.trap.name}】陣亡！`, 'warning');
            const killerP = players.find(player => player.id === pt.placedBy);
            if (killerP && killerP.id !== p.id) {
              killerP.score += 1;
            }
          }
        }
      });

      if (p.y > 350) {
        p.isDead = true;
        playSound('hit');
        showToast(`🕳️ ${p.name} 掉入深淵陣亡！`, 'warning');
      }

      if (p.x >= 280 && p.y <= 140) {
        p.reached = true;
        finishOrderCounter++;
        p.finishRank = finishOrderCounter;
        playSound('goal');
        showToast(`🚩 ${p.name} 到達終點！(第 ${p.finishRank} 名)`, 'success');
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
      summaryText = '❌ 全員皆到達終點！所有人得 0 分！';
    } else if (reachedPlayers.length === 0) {
      summaryText = '💥 全體陣亡無人到達！所有人得 0 分！';
    } else {
      summaryText = '🏆 關卡得分：';
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

  const drawStage = () => {
    if (!ctx || (currentScene !== 1 && currentScene !== 2)) return;

    if (is3DModeSupported && renderer3D.initialized) {
      try {
        renderer3D.updateTraps(placedTraps, TILE_SIZE);
        renderer3D.updateHoverGrid(currentScene === 1 ? hoverGrid : null, TILE_SIZE);
        renderer3D.render(players, currentScene);
        return;
      } catch (err) {
        console.warn('3D Render loop error, switching to 2D canvas fallback:', err);
        is3DModeSupported = false;
      }
    }

    draw2DStage();
  };

  const draw2DStage = () => {
    if (!ctx) return;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 360);
    bgGrad.addColorStop(0, '#e0f2fe');
    bgGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 360, 360);

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 360; x += TILE_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke();
    }
    for (let y = 0; y <= 360; y += TILE_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(360, y); ctx.stroke();
    }

    PLATFORMS.forEach(plat => {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 10);

      const platGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.h);
      platGrad.addColorStop(0, '#fcd34d');
      platGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = platGrad;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      ctx.fillStyle = '#4ade80';
      ctx.fillRect(plat.x, plat.y - 3, plat.w, 5);
    });

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', 290, 110);

    placedTraps.forEach(pt => {
      const px = pt.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = pt.gridY * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = 'rgba(255, 237, 213, 0.9)';
      ctx.fillRect(pt.gridX * TILE_SIZE + 2, pt.gridY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 1.5;
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
      ctx.font = '24px sans-serif';
      ctx.fillText(selectedTrap.icon, gx + TILE_SIZE / 2, gy + TILE_SIZE / 2);
    }

    players.forEach(p => {
      if (!p.isDead) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 14, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const spriteImg = charSpriteImages[p.char.id];
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.facing === 'left') ctx.scale(-1, 1);

        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth !== 0) {
          ctx.drawImage(spriteImg, -20, -24, 40, 40);
        } else {
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.char.icon, 0, 0);
        }
        ctx.restore();

        ctx.fillStyle = p.char.color;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.name} (${p.char.icon})`, p.x, p.y - 26);
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

      playSound('place');
      showToast(`選中：${selectedTrap.name}`, 'info');
    });

    item.addEventListener('dragstart', (e) => {
      if (currentScene !== 1) return;
      const trapId = parseInt(item.dataset.trapId, 10);
      draggedTrapId = trapId;
      selectedTrap = TRAP_ITEMS.find(t => t.id === trapId);

      container.querySelectorAll('.trap-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      e.dataTransfer.setData('text/plain', trapId.toString());
      e.dataTransfer.effectAllowed = 'copy';
    });

    item.addEventListener('dragend', () => {
      hoverGrid = null;
    });
  });

  const handlePlaceTrapAtGrid = (gridX, gridY) => {
    if (currentScene !== 1) return;
    const targetTrap = TRAP_ITEMS.find(t => t.id === (draggedTrapId || selectedTrap.id)) || selectedTrap;
    const currentP = players[activePlacementPlayerIdx];

    if (targetTrap.id === 20) {
      placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
      playSound('hit');
      showToast(`💥 ${currentP.name} 拆除位置 (${gridX}, ${gridY}) 障礙！`, 'warning');
    } else {
      placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
      placedTraps.push({ id: Date.now(), trap: targetTrap, gridX, gridY, placedBy: currentP.id });
      playSound('place');
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

      if (relX >= 0 && relX < 360 && relY >= 0 && relY < 360) {
        const gridX = Math.floor(relX / TILE_SIZE);
        const gridY = Math.floor(relY / TILE_SIZE);
        hoverGrid = { gridX, gridY };
      }
    });

    dropZone.addEventListener('dragleave', () => { hoverGrid = null; });

    dropZone.addEventListener('drop', (e) => {
      if (currentScene !== 1) return;
      e.preventDefault(); hoverGrid = null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const relX = (e.clientX - rect.left) * scaleX;
      const relY = (e.clientY - rect.top) * scaleY;

      if (relX >= 0 && relX < 360 && relY >= 0 && relY < 360) {
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

      if (relX >= 0 && relX < 360 && relY >= 0 && relY < 360) {
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
    playSound('jump');
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
      { id: 1, trap: TRAP_ITEMS[0], gridX: 3, gridY: 4, placedBy: 1 },
      { id: 2, trap: TRAP_ITEMS[8], gridX: 4, gridY: 5, placedBy: 2 }
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
    if (renderer3D) renderer3D.destroy();
  };
}
