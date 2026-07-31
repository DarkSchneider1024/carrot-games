/**
 * Room Manager — High-level game room logic with Firebase Global Lobby Publishing & Heartbeat
 *
 * Coordinates PeerManager + GameController for online play & publishes to global lobby with 10s Heartbeat.
 */

import { PeerManager } from './peer-manager.js';
import { MSG } from './protocol.js';
import { RED, BLACK } from '../games/xiangqi/pieces.js';
import { publishRoom, unpublishRoom, updateRoomPlayerCount, updateRoomHeartbeat } from './firebase-manager.js';
import { getPlayerName } from '../utils/player-profile.js';

export class RoomManager {
  constructor(gameController) {
    this.game = gameController;
    this.peer = new PeerManager();
    this.roomId = null;
    this.isHost = false;
    this.playerName = '玩家';
    this.hostSide = null;
    this.gameType = 'xiangqi';
    this.onRoomStatus = null; // (status, message) => {}
    this.heartbeatTimer = null;
    this._unloadHandler = null;

    this._setupPeerHandlers();
  }

  _setupPeerHandlers() {
    this.peer.onData = (data) => {
      this._handleNetworkData(data);
    };

    this.peer.onError = (err) => {
      if (this.onRoomStatus) {
        this.onRoomStatus('error', err.message || '連線錯誤');
      }
    };

    this.peer.onStatusChange = (status) => {
      if (this.onRoomStatus) {
        this.onRoomStatus(status);
      }
    };
  }

  /**
   * Create a new room (Host) & publish to global Firebase lobby with heartbeat
   */
  async createRoom(playerName = '玩家', side = RED, gameType = 'xiangqi', gameName = '中國象棋') {
    this.isHost = true;
    const finalName = (playerName && playerName !== '玩家') ? playerName : getPlayerName();
    this.playerName = finalName;
    this.hostSide = side;
    this.gameType = gameType;

    this.roomId = await this.peer.createRoom();

    // Publish to Firebase Lobby
    publishRoom({
      roomId: this.roomId,
      gameType,
      gameName,
      hostName: finalName,
      maxPlayers: 2,
    });

    // Start 10s Heartbeat Timer to keep room alive
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isHost && this.roomId) {
        updateRoomHeartbeat(this.roomId);
      }
    }, 10000);

    // Bind window beforeunload handler for instant cleanup on tab close
    this._unloadHandler = () => {
      if (this.isHost && this.roomId) {
        unpublishRoom(this.roomId);
      }
    };
    window.addEventListener('beforeunload', this._unloadHandler);

    return this.roomId;
  }

  /**
   * Join an existing room (Guest)
   */
  async joinRoom(roomId, playerName = '玩家') {
    this.isHost = false;
    this.playerName = playerName;

    this.roomId = await this.peer.joinRoom(roomId);
    return this.roomId;
  }

  /**
   * Handle incoming messages
   */
  _handleMessage(msg) {
    const { type, data } = msg;

    switch (type) {
      case MSG.HELLO:
        break;

      case MSG.GAME_CONFIG:
        break;

      case MSG.MOVE:
        if (this.game && this.game.receiveNetworkMove) {
          this.game.receiveNetworkMove(data.from.row, data.from.col, data.to.row, data.to.col);
        }
        break;

      case MSG.SURRENDER:
        if (this.onOpponentAction) this.onOpponentAction('opponent_resigned');
        break;

      case MSG.REQUEST_UNDO:
        if (this.onOpponentAction) this.onOpponentAction('undo_request');
        break;

      case MSG.ACCEPT_UNDO:
        if (this.game && this.game.undo) this.game.undo();
        break;

      case MSG.REJECT_UNDO:
        if (this.onOpponentAction) this.onOpponentAction('undo_rejected');
        break;

      case MSG.OFFER_DRAW:
        if (this.onOpponentAction) this.onOpponentAction('draw_offer');
        break;
    }
  }

  _handleNetworkData(data) {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      this._handleMessage(msg);
    } catch (e) {
      console.warn('Network message parse error:', e);
    }
  }

  requestUndo() {
    this.peer.send(MSG.REQUEST_UNDO, {});
  }

  acceptUndo() {
    this.peer.send(MSG.ACCEPT_UNDO, {});
    if (this.game && this.game.undo) this.game.undo();
  }

  rejectUndo() {
    this.peer.send(MSG.REJECT_UNDO, {});
  }

  offerDraw() {
    this.peer.send(MSG.OFFER_DRAW, {});
  }

  resign() {
    this.peer.send(MSG.SURRENDER, {});
  }

  sendMove(moveData) {
    this.peer.send(MSG.MOVE, moveData);
  }

  sendChat(text) {
    this.peer.send(MSG.CHAT, {
      sender: this.playerName,
      text,
    });
  }

  sendRestart() {
    this.peer.send(MSG.RESTART, {});
  }

  sendSurrender() {
    this.peer.send(MSG.SURRENDER, {});
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this._unloadHandler) {
      window.removeEventListener('beforeunload', this._unloadHandler);
      this._unloadHandler = null;
    }

    if (this.isHost && this.roomId) {
      unpublishRoom(this.roomId);
    }
    this.peer.disconnect();
  }
}
