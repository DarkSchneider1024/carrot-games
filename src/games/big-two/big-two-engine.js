/**
 * Taiwan Big Two (大老二 / 13 Cards) Game Engine
 *
 * Rules:
 * Card Ranks: 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3
 * Suit Ranks: Spades (♠) > Hearts (♥) > Diamonds (♦) > Clubs (♣)
 * Starting Player: Player with Clubs 3 (♣3) — the opening play must contain ♣3
 * Straights (Taiwan): 2-3-4-5-6 > A-2-3-4-5 > 10-J-Q-K-A > … > 3-4-5-6-7
 *                     (J-Q-K-A-2, Q-K-A-2-3, K-A-2-3-4 are NOT straights)
 * 5-card tiers: Straight Flush > Four of a Kind > Full House > Flush > Straight
 *
 * Supported Modes:
 * 1. FIRST_OUT_WINS: Game ends immediately when 1st player empties hand.
 * 2. PLAY_ALL_OUT: Game continues until 1st, 2nd, 3rd, and 4th place ranks are determined.
 *
 * Industry Standard Payout (FIRST_OUT_WINS):
 * - Base Penalty = Remaining Cards * 100 Chips
 * - 10-12 Cards Left: Penalty x 2
 * - 13 Cards Left (Unmoved/Beaten Whole Hand): Penalty x 3
 * - Holding Deuces (2s): Each '2' in remaining hand doubles penalty (x2)
 * PLAY_ALL_OUT: 1st +300 / 2nd +100 / 3rd -100 / 4th -300
 */

export const SUITS = ['C', 'D', 'H', 'S']; // ♣ Clubs, ♦ Diamonds, ♥ Hearts, ♠ Spades
export const SUIT_NAMES = { 'C': '♣', 'D': '♦', 'H': '♥', 'S': '♠' };

export const NUM_VALS = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15
};

export const HAND_TYPES = {
  INVALID: 0,
  SINGLE: 1,
  PAIR: 2,
  TRIPLE: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8
};

export const HAND_TYPE_NAMES = {
  1: '單張', 2: '對子', 3: '三條', 4: '順子', 5: '同花', 6: '葫蘆', 7: '鐵支', 8: '同花順'
};

const OPENING_CARD_ID = '3_C';
const ALL_OUT_PAYOUT = [300, 100, -100, -300];

const byRank = (a, b) => a.numVal - b.numVal || a.suitVal - b.suitVal;

function compareCombos(a, b) {
  if (a.type !== b.type) return a.type - b.type;
  if (a.keyVal !== b.keyVal) return a.keyVal - b.keyVal;
  return a.keySuitVal - b.keySuitVal;
}

function combinations(arr, k) {
  const result = [];
  const idx = Array.from({ length: k }, (_, i) => i);
  if (k > arr.length) return result;
  while (true) {
    result.push(idx.map(i => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === arr.length - k + i) i--;
    if (i < 0) return result;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

/** Taiwan straight rank for 5 unique ascending numVals, or null if not a straight. */
function straightRank(vals) {
  const key = vals.join(',');
  if (key === '3,4,5,6,15') return { rank: 16, topVal: 15 };  // 2-3-4-5-6 (largest)
  if (key === '3,4,5,14,15') return { rank: 15, topVal: 15 }; // A-2-3-4-5
  if (vals[4] - vals[0] === 4 && vals[4] <= 14) return { rank: vals[4], topVal: vals[4] };
  return null;
}

export class BigTwoEngine {
  constructor() {
    this.mode = 'FIRST_OUT_WINS'; // 'FIRST_OUT_WINS' or 'PLAY_ALL_OUT'
    this.players = [];
    this.deck = [];
    this.currentTurn = 0;
    this.lastCombo = null; // { playerIdx, type, cards, keyVal, keySuitVal }
    this.consecutivePasses = 0;
    this.gamePhase = 'PLAY'; // 'PLAY', 'GAME_OVER'
    this.rankings = []; // Finished player indexes in order
    this.settlement = null;
    this.isFirstPlay = true;
    this.lastActions = [null, null, null, null];
    this.aiDelay = 750;
    this.onUpdate = null; // (event) => void — UI subscribes here instead of polling
    this._gameId = 0;
    this._aiTimer = null;
    this._planCache = new Map();
  }

  initGame(mode = 'FIRST_OUT_WINS') {
    this._gameId++;
    clearTimeout(this._aiTimer);
    this.mode = mode;
    this.gamePhase = 'PLAY';
    this.consecutivePasses = 0;
    this.lastCombo = null;
    this.rankings = [];
    this.settlement = null;
    this.isFirstPlay = true;
    this.lastActions = [null, null, null, null];
    this._passedThisRound = new Set();
    this._playedIds = new Set();
    this._planCache.clear();

    this._generateDeck();
    this._shuffleDeck();

    this.players = [
      { id: 'p1', name: '玩家 (你)', isHuman: true, hand: [], isFinished: false, rank: 0 },
      { id: 'p2', name: '東區皮卡', isHuman: false, hand: [], isFinished: false, rank: 0 },
      { id: 'p3', name: '北極吉伊', isHuman: false, hand: [], isFinished: false, rank: 0 },
      { id: 'p4', name: '西城飛鼠', isHuman: false, hand: [], isFinished: false, rank: 0 }
    ];

    // Deal 13 cards to each player
    for (let i = 0; i < 4; i++) {
      this.players[i].hand = this.deck.slice(i * 13, (i + 1) * 13);
      this._sortHand(this.players[i].hand);
    }

    // Find starting player with ♣3
    this.currentTurn = this.players.findIndex(p => p.hand.some(c => c.id === OPENING_CARD_ID));

    this._emit({ type: 'init' });
    this._scheduleAi();
  }

  /** Stop pending AI timers (call when leaving the page). */
  destroy() {
    this._gameId++;
    clearTimeout(this._aiTimer);
    this.onUpdate = null;
  }

  _emit(event) {
    if (this.onUpdate) this.onUpdate(event);
  }

  _generateDeck() {
    this.deck = [];
    const valList = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    valList.forEach(val => {
      SUITS.forEach(suit => {
        this.deck.push({
          id: `${val}_${suit}`,
          val,
          suit,
          numVal: NUM_VALS[val],
          suitVal: SUITS.indexOf(suit)
        });
      });
    });
    this._fullDeck = [...this.deck];
  }

  _shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  _sortHand(hand) {
    hand.sort(byRank);
  }

  /**
   * Evaluate played cards combination (order of `cards` does not matter)
   */
  evaluateHandCombo(cards) {
    if (!cards || cards.length === 0) return { type: HAND_TYPES.INVALID };
    const sorted = [...cards].sort(byRank);
    const len = sorted.length;
    const top = sorted[len - 1];
    const make = (type, keyVal, keySuitVal) => ({ type, cards: sorted, keyVal, keySuitVal });
    const sameVal = sorted.every(c => c.numVal === sorted[0].numVal);

    if (len === 1) return make(HAND_TYPES.SINGLE, top.numVal, top.suitVal);
    if (len === 2 && sameVal) return make(HAND_TYPES.PAIR, top.numVal, top.suitVal);
    if (len === 3 && sameVal) return make(HAND_TYPES.TRIPLE, top.numVal, top.suitVal);
    if (len !== 5) return { type: HAND_TYPES.INVALID };

    const counts = {};
    sorted.forEach(c => counts[c.numVal] = (counts[c.numVal] || 0) + 1);
    const uniqueVals = Object.keys(counts).map(Number).sort((a, b) => a - b);

    if (uniqueVals.length === 2) {
      const [a, b] = uniqueVals;
      if (counts[a] === 4 || counts[b] === 4) return make(HAND_TYPES.FOUR_OF_A_KIND, counts[a] === 4 ? a : b, 3);
      return make(HAND_TYPES.FULL_HOUSE, counts[a] === 3 ? a : b, 3);
    }

    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    const straight = uniqueVals.length === 5 ? straightRank(uniqueVals) : null;
    if (straight) {
      const keyCard = sorted.find(c => c.numVal === straight.topVal);
      return make(isFlush ? HAND_TYPES.STRAIGHT_FLUSH : HAND_TYPES.STRAIGHT, straight.rank, keyCard.suitVal);
    }
    if (isFlush) return make(HAND_TYPES.FLUSH, top.numVal, top.suitVal);
    return { type: HAND_TYPES.INVALID };
  }

  /** Pure comparison against the table (includes the ♣3 opening rule). */
  canBeat(playCombo) {
    if (!playCombo || playCombo.type === HAND_TYPES.INVALID) return false;
    if (this.isFirstPlay && !playCombo.cards.some(c => c.id === OPENING_CARD_ID)) return false;
    if (!this.lastCombo) return true; // Free play

    // Must match card count; 5-card hands can beat lower 5-card tiers
    if (playCombo.cards.length !== this.lastCombo.cards.length) return false;
    if (playCombo.type !== this.lastCombo.type) {
      return playCombo.cards.length === 5 && playCombo.type > this.lastCombo.type;
    }
    return compareCombos(playCombo, this.lastCombo) > 0;
  }

  /** Explains why a play is illegal (for UI toasts). Returns null when legal. */
  getPlayError(playerIdx, cards) {
    if (this.gamePhase !== 'PLAY') return '本局已結束';
    if (this.currentTurn !== playerIdx) return '尚未輪到您的回合！';
    const p = this.players[playerIdx];
    if (!cards?.length || !cards.every(c => p.hand.some(h => h.id === c.id))) return '請先選取要打出的牌！';
    const combo = this.evaluateHandCombo(cards);
    if (combo.type === HAND_TYPES.INVALID) return '牌型不合法（可出：單張、對子、三條、順子、同花、葫蘆、鐵支、同花順）';
    if (this.isFirstPlay && !cards.some(c => c.id === OPENING_CARD_ID)) return '首輪出牌必須包含梅花 3 (♣3)！';
    if (this.lastCombo && cards.length !== this.lastCombo.cards.length) return `必須出相同張數（${this.lastCombo.cards.length} 張）！`;
    if (!this.canBeat(combo)) return `壓不過桌上的${HAND_TYPE_NAMES[this.lastCombo.type]}！`;
    return null;
  }

  playCards(playerIdx, cards) {
    if (this.getPlayError(playerIdx, cards)) return { success: false, reason: this.getPlayError(playerIdx, cards) };
    const p = this.players[playerIdx];
    const combo = this.evaluateHandCombo(cards);

    // Remove played cards from hand
    const ids = new Set(cards.map(c => c.id));
    p.hand = p.hand.filter(h => !ids.has(h.id));
    ids.forEach(id => this._playedIds.add(id));

    this.lastCombo = { playerIdx, ...combo };
    this.consecutivePasses = 0;
    this._passedThisRound.clear();
    this.isFirstPlay = false;
    this.lastActions = this.lastActions.map((a, i) => (i === playerIdx ? { type: 'play', comboType: combo.type } : null));

    // Check Player Finish
    if (p.hand.length === 0) {
      p.isFinished = true;
      p.rank = this.rankings.length + 1;
      this.rankings.push(playerIdx);

      if (this.mode === 'FIRST_OUT_WINS' || this.rankings.length === 3) {
        if (this.mode === 'PLAY_ALL_OUT') {
          const lastIdx = this.players.findIndex(pl => !pl.isFinished);
          this.players[lastIdx].rank = 4;
          this.rankings.push(lastIdx);
        }
        this._endGame();
        this._emit({ type: 'play', playerIdx, combo });
        this._emit({ type: 'gameOver' });
        return { success: true, finished: true };
      }
    }

    this._advanceTurn();
    this._emit({ type: 'play', playerIdx, combo });
    return { success: true, finished: p.isFinished };
  }

  passTurn(playerIdx) {
    if (this.gamePhase !== 'PLAY' || this.currentTurn !== playerIdx) return false;
    if (!this.lastCombo || this.lastCombo.playerIdx === playerIdx) return false;

    this.consecutivePasses++;
    this._passedThisRound.add(playerIdx);
    this.lastActions[playerIdx] = { type: 'pass' };

    const owner = this.lastCombo.playerIdx;
    const mustRespond = this.players
      .map((pl, i) => i)
      .filter(i => i !== owner && !this.players[i].isFinished);

    if (mustRespond.every(i => this._passedThisRound.has(i))) {
      // Everyone passed — the owner leads again (or the next active player if the owner went out)
      this.lastCombo = null;
      this.consecutivePasses = 0;
      this._passedThisRound.clear();
      this.lastActions = [null, null, null, null];
      this.currentTurn = this.players[owner].isFinished ? this._nextActive(owner) : owner;
      this._scheduleAi();
      this._emit({ type: 'pass', playerIdx });
      this._emit({ type: 'roundReset', playerIdx: this.currentTurn });
      return true;
    }

    this._advanceTurn();
    this._emit({ type: 'pass', playerIdx });
    return true;
  }

  _nextActive(fromIdx) {
    let idx = fromIdx;
    for (let i = 0; i < 4; i++) {
      idx = (idx + 1) % 4;
      if (!this.players[idx].isFinished) return idx;
    }
    return fromIdx;
  }

  _advanceTurn() {
    this.currentTurn = this._nextActive(this.currentTurn);
    this._scheduleAi();
  }

  _scheduleAi() {
    clearTimeout(this._aiTimer);
    if (this.gamePhase !== 'PLAY' || this.players[this.currentTurn].isHuman) return;
    const gameId = this._gameId;
    this._aiTimer = setTimeout(() => {
      if (gameId === this._gameId) this.processAiTurn();
    }, this.aiDelay);
  }

  processAiTurn() {
    if (this.gamePhase !== 'PLAY') return;
    const idx = this.currentTurn;
    const ai = this.players[idx];
    if (ai.isHuman || ai.isFinished) return;

    const move = this.chooseAiMove(idx);
    if (move && this.playCards(idx, move).success) return;
    if (this.lastCombo && this.passTurn(idx)) return;
    // Safety net: must lead something legal
    const fallback = this.isFirstPlay ? ai.hand.filter(c => c.id === OPENING_CARD_ID) : [ai.hand[0]];
    this.playCards(idx, fallback);
  }

  /* ─────────────────────────── 🤖 Smart AI ─────────────────────────── */

  /**
   * Picks the cards an AI (or a hint for the human) should play, or null to pass.
   * Strategy: split the hand into the cheapest set of combos (fewest turns, fewest weak singles),
   * lead weak combos first, keep "boss" controls for later, and block players close to going out.
   */
  chooseAiMove(idx) {
    const hand = this.players[idx].hand;
    if (!hand.length) return null;
    const opponents = this.players.filter((p, i) => i !== idx && !p.isFinished);
    const minOpp = opponents.length ? Math.min(...opponents.map(p => p.hand.length)) : 13;
    const nextCount = this.players[this._nextActive(idx)].hand.length;
    return this.lastCombo
      ? this._chooseFollow(idx, hand, minOpp)
      : this._chooseLead(idx, hand, minOpp, nextCount);
  }

  _chooseLead(idx, hand, minOpp, nextCount) {
    const whole = this.evaluateHandCombo(hand);
    if (this.canBeat(whole)) return whole.cards;

    const plan = this._planHand(hand).combos;
    let candidates = plan;
    if (this.isFirstPlay) {
      candidates = plan.filter(c => c.cards.some(x => x.id === OPENING_CARD_ID));
      if (!candidates.length) candidates = [this.evaluateHandCombo(hand.filter(c => c.id === OPENING_CARD_ID))];
    } else if (plan.length === 2) {
      // Lead the unbeatable combo first, then go out with the other
      const boss = plan.find(c => this._isBoss(c, idx));
      if (boss) return boss.cards;
    }

    const scored = candidates.map(c => {
      const size = c.cards.length;
      let s = c.keyVal - (size === 5 ? 6 : size === 3 ? 3 : size === 2 ? 2 : 0);
      if (this._isBoss(c, idx)) s += 12;      // keep controls for regaining the lead
      if (size === 1 && nextCount === 1) s += 40; // never feed a single to a player on one card
      else if (size === 1 && minOpp === 1) s += 15;
      if (size === 2 && minOpp === 2) s += 12;
      return { c, s };
    }).sort((a, b) => a.s - b.s);

    let pick = scored[0].c;
    if (!this.isFirstPlay && pick.cards.length === 1 && nextCount === 1) {
      // Only singles left and the next player is on one card: lead the highest single to block
      pick = this.evaluateHandCombo([hand[hand.length - 1]]);
    }
    return pick.cards;
  }

  _chooseFollow(idx, hand, minOpp) {
    const need = this.lastCombo.cards.length;
    const candidates = this._allCombos(hand, need).filter(c => this.canBeat(c));
    if (!candidates.length) return null;

    const finisher = candidates.find(c => c.cards.length === hand.length);
    if (finisher) return finisher.cards;

    const danger = minOpp <= (need === 1 ? 2 : need === 2 ? 3 : 5);
    const base = this._planHand(hand).cost;
    let best = null;

    for (const c of candidates) {
      const ids = new Set(c.cards.map(x => x.id));
      const rest = hand.filter(x => !ids.has(x.id));
      const restPlan = this._planHand(rest);
      // ≈0 when the play is a combo the plan wanted to shed anyway; positive when it breaks structure
      let score = restPlan.cost - base + 10;
      if (!danger && this._isBoss(c, idx)) score += (rest.length / 13) * 8;
      if (restPlan.combos.length === 1) score -= 15; // sets up going out next lead
      if (danger) score -= c.keyVal * 0.4;          // block with high cards when someone is about to go out
      if (!best || score < best.score) best = { c, score };
    }

    const passThreshold = danger ? Infinity : hand.length <= 4 ? 14 : 7;
    return best.score > passThreshold ? null : best.c.cards;
  }

  /** Is this combo unbeatable given the cards this player cannot see? */
  _isBoss(combo, idx) {
    const size = combo.cards.length;
    if (size === 5) return combo.type === HAND_TYPES.STRAIGHT_FLUSH || (combo.type === HAND_TYPES.FOUR_OF_A_KIND && combo.keyVal >= 13);
    const own = new Set(this.players[idx].hand.map(c => c.id));
    const unseen = this._fullDeck.filter(c => !own.has(c.id) && !this._playedIds.has(c.id));
    if (size === 1) return !unseen.some(c => c.numVal > combo.keyVal || (c.numVal === combo.keyVal && c.suitVal > combo.keySuitVal));
    const groups = {};
    unseen.forEach(c => (groups[c.numVal] = groups[c.numVal] || []).push(c));
    return !Object.values(groups).some(g => {
      if (g.length < size) return false;
      const topSuit = Math.max(...g.map(c => c.suitVal));
      return g[0].numVal > combo.keyVal || (g[0].numVal === combo.keyVal && topSuit > combo.keySuitVal);
    });
  }

  /** All legal combos of a given size, weakest first. */
  _allCombos(hand, size) {
    let combos = [];
    if (size === 1) {
      combos = hand.map(c => this.evaluateHandCombo([c]));
    } else if (size === 2 || size === 3) {
      const groups = {};
      hand.forEach(c => (groups[c.numVal] = groups[c.numVal] || []).push(c));
      Object.values(groups).forEach(g => {
        if (g.length >= size) combinations(g, size).forEach(cs => combos.push(this.evaluateHandCombo(cs)));
      });
    } else if (size === 5 && hand.length >= 5) {
      combos = combinations(hand, 5).map(cs => this.evaluateHandCombo(cs)).filter(c => c.type !== HAND_TYPES.INVALID);
    }
    return combos.sort(compareCombos);
  }

  /** Kept for compatibility (hint / QA tooling): card arrays of a given size, weakest first. */
  _getPossibleCombos(hand, length) {
    return this._allCombos(hand, length).map(c => c.cards);
  }

  /** Split a hand into combos minimising turns-to-finish and weak leftovers. Memoised per hand. */
  _planHand(hand) {
    const key = hand.map(c => c.id).sort().join('|');
    const cached = this._planCache.get(key);
    if (cached) return cached;

    let best = null;
    const consider = (usedIds, chosen) => {
      const groups = {};
      hand.forEach(c => { if (!usedIds.has(c.id)) (groups[c.numVal] = groups[c.numVal] || []).push(c); });
      const combos = [...chosen];
      Object.values(groups).forEach(g => {
        if (g.length === 4) combos.push(this.evaluateHandCombo(g.slice(0, 2)), this.evaluateHandCombo(g.slice(2)));
        else combos.push(this.evaluateHandCombo(g));
      });
      const cost = this._planCost(combos);
      if (!best || cost < best.cost) best = { combos, cost };
    };

    consider(new Set(), []);
    if (hand.length >= 5) {
      const fives = this._allCombos(hand, 5)
        .map(c => ({ c, ids: new Set(c.cards.map(x => x.id)) }))
        .sort((a, b) => a.c.cards.reduce((s, x) => s + x.numVal, 0) - b.c.cards.reduce((s, x) => s + x.numVal, 0));
      const pairable = fives.slice(0, 80);
      fives.forEach(f => consider(f.ids, [f.c]));
      for (let i = 0; i < pairable.length; i++) {
        for (let j = i + 1; j < pairable.length; j++) {
          const a = pairable[i], b = pairable[j];
          if ([...a.ids].some(id => b.ids.has(id))) continue;
          consider(new Set([...a.ids, ...b.ids]), [a.c, b.c]);
        }
      }
    }

    if (this._planCache.size > 4000) this._planCache.clear();
    this._planCache.set(key, best);
    return best;
  }

  _planCost(combos) {
    let cost = 0;
    for (const c of combos) {
      const size = c.cards.length;
      cost += 10;
      if (size === 1) cost += Math.max(0, 13 - c.keyVal) * 0.9;      // low singles are hard to shed
      else if (size <= 3) cost += Math.max(0, 12 - c.keyVal) * 0.35;
      if (c.keyVal >= 15 || (size === 5 && c.type >= HAND_TYPES.FULL_HOUSE)) cost -= 4; // controls
    }
    return cost;
  }

  /**
   * 🏆 業界標準大老二結算 (Industry Standard Big Two Chips Settlement)
   */
  _endGame() {
    this.gamePhase = 'GAME_OVER';
    clearTimeout(this._aiTimer);
    const winnerIdx = this.rankings[0];

    if (this.mode === 'PLAY_ALL_OUT') {
      const playerDetails = this.rankings.map((pIdx, place) => ({
        idx: pIdx,
        name: this.players[pIdx].name,
        place: place + 1,
        cardCount: this.players[pIdx].hand.length,
        delta: ALL_OUT_PAYOUT[place]
      }));
      this.settlement = {
        mode: this.mode,
        winnerIdx,
        winnerName: this.players[winnerIdx].name,
        totalGained: ALL_OUT_PAYOUT[0],
        humanDelta: playerDetails.find(d => d.idx === 0).delta,
        playerDetails
      };
      return;
    }

    let totalGained = 0;
    const playerDetails = [];
    this.players.forEach((p, idx) => {
      if (idx === winnerIdx) return;
      const cardCount = p.hand.length;
      let multiplier = 1;

      // 10-12 Cards Double, 13 Cards Triple Penalty
      if (cardCount === 13) multiplier = 3;
      else if (cardCount >= 10) multiplier = 2;

      // Each '2' doubles penalty
      const deucesCount = p.hand.filter(c => c.val === '2').length;
      if (deucesCount > 0) multiplier *= Math.pow(2, deucesCount);

      const penalty = cardCount * 100 * multiplier;
      totalGained += penalty;
      playerDetails.push({ idx, name: p.name, cardCount, multiplier, penalty, delta: -penalty });
    });

    this.settlement = {
      mode: this.mode,
      winnerIdx,
      winnerName: this.players[winnerIdx].name,
      totalGained,
      humanDelta: winnerIdx === 0 ? totalGained : -(playerDetails.find(d => d.idx === 0)?.penalty || 0),
      playerDetails
    };
  }

  getState() {
    return {
      mode: this.mode,
      gamePhase: this.gamePhase,
      currentTurn: this.currentTurn,
      lastCombo: this.lastCombo,
      consecutivePasses: this.consecutivePasses,
      isFirstPlay: this.isFirstPlay,
      rankings: [...this.rankings],
      lastActions: [...this.lastActions],
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        cardCount: p.hand.length,
        hand: p.isHuman ? [...p.hand] : [],
        isFinished: p.isFinished,
        rank: p.rank
      })),
      settlement: this.settlement
    };
  }
}
