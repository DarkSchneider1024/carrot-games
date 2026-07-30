/**
 * Tetris Battle 2P — Canvas HUD & Dual Board Renderer
 *
 * Renders original Tetris Battle 2P Interface:
 * - Center 2-Minute Match Timer (02:00)
 * - K.O. Count Badges (Player K.O. vs Opponent K.O.)
 * - Pending Garbage Gauge (Vertical Red Danger Meter)
 * - Player Board & Opponent Battle Board
 * - Hold & Next Queues, Ghost Piece, Bevel Blocks
 */

const PIECE_COLORS = {
  0: 'transparent',
  1: '#06b6d4', // I - Cyan
  2: '#3b82f6', // J - Blue
  3: '#f97316', // L - Orange
  4: '#f59e0b', // O - Yellow
  5: '#22c55e', // S - Green
  6: '#a855f7', // T - Purple
  7: '#ef4444', // Z - Red
  8: '#475569', // Garbage - Gray
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

    // Background Stage
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Render 2-Minute Center Match Timer
    this._drawTopTimer(ctx, rect.width / 2, 25, gameState.matchTime);

    // Player Board (Left Center)
    const playerX = Math.floor(rect.width * 0.22);
    const playerY = 70;
    this._drawBoard(ctx, playerX, playerY, playerEngine.board, playerEngine, 'YOU (RED TEAM)', gameState.playerKOs, gameState.playerLinesSent);

    // Pending Garbage Gauge (Player)
    this._drawGarbageMeter(ctx, playerX - 16, playerY, gameState.pendingGarbage);

    // Hold Piece Area
    this._drawHoldArea(ctx, playerX - 100, playerY, playerEngine.holdPiece);

    // Next Queue
    this._drawNextQueue(ctx, playerX + 10 * this.cellSize + 15, playerY, playerEngine.nextQueue);

    // Opponent Board (Right Center)
    const oppX = Math.floor(rect.width * 0.68);
    const oppY = playerY;
    this._drawOpponentBoard(ctx, oppX, oppY, opponentBoard, 'OPPONENT (BLUE TEAM)', gameState.opponentKOs, gameState.opponentLinesSent);

    // Pending Garbage Gauge (Opponent)
    this._drawGarbageMeter(ctx, oppX - 16, oppY, gameState.opponentPendingGarbage);

    // Particles
    this._updateAndDrawParticles(ctx);
  }

  _drawTopTimer(ctx, centerX, y, matchTime) {
    const m = Math.floor(matchTime / 60);
    const s = matchTime % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    ctx.fillStyle = '#151d2d';
    ctx.fillRect(centerX - 60, y - 18, 120, 36);
    ctx.strokeStyle = (matchTime <= 15) ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 60, y - 18, 120, 36);

    ctx.fillStyle = (matchTime <= 15) ? '#ef4444' : '#f59e0b';
    ctx.font = 'bold 20px "Russo One", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, centerX, y);
  }

  _drawBoard(ctx, startX, startY, board, engine, title, kos, linesSent) {
    const w = this.gridWidth * this.cellSize;
    const h = this.gridHeight * this.cellSize;

    // Title & KO Badge
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, startX, startY - 12);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px "Russo One", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`K.O. ${kos}`, startX + w, startY - 12);

    // Board Surface
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(startX, startY, w, h);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 2, startY - 2, w + 4, h + 4);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let c = 1; c < this.gridWidth; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * this.cellSize, startY);
      ctx.lineTo(startX + c * this.cellSize, startY + h);
      ctx.stroke();
    }
    for (let r = 1; r < this.gridHeight; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + r * this.cellSize);
      ctx.lineTo(startX + w, startY + r * this.cellSize);
      ctx.stroke();
    }

    // Locked blocks
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const val = board[r * this.gridWidth + c];
        if (val !== 0) {
          this._drawBlock(ctx, startX + c * this.cellSize, startY + r * this.cellSize, val, this.cellSize);
        }
      }
    }

    // Active Ghost Piece & Current Piece
    if (engine && engine.currentPiece) {
      const ghostY = engine.getGhostY();
      const shape = engine.PIECE_SHAPES[engine.currentPiece][engine.currentRotation];

      // Ghost
      for (const [dx, dy] of shape) {
        const gx = engine.currentX + dx;
        const gy = ghostY + dy;
        if (gy >= 0 && gy < this.gridHeight && gx >= 0 && gx < this.gridWidth) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(startX + gx * this.cellSize + 1, startY + gy * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
        }
      }

      // Current
      for (const [dx, dy] of shape) {
        const px = engine.currentX + dx;
        const py = engine.currentY + dy;
        if (py >= 0 && py < this.gridHeight && px >= 0 && px < this.gridWidth) {
          this._drawBlock(ctx, startX + px * this.cellSize, startY + py * this.cellSize, engine.currentPiece, this.cellSize);
        }
      }
    }

    // Sent Lines Footer Stat
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ATTACK SENT: ${linesSent}`, startX, startY + h + 18);
  }

  _drawOpponentBoard(ctx, startX, startY, board, title, kos, linesSent) {
    const w = this.gridWidth * this.cellSize;
    const h = this.gridHeight * this.cellSize;

    // Title & KO Badge
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, startX, startY - 12);

    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 14px "Russo One", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`K.O. ${kos}`, startX + w, startY - 12);

    // Board Surface
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(startX, startY, w, h);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 2, startY - 2, w + 4, h + 4);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let c = 1; c < this.gridWidth; c++) {
      ctx.beginPath();
      ctx.moveTo(startX + c * this.cellSize, startY);
      ctx.lineTo(startX + c * this.cellSize, startY + h);
      ctx.stroke();
    }
    for (let r = 1; r < this.gridHeight; r++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + r * this.cellSize);
      ctx.lineTo(startX + w, startY + r * this.cellSize);
      ctx.stroke();
    }

    // Blocks
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const val = board[r * this.gridWidth + c];
        if (val !== 0) {
          this._drawBlock(ctx, startX + c * this.cellSize, startY + r * this.cellSize, val, this.cellSize);
        }
      }
    }

    // Sent Lines Footer Stat
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ATTACK SENT: ${linesSent}`, startX, startY + h + 18);
  }

  _drawGarbageMeter(ctx, x, y, garbageCount) {
    const h = this.gridHeight * this.cellSize;
    const w = 8;

    ctx.fillStyle = '#151d2d';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.strokeRect(x, y, w, h);

    if (garbageCount > 0) {
      const fillHeight = Math.min(h, garbageCount * 22);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(x, y + h - fillHeight, w, fillHeight);
      ctx.shadowBlur = 0;
    }
  }

  _drawBlock(ctx, x, y, pieceType, size) {
    const color = PIECE_COLORS[pieceType] || '#ffffff';
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 1, y + 1, size - 2, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
  }

  _drawHoldArea(ctx, x, y, holdPiece) {
    ctx.fillStyle = '#151d2d';
    ctx.fillRect(x, y, 70, 70);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.strokeRect(x, y, 70, 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Chakra Petch", sans-serif';
    ctx.fillText('HOLD', x + 6, y + 14);

    if (holdPiece > 0) {
      this._drawMiniPiece(ctx, x + 22, y + 32, holdPiece, 12);
    }
  }

  _drawNextQueue(ctx, x, y, nextQueue) {
    ctx.fillStyle = '#151d2d';
    ctx.fillRect(x, y, 70, 200);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.strokeRect(x, y, 70, 200);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Chakra Petch", sans-serif';
    ctx.fillText('NEXT', x + 6, y + 14);

    for (let i = 0; i < Math.min(4, nextQueue.length); i++) {
      this._drawMiniPiece(ctx, x + 22, y + 38 + i * 40, nextQueue[i], 11);
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
