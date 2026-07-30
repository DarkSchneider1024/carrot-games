/**
 * Xiangqi AI Engine — Minimax with Alpha-Beta Pruning
 *
 * Pure JavaScript implementation for MVP.
 * Runs in Web Worker to avoid blocking UI.
 */

import {
  EMPTY, KING, ADVISOR, ELEPHANT, ROOK, HORSE, CANNON, PAWN,
  RED, BLACK, getSide, getType, cloneBoard,
} from './pieces.js';
import { getLegalMoves, makeMove, isInCheck } from './rules.js';

// ── Piece Values ──
const PIECE_VALUES = {
  [KING]:     10000,
  [ADVISOR]:  20,
  [ELEPHANT]: 20,
  [ROOK]:     900,
  [HORSE]:    400,
  [CANNON]:   450,
  [PAWN]:     100,
};

// ── Position Score Tables (10 rows × 9 columns) ──
// Values represent bonus for piece being at that position (from Red's perspective)
// For Black, the table is flipped vertically

const POSITION_TABLES = {
  [KING]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 0, 0, 0],
    [0, 0, 0, 11, 15, 11, 0, 0, 0],
  ],
  [ADVISOR]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
    [0, 0, 0, 0, 23, 0, 0, 0, 0],
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
  ],
  [ELEPHANT]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [18, 0, 0, 0, 23, 0, 0, 0, 18],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
  ],
  [ROOK]: [
    [206, 208, 207, 213, 214, 213, 207, 208, 206],
    [206, 212, 209, 216, 233, 216, 209, 212, 206],
    [206, 208, 207, 214, 216, 214, 207, 208, 206],
    [206, 213, 213, 216, 216, 216, 213, 213, 206],
    [208, 211, 211, 214, 215, 214, 211, 211, 208],
    [208, 212, 212, 214, 215, 214, 212, 212, 208],
    [204, 209, 204, 212, 214, 212, 204, 209, 204],
    [198, 208, 204, 212, 212, 212, 204, 208, 198],
    [200, 208, 206, 212, 200, 212, 206, 208, 200],
    [194, 206, 204, 212, 200, 212, 204, 206, 194],
  ],
  [HORSE]: [
    [90, 90, 90, 96, 90, 96, 90, 90, 90],
    [90, 96, 103, 97, 94, 97, 103, 96, 90],
    [92, 98, 99, 103, 99, 103, 99, 98, 92],
    [93, 108, 100, 107, 100, 107, 100, 108, 93],
    [90, 100, 99, 103, 104, 103, 99, 100, 90],
    [90, 98, 101, 102, 103, 102, 101, 98, 90],
    [92, 94, 98, 95, 98, 95, 98, 94, 92],
    [93, 92, 94, 95, 92, 95, 94, 92, 93],
    [85, 90, 92, 93, 78, 93, 92, 90, 85],
    [88, 85, 90, 88, 90, 88, 90, 85, 88],
  ],
  [CANNON]: [
    [100, 100, 96, 91, 90, 91, 96, 100, 100],
    [98, 98, 96, 92, 89, 92, 96, 98, 98],
    [97, 97, 96, 91, 92, 91, 96, 97, 97],
    [96, 99, 99, 98, 100, 98, 99, 99, 96],
    [96, 96, 96, 96, 100, 96, 96, 96, 96],
    [95, 96, 99, 96, 100, 96, 99, 96, 95],
    [96, 96, 96, 96, 96, 96, 96, 96, 96],
    [97, 96, 100, 99, 101, 99, 100, 96, 97],
    [96, 97, 98, 98, 98, 98, 98, 97, 96],
    [96, 96, 97, 99, 99, 99, 97, 96, 96],
  ],
  [PAWN]: [
    [9, 9, 9, 11, 13, 11, 9, 9, 9],
    [19, 24, 34, 42, 44, 42, 34, 24, 19],
    [19, 24, 32, 37, 37, 37, 32, 24, 19],
    [19, 23, 27, 29, 30, 29, 27, 23, 19],
    [14, 18, 20, 27, 29, 27, 20, 18, 14],
    [7, 0, 13, 0, 12, 0, 13, 0, 7],
    [7, 0, 7, 0, 15, 0, 7, 0, 7],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

/**
 * Evaluate the board position
 * Positive = favor Red, Negative = favor Black
 */
export function evaluate(board) {
  let score = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece === EMPTY) continue;

      const type = getType(piece);
      const side = getSide(piece);
      const table = POSITION_TABLES[type];

      // Get position value
      let posVal = 0;
      if (table) {
        if (side === RED) {
          posVal = table[r][c];
        } else {
          // Flip table for black
          posVal = table[9 - r][8 - c];
        }
      }

      const pieceVal = (PIECE_VALUES[type] || 0) + posVal;

      if (side === RED) {
        score += pieceVal;
      } else {
        score -= pieceVal;
      }
    }
  }

  return score;
}

/**
 * Order moves for better alpha-beta pruning efficiency
 * Captures first, then center moves
 */
function orderMoves(board, moves) {
  return moves.sort((a, b) => {
    const captA = board[a.toRow][a.toCol] !== EMPTY ? PIECE_VALUES[getType(board[a.toRow][a.toCol])] || 0 : 0;
    const captB = board[b.toRow][b.toCol] !== EMPTY ? PIECE_VALUES[getType(board[b.toRow][b.toCol])] || 0 : 0;
    return captB - captA; // Highest value captures first
  });
}

/**
 * Minimax with Alpha-Beta Pruning (Negamax variant)
 */
function negamax(board, depth, alpha, beta, side) {
  if (depth === 0) {
    return side === RED ? evaluate(board) : -evaluate(board);
  }

  let moves = getLegalMoves(board, side);

  // No legal moves = loss
  if (moves.length === 0) {
    return -99999 + (4 - depth); // Prefer later losses
  }

  // Order moves for better pruning
  moves = orderMoves(board, moves);

  let bestScore = -Infinity;

  for (const move of moves) {
    const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
    const opponent = side === RED ? BLACK : RED;
    const score = -negamax(newBoard, depth - 1, -beta, -alpha, opponent);

    if (score > bestScore) {
      bestScore = score;
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break; // Beta cutoff
  }

  return bestScore;
}

/**
 * Find the best move for a side
 */
export function findBestMove(board, side, depth = 3) {
  let moves = getLegalMoves(board, side);
  if (moves.length === 0) return null;

  // Add some randomness for equal moves
  moves = orderMoves(board, moves);

  let bestMove = null;
  let bestScore = -Infinity;
  const alpha = -Infinity;
  const beta = Infinity;

  for (const move of moves) {
    const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
    const opponent = side === RED ? BLACK : RED;
    const score = -negamax(newBoard, depth - 1, -beta, -alpha, opponent);

    if (score > bestScore || (score === bestScore && Math.random() < 0.3)) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
