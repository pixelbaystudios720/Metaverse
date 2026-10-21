// Hot Potato (id: hotpotato): A high-energy 2D/3D hybrid multiplayer elimination game.
// One player holds a ticking bomb and must tag another player before it explodes!
// Features: Proximity tagging (<40px), 2s anti-tagback cooldown, 12s fuse timer,
// exaggerated explosion effects, shrinking safe zone arena, spectator mode, live leaderboards.

const W = 640, H = 480, TAU = Math.PI * 2, F = 'Fredoka, system-ui, sans-serif';
const FALLBACK = [
  { name: 'ZEPH', color: '#8cc8ff', meme: 'Claude Opus' },
  { name: 'GORP', color: '#ff8fb8', meme: 'Grok Sniper' },
  { name: 'OOZE', color: '#ffd166', meme: 'DeepSeek' },
  { name: 'WISP', color: '#ff6b81', meme: 'Qwen Hodl' },
  { name: 'MOCHI', color: '#7ad7c4', meme: 'Quick Flip' },
];

export function open({ me, agents = [], onClose }) {
  const wrap = document.createElement('div');
  wrap.className = 'hotpotato-modal';
  wrap.style.cssText = `
    position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;
    background: rgba(10, 8, 20, 0.88); backdrop-filter: blur(8px);
    font-family: ${F}; user-select: none;
  `;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  cv.style.cssText = `
    width: min(92vw, 640px); aspect-ratio: 4/3; background: #160e29;
    border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 0 2px #ff3838;
    display: block; outline: none; cursor: crosshair;
  `;
  wrap.appendChild(cv);

  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute; top: 16px; right: 20px; background: rgba(255,255,255,0.15);
    border: 0; border-radius: 50%; width: 40px; height: 40px; color: #fff; font-size: 20px;
    font-weight: 700; cursor: pointer; backdrop-filter: blur(4px);
  `;
  closeBtn.addEventListener('click', () => close());
  wrap.appendChild(closeBtn);

  document.body.appendChild(wrap);
  const ctx = cv.getContext('2d');

  // Audio Synth
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  function playBeep(freq, dur, type = 'sine') {
    try {
      if (ac.state === 'suspended') ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch {}
  }

  function playExplosionSfx() {
    try {
      if (ac.state === 'suspended') ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.6);
      gain.gain.setValueAtTime(0.4, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.65);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.7);
    } catch {}
  }

  // Players Setup
  const oppList = (agents.length ? agents : FALLBACK).slice(0, 5);
  const players = [
    {
      id: 'me',
      name: me?.name || 'You',
      color: me?.color || '#ff9b38',
      isMe: true,
      x: W / 2,
      y: H / 2 + 100,
      vx: 0,
      vy: 0,
      alive: true,
      cooldown: 0,
      radius: 18,
    },
    ...oppList.map((a, i) => {
      const angle = (i / oppList.length) * TAU;
      return {
        id: 'bot_' + i,
        name: a.name,
        color: a.color || '#8cc8ff',
        isMe: false,
        x: W / 2 + Math.cos(angle) * 140,
        y: H / 2 + Math.sin(angle) * 110,
        vx: 0,
        vy: 0,
        alive: true,
        cooldown: 0,
        radius: 18,
        speed: 150 + Math.random() * 25,
      };
    }),
  ];

  // Match State
  let state = 'title'; // 'title' | 'countdown' | 'play' | 'gameover'
  let stateTimer = 0;
  let fuseTime = 12;
  let holderId = 'bot_0';
  let tagCooldown = 0;
  let arenaRadius = 210;
  let targetArenaRadius = 210;
  let eliminatedRankings = [];
  const particles = [];

  // Controls
  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };
  function onKey(e) {
    if (e.code in keys) keys[e.code] = e.type === 'keydown';
    if (e.code === 'Space' && (state === 'title' || state === 'gameover')) {
      startMatch();
    }
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  cv.addEventListener('click', (e) => {
    if (state === 'title' || state === 'gameover') {
      startMatch();
    }
  });

  function startMatch() {
    state = 'countdown';
    stateTimer = 3;
    arenaRadius = 210;
    targetArenaRadius = 210;
    fuseTime = 12;
    eliminatedRankings = [];
    players.forEach((p, idx) => {
      p.alive = true;
      p.cooldown = 0;
      const ang = (idx / players.length) * TAU;
      p.x = W / 2 + Math.cos(ang) * 130;
      p.y = H / 2 + Math.sin(ang) * 110;
    });
    // Pick random initial potato holder
    holderId = players[Math.floor(Math.random() * players.length)].id;
    playBeep(440, 0.15);
  }

  function triggerExplosion() {
    playExplosionSfx();
    const holder = players.find((p) => p.id === holderId);
    if (!holder) return;

    holder.alive = false;
    eliminatedRankings.unshift({ name: holder.name, isMe: holder.isMe, rank: players.filter((p) => p.alive).length + 1 });

    // Spawn 30 explosion blast particles
    for (let i = 0; i < 32; i++) {
      const ang = Math.random() * TAU;
      const spd = 60 + Math.random() * 180;
      particles.push({
        x: holder.x,
        y: holder.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: ['#ff3838', '#ff9f43', '#ffd166', '#ffffff'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 6,
        life: 0.8 + Math.random() * 0.4,
      });
    }

    targetArenaRadius = Math.max(90, arenaRadius - 32);

    const survivors = players.filter((p) => p.alive);
    if (survivors.length <= 1) {
      if (survivors[0]) eliminatedRankings.unshift({ name: survivors[0].name, isMe: survivors[0].isMe, rank: 1 });
      state = 'gameover';
      stateTimer = 0;
      playBeep(880, 0.4, 'triangle');
    } else {
      // Pick next holder from survivors
      const nextH = survivors[Math.floor(Math.random() * survivors.length)];
      holderId = nextH.id;
      fuseTime = 12;
      tagCooldown = 2.0;
      nextH.cooldown = 2.0;
    }
  }

  function step(dt) {
    // Arena shrinking
    if (arenaRadius > targetArenaRadius) {
      arenaRadius = Math.max(targetArenaRadius, arenaRadius - dt * 28);
    }

    // Cooldown countdown
    if (tagCooldown > 0) tagCooldown -= dt;
    players.forEach((p) => {
      if (p.cooldown > 0) p.cooldown -= dt;
    });

    if (state === 'countdown') {
      stateTimer -= dt;
      if (stateTimer <= 0) {
        state = 'play';
        playBeep(660, 0.25, 'triangle');
      }
      return;
    }

    if (state === 'play') {
      fuseTime -= dt;
      // Faster beep as fuse burns down
      if (Math.floor(fuseTime * 2) !== Math.floor((fuseTime + dt) * 2)) {
        playBeep(fuseTime < 3 ? 900 : 600, 0.05);
      }
      if (fuseTime <= 0) {
        triggerExplosion();
      }

      // Human Movement
      const meP = players.find((p) => p.isMe);
      if (meP && meP.alive) {
        let mx = 0, my = 0;
        if (keys.KeyW || keys.ArrowUp) my -= 1;
        if (keys.KeyS || keys.ArrowDown) my += 1;
        if (keys.KeyA || keys.ArrowLeft) mx -= 1;
        if (keys.KeyD || keys.ArrowRight) mx += 1;

        const len = Math.hypot(mx, my);
        if (len > 0) {
          meP.vx = (mx / len) * 190;
          meP.vy = (my / len) * 190;
        } else {
          meP.vx = meP.vy = 0;
        }

        meP.x += meP.vx * dt;
        meP.y += meP.vy * dt;

        // Clamp to arena
        const d = Math.hypot(meP.x - W / 2, meP.y - H / 2);
        if (d > arenaRadius - meP.radius) {
          const a = Math.atan2(meP.y - H / 2, meP.x - W / 2);
          meP.x = W / 2 + Math.cos(a) * (arenaRadius - meP.radius);
          meP.y = H / 2 + Math.sin(a) * (arenaRadius - meP.radius);
        }
      }

      // Bot AI
      const curHolder = players.find((p) => p.id === holderId);
      players.forEach((bot) => {
        if (bot.isMe || !bot.alive) return;
        const isHolder = bot.id === holderId;

        if (isHolder) {
          // Chase nearest active player without cooldown
          let near = null, nDist = Infinity;
          players.forEach((o) => {
            if (o.id === bot.id || !o.alive || o.cooldown > 0) return;
            const dist = Math.hypot(o.x - bot.x, o.y - bot.y);
            if (dist < nDist) { nDist = dist; near = o; }
          });
          if (near) {
            const dx = near.x - bot.x, dy = near.y - bot.y, dl = Math.hypot(dx, dy) || 1;
            bot.vx = (dx / dl) * bot.speed * 1.15;
            bot.vy = (dy / dl) * bot.speed * 1.15;
          }
        } else {
          // Flee from potato holder
          if (curHolder && curHolder.alive) {
            const dx = bot.x - curHolder.x, dy = bot.y - curHolder.y, dl = Math.hypot(dx, dy) || 1;
            bot.vx = (dx / dl) * bot.speed;
            bot.vy = (dy / dl) * bot.speed;
          }
        }

        bot.x += bot.vx * dt;
        bot.y += bot.vy * dt;

        // Clamp to arena
        const d = Math.hypot(bot.x - W / 2, bot.y - H / 2);
        if (d > arenaRadius - bot.radius) {
          const a = Math.atan2(bot.y - H / 2, bot.x - W / 2);
          bot.x = W / 2 + Math.cos(a) * (arenaRadius - bot.radius);
          bot.y = H / 2 + Math.sin(a) * (arenaRadius - bot.radius);
        }
      });

      // Proximity Tag Check (<36px)
      if (curHolder && curHolder.alive && tagCooldown <= 0) {
        for (const target of players) {
          if (target.id === curHolder.id || !target.alive || target.cooldown > 0) continue;
          const dist = Math.hypot(curHolder.x - target.x, curHolder.y - target.y);
          if (dist < 38) {
            curHolder.cooldown = 2.0;
            tagCooldown = 2.0;
            holderId = target.id;
            playBeep(750, 0.12, 'square');
            break;
          }
        }
      }
    }

    // Particles Update
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 1. Stadium Ground Grid
    ctx.fillStyle = '#120b24';
    ctx.fillRect(0, 0, W, H);

    // 2. Shrinking Safe Zone Boundary Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, arenaRadius, 0, TAU);
    ctx.fillStyle = '#1c1338';
    ctx.fill();
    ctx.strokeStyle = '#ff3838';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();

    // 3. Draw Players
    players.forEach((p) => {
      if (!p.alive) return;
      const isHolder = p.id === holderId;

      ctx.save();
      // Ground Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.radius * 0.8, p.radius, p.radius * 0.4, 0, 0, TAU);
      ctx.fill();

      // Holder Highlight Beam
      if (isHolder) {
        ctx.fillStyle = 'rgba(255, 56, 56, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, TAU);
        ctx.fill();
      }

      // Character Body
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isHolder ? '#ff3838' : '#ffffff';
      ctx.stroke();

      // Face Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x - 5, p.y - 3, 3.5, 0, TAU);
      ctx.arc(p.x + 5, p.y - 3, 3.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(p.x - 5, p.y - 3, 2, 0, TAU);
      ctx.arc(p.x + 5, p.y - 3, 2, 0, TAU);
      ctx.fill();

      // Floating Name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px ' + F;
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - p.radius - 8);

      // Potato / Bomb Prop on Holder
      if (isHolder) {
        ctx.fillStyle = '#935116';
        ctx.beginPath();
        ctx.arc(p.x + 14, p.y - 14, 10, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ticking Spark
        ctx.fillStyle = '#ff3838';
        ctx.fillRect(p.x + 18, p.y - 24, 4, 4);
      }

      // Anti-Tagback Cooldown Shield
      if (p.cooldown > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 6, 0, TAU);
        ctx.stroke();
      }

      ctx.restore();
    });

    // 4. Draw Particles
    particles.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
      ctx.fill();
    });

    // 5. Draw HUD & UI Overlays
    if (state === 'title') {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.75)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd166';
      ctx.font = '900 48px ' + F;
      ctx.textAlign = 'center';
      ctx.fillText('🔥 HOT POTATO', W / 2, H / 2 - 30);
      ctx.fillStyle = '#fff';
      ctx.font = '600 18px ' + F;
      ctx.fillText('Pass the bomb before it explodes! Last survivor wins.', W / 2, H / 2 + 16);
      ctx.fillStyle = '#ff9500';
      ctx.font = 'bold 22px ' + F;
      ctx.fillText('CLICK OR PRESS SPACE TO START', W / 2, H / 2 + 65);
    } else if (state === 'countdown') {
      ctx.fillStyle = '#ffd166';
      ctx.font = '900 72px ' + F;
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(stateTimer), W / 2, H / 2 + 20);
    } else if (state === 'play') {
      // Top Fuse HUD
      ctx.fillStyle = 'rgba(20, 15, 35, 0.9)';
      ctx.roundRect(W / 2 - 100, 14, 200, 42, 21);
      ctx.fill();
      ctx.strokeStyle = '#ff3838';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px ' + F;
      ctx.textAlign = 'center';
      ctx.fillText(`💣 FUSE: ${Math.max(0, fuseTime).toFixed(1)}s`, W / 2, 41);

      // Alive Count
      const aliveN = players.filter((p) => p.alive).length;
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px ' + F;
      ctx.textAlign = 'left';
      ctx.fillText(`👥 ${aliveN}/${players.length} Alive`, 24, 34);
    } else if (state === 'gameover') {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd166';
      ctx.font = '900 44px ' + F;
      ctx.textAlign = 'center';
      const winner = eliminatedRankings[0]?.name || 'Nobody';
      ctx.fillText(`👑 ${winner} WINS!`, W / 2, H / 2 - 40);

      ctx.fillStyle = '#fff';
      ctx.font = '600 16px ' + F;
      eliminatedRankings.slice(0, 4).forEach((r, idx) => {
        ctx.fillText(`#${r.rank} ${r.name}`, W / 2, H / 2 + 10 + idx * 24);
      });

      ctx.fillStyle = '#ff9500';
      ctx.font = 'bold 20px ' + F;
      ctx.fillText('CLICK TO PLAY AGAIN 🔥', W / 2, H / 2 + 130);
    }
  }

  let raf;
  let last = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
  }
  raf = requestAnimationFrame(loop);

  function close() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    try { ac.close(); } catch {}
    wrap.remove();
    if (onClose) onClose();
  }

  return { close };
}
