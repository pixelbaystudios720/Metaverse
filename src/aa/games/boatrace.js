// Boat Race (id: boatrace): a top-down toy speedboat race up a pastel river. You and three bonded agents ride glossy
// toy boats (the real 3D characters sit in the cockpits) for 3 laps of the same seeded stretch of river, with the
// start/finish arch at every lap line. Auto-throttle: steer with ←/→ or A/D (phone: hold the left/right half), dodge
// buoys, rocks and drifting logs, ride boost pads, grab smiley coins to fill the turbo meter and fire it with ↑/W/Space
// (phone: the TURBO button). Painted art lives in games/art/boatrace/; every piece falls back to a canvas drawing.
const W = 480, H = 720, TAU = Math.PI * 2, F = 'Fredoka, system-ui, sans-serif';
// river.jpg (1024x1116, seamless vertically) is drawn 480 wide, so one tile is 523 px tall; a lap is 10 tiles.
const TH = 523, LAP = TH * 10, LAPS = 3, FIN = LAP * LAPS, ANCHOR = 520;
const BW = 56, BH = 107, HW = 24, BASE = 250, PADX = 1.5, TURBOX = 1.75, STEER = 950, WAKE = 30, WAKE_LIFE = 1, RESPAWN = 6;
// The cockpit of the boat paintings (fractions of the sprite): the driver's bottom edge hides under the rear rim.
const RIM = { top: .5, cx: .5, cy: .45, rx: .36, ry: .25, seat: .7 };
// Where the water starts and ends on river.jpg (px at 1024 wide, 36 rows from the top, wrapping), measured from the art.
const BANK_L = [117, 113, 125, 151, 154, 149, 144, 134, 134, 135, 136, 138, 141, 154, 160, 147, 128, 127, 129, 135, 146, 140, 143, 169, 197, 189, 151, 148, 163, 172, 163, 141, 139, 148, 153, 136];
const BANK_R = [896, 901, 889, 877, 886, 893, 894, 898, 892, 884, 882, 889, 883, 857, 843, 838, 853, 877, 890, 889, 887, 883, 871, 875, 884, 891, 891, 883, 883, 884, 872, 862, 868, 879, 891, 894];
const C = { bg: '#130e22', plum: '#1d1033', lav: '#9b7cf0', lav2: '#c9b6ff', gold: '#ffd166', gold2: '#f0b440', mint: '#3cff8f', mint2: '#7ad7c4', pink: '#ff8fb8', red: '#ff6b81', cream: '#fbf6ea', ink: '#1b1230' };
const BOATS = [{ id: 'blue', col: '#46a6f2' }, { id: 'pink', col: '#ff6eb0' }, { id: 'green', col: '#5ed8a0' }, { id: 'orange', col: '#ff8c2e' }, { id: 'lavender', col: '#b291f4' }];
const PASTEL = ['#8cc8ff', '#ff8fb8', '#b8e07a', '#ffd166', '#7ad7c4', '#c9a6ff'];
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#b8e07a' }];
const SAY = {
  start: ['gm', 'LFG', 'gl hf', 'wagmi', 'lets gooo'], pass: ['see ya', 'too easy', 'LFG', 'zoom zoom', 'bye bye'],
  passed: ['nice one', 'hey!!', 'no way', 'ok ok', 'rude'], bonk: ['bonk', 'rugged!', 'oof', 'my boat!!', 'ow ow'],
  boost: ['wheee', 'nyoom', 'turbo!'], win: ['too easy', 'GG', 'LFG'], fin: ['gg', 'nice one', 'gg wp'], final: ['final lap!', 'LFG', 'locked in'],
};
const ORD = ['1st', '2nd', '3rd', '4th'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const hexOk = (h) => typeof h === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.trim());
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hexRgb(c) { let h = hexOk(c) ? c.trim().slice(1) : '9b7cf0'; if (h.length === 3) h = h.replace(/./g, (m) => m + m); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const shadeCache = new Map();
function shades(col) {
  let s = shadeCache.get(col); if (s) return s;
  const [r, g, b] = hexRgb(col), m = (t, k) => `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`;
  s = { light: m(255, .5), pale: m(255, .78), base: `rgb(${r},${g},${b})`, dark: m(20, .32), deep: m(20, .55) }; shadeCache.set(col, s); return s;
}
function okHue(hex) { // perceptual hue (OKLab) for matching boat colours to racer colours
  const [r, g, b] = hexRgb(hex).map((v) => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, B = .0259040371 * l + .7827717662 * m - .808675766 * s;
  return { h: Math.atan2(B, A), c: Math.hypot(A, B) };
}
const hueDist = (a, b) => (a.c < .035 ? .6 : Math.abs(Math.atan2(Math.sin(a.h - b.h), Math.cos(a.h - b.h))));
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); c.fill(); }
function txt(c, s, x, y, size, col, { w = 700, align = 'center', stroke = 0, sc = 'rgba(19,14,34,.9)' } = {}) {
  c.font = `${w} ${size}px ${F}`; c.textAlign = align; c.textBaseline = 'middle';
  if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = sc; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}
function bankAt(tab, d) { // x (game px) of a bank edge at river distance d
  const f = ((((-d) % TH) + TH) % TH) / TH * 36, i = Math.floor(f), u = f - i, a = tab[i % 36], b = tab[(i + 1) % 36];
  return (a + (b - a) * u) * (W / 1024);
}
function star(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); }

// One blob helper for everyone without a sprite: soft glossy body, big shiny eyes, blush, tiny smile, nub arms.
function drawBlob(c, x, y, r, color, { look = 0, squash = 0, blink = false, mood = 'happy' } = {}) {
  const s = shades(color), rx = r * (1 + squash), ry = r * (1 - squash);
  c.save(); c.translate(x, y);
  c.fillStyle = s.dark; ell(c, -rx * .95, ry * .3, r * .26, r * .2, .5); ell(c, rx * .95, ry * .3, r * .26, r * .2, -.5);
  const g = c.createRadialGradient(-r * .35, -r * .45, r * .1, 0, 0, r * 1.2); g.addColorStop(0, s.light); g.addColorStop(.55, s.base); g.addColorStop(1, s.dark);
  c.fillStyle = g; ell(c, 0, 0, rx, ry);
  c.fillStyle = 'rgba(255,255,255,.55)'; ell(c, -rx * .38, -ry * .52, r * .26, r * .12, -.6);
  const fx = look * r * .14, ey = -r * .06;
  c.strokeStyle = C.ink; c.lineCap = 'round'; c.lineWidth = Math.max(1.2, r * .09);
  if (mood === 'dizzy') { for (const d of [-1, 1]) { const cx = fx + d * r * .32, k = r * .1; c.beginPath(); c.moveTo(cx - k, ey - k); c.lineTo(cx + k, ey + k); c.moveTo(cx + k, ey - k); c.lineTo(cx - k, ey + k); c.stroke(); } }
  else if (blink) { c.beginPath(); c.arc(fx - r * .32, ey, r * .12, .2, Math.PI - .2); c.moveTo(fx + r * .44, ey); c.arc(fx + r * .32, ey, r * .12, .2, Math.PI - .2); c.stroke(); }
  else for (const d of [-1, 1]) { const ex = fx + d * r * .32; c.fillStyle = '#140c24'; ell(c, ex, ey, r * .16, r * .21); c.fillStyle = '#fff'; ell(c, ex - r * .05, ey - r * .08, r * .065, r * .065); ell(c, ex + r * .05, ey + r * .07, r * .03, r * .03); }
  c.fillStyle = 'rgba(255,143,184,.6)'; ell(c, fx - r * .58, ey + r * .3, r * .16, r * .09); ell(c, fx + r * .58, ey + r * .3, r * .16, r * .09);
  c.beginPath();
  if (mood === 'cheer') { c.fillStyle = '#5a1630'; c.arc(fx, ey + r * .22, r * .16, 0, Math.PI); c.closePath(); c.fill(); }
  else if (mood === 'sad' || mood === 'dizzy') { c.arc(fx, ey + r * .45, r * .12, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
  else { c.arc(fx, ey + r * .18, r * .13, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  c.restore();
}

// ---------- canvas fallbacks for the painted sprites (same framing as the art, drawn once into caches) ----------
function paintBoat(g, w, h, col) {
  const s = shades(col), cx = w / 2, cy = h * .44, P = (k, fx, fy) => [cx + (fx * w - cx) * k, cy + (fy * h - cy) * k];
  const hull = (k) => { g.beginPath(); g.moveTo(...P(k, .5, .01)); g.bezierCurveTo(...P(k, .92, .08), ...P(k, 1, .3), ...P(k, 1, .5)); g.bezierCurveTo(...P(k, 1, .7), ...P(k, .84, .8), ...P(k, .5, .8)); g.bezierCurveTo(...P(k, .16, .8), ...P(k, 0, .7), ...P(k, 0, .5)); g.bezierCurveTo(...P(k, 0, .3), ...P(k, .08, .08), ...P(k, .5, .01)); g.closePath(); };
  g.fillStyle = s.dark; rr(g, w * .44, h * .86, w * .12, h * .13, w * .05); g.fill();
  const mg = g.createLinearGradient(w * .3, 0, w * .7, 0); mg.addColorStop(0, s.light); mg.addColorStop(1, s.base);
  g.fillStyle = mg; rr(g, w * .3, h * .7, w * .4, h * .2, w * .12); g.fill(); g.fillStyle = C.cream; g.fillRect(w * .3, h * .8, w * .4, h * .035);
  const hg = g.createLinearGradient(0, 0, w, 0); hg.addColorStop(0, s.light); hg.addColorStop(.4, s.base); hg.addColorStop(1, s.dark);
  g.fillStyle = hg; hull(1); g.fill(); g.fillStyle = C.cream; hull(.86); g.fill(); g.fillStyle = s.base; hull(.75); g.fill();
  g.fillStyle = C.cream; g.beginPath(); g.moveTo(w * .5, h * .1); g.quadraticCurveTo(w * .76, h * .2, w * .8, h * .34); g.lineTo(w * .2, h * .34); g.quadraticCurveTo(w * .24, h * .2, w * .5, h * .1); g.fill();
  g.fillStyle = s.base; ell(g, w * .5, h * .07, w * .06, h * .03);
  g.strokeStyle = 'rgba(140,210,255,.95)'; g.lineWidth = h * .045; g.lineCap = 'round'; g.beginPath(); g.ellipse(w * .5, h * .47, w * .33, h * .14, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  g.fillStyle = '#e6dccb'; rr(g, w * .2, h * .38, w * .6, h * .32, w * .14); g.fill();
  g.fillStyle = C.cream; rr(g, w * .28, h * .43, w * .44, h * .11, w * .09); g.fill(); rr(g, w * .28, h * .555, w * .44, h * .12, w * .09); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; ell(g, w * .13, h * .42, w * .04, h * .13, .1);
}
function paintBuoy(g, w, h) {
  const bx = w * .5, by = h * .68, r = w * .46;
  g.strokeStyle = '#f4efe6'; g.lineWidth = w * .08; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * .46, by - r * .7); g.lineTo(w * .46, h * .09); g.stroke();
  g.fillStyle = C.red; g.beginPath(); g.moveTo(w * .5, h * .06); g.lineTo(w * .96, h * .15); g.lineTo(w * .5, h * .25); g.fill();
  g.fillStyle = C.gold; ell(g, w * .46, h * .07, w * .07, w * .07);
  const gr = g.createRadialGradient(bx - r * .4, by - r * .4, r * .1, bx, by, r); gr.addColorStop(0, '#ff9aa6'); gr.addColorStop(.6, '#f0405a'); gr.addColorStop(1, '#b8203a');
  g.fillStyle = gr; ell(g, bx, by, r, r);
  g.save(); g.beginPath(); g.arc(bx, by, r, 0, TAU); g.clip(); g.fillStyle = C.cream; g.fillRect(0, by - r * .22, w, r * .44); g.restore();
  g.fillStyle = 'rgba(255,255,255,.6)'; ell(g, bx - r * .4, by - r * .45, r * .3, r * .15, -.5);
}
function paintRock(g, w, h) {
  const cx = w * .5, cy = h * .56;
  g.fillStyle = 'rgba(255,255,255,.92)'; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ell(g, cx + Math.cos(a) * w * .4, cy + h * .1 + Math.sin(a) * h * .24, w * .08, h * .07); }
  const gr = g.createRadialGradient(cx - w * .12, cy - h * .2, 2, cx, cy, w * .42); gr.addColorStop(0, '#d4cdea'); gr.addColorStop(.5, '#8f88b0'); gr.addColorStop(1, '#5e5880');
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, w * .36, h * .38, 0, Math.PI, 0); g.quadraticCurveTo(cx + w * .36, cy + h * .26, cx, cy + h * .27); g.quadraticCurveTo(cx - w * .36, cy + h * .26, cx - w * .36, cy); g.fill();
  g.fillStyle = '#8fcf6a'; ell(g, cx + w * .08, cy - h * .3, w * .14, h * .07, .2);
  g.fillStyle = 'rgba(255,255,255,.45)'; ell(g, cx - w * .14, cy - h * .18, w * .1, h * .05, -.4);
}
function paintLog(g, w, h) {
  const cy = h * .5;
  g.fillStyle = 'rgba(255,255,255,.92)'; for (let i = 0; i < 16; i++) ell(g, w * (.07 + i * .057), cy + h * .22 + Math.sin(i * 1.7) * h * .05, w * .05, h * .1);
  const gr = g.createLinearGradient(0, cy - h * .3, 0, cy + h * .3); gr.addColorStop(0, '#d39258'); gr.addColorStop(.5, '#9a5f34'); gr.addColorStop(1, '#6e4024');
  g.fillStyle = gr; rr(g, w * .1, cy - h * .28, w * .8, h * .56, h * .28); g.fill();
  g.fillStyle = '#ecc08a'; ell(g, w * .16, cy, w * .07, h * .26); g.strokeStyle = '#b07a48'; g.lineWidth = 2; g.beginPath(); g.ellipse(w * .16, cy, w * .04, h * .15, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(70,40,20,.35)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w * (.32 + i * .16), cy - h * .1 + i * 5); g.lineTo(w * (.44 + i * .16), cy - h * .1 + i * 5); g.stroke(); }
}
function paintPad(g, w, h) {
  const cx = w / 2, cy = h * .5, rx = w * .46, ry = h * .44;
  g.fillStyle = '#d99a1a'; ell(g, cx, cy + h * .04, rx, ry);
  const gr = g.createLinearGradient(0, cy - ry, 0, cy + ry); gr.addColorStop(0, '#fff0a0'); gr.addColorStop(1, '#f0b440'); g.fillStyle = gr; ell(g, cx, cy, rx, ry);
  const mg = g.createRadialGradient(cx, cy - ry * .2, 2, cx, cy, rx * .8); mg.addColorStop(0, '#e6fff4'); mg.addColorStop(1, '#5fe0b0'); g.fillStyle = mg; ell(g, cx, cy, rx * .78, ry * .76);
  g.strokeStyle = '#2fbf8a'; g.lineWidth = w * .07; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) { const y = cy - ry * .42 + i * ry * .32; g.beginPath(); g.moveTo(cx - rx * .34, y + ry * .2); g.lineTo(cx, y); g.lineTo(cx + rx * .34, y + ry * .2); g.stroke(); }
}
function paintCoin(g, w) {
  const r = w * .46, cx = w / 2, cy = w / 2;
  g.fillStyle = '#c98f22'; ell(g, cx + r * .07, cy + r * .07, r, r);
  const gr = g.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.6, C.gold); gr.addColorStop(1, C.gold2); g.fillStyle = gr; ell(g, cx, cy, r * .93, r * .93);
  g.fillStyle = '#9a6a10'; ell(g, cx - r * .3, cy - r * .18, r * .11, r * .16); ell(g, cx + r * .3, cy - r * .18, r * .11, r * .16);
  g.strokeStyle = '#9a6a10'; g.lineWidth = r * .13; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + r * .02, r * .42, .2 * Math.PI, .8 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, cx - r * .42, cy - r * .48, r * .18, r * .09, -.6);
}
function paintGate(g, w, h) {
  const pil = (x) => {
    const gr = g.createLinearGradient(x, 0, x + w * .13, 0); gr.addColorStop(0, '#ffc6dc'); gr.addColorStop(.5, '#ff8fb8'); gr.addColorStop(1, '#de5f8d');
    g.fillStyle = gr; rr(g, x, h * .04, w * .13, h * .94, w * .05); g.fill();
    g.fillStyle = C.gold2; for (const y of [.3, .8]) { rr(g, x - w * .01, h * y, w * .15, h * .1, h * .05); g.fill(); }
    g.fillStyle = C.cream; for (const y of [.55, .68]) ell(g, x + w * .065, h * y, w * .017, w * .017);
  };
  pil(0); pil(w * .87);
  g.save(); rr(g, w * .11, h * .08, w * .78, h * .27, h * .13); g.clip();
  const n = 26, sq = w * .78 / n; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? C.ink : C.cream; g.fillRect(w * .11 + i * sq, h * .08 + j * h * .135, sq + .5, h * .135 + .5); }
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(w * .11, h * .09, w * .78, h * .05); g.restore();
  g.strokeStyle = C.cream; g.lineWidth = 1; g.beginPath(); g.moveTo(w * .13, h * .38); g.quadraticCurveTo(w * .5, h * .56, w * .87, h * .38); g.stroke();
  const cols = [C.pink, C.lav2, C.mint2, '#fff1a8'];
  for (let i = 0; i < 12; i++) { const t = (i + .5) / 12, x = w * (.13 + .74 * t), y = h * (.38 + .36 * t * (1 - t)); g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(x - w * .02, y); g.lineTo(x + w * .02, y); g.lineTo(x, y + h * .14); g.fill(); }
}
function paintFlag(g, w, h) {
  g.fillStyle = C.gold2; rr(g, w * .08, h * .08, w * .07, h * .86, w * .03); g.fill(); g.fillStyle = C.gold; ell(g, w * .115, h * .08, w * .065, w * .065);
  const n = 5, m = 4, x0 = w * .15, y0 = h * .14, fw = w * .78, fh = h * .5, wv = (u) => Math.sin(u * 3.4) * h * .07;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const ax = x0 + fw * i / n, bx = x0 + fw * (i + 1) / n; g.fillStyle = (i + j) % 2 ? C.ink : C.cream;
    g.beginPath(); g.moveTo(ax, y0 + fh * j / m + wv(i / n)); g.lineTo(bx + .4, y0 + fh * j / m + wv((i + 1) / n)); g.lineTo(bx + .4, y0 + fh * (j + 1) / m + wv((i + 1) / n) + .4); g.lineTo(ax, y0 + fh * (j + 1) / m + wv(i / n) + .4); g.fill();
  }
}
function paintTrophy(g, w, h) {
  const gold = g.createLinearGradient(0, 0, w, 0); gold.addColorStop(0, '#fff3b0'); gold.addColorStop(.45, C.gold); gold.addColorStop(1, '#d99a1a');
  g.strokeStyle = C.gold2; g.lineWidth = w * .07; g.beginPath(); g.arc(w * .25, h * .3, w * .12, Math.PI * .5, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(w * .75, h * .3, w * .12, -Math.PI * .5, Math.PI * .5); g.stroke();
  g.fillStyle = gold; g.beginPath(); g.moveTo(w * .24, h * .12); g.lineTo(w * .76, h * .12); g.quadraticCurveTo(w * .77, h * .52, w * .5, h * .6); g.quadraticCurveTo(w * .23, h * .52, w * .24, h * .12); g.fill();
  rr(g, w * .44, h * .58, w * .12, h * .17, 4); g.fill(); rr(g, w * .3, h * .74, w * .4, h * .1, 8); g.fill(); rr(g, w * .23, h * .84, w * .54, h * .11, 8); g.fill();
  g.fillStyle = '#fff6c8'; star(g, w * .5, h * .32, w * .11); g.fillStyle = 'rgba(255,255,255,.55)'; ell(g, w * .34, h * .25, w * .04, h * .1, .2);
}
function paintSplash(g, w, h) {
  const cx = w / 2, cy = h * .55;
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + .2, d = w * (i % 2 ? .3 : .36); g.fillStyle = i % 3 ? '#c4ecff' : '#ffffff'; g.save(); g.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .82); g.rotate(a + Math.PI / 2); ell(g, 0, 0, w * .045, w * .09); g.restore(); }
  g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ell(g, cx + Math.cos(a) * w * .18, cy + Math.sin(a) * w * .15, w * .05, w * .04); }
}
function paintRiver(g, w, h) { // seamless tile whose banks follow the same BANK tables the physics uses
  const R = mulberry32(99), wrapY = (fn) => { for (const oy of [-h, 0, h]) fn(oy); };
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#5ccbec'); gr.addColorStop(.5, '#7fd8f6'); gr.addColorStop(1, '#93b6ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) { const x = 90 + R() * 300, y = R() * h, r = 60 + R() * 70; wrapY((oy) => { const rg = g.createRadialGradient(x, y + oy, 4, x, y + oy, r); rg.addColorStop(0, 'rgba(190,170,255,.45)'); rg.addColorStop(1, 'rgba(190,170,255,0)'); g.fillStyle = rg; g.fillRect(x - r, y + oy - r, r * 2, r * 2); }); }
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { const x = 80 + R() * 300, y = R() * h, l = 24 + R() * 40; wrapY((oy) => { g.beginPath(); g.moveTo(x, y + oy); g.bezierCurveTo(x + l * .3, y + oy - 6, x + l * .6, y + oy + 6, x + l, y + oy); g.stroke(); }); }
  const bx = (tab, y) => { const f = y / h * 36, i = Math.floor(f), u = f - i; return (tab[i % 36] + (tab[(i + 1) % 36] - tab[i % 36]) * u) * w / 1024; };
  for (const side of [0, 1]) {
    const tab = side ? BANK_R : BANK_L, e = side ? w : 0, path = (off) => { g.beginPath(); g.moveTo(e, -2); for (let y = -2; y <= h + 2; y += 4) g.lineTo(bx(tab, clamp(y, 0, h - .01)) + off, y); g.lineTo(e, h + 2); g.closePath(); };
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 5; path(side ? -7 : 7); g.stroke();
    const gg = g.createLinearGradient(side ? w : 0, 0, side ? w - 90 : 90, 0); gg.addColorStop(0, '#7ccd5c'); gg.addColorStop(1, '#a8e27c'); g.fillStyle = gg; path(0); g.fill();
    g.strokeStyle = 'rgba(70,140,60,.45)'; g.lineWidth = 3; path(side ? 2 : -2); g.stroke();
    for (let i = 0; i < 9; i++) {
      const y = i / 9 * h + R() * 30, edge = bx(tab, clamp(y, 0, h - 1)), x = side ? edge + 14 + R() * (w - edge - 26) : 12 + R() * (edge - 26), k = R();
      wrapY((oy) => {
        if (k < .5) { for (let j = 0; j < 5; j++) { g.fillStyle = j % 2 ? '#ffb3cf' : '#ff8fb8'; ell(g, x + Math.cos(j * 1.3) * 7, y + oy + Math.sin(j * 1.3) * 6, 6, 6); } g.fillStyle = '#fff1f6'; ell(g, x, y + oy, 3, 3); }
        else if (k < .8) { g.fillStyle = '#c9c2d8'; ell(g, x, y + oy, 8, 6); g.fillStyle = 'rgba(255,255,255,.6)'; ell(g, x - 2, y + oy - 2, 3, 2); }
        else { g.fillStyle = '#6b4a3a'; g.fillRect(x - 1.5, y + oy - 12, 3, 14); g.fillStyle = '#ffe2a0'; rr(g, x - 5, y + oy - 20, 10, 10, 3); g.fill(); }
      });
    }
  }
}

export function open({ me = { name: 'You', color: '#9b7cf0' }, agents = [], onClose = () => {}, _test = null } = {}) {
  if (typeof me === 'string') me = { name: me };
  if (!me || typeof me !== 'object') me = {};
  const meColor = hexOk(me.color) ? me.color.trim() : C.lav, tst = _test && typeof _test === 'object' ? _test : null, auto = () => !!(tst && tst.auto);
  // three rivals: shuffled bonded agents, topped up from the fallback crew
  const pool = (Array.isArray(agents) ? agents : []).filter((a) => a && typeof a === 'object');
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picks = pool.slice(0, 3).map((a, i) => ({ name: String(a.name || 'AGENT').toUpperCase().slice(0, 10), color: hexOk(a.color) ? a.color.trim() : PASTEL[i], img: a.img || null }));
  for (const f of FALLBACK) if (picks.length < 3 && !picks.some((p) => p.name === f.name)) picks.push({ ...f, img: null });

  // ---------- DOM shell ----------
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(12,8,28,.82);font-family:Fredoka,system-ui,sans-serif';
  const btnCss = 'position:absolute;top:12px;width:min(40px,9vw);height:min(40px,9vw);border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;cursor:pointer;box-shadow:0 0 0 1.5px rgba(155,124,240,.6);display:grid;place-items:center;padding:0';
  wrap.innerHTML = `<div style="position:relative;width:min(560px,calc(100vw - 24px),calc((100vh - 24px) * 2 / 3));width:min(560px,calc(100vw - 24px),calc((100dvh - 24px) * 2 / 3));aspect-ratio:2/3;border-radius:22px;overflow:hidden;background:#130e22;box-shadow:0 0 0 3px #9b7cf0,0 0 0 8px rgba(155,124,240,.18),0 30px 80px rgba(0,0,0,.6)">
    <canvas style="display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;cursor:pointer"></canvas>
    <button data-k="mute" aria-label="Toggle sound" style="${btnCss};right:calc(min(40px,9vw) + 18px);font:600 17px/1 Fredoka,system-ui"></button>
    <button data-k="close" aria-label="Close Boat Race" style="${btnCss};right:12px;font:700 24px/1 Fredoka,system-ui">×</button></div>`;
  document.body.appendChild(wrap);
  const frame = wrap.firstElementChild, cv = frame.querySelector('canvas'), c = cv.getContext('2d'), muteBtn = frame.querySelector('[data-k=mute]'), closeBtn = frame.querySelector('[data-k=close]');
  let K = 0, uiTop = 66;
  function fit() { // backing store follows the CSS size (crisp on retina), re-baked when it changes noticeably
    const r = frame.getBoundingClientRect(), cw = r.width || W, k = clamp(Math.min(2, window.devicePixelRatio || 1) * cw / W, 1, 2.5);
    const b = closeBtn.getBoundingClientRect(); if (r.height) uiTop = clamp((b.bottom - r.top) / r.height * H + 8, 56, 96);
    if (K && Math.abs(k - K) / K < .08) return false;
    K = k; cv.width = Math.round(W * K); cv.height = Math.round(H * K); return true;
  }
  fit();
  let muted = false; try { muted = localStorage.getItem('aa.games.mute') === '1'; } catch {}
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; }; paintMute();
  try { document.fonts && document.fonts.load(`700 20px Fredoka`).catch(() => {}); } catch {}

  // ---------- sound (tiny WebAudio synth) ----------
  let ac = null, out = null, nbuf = null, hum = null;
  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = .55; out.connect(ac.destination);
      nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch { ac = null; }
  }
  function tone(f, d, type = 'sine', v = .1, f2 = 0, delay = 0) {
    if (!ac || muted) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + d + .03);
  }
  function noise(d, v, f0, f1 = f0, delay = 0) {
    if (!ac || muted || !nbuf) return; const t = ac.currentTime + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; fl.type = 'bandpass'; fl.Q.value = .9; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + d + .02);
  }
  const sfx = {
    blip: () => { tone(660, .16, 'square', .06); tone(1320, .08, 'sine', .04); },
    horn: () => { for (const [f, v] of [[392, .07], [494, .06], [587, .05]]) { tone(f, .62, 'sawtooth', v * .7); tone(f * 2, .5, 'triangle', v * .5); } noise(.4, .06, 900, 400); },
    coin: () => { tone(1046, .08, 'square', .04); tone(1568, .24, 'triangle', .09, 0, .06); },
    pad: () => { noise(.5, .16, 450, 2600); tone(320, .38, 'sine', .07, 980); },
    turbo: () => { noise(.9, .2, 300, 3200); tone(180, .75, 'sawtooth', .045, 760); tone(660, .3, 'triangle', .05, 1320, .1); },
    bonk: () => { tone(230, .2, 'triangle', .2, 80); tone(560, .1, 'square', .04, 280); noise(.14, .12, 900, 300); },
    splash: (v = 1) => { noise(.5, .2 * v, 1900, 380); tone(180, .14, 'sine', .05 * v, 70); },
    bump: () => tone(150, .12, 'sine', .14, 90),
    scrape: () => noise(.18, .05, 700, 450),
    nope: () => tone(220, .12, 'square', .03, 180),
    lap: () => [784, 988].forEach((f, i) => tone(f, .16, 'triangle', .08, 0, i * .09)),
    final: () => [659, 784, 988, 1318].forEach((f, i) => tone(f, .18, 'square', .045, 0, i * .08)),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i === 6 ? .5 : .16, 'triangle', .1, 0, i * .1)),
    soft: () => [659, 587, 523, 587].forEach((f, i) => tone(f, .26, 'triangle', .07, 0, i * .14)),
    click: () => tone(700, .06, 'triangle', .06),
  };
  function humOn() { // a very quiet motor hum whose pitch follows your speed
    if (!ac || hum) return;
    try {
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lfo.frequency.value = 11; lg.gain.value = .006; f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 1.5; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(out); lfo.connect(lg); lg.connect(g.gain); o1.start(); o2.start(); lfo.start(); hum = { o1, o2, lfo, f, g };
    } catch { hum = null; }
  }
  function humSet(on, k) {
    if (!hum) return; const t = ac.currentTime;
    hum.g.gain.setTargetAtTime(on && !muted ? .016 + .016 * k : 0, t, .08);
    hum.o1.frequency.setTargetAtTime(46 + 44 * k, t, .12); hum.o2.frequency.setTargetAtTime(69 + 66 * k, t, .12); hum.f.frequency.setTargetAtTime(280 + 520 * k, t, .12); hum.lfo.frequency.setTargetAtTime(9 + 10 * k, t, .12);
  }

  // ---------- racers ----------
  const mk = (name, color, img, you) => ({
    name, color, img, you, src: null, cock: null, face: null, body: null, boat: 0, x: 0, d: 0, v: 0, vx: 0, steer: 0, tilt: 0, spin: 0, spinDir: 1, inv: 0, hitT: -9,
    boost: 0, padCd: 0, turbo: 0, meter: 0, fin: 0, finD: 0, est: 0, coins: 0, lap: 1, top: 1, skill: 1, greed: .5, fumble: 0, plan: 0, tx: 0, ignore: null, seen: null,
    side: 0, bub: '', bubT: 0, sayCd: 0, ph: Math.random() * TAU, wake: new Float32Array(WAKE * 3), wakeN: 0, wakeI: 0, wakeT: 0, sprayT: 0, bankT: 0, blinkT: rnd(1, 4), hits: 0,
  });
  const you = mk('YOU', meColor, me.img || null, true), rivals = picks.map((p) => mk(p.name, p.color, p.img, false)), racers = [you, ...rivals], ord = racers.slice();
  { // boats: nearest hue to each racer's colour, no two racers on the same boat colour (you count a bit more)
    const hb = BOATS.map((b) => okHue(b.col)), want = racers.map((r) => okHue(r.color)); let best = [0, 1, 2, 3], bc = 1e9;
    const perm = (i, used, acc, cost) => { if (cost >= bc) return; if (i === racers.length) { bc = cost; best = acc.slice(); return; } for (let b = 0; b < BOATS.length; b++) if (!(used & (1 << b))) { acc[i] = b; perm(i + 1, used | (1 << b), acc, cost + (i ? 1 : 1.5) * hueDist(want[i], hb[b])); } };
    perm(0, 0, [], 0); racers.forEach((r, i) => { r.boat = best[i]; });
  }
  const PERS = [{ top: 1.005, skill: .92, greed: .55, fumble: .05 }, { top: .985, skill: .84, greed: .9, fumble: .08 }, { top: .97, skill: .76, greed: .35, fumble: .12 }].sort(() => Math.random() - .5);
  rivals.forEach((r, i) => Object.assign(r, PERS[i]));
  Object.assign(you, { skill: 1, greed: .7, fumble: 0 }, tst && tst.you);

  // ---------- art: load, verify, bake into crisp caches (canvas drawings where a file is missing or broken) ----------
  const FILES = { river: 'river.jpg', b0: 'boat-blue.png', b1: 'boat-pink.png', b2: 'boat-green.png', b3: 'boat-orange.png', b4: 'boat-lavender.png', buoy: 'buoy.png', rock: 'rock.png', pad: 'boost.png', log: 'log.png', gate: 'gate.png', flag: 'flag.png', trophy: 'trophy.png', splash: 'splash.png' };
  const ART = {}, art = {}, artURL = (p) => { try { return new URL(p, import.meta.url).href; } catch { return null; } };
  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im.naturalWidth ? im : null)); im.onerror = () => res(null); im.src = src; });
  let loadN = 0, loadOf = 0, ready = false, closed = false;
  const track = (p) => { loadOf++; return p.then((v) => { loadN++; return v; }); };
  const loads = [
    ...Object.entries(FILES).map(([k, f]) => track(loadImg(artURL(`./art/boatrace/${f}`))).then((im) => { ART[k] = im; })),
    track(loadImg(artURL('./art/coincatch/coin.png'))).then((im) => { ART.coin = im; }),
    track(loadImg(artURL('./art/world/poster-boatrace.jpg'))).then((im) => { ART.poster = im; }),
    ...racers.map((r) => track(loadImg(r.img)).then((im) => { r.src = im; })),
  ];
  function alphaOk(im) { // a sprite must really be transparent around the edges (no baked backdrop)
    try { const k = document.createElement('canvas'); k.width = 4; k.height = 1; const g = k.getContext('2d'), w = im.naturalWidth - 1, h = im.naturalHeight - 1; [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y], i) => g.drawImage(im, x, y, 1, 1, i, 0, 1, 1)); const d = g.getImageData(0, 0, 4, 1).data; return d[3] < 40 && d[7] < 40 && d[11] < 40 && d[15] < 40; } catch { return true; }
  }
  function layer(w, h, fn) { const k = document.createElement('canvas'); k.width = Math.max(1, Math.ceil(w * K)); k.height = Math.max(1, Math.ceil(h * K)); const g = k.getContext('2d'); g.scale(k.width / w, k.height / h); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; fn(g, w, h); return k; }
  function drawHQ(g, im, sx, sy, sw, sh, dx, dy, dw, dh) { // halve step by step for a clean downscale, then one high-quality draw
    let src = im, x = sx, y = sy, w = sw, h = sh; const tw = dw * K, th = dh * K;
    while (w / 2 >= tw && h / 2 >= th && w > 2) { const t = document.createElement('canvas'); t.width = Math.round(w / 2); t.height = Math.round(h / 2); const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(src, x, y, w, h, 0, 0, t.width, t.height); src = t; x = 0; y = 0; w = t.width; h = t.height; }
    g.drawImage(src, x, y, w, h, dx, dy, dw, dh);
  }
  const SH_M = 8;
  function shadowOf(src, w, h, blur = 3.5) { // soft drop shadow: the sprite's silhouette, blurred
    return layer(w + SH_M * 2, h + SH_M * 2, (g) => { const k = g.canvas.width / (w + SH_M * 2); g.setTransform(1, 0, 0, 1, 0, 0); g.shadowColor = 'rgba(10,36,80,1)'; g.shadowBlur = blur * k; g.shadowOffsetX = 5000; g.drawImage(src, SH_M * k - 5000, SH_M * k, w * k, h * k); });
  }
  function sprite(key, w, paint, aspect) { // { c: canvas, w, h, art: bool }
    const im = ART[key] && alphaOk(ART[key]) ? ART[key] : null, h = im ? w * im.naturalHeight / im.naturalWidth : w * aspect;
    return { c: layer(w, h, (g) => (im ? drawHQ(g, im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, w, h) : paint(g, w, h))), w, h, art: !!im };
  }
  function trim(im) { // bbox of the solid character (alpha > 150 skips the soft ground ring and sparkles)
    try {
      const k = document.createElement('canvas'), w = k.width = im.naturalWidth, h = k.height = im.naturalHeight, g = k.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 150) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    } catch { return { x: im.naturalWidth * .1, y: im.naturalHeight * .12, w: im.naturalWidth * .8, h: im.naturalHeight * .8 }; }
  }
  function clean(cnv) { // drop the faint ground-ring pixels from the bottom of a blob crop
    try { const g = cnv.getContext('2d'), y0 = Math.floor(cnv.height * .72), d = g.getImageData(0, y0, cnv.width, cnv.height - y0); for (let i = 3; i < d.data.length; i += 4) if (d.data[i] < 110) d.data[i] = 0; g.putImageData(d, 0, y0); } catch {}
  }
  function prepRacer(r) {
    r.cock = r.face = r.body = null; const im = r.src; if (!im) return;
    const t = trim(im); if (!t) return;
    const tall = t.h / t.w > 1.25; r.tall = tall;
    // cockpit crop: the person shows head + shoulders, a blob shows all of itself; the rim hides the cut
    const cw = tall ? 49 : 53, sh = tall ? t.h * .62 : t.h, ch = sh * cw / t.w;
    r.cock = layer(cw, ch, (g) => drawHQ(g, im, t.x, t.y, t.w, sh, 0, 0, cw, ch)); if (!tall) clean(r.cock);
    r.cockW = cw; r.cockH = ch; r.cockDx = tall ? 0 : cw * .07;
    // round face icon (HUD strip, results) and the full body (podium, title)
    const fx = t.x + t.w * (tall ? .5 : .42), fy = t.y + t.h * (tall ? .3 : .55), fr = t.w * (tall ? .42 : .4), R = 24;
    r.face = layer(R * 2, R * 2, (g) => { g.beginPath(); g.arc(R, R, R, 0, TAU); g.clip(); g.fillStyle = shades(r.color).pale; g.fillRect(0, 0, R * 2, R * 2); drawHQ(g, im, fx - fr, fy - fr, fr * 2, fr * 2, 0, 0, R * 2, R * 2); });
    const bh = 90, bw = bh * t.w / t.h; r.body = layer(bw, bh, (g) => drawHQ(g, im, t.x, t.y, t.w, t.h, 0, 0, bw, bh)); r.bodyAR = t.w / t.h; if (!tall) clean(r.body);
  }
  function build() {
    const rv = ART.river; art.riverArt = !!rv;
    art.river = layer(W, TH, (g) => (rv ? drawHQ(g, rv, 0, 0, rv.naturalWidth, rv.naturalHeight, 0, 0, W, TH) : paintRiver(g, W, TH)));
    art.boats = BOATS.map((b, i) => {
      const im = ART['b' + i] && alphaOk(ART['b' + i]) ? ART['b' + i] : null;
      const hull = layer(BW, BH, (g) => (im ? drawHQ(g, im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, BW, BH) : paintBoat(g, BW, BH, b.col)));
      const rim = layer(BW, BH, (g) => { g.drawImage(hull, 0, 0, BW, BH); g.globalCompositeOperation = 'destination-out'; g.fillRect(0, 0, BW, BH * RIM.top); ell(g, BW * RIM.cx, BH * RIM.cy, BW * RIM.rx, BH * RIM.ry); });
      return { hull, rim, shadow: shadowOf(hull, BW, BH), art: !!im };
    });
    art.buoy = sprite('buoy', 38, paintBuoy, 1.37); art.rock = sprite('rock', 70, paintRock, .87); art.log = sprite('log', 112, paintLog, .54);
    art.pad = sprite('pad', 60, paintPad, .89); art.gate = sprite('gate', W, paintGate, .31); art.flag = sprite('flag', 70, paintFlag, .96);
    art.flagS = sprite('flag', 24, paintFlag, .96); art.trophy = sprite('trophy', 112, paintTrophy, .975); art.splash = sprite('splash', 84, paintSplash, .94);
    art.coin = sprite('coin', 28, paintCoin, 1); art.coinS = sprite('coin', 18, paintCoin, 1);
    for (const k of ['buoy', 'rock', 'log']) art[k].sh = shadowOf(art[k].c, art[k].w, art[k].h, 3);
    art.poster = ART.poster ? layer(392, 224, (g) => drawHQ(g, ART.poster, 0, 0, ART.poster.naturalWidth, ART.poster.naturalHeight, 0, 0, 392, 224)) : null;
    for (const r of racers) prepRacer(r);
  }
  function onReady() {
    if (ready || closed) return; ready = true;
    try { build(); } catch { for (const k of Object.keys(ART)) ART[k] = null; for (const r of racers) r.src = null; build(); }
    if (state === 'loading') state = 'title';
  }
  Promise.all(loads).then(onReady); setTimeout(onReady, 8000);
  const glints = Array.from({ length: 16 }, (_, i) => ({ x: 90 + ((i * 97) % 300), y: (i * 211) % TH, p: i * 1.7 }));
  const flecks = Array.from({ length: 14 }, (_, i) => ({ x: 100 + ((i * 71) % 280), y: (i * 151) % TH, s: 18 + (i % 4) * 6 }));
  const lines = Array.from({ length: 16 }, () => ({ x: rnd(10, W - 10), y: rnd(0, H), l: rnd(50, 120), v: rnd(900, 1500) }));

  // ---------- course: one seeded stretch, the same every lap ----------
  let obs = [], pads = [], coins = [], seed = 0;
  function buildCourse(sd) {
    const R = mulberry32(sd), O = [], PD = [], CN = [];
    const lo = (p) => bankAt(BANK_L, p) + 36, hi = (p) => bankAt(BANK_R, p) - 36, at = (p, f) => lo(p) + (hi(p) - lo(p)) * clamp(f, 0, 1);
    const buoy = (p, f) => O.push({ k: 'buoy', p, x: at(p, f), r: 15, ph: R() * TAU, hit: -9 });
    const rock = (p, f) => O.push({ k: 'rock', p, x: at(p, f), r: 23, ph: R() * TAU, hit: -9 });
    const log = (p) => { const a = lo(p) + 42, b = hi(p) - 42; O.push({ k: 'log', p, cx: (a + b) / 2, amp: (b - a) / 2, w: .32 + R() * .22, ph: R() * TAU, half: 38, r: 13, hit: -9 }); };
    const pad = (p, f) => PD.push({ p, x: at(p, f) });
    const cand = [], line = (p, f0, f1, n = 5) => cand.push([p, f0, f1, n]);
    const feats = [
      (p) => { const s = R() < .5 ? 0 : 1; for (let i = 0; i < 3; i++) { const q = p + i * 230, l = (s + i) % 2 === 0; buoy(q, l ? 0 : .68); buoy(q, l ? .32 : 1); } line(p + 85, s ? .25 : .75, s ? .75 : .25); return 480; },
      (p) => { const f = R() * .3; rock(p, f); rock(p + 80, f + .58 + R() * .12); line(p + 150, .5, .5, 4); return 260; },
      (p) => { log(p); line(p + 90, R() < .5 ? .1 : .9, .5); return 230; },
      (p) => { rock(p, .08); rock(p, .92); pad(p, .5); line(p - 190, .5, .5, 4); return 40; },
      (p) => { const f = .15 + R() * .7; line(p, f, f); rock(p + 220, f); return 240; },
      (p) => { const s = R() < .5; for (let i = 0; i < 3; i++) buoy(p + i * 80, s ? .1 + i * .4 : .9 - i * .4); pad(p + 200, s ? .15 : .85); return 220; },
      (p) => { const f = R() < .5 ? .22 : .78; pad(p, f); rock(p + 120, f); line(p + 10, 1 - f, 1 - f, 5); return 160; },
      (p) => { log(p); log(p + 260); return 280; },
    ];
    let p = 640, last = -1;
    for (let guard = 0; guard < 40; guard++) {
      let i = Math.floor(R() * feats.length); if (i === last) i = (i + 1) % feats.length;
      if (p + 400 > LAP - 420) break;
      last = i; p += feats[i](p) + 190 + R() * 110;
    }
    const keep = cand.length <= 3 ? cand : [0, 1, 2].map((k) => cand[Math.floor((k + .5) * cand.length / 3)]);
    for (const [lp, f0, f1, n] of keep) for (let i = 0; i < n; i++) { const q = lp + i * 34; CN.push({ p: q, x: at(q, f0 + (f1 - f0) * i / (n - 1)), t: -99 }); }
    obs = O.sort((a, b) => a.p - b.p); pads = PD; coins = CN.filter((cn) => cn.p > 300 && cn.p < LAP - 300);
  }
  const obX = (o, t) => (o.k === 'log' ? o.cx + o.amp * Math.sin(t * o.w + o.ph) : o.x);
  const ahead = (p, d) => ((p - d) % LAP + LAP) % LAP;
  const nearCopy = (p, d) => p + LAP * Math.round((d - p) / LAP);

  // ---------- state ----------
  let state = 'loading', T = 0, raceT = 0, cd = 0, endT = 0, resT = 0, shake = 0, camD = -62, banner = null, rank = 0, score = 0, newBest = false, finished = [], resOrder = [];
  let sayGlobal = 0, meterShake = 0, lastBump = -9, touchUI = false, hintT = 0, paused = false, raf = 0, last = 0, humT = 0, stats = { hits: 0, pads: 0, turbos: 0, coins: 0 };
  try { touchUI = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch {}
  let best = 0; try { best = Number(localStorage.getItem('aa.boatrace.best')) || 0; } catch {}
  const keys = new Set(), ptrs = new Map(), btns = [], grad = {}, TB = { x: W - 66, y: H - 72, r: 42 };
  const sy = (d) => ANCHOR + camD - d;

  // particles (fixed pools, no per-frame allocation)
  const P = Array.from({ length: 520 }, () => ({ on: false, x: 0, d: 0, vx: 0, vd: 0, l: 0, m: 1, s: 2, col: '#fff', k: 0, rot: 0, vr: 0 }));
  let pI = 0;
  function emit(x, d, vx, vd, life, size, col, k = 0) { const p = P[pI]; pI = (pI + 1) % P.length; p.on = true; p.x = x; p.d = d; p.vx = vx; p.vd = vd; p.l = p.m = life; p.s = size; p.col = col; p.k = k; p.rot = Math.random() * TAU; p.vr = rnd(-6, 6); }
  const pops = Array.from({ length: 8 }, () => ({ t: 0, r: null, s: '', col: '#fff', lift: 0 })); let popI = 0;
  function pop(r, s, col) { for (const q of pops) if (q.t > 0 && q.r === r) { q.t = Math.min(q.t, .55); q.lift += 28; } const p = pops[popI]; popI = (popI + 1) % pops.length; p.t = 1.1; p.r = r; p.s = s; p.col = col; p.lift = 0; }
  function splash(x, d, big = 1) {
    emit(x, d, 0, 0, .62, big, '#fff', 4);
    for (let i = 0; i < 16 * big; i++) { const a = Math.random() * TAU, v = rnd(60, 190) * big; emit(x, d, Math.cos(a) * v, Math.sin(a) * v, rnd(.35, .7), rnd(2, 4.5), i % 3 ? '#ffffff' : '#bfe9ff', 0); }
    emit(x, d, 0, 0, .7, 1, '#fff', 3);
  }
  function sparkle(x, d, n, col = C.gold) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rnd(40, 140); emit(x, d, Math.cos(a) * v, Math.sin(a) * v, rnd(.35, .65), rnd(3, 5.5), i % 2 ? col : '#fff6c8', 1); } }
  function confetti(n) { const cols = [C.gold, C.pink, C.mint, C.lav2, '#8cc8ff', '#fff']; for (let i = 0; i < n; i++) emit(rnd(40, W - 40), rnd(-40, 120), rnd(-140, 140), rnd(-260, 40), rnd(1.6, 2.8), rnd(4, 7), cols[i % cols.length], 2); }

  function say(r, list, force = false) { if (r.you || (!force && (r.sayCd > 0 || sayGlobal > 0))) return; r.bub = pick(list); r.bubT = 2.3; r.sayCd = rnd(3.2, 5); sayGlobal = .8; }
  function setBanner(s, col, size = 54, life = 1.6, flag = false) { banner = { s, col, size, life, t: 0, flag }; }
  function reset() {
    seed = (tst && tst.seed) || ((Math.random() * 4294967296) >>> 0); buildCourse(seed);
    const d0 = -62, lo = bankAt(BANK_L, d0) + HW, hi = bankAt(BANK_R, d0) - HW, lanes = [0, 1, 2, 3].sort(() => Math.random() - .5);
    if (lanes.indexOf(0) === 0 || lanes.indexOf(3) === 0) { const k = lanes.indexOf(Math.random() < .5 ? 1 : 2); [lanes[0], lanes[k]] = [lanes[k], lanes[0]]; }
    racers.forEach((r, i) => Object.assign(r, { x: lo + (hi - lo) * (.125 + .25 * lanes[i]), d: d0, v: 0, vx: 0, steer: 0, tilt: 0, spin: 0, inv: 0, hitT: -9, boost: 0, padCd: 0, turbo: 0, meter: 0, fin: 0, finD: 0, est: 0, coins: 0, lap: 1, plan: 0, ignore: null, seen: null, side: 0, bubT: 0, sayCd: 0, wakeN: 0, wakeI: 0, hits: 0 }));
    for (const r of racers) r.tx = r.x;
    for (const p of P) p.on = false; for (const p of pops) p.t = 0;
    raceT = 0; finished = []; rank = 0; score = 0; newBest = false; banner = null; camD = d0; shake = 0; resOrder = []; stats = { hits: 0, pads: 0, turbos: 0, coins: 0 };
  }
  function start() { if (!ready) return; audio(); reset(); state = 'count'; cd = 3; sfx.blip(); ptrs.clear(); setTimeout(() => { if (!closed && state === 'count') say(pick(rivals), ['gm', 'gm gm', 'gl hf'], true); }, 900); }
  function go() {
    state = 'race'; raceT = 0; hintT = 4; sfx.horn(); humOn(); shake = 3;
    rivals.forEach((r, i) => setTimeout(() => { if (!closed && state === 'race' && Math.random() < .7) say(r, SAY.start, true); }, 400 + i * 700));
  }
  reset();

  // ---------- physics ----------
  function rubber(r) { // keeps the pack close; eases off in the last stretch so skill decides it
    if (r.fin || you.fin) return 1; const gap = r.d - you.d, late = you.d > FIN - LAP * .35 ? .45 : 1;
    return 1 - clamp(gap / 4200, -.1 * late, .11 * late);
  }
  function move(r, h, racing) {
    r.spin = Math.max(0, r.spin - h); r.inv -= h; r.boost -= h; r.padCd -= h; r.turbo -= h;
    let tgt = 0;
    if (racing) {
      tgt = BASE * r.top * rubber(r);
      if (r.boost > 0) tgt = Math.max(tgt, BASE * PADX); if (r.turbo > 0) tgt = Math.max(tgt, BASE * TURBOX);
      if (r.spin > 0) tgt *= .45; if (r.fin) tgt = r.you ? Math.max(0, 160 - (r.d - r.finD) * .55) : 150;
    }
    r.v += (tgt - r.v) * (1 - Math.exp(-(tgt > r.v ? 1.6 : 3.2) * h));
    const s = racing && !r.fin && r.spin < .5 ? r.steer : 0;
    r.vx += s * STEER * h; r.vx *= Math.exp(-(s ? 2.5 : 3.1) * h);
    r.x += r.vx * h; r.d += r.v * h;
    const bl = bankAt(BANK_L, r.d) + HW, br = bankAt(BANK_R, r.d) - HW; // soft banks: a spring back into the water and a little drag
    if (r.x < bl || r.x > br) {
      const o = r.x < bl ? bl - r.x : br - r.x; r.vx += o * 80 * h; if (r.vx * o < 0) r.vx *= Math.exp(-16 * h);
      r.v *= Math.exp(-1 * h); r.x = clamp(r.x, bl - 12, br + 12);
      if ((r.bankT -= h) <= 0 && Math.abs(r.vx) > 25) { r.bankT = .22; for (let i = 0; i < 5; i++) emit(r.x + (o > 0 ? -HW : HW), r.d + rnd(-20, 20), o * rnd(2, 5), rnd(-30, 30), .5, rnd(2, 4), '#fff', 0); if (r.you) sfx.scrape(); }
    }
  }
  function bonk(r, o, nx, px, pd) {
    r.inv = 1.15; r.spin = .9; r.hitT = T; r.v *= .3; o.hit = T; r.hits++;
    const mid = (bankAt(BANK_L, r.d) + bankAt(BANK_R, r.d)) / 2, side = Math.abs(nx) > .15 ? Math.sign(nx) : r.x < mid ? 1 : -1;
    r.vx = side * 230; r.spinDir = side; splash(px, pd, r.you ? 1 : .7);
    if (r.you) { shake = 12; sfx.bonk(); sfx.splash(.6); pop(r, 'bonk!', C.red); stats.hits++; }
    else { say(r, SAY.bonk, true); if (Math.abs(r.d - you.d) < 400) sfx.splash(.25); }
  }
  function collide(r) {
    if (r.fin) return;
    for (const o of obs) {
      const od = nearCopy(o.p, r.d); if (od - r.d > 90 || r.d - od > 90 || od < 200 || od > FIN) continue;
      const ox = obX(o, T);
      for (let q = 0; q < 2; q++) {
        const cx = r.x + (q ? Math.sin(r.tilt) * 27 : 0), cd = r.d + (q ? Math.cos(r.tilt) * 27 : -4), cr = q ? 14 : 21;
        const lx = o.k === 'log' ? clamp(cx, ox - o.half, ox + o.half) : ox, dx = cx - lx, dd = cd - od, rad = o.r + cr, d2 = dx * dx + dd * dd;
        if (d2 >= rad * rad) continue;
        const dist = Math.sqrt(d2) || .01, nx = dx / dist, nd = dd / dist, pen = rad - dist;
        r.x += nx * pen; r.d += nd * pen; if (nd < 0) r.v *= .9;
        if (r.inv <= 0) bonk(r, o, nx, cx - nx * cr, cd - nd * cr);
        break;
      }
    }
  }
  function bumps() { // boats bump each other softly
    for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i], b = racers[j], dx = b.x - a.x, dd = (b.d - a.d) * .5;
      if (a.fin || b.fin || dx > 52 || dx < -52 || dd > 52 || dd < -52) continue;
      const dist = Math.hypot(dx, dd); if (dist >= 52) continue;
      const nx = dist > .01 ? dx / dist : 1, nd = dist > .01 ? dd / dist : 0, push = (52 - dist) * .5;
      a.x -= nx * push; b.x += nx * push; a.d -= nd * push * .6; b.d += nd * push * .6;
      const rel = (b.vx - a.vx) * nx; if (rel < 0) { a.vx += rel * nx * .6; b.vx -= rel * nx * .6; }
      a.vx -= nx * 18; b.vx += nx * 18;
      if (Math.abs(nd) > .6) { const back = nd > 0 ? a : b; back.v *= .985; }
      if ((a.you || b.you) && T - lastBump > .45 && (Math.abs(rel) > 40 || Math.abs(nd) > .5)) { lastBump = T; sfx.bump(); const o = a.you ? b : a; if (Math.random() < .5) say(o, ['hey!', 'bump!', 'rude', 'oi'], false); }
    }
  }
  function fireTurbo(r, manual) {
    if (r.fin || r.turbo > 0 || r.spin > .3) return;
    if (r.meter < 1) { if (manual) { sfx.nope(); meterShake = .35; } return; }
    r.meter = 0; r.turbo = 2.3; r.v = Math.max(r.v, BASE * 1.25);
    if (r.you) { sfx.turbo(); shake = Math.max(shake, 5); pop(r, 'TURBO!', C.gold); stats.turbos++; for (let i = 0; i < 18; i++) emit(r.x + rnd(-14, 14), r.d - 44, rnd(-90, 90), rnd(-260, -120), rnd(.4, .7), rnd(3, 5), i % 2 ? C.gold : '#fff', 1); }
    else if (Math.random() < .6) say(r, SAY.boost);
  }
  function pickups(r) {
    if (r.fin) return;
    for (const cn of coins) {
      if (T - cn.t < RESPAWN) continue; const cdd = nearCopy(cn.p, r.d);
      if (Math.abs(cdd - r.d - 6) < 30 && Math.abs(cn.x - r.x) < 25 && cdd > 0 && cdd < FIN) {
        cn.t = T; r.meter = Math.min(1, r.meter + .2); r.coins++;
        if (r.you) { sfx.coin(); sparkle(cn.x, cdd, 8); stats.coins++; if (r.meter >= 1) pop(r, 'TURBO READY!', C.gold); } else if (Math.abs(r.d - you.d) < 500) sparkle(cn.x, cdd, 4);
      }
    }
    for (const pd of pads) {
      const pdd = nearCopy(pd.p, r.d);
      if (r.padCd <= 0 && Math.abs(pdd - r.d) < 30 && Math.abs(pd.x - r.x) < 28 && pdd > 0 && pdd < FIN) {
        r.padCd = .8; r.boost = 1.15; r.v = Math.max(r.v, BASE * 1.2);
        for (let i = 0; i < 12; i++) emit(pd.x + rnd(-20, 20), pdd + rnd(-10, 10), rnd(-40, 40), rnd(-200, -80), rnd(.35, .6), rnd(3, 5), i % 2 ? C.mint : '#fff', 1);
        if (r.you) { sfx.pad(); pop(r, 'BOOST!', C.mint); stats.pads++; } else if (Math.random() < .35) say(r, SAY.boost);
      }
    }
  }
  function visuals(r, dt) {
    const tt = clamp(Math.atan2(r.vx, Math.max(80, r.v)) * .62, -.42, .42); r.tilt += (tt - r.tilt) * (1 - Math.exp(-10 * dt));
    r.bubT -= dt; r.sayCd -= dt; if ((r.blinkT -= dt) < -.12) r.blinkT = rnd(2, 5);
    if (r.v > 40 && (r.wakeT -= dt) <= 0) { // V wake: sample the stern; samples spread outward as they age
      r.wakeT = .034; const i = r.wakeI; r.wake[i * 3] = r.x - Math.sin(r.tilt) * BH * .4; r.wake[i * 3 + 1] = r.d - Math.cos(r.tilt) * BH * .4; r.wake[i * 3 + 2] = T;
      r.wakeI = (i + 1) % WAKE; r.wakeN = Math.min(WAKE, r.wakeN + 1);
    }
    if (r.v > 280 && (r.sprayT -= dt) <= 0) { // bow spray when fast
      r.sprayT = r.turbo > 0 ? .02 : .045; const bx = r.x + Math.sin(r.tilt) * BH * .42, bd = r.d + Math.cos(r.tilt) * BH * .38;
      for (let s = -1; s <= 1; s += 2) emit(bx + s * 8, bd, s * rnd(70, 150) + r.vx * .3, rnd(-60, 30), rnd(.25, .45), rnd(1.8, 3.4), '#ffffff', 0);
    }
  }
  function planX(r) { // look ahead and pick the cheapest line the boat can actually reach: around obstacles, toward pads and coins
    const v = Math.max(120, r.v), look = 150 + r.v * 1.1, lo = bankAt(BANK_L, r.d + 120) + HW + 6, hi = bankAt(BANK_R, r.d + 120) - HW - 6, mid = (lo + hi) / 2;
    const at = (cx, dd) => { const tt = dd / v, base = r.x + r.vx / 2.8 * (1 - Math.exp(-2.8 * tt)), reach = 330 * tt * tt; return base + clamp(cx - base, -reach, reach); };
    let first = null, fd = 1e9;
    for (const o of obs) { const dd = ahead(o.p, r.d); if (dd > 10 && dd < look && dd < fd) { fd = dd; first = o; } }
    if (first && first !== r.seen) { r.seen = first; r.ignore = Math.random() < r.fumble ? first : null; }
    let best = r.x, bc = 1e9;
    for (let i = 0; i <= 14; i++) {
      const cx = lo + (hi - lo) * i / 14; let cost = Math.abs(cx - r.x) * .25 + Math.abs(cx - mid) * .05 + Math.abs(cx - r.tx) * .2;
      for (const o of obs) {
        const dd = ahead(o.p, r.d); if (dd < 4 || dd > look || o === r.ignore || (r.you && tst && tst.auto === 'reckless')) continue;
        const ox = obX(o, T + dd / v), px = at(cx, dd), need = o.r + 23 + 9 * r.skill;
        const gap = o.k === 'log' ? Math.max(0, Math.abs(px - ox) - o.half) : Math.abs(px - ox);
        if (gap < need) cost += (420 + (need - gap) * 14) * clamp(1.3 - dd / 420, .35, 1);
      }
      for (const pd of pads) { const dd = ahead(pd.p, r.d); if (dd > 10 && dd < look && Math.abs(at(cx, dd) - pd.x) < 22) cost -= 110 * r.greed; }
      for (const cn of coins) { if (T - cn.t < RESPAWN) continue; const dd = ahead(cn.p, r.d); if (dd > 10 && dd < look && Math.abs(at(cx, dd) - cn.x) < 20) cost -= 26 * r.greed; }
      for (const o of racers) { if (o === r || o.fin) continue; const dd = o.d - r.d; if (dd > -20 && dd < 170 && Math.abs(at(cx, Math.max(10, dd)) - o.x) < 50) cost += 40; }
      if (cost < bc) { bc = cost; best = cx; }
    }
    return best;
  }
  function think(r, dt) {
    if (r.fin) { r.steer = 0; return; }
    if ((r.plan -= dt) <= 0) { r.plan = .08 + (1 - r.skill) * .22 + Math.random() * .05; r.tx = planX(r); }
    const e = r.tx - r.x; r.steer = Math.abs(e) < 5 && Math.abs(r.vx) < 25 ? 0 : clamp(e * .03 - r.vx * .0058, -1, 1);
    if (r.meter >= 1 && r.turbo <= 0 && r.spin <= 0 && Math.random() < dt * (.5 + r.greed)) {
      let clear = true; for (const o of obs) { const dd = ahead(o.p, r.d); if (dd < 330 && Math.abs(obX(o, T) - r.x) < 60) { clear = false; break; } }
      if (clear || you.d > FIN - LAP * .3) fireTurbo(r, false);
    }
  }
  function finishRacer(r) {
    r.fin = raceT; r.finD = r.d; r.steer = 0; finished.push(r);
    if (r.you) {
      rank = finished.indexOf(you) + 1; state = 'finish'; endT = 2.9; shake = 5; humSet(false, 0);
      score = Math.max(0, Math.round((110 - r.fin) * 40)) + you.coins * 15 + [500, 250, 100, 0][rank - 1];
      newBest = !best || r.fin < best; if (newBest) { best = r.fin; try { localStorage.setItem('aa.boatrace.best', best.toFixed(2)); } catch {} }
      setBanner('FINISH!', rank === 1 ? C.gold : C.lav2, 66, 2.9, true); confetti(rank === 1 ? 110 : 60); (rank === 1 ? sfx.win : sfx.soft)();
      for (const o of rivals) if (!o.fin && Math.random() < .5) say(o, rank === 1 ? ['nice one', 'gg', 'no way'] : SAY.fin);
    } else say(r, finished.length === 1 ? SAY.win : SAY.fin, true);
  }
  function enterResults() {
    state = 'results'; resT = 0;
    for (const r of racers) r.est = r.fin || raceT + Math.max(0, FIN - r.d) / (BASE * r.top * .98) + .4;
    resOrder = racers.slice().sort((a, b) => a.est - b.est);
  }
  function order() { for (let i = 0; i < racers.length; i++) ord[i] = racers[i]; ord.sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.d - a.d)); }

  // ---------- update ----------
  function steerIn() { let s = 0; if (keys.has('ArrowLeft') || keys.has('KeyA')) s -= 1; if (keys.has('ArrowRight') || keys.has('KeyD')) s += 1; for (const v of ptrs.values()) { if (v === 'L') s -= 1; else if (v === 'R') s += 1; } return clamp(s, -1, 1); }
  function update(dt) {
    T += dt; shake = Math.max(0, shake - dt * 26); sayGlobal -= dt; meterShake = Math.max(0, meterShake - dt); hintT -= dt;
    if (state === 'loading') return;
    if (state === 'count') { const a = Math.ceil(cd); cd -= dt; const b = Math.ceil(cd); if (b !== a && b > 0) sfx.blip(); if (cd <= 0) go(); }
    const racing = state === 'race' || state === 'finish' || state === 'results';
    if (racing) {
      raceT += dt;
      if (auto()) think(you, dt); else if (!you.fin) you.steer = steerIn();
      for (const r of rivals) think(r, dt);
    }
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let k = 0; k < n; k++) { for (const r of racers) { move(r, h, racing); if (racing) collide(r); } if (racing) bumps(); }
    for (const r of racers) {
      visuals(r, dt);
      if (!racing) continue;
      pickups(r);
      if (!r.fin && r.d >= FIN) finishRacer(r);
    }
    if (state === 'race') {
      const lap = clamp(Math.floor(you.d / LAP) + 1, 1, LAPS);
      if (lap > you.lap) { you.lap = lap; if (lap === LAPS) { setBanner('FINAL LAP!', C.gold, 58, 1.9); sfx.final(); const o = pick(rivals); if (!o.fin) say(o, SAY.final, true); } else { setBanner(`LAP ${lap}/${LAPS}`, C.lav2, 46, 1.3); sfx.lap(); } }
      for (const r of rivals) { // overtakes: the agents react when they pass you or you pass them
        if (r.fin) continue; const dd = r.d - you.d, s = dd > 40 ? 1 : dd < -40 ? -1 : r.side;
        if (r.side && s !== r.side && Math.abs(r.x - you.x) < 260) say(r, s > 0 ? SAY.pass : SAY.passed); r.side = s;
      }
      if ((humT -= dt) <= 0) { humT = .06; humSet(!paused, clamp((you.v - 120) / 330, 0, 1)); }
    }
    if (state === 'finish' && (endT -= dt) <= 0) enterResults();
    if (state === 'results') resT += dt;
    const lead = clamp((you.v - BASE) * .5, -40, 70);
    camD += (you.d + lead - camD) * (1 - Math.exp(-7 * dt));
    for (const p of P) {
      if (!p.on) continue; p.l -= dt; if (p.l <= 0) { p.on = false; continue; }
      if (p.k === 2) { p.vd += 520 * dt; p.vx *= Math.exp(-1.2 * dt); p.x += p.vx * dt; p.d += p.vd * dt; p.rot += p.vr * dt; }
      else { const dr = Math.exp(-(p.k === 1 ? 3 : 2.2) * dt); p.vx *= dr; p.vd *= dr; p.x += p.vx * dt; p.d += p.vd * dt; }
    }
    for (const p of pops) if (p.t > 0) p.t -= dt;
    if (banner && (banner.t += dt) > banner.life) banner = null;
    for (const l of lines) { l.y += l.v * dt; if (l.y > H + l.l) { l.y = -l.l - rnd(0, 200); l.x = rnd(10, W - 10); } }
  }

  // ---------- drawing ----------
  function drawRiver() {
    const k0 = Math.floor((-ANCHOR - camD - 4) / TH);
    for (let k = k0, y = ANCHOR + camD + k0 * TH; y < H + 8; k++, y += TH) c.drawImage(art.river, 0, Math.round(y * K) / K, W, TH + 1 / K);
    for (let k = k0, y0 = ANCHOR + camD + k0 * TH; y0 < H + 8; k++, y0 += TH) { // twinkling glints and drifting flecks of foam
      for (const g of glints) { const a = Math.sin(T * 2.1 + g.p + k); if (a < .55) continue; const y = y0 + g.y; if (y < -8 || y > H + 8) continue; c.globalAlpha = (a - .55) * 2; c.fillStyle = '#fff'; star(c, g.x, y, 4 + a * 3); }
      c.globalAlpha = .32; c.fillStyle = '#ffffff';
      for (const f of flecks) { const y = y0 + ((f.y + T * f.s) % TH); if (y < -6 || y > H + 6) continue; ell(c, f.x + Math.sin(T * .8 + f.y) * 6, y, 3, 1.4); }
      c.globalAlpha = 1;
    }
  }
  function drawLine(d) { // checkered start/finish line painted on the water
    const y = sy(d); if (y < -20 || y > H + 20) return;
    const l = bankAt(BANK_L, d) - 2, r = bankAt(BANK_R, d) + 2, n = Math.round((r - l) / 13), w = (r - l) / n;
    c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, l, y - 10, r - l, 20, 6); c.fill();
    c.globalAlpha = .92; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#2a1d44' : C.cream; c.fillRect(l + i * w, y - 7 + j * 7, w + .3, 7.3); }
    c.globalAlpha = 1;
  }
  function drawWake(r) {
    const n = r.wakeN; if (n < 2) return; c.strokeStyle = '#fff'; c.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      let px = 0, py = 0;
      for (let k = 0; k < n; k++) {
        const i = ((r.wakeI - 1 - k) % WAKE + WAKE) % WAKE, age = T - r.wake[i * 3 + 2]; if (age > WAKE_LIFE) break;
        const qx = r.wake[i * 3] + side * (9 + age * 82), qy = sy(r.wake[i * 3 + 1]), fa = 1 - age / WAKE_LIFE;
        if (k) { c.globalAlpha = fa * fa * .75; c.lineWidth = 3 + age * 7; c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke(); }
        if (k % 3 === 1) { c.globalAlpha = fa * .5; c.fillStyle = '#fff'; ell(c, qx + side * (2 + age * 4), qy, 1.6 + age * 3.4, 1.6 + age * 3.4); }
        px = qx; py = qy;
      }
    }
    c.fillStyle = '#fff';
    for (let k = 0; k < n; k += 2) { const i = ((r.wakeI - 1 - k) % WAKE + WAKE) % WAKE, age = T - r.wake[i * 3 + 2]; if (age > WAKE_LIFE) break; c.globalAlpha = (1 - age / WAKE_LIFE) * .3; ell(c, r.wake[i * 3] + Math.sin(k * 1.7 + T * 3) * 2, sy(r.wake[i * 3 + 1]), 7 + age * 16, 5 + age * 8); }
    c.globalAlpha = 1;
  }
  function drawFlat() { // things lying on the water: lines, pads, coins, wakes, glows
    for (let i = 0; i <= LAPS; i++) drawLine(i * LAP);
    for (const pd of pads) {
      const d = nearCopy(pd.p, camD + 160), y = sy(d); if (y < -60 || y > H + 60 || d < 0 || d > FIN) continue; const pu = .5 + .5 * Math.sin(T * 5 + pd.p);
      const g = c.createRadialGradient(pd.x, y, 4, pd.x, y, 46); g.addColorStop(0, `rgba(120,255,200,${.35 + pu * .2})`); g.addColorStop(1, 'rgba(120,255,200,0)'); c.fillStyle = g; c.fillRect(pd.x - 46, y - 46, 92, 92);
      c.drawImage(art.pad.c, pd.x - art.pad.w / 2, y - art.pad.h / 2, art.pad.w, art.pad.h);
    }
    for (const r of racers) drawWake(r);
    for (const r of racers) if (r.turbo > 0 || r.boost > 0) { const y = sy(r.d), a = r.turbo > 0 ? .55 : .4, col = r.turbo > 0 ? '255,209,102' : '120,255,200', g = c.createRadialGradient(r.x, y, 6, r.x, y, 66); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(r.x - 66, y - 66, 132, 132); }
    for (const cn of coins) {
      const age = T - cn.t; if (age < RESPAWN) continue; const d = nearCopy(cn.p, camD + 160), y = sy(d) + Math.sin(T * 3 + cn.p * .05) * 2; if (y < -30 || y > H + 30 || d < 0 || d > FIN) continue;
      const s = Math.min(1, (age - RESPAWN) * 4), sc = s < 1 ? s * (1.3 - .3 * s) : 1, sq = .8 + .2 * Math.abs(Math.cos(T * 2.4 + cn.p));
      c.fillStyle = 'rgba(255,209,102,.22)'; ell(c, cn.x, y + 2, 15 * sc, 12 * sc);
      c.drawImage(art.coin.c, cn.x - 14 * sc * sq, y - 14 * sc, 28 * sc * sq, 28 * sc);
    }
  }
  const items = Array.from({ length: 80 }, () => ({ d: 0, k: 0, o: null, y: 0 })); const list = [];
  const byDepth = (a, b) => b.d - a.d;
  function addItem(d, k, o) { if (list.length >= items.length) return; const it = items[list.length]; it.d = d; it.k = k; it.o = o; list.push(it); }
  function drawObstacle(o, d, shadowOnly) {
    const a = art[o.k], x = obX(o, T), y = sy(d), hit = T - o.hit < .8 ? (1 - (T - o.hit) / .8) : 0;
    c.save();
    if (o.k === 'buoy') { c.translate(x, y + Math.sin(T * 2.2 + o.ph) * 1.5); c.rotate(Math.sin(T * 1.7 + o.ph) * .06 + Math.sin(T * 18) * hit * .35); c.translate(0, -a.h * .18); }
    else if (o.k === 'log') { c.translate(x, y + Math.sin(T * 1.6 + o.ph) * 1.2); c.rotate(Math.sin(T * .9 + o.ph) * .035 + Math.sin(T * 16) * hit * .08); }
    else { c.translate(x, y - a.h * .06); c.scale(1 + hit * .06 * Math.sin(T * 20), 1); }
    if (shadowOnly) { c.globalAlpha = .26; c.drawImage(a.sh, -a.w / 2 - SH_M + 4, -a.h / 2 - SH_M + 6, a.w + SH_M * 2, a.h + SH_M * 2); }
    else c.drawImage(a.c, -a.w / 2, -a.h / 2, a.w, a.h);
    c.restore();
  }
  function boatAngle(r) { const sp = r.spin; if (sp <= 0) return r.tilt; const u = 1 - sp / .9, e = 1 - Math.pow(1 - Math.min(1, u / .75), 3); return r.tilt + r.spinDir * (TAU * e + Math.sin(u * 30) * .12 * (1 - u)); }
  function drawBoat(r, x, y, sc = 1, shadowOnly = false) {
    const B = art.boats[r.boat], calm = r.v < 60 ? 1 : 0, bob = Math.sin(T * 2.6 + r.ph) * (1.2 + calm * 1.4), roll = Math.sin(T * 1.8 + r.ph) * (.03 + calm * .03);
    c.save(); c.translate(x + (shadowOnly ? 5 : 0), y + bob + (shadowOnly ? 8 : 0)); c.rotate(boatAngle(r) + roll); c.scale(sc * (1 - Math.abs(r.steer) * .05), sc);
    if (shadowOnly) { c.globalAlpha = .28; c.drawImage(B.shadow, -BW / 2 - SH_M, -BH / 2 - SH_M, BW + SH_M * 2, BH + SH_M * 2); c.restore(); return; }
    if ((r.turbo > 0 || r.boost > 0) && r.spin <= 0) { c.globalAlpha = .28; for (let i = 1; i <= 3; i++) c.drawImage(B.hull, -BW / 2, -BH / 2 + i * 13, BW, BH); c.globalAlpha = 1; }
    c.drawImage(B.hull, -BW / 2, -BH / 2, BW, BH);
    const seat = -BH / 2 + BH * RIM.seat + 1, lean = -r.steer * 1.8, hb = Math.sin(T * 5.2 + r.ph * 2) * .6;
    if (r.cock) {
      const q = T - r.hitT < .5 ? .12 * (1 - (T - r.hitT) / .5) : r.fin && state !== 'race' ? Math.max(0, Math.sin(T * 7 + r.ph)) * -.06 : 0;
      c.save(); c.translate(lean + r.cockDx, seat + hb); c.scale(1 + q, 1 - q); c.drawImage(r.cock, -r.cockW / 2, -r.cockH, r.cockW, r.cockH); c.restore();
    } else drawBlob(c, lean, seat - 19 + hb, 19, r.color, { blink: r.blinkT < 0, mood: r.spin > 0 ? 'dizzy' : r.turbo > 0 || r.fin ? 'cheer' : 'happy', squash: Math.sin(T * 5 + r.ph) * .03 });
    c.drawImage(B.rim, -BW / 2, -BH / 2, BW, BH);
    if (r.spin > 0) { c.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = T * 7 + i * TAU / 3; star(c, Math.cos(a) * 16, -BH * .22 + Math.sin(a) * 5, 4.5); } }
    c.restore();
  }
  function drawGate(d) {
    const y = sy(d), g = art.gate, top = y + 10 - g.h; if (top > H || y < -40) return;
    const yb = sy(you.d), ov = Math.min(yb + BH / 2, top + g.h * .62) - Math.max(yb - BH / 2, top + 4);
    const cw = g.c.width, ch = g.c.height, e = Math.round(cw * .16); // pillars stay solid; the banner turns see-through while your boat is under it
    c.drawImage(g.c, 0, 0, e, ch, 0, top, W * e / cw, g.h); c.drawImage(g.c, cw - e, 0, e, ch, W - W * e / cw, top, W * e / cw, g.h);
    c.globalAlpha = 1 - .45 * clamp(ov / 34, 0, 1); c.drawImage(g.c, e, 0, cw - e * 2, ch, W * e / cw, top, W - W * e / cw * 2, g.h); c.globalAlpha = 1;
    if (d === 0 && (state === 'count' || state === 'title' || (state === 'race' && raceT < 2))) { // start lights: a pod under the banner + the pillar lamps
      const n = state === 'count' ? 3 - Math.ceil(cd) + 1 : state === 'title' ? 0 : 4, green = n >= 4, a = state === 'race' ? clamp(1 - (raceT - 1.2) / .8, 0, 1) : 1;
      c.save(); c.globalAlpha = a;
      const px = W / 2, py = top + g.h * .52;
      c.strokeStyle = 'rgba(40,20,60,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(px - 30, top + g.h * .3); c.lineTo(px - 30, py); c.moveTo(px + 30, top + g.h * .3); c.lineTo(px + 30, py); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, px - 49, py + 3, 98, 34, 17); c.fill(); c.fillStyle = '#2a1d44'; rr(c, px - 49, py, 98, 34, 17); c.fill(); c.strokeStyle = C.lav; c.lineWidth = 1.5; c.stroke();
      for (let i = 0; i < 3; i++) {
        const on = green || i < n, col = green ? C.mint : C.red, lx = px - 30 + i * 30, ly = py + 17;
        if (on) { const gl = c.createRadialGradient(lx, ly, 2, lx, ly, 22); gl.addColorStop(0, green ? 'rgba(60,255,143,.75)' : 'rgba(255,107,129,.75)'); gl.addColorStop(1, 'rgba(255,107,129,0)'); c.fillStyle = gl; c.fillRect(lx - 22, ly - 22, 44, 44); }
        c.fillStyle = on ? col : '#4a3a66'; ell(c, lx, ly, 10, 10); c.fillStyle = on ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.15)'; ell(c, lx - 3, ly - 3.5, 3.5, 2.5);
      }
      if (n > 0) for (const fx of [.067, .935]) for (const fy of [.55, .685]) { const lx = fx * W, ly = top + fy * g.h, gl = c.createRadialGradient(lx, ly, 1, lx, ly, 14); gl.addColorStop(0, green ? 'rgba(60,255,143,.95)' : 'rgba(255,90,110,.95)'); gl.addColorStop(1, 'rgba(255,90,110,0)'); c.fillStyle = gl; c.fillRect(lx - 14, ly - 14, 28, 28); }
      c.restore();
    }
  }
  function drawWorld() {
    list.length = 0;
    const lo = camD - (H - ANCHOR) - 160, hi = camD + ANCHOR + 200;
    for (const o of obs) { const d = nearCopy(o.p, camD + 160); if (d > lo && d < hi && d > 200 && d < FIN) addItem(d, 1, o); }
    for (const r of racers) addItem(r.d, 2, r);
    for (let i = 0; i <= LAPS; i++) { const d = i * LAP; if (d > lo - 200 && d < hi + 100) addItem(d, 3, null); }
    list.sort(byDepth);
    for (const it of list) if (it.k === 1) drawObstacle(it.o, it.d, true); else if (it.k === 2) drawBoat(it.o, it.o.x, sy(it.o.d), 1, true);
    for (const it of list) if (it.k === 1) drawObstacle(it.o, it.d, false); else if (it.k === 2) drawBoat(it.o, it.o.x, sy(it.o.d)); else drawGate(it.d);
  }
  function drawParticles() {
    for (const p of P) {
      if (!p.on) continue; const a = clamp(p.l / p.m, 0, 1), x = p.x, y = p.k === 2 ? p.d : sy(p.d);
      if (p.k === 0) { c.globalAlpha = a * .9; c.fillStyle = p.col; ell(c, x, y, p.s * (.5 + a * .5), p.s * (.5 + a * .5)); }
      else if (p.k === 1) { c.globalAlpha = a; c.fillStyle = p.col; star(c, x, y, p.s * (.4 + a * .6)); }
      else if (p.k === 2) { c.globalAlpha = Math.min(1, a * 2); c.fillStyle = p.col; c.save(); c.translate(x, y); c.rotate(p.rot); c.fillRect(-p.s / 2, -p.s * .3, p.s, p.s * .6); c.restore(); }
      else if (p.k === 3) { const u = 1 - a; c.globalAlpha = a * .7; c.strokeStyle = '#fff'; c.lineWidth = 3 * a + 1; c.beginPath(); c.ellipse(x, y, 14 + u * 46, 8 + u * 26, 0, 0, TAU); c.stroke(); }
      else if (p.k === 4) { const u = 1 - a, s = (.55 + (1 - (1 - u) * (1 - u)) * 1.05) * p.s, S = art.splash; c.globalAlpha = Math.min(1, a * 2.2); c.drawImage(S.c, x - S.w * s / 2, y - S.h * s * .62, S.w * s, S.h * s); }
    }
    c.globalAlpha = 1;
  }
  function tagFor(r, x, y) {
    const s = r.you ? 'YOU' : r.name; c.font = `700 12px ${F}`; const w = c.measureText(s).width + (r.you ? 18 : 24);
    c.fillStyle = 'rgba(19,14,34,.3)'; rr(c, x - w / 2, y - 8, w, 19, 9.5); c.fill();
    c.fillStyle = r.you ? C.gold : 'rgba(255,255,255,.95)'; rr(c, x - w / 2, y - 10, w, 19, 9.5); c.fill();
    if (r.you) txt(c, s, x, y, 12, '#3a2408'); else { c.fillStyle = r.color; ell(c, x - w / 2 + 10, y - .5, 4, 4); txt(c, s, x + 4, y, 12, C.ink); }
  }
  function bubble(r, x, y) {
    const k = 2.3 - r.bubT, s = k < .14 ? .55 + k / .14 * .45 : 1, a = Math.min(1, r.bubT * 4); c.font = `700 13px ${F}`; const w = c.measureText(r.bub).width + 20, bx = clamp(x, w / 2 + 6, W - w / 2 - 6);
    c.save(); c.globalAlpha = a; c.translate(bx, y); c.scale(s, s);
    c.fillStyle = 'rgba(19,14,34,.25)'; rr(c, -w / 2, -25, w, 25, 12.5); c.fill(); c.fillStyle = '#fff'; rr(c, -w / 2, -27, w, 25, 12.5); c.fill();
    c.beginPath(); c.moveTo(x - bx - 6, -4); c.lineTo(x - bx, 4); c.lineTo(x - bx + 6, -4); c.fill(); txt(c, r.bub, 0, -14.5, 13, C.ink); c.restore();
  }
  function drawTags() {
    for (const r of racers) {
      const x = r.x, y = sy(r.d) - BH / 2 - 14; if (y < -40 || y > H + 60) continue;
      tagFor(r, x, y); if (r.bubT > 0 && r.bub) bubble(r, x, y - 14);
    }
    for (const p of pops) {
      if (p.t <= 0 || !p.r) continue; const u = 1 - p.t / 1.1, s = u < .15 ? .5 + u / .15 * .6 : 1.1 - Math.min(.1, u - .15), y = sy(p.r.d) - BH / 2 - 46 - u * 30 - p.lift;
      c.save(); c.globalAlpha = Math.min(1, p.t * 3); c.translate(clamp(p.r.x, 80, W - 80), y); c.scale(s, s); txt(c, p.s, 0, 0, 22, p.col, { stroke: 5 }); c.restore();
    }
  }
  function card(x, y, w, h, r = 16) { c.fillStyle = 'rgba(19,14,34,.72)'; rr(c, x, y, w, h, r); c.fill(); c.strokeStyle = 'rgba(155,124,240,.85)'; c.lineWidth = 1.5; c.stroke(); }
  function fmt(t, dp = 1) { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60, ss = s.toFixed(dp); return `${m}:${s < 10 ? '0' : ''}${ss}`; }
  function digits(s, x, y, size, col, align = 'right') { // fixed-width digits so the clock does not wobble
    c.font = `700 ${size}px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
    const cw = (ch) => (ch >= '0' && ch <= '9' ? size * .62 : size * .3); let w = 0; for (const ch of s) w += cw(ch);
    let px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of s) { const k = cw(ch); c.fillText(ch, px + k / 2, y); px += k; }
  }
  function bolt(x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x + s * .15, y - s); c.lineTo(x - s * .55, y + s * .12); c.lineTo(x - s * .05, y + s * .12); c.lineTo(x - s * .2, y + s); c.lineTo(x + s * .55, y - s * .14); c.lineTo(x + s * .05, y - s * .14); c.closePath(); c.fill(); }
  function hud() {
    order(); const place = rank || ord.indexOf(you) + 1, lap = you.fin ? LAPS : you.lap;
    c.font = `700 54px ${F}`; const w1 = c.measureText(String(place)).width, pc = place === 1 ? C.gold : '#fff';
    card(12, 12, Math.round(w1 + 66), 72); txt(c, String(place), 26, 51, 54, pc, { align: 'left' });
    txt(c, ORD[place - 1].slice(1), 28 + w1, 36, 21, pc, { align: 'left' }); txt(c, '/4', 28 + w1, 63, 19, C.lav2, { align: 'left' });
    card(W / 2 - 64, 12, 128, 50);
    txt(c, 'LAP', W / 2 - 26, 38, 16, C.lav2); txt(c, `${lap}/${LAPS}`, W / 2 + 22, 37, 28, lap === LAPS ? C.gold : '#fff');
    const ty = uiTop; card(W - 118, ty, 106, 40, 14); digits(fmt(you.fin || raceT), W - 24, ty + 21, 22, '#fff');
    // vertical progress strip with each racer's face
    const s0 = ty + 64, s1 = Math.min(H - 150, s0 + 400), sx = W - 26;
    c.fillStyle = 'rgba(19,14,34,.6)'; rr(c, sx - 7, s0 - 4, 14, s1 - s0 + 8, 7); c.fill(); c.strokeStyle = 'rgba(155,124,240,.7)'; c.lineWidth = 1.2; c.stroke();
    const yp = (d) => s1 - (s1 - s0) * clamp(d / FIN, 0, 1);
    c.fillStyle = 'rgba(255,209,102,.55)'; rr(c, sx - 3, yp(you.d), 6, s1 - yp(you.d), 3); c.fill();
    c.fillStyle = 'rgba(201,182,255,.8)'; for (let i = 1; i < LAPS; i++) c.fillRect(sx - 9, yp(i * LAP) - 1, 18, 2);
    c.drawImage(art.flagS.c, sx - 6, s0 - 30, art.flagS.w, art.flagS.h);
    for (let i = 0; i <= rivals.length; i++) {
      const r = i < rivals.length ? rivals[i] : you, y = yp(r.d), rad = r.you ? 13 : 11;
      c.fillStyle = r.you ? C.gold : r.color; ell(c, sx, y, rad + 2, rad + 2);
      if (r.face) c.drawImage(r.face, sx - rad, y - rad, rad * 2, rad * 2); else drawBlob(c, sx, y + 1, rad * .8, r.color, {});
    }
    // turbo meter
    const full = you.meter >= 1, on = you.turbo > 0, mx = 12 + (meterShake > 0 ? Math.sin(T * 60) * 3 : 0), my = H - 76;
    if (full && !on) { c.fillStyle = `rgba(255,209,102,${.18 + .14 * Math.sin(T * 7)})`; rr(c, mx - 4, my - 4, 186, 72, 20); c.fill(); }
    card(mx, my, 178, 64, 18);
    c.fillStyle = full || on ? C.gold : 'rgba(155,124,240,.35)'; ell(c, mx + 32, my + 32, 21, 21); bolt(mx + 32, my + 32, 13, full || on ? '#3a2408' : '#fff');
    txt(c, on ? 'TURBO!' : full ? 'TURBO READY' : 'TURBO', mx + 62, my + 21, 14, full || on ? C.gold : C.lav2, { align: 'left' });
    if (on) { c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, mx + 62, my + 36, 102, 14, 7); c.fill(); c.fillStyle = C.gold; rr(c, mx + 62, my + 36, Math.max(14, 102 * clamp(you.turbo / 2.3, 0, 1)), 14, 7); c.fill(); }
    else for (let i = 0; i < 5; i++) { const lit = you.meter >= (i + 1) * .2 - .001; c.fillStyle = lit ? C.gold : 'rgba(255,255,255,.14)'; rr(c, mx + 62 + i * 21, my + 36, 17, 14, 6); c.fill(); if (lit) { c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, mx + 65 + i * 21, my + 38, 11, 4, 2); c.fill(); } }
    if (full && !on) txt(c, touchUI ? 'tap TURBO' : '↑ / W / Space', mx + 89, my - 10, 12, C.gold, { stroke: 4 });
    if (touchUI && state === 'race') { // round TURBO button for phones
      const pulse = full ? 1 + Math.sin(T * 8) * .04 : 1; c.save(); c.translate(TB.x, TB.y); c.scale(pulse, pulse);
      c.fillStyle = full ? 'rgba(255,209,102,.95)' : 'rgba(19,14,34,.6)'; ell(c, 0, 0, TB.r, TB.r); c.strokeStyle = 'rgba(155,124,240,.9)'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = C.gold; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, TB.r - 6, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(on ? you.turbo / 2.3 : you.meter, 0, 1)); c.stroke();
      bolt(0, -9, 10, full ? '#3a2408' : '#fff'); txt(c, 'TURBO', 0, 15, 14, full ? '#3a2408' : '#fff'); c.restore();
    }
    if (touchUI && state === 'race' && hintT > 0) {
      const hx = 281; c.globalAlpha = Math.min(1, hintT); card(hx - 80, H - 60, 160, 36, 18); txt(c, 'hold to steer', hx, H - 41.5, 15, '#fff'); c.fillStyle = C.gold;
      for (const sd of [-1, 1]) { const ax = hx + sd * 63; c.beginPath(); c.moveTo(ax + sd * 7, H - 42); c.lineTo(ax - sd * 5, H - 49); c.lineTo(ax - sd * 5, H - 35); c.closePath(); c.fill(); }
      c.globalAlpha = 1;
    }
  }
  function bigText(s, x, y, size, top, bot, k = 1, a = 1, rot = 0) { // bubbly Fredoka: dark rim, light rim, glossy gradient
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(k, k); c.font = `700 ${size}px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.fillStyle = 'rgba(19,14,34,.35)'; c.fillText(s, 0, size * .09);
    c.lineWidth = size * .2; c.strokeStyle = '#2a1650'; c.strokeText(s, 0, 0); c.lineWidth = size * .07; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(s, 0, 0);
    const g = c.createLinearGradient(0, -size * .45, 0, size * .4); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillText(s, 0, 0);
    c.restore();
  }
  const popScale = (u) => (u < .2 ? .35 + (u / .2) * .85 : 1 + .2 * Math.exp(-(u - .2) * 9) * Math.cos((u - .2) * 18));
  function overlays() {
    if (state === 'count' && cd > 0) { const n = Math.ceil(cd), u = clamp(n - cd, 0, 1); bigText(String(n), W / 2, 196, 132, '#fff6c8', C.gold2, popScale(u), u > .82 ? (1 - u) / .18 : 1); }
    if (state === 'race' && raceT < .95) { const u = raceT / .95; bigText('GO!', W / 2, 196, 120, '#eafff2', C.mint, popScale(u) * (1 + Math.max(0, u - .6) * .6), u > .65 ? (1 - u) / .35 : 1, -.05); }
    if (banner) {
      const u = banner.t / banner.life, k = popScale(Math.min(1, banner.t / .7)), a = u > .8 ? (1 - u) / .2 : 1, y = banner.flag ? 230 : 236;
      if (banner.flag) for (const s of [-1, 1]) { const f = art.flag; c.save(); c.globalAlpha = a; c.translate(W / 2 + s * 150 * k, y - 4); c.rotate(s * (.25 + Math.sin(T * 9) * .12)); c.scale(s * k, k); c.drawImage(f.c, -f.w * .25, -f.h * .8, f.w, f.h); c.restore(); }
      bigText(banner.s, W / 2, y, banner.size, '#fffbe6', banner.col, k, a, -.03);
    }
  }
  function screenFX() {
    const sp = you.turbo > 0 ? 1 : you.boost > 0 ? .6 : 0; if (!sp || state !== 'race') return;
    c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.lineCap = 'round';
    for (const l of lines) { c.globalAlpha = sp * .4; c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(l.x, l.y + l.l); c.stroke(); }
    c.globalAlpha = 1;
    const gk = you.turbo > 0 ? 'turbo' : 'boost';
    if (!grad[gk]) { const g = grad[gk] = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .75); g.addColorStop(0, 'rgba(255,209,102,0)'); g.addColorStop(1, gk === 'turbo' ? 'rgba(255,190,80,.28)' : 'rgba(80,255,190,.2)'); }
    c.fillStyle = grad[gk]; c.fillRect(0, 0, W, H);
  }
  function panel(x, y, w, h) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 24 * K; c.shadowOffsetY = 8 * K; c.fillStyle = '#18102c'; rr(c, x, y, w, h, 26); c.fill(); c.restore();
    c.strokeStyle = 'rgba(155,124,240,.95)'; c.lineWidth = 2; rr(c, x, y, w, h, 26); c.stroke(); c.strokeStyle = 'rgba(201,182,255,.16)'; c.lineWidth = 1; rr(c, x + 6, y + 6, w - 12, h - 12, 21); c.stroke();
  }
  function button(x, y, w, h, label, act, primary) {
    const s = primary ? 1 + Math.sin(T * 4.5) * .02 : 1; c.save(); c.translate(x + w / 2, y + h / 2); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, -w / 2, -h / 2 + 4, w, h, h / 2); c.fill();
    if (primary) { const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ffe39a'); g.addColorStop(1, C.gold2); c.fillStyle = g; } else c.fillStyle = 'rgba(155,124,240,.2)';
    rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
    if (primary) { c.fillStyle = 'rgba(255,255,255,.38)'; rr(c, -w / 2 + 12, -h / 2 + 4, w - 24, h * .34, h * .17); c.fill(); } else { c.strokeStyle = C.lav; c.lineWidth = 2; c.stroke(); }
    txt(c, label, 0, 1, 19, primary ? '#3a2408' : '#efe8ff'); c.restore(); btns.push({ x, y, w, h, act });
  }
  function chip(k, x, y) { c.font = `700 13px ${F}`; const w = c.measureText(k).width + 16; c.fillStyle = 'rgba(255,255,255,.13)'; rr(c, x - w, y - 11, w, 22, 11); c.fill(); txt(c, k, x - w / 2, y + .5, 13, '#fff'); return w; }
  function titleCard() {
    c.fillStyle = 'rgba(12,8,28,.5)'; c.fillRect(0, 0, W, H); panel(22, 26, W - 44, 668);
    if (art.poster) { c.save(); rr(c, 42, 46, 396, 226, 18); c.clip(); c.drawImage(art.poster, 44, 47, 392, 224); const g = c.createLinearGradient(0, 200, 0, 272); g.addColorStop(0, 'rgba(22,14,40,0)'); g.addColorStop(1, 'rgba(22,14,40,.85)'); c.fillStyle = g; c.fillRect(42, 200, 396, 72); c.restore(); c.strokeStyle = 'rgba(201,182,255,.35)'; c.lineWidth = 1.5; rr(c, 42, 46, 396, 226, 18); c.stroke(); }
    else { const g = c.createLinearGradient(0, 46, 0, 272); g.addColorStop(0, '#3b1c5e'); g.addColorStop(.6, '#c45a78'); g.addColorStop(1, '#5ccbec'); c.fillStyle = g; rr(c, 42, 46, 396, 226, 18); c.fill(); }
    bigText('Boat Race', W / 2, 270, 58, '#fff6c8', C.gold2, 1 + Math.sin(T * 2) * .012, 1, -.02);
    txt(c, '3 laps up the river · beat the agents to the flag', W / 2, 318, 15, C.cream, { w: 500 });
    let y = 352; c.font = `700 13px ${F}`; const k1 = c.measureText('← → / A D').width + 16, k2 = c.measureText('↑ / W / Space').width + 16; c.font = `600 13px ${F}`;
    const l1 = c.measureText('steer').width, l2 = c.measureText('turbo').width, x0 = W / 2 - (k1 + l1 + k2 + l2 + 46) / 2;
    chip('← → / A D', x0 + k1, y); txt(c, 'steer', x0 + k1 + 7, y, 13, C.lav2, { align: 'left', w: 600 });
    const x2 = x0 + k1 + l1 + 32; chip('↑ / W / Space', x2 + k2, y); txt(c, 'turbo', x2 + k2 + 7, y, 13, C.lav2, { align: 'left', w: 600 });
    txt(c, 'phone: hold left / right to steer · tap TURBO', W / 2, y + 28, 12, 'rgba(201,182,255,.8)', { w: 500 });
    y = 410; c.drawImage(art.coinS.c, 70, y - 9, 18, 18); txt(c, 'coins fill turbo', 94, y, 12, C.cream, { align: 'left', w: 500 });
    c.drawImage(art.pad.c, 206, y - 11, 25, 22); txt(c, 'pads boost', 236, y, 12, C.cream, { align: 'left', w: 500 });
    c.drawImage(art.rock.c, 322, y - 10, 24, 21); txt(c, 'dodge!', 350, y, 12, C.cream, { align: 'left', w: 500 });
    txt(c, 'racing today', W / 2, 446, 12, 'rgba(201,182,255,.75)', { w: 600 });
    const row = [you, ...rivals]; row.forEach((r, i) => { const x = 96 + i * 96, by = 510; drawBoat(r, x, by + Math.sin(T * 2.4 + i) * 2, .92); tagFor(r, x, by + 58); });
    button(W / 2 - 124, 590, 248, 54, 'Start race', 'start', true);
    txt(c, best ? `best time ${fmt(best, 2)} · Space / Enter / tap` : 'Space / Enter / tap', W / 2, 664, 12, 'rgba(201,182,255,.75)', { w: 500 });
  }
  function resultsCard() {
    const e = 1 - Math.pow(1 - Math.min(1, resT * 3.5), 3); c.fillStyle = `rgba(12,8,28,${.55 * e})`; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = e; c.translate(W / 2, H / 2); c.scale(.9 + .1 * e, .9 + .1 * e); c.translate(-W / 2, -H / 2);
    panel(22, 22, W - 44, 676);
    const won = rank === 1; bigText(won ? 'You won!' : `You finished ${ORD[rank - 1]}`, W / 2, 66, won ? 46 : 38, '#fff6c8', won ? C.gold2 : C.lav2, 1, 1, -.02);
    const tr = art.trophy, ts = (won ? 1 : .72) * (1 + Math.sin(T * 3) * .03), tx = W / 2, tyy = 168;
    const tg = c.createRadialGradient(tx, tyy, 6, tx, tyy, 92 * ts); tg.addColorStop(0, 'rgba(255,214,120,.42)'); tg.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = tg; c.fillRect(tx - 100, tyy - 100, 200, 200);
    if (won) { c.save(); c.translate(tx, tyy); c.rotate(T * .3); c.fillStyle = 'rgba(255,230,160,.13)'; for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(-9, -96); c.lineTo(9, -96); c.fill(); } c.restore(); }
    c.drawImage(tr.c, tx - tr.w * ts / 2, tyy - tr.h * ts / 2 + Math.sin(T * 2.4) * 3, tr.w * ts, tr.h * ts);
    if (won) { c.fillStyle = '#fff6c8'; for (let i = 0; i < 4; i++) { const a = T * 1.5 + i * TAU / 4, s = 4 + 3 * Math.max(0, Math.sin(T * 5 + i * 2)); star(c, tx + Math.cos(a) * 78, tyy + Math.sin(a) * 50, s); } }
    // podium: 2nd, 1st, 3rd
    const base = 410, cols = [C.gold, '#d9d2ec', '#e8a77a'], hts = [86, 62, 44], xs = [W / 2, W / 2 - 104, W / 2 + 104];
    for (let i = 0; i < 3; i++) {
      const r = resOrder[i], bx = xs[i], top = base - hts[i], g = c.createLinearGradient(0, top, 0, base); g.addColorStop(0, cols[i]); g.addColorStop(1, shades(['#ffd166', '#d9d2ec', '#e8a77a'][i]).dark);
      c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, bx - 50, top + 4, 100, hts[i], 10); c.fill(); c.fillStyle = g; rr(c, bx - 50, top, 100, hts[i], 10); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, bx - 44, top + 4, 88, 6, 3); c.fill();
      txt(c, String(i + 1), bx, top + 30, 30, i ? '#4a3a66' : '#7a4a08');
      if (!r) continue; const hop = i === 0 ? Math.abs(Math.sin(T * 4)) * 6 : 0;
      if (r.body) { const bh = r.tall ? 82 : 70, bw = bh * r.bodyAR; c.drawImage(r.body, bx - bw / 2, top - bh - hop + 2, bw, bh); }
      else drawBlob(c, bx, top - 26 - hop, 24, r.color, { mood: i === 0 ? 'cheer' : 'happy', blink: r.blinkT < 0 });
    }
    resOrder.forEach((r, i) => { // everyone's time
      const y = 436 + i * 30, mine = r.you; c.fillStyle = mine ? 'rgba(255,209,102,.18)' : 'rgba(255,255,255,.05)'; rr(c, 58, y - 13, W - 116, 26, 13); c.fill();
      if (mine) { c.strokeStyle = 'rgba(255,209,102,.6)'; c.lineWidth = 1.5; c.stroke(); }
      txt(c, ORD[i], 82, y + .5, 14, i === 0 ? C.gold : C.lav2);
      if (r.face) c.drawImage(r.face, 106, y - 10, 20, 20); else { c.fillStyle = r.color; ell(c, 116, y, 9, 9); }
      txt(c, r.you ? 'YOU' : r.name, 134, y + .5, 15, '#fff', { align: 'left' });
      digits(fmt(r.est, 2), W - 74, y + 1, 15, r.fin ? C.cream : 'rgba(201,182,255,.7)');
    });
    const by = 572; txt(c, `best ${fmt(best, 2)}`, W / 2, by, 15, C.lav2, { w: 600 });
    if (newBest) { const nb = 1 + Math.max(0, Math.sin(T * 7)) * .1; c.save(); c.translate(W / 2 + 112, by - 2); c.rotate(-.08); c.scale(nb, nb); c.fillStyle = C.pink; rr(c, -52, -13, 104, 26, 13); c.fill(); txt(c, 'NEW BEST!', 0, 1, 15, '#3a0d22'); c.restore(); }
    txt(c, `score ${score.toLocaleString()} · ${you.coins} coins`, W / 2, by + 22, 12, 'rgba(201,182,255,.7)', { w: 500 });
    button(W / 2 - 192, 614, 180, 52, 'Play again', 'again', true); button(W / 2 + 12, 614, 180, 52, 'Back to the world', 'back', false);
    c.restore();
    txt(c, 'Space to race again · Esc to leave', W / 2, 684, 11, 'rgba(201,182,255,.6)', { w: 500 });
  }
  function drawLoading() {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1033'); g.addColorStop(1, '#130e22'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const gl = c.createRadialGradient(W / 2, H / 2 - 60, 10, W / 2, H / 2 - 60, 170); gl.addColorStop(0, 'rgba(110,200,255,.28)'); gl.addColorStop(1, 'rgba(110,200,255,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#fff'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const u = (T * .7 + i / 3) % 1; c.globalAlpha = (1 - u) * .35; c.beginPath(); c.ellipse(W / 2, H / 2 - 70, 30 + u * 60, 40 + u * 50, 0, 0, TAU); c.stroke(); } c.globalAlpha = 1;
    c.save(); c.translate(W / 2, H / 2 - 70 + Math.sin(T * 3) * 5); c.rotate(Math.sin(T * 2) * .08); c.translate(-25, -48); paintBoat(c, 50, 96, BOATS[4].col); c.restore();
    txt(c, 'Loading the river…', W / 2, H / 2 + 20, 22, C.cream);
    c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, W / 2 - 100, H / 2 + 46, 200, 10, 5); c.fill();
    c.fillStyle = C.lav; rr(c, W / 2 - 100, H / 2 + 46, Math.max(10, 200 * loadN / Math.max(1, loadOf)), 10, 5); c.fill();
  }
  function draw() {
    btns.length = 0; c.setTransform(K, 0, 0, K, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    if (!ready || state === 'loading') { drawLoading(); return; }
    c.fillStyle = '#9ad672'; c.fillRect(0, 0, W, H);
    c.save(); if (shake > .3) c.translate(rnd(-1, 1) * shake * .6, rnd(-1, 1) * shake * .6);
    drawRiver(); drawFlat(); drawWorld(); drawParticles(); drawTags();
    c.restore();
    if (!grad.top) { grad.top = c.createLinearGradient(0, 0, 0, 120); grad.top.addColorStop(0, 'rgba(19,14,34,.28)'); grad.top.addColorStop(1, 'rgba(19,14,34,0)'); }
    c.fillStyle = grad.top; c.fillRect(0, 0, W, 120);
    screenFX();
    if (state !== 'title') hud();
    overlays();
    if (state === 'title') titleCard(); else if (state === 'results') resultsCard();
  }

  // ---------- input ----------
  const USED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Enter', 'Escape']);
  function onKey(e) {
    if (!USED.has(e.code)) return; e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.type === 'keyup') { keys.delete(e.code); return; }
    audio(); keys.add(e.code);
    if (e.code === 'Escape') { close(); return; }
    if (e.repeat) return;
    const goKey = e.code === 'Space' || e.code === 'Enter';
    if (state === 'title' && goKey) { start(); return; }
    if (state === 'results' && goKey && resT > .7) { start(); return; }
    if (state === 'race' && !auto() && (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space')) fireTurbo(you, true);
  }
  const toLocal = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  function onDown(e) {
    audio(); if (e.pointerType === 'touch' && !touchUI) touchUI = true; const p = toLocal(e);
    for (const b of btns) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.act === 'back') { sfx.click(); close(); } else start(); return; }
    if (state === 'title') { start(); return; }
    if (state !== 'race' && state !== 'count') return;
    try { cv.setPointerCapture(e.pointerId); } catch {}
    if (touchUI && state === 'race' && Math.hypot(p.x - TB.x, p.y - TB.y) < TB.r + 10) { ptrs.set(e.pointerId, 'T'); fireTurbo(you, true); return; }
    ptrs.set(e.pointerId, p.x < W / 2 ? 'L' : 'R');
  }
  function onMove(e) { const v = ptrs.get(e.pointerId); if (v === 'L' || v === 'R') ptrs.set(e.pointerId, toLocal(e).x < W / 2 ? 'L' : 'R'); }
  function onUp(e) { ptrs.delete(e.pointerId); }
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const onBlur = () => { keys.clear(); ptrs.clear(); }; addEventListener('blur', onBlur);
  const onVis = () => { paused = document.hidden; last = 0; if (paused) { keys.clear(); ptrs.clear(); } humSet(!paused && state === 'race', clamp((you.v - 120) / 330, 0, 1)); };
  document.addEventListener('visibilitychange', onVis);
  const onResize = () => { if (fit() && ready) build(); }; addEventListener('resize', onResize);
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); muted = !muted; try { localStorage.setItem('aa.games.mute', muted ? '1' : '0'); } catch {} paintMute(); audio(); humSet(state === 'race', .5); sfx.click(); });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });

  // ---------- loop / close ----------
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (paused) { last = 0; return; }
    const dt = Math.min(.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
    const n = (tst && tst.speed) || 1; for (let i = 0; i < n; i++) update(dt);
    draw();
  }
  raf = requestAnimationFrame(loop);
  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur); removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    try { if (hum) { hum.o1.stop(); hum.o2.stop(); hum.lfo.stop(); } } catch {} try { if (ac) ac.close(); } catch {}
    wrap.remove();
    order(); const rk = rank || ord.indexOf(you) + 1;
    try { onClose({ score, rank: rk, won: rank === 1 }); } catch {}
  }
  if (tst) tst.peek = () => ({ state, raceT, T, seed, K, cd, you: { x: Math.round(you.x), d: Math.round(you.d), v: Math.round(you.v), lap: you.lap, fin: you.fin, meter: you.meter, turbo: you.turbo, spin: you.spin }, rivals: rivals.map((r) => ({ n: r.name, d: Math.round(r.d), fin: r.fin, boat: BOATS[r.boat].id, hits: r.hits, coins: r.coins, skill: r.skill })), youBoat: BOATS[you.boat].id, rank, score, stats, obs: obs.length, pads: pads.length, coins: coins.length, art: art.boats ? { boats: art.boats.map((b) => b.art), river: art.riverArt, gate: art.gate.art, buoy: art.buoy.art, rock: art.rock.art, log: art.log.art, pad: art.pad.art, flag: art.flag.art, trophy: art.trophy.art, splash: art.splash.art, coin: art.coin.art, poster: !!art.poster } : null, sprites: racers.map((r) => !!r.cock) });
  if (tst) { tst.warp = (dd) => { for (const r of racers) r.d += dd; camD += dd; }; tst.fill = () => { you.meter = 1; }; }
  return { close };
}
