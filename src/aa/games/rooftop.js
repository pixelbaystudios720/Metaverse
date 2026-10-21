// Rooftop Run (id: rooftop): a side-scrolling race across neon city rooftops at night. Self-contained ES module,
// drawn on one canvas, no network, no assets. The player blob auto-runs; jump (hold = higher, double jump once in
// the air) over gaps and low walls, slide under hanging neon signs, grab smiley coins, hit boost pads. Three bonded
// agents run the SAME seeded course with human-ish timing and the odd fumble. Falling respawns you with a short stun.
const W = 640, H = 400, TAU = Math.PI * 2, F = 'Fredoka, system-ui, sans-serif';
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#7ad7c4' }];
const PASTEL = ['#8cc8ff', '#ff8fb8', '#7ad7c4', '#ffd166', '#b8e07a', '#c9a6ff'];
const G = 2100, JV = 600, JV2 = 540, HOLD = 0.22, HOLDG = 0.45, BASE = 275, BOOSTX = 1.6, HW = 9, STAND = 30, CROUCH = 14;
const LEN = 25500, FALL_Y = 760;
const SIGN_TXT = ['gm', 'LFG', 'WAGMI', 'HODL', 'NOODLES', 'OPEN 24/7', 'ser', 'gn', 'moon soon', 'KARAOKE'];
const NEON = ['#ff8fb8', '#3cff8f', '#8cc8ff', '#ffd166', '#c9b6ff'];
const SAY = {
  start: ['gm', 'LFG', 'gl hf', 'wagmi', 'lets gooo'], pass: ['see ya!', 'too easy', 'zoom zoom', 'catch me!', 'bye!'],
  passed: ['nice one', 'hey!!', 'no way', 'ok ok', 'rude'], ouch: ['rugged!', 'oof', 'ow ow', 'my bad', 'bonk!', 'nooo'],
  fin: ['GG', 'gg wp', 'ez', 'photo finish?'], boost: ['wheee', 'nyoom', 'turbo!'],
};
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hexRgb(c) { let h = String(c || '').trim(); if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return [155, 124, 240]; h = h.slice(1); if (h.length === 3) h = h.replace(/./g, (m) => m + m); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const shadeCache = new Map();
function shades(c) {
  let s = shadeCache.get(c); if (s) return s;
  const [r, g, b] = hexRgb(c), m = (t, k) => `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`;
  s = { light: m(255, 0.55), dark: m(24, 0.38), base: `rgb(${r},${g},${b})` }; shadeCache.set(c, s); return s;
}
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); c.fill(); }

// One blob helper for everyone. (x, y) = feet. squash > 0 flattens, < 0 stretches.
function drawBlob(ctx, x, y, r, color, { look = 1, squash = 0, blink = false, mood = 'happy', run = 0, air = false, alpha = 1, tilt = 0 } = {}) {
  const sx = 1 + squash, sy = 1 - squash, s = shades(color), cy = -r * sy;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ell(ctx, 0, 1, r * sx * 0.9, r * 0.2);
  if (tilt) ctx.rotate(tilt);
  const f = air ? 0.2 : Math.sin(run) * 0.32;
  ctx.fillStyle = s.dark; ell(ctx, (-0.42 + f) * r, -r * 0.1, r * 0.3, r * 0.19); ell(ctx, (0.42 - f) * r, -r * 0.1, r * 0.3, r * 0.19);
  const a = air ? -1 : Math.sin(run) * 0.5;
  ctx.fillStyle = s.base; ell(ctx, -r * sx * 0.93, cy + r * 0.22, r * 0.2, r * 0.3, 0.5 - a * 0.6); ell(ctx, r * sx * 0.93, cy + r * 0.22, r * 0.2, r * 0.3, -0.5 + a * 0.6);
  const gr = ctx.createRadialGradient(-r * 0.35, cy - r * 0.45 * sy, r * 0.12, 0, cy, r * 1.25);
  gr.addColorStop(0, s.light); gr.addColorStop(0.5, s.base); gr.addColorStop(1, s.dark);
  ctx.fillStyle = gr; ell(ctx, 0, cy, r * sx, r * sy);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ell(ctx, -r * 0.38 * sx, cy - r * 0.52 * sy, r * 0.28, r * 0.13, -0.6);
  const fx = look * r * 0.16, ey = cy - r * 0.06 * sy, ex = r * 0.3;
  ctx.strokeStyle = '#1b1230'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, r * 0.09);
  if (mood === 'dizzy') {
    for (const d of [-1, 1]) { const cx = fx + d * ex, k = r * 0.11; ctx.beginPath(); ctx.moveTo(cx - k, ey - k); ctx.lineTo(cx + k, ey + k); ctx.moveTo(cx + k, ey - k); ctx.lineTo(cx - k, ey + k); ctx.stroke(); }
  } else if (blink) {
    ctx.beginPath(); ctx.moveTo(fx - ex - r * 0.12, ey); ctx.lineTo(fx - ex + r * 0.12, ey); ctx.moveTo(fx + ex - r * 0.12, ey); ctx.lineTo(fx + ex + r * 0.12, ey); ctx.stroke();
  } else {
    ctx.fillStyle = '#140c24'; ell(ctx, fx - ex, ey, r * 0.15, r * 0.2 * sy + r * 0.02); ell(ctx, fx + ex, ey, r * 0.15, r * 0.2 * sy + r * 0.02);
    ctx.fillStyle = '#fff'; ell(ctx, fx - ex - r * 0.05, ey - r * 0.08, r * 0.06, r * 0.06); ell(ctx, fx + ex - r * 0.05, ey - r * 0.08, r * 0.06, r * 0.06);
  }
  ctx.fillStyle = 'rgba(255,143,184,.6)'; ell(ctx, fx - r * 0.56, ey + r * 0.3, r * 0.17, r * 0.09); ell(ctx, fx + r * 0.56, ey + r * 0.3, r * 0.17, r * 0.09);
  ctx.beginPath();
  if (mood === 'cheer') { ctx.fillStyle = '#5a1630'; ctx.arc(fx, ey + r * 0.2, r * 0.17, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff8fb8'; ell(ctx, fx, ey + r * 0.31, r * 0.08, r * 0.04); }
  else if (mood === 'sad') { ctx.arc(fx, ey + r * 0.42, r * 0.13, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
  else if (mood === 'dizzy') { ctx.arc(fx, ey + r * 0.3, r * 0.07, 0, TAU); ctx.stroke(); }
  else { ctx.arc(fx, ey + r * 0.16, r * 0.14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
  ctx.restore();
}

// Real character sprite when available (trimmed canvas {c,w,h}); otherwise the blob. (x, y) = feet, h = sprite height.
function drawChar(ctx, spr, color, x, y, h, o = {}) {
  if (!spr) { drawBlob(ctx, x, y, h * 0.36, color, o.slide ? { ...o, squash: 0.38 } : o); return; }
  const sq = o.squash || 0, sx = o.slide ? 1.28 : 1 + sq, sy = o.slide ? 0.5 : 1 - sq, w = h * spr.w / spr.h, run = o.run || 0;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  if (!o.noShadow) { ctx.fillStyle = 'rgba(10,4,24,.32)'; ell(ctx, 0, 1, w * 0.42 * sx, Math.max(2, h * 0.07)); }
  const bob = o.air || o.slide ? 0 : Math.abs(Math.sin(run)) * h * 0.05;
  ctx.rotate((o.tilt || 0) + (o.air || o.slide ? 0 : Math.sin(run) * 0.06) + (o.slide ? 0.12 : 0));
  ctx.translate(0, -bob); ctx.scale(sx, sy);
  ctx.drawImage(spr.c, -w / 2, -h, w, h);
  ctx.restore();
}
function trimSprite(img) { // crop to the solid character (ignores the soft baked shadow) so feet sit on the roof
  const c = document.createElement('canvas'), n = c.getContext('2d'); c.width = img.naturalWidth; c.height = img.naturalHeight; n.drawImage(img, 0, 0);
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  try { const d = n.getImageData(0, 0, c.width, c.height).data;
    for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) if (d[(yy * c.width + xx) * 4 + 3] > 150) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  } catch { x0 = 0; y0 = 0; x1 = c.width - 1; y1 = Math.round(c.height * 0.95); }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return { c: o, w, h };
}
const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function buildCourse() {
  const rng = mulberry32(0x5eeda7), cols = [], blds = [], signs = [], pads = [], coins = [], decor = [], haz = [];
  const arc = (x0, x1, yTop, lift) => { for (let i = 0; i < 5; i++) { const t = i / 4; coins.push({ x: x0 + (x1 - x0) * t, y: yTop - 22 - Math.sin(t * Math.PI) * lift }); } };
  function features(b, from) {
    const walls = []; let c = from;
    while (c < b.x1 - 150) {
      const p = c / LEN, r = rng();
      if (r < 0.3) {
        const w = 24 + Math.floor(rng() * 12), h = 20 + Math.floor(rng() * 12);
        walls.push({ x0: c, x1: c + w, y: b.y - h }); haz.push({ k: 'up', x: c, end: c + w, top: b.y - h });
        if (rng() < 0.5) arc(c - 50, c + w + 50, b.y - h, 50);
        c += w;
      } else if (r < 0.55) {
        const w = 66 + Math.floor(rng() * 40); signs.push({ x: c, w, bottom: b.y - 22, text: pick(SIGN_TXT, rng), col: pick(NEON, rng), ph: rng() * 9 });
        haz.push({ k: 'sign', x: c, end: c + w }); if (rng() < 0.5) for (let i = 0; i < 4; i++) coins.push({ x: c + 8 + i * (w - 16) / 3, y: b.y - 10 });
        c += w;
      } else if (r < 0.67) { pads.push({ x: c, w: 64, y: b.y }); c += 64; }
      else { const n = 4 + Math.floor(rng() * 3); for (let i = 0; i < n; i++) coins.push({ x: c + i * 26, y: b.y - 24 }); c += n * 26; }
      c += Math.floor(150 + rng() * (170 - 70 * p));
    }
    let x = b.x0; // split the roof into columns around the walls
    for (const w of walls) { cols.push({ x0: x, x1: w.x0, y: b.y }); cols.push({ x0: w.x0, x1: w.x1, y: w.y, wall: true }); x = w.x1; }
    cols.push({ x0: x, x1: b.x1, y: b.y });
    const nd = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < nd; i++) decor.push({ x: b.x0 + 40 + rng() * (b.x1 - b.x0 - 80), y: b.y, k: Math.floor(rng() * 3), s: 0.8 + rng() * 0.5, ph: rng() * 6 });
  }
  const mk = (x0, x1, y) => { const b = { x0, x1, y, tone: Math.floor(rng() * 4), seed: Math.floor(rng() * 1e6) }; blds.push(b); return b; };
  let b = mk(-700, 1000, 300); features(b, 520);
  while (b.x1 < LEN - 1500) {
    const p = b.x1 / LEN; let gap = rng() < 0.16 ? 0 : Math.round(70 + rng() * (40 + 70 * p));
    let dy = pick([-40, -30, -20, 0, 0, 20, 30, 50, 60], rng); if (gap === 0 && Math.abs(dy) < 20) dy = rng() < 0.5 ? -30 : 40;
    if (gap > 120 && dy < -20) dy = -20;
    const top = clamp(b.y + dy, 230, 360), prev = b;
    b = mk(prev.x1 + gap, prev.x1 + gap + Math.round(520 + rng() * 520), top);
    if (gap > 0) { haz.push({ k: 'gap', x: prev.x1, end: b.x0, w: gap, from: prev.y, land: top }); if (rng() < 0.6) arc(prev.x1 - 30, b.x0 + 30, Math.min(prev.y, top), 70); }
    else if (top < prev.y) haz.push({ k: 'up', x: b.x0, end: b.x0 + 8, top });
    features(b, b.x0 + 150);
  }
  const prev = b, gap = 100, fin = Math.max(LEN, prev.x1 + gap + 520);
  haz.push({ k: 'gap', x: prev.x1, end: prev.x1 + gap, w: gap, from: prev.y, land: prev.y });
  b = mk(prev.x1 + gap, fin + 1400, prev.y); cols.push({ x0: b.x0, x1: b.x1, y: b.y });
  for (let i = 0; i < 6; i++) coins.push({ x: b.x0 + 120 + i * 40, y: b.y - 24 - Math.sin(i / 5 * Math.PI) * 30 });
  haz.sort((a, c) => a.x - c.x); coins.sort((a, c) => a.x - c.x);
  return { cols, blds, signs, pads, coins, decor, haz, fin, finY: b.y };
}

function bakeSky(dpr) {
  const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0619'); g.addColorStop(0.45, '#1d1033'); g.addColorStop(0.8, '#3b1c5e'); g.addColorStop(1, '#6a2d6e');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = mulberry32(7);
  for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,246,234,${0.25 + r() * 0.6})`; const s = r() < 0.1 ? 1.6 : 0.9; x.fillRect(r() * W, r() * H * 0.6, s, s); }
  const mx = 500, my = 92, glow = x.createRadialGradient(mx, my, 30, mx, my, 150); glow.addColorStop(0, 'rgba(251,246,234,.35)'); glow.addColorStop(1, 'rgba(251,246,234,0)');
  x.fillStyle = glow; x.fillRect(mx - 160, my - 160, 320, 320);
  const mg = x.createRadialGradient(mx - 14, my - 14, 6, mx, my, 48); mg.addColorStop(0, '#fffdf4'); mg.addColorStop(1, '#f1e4c8');
  x.fillStyle = mg; ell(x, mx, my, 46, 46);
  x.fillStyle = 'rgba(190,170,200,.35)'; ell(x, mx + 14, my - 10, 9, 8); ell(x, mx - 16, my + 14, 12, 10); ell(x, mx + 18, my + 20, 6, 5); ell(x, mx - 6, my - 24, 5, 4);
  return c;
}
function bakeSkyline(dpr, far) {
  const TW = 1280, c = document.createElement('canvas'); c.width = TW * dpr; c.height = H * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr);
  const r = mulberry32(far ? 11 : 23); let bx = 0;
  while (bx < TW) {
    const w = far ? 40 + r() * 70 : 70 + r() * 90, h = far ? 110 + r() * 150 : 140 + r() * 150, top = H - h, ww = Math.min(w, TW - bx);
    x.fillStyle = far ? '#2a1a4d' : '#1c1036'; x.fillRect(bx, top, ww, h);
    x.fillStyle = far ? 'rgba(201,182,255,.08)' : 'rgba(201,182,255,.1)'; x.fillRect(bx, top, ww, 2);
    const sp = far ? 9 : 14, ws = far ? 3 : 5;
    for (let wy = top + 8; wy < H - 6; wy += sp) for (let wx = bx + 5; wx < bx + ww - ws - 3; wx += sp * 0.8) {
      const q = r(); if (q < (far ? 0.18 : 0.26)) { x.fillStyle = q < 0.06 ? (far ? 'rgba(255,143,184,.45)' : 'rgba(255,143,184,.8)') : q < 0.1 ? (far ? 'rgba(140,200,255,.45)' : 'rgba(140,200,255,.75)') : (far ? 'rgba(255,209,102,.4)' : 'rgba(255,209,102,.8)'); x.fillRect(wx, wy, ws, ws + 1); }
    }
    if (r() < 0.45) { x.strokeStyle = far ? '#2a1a4d' : '#1c1036'; x.lineWidth = 2; const ax = bx + w * (0.3 + r() * 0.4); x.beginPath(); x.moveTo(ax, top); x.lineTo(ax, top - 18 - r() * 24); x.stroke(); }
    if (!far && r() < 0.4) { // vertical neon sign
      const col = pick(NEON, r), sx = bx + w * 0.15 + r() * w * 0.5, sy = top + 20 + r() * 40;
      x.shadowColor = col; x.shadowBlur = 12; x.strokeStyle = col; x.lineWidth = 2; rr(x, sx, sy, 16, 52, 4); x.stroke();
      x.fillStyle = col; x.font = `600 11px ${F}`; x.textAlign = 'center'; const t = pick(['B', 'A', 'R', '☺', '★', 'G', 'M'], r); x.fillText(t, sx + 8, sy + 20); x.fillText(pick(['★', '☺', 'N', 'O'], r), sx + 8, sy + 40); x.shadowBlur = 0;
    }
    if (!far && r() < 0.3) { x.fillStyle = '#1c1036'; const tx = bx + 10 + r() * (w - 40); x.fillRect(tx, top - 26, 22, 20); x.beginPath(); x.moveTo(tx - 2, top - 26); x.lineTo(tx + 11, top - 36); x.lineTo(tx + 24, top - 26); x.fill(); x.fillRect(tx + 3, top - 6, 2, 6); x.fillRect(tx + 17, top - 6, 2, 6); }
    bx += w + (far ? 0 : r() * 14);
  }
  return c;
}

export function open({ me = { name: 'You', color: '#9b7cf0' }, agents = [], onClose = () => {}, _test = null } = {}) {
  const meColor = (me && me.color) || '#9b7cf0';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(12,8,28,.82);font-family:Fredoka,system-ui,sans-serif';
  wrap.innerHTML = `<div style="position:relative;width:min(960px,calc(100vw - 24px),calc((100vh - 24px) * 1.6));aspect-ratio:16/10;max-height:calc(100vh - 24px);border-radius:22px;overflow:hidden;background:#130e22;box-shadow:0 0 0 3px #9b7cf0,0 0 40px rgba(155,124,240,.35),0 30px 80px rgba(0,0,0,.6)">
    <canvas style="display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none"></canvas>
    <button data-k="mute" aria-label="Toggle sound" style="position:absolute;right:calc(min(40px,9vw) + 18px);top:12px;width:min(40px,9vw);height:min(40px,9vw);border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;font:600 18px/1 Fredoka,system-ui;cursor:pointer;box-shadow:0 0 0 2px rgba(201,182,255,.35)"></button>
    <button data-k="close" aria-label="Close Rooftop Run" style="position:absolute;right:12px;top:12px;width:min(40px,9vw);height:min(40px,9vw);border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;font:600 24px/1 Fredoka,system-ui;cursor:pointer;box-shadow:0 0 0 2px rgba(201,182,255,.35)">×</button></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; x.scale(dpr, dpr);
  const muteBtn = wrap.querySelector('[data-k=mute]');
  let muted = false; try { muted = localStorage.getItem('aa.games.mute') === '1'; } catch {}
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; }; paintMute();

  // ---------- sound ----------
  let ac = null, out = null, nbuf = null;
  function ensureAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination);
      nbuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch { ac = null; }
  }
  function tone(f, d, type = 'square', v = 0.1, f2 = 0, delay = 0) {
    if (!ac || muted) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, v, freq = 800) {
    if (!ac || muted || !nbuf) return; const t = ac.currentTime, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; fl.type = 'lowpass'; fl.frequency.value = freq; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + d + 0.02);
  }
  const sfx = {
    jump: () => tone(420, 0.13, 'square', 0.07, 780), dbl: () => tone(640, 0.16, 'square', 0.07, 1250),
    coin: () => { tone(988, 0.07, 'square', 0.06); tone(1319, 0.18, 'square', 0.06, 0, 0.06); },
    bonk: () => { tone(170, 0.25, 'triangle', 0.25, 50); noise(0.14, 0.25, 700); }, land: () => noise(0.06, 0.07, 500),
    slide: () => noise(0.22, 0.06, 1800), boost: () => tone(260, 0.4, 'sawtooth', 0.06, 1300), fall: () => tone(800, 0.7, 'triangle', 0.12, 110),
    beep: (hi) => tone(hi ? 880 : 440, hi ? 0.3 : 0.14, 'square', 0.08), click: () => tone(660, 0.06, 'square', 0.05),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'square', 0.07, 0, i * 0.1)),
    meh: () => [523, 494, 440, 523].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, 0, i * 0.12)),
  };

  // ---------- world ----------
  const C = buildCourse(), { cols, blds, signs, pads, coins, decor, haz } = C, FIN = C.fin;
  const sky = bakeSky(dpr), farL = bakeSkyline(dpr, true), midL = bakeSkyline(dpr, false);
  function colIdx(px) { let lo = 0, hi = cols.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, c = cols[m]; if (px < c.x0) hi = m - 1; else if (px >= c.x1) lo = m + 1; else return m; } return -1; }
  const surf = (px) => { const i = colIdx(px); return i < 0 ? 1e9 : cols[i].y; };
  const groundAt = (px) => Math.min(surf(px - HW + 2), surf(px + HW - 2));

  const pool = (agents && agents.length ? agents : FALLBACK).slice().sort(() => Math.random() - 0.5).slice(0, 3)
    .map((a, i) => ({ name: String(a.name || 'AGENT').slice(0, 12), color: a.color || PASTEL[i % PASTEL.length], img: a.img || null }));
  const skills = [1.0, 0.985, 0.97].sort(() => Math.random() - 0.5);
  const mkR = (name, color, you, i) => ({ name, color, you, skill: you ? 1 : skills[i], fumble: 0.06 + Math.random() * 0.05, x: 0, y: 0, vx: 0, vy: 0, gnd: true, air: 1, slide: false, slideT: 0, stun: 0, boost: 0, hold: 0, held: false, down: false, coy: 0, buf: 0, sq: 0, sqv: 0, phase: 0, blinkT: 1 + Math.random() * 3, bub: '', bubT: 0, sayCd: 0, fin: 0, lastG: 300, hz: 0, si: 0, pi: 0, plan: null, side: 0, dustT: 0, start: 0 });
  const you = mkR('YOU', meColor, true, 0), rivals = pool.map((a, i) => mkR(a.name, a.color, false, i)), runners = [...rivals, you], ord = runners.slice();
  rivals.forEach((r, i) => { r.start = -16 - i * 16; });
  // ---------- art loading (falls back to canvas drawing per file) ----------
  const fitSpr = (r) => { r.sh = r.spr && r.spr.h / r.spr.w > 1.25 ? 54 : 46; };
  const art = { sky: null, far: null, near: null, tank: null, sign: null, boost: null };
  let loadN = 0, loadOf = 0;
  const track = (pr) => { loadOf++; return pr.then((v) => { loadN++; return v; }); };
  const artURL = (f) => { try { return new URL(`./art/rooftop/${f}`, import.meta.url).href; } catch { return null; } };
  const loads = [
    ...Object.entries({ sky: 'sky.jpg', far: 'far.png', near: 'near.png', tank: 'watertank.png', sign: 'sign.png', boost: 'boost.png' }).map(([k, f]) => track(loadImg(artURL(f))).then((i) => { art[k] = i; })),
    track(loadImg(me && me.img)).then((i) => { if (i) you.spr = trimSprite(i); fitSpr(you); }),
    ...pool.map((a, i) => track(loadImg(a.img)).then((im) => { if (im) rivals[i].spr = trimSprite(im); fitSpr(rivals[i]); })),
  ];
  let artReady = false;
  Promise.all(loads).then(() => { artReady = true; });
  setTimeout(() => { artReady = true; }, 8000);
  const auto = !!(_test && _test.auto), tSpeed = (_test && _test.speed) || 1;

  let state = 'loading', T = 0, raceT = 0, cd = 0, finT = 0, resT = 0, coinN = 0, finished = [], rank = 0, score = 0, lastTime = 0, newBest = false, shake = 0;
  let best = 0; try { best = Number(localStorage.getItem('aa.rooftop.best')) || 0; } catch {}
  let camX = -190, camY = 30, kJump = false, kDown = false, tDown = false, touchSeen = false, slidePtr = -1, jumpPtr = -1, paused = false, raf = 0, last = 0, closed = false;
  const got = new Uint8Array(coins.length);

  // particles (fixed pool, no per-frame allocation)
  const P = []; for (let i = 0; i < 340; i++) P.push({ a: false, x: 0, y: 0, vx: 0, vy: 0, l: 0, m: 1, s: 1, c: '#fff', k: 0, rot: 0 });
  let pIdx = 0;
  function emit(px, py, vx, vy, life, size, color, kind) { const p = P[pIdx]; pIdx = (pIdx + 1) % P.length; p.a = true; p.x = px; p.y = py; p.vx = vx; p.vy = vy; p.l = life; p.m = life; p.s = size; p.c = color; p.k = kind; p.rot = Math.random() * 6; }
  const dust = (px, py, n, sp = 60) => { for (let i = 0; i < n; i++) emit(px + (Math.random() - 0.5) * 14, py - 2, (Math.random() - 0.5) * sp - 20, -Math.random() * 40, 0.35 + Math.random() * 0.25, 3 + Math.random() * 3, 'rgba(220,205,255,', 0); };
  const sparks = (px, py, n, col) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 140; emit(px, py, Math.cos(a) * v, Math.sin(a) * v, 0.4 + Math.random() * 0.3, 2 + Math.random() * 2.5, col, 1); } };
  const pops = []; for (let i = 0; i < 12; i++) pops.push({ t: 0, x: 0, y: 0, s: '', c: '#fff' });
  let popI = 0; const pop = (px, py, s, c = '#ffd166') => { const p = pops[popI]; popI = (popI + 1) % pops.length; p.t = 0.9; p.x = px; p.y = py; p.s = s; p.c = c; };
  const lines = []; for (let i = 0; i < 16; i++) lines.push({ x: Math.random() * W, y: 40 + Math.random() * (H - 80), l: 40 + Math.random() * 90, v: 900 + Math.random() * 700 });

  function say(r, list, force = false) { if (r.you || (!force && r.sayCd > 0)) return; r.bub = pick(list); r.bubT = 2.2; r.sayCd = 3.2 + Math.random() * 2; }
  function reset() {
    for (const r of runners) Object.assign(r, { x: r.start || 0, y: 300, vx: 0, vy: 0, gnd: true, air: 1, slide: false, slideT: 0, stun: 0, boost: 0, hold: 0, held: false, down: false, coy: 0, buf: 0, sq: 0, sqv: 0, fin: 0, lastG: 300, hz: 0, si: 0, pi: 0, plan: null, side: 0, bubT: 0, sayCd: 0 });
    got.fill(0); coinN = 0; raceT = 0; finished = []; rank = 0; score = 0; newBest = false; camX = you.x - 190; camY = 30;
    for (const p of P) p.a = false;
  }
  function start() { ensureAudio(); sfx.click(); reset(); state = 'count'; cd = 3; }
  reset();

  // ---------- mechanics ----------
  const underSign = (r) => { const s = signs[r.si]; return s && r.x + HW > s.x && r.x - HW < s.x + s.w; };
  function pressJump(r) {
    if (r.stun > 0 || r.fin && !r.you) return false;
    if (r.slide && underSign(r)) return false;
    if (r.gnd || r.coy > 0) { r.vy = -JV; r.hold = HOLD; r.held = true; r.gnd = false; r.coy = 0; r.slide = false; r.sq = -0.28; r.sqv = 0; dust(r.x, r.y, 5); if (r.you) sfx.jump(); return true; }
    if (r.air > 0) { r.air--; r.vy = -JV2; r.hold = HOLD * 0.6; r.held = true; r.sq = -0.25; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; emit(r.x, r.y - 6, Math.cos(a) * 110, Math.sin(a) * 40 + 30, 0.35, 2.5, r.you ? 'rgba(255,209,102,' : 'rgba(201,182,255,', 0); } if (r.you) sfx.dbl(); return true; }
    if (r.you) r.buf = 0.13; return false;
  }
  function bonk(r) {
    r.vx = -120; r.stun = 0.55; r.sq = 0.32; r.sqv = 0; r.slide = false; r.held = false; r.plan = null; r.calm = 1;
    sparks(r.x + HW, r.y - 18, 8, 'rgba(255,209,102,');
    if (r.you) { shake = Math.max(shake, 9); sfx.bonk(); pop(r.x, r.y - 50, 'bonk!', '#ff6b81'); } else say(r, SAY.ouch, true);
  }
  function respawn(r) {
    let b = blds.find((q) => q.x1 > r.x + HW + 4) || blds[blds.length - 1];
    r.x = Math.max(r.x, b.x0 + 26); r.y = b.y - 110; r.vy = 0; r.vx = 0; r.gnd = false; r.stun = 1.1; r.air = 0; r.slide = false; r.held = false; r.plan = null; r.lastG = b.y;
    while (haz[r.hz] && haz[r.hz].end + HW < r.x) r.hz++;
    if (r.you) { sfx.fall(); shake = Math.max(shake, 5); pop(r.x, b.y - 140, 'whoops!', '#ff8fb8'); } else say(r, SAY.ouch, true);
  }
  function rubber(r) { if (r.you || r.fin || you.fin) return 1; const d = r.x - you.x; return d > 520 ? 0.94 : d < -650 ? 1.08 : 1; }
  function physics(r, h) {
    if (r.stun > 0) { r.stun -= h; r.vx *= Math.pow(0.04, h); }
    else { let tgt = BASE * r.skill * rubber(r); if (r.boost > 0) tgt *= BOOSTX; if (r.fin) tgt = r.x > r.fin_x + 240 ? 0 : 150; r.vx += (tgt - r.vx) * Math.min(1, 2.6 * h); }
    r.boost -= h; r.coy -= h; r.buf -= h; r.slideT -= h;
    if (r.down && r.gnd && !r.slide && r.stun <= 0) { r.slide = true; r.slideT = 0.28; dust(r.x, r.y, 4, 120); if (r.you) sfx.slide(); }
    if (r.slide && (!r.gnd || (!r.down && r.slideT <= 0 && !underSign(r)))) r.slide = false;
    let g = G; if (r.vy < 0 && r.held && r.hold > 0) g *= HOLDG; r.hold -= h;
    if (!r.gnd && r.down && r.vy > -120) g *= 1.9;
    if (!r.gnd) r.vy += g * h;
    const px = r.x; r.x += r.vx * h;
    if (r.vx > 0) { const s = surf(r.x + HW); if (s < r.y - 5) { r.x = cols[colIdx(r.x + HW)].x0 - HW - 0.5; bonk(r); } }
    while (signs[r.si] && signs[r.si].x + signs[r.si].w < r.x - HW) r.si++;
    const sg = signs[r.si], ht = r.slide ? CROUCH : STAND;
    if (sg && r.x + HW > sg.x && r.x - HW < sg.x + sg.w && r.y - ht < sg.bottom) {
      if (px + HW <= sg.x + 6 && r.vx > 0) { r.x = sg.x - HW - 0.5; bonk(r); }
      else if (r.gnd) { r.slide = true; r.slideT = 0.1; } else if (r.vy < 0) { r.vy = 40; }
    }
    if (!r.gnd) {
      const py = r.y; r.y += r.vy * h;
      if (r.vy >= 0) { const gy = groundAt(r.x); if (py <= gy + 1 && r.y >= gy) {
        r.y = gy; const imp = r.vy; r.vy = 0; r.gnd = true; r.air = 1; r.lastG = gy; r.sq = clamp(imp / 2400, 0.08, 0.4); r.sqv = 0;
        if (imp > 350) { dust(r.x, r.y, 6, 140); if (r.you) sfx.land(); }
        if (r.buf > 0 && r.you) { pressJump(r); r.held = kJump || auto; }
      } }
    } else {
      const gy = groundAt(r.x); if (gy > r.y + 6) { r.gnd = false; r.coy = 0.09; } else { r.y = gy; r.lastG = gy; }
    }
    if (r.gnd) {
      r.phase += r.vx * h * 0.07; r.dustT -= h; if (r.dustT <= 0 && r.vx > 150) { r.dustT = 0.09; emit(r.x - 6, r.y - 2, -30 - Math.random() * 30, -10 - Math.random() * 20, 0.3, 2 + Math.random() * 2, 'rgba(220,205,255,', 0); }
      while (pads[r.pi] && pads[r.pi].x + pads[r.pi].w < r.x - HW) r.pi++;
      const pd = pads[r.pi]; if (pd && r.x + HW > pd.x && r.x - HW < pd.x + pd.w) { if (r.boost < 0.3) { if (r.you) { sfx.boost(); pop(r.x, r.y - 50, 'BOOST!', '#3cff8f'); } else if (Math.random() < 0.4) say(r, SAY.boost); sparks(r.x, r.y - 4, 10, 'rgba(60,255,143,'); } r.boost = 1.5; }
    }
    r.sqv += (-r.sq * 260 - r.sqv * 14) * h; r.sq += r.sqv * h;
    if (r.y > FALL_Y) respawn(r);
    if (!r.fin && r.x >= FIN) { r.fin = raceT; r.fin_x = r.x; finished.push(r); if (r.you) onYouFinish(); else say(r, SAY.fin, true); }
  }
  function ai(r, h) {
    if (r.fin) { r.down = false; r.held = false; return; }
    while (haz[r.hz] && haz[r.hz].end + HW < r.x) { r.hz++; r.plan = null; r.down = false; r.calm = 0; }
    const z = haz[r.hz]; if (!z) return;
    const fum = !r.calm && Math.random() < r.fumble;
    if (!r.plan) r.plan = z.k === 'sign' ? { d: fum ? -99 : 18 + Math.random() * 70, done: false, t: 0 }
      : z.k === 'up' ? { d: fum ? -2 + Math.random() * 10 : 28 + Math.random() * 55, hold: 0.04 + Math.random() * 0.08, done: false, t: 0, save: !fum }
      : { d: fum ? -99 : 2 + Math.random() * 26, hold: clamp(0.06 + (z.w - 80) / 400 + Math.max(0, z.from - z.land) / 250, 0.05, 0.22) + Math.random() * 0.04, done: false, t: 0, save: !fum };
    const p = r.plan, d = z.x - (r.x + HW);
    if (r.stun > 0) return;
    if (z.k === 'sign') { r.down = d < p.d; return; }
    if (!p.done && d < p.d) { if (r.gnd || r.coy > 0) { pressJump(r); p.done = true; p.t = p.hold; } else if (d < p.d - 40) p.done = true; }
    if (p.done && r.held) { p.t -= h; if (p.t <= 0) r.held = false; }
    if (p.save && !r.gnd && r.air > 0 && r.vy > 40) {
      if (z.k === 'gap' && r.x + HW < z.end + 6 && r.y > z.land - 26) { pressJump(r); p.t = 0.12; }
      else if (z.k === 'up' && r.x + HW < z.end && r.y > z.top - 4 && d < 40) { pressJump(r); p.t = 0.06; }
    }
  }
  function onYouFinish() {
    rank = finished.indexOf(you) + 1; lastTime = you.fin;
    score = Math.max(0, Math.round((150 - lastTime) * 100)) + coinN * 30;
    newBest = !best || lastTime < best; if (newBest) { best = lastTime; try { localStorage.setItem('aa.rooftop.best', best.toFixed(2)); } catch {} }
    state = 'finish'; finT = 2.3; shake = 4; rank === 1 ? sfx.win() : sfx.meh();
    for (let i = 0; i < 70; i++) emit(you.x + (Math.random() - 0.3) * 300, you.y - 200 - Math.random() * 80, (Math.random() - 0.5) * 120, Math.random() * 60, 2 + Math.random(), 3 + Math.random() * 3, NEON[i % NEON.length], 2);
  }

  // ---------- input ----------
  const JUMPK = new Set(['Space', 'ArrowUp', 'KeyW']), DOWNK = new Set(['ArrowDown', 'KeyS']);
  function onKey(e) {
    const c = e.code; if (!(JUMPK.has(c) || DOWNK.has(c) || c === 'Enter' || c === 'Escape')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); ensureAudio();
    if (e.type === 'keydown') {
      if (c === 'Escape') { close(); return; }
      if (state === 'title' || (state === 'results' && resT > 0.6)) { if ((c === 'Space' || c === 'Enter') && !e.repeat) start(); return; }
      if (JUMPK.has(c) && !e.repeat) { kJump = true; if (state === 'race' && !auto) pressJump(you); }
      if (DOWNK.has(c)) kDown = true;
    } else { if (JUMPK.has(c)) { kJump = false; if (!auto) you.held = false; } if (DOWNK.has(c)) kDown = false; }
  }
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const toCanvas = (e) => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H]; };
  const inBtn = (p, b) => p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h;
  const BT = { start: { x: W / 2 - 120, y: 306, w: 240, h: 46 }, again: { x: W / 2 - 200, y: 312, w: 190, h: 44 }, back: { x: W / 2 + 10, y: 312, w: 190, h: 44 }, slide: { x: 14, y: H - 96, w: 110, h: 82 } };
  function onDown(e) {
    ensureAudio(); if (e.pointerType === 'touch') touchSeen = true; const p = toCanvas(e);
    if (state === 'loading') return;
    if (state === 'title') { start(); return; }
    if (state === 'results') { if (resT < 0.5) return; if (inBtn(p, BT.back)) { sfx.click(); close(); } else if (inBtn(p, BT.again) || e.pointerType !== 'mouse') start(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch {}
    if (touchSeen && inBtn(p, BT.slide)) { slidePtr = e.pointerId; tDown = true; return; }
    jumpPtr = e.pointerId; kJump = true; if (state === 'race' && !auto) pressJump(you);
  }
  function onUp(e) { if (e.pointerId === slidePtr) { slidePtr = -1; tDown = false; } if (e.pointerId === jumpPtr) { jumpPtr = -1; kJump = false; if (!auto) you.held = false; } }
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  wrap.querySelector('[data-k=close]').addEventListener('click', close);
  muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('aa.games.mute', muted ? '1' : '0'); } catch {} paintMute(); ensureAudio(); sfx.click(); });
  const onVis = () => { paused = document.hidden; last = 0; if (paused) { kJump = false; kDown = false; you.held = false; } };
  document.addEventListener('visibilitychange', onVis);
  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); document.removeEventListener('visibilitychange', onVis);
    try { ac && ac.close(); } catch {}
    wrap.remove(); onClose({ score, rank, won: rank === 1 });
  }

  // ---------- update ----------
  function update(dt) {
    T += dt; shake = Math.max(0, shake - dt * 30);
    for (const r of runners) { r.blinkT -= dt; if (r.blinkT < -0.12) r.blinkT = 2 + Math.random() * 3; r.bubT -= dt; r.sayCd -= dt; }
    if (state === 'loading' && artReady && T > 0.3) state = 'title';
    if (state === 'title') { for (const r of runners) { r.sqv += (-r.sq * 260 - r.sqv * 14) * dt; r.sq += r.sqv * dt; } }
    if (state === 'count') { const before = Math.ceil(cd); cd -= dt; const now = Math.ceil(cd); if (now !== before && now > 0) sfx.beep(false); if (cd <= 0) { state = 'race'; sfx.beep(true); rivals.forEach((r, i) => setTimeout(() => { if (!closed) say(r, SAY.start, true); }, 200 + i * 450)); } }
    if (state === 'race' || state === 'finish' || state === 'results') {
      raceT += dt;
      you.down = auto ? you.down : (kDown || tDown);
      if (!auto && !you.fin) { if (!kJump) you.held = false; }
      for (const r of runners) if (!r.you || auto) ai(r, dt);
      const n = Math.ceil(dt / 0.0084), h = dt / n;
      for (let k = 0; k < n; k++) for (const r of runners) physics(r, h);
      if (state === 'race') {
        for (let i = 0; i < coins.length; i++) { const c = coins[i]; if (c.x > you.x + 30) break; if (got[i] || c.x < you.x - 30) continue;
          if (Math.abs(c.x - you.x) < 18 && Math.abs(c.y - (you.y - 14)) < 24) { got[i] = 1; coinN++; sfx.coin(); sparks(c.x, c.y, 6, 'rgba(255,209,102,'); pop(c.x, c.y - 14, '+1'); } }
        for (const r of rivals) { if (r.fin) continue; const d = r.x - you.x, s = d > 26 ? 1 : d < -26 ? -1 : r.side; if (r.side && s !== r.side) say(r, s > 0 ? SAY.pass : SAY.passed); r.side = s; }
      }
      if (state === 'finish') { finT -= dt; if (finT <= 0) { state = 'results'; resT = 0; } }
      if (state === 'results') resT += dt;
    }
    let ref = you.lastG; if (you.y > ref + 30) ref = you.y - 30; if (you.y < ref - 190) ref = you.y + 190;
    camY += (ref - 270 - camY) * Math.min(1, dt * 4);
    camX += (you.x - (you.boost > 0 ? 170 : 190) - camX) * Math.min(1, dt * 8);
    for (const p of P) { if (!p.a) continue; p.l -= dt; if (p.l <= 0) { p.a = false; continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.k === 1 ? 500 : p.k === 2 ? 120 : -20) * dt; if (p.k === 2) { p.vx *= 0.99; p.rot += dt * 6; } }
    for (const p of pops) if (p.t > 0) { p.t -= dt; p.y -= dt * 40; }
    for (const l of lines) { l.x -= l.v * dt; if (l.x < -l.l) { l.x = W + Math.random() * 200; l.y = 40 + Math.random() * (H - 80); } }
  }

  // ---------- drawing ----------
  function drawTiled(img, k, f, oy) { // mirror every other tile so the seams match
    const tw = img.naturalWidth * k, th = img.naturalHeight * k, off = camX * f, i0 = Math.floor(off / tw);
    for (let i = i0; i * tw - off < W; i++) { const lx = i * tw - off;
      if (i & 1) { x.save(); x.translate(lx + tw, oy); x.scale(-1, 1); x.drawImage(img, 0, 0, tw + 0.5, th); x.restore(); } else x.drawImage(img, lx, oy, tw + 0.5, th); }
    return oy + th;
  }
  const facades = new Map(), FH = 330;
  function makeFacade(b) {
    const w = Math.round(b.x1 - b.x0) + 6, c = document.createElement('canvas'); c.width = w * dpr; c.height = FH * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
    const tone = ['#5a4596', '#4e3c8a', '#614a9a', '#55408e'][b.tone];
    const bg = g.createLinearGradient(0, 0, 0, FH); bg.addColorStop(0, tone); bg.addColorStop(0.35, '#33265f'); bg.addColorStop(1, '#1c1440'); g.fillStyle = bg; g.fillRect(0, 0, w, FH);
    const rim = g.createLinearGradient(0, 0, 14, 0); rim.addColorStop(0, 'rgba(214,196,255,.55)'); rim.addColorStop(1, 'rgba(214,196,255,0)'); g.fillStyle = rim; g.fillRect(3, 0, 14, FH);
    const sh = g.createLinearGradient(w - 16, 0, w, 0); sh.addColorStop(0, 'rgba(8,4,20,0)'); sh.addColorStop(1, 'rgba(8,4,20,.45)'); g.fillStyle = sh; g.fillRect(w - 16, 0, 16, FH);
    const style = b.seed % 3, r = mulberry32(b.seed);
    for (let row = 0, wy = 36; wy < FH - 10; row++, wy += style === 2 ? 40 : 46) {
      g.fillStyle = 'rgba(10,6,26,.22)'; g.fillRect(6, wy - 9, w - 12, 2); // floor line
      if (style === 2) { // wide band windows split into panes
        for (let wx = 18; wx + 70 < w - 12; wx += 92) { const lit = r() < 0.55; win(g, wx, wy, 70, 20, 8, lit, r); g.fillStyle = 'rgba(30,16,60,.55)'; for (let k = 1; k < 4; k++) g.fillRect(wx + k * 17.5, wy, 2, 20); }
      } else for (let wx = 18; wx + 16 < w - 12; wx += 36) {
        const lit = r() < 0.5;
        if (style === 1) win(g, wx, wy + 4, 16, 16, 8, lit, r); else win(g, wx, wy, 16, 26, row === 0 ? 8 : 6, lit, r);
      }
    }
    const cap = g.createLinearGradient(0, 0, 0, 13); cap.addColorStop(0, '#9a84de'); cap.addColorStop(1, '#5b4598'); g.fillStyle = cap; rr(g, 0, -1, w, 13, 6); g.fill();
    g.fillStyle = 'rgba(240,232,255,.75)'; g.fillRect(4, 0, w - 8, 1.5);
    g.fillStyle = '#d9a446'; g.fillRect(3, 14, w - 6, 3); g.fillStyle = 'rgba(255,230,160,.8)'; g.fillRect(3, 14, w - 6, 1);
    return c;
  }
  function win(g, wx, wy, ww, wh, rad, lit, r) {
    if (lit) { const q = r(), col = q < 0.18 ? ['#f3c8ff', '#b98af0'] : q < 0.28 ? ['#ffc2dc', '#ff8fb8'] : ['#fff0b8', '#f0b440'];
      g.fillStyle = q < 0.18 ? 'rgba(201,160,255,.22)' : 'rgba(255,200,110,.2)'; rr(g, wx - 4, wy - 4, ww + 8, wh + 8, rad + 4); g.fill();
      const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; rr(g, wx, wy, ww, wh, rad); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, wx + 2, wy + 2, Math.max(2, ww * 0.3), wh * 0.45, rad / 2); g.fill(); }
    else { g.fillStyle = '#1a1234'; rr(g, wx, wy, ww, wh, rad); g.fill(); g.strokeStyle = 'rgba(170,150,230,.25)'; g.lineWidth = 1; g.stroke(); }
  }
  function drawLayer(img, f, oy) { const ox = -(((camX * f) % 1280) + 1280) % 1280; x.drawImage(img, ox, oy, 1280, H); x.drawImage(img, ox + 1280, oy, 1280, H); }
  function drawBuilding(b) {
    let fc = facades.get(b); if (!fc) { fc = makeFacade(b); facades.set(b, fc); }
    const fx = Math.round(b.x0 - camX) - 3, fy = Math.round(b.y - camY), fw = fc.width / dpr;
    x.drawImage(fc, fx, fy, fw, FH); if (fy + FH < H) { x.fillStyle = '#1c1440'; x.fillRect(fx, fy + FH, fw, H - fy - FH); }
  }
  function drawDecor(d) {
    const sx = d.x - camX, sy = d.y - camY, s = d.s; if (sx < -60 || sx > W + 60) return;
    x.save(); x.translate(sx, sy); x.scale(s, s);
    if (d.k === 0 && art.tank) { const th = 58; x.drawImage(art.tank, -th / 2, -th + 3, th, th); }
    else if (d.k === 0) { // water tank
      x.fillStyle = '#2a1a44'; x.fillRect(-14, -24, 3, 24); x.fillRect(11, -24, 3, 24); x.fillRect(-14, -14, 28, 2);
      x.fillStyle = '#5b3f78'; rr(x, -18, -56, 36, 34, 5); x.fill(); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(-18, -48, 36, 3); x.fillRect(-18, -36, 36, 3);
      x.fillStyle = '#6d4c8c'; x.beginPath(); x.moveTo(-20, -55); x.lineTo(0, -68); x.lineTo(20, -55); x.fill();
    } else if (d.k === 1) { // antenna with blinking light
      x.strokeStyle = '#4a3468'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -70); x.moveTo(-10, -48); x.lineTo(10, -48); x.moveTo(-6, -60); x.lineTo(6, -60); x.stroke();
      const on = Math.sin(T * 3 + d.ph) > 0; x.fillStyle = on ? '#ff6b81' : '#5a2030'; ell(x, 0, -72, 3, 3); if (on) { x.fillStyle = 'rgba(255,107,129,.25)'; ell(x, 0, -72, 9, 9); }
    } else { // AC unit
      x.fillStyle = '#3e2c5c'; rr(x, -16, -18, 32, 18, 3); x.fill(); x.strokeStyle = '#5d4682'; x.lineWidth = 1.5; x.beginPath(); x.arc(-6, -9, 6, 0, TAU); x.stroke();
      x.save(); x.translate(-6, -9); x.rotate(T * 8 + d.ph); x.beginPath(); x.moveTo(-5, 0); x.lineTo(5, 0); x.moveTo(0, -5); x.lineTo(0, 5); x.stroke(); x.restore();
    }
    x.restore();
  }
  function drawWall(c) {
    const sx = c.x0 - camX, w = c.x1 - c.x0, sy = c.y - camY, bot = surf(c.x0 - 1) - camY, h = bot - sy;
    x.fillStyle = '#7a4a6a'; rr(x, sx, sy, w, h + 2, 3); x.fill();
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = sy + 9; yy < sy + h; yy += 8) x.fillRect(sx + 1, yy, w - 2, 1.5);
    x.save(); rr(x, sx - 2, sy - 2, w + 4, 8, 3); x.clip(); x.fillStyle = '#ffd166'; x.fillRect(sx - 2, sy - 2, w + 4, 8); x.fillStyle = '#2a1a40';
    for (let k = -8; k < w + 8; k += 9) { x.beginPath(); x.moveTo(sx + k, sy + 6); x.lineTo(sx + k + 5, sy + 6); x.lineTo(sx + k + 10, sy - 2); x.lineTo(sx + k + 5, sy - 2); x.fill(); }
    x.restore();
  }
  function drawSign(s) {
    const sx = s.x - camX, by = s.bottom - camY, ty = by - 40; if (sx > W + 10 || sx + s.w < -10) return;
    if (art.sign) {
      const iw = s.w * 1.16, ih = iw * 0.5 * 1.45, ix = sx - (s.w * 0.08), iy = by - ih * (220 / 256), flick = Math.sin(T * 23 + s.ph) > 0.93 ? 0.55 : 1;
      x.strokeStyle = '#b48ee6'; x.lineWidth = 2.5; x.beginPath(); for (const cx of [0.225, 0.78]) { x.moveTo(ix + iw * cx, iy + ih * 0.06); x.lineTo(ix + iw * cx, -10); } x.stroke();
      x.globalAlpha = flick; x.drawImage(art.sign, ix, iy, iw, ih); x.globalAlpha = 1;
      const cy = iy + ih * (162 / 256); x.font = `600 ${s.text.length > 6 ? 12 : 16}px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = s.col; x.globalAlpha = 0.5 * flick; x.fillText(s.text, sx + s.w / 2 + 1, cy + 1); x.globalAlpha = flick; x.fillStyle = '#fff8fd'; x.fillText(s.text, sx + s.w / 2, cy);
      x.globalAlpha = 1; x.textBaseline = 'alphabetic'; return;
    }
    x.strokeStyle = '#6b5a8a'; x.lineWidth = 2; x.beginPath(); x.moveTo(sx + 10, ty); x.lineTo(sx + 10, -10); x.moveTo(sx + s.w - 10, ty); x.lineTo(sx + s.w - 10, -10); x.stroke();
    const flick = Math.sin(T * 23 + s.ph) > 0.93 ? 0.35 : 1;
    x.fillStyle = 'rgba(14,8,30,.92)'; rr(x, sx, ty, s.w, 40, 8); x.fill();
    x.globalAlpha = 0.25 * flick; x.strokeStyle = s.col; x.lineWidth = 8; rr(x, sx, ty, s.w, 40, 8); x.stroke();
    x.globalAlpha = flick; x.lineWidth = 2.5; x.stroke(); x.globalAlpha = 1;
    x.font = `600 ${s.text.length > 6 ? 13 : 18}px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = s.col; x.globalAlpha = 0.35 * flick; x.fillText(s.text, sx + s.w / 2 + 1, by - 19); x.globalAlpha = flick; x.fillStyle = '#fff8fd'; x.fillText(s.text, sx + s.w / 2, by - 20);
    x.globalAlpha = 1; x.textBaseline = 'alphabetic';
  }
  function drawPad(p) {
    const sx = p.x - camX, sy = p.y - camY; if (sx > W || sx + p.w < 0) return;
    if (art.boost) { const iw = p.w + 16, ih = iw * 0.5 * 0.62; x.fillStyle = `rgba(60,240,230,${0.12 + Math.sin(T * 6) * 0.05})`; ell(x, sx + p.w / 2, sy - 4, iw * 0.6, 12); x.drawImage(art.boost, sx - 8, sy - ih + 5, iw, ih); return; }
    x.fillStyle = 'rgba(60,255,143,.18)'; rr(x, sx - 4, sy - 10, p.w + 8, 14, 7); x.fill();
    x.fillStyle = '#1b3a35'; rr(x, sx, sy - 5, p.w, 7, 3); x.fill();
    for (let i = 0; i < 4; i++) { const k = ((T * 2.2 + i / 4) % 1), cx = sx + 6 + k * (p.w - 16); x.globalAlpha = Math.sin(k * Math.PI); x.strokeStyle = '#3cff8f'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx, sy - 5); x.lineTo(cx + 5, sy - 1.5); x.lineTo(cx, sy + 2); x.stroke(); }
    x.globalAlpha = 1;
  }
  function drawCoin(cx, cy, r, t) {
    const sxs = Math.abs(Math.cos(t)) * 0.75 + 0.25;
    x.save(); x.translate(cx, cy); x.fillStyle = 'rgba(255,209,102,.18)'; ell(x, 0, 0, r * 1.6, r * 1.6); x.scale(sxs, 1);
    x.fillStyle = '#c98f22'; ell(x, 0, 0, r, r); x.fillStyle = '#ffd166'; ell(x, -0.6, -0.6, r * 0.82, r * 0.82);
    if (sxs > 0.5) { x.fillStyle = '#9a6a10'; ell(x, -r * 0.3, -r * 0.18, r * 0.11, r * 0.15); ell(x, r * 0.3, -r * 0.18, r * 0.11, r * 0.15); x.strokeStyle = '#9a6a10'; x.lineWidth = 1.4; x.beginPath(); x.arc(0, r * 0.05, r * 0.38, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.7)'; ell(x, -r * 0.4, -r * 0.45, r * 0.18, r * 0.1, -0.6); x.restore();
  }
  function tag(text, cx, cy, bg, fg = '#fff') {
    x.font = `600 11px ${F}`; const w = x.measureText(text).width + 12; x.fillStyle = bg; rr(x, cx - w / 2, cy - 9, w, 16, 8); x.fill();
    x.fillStyle = fg; x.textAlign = 'center'; x.fillText(text, cx, cy + 3);
  }
  function bubble(text, cx, cy, k) {
    const s = Math.min(1, k * 6); x.save(); x.translate(cx, cy); x.scale(s, s); x.font = `600 12px ${F}`; const w = x.measureText(text).width + 16;
    x.fillStyle = '#fbf6ea'; rr(x, -w / 2, -24, w, 22, 11); x.fill(); x.beginPath(); x.moveTo(-5, -3); x.lineTo(0, 5); x.lineTo(5, -3); x.fill();
    x.fillStyle = '#21153a'; x.textAlign = 'center'; x.fillText(text, 0, -9); x.restore();
  }
  function drawRunner(r) {
    const sx = r.x - camX, sy = r.y - camY; if (sx < -60 || sx > W + 60) return;
    const near = !r.you && Math.abs(r.x - you.x) < 34 && Math.abs(r.y - you.y) < 44, alpha = r.you ? 1 : near ? 0.45 : 0.93;
    if (r.boost > 0) { for (let k = 3; k >= 1; k--) { if (r.spr) drawChar(x, r.spr, r.color, sx - k * 13, sy, (r.sh || 46), { alpha: 0.13 * (4 - k) * alpha, slide: r.slide, air: true, noShadow: true }); else { x.fillStyle = r.color; x.globalAlpha = 0.12 * (4 - k) * alpha; ell(x, sx - k * 12, sy - 15, 14, 14 * (r.slide ? 0.6 : 1)); } } }
    x.globalAlpha = 1;
    const mood = r.stun > 0 ? 'dizzy' : r.fin || r.boost > 0 ? 'cheer' : r.bubT > 0 && SAY.ouch.includes(r.bub) ? 'sad' : 'happy';
    if (r.spr) drawChar(x, r.spr, r.color, sx, sy, (r.sh || 46), { squash: clamp(r.sq, -0.3, 0.38), slide: r.slide, run: r.phase, air: !r.gnd, alpha, tilt: r.gnd ? 0 : clamp(r.vy / 3000, -0.2, 0.2) + (r.stun > 0 ? Math.sin(T * 14) * 0.12 : 0) });
    else drawBlob(x, sx, sy, 15, r.color, { squash: r.slide ? 0.38 : clamp(r.sq, -0.35, 0.42), run: r.phase, air: !r.gnd, blink: r.blinkT < 0, mood, alpha, tilt: r.gnd ? 0 : clamp(r.vy / 4000, -0.15, 0.15) });
    if (r.stun > 0) { const hy = sy - (r.spr ? (r.sh || 46) - 4 : 34); for (let i = 0; i < 3; i++) { const a = T * 6 + i * TAU / 3; x.fillStyle = '#ffd166'; x.font = `600 11px ${F}`; x.textAlign = 'center'; x.fillText('★', sx + Math.cos(a) * 15, hy + Math.sin(a) * 4); } }
    const ty = r.tagY - camY;
    x.globalAlpha = r.you ? 1 : near ? 0.6 : 1;
    if (r.you) tag('YOU', sx, ty, meColor, '#160f2a'); else tag(r.name, sx, ty, 'rgba(18,12,34,.82)');
    x.globalAlpha = 1;
    if (r.bubT > 0) bubble(r.bub, sx, ty - 12, 2.2 - r.bubT);
  }
  function placeTags() {
    const top = (r) => (r.spr ? (r.slide ? (r.sh || 46) * 0.5 + 12 : (r.sh || 46) + 12) : r.slide ? 30 : 44);
    you.tagY = you.y - top(you);
    for (let i = 0; i < rivals.length; i++) { const r = rivals[i]; let ty = r.y - top(r);
      for (let tries = 0; tries < 4; tries++) { let hit = Math.abs(r.x - you.x) < 54 && Math.abs(ty - you.tagY) < 17;
        for (let j = 0; j < i && !hit; j++) hit = Math.abs(r.x - rivals[j].x) < 54 && Math.abs(ty - rivals[j].tagY) < 17;
        if (!hit) break; ty -= 18; }
      r.tagY = ty; }
  }
  function drawFinish() {
    const sx = FIN - camX, sy = C.finY - camY; if (sx < -200 || sx > W + 200) return;
    for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#fbf6ea' : '#1b1230'; x.fillRect(sx - 6, sy + i * 2 - 2, 6, 2); x.fillStyle = i % 2 ? '#1b1230' : '#fbf6ea'; x.fillRect(sx, sy + i * 2 - 2, 6, 2); }
    x.fillStyle = '#c9b6ff'; x.fillRect(sx - 64, sy - 150, 6, 150); x.fillRect(sx + 58, sy - 150, 6, 150);
    x.save(); x.translate(sx, sy - 140); x.rotate(Math.sin(T * 2) * 0.015);
    const bw = 124, cells = 12; for (let i = 0; i < cells; i++) for (let j = 0; j < 3; j++) { x.fillStyle = (i + j) % 2 ? '#fbf6ea' : '#1b1230'; x.fillRect(-bw / 2 + i * bw / cells, j * 8, bw / cells + 0.5, 8.5); }
    x.fillStyle = '#ff8fb8'; rr(x, -38, 26, 76, 20, 10); x.fill(); x.fillStyle = '#160f2a'; x.font = `600 13px ${F}`; x.textAlign = 'center'; x.fillText('FINISH', 0, 41);
    x.restore();
  }
  function placeStr(n) { return ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`; }
  function fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; }
  function computeOrder() { for (let i = 0; i < runners.length; i++) ord[i] = runners[i]; ord.sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.x - a.x)); }
  function panel(px, py, w, h) { x.fillStyle = 'rgba(20,13,38,.9)'; rr(x, px, py, w, h, 22); x.fill(); x.strokeStyle = 'rgba(155,124,240,.9)'; x.lineWidth = 2; x.stroke(); x.strokeStyle = 'rgba(201,182,255,.18)'; x.lineWidth = 1; rr(x, px + 5, py + 5, w - 10, h - 10, 18); x.stroke(); }
  function button(b, label, primary, hot) {
    const s = hot ? 1 + Math.sin(T * 5) * 0.025 : 1; x.save(); x.translate(b.x + b.w / 2, b.y + b.h / 2); x.scale(s, s);
    x.fillStyle = 'rgba(0,0,0,.3)'; rr(x, -b.w / 2, -b.h / 2 + 4, b.w, b.h, b.h / 2); x.fill();
    x.fillStyle = primary ? '#ffd166' : '#9b7cf0'; rr(x, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; rr(x, -b.w / 2 + 8, -b.h / 2 + 4, b.w - 16, b.h * 0.35, b.h / 4); x.fill();
    x.fillStyle = '#160f2a'; x.font = `600 17px ${F}`; x.textAlign = 'center'; x.fillText(label, 0, 6); x.restore();
  }
  function txt(s, px, py, size, color, align = 'center', weight = 600) { x.font = `${weight} ${size}px ${F}`; x.textAlign = align; x.fillStyle = color; x.fillText(s, px, py); }
  function draw() {
    x.save();
    if (shake > 0) x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    if (art.sky) { const sh = H * 1.12, sw = sh * art.sky.naturalWidth / art.sky.naturalHeight; x.drawImage(art.sky, -clamp(camX / FIN, 0, 1) * (sw - W), -12 - (camY - 30) * 0.03, sw, sh); }
    else x.drawImage(sky, 0, 0, W, H);
    for (let i = 0; i < 6; i++) { const tw = Math.sin(T * 2 + i * 1.7); if (tw > 0.6) { x.fillStyle = `rgba(255,246,234,${tw - 0.4})`; const sx = (i * 113 + 40) % W, sy = 20 + (i * 47) % 140; x.fillRect(sx - 2, sy, 5, 1); x.fillRect(sx, sy - 2, 1, 5); } }
    if (art.far) { const bot = drawTiled(art.far, 0.62, 0.1, -150 - (camY - 30) * 0.1); if (bot < H) { x.fillStyle = '#3a2d68'; x.fillRect(0, bot - 1, W, H - bot + 1); } }
    else drawLayer(farL, 0.12, -10 - (camY - 30) * 0.1);
    const hz = x.createLinearGradient(0, 200, 0, H); hz.addColorStop(0, 'rgba(106,45,110,0)'); hz.addColorStop(1, 'rgba(106,45,110,.35)'); x.fillStyle = hz; x.fillRect(0, 200, W, H - 200);
    if (art.near) { const bot = drawTiled(art.near, 0.72, 0.26, -128 - (camY - 30) * 0.22); if (bot < H) { x.fillStyle = '#2a1f52'; x.fillRect(0, bot - 1, W, H - bot + 1); } }
    else drawLayer(midL, 0.32, 30 - (camY - 30) * 0.22);
    for (const b of blds) if (b.x1 > camX - 10 && b.x0 < camX + W + 10) drawBuilding(b);
    if (facades.size > 4) for (const b of facades.keys()) if (b.x1 < camX - 40 || b.x0 > camX + W + 40) facades.delete(b);
    for (const d of decor) drawDecor(d);
    for (const c of cols) if (c.wall && c.x1 > camX && c.x0 < camX + W) drawWall(c);
    for (const p of pads) drawPad(p);
    drawFinish();
    if (camX < 260) { const sx = 0 - camX, sy = 300 - camY; for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#fbf6ea' : '#1b1230'; x.fillRect(sx, sy + i * 2 - 2, 6, 2); } }
    for (let i = 0; i < coins.length; i++) { const c = coins[i]; if (c.x < camX - 20) continue; if (c.x > camX + W + 20) break; if (!got[i]) drawCoin(c.x - camX, c.y - camY + Math.sin(T * 3 + c.x * 0.05) * 2, 9, T * 4 + c.x * 0.02); }
    placeTags(); for (const r of rivals) drawRunner(r);
    drawRunner(you);
    for (const s of signs) drawSign(s);
    for (const p of P) { if (!p.a) continue; const k = p.l / p.m, sx = p.x - camX, sy = p.y - camY;
      if (p.k === 0) { x.fillStyle = p.c + (0.55 * k).toFixed(3) + ')'; ell(x, sx, sy, p.s * (1.6 - k * 0.6), p.s * (1.6 - k * 0.6)); }
      else if (p.k === 1) { x.fillStyle = p.c + k.toFixed(3) + ')'; ell(x, sx, sy, p.s * k + 0.5, p.s * k + 0.5); }
      else { x.save(); x.translate(sx, sy); x.rotate(p.rot); x.globalAlpha = Math.min(1, k * 2); x.fillStyle = p.c; x.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s); x.restore(); } }
    for (const p of pops) if (p.t > 0) { x.globalAlpha = Math.min(1, p.t * 2); x.font = `600 ${16 + (0.9 - p.t) * 6}px ${F}`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(20,12,36,.85)'; x.strokeText(p.s, p.x - camX, p.y - camY); x.fillStyle = p.c; x.fillText(p.s, p.x - camX, p.y - camY); x.globalAlpha = 1; }
    if (you.boost > 0 && state === 'race') { x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1.5; x.globalAlpha = Math.min(1, you.boost * 1.5); x.beginPath(); for (const l of lines) { x.moveTo(l.x, l.y); x.lineTo(l.x + l.l, l.y); } x.stroke(); x.globalAlpha = 1; }
    x.restore();
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(10,6,22,0)'); vg.addColorStop(1, 'rgba(10,6,22,.45)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
    if (state !== 'title' && state !== 'loading') hud();
    if (state === 'count') { const n = Math.ceil(cd), f = cd - Math.floor(cd), s = 1 + f * 0.6; x.save(); x.translate(W / 2, H / 2 - 30); x.scale(s, s); x.globalAlpha = Math.min(1, f * 3 + 0.2); x.font = `600 72px ${F}`; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#160f2a'; x.strokeText(String(n), 0, 24); x.fillStyle = '#ffd166'; x.fillText(String(n), 0, 24); x.restore(); }
    if (state === 'race' && raceT < 0.8) { x.save(); x.translate(W / 2, H / 2 - 30); x.scale(1 + raceT * 0.5, 1 + raceT * 0.5); x.globalAlpha = 1 - raceT / 0.8; x.font = `600 72px ${F}`; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#160f2a'; x.strokeText('GO!', 0, 24); x.fillStyle = '#3cff8f'; x.fillText('GO!', 0, 24); x.restore(); }
    if (state === 'finish') { const k = Math.min(1, (2.3 - finT) * 4), s = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)); x.save(); x.translate(W / 2, 150); x.scale(s, s); x.font = `600 54px ${F}`; x.textAlign = 'center'; x.lineWidth = 9; x.strokeStyle = '#160f2a'; const t = rank === 1 ? 'FIRST PLACE!' : `FINISH! ${placeStr(rank)}`; x.strokeText(t, 0, 0); x.fillStyle = rank === 1 ? '#ffd166' : '#c9b6ff'; x.fillText(t, 0, 0); x.restore(); }
    if (state === 'title') titleCard(); else if (state === 'results') resultsCard();
    else if (state === 'loading') { x.fillStyle = 'rgba(12,8,28,.55)'; x.fillRect(0, 0, W, H); panel(W / 2 - 150, H / 2 - 56, 300, 112); txt('Rooftop Run', W / 2, H / 2 - 14, 26, '#ffd166');
      x.fillStyle = 'rgba(155,124,240,.3)'; rr(x, W / 2 - 100, H / 2 + 12, 200, 10, 5); x.fill(); x.fillStyle = '#9b7cf0'; rr(x, W / 2 - 100, H / 2 + 12, Math.max(10, 200 * (loadOf ? loadN / loadOf : 0)), 10, 5); x.fill();
      txt('loading the rooftops…', W / 2, H / 2 + 42, 12, '#c9b6ff', 'center', 500); }
  }
  function hud() {
    computeOrder(); const place = rank || ord.indexOf(you) + 1;
    x.fillStyle = 'rgba(20,13,38,.82)'; rr(x, 12, 12, 164, 56, 16); x.fill(); x.strokeStyle = 'rgba(155,124,240,.6)'; x.lineWidth = 1.5; x.stroke();
    txt(placeStr(place), 26, 46, 30, place === 1 ? '#ffd166' : place === 2 ? '#e4dcff' : place === 3 ? '#ffb38a' : '#ff8fb8', 'left');
    txt('/4', 26 + x.measureText(placeStr(place)).width + 3, 46, 14, '#9b88c9', 'left');
    txt(fmt(you.fin || raceT), 164, 36, 14, '#c9b6ff', 'right', 500); txt('time', 164, 53, 10, '#7f6fa8', 'right', 500);
    x.fillStyle = 'rgba(20,13,38,.82)'; rr(x, 184, 12, 80, 30, 15); x.fill(); drawCoin(202, 27, 8, T * 3); txt(`× ${coinN}`, 216, 32, 14, '#ffd166', 'left');
    const bx = 284, bw = 180, by = 27; x.fillStyle = 'rgba(20,13,38,.82)'; rr(x, bx - 10, 12, bw + 36, 30, 15); x.fill();
    x.fillStyle = 'rgba(155,124,240,.35)'; rr(x, bx, by - 3, bw, 6, 3); x.fill();
    x.fillStyle = '#9b7cf0'; rr(x, bx, by - 3, Math.max(6, bw * clamp(you.x / FIN, 0, 1)), 6, 3); x.fill();
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#fbf6ea' : '#1b1230'; x.fillRect(bx + bw + 4, by - 8 + i * 4, 4, 4); x.fillStyle = i % 2 ? '#1b1230' : '#fbf6ea'; x.fillRect(bx + bw + 8, by - 8 + i * 4, 4, 4); }
    for (const r of runners) { const mx = bx + bw * clamp(r.x / FIN, 0, 1); x.fillStyle = r.you ? '#fff' : 'rgba(20,13,38,.9)'; ell(x, mx, by, r.you ? 7 : 5.5, r.you ? 7 : 5.5); x.fillStyle = r.color; ell(x, mx, by, r.you ? 5 : 4, r.you ? 5 : 4); }
    if (touchSeen && state === 'race') { const b = BT.slide; x.fillStyle = tDown ? 'rgba(155,124,240,.45)' : 'rgba(20,13,38,.45)'; rr(x, b.x, b.y, b.w, b.h, 20); x.fill(); x.strokeStyle = 'rgba(201,182,255,.5)'; x.lineWidth = 1.5; x.stroke(); txt('▼', b.x + b.w / 2, b.y + 40, 24, '#fbf6ea'); txt('slide', b.x + b.w / 2, b.y + 64, 13, '#c9b6ff'); txt('tap anywhere to jump', W - 16, H - 16, 12, 'rgba(228,220,255,.55)', 'right', 500); }
  }
  function titleCard() {
    x.fillStyle = 'rgba(12,8,28,.35)'; x.fillRect(0, 0, W, H);
    panel(70, 40, 500, 346);
    x.save(); x.translate(W / 2, 96); x.rotate(Math.sin(T * 1.5) * 0.015); x.font = `600 46px ${F}`; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#2a1650'; x.strokeText('Rooftop Run', 0, 0); x.fillStyle = '#ffd166'; x.fillText('Rooftop Run', 0, 0); x.restore();
    txt('Race the bonded agents across the neon rooftops to the checkered flag.', W / 2, 126, 15, '#e4dcff', 'center', 500);
    txt('Space / ↑ / W / tap  — jump (hold = higher, press again to double jump)', W / 2, 152, 13, '#c9b6ff', 'center', 500);
    txt('↓ / S  — slide under signs  ·  boost pads = speed  ·  falling costs time', W / 2, 171, 13, '#c9b6ff', 'center', 500);
    const all = [you, ...rivals], gap = 108, x0 = W / 2 - gap * (all.length - 1) / 2;
    all.forEach((r, i) => { const bx = x0 + i * gap, bob = Math.abs(Math.sin(T * 3 + i)) * 8; x.fillStyle = 'rgba(155,124,240,.12)'; ell(x, bx, 258, 34, 8);
      if (r.spr) drawChar(x, r.spr, r.color, bx, 258 - bob, 74, { squash: bob < 1.5 ? 0.06 : -0.03, air: true }); else drawBlob(x, bx, 258 - bob, 22, r.color, { squash: bob < 1.5 ? 0.12 : -0.05, blink: r.blinkT < 0, mood: r.you ? 'happy' : 'cheer', air: bob > 2, run: T * 6 + i });
      if (r.you) tag('YOU', bx, 280, meColor, '#160f2a'); else tag(r.name, bx, 280, 'rgba(255,255,255,.12)'); });
    txt('VS', x0 + gap / 2, 238, 16, '#ff8fb8');
    button(BT.start, 'Start  (Space / tap)', true, true);
    if (best) txt(`best time ${fmt(best)}`, W / 2, 374, 12, '#9b88c9', 'center', 500);
  }
  function resultsCard() {
    x.fillStyle = 'rgba(12,8,28,.45)'; x.fillRect(0, 0, W, H); computeOrder();
    const k = Math.min(1, resT * 4), e = 1 - Math.pow(1 - k, 3); x.save(); x.translate(W / 2, H / 2); x.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e); x.globalAlpha = e; x.translate(-W / 2, -H / 2);
    panel(40, 40, 560, 346);
    txt(rank === 1 ? 'You won! 🏆' : `You finished ${placeStr(rank)}`, W / 2, 84, 32, rank === 1 ? '#ffd166' : '#fbf6ea');
    for (let i = 0; i < ord.length; i++) { const r = ord[i], ry = 126 + i * 44;
      x.fillStyle = r.you ? 'rgba(155,124,240,.28)' : 'rgba(255,255,255,.05)'; rr(x, 64, ry - 20, 262, 40, 14); x.fill();
      x.fillStyle = ['#ffd166', '#d9d2ec', '#e29b6a', '#6c5a92'][i]; ell(x, 86, ry, 12, 12); txt(String(i + 1), 86, ry + 5, 14, '#160f2a');
      if (r.spr) drawChar(x, r.spr, r.color, 118, ry + 17, 34, { air: true, noShadow: true }); else drawBlob(x, 118, ry + 12, 12, r.color, { mood: r.fin && i === 0 ? 'cheer' : 'happy', blink: r.blinkT < 0 });
      txt(r.you ? 'YOU' : r.name, 140, ry + 5, 15, '#fbf6ea', 'left'); txt(r.fin ? fmt(r.fin) : 'running…', 314, ry + 5, 14, r.fin ? '#c9b6ff' : '#7f6fa8', 'right', 500); }
    const sx = 350; const row = (l, v, y, c = '#fbf6ea') => { txt(l, sx, y, 13, '#9b88c9', 'left', 500); txt(v, 576, y, 17, c, 'right'); };
    row('Your time', fmt(lastTime), 122); row('Coins', `${coinN}  (+${coinN * 30})`, 150, '#ffd166'); row('Time bonus', `${Math.max(0, Math.round((150 - lastTime) * 100))}`, 178);
    x.fillStyle = 'rgba(155,124,240,.4)'; x.fillRect(sx, 192, 226, 1.5);
    row('Score', score.toLocaleString(), 216, '#3cff8f'); row('Best time', fmt(best), 244, '#c9b6ff');
    if (newBest && Math.sin(T * 8) > -0.3) { x.save(); x.translate(464, 276); x.rotate(-0.06); x.fillStyle = '#ff8fb8'; rr(x, -58, -15, 116, 28, 14); x.fill(); txt('NEW BEST!', 0, 6, 16, '#160f2a'); x.restore(); }
    button(BT.again, 'Play again', true, true); button(BT.back, 'Back to the world', false, false);
    txt('Space / Enter to race again · Esc to leave', W / 2, 374, 11, '#7f6fa8', 'center', 500);
    x.restore();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (paused) { last = 0; return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    for (let i = 0; i < tSpeed; i++) update(dt);
    draw();
  }
  raf = requestAnimationFrame(loop);
  if (_test) _test.peek = () => ({ state, raceT, you: { x: you.x, y: you.y, fin: you.fin }, rivals: rivals.map((r) => ({ n: r.name, x: Math.round(r.x), fin: r.fin })), coinN, rank, score, FIN });
  return { close };
}
