/**
 * Carrot Games — Saturn Bomberman Page Component
 * Wraps Godot 4 WebAssembly Canvas with Responsive UI Header & Controls Bar
 */

import { SVG_ICONS } from '../../components/icons.js';
import { navigate } from '../../router.js';
import { showModal } from '../../components/modal.js';
import { showToast } from '../../components/toast.js';

export async function renderBomberman(container, params = {}) {
  container.innerHTML = `
    <div class="bomberman-page animate-fade-in">
      <!-- Topbar Header -->
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-sm" id="btn-back" title="返回大廳">
            ${SVG_ICONS.back} <span>大廳</span>
          </button>
          <div class="topbar-title">
            <span class="game-name">卡洛特小鎮 · 炸彈人大作戰 (CARROT BOMBERMAN)</span>
            <span class="badge badge-warning">卡洛特小鎮實驗室 · 1-4 人同樂 / 坐騎系統</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-guide" title="遊戲規則說明">
            📖 <span>規則說明</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btn-fullscreen" title="全螢幕模式">
            ${SVG_ICONS.smartphone} <span>全螢幕</span>
          </button>
        </div>
      </div>

      <!-- Main Container with Frame -->
      <main class="bomberman-main">
        <div class="bomberman-frame-wrapper" id="frame-wrapper">
          <iframe
            src="./games/bomberman/index.html"
            id="bomberman-iframe"
            class="bomberman-iframe"
            allow="fullscreen; autoplay; gamepad"
            title="Saturn Bomberman Game"
          ></iframe>
        </div>

        <!-- Quick Controls Bar -->
        <div class="bomberman-controls-bar">
          <div class="bomberman-control-group">
            <span class="bomberman-control-item">
              <strong>P1 (主玩家):</strong>
              <span class="key-cap">W</span><span class="key-cap">A</span><span class="key-cap">S</span><span class="key-cap">D</span> 移動
              <span class="key-cap">Space</span> 放彈
              <span class="key-cap">Q</span> 下龍
            </span>
          </div>
          <div class="bomberman-control-group">
            <span class="bomberman-control-item">
              <strong>P2 (副玩家):</strong>
              <span class="key-cap">↑</span><span class="key-cap">←</span><span class="key-cap">↓</span><span class="key-cap">→</span> 移動
              <span class="key-cap">Numpad 0</span> 放彈
              <span class="key-cap">Numpad .</span> 下龍
            </span>
            <span class="bomberman-control-item">
              <strong>手把支援:</strong>
              十字鍵 / 左類比移動 · <span class="key-cap">A</span> 放彈 · <span class="key-cap">X</span> 下龍
            </span>
          </div>
        </div>
      </main>
    </div>
  `;

  // Bind Events
  const btnBack = container.querySelector('#btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => navigate('/'));
  }

  const btnFullscreen = container.querySelector('#btn-fullscreen');
  const frameWrapper = container.querySelector('#frame-wrapper');
  if (btnFullscreen && frameWrapper) {
    btnFullscreen.addEventListener('click', () => {
      if (frameWrapper.requestFullscreen) {
        frameWrapper.requestFullscreen();
      } else if (frameWrapper.webkitRequestFullscreen) {
        frameWrapper.webkitRequestFullscreen();
      } else {
        showToast('您的瀏覽器不支援全螢幕切換', 'info');
      }
    });
  }

  const btnGuide = container.querySelector('#btn-guide');
  if (btnGuide) {
    btnGuide.addEventListener('click', () => {
      showModal({
        title: '卡洛特炸彈人大作戰 玩法說明',
        content: `
          <div style="line-height:1.7;color:var(--color-text-primary);">
            <h4 style="margin-bottom:0.5rem;color:#ea580c;">核心目標</h4>
            <p>與科學家卡洛特和陶藝師一同進入迷宮實驗室！炸開石塊、消滅所有敵方機關怪獸，尋找隱藏於方塊底下的傳送出口並成功逃脫過關！</p>

            <h4 style="margin-top:1rem;margin-bottom:0.5rem;color:#ea580c;">小鎮守護坐騎系統（特色）</h4>
            <ul style="padding-left:1.2rem;margin-bottom:1rem;">
              <li><strong>騎乘方式</strong>：炸開可破壞方塊後掉落「守護蛋」，踩上去自動騎上守護坐騎。</li>
              <li><strong>騎乘能力</strong>：移動速度 +50%、騎乘瞬間 2 秒無敵、碰撞敵方可直接踐踏傷害。</li>
              <li><strong>防禦抵擋</strong>：受到火焰爆炸時，坐騎會自動幫你抵擋一次傷害。</li>
              <li><strong>放置炸彈</strong>：騎乘狀態下亦可正常放置炸彈攻擊！</li>
              <li><strong>下坐騎與重騎</strong>：按下鍵（P1: Q / P2: Numpad .）可暫時下坐騎，隨時可重新走回騎乘。</li>
            </ul>

            <h4 style="margin-top:1rem;margin-bottom:0.5rem;color:#ea580c;">實驗室道具系統</h4>
            <ul style="padding-left:1.2rem;">
              <li><strong>炸彈 +1</strong>：增加可同時放置的炸彈上限。</li>
              <li><strong>火力 +1</strong>：擴大爆炸延伸範圍。</li>
              <li><strong>速度提升</strong>：增加步行移動速度。</li>
              <li><strong>守護蛋</strong>：獲得一隻小鎮守護坐騎。</li>
              <li><strong>快速引爆</strong>：縮短炸彈倒計時。</li>
              <li><strong>遠程引爆</strong>：再按一次放彈鍵手動引爆。</li>
              <li><strong>補給箱</strong>：一次獲得炸彈 +1、火力 +1 與速度。</li>
            </ul>
          </div>
        `
      });
    });
  }

  // Auto focus iframe on load
  const iframe = container.querySelector('#bomberman-iframe');
  if (iframe) {
    iframe.addEventListener('load', () => {
      try {
        iframe.contentWindow.focus();
      } catch (e) {
        // Cross-origin fallback
      }
    });
    iframe.addEventListener('click', () => {
      try {
        iframe.contentWindow.focus();
      } catch (e) {}
    });
  }

  // Cleanup handler
  return () => {
    if (iframe) {
      iframe.src = 'about:blank';
    }
  };
}
