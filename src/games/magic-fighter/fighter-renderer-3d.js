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

    const f16Mat = new THREE.MeshStandardMaterial({
      color: 0x475569, // F-16 Tactical Dark Gunmetal Gray
      roughness: 0.25,
      metalness: 0.75
    });

    const f16DarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4
    });

    const missileMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // White AIM-9 Sidewinder Missile Body
      roughness: 0.1,
      metalness: 0.3
    });

    // 1. Long Needle Pitot Airspeed Probe & Sharp Nose Radome Cone (空速管與雷達罩)
    const probeGeo = new THREE.CylinderGeometry(0.5, 0.5, 16, 8);
    const probeMesh = new THREE.Mesh(probeGeo, missileMat);
    probeMesh.rotation.x = Math.PI / 2;
    probeMesh.position.z = -28;
    this.playerGroup.add(probeMesh);

    const noseGeo = new THREE.ConeGeometry(8, 28, 12);
    const noseMesh = new THREE.Mesh(noseGeo, f16Mat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.z = -14;
    this.playerGroup.add(noseMesh);

    // 2. F-16 Blended Fuselage Body
    const bodyGeo = new THREE.CylinderGeometry(8.5, 10, 32, 12);
    const bodyMesh = new THREE.Mesh(bodyGeo, f16Mat);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyMesh.position.z = 6;
    this.playerGroup.add(bodyMesh);

    // 3. Ventral Air Intake Scoop (腹部進氣口 Scoop)
    const intakeGeo = new THREE.BoxGeometry(9, 6, 16);
    const intakeMesh = new THREE.Mesh(intakeGeo, f16DarkMat);
    intakeMesh.position.set(0, -6, 2);
    this.playerGroup.add(intakeMesh);

    // 4. Gold/Cyan Tinted Bubble Canopy Cockpit (水滴型透光座艙罩)
    const canopyGeo = new THREE.SphereGeometry(7, 16, 16);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.75,
      roughness: 0.05
    });
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.scale.set(0.9, 0.8, 2.2);
    canopyMesh.position.set(0, 7, -6);
    this.playerGroup.add(canopyMesh);

    // Pilot Helmet Inside Cockpit
    const pilotGeo = new THREE.SphereGeometry(2.2, 8, 8);
    const pilotMat = new THREE.MeshStandardMaterial({ color: 0x090d16 });
    const pilotMesh = new THREE.Mesh(pilotGeo, pilotMat);
    pilotMesh.position.set(0, 6, -4);
    this.playerGroup.add(pilotMesh);

    // 5. F-16 Cropped Delta Wings & Leading-Edge Extensions (剪裁三角主翼)
    const wingGeo = new THREE.BoxGeometry(48, 2.2, 18);
    const wingMesh = new THREE.Mesh(wingGeo, f16Mat);
    wingMesh.position.z = 6;
    this.playerGroup.add(wingMesh);

    // 6. Wingtip Rail Launchers & AIM-9 Sidewinder Missiles (翼尖響尾蛇導彈)
    [-25, 25].forEach(xOff => {
      const railGeo = new THREE.BoxGeometry(1.5, 1.5, 22);
      const railMesh = new THREE.Mesh(railGeo, f16DarkMat);
      railMesh.position.set(xOff, 0, 6);
      this.playerGroup.add(railMesh);

      const missileGeo = new THREE.CylinderGeometry(1.2, 1.2, 18, 8);
      const missileMesh = new THREE.Mesh(missileGeo, missileMat);
      missileMesh.rotation.x = Math.PI / 2;
      missileMesh.position.set(xOff, -1, 6);
      this.playerGroup.add(missileMesh);
    });

    // 7. Underwing External Fuel Drop Tanks (翼下副油箱)
    [-14, 14].forEach(xOff => {
      const tankGeo = new THREE.CylinderGeometry(3, 3, 24, 8);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });
      const tankMesh = new THREE.Mesh(tankGeo, tankMat);
      tankMesh.rotation.x = Math.PI / 2;
      tankMesh.position.set(xOff, -5, 6);
      this.playerGroup.add(tankMesh);
    });

    // 8. Single Tall Vertical Tail Fin & Dual Ventral Fins (高聳單尾翼與雙腹鰭)
    const tailFinGeo = new THREE.BoxGeometry(2.5, 22, 14);
    const tailFinMesh = new THREE.Mesh(tailFinGeo, f16Mat);
    tailFinMesh.rotation.x = -0.3;
    tailFinMesh.position.set(0, 16, 16);
    this.playerGroup.add(tailFinMesh);

    // Dual Ventral Fins Under Rear Fuselage
    [-4, 4].forEach(xOff => {
      const ventralGeo = new THREE.BoxGeometry(1.2, 8, 8);
      const ventralMesh = new THREE.Mesh(ventralGeo, f16DarkMat);
      ventralMesh.rotation.x = 0.4;
      ventralMesh.position.set(xOff, -6, 18);
      this.playerGroup.add(ventralMesh);
    });

    // 9. Single Circular Afterburner Exhaust Nozzle & Light (單引擎噴嘴與後燃器燈光)
    const nozzleGeo = new THREE.CylinderGeometry(6, 6.5, 8, 12);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, f16DarkMat);
    nozzleMesh.rotation.x = Math.PI / 2;
    nozzleMesh.position.z = 24;
    this.playerGroup.add(nozzleMesh);

    const afterburnerLight = new THREE.PointLight(0xff7544, 4.0, 90);
    afterburnerLight.position.set(0, 0, 26);
    this.playerGroup.add(afterburnerLight);

    // 10. Shield Geodesic Aura
    const shieldGeo = new THREE.SphereGeometry(30, 16, 16);
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

    const mossStoneMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x334155 : 0x78350f, // Golden Mossy Ancient Fortress Stone
      roughness: 0.8
    });

    const whiteCityMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x64748b : 0xf8fafc, // White Ancient City Buildings
      roughness: 0.2
    });

    const treeFoliageMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x831843 : 0x15803d, // Lush Giant Sacred Tree Crown
      roughness: 0.6
    });

    const rockBaseMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x1e293b : 0x3f3f46, // Inverted Hemisphere Island Base
      roughness: 0.9
    });

    const goldDomeMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x991b1b : 0xf59e0b, // Golden Roof Domes
      roughness: 0.2,
      metalness: 0.6
    });

    // 1. Inverted Hemisphere Floating Rock Base Foundation (倒半球懸浮基石)
    const baseGeo = new THREE.SphereGeometry(80, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeo, rockBaseMat);
    baseMesh.rotation.x = Math.PI;
    baseMesh.position.set(0, -14, 0);
    baseMesh.castShadow = true;
    castleGroup.add(baseMesh);

    // Hanging Sacred Tree Roots (懸掛樹根鬚)
    [-30, -10, 15, 35].forEach((xOff, idx) => {
      const rootGeo = new THREE.CylinderGeometry(1.5, 0.5, 36, 6);
      const rootMesh = new THREE.Mesh(rootGeo, rockBaseMat);
      rootMesh.position.set(xOff, -55 - (idx % 2) * 10, (idx % 3) * 12 - 10);
      castleGroup.add(rootMesh);
    });

    // 2. Multi-Tiered Concentric Terraced Fortress Walls (三層苔蘚巨石環形堡壘城牆)
    // Tier 3 (Lower Base Ring Wall)
    const tier3Geo = new THREE.CylinderGeometry(84, 90, 20, 20);
    const tier3Mesh = new THREE.Mesh(tier3Geo, mossStoneMat);
    tier3Mesh.position.set(0, -4, 0);
    castleGroup.add(tier3Mesh);

    // Tier 2 (Middle Citadel Wall)
    const tier2Geo = new THREE.CylinderGeometry(68, 76, 18, 18);
    const tier2Mesh = new THREE.Mesh(tier2Geo, mossStoneMat);
    tier2Mesh.position.set(0, 12, 0);
    castleGroup.add(tier2Mesh);

    // Tier 1 (Upper Keep Wall)
    const tier1Geo = new THREE.CylinderGeometry(52, 60, 16, 16);
    const tier1Mesh = new THREE.Mesh(tier1Geo, mossStoneMat);
    tier1Mesh.position.set(0, 26, 0);
    castleGroup.add(tier1Mesh);

    // Buttress Pillars & Watchtowers Around Fortress Rings (環形堡壘瞭望塔點綴)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = Math.cos(angle) * 72;
      const rz = Math.sin(angle) * 72;

      const towerGeo = new THREE.CylinderGeometry(5, 6, 24, 8);
      const towerMesh = new THREE.Mesh(towerGeo, mossStoneMat);
      towerMesh.position.set(rx, 10, rz);
      castleGroup.add(towerMesh);
    }

    // 3. White Ancient City Towers & Spires (神木下方的白色古城聚落與圓頂塔樓群)
    const cityOffsets = [
      { x: 0, z: 0, h: 28, r: 14 },
      { x: -22, z: -15, h: 22, r: 10 },
      { x: 22, z: -15, h: 22, r: 10 },
      { x: -18, z: 18, h: 20, r: 9 },
      { x: 18, z: 18, h: 20, r: 9 }
    ];

    cityOffsets.forEach(pos => {
      const cityBuilding = new THREE.Mesh(new THREE.CylinderGeometry(pos.r, pos.r + 2, pos.h, 12), whiteCityMat);
      cityBuilding.position.set(pos.x, 36 + pos.h / 2, pos.z);
      castleGroup.add(cityBuilding);

      const domeRoof = new THREE.Mesh(new THREE.SphereGeometry(pos.r + 0.5, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldDomeMat);
      domeRoof.position.set(pos.x, 36 + pos.h, pos.z);
      castleGroup.add(domeRoof);
    });

    // 4. Giant Sacred Tree Canopy Top (頂部巨大綠色神木古樹樹冠)
    const mainTreeCrown = new THREE.Mesh(new THREE.SphereGeometry(44, 16, 16), treeFoliageMat);
    mainTreeCrown.scale.set(1, 0.65, 1);
    mainTreeCrown.position.set(0, 68, 0);
    castleGroup.add(mainTreeCrown);

    // Fluffy Outer Foliage Spheres (蓬鬆樹冠葉球點綴)
    const foliageOffsets = [
      { x: -24, y: 64, z: -12, r: 18 },
      { x: 24, y: 64, z: -12, r: 18 },
      { x: -20, y: 66, z: 16, r: 16 },
      { x: 20, y: 66, z: 16, r: 16 },
      { x: 0, y: 76, z: 0, r: 22 }
    ];

    foliageOffsets.forEach(f => {
      const leafMesh = new THREE.Mesh(new THREE.SphereGeometry(f.r, 12, 12), treeFoliageMat);
      leafMesh.position.set(f.x, f.y, f.z);
      castleGroup.add(leafMesh);
    });

    // 5. Floating Levitation Power Crystal (頂端魔法懸浮水晶)
    const cryGeo = new THREE.OctahedronGeometry(20, 0);
    const cryMat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0xef4444 : 0x38bdf8,
      emissive: isEnemy ? 0xef4444 : 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.1,
      metalness: 0.9
    });
    const crystalMesh = new THREE.Mesh(cryGeo, cryMat);
    crystalMesh.position.set(0, 108, 0);
    crystalMesh.castShadow = true;
    castleGroup.add(crystalMesh);

    const cLight = new THREE.PointLight(isEnemy ? 0xef4444 : 0x38bdf8, 4.5, 220);
    cLight.position.set(0, 110, 0);
    castleGroup.add(cLight);

    castleGroup.userData = { crystalMesh };
    return castleGroup;
  }

  _createMonsterMesh(type, isFriendly = false) {
    const monsterGroup = new THREE.Group();

    if (type === 'bat') {
      // 🧛 吸血鬼伯爵 (Vampire Count Procedural 3D Model based on user image)
      const skinMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x94a3b8 : 0x64748b, // Vampire Gray Skin Tone
        roughness: 0.4
      });

      const suitMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Formal Black Tuxedo
        roughness: 0.3
      });

      const vestMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b, // Deep Red Vest
        roughness: 0.3
      });

      const capeMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x0284c7 : 0xd97706, // Flowing Red/Blue Vampire Cape
        roughness: 0.3,
        side: THREE.DoubleSide
      });

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Fierce Golden Yellow Eyes
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
      const fangMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });

      // 1. Tuxedo Body Torso & Red Vest
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 10), suitMat);
      bodyMesh.position.set(0, 8, 0);
      monsterGroup.add(bodyMesh);

      const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 10.4), vestMat);
      vestMesh.position.set(0, 8, 0);
      monsterGroup.add(vestMesh);

      const collarMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10.6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      collarMesh.position.set(0, 12, 0);
      monsterGroup.add(collarMesh);

      // Red Bow Tie (紅領結)
      const bowMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 11), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      bowMesh.position.set(0, 11.5, 0);
      monsterGroup.add(bowMesh);

      // 2. Chibi Vampire Head & Hair (Q版大頭與黑髮)
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), skinMat);
      headMesh.scale.set(1, 0.9, 1);
      headMesh.position.set(0, 22, -1);
      monsterGroup.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.ConeGeometry(10.5, 8, 8), suitMat);
      hairMesh.rotation.x = -0.2;
      hairMesh.position.set(0, 26, 0);
      monsterGroup.add(hairMesh);

      // Pointed Vampire Ears (尖耳朵)
      [-9.5, 9.5].forEach(xOff => {
        const earMesh = new THREE.Mesh(new THREE.ConeGeometry(2.5, 8, 6), skinMat);
        earMesh.rotation.z = xOff > 0 ? -0.8 : 0.8;
        earMesh.position.set(xOff, 24, 0);
        monsterGroup.add(earMesh);
      });

      // 3. Fierce Golden Eyes & Sharp Fangs (金黃斜眼與白獠牙)
      [-3.8, 3.8].forEach(xOff => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.5, 1.2), eyeMat);
        eye.rotation.z = xOff > 0 ? -0.25 : 0.25;
        eye.position.set(xOff, 23.5, -9);
        monsterGroup.add(eye);

        const pupil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), pupilMat);
        pupil.position.set(xOff, 23.5, -9.5);
        monsterGroup.add(pupil);
      });

      // Mouth & Fangs
      const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 1), vestMat);
      mouthMesh.position.set(0, 18.5, -9.2);
      monsterGroup.add(mouthMesh);

      [-2, 2].forEach(xOff => {
        const fang = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3, 4), fangMat);
        fang.rotation.x = Math.PI;
        fang.position.set(xOff, 17.5, -9.4);
        monsterGroup.add(fang);
      });

      // 4. High Vampire Cape Collar & Flapping Cape Wings (高領斗篷)
      const highCollar = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 2.5), capeMat);
      highCollar.rotation.x = -0.15;
      highCollar.position.set(0, 20, 5.5);
      monsterGroup.add(highCollar);

      const wingGeo = new THREE.BoxGeometry(20, 2, 16);
      const leftWing = new THREE.Mesh(wingGeo, capeMat);
      leftWing.position.set(-14, 10, 3);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, capeMat);
      rightWing.position.set(14, 10, 3);
      monsterGroup.add(rightWing);

      // 5. Right Hand Holding Red Wine Glass (紅酒高腳杯)
      const glassStem = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 8), fangMat);
      glassStem.position.set(10, 14, -6);
      monsterGroup.add(glassStem);

      const glassBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 0.6, 4, 8), fangMat);
      glassBowl.position.set(10, 17, -6);
      monsterGroup.add(glassBowl);

      const redWine = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.5, 3, 8), vestMat);
      redWine.position.set(10, 17.2, -6);
      monsterGroup.add(redWine);

      monsterGroup.userData = { bodyMesh, bodyMat: suitMat, leftWing, rightWing, monsterType: 'bat' };

    } else if (type === 'griffin') {
      // 🦅 疾風鷹獅 (Majestic Soaring Griffin Procedural 3D Model based on user image)
      const eagleHeadMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Pure White Bald Eagle Head & Feather Mane
        roughness: 0.3
      });

      const lionMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x0284c7 : 0xd97706, // Tawny Golden Lion Body
        emissive: isFriendly ? 0x0284c7 : 0xb45309,
        emissiveIntensity: 0.2,
        roughness: 0.4
      });

      const beakMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Golden Raptor Beak & Talons
        roughness: 0.1,
        metalness: 0.5
      });

      const wingTipMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, // White Upper Wing Feathers
        roughness: 0.3,
        side: THREE.DoubleSide
      });

      const wingInnerMat = new THREE.MeshStandardMaterial({
        color: 0x475569, // Charcoal Gray Under Feathers
        roughness: 0.5,
        side: THREE.DoubleSide
      });

      // 1. Eagle Head & Golden Curved Beak (白羽大鵰頭與金黃鉤狀鷹喙)
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 14), eagleHeadMat);
      headMesh.scale.set(1, 1.1, 1.25);
      headMesh.position.set(0, 16, -10);
      monsterGroup.add(headMesh);

      // Curved Raptor Beak (鉤狀鷹喙)
      const beakMesh = new THREE.Mesh(new THREE.ConeGeometry(3.6, 10, 8), beakMat);
      beakMesh.rotation.x = Math.PI / 2 + 0.3;
      beakMesh.position.set(0, 14, -18);
      monsterGroup.add(beakMesh);

      // Eagle Eyes (凶悍鷹眼)
      [-3.5, 3.5].forEach(xOff => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        eye.position.set(xOff, 17, -16);
        monsterGroup.add(eye);

        const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.4, 6, 12), beakMat);
        eyeRing.rotation.y = Math.PI / 2;
        eyeRing.position.set(xOff, 17, -16);
        monsterGroup.add(eyeRing);
      });

      // Feathery Crest/Mane behind Head (頭後羽冠)
      const crestMesh = new THREE.Mesh(new THREE.ConeGeometry(8, 12, 6), eagleHeadMat);
      crestMesh.rotation.x = -Math.PI / 3;
      crestMesh.position.set(0, 20, -5);
      monsterGroup.add(crestMesh);

      // 2. Lion Body Torso & Muscular Hind Legs (雄獅身軀與後腿)
      const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 26, 12), lionMat);
      bodyMesh.rotation.x = Math.PI / 2;
      bodyMesh.position.set(0, 10, 2);
      monsterGroup.add(bodyMesh);

      // Front Eagle Legs & Golden Talons (前肢金黃鷹爪)
      [-5.5, 5.5].forEach(xOff => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.5, 12, 8), beakMat);
        leg.rotation.x = 0.3;
        leg.position.set(xOff, 3, -6);
        monsterGroup.add(leg);

        // 3 Front Claws (3根爪子)
        [-1.5, 0, 1.5].forEach(cOff => {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 4), beakMat);
          claw.rotation.x = Math.PI / 2 + 0.4;
          claw.position.set(xOff + cOff, -2, -10);
          monsterGroup.add(claw);
        });
      });

      // Rear Lion Paws (後雄獅腳掌)
      [-6, 6].forEach(xOff => {
        const rearLeg = new THREE.Mesh(new THREE.SphereGeometry(4.5, 10, 10), lionMat);
        rearLeg.position.set(xOff, 4, 10);
        monsterGroup.add(rearLeg);
      });

      // 3. Curved Lion Tail with Tufted Tip (長獅尾)
      const tailGeo = new THREE.TorusGeometry(10, 1.8, 8, 16, Math.PI * 0.8);
      const tailMesh = new THREE.Mesh(tailGeo, lionMat);
      tailMesh.rotation.x = Math.PI / 2;
      tailMesh.rotation.z = -Math.PI / 3;
      tailMesh.position.set(0, 12, 16);
      monsterGroup.add(tailMesh);

      const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 6), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      tailTuft.position.set(6, 12, 22);
      monsterGroup.add(tailTuft);

      // 4. Majestic Soaring Feathery Wings (展翅白羽巨翼)
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(22, 26, 42, 16);
      wingShape.quadraticCurveTo(30, -6, 20, -12);
      wingShape.quadraticCurveTo(10, -16, 0, 0);

      const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 2, bevelEnabled: false });

      const leftWing = new THREE.Mesh(wingExtrude, wingTipMat);
      leftWing.position.set(-6, 14, -2);
      leftWing.rotation.y = Math.PI / 5;
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingExtrude, wingTipMat);
      rightWing.position.set(6, 14, -2);
      rightWing.rotation.y = -Math.PI / 5;
      rightWing.scale.set(-1, 1, 1);
      monsterGroup.add(rightWing);

      monsterGroup.userData = { bodyMesh, bodyMat: lionMat, leftWing, rightWing, monsterType: 'griffin' };

    } else {
      // 🐲 飛龍 (img2threejs Procedural 3D Red Baby Dragon Model based on user image)
      const redMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x38bdf8 : 0xef4444,
        emissive: isFriendly ? 0x0284c7 : 0x991b1b,
        emissiveIntensity: 0.25,
        roughness: 0.3,
        metalness: 0.2
      });

      const bellyMat = new THREE.MeshStandardMaterial({
        color: 0xfed7aa,
        roughness: 0.4
      });

      const clawMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1
      });

      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const eyeBlueMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      // 1. Chubby Red Torso & Peach Belly
      const torsoGeo = new THREE.SphereGeometry(13, 16, 16);
      const torsoMesh = new THREE.Mesh(torsoGeo, redMat);
      torsoMesh.scale.set(1.0, 1.25, 0.9);
      monsterGroup.add(torsoMesh);

      const bellyGeo = new THREE.SphereGeometry(10.5, 14, 14);
      const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
      bellyMesh.scale.set(0.85, 1.1, 0.6);
      bellyMesh.position.set(0, -1, -6);
      monsterGroup.add(bellyMesh);

      // 2. Large Cute Dragon Head
      const headGeo = new THREE.SphereGeometry(13, 16, 16);
      const headMesh = new THREE.Mesh(headGeo, redMat);
      headMesh.position.set(0, 15, -2);
      monsterGroup.add(headMesh);

      // Cute Snout Nose
      const snoutGeo = new THREE.SphereGeometry(6, 12, 12);
      const snoutMesh = new THREE.Mesh(snoutGeo, redMat);
      snoutMesh.scale.set(1.1, 0.8, 1.0);
      snoutMesh.position.set(0, 12, -11);
      monsterGroup.add(snoutMesh);

      // 3. Big Anime Blue Eyes (Left & Right)
      [-5.5, 5.5].forEach(xOff => {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), eyeWhiteMat);
        eyeWhite.position.set(xOff, 17, -10);
        monsterGroup.add(eyeWhite);

        const eyeBlue = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 10), eyeBlueMat);
        eyeBlue.position.set(xOff + (xOff > 0 ? -0.4 : 0.4), 17, -12);
        monsterGroup.add(eyeBlue);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), eyePupilMat);
        pupil.position.set(xOff + (xOff > 0 ? -0.4 : 0.4), 17, -13.6);
        monsterGroup.add(pupil);

        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeWhiteMat);
        spark.position.set(xOff - 1, 18.2, -13.8);
        monsterGroup.add(spark);
      });

      // 4. Curved Horns & Hair Crest
      [-6, 6].forEach(xOff => {
        const hornGeo = new THREE.ConeGeometry(2.5, 12, 8);
        const hornMesh = new THREE.Mesh(hornGeo, redMat);
        hornMesh.rotation.x = -Math.PI / 4;
        hornMesh.rotation.z = xOff > 0 ? 0.3 : -0.3;
        hornMesh.position.set(xOff, 24, 2);
        monsterGroup.add(hornMesh);
      });

      // 5. Bat Wings (Left & Right)
      const wingMat = new THREE.MeshStandardMaterial({
        color: isFriendly ? 0x0284c7 : 0xd97706,
        roughness: 0.4,
        side: THREE.DoubleSide
      });

      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(15, 18, 28, 8);
      wingShape.quadraticCurveTo(20, -4, 14, -8);
      wingShape.quadraticCurveTo(8, -12, 0, 0);

      const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 1.5, bevelEnabled: false });

      const leftWing = new THREE.Mesh(wingExtrude, wingMat);
      leftWing.position.set(-6, 8, 4);
      leftWing.rotation.y = Math.PI / 6;
      leftWing.scale.set(0.9, 0.9, 0.9);
      monsterGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingExtrude, wingMat);
      rightWing.position.set(6, 8, 4);
      rightWing.rotation.y = -Math.PI / 6;
      rightWing.scale.set(-0.9, 0.9, 0.9);
      monsterGroup.add(rightWing);

      // 6. Curved Spiked Dragon Tail
      const tailGeo = new THREE.TorusGeometry(8, 2.5, 8, 16, Math.PI * 0.7);
      const tailMesh = new THREE.Mesh(tailGeo, redMat);
      tailMesh.rotation.x = Math.PI / 2;
      tailMesh.rotation.z = -Math.PI / 4;
      tailMesh.position.set(0, -8, 8);
      monsterGroup.add(tailMesh);

      // 7. Claws (Arms & Feet)
      [-5, 5].forEach(xOff => {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 10), redMat);
        foot.position.set(xOff, -12, -4);
        monsterGroup.add(foot);

        [-1.5, 0, 1.5].forEach(clawOff => {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(1, 3.5, 4), clawMat);
          claw.rotation.x = Math.PI / 2;
          claw.position.set(xOff + clawOff, -13, -7);
          monsterGroup.add(claw);
        });
      });

      monsterGroup.userData = { bodyMesh: headMesh, bodyMat: redMat, leftWing, rightWing, monsterType: 'dragon' };
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

      // 💥 3D Hit Flash & Hit Recoil Visual Feedback
      if (e.hitTime && e.hitTime > now) {
        mesh.scale.set(1.22, 1.22, 1.22);
        if (data.bodyMat) {
          data.bodyMat.emissive.setHex(0xffffff);
          data.bodyMat.emissiveIntensity = 0.9;
        }
      } else {
        mesh.scale.set(1.0, 1.0, 1.0);
        if (data.bodyMat) {
          data.bodyMat.emissive.setHex(isFriendly ? 0x0284c7 : 0x3b0764);
          data.bodyMat.emissiveIntensity = 0.25;
        }
      }

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
