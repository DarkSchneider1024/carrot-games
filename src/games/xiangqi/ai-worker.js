/**
 * Xiangqi AI Web Worker
 *
 * Receives board state, runs AI search, returns best move.
 * Runs off the main thread to prevent UI freezing.
 */

import { findBestMove } from './ai-engine.js';

self.onmessage = function (e) {
  const { type, data } = e.data;

  if (type === 'search') {
    const { board, side, depth } = data;

    try {
      const bestMove = findBestMove(board, side, depth);
      self.postMessage({ type: 'bestMove', data: bestMove });
    } catch (err) {
      console.error('AI search error:', err);
      self.postMessage({ type: 'bestMove', data: null });
    }
  }
};
