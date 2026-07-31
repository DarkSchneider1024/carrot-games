/**
 * Firebase Manager — Realtime Database Online Lobby & Global Chat
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, onDisconnect, push, serverTimestamp } from 'firebase/database';

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

export function initFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log('🔥 [Firebase] Realtime Database initialized successfully!');
  }
  return { app, db };
}

/**
 * Publish a public room to the global lobby
 */
export async function publishRoom({ roomId, gameType, gameName, hostName = '匿名玩家', maxPlayers = 2 }) {
  const { db } = initFirebase();
  const roomRef = ref(db, `rooms/${roomId}`);

  const roomData = {
    roomId,
    gameType, // 'xiangqi', 'tetris', 'poker'
    gameName,
    hostName,
    currentPlayers: 1,
    maxPlayers,
    createdAt: Date.now(),
  };

  await set(roomRef, roomData);

  // Auto remove room when host disconnects
  onDisconnect(roomRef).remove();
  console.log(`🔥 [Firebase] Published room ${roomId} (${gameName}) to global lobby`);
}

/**
 * Update player count for a published room
 */
export async function updateRoomPlayerCount(roomId, currentPlayers) {
  try {
    const { db } = initFirebase();
    const roomRef = ref(db, `rooms/${roomId}/currentPlayers`);
    await set(roomRef, currentPlayers);
  } catch (e) {
    console.warn('Firebase room update failed:', e);
  }
}

/**
 * Remove room from public lobby
 */
export async function unpublishRoom(roomId) {
  try {
    const { db } = initFirebase();
    const roomRef = ref(db, `rooms/${roomId}`);
    await remove(roomRef);
    console.log(`🔥 [Firebase] Unpublished room ${roomId}`);
  } catch (e) {
    console.warn('Firebase room remove failed:', e);
  }
}

/**
 * Subscribe to real-time public rooms list
 * @param {Function} callback - Receives Array of active rooms
 * @returns {Function} Unsubscribe function
 */
export function subscribePublicRooms(callback) {
  const { db } = initFirebase();
  const roomsRef = ref(db, 'rooms');

  const unsubscribe = onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const roomsList = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);
    callback(roomsList);
  });

  return unsubscribe;
}

/**
 * Send a message to global lobby chat
 */
export async function sendGlobalChatMessage(author, message) {
  if (!message || !message.trim()) return;
  const { db } = initFirebase();
  const chatRef = ref(db, 'chat');

  const msgData = {
    author: author || '大廳玩家',
    text: message.trim(),
    timestamp: Date.now(),
  };

  const newMsgRef = push(chatRef);
  await set(newMsgRef, msgData);
}

/**
 * Subscribe to global lobby chat messages (last 30 messages)
 */
export function subscribeGlobalChat(callback) {
  const { db } = initFirebase();
  const chatRef = ref(db, 'chat');

  const unsubscribe = onValue(chatRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const messages = Object.values(data)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-30);
    callback(messages);
  });

  return unsubscribe;
}
