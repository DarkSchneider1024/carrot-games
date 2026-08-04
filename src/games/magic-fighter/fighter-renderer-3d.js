/**
 * Three.js WebGL 3D Fighter & MOBA Strategy Renderer
 *
 * Environment: Bright Blue Sky aerial dogfight world with floating clouds & sunlight.
 * Base Towers: Floating Castles in the Sky (天空之城 - 懸浮城堡堡壘) with spires, battlements, & floating magic crystals.
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
    this.playerCreepMeshes = new Map();
    this.bulletPool = [];
    this.powerupPool = [];
    this.terrainGroup = null;
    this.cloudsGroup = null;
    this.playerBaseGroup = null;
    this.enemyBaseGroup = null;
    this.playerCrystalMesh = null;
    this.enemyCrystalMesh = null;

    this._lastMapHash = '';
    this.initialized = false;
  }

  init(container, width = 640, height = 640) {
    this.scene = new THREE.Scene();

    // Bright Azure Blue Sky World
    this.scene.background = new THREE.Color(0x7dd3fc); // Vibrant Sky Blue
    this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0006); // Soft Horizon Fog

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2500);
    this.camera.position.set(320, 720, 660);
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
    this.iceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, roughness: 0.05 });

    this.waterGeo = new THREE.BoxGeometry(tileSize - 2, 6, tileSize - 2);
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8, roughness: 0.1 });

    this.treeGeo = new THREE.ConeGeometry(16, 32, 6);
    this.treeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.9 });

    this.bulletGeo = new THREE.SphereGeometry(6, 8, 8);
    this.bulletPlayerMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    this.bulletPlayerPiercingMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    this.bulletEnemyMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    this.powerupGeo = new THREE.OctahedronGeometry(14, 0);

    // Bright Sky Sunlight Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(320, 750, 450);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x0284c7, 1.2);
    this.scene.add(hemiLight);

    // Aerial Sky Platform Floor
    const floorGeo = new THREE.PlaneGeometry(640, 640);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5, metalness: 0.2 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(320, -1, 320);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Bright White Grid Helper
    const gridHelper = new THREE.GridHelper(640, 16, 0xffffff, 0x0284c7);
    gridHelper.position.set(320, 0, 320);
    this.scene.add(gridHelper);

    // Build Floating Clouds around aerial sky realm
    this._createSkyClouds();

    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);

    // Build 3D Detailed Player Jet
    this._createPlayerJet3D();

    // Build Floating Sky Castles in the Sky (天空之城主塔)
    this._createSkyCastles3D();

    this.initialized = true;
  }

  _createSkyClouds() {
    this.cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85
    });

    const cloudPositions = [
      { x: -100, y: -40, z: 100, s: 90 },
      { x: 740, y: -40, z: 200, s: 110 },
      { x: -150, y: -30, z: 500, s: 120 },
      { x: 780, y: -30, z: 550, s: 100 },
      { x: 320, y: -60, z: -150, s: 150 },
      { x: 320, y: -60, z: 780, s: 150 }
    ];

    cloudPositions.forEach(cp => {
      const cloudGeo = new THREE.SphereGeometry(cp.s, 8, 8);
      const mesh = new THREE.Mesh(cloudGeo, cloudMat);
      mesh.position.set(cp.x, cp.y, cp.z);
      this.cloudsGroup.add(mesh);
    });

    this.scene.add(this.cloudsGroup);
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

  /**
   * Build Floating Sky Castles in the Sky (天空之城 - 主塔)
   */
  _createSkyCastles3D() {
    // 1. Player Sky Castle (Bottom, Cyan/White Laputa)
    const pCastle = this._createFloatingCastleMesh(false);
    pCastle.position.set(320, 0, 590);
    this.playerBaseGroup = pCastle;
    this.playerCrystalMesh = pCastle.userData.crystalMesh;
    this.scene.add(pCastle);

    // 2. Enemy Sky Castle (Top, Obsidian/Crimson Dark Laputa)
    const eCastle = this._createFloatingCastleMesh(true);
    eCastle.position.set(320, 0, 50);
    this.enemyBaseGroup = eCastle;
    this.enemyCrystalMesh = eCastle.userData.crystalMesh;
    this.scene.add(eCastle);
  }

  _createFloatingCastleMesh(isEnemy = false) {
    const castleGroup = new THREE.Group();

    // Floating Rock Island Foundation (天空之城懸浮島基石)
    const islandGeo = new THREE.CylinderGeometry(70, 20, 30, 8);
    const islandMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x1e293b : 0x475569,
      roughness: 0.8
    });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.set(0, -10, 0);
    islandMesh.castShadow = true;
    islandMesh.receiveShadow = true;
    castleGroup.add(islandMesh);

    // Castle Main Citadel Keep (主城堡中心)
    const keepGeo = new THREE.BoxGeometry(90, 24, 60);
    const keepMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x334155 : 0xf8fafc,
      roughness: 0.3
    });
    const keepMesh = new THREE.Mesh(keepGeo, keepMat);
    keepMesh.position.set(0, 12, 0);
    keepMesh.castShadow = true;
    keepMesh.receiveShadow = true;
    castleGroup.add(keepMesh);

    // 4 Corner Gothic Spire Towers (四角哥德式高塔)
    const spireGeo = new THREE.CylinderGeometry(10, 12, 36, 8);
    const roofGeo = new THREE.ConeGeometry(12, 20, 8);
    const roofMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0xb91c1c : 0x0284c7,
      roughness: 0.2
    });

    const towerOffsets = [
      { x: -40, z: -25 },
      { x: 40, z: -25 },
      { x: -40, z: 25 },
      { x: 40, z: 25 }
    ];

    towerOffsets.forEach(pos => {
      const spire = new THREE.Mesh(spireGeo, keepMat);
      spire.position.set(pos.x, 18, pos.z);
      spire.castShadow = true;
      castleGroup.add(spire);

      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(pos.x, 44, pos.z);
      roof.castShadow = true;
      castleGroup.add(roof);
    });

    // Central Royal Castle Dome & Floating Power Crystal (天空巨型魔法水晶)
    const cryGeo = new THREE.OctahedronGeometry(22, 0);
    const cryMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0xef4444 : 0x38bdf8,
      emissive: isEnemy ? 0xef4444 : 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9
    });
    const crystalMesh = new THREE.Mesh(cryGeo, cryMat);
    crystalMesh.position.set(0, 52, 0);
    crystalMesh.castShadow = true;
    castleGroup.add(crystalMesh);

    const cLight = new THREE.PointLight(isEnemy ? 0xef4444 : 0x38bdf8, 4.0, 180);
    cLight.position.set(0, 55, 0);
    castleGroup.add(cLight);

    castleGroup.userData = { crystalMesh };
    return castleGroup;
  }

  _createMonsterMesh(type, isFriendly = false) {
    const monsterGroup = new THREE.Group();

    if (type === 'bat') {
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x38bdf8 : 0x6b21a8,
        emissive: isFriendly ? 0x0284c7 : 0x3b0764,
        emissiveIntensity: 0.3,
        roughness: 0.4
      });

      const bodyGeo = new THREE.OctahedronGeometry(12, 1);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      monsterGroup.add(bodyMesh);

      const wingGeo = new THREE.BoxGeometry(22, 2, 14);
      const wingMat = new THREE.MeshStandardMaterial({ color: isFriendly ? 0x0284c7 : 0x4c1d95, roughness: 0.5 });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-13, 0, 0);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(13, 0, 0);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat, leftWing, rightWing, monsterType: 'bat' };

    } else if (type === 'griffin') {
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x2ec4b6 : 0xd97706,
        emissive: isFriendly ? 0x2ec4b6 : 0xb45309,
        emissiveIntensity: 0.3,
        roughness: 0.3
      });

      const bodyGeo = new THREE.ConeGeometry(11, 32, 6);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.rotation.x = isFriendly ? Math.PI / 2 : -Math.PI / 2;
      monsterGroup.add(bodyMesh);

      const wingGeo = new THREE.BoxGeometry(26, 2, 16);
      const wingMat = new THREE.MeshStandardMaterial({ color: isFriendly ? 0x3a86ff : 0xf59e0b, roughness: 0.3 });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-15, 2, 0);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(15, 2, 0);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat, leftWing, rightWing, monsterType: 'griffin' };

    } else {
      // Dragon
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x3a86ff : 0x991b1b,
        emissive: isFriendly ? 0x3a86ff : 0x7f1d1d,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.5
      });

      const bodyGeo = new THREE.CylinderGeometry(8, 13, 34, 6);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.rotation.x = isFriendly ? Math.PI / 2 : -Math.PI / 2;
      monsterGroup.add(bodyMesh);

      const wingGeo = new THREE.BoxGeometry(28, 3, 18);
      const wingMat = new THREE.MeshStandardMaterial({ color: isFriendly ? 0x2ec4b6 : 0xd97706, roughness: 0.4 });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-16, 2, 0);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(16, 2, 0);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat, leftWing, rightWing, monsterType: 'dragon' };
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

    // 2. Rotate Sky Castle Crystals
    const now = Date.now();
    if (this.playerCrystalMesh && !state.playerBase.destroyed) {
      this.playerCrystalMesh.rotation.y += 0.025;
      this.playerCrystalMesh.position.y = 52 + Math.sin(now * 0.003) * 4;
    }
    if (this.enemyCrystalMesh && !state.enemyBase.destroyed) {
      this.enemyCrystalMesh.rotation.y -= 0.025;
      this.enemyCrystalMesh.position.y = 52 + Math.sin(now * 0.003 + 1) * 4;
    }

    // 3. DIRTY CHECK TERRAIN
    this._syncTerrainCached(state.map);

    // 4. Sync Friendly Summoned Creeps (Marching UP)
    this._syncCreepsMap(this.playerCreepMeshes, state.playerCreeps, true);

    // 5. Sync Enemy & Neutral Monsters (Marching DOWN / Jungle)
    this._syncCreepsMap(this.enemyMeshes, state.enemies, false);

    // 6. POOLED BULLETS
    this._syncBulletsPooled(state.bullets);

    // 7. POOLED POWERUPS
    this._syncPowerupsPooled(state.powerups);

    this.renderer.render(this.scene, this.camera);
  }

  _syncCreepsMap(meshMap, list, isFriendly) {
    const activeIds = new Set(list.map(e => e.id));

    for (const [id, mesh] of meshMap.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        meshMap.delete(id);
      }
    }

    const now = Date.now();

    list.forEach(e => {
      let mesh = meshMap.get(e.id);
      if (!mesh) {
        mesh = this._createMonsterMesh(e.type, isFriendly);
        this.scene.add(mesh);
        meshMap.set(e.id, mesh);
      }

      mesh.position.set(e.x + e.width / 2, 18, e.y + e.height / 2);

      let targetRotY = isFriendly ? 0 : Math.PI;
      if (e.direction === 'LEFT') targetRotY = Math.PI / 2;
      else if (e.direction === 'RIGHT') targetRotY = -Math.PI / 2;

      mesh.rotation.y = targetRotY;

      const data = mesh.userData;
      if (data.leftWing && data.rightWing) {
        const flapSpeed = data.monsterType === 'griffin' ? 0.028 : 0.016;
        const flapAngle = Math.sin(now * flapSpeed) * 0.45;
        data.leftWing.rotation.z = flapAngle;
        data.rightWing.rotation.z = -flapAngle;
      }
    });
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
