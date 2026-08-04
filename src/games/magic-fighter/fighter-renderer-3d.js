/**
 * Three.js WebGL 3D Fighter Renderer — Performance & Object-Pooling Optimized
 *
 * Performance Features:
 * - Shared Geometry & Material Caching (Zero GC / Zero Re-allocations at 60 FPS)
 * - Map Hashing & Dirty Checking (Only rebuilds 3D terrain when blocks are destroyed/fortified)
 * - Bullet & Powerup Mesh Pooling (Zero allocation per frame)
 */

import * as THREE from 'three';
import {
  MAP_GRID_SIZE,
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
    this.scene.background = new THREE.Color(0x1e293b);
    this.scene.fog = new THREE.FogExp2(0x1e293b, 0.0008);

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2200);
    this.camera.position.set(320, 720, 680);
    this.camera.lookAt(320, 0, 320);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Efficient pixel ratio
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Static Shared Geometries (Created ONCE for 0 memory allocations during game loop)
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
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
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(320, -1, 320);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Ground Grid Lines
    const gridHelper = new THREE.GridHelper(640, 16, 0xf97316, 0x475569);
    gridHelper.position.set(320, 0, 320);
    this.scene.add(gridHelper);

    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);

    // Build 3D Player Jet Group
    this._createPlayerJet3D();

    // Build 3D Base HQ
    this._createBase3D();

    this.initialized = true;
  }

  _createPlayerJet3D() {
    this.playerGroup = new THREE.Group();

    // Fuselage
    const noseGeo = new THREE.ConeGeometry(14, 38, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.2, metalness: 0.6 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.z = -10;
    this.playerGroup.add(noseMesh);

    // Wings
    const wingGeo = new THREE.BoxGeometry(44, 4, 18);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.playerGroup.add(wingMesh);

    // Engine Tail Light
    const engineLight = new THREE.PointLight(0xf97316, 3, 100);
    engineLight.position.set(0, 4, 20);
    this.playerGroup.add(engineLight);

    // Shield Sphere Aura
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

  _createEnemyJetMesh(type, isRedCarrier) {
    const enemyGroup = new THREE.Group();

    let bodyColor = 0xa855f7;
    if (type === 'fast') bodyColor = 0x06b6d4;
    else if (type === 'heavy') bodyColor = 0x64748b;
    if (isRedCarrier) bodyColor = 0xef4444;

    const bodyGeo = new THREE.ConeGeometry(12, 34, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      emissive: isRedCarrier ? 0xef4444 : 0x000000,
      emissiveIntensity: isRedCarrier ? 0.8 : 0,
      roughness: 0.3,
      metalness: 0.6
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.rotation.x = -Math.PI / 2;
    enemyGroup.add(bodyMesh);

    const wingGeo = new THREE.BoxGeometry(40, 4, 16);
    const wingMat = new THREE.MeshStandardMaterial({ color: isRedCarrier ? 0xd97706 : 0xec4899, roughness: 0.3 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    enemyGroup.add(wingMesh);

    enemyGroup.userData = { bodyMesh, bodyMat, isRedCarrier };
    return enemyGroup;
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

    // 3. DIRTY CHECK TERRAIN (Only rebuilds when map actually changes!)
    this._syncTerrainCached(state.map);

    // 4. Sync Enemies
    this._syncEnemies(state.enemies);

    // 5. POOLED BULLETS (0 Re-allocation)
    this._syncBulletsPooled(state.bullets);

    // 6. POOLED POWERUPS (0 Re-allocation)
    this._syncPowerupsPooled(state.powerups);

    this.renderer.render(this.scene, this.camera);
  }

  _syncTerrainCached(map) {
    // Generate quick hash string to detect map changes
    let currentHash = '';
    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        if (map[r][c] !== TILE_EMPTY) currentHash += `${r}_${c}_${map[r][c]};`;
      }
    }

    // If map hasn't changed, SKIP REBUILDING completely!
    if (currentHash === this._lastMapHash) return;
    this._lastMapHash = currentHash;

    // Clear old meshes
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

    enemies.forEach(e => {
      let mesh = this.enemyMeshes.get(e.id);
      if (!mesh) {
        mesh = this._createEnemyJetMesh(e.type, e.isRedCarrier);
        this.scene.add(mesh);
        this.enemyMeshes.set(e.id, mesh);
      }

      mesh.position.set(e.x + e.width / 2, 18, e.y + e.height / 2);

      let targetRotY = Math.PI;
      if (e.direction === 'UP') targetRotY = 0;
      else if (e.direction === 'LEFT') targetRotY = Math.PI / 2;
      else if (e.direction === 'RIGHT') targetRotY = -Math.PI / 2;

      mesh.rotation.y = targetRotY;

      if (e.type === 'heavy' && mesh.userData.bodyMat) {
        if (e.hp === 3) mesh.userData.bodyMat.color.setHex(0x64748b);
        else if (e.hp === 2) mesh.userData.bodyMat.color.setHex(0xf59e0b);
        else if (e.hp === 1) mesh.userData.bodyMat.color.setHex(0xef4444);
      }

      if (e.isRedCarrier && mesh.userData.bodyMat) {
        mesh.userData.bodyMat.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
      }
    });
  }

  _syncBulletsPooled(bullets) {
    // Hide extra pool meshes
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
