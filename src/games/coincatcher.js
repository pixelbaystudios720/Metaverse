// ==========================================================================
// Mini-Game 1: Coin Catcher
// Timed item collection arena with Gold Coins (+10) and Cyber Diamonds (+50)
// Complete match lifecycle: Waiting -> Countdown -> Active -> Completed
// Full HUD overlay with timer, coins collected counter, score, and Return to Arcade
// In-world 3D portal doorway at arena edge to walk through to return to arcade
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

function createExitSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ef4444';
  ctx.strokeRect(3, 3, 506, 122);

  ctx.fillStyle = '#fde047';
  ctx.font = '900 34px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚪 RETURN TO ARCADE', 256, 64);

  return new THREE.CanvasTexture(canvas);
}

export class CoinCatcherGame {
  constructor(scene, playerController, onMatchEnd) {
    this.scene = scene;
    this.player = playerController;
    this.onMatchEnd = onMatchEnd;

    this.group = new THREE.Group();
    this.group.position.set(0, 100, 0); // Isolated elevated arena
    this.scene.add(this.group);
    this.group.visible = false;

    this.isActive = false;
    this.matchDuration = 45; // 45 seconds
    this.timeRemaining = 45;
    this.score = 0;
    this.gemsCollected = 0;
    this.coinsCollected = 0;

    // Spawning items
    this.items = [];
    this.boostPads = [];

    // Pre-allocate materials & geometries
    this.coinGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.14, 18);
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffbf1f,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x664400,
    });

    this.gemGeo = new THREE.OctahedronGeometry(0.75, 0);
    this.gemMat = new THREE.MeshStandardMaterial({
      color: 0x3ff0e0,
      metalness: 0.6,
      roughness: 0.1,
      emissive: 0x0a4440,
    });

    this.buildArena();
    this.buildUI();
  }

  buildArena() {
    // 1. Arena Floor (36m x 36m)
    const floorGeo = new THREE.BoxGeometry(36, 1, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x140b28,
      roughness: 0.6,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Grid Floor Overlay
    const grid = new THREE.GridHelper(36, 18, 0xff5fd2, 0x221345);
    grid.position.y = 0.02;
    this.group.add(grid);

    // Neon Perimeter Fencing
    const fenceMat = new THREE.MeshBasicMaterial({ color: 0xff5fd2 });
    const wallHeight = 1.2;

    const walls = [
      { x: 0, z: -18, w: 36, d: 0.4 },
      { x: 18, z: 0, w: 0.4, d: 36 },
      { x: -18, z: 0, w: 0.4, d: 36 },
      // Leave opening at z: 18 for exit doorway
      { x: -11, z: 18, w: 14, d: 0.4 },
      { x: 11, z: 18, w: 14, d: 0.4 },
    ];

    walls.forEach((w) => {
      const geo = new THREE.BoxGeometry(w.w, wallHeight, w.d);
      const wall = new THREE.Mesh(geo, fenceMat);
      wall.position.set(w.x, wallHeight / 2, w.z);
      this.group.add(wall);
    });

    // Speed Boost Pads
    const boostPositions = [
      [-10, -10],
      [10, -10],
      [-10, 10],
      [10, 10],
    ];

    boostPositions.forEach(([bx, bz]) => {
      const padGeo = new THREE.BoxGeometry(3.5, 0.08, 3.5);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x3ff0e0 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(bx, 0.05, bz);
      this.group.add(pad);
      this.boostPads.push({ x: bx, z: bz, radius: 2.2 });
    });

    // Arena Lighting
    const arenaLight = new THREE.PointLight(0xffbf1f, 2.5, 50, 1.2);
    arenaLight.position.set(0, 12, 0);
    this.group.add(arenaLight);

    // -------------------------------------------------------------
    // In-World 3D Exit Portal Doorway to Arcade (At South z = 16.8)
    // -------------------------------------------------------------
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 16.8);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x7f1d1d,
    });

    // Left & Right Pillars
    const postGeo = new THREE.BoxGeometry(0.8, 4.5, 0.8);
    const postL = new THREE.Mesh(postGeo, frameMat);
    postL.position.set(-2.4, 2.25, 0);
    portalGroup.add(postL);

    const postR = new THREE.Mesh(postGeo, frameMat);
    postR.position.set(2.4, 2.25, 0);
    portalGroup.add(postR);

    // Top Arch Beam
    const beamGeo = new THREE.BoxGeometry(5.6, 0.9, 0.9);
    const beam = new THREE.Mesh(beamGeo, frameMat);
    beam.position.set(0, 4.5, 0);
    portalGroup.add(beam);

    // Overhead Sign
    const signGeo = new THREE.PlaneGeometry(4.2, 1.05);
    const signMat = new THREE.MeshBasicMaterial({
      map: createExitSignTexture(),
      side: THREE.DoubleSide,
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 5.3, 0);
    portalGroup.add(signMesh);

    // Glowing Swirling Portal Energy Pane
    const paneGeo = new THREE.PlaneGeometry(4.0, 3.8);
    this.portalPaneMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    this.portalPane = new THREE.Mesh(paneGeo, this.portalPaneMat);
    this.portalPane.position.set(0, 2.0, 0);
    portalGroup.add(this.portalPane);

    // Portal Trigger Floor Pad
    const padGeo = new THREE.BoxGeometry(4.4, 0.06, 2.4);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const triggerPad = new THREE.Mesh(padGeo, padMat);
    triggerPad.position.set(0, 0.04, 0);
    portalGroup.add(triggerPad);

    const portalLight = new THREE.PointLight(0xef4444, 2.0, 10);
    portalLight.position.set(0, 2.5, 0);
    portalGroup.add(portalLight);

    this.group.add(portalGroup);
  }

  buildUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'cc-hud';
    this.uiContainer.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 92;
      font-family: 'Fredoka', system-ui, sans-serif; display: none;
    `;

    this.uiContainer.innerHTML = `
      <style>
        #cc-hud-bar {
          position: absolute; top: 16px; left: 16px; right: 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; pointer-events: auto;
        }
        @media (max-width: 820px) {
          #cc-hud-bar {
            top: 8px; left: 8px; right: 8px;
            flex-wrap: wrap; justify-content: center; gap: 6px;
          }
          .cc-stat-pill { padding: 4px 10px !important; font-size: 13px !important; }
          #cc-exit-btn { padding: 6px 14px !important; font-size: 12px !important; }
        }
      </style>

      <div id="cc-hud-bar">
        <!-- Left Title Pill -->
        <div class="cc-stat-pill" style="background: rgba(15, 23, 42, 0.9); border: 2px solid #ffd166; border-radius: 999px; padding: 6px 16px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 18px rgba(0,0,0,0.5);">
          <span style="font-size: 20px;">🪙</span>
          <div>
            <div style="color: #ffd166; font-size: 15px; font-weight: 800; line-height: 1.1;">Coin Catcher</div>
            <div style="color: #94a3b8; font-size: 10.5px; font-weight: 600;">Collect coins & gems!</div>
          </div>
        </div>

        <!-- Center Timer Pill -->
        <div class="cc-stat-pill" style="background: rgba(15, 23, 42, 0.9); border: 2px solid #38bdf8; border-radius: 999px; padding: 6px 20px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 18px rgba(56, 189, 248, 0.35);">
          <span style="font-size: 18px;">⏱️</span>
          <span id="cc-timer-text" style="color: #fff; font-size: 22px; font-weight: 900; min-width: 60px; text-align: center;">00:45</span>
        </div>

        <!-- Right Stats & Return to Arcade Button -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- Coins Counter -->
          <div class="cc-stat-pill" style="background: rgba(15, 23, 42, 0.9); border: 2px solid #facc15; border-radius: 999px; padding: 6px 14px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 16px rgba(250, 204, 21, 0.3);">
            <span style="font-size: 18px;">🪙</span>
            <span id="cc-coins-text" style="color: #fde047; font-size: 17px; font-weight: 900;">0</span>
            <span style="color: #fde047; font-size: 12px; font-weight: 700;">Coins</span>
          </div>

          <!-- Gems Counter -->
          <div class="cc-stat-pill" style="background: rgba(15, 23, 42, 0.9); border: 2px solid #38bdf8; border-radius: 999px; padding: 6px 14px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);">
            <span style="font-size: 18px;">💎</span>
            <span id="cc-gems-text" style="color: #38bdf8; font-size: 17px; font-weight: 900;">0</span>
            <span style="color: #38bdf8; font-size: 12px; font-weight: 700;">Gems</span>
          </div>

          <!-- Score Counter -->
          <div class="cc-stat-pill" style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(255,255,255,0.25); border-radius: 999px; padding: 6px 14px; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">⭐</span>
            <span id="cc-score-text" style="color: #fff; font-size: 17px; font-weight: 900;">0</span>
            <span style="color: #94a3b8; font-size: 11px; font-weight: 700;">Pts</span>
          </div>

          <!-- Return to Arcade Button -->
          <button id="cc-exit-btn" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: 2px solid #fff; border-radius: 999px; padding: 8px 18px; color: #fff; font-size: 13.5px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.55); pointer-events: auto; transition: transform 0.15s ease;">
            <span>🚪</span> Return to Arcade
          </button>
        </div>
      </div>

      <!-- In-world Doorway Proximity Prompt -->
      <div id="cc-exit-prompt" style="position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.94); border: 2px solid #ef4444; border-radius: 999px; padding: 10px 24px; color: #fff; font-size: 14.5px; font-weight: 800; display: none; align-items: center; gap: 8px; box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5); pointer-events: none;">
        <span>🚪</span> <span>Walk through glowing doorway or click button to return to arcade</span>
      </div>
    `;

    document.body.appendChild(this.uiContainer);

    this.uiContainer.querySelector('#cc-exit-btn').addEventListener('click', () => {
      sound.playClick();
      this.abortMatch();
    });
  }

  showPopupText(text, color = '#fde047') {
    const pop = document.createElement('div');
    pop.style.cssText = `
      position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
      color: ${color}; font-size: 26px; font-weight: 900; text-shadow: 0 4px 14px rgba(0,0,0,0.85);
      pointer-events: none; z-index: 100; font-family: 'Fredoka', system-ui, sans-serif;
      animation: ccPopAnim 1.0s forwards ease-out;
    `;
    pop.textContent = text;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1000);
  }

  updateHUD() {
    if (!this.uiContainer) return;
    const coinsEl = this.uiContainer.querySelector('#cc-coins-text');
    const gemsEl = this.uiContainer.querySelector('#cc-gems-text');
    const scoreEl = this.uiContainer.querySelector('#cc-score-text');
    if (coinsEl) coinsEl.textContent = String(this.coinsCollected);
    if (gemsEl) gemsEl.textContent = String(this.gemsCollected);
    if (scoreEl) scoreEl.textContent = String(this.score);
  }

  startMatch() {
    this.isActive = true;
    this.timeRemaining = this.matchDuration;
    this.score = 0;
    this.gemsCollected = 0;
    this.coinsCollected = 0;
    this.group.visible = true;

    if (this.uiContainer) {
      this.uiContainer.style.display = 'block';
      this.updateHUD();
      const timerEl = this.uiContainer.querySelector('#cc-timer-text');
      if (timerEl) timerEl.textContent = `00:${this.matchDuration.toString().padStart(2, '0')}`;
    }

    // Teleport player into arena
    this.savedPlayerPos = this.player.position.clone();
    this.player.teleport(0, 100, 0);

    // Clean previous items
    this.clearItems();

    // Spawn initial items: 16 coins, 5 gems
    for (let i = 0; i < 16; i++) {
      this.spawnItem('coin');
    }
    for (let i = 0; i < 5; i++) {
      this.spawnItem('gem');
    }

    sound.playPortal();
  }

  clearItems() {
    for (const item of this.items) {
      this.group.remove(item.mesh);
    }
    this.items = [];
  }

  spawnItem(type = 'coin') {
    const isGem = type === 'gem';
    const mesh = new THREE.Mesh(
      isGem ? this.gemGeo : this.coinGeo,
      isGem ? this.gemMat : this.coinMat
    );

    // Random position within arena bounds
    const rx = (Math.random() - 0.5) * 28;
    const rz = (Math.random() - 0.5) * 28;
    mesh.position.set(rx, 1.2, rz);
    mesh.castShadow = true;

    if (!isGem) {
      mesh.rotation.z = Math.PI / 2;
    }

    this.group.add(mesh);
    this.items.push({
      mesh,
      type,
      points: isGem ? 50 : 10,
      radius: isGem ? 2.6 : 2.3, // Generous pickup radius for smooth player collision
      initialY: 1.2,
      spinSpeed: isGem ? 2.4 : 3.2,
      floatOffset: Math.random() * Math.PI * 2,
    });
  }

  update(deltaTime, totalTime) {
    if (!this.isActive) return;

    // 1. Update Match Timer
    this.timeRemaining -= deltaTime;
    const secs = Math.max(0, Math.ceil(this.timeRemaining));
    if (this.uiContainer) {
      const timerEl = this.uiContainer.querySelector('#cc-timer-text');
      if (timerEl) timerEl.textContent = `00:${secs.toString().padStart(2, '0')}`;
    }

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.completeMatch();
      return;
    }

    // Animate exit portal pulsing
    if (this.portalPaneMat) {
      this.portalPaneMat.opacity = 0.45 + Math.sin(totalTime * 4) * 0.25;
    }

    // 2. Animate and Check Pickups
    const playerPos = this.player.position;
    const arenaPlayerPos = new THREE.Vector3(
      playerPos.x,
      playerPos.y - 100, // convert to local arena space
      playerPos.z
    );

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      // Item Animation (floating and rotating)
      item.mesh.rotation.y += deltaTime * item.spinSpeed;
      item.mesh.position.y = item.initialY + Math.sin(totalTime * 3 + item.floatOffset) * 0.15;

      // Distance check to player
      const dist = Math.hypot(
        arenaPlayerPos.x - item.mesh.position.x,
        arenaPlayerPos.z - item.mesh.position.z
      );

      if (dist <= item.radius) {
        // Collect Item!
        this.score += item.points;
        const addCoins = item.type === 'gem' ? 50 : 10;
        if (item.type === 'gem') {
          this.gemsCollected++;
          sound.playGem();
          this.showPopupText(`+${item.points} Diamond Gem!`, '#38bdf8');
        } else {
          this.coinsCollected++;
          sound.playCoin();
          this.showPopupText(`+${item.points} Coins!`, '#fde047');
        }

        // Add to persistent wallet and notify living world
        try {
          const cur = parseInt(localStorage.getItem('aa_collected_coins') || '140', 10);
          const next = cur + addCoins;
          localStorage.setItem('aa_collected_coins', String(next));
          window.dispatchEvent(new CustomEvent('coins-updated', { detail: { coins: next } }));
        } catch (e) {}

        this.updateHUD();

        // Remove from arena and respawn replacement
        this.group.remove(item.mesh);
        this.items.splice(i, 1);
        this.spawnItem(item.type);
      }
    }

    // 3. Exit Doorway / Portal Detection (Doorway is at z = 16.8)
    const exitDist = Math.hypot(arenaPlayerPos.x, arenaPlayerPos.z - 16.8);
    const promptEl = this.uiContainer?.querySelector('#cc-exit-prompt');

    if (exitDist < 2.5) {
      // Walked right into the portal doorway -> return to arcade!
      sound.playPortal();
      this.abortMatch();
      return;
    } else if (exitDist < 6.5) {
      if (promptEl) promptEl.style.display = 'flex';
    } else {
      if (promptEl) promptEl.style.display = 'none';
    }

    // 4. Speed Boost Pad Check
    for (const pad of this.boostPads) {
      const dist = Math.hypot(arenaPlayerPos.x - pad.x, arenaPlayerPos.z - pad.z);
      if (dist < pad.radius) {
        this.player.velocity.x *= 1.08;
        this.player.velocity.z *= 1.08;
      }
    }

    // 5. Boundary Enforcement
    if (Math.abs(playerPos.x) > 17.5) playerPos.x = Math.sign(playerPos.x) * 17.5;
    if (Math.abs(playerPos.z) > 17.5) playerPos.z = Math.sign(playerPos.z) * 17.5;
  }

  completeMatch() {
    this.isActive = false;
    this.group.visible = false;
    if (this.uiContainer) this.uiContainer.style.display = 'none';
    this.clearItems();

    // Teleport player back to plaza/arcade
    if (this.savedPlayerPos) {
      this.player.teleport(this.savedPlayerPos.x, this.savedPlayerPos.y, this.savedPlayerPos.z);
    } else {
      this.player.teleport(-28, 0, -10);
    }

    sound.playVictory();

    // Calculate simulated match result standings
    const results = {
      gameId: 'coin-catcher',
      gameName: 'Coin Catcher',
      score: this.score,
      gems: this.gemsCollected,
      coins: this.coinsCollected,
      duration: `${this.matchDuration}s`,
      participants: [
        { name: this.player.avatar?.name || 'You', score: this.score, isPlayer: true },
        { name: 'NeonPulse', score: Math.round(this.score * (0.75 + Math.random() * 0.35)) },
        { name: 'CyberSamurai', score: Math.round(this.score * (0.6 + Math.random() * 0.4)) },
        { name: 'BitRunner', score: Math.round(this.score * (0.5 + Math.random() * 0.3)) },
      ].sort((a, b) => b.score - a.score),
    };

    results.rank = results.participants.findIndex((p) => p.isPlayer) + 1;

    if (this.onMatchEnd) {
      this.onMatchEnd(results);
    }
  }

  abortMatch() {
    this.isActive = false;
    this.group.visible = false;
    if (this.uiContainer) this.uiContainer.style.display = 'none';
    this.clearItems();
    if (this.savedPlayerPos) {
      this.player.teleport(this.savedPlayerPos.x, this.savedPlayerPos.y, this.savedPlayerPos.z);
    } else {
      this.player.teleport(-28, 0, -10);
    }
  }
}
