/**
 * Fruit Havoc Page — Authentic Ultimate Chicken Horse Party Platformer
 * Implements Party Box Placement, Simultaneous Player Racing, Goldilocks Scoring (Too Easy/Too Hard rules), & Round Progressions.
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

  // Player Objects Array for Simultaneous Racing
  let players = [
    { id: 1, char: FRUIT_CHARACTERS[0], name: '玩家 1', keys: 'A D W', x: 80, y: 360, vx: 0, vy: 0, isGrounded: true, isDead: false, reached: false, score: 0, finishRank: 0 },
    { id: 2, char: FRUIT_CHARACTERS[1], name: '玩家 2', keys: '← → ↑', x: 100, y: 360, vx: 0, vy: 0, isGrounded: true, isDead: false, reached: false, score: 0, finishRank: 0 }
  ];

  let activePlacementPlayerIdx = 0; // 當前輪到哪位玩家擺放陷阱
  let selectedTrap = TRAP_ITEMS[0];
  let placedTraps = [
    { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 9, placedBy: 1 }, // 彈簧手套
    { id: 2, trap: TRAP_ITEMS[8], gridX: 8, gridY: 10, placedBy: 2 }  // 跳跳菇
  ];
  let hoverGrid = null;

  // Game Phase State: 'PLACEMENT' -> 'COUNTDOWN' -> 'RACE' -> 'ROUND_SUMMARY' -> 'MATCH_OVER'
  let gamePhase = 'PLACEMENT';
  let countdownSec = 3;
  let animFrameId = null;
  let isPeerConnected = false;

  // Key Input Listener States
  const keysState = {
    // P1 Controls (A, D, W)
    p1Left: false, p1Right: false, p1Jump: false,
    // P2 Controls (Left, Right, Up)
    p2Left: false, p2Right: false, p2Jump: false
  };

  const PLATFORMS = [
    { x: 40, y: 400, w: 160, h: 40 },  // 起點踏板
    { x: 240, y: 320, w: 120, h: 20 }, // 中間高台 1
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
            <span class="badge badge-warning">${mode === 'online' ? '🌐 WebRTC 連線對戰' : '👥 同屏對戰 (多玩家同時競速)'}</span>
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
        <!-- WebRTC PeerJS Room Control Bar -->
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

      <!-- Match Scoreboard & Progress Header -->
      <div class="scoreboard-bar glass" style="padding:12px 16px;border-radius:14px;background:var(--color-bg-card);display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="badge badge-info" id="round-counter-tag">輪次: 第 ${currentRound} / ${maxRounds} 輪</span>
          <span style="font-size:0.85rem;color:var(--color-text-secondary);font-weight:600;">目標得分：${targetScore} 分獲勝</span>
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

      <!-- Main Workspace -->
      <div class="fruit-havoc-main">
        <!-- Left Panel: Drag Trap Selection & Turn Status -->
        <aside class="fruit-panel-left" id="panel-left-sidebar">
          <div class="panel-card glass" style="background:#fff7ed;border-color:#fdba74;">
            <h4 class="panel-title" style="color:#ea580c;" id="turn-title">
              👉 當前擺放：${players[activePlacementPlayerIdx]?.char.icon} ${players[activePlacementPlayerIdx]?.name}
            </h4>
            <p style="font-size:0.8rem;color:#c2410c;margin:4px 0 0 0;" id="turn-desc">
              請從下方拖拉 1 個陷阱放置在地圖網格！
            </p>
          </div>

          <!-- Draggable Trap Selector (20 Traps) -->
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

        <!-- Right Panel: Stage Canvas & Race Controls -->
        <main class="fruit-stage-area glass">
          <div class="stage-header">
            <span class="badge badge-info" id="stage-phase-badge">階段 1：輪流擺放陷阱</span>
            <span class="stage-tip" id="stage-tip">🖐️ 請 ${players[activePlacementPlayerIdx]?.name} 拖拉道具放置地圖！</span>
          </div>

          <div class="canvas-wrapper" id="canvas-drop-zone">
            <canvas id="fruit-canvas" width="640" height="480"></canvas>

            <!-- Touch Controls for Mobile (同屏分區觸控) -->
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

            <!-- Overlay Action Button -->
            <div class="canvas-overlay-ui" id="canvas-overlay-ui">
              <button class="btn btn-primary btn-lg" id="btn-phase-toggle" style="background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;box-shadow:0 4px 16px rgba(255,117,68,0.4);">
                🚀 全員擺放完成！開跑同時競速
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  // Attach Navigation & PeerJS Listeners
  container.querySelector('#btn-back')?.addEventListener('click', () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    _removeKeyListeners();
    navigate('/');
  });
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('/guide?game=fruitHavoc'));

  // Player Count Selector Handler
  container.querySelector('#select-player-count')?.addEventListener('change', (e) => {
    playerCount = parseInt(e.target.value, 10);
    _reinitPlayers();
    _updateScoreboardUI();
    showToast(`對戰人數設定為 ${playerCount} 人！`, 'info');
  });

  function _reinitPlayers() {
    players = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: i + 1,
        char: FRUIT_CHARACTERS[i % FRUIT_CHARACTERS.length],
        name: `玩家 ${i + 1}`,
        keys: i === 0 ? 'A D W' : (i === 1 ? '← → ↑' : '自動'),
        x: 80 + i * 24,
        y: 360,
        vx: 0,
        vy: 0,
        isGrounded: true,
        isDead: false,
        reached: false,
        score: 0,
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
  // Simultaneous 2D Physics Platformer Racing Engine
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

  // Keyboard Event Listeners for Simultaneous 2P Control
  const onKeyDown = (e) => {
    if (gamePhase !== 'RACE') return;
    // P1 (A, D, W)
    if (['KeyA'].includes(e.code)) keysState.p1Left = true;
    if (['KeyD'].includes(e.code)) keysState.p1Right = true;
    if (['KeyW'].includes(e.code)) {
      if (!keysState.p1Jump) _playerJump(players[0]);
      keysState.p1Jump = true;
    }
    // P2 (Left, Right, Up)
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

  // Touch Controls Binding
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

  // Physics Loop (同時計算所有人座標與碰撞)
  let finishOrderCounter = 0;

  const updatePhysics = () => {
    if (gamePhase !== 'RACE') return;

    players.forEach((p, idx) => {
      if (p.isDead || p.reached) return;

      // Controller input assignment
      let isLeft = idx === 0 ? keysState.p1Left : (idx === 1 ? keysState.p2Left : false);
      let isRight = idx === 0 ? keysState.p1Right : (idx === 1 ? keysState.p2Right : false);

      // AI Auto Movement for P3/P4 if local
      if (idx >= 2) isRight = true;

      // Horizontal Acceleration
      if (isLeft) p.vx = -p.char.speed;
      else if (isRight) p.vx = p.char.speed;
      else p.vx *= 0.82;

      // Gravity
      p.vy += 0.55;

      p.x += p.vx;
      p.y += p.vy;

      // Boundaries
      if (p.x < 20) p.x = 20;
      if (p.x > 620) p.x = 620;

      // Platform Collision
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

      // Trap Interactions (蘑菇彈飛 / 電鋸陣亡)
      placedTraps.forEach(pt => {
        const tx = pt.gridX * TILE_SIZE + 20;
        const ty = pt.gridY * TILE_SIZE + 20;
        const dist = Math.hypot(p.x - tx, p.y - ty);

        if (dist < 28) {
          if (pt.trap.id === 9) { // 跳跳菇
            p.vy = -16;
            p.isGrounded = false;
          } else if (pt.trap.id === 1) { // 拳擊手套
            p.vx = 10;
            p.vy = -6;
          } else if (pt.trap.id === 2 || pt.trap.id === 8) { // 電鋸 / 刺球 -> 陣亡
            p.isDead = true;
            showToast(`💥 ${p.name} 踩中【${pt.trap.name}】陣亡！`, 'warning');

            // 陷阱放置者獲得陷阱殺敵分！
            const killerP = players.find(player => player.id === pt.placedBy);
            if (killerP && killerP.id !== p.id) {
              killerP.score += 1;
              _updateScoreboardUI();
            }
          }
        }
      });

      // Pitfall Death
      if (p.y > 470) {
        p.isDead = true;
        showToast(`🕳️ ${p.name} 掉入深淵陣亡！`, 'warning');
      }

      // Reached Goal Check 🏆
      if (p.x >= 520 && p.y <= 210) {
        p.reached = true;
        finishOrderCounter++;
        p.finishRank = finishOrderCounter;
        showToast(`🚩 ${p.name} 成功到達終點！(第 ${p.finishRank} 名)`, 'success');
      }
    });

    // Check if All Players finished or died -> Trigger Ultimate Chicken Horse Scoring
    const allEnded = players.every(p => p.isDead || p.reached);
    if (allEnded) {
      _evaluateChickenHorseScoring();
    }

    // Send 60 FPS Movement state if Online P2P
    if (mode === 'online' && isPeerConnected && players[0]) {
      sendMovementState(players[0].x, players[0].y, players[0].vx, players[0].vy, 'run');
    }
  };

  /**
   * Ultimate Chicken Horse Authentic Scoring Engine (黃金過難/過易 結算機制)
   */
  const _evaluateChickenHorseScoring = () => {
    gamePhase = 'ROUND_SUMMARY';
    const reachedPlayers = players.filter(p => p.reached);
    const totalCount = players.length;

    let summaryMsg = '';

    if (reachedPlayers.length === totalCount) {
      // 所有人通通到達 -> 太簡單！全體 0 分！
      summaryMsg = '❌ 本輪【全員皆到達終點】！關卡太簡單，所有玩家獲得 0 分！';
    } else if (reachedPlayers.length === 0) {
      // 所有人通通陣亡 -> 太難！全體 0 分！
      summaryMsg = '💥 本輪【全體陣亡無人到達】！關卡太危險，所有玩家獲得 0 分！';
    } else {
      // 部分人通過，部分人陣亡 -> 觸發標準結算得分！
      summaryMsg = '🏆 本輪關卡難易度適中！結算得分：\n';
      reachedPlayers.forEach(p => {
        let pts = 1; // 基礎通關分 +1
        if (p.finishRank === 1) pts += 1; // 第一名冠軍分 +1
        if (reachedPlayers.length === 1) pts += 2; // 獨自通關 Solo 分 +2

        p.score += pts;
        summaryMsg += `• ${p.char.icon} ${p.name}: +${pts} 分！\n`;
      });
    }

    _updateScoreboardUI();
    showToast(summaryMsg, 'info');

    // Check match winner or next round
    const winner = players.find(p => p.score >= targetScore);

    const phaseBtn = container.querySelector('#btn-phase-toggle');
    const phaseBadge = container.querySelector('#stage-phase-badge');

    if (winner) {
      gamePhase = 'MATCH_OVER';
      if (phaseBadge) phaseBadge.textContent = '🎉 比賽結束！冠軍出爐！';
      if (phaseBtn) {
        phaseBtn.style.display = 'block';
        phaseBtn.textContent = `👑 恭喜 ${winner.char.icon} ${winner.name} 贏得最終總冠軍！點擊重新開局`;
      }
    } else {
      if (currentRound >= maxRounds) {
        // Round Limit Reached -> 最高分獲勝
        const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
        gamePhase = 'MATCH_OVER';
        if (phaseBadge) phaseBadge.textContent = '🏁 已達最大輪次！結算總冠軍';
        if (phaseBtn) {
          phaseBtn.style.display = 'block';
          phaseBtn.textContent = `👑 8 輪結束！最高分 ${topPlayer.char.icon} ${topPlayer.name} (${topPlayer.score}分) 獲勝！`;
        }
      } else {
        // Advance to Next Round
        if (phaseBtn) {
          phaseBtn.style.display = 'block';
          phaseBtn.textContent = `進度：進入第 ${currentRound + 1} / ${maxRounds} 輪擺放階段`;
        }
      }
    }
  };

  // Main Render Loop
  const drawStage = () => {
    if (!ctx) return;

    // Clear & Grid
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

    // Platforms
    PLATFORMS.forEach(plat => {
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#ea580c';
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Goal Flag 🏆
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', 540, 180);
    ctx.fillText('🎂', 480, 180);

    // Draw All Placed Traps
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

    // Draw Hover Ghost
    if (gamePhase === 'PLACEMENT' && hoverGrid) {
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

    // Draw All Active Players
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

  // Drag & Drop Traps Event Handlers
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
      if (gamePhase !== 'PLACEMENT') return;
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

  // Drop Zone Event Handlers
  if (dropZone && canvas) {
    dropZone.addEventListener('dragover', (e) => {
      if (gamePhase !== 'PLACEMENT') return;
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
      if (gamePhase !== 'PLACEMENT') return;
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
          // 💥 炸彈道具：拆除該格地圖障礙！
          placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
          showToast(`💥 ${currentP.name} 炸毀拆除了位置 (${gridX}, ${gridY}) 的障礙物！`, 'warning');
        } else {
          // 一般陷阱擺放
          placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
          placedTraps.push({ id: Date.now(), trap: targetTrap, gridX, gridY, placedBy: currentP.id });
          showToast(`🎉 ${currentP.name} 成功拖放【${targetTrap.icon} ${targetTrap.name}】至 (${gridX}, ${gridY})！`, 'success');
        }

        // 輪流擺放邏輯：切換至下一個玩家擺放
        activePlacementPlayerIdx = (activePlacementPlayerIdx + 1) % players.length;
        _updateTurnUI();

        if (mode === 'online' && isPeerConnected) {
          sendTrapPlacement(gridX, gridY, targetTrap.id);
        }
      }
    });
  }

  // Phase Button Handler (進度流程推進按鈕)
  const phaseBtn = container.querySelector('#btn-phase-toggle');
  const phaseBadge = container.querySelector('#stage-phase-badge');
  const tipEl = container.querySelector('#stage-tip');
  const touchControls = container.querySelector('#mobile-touch-controls');

  if (phaseBtn) {
    phaseBtn.addEventListener('click', () => {
      if (gamePhase === 'PLACEMENT') {
        // 進入競速階段！所有人同時跑向終點
        gamePhase = 'RACE';
        resetAllPlayersPos();
        finishOrderCounter = 0;

        phaseBtn.style.display = 'none';
        if (phaseBadge) phaseBadge.textContent = `輪次 ${currentRound}: 全員同時競速開跑！`;
        if (tipEl) tipEl.textContent = '🎮 P1:【A/D/W】 | P2:【←/→/↑】同時跑向終點旗！';
        if (touchControls) touchControls.style.display = 'flex';

        showToast(`🚀 3, 2, 1, GO! 第 ${currentRound} 輪競速開跑！跑向終點旗 🏆`, 'success');
      } else if (gamePhase === 'ROUND_SUMMARY') {
        // 進入下一輪擺放進度
        currentRound++;
        gamePhase = 'PLACEMENT';
        activePlacementPlayerIdx = 0;
        resetAllPlayersPos();

        container.querySelector('#round-counter-tag').textContent = `輪次: 第 ${currentRound} / ${maxRounds} 輪`;
        if (phaseBadge) phaseBadge.textContent = `輪次 ${currentRound}: 擺放階段`;
        if (touchControls) touchControls.style.display = 'none';

        phaseBtn.textContent = '🚀 全員擺放完成！開跑同時競速';
        _updateTurnUI();
      } else if (gamePhase === 'MATCH_OVER') {
        // 重新開始全場比賽
        currentRound = 1;
        players.forEach(p => p.score = 0);
        gamePhase = 'PLACEMENT';
        activePlacementPlayerIdx = 0;
        placedTraps = [
          { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 9, placedBy: 1 },
          { id: 2, trap: TRAP_ITEMS[8], gridX: 8, gridY: 10, placedBy: 2 }
        ];

        _reinitPlayers();
        _updateScoreboardUI();
        resetAllPlayersPos();

        container.querySelector('#round-counter-tag').textContent = `輪次: 第 ${currentRound} / ${maxRounds} 輪`;
        if (phaseBadge) phaseBadge.textContent = '輪次 1: 擺放階段';
        if (touchControls) touchControls.style.display = 'none';

        phaseBtn.textContent = '🚀 全員擺放完成！開跑同時競速';
        _updateTurnUI();

        showToast('🔄 新局比賽重置完畢！開始第一輪擺放', 'info');
      }
    });
  }

  return () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    _removeKeyListeners();
  };
}
