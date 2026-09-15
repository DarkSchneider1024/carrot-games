/**
 * Texas Hold'em Poker Game Page (德州撲克對局頁面)
 *
 * Happy Hues Fresh Cute Theme with Action Popovers, Turn Badges, side-pot aware results,
 * viewport-fitted table & Live Chat Battle Log. Rendering is driven by engine.onUpdate.
 */

import { navigate } from '../../router.js';
import { TexasHoldemEngine } from '../../games/poker/poker-engine.js';
import { makeAIDecision, AI_STYLES } from '../../games/poker/poker-ai.js';
import { showToast } from '../../components/toast.js';
import { showModal, closeModal } from '../../components/modal.js';
import { SVG_ICONS } from '../../components/icons.js';
import { initAuth, getUserProfile, updateUserChips, updateUserStats, getCurrentUser } from '../../network/auth-manager.js';

const STAGE_LABELS = {
  PREFLOP: 'PRE-FLOP 翻牌前',
  FLOP: 'FLOP 翻牌圈',
  TURN: 'TURN 轉牌圈',
  RIVER: 'RIVER 河牌圈',
  SHOWDOWN: 'SHOWDOWN 攤牌'
};
const VAL_MAP = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

const AI_SEATS = [
  { idx: 1, cls: 'seat-top-left', img: 'avatar_rabbit.png', alt: '兔兔', id: 'p1', name: '兔兔 (AI)' },
  { idx: 2, cls: 'seat-top-center', img: 'avatar_cat.png', alt: '貓咪', id: 'p2', name: '貓咪 (AI)' },
  { idx: 3, cls: 'seat-top-right', img: 'avatar_bear.png', alt: '熊熊', id: 'p3', name: '熊熊 (AI)' }
];

const cardHtml = (card, extra = '') => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return `<div class="poker-card ${isRed ? 'red' : 'black'} ${extra}" data-card="${card.id}">
    <span class="card-val">${VAL_MAP[card.value] || card.value}</span>
    <span class="card-suit">${card.suit}</span>
  </div>`;
};
const cardBackHtml = () => `<div class="poker-card card-back"><span>🥕</span></div>`;

export async function renderPoker(container, params) {
  const engine = new TexasHoldemEngine();

  initAuth();
  const user = getCurrentUser();
  const profile = getUserProfile();
  const isMember = !!(user && !user.isAnonymous);

  // Auto Rescue check if user has <= 0 chips
  let initialUserChips = 1000;
  if (isMember) {
    initialUserChips = (profile?.chips || 0) <= 0 ? await updateUserChips(1000) : profile.chips;
  }
  let currentBuyIn = 1000;
  let handStartChips = initialUserChips;
  let recordedHand = 0;

  const playerName = profile?.displayName ? `${profile.displayName} (你)` : '你 (玩家)';

  const seatHtml = ({ idx, cls, img, alt, name, style }) => `
    <div class="player-seat ${cls}" id="seat-${idx}">
      <div class="action-bubble" id="bubble-${idx}"></div>
      <div class="seat-badges" id="badges-${idx}"></div>
      <div class="poker-avatar ${idx === 0 ? 'avatar-user' : ''}">
        <img src="./assets/images/${img}" alt="${alt}" class="poker-avatar-img" />
      </div>
      <div class="seat-info">
        <span class="seat-name">${name}</span>
        ${style ? `<span class="seat-style">${style}</span>` : ''}
        <span class="seat-chips" id="chips-${idx}">$1000</span>
      </div>
      <div class="hole-cards" id="cards-${idx}"></div>
      <div class="seat-status" id="status-${idx}"></div>
    </div>`;

  container.innerHTML = `
    <div class="poker-page show-mobile-game">
      <!-- Top Bar -->
      <div class="poker-topbar">
        <button class="btn btn-ghost btn-sm" id="btn-back">
          ${SVG_ICONS.back} <span>大廳</span>
        </button>
        <div class="poker-topbar-title">
          <span class="mode-badge">🂡 TEXAS HOLD'EM<span class="hide-narrow"> POKER 德州撲克</span></span>
        </div>
        <div class="poker-topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-pwa-help" title="PWA 安裝指南">${SVG_ICONS.smartphone}</button>
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="規則說明">${SVG_ICONS.settings}</button>
        </div>
      </div>

      <!-- Mobile Navigation Tabs -->
      <div class="game-mobile-tabs">
        <button class="mobile-tab-btn" id="mtab-poker-setup">盲注與戰報</button>
        <button class="mobile-tab-btn active" id="mtab-poker-game">撲克檯面</button>
      </div>

      <div class="poker-main">
        <!-- Main Poker Table Stage -->
        <div class="poker-table-stage glass">
          <div class="table-center">
            <div class="pot-badge"><span>POT:</span> <strong id="pot-amount">$0</strong></div>
            <div class="community-cards" id="community-cards"></div>
            <div class="stage-name" id="stage-name">PRE-FLOP</div>
          </div>

          ${AI_SEATS.map(s => seatHtml({ ...s, style: AI_STYLES[s.id]?.label })).join('')}
          ${seatHtml({ idx: 0, cls: 'seat-bottom', img: 'avatar_user.png', alt: '玩家', name: playerName })}

          <!-- Winner Ribbon (sits under the board, never covers seats or cards) -->
          <div class="winner-banner" id="winner-banner" style="display:none;">
            <span id="winner-text"></span>
          </div>
        </div>

        <!-- Betting Control Action Bar -->
        <div class="poker-action-bar glass">
          <div class="poker-action-buttons">
            <button class="btn btn-secondary action-btn" id="pbtn-fold">棄牌 (FOLD)</button>
            <button class="btn btn-secondary action-btn" id="pbtn-check">過牌 (CHECK)</button>
            <button class="btn btn-cyan action-btn" id="pbtn-call">跟注 (CALL)</button>
            <button class="btn btn-primary action-btn" id="pbtn-raise">加注 (RAISE)</button>
            <button class="btn btn-primary action-btn" id="pbtn-raise-pot">底池加注</button>
            <button class="btn btn-primary action-btn btn-allin" id="pbtn-allin">ALL-IN</button>
            <button class="btn btn-primary action-btn" id="pbtn-next" style="display:none;">
              ${SVG_ICONS.refresh} 下一局 (NEXT HAND)
            </button>
          </div>
        </div>

        <!-- Stakes Selector Bar -->
        <div class="stakes-bar glass">
          <span class="stakes-title">盲注層級 (STAKES):</span>
          <div class="stakes-options">
            <button class="btn btn-ghost btn-xs stakes-btn" data-sb="5" data-bb="10" data-buyin="500" data-label="新手場">新手 $5/$10</button>
            <button class="btn btn-primary btn-xs stakes-btn active" data-sb="10" data-bb="20" data-buyin="1000" data-label="標準場">標準 $10/$20</button>
            <button class="btn btn-ghost btn-xs stakes-btn" data-sb="50" data-bb="100" data-buyin="5000" data-label="高額場">高額 $50/$100</button>
            <button class="btn btn-ghost btn-xs stakes-btn" data-sb="100" data-bb="200" data-buyin="10000" data-label="豪客場">豪客 $100/$200</button>
          </div>
        </div>

        <!-- Live Game Battle Action Log -->
        <div class="poker-log-box glass">
          <div class="log-header"><span>對戰即時動態 (GAME LOG)</span></div>
          <div class="log-content" id="poker-log-content"></div>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);

  engine.onLog = (msg, type) => {
    const logContent = $('#poker-log-content');
    if (!logContent) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `• ${msg}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
  };

  const onHandEnd = () => {
    if (recordedHand === engine.handNumber) return;
    recordedHand = engine.handNumber;
    const me = engine.players[0];
    Promise.resolve(updateUserStats('poker', { isWin: engine.winners.includes(0), netProfit: me.chips - handStartChips }))
      .catch(err => console.warn('[Poker] stats sync skipped', err));
    if (isMember) {
      Promise.resolve(updateUserChips(me.chips)).catch(err => console.warn('[Poker] chip sync skipped', err));
    }
  };

  const renderUI = () => {
    const legal = engine.getLegalActions(0);
    const me = engine.players[0];
    const handOver = engine.gameOver;
    const isShowdown = handOver && engine.roundStage === 'SHOWDOWN';

    $('#pot-amount').textContent = `$${engine.pot}`;
    const stageEl = $('#stage-name');
    stageEl.textContent = STAGE_LABELS[engine.roundStage] || engine.roundStage;
    stageEl.style.visibility = handOver ? 'hidden' : 'visible';

    // Winning five cards highlight
    const winIds = new Set();
    if (isShowdown) {
      engine.winners.forEach(i => engine.players[i].handEval?.cards.forEach(c => winIds.add(c.id)));
    }

    const board = [];
    for (let i = 0; i < 5; i++) {
      const card = engine.communityCards[i];
      board.push(card ? cardHtml(card, winIds.has(card.id) ? 'win-card' : '') : '<div class="card-slot empty"></div>');
    }
    $('#community-cards').innerHTML = board.join('');

    engine.players.forEach((p, idx) => {
      const seatEl = $(`#seat-${idx}`);
      const statusEl = $(`#status-${idx}`);
      const bubbleEl = $(`#bubble-${idx}`);
      $(`#chips-${idx}`).textContent = `$${p.chips}`;

      const isTurn = engine.currentTurnIdx === idx && !handOver;
      const isWinner = handOver && engine.winners.includes(idx);
      seatEl.classList.toggle('turn-active', isTurn);
      seatEl.classList.toggle('seat-winner', isWinner);
      seatEl.classList.toggle('seat-folded', p.folded);

      if (isTurn) {
        statusEl.innerHTML = `<span class="badge badge-warning turn-tag">${idx === 0 ? '💭 輪到你了' : '⏳ 思考中...'}</span>`;
      } else if (isShowdown && !p.folded && p.handEval) {
        statusEl.innerHTML = `<span class="seat-hand-name ${isWinner ? 'win' : ''}">${p.handEval.name.split(' ')[0]}</span>`;
      } else if (p.sittingOut) {
        statusEl.innerHTML = `<span class="status-folded">💤 休息中</span>`;
      } else if (p.folded) {
        statusEl.innerHTML = `<span class="status-folded">❌ 棄牌</span>`;
      } else if (p.isAllIn) {
        statusEl.innerHTML = `<span class="status-allin">🔥 ALL-IN</span>`;
      } else {
        statusEl.textContent = p.bet > 0 ? `注: $${p.bet}` : '';
      }

      const badges = [];
      if (idx === engine.dealerIdx) badges.push('<span class="pos-badge dealer">D</span>');
      if (idx === engine.sbIdx) badges.push('<span class="pos-badge">SB</span>');
      if (idx === engine.bbIdx) badges.push('<span class="pos-badge">BB</span>');
      $(`#badges-${idx}`).innerHTML = badges.join('');

      if (p.lastAction) {
        bubbleEl.textContent = p.lastAction.label;
        bubbleEl.className = `action-bubble active ${p.lastAction.type}`;
      } else {
        bubbleEl.className = 'action-bubble';
      }

      // Own cards always visible; opponents revealed only at a real showdown and only if still in the hand
      const cardsEl = $(`#cards-${idx}`);
      if (p.cards.length !== 2) {
        cardsEl.innerHTML = '';
      } else if (idx === 0 || (isShowdown && !p.folded)) {
        cardsEl.innerHTML = p.cards.map(c => cardHtml(c, winIds.has(c.id) && isWinner ? 'win-card' : '')).join('');
      } else if (p.folded) {
        cardsEl.innerHTML = '';
      } else {
        cardsEl.innerHTML = cardBackHtml() + cardBackHtml();
      }
    });

    // Action buttons
    const show = (sel, visible) => { $(sel).style.display = visible ? 'inline-flex' : 'none'; };
    const btnCall = $('#pbtn-call');
    const btnRaise = $('#pbtn-raise');
    const btnPot = $('#pbtn-raise-pot');
    const btnAllIn = $('#pbtn-allin');

    show('#pbtn-fold', !handOver);
    show('#pbtn-check', !handOver && legal.toCall === 0);
    show('#pbtn-call', !handOver && legal.toCall > 0);
    show('#pbtn-raise', !handOver);
    show('#pbtn-raise-pot', !handOver);
    show('#pbtn-allin', !handOver);
    show('#pbtn-next', handOver);

    $('#pbtn-fold').disabled = !legal.canAct;
    $('#pbtn-check').disabled = !legal.canCheck;
    btnCall.disabled = !legal.canCall;
    btnCall.textContent = legal.toCall > 0 ? `跟注 $${legal.callAmount} (CALL)` : '跟注 (CALL)';

    const potTo = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, engine.currentBet + engine.pot + legal.toCall));
    btnRaise.disabled = !legal.canRaise;
    btnRaise.textContent = legal.canRaise ? `${engine.currentBet === 0 ? '下注' : '加注到'} $${legal.minRaiseTo}` : '加注 (RAISE)';
    btnPot.disabled = !legal.canRaise || potTo <= legal.minRaiseTo;
    btnPot.textContent = legal.canRaise ? `底池 $${potTo}` : '底池加注';
    btnAllIn.disabled = !legal.canAllIn;
    btnAllIn.textContent = `ALL-IN $${me.chips}`;

    const banner = $('#winner-banner');
    if (handOver && engine.winnerMsg) {
      $('#winner-text').textContent = engine.winnerMsg;
      banner.style.display = 'flex';
      onHandEnd();
    } else {
      banner.style.display = 'none';
    }
  };

  engine.onUpdate = renderUI;
  engine.aiDecider = makeAIDecision;

  // Initialize Match Data
  engine.initMatch([
    { id: 'p0', name: playerName, isAI: false, chips: initialUserChips },
    { id: 'p1', name: '兔兔 (AI)', isAI: true, chips: 1000 },
    { id: 'p2', name: '貓咪 (AI)', isAI: true, chips: 1000 },
    { id: 'p3', name: '熊熊 (AI)', isAI: true, chips: 1000 }
  ]);

  // Mobile Viewport & Tab Switching System
  const pageContainer = $('.poker-page');
  const switchMobileTab = (tab) => {
    const setup = tab === 'setup';
    pageContainer.classList.toggle('show-mobile-setup', setup);
    pageContainer.classList.toggle('show-mobile-game', !setup);
    $('#mtab-poker-setup')?.classList.toggle('active', setup);
    $('#mtab-poker-game')?.classList.toggle('active', !setup);
  };
  $('#mtab-poker-setup')?.addEventListener('click', () => switchMobileTab('setup'));
  $('#mtab-poker-game')?.addEventListener('click', () => switchMobileTab('game'));

  // Bind Buttons
  const act = (action, amount) => () => {
    if (!engine.getLegalActions(0).canAct) return;
    if (!engine.playerAction(action, amount?.())) showToast('此動作目前無法執行', 'warning');
  };
  $('#pbtn-fold').addEventListener('click', act('FOLD'));
  $('#pbtn-check').addEventListener('click', act('CHECK'));
  $('#pbtn-call').addEventListener('click', act('CALL'));
  $('#pbtn-raise').addEventListener('click', act('RAISE', () => engine.getLegalActions(0).minRaiseTo));
  $('#pbtn-raise-pot').addEventListener('click', act('RAISE', () => {
    const l = engine.getLegalActions(0);
    return engine.currentBet + engine.pot + l.toCall;
  }));
  $('#pbtn-allin').addEventListener('click', act('ALLIN'));

  $('#pbtn-next').addEventListener('click', async () => {
    const me = engine.players[0];
    if (me.chips <= 0) {
      if (isMember) {
        me.chips = await updateUserChips(0);
      } else {
        me.chips = currentBuyIn;
        showToast(`💰 已發放救濟金 $${currentBuyIn}，繼續加油！`, 'info');
      }
    }
    handStartChips = me.chips;
    engine.startNewHand();
  });

  // Stakes Selector Event Handlers
  container.querySelectorAll('.stakes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.stakes-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary', 'active');

      const sb = parseInt(btn.dataset.sb, 10);
      const bb = parseInt(btn.dataset.bb, 10);
      const label = btn.dataset.label;
      currentBuyIn = parseInt(btn.dataset.buyin, 10) || currentBuyIn;

      const wasGameOver = engine.gameOver;
      engine.setStakes(sb, bb, label);
      showToast(wasGameOver
        ? `已切換盲注層級為【${label}】小盲 $${sb} / 大盲 $${bb}（籌碼金額延續）`
        : `已預約於本局結束後切換至【${label}】小盲 $${sb} / 大盲 $${bb}（當前對局與籌碼不受影響）`,
        wasGameOver ? 'success' : 'info');
      renderUI();
    });
  });

  $('#btn-back')?.addEventListener('click', () => navigate('/'));
  $('#btn-pwa-help')?.addEventListener('click', () => navigate('/pwa-guide'));
  $('#btn-settings')?.addEventListener('click', () => {
    showModal({
      title: '德州撲克對局規則',
      content: `
        <div style="font-size:0.875rem;display:flex;flex-direction:column;gap:0.5rem;">
          <p><strong>玩法：</strong> 無限注德州撲克 (No-Limit Texas Hold'em)，支援邊池 (Side Pot) 結算</p>
          <p><strong>盲注：</strong> 小盲注 $${engine.smallBlind} / 大盲注 $${engine.bigBlind}</p>
          <p><strong>加注：</strong> 最小加注為上一次加注幅度（至少一個大盲），可選底池加注或 ALL-IN</p>
          <p><strong>AI 對手：</strong> 兔兔（謹慎型）、貓咪（激進型）、熊熊（均衡型），依勝率模擬與底池賠率決策</p>
        </div>
      `,
      actions: [{ text: '關閉', onClick: closeModal }],
    });
  });

  // Dev-only hook for the Playwright QA bot (scripts/qa) — reads state, actions still go through the UI
  if (import.meta.env.DEV) window.__carrotQA = { game: 'poker', engine: () => engine };

  return () => {
    engine.destroy();
    if (window.__carrotQA?.game === 'poker') delete window.__carrotQA;
  };
}
