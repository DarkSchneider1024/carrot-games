/**
 * Magic Fighter 3D Battle Page (全 3D 魔法紅白機波次關卡對戰主頁面)
 * Features Player Base HQ defense, NES Battle City Wave Progression, Mana Economy, & Wall Destruction.
 */

import { MagicFighterGame } from '../../games/magic-fighter/game-controller.js';
import { FighterRenderer3D } from '../../games/magic-fighter/fighter-renderer-3d.js';
import { VirtualJoystick } from '../../components/joystick.js';
import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { updateUserChips, updateUserStats, getUserProfile } from '../../network/auth-manager.js';
import { showToast } from '../../components/toast.js';

export async function renderMagicFighter(container, params = {}) {
  const mode = params.mode || 'ai';

  let game = null;
  let renderer3D = null;
  let joystick = null;

  let activeTab = 'game';

  container.innerHTML = `
    <div class="magic-fighter-page animate-fade-in">
      <!-- Unified Topbar Header Component -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">魔法對戰 3D (MAGIC FIGHTER)</span>
            <span class="badge badge-warning">${mode === 'ai' ? '紅白機波次關卡制度' : '線上 P2P 雙塔對抗'}</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-settings" title="設置">
            ${SVG_ICONS.settings}
          </button>
        </div>
      </div>

      <!-- Unified Mobile Navigation Tabs -->
      <div class="game-mobile-tabs">
        <button class="mobile-tab-btn" id="mtab-setup">
          戰務與招募
        </button>
        <button class="mobile-tab-btn active" id="mtab-game">
          3D 對戰區
        </button>
      </div>

      <!-- Unified Main Game Workspace Layout -->
      <div class="magic-fighter-main">
        <!-- Sidebar Controls & Setup Panel -->
        <aside class="magic-panel-left ${activeTab === 'setup' ? 'mobile-visible' : 'mobile-hidden'}" id="panel-setup">
          <div class="panel-card">
            <h3 class="panel-subtitle">3D 經典波次戰務</h3>
            <p class="panel-desc">比照 NES 紅白機坦克大戰！擊退 5 大波次敵方怪物軍團，可開火摧毀磚牆保護底部天空城堡主塔！</p>

            <!-- Stats & Chips HUD Box -->
            <div class="hud-box">
              <div class="hud-item">
                <span class="hud-label">當前關卡波次</span>
                <span class="hud-value" id="hud-wave" style="color:#ff7544;">1 / 5</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">剩餘敵軍軍團</span>
                <span class="hud-value" id="hud-enemies" style="color:#06b6d4;">16</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">魔法資源 MANA</span>
                <span class="hud-value" id="hud-mana" style="color:#2ec4b6;">120 / 999</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">我方城堡主塔</span>
                <span class="hud-value" id="hud-player-base" style="color:#38bdf8;">500 / 500</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">得分 SCORE</span>
                <span class="hud-value" id="hud-score">0</span>
              </div>
              <div class="hud-item">
                <span class="hud-label">火力等級 STAR</span>
                <span class="hud-value" id="hud-power" style="color:#eab308;">LV.1</span>
              </div>
            </div>

            <!-- Monster Summoning & Shop Actions -->
            <div class="summon-shop-box">
              <h4 style="margin:0 0 6px 0;font-size:0.85rem;color:#ff7544;">魔法怪兵招募與強化</h4>
              <div class="summon-btn-grid">
                <button class="btn btn-secondary btn-sm summon-btn" id="btn-summon-bat">
                  🧛 吸血鬼 ($50)
                </button>
                <button class="btn btn-secondary btn-sm summon-btn" id="btn-summon-griffin">
                  🦅 鷹獅 ($100)
                </button>
                <button class="btn btn-secondary btn-sm summon-btn" id="btn-summon-dragon">
                  🐲 烈焰龍 ($200)
                </button>
                <button class="btn btn-cyan btn-sm summon-btn" id="btn-upgrade-star">
                  ⭐️ 升級火力 ($150)
                </button>
                <button class="btn btn-primary btn-sm summon-btn" id="btn-fortify-base" style="grid-column: span 2;">
                  🏰 加固主塔鋼牆 ($150)
                </button>
              </div>
            </div>

            <!-- Game Actions Bar -->
            <div class="actions-box">
              <button class="btn btn-primary btn-block" id="btn-restart-game">
                ${SVG_ICONS.refresh} 重新開始遊戲
              </button>
              <a href="#/" class="btn btn-secondary btn-block" style="text-align:center;">
                ${SVG_ICONS.home} 返回遊戲大廳
              </a>
            </div>
          </div>
        </aside>

        <!-- Main Game 3D Stage Area -->
        <main class="magic-stage-container ${activeTab === 'game' ? 'mobile-visible' : 'mobile-hidden'}" id="panel-game">
          <div class="canvas-wrapper-3d" id="three-container">
            <!-- Unified Game Over Modal Overlay Component -->
            <div class="game-over-overlay" id="game-over-modal" style="display:none;">
              <div class="game-over-content animate-scale-up">
                <h2 id="go-title">3D 戰局結束</h2>
                <p id="go-desc">主塔已被摧毀！</p>
                <div class="go-reward" id="go-reward-chips">+ $0 籌碼</div>
                <div class="game-over-actions">
                  <button class="btn btn-primary" id="btn-modal-restart">${SVG_ICONS.refresh} 再玩一局</button>
                  <a href="#/" class="btn btn-secondary">${SVG_ICONS.home} 回大廳</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Summon Action Bar Overlay on 3D Stage (Bottom Right) -->
          <div class="quick-summon-bar glass">
            <button class="btn btn-xs btn-ghost qsummon-btn" id="qbtn-bat" title="召喚吸血鬼伯爵 ($50)">
              🧛 $50
            </button>
            <button class="btn btn-xs btn-ghost qsummon-btn" id="qbtn-griffin" title="召喚鷹獅 ($100)">
              🦅 $100
            </button>
            <button class="btn btn-xs btn-ghost qsummon-btn" id="qbtn-dragon" title="召喚烈焰飛龍 ($200)">
              🐲 $200
            </button>
            <button class="btn btn-xs btn-cyan qsummon-btn" id="qbtn-star" title="升級戰機火力 ($150)">
              ⭐️ $150
            </button>
          </div>

          <!-- Mobile Virtual Controls Bar -->
          <div class="mobile-3d-controller-bar">
            <div class="joystick-touch-zone" id="joystick-zone">
              <span class="joystick-hint">360° 模擬搖桿</span>
            </div>
            <button class="mobile-fire-btn-3d" id="btn-mobile-fire">
              <span>開火</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  `;

  // Topbar Navigation Buttons
  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('/'));
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('/guide?game=magicFighter'));

  // Unified Mobile Tab Switcher
  const btnTabSetup = container.querySelector('#mtab-setup');
  const btnTabGame = container.querySelector('#mtab-game');
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

  // Initialize Game & 3D WebGL Renderer
  const threeContainer = container.querySelector('#three-container');
  game = new MagicFighterGame();
  renderer3D = new FighterRenderer3D();

  const cWidth = threeContainer.clientWidth || 640;
  const cHeight = threeContainer.clientHeight || 640;

  renderer3D.init(threeContainer, cWidth, cHeight);

  // Attach State Sync Callback BEFORE calling game.init()
  game.onStateChange = (state) => {
    if (renderer3D) renderer3D.render(state);

    const hudMana = container.querySelector('#hud-mana');
    const hudPBase = container.querySelector('#hud-player-base');
    const hudWave = container.querySelector('#hud-wave');
    const hudEnemies = container.querySelector('#hud-enemies');
    const hudScore = container.querySelector('#hud-score');
    const hudPower = container.querySelector('#hud-power');

    if (hudMana) hudMana.textContent = `${Math.floor(state.playerMana)} / 999`;
    if (hudPBase) hudPBase.textContent = `${Math.max(0, state.playerBase.hp)} / 500`;
    if (hudWave) hudWave.textContent = `${state.wave} / ${state.maxWaves}`;
    if (hudEnemies) hudEnemies.textContent = Math.max(0, state.enemiesRemaining);
    if (hudScore) hudScore.textContent = state.score;
    if (hudPower) {
      const pLvl = state.player.starLevel || 0;
      const labels = ['LV.1 標準', 'LV.2 雙發', 'LV.3 雙發', 'LV.4 貫穿鋼牆'];
      hudPower.textContent = labels[pLvl] || 'LV.1';
    }
  };

  // Game Over Callback
  game.onGameOver = async ({ victory, score, reason }) => {
    const modal = container.querySelector('#game-over-modal');
    const titleEl = container.querySelector('#go-title');
    const descEl = container.querySelector('#go-desc');
    const rewardEl = container.querySelector('#go-reward-chips');

    const reward = victory ? 600 + score : Math.floor(score / 2);
    if (reward > 0) {
      const profile = getUserProfile();
      await updateUserChips(profile.chips + reward);
    }
    await updateUserStats('magicFighter', { isWin: victory, netProfit: reward });

    if (titleEl) titleEl.textContent = victory ? '全通 5 大關卡！勝利！' : '藍晶主塔被摧毀！敗陣！';
    if (descEl) descEl.textContent = reason;
    if (rewardEl) rewardEl.textContent = `獲得帳號籌碼本金：+$${reward.toLocaleString()}`;

    if (modal) modal.style.display = 'flex';
  };

  // Start Game Engine
  game.init(mode);
  renderer3D.render(game.getState());

  // Bind Summoning & Shop Buttons
  const handleSummon = (type, name, cost) => {
    if (game.summonPlayerCreep(type)) {
      showToast(`成功召喚【${name}】出戰！(-$${cost} Mana)`, 'success');
    } else {
      showToast(`魔法資源 Mana 不足！(需要 $${cost} Mana)`, 'warning');
    }
  };

  container.querySelector('#btn-summon-bat')?.addEventListener('click', () => handleSummon('bat', '吸血鬼伯爵', 50));
  container.querySelector('#qbtn-bat')?.addEventListener('click', () => handleSummon('bat', '吸血鬼伯爵', 50));

  container.querySelector('#btn-summon-griffin')?.addEventListener('click', () => handleSummon('griffin', '疾風鷹獅', 100));
  container.querySelector('#qbtn-griffin')?.addEventListener('click', () => handleSummon('griffin', '疾風鷹獅', 100));

  container.querySelector('#btn-summon-dragon')?.addEventListener('click', () => handleSummon('dragon', '烈焰飛龍', 200));
  container.querySelector('#qbtn-dragon')?.addEventListener('click', () => handleSummon('dragon', '烈焰飛龍', 200));

  container.querySelector('#btn-upgrade-star')?.addEventListener('click', () => {
    if (game.upgradePlayerFighter()) {
      showToast('戰機火力成功升級！(-$150 Mana)', 'success');
    } else {
      showToast('Mana 不足或已達最高火力等級！', 'warning');
    }
  });
  container.querySelector('#qbtn-star')?.addEventListener('click', () => {
    if (game.upgradePlayerFighter()) {
      showToast('戰機火力成功升級！(-$150 Mana)', 'success');
    } else {
      showToast('Mana 不足或已達最高火力等級！', 'warning');
    }
  });

  container.querySelector('#btn-fortify-base')?.addEventListener('click', () => {
    if (game.fortifyPlayerBase()) {
      showToast('主塔血量修復並建構鋼牆護盾 15 秒！(-$150 Mana)', 'success');
    } else {
      showToast('Mana 不足 $150，無法加固主塔！', 'warning');
    }
  });

  // ResizeObserver for dynamic responsiveness
  const resizeObserver = new ResizeObserver(() => {
    if (renderer3D && threeContainer) {
      const w = threeContainer.clientWidth || 640;
      const h = threeContainer.clientHeight || 640;
      renderer3D.setSize(w, h);
    }
  });
  resizeObserver.observe(threeContainer);

  // Initialize 360° Virtual Joystick
  const joystickZone = container.querySelector('#joystick-zone');
  if (joystickZone) {
    joystick = new VirtualJoystick(joystickZone, {
      maxRadius: 55,
      onMove: (vector) => {
        if (game && game.running) {
          game.movePlayerVector(vector.x, vector.y);
        }
      },
      onEnd: () => {
        if (game) game.stopPlayer();
      }
    });
  }

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

  // Keyboard Continuous Movement Loop
  let keyInterval = setInterval(() => {
    if (!game || !game.running) return;

    let vx = 0;
    let vy = 0;

    if (activeKeys['ArrowLeft'] || activeKeys['KeyA']) vx -= 1;
    if (activeKeys['ArrowRight'] || activeKeys['KeyD']) vx += 1;
    if (activeKeys['ArrowUp'] || activeKeys['KeyW']) vy -= 1;
    if (activeKeys['ArrowDown'] || activeKeys['KeyS']) vy += 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    if (vx !== 0 || vy !== 0) {
      game.movePlayerVector(vx, vy);
    } else if (!joystick || !joystick.active) {
      game.stopPlayer();
    }
  }, 20);

  // Mobile Fire Button
  const btnFire = container.querySelector('#btn-mobile-fire');
  btnFire?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.firePlayerBullet();
  });
  btnFire?.addEventListener('click', () => game.firePlayerBullet());

  const restartGame = () => {
    const modal = container.querySelector('#game-over-modal');
    if (modal) modal.style.display = 'none';
    game.newGame(1);
  };

  container.querySelector('#btn-restart-game')?.addEventListener('click', restartGame);
  container.querySelector('#btn-modal-restart')?.addEventListener('click', restartGame);

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (keyInterval) clearInterval(keyInterval);
    if (joystick) joystick.destroy();
    if (game) game.destroy();
    if (renderer3D) renderer3D.destroy();
  };
}
