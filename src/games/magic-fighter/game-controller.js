/**
 * Magic Fighter 3D Engine — 3D MOBA & Tower Defense Strategy Controller
 *
 * Game Rules & Architecture:
 * - Dual Base HQs: Player Base HQ (Bottom) vs Enemy Base HQ (Top) with 500 HP each.
 * - Resource Economy: Mana (+5/sec, +30 per neutral creep kill, +20 per enemy creep kill).
 * - Player Creep Summoning:
 *   - 🦇 Dark Bat ($50 Mana) — Fast scout creep marching UP
 *   - 🦅 Griffin ($100 Mana) — Swift assault creep marching UP
 *   - 🐲 Fire Wyvern Dragon ($200 Mana) — Heavy 10-HP Tank dragon marching UP
 *   - ⭐️ Upgrade Firepower ($150 Mana) — Level up Fighter bullets
 * - Center Neutral Jungle Area: Spawns neutral creeps for farming Mana.
 * - Enemy Strategy AI: Accumulates Mana, farms neutrals, & summons enemy monster waves.
 */

export const MAP_GRID_SIZE = 16; // 16x16 Grid
export const TILE_EMPTY = 0;
export const TILE_BRICK = 1;
export const TILE_STEEL = 2;
export const TILE_FOREST = 3;
export const TILE_ICE = 4;
export const TILE_WATER = 5;

export const POWERUP_SHIELD = 'shield';
export const POWERUP_CLOCK = 'clock';
export const POWERUP_BOMB = 'bomb';
export const POWERUP_STAR = 'star';
export const POWERUP_SHOVEL = 'shovel';
export const POWERUP_LIFE = 'life';

export class MagicFighterGame {
  constructor() {
    this.width = 640;
    this.height = 640;
    this.tileSize = 40;

    this.running = false;
    this.gameOver = false;
    this.victory = false;
    this.score = 0;

    // Player Mana Resource & Base HQ (Bottom)
    this.playerMana = 120;
    this.maxMana = 999;
    this.playerBase = {
      x: 240,
      y: 540,
      width: 160,
      height: 100,
      hp: 500,
      maxHp: 500,
      destroyed: false,
    };

    // Enemy AI Mana Resource & Base HQ (Top)
    this.enemyMana = 100;
    this.enemyBase = {
      x: 240,
      y: 0,
      width: 160,
      height: 100,
      hp: 500,
      maxHp: 500,
      destroyed: false,
    };

    // Player Fighter State
    this.player = {
      x: 160,
      y: 560,
      width: 34,
      height: 34,
      speed: 6.5,
      direction: 'UP',
      vx: 0,
      vy: 0,
      bankAngle: 0,
      hp: 5,
      maxHp: 5,
      hasShield: true,
      shieldTime: 0,
      starLevel: 0,
      lastFireTime: 0,
      fireRate: 180,
      isInForest: false,
      isShiftingOnIce: false,
    };

    this.freezeEnemiesTime = 0;
    this.fortifyHqTime = 0;

    this.map = [];
    this.playerCreeps = []; // Friendly summoned monsters marching UP
    this.enemyCreeps = [];  // Enemy monsters marching DOWN
    this.neutralCreeps = [];// Middle jungle creeps
    this.bullets = [];
    this.powerups = [];
    this.particles = [];

    this.onStateChange = null;
    this.onGameOver = null;

    this._animFrame = null;
    this._lastTime = 0;
    this._lastManaTick = 0;
    this._lastNeutralSpawn = 0;
    this._lastAiSummon = 0;
  }

  init(canvas) {
    this.width = canvas?.width || 640;
    this.height = canvas?.height || 640;
    this.tileSize = this.width / MAP_GRID_SIZE;

    this.newGame();
  }

  newGame() {
    this.running = true;
    this.gameOver = false;
    this.victory = false;
    this.score = 0;
    this.playerMana = 120;
    this.enemyMana = 100;

    // Reset Player Base HQ
    this.playerBase.hp = 500;
    this.playerBase.destroyed = false;

    // Reset Enemy Base HQ
    this.enemyBase.hp = 500;
    this.enemyBase.destroyed = false;

    // Reset Player
    this.player.x = 4 * this.tileSize;
    this.player.y = 14 * this.tileSize;
    this.player.hp = 5;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.speed = 6.5;
    this.player.direction = 'UP';
    this.player.hasShield = true;
    this.player.shieldTime = Date.now() + 4000;
    this.player.starLevel = 0;

    this.freezeEnemiesTime = 0;
    this.fortifyHqTime = 0;

    // Generate Battlefield Map
    this._generateMap();

    // Reset Arrays
    this.playerCreeps = [];
    this.enemyCreeps = [];
    this.neutralCreeps = [];
    this.bullets = [];
    this.powerups = [];
    this.particles = [];

    const now = performance.now();
    this._lastTime = now;
    this._lastManaTick = now;
    this._lastNeutralSpawn = now;
    this._lastAiSummon = now;

    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this.loop();
  }

  _generateMap() {
    this.map = Array(MAP_GRID_SIZE).fill(0).map(() => Array(MAP_GRID_SIZE).fill(TILE_EMPTY));

    // Player Base Fortifications (Rows 13-15, Cols 5-10)
    for (let c = 5; c <= 10; c++) this.map[13][c] = TILE_BRICK;
    this.map[14][5] = TILE_BRICK;
    this.map[14][10] = TILE_BRICK;

    // Enemy Base Fortifications (Rows 0-2, Cols 5-10)
    for (let c = 5; c <= 10; c++) this.map[2][c] = TILE_BRICK;
    this.map[1][5] = TILE_BRICK;
    this.map[1][10] = TILE_BRICK;

    // Middle Neutral Jungle River (Row 7-8)
    for (let c = 0; c < MAP_GRID_SIZE; c++) {
      if (c === 3 || c === 4 || c === 11 || c === 12) {
        this.map[7][c] = TILE_WATER;
        this.map[8][c] = TILE_WATER;
      } else if (c === 1 || c === 14) {
        this.map[7][c] = TILE_ICE;
        this.map[8][c] = TILE_ICE;
      }
    }

    // Midfield Obstacles
    this.map[4][3] = TILE_BRICK;
    this.map[4][4] = TILE_BRICK;
    this.map[4][11] = TILE_BRICK;
    this.map[4][12] = TILE_BRICK;

    this.map[11][3] = TILE_BRICK;
    this.map[11][4] = TILE_BRICK;
    this.map[11][11] = TILE_BRICK;
    this.map[11][12] = TILE_BRICK;

    // Forest Stealth Grass
    this.map[5][7] = TILE_FOREST;
    this.map[5][8] = TILE_FOREST;
    this.map[10][7] = TILE_FOREST;
    this.map[10][8] = TILE_FOREST;

    // Steel Bunkers
    this.map[6][0] = TILE_STEEL;
    this.map[6][15] = TILE_STEEL;
    this.map[9][0] = TILE_STEEL;
    this.map[9][15] = TILE_STEEL;
  }

  /**
   * Summon Player Creep (Called by UI buttons in bottom right)
   */
  summonPlayerCreep(type) {
    if (this.gameOver || !this.running) return false;

    let cost = 50;
    let hp = 2;
    let speed = 3.5;
    let width = 32;
    let height = 32;

    if (type === 'griffin') {
      cost = 100;
      hp = 4;
      speed = 5.0;
    } else if (type === 'dragon') {
      cost = 200;
      hp = 10;
      speed = 2.5;
      width = 40;
      height = 40;
    }

    if (this.playerMana < cost) return false;

    this.playerMana -= cost;

    // Spawn near player base (bottom) marching UP
    const creep = {
      id: 'pcreep_' + Date.now() + '_' + Math.random(),
      type,
      x: 200 + Math.random() * 240,
      y: 500,
      width,
      height,
      hp,
      maxHp: hp,
      speed,
      direction: 'UP',
      lastFire: 0,
      fireRate: type === 'griffin' ? 800 : 1200,
      isFriendly: true
    };

    this.playerCreeps.push(creep);
    return true;
  }

  /**
   * Upgrade Player Fighter Firepower Level
   */
  upgradePlayerFighter() {
    if (this.playerMana >= 150 && this.player.starLevel < 3) {
      this.playerMana -= 150;
      this.player.starLevel += 1;
      return true;
    }
    return false;
  }

  /**
   * Fortify Player Base HQ (+150 HP & Steel Protection)
   */
  fortifyPlayerBase() {
    if (this.playerMana >= 150 && !this.playerBase.destroyed) {
      this.playerMana -= 150;
      this.playerBase.hp = Math.min(this.playerBase.maxHp, this.playerBase.hp + 150);
      this.fortifyHqTime = Date.now() + 15000;

      for (let c = 5; c <= 10; c++) this.map[13][c] = TILE_STEEL;
      this.map[14][5] = TILE_STEEL;
      this.map[14][10] = TILE_STEEL;
      return true;
    }
    return false;
  }

  movePlayerVector(vx, vy) {
    if (this.gameOver || !this.running) return;

    this.player.vx = vx;
    this.player.vy = vy;

    if (vx < 0) {
      this.player.direction = 'LEFT';
      this.player.bankAngle = 0.35;
    } else if (vx > 0) {
      this.player.direction = 'RIGHT';
      this.player.bankAngle = -0.35;
    } else if (vy < 0) {
      this.player.direction = 'UP';
      this.player.bankAngle = 0;
    } else if (vy > 0) {
      this.player.direction = 'DOWN';
      this.player.bankAngle = 0;
    }
  }

  stopPlayer() {
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.bankAngle = 0;
  }

  firePlayerBullet() {
    if (this.gameOver || !this.running) return;
    const now = Date.now();
    if (now - this.player.lastFireTime < this.player.fireRate) return;
    this.player.lastFireTime = now;

    const p = this.player;
    const isArmorPiercing = p.starLevel >= 3;

    if (p.starLevel >= 1) {
      // Dual Bullets
      this.bullets.push({
        x: p.x + 4,
        y: p.y,
        width: 10,
        height: 10,
        vx: 0,
        vy: -10,
        isPlayer: true,
        isArmorPiercing
      });
      this.bullets.push({
        x: p.x + p.width - 14,
        y: p.y,
        width: 10,
        height: 10,
        vx: 0,
        vy: -10,
        isPlayer: true,
        isArmorPiercing
      });
    } else {
      // Single Bullet
      this.bullets.push({
        x: p.x + p.width / 2 - 5,
        y: p.y,
        width: 10,
        height: 10,
        vx: 0,
        vy: -10,
        isPlayer: true,
        isArmorPiercing
      });
    }
  }

  loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    this.update(now, dt);
    if (this.onStateChange) this.onStateChange(this.getState());

    this._animFrame = requestAnimationFrame(() => this.loop());
  }

  update(now, dt) {
    if (this.gameOver) return;

    // 1. Passive Mana Income (+5 Mana/sec)
    if (now - this._lastManaTick >= 1000) {
      this._lastManaTick = now;
      this.playerMana = Math.min(this.maxMana, this.playerMana + 5);
      this.enemyMana = Math.min(this.maxMana, this.enemyMana + 5);
    }

    // 2. Shield & HQ Fortify Timers
    if (this.player.shieldTime && now > this.player.shieldTime) {
      this.player.hasShield = false;
    }
    if (this.fortifyHqTime && now > this.fortifyHqTime) {
      this.fortifyHqTime = 0;
      for (let c = 5; c <= 10; c++) this.map[13][c] = TILE_BRICK;
      this.map[14][5] = TILE_BRICK;
      this.map[14][10] = TILE_BRICK;
    }

    // 3. Move Player Fighter
    this._updatePlayerMovement();

    // 4. Update Friendly Summoned Creeps
    this._updateFriendlyCreeps(now);

    // 5. Update Enemy Monster Creeps
    this._updateEnemyCreeps(now);

    // 6. Spawn & Update Middle Neutral Jungle Creeps
    this._updateNeutralCreeps(now);

    // 7. Enemy AI Manager (Spawns Enemy Monsters & attacks Player HQ)
    this._updateEnemyAI(now);

    // 8. Move Bullets & Check Collisions
    this._updateBullets();

    // 9. Check Powerups Collection
    this._updatePowerups();

    // 10. Check Game Over Conditions
    if (this.enemyBase.hp <= 0) {
      this.enemyBase.destroyed = true;
      this.gameOver = true;
      this.victory = true;
      this.score += 2000;
      if (this.onGameOver) this.onGameOver({ victory: true, score: this.score, reason: '成功摧毀敵方魔龍主塔！3D 戰局全勝！' });
    } else if (this.playerBase.hp <= 0) {
      this.playerBase.destroyed = true;
      this.gameOver = true;
      this.victory = false;
      if (this.onGameOver) this.onGameOver({ victory: false, score: this.score, reason: '蘿蔔 HQ 水晶總部失守毀壞！對局結束！' });
    }
  }

  _updatePlayerMovement() {
    const p = this.player;
    let speed = p.speed;

    const row = Math.floor((p.y + p.height / 2) / this.tileSize);
    const col = Math.floor((p.x + p.width / 2) / this.tileSize);

    if (row >= 0 && row < MAP_GRID_SIZE && col >= 0 && col < MAP_GRID_SIZE) {
      const tile = this.map[row][col];
      p.isInForest = (tile === TILE_FOREST);
      if (tile === TILE_ICE) speed *= 1.3;
    }

    let nextX = p.x + p.vx * speed;
    let nextY = p.y + p.vy * speed;

    // Boundaries Check
    nextX = Math.max(0, Math.min(this.width - p.width, nextX));
    nextY = Math.max(0, Math.min(this.height - p.height, nextY));

    // Solid Collisions Check
    if (!this._checkWallCollision(nextX, p.y, p.width, p.height)) p.x = nextX;
    if (!this._checkWallCollision(p.x, nextY, p.width, p.height)) p.y = nextY;
  }

  _updateFriendlyCreeps(now) {
    for (let i = this.playerCreeps.length - 1; i >= 0; i--) {
      const c = this.playerCreeps[i];

      // March towards Enemy Base (UP)
      c.y -= c.speed;

      // Attack Enemy Base HQ when reached
      if (this._rectOverlap(c, this.enemyBase)) {
        this.enemyBase.hp = Math.max(0, this.enemyBase.hp - 15);
        this.playerCreeps.splice(i, 1);
        continue;
      }

      // Auto Fire Bullet at nearby enemy creeps
      if (now - c.lastFire > c.fireRate) {
        c.lastFire = now;
        this.bullets.push({
          x: c.x + c.width / 2 - 4,
          y: c.y,
          width: 8,
          height: 8,
          vx: 0,
          vy: -8,
          isPlayer: true
        });
      }
    }
  }

  _updateEnemyCreeps(now) {
    for (let i = this.enemyCreeps.length - 1; i >= 0; i--) {
      const c = this.enemyCreeps[i];

      // March towards Player Base (DOWN)
      c.y += c.speed;

      // Attack Player Base HQ when reached
      if (this._rectOverlap(c, this.playerBase)) {
        this.playerBase.hp = Math.max(0, this.playerBase.hp - 15);
        this.enemyCreeps.splice(i, 1);
        continue;
      }

      // Auto Fire Bullet at Player Base
      if (now - c.lastFire > c.fireRate) {
        c.lastFire = now;
        this.bullets.push({
          x: c.x + c.width / 2 - 4,
          y: c.y + c.height,
          width: 8,
          height: 8,
          vx: 0,
          vy: 8,
          isPlayer: false
        });
      }
    }
  }

  _updateNeutralCreeps(now) {
    // Periodically spawn neutral creeps in the middle river
    if (now - this._lastNeutralSpawn > 10000 && this.neutralCreeps.length < 3) {
      this._lastNeutralSpawn = now;
      this.neutralCreeps.push({
        id: 'neutral_' + Date.now(),
        type: 'bat',
        x: 60 + Math.random() * 520,
        y: 280 + Math.random() * 60,
        width: 32,
        height: 32,
        hp: 3,
        maxHp: 3,
        speed: 1.5,
        direction: 'RIGHT',
        isNeutral: true
      });
    }
  }

  _updateEnemyAI(now) {
    if (now - this._lastAiSummon > 4000) {
      this._lastAiSummon = now;

      if (this.enemyMana >= 200) {
        this.enemyMana -= 200;
        this.enemyCreeps.push({
          id: 'e_' + Date.now(),
          type: 'dragon',
          x: 200 + Math.random() * 240,
          y: 60,
          width: 40,
          height: 40,
          hp: 10,
          maxHp: 10,
          speed: 2.2,
          direction: 'DOWN',
          lastFire: 0,
          fireRate: 1000,
          isFriendly: false
        });
      } else if (this.enemyMana >= 100) {
        this.enemyMana -= 100;
        this.enemyCreeps.push({
          id: 'e_' + Date.now(),
          type: 'griffin',
          x: 100 + Math.random() * 440,
          y: 60,
          width: 32,
          height: 32,
          hp: 4,
          maxHp: 4,
          speed: 4.5,
          direction: 'DOWN',
          lastFire: 0,
          fireRate: 800,
          isFriendly: false
        });
      } else if (this.enemyMana >= 50) {
        this.enemyMana -= 50;
        this.enemyCreeps.push({
          id: 'e_' + Date.now(),
          type: 'bat',
          x: 80 + Math.random() * 480,
          y: 60,
          width: 32,
          height: 32,
          hp: 2,
          maxHp: 2,
          speed: 3.5,
          direction: 'DOWN',
          lastFire: 0,
          fireRate: 1200,
          isFriendly: false
        });
      }
    }
  }

  _updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Offscreen Check
      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Bullet vs Base HQs
      if (b.isPlayer && this._rectOverlap(b, this.enemyBase)) {
        this.enemyBase.hp = Math.max(0, this.enemyBase.hp - 10);
        this.bullets.splice(i, 1);
        continue;
      } else if (!b.isPlayer && this._rectOverlap(b, this.playerBase)) {
        this.playerBase.hp = Math.max(0, this.playerBase.hp - 10);
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Bullet vs Player Fighter
      if (!b.isPlayer && this._rectOverlap(b, this.player)) {
        if (!this.player.hasShield) {
          this.player.hp -= 1;
          if (this.player.hp <= 0) {
            // Respawn player
            this.player.x = 160;
            this.player.y = 560;
            this.player.hp = 3;
            this.player.hasShield = true;
            this.player.shieldTime = Date.now() + 3000;
          }
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Player Bullet vs Enemy Creeps
      if (b.isPlayer) {
        for (let j = this.enemyCreeps.length - 1; j >= 0; j--) {
          const e = this.enemyCreeps[j];
          if (this._rectOverlap(b, e)) {
            e.hp -= (b.isArmorPiercing ? 2 : 1);
            this.bullets.splice(i, 1);

            if (e.hp <= 0) {
              this.enemyCreeps.splice(j, 1);
              this.score += 100;
              this.playerMana = Math.min(this.maxMana, this.playerMana + 25);
            }
            break;
          }
        }

        // Check Player Bullet vs Neutral Creeps
        for (let j = this.neutralCreeps.length - 1; j >= 0; j--) {
          const n = this.neutralCreeps[j];
          if (this._rectOverlap(b, n)) {
            n.hp -= 1;
            this.bullets.splice(i, 1);
            if (n.hp <= 0) {
              this.neutralCreeps.splice(j, 1);
              this.score += 150;
              this.playerMana = Math.min(this.maxMana, this.playerMana + 45); // Farm Neutral Creeps
            }
            break;
          }
        }
      }
    }
  }

  _updatePowerups() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      if (this._rectOverlap(this.player, p)) {
        this.powerups.splice(i, 1);
        this.score += 500;
        this.playerMana = Math.min(this.maxMana, this.playerMana + 60);
      }
    }
  }

  _checkWallCollision(x, y, w, h) {
    const rect = { x, y, width: w, height: h };
    if (this._rectOverlap(rect, this.playerBase) || this._rectOverlap(rect, this.enemyBase)) {
      return true;
    }

    const minC = Math.floor(x / this.tileSize);
    const maxC = Math.floor((x + w) / this.tileSize);
    const minR = Math.floor(y / this.tileSize);
    const maxR = Math.floor((y + h) / this.tileSize);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r >= 0 && r < MAP_GRID_SIZE && c >= 0 && c < MAP_GRID_SIZE) {
          const tile = this.map[r][c];
          if (tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER) {
            return true;
          }
        }
      }
    }
    return false;
  }

  _rectOverlap(r1, r2) {
    return !(r1.x + r1.width <= r2.x ||
             r1.x >= r2.x + r2.width ||
             r1.y + r1.height <= r2.y ||
             r1.y >= r2.y + r2.height);
  }

  getState() {
    return {
      running: this.running,
      gameOver: this.gameOver,
      victory: this.victory,
      score: this.score,
      playerMana: this.playerMana,
      maxMana: this.maxMana,
      playerBase: { ...this.playerBase },
      enemyBase: { ...this.enemyBase },
      player: { ...this.player },
      enemies: [...this.enemyCreeps, ...this.neutralCreeps],
      playerCreeps: [...this.playerCreeps],
      bullets: [...this.bullets],
      powerups: [...this.powerups],
      map: this.map
    };
  }

  destroy() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }
}
