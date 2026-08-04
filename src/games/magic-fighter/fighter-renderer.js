/**
 * Magic Fighter Canvas Renderer
 * Renders Map, Walls, Carrot Base, Jet Sprites, Bullets, Shield & Explosion Particles.
 */

import {
  MAP_GRID_SIZE,
  TILE_EMPTY,
  TILE_BRICK,
  TILE_STEEL,
  TILE_FOREST,
  POWERUP_DUAL_SHOT,
  POWERUP_SHIELD,
  POWERUP_BOMB,
  POWERUP_SPEED,
  POWERUP_BASE_FORTIFY
} from './game-controller.js';

export class FighterRenderer {
  constructor() {
    this.playerImg = new Image();
    this.playerImg.src = './assets/images/player_fighter.png';

    this.enemyImg = new Image();
    this.enemyImg.src = './assets/images/enemy_fighter.png';
  }

  render(ctx, state, width, height) {
    if (!ctx) return;
    const tileSize = width / MAP_GRID_SIZE;

    // 1. Clear & Background Grid
    ctx.fillStyle = '#10172a';
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= MAP_GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tileSize, 0);
      ctx.lineTo(i * tileSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * tileSize);
      ctx.lineTo(width, i * tileSize);
      ctx.stroke();
    }

    // 2. Render Map Terrain (Bricks, Steel)
    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        const tile = state.map[r][c];
        const x = c * tileSize;
        const y = r * tileSize;

        if (tile === TILE_BRICK) {
          // Brick Pattern
          ctx.fillStyle = '#d97706';
          ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x + 3, y + 3, tileSize / 2 - 4, tileSize / 2 - 4);
          ctx.fillRect(x + tileSize / 2 + 1, y + tileSize / 2 + 1, tileSize / 2 - 4, tileSize / 2 - 4);
        } else if (tile === TILE_STEEL) {
          // Steel Pattern
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
        }
      }
    }

    // 3. Render Base (Carrot Magic Crystal at Bottom Center)
    const base = state.base;
    if (base) {
      if (!base.destroyed) {
        // Base Glowing Aura
        ctx.fillStyle = 'rgba(255, 117, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(base.x + base.width / 2, base.y + base.height / 2, 45, 0, Math.PI * 2);
        ctx.fill();

        // Carrot Crystal Pedestal
        ctx.fillStyle = '#ff7544';
        ctx.fillRect(base.x + 10, base.y + 10, base.width - 20, base.height - 15);
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🥕', base.x + base.width / 2, base.y + base.height / 2 + 8);
      } else {
        // Destroyed Base Skull
        ctx.fillStyle = '#334155';
        ctx.fillRect(base.x + 10, base.y + 10, base.width - 20, base.height - 15);
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥', base.x + base.width / 2, base.y + base.height / 2 + 8);
      }
    }

    // 4. Render Powerups
    state.powerups.forEach((p) => {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 16, 0, Math.PI * 2);
      ctx.fill();

      let icon = '⚡';
      if (p.type === POWERUP_SHIELD) icon = '🛡️';
      else if (p.type === POWERUP_BOMB) icon = '💣';
      else if (p.type === POWERUP_SPEED) icon = '💨';
      else if (p.type === POWERUP_BASE_FORTIFY) icon = '💎';

      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, p.x + p.width / 2, p.y + p.height / 2 + 6);
    });

    // 5. Render Enemy Fighter Jets
    state.enemies.forEach((e) => {
      ctx.save();
      ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

      // Rotation based on direction
      if (e.direction === 'UP') ctx.rotate(Math.PI);
      else if (e.direction === 'LEFT') ctx.rotate(Math.PI / 2);
      else if (e.direction === 'RIGHT') ctx.rotate(-Math.PI / 2);

      if (this.enemyImg.complete && this.enemyImg.naturalWidth !== 0) {
        ctx.drawImage(this.enemyImg, -e.width / 2, -e.height / 2, e.width, e.height);
      } else {
        // Fallback Enemy Triangle
        ctx.fillStyle = e.isHeavy ? '#a855f7' : '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, e.height / 2);
        ctx.lineTo(-e.width / 2, -e.height / 2);
        ctx.lineTo(e.width / 2, -e.height / 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });

    // 6. Render Player Fighter Jet
    const p = state.player;
    if (p) {
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

      if (p.direction === 'DOWN') ctx.rotate(Math.PI);
      else if (p.direction === 'LEFT') ctx.rotate(-Math.PI / 2);
      else if (p.direction === 'RIGHT') ctx.rotate(Math.PI / 2);

      if (this.playerImg.complete && this.playerImg.naturalWidth !== 0) {
        ctx.drawImage(this.playerImg, -p.width / 2, -p.height / 2, p.width, p.height);
      } else {
        // Fallback Player Triangle
        ctx.fillStyle = '#ff7544';
        ctx.beginPath();
        ctx.moveTo(0, -p.height / 2);
        ctx.lineTo(-p.width / 2, p.height / 2);
        ctx.lineTo(p.width / 2, p.height / 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // Render Player Shield Barrier
      if (p.hasShield) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 7. Render Forest Overlay (Over jets!)
    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        if (state.map[r][c] === TILE_FOREST) {
          const x = c * tileSize;
          const y = r * tileSize;
          ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🌲', x + tileSize / 2, y + tileSize / 2 + 6);
        }
      }
    }

    // 8. Render Bullets
    state.bullets.forEach((b) => {
      ctx.fillStyle = b.isPlayer ? '#38bdf8' : '#f43f5e';
      ctx.shadowColor = b.isPlayer ? '#38bdf8' : '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 9. Render Explosion Particles
    state.particles.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  }
}
