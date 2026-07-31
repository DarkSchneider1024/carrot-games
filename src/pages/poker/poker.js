/**
 * Texas Hold'em Poker Game Page (德州撲克對局頁面)
 *
 * Happy Hues Fresh Cute Theme with Action Popovers, Turn Badges & Live Chat Battle Log
 */

import { navigate } from '../../router.js';
import { TexasHoldemEngine } from '../../games/poker/poker-engine.js';
import { makeAIDecision } from '../../games/poker/poker-ai.js';
import { RoomManager } from '../../network/room.js';
import { showToast } from '../../components/toast.js';
import { showModal, closeModal } from '../../components/modal.js';
import { SVG_ICONS } from '../../components/icons.js';

export async function renderPoker(container, params) {
  const mode = params.mode || 'ai'; // 'ai' or 'online'
  const engine = new TexasHoldemEngine();
  let room = null;

  container.innerHTML = `
    <div class="poker-page">
      <!-- Top Bar -->
      <div class="poker-topbar">
        <button class="btn btn-ghost btn-sm" id="btn-back">
          ${SVG_ICONS.back} <span>大廳</span>
        </button>
        <div class="poker-topbar-title">
          <span class="mode-badge">
            🂡 TEXAS HOLD'EM POKER 德州撲克
          </span>
        </div>
        <div class="poker-topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-pwa-help" title="PWA 安裝指南">
            ${SVG_ICONS.smartphone}
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="SETTINGS">
            ${SVG_ICONS.settings}
          </button>
        </div>
      </div>

      <!-- Main Poker Table Stage -->
      <div class="poker-main">
        <div class="poker-table-stage glass">
          <!-- Community Cards & Pot HUD -->
          <div class="table-center">
            <div class="pot-badge">
              <span>POT:</span> <strong id="pot-amount">$0</strong>
            </div>
            <div class="community-cards" id="community-cards">
              <div class="card-slot empty"></div>
              <div class="card-slot empty"></div>
              <div class="card-slot empty"></div>
              <div class="card-slot empty"></div>
              <div class="card-slot empty"></div>
            </div>
            <div class="stage-name" id="stage-name">PRE-FLOP</div>
          </div>

          <!-- Opponent Seat 1 (Top Left) -->
          <div class="player-seat seat-top-left" id="seat-1">
            <div class="action-bubble" id="bubble-1"></div>
            <div class="poker-avatar">
              <img src="/carrot-games/assets/images/avatar_rabbit.png" alt="兔兔" class="poker-avatar-img" />
            </div>
            <div class="seat-info">
              <span class="seat-name">兔兔 (AI)</span>
              <span class="seat-chips" id="chips-1">$1000</span>
            </div>
            <div class="hole-cards" id="cards-1"></div>
            <div class="seat-status" id="status-1"></div>
          </div>

          <!-- Opponent Seat 2 (Top Center) -->
          <div class="player-seat seat-top-center" id="seat-2">
            <div class="action-bubble" id="bubble-2"></div>
            <div class="poker-avatar">
              <img src="/carrot-games/assets/images/avatar_cat.png" alt="貓咪" class="poker-avatar-img" />
            </div>
            <div class="seat-info">
              <span class="seat-name">貓咪 (AI)</span>
              <span class="seat-chips" id="chips-2">$1000</span>
            </div>
            <div class="hole-cards" id="cards-2"></div>
            <div class="seat-status" id="status-2"></div>
          </div>

          <!-- Opponent Seat 3 (Top Right) -->
          <div class="player-seat seat-top-right" id="seat-3">
            <div class="action-bubble" id="bubble-3"></div>
            <div class="poker-avatar">
              <img src="/carrot-games/assets/images/avatar_bear.png" alt="熊熊" class="poker-avatar-img" />
            </div>
            <div class="seat-info">
              <span class="seat-name">熊熊 (AI)</span>
              <span class="seat-chips" id="chips-3">$1000</span>
            </div>
            <div class="hole-cards" id="cards-3"></div>
            <div class="seat-status" id="status-3"></div>
          </div>

          <!-- Main Local Player Seat (Bottom Center) -->
          <div class="player-seat seat-bottom" id="seat-0">
            <div class="action-bubble" id="bubble-0"></div>
            <div class="poker-avatar avatar-user">
              <img src="/carrot-games/assets/images/avatar_user.png" alt="玩家" class="poker-avatar-img" />
            </div>
            <div class="seat-info">
              <span class="seat-name">你 (玩家)</span>
              <span class="seat-chips" id="chips-0">$1000</span>
            </div>
            <div class="hole-cards" id="cards-0"></div>
            <div class="seat-status" id="status-0"></div>
          </div>

          <!-- Winner Banner -->
          <div class="winner-banner" id="winner-banner" style="display:none;">
            <span id="winner-text"></span>
          </div>
        </div>

        <!-- Stakes Selector Bar -->
        <div class="stakes-bar glass">
          <span class="stakes-title">💰 盲注層級 (STAKES):</span>
          <div class="stakes-options">
            <button class="btn btn-ghost btn-xs stakes-btn" data-sb="5" data-bb="10" data-buyin="500" data-label="新手場">
              🐣 新手 $5/$10
            </button>
            <button class="btn btn-primary btn-xs stakes-btn active" data-sb="10" data-bb="20" data-buyin="1000" data-label="標準場">
              ⚖️ 標準 $10/$20
            </button>
            <button class="btn btn-ghost btn-xs stakes-btn" data-sb="50" data-bb="100" data-buyin="5000" data-label="高額場">
              🚀 高額 $50/$100
            </button>
            <button class="btn btn-ghost btn-xs stakes-btn" data-sb="100" data-bb="200" data-buyin="10000" data-label="豪客場">
              🔥 豪客 $100/$200
            </button>
          </div>
        </div>

        <!-- Betting Control Action Bar -->
        <div class="poker-action-bar glass">
          <div class="poker-action-buttons">
            <button class="btn btn-secondary action-btn" id="pbtn-fold">棄牌 (FOLD)</button>
            <button class="btn btn-secondary action-btn" id="pbtn-check">過牌 (CHECK)</button>
            <button class="btn btn-cyan action-btn" id="pbtn-call">跟注 (CALL)</button>
            <button class="btn btn-primary action-btn" id="pbtn-raise">加注 (RAISE)</button>
            <button class="btn btn-primary action-btn" id="pbtn-next" style="display:none;">
              ${SVG_ICONS.refresh} 下一局 (NEXT HAND)
            </button>
          </div>
        </div>

        <!-- Live Game Battle Action Log / Chat Box -->
        <div class="poker-log-box glass">
          <div class="log-header">
            <span>📜 對戰即時動態 (GAME LOG)</span>
          </div>
          <div class="log-content" id="poker-log-content"></div>
        </div>
      </div>
    </div>
  `;

  // Attach Log Listener
  engine.onLog = (msg, type) => {
    const logContent = document.getElementById('poker-log-content');
    if (logContent) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      entry.textContent = `• ${msg}`;
      logContent.appendChild(entry);
      logContent.scrollTop = logContent.scrollHeight;
    }
  };

  // Initialize Match Data
  const initialPlayers = [
    { id: 'p0', name: '你 (玩家)', isAI: false, chips: 1000 },
    { id: 'p1', name: '兔兔 (AI)', isAI: true, chips: 1000 },
    { id: 'p2', name: '貓咪 (AI)', isAI: true, chips: 1000 },
    { id: 'p3', name: '熊熊 (AI)', isAI: true, chips: 1000 },
  ];

  engine.initMatch(initialPlayers);
  _updatePokerUI(engine);

  // Auto trigger AI turns if needed
  _checkAITurn(engine);

  // Bind Buttons
  document.getElementById('pbtn-fold')?.addEventListener('click', () => {
    if (engine.currentTurnIdx !== 0 || engine.gameOver) return;
    engine.playerAction('FOLD');
    _updatePokerUI(engine);
    _checkAITurn(engine);
  });

  document.getElementById('pbtn-check')?.addEventListener('click', () => {
    if (engine.currentTurnIdx !== 0 || engine.gameOver) return;
    engine.playerAction('CHECK');
    _updatePokerUI(engine);
    _checkAITurn(engine);
  });

  document.getElementById('pbtn-call')?.addEventListener('click', () => {
    if (engine.currentTurnIdx !== 0 || engine.gameOver) return;
    engine.playerAction('CALL');
    _updatePokerUI(engine);
    _checkAITurn(engine);
  });

  document.getElementById('pbtn-raise')?.addEventListener('click', () => {
    if (engine.currentTurnIdx !== 0 || engine.gameOver) return;
    engine.playerAction('RAISE');
    _updatePokerUI(engine);
    _checkAITurn(engine);
  });

  document.getElementById('pbtn-next')?.addEventListener('click', () => {
    engine.startNewHand();
    document.getElementById('winner-banner').style.display = 'none';
    document.getElementById('pbtn-next').style.display = 'none';
    _updatePokerUI(engine);
    _checkAITurn(engine);
  });

  // Stakes Selector Event Handlers
  document.querySelectorAll('.stakes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stakes-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary', 'active');

      const sb = parseInt(btn.dataset.sb, 10);
      const bb = parseInt(btn.dataset.bb, 10);
      const buyin = parseInt(btn.dataset.buyin, 10);
      const label = btn.dataset.label;

      engine.setStakes(sb, bb, buyin);
      const winnerBanner = document.getElementById('winner-banner');
      const nextBtn = document.getElementById('pbtn-next');
      if (winnerBanner) winnerBanner.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';

      _updatePokerUI(engine);
      showToast(`已切換至【${label}】小盲 $${sb} / 大盲 $${bb}（籌碼 $${buyin}）`, 'success');
      _checkAITurn(engine);
    });
  });

  document.getElementById('btn-back')?.addEventListener('click', () => navigate('/'));
  document.getElementById('btn-pwa-help')?.addEventListener('click', () => navigate('/pwa-guide'));
  document.getElementById('btn-settings')?.addEventListener('click', () => _showSettingsModal());

  return () => {};
}

function _checkAITurn(engine) {
  if (engine.gameOver) return;

  const currentP = engine.players[engine.currentTurnIdx];
  if (currentP && currentP.isAI && !currentP.folded && !currentP.isAllIn) {
    setTimeout(() => {
      makeAIDecision(engine, engine.currentTurnIdx);
      _updatePokerUI(engine);
      _checkAITurn(engine);
    }, 750);
  }
}

function _updatePokerUI(engine) {
  // Update Pot & Stage
  const potEl = document.getElementById('pot-amount');
  const stageEl = document.getElementById('stage-name');
  if (potEl) potEl.textContent = `$${engine.pot}`;
  if (stageEl) stageEl.textContent = engine.roundStage;

  // Render Community Cards
  const communityEl = document.getElementById('community-cards');
  if (communityEl) {
    communityEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const card = engine.communityCards[i];
      if (card) {
        communityEl.appendChild(_createCardEl(card));
      } else {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'card-slot empty';
        communityEl.appendChild(emptySlot);
      }
    }
  }

  // Local Player Turn Check
  const isMyTurn = engine.currentTurnIdx === 0 && !engine.gameOver;
  const localP = engine.players[0];
  const toCall = engine.currentBet - localP.bet;

  const btnFold = document.getElementById('pbtn-fold');
  const btnCheck = document.getElementById('pbtn-check');
  const btnCall = document.getElementById('pbtn-call');
  const btnRaise = document.getElementById('pbtn-raise');

  if (btnFold && btnCheck && btnCall && btnRaise) {
    if (!isMyTurn || localP.folded || localP.isAllIn) {
      btnFold.disabled = true;
      btnCheck.disabled = true;
      btnCall.disabled = true;
      btnRaise.disabled = true;
    } else {
      btnFold.disabled = false;
      btnRaise.disabled = false;

      if (toCall <= 0) {
        btnCheck.disabled = false;
        btnCheck.style.display = 'inline-flex';
        btnCall.style.display = 'none';
      } else {
        btnCheck.style.display = 'none';
        btnCall.disabled = false;
        btnCall.style.display = 'inline-flex';
        btnCall.textContent = `跟注 $${toCall} (CALL)`;
      }
    }
  }

  // Render Players & Hole Cards
  engine.players.forEach((p, idx) => {
    const chipsEl = document.getElementById(`chips-${idx}`);
    const statusEl = document.getElementById(`status-${idx}`);
    const cardsEl = document.getElementById(`cards-${idx}`);
    const seatEl = document.getElementById(`seat-${idx}`);
    const bubbleEl = document.getElementById(`bubble-${idx}`);

    if (chipsEl) chipsEl.textContent = `$${p.chips}`;

    // Update Seat Status & Turn Indicator
    if (seatEl) {
      if (engine.currentTurnIdx === idx && !engine.gameOver) {
        seatEl.classList.add('turn-active');
        if (statusEl) {
          statusEl.innerHTML = `<span class="badge badge-warning turn-tag">${idx === 0 ? '💭 輪到你了' : '⏳ 思考中...'}</span>`;
        }
      } else {
        seatEl.classList.remove('turn-active');
        if (statusEl) {
          if (p.folded) statusEl.innerHTML = `<span class="status-folded">❌ 棄牌 (FOLD)</span>`;
          else if (p.isAllIn) statusEl.innerHTML = `<span class="status-allin">🔥 ALL-IN</span>`;
          else if (p.bet > 0) statusEl.textContent = `注: $${p.bet}`;
          else statusEl.textContent = '';
        }
      }
    }

    // Update Action Bubble Popover
    if (bubbleEl) {
      if (p.lastAction) {
        bubbleEl.textContent = p.lastAction.label;
        bubbleEl.className = `action-bubble active ${p.lastAction.type}`;
      } else {
        bubbleEl.className = 'action-bubble';
      }
    }

    if (cardsEl) {
      cardsEl.innerHTML = '';
      if (p.cards.length === 2) {
        if (idx === 0 || engine.gameOver) {
          cardsEl.appendChild(_createCardEl(p.cards[0]));
          cardsEl.appendChild(_createCardEl(p.cards[1]));
        } else {
          cardsEl.appendChild(_createCardBackEl());
          cardsEl.appendChild(_createCardBackEl());
        }
      }
    }
  });

  // Handle Game Over / Showdown
  if (engine.gameOver) {
    const banner = document.getElementById('winner-banner');
    const winnerText = document.getElementById('winner-text');
    const nextBtn = document.getElementById('pbtn-next');

    if (banner && winnerText && nextBtn) {
      winnerText.textContent = engine.winnerMsg;
      banner.style.display = 'flex';
      nextBtn.style.display = 'inline-flex';
    }
  }
}

function _createCardEl(card) {
  const el = document.createElement('div');
  const isRed = card.suit === '♥' || card.suit === '♦';
  el.className = `poker-card ${isRed ? 'red' : 'black'}`;

  const valMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const valStr = valMap[card.value] || card.value;

  el.innerHTML = `
    <span class="card-val">${valStr}</span>
    <span class="card-suit">${card.suit}</span>
  `;
  return el;
}

function _createCardBackEl() {
  const el = document.createElement('div');
  el.className = 'poker-card card-back';
  el.innerHTML = `<span>🥕</span>`;
  return el;
}

function _showSettingsModal() {
  showModal({
    title: '德州撲克對局規則',
    content: `
      <div style="font-size:0.875rem;display:flex;flex-direction:column;gap:0.5rem;">
        <p><strong>玩法：</strong> 無限注德州撲克 (Texas Hold'em)</p>
        <p><strong>盲注：</strong> 小盲注 $10 / 大盲注 $20</p>
        <p><strong>對戰：</strong> 支援可愛 AI 電腦對決與線上好友連線開房</p>
      </div>
    `,
    actions: [{ text: '關閉', onClick: closeModal }],
  });
}
