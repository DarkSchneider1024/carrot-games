/**
 * Xiangqi (中國象棋) — Game Rules
 *
 * Handles:
 * - Move legality (including king safety)
 * - Check / Checkmate / Stalemate detection
 * - Flying king rule (將帥對面)
 * - Draw detection (repetition, 60-move rule)
 */

import {
  EMPTY, KING, RED, BLACK,
  getSide, getType, cloneBoard,
  generatePieceMoves, generateAllMoves, inBoard,
} from './pieces.js';

/**
 * Find king position for a given side
 */
export function findKing(board, side) {
  const kingVal = side === RED ? KING : -KING;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === kingVal) return { row: r, col: c };
    }
  }
  return null; // Should never happen in valid game
}

/**
 * Check if two kings are facing each other (將帥對面)
 * Kings on same column with no pieces in between = illegal
 */
export function kingsAreFacing(board) {
  const redKing = findKing(board, RED);
  const blackKing = findKing(board, BLACK);
  if (!redKing || !blackKing) return false;
  if (redKing.col !== blackKing.col) return false;

  // Check if anything is between them
  const minRow = Math.min(redKing.row, blackKing.row);
  const maxRow = Math.max(redKing.row, blackKing.row);
  for (let r = minRow + 1; r < maxRow; r++) {
    if (board[r][redKing.col] !== EMPTY) return false;
  }
  return true; // Nothing between them — illegal!
}

/**
 * Check if a side's king is in check
 */
export function isInCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return true; // King captured = definitely in check

  const opponent = side === RED ? BLACK : RED;

  // Check if any opponent piece can capture the king
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== EMPTY && getSide(board[r][c]) === opponent) {
        const moves = generatePieceMoves(board, r, c);
        for (const m of moves) {
          if (m.toRow === king.row && m.toCol === king.col) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Execute a move on the board (returns new board)
 */
export function makeMove(board, fromRow, fromCol, toRow, toCol) {
  const newBoard = cloneBoard(board);
  newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
  newBoard[fromRow][fromCol] = EMPTY;
  return newBoard;
}

/**
 * Check if a move is legal
 * A move is legal if:
 * 1. The piece can make that move (raw move generation)
 * 2. After the move, own king is NOT in check
 * 3. The flying king rule is not violated
 */
export function isLegalMove(board, fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  if (piece === EMPTY) return false;

  const side = getSide(piece);

  // Check if move is in raw move list
  const rawMoves = generatePieceMoves(board, fromRow, fromCol);
  const moveExists = rawMoves.some(m => m.toRow === toRow && m.toCol === toCol);
  if (!moveExists) return false;

  // Simulate the move
  const newBoard = makeMove(board, fromRow, fromCol, toRow, toCol);

  // After the move, own king must not be in check
  if (isInCheck(newBoard, side)) return false;

  // Flying king rule
  if (kingsAreFacing(newBoard)) return false;

  return true;
}

/**
 * Get all legal moves for a side
 */
export function getLegalMoves(board, side) {
  const allMoves = generateAllMoves(board, side);
  return allMoves.filter(m =>
    isLegalMove(board, m.fromRow, m.fromCol, m.toRow, m.toCol)
  );
}

/**
 * Get legal moves for a specific piece
 */
export function getLegalMovesForPiece(board, row, col) {
  const piece = board[row][col];
  if (piece === EMPTY) return [];

  const rawMoves = generatePieceMoves(board, row, col);
  return rawMoves.filter(m =>
    isLegalMove(board, row, col, m.toRow, m.toCol)
  );
}

/**
 * Check if a side is in checkmate (將死)
 * Checkmate = in check AND no legal moves
 */
export function isCheckmate(board, side) {
  if (!isInCheck(board, side)) return false;
  return getLegalMoves(board, side).length === 0;
}

/**
 * Check if a side is in stalemate (困斃)
 * Stalemate = NOT in check AND no legal moves
 * In Chinese chess, stalemate = LOSS for the stalemated side
 */
export function isStalemate(board, side) {
  if (isInCheck(board, side)) return false;
  return getLegalMoves(board, side).length === 0;
}

/**
 * Check if the game is over
 * Returns: { over: boolean, winner?: 'red'|'black'|'draw', reason?: string }
 */
export function checkGameOver(board, currentTurn, moveHistory = [], noCaptureMoves = 0) {
  // Checkmate
  if (isCheckmate(board, currentTurn)) {
    return {
      over: true,
      winner: currentTurn === RED ? 'black' : 'red',
      reason: currentTurn === RED ? '紅方被將死' : '黑方被將死',
    };
  }

  // Stalemate (in Xiangqi, the stalemated side loses)
  if (isStalemate(board, currentTurn)) {
    return {
      over: true,
      winner: currentTurn === RED ? 'black' : 'red',
      reason: currentTurn === RED ? '紅方無子可動' : '黑方無子可動',
    };
  }

  // 60-move rule (no captures)
  if (noCaptureMoves >= 120) { // 120 half-moves = 60 full moves
    return { over: true, winner: 'draw', reason: '60步無吃子，和棋' };
  }

  return { over: false };
}

/**
 * Format a move into Chinese notation (simplified)
 */
export function formatMove(board, fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const side = getSide(piece);
  const type = getType(piece);

  const PIECE_CHARS = {
    1: side === RED ? '帥' : '將',
    2: side === RED ? '仕' : '士',
    3: side === RED ? '相' : '象',
    4: '車',
    5: '馬',
    6: side === RED ? '炮' : '砲',
    7: side === RED ? '兵' : '卒',
  };

  const RED_NUMS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const BLACK_NUMS = ['', '１', '２', '３', '４', '５', '６', '７', '８', '９'];

  const nums = side === RED ? RED_NUMS : BLACK_NUMS;
  const pieceName = PIECE_CHARS[type];

  // Column number (from each side's perspective)
  const fromColNum = side === RED ? (9 - fromCol) : (fromCol + 1);
  const toColNum = side === RED ? (9 - toCol) : (toCol + 1);

  let direction, dest;
  if (fromRow === toRow) {
    direction = '平';
    dest = nums[toColNum];
  } else if ((side === RED && toRow < fromRow) || (side === BLACK && toRow > fromRow)) {
    direction = '進';
    if (fromCol === toCol) {
      dest = nums[Math.abs(toRow - fromRow)];
    } else {
      dest = nums[toColNum];
    }
  } else {
    direction = '退';
    if (fromCol === toCol) {
      dest = nums[Math.abs(toRow - fromRow)];
    } else {
      dest = nums[toColNum];
    }
  }

  return `${pieceName}${nums[fromColNum]}${direction}${dest}`;
}
