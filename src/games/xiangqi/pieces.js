/**
 * Xiangqi (中國象棋) — Pieces Definition & Move Generation
 *
 * Board representation: 10 rows × 9 columns (row 0 = top = black side)
 * Piece encoding:
 *   Positive = Red, Negative = Black
 *   0 = empty
 *   1/-1 = 帥/將 (King)
 *   2/-2 = 仕/士 (Advisor)
 *   3/-3 = 相/象 (Elephant)
 *   4/-4 = 車    (Rook)
 *   5/-5 = 馬    (Horse)
 *   6/-6 = 炮    (Cannon)
 *   7/-7 = 兵/卒 (Pawn)
 */

// Piece constants
export const EMPTY = 0;
export const KING = 1;
export const ADVISOR = 2;
export const ELEPHANT = 3;
export const ROOK = 4;
export const HORSE = 5;
export const CANNON = 6;
export const PAWN = 7;

export const RED = 1;   // positive pieces
export const BLACK = -1; // negative pieces

// Piece names for display
export const PIECE_NAMES = {
  [KING]:     { red: '帥', black: '將' },
  [ADVISOR]:  { red: '仕', black: '士' },
  [ELEPHANT]: { red: '相', black: '象' },
  [ROOK]:     { red: '車', black: '車' },
  [HORSE]:    { red: '馬', black: '馬' },
  [CANNON]:   { red: '炮', black: '砲' },
  [PAWN]:     { red: '兵', black: '卒' },
};

/**
 * Get the side of a piece (RED or BLACK)
 */
export function getSide(piece) {
  if (piece > 0) return RED;
  if (piece < 0) return BLACK;
  return 0;
}

/**
 * Get piece type (absolute value)
 */
export function getType(piece) {
  return Math.abs(piece);
}

/**
 * Get display name for a piece
 */
export function getPieceName(piece) {
  const type = getType(piece);
  const side = getSide(piece);
  if (!type || !side) return '';
  return PIECE_NAMES[type]?.[side === RED ? 'red' : 'black'] || '';
}

/**
 * Check if position is within the board
 */
export function inBoard(row, col) {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8;
}

/**
 * Check if position is within the palace (九宮格)
 * Red palace: rows 7-9, cols 3-5
 * Black palace: rows 0-2, cols 3-5
 */
export function inPalace(row, col, side) {
  if (col < 3 || col > 5) return false;
  if (side === RED) return row >= 7 && row <= 9;
  if (side === BLACK) return row >= 0 && row <= 2;
  return false;
}

/**
 * Check if position is on own side of the river
 * Red: rows 5-9, Black: rows 0-4
 */
export function onOwnSide(row, side) {
  if (side === RED) return row >= 5;
  if (side === BLACK) return row <= 4;
  return false;
}

/**
 * Initial board setup
 */
export function createInitialBoard() {
  // Row 0 = black back rank (top), Row 9 = red back rank (bottom)
  return [
    [-ROOK, -HORSE, -ELEPHANT, -ADVISOR, -KING, -ADVISOR, -ELEPHANT, -HORSE, -ROOK],
    [ EMPTY, EMPTY,  EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,  EMPTY],
    [ EMPTY,-CANNON, EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,   -CANNON, EMPTY],
    [-PAWN,  EMPTY, -PAWN,     EMPTY,  -PAWN,   EMPTY,   -PAWN,    EMPTY,  -PAWN],
    [ EMPTY, EMPTY,  EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,  EMPTY],
    [ EMPTY, EMPTY,  EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,  EMPTY],
    [ PAWN,  EMPTY,  PAWN,     EMPTY,   PAWN,   EMPTY,    PAWN,     EMPTY,   PAWN],
    [ EMPTY, CANNON, EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    CANNON,  EMPTY],
    [ EMPTY, EMPTY,  EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,  EMPTY],
    [ ROOK,  HORSE,  ELEPHANT, ADVISOR, KING,   ADVISOR,  ELEPHANT, HORSE,   ROOK],
  ];
}

/**
 * Deep clone a board
 */
export function cloneBoard(board) {
  return board.map(row => [...row]);
}

/**
 * Generate all possible moves for a piece at (row, col)
 * Returns array of {toRow, toCol}
 * Does NOT check if the king is left in check — that's handled by rules.js
 */
export function generatePieceMoves(board, row, col) {
  const piece = board[row][col];
  if (piece === EMPTY) return [];

  const side = getSide(piece);
  const type = getType(piece);
  const moves = [];

  const addMove = (tr, tc) => {
    if (!inBoard(tr, tc)) return;
    const target = board[tr][tc];
    // Can't capture own piece
    if (target !== EMPTY && getSide(target) === side) return;
    moves.push({ toRow: tr, toCol: tc });
  };

  switch (type) {
    case KING:
      _generateKingMoves(board, row, col, side, addMove);
      break;
    case ADVISOR:
      _generateAdvisorMoves(row, col, side, addMove);
      break;
    case ELEPHANT:
      _generateElephantMoves(board, row, col, side, addMove);
      break;
    case ROOK:
      _generateRookMoves(board, row, col, addMove);
      break;
    case HORSE:
      _generateHorseMoves(board, row, col, addMove);
      break;
    case CANNON:
      _generateCannonMoves(board, row, col, side, addMove);
      break;
    case PAWN:
      _generatePawnMoves(row, col, side, addMove);
      break;
  }

  return moves;
}

// ── King (帥/將) ──
function _generateKingMoves(board, row, col, side, addMove) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const tr = row + dr;
    const tc = col + dc;
    if (inPalace(tr, tc, side)) {
      addMove(tr, tc);
    }
  }

  // "Flying King" attack — if two kings face each other on the same column with nothing in between
  // This is checked in rules.js, but we allow the move generation here
}

// ── Advisor (仕/士) ──
function _generateAdvisorMoves(row, col, side, addMove) {
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of dirs) {
    const tr = row + dr;
    const tc = col + dc;
    if (inPalace(tr, tc, side)) {
      addMove(tr, tc);
    }
  }
}

// ── Elephant (相/象) ──
function _generateElephantMoves(board, row, col, side, addMove) {
  const dirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
  const eyes = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (let i = 0; i < 4; i++) {
    const tr = row + dirs[i][0];
    const tc = col + dirs[i][1];

    // Must stay on own side of river
    if (!inBoard(tr, tc) || !onOwnSide(tr, side)) continue;

    // Check elephant eye (象眼) — blocking piece
    const er = row + eyes[i][0];
    const ec = col + eyes[i][1];
    if (board[er][ec] !== EMPTY) continue;

    addMove(tr, tc);
  }
}

// ── Rook (車) ──
function _generateRookMoves(board, row, col, addMove) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    let tr = row + dr;
    let tc = col + dc;
    while (inBoard(tr, tc)) {
      if (board[tr][tc] === EMPTY) {
        addMove(tr, tc);
      } else {
        addMove(tr, tc); // Can capture
        break;
      }
      tr += dr;
      tc += dc;
    }
  }
}

// ── Horse (馬) ──
function _generateHorseMoves(board, row, col, addMove) {
  // (leg offset, then two target offsets)
  const jumps = [
    { leg: [-1, 0], targets: [[-2, -1], [-2, 1]] },
    { leg: [1, 0],  targets: [[2, -1],  [2, 1]] },
    { leg: [0, -1], targets: [[-1, -2], [1, -2]] },
    { leg: [0, 1],  targets: [[-1, 2],  [1, 2]] },
  ];

  for (const { leg, targets } of jumps) {
    const lr = row + leg[0];
    const lc = col + leg[1];
    // Check if leg is blocked (馬腳/蹩馬腿)
    if (!inBoard(lr, lc) || board[lr][lc] !== EMPTY) continue;

    for (const [dr, dc] of targets) {
      addMove(row + dr, col + dc);
    }
  }
}

// ── Cannon (炮) ──
function _generateCannonMoves(board, row, col, side, addMove) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    let tr = row + dr;
    let tc = col + dc;
    let jumped = false;

    while (inBoard(tr, tc)) {
      if (!jumped) {
        if (board[tr][tc] === EMPTY) {
          addMove(tr, tc); // Regular move
        } else {
          jumped = true; // Found the cannon mount
        }
      } else {
        if (board[tr][tc] !== EMPTY) {
          // Can capture over the mount
          if (getSide(board[tr][tc]) !== side) {
            addMove(tr, tc);
          }
          break;
        }
      }
      tr += dr;
      tc += dc;
    }
  }
}

// ── Pawn (兵/卒) ──
function _generatePawnMoves(row, col, side, addMove) {
  if (side === RED) {
    // Red pawns move upward (decreasing row)
    addMove(row - 1, col);
    // After crossing river (row <= 4), can also move sideways
    if (row <= 4) {
      addMove(row, col - 1);
      addMove(row, col + 1);
    }
  } else {
    // Black pawns move downward (increasing row)
    addMove(row + 1, col);
    // After crossing river (row >= 5), can also move sideways
    if (row >= 5) {
      addMove(row, col - 1);
      addMove(row, col + 1);
    }
  }
}

/**
 * Generate all moves for one side
 */
export function generateAllMoves(board, side) {
  const moves = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== EMPTY && getSide(board[r][c]) === side) {
        const pieceMoves = generatePieceMoves(board, r, c);
        for (const m of pieceMoves) {
          moves.push({ fromRow: r, fromCol: c, toRow: m.toRow, toCol: m.toCol });
        }
      }
    }
  }
  return moves;
}
