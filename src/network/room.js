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
        // Host sends game config
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
   * Create a new room
   */
  async createRoom(playerName = '玩家', side = RED) {
    this.isHost = true;
    this.playerName = playerName;
    this.hostSide = side;

    this.roomId = await this.peer.createRoom();
    return this.roomId;
  }

  /**
   * Join an existing room
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
        // Received from host
        break;

      case MSG.GAME_CONFIG:
        // Guest receives game config
        this.hostSide = data.hostSide;
        this.opponentName = data.hostName || '對手';
        // Guest plays opposite side
        const guestSide = data.hostSide === RED ? BLACK : RED;
        this.game.newGame({
          mode: 'vs_human_online',
          playerSide: guestSide,
        });
        // Tell host we're ready
        this.peer.send(MSG.GAME_READY, { name: this.playerName });
        break;

      case MSG.GAME_READY:
        // Host receives guest ready
        this.opponentName = data.name || '對手';
        this.game.newGame({
          mode: 'vs_human_online',
          playerSide: this.hostSide,
        });
        // Set up move callback
        this._setupMoveSync();
        if (this.onRoomStatus) this.onRoomStatus('playing');
        break;

      case MSG.GAME_START:
        this._setupMoveSync();
        if (this.onRoomStatus) this.onRoomStatus('playing');
        break;

      case MSG.MOVE:
        // Opponent made a move
        this.game.receiveNetworkMove(
          data.from.row, data.from.col,
          data.to.row, data.to.col
        );
        break;

      case MSG.UNDO_REQUEST:
        if (this.onOpponentAction) {
          this.onOpponentAction('undo_request');
        }
        break;

      case MSG.UNDO_ACCEPT:
        this.game.undo();
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
   * Set up move synchronization
   */
  _setupMoveSync() {
    this.game.onMove = (move) => {
      this.peer.send(MSG.MOVE, move);
    };
  }

  /**
   * Send undo request
   */
  requestUndo() {
    this.peer.send(MSG.UNDO_REQUEST);
  }

  /**
   * Accept undo request
   */
  acceptUndo() {
    this.peer.send(MSG.UNDO_ACCEPT);
    this.game.undo();
  }

  /**
   * Reject undo request
   */
  rejectUndo() {
    this.peer.send(MSG.UNDO_REJECT);
  }

  /**
   * Resign
   */
  resign() {
    this.peer.send(MSG.RESIGN);
    this.game.resign();
  }

  /**
   * Offer draw
   */
  offerDraw() {
    this.peer.send(MSG.DRAW_OFFER);
  }

  /**
   * Send chat message
   */
  sendChat(message) {
    this.peer.send(MSG.CHAT, { message, name: this.playerName });
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.peer.disconnect();
  }
}
