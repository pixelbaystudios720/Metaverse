// Sky Obby (id: obby): a bright toy-block obstacle course floating in the sky, in its own three.js scene. Ten stages:
// stepping stones, a lava run, sliding platforms, a sweeper bar, vanishing tiles, bounce pads, thin beams, a conveyor
// with lava rails, a spiral tower and the trophy. Touch lava or fall off and you pop back to your last checkpoint.
// Six agents run the course beside you (they hop, sometimes miss and respawn too). Real players in the "obby" room
// are shown on the course: the server only relays x/z/heading and a small jump offset, so their height comes from the
// course itself (the path never crosses over itself). Fastest finish goes to the leaderboard at /api/obby.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2, FONT = 'Fredoka, system-ui, sans-serif';
const GRAV = 34, JUMP_V = 12, RUN = 8, R = .36, HGT = 1.7;
const BLOCK = ['#ff8fb8', '#ffd166', '#7fd6a0', '#8cc8ff', '#c9a6ff', '#ffb38a', '#7fd6d6'];
const NAMES = ['MOCHI', 'PIXEL', 'BLIP', 'ZORP', 'NOODLE', 'TOFU', 'BOBA', 'FIZZ', 'KIWI', 'PUDDING', 'SPROUT', 'JELLY', 'WAFFLE', 'COMET'];
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#b8e07a' }, { name: 'ANSEM', color: '#ffd166' }];
const STAGES = ['Stepping Stones', 'Lava Run', 'Slide Ride', 'The Sweeper', 'Blink Tiles', 'Bounce House', 'Tightrope', 'Conveyor', 'Spiral Tower', 'Trophy'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hexOk = (h) => typeof h === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.trim());
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = (s) => `${Math.floor(Math.max(0, s) / 60)}:${(Math.max(0, s) % 60).toFixed(2).padStart(5, '0')}`;

// the course: a list of parts, each a box { x, y (top), z, w, d, h, kind }, laid out by a cursor that walks +z and
// climbs. kinds: solid, kill (lava), bounce, fade, move, conv, check. Spinners are separate sweeping bars.
function buildCourse() {
  const P = [], S = [], C = [];
  let x = 0, y = 0, z = 0, ci = 0;
  const col = () => BLOCK[(P.length * 3 + 1) % BLOCK.length];
  const add = (o) => { const p = { h: 1, kind: 'solid', color: col(), ...o }; p.x0 = p.x; p.y0 = p.y; p.z0 = p.z; P.push(p); return p; };
  const check = (w = 7, d = 6) => { const p = add({ x, y, z: z + d / 2, w, d, kind: 'check', color: '#ffffff', ci: C.length }); C.push({ x, y, z: z + d / 2, i: C.length, p }); z += d; return p; };
  // start pad
  add({ x: 0, y: 0, z: -4, w: 10, d: 10, color: '#ffffff' }); C.push({ x: 0, y: 0, z: -4, i: 0, start: true }); z = 1;
  // 1 stepping stones
  for (let i = 0; i < 6; i++) { z += 2.6 + (i % 3) * .4; x = Math.sin(i * 1.3) * 2.2; y += i % 2 ? .5 : 0; add({ x, y, z, w: 2, d: 2 }); z += 1; }
  x = 0; z += 2.5; check();
  // 2 lava run: a lava sheet below with islands; lava strips across a walkway
  const l0 = z + 1; add({ x: 0, y: y - 1.2, z: l0 + 12, w: 12, d: 24, h: .4, kind: 'kill' });
  for (let i = 0; i < 6; i++) { add({ x: (i % 2 ? 2.4 : -2.4), y, z: l0 + 2 + i * 3.8, w: 2.4, d: 2.4 }); }
  z = l0 + 24; add({ x: 0, y, z: z + 3, w: 3, d: 6 }); add({ x: 0, y: y + .06, z: z + 3, w: 3, d: .8, h: .2, kind: 'kill' }); z += 6.5; check();
  // 3 slide ride: platforms that slide side to side
  for (let i = 0; i < 4; i++) { z += 4.2; add({ x: 0, y, z, w: 3, d: 3, kind: 'move', ax: 'x', amp: 3.5, spd: .9 + i * .15, ph: i * 1.7 }); }
  z += 4.5; check();
  // 4 the sweeper: a wide disc with a spinning bar you must jump
  z += 2; const sc = z + 6; add({ x: 0, y, z: sc, w: 12, d: 12, color: '#8cc8ff' }); S.push({ x: 0, y, z: sc, len: 5.8, spd: 1.6, a: 0 }); z = sc + 6; check();
  // 5 blink tiles: a 3-wide path that vanishes after you touch it
  for (let i = 0; i < 6; i++) { z += 2.3; for (let k = -1; k <= 1; k++) if ((i + k + 3) % 3 !== 0 || k === 0) add({ x: k * 2.3, y, z, w: 2.1, d: 2.1, kind: 'fade', color: '#c9a6ff' }); }
  z += 3; check();
  // 6 bounce house: pads launch you up to ledges
  for (let i = 0; i < 3; i++) { z += 3.6; add({ x: 0, y, z, w: 2.4, d: 2.4, kind: 'bounce', color: '#ff6b81' }); z += 3.4; y += 4.5; add({ x: 0, y, z: z + 1.5, w: 4, d: 3 }); z += 3; }
  z += 1; check();
  // 7 tightrope: thin beams that zigzag
  let bx = 0; for (let i = 0; i < 5; i++) { const nx = i % 2 ? -2.5 : 2.5; const len = 5.5; add({ x: (bx + nx) / 2, y, z: z + len / 2, w: Math.abs(nx - bx) + .7, d: .7 }); z += len; add({ x: nx, y, z, w: 1.6, d: 1.6 }); bx = nx; }
  add({ x: bx / 2, y, z: z + 2, w: Math.abs(bx) + 1.6, d: 1.6 }); z += 3.5; x = 0; check();
  // 8 conveyor: a walkway pushing you back, lava rails on the sides
  add({ x: 0, y, z: z + 9, w: 3.2, d: 18, kind: 'conv', cv: -3.6, color: '#7a8796' });
  add({ x: -2.1, y: y + .2, z: z + 9, w: 1, d: 18, h: .5, kind: 'kill' }); add({ x: 2.1, y: y + .2, z: z + 9, w: 1, d: 18, h: .5, kind: 'kill' });
  for (let i = 0; i < 3; i++) add({ x: (i % 2 ? .8 : -.8), y: y + .25, z: z + 4 + i * 5, w: 1.4, d: .5, h: .5, kind: 'kill' });
  z += 18.5; check();
  // 9 spiral tower: a floor round a pole, then one turn of blocks climbing it. The turn ends on the far (+z) side so
  // the way out runs straight on over open air: nothing ever hangs over a step you jump from
  z += 1.5; const tz = z + 6.5, tx = 0, ty = y;
  add({ x: tx, y: ty, z: tz, w: 12, d: 13, noBot: true, color: '#e8eef5' });
  add({ x: tx, y: ty + 6, z: tz, w: 1.6, d: 1.6, h: 6, noStand: true, color: '#d9e3ee' });
  const STEP = TAU * .9 / 10, A0 = Math.PI / 2 - 9 * STEP;
  for (let i = 0; i < 10; i++) { const a = A0 + i * STEP; y = ty + 1.25 * (i + 1); add({ x: tx + Math.cos(a) * 4.4, y, z: tz + Math.sin(a) * 4.4, w: 1.9, d: 1.9 }); }
  const lz = tz + 4.4; z = lz + 5; add({ x: 0, y, z: (lz + z) / 2, w: 1.8, d: z - lz + 1 }); x = 0; check();
  // 10 trophy island
  const fin = add({ x: 0, y, z: z + 5, w: 10, d: 10, color: '#ffd166', fin: true }); z += 10;
  return { P, S, C, fin };
}

export function open({ me = {}, agents = [], onClose = () => {}, _test = null } = {}) {
  if (!me || typeof me !== 'object') me = {};
  const tst = _test && typeof _test === 'object' ? _test : null;
  const myName = String(me.name || 'You').slice(0, 16);
  const mobile = (matchMedia?.('(pointer: coarse)').matches) || innerWidth < 720;
  let closed = false, raf = 0;

  // ---------------------------------------------------------------- the page
  const css = document.createElement('style');
  css.textContent = `
.ob{position:fixed;inset:0;z-index:9000;background:#bfe6ff;font-family:${FONT};color:#2c3a4a;user-select:none;-webkit-user-select:none}
.ob canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.ob .card{background:rgba(255,255,255,.92);border-radius:18px;box-shadow:0 8px 24px rgba(60,90,130,.18)}
.ob-top{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center;padding:8px 16px;font-weight:700;font-size:16px;white-space:nowrap}
.ob-top b{font-size:22px;font-variant-numeric:tabular-nums;color:#3d7fb0}.ob-top em{font-style:normal;color:#e0469a}
.ob-x{position:absolute;top:12px;right:12px;border:0;width:40px;height:40px;border-radius:50%;font:700 18px ${FONT};color:#3b4a5c;cursor:pointer}
.ob-stage{position:absolute;top:66px;left:50%;transform:translateX(-50%);font-weight:700;font-size:14px;color:#55697c;padding:4px 12px}
.ob-bar{position:absolute;left:12px;top:12px;width:210px;padding:10px 12px;font-size:13px}.ob-bar .hd{font-weight:700;margin-bottom:6px}
.ob-bar .row{display:flex;justify-content:space-between;padding:2px 0}.ob-bar .row.me{color:#e0469a;font-weight:700}
.ob-big{position:absolute;top:34%;left:50%;transform:translate(-50%,-50%);font-size:44px;font-weight:700;color:#fff;text-shadow:0 4px 0 rgba(40,60,90,.35),0 10px 24px rgba(40,60,90,.3);pointer-events:none;opacity:0;transition:opacity .25s;text-align:center;white-space:nowrap}
.ob-big small{display:block;font-size:20px}
.ob-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-size:13px;font-weight:600;color:#55697c;padding:6px 14px;white-space:nowrap}
.ob-modal{position:absolute;inset:0;display:grid;place-items:center;background:rgba(190,225,250,.55)}
.ob-modal .card{padding:26px 30px;text-align:center;max-width:420px;width:calc(100% - 32px)}
.ob-modal h1{margin:0 0 4px;font-size:40px}.ob-modal p{margin:6px 0;color:#55697c}
.ob-modal .num{font-size:52px;font-weight:700;color:#3d7fb0;font-variant-numeric:tabular-nums}
.ob-modal button{border:0;border-radius:999px;padding:12px 26px;margin:12px 5px 0;font:700 17px ${FONT};cursor:pointer;background:#6cc7a8;color:#fff}.ob-modal button.alt{background:#eef3f8;color:#3b4a5c}
.ob-top10{margin:10px 0 0;padding:0;list-style:none;text-align:left;font-size:14px}.ob-top10 li{display:flex;gap:8px;padding:3px 0;border-top:1px solid #eef1f4}.ob-top10 span{width:20px;color:#9aa8b6}.ob-top10 b{flex:1}.ob-top10 em{font-style:normal;font-variant-numeric:tabular-nums}
.ob-touch{position:absolute;inset:0;pointer-events:none;display:none}.ob.touch .ob-touch{display:block}.ob.touch .ob-hint,.ob.touch .ob-bar{display:none}
.ob-joy{position:absolute;left:22px;bottom:40px;width:124px;height:124px;border-radius:50%;background:rgba(255,255,255,.45);box-shadow:0 0 0 2px rgba(255,255,255,.85) inset;pointer-events:auto;touch-action:none}
.ob-joy i{position:absolute;left:37px;top:37px;width:50px;height:50px;border-radius:50%;background:#fff;box-shadow:0 4px 10px rgba(60,90,130,.25)}
.ob-jb{position:absolute;right:26px;bottom:52px;width:84px;height:84px;border-radius:50%;border:0;background:rgba(255,255,255,.9);font:700 16px ${FONT};color:#3b4a5c;pointer-events:auto;touch-action:none;box-shadow:0 6px 16px rgba(60,90,130,.25)}
.ob.touch .ob-top{font-size:13px;padding:6px 12px}.ob.touch .ob-top b{font-size:17px}`;
  document.head.appendChild(css);
  const wrap = document.createElement('div'); wrap.className = 'ob'; if (mobile) wrap.classList.add('touch');
  wrap.innerHTML = `<canvas></canvas>
<div class="ob-top card"><span>Stage <em class="st">1</em>/10</span><b class="tm">0:00.00</b><span class="dd">0 falls</span></div>
<div class="ob-stage card">Stepping Stones</div>
<div class="ob-bar card"><div class="hd">Race</div><div class="rows"></div></div>
<button class="ob-x card" title="Leave (Esc)">✕</button>
<div class="ob-big"></div>
<div class="ob-hint card">WASD move · Space jump · drag to look · R back to checkpoint · Esc leave</div>
<div class="ob-touch"><div class="ob-joy"><i></i></div><button class="ob-jb">JUMP</button></div>
<div class="ob-modal"><div class="card"><h1>Sky Obby</h1><p>Ten stages in the clouds. Don't touch the lava, don't fall, beat the agents to the trophy.</p><div class="ob-topcard"></div><button class="go">Play</button><button class="alt bye">Leave</button></div></div>`;
  document.body.appendChild(wrap);
  const $ = (s) => wrap.querySelector(s);
  const cv = $('canvas'), bigEl = $('.ob-big'), modal = $('.ob-modal'), modalCard = modal.querySelector('.card');

  // ---------------------------------------------------------------- three
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.environment = envTex; scene.environmentIntensity = .55;
  const camera = new THREE.PerspectiveCamera(62, 1, .1, 900);
  // sky gradient
  { const c = document.createElement('canvas'); c.width = 2; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#7cc4f5'); g.addColorStop(.55, '#bfe6ff'); g.addColorStop(1, '#fff3e6'); x.fillStyle = g; x.fillRect(0, 0, 2, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
  scene.fog = new THREE.Fog('#d6eefc', 90, 320);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9d4e8', 1.1));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.1); sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  const disposables = [];
  const track = (d) => { disposables.push(d); return d; };
  const mats = new Map();
  const plastic = (c) => { if (!mats.has(c)) mats.set(c, track(new THREE.MeshStandardMaterial({ color: c, roughness: .42, metalness: 0 }))); return mats.get(c); };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tagTex = (text, color) => canvasTex(512, 112, (x, w) => {
    x.font = `700 46px ${FONT}`; const tw = Math.min(w - 20, x.measureText(text).width + 56);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect((w - tw) / 2, 14, tw, 80, 40); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc((w - tw) / 2 + 30, 54, 11, 0, TAU); x.fill();
    x.fillStyle = '#2c3a4a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2 + 10, 56, tw - 60);
  });
  const lavaTex = canvasTex(128, 128, (x) => { x.fillStyle = '#ff5a3c'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? 'rgba(255,210,80,.55)' : 'rgba(255,130,60,.6)'; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 10, 0, TAU); x.fill(); } });
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  const lavaMat = track(new THREE.MeshStandardMaterial({ map: lavaTex, emissive: '#ff4020', emissiveIntensity: .55, roughness: .6 }));
  const convTex = canvasTex(64, 128, (x) => { x.fillStyle = '#5d6a78'; x.fillRect(0, 0, 64, 128); x.fillStyle = '#ffd166'; for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(8, 50 + i * 64); x.lineTo(32, 18 + i * 64); x.lineTo(56, 50 + i * 64); x.lineTo(46, 50 + i * 64); x.lineTo(32, 34 + i * 64); x.lineTo(18, 50 + i * 64); x.fill(); } });
  convTex.wrapS = convTex.wrapT = THREE.RepeatWrapping;
  const checkTex = canvasTex(256, 256, (x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#e8f3fb'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32); });

  // ---------------------------------------------------------------- the course
  const { P: parts, S: spinners, C: checks, fin } = buildCourse();
  const geoCache = new Map();
  const boxGeo = (w, h, d) => { const k = `${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}`; if (!geoCache.has(k)) geoCache.set(k, track(new RoundedBoxGeometry(w, h, d, 2, Math.min(.18, w * .2, h * .3, d * .2)))); return geoCache.get(k); };
  for (const p of parts) {
    let m;
    if (p.kind === 'kill') { const t = lavaTex.clone(); t.repeat.set(p.w / 3, p.d / 3); t.needsUpdate = true; track(t); const mm = track(lavaMat.clone()); mm.map = t; m = new THREE.Mesh(boxGeo(p.w, p.h, p.d), mm); p.tex = t; }
    else if (p.kind === 'conv') { const t = convTex.clone(); t.repeat.set(1, p.d / 2.4); t.needsUpdate = true; track(t); m = new THREE.Mesh(boxGeo(p.w, p.h, p.d), track(new THREE.MeshStandardMaterial({ map: t, roughness: .5 }))); p.tex = t; }
    else if (p.kind === 'check') { const t = checkTex.clone(); t.repeat.set(p.w / 4, p.d / 4); t.needsUpdate = true; track(t); m = new THREE.Mesh(boxGeo(p.w, p.h, p.d), track(new THREE.MeshStandardMaterial({ map: t, roughness: .4 }))); }
    else if (p.kind === 'fade') { m = new THREE.Mesh(boxGeo(p.w, p.h, p.d), track(new THREE.MeshStandardMaterial({ color: p.color, roughness: .35, transparent: true }))); }
    else m = new THREE.Mesh(boxGeo(p.w, p.h, p.d), plastic(p.color));
    m.position.set(p.x, p.y - p.h / 2, p.z); m.castShadow = p.kind !== 'kill'; m.receiveShadow = true; scene.add(m); p.mesh = m;
    if (p.kind === 'bounce') { const pad = new THREE.Mesh(track(new THREE.CylinderGeometry(p.w * .38, p.w * .42, .22, 24)), plastic('#ffffff')); pad.position.set(p.x, p.y + .1, p.z); scene.add(pad); p.pad = pad; }
    p.fadeT = 0; p.gone = 0;
  }
  // checkpoint flags
  for (const c of checks) { if (c.start) continue; const g = new THREE.Group(); const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(.06, .06, 2.6, 8)), plastic('#e8eef5')); pole.position.y = 1.3; g.add(pole);
    const flag = new THREE.Mesh(track(new THREE.PlaneGeometry(1.1, .7)), track(new THREE.MeshStandardMaterial({ color: '#b9c6d3', side: THREE.DoubleSide }))); flag.position.set(.56, 2.2, 0); g.add(flag); c.flag = flag;
    g.position.set(c.x + 2.6, c.y, c.z); scene.add(g); }
  // spinners
  for (const s of spinners) { const g = new THREE.Group(); const hub = new THREE.Mesh(track(new THREE.CylinderGeometry(.6, .7, 1.1, 20)), plastic('#ff6b81')); hub.position.y = .55; hub.castShadow = true; g.add(hub);
    const bar = new THREE.Mesh(boxGeo(s.len * 2, .45, .45), plastic('#ff6b81')); bar.position.y = .55; bar.castShadow = true; g.add(bar); g.position.set(s.x, s.y, s.z); scene.add(g); s.g = g; }
  // trophy
  const trophy = new THREE.Group(); { const gold = track(new THREE.MeshStandardMaterial({ color: '#ffcf4a', metalness: .6, roughness: .25 }));
    const cup = new THREE.Mesh(track(new THREE.CylinderGeometry(.9, .45, 1.3, 28, 1, true)), gold); cup.position.y = 2.2; cup.material.side = THREE.DoubleSide;
    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(.16, .2, .9, 12)), gold); stem.position.y = 1.15;
    const base = new THREE.Mesh(boxGeo(1.3, .5, 1.3), plastic('#ffffff')); base.position.y = .25;
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(track(new THREE.TorusGeometry(.38, .09, 8, 20, Math.PI)), gold); h.position.set(sx * .95, 2.3, 0); h.rotation.z = -sx * Math.PI / 2; trophy.add(h); }
    trophy.add(cup, stem, base); trophy.traverse((o) => { if (o.isMesh) o.castShadow = true; }); trophy.position.set(fin.x, fin.y, fin.z + 2.5); scene.add(trophy); }
  // clouds, far below and around
  const cloudMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 })), cloudGeo = track(new THREE.SphereGeometry(1, 16, 12));
  const courseLen = fin.z + 10;
  for (let i = 0; i < 46; i++) { const g = new THREE.Group(); const n = 3 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(cloudGeo, cloudMat); s.scale.set(rnd(3, 6), rnd(2, 3.4), rnd(3, 5)); s.position.set(k * rnd(3, 5) - n * 2, rnd(-.5, 1), rnd(-2, 2)); g.add(s); }
    const side = Math.random() < .5 ? -1 : 1, below = Math.random() < .55;
    g.position.set(below ? rnd(-40, 40) : side * rnd(30, 90), below ? rnd(-34, -18) : rnd(-10, 40), rnd(-30, courseLen + 30)); g.scale.setScalar(rnd(.8, 1.6)); scene.add(g); }
  // distant floating islands for depth
  for (let i = 0; i < 8; i++) { const g = new THREE.Group(); const top = new THREE.Mesh(track(new THREE.CylinderGeometry(6, 6, 2, 10)), plastic('#9ad48a')); const rock = new THREE.Mesh(track(new THREE.ConeGeometry(5.8, 9, 10)), plastic('#c9a27a')); rock.rotation.x = Math.PI; rock.position.y = -5.5; g.add(top, rock);
    const side = i % 2 ? -1 : 1; g.position.set(side * rnd(70, 130), rnd(-6, 30), rnd(0, courseLen)); g.scale.setScalar(rnd(.8, 1.8)); scene.add(g); }

  // ---------------------------------------------------------------- characters
  function makeBlob(color) {
    const root = new THREE.Group(); const b = new THREE.Mesh(track(new THREE.SphereGeometry(.55, 20, 14)), plastic(color)); b.position.y = .55; b.castShadow = true; root.add(b);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(track(new THREE.SphereGeometry(.1, 8, 6)), plastic('#2a1c2e')); e.position.set(sx * .18, .68, .5); root.add(e); }
    const u = { H: 1.15, walk: 0, walkPhase: 0, update() { b.position.y = .55 + Math.abs(Math.sin(u.walkPhase)) * .12 * u.walk; } };
    return { root, u };
  }
  const meCol = hexOk(me.color) ? me.color : '#8f7cf2';
  const pl = { x: 0, y: 0, z: -4, vx: 0, vy: 0, vz: 0, h: 0, onGround: true, ground: null, coyote: 0, jumpBuf: 0, stun: 0, ci: 0, holder: new THREE.Group(), u: null };
  scene.add(pl.holder);
  { const b = makeBlob(meCol); pl.holder.add(b.root); pl.body = b.root; pl.u = b.u; }
  const roster = (agents.length ? agents : FALLBACK).slice(0, 6).map((a) => ({ name: String(a.name || pick(NAMES)).slice(0, 14).toUpperCase(), color: hexOk(a.color) ? a.color : pick(BLOCK), genes: a.genes }));
  while (roster.length < 6) { const n = pick(NAMES); if (!roster.some((r) => r.name === n)) roster.push({ name: n, color: BLOCK[roster.length % BLOCK.length] }); }
  // a bot's route: the standable parts in course order (by z), with checkpoints marked
  const route = parts.filter((p) => p.kind !== 'kill' && !p.noStand && !p.noBot && !(p.kind === 'fade' && Math.abs(p.x0) > .1)).map((p) => p);
  const spiralSorted = (() => { const r = []; let last = null; for (const p of route) { if (last && p === last) continue; r.push(p); last = p; } return r; })();
  // order: keep the course's build order (buildCourse adds in walking order) but drop lava rails and the pole
  const bots = roster.map((a, i) => ({ ...a, i, k: 0, t: 0, dur: 0, from: null, to: null, x: (i - 2.5) * 1.3, y: 0, z: -6, h: 0, skill: rnd(.82, 1.05), state: 'wait', finished: 0, ci: 0, holder: new THREE.Group(), u: null, falls: 0 }));
  for (const b of bots) { const v = makeBlob(b.color); b.holder.add(v.root); b.body = v.root; b.u = v.u; scene.add(b.holder);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(b.name, b.color), transparent: true, depthWrite: false })); track(tag.material); tag.scale.set(2.3, .5, 1); tag.position.y = 2; b.holder.add(tag); b.tag = tag; }
  // swap the blobs for real models once they load
  (async () => {
    let A = null, Pm = null;
    try { [A, Pm] = await Promise.all([import('../agents3d.js').catch(() => null), import('../person3d.js').catch(() => null)]); } catch {}
    if (closed) return;
    try { if (Pm?.buildPerson) { const root = Pm.buildPerson(me.look || Pm.DEFAULT_LOOK); root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); pl.holder.remove(pl.body); pl.holder.add(root); pl.body = root; pl.u = root.userData.creature; } } catch (e) { console.warn('obby: person fallback', e); }
    for (const b of bots) {
      try { if (!A?.buildCreature) break; const genes = b.genes || A.makeGenes(hashStr(b.name) % 100000); const root = A.buildCreature(genes, { evo: 1 }); root.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(root), hgt = root.userData.creature?.H || Math.max(.3, bb.max.y - bb.min.y); root.scale.multiplyScalar(1.4 / hgt); root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        b.holder.remove(b.body); b.holder.add(root); b.body = root; b.u = root.userData.creature; } catch (e) { console.warn('obby: creature fallback', e); break; }
    }
    if (tst) tst.ready = true;
  })();

  // ---------------------------------------------------------------- sound (tiny synth)
  let ac = null; const tone = (f, d = .12, type = 'sine', v = .12, slide = 0) => { try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d); } catch {} };
  const sfx = { jump: () => tone(520, .12, 'triangle', .08, 300), bounce: () => tone(300, .35, 'sine', .14, 700), die: () => tone(400, .4, 'square', .06, -300), check: () => { tone(660, .12, 'triangle', .1); setTimeout(() => tone(990, .2, 'triangle', .1), 110); }, win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .3, 'triangle', .12), i * 140)) };

  // ---------------------------------------------------------------- particles
  const sparks = [];
  const sparkGeo = track(new THREE.BoxGeometry(.16, .16, .16));
  function burst(x, y, z, n = 14, cols = BLOCK) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sparkGeo, plastic(pick(cols))); m.position.set(x, y, z); scene.add(m); sparks.push({ m, vx: rnd(-4, 4), vy: rnd(3, 8), vz: rnd(-4, 4), t: rnd(.7, 1.2) }); } }
  function stepSparks(dt) { for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.vy -= 18 * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.m.rotation.x += dt * 6; s.m.scale.setScalar(Math.max(.01, s.t)); if (s.t <= 0) { scene.remove(s.m); sparks.splice(i, 1); } } }

  // ---------------------------------------------------------------- input
  const keys = {}; let camYaw = Math.PI, camPitch = .38, camDist = 7.5, drag = null;
  const onKey = (e) => {
    const down = e.type === 'keydown', k = e.key.toLowerCase();
    if (down && k === 'escape') { e.preventDefault(); close(); return; }
    if (state !== 'play') { if (down && (k === ' ' || k === 'enter') && state !== 'play') { e.preventDefault(); start(); } return; }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    keys[k] = down; if (down && k === ' ') pl.jumpBuf = .14; if (down && k === 'r') die(true);
    e.stopPropagation();
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const onBlur = () => { for (const k in keys) keys[k] = false; };
  addEventListener('blur', onBlur);
  cv.addEventListener('pointerdown', (e) => { if (e.target !== cv) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture?.(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; camYaw -= (e.clientX - drag.x) * .006; camPitch = clamp(camPitch + (e.clientY - drag.y) * .004, -.1, 1.2); drag.x = e.clientX; drag.y = e.clientY; });
  const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag = null; cv.style.cursor = 'grab'; } };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); camDist = clamp(camDist + e.deltaY * .01, 4, 14); }, { passive: false });
  // touch: joystick + jump
  const joy = { x: 0, y: 0, id: null }; const joyEl = $('.ob-joy'), knob = joyEl.querySelector('i');
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(); let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2); const L = Math.hypot(dx, dy); if (L > 1) { dx /= L; dy /= L; } joy.x = dx; joy.y = dy; knob.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  $('.ob-jb').addEventListener('pointerdown', (e) => { e.preventDefault(); pl.jumpBuf = .14; });
  $('.ob-x').addEventListener('click', () => close());
  modal.querySelector('.go').addEventListener('click', () => start());
  modal.querySelector('.bye').addEventListener('click', () => close());
  const onResize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  addEventListener('resize', onResize); onResize();

  // ---------------------------------------------------------------- the run
  let state = 'menu', T = 0, runT = 0, falls = 0, place = 0, finishT = 0, timeScale = 1;
  let best = 0; try { best = +localStorage.getItem('aa.obby.best') || 0; } catch {}
  const big = (t, s = '', ms = 1400) => { bigEl.innerHTML = `${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}`; bigEl.style.opacity = 1; clearTimeout(big.t); big.t = setTimeout(() => { bigEl.style.opacity = 0; }, ms); };
  function start() {
    if (state === 'play') return;
    modal.style.display = 'none'; state = 'play'; runT = 0; falls = 0; place = 0; finishT = 0; posted = false;
    pl.ci = 0; spawnAt(checks[0]);
    for (const c of checks) if (c.flag) c.flag.material.color.set('#b9c6d3');
    for (const p of parts) { p.fadeT = 0; p.gone = 0; }
    bots.forEach((b, i) => { b.k = 0; b.ci = 0; b.state = 'wait'; b.t = -rnd(.2, 1.2); b.finished = 0; b.x = checks[0].x + (i - 2.5) * 1.3; b.z = checks[0].z - 2.5; b.y = 0; b.falls = 0; b.from = null; });
    big('GO!', STAGES[0], 900); camYaw = Math.PI;
  }
  function spawnAt(c) { pl.x = c.x; pl.y = c.y + .02; pl.z = c.z - (c.start ? 0 : 1.5); pl.vx = pl.vy = pl.vz = 0; pl.ground = null; pl.onGround = false; pl.stun = 0; }
  function die(manual = false) { if (state !== 'play') return; if (!manual) { falls++; sfx.die(); burst(pl.x, pl.y + .8, pl.z, 12, ['#ffffff', '#ffd166']); } spawnAt(checks[pl.ci]); }
  function reachCheck(ci) {
    if (ci <= pl.ci) return; pl.ci = ci; const c = checks[ci]; if (c.flag) c.flag.material.color.set('#6cc7a8'); sfx.check(); burst(c.x, c.y + 1, c.z, 16);
    big(`Stage ${ci + 1}`, STAGES[ci] || '', 1200);
  }
  function finish() {
    state = 'won'; finishT = runT; place = 1 + bots.filter((b) => b.finished).length; sfx.win();
    for (let k = 0; k < 6; k++) setTimeout(() => { if (!closed) burst(fin.x + rnd(-3, 3), fin.y + 2 + rnd(0, 3), fin.z + rnd(-3, 3), 20); }, k * 220);
    const nb = !best || finishT < best; if (nb) { best = finishT; try { localStorage.setItem('aa.obby.best', String(best)); } catch {} }
    postScore();
    setTimeout(() => { if (closed) return; modalCard.innerHTML = `<h1>${place === 1 ? 'You won!' : `#${place} place`}</h1><div class="num">${fmtT(finishT)}</div><p>${falls} fall${falls === 1 ? '' : 's'}${nb ? ' · new best!' : ` · best ${fmtT(best)}`}</p><div class="ob-topcard"><div class="hd" style="font-weight:700;margin-top:10px">Fastest runs</div>${topHtml()}</div><button class="go">Run again</button><button class="alt bye">Leave</button>`;
      modalCard.querySelector('.go').addEventListener('click', () => { state = 'menu'; start(); }); modalCard.querySelector('.bye').addEventListener('click', () => close()); modal.style.display = 'grid'; state = 'done'; }, 2200);
  }

  // ---------------------------------------------------------------- physics
  const top = (p) => p.y, inBox = (p, x, y, z, pad = 0) => x + R > p.x - p.w / 2 - pad && x - R < p.x + p.w / 2 + pad && z + R > p.z - p.d / 2 - pad && z - R < p.z + p.d / 2 + pad && y < p.y + pad && y + HGT > p.y - p.h - pad;
  const solidOn = (p) => p.kind !== 'kill' && !(p.kind === 'fade' && p.gone > 0);
  function stepParts(dt) {
    for (const p of parts) {
      if (p.kind === 'move') { const nx = p.x0 + Math.sin(T * p.spd + p.ph) * p.amp; p.dx = nx - p.x; p.x = nx; p.mesh.position.x = p.x; }
      if (p.kind === 'fade') {
        if (p.gone > 0) { p.gone -= dt; if (p.gone <= 0) { p.fadeT = 0; p.mesh.visible = true; p.mesh.material.opacity = 1; } }
        else if (p.fadeT > 0) { p.fadeT += dt; p.mesh.material.opacity = 1 - clamp((p.fadeT - .35) / .35, 0, .85); p.mesh.position.y = p.y - p.h / 2 + Math.sin(p.fadeT * 60) * .03; if (p.fadeT > .7) { p.gone = 2.2; p.mesh.visible = false; } }
      }
      if (p.tex && p.kind === 'kill') p.tex.offset.x = (T * .05) % 1;
      if (p.tex && p.kind === 'conv') p.tex.offset.y = (-T * p.cv / 2.4) % 1;
    }
    for (const s of spinners) { s.a += s.spd * dt; s.g.rotation.y = s.a; }
    trophy.rotation.y = T * .8; trophy.position.y = fin.y + Math.sin(T * 2) * .12;
  }
  function stepPlayer(dt) {
    // carry with the platform we stand on
    if (pl.onGround && pl.ground) { if (pl.ground.kind === 'move') pl.x += pl.ground.dx || 0; if (pl.ground.kind === 'conv') pl.z += pl.ground.cv * dt; if (pl.ground.kind === 'fade' && pl.ground.fadeT === 0 && pl.ground.gone <= 0) pl.ground.fadeT = .001; }
    // input → wanted velocity (camera relative)
    let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iz = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
    const L = Math.hypot(ix, iz); if (L > 1) { ix /= L; iz /= L; }
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = -fz, rz = fx;
    const wx = (fx * iz + rx * ix) * RUN, wz = (fz * iz + rz * ix) * RUN;
    const acc = pl.stun > 0 ? 0 : pl.onGround ? 14 : 6, k = 1 - Math.exp(-acc * dt);
    pl.vx += (wx - pl.vx) * k; pl.vz += (wz - pl.vz) * k; pl.stun = Math.max(0, pl.stun - dt);
    if (Math.hypot(wx, wz) > .5) { const th = Math.atan2(wx, wz); let d = th - pl.h; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; pl.h += d * Math.min(1, dt * 14); }
    // jump
    pl.jumpBuf -= dt; pl.coyote = pl.onGround ? .1 : pl.coyote - dt;
    if (pl.jumpBuf > 0 && pl.coyote > 0) { pl.vy = JUMP_V; pl.jumpBuf = 0; pl.coyote = 0; pl.onGround = false; pl.ground = null; sfx.jump(); }
    pl.vy -= GRAV * dt; if (pl.vy < -40) pl.vy = -40;
    // move x, then z, then y
    const solids = parts.filter((p) => solidOn(p) && Math.abs(p.z - pl.z) < p.d / 2 + 4 && Math.abs(p.x - pl.x) < p.w / 2 + 4);
    pl.x += pl.vx * dt; for (const p of solids) if (inBox(p, pl.x, pl.y, pl.z)) { if (p.y - pl.y < .4 && p.y - pl.y > 0 && !p.noStand) { pl.y = p.y; continue; } pl.x = pl.vx > 0 ? p.x - p.w / 2 - R - .001 : p.x + p.w / 2 + R + .001; pl.vx = 0; }
    pl.z += pl.vz * dt; for (const p of solids) if (inBox(p, pl.x, pl.y, pl.z)) { if (p.y - pl.y < .4 && p.y - pl.y > 0 && !p.noStand) { pl.y = p.y; continue; } pl.z = pl.vz > 0 ? p.z - p.d / 2 - R - .001 : p.z + p.d / 2 + R + .001; pl.vz = 0; }
    const wasGround = pl.onGround; pl.onGround = false; pl.ground = null;
    pl.y += pl.vy * dt; for (const p of solids) if (inBox(p, pl.x, pl.y, pl.z)) {
      if (pl.vy <= 0 && pl.y > p.y - .6) { pl.y = p.y; pl.vy = 0; pl.onGround = true; pl.ground = p; }
      else if (pl.vy > 0) { pl.y = p.y - p.h - HGT - .001; pl.vy = 0; }
    }
    if (pl.onGround && pl.ground?.kind === 'bounce') { pl.vy = 21; pl.onGround = false; sfx.bounce(); burst(pl.x, pl.y, pl.z, 6, ['#ffffff', '#ff8fb8']); }
    if (pl.onGround && !wasGround && pl.u) pl.u.land = 1;
    if (pl.onGround && pl.ground?.kind === 'check') reachCheck(pl.ground.ci);
    if (pl.onGround && pl.ground?.fin && state === 'play') finish();
    // lava, sweepers, falling
    for (const p of parts) if (p.kind === 'kill' && Math.abs(p.z - pl.z) < p.d / 2 + 1 && inBox(p, pl.x, pl.y, pl.z, .02)) { die(); return; }
    for (const s of spinners) { if (pl.y > s.y + 1.05 || pl.y + HGT < s.y + .3) continue; const dx = pl.x - s.x, dz = pl.z - s.z, r = Math.hypot(dx, dz); if (r > s.len + R) continue;
      const bx = Math.cos(-s.a), bz = Math.sin(-s.a), along = dx * bx + dz * bz, perp = Math.abs(dx * -bz + dz * bx);
      if (perp < .25 + R && Math.abs(along) < s.len) { const sg = Math.sign(along) || 1; pl.vx = -bz * s.spd * Math.abs(along) * 3.2 * sg + dx / (r || 1) * 4; pl.vz = bx * s.spd * Math.abs(along) * 3.2 * sg + dz / (r || 1) * 4; pl.vy = 8; pl.stun = .5; pl.onGround = false; tone(200, .15, 'square', .06); } }
    if (pl.y < checks[pl.ci].y - 16) die();
  }
  // ---------------------------------------------------------------- the agents
  const nextStand = (b) => spiralSorted[b.k];
  function stepBots(dt) {
    for (const b of bots) {
      if (b.state === 'done') { b.y = fin.y; b.h += dt * 2; continue; }
      b.t += dt; if (b.t < 0) continue;
      if (b.state === 'fall') { b.vy -= GRAV * dt; b.y += b.vy * dt; if (b.t > 1.3) { const c = checks[b.ci]; b.x = c.x + rnd(-1.5, 1.5); b.z = c.z; b.y = c.y; b.state = 'wait'; b.t = -.4; b.k = spiralSorted.indexOf(c.p || spiralSorted[0]); if (b.k < 0) b.k = 0; } continue; }
      if (b.state === 'wait' || (b.state === 'hop' && b.t >= b.dur)) {
        if (b.state === 'hop') { b.x = b.to.x + b.ox; b.z = b.to.z + b.oz; b.y = b.to.y;
          if (b.to.kind === 'check') b.ci = Math.max(b.ci, b.to.ci);
          if (b.to.fin) { b.state = 'done'; b.finished = runT || 1; continue; }
          if (Math.random() < .045 / b.skill && b.to.kind !== 'check') { b.state = 'fall'; b.vy = 3; b.t = 0; b.falls++; continue; }
          if (b.to.kind === 'bounce') { b.t = -.05; } else b.t = -rnd(.03, .25) / b.skill;
          b.state = 'wait'; continue; }
        b.k++; const to = nextStand(b); if (!to) { b.state = 'done'; continue; }
        // walk across big parts in one go; hop between small ones
        b.from = { x: b.x, y: b.y, z: b.z }; b.to = to; b.ox = clamp(rnd(-1, 1) * (to.w / 2 - .6), -2, 2) * (to.w > 2.5 ? 1 : 0); b.oz = to.d > 3 ? rnd(-to.d / 3, to.d / 3) : 0;
        if (to.kind === 'conv' || to.fin) b.oz = to.d / 2 - .8;
        const dist = Math.hypot(to.x + b.ox - b.x, to.z + b.oz - b.z); b.dur = (dist / (RUN * .82 * b.skill)) + .12; b.hop = Math.max(1.1, (to.y - b.y) + 1.3); if (b.from.y < to.y - 2) b.hop = to.y - b.y + 1;
        b.t = 0; b.state = 'hop';
      }
      if (b.state === 'hop') { const u = clamp(b.t / b.dur, 0, 1), tx = b.to.x + b.ox, tz = b.to.z + b.oz; const px = b.x, pz = b.z;
        b.x = b.from.x + (tx - b.from.x) * u; b.z = b.from.z + (tz - b.from.z) * u; b.y = b.from.y + (b.to.y - b.from.y) * u + Math.sin(u * Math.PI) * b.hop;
        if (Math.hypot(b.x - px, b.z - pz) > .001) b.h = Math.atan2(b.x - px, b.z - pz); }
    }
    for (const b of bots) { b.holder.position.set(b.x, b.y, b.z); b.body.rotation.y = b.h; b.holder.visible = !(b.state === 'fall' && b.t > .9);
      if (b.u) { b.u.walk = b.state === 'hop' ? 1 : 0; b.u.walkPhase = (b.u.walkPhase || 0) + dt * 9; try { b.u.update?.(T, dt); } catch {} } }
  }
  // the race panel: who's furthest along
  const rowsEl = $('.ob-bar .rows'); let rowsT = 0;
  function progOf(z) { return clamp(z / fin.z, 0, 1); }
  function paintRace() {
    const list = [{ name: 'You', p: state === 'won' || state === 'done' ? 1.001 : progOf(pl.z), me: true, f: finishT }, ...bots.map((b) => ({ name: b.name, p: b.state === 'done' ? 1.001 : progOf(b.z), f: b.finished }))];
    list.sort((a, b) => (a.p >= 1 && b.p >= 1 ? (a.f || 1e9) - (b.f || 1e9) : b.p - a.p));
    rowsEl.innerHTML = list.map((r, i) => `<div class="row${r.me ? ' me' : ''}"><span>${i + 1}. ${esc(r.name)}</span><span>${r.p >= 1 ? 'done' : `${Math.round(r.p * 100)}%`}</span></div>`).join('');
  }

  // ---------------------------------------------------------------- multiplayer
  const others = new Map(); let live = null, Pmod = null, liveT = 0;
  // the course height under x/z: the highest standable top near that spot (parts never stack, so this is unique)
  function courseY(x, z) { let y = null, bd = 1e9; for (const p of parts) { if (p.kind === 'kill' || p.noStand) continue; const dx = Math.max(0, Math.abs(x - p.x0) - p.w / 2 - (p.kind === 'move' ? p.amp : 0)), dz = Math.max(0, Math.abs(z - p.z0) - p.d / 2), d = dx + dz; if (d < bd - .01 || (d < bd + .01 && p.y > (y ?? -1e9))) { bd = d; y = p.y; } } return y ?? 0; }
  function otherRoot(o) {
    if (o.root) { scene.remove(o.root); o.root = null; }
    const g = new THREE.Group(); let body = null;
    try { if (Pmod?.buildPerson) body = Pmod.buildPerson(o.look && Object.keys(o.look).length ? o.look : Pmod.DEFAULT_LOOK, { lite: true }); } catch {}
    if (!body) body = makeBlob('#9b7cf0').root;
    g.add(body); o.u = body.userData?.creature; o.body = body;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(o.name || 'player', '#8f7cf2'), transparent: true, depthWrite: false })); track(tag.material); tag.scale.set(2.4, .52, 1); tag.position.y = 2.3; g.add(tag);
    scene.add(g); o.root = g;
  }
  (async () => {
    const url = window.AA_LIVE || 'wss://live-production-a047.up.railway.app/live';
    try { Pmod = await import('../person3d.js'); const L = await import('../live.js'); if (closed) return;
      live = L.joinLive(url, { look: me.look || {}, name: (me.name && me.name !== 'You') ? me.name : '',
        onPeer: (m) => { const o = others.get(m.id) || { id: m.id, here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, v: 0, j: 0, d: 0 }; const key = JSON.stringify(m.look); o.name = m.name; if (o.key !== key) { o.key = key; o.look = m.look; otherRoot(o); } others.set(m.id, o); },
        onLeave: (id) => { const o = others.get(id); if (o?.root) scene.remove(o.root); others.delete(id); },
        onState: (list) => { const seen = new Set(); for (const [id, x, z, h, v, j = 0, d = 0] of list) { const o = others.get(id); if (!o) continue; seen.add(id); if (!o.here) { o.x = x; o.z = z; o.h = h; } o.here = true; o.tx = x; o.tz = z; o.th = h; o.v = v; o.j = j; o.d = d; } others.forEach((o, id) => { if (!seen.has(id)) o.here = false; }); } });
    } catch (e) { console.warn('obby: multiplayer off', e); }
  })();
  function stepOthers(dt) {
    if (live && (liveT -= dt) <= 0) { liveT = .1; const base = courseY(pl.x, pl.z); live.at('obby', pl.x, pl.z, pl.h, Math.hypot(pl.vx, pl.vz), clamp(pl.y - base, 0, 3), pl.y < base - 2 ? 1 : 0); }
    const k = Math.min(1, dt * 10);
    others.forEach((o) => { if (!o.root) return; o.root.visible = o.here && !o.d; if (!o.root.visible) return;
      if (Math.hypot(o.tx - o.x, o.tz - o.z) > 8) { o.x = o.tx; o.z = o.tz; } else { o.x += (o.tx - o.x) * k; o.z += (o.tz - o.z) * k; }
      let dh = o.th - o.h; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU; o.h += dh * k;
      o.root.position.set(o.x, courseY(o.x, o.z) + (o.j || 0), o.z); o.body.rotation.y = o.h;
      if (o.u) { o.u.walk = o.v > .3 ? Math.min(1.4, o.v / 3) : 0; if (o.v > .3) o.u.walkPhase = (o.u.walkPhase || 0) + dt * o.v * 3; try { o.u.update?.(T, dt); } catch {} } });
  }

  // ---------------------------------------------------------------- leaderboard (lower time is better)
  const API = '/api/obby'; let topList = null, posted = false;
  async function fetchTop() { try { const r = await fetch(`${API}/top`, { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); if (Array.isArray(j?.top)) topList = j.top.slice(0, 10); } catch {} return topList; }
  function topHtml() { if (!topList || !topList.length) return '<p style="font-size:13px;color:#9aa8b6">No runs yet. Be the first.</p>'; return `<ol class="ob-top10">${topList.map((r, i) => `<li><span>${i + 1}</span><b>${esc(String(r.name || 'player').slice(0, 16))}</b><em>${fmtT((+r.ms || 0) / 1000)}</em></li>`).join('')}</ol>`; }
  function paintTop() { const s = modalCard.querySelector('.ob-topcard'); if (s && state !== 'won') s.innerHTML = `<div class="hd" style="font-weight:700;margin-top:6px">Fastest runs</div>${topHtml()}`; }
  function postScore() { if (posted || !finishT) return; posted = true; try { fetch(`${API}/score`, { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ name: myName, ms: Math.round(finishT * 1000), falls, place }) }).then(() => fetchTop()).catch(() => {}); } catch {} }
  fetchTop().then(paintTop);

  // ---------------------------------------------------------------- loop
  const stEl = $('.st'), tmEl = $('.tm'), ddEl = $('.dd'), stageEl = $('.ob-stage');
  let last = performance.now(), hudStage = -1;
  const camPos = new THREE.Vector3(0, 5, -12), look = new THREE.Vector3();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000) * timeScale; last = now; T += dt;
    stepParts(dt);
    if (state === 'play') { runT += dt; stepPlayer(dt); }
    if (state === 'play' || state === 'won' || state === 'done') stepBots(dt);
    stepOthers(dt); stepSparks(dt);
    // player visuals
    pl.holder.position.set(pl.x, pl.y, pl.z); pl.body.rotation.y = pl.h;
    if (pl.u) { const sp = Math.hypot(pl.vx, pl.vz); pl.u.walk = pl.onGround && sp > .4 ? Math.min(1.4, sp / 4) : 0; if (pl.u.walk) pl.u.walkPhase = (pl.u.walkPhase || 0) + dt * sp * 1.6; try { pl.u.update?.(T, dt); } catch {} }
    // camera: orbit behind, smoothed, never under the player's floor
    const cx = pl.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, cz = pl.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist, cy = pl.y + 1.4 + Math.sin(camPitch) * camDist;
    camPos.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.exp(-dt * 10)); camera.position.copy(camPos); look.set(pl.x, pl.y + 1.2, pl.z); camera.lookAt(look);
    sun.position.set(pl.x + 18, pl.y + 40, pl.z - 12); sun.target.position.set(pl.x, pl.y, pl.z + 4);
    // hud
    if ((rowsT -= dt) <= 0) { rowsT = .25; paintRace(); }
    tmEl.textContent = fmtT(state === 'play' ? runT : finishT); ddEl.textContent = `${falls} fall${falls === 1 ? '' : 's'}`;
    if (hudStage !== pl.ci) { hudStage = pl.ci; stEl.textContent = pl.ci + 1; stageEl.textContent = STAGES[pl.ci] || ''; }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);
  if (mobile) $('.ob-hint').style.display = 'none';

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    try { live?.close(); } catch {}
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur); removeEventListener('resize', onResize);
    try { ac?.close(); } catch {}
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
    disposables.forEach((d) => d.dispose?.()); envTex.dispose(); scene.background?.dispose?.(); renderer.dispose(); renderer.forceContextLoss?.();
    wrap.remove(); css.remove();
    try { onClose({ time: finishT, falls, place, best }); } catch {}
  }
  if (tst) {
    tst.peek = () => ({ state, ci: pl.ci, x: +pl.x.toFixed(2), y: +pl.y.toFixed(2), z: +pl.z.toFixed(2), onGround: pl.onGround, g: pl.ground?.kind || null, falls, runT: +runT.toFixed(2), place, bots: bots.map((b) => ({ n: b.name, s: b.state, k: b.k, ci: b.ci, z: Math.round(b.z) })), checks: checks.length, finZ: fin.z });
    tst.start = start; tst.keys = keys; tst.timeScale = (k) => { timeScale = k; };
    tst.tp = (ci) => { pl.ci = ci; spawnAt(checks[ci]); };
    tst.tpXYZ = (x, y, z) => { pl.x = x; pl.y = y; pl.z = z; pl.vx = pl.vy = pl.vz = 0; };
    tst.cam = (yaw, pitch, dist) => { camYaw = yaw; if (pitch != null) camPitch = pitch; if (dist != null) camDist = dist; };
    tst.jump = () => { pl.jumpBuf = .14; };
    tst.parts = () => parts.map((p) => ({ kind: p.kind, x: p.x0, y: p.y, z: p.z0, w: p.w, d: p.d }));
    tst.checks = () => checks.map((c) => ({ x: c.x, y: c.y, z: c.z }));
  }
  return { close };
}
