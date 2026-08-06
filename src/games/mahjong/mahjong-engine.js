/**
 * Taiwan Mahjong 16-Tile Engine — Complete Rule Set & Smart AI
 *
 * Support 144 Tiles (136 Standard Tiles + 8 Flower Tiles)
 * Rules: 16-Tile Hand Size, Chow/Pong/Kong, Ting Hint, & Fan/Tai Calculation
 */

export const TILE_TYPES = {
  WAN: 'M',   // 萬子 1M - 9M
  TONG: 'T',  // 筒子 1T - 9T
  TIAO: 'S',  // 條子 1S - 9S
  WINDS: 'W', // 風牌: E(東), S(南), W(西), N(北)
  DRAGONS: 'D',// 三元牌: C(中), F(發), P(白)
  FLOWERS: 'F' // 花牌: H1-H8
};

export const TILE_NAMES = {
  '1M': '一萬', '2M': '二萬', '3M': '三萬', '4M': '四萬', '5M': '五萬', '6M': '六萬', '7M': '七萬', '8M': '八萬', '9M': '九萬',
  '1T': '一筒', '2T': '二筒', '3T': '三筒', '4T': '四筒', '5T': '五筒', '6T': '六筒', '7T': '七筒', '8T': '八筒', '9T': '九筒',
  '1S': '一條', '2S': '二條', '3S': '三條', '4S': '四條', '5S': '五條', '6S': '六條', '7S': '七條', '8S': '八條', '9S': '九條',
  'E': '東風', 'S': '南風', 'W': '西風', 'N': '北風',
  'C': '紅中', 'F': '發財', 'P': '白板',
  'H1': '春', 'H2': '夏', 'H3': '秋', 'H4': '冬',
  'H5': '梅', 'H6': '蘭', 'H7': '竹', 'H8': '菊'
};

export const TILE_UNICODE = {
  '1M': '🀈', '2M': '🀉', '3M': '🀊', '4M': '🀋', '5M': '🀌', '6M': '🀍', '7M': '🀎', '8M': '🀏', '9M': '🀐',
  '1T': '🀙', '2T': '🀚', '3T': '🀛', '4T': '🀜', '5T': '🀝', '6T': '🀞', '7T': '🀟', '8T': '🀠', '9T': '🀡',
  '1S': '🀐', '2S': '🀑', '3S': '🀒', '4S': '🀓', '5S': '🀔', '6S': '🀕', '7S': '🀖', '8S': '🀗', '9S': '🀘',
  'E': '🀀', 'S': '🀁', 'W': '🀂', 'N': '🀃',
  'C': '🀄', 'F': '🀅', 'P': '🀆',
  'H1': '🀦', 'H2': '🀧', 'H3': '🀨', 'H4': '🀩',
  'H5': '🀪', 'H6': '🀫', 'H7': '🀬', 'H8': '🀭'
};

export class MahjongEngine {
  constructor() {
    this.wall = [];
    this.players = [];
    this.currentTurn = 0; // 0: P1 (Human), 1: P2 (Right AI), 2: P3 (Top AI), 3: P4 (Left AI)
    this.dealer = 0;
    this.consecutiveDealer = 0;
    this.discards = [[], [], [], []];
    this.lastDiscard = null; // { playerIdx, tile }
    this.phase = 'PLAY'; // 'PLAY', 'CLAIM', 'GAME_OVER'
    this.winningResult = null;
    this.windCircle = 'E'; // 東風圈
  }

  initGame(dealerIdx = 0, consecutiveDealer = 0) {
    this.dealer = dealerIdx;
    this.consecutiveDealer = consecutiveDealer;
    this.currentTurn = dealerIdx;
    this.discards = [[], [], [], []];
    this.lastDiscard = null;
    this.phase = 'PLAY';
    this.winningResult = null;
    this.pendingClaims = [];

    this.wall = this._generateFullWall();
    this._shuffleWall();

    this.players = [
      { id: 'p1', name: '玩家 (你)', isHuman: true, hand: [], melds: [], flowers: [], score: 100 },
      { id: 'p2', name: '東區小八', isHuman: false, hand: [], melds: [], flowers: [], score: 100 },
      { id: 'p3', name: '北極兔皇', isHuman: false, hand: [], melds: [], flowers: [], score: 100 },
      { id: 'p4', name: '西城飛鼠', isHuman: false, hand: [], melds: [], flowers: [], score: 100 }
    ];

    // Deal 16 tiles to each player (Dealer gets 17)
    for (let i = 0; i < 4; i++) {
      const pIdx = (dealerIdx + i) % 4;
      const count = pIdx === dealerIdx ? 17 : 16;
      for (let c = 0; c < count; c++) {
        this._drawTileForPlayer(pIdx, false);
      }
      this._sortPlayerHand(pIdx);
    }
  }

  _generateFullWall() {
    const wall = [];
    const suits = ['M', 'T', 'S'];
    suits.forEach(suit => {
      for (let num = 1; num <= 9; num++) {
        const tile = num + suit;
        for (let i = 0; i < 4; i++) wall.push(tile);
      }
    });

    ['E', 'S', 'W', 'N', 'C', 'F', 'P'].forEach(honor => {
      for (let i = 0; i < 4; i++) wall.push(honor);
    });

    ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'].forEach(flower => {
      wall.push(flower);
    });

    return wall;
  }

  _shuffleWall() {
    for (let i = this.wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
    }
  }

  _drawTileForPlayer(playerIdx, checkFlower = true) {
    if (this.wall.length === 0) return null;
    let tile = this.wall.pop();

    // Auto Flower replacement (自動補花)
    while (tile && tile.startsWith('H')) {
      this.players[playerIdx].flowers.push(tile);
      if (this.wall.length > 0) {
        tile = this.wall.pop();
      } else {
        tile = null;
      }
    }

    if (tile) {
      this.players[playerIdx].hand.push(tile);
    }
    return tile;
  }

  _sortPlayerHand(playerIdx) {
    const p = this.players[playerIdx];
    const order = { 'M': 1, 'T': 2, 'S': 3, 'W': 4, 'D': 5 };
    const honorOrder = { 'E': 1, 'S': 2, 'W': 3, 'N': 4, 'C': 5, 'F': 6, 'P': 7 };

    p.hand.sort((a, b) => {
      const typeA = a.length === 1 ? (['C','F','P'].includes(a) ? 'D' : 'W') : a[1];
      const typeB = b.length === 1 ? (['C','F','P'].includes(b) ? 'D' : 'W') : b[1];

      if (order[typeA] !== order[typeB]) return order[typeA] - order[typeB];
      if (typeA === 'W' || typeA === 'D') return honorOrder[a] - honorOrder[b];
      return parseInt(a[0]) - parseInt(b[0]);
    });
  }

  /**
   * Player Discards a Tile
   */
  discardTile(playerIdx, tile) {
    const p = this.players[playerIdx];
    const idx = p.hand.indexOf(tile);
    if (idx === -1) return false;

    p.hand.splice(idx, 1);
    this._sortPlayerHand(playerIdx);

    this.discards[playerIdx].push(tile);
    this.lastDiscard = { playerIdx, tile };

    // Check if other players can Claim (Pong, Kong, Chow, Win)
    const claims = this._checkPossibleClaims(playerIdx, tile);
    if (claims.length > 0) {
      this.phase = 'CLAIM';
      this.pendingClaims = claims;

      // 如果人類(0) 也在 Claims 裡，等待人類決定。
      // 若人類不在 Claims 裡，直接讓 AI 自動決定。
      if (!claims.some(c => c.playerIdx === 0)) {
        setTimeout(() => this.processAiClaims(), 800);
      }
      return { claims };
    }

    this._nextTurn();
    return { claims: [] };
  }

  processAiClaims() {
    if (this.phase !== 'CLAIM' || !this.pendingClaims) return;
    
    // 簡單的 AI Claim 邏輯：有胡必胡，有碰/吃則 60% 機率執行，其餘 Pass
    const winClaim = this.pendingClaims.find(c => c.type === 'WIN');
    if (winClaim) {
      this._triggerWin(winClaim.playerIdx, false);
      return;
    }

    const pongClaim = this.pendingClaims.find(c => c.type === 'PONG');
    if (pongClaim && Math.random() > 0.4) {
      this.executePong(pongClaim.playerIdx);
      this.pendingClaims = [];
      setTimeout(() => this.processAiTurn(), 800);
      return;
    }

    const chowClaim = this.pendingClaims.find(c => c.type === 'CHOW');
    if (chowClaim && Math.random() > 0.5) {
      this.executeChow(chowClaim.playerIdx, chowClaim.chows[0]);
      this.pendingClaims = [];
      setTimeout(() => this.processAiTurn(), 800);
      return;
    }

    // AI 全都選擇 Pass
    this.pendingClaims = [];
    this._nextTurn();
  }

  executeHumanClaim() {
    if (this.phase !== 'CLAIM' || !this.pendingClaims) return false;
    const myClaim = this.pendingClaims.find(c => c.playerIdx === 0);
    if (!myClaim) return false;

    if (myClaim.type === 'WIN') {
      this._triggerWin(0, false);
    } else if (myClaim.type === 'PONG' || myClaim.type === 'KONG') {
      this.executePong(0);
    } else if (myClaim.type === 'CHOW') {
      this.executeChow(0, myClaim.chows[0]);
    }
    this.pendingClaims = [];
    return true;
  }

  passHumanClaim() {
    if (this.phase !== 'CLAIM') return false;
    // 如果人類 Pass，讓 AI 有機會判斷
    this.pendingClaims = this.pendingClaims.filter(c => c.playerIdx !== 0);
    if (this.pendingClaims.length > 0) {
      this.processAiClaims();
    } else {
      this.pendingClaims = [];
      this._nextTurn();
    }
    return true;
  }

  _nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % 4;
    this.phase = 'PLAY';
    const drawn = this._drawTileForPlayer(this.currentTurn);
    this._sortPlayerHand(this.currentTurn);

    // AI Turn Auto Decision
    if (!this.players[this.currentTurn].isHuman) {
      setTimeout(() => this.processAiTurn(), 600);
    }
  }

  processAiTurn() {
    if (this.phase !== 'PLAY') return;
    const ai = this.players[this.currentTurn];

    // Check Self Win (自摸)
    if (this.checkWin(ai.hand, ai.melds)) {
      this._triggerWin(this.currentTurn, true);
      return;
    }

    // AI Discard Logic (優先打單張字牌或不連貫牌)
    let discardChoice = ai.hand[ai.hand.length - 1];
    for (let t of ai.hand) {
      if (t.length === 1 && ai.hand.filter(x => x === t).length === 1) {
        discardChoice = t;
        break;
      }
    }

    this.discardTile(this.currentTurn, discardChoice);
  }

  _checkPossibleClaims(discardPlayerIdx, tile) {
    const claims = [];
    for (let i = 0; i < 4; i++) {
      if (i === discardPlayerIdx) continue;
      const p = this.players[i];

      // 1. Check Win by Discard (胡牌)
      const testHand = [...p.hand, tile];
      if (this.checkWin(testHand, p.melds)) {
        claims.push({ playerIdx: i, type: 'WIN', tile });
      }

      // 2. Check Pong (碰) & Kong (明槓)
      const count = p.hand.filter(t => t === tile).length;
      if (count >= 2) claims.push({ playerIdx: i, type: 'PONG', tile });
      if (count === 3) claims.push({ playerIdx: i, type: 'KONG', tile });

      // 3. Check Chow (吃 - 下家限定)
      if ((discardPlayerIdx + 1) % 4 === i && tile.length === 2) {
        const suit = tile[1];
        const num = parseInt(tile[0]);
        const chows = [];
        if (p.hand.includes((num - 2) + suit) && p.hand.includes((num - 1) + suit)) {
          chows.push([(num - 2) + suit, (num - 1) + suit, tile]);
        }
        if (p.hand.includes((num - 1) + suit) && p.hand.includes((num + 1) + suit)) {
          chows.push([(num - 1) + suit, tile, (num + 1) + suit]);
        }
        if (p.hand.includes((num + 1) + suit) && p.hand.includes((num + 2) + suit)) {
          chows.push([tile, (num + 1) + suit, (num + 2) + suit]);
        }
        if (chows.length > 0) {
          claims.push({ playerIdx: i, type: 'CHOW', chows, tile });
        }
      }
    }
    return claims;
  }

  executePong(playerIdx) {
    const tile = this.lastDiscard.tile;
    const p = this.players[playerIdx];
    p.hand.splice(p.hand.indexOf(tile), 1);
    p.hand.splice(p.hand.indexOf(tile), 1);
    p.melds.push({ type: 'PONG', tiles: [tile, tile, tile] });

    this.currentTurn = playerIdx;
    this.phase = 'PLAY';
    this.lastDiscard = null;
  }

  executeChow(playerIdx, chowCombo) {
    const p = this.players[playerIdx];
    const targetTile = this.lastDiscard.tile;

    chowCombo.forEach(t => {
      if (t !== targetTile) {
        p.hand.splice(p.hand.indexOf(t), 1);
      }
    });

    p.melds.push({ type: 'CHOW', tiles: chowCombo });
    this.currentTurn = playerIdx;
    this.phase = 'PLAY';
    this.lastDiscard = null;
  }

  /**
   * 🀄 聽牌提示演算法 (Ting Hint Calculator)
   * 算出現階段打出哪張牌後手牌能聽哪幾張牌
   */
  getTingHints(playerIdx = 0) {
    const p = this.players[playerIdx];
    if (p.hand.length % 3 !== 2) return []; // 須為 17 張牌 (摸牌後)

    const hints = [];
    const uniqueTiles = Array.from(new Set(p.hand));

    for (const discardTile of uniqueTiles) {
      const handCopy = [...p.hand];
      handCopy.splice(handCopy.indexOf(discardTile), 1);

      const waitingTiles = [];
      const allPossibleTiles = [
        '1M','2M','3M','4M','5M','6M','7M','8M','9M',
        '1T','2T','3T','4T','5T','6T','7T','8T','9T',
        '1S','2S','3S','4S','5S','6S','7S','8S','9S',
        'E','S','W','N','C','F','P'
      ];

      for (const testTile of allPossibleTiles) {
        if (this.checkWin([...handCopy, testTile], p.melds)) {
          // Calculate remaining unseen tiles in wall/discards
          let countSeen = 0;
          p.hand.forEach(t => { if (t === testTile) countSeen++; });
          this.discards.forEach(dList => dList.forEach(t => { if (t === testTile) countSeen++; }));
          const remaining = Math.max(0, 4 - countSeen);
          waitingTiles.push({ tile: testTile, remaining });
        }
      }

      if (waitingTiles.length > 0) {
        hints.push({ discardTile, waitingTiles });
      }
    }
    return hints;
  }

  /**
   * 🀄 台灣 16 張麻將胡牌判定 (5面子 + 1眼睛 = 17張)
   */
  checkWin(hand, melds = []) {
    if ((hand.length + melds.length * 3) !== 17) return false;

    const counts = {};
    hand.forEach(t => counts[t] = (counts[t] || 0) + 1);

    // Try finding an Eye (對子)
    const uniqueTiles = Object.keys(counts);
    for (const eyeTile of uniqueTiles) {
      if (counts[eyeTile] >= 2) {
        counts[eyeTile] -= 2;
        if (this._canFormMelds(counts)) return true;
        counts[eyeTile] += 2;
      }
    }
    return false;
  }

  _canFormMelds(counts) {
    const tileKeys = Object.keys(counts).filter(k => counts[k] > 0);
    if (tileKeys.length === 0) return true;

    const firstTile = tileKeys[0];

    // 1. Try PONG / KONG (刻子)
    if (counts[firstTile] >= 3) {
      counts[firstTile] -= 3;
      if (this._canFormMelds(counts)) return true;
      counts[firstTile] += 3;
    }

    // 2. Try CHOW (順子)
    if (firstTile.length === 2) {
      const num = parseInt(firstTile[0]);
      const suit = firstTile[1];
      const t2 = (num + 1) + suit;
      const t3 = (num + 2) + suit;

      if (num <= 7 && counts[t2] > 0 && counts[t3] > 0) {
        counts[firstTile]--; counts[t2]--; counts[t3]--;
        if (this._canFormMelds(counts)) return true;
        counts[firstTile]++; counts[t2]++; counts[t3]++;
      }
    }

    return false;
  }

  _triggerWin(winnerIdx, isSelfDraw = false) {
    this.phase = 'GAME_OVER';
    const winner = this.players[winnerIdx];
    const fanResult = this.calculateTaiwanTai(winnerIdx, isSelfDraw);

    this.winningResult = {
      winnerIdx,
      winnerName: winner.name,
      isSelfDraw,
      taiDetails: fanResult.details,
      totalTai: fanResult.totalTai,
      scoreGained: fanResult.totalTai * 10
    };
  }

  /**
   * 🇹🇼 台灣 16 張麻將經典台數計算 (Taiwan Tai Fan Rating)
   */
  calculateTaiwanTai(playerIdx, isSelfDraw = false) {
    const p = this.players[playerIdx];
    const details = [];
    let totalTai = 0;

    if (isSelfDraw) { details.push({ name: '自摸', tai: 1 }); totalTai += 1; }
    if (p.melds.length === 0) { details.push({ name: '門清', tai: 1 }); totalTai += 1; }
    if (playerIdx === this.dealer) {
      const dealerTai = 1 + this.consecutiveDealer * 2;
      details.push({ name: `莊家 (連${this.consecutiveDealer})`, tai: dealerTai });
      totalTai += dealerTai;
    }

    // 花牌台數
    if (p.flowers.length > 0) {
      details.push({ name: `花牌 (${p.flowers.length}張)`, tai: p.flowers.length });
      totalTai += p.flowers.length;
    }

    // 三元牌 (中、發、白)
    ['C', 'F', 'P'].forEach(h => {
      if (p.hand.filter(t => t === h).length >= 3 || p.melds.some(m => m.tiles.includes(h))) {
        details.push({ name: TILE_NAMES[h], tai: 1 });
        totalTai += 1;
      }
    });

    // 圈風牌與門風牌
    if (p.hand.filter(t => t === 'E').length >= 3) {
      details.push({ name: '東風台', tai: 1 });
      totalTai += 1;
    }

    if (totalTai === 0) {
      details.push({ name: '平胡', tai: 2 });
      totalTai = 2;
    }

    return { details, totalTai };
  }

  getState() {
    return {
      wallRemaining: this.wall.length,
      currentTurn: this.currentTurn,
      dealer: this.dealer,
      consecutiveDealer: this.consecutiveDealer,
      phase: this.phase,
      lastDiscard: this.lastDiscard,
      pendingClaims: this.pendingClaims,
      discards: this.discards.map(d => [...d]),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        handCount: p.hand.length,
        hand: p.isHuman ? [...p.hand] : [...p.hand], // Reveal for UI
        melds: [...p.melds],
        flowers: [...p.flowers],
        score: p.score
      })),
      winningResult: this.winningResult
    };
  }
}
