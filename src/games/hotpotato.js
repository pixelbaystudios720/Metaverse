// ==========================================================================
// Mini-Game: HOT POTATO (3D Multiplayer Stadium Elimination Game)
// Exactly matching the user's uploaded Image 2:
// - 3D Grassy Stadium Arena with stadium perimeter wall & colorful bounce cubes (yellow, purple, cyan)
// - 3D Anime/Stylized human running characters (You in red hoodie, Rahul, Alex, Priya, Dev)
// - Overhead floating name badges (▼ You, ▼ Rahul, ▼ Alex, ▼ Priya, ▼ Dev)
// - Cute, glowing, angry potato bomb held by current holder with sparking wick
// - Proximity tagging (<2.8m), 2s anti-tagback cooldown shield
// - Exact UI from Image 2:
//   * Top-left: Cute angry potato mascot + "HOT POTATO - Tag someone before it explodes!"
//   * Top-center: Stopwatch "⏱️ 00:12" and "Round ends soon!"
//   * Top-right: "👥 6 / 10" alive counter + Pulsing bomb "Fuse 00:12"
//   * Left feed: "Rahul got the Potato!", "Alex eliminated!", "Priya is now spectating"
//   * Bottom-center: "🏃 Tag another player!"
//   * Bottom-left: "👁️ Spectating: Priya - Press E to spectate"
//   * Bottom-right: "Winner! 👑 Rahul" celebratory card with "Play Again" button
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

export class HotPotatoGame {
  constructor(scene, playerController, onMatchEnd) {
    this.scene = scene;
    this.player = playerController;
    this.onMatchEnd = onMatchEnd;

    this.group = new THREE.Group();
    this.group.position.set(0, 160, 0); // Isolated elevated stadium
    this.scene.add(this.group);
    this.group.visible = false;

    // Configurable Game Parameters matching Authoritative Server Spec
    this.fuseDuration = 10 + Math.random() * 5; // 10 to 15s random fuse
    this.tagCooldownDuration = 2.0; // 2s anti-tagback cooldown
    this.tagRadius = 1.2; // Proximity tag distance in meters (no E key needed)
    this.arenaRadius = 24; // Stadium pitch radius
    this.targetArenaRadius = 24;
    this.minArenaRadius = 10;
    this.shrinkPerRound = 3.5;
    this.maxMatchDuration = 180; // 180s max match duration

    // State Variables
    this.isActive = false;
    this.isSpectating = false;
    this.spectatorTargetIdx = 0;
    this.state = 'idle'; // 'idle' | 'countdown' | 'playing' | 'exploding' | 'gameover'
    this.fuseTime = this.fuseDuration;
    this.currentHolderId = 'local_player';
    this.lastHolderId = null;
    this.tagCooldownTimer = 0;
    this.eliminatedRankings = [];

    // Player & Bot Profiles (Exact from Image 2)
    this.botProfiles = [
      { id: 'rahul', name: 'Rahul', color: '#facc15', hoodie: '#facc15', hair: '#1e293b' },
      { id: 'alex', name: 'Alex', color: '#3b82f6', hoodie: '#3b82f6', hair: '#0f172a' },
      { id: 'priya', name: 'Priya', color: '#ec4899', hoodie: '#ec4899', hair: '#18181b', pigtails: true },
      { id: 'dev', name: 'Dev', color: '#18181b', hoodie: '#27272a', hair: '#f8fafc' },
      { id: 'karan', name: 'Karan', color: '#10b981', hoodie: '#10b981', hair: '#334155' },
    ];

    this.players = [];
    this.particles = [];

    this.buildStadiumArena();
    this.buildCutePotatoBomb();
    this.buildUI();
  }

  // ---------------------------------------------------------------- 1. 3D Stadium Arena (Image 2)
  buildStadiumArena() {
    this.arenaGroup = new THREE.Group();
    this.group.add(this.arenaGroup);

    // Green Grass Pitch Floor
    const grassGeo = new THREE.CylinderGeometry(28, 28.5, 1.2, 48);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x55b83b,
      roughness: 0.8,
      metalness: 0.05,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = -0.6;
    grass.receiveShadow = true;
    this.arenaGroup.add(grass);

    // Inner White Pitch Boundary Circle
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pitchCircle = new THREE.Mesh(new THREE.RingGeometry(23.8, 24.1, 64), lineMat);
    pitchCircle.rotation.x = -Math.PI / 2;
    pitchCircle.position.y = 0.02;
    this.arenaGroup.add(pitchCircle);

    // Stadium Spectator Perimeter Wall (Cobblestone / Brick wall surrounding pitch)
    const wallGeo = new THREE.CylinderGeometry(28.2, 28.2, 3.8, 48, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.2,
      side: THREE.BackSide,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 1.9;
    this.arenaGroup.add(wall);

    // Golden Crown Arch / Banner at Stadium North (As in Image 2!)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -25.5);

    const archMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
    const archPostL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.5, 1.6), archMat);
    archPostL.position.set(-4.5, 3.25, 0);
    archGroup.add(archPostL);

    const archPostR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.5, 1.6), archMat);
    archPostR.position.set(4.5, 3.25, 0);
    archGroup.add(archPostR);

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.8, 1.8), archMat);
    archBeam.position.set(0, 5.8, 0);
    archGroup.add(archBeam);

    // Gold Crown Emblem on Arch
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 1.1, 5), crownMat);
    crown.position.set(0, 7.2, 0);
    crown.rotation.y = Math.PI / 5;
    archGroup.add(crown);

    this.arenaGroup.add(archGroup);

    // Return to Arcade Portal Doorway at Stadium South (z = 22.8)
    const exitGroup = new THREE.Group();
    exitGroup.position.set(0, 0, 22.8);

    const exitFrameMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x7f1d1d,
    });

    const exitPostL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.8, 0.9), exitFrameMat);
    exitPostL.position.set(-2.6, 2.4, 0);
    exitGroup.add(exitPostL);

    const exitPostR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.8, 0.9), exitFrameMat);
    exitPostR.position.set(2.6, 2.4, 0);
    exitGroup.add(exitPostR);

    const exitBeam = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.9, 0.9), exitFrameMat);
    exitBeam.position.set(0, 4.75, 0);
    exitGroup.add(exitBeam);

    // Canvas Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.lineWidth = 6;
    sCtx.strokeStyle = '#ef4444';
    sCtx.strokeRect(3, 3, 506, 122);
    sCtx.fillStyle = '#fde047';
    sCtx.font = '900 34px "Fredoka", sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('🚪 RETURN TO ARCADE', 256, 64);

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 1.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 5.5, 0);
    exitGroup.add(signMesh);

    // Glowing Swirling Energy Pane
    this.exitPortalMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const exitPane = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.0), this.exitPortalMat);
    exitPane.position.set(0, 2.1, 0);
    exitGroup.add(exitPane);

    const exitPad = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.08, 2.5),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    exitPad.position.set(0, 0.04, 0);
    exitGroup.add(exitPad);

    const exitLight = new THREE.PointLight(0xef4444, 2.0, 12);
    exitLight.position.set(0, 2.8, 0);
    exitGroup.add(exitLight);

    this.arenaGroup.add(exitGroup);


    // Colorful Stadium Obstacle Blocks (Yellow, Purple, Cyan cubes as seen in Image 2!)
    const blockConfigs = [
      { x: -18, z: -10, color: 0xa855f7, w: 2.4, h: 2.2, d: 2.4 }, // Purple Cube
      { x: 18, z: -10, color: 0xfacc15, w: 2.4, h: 2.2, d: 2.4 }, // Yellow Cube
      { x: -14, z: 12, color: 0x06b6d4, w: 2.4, h: 2.2, d: 2.4 }, // Cyan Cube
      { x: 14, z: 12, color: 0xa855f7, w: 2.4, h: 2.2, d: 2.4 }, // Purple Cube
      { x: -8, z: -18, color: 0xfacc15, w: 2.2, h: 2.0, d: 2.2 },
      { x: 8, z: -18, color: 0x06b6d4, w: 2.2, h: 2.0, d: 2.2 },
    ];

    blockConfigs.forEach((b) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.45, metalness: 0.2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.arenaGroup.add(mesh);
    });

    // Shrinking Safe Zone Boundary Ring
    this.boundaryRing = new THREE.Mesh(
      new THREE.RingGeometry(this.arenaRadius - 0.25, this.arenaRadius + 0.25, 64),
      new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide })
    );
    this.boundaryRing.rotation.x = -Math.PI / 2;
    this.boundaryRing.position.y = 0.05;
    this.arenaGroup.add(this.boundaryRing);

    // Warm Sun Overhead
    const stadiumSun = new THREE.DirectionalLight(0xfff5e6, 1.9);
    stadiumSun.position.set(15, 35, 20);
    this.arenaGroup.add(stadiumSun);

    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x4ade80, 1.1);
    this.arenaGroup.add(hemi);
  }

  // ---------------------------------------------------------------- 2. Cute Glowing Angry Potato Bomb (Image 2)
  buildCutePotatoBomb() {
    this.potatoGroup = new THREE.Group();

    // Potato Body
    const potatoGeo = new THREE.SphereGeometry(0.55, 20, 16);
    potatoGeo.scale(1.15, 0.95, 0.95);
    this.potatoMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.6,
      metalness: 0.15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
    });
    this.potatoMesh = new THREE.Mesh(potatoGeo, this.potatoMat);
    this.potatoGroup.add(this.potatoMesh);

    // Cute Angry Eyes (Matching Image 2!)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eyeL.position.set(-0.22, 0.14, 0.48);
    this.potatoGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eyeR.position.set(0.22, 0.14, 0.48);
    this.potatoGroup.add(eyeR);

    // Angry Eyebrows
    const browMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), browMat);
    browL.position.set(-0.22, 0.28, 0.5);
    browL.rotation.z = -0.35;
    this.potatoGroup.add(browL);

    const browR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), browMat);
    browR.position.set(0.22, 0.28, 0.5);
    browR.rotation.z = 0.35;
    this.potatoGroup.add(browR);

    // Cute Blushing Cheeks
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), blushMat);
    blushL.position.set(-0.35, 0.02, 0.46);
    this.potatoGroup.add(blushL);

    const blushR = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), blushMat);
    blushR.position.set(0.35, 0.02, 0.46);
    this.potatoGroup.add(blushR);

    // Burning Wick & Bright Glowing Spark Tip
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8),
      new THREE.MeshBasicMaterial({ color: 0x27272a })
    );
    wick.position.set(0, 0.58, 0);
    this.potatoGroup.add(wick);

    const sparkGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.spark = new THREE.Mesh(sparkGeo, sparkMat);
    this.spark.position.set(0, 0.75, 0);
    this.potatoGroup.add(this.spark);

    // Emissive Yellow Ground Glow Ring
    const groundGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = 0.06;
    this.potatoGroup.add(groundGlow);

    this.group.add(this.potatoGroup);
    this.potatoGroup.visible = false;
  }

  // ---------------------------------------------------------------- 3. Pixel-Perfect UI Matching Image 2
  buildUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'hotpotato-ui';
    this.uiContainer.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 999;
      font-family: "Fredoka", "Nunito", system-ui, sans-serif; display: none;
    `;

    this.uiContainer.innerHTML = `
      <!-- Top-Left Title Badge with Angry Potato Mascot (Exact from Image 2!) -->
      <div id="hp-title-card" style="position: absolute; top: 20px; left: 24px; display: flex; align-items: center; gap: 12px; pointer-events: auto;">
        <!-- Cute Angry Potato Icon -->
        <div style="width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706);
          border: 3px solid #fef08a; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.5);">
          🥔
        </div>
        <div>
          <div style="font-size: 32px; font-weight: 900; color: #fde047; text-shadow: 0 3px 0 #b45309, 0 6px 14px rgba(0,0,0,0.4); line-height: 1;">
            HOT POTATO
          </div>
          <div style="background: rgba(15, 23, 42, 0.75); border-radius: 999px; padding: 3px 12px; color: #fff; font-size: 13px; font-weight: 700; margin-top: 4px; display: inline-block;">
            Tag someone before it explodes!
          </div>
        </div>
      </div>

      <!-- Top-Center Stopwatch Gauge (⏱️ 00:12 Round ends soon!) -->
      <div id="hp-center-timer" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="background: rgba(15, 23, 42, 0.88); border: 2px solid #ef4444; border-radius: 999px; padding: 8px 32px;
          display: flex; align-items: center; gap: 10px; box-shadow: 0 0 25px rgba(239, 68, 68, 0.45);">
          <span style="font-size: 20px;">⏱️</span>
          <span id="hp-stopwatch-num" style="font-size: 26px; font-weight: 900; color: #fff; min-width: 75px; text-align: center;">00:12</span>
        </div>
        <div style="background: rgba(15, 23, 42, 0.7); border-radius: 999px; padding: 2px 14px; color: #fca5a5; font-size: 12px; font-weight: 700;">
          Round ends soon!
        </div>
      </div>

      <!-- Top-Right Player Count & Pulsing Fuse Gauge (Image 2) -->
      <div id="hp-right-gauges" style="position: absolute; top: 20px; right: 24px; display: flex; align-items: center; gap: 14px; pointer-events: auto;">
        <!-- Player Count Pill -->
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.2); border-radius: 999px;
          padding: 8px 18px; color: #fff; font-weight: 800; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <span>👥</span> <span id="hp-alive-pill">6 / 10</span>
        </div>

        <!-- Fuse Timer Pill with Bomb Graphic -->
        <div id="hp-fuse-pill" style="background: rgba(15, 23, 42, 0.95); border: 2px solid #ef4444; border-radius: 18px;
          padding: 6px 18px; display: flex; align-items: center; gap: 10px; box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);">
          <span style="font-size: 26px;">💣</span>
          <div>
            <div style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase;">Fuse</div>
            <div id="hp-fuse-clock" style="color: #ef4444; font-size: 22px; font-weight: 900; line-height: 1;">00:12</div>
          </div>
        </div>

        <!-- Exit Match Button: Return to Arcade -->
        <button id="hp-exit-btn" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: 2px solid #fff; border-radius: 999px;
          padding: 8px 18px; color: #fff; font-size: 13.5px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 6px;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.55); pointer-events: auto; transition: transform 0.15s ease;">
          <span>🚪</span> Return to Arcade
        </button>
      </div>

      <!-- Left Action / Elimination Feed (Exact lines from Image 2!) -->
      <div id="hp-action-feed" style="position: absolute; top: 110px; left: 24px; display: flex; flex-direction: column; gap: 6px; font-weight: 700; font-size: 15px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
        <div><span style="color: #fde047;">Rahul</span> got the Potato!</div>
        <div><span style="color: #f87171;">Alex</span> eliminated!</div>
        <div><span style="color: #67e8f9;">Priya</span> is now spectating</div>
      </div>

      <!-- Bottom-Center Action Prompt ("🏃 Tag another player!") -->
      <div id="hp-action-prompt" style="position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92); border: 2px solid #fff; border-radius: 999px; padding: 12px 34px;
        color: #fff; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 10px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5); pointer-events: none;">
        <span>🏃</span> <span>Tag another player!</span>
      </div>

      <!-- Exit Doorway Proximity Prompt -->
      <div id="hp-exit-prompt" style="position: absolute; bottom: 82px; left: 50%; transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.94); border: 2px solid #ef4444; border-radius: 999px; padding: 10px 24px;
        color: #fff; font-size: 14.5px; font-weight: 800; display: none; align-items: center; gap: 8px;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5); pointer-events: none; z-index: 95;">
        <span>🚪</span> <span>Walk through glowing doorway or click "Return to Arcade" to exit</span>
      </div>

      <!-- Bottom-Left Spectator Status & Controls (Image 2) -->
      <div id="hp-spec-card" style="position: absolute; bottom: 28px; left: 24px; background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 10px 18px; color: #fff;
        display: flex; flex-direction: column; gap: 4px; pointer-events: auto;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>👁️</span> <b>Spectating:</b> <span id="hp-spec-target" style="color: #c084fc; font-weight: 800;">Priya</span>
        </div>
        <div style="color: #94a3b8; font-size: 12px; font-weight: 600;">Press <b style="color: #fff;">E</b> to spectate next</div>
      </div>

      <!-- Bottom-Right Winner Card (Celebratory modal from Image 2!) -->
      <div id="hp-winner-card" style="position: absolute; bottom: 32px; right: 28px; background: linear-gradient(135deg, #78350f, #451a03);
        border: 3px solid #fde047; border-radius: 24px; padding: 18px 24px; width: 220px; text-align: center;
        box-shadow: 0 10px 35px rgba(250, 204, 21, 0.4); display: none; flex-direction: column; align-items: center; gap: 8px; pointer-events: auto;">
        
        <div style="font-size: 26px; font-weight: 900; color: #fde047; text-shadow: 0 2px 0 #b45309; line-height: 1;">
          👑 Winner!
        </div>

        <div style="width: 70px; height: 70px; border-radius: 50%; background: #fde047; border: 3px solid #fff;
          display: flex; align-items: center; justify-content: center; font-size: 38px; margin: 4px 0;">
          ✊
        </div>

        <div id="hp-winner-label" style="background: rgba(0,0,0,0.6); border-radius: 999px; padding: 4px 18px; color: #fff; font-size: 18px; font-weight: 800;">
          Rahul
        </div>

        <button id="hp-play-again-btn" style="background: linear-gradient(135deg, #fde047, #f59e0b); border: 2px solid #fff;
          border-radius: 999px; color: #451a03; font-size: 16px; font-weight: 900; padding: 10px 24px; cursor: pointer;
          width: 100%; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45); margin-top: 4px;">
          Play Again
        </button>
      </div>
    `;

    document.body.appendChild(this.uiContainer);

    // Bind Button Events
    this.uiContainer.querySelector('#hp-exit-btn').addEventListener('click', () => {
      sound.playClick();
      this.stopMatch();
    });

    this.uiContainer.querySelector('#hp-play-again-btn').addEventListener('click', () => {
      sound.playClick();
      this.startMatch();
    });

    // Keyboard 'E' to cycle spectating target
    window.addEventListener('keydown', (e) => {
      if (this.isActive && e.code === 'KeyE') {
        this.cycleSpectator();
      }
    });
  }

  // ---------------------------------------------------------------- 4. Match Lifecycle
  startMatch() {
    this.isActive = true;
    this.group.visible = true;
    this.uiContainer.style.display = 'block';
    this.uiContainer.querySelector('#hp-winner-card').style.display = 'none';

    // Teleport human player into stadium starting position
    this.savedPlayerPos = {
      x: this.player.x || 0,
      y: this.player.y || 0,
      z: this.player.z || 0,
    };

    this.player.teleport(0, 160, 8);
    this.player.heading = Math.PI;

    this.state = 'playing';
    this.fuseTime = this.fuseDuration;
    this.arenaRadius = 24;
    this.targetArenaRadius = 24;
    this.isSpectating = false;
    this.eliminatedRankings = [];

    this.initPlayers();
    sound.playPortal();
  }

  initPlayers() {
    // Clean existing bot meshes
    this.players.forEach((p) => {
      if (!p.isPlayer && p.mesh) this.group.remove(p.mesh);
    });
    this.players = [];

    // 1. Human Player ("You" in Red Hoodie, matching Image 2!)
    this.players.push({
      id: 'local_player',
      name: 'You',
      isPlayer: true,
      isAlive: true,
      color: '#ef4444',
      hoodie: '#ef4444',
      pos: new THREE.Vector3(0, 160, 8),
      vel: new THREE.Vector3(0, 0, 0),
      cooldown: 0,
    });

    // 2. Bot Opponents (Rahul, Alex, Priya, Dev, Karan)
    this.botProfiles.forEach((b, idx) => {
      const angle = (idx / this.botProfiles.length) * Math.PI * 2;
      const bx = Math.cos(angle) * 12;
      const bz = Math.sin(angle) * 12;

      const botMesh = this.createHumanoidRunnerMesh(b.name, b.hoodie, b.hair, b.pigtails);
      botMesh.position.set(bx, 0, bz);
      this.group.add(botMesh);

      this.players.push({
        id: b.id,
        name: b.name,
        isPlayer: false,
        isAlive: true,
        mesh: botMesh,
        pos: new THREE.Vector3(bx, 160, bz),
        vel: new THREE.Vector3(0, 0, 0),
        cooldown: 0,
        speed: 5.2 + Math.random() * 0.8,
        heading: angle + Math.PI,
      });
    });

    // You start holding the potato as in Image 2!
    this.setPotatoHolder('local_player');
    this.updateHUD();
  }

  createHumanoidRunnerMesh(name, hoodieColor, hairColor, hasPigtails) {
    const group = new THREE.Group();

    // Body in Hoodie
    const hoodieMat = new THREE.MeshStandardMaterial({ color: hoodieColor, roughness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd5ce, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.6 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.85, 12), hoodieMat);
    torso.position.y = 0.95;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 14), skinMat);
    head.position.y = 1.6;
    group.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 14), hairMat);
    hair.position.set(0, 1.68, -0.04);
    group.add(hair);

    if (hasPigtails) {
      // Priya's Cute Pigtails
      const ptL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.6, 8), hairMat);
      ptL.position.set(-0.45, 1.6, -0.15);
      ptL.rotation.z = 0.4;
      group.add(ptL);

      const ptR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.6, 8), hairMat);
      ptR.position.set(0.45, 1.6, -0.15);
      ptR.rotation.z = -0.4;
      group.add(ptR);
    }

    // Legs
    [-0.18, 0.18].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 8), pantsMat);
      leg.position.set(lx, 0.35, 0);
      group.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shoe.position.set(lx, 0.08, 0.08);
      group.add(shoe);
    });

    // Overhead Floating Nametag Badge ("▼ Rahul", "▼ Alex", etc.)
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 160;
    tagCanvas.height = 56;
    const ctx = tagCanvas.getContext('2d');
    ctx.fillStyle = hoodieColor;
    ctx.roundRect(4, 4, 152, 40, 12);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 80, 28);

    const tagTex = new THREE.CanvasTexture(tagCanvas);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex }));
    tag.scale.set(1.4, 0.48, 1);
    tag.position.y = 2.45;
    group.add(tag);

    return group;
  }

  // ---------------------------------------------------------------- 5. Tag & Holder Mechanism
  setPotatoHolder(playerId) {
    if (this.currentHolderId === playerId) return;

    this.lastHolderId = this.currentHolderId;
    this.currentHolderId = playerId;
    this.tagCooldownTimer = this.tagCooldownDuration;

    if (this.lastHolderId) {
      const prev = this.players.find((p) => p.id === this.lastHolderId);
      if (prev) prev.cooldown = this.tagCooldownDuration;
    }

    const current = this.players.find((p) => p.id === playerId);
    if (!current) return;

    this.potatoGroup.visible = true;
    sound.playTag();

    // Post to Action Feed
    this.addFeedEntry(`${current.name} got the Potato!`, current.isPlayer ? '#ef4444' : '#fde047');
    this.updateHUD();
  }

  triggerExplosion() {
    this.state = 'exploding';
    sound.playExplosion();

    const holder = this.players.find((p) => p.id === this.currentHolderId);
    if (!holder) return;

    // Fiery Explosion Particles
    this.spawnExplosion(holder.pos);

    holder.isAlive = false;
    if (holder.mesh) holder.mesh.visible = false;
    this.potatoGroup.visible = false;

    this.addFeedEntry(`${holder.name} eliminated!`, '#f87171');

    if (holder.isPlayer) {
      this.isSpectating = true;
      this.addFeedEntry('You are now spectating', '#67e8f9');
    }

    // Shrink Stadium Ring
    this.targetArenaRadius = Math.max(this.minArenaRadius, this.arenaRadius - this.shrinkPerRound);

    const remaining = this.players.filter((p) => p.isAlive);
    if (remaining.length <= 1) {
      const winner = remaining[0] ? remaining[0].name : 'Rahul';
      setTimeout(() => this.triggerVictory(winner), 1200);
    } else {
      setTimeout(() => {
        if (!this.isActive) return;
        const survivors = this.players.filter((p) => p.isAlive);
        const next = survivors[Math.floor(Math.random() * survivors.length)];
        this.setPotatoHolder(next.id);
        this.fuseDuration = 10 + Math.random() * 5;
        this.fuseTime = this.fuseDuration;
        this.state = 'playing';
      }, 1800);
    }

    this.updateHUD();
  }

  spawnExplosion(pos) {
    const blastGeo = new THREE.SphereGeometry(2.0, 16, 16);
    const blastMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.95 });
    const blast = new THREE.Mesh(blastGeo, blastMat);
    blast.position.copy(pos);
    this.group.add(blast);

    this.particles.push({ mesh: blast, scaleSpd: 9, fadeSpd: 2.5, life: 1.0 });

    for (let i = 0; i < 30; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      p.position.copy(pos);
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.group.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 3 + Math.random() * 5, Math.sin(angle) * speed),
        life: 1.2,
      });
    }
  }

  triggerVictory(winnerName) {
    this.state = 'gameover';
    sound.playVictory();

    const card = this.uiContainer.querySelector('#hp-winner-card');
    card.style.display = 'flex';
    this.uiContainer.querySelector('#hp-winner-label').textContent = winnerName;
  }

  cycleSpectator() {
    const aliveBots = this.players.filter((p) => p.isAlive && !p.isPlayer);
    if (!aliveBots.length) return;

    this.spectatorTargetIdx = (this.spectatorTargetIdx + 1) % aliveBots.length;
    const target = aliveBots[this.spectatorTargetIdx];
    this.uiContainer.querySelector('#hp-spec-target').textContent = target.name;
    sound.playClick();
  }

  addFeedEntry(msg, color) {
    const feed = this.uiContainer.querySelector('#hp-action-feed');
    const div = document.createElement('div');
    div.innerHTML = `<span style="color: ${color};">${msg}</span>`;
    feed.appendChild(div);
    if (feed.children.length > 5) feed.children[0].remove();
  }

  updateHUD() {
    const aliveCount = this.players.filter((p) => p.isAlive).length;
    this.uiContainer.querySelector('#hp-alive-pill').textContent = `${aliveCount} / 10`;
  }

  stopMatch() {
    this.isActive = false;
    this.group.visible = false;
    this.uiContainer.style.display = 'none';

    if (this.savedPlayerPos) {
      this.player.teleport(this.savedPlayerPos.x, this.savedPlayerPos.y, this.savedPlayerPos.z);
    }

    this.players.forEach((p) => {
      if (!p.isPlayer && p.mesh) this.group.remove(p.mesh);
    });
    this.players = [];
  }

  // ---------------------------------------------------------------- 6. Frame Loop
  update(deltaTime, totalTime) {
    if (!this.isActive) return;

    // Fuse Countdown
    if (this.state === 'playing') {
      this.fuseTime -= deltaTime;
      const formatted = `00:${Math.max(0, Math.ceil(this.fuseTime)).toString().padStart(2, '0')}`;
      this.uiContainer.querySelector('#hp-stopwatch-num').textContent = formatted;
      this.uiContainer.querySelector('#hp-fuse-clock').textContent = formatted;

      if (this.fuseTime <= 0) {
        this.triggerExplosion();
      }
    }

    if (this.tagCooldownTimer > 0) this.tagCooldownTimer -= deltaTime;
    this.players.forEach((p) => {
      if (p.cooldown > 0) p.cooldown -= deltaTime;
    });

    // Shrink Stadium Ring
    if (this.arenaRadius > this.targetArenaRadius) {
      this.arenaRadius = Math.max(this.targetArenaRadius, this.arenaRadius - deltaTime * 1.5);
      this.boundaryRing.scale.set(this.arenaRadius / 24, this.arenaRadius / 24, 1);
    }

    // Sync Human Player Position
    const localP = this.players.find((p) => p.isPlayer);
    if (localP && localP.isAlive) {
      localP.pos.set(this.player.x, 160, this.player.z);

      // Check Distance to Exit Portal Doorway (at x = 0, z = 22.8)
      const exitDist = Math.hypot(this.player.x - 0, this.player.z - 22.8);
      const exitPrompt = this.uiContainer?.querySelector('#hp-exit-prompt');
      if (exitDist < 2.6) {
        sound.playPortal();
        this.stopMatch();
        return;
      } else if (exitDist < 6.5) {
        if (exitPrompt) exitPrompt.style.display = 'flex';
      } else {
        if (exitPrompt) exitPrompt.style.display = 'none';
      }

      const d = Math.hypot(this.player.x, this.player.z);
      // Allow passing through doorway to exit at south
      const isNearDoorway = Math.abs(this.player.x) < 3.0 && this.player.z > 20.0;
      if (!isNearDoorway && d > this.arenaRadius - 0.5) {
        const a = Math.atan2(this.player.z, this.player.x);
        this.player.x = Math.cos(a) * (this.arenaRadius - 0.5);
        this.player.z = Math.sin(a) * (this.arenaRadius - 0.5);
      }
    }

    // Bot AI
    const holder = this.players.find((p) => p.id === this.currentHolderId);
    this.players.forEach((bot) => {
      if (bot.isPlayer || !bot.isAlive) return;
      const isHolder = bot.id === this.currentHolderId;

      if (isHolder) {
        // Chase nearest target
        let near = null,
          minD = Infinity;
        this.players.forEach((o) => {
          if (o.id === bot.id || !o.alive || o.cooldown > 0) return;
          const d = bot.pos.distanceTo(o.pos);
          if (d < minD) {
            minD = d;
            near = o;
          }
        });
        if (near) {
          const dir = new THREE.Vector3().subVectors(near.pos, bot.pos);
          dir.y = 0;
          dir.normalize();
          bot.vel.copy(dir).multiplyScalar(bot.speed * 1.15);
          bot.heading = Math.atan2(dir.x, dir.z);
        }
      } else {
        // Flee from holder
        if (holder && holder.isAlive) {
          const dir = new THREE.Vector3().subVectors(bot.pos, holder.pos);
          dir.y = 0;
          dir.normalize();
          bot.vel.copy(dir).multiplyScalar(bot.speed);
          bot.heading = Math.atan2(dir.x, dir.z);
        }
      }

      bot.pos.x += bot.vel.x * deltaTime;
      bot.pos.z += bot.vel.z * deltaTime;

      // Clamp to arena
      const dist = Math.hypot(bot.pos.x, bot.pos.z);
      if (dist > this.arenaRadius - 0.8) {
        const a = Math.atan2(bot.pos.z, bot.pos.x);
        bot.pos.x = Math.cos(a) * (this.arenaRadius - 0.8);
        bot.pos.z = Math.sin(a) * (this.arenaRadius - 0.8);
      }

      if (bot.mesh) {
        bot.mesh.position.set(bot.pos.x, 0, bot.pos.z);
        bot.mesh.rotation.y = THREE.MathUtils.lerp(bot.mesh.rotation.y, bot.heading, 0.2);
        // Bobbing run
        bot.mesh.position.y = Math.abs(Math.sin(totalTime * 12)) * 0.14;
      }
    });

    // Proximity Tag Transfer (<2.8m)
    if (this.state === 'playing' && holder && holder.isAlive && this.tagCooldownTimer <= 0) {
      for (const target of this.players) {
        if (target.id === holder.id || !target.isAlive || target.cooldown > 0) continue;
        if (holder.pos.distanceTo(target.pos) < this.tagRadius) {
          this.setPotatoHolder(target.id);
          break;
        }
      }
    }

    // Attach Cute Potato Bomb to Holder's hand / character
    if (holder && holder.isAlive && this.potatoGroup.visible) {
      this.potatoGroup.position.copy(holder.pos);
      this.potatoGroup.position.y = 160 + 1.2 + Math.sin(totalTime * 8) * 0.1;
      this.potatoMesh.rotation.y += deltaTime * 3;
      this.spark.scale.setScalar(0.8 + Math.sin(totalTime * 20) * 0.35);
    }

    // Spectator Camera Track
    if (this.isSpectating) {
      const aliveBots = this.players.filter((p) => p.isAlive && !p.isPlayer);
      if (aliveBots.length) {
        const spec = aliveBots[this.spectatorTargetIdx % aliveBots.length];
        if (spec) {
          this.player.x = THREE.MathUtils.lerp(this.player.x, spec.pos.x, 0.08);
          this.player.z = THREE.MathUtils.lerp(this.player.z, spec.pos.z, 0.08);
        }
      }
    }

    // Particle update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= deltaTime * (pt.fadeSpd || 1);
      if (pt.scaleSpd) pt.mesh.scale.addScalar(deltaTime * pt.scaleSpd);
      if (pt.vel) {
        pt.mesh.position.addScaledVector(pt.vel, deltaTime);
        pt.vel.y -= 9.8 * deltaTime;
      }
      if (pt.life <= 0) {
        this.group.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
