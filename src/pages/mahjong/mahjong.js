/**
 * 🀄 台灣 16 張麻將 — GodGame UIUX Style Page
 * Features 4 Original Avatar Characters (Carrot, Veggie, Flute, Fridge),
 * Collapsible Chatbox, Speech Bubbles, event-driven rendering, text-rendered tiles (no emoji-font dependency),
 * per-player rivers & melds, claim panel (胡/碰/槓/吃), self-draw win & kong, and a settlement modal
 */

import { MahjongEngine, TILE_NAMES, BASE_POINTS, POINTS_PER_TAI } from '../../games/mahjong/mahjong-engine.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import './mahjong.css';

const CHAR_DIR = './assets/images/characters/';

// Engine seat order: 0 = you (bottom), 1 = right, 2 = top, 3 = left
const SEATS = [
  { slot: 'bottom', name: '🥕 蘿蔔寶貝', img: 'char_carrot.png' },
  { slot: 'right', name: '🧊 酷酷冰箱', img: 'char_fridge.png' },
  { slot: 'top', name: '🎵 竹笛精靈', img: 'char_flute.png' },
  { slot: 'left', name: '🥬 生菜寶寶', img: 'char_veggie.png' }
];

const QUICK_PHRASES = [
  { text: '打快一點啦~ 等到都發芽了！' },
  { text: '碰！這張我要啦！' },
  { text: '吃！正好湊成順子！' },
  { text: '慘了慘了... 這次牌真難打' },
  { text: '胡！單吊自摸大三元！' },
  { text: '承讓承讓！這局贏麻了~' }
];

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SUIT_CHARS = { M: '萬', T: '筒', S: '條' };
const HONOR_CHARS = { E: '東', S: '南', W: '西', N: '北', C: '中', F: '發', P: '' };
const FLOWER_CHARS = { H1: '春', H2: '夏', H3: '秋', H4: '冬', H5: '梅', H6: '蘭', H7: '竹', H8: '菊' };
const CLAIM_ORDER = { WIN: 4, KONG: 3, PONG: 2, CHOW: 1 };
const CLAIM_SHOUT = { WIN: '胡啦！', KONG: '槓！', PONG: '碰！', CHOW: '吃！' };

function tileFace(t) {
  if (t.length === 2 && SUIT_CHARS[t[1]]) {
    return { top: NUMERALS[Number(t[0]) - 1], bottom: SUIT_CHARS[t[1]], cls: `suit-${t[1].toLowerCase()}` };
  }
  if (FLOWER_CHARS[t]) return { top: FLOWER_CHARS[t], bottom: '', cls: 'flower' };
  const dragon = { C: 'dragon-c', F: 'dragon-f', P: 'dragon-p' }[t];
  return { top: HONOR_CHARS[t] ?? t, bottom: '', cls: dragon || 'wind' };
}

const tileHtml = (t, cls = '', attrs = '') => {
  const f = tileFace(t);
  return `<div class="mj-tile ${f.cls} ${cls}" title="${TILE_NAMES[t] || t}" ${attrs}><span class="mj-top">${f.top}</span>${f.bottom ? `<span class="mj-bottom">${f.bottom}</span>` : ''}</div>`;
};
const backHtml = (n) => '<div class="mj-tile back"></div>'.repeat(n);
const meldHtml = (m) => `<div class="mj-meld">${m.tiles.map((t, k) => (m.type === 'ANKONG' && (k === 0 || k === 3) ? backHtml(1) : tileHtml(t))).join('')}</div>`;

export async function renderMahjong(container, params = {}) {
  const engine = new MahjongEngine();
  let selected = null; // { idx, tile }
  let showTingHint = false;
  let handToken = 0;
  let settledToken = -1;
  const bubbleTimers = new Map();
  const startExpanded = window.innerWidth >= 1880;

  const oppSeatHtml = (idx) => {
    const s = SEATS[idx];
    const n = idx + 1;
    return `
      <div class="player-slot player-slot-${s.slot}" id="seat-p${n}">
        <div class="character-avatar-card">
          <div class="char-avatar-img joy" style="background-image:url('${CHAR_DIR}${s.img}');"></div>
          <div class="char-info-name">
            <span class="char-name">${s.name}</span>
            <span class="mj-seat-meta" id="p${n}-meta"></span>
          </div>
        </div>
        <div class="mj-opp-tiles">
          <div class="mj-backs" id="p${n}-tiles"></div>
          <div class="mj-melds" id="p${n}-melds"></div>
          <div class="mj-flower-count" id="p${n}-flowers"></div>
        </div>
        <div class="speech-bubble bubble-${s.slot}" id="bubble-p${n}"></div>
      </div>`;
  };

  container.innerHTML = `
    <div class="mahjong-page animate-fade-in">
      <!-- 📱 手機直屏旋轉提醒 (Rotate Device Notice) -->
      <div class="orientation-rotate-notice" id="mj-rotate-notice">
        <div class="rotate-icon-anim">📱🔄</div>
        <h3>卡洛特建議您旋轉手機！</h3>
        <p>為了獲得最佳 4 人麻將對局與手牌視野<br/>請將手機轉為<strong>「橫螢幕 (Landscape)」</strong>體驗喔！</p>
        <button class="btn btn-sm" id="btn-close-mj-notice">繼續以直畫面遊玩</button>
      </div>

      <!-- Top Bar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-mj-back" title="返回大廳">
            ${SVG_ICONS.back} <span class="hide-narrow">大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">🀄 台灣 16 張麻將<span class="hide-narrow"> (MAHJONG 16)</span></span>
            <span class="badge badge-warning hide-narrow">神來也對決風</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-mj-rules" title="規則說明">💡<span class="hide-narrow"> 規則說明</span></button>
          <button class="btn btn-ghost btn-sm" id="btn-chat-open" title="對話頻道">💬</button>
          <button class="btn btn-ghost btn-sm" id="btn-mj-restart" title="重新開局">
            ${SVG_ICONS.refresh}<span class="hide-narrow"> 發牌</span>
          </button>
        </div>
      </div>

      <!-- 🌿 Emerald Green Felt Mahjong Table -->
      <div class="mahjong-table">
        ${oppSeatHtml(2)}
        ${oppSeatHtml(3)}
        ${oppSeatHtml(1)}

        <!-- Center Table: info + per-player rivers -->
        <div class="mahjong-center-box">
          <div class="mahjong-dice-box" id="mj-info"></div>
          <div class="mj-rivers">
            <div class="mj-river river-top" id="river-p3"></div>
            <div class="mj-river river-left" id="river-p4"></div>
            <div class="mj-river river-right" id="river-p2"></div>
            <div class="mj-river river-bottom" id="river-p1"></div>
          </div>
        </div>

        <!-- Bottom Player Zone (P1 - 🥕 蘿蔔寶貝) -->
        <div class="player-bottom-zone">
          <div class="speech-bubble bubble-bottom" id="bubble-p1"></div>
          <div class="ting-hint-box game-popover" id="ting-hint-box" style="display:none;"></div>

          <div class="mj-hand-line">
            <div class="mj-melds mine" id="p1-melds"></div>
            <div class="player-hand-tiles" id="p1-hand-tiles"></div>
          </div>

          <div class="mj-hand-footer">
            <div class="player-p1-avatar-bar" id="seat-p1">
              <div class="char-avatar-img small joy" style="background-image:url('${CHAR_DIR}${SEATS[0].img}');"></div>
              <span class="p1-name">${SEATS[0].name} (你)</span>
              <span class="mj-seat-meta" id="p1-meta"></span>
              <span class="mj-my-flowers" id="p1-flowers"></span>
            </div>

            <!-- 動作控制按鈕區 -->
            <div class="mahjong-actions-bar" id="mj-actions-bar">
              <button class="btn-mj-action btn-mj-hu" id="btn-mj-hu" style="display:none;">🀄 自摸胡</button>
              <button class="btn-mj-action btn-mj-pong" id="btn-mj-kong" style="display:none;">槓</button>
              <button class="btn-mj-action btn-mj-discard" id="btn-mj-discard">🀄 打牌</button>
              <button class="btn-mj-action btn-mj-chow" id="btn-mj-hint" title="AI 建議打牌">💡 提示</button>
              <button class="btn-mj-action btn-mj-ting" id="btn-mj-ting">🔍 聽牌</button>
              <button class="btn-mj-action btn-mj-hu" id="btn-mj-next-inline" style="display:none;">▶ 下一局</button>
            </div>

            <!-- 吃碰槓胡 提示面板 -->
            <div class="mahjong-actions-bar claim-panel" id="mj-claim-panel" style="display:none;">
              <span class="claim-label" id="mj-claim-label"></span>
              <div class="claim-options" id="mj-claim-options"></div>
              <button class="btn-mj-action btn-mj-pass" id="btn-mj-pass-claim">過 (Pass)</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 💬 神來也風格：可縮放聊天對話框 -->
      <div class="godgame-chatbox ${startExpanded ? '' : 'collapsed'}" id="godgame-chatbox">
        <div class="chatbox-header">
          <span>💬 對話頻道 & 快捷發言</span>
          <button class="chatbox-toggle-btn" id="btn-toggle-chatbox" title="收合對話框">➖ 縮小</button>
        </div>
        <div class="chatbox-body">
          <div class="quick-phrases-grid">
            ${QUICK_PHRASES.map(p => `<button class="btn-quick-phrase" data-text="${p.text}">${p.text}</button>`).join('')}
          </div>
          <div class="chat-logs-list" id="chat-logs-list">
            <div class="chat-log-welcome">歡迎來到神來也麻將對決聊天室！點擊上方快捷話語直接發言。</div>
          </div>
          <form class="chat-custom-form" id="chat-custom-form">
            <input type="text" class="chat-custom-input" id="chat-custom-text" placeholder="輸入聊天內容..." maxlength="40" autocomplete="off" />
            <button type="submit" class="btn btn-sm btn-primary">送出</button>
          </form>
        </div>
      </div>

      <!-- Settlement Modal -->
      <div class="game-overlay" id="mj-settlement-modal" style="display:none;">
        <div class="game-overlay-card settle-card">
          <h2 id="mj-settle-title">🀄 胡牌結算</h2>
          <div id="mj-settle-body"></div>
          <div class="settle-actions">
            <button class="btn btn-ghost" id="btn-mj-close-settle">查看牌桌</button>
            <button class="btn btn-primary" id="btn-mj-next">${SVG_ICONS.refresh} 下一局</button>
          </div>
        </div>
      </div>

      <!-- Game Rules Modal (麻將教學) -->
      <div class="game-overlay" id="mj-rules-modal" style="display:none;">
        <div class="game-overlay-card rules-card">
          <h2>🀄 台灣 16 張麻將 遊戲規則</h2>
          <div class="rules-body">
            <p><strong>🔹 基本規則</strong></p>
            <p>每人開局 16 張牌（莊家 17 張），湊齊「5 副面子（順子或刻子）+ 1 對眼睛」共 17 張即為胡牌。牌牆保留 16 張不摸，摸到只剩 16 張仍無人胡牌即「流局」，莊家連莊。</p>
            <hr/>
            <p><strong>🔹 動作說明（優先順序：胡 > 碰/槓 > 吃）</strong></p>
            <p>• 吃牌 (Chow)：只能吃「上家」打出的牌，湊成順子。<br/>• 碰牌 (Pong)：任何人打出皆可碰。<br/>• 槓牌 (Kong)：明槓、暗槓、加槓後從牌尾補一張。<br/>• 胡牌 (Win)：別人打出（放槍）或自己摸到（自摸）皆可胡。</p>
            <hr/>
            <p><strong>🔹 台數 (Tai)</strong></p>
            <p>• 莊家 1 台、連莊每次 +2 台<br/>• 門清 1 台、自摸 1 台、門清自摸 3 台、全求人 2 台<br/>• 三元牌刻子各 1 台、小三元 4 台、大三元 8 台<br/>• 圈風 / 門風刻子各 1 台、小四喜 8 台、大四喜 16 台<br/>• 正花每張 1 台、春夏秋冬 / 梅蘭竹菊 2 台<br/>• 碰碰胡 4 台、混一色 4 台、清一色 8 台、字一色 16 台<br/>• 海底撈月 / 河底撈魚 1 台、槓上開花 1 台</p>
            <p>計分：每位付款者支付「底 ${BASE_POINTS} + 台數 × ${POINTS_PER_TAI}」，自摸由三家各付。</p>
          </div>
          <button class="btn btn-primary btn-block" id="btn-close-mj-rules">我了解了！</button>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const handBox = $('#p1-hand-tiles');

  // Helper: Speech Bubble
  const triggerSpeechBubble = (playerIdx, text) => {
    const bubbleEl = $(`#bubble-p${playerIdx + 1}`);
    if (!bubbleEl) return;
    bubbleEl.textContent = text;
    bubbleEl.classList.add('active');
    clearTimeout(bubbleTimers.get(playerIdx));
    bubbleTimers.set(playerIdx, setTimeout(() => bubbleEl.classList.remove('active'), 2600));
  };

  // Helper: Chat Log
  const addChatLog = (senderName, text) => {
    const logsEl = $('#chat-logs-list');
    if (!logsEl) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-log-item';
    const who = document.createElement('strong');
    who.textContent = `${senderName}: `;
    msgDiv.append(who, document.createTextNode(text));
    logsEl.appendChild(msgDiv);
    logsEl.scrollTop = logsEl.scrollHeight;
  };

  // Chatbox open / collapse
  const chatboxEl = $('#godgame-chatbox');
  $('#btn-toggle-chatbox')?.addEventListener('click', () => chatboxEl.classList.add('collapsed'));
  $('#btn-chat-open')?.addEventListener('click', () => chatboxEl.classList.toggle('collapsed'));

  container.querySelectorAll('.btn-quick-phrase').forEach(btn => {
    btn.onclick = () => {
      triggerSpeechBubble(0, btn.dataset.text);
      addChatLog('🥕 蘿蔔寶貝 (你)', btn.dataset.text);
    };
  });

  $('#chat-custom-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#chat-custom-text');
    const text = input?.value.trim();
    if (!text) return;
    triggerSpeechBubble(0, text);
    addChatLog('🥕 蘿蔔寶貝 (你)', text);
    input.value = '';
  });

  // Controls Binding
  $('#btn-mj-back')?.addEventListener('click', () => navigate('/'));
  $('#btn-close-mj-notice')?.addEventListener('click', () => {
    const notice = $('#mj-rotate-notice');
    if (notice) notice.style.display = 'none';
  });

  const hideSettlement = () => { $('#mj-settlement-modal').style.display = 'none'; };
  const resetHandUi = () => {
    handToken++;
    selected = null;
    showTingHint = false;
    $('#ting-hint-box').style.display = 'none';
    hideSettlement();
  };

  $('#btn-mj-restart')?.addEventListener('click', () => {
    resetHandUi();
    showToast('🀄 台灣 16 張麻將重新發牌開局！', 'success');
    engine.initGame(0, 0, { resetScores: true });
  });

  const nextHand = () => {
    resetHandUi();
    engine.startNextHand();
  };
  $('#btn-mj-next')?.addEventListener('click', nextHand);
  $('#btn-mj-next-inline')?.addEventListener('click', nextHand);
  $('#btn-mj-close-settle')?.addEventListener('click', hideSettlement);

  // Rules Modal Controls
  const rulesModal = $('#mj-rules-modal');
  $('#btn-mj-rules')?.addEventListener('click', () => { rulesModal.style.display = 'flex'; });
  $('#btn-close-mj-rules')?.addEventListener('click', () => { rulesModal.style.display = 'none'; });

  const isMyDiscardTurn = () => engine.phase === 'PLAY' && engine.currentTurn === 0 && engine.players[0].hand.length % 3 === 2;

  const discardSelected = () => {
    if (!isMyDiscardTurn()) {
      showToast('尚未輪到您的回合！', 'warning');
      return;
    }
    const hand = engine.players[0].hand;
    if (!selected || hand[selected.idx] !== selected.tile) {
      selected = null;
      showToast('請先點擊選擇一張手牌打出！', 'warning');
      renderUI();
      return;
    }
    const tile = selected.tile;
    selected = null;
    showTingHint = false;
    $('#ting-hint-box').style.display = 'none';
    triggerSpeechBubble(0, `打出 ${TILE_NAMES[tile]}！`);
    engine.discardTile(0, tile);
  };

  // Hand selection (event delegation survives re-renders); second tap on the same tile discards it
  handBox.addEventListener('click', (e) => {
    const el = e.target.closest('.mj-tile[data-idx]');
    if (!el) return;
    const idx = Number(el.dataset.idx);
    if (selected && selected.idx === idx && isMyDiscardTurn()) {
      discardSelected();
      return;
    }
    selected = { idx, tile: el.dataset.tile };
    renderUI();
  });

  $('#btn-mj-discard').addEventListener('click', discardSelected);

  $('#btn-mj-hint').addEventListener('click', () => {
    if (!isMyDiscardTurn()) {
      showToast('尚未輪到您的回合！', 'warning');
      return;
    }
    const tile = engine.suggestDiscard(0);
    selected = { idx: engine.players[0].hand.lastIndexOf(tile), tile };
    showToast(`💡 AI 建議打出：${TILE_NAMES[tile]}`, 'info');
    renderUI();
  });

  $('#btn-mj-hu').addEventListener('click', () => {
    if (engine.declareSelfDrawWin(0)) triggerSpeechBubble(0, '自摸！胡啦！');
  });

  $('#btn-mj-kong').addEventListener('click', () => {
    const opts = engine.getSelfKongOptions(0);
    if (!opts.length) return;
    selected = null;
    triggerSpeechBubble(0, '槓！');
    engine.declareSelfKong(0, opts[0]);
  });

  $('#mj-claim-options').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-opt]');
    if (!btn) return;
    const opt = engine.awaiting?.options[Number(btn.dataset.opt)];
    if (opt) triggerSpeechBubble(0, CLAIM_SHOUT[opt.type]);
    engine.executeHumanClaim(Number(btn.dataset.opt));
  });

  $('#btn-mj-pass-claim').addEventListener('click', () => engine.passHumanClaim());

  $('#btn-mj-ting').addEventListener('click', () => {
    showTingHint = !showTingHint;
    const tingBox = $('#ting-hint-box');
    if (!showTingHint) {
      tingBox.style.display = 'none';
      return;
    }
    const hints = engine.getTingHints(0);
    tingBox.innerHTML = hints.length === 0
      ? `<div class="ting-title">💡 目前尚未聽牌</div>`
      : `<div class="ting-title">💡 聽牌分析預測：</div>
        ${hints.map(h => `
          <div class="ting-row">打出 <strong>${TILE_NAMES[h.discardTile]}</strong> 聽：
            ${h.waitingTiles.map(w => `${TILE_NAMES[w.tile]}(剩${w.remaining}張)`).join('、')}
          </div>`).join('')}`;
    tingBox.style.display = 'block';
  });

  /** Shrinks tile size inside an area until its content fits (never hides tiles). */
  const shrinkToFit = (el, prop, min) => {
    let scale = 1;
    el.style.setProperty(prop, '1');
    while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && scale > min) {
      scale = Math.round((scale - 0.08) * 100) / 100;
      el.style.setProperty(prop, String(scale));
    }
  };

  /** Seat content (ignoring the absolutely positioned speech bubble) must fit its grid cell. */
  const fitSeat = (slot) => {
    const parts = [...slot.children].filter(c => !c.classList.contains('speech-bubble'));
    const overflows = () => {
      const box = slot.getBoundingClientRect();
      const rects = parts.map(p => p.getBoundingClientRect());
      const top = Math.min(...rects.map(r => r.top));
      const bottom = Math.max(...rects.map(r => r.bottom));
      const width = Math.max(...rects.map(r => r.width));
      return bottom - top > box.height + 1 || width > box.width + 1;
    };
    let scale = 1;
    slot.style.setProperty('--seat-scale', '1');
    while (overflows() && scale > 0.5) {
      scale = Math.round((scale - 0.08) * 100) / 100;
      slot.style.setProperty('--seat-scale', String(scale));
    }
  };

  const fitLayout = () => {
    container.querySelectorAll('.mj-river').forEach(el => shrinkToFit(el, '--river-scale', 0.45));
    container.querySelectorAll('.player-slot').forEach(fitSeat);
  };

  const renderUI = () => {
    const s = engine.getState();
    const me = s.players[0];
    const myDiscard = s.phase === 'PLAY' && s.currentTurn === 0 && me.handCount % 3 === 2;

    $('#mj-info').innerHTML = `
      <span>🌸 東風圈</span>
      <span>莊家：<strong>${SEATS[s.dealer].name}${s.consecutiveDealer ? ` 連${s.consecutiveDealer}` : ''}</strong></span>
      <span>剩牌：<strong id="mj-wall-count">${s.drawableRemaining}</strong> 張</span>`;

    s.players.forEach((p, idx) => {
      const n = idx + 1;
      $(`#seat-p${n}`)?.classList.toggle('is-turn', s.phase !== 'GAME_OVER' && s.currentTurn === idx);
      $(`#p${n}-meta`).textContent = `${p.seatWind}${idx === s.dealer ? '·莊' : ''} · ${p.score}`;
      $(`#p${n}-melds`).innerHTML = p.melds.map(meldHtml).join('');
      if (idx === 0) {
        $('#p1-flowers').innerHTML = p.flowers.map(f => tileHtml(f, 'flower-mini')).join('');
      } else {
        $(`#p${n}-tiles`).innerHTML = backHtml(p.handCount);
        const fl = $(`#p${n}-flowers`);
        fl.textContent = p.flowers.length ? `🌸×${p.flowers.length}` : '';
        fl.title = p.flowers.map(f => TILE_NAMES[f]).join(' ');
      }
      const river = s.discards[idx];
      $(`#river-p${n}`).innerHTML = river
        .map((t, k) => tileHtml(t, s.lastDiscard?.playerIdx === idx && k === river.length - 1 ? 'last-discard' : ''))
        .join('');
    });

    // Hand — the freshly drawn tile sits apart on the right
    const hand = me.hand;
    const drawnIdx = myDiscard && s.lastDrawn ? hand.lastIndexOf(s.lastDrawn) : -1;
    const order = hand.map((_, i) => i).filter(i => i !== drawnIdx);
    if (drawnIdx >= 0) order.push(drawnIdx);
    if (selected && hand[selected.idx] !== selected.tile) {
      const idx = hand.lastIndexOf(selected.tile);
      selected = idx >= 0 ? { idx, tile: selected.tile } : null;
    }
    handBox.innerHTML = order
      .map(i => tileHtml(hand[i], `${selected?.idx === i ? 'selected' : ''} ${i === drawnIdx ? 'drawn' : ''}`, `data-idx="${i}" data-tile="${hand[i]}"`))
      .join('');

    // Actions / claim panel
    const awaitingMe = s.awaiting?.playerIdx === 0;
    const gameOver = s.phase === 'GAME_OVER';
    $('#mj-actions-bar').style.display = awaitingMe ? 'none' : 'flex';
    $('#mj-claim-panel').style.display = awaitingMe ? 'flex' : 'none';
    $('#mj-actions-bar').classList.toggle('my-turn', myDiscard);
    $('#btn-mj-hu').style.display = s.canSelfDrawWin ? 'inline-flex' : 'none';
    $('#btn-mj-kong').style.display = s.selfKongOptions.length && !gameOver ? 'inline-flex' : 'none';
    ['#btn-mj-discard', '#btn-mj-hint', '#btn-mj-ting'].forEach(sel => {
      $(sel).style.display = gameOver ? 'none' : 'inline-flex';
    });
    $('#btn-mj-discard').classList.toggle('is-idle', !myDiscard || !selected);
    $('#btn-mj-hint').classList.toggle('is-idle', !myDiscard);
    $('#btn-mj-next-inline').style.display = gameOver ? 'inline-flex' : 'none';

    if (awaitingMe) {
      const tile = s.lastDiscard?.tile;
      $('#mj-claim-label').innerHTML = tile
        ? `💥 ${SEATS[s.lastDiscard.playerIdx].name} 打出 ${tileHtml(tile, 'claim-tile')}`
        : '💥 可執行動作：';
      const opts = s.awaiting.options
        .map((o, i) => ({ o, i }))
        .sort((a, b) => CLAIM_ORDER[b.o.type] - CLAIM_ORDER[a.o.type]);
      $('#mj-claim-options').innerHTML = opts.map(({ o, i }, rank) => `
        <button class="btn-mj-action ${o.type === 'WIN' ? 'btn-mj-hu' : o.type === 'CHOW' ? 'btn-mj-chow' : 'btn-mj-pong'}" data-opt="${i}" ${rank === 0 ? 'id="btn-mj-do-claim"' : ''}>
          ${o.type === 'WIN' ? '🀄 胡！' : o.type === 'KONG' ? '槓' : o.type === 'PONG' ? '碰' : `吃 ${o.tiles.map(t => tileFace(t).top).join('')}`}
        </button>`).join('');
    }

    requestAnimationFrame(fitLayout);
  };

  const scoresHtml = (s, r) => `
    <div class="settle-scores">
      ${s.players.map((p, i) => {
        const d = r.scoreChanges[i];
        return `<div class="settle-row ${i === 0 ? 'is-you' : ''}"><span>${SEATS[i].name}${i === 0 ? ' (你)' : ''}</span><span>${p.score}　<strong class="${d > 0 ? 'plus' : d < 0 ? 'minus' : ''}">${d > 0 ? '+' : ''}${d}</strong></span></div>`;
      }).join('')}
    </div>`;

  const showSettlement = () => {
    const s = engine.getState();
    const r = s.winningResult;
    if (!r || settledToken === handToken) return;
    settledToken = handToken;

    const title = $('#mj-settle-title');
    const body = $('#mj-settle-body');
    if (r.isDraw) {
      title.textContent = '🌊 流局（牌牆摸完）';
      body.innerHTML = `<div class="settle-winner">本局無人胡牌，${SEATS[s.dealer].name} 連莊。</div>${scoresHtml(s, r)}`;
    } else {
      title.textContent = r.winnerIdx === 0 ? '🎉 恭喜胡牌！' : '🀄 胡牌結算';
      let marked = false;
      const handTiles = r.winnerHand.map(t => {
        const isWin = !marked && t === r.winningTile;
        if (isWin) marked = true;
        return tileHtml(t, isWin ? 'win-tile' : '');
      }).join('');
      body.innerHTML = `
        <div class="settle-winner">${SEATS[r.winnerIdx].name}${r.winnerIdx === 0 ? ' (你)' : ''}
          ${r.isSelfDraw ? '自摸' : `胡牌（${SEATS[r.fromIdx].name} 放槍）`}</div>
        <div class="settle-hand">${r.winnerMelds.map(meldHtml).join('')}<div class="mj-meld concealed">${handTiles}</div></div>
        <div class="tai-list">
          ${r.taiDetails.map(d => `<div class="settle-row"><span>${d.name}</span><strong>${d.tai} 台</strong></div>`).join('')}
          <div class="settle-row total"><span>合計（每家付 ${BASE_POINTS} + ${r.totalTai}×${POINTS_PER_TAI}）</span><strong>${r.totalTai} 台</strong></div>
        </div>
        ${scoresHtml(s, r)}`;
      triggerSpeechBubble(r.winnerIdx, r.isSelfDraw ? '自摸！胡啦！' : '胡啦！');
    }
    $('#mj-settlement-modal').style.display = 'flex';
  };

  engine.onUpdate = (evt) => {
    if (evt.type === 'claim' && evt.playerIdx !== 0) triggerSpeechBubble(evt.playerIdx, CLAIM_SHOUT[evt.claim]);
    renderUI();
    if (evt.type === 'gameOver') setTimeout(showSettlement, 450);
  };

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderUI, 120);
  };
  window.addEventListener('resize', onResize);

  engine.initGame(0, 0, { resetScores: true });

  // Dev-only hook for the Playwright QA bot (scripts/qa) — reads state, actions still go through the UI
  if (import.meta.env.DEV) window.__carrotQA = { game: 'mahjong', engine: () => engine };

  return () => {
    engine.destroy();
    window.removeEventListener('resize', onResize);
    bubbleTimers.forEach(t => clearTimeout(t));
    if (window.__carrotQA?.game === 'mahjong') delete window.__carrotQA;
  };
}
