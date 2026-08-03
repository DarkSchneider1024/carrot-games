/**
 * Auth & User Profile Modal Component
 *
 * Displays Login/Register forms or Logged-In Account Management & Chips Balance
 */

import { showModal, closeModal } from './modal.js';
import { showToast } from './toast.js';
import {
  getCurrentUser,
  getUserProfile,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInAsGuest,
  signOutUser,
  updateUserChips,
  notifyAuthChange
} from '../network/auth-manager.js';
import { setPlayerName } from '../utils/player-profile.js';

export function showAuthModal() {
  const user = getCurrentUser();
  const profile = getUserProfile();

  if (user && !user.isAnonymous) {
    _renderProfileModal(user, profile);
  } else {
    _renderAuthFormModal();
  }
}

/**
 * Render Profile Info Modal for Logged-In User
 */
function _renderProfileModal(user, profile) {
  const pokerStats = profile.stats?.poker || { played: 0, won: 0, netProfit: 0 };
  const xiangqiStats = profile.stats?.xiangqi || { played: 0, won: 0 };
  const tetrisStats = profile.stats?.tetris || { played: 0, won: 0 };

  const providerName = user.providerData?.[0]?.providerId === 'google.com' ? 'Google 聯動帳號' : '電子郵件帳號';

  showModal({
    title: '👤 玩家帳號與戰績管理',
    content: `
      <div class="auth-profile-modal">
        <!-- Account Card Header -->
        <div class="profile-card-header glass" style="padding:1rem;border-radius:12px;display:flex;align-items:center;gap:1rem;background:rgba(255,255,255,0.05);margin-bottom:1rem;">
          <div class="profile-avatar" style="width:48px;height:48px;border-radius:50%;background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:white;font-weight:bold;">
            ${(profile.displayName || ' Carrot ').charAt(0).toUpperCase()}
          </div>
          <div style="flex:1;">
            <h4 style="margin:0;font-size:1.1rem;color:var(--color-text-primary);">${profile.displayName || '玩家'}</h4>
            <span style="font-size:0.75rem;color:var(--color-text-muted);">${profile.email || providerName}</span>
            <div style="margin-top:4px;">
              <span class="badge badge-info" style="font-size:10px;">${providerName}</span>
            </div>
          </div>
        </div>

        <!-- Chips Wallet Section -->
        <div class="profile-wallet-box glass" style="padding:1rem;border-radius:12px;background:rgba(255,117,68,0.08);border:1px solid rgba(255,117,68,0.2);margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <span style="font-size:0.8rem;color:var(--color-text-secondary);display:block;">💰 帳號籌碼本金</span>
            <strong style="font-size:1.6rem;color:var(--color-accent-primary);font-family:var(--font-family-mono);">$${(profile.chips || 0).toLocaleString()}</strong>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-refill-chips" title="若籌碼低於$1000可自動申請補滿">
            ➕ 補給本金
          </button>
        </div>

        <!-- Nickname Edit -->
        <div style="margin-bottom:1.25rem;">
          <label style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:4px;display:block;">修改顯示暱稱：</label>
          <div style="display:flex;gap:8px;">
            <input type="text" class="input" id="input-edit-nickname" value="${profile.displayName || ''}" maxlength="16" placeholder="輸入新暱稱..." style="flex:1;" />
            <button class="btn btn-primary btn-sm" id="btn-save-nickname">儲存</button>
          </div>
        </div>

        <!-- Game Statistics -->
        <div class="profile-stats-section">
          <h5 style="margin:0 0 8px 0;font-size:0.875rem;color:var(--color-text-primary);">📊 遊戲對戰紀錄</h5>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;">
            <div class="stat-card glass" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;">
              <span style="color:var(--color-accent-cyan);font-weight:bold;">🂡 德州撲克</span>
              <div style="margin-top:4px;color:var(--color-text-secondary);">
                對局: ${pokerStats.played} 局<br/>
                獲勝: ${pokerStats.won} 局<br/>
                損益: <strong style="color:${pokerStats.netProfit >= 0 ? '#2ec4b6' : '#ef4444'}">${pokerStats.netProfit >= 0 ? '+' : ''}$${pokerStats.netProfit}</strong>
              </div>
            </div>

            <div class="stat-card glass" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;">
              <span style="color:var(--color-accent-gold);font-weight:bold;">♟️ 中國象棋</span>
              <div style="margin-top:4px;color:var(--color-text-secondary);">
                對局: ${xiangqiStats.played} 局<br/>
                勝場: ${xiangqiStats.won} 局
              </div>
            </div>

            <div class="stat-card glass" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;">
              <span style="color:var(--color-accent-pink);font-weight:bold;">🧩 俄羅斯方塊</span>
              <div style="margin-top:4px;color:var(--color-text-secondary);">
                對局: ${tetrisStats.played} 局<br/>
                勝場: ${tetrisStats.won} 局
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    actions: [
      { text: '關閉', onClick: closeModal },
      {
        text: '🚪 登出帳號',
        class: 'btn-secondary',
        onClick: async () => {
          await signOutUser();
          closeModal();
        }
      }
    ]
  });

  // Attach Event Listeners
  document.getElementById('btn-refill-chips')?.addEventListener('click', async () => {
    if (profile.chips < 1000) {
      await updateUserChips(1000);
      showToast('💰 已成功為您的帳號補滿 $1000 本金！', 'success');
      closeModal();
      showAuthModal();
    } else {
      showToast('目前本金充裕，尚無需補充救濟本金！', 'info');
    }
  });

  document.getElementById('btn-save-nickname')?.addEventListener('click', async () => {
    const input = document.getElementById('input-edit-nickname');
    if (input && input.value.trim()) {
      const newName = setPlayerName(input.value.trim());
      profile.displayName = newName;
      showToast(`暱稱已成功更新為：${newName}`, 'success');
      closeModal();
    }
  });
}

/**
 * Render Login / Register Modal for Unauthenticated or Guest Users
 */
function _renderAuthFormModal() {
  showModal({
    title: '🔑 Carrot Games 帳號登入 / 註冊',
    content: `
      <div class="auth-modal-content">
        <!-- Auth Tabs Header -->
        <div class="auth-tabs" style="display:flex;gap:4px;border-bottom:1px solid var(--color-border);margin-bottom:1rem;padding-bottom:4px;">
          <button class="btn btn-ghost btn-sm auth-tab-btn active" id="tab-auth-login" style="flex:1;">🔑 帳號登入</button>
          <button class="btn btn-ghost btn-sm auth-tab-btn" id="tab-auth-register" style="flex:1;">📝 註冊帳號 (領$1000)</button>
        </div>

        <!-- Tab 1: Login Form -->
        <form class="auth-form" id="form-login" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="font-size:0.8rem;color:var(--color-text-secondary);display:block;margin-bottom:4px;">電子郵件 Email：</label>
            <input type="email" class="input" id="login-email" placeholder="example@gmail.com" required style="width:100%;" />
          </div>
          <div>
            <label style="font-size:0.8rem;color:var(--color-text-secondary);display:block;margin-bottom:4px;">密碼 Password：</label>
            <input type="password" class="input" id="login-password" placeholder="輸入密碼..." required style="width:100%;" />
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:4px;width:100%;">🔑 登入帳號</button>
        </form>

        <!-- Tab 2: Register Form -->
        <form class="auth-form" id="form-register" style="display:none;flex-direction:column;gap:12px;">
          <div class="badge badge-warning" style="margin-bottom:4px;text-align:center;padding:6px;">
            🎁 註冊完成即贈送 $1,000 開戶本金本金紀錄！
          </div>
          <div>
            <label style="font-size:0.8rem;color:var(--color-text-secondary);display:block;margin-bottom:4px;">玩家暱稱 Display Name：</label>
            <input type="text" class="input" id="reg-name" placeholder="取個好聽的名稱..." maxlength="16" required style="width:100%;" />
          </div>
          <div>
            <label style="font-size:0.8rem;color:var(--color-text-secondary);display:block;margin-bottom:4px;">電子郵件 Email：</label>
            <input type="email" class="input" id="reg-email" placeholder="example@gmail.com" required style="width:100%;" />
          </div>
          <div>
            <label style="font-size:0.8rem;color:var(--color-text-secondary);display:block;margin-bottom:4px;">設定密碼 Password (至少6碼)：</label>
            <input type="password" class="input" id="reg-password" placeholder="密碼..." minlength="6" required style="width:100%;" />
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:4px;width:100%;">🚀 建立新帳號並領取 $1000</button>
        </form>

        <div style="text-align:center;margin:1rem 0;position:relative;">
          <hr style="border:0;border-top:1px solid var(--color-border);" />
          <span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--color-bg-card);padding:0 8px;font-size:12px;color:var(--color-text-muted);">或快速登入</span>
        </div>

        <!-- Social & Guest Buttons -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn btn-secondary" id="btn-google-auth" style="width:100%;justify-content:center;">
            🌐 使用 Google 帳號一鍵登入
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-guest-auth" style="width:100%;justify-content:center;color:var(--color-text-muted);">
            👤 繼續使用匿名訪客體驗
          </button>
        </div>
      </div>
    `,
    actions: [
      { text: '取消', onClick: closeModal }
    ]
  });

  // Tab Switching Handler
  const tabLogin = document.getElementById('tab-auth-login');
  const tabReg = document.getElementById('tab-auth-register');
  const formLogin = document.getElementById('form-login');
  const formReg = document.getElementById('form-register');

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.style.display = 'flex';
    formReg.style.display = 'none';
  });

  tabReg?.addEventListener('click', () => {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.style.display = 'flex';
    formLogin.style.display = 'none';
  });

  // Login Form Submit
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    if (email && password) {
      const result = await signInWithEmail(email, password);
      if (result.success) {
        closeModal();
        notifyAuthChange();
      }
    }
  });

  // Register Form Submit
  formReg?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name')?.value;
    const email = document.getElementById('reg-email')?.value;
    const password = document.getElementById('reg-password')?.value;
    if (email && password) {
      const result = await signUpWithEmail(email, password, name);
      if (result.success) {
        closeModal();
        notifyAuthChange();
      }
    }
  });

  // Google Login Button
  document.getElementById('btn-google-auth')?.addEventListener('click', async () => {
    const result = await signInWithGoogle();
    if (result.success) {
      closeModal();
      notifyAuthChange();
    }
  });

  // Guest Login Button
  document.getElementById('btn-guest-auth')?.addEventListener('click', async () => {
    await signInAsGuest();
    closeModal();
    notifyAuthChange();
  });
}
