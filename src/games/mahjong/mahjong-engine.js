/**
 * Taiwan Mahjong 16-Tile Engine — Complete Rule Set & Smart AI
 *
 * Support 144 Tiles (136 Standard Tiles + 8 Flower Tiles)
 * Rules: 16-Tile Hand Size, Chow/Pong/Kong (exposed, concealed, added), 16-tile dead wall (流局),
 *        claim priority (胡 > 碰/槓 > 吃), Ting Hint, & Taiwan Tai Calculation
 * AI: shanten + effective-tile (ukeire) discard selection, shanten-aware claims, defensive mode
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

// Unicode Mahjong Tiles block (U+1F000–U+1F02B)
export const TILE_UNICODE = {
  '1M': '🀇', '2M': '🀈', '3M': '🀉', '4M': '🀊', '5M': '🀋', '6M': '🀌', '7M': '🀍', '8M': '🀎', '9M': '🀏',
  '1T': '🀙', '2T': '🀚', '3T': '🀛', '4T': '🀜', '5T': '🀝', '6T': '🀞', '7T': '🀟', '8T': '🀠', '9T': '🀡',
  '1S': '🀐', '2S': '🀑', '3S': '🀒', '4S': '🀓', '5S': '🀔', '6S': '🀕', '7S': '🀖', '8S': '🀗', '9S': '🀘',
  'E': '🀀', 'S': '🀁', 'W': '🀂', 'N': '🀃',
  'C': '🀄', 'F': '🀅', 'P': '🀆',
  'H1': '🀦', 'H2': '🀧', 'H3': '🀨', 'H4': '🀩',
  'H5': '🀢', 'H6': '🀣', 'H7': '🀤', 'H8': '🀥'
};

export const ALL_TILES = [
  '1M', '2M', '3M', '4M', '5M', '6M', '7M', '8M', '9M',
  '1T', '2T', '3T', '4T', '5T', '6T', '7T', '8T', '9T',
  '1S', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S',
  'E', 'S', 'W', 'N', 'C', 'F', 'P'
];
const TILE_INDEX = Object.fromEntries(ALL_TILES.map((t, i) => [t, i]));

export const DEAD_WALL = 16;      // 台灣麻將保留 16 張不摸，摸到剩 16 張即流局
export const BASE_POINTS = 30;     // 底
export const POINTS_PER_TAI = 10;  // 每台
const WIND_TILES = ['E', 'S', 'W', 'N'];
const SEAT_WIND_NAMES = ['東', '南', '西', '北'];
const DRAGONS = ['C', 'F', 'P'];
const CLAIM_PRIORITY = { WIN: 4, KONG: 3, PONG: 2, CHOW: 1 };

function toCounts(tiles) {
  const c = new Array(34).fill(0);
  tiles.forEach(t => { const i = TILE_INDEX[t]; if (i !== undefined) c[i]++; });
  return c;
}

const shantenCache = new Map();

/**
 * Shanten for a Taiwan 16-tile hand: tiles needed to reach ready (0) — -1 means complete.
 * Needs (5 - meldCount) sets + 1 pair from the concealed tiles. `counts` is restored on return.
 */
export function calcShanten(counts, meldCount) {
  const key = counts.join('') + meldCount;
  const cached = shantenCache.get(key);
  if (cached !== undefined) return cached;

  const m = 5 - meldCount;
  const c = counts;
  let best = 2 * m;
  const dfs = (i, sets, partials, pair) => {
    if (best === -1) return;
    while (i < 34 && c[i] === 0) i++;
    if (i === 34) {
      const s = 2 * m - 2 * sets - Math.min(partials, m - sets) - pair;
      if (s < best) best = s;
      return;
    }
    const suited = i < 27;
    const pos = i % 9;
    if (c[i] >= 3) { c[i] -= 3; dfs(i, sets + 1, partials, pair); c[i] += 3; }
    if (suited && pos <= 6 && c[i + 1] && c[i + 2]) {
      c[i]--; c[i + 1]--; c[i + 2]--;
      dfs(i, sets + 1, partials, pair);
      c[i]++; c[i + 1]++; c[i + 2]++;
    }
    if (c[i] >= 2) {
      if (!pair) { c[i] -= 2; dfs(i, sets, partials, 1); c[i] += 2; }
      if (sets + partials < m) { c[i] -= 2; dfs(i, sets, partials + 1, pair); c[i] += 2; }
    }
    if (suited && sets + partials < m) {
      if (pos <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; dfs(i, sets, partials + 1, pair); c[i]++; c[i + 1]++; }
      if (pos <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; dfs(i, sets, partials + 1, pair); c[i]++; c[i + 2]++; }
    }
    c[i]--; dfs(i + 1, sets, partials, pair); c[i]++;
  };
  dfs(0, 0, 0, 0);

  if (shantenCache.size > 200000) shantenCache.clear();
  shantenCache.set(key, best);
  return best;
}

export class MahjongEngine {
  constructor() {
    this.wall = [];
    this.players = [];
    this.currentTurn = 0; // 0: P1 (Human), 1: P2 (Right AI), 2: P3 (Top AI), 3: P4 (Left AI)
    this.dealer = 0;
    this.consecutiveDealer = 0;
    this.discards = [[], [], [], []];
    this.lastDiscard = null; // { playerIdx, tile }
    this.lastDrawn = null;
    this.kongReplacement = false;
    this.phase = 'PLAY'; // 'PLAY', 'CLAIM', 'GAME_OVER'
    this.winningResult = null;
    this.windCircle = 'E'; // 東風圈
    this.pendingClaims = []; // claims offered to the human right now: [{ playerIdx, type, tiles }]
    this.awaiting = null;    // { playerIdx, options }
    this.aiDelay = 650;
    this.onUpdate = null;    // (event) => void
    this._claimQueue = [];
    this._gameId = 0;
    this._aiTimer = null;
  }

  initGame(dealerIdx = 0, consecutiveDealer = 0, { resetScores = false } = {}) {
    this._gameId++;
    clearTimeout(this._aiTimer);
    const prevScores = !resetScores && this.players.length ? this.players.map(p => p.score) : null;

    this.dealer = dealerIdx;
    this.consecutiveDealer = consecutiveDealer;
    this.currentTurn = dealerIdx;
    this.discards = [[], [], [], []];
    this.lastDiscard = null;
    this.lastDrawn = null;
    this.kongReplacement = false;
    this.phase = 'PLAY';
    this.winningResult = null;
    this.pendingClaims = [];
    this.awaiting = null;
    this._claimQueue = [];

    this.wall = this._generateFullWall();
    this._shuffleWall();

    const names = ['玩家 (你)', '東區小八', '北極兔皇', '西城飛鼠'];
    this.players = names.map((name, i) => ({
      id: `p${i + 1}`, name, isHuman: i === 0, hand: [], melds: [], flowers: [],
      score: prevScores ? prevScores[i] : 1000
    }));

    // Deal 16 tiles to each player (Dealer gets 17)
    for (let i = 0; i < 4; i++) {
      const pIdx = (dealerIdx + i) % 4;
      const count = pIdx === dealerIdx ? 17 : 16;
      for (let c = 0; c < count; c++) this._drawTileForPlayer(pIdx, { replacement: true });
      this._sortPlayerHand(pIdx);
    }

    this._emit({ type: 'init' });
    this._scheduleAi();
  }

  /** Rotate the dealer (連莊 when the dealer wins or the hand is drawn) and deal again. */
  startNextHand() {
    const r = this.winningResult;
    const dealerStays = !r || r.isDraw || r.winnerIdx === this.dealer;
    this.initGame(
      dealerStays ? this.dealer : (this.dealer + 1) % 4,
      dealerStays && r ? this.consecutiveDealer + 1 : 0
    );
  }

  destroy() {
    this._gameId++;
    clearTimeout(this._aiTimer);
    this.onUpdate = null;
  }

  _emit(event) {
    if (this.onUpdate) this.onUpdate(event);
  }

  _generateFullWall() {
    const wall = [];
    ALL_TILES.forEach(tile => { for (let i = 0; i < 4; i++) wall.push(tile); });
    ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'].forEach(flower => wall.push(flower));
    return wall;
  }

  _shuffleWall() {
    for (let i = this.wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
    }
  }

  /** Draw with automatic flower replacement (補花 from the back of the wall). Returns null when the wall is exhausted. */
  _drawTileForPlayer(playerIdx, { replacement = false } = {}) {
    if (!replacement && this.wall.length <= DEAD_WALL) return null;
    if (this.wall.length === 0) return null;
    let tile = replacement ? this.wall.shift() : this.wall.pop();

    while (tile && tile.startsWith('H')) {
      this.players[playerIdx].flowers.push(tile);
      tile = this.wall.length > 0 ? this.wall.shift() : null;
    }

    if (tile) this.players[playerIdx].hand.push(tile);
    return tile;
  }

  _sortPlayerHand(playerIdx) {
    this.players[playerIdx].hand.sort((a, b) => TILE_INDEX[a] - TILE_INDEX[b]);
  }

  _scheduleAi() {
    clearTimeout(this._aiTimer);
    if (this.phase !== 'PLAY' || this.players[this.currentTurn].isHuman) return;
    const gameId = this._gameId;
    this._aiTimer = setTimeout(() => {
      if (gameId === this._gameId) this.processAiTurn();
    }, this.aiDelay);
  }

  /**
   * Player Discards a Tile
   */
  discardTile(playerIdx, tile) {
    if (this.phase !== 'PLAY' || this.currentTurn !== playerIdx) return false;
    const p = this.players[playerIdx];
    if (p.hand.length % 3 !== 2) return false;
    const idx = p.hand.indexOf(tile);
    if (idx === -1) return false;

    p.hand.splice(idx, 1);
    this._sortPlayerHand(playerIdx);
    this.discards[playerIdx].push(tile);
    this.lastDiscard = { playerIdx, tile };
    this.lastDrawn = null;
    this.kongReplacement = false;
    this._emit({ type: 'discard', playerIdx, tile });

    this._claimQueue = this._collectClaims(playerIdx, tile);
    const claims = this._claimQueue.flatMap(e => e.options.map(o => ({ playerIdx: e.playerIdx, ...o, tile })));
    if (!this._claimQueue.length) {
      this._nextTurn();
      return { claims };
    }
    this.phase = 'CLAIM';
    this._resolveClaims();
    return { claims };
  }

  /** Claim queue ordered by priority (胡 > 碰/槓 > 吃), then by seat order after the discarder. */
  _collectClaims(from, tile) {
    const queue = [];
    const order = [1, 2, 3].map(k => (from + k) % 4);
    order.forEach(i => {
      const p = this.players[i];
      if (this.checkWin([...p.hand, tile], p.melds)) queue.push({ playerIdx: i, priority: 3, options: [{ type: 'WIN' }] });
    });
    if (this.wall.length > DEAD_WALL) {
      order.forEach(i => {
        const count = this.players[i].hand.filter(t => t === tile).length;
        const options = [];
        if (count >= 2) options.push({ type: 'PONG' });
        if (count === 3) options.push({ type: 'KONG' });
        if (options.length) queue.push({ playerIdx: i, priority: 2, options });
      });
      const next = order[0];
      if (tile.length === 2) {
        const hand = this.players[next].hand;
        const suit = tile[1];
        const num = parseInt(tile[0], 10);
        const has = n => n >= 1 && n <= 9 && hand.includes(n + suit);
        const chows = [];
        if (has(num - 2) && has(num - 1)) chows.push([(num - 2) + suit, (num - 1) + suit, tile]);
        if (has(num - 1) && has(num + 1)) chows.push([(num - 1) + suit, tile, (num + 1) + suit]);
        if (has(num + 1) && has(num + 2)) chows.push([tile, (num + 1) + suit, (num + 2) + suit]);
        if (chows.length) queue.push({ playerIdx: next, priority: 1, options: chows.map(tiles => ({ type: 'CHOW', tiles })) });
      }
    }
    return queue;
  }

  _resolveClaims() {
    while (this._claimQueue.length) {
      const entry = this._claimQueue.shift();
      const idx = entry.playerIdx;
      const options = [entry, ...this._claimQueue.filter(e => e.playerIdx === idx)].flatMap(e => e.options);
      this._claimQueue = this._claimQueue.filter(e => e.playerIdx !== idx);

      if (this.players[idx].isHuman) {
        this.phase = 'CLAIM';
        this.awaiting = { playerIdx: idx, options };
        this.pendingClaims = options.map(o => ({ playerIdx: idx, ...o, tile: this.lastDiscard.tile }));
        this._emit({ type: 'claimPrompt', playerIdx: idx, options });
        return;
      }

      const choice = this._aiChooseClaim(idx, options);
      if (choice) {
        this._executeClaim(idx, choice);
        return;
      }
    }
    this._nextTurn();
  }

  /** Human takes a claim. `choice` = option index or type; defaults to the best option. */
  executeHumanClaim(choice) {
    if (this.phase !== 'CLAIM' || !this.awaiting || this.awaiting.playerIdx !== 0) return false;
    const opts = this.awaiting.options;
    const pick = typeof choice === 'number'
      ? opts[choice]
      : choice
        ? opts.find(o => o.type === choice)
        : [...opts].sort((a, b) => CLAIM_PRIORITY[b.type] - CLAIM_PRIORITY[a.type])[0];
    if (!pick) return false;
    this._executeClaim(0, pick);
    return true;
  }

  passHumanClaim() {
    if (this.phase !== 'CLAIM' || !this.awaiting) return false;
    this.awaiting = null;
    this.pendingClaims = [];
    this._resolveClaims();
    return true;
  }

  // Backwards compatible alias
  processAiClaims() {
    if (this.phase === 'CLAIM' && !this.awaiting) this._resolveClaims();
  }

  _executeClaim(idx, opt) {
    const tile = this.lastDiscard.tile;
    const from = this.lastDiscard.playerIdx;
    const p = this.players[idx];
    this._claimQueue = [];
    this.pendingClaims = [];
    this.awaiting = null;

    if (opt.type === 'WIN') {
      this._triggerWin(idx, false);
      return;
    }

    this.discards[from].pop();
    const removeFromHand = (t, n) => { for (let k = 0; k < n; k++) p.hand.splice(p.hand.indexOf(t), 1); };
    if (opt.type === 'PONG') {
      removeFromHand(tile, 2);
      p.melds.push({ type: 'PONG', tiles: [tile, tile, tile], from });
    } else if (opt.type === 'KONG') {
      removeFromHand(tile, 3);
      p.melds.push({ type: 'KONG', tiles: [tile, tile, tile, tile], from });
    } else if (opt.type === 'CHOW') {
      let skipped = false;
      opt.tiles.forEach(t => {
        if (t === tile && !skipped) { skipped = true; return; }
        removeFromHand(t, 1);
      });
      p.melds.push({ type: 'CHOW', tiles: [...opt.tiles], from });
    }

    this.currentTurn = idx;
    this.phase = 'PLAY';
    this.lastDiscard = null;
    this._emit({ type: 'claim', playerIdx: idx, claim: opt.type, tile });

    if (opt.type === 'KONG') {
      const drawn = this._drawTileForPlayer(idx, { replacement: true });
      if (!drawn) { this._drawGame(); return; }
      this.lastDrawn = drawn;
      this.kongReplacement = true;
    }
    this._sortPlayerHand(idx);
    this._emit({ type: 'turn', playerIdx: idx });
    this._scheduleAi();
  }

  _nextTurn() {
    this.phase = 'PLAY';
    this.pendingClaims = [];
    this.awaiting = null;
    this._claimQueue = [];
    this.currentTurn = (this.currentTurn + 1) % 4;

    const drawn = this._drawTileForPlayer(this.currentTurn);
    if (!drawn) {
      this._drawGame();
      return;
    }
    this.lastDrawn = drawn;
    this.kongReplacement = false;
    this._sortPlayerHand(this.currentTurn);
    this._emit({ type: 'draw', playerIdx: this.currentTurn });
    this._scheduleAi();
  }

  processAiTurn() {
    if (this.phase !== 'PLAY') return;
    const idx = this.currentTurn;
    const ai = this.players[idx];
    if (ai.isHuman || ai.hand.length % 3 !== 2) return;

    // Check Self Win (自摸)
    if (this.canSelfDrawWin(idx)) {
      this._triggerWin(idx, true);
      return;
    }

    const kong = this._aiChooseSelfKong(idx);
    if (kong) {
      this.declareSelfKong(idx, kong);
      return;
    }

    this.discardTile(idx, this.suggestDiscard(idx));
  }

  /* ─────────────────────────── Self-draw actions ─────────────────────────── */

  canSelfDrawWin(playerIdx) {
    const p = this.players[playerIdx];
    return this.phase === 'PLAY' && this.currentTurn === playerIdx && p.hand.length % 3 === 2 && this.checkWin(p.hand, p.melds);
  }

  declareSelfDrawWin(playerIdx) {
    if (!this.canSelfDrawWin(playerIdx)) return false;
    this._triggerWin(playerIdx, true);
    return true;
  }

  /** 暗槓 (four in hand) and 加槓 (pong + fourth tile) available on the player's own turn. */
  getSelfKongOptions(playerIdx) {
    const p = this.players[playerIdx];
    if (!p || this.phase !== 'PLAY' || this.currentTurn !== playerIdx || p.hand.length % 3 !== 2 || this.wall.length === 0) return [];
    const opts = [];
    [...new Set(p.hand)].forEach(t => {
      if (p.hand.filter(x => x === t).length === 4) opts.push({ type: 'ANKONG', tile: t });
      if (p.melds.some(m => m.type === 'PONG' && m.tiles[0] === t)) opts.push({ type: 'ADDKONG', tile: t });
    });
    return opts;
  }

  declareSelfKong(playerIdx, opt) {
    const valid = this.getSelfKongOptions(playerIdx).find(o => o.type === opt?.type && o.tile === opt?.tile);
    if (!valid) return false;
    const p = this.players[playerIdx];
    const t = valid.tile;
    if (valid.type === 'ANKONG') {
      p.hand = p.hand.filter(x => x !== t);
      p.melds.push({ type: 'ANKONG', tiles: [t, t, t, t] });
    } else {
      p.hand.splice(p.hand.indexOf(t), 1);
      const meld = p.melds.find(m => m.type === 'PONG' && m.tiles[0] === t);
      meld.type = 'KONG';
      meld.tiles.push(t);
    }
    this._emit({ type: 'claim', playerIdx, claim: 'KONG', tile: t });

    const drawn = this._drawTileForPlayer(playerIdx, { replacement: true });
    if (!drawn) { this._drawGame(); return true; }
    this.lastDrawn = drawn;
    this.kongReplacement = true;
    this._sortPlayerHand(playerIdx);
    this._emit({ type: 'draw', playerIdx });
    this._scheduleAi();
    return true;
  }

  /* ─────────────────────────── 🤖 Smart AI ─────────────────────────── */

  _visibleCounts(playerIdx) {
    const c = toCounts(this.players[playerIdx].hand);
    this.discards.forEach(d => d.forEach(t => c[TILE_INDEX[t]]++));
    this.players.forEach(p => p.melds.forEach(m => m.tiles.forEach(t => c[TILE_INDEX[t]]++)));
    return c;
  }

  _isValueTile(tile, playerIdx) {
    const seat = (playerIdx - this.dealer + 4) % 4;
    return DRAGONS.includes(tile) || tile === this.windCircle || tile === WIND_TILES[seat];
  }

  _bestDiscardShanten(counts, meldCount) {
    let best = Infinity;
    for (let i = 0; i < 34; i++) {
      if (!counts[i]) continue;
      counts[i]--;
      best = Math.min(best, calcShanten(counts, meldCount));
      counts[i]++;
    }
    return best;
  }

  /** How likely opponents are to be ready — switches the AI into defence. */
  _dangerLevel(playerIdx) {
    let danger = 0;
    this.players.forEach((p, i) => {
      if (i === playerIdx) return;
      if (p.melds.length >= 3) danger = Math.max(danger, 1);
      else if (p.melds.length === 2) danger = Math.max(danger, 0.5);
    });
    if (this.wall.length - DEAD_WALL < 20) danger += 0.3;
    return danger;
  }

  /**
   * Best discard for a player (used by the AI and the human hint):
   * minimise shanten → maximise effective tiles left (ukeire) → shed isolated honors/terminals,
   * and prefer already-discarded (safe) tiles when opponents look ready.
   */
  suggestDiscard(playerIdx = 0) {
    const p = this.players[playerIdx];
    if (!p.hand.length) return null;
    const mc = p.melds.length;
    const counts = toCounts(p.hand);
    const visible = this._visibleCounts(playerIdx);
    const danger = this._dangerLevel(playerIdx);
    const safe = new Set();
    this.discards.forEach((d, i) => { if (i !== playerIdx) d.forEach(t => safe.add(t)); });

    const evals = [...new Set(p.hand)].map(t => {
      const i = TILE_INDEX[t];
      counts[i]--;
      const sh = calcShanten(counts, mc);
      counts[i]++;
      return { t, i, sh };
    });
    const minSh = Math.min(...evals.map(e => e.sh));
    const slack = danger >= 1 && minSh >= 1 ? 1 : 0;

    let best = null;
    for (const e of evals) {
      if (e.sh > minSh + slack) continue;
      counts[e.i]--;
      let ukeire = 0;
      for (let x = 0; x < 34; x++) {
        const left = 4 - visible[x];
        if (left <= 0 || !this._isRelevant(counts, x)) continue;
        counts[x]++;
        if (calcShanten(counts, mc) < e.sh) ukeire += left;
        counts[x]--;
      }
      const isolation = this._isolation(counts, e.i);
      counts[e.i]++;

      const keepValue = this._isValueTile(e.t, playerIdx) && counts[e.i] >= 2 ? 1 : 0;
      const safety = (safe.has(e.t) ? 3 : 0) + (e.i >= 27 && visible[e.i] >= 3 ? 2 : 0);
      const score = -e.sh * 1000 + ukeire * 10 + isolation * 3 - keepValue * 8 + safety * danger * 60;
      if (!best || score > best.score) best = { t: e.t, score };
    }
    return best.t;
  }

  _isRelevant(counts, x) {
    if (x >= 27) return counts[x] > 0;
    const base = x - (x % 9);
    for (let k = Math.max(base, x - 2); k <= Math.min(base + 8, x + 2); k++) if (counts[k] > 0) return true;
    return false;
  }

  /** Higher = more isolated after removing one copy (cheaper to discard). */
  _isolation(counts, i) {
    if (counts[i] > 0) return 0; // still have a copy → part of a pair/set
    if (i >= 27) return 3;
    const base = i - (i % 9);
    let neighbours = 0;
    for (let k = Math.max(base, i - 2); k <= Math.min(base + 8, i + 2); k++) if (k !== i) neighbours += counts[k];
    const terminal = i % 9 === 0 || i % 9 === 8 ? 1 : 0;
    return neighbours === 0 ? 2 + terminal : terminal;
  }

  _aiChooseClaim(playerIdx, options) {
    if (options.some(o => o.type === 'WIN')) return { type: 'WIN' };
    const p = this.players[playerIdx];
    const tile = this.lastDiscard.tile;
    const ti = TILE_INDEX[tile];
    const counts = toCounts(p.hand);
    const mc = p.melds.length;
    const current = calcShanten(counts, mc);
    const valueTile = this._isValueTile(tile, playerIdx);
    let best = null;

    for (const o of options) {
      let after;
      if (o.type === 'PONG') {
        counts[ti] -= 2; after = this._bestDiscardShanten(counts, mc + 1); counts[ti] += 2;
      } else if (o.type === 'KONG') {
        counts[ti] -= 3; after = calcShanten(counts, mc + 1); counts[ti] += 3;
      } else if (o.type === 'CHOW') {
        const others = [...o.tiles];
        others.splice(others.indexOf(tile), 1);
        others.forEach(t => counts[TILE_INDEX[t]]--);
        after = this._bestDiscardShanten(counts, mc + 1);
        others.forEach(t => counts[TILE_INDEX[t]]++);
      }
      let score = current - after;
      if (valueTile && o.type !== 'CHOW') score += 0.6;
      if (o.type === 'KONG') score += 0.3;
      if (o.type === 'CHOW') score -= 0.3;
      if (mc === 0) score -= 0.4; // opening the hand gives up 門清
      if (score > 0.5 && (!best || score > best.score)) best = { o, score };
    }
    return best ? best.o : null;
  }

  _aiChooseSelfKong(playerIdx) {
    const opts = this.getSelfKongOptions(playerIdx);
    if (!opts.length) return null;
    const p = this.players[playerIdx];
    const counts = toCounts(p.hand);
    const mc = p.melds.length;
    const current = this._bestDiscardShanten(counts, mc);
    for (const o of opts) {
      const i = TILE_INDEX[o.tile];
      const n = o.type === 'ANKONG' ? 4 : 1;
      counts[i] -= n;
      const after = calcShanten(counts, o.type === 'ANKONG' ? mc + 1 : mc);
      counts[i] += n;
      if (after <= current) return o;
    }
    return null;
  }

  /**
   * 🀄 聽牌提示演算法 (Ting Hint Calculator)
   * 算出現階段打出哪張牌後手牌能聽哪幾張牌
   */
  getTingHints(playerIdx = 0) {
    const p = this.players[playerIdx];
    if (p.hand.length % 3 !== 2) return []; // 須為摸牌後

    const hints = [];
    const visible = this._visibleCounts(playerIdx);
    const counts = toCounts(p.hand);
    for (const discardTile of new Set(p.hand)) {
      const di = TILE_INDEX[discardTile];
      counts[di]--;
      if (calcShanten(counts, p.melds.length) === 0) {
        const handCopy = [...p.hand];
        handCopy.splice(handCopy.indexOf(discardTile), 1);
        const waitingTiles = ALL_TILES
          .filter(t => this.checkWin([...handCopy, t], p.melds))
          .map(t => ({ tile: t, remaining: Math.max(0, 4 - visible[TILE_INDEX[t]]) }));
        if (waitingTiles.length) hints.push({ discardTile, waitingTiles });
      }
      counts[di]++;
    }
    return hints;
  }

  /**
   * 🀄 台灣 16 張麻將胡牌判定 (5面子 + 1眼睛 = 17張)
   */
  checkWin(hand, melds = []) {
    if ((hand.length + melds.length * 3) !== 17) return false;
    return calcShanten(toCounts(hand), melds.length) === -1;
  }

  _triggerWin(winnerIdx, isSelfDraw = false) {
    clearTimeout(this._aiTimer);
    const winner = this.players[winnerIdx];
    let fromIdx = null;
    let winningTile = isSelfDraw ? this.lastDrawn : null;
    if (!isSelfDraw && this.lastDiscard) {
      fromIdx = this.lastDiscard.playerIdx;
      winningTile = this.lastDiscard.tile;
      winner.hand.push(winningTile);
      this.discards[fromIdx].pop();
    }
    this._sortPlayerHand(winnerIdx);
    this.phase = 'GAME_OVER';
    this._claimQueue = [];
    this.pendingClaims = [];
    this.awaiting = null;

    const fan = this.calculateTaiwanTai(winnerIdx, isSelfDraw);
    const perPayer = BASE_POINTS + fan.totalTai * POINTS_PER_TAI;
    const scoreChanges = [0, 0, 0, 0];
    const payers = isSelfDraw ? [0, 1, 2, 3].filter(i => i !== winnerIdx) : [fromIdx];
    payers.forEach(i => { scoreChanges[i] -= perPayer; scoreChanges[winnerIdx] += perPayer; });
    this.players.forEach((pl, i) => { pl.score += scoreChanges[i]; });

    this.winningResult = {
      isDraw: false,
      winnerIdx,
      winnerName: winner.name,
      isSelfDraw,
      fromIdx,
      fromName: fromIdx !== null ? this.players[fromIdx].name : null,
      winningTile,
      taiDetails: fan.details,
      totalTai: fan.totalTai,
      perPayer,
      scoreGained: scoreChanges[winnerIdx],
      scoreChanges,
      winnerHand: [...winner.hand],
      winnerMelds: winner.melds.map(m => ({ ...m, tiles: [...m.tiles] })),
      winnerFlowers: [...winner.flowers]
    };
    this._emit({ type: 'gameOver' });
  }

  _drawGame() {
    clearTimeout(this._aiTimer);
    this.phase = 'GAME_OVER';
    this._claimQueue = [];
    this.pendingClaims = [];
    this.awaiting = null;
    this.winningResult = {
      isDraw: true, winnerIdx: null, winnerName: '流局', totalTai: 0, taiDetails: [],
      scoreGained: 0, scoreChanges: [0, 0, 0, 0]
    };
    this._emit({ type: 'gameOver' });
  }

  /**
   * 🇹🇼 台灣 16 張麻將經典台數計算 (Taiwan Tai Fan Rating)
   * Call after the winning tile has been added to the hand.
   */
  calculateTaiwanTai(playerIdx, isSelfDraw = false) {
    const p = this.players[playerIdx];
    const details = [];
    const add = (name, tai) => details.push({ name, tai });
    const seat = (playerIdx - this.dealer + 4) % 4;
    const hand = p.hand;
    const all = [...hand, ...p.melds.flatMap(m => m.tiles)];
    const handCount = t => hand.filter(x => x === t).length;
    const hasTriplet = t => p.melds.some(m => m.type !== 'CHOW' && m.tiles[0] === t) || handCount(t) >= 3;
    const isClosed = p.melds.every(m => m.type === 'ANKONG');

    if (playerIdx === this.dealer) {
      add('莊家', 1);
      if (this.consecutiveDealer > 0) add(`連${this.consecutiveDealer}拉${this.consecutiveDealer}`, this.consecutiveDealer * 2);
    }
    if (isClosed && isSelfDraw) add('門清自摸', 3);
    else {
      if (isClosed) add('門清', 1);
      if (isSelfDraw) add('自摸', 1);
    }
    if (!isSelfDraw && p.melds.filter(m => m.type !== 'ANKONG').length === 5) add('全求人', 2);

    // 花牌：正花 (seat flowers) + 花槓
    const seatFlowers = [`H${seat + 1}`, `H${seat + 5}`];
    const ownFlowers = p.flowers.filter(f => seatFlowers.includes(f)).length;
    if (ownFlowers) add(`正花 ×${ownFlowers}`, ownFlowers);
    if (['H1', 'H2', 'H3', 'H4'].every(f => p.flowers.includes(f))) add('春夏秋冬', 2);
    if (['H5', 'H6', 'H7', 'H8'].every(f => p.flowers.includes(f))) add('梅蘭竹菊', 2);

    // 三元牌 (中、發、白)
    const dragonTrips = DRAGONS.filter(hasTriplet);
    const dragonPair = DRAGONS.some(d => !hasTriplet(d) && handCount(d) === 2);
    if (dragonTrips.length === 3) add('大三元', 8);
    else {
      if (dragonTrips.length === 2 && dragonPair) add('小三元', 4);
      dragonTrips.forEach(d => add(TILE_NAMES[d], 1));
    }

    // 風牌 (圈風 / 門風 / 四喜)
    const windTrips = WIND_TILES.filter(hasTriplet);
    const windPair = WIND_TILES.some(w => !hasTriplet(w) && handCount(w) === 2);
    if (windTrips.length === 4) add('大四喜', 16);
    else if (windTrips.length === 3 && windPair) add('小四喜', 8);
    else {
      if (hasTriplet(this.windCircle)) add('圈風 東風', 1);
      if (hasTriplet(WIND_TILES[seat])) add(`門風 ${SEAT_WIND_NAMES[seat]}風`, 1);
    }

    // 碰碰胡
    if (p.melds.every(m => m.type !== 'CHOW')) {
      const counts = {};
      hand.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      const vals = Object.values(counts);
      if (vals.filter(v => v === 2).length === 1 && vals.every(v => v === 2 || v === 3)) add('碰碰胡', 4);
    }

    // 一色牌
    const suits = new Set(all.filter(t => t.length === 2).map(t => t[1]));
    const hasHonor = all.some(t => t.length === 1);
    if (suits.size === 0) add('字一色', 16);
    else if (suits.size === 1) add(hasHonor ? '混一色' : '清一色', hasHonor ? 4 : 8);

    if (this.wall.length <= DEAD_WALL) add(isSelfDraw ? '海底撈月' : '河底撈魚', 1);
    if (isSelfDraw && this.kongReplacement) add('槓上開花', 1);

    const totalTai = details.reduce((s, d) => s + d.tai, 0);
    if (!details.length) add('屁胡', 0);
    return { details, totalTai };
  }

  getState() {
    return {
      wallRemaining: this.wall.length,
      drawableRemaining: Math.max(0, this.wall.length - DEAD_WALL),
      currentTurn: this.currentTurn,
      dealer: this.dealer,
      consecutiveDealer: this.consecutiveDealer,
      phase: this.phase,
      lastDiscard: this.lastDiscard,
      lastDrawn: this.lastDrawn,
      pendingClaims: [...this.pendingClaims],
      awaiting: this.awaiting ? { playerIdx: this.awaiting.playerIdx, options: [...this.awaiting.options] } : null,
      discards: this.discards.map(d => [...d]),
      players: this.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        handCount: p.hand.length,
        hand: p.isHuman ? [...p.hand] : [],
        melds: p.melds.map(m => ({ ...m, tiles: [...m.tiles] })),
        flowers: [...p.flowers],
        score: p.score,
        seatWind: SEAT_WIND_NAMES[(i - this.dealer + 4) % 4]
      })),
      canSelfDrawWin: this.canSelfDrawWin(0),
      selfKongOptions: this.getSelfKongOptions(0),
      winningResult: this.winningResult
    };
  }
}
