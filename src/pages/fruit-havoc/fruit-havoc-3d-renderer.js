/**
 * Fruit Havoc Three.js 3D Mobile Vertical Stage Renderer
 * 360x360 Square Mobile Stage with Shadows, Beveled Platforms, & 3D Fruit Character Avatars.
 */

import * as THREE from 'three';

export class FruitHavoc3DRenderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.initialized = false;

    this.playerMeshes = new Map();
    this.platformGroup = null;
    this.trapsGroup = null;
    this.gridHelperGroup = null;
    this.hoverGridMesh = null;

    this.characterTextures = {};
    this.canvasWidth = 360;
    this.canvasHeight = 360;
  }

  init(containerCanvas, width = 360, height = 360) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe0f2fe); // Soft Sky Blue
    this.scene.fog = new THREE.Fog(0xe0f2fe, 400, 1200);

    // Perspective Camera tuned for 360x360 Square World
    this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
    this.camera.position.set(180, 220, 500);
    this.camera.lookAt(180, 140, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
    dirLight.position.set(200, 500, 350);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // WebGL Renderer Try-Catch Safeguard
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: containerCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      console.warn('WebGL Context creation failed, falling back to 2.5D Canvas:', e);
      this.initialized = false;
      return false;
    }

    // Groups Setup
    this.platformGroup = new THREE.Group();
    this.trapsGroup = new THREE.Group();
    this.gridHelperGroup = new THREE.Group();
    this.scene.add(this.platformGroup);
    this.scene.add(this.trapsGroup);
    this.scene.add(this.gridHelperGroup);

    this._buildGridHelper();
    this._createHoverHighlightMesh();
    this._loadCharacterTextures();

    this.initialized = true;
    return true;
  }

  _loadCharacterTextures() {
    const loader = new THREE.TextureLoader();
    const chars = [
      { id: 'strawberry', url: './assets/images/char_strawberry_berry.png' },
      { id: 'banana', url: './assets/images/char_banana_usagi.png' },
      { id: 'melon', url: './assets/images/char_melon_hachi.png' },
      { id: 'peach', url: './assets/images/char_peach_kuriman.png' },
      { id: 'grape', url: './assets/images/char_grape_momonga.png' }
    ];
    chars.forEach(c => {
      loader.load(c.url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        this.characterTextures[c.id] = tex;
      });
    });
  }

  _buildGridHelper() {
    const gridGeo = new THREE.PlaneGeometry(360, 360);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.08,
      wireframe: true
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.position.set(180, 180, -2);
    this.gridHelperGroup.add(gridMesh);
  }

  _createHoverHighlightMesh() {
    const hoverGeo = new THREE.BoxGeometry(42, 42, 8);
    const hoverMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55
    });
    this.hoverGridMesh = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverGridMesh.visible = false;
    this.scene.add(this.hoverGridMesh);
  }

  updatePlatforms(platforms) {
    while (this.platformGroup.children.length > 0) {
      const child = this.platformGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }

    platforms.forEach(plat => {
      const pW = plat.w;
      const pH = plat.h;
      const pDepth = 35;

      const pGeo = new THREE.BoxGeometry(pW, pH, pDepth);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.4
      });

      const platMesh = new THREE.Mesh(pGeo, pMat);
      platMesh.position.set(plat.x + pW / 2, 360 - (plat.y + pH / 2), 0);
      platMesh.castShadow = true;
      platMesh.receiveShadow = true;

      // Top Grass Cover
      const grassGeo = new THREE.BoxGeometry(pW + 2, 6, pDepth + 2);
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 });
      const grassMesh = new THREE.Mesh(grassGeo, grassMat);
      grassMesh.position.set(0, pH / 2 + 3, 0);
      platMesh.add(grassMesh);

      this.platformGroup.add(platMesh);
    });

    // 3D Goal Trophy
    const trophyGeo = new THREE.CylinderGeometry(12, 16, 28, 16);
    const trophyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
    const trophyMesh = new THREE.Mesh(trophyGeo, trophyMat);
    trophyMesh.position.set(290, 360 - 100, 15);
    trophyMesh.castShadow = true;
    this.platformGroup.add(trophyMesh);
  }

  updateTraps(placedTraps, tileSize = 45) {
    while (this.trapsGroup.children.length > 0) {
      const child = this.trapsGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }

    placedTraps.forEach(pt => {
      const tx = pt.gridX * tileSize + tileSize / 2;
      const ty = 360 - (pt.gridY * tileSize + tileSize / 2);

      const trapGeo = new THREE.BoxGeometry(38, 38, 20);
      const trapMat = new THREE.MeshStandardMaterial({
        color: pt.trap.id === 9 ? 0xef4444 : (pt.trap.id === 1 ? 0xf97316 : 0x38bdf8),
        roughness: 0.3
      });
      const trapMesh = new THREE.Mesh(trapGeo, trapMat);
      trapMesh.position.set(tx, ty, 10);
      trapMesh.castShadow = true;

      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pt.trap.icon, 32, 32);

      const iconTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: iconTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(34, 34, 1);
      sprite.position.set(0, 0, 12);
      trapMesh.add(sprite);

      this.trapsGroup.add(trapMesh);
    });
  }

  updateHoverGrid(hoverGrid, tileSize = 45) {
    if (!hoverGrid) {
      this.hoverGridMesh.visible = false;
      return;
    }
    const gx = hoverGrid.gridX * tileSize + tileSize / 2;
    const gy = 360 - (hoverGrid.gridY * tileSize + tileSize / 2);

    this.hoverGridMesh.position.set(gx, gy, 12);
    this.hoverGridMesh.visible = true;
  }

  render(players, currentScene) {
    if (!this.initialized || !this.renderer) return;

    players.forEach(p => {
      let playerMeshGroup = this.playerMeshes.get(p.id);

      if (!playerMeshGroup) {
        playerMeshGroup = new THREE.Group();

        const bodyGeo = new THREE.SphereGeometry(18, 24, 24);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.char.color || 0xef4444),
          roughness: 0.35
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        bodyMesh.name = 'bodyMesh';
        playerMeshGroup.add(bodyMesh);

        const shadowGeo = new THREE.PlaneGeometry(30, 15);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.25 });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.position.set(0, -18, -8);
        playerMeshGroup.add(shadowMesh);

        this.scene.add(playerMeshGroup);
        this.playerMeshes.set(p.id, playerMeshGroup);
      }

      if (p.isDead) {
        playerMeshGroup.visible = false;
      } else {
        playerMeshGroup.visible = true;
        const targetX = p.x;
        const targetY = 360 - p.y;
        playerMeshGroup.position.set(targetX, targetY, 18);

        if (p.facing === 'left') {
          playerMeshGroup.rotation.y = Math.PI;
        } else {
          playerMeshGroup.rotation.y = 0;
        }

        const tex = this.characterTextures[p.char.id];
        const bodyMesh = playerMeshGroup.getObjectByName('bodyMesh');
        if (tex && bodyMesh) {
          bodyMesh.material.map = tex;
          bodyMesh.material.needsUpdate = true;
        }
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
