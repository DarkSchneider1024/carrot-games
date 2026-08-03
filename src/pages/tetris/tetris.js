/**
 * Tetris Battle 2P (Trace Battle) Page with Mobile Virtual Joystick & RWD
 */

import { navigate } from '../../router.js';
import { TetrisBattleGame, TETRIS_MODE } from '../../games/tetris/game-controller.js';
import { TetrisBoardRenderer } from '../../games/tetris/board-renderer.js';
import { RoomManager } from '../../network/room.js';
import { showToast } from '../../components/toast.js';
import { showModal, closeModal } from '../../components/modal.js';
import { SVG_ICONS } from '../../components/icons.js';
import { initAuth, updateUserStats } from '../../network/auth-manager.js';

export async function renderTetris(container, params) {
  const mode = params.mode || 'ai'; // 'ai' or 'online'
  const game = new TetrisBattleGame();
  let renderer = null;
  let room = null;

  container.innerHTML = `
    <div class="tetris-page show-mobile-game">
      <!-- Top Bar -->
      <div class="tetris-topbar">
        <button class="btn btn-ghost btn-sm" id="btn-back">
          ${SVG_ICONS.back} <span>大廳</span>
        </button>
        <div class="tetris-topbar-title">
          <span class="mode-badge">
            ${SVG_ICONS.cpu} TETRIS BATTLE 雙人對決
          </span>
        </div>
        <div class="tetris-topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-pwa-help" title="PWA 安裝指南">
            ${SVG_ICONS.smartphone}
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="SETTINGS">
            ${SVG_ICONS.settings}
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Tabs -->
      <div class="game-mobile-tabs">
        <button class="mobile-tab-btn" id="mtab-tetris-setup">
          ⚙️ 模式與設定
        </button>
        <button class="mobile-tab-btn active" id="mtab-tetris-game">
          🎮 方塊對戰區
        </button>
      </div>

      <!-- Main Battle Workspace -->
      <div class="tetris-main">
        <!-- Stage Frame (Dual Boards) -->
        <div class="tetris-stage-container">
          <canvas id="tetris-canvas"></canvas>

          <!-- Match Over Overlay -->
          <div class="game-over-overlay" id="tetris-game-over" style="display:none;">
            <div class="game-over-content glass">
              <h2 id="tetris-result-title">MATCH ENDED</h2>
              <p id="tetris-result-reason"></p>
              <div class="game-over-actions">
                <button class="btn btn-primary" id="btn-tetris-restart">${SVG_ICONS.refresh} 再來一局</button>
                <button class="btn btn-secondary" id="btn-tetris-home">${SVG_ICONS.home} 回到大廳</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Single-Handed Virtual Controller & Joystick -->
        <div class="mobile-touch-controller glass">
          <!-- Controller Mode Bar -->
          <div class="ctrl-mode-bar">
            <button class="btn btn-sm ctrl-mode-btn active" id="btn-mode-joystick">
              🕹️ 單手搖桿 (JOYSTICK)
            </button>
            <button class="btn btn-sm ctrl-mode-btn" id="btn-mode-dpad">
              📱 虛擬按鍵 (D-PAD)
            </button>
          </div>

          <!-- Mode 1: Virtual Thumb Joystick View -->
          <div class="joystick-view" id="joystick-view">
            <!-- Left: Virtual Joystick -->
            <div class="joystick-base" id="joystick-base">
              <div class="joystick-knob" id="joystick-knob"></div>
              <span class="joy-guide top">↻</span>
              <span class="joy-guide left">←</span>
              <span class="joy-guide right">→</span>
              <span class="joy-guide bottom">↓</span>
            </div>

            <!-- Right: Action Buttons -->
            <div class="joystick-actions">
              <button class="btn btn-primary jaction-btn-harddrop" id="jbtn-harddrop">
                ⚡ 硬降 (DROP)
              </button>
              <div class="jaction-row">
                <button class="btn btn-cyan jaction-btn" id="jbtn-rot">↻ 旋轉</button>
                <button class="btn btn-secondary jaction-btn" id="jbtn-hold">HOLD</button>
              </div>
            </div>
          </div>

          <!-- Mode 2: Discrete D-Pad View -->
          <div class="dpad-view" id="dpad-view" style="display:none;">
            <div class="touch-row">
              <button class="btn btn-secondary touch-btn" id="tbtn-hold">HOLD</button>
              <button class="btn btn-secondary touch-btn" id="tbtn-rot-ccw">↺ 逆旋</button>
              <button class="btn btn-secondary touch-btn" id="tbtn-rot-cw">↻ 順旋</button>
            </div>
            <div class="touch-row">
              <button class="btn btn-secondary touch-btn" id="tbtn-left">← 左</button>
              <button class="btn btn-secondary touch-btn" id="tbtn-down">↓ 軟降</button>
              <button class="btn btn-secondary touch-btn" id="tbtn-right">右 →</button>
            </div>
            <div class="touch-row">
              <button class="btn btn-primary touch-btn touch-btn-harddrop" id="tbtn-harddrop">
                ⚡ 硬降 (HARD DROP)
              </button>
            </div>
          </div>
        </div>

        <!-- Controls Sidebar (Desktop & Tablet) -->
        <div class="tetris-sidebar">
          ${mode === 'ai' ? _renderAIPanel() : _renderOnlinePanel()}

          <!-- Keyboard Controls Guide -->
          <div class="controls-guide glass">
            <h4 class="guide-title">KEYBOARD CONTROLS</h4>
            <div class="guide-grid">
              <div class="guide-item"><span>[←] [→] / [A] [D]</span><span>左右移動</span></div>
              <div class="guide-item"><span>[↓] / [S]</span><span>軟降 (Soft Drop)</span></div>
              <div class="guide-item"><span>[↑] [W] [X]</span><span>順時針旋轉</span></div>
              <div class="guide-item"><span>[Z]</span><span>逆時針旋轉</span></div>
              <div class="guide-item"><span>[Space]</span><span>硬降 (Hard Drop)</span></div>
              <div class="guide-item"><span>[C] / [Shift]</span><span>Hold 暫存</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Canvas Responsive Setup
  const canvas = document.getElementById('tetris-canvas');
  _resizeCanvas(canvas);

  renderer = new TetrisBoardRenderer(canvas);
  renderer.resize();

  await game.init();

  // Callbacks
  game.onStateChange = (state) => {
    renderer.draw(state, game.engine, game.opponentBoard);
    _updateUIStats(state);
  };

  game.onGameOver = (result) => _showGameOverModal(result);

  // Resize handler
  const resizeHandler = () => {
    _resizeCanvas(canvas);
    renderer.resize();
    renderer.draw(game.getState(), game.engine, game.opponentBoard);
  };
  window.addEventListener('resize', resizeHandler);

  // Mobile Viewport & Tab Switching System
  const pageContainer = container.querySelector('.tetris-page');
  const mtabSetup = document.getElementById('mtab-tetris-setup');
  const mtabGame = document.getElementById('mtab-tetris-game');

  function switchMobileTab(tab) {
    if (tab === 'setup') {
      pageContainer.classList.add('show-mobile-setup');
      pageContainer.classList.remove('show-mobile-game');
      mtabSetup?.classList.add('active');
      mtabGame?.classList.remove('active');
    } else {
      pageContainer.classList.add('show-mobile-game');
      pageContainer.classList.remove('show-mobile-setup');
      mtabGame?.classList.add('active');
      mtabSetup?.classList.remove('active');
      requestAnimationFrame(() => {
        _resizeCanvas(canvas);
        if (renderer) renderer.resize();
      });
    }
  }

  mtabSetup?.addEventListener('click', () => switchMobileTab('setup'));
  mtabGame?.addEventListener('click', () => switchMobileTab('game'));

  // Controller Mode Switcher
  _setupControllerModeToggle();

  // Bind Virtual Joystick Controls
  _bindJoystickControls(game);

  // Bind Discrete D-Pad Controls
  _bindTouchControls(game);

  // Navigation handlers
  document.getElementById('btn-back')?.addEventListener('click', () => navigate('/'));
  document.getElementById('btn-pwa-help')?.addEventListener('click', () => navigate('/pwa-guide'));
  document.getElementById('btn-settings')?.addEventListener('click', () => _showSettingsModal());
  document.getElementById('btn-tetris-home')?.addEventListener('click', () => navigate('/'));
  document.getElementById('btn-tetris-restart')?.addEventListener('click', () => {
    document.getElementById('tetris-game-over').style.display = 'none';
    game.startMatch({ mode: mode === 'ai' ? TETRIS_MODE.VS_AI : TETRIS_MODE.VS_HUMAN_ONLINE, difficulty: game.difficulty });
  });

  if (mode === 'ai') {
    _setupAIMode(game);
  } else {
    room = new RoomManager(null);
    _setupOnlineMode(game, room, params);
  }

  game.startMatch({ mode: mode === 'ai' ? TETRIS_MODE.VS_AI : TETRIS_MODE.VS_HUMAN_ONLINE, difficulty: 'medium' });

  return () => {
    window.removeEventListener('resize', resizeHandler);
    game.destroy();
    if (room) room.disconnect();
  };
}

function _resizeCanvas(canvas) {
  const container = canvas.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const isMobile = window.innerWidth < 768;

  let width, height;
  if (isMobile) {
    // Fit within mobile viewport (leaves 210px for mobile joystick / controller)
    const availH = Math.min(window.innerHeight - 210, 420);
    height = Math.max(320, availH);
    const containerW = rect.width > 0 ? rect.width : (window.innerWidth - 24);
    width = Math.min(containerW, Math.floor(height * 0.82));
  } else {
    width = Math.min(rect.width > 0 ? rect.width : 740, 740);
    height = Math.min(width * (520 / 740), 520);
  }

  canvas.style.width = Math.round(width) + 'px';
  canvas.style.height = Math.round(height) + 'px';
}

function _setupControllerModeToggle() {
  const btnJoy = document.getElementById('btn-mode-joystick');
  const btnDpad = document.getElementById('btn-mode-dpad');
  const joyView = document.getElementById('joystick-view');
  const dpadView = document.getElementById('dpad-view');

  if (btnJoy && btnDpad) {
    btnJoy.addEventListener('click', () => {
      btnJoy.classList.add('active');
      btnDpad.classList.remove('active');
      joyView.style.display = 'flex';
      dpadView.style.display = 'none';
    });

    btnDpad.addEventListener('click', () => {
      btnDpad.classList.add('active');
      btnJoy.classList.remove('active');
      joyView.style.display = 'none';
      dpadView.style.display = 'flex';
    });
  }
}

function _bindJoystickControls(game) {
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  if (!base || !knob) return;

  let startX = 0, startY = 0;
  let moveInterval = null;
  let activeDir = null;
  let rotTriggered = false;

  const maxRadius = 38;

  const stopAutoRepeat = () => {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    activeDir = null;
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const rect = base.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
    rotTriggered = false;
    handleTouchMove(e);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    let dx = touch.clientX - startX;
    let dy = touch.clientY - startY;

    const distance = Math.hypot(dx, dy);
    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxRadius;
      dy = Math.sin(angle) * maxRadius;
    }

    knob.style.transform = `translate(${dx}px, ${dy}px)`;

    if (game.gameOver) return;

    // Direction threshold check
    let newDir = null;
    if (dx < -14) newDir = 'left';
    else if (dx > 14) newDir = 'right';
    else if (dy > 16) newDir = 'down';
    else if (dy < -20) newDir = 'up';

    if (newDir === 'up') {
      if (!rotTriggered) {
        rotTriggered = true;
        game.engine.rotate(1);
        game._notifyState();
      }
      stopAutoRepeat();
      return;
    }

    if (newDir !== activeDir) {
      stopAutoRepeat();
      activeDir = newDir;

      if (newDir === 'left') {
        game.engine.move(-1, 0);
        game._notifyState();
        moveInterval = setInterval(() => { game.engine.move(-1, 0); game._notifyState(); }, 90);
      } else if (newDir === 'right') {
        game.engine.move(1, 0);
        game._notifyState();
        moveInterval = setInterval(() => { game.engine.move(1, 0); game._notifyState(); }, 90);
      } else if (newDir === 'down') {
        game.engine.move(0, 1);
        game._notifyState();
        moveInterval = setInterval(() => { game.engine.move(0, 1); game._notifyState(); }, 50);
      }
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    knob.style.transform = `translate(0px, 0px)`;
    stopAutoRepeat();
    rotTriggered = false;
  };

  base.addEventListener('touchstart', handleTouchStart, { passive: false });
  base.addEventListener('touchmove', handleTouchMove, { passive: false });
  base.addEventListener('touchend', handleTouchEnd);
  base.addEventListener('touchcancel', handleTouchEnd);

  // Action Buttons
  const bindBtn = (id, fn) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const handler = (e) => {
      e.preventDefault();
      if (!game.gameOver) {
        fn();
        game._notifyState();
      }
    };
    btn.addEventListener('touchstart', handler, { passive: false });
    btn.addEventListener('click', handler);
  };

  bindBtn('jbtn-harddrop', () => game.doHardDrop());
  bindBtn('jbtn-rot', () => game.engine.rotate(1));
  bindBtn('jbtn-hold', () => game.engine.hold());
}

function _bindTouchControls(game) {
  const bindTouch = (id, fn) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const handler = (e) => {
      e.preventDefault();
      if (!game.gameOver) {
        fn();
        game._notifyState();
      }
    };
    btn.addEventListener('touchstart', handler, { passive: false });
    btn.addEventListener('click', handler);
  };

  bindTouch('tbtn-left', () => game.engine.move(-1, 0));
  bindTouch('tbtn-right', () => game.engine.move(1, 0));
  bindTouch('tbtn-down', () => game.engine.move(0, 1));
  bindTouch('tbtn-rot-cw', () => game.engine.rotate(1));
  bindTouch('tbtn-rot-ccw', () => game.engine.rotate(-1));
  bindTouch('tbtn-hold', () => game.engine.hold());
  bindTouch('tbtn-harddrop', () => game.doHardDrop());
}

function _renderAIPanel() {
  return `
    <div class="action-panel glass">
      <h4 class="action-title">AI 對戰設定</h4>

      <div class="action-group">
        <label class="action-label">AI 難度</label>
        <div class="difficulty-selector">
          <button class="btn btn-sm btn-ghost difficulty-btn" data-diff="easy">初級</button>
          <button class="btn btn-sm btn-secondary difficulty-btn active" data-diff="medium">中級</button>
          <button class="btn btn-sm btn-ghost difficulty-btn" data-diff="master">大師</button>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-primary" id="btn-start-match">
          ${SVG_ICONS.refresh} 重開 2 分鐘對決
        </button>
      </div>

      <div class="match-stats glass">
        <div class="stat-row"><span>PLAYER K.O.</span><strong id="stat-player-ko">0</strong></div>
        <div class="stat-row"><span>OPPONENT K.O.</span><strong id="stat-opp-ko">0</strong></div>
        <div class="stat-row"><span>LINES SENT</span><strong id="stat-sent">0</strong></div>
      </div>
    </div>
  `;
}

function _renderOnlinePanel() {
  return `
    <div class="action-panel glass">
      <h4 class="action-title">即時對戰房間</h4>

      <div class="connection-area" id="connection-area">
        <button class="btn btn-primary" id="btn-create-room">
          ${SVG_ICONS.home} 建立對戰房間 (HOST)
        </button>
        <div class="join-room-form" style="margin-top:8px;">
          <input type="text" class="input" id="input-room-id" placeholder="ROOM ID" maxlength="6" style="text-transform:uppercase;" />
          <button class="btn btn-cyan" id="btn-join-room">${SVG_ICONS.link} 加入</button>
        </div>
      </div>

      <div class="room-info" id="room-info" style="display:none;margin-top:8px;">
        <div class="room-id-display glass">
          <span class="room-id-text" id="room-id-text"></span>
          <button class="btn btn-ghost btn-sm" id="btn-copy-room">${SVG_ICONS.copy}</button>
        </div>
        <div class="connection-status" id="connection-status">
          <span class="spinner" style="width:14px;height:14px;"></span><span>等待對手...</span>
        </div>
      </div>

      <div class="match-stats glass" style="margin-top:12px;">
        <div class="stat-row"><span>PLAYER K.O.</span><strong id="stat-player-ko">0</strong></div>
        <div class="stat-row"><span>OPPONENT K.O.</span><strong id="stat-opp-ko">0</strong></div>
        <div class="stat-row"><span>LINES SENT</span><strong id="stat-sent">0</strong></div>
      </div>
    </div>
  `;
}

function _setupAIMode(game) {
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-btn').forEach(b => b.className = 'btn btn-sm btn-ghost difficulty-btn');
      btn.className = 'btn btn-sm btn-secondary difficulty-btn active';
      game.difficulty = btn.dataset.diff;
      game.startMatch({ mode: TETRIS_MODE.VS_AI, difficulty: game.difficulty });
    });
  });

  document.getElementById('btn-start-match')?.addEventListener('click', () => {
    game.startMatch({ mode: TETRIS_MODE.VS_AI, difficulty: game.difficulty });
    showToast('對決重新開始！', 'info');
  });
}

function _setupOnlineMode(game, room, params) {
  room.onRoomStatus = (status) => {
    const statusEl = document.getElementById('connection-status');
    if (status === 'connected' || status === 'playing') {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--color-success);">${SVG_ICONS.check} 對手已連線</span>`;
      showToast('對手連線成功！', 'success');
    }
  };

  document.getElementById('btn-create-room')?.addEventListener('click', async () => {
    try {
      const roomId = await room.createRoom('玩家', 1, 'tetris', '俄羅斯方塊');
      document.getElementById('room-id-text').textContent = roomId;
      document.getElementById('connection-area').style.display = 'none';
      document.getElementById('room-info').style.display = 'flex';
      showToast(`房間已建立: ${roomId}`, 'success');
    } catch (e) {
      showToast('建立失敗: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-join-room')?.addEventListener('click', async () => {
    const roomId = document.getElementById('input-room-id').value.trim();
    if (!roomId) return;
    try {
      await room.joinRoom(roomId);
      document.getElementById('connection-area').style.display = 'none';
      document.getElementById('room-info').style.display = 'flex';
      document.getElementById('room-id-text').textContent = roomId.toUpperCase();
    } catch (e) {
      showToast('加入失敗: ' + e.message, 'error');
    }
  });

  if (params && params.room) {
    const input = document.getElementById('input-room-id');
    if (input) input.value = params.room;
    setTimeout(() => {
      document.getElementById('btn-join-room')?.click();
    }, 300);
  }
}

function _updateUIStats(state) {
  const pKo = document.getElementById('stat-player-ko');
  const oKo = document.getElementById('stat-opp-ko');
  const sent = document.getElementById('stat-sent');

  if (pKo) pKo.textContent = state.playerKOs;
  if (oKo) oKo.textContent = state.opponentKOs;
  if (sent) sent.textContent = state.playerLinesSent;
}

function _showGameOverModal(result) {
  const overlay = document.getElementById('tetris-game-over');
  const title = document.getElementById('tetris-result-title');
  const reason = document.getElementById('tetris-result-reason');

  if (overlay && title && reason) {
    let isWin = false;
    if (result.winner === 'player') {
      title.textContent = 'VICTORY! (獲勝)';
      isWin = true;
    } else if (result.winner === 'opponent') {
      title.textContent = 'DEFEAT! (戰敗)';
    } else {
      title.textContent = 'DRAW (平手)';
    }
    updateUserStats('tetris', { isWin });
    reason.textContent = result.reason;
    overlay.style.display = 'flex';
  }
}

function _showSettingsModal() {
  showModal({
    title: '對戰規則說明',
    content: `
      <div style="font-size:0.875rem;display:flex;flex-direction:column;gap:0.5rem;">
        <p><strong>規則：</strong> 經典 2 分鐘 Tetris Battle 對決</p>
        <p><strong>勝負判定：</strong> 倒數計時結束比較 K.O. 擊倒數與攻擊消行數</p>
        <p><strong>特點：</strong> 支援單手搖桿與觸控操作</p>
      </div>
    `,
    actions: [{ text: '關閉', onClick: closeModal }],
  });
}
