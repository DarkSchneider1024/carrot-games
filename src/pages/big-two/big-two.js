/**
 * ♠ 台灣大老二 (Taiwan Big Two — GodGame 3D UIUX Style Page)
 * Features 4 Characters with Dynamic 4 Emotion Poses (Joy, Angry, Sad, Happy),
 * Three3D Cards Effect, & Settlement Game Over Auto-Fix
 */

import { BigTwoEngine, SUIT_NAMES } from '../../games/big-two/big-two-engine.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { updateUserChips, getUserProfile } from '../../network/auth-manager.js';
import './big-two.css';

export async function renderBigTwo(container, params = {}) {
  let engine = new BigTwoEngine();
  let currentMode = 'FIRST_OUT_WINS';
  engine.initGame(currentMode);

  let selectedCards = [];
  let isChatCollapsed = false;
  let playerEmotions = ['joy', 'joy', 'joy', 'joy']; // P1~P4 Current Emotion Poses

  const CHARACTERS = [
    { id: 'carrot', name: '🥕 蘿蔔寶貝', img: './assets/images/characters/char_carrot.png' },
    { id: 'veggie', name: '🥬 生菜寶寶', img: './assets/images/characters/char_veggie.png' },
    { id: 'flute', name: '🎵 竹笛精靈', img: './assets/images/characters/char_flute.png' },
    { id: 'fridge', name: '🧊 酷酷冰箱', img: './assets/images/characters/char_fridge.png' }
  ];

  const QUICK_PHRASES = [
    { text: '打快一點啦~ 等到都發芽了！', emotion: 'angry' },
    { text: '吃！看我的厲害！', emotion: 'joy' },
    { text: '別走！我們決戰到天亮！', emotion: 'happy' },
    { text: '慘了慘了... 這次手牌好爛哭哭', emotion: 'sad' },
    { text: '哼！誰都別想壓過我的大牌！', emotion: 'angry' },
    { text: '承讓承讓！這局是我贏啦~', emotion: 'happy' }
  ];

  container.innerHTML = `
    <div class="bigtwo-page animate-fade-in">
      <!-- 📱 手機直屏旋轉提醒 (Rotate Device Notice) -->
      <div class="orientation-rotate-notice-bt" id="bt-rotate-notice">
        <div class="rotate-icon-anim">📱🔄</div>
        <h3 style="font-size:1.3rem;color:#fbcfe8;margin-bottom:8px;">卡洛特建議您旋轉手機！</h3>
        <p style="font-size:0.95rem;color:#cbd5e1;line-height:1.5;margin-bottom:14px;">為了獲得最舒適的大老二牌桌與手牌視角<br/>請將手機轉為<strong style="color:#facc15;">「橫螢幕 (Landscape)」</strong>對局喔！</p>
        <button class="btn btn-sm" id="btn-close-bt-notice" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:14px;padding:6px 16px;">繼續以直畫面遊玩</button>
      </div>

      <!-- Top Bar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-bt-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">♠ 台灣大老二 (BIG TWO 3D)</span>
            <span class="badge badge-warning">神來也3D對決風</span>
          </div>
        </div>
        <div class="topbar-actions" style="display:flex;gap:8px;">
          <select id="select-bt-mode" style="padding:4px 10px;border-radius:12px;background:#ffffff;border:1.5px solid #f472b6;color:#db2777;font-weight:800;font-size:0.8rem;">
            <option value="FIRST_OUT_WINS">⚡ 模式 1: 快殺結束</option>
            <option value="PLAY_ALL_OUT">👑 模式 2: 全打完排名</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="btn-bt-restart">
            ${SVG_ICONS.refresh} 發牌
          </button>
        </div>
      </div>

      <!-- ♠ Casino Navy Table (GodGame 4-Player Character Layout) -->
      <div class="bigtwo-table">
        <!-- Top AI Player (P3) 🎵 竹笛精靈 -->
        <div class="player-slot player-slot-top">
          <div class="character-avatar-card">
            <div class="char-avatar-img joy" id="avatar-img-p3" style="background-image:url('${CHARACTERS[2].img}');"></div>
            <div class="char-info-name">
              <span>${CHARACTERS[2].name}</span>
              <span class="card-count-badge" id="p3-card-count">13張</span>
            </div>
          </div>
          <div class="speech-bubble bubble-top" id="bubble-p3"></div>
          <div id="p3-cards-row" style="display:flex;gap:1px;margin-top:2px;"></div>
        </div>

        <!-- Left AI Player (P4) 🥬 生菜寶寶 -->
        <div class="player-slot player-slot-left">
          <div class="character-avatar-card">
            <div class="char-avatar-img joy" id="avatar-img-p4" style="background-image:url('${CHARACTERS[1].img}');"></div>
            <div class="char-info-name">
              <span>${CHARACTERS[1].name}</span>
              <span class="card-count-badge" id="p4-card-count">13張</span>
            </div>
          </div>
          <div class="speech-bubble bubble-left" id="bubble-p4"></div>
        </div>

        <!-- Right AI Player (P2) 🧊 酷酷冰箱 -->
        <div class="player-slot player-slot-right">
          <div class="character-avatar-card">
            <div class="char-avatar-img joy" id="avatar-img-p2" style="background-image:url('${CHARACTERS[3].img}');"></div>
            <div class="char-info-name">
              <span>${CHARACTERS[3].name}</span>
              <span class="card-count-badge" id="p2-card-count">13張</span>
            </div>
          </div>
          <div class="speech-bubble bubble-right" id="bubble-p2"></div>
        </div>

        <!-- Center Discard & Round Information -->
        <div class="bigtwo-center-area">
          <div style="font-size:0.85rem;color:#38bdf8;font-weight:800;margin-bottom:4px;" id="bt-current-turn-label">
            當前的回合: 🥕 蘿蔔寶貝 (你)
          </div>

          <div class="last-play-combo-box" id="last-played-box">
            <span style="font-size:0.8rem;color:#94a3b8;">自由出牌輪 (自由選擇任意合法牌型)</span>
          </div>
        </div>

        <!-- Bottom Player Hand Zone (P1 - 🥕 蘿蔔寶貝) -->
        <div class="bigtwo-player-hand">
          <div class="player-p1-avatar-bar">
            <div class="char-avatar-img small joy" id="avatar-img-p1" style="background-image:url('${CHARACTERS[0].img}');"></div>
            <span style="font-weight:800;font-size:0.85rem;color:#f1f5f9;">${CHARACTERS[0].name} (你)</span>
          </div>

          <div class="speech-bubble bubble-bottom" id="bubble-p1"></div>
          <div class="cards-hand-row" id="p1-hand-cards"></div>

          <div class="bigtwo-actions-bar">
            <button class="btn-bt-action btn-bt-play" id="btn-bt-play">♠ 確定出牌</button>
            <button class="btn-bt-action btn-bt-pass" id="btn-bt-pass">❌ PASS 過牌</button>
          </div>
        </div>
      </div>

      <!-- 💬 神來也風格：可縮放對話框 -->
      <div class="godgame-chatbox ${isChatCollapsed ? 'collapsed' : ''}" id="godgame-chatbox">
        <div class="chatbox-header" id="chatbox-header-bar">
          <span>💬 對話頻道 & 喜怒哀樂貼圖</span>
          <button class="chatbox-toggle-btn" id="btn-toggle-chatbox" title="縮放對話框">
            ${isChatCollapsed ? '➕ 展開' : '➖ 縮小'}
          </button>
        </div>

        <div class="chatbox-body" id="chatbox-body-content">
          <div class="quick-phrases-grid">
            ${QUICK_PHRASES.map(p => `
              <button class="btn-quick-phrase" data-text="${p.text}" data-emotion="${p.emotion}">
                ${p.text}
              </button>
            `).join('')}
          </div>

          <div class="chat-logs-list" id="chat-logs-list">
            <div style="color:#64748b;font-size:0.75rem;">歡迎來到神來也對決聊天室！點擊快捷話語切換人物喜怒哀樂。</div>
          </div>

          <form class="chat-custom-form" id="chat-custom-form">
            <input type="text" class="chat-custom-input" id="chat-custom-text" placeholder="輸入聊天內容..." maxlength="40" autocomplete="off" />
            <button type="submit" class="btn btn-sm btn-primary">送出</button>
          </form>
        </div>
      </div>

      <!-- Settlement Modal -->
      <div id="bt-settlement-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(10px);z-index:999;align-items:center;justify-content:center;">
        <div style="background:#ffffff;border:2.5px solid #f472b6;border-radius:24px;padding:24px;width:90%;max-width:440px;color:#1e293b;text-align:center;box-shadow:0 16px 40px rgba(244,114,182,0.5);">
          <h2 style="font-size:1.6rem;color:#db2777;margin-bottom:12px;" id="settle-title">👑 遊戲局終結算</h2>
          <div style="font-size:1.1rem;font-weight:800;color:#0284c7;margin-bottom:12px;" id="settle-winner-name">獲勝者: 玩家</div>
          
          <div id="settle-details-box" style="display:flex;flex-direction:column;gap:8px;background:#fef2f2;padding:14px;border-radius:16px;text-align:left;font-size:0.9rem;margin-bottom:16px;border:1px solid #fca5a5;"></div>

          <button class="btn btn-primary btn-block" id="btn-settle-restart" style="background:linear-gradient(135deg,#f472b6,#c084fc);border:none;">
            ${SVG_ICONS.refresh} 進入下一局
          </button>
        </div>
      </div>
    </div>
  `;

  // Set Player Emotion
  const setEmotion = (playerIdx, emotion) => {
    playerEmotions[playerIdx] = emotion;
    const el = container.querySelector(`#avatar-img-p${playerIdx + 1}`);
    if (el) {
      el.className = `char-avatar-img ${playerIdx === 0 ? 'small' : ''} ${emotion}`;
    }
  };

  const triggerSpeechBubble = (playerIdx, text, emotion = 'joy') => {
    setEmotion(playerIdx, emotion);
    const bubbleId = `#bubble-p${playerIdx + 1}`;
    const bubbleEl = container.querySelector(bubbleId);
    if (!bubbleEl) return;

    bubbleEl.textContent = text;
    bubbleEl.classList.add('active');

    setTimeout(() => {
      bubbleEl.classList.remove('active');
      setEmotion(playerIdx, 'joy'); // revert to normal
    }, 2800);
  };

  const addChatLog = (senderName, text) => {
    const logsEl = container.querySelector('#chat-logs-list');
    if (!logsEl) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-log-item';
    msgDiv.innerHTML = `<strong style="color:#db2777;">${senderName}:</strong> ${text}`;
    logsEl.appendChild(msgDiv);
    logsEl.scrollTop = logsEl.scrollHeight;
  };

  // Collapsible Chatbox Toggle
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

  // Quick Phrase Buttons
  container.querySelectorAll('.btn-quick-phrase').forEach(btn => {
    btn.onclick = () => {
      const text = btn.dataset.text;
      const emotion = btn.dataset.emotion || 'joy';
      triggerSpeechBubble(0, text, emotion);
      addChatLog('🥕 蘿蔔寶貝 (你)', text);
    };
  });

  // Controls Binding
  container.querySelector('#btn-bt-back')?.addEventListener('click', () => navigate('/'));
  container.querySelector('#btn-close-bt-notice')?.addEventListener('click', () => {
    const notice = container.querySelector('#bt-rotate-notice');
    if (notice) notice.style.display = 'none';
  });

  const selectMode = container.querySelector('#select-bt-mode');
  if (selectMode) {
    selectMode.value = currentMode;
    selectMode.addEventListener('change', (e) => {
      currentMode = e.target.value;
      engine.initGame(currentMode);
      selectedCards = [];
      showToast(`🎮 切換模式：${currentMode === 'FIRST_OUT_WINS' ? '快殺結束' : '全打完排名'}`, 'info');
      renderUI();
    });
  }

  container.querySelector('#btn-bt-restart')?.addEventListener('click', () => {
    engine.initGame(currentMode);
    selectedCards = [];
    playerEmotions = ['joy', 'joy', 'joy', 'joy'];
    showToast('♠ 大老二發牌開局！', 'success');
    renderUI();
  });

  const renderUI = () => {
    const state = engine.getState();

    // AUTO GAME OVER CHECK FIRST!
    if (state.gamePhase === 'GAME_OVER') {
      _checkSettlement();
      return;
    }

    const p1 = state.players[0];
    const p2 = state.players[1];
    const p3 = state.players[2];
    const p4 = state.players[3];

    // Card counts
    const p2Count = container.querySelector('#p2-card-count');
    const p3Count = container.querySelector('#p3-card-count');
    const p4Count = container.querySelector('#p4-card-count');
    if (p2Count) p2Count.textContent = `${p2.cardCount}張`;
    if (p3Count) p3Count.textContent = `${p3.cardCount}張`;
    if (p4Count) p4Count.textContent = `${p4.cardCount}張`;

    // Turn label
    const turnLabel = container.querySelector('#bt-current-turn-label');
    if (turnLabel) {
      turnLabel.textContent = `當前的回合: ${CHARACTERS[state.currentTurn].name}`;
    }

    // Auto polling update during AI turns
    if (state.currentTurn !== 0 && state.gamePhase === 'PLAY') {
      setTimeout(() => renderUI(), 750);
    }

    // Top AI (P3) Cards
    const p3Box = container.querySelector('#p3-cards-row');
    if (p3Box) {
      p3Box.innerHTML = Array(p3.cardCount).fill(0).map(() => `<div class="poker-card back"></div>`).join('');
    }

    // Last Played Combination Box
    const lastBox = container.querySelector('#last-played-box');
    if (lastBox) {
      if (state.lastCombo) {
        lastBox.innerHTML = state.lastCombo.cards.map(c => `
          <div class="poker-card ${['H', 'D'].includes(c.suit) ? 'red' : 'black'}">
            <span>${c.val}</span>
            <span>${SUIT_NAMES[c.suit]}</span>
          </div>
        `).join('');
      } else {
        lastBox.innerHTML = `<span style="font-size:0.8rem;color:#38bdf8;font-weight:700;">自由出牌輪 (自由選擇任意合法牌型)</span>`;
      }
    }

    // P1 Hand Cards
    const p1HandBox = container.querySelector('#p1-hand-cards');
    if (p1HandBox) {
      p1HandBox.innerHTML = p1.hand.map(c => {
        const isSelected = selectedCards.some(sc => sc.id === c.id);
        const isRed = ['H', 'D'].includes(c.suit);
        return `
          <div class="poker-card ${isRed ? 'red' : 'black'} ${isSelected ? 'selected' : ''}" data-card-id="${c.id}">
            <span>${c.val}</span>
            <span>${SUIT_NAMES[c.suit]}</span>
          </div>
        `;
      }).join('');

      p1HandBox.querySelectorAll('.poker-card').forEach(cardEl => {
        cardEl.addEventListener('click', () => {
          const cardId = cardEl.dataset.cardId;
          const cardObj = p1.hand.find(c => c.id === cardId);
          if (!cardObj) return;

          const idx = selectedCards.findIndex(sc => sc.id === cardId);
          if (idx !== -1) {
            selectedCards.splice(idx, 1);
          } else {
            selectedCards.push(cardObj);
          }
          renderUI();
        });
      });
    }

    // Action Buttons
    const btnPlay = container.querySelector('#btn-bt-play');
    const btnPass = container.querySelector('#btn-bt-pass');

    if (btnPlay) {
      btnPlay.onclick = () => {
        if (state.currentTurn !== 0) {
          showToast('尚未輪到您的回合！', 'warning');
          return;
        }
        if (selectedCards.length === 0) {
          showToast('請先點擊選取要打出的牌！', 'warning');
          return;
        }

        const res = engine.playCards(0, selectedCards);
        if (res && res.success) {
          selectedCards = [];
          showToast('♠ 出牌成功！', 'success');
          triggerSpeechBubble(0, '出牌！看我的厲害！', 'happy');
          renderUI();
        } else {
          showToast('❌ 出牌牌型不合規格或無法壓過大牌！', 'warning');
          triggerSpeechBubble(0, '哎呀這牌出不出去...', 'sad');
        }
      };
    }

    if (btnPass) {
      btnPass.onclick = () => {
        if (state.currentTurn !== 0) {
          showToast('尚未輪到您的回合！', 'warning');
          return;
        }
        if (engine.passTurn(0)) {
          selectedCards = [];
          showToast('❌ 選擇 PASS 過牌', 'info');
          triggerSpeechBubble(0, '這牌太大了... PASS！', 'angry');
          renderUI();
        } else {
          showToast('您是自由出牌手，無法 PASS！', 'warning');
        }
      };
    }
  };

  const _checkSettlement = async () => {
    const state = engine.getState();
    if (state.gamePhase === 'GAME_OVER' && state.settlement) {
      const modal = container.querySelector('#bt-settlement-modal');
      const winnerEl = container.querySelector('#settle-winner-name');
      const detailsBox = container.querySelector('#settle-details-box');
      const btnRestart = container.querySelector('#btn-settle-restart');

      if (winnerEl) winnerEl.textContent = `👑 獲勝者：${state.settlement.winnerName} (+${state.settlement.totalGained.toLocaleString()} 籌碼)`;

      if (detailsBox) {
        detailsBox.innerHTML = state.settlement.playerDetails.map(d => `
          <div>
            • <strong>${d.name}</strong>：剩餘 ${d.cardCount} 張牌 ${d.multiplier > 1 ? `(${d.multiplier}倍懲罰)` : ''} 扣 -$${d.penalty.toLocaleString()}
          </div>
        `).join('');
      }

      if (state.settlement.winnerIdx === 0) {
        setEmotion(0, 'happy');
        const profile = getUserProfile();
        await updateUserChips(profile.chips + state.settlement.totalGained);
      } else {
        setEmotion(0, 'sad');
      }

      if (btnRestart) {
        btnRestart.onclick = () => {
          if (modal) modal.style.display = 'none';
          engine.initGame(currentMode);
          selectedCards = [];
          playerEmotions = ['joy', 'joy', 'joy', 'joy'];
          renderUI();
        };
      }
      if (modal) modal.style.display = 'flex';
    }
  };

  renderUI();
}
