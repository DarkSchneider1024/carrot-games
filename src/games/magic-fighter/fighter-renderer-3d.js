/**
 * Three.js WebGL 3D Fighter Renderer — Brightness & Battle City Overhaul
 *
 * Features High Intensity Lighting, Vibrant Materials, 3D Terrain Types (Brick, Steel, Forest, Ice, Water),
 * Flashing Red Carrier Jets, & 3D Powerup Item Drops.
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
    this.bulletMeshes = [];
    this.powerupMeshes = [];
    this.terrainGroup = null;
    this.baseGroup = null;
    this.crystalMesh = null;

    this.initialized = false;
  }

  init(container, width = 640, height = 640) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e293b); // Bright Slate 800
    this.scene.fog = new THREE.FogExp2(0x1e293b, 0.0008);

    // Perspective Camera angled top-down
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2200);
    this.camera.position.set(320, 720, 680);
    this.camera.lookAt(320, 0, 320);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // High Brightness Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4); // Doubled brightness
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

    let bodyColor = 0xa855f7; // Basic Purple
    if (type === 'fast') bodyColor = 0x06b6d4; // Fast Cyan
    else if (type === 'heavy') bodyColor = 0x64748b; // Heavy Steel

    if (isRedCarrier) bodyColor = 0xef4444; // Red Flashing

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

    const light = new THREE.PointLight(isRedCarrier ? 0xef4444 : 0xa855f7, 2, 60);
    light.position.set(0, 2, -10);
    enemyGroup.add(light);

    enemyGroup.userData = { bodyMesh, bodyMat, isRedCarrier };
    return enemyGroup;
  }

  render(state) {
    if (!this.initialized) return;

    // 1. Update Player 3D Position & Rotation
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

      // Hide/Fade if in Forest
      this.playerGroup.children.forEach(c => {
        if (c.material) {
          c.material.transparent = p.isInForest;
          c.material.opacity = p.isInForest ? 0.45 : 1.0;
        }
      });
    }

    // 2. Rotate 3D Base Crystal
    if (this.crystalMesh && !state.base.destroyed) {
      this.crystalMesh.rotation.y += 0.025;
      this.crystalMesh.position.y = 40 + Math.sin(Date.now() * 0.003) * 4;
    }

    // 3. Sync Terrain Map (Brick, Steel, Forest, Ice, Water)
    this._syncTerrain(state.map);

    // 4. Sync Enemy Jets
    this._syncEnemies(state.enemies);

    // 5. Sync Bullets
    this._syncBullets(state.bullets);

    // 6. Sync Powerups
    this._syncPowerups(state.powerups);

    this.renderer.render(this.scene, this.camera);
  }

  _syncTerrain(map) {
    // Rebuild terrain when changed
    this.terrainGroup.clear();

    const tileSize = 40;

    const brickGeo = new THREE.BoxGeometry(tileSize - 2, 28, tileSize - 2);
    const brickMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 }); // Bright Terracotta Orange

    const steelGeo = new THREE.BoxGeometry(tileSize - 2, 34, tileSize - 2);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 }); // Bright Shiny Silver

    const iceGeo = new THREE.BoxGeometry(tileSize - 2, 4, tileSize - 2);
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, roughness: 0.05 });

    const waterGeo = new THREE.BoxGeometry(tileSize - 2, 6, tileSize - 2);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.75, roughness: 0.1 });

    const treeGeo = new THREE.ConeGeometry(16, 32, 6);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 });

    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        const tile = map[r][c];
        const x = c * tileSize + tileSize / 2;
        const z = r * tileSize + tileSize / 2;

        if (tile === TILE_BRICK) {
          const mesh = new THREE.Mesh(brickGeo, brickMat);
          mesh.position.set(x, 14, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_STEEL) {
          const mesh = new THREE.Mesh(steelGeo, steelMat);
          mesh.position.set(x, 17, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_ICE) {
          const mesh = new THREE.Mesh(iceGeo, iceMat);
          mesh.position.set(x, 2, z);
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_WATER) {
          const mesh = new THREE.Mesh(waterGeo, waterMat);
          mesh.position.set(x, 3, z);
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_FOREST) {
          const mesh = new THREE.Mesh(treeGeo, treeMat);
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

      // Heavy Armor Jet Color Shift based on HP
      if (e.type === 'heavy' && mesh.userData.bodyMat) {
        if (e.hp === 3) mesh.userData.bodyMat.color.setHex(0x64748b);
        else if (e.hp === 2) mesh.userData.bodyMat.color.setHex(0xf59e0b);
        else if (e.hp === 1) mesh.userData.bodyMat.color.setHex(0xef4444);
      }

      // Red Carrier Flashing Pulsing
      if (e.isRedCarrier && mesh.userData.bodyMat) {
        mesh.userData.bodyMat.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
      }
    });
  }

  _syncBullets(bullets) {
    this.bulletMeshes.forEach(m => this.scene.remove(m));
    this.bulletMeshes = [];

    const bGeo = new THREE.SphereGeometry(6, 8, 8);
    bullets.forEach(b => {
      let bColor = b.isPlayer ? (b.isArmorPiercing ? 0x38bdf8 : 0xf97316) : 0xef4444;
      const bMat = new THREE.MeshBasicMaterial({ color: bColor });
      const mesh = new THREE.Mesh(bGeo, bMat);
      mesh.position.set(b.x + b.width / 2, 18, b.y + b.height / 2);

      const light = new THREE.PointLight(bColor, 1.5, 30);
      mesh.add(light);

      this.scene.add(mesh);
      this.bulletMeshes.push(mesh);
    });
  }

  _syncPowerups(powerups) {
    this.powerupMeshes.forEach(m => this.scene.remove(m));
    this.powerupMeshes = [];

    const geo = new THREE.OctahedronGeometry(14, 0);
    powerups.forEach(p => {
      let color = 0xf97316;
      if (p.type === POWERUP_SHIELD) color = 0x38bdf8;
      else if (p.type === POWERUP_CLOCK) color = 0x06b6d4;
      else if (p.type === POWERUP_BOMB) color = 0xef4444;
      else if (p.type === POWERUP_STAR) color = 0xeab308;
      else if (p.type === POWERUP_SHOVEL) color = 0x94a3b8;
      else if (p.type === POWERUP_LIFE) color = 0xec4899;

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        metalness: 0.8
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x + 14, 18, p.y + 14);
      mesh.rotation.y = Date.now() * 0.003;

      this.scene.add(mesh);
      this.powerupMeshes.push(mesh);
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
