/**
 * Xiangqi Game Page (Tactical HUD Redesign)
 */

import { navigate } from '../../router.js';
import { XiangqiGame, GAME_MODE } from '../../games/xiangqi/game-controller.js';
import { RoomManager } from '../../network/room.js';
import { RED, BLACK } from '../../games/xiangqi/pieces.js';
import { showToast } from '../../components/toast.js';
import { showModal, closeModal } from '../../components/modal.js';
import { storage } from '../../storage/storage-manager.js';
import { SVG_ICONS } from '../../components/icons.js';

export async function renderXiangqi(container, params) {
  const mode = params.mode; // 'ai' or 'online'
  const game = new XiangqiGame();
  let room = null;

  container.innerHTML = `
    <div class="xiangqi-page">
      <!-- Top Tactical Bar -->
      <div class="xiangqi-topbar">
        <button class="btn btn-ghost btn-sm" id="btn-back">
          ${SVG_ICONS.back} <span>大廳</span>
        </button>
        <div class="xiangqi-topbar-title">
          <span class="mode-badge">
            ${mode === 'ai' ? SVG_ICONS.bot : SVG_ICONS.globe} 
            ${mode === 'ai' ? 'TACTICAL AI BATTLE' : 'P2P REALTIME ROOM'}
          </span>
        </div>
        <div class="xiangqi-topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="SETTINGS">
            ${SVG_ICONS.settings}
          </button>
        </div>
      </div>

      <!-- Main Game Workspace -->
      <div class="xiangqi-main">
        <!-- Left Panel: Stats & Move History -->
        <div class="xiangqi-panel xiangqi-panel-left">
          <!-- Opponent Player Card -->
          <div class="player-info glass" id="player-top">
            <div class="player-avatar avatar-black">將</div>
            <div class="player-details">
              <span class="player-name" id="player-top-name">黑方 (BLACK)</span>
              <span class="player-timer" id="timer-top">10:00</span>
            </div>
            <div class="player-turn-indicator" id="turn-top"></div>
          </div>

          <!-- Move History HUD -->
          <div class="move-history glass" id="move-history">
            <div class="move-history-header">
              <span class="move-history-title">MOVE LOG (對局紀錄)</span>
              <span class="badge badge-info" id="move-count-badge">0 MOVES</span>
            </div>
            <div class="move-list" id="move-list"></div>
          </div>

          <!-- Local Player Card -->
          <div class="player-info glass" id="player-bottom">
            <div class="player-avatar avatar-red">帥</div>
            <div class="player-details">
              <span class="player-name" id="player-bottom-name">紅方 (RED)</span>
              <span class="player-timer" id="timer-bottom">10:00</span>
            </div>
            <div class="player-turn-indicator active" id="turn-bottom"></div>
          </div>
        </div>

        <!-- Board Stage -->
        <div class="xiangqi-board-container" id="board-container">
          <div class="board-frame">
            <canvas id="xiangqi-canvas"></canvas>
          </div>

          <!-- AI Thinking Overlay -->
          <div class="ai-thinking" id="ai-thinking" style="display:none;">
            <div class="spinner"></div>
            <span>ENGINE CALCULATING...</span>
          </div>

          <!-- Game Over Modal Overlay -->
          <div class="game-over-overlay" id="game-over" style="display:none;">
            <div class="game-over-content glass">
              <h2 id="game-over-title">MATCH ENDED</h2>
              <p id="game-over-reason"></p>
              <div class="game-over-actions">
                <button class="btn btn-primary" id="btn-new-game">${SVG_ICONS.refresh} 再來一局</button>
                <button class="btn btn-secondary" id="btn-go-home">${SVG_ICONS.home} 回到大廳</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Tactical Controls & Room Sync -->
        <div class="xiangqi-panel xiangqi-panel-right">
          ${mode === 'ai' ? _renderAIPanel() : _renderOnlinePanel()}
        </div>
      </div>
    </div>
  `;

  // Canvas sizing based on outer container
  const canvas = document.getElementById('xiangqi-canvas');
  const outerContainer = document.getElementById('board-container');
  _resizeCanvas(canvas, outerContainer);

  // Initialize game controller
  game.init(canvas);

  // Set up game callbacks
  game.onStateChange = (state) => _updateUI(state, game);
  game.onGameOver = (result) => _showGameOver(result);
  game.onAIThinkingChange = (thinking) => {
    const el = document.getElementById('ai-thinking');
    if (el) el.style.display = thinking ? 'flex' : 'none';
  };

  // Handle window resize
  const resizeHandler = () => {
    _resizeCanvas(canvas, outerContainer);
    if (game.renderer) game.renderer.handleResize();
  };
  window.addEventListener('resize', resizeHandler);

  // Button listeners
  document.getElementById('btn-back')?.addEventListener('click', () => navigate('/'));

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    _showSettingsModal(game, mode);
  });

  document.getElementById('btn-new-game')?.addEventListener('click', () => {
    document.getElementById('game-over').style.display = 'none';
    if (mode === 'ai') {
      game.newGame({ mode: GAME_MODE.VS_AI, difficulty: game.aiDifficulty, playerSide: game.playerSide });
    }
  });

  document.getElementById('btn-go-home')?.addEventListener('click', () => navigate('/'));

  // Mode-specific setup
  if (mode === 'ai') {
    _setupAIMode(game);
  } else {
    room = new RoomManager(game);
    _setupOnlineMode(game, room);
  }

  // Cleanup handler
  return () => {
    window.removeEventListener('resize', resizeHandler);
    game.destroy();
    if (room) room.disconnect();
  };
}

function _resizeCanvas(canvas, outerContainer) {
  if (!outerContainer) return;
  const rect = outerContainer.getBoundingClientRect();
  const availableWidth = rect.width > 0 ? (rect.width - 20) : (window.innerWidth - 600);
  const availableHeight = (window.innerHeight * 0.78) - 40;
  
  // Calculate size so board is nicely proportioned (aspect ratio 9:10)
  const maxW = Math.min(availableWidth, availableHeight * (9 / 10));
  const size = Math.max(340, Math.min(maxW, 640));

  canvas.style.width = Math.round(size) + 'px';
  canvas.style.height = Math.round(size * (10 / 9)) + 'px';
}

function _renderAIPanel() {
  return `
    <div class="action-panel glass">
      <h4 class="action-title">ENGINE CONTROLS</h4>

      <div class="action-group">
        <label class="action-label">AI DIFFICULTY (難度)</label>
        <div class="difficulty-selector" id="difficulty-selector">
          <button class="btn btn-sm btn-ghost difficulty-btn" data-diff="easy">簡單</button>
          <button class="btn btn-sm btn-secondary difficulty-btn active" data-diff="medium">中等</button>
          <button class="btn btn-sm btn-ghost difficulty-btn" data-diff="hard">困難</button>
        </div>
      </div>

      <div class="action-group">
        <label class="action-label">SIDE (執子)</label>
        <div class="side-selector" id="side-selector">
          <button class="btn btn-sm btn-secondary side-btn active" data-side="red">紅方 (RED)</button>
          <button class="btn btn-sm btn-ghost side-btn" data-side="black">黑方 (BLACK)</button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="action-buttons">
        <button class="btn btn-secondary btn-sm" id="btn-undo">
          ${SVG_ICONS.undo} 悔棋 (UNDO)
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-restart">
          ${SVG_ICONS.refresh} 重置 (RESET)
        </button>
        <button class="btn btn-ghost btn-sm" id="btn-resign" style="color: var(--color-error);">
          ${SVG_ICONS.flag} 認輸 (RESIGN)
        </button>
      </div>

      <div class="divider"></div>

      <div class="game-status glass" id="game-status">
        <span class="status-text">紅方先行</span>
      </div>
    </div>
  `;
}

function _renderOnlinePanel() {
  return `
    <div class="action-panel glass">
      <h4 class="action-title">P2P ROOM SETUP</h4>

      <div class="connection-area" id="connection-area">
        <div class="connection-options">
          <button class="btn btn-primary" id="btn-create-room">
            ${SVG_ICONS.home} 建立房間 (HOST)
          </button>
          <div class="divider-text"><span>或</span></div>
          <div class="join-room-form">
            <input type="text" class="input" id="input-room-id" placeholder="6-DIGIT ROOM ID" maxlength="6" style="text-transform:uppercase;" />
            <button class="btn btn-cyan" id="btn-join-room">
              ${SVG_ICONS.link} 加入
            </button>
          </div>
        </div>
      </div>

      <div class="room-info" id="room-info" style="display:none;">
        <div class="room-id-display glass">
          <span class="room-label">ROOM CODE</span>
          <span class="room-id-text" id="room-id-text"></span>
          <button class="btn btn-ghost btn-sm" id="btn-copy-room" title="Copy Room ID">
            ${SVG_ICONS.copy}
          </button>
        </div>
        <div class="connection-status" id="connection-status">
          <span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>
          <span>等待對手加入...</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="action-buttons" id="online-actions" style="display:none;">
        <button class="btn btn-secondary btn-sm" id="btn-online-undo">
          ${SVG_ICONS.undo} 請求悔棋
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-online-draw">
          ${SVG_ICONS.handshake} 提議和棋
        </button>
        <button class="btn btn-ghost btn-sm" id="btn-online-resign" style="color: var(--color-error);">
          ${SVG_ICONS.flag} 認輸
        </button>
      </div>

      <div class="game-status glass" id="game-status">
        <span class="status-text">未連線</span>
      </div>
    </div>
  `;
}

function _setupAIMode(game) {
  game.newGame({ mode: GAME_MODE.VS_AI, difficulty: 'medium', playerSide: RED });

  // Difficulty selector
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-btn').forEach(b => {
        b.className = 'btn btn-sm btn-ghost difficulty-btn';
      });
      btn.className = 'btn btn-sm btn-secondary difficulty-btn active';
      game.aiDifficulty = btn.dataset.diff;
    });
  });

  // Side selector
  document.querySelectorAll('.side-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-btn').forEach(b => {
        b.className = 'btn btn-sm btn-ghost side-btn';
      });
      btn.className = 'btn btn-sm btn-secondary side-btn active';
      const side = btn.dataset.side === 'red' ? RED : BLACK;
      game.newGame({ mode: GAME_MODE.VS_AI, difficulty: game.aiDifficulty, playerSide: side });
    });
  });

  // Controls
  document.getElementById('btn-undo')?.addEventListener('click', () => {
    if (game.undo()) {
      showToast('已悔棋', 'info');
    }
  });

  document.getElementById('btn-restart')?.addEventListener('click', () => {
    game.newGame({ mode: GAME_MODE.VS_AI, difficulty: game.aiDifficulty, playerSide: game.playerSide });
    showToast('對局已重新開始', 'info');
  });

  document.getElementById('btn-resign')?.addEventListener('click', () => {
    showModal({
      title: '確認認輸？',
      content: '<p>確定要認輸本局遊戲嗎？</p>',
      actions: [
        { text: '取消', onClick: closeModal },
        { text: '確認認輸', class: 'btn-primary', onClick: () => { game.resign(); closeModal(); } },
      ],
    });
  });
}

function _setupOnlineMode(game, room) {
  room.onRoomStatus = (status, message) => {
    const statusEl = document.getElementById('connection-status');
    const roomInfo = document.getElementById('room-info');
    const connArea = document.getElementById('connection-area');
    const onlineActions = document.getElementById('online-actions');
    const statusText = document.querySelector('#game-status .status-text');

    switch (status) {
      case 'waiting':
        if (connArea) connArea.style.display = 'none';
        if (roomInfo) roomInfo.style.display = 'flex';
        if (statusEl) statusEl.innerHTML = `<span class="spinner" style="width:14px;height:14px;"></span><span>等待對手加入...</span>`;
        break;
      case 'connected':
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--color-success);">${SVG_ICONS.check} 對手已連線</span>`;
        break;
      case 'playing':
        if (onlineActions) onlineActions.style.display = 'flex';
        if (statusText) statusText.textContent = '戰鬥進行中';
        showToast('對手已連線，對局開始！', 'success');
        break;
      case 'disconnected':
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--color-error);">${SVG_ICONS.alert} ${message || '連線中斷'}</span>`;
        showToast(message || '對手已斷線', 'error');
        break;
      case 'error':
        showToast(message || '連線錯誤', 'error');
        break;
    }
  };

  room.onOpponentAction = (action) => {
    switch (action) {
      case 'undo_request':
        showModal({
          title: '對手請求悔棋',
          content: '<p>對手希望能悔棋一步，是否同意？</p>',
          actions: [
            { text: '拒絕', onClick: () => { room.rejectUndo(); closeModal(); } },
            { text: '同意', class: 'btn-primary', onClick: () => { room.acceptUndo(); closeModal(); } },
          ],
        });
        break;
      case 'undo_rejected':
        showToast('對手拒絕了悔棋請求', 'warning');
        break;
      case 'opponent_resigned':
        showToast('對手已認輸！勝利歸於你！', 'success');
        break;
      case 'draw_offer':
        showModal({
          title: '對手提議和棋',
          content: '<p>對手提議本局以和棋結束，是否同意？</p>',
          actions: [
            { text: '拒絕', onClick: () => { room.rejectUndo(); closeModal(); } },
            { text: '同意和棋', class: 'btn-primary', onClick: () => { closeModal(); showToast('雙方同意和棋', 'info'); } },
          ],
        });
        break;
      case 'draw_rejected':
        showToast('對手拒絕了和棋提議', 'warning');
        break;
    }
  };

  // Create Room
  document.getElementById('btn-create-room')?.addEventListener('click', async () => {
    try {
      const roomId = await room.createRoom('玩家', RED);
      const roomText = document.getElementById('room-id-text');
      if (roomText) roomText.textContent = roomId;
      showToast(`房間已建立: ${roomId}`, 'success');
    } catch (err) {
      showToast('建立房間失敗: ' + err.message, 'error');
    }
  });

  // Join Room
  document.getElementById('btn-join-room')?.addEventListener('click', async () => {
    const input = document.getElementById('input-room-id');
    const roomId = input ? input.value.trim() : '';
    if (!roomId || roomId.length < 4) {
      showToast('請輸入有效的 6 位數房間 ID', 'warning');
      return;
    }
    try {
      document.getElementById('connection-area').style.display = 'none';
      document.getElementById('room-info').style.display = 'flex';
      document.getElementById('room-id-text').textContent = roomId.toUpperCase();
      document.getElementById('connection-status').innerHTML = `<span class="spinner" style="width:14px;height:14px;"></span><span>連線中...</span>`;
      await room.joinRoom(roomId);
      showToast('已連線到房間', 'success');
    } catch (err) {
      showToast('加入失敗: ' + err.message, 'error');
      document.getElementById('connection-area').style.display = 'block';
      document.getElementById('room-info').style.display = 'none';
    }
  });

  // Copy Room ID
  document.getElementById('btn-copy-room')?.addEventListener('click', () => {
    const roomId = document.getElementById('room-id-text')?.textContent;
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        showToast('房間 ID 已複製到剪貼簿', 'success');
      });
    }
  });

  // Online Action buttons
  document.getElementById('btn-online-undo')?.addEventListener('click', () => {
    room.requestUndo();
    showToast('已發送悔棋請求', 'info');
  });

  document.getElementById('btn-online-draw')?.addEventListener('click', () => {
    room.offerDraw();
    showToast('已發送和棋提議', 'info');
  });

  document.getElementById('btn-online-resign')?.addEventListener('click', () => {
    showModal({
      title: '確認認輸？',
      content: '<p>確定要認輸本局嗎？</p>',
      actions: [
        { text: '取消', onClick: closeModal },
        { text: '確認認輸', class: 'btn-primary', onClick: () => { room.resign(); closeModal(); } },
      ],
    });
  });
}

function _updateUI(state, game) {
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const topIsBlack = game.playerSide === RED;

  const topTimer = document.getElementById('timer-top');
  const bottomTimer = document.getElementById('timer-bottom');
  const topName = document.getElementById('player-top-name');
  const bottomName = document.getElementById('player-bottom-name');
  const turnTop = document.getElementById('turn-top');
  const turnBottom = document.getElementById('turn-bottom');
  const moveCountBadge = document.getElementById('move-count-badge');

  if (topTimer && bottomTimer) {
    if (topIsBlack) {
      topTimer.textContent = formatTime(state.blackTime);
      bottomTimer.textContent = formatTime(state.redTime);
      topName.textContent = state.mode === GAME_MODE.VS_AI ? 'AI (黑方)' : '黑方 (OPPONENT)';
      bottomName.textContent = '你 (紅方)';
      turnTop.className = `player-turn-indicator ${state.currentTurn === BLACK ? 'active' : ''}`;
      turnBottom.className = `player-turn-indicator ${state.currentTurn === RED ? 'active' : ''}`;
    } else {
      topTimer.textContent = formatTime(state.redTime);
      bottomTimer.textContent = formatTime(state.blackTime);
      topName.textContent = state.mode === GAME_MODE.VS_AI ? 'AI (紅方)' : '紅方 (OPPONENT)';
      bottomName.textContent = '你 (黑方)';
      turnTop.className = `player-turn-indicator ${state.currentTurn === RED ? 'active' : ''}`;
      turnBottom.className = `player-turn-indicator ${state.currentTurn === BLACK ? 'active' : ''}`;
    }
  }

  // Update move list and count
  if (moveCountBadge && state.moveHistory) {
    moveCountBadge.textContent = `${state.moveHistory.length} MOVES`;
  }

  const moveList = document.getElementById('move-list');
  if (moveList && state.moveHistory) {
    moveList.innerHTML = state.moveHistory.map((m, i) => {
      const isRed = i % 2 === 0;
      const moveNum = Math.floor(i / 2) + 1;
      const prefix = isRed ? `<span class="move-num">${moveNum}.</span>` : '';
      return `<span class="move-item ${isRed ? 'move-red' : 'move-black'}">${prefix}${m.notation}</span>`;
    }).join('');
    moveList.scrollTop = moveList.scrollHeight;
  }

  // Update status text
  const statusText = document.querySelector('#game-status .status-text');
  if (statusText) {
    if (state.gameOver) {
      statusText.textContent = state.gameOverReason;
    } else if (state.aiThinking) {
      statusText.textContent = 'AI 引擎計算中...';
    } else {
      statusText.textContent = state.currentTurn === RED ? '紅方走棋 (RED TURN)' : '黑方走棋 (BLACK TURN)';
    }
  }
}

function _showGameOver(result) {
  const overlay = document.getElementById('game-over');
  const title = document.getElementById('game-over-title');
  const reason = document.getElementById('game-over-reason');

  if (overlay && title && reason) {
    if (result.winner === 'draw') {
      title.textContent = 'HANDSHAKE DRAW (和棋)';
    } else if (result.winner === 'red') {
      title.textContent = 'RED VICTORY (紅方勝)';
    } else {
      title.textContent = 'BLACK VICTORY (黑方勝)';
    }
    reason.textContent = result.reason;
    overlay.style.display = 'flex';
  }
}

function _showSettingsModal(game, mode) {
  showModal({
    title: 'SYSTEM CONFIGURATION',
    content: `
      <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.875rem;">
        <div><strong>Storage Driver:</strong> <span style="color:var(--color-accent-cyan);">${storage.getInfo().adapter || 'N/A'}</span></div>
        <div><strong>Game Mode:</strong> <span>${mode === 'ai' ? 'Minimax AI Engine' : 'WebRTC P2P DataChannel'}</span></div>
        <div><strong>Resolution:</strong> <span>HTML5 High-DPI Canvas</span></div>
      </div>
    `,
    actions: [
      { text: '關閉 (CLOSE)', onClick: closeModal },
    ],
  });
}
