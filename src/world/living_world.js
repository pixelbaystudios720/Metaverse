// ==========================================================================
// Living 3D World Environment - Complete Connected World
// Exactly recreating the reference images:
// 1. CENTRAL PLAZA (Image 2 Panel 1):
//    - Modern futuristic city skyline with glass & steel skyscrapers
//    - Digital billboards ("TOGETHER BETTER"), animated signage
//    - Grand architectural fountain with tiered basins, water jets, glowing tower/orb
//    - Paved stone plaza with geometric pavers & circular inlays
//    - Modern curved wood-and-steel benches
// 2. ARCADE ENTRANCE (Image 2 Panel 2):
//    - Futuristic architectural arcade facade with pillars & cornice
//    - Massive glowing cyan neon controller + "ARCADE" signage
//    - Illuminated portal archways:
//      * COIN CATCHER (warm golden neon arch, glass doors, interactive)
//      * ROOFTOP RUN (purple/cyan neon arch, glass doors, interactive)
//      * HOT POTATO (bright red neon arch, glass doors, interactive)
//    - Floating "Select Game" menu with direct launch
// 3. PARK AREA (Image 2 Panel 3):
//    - Connected relaxing green park with curved paved walking paths
//    - Blooming pink Japanese cherry blossom trees (Sakura)
//    - Traditional cast iron street lanterns with warm lights
//    - Arched wooden footbridge crossing over blue water canal/pond
//    - Park benches facing the pond with sitting interaction ("Press E to sit")
// 4. CARS & TRAFFIC (Image 2 Panel 4):
//    - Multi-lane asphalt road, sidewalks, curbs, pedestrian crosswalk
//    - Functional 3-lamp traffic light post cycling Red, Yellow, Green
//    - Yellow Sports Coupe with aerodynamic wing and red taillights
//    - Red City Transit Bus with illuminated passenger windows
//    - Vehicles brake at red/yellow lights, accelerate on green, avoid collisions
// 5. INTERACTIVE BUILDING DOORS (Image 2 Panel 5):
//    - Modern glass building entrance with transparent sliding double doors
//    - "Press E to open" prompt, smooth opening & closing animations
// 6. MINI-GAMES CONNECTED:
//    - Coin Catcher: 3D cyber grid arena, crates, spinning coins, Score & 45s timer
//    - Rooftop Run: High-altitude obstacle course, red platforms, checkpoints, finish gate
//    - Hot Potato: 3D stadium colosseum, fuse countdown, runners, angry potato bomb
// 7. COMPLETE GAME UI & FEATURES (Image 2 Panel 8):
//    - Profile card with avatar portrait & level
//    - Minimap radar with compass & Central Plaza coordinates
//    - Glassmorphism live chat box
//    - Full modal with Leaderboard (Global/Friends), Game Selection & Settings
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';
import { map3DEngine } from '../engine/map3d.js';

export class LivingWorld {
  constructor(scene, playerController, options = {}) {
    this.scene = scene;
    this.player = playerController;
    this.options = options;

    this.root = new THREE.Group();
    this.root.name = 'living_world_root';
    this.scene.add(this.root);

    // Trackers
    this.updatables = [];
    this.coins = [];
    this.benches = [];
    this.doors = [];
    this.vehicles = [];
    this.trafficLights = [];
    this.gamePortals = [];
    this.particles = [];

    // Player State
    this.isSitting = false;
    this.sittingBench = null;
    this.coinsCollected = parseInt(localStorage.getItem('aa_collected_coins') || '140', 10);
    this.activePrompt = null;
    this.activePromptCallback = null;

    // Build the World Elements
    this.setupSkyAndEnvironment();
    this.buildRoadsAndCrosswalks();
    this.buildCentralPlaza();
    this.buildCoinCatcherBuilding(); // Left Building (-18, 0, -18)
    this.buildHotPotatoBuilding();   // Right Building (18, 0, -18)
    this.buildParkArea();
    this.buildTrafficSystem();
    this.buildCollectibleCoins();
    this.buildUIOverlays();

    // Hook up keyboard input for interactions
    this.setupKeyBindings();

    // Force update matrix world so world positions are accurate
    this.root.updateMatrixWorld(true);
    this.refreshWorldPositions();
  }

  // ---------------------------------------------------------------- Key Bindings
  setupKeyBindings() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        if (this.activePromptCallback) {
          e.preventDefault();
          const cb = this.activePromptCallback;
          cb();
        }
      } else if (this.isSitting && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.standUp();
      }
    });
  }

  standUp() {
    if (!this.isSitting) return;
    this.isSitting = false;
    this.sittingBench = null;
    this.player.y = 0;
    this.clearPrompt();
  }

  // ---------------------------------------------------------------- 1. Environment Fill Lighting & Clouds
  setupSkyAndEnvironment() {
    // Soft subtle ground fill to enhance shadows without washing out stone textures
    const subtleHemi = new THREE.HemisphereLight(0xfff5e6, 0x3d662e, 0.35);
    this.root.add(subtleHemi);

    // Drifting 3D Cumulus Clouds matching the bright sci-fi atmosphere in reference image
    this.cloudGroup = new THREE.Group();
    this.root.add(this.cloudGroup);

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });

    const cloudConfigs = [
      { x: -35, y: 62, z: -40, s: 14 },
      { x: 15, y: 68, z: -55, s: 18 },
      { x: 50, y: 60, z: -25, s: 15 },
      { x: -55, y: 65, z: 10, s: 16 },
      { x: 30, y: 72, z: 45, s: 20 },
      { x: -25, y: 58, z: 50, s: 14 },
      { x: 0, y: 75, z: 70, s: 22 },
      { x: -70, y: 64, z: -60, s: 19 },
    ];

    cloudConfigs.forEach((cfg, ci) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(cfg.x, cfg.y, cfg.z);

      // Multi-puff cloud geometry
      const puffs = [
        [0, 0, 0, 1.0],
        [-0.7 * cfg.s, -0.1 * cfg.s, 0.2 * cfg.s, 0.75],
        [0.7 * cfg.s, -0.15 * cfg.s, -0.2 * cfg.s, 0.8],
        [0.2 * cfg.s, 0.3 * cfg.s, 0.1 * cfg.s, 0.7],
        [-0.3 * cfg.s, 0.25 * cfg.s, -0.3 * cfg.s, 0.65],
      ];

      puffs.forEach(([px, py, pz, psc]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(cfg.s * 0.45 * psc, 10, 8), cloudMat);
        puff.scale.set(1.4, 0.65, 1.0);
        puff.position.set(px, py, pz);
        cGrp.add(puff);
      });

      this.cloudGroup.add(cGrp);
    });

    // Cloud drift animation
    this.updatables.push((t, dt) => {
      this.cloudGroup.children.forEach((c, i) => {
        c.position.x += dt * (0.8 + (i % 3) * 0.4);
        if (c.position.x > 120) c.position.x = -120;
      });
    });
  }

  // ---------------------------------------------------------------- 2. Roads & Crosswalks (Panel 4)
  buildRoadsAndCrosswalks() {
    this.roadGroup = new THREE.Group();
    this.root.add(this.roadGroup);

    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.82,
      metalness: 0.15,
    });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5f6fa });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfbc531 });

    // Multi-lane roadway placed safely along outer arterial boulevard (x = 38.5, z from -96 to 96)
    // 20+ meters away from the plaza and Hot Potato building!
    const roadWidth = 9.5;
    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 200), asphaltMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(38.5, 0.02, 0);
    roadMesh.receiveShadow = true;
    this.roadGroup.add(roadMesh);

    // Center divider dashed line (x = 38.5)
    for (let z = -92; z <= 92; z += 4) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 2.2), yellowLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(38.5, 0.03, z);
      this.roadGroup.add(dash);
    }

    // Painted Pedestrian Crosswalk stripes (z = 4)
    for (let x = 34.2; x <= 42.8; x += 1.1) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 4.0), lineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.032, 4);
      this.roadGroup.add(stripe);
    }

    // Lane Stop Lines before crosswalk
    const stopLineNorth = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth * 0.44, 0.65), lineMat);
    stopLineNorth.rotation.x = -Math.PI / 2;
    stopLineNorth.position.set(36.25, 0.033, 7.2);
    this.roadGroup.add(stopLineNorth);

    const stopLineSouth = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth * 0.44, 0.65), lineMat);
    stopLineSouth.rotation.x = -Math.PI / 2;
    stopLineSouth.position.set(40.75, 0.033, 0.8);
    this.roadGroup.add(stopLineSouth);

    // Concrete Sidewalk along road
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.24, 200), sidewalkMat);
    sidewalk.position.set(31.6, 0.12, 0);
    sidewalk.receiveShadow = true;
    this.roadGroup.add(sidewalk);

    // Solid Protective Road Guardrail (Blocks vehicles from entering pedestrian plaza!)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
    const guardrail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.95, 200), railMat);
    guardrail.position.set(33.6, 0.48, 0);
    this.roadGroup.add(guardrail);

    // Glowing Neon Edge on guardrail
    const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 200), new THREE.MeshBasicMaterial({ color: 0x00d2d3 }));
    railGlow.position.set(33.4, 0.96, 0);
    this.roadGroup.add(railGlow);

    // Cyber Bus Stop Transit Shelter on Sidewalk (x = 31.0, z = -14)
    const shelterGroup = new THREE.Group();
    shelterGroup.position.set(31.0, 0.24, -14);
    const steelDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const glassShelter = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.45 });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 5.2), steelDark);
    roof.position.set(0, 2.7, 0);
    shelterGroup.add(roof);

    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 5.0), glassShelter);
    backGlass.position.set(-1.0, 1.35, 0);
    shelterGroup.add(backGlass);

    [-2.4, 2.4].forEach((pz) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), steelDark);
      col.position.set(-1.0, 1.3, pz);
      shelterGroup.add(col);
    });

    const sbench = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 3.4), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 }));
    sbench.position.set(-0.5, 0.45, 0);
    shelterGroup.add(sbench);

    this.roadGroup.add(shelterGroup);

    // Overhead Cyber Highway Gantry Sign (x = 38.5, z = -45)
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(38.5, 0, -45);

    [-5.6, 5.6].forEach((tx) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.2, 0.4), steelDark);
      tower.position.set(tx, 3.6, 0);
      gantryGroup.add(tower);
    });

    const spanTruss = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.45, 0.45), steelDark);
    spanTruss.position.set(0, 6.8, 0);
    gantryGroup.add(spanTruss);

    const gCanvas = document.createElement('canvas');
    gCanvas.width = 1024;
    gCanvas.height = 256;
    const gctx = gCanvas.getContext('2d');
    gctx.fillStyle = '#090d16';
    gctx.fillRect(0, 0, 1024, 256);
    gctx.strokeStyle = '#38bdf8';
    gctx.lineWidth = 8;
    gctx.strokeRect(10, 10, 1004, 236);

    gctx.fillStyle = '#00d2d3';
    gctx.font = '900 52px Fredoka, sans-serif';
    gctx.textAlign = 'center';
    gctx.fillText('⇡ CENTRAL PLAZA   |   ⇡ MULTIPLAYER ARENAS', 512, 100);
    gctx.fillStyle = '#facc15';
    gctx.font = '700 42px Fredoka, sans-serif';
    gctx.fillText('🪙 COIN CATCHER (LEFT)  ·  🔥 HOT POTATO (RIGHT)', 512, 185);

    const gantrySign = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 2.3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gCanvas) })
    );
    gantrySign.position.set(0, 6.8, 0.25);
    gantryGroup.add(gantrySign);

    this.roadGroup.add(gantryGroup);
  }

  // ---------------------------------------------------------------- 3. Central Plaza & Skyline (Panel 1)
  createPlazaPaverTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Warm terracotta / limestone base matching Image 2 Panel 1
    ctx.fillStyle = '#bfae9c';
    ctx.fillRect(0, 0, 1024, 1024);

    const tileSize = 64;
    const tiles = 1024 / tileSize;

    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const rand = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const brightness = 0.92 + Math.abs(rand) * 0.15;
        const r = Math.floor(198 * brightness);
        const g = Math.floor(178 * brightness);
        const b = Math.floor(158 * brightness);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
      }
    }

    // Grout lines
    ctx.strokeStyle = '#8a7968';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(28, 28);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildCentralPlaza() {
    this.plazaGroup = new THREE.Group();
    this.root.add(this.plazaGroup);

    // Grand Vast City Ground Platform (200m x 200m base + 190m circular inlay)
    const baseFoundationGeo = new THREE.BoxGeometry(204, 0.4, 204);
    const baseFoundationMat = new THREE.MeshStandardMaterial({
      color: 0x1e2230,
      roughness: 0.8,
      metalness: 0.15,
    });
    const baseFoundation = new THREE.Mesh(baseFoundationGeo, baseFoundationMat);
    baseFoundation.position.set(0, -0.1, 0);
    baseFoundation.receiveShadow = true;
    this.plazaGroup.add(baseFoundation);

    // Warm polished stone plaza pavers - EXPANDED TO R=94m
    const plazaGeo = new THREE.CylinderGeometry(94, 95, 0.22, 64);
    const plazaMat = new THREE.MeshStandardMaterial({
      map: this.createPlazaPaverTexture(),
      roughness: 0.62,
      metalness: 0.05,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(0, 0.11, 0);
    plaza.receiveShadow = true;
    this.plazaGroup.add(plaza);

    // Continuous Perimeter Glass Safety Balustrade with Neon Cyan Railing (R = 92m)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.8,
    });
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });

    const barrierGroup = new THREE.Group();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const aNext = ((i + 1) / 48) * Math.PI * 2;
      const px = Math.cos(a) * 92.0;
      const pz = Math.sin(a) * 92.0;
      const nx = Math.cos(aNext) * 92.0;
      const nz = Math.sin(aNext) * 92.0;
      const mx = (px + nx) / 2;
      const mz = (pz + nz) / 2;
      const segLen = Math.hypot(nx - px, nz - pz);
      const segAng = Math.atan2(nx - px, nz - pz);

      // Support post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), postMat);
      post.position.set(px, 0.7, pz);
      barrierGroup.add(post);

      // Glass panel
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, segLen - 0.1), glassMat);
      glass.position.set(mx, 0.65, mz);
      glass.rotation.y = segAng;
      barrierGroup.add(glass);

      // Top glowing neon rail
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, segLen), railMat);
      rail.position.set(mx, 1.25, mz);
      rail.rotation.y = segAng;
      barrierGroup.add(rail);
    }
    this.plazaGroup.add(barrierGroup);

    // Decorative Grand Plaza Inlay Rings
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9e8e7a });
    [8, 18, 32, 50, 70, 85].forEach((r) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.16, 64), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.222, 0);
      this.plazaGroup.add(ring);
    });

    // Grand Architectural Fountain in Center (Matching Image 2 Panel 1)
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0, 0);

    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xedebe4, roughness: 0.35, metalness: 0.1 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00d2d3,
      roughness: 0.08,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85,
    });

    // Basin 1 (Bottom Tier)
    const basin1 = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 0.7, 36), marbleMat);
    basin1.position.y = 0.35;
    basin1.receiveShadow = true;
    basin1.castShadow = true;
    fountainGroup.add(basin1);

    const water1 = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.1, 36), waterMat);
    water1.position.y = 0.65;
    fountainGroup.add(water1);

    // Basin 2 (Mid Tier)
    const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.6, 28), marbleMat);
    basin2.position.y = 1.15;
    basin2.receiveShadow = true;
    basin2.castShadow = true;
    fountainGroup.add(basin2);

    const water2 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 28), waterMat);
    water2.position.y = 1.42;
    fountainGroup.add(water2);

    // Central Tower & Glowing Blue Glass Sphere (As seen in Image 2 Panel 1)
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const centralSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.2, 16), towerMat);
    centralSpire.position.y = 2.4;
    fountainGroup.add(centralSpire);

    const orbGeo = new THREE.SphereGeometry(1.2, 24, 24);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.9,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 3.6;
    fountainGroup.add(orb);

    // Upward Water Jets
    const jetMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.75 });
    const jets = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 1.8, 8), jetMat);
      jet.position.set(Math.cos(angle) * 1.8, 1.8, Math.sin(angle) * 1.8);
      jet.rotation.x = Math.sin(angle) * 0.35;
      jet.rotation.z = -Math.cos(angle) * 0.35;
      fountainGroup.add(jet);
      jets.push(jet);
    }

    // Fountain Glow PointLight
    const fountainLight = new THREE.PointLight(0x38bdf8, 1.8, 14);
    fountainLight.position.set(0, 3.8, 0);
    fountainGroup.add(fountainLight);

    this.plazaGroup.add(fountainGroup);

    // Fountain animation
    this.updatables.push((t, dt) => {
      orb.position.y = 3.6 + Math.sin(t * 2.5) * 0.18;
      orb.rotation.y += dt * 0.8;
      jets.forEach((jet, i) => {
        jet.scale.y = 1 + Math.sin(t * 4 + i) * 0.15;
      });
    });

    // Modern Curved Benches around Plaza
    this.buildPlazaBenches();

    // Futuristic Skyscrapers & Skyline in Horizon
    this.buildCitySkyline();
  }

  buildPlazaBenches() {
    this.benchGroup = new THREE.Group();
    this.root.add(this.benchGroup);

    const configs = [
      { x: -5.5, z: -4.5, rotY: Math.PI / 2 },
      { x: 5.5, z: -4.5, rotY: -Math.PI / 2 },
      { x: -6.5, z: 6.5, rotY: Math.PI / 4 },
      { x: 6.5, z: 6.5, rotY: -Math.PI / 4 },
    ];

    configs.forEach((cfg) => {
      const bench = this.createBenchMesh(cfg.x, cfg.z, cfg.rotY);
      this.benchGroup.add(bench);
      this.benches.push({
        group: bench,
        pos: new THREE.Vector3(cfg.x, 0, cfg.z),
        sitPos: new THREE.Vector3(cfg.x, 0.48, cfg.z),
        rotY: cfg.rotY,
      });
    });

    // Sitting interaction update
    this.updatables.push(() => {
      if (this.isSitting) {
        if (this.sittingBench) {
          this.player.x = this.sittingBench.sitPos.x;
          this.player.z = this.sittingBench.sitPos.z;
          this.player.y = 0.48;
          this.player.heading = this.sittingBench.rotY;
        }
        return;
      }

      const px = this.player.x;
      const pz = this.player.z;
      const near = this.benches.find((b) => Math.hypot(px - b.pos.x, pz - b.pos.z) < 1.9);
      if (near && !this.activePrompt?.includes('play')) {
        this.setPrompt('Press E to sit on bench', () => {
          this.isSitting = true;
          this.sittingBench = near;
          sound.playClick();
          this.setPrompt('Press WASD or Space to stand up', () => {
            this.standUp();
          });
        });
      }
    });
  }

  createBenchMesh(x, z, rotY) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.65 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.75), woodMat);
    seat.position.set(0, 0.48, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.08), woodMat);
    back.position.set(0, 0.85, -0.32);
    back.castShadow = true;
    group.add(back);

    [-1.0, 1.0].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.72), steelMat);
      leg.position.set(lx, 0.24, 0);
      group.add(leg);
    });

    return group;
  }

  // Helper: Procedural high-res skyscraper facade texture with lit windows and glass reflections
  createSkyscraperTexture(theme = 'blue') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base glass / metal tint
    ctx.fillStyle = theme === 'blue' ? '#0f172a' : (theme === 'cyan' ? '#082f49' : '#1e1b4b');
    ctx.fillRect(0, 0, 512, 1024);

    const cols = 12;
    const rows = 28;
    const w = 512 / cols;
    const h = 1024 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * w + 3;
        const y = r * h + 3;
        const winW = w - 6;
        const winH = h - 6;

        // Random window state: lit office or reflective glass
        const rand = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        const isLit = (Math.abs(rand) % 1) > 0.42;

        if (isLit) {
          const warm = (Math.abs(rand * 2.3) % 1) > 0.6;
          ctx.fillStyle = warm ? '#fef08a' : (theme === 'cyan' ? '#67e8f9' : '#bae6fd');
          ctx.fillRect(x, y, winW, winH);
        } else {
          ctx.fillStyle = theme === 'blue' ? '#1e293b' : '#164e63';
          ctx.fillRect(x, y, winW, winH);
        }
      }
    }

    // Structural mullions and horizontal floor beams
    ctx.fillStyle = '#334155';
    for (let c = 0; c <= cols; c++) {
      ctx.fillRect(c * w - 1.5, 0, 3, 1024);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.fillRect(0, r * h - 1.5, 512, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildCitySkyline() {
    this.skylineRoot = new THREE.Group();
    this.root.add(this.skylineRoot);

    const texBlue = this.createSkyscraperTexture('blue');
    const texCyan = this.createSkyscraperTexture('cyan');
    const texPurple = this.createSkyscraperTexture('purple');

    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
    const brightGlassBlue = new THREE.MeshStandardMaterial({ map: texBlue, roughness: 0.15, metalness: 0.85 });
    const brightGlassCyan = new THREE.MeshStandardMaterial({ map: texCyan, roughness: 0.15, metalness: 0.85 });
    const brightGlassPurple = new THREE.MeshStandardMaterial({ map: texPurple, roughness: 0.15, metalness: 0.85 });
    const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
    const blueNeonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const goldNeonMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // =========================================================================
    // 1. HERO LANDMARK: The "TOGETHER BETTER" Rotunda (East-North, Image 2 Panel 1)
    // =========================================================================
    const rotundaGroup = new THREE.Group();
    rotundaGroup.position.set(18, 0, -36);
    rotundaGroup.rotation.y = -Math.PI * 0.25;

    // Multi-tier stepped cylindrical structure
    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 12, 36), darkSteelMat);
    baseCyl.position.y = 6;
    baseCyl.castShadow = true;
    rotundaGroup.add(baseCyl);

    const midCyl = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 14, 36), brightGlassCyan);
    midCyl.position.y = 19;
    midCyl.castShadow = true;
    rotundaGroup.add(midCyl);

    const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(10, 11.5, 8, 36), darkSteelMat);
    topCyl.position.y = 30;
    rotundaGroup.add(topCyl);

    // Glowing Cyan Catwalk Rings
    [12, 26, 34].forEach((ry) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(ry === 12 ? 15.3 : (ry === 26 ? 13.3 : 10.3), 0.22, 12, 48), cyanNeonMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry;
      rotundaGroup.add(ring);
    });

    // Massive Curved "TOGETHER BETTER" Digital Billboard Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 340;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#090d16';
    sCtx.fillRect(0, 0, 1024, 340);
    // Neon Cyan border
    sCtx.strokeStyle = '#00d2d3';
    sCtx.lineWidth = 12;
    sCtx.strokeRect(16, 16, 992, 308);
    // Texts matching Panel 1
    sCtx.fillStyle = '#ffffff';
    sCtx.font = '900 86px Fredoka, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('TOGETHER', 512, 125);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = '900 96px Fredoka, sans-serif';
    sCtx.fillText('BETTER', 512, 235);
    sCtx.fillStyle = '#94a3b8';
    sCtx.font = '700 32px Fredoka, sans-serif';
    sCtx.fillText('FUTURISTIC SOCIAL METAVERSE', 512, 290);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const curvedSign = new THREE.Mesh(
      new THREE.CylinderGeometry(15.4, 15.4, 6.8, 32, 1, true, Math.PI * 0.65, Math.PI * 0.7),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    curvedSign.position.y = 8;
    rotundaGroup.add(curvedSign);

    // Rotunda Roof Spire
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.2, 16, 12), cyanNeonMat);
    spire.position.y = 42;
    rotundaGroup.add(spire);

    this.skylineRoot.add(rotundaGroup);

    // =========================================================================
    // 2. HERO LANDMARK: The Great Center Spire Tower with Glowing Blue Channel (North)
    // =========================================================================
    const centerSpireGroup = new THREE.Group();
    centerSpireGroup.position.set(0, 0, -48);

    // 85-meter Glass Skyscraper Body
    const spireTower = new THREE.Mesh(new THREE.BoxGeometry(16, 80, 16), brightGlassBlue);
    spireTower.position.y = 40;
    spireTower.castShadow = true;
    centerSpireGroup.add(spireTower);

    // Tapered Upper Tier
    const spireTier2 = new THREE.Mesh(new THREE.BoxGeometry(11, 24, 11), brightGlassCyan);
    spireTier2.position.y = 92;
    centerSpireGroup.add(spireTier2);

    // Central Glowing Blue Energy Channel (Running up the entire facade!)
    const energyConduit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 92, 0.4), cyanNeonMat);
    energyConduit.position.set(0, 46, 8.1);
    centerSpireGroup.add(energyConduit);

    // Needle Antenna Spire reaching 115m
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.4, 28, 8), darkSteelMat);
    needle.position.y = 118;
    centerSpireGroup.add(needle);

    // Blinking beacon on antenna top
    const beaconLight = new THREE.PointLight(0x38bdf8, 2.5, 30);
    beaconLight.position.y = 132;
    centerSpireGroup.add(beaconLight);

    this.skylineRoot.add(centerSpireGroup);

    // =========================================================================
    // 3. 360-DEGREE DENSE SKYLINE: 26+ Individual Modern Glass & Steel Towers
    // =========================================================================
    const cityTowers = [
      // NORTH CLUSTER
      { x: -16, z: -42, w: 14, h: 64, d: 14, mat: brightGlassBlue, crown: 'angled' },
      { x: -32, z: -38, w: 16, h: 52, d: 15, mat: brightGlassCyan, crown: 'flat', billboard: 'DREAM BIG' },
      { x: -46, z: -35, w: 18, h: 72, d: 16, mat: brightGlassPurple, crown: 'spire' },
      { x: 34, z: -40, w: 15, h: 58, d: 15, mat: brightGlassBlue, crown: 'stepped' },
      { x: 48, z: -36, w: 20, h: 68, d: 18, mat: brightGlassCyan, crown: 'spire' },

      // EAST CLUSTER (Framing Road & Arcade)
      { x: 38, z: -18, w: 16, h: 62, d: 14, mat: brightGlassCyan, crown: 'stepped' },
      { x: 42, z: 2, w: 18, h: 74, d: 16, mat: brightGlassBlue, crown: 'spire' },
      { x: 40, z: 22, w: 16, h: 56, d: 15, mat: brightGlassPurple, crown: 'angled', billboard: 'CYBER CITY' },
      { x: 44, z: 40, w: 18, h: 64, d: 18, mat: brightGlassCyan, crown: 'flat' },

      // SOUTH-EAST CLUSTER
      { x: 26, z: 42, w: 16, h: 58, d: 14, mat: brightGlassBlue, crown: 'stepped' },
      { x: 14, z: 46, w: 15, h: 66, d: 15, mat: brightGlassPurple, crown: 'spire' },

      // SOUTH CLUSTER (Directly behind player spawn)
      { x: -2, z: 48, w: 18, h: 72, d: 16, mat: brightGlassCyan, crown: 'angled', billboard: 'METAVERSE' },
      { x: -18, z: 46, w: 15, h: 60, d: 15, mat: brightGlassBlue, crown: 'stepped' },
      { x: -30, z: 44, w: 16, h: 54, d: 14, mat: brightGlassPurple, crown: 'flat' },

      // SOUTH-WEST CLUSTER (Behind Park)
      { x: -42, z: 36, w: 18, h: 68, d: 16, mat: brightGlassCyan, crown: 'spire' },
      { x: -48, z: 18, w: 16, h: 58, d: 15, mat: brightGlassBlue, crown: 'stepped' },

      // WEST CLUSTER
      { x: -44, z: -4, w: 20, h: 76, d: 18, mat: brightGlassBlue, crown: 'spire' },
      { x: -40, z: -20, w: 16, h: 62, d: 14, mat: brightGlassCyan, crown: 'angled', billboard: 'HORIZONS' },
      { x: -26, z: -28, w: 12, h: 48, d: 12, mat: brightGlassPurple, crown: 'flat' },
    ];

    cityTowers.forEach((t) => {
      const bGrp = new THREE.Group();
      bGrp.position.set(t.x, 0, t.z);

      // Main tower body
      const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), t.mat);
      mainMesh.position.y = t.h / 2;
      mainMesh.castShadow = true;
      mainMesh.receiveShadow = true;
      bGrp.add(mainMesh);

      // Crown Architecture
      if (t.crown === 'spire') {
        const spireCone = new THREE.Mesh(new THREE.ConeGeometry(t.w * 0.45, 16, 4), darkSteelMat);
        spireCone.position.y = t.h + 8;
        spireCone.rotation.y = Math.PI / 4;
        bGrp.add(spireCone);

        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 12, 8), cyanNeonMat);
        ant.position.y = t.h + 22;
        bGrp.add(ant);
      } else if (t.crown === 'stepped') {
        const step1 = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.75, 8, t.d * 0.75), darkSteelMat);
        step1.position.y = t.h + 4;
        bGrp.add(step1);

        const step2 = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.5, 6, t.d * 0.5), cyanNeonMat);
        step2.position.y = t.h + 11;
        bGrp.add(step2);
      } else if (t.crown === 'angled') {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.9, 4, t.d * 0.9), darkSteelMat);
        roof.position.y = t.h + 2;
        roof.rotation.x = 0.25;
        bGrp.add(roof);
      }

      // Vertical Accent Neon Strips along building corners
      const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.25, t.h, 0.25), cyanNeonMat);
      stripL.position.set(-t.w / 2 + 0.1, t.h / 2, t.d / 2 + 0.1);
      bGrp.add(stripL);

      const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.25, t.h, 0.25), blueNeonMat);
      stripR.position.set(t.w / 2 - 0.1, t.h / 2, t.d / 2 + 0.1);
      bGrp.add(stripR);

      // Digital Billboard Screens
      if (t.billboard) {
        const bbCanvas = document.createElement('canvas');
        bbCanvas.width = 512;
        bbCanvas.height = 160;
        const bCtx = bbCanvas.getContext('2d');
        bCtx.fillStyle = '#0f172a';
        bCtx.fillRect(0, 0, 512, 160);
        bCtx.strokeStyle = '#38bdf8';
        bCtx.lineWidth = 8;
        bCtx.strokeRect(10, 10, 492, 140);
        bCtx.fillStyle = '#38bdf8';
        bCtx.font = '900 48px Fredoka, sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText(t.billboard, 256, 95);

        const bbMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(t.w * 0.85, 4.8),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bbCanvas) })
        );
        bbMesh.position.set(0, t.h * 0.65, t.d / 2 + 0.08);
        bGrp.add(bbMesh);
      }

      this.skylineRoot.add(bGrp);
    });

    // =========================================================================
    // 4. OUTER RING MEGACITY SILHOUETTES: 40+ Distant Towers across 360 Degrees
    // =========================================================================
    const farBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x33485d,
      roughness: 0.6,
      metalness: 0.3,
    });

    const farTowerCount = 42;
    for (let i = 0; i < farTowerCount; i++) {
      const angle = (i / farTowerCount) * Math.PI * 2;
      const dist = 75 + ((i * 37) % 35);
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;
      const fw = 14 + ((i * 13) % 12);
      const fh = 55 + ((i * 29) % 55);
      const fd = 14 + ((i * 17) % 12);

      const fMesh = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), farBuildingMat);
      fMesh.position.set(fx, fh / 2, fz);
      this.skylineRoot.add(fMesh);

      // Rooftop glowing beacon on distant skyscrapers
      if (i % 2 === 0) {
        const bcon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), i % 4 === 0 ? cyanNeonMat : goldNeonMat);
        bcon.position.set(fx, fh + 1.2, fz);
        this.skylineRoot.add(bcon);
      }
    }

    // =========================================================================
    // 5. PLAZA PERIMETER: Concrete Tree Planters & Modern Architectural Streetlights
    // =========================================================================
    this.buildPlazaPerimeterDecor();
  }

  buildPlazaPerimeterDecor() {
    this.perimeterGroup = new THREE.Group();
    this.root.add(this.perimeterGroup);

    const planterMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.65 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    const lampGlow = new THREE.MeshBasicMaterial({ color: 0xfffbeb });

    // 1. Outer Perimeter Planters & Trees framing the big 160m platform (R = 76m)
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      // Leave open spaces for roads and bridges
      if (angle > -0.22 && angle < 0.52) continue;

      const px = Math.cos(angle) * 76.0;
      const pz = Math.sin(angle) * 76.0;

      const pGrp = new THREE.Group();
      pGrp.position.set(px, 0.11, pz);

      const curb = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.55, 18), planterMat);
      curb.position.y = 0.28;
      curb.receiveShadow = true;
      pGrp.add(curb);

      const hedge = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.7, 0.4, 18), hedgeMat);
      hedge.position.y = 0.58;
      pGrp.add(hedge);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4.6, 8), trunkMat);
      trunk.position.y = 2.3;
      trunk.castShadow = true;
      pGrp.add(trunk);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 10), leafMat);
      crown.position.y = 4.8;
      crown.scale.set(1.15, 0.95, 1.15);
      crown.castShadow = true;
      pGrp.add(crown);

      this.perimeterGroup.add(pGrp);
    }

    // 2. Interior Promenade Trees (R = 36m) spaced for open walking avenues
    [0.75, 1.4, 2.2, 2.9, 3.8, 4.5, 5.3, 6.0].forEach((angle) => {
      const px = Math.cos(angle) * 36.0;
      const pz = Math.sin(angle) * 36.0;

      const pGrp = new THREE.Group();
      pGrp.position.set(px, 0.11, pz);

      const curb = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.45, 16), planterMat);
      curb.position.y = 0.22;
      curb.receiveShadow = true;
      pGrp.add(curb);

      const hedge = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.4, 0.35, 16), hedgeMat);
      hedge.position.y = 0.48;
      pGrp.add(hedge);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 4.0, 8), trunkMat);
      trunk.position.y = 2.0;
      trunk.castShadow = true;
      pGrp.add(trunk);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10), leafMat);
      crown.position.y = 4.2;
      crown.castShadow = true;
      pGrp.add(crown);

      this.perimeterGroup.add(pGrp);
    });

    // 3. Modern Dual-Head Architectural Streetlights along inner and outer avenues
    const lightRadii = [26.0, 56.0];
    lightRadii.forEach((rad, ri) => {
      const count = ri === 0 ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (ri * Math.PI) / count;
        const lx = Math.cos(angle) * rad;
        const lz = Math.sin(angle) * rad;

        const lGrp = new THREE.Group();
        lGrp.position.set(lx, 0.11, lz);
        lGrp.rotation.y = angle + Math.PI / 2;

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.8, 8), lampMat);
        post.position.y = 2.4;
        lGrp.add(post);

        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), lampMat);
        bar.position.y = 4.7;
        lGrp.add(bar);

        [-0.8, 0.8].forEach((bx) => {
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.25), lampGlow);
          head.position.set(bx, 4.62, 0);
          lGrp.add(head);

          const pLight = new THREE.PointLight(0xfff7ed, 0.65, 12);
          pLight.position.set(bx, 4.5, 0);
          lGrp.add(pLight);
        });

        this.perimeterGroup.add(lGrp);
      }
    });
  }

  // ---------------------------------------------------------------- 4. COIN CATCHER ARENA BUILDING (Left Building at -18, 0, -18)
  buildCoinCatcherBuilding() {
    this.coinCatcherGroup = new THREE.Group();
    this.coinCatcherGroup.position.set(-18.0, 0, -18.0);
    this.root.add(this.coinCatcherGroup);

    const facadeMat = new THREE.MeshStandardMaterial({ color: 0x141026, roughness: 0.45, metalness: 0.4 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0x3d2c0b, roughness: 0.3, metalness: 0.7 });
    const goldNeonMat = new THREE.MeshBasicMaterial({ color: 0xffbf1f });
    const cyanLedMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

    // 1. Grand Left Building Facade (width 16.0m, height 8.0m, depth 5.0m)
    const facadeGeo = new THREE.BoxGeometry(16.0, 8.0, 5.0);
    const facade = new THREE.Mesh(facadeGeo, facadeMat);
    facade.position.set(0, 4.0, 0);
    facade.castShadow = true;
    facade.receiveShadow = true;
    this.coinCatcherGroup.add(facade);

    // 2. Front Entrance Terrace (width 17.0m, depth 3.6m, height 0.22m)
    const terraceGeo = new THREE.BoxGeometry(17.0, 0.22, 3.6);
    const terrace = new THREE.Mesh(terraceGeo, goldTrimMat);
    terrace.position.set(0, 0.11, 2.7);
    terrace.receiveShadow = true;
    this.coinCatcherGroup.add(terrace);

    // Glowing Golden LED trim along terrace edge
    const terraceGlow = new THREE.Mesh(new THREE.BoxGeometry(17.1, 0.08, 0.12), goldNeonMat);
    terraceGlow.position.set(0, 0.22, 4.45);
    this.coinCatcherGroup.add(terraceGlow);

    // 3. Cyber Columns Framing Entrance
    [-7.6, -3.2, 3.2, 7.6].forEach((cx) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.1, 0.9), goldTrimMat);
      col.position.set(cx, 4.05, 2.55);
      this.coinCatcherGroup.add(col);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.2, 0.06), goldNeonMat);
      strip.position.set(cx, 4.0, 3.02);
      this.coinCatcherGroup.add(strip);
    });

    // 4. Grand Glowing Golden Neon Archway Portal
    const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.4), goldNeonMat);
    archLeft.position.set(-2.0, 2.3, 2.58);
    this.coinCatcherGroup.add(archLeft);

    const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.4), goldNeonMat);
    archRight.position.set(2.0, 2.3, 2.58);
    this.coinCatcherGroup.add(archRight);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.36, 0.4, 0.4), goldNeonMat);
    archTop.position.set(0, 4.6, 2.58);
    this.coinCatcherGroup.add(archTop);

    // 5. Interactive Double Sliding Glass Doors
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffbf1f,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0xff9f00,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.45,
    });
    this.ccLeftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 4.2, 0.08), glassMat);
    this.ccLeftDoor.position.set(-0.9, 2.1, 2.54);
    this.coinCatcherGroup.add(this.ccLeftDoor);

    this.ccRightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 4.2, 0.08), glassMat);
    this.ccRightDoor.position.set(0.9, 2.1, 2.54);
    this.coinCatcherGroup.add(this.ccRightDoor);

    // Door Open/Close Animation
    this.updatables.push((t, dt) => {
      const dist = Math.hypot(this.player.x - (-18), this.player.z - (-16));
      const shouldOpen = dist < 4.2;
      const targetOffset = shouldOpen ? 1.4 : 0.0;
      this.ccLeftDoor.position.x = THREE.MathUtils.lerp(this.ccLeftDoor.position.x, -0.9 - targetOffset, dt * 6);
      this.ccRightDoor.position.x = THREE.MathUtils.lerp(this.ccRightDoor.position.x, 0.9 + targetOffset, dt * 6);
    });

    // 6. Floating Rotating 3D Holographic Gold Coin on Rooftop
    const coinRooftopGroup = new THREE.Group();
    coinRooftopGroup.position.set(0, 9.6, 2.5);
    const bigCoinGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.28, 32);
    const bigCoinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2, emissive: 0xffaa00, emissiveIntensity: 0.4 });
    const bigCoin = new THREE.Mesh(bigCoinGeo, bigCoinMat);
    bigCoin.rotation.x = Math.PI / 2;
    coinRooftopGroup.add(bigCoin);

    const ringGeo = new THREE.TorusGeometry(2.1, 0.06, 12, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
    const orbitRing = new THREE.Mesh(ringGeo, ringMat);
    coinRooftopGroup.add(orbitRing);
    this.coinCatcherGroup.add(coinRooftopGroup);

    this.updatables.push((t, dt) => {
      bigCoin.rotation.z += dt * 1.8;
      orbitRing.rotation.x = Math.sin(t * 1.5) * 0.4;
      orbitRing.rotation.y += dt * 1.2;
    });

    // 7. Sleek Illuminated Marquee Sign: "🪙 COIN CATCHER ARENA"
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, 768, 200);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 744, 176);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 64px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪙 COIN CATCHER ARENA', 384, 95);

    ctx.font = '700 26px Fredoka, sans-serif';
    ctx.fillStyle = '#00d2d3';
    ctx.fillText('COLLECT COINS · DODGE RUGS · COMPETE WITH PLAYERS', 384, 150);

    const marqueeTex = new THREE.CanvasTexture(canvas);
    const marqueeSign = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.3), new THREE.MeshBasicMaterial({ map: marqueeTex }));
    marqueeSign.position.set(0, 6.4, 2.62);
    this.coinCatcherGroup.add(marqueeSign);

    // Register Portal for interaction & prompt
    this.gamePortals.push({
      id: 'coincatcher',
      title: 'Coin Catcher Arena',
      group: this.coinCatcherGroup,
      localX: 0,
      pos: new THREE.Vector3(-18.0, 0, -15.5),
      colorHex: '#facc15',
    });
  }

  // ---------------------------------------------------------------- 5. Park Area (Panel 3)
  buildParkArea() {
    this.parkGroup = new THREE.Group();
    this.parkGroup.position.set(-20, 0, 4); // South-West connected area
    this.root.add(this.parkGroup);

    // Lush green park lawn (24m x 28m)
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(24, 0.18, 28), lawnMat);
    lawn.position.set(0, 0.09, 0);
    lawn.receiveShadow = true;
    this.parkGroup.add(lawn);

    // Curved Stone Footpath
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd6cbbd, roughness: 0.7 });
    const path = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 26), pathMat);
    path.position.set(4, 0.11, 0);
    path.receiveShadow = true;
    this.parkGroup.add(path);

    // Park Pond / Water Canal with Water Lilies
    const pondMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85,
    });
    const pond = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.12, 32), pondMat);
    pond.position.set(-5, 0.12, -2);
    pond.receiveShadow = true;
    this.parkGroup.add(pond);

    // Arched Wooden Japanese Footbridge crossing the water
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(-5, 0.2, -2);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
    const bridgeArch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 7.5), woodMat);
    bridgeArch.position.y = 0.45;
    bridgeArch.castShadow = true;
    bridgeGroup.add(bridgeArch);

    [-1.1, 1.1].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 7.5), woodMat);
      rail.position.set(rx, 0.75, 0);
      bridgeGroup.add(rail);
    });

    this.parkGroup.add(bridgeGroup);

    // Blooming Pink Cherry Blossom Trees (Sakura) - Matching Image 2 Panel 3
    const sakuraPositions = [
      [-8, 6],
      [-7, -9],
      [7, 8],
      [6, -8],
      [-2, 10],
    ];

    sakuraPositions.forEach(([sx, sz]) => {
      const sakura = this.createSakuraTreeMesh();
      sakura.position.set(sx, 0, sz);
      this.parkGroup.add(sakura);
    });

    // Traditional Cast Iron Street Lanterns
    const lanternPositions = [
      [2.2, 6],
      [2.2, -6],
      [-5, 4],
    ];

    lanternPositions.forEach(([lx, lz]) => {
      const lantern = this.createStreetLanternMesh();
      lantern.position.set(lx, 0, lz);
      this.parkGroup.add(lantern);
    });

    // Park Benches facing the pond with sit interaction
    const pBench = this.createBenchMesh(-5, 4.2, Math.PI);
    this.parkGroup.add(pBench);
    this.benches.push({
      group: pBench,
      pos: new THREE.Vector3(-25, 0, 8.2),
      sitPos: new THREE.Vector3(-25, 0.48, 8.2),
      rotY: Math.PI,
    });
  }

  createSakuraTreeMesh() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.85 });
    const sakuraPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.45 });

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 4.8, 10), trunkMat);
    trunk.position.y = 2.4;
    trunk.castShadow = true;
    group.add(trunk);

    // Pink Blossom Canopies
    const clusterOffsets = [
      [0, 4.8, 0, 1.6],
      [-0.9, 4.2, 0.6, 1.3],
      [0.9, 4.4, -0.6, 1.3],
      [0, 5.5, 0, 1.2],
    ];

    clusterOffsets.forEach(([cx, cy, cz, rad]) => {
      const cluster = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 14), sakuraPinkMat);
      cluster.position.set(cx, cy, cz);
      cluster.castShadow = true;
      group.add(cluster);
    });

    return group;
  }

  createStreetLanternMesh() {
    const group = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), ironMat);
    post.position.y = 1.7;
    post.castShadow = true;
    group.add(post);

    const lanternHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.42), glowMat);
    lanternHead.position.y = 3.3;
    group.add(lanternHead);

    const light = new THREE.PointLight(0xfde047, 1.2, 8);
    light.position.y = 3.3;
    group.add(light);

    return group;
  }

  // ---------------------------------------------------------------- 6. Interactive Building Entrance (Panel 5)
  // ---------------------------------------------------------------- 6. HOT POTATO COLOSSEUM BUILDING (Right Building at 18, 0, -18)
  buildHotPotatoBuilding() {
    this.hotPotatoGroup = new THREE.Group();
    this.hotPotatoGroup.position.set(18.0, 0, -18.0);
    this.root.add(this.hotPotatoGroup);

    const facadeMat = new THREE.MeshStandardMaterial({ color: 0x1f0d14, roughness: 0.45, metalness: 0.4 });
    const redTrimMat = new THREE.MeshStandardMaterial({ color: 0x3d0e1c, roughness: 0.3, metalness: 0.7 });
    const redNeonMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const orangeNeonMat = new THREE.MeshBasicMaterial({ color: 0xff9f1a });

    // 1. Grand Right Building Facade (width 16.0m, height 8.0m, depth 5.0m)
    const facadeGeo = new THREE.BoxGeometry(16.0, 8.0, 5.0);
    const facade = new THREE.Mesh(facadeGeo, facadeMat);
    facade.position.set(0, 4.0, 0);
    facade.castShadow = true;
    facade.receiveShadow = true;
    this.hotPotatoGroup.add(facade);

    // 2. Front Entrance Terrace (width 17.0m, depth 3.6m, height 0.22m)
    const terraceGeo = new THREE.BoxGeometry(17.0, 0.22, 3.6);
    const terrace = new THREE.Mesh(terraceGeo, redTrimMat);
    terrace.position.set(0, 0.11, 2.7);
    terrace.receiveShadow = true;
    this.hotPotatoGroup.add(terrace);

    // Glowing Crimson LED trim along terrace edge
    const terraceGlow = new THREE.Mesh(new THREE.BoxGeometry(17.1, 0.08, 0.12), redNeonMat);
    terraceGlow.position.set(0, 0.22, 4.45);
    this.hotPotatoGroup.add(terraceGlow);

    // 3. Cyber Columns Framing Entrance
    [-7.6, -3.2, 3.2, 7.6].forEach((cx) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.1, 0.9), redTrimMat);
      col.position.set(cx, 4.05, 2.55);
      this.hotPotatoGroup.add(col);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.2, 0.06), redNeonMat);
      strip.position.set(cx, 4.0, 3.02);
      this.hotPotatoGroup.add(strip);
    });

    // 4. Grand Glowing Neon Crimson Archway Portal
    const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.4), redNeonMat);
    archLeft.position.set(-2.0, 2.3, 2.58);
    this.hotPotatoGroup.add(archLeft);

    const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.4), redNeonMat);
    archRight.position.set(2.0, 2.3, 2.58);
    this.hotPotatoGroup.add(archRight);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.36, 0.4, 0.4), redNeonMat);
    archTop.position.set(0, 4.6, 2.58);
    this.hotPotatoGroup.add(archTop);

    // 5. Interactive Double Sliding Glass Doors
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xff3838,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0xff2222,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.45,
    });
    this.hpLeftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 4.2, 0.08), glassMat);
    this.hpLeftDoor.position.set(-0.9, 2.1, 2.54);
    this.hotPotatoGroup.add(this.hpLeftDoor);

    this.hpRightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 4.2, 0.08), glassMat);
    this.hpRightDoor.position.set(0.9, 2.1, 2.54);
    this.hotPotatoGroup.add(this.hpRightDoor);

    // Door Open/Close Animation
    this.updatables.push((t, dt) => {
      const dist = Math.hypot(this.player.x - 18, this.player.z - (-16));
      const shouldOpen = dist < 4.2;
      const targetOffset = shouldOpen ? 1.4 : 0.0;
      this.hpLeftDoor.position.x = THREE.MathUtils.lerp(this.hpLeftDoor.position.x, -0.9 - targetOffset, dt * 6);
      this.hpRightDoor.position.x = THREE.MathUtils.lerp(this.hpRightDoor.position.x, 0.9 + targetOffset, dt * 6);
    });

    // 6. Floating 3D Holographic Fire Bomb on Rooftop
    const bombGroup = new THREE.Group();
    bombGroup.position.set(0, 9.6, 2.5);
    const bombSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.3, emissive: 0xff2200, emissiveIntensity: 0.35 })
    );
    bombGroup.add(bombSphere);

    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12), redTrimMat);
    fuse.position.set(0, 1.45, 0);
    bombGroup.add(fuse);

    const flameSpark = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd000 })
    );
    flameSpark.position.set(0, 1.85, 0);
    bombGroup.add(flameSpark);

    const bombRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.06, 12, 36), orangeNeonMat);
    bombGroup.add(bombRing);
    this.hotPotatoGroup.add(bombGroup);

    this.updatables.push((t, dt) => {
      const scale = 1.0 + Math.sin(t * 5.0) * 0.08;
      bombGroup.scale.set(scale, scale, scale);
      bombRing.rotation.y += dt * 2.2;
      flameSpark.scale.setScalar(0.8 + Math.sin(t * 12.0) * 0.3);
    });

    // 7. Sleek Illuminated Marquee Sign: "🔥 HOT POTATO COLOSSEUM"
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#14080e';
    ctx.fillRect(0, 0, 768, 200);

    ctx.strokeStyle = '#ff3838';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 744, 176);

    ctx.fillStyle = '#ff3838';
    ctx.font = '900 64px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 HOT POTATO COLOSSEUM', 384, 95);

    ctx.font = '700 26px Fredoka, sans-serif';
    ctx.fillStyle = '#ff9f1a';
    ctx.fillText('PASS THE BOMB · SURVIVE THE BLAST · BATTLE ROYALE', 384, 150);

    const marqueeTex = new THREE.CanvasTexture(canvas);
    const marqueeSign = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.3), new THREE.MeshBasicMaterial({ map: marqueeTex }));
    marqueeSign.position.set(0, 6.4, 2.62);
    this.hotPotatoGroup.add(marqueeSign);

    // Register Portal for interaction & prompt
    this.gamePortals.push({
      id: 'hotpotato',
      title: 'Hot Potato Colosseum',
      group: this.hotPotatoGroup,
      localX: 0,
      pos: new THREE.Vector3(18.0, 0, -15.5),
      colorHex: '#ff3838',
    });
  }

  // ---------------------------------------------------------------- 7. Cars & Outer Boulevard Traffic System
  buildTrafficSystem() {
    this.trafficGroup = new THREE.Group();
    this.root.add(this.trafficGroup);

    // Build Dual-Side Traffic Light at Outer Crosswalk (x = 34.0, z = 4)
    this.buildTrafficLight();

    // ---------------------------------------------------------------
    // 6 Distinct Futuristic Vehicles on Outer Highway Boulevard
    // Placed strictly on the outer lanes (x = 36.25 and 40.75), 18m+ from pedestrian plaza!
    // ---------------------------------------------------------------
    // Lane 1: NORTHBOUND (x = 36.25, traveling toward -z, heading = 0)
    const car1 = this.createSportsCar(0xfacc15, 'PLAY', 0x00d2d3);
    car1.position.set(36.25, 0, 35);
    car1.userData = { speed: 11.0, baseSpeed: 11.0, dir: -1, lane: 'north', wheels: car1.userData.wheels };

    const car2 = this.createTaxiCar();
    car2.position.set(36.25, 0, -18);
    car2.userData = { speed: 8.5, baseSpeed: 8.5, dir: -1, lane: 'north', wheels: car2.userData.wheels };

    const car3 = this.createCityBus();
    car3.position.set(36.25, 0, 85);
    car3.userData = { speed: 7.2, baseSpeed: 7.2, dir: -1, lane: 'north', wheels: car3.userData.wheels };

    // Lane 2: SOUTHBOUND (x = 40.75, traveling toward +z, heading = Math.PI)
    const car4 = this.createSportsCar(0x9333ea, 'NEON', 0xff007f);
    car4.rotation.y = Math.PI;
    car4.position.set(40.75, 0, -45);
    car4.userData = { speed: 10.5, baseSpeed: 10.5, dir: 1, lane: 'south', wheels: car4.userData.wheels };

    const car5 = this.createCyberTruck();
    car5.rotation.y = Math.PI;
    car5.position.set(40.75, 0, 15);
    car5.userData = { speed: 7.8, baseSpeed: 7.8, dir: 1, lane: 'south', wheels: car5.userData.wheels };

    const car6 = this.createSportsCar(0x22c55e, 'VOLT', 0x22c55e);
    car6.rotation.y = Math.PI;
    car6.position.set(40.75, 0, -85);
    car6.userData = { speed: 9.8, baseSpeed: 9.8, dir: 1, lane: 'south', wheels: car6.userData.wheels };

    this.vehicles = [car1, car2, car3, car4, car5, car6];
    this.vehicles.forEach((v) => this.trafficGroup.add(v));

    // Futuristic High-Altitude Sky-Cruisers (flying between skyline skyscrapers at y = 52m)
    this.skyCruisers = [];
    [
      { x: -45, y: 52, speed: 16, color: 0x00d2d3 },
      { x: 0, y: 56, speed: 20, color: 0xfacc15 },
      { x: 45, y: 50, speed: 14, color: 0xff4757 }
    ].forEach((cfg, idx) => {
      const sc = this.createSportsCar(cfg.color, `SKY${idx}`, cfg.color);
      sc.position.set(cfg.x, cfg.y, (idx - 1) * 45);
      sc.userData = { speed: cfg.speed, dir: idx % 2 === 0 ? 1 : -1, isSky: true };
      if (sc.userData.dir === 1) sc.rotation.y = Math.PI;
      this.trafficGroup.add(sc);
      this.skyCruisers.push(sc);
    });

    // Traffic System Loop
    this.updatables.push((t, dt) => {
      this.updateTrafficLights(dt);
      this.updateVehicles(dt);
      // Sky-Cruisers glide seamlessly in high airspace
      this.skyCruisers.forEach((sc) => {
        sc.position.z += sc.userData.dir * sc.userData.speed * dt;
        if (sc.userData.dir === -1 && sc.position.z < -140) sc.position.z = 140;
        else if (sc.userData.dir === 1 && sc.position.z > 140) sc.position.z = -140;
      });
    });
  }

  buildTrafficLight() {
    const group = new THREE.Group();
    group.position.set(34.0, 0, 4);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.5, 12), poleMat);
    pole.position.y = 2.75;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), poleMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(2.1, 5.2, 0);
    group.add(arm);

    const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 0.55), boxMat);
    box.position.set(3.2, 4.4, 0);
    group.add(box);

    // Visors
    [-0.5, 0, 0.5].forEach((ly) => {
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 12, 1, true, 0, Math.PI), boxMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(3.2, 4.4 + ly, 0.24);
      group.add(visor);
    });

    // 3 Vehicle Signal Lamps
    const redMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff0000, emissiveIntensity: 0.1 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0x222200, emissive: 0xffaa00, emissiveIntensity: 0.1 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x00ff66, emissiveIntensity: 2.2 });

    const redLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), redMat);
    redLamp.position.set(3.2, 4.9, 0.22);
    group.add(redLamp);

    const yellowLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), yellowMat);
    yellowLamp.position.set(3.2, 4.4, 0.22);
    group.add(yellowLamp);

    const greenLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), greenMat);
    greenLamp.position.set(3.2, 3.9, 0.22);
    group.add(greenLamp);

    // Pedestrian Signal Head on Pole facing sidewalk
    const pedBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.35), boxMat);
    pedBox.position.set(0, 2.4, 0.25);
    group.add(pedBox);

    const pedWalkMat = new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x00ff66, emissiveIntensity: 0.1 });
    const pedStopMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff0000, emissiveIntensity: 2.2 });

    const pedStop = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), pedStopMat);
    pedStop.position.set(0, 2.55, 0.43);
    group.add(pedStop);

    const pedWalk = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), pedWalkMat);
    pedWalk.position.set(0, 2.25, 0.43);
    group.add(pedWalk);

    this.trafficLight = {
      group,
      state: 'green',
      timer: 9.0,
      redMat,
      yellowMat,
      greenMat,
      pedWalkMat,
      pedStopMat,
    };

    this.trafficGroup.add(group);
  }

  updateTrafficLights(dt) {
    if (!this.trafficLight) return;
    const tl = this.trafficLight;
    tl.timer -= dt;

    if (tl.state === 'green' && tl.timer <= 0) {
      tl.state = 'yellow';
      tl.timer = 2.5;
      tl.greenMat.emissiveIntensity = 0.1;
      tl.yellowMat.emissiveIntensity = 2.0;
      tl.redMat.emissiveIntensity = 0.1;
      tl.pedWalkMat.emissiveIntensity = 0.1;
      tl.pedStopMat.emissiveIntensity = 2.2;
    } else if (tl.state === 'yellow' && tl.timer <= 0) {
      tl.state = 'red';
      tl.timer = 7.0;
      tl.greenMat.emissiveIntensity = 0.1;
      tl.yellowMat.emissiveIntensity = 0.1;
      tl.redMat.emissiveIntensity = 2.2;
      tl.pedWalkMat.emissiveIntensity = 2.2;
      tl.pedStopMat.emissiveIntensity = 0.1;
    } else if (tl.state === 'red' && tl.timer <= 0) {
      tl.state = 'green';
      tl.timer = 9.0;
      tl.greenMat.emissiveIntensity = 2.2;
      tl.yellowMat.emissiveIntensity = 0.1;
      tl.redMat.emissiveIntensity = 0.1;
      tl.pedWalkMat.emissiveIntensity = 0.1;
      tl.pedStopMat.emissiveIntensity = 2.2;
    }
  }

  updateVehicles(dt) {
    const isStopping = this.trafficLight && (this.trafficLight.state === 'red' || this.trafficLight.state === 'yellow');

    for (let i = 0; i < this.vehicles.length; i++) {
      const car = this.vehicles[i];
      const dir = car.userData.dir; // -1 for Northbound, +1 for Southbound
      let desiredSpeed = car.userData.baseSpeed;

      // 1. Traffic Light Stop Line Check
      if (isStopping) {
        if (dir === -1 && car.position.z > 7.5 && car.position.z < 26.0) {
          desiredSpeed = 0;
        } else if (dir === 1 && car.position.z < 0.5 && car.position.z > -18.0) {
          desiredSpeed = 0;
        }
      }

      // 2. Intelligent Car-Following Distance (Collision Avoidance in same lane)
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (other.userData.lane === car.userData.lane) {
          // Distance ahead along direction of travel
          const distAhead = (other.position.z - car.position.z) * dir;
          if (distAhead > 0 && distAhead < 14.0) {
            if (distAhead < 6.5) {
              desiredSpeed = 0;
            } else {
              desiredSpeed = Math.min(desiredSpeed, other.userData.speed * 0.85);
            }
          }
        }
      }

      // 3. Smooth Acceleration and Braking (Realistic vehicle inertia)
      car.userData.speed = THREE.MathUtils.lerp(car.userData.speed, desiredSpeed, dt * 3.8);

      // 4. Position Update along Z
      car.position.z += dir * car.userData.speed * dt;

      // 5. Realistic Wheel Rotation
      if (car.userData.wheels) {
        const rotStep = dir * car.userData.speed * dt * 2.8;
        for (let w = 0; w < car.userData.wheels.length; w++) {
          car.userData.wheels[w].rotation.x += rotStep;
        }
      }

      // 6. Seamless Two-Way Circuit Looping
      if (dir === -1 && car.position.z < -98) {
        car.position.z = 98;
      } else if (dir === 1 && car.position.z > 98) {
        car.position.z = -98;
      }
    }
  }

  createSportsCar(bodyColor, plateText, glowColor = 0x00d2d3) {
    const group = new THREE.Group();
    const wheels = [];

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.2, metalness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });

    // Aerodynamic Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.58, 4.3), bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    group.add(chassis);

    // Sleek Cockpit
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 2.2), glassMat);
    cabin.position.set(0, 1.05, -0.25);
    group.add(cabin);

    // Rear Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 0.4), bodyMat);
    spoiler.position.set(0, 1.15, 1.85);
    group.add(spoiler);

    // Underglow Neon Strip
    const underglow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 3.6), glowMat);
    underglow.position.set(0, 0.18, 0);
    group.add(underglow);

    // Red LED Taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.1), tailMat);
    tail.position.set(0, 0.65, 2.16);
    group.add(tail);

    // White Xenon Headlights
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.75, 0.75].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), headMat);
      hl.position.set(hx, 0.55, -2.16);
      group.add(hl);
    });

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });

    [
      [-1.05, 0.36, 1.35],
      [1.05, 0.36, 1.35],
      [-1.05, 0.36, -1.35],
      [1.05, 0.36, -1.35],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
      wheels.push(wheel);
    });

    group.userData.wheels = wheels;
    return group;
  }

  createTaxiCar() {
    const group = new THREE.Group();
    const wheels = [];

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    // Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.4), bodyMat);
    chassis.position.y = 0.58;
    chassis.castShadow = true;
    group.add(chassis);

    // White Accent Panels
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.2, 4.35), whiteMat);
    sideStripe.position.set(0, 0.65, 0);
    group.add(sideStripe);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 2.4), glassMat);
    cabin.position.set(0, 1.15, -0.15);
    group.add(cabin);

    // Rooftop Illuminated TAXI Sign
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.28, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    taxiSign.position.set(0, 1.6, -0.15);
    group.add(taxiSign);

    // Headlights and Taillights
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.75, 0.75].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), headMat);
      hl.position.set(hx, 0.55, -2.21);
      group.add(hl);
    });

    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tail.position.set(0, 0.65, 2.21);
    group.add(tail);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });

    [
      [-1.05, 0.36, 1.35],
      [1.05, 0.36, 1.35],
      [-1.05, 0.36, -1.35],
      [1.05, 0.36, -1.35],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
      wheels.push(wheel);
    });

    group.userData.wheels = wheels;
    return group;
  }

  createCyberTruck() {
    const group = new THREE.Group();
    const wheels = [];

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.95 });

    // Angular Heavy Cyber Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.25, 5.2), steelMat);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    // Angular Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 2.4), glassMat);
    cabin.position.set(0, 1.75, -0.6);
    group.add(cabin);

    // Cargo Bay Trim
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.6, 2.3), darkMat);
    bed.position.set(0, 1.35, 1.35);
    group.add(bed);

    // Front Neon Light Bar
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lightBar.position.set(0, 1.2, -2.61);
    group.add(lightBar);

    // Rear Red LED Strip
    const rearBar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    rearBar.position.set(0, 1.1, 2.61);
    group.add(rearBar);

    // 4 Heavy Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.32, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    [
      [-1.15, 0.44, 1.6],
      [1.15, 0.44, 1.6],
      [-1.15, 0.44, -1.6],
      [1.15, 0.44, -1.6],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
      wheels.push(wheel);
    });

    group.userData.wheels = wheels;
    return group;
  }

  createCityBus() {
    const group = new THREE.Group();
    const wheels = [];

    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.6 });

    // Large Bus Body (width 2.6m, height 3.2m, length 8.8m)
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 8.8), redMat);
    body.position.y = 1.9;
    body.castShadow = true;
    group.add(body);

    // Window Strips
    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.1, 8.2), glassMat);
    winStrip.position.set(0, 2.4, 0);
    group.add(winStrip);

    // Route Sign on Front
    const routeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    routeSign.position.set(0, 3.1, -4.41);
    group.add(routeSign);

    // Headlights
    [-0.9, 0.9].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(hx, 0.75, -4.41);
      group.add(hl);
    });

    // Taillights
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tail.position.set(0, 0.85, 4.41);
    group.add(tail);

    // 4 Large Bus Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    [
      [-1.35, 0.48, 2.6],
      [1.35, 0.48, 2.6],
      [-1.35, 0.48, -2.6],
      [1.35, 0.48, -2.6],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
      wheels.push(wheel);
    });

    group.userData.wheels = wheels;
    return group;
  }

  // ---------------------------------------------------------------- 8. Rotating Collectible Coins
  buildCollectibleCoins() {
    this.coinGroup = new THREE.Group();
    this.root.add(this.coinGroup);

    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0xff9900,
      emissiveIntensity: 0.45,
    });

    const positions = [
      [0, 6],
      [-6, 0],
      [6, 0],
      [0, -6],
      [-8, 6],
      [8, 6],
      [-6, -10],
      [6, -10],
      [-12, 0],
      [10, 4],
    ];

    positions.forEach(([cx, cz]) => {
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.position.set(cx, 0.75, cz);
      mesh.castShadow = true;
      this.coinGroup.add(mesh);
      this.coins.push({ mesh, x: cx, z: cz, active: true, respawn: 0 });
    });

    this.updatables.push((t, dt) => {
      const px = this.player.x;
      const pz = this.player.z;
      this.coins.forEach((c) => {
        if (!c.active) {
          c.respawn -= dt;
          if (c.respawn <= 0) {
            c.active = true;
            c.mesh.visible = true;
          }
          return;
        }

        c.mesh.rotation.z += dt * 3.5;
        c.mesh.position.y = 0.75 + Math.sin(t * 4 + c.x) * 0.16;

        if (Math.hypot(px - c.x, pz - c.z) < 1.25) {
          c.active = false;
          c.mesh.visible = false;
          c.respawn = 20;
          this.coinsCollected += 10;
          localStorage.setItem('aa_collected_coins', String(this.coinsCollected));
          window.dispatchEvent(new CustomEvent('coins-updated', { detail: { coins: this.coinsCollected } }));
          sound.playCoin();
          this.showCoinPopText(c.x, c.z, '+10 Coins');
        }
      });
    });
  }

  showCoinPopText(x, z, text) {
    const pop = document.createElement('div');
    pop.style.cssText = `
      position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%);
      color: #fde047; font-size: 28px; font-weight: 900; text-shadow: 0 4px 12px rgba(0,0,0,0.8);
      pointer-events: none; z-index: 100; font-family: "Fredoka", sans-serif;
      animation: popUp 1.2s forwards ease-out;
    `;
    pop.textContent = text;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
  }

  // ---------------------------------------------------------------- 9. Complete UI & Features (Panel 8)
  buildUIOverlays() {
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'living-world-hud';
    this.hudContainer.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 90;
      font-family: "Fredoka", system-ui, sans-serif;
    `;

    // Inject dedicated responsive styles for the Living World HUD
    const styleEl = document.createElement('style');
    styleEl.id = 'lw-hud-styles';
    styleEl.textContent = `
      #lw-profile-card {
        position: absolute; top: 18px; left: 18px; display: flex; align-items: center; gap: 12px;
        background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(14px); border: 1px solid rgba(56, 189, 248, 0.3);
        padding: 8px 16px 8px 10px; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        pointer-events: auto; z-index: 50; transition: all 0.2s ease;
      }
      #lw-token-bar {
        position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: center; gap: 10px;
        background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(16px);
        border: 1.5px solid rgba(250, 204, 21, 0.45);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(250, 204, 21, 0.18);
        border-radius: 999px; padding: 6px 12px 6px 14px;
        pointer-events: auto; z-index: 50; transition: all 0.2s ease;
      }
      .lw-token-live-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
        box-shadow: 0 0 10px #22c55e; animation: lw-pulse 1.8s infinite;
      }
      @keyframes lw-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
      }
      .lw-token-tag { display: flex; flex-direction: column; line-height: 1.1; }
      .lw-token-name { font-weight: 900; font-size: 13.5px; color: #fde047; letter-spacing: 0.4px; }
      .lw-token-status { font-size: 9px; font-weight: 800; color: #22c55e; letter-spacing: 0.5px; }
      .lw-token-ca-box {
        display: flex; align-items: center; gap: 5px;
        background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 999px; padding: 3px 9px; font-size: 11px; color: #cbd5e1;
        cursor: pointer; transition: all 0.15s ease;
      }
      .lw-token-ca-box:hover { background: rgba(250, 204, 21, 0.18); border-color: #facc15; color: #fff; }
      .lw-ca-chip { background: #facc15; color: #0f172a; font-weight: 900; font-size: 9.5px; padding: 1px 5px; border-radius: 4px; }
      .lw-btn-token-buy {
        background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 999px;
        color: #fff; font-size: 11.5px; font-weight: 800; padding: 6px 14px; text-decoration: none;
        display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        transition: transform 0.15s ease, filter 0.15s ease;
      }
      .lw-btn-token-buy:hover { transform: translateY(-1px); filter: brightness(1.1); }
      .lw-btn-token-airdrop {
        background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 999px;
        color: #38bdf8; font-size: 11.5px; font-weight: 800; padding: 5px 12px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;
      }
      .lw-btn-token-airdrop:hover { background: rgba(56, 189, 248, 0.3); color: #fff; }
      #lw-minimap-card {
        position: absolute; top: 18px; right: 18px; display: flex; flex-direction: column; align-items: center; gap: 6px;
        pointer-events: auto; z-index: 50; transition: all 0.2s ease;
      }
      #lw-chat-card {
        position: absolute; bottom: 20px; left: 18px; width: 320px; background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.15); border-radius: 18px;
        padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); pointer-events: auto; z-index: 45;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #lw-main-menu-modal {
        display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 760px; max-width: calc(100vw - 20px); height: 480px; max-height: calc(100vh - 40px);
        background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(24px);
        border: 2px solid #38bdf8; border-radius: 24px; box-shadow: 0 25px 70px rgba(0,0,0,0.85);
        pointer-events: auto; color: #fff; z-index: 100; overflow: hidden;
      }

      /* Mobile Overrides (width <= 640px) */
      @media (max-width: 640px) {
        #lw-profile-card {
          top: 10px !important;
          left: 10px !important;
          gap: 8px !important;
          padding: 6px 10px 6px 7px !important;
          border-radius: 16px !important;
          max-width: none !important;
          width: auto !important;
        }
        #lw-profile-card .lw-avatar-icon {
          width: 34px !important;
          height: 34px !important;
          font-size: 17px !important;
        }
        #lw-profile-card .lw-player-name {
          font-size: 13px !important;
        }
        #lw-profile-card .lw-player-level {
          font-size: 10.5px !important;
        }
        #lw-profile-card #lw-coins-badge {
          font-size: 10.5px !important;
          padding: 2px 7px !important;
        }
        #lw-profile-card .lw-xp-bar-wrap {
          width: 44px !important;
          height: 4px !important;
        }
        #lw-profile-card .lw-xp-text {
          display: none !important;
        }
        #lw-profile-card #lw-btn-menu {
          width: 30px !important;
          height: 30px !important;
          font-size: 14px !important;
          margin-left: 4px !important;
        }

        /* Mobile Token Bar: Docked neatly under profile card on the left, never overlapping minimap on the right */
        #lw-token-bar {
          top: 56px !important;
          left: 10px !important;
          transform: none !important;
          padding: 3px 8px !important;
          gap: 5px !important;
          max-width: calc(100vw - 105px) !important;
          box-sizing: border-box !important;
        }
        .lw-token-name { font-size: 11px !important; }
        .lw-token-status { display: none !important; }
        .lw-token-ca-box { padding: 2px 6px !important; font-size: 9.5px !important; }
        .lw-ca-digits { max-width: 60px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lw-btn-token-buy { padding: 3px 8px !important; font-size: 10px !important; }
        .lw-btn-token-airdrop { display: none !important; }

        /* Minimap on mobile: Clean 68px radar in top right without colliding side buttons */
        #lw-minimap-card {
          top: 10px !important;
          right: 10px !important;
          gap: 3px !important;
        }
        #lw-minimap-card .lw-minimap-circle {
          width: 68px !important;
          height: 68px !important;
          border-width: 2px !important;
        }
        #lw-minimap-card #lw-minimap-canvas {
          width: 68px !important;
          height: 68px !important;
        }
        /* Hide side floating radar buttons on mobile to avoid screen clutter; tapping circle opens map */
        #lw-mm-zoom-in, #lw-mm-zoom-out, #lw-mm-expand {
          display: none !important;
        }
        #lw-minimap-card .lw-loc-badge, #lw-loc-badge {
          font-size: 9px !important;
          padding: 2px 6px !important;
          border-radius: 8px !important;
          margin-top: 2px !important;
        }

        /* Chat positioned on mobile above touch controls, collapsible */
        #lw-chat-card {
          bottom: 80px !important;
          left: 10px !important;
          width: calc(100vw - 20px) !important;
          max-width: 270px !important;
          padding: 8px !important;
          border-radius: 14px !important;
        }
        #lw-chat-card.collapsed #lw-chat-messages,
        #lw-chat-card.collapsed .lw-chat-input-row {
          display: none !important;
        }
        #lw-chat-card.collapsed {
          width: auto !important;
          padding: 5px 10px !important;
          border-radius: 999px !important;
          bottom: 12px !important;
          left: 10px !important;
          background: rgba(15, 23, 42, 0.92) !important;
        }
        #lw-chat-messages {
          max-height: 60px !important;
          font-size: 11px !important;
        }

        /* Menu modal mobile adjustments */
        #lw-main-menu-modal {
          width: calc(100vw - 20px) !important;
          max-height: 84vh !important;
          border-radius: 18px !important;
          height: auto !important;
        }
        #lw-main-menu-modal .lw-modal-layout {
          flex-direction: column !important;
          height: auto !important;
          max-height: 84vh !important;
        }
        #lw-main-menu-modal .lw-modal-sidebar {
          width: 100% !important;
          border-right: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
          padding: 12px !important;
          box-sizing: border-box !important;
        }
        #lw-main-menu-modal .lw-modal-tabs {
          flex-direction: row !important;
          overflow-x: auto !important;
          gap: 6px !important;
        }
        #lw-main-menu-modal .lw-modal-tabs button {
          padding: 6px 10px !important;
          font-size: 11.5px !important;
          white-space: nowrap !important;
        }
        #lw-main-menu-modal #lw-menu-content {
          padding: 14px !important;
          max-height: 55vh !important;
          overflow-y: auto !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    this.hudContainer.innerHTML = `
      <!-- Top-Left Profile Card -->
      <div id="lw-profile-card">
        <div class="lw-avatar-icon" style="
          width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0284c7, #38bdf8);
          display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid #38bdf8;
          flex-shrink: 0;
        ">👤</div>
        <div style="min-width: 0; display: flex; flex-direction: column; gap: 3px;">
          <!-- Top Row: Name and Level -->
          <div style="display: flex; align-items: center; gap: 6px; line-height: 1;">
            <span class="lw-player-name" style="color: #fff; font-weight: 800; font-size: 14px;">Alex</span>
            <span class="lw-player-level" style="color: #38bdf8; font-size: 11px; font-weight: 700;">Level 1</span>
          </div>
          <!-- Bottom Row: Coin Pill and XP Bar -->
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 1px;">
            <span id="lw-coins-badge" style="background: rgba(250, 204, 21, 0.22); border: 1.5px solid #facc15; border-radius: 999px; padding: 2px 8px; color: #fde047; font-size: 11px; font-weight: 900; display: inline-flex; align-items: center; gap: 4px; line-height: 1; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              <span>🪙</span> <span id="lw-coins-count">${this.coinsCollected}</span>
            </span>
            <div class="lw-xp-bar-wrap" style="width: 55px; height: 5px; background: rgba(255,255,255,0.18); border-radius: 4px; overflow: hidden; flex-shrink: 0;">
              <div style="width: 45%; height: 100%; background: linear-gradient(90deg, #38bdf8, #00d2d3);"></div>
            </div>
            <span class="lw-xp-text" style="color: #94a3b8; font-size: 9px; font-weight: 600;">980 XP</span>
          </div>
        </div>
        <button id="lw-btn-menu" style="
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); color: #cbd5e1; width: 32px; height: 32px;
          border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px;
          flex-shrink: 0; margin-left: 2px;
        ">☰</button>
      </div>

      <!-- Top Center Web3 Token Launchpad Ticker -->
      <div id="lw-token-bar">
        <div class="lw-token-live-dot"></div>
        <div class="lw-token-tag">
          <span class="lw-token-name">🪙 $METAVERSE</span>
          <span class="lw-token-status">TOKEN LAUNCH LIVE</span>
        </div>
        <div class="lw-token-ca-box" id="lw-copy-ca-hud" title="Click to copy Contract Address">
          <span class="lw-ca-chip">CA</span>
          <span class="lw-ca-digits">75gG...pump</span>
          <span class="lw-ca-copy-icon">📋</span>
        </div>
        <a href="https://pump.fun/coin/75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump" target="_blank" rel="noopener" class="lw-btn-token-buy">
          🚀 Buy Token
        </a>
        <button id="lw-btn-open-airdrop" type="button" class="lw-btn-token-airdrop">
          🎁 Airdrop Tier
        </button>
      </div>

      <!-- Top-Right 3D Tactical Minimap Radar -->
      <div id="lw-minimap-card" style="pointer-events: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
        <div style="position: relative;">
          <div class="lw-minimap-circle" style="
            width: 124px; height: 124px; border-radius: 50%; background: rgba(8, 12, 22, 0.92);
            backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            border: 2.5px solid #00d2d3; box-shadow: 0 0 24px rgba(0, 210, 211, 0.4), inset 0 0 14px rgba(0, 210, 211, 0.15);
            position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
          " title="Click to open Fullscreen 3D Tactical Holo-Map (M)">
            <canvas id="lw-minimap-canvas" width="124" height="124" style="width: 100%; height: 100%; display: block;"></canvas>
          </div>

          <!-- Radar Quick Actions (Zoom In, Zoom Out, Expand 3D Map) -->
          <div style="position: absolute; left: -28px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 4px;">
            <button id="lw-mm-zoom-in" title="Zoom In" style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 23, 42, 0.85); border: 1px solid #00d2d3; color: #fff; font-weight: 900; font-size: 13px; line-height: 1; cursor: pointer; display: grid; place-items: center;">+</button>
            <button id="lw-mm-zoom-out" title="Zoom Out" style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 23, 42, 0.85); border: 1px solid #00d2d3; color: #fff; font-weight: 900; font-size: 13px; line-height: 1; cursor: pointer; display: grid; place-items: center;">−</button>
            <button id="lw-mm-expand" title="Fullscreen 3D Map (M)" style="width: 24px; height: 24px; border-radius: 50%; background: rgba(0, 210, 211, 0.2); border: 1px solid #00d2d3; color: #00d2d3; font-weight: 900; font-size: 11px; line-height: 1; cursor: pointer; display: grid; place-items: center;">⛶</button>
          </div>
        </div>

        <!-- Location Badge with Live Telemetry -->
        <div id="lw-loc-badge" style="
          background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(10px); border: 1px solid rgba(0, 210, 211, 0.4);
          padding: 4px 12px; border-radius: 999px; color: #f8fafc; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); cursor: pointer;
        ">
          <span style="color: #00d2d3; font-size: 8px;">🟢</span>
          <span id="lw-loc-badge-text">🏙️ Central Plaza</span>
        </div>
      </div>

      <!-- Bottom-Left Glassmorphism Chat (Mobile friendly, toggleable) -->
      <div id="lw-chat-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
            💬 Metaverse Chat
          </span>
          <button id="lw-chat-min-btn" style="background: none; border: none; color: #94a3b8; font-size: 12px; cursor: pointer; padding: 0 4px;">−</button>
        </div>
        <div id="lw-chat-messages" style="
          max-height: 95px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; font-size: 12px;
        ">
          <div><b style="color: #38bdf8;">NovaStar :</b> <span style="color: #e2e8f0;">Nice game!</span></div>
          <div><b style="color: #ec4899;">PixelQueen :</b> <span style="color: #e2e8f0;">Let's play again!</span></div>
          <div><b style="color: #facc15;">ShadowX :</b> <span style="color: #e2e8f0;">gg everyone 🔥</span></div>
        </div>
        <div class="lw-chat-input-row" style="display: flex; align-items: center; gap: 6px;">
          <input id="lw-chat-input" type="text" placeholder="Type a message..." style="
            flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
            border-radius: 12px; padding: 6px 12px; color: #fff; font-size: 12px; outline: none; font-family: inherit;
          " />
          <button id="lw-chat-send" style="
            background: #00d2d3; border: none; width: 28px; height: 28px; border-radius: 50%;
            color: #0f172a; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;
          ">➤</button>
        </div>
      </div>

      <!-- Central Proximity Prompt -->
      <div id="lw-interact-prompt" style="
        display: none; position: absolute; bottom: 120px; left: 50%; transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(14px); border: 2px solid #00d2d3;
        color: #fff; font-size: 16px; font-weight: 800; padding: 10px 24px; border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 210, 211, 0.4); text-align: center; pointer-events: auto; cursor: pointer;
      ">
        Press E to Interact
      </div>

      <!-- Game Menu / UI & Features Modal -->
      <div id="lw-main-menu-modal">
        <div class="lw-modal-layout" style="display: flex; height: 100%;">
          <!-- Left Sidebar Menu -->
          <div class="lw-modal-sidebar" style="
            width: 250px; background: rgba(30, 41, 59, 0.6); border-right: 1px solid rgba(255,255,255,0.1);
            padding: 20px; display: flex; flex-direction: column; justify-content: space-between;
          ">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 24px;">👤</div>
                <div>
                  <div style="font-weight: 800; font-size: 17px;">Alex</div>
                  <div style="color: #38bdf8; font-size: 12px;">Level 1</div>
                </div>
              </div>

              <div class="lw-modal-tabs" style="display: flex; flex-direction: column; gap: 8px;">
                <button id="lw-tab-token" style="display: flex; align-items: center; gap: 8px; background: rgba(250, 204, 21, 0.18); border: 1.5px solid #facc15; color: #fde047; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: inherit; font-weight: 800; box-shadow: 0 2px 10px rgba(250, 204, 21, 0.2);">🪙 Token & Airdrop</button>
                <button id="lw-tab-games" style="display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #94a3b8; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: inherit; font-weight: 700;">🕹️ Game Selection</button>
                <button id="lw-tab-map" style="display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #94a3b8; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: inherit; font-weight: 700;">🗺️ District Map</button>
                <button id="lw-tab-leaderboard" style="display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #94a3b8; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: inherit; font-weight: 700;">🏆 Leaderboard</button>
                <button id="lw-tab-profile" style="display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #94a3b8; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: inherit; font-weight: 700;">👤 Profile & Avatars</button>
                <button id="lw-tab-settings" style="display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: #94a3b8; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-family: inherit; font-weight: 700;">⚙️ Settings</button>
              </div>
            </div>

            <button id="lw-btn-close-menu" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 8px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: bold; margin-top: 12px;">✕ Close</button>
          </div>

          <!-- Right Content Area -->
          <div id="lw-menu-content" style="flex: 1; padding: 22px; overflow-y: auto;">
            <!-- Web3 Token Launchpad & Airdrop View -->
            <div id="lw-view-token">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <h2 style="margin: 0; color: #facc15; font-size: 22px; font-weight: 900; display: flex; align-items: center; gap: 8px;">
                    🪙 $METAVERSE Token Launchpad
                  </h2>
                  <div style="color: #94a3b8; font-size: 12.5px;">Official NEXORA Metaverse Currency (Solana SPL)</div>
                </div>
                <div style="background: rgba(34, 197, 94, 0.15); border: 1.5px solid #22c55e; border-radius: 999px; padding: 4px 12px; color: #4ade80; font-size: 11.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span> LIVE ON SOLANA
                </div>
              </div>

              <!-- Contract Address Card -->
              <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95)); border: 1.5px solid rgba(250, 204, 21, 0.4); border-radius: 16px; padding: 14px 18px; margin-bottom: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="font-size: 11px; font-weight: 800; color: #fde047; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Verified Contract Address (Solana SPL)</div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 12px; font-family: monospace; font-size: 12.5px; color: #e2e8f0; overflow-x: auto;">
                  <span id="lw-ca-full-text" style="word-break: break-all;">75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump</span>
                  <button id="lw-btn-copy-ca-modal" type="button" style="background: #facc15; border: none; border-radius: 6px; padding: 5px 12px; color: #0f172a; font-weight: 900; font-size: 11px; cursor: pointer; flex-shrink: 0; transition: transform 0.1s ease;">📋 Copy CA</button>
                </div>
              </div>

              <!-- Action Links (Pump.fun, DexScreener, Solscan, Share on X) -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px;">
                <a href="https://pump.fun/coin/75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump" target="_blank" rel="noopener" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 12px 10px; border-radius: 14px; text-decoration: none; text-align: center; font-weight: 900; font-size: 12.5px; display: flex; flex-direction: column; align-items: center; gap: 4px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                  <span style="font-size: 20px;">🚀</span>
                  <span>Buy on Pump.fun</span>
                </a>
                <a href="https://dexscreener.com/solana/75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump" target="_blank" rel="noopener" style="background: linear-gradient(135deg, #38bdf8, #0284c7); color: #fff; padding: 12px 10px; border-radius: 14px; text-decoration: none; text-align: center; font-weight: 900; font-size: 12.5px; display: flex; flex-direction: column; align-items: center; gap: 4px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);">
                  <span style="font-size: 20px;">📈</span>
                  <span>DexScreener Chart</span>
                </a>
                <a href="https://solscan.io/token/75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump" target="_blank" rel="noopener" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; padding: 12px 10px; border-radius: 14px; text-decoration: none; text-align: center; font-weight: 900; font-size: 12.5px; display: flex; flex-direction: column; align-items: center; gap: 4px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);">
                  <span style="font-size: 20px;">🔍</span>
                  <span>Solscan Explorer</span>
                </a>
                <a id="lw-btn-share-x" href="https://twitter.com/intent/tweet?text=Exploring%20the%20Metaverse%203D%20GameFi%20world%20and%20farming%20%24METAVERSE%20tokens!%20%F0%9F%AA%99%F0%9F%8E%AE%20Play%20mini-games%2C%20earn%20airdrop%20rewards%20and%20trade%20live%3A%20https%3A%2F%2Fpump.fun%2Fcoin%2F75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump%20%23Solana%20%23GameFi" target="_blank" rel="noopener" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 12px 10px; border-radius: 14px; text-decoration: none; text-align: center; font-weight: 900; font-size: 12.5px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                  <span style="font-size: 20px;">🐦</span>
                  <span>Share on X</span>
                </a>
              </div>

              <!-- Play-to-Earn Airdrop Tracker -->
              <div style="background: linear-gradient(135deg, rgba(250, 204, 21, 0.12), rgba(15, 23, 42, 0.95)); border: 2px solid #facc15; border-radius: 18px; padding: 16px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                  <span style="font-size: 15px; font-weight: 800; color: #fde047;">🎁 Your Play-to-Earn Airdrop Status</span>
                  <span style="background: #facc15; color: #0f172a; font-weight: 900; font-size: 11px; padding: 3px 9px; border-radius: 999px;">Tier 2 · Cyber Alpha</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; flex-wrap: wrap;">
                  <div>
                    <div style="font-size: 12px; color: #94a3b8;">Coins Farmed in Metaverse:</div>
                    <div style="font-size: 24px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 6px;">
                      <span>🪙</span> <span id="lw-airdrop-coins">${this.coinsCollected}</span>
                    </div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #94a3b8;">Airdrop Multiplier:</div>
                    <div style="font-size: 20px; font-weight: 900; color: #38bdf8;">1.5x Multiplier</div>
                  </div>
                  <button id="lw-btn-farm-now" style="background: linear-gradient(135deg, #00d2d3, #0284c7); border: none; border-radius: 10px; color: #0f172a; font-weight: 900; padding: 8px 16px; font-size: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,210,211,0.3);">
                    🎮 Farm Coins in Mini-Games
                  </button>
                </div>
                <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.4;">
                  💡 <b>How it works:</b> Every coin collected in <b>Coin Catcher</b> or <b>Hot Potato</b> directly increases your allocation in the upcoming $METAVERSE token airdrop pool. Play more, climb the leaderboard, and earn real tokens!
                </div>
              </div>

              <!-- Tokenomics Summary -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; text-align: center;">
                  <div style="font-size: 10.5px; color: #94a3b8;">Total Supply</div>
                  <div style="font-size: 14px; font-weight: 800; color: #fff;">1,000,000,000</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; text-align: center;">
                  <div style="font-size: 10.5px; color: #94a3b8;">Buy / Sell Tax</div>
                  <div style="font-size: 14px; font-weight: 800; color: #22c55e;">0% / 0%</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; text-align: center;">
                  <div style="font-size: 10.5px; color: #94a3b8;">Liquidity Pool</div>
                  <div style="font-size: 14px; font-weight: 800; color: #38bdf8;">100% Fair Launch</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; text-align: center;">
                  <div style="font-size: 10.5px; color: #94a3b8;">Security</div>
                  <div style="font-size: 14px; font-weight: 800; color: #facc15;">Mint Revoked</div>
                </div>
              </div>
            </div>

            <!-- Game Selection View (ONLY HOT POTATO & COIN CATCHER - ROOFTOP RUN REMOVED) -->
            <div id="lw-view-games" style="display: none;">
              <h2 style="margin: 0 0 16px 0; color: #38bdf8; font-size: 22px;">Select Game</h2>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <div id="lw-launch-hotpotato" style="display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.8)); border: 2px solid #ef4444; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <span style="font-size: 36px;">🥔</span>
                  <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 800; color: #f87171;">HOT POTATO (3D Stadium)</div>
                    <div style="font-size: 12px; color: #94a3b8;">Tag someone before it explodes!</div>
                  </div>
                  <span style="font-size: 20px; color: #ef4444;">▶</span>
                </div>

                <div id="lw-launch-coincatcher" style="display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(15, 23, 42, 0.8)); border: 2px solid #facc15; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <span style="font-size: 36px;">🪙</span>
                  <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 800; color: #fde047;">Coin Catcher</div>
                    <div style="font-size: 12px; color: #94a3b8;">Collect spawned items in the 76m × 56m Cyber Stadium</div>
                  </div>
                  <span style="font-size: 20px; color: #facc15;">▶</span>
                </div>

                <div id="lw-launch-cyberspeedway" style="display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(15, 23, 42, 0.8)); border: 2px solid #00ff88; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <span style="font-size: 36px;">🏁</span>
                  <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 800; color: #00ff88;">CYBER SPEEDWAY GP (New!)</div>
                    <div style="font-size: 12px; color: #94a3b8;">High-speed neon circuit with boost gates & lap records</div>
                  </div>
                  <span style="font-size: 20px; color: #00ff88;">▶</span>
                </div>
              </div>
            </div>

            <!-- Leaderboard View -->
            <div id="lw-view-leaderboard" style="display: none;">
              <h2 style="margin: 0 0 16px 0; color: #facc15; font-size: 22px;">🏆 Leaderboard</h2>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.06); border-radius: 10px; font-size: 13px; font-weight: 700;">
                  <span>🥇 1. NovaStar</span><span style="color: #facc15;">1250 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.06); border-radius: 10px; font-size: 13px; font-weight: 700;">
                  <span>🥈 2. PixelQueen</span><span style="color: #facc15;">1180 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.06); border-radius: 10px; font-size: 13px; font-weight: 700;">
                  <span>🥉 3. ShadowX</span><span style="color: #facc15;">1105 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 10px; font-size: 13px; font-weight: 700;">
                  <span>👤 4. Alex (You)</span><span style="color: #38bdf8;">980 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.06); border-radius: 10px; font-size: 13px; font-weight: 700;">
                  <span>5. GameMaster</span><span style="color: #facc15;">920 pts</span>
                </div>
              </div>
            </div>

            <!-- District Fast-Travel Map View -->
            <div id="lw-view-map" style="display: none;">
              <!-- 3D Holo-Map Hero Banner -->
              <div id="lw-btn-open-holo-map" style="
                background: radial-gradient(circle at 50% 0%, rgba(0, 210, 211, 0.35), rgba(15, 23, 42, 0.95));
                border: 2px solid #00d2d3; border-radius: 18px; padding: 16px 20px; margin-bottom: 16px;
                display: flex; justify-content: space-between; align-items: center; cursor: pointer;
                box-shadow: 0 0 25px rgba(0, 210, 211, 0.3); transition: transform 0.15s;
              ">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <span style="font-size: 38px;">🌐</span>
                  <div>
                    <div style="font-size: 17px; font-weight: 900; color: #fff;">LIVE 3D TACTICAL HOLO-MAP</div>
                    <div style="font-size: 12px; color: #94a3b8;">Full visual 3D aerial map with live character FOV, pan/zoom & waypoints</div>
                  </div>
                </div>
                <button style="background: #00d2d3; border: none; border-radius: 999px; padding: 8px 18px; color: #080c16; font-weight: 900; font-size: 13px; cursor: pointer;">
                  Launch 3D Map (M) ➔
                </button>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <h2 style="margin: 0; color: #38bdf8; font-size: 20px; font-weight: 900;">🗺️ Instant District Fast-Travel</h2>
                  <div style="color: #94a3b8; font-size: 12.5px;">Tap any district card to jump there instantly</div>
                </div>
                <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 999px; padding: 4px 12px; color: #38bdf8; font-size: 11.5px; font-weight: 700;">
                  🟢 142 Citizens Online
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <!-- Central Plaza Card -->
                <div class="lw-district-btn" data-dist="town" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95)); border: 2px solid #00d2d3; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-size: 28px;">🏙️</span>
                    <span style="background: rgba(0, 210, 211, 0.2); border: 1px solid #00d2d3; border-radius: 999px; padding: 2px 8px; color: #00d2d3; font-size: 10px; font-weight: 800;">Central Hub</span>
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px;">Central Plaza</div>
                  <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; line-height: 1.3;">Cyber Cafe, Social Fountain & Trading Terminals</div>
                  <button style="width: 100%; background: #00d2d3; border: none; border-radius: 8px; color: #0f172a; font-weight: 900; padding: 7px; cursor: pointer; font-size: 12.5px;">Fast Travel ➔</button>
                </div>

                <!-- Neon Arcade Card -->
                <div class="lw-district-btn" data-dist="arcade" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95)); border: 2px solid #facc15; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-size: 28px;">🕹️</span>
                    <span style="background: rgba(250, 204, 21, 0.2); border: 1px solid #facc15; border-radius: 999px; padding: 2px 8px; color: #fde047; font-size: 10px; font-weight: 800;">🔥 Hot Games</span>
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px;">Neon Arcade</div>
                  <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; line-height: 1.3;">🪙 Coin Catcher & 🥔 Hot Potato 3D Stadium</div>
                  <button style="width: 100%; background: linear-gradient(135deg, #facc15, #f59e0b); border: none; border-radius: 8px; color: #451a03; font-weight: 900; padding: 7px; cursor: pointer; font-size: 12.5px;">Fast Travel ➔</button>
                </div>

                <!-- Sakura Park Card -->
                <div class="lw-district-btn" data-dist="park" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95)); border: 2px solid #4ade80; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-size: 28px;">🌸</span>
                    <span style="background: rgba(74, 222, 128, 0.2); border: 1px solid #4ade80; border-radius: 999px; padding: 2px 8px; color: #4ade80; font-size: 10px; font-weight: 800;">🌿 Chill Zone</span>
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px;">Sakura Park</div>
                  <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; line-height: 1.3;">Cherry Blossom Trees, Reflecting Pond & Benches</div>
                  <button style="width: 100%; background: #4ade80; border: none; border-radius: 8px; color: #064e3b; font-weight: 900; padding: 7px; cursor: pointer; font-size: 12.5px;">Fast Travel ➔</button>
                </div>

                <!-- Harbor Docks Card -->
                <div class="lw-district-btn" data-dist="docks" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95)); border: 2px solid #38bdf8; border-radius: 16px; padding: 14px; cursor: pointer; transition: transform 0.15s ease;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-size: 28px;">⚓</span>
                    <span style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 999px; padding: 2px 8px; color: #38bdf8; font-size: 10px; font-weight: 800;">🌊 Waterfront</span>
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px;">Harbor Docks</div>
                  <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; line-height: 1.3;">Boardwalk, Ocean Pier & Dock Racing</div>
                  <button style="width: 100%; background: #38bdf8; border: none; border-radius: 8px; color: #082f49; font-weight: 900; padding: 7px; cursor: pointer; font-size: 12.5px;">Fast Travel ➔</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.hudContainer);

    // Setup Minimap Canvas with 3D Holographic Map Engine
    const canvas = this.hudContainer.querySelector('#lw-minimap-canvas');
    if (canvas) {
      this.minimapCtx = canvas.getContext('2d');
      map3DEngine.bindMinimapCanvas(canvas);
    }

    // Menu handlers
    const modal = this.hudContainer.querySelector('#lw-main-menu-modal');
    this.hudContainer.querySelector('#lw-btn-menu')?.addEventListener('click', () => {
      modal.style.display = 'block';
    });
    this.hudContainer.querySelector('#lw-btn-close-menu')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Listen for coin updates from minigames or collectibles
    window.addEventListener('coins-updated', (e) => {
      if (e.detail?.coins !== undefined) {
        this.coinsCollected = e.detail.coins;
        const countEl = document.querySelector('#lw-coins-count');
        if (countEl) countEl.textContent = String(this.coinsCollected);
        const airdropCountEl = document.querySelector('#lw-airdrop-coins');
        if (airdropCountEl) airdropCountEl.textContent = String(this.coinsCollected);
      }
    });

    // Tab switching
    const tabToken = this.hudContainer.querySelector('#lw-tab-token');
    const tabGames = this.hudContainer.querySelector('#lw-tab-games');
    const tabMap = this.hudContainer.querySelector('#lw-tab-map');
    const tabLdr = this.hudContainer.querySelector('#lw-tab-leaderboard');
    const viewToken = this.hudContainer.querySelector('#lw-view-token');
    const viewGames = this.hudContainer.querySelector('#lw-view-games');
    const viewMap = this.hudContainer.querySelector('#lw-view-map');
    const viewLdr = this.hudContainer.querySelector('#lw-view-leaderboard');

    const resetTabs = () => {
      [tabToken, tabGames, tabMap, tabLdr].forEach((t) => {
        if (t) { t.style.background = 'transparent'; t.style.borderColor = 'transparent'; t.style.color = '#94a3b8'; t.style.boxShadow = 'none'; }
      });
      [viewToken, viewGames, viewMap, viewLdr].forEach((v) => { if (v) v.style.display = 'none'; });
    };

    tabToken?.addEventListener('click', () => {
      resetTabs();
      tabToken.style.background = 'rgba(250, 204, 21, 0.18)';
      tabToken.style.borderColor = '#facc15';
      tabToken.style.color = '#fde047';
      tabToken.style.boxShadow = '0 2px 10px rgba(250, 204, 21, 0.2)';
      viewToken.style.display = 'block';
    });

    tabGames?.addEventListener('click', () => {
      resetTabs();
      tabGames.style.background = 'rgba(56, 189, 248, 0.2)';
      tabGames.style.borderColor = '#38bdf8';
      tabGames.style.color = '#fff';
      viewGames.style.display = 'block';
    });

    tabMap?.addEventListener('click', () => {
      resetTabs();
      tabMap.style.background = 'rgba(0, 210, 211, 0.2)';
      tabMap.style.borderColor = '#00d2d3';
      tabMap.style.color = '#fff';
      viewMap.style.display = 'block';
    });

    tabLdr?.addEventListener('click', () => {
      resetTabs();
      tabLdr.style.background = 'rgba(250, 204, 21, 0.2)';
      tabLdr.style.borderColor = '#facc15';
      tabLdr.style.color = '#fff';
      viewLdr.style.display = 'block';
    });

    // CA Copy Handlers
    const CA_ADDRESS = '75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump';
    const copyToClipboard = (btn, originalText) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(CA_ADDRESS).then(() => {
          btn.innerHTML = '✅ Copied!';
          setTimeout(() => { btn.innerHTML = originalText; }, 1800);
        }).catch(() => {
          btn.innerHTML = '✅ 75gG...pump';
          setTimeout(() => { btn.innerHTML = originalText; }, 1800);
        });
      }
    };

    const copyBtnHud = this.hudContainer.querySelector('#lw-copy-ca-hud');
    copyBtnHud?.addEventListener('click', (e) => {
      e.stopPropagation();
      const digits = copyBtnHud.querySelector('.lw-ca-digits');
      if (digits) {
        const orig = digits.textContent;
        navigator.clipboard?.writeText(CA_ADDRESS);
        digits.textContent = 'Copied!';
        setTimeout(() => { digits.textContent = orig; }, 1800);
      }
    });

    const copyBtnModal = this.hudContainer.querySelector('#lw-btn-copy-ca-modal');
    copyBtnModal?.addEventListener('click', () => {
      copyToClipboard(copyBtnModal, '📋 Copy CA');
    });

    // Token Hub HUD click opens Token Launch modal
    const tokenBar = this.hudContainer.querySelector('#lw-token-bar');
    tokenBar?.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('#lw-copy-ca-hud')) return;
      modal.style.display = 'block';
      tabToken?.click();
    });

    const btnOpenAirdrop = this.hudContainer.querySelector('#lw-btn-open-airdrop');
    btnOpenAirdrop?.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.style.display = 'block';
      tabToken?.click();
    });

    const btnFarmNow = this.hudContainer.querySelector('#lw-btn-farm-now');
    btnFarmNow?.addEventListener('click', () => {
      tabGames?.click();
    });

    // District Fast Travel Clicks
    this.hudContainer.querySelectorAll('.lw-district-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dist = btn.dataset.dist;
        modal.style.display = 'none';
        sound.playPortal();
        if (window.__jumpToDistrict) {
          window.__jumpToDistrict(dist);
        } else {
          if (dist === 'town') this.player.teleport(0, 0, 0);
          else if (dist === 'arcade') this.player.teleport(13.5, 0, -6.0);
          else if (dist === 'park') this.player.teleport(-18, 0, 10);
          else if (dist === 'docks') this.player.teleport(24, 0, 18);
        }
      });
    });

    // Minimap Radar Quick Action Buttons
    this.hudContainer.querySelector('#lw-mm-zoom-in')?.addEventListener('click', (e) => {
      e.stopPropagation();
      map3DEngine.zoom = Math.min(3.5, map3DEngine.zoom * 1.25);
    });
    this.hudContainer.querySelector('#lw-mm-zoom-out')?.addEventListener('click', (e) => {
      e.stopPropagation();
      map3DEngine.zoom = Math.max(0.4, map3DEngine.zoom * 0.8);
    });
    this.hudContainer.querySelector('#lw-mm-expand')?.addEventListener('click', (e) => {
      e.stopPropagation();
      map3DEngine.openModal();
    });

    // Clicking Minimap opens 3D Tactical Holo-Map directly
    this.hudContainer.querySelector('#lw-minimap-card')?.addEventListener('click', (e) => {
      if (e.target.closest('#lw-mm-zoom-in') || e.target.closest('#lw-mm-zoom-out') || e.target.closest('#lw-mm-expand')) return;
      map3DEngine.openModal();
    });

    // Hero 3D Holo-Map Banner in modal
    this.hudContainer.querySelector('#lw-btn-open-holo-map')?.addEventListener('click', () => {
      modal.style.display = 'none';
      map3DEngine.openModal();
    });

    const tabProfile = this.hudContainer.querySelector('#lw-tab-profile');
    tabProfile?.addEventListener('click', () => {
      modal.style.display = 'none';
      window.openHumanCustomizer?.();
    });

    // Profile card avatar click
    this.hudContainer.querySelector('#lw-profile-card')?.addEventListener('click', (e) => {
      if (e.target.id === 'lw-btn-menu') return;
      window.openHumanCustomizer?.();
    });

    // Game launchers from modal
    this.hudContainer.querySelector('#lw-launch-hotpotato')?.addEventListener('click', () => {
      modal.style.display = 'none';
      this.options.onOpenGame?.('hotpotato');
    });
    this.hudContainer.querySelector('#lw-launch-coincatcher')?.addEventListener('click', () => {
      modal.style.display = 'none';
      this.options.onOpenGame?.('coincatcher');
    });
    this.hudContainer.querySelector('#lw-launch-cyberspeedway')?.addEventListener('click', () => {
      modal.style.display = 'none';
      this.options.onOpenGame?.('cyberspeedway');
    });

    // Chat minimize toggle (especially for mobile devices)
    const chatCard = this.hudContainer.querySelector('#lw-chat-card');
    const chatMinBtn = this.hudContainer.querySelector('#lw-chat-min-btn');
    chatMinBtn?.addEventListener('click', () => {
      chatCard.classList.toggle('collapsed');
      chatMinBtn.textContent = chatCard.classList.contains('collapsed') ? '💬' : '−';
    });

    // Setup Chat Send handler
    const chatIn = this.hudContainer.querySelector('#lw-chat-input');
    const chatSend = this.hudContainer.querySelector('#lw-chat-send');
    const msgList = this.hudContainer.querySelector('#lw-chat-messages');

    const sendMsg = () => {
      const txt = chatIn.value.trim();
      if (!txt) return;
      chatIn.value = '';
      const line = document.createElement('div');
      line.innerHTML = `<b style="color: #38bdf8;">Alex :</b> <span style="color: #fff;">${txt}</span>`;
      msgList.appendChild(line);
      msgList.scrollTop = msgList.scrollHeight;
    };

    chatSend?.addEventListener('click', sendMsg);
    chatIn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMsg();
      e.stopPropagation();
    });

    // Prompt Click
    const promptEl = this.hudContainer.querySelector('#lw-interact-prompt');
    promptEl?.addEventListener('click', () => {
      if (this.activePromptCallback) this.activePromptCallback();
    });
  }

  refreshWorldPositions() {
    this.root.updateMatrixWorld(true);
    this.gamePortals.forEach((p) => {
      p.group.getWorldPosition(p.pos);
    });
    this.benches.forEach((b) => {
      b.group.getWorldPosition(b.pos);
      b.sitPos.copy(b.pos).add(new THREE.Vector3(0, 0.48, 0));
    });
  }

  setPrompt(text, callback) {
    this.activePrompt = text;
    this.activePromptCallback = callback;
    const promptEl = this.hudContainer.querySelector('#lw-interact-prompt');
    if (promptEl) {
      promptEl.textContent = text;
      promptEl.style.display = 'block';
    }
  }

  clearPrompt() {
    this.activePrompt = null;
    this.activePromptCallback = null;
    const promptEl = this.hudContainer.querySelector('#lw-interact-prompt');
    if (promptEl) promptEl.style.display = 'none';
  }

  drawMinimap(totalTime = performance.now() * 0.001) {
    if (!this.minimapCtx) return;
    if (this._lastMinimapDraw && (totalTime - this._lastMinimapDraw < 0.048)) return; // 20 FPS throttle to save mobile CPU/GPU
    this._lastMinimapDraw = totalTime;
    const ctx = this.minimapCtx;
    ctx.clearRect(0, 0, 110, 110);

    const cx = 55, cy = 55, scale = 1.35;

    // 1. Dark Futuristic Radar Background
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();

    // 2. Concentric Radar Grid Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    [16, 32, 48].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - 48); ctx.lineTo(cx, cy + 48);
    ctx.moveTo(cx - 48, cy); ctx.lineTo(cx + 48, cy);
    ctx.stroke();

    // 3. Sweeping Radar Line
    const sweepAngle = (totalTime * 1.8) % (Math.PI * 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 48, sweepAngle - 0.25, sweepAngle);
    ctx.closePath();
    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 48);
    sweepGrad.addColorStop(0, 'rgba(0, 210, 211, 0.45)');
    sweepGrad.addColorStop(1, 'rgba(0, 210, 211, 0.0)');
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // 4. North Indicator
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - 38);

    // 5. Landmark Icons & Blips
    // Center Fountain (cyan)
    ctx.fillStyle = '#00d2d3';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Hot Potato Arena (red blip)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx + 13 * scale, cy - 7 * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Coin Catcher Arena (gold blip)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cx + 10 * scale, cy + 9 * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Sakura Park (green blip)
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(cx - 15 * scale, cy + 6 * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Player Heading Arrow with Pulsing Aura
    const px = Math.min(98, Math.max(12, cx + this.player.x * scale));
    const pz = Math.min(98, Math.max(12, cy + this.player.z * scale));
    const heading = this.player.heading || 0;

    // Player Glow Aura
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.arc(px, pz, 7 + Math.sin(totalTime * 4) * 2, 0, Math.PI * 2);
    ctx.fill();

    // Player Arrow
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(heading);
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4, -4);
    ctx.lineTo(0, -1);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  update(totalTime, deltaTime) {
    this.updatables.forEach((fn) => fn(totalTime, deltaTime));

    // Dynamic 3D Live Map & Telemetry Engine (Updates visual map, compass, live FOV cone & tactical map)
    map3DEngine.player = this.player;
    map3DEngine.update(totalTime, deltaTime);

    // Update Live Location Badge in HUD
    const locBadge = this.hudContainer?.querySelector('#lw-loc-badge-text');
    if (locBadge) {
      if (this.player.y > 250) locBadge.textContent = '🏁 Cyber Speedway GP';
      else if (this.player.y > 180) locBadge.textContent = '🏃 Rooftop Run';
      else if (this.player.y > 140) locBadge.textContent = '🥔 Hot Potato Colosseum';
      else if (this.player.y > 80) locBadge.textContent = '🪙 Coin Catcher Stadium';
      else {
        const distArcade = Math.hypot(this.player.x - 16, this.player.z - (-18));
        if (distArcade < 18) locBadge.textContent = '🕹️ Neon Arcade';
        else if (this.player.z > 35) locBadge.textContent = '🌸 Sakura Zen Park';
        else if (Math.abs(this.player.x - 22) < 8) locBadge.textContent = '🚏 Transit Avenue';
        else locBadge.textContent = '🏙️ Central Plaza';
      }
    }

    // Check Portal / Door Triggers
    if (!this.isSitting) {
      let nearPortal = null;
      let minD = Infinity;

      this.gamePortals.forEach((p) => {
        const d = Math.hypot(this.player.x - p.pos.x, this.player.z - p.pos.z);
        if (d < 3.2 && d < minD) {
          minD = d;
          nearPortal = p;
        }
      });

      if (nearPortal) {
        this.setPrompt(`Press E to enter ${nearPortal.title}`, () => {
          this.options.onOpenGame?.(nearPortal.id);
        });
      } else if (!this.benches.some((b) => Math.hypot(this.player.x - b.pos.x, this.player.z - b.pos.z) < 1.9)) {
        this.clearPrompt();
      }
    }
  }
}
