// ==========================================================================
// Mini-Game: Cyber Speedway (Neon Drift Grand Prix)
// High-octane elevated sci-fi race track with banked turns, neon curb strips,
// acceleration boost chevrons, lap checkpoint gates, and record leaderboard
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

export class CyberSpeedwayGame {
  constructor(scene, playerController, onMatchEnd) {
    this.scene = scene;
    this.player = playerController;
    this.onMatchEnd = onMatchEnd;

    this.group = new THREE.Group();
    this.group.position.set(0, 280, 0); // High-altitude skyline circuit
    this.scene.add(this.group);
    this.group.visible = false;

    this.isActive = false;
    this.currentLap = 1;
    this.totalLaps = 3;
    this.lapTime = 0;
    this.bestLap = parseFloat(localStorage.getItem('aa_best_lap') || '0');
    this.checkpointsPassed = new Set();
    this.speedBoostTimer = 0;

    // Track Checkpoints along the circuit
    this.trackCheckpoints = [
      { id: 0, x: 0, z: -35, radius: 8 },
      { id: 1, x: 42, z: -25, radius: 8 },
      { id: 2, x: 55, z: 20, radius: 8 },
      { id: 3, x: 18, z: 48, radius: 8 },
      { id: 4, x: -35, z: 42, radius: 8 },
      { id: 5, x: -50, z: -10, radius: 8 },
    ];

    this.boostGates = [];
    this.buildCircuit();
    this.buildUI();
  }

  buildCircuit() {
    // 1. Grand Elevated Floating Platform
    const trackWidth = 14;
    const trackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -35),
      new THREE.Vector3(32, 0, -38),
      new THREE.Vector3(55, 0, -10),
      new THREE.Vector3(58, 0, 22),
      new THREE.Vector3(35, 0, 48),
      new THREE.Vector3(0, 0, 45),
      new THREE.Vector3(-38, 0, 42),
      new THREE.Vector3(-55, 0, 15),
      new THREE.Vector3(-45, 0, -22),
      new THREE.Vector3(-18, 0, -35),
    ], true);

    const trackGeo = new THREE.TubeGeometry(trackCurve, 80, trackWidth / 2, 8, true);
    // Flatten into ribbon track
    const pos = trackGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) * 0.08); // Flatten height to make smooth asphalt surface
    }
    trackGeo.computeVertexNormals();

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.5,
      metalness: 0.35,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.receiveShadow = true;
    this.group.add(trackMesh);

    // Glowing Neon Curbs (Inner Cyan, Outer Magenta)
    const innerCurve = new THREE.CatmullRomCurve3(
      trackCurve.getPoints(60).map((p) => p.clone().multiplyScalar(0.82)),
      true
    );
    const innerNeon = new THREE.Mesh(
      new THREE.TubeGeometry(innerCurve, 60, 0.28, 6, true),
      new THREE.MeshBasicMaterial({ color: 0x00d2d3 })
    );
    this.group.add(innerNeon);

    const outerCurve = new THREE.CatmullRomCurve3(
      trackCurve.getPoints(60).map((p) => p.clone().multiplyScalar(1.18)),
      true
    );
    const outerNeon = new THREE.Mesh(
      new THREE.TubeGeometry(outerCurve, 60, 0.28, 6, true),
      new THREE.MeshBasicMaterial({ color: 0xff007f })
    );
    this.group.add(outerNeon);

    // 2. Start / Finish Gantry Arch (At z = -35)
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, -35);

    const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.5, 1.2), archMat);
    postL.position.set(-8, 3.75, 0);
    gantryGroup.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.5, 1.2), archMat);
    postR.position.set(8, 3.75, 0);
    gantryGroup.add(postR);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(17.2, 1.4, 1.4), archMat);
    beam.position.set(0, 7.2, 0);
    gantryGroup.add(beam);

    // Overhead Digital Banner: "CYBER SPEEDWAY GRAND PRIX"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#090d16';
    sctx.fillRect(0, 0, 1024, 256);
    sctx.strokeStyle = '#00d2d3';
    sctx.lineWidth = 8;
    sctx.strokeRect(6, 6, 1012, 244);
    sctx.fillStyle = '#facc15';
    sctx.font = '900 54px "Fredoka", sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('🏁 CYBER SPEEDWAY GP 🏁', 512, 105);
    sctx.fillStyle = '#38bdf8';
    sctx.font = '700 38px "Fredoka", sans-serif';
    sctx.fillText('HIT ACCELERATION BOOST GATES  ·  BEAT RECORD', 512, 190);

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 3.75),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signMesh.position.set(0, 7.2, 0.75);
    gantryGroup.add(signMesh);

    // Checkerboard Starting Line on Asphalt
    const checkGeo = new THREE.PlaneGeometry(14, 2.2);
    const checkCanvas = document.createElement('canvas');
    checkCanvas.width = 512;
    checkCanvas.height = 128;
    const cctx = checkCanvas.getContext('2d');
    const cols = 16, rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
        cctx.fillRect(c * (512 / cols), r * (128 / rows), 512 / cols, 128 / rows);
      }
    }
    const checkMesh = new THREE.Mesh(
      checkGeo,
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(checkCanvas) })
    );
    checkMesh.rotation.x = -Math.PI / 2;
    checkMesh.position.set(0, 0.05, 0);
    gantryGroup.add(checkMesh);

    this.group.add(gantryGroup);

    // 3. Acceleration Boost Chevron Pads (6 locations on circuit)
    const boostLocs = [
      { x: 25, z: -38, rot: 0.2 },
      { x: 56, z: 5, rot: 1.6 },
      { x: 20, z: 47, rot: 3.1 },
      { x: -28, z: 44, rot: 3.3 },
      { x: -52, z: -5, rot: -1.3 },
      { x: -10, z: -35, rot: 0 },
    ];

    boostLocs.forEach((b, idx) => {
      const padGeo = new THREE.BoxGeometry(6.5, 0.08, 4.0);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(b.x, 0.06, b.z);
      pad.rotation.y = b.rot;
      this.group.add(pad);

      // Light beam arch above boost gate
      const beamArch = new THREE.Mesh(
        new THREE.TorusGeometry(3.6, 0.14, 8, 24, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      beamArch.position.set(b.x, 0, b.z);
      beamArch.rotation.y = b.rot;
      this.group.add(beamArch);

      this.boostGates.push({ x: b.x, z: b.z, radius: 3.8 });
    });

    // 4. Return Portal Archway (At z = -26, inside the paddock)
    const returnPortal = new THREE.Group();
    returnPortal.position.set(0, 0, -22);
    const pPostMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 });
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), pPostMat);
    pL.position.set(-2.5, 2.25, 0);
    returnPortal.add(pL);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), pPostMat);
    pR.position.set(2.5, 2.25, 0);
    returnPortal.add(pR);
    const pBeam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.8, 0.8), pPostMat);
    pBeam.position.set(0, 4.5, 0);
    returnPortal.add(pBeam);

    const exitSignCanvas = document.createElement('canvas');
    exitSignCanvas.width = 512;
    exitSignCanvas.height = 128;
    const ectx = exitSignCanvas.getContext('2d');
    ectx.fillStyle = '#0f172a';
    ectx.fillRect(0, 0, 512, 128);
    ectx.strokeStyle = '#ef4444';
    ectx.lineWidth = 6;
    ectx.strokeRect(3, 3, 506, 122);
    ectx.fillStyle = '#fde047';
    ectx.font = '900 32px "Fredoka", sans-serif';
    ectx.textAlign = 'center';
    ectx.textBaseline = 'middle';
    ectx.fillText('🚪 RETURN TO ARCADE', 256, 64);

    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.05),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(exitSignCanvas) })
    );
    exitSign.position.set(0, 5.2, 0);
    returnPortal.add(exitSign);

    const exitPane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 3.8),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    exitPane.position.set(0, 2.0, 0);
    returnPortal.add(exitPane);

    this.group.add(returnPortal);

    // Stadium Lighting
    const ambience = new THREE.PointLight(0x00d2d3, 3.5, 120, 1.2);
    ambience.position.set(0, 25, 0);
    this.group.add(ambience);
  }

  buildUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'cs-hud';
    this.uiContainer.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 92;
      font-family: 'Fredoka', system-ui, sans-serif; display: none;
    `;

    this.uiContainer.innerHTML = `
      <div id="cs-hud-bar" style="position: absolute; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div style="background: rgba(15, 23, 42, 0.88); border: 2px solid #00d2d3; border-radius: 999px; padding: 10px 22px; color: #fff; display: flex; gap: 18px; align-items: center; box-shadow: 0 0 20px rgba(0, 210, 211, 0.4);">
          <div style="font-weight: 900; font-size: 17px; color: #facc15;">🏁 CYBER SPEEDWAY</div>
          <div style="font-size: 15px; color: #94a3b8;">LAP: <b id="cs-lap" style="color: #00d2d3;">1/3</b></div>
          <div style="font-size: 15px; color: #94a3b8;">TIME: <b id="cs-timer" style="color: #fff;">00:00.0</b></div>
          <div style="font-size: 15px; color: #94a3b8;">BEST: <b id="cs-best" style="color: #fde047;">${this.bestLap ? this.bestLap.toFixed(1) + 's' : '--'}</b></div>
        </div>
        <button id="cs-btn-exit" style="pointer-events: auto; background: #ef4444; border: 2px solid #fff; border-radius: 999px; padding: 10px 20px; color: #fff; font-weight: 800; cursor: pointer; font-size: 14px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
          🚪 Exit Track
        </button>
      </div>

      <div id="cs-boost-flash" style="position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0, 255, 136, 0.9); color: #064e3b; padding: 8px 24px; border-radius: 999px; font-weight: 900; font-size: 18px; display: none; box-shadow: 0 0 25px #00ff88;">
        ⚡ HYPER SPEED BOOST ACTIVE! ⚡
      </div>
    `;

    document.body.appendChild(this.uiContainer);

    this.uiContainer.querySelector('#cs-btn-exit')?.addEventListener('click', () => {
      this.stop();
    });
  }

  start() {
    this.isActive = true;
    this.group.visible = true;
    this.currentLap = 1;
    this.lapTime = 0;
    this.checkpointsPassed.clear();
    this.speedBoostTimer = 0;
    this.uiContainer.style.display = 'block';

    // Spawn player at start line
    this.player.teleport(0, 280, -35);
    this.player.heading = 0;
    sound.playGameStart();
    window.dispatchEvent(new CustomEvent('gamemode-changed', { detail: { mode: 'cyberspeedway' } }));
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    this.group.visible = false;
    this.uiContainer.style.display = 'none';

    // Teleport player back to Arcade entrance
    this.player.teleport(16.0, 0, -14.0);
    sound.playPortal();
    window.dispatchEvent(new CustomEvent('gamemode-changed', { detail: { mode: 'city' } }));
    if (this.onMatchEnd) this.onMatchEnd({ bestLap: this.bestLap });
  }

  update(dt, t) {
    if (!this.isActive) return;
    this.lapTime += dt;

    // Timer UI
    const timerEl = this.uiContainer.querySelector('#cs-timer');
    if (timerEl) {
      const mins = Math.floor(this.lapTime / 60);
      const secs = (this.lapTime % 60).toFixed(1);
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
    }

    const px = this.player.x;
    const pz = this.player.z;

    // Check Boost Gates
    for (const b of this.boostGates) {
      if (Math.hypot(px - b.x, pz - b.z) < b.radius) {
        this.speedBoostTimer = 2.2;
        sound.playCoin();
        const flash = this.uiContainer.querySelector('#cs-boost-flash');
        if (flash) flash.style.display = 'block';
      }
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      // Boost player speed
      this.player.vx *= 1.15;
      this.player.vz *= 1.15;
      if (this.speedBoostTimer <= 0) {
        const flash = this.uiContainer.querySelector('#cs-boost-flash');
        if (flash) flash.style.display = 'none';
      }
    }

    // Check Checkpoints along track
    for (const cp of this.trackCheckpoints) {
      if (Math.hypot(px - cp.x, pz - cp.z) < cp.radius) {
        this.checkpointsPassed.add(cp.id);
      }
    }

    // Check Finish Line (cp 0) when all checkpoints passed
    if (this.checkpointsPassed.size >= this.trackCheckpoints.length - 1 && Math.hypot(px - 0, pz - (-35)) < 6.0) {
      // Completed Lap!
      sound.playSuccess();
      if (!this.bestLap || this.lapTime < this.bestLap) {
        this.bestLap = this.lapTime;
        localStorage.setItem('aa_best_lap', this.bestLap.toString());
        const bestEl = this.uiContainer.querySelector('#cs-best');
        if (bestEl) bestEl.textContent = this.bestLap.toFixed(1) + 's';
      }

      this.currentLap++;
      this.checkpointsPassed.clear();
      this.lapTime = 0;

      if (this.currentLap > this.totalLaps) {
        // Grand Prix Completed!
        this.stop();
        return;
      }

      const lapEl = this.uiContainer.querySelector('#cs-lap');
      if (lapEl) lapEl.textContent = `${this.currentLap}/${this.totalLaps}`;
    }

    // Return Portal Check (z = -22)
    if (Math.hypot(px - 0, pz - (-22)) < 3.0) {
      this.stop();
    }
  }
}
