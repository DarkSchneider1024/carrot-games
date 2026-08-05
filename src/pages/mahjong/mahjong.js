/**
 * 🀄 台灣 16 張麻將 (Taiwan Mahjong 16-Tile Page)
 * Features Emerald Green Felt Table, Hand Tiles, Chow/Pong/Kong/Hu Mechanics, & Ting Hints
 */

import { MahjongEngine, TILE_NAMES, TILE_UNICODE } from '../../games/mahjong/mahjong-engine.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showToast } from '../../components/toast.js';
import './mahjong.css';

export async function renderMahjong(container, params = {}) {
  let engine = new MahjongEngine();
  engine.initGame(0, 0); // Start with P1 as Dealer

  let selectedTileIdx = -1;
  let showTingHint = false;

  container.innerHTML = `
    <div class="mahjong-page animate-fade-in">
      <!-- Top Bar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-mj-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">🀄 台灣 16 張麻將 (TAIWAN MAHJONG)</span>
            <span class="badge badge-warning">正宗十六張 · 自動聽牌提示</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-mj-restart" title="重新開局">
            ${SVG_ICONS.refresh} 重新發牌
          </button>
        </div>
      </div>

      <!-- 🌿 Emerald Green Felt Mahjong Table -->
      <div class="mahjong-table">
        <!-- Top AI Player (P3) -->
        <div style="grid-row:1;grid-column:2;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:0.85rem;color:#a7f3d0;font-weight:700;">🀃 北家 (北極兔皇)</div>
          <div id="p3-tiles" style="display:flex;gap:2px;margin-top:4px;"></div>
        </div>

        <!-- Left AI Player (P4) -->
        <div style="grid-row:2;grid-column:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:0.85rem;color:#a7f3d0;font-weight:700;transform:rotate(-90deg);">🀂 西家 (西城飛鼠)</div>
        </div>

        <!-- Right AI Player (P2) -->
        <div style="grid-row:2;grid-column:3;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:0.85rem;color:#a7f3d0;font-weight:700;transform:rotate(90deg);">🀁 南家 (東區小八)</div>
        </div>

        <!-- Center Table River Discards & Information -->
        <div class="mahjong-center-box">
          <div class="mahjong-dice-box">
            <span>東風圈</span> |
            <span>莊家: <strong style="color:#facc15;" id="mj-dealer-name">東家 (你)</strong></span> |
            <span>剩餘牌數: <strong style="color:#38bdf8;" id="mj-wall-count">100</strong> 張</span>
          </div>

          <!-- Discard River -->
          <div class="discard-river-grid" id="discard-river"></div>
        </div>

        <!-- Bottom Player Zone (P1 - Human) -->
        <div class="player-bottom-zone">
          <!-- Action Control Bar (Eat, Pong, Kong, Hu, Ting) -->
          <div class="mahjong-actions-bar" id="mj-actions-bar">
            <button class="btn-mj-action btn-mj-ting" id="btn-mj-ting">💡 聽牌分析</button>
            <button class="btn-mj-action btn-mj-hu" id="btn-mj-hu" style="display:none;">🀄 自摸 / 胡牌</button>
          </div>

          <!-- Hand Tiles -->
          <div class="player-hand-tiles" id="p1-hand-tiles"></div>
          <div style="font-size:0.85rem;color:#fbbf24;font-weight:700;margin-top:2px;">🀀 東家 (你) — 點擊選擇手牌打出</div>
        </div>
      </div>

      <!-- Ting Hint Popover -->
      <div class="ting-hint-box" id="ting-hint-box" style="display:none;"></div>
    </div>
  `;

  // Bind Header Controls
  container.querySelector('#btn-mj-back')?.addEventListener('click', () => navigate('/'));
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
          <span style="font-size:0.7rem;margin-top:-4px;color:#475569;">${TILE_NAMES[t] || t}</span>
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
              renderUI();
            }
          } else {
            selectedTileIdx = idx;
            renderUI();
          }
        });
      });
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
              <div style="font-weight:700;color:#c084fc;">💡 聽牌分析預測：</div>
              ${hints.map(h => `
                <div style="font-size:0.85rem;">
                  打出 <strong style="color:#facc15;">${TILE_NAMES[h.discardTile]}</strong> 🀄 聽：
                  ${h.waitingTiles.map(w => `${TILE_NAMES[w.tile]}(剩${w.remaining}張)`).join('、')}
                </div>
              `).join('')}
            `;
          }
          tingBox.style.display = 'flex';
        } else if (tingBox) {
          tingBox.style.display = 'none';
        }
      };
    }
  };

  renderUI();
}
