// ==========================================================================
// Mini-Game 2: Rooftop Run
// Neon parkour obstacle speedrun race with moving hurdles, jump pads & finish gate
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

export class RooftopRunGame {
  constructor(scene, playerController, onMatchEnd) {
    this.scene = scene;
    this.player = playerController;
    this.onMatchEnd = onMatchEnd;

    this.group = new THREE.Group();
    this.group.position.set(0, 200, 0); // Isolated elevated altitude
    this.scene.add(this.group);
    this.group.visible = false;

    this.isActive = false;
    this.elapsedTime = 0;
    this.checkpoints = [
      new THREE.Vector3(0, 201, 0),
      new THREE.Vector3(0, 201, 45),
      new THREE.Vector3(0, 201, 85),
    ];
    this.currentCheckpointIdx = 0;

    this.movingHurdles = [];
    this.jumpPads = [];

    this.buildCourse();
  }

  buildCourse() {
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x160f2e,
      roughness: 0.5,
      metalness: 0.3,
    });

    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x3ff0e0 });
    const neonMag = new THREE.MeshBasicMaterial({ color: 0xff5fd2 });
    const neonGold = new THREE.MeshBasicMaterial({ color: 0xffbf1f });

    // Platform Track Definitions (x, y, z, width, depth)
    const platforms = [
      { x: 0, y: 0, z: 0, w: 10, d: 14 }, // Start Pad
      { x: 0, y: 0, z: 16, w: 7, d: 10 },
      { x: -3, y: 1.5, z: 30, w: 6, d: 8 },
      { x: 3, y: 3.0, z: 45, w: 7, d: 12 }, // Checkpoint 1
      { x: 0, y: 4.5, z: 62, w: 6, d: 10 },
      { x: -2, y: 6.0, z: 75, w: 5, d: 8 },
      { x: 2, y: 7.5, z: 88, w: 8, d: 12 }, // Checkpoint 2
      { x: 0, y: 8.5, z: 104, w: 6, d: 10 },
      { x: 0, y: 9.0, z: 122, w: 12, d: 16 }, // Finish Platform
    ];

    platforms.forEach((p) => {
      const geo = new THREE.BoxGeometry(p.w, 1.2, p.d);
      const mesh = new THREE.Mesh(geo, platformMat);
      mesh.position.set(p.x, p.y - 0.6, p.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Neon Top Border
      const borderGeo = new THREE.BoxGeometry(p.w + 0.1, 0.1, p.d + 0.1);
      const border = new THREE.Mesh(borderGeo, neonCyan);
      border.position.set(p.x, p.y + 0.05, p.z);
      this.group.add(border);
    });

    // Jump Launch Pads (launch player high forward)
    const launchPadPositions = [
      { x: 0, y: 0.1, z: 18, force: 16 },
      { x: 0, y: 4.6, z: 64, force: 15 },
    ];

    launchPadPositions.forEach((lp) => {
      const padGeo = new THREE.BoxGeometry(3.2, 0.2, 3.2);
      const pad = new THREE.Mesh(padGeo, neonGold);
      pad.position.set(lp.x, lp.y, lp.z);
      this.group.add(pad);
      this.jumpPads.push({ ...lp, radius: 2.2 });
    });

    // Moving Laser Hurdles
    const hurdleConfigs = [
      { x: 0, y: 0.6, z: 14, minX: -2.8, maxX: 2.8, speed: 3.5 },
      { x: 0, y: 5.2, z: 60, minX: -2.5, maxX: 2.5, speed: 4.0 },
      { x: 0, y: 8.2, z: 86, minX: -3.0, maxX: 3.0, speed: 4.5 },
    ];

    hurdleConfigs.forEach((h) => {
      const laserGeo = new THREE.BoxGeometry(1.6, 0.4, 0.4);
      const laser = new THREE.Mesh(laserGeo, neonMag);
      laser.position.set(h.x, h.y, h.z);
      this.group.add(laser);
      this.movingHurdles.push({ mesh: laser, ...h });
    });

    // Finish Line Arch & Checkered Gate (z = 126)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 9.0, 126);

    const postGeo = new THREE.BoxGeometry(0.6, 5.5, 0.6);
    const leftPost = new THREE.Mesh(postGeo, platformMat);
    leftPost.position.x = -4.5;
    archGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, platformMat);
    rightPost.position.x = 4.5;
    archGroup.add(rightPost);

    const crossbarGeo = new THREE.BoxGeometry(9.6, 1.2, 0.8);
    const crossbar = new THREE.Mesh(crossbarGeo, neonGold);
    crossbar.position.y = 2.8;
    archGroup.add(crossbar);

    this.group.add(archGroup);
    this.finishGateZ = 126;

    // Course Ambient Light
    const courseLight = new THREE.DirectionalLight(0xddeeff, 1.4);
    courseLight.position.set(15, 30, 60);
    this.group.add(courseLight);
  }

  startMatch() {
    this.isActive = true;
    this.elapsedTime = 0;
    this.currentCheckpointIdx = 0;
    this.group.visible = true;

    // Teleport player to start pad
    this.savedPlayerPos = this.player.position.clone();
    this.player.teleport(0, 201, 0);

    sound.playPortal();
    window.dispatchEvent(new CustomEvent('gamemode-changed', { detail: { mode: 'rooftoprun', gameRef: this } }));
  }

  update(deltaTime, totalTime) {
    if (!this.isActive) return;

    // 1. Update Stopwatch
    this.elapsedTime += deltaTime;

    // 2. Animate Moving Laser Hurdles
    for (const hurdle of this.movingHurdles) {
      hurdle.x += Math.sin(totalTime * hurdle.speed) * deltaTime * 3.5;
      hurdle.mesh.position.x = hurdle.x;

      // Collision check with player
      const pX = this.player.position.x;
      const pY = this.player.position.y - 200;
      const pZ = this.player.position.z;

      if (
        Math.abs(pZ - hurdle.z) < 1.0 &&
        Math.abs(pX - hurdle.mesh.position.x) < 1.2 &&
        pY < hurdle.y + 0.6
      ) {
        // Hit hurdle: knockback
        this.player.velocity.z -= 6;
        this.player.velocity.y = 4;
        sound.playClick();
      }
    }

    // 3. Jump Pads Detection
    const pZ = this.player.position.z;
    const pX = this.player.position.x;
    const pY = this.player.position.y - 200;

    for (const pad of this.jumpPads) {
      if (Math.hypot(pX - pad.x, pZ - pad.z) < pad.radius && Math.abs(pY - pad.y) < 1.0) {
        this.player.velocity.y = pad.force;
        this.player.velocity.z = 12; // launch forward
        sound.playJump();
      }
    }

    // 4. Checkpoints Update
    if (pZ >= 45 && this.currentCheckpointIdx < 1) {
      this.currentCheckpointIdx = 1;
      sound.playGem();
    }
    if (pZ >= 85 && this.currentCheckpointIdx < 2) {
      this.currentCheckpointIdx = 2;
      sound.playGem();
    }

    // 5. Fall Off Track Detection
    if (this.player.position.y < 192) {
      // Respawn at last checkpoint
      const cp = this.checkpoints[this.currentCheckpointIdx];
      this.player.teleport(cp.x, cp.y, cp.z);
      sound.playClick();
    }

    // 6. Finish Line Detection
    if (pZ >= this.finishGateZ) {
      this.completeMatch();
    }
  }

  completeMatch() {
    this.isActive = false;
    this.group.visible = false;

    // Teleport back to arcade
    if (this.savedPlayerPos) {
      this.player.teleport(this.savedPlayerPos.x, this.savedPlayerPos.y, this.savedPlayerPos.z);
    } else {
      this.player.teleport(-28, 0, -10);
    }

    sound.playVictory();
    window.dispatchEvent(new CustomEvent('gamemode-changed', { detail: { mode: 'city' } }));

    const formattedTime = this.elapsedTime.toFixed(1) + 's';
    const playerTimeVal = this.elapsedTime;

    // Simulated opponents
    const botTimes = [
      { name: 'SpeedDemon', timeVal: playerTimeVal * (0.88 + Math.random() * 0.25) },
      { name: 'Acrobat', timeVal: playerTimeVal * (0.95 + Math.random() * 0.3) },
      { name: 'NeonSprint', timeVal: playerTimeVal * (1.05 + Math.random() * 0.2) },
    ];

    const participants = [
      { name: this.player.avatar.name, score: formattedTime, timeVal: playerTimeVal, isPlayer: true },
      ...botTimes.map((b) => ({ name: b.name, score: b.timeVal.toFixed(1) + 's', timeVal: b.timeVal })),
    ].sort((a, b) => a.timeVal - b.timeVal);

    const rank = participants.findIndex((p) => p.isPlayer) + 1;

    const results = {
      gameId: 'rooftop-run',
      gameName: 'Rooftop Run',
      score: formattedTime,
      gems: 0,
      coins: 0,
      duration: formattedTime,
      rank,
      participants,
    };

    if (this.onMatchEnd) {
      this.onMatchEnd(results);
    }
  }

  abortMatch() {
    this.isActive = false;
    this.group.visible = false;
    if (this.savedPlayerPos) {
      this.player.teleport(this.savedPlayerPos.x, this.savedPlayerPos.y, this.savedPlayerPos.z);
    } else {
      this.player.teleport(-28, 0, -10);
    }
  }
}
