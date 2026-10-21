// Card Clash: an elemental card duel against one bonded agent. PUMP beats HODL, HODL beats DUMP, DUMP beats PUMP;
// same element → higher power. The round winner banks its card; bank 3 of one element in 3 colours, or one of each
// element in 3 colours, to win the match. Everything is drawn on one canvas, no assets, no network.
const W = 640, H = 480, TAU = Math.PI * 2, CW = 84, CH = 116, SP = 276, SA = 364, SY = 214, TY = 54;
const FONT = 'Fredoka, system-ui, sans-serif';
const EL = [{ k: 'PUMP', c: '#3cff8f', d: '#139a52' }, { k: 'HODL', c: '#5aa8ff', d: '#2a5fc4' }, { k: 'DUMP', c: '#ff6b81', d: '#c42f4c' }];
const COLS = [{ k: 'PINK', c: '#ff8fb8' }, { k: 'GOLD', c: '#ffd166' }, { k: 'VIOLET', c: '#b28cff' }, { k: 'ORANGE', c: '#ff9f5a' }, { k: 'AQUA', c: '#6fe3d6' }];
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#b8e07a' }];
const beats = (a, b) => (b - a + 3) % 3 === 1;
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOf = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOutBack = (t) => { const c = 1.7; t = clamp(t, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, String(v)); } catch {} } };

function mix(hex, to, t) { // blend two #rrggbb colours
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t), g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t), bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}
function normColor(c, i) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : FALLBACK[i % 3].color; }

// ---------- rules ----------
function findWin(bank) {
  for (let e = 0; e < 3; e++) { const got = [], seen = new Set(); for (const c of bank) if (c.el === e && !seen.has(c.col)) { seen.add(c.col); got.push(c); if (got.length === 3) return got; } }
  const by = [0, 1, 2].map((e) => bank.filter((c) => c.el === e));
  for (const a of by[0]) for (const b of by[1]) if (b.col !== a.col) for (const c of by[2]) if (c.col !== a.col && c.col !== b.col) return [a, b, c];
  return null;
}
function bestCross(bank) { // largest set with distinct elements and distinct colours
  const by = [[null], [null], [null]]; for (const b of bank) by[b.el].push(b);
  let best = [];
  for (const a of by[0]) for (const b of by[1]) for (const c of by[2]) {
    const set = [a, b, c].filter(Boolean); if (new Set(set.map((q) => q.col)).size !== set.length) continue;
    if (set.length > best.length) best = set;
  }
  return best;
}
function rowColours(bank, e) { const s = []; for (const c of bank) if (c.el === e && !s.includes(c.col)) s.push(c.col); return s; }
function progress(bank) { let p = bestCross(bank).length; for (let e = 0; e < 3; e++) p = Math.max(p, Math.min(3, rowColours(bank, e).length)); return p; }
function gain(bank, card) { const nb = bank.concat(card); if (findWin(nb)) return 100; return (progress(nb) - progress(bank)) * 14 + (bank.some((b) => b.el === card.el && b.col === card.col) ? 0 : 2); }
function avgGain(bank, el) { let s = 0; for (let k = 0; k < 5; k++) s += gain(bank, { el, col: k }); return s / 5; }
function makeDeck() {
  const d = [];
  for (let e = 0; e < 3; e++) for (let c = 0; c < 5; c++) for (let i = 0; i < 3; i++) d.push({ el: e, col: c, pow: 2 + ((Math.random() * 11) | 0) });
  for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

// ---------- drawing helpers ----------
function txt(x, s, px, py, size, color, o = {}) {
  x.font = `${o.w || 600} ${size}px ${FONT}`; x.textAlign = o.align || 'center'; x.textBaseline = 'middle';
  if (o.stroke) { x.lineJoin = 'round'; x.lineWidth = o.sw || 4; x.strokeStyle = o.stroke; x.strokeText(s, px, py); }
  x.fillStyle = color; x.fillText(s, px, py);
}
function panel(x, px, py, w, h, r = 18, a = 0.86) {
  x.fillStyle = `rgba(20,13,38,${a})`; x.beginPath(); x.roundRect(px, py, w, h, r); x.fill();
  x.strokeStyle = 'rgba(201,182,255,.55)'; x.lineWidth = 2; x.stroke();
}
function coin(x, px, py, r) { // gold smiley coin
  x.fillStyle = '#c98f1e'; x.beginPath(); x.arc(px, py + r * 0.1, r, 0, TAU); x.fill();
  const g = x.createRadialGradient(px - r * 0.3, py - r * 0.4, r * 0.1, px, py, r); g.addColorStop(0, '#fff2b8'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#f0b440');
  x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 0.92, 0, TAU); x.fill();
  x.fillStyle = '#8a5a10'; x.beginPath(); x.arc(px - r * 0.3, py - r * 0.18, r * 0.11, 0, TAU); x.arc(px + r * 0.3, py - r * 0.18, r * 0.11, 0, TAU); x.fill();
  x.strokeStyle = '#8a5a10'; x.lineWidth = Math.max(1, r * 0.12); x.lineCap = 'round'; x.beginPath(); x.arc(px, py + r * 0.05, r * 0.42, 0.25 * Math.PI, 0.75 * Math.PI); x.stroke();
}
function drawIcon(x, el, k, t = 0) { // element icon centred at 0,0, ~44px wide at k=1
  x.save(); x.scale(k, k); x.lineJoin = 'round'; x.lineCap = 'round';
  if (el === 0) { // rocket to the moon
    x.rotate(0.55);
    x.fillStyle = '#ffd166'; x.beginPath(); x.moveTo(-6, 11); x.quadraticCurveTo(0, 26 + Math.sin(t * 30) * 3, 6, 11); x.fill();
    x.fillStyle = '#ff9f5a'; x.beginPath(); x.moveTo(-3.5, 11); x.quadraticCurveTo(0, 19 + Math.sin(t * 30 + 1) * 2, 3.5, 11); x.fill();
    x.fillStyle = EL[0].d; x.beginPath(); x.moveTo(-8, 1); x.lineTo(-16, 14); x.lineTo(-7, 11); x.closePath(); x.moveTo(8, 1); x.lineTo(16, 14); x.lineTo(7, 11); x.closePath(); x.fill();
    const g = x.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#d9ffe9'); g.addColorStop(1, '#8af5b9');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -24); x.quadraticCurveTo(13, -10, 9, 12); x.lineTo(-9, 12); x.quadraticCurveTo(-13, -10, 0, -24); x.fill();
    x.fillStyle = EL[0].c; x.beginPath(); x.moveTo(0, -24); x.quadraticCurveTo(7, -17, 8.5, -13); x.lineTo(-8.5, -13); x.quadraticCurveTo(-7, -17, 0, -24); x.fill();
    x.fillStyle = '#1b1230'; x.beginPath(); x.arc(0, -3, 5, 0, TAU); x.fill(); x.fillStyle = EL[0].c; x.beginPath(); x.arc(0, -3, 3.4, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(-1.2, -4.3, 1.2, 0, TAU); x.fill();
  } else if (el === 1) { // diamond hands
    const g = x.createLinearGradient(0, -16, 0, 14); g.addColorStop(0, '#e2f1ff'); g.addColorStop(0.45, '#8cc8ff'); g.addColorStop(1, EL[1].d);
    x.fillStyle = g; x.beginPath(); x.moveTo(-15, -7); x.lineTo(-8, -15); x.lineTo(8, -15); x.lineTo(15, -7); x.lineTo(0, 14); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(-15, -7); x.lineTo(15, -7); x.moveTo(-8, -15); x.lineTo(-4, -7); x.lineTo(0, 14); x.lineTo(4, -7); x.lineTo(8, -15); x.stroke();
    for (const s of [-1, 1]) { // little mitten hands hugging it
      x.fillStyle = '#c9b6ff'; x.beginPath(); x.ellipse(s * 16, 5, 6.5, 8, s * -0.5, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(s * 11.5, -1, 3, 4, s * -0.3, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.arc(s * 17.5, 2, 1.8, 0, TAU); x.fill();
    }
  } else { // dump arrow
    x.strokeStyle = 'rgba(255,107,129,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-18, -16); x.lineTo(-10, -10); x.lineTo(-4, -14); x.lineTo(4, -2); x.lineTo(10, -6); x.lineTo(18, 8); x.stroke();
    const g = x.createLinearGradient(0, -18, 0, 20); g.addColorStop(0, '#ffc2cc'); g.addColorStop(0.5, EL[2].c); g.addColorStop(1, EL[2].d);
    x.fillStyle = g; x.beginPath(); x.moveTo(-6, -18); x.lineTo(6, -18); x.lineTo(6, 0); x.lineTo(15, 0); x.lineTo(0, 19); x.lineTo(-15, 0); x.lineTo(-6, 0); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.4; x.stroke();
  }
  x.restore();
}
function drawBlob(x, px, py, r, color, { look = 0, lookY = 0, squash = 0, blink = 0, mood = 'happy' } = {}) {
  x.save(); x.translate(px, py);
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(0, r * 0.92, r * 0.85 * (1 + squash * 0.5), r * 0.2, 0, 0, TAU); x.fill();
  x.translate(0, r * 0.9); x.scale(1 + squash * 0.55, 1 - squash); x.translate(0, -r * 0.9);
  const dark = mix(color, '#1b1230', 0.35);
  x.fillStyle = dark; // feet + nub arms
  x.beginPath(); x.ellipse(-r * 0.42, r * 0.84, r * 0.26, r * 0.14, 0, 0, TAU); x.ellipse(r * 0.42, r * 0.84, r * 0.26, r * 0.14, 0, 0, TAU); x.fill();
  const arm = mood === 'happy' ? -0.9 : mood === 'sad' ? 0.6 : 0;
  for (const s of [-1, 1]) { x.save(); x.translate(s * r * 0.95, r * 0.2); x.rotate(s * arm); x.fillStyle = mix(color, '#1b1230', 0.15); x.beginPath(); x.ellipse(s * r * 0.1, 0, r * 0.24, r * 0.17, 0, 0, TAU); x.fill(); x.restore(); }
  const g = x.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, 0, r * 1.1); g.addColorStop(0, mix(color, '#ffffff', 0.6)); g.addColorStop(0.45, color); g.addColorStop(1, dark);
  x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, r * 1.02, r * 0.94, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-r * 0.4, -r * 0.52, r * 0.26, r * 0.13, -0.5, 0, TAU); x.fill();
  const ex = look * r * 0.12, ey = -r * 0.1 + lookY * r * 0.1;
  x.fillStyle = 'rgba(255,111,160,.5)'; x.beginPath(); x.ellipse(-r * 0.58, r * 0.2, r * 0.17, r * 0.1, 0, 0, TAU); x.ellipse(r * 0.58, r * 0.2, r * 0.17, r * 0.1, 0, 0, TAU); x.fill();
  for (const s of [-1, 1]) {
    const cx = s * r * 0.32 + ex, open = Math.max(0.08, 1 - blink);
    x.fillStyle = '#140c22'; x.beginPath(); x.ellipse(cx, ey, r * 0.15, r * 0.2 * open, 0, 0, TAU); x.fill();
    if (open > 0.4) { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - r * 0.05, ey - r * 0.08 * open, r * 0.06, 0, TAU); x.fill(); x.beginPath(); x.arc(cx + r * 0.05, ey + r * 0.06 * open, r * 0.028, 0, TAU); x.fill(); }
    if (mood === 'sad') { x.strokeStyle = '#140c22'; x.lineWidth = r * 0.05; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - s * r * 0.16, ey - r * 0.32); x.lineTo(cx + s * r * 0.08, ey - r * 0.25); x.stroke(); }
  }
  x.strokeStyle = '#140c22'; x.fillStyle = '#5a1f3a'; x.lineWidth = r * 0.06; x.lineCap = 'round'; x.beginPath();
  const my = r * 0.26 + lookY * r * 0.05;
  if (mood === 'happy') { x.moveTo(ex - r * 0.17, my - r * 0.02); x.quadraticCurveTo(ex, my + r * 0.24, ex + r * 0.17, my - r * 0.02); x.closePath(); x.fill(); x.stroke(); }
  else if (mood === 'sad') { x.moveTo(ex - r * 0.12, my + r * 0.1); x.quadraticCurveTo(ex, my - r * 0.04, ex + r * 0.12, my + r * 0.1); x.stroke(); }
  else if (mood === 'think') { x.moveTo(ex - r * 0.07, my + r * 0.04); x.lineTo(ex + r * 0.1, my); x.stroke(); }
  else { x.moveTo(ex - r * 0.1, my); x.quadraticCurveTo(ex, my + r * 0.1, ex + r * 0.1, my); x.stroke(); }
  x.restore();
}
function nameTag(x, s, px, py, bg = 'rgba(20,13,38,.85)') {
  x.font = `600 12px ${FONT}`; const w = x.measureText(s).width + 16;
  x.fillStyle = bg; x.beginPath(); x.roundRect(px - w / 2, py - 10, w, 20, 10); x.fill();
  txt(x, s, px, py + 0.5, 12, '#fff');
}
// ---------- art (loaded once per page, shared by every open) ----------
const ART = {}; let artP = null;
function loadImg(src) { return new Promise((res) => { if (!src) { res(null); return; } const im = new Image(); im.decoding = 'async'; im.onload = () => res(im.naturalWidth ? im : null); im.onerror = () => res(null); im.src = src; }); }
function loadArt() {
  if (!artP) artP = Promise.all(Object.entries({ bg: 'bg.jpg', pump: 'pump.png', hodl: 'hodl.png', dump: 'dump.png', back: 'cardback.png' })
    .map(([k, f]) => { let u = ''; try { u = new URL(`./art/cardclash/${f}`, import.meta.url).href; } catch {} return loadImg(u).then((im) => { ART[k] = im; }); }));
  return artP;
}
const iconImg = (el) => ART[['pump', 'hodl', 'dump'][el]];
function iconAt(x, el, px, py, size, t = 0) { // element icon: painted art when loaded, else the canvas drawing
  const im = iconImg(el);
  if (im) x.drawImage(im, px - size / 2, py - size / 2, size, size);
  else { x.save(); x.translate(px, py); drawIcon(x, el, size / 46, t); x.restore(); }
}
const faces = new Map(); let backCv = null; const FS = 2.5; // card faces are pre-rendered at 2.5x and reused
function renderFace(c) {
  const key = `${c.el}.${c.col}.${c.pow}`; let cv = faces.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = CW * FS; cv.height = CH * FS; const x = cv.getContext('2d');
  x.scale(FS, FS); x.translate(CW / 2, CH / 2);
  const w = CW, h = CH, l = -w / 2, tp = -h / 2, col = COLS[c.col].c, e = EL[c.el], foil = c.pow >= 10;
  // metallic colour frame
  const fg = x.createLinearGradient(l, tp, l + w, tp + h);
  fg.addColorStop(0, mix(col, '#ffffff', 0.55)); fg.addColorStop(0.35, col); fg.addColorStop(0.6, mix(col, '#2a1748', 0.3)); fg.addColorStop(0.8, mix(col, '#ffffff', 0.25)); fg.addColorStop(1, mix(col, '#2a1748', 0.4));
  x.fillStyle = fg; x.beginPath(); x.roundRect(l, tp, w, h, 12); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1; x.beginPath(); x.roundRect(l + 1, tp + 1, w - 2, h - 2, 11); x.stroke();
  // art window
  x.save(); x.beginPath(); x.roundRect(l + 6, tp + 6, w - 12, h - 12, 8); x.clip();
  const ig = x.createLinearGradient(0, tp, 0, tp + h); ig.addColorStop(0, mix(e.c, '#1d1033', 0.72)); ig.addColorStop(0.55, '#1d1033'); ig.addColorStop(1, '#120a22');
  x.fillStyle = ig; x.fillRect(l, tp, w, h);
  x.fillStyle = mix(e.c, '#1d1033', 0.8); // sunburst
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 90, a, a + TAU / 36); x.closePath(); x.fill(); }
  const rg = x.createRadialGradient(0, 0, 4, 0, 0, 44); rg.addColorStop(0, mix(e.c, '#ffffff', 0.2) + ''); rg.addColorStop(0.25, mix(e.c, '#1d1033', 0.35)); rg.addColorStop(1, 'rgba(18,10,34,0)');
  x.globalAlpha = 0.75; x.fillStyle = rg; x.fillRect(l, tp, w, h); x.globalAlpha = 1;
  const vg = x.createLinearGradient(0, tp + h - 40, 0, tp + h); vg.addColorStop(0, 'rgba(18,10,34,0)'); vg.addColorStop(1, 'rgba(18,10,34,.9)'); x.fillStyle = vg; x.fillRect(l, tp, w, h);
  x.restore();
  x.strokeStyle = mix(col, '#1b1230', 0.45); x.lineWidth = 1.5; x.beginPath(); x.roundRect(l + 6, tp + 6, w - 12, h - 12, 8); x.stroke();
  if (foil && x.createConicGradient) { const cg = x.createConicGradient(0.6, 0, 0); ['#ff8fb8', '#ffd166', '#3cff8f', '#6fe3d6', '#5aa8ff', '#b28cff', '#ff8fb8'].forEach((s, i) => cg.addColorStop(i / 6, s)); x.strokeStyle = cg; x.lineWidth = 1.6; x.beginPath(); x.roundRect(l + 7.5, tp + 7.5, w - 15, h - 15, 7); x.stroke(); }
  // the element art
  x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
  iconAt(x, c.el, 0, 2, 64); x.shadowColor = 'rgba(0,0,0,0)';
  // power number
  const ng = x.createLinearGradient(0, tp + 8, 0, tp + 36); ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, mix(col, '#ffffff', 0.35));
  x.font = `700 30px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
  x.lineWidth = 6; x.strokeStyle = '#150d29'; x.strokeText(String(c.pow), l + 9, tp + 34); x.fillStyle = ng; x.fillText(String(c.pow), l + 9, tp + 34);
  // colour gem
  x.fillStyle = '#150d29'; x.beginPath(); x.arc(w / 2 - 16, tp + 18, 7.5, 0, TAU); x.fill();
  const gg = x.createRadialGradient(w / 2 - 18, tp + 16, 1, w / 2 - 16, tp + 18, 6); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.35, col); gg.addColorStop(1, mix(col, '#1b1230', 0.4));
  x.fillStyle = gg; x.beginPath(); x.arc(w / 2 - 16, tp + 18, 5.8, 0, TAU); x.fill();
  // element ribbon
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.roundRect(-27, h / 2 - 22, 54, 16, 8); x.fill();
  const rb = x.createLinearGradient(0, h / 2 - 24, 0, h / 2 - 8); rb.addColorStop(0, mix(e.c, '#ffffff', 0.35)); rb.addColorStop(1, e.d);
  x.fillStyle = rb; x.beginPath(); x.roundRect(-27, h / 2 - 24, 54, 16, 8); x.fill();
  x.font = `700 10.5px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#150d29'; x.fillText(e.k, 0, h / 2 - 15.5);
  // static gloss
  x.save(); x.beginPath(); x.roundRect(l, tp, w, h, 12); x.clip();
  const sg = x.createLinearGradient(l, tp, l + w * 0.7, tp + h * 0.5); sg.addColorStop(0, 'rgba(255,255,255,.22)'); sg.addColorStop(0.45, 'rgba(255,255,255,.05)'); sg.addColorStop(0.46, 'rgba(255,255,255,0)');
  x.fillStyle = sg; x.fillRect(l, tp, w, h); x.restore();
  faces.set(key, cv); return cv;
}
function renderBack() {
  if (backCv) return backCv;
  const cv = document.createElement('canvas'); cv.width = CW * FS; cv.height = CH * FS; const x = cv.getContext('2d'); x.scale(FS, FS); x.translate(CW / 2, CH / 2);
  const w = CW, h = CH, l = -w / 2, tp = -h / 2;
  if (ART.back) { x.save(); x.beginPath(); x.roundRect(l, tp, w, h, 12); x.clip(); x.fillStyle = '#4a2a7a'; x.fillRect(l, tp, w, h); x.drawImage(ART.back, l - 2, tp - 2, w + 4, h + 4); x.restore(); }
  else {
    const bg = x.createLinearGradient(0, tp, 0, tp + h); bg.addColorStop(0, '#c9b6ff'); bg.addColorStop(1, '#7a5ad6');
    x.fillStyle = bg; x.beginPath(); x.roundRect(l, tp, w, h, 12); x.fill();
    x.fillStyle = '#21153d'; x.beginPath(); x.roundRect(l + 5, tp + 5, w - 10, h - 10, 8); x.fill();
    x.save(); x.beginPath(); x.roundRect(l + 5, tp + 5, w - 10, h - 10, 8); x.clip();
    x.strokeStyle = 'rgba(155,124,240,.28)'; x.lineWidth = 3; x.beginPath();
    for (let i = -6; i < 8; i++) { x.moveTo(l + i * 14, tp); x.lineTo(l + i * 14 + h, tp + h); } x.stroke(); x.restore();
    coin(x, 0, 0, 19);
  }
  backCv = cv; return cv;
}
function drawCard(x, c, t, { faceUp = 1, hot = 0, glow = 0, keyHint = '' } = {}) {
  // faceUp: 0 = back … 1 = face (flip animation via horizontal scale)
  const fx = Math.cos(faceUp * Math.PI), face = faceUp > 0.5;
  x.save(); x.translate(c.x, c.y); x.rotate(c.rot); x.scale(c.s * Math.max(0.03, Math.abs(fx)), c.s);
  x.globalAlpha = c.a;
  const w = CW, h = CH, l = -w / 2, tp = -h / 2;
  x.fillStyle = `rgba(6,2,16,${0.35 + hot * 0.15})`; x.beginPath(); x.roundRect(l + 3, tp + 6 + hot * 8, w, h, 12); x.fill();
  if (glow) { x.shadowColor = '#ffd166'; x.shadowBlur = 24 * glow; }
  x.drawImage(face ? renderFace(c) : renderBack(), l, tp, w, h);
  x.shadowBlur = 0; x.shadowColor = 'rgba(0,0,0,0)';
  const shine = face ? Math.max(hot, c.pow >= 10 ? 0.35 : 0) : hot * 0.5;
  if (shine > 0.02) { // foil sheen sweeping across (always on for 10+ "foil" cards, stronger on hover)
    x.save(); x.beginPath(); x.roundRect(l, tp, w, h, 12); x.clip(); x.globalCompositeOperation = 'lighter';
    const p = ((t * 0.55 + (c.pow || 0) * 0.13) % 1.6) - 0.3, cx = l + p * w * 1.6;
    const fg = x.createLinearGradient(cx - 40, tp, cx + 40, tp + h);
    fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(0.36, `hsla(${(t * 120) % 360},100%,72%,${0.16 * shine})`);
    fg.addColorStop(0.5, `rgba(255,255,255,${0.45 * shine})`); fg.addColorStop(0.64, `hsla(${(t * 120 + 140) % 360},100%,72%,${0.18 * shine})`); fg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = fg; x.fillRect(l, tp, w, h); x.restore();
  }
  if (keyHint) { x.fillStyle = 'rgba(20,13,38,.92)'; x.beginPath(); x.roundRect(-11, -h / 2 - 9, 22, 18, 6); x.fill(); x.strokeStyle = 'rgba(201,182,255,.7)'; x.lineWidth = 1; x.stroke(); txt(x, keyHint, 0, -h / 2 + 0.5, 11, '#e4dcff'); }
  x.restore();
}

// ---------- sound ----------
function makeSound() {
  let ac = null, nbuf = null, muted = store.get('aa.games.mute') === '1';
  const s = {
    get muted() { return muted; },
    toggle() { muted = !muted; store.set('aa.games.mute', muted ? '1' : '0'); return muted; },
    wake() { try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch {} },
    tone(f, d, type = 'sine', v = 0.12, f2 = 0, delay = 0) {
      if (muted || !ac) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.03);
    },
    noise(d, v, freq, type = 'bandpass') {
      if (muted || !ac) return; if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const ch = nbuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
      const t = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = nbuf; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(f).connect(g).connect(ac.destination); src.start(t); src.stop(t + d + 0.02);
    },
  };
  s.hover = () => s.tone(1100, 0.035, 'sine', 0.03);
  s.pick = () => s.tone(520, 0.09, 'triangle', 0.12, 820);
  s.deal = () => { s.noise(0.05, 0.06, 3200); s.tone(1500, 0.025, 'square', 0.015); };
  s.flip = () => { s.noise(0.12, 0.12, 2400); s.tone(700, 0.08, 'triangle', 0.05, 1100); };
  s.thud = () => { s.tone(150, 0.3, 'sine', 0.35, 45); s.noise(0.22, 0.25, 700, 'lowpass'); };
  s.ding = () => { s.tone(1320, 0.12, 'triangle', 0.12); s.tone(1760, 0.3, 'triangle', 0.1, 0, 0.07); };
  s.lose = () => { s.tone(330, 0.18, 'sawtooth', 0.05, 220); s.tone(262, 0.25, 'triangle', 0.06, 196, 0.12); };
  s.jingle = () => [523, 659, 784, 1047, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.1, 0, i * 0.09));
  s.sad = () => [392, 330, 262, 196].forEach((f, i) => s.tone(f, 0.3, 'triangle', 0.08, 0, i * 0.16));
  return s;
}

// ---------- the game ----------
export function open({ me = { name: 'You', color: '#9b7cf0' }, agents = [], onClose = () => {} } = {}) {
  const meColor = /^#[0-9a-f]{6}$/i.test((me && me.color) || '') ? me.color : '#9b7cf0';
  const pool = (agents && agents.length ? agents : FALLBACK).slice(0, 6).map((a, i) => ({ name: String(a.name || 'AGENT').slice(0, 12).toUpperCase(), color: normColor(a.color, i), src: typeof a.img === 'string' ? a.img : '', img: null }));
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  let oppIdx = 0;

  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(12,8,28,.82);font-family:${FONT}`;
  wrap.innerHTML = `<div style="position:relative;width:min(760px,calc(100vw - 24px),calc((100vh - 24px) * 4 / 3));aspect-ratio:4/3;max-height:calc(100vh - 24px);border-radius:22px;overflow:hidden;box-shadow:0 0 0 2px #9b7cf0,0 0 40px rgba(155,124,240,.35),0 30px 80px rgba(0,0,0,.6)">
    <canvas style="display:block;width:100%;height:100%;touch-action:none;cursor:default"></canvas>
    <button data-x aria-label="Close Card Clash" style="position:absolute;right:1.8%;top:2.4%;width:6%;min-width:24px;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;font:600 clamp(16px,3.2vw,24px)/1 ${FONT};cursor:pointer;box-shadow:0 0 0 1.5px rgba(201,182,255,.5)">×</button>
    <button data-m aria-label="Toggle sound" style="position:absolute;right:9.3%;top:2.4%;width:6%;min-width:24px;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:rgba(20,14,36,.8);color:#fff;font:500 clamp(12px,2.3vw,17px)/1 system-ui;cursor:pointer;box-shadow:0 0 0 1.5px rgba(201,182,255,.5)"></button></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  const snd = makeSound(), muteBtn = wrap.querySelector('[data-m]');
  const setMuteIcon = () => { muteBtn.textContent = snd.muted ? '🔇' : '🔊'; };
  setMuteIcon();
  muteBtn.addEventListener('click', () => { snd.wake(); snd.toggle(); setMuteIcon(); });
  wrap.querySelector('[data-x]').addEventListener('click', () => close());

  // static backdrop: a neon trading-floor dojo
  const bg = document.createElement('canvas'); bg.width = W * dpr; bg.height = H * dpr;
  (function paintBg() {
    const b = bg.getContext('2d'); b.scale(dpr, dpr);
    let g = b.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#1d1033'); g.addColorStop(1, '#2a1748'); b.fillStyle = g; b.fillRect(0, 0, W, 250);
    b.fillStyle = 'rgba(155,124,240,.06)'; for (let i = 0; i < 9; i++) b.fillRect(20 + i * 75, 0, 3, 244); // shoji lattice
    b.fillRect(0, 60, W, 2); b.fillRect(0, 150, W, 2);
    b.save(); b.shadowColor = '#3cff8f'; b.shadowBlur = 10; b.globalAlpha = 0.32; // neon candle chart on the back wall
    for (let i = 0; i < 14; i++) {
      const cx = 168 + i * 22, up = Math.sin(i * 1.7) > -0.3, base = 150 - i * 4 - Math.sin(i) * 14, hgt = 14 + (i * 7) % 20;
      b.fillStyle = b.strokeStyle = up ? '#3cff8f' : '#ff6b81'; b.shadowColor = b.fillStyle;
      b.fillRect(cx - 1, base - hgt - 8, 2, hgt + 16); b.fillRect(cx - 6, base - hgt, 12, hgt);
    }
    b.restore();
    for (const [lx, ly, c] of [[34, 70, '#ff8fb8'], [470, 40, '#ffd166']]) { // paper lanterns
      const lg = b.createRadialGradient(lx, ly, 2, lx, ly, 46); lg.addColorStop(0, c + '55'); lg.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = lg; b.fillRect(lx - 50, ly - 50, 100, 100);
      b.strokeStyle = 'rgba(201,182,255,.35)'; b.lineWidth = 1.5; b.beginPath(); b.moveTo(lx, 0); b.lineTo(lx, ly - 20); b.moveTo(lx, ly + 20); b.lineTo(lx, ly + 32); b.stroke();
      b.fillStyle = c; b.beginPath(); b.ellipse(lx, ly, 14, 17, 0, 0, TAU); b.fill();
      b.strokeStyle = 'rgba(29,16,51,.35)'; b.lineWidth = 1.2; b.beginPath(); for (const dx of [-7, 0, 7]) b.ellipse(lx, ly, Math.abs(dx) + 1.5, 16.5, 0, 0, TAU); b.stroke();
      b.fillStyle = '#3a2160'; b.beginPath(); b.roundRect(lx - 9, ly - 21, 18, 5, 2); b.roundRect(lx - 9, ly + 16, 18, 5, 2); b.fill();
      b.fillStyle = 'rgba(255,255,255,.35)'; b.beginPath(); b.ellipse(lx - 5, ly - 6, 3, 6, -0.3, 0, TAU); b.fill();
    }
    g = b.createLinearGradient(0, 250, 0, H); g.addColorStop(0, '#2b1850'); g.addColorStop(1, '#130e22'); b.fillStyle = g; b.fillRect(0, 250, W, H - 250);
    b.strokeStyle = 'rgba(201,182,255,.10)'; b.lineWidth = 1.5; b.beginPath();
    for (let i = -10; i <= 10; i++) { b.moveTo(320 + i * 30, 250); b.lineTo(320 + i * 120, H); }
    for (let i = 0; i < 6; i++) { const yy = 250 + Math.pow(i / 6, 1.6) * 240 + 6; b.moveTo(0, yy); b.lineTo(W, yy); }
    b.stroke();
    for (const [mx, my, c] of [[70, 340, meColor], [570, 342, '#ff8fb8']]) { // fighter mats
      const mg = b.createRadialGradient(mx, my, 4, mx, my, 70); mg.addColorStop(0, c + '44'); mg.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = mg; b.beginPath(); b.ellipse(mx, my, 70, 22, 0, 0, TAU); b.fill();
    }
    const cg = b.createRadialGradient(320, 230, 10, 320, 230, 150); cg.addColorStop(0, 'rgba(155,124,240,.18)'); cg.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = cg; b.fillRect(160, 120, 320, 220);
  })();

  // ---------- state ----------
  let phase = 'loading', gt = 0, last = 0, raf = 0, shake = 0, hoverI = -1, kbSel = 2, usingKeys = false, closed = false;
  let opp, round = 0, pWins = 0, aWins = 0, pBank = [], aBank = [], pDeck = [], aDeck = [], pHand = [], aHand = [], pPick = null, aPick = null, aReady = false;
  let thinking = false, result = null, winSet = null, matchWon = false, curRun = 0, bestRun = 0, lastRunner = 0, newBest = false, playedAny = false;
  let lastScore = 0, lastWon = false, warnedA = false, warnedP = false, overT = 0;
  let streak = Number(store.get('aa.cardclash.streak')) || 0, best = Number(store.get('aa.cardclash.best')) || 0;
  const live = [], queue = [], btns = [];
  const bubbles = { p: null, a: null };
  let meImg = null;
  const blobs = { p: { x: 70, foot: 340, size: 150, r: 36, sq: 0, sv: 0, blink: 0, bt: rnd(1, 3), mood: 'happy', mt: 0, jump: 0 }, a: { x: 570, foot: 342, size: 176, r: 44, sq: 0, sv: 0, blink: 0, bt: rnd(1, 3), mood: 'happy', mt: 0, jump: 0 } };
  const parts = Array.from({ length: 220 }, () => ({ life: 0 }));
  const later = (d, fn) => queue.push({ t: gt + d, fn });
  const say = (who, text, life = 2.2) => { bubbles[who] = { text, t: gt, life }; };
  const setMood = (who, mood, dur = 1.6, kick = 0) => { const b = blobs[who]; b.mood = mood; b.mt = dur; b.sv += kick; if (mood === 'happy' && kick) b.jump = 0.6; };
  function burst(px, py, color, n, kind = 'spark', spd = 220) {
    for (const p of parts) {
      if (n <= 0) break; if (p.life > 0) continue; n--;
      const a = rnd(0, TAU), v = rnd(spd * 0.3, spd);
      p.x = px; p.y = py; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - (kind === 'coin' ? 120 : 30); p.life = p.max = rnd(0.5, 1.1); p.c = color; p.kind = kind; p.size = kind === 'coin' ? rnd(5, 8) : rnd(2, 4.5); p.rot = rnd(0, TAU);
    }
  }
  function newCard(data, px, py, owner) { const c = { ...data, owner, x: px, y: py, s: owner === 'a' ? 0.43 : 1, rot: 0, flip: 0, a: 1, tx: px, ty: py, ts: 1, trot: 0, tflip: 0, ta: 1, z: 10, hot: 0, glow: 0, zone: 'hand' }; live.push(c); return c; }
  function draw1(deck) { if (!deck.length) deck.push(...makeDeck()); return deck.pop(); }
  function refill(stagger = 0.09) {
    let k = 0;
    for (let i = 0; i < 5; i++) {
      if (!pHand[i]) { const c = newCard(draw1(pDeck), 44, 418, 'p'); c.s = 0.55; c.rot = -0.1; pHand[i] = c; later(k * stagger + 0.12, () => { c.tflip = 1; }); later(k * stagger, () => snd.deal()); k++; }
      if (!aHand[i]) { const c = newCard(draw1(aDeck), 198, 74, 'a'); c.s = 0.43; aHand[i] = c; }
    }
  }
  function startMatch(next) {
    snd.wake();
    if (next || !opp) { if (next) oppIdx = (oppIdx + 1) % pool.length; const o = pool[oppIdx]; let h = 0; for (const ch of o.name) h = (h * 31 + ch.charCodeAt(0)) | 0; opp = { ...o, style: Math.abs(h) % 2 ? 'aggressive' : 'careful' }; }
    live.length = 0; queue.length = 0; bubbles.p = bubbles.a = null;
    round = 0; pWins = 0; aWins = 0; pBank = []; aBank = []; pDeck = makeDeck(); aDeck = makeDeck(); pHand = [null, null, null, null, null]; aHand = [null, null, null, null, null];
    for (const b of Object.values(blobs)) { b.mood = 'neutral'; b.mt = 0; }
    pPick = aPick = null; result = null; winSet = null; curRun = 0; bestRun = 0; lastRunner = 0; newBest = false; warnedA = warnedP = false;
    phase = 'deal'; refill(0.1);
    later(0.3, () => say('a', pickOf(['gm. shuffle up', 'let\'s clash', 'gm, ready to get rekt?', 'wagmi... except you'])));
    later(0.9, beginRound);
  }
  function beginRound() {
    round++; phase = 'pick'; pPick = aPick = null; aReady = false; result = null; thinking = true; playedAny = true;
    const think = opp.style === 'careful' ? rnd(1.1, 2.0) : rnd(0.6, 1.3);
    later(think, agentPlay);
  }
  function agentPlay() {
    if (phase !== 'pick') return;
    const careful = opp.style === 'careful', wO = careful ? 0.85 : 1.35, wD = careful ? 1.45 : 0.6;
    const threat = [0, 1, 2].map((e) => avgGain(pBank, e)); // what you'd love to bank right now
    let pe = threat.map((t) => 1 + t / 12); const sum = pe[0] + pe[1] + pe[2]; pe = pe.map((p) => p / sum);
    let bestV = -1e9, bi = 0;
    aHand.forEach((c, i) => {
      if (!c) return; const off = gain(aBank, c); let ev = 0;
      for (let e = 0; e < 3; e++) {
        let w, l; if (e === c.el) { w = (c.pow - 2) / 11; l = (12 - c.pow) / 11; } else if (beats(c.el, e)) { w = 1; l = 0; } else { w = 0; l = 1; }
        ev += pe[e] * (w * (off * wO + 6) - l * threat[e] * wD);
      }
      ev += careful ? ((c.pow > 9 && Math.max(...threat) < 14) ? -2 : 0) : c.pow * 0.5;
      ev += (Math.random() - 0.5) * 12;
      if (ev > bestV) { bestV = ev; bi = i; }
    });
    if (Math.random() < (careful ? 0.06 : 0.1)) { const opts = aHand.map((c, i) => (c ? i : -1)).filter((i) => i >= 0); bi = pickOf(opts); }
    const c = aHand[bi]; aHand[bi] = null; aPick = c; c.zone = 'slot'; c.tx = SA; c.ty = SY; c.ts = 1; c.trot = 0.04; c.z = 30;
    thinking = false; aReady = true; snd.deal();
    if (Math.max(...threat) >= 100 && Math.random() < 0.7) say('a', pickOf(['not on my watch', 'I see you...', 'blocked?']), 1.6);
    if (pPick) later(0.4, reveal);
  }
  function playerPick(i) {
    if (phase !== 'pick' || pPick || !pHand[i]) return;
    const c = pHand[i]; pHand[i] = null; pPick = c; c.zone = 'slot'; c.tx = SP; c.ty = SY; c.ts = 1; c.trot = -0.04; c.z = 30; c.hot = 0;
    hoverI = -1; snd.pick(); blobs.p.sv += 3;
    if (aReady) later(0.4, reveal);
  }
  function reveal() { phase = 'reveal'; aPick.tflip = 1; snd.flip(); later(0.6, clash); }
  function clash() {
    phase = 'clash'; const p = pPick, a = aPick;
    p.tx = SP + 16; a.tx = SA - 16; p.ts = a.ts = 1.08;
    later(0.12, () => {
      const r = p.el !== a.el ? (beats(p.el, a.el) ? 1 : -1) : p.pow !== a.pow ? (p.pow > a.pow ? 1 : -1) : 0;
      shake = 0.35; snd.thud();
      const win = r > 0 ? p : r < 0 ? a : null, lose = r > 0 ? a : r < 0 ? p : null;
      burst(320, SY, win ? EL[win.el].c : '#c9b6ff', 34, 'spark', 260); burst(320, SY, '#fff', 10, 'star', 160);
      p.tx = SP; a.tx = SA; p.ts = a.ts = 1;
      if (p.el !== a.el) result = { text: `${EL[win.el].k} beats ${EL[lose.el].k}!`, color: EL[win.el].c, t: gt };
      else if (r) result = { text: `${EL[p.el].k} vs ${EL[p.el].k}: ${win.pow} beats ${lose.pow}`, color: EL[p.el].c, t: gt };
      else result = { text: 'Total tie, nobody banks', color: '#c9b6ff', t: gt };
      result.sub = r > 0 ? 'You bank it!' : r < 0 ? `${opp.name} banks it` : '';
      if (r) {
        lose.ta = 0; lose.ty += 26; lose.trot = (lose.owner === 'p' ? -0.5 : 0.5); lose.ts = 0.85; win.glow = 1; win.ts = 1.14;
        if (r > 0) { pWins++; snd.ding(); if (Math.random() < 0.5) say('p', pickOf(['yes!', 'LFG', 'mine', 'gm to me']), 1.4); burst(SP, SY - 20, '#ffd166', 10, 'coin', 200); setMood('p', 'happy', 1.6, 5); setMood('a', 'sad', 1.6, -2); say('a', pickOf(['nice one', 'ouch', 'lucky pull', 'hm.', 'fine. FINE.', 'ok that one hurt']), 1.8); }
        else { aWins++; snd.lose(); setMood('a', 'happy', 1.6, 5); setMood('p', 'sad', 1.6, -2); say('a', a.el === 1 ? pickOf(['diamond hands', 'HODL gang', 'never selling']) : a.el === 2 ? pickOf(['you got dumped on', 'dumped. rip', 'exit liquidity: you']) : pickOf(['to the moon!', 'LFG', 'pumped']), 1.8); }
        if (lastRunner === r) curRun++; else curRun = 1; lastRunner = r; if (r > 0) bestRun = Math.max(bestRun, curRun);
        later(1.15, () => bank(win, r > 0 ? 'p' : 'a'));
      } else {
        lastRunner = 0; curRun = 0; p.ta = a.ta = 0; p.ty += 20; a.ty += 20; say('a', pickOf(['stalemate', 'same brain', 'mirror match']), 1.5);
        later(1.1, () => { cleanup(); refill(); later(0.55, beginRound); });
      }
    });
  }
  function trayX(who) { return who === 'p' ? 6 : W - 6 - 130; }
  function trayY(who) { return who === 'p' ? TY : TY + 6; }
  function chipPos(who, bankArr, el, col) {
    const cols = rowColours(bankArr, el); let idx = cols.indexOf(col); if (idx < 0) idx = cols.length;
    return [trayX(who) + 42 + idx * 18, trayY(who) + 30 + el * 23];
  }
  function bank(card, who) {
    phase = 'bank'; const arr = who === 'p' ? pBank : aBank; const [cx, cy] = chipPos(who, arr, card.el, card.col);
    card.tx = cx; card.ty = cy; card.ts = 0.17; card.trot = 0; card.glow = 0; card.z = 60;
    later(0.5, () => {
      arr.push({ el: card.el, col: card.col, pow: card.pow }); card.zone = 'gone'; card.ta = 0; card.a = 0;
      burst(cx, cy, '#ffd166', 14, 'star', 120); snd.ding();
      const ws = findWin(arr); cleanup();
      if (ws) { winSet = ws; later(0.7, () => endMatch(who === 'p')); return; }
      if (!warnedA && progress(aBank) >= 2 && who === 'a') { warnedA = true; later(0.2, () => say('a', pickOf(['one more...', 'almost got a set', 'smell that? victory']), 1.8)); }
      else if (!warnedP && progress(pBank) >= 2 && who === 'p') { warnedP = true; later(0.2, () => say('a', pickOf(['careful now...', 'you\'re cooking. stop.', 'ok I see the plan']), 1.8)); }
      refill(); later(0.55, beginRound);
    });
  }
  function cleanup() { for (let i = live.length - 1; i >= 0; i--) if (live[i].zone === 'gone' || (live[i].ta === 0 && live[i].zone !== 'hand')) live.splice(i, 1); }
  function endMatch(won) {
    phase = 'over'; overT = gt; matchWon = won; lastScore = pWins; lastWon = won; result = null; bubbles.p = null;
    if (won) { streak++; if (streak > best) { best = streak; newBest = true; store.set('aa.cardclash.best', best); } snd.jingle(); setMood('p', 'happy', 99, 6); setMood('a', 'sad', 99); burst(W / 2, 140, '#ffd166', 40, 'coin', 300); say('a', pickOf(['gg', 'gg, well played', 'gg... rematch?']), 99); }
    else { streak = 0; snd.sad(); setMood('a', 'happy', 99, 6); setMood('p', 'sad', 99); say('a', pickOf(['gg ez', 'gg', 'diamond hands win again', 'gg, you got dumped on']), 99); }
    store.set('aa.cardclash.streak', streak);
  }

  // ---------- input ----------
  const toLocal = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  function handAt(px, py) {
    const order = [0, 1, 2, 3, 4].sort((i, j) => (pHand[j] ? pHand[j].z : 0) - (pHand[i] ? pHand[i].z : 0));
    for (const i of order) { const c = pHand[i]; if (c && Math.abs(px - c.x) < CW / 2 * c.s && py > c.y - CH / 2 * c.s && py < c.y + CH / 2 * c.s + 22) return i; }
    return -1;
  }
  function btnAt(px, py) { for (const b of btns) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b; return null; }
  function onMove(e) {
    const [px, py] = toLocal(e); usingKeys = false;
    const i = phase === 'pick' && !pPick ? handAt(px, py) : -1; if (i !== hoverI && i >= 0) snd.hover(); hoverI = i;
    const b = btnAt(px, py); for (const q of btns) q.hot = q === b;
    cv.style.cursor = i >= 0 || b ? 'pointer' : 'default';
  }
  function onDown(e) {
    snd.wake(); const [px, py] = toLocal(e);
    const b = btnAt(px, py); if (b) { b.fn(); return; }
    if (phase === 'title') { startMatch(false); return; }
    if (phase === 'pick') { const i = handAt(px, py); if (i >= 0) playerPick(i); }
  }
  const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyN', 'KeyR', 'Space', 'Enter', 'NumpadEnter', 'Escape'];
  function onKey(e) {
    if (!KEYS.includes(e.code)) return;
    e.preventDefault(); e.stopPropagation(); if (e.type !== 'keydown') return; snd.wake();
    if (e.code === 'Escape') { close(); return; }
    const go = e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (phase === 'title') { if (go) startMatch(false); return; }
    if (phase === 'over') { if (go || e.code === 'KeyR') startMatch(false); else if (e.code === 'KeyN') startMatch(true); return; }
    if (phase !== 'pick' || pPick || e.repeat) return;
    const n = /^(Digit|Numpad)([1-5])$/.exec(e.code); if (n) { playerPick(+n[2] - 1); return; }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
      const d = e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1; usingKeys = true; hoverI = -1;
      for (let k = 0; k < 5; k++) { kbSel = (kbSel + d + 5) % 5; if (pHand[kbSel]) break; } snd.hover(); return;
    }
    if (go && usingKeys) playerPick(kbSel); else if (go) { usingKeys = true; }
  }
  const onVis = () => { last = 0; };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown);
  document.addEventListener('visibilitychange', onVis);

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); document.removeEventListener('visibilitychange', onVis);
    wrap.remove();
    const score = phase === 'over' ? lastScore : pWins;
    const won = phase === 'over' && lastWon;
    try { onClose({ score, rank: won ? 1 : 2, won }); } catch {}
  }

  // ---------- update ----------
  function step(dt) {
    gt += dt;
    for (let i = 0; i < queue.length; i++) if (queue[i].t <= gt) { const q = queue.splice(i, 1)[0]; i--; q.fn(); }
    for (let i = 0; i < 5; i++) {
      const c = pHand[i]; if (c) { const hot = phase === 'pick' && !pPick && (i === hoverI || (usingKeys && i === kbSel)); c.tx = 320 + (i - 2) * 90; c.ty = 414 - (hot ? 18 : 0); c.ts = hot ? 1.06 : 1; c.trot = hot ? 0 : (i - 2) * 0.035; c.z = hot ? 50 : 10 + i; c.hot += ((hot ? 1 : 0) - c.hot) * Math.min(1, dt * 12); }
      const a = aHand[i]; if (a) { const th = thinking && Math.sin(gt * 6 + i) > 0.6 ? -5 : 0; a.tx = 260 + i * 30; a.ty = 74 + Math.abs(i - 2) * 3 + th; a.ts = 0.43; a.trot = (i - 2) * 0.1; a.z = 5; }
    }
    const k = 1 - Math.exp(-dt * 11), kf = 1 - Math.exp(-dt * 9);
    for (const c of live) { c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.s += (c.ts - c.s) * k; c.rot += (c.trot - c.rot) * k; c.flip += (c.tflip - c.flip) * kf; c.a += (c.ta - c.a) * k * 0.8; if (c.glow) c.glow = Math.max(0, c.glow - dt * 0.6); }
    for (const b of Object.values(blobs)) {
      b.sv += (-b.sq * 140 - b.sv * 9) * dt; b.sq += b.sv * dt; b.bt -= dt; if (b.bt < 0) { b.blink = 1; b.bt = rnd(2, 4.5); } b.blink = Math.max(0, b.blink - dt * 7);
      b.mt -= dt; if (b.mt < 0 && b.mood !== 'neutral') b.mood = 'neutral'; b.jump = Math.max(0, b.jump - dt);
    }
    if (thinking) blobs.a.mood = 'think';
    for (const p of parts) if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === 'coin' ? 520 : 260) * dt; p.vx *= 1 - dt * 1.5; p.rot += dt * 6; }
    shake = Math.max(0, shake - dt);
  }

  // ---------- render ----------
  function bubble(who) {
    const bb = bubbles[who]; if (!bb) return; const age = gt - bb.t; if (age > bb.life) { bubbles[who] = null; return; }
    const sc = easeOutBack(age / 0.25) * (age > bb.life - 0.2 ? (bb.life - age) / 0.2 : 1);
    x.font = `600 13px ${FONT}`; const w = Math.min(150, x.measureText(bb.text).width + 22), h = 28;
    const right = who === 'a', ax = right ? 548 : 96, ay = right ? 186 : 196;
    x.save(); x.translate(ax, ay); x.scale(sc, sc);
    const bx = right ? -w : 0;
    x.fillStyle = '#fbf6ea'; x.beginPath(); x.roundRect(bx, -h / 2, w, h, 14); x.fill();
    x.beginPath(); x.moveTo(right ? -14 : 10, h / 2 - 2); x.lineTo(right ? 8 : -8, h / 2 + 12); x.lineTo(right ? -2 : 22, h / 2 - 2); x.fill();
    txt(x, bb.text, bx + w / 2, 1, 13, '#2a1748'); x.restore();
  }
  function thinkBubble() {
    if (!thinking || bubbles.a) return; const bx = 510, by = 180;
    x.fillStyle = '#fbf6ea'; x.beginPath(); x.arc(bx + 34, by + 22, 4, 0, TAU); x.arc(bx + 26, by + 14, 6, 0, TAU); x.fill();
    x.beginPath(); x.roundRect(bx - 34, by - 18, 64, 30, 15); x.fill();
    for (let i = 0; i < 3; i++) { x.fillStyle = `rgba(42,23,72,${0.35 + 0.65 * Math.max(0, Math.sin(gt * 7 - i * 0.8))})`; x.beginPath(); x.arc(bx - 14 + i * 13, by - 3, 4, 0, TAU); x.fill(); }
  }
  function tray(who) {
    const arr = who === 'p' ? pBank : aBank, tx = trayX(who), ty = trayY(who), w = 130, hgt = 114;
    x.fillStyle = 'rgba(22,14,42,.96)'; x.beginPath(); x.roundRect(tx, ty, w, hgt, 14); x.fill(); x.strokeStyle = 'rgba(201,182,255,.35)'; x.lineWidth = 1.5; x.stroke();
    txt(x, who === 'p' ? 'YOUR BANK' : `${opp ? opp.name : ''}'S BANK`, tx + w / 2, ty + 11, 10, '#c9b6ff');
    const winning = winSet && (who === 'p') === matchWon ? winSet : null;
    for (let e = 0; e < 3; e++) {
      const cy = ty + 30 + e * 23, cols = rowColours(arr, e), n = cols.length;
      if (n >= 2) { const pulse = n >= 3 ? 1 : 0.5 + 0.5 * Math.sin(gt * 5); x.strokeStyle = `rgba(255,209,102,${0.35 + 0.5 * pulse})`; x.lineWidth = 2; x.beginPath(); x.roundRect(tx + 4, cy - 11, w - 8, 22, 9); x.stroke(); }
      x.fillStyle = mix(EL[e].c, '#150d29', 0.7); x.beginPath(); x.arc(tx + 17, cy, 10, 0, TAU); x.fill();
      iconAt(x, e, tx + 17, cy, 24, gt);
      for (let i = 0; i < 5; i++) {
        const cx = tx + 42 + i * 18;
        if (i < n) {
          const isWin = winning && winning.some((q) => q.el === e && q.col === cols[i]);
          if (isWin) { x.fillStyle = `rgba(255,209,102,${0.6 + 0.4 * Math.sin(gt * 8)})`; x.beginPath(); x.roundRect(cx - 9, cy - 11, 18, 22, 5); x.fill(); }
          x.fillStyle = COLS[cols[i]].c; x.beginPath(); x.roundRect(cx - 7, cy - 9, 14, 18, 4); x.fill();
          x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(cx - 5, cy - 7, 10, 2.5);
          const dupes = arr.filter((q) => q.el === e && q.col === cols[i]).length; if (dupes > 1) txt(x, `${dupes}`, cx, cy + 2, 9, '#2a1748', { w: 700 });
        } else if (i < 3) { x.strokeStyle = 'rgba(201,182,255,.22)'; x.lineWidth = 1.2; x.setLineDash([3, 3]); x.beginPath(); x.roundRect(cx - 7, cy - 9, 14, 18, 4); x.stroke(); x.setLineDash([]); }
      }
    }
    const cross = bestCross(arr), my = ty + 100; // mixed set progress: one of each element, 3 colours
    txt(x, 'MIX', tx + 20, my, 10, '#c9b6ff');
    if (cross.length >= 2) { x.strokeStyle = `rgba(255,209,102,${cross.length >= 3 ? 0.9 : 0.4 + 0.4 * Math.sin(gt * 5)})`; x.lineWidth = 2; x.beginPath(); x.roundRect(tx + 4, my - 10, w - 8, 20, 9); x.stroke(); }
    for (let e = 0; e < 3; e++) {
      const q = cross.find((c) => c.el === e), cx = tx + 50 + e * 26;
      x.fillStyle = q ? COLS[q.col].c : 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(cx, my, 8, 0, TAU); x.fill();
      x.strokeStyle = EL[e].c; x.lineWidth = 1.5; x.stroke();
    }
  }
  function button(bx, by, w, h, label, fn, primary) {
    let b = btns.find((q) => q.label === label); if (!b) { b = { label, hot: false }; btns.push(b); } b.x = bx; b.y = by; b.w = w; b.h = h; b.fn = fn; b.live = true;
    const lift = b.hot ? -2 : 0;
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.roundRect(bx, by + 4, w, h, h / 2); x.fill();
    const g = x.createLinearGradient(0, by, 0, by + h); g.addColorStop(0, primary ? '#ffe3a0' : '#d9ccff'); g.addColorStop(1, primary ? '#f0b440' : '#9b7cf0');
    x.fillStyle = g; x.beginPath(); x.roundRect(bx, by + lift, w, h, h / 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.roundRect(bx + 10, by + lift + 4, w - 20, 5, 3); x.fill();
    txt(x, label, bx + w / 2, by + lift + h / 2 + 1, 16, '#21153d', { w: 600 });
  }
  function titleCard() {
    x.fillStyle = 'rgba(12,8,28,.45)'; x.fillRect(0, 0, W, H);
    panel(x, 44, 22, W - 88, 440, 24, 0.93);
    txt(x, 'CARD CLASH', W / 2, 62, 42, '#ffd166', { w: 700, stroke: '#4a2a8a', sw: 8 });
    txt(x, `Duel ${opp.name} (${opp.style}). Pick a card each round, element beats element.`, W / 2, 98, 14, '#e4dcff');
    const ix = [200, 320, 440];
    for (let e = 0; e < 3; e++) {
      x.fillStyle = mix(EL[e].c, '#150d29', 0.72); x.beginPath(); x.arc(ix[e], 140, 25, 0, TAU); x.fill(); x.strokeStyle = EL[e].c; x.lineWidth = 2; x.stroke();
      iconAt(x, e, ix[e], 140, 46, gt);
      txt(x, EL[e].k, ix[e], 178, 13, EL[e].c, { w: 700 });
    }
    x.strokeStyle = '#fbf6ea'; x.fillStyle = '#fbf6ea'; x.lineWidth = 2;
    const arrow = (x1, y1, x2, y2) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); x.beginPath(); x.moveTo(x2, y2); x.lineTo(x2 - 8 * Math.cos(a - 0.45), y2 - 8 * Math.sin(a - 0.45)); x.lineTo(x2 - 8 * Math.cos(a + 0.45), y2 - 8 * Math.sin(a + 0.45)); x.fill(); };
    arrow(232, 140, 286, 140); arrow(352, 140, 406, 140); txt(x, 'beats', 259, 128, 11, '#c9b6ff'); txt(x, 'beats', 379, 128, 11, '#c9b6ff');
    x.beginPath(); x.moveTo(440, 190); x.quadraticCurveTo(320, 222, 204, 192); x.stroke(); arrow(212, 196, 200, 190); txt(x, 'beats', 320, 214, 11, '#c9b6ff');
    txt(x, 'Same element? Higher power wins. The round winner banks its card.', W / 2, 238, 13, '#e4dcff');
    panel(x, 70, 252, W - 140, 132, 16, 0.6);
    txt(x, 'WIN THE MATCH by banking either', W / 2, 268, 13, '#ffd166', { w: 700 });
    const mini = (el, col, px, py) => drawCard(x, { el, col, pow: [9, 5, 11][col % 3], x: px, y: py, s: 0.4, rot: 0, a: 1 }, gt);
    mini(0, 0, 130, 318); mini(0, 1, 168, 318); mini(0, 2, 206, 318);
    mini(0, 3, 434, 318); mini(1, 4, 472, 318); mini(2, 1, 510, 318);
    txt(x, '3 of ONE element', 168, 357, 12, '#fbf6ea'); txt(x, 'in 3 different colours', 168, 372, 11, '#c9b6ff');
    txt(x, 'or', W / 2, 318, 16, '#ffd166', { w: 700 });
    txt(x, 'ONE of EACH element', 472, 357, 12, '#fbf6ea'); txt(x, 'in 3 different colours', 472, 372, 11, '#c9b6ff');
    txt(x, 'Click / tap a card · or keys 1–5 · ← → then Enter · Esc to leave', W / 2, 398, 12, '#c9b6ff');
    button(W / 2 - 110, 412, 220, 38, 'Start duel  (Space)', () => startMatch(false), true);
  }
  function resultsCard() {
    x.fillStyle = 'rgba(12,8,28,.4)'; x.fillRect(0, 0, W, H);
    panel(x, 110, 40, W - 220, 400, 24, 0.93);
    const head = matchWon ? 'YOU WIN!' : `${opp.name} WINS`;
    const pop = easeOutBack(Math.min(1, (gt - overT) * 3));
    x.save(); x.translate(W / 2, 82); x.scale(pop, pop); txt(x, head, 0, 0, 38, matchWon ? '#ffd166' : '#ff8fb8', { w: 700, stroke: '#4a2a8a', sw: 8 }); x.restore();
    if (winSet) {
      const same = winSet[0].el === winSet[1].el;
      txt(x, `${matchWon ? 'Your' : `${opp.name}'s`} winning set: ${same ? `${EL[winSet[0].el].k} x3` : 'one of each'}`, W / 2, 116, 13, '#c9b6ff');
      winSet.forEach((c, i) => drawCard(x, { ...c, x: W / 2 - 52 + i * 52, y: 168, s: 0.5, rot: (i - 1) * 0.08, a: 1 }, gt, { glow: 0.8 + 0.2 * Math.sin(gt * 4) }));
    }
    if (bubbles.a) txt(x, `${opp.name}: "${bubbles.a.text}"`, W / 2, 210, 13, '#ff8fb8');
    txt(x, `Rounds won  ${pWins} – ${aWins}`, W / 2, 236, 18, '#fbf6ea', { w: 600 });
    txt(x, `${round} rounds played · your best run this match: ${bestRun}`, W / 2, 258, 12, '#c9b6ff');
    txt(x, `Match win streak ${streak}   ·   best streak ${best}`, W / 2, 282, 16, '#ffd166', { w: 600 });
    if (newBest) { const s = 1 + 0.08 * Math.sin(gt * 8); x.save(); x.translate(W / 2, 304); x.scale(s, s); x.fillStyle = '#ff8fb8'; x.beginPath(); x.roundRect(-58, -11, 116, 22, 11); x.fill(); txt(x, 'NEW BEST STREAK!', 0, 1, 12, '#21153d', { w: 700 }); x.restore(); }
    button(140, 330, 170, 42, 'Rematch  (R)', () => startMatch(false), true);
    button(330, 330, 170, 42, 'Next opponent  (N)', () => startMatch(true), false);
    button(210, 386, 220, 36, 'Back to the world', () => close(), false);
  }
  function drawBackdrop() {
    const im = ART.bg;
    if (!im) { x.drawImage(bg, 0, 0, W, H); return; }
    const sc = Math.max(W / im.width, H / im.height) * 1.04, w = im.width * sc, h = im.height * sc;
    x.drawImage(im, (W - w) / 2 + Math.sin(gt * 0.13) * 9, (H - h) / 2 + Math.sin(gt * 0.09) * 3, w, h);
    x.fillStyle = 'rgba(19,14,34,.16)'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 340, 0, H); g.addColorStop(0, 'rgba(19,14,34,0)'); g.addColorStop(1, 'rgba(19,14,34,.6)'); x.fillStyle = g; x.fillRect(0, 340, W, H - 340);
  }
  function loadingCard() {
    x.fillStyle = 'rgba(12,8,28,.55)'; x.fillRect(0, 0, W, H);
    panel(x, W / 2 - 130, H / 2 - 60, 260, 120, 22, 0.9);
    x.save(); x.translate(W / 2, H / 2 - 14); x.scale(Math.cos(gt * 5), 1); coin(x, 0, 0, 20); x.restore();
    txt(x, `Shuffling the deck${'...'.slice(0, 1 + ((gt * 3) | 0) % 3)}`, W / 2, H / 2 + 30, 15, '#e4dcff');
  }
  function deckPile(px, py, sc, n, label) {
    const cnt = Math.min(4, Math.ceil(n / 12)); const fake = { x: 0, y: 0, s: sc, rot: 0, a: 1, pow: 0 };
    for (let i = 0; i < cnt; i++) { fake.x = px - i * 1.5; fake.y = py - i * 2.5; fake.rot = -0.08 + i * 0.02; drawCard(x, fake, gt, { faceUp: 0 }); }
    if (label) { x.fillStyle = 'rgba(20,13,38,.9)'; x.beginPath(); x.roundRect(px - 24, py + CH * sc / 2 + 2, 48, 16, 8); x.fill(); txt(x, `DECK ${n}`, px, py + CH * sc / 2 + 10.5, 10, '#c9b6ff'); }
  }
  function fighter(who, b, img, color, bob) {
    const foot = b.foot + bob, sz = b.size, breathe = Math.sin(gt * 2.4 + (who === 'a' ? 1.3 : 0)) * 0.014;
    if (img) {
      x.save(); x.translate(b.x, foot);
      if (bob < 0) { x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(0, -bob - 4, sz * 0.3, sz * 0.06, 0, 0, TAU); x.fill(); }
      x.scale(1 + b.sq * 0.5 - breathe * 0.5, 1 - b.sq + breathe);
      if (b.mood === 'sad') { x.rotate(who === 'p' ? -0.05 : 0.05); x.filter = 'saturate(.6) brightness(.82)'; }
      else if (b.jump > 0) x.rotate(Math.sin(b.jump * 22) * 0.05);
      if (who === 'p') x.scale(-1, 1); // face the opponent
      x.drawImage(img, -sz / 2, -sz * 0.93, sz, sz);
      x.filter = 'none'; x.restore();
    } else {
      const look = who === 'p' ? 0.6 : thinking ? -0.3 : -0.7, lookY = who === 'p' ? (phase === 'pick' ? 0.6 : 0) : thinking ? -0.8 : 0.3;
      drawBlob(x, b.x, foot - b.r * 1.05, b.r * (who === 'a' ? 1.05 : 1.1), color, { look, lookY, squash: b.sq, blink: b.blink, mood: b.mood });
    }
    const head = foot - sz * 0.78;
    if (b.mood === 'sad' && img) { // a little sweat drop
      const dy = (gt * 14) % 10, dx = b.x + (who === 'p' ? -1 : 1) * sz * 0.3;
      x.fillStyle = '#8cc8ff'; x.beginPath(); x.moveTo(dx, head + dy - 7); x.quadraticCurveTo(dx + 6, head + dy + 2, dx, head + dy + 4); x.quadraticCurveTo(dx - 6, head + dy + 2, dx, head + dy - 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(dx - 1.5, head + dy, 1.4, 0, TAU); x.fill();
    } else if (b.mood === 'happy' && b.mt > 0.1) { // sparkles
      for (let i = 0; i < 3; i++) {
        const a = gt * 2 + i * 2.1, sx = b.x + Math.cos(a) * sz * 0.42, sy = head - 6 + Math.sin(a) * 10, r = 3 + 2 * Math.abs(Math.sin(gt * 5 + i));
        x.fillStyle = '#ffd166'; x.beginPath(); x.moveTo(sx, sy - r * 1.8); x.quadraticCurveTo(sx, sy, sx + r * 1.8, sy); x.quadraticCurveTo(sx, sy, sx, sy + r * 1.8); x.quadraticCurveTo(sx, sy, sx - r * 1.8, sy); x.quadraticCurveTo(sx, sy, sx, sy - r * 1.8); x.fill();
      }
    }
  }
  function draw() {
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shake > 0) x.translate(rnd(-1, 1) * shake * 18, rnd(-1, 1) * shake * 18);
    drawBackdrop();
    if (phase === 'loading') { loadingCard(); return; }
    btns.forEach((b) => { b.live = false; });
    const bp = blobs.p, ba = blobs.a, bobP = -Math.abs(Math.sin(bp.jump * 10)) * 16 * (bp.jump > 0), bobA = -Math.abs(Math.sin(ba.jump * 10)) * 18 * (ba.jump > 0);
    fighter('p', bp, meImg, meColor, bobP);
    nameTag(x, 'YOU', bp.x, bp.foot + 12, 'rgba(155,124,240,.92)');
    deckPile(44, 418, 0.55, pDeck.length, phase !== 'title');
    if (opp) {
      fighter('a', ba, opp.img, opp.color, bobA);
      nameTag(x, opp.name, ba.x, ba.foot + 12);
      deckPile(198, 74, 0.43, aDeck.length, false);
      tray('p'); tray('a');
      // round HUD
      if (phase !== 'title') {
        x.fillStyle = 'rgba(20,13,38,.85)'; x.beginPath(); x.roundRect(238, 8, 164, 30, 15); x.fill(); x.strokeStyle = 'rgba(201,182,255,.45)'; x.lineWidth = 1.5; x.stroke();
        txt(x, `ROUND ${Math.max(1, round)}`, 290, 23.5, 13, '#c9b6ff'); txt(x, `${pWins} – ${aWins}`, 364, 23.5, 16, '#ffd166', { w: 700 });
      }
      if (phase !== 'title' && phase !== 'over') { // battle slots
        x.setLineDash([6, 5]); x.strokeStyle = 'rgba(201,182,255,.28)'; x.lineWidth = 2;
        x.beginPath(); x.roundRect(SP - CW / 2, SY - CH / 2, CW, CH, 12); x.roundRect(SA - CW / 2, SY - CH / 2, CW, CH, 12); x.stroke(); x.setLineDash([]);
        if (!pPick || !aPick) txt(x, 'VS', 320, SY, 18, 'rgba(201,182,255,.6)', { w: 700 });
        if (phase === 'pick' && !pPick) { txt(x, 'your', SP, SY - 8, 12, 'rgba(201,182,255,.7)'); txt(x, 'card', SP, SY + 8, 12, 'rgba(201,182,255,.7)'); }
      }
      live.sort((a, b) => a.z - b.z);
      for (const c of live) {
        if (c.a < 0.02) continue;
        const i = c.owner === 'p' ? pHand.indexOf(c) : -1;
        drawCard(x, c, gt, { faceUp: c.flip, hot: c.hot, glow: c.glow, keyHint: i >= 0 && phase === 'pick' && !pPick ? String(i + 1) : '' });
      }
      thinkBubble(); if (phase !== 'over') { bubble('a'); bubble('p'); }
      if (aReady && phase === 'pick' && !pPick) txt(x, `${opp.name} is ready`, SA, SY + CH / 2 + 12, 11, '#7ad7c4');
    }
    for (const p of parts) {
      if (p.life <= 0) continue; const a = p.life / p.max; x.globalAlpha = Math.min(1, a * 1.5);
      if (p.kind === 'coin') coin(x, p.x, p.y, p.size);
      else if (p.kind === 'star') { x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.c; x.fillRect(-p.size * 1.5, -0.8, p.size * 3, 1.6); x.fillRect(-0.8, -p.size * 1.5, 1.6, p.size * 3); x.restore(); }
      else { x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, TAU); x.fill(); }
    }
    x.globalAlpha = 1;
    if (result && phase !== 'over') {
      const age = gt - result.t, sc = easeOutBack(age / 0.3), fade = age > 1.6 ? Math.max(0, 1 - (age - 1.6) / 0.4) : 1;
      if (fade > 0) { x.save(); x.globalAlpha = fade; x.translate(320, 306); x.scale(sc, sc); txt(x, result.text, 0, 0, 22, result.color, { w: 700, stroke: '#150d29', sw: 6 }); if (result.sub) txt(x, result.sub, 0, 22, 13, '#fbf6ea', { stroke: '#150d29', sw: 4 }); x.restore(); }
    }
    if (phase === 'title') titleCard();
    else if (phase === 'over') resultsCard();
    for (let i = btns.length - 1; i >= 0; i--) if (!btns[i].live) btns.splice(i, 1);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = 0; return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    step(dt); draw();
  }
  // pick the first opponent now so the title card can show them
  { const o = pool[oppIdx]; let h = 0; for (const ch of o.name) h = (h * 31 + ch.charCodeAt(0)) | 0; opp = { ...o, style: Math.abs(h) % 2 ? 'aggressive' : 'careful' }; }
  const sprites = [loadImg(me && typeof me.img === 'string' ? me.img : '').then((im) => { meImg = im; }), ...pool.map((o) => loadImg(o.src).then((im) => { o.img = im; }))];
  Promise.race([Promise.all([loadArt(), ...sprites]), new Promise((r) => setTimeout(r, 6000))]).then(() => {
    if (closed) return; opp.img = pool[oppIdx].img; phase = 'title'; say('a', 'gm', 2.5);
  });
  raf = requestAnimationFrame(loop);
  return { close };
}
