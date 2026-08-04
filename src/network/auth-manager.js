/**
 * Authentication & User Profile Manager — Firebase Auth + Realtime Database + Dual Local Persistence
 *
 * Supports Email/Password, Google Sign-In, Anonymous Guest, Cloud & Local Stats/Chip Persistence ($1000 Default),
 * and Automatic Bankruptcy Refill (+1000 Chips).
 */

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { getDatabase, ref, get, set, update, onValue } from 'firebase/database';
import { initFirebase } from './firebase-manager.js';
import { getPlayerName, setPlayerName } from '../utils/player-profile.js';
import { showToast } from '../components/toast.js';

let auth = null;
let db = null;
let currentUser = null;
let currentProfile = null;
const authListeners = new Set();
let profileUnsub = null;

const DEFAULT_STARTING_CHIPS = 1000;
const DEFAULT_STATS = {
  poker: { played: 0, won: 0, netProfit: 0 },
  xiangqi: { played: 0, won: 0 },
  tetris: { played: 0, won: 0 },
  magicFighter: { played: 0, won: 0, netProfit: 0 }
};

/**
 * Local Storage Persistence Helpers
 */
function _loadLocalStats() {
  try {
    const raw = localStorage.getItem('carrot_game_stats');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        poker: { ...DEFAULT_STATS.poker, ...(parsed.poker || {}) },
        xiangqi: { ...DEFAULT_STATS.xiangqi, ...(parsed.xiangqi || {}) },
        tetris: { ...DEFAULT_STATS.tetris, ...(parsed.tetris || {}) },
        magicFighter: { ...DEFAULT_STATS.magicFighter, ...(parsed.magicFighter || {}) }
      };
    }
  } catch (e) {
    console.warn('Failed to load local stats:', e);
  }
  return { ...DEFAULT_STATS };
}

function _saveLocalProfile(profile) {
  if (!profile) return;
  try {
    if (profile.stats) {
      localStorage.setItem('carrot_game_stats', JSON.stringify(profile.stats));
    }
    if (profile.chips !== undefined) {
      localStorage.setItem('carrot_user_chips', profile.chips.toString());
    }
  } catch (e) {
    console.warn('Failed to save local profile:', e);
  }
}

/**
 * Initialize Authentication System
 */
export function initAuth(onAuthChangeCallback) {
  if (onAuthChangeCallback && typeof onAuthChangeCallback === 'function') {
    authListeners.add(onAuthChangeCallback);
  }

  if (auth) {
    if (onAuthChangeCallback) {
      try {
        onAuthChangeCallback(currentUser, currentProfile);
      } catch (e) {
        console.error('Auth callback error:', e);
      }
    }
    return auth;
  }

  const { app, db: rtdb } = initFirebase();
  auth = getAuth(app);
  db = rtdb;

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }

    const localStats = _loadLocalStats();
    let savedChips = DEFAULT_STARTING_CHIPS;
    try {
      const c = localStorage.getItem('carrot_user_chips');
      if (c) savedChips = parseInt(c, 10) || DEFAULT_STARTING_CHIPS;
    } catch (e) {}

    if (user) {
      if (user.isAnonymous) {
        // Anonymous Guest Profile
        currentProfile = {
          uid: user.uid,
          displayName: getPlayerName() || '匿名訪客',
          email: '',
          photoURL: '',
          isAnonymous: true,
          chips: savedChips,
          stats: localStats
        };
        _notifyAuthListeners();
      } else {
        // Temporary profile until RTDB snapshot loads
        if (!currentProfile || currentProfile.uid !== user.uid) {
          currentProfile = {
            uid: user.uid,
            displayName: user.displayName || getPlayerName() || user.email?.split('@')[0] || '玩家',
            email: user.email || '',
            photoURL: user.photoURL || '',
            isAnonymous: false,
            chips: savedChips,
            stats: localStats
          };
          _notifyAuthListeners();
        }

        // Subscribe to RTDB user node
        if (db) {
          const userRef = ref(db, `users/${user.uid}`);
          profileUnsub = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              const dbStats = data.stats || {};
              currentProfile = {
                ...data,
                uid: user.uid,
                email: user.email || data.email || '',
                isAnonymous: false,
                chips: data.chips !== undefined ? data.chips : savedChips,
                displayName: data.displayName || user.displayName || getPlayerName() || '玩家',
                stats: {
                  poker: { ...DEFAULT_STATS.poker, ...localStats.poker, ...(dbStats.poker || {}) },
                  xiangqi: { ...DEFAULT_STATS.xiangqi, ...localStats.xiangqi, ...(dbStats.xiangqi || {}) },
                  tetris: { ...DEFAULT_STATS.tetris, ...localStats.tetris, ...(dbStats.tetris || {}) },
                  magicFighter: { ...DEFAULT_STATS.magicFighter, ...localStats.magicFighter, ...(dbStats.magicFighter || {}) }
                }
              };
            } else {
              // Initial RTDB write for new account
              currentProfile = {
                uid: user.uid,
                displayName: user.displayName || getPlayerName() || user.email?.split('@')[0] || '玩家',
                email: user.email || '',
                photoURL: user.photoURL || '',
                isAnonymous: false,
                chips: savedChips,
                stats: localStats,
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              set(userRef, currentProfile).catch(err => console.warn('Init user DB set warning:', err));
            }

            if (currentProfile.displayName) {
              setPlayerName(currentProfile.displayName);
            }

            _saveLocalProfile(currentProfile);
            _notifyAuthListeners();
          });
        }
      }
    } else {
      currentProfile = null;
      _notifyAuthListeners();
    }
  });

  return auth;
}

export function notifyAuthChange() {
  _notifyAuthListeners();
}

function _notifyAuthListeners() {
  for (const listener of authListeners) {
    try {
      listener(currentUser, currentProfile);
    } catch (e) {
      console.error('Auth listener execution error:', e);
    }
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function getUserProfile() {
  if (currentProfile) {
    if (currentUser) {
      currentProfile.isAnonymous = currentUser.isAnonymous;
    }
    if (!currentProfile.stats) {
      currentProfile.stats = _loadLocalStats();
    }
    return currentProfile;
  }

  const localStats = _loadLocalStats();
  let savedChips = DEFAULT_STARTING_CHIPS;
  try {
    const c = localStorage.getItem('carrot_user_chips');
    if (c) savedChips = parseInt(c, 10) || DEFAULT_STARTING_CHIPS;
  } catch (e) {}

  return {
    uid: currentUser ? currentUser.uid : 'guest',
    displayName: getPlayerName() || '匿名訪客',
    email: currentUser ? currentUser.email : '',
    photoURL: '',
    isAnonymous: currentUser ? currentUser.isAnonymous : true,
    chips: savedChips,
    stats: localStats
  };
}

/**
 * Sign up with Email & Password
 */
export async function signUpWithEmail(email, password, displayName) {
  if (!auth) initAuth();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const name = displayName?.trim() || email.split('@')[0] || '蘿蔔玩家';

    // Update display name in Firebase Auth (non-critical, failure won't block registration)
    try {
      await updateProfile(user, { displayName: name });
    } catch (e) {
      console.warn('updateProfile warning (non-fatal):', e);
    }
    setPlayerName(name);

    const localStats = _loadLocalStats();
    const initialData = {
      uid: user.uid,
      displayName: name,
      email: user.email || '',
      photoURL: '',
      isAnonymous: false,
      chips: DEFAULT_STARTING_CHIPS,
      stats: localStats,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Write initial profile to RTDB (non-critical, failure won't block registration success)
    if (db) {
      set(ref(db, `users/${user.uid}`), initialData).catch(err =>
        console.warn('Initial DB write warning (non-fatal, will retry on next login):', err)
      );
    }

    currentProfile = initialData;
    _saveLocalProfile(currentProfile);
    _notifyAuthListeners();

    showToast(`🎉 歡迎加入 Carrot Games！已發放初始 $${DEFAULT_STARTING_CHIPS} 籌碼本金！`, 'success');
    return { success: true, user };
  } catch (err) {
    console.error('Sign up error:', err);
    let msg = '註冊失敗，請稍後再試';
    if (err.code === 'auth/email-already-in-use') msg = '該 Email 已被註冊使用，請直接輸入密碼登入';
    else if (err.code === 'auth/weak-password') msg = '密碼強度不足，長度至少需要 6 個字元';
    else if (err.code === 'auth/invalid-email') msg = 'Email 格式無效，請確認未填入首尾空格';
    else if (err.code === 'auth/invalid-credential') msg = '憑證無效，請檢查 Email 格式與密碼';
    else if (err.code === 'auth/network-request-failed') msg = '網路連線失敗，請檢查網路訊號後再試';
    else if (err.code === 'auth/too-many-requests') msg = '操作過於頻繁，請稍後再試';

    showToast(msg, 'warning');
    return { success: false, reason: msg };
  }
}

/**
 * Sign in with Email & Password
 */
export async function signInWithEmail(emailInput, passwordInput) {
  if (!auth) initAuth();
  const email = (emailInput || '').trim().toLowerCase();
  const password = (passwordInput || '').trim();

  if (!email || !password) {
    showToast('請輸入有效的 Email 與密碼', 'warning');
    return { success: false, reason: 'Email 或密碼空白' };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = cred.user;

    if (db) {
      const snapshot = await get(ref(db, `users/${cred.user.uid}`));
      if (snapshot.exists()) {
        const localStats = _loadLocalStats();
        const data = snapshot.val();
        const dbStats = data.stats || {};
        currentProfile = {
          ...data,
          uid: cred.user.uid,
          isAnonymous: false,
          stats: {
            poker: { ...DEFAULT_STATS.poker, ...localStats.poker, ...(dbStats.poker || {}) },
            xiangqi: { ...DEFAULT_STATS.xiangqi, ...localStats.xiangqi, ...(dbStats.xiangqi || {}) },
            tetris: { ...DEFAULT_STATS.tetris, ...localStats.tetris, ...(dbStats.tetris || {}) },
            magicFighter: { ...DEFAULT_STATS.magicFighter, ...localStats.magicFighter, ...(dbStats.magicFighter || {}) }
          }
        };
      }
    }

    _saveLocalProfile(currentProfile);
    _notifyAuthListeners();
    showToast(`歡迎回來，${currentProfile?.displayName || '玩家'}！`, 'success');
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Sign in error:', err);
    let msg = '登入失敗，請檢查帳號密碼';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Email 或密碼不正確，請重新檢查（勿輸入空格）';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Email 格式無效，請重新確認（勿輸入首尾空格）';
    } else if (err.code === 'auth/network-request-failed') {
      msg = '手機網路連線失敗，請檢查網路訊號';
    }

    showToast(msg, 'warning');
    return { success: false, reason: msg };
  }
}

/**
 * Sign in with Google Popup (Mobile Friendly)
 */
export async function signInWithGoogle() {
  if (!auth) initAuth();
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    currentUser = cred.user;

    if (db) {
      const userRef = ref(db, `users/${cred.user.uid}`);
      const snapshot = await get(userRef);

      const localStats = _loadLocalStats();
      if (!snapshot.exists()) {
        const newProfile = {
          uid: cred.user.uid,
          displayName: cred.user.displayName || 'Google 玩家',
          email: cred.user.email || '',
          photoURL: cred.user.photoURL || '',
          isAnonymous: false,
          chips: DEFAULT_STARTING_CHIPS,
          stats: localStats,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await set(userRef, newProfile);
        currentProfile = newProfile;
      } else {
        const data = snapshot.val();
        const dbStats = data.stats || {};
        currentProfile = {
          ...data,
          uid: cred.user.uid,
          isAnonymous: false,
          stats: {
            poker: { ...DEFAULT_STATS.poker, ...localStats.poker, ...(dbStats.poker || {}) },
            xiangqi: { ...DEFAULT_STATS.xiangqi, ...localStats.xiangqi, ...(dbStats.xiangqi || {}) },
            tetris: { ...DEFAULT_STATS.tetris, ...localStats.tetris, ...(dbStats.tetris || {}) },
            magicFighter: { ...DEFAULT_STATS.magicFighter, ...localStats.magicFighter, ...(dbStats.magicFighter || {}) }
          }
        };
      }
    }

    _saveLocalProfile(currentProfile);
    _notifyAuthListeners();
    showToast(`Google 帳號聯動成功！歡迎，${currentProfile?.displayName}！`, 'success');
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Google Sign in error:', err);
    let msg = 'Google 登入失敗';
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      msg = '手機瀏覽器阻擋了 Google 登入彈出視窗，請在手機瀏覽器設置中允許彈窗，或使用 Email 帳號密碼登入！';
    } else if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/invalid-origin') {
      msg = '目前手機發起的 Domain 未在 Firebase 白名單中，請使用 Email/密碼 登入！';
    }

    showToast(msg, 'warning');
    return { success: false, reason: msg };
  }
}

/**
 * Sign in Anonymously (Guest)
 */
export async function signInGuest() {
  if (!auth) initAuth();
  try {
    const cred = await signInAnonymously(auth);
    currentUser = cred.user;
    _notifyAuthListeners();
    showToast('已切換為匿名訪客模式', 'info');
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Anonymous Sign in error:', err);
    showToast('匿名登入失敗', 'warning');
    return { success: false, reason: err.message };
  }
}

export const signInAsGuest = signInGuest;

/**
 * Sign Out
 */
export async function signOutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
    currentUser = null;
    currentProfile = null;
    _notifyAuthListeners();
    showToast('已安全登出帳號', 'info');
  } catch (e) {
    console.error('Sign out error:', e);
  }
}

/**
 * Update Current Logged-In User Chips
 */
export async function updateUserChips(newChipsAmount) {
  const profile = getUserProfile();
  let targetChips = Math.max(0, Math.floor(newChipsAmount));

  let isBankrupt = false;
  if (targetChips <= 0) {
    isBankrupt = true;
    targetChips = DEFAULT_STARTING_CHIPS;
  }

  profile.chips = targetChips;
  _saveLocalProfile(profile);

  if (currentUser && !currentUser.isAnonymous && db) {
    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        chips: targetChips,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error('Failed to sync chips to DB:', e);
    }
  }

  if (isBankrupt) {
    showToast(`破產救援發放！系統已自動撥款 $${DEFAULT_STARTING_CHIPS} 救濟本金給您！`, 'success');
  }

  _notifyAuthListeners();
  return targetChips;
}

/**
 * Update Match Statistics — Dual Cloud & Local Persistence
 */
export async function updateUserStats(gameType, { isWin = false, netProfit = 0 } = {}) {
  const profile = getUserProfile();
  if (!profile.stats) {
    profile.stats = _loadLocalStats();
  }

  if (!profile.stats[gameType]) {
    profile.stats[gameType] = { played: 0, won: 0, netProfit: 0 };
  }

  const stat = profile.stats[gameType];
  stat.played = (stat.played || 0) + 1;
  if (isWin) stat.won = (stat.won || 0) + 1;
  if (netProfit) stat.netProfit = (stat.netProfit || 0) + netProfit;

  // Persist locally immediately (works for both guests & logged users)
  _saveLocalProfile(profile);

  // Sync to Firebase RTDB if logged in
  if (currentUser && !currentUser.isAnonymous && db) {
    try {
      await update(ref(db, `users/${currentUser.uid}/stats/${gameType}`), stat);
    } catch (e) {
      console.error('Failed to sync stats to DB:', e);
    }
  }

  _notifyAuthListeners();
}
