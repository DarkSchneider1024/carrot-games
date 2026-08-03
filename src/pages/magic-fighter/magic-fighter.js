/**
 * Magic Fighter Battle Page (魔法對戰主頁面)
 * Supports AI Wave Survival & P2P Online Room Match, Mobile 100dvh Lock, & Virtual Joystick.
 */

import { MagicFighterGame } from '../../games/magic-fighter/game-controller.js';
import { FighterRenderer } from '../../games/magic-fighter/fighter-renderer.js';
import { PeerManager } from '../../network/peer-manager.js';
import { updateUserChips, updateUserStats, getUserProfile } from '../../network/auth-manager.js';
import { showToast } from '../../components/toast.js';

export async function renderMagicFighter(container, params = {}) {
  const mode = params.mode || 'ai'; // 'ai' or 'online'

  let game = null;
  let renderer = null;
  let peer = null;

  let activeTab = 'game'; // 'setup' or 'game'

  container.innerHTML = `
    <div class="magic-fighter-page animate-fade-in">
      <!-- Top Mobile Navigation Switcher (768px below) -->
      <div class="game-mobile-tabs" id="mobile-tab-bar">
        <button class="mobile-tab-btn" id="btn-tab-setup">
          ⚙️ 房間/設定
        </button>
        <button class="mobile-tab-btn active" id="btn-tab-game">
          🎮 魔法對戰區
        </button>
      </div>

      <div class="magic-fighter-layout">
        <!-- Sidebar Controls & Setup -->
        <aside class="magic-side-panel ${activeTab === 'setup' ? 'mobile-visible' : 'mobile-hidden'}" id="panel-setup">
          <div class="panel-card">
            <h2 class="panel-title">✈️ 魔法對戰 (MAGIC FIGHTER)</h2>
            <p class="panel-desc">傳承經典《坦克大戰》的核心對戰！保護蘿蔔基地，破壞磚牆，擊退魔法戰機敵軍！</p>

            <div class="mode-badge-box">
              <span class="badge badge-warning">${mode === 'ai' ? '🤖 AI 波次關卡對決' : '🌐 線上 P2P 連線對抗'}</span>
            </div>

            <!-- Stats & Chips HUD -->
            <div class="hud-box">
              <div class="hud-item">
                <span class="hud-label">得分 SCORE</span>
                <span class="hud-value" id="hud-score">0</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">當前波次 WAVE</span>
                <span class="hud-value" id="hud-wave">1 / 5</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">戰機 HP</span>
                <span class="hud-value" id="hud-hp">❤️❤️❤️</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">蘿蔔基地</span>
                <span class="hud-value" id="hud-base-status">🛡️ 完好</span>
              </div>
            </div>

            <!-- Game Actions -->
            <div class="actions-box">
              <button class="btn btn-primary btn-block" id="btn-restart-game">
                🔄 重新開始遊戲
              </button>
              <a href="#/" class="btn btn-secondary btn-block" style="text-align:center;">
                🏠 返回遊戲大廳
              </a>
            </div>

            <!-- Instructions -->
            <div class="guide-box">
              <h4>🎮 操作說明</h4>
              <p>💻 **電腦**：方向鍵 / WASD 移動戰機，【空白鍵 Space】發射魔法子彈。</p>
              <p>📱 **手機**：使用下方虛擬搖桿與開火按鈕操作。</p>
              <p>⚡ **道具掉落**：雙重連發、魔法護盾、全螢幕清場與基地加固。</p>
            </div>
          </div>
        </aside>

        <!-- Main Game Area -->
        <main class="magic-main-area ${activeTab === 'game' ? 'mobile-visible' : 'mobile-hidden'}" id="panel-game">
          <div class="canvas-wrapper">
            <canvas id="fighter-canvas" width="640" height="640"></canvas>
            
            <!-- Game Over Overlay -->
            <div class="game-over-overlay" id="game-over-modal" style="display:none;">
              <div class="game-over-card animate-scale-up">
                <h2 id="go-title">🎮 遊戲結束</h2>
                <p id="go-desc">蘿蔔基地已失守！</p>
                <div class="go-reward" id="go-reward-chips">+ $0 籌碼</div>
                <button class="btn btn-primary" id="btn-modal-restart">🔄 再玩一局</button>
              </div>
            </div>
          </div>

          <!-- Mobile Virtual Joystick & Actions -->
          <div class="mobile-controller-bar">
            <div class="dpad-box">
              <button class="dpad-btn up" id="btn-dpad-up">▲</button>
              <div class="dpad-row">
                <button class="dpad-btn left" id="btn-dpad-left">◄</button>
                <button class="dpad-btn right" id="btn-dpad-right">►</button>
              </div>
              <button class="dpad-btn down" id="btn-dpad-down">▼</button>
            </div>
            <button class="mobile-fire-btn" id="btn-mobile-fire">
              🔥
              <span>射擊</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  `;

  // Mobile Tab Switching
  const btnTabSetup = container.querySelector('#btn-tab-setup');
  const btnTabGame = container.querySelector('#btn-tab-game');
  const panelSetup = container.querySelector('#panel-setup');
  const panelGame = container.querySelector('#panel-game');

  const switchTab = (tab) => {
    activeTab = tab;
    if (tab === 'setup') {
      btnTabSetup?.classList.add('active');
      btnTabGame?.classList.remove('active');
      panelSetup?.classList.remove('mobile-hidden');
      panelSetup?.classList.add('mobile-visible');
      panelGame?.classList.remove('mobile-visible');
      panelGame?.classList.add('mobile-hidden');
    } else {
      btnTabGame?.classList.add('active');
      btnTabSetup?.classList.remove('active');
      panelGame?.classList.remove('mobile-hidden');
      panelGame?.classList.add('mobile-visible');
      panelSetup?.classList.remove('mobile-visible');
      panelSetup?.classList.add('mobile-hidden');
    }
  };

  btnTabSetup?.addEventListener('click', () => switchTab('setup'));
  btnTabGame?.addEventListener('click', () => switchTab('game'));

  // Initialize Game & Canvas
  const canvas = container.querySelector('#fighter-canvas');
  game = new MagicFighterGame();
  renderer = new FighterRenderer();

  game.init(canvas);

  // Keyboard Listeners
  const activeKeys = {};
  const handleKeyDown = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'w', 'a', 's', 'd'].includes(e.code)) {
      e.preventDefault();
    }
    activeKeys[e.code] = true;

    if (e.code === 'Space') {
      game.firePlayerBullet();
    }
  };

  const handleKeyUp = (e) => {
    activeKeys[e.code] = false;
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Key Loop for smooth continuous movement
  let keyInterval = setInterval(() => {
    if (!game || !game.running) return;

    if (activeKeys['ArrowUp'] || activeKeys['KeyW']) game.movePlayer('UP');
    else if (activeKeys['ArrowDown'] || activeKeys['KeyS']) game.movePlayer('DOWN');
    else if (activeKeys['ArrowLeft'] || activeKeys['KeyA']) game.movePlayer('LEFT');
    else if (activeKeys['ArrowRight'] || activeKeys['KeyD']) game.movePlayer('RIGHT');
  }, 30);

  // Mobile Controller Buttons
  const dpadUp = container.querySelector('#btn-dpad-up');
  const dpadDown = container.querySelector('#btn-dpad-down');
  const dpadLeft = container.querySelector('#btn-dpad-left');
  const dpadRight = container.querySelector('#btn-dpad-right');
  const btnFire = container.querySelector('#btn-mobile-fire');

  dpadUp?.addEventListener('touchstart', (e) => { e.preventDefault(); game.movePlayer('UP'); });
  dpadDown?.addEventListener('touchstart', (e) => { e.preventDefault(); game.movePlayer('DOWN'); });
  dpadLeft?.addEventListener('touchstart', (e) => { e.preventDefault(); game.movePlayer('LEFT'); });
  dpadRight?.addEventListener('touchstart', (e) => { e.preventDefault(); game.movePlayer('RIGHT'); });
  btnFire?.addEventListener('touchstart', (e) => { e.preventDefault(); game.firePlayerBullet(); });

  // Game Engine State Change Listener
  game.onStateChange = (state) => {
    // Render Frame
    renderer.render(game.ctx, state, game.width, game.height);

    // Update HUD
    const hudScore = container.querySelector('#hud-score');
    const hudWave = container.querySelector('#hud-wave');
    const hudHp = container.querySelector('#hud-hp');
    const hudBase = container.querySelector('#hud-base-status');

    if (hudScore) hudScore.textContent = state.score;
    if (hudWave) hudWave.textContent = `${state.wave} / ${state.maxWaves}`;
    if (hudHp) hudHp.textContent = '❤️'.repeat(Math.max(0, state.player.hp));
    if (hudBase) hudBase.textContent = state.base.destroyed ? '💥 毀壞' : '🛡️ 完好';
  };

  // Game Over Callback
  game.onGameOver = async ({ victory, score, reason }) => {
    const modal = container.querySelector('#game-over-modal');
    const titleEl = container.querySelector('#go-title');
    const descEl = container.querySelector('#go-desc');
    const rewardEl = container.querySelector('#go-reward-chips');

    const reward = victory ? 300 + score : Math.floor(score / 2);
    if (reward > 0) {
      const profile = getUserProfile();
      await updateUserChips(profile.chips + reward);
    }
    await updateUserStats('magicFighter', { isWin: victory, netProfit: reward });

    if (titleEl) titleEl.textContent = victory ? '🎉 空戰勝利！' : '💥 戰局結束';
    if (descEl) descEl.textContent = reason;
    if (rewardEl) rewardEl.textContent = `🎁 獲得帳號籌碼本金：+$${reward.toLocaleString()}`;

    if (modal) modal.style.display = 'flex';
  };

  // Restart Handlers
  const restartGame = () => {
    const modal = container.querySelector('#game-over-modal');
    if (modal) modal.style.display = 'none';
    game.newGame(1);
  };

  container.querySelector('#btn-restart-game')?.addEventListener('click', restartGame);
  container.querySelector('#btn-modal-restart')?.addEventListener('click', restartGame);

  // Cleanup Function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (keyInterval) clearInterval(keyInterval);
    if (game) game.destroy();
  };
}
