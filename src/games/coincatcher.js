// ==========================================================================
// Mini-Game 1: Coin Catcher
// Timed item collection arena with Gold Coins (+10) and Cyber Diamonds (+50)
// Complete match lifecycle: Waiting -> Countdown -> Active -> Completed
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

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
    this.coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16);
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffbf1f,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x664400,
    });

    this.gemGeo = new THREE.OctahedronGeometry(0.65, 0);
    this.gemMat = new THREE.MeshStandardMaterial({
      color: 0x3ff0e0,
      metalness: 0.6,
      roughness: 0.1,
      emissive: 0x0a4440,
    });

    this.buildArena();
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
      { x: 0, z: 18, w: 36, d: 0.4 },
      { x: 0, z: -18, w: 36, d: 0.4 },
      { x: 18, z: 0, w: 0.4, d: 36 },
      { x: -18, z: 0, w: 0.4, d: 36 },
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
  }

  startMatch() {
    this.isActive = true;
    this.timeRemaining = this.matchDuration;
    this.score = 0;
    this.gemsCollected = 0;
    this.coinsCollected = 0;
    this.group.visible = true;

    // Teleport player into arena
    this.savedPlayerPos = this.player.position.clone();
    this.player.teleport(0, 100, 0);

    // Clean previous items
    this.clearItems();

    // Spawn initial items: 14 coins, 4 gems
    for (let i = 0; i < 14; i++) {
      this.spawnItem('coin');
    }
    for (let i = 0; i < 4; i++) {
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
      radius: isGem ? 1.4 : 1.2,
      initialY: 1.2,
      spinSpeed: isGem ? 2.2 : 3.0,
      floatOffset: Math.random() * Math.PI * 2,
    });
  }

  update(deltaTime, totalTime) {
    if (!this.isActive) return;

    // 1. Update Match Timer
    this.timeRemaining -= deltaTime;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.completeMatch();
      return;
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
        if (item.type === 'gem') {
          this.gemsCollected++;
          sound.playGem();
        } else {
          this.coinsCollected++;
          sound.playCoin();
        }

        // Remove from arena and respawn replacement
        this.group.remove(item.mesh);
        this.items.splice(i, 1);
        this.spawnItem(item.type);
      }
    }

    // 3. Speed Boost Pad Check
    for (const pad of this.boostPads) {
      const dist = Math.hypot(arenaPlayerPos.x - pad.x, arenaPlayerPos.z - pad.z);
      if (dist < pad.radius) {
        this.player.velocity.x *= 1.08;
        this.player.velocity.z *= 1.08;
      }
    }

    // 4. Boundary Enforcement
    if (Math.abs(playerPos.x) > 17) playerPos.x = Math.sign(playerPos.x) * 17;
    if (Math.abs(playerPos.z) > 17) playerPos.z = Math.sign(playerPos.z) * 17;
  }

  completeMatch() {
    this.isActive = false;
    this.group.visible = false;
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
      // Simulated opponent scores
      participants: [
        { name: this.player.avatar.name, score: this.score, isPlayer: true },
        { name: 'NeonPulse', score: Math.round(this.score * (0.75 + Math.random() * 0.35)) },
        { name: 'CyberSamurai', score: Math.round(this.score * (0.6 + Math.random() * 0.4)) },
        { name: 'BitRunner', score: Math.round(this.score * (0.5 + Math.random() * 0.3)) },
      ].sort((a, b) => b.score - a.score),
    };

    // Calculate user rank
    results.rank = results.participants.findIndex((p) => p.isPlayer) + 1;

    if (this.onMatchEnd) {
      this.onMatchEnd(results);
    }
  }

  abortMatch() {
    this.isActive = false;
    this.group.visible = false;
    this.clearItems();
    if (this.savedPlayerPos) {
      this.player.teleport(this.savedPlayerPos.x, this.savedPlayerPos.y, this.savedPlayerPos.z);
    } else {
      this.player.teleport(-28, 0, -10);
    }
  }
}
