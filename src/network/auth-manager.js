/**
 * Authentication & User Profile Manager — Firebase Auth + Realtime Database
 *
 * Supports Email/Password, Google Sign-In, Anonymous Guest, Cloud Chip Persistence ($1000 Default),
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

    if (user) {
      if (user.isAnonymous) {
        // Anonymous Guest Profile
        currentProfile = {
          uid: user.uid,
          displayName: getPlayerName() || '匿名訪客',
          email: '',
          photoURL: '',
          isAnonymous: true,
          chips: 1000,
          stats: {
            poker: { played: 0, won: 0, netProfit: 0 },
            xiangqi: { played: 0, won: 0 },
            tetris: { played: 0, won: 0 }
          }
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
            chips: DEFAULT_STARTING_CHIPS,
            stats: {
              poker: { played: 0, won: 0, netProfit: 0 },
              xiangqi: { played: 0, won: 0 },
              tetris: { played: 0, won: 0 }
            }
          };
          _notifyAuthListeners();
        }

        // Subscribe to RTDB user node
        if (db) {
          const userRef = ref(db, `users/${user.uid}`);
          profileUnsub = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              currentProfile = {
                ...data,
                uid: user.uid,
                email: user.email || data.email || '',
                isAnonymous: false,
                chips: data.chips !== undefined ? data.chips : DEFAULT_STARTING_CHIPS,
                displayName: data.displayName || user.displayName || getPlayerName() || '玩家'
              };
            } else {
              // Initial RTDB write for new account
              currentProfile = {
                uid: user.uid,
                displayName: user.displayName || getPlayerName() || user.email?.split('@')[0] || '玩家',
                email: user.email || '',
                photoURL: user.photoURL || '',
                isAnonymous: false,
                chips: DEFAULT_STARTING_CHIPS,
                stats: {
                  poker: { played: 0, won: 0, netProfit: 0 },
                  xiangqi: { played: 0, won: 0 },
                  tetris: { played: 0, won: 0 }
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              set(userRef, currentProfile).catch(err => console.warn('Init user DB set warning:', err));
            }

            if (currentProfile.displayName) {
              setPlayerName(currentProfile.displayName);
            }

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
    return currentProfile;
  }

  return {
    uid: currentUser ? currentUser.uid : 'guest',
    displayName: getPlayerName() || '匿名訪客',
    email: currentUser ? currentUser.email : '',
    photoURL: '',
    isAnonymous: currentUser ? currentUser.isAnonymous : true,
    chips: 1000,
    stats: {
      poker: { played: 0, won: 0, netProfit: 0 },
      xiangqi: { played: 0, won: 0 },
      tetris: { played: 0, won: 0 }
    }
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

    // Non-fatal updateProfile
    try {
      await updateProfile(user, { displayName: name });
    } catch (e) {
      console.warn('updateProfile warning:', e);
    }
    setPlayerName(name);

    const initialData = {
      uid: user.uid,
      displayName: name,
      email: user.email || '',
      photoURL: '',
      isAnonymous: false,
      chips: DEFAULT_STARTING_CHIPS,
      stats: {
        poker: { played: 0, won: 0, netProfit: 0 },
        xiangqi: { played: 0, won: 0 },
        tetris: { played: 0, won: 0 }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    currentUser = user;
    currentProfile = initialData;

    if (db) {
      try {
        await set(ref(db, `users/${user.uid}`), initialData);
      } catch (dbErr) {
        console.warn('Initial DB set warning:', dbErr);
      }
    }

    _notifyAuthListeners();
    showToast(`註冊成功！已為您開立帳號並發放本金 $${DEFAULT_STARTING_CHIPS}`, 'success');
    return { success: true, user };
  } catch (err) {
    console.error('Sign up error:', err);
    let msg = '註冊失敗';
    if (err.code === 'auth/email-already-in-use') msg = '該電子郵件已被註冊，請直接登入';
    else if (err.code === 'auth/weak-password') msg = '密碼長度過短 (至少 6 個字元)';
    else if (err.code === 'auth/invalid-email') msg = '無效的電子郵件格式';
    else if (err.message) msg = `註冊失敗: ${err.message}`;

    showToast(msg, 'warning');
    return { success: false, reason: msg };
  }
}

/**
 * Sign in with Email & Password
 */
export async function signInWithEmail(email, password) {
  if (!auth) initAuth();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = cred.user;
    _notifyAuthListeners();
    showToast(`歡迎回來，${cred.user.displayName || cred.user.email}！`, 'success');
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Sign in error:', err);
    let msg = '登入失敗，請檢查帳號密碼';
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      msg = '電子郵件或密碼不正確';
    }
    showToast(msg, 'warning');
    return { success: false, reason: msg };
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  if (!auth) initAuth();
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    currentUser = cred.user;
    if (cred.user.displayName) setPlayerName(cred.user.displayName);
    _notifyAuthListeners();
    showToast(`Google 登入成功！歡迎 ${cred.user.displayName || '玩家'}`, 'success');
    return { success: true, user: cred.user };
  } catch (err) {
    console.error('Google Sign in error:', err);
    showToast('Google 登入取消或失敗', 'warning');
    return { success: false, reason: err.message };
  }
}

/**
 * Sign in Anonymously
 */
export async function signInAsGuest() {
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
 * Update Match Statistics
 */
export async function updateUserStats(gameType, { isWin = false, netProfit = 0 } = {}) {
  const profile = getUserProfile();
  if (!profile.stats) {
    profile.stats = {
      poker: { played: 0, won: 0, netProfit: 0 },
      xiangqi: { played: 0, won: 0 },
      tetris: { played: 0, won: 0 }
    };
  }

  if (!profile.stats[gameType]) {
    profile.stats[gameType] = { played: 0, won: 0, netProfit: 0 };
  }

  const stat = profile.stats[gameType];
  stat.played = (stat.played || 0) + 1;
  if (isWin) stat.won = (stat.won || 0) + 1;
  if (netProfit) stat.netProfit = (stat.netProfit || 0) + netProfit;

  if (currentUser && !currentUser.isAnonymous && db) {
    try {
      await update(ref(db, `users/${currentUser.uid}/stats/${gameType}`), stat);
    } catch (e) {
      console.error('Failed to sync stats to DB:', e);
    }
  }

  _notifyAuthListeners();
}
