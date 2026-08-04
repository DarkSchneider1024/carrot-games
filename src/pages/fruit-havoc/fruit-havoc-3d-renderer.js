/**
 * Fruit Havoc Three.js 3D Storybook World Renderer
 * High quality 2.5D Orthographic/Perspective 3D Stage with Shadows, Beveled Platforms, & 3D Fruit Character Avatars.
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
    this.canvasWidth = 800;
    this.canvasHeight = 480;
  }

  init(containerCanvas, width = 800, height = 480) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe0f2fe); // Soft Sky Blue
    this.scene.fog = new THREE.Fog(0xe0f2fe, 600, 1500);

    // 2.5D Isometric Perspective Camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 1, 2000);
    // Camera looking down slightly at 2.5D angle
    this.camera.position.set(400, 320, 680);
    this.camera.lookAt(400, 200, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.85);
    dirLight.position.set(300, 600, 400);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1200;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
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
    const gridGeo = new THREE.PlaneGeometry(800, 480);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.08,
      wireframe: true
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.position.set(400, 240, -2);
    this.gridHelperGroup.add(gridMesh);
  }

  _createHoverHighlightMesh() {
    const hoverGeo = new THREE.BoxGeometry(48, 48, 8);
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
    // Clear old platform meshes
    while (this.platformGroup.children.length > 0) {
      const child = this.platformGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }

    platforms.forEach(plat => {
      // 3D Beveled Wooden Box
      const pW = plat.w;
      const pH = plat.h;
      const pDepth = 40;

      const pGeo = new THREE.BoxGeometry(pW, pH, pDepth);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.4,
        metalness: 0.1
      });

      const platMesh = new THREE.Mesh(pGeo, pMat);
      platMesh.position.set(plat.x + pW / 2, 480 - (plat.y + pH / 2), 0);
      platMesh.castShadow = true;
      platMesh.receiveShadow = true;

      // Top Grass Cover
      const grassGeo = new THREE.BoxGeometry(pW + 2, 8, pDepth + 2);
      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        roughness: 0.6
      });
      const grassMesh = new THREE.Mesh(grassGeo, grassMat);
      grassMesh.position.set(0, pH / 2 + 4, 0);
      platMesh.add(grassMesh);

      this.platformGroup.add(platMesh);
    });

    // 3D Goal Trophy & Cake Model Placeholder
    const trophyGeo = new THREE.CylinderGeometry(14, 18, 32, 16);
    const trophyMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.75,
      roughness: 0.25
    });
    const trophyMesh = new THREE.Mesh(trophyGeo, trophyMat);
    trophyMesh.position.set(650, 480 - 180, 15);
    trophyMesh.castShadow = true;
    this.platformGroup.add(trophyMesh);
  }

  updateTraps(placedTraps) {
    while (this.trapsGroup.children.length > 0) {
      const child = this.trapsGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }

    placedTraps.forEach(pt => {
      const tileSize = 50;
      const tx = pt.gridX * tileSize + tileSize / 2;
      const ty = 480 - (pt.gridY * tileSize + tileSize / 2);

      const trapGeo = new THREE.BoxGeometry(42, 42, 24);
      const trapMat = new THREE.MeshStandardMaterial({
        color: pt.trap.id === 9 ? 0xef4444 : (pt.trap.id === 1 ? 0xf97316 : 0x38bdf8),
        roughness: 0.3
      });
      const trapMesh = new THREE.Mesh(trapGeo, trapMat);
      trapMesh.position.set(tx, ty, 10);
      trapMesh.castShadow = true;

      // 3D Emoji Icon Sprite Card
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = '42px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pt.trap.icon, 32, 32);

      const iconTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: iconTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(38, 38, 1);
      sprite.position.set(0, 0, 14);
      trapMesh.add(sprite);

      this.trapsGroup.add(trapMesh);
    });
  }

  updateHoverGrid(hoverGrid) {
    if (!hoverGrid) {
      this.hoverGridMesh.visible = false;
      return;
    }
    const tileSize = 50;
    const gx = hoverGrid.gridX * tileSize + tileSize / 2;
    const gy = 480 - (hoverGrid.gridY * tileSize + tileSize / 2);

    this.hoverGridMesh.position.set(gx, gy, 12);
    this.hoverGridMesh.visible = true;
  }

  render(players, currentScene) {
    if (!this.initialized) return;

    // Update Player 3D Avatars
    players.forEach(p => {
      let playerMeshGroup = this.playerMeshes.get(p.id);

      if (!playerMeshGroup) {
        playerMeshGroup = new THREE.Group();

        // 3D Character Avatar Base Body Sphere
        const bodyGeo = new THREE.SphereGeometry(22, 24, 24);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.char.color || 0xef4444),
          roughness: 0.35,
          metalness: 0.1
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        bodyMesh.name = 'bodyMesh';
        playerMeshGroup.add(bodyMesh);

        // 3D Drop Shadow Plane
        const shadowGeo = new THREE.PlaneGeometry(36, 18);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x0f172a,
          transparent: true,
          opacity: 0.28
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.position.set(0, -22, -10);
        playerMeshGroup.add(shadowMesh);

        this.scene.add(playerMeshGroup);
        this.playerMeshes.set(p.id, playerMeshGroup);
      }

      if (p.isDead) {
        playerMeshGroup.visible = false;
      } else {
        playerMeshGroup.visible = true;
        // Map 2D physics coords to 3D world (2D Y is flipped in WebGL)
        const targetX = p.x;
        const targetY = 480 - p.y;
        playerMeshGroup.position.set(targetX, targetY, 20);

        // Facing Flip Rotation
        if (p.facing === 'left') {
          playerMeshGroup.rotation.y = Math.PI;
        } else {
          playerMeshGroup.rotation.y = 0;
        }

        // Texture Mapping if available
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
