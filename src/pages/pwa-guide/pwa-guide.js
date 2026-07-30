/**
 * PWA Installation Guide Page (iOS & Android)
 */

import { navigate } from '../../router.js';
import { SVG_ICONS } from '../../components/icons.js';
import { showToast } from '../../components/toast.js';

let deferredPrompt = null;

// Listen for beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('btn-pwa-install-banner');
  if (pwaBtn) pwaBtn.style.display = 'inline-flex';
});

export async function renderPwaGuide(container) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  container.innerHTML = `
    <div class="pwa-guide-page">
      <!-- Top Bar -->
      <div class="pwa-topbar">
        <button class="btn btn-ghost btn-sm" id="btn-back">
          ${SVG_ICONS.back} <span>返回大廳</span>
        </button>
        <div class="pwa-topbar-title">
          <span>${SVG_ICONS.smartphone} PWA 安裝指南</span>
        </div>
      </div>

      <div class="pwa-content">
        <!-- Hero Banner -->
        <div class="pwa-hero glass animate-fade-in-down">
          <img src="/carrot-games/assets/images/logo_carrot.png" alt="App Logo" class="pwa-app-logo" />
          <div class="pwa-hero-text">
            <h2>將 CARROT GAMES 安裝至手機</h2>
            <p>享受無邊框全螢幕、離線遊玩與極速載入體驗，就像原生 App 一樣流暢！</p>
          </div>
          ${isStandalone ? `
            <div class="badge badge-success" style="font-size:14px;padding:8px 16px;">
              ${SVG_ICONS.check} 已安裝為桌面 App (STANDALONE)
            </div>
          ` : `
            <button class="btn btn-primary" id="btn-pwa-install-banner" style="display:${deferredPrompt ? 'inline-flex' : 'none'};">
              ${SVG_ICONS.download} 一鍵安裝應用程式
            </button>
          `}
        </div>

        <!-- System Platform Tabs -->
        <div class="pwa-tabs animate-fade-in-up stagger-1">
          <button class="btn btn-secondary tab-btn ${isIOS ? 'active' : ''}" data-tab="ios">
            ${SVG_ICONS.apple} iOS (iPhone / iPad) 安裝說明
          </button>
          <button class="btn btn-secondary tab-btn ${!isIOS ? 'active' : ''}" data-tab="android">
            ${SVG_ICONS.android} Android (安卓) 安裝說明
          </button>
        </div>

        <!-- iOS Guide -->
        <div class="guide-card glass tab-content ${isIOS ? 'active' : ''}" id="tab-ios">
          <h3 class="guide-card-title">${SVG_ICONS.apple} iOS (Safari) 安裝步驟：</h3>
          <div class="step-list">
            <div class="step-item">
              <div class="step-num">1</div>
              <div class="step-body">
                <strong>使用 Safari 瀏覽器開啟網站</strong>
                <p>請確認目前使用的是 Apple 原生 <span>Safari 瀏覽器</span>（Chrome/Line 內建瀏覽器不支援 PWA 新增）。</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">2</div>
              <div class="step-body">
                <strong>點擊 Safari 底部的「分享」按鈕</strong>
                <p>在 Safari 畫面下方中軸處，點擊方形帶上方箭頭的 <span>分享圖示 (${SVG_ICONS.share})</span>。</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">3</div>
              <div class="step-body">
                <strong>點選「加入主畫面」(Add to Home Screen)</strong>
                <p>在分享選單中向下滾動，找到並點擊帶有 [+] 號的 <span>「加入主畫面」</span> 選項。</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">4</div>
              <div class="step-body">
                <strong>點擊右上角「新增」即可完成</strong>
                <p>確認名稱為 <span>Carrot Games</span> 後點擊新增，您的手機主畫面上就會出現 App 圖示！</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Android Guide -->
        <div class="guide-card glass tab-content ${!isIOS ? 'active' : ''}" id="tab-android">
          <h3 class="guide-card-title">${SVG_ICONS.android} Android (Chrome / Edge) 安裝步驟：</h3>
          <div class="step-list">
            <div class="step-item">
              <div class="step-num">1</div>
              <div class="step-body">
                <strong>使用 Chrome 或 Edge 瀏覽器開啟網站</strong>
                <p>開啟 Google Chrome 或 Microsoft Edge 瀏覽器。</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">2</div>
              <div class="step-body">
                <strong>點擊右上角的選單按鈕 (⋮)</strong>
                <p>點擊瀏覽器右上角的三個點 <span>選單圖示 (${SVG_ICONS.moreDots})</span>。</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">3</div>
              <div class="step-body">
                <strong>點選「安裝應用程式」或「新增至主畫面」</strong>
                <p>在選單中點選 <span>「安裝應用程式 (Install App)」</span> 或 <span>「新增至主畫面」</span>。</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">4</div>
              <div class="step-body">
                <strong>確認彈窗中的「安裝」</strong>
                <p>點擊確認安裝後，系統會自動將 Carrot Games 圖示加入桌面並提供獨立全螢幕視窗！</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Features Benefit Grid -->
        <div class="pwa-benefits-grid animate-fade-in-up stagger-3">
          <div class="benefit-item glass">
            <span class="benefit-icon">${SVG_ICONS.smartphone}</span>
            <h4>全螢幕沉浸</h4>
            <p>無瀏覽器網址列干擾，提供純粹的戰術對戰視視野</p>
          </div>
          <div class="benefit-item glass">
            <span class="benefit-icon">${SVG_ICONS.cpu}</span>
            <h4>離線預載</h4>
            <p>Service Worker 離線快取，沒網路也能隨時對戰 AI</p>
          </div>
          <div class="benefit-item glass">
            <span class="benefit-icon">${SVG_ICONS.storage}</span>
            <h4>獨立快取</h4>
            <p>OPFS + IndexedDB 沙盒保護，戰績紀錄永遠不遺失</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event Handlers
  document.getElementById('btn-back')?.addEventListener('click', () => navigate('/'));

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabTarget = btn.dataset.tab;
      document.getElementById(`tab-${tabTarget}`)?.classList.add('active');
    });
  });

  // Install trigger
  document.getElementById('btn-pwa-install-banner')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('感謝安裝 Carrot Games！', 'success');
      }
      deferredPrompt = null;
    }
  });

  return () => {};
}
