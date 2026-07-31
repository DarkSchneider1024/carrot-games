/**
 * Tetris Battle 2P — Canvas HUD & Dual Board Renderer
 *
 * Happy Hues Fresh Pastel Theme:
 * - Clean bright canvas stage (#fbf7f5)
 * - Pastel block palette
 * - Responsive Dual Board Layout (Desktop 1:1 vs Mobile Large Player + Mini Opponent)
 */

const PIECE_COLORS = {
  0: 'transparent',
  1: '#00b4d8', // I - Cyan
  2: '#4361ee', // J - Blue
  3: '#ff7544', // L - Orange
  4: '#ffb703', // O - Yellow
  5: '#2ec4b6', // S - Green
  6: '#a855f7', // T - Purple
  7: '#ff4d6d', // Z - Red
  8: '#8d99ae', // Garbage - Slate
};

export class TetrisBoardRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 22;
    this.gridWidth = 10;
    this.gridHeight = 20;

    this.attackParticles = [];
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Draw full Tetris Battle 2P Stage
   */
  draw(gameState, playerEngine, opponentBoard) {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background Stage (Happy Hues Fresh Soft Peach)
    ctx.fillStyle = '#fbf5f2';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const isMobile = rect.width < 560;

    if (isMobile) {
      this._drawMobileLayout(ctx, rect, gameState, playerEngine, opponentBoard);
    } else {
      this._drawDesktopLayout(ctx, rect, gameState, playerEngine, opponentBoard);
    }

    // Update & draw particles
    this._updateAndDrawParticles(ctx);
  }

  /* ─────────────────────────────────────────────────────────────
     DESKTOP LAYOUT (Side-by-side Dual Boards)
     ───────────────────────────────────────────────────────────── */
  _drawDesktopLayout(ctx, rect, gameState, playerEngine, opponentBoard) {
    // 2-Minute Match Timer
    this._drawTopTimer(ctx, rect.width / 2, 25, gameState.matchTime);

    // Dynamic cell size
    const availableW = (rect.width - 240) / 24;
    const availableH = (rect.height - 90) / 20;
    this.cellSize = Math.max(14, Math.floor(Math.min(availableW, availableH)));

    const boardW = this.gridWidth * this.cellSize;
    const playerX = Math.floor(rect.width * 0.24);
    const playerY = 65;

    // Player Board
    this._drawBoard(ctx, playerX, playerY, playerEngine.board, playerEngine, 'YOU (RED TEAM)', gameState.playerKOs, gameState.playerLinesSent, this.cellSize);

    // Garbage Gauge (Player)
    this._drawGarbageMeter(ctx, playerX - 14, playerY, gameState.pendingGarbage, this.cellSize);

    // Hold Piece
    this._drawHoldArea(ctx, playerX - 85, playerY, playerEngine.holdPiece, 60);

    // Next Queue
    this._drawNextQueue(ctx, playerX + boardW + 12, playerY, playerEngine.nextQueue, 60);

    // Opponent Board
    const oppX = Math.floor(rect.width * 0.68);
    const oppY = playerY;
    this._drawOpponentBoard(ctx, oppX, oppY, opponentBoard, 'OPPONENT (BLUE TEAM)', gameState.opponentKOs, gameState.opponentLinesSent, this.cellSize);

    // Garbage Gauge (Opponent)
    this._drawGarbageMeter(ctx, oppX - 14, oppY, gameState.opponentPendingGarbage, this.cellSize);
  }

  /* ─────────────────────────────────────────────────────────────
     MOBILE LAYOUT (Large Player Board + Mini Opponent HUD)
     ───────────────────────────────────────────────────────────── */
  _drawMobileLayout(ctx, rect, gameState, playerEngine, opponentBoard) {
    // Top Bar Match Timer
    this._drawTopTimer(ctx, rect.width * 0.32, 20, gameState.matchTime);

    // Calculate cell size for main player board
    const availableW = (rect.width - 110) / 11;
    const availableH = (rect.height - 50) / 20;
    this.cellSize = Math.max(12, Math.floor(Math.min(availableW, availableH)));

    const boardW = this.gridWidth * this.cellSize;
    const playerX = 50;
    const playerY = 40;

    // 1. Large Player Board
    this._drawBoard(ctx, playerX, playerY, playerEngine.board, playerEngine, 'YOU', gameState.playerKOs, gameState.playerLinesSent, this.cellSize);

    // 2. Player Garbage Meter
    this._drawGarbageMeter(ctx, playerX - 10, playerY, gameState.pendingGarbage, this.cellSize);

    // 3. Mobile Hold Area
    this._drawHoldArea(ctx, playerX - 44, playerY, playerEngine.holdPiece, 36);

    // 4. Mobile Next Queue
    this._drawNextQueue(ctx, playerX + boardW + 6, playerY, playerEngine.nextQueue, 42);

    // 5. Mini Opponent Battle HUD
    const miniCellSize = Math.max(5, Math.floor(this.cellSize * 0.42));
    const oppW = this.gridWidth * miniCellSize;
    const oppX = Math.floor(rect.width - oppW - 10);
    const oppY = 40;

    this._drawOpponentMiniHUD(ctx, oppX, oppY, opponentBoard, gameState.opponentKOs, gameState.opponentLinesSent, miniCellSize);
  }

  /* ─────────────────────────────────────────────────────────────
     RENDERERS & HELPERS
     ───────────────────────────────────────────────────────────── */
  _drawTopTimer(ctx, centerX, y, matchTime) {
    const m = Math.floor(matchTime / 60);
    const s = matchTime % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 46, y - 13, 92, 26);
    ctx.strokeStyle = (matchTime <= 15) ? '#ff4d6d' : '#ff7544';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 46, y - 13, 92, 26);

    ctx.fillStyle = (matchTime <= 15) ? '#ff4d6d' : '#ff7544';
    ctx.font = 'bold 15px "Russo One", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, centerX, y);
  }

  _drawBoard(ctx, startX, startY, board, engine, title, kos, linesSent, cellSize) {
    const w = this.gridWidth * cellSize;
    const h = this.gridHeight * cellSize;

    // Title & KO Badge
    ctx.fillStyle = '#272343';
    ctx.font = 'bold 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, startX, startY - 9);

    ctx.fillStyle = '#ff4d6d';
    ctx.font = 'bold 13px "Russo One", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`K.O. ${kos}`, startX + w, startY - 9);

    // Board Surface
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, startY, w, h);
    ctx.strokeStyle = 'rgba(255, 117, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 2, startY - 2, w + 4, h + 4);

    // Grid lines
    ctx.strokeStyle = 'rgba(39, 35, 67, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 1; c < this.gridWidth; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * cellSize, startY);
      ctx.lineTo(startX + c * cellSize, startY + h);
      ctx.stroke();
    }
    for (let r = 1; r < this.gridHeight; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + r * cellSize);
      ctx.lineTo(startX + w, startY + r * cellSize);
      ctx.stroke();
    }

    // Locked blocks
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const val = board[r * this.gridWidth + c];
        if (val !== 0) {
          this._drawBlock(ctx, startX + c * cellSize, startY + r * cellSize, val, cellSize);
        }
      }
    }

    // Ghost & Current Piece
    if (engine && engine.currentPiece) {
      const ghostY = engine.getGhostY();
      const shape = engine.PIECE_SHAPES[engine.currentPiece][engine.currentRotation];

      // Ghost
      for (const [dx, dy] of shape) {
        const gx = engine.currentX + dx;
        const gy = ghostY + dy;
        if (gy >= 0 && gy < this.gridHeight && gx >= 0 && gx < this.gridWidth) {
          ctx.fillStyle = 'rgba(39, 35, 67, 0.12)';
          ctx.fillRect(startX + gx * cellSize + 1, startY + gy * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }

      // Current Piece
      for (const [dx, dy] of shape) {
        const px = engine.currentX + dx;
        const py = engine.currentY + dy;
        if (py >= 0 && py < this.gridHeight && px >= 0 && px < this.gridWidth) {
          this._drawBlock(ctx, startX + px * cellSize, startY + py * cellSize, engine.currentPiece, cellSize);
        }
      }
    }
  }

  _drawOpponentBoard(ctx, startX, startY, board, title, kos, linesSent, cellSize) {
    const w = this.gridWidth * cellSize;
    const h = this.gridHeight * cellSize;

    ctx.fillStyle = '#272343';
    ctx.font = 'bold 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, startX, startY - 9);

    ctx.fillStyle = '#4361ee';
    ctx.font = 'bold 13px "Russo One", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`K.O. ${kos}`, startX + w, startY - 9);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, startY, w, h);
    ctx.strokeStyle = 'rgba(67, 97, 238, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 2, startY - 2, w + 4, h + 4);

    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const val = board[r * this.gridWidth + c];
        if (val !== 0) {
          this._drawBlock(ctx, startX + c * cellSize, startY + r * cellSize, val, cellSize);
        }
      }
    }
  }

  _drawOpponentMiniHUD(ctx, startX, startY, board, kos, linesSent, miniCellSize) {
    const w = this.gridWidth * miniCellSize;
    const h = this.gridHeight * miniCellSize;

    // Header
    ctx.fillStyle = '#4361ee';
    ctx.font = 'bold 10px "Russo One", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`OPP KO:${kos}`, startX + w / 2, startY - 7);

    // Mini Frame
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, startY, w, h);
    ctx.strokeStyle = '#4361ee';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX - 1, startY - 1, w + 2, h + 2);

    // Mini Blocks
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const val = board[r * this.gridWidth + c];
        if (val !== 0) {
          const color = PIECE_COLORS[val] || '#4361ee';
          ctx.fillStyle = color;
          ctx.fillRect(startX + c * miniCellSize, startY + r * miniCellSize, miniCellSize - 0.5, miniCellSize - 0.5);
        }
      }
    }
  }

  _drawGarbageMeter(ctx, x, y, garbageCount, cellSize) {
    const h = this.gridHeight * cellSize;
    const w = 6;

    ctx.fillStyle = '#f4e9e2';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 77, 109, 0.4)';
    ctx.strokeRect(x, y, w, h);

    if (garbageCount > 0) {
      const fillHeight = Math.min(h, garbageCount * cellSize);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(x, y + h - fillHeight, w, fillHeight);
    }
  }

  _drawBlock(ctx, x, y, pieceType, size) {
    const color = PIECE_COLORS[pieceType] || '#ffffff';
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x + 1, y + 1, size - 2, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(x + 1, y + size - 3, size - 2, 2);
  }

  _drawHoldArea(ctx, x, y, holdPiece, boxWidth) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, boxWidth, boxWidth);
    ctx.strokeStyle = 'rgba(255, 117, 68, 0.3)';
    ctx.strokeRect(x, y, boxWidth, boxWidth);

    ctx.fillStyle = '#5f6c7b';
    ctx.font = '9px "Chakra Petch", sans-serif';
    ctx.fillText('HOLD', x + 3, y + 10);

    if (holdPiece > 0) {
      const miniSize = Math.max(6, Math.floor(boxWidth * 0.18));
      this._drawMiniPiece(ctx, x + boxWidth * 0.35, y + boxWidth * 0.48, holdPiece, miniSize);
    }
  }

  _drawNextQueue(ctx, x, y, nextQueue, boxWidth) {
    const boxHeight = Math.max(130, Math.floor(this.gridHeight * this.cellSize * 0.7));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = 'rgba(255, 117, 68, 0.3)';
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    ctx.fillStyle = '#5f6c7b';
    ctx.font = '9px "Chakra Petch", sans-serif';
    ctx.fillText('NEXT', x + 3, y + 10);

    const miniSize = Math.max(6, Math.floor(boxWidth * 0.18));
    const stepY = Math.floor(boxHeight / 4.8);

    for (let i = 0; i < Math.min(4, nextQueue.length); i++) {
      this._drawMiniPiece(ctx, x + boxWidth * 0.35, y + 24 + i * stepY, nextQueue[i], miniSize);
    }
  }

  _drawMiniPiece(ctx, cx, cy, pieceType, miniSize) {
    const color = PIECE_COLORS[pieceType];
    if (!color) return;

    ctx.fillStyle = color;
    const offsets = {
      1: [[-1,0],[0,0],[1,0],[2,0]],
      2: [[-1,-1],[-1,0],[0,0],[1,0]],
      3: [[1,-1],[-1,0],[0,0],[1,0]],
      4: [[0,-1],[1,-1],[0,0],[1,0]],
      5: [[0,-1],[1,-1],[-1,0],[0,0]],
      6: [[0,-1],[-1,0],[0,0],[1,0]],
      7: [[-1,-1],[0,-1],[0,0],[1,0]],
    }[pieceType] || [[0,0]];

    for (const [dx, dy] of offsets) {
      ctx.fillRect(cx + dx * miniSize, cy + dy * miniSize, miniSize - 1, miniSize - 1);
    }
  }

  _updateAndDrawParticles(ctx) {
    for (let i = this.attackParticles.length - 1; i >= 0; i--) {
      const p = this.attackParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;

      if (p.life <= 0) {
        this.attackParticles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1.0;
  }
}
