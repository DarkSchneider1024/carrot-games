/**
 * Fruit Havoc Realtime WebRTC PeerJS Manager
 * Handles P2P Signaling via PeerJS & High-Frequency UDP-Style DataChannel State Sync
 */

import Peer from 'peerjs';

let peer = null;
let conn = null;
let onDataCallback = null;
let onStatusCallback = null;

/**
 * Initialize PeerJS Client or Host
 * @param {string} targetRoomId - Room Code (e.g. 'HAVOC-9821')
 * @param {boolean} isHost - Whether this peer is creating the room
 * @param {Function} onStatusChange - Callback(status, msg)
 * @param {Function} onDataReceive - Callback(dataPacket)
 */
export function initFruitPeer(targetRoomId, isHost, onStatusChange, onDataReceive) {
  onStatusCallback = onStatusChange;
  onDataCallback = onDataReceive;

  closeFruitPeer();

  onStatusCallback('connecting', '正在與 WebRTC 信令伺服器連線中...');

  try {
    if (isHost) {
      peer = new Peer(targetRoomId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', (id) => {
        onStatusCallback('waiting', `房間已建立！房間代碼：${id}`);
      });

      peer.on('connection', (connection) => {
        conn = connection;
        _setupConnectionEvents(conn);
      });

      peer.on('error', (err) => {
        console.error('[FruitPeer] Host Error:', err);
        onStatusCallback('error', `連線失敗: ${err.message || '房間號可能重複'}`);
      });

    } else {
      peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', () => {
        onStatusCallback('connecting', `正在嘗試加入房間：${targetRoomId}...`);
        // reliable: false 表示開啓 UDP-like 非阻塞高效傳輸 (專為 60 FPS 位置同步優化)
        conn = peer.connect(targetRoomId, { reliable: false });
        _setupConnectionEvents(conn);
      });

      peer.on('error', (err) => {
        console.error('[FruitPeer] Client Error:', err);
        onStatusCallback('error', `無法連線至房間 ${targetRoomId}`);
      });
    }
  } catch (e) {
    console.error('[FruitPeer] Initialization error:', e);
    onStatusCallback('error', 'WebRTC 初始化異常');
  }
}

function _setupConnectionEvents(connection) {
  connection.on('open', () => {
    onStatusCallback('connected', '🟢 成功建立 WebRTC DataChannel P2P 連線！');
  });

  connection.on('data', (data) => {
    if (onDataCallback) {
      onDataCallback(data);
    }
  });

  connection.on('close', () => {
    onStatusCallback('disconnected', '🔴 對手已中斷連線');
  });

  connection.on('error', (err) => {
    console.error('[FruitPeer] DataChannel Error:', err);
  });
}

/**
 * Send Trap Placement Packet
 */
export function sendTrapPlacement(gridX, gridY, trapId) {
  if (conn && conn.open) {
    conn.send({
      type: 'TRAP_PLACE',
      gridX,
      gridY,
      trapId,
      timestamp: Date.now()
    });
  }
}

/**
 * Send 60 FPS Player Realtime Movement Packet
 */
export function sendMovementState(x, y, vx, vy, animState = 'idle') {
  if (conn && conn.open) {
    conn.send({
      type: 'MOVE',
      x,
      y,
      vx,
      vy,
      state: animState,
      timestamp: Date.now()
    });
  }
}

/**
 * Close Peer Connections
 */
export function closeFruitPeer() {
  if (conn) {
    try { conn.close(); } catch (e) {}
    conn = null;
  }
  if (peer) {
    try { peer.destroy(); } catch (e) {}
    peer = null;
  }
}
