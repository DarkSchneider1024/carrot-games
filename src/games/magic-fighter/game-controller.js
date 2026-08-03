/**
 * Magic Fighter Battle Engine (魔法對戰戰術空戰核心)
 *
 * Classic Battle City / Tank Battalion reinvented with Magic Fighter Jets:
 * Protect Carrot Base, Destroy Brick/Steel Terrain, Spawn Waves of Enemy Jets, & Collect Power-ups!
 */

export const MAP_GRID_SIZE = 16; // 16x16 Grid
export const TILE_EMPTY = 0;
export const TILE_BRICK = 1;
export const TILE_STEEL = 2;
export const TILE_FOREST = 3;

export const POWERUP_DUAL_SHOT = 'dual_shot';
export const POWERUP_SHIELD = 'shield';
export const POWERUP_BOMB = 'bomb';
export const POWERUP_SPEED = 'speed';
export const POWERUP_BASE_FORTIFY = 'base_fortify';

export class MagicFighterGame {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 640;
    this.height = 640;
    this.tileSize = 40;

    this.running = false;
    this.gameOver = false;
    this.victory = false;
    this.score = 0;
    this.wave = 1;
    this.maxWaves = 5;

    // Player Jet State
    this.player = {
      x: 240,
      y: 560,
      width: 36,
      height: 36,
      speed: 3.5,
      direction: 'UP', // 'UP', 'DOWN', 'LEFT', 'RIGHT'
      hp: 3,
      maxHp: 3,
      hasShield: false,
      shieldTime: 0,
      dualShot: false,
      dualShotTime: 0,
      lastFireTime: 0,
      fireRate: 250, // ms
    };

    // Base State (Carrot Magic Crystal at Bottom Center)
    this.base = {
      x: 280,
      y: 580,
      width: 80,
      height: 40,
      hp: 1,
      maxHp: 1,
      destroyed: false,
    };

    // Arrays
    this.map = [];
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.particles = [];

    // Callbacks
    this.onStateChange = null;
    this.onGameOver = null;

    this._animFrame = null;
    this._lastTime = 0;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width || 640;
    this.height = canvas.height || 640;
    this.tileSize = this.width / MAP_GRID_SIZE;

    this.newGame();
  }

  newGame(wave = 1) {
    this.running = true;
    this.gameOver = false;
    this.victory = false;
    this.wave = wave;
    this.score = 0;

    // Reset Player
    this.player.x = (MAP_GRID_SIZE / 2 - 2) * this.tileSize;
    this.player.y = (MAP_GRID_SIZE - 2) * this.tileSize;
    this.player.hp = 3;
    this.player.direction = 'UP';
    this.player.hasShield = true;
    this.player.shieldTime = Date.now() + 3000;
    this.player.dualShot = false;

    // Reset Base
    this.base.destroyed = false;
    this.base.hp = 1;

    // Generate Map
    this._generateMap();

    // Spawn Enemy Wave
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.particles = [];
    this._spawnWave(this.wave);

    this._lastTime = performance.now();
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this.loop();
  }

  _generateMap() {
    this.map = Array(MAP_GRID_SIZE).fill(0).map(() => Array(MAP_GRID_SIZE).fill(TILE_EMPTY));

    // Base Fortress Protection Walls (Around Base at row 14-15, col 6-9)
    for (let r = 14; r < 16; r++) {
      for (let c = 6; c < 10; c++) {
        if (r === 14 && (c >= 6 && c <= 9)) this.map[r][c] = TILE_BRICK;
        if (r === 15 && (c === 6 || c === 9)) this.map[r][c] = TILE_BRICK;
      }
    }

    // Random Brick & Steel & Forest Blocks
    for (let r = 2; r < 13; r += 2) {
      for (let c = 1; c < 15; c += 2) {
        const rand = Math.random();
        if (rand < 0.55) {
          this.map[r][c] = TILE_BRICK;
          if (c + 1 < 15) this.map[r][c + 1] = TILE_BRICK;
        } else if (rand < 0.75) {
          this.map[r][c] = TILE_STEEL;
        } else if (rand < 0.90) {
          this.map[r][c] = TILE_FOREST;
        }
      }
    }
  }

  _spawnWave(waveNum) {
    const enemyCount = 4 + waveNum * 2;
    const spawnCols = [1, 5, 10, 14];

    for (let i = 0; i < enemyCount; i++) {
      const col = spawnCols[i % spawnCols.length];
      const isHeavy = i % 3 === 0;
      this.enemies.push({
        id: `e_${i}_${Date.now()}`,
        x: col * this.tileSize,
        y: -40 - (i * 65), // Staggered spawn
        width: 36,
        height: 36,
        speed: isHeavy ? 1.5 : 2.2,
        direction: 'DOWN',
        hp: isHeavy ? 2 : 1,
        maxHp: isHeavy ? 2 : 1,
        isHeavy,
        lastFire: 0,
        fireRate: isHeavy ? 1200 : 1800,
        changeDirTime: 0,
      });
    }
  }

  movePlayer(dir) {
    if (!this.running || this.gameOver) return;

    this.player.direction = dir;
    let nextX = this.player.x;
    let nextY = this.player.y;

    if (dir === 'UP') nextY -= this.player.speed;
    else if (dir === 'DOWN') nextY += this.player.speed;
    else if (dir === 'LEFT') nextX -= this.player.speed;
    else if (dir === 'RIGHT') nextX += this.player.speed;

    // Boundary Check
    nextX = Math.max(0, Math.min(this.width - this.player.width, nextX));
    nextY = Math.max(0, Math.min(this.height - this.player.height, nextY));

    // Collision with Walls
    if (!this._checkWallCollision(nextX, nextY, this.player.width, this.player.height)) {
      this.player.x = nextX;
      this.player.y = nextY;
    }

    // Check Powerup Pickups
    this._checkPowerupPickup();
  }

  firePlayerBullet() {
    if (!this.running || this.gameOver) return;
    const now = Date.now();
    if (now - this.player.lastFireTime < this.player.fireRate) return;

    this.player.lastFireTime = now;

    if (this.player.dualShot) {
      // Fire 2 parallel bullets
      this.bullets.push(
        this._createBullet(this.player.x + 4, this.player.y, this.player.direction, true),
        this._createBullet(this.player.x + this.player.width - 12, this.player.y, this.player.direction, true)
      );
    } else {
      const bx = this.player.x + this.player.width / 2 - 4;
      const by = this.player.y + this.player.height / 2 - 4;
      this.bullets.push(this._createBullet(bx, by, this.player.direction, true));
    }
  }

  _createBullet(x, y, dir, isPlayer) {
    return {
      x,
      y,
      width: 8,
      height: 8,
      speed: 7,
      direction: dir,
      isPlayer,
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

    // Check Shield & Powerup Timeouts
    if (this.player.hasShield && now > this.player.shieldTime) {
      this.player.hasShield = false;
    }
    if (this.player.dualShot && now > this.player.dualShotTime) {
      this.player.dualShot = false;
    }

    // Update Enemies AI
    this.enemies.forEach((e) => {
      if (e.y < 0) {
        e.y += e.speed; // Move onto screen
        return;
      }

      // Change Direction periodically
      if (now > e.changeDirTime) {
        const dirs = ['DOWN', 'DOWN', 'LEFT', 'RIGHT', 'UP'];
        e.direction = dirs[Math.floor(Math.random() * dirs.length)];
        e.changeDirTime = now + 1500 + Math.random() * 2000;
      }

      // Move Enemy
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
        e.direction = 'DOWN'; // Fallback towards base
      }

      // Enemy Fire
      if (now - e.lastFire > e.fireRate) {
        e.lastFire = now;
        this.bullets.push(this._createBullet(e.x + e.width / 2 - 4, e.y + e.height, 'DOWN', false));
      }
    });

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.direction === 'UP') b.y -= b.speed;
      else if (b.direction === 'DOWN') b.y += b.speed;
      else if (b.direction === 'LEFT') b.x -= b.speed;
      else if (b.direction === 'RIGHT') b.x += b.speed;

      // Out of Screen
      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Bullet vs Wall Collision
      const tileC = Math.floor((b.x + b.width / 2) / this.tileSize);
      const tileR = Math.floor((b.y + b.height / 2) / this.tileSize);

      if (tileR >= 0 && tileR < MAP_GRID_SIZE && tileC >= 0 && tileC < MAP_GRID_SIZE) {
        const tileType = this.map[tileR][tileC];
        if (tileType === TILE_BRICK) {
          this.map[tileR][tileC] = TILE_EMPTY; // Destroy Brick
          this._createExplosion(b.x, b.y, '#ff7544');
          this.bullets.splice(i, 1);
          continue;
        } else if (tileType === TILE_STEEL) {
          this._createExplosion(b.x, b.y, '#94a3b8');
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Bullet vs Base Collision
      if (this._rectOverlap(b, { x: 280, y: 580, width: 80, height: 40 })) {
        this.base.destroyed = true;
        this._createExplosion(320, 600, '#ef4444', 20);
        this._triggerGameOver(false, '蘿蔔水晶基地已被摧毀！');
        return;
      }

      // Player Bullet vs Enemy
      if (b.isPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          if (this._rectOverlap(b, enemy)) {
            enemy.hp--;
            this._createExplosion(b.x, b.y, '#ff70a6');
            this.bullets.splice(i, 1);

            if (enemy.hp <= 0) {
              this.score += enemy.isHeavy ? 200 : 100;
              this._createExplosion(enemy.x + 18, enemy.y + 18, '#ff7544', 15);

              // Chance to drop powerup
              if (Math.random() < 0.35) {
                this._dropPowerup(enemy.x, enemy.y);
              }

              this.enemies.splice(j, 1);

              // Check Wave Complete
              if (this.enemies.length === 0) {
                if (this.wave < this.maxWaves) {
                  this.wave++;
                  this._spawnWave(this.wave);
                  this.player.hasShield = true;
                  this.player.shieldTime = Date.now() + 2500;
                } else {
                  this.victory = true;
                  this._triggerGameOver(true, '🎉 全波次通關！戰鬥機空戰成功保護蘿蔔基地！');
                }
              }
            }
            break;
          }
        }
      } else {
        // Enemy Bullet vs Player
        if (this._rectOverlap(b, this.player)) {
          this.bullets.splice(i, 1);
          if (!this.player.hasShield) {
            this.player.hp--;
            this.player.hasShield = true;
            this.player.shieldTime = Date.now() + 2000;
            this._createExplosion(this.player.x + 18, this.player.y + 18, '#ef4444', 12);

            if (this.player.hp <= 0) {
              this._triggerGameOver(false, '戰機擊沉！遊戲結束');
              return;
            }
          }
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 3;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _dropPowerup(x, y) {
    const types = [POWERUP_DUAL_SHOT, POWERUP_SHIELD, POWERUP_BOMB, POWERUP_SPEED, POWERUP_BASE_FORTIFY];
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
        if (p.type === POWERUP_DUAL_SHOT) {
          this.player.dualShot = true;
          this.player.dualShotTime = now + 8000;
        } else if (p.type === POWERUP_SHIELD) {
          this.player.hasShield = true;
          this.player.shieldTime = now + 5000;
        } else if (p.type === POWERUP_BOMB) {
          // Clear all current enemy jets
          this.enemies.forEach((e) => this._createExplosion(e.x + 18, e.y + 18, '#ff70a6', 12));
          this.score += this.enemies.length * 100;
          this.enemies = [];
          if (this.wave < this.maxWaves) {
            this.wave++;
            this._spawnWave(this.wave);
          } else {
            this.victory = true;
            this._triggerGameOver(true, '🎉 魔法炸彈清場！完美勝利！');
          }
        } else if (p.type === POWERUP_SPEED) {
          this.player.speed = 5.0;
          setTimeout(() => (this.player.speed = 3.5), 8000);
        } else if (p.type === POWERUP_BASE_FORTIFY) {
          // Turn walls around base into steel for 8s
          for (let r = 14; r < 16; r++) {
            for (let c = 6; c < 10; c++) {
              if (this.map[r][c] !== TILE_EMPTY) this.map[r][c] = TILE_STEEL;
            }
          }
        }

        this.powerups.splice(i, 1);
      }
    }
  }

  _checkWallCollision(x, y, w, h) {
    const leftC = Math.floor(x / this.tileSize);
    const rightC = Math.floor((x + w - 1) / this.tileSize);
    const topR = Math.floor(y / this.tileSize);
    const bottomR = Math.floor((y + h - 1) / this.tileSize);

    for (let r = topR; r <= bottomR; r++) {
      for (let c = leftC; c <= rightC; c++) {
        if (r >= 0 && r < MAP_GRID_SIZE && c >= 0 && c < MAP_GRID_SIZE) {
          const tile = this.map[r][c];
          if (tile === TILE_BRICK || tile === TILE_STEEL) return true;
        }
      }
    }

    // Base Collision
    if (this._rectOverlap({ x, y, width: w, height: h }, { x: 280, y: 580, width: 80, height: 40 })) {
      return true;
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

  _createExplosion(x, y, color = '#ff7544', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
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
      gameOver: this.gameOver,
      victory: this.victory,
    };
  }

  destroy() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }
}
