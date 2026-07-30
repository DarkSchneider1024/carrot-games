/**
 * PeerJS Connection Manager
 *
 * Wraps PeerJS for WebRTC P2P connections.
 * The room host acts as the server (authoritative state).
 */

import Peer from 'peerjs';
import { MSG, createMessage, parseMessage } from './protocol.js';

const PEER_CONFIG = {
  // Use PeerJS free public server for signaling
  // For production, self-host a PeerJS server
  debug: 1,
};

/**
 * Generate a short room ID (6 chars, alphanumeric)
 */
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars (I/O/0/1)
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export class PeerManager {
  constructor() {
    this.peer = null;
    this.conn = null;         // Active data connection
    this.isHost = false;
    this.roomId = '';
    this.peerId = '';
    this.connected = false;

    // State
    this.status = 'idle'; // idle, creating, joining, waiting, connected, error

    // Callbacks
    this.onStatusChange = null;
    this.onMessage = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.onError = null;

    // Heartbeat
    this._heartbeatInterval = null;
  }

  /**
   * Create a room (host mode)
   */
  async createRoom() {
    this.isHost = true;
    this.roomId = generateRoomId();
    this._setStatus('creating');

    return new Promise((resolve, reject) => {
      // Use room ID as peer ID prefix for easier connection
      const peerId = `carrot-xiangqi-${this.roomId}`;

      this.peer = new Peer(peerId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        this.peerId = id;
        this._setStatus('waiting');
        console.log(`🏠 Room created: ${this.roomId} (peer: ${id})`);
        resolve(this.roomId);
      });

      this.peer.on('connection', (conn) => {
        console.log('🔗 Guest connected');
        this.conn = conn;
        this._setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this._setStatus('error');
        if (this.onError) this.onError(err);
        reject(err);
      });

      this.peer.on('disconnected', () => {
        console.warn('⚠️ Disconnected from signaling server');
        // Try to reconnect
        if (!this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  /**
   * Join a room (guest mode)
   */
  async joinRoom(roomId) {
    this.isHost = false;
    this.roomId = roomId.toUpperCase();
    this._setStatus('joining');

    return new Promise((resolve, reject) => {
      this.peer = new Peer(undefined, PEER_CONFIG);

      this.peer.on('open', (id) => {
        this.peerId = id;
        const hostPeerId = `carrot-xiangqi-${this.roomId}`;
        console.log(`🔗 Joining room: ${this.roomId}`);

        const conn = this.peer.connect(hostPeerId, {
          reliable: true,
          serialization: 'json',
        });

        this.conn = conn;
        this._setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'peer-unavailable') {
          this._setStatus('error');
          if (this.onError) this.onError(new Error('找不到房間，請確認房間 ID'));
        } else {
          this._setStatus('error');
          if (this.onError) this.onError(err);
        }
        reject(err);
      });

      // Resolve once connected (handled in _setupConnection)
      this._joinResolve = resolve;
      this._joinReject = reject;
    });
  }

  /**
   * Setup a data connection
   */
  _setupConnection(conn) {
    conn.on('open', () => {
      this.connected = true;
      this._setStatus('connected');
      this._startHeartbeat();

      console.log('✅ P2P connection established');

      if (this.onConnect) this.onConnect();

      // Resolve join promise if guest
      if (this._joinResolve) {
        this._joinResolve(this.roomId);
        this._joinResolve = null;
      }

      // Host sends hello
      if (this.isHost) {
        this.send(MSG.HELLO, { host: true, roomId: this.roomId });
      }
    });

    conn.on('data', (data) => {
      const msg = parseMessage(data);
      if (!msg) return;

      if (msg.type === MSG.HEARTBEAT) return; // Silent heartbeat

      if (this.onMessage) {
        this.onMessage(msg);
      }
    });

    conn.on('close', () => {
      console.log('🔌 Connection closed');
      this.connected = false;
      this._setStatus('idle');
      this._stopHeartbeat();
      if (this.onDisconnect) this.onDisconnect();
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      if (this.onError) this.onError(err);
    });
  }

  /**
   * Send a message
   */
  send(type, data = {}) {
    if (!this.conn || !this.connected) {
      console.warn('Cannot send: not connected');
      return false;
    }

    const msg = createMessage(type, data);
    try {
      this.conn.send(msg);
      return true;
    } catch (err) {
      console.error('Send error:', err);
      return false;
    }
  }

  /**
   * Heartbeat
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatInterval = setInterval(() => {
      this.send(MSG.HEARTBEAT);
    }, 5000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  /**
   * Set status and notify
   */
  _setStatus(status) {
    this.status = status;
    if (this.onStatusChange) this.onStatusChange(status);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this._stopHeartbeat();
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connected = false;
    this._setStatus('idle');
  }
}
