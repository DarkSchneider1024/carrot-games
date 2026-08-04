/**
 * Magic Fighter 3D Engine — Smart Pathfinding AI & NES Classic Wave Progression
 *
 * Key Improvements:
 * 1. 🧠 Smart Pathfinding AI: Monsters auto-detect obstacles (brick walls, steel, water), smoothly turn left/right/up/down around corners, and patrol the map without getting stuck.
 * 2. 🏰 Base Wall Collision & Continuous Melee Attack: Monsters NO LONGER DISAPPEAR when hitting the player base wall! They stay alive and continuously attack the base until defeated by player bullets!
 * 3. 🎯 Fixed Wave Stage Progression: Waves 1 to 5 with fixed monster counts per wave. Clear all wave monsters to advance to the next stage!
 */
import {
  playLaserSound,
  playHitImpactSound,
  playWallBreakSound,
  playMonsterKillSound
} from '../../utils/sound-effects.js';

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
    this.mode = 'ai'; // 'ai' (NES Wave Stage) or 'pvp' (Dual HQ)
    this.wave = 1;
    this.maxWaves = 5;
    this.enemiesRemaining = 12;
    this.maxEnemiesOnScreen = 5;

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

    // Enemy AI Base HQ (PVP mode only)
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

    this.map = [];
    this.playerCreeps = [];
    this.enemyCreeps = [];
    this.neutralCreeps = [];
    this.bullets = [];
    this.powerups = [];

    this.onStateChange = null;
    this.onGameOver = null;

    this._animFrame = null;
    this._lastTime = 0;
    this._lastManaTick = 0;
    this._lastNeutralSpawn = 0;
    this._lastAiSummon = 0;
  }

  init(mode = 'ai') {
    this.mode = mode;
    this.newGame(1);
  }

  newGame(wave = 1) {
    this.running = true;
    this.gameOver = false;
    this.victory = false;
    this.wave = wave;
    this.enemiesRemaining = 8 + wave * 4; // Wave 1: 12, Wave 2: 16, Wave 3: 20, Wave 4: 24, Wave 5: 28
    this.playerMana = 120;

    this.playerBase.hp = 500;
    this.playerBase.destroyed = false;

    this.enemyBase.hp = 500;
    this.enemyBase.destroyed = (this.mode === 'ai');

    this.player.x = 3 * this.tileSize; // 120 (Column 3, left of U-shaped base wall)
    this.player.y = 13 * this.tileSize; // 520 (Row 13, open space)
    this.player.hp = 5;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.speed = 6.5;
    this.player.direction = 'UP';
    this.player.hasShield = true;
    this.player.shieldTime = Date.now() + 4000;

    this._generateMap();

    this.playerCreeps = [];
    this.enemyCreeps = [];
    this.neutralCreeps = [];
    this.bullets = [];
    this.powerups = [];

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

    // Player Base Fortifications (Symmetrical U-Shape Wall around Columns 4-11, Rows 12-15)
    for (let c = 4; c <= 11; c++) {
      this.map[12][c] = TILE_BRICK;
    }
    for (let r = 13; r <= 15; r++) {
      this.map[r][4] = TILE_BRICK;
      this.map[r][11] = TILE_BRICK;
    }

    if (this.mode === 'pvp') {
      for (let c = 4; c <= 11; c++) this.map[3][c] = TILE_BRICK;
      for (let r = 0; r <= 2; r++) {
        this.map[r][4] = TILE_BRICK;
        this.map[r][11] = TILE_BRICK;
      }
    }

    // Middle River
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
      speed = 4.5;
    } else if (type === 'dragon') {
      cost = 200;
      hp = 10;
      speed = 2.5;
      width = 40;
      height = 40;
    }

    if (this.playerMana < cost) return false;

    this.playerMana -= cost;

    this.playerCreeps.push({
      id: 'pcreep_' + Date.now() + '_' + Math.random(),
      type,
      x: 200 + Math.random() * 240,
      y: 480,
      width,
      height,
      hp,
      maxHp: hp,
      speed,
      direction: 'UP',
      lastFire: 0,
      fireRate: type === 'griffin' ? 800 : 1200,
      isFriendly: true
    });
    return true;
  }

  upgradePlayerFighter() {
    if (this.playerMana >= 150 && this.player.starLevel < 3) {
      this.playerMana -= 150;
      this.player.starLevel += 1;
      return true;
    }
    return false;
  }

  fortifyPlayerBase() {
    if (this.playerMana >= 150 && !this.playerBase.destroyed) {
      this.playerMana -= 150;
      this.playerBase.hp = Math.min(this.playerBase.maxHp, this.playerBase.hp + 150);
      this.fortifyHqTime = Date.now() + 15000;

      for (let c = 4; c <= 11; c++) this.map[12][c] = TILE_STEEL;
      for (let r = 13; r <= 15; r++) {
        this.map[r][4] = TILE_STEEL;
        this.map[r][11] = TILE_STEEL;
      }
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

    playLaserSound();

    const p = this.player;
    const isArmorPiercing = p.starLevel >= 3;

    let bvx = 0;
    let bvy = -12;

    if (p.direction === 'DOWN') {
      bvx = 0;
      bvy = 12;
    } else if (p.direction === 'LEFT') {
      bvx = -12;
      bvy = 0;
    } else if (p.direction === 'RIGHT') {
      bvx = 12;
      bvy = 0;
    } else if (p.vx !== 0 || p.vy !== 0) {
      const len = Math.hypot(p.vx, p.vy);
      if (len > 0) {
        bvx = (p.vx / len) * 12;
        bvy = (p.vy / len) * 12;
      }
    }

    const bulletSpeed = 12;

    if (p.starLevel >= 1) {
      const perpX = -bvy / bulletSpeed * 8;
      const perpY = bvx / bulletSpeed * 8;

      this.bullets.push({
        x: p.x + p.width / 2 - 5 + perpX,
        y: p.y + p.height / 2 - 5 + perpY,
        width: 10,
        height: 10,
        vx: bvx,
        vy: bvy,
        isPlayer: true,
        isArmorPiercing
      });
      this.bullets.push({
        x: p.x + p.width / 2 - 5 - perpX,
        y: p.y + p.height / 2 - 5 - perpY,
        width: 10,
        height: 10,
        vx: bvx,
        vy: bvy,
        isPlayer: true,
        isArmorPiercing
      });
    } else {
      this.bullets.push({
        x: p.x + p.width / 2 - 5,
        y: p.y + p.height / 2 - 5,
        width: 10,
        height: 10,
        vx: bvx,
        vy: bvy,
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

    if (now - this._lastManaTick >= 1000) {
      this._lastManaTick = now;
      this.playerMana = Math.min(this.maxMana, this.playerMana + 5);
    }

    if (this.player.shieldTime && now > this.player.shieldTime) {
      this.player.hasShield = false;
    }
    if (this.fortifyHqTime && now > this.fortifyHqTime) {
      this.fortifyHqTime = 0;
      for (let c = 4; c <= 11; c++) this.map[12][c] = TILE_BRICK;
      for (let r = 13; r <= 15; r++) {
        this.map[r][4] = TILE_BRICK;
        this.map[r][11] = TILE_BRICK;
      }
    }

    this._updatePlayerMovement();
    this._updateFriendlyCreeps(now);
    this._updateEnemyCreeps(now);
    this._updateNeutralCreeps(now);
    this._updateEnemyAI(now);
    this._updateBullets();

    if (this.mode === 'ai') {
      if (this.enemiesRemaining <= 0 && this.enemyCreeps.length === 0) {
        if (this.wave < this.maxWaves) {
          this.newGame(this.wave + 1);
        } else {
          this.gameOver = true;
          this.victory = true;
          this.score += 3000;
          if (this.onGameOver) this.onGameOver({ victory: true, score: this.score, reason: '🎉 恭喜全通 5 大波次關卡！獲得 3D 空戰總冠軍！' });
        }
      }
    } else if (this.mode === 'pvp') {
      if (this.enemyBase.hp <= 0) {
        this.enemyBase.destroyed = true;
        this.gameOver = true;
        this.victory = true;
        this.score += 2000;
        if (this.onGameOver) this.onGameOver({ victory: true, score: this.score, reason: '成功摧毀敵方魔龍主塔！3D 戰局全勝！' });
      }
    }

    if (this.playerBase.hp <= 0) {
      this.playerBase.destroyed = true;
      this.gameOver = true;
      this.victory = false;
      if (this.onGameOver) this.onGameOver({ victory: false, score: this.score, reason: '蘿蔔 HQ 藍晶總部失守毀壞！戰局結束！' });
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

    nextX = Math.max(0, Math.min(this.width - p.width, nextX));
    nextY = Math.max(0, Math.min(this.height - p.height, nextY));

    if (!this._checkWallCollision(nextX, p.y, p.width, p.height)) p.x = nextX;
    if (!this._checkWallCollision(p.x, nextY, p.width, p.height)) p.y = nextY;
  }

  /**
   * 🧠 Smart Target-Seeking Creep Pathfinding AI (自動過牆、轉彎與向主塔進攻)
   */
  _moveCreepSmart(c, targetX, targetY) {
    // Calculate primary desired direction based on target position
    let preferredDir = 'DOWN';
    if (Math.abs(c.y - targetY) > 50) {
      preferredDir = targetY > c.y ? 'DOWN' : 'UP';
    } else if (Math.abs(c.x - targetX) > 40) {
      preferredDir = targetX > c.x ? 'RIGHT' : 'LEFT';
    } else {
      preferredDir = targetY > c.y ? 'DOWN' : 'UP';
    }

    if (!c.direction) c.direction = preferredDir;

    let dx = 0;
    let dy = 0;
    if (c.direction === 'DOWN') dy = c.speed;
    else if (c.direction === 'UP') dy = -c.speed;
    else if (c.direction === 'LEFT') dx = -c.speed;
    else if (c.direction === 'RIGHT') dx = c.speed;

    const nextX = c.x + dx;
    const nextY = c.y + dy;

    // Check if forward step is clear of wall/boundary
    const isBlocked = this._checkWallCollision(nextX, nextY, c.width, c.height) ||
                      (nextY >= this.height - c.height - 12 && c.direction === 'DOWN') ||
                      (nextY <= 12 && c.direction === 'UP') ||
                      (nextX <= 12 && c.direction === 'LEFT') ||
                      (nextX >= this.width - c.width - 12 && c.direction === 'RIGHT');

    if (!isBlocked) {
      c.x = nextX;
      c.y = nextY;

      // 8% chance to re-steer towards primary target direction when path is open
      if (Math.random() < 0.08 && c.direction !== preferredDir) {
        let testDx = preferredDir === 'LEFT' ? -c.speed : preferredDir === 'RIGHT' ? c.speed : 0;
        let testDy = preferredDir === 'DOWN' ? c.speed : preferredDir === 'UP' ? -c.speed : 0;
        if (!this._checkWallCollision(c.x + testDx, c.y + testDy, c.width, c.height)) {
          c.direction = preferredDir;
        }
      }
    } else {
      // Forward step BLOCKED! Find valid unblocked direction sorted by distance to target
      const possibleDirs = ['DOWN', 'LEFT', 'RIGHT', 'UP'].filter(dir => dir !== c.direction);

      possibleDirs.sort((a, b) => {
        let distA = this._getDirTargetDistance(c, a, targetX, targetY);
        let distB = this._getDirTargetDistance(c, b, targetX, targetY);
        return distA - distB;
      });

      let turned = false;
      for (const dir of possibleDirs) {
        let testDx = (dir === 'LEFT' ? -c.speed : dir === 'RIGHT' ? c.speed : 0);
        let testDy = (dir === 'DOWN' ? c.speed : dir === 'UP' ? -c.speed : 0);
        const testX = c.x + testDx;
        const testY = c.y + testDy;

        if (testX > 10 && testX < this.width - c.width - 10 &&
            testY > 10 && testY < this.height - c.height - 10 &&
            !this._checkWallCollision(testX, testY, c.width, c.height)) {
          c.direction = dir;
          c.x = testX;
          c.y = testY;
          turned = true;
          break;
        }
      }

      if (!turned) {
        c.direction = preferredDir;
      }
    }

    c.x = Math.max(10, Math.min(this.width - c.width - 10, c.x));
    c.y = Math.max(10, Math.min(this.height - c.height - 10, c.y));
  }

  _getDirTargetDistance(c, dir, targetX, targetY) {
    let testX = c.x + (dir === 'LEFT' ? -c.speed * 4 : dir === 'RIGHT' ? c.speed * 4 : 0);
    let testY = c.y + (dir === 'DOWN' ? c.speed * 4 : dir === 'UP' ? -c.speed * 4 : 0);
    return Math.hypot(testX - targetX, testY - targetY);
  }

  _updateFriendlyCreeps(now) {
    for (let i = this.playerCreeps.length - 1; i >= 0; i--) {
      const c = this.playerCreeps[i];

      this._moveCreepSmart(c, 320, 40); // March toward Enemy Top (320, 40)

      if (this.mode === 'pvp' && this._rectOverlap(c, this.enemyBase)) {
        if (!c.lastMeleeAttack || now - c.lastMeleeAttack > 1000) {
          c.lastMeleeAttack = now;
          this.enemyBase.hp = Math.max(0, this.enemyBase.hp - 12);
          playHitImpactSound();
        }
      }

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

      // 🏰 Check collision with Player Base (Continuous Melee Attack!)
      if (this._rectOverlap(c, this.playerBase)) {
        if (!c.lastMeleeAttack || now - c.lastMeleeAttack > 1000) {
          c.lastMeleeAttack = now;
          this.playerBase.hp = Math.max(0, this.playerBase.hp - 10);
          playHitImpactSound();
        }
      } else {
        this._moveCreepSmart(c, 320, 540); // March toward Player Base HQ at Bottom Center (320, 540)
      }

      // Auto Fire Bullets
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
    if (this.mode === 'ai') {
      if (this.enemiesRemaining > 0 && this.enemyCreeps.length < this.maxEnemiesOnScreen && now - this._lastAiSummon > 2500) {
        this._lastAiSummon = now;
        this.enemiesRemaining--;

        // 🚫 Find a safe, empty spawn tile in row 0 or row 1 (not on top of any obstacle)
        const candidateCols = [];
        for (let col = 0; col < MAP_GRID_SIZE; col++) {
          if (this.map[0][col] === TILE_EMPTY && this.map[1][col] === TILE_EMPTY) {
            // Also ensure no existing enemy is already at this position
            const tileX = col * this.tileSize + this.tileSize / 2;
            const alreadyOccupied = this.enemyCreeps.some(e => Math.abs(e.x - tileX) < this.tileSize);
            if (!alreadyOccupied) candidateCols.push(col);
          }
        }

        // Fallback to column 7 (center) if all candidate slots are occupied
        const spawnCol = candidateCols.length > 0
          ? candidateCols[Math.floor(Math.random() * candidateCols.length)]
          : 7;
        const spawnX = spawnCol * this.tileSize + this.tileSize / 2 - 17;

        const rand = Math.random();
        let type = 'bat';
        let hp = 2;
        let speed = 3.2;

        if (rand > 0.7) {
          type = 'dragon';
          hp = 8;
          speed = 2.0;
        } else if (rand > 0.4) {
          type = 'griffin';
          hp = 4;
          speed = 4.0;
        }

        this.enemyCreeps.push({
          id: 'e_' + Date.now() + '_' + Math.random(),
          type,
          x: spawnX,
          y: 20,
          width: 34,
          height: 34,
          hp,
          maxHp: hp,
          speed,
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

      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Bullet vs Map Tile Destruction (BRICK & STEEL)
      const minC = Math.floor(b.x / this.tileSize);
      const maxC = Math.floor((b.x + b.width) / this.tileSize);
      const minR = Math.floor(b.y / this.tileSize);
      const maxR = Math.floor((b.y + b.height) / this.tileSize);

      let hitWall = false;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (r >= 0 && r < MAP_GRID_SIZE && c >= 0 && c < MAP_GRID_SIZE) {
            const tile = this.map[r][c];
            if (tile === TILE_BRICK) {
              this.map[r][c] = TILE_EMPTY;
              hitWall = true;
            } else if (tile === TILE_STEEL) {
              if (b.isArmorPiercing) {
                this.map[r][c] = TILE_EMPTY;
              }
              hitWall = true;
            }
          }
        }
      }
      if (hitWall) {
        this.bullets.splice(i, 1);
        playWallBreakSound();
        continue;
      }

      // Check Bullet vs Base HQs (Friendly Fire Enabled!)
      if (b.isPlayer && this.mode === 'pvp' && this._rectOverlap(b, this.enemyBase)) {
        this.enemyBase.hp = Math.max(0, this.enemyBase.hp - 10);
        this.bullets.splice(i, 1);
        playHitImpactSound();
        continue;
      }
      
      if (this._rectOverlap(b, this.playerBase)) {
        this.playerBase.hp = Math.max(0, this.playerBase.hp - 10);
        this.bullets.splice(i, 1);
        playHitImpactSound();
        continue;
      }

      // Check Bullet vs Player Fighter
      if (!b.isPlayer && this._rectOverlap(b, this.player)) {
        if (!this.player.hasShield) {
          this.player.hp -= 1;
          playHitImpactSound();
          if (this.player.hp <= 0) {
            this.player.x = 120;
            this.player.y = 520;
            this.player.hp = 3;
            this.player.hasShield = true;
            this.player.shieldTime = Date.now() + 3000;
          }
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Player Bullet vs Enemy Creeps (With Physical Knockback & Flash)
      if (b.isPlayer) {
        for (let j = this.enemyCreeps.length - 1; j >= 0; j--) {
          const e = this.enemyCreeps[j];
          if (this._rectOverlap(b, e)) {
            e.hp -= (b.isArmorPiercing ? 2 : 1);

            const kx = b.vx > 0 ? 14 : (b.vx < 0 ? -14 : 0);
            const ky = b.vy > 0 ? 14 : (b.vy < 0 ? -14 : 0);
            e.x = Math.max(0, Math.min(this.width - e.width, e.x + kx));
            e.y = Math.max(0, Math.min(this.height - e.height, e.y + ky));
            e.hitTime = Date.now() + 140;

            this.bullets.splice(i, 1);

            if (e.hp <= 0) {
              this.enemyCreeps.splice(j, 1);
              this.score += 100;
              this.playerMana = Math.min(this.maxMana, this.playerMana + 25);
              playMonsterKillSound();
            } else {
              playHitImpactSound();
            }
            break;
          }
        }

        // Check Player Bullet vs Neutral Creeps
        for (let j = this.neutralCreeps.length - 1; j >= 0; j--) {
          const n = this.neutralCreeps[j];
          if (this._rectOverlap(b, n)) {
            n.hp -= 1;

            const kx = b.vx > 0 ? 14 : (b.vx < 0 ? -14 : 0);
            const ky = b.vy > 0 ? 14 : (b.vy < 0 ? -14 : 0);
            n.x = Math.max(0, Math.min(this.width - n.width, n.x + kx));
            n.y = Math.max(0, Math.min(this.height - n.height, n.y + ky));
            n.hitTime = Date.now() + 140;

            this.bullets.splice(i, 1);
            if (n.hp <= 0) {
              this.neutralCreeps.splice(j, 1);
              this.score += 150;
              this.playerMana = Math.min(this.maxMana, this.playerMana + 45);
              playMonsterKillSound();
            } else {
              playHitImpactSound();
            }
            break;
          }
        }
      }
    }
  }

  _checkWallCollision(x, y, w, h) {
    const rect = { x, y, width: w, height: h };
    if (this._rectOverlap(rect, this.playerBase) || (this.mode === 'pvp' && this._rectOverlap(rect, this.enemyBase))) {
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
      mode: this.mode,
      wave: this.wave,
      maxWaves: this.maxWaves,
      enemiesRemaining: this.enemiesRemaining,
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
