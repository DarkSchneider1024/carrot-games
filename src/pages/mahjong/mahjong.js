/**
 * 🀄 台灣 16 張麻將 — GodGame UIUX Style Page
 * Features 4 Original Avatar Characters (Carrot, Veggie, Flute, Fridge),
 * Collapsible Floating Chatbox, Speech Bubbles, & Dynamic Emotion Swapping
 */

import { MahjongEngine, TILE_NAMES, TILE_UNICODE } from '../../games/mahjong/mahjong-engine.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import './mahjong.css';

export async function renderMahjong(container, params = {}) {
  let engine = new MahjongEngine();
  engine.initGame(0, 0);

  let selectedTileIdx = -1;
  let showTingHint = false;
  let isChatCollapsed = false;

  const CHARACTERS = [
    { id: 'carrot', name: '🥕 蘿蔔寶貝', img: './assets/images/characters/char_carrot.png' },
    { id: 'veggie', name: '🥬 生菜寶寶', img: './assets/images/characters/char_veggie.png' },
    { id: 'flute', name: '🎵 竹笛精靈', img: './assets/images/characters/char_flute.png' },
    { id: 'fridge', name: '🧊 酷酷冰箱', img: './assets/images/characters/char_fridge.png' }
  ];

  const QUICK_PHRASES = [
    { text: '打快一點啦~ 等到都發芽了！' },
    { text: '碰！這張我要啦！' },
    { text: '吃！正好湊成順子！' },
    { text: '慘了慘了... 這次牌真難打' },
    { text: '胡！單吊自摸大三元！' },
    { text: '承讓承讓！這局贏麻了~' }
  ];

  container.innerHTML = `
    <div class="mahjong-page animate-fade-in">
      <!-- 📱 手機直屏旋轉提醒 (Rotate Device Notice) -->
      <div class="orientation-rotate-notice" id="mj-rotate-notice">
        <div class="rotate-icon-anim">📱🔄</div>
        <h3 style="font-size:1.3rem;color:#fbcfe8;margin-bottom:8px;">卡洛特建議您旋轉手機！</h3>
        <p style="font-size:0.95rem;color:#cbd5e1;line-height:1.5;margin-bottom:14px;">為了獲得最佳 4 人麻將對局與手牌視野<br/>請將手機轉為<strong style="color:#facc15;">「橫螢幕 (Landscape)」</strong>體驗喔！</p>
        <button class="btn btn-sm" id="btn-close-mj-notice" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:14px;padding:6px 16px;">繼續以直畫面遊玩</button>
      </div>

      <!-- Top Bar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-mj-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">🀄 台灣 16 張麻將 (MAHJONG 16)</span>
            <span class="badge badge-warning">神來也對決風</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-mj-restart" title="發牌">
            ${SVG_ICONS.refresh} 發牌
          </button>
        </div>
      </div>

      <!-- 🌿 Emerald Green Felt Mahjong Table (GodGame 4-Player Character Layout) -->
      <div class="mahjong-table">
        <!-- Top AI Player (P3) 🎵 竹笛精靈 -->
        <div class="player-slot player-slot-top">
          <div class="character-avatar-card">
            <div class="char-avatar-img" style="background-image:url('${CHARACTERS[2].img}');"></div>
            <div class="char-info-name">
              <span>${CHARACTERS[2].name}</span>
            </div>
          </div>
          <!-- Speech Bubble -->
          <div class="speech-bubble bubble-top" id="bubble-p3"></div>
          <div id="p3-tiles" style="display:flex;gap:1px;margin-top:2px;"></div>
        </div>

        <!-- Left AI Player (P4) 🥬 生菜寶寶 -->
        <div class="player-slot player-slot-left">
          <div class="character-avatar-card">
            <div class="char-avatar-img" style="background-image:url('${CHARACTERS[1].img}');"></div>
            <div class="char-info-name">
              <span>${CHARACTERS[1].name}</span>
            </div>
          </div>
          <!-- Speech Bubble -->
          <div class="speech-bubble bubble-left" id="bubble-p4"></div>
        </div>

        <!-- Right AI Player (P2) 🧊 酷酷冰箱 -->
        <div class="player-slot player-slot-right">
          <div class="character-avatar-card">
            <div class="char-avatar-img" style="background-image:url('${CHARACTERS[3].img}');"></div>
            <div class="char-info-name">
              <span>${CHARACTERS[3].name}</span>
            </div>
          </div>
          <!-- Speech Bubble -->
          <div class="speech-bubble bubble-right" id="bubble-p2"></div>
        </div>

        <!-- Center Table River Discards & Information -->
        <div class="mahjong-center-box">
          <div class="mahjong-dice-box">
            <span>🌸 東風圈</span> |
            <span>莊家: <strong style="color:#a7f3d0;" id="mj-dealer-name">🥕 蘿蔔寶貝 (你)</strong></span> |
            <span>剩牌: <strong style="color:#38bdf8;" id="mj-wall-count">100</strong> 張</span>
          </div>

          <!-- Discard River -->
          <div class="discard-river-grid" id="discard-river"></div>
        </div>

        <!-- Bottom Player Zone (P1 - 🥕 蘿蔔寶貝) -->
        <div class="player-bottom-zone">
          <div class="player-p1-avatar-bar">
            <div class="char-avatar-img small" style="background-image:url('${CHARACTERS[0].img}');"></div>
            <span style="font-weight:800;font-size:0.85rem;color:#f1f5f9;">${CHARACTERS[0].name} (你)</span>
          </div>

          <!-- Speech Bubble P1 -->
          <div class="speech-bubble bubble-bottom" id="bubble-p1"></div>

          <!-- 🀄 主要手牌顯示區 -->
          <div class="player-hand-tiles" id="p1-hand-tiles"></div>

          <!-- 動作控制按鈕區 -->
          <div class="mahjong-actions-bar" id="mj-actions-bar">
            <button class="btn-mj-action btn-mj-discard" id="btn-mj-discard">🀄 確定打牌</button>
            <button class="btn-mj-action btn-mj-ting" id="btn-mj-ting">💡 聽牌分析</button>
            <button class="btn-mj-action btn-mj-hu" id="btn-mj-hu" style="display:none;">🀄 自摸 / 胡牌</button>
          </div>
        </div>
      </div>

      <!-- 💬 神來也風格：可縮放收合聊天對話框 (Collapsible Floating Chatbox) -->
      <div class="godgame-chatbox ${isChatCollapsed ? 'collapsed' : ''}" id="godgame-chatbox">
        <div class="chatbox-header" id="chatbox-header-bar">
          <span>💬 對話頻道 & 快捷發言</span>
          <button class="chatbox-toggle-btn" id="btn-toggle-chatbox" title="縮放對話框">
            ${isChatCollapsed ? '➕ 展開' : '➖ 縮小'}
          </button>
        </div>

        <div class="chatbox-body" id="chatbox-body-content">
          <!-- 快捷台詞發言按鈕 -->
          <div class="quick-phrases-grid">
            ${QUICK_PHRASES.map(p => `
              <button class="btn-quick-phrase" data-text="${p.text}">
                ${p.text}
              </button>
            `).join('')}
          </div>

          <!-- 聊天紀錄歷史 -->
          <div class="chat-logs-list" id="chat-logs-list">
            <div style="color:#64748b;font-size:0.75rem;">歡迎來到神來也麻將對決聊天室！點擊上方快捷話語直接發言。</div>
          </div>

          <!-- 自訂輸入文字 -->
          <form class="chat-custom-form" id="chat-custom-form">
            <input type="text" class="chat-custom-input" id="chat-custom-text" placeholder="輸入聊天內容..." maxlength="40" autocomplete="off" />
            <button type="submit" class="btn btn-sm btn-primary">送出</button>
          </form>
        </div>
      </div>

      <!-- Ting Hint Popover -->
      <div class="ting-hint-box" id="ting-hint-box" style="display:none;position:absolute;bottom:110px;background:rgba(255,255,255,0.95);border:2px solid #f472b6;border-radius:16px;padding:12px;color:#1e293b;z-index:99;"></div>
    </div>
  `;

  // Helper: Speech Bubble
  const triggerSpeechBubble = (playerIdx, text) => {
    const bubbleId = `#bubble-p${playerIdx + 1}`;
    const bubbleEl = container.querySelector(bubbleId);
    if (!bubbleEl) return;

    bubbleEl.textContent = text;
    bubbleEl.classList.add('active');

    setTimeout(() => {
      bubbleEl.classList.remove('active');
    }, 2800);
  };

  // Helper: Chat Log
  const addChatLog = (senderName, text) => {
    const logsEl = container.querySelector('#chat-logs-list');
    if (!logsEl) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-log-item';
    msgDiv.innerHTML = `<strong style="color:#059669;">${senderName}:</strong> ${text}`;
    logsEl.appendChild(msgDiv);
    logsEl.scrollTop = logsEl.scrollHeight;
  };

  // Bind Collapsible Chatbox Controls
  const chatboxEl = container.querySelector('#godgame-chatbox');
  const btnToggleChat = container.querySelector('#btn-toggle-chatbox');

  if (btnToggleChat && chatboxEl) {
    btnToggleChat.onclick = () => {
      isChatCollapsed = !isChatCollapsed;
      if (isChatCollapsed) {
        chatboxEl.classList.add('collapsed');
        btnToggleChat.textContent = '➕ 展開';
      } else {
        chatboxEl.classList.remove('collapsed');
        btnToggleChat.textContent = '➖ 縮小';
      }
    };
  }

  // Quick Phrase Clicks
  container.querySelectorAll('.btn-quick-phrase').forEach(btn => {
    btn.onclick = () => {
      const text = btn.dataset.text;
      triggerSpeechBubble(0, text);
      addChatLog('🥕 蘿蔔寶貝 (你)', text);
    };
  });

  // Custom Chat Form Submit
  const customForm = container.querySelector('#chat-custom-form');
  if (customForm) {
    customForm.onsubmit = (e) => {
      e.preventDefault();
      const input = container.querySelector('#chat-custom-text');
      if (input && input.value.trim()) {
        const text = input.value.trim();
        triggerSpeechBubble(0, text);
        addChatLog('🥕 蘿蔔寶貝 (你)', text);
        input.value = '';
      }
    };
  }

  // Controls Binding
  container.querySelector('#btn-mj-back')?.addEventListener('click', () => navigate('/'));
  container.querySelector('#btn-close-mj-notice')?.addEventListener('click', () => {
    const notice = container.querySelector('#mj-rotate-notice');
    if (notice) notice.style.display = 'none';
  });
  container.querySelector('#btn-mj-restart')?.addEventListener('click', () => {
    engine.initGame(0, 0);
    showToast('🀄 台灣 16 張麻將重新發牌開局！', 'success');
    renderUI();
  });

  const renderUI = () => {
    const state = engine.getState();
    const p1 = state.players[0];
    const p3 = state.players[2];

    // Update Wall Count & Status
    const wallCountEl = container.querySelector('#mj-wall-count');
    if (wallCountEl) wallCountEl.textContent = state.wallRemaining;

    // Render Discard River
    const riverBox = container.querySelector('#discard-river');
    if (riverBox) {
      riverBox.innerHTML = state.discards.flatMap((dList, pIdx) => 
        dList.map(t => `<div class="mj-tile small">${TILE_UNICODE[t] || t}</div>`)
      ).join('');
    }

    // Render P3 (Top Opponent) Concealed Back Tiles
    const p3Box = container.querySelector('#p3-tiles');
    if (p3Box) {
      p3Box.innerHTML = Array(p3.handCount).fill(0).map(() => `<div class="mj-tile small back"></div>`).join('');
    }

    // Render P1 (Human) Hand Tiles
    const p1HandBox = container.querySelector('#p1-hand-tiles');
    if (p1HandBox) {
      p1HandBox.innerHTML = p1.hand.map((t, idx) => `
        <div class="mj-tile ${idx === selectedTileIdx ? 'selected' : ''}" data-idx="${idx}" data-tile="${t}">
          <span>${TILE_UNICODE[t] || t}</span>
          <span style="font-size:0.8rem;font-weight:800;margin-top:-2px;color:#475569;">${TILE_NAMES[t] || t}</span>
        </div>
      `).join('');

      p1HandBox.querySelectorAll('.mj-tile').forEach(tileEl => {
        tileEl.addEventListener('click', () => {
          const idx = parseInt(tileEl.dataset.idx);
          const tile = tileEl.dataset.tile;

          if (selectedTileIdx === idx) {
            // Discard Tile on second click!
            if (engine.currentTurn === 0 && engine.phase === 'PLAY') {
              engine.discardTile(0, tile);
              selectedTileIdx = -1;
              triggerSpeechBubble(0, `打出 ${TILE_NAMES[tile]}！`);
              renderUI();
            }
          } else {
            selectedTileIdx = idx;
            renderUI();
          }
        });
      });
    }

    // Discard Button Action
    const btnDiscard = container.querySelector('#btn-mj-discard');
    if (btnDiscard) {
      btnDiscard.onclick = () => {
        if (engine.currentTurn !== 0 || engine.phase !== 'PLAY') {
          showToast('尚未輪到您的回合！', 'warning');
          return;
        }
        if (selectedTileIdx < 0 || selectedTileIdx >= p1.hand.length) {
          showToast('請先點擊選擇一張手牌打出！', 'warning');
          return;
        }
        const tileToDiscard = p1.hand[selectedTileIdx];
        engine.discardTile(0, tileToDiscard);
        selectedTileIdx = -1;
        showToast(`🀄 打出 ${TILE_NAMES[tileToDiscard]}`, 'info');
        triggerSpeechBubble(0, `打出 ${TILE_NAMES[tileToDiscard]}！`);
        renderUI();
      };
    }

    // Ting Hints Popover Logic
    const btnTing = container.querySelector('#btn-mj-ting');
    const tingBox = container.querySelector('#ting-hint-box');
    if (btnTing) {
      btnTing.onclick = () => {
        showTingHint = !showTingHint;
        if (showTingHint && tingBox) {
          const hints = engine.getTingHints(0);
          if (hints.length === 0) {
            tingBox.innerHTML = `<div style="font-weight:700;">💡 目前尚未聽牌</div>`;
          } else {
            tingBox.innerHTML = `
              <div style="font-weight:800;color:#db2777;">💡 聽牌分析預測：</div>
              ${hints.map(h => `
                <div style="font-size:0.85rem;margin-top:4px;">
                  打出 <strong style="color:#db2777;">${TILE_NAMES[h.discardTile]}</strong> 🀄 聽：
                  ${h.waitingTiles.map(w => `${TILE_NAMES[w.tile]}(剩${w.remaining}張)`).join('、')}
                </div>
              `).join('')}
            `;
          }
          tingBox.style.display = 'block';
        } else if (tingBox) {
          tingBox.style.display = 'none';
        }
      };
    }
  };

  renderUI();
}
