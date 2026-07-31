/**
 * Room Manager — High-level game room logic with Firebase Global Lobby Publishing
 *
 * Coordinates PeerManager + GameController for online play & publishes to global lobby.
 */

import { PeerManager } from './peer-manager.js';
import { MSG } from './protocol.js';
import { RED, BLACK } from '../games/xiangqi/pieces.js';
import { publishRoom, unpublishRoom, updateRoomPlayerCount } from './firebase-manager.js';

export class RoomManager {
  constructor(gameController) {
    this.game = gameController;
    this.peer = new PeerManager();
    this.roomId = '';
    this.isHost = false;
    this.opponentName = '對手';
    this.playerName = '玩家';
    this.hostSide = RED;
    this.gameType = 'xiangqi';

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

        // Update Firebase Lobby room player count to 2
        updateRoomPlayerCount(this.roomId, 2);
      }
    };

    this.peer.onMessage = (msg) => this._handleMessage(msg);

    this.peer.onDisconnect = () => {
      if (this.isHost) {
        updateRoomPlayerCount(this.roomId, 1);
      }
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
   * Create a new room (Host) & publish to global Firebase lobby
   */
  async createRoom(playerName = '玩家', side = RED, gameType = 'xiangqi', gameName = '中國象棋') {
    this.isHost = true;
    this.playerName = playerName;
    this.hostSide = side;
    this.gameType = gameType;

    this.roomId = await this.peer.createRoom();

    // Publish to Firebase Lobby
    publishRoom({
      roomId: this.roomId,
      gameType,
      gameName,
      hostName: playerName,
      maxPlayers: 2,
    });

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
        this.hostSide = data.hostSide;
        this.opponentName = data.hostName || '對手';

        const guestSide = data.hostSide === RED ? BLACK : RED;
        if (this.game && this.game.setPlayerSide) {
          this.game.setPlayerSide(guestSide);
        }

        this.peer.send(MSG.READY, { name: this.playerName });

        if (this.onRoomStatus) {
          this.onRoomStatus('playing', '已進入房間，遊戲開始！');
        }
        break;

      case MSG.READY:
        this.opponentName = data.name || '對手';
        if (this.onRoomStatus) {
          this.onRoomStatus('playing', '對手已就緒，遊戲開始！');
        }
        break;

      case MSG.MOVE:
        if (this.game && this.game.applyRemoteMove) {
          this.game.applyRemoteMove(data);
        }
        if (this.onOpponentAction) {
          this.onOpponentAction('move', data);
        }
        break;

      case MSG.CHAT:
        if (this.onChat) {
          this.onChat(data.sender, data.text);
        }
        break;

      case MSG.RESTART:
        if (this.game && this.game.resetGame) {
          this.game.resetGame();
        }
        if (this.onOpponentAction) {
          this.onOpponentAction('restart');
        }
        break;

      case MSG.SURRENDER:
        if (this.onOpponentAction) {
          this.onOpponentAction('surrender');
        }
        break;
    }
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
    if (this.isHost && this.roomId) {
      unpublishRoom(this.roomId);
    }
    this.peer.disconnect();
  }
}
