/**
 * P2P Network Protocol — Message Types
 */

export const MSG = {
  // Connection
  HELLO: 'hello',            // Initial handshake
  GAME_CONFIG: 'game_config', // Game configuration (which side, time limit)
  GAME_START: 'game_start',   // Game starts
  GAME_READY: 'game_ready',   // Player is ready

  // Game actions
  MOVE: 'move',               // A move was made
  UNDO_REQUEST: 'undo_req',   // Request to undo
  UNDO_ACCEPT: 'undo_ok',     // Accept undo
  UNDO_REJECT: 'undo_no',     // Reject undo
  RESIGN: 'resign',           // Player resigns
  DRAW_OFFER: 'draw_offer',   // Offer a draw
  DRAW_ACCEPT: 'draw_ok',     // Accept draw
  DRAW_REJECT: 'draw_no',     // Reject draw

  // Communication
  CHAT: 'chat',               // Chat message
  HEARTBEAT: 'heartbeat',     // Keep-alive

  // State sync
  SYNC: 'sync',               // Full state sync
};

/**
 * Create a protocol message
 */
export function createMessage(type, data = {}) {
  return {
    type,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Parse incoming message
 */
export function parseMessage(raw) {
  try {
    if (typeof raw === 'string') {
      return JSON.parse(raw);
    }
    return raw;
  } catch {
    console.error('Failed to parse message:', raw);
    return null;
  }
}
