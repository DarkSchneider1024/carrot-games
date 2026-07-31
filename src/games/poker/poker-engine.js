/**
 * Texas Hold'em Poker Engine (德州撲克核心引擎)
 *
 * Implements 52-card deck, betting rounds, pot management, hand evaluation, and action logging.
 */

export const SUITS = ['♠', '♥', '♦', '♣'];
export const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const HAND_RANK = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
};

export const HAND_NAMES = {
  1: '高牌 (High Card)',
  2: '對子 (One Pair)',
  3: '兩對 (Two Pair)',
  4: '三條 (Three of a Kind)',
  5: '順子 (Straight)',
  6: '同花 (Flush)',
  7: '葫蘆 (Full House)',
  8: '鐵支 (Four of a Kind)',
  9: '同花順 (Straight Flush)',
  10: '皇家同花順 (Royal Flush)',
};

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, id: `${value}${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function evaluate7Cards(cards) {
  if (cards.length < 5) return { rank: HAND_RANK.HIGH_CARD, name: HAND_NAMES[1], score: 0 };
  const combos = getCombinations(cards, 5);
  let bestHand = null;

  for (const combo of combos) {
    const score = score5CardHand(combo);
    if (!bestHand || score.totalScore > bestHand.totalScore) {
      bestHand = score;
    }
  }
  return bestHand;
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

function score5CardHand(cards) {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  let isStraight = false;
  let straightHigh = 0;

  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
    straightHigh = values[0];
  } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }

  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const freqEntries = Object.entries(counts).map(([v, count]) => ({ value: Number(v), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  let rank = HAND_RANK.HIGH_CARD;

  if (isFlush && isStraight) {
    rank = straightHigh === 14 ? HAND_RANK.ROYAL_FLUSH : HAND_RANK.STRAIGHT_FLUSH;
  } else if (freqEntries[0].count === 4) {
    rank = HAND_RANK.FOUR_OF_A_KIND;
  } else if (freqEntries[0].count === 3 && freqEntries[1].count === 2) {
    rank = HAND_RANK.FULL_HOUSE;
  } else if (isFlush) {
    rank = HAND_RANK.FLUSH;
  } else if (isStraight) {
    rank = HAND_RANK.STRAIGHT;
  } else if (freqEntries[0].count === 3) {
    rank = HAND_RANK.THREE_OF_A_KIND;
  } else if (freqEntries[0].count === 2 && freqEntries[1].count === 2) {
    rank = HAND_RANK.TWO_PAIR;
  } else if (freqEntries[0].count === 2) {
    rank = HAND_RANK.ONE_PAIR;
  }

  let kickerScore = 0;
  freqEntries.forEach((entry, idx) => {
    kickerScore += entry.value * Math.pow(15, 4 - idx);
  });
  if (isStraight) kickerScore = straightHigh;

  const totalScore = rank * 10000000 + kickerScore;

  return {
    rank,
    name: HAND_NAMES[rank],
    totalScore,
    cards: sorted,
  };
}

export class TexasHoldemEngine {
  constructor() {
    this.players = [];
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;

    this.smallBlind = 10;
    this.bigBlind = 20;

    this.dealerIdx = 0;
    this.currentTurnIdx = 0;
    this.roundStage = 'PREFLOP';

    this.gameOver = false;
    this.winnerMsg = '';
    this.onLog = null;
  }

  log(msg, type = 'info') {
    if (this.onLog) this.onLog(msg, type);
  }

  initMatch(playersData) {
    this.players = playersData.map((p, idx) => ({
      id: p.id || `p_${idx}`,
      name: p.name,
      chips: p.chips || 1000,
      bet: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      isAI: p.isAI || false,
      lastAction: null,
    }));

    this.dealerIdx = 0;
    this.startNewHand();
  }

  startNewHand() {
    this.deck = shuffleDeck(createDeck());
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = this.bigBlind;
    this.roundStage = 'PREFLOP';
    this.gameOver = false;
    this.winnerMsg = '';

    this.players.forEach(p => {
      p.cards = [this.deck.pop(), this.deck.pop()];
      p.bet = 0;
      p.folded = p.chips <= 0;
      p.isAllIn = false;
      p.lastAction = null;
    });

    this.dealerIdx = (this.dealerIdx + 1) % this.players.length;

    const sbIdx = (this.dealerIdx + 1) % this.players.length;
    const bbIdx = (this.dealerIdx + 2) % this.players.length;

    this.postBet(sbIdx, this.smallBlind, '小盲注');
    this.postBet(bbIdx, this.bigBlind, '大盲注');

    this.log(`新一局開始！小盲注 $${this.smallBlind}，大盲注 $${this.bigBlind}`, 'system');

    this.currentTurnIdx = (bbIdx + 1) % this.players.length;
  }

  postBet(playerIdx, amount, label = '') {
    const p = this.players[playerIdx];
    const actual = Math.min(p.chips, amount);
    p.chips -= actual;
    p.bet += actual;
    this.pot += actual;
    if (p.chips === 0) p.isAllIn = true;
    if (p.bet > this.currentBet) this.currentBet = p.bet;

    if (label) {
      this.log(`${p.name} 下注 ${label} $${actual}`, 'action');
    }
    return actual;
  }

  playerAction(action, amount = 0) {
    const p = this.players[this.currentTurnIdx];
    if (p.folded || p.isAllIn) {
      this.nextTurn();
      return;
    }

    switch (action) {
      case 'FOLD':
        p.folded = true;
        p.lastAction = { label: '❌ 棄牌', text: '棄牌 (FOLD)', type: 'fold' };
        this.log(`${p.name} 選擇 棄牌`, 'fold');
        break;

      case 'CHECK':
        p.lastAction = { label: '✋ 過牌', text: '過牌 (CHECK)', type: 'check' };
        this.log(`${p.name} 選擇 過牌`, 'check');
        break;

      case 'CALL':
        const callAmount = this.currentBet - p.bet;
        const actualCall = this.postBet(this.currentTurnIdx, callAmount);
        p.lastAction = { label: `💰 跟注 $${actualCall}`, text: `跟注 $${actualCall}`, type: 'call' };
        this.log(`${p.name} 跟注 $${actualCall}`, 'call');
        break;

      case 'RAISE':
        const raiseTotal = Math.max(this.currentBet * 2, amount);
        const needed = raiseTotal - p.bet;
        const actualRaise = this.postBet(this.currentTurnIdx, needed);
        p.lastAction = { label: `🚀 加注 $${actualRaise}`, text: `加注 $${actualRaise}`, type: 'raise' };
        this.log(`${p.name} 加注 $${actualRaise}`, 'raise');
        break;

      case 'ALLIN':
        const allInAmt = p.chips;
        this.postBet(this.currentTurnIdx, allInAmt);
        p.lastAction = { label: `🔥 ALL-IN $${allInAmt}`, text: `ALL-IN $${allInAmt}`, type: 'allin' };
        this.log(`${p.name} 全壓 ALL-IN $${allInAmt}`, 'allin');
        break;
    }

    this.nextTurn();
  }

  nextTurn() {
    const active = this.players.filter(p => !p.folded);
    if (active.length === 1) {
      this.awardPotToSingle(active[0]);
      return;
    }

    const roundComplete = this.players.every(p => p.folded || p.isAllIn || p.bet === this.currentBet);

    if (roundComplete) {
      this.advanceStage();
    } else {
      do {
        this.currentTurnIdx = (this.currentTurnIdx + 1) % this.players.length;
      } while (this.players[this.currentTurnIdx].folded || this.players[this.currentTurnIdx].isAllIn);
    }
  }

  advanceStage() {
    this.players.forEach(p => p.bet = 0);
    this.currentBet = 0;

    switch (this.roundStage) {
      case 'PREFLOP':
        this.roundStage = 'FLOP';
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        this.log(`翻牌圈 (FLOP) 發出 3 張公牌`, 'stage');
        break;
      case 'FLOP':
        this.roundStage = 'TURN';
        this.communityCards.push(this.deck.pop());
        this.log(`轉牌圈 (TURN) 發出第 4 張公牌`, 'stage');
        break;
      case 'TURN':
        this.roundStage = 'RIVER';
        this.communityCards.push(this.deck.pop());
        this.log(`河牌圈 (RIVER) 發出第 5 張公牌`, 'stage');
        break;
      case 'RIVER':
        this.roundStage = 'SHOWDOWN';
        this.showdown();
        return;
    }

    let idx = (this.dealerIdx + 1) % this.players.length;
    while (this.players[idx].folded || this.players[idx].isAllIn) {
      idx = (idx + 1) % this.players.length;
      if (idx === (this.dealerIdx + 1) % this.players.length) break;
    }
    this.currentTurnIdx = idx;
  }

  showdown() {
    this.gameOver = true;
    const active = this.players.filter(p => !p.folded);

    let bestScore = -1;
    let winners = [];

    active.forEach(p => {
      const evalResult = evaluate7Cards([...p.cards, ...this.communityCards]);
      p.handEval = evalResult;
      if (evalResult.totalScore > bestScore) {
        bestScore = evalResult.totalScore;
        winners = [p];
      } else if (evalResult.totalScore === bestScore) {
        winners.push(p);
      }
    });

    const share = Math.floor(this.pot / winners.length);
    winners.forEach(w => w.chips += share);

    this.winnerMsg = `${winners.map(w => w.name).join(', ')} 贏得籌碼 $${this.pot} (${winners[0].handEval.name})`;
    this.log(`攤牌結算：${this.winnerMsg}`, 'win');
  }

  awardPotToSingle(winner) {
    this.gameOver = true;
    winner.chips += this.pot;
    this.winnerMsg = `${winner.name} 獲勝！對手全數棄牌，贏得籌碼 $${this.pot}`;
    this.log(this.winnerMsg, 'win');
  }
}
