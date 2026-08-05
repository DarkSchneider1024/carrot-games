/**
 * Taiwan Big Two (大老二 / 13 Cards) Game Engine
 *
 * Rules:
 * Card Ranks: 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3
 * Suit Ranks: Spades (♠) > Hearts (♥) > Diamonds (♦) > Clubs (♣)
 * Starting Player: Player with Clubs 3 (♣3)
 *
 * Supported Modes:
 * 1. FIRST_OUT_WINS: Game ends immediately when 1st player empties hand.
 * 2. PLAY_ALL_OUT: Game continues until 1st, 2nd, 3rd, and 4th place ranks are determined.
 *
 * Industry Standard Payout:
 * - Base Penalty = Remaining Cards * 100 Chips
 * - 10-12 Cards Left: Penalty x 2
 * - 13 Cards Left (Unmoved/Beaten Whole Hand): Penalty x 3
 * - Holding Deuces (2s): Each '2' in remaining hand doubles penalty (x2)
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

export class BigTwoEngine {
  constructor() {
    this.mode = 'FIRST_OUT_WINS'; // 'FIRST_OUT_WINS' or 'PLAY_ALL_OUT'
    this.players = [];
    this.deck = [];
    this.currentTurn = 0;
    this.lastCombo = null; // { playerIdx, handType, cards, keyVal, keySuitVal }
    this.consecutivePasses = 0;
    this.gamePhase = 'PLAY'; // 'PLAY', 'GAME_OVER'
    this.rankings = []; // Finished players in order [playerIdx]
    this.settlement = null;
  }

  initGame(mode = 'FIRST_OUT_WINS') {
    this.mode = mode;
    this.gamePhase = 'PLAY';
    this.consecutivePasses = 0;
    this.lastCombo = null;
    this.rankings = [];
    this.settlement = null;

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
    for (let i = 0; i < 4; i++) {
      if (this.players[i].hand.some(c => c.val === '3' && c.suit === 'C')) {
        this.currentTurn = i;
        break;
      }
    }

    // If initial player is AI, automatically start AI turn
    if (!this.players[this.currentTurn].isHuman && this.gamePhase === 'PLAY') {
      setTimeout(() => this.processAiTurn(), 800);
    }
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
  }

  _shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  _sortHand(hand) {
    hand.sort((a, b) => {
      if (a.numVal !== b.numVal) return a.numVal - b.numVal;
      return a.suitVal - b.suitVal;
    });
  }

  /**
   * Evaluate played cards combination
   */
  evaluateHandCombo(cards) {
    if (!cards || cards.length === 0) return { type: HAND_TYPES.INVALID };
    const len = cards.length;

    // 1. Single
    if (len === 1) {
      return {
        type: HAND_TYPES.SINGLE,
        cards,
        keyVal: cards[0].numVal,
        keySuitVal: cards[0].suitVal
      };
    }

    // 2. Pair
    if (len === 2 && cards[0].numVal === cards[1].numVal) {
      const highestCard = cards[0].suitVal > cards[1].suitVal ? cards[0] : cards[1];
      return {
        type: HAND_TYPES.PAIR,
        cards,
        keyVal: cards[0].numVal,
        keySuitVal: highestCard.suitVal
      };
    }

    // 3. Triple
    if (len === 3 && cards[0].numVal === cards[1].numVal && cards[1].numVal === cards[2].numVal) {
      return {
        type: HAND_TYPES.TRIPLE,
        cards,
        keyVal: cards[0].numVal,
        keySuitVal: 3
      };
    }

    // 5-Card Combinations
    if (len === 5) {
      const counts = {};
      cards.forEach(c => counts[c.numVal] = (counts[c.numVal] || 0) + 1);
      const uniqueVals = Object.keys(counts).map(Number).sort((a, b) => a - b);

      // Four of a Kind (鐵支)
      if (uniqueVals.length === 2 && (counts[uniqueVals[0]] === 4 || counts[uniqueVals[1]] === 4)) {
        const fourVal = counts[uniqueVals[0]] === 4 ? uniqueVals[0] : uniqueVals[1];
        return { type: HAND_TYPES.FOUR_OF_A_KIND, cards, keyVal: fourVal, keySuitVal: 3 };
      }

      // Full House (葫蘆)
      if (uniqueVals.length === 2 && (counts[uniqueVals[0]] === 3 || counts[uniqueVals[1]] === 3)) {
        const tripleVal = counts[uniqueVals[0]] === 3 ? uniqueVals[0] : uniqueVals[1];
        return { type: HAND_TYPES.FULL_HOUSE, cards, keyVal: tripleVal, keySuitVal: 3 };
      }

      // Straight (順子)
      let isStraight = false;
      if (uniqueVals.length === 5 && (uniqueVals[4] - uniqueVals[0] === 4)) {
        isStraight = true;
      }
      // Special Straight A-2-3-4-5
      if (uniqueVals.length === 5 && uniqueVals.join(',') === '3,4,5,14,15') {
        isStraight = true;
      }

      const isFlush = cards.every(c => c.suit === cards[0].suit);

      if (isStraight && isFlush) {
        return { type: HAND_TYPES.STRAIGHT_FLUSH, cards, keyVal: cards[4].numVal, keySuitVal: cards[4].suitVal };
      }
      if (isFlush) {
        return { type: HAND_TYPES.FLUSH, cards, keyVal: cards[4].numVal, keySuitVal: cards[4].suitVal };
      }
      if (isStraight) {
        return { type: HAND_TYPES.STRAIGHT, cards, keyVal: cards[4].numVal, keySuitVal: cards[4].suitVal };
      }
    }

    return { type: HAND_TYPES.INVALID };
  }

  canBeat(playCombo) {
    if (playCombo.type === HAND_TYPES.INVALID) return false;
    if (!this.lastCombo) return true; // Free play

    // Must match card count and type (or 5-card tier beating)
    if (playCombo.cards.length !== this.lastCombo.cards.length) return false;

    if (playCombo.type !== this.lastCombo.type) {
      if (playCombo.cards.length === 5) {
        return playCombo.type > this.lastCombo.type;
      }
      return false;
    }

    if (playCombo.keyVal !== this.lastCombo.keyVal) {
      return playCombo.keyVal > this.lastCombo.keyVal;
    }
    return playCombo.keySuitVal > this.lastCombo.keySuitVal;
  }

  playCards(playerIdx, cards) {
    const p = this.players[playerIdx];
    const combo = this.evaluateHandCombo(cards);

    if (!this.canBeat(combo)) return false;

    // Remove played cards from hand
    cards.forEach(c => {
      const idx = p.hand.findIndex(h => h.id === c.id);
      if (idx !== -1) p.hand.splice(idx, 1);
    });

    this.lastCombo = { playerIdx, ...combo };
    this.consecutivePasses = 0;

    // Check Player Finish
    if (p.hand.length === 0) {
      p.isFinished = true;
      this.rankings.push(playerIdx);
      p.rank = this.rankings.length;

      if (this.mode === 'FIRST_OUT_WINS' || this.rankings.length === 3) {
        this._endGame();
        return { success: true, finished: true };
      }
    }

    this._advanceTurn();
    return { success: true, finished: p.isFinished };
  }

  passTurn(playerIdx) {
    if (!this.lastCombo || this.lastCombo.playerIdx === playerIdx) return false;

    this.consecutivePasses++;
    const activeRemaining = this.players.filter(p => !p.isFinished).length;

    if (this.consecutivePasses >= activeRemaining - 1) {
      // Round resets, last player gets free turn!
      this.lastCombo = null;
      this.consecutivePasses = 0;
    }

    this._advanceTurn();
    return true;
  }

  _advanceTurn() {
    do {
      this.currentTurn = (this.currentTurn + 1) % 4;
    } while (this.players[this.currentTurn].isFinished && this.gamePhase === 'PLAY');

    // Auto AI turn processing
    if (!this.players[this.currentTurn].isHuman && this.gamePhase === 'PLAY') {
      setTimeout(() => this.processAiTurn(), 700);
    }
  }

  processAiTurn() {
    if (this.gamePhase !== 'PLAY') return;
    const ai = this.players[this.currentTurn];

    // Simple Smart AI Card Choice
    if (!this.lastCombo) {
      // Free play: Lead smallest single card
      this.playCards(this.currentTurn, [ai.hand[0]]);
      return;
    }

    // Try finding single or pair that beats lastCombo
    let played = false;
    if (this.lastCombo.type === HAND_TYPES.SINGLE) {
      for (let c of ai.hand) {
        const combo = this.evaluateHandCombo([c]);
        if (this.canBeat(combo)) {
          this.playCards(this.currentTurn, [c]);
          played = true;
          break;
        }
      }
    }

    if (!played) {
      this.passTurn(this.currentTurn);
    }
  }

  /**
   * 🏆 業界標準大老二結算 (Industry Standard Big Two Chips Settlement)
   */
  _endGame() {
    this.gamePhase = 'GAME_OVER';
    const winnerIdx = this.rankings[0];
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
      if (deucesCount > 0) {
        multiplier *= Math.pow(2, deucesCount);
      }

      const penalty = cardCount * 100 * multiplier;
      totalGained += penalty;

      playerDetails.push({
        name: p.name,
        cardCount,
        multiplier,
        penalty
      });
    });

    this.settlement = {
      winnerIdx,
      winnerName: this.players[winnerIdx].name,
      totalGained,
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
      rankings: [...this.rankings],
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        cardCount: p.hand.length,
        hand: p.isHuman ? [...p.hand] : [...p.hand],
        isFinished: p.isFinished,
        rank: p.rank
      })),
      settlement: this.settlement
    };
  }
}
