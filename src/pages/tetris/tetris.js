/**
 * Tetris Battle 2P (Trace Battle) Page with Mobile Touch Controls & RWD
 */

import { navigate } from '../../router.js';
import { TetrisBattleGame, TETRIS_MODE } from '../../games/tetris/game-controller.js';
import { TetrisBoardRenderer } from '../../games/tetris/board-renderer.js';
import { RoomManager } from '../../network/room.js';
import { showToast } from '../../components/toast.js';
import { showModal, closeModal } from '../../components/modal.js';
import { SVG_ICONS } from '../../components/icons.js';

export async function renderTetris(container, params) {
  const mode = params.mode || 'ai'; // 'ai' or 'online'
  const game = new TetrisBattleGame();
  let renderer = null;
  let room = null;

  container.innerHTML = `
    <div class="tetris-page">
      <!-- Top Bar -->
      <div class="tetris-topbar">
        <button class="btn btn-ghost btn-sm" id="btn-back">
          ${SVG_ICONS.back} <span>大廳</span>
        </button>
        <div class="tetris-topbar-title">
          <span class="mode-badge">
            ${SVG_ICONS.cpu} TETRIS BATTLE 2P <span class="badge badge-info" style="font-size:10px;margin-left:6px;">WASM ENGINE</span>
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

        <!-- Mobile Touch Virtual Controller -->
        <div class="mobile-touch-controller glass">
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

  // Bind Mobile Touch Controls
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
    _setupOnlineMode(game, room);
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
  const rect = container.getBoundingClientRect();
  const width = Math.min(rect.width, 740);
  const height = Math.min(width * (540 / 740), 540);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
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
      <h4 class="action-title">BATTLE 2P ENGINE</h4>

      <div class="action-group">
        <label class="action-label">AI BOT DIFFICULTY</label>
        <div class="difficulty-selector">
          <button class="btn btn-sm btn-ghost difficulty-btn" data-diff="easy">初級</button>
          <button class="btn btn-sm btn-secondary difficulty-btn active" data-diff="medium">中級</button>
          <button class="btn btn-sm btn-ghost difficulty-btn" data-diff="master">大師 (WASM)</button>
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
      <h4 class="action-title">P2P REALTIME ROOM</h4>

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

function _setupOnlineMode(game, room) {
  room.onRoomStatus = (status) => {
    const statusEl = document.getElementById('connection-status');
    if (status === 'connected' || status === 'playing') {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--color-success);">${SVG_ICONS.check} 對手已連線</span>`;
      showToast('對手連線成功！', 'success');
    }
  };

  document.getElementById('btn-create-room')?.addEventListener('click', async () => {
    try {
      const roomId = await room.createRoom('Player', 1);
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
    if (result.winner === 'player') {
      title.textContent = 'VICTORY! (獲勝)';
    } else if (result.winner === 'opponent') {
      title.textContent = 'DEFEAT! (戰敗)';
    } else {
      title.textContent = 'DRAW (平手)';
    }
    reason.textContent = result.reason;
    overlay.style.display = 'flex';
  }
}

function _showSettingsModal() {
  showModal({
    title: 'WASM ENGINE & RULES',
    content: `
      <div style="font-size:0.875rem;display:flex;flex-direction:column;gap:0.5rem;">
        <p><strong>Core Engine:</strong> WebAssembly C Compiled Binary (tetris-engine.wasm)</p>
        <p><strong>Rules:</strong> Tetris Battle 2P (120s Match, KO System, Red Danger Gauge)</p>
        <p><strong>PWA Offline:</strong> Full Standalone Support</p>
      </div>
    `,
    actions: [{ text: '關閉', onClick: closeModal }],
  });
}
