/**
 * Xiangqi (中國象棋) — Game Controller
 *
 * Manages game state, turn flow, mode switching (vs AI, vs Human online).
 */

import { RED, BLACK, EMPTY, getSide, createInitialBoard, cloneBoard } from './pieces.js';
import {
  isInCheck, isLegalMove, getLegalMovesForPiece,
  checkGameOver, makeMove, formatMove, findKing,
} from './rules.js';
import { XiangqiRenderer } from './board.js';

export const GAME_MODE = {
  VS_AI: 'vs_ai',
  VS_HUMAN_ONLINE: 'vs_human_online',
  VS_HUMAN_LOCAL: 'vs_human_local',
};

export class XiangqiGame {
  constructor() {
    this.board = createInitialBoard();
    this.currentTurn = RED;
    this.mode = GAME_MODE.VS_AI;
    this.playerSide = RED;      // Which side the local player controls
    this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'

    this.moveHistory = [];      // Array of {from, to, piece, captured, notation}
    this.noCaptureMoves = 0;
    this.gameOver = false;
    this.winner = null;
    this.gameOverReason = '';

    this.selectedPiece = null;  // {row, col}
    this.legalMoves = [];

    this.renderer = null;
    this.aiWorker = null;
    this.aiThinking = false;

    // Callbacks
    this.onStateChange = null;  // Called when game state changes
    this.onGameOver = null;     // Called when game ends
    this.onMove = null;         // Called after each move (for network sync)
    this.onAIThinkingChange = null;

    // Timer
    this.redTime = 600;   // 10 minutes in seconds
    this.blackTime = 600;
    this.timerInterval = null;
  }

  /**
   * Initialize the game with a canvas element
   */
  init(canvas) {
    this.renderer = new XiangqiRenderer(canvas);

    // Set up click handler
    canvas.addEventListener('click', (e) => this._handleClick(e));

    // Set up AI worker
    this._initAIWorker();

    // Initial render
    this._updateRenderer();
    this.renderer.draw(this.board);
  }

  /**
   * Start a new game
   */
  newGame(options = {}) {
    this.board = createInitialBoard();
    this.currentTurn = RED;
    this.mode = options.mode || GAME_MODE.VS_AI;
    this.playerSide = options.playerSide || RED;
    this.aiDifficulty = options.difficulty || 'medium';

    this.moveHistory = [];
    this.noCaptureMoves = 0;
    this.gameOver = false;
    this.winner = null;
    this.gameOverReason = '';
    this.selectedPiece = null;
    this.legalMoves = [];
    this.aiThinking = false;

    this.redTime = options.timeLimit || 600;
    this.blackTime = options.timeLimit || 600;

    this.renderer.flipped = this.playerSide === BLACK;
    this.renderer.selectedPos = null;
    this.renderer.legalMoves = [];
    this.renderer.lastMove = null;
    this.renderer.checkPos = null;

    this._updateRenderer();
    this.renderer.draw(this.board);
    this._startTimer();

    this._notifyStateChange();

    // If AI goes first
    if (this.mode === GAME_MODE.VS_AI && this.currentTurn !== this.playerSide) {
      this._requestAIMove();
    }
  }

  /**
   * Handle canvas click
   */
  _handleClick(e) {
    if (this.gameOver || this.aiThinking) return;

    // In online mode, only allow clicks on own turn
    if (this.mode === GAME_MODE.VS_HUMAN_ONLINE && this.currentTurn !== this.playerSide) return;
    if (this.mode === GAME_MODE.VS_AI && this.currentTurn !== this.playerSide) return;

    const pos = this.renderer.pixelToBoard(e.clientX, e.clientY);
    if (!pos) return;

    const clickedPiece = this.board[pos.row][pos.col];
    const clickedSide = getSide(clickedPiece);

    if (this.selectedPiece) {
      // A piece is already selected
      if (clickedSide === this.currentTurn) {
        // Click own piece — switch selection
        this._selectPiece(pos.row, pos.col);
      } else {
        // Try to move to this position
        this._tryMove(this.selectedPiece.row, this.selectedPiece.col, pos.row, pos.col);
      }
    } else {
      // No piece selected — try to select
      if (clickedPiece !== EMPTY && clickedSide === this.currentTurn) {
        // In vs AI mode, can only select own pieces
        if (this.mode === GAME_MODE.VS_AI && clickedSide !== this.playerSide) return;
        this._selectPiece(pos.row, pos.col);
      }
    }
  }

  /**
   * Select a piece
   */
  _selectPiece(row, col) {
    this.selectedPiece = { row, col };
    this.legalMoves = getLegalMovesForPiece(this.board, row, col);

    this.renderer.selectedPos = { row, col };
    this.renderer.legalMoves = this.legalMoves;
    this.renderer.draw(this.board);
  }

  /**
   * Deselect
   */
  _deselect() {
    this.selectedPiece = null;
    this.legalMoves = [];
    this.renderer.selectedPos = null;
    this.renderer.legalMoves = [];
  }

  /**
   * Try to execute a move
   */
  _tryMove(fromRow, fromCol, toRow, toCol) {
    if (!isLegalMove(this.board, fromRow, fromCol, toRow, toCol)) {
      this._deselect();
      this.renderer.draw(this.board);
      return false;
    }

    this._executeMove(fromRow, fromCol, toRow, toCol, true);
    return true;
  }

  /**
   * Execute a move (with or without animation)
   */
  _executeMove(fromRow, fromCol, toRow, toCol, animate = true) {
    const piece = this.board[fromRow][fromCol];
    const captured = this.board[toRow][toCol];
    const notation = formatMove(this.board, fromRow, fromCol, toRow, toCol);

    // Record move
    this.moveHistory.push({
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece,
      captured,
      notation,
      boardBefore: cloneBoard(this.board),
    });

    // Track no-capture counter
    if (captured !== EMPTY) {
      this.noCaptureMoves = 0;
    } else {
      this.noCaptureMoves++;
    }

    this._deselect();

    if (animate && this.renderer) {
      this.renderer.animateMove(fromRow, fromCol, toRow, toCol, this.board, () => {
        this._applyMove(fromRow, fromCol, toRow, toCol);
      });
    } else {
      this._applyMove(fromRow, fromCol, toRow, toCol);
    }
  }

  _applyMove(fromRow, fromCol, toRow, toCol) {
    this.board = makeMove(this.board, fromRow, fromCol, toRow, toCol);

    // Set last move highlight
    this.renderer.lastMove = { fromRow, fromCol, toRow, toCol };

    // Switch turn
    this.currentTurn = this.currentTurn === RED ? BLACK : RED;

    // Check for check
    if (isInCheck(this.board, this.currentTurn)) {
      const king = findKing(this.board, this.currentTurn);
      this.renderer.checkPos = king;
    } else {
      this.renderer.checkPos = null;
    }

    // Check for game over
    const result = checkGameOver(this.board, this.currentTurn, this.moveHistory, this.noCaptureMoves);
    if (result.over) {
      this._endGame(result.winner, result.reason);
    }

    this._updateRenderer();
    this.renderer.draw(this.board);
    this._notifyStateChange();

    // Notify move (for network)
    if (this.onMove) {
      this.onMove({
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
      });
    }

    // Request AI move if needed
    if (!this.gameOver && this.mode === GAME_MODE.VS_AI && this.currentTurn !== this.playerSide) {
      this._requestAIMove();
    }
  }

  /**
   * Receive a move from network (online mode)
   */
  receiveNetworkMove(fromRow, fromCol, toRow, toCol) {
    if (this.gameOver) return;
    if (!isLegalMove(this.board, fromRow, fromCol, toRow, toCol)) return;
    this._executeMove(fromRow, fromCol, toRow, toCol, true);
  }

  /**
   * End the game
   */
  _endGame(winner, reason) {
    this.gameOver = true;
    this.winner = winner;
    this.gameOverReason = reason;
    this._stopTimer();

    if (this.onGameOver) {
      this.onGameOver({ winner, reason });
    }
  }

  /**
   * Resign
   */
  resign() {
    if (this.gameOver) return;
    const winner = this.playerSide === RED ? 'black' : 'red';
    const reason = this.playerSide === RED ? '紅方認輸' : '黑方認輸';
    this._endGame(winner, reason);
  }

  /**
   * Undo last move
   */
  undo() {
    if (this.moveHistory.length === 0) return false;

    // In vs AI mode, undo both the AI's move and the player's move
    const undoCount = this.mode === GAME_MODE.VS_AI ? 2 : 1;
    let undone = 0;

    while (undone < undoCount && this.moveHistory.length > 0) {
      const lastMove = this.moveHistory.pop();
      this.board = lastMove.boardBefore;
      this.currentTurn = getSide(lastMove.piece);
      undone++;
    }

    this.gameOver = false;
    this.winner = null;
    this.gameOverReason = '';
    this._deselect();

    // Update last move highlight
    if (this.moveHistory.length > 0) {
      const prev = this.moveHistory[this.moveHistory.length - 1];
      this.renderer.lastMove = {
        fromRow: prev.from.row, fromCol: prev.from.col,
        toRow: prev.to.row, toCol: prev.to.col,
      };
    } else {
      this.renderer.lastMove = null;
    }

    // Recheck check status
    if (isInCheck(this.board, this.currentTurn)) {
      const king = findKing(this.board, this.currentTurn);
      this.renderer.checkPos = king;
    } else {
      this.renderer.checkPos = null;
    }

    this._updateRenderer();
    this.renderer.draw(this.board);
    this._notifyStateChange();

    return true;
  }

  /**
   * Initialize AI Web Worker
   */
  _initAIWorker() {
    try {
      this.aiWorker = new Worker(
        new URL('./ai-worker.js', import.meta.url),
        { type: 'module' }
      );

      this.aiWorker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'bestMove') {
          this.aiThinking = false;
          if (this.onAIThinkingChange) this.onAIThinkingChange(false);

          if (data && !this.gameOver) {
            this._executeMove(data.fromRow, data.fromCol, data.toRow, data.toCol, true);
          }
        }
      };

      this.aiWorker.onerror = (err) => {
        console.error('AI Worker error:', err);
        this.aiThinking = false;
        if (this.onAIThinkingChange) this.onAIThinkingChange(false);
      };
    } catch (err) {
      console.warn('Web Worker not available, AI will run on main thread:', err);
    }
  }

  /**
   * Request AI to calculate best move
   */
  _requestAIMove() {
    this.aiThinking = true;
    if (this.onAIThinkingChange) this.onAIThinkingChange(true);

    const depthMap = { easy: 2, medium: 3, hard: 4 };
    const depth = depthMap[this.aiDifficulty] || 3;

    if (this.aiWorker) {
      this.aiWorker.postMessage({
        type: 'search',
        data: {
          board: this.board,
          side: this.currentTurn,
          depth,
        },
      });
    } else {
      // Fallback: run on main thread with a delay
      setTimeout(() => {
        // Import AI module dynamically
        import('./ai-engine.js').then(({ findBestMove }) => {
          const move = findBestMove(this.board, this.currentTurn, depth);
          this.aiThinking = false;
          if (this.onAIThinkingChange) this.onAIThinkingChange(false);
          if (move && !this.gameOver) {
            this._executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, true);
          }
        });
      }, 100);
    }
  }

  /**
   * Timer management
   */
  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.gameOver) return;
      if (this.currentTurn === RED) {
        this.redTime = Math.max(0, this.redTime - 1);
        if (this.redTime === 0) {
          this._endGame('black', '紅方超時');
        }
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1);
        if (this.blackTime === 0) {
          this._endGame('red', '黑方超時');
        }
      }
      this._notifyStateChange();
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update renderer state
   */
  _updateRenderer() {
    // Nothing extra needed — state is already set
  }

  /**
   * Notify state change
   */
  _notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  /**
   * Get serializable game state
   */
  getState() {
    return {
      board: this.board,
      currentTurn: this.currentTurn,
      mode: this.mode,
      playerSide: this.playerSide,
      moveHistory: this.moveHistory.map(m => ({
        from: m.from,
        to: m.to,
        notation: m.notation,
      })),
      gameOver: this.gameOver,
      winner: this.winner,
      gameOverReason: this.gameOverReason,
      aiThinking: this.aiThinking,
      redTime: this.redTime,
      blackTime: this.blackTime,
      moveCount: this.moveHistory.length,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this._stopTimer();
    if (this.aiWorker) {
      this.aiWorker.terminate();
      this.aiWorker = null;
    }
  }
}
