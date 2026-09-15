/**
 * Texas Hold'em Poker Engine (德州撲克核心引擎)
 *
 * Implements 52-card deck, betting rounds with minimum-raise rules, side pots, all-in run-outs,
 * fast 7-card hand evaluation, and strict street turn tracking.
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

/**
 * Evaluates the best 5-card hand out of 5–7 cards without enumerating combinations.
 * totalScore is comparable across hands (higher wins, equal = split).
 */
export function evaluate7Cards(cards) {
  if (!cards || cards.length < 5) return { rank: HAND_RANK.HIGH_CARD, name: HAND_NAMES[1], totalScore: 0, cards: [] };

  const byValue = new Map();
  const bySuit = new Map();
  for (const c of cards) {
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value).push(c);
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
    bySuit.get(c.suit).push(c);
  }

  const result = (rank, kickers, best) => {
    let totalScore = rank;
    for (let i = 0; i < 5; i++) totalScore = totalScore * 15 + (kickers[i] || 0);
    return { rank, name: HAND_NAMES[rank], totalScore, cards: best };
  };
  const straightHigh = (valueMap) => {
    for (let hi = 14; hi >= 5; hi--) {
      let ok = true;
      for (let k = 0; k < 5 && ok; k++) ok = valueMap.has(hi - k === 1 ? 14 : hi - k);
      if (ok) return hi;
    }
    return 0;
  };
  const straightCards = (valueMap, hi) => [0, 1, 2, 3, 4].map(k => valueMap.get(hi - k === 1 ? 14 : hi - k)[0]);

  let flushCards = null;
  for (const arr of bySuit.values()) {
    if (arr.length >= 5) flushCards = [...arr].sort((a, b) => b.value - a.value);
  }
  if (flushCards) {
    const suitedMap = new Map(flushCards.map(c => [c.value, [c]]));
    const hi = straightHigh(suitedMap);
    if (hi) return result(hi === 14 ? HAND_RANK.ROYAL_FLUSH : HAND_RANK.STRAIGHT_FLUSH, [hi], straightCards(suitedMap, hi));
  }

  const groups = [...byValue.entries()]
    .map(([v, cs]) => ({ v, cs }))
    .sort((a, b) => b.cs.length - a.cs.length || b.v - a.v);
  const kickers = (exclude, n) => groups.map(g => g.v).filter(v => !exclude.includes(v)).sort((a, b) => b - a).slice(0, n);
  const firstOf = (vals) => vals.map(v => byValue.get(v)[0]);

  if (groups[0].cs.length === 4) {
    const ks = kickers([groups[0].v], 1);
    return result(HAND_RANK.FOUR_OF_A_KIND, [groups[0].v, ...ks], [...groups[0].cs, ...firstOf(ks)]);
  }
  if (groups[0].cs.length === 3 && groups[1] && groups[1].cs.length >= 2) {
    return result(HAND_RANK.FULL_HOUSE, [groups[0].v, groups[1].v], [...groups[0].cs, ...groups[1].cs.slice(0, 2)]);
  }
  if (flushCards) {
    const top = flushCards.slice(0, 5);
    return result(HAND_RANK.FLUSH, top.map(c => c.value), top);
  }
  const hi = straightHigh(byValue);
  if (hi) return result(HAND_RANK.STRAIGHT, [hi], straightCards(byValue, hi));
  if (groups[0].cs.length === 3) {
    const ks = kickers([groups[0].v], 2);
    return result(HAND_RANK.THREE_OF_A_KIND, [groups[0].v, ...ks], [...groups[0].cs, ...firstOf(ks)]);
  }
  if (groups[0].cs.length === 2 && groups[1] && groups[1].cs.length === 2) {
    const ks = kickers([groups[0].v, groups[1].v], 1);
    return result(HAND_RANK.TWO_PAIR, [groups[0].v, groups[1].v, ...ks], [...groups[0].cs, ...groups[1].cs, ...firstOf(ks)]);
  }
  if (groups[0].cs.length === 2) {
    const ks = kickers([groups[0].v], 3);
    return result(HAND_RANK.ONE_PAIR, [groups[0].v, ...ks], [...groups[0].cs, ...firstOf(ks)]);
  }
  const ks = kickers([], 5);
  return result(HAND_RANK.HIGH_CARD, ks, firstOf(ks));
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
    this.lastRaiseSize = 20;

    this.dealerIdx = 0;
    this.currentTurnIdx = 0;
    this.roundStage = 'PREFLOP';
    this.isRunout = false;
    this.handNumber = 0;

    this.gameOver = false;
    this.winnerMsg = '';
    this.winners = [];
    this.potResults = [];

    this.onLog = null;
    this.onUpdate = null;   // () => void — fired after every state change (including timed run-outs)
    this.aiDecider = null;  // (engine, playerIdx) => void
    this.aiDelay = 750;
    this._gameId = 0;
    this._timer = null;
    this._actionCount = 0;
  }

  log(msg, type = 'info') {
    if (this.onLog) this.onLog(msg, type);
  }

  _emit() {
    if (this.onUpdate) this.onUpdate();
  }

  destroy() {
    this._gameId++;
    clearTimeout(this._timer);
    this.onUpdate = null;
    this.onLog = null;
  }

  initMatch(playersData) {
    this.players = playersData.map((p, idx) => ({
      id: p.id || `p_${idx}`,
      name: p.name,
      chips: p.chips || 1000,
      bet: 0,
      totalBet: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      sittingOut: false,
      isAI: p.isAI || false,
      lastAction: null,
      hasActed: false,
      handEval: null,
    }));

    this.dealerIdx = 0;
    this.startNewHand();
  }

  setStakes(smallBlind, bigBlind, label = '') {
    if (this.gameOver) {
      this.smallBlind = smallBlind;
      this.bigBlind = bigBlind;
      this.nextStakes = null;
      this.log(`📢 盲注層級切換為：小盲 $${smallBlind} / 大盲 $${bigBlind} (維持目前玩家累積籌碼)`, 'system');
    } else {
      this.nextStakes = { smallBlind, bigBlind, label };
      this.log(`📢 已預約下局切換盲注層級：小盲 $${smallBlind} / 大盲 $${bigBlind}`, 'system');
    }
  }

  _nextSeat(from, predicate) {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + k) % n) + n) % n;
      if (predicate(this.players[i])) return i;
    }
    return -1;
  }

  startNewHand() {
    this._gameId++;
    clearTimeout(this._timer);
    if (this.nextStakes) {
      this.smallBlind = this.nextStakes.smallBlind;
      this.bigBlind = this.nextStakes.bigBlind;
      this.log(`📢 盲注層級已切換為：小盲 $${this.smallBlind} / 大盲 $${this.bigBlind}`, 'system');
      this.nextStakes = null;
    }

    this.deck = shuffleDeck(createDeck());
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.lastRaiseSize = this.bigBlind;
    this.roundStage = 'PREFLOP';
    this.gameOver = false;
    this.isRunout = false;
    this.winnerMsg = '';
    this.winners = [];
    this.potResults = [];
    this.handNumber++;

    this.players.forEach(p => {
      // AI Rebuy if bankrupt
      if (p.chips <= 0 && p.isAI) p.chips = Math.max(1000, this.bigBlind * 50);
      p.sittingOut = p.chips <= 0;
      p.cards = p.sittingOut ? [] : [this.deck.pop(), this.deck.pop()];
      p.bet = 0;
      p.totalBet = 0;
      p.folded = p.sittingOut;
      p.isAllIn = false;
      p.lastAction = null;
      p.hasActed = false;
      p.handEval = null;
    });

    const seated = p => !p.sittingOut;
    const activeCount = this.players.filter(seated).length;
    if (activeCount < 2) {
      this.gameOver = true;
      this.currentTurnIdx = -1;
      this.winnerMsg = '玩家籌碼不足，無法開局';
      this._emit();
      return;
    }

    this.dealerIdx = this._nextSeat(this.dealerIdx, seated);
    const sbIdx = activeCount === 2 ? this.dealerIdx : this._nextSeat(this.dealerIdx, seated);
    const bbIdx = this._nextSeat(sbIdx, seated);
    this.sbIdx = sbIdx;
    this.bbIdx = bbIdx;

    this.log(`新一局開始！小盲注 $${this.smallBlind}，大盲注 $${this.bigBlind}`, 'system');
    this.postBet(sbIdx, this.smallBlind, '小盲注');
    this.postBet(bbIdx, this.bigBlind, '大盲注');
    this.currentBet = Math.max(this.currentBet, this.bigBlind);

    this.currentTurnIdx = bbIdx;
    this._continueBetting();
    this._afterChange();
  }

  postBet(playerIdx, amount, label = '') {
    const p = this.players[playerIdx];
    const actual = Math.max(0, Math.min(p.chips, amount));
    p.chips -= actual;
    p.bet += actual;
    p.totalBet += actual;
    this.pot += actual;
    if (p.chips === 0) p.isAllIn = true;

    if (p.bet > this.currentBet) {
      this.currentBet = p.bet;
      // Re-require other active players to match new bet
      this.players.forEach(other => {
        if (other !== p && !other.folded && !other.isAllIn) other.hasActed = false;
      });
    }

    if (label) this.log(`${p.name} 下注 ${label} $${actual}`, 'action');
    return actual;
  }

  /** What the given player may do right now (used by the UI and the AI). */
  getLegalActions(playerIdx) {
    const p = this.players[playerIdx];
    const canAct = !!p && !this.gameOver && !this.isRunout && playerIdx === this.currentTurnIdx && !p.folded && !p.isAllIn;
    const toCall = p ? Math.max(0, this.currentBet - p.bet) : 0;
    const maxRaiseTo = p ? p.bet + p.chips : 0;
    const minRaiseTo = Math.min(maxRaiseTo, this.currentBet === 0 ? this.bigBlind : this.currentBet + this.lastRaiseSize);
    return {
      canAct,
      toCall,
      callAmount: p ? Math.min(toCall, p.chips) : 0,
      canCheck: canAct && toCall === 0,
      canCall: canAct && toCall > 0,
      canRaise: canAct && p.chips > toCall && maxRaiseTo > this.currentBet,
      minRaiseTo,
      maxRaiseTo,
      canAllIn: canAct && p.chips > 0,
    };
  }

  /** Returns true when the action was applied. RAISE `amount` is the total bet to raise to. */
  playerAction(action, amount = 0) {
    if (this.gameOver || this.isRunout) return false;
    const idx = this.currentTurnIdx;
    const p = this.players[idx];
    if (!p || p.folded || p.isAllIn) return false;
    const toCall = this.currentBet - p.bet;

    switch (action) {
      case 'FOLD':
        p.folded = true;
        p.lastAction = { label: '❌ 棄牌', text: '棄牌 (FOLD)', type: 'fold' };
        this.log(`${p.name} 選擇 棄牌`, 'fold');
        break;

      case 'CHECK':
        if (toCall > 0) return false;
        p.lastAction = { label: '✋ 過牌', text: '過牌 (CHECK)', type: 'check' };
        this.log(`${p.name} 選擇 過牌`, 'check');
        break;

      case 'CALL': {
        if (toCall <= 0) return this.playerAction('CHECK');
        const actualCall = this.postBet(idx, toCall);
        if (p.isAllIn) {
          p.lastAction = { label: `🔥 ALL-IN $${actualCall}`, text: `ALL-IN $${actualCall}`, type: 'allin' };
          this.log(`${p.name} 跟注全壓 ALL-IN $${actualCall}`, 'allin');
        } else {
          p.lastAction = { label: `💰 跟注 $${actualCall}`, text: `跟注 $${actualCall}`, type: 'call' };
          this.log(`${p.name} 跟注 $${actualCall}`, 'call');
        }
        break;
      }

      case 'RAISE': {
        const { minRaiseTo, maxRaiseTo } = this.getLegalActions(idx);
        const target = Math.min(maxRaiseTo, Math.max(minRaiseTo, Math.floor(amount) || 0));
        if (target <= this.currentBet) return this.playerAction('CALL');
        const raiseSize = target - this.currentBet;
        const actualRaise = this.postBet(idx, target - p.bet);
        if (raiseSize >= this.lastRaiseSize) this.lastRaiseSize = raiseSize;
        if (p.isAllIn) {
          p.lastAction = { label: `🔥 ALL-IN $${p.bet}`, text: `ALL-IN $${p.bet}`, type: 'allin' };
          this.log(`${p.name} 全壓 ALL-IN $${actualRaise}`, 'allin');
        } else {
          p.lastAction = { label: `🚀 加注到 $${p.bet}`, text: `加注到 $${p.bet}`, type: 'raise' };
          this.log(`${p.name} 加注到 $${p.bet}`, 'raise');
        }
        break;
      }

      case 'ALLIN': {
        const allInAmt = p.chips;
        if (allInAmt <= 0) return false;
        const target = p.bet + allInAmt;
        if (target - this.currentBet >= this.lastRaiseSize) this.lastRaiseSize = target - this.currentBet;
        this.postBet(idx, allInAmt);
        p.lastAction = { label: `🔥 ALL-IN $${p.bet}`, text: `ALL-IN $${p.bet}`, type: 'allin' };
        this.log(`${p.name} 全壓 ALL-IN $${allInAmt}`, 'allin');
        break;
      }

      default:
        return false;
    }

    p.hasActed = true;
    this._actionCount++;
    this._continueBetting();
    this._afterChange();
    return true;
  }

  // Backwards compatible name
  nextTurn() {
    this._continueBetting();
    this._afterChange();
  }

  _continueBetting() {
    const inHand = this.players.filter(p => !p.folded);
    if (inHand.length === 1) {
      this.awardPotToSingle(inHand[0]);
      return;
    }
    const canAct = inHand.filter(p => !p.isAllIn);
    const allMatched = inHand.every(p => p.isAllIn || (p.hasActed && p.bet === this.currentBet));
    const nobodyToBetAgainst = canAct.length === 0 || (canAct.length === 1 && canAct[0].bet >= this.currentBet);
    if (allMatched || nobodyToBetAgainst) {
      this.advanceStage();
      return;
    }
    this.currentTurnIdx = this._nextSeat(this.currentTurnIdx, p => !p.folded && !p.isAllIn);
  }

  _afterChange() {
    this._emit();
    this._scheduleAi();
  }

  _scheduleAi() {
    if (this.gameOver || this.isRunout || !this.aiDecider) return;
    clearTimeout(this._timer);
    const turn = this.currentTurnIdx;
    const p = this.players[turn];
    if (!p || !p.isAI || p.folded || p.isAllIn) return;
    const gameId = this._gameId;
    this._timer = setTimeout(() => {
      if (gameId !== this._gameId || this.currentTurnIdx !== turn || this.gameOver || this.isRunout) return;
      const before = this._actionCount;
      try {
        this.aiDecider(this, turn);
      } catch (err) {
        console.warn('[Poker AI] decision error', err);
      }
      if (this._actionCount === before) {
        this.playerAction(this.currentBet - p.bet > 0 ? 'FOLD' : 'CHECK'); // AI must always act
      }
    }, this.aiDelay);
  }

  advanceStage() {
    // Reset bets & hasActed for new street
    this.players.forEach(p => {
      p.bet = 0;
      p.hasActed = false;
      if (!p.folded && !p.isAllIn) p.lastAction = null;
    });
    this.currentBet = 0;
    this.lastRaiseSize = this.bigBlind;

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

    const canAct = this.players.filter(p => !p.folded && !p.isAllIn);
    if (canAct.length <= 1) {
      // Everyone (but at most one) is all-in: deal the remaining streets automatically
      this.isRunout = true;
      this.currentTurnIdx = -1;
      clearTimeout(this._timer);
      const gameId = this._gameId;
      this._timer = setTimeout(() => {
        if (gameId !== this._gameId) return;
        this.advanceStage();
        this._emit();
      }, 900);
      return;
    }

    this.isRunout = false;
    this.currentTurnIdx = this._nextSeat(this.dealerIdx, p => !p.folded && !p.isAllIn);
  }

  showdown() {
    clearTimeout(this._timer);
    this.gameOver = true;
    this.isRunout = false;
    this.currentTurnIdx = -1;
    const contenders = this.players.filter(p => !p.folded);
    contenders.forEach(p => { p.handEval = evaluate7Cards([...p.cards, ...this.communityCards]); });

    // Build main pot + side pots from each player's total contribution this hand
    const levels = [...new Set(this.players.map(p => p.totalBet).filter(v => v > 0))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const lvl of levels) {
      const amount = this.players.reduce((s, p) => s + Math.max(0, Math.min(p.totalBet, lvl) - prev), 0);
      let eligible = contenders.filter(p => p.totalBet >= lvl);
      prev = lvl;
      if (!amount) continue;
      if (!eligible.length) {
        if (pots.length) { pots[pots.length - 1].amount += amount; continue; }
        eligible = contenders;
      }
      const last = pots[pots.length - 1];
      if (last && last.eligible.length === eligible.length && last.eligible.every(p => eligible.includes(p))) last.amount += amount;
      else pots.push({ amount, eligible });
    }

    const winnings = new Map();
    this.potResults = pots.map((pot, i) => {
      const best = Math.max(...pot.eligible.map(p => p.handEval.totalScore));
      const potWinners = pot.eligible.filter(p => p.handEval.totalScore === best);
      const share = Math.floor(pot.amount / potWinners.length);
      let remainder = pot.amount - share * potWinners.length;
      potWinners.forEach(w => {
        const amt = share + (remainder > 0 ? 1 : 0);
        remainder--;
        w.chips += amt;
        winnings.set(w, (winnings.get(w) || 0) + amt);
      });
      return { label: i === 0 ? '主池' : `邊池 ${i}`, amount: pot.amount, winners: potWinners.map(w => w.name), handName: potWinners[0].handEval.name };
    });

    this.winners = [...winnings.keys()].map(p => this.players.indexOf(p));
    this.winnerMsg = this.potResults
      .map(r => `${r.winners.join(', ')} 以 ${r.handName} 贏得${this.potResults.length > 1 ? r.label : '籌碼'} $${r.amount}`)
      .join('；');
    this.log(`攤牌結算：${this.winnerMsg}`, 'win');
  }

  awardPotToSingle(winner) {
    clearTimeout(this._timer);
    this.gameOver = true;
    this.isRunout = false;
    this.currentTurnIdx = -1;
    winner.chips += this.pot;
    this.winners = [this.players.indexOf(winner)];
    this.potResults = [{ label: '主池', amount: this.pot, winners: [winner.name], handName: null }];
    this.winnerMsg = `${winner.name} 獲勝！對手全數棄牌，贏得籌碼 $${this.pot}`;
    this.log(this.winnerMsg, 'win');
  }
}
