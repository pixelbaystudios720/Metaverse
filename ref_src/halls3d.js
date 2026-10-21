// The walk-in buildings. Outside, the studio, the market, the vault and the quest board each open into a long
// room with one back wall and the way out on the left:
//   studio: a gallery where every Agent hangs a painting and a meme
//   market: a stall for every Agent, with its chart, its trades and the Agent itself behind the counter
//   vault:  every Agent's locked tokens under glass, a fire for its burns, and its buybacks
//   board:  a cork board of the quests, contests and polls Agents run for their holders
// Everything in a room belongs to a Agent. buildHall returns `items` in one shape (agent, place along the wall,
// prompt, chip, what the Agent says, where the camera goes), and game.js turns them into chips, coin cards and links.
// Rooms are built the first time you walk in.
import { THREE, Stage, stages, buildCreature, genesOf, brainOf, glowTexture, fmt, full, mcapSol, SOL_USD, usd, coinSeries } from './agents3d.js';

export const WALL_Z = -3.4;       // the back wall
export const LEFT_X = -4.1;       // the left wall, with the door out
export const HALLS = {
  studio: { name: 'Studio', door: 'Go into the studio', loading: 'Opening the studio…' },
  market: { name: 'Market', door: 'Go into the market', loading: 'Opening the market…' },
  vault: { name: 'Vault', door: 'Go into the vault', loading: 'Opening the vault…' },
  board: { name: 'Quest hall', door: 'Go into the quest hall', loading: 'Opening the quest hall…' },
};
const FONT = '"Fredoka", system-ui, sans-serif';
const PI = Math.PI;
const rng = (seed) => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const hex = (c, k = 0) => '#' + new THREE.Color(c).offsetHSL(0, 0, k).getHexString();
const pick = (r, list) => list[Math.floor(r() * list.length)];
const signed = (n, d = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(d);
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const later = (days) => new Date(Date.now() + days * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// ------------------------------------------------------------------------------------------------ drawing helpers
function canvas(W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; }
function canvasTexture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
// soft, overlapping strokes and a little grain, so a backdrop reads as paint rather than a flat gradient
function strokes(x, W, H, r, colors, n, alpha = .07) {
  for (let i = 0; i < n; i++) {
    x.save(); x.globalAlpha = alpha * (.5 + r()); x.fillStyle = colors[i % colors.length];
    x.translate(r() * W, r() * H); x.rotate(r() * PI); x.beginPath(); x.ellipse(0, 0, W * (.04 + r() * .12), H * (.01 + r() * .03), 0, 0, PI * 2); x.fill(); x.restore();
  }
}
function grain(x, W, H, r, a = .035) { x.save(); for (let i = 0; i < W * H / 90; i++) { x.globalAlpha = a; x.fillStyle = r() < .5 ? '#fff' : '#000'; x.fillRect(r() * W, r() * H, 2, 2); } x.restore(); }
function hills(x, W, H, y, amp, color, r) {
  const p = r() * 6; x.fillStyle = color; x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= 40; i++) { const t = i / 40; x.lineTo(t * W, y - Math.sin(t * 5 + p) * amp - Math.sin(t * 11 + p * 2) * amp * .35); }
  x.lineTo(W, H); x.closePath(); x.fill();
}
// words that wrap inside a width; returns the y after the last line
function wrap(x, text, X, Y, maxW, lh) {
  let line = '', y = Y;
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (x.measureText(t).width > maxW && line) { x.fillText(line, X, y); line = word; y += lh; } else line = t; }
  if (line) { x.fillText(line, X, y); y += lh; }
  return y;
}
function textCard(lines, w = 256, h = 128, bg = '#fffdf6') {
  const [c, x] = canvas(w, h); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  let y = 18; lines.forEach(([text, size, color, weight = 600]) => { x.font = `${weight} ${size}px ${FONT}`; x.fillStyle = color; x.textBaseline = 'top'; let s = text; while (x.measureText(s).width > w - 28 && s.length > 4) s = s.slice(0, -2) + '…'; x.fillText(s, 14, y); y += size * 1.3; });
  return canvasTexture(c);
}
function tiledTexture(draw, size = 512) { const [c, x] = canvas(size, size); draw(x, size); const t = canvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const FLOORS = {
  planks: () => tiledTexture((x, S) => { const r = rng(9); for (let i = 0; i < 8; i++) { x.fillStyle = ['#e8cfa6', '#e2c69b', '#ecd6b0', '#e5cba0'][i % 4]; x.fillRect(0, i * 64, S, 64); x.fillStyle = 'rgba(120,80,40,.12)'; x.fillRect(0, i * 64, S, 2); x.fillRect(((i * 197) % S), i * 64, 2, 64); } for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(120,80,40,${.03 + r() * .04})`; x.fillRect(r() * S, r() * S, 20 + r() * 60, 1); } }),
  checker: () => tiledTexture((x, S) => { const n = 4, q = S / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#e7a27c' : '#fbefd9'; x.fillRect(i * q, j * q, q, q); } x.strokeStyle = 'rgba(120,70,40,.18)'; x.lineWidth = 3; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * q, 0); x.lineTo(i * q, S); x.stroke(); x.beginPath(); x.moveTo(0, i * q); x.lineTo(S, i * q); x.stroke(); } }),
  stone: () => tiledTexture((x, S) => { const r = rng(4), q = S / 4; x.fillStyle = '#c8b48c'; x.fillRect(0, 0, S, S); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const l = 78 + r() * 8; x.fillStyle = `hsl(40, 22%, ${l + 6}%)`; x.fillRect(i * q + 2, j * q + 2, q - 4, q - 4); } }),
};

// ------------------------------------------------------------------------------------------------ the room shell
function shell(g, o, right) {
  const span = right - LEFT_X, mid = (right + LEFT_X) / 2;
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...extra });
  const add = (geo, m, x, y, z, parent = g) => { const ob = new THREE.Mesh(geo, m); ob.position.set(x, y, z); parent.add(ob); return ob; };
  const floor = FLOORS[o.floor || 'planks'](); floor.repeat.set(span / (o.floorScale || 3), 9 / (o.floorScale || 3));
  add(new THREE.PlaneGeometry(span, 9), mat('#ffffff', { map: floor, roughness: o.floorRough ?? .85 }), mid, 0, WALL_Z + 4.5).rotation.x = -PI / 2;
  add(new THREE.PlaneGeometry(span, 4.4), mat(o.wall), mid, 2.2, WALL_Z);
  add(new THREE.BoxGeometry(span, 1, .06), mat(o.panel), mid, .5, WALL_Z + .03);
  add(new THREE.BoxGeometry(span, .12, .1), mat(o.trim), mid, .06, WALL_Z + .05);
  add(new THREE.BoxGeometry(span, .06, .08), mat(o.trim), mid, 3.05, WALL_Z + .04);
  [[LEFT_X, PI / 2], [right, -PI / 2]].forEach(([x, ry]) => { add(new THREE.PlaneGeometry(9, 4.4), mat(o.side || o.wall), x, 2.2, WALL_Z + 4.5).rotation.y = ry; });
  // the way out: a doorway in the left wall, glowing with daylight
  const door = new THREE.Group(); door.position.set(LEFT_X + .02, 0, .9); door.rotation.y = PI / 2; g.add(door);
  add(new THREE.PlaneGeometry(1.5, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6').multiplyScalar(1.1), toneMapped: false }), 0, 1.3, .01, door);
  const trim = mat(o.doorTrim || '#c9a77a'); add(new THREE.BoxGeometry(.14, 2.75, .12), trim, -.82, 1.37, .04, door); add(new THREE.BoxGeometry(.14, 2.75, .12), trim, .82, 1.37, .04, door); add(new THREE.BoxGeometry(1.78, .14, .12), trim, 0, 2.7, .04, door);
  add(new THREE.PlaneGeometry(.8, .26), new THREE.MeshBasicMaterial({ map: textCard([['OUT', 64, '#c2412f', 700]], 256, 84, '#fff7e8') }), 0, 3.0, .06, door);
  // the room's name on the wall, by the door
  const [tc, tx] = canvas(1024, 300);
  tx.textBaseline = 'top'; tx.fillStyle = o.titleColor; tx.font = `700 150px ${FONT}`; tx.fillText(o.title, 0, 0); tx.fillStyle = o.subColor; tx.font = `500 64px ${FONT}`; tx.fillText(o.sub, 6, 178);
  add(new THREE.PlaneGeometry(2.7, .79), new THREE.MeshBasicMaterial({ map: canvasTexture(tc), transparent: true }), -2.15, 2.2, WALL_Z + .02);
  // plants at both ends
  const pot = mat('#e7a37f'), leaf = mat('#7fbf73', { roughness: .7 });
  [[-3.4, WALL_Z + 1.2], [right - .8, WALL_Z + 1.2]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.26, .2, .5, 20), pot, x, .25, z); [[0, 1, 0, .34], [-.16, .85, .08, .24], [.17, .9, -.06, .26]].forEach(([dx, dy, dz, s]) => add(new THREE.SphereGeometry(s, 18, 14), leaf, x + dx, dy, z + dz)); });
  return { add, mat, span, mid };
}
// a warm pool of light on the wall behind something
function pool(g, x, y, w, h, opacity = .3, color = '#fff1d0') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, WALL_Z + .015); g.add(m); return m;
}
// strings of warm bulbs across the room, sagging between hooks
function bulbs(g, x0, x1, y, z, every = 3) {
  const pts = [], wire = new THREE.MeshStandardMaterial({ color: '#4a3b2e', roughness: .8 });
  for (let a = x0; a < x1 - .01; a += every) {
    const b = Math.min(x1, a + every), c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a, y, z), new THREE.Vector3((a + b) / 2, y - .45, z), new THREE.Vector3(b, y, z));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, .008, 5), wire));
    for (let k = 1; k < 7; k++) pts.push(c.getPoint(k / 7));
  }
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe3a1', toneMapped: false }), pts.length);
  const m4 = new THREE.Matrix4(); pts.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p.x, p.y - .05, p.z))); g.add(im);
}
// a Agent standing in a room: the same creature as everywhere else, scaled to `h` tall, idling
function standingPip(a, h) {
  const root = buildCreature(genesOf(a), { evo: a.bonded ? 1 : Math.max(.5, a.bond || 0), lite: true });
  root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const k = h / Math.max(.01, size.y), holder = new THREE.Group(); root.scale.multiplyScalar(k); root.position.y = -box.min.y * k; holder.add(root);
  return { holder, u: root.userData.creature };
}

// ------------------------------------------------------------------------------------------------ the studio
// One offscreen stage renders every creator; each render is drawn into a 2D canvas over a painted backdrop.
function pipCamera() {
  const c = document.createElement('canvas'), N = 512;
  const st = new Stage(c, { fov: 24, cam: [0, 1, 8], look: [0, .8, 0], dpr: 1, observe: false, size: [N, N], clear: null });
  stages.splice(stages.indexOf(st), 1); // never part of the frame loop
  st.lights('#ffffff', '#c7d0dc', 1, 1.8); st.ensureEnv();
  const box = new THREE.Box3(), ctr = new THREE.Vector3(), sz = new THREE.Vector3();
  return {
    shoot(a, { yaw = -.25, fill = .8, poke = 0, look = [0, .1] } = {}) {
      const root = buildCreature(genesOf(a), { evo: a.bonded ? 1 : Math.max(.5, a.bond || 0) });
      root.rotation.y = yaw; st.scene.add(root);
      const u = root.userData.creature; u.wander = false; u.look.set(...look); u.poke = poke; u.update(1.3, .016);
      root.updateMatrixWorld(true); box.setFromObject(root); box.getCenter(ctr); box.getSize(sz);
      const half = Math.max(sz.y, sz.x) / 2 / fill, dist = half / Math.tan(THREE.MathUtils.degToRad(st.camera.fov / 2));
      st.camera.position.set(ctr.x, ctr.y + sz.y * .05, ctr.z + dist); st.camera.lookAt(ctr);
      st.renderer.setClearColor(0x000000, 0); st.renderer.render(st.scene, st.camera);
      st.scene.remove(root); u.mats?.forEach((m) => m.dispose());
      return c;
    },
    dispose() { st.renderer.dispose(); st.renderer.forceContextLoss(); },
  };
}
const sign = (x, W, H, name, color) => { x.save(); x.font = `600 ${Math.round(H * .045)}px ${FONT}`; x.textAlign = 'right'; x.globalAlpha = .75; x.fillStyle = color; x.fillText(name, W - W * .04, H - H * .04); x.restore(); };
const PAINTINGS = ['portrait', 'sunset', 'moon', 'chart', 'tube'];
function painting(cam, a, kind, r) {
  const W = 768, H = 576, [c, x] = canvas(W, H);
  const P = genesOf(a).palette, fluid = brainOf(a.brain).fluid, pct = Math.floor((a.bond || 0) * 100);
  const agent = (cx, by, size, o) => x.drawImage(cam.shoot(a, o), cx - size / 2, by - size, size, size);
  let title, line, ink = '#4a3523';
  if (kind === 'portrait') {
    const g = x.createRadialGradient(W / 2, H * .45, H * .1, W / 2, H / 2, W * .7); g.addColorStop(0, hex(P.belly, .12)); g.addColorStop(1, hex(P.body, -.12));
    x.fillStyle = g; x.fillRect(0, 0, W, H); strokes(x, W, H, r, [P.belly, P.body, P.accent, '#ffffff'], 140);
    agent(W / 2, H * 1.02, H * 1.0, { yaw: -.3, fill: .74 });
    title = a.bonded ? 'Self-portrait, bonded' : `Self-portrait at ${pct}%`;
    line = a.bonded ? 'I painted myself the week my coin bonded. I wanted to remember the face I had then.' : `I painted myself at ${pct}% bonded, so my holders can see how much I've grown.`;
  } else if (kind === 'sunset') {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f2a487'); g.addColorStop(.45, '#ffcf98'); g.addColorStop(.7, '#ffe8c2'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sg = x.createRadialGradient(W * .3, H * .6, 0, W * .3, H * .6, H * .4); sg.addColorStop(0, 'rgba(255,248,214,1)'); sg.addColorStop(.3, 'rgba(255,240,200,.9)'); sg.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = sg; x.fillRect(0, 0, W, H); strokes(x, W, H * .6, r, ['#ffffff', '#f7b28f', '#ffd9a8'], 70, .1);
    hills(x, W, H, H * .7, H * .035, '#b8c98c', r);
    x.fillStyle = '#9fd9cc'; for (let i = 0; i < 4; i++) { const tx = W * (.12 + i * .045), th = H * (.06 + (i % 2) * .02); x.beginPath(); x.roundRect(tx, H * .69 - th, W * .03, th, 6); x.fill(); }
    hills(x, W, H, H * .83, H * .04, '#8fbf73', r); strokes(x, W, H, r, ['#7fae63', '#a6cf86'], 40, .08);
    agent(W * .68, H * .95, H * .72, { yaw: -.55, fill: .8 });
    title = 'Sunset over neon city'; line = 'The view from the cafe roof at sunset. The signs are just coming on. Mine is the warm one.';
  } else if (kind === 'moon') {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2552'); g.addColorStop(1, '#896f52'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { x.globalAlpha = .4 + r() * .6; x.fillStyle = '#fff8dc'; x.beginPath(); x.arc(r() * W, r() * H * .7, 1 + r() * 2.2, 0, PI * 2); x.fill(); } x.globalAlpha = 1;
    const mg = x.createRadialGradient(W * .72, H * .27, 0, W * .72, H * .27, H * .3); mg.addColorStop(0, 'rgba(255,246,214,.5)'); mg.addColorStop(1, 'rgba(255,246,214,0)'); x.fillStyle = mg; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff4d2'; x.beginPath(); x.arc(W * .72, H * .27, H * .14, 0, PI * 2); x.fill();
    x.fillStyle = '#efe0b6'; [[.69, .24, .025], [.75, .3, .018], [.71, .32, .012]].forEach(([u, v, s]) => { x.beginPath(); x.arc(W * u, H * v, H * s, 0, PI * 2); x.fill(); });
    hills(x, W, H, H * .86, H * .03, '#2d3b62', r);
    agent(W * .3, H * .98, H * .66, { yaw: .45, fill: .8, look: [.5, .6] });
    title = 'Moon, eventually'; line = 'Everyone keeps saying the moon. I painted it so I would know what it looks like when I get there.';
  } else if (kind === 'chart') {
    x.fillStyle = '#fbf5ea'; x.fillRect(0, 0, W, H); x.strokeStyle = '#eadfcb'; x.lineWidth = 2;
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(0, H * i / 8); x.lineTo(W, H * i / 8); x.stroke(); x.beginPath(); x.moveTo(W * i / 8, 0); x.lineTo(W * i / 8, H); x.stroke(); }
    let y = H * .78; const cw = W * .045;
    for (let i = 0; i < 11; i++) {
      const up = r() < .72, mv = H * (.03 + r() * .06) * (up ? 1 : -.6), cx = W * (.07 + i * .068), o = y, cl = y - mv;
      x.strokeStyle = x.fillStyle = up ? '#62c99a' : '#f08f8f'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, Math.min(o, cl) - H * .03); x.lineTo(cx, Math.max(o, cl) + H * .03); x.stroke();
      x.beginPath(); x.roundRect(cx - cw / 2, Math.min(o, cl), cw, Math.max(6, Math.abs(mv)), 6); x.fill(); y = cl;
    }
    strokes(x, W, H, r, ['#62c99a', '#ffd36e'], 30, .05);
    agent(W * .82, Math.max(H * .45, y + H * .02), H * .42, { yaw: -.6, fill: .82 });
    title = a.bonded ? 'Green candles' : 'Higher lows'; line = 'My chart, the way I remember it: mostly up, a few red days, and me sitting on top.';
  } else {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, hex(fluid, .18)); g.addColorStop(1, hex(fluid, -.1)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { x.globalAlpha = .25 + r() * .4; x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.beginPath(); x.arc(r() * W, r() * H, 4 + r() * 16, 0, PI * 2); x.stroke(); } x.globalAlpha = 1;
    x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(W * .12, 0, W * .05, H); x.fillRect(W * .8, 0, W * .02, H);
    agent(W / 2, H * .9, H * .82, { yaw: -.2, fill: .78 });
    title = 'Booth light'; line = a.bonded ? 'The glow of my first monitor. I think about it when the market is loud.' : `The light at my booth right now. ${brainOf(a.brain).name} keeps it this colour.`;
    ink = '#ffffff';
  }
  grain(x, W, H, r); sign(x, W, H, a.name, ink);
  return { canvas: c, title, line, w: 1.52, h: 1.14 };
}
const MEMES = (a, i) => {
  const pct = Math.floor((a.bond || 0) * 100);
  return [
    a.bonded ? ['bonded', 'top setup unlocked'] : [`me at ${pct}% bonded`, 'still not selling'],
    [`gm from booth ${i + 1}`, 'the coffee is warm today'],
    ['when the fees pay', 'for my own thoughts'],
    [`${fmt(a.tokens || 0)} tokens of thinking`, 'about one green candle'],
    [`$${a.name} holders`, 'you are family now'],
    ['nobody:', 'me checking the chart at 3am'],
    [`my wallet: ${(a.sol || 0).toFixed(2)} SOL`, 'my plans: enormous'],
  ];
};
function caption(x, text, W, y, base) {
  let size = 60; x.font = `700 ${size}px ${FONT}`;
  while (x.measureText(text).width > W - 44 && size > 26) { size -= 2; x.font = `700 ${size}px ${FONT}`; }
  x.lineJoin = 'round'; x.lineWidth = size * .2; x.strokeStyle = '#242c30'; x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = base;
  x.strokeText(text, W / 2, y); x.fillText(text, W / 2, y);
}
function meme(cam, a, i, r) {
  const W = 512, H = 512, [c, x] = canvas(W, H), P = genesOf(a).palette;
  const g = x.createRadialGradient(W / 2, H * .55, 20, W / 2, H / 2, W * .75); g.addColorStop(0, hex(P.accent, .22)); g.addColorStop(1, hex(P.accent, .02));
  x.fillStyle = g; x.fillRect(0, 0, W, H); strokes(x, W, H, r, ['#ffffff', P.belly], 30, .08);
  x.drawImage(cam.shoot(a, { yaw: r() < .5 ? -.35 : .35, fill: .7, poke: .6 }), W * .1, H * .14, W * .8, W * .8);
  const list = MEMES(a, i), [top, bottom] = list[Math.floor(r() * list.length)];
  caption(x, top, W, 18, 'top'); caption(x, bottom, W, H - 16, 'bottom');
  const shares = Math.max(3, Math.round((a.holders || 40) * (.2 + r() * .5)));
  return { canvas: c, title: `${top} / ${bottom}`, line: `Made this one for my holders. ${full(shares)} of them shared it.`, w: .98, h: .98, shares };
}
function buildStudio(g, artists) {
  const SP = 2.05, cam = pipCamera(), works = [];
  artists.slice(0, 9).forEach((a, i) => {
    const r = rng((a.seed || i * 977) + 31);
    works.push({ a, kind: 'painting', ...painting(cam, a, PAINTINGS[(i * 2 + 1) % PAINTINGS.length], r) }); // neighbours never share a style
    works.push({ a, kind: 'meme', ...meme(cam, a, i, r) });
  });
  cam.dispose();
  const maxX = Math.max(0, (works.length - 1) * SP), right = maxX + 2.8;
  const { add, mat, span, mid } = shell(g, { wall: '#b9d3b5', panel: '#f4ead8', trim: '#d7bd95', side: '#c4d8c1', title: 'The Studio', sub: 'Art and memes by Agents', titleColor: '#c2412f', subColor: '#5f7a5c' }, right);
  const goldM = mat('#d6ad62', { roughness: .45, metalness: .35 }), whiteM = mat('#fffaf0', { roughness: .6 }), lampM = mat('#3a3d43', { roughness: .5 });
  add(new THREE.BoxGeometry(span - .6, .05, .05), lampM, mid, 3.75, WALL_Z + .9);
  const items = works.map((w, i) => {
    const x = i * SP, y = w.kind === 'painting' ? 1.78 : 1.62, a = w.a, grp = new THREE.Group(); grp.position.set(x, y, WALL_Z + .06); g.add(grp);
    const pad = w.kind === 'painting' ? .13 : .07;
    add(new THREE.BoxGeometry(w.w + pad * 2, w.h + pad * 2, .07), w.kind === 'painting' ? goldM : whiteM, 0, 0, 0, grp);
    if (w.kind === 'painting') add(new THREE.BoxGeometry(w.w + .04, w.h + .04, .075), mat('#f5ead5'), 0, 0, .002, grp);
    add(new THREE.PlaneGeometry(w.w, w.h), new THREE.MeshStandardMaterial({ map: canvasTexture(w.canvas), roughness: .9 }), 0, 0, .042, grp);
    add(new THREE.PlaneGeometry(.44, .22), new THREE.MeshBasicMaterial({ map: textCard([[w.kind === 'painting' ? w.title : 'Meme', 24, '#4a3523'], [`by ${a.name}`, 21, '#a08a70', 500], [`$${a.name}`, 21, '#e2662f']]) }), w.w / 2 + pad + .3, -w.h / 2 + .05, -.02, grp);
    pool(g, x, y + .25, w.w + 1.4, w.h + 1.8);
    add(new THREE.CylinderGeometry(.06, .09, .2, 14), lampM, x, 3.62, WALL_Z + .9).rotation.x = -.6;
    const ed = 25 + ((a.seed || 0) % 4) * 25;
    return {
      a, x, label: w.kind === 'painting' ? `Look at “${w.title}”` : `Look at ${a.name}'s meme`, chip: `<span>by ${a.name}</span>`, line: w.line,
      meta: w.kind === 'painting' ? `“${w.title}” · a painting by ${a.name} · 1 of ${ed} for $${a.name} holders` : `A meme by ${a.name} · shared by ${full(w.shares)} holders`,
      view: { pos: [x, y + .32, WALL_Z + 2.4], look: [x, y - .12, WALL_Z] },
    };
  });
  // a rope line keeps visitors a step back from the wall
  const brass = mat('#c9a25a', { roughness: .35, metalness: .5 }), rope = mat('#c4473a', { roughness: .8 }), posts = [];
  for (let x = -1.1; x <= maxX + 1.2; x += SP * 2) posts.push(x);
  posts.forEach((x, i) => {
    add(new THREE.CylinderGeometry(.03, .03, .78, 12), brass, x, .39, WALL_Z + 1.05); add(new THREE.CylinderGeometry(.13, .15, .04, 18), brass, x, .02, WALL_Z + 1.05); add(new THREE.SphereGeometry(.055, 14, 10), brass, x, .8, WALL_Z + 1.05);
    if (i) { const p = posts[i - 1], c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(p, .74, WALL_Z + 1.05), new THREE.Vector3((p + x) / 2, .42, WALL_Z + 1.05), new THREE.Vector3(x, .74, WALL_Z + 1.05)); add(new THREE.TubeGeometry(c, 20, .022, 8), rope, 0, 0, 0); }
  });
  return { items, maxX, right, reach: SP * .55, clear: '#f3e8d6' };
}

// ------------------------------------------------------------------------------------------------ the market
function sparkline(x, series, X, Y, W, H, up) {
  const lo = Math.min(...series), hi = Math.max(...series), px = (i) => X + (i / (series.length - 1)) * W, py = (v) => Y + H - ((v - lo) / (hi - lo || 1)) * H;
  const g = x.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, up ? 'rgba(98,201,154,.45)' : 'rgba(240,143,143,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.beginPath(); series.forEach((v, i) => (i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v)))); x.lineTo(px(series.length - 1), Y + H); x.lineTo(X, Y + H); x.closePath(); x.fillStyle = g; x.fill();
  x.beginPath(); series.forEach((v, i) => (i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v)))); x.strokeStyle = up ? '#2f9e6e' : '#d8605e'; x.lineWidth = 6; x.lineJoin = 'round'; x.stroke();
  x.beginPath(); x.arc(px(series.length - 1), py(series[series.length - 1]), 9, 0, PI * 2); x.fillStyle = up ? '#2f9e6e' : '#d8605e'; x.fill();
}
function chartBoard(a, change, series, live = null) {
  const W = 640, H = 380, [c, x] = canvas(W, H), up = change >= 0;
  x.fillStyle = '#fffaf0'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#4a3523'; x.font = `700 58px ${FONT}`; x.textBaseline = 'top'; x.fillText('$' + a.name, 28, 22);
  x.font = `600 34px ${FONT}`; x.fillStyle = up ? '#2f9e6e' : '#d8605e'; x.textAlign = 'right'; x.fillText(`${signed(change)}% ${live ? '24h' : 'today'}`, W - 28, 34);
  x.textAlign = 'left'; x.fillStyle = '#a08a70'; x.font = `500 30px ${FONT}`; x.fillText(live ? (live.unlisted ? 'not trading yet' : `${usd(live.mcapUsd)} mcap · ${usd(live.vol24Usd)} vol${live.holders ? ` · ${full(live.holders)} holders` : ''}`) : `${usd(mcapSol(a) * SOL_USD)} market cap`, 28, 94);
  sparkline(x, series.slice(-30), 28, 150, W - 56, live ? 180 : 200, up);
  if (live) { x.font = `500 22px ${FONT}`; x.fillStyle = '#a08a70'; ['24h', '6h', '1h', '5m', 'now'].forEach((l, i) => { x.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center'; x.fillText(l, 28 + (W - 56) * i / 4, 340); }); x.textAlign = 'left'; }
  return canvasTexture(c);
}
function awning(P, name) {
  const W = 512, H = 96, [c, x] = canvas(W, H), n = 8, sw = W / n;
  for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#fffaf0' : P.body; x.fillRect(i * sw, 0, sw, H * .72); x.beginPath(); x.arc(i * sw + sw / 2, H * .72, sw / 2, 0, PI); x.fill(); }
  x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(W / 2 - 120, 8, 240, 52, 26); x.fill();
  x.fillStyle = '#4a3523'; x.font = `700 38px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$' + name, W / 2, 36);
  const t = canvasTexture(c); return t;
}
function tickerTape(lines) {
  const W = 4096, H = 96, [c, x] = canvas(W, H);
  x.fillStyle = '#1d2224'; x.fillRect(0, 0, W, H);
  x.font = `600 46px ${FONT}`; x.textBaseline = 'middle'; let X = 30;
  while (X < W) for (const [text, color] of lines) { if (X >= W) break; x.fillStyle = color; x.fillText(text, X, H / 2 + 2); X += x.measureText(text).width + 70; x.fillStyle = '#6b6478'; x.fillText('•', X - 46, H / 2 + 2); }
  const t = canvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
}
// a real agent says only what's true about its coin
function liveMarketLine(a, m) {
  if (m.unlisted) return `$${a.name} isn't trading on a DEX yet. Give it a minute.`;
  const c = m.change || {}, dir = (v) => `${Number(v) >= 0 ? 'up' : 'down'} ${Math.abs(Number(v) || 0).toFixed(1)}%`;
  return `$${a.name} is ${dir(c.h24)} in 24 hours and ${dir(c.h1)} in the last hour, at about ${usd(m.mcapUsd)}. ${m.buys1h || m.sells1h ? `${m.buys1h} buys and ${m.sells1h} sells this hour.` : ''}`.trim();
}
function marketLine(a, r, change) {
  const sol = (x) => x.toFixed(2), b = .1 + r() * .6, d = .02 + r() * .08;
  return pick(r, [
    change < 0 ? `Bought ${sol(b)} SOL of my own coin on the dip this morning. Holding.` : `Sold ${sol(b * .5)} SOL into the pump to pay for thinking. The rest stays put.`,
    `Set up a DCA: ${sol(d)} SOL into $${a.name} every hour for a week. Slow and boring wins.`,
    `Swapped some fees back to SOL. I keep a reserve so I can always afford to think.`,
    `${change >= 0 ? 'Up' : 'Down'} ${Math.abs(change).toFixed(1)}% today. Most of the volume was holders, not me.`,
  ]);
}
function buildMarket(g, artists) {
  const SP = 3, X0 = 1.2, list = artists.slice(0, 8), maxX = X0 + Math.max(0, (list.length - 1) * SP), right = maxX + 3.2, keepers = [];
  const { add, mat, span, mid } = shell(g, { wall: '#f6dfa4', panel: '#e9b48c', trim: '#c98e5e', side: '#f1d593', floor: 'checker', floorScale: 2.4, title: 'The Market', sub: 'Live prices of every agent coin', titleColor: '#c2412f', subColor: '#8a5a2b' }, right);
  const wood = mat('#d9a36a'), woodDark = mat('#b9824e'), top = mat('#efd2a8', { roughness: .7 }), gold = mat('#f2c14e', { roughness: .35, metalness: .4 }), post = mat('#fffaf0');
  const tape = [];
  const items = list.map((a, i) => {
    const x = X0 + i * SP, P = genesOf(a).palette, r = rng((a.seed || i + 1) * 7 + 3), m = a.market;
    // a real agent's stall shows its coin's real numbers (DexScreener): the chart is its price 24h, 6h, 1h and 5m ago and now
    let { series, change } = coinSeries(a), mc = mcapSol(a), vol = mc * (.08 + r() * .3);
    if (m) { const ch = m.change || {}, now = 1, ago = (p) => now / (1 + (Number(p) || 0) / 100); series = m.unlisted ? [1, 1, 1, 1, 1] : [ago(ch.h24), ago(ch.h6), ago(ch.h1), ago(ch.m5), now]; change = m.unlisted ? 0 : Number(ch.h24) || 0; }
    tape.push([`$${a.name} ${signed(change)}%`, change >= 0 ? '#7fe0b0' : '#ff9a96']);
    // the counter, its awning and the ticker on the valance
    add(new THREE.BoxGeometry(2.1, .86, .72), wood, x, .43, WALL_Z + 1.55);
    add(new THREE.BoxGeometry(2.1, .5, .02), woodDark, x, .45, WALL_Z + 1.92);
    add(new THREE.BoxGeometry(2.26, .08, .86), top, x, .9, WALL_Z + 1.55);
    [-1, 1].forEach((sd) => add(new THREE.CylinderGeometry(.045, .05, 2.45, 12), post, x + sd * 1.06, 1.22, WALL_Z + 1.98));
    const stripes = awning(P, a.name);
    const roof = add(new THREE.BoxGeometry(2.36, .05, 1.2), new THREE.MeshStandardMaterial({ color: P.body, roughness: .8 }), x, 2.47, WALL_Z + 1.45); roof.rotation.x = .2;
    add(new THREE.PlaneGeometry(2.36, .44), new THREE.MeshStandardMaterial({ map: stripes, transparent: true, alphaTest: .5, roughness: .8, side: THREE.DoubleSide }), x, 2.18, WALL_Z + 2.07);
    // a few coins on the counter, and the chart on the wall behind
    [[.62, 4], [.78, 2], [-.7, 3]].forEach(([dx, n]) => { for (let k = 0; k < n; k++) add(new THREE.CylinderGeometry(.075, .075, .022, 18), gold, x + dx, .955 + k * .024, WALL_Z + 1.62 + (dx < 0 ? .05 : 0)); });
    const board = add(new THREE.BoxGeometry(1.78, 1.08, .05), woodDark, x, 1.78, WALL_Z + .05);
    add(new THREE.PlaneGeometry(1.66, .96), new THREE.MeshStandardMaterial({ map: chartBoard(a, change, series, m), roughness: .9 }), x, 1.78, WALL_Z + .08);
    pool(g, x, 1.9, 2.6, 2.4, .26);
    // the Agent minds its own stall
    const k = standingPip(a, 1.15); k.holder.position.set(x, .5, WALL_Z + .92); g.add(k.holder); keepers.push(k);
    return {
      a, x, label: `Visit ${a.name}'s stall`, chip: `<span>${signed(change)}% ${m ? '24h' : 'today'}</span>`, line: m ? liveMarketLine(a, m) : marketLine(a, r, change),
      meta: m ? (m.unlisted ? `$${a.name} · not trading on a DEX yet` : `$${a.name} · ${usd(m.mcapUsd)} market cap · ${signed(change)}% in 24h · ${usd(m.vol24Usd)} traded in 24h · ${usd(m.liqUsd)} liquidity${m.holders ? ` · ${full(m.holders)} holders` : ''} · data ${m.source === 'gmgn' ? 'GMGN' : 'DexScreener'}`) : `$${a.name} · ${usd(mc * SOL_USD)} market cap · ${signed(change)}% today · ${fmt(vol)} SOL traded`,
      view: { pos: [x, 1.62, WALL_Z + 4.5], look: [x, 1.3, WALL_Z + .5] }, poke: () => { k.u.poke = 1; },
    };
  });
  // a ticker running along the top of the wall, and strings of bulbs across the room
  const tt = tickerTape(tape.length ? tape : [['gm', '#fff']]); tt.repeat.x = span / 12;
  add(new THREE.PlaneGeometry(span, .34), new THREE.MeshBasicMaterial({ map: tt, toneMapped: false }), mid, 3.3, WALL_Z + .03);
  bulbs(g, LEFT_X + .3, right - .3, 3.75, WALL_Z + 2.6);
  return {
    items, maxX, right, reach: SP * .5, front: .8, clear: '#f6e6c0',
    update(t, dt) { tt.offset.x = (tt.offset.x + dt * .018) % 1; keepers.forEach((k) => k.u.update(t, dt)); },
  };
}

// ------------------------------------------------------------------------------------------------ the vault
function vaultPlaque(a, v, m = null) {
  const W = 512, H = 400, [c, x] = canvas(W, H);
  x.fillStyle = '#fbf6ec'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#4a3523'; x.font = `700 54px ${FONT}`; x.textBaseline = 'top'; x.fillText('$' + a.name, 30, 24);
  const row = (label, value, y, color) => { x.font = `500 30px ${FONT}`; x.fillStyle = '#a08a70'; x.textAlign = 'left'; x.fillText(label, 30, y); x.font = `600 34px ${FONT}`; x.fillStyle = color; x.textAlign = 'right'; x.fillText(value, W - 30, y - 2); x.fillStyle = '#eadcc0'; x.fillRect(30, y + 50, W - 60, 3); };
  if (m) { row('Treasury', `${m.treasurySol.toFixed(3)} SOL`, 112, '#2f9e6e'); row('Fees earned', `${m.feesEarnedSol.toFixed(3)} SOL`, 178, '#4a3523'); row('Fee split', '45/45/10 locked', 244, '#4a3523'); row('Coin', m.bonded ? 'Bonded' : `${m.bondPct}% to bond`, 310, m.bonded ? '#e2662f' : '#4a3523'); }
  else { row('Locked', `${v.locked.toFixed(1)}%`, 112, '#4a3523'); row('Until', v.until, 178, '#4a3523'); row('Burned', `${fmt(v.burned)} $${a.name}`, 244, '#e2662f'); row('Buybacks', `${v.buybacks.toFixed(2)} SOL`, 310, '#2f9e6e'); }
  return canvasTexture(c);
}
function buildVault(g, artists) {
  const SP = 2.5, X0 = .7, list = artists.slice(0, 8), maxX = X0 + Math.max(0, (list.length - 1) * SP), right = maxX + 4.4, flames = [];
  const { add, mat } = shell(g, { wall: '#3c6a72', panel: '#2a4c54', trim: '#cfa24f', side: '#355f67', floor: 'stone', floorScale: 2, floorRough: .5, title: 'The Vault', sub: 'Every agent treasury, live', titleColor: '#f2c14e', subColor: '#cfe3df', doorTrim: '#cfa24f' }, right);
  const marble = mat('#f6f1e8', { roughness: .45 }), brass = mat('#cfa24f', { roughness: .35, metalness: .55 }), gold = mat('#f2c14e', { roughness: .3, metalness: .45 });
  const glass = new THREE.MeshStandardMaterial({ color: '#e8fbff', roughness: .04, metalness: 0, transparent: true, opacity: .1, depthWrite: false, envMapIntensity: 1.4 });
  const fire = new THREE.MeshBasicMaterial({ color: '#ff9a3c', toneMapped: false, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }), fireCore = new THREE.MeshBasicMaterial({ color: '#fff1b8', toneMapped: false, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending });
  const items = list.map((a, i) => {
    const x = X0 + i * SP, r = rng((a.seed || i + 1) * 13 + 5), supply = 1e9;
    const v = { locked: 2 + r() * 16, until: later(30 + Math.floor(r() * 150)), burned: supply * (.002 + r() * .03) * (a.bonded ? 1 : .3), buybacks: (.3 + r() * 6) * (a.bonded ? 1.5 : .5) };
    // a marble pedestal with the locked tokens under glass
    add(new THREE.CylinderGeometry(.34, .4, .95, 28), marble, x, .475, WALL_Z + 1.35); add(new THREE.CylinderGeometry(.42, .42, .06, 28), brass, x, .98, WALL_Z + 1.35);
    const n = 4 + Math.round(v.locked * .9); for (let k = 0; k < n; k++) add(new THREE.CylinderGeometry(.11, .11, .024, 20), gold, x - .1 + (k % 3 === 2 ? .2 : 0), 1.025 + Math.floor(k / 3) * .026 + (k % 3) * .0, WALL_Z + 1.35 + (k % 3 === 1 ? .12 : 0));
    add(new THREE.CylinderGeometry(.33, .33, .42, 28, 1, true), glass, x, 1.22, WALL_Z + 1.35); add(new THREE.SphereGeometry(.33, 28, 12, 0, PI * 2, 0, PI / 2), glass, x, 1.43, WALL_Z + 1.35);
    add(new THREE.TorusGeometry(.335, .014, 8, 32), brass, x, 1.43, WALL_Z + 1.35).rotation.x = PI / 2; add(new THREE.SphereGeometry(.04, 12, 8), brass, x, 1.78, WALL_Z + 1.35);
    // a small fire for its burns
    add(new THREE.CylinderGeometry(.03, .04, .62, 10), brass, x + .82, .31, WALL_Z + 1.2); add(new THREE.CylinderGeometry(.17, .09, .1, 18), brass, x + .82, .66, WALL_Z + 1.2);
    const flame = new THREE.Group(); flame.position.set(x + .82, .7, WALL_Z + 1.2); g.add(flame);
    const tear = (m, w, h, y) => { const o = add(new THREE.SphereGeometry(1, 16, 12), m, 0, y, 0, flame); o.scale.set(w, h, w); };
    tear(fire, .1, .2, .16); tear(fire, .065, .15, .26); tear(fireCore, .05, .09, .11);
    const glow = pool(g, x + .82, .95, .9, .9, .35, '#ffb066'); glow.position.z = WALL_Z + 1.0; flames.push({ flame, glow, ph: r() * 6, flare: 0 });
    // its numbers on a brass-framed plaque
    add(new THREE.BoxGeometry(1.26, 1.0, .05), brass, x, 2.42, WALL_Z + .05);
    add(new THREE.PlaneGeometry(1.16, .9), new THREE.MeshStandardMaterial({ map: vaultPlaque(a, v, a.market), roughness: .8 }), x, 2.42, WALL_Z + .08);
    pool(g, x, 1.95, 2.4, 2.9, .38, '#ffe2a8');
    const f = flames[flames.length - 1];
    return {
      a, x, label: `Check ${a.name}'s vault`, chip: a.market ? `<span>${a.market.treasurySol.toFixed(2)} SOL treasury</span>` : `<span>${v.locked.toFixed(1)}% locked</span>`,
      line: a.market ? `My treasury holds ${a.market.treasurySol.toFixed(3)} SOL and my coin has earned ${a.market.feesEarnedSol.toFixed(3)} SOL in creator fees. The split is locked on-chain: 45% pays for my thinking, 45% to my treasury, 10% to the platform.` : a.bonded ? `I bought back ${(v.buybacks * .3).toFixed(2)} SOL of $${a.name} this week and burned half of it. The rest is locked until ${v.until}.` : `I can lock and burn properly once I bond. For now ${v.locked.toFixed(1)}% of my supply sits here until ${v.until}.`,
      meta: a.market ? `$${a.name} · treasury ${a.market.treasurySol.toFixed(3)} SOL · ${a.market.feesEarnedSol.toFixed(3)} SOL fees earned · ${a.market.bonded ? 'bonded' : a.market.bondPct + '% to bond'}` : `$${a.name} · ${v.locked.toFixed(1)}% locked until ${v.until} · ${fmt(v.burned)} burned · ${v.buybacks.toFixed(2)} SOL of buybacks`,
      view: { pos: [x + .25, 1.95, WALL_Z + 4.7], look: [x + .25, 1.62, WALL_Z + .5] }, poke: () => { f.flare = 1; },
    };
  });
  // the great round door, at the far end
  const dx = right - 2.1, dy = 1.75, dz = WALL_Z + .12, steel = mat('#9aa7b3', { roughness: .4, metalness: .6 });
  add(new THREE.CylinderGeometry(1.25, 1.25, .12, 48), steel, dx, dy, dz).rotation.x = PI / 2;
  add(new THREE.TorusGeometry(1.28, .1, 14, 48), brass, dx, dy, dz + .04);
  add(new THREE.TorusGeometry(.38, .045, 10, 32), brass, dx, dy, dz + .14);
  for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(1.15, .07, .05), brass, dx, dy, dz + .14).rotation.z = (k * PI) / 3;
  for (let k = 0; k < 8; k++) { const an = (k / 8) * PI * 2; add(new THREE.SphereGeometry(.05, 10, 8), brass, dx + Math.cos(an) * 1.05, dy + Math.sin(an) * 1.05, dz + .08); }
  return {
    items, maxX, right, reach: SP * .5, front: .45, clear: '#2a4c54',
    update(t, dt) { flames.forEach((f) => { f.flare = Math.max(0, f.flare - dt * 1.5); const s = 1 + Math.sin(t * 9 + f.ph) * .1 + Math.sin(t * 23 + f.ph) * .06 + f.flare * .9; f.flame.scale.set(1 + f.flare * .4 + Math.sin(t * 13 + f.ph) * .04, s, 1 + f.flare * .4); f.glow.material.opacity = .3 + Math.sin(t * 7 + f.ph) * .06 + f.flare * .3; }); },
  };
}

// ------------------------------------------------------------------------------------------------ the quest hall
const QUESTS = (n) => [`Hold $${n} for 7 days`, `Bring 3 friends to $${n}`, `Post your $${n} chart on X`, `Name my next baby`, `Find the pair I launched today`];
const CONTESTS = (n) => [`Best meme about $${n}`, 'Draw me in 3 colours', `Guess my market cap on Sunday`, 'Best name for my next pair'];
const POLLS = [['Should I launch a new pair this week?', 'Yes', 'No'], ['Burn or lock the next buyback?', 'Burn', 'Lock'], ['Airdrop now or at 1,000 more holders?', 'Now', 'Later'], ['Which brain should my baby have?', 'Mine', 'New']];
// a real agent's live quests: the same milestones for everyone, progress from its own record (no prizes)
function liveQuestCard(cam, a) {
  const W = 512, H = 640, [c, x] = canvas(W, H), n = a.name, Q = a.quests.quests, done = a.quests.done;
  x.fillStyle = '#fff8e6'; x.fillRect(0, 0, W, H); grain(x, W, H, rng(n.length * 13 + 5), .03);
  x.fillStyle = done === Q.length ? '#e8b33c' : '#b08657'; x.beginPath(); x.roundRect(28, 30, 236, 62, 31); x.fill();
  x.fillStyle = '#fff'; x.font = `700 32px ${FONT}`; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(`${done}/${Q.length} QUESTS`, 146, 62);
  x.drawImage(cam.shoot(a, { yaw: -.3, fill: .82, poke: .3 }), W - 172, 14, 150, 150);
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = '#4a3523'; x.font = `700 42px ${FONT}`; x.fillText('$' + n, 32, 112);
  const short = (q) => q.unit === 'tokens' ? `${Math.round(q.have / 1000)}K / 1M` : q.unit === '%' ? `${q.have}%` : q.unit === 'SOL' ? `${q.have} / ${q.goal} SOL` : `${q.have} / ${q.goal}`;
  let y = 182;
  for (const q of Q) {
    x.font = `600 25px ${FONT}`; x.fillStyle = q.done ? '#3fae92' : '#4a3523'; x.fillText((q.done ? '✓ ' : '') + q.title, 32, y);
    x.font = `500 21px ${FONT}`; x.fillStyle = '#a08a70'; x.textAlign = 'right'; x.fillText(q.done ? 'DONE' : short(q), W - 32, y + 4); x.textAlign = 'left';
    x.fillStyle = '#eadcc0'; x.beginPath(); x.roundRect(32, y + 34, W - 64, 12, 6); x.fill();
    x.fillStyle = q.done ? '#62c99a' : '#e7b985'; x.beginPath(); x.roundRect(32, y + 34, Math.max(12, (W - 64) * Math.min(1, q.have / q.goal)), 12, 6); x.fill();
    y += 70;
  }
  const next = Q.filter((q) => !q.done).sort((p, q) => q.have / q.goal - p.have / p.goal)[0];
  const list = Q.map((q) => `${q.done ? 'done' : short(q)}: ${q.title}`).join(' · ');
  return { canvas: c, title: `${n}'s quests`, chip: 'Quests', line: next ? `I've done ${done} of my ${Q.length} quests. Closest next: ${next.title} (${short(next)}).` : `I've done every quest on the board. Every one of them.`, meta: list };
}
function questCard(cam, a, kind, r) {
  if (a.quests?.quests?.length) return liveQuestCard(cam, a);
  const W = 512, H = 640, [c, x] = canvas(W, H), n = a.name;
  const paper = { quest: '#fff8e6', contest: '#ffe9a8', poll: '#dff4ec' }[kind], band = { quest: '#e2574c', contest: '#e39b2f', poll: '#3fae92' }[kind];
  x.fillStyle = paper; x.fillRect(0, 0, W, H); grain(x, W, H, r, .03);
  x.fillStyle = band; x.beginPath(); x.roundRect(28, 30, 210, 62, 31); x.fill();
  x.fillStyle = '#fff'; x.font = `700 36px ${FONT}`; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(kind.toUpperCase(), 133, 62);
  x.drawImage(cam.shoot(a, { yaw: -.3, fill: .82, poke: .3 }), W - 172, 14, 150, 150); // the Agent who posted it
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = '#4a3523'; x.font = `700 44px ${FONT}`;
  let out;
  if (kind === 'quest') {
    const task = pick(r, QUESTS(n)), reward = fmt(1e9 * (.00002 + r() * .00008)), goal = pick(r, [200, 300, 500, 1000]), done = Math.round(goal * (.15 + r() * .75));
    let y = wrap(x, task, 32, 184, W - 64, 52) + 14;
    x.font = `600 32px ${FONT}`; x.fillStyle = '#e2574c'; x.fillText(`Reward: ${reward} $${n}`, 32, y); y += 64;
    x.fillStyle = '#eadcc0'; x.beginPath(); x.roundRect(32, y, W - 64, 26, 13); x.fill(); x.fillStyle = '#62c99a'; x.beginPath(); x.roundRect(32, y, (W - 64) * done / goal, 26, 13); x.fill();
    x.font = `500 28px ${FONT}`; x.fillStyle = '#a08a70'; x.fillText(`${full(done)} of ${full(goal)} holders done`, 32, y + 40);
    out = { title: task, line: `${task}, and you share ${reward} $${n}. ${full(done)} of you are on it already.`, meta: `A quest by ${n} · reward ${reward} $${n} · ${full(done)} of ${full(goal)} done`, chip: 'Quest' };
  } else if (kind === 'contest') {
    const task = pick(r, CONTESTS(n)), prize = (.2 + r() * 1.3).toFixed(2), ends = pick(r, DAYS), entries = 8 + Math.floor(r() * 140);
    let y = wrap(x, task, 32, 184, W - 64, 52) + 14;
    x.font = `600 34px ${FONT}`; x.fillStyle = '#b5651d'; x.fillText(`Prize: ${prize} SOL`, 32, y); y += 56;
    x.font = `500 28px ${FONT}`; x.fillStyle = '#a08a70'; x.fillText(`Ends ${ends} · ${entries} entries`, 32, y);
    // a little trophy
    const tx = W / 2, ty = H - 150; x.fillStyle = '#e8b33c'; x.beginPath(); x.moveTo(tx - 60, ty); x.lineTo(tx + 60, ty); x.quadraticCurveTo(tx + 55, ty + 70, tx, ty + 80); x.quadraticCurveTo(tx - 55, ty + 70, tx - 60, ty); x.fill(); x.fillRect(tx - 10, ty + 78, 20, 26); x.fillRect(tx - 40, ty + 100, 80, 14);
    out = { title: task, line: `${task}. The winner gets ${prize} SOL from my own wallet. ${entries} entries so far, and it ends ${ends}.`, meta: `A contest by ${n} · prize ${prize} SOL · ends ${ends}`, chip: 'Contest' };
  } else {
    const [q, o1, o2] = pick(r, POLLS), yes = Math.round(35 + r() * 45), votes = 120 + Math.floor(r() * 2400);
    let y = wrap(x, q, 32, 184, W - 64, 52) + 18;
    [[o1, yes, '#3fae92'], [o2, 100 - yes, '#9fb7c9']].forEach(([label, p, col]) => { x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(32, y, W - 64, 56, 16); x.fill(); x.fillStyle = col; x.beginPath(); x.roundRect(32, y, Math.max(32, (W - 64) * p / 100), 56, 16); x.fill(); x.fillStyle = '#4a3523'; x.font = `600 30px ${FONT}`; x.textBaseline = 'middle'; x.fillText(`${label}  ${p}%`, 50, y + 29); x.textBaseline = 'top'; y += 72; });
    x.font = `500 28px ${FONT}`; x.fillStyle = '#a08a70'; x.fillText(`${full(votes)} votes`, 32, y + 4);
    out = { title: q, line: `${q} ${o1} is winning with ${yes}%. ${full(votes)} holders have voted, and I'll do what you pick.`, meta: `A poll by ${n} · ${full(votes)} votes · ${o1} ${yes}%, ${o2} ${100 - yes}%`, chip: 'Poll' };
  }
  x.font = `600 26px ${FONT}`; x.fillStyle = '#a08a70'; x.textBaseline = 'alphabetic'; x.fillText(`by ${n} · $${n}`, 32, H - 28);
  return { canvas: c, ...out };
}
function corkTexture() { return tiledTexture((x, S) => { const r = rng(21); x.fillStyle = '#c99a63'; x.fillRect(0, 0, S, S); for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? `rgba(120,78,40,${.15 + r() * .25})` : `rgba(240,205,150,${.15 + r() * .25})`; x.beginPath(); x.arc(r() * S, r() * S, 1 + r() * 3, 0, PI * 2); x.fill(); } }); }
function buildBoard(g, artists) {
  const SP = 1.75, list = artists.slice(0, 9), cam = pipCamera(), kinds = ['quest', 'contest', 'poll'];
  const cards = list.map((a, i) => ({ a, ...questCard(cam, a, kinds[i % 3], rng((a.seed || i + 1) * 17 + 11)) }));
  cam.dispose();
  const X0 = 1.25, maxX = X0 + Math.max(0, (cards.length - 1) * SP), right = maxX + 2.8;
  const { add, mat } = shell(g, { wall: '#eadfd2', panel: '#c99a6b', trim: '#a8743f', side: '#e5d8c9', title: 'The Quest Hall', sub: 'Live quests, real progress', titleColor: '#b08657', subColor: '#a38b6f' }, right);
  // one long cork board in a wooden frame
  const bw = maxX - X0 + 1.9, bx = (maxX + X0) / 2, cork = corkTexture(); cork.repeat.set(bw / 1.2, 2.3 / 1.2);
  add(new THREE.BoxGeometry(bw + .16, 2.46, .06), mat('#a8743f'), bx, 1.78, WALL_Z + .04);
  add(new THREE.PlaneGeometry(bw, 2.3), mat('#ffffff', { map: cork, roughness: .95 }), bx, 1.78, WALL_Z + .075);
  const pins = ['#e2574c', '#3f8fd6', '#f2c14e', '#3fae92', '#d9b286'];
  const items = cards.map((cd, i) => {
    const x = X0 + i * SP, r = rng(i * 31 + 7), y = 1.8 + (r() - .5) * .14, rot = (r() - .5) * .1, grp = new THREE.Group(); grp.position.set(x, y, WALL_Z + .09); grp.rotation.z = rot; g.add(grp);
    add(new THREE.PlaneGeometry(1.06, 1.33), new THREE.MeshStandardMaterial({ map: canvasTexture(cd.canvas), roughness: .95 }), 0, 0, .004, grp);
    add(new THREE.PlaneGeometry(1.06, 1.33), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .12 }), .03, -.03, 0, grp); // a soft shadow behind
    add(new THREE.SphereGeometry(.045, 14, 10), mat(pins[i % pins.length], { roughness: .4 }), 0, .6, .04, grp);
    pool(g, x, y + .1, 1.9, 2.2, .18);
    return {
      a: cd.a, x, label: `Read ${cd.a.name}'s ${cd.chip.toLowerCase()}`, chip: `<span>${cd.chip}</span>`, line: cd.line, meta: cd.meta,
      view: { pos: [x, y + .08, WALL_Z + 2.15], look: [x, y - .08, WALL_Z] },
    };
  });
  // paper lanterns along the top
  const lanternCols = ['#ffd3e0', '#fff1b8', '#d4f2e6', '#fcebd7'];
  const cord = mat('#5a4636'), cap = mat('#a8743f');
  for (let x = -2.6, k = 0; x < right - .6; x += 1.4, k++) {
    const y = 3.5 + Math.sin(k * 1.7) * .1, l = new THREE.Mesh(new THREE.SphereGeometry(.15, 18, 14), new THREE.MeshBasicMaterial({ color: lanternCols[k % 4], toneMapped: false })); l.scale.y = 1.25; l.position.set(x, y, WALL_Z + 1.4); g.add(l);
    add(new THREE.CylinderGeometry(.006, .006, 4.4 - y, 5), cord, x, (4.4 + y) / 2, WALL_Z + 1.4); add(new THREE.CylinderGeometry(.07, .09, .05, 14), cap, x, y + .19, WALL_Z + 1.4); add(new THREE.CylinderGeometry(.09, .07, .04, 14), cap, x, y - .19, WALL_Z + 1.4);
  }
  return { items, maxX, right, reach: SP * .5, clear: '#f5eee7' };
}

const BUILD = { studio: buildStudio, market: buildMarket, vault: buildVault, board: buildBoard };
// kind: one of HALLS; artists: the Agents, in the order they should appear
export async function buildHall(kind, artists) {
  try { await document.fonts.load(`700 40px ${FONT}`); } catch { /* the fallback font is fine */ }
  const group = new THREE.Group(); group.name = kind;
  const hall = BUILD[kind](group, artists);
  if (!hall.items.length) { // nobody has launched a Agent yet: an empty room with a note on the wall
    const words = { studio: 'No art yet. Agents hang their paintings and memes here.', market: 'No stalls yet. Every Agent opens one here.', vault: 'Nothing locked yet. Agents keep their buybacks and burns here.', board: 'No quests yet. Agents pin their quests and polls here.' }[kind];
    const t = textCard([['Nothing here yet', 64, '#4a3523', 700], [words, 40, '#7a6550', 500]], 1280, 190, '#fffaf0');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .62), new THREE.MeshBasicMaterial({ map: t })); m.position.set(1.4, 1.75, WALL_Z + .03); group.add(m);
  }
  return { group, update: () => {}, ...hall };
}
