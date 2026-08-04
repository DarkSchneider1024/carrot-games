/**
 * Three.js WebGL 3D Fighter & Magic Monsters Renderer
 *
 * Player: Detailed Futuristic Fighter Jet with Canopy, Twin Afterburners & Geodesic Shield.
 * Monsters (3D 魔法敵軍):
 * - 🦇 暗夜魔蝙蝠 (Basic Monster) — Deep Purple Body, Red Eyes, Flapping Wings
 * - 🦅 疾風鷹獅 (Fast Griffin) — Golden Beak Head, Lion Torso, Rapid Feather Wings
 * - 🐲 烈焰飛龍 (Heavy Wyvern Dragon) — Crimson Spiked Dragon, Horns, HP Color Shift
 * - 🌟 赤紅魔龍 (Red Carrier Dragon) — Pulsing Emissive Core
 */

import * as THREE from 'three';
import {
  MAP_GRID_SIZE,
  TILE_EMPTY,
  TILE_BRICK,
  TILE_STEEL,
  TILE_FOREST,
  TILE_ICE,
  TILE_WATER,
  POWERUP_SHIELD,
  POWERUP_CLOCK,
  POWERUP_BOMB,
  POWERUP_STAR,
  POWERUP_SHOVEL,
  POWERUP_LIFE
} from './game-controller.js';

export class FighterRenderer3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.playerGroup = null;
    this.enemyMeshes = new Map();
    this.bulletPool = [];
    this.powerupPool = [];
    this.terrainGroup = null;
    this.baseGroup = null;
    this.crystalMesh = null;

    this._lastMapHash = '';
    this.initialized = false;
  }

  init(container, width = 640, height = 640) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep Cyber Slate
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0007);

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2200);
    this.camera.position.set(320, 700, 660);
    this.camera.lookAt(320, 0, 320);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Static Shared Geometries & Materials
    const tileSize = 40;
    this.brickGeo = new THREE.BoxGeometry(tileSize - 2, 28, tileSize - 2);
    this.brickMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

    this.steelGeo = new THREE.BoxGeometry(tileSize - 2, 34, tileSize - 2);
    this.steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });

    this.iceGeo = new THREE.BoxGeometry(tileSize - 2, 4, tileSize - 2);
    this.iceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, roughness: 0.05 });

    this.waterGeo = new THREE.BoxGeometry(tileSize - 2, 6, tileSize - 2);
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.75, roughness: 0.1 });

    this.treeGeo = new THREE.ConeGeometry(16, 32, 6);
    this.treeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 });

    this.bulletGeo = new THREE.SphereGeometry(6, 8, 8);
    this.bulletPlayerMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    this.bulletPlayerPiercingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.bulletEnemyMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    this.powerupGeo = new THREE.OctahedronGeometry(14, 0);

    // High Brightness Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(320, 650, 450);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(0, 400, 0);
    this.scene.add(fillLight);

    // Arena Floor
    const floorGeo = new THREE.PlaneGeometry(640, 640);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(320, -1, 320);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Ground Grid Lines
    const gridHelper = new THREE.GridHelper(640, 16, 0xf97316, 0x334155);
    gridHelper.position.set(320, 0, 320);
    this.scene.add(gridHelper);

    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);

    // Build 3D Detailed Player Jet
    this._createPlayerJet3D();

    // Build 3D Base HQ
    this._createBase3D();

    this.initialized = true;
  }

  _createPlayerJet3D() {
    this.playerGroup = new THREE.Group();

    // Main Fuselage (Titanium Slate Body)
    const noseGeo = new THREE.ConeGeometry(12, 38, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.8 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.z = -10;
    this.playerGroup.add(noseMesh);

    // Glass Canopy Cockpit
    const canopyGeo = new THREE.SphereGeometry(8, 12, 12);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1
    });
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.scale.set(1, 0.7, 1.8);
    canopyMesh.position.set(0, 7, -6);
    this.playerGroup.add(canopyMesh);

    // Swept Main Wings with Orange Accents
    const wingGeo = new THREE.BoxGeometry(46, 3, 16);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.6 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.z = 2;
    this.playerGroup.add(wingMesh);

    // Wingtip Missile Launchers
    const launcherGeo = new THREE.CylinderGeometry(2, 2, 18, 6);
    const launcherMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });

    const leftLauncher = new THREE.Mesh(launcherGeo, launcherMat);
    leftLauncher.rotation.x = Math.PI / 2;
    leftLauncher.position.set(-22, 0, 2);
    this.playerGroup.add(leftLauncher);

    const rightLauncher = new THREE.Mesh(launcherGeo, launcherMat);
    rightLauncher.rotation.x = Math.PI / 2;
    rightLauncher.position.set(22, 0, 2);
    this.playerGroup.add(rightLauncher);

    // V-Tail Stabilizers
    const tailGeo = new THREE.BoxGeometry(3, 14, 12);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });

    const leftTail = new THREE.Mesh(tailGeo, tailMat);
    leftTail.rotation.z = -0.3;
    leftTail.position.set(-8, 8, 16);
    this.playerGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, tailMat);
    rightTail.rotation.z = 0.3;
    rightTail.position.set(8, 8, 16);
    this.playerGroup.add(rightTail);

    // Twin Afterburner Engine Thruster Lights
    const engineLight1 = new THREE.PointLight(0xf97316, 3.5, 80);
    engineLight1.position.set(-6, 3, 20);
    this.playerGroup.add(engineLight1);

    const engineLight2 = new THREE.PointLight(0xf97316, 3.5, 80);
    engineLight2.position.set(6, 3, 20);
    this.playerGroup.add(engineLight2);

    // Shield Geodesic Aura
    const shieldGeo = new THREE.SphereGeometry(28, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = false;
    this.playerGroup.add(this.shieldMesh);

    this.scene.add(this.playerGroup);
  }

  _createBase3D() {
    this.baseGroup = new THREE.Group();

    // Pedestal Fortress
    const pedGeo = new THREE.BoxGeometry(140, 20, 80);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.5 });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.set(320, 10, 590);
    pedMesh.castShadow = true;
    pedMesh.receiveShadow = true;
    this.baseGroup.add(pedMesh);

    // 3D Carrot Gemstone Crystal
    const cryGeo = new THREE.OctahedronGeometry(26, 0);
    const cryMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    this.crystalMesh = new THREE.Mesh(cryGeo, cryMat);
    this.crystalMesh.position.set(320, 40, 590);
    this.baseGroup.add(this.crystalMesh);

    const baseLight = new THREE.PointLight(0xf97316, 3.5, 160);
    baseLight.position.set(320, 45, 590);
    this.baseGroup.add(baseLight);

    this.scene.add(this.baseGroup);
  }

  _createEnemyMonsterMesh(type, isRedCarrier) {
    const monsterGroup = new THREE.Group();

    if (type === 'basic') {
      // 🦇 暗夜魔蝙蝠 (Dark Bat Monster)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isRedCarrier ? 0xef4444 : 0x6b21a8,
        emissive: isRedCarrier ? 0xef4444 : 0x3b0764,
        emissiveIntensity: isRedCarrier ? 0.7 : 0.2,
        roughness: 0.4
      });

      // Torso & Head
      const bodyGeo = new THREE.OctahedronGeometry(12, 1);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      monsterGroup.add(bodyMesh);

      // Glowing Eyes
      const eyeGeo = new THREE.SphereGeometry(2.5, 6, 6);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-4, 4, -10);
      monsterGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(4, 4, -10);
      monsterGroup.add(rightEye);

      // Flapping Membrane Wings
      const wingGeo = new THREE.BoxGeometry(22, 2, 14);
      const wingMat = new THREE.MeshStandardMaterial({ color: isRedCarrier ? 0xd97706 : 0x4c1d95, roughness: 0.5 });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-13, 0, 0);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(13, 0, 0);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat, leftWing, rightWing, monsterType: 'bat', isRedCarrier };

    } else if (type === 'fast') {
      // 🦅 疾風鷹獅 (Fast Griffin Monster)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isRedCarrier ? 0xef4444 : 0xd97706,
        emissive: isRedCarrier ? 0xef4444 : 0xb45309,
        emissiveIntensity: isRedCarrier ? 0.7 : 0.2,
        roughness: 0.3
      });

      // Lion Body
      const bodyGeo = new THREE.ConeGeometry(11, 32, 6);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.rotation.x = -Math.PI / 2;
      monsterGroup.add(bodyMesh);

      // Eagle Beak Head
      const beakGeo = new THREE.ConeGeometry(5, 12, 4);
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.1 });
      const beakMesh = new THREE.Mesh(beakGeo, beakMat);
      beakMesh.rotation.x = -Math.PI / 2;
      beakMesh.position.set(0, 2, -18);
      monsterGroup.add(beakMesh);

      // Feather Wings
      const wingGeo = new THREE.BoxGeometry(26, 2, 16);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-15, 2, -2);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(15, 2, -2);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat, leftWing, rightWing, monsterType: 'griffin', isRedCarrier };

    } else {
      // 🐲 烈焰飛龍 (Heavy Armor Wyvern Fire Dragon)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isRedCarrier ? 0xef4444 : 0x991b1b,
        emissive: isRedCarrier ? 0xef4444 : 0x7f1d1d,
        emissiveIntensity: isRedCarrier ? 0.8 : 0.3,
        roughness: 0.3,
        metalness: 0.5
      });

      // Dragon Spiked Body
      const bodyGeo = new THREE.CylinderGeometry(8, 13, 34, 6);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.rotation.x = -Math.PI / 2;
      monsterGroup.add(bodyMesh);

      // Dragon Horns
      const hornGeo = new THREE.ConeGeometry(3, 10, 4);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.rotation.x = -Math.PI / 3;
      leftHorn.position.set(-5, 7, -12);
      monsterGroup.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.rotation.x = -Math.PI / 3;
      rightHorn.position.set(5, 7, -12);
      monsterGroup.add(rightHorn);

      // Large Dragon Wings
      const wingGeo = new THREE.BoxGeometry(28, 3, 18);
      const wingMat = new THREE.MeshStandardMaterial({ color: isRedCarrier ? 0xf59e0b : 0xd97706, roughness: 0.4 });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-16, 2, -4);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(16, 2, -4);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat, leftWing, rightWing, monsterType: 'dragon', isRedCarrier };
    }

    return monsterGroup;
  }

  render(state) {
    if (!this.initialized) return;

    // 1. Player Jet Transformation
    const p = state.player;
    if (p && this.playerGroup) {
      this.playerGroup.position.set(p.x + p.width / 2, 18, p.y + p.height / 2);

      let targetRotY = 0;
      if (p.direction === 'DOWN') targetRotY = Math.PI;
      else if (p.direction === 'LEFT') targetRotY = Math.PI / 2;
      else if (p.direction === 'RIGHT') targetRotY = -Math.PI / 2;

      this.playerGroup.rotation.y = THREE.MathUtils.lerp(this.playerGroup.rotation.y, targetRotY, 0.2);
      this.playerGroup.rotation.z = THREE.MathUtils.lerp(this.playerGroup.rotation.z, -p.bankAngle, 0.2);

      if (this.shieldMesh) {
        this.shieldMesh.visible = p.hasShield;
        if (p.hasShield) this.shieldMesh.rotation.y += 0.06;
      }
    }

    // 2. Rotate Base HQ Crystal
    if (this.crystalMesh && !state.base.destroyed) {
      this.crystalMesh.rotation.y += 0.025;
      this.crystalMesh.position.y = 40 + Math.sin(Date.now() * 0.003) * 4;
    }

    // 3. DIRTY CHECK TERRAIN
    this._syncTerrainCached(state.map);

    // 4. Sync Monster Enemies
    this._syncEnemies(state.enemies);

    // 5. POOLED BULLETS
    this._syncBulletsPooled(state.bullets);

    // 6. POOLED POWERUPS
    this._syncPowerupsPooled(state.powerups);

    this.renderer.render(this.scene, this.camera);
  }

  _syncTerrainCached(map) {
    let currentHash = '';
    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        if (map[r][c] !== TILE_EMPTY) currentHash += `${r}_${c}_${map[r][c]};`;
      }
    }

    if (currentHash === this._lastMapHash) return;
    this._lastMapHash = currentHash;

    this.terrainGroup.clear();

    const tileSize = 40;
    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        const tile = map[r][c];
        if (tile === TILE_EMPTY) continue;

        const x = c * tileSize + tileSize / 2;
        const z = r * tileSize + tileSize / 2;

        if (tile === TILE_BRICK) {
          const mesh = new THREE.Mesh(this.brickGeo, this.brickMat);
          mesh.position.set(x, 14, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_STEEL) {
          const mesh = new THREE.Mesh(this.steelGeo, this.steelMat);
          mesh.position.set(x, 17, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_ICE) {
          const mesh = new THREE.Mesh(this.iceGeo, this.iceMat);
          mesh.position.set(x, 2, z);
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_WATER) {
          const mesh = new THREE.Mesh(this.waterGeo, this.waterMat);
          mesh.position.set(x, 3, z);
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_FOREST) {
          const mesh = new THREE.Mesh(this.treeGeo, this.treeMat);
          mesh.position.set(x, 16, z);
          this.terrainGroup.add(mesh);
        }
      }
    }
  }

  _syncEnemies(enemies) {
    const activeIds = new Set(enemies.map(e => e.id));

    for (const [id, mesh] of this.enemyMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.enemyMeshes.delete(id);
      }
    }

    const now = Date.now();

    enemies.forEach(e => {
      let mesh = this.enemyMeshes.get(e.id);
      if (!mesh) {
        mesh = this._createEnemyMonsterMesh(e.type, e.isRedCarrier);
        this.scene.add(mesh);
        this.enemyMeshes.set(e.id, mesh);
      }

      mesh.position.set(e.x + e.width / 2, 18, e.y + e.height / 2);

      let targetRotY = Math.PI;
      if (e.direction === 'UP') targetRotY = 0;
      else if (e.direction === 'LEFT') targetRotY = Math.PI / 2;
      else if (e.direction === 'RIGHT') targetRotY = -Math.PI / 2;

      mesh.rotation.y = targetRotY;

      // Animate Wing Flapping for Monsters
      const data = mesh.userData;
      if (data.leftWing && data.rightWing) {
        const flapSpeed = data.monsterType === 'griffin' ? 0.028 : 0.016;
        const flapAngle = Math.sin(now * flapSpeed) * 0.45;
        data.leftWing.rotation.z = flapAngle;
        data.rightWing.rotation.z = -flapAngle;
      }

      // Heavy Dragon Color Shift on Damage
      if (e.type === 'heavy' && data.bodyMat) {
        if (e.hp === 3) data.bodyMat.color.setHex(0x991b1b);
        else if (e.hp === 2) data.bodyMat.color.setHex(0xd97706);
        else if (e.hp === 1) data.bodyMat.color.setHex(0xef4444);
      }

      // Pulsing Emissive Light for Red Carrier Dragon
      if (e.isRedCarrier && data.bodyMat) {
        data.bodyMat.emissiveIntensity = 0.5 + Math.sin(now * 0.01) * 0.5;
      }
    });
  }

  _syncBulletsPooled(bullets) {
    this.bulletPool.forEach(m => (m.visible = false));

    bullets.forEach((b, i) => {
      let mesh = this.bulletPool[i];
      if (!mesh) {
        mesh = new THREE.Mesh(this.bulletGeo, this.bulletPlayerMat);
        this.scene.add(mesh);
        this.bulletPool.push(mesh);
      }

      mesh.material = b.isPlayer ? (b.isArmorPiercing ? this.bulletPlayerPiercingMat : this.bulletPlayerMat) : this.bulletEnemyMat;
      mesh.position.set(b.x + b.width / 2, 18, b.y + b.height / 2);
      mesh.visible = true;
    });
  }

  _syncPowerupsPooled(powerups) {
    this.powerupPool.forEach(m => (m.visible = false));

    powerups.forEach((p, i) => {
      let mesh = this.powerupPool[i];
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.6 });
        mesh = new THREE.Mesh(this.powerupGeo, mat);
        this.scene.add(mesh);
        this.powerupPool.push(mesh);
      }

      let color = 0xf97316;
      if (p.type === POWERUP_SHIELD) color = 0x38bdf8;
      else if (p.type === POWERUP_CLOCK) color = 0x06b6d4;
      else if (p.type === POWERUP_BOMB) color = 0xef4444;
      else if (p.type === POWERUP_STAR) color = 0xeab308;
      else if (p.type === POWERUP_SHOVEL) color = 0x94a3b8;
      else if (p.type === POWERUP_LIFE) color = 0xec4899;

      mesh.material.color.setHex(color);
      mesh.material.emissive.setHex(color);
      mesh.position.set(p.x + 14, 18, p.y + 14);
      mesh.rotation.y = Date.now() * 0.003;
      mesh.visible = true;
    });
  }

  setSize(width, height) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
