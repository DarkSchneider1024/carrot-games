/**
 * ♠ 台灣大老二 (Taiwan Big Two — Sanrio & Chiikawa Kawaii Theme Page)
 * Features Macaron Pastel UI, Rotate Device Notice, & Chiikawa Player Avatars
 */

import { BigTwoEngine, SUIT_NAMES } from '../../games/big-two/big-two-engine.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { updateUserChips, getUserProfile } from '../../network/auth-manager.js';
import './big-two.css';

export async function renderBigTwo(container, params = {}) {
  let engine = new BigTwoEngine();
  let currentMode = 'FIRST_OUT_WINS'; // 'FIRST_OUT_WINS' or 'PLAY_ALL_OUT'
  engine.initGame(currentMode);

  let selectedCards = [];

  container.innerHTML = `
    <div class="bigtwo-page animate-fade-in">
      <!-- 📱 手機直屏旋轉提醒 (Rotate Device Notice) -->
      <div class="orientation-rotate-notice-bt" id="bt-rotate-notice">
        <div class="rotate-icon-anim">📱🔄</div>
        <h3 style="font-size:1.3rem;color:#fbcfe8;margin-bottom:8px;">吉伊提醒您旋轉手機！</h3>
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
            <span class="game-name">♠ 台灣大老二 (SANRIO & CHIIKAWA BIG TWO)</span>
            <span class="badge badge-warning" style="background:linear-gradient(135deg,#c084fc,#f472b6);color:#fff;">吉伊酷洛米萌系大決戰</span>
          </div>
        </div>
        <div class="topbar-actions" style="display:flex;gap:8px;">
          <select id="select-bt-mode" style="padding:6px 12px;border-radius:12px;background:#ffffff;border:1.5px solid #f472b6;color:#db2777;font-weight:800;">
            <option value="FIRST_OUT_WINS">⚡ 模式 1: 快殺結束 (首位出完即勝)</option>
            <option value="PLAY_ALL_OUT">👑 模式 2: 全打完排名 (爭奪前三名)</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="btn-bt-restart">
            ${SVG_ICONS.refresh} 重新發牌
          </button>
        </div>
      </div>

      <!-- ♠ Casino Navy Blue / Kuromi Purple Table -->
      <div class="bigtwo-table">
        <!-- Top AI Player (P3) -->
        <div style="grid-row:1;grid-column:2;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:0.85rem;color:#1e293b;font-weight:800;background:rgba(255,255,255,0.85);padding:2px 10px;border-radius:12px;border:1px solid #f472b6;">
            栗 北極吉伊 (<span id="p3-card-count">13</span>張)
          </div>
          <div id="p3-cards-row" style="display:flex;gap:2px;margin-top:4px;"></div>
        </div>

        <!-- Left AI Player (P4) -->
        <div style="grid-row:2;grid-column:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:0.85rem;color:#1e293b;font-weight:800;background:rgba(255,255,255,0.85);padding:2px 10px;border-radius:12px;border:1px solid #f472b6;transform:rotate(-90deg);">
            🐿️ 西城飛鼠 (<span id="p4-card-count">13</span>張)
          </div>
        </div>

        <!-- Right AI Player (P2) -->
        <div style="grid-row:2;grid-column:3;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:0.85rem;color:#1e293b;font-weight:800;background:rgba(255,255,255,0.85);padding:2px 10px;border-radius:12px;border:1px solid #f472b6;transform:rotate(90deg);">
            🐱 東區皮卡 (<span id="p2-card-count">13</span>張)
          </div>
        </div>

        <!-- Center Discard & Round Information -->
        <div class="bigtwo-center-area">
          <div style="font-size:0.85rem;color:#db2777;font-weight:800;margin-bottom:6px;" id="bt-current-turn-label">
            當前回合: 🐰 玩家 (吉伊)
          </div>

          <!-- Last Played Combination -->
          <div class="last-play-combo-box" id="last-played-box">
            <span style="font-size:0.85rem;color:#94a3b8;">等待首家開局出牌 (須含 ♣3)</span>
          </div>
        </div>

        <!-- Bottom Player Hand Zone (P1 - Human) -->
        <div class="bigtwo-player-hand">
          <div class="bigtwo-actions-bar">
            <button class="btn-bt-action btn-bt-play" id="btn-bt-play">♠ 確定出牌</button>
            <button class="btn-bt-action btn-bt-pass" id="btn-bt-pass">❌ PASS 過牌</button>
          </div>

          <div class="cards-hand-row" id="p1-hand-cards"></div>
          <div style="font-size:0.85rem;color:#db2777;font-weight:800;background:rgba(255,255,255,0.85);padding:2px 12px;border-radius:12px;">
            🐰 玩家 (吉伊小寶貝) — 點擊選取或取消手牌
          </div>
        </div>
      </div>

      <!-- Game Over Settlement Modal -->
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

  // Bind Header Controls
  container.querySelector('#btn-bt-back')?.addEventListener('click', () => navigate('/'));
  
  const selectMode = container.querySelector('#select-bt-mode');
  if (selectMode) {
    selectMode.value = currentMode;
    selectMode.addEventListener('change', (e) => {
      currentMode = e.target.value;
      engine.initGame(currentMode);
      selectedCards = [];
      showToast(`🎮 已切換模式：${currentMode === 'FIRST_OUT_WINS' ? '快殺結束' : '全打完排名'}`, 'info');
      renderUI();
    });
  }

  container.querySelector('#btn-close-bt-notice')?.addEventListener('click', () => {
    const notice = container.querySelector('#bt-rotate-notice');
    if (notice) notice.style.display = 'none';
  });

  container.querySelector('#btn-bt-restart')?.addEventListener('click', () => {
    engine.initGame(currentMode);
    selectedCards = [];
    showToast('♠ 大老二重新發牌開局！', 'success');
    renderUI();
  });

  const renderUI = () => {
    const state = engine.getState();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p3 = state.players[2];
    const p4 = state.players[3];

    // Card counts
    const p2Count = container.querySelector('#p2-card-count');
    const p3Count = container.querySelector('#p3-card-count');
    const p4Count = container.querySelector('#p4-card-count');
    if (p2Count) p2Count.textContent = p2.cardCount;
    if (p3Count) p3Count.textContent = p3.cardCount;
    if (p4Count) p4Count.textContent = p4.cardCount;

    // Current turn label
    const turnLabel = container.querySelector('#bt-current-turn-label');
    if (turnLabel) {
      turnLabel.textContent = `當前回合: ${state.players[state.currentTurn].name}`;
    }

    // Top AI (P3) Concealed Back Cards
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
        lastBox.innerHTML = `<span style="font-size:0.85rem;color:#db2777;font-weight:700;">自由出牌輪 (自由選擇任意合法牌型)</span>`;
      }
    }

    // P1 (Human) Hand Cards Rendering
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

    // Action Buttons Event Listeners
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
          renderUI();
          _checkSettlement();
        } else {
          showToast('❌ 出牌牌型不合規格或無法壓過大牌！', 'warning');
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
        const profile = getUserProfile();
        await updateUserChips(profile.chips + state.settlement.totalGained);
      }

      if (btnRestart) {
        btnRestart.onclick = () => {
          if (modal) modal.style.display = 'none';
          engine.initGame(currentMode);
          selectedCards = [];
          renderUI();
        };
      }
      if (modal) modal.style.display = 'flex';
    }
  };

  renderUI();
}
