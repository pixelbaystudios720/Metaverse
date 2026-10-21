// Dock Fishing: a 90-second fishing contest on the harbor docks at dusk. Self-contained canvas minigame, no network,
// no assets. You and up to three bonded agents fish from the same dock; lower/raise your hook (↓/↑, W/S or drag),
// nudge it sideways (←/→), hook fish, dodge jellyfish and crabs, and tap to land the rare whale.
const FONT = 'Fredoka, system-ui, sans-serif';
const W = 480, H = 640, HORIZ = 150, PLANK = 170, SURF = 226, FLOOR = 606, TIME = 90;
// Painted art (games/art/fishing/); every piece falls back to the canvas drawing if it fails to load.
const ART_FILES = { bg: 'bg.jpg', small: 'minnow.png', puffer: 'puffer.png', coin: 'coinfish.png', whale: 'whale.png', jelly: 'jelly.png', crab: 'crab.png', boot: 'boot.png' };
const SPR = { small: [40, 20], puffer: [40, 40], coin: [50, 25], whale: [112, 56], boot: [34, 34], jelly: [46, 46], crab: [48, 36] };
const BG_DY = 45; // the 1024x1536 painting is drawn 480 wide, shifted down so the dock top (~17%) sits at PLANK and the waterline at SURF
const C = { bg: '#130e22', plum: '#1d1033', lav: '#9b7cf0', lav2: '#c9b6ff', gold: '#ffd166', gold2: '#f0b440', mint: '#3cff8f', mint2: '#7ad7c4', pink: '#ff8fb8', red: '#ff6b81', cream: '#fbf6ea', ink: '#1b1230' };
const KINDS = {
  small: { name: 'Minnow', r: 10, val: 1, spd: [55, 95], dep: [250, 470], reel: 270 },
  puffer: { name: 'Puffer', r: 14, val: 3, spd: [30, 50], dep: [290, 520], reel: 240 },
  coin: { name: 'Gold coinfish', r: 12, val: 5, spd: [75, 115], dep: [450, 574], reel: 250 },
  whale: { name: 'Whale', r: 34, val: 15, spd: [24, 32], dep: [410, 530], reel: 170 },
  boot: { name: 'Rug boot', r: 12, val: 0, spd: [16, 26], dep: [280, 560], reel: 80 },
};
const SMALL_COLS = ['#8cc8ff', '#7ad7c4', '#ff8fb8', '#c9a6ff', '#b8e07a', '#ffb38a'];
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#7ad7c4' }];
const SAY = {
  start: ['gm fish', 'gm', 'LFG', 'fish szn', 'gm gm'],
  idle: ['wen whale', 'patience...', 'fish r bullish', 'any bites?', 'gm fish', 'nice sunset'],
  small: ['easy', 'one more', 'smol but mine'], puffer: ['puffy!', 'nice one'], coin: ['shiny!!', 'gold get'],
  whaleOn: ['big one!', 'BIG ONE!'], whale: ['WHALE!!', 'LFG'], snap: ['it snapped', 'ngmi'],
  boot: ['rugged by a boot', 'a boot?? rugged'], jelly: ['tangled!!', 'jelly got me'], crab: ['crab rugged me', 'pinched!'],
  youWhale: ['no way', 'LFG!!', 'gg'], youCoin: ['nice one', 'shiny...'],
};
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (a) => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;

const shadeCache = new Map();
function shade(hex, t) { // t > 0 mixes toward white, t < 0 toward black
  const key = hex + t; let v = shadeCache.get(key); if (v) return v;
  let h = String(hex).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16); if (h.length !== 6 || Number.isNaN(n)) return hex;
  const to = t > 0 ? 255 : 0, k = Math.abs(t), m = (c) => Math.round(c + (to - c) * k);
  v = `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; shadeCache.set(key, v); return v;
}
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, s, x, y, size, col, { w = 700, align = 'center', stroke = 0, sc = 'rgba(14,8,30,.85)' } = {}) {
  c.font = `${w} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
  if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = sc; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}

// One blob helper for everyone: the player and the agents.
function drawBlob(c, x, y, r, color, { look = 0, lookY = 0, squash = 0, blink = false, mood = 'happy' } = {}) {
  const rx = r * (1 + squash), ry = r * (1 - squash);
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, ry * .95, rx * .85, r * .2, 0, 0, TAU); c.fill();
  c.fillStyle = shade(color, -.18); c.beginPath(); c.arc(-rx * .96, ry * .28, r * .27, 0, TAU); c.arc(rx * .96, ry * .28, r * .27, 0, TAU); c.fill();
  c.fillStyle = color; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
  c.fillStyle = shade(color, -.14); c.globalAlpha = .5; c.beginPath(); c.ellipse(0, ry * .45, rx * .8, ry * .45, 0, 0, Math.PI); c.fill(); c.globalAlpha = 1;
  c.fillStyle = shade(color, .45); c.beginPath(); c.ellipse(-rx * .38, -ry * .5, rx * .32, ry * .18, -.5, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(-rx * .5, -ry * .58, r * .07, 0, TAU); c.fill();
  const lx = look * r * .13, ly = lookY * r * .1, ey = -r * .1 + ly;
  for (const s of [-1, 1]) {
    const ex = s * r * .34 + lx;
    if (blink) { c.strokeStyle = C.ink; c.lineWidth = Math.max(1.5, r * .09); c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey, r * .14, .2, Math.PI - .2); c.stroke(); continue; }
    c.fillStyle = '#120a22'; c.beginPath(); c.ellipse(ex, ey, r * .18, r * .23, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - r * .06, ey - r * .08, r * .075, 0, TAU); c.fill();
    c.beginPath(); c.arc(ex + r * .05, ey + r * .07, r * .035, 0, TAU); c.fill();
  }
  c.fillStyle = 'rgba(255,143,184,.6)'; c.beginPath(); c.ellipse(-r * .6 + lx * .5, r * .18, r * .15, r * .09, 0, 0, TAU); c.ellipse(r * .6 + lx * .5, r * .18, r * .15, r * .09, 0, 0, TAU); c.fill();
  c.strokeStyle = C.ink; c.fillStyle = '#5a1630'; c.lineWidth = Math.max(1.4, r * .08); c.lineCap = 'round';
  const my = r * .2 + ly;
  if (mood === 'wow') { c.beginPath(); c.ellipse(lx * .6, my + r * .04, r * .09, r * .12, 0, 0, TAU); c.fill(); }
  else if (mood === 'sad') { c.beginPath(); c.arc(lx * .6, my + r * .16, r * .12, Math.PI + .5, -.5); c.stroke(); }
  else { c.beginPath(); c.arc(lx * .6, my - r * .03, r * .13, .35, Math.PI - .35); c.stroke(); }
  c.restore();
}

export function open({ me = { name: 'You', color: '#9b7cf0' }, agents = [], onClose = () => {} } = {}) {
  if (typeof me === 'string') me = { name: me };
  const pool = (Array.isArray(agents) && agents.length ? agents : FALLBACK).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const rivals = pool.slice(0, 3).map((a, i) => ({ name: String((a && a.name) || 'AGENT').toUpperCase().slice(0, 10), color: (a && a.color) || FALLBACK[i % 3].color, img: (a && a.img) || null }));

  // ---------- DOM shell ----------
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(12,8,28,.82);font-family:Fredoka,system-ui,sans-serif';
  wrap.innerHTML = `<div style="position:relative;width:min(560px,calc(100vw - 24px),calc((100vh - 24px) * .75));aspect-ratio:3/4;max-height:calc(100vh - 24px);border-radius:22px;overflow:hidden;background:#130e22;box-shadow:0 0 0 3px #9b7cf0,0 0 0 8px rgba(155,124,240,.18),0 30px 80px rgba(0,0,0,.6)">
    <canvas style="display:block;width:100%;height:100%;touch-action:none;cursor:pointer"></canvas>
    <button data-k="mute" aria-label="Toggle sound" style="position:absolute;right:58px;top:12px;width:40px;height:40px;border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;font:600 17px/1 Fredoka,system-ui;cursor:pointer;box-shadow:0 0 0 1.5px rgba(155,124,240,.6)"></button>
    <button data-k="close" aria-label="Close Dock Fishing" style="position:absolute;right:12px;top:12px;width:40px;height:40px;border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;font:700 24px/1 Fredoka,system-ui;cursor:pointer;box-shadow:0 0 0 1.5px rgba(155,124,240,.6)">×</button></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), c = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; c.scale(dpr, dpr);
  const muteBtn = wrap.querySelector('[data-k=mute]');
  let muted = false; try { muted = localStorage.getItem('aa.games.mute') === '1'; } catch {}
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; }; paintMute();

  // ---------- sound (tiny synth) ----------
  let ac = null, noiseBuf = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } } if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }
  function tone(f, d, type = 'sine', v = .1, f2 = 0, delay = 0) {
    if (muted || !ac) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .03);
  }
  function noise(d, v, freq) {
    if (muted || !ac) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * .4, t + d); f.Q.value = .8;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + d + .02);
  }
  const sfx = {
    plip: () => tone(520, .09, 'sine', .14, 1100),
    splash: (v = 1) => { noise(.32, .22 * v, 1500); tone(220, .12, 'sine', .06 * v, 90); },
    ding: (v = 1) => { tone(988, .14, 'triangle', .12 * v); tone(1480, .26, 'triangle', .1 * v, 0, .07); },
    coin: () => { tone(1046, .1, 'square', .05); tone(1318, .1, 'square', .05, 0, .07); tone(1760, .3, 'triangle', .09, 0, .14); },
    thud: () => { tone(150, .28, 'sine', .3, 45); noise(.18, .14, 500); },
    tangle: () => tone(340, .35, 'sawtooth', .045, 110),
    tap: (p) => tone(260 + p * 520, .05, 'square', .04),
    tick: () => tone(1250, .035, 'square', .03),
    soft: () => tone(780, .08, 'triangle', .035),
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .22, 'triangle', .11, 0, i * .1)),
    lose: () => [523, 440, 392].forEach((f, i) => tone(f, .22, 'triangle', .08, 0, i * .13)),
    go: () => { tone(660, .1, 'triangle', .1); tone(990, .2, 'triangle', .1, 0, .1); },
  };

  // ---------- static layers ----------
  function layer(fn) { const k = document.createElement('canvas'); k.width = W * dpr; k.height = H * dpr; const g = k.getContext('2d'); g.scale(dpr, dpr); fn(g); return k; }
  const bgBack = layer((g) => {
    let gr = g.createLinearGradient(0, 0, 0, HORIZ);
    gr.addColorStop(0, '#130e22'); gr.addColorStop(.35, '#2a1446'); gr.addColorStop(.66, '#5b2a63'); gr.addColorStop(.88, '#c45a78'); gr.addColorStop(1, '#ff9f7a');
    g.fillStyle = gr; g.fillRect(0, 0, W, HORIZ);
    gr = g.createRadialGradient(352, HORIZ, 4, 352, HORIZ, 150); gr.addColorStop(0, 'rgba(255,200,130,.7)'); gr.addColorStop(1, 'rgba(255,160,120,0)');
    g.fillStyle = gr; g.fillRect(150, 20, 330, HORIZ - 20);
    g.fillStyle = '#ffd59a'; g.beginPath(); g.arc(352, HORIZ, 24, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(255,170,200,.16)'; for (const [cx, cy, w] of [[90, 120, 110], [300, 104, 140], [430, 132, 90], [200, 150, 120]]) { g.beginPath(); g.ellipse(cx, cy, w, 5, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#26123c'; let bx = 0;
    while (bx < 200) { const bw = rnd(14, 26), bh = rnd(10, 44) * (1 - bx / 260); g.fillRect(bx, HORIZ - bh, bw, bh); for (let wy = HORIZ - bh + 4; wy < HORIZ - 4; wy += 6) for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) if (Math.random() < .3) { g.fillStyle = 'rgba(255,209,102,.7)'; g.fillRect(wx, wy, 2, 2); g.fillStyle = '#26123c'; } bx += bw + rnd(0, 3); }
    gr = g.createLinearGradient(0, HORIZ, 0, SURF); gr.addColorStop(0, '#4a2f6e'); gr.addColorStop(1, '#2f4f8f'); g.fillStyle = gr; g.fillRect(0, HORIZ, W, SURF - HORIZ);
    for (let i = 0; i < 14; i++) { const yy = HORIZ + 2 + i * 3.4, ww = 50 - i * 2.4; g.fillStyle = `rgba(255,200,130,${.5 - i * .03})`; g.fillRect(352 - ww / 2 + rnd(-6, 6), yy, ww, 1.6); }
    gr = g.createLinearGradient(0, SURF, 0, FLOOR);
    gr.addColorStop(0, '#2f6fb0'); gr.addColorStop(.22, '#25528f'); gr.addColorStop(.55, '#1c356f'); gr.addColorStop(.82, '#16204d'); gr.addColorStop(1, '#120f30');
    g.fillStyle = gr; g.fillRect(0, SURF, W, FLOOR - SURF + 10);
    g.setLineDash([3, 7]); g.strokeStyle = 'rgba(201,182,255,.09)'; g.lineWidth = 1;
    for (const yy of [340, 440]) { g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    g.setLineDash([]);
    for (const [s, yy] of [['SHALLOWS', 248], ['MIDWATER', 352], ['THE DEEP', 452]]) txt(g, s, W - 12, yy, 10, 'rgba(201,182,255,.32)', { align: 'right', w: 600 });
    gr = g.createLinearGradient(0, FLOOR - 8, 0, H); gr.addColorStop(0, '#5b4a72'); gr.addColorStop(1, '#2a1f42'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, H); for (let xx = 0; xx <= W; xx += 16) g.lineTo(xx, FLOOR - 2 + Math.sin(xx * .05) * 3); g.lineTo(W, H); g.fill();
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(${pick(['201,182,255', '255,209,102', '255,143,184'])},${rnd(.12, .3)})`; g.beginPath(); g.ellipse(rnd(0, W), rnd(FLOOR + 6, H - 4), rnd(1.5, 4), rnd(1, 2.5), 0, 0, TAU); g.fill(); }
    for (const [rx, rw] of [[70, 34], [250, 26], [430, 40]]) { g.fillStyle = '#3c3156'; g.beginPath(); g.ellipse(rx, FLOOR + 4, rw, 14, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.ellipse(rx - rw * .3, FLOOR - 4, rw * .35, 4, 0, 0, TAU); g.fill(); }
    for (const cx of [150, 340]) { g.strokeStyle = '#ff8fb8'; g.globalAlpha = .55; g.lineWidth = 4; g.lineCap = 'round'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx, FLOOR + 2); g.quadraticCurveTo(cx + k * 6, FLOOR - 10, cx + k * 9, FLOOR - 18 - Math.abs(k) * -3); g.stroke(); } g.globalAlpha = 1; }
  });
  const bgDock = layer((g) => {
    for (let px = 6; px < W; px += 118) {
      g.fillStyle = '#4b2f4a'; g.fillRect(px, PLANK + 10, 12, 320 - PLANK);
      g.fillStyle = 'rgba(18,30,80,.5)'; g.fillRect(px, SURF, 12, 320 - SURF + 12);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px + 2, PLANK + 10, 3, 320 - PLANK);
      g.fillStyle = 'rgba(122,215,196,.35)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(px + rnd(1, 11), rnd(SURF + 10, 325), rnd(1.5, 3), 0, TAU); g.fill(); }
      g.fillStyle = '#4b2f4a'; g.beginPath(); g.ellipse(px + 6, 332, 6, 3, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#6b4250'; g.fillRect(0, PLANK + 10, W, 8);
    g.fillStyle = '#9a6450'; g.fillRect(0, PLANK, W, 12); g.fillStyle = '#c08a62'; g.fillRect(0, PLANK, W, 3);
    g.fillStyle = 'rgba(40,20,40,.45)'; for (let px = 0; px < W; px += 38) g.fillRect(px, PLANK, 2, 18);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, PLANK + 18, W, 3);
    for (const lx of [122, 358]) {
      const gr = g.createRadialGradient(lx, 118, 2, lx, 118, 64); gr.addColorStop(0, 'rgba(255,214,150,.45)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = gr; g.fillRect(lx - 64, 54, 128, 128);
      g.fillStyle = '#331f40'; g.fillRect(lx - 2, 118, 4, PLANK - 118); g.fillRect(lx - 7, PLANK - 4, 14, 4);
      g.fillStyle = '#ffe2a8'; rr(g, lx - 6, 108, 12, 13, 4); g.fill(); g.fillStyle = '#331f40'; g.fillRect(lx - 8, 104, 16, 5);
    }
  });

  // ---------- world ----------
  const stars = Array.from({ length: 38 }, () => ({ x: rnd(0, W), y: rnd(4, 120), p: rnd(0, 6), s: rnd(1, 2.2) }));
  const weeds = Array.from({ length: 11 }, (_, i) => ({ x: 14 + i * 44 + rnd(-10, 10), h: rnd(40, 90), p: rnd(0, 6), col: pick(['#2f8f7a', '#3aa58a', '#27766a', '#4bb39a']) }));
  const amb = Array.from({ length: 22 }, () => ({ x: rnd(0, W), y: rnd(SURF, FLOOR), r: rnd(1.5, 4), s: rnd(18, 40), p: rnd(0, 6) }));
  const P = Array.from({ length: 380 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, l: 0, m: 1, r: 2, col: '#fff', k: 0, g: 0 }));
  let pi = 0;
  function emit(x, y, n, { col = '#fff', spd = 120, up = 0, life = .7, r = 2.5, k = 0, g = 260, spread = TAU, dir = -Math.PI / 2 } = {}) {
    for (let i = 0; i < n; i++) {
      const p = P[pi]; pi = (pi + 1) % P.length; const a = dir + (Math.random() - .5) * spread, s = spd * rnd(.4, 1);
      p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - up; p.l = p.m = life * rnd(.7, 1.2); p.r = r * rnd(.6, 1.3);
      p.col = Array.isArray(col) ? pick(col) : col; p.k = k; p.g = g;
    }
  }
  let fishes = [], jellies = [], crabs = [], flyers = [], pops = [], banner = null;
  let T = 0, spawnT = 0, whaleT = 14, timeLeft = TIME, state = 'loading', endT = 0, shake = 0, ferryX = rnd(-60, 300), lastTick = 99;
  let best = 0; try { best = Number(localStorage.getItem('aa.fishing.best')) || 0; } catch {}
  let newBest = false, results = null, bestCatch = null, btns = [];

  function spawnFish(kind, xin) {
    const K = KINDS[kind], dirR = Math.random() < .5, vx = rnd(K.spd[0], K.spd[1]) * (dirR ? 1 : -1), y = rnd(K.dep[0], K.dep[1]);
    fishes.push({ kind, x: xin ?? (dirR ? -50 : W + 50), y, by: y, vx, r: K.r, val: K.val, p: rnd(0, 6), col: kind === 'small' ? pick(SMALL_COLS) : kind === 'puffer' ? pick(['#ffd18a', '#ffb3c9', '#b6f0a0']) : null, hooked: false, dead: false, sp: 0, v: (Math.random() * 4) | 0 });
  }
  function seedWorld() {
    fishes = []; jellies = []; crabs = [];
    for (let i = 0; i < 8; i++) spawnFish(Math.random() < .6 ? 'small' : Math.random() < .6 ? 'puffer' : 'coin', rnd(20, W - 20));
    for (let i = 0; i < 3; i++) jellies.push({ x: rnd(40, W - 40), by: rnd(290, 500), y: 0, vx: rnd(10, 20) * (Math.random() < .5 ? -1 : 1), p: rnd(0, 6), r: 15 });
    for (let i = 0; i < 2; i++) crabs.push({ x: rnd(60, W - 60), dir: Math.random() < .5 ? -1 : 1, spd: rnd(22, 38), p: rnd(0, 6), wait: 0 });
  }

  // fishers: you + agents spread along the dock
  const n = rivals.length + 1, youIdx = Math.floor((n - 1) / 2), skills = [.55, .68, .8].sort(() => Math.random() - .5);
  const fishers = [];
  for (let i = 0, a = 0; i < n; i++) {
    const you = i === youIdx, info = you ? { name: 'YOU', color: (me && me.color) || C.lav, img: (me && me.img) || null } : rivals[a];
    fishers.push({ ...info, you, skill: you ? 1 : skills[a++ % 3], x: n === 1 ? W / 2 : 64 + i * (W - 128) / (n - 1), score: 0, count: 0, pop: 0, bounce: 0, mood: 'happy', moodT: 0, blinkT: rnd(1, 4), emote: null, ecd: 0, chat: rnd(6, 12), think: 0, rowY: 0, hook: null, sprite: null });
  }
  const you = fishers[youIdx];
  function resetHooks() { for (const f of fishers) f.hook = { x: f.x + 30, y: SURF + 50, ty: SURF + rnd(50, 120), toff: 0, state: 'free', carry: null, t: 0 }; }
  resetHooks(); seedWorld();
  const ART = {}; let bgArt = null, loadN = 0; const loadTotal = Object.keys(ART_FILES).length + fishers.filter((f) => f.img).length;
  const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im)); im.onerror = () => res(null); im.src = src; });
  function handOf(im) { // where the character's right side is at arm height, as a fraction of the frame (0.5 = centre)
    try {
      const k = document.createElement('canvas'); k.width = 64; k.height = 64; const g = k.getContext('2d'); g.drawImage(im, 0, 0, 64, 64);
      const d = g.getImageData(0, 0, 64, 64).data; let right = 0;
      for (let y = 34; y < 46; y++) for (let x = 63; x > right; x--) if (d[(y * 64 + x) * 4 + 3] > 60) { right = x; break; }
      return right ? clamp(right / 64 - .04, .58, .9) : .72;
    } catch { return .72; }
  }
  function buildArt() {
    if (ART.bg) bgArt = layer((g) => {
      g.drawImage(ART.bg, 0, 0, 1024, 6, 0, 0, W, BG_DY + 2); // stretch the top of the sky up into the gap
      g.drawImage(ART.bg, 0, BG_DY, W, W * 1.5);
      const gr = g.createLinearGradient(0, 0, 0, 130); gr.addColorStop(0, 'rgba(19,14,34,.55)'); gr.addColorStop(1, 'rgba(19,14,34,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 130);
      const gb = g.createLinearGradient(0, 300, 0, H); gb.addColorStop(0, 'rgba(14,10,40,0)'); gb.addColorStop(1, 'rgba(14,10,40,.25)'); g.fillStyle = gb; g.fillRect(0, 300, W, H - 300);
    });
    if (ART.small) { // a few tinted minnows so the school is not all one colour
      ART.smallVar = [0, 130, 230, 300].map((deg) => { const k = document.createElement('canvas'); k.width = ART.small.width; k.height = ART.small.height; const g = k.getContext('2d'); if (deg && 'filter' in g) g.filter = `hue-rotate(${deg}deg) saturate(1.1)`; g.drawImage(ART.small, 0, 0); return k; });
    }
  }
  const loads = Object.entries(ART_FILES).map(([k, f]) => loadImg(new URL(`./art/fishing/${f}`, import.meta.url).href).then((im) => { ART[k] = im; loadN++; }));
  for (const f of fishers) if (f.img) loads.push(loadImg(f.img).then((im) => { f.sprite = im; f.hand = handOf(im); loadN++; }));
  const ready = () => { if (closed) return; buildArt(); if (state === 'loading') state = 'title'; };
  Promise.all(loads).then(ready); setTimeout(() => { if (state === 'loading') ready(); }, 8000);
  let tug = null; const keys = new Set(); let drag = null;

  function emote(f, list, force = false) { if (f.you || (!force && f.ecd > 0)) return; f.emote = { s: pick(list), t: 2.4 }; f.ecd = 2.6; }
  const bucketX = (f) => f.x - (f.sprite ? 37 : 27);
  function pop(x, y, s, col, size = 20) { pops.push({ x, y, s, col, size, t: 0 }); }
  const rodTip = (f) => ({ x: f.x + (f.sprite ? ((f.hand || .72) - .5) * 66 + 18 : 36), y: PLANK - 68 + (f.hook && f.hook.carry ? 6 : 0) });

  function start() {
    audio(); resetHooks(); seedWorld();
    for (const f of fishers) { f.score = 0; f.count = 0; f.emote = null; f.ecd = 0; f.think = rnd(0, .4); f.chat = rnd(6, 12); }
    flyers = []; pops = []; tug = null; timeLeft = TIME; T = 0; whaleT = rnd(10, 18); newBest = false; results = null; bestCatch = null; lastTick = 99;
    state = 'play'; banner = { s: 'GO!', t: 0, col: C.mint }; sfx.go();
    fishers.forEach((f, i) => { if (!f.you && Math.random() < .8) setTimeout(() => emote(f, SAY.start, true), 300 + i * 450); });
  }
  function finish() {
    state = 'end'; endT = 1.7; banner = { s: "Time's up!", t: 0, col: C.gold };
    for (const f of fishers) { if (f.hook.carry) { release(f.hook.carry); f.hook.carry = null; } f.hook.state = 'free'; }
    tug = null; const inAir = flyers; flyers = []; for (const fl of inAir) arrive(fl); // fish already in the air still count
    const order = fishers.slice().sort((a, b) => b.score - a.score || (a.you ? -1 : b.you ? 1 : 0));
    const rank = 1 + fishers.filter((f) => !f.you && f.score > you.score).length;
    if (you.score > best) { best = you.score; newBest = you.score > 0; try { localStorage.setItem('aa.fishing.best', String(best)); } catch {} }
    results = { order, rank, won: rank === 1, score: you.score };
    setTimeout(() => { if (results) (results.won ? sfx.win : sfx.lose)(); }, 900);
    for (const f of fishers) if (!f.you) emote(f, f === order[0] ? ['too easy', 'gg', 'LFG'] : ['gg', 'next time', 'gm fish'], true);
  }

  // ---------- hook logic ----------
  function release(k) { k.hooked = false; k.by = k.y; if (k.kind !== 'boot') { k.vx = (Math.random() < .5 ? -1 : 1) * Math.max(130, Math.abs(k.vx) * 2.2); } }
  function hookFish(f, k) {
    const h = f.hook; k.hooked = true; h.carry = k;
    emit(h.x, h.y, 8, { col: 'rgba(220,240,255,.8)', spd: 60, life: .6, r: 2.5, g: -40 });
    if (k.kind === 'whale') {
      h.state = 'tug';
      if (f.you) { tug = { T: .5, prog: 0, low: 0, kick: .8 }; banner = { s: 'WHALE ON!', t: 0, col: C.pink }; sfx.thud(); shake = 6; for (const o of fishers) if (!o.you) emote(o, ['no way', 'big one!!'], true); }
      else { h.t = rnd(2.2, 3.2); emote(f, SAY.whaleOn, true); }
    } else {
      h.state = 'reel';
      if (f.you) { sfx.plip(); if (k.kind === 'boot') pop(h.x, h.y - 18, 'a boot...', '#b9b0cc', 15); }
      else if (k.kind === 'boot') emote(f, SAY.boot, true);
    }
  }
  function snag(f, why) {
    const h = f.hook; if (h.carry) { release(h.carry); h.carry = null; }
    h.state = 'tangle'; h.t = why === 'snap' ? 1.1 : 1.5;
    emit(h.x, h.y, 12, { col: [C.pink, C.lav2, '#fff'], spd: 110, life: .6, r: 2.5, g: 60 });
    if (f.you) { shake = 9; sfx.thud(); sfx.tangle(); f.mood = 'sad'; f.moodT = 1.4; tug = null; pop(h.x, h.y - 20, why === 'snap' ? 'SNAP!' : why === 'crab' ? 'crab snag!' : 'tangled!', C.red, 20); }
    else emote(f, SAY[why] || SAY.jelly, true);
  }
  function land(f) {
    const h = f.hook, k = h.carry; h.carry = null; h.state = 'free'; k.dead = true;
    emit(h.x, SURF, 18, { col: ['#e6f4ff', '#9fd0ff', '#ffffff'], spd: 190, life: .8, r: 3, g: 420, spread: 1.6 });
    emit(h.x, SURF, 6, { col: 'rgba(255,255,255,.6)', spd: 70, life: .5, r: 5, g: 0, spread: .6, dir: 0 });
    sfx.splash(f.you ? 1 : .35);
    const boot = k.kind === 'boot';
    flyers.push({ f, k, x0: h.x, y0: SURF, x1: boot ? h.x + (h.x < W / 2 ? 60 : -60) : bucketX(f), y1: boot ? SURF + 4 : PLANK - 6, t: 0, dur: boot ? .7 : .55 + k.r * .006, spin: rnd(-1, 1) });
    h.y = SURF + 4;
    if (!f.you) { h.ty = SURF + 16; f.think = rnd(.9, 1.6) + (1 - f.skill) * 1.2; } // re-baiting
  }
  function arrive(fl) {
    const { f, k } = fl;
    if (k.kind === 'boot') {
      emit(fl.x1, SURF, 10, { col: ['#e6f4ff', '#9fd0ff'], spd: 140, life: .6, r: 2.5, g: 400, spread: 1.4 });
      if (f.you) { pop(fl.x1, SURF - 30, 'rugged!', '#b9b0cc', 18); sfx.thud(); f.mood = 'sad'; f.moodT = 1.2; }
      return;
    }
    f.score += k.val; f.count++; f.pop = 1; f.bounce = 1; f.mood = k.val >= 5 ? 'wow' : 'happy'; f.moodT = 1.2;
    const big = k.val >= 5;
    pop(fl.x1, fl.y1 - 26, `+${k.val}`, big ? C.gold : '#fff', big ? 26 : 20);
    emit(fl.x1, fl.y1 - 6, big ? 18 : 8, { col: big ? [C.gold, C.gold2, '#fff'] : [C.lav2, '#fff', C.mint2], spd: big ? 170 : 110, life: .8, r: big ? 3.2 : 2.4, k: big ? 1 : 2, g: 300, spread: 1.8 });
    if (f.you) {
      if (big) sfx.coin(); else sfx.ding();
      if (k.kind === 'whale') { shake = 12; banner = { s: 'WHALE! +15', t: 0, col: C.gold }; emit(W / 2, 260, 40, { col: [C.gold, C.pink, C.mint, C.lav2], spd: 260, life: 1.2, r: 3.5, k: 1, g: 260 }); }
      if (!bestCatch || k.val > bestCatch.val) bestCatch = { name: KINDS[k.kind].name, val: k.val };
      for (const o of fishers) if (!o.you && Math.random() < (k.kind === 'whale' ? 1 : k.kind === 'coin' ? .35 : 0)) emote(o, k.kind === 'whale' ? SAY.youWhale : SAY.youCoin, k.kind === 'whale');
    } else {
      sfx.soft();
      if (Math.random() < (k.kind === 'small' ? .25 : .85)) emote(f, SAY[k.kind] || SAY.small, k.kind === 'whale');
    }
  }
  function segD2(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1), ex = ax + dx * t - px, ey = ay + dy * t - py; return ex * ex + ey * ey; }
  function collide(f) {
    const h = f.hook;
    for (const j of jellies) { const dx = j.x - h.x, dy = j.y - h.y; if (dx * dx + dy * dy < (j.r + 5) ** 2) return snag(f, 'jelly'); }
    if (h.y > FLOOR - 24) for (const cr of crabs) if (Math.abs(cr.x - h.x) < 22) return snag(f, 'crab');
    for (const k of fishes) { if (k.hooked || k.dead) continue; const dx = k.x - h.x, dy = k.y - h.y, rr2 = k.r + 7; if (dx * dx + dy * dy < rr2 * rr2) return hookFish(f, k); }
  }
  function playerInput(f, dt) {
    const h = f.hook, home = f.x + 30;
    const vy = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    const vx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    if (vy) h.ty = clamp((h.state === 'free' ? h.y : h.ty) + vy * 340 * dt * (h.state === 'free' ? 1.15 : 1), SURF + 12, FLOOR - 4);
    if (vx) h.toff = clamp(h.toff + vx * 140 * dt, -62, 62);
    if (drag) { h.ty = clamp(drag.y, SURF + 12, FLOOR - 4); h.toff = clamp(drag.x - home, -62, 62); }
  }
  function agentThink(f, dt) {
    const h = f.hook, home = f.x + 30;
    if (h.state === 'reel') { for (const j of jellies) if (j.y < h.y && Math.abs(j.x - h.x) < 34 && Math.random() < f.skill * dt * 5) h.toff = clamp(h.toff + (j.x < h.x ? 34 : -34), -62, 62); return; }
    if (h.state !== 'free') return;
    if ((f.chat -= dt) < 0) { f.chat = rnd(9, 16); if (Math.random() < .5) emote(f, SAY.idle); }
    if ((f.think -= dt) > 0) return;
    f.think = rnd(.35, .6) + (1 - f.skill) * .7;
    for (const j of jellies) if (Math.abs(j.x - h.x) < 46 && Math.abs(j.y - h.y) < 70 && Math.random() < f.skill) {
      h.ty = clamp(j.y + (h.y < j.y ? -85 : 85), SURF + 20, FLOOR - 12); h.toff = clamp(h.toff + (h.x < j.x ? -40 : 40), -62, 62); return;
    }
    let bestK = null, bs = 0, bpx = 0; const sp = 150 + 80 * f.skill;
    for (const k of fishes) {
      if (k.hooked || k.dead || k.kind === 'boot') continue;
      const dy = Math.abs(k.y - h.y), tr = dy / sp + .25, px = k.x + k.vx * tr, dx = Math.abs(px - home);
      if (dx > 72) continue;
      const s = (k.val + .6) / (1 + dy / 170 + dx / 60) * rnd(.7, 1.3);
      if (s > bs) { bs = s; bestK = k; bpx = px; }
    }
    const err = 10 + (1 - f.skill) * 50;
    if (bestK) { h.ty = clamp(bestK.y + rnd(-err, err), SURF + 14, FLOOR - 8); h.toff = clamp(bpx - home + rnd(-err, err), -62, 62); }
    else { h.ty = clamp(h.ty + rnd(-70, 70), SURF + 40, 540); h.toff = clamp(h.toff + rnd(-25, 25), -50, 50); }
  }
  function tugTap() { if (!tug) return; tug.T += .13; sfx.tap(clamp(tug.T, 0, 1)); you.bounce = .6; emit(you.hook.x, you.hook.y, 3, { col: '#fff', spd: 60, life: .4, r: 2, g: -30 }); }
  function updateFisher(f, dt) {
    const h = f.hook, home = f.x + 30;
    if (f.you) playerInput(f, dt); else agentThink(f, dt);
    h.x += (clamp(home + h.toff, 14, W - 14) - h.x) * Math.min(1, dt * 7);
    if (h.state === 'free') {
      const sp = f.you ? 360 : 150 + 80 * f.skill, d = h.ty - h.y; h.y += clamp(d, -sp * dt, sp * dt);
      if (h.y > SURF + 4) collide(f);
    } else if (h.state === 'reel') {
      const k = h.carry; h.y -= KINDS[k.kind].reel * dt; k.x = h.x + Math.sin(T * 22) * 2; k.y = h.y + k.r * .75 + 4;
      const tp = rodTip(f);
      for (const j of jellies) if (j.y > SURF && segD2(j.x, j.y, tp.x, tp.y, h.x, h.y) < (j.r - 1) ** 2) return snag(f, 'jelly');
      if (h.y <= SURF - 4) land(f);
    } else if (h.state === 'tug') {
      const k = h.carry; k.x = h.x + Math.sin(T * 17) * 4; k.y = h.y + k.r * .6 + 4; h.y += Math.sin(T * 3.3) * 14 * dt;
      if (f.you && tug) {
        tug.T -= dt * (.34 + .14 * Math.sin(T * 2.3));
        if ((tug.kick -= dt) <= 0) { tug.kick = rnd(.5, 1.2); tug.T += rnd(-.13, .15); }
        const green = tug.T > .38 && tug.T < .72; tug.prog = clamp(tug.prog + (green ? dt * .38 : -dt * .12), 0, 1);
        if (tug.T >= 1) return snag(f, 'snap');
        if (tug.T <= 0) { tug.T = 0; if ((tug.low += dt) > 1.3) { pop(h.x, h.y - 30, 'it got away', '#b9b0cc', 18); release(k); h.carry = null; h.state = 'free'; tug = null; sfx.lose(); return; } } else tug.low = 0;
        if (tug.prog >= 1) { h.state = 'reel'; tug = null; pop(h.x, h.y - 40, 'REEL IT!', C.mint, 22); sfx.go(); }
      } else if (!f.you && (h.t -= dt) <= 0) { if (Math.random() < .3 + .45 * f.skill) h.state = 'reel'; else snag(f, 'snap'); }
    } else if (h.state === 'tangle') { h.t -= dt; h.y += (SURF + 34 - h.y) * Math.min(1, dt * 3); if (h.t <= 0) h.state = 'free'; }
  }

  function step(dt) {
    T += dt; ferryX += dt * 9; if (ferryX > W + 90) ferryX = -90;
    for (const b of amb) { b.y -= b.s * dt; b.x += Math.sin(T * 2 + b.p) * 8 * dt; if (b.y < SURF + 4) { b.y = FLOOR - rnd(0, 20); b.x = rnd(0, W); } }
    // fish, jellies, crabs
    if (state !== 'results') {
      if ((spawnT -= dt) <= 0) {
        spawnT = rnd(.45, .8); const live = fishes.filter((k) => k.kind !== 'whale').length;
        if (live < 11) { const r = Math.random(), boots = fishes.filter((k) => k.kind === 'boot').length; spawnFish(r < .55 ? 'small' : r < .76 ? 'puffer' : r < .9 ? 'coin' : boots < 2 ? 'boot' : 'small'); }
      }
      if (state === 'play' && (whaleT -= dt) <= 0) { whaleT = rnd(16, 26); if (!fishes.some((k) => k.kind === 'whale' && !k.dead)) spawnFish('whale'); }
    }
    for (let i = fishes.length - 1; i >= 0; i--) {
      const k = fishes[i];
      if (k.dead || (!k.hooked && (k.x < -90 || k.x > W + 90))) { fishes.splice(i, 1); continue; }
      if (k.hooked) continue;
      k.x += k.vx * dt; k.y = k.by + Math.sin(T * (k.kind === 'boot' ? 1 : 2.2) + k.p) * (k.kind === 'whale' ? 10 : 6);
      if (k.kind === 'coin' && Math.random() < dt * 3) emit(k.x + rnd(-8, 8), k.y + rnd(-6, 6), 1, { col: '#fff3c4', spd: 10, life: .5, r: 2.2, k: 2, g: 0 });
    }
    for (const j of jellies) { j.x += j.vx * dt; j.y = j.by + Math.sin(T * .9 + j.p) * 26; if (j.x < -30 || j.x > W + 30) { j.vx = -j.vx; j.by = rnd(290, 500); j.x = clamp(j.x, -29, W + 29); } }
    for (const cr of crabs) {
      if (cr.wait > 0) { cr.wait -= dt; continue; }
      cr.x += cr.dir * cr.spd * dt; if (cr.x < 24 || cr.x > W - 24) cr.dir *= -1;
      if (Math.random() < dt * .35) { cr.wait = rnd(.4, 1.4); if (Math.random() < .5) cr.dir *= -1; }
    }
    if (state === 'play') {
      timeLeft -= dt;
      for (const f of fishers) updateFisher(f, dt);
      const s = Math.ceil(timeLeft); if (s <= 10 && s < lastTick && s > 0) { lastTick = s; sfx.tick(); }
      if (timeLeft <= 0) { timeLeft = 0; finish(); }
    } else if (state === 'end' && (endT -= dt) <= 0) state = 'results';
    for (let i = flyers.length - 1; i >= 0; i--) { const fl = flyers[i]; fl.t += dt / fl.dur; if (fl.t >= 1) { flyers.splice(i, 1); arrive(fl); } }
    for (const f of fishers) {
      f.pop = Math.max(0, f.pop - dt * 3); f.bounce = Math.max(0, f.bounce - dt * 2.5); f.ecd -= dt;
      if (f.emote && (f.emote.t -= dt) <= 0) f.emote = null;
      if ((f.moodT -= dt) <= 0) f.mood = f.hook.state === 'tug' ? 'wow' : 'happy';
      if ((f.blinkT -= dt) < -.12) f.blinkT = rnd(2, 5);
    }
    for (const p of P) { if (!p.on) continue; p.l -= dt; if (p.l <= 0) { p.on = false; continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].t += dt) > 1.1) pops.splice(i, 1);
    if (banner && (banner.t += dt) > 1.4) banner = null;
    shake = Math.max(0, shake - dt * 30);
  }

  // ---------- drawing ----------
  function drawFish(k) {
    const K = k.kind, r = k.r, d = k.vx < 0 ? -1 : 1, w = Math.sin(T * (k.hooked ? 24 : 8) + k.p);
    c.save(); c.translate(k.x, k.y); if (k.hooked) c.rotate(-Math.PI / 2 * d * .7); c.scale(d, 1);
    if (K === 'jelly') return c.restore();
    const im = K === 'small' ? (ART.smallVar ? ART.smallVar[k.v || 0] : ART.small) : ART[K];
    if (im) {
      const [sw, sh] = SPR[K], wob = Math.sin(T * (k.hooked ? 22 : K === 'whale' ? 3 : 7) + k.p);
      if (K === 'boot') c.rotate(Math.sin(T * 1.2 + k.p) * .25);
      else if (K === 'puffer') { const pf = 1 + Math.sin(T * 3 + k.p) * .07; c.rotate(wob * .06); c.scale(pf, pf); }
      else { c.rotate(wob * (K === 'whale' ? .04 : .08)); c.scale(1 + wob * .04, 1 - wob * .04); }
      c.drawImage(im, -sw / 2, -sh / 2, sw, sh);
      if (K === 'coin') { const sh2 = Math.max(0, Math.sin(T * 3 + k.p)); c.globalAlpha = sh2 * .8; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(6, -5, 4 * sh2 + 1, 1.4, -.5, 0, TAU); c.fill(); c.globalAlpha = 1; }
      return c.restore();
    }
    if (K === 'boot') {
      c.rotate(Math.sin(T + k.p) * .2);
      c.fillStyle = '#7a5038'; rr(c, -6, -14, 12, 18, 4); c.fill(); rr(c, -6, -2, 20, 9, 4); c.fill();
      c.fillStyle = '#3a2430'; c.fillRect(-7, 6, 22, 3);
      c.fillStyle = C.red; c.fillRect(-6, -14, 12, 4); c.fillStyle = C.gold; c.fillRect(-6, -10, 12, 2);
      c.scale(d, 1); txt(c, 'RUG', 0, -1, 7, C.cream, { w: 700 }); return c.restore();
    }
    if (K === 'puffer') {
      const pf = 1 + Math.sin(T * 3 + k.p) * .06; c.scale(pf, pf);
      c.fillStyle = shade(k.col, -.2); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.moveTo(Math.cos(a - .18) * r, Math.sin(a - .18) * r); c.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5)); c.lineTo(Math.cos(a + .18) * r, Math.sin(a + .18) * r); c.fill(); }
      c.fillStyle = k.col; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.fillStyle = shade(k.col, .5); c.beginPath(); c.ellipse(-3, -5, 6, 3.5, -.4, 0, TAU); c.fill();
      c.fillStyle = shade(k.col, -.15); c.beginPath(); c.moveTo(-r + 1, 0); c.lineTo(-r - 7, -5 + w * 2); c.lineTo(-r - 7, 5 + w * 2); c.fill();
      c.fillStyle = '#120a22'; c.beginPath(); c.arc(5, -3, 3.2, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(4, -4.2, 1.2, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,107,129,.55)'; c.beginPath(); c.arc(6, 4, 2.4, 0, TAU); c.fill();
      return c.restore();
    }
    const body = K === 'coin' ? C.gold : K === 'whale' ? '#8a9cff' : k.col, rx = K === 'whale' ? r * 1.35 : r * 1.35, ry = K === 'whale' ? r * .8 : r * .78;
    c.fillStyle = shade(body, -.2);
    c.beginPath(); c.moveTo(-rx * .8, 0); c.lineTo(-rx - (K === 'whale' ? 18 : 9), -ry * .8 + w * 3); c.lineTo(-rx - (K === 'whale' ? 14 : 7), w * 2); c.lineTo(-rx - (K === 'whale' ? 18 : 9), ry * .8 + w * 3); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(-rx * .05, -ry * .85, rx * .32, ry * .3, -.3, Math.PI, 0); c.fill();
    c.fillStyle = body; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    if (K === 'whale') { c.fillStyle = '#dfe6ff'; c.beginPath(); c.ellipse(4, ry * .35, rx * .75, ry * .45, 0, 0, Math.PI); c.fill(); c.strokeStyle = 'rgba(80,90,170,.35)'; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9, ry * .45); c.lineTo(i * 9 + 3, ry * .75); c.stroke(); } }
    c.fillStyle = shade(body, .45); c.beginPath(); c.ellipse(-rx * .15, -ry * .45, rx * .45, ry * .2, 0, 0, TAU); c.fill();
    c.fillStyle = shade(body, -.12); c.beginPath(); c.ellipse(-rx * .05, ry * .25, rx * .22, ry * .18, .5, 0, TAU); c.fill();
    if (K === 'coin') { // the smiley coin badge on the coinfish
      const sh = .5 + .5 * Math.sin(T * 4 + k.p);
      c.fillStyle = C.gold2; c.beginPath(); c.arc(-2, 1, 6.5, 0, TAU); c.fill(); c.strokeStyle = '#b07a12'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#7a4a08'; c.beginPath(); c.arc(-4.2, -.5, .9, 0, TAU); c.arc(.2, -.5, .9, 0, TAU); c.fill(); c.beginPath(); c.arc(-2, 1.5, 2.6, .3, Math.PI - .3); c.stroke();
      c.fillStyle = `rgba(255,255,255,${.35 + sh * .5})`; c.beginPath(); c.ellipse(rx * .35, -ry * .35, 3, 1.4, -.5, 0, TAU); c.fill();
    }
    const er = K === 'whale' ? 4.5 : 2.8; c.fillStyle = '#120a22'; c.beginPath(); c.arc(rx * .55, -ry * .15, er, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(rx * .55 - er * .35, -ry * .15 - er * .4, er * .4, 0, TAU); c.fill();
    if (K === 'whale') { c.fillStyle = 'rgba(255,143,184,.6)'; c.beginPath(); c.ellipse(rx * .45, ry * .2, 5, 3, 0, 0, TAU); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.arc(rx * .7, ry * .12, 4, .3, Math.PI - .5); c.stroke(); }
    c.restore();
  }
  function drawJelly(j) {
    const pulse = Math.sin(T * 3 + j.p), r = j.r * (1 + pulse * .06);
    c.save(); c.translate(j.x, j.y);
    if (ART.jelly) {
      c.globalAlpha = .16; c.fillStyle = C.pink; c.beginPath(); c.arc(0, -2, r * 1.6, 0, TAU); c.fill(); c.globalAlpha = 1;
      const [sw, sh] = SPR.jelly, sx = 1 + pulse * .08, sy = 1 - pulse * .07; c.scale(sx, sy); c.drawImage(ART.jelly, -sw / 2, -sh / 2 + 4, sw, sh); return c.restore();
    }
    c.globalAlpha = .18; c.fillStyle = C.pink; c.beginPath(); c.arc(0, 0, r * 1.7, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,170,210,.75)'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, 2); for (let s = 1; s <= 4; s++) c.lineTo(i * 5 + Math.sin(T * 4 + j.p + s + i) * 3, 2 + s * 6); c.stroke(); }
    c.fillStyle = 'rgba(255,150,200,.88)'; c.beginPath(); c.ellipse(0, 2, r, r * .85, 0, Math.PI, 0); c.quadraticCurveTo(0, 6, -r, 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * .35, -r * .4, r * .3, r * .16, -.5, 0, TAU); c.fill();
    c.fillStyle = '#5a1630'; c.beginPath(); c.arc(-4, -2, 1.6, 0, TAU); c.arc(4, -2, 1.6, 0, TAU); c.fill();
    c.restore();
  }
  function drawCrab(cr) {
    const y = FLOOR - 7, walk = cr.wait > 0 ? 0 : Math.sin(T * 14 + cr.p), snap = Math.sin(T * 5 + cr.p);
    if (ART.crab) {
      const [sw, sh] = SPR.crab; c.save(); c.translate(cr.x + walk * 1.2, y - 10 - Math.abs(walk) * 1.5); c.rotate(walk * .07);
      c.fillStyle = 'rgba(10,6,30,.25)'; c.beginPath(); c.ellipse(0, sh / 2 - 2, sw * .4, 4, 0, 0, TAU); c.fill();
      c.drawImage(ART.crab, -sw / 2, -sh / 2, sw, sh); return c.restore();
    }
    c.save(); c.translate(cr.x, y);
    c.strokeStyle = '#d9465f'; c.lineWidth = 2; c.lineCap = 'round';
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(s * 7, 2 + i * 2); c.lineTo(s * (13 + i * 2), 7 + i * 2 + (i % 2 ? walk : -walk) * 2); c.stroke(); }
    c.fillStyle = '#ff6b81'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 15, -6 + snap * 1.5 * s, 4.5, 0, TAU); c.fill(); c.fillStyle = '#d9465f'; c.beginPath(); c.moveTo(s * 15, -6); c.lineTo(s * 19, -9 + snap * 2); c.lineTo(s * 17, -4); c.fill(); c.fillStyle = '#ff6b81'; }
    c.beginPath(); c.ellipse(0, 0, 11, 8, 0, Math.PI, 0); c.quadraticCurveTo(0, 7, -11, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-3, -4, 4, 2, -.3, 0, TAU); c.fill();
    c.strokeStyle = '#d9465f'; c.beginPath(); c.moveTo(-3, -6); c.lineTo(-4, -11); c.moveTo(3, -6); c.lineTo(4, -11); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, -12, 2.6, 0, TAU); c.arc(4, -12, 2.6, 0, TAU); c.fill();
    c.fillStyle = '#120a22'; c.beginPath(); c.arc(-4 + cr.dir, -12, 1.3, 0, TAU); c.arc(4 + cr.dir, -12, 1.3, 0, TAU); c.fill();
    c.restore();
  }
  function drawLine(f) {
    const h = f.hook, tp = rodTip(f), tangled = h.state === 'tangle';
    c.strokeStyle = tangled ? 'rgba(255,143,184,.95)' : f.you ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.45)'; c.lineWidth = f.you ? 1.6 : 1.1;
    c.beginPath(); c.moveTo(tp.x, tp.y);
    if (tangled) { const n2 = 14; for (let i = 1; i <= n2; i++) { const t = i / n2; c.lineTo(tp.x + (h.x - tp.x) * t + (i < n2 ? Math.sin(T * 30 + i * 2) * 4 : 0), tp.y + (h.y - tp.y) * t); } }
    else { const sag = h.state === 'free' ? 8 : 0; c.quadraticCurveTo((tp.x + h.x) / 2 + sag, (tp.y + h.y) / 2, h.x, h.y); }
    c.stroke();
    if (h.y > SURF + 6) { // bobber on the surface
      const s = (SURF - tp.y) / (h.y - tp.y), bx = tp.x + (h.x - tp.x) * s, by = SURF - 3 + Math.sin(T * 3 + f.x) * 1.5 + (h.carry ? 2 : 0);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, by, 4, 0, TAU); c.fill(); c.fillStyle = f.you ? C.red : f.color; c.beginPath(); c.arc(bx, by, 4, Math.PI, 0); c.fill();
    }
    c.strokeStyle = '#dfe3f0'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(h.x, h.y - 4); c.lineTo(h.x, h.y + 4); c.arc(h.x - 4, h.y + 4, 4, 0, Math.PI * .9); c.stroke();
    if (f.you && h.state === 'free' && state === 'play') { c.strokeStyle = `rgba(155,124,240,${.4 + .25 * Math.sin(T * 5)})`; c.lineWidth = 1.5; c.beginPath(); c.arc(h.x, h.y + 2, 11, 0, TAU); c.stroke(); }
  }
  function drawFisher(f) {
    const y = PLANK - 14, bob = Math.sin(T * 2.2 + f.x) * .03, h = f.hook, tp = rodTip(f), r = f.you ? 17 : 16;
    // bucket
    const bx = bucketX(f), sc = 1 + f.pop * .25;
    c.save(); c.translate(bx, PLANK + 4); c.scale(sc, sc);
    if (f.count) { for (let i = 0; i < Math.min(3, f.count); i++) { c.fillStyle = [C.gold, '#8cc8ff', C.pink][i]; c.beginPath(); c.moveTo(-4 + i * 4, -15); c.lineTo(-7 + i * 4, -21 - i); c.lineTo(-1 + i * 4, -21 - i); c.fill(); } }
    c.fillStyle = '#7d8bb5'; c.beginPath(); c.moveTo(-9, -15); c.lineTo(9, -15); c.lineTo(7, 0); c.lineTo(-7, 0); c.fill();
    c.fillStyle = '#a7b3d8'; c.fillRect(-9, -15, 18, 3); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-8, -7, 16, 2);
    c.strokeStyle = '#a7b3d8'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, -15, 8, Math.PI, 0); c.stroke();
    c.restore();
    const sq = bob + f.bounce * .18 * Math.sin(f.bounce * 12) + (h.state === 'tug' ? Math.sin(T * 20) * .05 : 0);
    if (f.sprite) { // the real 3D character, standing on the dock with the rod in front
      const S = 66, hop = f.bounce > 0 ? Math.sin(f.bounce * Math.PI) * 10 : 0, jit = h.state === 'tug' ? Math.sin(T * 26) * 1.5 : 0;
      c.save(); c.translate(f.x + jit, PLANK + 7 - hop); c.scale(1 + sq * .7, 1 - sq * .7);
      if (f.mood === 'sad' && f.moodT > 0) c.rotate(Math.sin(T * 24) * .06);
      c.drawImage(f.sprite, -S / 2, -S, S, S); c.restore();
      const hx = f.x + ((f.hand || .72) - .5) * S, hy = PLANK - 20 - hop * .6;
      c.strokeStyle = '#7a4a2a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx - 6, hy + 8); c.quadraticCurveTo(hx + 10, hy - 26, tp.x, tp.y); c.stroke();
      c.strokeStyle = '#e0b07a'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx - 5, hy + 6); c.quadraticCurveTo(hx + 10, hy - 26, tp.x, tp.y); c.stroke();
      c.fillStyle = '#3a2440'; c.beginPath(); c.arc(hx, hy + 2, 4, 0, TAU); c.fill(); c.fillStyle = '#c9b6ff'; c.beginPath(); c.arc(hx, hy + 2, 1.6, 0, TAU); c.fill();
    } else {
    c.strokeStyle = '#d9a46a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(f.x + r * .8, y + 3); c.quadraticCurveTo(f.x + 24, y - 20, tp.x, tp.y); c.stroke();
    c.fillStyle = '#5a3a5a'; c.beginPath(); c.arc(f.x + r * .95, y + 2, 3.2, 0, TAU); c.fill();
    drawBlob(c, f.x, y - (f.bounce > 0 ? f.bounce * 6 : 0), r, f.color, { look: clamp((h.x - f.x) / 60, -1, 1), lookY: clamp((h.y - y) / 300, 0, 1), squash: sq, blink: f.blinkT < 0, mood: h.state === 'tug' ? 'wow' : f.mood });
    }
    // name tag on the plank face
    c.font = `700 10px ${FONT}`; const tw = c.measureText(f.name).width + 12;
    c.fillStyle = f.you ? C.lav : 'rgba(255,255,255,.92)'; rr(c, f.x - tw / 2, PLANK + 10, tw, 14, 7); c.fill();
    txt(c, f.name, f.x, PLANK + 17.5, 10, f.you ? '#fff' : C.ink);
  }
  function drawEmote(f) {
    if (!f.emote) return; const e = f.emote, a = Math.min(1, e.t * 4), s = .7 + .3 * Math.min(1, (2.4 - e.t) * 6);
    c.font = `600 12px ${FONT}`; const w = c.measureText(e.s).width + 16, bx = clamp(f.x, w / 2 + 6, W - w / 2 - 6), by = PLANK - 64;
    c.save(); c.globalAlpha = a; c.translate(bx, by); c.scale(s, s);
    c.fillStyle = '#fff'; rr(c, -w / 2, -22, w, 22, 11); c.fill(); c.beginPath(); c.moveTo(f.x - bx - 5, -1); c.lineTo(f.x - bx + 3, 6); c.lineTo(f.x - bx + 5, -1); c.fill();
    txt(c, e.s, 0, -11, 12, C.ink, { w: 600 }); c.restore();
  }
  function panel(x, y, w, h, a = .9) { c.fillStyle = `rgba(22,14,40,${a})`; rr(c, x, y, w, h, 22); c.fill(); c.strokeStyle = 'rgba(155,124,240,.7)'; c.lineWidth = 2; c.stroke(); }
  function button(x, y, w, h, label, act, primary) {
    const hov = 1 + (primary ? Math.sin(T * 4) * .02 : 0);
    c.save(); c.translate(x + w / 2, y + h / 2); c.scale(hov, hov);
    c.fillStyle = primary ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,0)'; rr(c, -w / 2, -h / 2 + 4, w, h, h / 2); c.fill();
    c.fillStyle = primary ? C.lav : 'rgba(155,124,240,.16)'; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
    if (!primary) { c.strokeStyle = C.lav; c.lineWidth = 2; c.stroke(); } else { c.fillStyle = 'rgba(255,255,255,.22)'; rr(c, -w / 2 + 8, -h / 2 + 4, w - 16, h * .32, h * .16); c.fill(); }
    txt(c, label, 0, 1, 17, primary ? '#fff' : C.lav2, { stroke: primary ? 3 : 0, sc: 'rgba(60,30,120,.6)' }); c.restore();
    btns.push({ x, y, w, h, act });
  }
  function fishIcon(kind, x, y, s = 1) { const k = { kind, x: 0, y: 0, vx: 1, r: KINDS[kind].r, p: 0, col: kind === 'small' ? '#8cc8ff' : '#ffd18a', hooked: false }; c.save(); c.translate(x, y); c.scale(s, s); drawFish(k); c.restore(); }
  function drawTitle() {
    panel(26, 62, W - 52, 548, .92);
    txt(c, 'Dock Fishing', W / 2, 108, 42, C.gold, { stroke: 6 });
    txt(c, 'Out-fish the agents at the harbor in 90 seconds.', W / 2, 144, 15, C.cream, { w: 500 });
    const vals = [['small', 'Minnow', '+1'], ['puffer', 'Puffer', '+3'], ['coin', 'Coinfish', '+5'], ['whale', 'Whale', '+15']];
    vals.forEach(([k, nm, v], i) => { const cx = 82 + i * 105; fishIcon(k, cx, 186, k === 'whale' ? .62 : 1.1); txt(c, nm, cx, 216, 12, C.lav2, { w: 600 }); txt(c, v, cx, 234, 16, C.gold); });
    c.fillStyle = 'rgba(155,124,240,.15)'; rr(c, 50, 248, W - 100, 72, 14); c.fill();
    const jz = { x: 112, y: 266, r: 10, p: 0 }; drawJelly(jz); c.save(); c.translate(0, 278 - (FLOOR - 7)); drawCrab({ x: 240, p: 0, wait: 1, dir: 0 }); c.restore();
    fishIcon('boot', 368, 274, 1.1);
    txt(c, 'jelly: snags', 112, 307, 12, C.pink, { w: 600 }); txt(c, 'crab: snags', 240, 307, 12, C.pink, { w: 600 }); txt(c, 'rug boot: slow', 368, 307, 12, '#cfc6e6', { w: 600 });
    const lines = [['↓ ↑  /  W S', 'lower & raise the hook'], ['← →  /  A D', 'nudge it (dodge jellies)'], ['drag', 'move the hook (phone)'], ['Space / tap', 'whale? keep it in the green']];
    lines.forEach(([k, d], i) => { const yy = 340 + i * 26; c.font = `700 13px ${FONT}`; const kw = c.measureText(k).width + 16; c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, 196 - kw, yy - 10, kw, 21, 10); c.fill(); txt(c, k, 196 - kw / 2, yy + .5, 13, '#fff'); txt(c, d, 206, yy + .5, 13, C.lav2, { align: 'left', w: 500 }); });
    txt(c, 'fishing with', W / 2, 442, 12, 'rgba(201,182,255,.7)', { w: 600 });
    const ags = fishers.filter((f) => !f.you);
    ags.forEach((f, i) => { const cx = W / 2 + (i - (ags.length - 1) / 2) * 96; drawChar(f, cx, 504 + Math.sin(T * 3 + i) * 2, 52, { look: Math.sin(T + i), squash: Math.sin(T * 3 + i) * .03, blink: (T + i * .7) % 3.4 < .12 }); txt(c, f.name, cx, 516, 12, '#fff'); });
    button(W / 2 - 120, 536, 240, 50, 'Start fishing', 'start', true);
    txt(c, 'Space / Enter / tap', W / 2, 598, 11, 'rgba(201,182,255,.7)', { w: 500 });
  }
  function drawResults() {
    const r = results; panel(34, 78, W - 68, 520, .93);
    const head = r.won ? 'You won!' : `You placed ${['1st', '2nd', '3rd', '4th'][r.rank - 1]}`;
    txt(c, head, W / 2, 122, 38, r.won ? C.gold : C.cream, { stroke: 6 });
    txt(c, `${r.score} point${r.score === 1 ? '' : 's'}`, W / 2, 160, 20, C.lav2);
    r.order.forEach((f, i) => {
      const yy = 204 + i * 46, me2 = f.you;
      c.fillStyle = me2 ? 'rgba(155,124,240,.3)' : 'rgba(255,255,255,.06)'; rr(c, 64, yy - 19, W - 128, 38, 19); c.fill();
      txt(c, String(i + 1), 88, yy, 18, i === 0 ? C.gold : C.lav2);
      drawChar(f, 122, yy + 19, 40, { squash: i === 0 ? Math.sin(T * 5) * .04 : 0, blink: (T + i) % 3.1 < .1, mood: i === 0 ? 'wow' : 'happy' });
      txt(c, f.name, 146, yy, 16, '#fff', { align: 'left' });
      txt(c, `${f.count} fish`, 300, yy, 13, 'rgba(201,182,255,.75)', { w: 500 });
      txt(c, String(f.score), W - 84, yy, 20, C.gold, { align: 'right' });
    });
    const by = 204 + r.order.length * 46 + 6;
    txt(c, bestCatch ? `Best catch: ${bestCatch.name} (+${bestCatch.val})` : 'Best catch: nothing bit this time', W / 2, by, 15, C.cream, { w: 500 });
    txt(c, `Your best: ${best}`, W / 2, by + 26, 15, C.lav2, { w: 600 });
    if (newBest) { const s = 1 + Math.sin(T * 8) * .08; c.save(); c.translate(W / 2, by + 56); c.scale(s, s); c.rotate(-.05); txt(c, 'NEW BEST!', 0, 0, 24, C.mint, { stroke: 5 }); c.restore(); }
    button(W / 2 - 160, 500, 150, 50, 'Play again', 'again', true);
    button(W / 2 + 10, 500, 150, 50, 'Back to world', 'back', false);
    txt(c, 'Space to play again · Esc to leave', W / 2, 570, 11, 'rgba(201,182,255,.7)', { w: 500 });
  }
  function drawHUD() {
    const order = fishers.slice().sort((a, b) => b.score - a.score || (a.you ? -1 : 1));
    const ph = 26 + fishers.length * 16; panel(12, 12, 150, ph, .8);
    txt(c, 'BUCKETS', 26, 25, 10, C.lav2, { align: 'left', w: 600 });
    order.forEach((f, i) => {
      const ty = 40 + i * 16; f.rowY = f.rowY ? f.rowY + (ty - f.rowY) * .2 : ty; const yy = f.rowY;
      if (f.you) { c.fillStyle = 'rgba(155,124,240,.32)'; rr(c, 18, yy - 8, 138, 16, 8); c.fill(); }
      c.fillStyle = f.color; c.beginPath(); c.arc(32, yy, 6, 0, TAU); c.fill(); c.fillStyle = '#120a22'; c.beginPath(); c.arc(30, yy - 1, 1.2, 0, TAU); c.arc(34, yy - 1, 1.2, 0, TAU); c.fill();
      txt(c, f.name, 44, yy + .5, 12, '#fff', { align: 'left', w: f.you ? 700 : 500 });
      txt(c, String(f.score), 148, yy + .5, 13, i === 0 && f.score > 0 ? C.gold : '#fff', { align: 'right' });
    });
    const s = Math.ceil(timeLeft), low = s <= 10 && state === 'play', sc = low ? 1 + Math.max(0, 1 - (s - timeLeft) * 4) * .15 : 1;
    c.save(); c.translate(W / 2, 32); c.scale(sc, sc);
    c.fillStyle = low ? 'rgba(255,107,129,.9)' : 'rgba(22,14,40,.8)'; rr(c, -48, -19, 96, 38, 19); c.fill(); c.strokeStyle = 'rgba(155,124,240,.7)'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(-26, 0, 8, 0, TAU); c.moveTo(-26, 0); c.lineTo(-26, -5); c.moveTo(-26, 0); c.lineTo(-22, 2); c.stroke();
    txt(c, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, 10, 1, 21, '#fff'); c.restore();
    if (tug) { // whale reel-in meter
      const x0 = 70, y0 = SURF + 64, w = W - 140, pulse = 1 + Math.sin(T * 10) * .03;
      panel(x0 - 14, y0 - 32, w + 28, 96, .9);
      c.save(); c.translate(W / 2, y0 - 13); c.scale(pulse, pulse); txt(c, 'WHALE ON! tap Space / click', 0, 0, 15, C.pink); c.restore();
      c.fillStyle = 'rgba(255,255,255,.1)'; rr(c, x0, y0, w, 18, 9); c.fill();
      c.fillStyle = 'rgba(60,255,143,.45)'; c.fillRect(x0 + w * .38, y0, w * .34, 18);
      c.fillStyle = 'rgba(255,107,129,.55)'; c.fillRect(x0 + w * .9, y0, w * .1, 18);
      const mx = x0 + w * clamp(tug.T, 0, 1), green = tug.T > .38 && tug.T < .72;
      c.fillStyle = green ? C.mint : C.gold; rr(c, mx - 5, y0 - 5, 10, 28, 5); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
      txt(c, 'slack', x0 + 4, y0 + 28, 10, C.lav2, { align: 'left', w: 500 }); txt(c, 'keep it green', x0 + w * .55, y0 + 28, 10, C.mint, { w: 600 }); txt(c, 'SNAP', x0 + w - 2, y0 + 28, 10, C.red, { align: 'right' });
      c.fillStyle = 'rgba(255,255,255,.1)'; rr(c, x0 + 52, y0 + 40, w - 52, 12, 6); c.fill();
      c.fillStyle = C.gold; rr(c, x0 + 52, y0 + 40, Math.max(12, (w - 52) * tug.prog), 12, 6); c.fill();
      txt(c, 'reel', x0 + 22, y0 + 46, 12, C.gold, { w: 700 });
    }
  }
  function drawLoading() {
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1d1033'); gr.addColorStop(1, '#130e22'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    const k = { kind: 'small', x: W / 2 + Math.sin(T * 2) * 30, y: H / 2 - 40 + Math.sin(T * 4) * 6, vx: Math.cos(T * 2) || 1, r: 12, p: 0, col: '#8cc8ff', hooked: false, v: 0 };
    c.save(); c.translate(k.x, k.y); c.scale(1.6, 1.6); c.translate(-k.x, -k.y); drawFish(k); c.restore();
    txt(c, 'Loading the docks...', W / 2, H / 2 + 10, 22, C.cream);
    c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, W / 2 - 100, H / 2 + 36, 200, 10, 5); c.fill();
    c.fillStyle = C.lav; rr(c, W / 2 - 100, H / 2 + 36, Math.max(10, 200 * loadN / Math.max(1, loadTotal)), 10, 5); c.fill();
  }
  function drawChar(f, x, yb, S, o = {}) { // real character sprite when we have one, blob otherwise; yb = feet
    if (f.sprite) { c.save(); c.translate(x, yb); const sq = o.squash || 0; c.scale(1 + sq, 1 - sq); c.drawImage(f.sprite, -S / 2, -S, S, S); c.restore(); }
    else drawBlob(c, x, yb - S * .36, S * .32, f.color, o);
  }
  function draw() {
    btns = [];
    c.save(); if (shake > 0) c.translate(rnd(-shake, shake) * .5, rnd(-shake, shake) * .5);
    if (state === 'loading') { drawLoading(); return c.restore(); }
    if (bgArt) {
      c.drawImage(bgArt, 0, 0, W, H);
      for (const s of stars) { if (s.y > 70) continue; c.globalAlpha = .3 + .35 * Math.sin(T * 2 + s.p); c.fillStyle = C.cream; c.fillRect(s.x, s.y, s.s, s.s); } c.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { const x0 = 30 + i * 100 + Math.sin(T * .3 + i) * 12; c.globalAlpha = .035 + .03 * Math.sin(T * .8 + i * 1.7); c.fillStyle = '#ffe3c0'; c.beginPath(); c.moveTo(x0, SURF); c.lineTo(x0 + 34, SURF); c.lineTo(x0 + 150, 560); c.lineTo(x0 + 90, 560); c.fill(); } c.globalAlpha = 1;
      c.strokeStyle = 'rgba(230,240,255,.35)'; c.lineWidth = 1.2; c.beginPath(); for (let xx = 0; xx <= W; xx += 12) { const yy = SURF + 2 + Math.sin(xx * .045 + T * 2.4) * 2; xx ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      for (const [s2, yy] of [['SHALLOWS', 250], ['MIDWATER', 352], ['THE DEEP', 452]]) txt(c, s2, W - 12, yy, 10, 'rgba(225,215,255,.35)', { align: 'right', w: 600 });
    } else {
    c.drawImage(bgBack, 0, 0, W, H);
    for (const s of stars) { c.globalAlpha = .35 + .35 * Math.sin(T * 2 + s.p); c.fillStyle = C.cream; c.fillRect(s.x, s.y, s.s, s.s); } c.globalAlpha = 1;
    // ferry silhouette on the horizon
    c.fillStyle = '#2a1640'; const fx = ferryX, fy = HORIZ;
    c.beginPath(); c.moveTo(fx - 58, fy - 9); c.lineTo(fx + 62, fy - 9); c.lineTo(fx + 50, fy); c.lineTo(fx - 50, fy); c.fill();
    c.fillRect(fx - 40, fy - 20, 70, 11); c.fillRect(fx - 26, fy - 29, 42, 9); c.fillRect(fx + 2, fy - 39, 8, 10);
    c.fillStyle = 'rgba(255,209,102,.85)'; for (let i = 0; i < 9; i++) c.fillRect(fx - 36 + i * 7.5, fy - 16, 3, 3); for (let i = 0; i < 5; i++) c.fillRect(fx - 22 + i * 7.5, fy - 25, 3, 3);
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(fx + 6 - (T * 6) % 14, fy - 44 - (T * 5) % 10, 3 + (T * 2) % 3, 0, TAU); c.fill();
    c.drawImage(bgDock, 0, 0, W, H);
    // light rays
    for (let i = 0; i < 5; i++) { const x0 = 30 + i * 100 + Math.sin(T * .3 + i) * 12; c.globalAlpha = .05 + .035 * Math.sin(T * .8 + i * 1.7); c.fillStyle = '#ffe3c0'; c.beginPath(); c.moveTo(x0, SURF); c.lineTo(x0 + 34, SURF); c.lineTo(x0 + 150, 560); c.lineTo(x0 + 90, 560); c.fill(); } c.globalAlpha = 1;
    // surface
    c.fillStyle = 'rgba(160,210,255,.22)'; c.beginPath(); c.moveTo(0, SURF + 8); for (let xx = 0; xx <= W; xx += 12) c.lineTo(xx, SURF + Math.sin(xx * .045 + T * 2.4) * 2.2); c.lineTo(W, SURF + 8); c.fill();
    c.strokeStyle = 'rgba(220,240,255,.7)'; c.lineWidth = 1.6; c.beginPath(); for (let xx = 0; xx <= W; xx += 12) { const yy = SURF + Math.sin(xx * .045 + T * 2.4) * 2.2; xx ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
    // seaweed
    c.lineCap = 'round';
    for (const wd of weeds) { c.strokeStyle = wd.col; c.lineWidth = 6; c.beginPath(); c.moveTo(wd.x, FLOOR + 4); let px = wd.x, py = FLOOR + 4; for (let i = 1; i <= 4; i++) { const nx = wd.x + Math.sin(T * 1.3 + wd.p + i * .7) * i * 3.5, ny = FLOOR + 4 - wd.h * i / 4; c.quadraticCurveTo(px + (i % 2 ? 6 : -6), (py + ny) / 2, nx, ny); px = nx; py = ny; } c.stroke(); }
    }
    c.fillStyle = 'rgba(220,240,255,.35)'; for (const b of amb) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); }
    for (const cr of crabs) drawCrab(cr);
    for (const j of jellies) drawJelly(j);
    for (const k of fishes) if (!k.hooked && !k.dead) drawFish(k);
    for (const f of fishers) { drawLine(f); if (f.hook.carry) drawFish(f.hook.carry); }
    for (const f of fishers) drawFisher(f);
    for (const fl of flyers) { const t = fl.t, e = 1 - (1 - t) * (1 - t); const k = fl.k; const ox = k.x, oy = k.y; k.x = fl.x0 + (fl.x1 - fl.x0) * e; k.y = fl.y0 + (fl.y1 - fl.y0) * t - Math.sin(Math.PI * t) * (k.kind === 'boot' ? 50 : 90); c.save(); c.translate(k.x, k.y); c.rotate(fl.spin * t * 6); c.scale(1 - t * .35, 1 - t * .35); c.translate(-k.x, -k.y); drawFish(k); c.restore(); if (t >= 1) { k.x = ox; k.y = oy; } }
    for (const p of P) {
      if (!p.on) continue; const a = clamp(p.l / p.m, 0, 1); c.globalAlpha = a;
      if (p.k === 1) { c.fillStyle = C.gold2; c.beginPath(); c.arc(p.x, p.y, p.r * 1.3, 0, TAU); c.fill(); c.fillStyle = C.gold; c.beginPath(); c.arc(p.x - .4, p.y - .4, p.r, 0, TAU); c.fill(); }
      else if (p.k === 2) { c.fillStyle = p.col; const r = p.r * (1 + (1 - a)); c.beginPath(); c.moveTo(p.x, p.y - r * 1.6); c.lineTo(p.x + r * .4, p.y); c.lineTo(p.x, p.y + r * 1.6); c.lineTo(p.x - r * .4, p.y); c.fill(); c.beginPath(); c.moveTo(p.x - r * 1.6, p.y); c.lineTo(p.x, p.y + r * .4); c.lineTo(p.x + r * 1.6, p.y); c.lineTo(p.x, p.y - r * .4); c.fill(); }
      else { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    for (const p of pops) { const t = p.t / 1.1, s = t < .15 ? .6 + t / .15 * .5 : 1.1 - Math.min(.1, (t - .15)); c.save(); c.globalAlpha = 1 - Math.max(0, (t - .6) / .4); c.translate(p.x, p.y - t * 40); c.scale(s, s); txt(c, p.s, 0, 0, p.size, p.col, { stroke: 4 }); c.restore(); }
    if (state === 'play' || state === 'end') drawHUD();
    for (const f of fishers) drawEmote(f);
    if (banner) { const t = banner.t / 1.4, s = t < .15 ? .4 + t / .15 * .7 : 1.1 - Math.min(.1, t - .15); c.save(); c.globalAlpha = 1 - Math.max(0, (t - .7) / .3); c.translate(W / 2, 300); c.scale(s, s); c.rotate(-.04); txt(c, banner.s, 0, 0, 48, banner.col, { stroke: 8 }); c.restore(); }
    if (state === 'title') { c.fillStyle = 'rgba(12,8,28,.35)'; c.fillRect(0, 0, W, H); drawTitle(); }
    if (state === 'results' && results) { c.fillStyle = 'rgba(12,8,28,.45)'; c.fillRect(0, 0, W, H); drawResults(); }
    c.restore();
  }

  // ---------- input / loop / close ----------
  const USED = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Enter', 'Escape'];
  const onKey = (e) => {
    if (!USED.includes(e.code)) return; e.preventDefault(); e.stopPropagation();
    if (e.type === 'keyup') { keys.delete(e.code); return; }
    audio(); keys.add(e.code);
    if (e.code === 'Escape') return close();
    if (e.code === 'Space' || e.code === 'Enter') { if (e.repeat) return; if (state === 'title' || state === 'results') start(); else if (state === 'loading') return; else if (state === 'play' && tug) tugTap(); }
  };
  const toLocal = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const onDown = (e) => {
    audio(); const p = toLocal(e);
    for (const b of btns) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.act === 'back') return close(); return start(); }
    if (state === 'loading') return;
    if (state === 'title') return start();
    if (state !== 'play') return;
    if (tug) return tugTap();
    drag = p; try { cv.setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e) => { if (drag) drag = toLocal(e); };
  const onUp = () => { drag = null; };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const onBlur = () => { keys.clear(); drag = null; }; addEventListener('blur', onBlur);
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); muted = !muted; try { localStorage.setItem('aa.games.mute', muted ? '1' : '0'); } catch {} paintMute(); audio(); });
  wrap.querySelector('[data-k=close]').addEventListener('click', () => close());
  let raf = 0, last = 0, closed = false;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
    step(dt); draw();
  }
  raf = requestAnimationFrame(loop);
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur);
    wrap.remove(); try { if (ac) ac.close(); } catch {}
    const rank = results ? results.rank : 1 + fishers.filter((f) => !f.you && f.score > you.score).length;
    onClose({ score: you.score, rank, won: results ? results.won : false });
  }
  return { close };
}
