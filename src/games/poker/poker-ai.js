/**
 * Texas Hold'em AI Decision Engine (德州撲克 AI 戰術大腦)
 */

import { evaluate7Cards, HAND_RANK } from './poker-engine.js';

export function makeAIDecision(engine, playerIdx) {
  const p = engine.players[playerIdx];
  if (!p || p.folded || p.isAllIn) return;

  const currentBet = engine.currentBet;
  const toCall = currentBet - p.bet;
  const community = engine.communityCards;

  // Evaluate current hand or pre-flop strength
  let handStrength = 0.5;

  if (community.length === 0) {
    // Pre-flop evaluation based on hole cards
    const [c1, c2] = p.cards;
    const isPair = c1.value === c2.value;
    const isSuited = c1.suit === c2.suit;
    const maxVal = Math.max(c1.value, c2.value);

    if (isPair) handStrength = 0.6 + (maxVal / 14) * 0.35;
    else if (maxVal >= 12 && isSuited) handStrength = 0.65;
    else if (maxVal >= 10) handStrength = 0.45 + (maxVal / 14) * 0.2;
    else handStrength = 0.25;
  } else {
    // Post-flop evaluation using 7-card evaluator
    const evalResult = evaluate7Cards([...p.cards, ...community]);
    handStrength = Math.min(1.0, (evalResult.rank / 10) * 0.9 + 0.1);
  }

  // Add small random bluffing / risk factor
  const randomFactor = (Math.random() - 0.5) * 0.15;
  const finalRating = Math.max(0, Math.min(1, handStrength + randomFactor));

  // Decision logic
  if (toCall === 0) {
    if (finalRating > 0.7 && Math.random() < 0.6) {
      engine.playerAction('RAISE', currentBet + engine.bigBlind);
    } else {
      engine.playerAction('CHECK');
    }
  } else {
    if (finalRating > 0.75) {
      if (Math.random() < 0.4) {
        engine.playerAction('RAISE', currentBet + engine.bigBlind * 2);
      } else {
        engine.playerAction('CALL');
      }
    } else if (finalRating > 0.35 || toCall <= engine.bigBlind) {
      engine.playerAction('CALL');
    } else {
      engine.playerAction('FOLD');
    }
  }
}
