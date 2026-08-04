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
