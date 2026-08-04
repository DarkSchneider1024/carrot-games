/**
 * WebAssembly Adapter & Fallback Engine Bridge
 *
 * Provides WebAssembly instantiation interface with seamless JS fallback.
 */

export class TetrisWasmEngine {
  constructor() {
    this.wasmInstance = null;
    this.memory = null;
    this.isWasmLoaded = false;

    // Board representation (10x20)
    this.board = new Uint8Array(200);
    this.currentPiece = 1;
    this.currentRotation = 0;
    this.currentX = 3;
    this.currentY = 0;
    this.holdPiece = 0;
    this.canHold = true;
    this.nextQueue = [1, 2, 3, 4, 5];
    this.score = 0;
    this.linesCleared = 0;
    this.comboCount = -1;
    this.backToBack = false;

    // Piece shapes
    this.PIECE_SHAPES = {
      1: [[[-1,0],[0,0],[1,0],[2,0]], [[1,-1],[1,0],[1,1],[1,2]], [[-1,1],[0,1],[1,1],[2,1]], [[0,-1],[0,0],[0,1],[0,2]]], // I
      2: [[[-1,-1],[-1,0],[0,0],[1,0]], [[0,-1],[1,-1],[0,0],[0,1]], [[-1,0],[0,0],[1,0],[1,1]], [[0,-1],[0,0],[0,1],[-1,1]]], // J
      3: [[[1,-1],[-1,0],[0,0],[1,0]], [[0,-1],[0,0],[0,1],[1,1]], [[-1,0],[0,0],[1,0],[-1,1]], [[-1,-1],[0,-1],[0,0],[0,1]]], // L
      4: [[[0,-1],[1,-1],[0,0],[1,0]], [[0,-1],[1,-1],[0,0],[1,0]], [[0,-1],[1,-1],[0,0],[1,0]], [[0,-1],[1,-1],[0,0],[1,0]]], // O
      5: [[[0,-1],[1,-1],[-1,0],[0,0]], [[0,-1],[0,0],[1,0],[1,1]], [[0,0],[1,0],[-1,1],[0,1]], [[-1,-1],[-1,0],[0,0],[0,1]]], // S
      6: [[[0,-1],[-1,0],[0,0],[1,0]], [[0,-1],[0,0],[1,0],[0,1]], [[-1,0],[0,0],[1,0],[0,1]], [[0,-1],[-1,0],[0,0],[0,1]]], // T
      7: [[[-1,-1],[0,-1],[0,0],[1,0]], [[1,-1],[0,0],[1,0],[0,1]], [[-1,0],[0,0],[0,1],[1,1]], [[0,-1],[-1,0],[0,0],[-1,1]]], // Z
    };
  }

  /**
   * Initialize WebAssembly engine
   */
  async init(wasmUrl = './assets/wasm/tetris-engine.wasm') {
    try {
      const response = await fetch(wasmUrl);
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        const results = await WebAssembly.instantiate(bytes, {
          env: {
            memory: new WebAssembly.Memory({ initial: 256 }),
            abort: () => console.error('WASM Abort'),
          },
        });
        this.wasmInstance = results.instance;
        this.isWasmLoaded = true;
        console.log('⚡ WebAssembly Tetris Engine loaded successfully');
      }
    } catch (e) {
      console.warn('WASM module load fallback to JS Engine Adapter:', e);
      this.isWasmLoaded = false;
    }

    this.reset();
  }

  reset() {
    this.board.fill(0);
    this.score = 0;
    this.linesCleared = 0;
    this.comboCount = -1;
    this.backToBack = false;
    this.holdPiece = 0;
    this.canHold = true;
    this.nextQueue = this._generateBag();
    this._spawnNext();
  }

  _generateBag() {
    const pieces = [1, 2, 3, 4, 5, 6, 7];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
  }

  _spawnNext() {
    this.currentPiece = this.nextQueue.shift();
    if (this.nextQueue.length < 5) {
      this.nextQueue.push(...this._generateBag());
    }
    this.currentRotation = 0;
    this.currentX = 3;
    this.currentY = 0;
    this.canHold = true;

    if (this.checkCollision(this.currentPiece, this.currentRotation, this.currentX, this.currentY)) {
      return true; // Game Over
    }
    return false;
  }

  checkCollision(piece, rot, px, py) {
    const shape = this.PIECE_SHAPES[piece]?.[rot];
    if (!shape) return true;

    for (const [dx, dy] of shape) {
      const mx = px + dx;
      const my = py + dy;
      if (mx < 0 || mx >= 10 || my >= 20) return true;
      if (my >= 0 && this.board[my * 10 + mx] !== 0) return true;
    }
    return false;
  }

  move(dx, dy) {
    if (!this.checkCollision(this.currentPiece, this.currentRotation, this.currentX + dx, this.currentY + dy)) {
      this.currentX += dx;
      this.currentY += dy;
      return true;
    }
    return false;
  }

  rotate(dir = 1) {
    const newRot = (this.currentRotation + dir + 4) % 4;
    const kicks = [[0,0], [-1,0], [1,0], [0,-1], [0,1]];
    for (const [kx, ky] of kicks) {
      if (!this.checkCollision(this.currentPiece, newRot, this.currentX + kx, this.currentY + ky)) {
        this.currentRotation = newRot;
        this.currentX += kx;
        this.currentY += ky;
        return true;
      }
    }
    return false;
  }

  hold() {
    if (!this.canHold) return false;
    if (this.holdPiece === 0) {
      this.holdPiece = this.currentPiece;
      this._spawnNext();
    } else {
      const temp = this.currentPiece;
      this.currentPiece = this.holdPiece;
      this.holdPiece = temp;
      this.currentRotation = 0;
      this.currentX = 3;
      this.currentY = 0;
    }
    this.canHold = false;
    return true;
  }

  hardDrop() {
    while (!this.checkCollision(this.currentPiece, this.currentRotation, this.currentX, this.currentY + 1)) {
      this.currentY++;
    }

    // Lock onto board
    const shape = this.PIECE_SHAPES[this.currentPiece][this.currentRotation];
    for (const [dx, dy] of shape) {
      const mx = this.currentX + dx;
      const my = this.currentY + dy;
      if (my >= 0 && my < 20 && mx >= 0 && mx < 10) {
        this.board[my * 10 + mx] = this.currentPiece;
      }
    }

    // Check line clears
    let cleared = 0;
    for (let r = 19; r >= 0; r--) {
      let full = true;
      for (let c = 0; c < 10; c++) {
        if (this.board[r * 10 + c] === 0) {
          full = false;
          break;
        }
      }
      if (full) {
        cleared++;
        for (let nr = r; nr > 0; nr--) {
          for (let nc = 0; nc < 10; nc++) {
            this.board[nr * 10 + nc] = this.board[(nr - 1) * 10 + nc];
          }
        }
        for (let nc = 0; nc < 10; nc++) this.board[nc] = 0;
        r++;
      }
    }

    this.linesCleared += cleared;
    let attackLines = 0;

    if (cleared > 0) {
      this.comboCount++;
      if (cleared === 1) attackLines = 0;
      else if (cleared === 2) attackLines = 1;
      else if (cleared === 3) attackLines = 2;
      else if (cleared === 4) {
        attackLines = 4;
        if (this.backToBack) attackLines += 2;
        this.backToBack = true;
      } else {
        this.backToBack = false;
      }

      if (this.comboCount > 0) attackLines += Math.floor(this.comboCount / 2);
    } else {
      this.comboCount = -1;
    }

    this.score += cleared * 100 + (attackLines * 50);

    const isGameOver = this._spawnNext();

    return {
      gameOver: isGameOver,
      cleared,
      attackLines,
      score: this.score,
    };
  }

  addGarbage(count, gapCol = null) {
    if (count <= 0) return;
    if (gapCol === null) gapCol = Math.floor(Math.random() * 10);

    for (let g = 0; g < count; g++) {
      for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 10; c++) {
          this.board[r * 10 + c] = this.board[(r + 1) * 10 + c];
        }
      }
      for (let c = 0; c < 10; c++) {
        this.board[19 * 10 + c] = (c === gapCol) ? 0 : 8; // 8 = Garbage
      }
    }
  }

  getGhostY() {
    let gy = this.currentY;
    while (!this.checkCollision(this.currentPiece, this.currentRotation, this.currentX, gy + 1)) {
      gy++;
    }
    return gy;
  }
}
