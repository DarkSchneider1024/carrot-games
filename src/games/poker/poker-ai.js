/**
 * Texas Hold'em AI Decision Engine (德州撲克 AI 戰術大腦)
 *
 * Monte Carlo equity vs. the live opponents + pot odds, with a per-seat playing style:
 *   兔兔 謹慎型 (tight-passive) · 貓咪 激進型 (loose-aggressive) · 熊熊 均衡型 (balanced)
 */

import { evaluate7Cards, createDeck } from './poker-engine.js';

export const AI_STYLES = {
  p1: { label: '謹慎型', looseness: -0.03, aggression: 0.35, bluff: 0.03 },
  p2: { label: '激進型', looseness: 0.06, aggression: 0.75, bluff: 0.12 },
  p3: { label: '均衡型', looseness: 0.02, aggression: 0.55, bluff: 0.06 },
};
const DEFAULT_STYLE = { label: '均衡型', looseness: 0.02, aggression: 0.5, bluff: 0.06 };

/** Probability of winning (ties count half) against `opponents` random hands. */
export function estimateEquity(holeCards, board, opponents, iterations = 300) {
  const known = new Set([...holeCards, ...board].map(c => c.id));
  const deck = createDeck().filter(c => !known.has(c.id));
  const need = 2 * opponents + (5 - board.length);
  let score = 0;

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const fullBoard = board.concat(deck.slice(2 * opponents, need));
    const mine = evaluate7Cards([...holeCards, ...fullBoard]).totalScore;
    let bestOpp = -1;
    for (let o = 0; o < opponents; o++) {
      const s = evaluate7Cards([deck[2 * o], deck[2 * o + 1], ...fullBoard]).totalScore;
      if (s > bestOpp) bestOpp = s;
    }
    if (mine > bestOpp) score += 1;
    else if (mine === bestOpp) score += 0.5;
  }
  return score / iterations;
}

export function makeAIDecision(engine, playerIdx) {
  const p = engine.players[playerIdx];
  if (!p || p.folded || p.isAllIn) return;
  const legal = engine.getLegalActions(playerIdx);
  if (!legal.canAct) return;

  const style = AI_STYLES[p.id] || DEFAULT_STYLE;
  const board = engine.communityCards;
  const preflop = board.length === 0;
  const opponents = Math.max(1, engine.players.filter((o, i) => i !== playerIdx && !o.folded).length);
  const equity = estimateEquity(p.cards, board, opponents, preflop ? 250 : 350);
  const fair = 1 / (opponents + 1);
  const rel = equity / fair; // 1.0 = an average hand at this table
  const noise = (Math.random() - 0.5) * 0.1;

  const pot = engine.pot;
  const toCall = legal.callAmount;
  const bb = engine.bigBlind;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const act = (action, amount) => engine.playerAction(action, amount);

  const raiseTo = (potFraction) => {
    const base = preflop
      ? Math.max(engine.currentBet * 3, bb * 3)
      : engine.currentBet + (pot + toCall) * potFraction;
    const target = Math.round(base / 5) * 5;
    return Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target));
  };
  const raiseOrShove = (potFraction) => {
    const target = raiseTo(potFraction);
    // Betting most of the stack anyway → just move all-in
    return target >= legal.maxRaiseTo * 0.75 ? act('ALLIN') : act('RAISE', target);
  };

  if (toCall === 0) {
    const valueBet = rel + noise > 1.45 - style.aggression * 0.25 && Math.random() < 0.5 + style.aggression * 0.45;
    const bluffBet = !preflop && Math.random() < style.bluff;
    if (legal.canRaise && (valueBet || bluffBet)) return raiseOrShove(rel > 2 ? 0.75 : 0.5);
    return act('CHECK');
  }

  // Facing a bet
  if (rel > 2.1 && legal.canRaise && Math.random() < style.aggression) return raiseOrShove(0.8);

  const required = (preflop ? potOdds * 0.65 : potOdds) + 0.03 - style.looseness;
  if (equity + noise * 0.5 >= required) return act('CALL');

  if (!preflop && legal.canRaise && Math.random() < style.bluff * 0.4 && toCall <= pot * 0.35) return raiseOrShove(0.6);
  if (toCall <= bb / 2 && equity > fair * 0.6) return act('CALL');
  return act('FOLD');
}
