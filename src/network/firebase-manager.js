/**
 * Hybrid Lobby & Chat Manager — BroadcastChannel + LocalStorage + Firebase Realtime Database
 *
 * Includes Stale Room Auto-Purging (25s Heartbeat Timeout) & Immediate Disconnect Cleanup
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, onDisconnect, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCDqqgI8F3Oi_jvCwa2itUtDFX4xS1ljmc",
  authDomain: "carrot-games-fd66d.firebaseapp.com",
  databaseURL: "https://carrot-games-fd66d-default-rtdb.firebaseio.com",
  projectId: "carrot-games-fd66d",
  storageBucket: "carrot-games-fd66d.firebasestorage.app",
  messagingSenderId: "595978973567",
  appId: "1:595978973567:web:d9bf8c212988ff1d6c2a4a",
  measurementId: "G-YPY3E8W7HH"
};

let app = null;
let db = null;
let broadcastChannel = null;
let lastSendTimestamp = 0;
let lastMessageContent = '';

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('carrot-games-lobby');
}

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function initFirebase() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      db = getDatabase(app);
      console.log('🔥 [Firebase] Realtime Database initialized');
    } catch (e) {
      console.warn('🔥 [Firebase] Init warning:', e.message);
    }
  }
  return { app, db };
}

function getLocalRooms() {
  try {
    const data = localStorage.getItem('carrot_rooms_cache');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalRooms(roomsMap) {
  try {
    localStorage.setItem('carrot_rooms_cache', JSON.stringify(roomsMap));
  } catch (e) {}
}

function getLocalChat() {
  try {
    const data = localStorage.getItem('carrot_chat_cache');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalChat(chatList) {
  try {
    localStorage.setItem('carrot_chat_cache', JSON.stringify(chatList.slice(-40)));
  } catch (e) {}
}

/**
 * Publish a public room to global lobby
 */
export async function publishRoom({ roomId, gameType, gameName, hostName = '匿名玩家', maxPlayers = 2 }) {
  const now = Date.now();
  const roomData = {
    roomId: escapeHTML(roomId),
    gameType: escapeHTML(gameType),
    gameName: escapeHTML(gameName),
    hostName: escapeHTML(hostName).slice(0, 20),
    currentPlayers: 1,
    maxPlayers,
    createdAt: now,
    lastSeen: now,
  };

  const rooms = getLocalRooms();
  rooms[roomId] = roomData;
  saveLocalRooms(rooms);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'ROOMS_UPDATED', rooms: Object.values(rooms) });
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const roomRef = ref(db, `rooms/${roomId}`);
      await set(roomRef, roomData);
      onDisconnect(roomRef).remove();
    }
  } catch (err) {
    console.warn('🔥 [Firebase] Cloud publish warning:', err.message);
  }
}

/**
 * Send Heartbeat to keep room active in lobby
 */
export async function updateRoomHeartbeat(roomId) {
  if (!roomId) return;
  const now = Date.now();
  const rooms = getLocalRooms();
  if (rooms[roomId]) {
    rooms[roomId].lastSeen = now;
    saveLocalRooms(rooms);
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const heartbeatRef = ref(db, `rooms/${roomId}/lastSeen`);
      await set(heartbeatRef, now);
    }
  } catch (e) {}
}

/**
 * Update player count for a published room
 */
export async function updateRoomPlayerCount(roomId, currentPlayers) {
  const rooms = getLocalRooms();
  if (rooms[roomId]) {
    rooms[roomId].currentPlayers = currentPlayers;
    rooms[roomId].lastSeen = Date.now();
    saveLocalRooms(rooms);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ROOMS_UPDATED', rooms: Object.values(rooms) });
    }
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const roomRef = ref(db, `rooms/${roomId}/currentPlayers`);
      await set(roomRef, currentPlayers);
    }
  } catch (e) {}
}

/**
 * Remove room from public lobby immediately
 */
export async function unpublishRoom(roomId) {
  if (!roomId) return;
  const rooms = getLocalRooms();
  delete rooms[roomId];
  saveLocalRooms(rooms);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'ROOMS_UPDATED', rooms: Object.values(rooms) });
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const roomRef = ref(db, `rooms/${roomId}`);
      await remove(roomRef);
    }
  } catch (e) {}
}

/**
 * Subscribe to real-time public rooms list with 25s stale room auto-purge
 */
export function subscribePublicRooms(callback) {
  let firebaseUnsub = null;

  const updateRooms = (cloudRooms = null) => {
    const localMap = getLocalRooms();
    const now = Date.now();

    // 1. Purge stale local rooms without heartbeat for > 25 seconds
    Object.keys(localMap).forEach(id => {
      const lastSeen = localMap[id].lastSeen || localMap[id].createdAt || 0;
      if (now - lastSeen > 25000) {
        delete localMap[id];
      }
    });
    saveLocalRooms(localMap);

    const merged = { ...localMap };

    // 2. Filter out cloud rooms without recent heartbeat (> 25 seconds) & auto-sweep legacy ghost rooms
    if (cloudRooms && Array.isArray(cloudRooms)) {
      cloudRooms.forEach(r => {
        const lastSeen = r.lastSeen || r.createdAt || 0;
        if (now - lastSeen <= 25000) {
          merged[r.roomId] = r;
        } else {
          delete merged[r.roomId];
          // Auto-sweep legacy ghost room directly from Firebase cloud!
          if (r.roomId) {
            unpublishRoom(r.roomId);
          }
        }
      });
    }

    const roomsList = Object.values(merged).sort((a, b) => b.createdAt - a.createdAt);
    callback(roomsList);
  };

  updateRooms();

  const handleBcMessage = (e) => {
    if (e.data && e.data.type === 'ROOMS_UPDATED') {
      updateRooms();
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const roomsRef = ref(db, 'rooms');
      firebaseUnsub = onValue(roomsRef, (snapshot) => {
        const data = snapshot.val();
        const cloudRooms = data ? Object.values(data) : [];
        updateRooms(cloudRooms);
      }, () => {
        updateRooms();
      });
    }
  } catch (e) {
    updateRooms();
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    if (firebaseUnsub) firebaseUnsub();
  };
}

/**
 * Send a message to global lobby chat
 */
export async function sendGlobalChatMessage(author, message) {
  if (!message || !message.trim()) return { success: false, reason: '訊息不能為空' };

  const now = Date.now();
  if (now - lastSendTimestamp < 2500) {
    return { success: false, reason: '發送太快囉！請稍候 2 秒再試。' };
  }

  const cleanText = escapeHTML(message.trim().slice(0, 80));
  if (cleanText === lastMessageContent && now - lastSendTimestamp < 10000) {
    return { success: false, reason: '請勿重複發送相同內容！' };
  }

  lastSendTimestamp = now;
  lastMessageContent = cleanText;

  const msgData = {
    id: `msg_${now}_${Math.random().toString(36).substr(2, 4)}`,
    author: escapeHTML(author || '大廳玩家').slice(0, 16),
    text: cleanText,
    timestamp: now,
  };

  const chatList = getLocalChat();
  chatList.push(msgData);
  saveLocalChat(chatList);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'CHAT_UPDATED', chat: chatList });
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const chatRef = ref(db, 'chat');
      const newMsgRef = push(chatRef);
      await set(newMsgRef, msgData);
    }
  } catch (err) {
    console.warn('🔥 [Firebase] Cloud chat sync warning:', err.message);
  }

  return { success: true };
}

/**
 * Subscribe to global lobby chat messages
 */
export function subscribeGlobalChat(callback) {
  let firebaseUnsub = null;

  const updateChat = (cloudChat = null) => {
    const localChat = getLocalChat();
    const map = {};
    localChat.forEach(m => map[m.id || m.timestamp] = m);

    if (cloudChat && Array.isArray(cloudChat)) {
      cloudChat.forEach(m => map[m.id || m.timestamp] = m);
    }

    const messages = Object.values(map)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-40);
    callback(messages);
  };

  updateChat();

  const handleBcMessage = (e) => {
    if (e.data && e.data.type === 'CHAT_UPDATED') {
      updateChat();
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
  }

  try {
    const { db } = initFirebase();
    if (db) {
      const chatRef = ref(db, 'chat');
      firebaseUnsub = onValue(chatRef, (snapshot) => {
        const data = snapshot.val();
        const cloudChat = data ? Object.values(data) : [];
        updateChat(cloudChat);
      }, () => {
        updateChat();
      });
    }
  } catch (e) {
    updateChat();
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    if (firebaseUnsub) firebaseUnsub();
  };
}
