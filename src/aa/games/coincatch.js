// Coin Catcher: a portrait arcade minigame. You are a blob with a golden tray at the bottom of a neon market street.
// Catch falling coins (they pile up on your tray, every 10 are banked and the pace rises), dodge the red RUG crates.
// Three rival agents play their own narrow lanes on the right at the same time, with a live leaderboard and emotes.
// One self-contained module: canvas only, WebAudio synth, no network, no external assets.

const W = 480, H = 640, FW = 352;                    // canvas size, play-field width
const PX = 360, LW = 34, LG = 5, LT = 122, LB = 424; // rival lanes: x, lane width, gap, top, bottom
const PR = 24, PY = 594, TRAY_BLOB = PY - PR * 1.55, TRAY_HALF = 46, GROUND = 622;
const FONT = 'Fredoka, system-ui, sans-serif';
const PASTEL = ['#8cc8ff', '#ff8fb8', '#7ad7c4', '#ffd166', '#b8e07a', '#c9a6ff'];
const C = { bg: '#130e22', plum: '#1d1033', lav: '#9b7cf0', lav2: '#c9b6ff', gold: '#ffd166', gold2: '#f0b440', mint: '#3cff8f', mint2: '#7ad7c4', pink: '#ff8fb8', red: '#ff6b81', cream: '#fbf6ea', ink: '#1b1230' };
const VAL = { coin: 1, agent: 5, gem: 10 };
const CHEER = ['gm', 'too easy', 'LFG', 'wagmi', 'ez', 'stacking'], OUCH = ['rugged!', 'ngmi', 'ouch', 'my bags!'], NICE = ['nice one', 'gg', 'ok ok', 'LFG'];
const STACK_ROWS = [4, 3, 2, 1];
const R = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (a) => a[(Math.random() * a.length) | 0];
const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const tintCache = new Map();
function tint(hex, k) { // k > 0 mixes towards white, k < 0 towards black
  const key = hex + k; let v = tintCache.get(key); if (v) return v;
  let h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16), m = k > 0 ? 255 : 0, a = Math.abs(k);
  const ch = (s) => Math.round(((n >> s) & 255) * (1 - a) + m * a);
  v = `rgb(${ch(16)},${ch(8)},${ch(0)})`; tintCache.set(key, v); return v;
}

// A real character sprite (cropped PNG of the 3D character, see prepChar) drawn bottom-anchored with squash/stretch and
// hit / catch / knocked-out tints. Same placement contract as drawBlob: (x, y) is the body centre, feet at y + r.
function drawSprite(c, x, y, r, o) {
  const im = o.img, sq = o.squash || 0;
  let h = r * (o.tall || 2.6), w = h * im.ar; const maxW = r * 2.9; if (w > maxW) { w = maxW; h = w / im.ar; }
  c.save(); c.translate(x, y + r * 1.05); c.scale(1 + sq, 1 - sq);
  c.drawImage(im.cv, -w / 2, -h, w, h);
  const ov = o.mood === 'hurt' ? [im.red, 0.55] : o.mood === 'sad' ? [im.dark, 0.5] : o.mood === 'big' ? [im.white, 0.22] : null;
  if (ov) { c.globalAlpha = ov[1]; c.drawImage(ov[0], -w / 2, -h, w, h); }
  c.restore(); return h;
}

// One blob for everyone: soft egg body, glossy eyes, blush, tiny smile, nub arms. squash > 0 = flatter, < 0 = taller.
// When o.img (a prepared character sprite) is given, the real character is drawn instead.
function drawBlob(c, x, y, r, color, o = {}) {
  if (o.img && o.img.ok) return drawSprite(c, x, y, r, o);
  const sq = o.squash || 0, look = o.look || 0, mood = o.mood || 'happy';
  c.save(); c.translate(x, y + r);
  c.fillStyle = 'rgba(8,4,20,.28)'; c.beginPath(); c.ellipse(0, 0, r * 0.95 * (1 + sq), r * 0.22, 0, 0, Math.PI * 2); c.fill();
  c.scale(1 + sq, 1 - sq); c.translate(0, -r);
  const dark = tint(color, -0.18);
  if (o.arms === 'up') { // arms reaching up to hold a tray
    c.strokeStyle = dark; c.lineCap = 'round'; c.lineWidth = r * 0.34;
    c.beginPath(); c.moveTo(-r * 0.75, -r * 0.05); c.quadraticCurveTo(-r * 1.25, -r * 0.6, -r * 1.25, -r * 1.42);
    c.moveTo(r * 0.75, -r * 0.05); c.quadraticCurveTo(r * 1.25, -r * 0.6, r * 1.25, -r * 1.42); c.stroke();
  } else {
    const wave = o.wave ? Math.sin(o.wave) * 0.5 : 0; c.fillStyle = dark;
    c.beginPath(); c.ellipse(-r * 0.98, r * 0.22, r * 0.2, r * 0.3, 0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(r * 0.98, r * 0.22 - wave * r * 0.5, r * 0.2, r * 0.3, -0.5 - wave, 0, Math.PI * 2); c.fill();
  }
  const g = c.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, tint(color, 0.45)); g.addColorStop(0.55, color); g.addColorStop(1, dark);
  c.fillStyle = g; c.beginPath(); c.moveTo(0, -r);
  c.bezierCurveTo(r * 0.62, -r, r * 1.04, -r * 0.48, r * 1.04, r * 0.12); c.bezierCurveTo(r * 1.04, r * 0.72, r * 0.6, r, 0, r);
  c.bezierCurveTo(-r * 0.6, r, -r * 1.04, r * 0.72, -r * 1.04, r * 0.12); c.bezierCurveTo(-r * 1.04, -r * 0.48, -r * 0.62, -r, 0, -r); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.58, r * 0.26, r * 0.14, -0.6, 0, Math.PI * 2); c.fill();
  const lx = look * r * 0.13, ey = -r * 0.1;
  c.fillStyle = 'rgba(255,143,184,.6)';
  c.beginPath(); c.ellipse(-r * 0.6 + lx * 0.5, r * 0.2, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); c.ellipse(r * 0.6 + lx * 0.5, r * 0.2, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = C.ink; c.strokeStyle = C.ink; c.lineCap = 'round'; c.lineWidth = Math.max(1.2, r * 0.09);
  if (mood === 'hurt') { // squeezed > < eyes
    for (const s of [-1, 1]) { const ex = s * r * 0.33 + lx; c.beginPath(); c.moveTo(ex - s * r * 0.12, ey - r * 0.12); c.lineTo(ex + s * r * 0.08, ey); c.lineTo(ex - s * r * 0.12, ey + r * 0.12); c.stroke(); }
  } else {
    const ry = o.blink ? r * 0.035 : r * (mood === 'wow' ? 0.25 : 0.21), rx = r * (mood === 'wow' ? 0.2 : 0.165);
    c.beginPath(); c.ellipse(-r * 0.33 + lx, ey, rx, ry, 0, 0, Math.PI * 2); c.ellipse(r * 0.33 + lx, ey, rx, ry, 0, 0, Math.PI * 2); c.fill();
    if (!o.blink) {
      c.fillStyle = '#fff'; c.beginPath();
      for (const s of [-1, 1]) { const ex = s * r * 0.33 + lx; c.moveTo(ex - rx * 0.25 + r * 0.07, ey - ry * 0.4); c.arc(ex - rx * 0.25, ey - ry * 0.4, r * 0.07, 0, Math.PI * 2); c.moveTo(ex + rx * 0.4 + r * 0.035, ey + ry * 0.35); c.arc(ex + rx * 0.4, ey + ry * 0.35, r * 0.035, 0, Math.PI * 2); }
      c.fill();
    }
  }
  c.lineWidth = Math.max(1, r * 0.075); c.beginPath();
  if (mood === 'sad' || mood === 'hurt') c.arc(lx * 0.6, r * 0.42, r * 0.13, Math.PI * 1.15, Math.PI * 1.85);
  else if (mood === 'wow') { c.fillStyle = C.ink; c.ellipse(lx * 0.6, r * 0.3, r * 0.09, r * 0.12, 0, 0, Math.PI * 2); c.fill(); }
  else if (mood === 'big') { c.fillStyle = '#5a1a3a'; c.arc(lx * 0.6, r * 0.2, r * 0.17, 0.1, Math.PI - 0.1); c.closePath(); c.fill(); }
  else c.arc(lx * 0.6, r * 0.18, r * 0.13, 0.35, Math.PI - 0.35);
  c.stroke(); c.restore();
}

function sprite(w, h, fn, k = 2) { const s = document.createElement('canvas'); s.width = Math.ceil(w * k); s.height = Math.ceil(h * k); const g = s.getContext('2d'); g.scale(k, k); fn(g, w, h); s.w = w; s.h = h; return s; }
function coinFace(g, cx, cy, r) {
  const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  gr.addColorStop(0, '#fff2bd'); gr.addColorStop(0.5, C.gold); gr.addColorStop(1, '#d08a1a');
  g.fillStyle = '#b9761a'; g.beginPath(); g.arc(cx, cy + r * 0.08, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(160,96,16,.55)'; g.lineWidth = r * 0.1; g.beginPath(); g.arc(cx, cy, r * 0.76, 0, Math.PI * 2); g.stroke();
}
function bigText(c, text, x, y, size, fill, stroke = 'rgba(19,10,40,.9)', lw = 6) {
  c.font = `600 ${size}px ${FONT}`; c.lineJoin = 'round'; c.strokeStyle = stroke; c.lineWidth = lw; c.strokeText(text, x, y); c.fillStyle = fill; c.fillText(text, x, y);
}
function heart(c, x, y, s, fill) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 1.1, y - s * 0.4, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.4, x, y + s * 0.35); c.fill();
}
function bubble(c, x, y, text, color, a, sc) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.font = `600 12px ${FONT}`; const w = c.measureText(text).width + 14;
  const bx = clamp(x - w / 2, PX - 70, W - w - 4);
  c.translate(x, y); c.scale(sc, sc); c.translate(-x, -y);
  c.fillStyle = C.cream; c.beginPath(); c.roundRect(bx, y - 22, w, 20, 10); c.moveTo(x - 4, y - 3); c.lineTo(x, y + 4); c.lineTo(x + 4, y - 3); c.fill();
  c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.roundRect(bx, y - 22, w, 20, 10); c.stroke();
  c.fillStyle = C.ink; c.textAlign = 'center'; c.fillText(text, bx + w / 2, y - 8); c.restore();
}

export function open({ me = { name: 'You', color: '#9b7cf0' }, agents = [], onClose = () => {}, autoplay = false } = {}) {
  const myColor = (me && me.color) || '#9b7cf0';
  let pool = (agents && agents.length ? agents : [{ name: 'DUVAL' }, { name: 'CUPSEY' }, { name: 'BWAM' }]).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  pool = pool.slice(0, 3); while (pool.length < 3) pool.push({ name: ['DUVAL', 'CUPSEY', 'BWAM'][pool.length] });
  const rivals = pool.map((a, i) => ({ name: String(a.name || 'AGENT').toUpperCase().slice(0, 9), color: a.color || PASTEL[i % PASTEL.length], items: [], idx: i, blinkT: R(1, 4) }));
  for (const a of rivals) for (let k = 0; k < 14; k++) a.items.push({ on: false, kind: 'coin', x: 0, y: 0, vy: 0, col: '' });

  // ---------- shell ----------
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(12,8,28,.82);font-family:${FONT}`;
  wrap.innerHTML = `<div style="position:relative;width:min(480px,calc(100vw - 24px),calc((100vh - 24px) * .75));aspect-ratio:3/4;max-height:calc(100vh - 24px);border-radius:22px;overflow:hidden;box-shadow:0 0 0 3px #9b7cf0,0 0 40px rgba(155,124,240,.35),0 30px 80px rgba(0,0,0,.6);background:#130e22">
    <canvas style="display:block;width:100%;height:100%;touch-action:none;cursor:pointer"></canvas>
    <button data-k="close" aria-label="Close Coin Catcher" style="position:absolute;right:10px;top:10px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(20,14,36,.85);box-shadow:0 0 0 2px rgba(155,124,240,.6);color:#fff;font:600 22px/1 ${FONT};cursor:pointer">×</button>
    <button data-k="mute" aria-label="Toggle sound" style="position:absolute;right:54px;top:10px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(20,14,36,.85);box-shadow:0 0 0 2px rgba(155,124,240,.6);color:#fff;font:16px/1 system-ui;cursor:pointer"></button></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; x.scale(dpr, dpr);
  const muteBtn = wrap.querySelector('[data-k=mute]');
  let muted = false; try { muted = localStorage.getItem('aa.games.mute') === '1'; } catch {}
  const showMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; }; showMute();
  let best = 0; try { best = Number(localStorage.getItem('aa.coincatch.best')) || 0; } catch {}

  // ---------- sound ----------
  let ac = null, master = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.45; master.connect(ac.destination); } catch { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(f, d, type = 'sine', v = 0.18, f2 = 0, delay = 0) {
    if (muted || !ac) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
  }
  function thud() {
    if (muted || !ac) return; tone(140, 0.35, 'square', 0.16, 45); tone(70, 0.4, 'sine', 0.3, 35);
    const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.35;
    n.buffer = b; n.connect(f); f.connect(g); g.connect(master); n.start();
  }
  const sfx = {
    coin: (h) => { const f = 880 * Math.pow(1.06, h); tone(f, 0.08, 'triangle', 0.16); tone(f * 1.5, 0.16, 'sine', 0.14, 0, 0.05); },
    big: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'triangle', 0.14, 0, i * 0.05)); },
    gem: () => { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.18, 'sine', 0.13, 0, i * 0.045)); },
    bank: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.06, 0, i * 0.07)); tone(1568, 0.5, 'triangle', 0.12, 0, 0.36); },
    magnet: () => tone(220, 0.5, 'sawtooth', 0.07, 880),
    blip: () => tone(660, 0.07, 'square', 0.06, 990),
    win: () => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.16, 0, i * 0.11)); },
    lose: () => { [440, 392, 330, 262].forEach((f, i) => tone(f, 0.24, 'triangle', 0.14, 0, i * 0.14)); },
  };

  // ---------- sprites ----------
  const SPR = {
    coin: sprite(30, 30, (g) => { coinFace(g, 15, 14, 13); g.fillStyle = '#8a5410'; g.beginPath(); g.arc(10.5, 11.5, 1.8, 0, 7); g.arc(19.5, 11.5, 1.8, 0, 7); g.fill(); g.strokeStyle = '#8a5410'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.arc(15, 14.5, 5, 0.35, Math.PI - 0.35); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(9, 7.5, 3.5, 1.8, -0.7, 0, 7); g.fill(); }),
    gem: sprite(34, 34, (g) => {
      const pts = [[17, 3], [29, 12], [17, 31], [5, 12]]; g.fillStyle = '#3fb8c9'; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill();
      g.fillStyle = C.mint2; g.beginPath(); g.moveTo(5, 12); g.lineTo(17, 3); g.lineTo(17, 31); g.fill();
      g.fillStyle = '#b8fff0'; g.beginPath(); g.moveTo(5, 12); g.lineTo(11, 7); g.lineTo(23, 7); g.lineTo(29, 12); g.lineTo(17, 15); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(10, 11); g.lineTo(14, 8); g.lineTo(16, 12); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.stroke();
    }),
    rug: sprite(46, 40, (g) => {
      g.fillStyle = '#8f2338'; g.beginPath(); g.roundRect(3, 5, 40, 33, 6); g.fill();
      g.fillStyle = C.red; g.beginPath(); g.roundRect(3, 3, 40, 32, 6); g.fill();
      g.fillStyle = '#e04a64'; for (let i = 0; i < 3; i++) g.fillRect(5, 9 + i * 9, 36, 2);
      g.strokeStyle = '#ffd0d8'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(4.5, 4.5, 37, 29, 5); g.stroke();
      g.fillStyle = '#5a0f22'; g.beginPath(); g.roundRect(8, 12, 30, 14, 4); g.fill();
      g.fillStyle = '#fff'; g.font = `600 13px ${FONT}`; g.textAlign = 'center'; g.fillText('RUG', 23, 23.5);
      g.fillStyle = '#ffd0d8'; for (const [a, b] of [[7, 7], [39, 7], [7, 31], [39, 31]]) { g.beginPath(); g.arc(a, b, 1.6, 0, 7); g.fill(); }
    }),
    magnet: sprite(40, 40, (g) => {
      g.lineCap = 'butt'; g.strokeStyle = '#c98a1c'; g.lineWidth = 11; g.beginPath(); g.arc(20, 18, 11, Math.PI, 0, true); g.stroke();
      const gr = g.createLinearGradient(0, 6, 0, 30); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(1, C.gold2);
      g.strokeStyle = gr; g.lineWidth = 8; g.beginPath(); g.arc(20, 18, 11, Math.PI, 0, true); g.stroke();
      g.fillStyle = C.gold2; g.fillRect(5, 6, 10, 14); g.fillRect(25, 6, 10, 14);
      g.fillStyle = '#fff'; g.fillRect(5, 4, 10, 6); g.fillRect(25, 4, 10, 6);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(7, 12, 2, 7);
    }),
    agent: new Map(),
  };
  function agentCoin(col) {
    let s = SPR.agent.get(col); if (s) return s;
    const who = col === myColor ? meChar : (rivals.find((a) => a.color === col) || {}).char;
    s = sprite(42, 42, (g) => {
      if (ART.coin) g.drawImage(ART.coin, 0, 0, 42, 42); else coinFace(g, 21, 20, 18);
      const cx = ART.coin ? 20.3 : 21, cy = ART.coin ? 20.3 : 20, rr = ART.coin ? 12.6 : 13;
      g.save(); g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.clip();
      const gr = g.createRadialGradient(cx - 4, cy - 5, 1, cx, cy, rr); gr.addColorStop(0, tint(col, 0.5)); gr.addColorStop(1, tint(col, -0.15)); g.fillStyle = gr; g.fillRect(0, 0, 42, 42);
      if (who && who.ok) { const ww = rr * 2.3, hh = ww / who.ar; g.drawImage(who.cv, cx - ww / 2, cy - rr + 1.5, ww, hh); } else drawBlob(g, cx, cy + 1, 9, col, {});
      g.restore(); g.strokeStyle = 'rgba(150,90,10,.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(cx - 7, cy - 8, 4.5, 2, -0.7, 0, 7); g.fill();
    }, 4);
    SPR.agent.set(col, s); return s;
  }
  const blitSpin = (s, px, py, scale, spin) => { const sw = s.w * scale, sh = s.h * scale, k = spin; x.drawImage(s, px - (sw * k) / 2, py - sh / 2, sw * k, sh); };

  // ---------- art + character sprites (loaded async; the drawn versions above stay as fallbacks) ----------
  const ART = {}, ART_FILES = ['bg.jpg', 'coin.png', 'gem.png', 'rug.png', 'magnet.png', 'tray.png'];
  let meChar = null, loadN = 0, TRAY_Y = TRAY_BLOB;
  const loadTotal = ART_FILES.length + 1 + rivals.length;
  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  async function prepChar(src) { // crop to the alpha bounds, plus red / white / dark silhouettes for hit, catch and knocked-out tints
    const im = await loadImg(src); if (!im || !im.naturalWidth) return null;
    try {
      const w = im.naturalWidth, h = im.naturalHeight, t = document.createElement('canvas'); t.width = w; t.height = h; const g = t.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 10) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 < 0) return null;
      const cw = x1 - x0 + 1, chh = y1 - y0 + 1, mk = (fill) => { const c2 = document.createElement('canvas'); c2.width = cw; c2.height = chh; const g2 = c2.getContext('2d'); g2.drawImage(t, x0, y0, cw, chh, 0, 0, cw, chh); if (fill) { g2.globalCompositeOperation = 'source-atop'; g2.fillStyle = fill; g2.fillRect(0, 0, cw, chh); } return c2; };
      return { ok: true, cv: mk(null), red: mk('#ff3b5c'), white: mk('#ffffff'), dark: mk('#1d1033'), ar: cw / chh };
    } catch { return null; }
  }
  const tick = () => { loadN++; };
  const loading = Promise.all([
    ...ART_FILES.map((f) => loadImg(new URL(`./art/coincatch/${f}`, import.meta.url).href).then((im) => { if (im) ART[f.split('.')[0]] = im; tick(); })),
    prepChar(me && me.img).then((c) => { meChar = c; tick(); }),
    ...rivals.map((a, i) => prepChar(pool[i] && pool[i].img).then((c) => { a.char = c; tick(); })),
  ]);
  let artApplied = false;
  function applyArt() {
    if (artApplied) return; artApplied = true;
    const bake = (w, h, img, extra) => sprite(w, h, (g) => { g.drawImage(img, 0, 0, w, h); if (extra) extra(g, w, h); }, 4);
    if (ART.coin) SPR.coin = bake(34, 34, ART.coin);
    if (ART.gem) SPR.gem = bake(38, 38, ART.gem);
    if (ART.magnet) SPR.magnet = bake(44, 44, ART.magnet);
    if (ART.rug) SPR.rug = bake(48, 48, ART.rug, (g) => { g.fillStyle = '#1b1230'; g.strokeStyle = C.gold; g.lineWidth = 1.5; g.beginPath(); g.roundRect(13, 18, 22, 12, 6); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `600 9px ${FONT}`; g.textAlign = 'center'; g.fillText('RUG', 24, 27.2); });
    SPR.agent.clear();
    if (meChar) TRAY_Y = Math.round(PY + PR * 1.05 - Math.min(PR * 3.3, (PR * 2.9) / meChar.ar) - 13); // tray rests on the character's head
    if (state === 'loading') { state = 'title'; stateT = 0; }
  }
  loading.then(applyArt); const loadGuard = setTimeout(applyArt, 8000);
  const glowCache = new Map();
  function glow(col) { let g = glowCache.get(col); if (g) return g; g = sprite(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.55; c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }, 1); glowCache.set(col, g); return g; }
  const vignette = sprite(W, H, (g) => {
    const gr = g.createRadialGradient(W * 0.38, H * 0.55, H * 0.32, W * 0.45, H * 0.5, H * 0.82); gr.addColorStop(0, 'rgba(8,4,20,0)'); gr.addColorStop(1, 'rgba(8,4,20,.62)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); const top = g.createLinearGradient(0, 0, 0, 120); top.addColorStop(0, 'rgba(10,6,24,.45)'); top.addColorStop(1, 'rgba(10,6,24,0)'); g.fillStyle = top; g.fillRect(0, 0, W, 120);
  }, 1);
  function panelBox(bx, by, bw, bh, r, a = 0.82) {
    x.fillStyle = 'rgba(5,2,14,.45)'; x.beginPath(); x.roundRect(bx + 2, by + 5, bw, bh, r); x.fill();
    const g = x.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, `rgba(44,26,82,${a})`); g.addColorStop(1, `rgba(18,10,36,${a})`);
    x.fillStyle = g; x.beginPath(); x.roundRect(bx, by, bw, bh, r); x.fill();
    x.strokeStyle = 'rgba(201,182,255,.55)'; x.lineWidth = 1.5; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1; x.beginPath(); x.moveTo(bx + r, by + 2); x.lineTo(bx + bw - r, by + 2); x.stroke();
  }

  // ---------- background (pre-rendered) ----------
  const bgSky = sprite(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f0a1f'); gr.addColorStop(0.55, '#2a1550'); gr.addColorStop(0.75, '#3a1d5e'); gr.addColorStop(1, '#130e22');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${R(0.2, 0.8)})`; g.beginPath(); g.arc(R(0, W), R(0, 340), R(0.5, 1.4), 0, 7); g.fill(); }
    g.fillStyle = 'rgba(201,182,255,.15)'; g.beginPath(); g.arc(250, 140, 40, 0, 7); g.fill();
    g.fillStyle = '#f3ecff'; g.beginPath(); g.arc(250, 140, 24, 0, 7); g.fill(); g.fillStyle = '#2a1550'; g.beginPath(); g.arc(260, 133, 21, 0, 7); g.fill();
  });
  const SIGNS = [['COINS', C.gold, 26, 300], ['GM', C.pink, 128, 262], ['NOODLES', C.mint, 200, 318], ['24/7', C.lav2, 300, 286]];
  const bgCity = sprite(W + 60, 480, (g) => {
    let bx = 0; while (bx < W + 60) { const bw = R(40, 80), bh = R(150, 280); g.fillStyle = '#21123d'; g.fillRect(bx, 480 - bh - 30, bw, bh + 30);
      for (let wy = 480 - bh - 18; wy < 440; wy += 16) for (let wx = bx + 6; wx < bx + bw - 8; wx += 12) if (Math.random() < 0.35) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,209,102,.4)' : 'rgba(255,143,184,.3)'; g.fillRect(wx, wy, 5, 7); }
      bx += bw + R(2, 8); }
    bx = -10; while (bx < W + 60) { const bw = R(70, 110), bh = R(110, 190); g.fillStyle = '#170c2c'; g.beginPath(); g.roundRect(bx, 480 - bh, bw, bh + 10, [10, 10, 0, 0]); g.fill();
      for (let wy = 480 - bh + 14; wy < 460; wy += 22) for (let wx = bx + 10; wx < bx + bw - 14; wx += 18) if (Math.random() < 0.45) { g.fillStyle = 'rgba(255,220,150,.22)'; g.beginPath(); g.roundRect(wx, wy, 9, 12, 3); g.fill(); }
      bx += bw + R(0, 6); }
    for (const [t, col, sx, sy] of SIGNS) { g.font = `600 22px ${FONT}`; const tw = g.measureText(t).width;
      g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.roundRect(sx + 30, sy - 22, tw + 18, 32, 9); g.stroke();
      g.fillStyle = col; g.fillText(t, sx + 39, sy + 2); g.shadowBlur = 0; }
  });
  const bgStreet = sprite(W, 170, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, '#24143f'); gr.addColorStop(1, '#120a22'); g.fillStyle = gr; g.fillRect(0, 30, W, 140);
    const aw = [[C.pink, 0], [C.mint2, 120], [C.lav, 240]];
    for (const [col, ax] of aw) {
      g.globalAlpha = 0.55; g.fillStyle = '#2d1a4c'; g.fillRect(ax + 10, 40, 100, 70);
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? C.cream : col; g.fillRect(ax + 4 + i * 19, 18, 19, 22); g.beginPath(); g.arc(ax + 13.5 + i * 19, 40, 9.5, 0, Math.PI); g.fill(); }
      g.fillStyle = '#3a2360'; g.fillRect(ax + 6, 84, 108, 26); g.fillStyle = 'rgba(255,209,102,.6)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(ax + 20 + i * 14, 82, 5, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
    g.fillStyle = '#1a0f30'; g.fillRect(0, 110, W, 60); g.strokeStyle = 'rgba(201,182,255,.12)'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, 122 + i * 14); g.lineTo(W, 122 + i * 14); g.stroke(); }
    g.fillStyle = 'rgba(155,124,240,.35)'; g.fillRect(0, 110, W, 3);
  });
  const BULBS = []; for (let i = 0; i <= 16; i++) { const t = i / 16; BULBS.push({ x: 10 + t * (FW - 20), y: 112 + Math.sin(t * Math.PI) * 26, col: [C.gold, C.pink, C.mint2, C.lav2][i % 4], ph: R(0, 6) }); }
  const BOKEH = []; for (let i = 0; i < 14; i++) BOKEH.push({ x: R(0, FW), y: R(0, H), r: R(2, 6), v: R(6, 18), col: pick([C.lav2, C.pink, C.gold]) });

  // ---------- state ----------
  const items = []; for (let i = 0; i < 40; i++) items.push({ on: false, kind: 'coin', x: 0, y: 0, vx: 0, vy: 0, spin: 0, col: '', ground: 0, a: 1 });
  const parts = []; for (let i = 0; i < 260; i++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 2, col: '', k: 0, g: 600 });
  const pops = []; for (let i = 0; i < 24; i++) pops.push({ on: false, x: 0, y: 0, t: 0, text: '', col: '', size: 18 });
  const flyers = []; for (let i = 0; i < 24; i++) flyers.push({ on: false, sx: 0, sy: 0, tx: 0, ty: 0, t: 0, delay: 0, kind: 'coin', col: '' });
  const P = { x: FW / 2, vx: 0, target: null, stack: [], stackVal: 0, lives: 3, score: 0, shown: 0, level: 1, magnet: 0, hurt: 0, inv: 0, catchT: 0, lean: 0, blinkT: 2, look: 0 };
  let state = 'loading', stateT = 0, spawnT = 0, playT = 0, shake = 0, flash = 0, banner = { text: '', sub: '', t: 9 }, raf = 0, last = 0, hidden = false;
  let result = null, newBest = false, buttons = [], hover = -1, keyL = false, keyR = false, dragging = false, lastResult = null;

  function reset() {
    for (const it of items) it.on = false; for (const p of parts) p.on = false; for (const p of pops) p.on = false; for (const f of flyers) f.on = false;
    Object.assign(P, { x: FW / 2, vx: 0, target: null, stackVal: 0, lives: 3, score: 0, shown: 0, level: 1, magnet: 0, hurt: 0, inv: 0, catchT: 0, lean: 0 }); P.stack.length = 0;
    rivals.forEach((a, i) => { Object.assign(a, { x: 0.5, tx: 0.5, think: 0, score: 0, stack: 0, stackVal: 0, lives: 3, level: 1, out: false, hurt: 0, catchT: 0, spawnT: R(0.2, 0.8), emote: '', emoteT: 0, emoteCd: 0, skill: [0.7, 0.77, 0.84][i] + R(-0.04, 0.04), ry: 0, mistake: 0 }); for (const it of a.items) it.on = false; });
    spawnT = 0.6; playT = 0; shake = 0; flash = 0; banner = { text: 'GO!', sub: 'catch coins · dodge rugs', t: 0 };
  }
  reset(); rivals.forEach((a) => { a.ry = 0; });

  // ---------- spawning ----------
  const fallSpeed = (lv) => Math.min(430, 150 + lv * 24) * R(0.9, 1.12);
  const spawnGap = (lv) => Math.max(0.3, 0.92 - lv * 0.07);
  function rollKind(lv, t, allowMagnet) {
    const r = Math.random();
    if (allowMagnet && r < 0.022) return 'magnet';
    if (r < 0.07) return 'gem';
    if (r < 0.19) return 'agent';
    if (t > 2.5 && r < 0.19 + Math.min(0.38, 0.19 + lv * 0.025)) return 'rug';
    return 'coin';
  }
  function spawn() {
    const it = items.find((i) => !i.on); if (!it) return;
    const magOk = P.magnet <= 0 && !items.some((i) => i.on && i.kind === 'magnet');
    it.on = true; it.kind = rollKind(P.level, playT, magOk); it.x = R(26, FW - 26); it.y = -30; it.vx = 0; it.vy = fallSpeed(P.level); it.spin = R(0, 6); it.ground = 0; it.a = 1;
    it.col = it.kind === 'agent' ? pick(rivals).color : '';
  }
  function spawnRival(a) {
    const it = a.items.find((i) => !i.on); if (!it) return;
    it.on = true; it.kind = rollKind(a.level, playT, false); it.x = R(0.15, 0.85); it.y = -0.04; it.vy = fallSpeed(a.level) / 560;
    it.col = it.kind === 'agent' ? pick([myColor, ...rivals.filter((b) => b !== a).map((b) => b.color)]) : '';
  }

  // ---------- fx helpers ----------
  function burst(px, py, n, cols, speed = 180, k = 0, grav = 500, size = 3) {
    for (let i = 0; i < n; i++) { const p = parts.find((q) => !q.on); if (!p) return; const a = R(0, Math.PI * 2), s = R(0.3, 1) * speed;
      Object.assign(p, { on: true, x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, life: 0, max: R(0.45, 0.9), s: R(size * 0.6, size * 1.3), col: Array.isArray(cols) ? pick(cols) : cols, k, g: grav }); }
  }
  function pop(px, py, text, col, size = 20) { const p = pops.find((q) => !q.on) || pops[0]; Object.assign(p, { on: true, x: px, y: py, t: 0, text, col, size }); }
  function say(a, list, force) { if (a.out && !force) return; if (a.emoteCd > 0 && !force) return; a.emote = pick(list); a.emoteT = 0; a.emoteCd = R(1.6, 2.6); }
  const stackTopY = () => TRAY_Y - 6 - Math.min(4, rowOf(P.stack.length)) * 11;
  function rowOf(n) { let r = 0, acc = 0; for (const k of STACK_ROWS) { acc += k; if (n < acc) return r; r++; } return r; }

  function catchItem(it) {
    const v = VAL[it.kind] || 0;
    P.catchT = 1; P.stack.push(it.kind === 'agent' ? it.col : it.kind); P.stackVal += v;
    const ty = stackTopY();
    if (it.kind === 'gem') { sfx.gem(); burst(it.x, ty, 26, [C.mint, C.mint2, '#fff', C.lav2], 260, 1, 200, 4); pop(it.x, ty - 20, '+10', C.mint, 26); flash = Math.max(flash, 0.25); }
    else if (it.kind === 'agent') { sfx.big(); burst(it.x, ty, 18, [it.col, C.gold, '#fff'], 220, 1, 300, 3.5); pop(it.x, ty - 20, '+5', C.gold, 24); const owner = rivals.find((a) => a.color === it.col); if (owner && Math.random() < 0.5) say(owner, ['hey that\'s mine', 'my coin!', 'rude']); }
    else { sfx.coin(P.stack.length); burst(it.x, ty, 9, [C.gold, '#fff2bd'], 150, 1, 300, 2.5); pop(it.x, ty - 16, '+1', C.gold, 18); }
    if (P.stack.length >= 10) bank();
  }
  function bank() {
    const gain = P.stackVal + P.level * 5;
    P.stack.forEach((k, i) => { const f = flyers.find((q) => !q.on); if (!f) return; const row = rowOf(i);
      Object.assign(f, { on: true, sx: P.x + (i - 4.5) * 6, sy: TRAY_Y - 8 - row * 11, tx: 34, ty: 40, t: 0, delay: i * 0.045, kind: k }); });
    P.score += gain; P.stack.length = 0; P.stackVal = 0; P.level++;
    sfx.bank(); burst(P.x, TRAY_Y - 20, 30, [C.gold, C.cream, C.mint, C.pink], 300, 1, 300, 4);
    pop(P.x, TRAY_Y - 60, `BANKED +${gain}`, C.mint, 24);
    banner = { text: `LEVEL ${P.level}`, sub: 'faster!', t: 0 };
    say(pick(rivals.filter((a) => !a.out).concat(rivals)), NICE, true);
  }
  function rugged(it) {
    P.lives--; P.hurt = 0.9; P.inv = 1.2; shake = 16; flash = 0; thud();
    burst(it.x, it.y, 22, [C.red, '#ffd0d8', '#8f2338'], 260, 0, 700, 4);
    P.stack.forEach((k, i) => { const p = parts.find((q) => !q.on); if (!p) return; Object.assign(p, { on: true, x: P.x + (i - 4.5) * 7, y: TRAY_Y - 10 - rowOf(i) * 11, vx: R(-220, 220), vy: R(-380, -200), life: 0, max: 1.1, s: 9, col: k, k: 2, g: 900 }); });
    if (P.stackVal) pop(P.x, TRAY_Y - 70, `-${P.stackVal} spilled`, C.red, 20);
    pop(P.x, TRAY_Y - 40, 'RUGGED!', C.red, 30);
    P.stack.length = 0; P.stackVal = 0;
    say(pick(rivals), ['rugged! lol', 'oof', 'F', 'ngmi'], true);
    if (P.lives <= 0) { state = 'dying'; stateT = 0; sfx.lose(); }
  }

  // AI used by rivals (and the test autoplay): pick a reachable valuable item, dodge rugs, with skill-based mistakes.
  function think(list, cur, speed, catchY, half, lo, hi, skill) {
    let tgt = null, bestV = 0, danger = null, dt = 9;
    for (const it of list) { if (!it.on || it.y > catchY) continue; const ta = (catchY - it.y) / it.vy;
      if (it.kind === 'rug') { if (ta < 0.9 && Math.abs(it.x - cur) < half * 2.1 && ta < dt) { danger = it; dt = ta; } continue; }
      if (it.kind === 'magnet' || Math.abs(it.x - cur) / speed < ta + 0.05) { const v = ((VAL[it.kind] || 4) + 1) / (ta + 0.35); if (v > bestV) { bestV = v; tgt = it; } } }
    if (Math.random() < (1 - skill) * 0.3) return { x: R(lo, hi), slip: true };
    if (danger && Math.random() < skill + 0.12) return { x: danger.x > cur ? Math.max(lo, danger.x - half * 2.4) : Math.min(hi, danger.x + half * 2.4), slip: false };
    return { x: tgt ? clamp(tgt.x, lo, hi) : cur, slip: false };
  }

  // ---------- update ----------
  function step(dt) {
    stateT += dt;
    for (const b of BOKEH) { b.y -= b.v * dt; if (b.y < -10) { b.y = H + 10; b.x = R(0, FW); } }
    updateFx(dt);
    if (state === 'loading') return;
    if (state === 'title') { for (const a of rivals) { a.blinkT -= dt; if (a.blinkT < -0.12) a.blinkT = R(2, 4.5); } return; }
    if (state === 'results') return;
    if (state === 'dying') { dt *= 0.35; if (stateT > 1.5) finish(); }
    playT += dt; banner.t += dt;
    // player movement
    if (state === 'play') {
      if (autoplay) { P.think = (P.think || 0) - dt; if (P.think <= 0) { P.think = 0.18; P.target = think(items, P.x, 520, TRAY_Y, TRAY_HALF, TRAY_HALF, FW - TRAY_HALF, 0.86).x; } }
      const dir = (keyR ? 1 : 0) - (keyL ? 1 : 0);
      if (dir) { P.target = null; P.vx += (dir * 560 - P.vx) * Math.min(1, dt * 12); }
      else if (P.target != null) { const want = clamp((P.target - P.x) * 14, -900, 900); P.vx += (want - P.vx) * Math.min(1, dt * 18); }
      else P.vx *= Math.pow(0.0005, dt);
      P.x += P.vx * dt;
      if (P.x < TRAY_HALF + 2) { P.x = TRAY_HALF + 2; P.vx = 0; } if (P.x > FW - TRAY_HALF - 2) { P.x = FW - TRAY_HALF - 2; P.vx = 0; }
    }
    P.lean += (clamp(-P.vx * 0.0011, -0.6, 0.6) - P.lean) * Math.min(1, dt * 9);
    P.catchT = Math.max(0, P.catchT - dt * 4); P.hurt = Math.max(0, P.hurt - dt); P.inv = Math.max(0, P.inv - dt); P.magnet = Math.max(0, P.magnet - dt);
    P.blinkT -= dt; if (P.blinkT < -0.12) P.blinkT = R(2, 5);
    P.shown += (P.score - P.shown) * Math.min(1, dt * 6); if (Math.abs(P.score - P.shown) < 0.5) P.shown = P.score;
    // spawn + fall
    if (state === 'play') { spawnT -= dt; if (spawnT <= 0) { spawn(); if (P.level > 3 && Math.random() < 0.18) spawn(); spawnT = spawnGap(P.level) * R(0.75, 1.25); } }
    let nearest = null, nd = 1e9;
    for (const it of items) {
      if (!it.on) continue; it.spin += dt * 5;
      if (it.ground) { it.ground += dt; it.a = 1 - it.ground / 0.6; it.y += it.vy * dt; it.vy += 900 * dt; if (it.y > GROUND - 8) { it.y = GROUND - 8; it.vy *= -0.35; } it.x += it.vx * dt; if (it.a <= 0) it.on = false; continue; }
      const py = it.y; it.vy += 30 * dt; it.y += it.vy * dt;
      if (P.magnet > 0 && it.kind !== 'rug' && it.y > 40) { it.x += (P.x - it.x) * Math.min(1, dt * 4.5); if (Math.random() < 0.3) burst(it.x, it.y, 1, C.gold, 20, 1, 0, 2); }
      const dx = Math.abs(it.x - P.x), cy = it.kind === 'rug' ? TRAY_Y - 14 : TRAY_Y - 6;
      if (state === 'play' && py < cy && it.y >= cy) {
        if (it.kind === 'rug') { if (dx < TRAY_HALF + 14 && P.inv <= 0) { it.on = false; rugged(it); continue; } }
        else if (dx < TRAY_HALF + 8) { it.on = false; if (it.kind === 'magnet') { P.magnet = 5; sfx.magnet(); pop(P.x, TRAY_Y - 40, 'MAGNET!', C.gold, 26); burst(P.x, TRAY_Y, 20, [C.gold, '#fff'], 240, 1, 200, 3); } else catchItem(it); continue; }
      }
      if (it.y > GROUND - 10) {
        if (it.kind === 'rug') { it.on = false; burst(it.x, GROUND - 6, 12, ['#6b4a8a', '#a07ccf', C.red], 160, 0, 600, 3); shake = Math.max(shake, 3); tone(90, 0.15, 'sine', 0.12, 50); }
        else { it.ground = 0.001; it.vy = -120; it.vx = R(-40, 40); burst(it.x, GROUND - 8, 4, 'rgba(255,255,255,.6)', 80, 0, 300, 2); }
      }
      if (it.kind !== 'rug' && it.y < TRAY_Y && it.y > 100) { const d = Math.abs(it.x - P.x) + (TRAY_Y - it.y) * 0.3; if (d < nd) { nd = d; nearest = it; } }
    }
    P.look += ((nearest ? clamp((nearest.x - P.x) / 80, -1, 1) : clamp(P.vx / 400, -1, 1)) - P.look) * Math.min(1, dt * 8);
    // rivals
    for (const a of rivals) updateRival(a, dt);
    shake *= Math.pow(0.002, dt); flash = Math.max(0, flash - dt * 1.5);
  }
  function updateRival(a, dt) {
    a.blinkT -= dt; if (a.blinkT < -0.12) a.blinkT = R(2, 4.5);
    a.emoteT += dt; a.emoteCd -= dt; a.hurt = Math.max(0, a.hurt - dt); a.catchT = Math.max(0, a.catchT - dt * 4);
    if (a.out) return;
    const skill = clamp(a.skill + (a.level - 1) * 0.035, 0, 0.95), speed = 1.5 + a.level * 0.08;
    a.spawnT -= dt; if (a.spawnT <= 0) { spawnRival(a); a.spawnT = spawnGap(a.level) * R(0.75, 1.25) * 1.15; }
    a.think -= dt;
    if (a.think <= 0) { const d = think(a.items, a.x, speed, 0.86, 0.2, 0.1, 0.9, skill); a.tx = d.x; a.think = (0.42 - skill * 0.26) * R(0.8, 1.25) + (d.slip ? 0.35 : 0); }
    a.x += clamp(a.tx - a.x, -speed * dt, speed * dt);
    for (const it of a.items) {
      if (!it.on) continue; const py = it.y; it.y += it.vy * dt;
      if (py < 0.86 && it.y >= 0.86 && Math.abs(it.x - a.x) < 0.2) {
        it.on = false; const lx = PX + a.idx * (LW + LG) + LW / 2, ly = LT + 0.86 * (LB - LT);
        if (it.kind === 'rug') {
          a.lives--; a.hurt = 0.8; a.stack = 0; a.stackVal = 0; burst(lx, ly, 10, [C.red, '#ffd0d8'], 120, 0, 500, 2.5); say(a, OUCH, true);
          if (a.lives <= 0) { a.out = true; for (const q of a.items) q.on = false; a.emote = 'rugged out'; a.emoteT = 0; burst(lx, ly, 16, [a.color, C.red], 160, 0, 400, 3); }
        } else {
          a.catchT = 1; a.stack++; a.stackVal += VAL[it.kind] || 0; burst(lx, ly, it.kind === 'coin' ? 3 : 8, [C.gold, '#fff'], 70, 1, 200, 1.8);
          if (it.kind !== 'coin') say(a, CHEER); else if (Math.random() < 0.06) say(a, CHEER);
          if (a.stack >= 10) { a.score += a.stackVal + a.level * 5; a.stack = 0; a.stackVal = 0; a.level++; say(a, ['banked!', 'LFG', 'too easy', 'level up'], true); burst(lx, ly - 20, 14, [C.gold, C.mint], 140, 1, 200, 2.5); }
        }
      } else if (it.y > 1.02) it.on = false;
    }
  }
  function updateFx(dt) {
    for (const p of parts) { if (!p.on) continue; p.life += dt; if (p.life > p.max) { p.on = false; continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.99; }
    for (const p of pops) { if (!p.on) continue; p.t += dt; p.y -= 40 * dt; if (p.t > 1) p.on = false; }
    for (const f of flyers) { if (!f.on) continue; f.t += dt; if (f.t - f.delay > 0.6) { f.on = false; burst(f.tx, f.ty, 3, [C.gold, '#fff'], 80, 1, 0, 2); tone(1320 + Math.random() * 300, 0.05, 'triangle', 0.05); } }
  }
  function finish() {
    state = 'results'; stateT = 0;
    const rows = [{ name: 'YOU', color: myColor, score: P.score, you: true, level: P.level, img: meChar }, ...rivals.map((a) => ({ name: a.name, color: a.color, score: a.score, level: a.level, out: a.out, img: a.char }))];
    rows.sort((a, b) => b.score - a.score || (a.you ? -1 : b.you ? 1 : 0));
    const rank = rows.findIndex((r) => r.you) + 1;
    newBest = P.score > best; if (newBest) { best = P.score; try { localStorage.setItem('aa.coincatch.best', String(best)); } catch {} }
    result = { rows, rank }; lastResult = { score: P.score, rank, won: rank === 1 };
    if (rank === 1) { sfx.win(); for (let i = 0; i < 4; i++) burst(R(80, 400), R(60, 200), 20, [C.gold, C.pink, C.mint, C.lav2, C.cream], 260, 3, 300, 4); }
    rivals.forEach((a) => { const r = rows.findIndex((q) => q.name === a.name) + 1; a.emote = r === 1 ? 'too easy' : r < rank ? 'gg' : 'gg wp'; a.emoteT = 0; });
  }
  function start() { audio(); sfx.blip(); reset(); state = 'play'; stateT = 0; }

  // ---------- draw ----------
  function draw(now) {
    const t = now / 1000;
    x.save();
    if (shake > 0.3) x.translate(R(-shake, shake), R(-shake, shake) * 0.7);
    const par = (P.x - FW / 2) * -0.06;
    if (state === 'loading') { drawLoading(t); x.restore(); return; }
    if (ART.bg) { // painted market, scaled to cover with a slow drift + player parallax
      x.drawImage(ART.bg, -16 + clamp(par, -12, 12) + Math.sin(t * 0.17) * 3, -80 + Math.sin(t * 0.11) * 3, 512, 768);
    } else {
      x.drawImage(bgSky, -10, -10, W + 20, H + 20);
      x.drawImage(bgCity, -30 + par, 0, W + 60, 480);
      const fl = Math.sin(t * 13) > 0.85 ? 0.35 : 1; // one sign flickers
      if (fl < 1) { x.fillStyle = 'rgba(19,10,40,.7)'; x.fillRect(SIGNS[1][2] - 30 + par + 28, SIGNS[1][3] - 26, 60, 40); }
      x.drawImage(bgStreet, 0, 470, W, 170);
      x.strokeStyle = 'rgba(201,182,255,.35)'; x.lineWidth = 1.5; x.beginPath(); BULBS.forEach((b, i) => (i ? x.lineTo(b.x, b.y) : x.moveTo(b.x, b.y))); x.stroke();
      for (const b of BULBS) { const a = 0.55 + Math.sin(t * 3 + b.ph) * 0.35; x.globalAlpha = a * 0.35; x.fillStyle = b.col; x.beginPath(); x.arc(b.x, b.y + 4, 9, 0, 7); x.fill(); x.globalAlpha = 0.6 + a * 0.4; x.beginPath(); x.arc(b.x, b.y + 4, 3.5, 0, 7); x.fill(); }
      x.globalAlpha = 1;
    }
    x.drawImage(vignette, 0, 0, W, H);
    for (const b of BOKEH) { x.globalAlpha = 0.12; x.fillStyle = b.col; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill(); } x.globalAlpha = 1;
    if (state !== 'title') drawField(t);
    drawPanel(t);
    drawFx(false);
    if (state !== 'title') drawHud(t);
    x.restore();
    if (P.hurt > 0) { x.fillStyle = `rgba(255,60,90,${P.hurt * 0.28})`; x.fillRect(0, 0, W, H); }
    if (flash > 0) { x.fillStyle = `rgba(122,215,196,${flash * 0.35})`; x.fillRect(0, 0, W, H); }
    drawFx(true);
    buttons.length = 0;
    if (state === 'title') drawTitle(t); else if (state === 'results') drawResults(t);
  }
  function drawLoading(t) {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1033'); g.addColorStop(1, C.bg); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.translate(W / 2, H / 2 - 30); x.globalAlpha = 0.5; x.drawImage(glow(C.gold), -50, -50, 100, 100); x.globalAlpha = 1;
    x.scale(Math.max(0.12, Math.abs(Math.cos(t * 4))), 1); x.drawImage(SPR.coin, -24, -24, 48, 48); x.restore();
    x.textAlign = 'center'; bigText(x, 'Opening the market…', W / 2, H / 2 + 34, 22, C.cream, 'rgba(19,10,40,.9)', 5);
    const k = loadN / loadTotal; x.fillStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.roundRect(W / 2 - 90, H / 2 + 54, 180, 10, 5); x.fill();
    x.fillStyle = C.gold; x.beginPath(); x.roundRect(W / 2 - 90, H / 2 + 54, Math.max(10, 180 * k), 10, 5); x.fill();
  }
  function drawItem(it, t) {
    if (!it.ground) { const k = clamp((it.y + 30) / (GROUND + 30), 0, 1), sw = (it.kind === 'coin' ? 10 : 15) * (0.5 + k * 0.6);
      x.fillStyle = `rgba(8,4,20,${(0.08 + k * 0.32) * it.a})`; x.beginPath(); x.ellipse(it.x, GROUND - 3, sw, sw * 0.28, 0, 0, 7); x.fill(); }
    const gc = it.kind === 'coin' ? C.gold : it.kind === 'gem' ? C.mint : it.kind === 'rug' ? C.red : it.kind === 'magnet' ? C.gold : it.col, gs = it.kind === 'coin' ? 46 : 70;
    x.globalAlpha = (it.kind === 'coin' ? 0.45 : 0.75) * it.a; x.drawImage(glow(gc), it.x - gs / 2, it.y - gs / 2, gs, gs);
    x.globalAlpha = it.a;
    if (it.kind === 'coin') blitSpin(SPR.coin, it.x, it.y, 1, 0.25 + Math.abs(Math.cos(it.spin)) * 0.75);
    else if (it.kind === 'agent') { blitSpin(agentCoin(it.col), it.x, it.y, 1, 0.55 + Math.abs(Math.cos(it.spin * 0.6)) * 0.45); }
    else if (it.kind === 'gem') { const pul = 1 + Math.sin(t * 8) * 0.06; blitSpin(SPR.gem, it.x, it.y, pul, 1);
      if (Math.sin(t * 6 + it.spin) > 0.6) { x.fillStyle = '#fff'; star(it.x + 10, it.y - 12, 5); } }
    else if (it.kind === 'magnet') { x.save(); x.translate(it.x, it.y); x.rotate(Math.sin(t * 4) * 0.25); x.drawImage(SPR.magnet, -SPR.magnet.w / 2, -SPR.magnet.h / 2, SPR.magnet.w, SPR.magnet.h); x.restore(); }
    else { x.save(); x.translate(it.x, it.y); x.rotate(Math.sin(it.spin * 0.7) * 0.18); x.drawImage(SPR.rug, -SPR.rug.w / 2, -SPR.rug.h / 2, SPR.rug.w, SPR.rug.h); x.restore();
      if (it.y > TRAY_Y - 200 && Math.abs(it.x - P.x) < TRAY_HALF + 30 && !it.ground) { x.fillStyle = `rgba(255,107,129,${0.18 + Math.sin(t * 20) * 0.1})`; x.beginPath(); x.ellipse(it.x, GROUND - 2, 24, 6, 0, 0, 7); x.fill(); } }
    x.globalAlpha = 1;
  }
  function star(sx, sy, s) { x.beginPath(); x.moveTo(sx, sy - s); x.quadraticCurveTo(sx, sy, sx + s, sy); x.quadraticCurveTo(sx, sy, sx, sy + s); x.quadraticCurveTo(sx, sy, sx - s, sy); x.quadraticCurveTo(sx, sy, sx, sy - s); x.fill(); }
  function drawField(t) {
    x.save(); x.beginPath(); x.rect(0, 0, FW, H); x.clip();
    if (P.magnet > 0) { x.strokeStyle = `rgba(255,209,102,${0.25 + Math.sin(t * 12) * 0.1})`; x.lineWidth = 2; for (let i = 0; i < 4; i++) { const r = ((t * 140 + i * 70) % 280); x.globalAlpha = 1 - r / 280; x.beginPath(); x.arc(P.x, TRAY_Y, r, Math.PI, 0); x.stroke(); } x.globalAlpha = 1; }
    for (const it of items) if (it.on) drawItem(it, t);
    // player
    const blink = P.blinkT < 0, mood = P.hurt > 0.3 ? 'hurt' : state === 'dying' ? 'sad' : P.catchT > 0.4 ? 'big' : P.magnet > 0 ? 'wow' : 'happy';
    const sq = P.catchT * 0.12 - Math.abs(P.vx) * 0.00006 + Math.sin(t * 6) * 0.02;
    if (!(P.inv > 0 && Math.sin(t * 40) > 0)) {
      drawBlob(x, P.x, PY, PR, myColor, { look: P.look, squash: sq, blink, mood, arms: 'up', img: meChar, tall: 3.3 });
      const ty = TRAY_Y + P.catchT * 4; x.save(); x.translate(P.x, ty); x.rotate(P.lean * 0.15);
      const tg = x.createLinearGradient(0, -6, 0, 8); tg.addColorStop(0, '#fff0b0'); tg.addColorStop(0.5, C.gold); tg.addColorStop(1, '#b9761a');
      x.globalAlpha = 0.35 + P.catchT * 0.4; x.drawImage(glow(C.gold), -70, -34, 140, 68); x.globalAlpha = 1;
      if (ART.tray) x.drawImage(ART.tray, -56, -30, 112, 56);
      else { x.fillStyle = '#8a5410'; x.beginPath(); x.ellipse(0, 4, TRAY_HALF, 7, 0, 0, 7); x.fill();
        x.fillStyle = tg; x.beginPath(); x.ellipse(0, 1, TRAY_HALF, 7, 0, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(-12, -1.5, TRAY_HALF * 0.55, 1.6, 0, 0, 7); x.fill(); }
      // coin pile
      let i = 0; for (let r = 0; r < STACK_ROWS.length && i < P.stack.length; r++) { const n = STACK_ROWS[r];
        for (let k = 0; k < n && i < P.stack.length; k++, i++) { const cx = (k - (n - 1) / 2) * 19 + P.lean * r * 10, cy = -8 - r * 11;
          const kd = P.stack[i]; if (kd === 'coin') x.drawImage(SPR.coin, cx - 11, cy - 11, 22, 22); else if (kd === 'gem') x.drawImage(SPR.gem, cx - 12, cy - 13, 24, 24); else x.drawImage(agentCoin(kd), cx - 13, cy - 13, 26, 26); } }
      if (P.magnet > 0) { x.drawImage(SPR.magnet, -12, 8, 24, 24); }
      x.restore();
      if (P.stackVal > 0) { x.textAlign = 'center'; bigText(x, `+${P.stackVal}`, P.x, stackTopY() - 18, 15, C.cream, 'rgba(19,10,40,.85)', 4); }
      x.textAlign = 'center'; x.font = `600 11px ${FONT}`; x.fillStyle = 'rgba(19,10,40,.75)'; x.beginPath(); x.roundRect(P.x - 18, PY + 14, 36, 16, 8); x.fill(); x.fillStyle = '#fff'; x.fillText('YOU', P.x, PY + 26);
      if (P.magnet > 0) { x.strokeStyle = C.gold; x.lineWidth = 3; x.beginPath(); x.arc(P.x, PY, PR + 8, -Math.PI / 2, -Math.PI / 2 + (P.magnet / 5) * Math.PI * 2); x.stroke(); }
    }
    x.restore();
  }
  function drawFx(top) {
    for (const p of parts) { if (!p.on || (p.k === 3) !== top) continue; const a = 1 - p.life / p.max; x.globalAlpha = a;
      if (p.k === 2) { const s = p.col === 'coin' ? SPR.coin : p.col === 'gem' ? SPR.gem : agentCoin(p.col); x.drawImage(s, p.x - 10, p.y - 10, 20, 20); }
      else if (p.k === 1) { x.fillStyle = p.col; star(p.x, p.y, p.s * (0.6 + a * 0.6)); }
      else if (p.k === 3) { x.fillStyle = p.col; x.save(); x.translate(p.x, p.y); x.rotate(p.life * 8 + p.vx); x.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s); x.restore(); }
      else { x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.s * a + 0.5, 0, 7); x.fill(); } }
    x.globalAlpha = 1; if (top) return;
    for (const f of flyers) { if (!f.on) continue; const k = clamp((f.t - f.delay) / 0.6, 0, 1), e = easeInOut(k); if (k <= 0) continue;
      const fx = f.sx + (f.tx - f.sx) * e, fy = f.sy + (f.ty - f.sy) * e - Math.sin(e * Math.PI) * 120;
      const s = f.kind === 'coin' ? SPR.coin : f.kind === 'gem' ? SPR.gem : agentCoin(f.kind), sz = 22 * (1 - e * 0.35); x.drawImage(s, fx - sz / 2, fy - sz / 2, sz, sz); }
    x.textAlign = 'center';
    for (const p of pops) { if (!p.on) continue; const sc = p.t < 0.15 ? easeOutBack(p.t / 0.15) : 1; x.globalAlpha = p.t > 0.7 ? (1 - p.t) / 0.3 : 1;
      x.save(); x.translate(p.x, p.y); x.scale(sc, sc); bigText(x, p.text, 0, 0, p.size, p.col, 'rgba(19,10,40,.9)', 5); x.restore(); }
    x.globalAlpha = 1;
  }
  function drawHud(t) {
    panelBox(10, 10, 168, 66, 18);
    const bump = flyers.some((f) => f.on) ? 1 + Math.sin(t * 30) * 0.06 : 1;
    x.save(); x.translate(34, 40); x.scale(bump, bump); x.drawImage(SPR.coin, -15, -15, 30, 30); x.restore();
    x.textAlign = 'left'; bigText(x, String(Math.round(P.shown)), 56, 50, 28, C.gold, 'rgba(19,10,40,.9)', 4);
    x.font = `600 12px ${FONT}`; x.fillStyle = C.lav2; x.fillText(`LV ${P.level}`, 22, 68);
    for (let i = 0; i < 10; i++) { x.fillStyle = i < P.stack.length ? C.gold : 'rgba(201,182,255,.22)'; x.beginPath(); x.arc(66 + i * 10.5, 64, 3.6, 0, 7); x.fill(); }
    for (let i = 0; i < 3; i++) { const on = i < P.lives, bob = on ? Math.sin(t * 4 + i) * 1.5 : 0, hx = 204 + i * 30, hy = 34 + bob;
      heart(x, hx, hy + 1.5, 13, 'rgba(19,10,40,.7)'); heart(x, hx, hy, 12, on ? C.red : 'rgba(255,255,255,.18)');
      if (on) { x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(hx - 4.5, hy - 6, 3, 2, -0.6, 0, 7); x.fill(); } }
    if (P.magnet > 0) { x.textAlign = 'left'; x.font = `600 12px ${FONT}`; x.fillStyle = C.gold; x.fillText(`magnet ${P.magnet.toFixed(1)}s`, 190, 66); }
    if (banner.t < 1.6) { const k = banner.t, sc = k < 0.25 ? easeOutBack(k / 0.25) : 1, a = k > 1.2 ? (1.6 - k) / 0.4 : 1;
      x.save(); x.globalAlpha = a; x.translate(FW / 2, 260); x.scale(sc, sc); x.textAlign = 'center'; bigText(x, banner.text, 0, 0, 48, C.gold, 'rgba(19,10,40,.95)', 9);
      x.font = `600 18px ${FONT}`; bigText(x, banner.sub, 0, 30, 18, C.cream, 'rgba(19,10,40,.9)', 5); x.restore(); }
    if (state === 'dying') { x.textAlign = 'center'; x.globalAlpha = Math.min(1, stateT * 3); bigText(x, 'RUGGED OUT', FW / 2, 300, 44, C.red, 'rgba(19,10,40,.95)', 9); x.globalAlpha = 1; }
  }
  function drawPanel(t) {
    panelBox(PX - 6, 58, W - PX + 2, H - 66, 16, 0.86);
    x.textAlign = 'center'; x.font = `600 13px ${FONT}`; x.fillStyle = C.lav2; x.fillText('RIVAL LANES', PX + 56, 78);
    for (const a of rivals) {
      const lx = PX + a.idx * (LW + LG), cx = lx + LW / 2, live = state !== 'title';
      x.fillStyle = 'rgba(40,24,72,.9)'; x.beginPath(); x.roundRect(lx, LT - 30, LW, LB - LT + 36, 10); x.fill();
      x.fillStyle = a.color; x.globalAlpha = 0.18; x.fillRect(lx, LT - 30, LW, 4); x.globalAlpha = 1;
      x.fillStyle = a.color; x.beginPath(); x.arc(cx, LT - 14, 10, 0, 7); x.fill(); x.fillStyle = C.ink; x.font = `600 12px ${FONT}`; x.fillText(a.name[0], cx, LT - 9.5);
      x.save(); x.beginPath(); x.roundRect(lx, LT, LW, LB - LT + 6, 8); x.clip();
      if (live) for (const it of a.items) { if (!it.on) continue; const ix = lx + 3 + it.x * (LW - 6), iy = LT + it.y * (LB - LT);
        if (it.kind === 'coin') x.drawImage(SPR.coin, ix - 5, iy - 5, 10, 10); else if (it.kind === 'gem') x.drawImage(SPR.gem, ix - 6, iy - 6, 12, 12);
        else if (it.kind === 'agent') x.drawImage(agentCoin(it.col), ix - 7, iy - 7, 14, 14); else x.drawImage(SPR.rug, ix - 8, iy - 7, 16, 16 * SPR.rug.h / SPR.rug.w); }
      const bx = lx + 3 + (live ? a.x : 0.5) * (LW - 6), by = LB - 8, sq = a.catchT * 0.15 + Math.sin(t * 5 + a.idx) * 0.03;
      const ch = drawBlob(x, bx, by, a.char ? 9 : 8, a.color, { squash: sq, blink: a.blinkT < 0, mood: a.out ? 'sad' : a.hurt > 0 ? 'hurt' : a.catchT > 0.4 ? 'big' : 'happy', arms: 'up', look: live ? clamp((a.tx - a.x) * 6, -1, 1) : 0, img: a.char });
      const tyy = (ch ? by + 9.45 - ch * (1 - sq) - 1 : by - 13) + a.catchT * 2;
      if (ART.tray) x.drawImage(ART.tray, bx - 12, tyy - 6, 24, 12); else { x.fillStyle = C.gold; x.beginPath(); x.ellipse(bx, tyy, 10, 2.6, 0, 0, 7); x.fill(); }
      for (let k = 0; k < Math.min(a.stack || 0, 9); k++) x.drawImage(SPR.coin, bx - 7 + (k % 3) * 4.5 - ((k / 3) | 0) * 0 + ((k / 3) | 0) * 2.2, tyy - 8 - ((k / 3) | 0) * 4, 6, 6);
      if (a.out) { x.fillStyle = 'rgba(15,9,30,.65)'; x.fillRect(lx, LT, LW, LB - LT + 6); x.save(); x.translate(cx, (LT + LB) / 2); x.rotate(-Math.PI / 2); x.font = `600 15px ${FONT}`; x.fillStyle = C.red; x.fillText('RUGGED OUT', 0, 5); x.restore(); }
      if (a.hurt > 0) { x.fillStyle = `rgba(255,107,129,${a.hurt * 0.4})`; x.fillRect(lx, LT, LW, LB - LT + 6); }
      x.restore();
      if (live) for (let h = 0; h < 3; h++) heart(x, cx - 9 + h * 9, LB + 20, 3.6, h < a.lives ? C.red : 'rgba(255,255,255,.2)');
    }
    // leaderboard
    const rows = [{ name: 'YOU', color: myColor, score: P.score, you: true, ref: P, img: meChar }, ...rivals.map((a) => ({ name: a.name, color: a.color, score: a.score, ref: a, out: a.out, img: a.char }))];
    rows.sort((a, b) => b.score - a.score || (a.you ? -1 : 0));
    const top = 462; x.textAlign = 'left'; x.font = `600 12px ${FONT}`; x.fillStyle = C.lav2; x.fillText('LIVE BOARD', PX, top);
    rows.forEach((r, i) => { const o = r.ref; o.ry = o.ry ? o.ry + (i - o.ry) * 0.18 : i + 0.001; const ry = top + 8 + o.ry * 38;
      x.fillStyle = r.you ? 'rgba(155,124,240,.35)' : 'rgba(40,24,72,.9)'; x.beginPath(); x.roundRect(PX - 2, ry, W - PX - 6, 34, 10); x.fill();
      if (r.you) { x.strokeStyle = C.lav; x.lineWidth = 1.5; x.stroke(); }
      drawBlob(x, PX + 13, ry + 16, 8, r.color, { blink: (o.blinkT || 1) < 0, mood: r.out ? 'sad' : 'happy', img: r.img });
      x.textAlign = 'left'; x.font = `600 11px ${FONT}`; x.fillStyle = r.out ? 'rgba(255,255,255,.45)' : '#fff'; x.fillText(r.name.length > 7 ? r.name.slice(0, 6) + '…' : r.name, PX + 26, ry + 14);
      x.font = `600 14px ${FONT}`; x.fillStyle = C.gold; const sv = String(r.you ? Math.round(P.shown) : r.score), pend = r.you ? P.stackVal : o.stackVal; x.fillText(sv, PX + 26, ry + 29);
      if (pend > 0 && !r.out) { const sw = x.measureText(sv).width; x.font = `600 10px ${FONT}`; x.fillStyle = C.cream; x.globalAlpha = 0.7; x.fillText(`+${pend}`, PX + 30 + sw, ry + 29); x.globalAlpha = 1; }
      x.textAlign = 'right'; x.font = `600 10px ${FONT}`; x.fillStyle = C.lav2; x.fillText(`#${i + 1}`, W - 12, ry + 14); });
    // emotes on top of the lanes
    if (state !== 'title') for (const a of rivals) { if (!a.emote || a.emoteT > 2) continue; const a1 = a.emoteT > 1.6 ? (2 - a.emoteT) / 0.4 : 1, sc = a.emoteT < 0.18 ? easeOutBack(a.emoteT / 0.18) : 1;
      const bx = PX + a.idx * (LW + LG) + 4 + (a.out ? 0.5 : a.x) * (LW - 8); bubble(x, bx, LB - 44 - a.idx * 26, a.emote, a.color, a1, sc); }
    else for (const a of rivals) { const bx = PX + a.idx * (LW + LG) + LW / 2; if (Math.sin(t * 1.3 + a.idx * 2.1) > 0.4) bubble(x, bx, LB - 44 - a.idx * 26, ['gm', 'ready', 'LFG'][a.idx], a.color, 1, 1); }
  }
  function button(bx, by, bw, bh, label, act, primary) {
    const i = buttons.length; buttons.push({ x: bx, y: by, w: bw, h: bh, act }); const hv = hover === i, lift = hv ? -2 : 0;
    x.fillStyle = primary ? '#6c4fc4' : '#2a1a48'; x.beginPath(); x.roundRect(bx, by + 4, bw, bh, bh / 2); x.fill();
    const g = x.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, primary ? '#c9b6ff' : '#4a3577'); g.addColorStop(1, primary ? C.lav : '#3a2862');
    x.fillStyle = g; x.beginPath(); x.roundRect(bx, by + lift, bw, bh, bh / 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.roundRect(bx + 14, by + lift + 4, bw - 28, 6, 3); x.fill();
    x.textAlign = 'center'; x.font = `600 18px ${FONT}`; x.fillStyle = primary ? C.ink : '#fff'; x.fillText(label, bx + bw / 2, by + lift + bh / 2 + 6);
  }
  function card(cy, ch) {
    x.fillStyle = 'rgba(8,4,20,.5)'; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(10,5,24,.6)'; x.beginPath(); x.roundRect(28, cy + 8, W - 56, ch, 26); x.fill();
    const g = x.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, '#2c1a52'); g.addColorStop(1, '#1a1033');
    x.fillStyle = g; x.beginPath(); x.roundRect(28, cy, W - 56, ch, 26); x.fill(); x.strokeStyle = C.lav; x.lineWidth = 3; x.stroke();
  }
  function drawTitle(t) {
    const k = Math.min(1, stateT / 0.45), cy = 64 + (1 - easeOutBack(k)) * 40; x.globalAlpha = Math.min(1, stateT * 4);
    card(cy, 520); x.textAlign = 'center';
    for (let i = 0; i < 5; i++) { const cx = W / 2 - 150 + i * 75, yy = cy + 36 + Math.sin(t * 3 + i) * 5; blitSpin(SPR.coin, cx, yy, 0.8, 0.3 + Math.abs(Math.cos(t * 2.5 + i)) * 0.7); }
    bigText(x, 'COIN CATCHER', W / 2, cy + 92, 46, C.gold, 'rgba(19,10,40,.95)', 10);
    x.font = `600 16px ${FONT}`; x.fillStyle = C.cream; x.fillText('Catch the coins, dodge the rugs.', W / 2, cy + 122);
    x.font = `500 14px ${FONT}`; x.fillStyle = C.lav2; x.fillText('10 on your tray = banked + faster level', W / 2, cy + 142);
    const leg = [['coin', '+1'], ['agent', '+5'], ['gem', '+10'], ['magnet', '5s pull'], ['rug', '-1 life']];
    leg.forEach(([k2, lab], i) => { const lx = 74 + i * 83, ly = cy + 186;
      x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(lx - 36, ly - 30, 72, 76, 14); x.fill();
      if (k2 === 'coin') x.drawImage(SPR.coin, lx - 15, ly - 18, 30, 30); else if (k2 === 'gem') x.drawImage(SPR.gem, lx - 16, ly - 19, 32, 32); else if (k2 === 'magnet') x.drawImage(SPR.magnet, lx - 17, ly - 20, 34, 34);
      else if (k2 === 'rug') x.drawImage(SPR.rug, lx - 20, ly - 20, 40, 40 * SPR.rug.h / SPR.rug.w); else x.drawImage(agentCoin(rivals[0].color), lx - 18, ly - 21, 36, 36);
      x.font = `600 14px ${FONT}`; x.fillStyle = k2 === 'rug' ? C.red : k2 === 'gem' ? C.mint : C.gold; x.fillText(lab, lx, ly + 34); });
    x.font = `600 13px ${FONT}`; x.fillStyle = C.lav2; x.fillText('YOUR RIVALS (playing live on the right)', W / 2, cy + 262);
    rivals.forEach((a, i) => { const bx = W / 2 - 120 + i * 120, by = cy + 312, hop = Math.abs(Math.sin(t * 3 + i * 1.3)) * 8;
      drawBlob(x, bx, by - hop, 24, a.color, { squash: hop < 1 ? 0.1 : -0.04, blink: a.blinkT < 0, look: Math.sin(t + i), wave: i === 1 ? t * 6 : 0, img: a.char });
      x.font = `600 12px ${FONT}`; const tw = x.measureText(a.name).width + 16; x.fillStyle = 'rgba(19,10,40,.85)'; x.beginPath(); x.roundRect(bx - tw / 2, by + 30, tw, 20, 10); x.fill(); x.fillStyle = '#fff'; x.fillText(a.name, bx, by + 44); });
    x.font = `500 14px ${FONT}`; x.fillStyle = C.cream; x.fillText('← → or A D to move  ·  drag / touch on phones', W / 2, cy + 390);
    if (best) { x.fillStyle = C.gold; x.fillText(`Best: ${best}`, W / 2, cy + 412); }
    button(W / 2 - 110, cy + 430, 220, 52, 'Play  (Space)', 'start', true);
    x.globalAlpha = 1;
  }
  function drawResults(t) {
    const k = Math.min(1, stateT / 0.5), cy = 62 + (1 - easeOutBack(k)) * 50; x.globalAlpha = Math.min(1, stateT * 4);
    card(cy, 540); x.textAlign = 'center';
    const { rows, rank } = result;
    bigText(x, rank === 1 ? 'TOP OF THE MARKET!' : 'RUGGED OUT', W / 2, cy + 54, rank === 1 ? 32 : 36, rank === 1 ? C.gold : C.pink, 'rgba(19,10,40,.95)', 8);
    x.font = `600 16px ${FONT}`; x.fillStyle = C.lav2; x.fillText(`You finished #${rank} of 4`, W / 2, cy + 82);
    bigText(x, String(P.score), W / 2, cy + 134, 52, C.cream, 'rgba(19,10,40,.95)', 8);
    x.font = `600 14px ${FONT}`; x.fillStyle = C.gold; x.fillText(`best ${best}  ·  level ${P.level}`, W / 2, cy + 158);
    if (newBest) { const s = 1 + Math.sin(t * 8) * 0.08; x.save(); x.translate(W / 2 + 120, cy + 112); x.rotate(0.25); x.scale(s, s); x.fillStyle = C.mint; x.beginPath(); x.roundRect(-46, -15, 92, 30, 15); x.fill(); x.fillStyle = C.ink; x.font = `600 15px ${FONT}`; x.fillText('NEW BEST!', 0, 5); x.restore(); }
    rows.forEach((r, i) => { const ry = cy + 182 + i * 58, d = Math.max(0, Math.min(1, (stateT - 0.3 - i * 0.12) / 0.3)); if (d <= 0) return;
      x.save(); x.globalAlpha = d; x.translate((1 - easeOutBack(d)) * 60, 0);
      x.fillStyle = r.you ? 'rgba(155,124,240,.32)' : 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(56, ry, W - 112, 50, 16); x.fill(); if (r.you) { x.strokeStyle = C.lav; x.lineWidth = 2; x.stroke(); }
      x.textAlign = 'left'; x.font = `600 20px ${FONT}`; x.fillStyle = i === 0 ? C.gold : C.lav2; x.fillText(`#${i + 1}`, 70, ry + 32);
      const hop = i === 0 ? Math.abs(Math.sin(t * 4)) * 4 : 0, hh = drawBlob(x, 130, ry + 24 - hop, 16, r.color, { mood: i === 0 ? 'big' : r.out ? 'sad' : 'happy', blink: Math.sin(t * 2 + i * 3) > 0.97, img: r.img });
      if (i === 0) { const b0 = hh ? ry + 24 - hop + 16.8 - hh + 2 : ry + 6 - hop; x.fillStyle = C.gold; x.beginPath(); x.moveTo(118, b0); x.lineTo(122, b0 - 12); x.lineTo(127, b0 - 5); x.lineTo(130, b0 - 15); x.lineTo(133, b0 - 5); x.lineTo(138, b0 - 12); x.lineTo(142, b0); x.fill(); }
      x.font = `600 17px ${FONT}`; x.fillStyle = '#fff'; x.fillText(r.you ? `YOU` : r.name, 156, ry + 24);
      x.font = `500 12px ${FONT}`; x.fillStyle = C.lav2; x.fillText(`level ${r.level}${r.out ? ' · rugged out' : r.you ? '' : ' · still stacking'}`, 156, ry + 40);
      x.textAlign = 'right'; x.font = `600 22px ${FONT}`; x.fillStyle = C.gold; x.fillText(String(r.score), W - 72, ry + 33); x.restore(); });
    button(52, cy + 430, 180, 50, 'Play again', 'start', true);
    button(W - 232, cy + 430, 180, 50, 'Back to world', 'close', false);
    x.textAlign = 'center'; x.font = `500 12px ${FONT}`; x.fillStyle = 'rgba(201,182,255,.7)'; x.fillText('Space = play again  ·  Esc = back', W / 2, cy + 510);
    x.globalAlpha = 1;
  }

  // ---------- input ----------
  const USED = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'Enter', 'Escape'];
  function onKey(e) {
    if (!USED.includes(e.code)) return; e.preventDefault(); e.stopPropagation();
    const down = e.type === 'keydown';
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyL = down;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyR = down;
    if (!down) return; audio();
    if (e.code === 'Escape') close();
    else if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { if (state === 'title' || (state === 'results' && stateT > 0.6)) start(); }
  }
  const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const hitBtn = (lx, ly) => buttons.findIndex((b) => lx >= b.x && lx <= b.x + b.w && ly >= b.y - 4 && ly <= b.y + b.h + 4);
  function onDown(e) {
    audio(); const [lx, ly] = toLogical(e);
    if (state === 'title' || state === 'results') { const i = hitBtn(lx, ly); if (i >= 0) { const act = buttons[i].act; if (act === 'close') close(); else if (state === 'title' || stateT > 0.6) start(); } else if (state === 'title') start(); return; }
    if (state === 'play') { dragging = true; P.target = clamp(lx, 0, FW); try { cv.setPointerCapture(e.pointerId); } catch {} }
  }
  function onMove(e) {
    const [lx, ly] = toLogical(e);
    if (state === 'title' || state === 'results') { hover = hitBtn(lx, ly); cv.style.cursor = hover >= 0 || state === 'title' ? 'pointer' : 'default'; return; }
    if (dragging || e.pointerType === 'mouse') P.target = clamp(lx, 0, FW);
  }
  function onUp() { dragging = false; }
  function onVis() { hidden = document.hidden; keyL = keyR = false; last = 0; }
  function onBlur() { keyL = keyR = false; }
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true); addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVis);
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  wrap.querySelector('[data-k=close]').addEventListener('click', close);
  muteBtn.addEventListener('click', () => { muted = !muted; showMute(); try { localStorage.setItem('aa.games.mute', muted ? '1' : '0'); } catch {} if (!muted) { audio(); sfx.blip(); } });

  let closed = false;
  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); clearTimeout(loadGuard);
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVis);
    try { if (ac) ac.close(); } catch {}
    wrap.remove();
    onClose(lastResult || { score: 0, rank: 0, won: false });
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (hidden) { last = 0; return; }
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    step(dt); draw(now);
  }
  raf = requestAnimationFrame(loop);
  return { close };
}
