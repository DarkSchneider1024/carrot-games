/**
 * Three.js WebGL 3D Fighter Renderer (全 3D 魔法空戰對對決渲染器)
 * Features 3D Aircraft Meshes, Dynamic Lights, 3D Terrain Cubes, Rotating Crystal Base & Shard Particles.
 */

import * as THREE from 'three';
import {
  MAP_GRID_SIZE,
  TILE_BRICK,
  TILE_STEEL,
  TILE_FOREST,
  POWERUP_SHIELD
} from './game-controller.js';

export class FighterRenderer3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.playerGroup = null;
    this.enemyMeshes = new Map();
    this.bulletMeshes = [];
    this.terrainMeshes = [];
    this.baseMesh = null;
    this.particleGroup = null;

    this.initialized = false;
  }

  init(container, width = 640, height = 640) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0015);

    // Perspective Camera angled top-down
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    this.camera.position.set(320, 720, 680);
    this.camera.lookAt(320, 0, 320);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffecda, 1.2);
    dirLight.position.set(320, 600, 400);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // Ground Grid Helper
    const gridHelper = new THREE.GridHelper(640, 16, 0xff7544, 0x334155);
    gridHelper.position.set(320, 0, 320);
    this.scene.add(gridHelper);

    // Build 3D Player Jet Group
    this._createPlayerJet3D();

    // Build 3D Carrot Base
    this._createBase3D();

    this.initialized = true;
  }

  _createPlayerJet3D() {
    this.playerGroup = new THREE.Group();

    // Fuselage
    const noseGeo = new THREE.ConeGeometry(12, 36, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff7544, roughness: 0.3, metalness: 0.4 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.z = -10;
    this.playerGroup.add(noseMesh);

    // Wings
    const wingGeo = new THREE.BoxGeometry(42, 3, 16);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xff70a6, roughness: 0.2, metalness: 0.6 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.playerGroup.add(wingMesh);

    // Engine Tail Light
    const engineLight = new THREE.PointLight(0xff7544, 2, 80);
    engineLight.position.set(0, 4, 18);
    this.playerGroup.add(engineLight);

    // Shield Aura
    const shieldGeo = new THREE.SphereGeometry(26, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = false;
    this.playerGroup.add(this.shieldMesh);

    this.scene.add(this.playerGroup);
  }

  _createBase3D() {
    this.baseGroup = new THREE.Group();

    // Pedestal
    const pedGeo = new THREE.CylinderGeometry(36, 42, 14, 8);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.set(320, 7, 600);
    this.baseGroup.add(pedMesh);

    // 3D Carrot Gemstone Crystal
    const cryGeo = new THREE.OctahedronGeometry(22, 0);
    const cryMat = new THREE.MeshStandardMaterial({
      color: 0xff7544,
      emissive: 0xff7544,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.8
    });
    this.crystalMesh = new THREE.Mesh(cryGeo, cryMat);
    this.crystalMesh.position.set(320, 36, 600);
    this.baseGroup.add(this.crystalMesh);

    const baseLight = new THREE.PointLight(0xff7544, 2.5, 120);
    baseLight.position.set(320, 40, 600);
    this.baseGroup.add(baseLight);

    this.scene.add(this.baseGroup);
  }

  _createEnemyJetMesh() {
    const enemyGroup = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(10, 32, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.4, metalness: 0.5 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.rotation.x = -Math.PI / 2;
    enemyGroup.add(bodyMesh);

    const wingGeo = new THREE.BoxGeometry(38, 3, 14);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    enemyGroup.add(wingMesh);

    const light = new THREE.PointLight(0xef4444, 1.5, 50);
    light.position.set(0, 2, -10);
    enemyGroup.add(light);

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
        if (p.hasShield) this.shieldMesh.rotation.y += 0.05;
      }
    }

    // 2. Rotate 3D Base Crystal
    if (this.crystalMesh) {
      this.crystalMesh.rotation.y += 0.02;
    }

    // 3. Sync Terrain Meshes (Bricks & Steel)
    this._syncTerrain(state.map);

    // 4. Sync Enemy Jets
    this._syncEnemies(state.enemies);

    // 5. Sync Bullets
    this._syncBullets(state.bullets);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  _syncTerrain(map) {
    // Clear old terrain
    this.terrainMeshes.forEach(m => this.scene.remove(m));
    this.terrainMeshes = [];

    const tileSize = 40;
    const brickGeo = new THREE.BoxGeometry(tileSize - 2, 28, tileSize - 2);
    const brickMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });

    const steelGeo = new THREE.BoxGeometry(tileSize - 2, 34, tileSize - 2);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.8 });

    for (let r = 0; r < MAP_GRID_SIZE; r++) {
      for (let c = 0; c < MAP_GRID_SIZE; c++) {
        const tile = map[r][c];
        if (tile === TILE_BRICK || tile === TILE_STEEL) {
          const mesh = new THREE.Mesh(
            tile === TILE_BRICK ? brickGeo : steelGeo,
            tile === TILE_BRICK ? brickMat : steelMat
          );
          mesh.position.set(c * tileSize + tileSize / 2, tile === TILE_BRICK ? 14 : 17, r * tileSize + tileSize / 2);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.scene.add(mesh);
          this.terrainMeshes.push(mesh);
        }
      }
    }
  }

  _syncEnemies(enemies) {
    const activeIds = new Set(enemies.map(e => e.id));

    // Remove dead enemy meshes
    for (const [id, mesh] of this.enemyMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.enemyMeshes.delete(id);
      }
    }

    // Add or update active enemy meshes
    enemies.forEach(e => {
      let mesh = this.enemyMeshes.get(e.id);
      if (!mesh) {
        mesh = this._createEnemyJetMesh();
        this.scene.add(mesh);
        this.enemyMeshes.set(e.id, mesh);
      }

      mesh.position.set(e.x + e.width / 2, 18, e.y + e.height / 2);

      let targetRotY = Math.PI;
      if (e.direction === 'UP') targetRotY = 0;
      else if (e.direction === 'LEFT') targetRotY = Math.PI / 2;
      else if (e.direction === 'RIGHT') targetRotY = -Math.PI / 2;

      mesh.rotation.y = targetRotY;
    });
  }

  _syncBullets(bullets) {
    this.bulletMeshes.forEach(m => this.scene.remove(m));
    this.bulletMeshes = [];

    const bGeo = new THREE.SphereGeometry(5, 8, 8);
    bullets.forEach(b => {
      const bMat = new THREE.MeshBasicMaterial({ color: b.isPlayer ? 0x38bdf8 : 0xef4444 });
      const mesh = new THREE.Mesh(bGeo, bMat);
      mesh.position.set(b.x + b.width / 2, 18, b.y + b.height / 2);
      this.scene.add(mesh);
      this.bulletMeshes.push(mesh);
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
