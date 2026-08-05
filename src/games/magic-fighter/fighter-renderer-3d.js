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
    // 🏰 Medieval Stone Wall Materials (中世紀石灰岩城牆)
    this.stoneWallMat = new THREE.MeshStandardMaterial({
      color: 0xc2a97a, // Warm Limestone Sandy Brown
      roughness: 0.9,
      metalness: 0.0
    });
    this.stoneDarkMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355, // Deep Shadow Stone
      roughness: 0.95,
      metalness: 0.0
    });
    this.stoneCapMat = new THREE.MeshStandardMaterial({
      color: 0xd4b896, // Lighter Capstone
      roughness: 0.8,
      metalness: 0.0
    });

    this.steelGeo = new THREE.BoxGeometry(tileSize - 2, 34, tileSize - 2);
    this.steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });

    this.iceGeo = new THREE.BoxGeometry(tileSize - 2, 4, tileSize - 2);
    this.iceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, roughness: 0.05 });

    this.waterGeo = new THREE.BoxGeometry(tileSize - 2, 6, tileSize - 2);
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8, roughness: 0.1 });

    // 🌳 國泰人壽風格大樹材質 (Cathay Tree Materials)
    this.cathayCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x00a84f, // 國泰經典綠
      roughness: 0.5,
      metalness: 0.05
    });
    this.cathayCanopyTopMat = new THREE.MeshStandardMaterial({
      color: 0x24c25e, // 樹冠頂部高光鮮綠
      roughness: 0.45,
      metalness: 0.05
    });
    this.cathayCanopyShadowMat = new THREE.MeshStandardMaterial({
      color: 0x007837, // 樹冠底部深陰影綠
      roughness: 0.6,
      metalness: 0.05
    });
    this.cathayTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x004d23, // 國泰深綠樹幹底座
      roughness: 0.8,
      metalness: 0.1
    });

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

    // 🟠 Primary Orange Body Material & 🖤 Obsidian Black Wings Material
    const jetOrangeBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Racing Orange Main Body
      emissive: 0xc2410c,
      emissiveIntensity: 0.15,
      roughness: 0.25,
      metalness: 0.6
    });

    const jetBlackWingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Obsidian Black Wings & Accents
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
    const noseMesh = new THREE.Mesh(noseGeo, jetOrangeBodyMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.z = -14;
    this.playerGroup.add(noseMesh);

    // 2. F-16 Blended Fuselage Body
    const bodyGeo = new THREE.CylinderGeometry(8.5, 10, 32, 12);
    const bodyMesh = new THREE.Mesh(bodyGeo, jetOrangeBodyMat);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyMesh.position.z = 6;
    this.playerGroup.add(bodyMesh);

    // 3. Ventral Air Intake Scoop (腹部進氣口 Scoop)
    const intakeGeo = new THREE.BoxGeometry(9, 6, 16);
    const intakeMesh = new THREE.Mesh(intakeGeo, jetBlackWingMat);
    intakeMesh.position.set(0, -6, 2);
    this.playerGroup.add(intakeMesh);

    // 4. Gold/Cyan Tinted Bubble Canopy Cockpit (水滴型透光座艙罩)
    const canopyGeo = new THREE.SphereGeometry(7, 16, 16);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8,
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

    // 5. F-16 Cropped Delta Wings & Leading-Edge Extensions (剪裁黑橘主翼)
    const wingGeo = new THREE.BoxGeometry(48, 2.2, 18);
    const wingMesh = new THREE.Mesh(wingGeo, jetBlackWingMat);
    wingMesh.position.z = 6;
    this.playerGroup.add(wingMesh);

    // 6. Wingtip Rail Launchers & AIM-9 Sidewinder Missiles (翼尖響尾蛇導彈)
    [-25, 25].forEach(xOff => {
      const railGeo = new THREE.BoxGeometry(1.5, 1.5, 22);
      const railMesh = new THREE.Mesh(railGeo, jetBlackWingMat);
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
      const tankMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
      const tankMesh = new THREE.Mesh(tankGeo, tankMat);
      tankMesh.rotation.x = Math.PI / 2;
      tankMesh.position.set(xOff, -5, 6);
      this.playerGroup.add(tankMesh);
    });

    // 8. Single Tall Vertical Tail Fin & Dual Ventral Fins (高聳單尾翼與雙腹鰭)
    const tailFinGeo = new THREE.BoxGeometry(2.5, 22, 14);
    const tailFinMesh = new THREE.Mesh(tailFinGeo, jetBlackWingMat);
    tailFinMesh.rotation.x = -0.3;
    tailFinMesh.position.set(0, 16, 16);
    this.playerGroup.add(tailFinMesh);

    // Dual Ventral Fins Under Rear Fuselage
    [-4, 4].forEach(xOff => {
      const ventralGeo = new THREE.BoxGeometry(1.2, 8, 8);
      const ventralMesh = new THREE.Mesh(ventralGeo, jetBlackWingMat);
      ventralMesh.rotation.x = 0.4;
      ventralMesh.position.set(xOff, -6, 18);
      this.playerGroup.add(ventralMesh);
    });

    // 9. Single Circular Afterburner Exhaust Nozzle & Light (單引擎噴嘴與後燃器燈光)
    const nozzleGeo = new THREE.CylinderGeometry(6, 6.5, 8, 12);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, jetBlackWingMat);
    nozzleMesh.rotation.x = Math.PI / 2;
    nozzleMesh.position.z = 24;
    this.playerGroup.add(nozzleMesh);

    const afterburnerLight = new THREE.PointLight(0xff7544, 4.0, 90);
    afterburnerLight.position.set(0, 0, 26);
    this.playerGroup.add(afterburnerLight);

    // ⚡️ 10. Super Saiyan Golden Aura Ring (超級賽亞人黃金光環與黃金光)
    const saiyanAuraGeo = new THREE.TorusGeometry(32, 2.5, 8, 20);
    const saiyanAuraMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      wireframe: true
    });
    const saiyanAuraMesh = new THREE.Mesh(saiyanAuraGeo, saiyanAuraMat);
    saiyanAuraMesh.rotation.x = Math.PI / 2;
    saiyanAuraMesh.visible = false;
    this.playerGroup.add(saiyanAuraMesh);

    const saiyanLight = new THREE.PointLight(0xfacc15, 0, 100);
    saiyanLight.position.set(0, 4, 0);
    this.playerGroup.add(saiyanLight);

    this.playerJetMaterials = {
      bodyMat: jetOrangeBodyMat,
      wingMat: jetBlackWingMat,
      saiyanAuraMesh,
      saiyanLight
    };

    // 11. Shield Geodesic Aura
    const shieldGeo = new THREE.SphereGeometry(32, 16, 16);
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
    pCastle.position.set(320, -6, 575);
    pCastle.scale.set(0.92, 0.92, 0.92);
    this.playerBaseGroup = pCastle;
    this.playerCrystalMesh = pCastle.userData.crystalMesh;
    this.scene.add(pCastle);

    // 2. Enemy Sky Castle (Top, Obsidian/Crimson Dark Laputa)
    const eCastle = this._createFloatingCastleMesh(true);
    eCastle.position.set(320, -6, 65);
    eCastle.scale.set(0.92, 0.92, 0.92);
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

    // 6. 3D Floating Base Health Bar (立體懸浮主塔血條)
    const hpBgGeo = new THREE.BoxGeometry(110, 10, 4);
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const hpBgMesh = new THREE.Mesh(hpBgGeo, hpBgMat);
    hpBgMesh.position.set(0, 140, 0);
    castleGroup.add(hpBgMesh);

    const hpFillGeo = new THREE.BoxGeometry(106, 7, 4.4);
    const hpFillMat = new THREE.MeshBasicMaterial({ color: isEnemy ? 0xef4444 : 0x2ec4b6 });
    const hpFillMesh = new THREE.Mesh(hpFillGeo, hpFillMat);
    hpFillMesh.position.set(0, 140, 0);
    castleGroup.add(hpFillMesh);

    castleGroup.userData = { crystalMesh, hpFillMesh, hpFillMat };
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

    // 🔵 Team Color Ring & Light Indicator (友軍天藍光環 vs 敵軍深紅光環)
    const ringColor = isFriendly ? 0x38bdf8 : 0xef4444;
    const teamRingGeo = new THREE.TorusGeometry(18, 1.8, 8, 16);
    const teamRingMat = new THREE.MeshBasicMaterial({ color: ringColor });
    const teamRing = new THREE.Mesh(teamRingGeo, teamRingMat);
    teamRing.rotation.x = Math.PI / 2;
    teamRing.position.set(0, 0.5, 0);
    monsterGroup.add(teamRing);

    const teamLight = new THREE.PointLight(ringColor, 2.5, 45);
    teamLight.position.set(0, 8, 0);
    monsterGroup.add(teamLight);

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

      // ⚡️ Sync Player Fighter Jet Super Saiyan Transformation (橘黑戰機 <-> 超級賽亞人金橘戰機)
      if (this.playerJetMaterials) {
        const isSuperSaiyan = p.starLevel > 0;
        if (isSuperSaiyan) {
          // ⚡️ Super Saiyan Transformation: Golden Yellow Body with Radiant Orange Wings & Golden Energy Aura!
          this.playerJetMaterials.bodyMat.color.setHex(0xfacc15); // Golden Yellow
          this.playerJetMaterials.bodyMat.emissive.setHex(0xeab308);
          this.playerJetMaterials.bodyMat.emissiveIntensity = 0.55;
          this.playerJetMaterials.wingMat.color.setHex(0xea580c); // Radiant Orange
          if (this.playerJetMaterials.saiyanAuraMesh) {
            this.playerJetMaterials.saiyanAuraMesh.visible = true;
            this.playerJetMaterials.saiyanAuraMesh.rotation.z += 0.08;
          }
          if (this.playerJetMaterials.saiyanLight) {
            this.playerJetMaterials.saiyanLight.intensity = 3.5;
          }
        } else {
          // 🟠 Standard Base State: Racing Orange Body with Obsidian Black Wings!
          this.playerJetMaterials.bodyMat.color.setHex(0xf97316); // Racing Orange
          this.playerJetMaterials.bodyMat.emissive.setHex(0xc2410c);
          this.playerJetMaterials.bodyMat.emissiveIntensity = 0.15;
          this.playerJetMaterials.wingMat.color.setHex(0x0f172a); // Obsidian Black
          if (this.playerJetMaterials.saiyanAuraMesh) {
            this.playerJetMaterials.saiyanAuraMesh.visible = false;
          }
          if (this.playerJetMaterials.saiyanLight) {
            this.playerJetMaterials.saiyanLight.intensity = 0;
          }
        }
      }
    }

    // 2. Rotate Sky Castle Crystals & Sync 3D Floating Base Health Bars
    const now = Date.now();
    if (this.playerCrystalMesh && !state.playerBase.destroyed) {
      this.playerCrystalMesh.rotation.y += 0.025;
      this.playerCrystalMesh.position.y = 52 + Math.sin(now * 0.003) * 4;
    }
    if (this.enemyCrystalMesh && !state.enemyBase.destroyed) {
      this.enemyCrystalMesh.rotation.y -= 0.025;
      this.enemyCrystalMesh.position.y = 52 + Math.sin(now * 0.003 + 1) * 4;
    }

    // Sync Player Base 3D HP Bar
    if (this.playerBaseGroup && this.playerBaseGroup.userData.hpFillMesh) {
      const hp = Math.max(0, state.playerBase.hp);
      const ratio = Math.min(1, hp / state.playerBase.maxHp);
      const fillMesh = this.playerBaseGroup.userData.hpFillMesh;
      fillMesh.scale.x = Math.max(0.001, ratio);
      fillMesh.position.x = -53 * (1 - ratio);

      if (ratio < 0.3) this.playerBaseGroup.userData.hpFillMat.color.setHex(0xef4444);
      else if (ratio < 0.6) this.playerBaseGroup.userData.hpFillMat.color.setHex(0xf97316);
      else this.playerBaseGroup.userData.hpFillMat.color.setHex(0x2ec4b6);
    }

    // Sync Enemy Base 3D HP Bar
    if (this.enemyBaseGroup && this.enemyBaseGroup.userData.hpFillMesh) {
      const hp = Math.max(0, state.enemyBase.hp);
      const ratio = Math.min(1, hp / state.enemyBase.maxHp);
      const fillMesh = this.enemyBaseGroup.userData.hpFillMesh;
      fillMesh.scale.x = Math.max(0.001, ratio);
      fillMesh.position.x = -53 * (1 - ratio);
    }

    // 3. DIRTY CHECK TERRAIN
    this._syncTerrainCached(state.map);

    // 4. Sync Friendly Summoned Creeps (Marching UP)
    this._syncCreepsMap(this.playerCreepMeshes, state.playerCreeps, true);

    // 5. Sync Enemy & Neutral Monsters (Marching DOWN / Jungle)
    this._syncCreepsMap(this.enemyMeshes, state.enemies, false);

    // 6. POOLED BULLETS
    this._syncBulletsPooled(state.bullets);

    // 🏰 Update Base Red Flash & Camera Shake
    [this.playerBaseGroup, this.enemyBaseGroup].forEach(castle => {
      if (castle) {
        if (castle.userData.flashEndTime && castle.userData.flashEndTime > now) {
          if (castle.userData.crystalMesh && castle.userData.crystalMesh.material) {
            castle.userData.crystalMesh.material.emissive.setHex(0xef4444);
            castle.userData.crystalMesh.material.emissiveIntensity = 1.0;
          }
        } else {
          if (castle.userData.crystalMesh && castle.userData.crystalMesh.material) {
            const isEnemy = castle === this.enemyBaseGroup;
            castle.userData.crystalMesh.material.emissive.setHex(isEnemy ? 0xef4444 : 0x06b6d4);
            castle.userData.crystalMesh.material.emissiveIntensity = 0.5;
          }
        }
      }
    });

    if (this.cameraShakeTime && this.cameraShakeTime > now) {
      this.camera.position.x = 320 + (Math.random() - 0.5) * 8;
      this.camera.position.z = 660 + (Math.random() - 0.5) * 8;
    } else {
      this.camera.position.x = 320;
      this.camera.position.z = 660;
    }

    // 💨 Update Smoke & Sparks Base Effect Particles
    if (this.baseEffectParticles && this.baseEffectParticles.length > 0) {
      for (let i = this.baseEffectParticles.length - 1; i >= 0; i--) {
        const p = this.baseEffectParticles[i];
        const data = p.userData;

        p.position.x += data.vx;
        p.position.y += data.vy;
        p.position.z += data.vz;

        data.life -= data.decay;
        p.material.opacity = Math.max(0, data.life);

        if (data.life <= 0) {
          this.scene.remove(p);
          if (p.geometry) p.geometry.dispose();
          if (p.material) p.material.dispose();
          this.baseEffectParticles.splice(i, 1);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 🏰 專屬主塔受擊特效 (濃煙粒子升騰 + 四射火花暴射 + 主塔紅光與相機 Shake)
   */
  triggerBaseDamageEffect(isEnemy = false, hitWorldX = 320, hitWorldZ = 575) {
    const castleGroup = isEnemy ? this.enemyBaseGroup : this.playerBaseGroup;
    if (castleGroup) {
      castleGroup.userData.flashEndTime = Date.now() + 380;
      castleGroup.position.x = (isEnemy ? 320 : 320) + (Math.random() - 0.5) * 6;
    }

    this.cameraShakeTime = Date.now() + 250;

    if (!this.baseEffectParticles) {
      this.baseEffectParticles = [];
    }

    // 1. 💨 滾滾黑濃煙氣泡粒子 (Dark Smoke Clouds)
    for (let i = 0; i < 14; i++) {
      const size = 6 + Math.random() * 8;
      const smokeGeo = new THREE.SphereGeometry(size, 8, 8);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.5 ? 0x334155 : 0x475569,
        transparent: true,
        opacity: 0.75
      });
      const smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
      smokeMesh.position.set(
        hitWorldX + (Math.random() - 0.5) * 50,
        12 + Math.random() * 15,
        hitWorldZ + (Math.random() - 0.5) * 35
      );
      smokeMesh.userData = {
        vy: 1.2 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        life: 1.0,
        decay: 0.025 + Math.random() * 0.02
      };
      this.scene.add(smokeMesh);
      this.baseEffectParticles.push(smokeMesh);
    }

    // 2. ✨ 四射熾熱火花粒子 (Fiery Sparks Burst)
    for (let i = 0; i < 22; i++) {
      const sparkGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.6 ? 0xff7544 : 0xfacc15,
        transparent: true,
        opacity: 1.0
      });
      const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
      sparkMesh.position.set(hitWorldX, 18, hitWorldZ);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      sparkMesh.userData = {
        vx: Math.cos(angle) * speed,
        vy: 2.0 + Math.random() * 4.0,
        vz: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.03
      };
      this.scene.add(sparkMesh);
      this.baseEffectParticles.push(sparkMesh);
    }
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
          // 🏰 Medieval Stone Battlement Wall with Merlons (中世紀城垛石牆)
          const wallGroup = new THREE.Group();

          // Main Stone Wall Body (主體石牆)
          const wallBodyGeo = new THREE.BoxGeometry(tileSize - 2, 32, tileSize - 2);
          const wallBody = new THREE.Mesh(wallBodyGeo, this.stoneWallMat);
          wallBody.position.y = 8;
          wallBody.castShadow = true;
          wallBody.receiveShadow = true;
          wallGroup.add(wallBody);

          // Horizontal Stone Course Lines (水平石縫分層)
          [0, 9, 18].forEach(yOff => {
            const courseGeo = new THREE.BoxGeometry(tileSize - 1, 1.5, tileSize - 1);
            const course = new THREE.Mesh(courseGeo, this.stoneDarkMat);
            course.position.y = yOff;
            wallGroup.add(course);
          });

          // Battlements / Merlons on top (城垛口)
          const merW = (tileSize - 4) / 3;
          [-1, 0, 1].forEach((mi, idx) => {
            if (idx % 2 === 0) return; // skip gap
            const merGeo = new THREE.BoxGeometry(merW - 1, 10, tileSize - 4);
            const merMesh = new THREE.Mesh(merGeo, this.stoneCapMat);
            merMesh.position.set(mi * merW, 30, 0);
            merMesh.castShadow = true;
            wallGroup.add(merMesh);
          });

          // Corner Stone Blocks at base (角落基石)
          [[-tileSize / 2 + 4, 2], [tileSize / 2 - 4, 2]].forEach(([xOff, yOff]) => {
            const cornerGeo = new THREE.BoxGeometry(6, 6, tileSize - 2);
            const cornerMesh = new THREE.Mesh(cornerGeo, this.stoneDarkMat);
            cornerMesh.position.set(xOff, yOff, 0);
            wallGroup.add(cornerMesh);
          });

          wallGroup.position.set(x, 0, z);
          this.terrainGroup.add(wallGroup);
        } else if (tile === TILE_STEEL) {
          const steelGroup = this._createObsidianSteelBastion3D();
          steelGroup.position.set(x, 0, z);
          this.terrainGroup.add(steelGroup);
        } else if (tile === TILE_ICE) {
          const mesh = new THREE.Mesh(this.iceGeo, this.iceMat);
          mesh.position.set(x, 2, z);
          this.terrainGroup.add(mesh);
        } else if (tile === TILE_WATER) {
          const waterGroup = this._createManaWaterPool3D();
          waterGroup.position.set(x, 0, z);
          this.terrainGroup.add(waterGroup);
        } else if (tile === TILE_FOREST) {
          const treeGroup = this._createCathayTreeGroup();
          treeGroup.position.set(x, 0, z);
          this.terrainGroup.add(treeGroup);
        }
      }
    }
  }

  /**
   * 🏰 打造 3D 黑曜石符文方尖碑地堡 (Obsidian Rune Obelisk Bastion - 替換原死板黑色塊)
   */
  _createObsidianSteelBastion3D() {
    const obeliskGroup = new THREE.Group();
    const tileSize = 40;

    // 1. 黑曜石主體基座 (Octagonal Dark Obsidian Pillar)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Deep Obsidian Slate
      metalness: 0.85,
      roughness: 0.25
    });
    const baseGeo = new THREE.CylinderGeometry(17, 18.5, 28, 8);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 14;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    obeliskGroup.add(baseMesh);

    // 2. 四角鍍金鋼鐵護甲飾邊 (Golden Corner Armor Trim)
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Warm Amber Gold Trim
      metalness: 0.9,
      roughness: 0.2
    });
    const trimGeo = new THREE.BoxGeometry(tileSize - 2, 4, tileSize - 2);
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.y = 27;
    trimMesh.castShadow = true;
    obeliskGroup.add(trimMesh);

    // 3. 頂部懸浮暗紫/電藍亮光符文魔晶 (Glowing Arcane Rune Crystal)
    const crystalGeo = new THREE.OctahedronGeometry(7, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, // Arcane Purple Crystal
      emissive: 0x7c3aed,
      emissiveIntensity: 0.85,
      roughness: 0.1
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 32;
    crystalMesh.rotation.y = Math.PI / 4;
    obeliskGroup.add(crystalMesh);

    // 4. 水晶周圍護欄齒 (Battlement Teeth)
    const toothGeo = new THREE.BoxGeometry(5, 6, 5);
    const toothMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    [[-13, -13], [13, -13], [-13, 13], [13, 13]].forEach(([xOff, zOff]) => {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(xOff, 30, zOff);
      obeliskGroup.add(tooth);
    });

    return obeliskGroup;
  }

  /**
   * 🌊 打造 3D 星光藍晶神水池 (Starlight Mana Water Oasis - 替換原死板藍色塊)
   */
  _createManaWaterPool3D() {
    const waterGroup = new THREE.Group();
    const tileSize = 40;

    // 1. 池緣深藍晶石邊框 (Outer Crystal Stone Rim)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Sky Cyan Stone
      roughness: 0.4,
      metalness: 0.3
    });
    const rimGeo = new THREE.BoxGeometry(tileSize - 1, 4, tileSize - 1);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 2;
    waterGroup.add(rimMesh);

    // 2. 沉降池水水面 (Sunken Luminous Mana Water)
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
      roughness: 0.05
    });
    const poolGeo = new THREE.BoxGeometry(tileSize - 5, 5, tileSize - 5);
    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.position.y = 3.5;
    waterGroup.add(poolMesh);

    // 3. 水池中央 3D 魔法睡蓮與水草花 (Floating Magic Water Lily)
    const lilyLeafGeo = new THREE.CylinderGeometry(7, 7, 1.2, 12);
    const lilyLeafMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6 });
    const lilyLeaf = new THREE.Mesh(lilyLeafGeo, lilyLeafMat);
    lilyLeaf.position.set(0, 6.5, 0);
    waterGroup.add(lilyLeaf);

    const lotusBloomGeo = new THREE.SphereGeometry(3.5, 8, 8);
    const lotusBloomMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6, // Pink Magic Water Lotus
      emissive: 0xec4899,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const lotusBloom = new THREE.Mesh(lotusBloomGeo, lotusBloomMat);
    lotusBloom.scale.set(1.0, 0.6, 1.0);
    lotusBloom.position.set(0, 8.5, 0);
    waterGroup.add(lotusBloom);

    return waterGroup;
  }

  /**
   * 🌳 打造國泰人壽風格 3D 大樹 (Cathay Life Tree 3D Model)
   */
  _createCathayTreeGroup() {
    const treeGroup = new THREE.Group();

    // 1. 國泰底座樹幹 (喇叭狀下開展 + 寬底座)
    const baseGeo = new THREE.CylinderGeometry(6, 11, 4, 16);
    const baseMesh = new THREE.Mesh(baseGeo, this.cathayTrunkMat);
    baseMesh.position.y = 2;
    baseMesh.castShadow = true;
    treeGroup.add(baseMesh);

    const trunkGeo = new THREE.CylinderGeometry(4.5, 6, 12, 16);
    const trunkMesh = new THREE.Mesh(trunkGeo, this.cathayTrunkMat);
    trunkMesh.position.y = 8;
    trunkMesh.castShadow = true;
    treeGroup.add(trunkMesh);

    // 2. 國泰巨型弧形大樹冠 (主體蓬鬆圓弧)
    const mainCanopyGeo = new THREE.SphereGeometry(15, 20, 16);
    const mainCanopy = new THREE.Mesh(mainCanopyGeo, this.cathayCanopyMat);
    mainCanopy.scale.set(1.25, 0.75, 1.25); // 展延寬廣的圓弧造型
    mainCanopy.position.y = 20;
    mainCanopy.castShadow = true;
    mainCanopy.receiveShadow = true;
    treeGroup.add(mainCanopy);

    // 3. 國泰樹冠 - 頂部圓滑綠色高光層
    const topCanopyGeo = new THREE.SphereGeometry(11.5, 18, 14);
    const topCanopy = new THREE.Mesh(topCanopyGeo, this.cathayCanopyTopMat);
    topCanopy.scale.set(1.15, 0.7, 1.15);
    topCanopy.position.y = 23.5;
    topCanopy.castShadow = true;
    treeGroup.add(topCanopy);

    // 4. 國泰綠樹左/右經典膨圓雲弧 (還原 LOGO 大樹頂側雙弧特徵)
    const sideLeftGeo = new THREE.SphereGeometry(8.5, 16, 12);
    const sideLeft = new THREE.Mesh(sideLeftGeo, this.cathayCanopyMat);
    sideLeft.scale.set(1.1, 0.75, 1.0);
    sideLeft.position.set(-8.5, 19, 0);
    sideLeft.castShadow = true;
    treeGroup.add(sideLeft);

    const sideRight = new THREE.Mesh(sideLeftGeo, this.cathayCanopyMat);
    sideRight.scale.set(1.1, 0.75, 1.0);
    sideRight.position.set(8.5, 19, 0);
    sideRight.castShadow = true;
    treeGroup.add(sideRight);

    // 5. 底部濃綠陰影層
    const bottomGeo = new THREE.CylinderGeometry(14, 10, 4, 16);
    const bottomShadow = new THREE.Mesh(bottomGeo, this.cathayCanopyShadowMat);
    bottomShadow.position.y = 15;
    treeGroup.add(bottomShadow);

    return treeGroup;
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
