// ============================================================================
// Nexora Metaverse - Live 3D Holographic Map & Tactical Radar Engine
// Renders rich visual 3D maps for the open city overworld and dynamically adapts
// to each active mini-game room (Coin Catcher Stadium, Hot Potato Colosseum,
// Cyber Speedway, Rooftop Run). Includes live character FOV, sonar pulses,
// waypoint navigation, pan/zoom controls, and 3D isometric tilt mode.
// ============================================================================

export class Map3DEngine {
  constructor(options = {}) {
    this.player = options.player || { x: 0, y: 0, z: 0, heading: 0, vx: 0, vz: 0 };
    this.gameContext = 'city'; // 'city' | 'coincatcher' | 'hotpotato' | 'cyberspeedway' | 'rooftoprun'
    this.activeGameRef = null;

    // Viewport & Transform State
    this.zoom = 1.0;
    this.panX = 0;
    this.panZ = 0;
    this.is3DTilt = false;
    this.tiltAngle = 0.55; // 3D isometric perspective pitch

    // Dynamic Waypoint
    this.waypoint = null; // { x, z, label, color }

    // Landmarks for City Overworld
    this.cityLandmarks = [
      { id: 'plaza', title: 'Central Plaza & Fountain', x: 0, z: 0, icon: '⛲', color: '#00d2d3', cat: 'social', desc: 'Central meeting hub, marble fountain, cyber cafe' },
      { id: 'arcade', title: 'Neon Arcade & Stadiums', x: 16.0, z: -17.5, icon: '🕹️', color: '#facc15', cat: 'games', desc: 'Coin Catcher, Hot Potato & Cyber Speedway arenas' },
      { id: 'market', title: 'Live Trading Stalls', x: 10.6, z: 7.2, icon: '📈', color: '#38bdf8', cat: 'social', desc: 'Market trading counter & DEX live charts' },
      { id: 'park', title: 'Sakura Zen Park', x: -5.0, z: 54.0, icon: '🌸', color: '#4ade80', cat: 'social', desc: 'Cherry blossom trees, relaxing pond, footbridge' },
      { id: 'transit', title: 'Transit Bus Stop', x: 15.6, z: -14.0, icon: '🚏', color: '#fb923c', cat: 'transport', desc: 'Cyber transit shelter and multi-lane highway' },
      { id: 'docks', title: 'Harbor Waterfront Pier', x: 46.0, z: 0.0, icon: '⚓', color: '#0284c7', cat: 'social', desc: 'Ocean boardwalk and sea view terrace' },
    ];

    // Filter category: 'all' | 'games' | 'social' | 'transport'
    this.activeFilter = 'all';

    // Canvas references
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.tacticalCanvas = null;
    this.tacticalCtx = null;

    // Listen for game mode transitions
    window.addEventListener('gamemode-changed', (e) => {
      if (e.detail?.mode) {
        this.setGameMode(e.detail.mode, e.detail.gameRef);
      }
    });

    this.setupModalUI();
  }

  setGameMode(mode, gameRef = null) {
    this.gameContext = mode;
    this.activeGameRef = gameRef;
    this.panX = 0;
    this.panZ = 0;
    this.updateModalHeader();
  }

  // Bind the circular HUD minimap canvas
  bindMinimapCanvas(canvas) {
    this.minimapCanvas = canvas;
    this.minimapCtx = canvas.getContext('2d');
  }

  // ==========================================================================
  // HUD MINIMAP RENDERING (60 FPS, with rotation, live FOV, visual terrain)
  // ==========================================================================
  renderMinimap(t) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Circular Masking & Deep Cyber Background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, w, h);

    // 2. Camera-centered or player-centered world coordinate transform
    const px = this.player.x || 0;
    const pz = this.player.z || 0;
    const heading = this.player.heading || 0;
    const scale = 1.35 * this.zoom;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw visual world based on active context
    if (this.gameContext === 'coincatcher') {
      this._drawCoinCatcherMinimap(ctx, px, pz, scale, t);
    } else if (this.gameContext === 'hotpotato') {
      this._drawHotPotatoMinimap(ctx, px, pz, scale, t);
    } else if (this.gameContext === 'cyberspeedway') {
      this._drawSpeedwayMinimap(ctx, px, pz, scale, t);
    } else if (this.gameContext === 'rooftoprun') {
      this._drawRooftopMinimap(ctx, px, pz, scale, t);
    } else {
      this._drawCityMinimap(ctx, px, pz, scale, t);
    }

    // 3. Draw Active Waypoint (if set)
    if (this.waypoint) {
      const wx = (this.waypoint.x - px) * scale;
      const wz = (this.waypoint.z - pz) * scale;
      ctx.fillStyle = this.waypoint.color || '#facc15';
      ctx.beginPath();
      ctx.arc(wx, wz, 5, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing beacon ring
      ctx.strokeStyle = this.waypoint.color || '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wx, wz, 5 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Draw Player Character in center with Vision Cone (FOV)
    this._drawPlayerIcon(ctx, 0, 0, heading, t, true);

    ctx.restore(); // Undo world transform

    // 5. Radar Scanline Sweep Animation
    const sweepAngle = (t * 2.0) % (Math.PI * 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 3, sweepAngle - 0.35, sweepAngle);
    ctx.closePath();
    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    sweepGrad.addColorStop(0, 'rgba(0, 210, 211, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(0, 210, 211, 0.0)');
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // 6. Tactical Compass Rings & Crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    [r * 0.35, r * 0.7, r * 0.95].forEach((ringR) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx, 4); ctx.lineTo(cx, h - 4);
    ctx.moveTo(4, cy); ctx.lineTo(w - 4, cy);
    ctx.stroke();

    ctx.restore(); // Restore circular clip

    // 7. Outer Metallic Bezel Ring with Cardinal Indicators (N, E, S, W)
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 10px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 8.5px "Fredoka", sans-serif';
    ctx.fillText('S', cx, h - 9);
    ctx.fillText('E', w - 9, cy);
    ctx.fillText('W', 9, cy);
  }

  // Visual City Map Layer (High-contrast tactical overworld with Left/Right Arenas, Fountain, Park, and Live Peers)
  _drawCityMinimap(ctx, px, pz, scale, t) {
    const pRad = 92 * scale;
    const pOffsetX = -px * scale;
    const pOffsetZ = -pz * scale;

    // 1. Concentric Tactical Distance Range Rings (25m, 50m, 75m, 100m)
    [25, 50, 75, 100].forEach((dist) => {
      const ringR = dist * scale;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.font = '700 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${dist}m`, ringR + 3, 3);
    });

    // 2. City Foundation Island (High-contrast slate-navy platform)
    ctx.fillStyle = '#0a1626';
    ctx.beginPath();
    ctx.arc(pOffsetX, pOffsetZ, pRad, 0, Math.PI * 2);
    ctx.fill();

    // Outer Neon Perimeter Border (92m)
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Central Plaza Paving Inlay (Radius 36m)
    ctx.fillStyle = '#132338';
    ctx.beginPath();
    ctx.arc(pOffsetX, pOffsetZ, 36 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 210, 211, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Decorative Plaza Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pOffsetX, pOffsetZ, 22 * scale, 0, Math.PI * 2);
    ctx.arc(pOffsetX, pOffsetZ, 12 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Highway Boulevard (x = 38.5, z = -92 to 92)
    const rx = (38.5 - px) * scale;
    const rz = (-pz) * scale;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rx - 5.5 * scale, rz - 92 * scale, 11 * scale, 184 * scale);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(rx, rz - 92 * scale);
    ctx.lineTo(rx, rz + 92 * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Grand Central Marble Fountain (0, 0)
    const fx = -px * scale;
    const fz = -pz * scale;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(fx, fz, 5.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Pulsing Water Ripples
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(fx, fz, (2.6 + Math.sin(t * 3.5) * 1.8) * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Fountain Core Crystal
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(fx, fz, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 6. LEFT BUILDING: COIN CATCHER ARENA (-18, -18)
    const ccx = (-18 - px) * scale;
    const ccz = (-18 - pz) * scale;
    const ccw = 16 * scale;
    const ccd = 8 * scale;
    ctx.fillStyle = '#2c2205';
    ctx.fillRect(ccx - ccw / 2, ccz - ccd / 2, ccw, ccd);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(ccx - ccw / 2, ccz - ccd / 2, ccw, ccd);

    // Arena Door & Badge
    ctx.fillStyle = '#fde047';
    ctx.fillRect(ccx - 2 * scale, ccz + ccd / 2 - 1.2 * scale, 4 * scale, 1.2 * scale);
    ctx.font = '900 10.5px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪙 COIN CATCHER', ccx, ccz - ccd / 2 - 5);

    // 7. RIGHT BUILDING: HOT POTATO COLOSSEUM (18, -18)
    const hpx = (18 - px) * scale;
    const hpz = (-18 - pz) * scale;
    const hpw = 16 * scale;
    const hpd = 8 * scale;
    ctx.fillStyle = '#2e0a0d';
    ctx.fillRect(hpx - hpw / 2, hpz - hpd / 2, hpw, hpd);
    ctx.strokeStyle = '#ff3838';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(hpx - hpw / 2, hpz - hpd / 2, hpw, hpd);

    // Colosseum Door & Badge
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(hpx - 2 * scale, hpz + hpd / 2 - 1.2 * scale, 4 * scale, 1.2 * scale);
    ctx.font = '900 10.5px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 HOT POTATO', hpx, hpz - hpd / 2 - 5);

    // 8. Cyber Cafe Promenade (0, -1.8)
    const cfx = (0 - px) * scale;
    const cfz = (-1.8 - pz) * scale;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cfx - 3.8 * scale, cfz - 2.5 * scale, 7.6 * scale, 5 * scale);
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cfx - 3.8 * scale, cfz - 2.5 * scale, 7.6 * scale, 5 * scale);
    ctx.fillStyle = '#00d2d3';
    ctx.font = '800 9px "Fredoka", sans-serif';
    ctx.fillText('☕ CYBER CAFE', cfx, cfz - 2.5 * scale - 4);

    // 9. Sakura Zen Park (-5, 54)
    const pkx = (-5 - px) * scale;
    const pkz = (54 - pz) * scale;
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.arc(pkx, pkz, 14 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Wishing Pond inside Park
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(pkx, pkz, 6.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Park Cherry Trees (Pink Blips)
    const trees = [
      [-14, 38], [14, 38], [-18, 48], [18, 48], [-12, 58], [12, 58],
      [-26, 14], [26, 14], [-30, 28], [30, 28]
    ];
    ctx.fillStyle = '#f472b6';
    trees.forEach(([tx, tz]) => {
      ctx.beginPath();
      ctx.arc((tx - px) * scale, (tz - pz) * scale, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#4ade80';
    ctx.font = '800 10px "Fredoka", sans-serif';
    ctx.fillText('🌸 SAKURA ZEN PARK', pkx, pkz - 14 * scale - 4);

    // 10. Live Peers & Other Players (from window.NEXORA_PEERS)
    if (window.NEXORA_PEERS) {
      window.NEXORA_PEERS.forEach((p) => {
        if (!p.here) return;
        const lx = (p.x - px) * scale;
        const lz = (p.z - pz) * scale;

        const col = p.body === 'muse' ? '#ec4899' : p.npc ? '#a78bfa' : '#38bdf8';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(lx, lz, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(lx, lz, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9.5px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name || 'Citizen', lx, lz - 9);
      });
    }

    // 11. Landmarks
    this.cityLandmarks.forEach((lm) => {
      if (this.activeFilter !== 'all' && lm.cat !== this.activeFilter) return;
      const lx = (lm.x - px) * scale;
      const lz = (lm.z - pz) * scale;
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(lx, lz, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(lx, lz, 7, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // Visual Coin Catcher Stadium Map Layer (76m x 56m Stadium Floor, Boost Pads, Live Coins)
  _drawCoinCatcherMinimap(ctx, px, pz, scale, t) {
    // Stadium Floor (76m x 56m)
    const sx = -px * scale;
    const sz = -pz * scale;
    const hw = 38 * scale;
    const hd = 28 * scale;

    ctx.fillStyle = '#140b28';
    ctx.fillRect(sx - hw, sz - hd, hw * 2, hd * 2);

    // Neon Perimeter Fence
    ctx.strokeStyle = '#ff5fd2';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(sx - hw, sz - hd, hw * 2, hd * 2);

    // Stadium Grid Lines
    ctx.strokeStyle = 'rgba(255, 95, 210, 0.2)';
    ctx.lineWidth = 1;
    for (let x = -36; x <= 36; x += 12) {
      ctx.beginPath();
      ctx.moveTo(sx + x * scale, sz - hd);
      ctx.lineTo(sx + x * scale, sz + hd);
      ctx.stroke();
    }
    for (let z = -24; z <= 24; z += 12) {
      ctx.beginPath();
      ctx.moveTo(sx - hw, sz + z * scale);
      ctx.lineTo(sx + hw, sz + z * scale);
      ctx.stroke();
    }

    // 8 Speed Boost Pads
    const boostLocs = [
      [-24, -14], [0, -16], [24, -14],
      [-24, 14], [0, 16], [24, 14],
      [-14, 0], [14, 0]
    ];
    ctx.fillStyle = '#3ff0e0';
    boostLocs.forEach(([bx, bz]) => {
      ctx.fillRect((bx - px) * scale - 2, (bz - pz) * scale - 2, 4, 4);
    });

    // Draw Live Coins from active CoinCatcher instance
    if (this.activeGameRef?.items) {
      this.activeGameRef.items.forEach((item) => {
        const ix = (item.mesh.position.x - px) * scale;
        const iz = (item.mesh.position.z - pz) * scale;
        if (item.type === 'gold') {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(ix, iz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(ix, iz, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // South Exit Doorway (z = 24.8)
    const exX = -px * scale;
    const exZ = (24.8 - pz) * scale;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(exX - 4 * scale, exZ - 1 * scale, 8 * scale, 2 * scale);
  }

  // Visual Hot Potato Colosseum Map Layer (48m radius, shrinking ring, potato bomb)
  _drawHotPotatoMinimap(ctx, px, pz, scale, t) {
    const cx = -px * scale;
    const cz = -pz * scale;
    const r = (this.activeGameRef?.arenaRadius || 48) * scale;

    // Grass Stadium Pitch
    ctx.fillStyle = '#22541d';
    ctx.beginPath();
    ctx.arc(cx, cz, 48 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Shrinking Danger Boundary Ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cz, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Pitch White Markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cz, 24 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Live Potato Bomb Carrier / Location
    if (this.activeGameRef?.potatoMesh) {
      const bx = (this.activeGameRef.potatoMesh.position.x - px) * scale;
      const bz = (this.activeGameRef.potatoMesh.position.z - pz) * scale;
      // Pulsing flame bomb aura
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(bx, bz, 8 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Bomb core
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bx, bz, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Runners / Rivals
    if (this.activeGameRef?.runners) {
      this.activeGameRef.runners.forEach((rnr) => {
        if (!rnr.isEliminated && rnr.mesh) {
          const rx = (rnr.mesh.position.x - px) * scale;
          const rz = (rnr.mesh.position.z - pz) * scale;
          ctx.fillStyle = rnr.hasPotato ? '#f97316' : '#60a5fa';
          ctx.beginPath();
          ctx.arc(rx, rz, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  // Visual Cyber Speedway Circuit Map Layer
  _drawSpeedwayMinimap(ctx, px, pz, scale, t) {
    const cx = -px * scale;
    const cz = -pz * scale;

    // Speedway Circuit Ribbon
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 14 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cz + 5 * scale, 50 * scale, 38 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Neon Curbs (Cyan Inner, Magenta Outer)
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cz + 5 * scale, 43 * scale, 31 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cz + 5 * scale, 57 * scale, 45 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Start / Finish Line (z = -35)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 7 * scale, cz - 36 * scale, 14 * scale, 2.5 * scale);
  }

  // Visual Rooftop Run Map Layer
  _drawRooftopMinimap(ctx, px, pz, scale, t) {
    const sx = -px * scale;
    const sz = -pz * scale;

    // Platform steps
    const plats = [
      { z: 0, w: 10, d: 14 },
      { z: 16, w: 7, d: 10 },
      { z: 30, w: 6, d: 8 },
      { z: 45, w: 7, d: 12 },
      { z: 62, w: 6, d: 10 },
      { z: 75, w: 5, d: 8 },
      { z: 88, w: 8, d: 12 },
      { z: 104, w: 6, d: 10 },
      { z: 122, w: 12, d: 16 },
    ];

    ctx.fillStyle = '#312e81';
    plats.forEach((p) => {
      ctx.fillRect(sx - (p.w / 2) * scale, sz + (p.z - p.d / 2) * scale, p.w * scale, p.d * scale);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - (p.w / 2) * scale, sz + (p.z - p.d / 2) * scale, p.w * scale, p.d * scale);
    });
  }

  // Draw Player Avatar Icon with Directional Vision Cone (FOV) and Radar Pulse
  _drawPlayerIcon(ctx, x, y, heading, t, isMinimap = false) {
    ctx.save();
    ctx.translate(x, y);

    // 1. Directional Vision Cone (FOV)
    const fovAngle = Math.PI / 3.2; // ~56 degrees FOV
    const fovDist = isMinimap ? 28 : 50;

    const coneGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, fovDist);
    coneGrad.addColorStop(0, 'rgba(0, 210, 211, 0.45)');
    coneGrad.addColorStop(1, 'rgba(0, 210, 211, 0.0)');

    ctx.save();
    ctx.rotate(heading);
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, fovDist, -Math.PI / 2 - fovAngle / 2, -Math.PI / 2 + fovAngle / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Pulsing Sonar Ping Rings
    const pingR = (t * 22) % 24;
    const pingAlpha = Math.max(0, 1 - pingR / 24);
    ctx.strokeStyle = `rgba(0, 210, 211, ${pingAlpha * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, pingR, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Player Arrow Pin
    ctx.save();
    ctx.rotate(heading);
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Central Glowing Core
    ctx.fillStyle = '#00d2d3';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ==========================================================================
  // FULLSCREEN INTERACTIVE 3D TACTICAL HOLO-MAP MODAL
  // ==========================================================================
  setupModalUI() {
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'tactical-holo-map-modal';
    this.modalContainer.style.cssText = `
      position: fixed; inset: 0; z-index: 10000; display: none;
      background: rgba(4, 8, 16, 0.92); backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px); font-family: 'Fredoka', system-ui, sans-serif;
      align-items: center; justify-content: center; user-select: none;
    `;

    this.modalContainer.innerHTML = `
      <style>
        #tactical-map-box {
          position: relative; width: min(1040px, 95vw); height: min(680px, 90vh);
          background: radial-gradient(circle at 50% 0%, #101c2e, #060a12 85%);
          border: 2px solid rgba(0, 210, 211, 0.6); border-radius: 24px;
          box-shadow: 0 0 50px rgba(0, 210, 211, 0.25), inset 0 0 30px rgba(0, 210, 211, 0.08);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .tm-header-bar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px; border-bottom: 1px solid rgba(56, 189, 248, 0.25);
          background: rgba(15, 23, 42, 0.75);
        }
        .tm-header-left {
          display: flex; align-items: center; gap: 12px;
        }
        .tm-header-btns {
          display: flex; align-items: center; gap: 8px;
        }
        .tm-filter-bar {
          position: absolute; left: 16px; bottom: 16px; display: flex; gap: 6px;
          background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 999px; padding: 4px 6px; z-index: 10;
        }
        .tm-zoom-btns {
          position: absolute; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 6px; z-index: 10;
        }
        .tm-bottom-bar {
          padding: 10px 20px; border-top: 1px solid rgba(56, 189, 248, 0.25);
          background: rgba(15, 23, 42, 0.85); display: flex; justify-content: space-between; align-items: center;
        }
        .tm-ft-btns {
          display: flex; gap: 8px;
        }

        @media (max-width: 768px) {
          #tactical-map-box {
            width: 96vw !important;
            height: 92vh !important;
            border-radius: 18px !important;
          }
          .tm-header-bar {
            padding: 8px 12px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          #tm-title {
            font-size: 14px !important;
          }
          #tm-badge {
            font-size: 9.5px !important;
            padding: 1px 6px !important;
          }
          #tm-coords {
            font-size: 10px !important;
          }
          .tm-header-btns {
            width: 100% !important;
            justify-content: flex-end !important;
            gap: 6px !important;
          }
          .tm-header-btns button {
            padding: 5px 10px !important;
            font-size: 11px !important;
          }
          .tm-filter-bar {
            left: 8px !important;
            bottom: 8px !important;
            padding: 3px 6px !important;
            gap: 3px !important;
            max-width: calc(100% - 60px) !important;
            overflow-x: auto !important;
          }
          .tm-filter-btn {
            padding: 4px 8px !important;
            font-size: 10.5px !important;
            white-space: nowrap !important;
          }
          .tm-zoom-btns {
            right: 8px !important;
            bottom: 8px !important;
            gap: 4px !important;
          }
          .tm-zoom-btns button {
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
          }
          .tm-bottom-bar {
            padding: 8px 12px !important;
            flex-direction: column !important;
            gap: 6px !important;
            align-items: stretch !important;
          }
          .tm-bottom-bar .tm-tip {
            display: none !important;
          }
          .tm-ft-btns {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 4px !important;
          }
          .tm-ft-btns button {
            flex: 1 !important;
            padding: 5px 6px !important;
            font-size: 10.5px !important;
            text-align: center !important;
          }
        }
      </style>

      <div id="tactical-map-box">
        <!-- Top Tactical Header Bar -->
        <div class="tm-header-bar">
          <div class="tm-header-left">
            <div style="font-size: 22px;">🌐</div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <b id="tm-title" style="font-size: 18px; color: #fff; letter-spacing: 0.02em;">METAVERSE 3D TACTICAL MAP</b>
                <span id="tm-badge" style="background: rgba(0, 210, 211, 0.2); border: 1px solid #00d2d3; color: #00d2d3; font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px;">
                  LIVE TELEMETRY
                </span>
              </div>
              <div id="tm-coords" style="font-size: 12px; color: #94a3b8; font-family: monospace; margin-top: 1px;">
                POS: X 0.0 | Z 0.0 · SPEED: 0.0 m/s · HEADING: 0°
              </div>
            </div>
          </div>

          <!-- Filter & View Controls -->
          <div class="tm-header-btns">
            <button id="tm-btn-tilt" style="
              background: rgba(30, 41, 59, 0.85); border: 1.5px solid #38bdf8; color: #38bdf8;
              border-radius: 999px; padding: 6px 14px; font-weight: 800; font-size: 12px;
              cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s;
            ">
              🧊 3D Isometric View
            </button>
            <button id="tm-btn-recenter" style="
              background: rgba(30, 41, 59, 0.85); border: 1.5px solid #00d2d3; color: #00d2d3;
              border-radius: 999px; padding: 6px 14px; font-weight: 800; font-size: 12px;
              cursor: pointer; display: flex; align-items: center; gap: 5px;
            ">
              🎯 Center You
            </button>
            <button id="tm-btn-close" style="
              background: rgba(239, 68, 68, 0.2); border: 1.5px solid #ef4444; color: #ef4444;
              border-radius: 50%; width: 32px; height: 32px; font-size: 18px; line-height: 1;
              cursor: pointer; display: grid; place-items: center;
            ">
              ✕
            </button>
          </div>
        </div>

        <!-- Center Interactive Map Canvas Area -->
        <div style="position: relative; flex: 1; width: 100%; height: 100%; overflow: hidden; cursor: grab; touch-action: none;" id="tm-canvas-wrap">
          <canvas id="tm-tactical-canvas" style="width: 100%; height: 100%; display: block;"></canvas>

          <!-- Floating Zoom Controls -->
          <div class="tm-zoom-btns">
            <button id="tm-zoom-in" style="background: rgba(15, 23, 42, 0.92); border: 1.5px solid #00d2d3; color: #fff; width: 36px; height: 36px; border-radius: 9px; font-size: 18px; font-weight: 900; cursor: pointer;">+</button>
            <button id="tm-zoom-out" style="background: rgba(15, 23, 42, 0.92); border: 1.5px solid #00d2d3; color: #fff; width: 36px; height: 36px; border-radius: 9px; font-size: 18px; font-weight: 900; cursor: pointer;">−</button>
          </div>

          <!-- Bottom Left Filter Bar -->
          <div class="tm-filter-bar">
            <button class="tm-filter-btn active" data-filter="all" style="background: #00d2d3; border: none; border-radius: 999px; padding: 5px 12px; font-weight: 800; font-size: 11.5px; color: #080c16; cursor: pointer;">All</button>
            <button class="tm-filter-btn" data-filter="games" style="background: transparent; border: none; border-radius: 999px; padding: 5px 12px; font-weight: 800; font-size: 11.5px; color: #94a3b8; cursor: pointer;">🕹️ Arenas</button>
            <button class="tm-filter-btn" data-filter="social" style="background: transparent; border: none; border-radius: 999px; padding: 5px 12px; font-weight: 800; font-size: 11.5px; color: #94a3b8; cursor: pointer;">🌸 Social</button>
            <button class="tm-filter-btn" data-filter="transport" style="background: transparent; border: none; border-radius: 999px; padding: 5px 12px; font-weight: 800; font-size: 11.5px; color: #94a3b8; cursor: pointer;">🚏 Transit</button>
          </div>
        </div>

        <!-- Bottom Action Bar with Quick Fast-Travel -->
        <div class="tm-bottom-bar">
          <div class="tm-tip" style="font-size: 12px; color: #94a3b8; display: flex; gap: 10px; align-items: center;">
            <span>💡 <b>Tip:</b> Tap any landmark or location on the map to set a waypoint or fast travel</span>
            <span style="color: #facc15;">·</span>
            <span>Press <b>[M]</b> to toggle map</span>
          </div>

          <div class="tm-ft-btns">
            <button id="tm-ft-plaza" style="background: rgba(0, 210, 211, 0.2); border: 1px solid #00d2d3; color: #00d2d3; border-radius: 8px; padding: 6px 12px; font-weight: 800; font-size: 11.5px; cursor: pointer;">
              🏙️ Plaza (0, 0)
            </button>
            <button id="tm-ft-coincatcher" style="background: rgba(250, 204, 21, 0.2); border: 1px solid #facc15; color: #fde047; border-radius: 8px; padding: 6px 12px; font-weight: 800; font-size: 11.5px; cursor: pointer;">
              🪙 Coin Catcher (-18, -15)
            </button>
            <button id="tm-ft-hotpotato" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ff6b6b; border-radius: 8px; padding: 6px 12px; font-weight: 800; font-size: 11.5px; cursor: pointer;">
              🔥 Hot Potato (18, -15)
            </button>
            <button id="tm-ft-park" style="background: rgba(74, 222, 128, 0.2); border: 1px solid #4ade80; color: #4ade80; border-radius: 8px; padding: 6px 12px; font-weight: 800; font-size: 11.5px; cursor: pointer;">
              🌸 Park (-5, 48)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalContainer);

    this.tacticalCanvas = this.modalContainer.querySelector('#tm-tactical-canvas');
    this.tacticalCtx = this.tacticalCanvas.getContext('2d');

    this._bindModalEvents();
  }

  _bindModalEvents() {
    const wrap = this.modalContainer.querySelector('#tm-canvas-wrap');
    let isDragging = false;
    let startX = 0, startZ = 0;

    // Mouse Controls
    wrap.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startZ = e.clientY;
      wrap.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dz = e.clientY - startZ;
      startX = e.clientX;
      startZ = e.clientY;
      this.panX += dx;
      this.panZ += dz;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      wrap.style.cursor = 'grab';
    });

    // Touch Drag & Pinch-Zoom for Mobile Devices
    let initialPinchDist = null;
    let initialZoom = 1.0;
    let touchStartX = 0, touchStartZ = 0;
    let isTouching = false;

    wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isTouching = true;
        touchStartX = e.touches[0].clientX;
        touchStartZ = e.touches[0].clientY;
        initialPinchDist = null;
      } else if (e.touches.length === 2) {
        isTouching = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialZoom = this.zoom;
      }
    }, { passive: false });

    wrap.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isTouching) {
        const dx = e.touches[0].clientX - touchStartX;
        const dz = e.touches[0].clientY - touchStartZ;
        touchStartX = e.touches[0].clientX;
        touchStartZ = e.touches[0].clientY;
        this.panX += dx;
        this.panZ += dz;
      } else if (e.touches.length === 2 && initialPinchDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / initialPinchDist;
        this.zoom = Math.max(0.4, Math.min(3.5, initialZoom * factor));
      }
    }, { passive: false });

    wrap.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isTouching = false;
        initialPinchDist = null;
      } else if (e.touches.length === 1) {
        isTouching = true;
        touchStartX = e.touches[0].clientX;
        touchStartZ = e.touches[0].clientY;
        initialPinchDist = null;
      }
    });

    // Mouse wheel zoom
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoom = Math.max(0.4, Math.min(3.5, this.zoom * zoomDelta));
    }, { passive: false });

    // Zoom Buttons
    this.modalContainer.querySelector('#tm-zoom-in')?.addEventListener('click', () => {
      this.zoom = Math.min(3.5, this.zoom * 1.25);
    });
    this.modalContainer.querySelector('#tm-zoom-out')?.addEventListener('click', () => {
      this.zoom = Math.max(0.4, this.zoom * 0.8);
    });

    // Recenter
    this.modalContainer.querySelector('#tm-btn-recenter')?.addEventListener('click', () => {
      this.panX = 0;
      this.panZ = 0;
      this.zoom = 1.0;
    });

    // 3D Isometric Tilt Toggle
    const tiltBtn = this.modalContainer.querySelector('#tm-btn-tilt');
    tiltBtn?.addEventListener('click', () => {
      this.is3DTilt = !this.is3DTilt;
      tiltBtn.innerHTML = this.is3DTilt ? '🗺️ 2D Tactical View' : '🧊 3D Isometric View';
      tiltBtn.style.borderColor = this.is3DTilt ? '#facc15' : '#38bdf8';
      tiltBtn.style.color = this.is3DTilt ? '#facc15' : '#38bdf8';
    });

    // Filter Buttons
    this.modalContainer.querySelectorAll('.tm-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.modalContainer.querySelectorAll('.tm-filter-btn').forEach((b) => {
          b.style.background = 'transparent';
          b.style.color = '#94a3b8';
        });
        btn.style.background = '#00d2d3';
        btn.style.color = '#080c16';
        this.activeFilter = btn.dataset.filter;
      });
    });

    // Fast-Travel Click Buttons
    this.modalContainer.querySelector('#tm-ft-plaza')?.addEventListener('click', () => {
      this.teleportPlayer(0, 0);
    });
    this.modalContainer.querySelector('#tm-ft-coincatcher')?.addEventListener('click', () => {
      this.teleportPlayer(-18.0, -15.0);
    });
    this.modalContainer.querySelector('#tm-ft-hotpotato')?.addEventListener('click', () => {
      this.teleportPlayer(18.0, -15.0);
    });
    this.modalContainer.querySelector('#tm-ft-park')?.addEventListener('click', () => {
      this.teleportPlayer(-5.0, 48.0);
    });

    // Close button & ESC key
    this.modalContainer.querySelector('#tm-btn-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.toggleModal();
      } else if (e.code === 'Escape' && this.modalContainer.style.display === 'flex') {
        this.closeModal();
      }
    });

    // Click canvas to fast-travel or set waypoint
    this.tacticalCanvas.addEventListener('click', (e) => {
      if (Math.hypot(e.movementX, e.movementY) > 5) return; // Ignore drag
      const rect = this.tacticalCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this._handleTacticalMapClick(clickX, clickY);
    });
  }

  _handleTacticalMapClick(cx, cy) {
    const w = this.tacticalCanvas.width;
    const h = this.tacticalCanvas.height;
    const midX = w / 2 + this.panX;
    const midY = h / 2 + this.panZ;
    const scale = 2.4 * this.zoom;

    const px = this.player.x || 0;
    const pz = this.player.z || 0;

    // Convert screen coordinates back to world coordinates
    const worldX = px + (cx - midX) / scale;
    const worldZ = pz + (cy - midY) / scale;

    // Check if clicked near landmark
    let clickedLm = null;
    this.cityLandmarks.forEach((lm) => {
      if (Math.hypot(lm.x - worldX, lm.z - worldZ) < 8.0) {
        clickedLm = lm;
      }
    });

    if (clickedLm) {
      this.teleportPlayer(clickedLm.x, clickedLm.z);
    } else {
      // Set Waypoint!
      this.waypoint = { x: worldX, z: worldZ, label: 'Destination', color: '#facc15' };
      this.showToastNotification(`📍 Waypoint set at [X: ${worldX.toFixed(1)}, Z: ${worldZ.toFixed(1)}]`);
    }
  }

  teleportPlayer(x, z) {
    if (this.player.teleport) {
      this.player.teleport(x, this.player.y || 0, z);
    } else {
      this.player.x = x;
      this.player.z = z;
    }
    this.closeModal();
    this.showToastNotification(`⚡ Teleported to [${x.toFixed(1)}, ${z.toFixed(1)}]`);
  }

  showToastNotification(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 75px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95); border: 2px solid #00d2d3;
      color: #fff; padding: 10px 24px; border-radius: 999px;
      font-weight: 800; font-size: 15px; z-index: 10001;
      box-shadow: 0 4px 20px rgba(0, 210, 211, 0.5); pointer-events: none;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  updateModalHeader() {
    const titleEl = this.modalContainer.querySelector('#tm-title');
    const badgeEl = this.modalContainer.querySelector('#tm-badge');
    if (!titleEl || !badgeEl) return;

    if (this.gameContext === 'coincatcher') {
      titleEl.textContent = '🪙 COIN CATCHER CYBER STADIUM (76m × 56m)';
      badgeEl.textContent = 'ARENA TACTICAL';
      badgeEl.style.color = '#fde047';
      badgeEl.style.borderColor = '#facc15';
    } else if (this.gameContext === 'hotpotato') {
      titleEl.textContent = '🥔 HOT POTATO COLOSSEUM (R=48m)';
      badgeEl.textContent = 'ARENA DANGER RADAR';
      badgeEl.style.color = '#ef4444';
      badgeEl.style.borderColor = '#ef4444';
    } else if (this.gameContext === 'cyberspeedway') {
      titleEl.textContent = '🏁 CYBER SPEEDWAY GRAND PRIX CIRCUIT';
      badgeEl.textContent = 'SPEEDWAY RADAR';
      badgeEl.style.color = '#00ff88';
      badgeEl.style.borderColor = '#00ff88';
    } else if (this.gameContext === 'rooftoprun') {
      titleEl.textContent = '🏃 ROOFTOP RUN SKYLINE PARKOUR';
      badgeEl.textContent = 'ALTITUDE COURSE';
      badgeEl.style.color = '#38bdf8';
      badgeEl.style.borderColor = '#38bdf8';
    } else {
      titleEl.textContent = 'METAVERSE 3D TACTICAL MAP';
      badgeEl.textContent = 'CENTRAL METROPOLIS';
      badgeEl.style.color = '#00d2d3';
      badgeEl.style.borderColor = '#00d2d3';
    }
  }

  toggleModal() {
    if (this.modalContainer.style.display === 'flex') {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  openModal() {
    this.modalContainer.style.display = 'flex';
    this.updateModalHeader();
    this.panX = 0;
    this.panZ = 0;

    // Immediately sync canvas buffer to container
    const wrap = this.modalContainer.querySelector('#tm-canvas-wrap');
    if (wrap && this.tacticalCanvas) {
      const rect = wrap.getBoundingClientRect();
      const targetW = Math.round(rect.width);
      const targetH = Math.round(rect.height);
      if (targetW > 0 && targetH > 0) {
        this.tacticalCanvas.width = targetW;
        this.tacticalCanvas.height = targetH;
      }
    }
  }

  closeModal() {
    this.modalContainer.style.display = 'none';
  }

  // Render tactical fullscreen map (called each frame while modal open)
  renderTacticalMap(t) {
    if (!this.tacticalCtx || this.modalContainer.style.display !== 'flex') return;
    const ctx = this.tacticalCtx;

    // Automatically synchronize canvas buffer dimensions to DOM rect
    const wrap = this.modalContainer.querySelector('#tm-canvas-wrap');
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      const targetW = Math.round(rect.width);
      const targetH = Math.round(rect.height);
      if (targetW > 0 && targetH > 0 && (this.tacticalCanvas.width !== targetW || this.tacticalCanvas.height !== targetH)) {
        this.tacticalCanvas.width = targetW;
        this.tacticalCanvas.height = targetH;
      }
    }

    const w = this.tacticalCanvas.width || 800;
    const h = this.tacticalCanvas.height || 500;

    ctx.clearRect(0, 0, w, h);

    // Deep sci-fi tactical background
    ctx.fillStyle = '#060d19';
    ctx.fillRect(0, 0, w, h);

    // Tactical Coordinate Grid Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 210, 211, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 36 * this.zoom;
    const startX = (w / 2 + this.panX) % gridSize;
    const startY = (h / 2 + this.panZ) % gridSize;
    for (let x = startX; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = startY; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    const midX = w / 2 + this.panX;
    const midY = h / 2 + this.panZ;
    const scale = 2.4 * this.zoom;
    const px = this.player.x || 0;
    const pz = this.player.z || 0;
    const heading = this.player.heading || 0;
    const speed = Math.hypot(this.player.vx || 0, this.player.vz || 0);

    // Update telemetry readout text
    const coordsEl = this.modalContainer.querySelector('#tm-coords');
    if (coordsEl) {
      const deg = Math.round(((heading * 180 / Math.PI) + 360) % 360);
      coordsEl.textContent = `POS: X ${px.toFixed(1)} | Z ${pz.toFixed(1)} · SPEED: ${speed.toFixed(1)} m/s · HEADING: ${deg}° · ZOOM: ${(this.zoom * 100).toFixed(0)}%`;
    }

    ctx.save();
    ctx.translate(midX, midY);

    if (this.is3DTilt) {
      // Apply 3D Isometric Perspective Matrix
      ctx.transform(1, 0, -0.28, this.tiltAngle, 0, 0);
    }

    // Draw active tactical layer
    if (this.gameContext === 'coincatcher') {
      this._drawCoinCatcherMinimap(ctx, px, pz, scale, t);
    } else if (this.gameContext === 'hotpotato') {
      this._drawHotPotatoMinimap(ctx, px, pz, scale, t);
    } else if (this.gameContext === 'cyberspeedway') {
      this._drawSpeedwayMinimap(ctx, px, pz, scale, t);
    } else if (this.gameContext === 'rooftoprun') {
      this._drawRooftopMinimap(ctx, px, pz, scale, t);
    } else {
      this._drawCityMinimap(ctx, px, pz, scale, t);
    }

    // Draw Waypoint
    if (this.waypoint) {
      const wx = (this.waypoint.x - px) * scale;
      const wz = (this.waypoint.z - pz) * scale;
      const dist = Math.hypot(this.waypoint.x - px, this.waypoint.z - pz);

      // Dotted trajectory line to waypoint
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wx, wz);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = this.waypoint.color || '#facc15';
      ctx.beginPath();
      ctx.arc(wx, wz, 7, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing beacon ring
      ctx.strokeStyle = this.waypoint.color || '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wx, wz, 7 + Math.sin(t * 6) * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Fredoka", sans-serif';
      ctx.fillText(`${this.waypoint.label || 'Waypoint'} (${dist.toFixed(0)}m)`, wx + 11, wz + 4);
    }

    // Draw Player Pin with FOV
    this._drawPlayerIcon(ctx, 0, 0, heading, t, false);

    ctx.restore();
  }

  // Main frame tick
  update(t, dt) {
    this.renderMinimap(t);
    this.renderTacticalMap(t);
  }
}

// Global Singleton
export const map3DEngine = new Map3DEngine();
