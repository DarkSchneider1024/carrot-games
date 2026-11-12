/**
 * ♠ 台灣大老二 (Taiwan Big Two — GodGame 3D UIUX Style Page)
 * Features 4 Characters with Dynamic 4 Emotion Poses (Joy, Angry, Sad, Happy),
 * Three3D Cards Effect, event-driven rendering, smart AI hint & viewport-fitted responsive table
 */

import { BigTwoEngine, SUIT_NAMES, HAND_TYPES, HAND_TYPE_NAMES } from '../../games/big-two/big-two-engine.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { updateUserChips, getUserProfile } from '../../network/auth-manager.js';
import { Live2dAvatar, LIVE2D_CHARACTERS } from '../../components/live2d-avatar/live2d-avatar.js';
import './big-two.css';

const CHAR_DIR = './assets/images/characters/';

// Live2D 角色庫 (Card & Board Games 專屬)
export const LIVE2D_ROSTER = {
  carrot: { id: 'carrot', name: '新卡洛特', img: 'live2d_carrot.png', intro: '卡洛特學院的首席魔法學者' },
  carol: { id: 'carol', name: '新卡洛兒', img: 'live2d_carol.png', intro: '活潑甜美的卡洛特家族守護者' },
  aubergine: { id: 'aubergine', name: '新歐蓓樂希', img: 'live2d_aubergine.png', intro: '精通古代星象與牌理的黑髮教授' },
  bobo: { id: 'bobo', name: '兔子波波', img: 'live2d_bobo.png', intro: '軟萌敏捷的小小冒險家' },
  frenchie: { id: 'frenchie', name: '可頌', img: 'live2d_frenchie.png', intro: '沉著冷靜的法式鬥牛犬紳士' },
  kiwi: { id: 'kiwi', name: '奇異貓', img: 'live2d_kiwi.png', intro: '圍著胡蘿蔔圍巾的機靈小美短' }
};

// Engine seat order: 0 = you (bottom), 1 = right, 2 = top, 3 = left
const SEATS = [
  { slot: 'bottom', charId: 'carrot', name: LIVE2D_ROSTER.carrot.name, img: LIVE2D_ROSTER.carrot.img },
  { slot: 'right', charId: 'bobo', name: LIVE2D_ROSTER.bobo.name, img: LIVE2D_ROSTER.bobo.img },
  { slot: 'top', charId: 'aubergine', name: LIVE2D_ROSTER.aubergine.name, img: LIVE2D_ROSTER.aubergine.img },
  { slot: 'left', charId: 'carol', name: LIVE2D_ROSTER.carol.name, img: LIVE2D_ROSTER.carol.img }
];

const QUICK_PHRASES = [
  { text: '打快一點，等得胡蘿蔔都要發芽了！', emotion: 'angry' },
  { text: '出牌！看我的厲害！', emotion: 'joy' },
  { text: '這局可不會輕易認輸！', emotion: 'happy' },
  { text: '這次摸到的手牌真是不順...', emotion: 'sad' },
  { text: '誰都別想壓過這張大牌！', emotion: 'angry' },
  { text: '承讓承讓，今天手氣正好！', emotion: 'happy' }
];

const cardHtml = (c, extraClass = '') => {
  const color = ['H', 'D'].includes(c.suit) ? 'red' : 'black';
  return `
    <div class="poker-card ${color} ${extraClass}" data-card-id="${c.id}">
      <span class="pc-rank">${c.val}</span>
      <span class="pc-suit">${SUIT_NAMES[c.suit]}</span>
    </div>`;
};

export async function renderBigTwo(container, params = {}) {
  const engine = new BigTwoEngine();
  let currentMode = 'FIRST_OUT_WINS';
  let selectedIds = new Set();
  let gameToken = 0;
  let settledToken = -1;
  const bubbleTimers = new Map();
  const startExpanded = window.innerWidth >= 1880;

  const seatHtml = (idx) => {
    const s = SEATS[idx];
    return `
      <div class="player-slot player-slot-${s.slot}" id="seat-p${idx + 1}">
        <div class="character-avatar-card">
          <div class="l2d-slot" id="l2d-slot-p${idx + 1}"></div>
          <div class="char-info-name">
            <span class="card-count-badge" id="p${idx + 1}-card-count">13張</span>
          </div>
          <span class="seat-action-badge" id="p${idx + 1}-action"></span>
        </div>
        <div class="opp-cards" id="p${idx + 1}-cards-row"></div>
      </div>`;
  };

  container.innerHTML = `
    <div class="bigtwo-page animate-fade-in">
      <!-- 手機直屏旋轉提醒 (Rotate Device Notice) -->
      <div class="orientation-rotate-notice-bt" id="bt-rotate-notice">
        <div class="rotate-icon-anim">${SVG_ICONS.smartphone}</div>
        <h3>卡洛特建議您旋轉手機</h3>
        <p>為了獲得最舒適的大老二牌桌與手牌視角<br/>請將手機轉為<strong>「橫螢幕 (Landscape)」</strong>對局喔！</p>
        <button class="btn btn-sm" id="btn-close-bt-notice">繼續以直畫面遊玩</button>
      </div>

      <!-- Top Bar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-bt-back" title="返回大廳">
            ${SVG_ICONS.back} <span class="hide-narrow">大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">台灣大老二<span class="hide-narrow"> (BIG TWO)</span></span>
            <span class="badge badge-warning hide-narrow">小鎮牌桌版</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-bt-rules" title="規則說明"><span class="hide-narrow">規則說明</span></button>
          <select id="select-bt-mode" class="bt-mode-select" title="遊戲模式">
            <option value="FIRST_OUT_WINS">快殺模式</option>
            <option value="PLAY_ALL_OUT">全名次結算</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="btn-chat-open" title="對話頻道">對話</button>
          <button class="btn btn-ghost btn-sm" id="btn-bt-restart" title="重新發牌">
            ${SVG_ICONS.refresh}<span class="hide-narrow"> 發牌</span>
          </button>
        </div>
      </div>

      <!-- Casino Navy Table (GodGame 4-Player Character Layout) -->
      <div class="bigtwo-table">
        ${seatHtml(2)}
        ${seatHtml(3)}
        ${seatHtml(1)}

        <!-- Center Discard & Round Information -->
        <div class="bigtwo-center-area">
          <div class="bt-turn-label" id="bt-current-turn-label"></div>
          <div class="last-play-combo-box" id="last-played-box"></div>
          <div class="bt-last-caption" id="bt-last-caption"></div>
        </div>

        <!-- Bottom Player Hand Zone (P1 - 魔法師卡洛特) -->
        <div class="bigtwo-player-hand">
          <div class="cards-hand-row" id="p1-hand-cards"></div>
          <div class="bt-hand-footer">
            <div class="player-p1-avatar-bar" id="seat-p1">
              <div class="l2d-slot" id="l2d-slot-p1"></div>
              <span class="card-count-badge" id="p1-card-count">13張</span>
            </div>
            <div class="bigtwo-actions-bar">
              <button class="btn-bt-action btn-bt-hint" id="btn-bt-hint" title="AI 建議出牌">提示</button>
              <button class="btn-bt-action btn-bt-play" id="btn-bt-play">出牌</button>
              <button class="btn-bt-action btn-bt-pass" id="btn-bt-pass">過牌 (PASS)</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 神來也風格：可縮放對話框 -->
      <div class="godgame-chatbox ${startExpanded ? '' : 'collapsed'}" id="godgame-chatbox">
        <div class="chatbox-header">
          <span>對話頻道與角色互動</span>
          <button class="chatbox-toggle-btn" id="btn-toggle-chatbox" title="收合對話框">收合</button>
        </div>
        <div class="chatbox-body">
          <div class="quick-phrases-grid">
            ${QUICK_PHRASES.map(p => `<button class="btn-quick-phrase" data-text="${p.text}" data-emotion="${p.emotion}">${p.text}</button>`).join('')}
          </div>
          <div class="chat-logs-list" id="chat-logs-list">
            <div class="chat-log-welcome">歡迎來到卡洛特對話頻道。點擊快捷話語可發送發言。</div>
          </div>
          <form class="chat-custom-form" id="chat-custom-form">
            <input type="text" class="chat-custom-input" id="chat-custom-text" placeholder="輸入聊天內容..." maxlength="40" autocomplete="off" />
            <button type="submit" class="btn btn-sm btn-primary">送出</button>
          </form>
        </div>
      </div>

      <!-- Settlement Modal -->
      <div class="game-overlay" id="bt-settlement-modal" style="display:none;">
        <div class="game-overlay-card settle-card">
          <h2 id="settle-title">對局結算</h2>
          <div class="settle-winner" id="settle-winner-name">獲勝者: 玩家</div>
          <div class="settle-details" id="settle-details-box"></div>
          <button class="btn btn-primary btn-block" id="btn-settle-restart">${SVG_ICONS.refresh} 進入下一局</button>
        </div>
      </div>

      <!-- Game Rules Modal (大老二教學) -->
      <div class="game-overlay" id="bt-rules-modal" style="display:none;">
        <div class="game-overlay-card rules-card">
          <h2>♠ 台灣大老二 遊戲規則</h2>
          <div class="rules-body">
            <p><strong>🔹 基本規則</strong></p>
            <p>每人發 13 張牌，由持有「梅花 3 (♣3)」的玩家先出牌，第一手必須包含梅花 3。其餘三家都 PASS 後，最後出牌者重新自由出牌。</p>
            <hr/>
            <p><strong>🔹 牌型與大小</strong></p>
            <p>• 數字大小：2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3</p>
            <p>• 花色大小：黑桃(♠) > 紅心(♥) > 方塊(♦) > 梅花(♣)</p>
            <p>• 單張、對子、三條：跟隨相同牌型出牌，數字大者為勝，數字相同比花色。</p>
            <p>• 五張牌型階級：同花順 > 鐵支(四條) > 葫蘆 > 同花 > 順子 (只能用五張打五張)</p>
            <p>• 順子大小：2-3-4-5-6 最大、A-2-3-4-5 次之、10-J-Q-K-A 再次；J-Q-K-A-2 等不算順子。</p>
            <hr/>
            <p><strong>🔹 結算與罰金 (業界標準)</strong></p>
            <p>模式 1 快殺結束：有人打完手牌時立即結算。</p>
            <p>• 剩餘 1~9 張：每張罰 100 分<br/>• 剩餘 10~12 張：每張罰 200 分 (雙倍)<br/>• 剩餘 13 張 (未出牌)：每張罰 300 分 (三倍)<br/>• 手中每留有一張「老二(2)」，該玩家總罰金再乘 2 倍！</p>
            <p>模式 2 全打完排名：第 1 名 +300、第 2 名 +100、第 3 名 -100、第 4 名 -300。</p>
          </div>
          <button class="btn btn-primary btn-block" id="btn-close-bt-rules">我了解了！</button>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);

  // 初始化 4 位玩家的 Live2D 神來也動態立繪舞台
  const avatars = [
    new Live2dAvatar({ container: $('#l2d-slot-p1'), characterId: SEATS[0].charId, name: `${SEATS[0].name} (你)`, bubblePos: 'bottom', size: 'sm' }),
    new Live2dAvatar({ container: $('#l2d-slot-p2'), characterId: SEATS[1].charId, name: SEATS[1].name, bubblePos: 'right', size: 'sm' }),
    new Live2dAvatar({ container: $('#l2d-slot-p3'), characterId: SEATS[2].charId, name: SEATS[2].name, bubblePos: 'top', size: 'sm' }),
    new Live2dAvatar({ container: $('#l2d-slot-p4'), characterId: SEATS[3].charId, name: SEATS[3].name, bubblePos: 'left', size: 'sm' })
  ];

  // Set Player Emotion
  const setEmotion = (playerIdx, emotion, customText = null) => {
    const emoMap = { joy: 'strike', happy: 'win', sad: 'lose', angry: 'strike', pass: 'pass', thinking: 'thinking' };
    const mapped = emoMap[emotion] || emotion;
    avatars[playerIdx]?.setEmotion(mapped, customText);
  };

  const triggerSpeechBubble = (playerIdx, text, emotion = 'strike') => {
    setEmotion(playerIdx, emotion, text);
  };

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
      triggerSpeechBubble(0, btn.dataset.text, btn.dataset.emotion || 'joy');
      addChatLog('🥕 蘿蔔寶貝 (你)', btn.dataset.text);
    };
  });
  $('#chat-custom-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#chat-custom-text');
    const text = input?.value.trim();
    if (!text) return;
    triggerSpeechBubble(0, text, 'joy');
    addChatLog('🥕 蘿蔔寶貝 (你)', text);
    input.value = '';
  });

  // Controls Binding
  $('#btn-bt-back')?.addEventListener('click', () => navigate('/'));
  $('#btn-close-bt-notice')?.addEventListener('click', () => {
    const notice = $('#bt-rotate-notice');
    if (notice) notice.style.display = 'none';
  });

  const startGame = () => {
    gameToken++;
    selectedIds.clear();
    const modal = $('#bt-settlement-modal');
    if (modal) modal.style.display = 'none';
    [0, 1, 2, 3].forEach(i => setEmotion(i, 'joy'));
    engine.initGame(currentMode);
  };

  const selectMode = $('#select-bt-mode');
  if (selectMode) {
    selectMode.value = currentMode;
    selectMode.addEventListener('change', (e) => {
      currentMode = e.target.value;
      showToast(`🎮 切換模式：${currentMode === 'FIRST_OUT_WINS' ? '快殺結束' : '全打完排名'}`, 'info');
      startGame();
    });
  }

  $('#btn-bt-restart')?.addEventListener('click', () => {
    showToast('♠ 大老二發牌開局！', 'success');
    startGame();
  });
  $('#btn-settle-restart')?.addEventListener('click', startGame);

  // Rules Modal Controls
  const rulesModal = $('#bt-rules-modal');
  $('#btn-bt-rules')?.addEventListener('click', () => { rulesModal.style.display = 'flex'; });
  $('#btn-close-bt-rules')?.addEventListener('click', () => { rulesModal.style.display = 'none'; });

  // Hand selection (event delegation survives re-renders)
  const handBox = $('#p1-hand-cards');
  handBox.addEventListener('click', (e) => {
    const cardEl = e.target.closest('[data-card-id]');
    if (!cardEl) return;
    const id = cardEl.dataset.cardId;
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    renderUI();
  });

  $('#btn-bt-play').addEventListener('click', () => {
    const hand = engine.players[0].hand;
    const cards = hand.filter(c => selectedIds.has(c.id));
    if (!cards.length) {
      showToast('請先點擊選取要打出的牌！', 'warning');
      return;
    }
    const res = engine.playCards(0, cards);
    if (res.success) {
      selectedIds.clear();
      triggerSpeechBubble(0, '出牌！看我的厲害！', 'happy');
      renderUI();
    } else {
      showToast(`❌ ${res.reason}`, 'warning');
      triggerSpeechBubble(0, '哎呀這牌出不出去...', 'sad');
    }
  });

  $('#btn-bt-pass').addEventListener('click', () => {
    if (engine.currentTurn !== 0) {
      showToast('尚未輪到您的回合！', 'warning');
      return;
    }
    if (engine.passTurn(0)) {
      selectedIds.clear();
      triggerSpeechBubble(0, '這牌太大了... PASS！', 'angry');
      renderUI();
    } else {
      showToast('您是自由出牌手，無法 PASS！', 'warning');
    }
  });

  $('#btn-bt-hint').addEventListener('click', () => {
    if (engine.gamePhase !== 'PLAY' || engine.currentTurn !== 0) {
      showToast('尚未輪到您的回合！', 'warning');
      return;
    }
    const move = engine.chooseAiMove(0);
    if (!move) {
      showToast('💡 AI 建議：這手先 PASS，保留牌型', 'info');
      selectedIds.clear();
    } else {
      selectedIds = new Set(move.map(c => c.id));
      const combo = engine.evaluateHandCombo(move);
      showToast(`💡 AI 建議出：${HAND_TYPE_NAMES[combo.type]}`, 'info');
    }
    renderUI();
  });

  const renderUI = () => {
    const state = engine.getState();
    const myTurn = state.gamePhase === 'PLAY' && state.currentTurn === 0;

    state.players.forEach((p, idx) => {
      const n = idx + 1;
      const countEl = $(`#p${n}-card-count`);
      if (countEl) countEl.textContent = p.isFinished ? `🏁 第${p.rank}名` : `${p.cardCount}張`;
      const isCur = state.gamePhase === 'PLAY' && state.currentTurn === idx;
      $(`#seat-p${n}`)?.classList.toggle('is-turn', isCur);
      avatars[idx]?.setTurn(isCur);
      const badge = $(`#p${n}-action`);
      if (badge) {
        const passed = state.lastActions[idx]?.type === 'pass';
        badge.textContent = passed ? 'PASS' : '';
        badge.classList.toggle('show', passed);
      }
      if (idx > 0) {
        const row = $(`#p${n}-cards-row`);
        if (row && row.childElementCount !== p.cardCount) {
          row.innerHTML = '<div class="poker-card back"></div>'.repeat(p.cardCount);
        }
      }
    });

    const turnLabel = $('#bt-current-turn-label');
    if (turnLabel) {
      turnLabel.textContent = state.gamePhase === 'PLAY'
        ? `當前回合：${SEATS[state.currentTurn].name}${myTurn ? ' (你)' : ''}`
        : '本局結束';
    }

    const lastBox = $('#last-played-box');
    const caption = $('#bt-last-caption');
    if (state.lastCombo) {
      lastBox.innerHTML = state.lastCombo.cards.map(c => cardHtml(c, 'table-card')).join('');
      caption.textContent = `${SEATS[state.lastCombo.playerIdx].name} 出了「${HAND_TYPE_NAMES[state.lastCombo.type]}」`;
    } else {
      lastBox.innerHTML = `<span class="free-play-hint">${state.isFirstPlay ? '首輪：請出包含 ♣3 的牌型' : '自由出牌輪（任意合法牌型）'}</span>`;
      caption.textContent = '';
    }

    const hand = state.players[0].hand;
    selectedIds = new Set([...selectedIds].filter(id => hand.some(c => c.id === id)));
    handBox.innerHTML = hand.map(c => cardHtml(c, selectedIds.has(c.id) ? 'selected' : '')).join('');

    const canPass = myTurn && state.lastCombo && state.lastCombo.playerIdx !== 0;
    $('#btn-bt-play').classList.toggle('is-idle', !myTurn || selectedIds.size === 0);
    $('#btn-bt-pass').classList.toggle('is-idle', !canPass);
    $('#btn-bt-hint').classList.toggle('is-idle', !myTurn);
    $('.bigtwo-actions-bar')?.classList.toggle('my-turn', myTurn);
  };

  const showSettlement = async () => {
    const state = engine.getState();
    const s = state.settlement;
    if (!s || settledToken === gameToken) return;
    settledToken = gameToken;
    const token = gameToken;

    const winnerEl = $('#settle-winner-name');
    const detailsBox = $('#settle-details-box');
    const humanWon = s.winnerIdx === 0;
    $('#settle-title').textContent = humanWon ? '🎉 恭喜獲勝！' : '👑 遊戲局終結算';

    if (s.mode === 'PLAY_ALL_OUT') {
      winnerEl.textContent = `👑 冠軍：${SEATS[s.winnerIdx].name}`;
      detailsBox.innerHTML = s.playerDetails.map(d => `
        <div class="settle-row ${d.idx === 0 ? 'is-you' : ''}">
          <span>第 ${d.place} 名　${SEATS[d.idx].name}${d.idx === 0 ? ' (你)' : ''}</span>
          <strong class="${d.delta >= 0 ? 'plus' : 'minus'}">${d.delta >= 0 ? '+' : ''}${d.delta}</strong>
        </div>`).join('');
    } else {
      winnerEl.textContent = `👑 獲勝者：${SEATS[s.winnerIdx].name} (+${s.totalGained.toLocaleString()} 籌碼)`;
      detailsBox.innerHTML = s.playerDetails.map(d => `
        <div class="settle-row ${d.idx === 0 ? 'is-you' : ''}">
          <span>${SEATS[d.idx].name}${d.idx === 0 ? ' (你)' : ''}：剩 ${d.cardCount} 張${d.multiplier > 1 ? `（${d.multiplier}倍）` : ''}</span>
          <strong class="minus">-$${d.penalty.toLocaleString()}</strong>
        </div>`).join('');
    }

    [0, 1, 2, 3].forEach(i => avatars[i]?.setEmotion(i === s.winnerIdx ? 'win' : 'lose'));
    const modal = $('#bt-settlement-modal');
    if (modal) modal.style.display = 'flex';

    if (humanWon && s.totalGained > 0) {
      try {
        const profile = getUserProfile();
        if (profile && token === gameToken) await updateUserChips((profile.chips || 0) + s.totalGained);
      } catch (err) {
        console.warn('[BigTwo] chip sync skipped', err);
      }
    }
  };

  engine.onUpdate = (evt) => {
    if (evt.type === 'play') {
      const left = engine.players[evt.playerIdx].hand.length;
      if (left === 1) avatars[evt.playerIdx]?.setEmotion('urgent', '只剩最後一張啦！');
      else if (evt.combo.type >= HAND_TYPES.STRAIGHT) avatars[evt.playerIdx]?.setEmotion('strike', `看我的${HAND_TYPE_NAMES[evt.combo.type]}！`);
      else if (evt.combo.keyVal >= 15) avatars[evt.playerIdx]?.setEmotion('strike', '老二壓陣！');
      else avatars[evt.playerIdx]?.setEmotion('strike');
    } else if (evt.type === 'pass') {
      avatars[evt.playerIdx]?.setEmotion('pass');
    }
    renderUI();
    if (evt.type === 'gameOver') showSettlement();
  };

  startGame();

  // Dev-only hook for the Playwright QA bot (scripts/qa) — reads state, actions still go through the UI
  if (import.meta.env.DEV) window.__carrotQA = { game: 'big-two', engine: () => engine };

  return () => {
    engine.destroy();
    bubbleTimers.forEach(t => clearTimeout(t));
    if (window.__carrotQA?.game === 'big-two') delete window.__carrotQA;
  };
}
