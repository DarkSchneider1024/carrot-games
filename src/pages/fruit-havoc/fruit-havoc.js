/**
 * Fruit Havoc Page — 2D Party Trap Platformer (水果傷害 派對平台對戰)
 * Features Mario-style Manual Platformer Controls (鍵盤/手機親自控制跳躍跑跳), Drag & Drop Traps, & PeerJS DataChannel Sync.
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
    { id: 'strawberry', name: '草莓吉伊', icon: '🍓', img: './assets/images/char_strawberry_berry.png', trait: '速度型 (靈活移動)', speed: 4.8, jump: -11.5 },
    { id: 'banana', name: '香蕉烏薩奇', icon: '🍌', img: './assets/images/char_banana_usagi.png', trait: '高跳型 (超強二段跳)', speed: 4.2, jump: -13.5 },
    { id: 'melon', name: '哈密瓜小八', icon: '🍈', img: './assets/images/char_melon_hachi.png', trait: '均衡型 (穩健控球)', speed: 4.4, jump: -12.0 },
    { id: 'peach', name: '水桃栗饅頭', icon: '🍑', img: './assets/images/char_peach_kuriman.png', trait: '重裝型 (抗推霸體)', speed: 3.8, jump: -11.0 },
    { id: 'grape', name: '飛天葡萄飛鼠', icon: '🍇', img: './assets/images/char_grape_momonga.png', trait: '滑翔型 (空中滯空)', speed: 5.2, jump: -12.5 }
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
    { id: 20, name: '草莓蛋糕終點旗', icon: '🏆', desc: '率先抵達且通過考驗者勝' }
  ];

  let selectedChar = FRUIT_CHARACTERS[0];
  let selectedTrap = TRAP_ITEMS[0];
  let placedTraps = [
    { id: 1, trap: TRAP_ITEMS[0], gridX: 6, gridY: 9 }, // 彈簧手套
    { id: 2, trap: TRAP_ITEMS[8], gridX: 8, gridY: 10 }  // 跳跳菇
  ];
  let hoverGrid = null;

  // Game Phases: 'PLACEMENT' -> 'RACE' -> 'SCORED'
  let gamePhase = 'PLACEMENT';
  let isPeerConnected = false;
  let animFrameId = null;

  // 2D Physics Player State (Mario-style Platformer Controls)
  const localPlayer = {
    x: 80,
    y: 360,
    vx: 0,
    vy: 0,
    width: 32,
    height: 32,
    isGrounded: false,
    canDoubleJump: true,
    isDead: false,
    score: 0
  };

  const remotePlayer = {
    x: 80,
    y: 360,
    icon: '🍌',
    score: 0
  };
  const remoteTarget = { x: 80, y: 360, vx: 0, vy: 0 };

  // Key Input States (鍵盤操控)
  const keys = { left: false, right: false, jump: false, down: false };

  // Platform Boxes Definitions
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
            <span class="badge badge-warning">${mode === 'online' ? '🌐 WebRTC 即時對戰' : '👥 單機同屏 (玩家輪流擺放競速)'}</span>
          </div>
        </div>
        <div class="topbar-actions">
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

      <!-- Main Workspace -->
      <div class="fruit-havoc-main">
        <!-- Left Panel: Character & Drag Trap Selection -->
        <aside class="fruit-panel-left" id="panel-left-sidebar">
          <!-- Character Selector -->
          <div class="panel-card glass">
            <h4 class="panel-title">1. 選擇水果角色</h4>
            <div class="char-selector-grid">
              ${FRUIT_CHARACTERS.map(c => `
                <div class="char-select-item ${c.id === selectedChar.id ? 'active' : ''}" data-char-id="${c.id}">
                  <img src="${c.img}" alt="${c.name}" class="char-select-img" />
                  <span class="char-select-name">${c.name}</span>
                </div>
              `).join('')}
            </div>
            <div class="char-details-box" id="char-details-box">
              <strong id="cdetail-name">${selectedChar.name}</strong>
              <p id="cdetail-trait" style="font-size:0.8rem;color:#ea580c;margin:2px 0 6px 0;">${selectedChar.trait}</p>
              <div class="stat-bar"><span style="width:${selectedChar.speed * 15}%;"></span></div>
            </div>
          </div>

          <!-- Draggable Trap Selector (20 Traps) -->
          <div class="panel-card glass">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h4 class="panel-title">2. 擺放/炸毀陷阱 (20種)</h4>
              <span class="badge badge-warning" style="font-size:0.7rem;">拖拉放置 ✋</span>
            </div>
            <div class="trap-selector-grid">
              ${TRAP_ITEMS.map(t => `
                <div class="trap-select-item ${t.id === selectedTrap.id ? 'active' : ''}" 
                     draggable="true" 
                     data-trap-id="${t.id}" 
                     title="按住滑鼠拖拉此道具至右側地圖上！">
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
            <span class="badge badge-info" id="stage-phase-badge">階段：擺放陷阱階段</span>
            <span class="stage-tip" id="stage-tip">🖐️ 請拖拉道具放置地圖！完成後點擊按鈕開啟瑪利歐競速！</span>
          </div>

          <div class="canvas-wrapper" id="canvas-drop-zone">
            <canvas id="fruit-canvas" width="640" height="480"></canvas>

            <!-- Race Mode On-Screen Touch Controls (瑪利歐式手機觸控按鍵) -->
            <div class="mobile-touch-controls" id="mobile-touch-controls" style="display:none;">
              <div class="dpad-group">
                <button class="dpad-btn" id="tbtn-left">⬅️</button>
                <button class="dpad-btn" id="tbtn-right">➡️</button>
              </div>
              <button class="jump-btn" id="tbtn-jump">🦘 跳躍 (JUMP)</button>
            </div>

            <!-- Overlay Action Button -->
            <div class="canvas-overlay-ui" id="canvas-overlay-ui">
              <button class="btn btn-primary btn-lg" id="btn-phase-toggle" style="background:linear-gradient(135deg,#ff7544,#ff70a6);border:none;box-shadow:0 4px 16px rgba(255,117,68,0.4);">
                🚀 擺放完成！開始瑪利歐競速對戰
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

  // PeerJS WebRTC Setup
  const statusEl = container.querySelector('#peer-status-bar');

  if (mode === 'online') {
    const handleStatusChange = (status, msg) => {
      if (statusEl) {
        if (status === 'connected') {
          statusEl.innerHTML = `<span style="color:#16a34a;">${msg}</span>`;
          isPeerConnected = true;
          showToast('🟢 P2P 連線成功！即時移動與擺放數據傳送已就緒', 'success');
        } else if (status === 'waiting' || status === 'connecting') {
          statusEl.innerHTML = `<span style="color:#d97706;">${msg}</span>`;
        } else {
          statusEl.innerHTML = `<span style="color:#dc2626;">${msg}</span>`;
          isPeerConnected = false;
        }
      }
    };

    const handleDataReceive = (packet) => {
      if (packet.type === 'TRAP_PLACE') {
        const targetTrap = TRAP_ITEMS.find(t => t.id === packet.trapId);
        if (targetTrap) {
          placedTraps = placedTraps.filter(pt => !(pt.gridX === packet.gridX && pt.gridY === packet.gridY));
          placedTraps.push({ id: Date.now(), trap: targetTrap, gridX: packet.gridX, gridY: packet.gridY });
          showToast(`🌐 對手擺放了【${targetTrap.icon} ${targetTrap.name}】(${packet.gridX}, ${packet.gridY})`, 'info');
        }
      } else if (packet.type === 'MOVE') {
        remoteTarget.x = packet.x;
        remoteTarget.y = packet.y;
      }
    };

    container.querySelector('#btn-create-room')?.addEventListener('click', () => {
      const randomCode = 'HAVOC-' + Math.floor(1000 + Math.random() * 9000);
      const input = container.querySelector('#input-room-code');
      if (input) input.value = randomCode;
      initFruitPeer(randomCode, true, handleStatusChange, handleDataReceive);
    });

    container.querySelector('#btn-join-room')?.addEventListener('click', () => {
      const input = container.querySelector('#input-room-code');
      const code = input ? input.value.trim().toUpperCase() : '';
      if (!code) {
        showToast('請輸入對手的 4 位數房間代碼', 'warning');
        return;
      }
      const fullCode = code.startsWith('HAVOC-') ? code : 'HAVOC-' + code;
      initFruitPeer(fullCode, false, handleStatusChange, handleDataReceive);
    });
  }

  // ----------------------------------------------------
  // Mario 2D Physics Platformer Engine (瑪利歐式物理跳躍與操控)
  // ----------------------------------------------------
  const canvas = container.querySelector('#fruit-canvas');
  const dropZone = container.querySelector('#canvas-drop-zone');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const TILE_SIZE = 40;

  const resetPlayerPos = () => {
    localPlayer.x = 80;
    localPlayer.y = 360;
    localPlayer.vx = 0;
    localPlayer.vy = 0;
    localPlayer.isGrounded = true;
    localPlayer.canDoubleJump = true;
    localPlayer.isDead = false;
  };

  // Keyboard Events Listeners
  const onKeyDown = (e) => {
    if (gamePhase !== 'RACE') return;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
    if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
    if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
      if (!keys.jump) _handleJump();
      keys.jump = true;
    }
  };

  const onKeyUp = (e) => {
    if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
    if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) keys.jump = false;
  };

  const _handleJump = () => {
    if (localPlayer.isGrounded) {
      localPlayer.vy = selectedChar.jump;
      localPlayer.isGrounded = false;
      localPlayer.canDoubleJump = true;
    } else if (localPlayer.canDoubleJump) {
      localPlayer.vy = selectedChar.jump * 0.88;
      localPlayer.canDoubleJump = false;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const _removeKeyListeners = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  // Mobile Touch Controls
  const bindTouchButton = (btnId, keyName) => {
    const btn = container.querySelector(btnId);
    if (!btn) return;
    const start = (e) => {
      e.preventDefault();
      if (keyName === 'jump') {
        if (!keys.jump) _handleJump();
      }
      keys[keyName] = true;
    };
    const end = (e) => {
      e.preventDefault();
      keys[keyName] = false;
    };
    btn.addEventListener('touchstart', start);
    btn.addEventListener('touchend', end);
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
  };

  bindTouchButton('#tbtn-left', 'left');
  bindTouchButton('#tbtn-right', 'right');
  bindTouchButton('#tbtn-jump', 'jump');

  // Physics Loop (瑪利歐重力與加速度更新)
  const updatePhysics = () => {
    if (gamePhase !== 'RACE' || localPlayer.isDead) return;

    // Horizontal Movement
    if (keys.left) {
      localPlayer.vx = -selectedChar.speed;
    } else if (keys.right) {
      localPlayer.vx = selectedChar.speed;
    } else {
      localPlayer.vx *= 0.82; // Friction
    }

    // Apply Gravity
    localPlayer.vy += 0.55;

    // Apply Position
    localPlayer.x += localPlayer.vx;
    localPlayer.y += localPlayer.vy;

    // Canvas Boundaries
    if (localPlayer.x < 20) localPlayer.x = 20;
    if (localPlayer.x > 620) localPlayer.x = 620;

    // Platform Collisions
    localPlayer.isGrounded = false;
    PLATFORMS.forEach(plat => {
      if (
        localPlayer.x + 16 > plat.x &&
        localPlayer.x - 16 < plat.x + plat.w &&
        localPlayer.y + 16 >= plat.y &&
        localPlayer.y + 16 <= plat.y + plat.h + 10 &&
        localPlayer.vy >= 0
      ) {
        localPlayer.y = plat.y - 16;
        localPlayer.vy = 0;
        localPlayer.isGrounded = true;
        localPlayer.canDoubleJump = true;
      }
    });

    // Check Traps Collision (踩中蘑菇彈飛 / 電鋸陣亡)
    placedTraps.forEach(pt => {
      const tx = pt.gridX * TILE_SIZE + 20;
      const ty = pt.gridY * TILE_SIZE + 20;
      const dist = Math.hypot(localPlayer.x - tx, localPlayer.y - ty);

      if (dist < 28) {
        if (pt.trap.id === 9) { // 蘑菇超高彈飛
          localPlayer.vy = -16;
          localPlayer.isGrounded = false;
          showToast('🍄 踩中跳跳菇！向上猛烈彈飛！', 'info');
        } else if (pt.trap.id === 1) { // 拳擊手套打飛
          localPlayer.vx = 10;
          localPlayer.vy = -6;
        } else if (pt.trap.id === 2 || pt.trap.id === 8) { // 電鋸與刺球 -> 陣亡復位
          showToast('💥 觸碰電鋸障礙！陣亡重置位置', 'warning');
          resetPlayerPos();
        }
      }
    });

    // Pitfall Death
    if (localPlayer.y > 470) {
      showToast('🕳️ 掉入深淵地坑！重置回起點', 'warning');
      resetPlayerPos();
    }

    // Check Goal Flag Victory Condition (抵達終點旗 🏆)
    if (localPlayer.x >= 520 && localPlayer.y <= 210) {
      gamePhase = 'SCORED';
      showToast(`🏆 恭喜 ${selectedChar.name} 順利穿越所有陷阱成功抵達終點獲勝！`, 'success');

      const phaseBtn = container.querySelector('#btn-phase-toggle');
      if (phaseBtn) {
        phaseBtn.style.display = 'block';
        phaseBtn.textContent = '🎉 勝出！點擊開啟下一輪擺放';
      }
    }

    // Send 60 FPS P2P Movement Vector
    if (mode === 'online' && isPeerConnected) {
      sendMovementState(localPlayer.x, localPlayer.y, localPlayer.vx, localPlayer.vy, 'run');
    }
  };

  // Main Render Loop
  const drawStage = () => {
    if (!ctx) return;

    // Remote Lerp Interpolation
    remotePlayer.x += (remoteTarget.x - remotePlayer.x) * 0.3;
    remotePlayer.y += (remoteTarget.y - remotePlayer.y) * 0.3;

    // Background Grid
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

    // Draw Local Player Character (鍵盤操控之瑪利歐角色)
    ctx.font = '32px sans-serif';
    ctx.fillText(selectedChar.icon, localPlayer.x, localPlayer.y);

    // Draw Remote Player (Online Mode Only)
    if (mode === 'online' && isPeerConnected) {
      ctx.font = '30px sans-serif';
      ctx.fillText(remotePlayer.icon, remotePlayer.x, remotePlayer.y);
      ctx.fillStyle = '#0284c7';
      ctx.font = '11px sans-serif';
      ctx.fillText('對手 (P2P)', remotePlayer.x, remotePlayer.y - 24);
    }
  };

  const gameLoop = () => {
    updatePhysics();
    drawStage();
    animFrameId = requestAnimationFrame(gameLoop);
  };

  animFrameId = requestAnimationFrame(gameLoop);

  // Character Selector Event Handlers
  container.querySelectorAll('.char-select-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.char-select-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const charId = item.dataset.charId;
      selectedChar = FRUIT_CHARACTERS.find(c => c.id === charId);

      const nameEl = container.querySelector('#cdetail-name');
      const traitEl = container.querySelector('#cdetail-trait');
      if (nameEl) nameEl.textContent = selectedChar.name;
      if (traitEl) traitEl.textContent = selectedChar.trait;

      showToast(`已選擇角色：${selectedChar.name}`, 'info');
    });
  });

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

        placedTraps = placedTraps.filter(pt => !(pt.gridX === gridX && pt.gridY === gridY));
        placedTraps.push({ id: Date.now(), trap: targetTrap, gridX, gridY });

        showToast(`🎉 成功拖放放置【${targetTrap.icon} ${targetTrap.name}】至 (${gridX}, ${gridY})！`, 'success');

        if (mode === 'online' && isPeerConnected) {
          sendTrapPlacement(gridX, gridY, targetTrap.id);
        }
      }
    });
  }

  // Phase Toggle Button Handler (切換「擺放」與「瑪利歐親自操控競速」階段)
  const phaseBtn = container.querySelector('#btn-phase-toggle');
  const phaseBadge = container.querySelector('#stage-phase-badge');
  const tipEl = container.querySelector('#stage-tip');
  const touchControls = container.querySelector('#mobile-touch-controls');

  if (phaseBtn) {
    phaseBtn.addEventListener('click', () => {
      if (gamePhase === 'PLACEMENT' || gamePhase === 'SCORED') {
        // 開啟瑪利歐親自操控競速階段
        gamePhase = 'RACE';
        resetPlayerPos();

        phaseBtn.style.display = 'none'; // 隱藏按鈕防干擾
        if (phaseBadge) phaseBadge.textContent = '階段：瑪利歐式競速操作中！';
        if (tipEl) tipEl.textContent = '🎮 請使用鍵盤【A D / ← →】左右移動、【W / Space / ↑】跳躍越過陷阱！';
        if (touchControls) touchControls.style.display = 'flex';

        showToast(`🎮 競速開始！使用鍵盤 A/D/Space 或畫面上按鈕親自操控 ${selectedChar.name}！`, 'success');
      }
    });
  }

  return () => {
    closeFruitPeer();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    _removeKeyListeners();
  };
}
