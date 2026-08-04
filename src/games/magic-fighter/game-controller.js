/**
 * Magic Fighter 3D Engine — Advanced Battle City Controller
 *
 * Full NES Battle City Classic Mechanics:
 * - Solid HQ Bounding Box & Boundaries (No Clipping)
 * - 6 Classic Powerups: Helmet, Clock, Bomb, Star Upgrade, Shovel HQ Fortify, Extra Life
 * - Terrain Types: Brick, Steel, Forest (Grass), Ice (Slide Friction), Water (Bullets pass, Planes blocked)
 * - 4 Enemy Variants: Basic, Fast, Heavy Armor (3 HP color shift), Red Flashing Power Jet
 */

export const MAP_GRID_SIZE = 16; // 16x16 Grid
export const TILE_EMPTY = 0;
export const TILE_BRICK = 1;
export const TILE_STEEL = 2;
export const TILE_FOREST = 3;
export const TILE_ICE = 4;
export const TILE_WATER = 5;

export const POWERUP_SHIELD = 'shield';     // Helmet (Invincible 8s)
export const POWERUP_CLOCK = 'clock';       // Freeze all enemies 6s
export const POWERUP_BOMB = 'bomb';         // Grenade (Destroy all active enemies)
export const POWERUP_STAR = 'star';         // Firepower Level +1 (Speed -> Dual -> Armor Piercing)
export const POWERUP_SHOVEL = 'shovel';     // HQ Steel Fortification 15s
export const POWERUP_LIFE = 'life';         // Extra Life HP +1

export class MagicFighterGame {
  constructor() {
    this.width = 640;
    this.height = 640;
    this.tileSize = 40;

    this.running = false;
    this.gameOver = false;
    this.victory = false;
    this.score = 0;
    this.wave = 1;
    this.maxWaves = 5;
    this.enemiesRemaining = 16;
    this.maxEnemiesOnScreen = 4;

    // Player State
    this.player = {
      x: 160, // Col 4
      y: 560, // Row 14
      width: 34,
      height: 34,
      speed: 6.0,
      direction: 'UP',
      vx: 0,
      vy: 0,
      bankAngle: 0,
      hp: 3,
      maxHp: 5,
      hasShield: true,
      shieldTime: 0,
      starLevel: 0, // 0: Normal, 1: Fast Shot, 2: Dual Shot, 3: Armor Piercing Shot
      lastFireTime: 0,
      fireRate: 180,
      isInForest: false,
      isShiftingOnIce: false,
    };

    // Solid HQ Base Structure
    this.base = {
      x: 240,
      y: 540,
      width: 160,
      height: 100,
      hp: 1,
      destroyed: false,
    };

    this.freezeEnemiesTime = 0;
    this.fortifyHqTime = 0;

    this.map = [];
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.particles = [];

    this.onStateChange = null;
    this.onGameOver = null;

    this._animFrame = null;
    this._lastTime = 0;
  }

  init(canvas) {
    this.width = canvas?.width || 640;
    this.height = canvas?.height || 640;
    this.tileSize = this.width / MAP_GRID_SIZE;

    this.newGame();
  }

  newGame(wave = 1) {
    this.running = true;
    this.gameOver = false;
    this.victory = false;
    this.wave = wave;
    this.score = 0;
    this.enemiesRemaining = 12 + wave * 4; // e.g. 16 for wave 1

    // Reset Player
    this.player.x = 4 * this.tileSize;
    this.player.y = 14 * this.tileSize;
    this.player.hp = 3;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.speed = 6.0;
    this.player.direction = 'UP';
    this.player.hasShield = true;
    this.player.shieldTime = Date.now() + 4000;
    this.player.starLevel = 0;

    // Reset Base
    this.base.destroyed = false;
    this.base.hp = 1;
    this.freezeEnemiesTime = 0;
    this.fortifyHqTime = 0;

    // Generate Map
    this._generateMap();

    // Reset Arrays
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.particles = [];

    this._lastTime = performance.now();
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this.loop();
  }

  _generateMap() {
    this.map = Array(MAP_GRID_SIZE).fill(0).map(() => Array(MAP_GRID_SIZE).fill(TILE_EMPTY));

    // Base Protection Walls (Around Base at row 13-15, col 5-10)
    for (let c = 5; c <= 10; c++) {
      this.map[13][c] = TILE_BRICK;
    }
    this.map[14][5] = TILE_BRICK;
    this.map[15][5] = TILE_BRICK;
    this.map[14][10] = TILE_BRICK;
    this.map[15][10] = TILE_BRICK;

    // Add Ice & Water Zones
    // Ice Slippery Zone (row 6-7, col 2-5)
    for (let r = 6; r <= 7; r++) {
      for (let c = 2; c <= 5; c++) {
        this.map[r][c] = TILE_ICE;
      }
    }

    // Water Zone (row 6-7, col 10-13)
    for (let r = 6; r <= 7; r++) {
      for (let c = 10; c <= 13; c++) {
        this.map[r][c] = TILE_WATER;
      }
    }

    // Forest Grass Hiding Zones (row 3-4, col 4-6 & col 9-11)
    for (let r = 3; r <= 4; r++) {
      for (let c = 4; c <= 6; c++) this.map[r][c] = TILE_FOREST;
      for (let c = 9; c <= 11; c++) this.map[r][c] = TILE_FOREST;
    }

    // Random Brick & Steel Cubes
    for (let r = 1; r < 12; r += 2) {
      for (let c = 1; c < 15; c += 2) {
        if (this.map[r][c] !== TILE_EMPTY) continue;
        const rand = Math.random();
        if (rand < 0.50) {
          this.map[r][c] = TILE_BRICK;
          if (c + 1 < 15 && this.map[r][c + 1] === TILE_EMPTY) this.map[r][c + 1] = TILE_BRICK;
        } else if (rand < 0.70) {
          this.map[r][c] = TILE_STEEL;
        }
      }
    }

    // FORCE CLEAR Player Runway (col 3..4, row 13..15)
    for (let r = 13; r <= 15; r++) {
      for (let c = 3; c <= 4; c++) {
        this.map[r][c] = TILE_EMPTY;
      }
    }
  }

  movePlayerVector(vx, vy) {
    if (!this.running || this.gameOver) return;

    this.player.vx = vx * this.player.speed;
    this.player.vy = vy * this.player.speed;

    if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      this.player.bankAngle = vx * 0.4;
      if (Math.abs(vx) > Math.abs(vy)) {
        this.player.direction = vx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        this.player.direction = vy > 0 ? 'DOWN' : 'UP';
      }
    } else {
      this.player.bankAngle *= 0.8;
    }
  }

  stopPlayer() {
    this.player.vx = 0;
    this.player.vy = 0;
  }

  firePlayerBullet() {
    if (!this.running || this.gameOver) return;
    const now = Date.now();
    if (now - this.player.lastFireTime < this.player.fireRate) return;

    this.player.lastFireTime = now;
    const isArmorPiercing = this.player.starLevel >= 3;

    if (this.player.starLevel >= 2) { // Dual Cannon
      this.bullets.push(
        this._createBullet(this.player.x + 2, this.player.y, this.player.direction, true, isArmorPiercing),
        this._createBullet(this.player.x + this.player.width - 12, this.player.y, this.player.direction, true, isArmorPiercing)
      );
    } else {
      const bx = this.player.x + this.player.width / 2 - 5;
      const by = this.player.y + this.player.height / 2 - 5;
      this.bullets.push(this._createBullet(bx, by, this.player.direction, true, isArmorPiercing));
    }
  }

  _createBullet(x, y, dir, isPlayer, isArmorPiercing = false) {
    return {
      x,
      y,
      width: 10,
      height: 10,
      speed: isPlayer ? 10 : 6.5,
      direction: dir,
      isPlayer,
      isArmorPiercing,
    };
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    this.update(dt);

    if (this.onStateChange) this.onStateChange(this.getState());

    this._animFrame = requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    if (this.gameOver) return;

    const now = Date.now();

    // 1. Maintain Active Enemy Queue
    if (this.enemies.length < this.maxEnemiesOnScreen && this.enemiesRemaining > this.enemies.length) {
      this._spawnEnemy();
    }

    // 2. Handle HQ Fortify Timer & Wall Restores
    if (this.fortifyHqTime > 0 && now > this.fortifyHqTime) {
      this.fortifyHqTime = 0;
      // Revert HQ protection walls back to Brick
      for (let c = 5; c <= 10; c++) {
        if (this.map[13][c] === TILE_STEEL) this.map[13][c] = TILE_BRICK;
      }
      if (this.map[14][5] === TILE_STEEL) this.map[14][5] = TILE_BRICK;
      if (this.map[15][5] === TILE_STEEL) this.map[15][5] = TILE_BRICK;
      if (this.map[14][10] === TILE_STEEL) this.map[14][10] = TILE_BRICK;
      if (this.map[15][10] === TILE_STEEL) this.map[15][10] = TILE_BRICK;
    }

    // 3. Player Movement & Terrain Check
    if (Math.abs(this.player.vx) > 0.01 || Math.abs(this.player.vy) > 0.01) {
      let nextX = this.player.x + this.player.vx;
      let nextY = this.player.y + this.player.vy;

      nextX = Math.max(0, Math.min(this.width - this.player.width, nextX));
      nextY = Math.max(0, Math.min(this.height - this.player.height, nextY));

      if (!this._checkWallCollision(nextX, nextY, this.player.width, this.player.height)) {
        this.player.x = nextX;
        this.player.y = nextY;
      }

      // Check Forest & Ice
      const centerC = Math.floor((this.player.x + 17) / this.tileSize);
      const centerR = Math.floor((this.player.y + 17) / this.tileSize);
      if (centerR >= 0 && centerR < MAP_GRID_SIZE && centerC >= 0 && centerC < MAP_GRID_SIZE) {
        this.player.isInForest = this.map[centerR][centerC] === TILE_FOREST;
        this.player.isShiftingOnIce = this.map[centerR][centerC] === TILE_ICE;
      } else {
        this.player.isInForest = false;
        this.player.isShiftingOnIce = false;
      }

      this._checkPowerupPickup();
    }

    // Shield Timer
    if (this.player.hasShield && now > this.player.shieldTime) {
      this.player.hasShield = false;
    }

    // 4. Enemies AI Update (If not frozen by Clock)
    const isEnemiesFrozen = now < this.freezeEnemiesTime;
    if (!isEnemiesFrozen) {
      this.enemies.forEach((e) => {
        if (e.y < 0) {
          e.y += e.speed;
          return;
        }

        if (now > e.changeDirTime) {
          const dirs = ['DOWN', 'DOWN', 'LEFT', 'RIGHT', 'DOWN', 'UP'];
          e.direction = dirs[Math.floor(Math.random() * dirs.length)];
          e.changeDirTime = now + 1000 + Math.random() * 1500;
        }

        let nextX = e.x;
        let nextY = e.y;
        if (e.direction === 'UP') nextY -= e.speed;
        else if (e.direction === 'DOWN') nextY += e.speed;
        else if (e.direction === 'LEFT') nextX -= e.speed;
        else if (e.direction === 'RIGHT') nextX += e.speed;

        nextX = Math.max(0, Math.min(this.width - e.width, nextX));
        nextY = Math.max(0, Math.min(this.height - e.height, nextY));

        if (!this._checkWallCollision(nextX, nextY, e.width, e.height)) {
          e.x = nextX;
          e.y = nextY;
        } else {
          e.direction = 'DOWN';
        }

        if (now - e.lastFire > e.fireRate) {
          e.lastFire = now;
          this.bullets.push(this._createBullet(e.x + e.width / 2 - 5, e.y + e.height, 'DOWN', false));
        }
      });
    }

    // 5. Update Bullets & Collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.direction === 'UP') b.y -= b.speed;
      else if (b.direction === 'DOWN') b.y += b.speed;
      else if (b.direction === 'LEFT') b.x -= b.speed;
      else if (b.direction === 'RIGHT') b.x += b.speed;

      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Tile Collision (Brick or Steel)
      const tileC = Math.floor((b.x + b.width / 2) / this.tileSize);
      const tileR = Math.floor((b.y + b.height / 2) / this.tileSize);

      if (tileR >= 0 && tileR < MAP_GRID_SIZE && tileC >= 0 && tileC < MAP_GRID_SIZE) {
        const tileType = this.map[tileR][tileC];
        if (tileType === TILE_BRICK) {
          this.map[tileR][tileC] = TILE_EMPTY;
          this._createExplosion(b.x, b.y, '#f97316', 12);
          this.bullets.splice(i, 1);
          continue;
        } else if (tileType === TILE_STEEL) {
          if (b.isArmorPiercing) {
            this.map[tileR][tileC] = TILE_EMPTY; // Piercing bullet destroys steel!
            this._createExplosion(b.x, b.y, '#38bdf8', 16);
          } else {
            this._createExplosion(b.x, b.y, '#cbd5e1', 6);
          }
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Check HQ Solid Collision
      if (this._rectOverlap(b, this.base)) {
        this.base.destroyed = true;
        this._createExplosion(320, 590, '#ef4444', 30);
        this._triggerGameOver(false, '蘿蔔 HQ 水晶總部已毀懷！戰局失敗');
        return;
      }

      // Player Bullet -> Enemy Collision
      if (b.isPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          if (this._rectOverlap(b, enemy)) {
            enemy.hp--;
            this._createExplosion(b.x, b.y, '#ff70a6', 10);
            this.bullets.splice(i, 1);

            if (enemy.hp <= 0) {
              this.score += enemy.type === 'heavy' ? 400 : (enemy.type === 'fast' ? 200 : 100);
              this.enemiesRemaining--;
              this._createExplosion(enemy.x + 17, enemy.y + 17, '#f97316', 22);

              if (enemy.isRedCarrier || Math.random() < 0.35) {
                this._dropPowerup(enemy.x, enemy.y);
              }

              this.enemies.splice(j, 1);

              if (this.enemiesRemaining <= 0 && this.enemies.length === 0) {
                if (this.wave < this.maxWaves) {
                  this.wave++;
                  this.enemiesRemaining = 12 + this.wave * 4;
                  this.player.hasShield = true;
                  this.player.shieldTime = Date.now() + 3500;
                } else {
                  this.victory = true;
                  this._triggerGameOver(true, '全波次 3D 魔法戰機通關！成功守護蘿蔔 HQ 總部！');
                }
              }
            }
            break;
          }
        }
      } else {
        // Enemy Bullet -> Player Collision
        if (this._rectOverlap(b, this.player)) {
          this.bullets.splice(i, 1);
          if (!this.player.hasShield) {
            this.player.hp--;
            this.player.hasShield = true;
            this.player.shieldTime = Date.now() + 2500;
            this._createExplosion(this.player.x + 17, this.player.y + 17, '#ef4444', 18);

            if (this.player.hp <= 0) {
              this._triggerGameOver(false, '戰機擊沉！3D 遊戲結束');
              return;
            }
          }
        }
      }
    }

    // 6. Update Particle Shards
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 3;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _spawnEnemy() {
    const spawnCols = [1, 5, 10, 14];
    const col = spawnCols[Math.floor(Math.random() * spawnCols.length)];
    const randType = Math.random();

    let type = 'basic';
    let hp = 1;
    let speed = 3.2;
    let fireRate = 1400;
    let isRedCarrier = Math.random() < 0.25; // 25% chance for Red Powerup Carrier!

    if (randType < 0.30) {
      type = 'fast';
      speed = 4.8;
      fireRate = 1100;
    } else if (randType < 0.55) {
      type = 'heavy';
      hp = 3;
      speed = 2.2;
      fireRate = 900;
    }

    this.enemies.push({
      id: `e_${Date.now()}_${Math.random()}`,
      x: col * this.tileSize,
      y: -40,
      width: 34,
      height: 34,
      type,
      hp,
      maxHp: hp,
      speed,
      direction: 'DOWN',
      lastFire: 0,
      fireRate,
      changeDirTime: 0,
      isRedCarrier,
    });
  }

  _dropPowerup(x, y) {
    const types = [POWERUP_SHIELD, POWERUP_CLOCK, POWERUP_BOMB, POWERUP_STAR, POWERUP_SHOVEL, POWERUP_LIFE];
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerups.push({
      x,
      y,
      width: 28,
      height: 28,
      type,
    });
  }

  _checkPowerupPickup() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      if (this._rectOverlap(this.player, p)) {
        const now = Date.now();
        if (p.type === POWERUP_SHIELD) {
          this.player.hasShield = true;
          this.player.shieldTime = now + 8000;
        } else if (p.type === POWERUP_CLOCK) {
          this.freezeEnemiesTime = now + 6000; // Freeze 6s
        } else if (p.type === POWERUP_BOMB) { // Grenade Nuke
          this.enemies.forEach((e) => {
            this._createExplosion(e.x + 17, e.y + 17, '#f97316', 18);
          });
          this.score += this.enemies.length * 150;
          this.enemiesRemaining -= this.enemies.length;
          this.enemies = [];
        } else if (p.type === POWERUP_STAR) { // Firepower Upgrade
          this.player.starLevel = Math.min(3, this.player.starLevel + 1);
        } else if (p.type === POWERUP_SHOVEL) { // HQ Steel Fortification 15s
          this.fortifyHqTime = now + 15000;
          for (let c = 5; c <= 10; c++) {
            this.map[13][c] = TILE_STEEL;
          }
          this.map[14][5] = TILE_STEEL;
          this.map[15][5] = TILE_STEEL;
          this.map[14][10] = TILE_STEEL;
          this.map[15][10] = TILE_STEEL;
        } else if (p.type === POWERUP_LIFE) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        }

        this.powerups.splice(i, 1);
      }
    }
  }

  _checkWallCollision(x, y, w, h) {
    const rect = { x, y, width: w, height: h };

    // 1. Solid HQ Base Collision Check (Prevent Plane Clipping into Base)
    if (this._rectOverlap(rect, this.base)) {
      return true;
    }

    // 2. Tile Grid Collision Check
    const leftC = Math.floor(x / this.tileSize);
    const rightC = Math.floor((x + w - 1) / this.tileSize);
    const topR = Math.floor(y / this.tileSize);
    const bottomR = Math.floor((y + h - 1) / this.tileSize);

    for (let r = topR; r <= bottomR; r++) {
      for (let c = leftC; c <= rightC; c++) {
        if (r >= 0 && r < MAP_GRID_SIZE && c >= 0 && c < MAP_GRID_SIZE) {
          const tile = this.map[r][c];
          // Brick, Steel, Water block movement!
          if (tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER) return true;
        }
      }
    }

    return false;
  }

  _rectOverlap(r1, r2) {
    return !(
      r1.x + r1.width < r2.x ||
      r1.x > r2.x + r2.width ||
      r1.y + r1.height < r2.y ||
      r1.y > r2.y + r2.height
    );
  }

  _createExplosion(x, y, color = '#f97316', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
      });
    }
  }

  _triggerGameOver(victory, reason) {
    this.running = false;
    this.gameOver = true;
    this.victory = victory;

    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this.onGameOver) this.onGameOver({ victory, score: this.score, reason });
  }

  getState() {
    return {
      player: this.player,
      base: this.base,
      map: this.map,
      enemies: this.enemies,
      bullets: this.bullets,
      powerups: this.powerups,
      particles: this.particles,
      score: this.score,
      wave: this.wave,
      maxWaves: this.maxWaves,
      enemiesRemaining: this.enemiesRemaining,
      freezeEnemiesTime: this.freezeEnemiesTime,
      fortifyHqTime: this.fortifyHqTime,
      gameOver: this.gameOver,
      victory: this.victory,
    };
  }

  destroy() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }
}
