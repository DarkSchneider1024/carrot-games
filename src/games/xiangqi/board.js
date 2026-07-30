/**
 * Xiangqi (中國象棋) — Canvas Board Renderer
 *
 * Draws the board, pieces, highlights, and handles animations.
 */

import {
  EMPTY, RED, BLACK, KING, ADVISOR, ELEPHANT, ROOK, HORSE, CANNON, PAWN,
  getSide, getType, getPieceName,
} from './pieces.js';

const BOARD_COLS = 9;
const BOARD_ROWS = 10;

export class XiangqiRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Layout params (recalculated on resize)
    this.cellSize = 0;
    this.boardPadding = 0;
    this.pieceRadius = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    // State for rendering
    this.board = null;
    this.selectedPos = null;     // {row, col}
    this.legalMoves = [];        // [{toRow, toCol}]
    this.lastMove = null;        // {fromRow, fromCol, toRow, toCol}
    this.checkPos = null;        // {row, col} if king is in check
    this.animating = false;
    this.animProgress = 0;
    this.animFrom = null;
    this.animTo = null;
    this.animPiece = null;
    this.flipped = false;        // If true, black is on bottom

    this._resize();
  }

  /**
   * Recalculate dimensions based on canvas size
   */
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Calculate cell size to fit the board
    const maxCellW = (width - 60) / (BOARD_COLS - 1);
    const maxCellH = (height - 60) / (BOARD_ROWS - 1);
    this.cellSize = Math.floor(Math.min(maxCellW, maxCellH));

    this.pieceRadius = Math.floor(this.cellSize * 0.42);
    this.boardPadding = this.cellSize * 0.6;

    // Center the board
    const boardW = (BOARD_COLS - 1) * this.cellSize;
    const boardH = (BOARD_ROWS - 1) * this.cellSize;
    this.offsetX = Math.floor((width - boardW) / 2);
    this.offsetY = Math.floor((height - boardH) / 2);
  }

  /**
   * Convert board position to canvas pixel coordinates
   */
  boardToPixel(row, col) {
    const r = this.flipped ? (9 - row) : row;
    const c = this.flipped ? (8 - col) : col;
    return {
      x: this.offsetX + c * this.cellSize,
      y: this.offsetY + r * this.cellSize,
    };
  }

  /**
   * Convert canvas pixel to board position
   */
  pixelToBoard(px, py) {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const x = px - rect.left;
    const y = py - rect.top;

    let col = Math.round((x - this.offsetX) / this.cellSize);
    let row = Math.round((y - this.offsetY) / this.cellSize);

    if (this.flipped) {
      row = 9 - row;
      col = 8 - col;
    }

    if (row < 0 || row > 9 || col < 0 || col > 8) return null;
    return { row, col };
  }

  /**
   * Draw the complete board
   */
  draw(board) {
    this.board = board;
    this._resize();

    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    this._drawBoardBackground(ctx, rect);
    this._drawGrid(ctx);
    this._drawRiver(ctx);
    this._drawDiagonals(ctx);
    this._drawStarPoints(ctx);
    this._drawHighlights(ctx);
    this._drawPieces(ctx, board);
  }

  _drawBoardBackground(ctx, rect) {
    // Dark wood-inspired background
    const gradient = ctx.createRadialGradient(
      rect.width / 2, rect.height / 2, 0,
      rect.width / 2, rect.height / 2, rect.width * 0.7
    );
    gradient.addColorStop(0, '#2a1f0e');
    gradient.addColorStop(1, '#1a1408');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Board surface
    const bx = this.offsetX - this.boardPadding;
    const by = this.offsetY - this.boardPadding;
    const bw = (BOARD_COLS - 1) * this.cellSize + this.boardPadding * 2;
    const bh = (BOARD_ROWS - 1) * this.cellSize + this.boardPadding * 2;

    // Outer border glow
    ctx.shadowColor = 'rgba(249, 115, 22, 0.15)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#3d2b0f';
    this._roundRect(ctx, bx - 4, by - 4, bw + 8, bh + 8, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Board surface
    const boardGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    boardGrad.addColorStop(0, '#c49a5c');
    boardGrad.addColorStop(0.5, '#d4a574');
    boardGrad.addColorStop(1, '#b8935a');
    ctx.fillStyle = boardGrad;
    this._roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();

    // Subtle wood grain overlay
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 20; i++) {
      const gy = by + (bh / 20) * i;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, gy);
      ctx.lineTo(bx + bw, gy + Math.sin(i) * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _drawGrid(ctx) {
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1.5;

    // Horizontal lines
    for (let r = 0; r < BOARD_ROWS; r++) {
      const { x: x0, y } = this.boardToPixel(r, 0);
      const { x: x1 } = this.boardToPixel(r, BOARD_COLS - 1);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    // Vertical lines (note: edge lines go full height, inner lines stop at river)
    for (let c = 0; c < BOARD_COLS; c++) {
      if (c === 0 || c === BOARD_COLS - 1) {
        // Edge columns: full line
        const { x, y: y0 } = this.boardToPixel(0, c);
        const { y: y1 } = this.boardToPixel(BOARD_ROWS - 1, c);
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
      } else {
        // Inner columns: break at river
        const { x, y: y0 } = this.boardToPixel(0, c);
        const { y: y4 } = this.boardToPixel(4, c);
        const { y: y5 } = this.boardToPixel(5, c);
        const { y: y9 } = this.boardToPixel(9, c);
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y5);
        ctx.lineTo(x, y9);
        ctx.stroke();
      }
    }

    // Outer border (thicker)
    ctx.lineWidth = 2.5;
    const tl = this.boardToPixel(0, 0);
    const br = this.boardToPixel(9, 8);
    const margin = 4;
    ctx.strokeRect(
      tl.x - margin, tl.y - margin,
      br.x - tl.x + margin * 2, br.y - tl.y + margin * 2
    );
  }

  _drawRiver(ctx) {
    const { x: x0, y: y4 } = this.boardToPixel(4, 0);
    const { x: x8 } = this.boardToPixel(4, 8);
    const { y: y5 } = this.boardToPixel(5, 0);

    // River text
    ctx.fillStyle = '#5c4033';
    ctx.font = `bold ${this.cellSize * 0.38}px "Noto Serif TC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const midY = (y4 + y5) / 2;
    const leftX = this.boardToPixel(0, 2).x;
    const rightX = this.boardToPixel(0, 6).x;

    if (this.flipped) {
      ctx.fillText('楚 河', leftX, midY);
      ctx.fillText('漢 界', rightX, midY);
    } else {
      ctx.fillText('楚 河', leftX, midY);
      ctx.fillText('漢 界', rightX, midY);
    }
  }

  _drawDiagonals(ctx) {
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1.5;

    // Top palace (black side: rows 0-2, cols 3-5)
    const drawPalace = (r0, r2) => {
      const { x: x3, y: yr0 } = this.boardToPixel(r0, 3);
      const { x: x5, y: yr2 } = this.boardToPixel(r2, 5);
      const { y: yr0b } = this.boardToPixel(r0, 5);
      const { y: yr2b } = this.boardToPixel(r2, 3);

      ctx.beginPath();
      ctx.moveTo(x3, yr0);
      ctx.lineTo(x5, yr2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x5, yr0b);
      ctx.lineTo(x3, yr2b);
      ctx.stroke();
    };

    drawPalace(0, 2);
    drawPalace(7, 9);
  }

  _drawStarPoints(ctx) {
    // Star positions (棋盤星位)
    const starPositions = [
      [2, 1], [2, 7],  // Cannon positions (black)
      [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], // Pawn positions (black)
      [6, 0], [6, 2], [6, 4], [6, 6], [6, 8], // Pawn positions (red)
      [7, 1], [7, 7],  // Cannon positions (red)
    ];

    for (const [r, c] of starPositions) {
      this._drawStarMark(ctx, r, c);
    }
  }

  _drawStarMark(ctx, row, col) {
    const { x, y } = this.boardToPixel(row, col);
    const len = this.cellSize * 0.12;
    const gap = this.cellSize * 0.08;

    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1.5;

    // Draw the four corner marks
    const drawCorner = (dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * gap, y + dy * (gap + len));
      ctx.lineTo(x + dx * gap, y + dy * gap);
      ctx.lineTo(x + dx * (gap + len), y + dy * gap);
      ctx.stroke();
    };

    // Skip marks that would go off the board
    if (col > 0) {
      drawCorner(-1, -1);
      drawCorner(-1, 1);
    }
    if (col < 8) {
      drawCorner(1, -1);
      drawCorner(1, 1);
    }
  }

  _drawHighlights(ctx) {
    // Last move highlight
    if (this.lastMove) {
      const fromPx = this.boardToPixel(this.lastMove.fromRow, this.lastMove.fromCol);
      const toPx = this.boardToPixel(this.lastMove.toRow, this.lastMove.toCol);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      ctx.fillRect(
        fromPx.x - this.cellSize * 0.45, fromPx.y - this.cellSize * 0.45,
        this.cellSize * 0.9, this.cellSize * 0.9
      );
      ctx.fillRect(
        toPx.x - this.cellSize * 0.45, toPx.y - this.cellSize * 0.45,
        this.cellSize * 0.9, this.cellSize * 0.9
      );
    }

    // Selected piece highlight
    if (this.selectedPos) {
      const px = this.boardToPixel(this.selectedPos.row, this.selectedPos.col);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px.x, px.y, this.pieceRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Legal moves
    for (const move of this.legalMoves) {
      const px = this.boardToPixel(move.toRow, move.toCol);
      const board = this.board;
      if (board && board[move.toRow][move.toCol] !== EMPTY) {
        // Capture indicator — ring
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px.x, px.y, this.pieceRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Move indicator — dot
        ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.beginPath();
        ctx.arc(px.x, px.y, this.cellSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Check highlight
    if (this.checkPos) {
      const px = this.boardToPixel(this.checkPos.row, this.checkPos.col);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(px.x, px.y, this.pieceRadius + 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawPieces(ctx, board) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (piece === EMPTY) continue;

        // Skip the piece being animated at its original position
        if (this.animating && this.animFrom &&
            this.animFrom.row === r && this.animFrom.col === c) {
          continue;
        }

        this._drawPiece(ctx, r, c, piece);
      }
    }

    // Draw animated piece
    if (this.animating && this.animPiece !== null) {
      const from = this.boardToPixel(this.animFrom.row, this.animFrom.col);
      const to = this.boardToPixel(this.animTo.row, this.animTo.col);
      const t = this.animProgress;
      // Ease out cubic
      const et = 1 - Math.pow(1 - t, 3);
      const ax = from.x + (to.x - from.x) * et;
      const ay = from.y + (to.y - from.y) * et;
      this._drawPieceAt(ctx, ax, ay, this.animPiece);
    }
  }

  _drawPiece(ctx, row, col, piece) {
    const { x, y } = this.boardToPixel(row, col);
    this._drawPieceAt(ctx, x, y, piece);
  }

  _drawPieceAt(ctx, x, y, piece) {
    const side = getSide(piece);
    const isRed = side === RED;
    const name = getPieceName(piece);
    const r = this.pieceRadius;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Outer ring
    const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    if (isRed) {
      grad.addColorStop(0, '#fde68a');
      grad.addColorStop(0.6, '#d4a574');
      grad.addColorStop(1, '#b8935a');
    } else {
      grad.addColorStop(0, '#e8dcc8');
      grad.addColorStop(0.6, '#c4b59a');
      grad.addColorStop(1, '#a89880');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Inner circle
    ctx.strokeStyle = isRed ? '#8b4513' : '#4a4036';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    // Text
    ctx.fillStyle = isRed ? '#b91c1c' : '#1a1a2e';
    ctx.font = `bold ${r * 1.1}px "Noto Serif TC", "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x, y + 1);
  }

  /**
   * Animate a piece move
   */
  animateMove(fromRow, fromCol, toRow, toCol, board, callback) {
    this.animating = true;
    this.animFrom = { row: fromRow, col: fromCol };
    this.animTo = { row: toRow, col: toCol };
    this.animPiece = board[fromRow][fromCol];
    this.animProgress = 0;

    const duration = 250; // ms
    const start = performance.now();

    const animate = (time) => {
      this.animProgress = Math.min((time - start) / duration, 1);
      this.draw(board);

      if (this.animProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animating = false;
        this.animPiece = null;
        if (callback) callback();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Resize handler
   */
  handleResize() {
    this._resize();
    if (this.board) this.draw(this.board);
  }
}
