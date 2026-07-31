/**
 * Room Manager — High-level game room logic
 *
 * Coordinates PeerManager + GameController for online play.
 */

import { PeerManager } from './peer-manager.js';
import { MSG } from './protocol.js';
import { RED, BLACK } from '../games/xiangqi/pieces.js';

export class RoomManager {
  constructor(gameController) {
    this.game = gameController;
    this.peer = new PeerManager();
    this.roomId = '';
    this.isHost = false;
    this.opponentName = '對手';
    this.playerName = '玩家';
    this.hostSide = RED;

    // UI Callbacks
    this.onRoomStatus = null;
    this.onOpponentAction = null;
    this.onChat = null;

    this._setupPeerCallbacks();
  }

  _setupPeerCallbacks() {
    this.peer.onConnect = () => {
      if (this.isHost) {
        // Host sends game config to connected guest
        this.peer.send(MSG.GAME_CONFIG, {
          hostSide: this.hostSide,
          hostName: this.playerName,
        });
      }
    };

    this.peer.onMessage = (msg) => this._handleMessage(msg);

    this.peer.onDisconnect = () => {
      if (this.onRoomStatus) {
        this.onRoomStatus('disconnected', '對手已斷線');
      }
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
   * Create a new room (Host)
   */
  async createRoom(playerName = '玩家', side = RED) {
    this.isHost = true;
    this.playerName = playerName;
    this.hostSide = side;

    this.roomId = await this.peer.createRoom();
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
        // Guest receives game config from Host
        this.hostSide = data.hostSide;
        this.opponentName = data.hostName || '對手';

        // Guest plays opposite side
        const guestSide = data.hostSide === RED ? BLACK : RED;
        if (this.game) {
          this.game.newGame({
            mode: 'vs_human_online',
            playerSide: guestSide,
          });
        }

        // Enable move sync on guest side
        this._setupMoveSync();

        // Tell Host guest is ready
        this.peer.send(MSG.GAME_READY, { name: this.playerName });
        break;

      case MSG.GAME_READY:
        // Host receives GAME_READY from guest
        this.opponentName = data.name || '對手';
        if (this.game) {
          this.game.newGame({
            mode: 'vs_human_online',
            playerSide: this.hostSide,
          });
        }

        // Enable move sync on host side
        this._setupMoveSync();

        // Notify guest that game starts
        this.peer.send(MSG.GAME_START, { hostName: this.playerName });

        if (this.onRoomStatus) this.onRoomStatus('playing');
        break;

      case MSG.GAME_START:
        // Guest receives GAME_START from host
        this._setupMoveSync();
        if (this.onRoomStatus) this.onRoomStatus('playing');
        break;

      case MSG.MOVE:
        // Opponent made a move
        if (this.game && data && data.from && data.to) {
          this.game.receiveNetworkMove(
            data.from.row, data.from.col,
            data.to.row, data.to.col
          );
        }
        break;

      case MSG.UNDO_REQUEST:
        if (this.onOpponentAction) {
          this.onOpponentAction('undo_request');
        }
        break;

      case MSG.UNDO_ACCEPT:
        if (this.game) this.game.undo();
        break;

      case MSG.UNDO_REJECT:
        if (this.onOpponentAction) {
          this.onOpponentAction('undo_rejected');
        }
        break;

      case MSG.RESIGN:
        if (this.onOpponentAction) {
          this.onOpponentAction('opponent_resigned');
        }
        break;

      case MSG.DRAW_OFFER:
        if (this.onOpponentAction) {
          this.onOpponentAction('draw_offer');
        }
        break;

      case MSG.DRAW_ACCEPT:
        if (this.onOpponentAction) {
          this.onOpponentAction('draw_accepted');
        }
        break;

      case MSG.DRAW_REJECT:
        if (this.onOpponentAction) {
          this.onOpponentAction('draw_rejected');
        }
        break;

      case MSG.CHAT:
        if (this.onChat) {
          this.onChat(data.message, data.name || this.opponentName);
        }
        break;
    }
  }

  /**
   * Set up move synchronization for bidirectional communication
   */
  _setupMoveSync() {
    if (!this.game) return;
    this.game.onMove = (move) => {
      this.peer.send(MSG.MOVE, move);
    };
  }

  requestUndo() {
    this.peer.send(MSG.UNDO_REQUEST);
  }

  acceptUndo() {
    this.peer.send(MSG.UNDO_ACCEPT);
    if (this.game) this.game.undo();
  }

  rejectUndo() {
    this.peer.send(MSG.UNDO_REJECT);
  }

  resign() {
    this.peer.send(MSG.RESIGN);
    if (this.game) this.game.resign();
  }

  offerDraw() {
    this.peer.send(MSG.DRAW_OFFER);
  }

  sendChat(message) {
    this.peer.send(MSG.CHAT, { message, name: this.playerName });
  }

  disconnect() {
    if (this.game) this.game.onMove = null;
    this.peer.disconnect();
  }
}
