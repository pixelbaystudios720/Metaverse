// Attention Agents 3D: agents, their PC booths (cafe3d.js) and the render stage. Shared by the site and the trailer.
import * as THREE from 'three';
import { buildAgent, speciesOf, SPECIES } from './cast3d.js';
import { buildBooth, buildCafeRoom } from './cafe3d.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
export { THREE };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- data
// In the cafe an agent climbs as its coin fills the bonding curve: market cap is attention.
export const EVO = [
  { name: 'Lurker',   at: 0,   note: 'Just logged on. Nobody knows it yet.' },
  { name: 'Poster',   at: .2,  note: 'Posting, searching, getting its first replies.' },
  { name: 'Rising',   at: .4,  note: 'People are starting to notice. Its booth gets a second screen.' },
  { name: 'Trending', at: .6,  note: 'Its coin is moving and the timeline knows its name.' },
  { name: 'Viral',    at: .85, note: 'Everyone is watching. Almost bonded.' },
];
// After its coin bonds it is Famous, and keeps climbing with every token it thinks.
export const AGES = [
  { name: 'Famous', at: 0,   note: 'Bonded. A gold medallion and a glowing ring at its feet.' },
  { name: 'Icon',   at: 1e8, note: 'A household name in the cafe.' },
  { name: 'Legend', at: 1e9, note: 'A crown and its own spotlight.' },
];
export const evoIndex = (bond) => { let i = 0; EVO.forEach((s, k) => { if (bond >= s.at) i = k; }); return i; };
export const ageIndex = (tokens) => { let i = 0; AGES.forEach((s, k) => { if (tokens >= s.at) i = k; }); return i; };
export const formName = (a) => (a.bonded ? AGES[ageIndex(a.tokens)].name : EVO[evoIndex(a.bond)].name);
export const tubeScale = (e) => .27 + .2 * clamp(e, 0, 1);
export const worldScale = (tokens) => clamp(.5 + (Math.log10(Math.max(tokens, 1e6)) - 6) * .085, .5, .8);
export const BRAINS = [
  { id: 'claude-opus-5.5', name: 'Claude Haiku 4.5', maker: 'Anthropic', fluid: '#ffb36b' },
  { id: 'gpt-6',           name: 'GPT-6',           maker: 'OpenAI',    fluid: '#62e6cf' },
  { id: 'gemini',          name: 'Gemini',          maker: 'Google',    fluid: '#86b3ff' },
  { id: 'grok-4.7',        name: 'Grok 4.7',        maker: 'xAI',       fluid: '#cdd6df' },
  { id: 'deepseek',        name: 'DeepSeek',        maker: 'DeepSeek',  fluid: '#ff8bb3' },
  { id: 'qwen',            name: 'Qwen',            maker: 'Alibaba',   fluid: '#b993ff' },
];
export const brainOf = (id) => BRAINS.find((b) => b.id === id) || BRAINS[1];
export const PALETTES = [
  { body: '#7fd6c2', belly: '#effff9', accent: '#ff8a5b' },
  { body: '#ff9eb5', belly: '#fff0f3', accent: '#6c5ce7' },
  { body: '#ffc93c', belly: '#fff7dd', accent: '#2e86de' },
  { body: '#8ea6ff', belly: '#eef1ff', accent: '#ffb86b' },
  { body: '#b7e36b', belly: '#f6ffe6', accent: '#e0569b' },
  { body: '#c59bff', belly: '#f7f0ff', accent: '#2fc4c4' },
  { body: '#ff8c61', belly: '#ffeee5', accent: '#3da5d9' },
];
const IRIS = ['#3d7be0', '#2fa57f', '#9b57d6', '#d9862b', '#d0466a', '#2a9bb8', '#6b8f2e'];

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function fmt(n) {
  for (const [v, s] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) if (n >= v) { const x = n / v; return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + s; }
  return String(Math.round(n));
}
export const full = (n) => Math.floor(n).toLocaleString('en-US');
// Market cap in SOL. Before bonding it follows a pump.fun-style curve (about 28 SOL at launch, about 411 SOL when it
// bonds); after bonding the samples grow with holders and thinking. Real coins read their price from the chain instead.
export const SOL_USD = 150;
export function mcapSol(a) {
  if (!a.bonded) { const vTok = 1073 - 793.1 * clamp(a.bond || 0, 0, 1), vSol = 32190 / vTok; return (vSol * vSol) / 32.19; }
  return 411 * (1.15 + Math.log10(1 + (a.holders || 0)) * .9 + Math.log10(Math.max(1e6, a.tokens || 0) / 1e6) * .35);
}
export const usd = (n) => '$' + fmt(n);
// a sample coin's made-up market-cap history, in USD: launch at the curve's floor, wandering up to today's market cap.
// The coin page and the market stalls both draw it, so they always agree. `change` is the last 12 steps, "today".
export function coinSeries(a, N = 90) {
  const r = rng(a.seed * 31 + 7), now = mcapSol(a) * SOL_USD, start = 27.96 * SOL_USD, series = []; let v = start;
  for (let i = 0; i < N; i++) { const target = start + (now - start) * Math.pow(i / (N - 1), 1.3); v = v + (target - v) * .35 + (r() - .5) * now * .06; series.push(Math.max(start * .8, v)); }
  series[N - 1] = now;
  return { series, change: ((series[N - 1] - series[N - 13]) / series[N - 13]) * 100 };
}
export function makeGenes(seed) {
  const r = rng(seed);
  return {
    seed, palette: PALETTES[Math.floor(r() * PALETTES.length)], eyes: [1, 2, 2, 2, 3][Math.floor(r() * 5)],
    top: ['antennae', 'horns', 'ears', 'tuft'][Math.floor(r() * 4)], squat: .86 + r() * .26, spots: r() < .7,
    iris: IRIS[Math.floor(r() * IRIS.length)], species: SPECIES[Math.floor(r() * SPECIES.length)],
  };
}
// a baby takes after both parents: a blend of their colours and a mix of their features
export function mixGenes(a, b, seed) {
  const r = rng(seed), k = .35 + r() * .3;
  const blend = (x, y) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), k).getHexString();
  return {
    seed, palette: { body: blend(a.palette.body, b.palette.body), belly: blend(a.palette.belly, b.palette.belly), accent: r() < .5 ? a.palette.accent : b.palette.accent },
    eyes: r() < .5 ? a.eyes : b.eyes, top: r() < .5 ? a.top : b.top, squat: clamp((a.squat + b.squat) / 2 + (r() - .5) * .08, .86, 1.12),
    spots: r() < .5 ? a.spots : b.spots, iris: r() < .5 ? a.iris : b.iris, species: r() < .5 ? (a.species || speciesOf(a.seed)) : (b.species || speciesOf(b.seed)),
  };
}
export const genesOf = (a) => a.genes || makeGenes(a.seed);
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function walletOf(seed) { const r = rng(seed * 13 + 5); const pick = (n) => Array.from({ length: n }, () => B58[Math.floor(r() * 58)]).join(''); return `${pick(4)}…${pick(4)}`; }

// ---------------------------------------------------------------- textures
const CACHE = {};
const once = (k, make) => CACHE[k] || (CACHE[k] = make());
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const glowTexture = () => once('glow', () => canvasTex(128, 128, (x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
}));
const grainTexture = () => once('grain', () => {
  const t = canvasTex(256, 256, (x, w, h) => {
    const img = x.createImageData(w, h), r = rng(9);
    for (let i = 0; i < w * h; i++) { const v = 118 + r() * 20; img.data.set([v, v, v, 255], i * 4); }
    x.putImageData(img, 0, 0); x.filter = 'blur(1.2px)'; x.drawImage(x.canvas, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3); return t;
});
const irisTexture = (hex) => once('iris' + hex, () => canvasTex(256, 256, (x) => {
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl);
  const tone = (l, s = 1) => `hsl(${hsl.h * 360}, ${Math.round(hsl.s * 100 * s)}%, ${Math.round(l * 100)}%)`;
  x.fillStyle = '#120c14'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, tone(Math.min(.82, hsl.l + .3))); g.addColorStop(.45, tone(hsl.l + .08)); g.addColorStop(.86, tone(Math.max(.12, hsl.l - .2))); g.addColorStop(.97, '#140c18'); g.addColorStop(1, '#140c18');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
  const r = rng(hex.length * 7 + 3);
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, r0 = 48 + r() * 8, r1 = 92 + r() * 26;
    x.strokeStyle = r() < .5 ? `rgba(255,255,255,${.06 + r() * .12})` : `rgba(0,0,0,${.08 + r() * .12})`;
    x.lineWidth = 1 + r() * 1.6; x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a + .05) * r1, 128 + Math.sin(a + .05) * r1); x.stroke();
  }
  x.fillStyle = '#07050a'; x.beginPath(); x.arc(128, 128, 46, 0, Math.PI * 2); x.fill();
}));

// ---------------------------------------------------------------- shaders
const FRESNEL_VERT = `
  varying vec3 vNw; varying vec3 vVw; varying vec3 vP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNw = normalize(mat3(modelMatrix) * normal); vVw = normalize(cameraPosition - wp.xyz); vP = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
function sacMaterial(P) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTint: { value: new THREE.Color(P.belly).lerp(new THREE.Color('#ffc2d1'), .55) }, uA: { value: 1 }, uTime: { value: 0 } },
    vertexShader: FRESNEL_VERT,
    fragmentShader: `uniform vec3 uTint; uniform float uA; uniform float uTime; varying vec3 vNw; varying vec3 vVw; varying vec3 vP;
      void main() {
        float ndv = abs(dot(normalize(vNw), normalize(vVw)));
        float fres = pow(1.0 - ndv, 2.2);
        float veins = smoothstep(.82, .97, sin(vP.x * 13.0 + sin(vP.y * 8.0 + uTime * .4) * 2.2) * sin(vP.z * 11.0 + vP.y * 6.0));
        vec3 col = uTint * (.75 + .6 * fres) + vec3(1.0, .5, .62) * veins * .35;
        gl_FragColor = vec4(col, (.02 + fres * .3 + veins * .14) * uA);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

// ---------------------------------------------------------------- geometry
const SPH = () => once('sph', () => new THREE.SphereGeometry(1, 32, 24));
const HSPH = () => once('hsph', () => new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2));
function capGeo(angle) {
  return once('cap' + angle, () => {
    const g = new THREE.SphereGeometry(1.004, 40, 12, 0, Math.PI * 2, 0, angle); g.rotateX(Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv, r = Math.sin(angle);
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * r) + .5, p.getY(i) / (2 * r) + .5);
    return g;
  });
}
// the grown body, with a morph target back to the plain sphere it starts as
function bodyGeo(sq, P) {
  return once(`body${sq.toFixed(2)}${P.body}`, () => {
    const g = new THREE.SphereGeometry(1, 80, 60), p = g.attributes.position, v = new THREE.Vector3();
    const unit = p.array.slice();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const w = 1 + .15 * -v.y; let y = v.y;
      if (y < -.62) y = -.62 + (y + .62) * .3;
      p.setXYZ(i, v.x * w * sq, y * (1.9 - sq) * .94, v.z * w * sq * .9);
    }
    g.computeVertexNormals(); g.computeBoundingBox(); const lift = -g.boundingBox.min.y; g.translate(0, lift, 0); g.computeBoundingBox();
    g.userData.sq = sq; g.userData.lift = lift;
    const H = g.boundingBox.max.y, rs = H * .44, cy = H * .5;
    const mp = new Float32Array(unit.length), mn = new Float32Array(unit.length);
    for (let i = 0; i < unit.length; i += 3) { mp[i] = unit[i] * rs; mp[i + 1] = cy + unit[i + 1] * rs; mp[i + 2] = unit[i + 2] * rs; mn[i] = unit[i]; mn[i + 1] = unit[i + 1]; mn[i + 2] = unit[i + 2]; }
    g.morphAttributes.position = [new THREE.BufferAttribute(mp, 3)];
    g.morphAttributes.normal = [new THREE.BufferAttribute(mn, 3)];
    g.userData.rs = rs;
    const n = g.attributes.normal, cols = new Float32Array(p.count * 3);
    const base = new THREE.Color(P.body), top = base.clone().offsetHSL(0, .02, .07), bot = base.clone().offsetHSL(.01, .06, -.14), belly = new THREE.Color(P.belly), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i) / H;
      c.copy(bot).lerp(base, smooth(0, .45, h)).lerp(top, smooth(.55, 1, h));
      const b = smooth(.25, .8, n.getZ(i)) * (1 - smooth(.28, .62, h)) * smooth(.03, .16, h);
      c.lerp(belly, b * .92);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  });
}
function bentCone(r, len, bend) {
  return once(`bent${r}${len}${bend}`, () => {
    const g = new THREE.ConeGeometry(r, len, 20, 10); g.translate(0, len / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / len; p.setX(i, p.getX(i) + bend * y * y * len); }
    g.computeVertexNormals(); g.rotateX(Math.PI / 2); return g;
  });
}
const wingGeo = () => once('wing', () => {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.bezierCurveTo(.15, .35, .55, .7, .95, .78); s.bezierCurveTo(.8, .55, .9, .35, .7, .22);
  s.bezierCurveTo(.72, .08, .5, -.05, .38, -.06); s.bezierCurveTo(.25, -.1, .1, -.06, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 3, curveSegments: 24 });
  g.translate(0, 0, -.01); return g;
});
const ray = new THREE.Raycaster();
const dirOf = (yaw, pitch) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
// Features are placed by casting rays at a low-poly copy of the body (the same shape with a sixth of the
// triangles), and every hit is remembered per body shape, so building a creature stays fast.
function probeOf(body) {
  const ud = body.geometry.userData;
  if (!ud.probe) {
    const g = new THREE.SphereGeometry(1, 40, 30), p = g.attributes.position, v = new THREE.Vector3(), sq = ud.sq;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const w = 1 + .15 * -v.y; let y = v.y; if (y < -.62) y = -.62 + (y + .62) * .3; p.setXYZ(i, v.x * w * sq, y * (1.9 - sq) * .94 + ud.lift, v.z * w * sq * .9); }
    ud.probe = new THREE.Mesh(g); ud.probe.updateMatrixWorld(); ud.hits = new Map();
  }
  return ud.probe;
}
function surface(mesh, c, d) {
  const probe = probeOf(mesh), hits = mesh.geometry.userData.hits, key = `${d.x.toFixed(4)},${d.y.toFixed(4)},${d.z.toFixed(4)}`;
  let h = hits.get(key);
  if (!h) {
    ray.set(c.clone().addScaledVector(d, 8), d.clone().negate());
    const x = ray.intersectObject(probe, false)[0];
    h = x ? { point: x.point.clone(), normal: x.face.normal.clone() } : { point: c.clone().addScaledVector(d, .9), normal: d.clone() };
    hits.set(key, h);
  }
  return { point: h.point.clone(), normal: h.normal.clone() };
}
function stick(obj, hit, out = 0) { obj.position.copy(hit.point).addScaledVector(hit.normal, out); obj.lookAt(hit.point.clone().add(hit.normal)); return obj; }
const WHITE = new THREE.Color('#ffffff');

// ---------------------------------------------------------------- agent
// evo: 0 = embryo in its sac, 1 = fully formed. age: 0 grown, 1 elder, 2 mythic (only shows once formed).
// Attention Agents: every creature is one of the six cast species (cast3d.js). The old procedural creature below is
// kept as legacyCreature for the trailer tools.
export function buildCreature(g, opts = {}) { return buildAgent({ ...g, species: g.species || speciesOf(g.seed || 0) }, opts); }
export function legacyCreature(g, { age = 0, evo = 1, lite = false } = {}) {
  const P = g.palette, mats = [];
  const M = (m) => (mats.push(m), m);
  const skinProps = { roughness: .5, clearcoat: .55, clearcoatRoughness: .32, sheen: .9, sheenRoughness: .45, sheenColor: new THREE.Color(P.belly), bumpMap: grainTexture(), bumpScale: .5 };
  const skinBase = new THREE.Color(P.body).offsetHSL(0, .02, .03), footBase = new THREE.Color(P.body).offsetHSL(.01, .06, -.12);
  const bodyMat = M(new THREE.MeshPhysicalMaterial({ ...skinProps, color: '#ffffff', vertexColors: true, emissive: new THREE.Color(P.belly).lerp(new THREE.Color('#ff9fb5'), .5), emissiveIntensity: 0 }));
  const skinMat = M(new THREE.MeshPhysicalMaterial({ ...skinProps, color: skinBase.clone() }));
  const footMat = M(new THREE.MeshPhysicalMaterial({ ...skinProps, color: footBase.clone() }));
  const bellyMat = M(new THREE.MeshPhysicalMaterial({ ...skinProps, color: P.belly }));
  const accentMat = M(new THREE.MeshPhysicalMaterial({ color: P.accent, roughness: .38, clearcoat: .7, clearcoatRoughness: .25 }));
  const hornMat = M(new THREE.MeshPhysicalMaterial({ color: '#fff1d6', roughness: .3, clearcoat: 1, clearcoatRoughness: .15 }));
  const glowMat = M(new THREE.MeshStandardMaterial({ color: P.accent, emissive: new THREE.Color(P.accent), emissiveIntensity: 1.6, roughness: .3 }));
  const haloMat = M(new THREE.MeshStandardMaterial({ color: '#ffd45c', emissive: new THREE.Color('#ffc21a'), emissiveIntensity: 2.4, roughness: .3 }));
  const darkMat = M(new THREE.MeshStandardMaterial({ color: '#2a1220', roughness: .55 }));
  const tongueMat = M(new THREE.MeshPhysicalMaterial({ color: '#ff6f8e', roughness: .35, clearcoat: .6 }));
  const scleraMat = M(new THREE.MeshPhysicalMaterial({ color: '#fbf8f4', roughness: .3, clearcoat: .3 }));
  const irisMat = M(new THREE.MeshPhysicalMaterial({ map: irisTexture(g.iris || '#3d7be0'), roughness: .25, clearcoat: 1, clearcoatRoughness: .05 }));
  const corneaMat = M(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, clearcoat: 1, clearcoatRoughness: 0, transparent: true, opacity: .12, depthWrite: false }));
  const shineMat = M(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  const blushMat = M(new THREE.MeshStandardMaterial({ color: '#ff8fa3', transparent: true, opacity: .5, roughness: 1, depthWrite: false }));
  const wingMat = M(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .15, transparent: true, opacity: .82, iridescence: 1, iridescenceIOR: 1.6, sheen: 1, sheenColor: new THREE.Color(P.body), side: THREE.DoubleSide }));
  const spotMat = M(new THREE.MeshStandardMaterial({ color: '#241019', roughness: .35 }));
  const heartMat = M(new THREE.MeshStandardMaterial({ color: '#ff6f8e', emissive: new THREE.Color('#ff3d6e'), emissiveIntensity: 2 }));
  const sacMat = M(sacMaterial(P));
  const pale = new THREE.Color('#f6d3dc');

  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const u = {
    g, age, rig, mats, eyes: [], er: .2, mouth: null, arms: [], feet: [], motes: [], wings: [], halo: null, glowMat, poke: 0,
    phase: (g.seed % 97) / 15, look: new THREE.Vector2(), wander: true, asleep: false, H: 2, walk: 0, walkPhase: 0,
    evo: -1, attach: [], grow: [], tail: [], tailK: 0, sacK: 0, heartK: 0, curl: 0,
  };
  root.userData.creature = u;
  const sph = SPH();
  const add = (gm, m, parent = rig) => { const x = new THREE.Mesh(gm, m); parent.add(x); return x; };

  const body = add(bodyGeo(g.squat, P), bodyMat);
  body.updateMorphTargets(); body.morphTargetInfluences[0] = 0; body.updateMatrixWorld();
  const H = body.geometry.boundingBox.max.y, rs = body.geometry.userData.rs; u.H = H; u.rs = rs;
  const c = new THREE.Vector3(0, H * .5, 0); u.c = c;
  // anything stuck to the body slides between the grown surface (a) and the embryo sphere (b)
  const ride = (obj, k0, k1) => { const a = obj.position.clone(); const b = c.clone().add(a.clone().sub(c).normalize().multiplyScalar(rs)); u.attach.push({ obj, a, b }); if (k0 !== undefined) u.grow.push({ obj, k0, k1 }); return obj; };

  // eyes: eyeball (sclera + iris) turns in the socket, lids blink, highlights stay put; early on they are just dark spots
  const n = g.eyes, er = .25 * (n === 3 ? .78 : n === 1 ? 1.3 : 1);
  const yaws = n === 1 ? [0] : n === 2 ? [-.36, .36] : [-.52, 0, .52];
  const pitches = n === 3 ? [.22, .42, .22] : yaws.map(() => .27);
  const tmp = new THREE.Object3D();
  yaws.forEach((yw, i) => {
    const d = dirOf(yw, pitches[i]);
    const outer = new THREE.Group(); rig.add(outer);
    stick(outer, surface(body, c, d), -er * .32);
    tmp.position.copy(c).addScaledVector(d, rs - er * .16); tmp.lookAt(tmp.position.clone().add(d));
    const ball = new THREE.Group(); outer.add(ball);
    add(sph, scleraMat, ball).scale.setScalar(er);
    add(capGeo(.6), irisMat, ball).scale.setScalar(er);
    const shine = [];
    if (!lite) {
      const cornea = add(sph, corneaMat, ball); cornea.scale.setScalar(er * 1.03); cornea.renderOrder = 4;
      const h1 = add(sph, shineMat, outer); h1.scale.set(er * .15, er * .17, er * .05); h1.position.set(er * .3, er * .34, er * .9);
      const h2 = add(sph, shineMat, outer); h2.scale.setScalar(er * .065); h2.position.set(-er * .26, -er * .2, er * .95);
      shine.push(h1, h2);
    }
    const lidPivot = new THREE.Group(); outer.add(lidPivot);
    add(HSPH(), skinMat, lidPivot).scale.setScalar(er * 1.09);
    const spot = add(sph, spotMat, outer); spot.position.z = er * .15;
    if (age >= 1) { const br = add(once('brow', () => new THREE.CapsuleGeometry(.03, .14, 6, 12)), bellyMat, outer); br.rotation.z = Math.PI / 2 + (yw < 0 ? -.18 : yw > 0 ? .18 : 0); br.position.set(0, er * 1.2, er * .5); }
    u.eyes.push({ outer, ball, lid: lidPivot, shine, spot, aPos: outer.position.clone(), aQ: outer.quaternion.clone(), bPos: tmp.position.clone(), bQ: tmp.quaternion.clone(), lidK: 1 });
  });
  u.er = er;

  // mouth and cheeks
  const mg = new THREE.Group(); rig.add(mg); stick(mg, surface(body, c, dirOf(0, -.08)), -.004);
  const arc = Math.PI * .62;
  const smile = add(once('smile', () => new THREE.TorusGeometry(.085, .017, 10, 32, arc)), darkMat, mg);
  smile.rotation.z = -Math.PI / 2 - arc / 2; smile.position.y = .07;
  const open = new THREE.Group(); mg.add(open);
  add(sph, darkMat, open).scale.set(.1, .07, .05);
  const tg = add(sph, tongueMat, open); tg.scale.set(.06, .03, .035); tg.position.set(0, -.03, .02);
  open.position.y = -.01; open.scale.y = .05; u.mouth = open;
  ride(mg, .45, .62);
  if (!lite) [-.62, .62].forEach((yw) => { const bg = new THREE.Group(); rig.add(bg); stick(bg, surface(body, c, dirOf(yw, .02)), .004); add(sph, blushMat, bg).scale.set(.1, .06, .02); ride(bg, .48, .66); });

  // feet with three toes
  [-1, 1].forEach((side) => {
    const f = new THREE.Group(); rig.add(f); f.position.set(side * .36 * g.squat, .07, .3 * g.squat); f.rotation.y = side * .25;
    const step = new THREE.Group(); f.add(step);
    add(sph, footMat, step).scale.set(.17, .1, .22);
    if (!lite) [-1, 0, 1].forEach((k) => { const t = add(sph, footMat, step); t.scale.setScalar(.058); t.position.set(k * .075, -.01, .2 - Math.abs(k) * .025); });
    ride(f, .5, .8); u.feet.push({ grp: step, side });
  });
  // something on top of the head
  const topK = [.62, .95];
  if (g.top === 'antennae') {
    [-1, 1].forEach((side) => {
      const grp = new THREE.Group(); rig.add(grp); stick(grp, surface(body, c, dirOf(side * .38, 1.05)), -.02);
      const len = .46, curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * .02, .06, len * .5), new THREE.Vector3(side * .1, -.02, len)]);
      add(new THREE.TubeGeometry(curve, 20, .024, 8, false), skinMat, grp);
      const bulb = add(sph, glowMat, grp); bulb.scale.setScalar(.1); bulb.position.copy(curve.getPoint(1));
      ride(grp, ...topK);
    });
  } else if (g.top === 'horns') {
    [-1, 1].forEach((side) => { const grp = new THREE.Group(); rig.add(grp); stick(grp, surface(body, c, dirOf(side * .5, .95)), -.04); add(bentCone(.11, .44, side * .5), hornMat, grp); ride(grp, ...topK); });
  } else if (g.top === 'ears') {
    [-1, 1].forEach((side) => { const grp = new THREE.Group(); rig.add(grp); stick(grp, surface(body, c, dirOf(side * .75, .85)), .1); grp.rotateZ(side * -.2); add(sph, skinMat, grp).scale.set(.2, .32, .07); const ie = add(sph, blushMat, grp); ie.scale.set(.12, .2, .03); ie.position.z = .05; ride(grp, ...topK); });
  } else {
    [-.28, 0, .28].forEach((yw, i) => { const grp = new THREE.Group(); rig.add(grp); stick(grp, surface(body, c, dirOf(yw, 1.32 - Math.abs(yw) * .3)), -.03); add(bentCone(.08, .34, yw * 1.4 - .25), accentMat, grp).scale.setScalar(i === 1 ? 1.2 : 1); ride(grp, ...topK); });
  }
  // arms with mitten hands
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group(); rig.add(pivot);
    const hit = surface(body, c, dirOf(side * 1.45, -.08)); pivot.position.copy(hit.point).addScaledVector(hit.normal, -.05);
    add(once('arm', () => new THREE.CapsuleGeometry(.085, .22, 8, 16)), skinMat, pivot).position.y = -.17;
    const hand = add(sph, skinMat, pivot); hand.scale.set(.115, .1, .1); hand.position.y = -.33;
    if (!lite) { const thumb = add(sph, skinMat, pivot); thumb.scale.setScalar(.045); thumb.position.set(-side * .06, -.29, .07); }
    ride(pivot, .56, .86); u.arms.push({ pivot, side });
  });
  if (g.spots && !lite) {
    const r = rng(g.seed + 5);
    for (let i = 0; i < 9; i++) { const grp = new THREE.Group(); rig.add(grp); const side = r() < .5 ? -1 : 1; stick(grp, surface(body, c, dirOf(side * (.95 + r() * 1.7), -.3 + r() * 1.1)), -.012); const k = .05 + r() * .06; add(sph, age >= 1 ? glowMat : accentMat, grp).scale.set(k, k, .022); ride(grp, .8, .98); }
  }
  if (age >= 1) {
    for (let i = 0; i < 6; i++) { const grp = new THREE.Group(); rig.add(grp); stick(grp, surface(body, c, dirOf(Math.PI, 1.3 - i * .27)), -.03); add(bentCone(.1, .32, -.3), accentMat, grp).scale.setScalar(1.05 - i * .1); ride(grp, .98, 1); }
  }
  if (age >= 2) {
    const halo = add(once('halo', () => new THREE.TorusGeometry(.42, .04, 16, 96)), haloMat, root); halo.rotation.x = Math.PI / 2 - .25; halo.position.y = H + .38; u.halo = halo;
    for (let i = 0; i < 7; i++) { const m = add(once('mote', () => new THREE.IcosahedronGeometry(.045, 1)), haloMat, root); u.motes.push({ mesh: m, r: 1.0 + (i % 3) * .12, h: .3 + i * .22, sp: .5 + i * .07, ph: i * 1.1 }); }
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group(); rig.add(pivot);
      pivot.position.copy(surface(body, c, dirOf(Math.PI + side * .5, .35)).point);
      const w = add(wingGeo(), wingMat, pivot); w.scale.set(side * .62, .62, .62); w.rotation.y = side * -.35; w.position.z = -.04;
      u.wings.push({ pivot, side });
    });
  }
  // early life: a sac, a beating heart, a tail
  const sac = add(SPH(), sacMat); sac.position.copy(c); sac.renderOrder = 1;
  const heart = add(sph, heartMat); heart.position.copy(c).add(new THREE.Vector3(0, -.08 * rs, .84 * rs));
  for (let i = 0; i < 8; i++) u.tail.push(add(sph, skinMat));
  const tailA = surface(body, c, dirOf(Math.PI, -.4)).point, tailB = c.clone().addScaledVector(dirOf(Math.PI, -.4), rs * .92);
  const tailBase = new THREE.Vector3();

  u.setEvo = (e) => {
    e = clamp(e, 0, 1); if (Math.abs(e - u.evo) < 1e-4) return; u.evo = e;
    const m = 1 - smooth(.3, .66, e); u.morph = m;
    body.morphTargetInfluences[0] = m;
    // the body stays solid at every stage so it reads clearly through the glass and fluid
    const ripe = smooth(.15, .7, e);
    bodyMat.color.copy(pale).lerp(WHITE, ripe); skinMat.color.copy(pale).lerp(skinBase, ripe); footMat.color.copy(pale).lerp(footBase, ripe);
    u.tissue = .32 * (1 - smooth(.1, .5, e)); bodyMat.emissiveIntensity = u.tissue;
    u.attach.forEach((a) => a.obj.position.lerpVectors(a.a, a.b, m));
    u.grow.forEach((gr) => { const k = smooth(gr.k0, gr.k1, e); gr.obj.visible = k > .01; gr.obj.scale.setScalar(Math.max(.001, k)); });
    u.eyes.forEach((ey) => {
      ey.outer.position.lerpVectors(ey.aPos, ey.bPos, m); ey.outer.quaternion.slerpQuaternions(ey.aQ, ey.bQ, m);
      const bs = smooth(.22, .5, e); ey.ball.visible = bs > .01; ey.ball.scale.setScalar(Math.max(.001, bs));
      const sp = 1 - smooth(.3, .48, e); ey.spot.visible = sp > .01; ey.spot.scale.setScalar(Math.max(.001, er * .48 * sp));
      ey.lidK = smooth(.42, .56, e); ey.lid.visible = ey.lidK > .01; ey.lid.scale.setScalar(Math.max(.001, ey.lidK));
      ey.shine.forEach((s) => { s.userData.on = bs > .5; });
    });
    const formed = e > .985;
    if (u.halo) u.halo.visible = formed; u.motes.forEach((mo) => { mo.mesh.visible = formed; }); u.wings.forEach((w) => { w.pivot.visible = formed; });
    u.tailK = 1 - smooth(.42, .78, e); u.sacK = 1 - smooth(.18, .32, e); u.heartK = 1 - smooth(.35, .56, e); u.curl = .38 * (1 - smooth(.08, .42, e));
    root.userData.evoYaw = 1.15 * (1 - smooth(.18, .55, e));
    tailBase.lerpVectors(tailA, tailB, m);
  };

  // animation is a function of t (plus the short poke decay), so the trailer can render it frame by frame
  u.update = (t, dt) => {
    u.poke = Math.max(0, u.poke - dt * 2.4); const pk = u.poke;
    const sleepy = u.asleep, ph = u.phase, w = u.walk, wp = u.walkPhase;
    const br = Math.sin(t * (sleepy ? 1.1 : 2) + ph);
    const sq = 1 + br * .02 + pk * .14 * Math.sin(pk * 9);
    rig.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    rig.rotation.z = Math.sin(t * .7 + ph) * .04 + Math.sin(wp) * .08 * w + Math.sin(t * 3.1 + ph) * .06 * u.tailK;
    rig.rotation.x = .09 * w + u.curl;
    rig.position.y = Math.abs(Math.sin(wp)) * .13 * w;
    u.feet.forEach((f) => { const q = wp + (f.side > 0 ? 0 : Math.PI); f.grp.position.set(0, Math.max(0, Math.cos(q)) * .08 * w, Math.sin(q) * .14 * w); });
    if (u.wander) u.look.set(Math.sin(t * .53 + ph * 1.7) * .6 + Math.sin(t * 1.31 + ph) * .25, Math.sin(t * .41 + ph * 2.3) * .4);
    const period = 3.2 + (u.g.seed % 9) * .35, bp = ((t + ph * 3) % period) / .22;
    let close = bp < 1 ? Math.sin(bp * Math.PI) : 0;
    if (sleepy) close = 1;
    u.eyes.forEach((ey) => {
      ey.lid.rotation.x = lerp(-.7, 1.42, close);
      ey.ball.rotation.y = u.look.x * .4; ey.ball.rotation.x = -u.look.y * .32;
      ey.shine.forEach((s) => { s.visible = s.userData.on !== false && close < .6; });
    });
    if (u.mouth) u.mouth.scale.y = sleepy ? .05 : .05 + pk * 1.3;
    u.arms.forEach((a) => { a.pivot.rotation.z = a.side * (.35 + pk * 1.1 + Math.sin(t * 2.2 + ph + a.side) * .1); a.pivot.rotation.x = Math.sin(wp + (a.side > 0 ? Math.PI : 0)) * .75 * w; });
    glowMat.emissiveIntensity = (sleepy ? .3 : 1.5) + pk * 2.5 + Math.sin(t * 3 + ph) * .3;
    if (u.halo) { u.halo.rotation.z = t * .6; u.halo.position.y = u.H + .38 + Math.sin(t * 1.6) * .05; }
    u.motes.forEach((m) => { const a = t * m.sp + m.ph; m.mesh.position.set(Math.cos(a) * m.r * .6, m.h + Math.sin(a * 2) * .1, Math.sin(a) * m.r * .6); });
    u.wings.forEach((wg) => { wg.pivot.rotation.y = wg.side * (.15 + Math.sin(t * 3.4 + ph) * .2 + pk * .4); });
    // heart: a double thump
    if (u.heartK > .01) {
      const b1 = Math.pow(Math.max(0, Math.sin(t * 7.2 + ph)), 14), b2 = Math.pow(Math.max(0, Math.sin(t * 7.2 + ph - .7)), 14) * .6;
      heart.visible = true; heart.scale.setScalar(rs * .2 * u.heartK * (1 + (b1 + b2) * .45)); heartMat.emissiveIntensity = 1.4 + (b1 + b2) * 3;
      bodyMat.emissiveIntensity = (u.tissue || 0) * (1 + (b1 + b2) * .8);
    } else heart.visible = false;
    if (u.sacK > .01) { sac.visible = true; sac.scale.setScalar(rs * (1.6 + (1 - u.sacK) * .3) * (1 + Math.sin(t * 1.6 + ph) * .015)); sacMat.uniforms.uA.value = u.sacK; sacMat.uniforms.uTime.value = t; }
    else sac.visible = false;
    const tk = u.tailK;
    u.tail.forEach((seg, i) => {
      if (tk < .01) { seg.visible = false; return; }
      seg.visible = true;
      const s = i / (u.tail.length - 1), ang = Math.sin(t * 7 + ph - i * .9) * .45 * s, len = rs * .3 * tk;
      seg.position.set(tailBase.x + Math.sin(ang) * len * i * .9, tailBase.y - len * i * .2 + s * s * len * 2.4, tailBase.z - Math.cos(ang) * len * i);
      seg.scale.setScalar(rs * (.32 - s * .24) * Math.max(.2, tk));
    });
  };
  u.setEvo(evo);
  return root;
}
export function disposeCreature(root) { if (!root) return; root.parent?.remove(root); root.userData.creature.mats.forEach((m) => { m.map?.dispose?.(); m.dispose(); }); }

// ---------------------------------------------------------------- tube
export const LIQ_BOTTOM = .52, LIQ_TOP = 2.77, LIQ_MID = (LIQ_BOTTOM + LIQ_TOP) / 2;
function glassMaterial(light) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTint: { value: new THREE.Color(light ? '#e8eef3' : '#9fd8cf') }, uRim: { value: new THREE.Color(light ? '#8fa3b5' : '#d8f6f0') }, uBase: { value: light ? .025 : .015 }, uRimA: { value: light ? .36 : .3 } },
    vertexShader: FRESNEL_VERT,
    fragmentShader: `
      uniform vec3 uTint; uniform vec3 uRim; uniform float uBase; uniform float uRimA;
      varying vec3 vNw; varying vec3 vVw; varying vec3 vP;
      void main() {
        vec3 n = normalize(vNw); if (!gl_FrontFacing) n = -n;
        float ndv = abs(dot(n, normalize(vVw)));
        float fres = pow(1.0 - ndv, 3.0);
        vec3 nv = normalize((viewMatrix * vec4(n, 0.0)).xyz);
        float front = gl_FrontFacing ? 1.0 : 0.25;
        float s1 = exp(-pow((nv.x - 0.62) / 0.05, 2.0));
        float s2 = exp(-pow((nv.x + 0.52) / 0.022, 2.0)) * 0.6;
        float streak = (s1 + s2) * front;
        float a = uBase + fres * uRimA + streak * 0.16;
        vec3 col = mix(uTint, uRim, clamp(fres * 1.4, 0.0, 1.0)) + vec3(streak * 0.5);
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
// The fluid is two shells. The back shell sits behind the agent and glows, so the agent reads as a solid
// silhouette against it. The front shell is nearly clear in the middle and only tints the edges.
function liquidMaterial(color, light, front = false) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: front ? THREE.FrontSide : THREE.BackSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uGlow: { value: 1 }, uAlpha: { value: front ? .035 : light ? .5 : .62 }, uH: { value: LIQ_TOP - LIQ_BOTTOM }, uLight: { value: light ? 1 : 0 }, uFront: { value: front ? 1 : 0 } },
    vertexShader: FRESNEL_VERT,
    fragmentShader: `
      uniform vec3 uColor; uniform float uTime; uniform float uGlow; uniform float uAlpha; uniform float uH; uniform float uLight; uniform float uFront;
      varying vec3 vNw; varying vec3 vVw; varying vec3 vP;
      void main() {
        float ndv = abs(dot(normalize(vNw), normalize(vVw)));
        float fres = pow(1.0 - ndv, 2.0);
        float h = clamp((vP.y + uH * 0.5) / uH, 0.0, 1.0);
        float bottom = pow(1.0 - h, 2.6);
        float ang = atan(vP.z, vP.x);
        float caust = 0.5 + 0.5 * sin(vP.y * 10.0 - uTime * 1.7 + sin(ang * 5.0 + uTime * 0.7) * 1.3);
        float shaft = smoothstep(0.35, 1.0, ndv);
        vec3 col; float a;
        if (uFront > 0.5) {
          col = mix(uColor, vec3(1.0), 0.35) + vec3(fres * 0.2);
          a = uAlpha + fres * 0.26 + bottom * 0.05 * uGlow;
        } else {
          col = uColor * (0.56 + 0.3 * shaft + bottom * uGlow * 0.5 + caust * 0.1 * uGlow) * mix(0.78, 1.0, uLight);
          a = uAlpha * (0.8 + 0.2 * shaft) + bottom * 0.1 * uGlow;
        }
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.95));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, t, key: '' };
}
// Attention Agents: agents live in a cyber cafe, so every "tube" is now a PC booth (cafe3d.js, same interface).
// The glass tube below is kept as legacyTube for old tools.
export function buildTube(opts = {}) { return buildBooth(opts); }
export function legacyTube({ finish = 'light', fluid = '#62e6cf', floorGlow = false, screen = true, lite = false } = {}) {
  const grp = new THREE.Group(), upper = new THREE.Group(); grp.add(upper);
  const light = finish === 'light';
  const metal = new THREE.MeshPhysicalMaterial({ color: light ? '#eef1f4' : '#27313a', metalness: light ? .15 : .75, roughness: light ? .28 : .32, clearcoat: .8, clearcoatRoughness: .2 });
  const trim = new THREE.MeshPhysicalMaterial({ color: light ? '#b9c2cb' : '#6a7a83', metalness: 1, roughness: .2 });
  const glow = new THREE.MeshStandardMaterial({ color: fluid, emissive: new THREE.Color(fluid), emissiveIntensity: 2 });
  const glass = glassMaterial(light);
  const liquid = liquidMaterial(fluid, light), liquidF = liquidMaterial(fluid, light, true);
  const surfMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(fluid).lerp(new THREE.Color('#ffffff'), .35), transparent: true, opacity: light ? .3 : .24, depthWrite: false });
  const floorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(fluid).multiplyScalar(light ? .9 : .62), transparent: true, opacity: .7 });
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, clearcoat: 1, transparent: true, opacity: light ? .55 : .45, depthWrite: false });
  const cordMat = new THREE.MeshPhysicalMaterial({ color: '#f4b9c8', roughness: .4, clearcoat: .6, sheen: .6, sheenColor: new THREE.Color('#ffd9e2') });

  const mesh = (gm, m, y = 0, parent = grp) => { const x = new THREE.Mesh(gm, m); x.position.y = y; parent.add(x); return x; };
  mesh(once('t-base', () => new THREE.CylinderGeometry(.92, .98, .5, 72)), metal, .25);
  mesh(once('t-foot', () => new THREE.CylinderGeometry(1.0, 1.0, .05, 72)), trim, .025);
  const ring = mesh(once('t-ring', () => new THREE.TorusGeometry(.835, .028, 12, 96)), glow, .5); ring.rotation.x = Math.PI / 2;
  mesh(once('t-floor', () => new THREE.CylinderGeometry(.745, .745, .02, 56)), floorMat, .51);
  const rimLow = mesh(once('t-rim', () => new THREE.TorusGeometry(.79, .045, 12, 96)), trim, .53); rimLow.rotation.x = Math.PI / 2;
  const liq = mesh(once('t-liq', () => new THREE.CylinderGeometry(.745, .745, LIQ_TOP - LIQ_BOTTOM, 64, 1, true)), liquid, LIQ_MID); liq.renderOrder = 0;
  const liqF = mesh(once('t-liq', () => new THREE.CylinderGeometry(.745, .745, LIQ_TOP - LIQ_BOTTOM, 64, 1, true)), liquidF, LIQ_MID); liqF.renderOrder = 2;
  const surf = mesh(once('t-surf', () => new THREE.CircleGeometry(.745, 56)), surfMat, LIQ_TOP); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 2;
  const rimTop = mesh(once('t-rim', () => new THREE.TorusGeometry(.79, .045, 12, 96)), trim, 3.08, upper); rimTop.rotation.x = Math.PI / 2;
  const gl = mesh(once('t-glass', () => new THREE.CylinderGeometry(.78, .78, 2.56, 96, 1, true)), glass, .53 + 1.28, upper); gl.renderOrder = 3;
  mesh(once('t-cap', () => new THREE.CylinderGeometry(.86, .92, .34, 72)), metal, 3.27, upper);
  mesh(once('t-capring', () => new THREE.CylinderGeometry(.93, .93, .05, 72)), trim, 3.12, upper);
  mesh(once('t-knob', () => new THREE.CylinderGeometry(.16, .2, .2, 32)), trim, 3.54, upper);
  mesh(once('t-port', () => new THREE.CylinderGeometry(.07, .09, .08, 16)), trim, 3.07, upper);
  if (!lite) {
    [Math.PI * .3, -Math.PI * .3, Math.PI].forEach((a) => { const rod = mesh(once('t-rod', () => new THREE.CylinderGeometry(.026, .026, 2.62, 12)), trim, 1.81, upper); rod.position.x = Math.sin(a) * .87; rod.position.z = Math.cos(a) * .87; });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + .3; const b = mesh(once('t-bolt', () => new THREE.CylinderGeometry(.03, .03, .03, 10)), trim, .515); b.position.x = Math.sin(a) * .9; b.position.z = Math.cos(a) * .9; }
  }
  let scr = null;
  if (screen && !lite) {
    scr = screenTexture();
    const panel = mesh(once('t-screen', () => new THREE.CylinderGeometry(.962, .962, .2, 32, 1, true, -.6, 1.2)), new THREE.MeshBasicMaterial({ map: scr.t, toneMapped: false }), .27);
    panel.renderOrder = 1;
  }
  if (floorGlow) {
    const fg = new THREE.Mesh(once('t-fg', () => new THREE.PlaneGeometry(4.4, 4.4)), new THREE.MeshBasicMaterial({ map: glowTexture(), color: fluid, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }));
    fg.rotation.x = -Math.PI / 2; fg.position.y = .006; grp.add(fg); grp.userData.floorGlow = fg;
  }
  const N = lite ? 0 : 18;
  const bubbles = N ? new THREE.InstancedMesh(SPH(), bubbleMat, N) : null;
  if (bubbles) { bubbles.renderOrder = 1; grp.add(bubbles); }
  const CORD = 22, cord = new THREE.InstancedMesh(SPH(), cordMat, CORD); cord.visible = false; grp.add(cord);
  const r = rng(fluid.length * 31 + Math.floor(Math.random() * 1e6));
  const bd = Array.from({ length: N }, () => { const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * .6; return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, y0: r(), v: .12 + r() * .2, s: .016 + r() * .03, ph: r() * 6 }; });
  const slot = new THREE.Group(); grp.add(slot);
  const dummy = new THREE.Object3D(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), pq = new THREE.Vector3();
  const SPAN = LIQ_TOP - LIQ_BOTTOM;
  const tube = {
    grp, slot, upper, glow, liquid, ring, fluid, boost: 0, flash: 0, creature: null, awake: true, clock: 0,
    level: 1, _level: 1, lift: 0, _lift: 0, mode: null, bt: 0, exitDir: 1, breakoutLen: 6,
    setFluid(c) {
      glow.color.set(c); glow.emissive.set(c); liquid.uniforms.uColor.value.set(c); liquidF.uniforms.uColor.value.set(c);
      surfMat.color.set(c).lerp(new THREE.Color('#ffffff'), .35); floorMat.color.set(c).multiplyScalar(light ? .9 : .62);
      grp.userData.floorGlow?.material.color.set(c); this.fluid = c; if (scr) scr.key = '';
    },
    setLevel(v, instant) { this.level = clamp(v, 0, 1); if (instant) this._level = this.level; },
    setEvo(e) { const u = this.creature?.userData.creature; if (u) u.setEvo(e); },
    setCreature(root) { disposeCreature(this.creature); this.creature = root; if (root) slot.add(root); },
    resetScreen() { if (scr) scr.key = ''; },
    setScreen(left, right) {
      if (!scr) return; const key = left + '|' + right; if (key === scr.key) return; scr.key = key;
      const x = scr.c.getContext('2d'), w = scr.c.width, h = scr.c.height;
      x.fillStyle = '#071012'; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 1);
      x.font = '600 34px "Martian Mono", ui-monospace, Menlo, monospace'; x.textBaseline = 'middle';
      x.fillStyle = this.fluid; x.textAlign = 'left'; x.fillText(left, 26, h / 2 + 2);
      x.fillStyle = '#e8f6f3'; x.textAlign = 'right'; x.fillText(right, w - 26, h / 2 + 2);
      scr.t.needsUpdate = true;
    },
    // the coin bonded: drain, lift the glass, hop out, walk away
    breakout(onDone) { if (this.mode === 'breakout') return; this.mode = 'breakout'; this.bt = 0; this.onBreakout = onDone; this.flash = 1; },
    stepBreakout(dt) {
      this.bt += dt; const b = this.bt, root = this.creature;
      this.level = 0;
      if (b < 1) this.flash = Math.max(this.flash, .5);
      if (b > 1.0) this.lift = 1;
      if (root) {
        const u = root.userData.creature;
        if (b > 1.9) {
          if (!root.userData.free) { root.userData.free = true; root.userData.hop0 = root.position.clone(); }
          const k = clamp((b - 1.9) / .6, 0, 1), dir = this.exitDir;
          if (k < 1) {
            root.position.z = lerp(root.userData.hop0.z, 1.6, k);
            root.position.y = lerp(root.userData.hop0.y, 0, k) + Math.sin(k * Math.PI) * 1.05;
            root.rotation.y = lerp(root.rotation.y, 0, Math.min(1, dt * 8));
            u.walk = 0; if (k < .15) u.poke = 1;
          } else {
            const wt = b - 2.5;
            root.position.y = 0; root.position.z = 1.6;
            root.rotation.y = lerp(root.rotation.y, dir * Math.PI / 2, Math.min(1, dt * 5));
            root.position.x += dir * 1.35 * clamp(wt * 2, 0, 1) * dt;
            u.walk = clamp(wt * 3, 0, 1); u.walkPhase += dt * 8;
          }
        }
      }
      if (b > this.breakoutLen) { this.mode = null; this.lift = 0; const c = this.creature; this.creature = null; const cb = this.onBreakout; this.onBreakout = null; cb?.(c); }
    },
    update(t, dt) {
      const awake = this.awake !== false;
      this.boost = Math.max(0, this.boost - dt * .8); this.flash = Math.max(0, this.flash - dt * .7);
      this.clock += dt * (awake ? 1 : .12) * (1 + this.boost * 5);
      if (this.mode === 'breakout') this.stepBreakout(dt);
      this._level = lerp(this._level, this.level, Math.min(1, dt * (this.mode === 'breakout' ? 2.6 : 1.4)));
      this._lift = lerp(this._lift, this.lift, Math.min(1, dt * 2.2));
      const L = Math.max(.002, this._level);
      liq.scale.y = L; liq.position.y = LIQ_BOTTOM + SPAN * L / 2; liq.visible = this._level > .01;
      liqF.scale.y = L; liqF.position.y = liq.position.y; liqF.visible = liq.visible;
      surf.position.y = LIQ_BOTTOM + SPAN * L; surf.visible = this._level > .02;
      upper.position.y = this._lift * 3.3;
      if (bubbles) {
        const range = Math.max(0, SPAN * L - .08);
        bd.forEach((b, i) => {
          const y = LIQ_BOTTOM + .03 + (((b.y0 + this.clock * b.v / SPAN) % 1 + 1) % 1) * range;
          dummy.position.set(b.x + Math.sin(t * 2 + b.ph) * .03, y, b.z);
          dummy.scale.setScalar(range < .05 ? 0 : awake || this.boost > 0 ? b.s : b.s * .5); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix);
        });
        bubbles.instanceMatrix.needsUpdate = true;
      }
      glow.emissiveIntensity = (awake ? 2 : .4) + this.flash * 5 + this.boost * 2;
      liquid.uniforms.uTime.value = liquidF.uniforms.uTime.value = t;
      liquid.uniforms.uGlow.value = liquidF.uniforms.uGlow.value = (awake ? 1 : .3) + this.flash * 1.4;
      floorMat.opacity = awake ? .7 : .25;
      if (grp.userData.floorGlow) grp.userData.floorGlow.material.opacity = (awake ? .45 : .1) + this.flash * .5;
      const root = this.creature; if (!root) { cord.visible = false; return; }
      const u = root.userData.creature, sc = root.userData.scale ?? (u.tubeScale ? u.tubeScale(u.evo) : tubeScale(u.evo));
      if (!root.userData.free) {
        const depth = SPAN * L, cy = u.c.y * sc;
        const bob = Math.sin(t * 1.1 + u.phase) * .07 * clamp(depth - 2 * cy, 0, 1);
        const target = u.asleep || this.mode === 'breakout' ? LIQ_BOTTOM + .02 : Math.max(LIQ_BOTTOM + .02, LIQ_BOTTOM + depth / 2 - cy + bob);
        root.position.y = lerp(root.position.y || target, target, Math.min(1, dt * 2));
        root.rotation.y = Math.sin(t * .3 + u.phase) * .35 * (1 - (root.userData.evoYaw || 0) / 1.15) + (root.userData.yaw || 0) + (root.userData.evoYaw || 0);
      }
      const pop = root.userData.pop ?? 1;
      if (pop < 1) root.userData.pop = Math.min(1, pop + dt * 1.6);
      const k = pop < 1 ? 1 + Math.sin(pop * Math.PI) * .22 * (1 - pop) : 1;
      root.scale.setScalar(sc * k);
      // the feeding cord from the cap to the embryo's belly
      const cordK = u.species ? 0 : (1 - smooth(.45, .62, u.evo)) * (1 - this._lift) * (root.userData.free ? 0 : 1); // cast agents have no feeding cord
      cord.visible = cordK > .02;
      if (cord.visible) {
        const ry = root.rotation.y, s = root.scale.x;
        p0.set(0, 3.03, 0);
        p2.set(Math.sin(ry) * u.rs * .7 * s, root.position.y + u.c.y * .82 * s, Math.cos(ry) * u.rs * .7 * s);
        p1.set((p0.x + p2.x) / 2 + .3, (p0.y + p2.y) / 2 + .05 + Math.sin(t * .9) * .05, (p0.z + p2.z) / 2 + .22);
        for (let i = 0; i < CORD; i++) {
          const q = i / (CORD - 1), a = (1 - q) * (1 - q), b = 2 * (1 - q) * q, c2 = q * q;
          pq.set(p0.x * a + p1.x * b + p2.x * c2, p0.y * a + p1.y * b + p2.y * c2, p0.z * a + p1.z * b + p2.z * c2);
          dummy.position.copy(pq); dummy.scale.setScalar(.038 * cordK * (1 + .25 * Math.sin(t * 6 - i * .8))); dummy.updateMatrix(); cord.setMatrixAt(i, dummy.matrix);
        }
        cord.instanceMatrix.needsUpdate = true;
      }
      u.update(t, dt);
    },
  };
  grp.userData.tube = tube;
  return tube;
}
export function fillTube(tube, genes, { evo = 0, age = 0, scale, lite = false } = {}) {
  const c = buildCreature(genes, { evo, age, lite });
  if (scale !== undefined) c.userData.scale = scale;
  c.userData.pop = 0;
  c.position.y = LIQ_BOTTOM + .02;
  tube.setCreature(c); tube.flash = 1; tube.boost = 1;
  return c;
}
// shadows on/off for a whole subtree
export function castShadows(obj, cast = true, receive = false) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } }); }

// ---------------------------------------------------------------- lab dressing
// the lab is now the cyber cafe (cafe3d.js); the dark lab below is legacyLabRoom
export function buildLabRoom(scene, opts = {}) { return buildCafeRoom(scene, { ...opts, bg: '#241a35' }); }
export function legacyLabRoom(scene, { width = 220, bg = '#0b1517' } = {}) {
  scene.fog = new THREE.Fog(bg, 11, 28);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, 40), new THREE.MeshPhysicalMaterial({ color: '#0e1a1e', roughness: .35, metalness: .4, clearcoat: .6, clearcoatRoughness: .3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -6); scene.add(floor);
  const lines = new THREE.Group();
  const lm = new THREE.MeshBasicMaterial({ color: '#173036', transparent: true, opacity: .55 });
  for (let i = -6; i < 3; i++) { const l = new THREE.Mesh(once('gridline', () => new THREE.PlaneGeometry(width, .02)), lm); l.rotation.x = -Math.PI / 2; l.position.set(0, .002, i * 1.6); lines.add(l); }
  scene.add(lines);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, 16), new THREE.MeshStandardMaterial({ color: '#0c171a', roughness: .9 }));
  wall.position.set(0, 7, -9); scene.add(wall);
  const n = 420, pos = new Float32Array(n * 3), r = rng(77);
  for (let i = 0; i < n; i++) pos.set([(r() - .5) * 60, r() * 5.5, -7 + r() * 9], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTexture(), color: '#bff5ea', size: .06, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);
  return { floor, dust, update(t) { dust.position.y = Math.sin(t * .2) * .15; dust.position.x = Math.sin(t * .05) * .6; } };
}

// ---------------------------------------------------------------- stage
export const stages = [];
export class Stage {
  constructor(canvas, { fov = 30, cam = [0, 1.9, 8], look = [0, 1.8, 0], dpr = 2, env = .55, clear = null, bloom = false, bloomThreshold = .86, bloomStrength = .55, exposure = 1, observe = true, size = null, ao = null, tone = 'aces', shadows = false } = {}) {
    this.canvas = canvas; this.size = size;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: clear === null, powerPreference: 'high-performance', preserveDrawingBuffer: !observe });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = tone === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = exposure; // neutral keeps the pastels true
    if (clear !== null) this.renderer.setClearColor(clear, 1);
    if (shadows) { this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.scene = new THREE.Scene();
    this.scene.environmentIntensity = env; this.hasEnv = false; // the reflections are made on first use (see ensureEnv)
    this.camera = new THREE.PerspectiveCamera(fov, 1, .1, 160);
    this.camera.position.set(...cam); this.look = new THREE.Vector3(...look); this.camera.lookAt(this.look);
    if (bloom || ao) {
      // a multisampled target, so scenes with post effects keep smooth edges
      this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      if (ao) { // ambient occlusion: soft contact shadows where things meet (the toy-diorama look)
        this.ao = new GTAOPass(this.scene, this.camera, 256, 256);
        this.ao.updateGtaoMaterial({ radius: ao.radius ?? .45, distanceExponent: 1.4, thickness: ao.thickness ?? 1.2, scale: ao.scale ?? 1.1, samples: 12 });
        this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
        this.ao.blendIntensity = ao.intensity ?? 1;
        // the AO pass draws every visible object as solid: hide sprites, see-through and glowing things from it, or
        // floating badges, glass, signs and water come out as dark cards
        const hideMore = this.ao.overrideVisibility.bind(this.ao);
        this.ao.overrideVisibility = () => { hideMore(); this.scene.traverse((o) => { const m = o.material; if (o.isSprite || o.userData.noAO || (m && !Array.isArray(m) && (m.transparent || m.blending === THREE.AdditiveBlending))) o.visible = false; }); };
        this.composer.addPass(this.ao);
      }
      if (bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), bloomStrength, .55, bloomThreshold); this.composer.addPass(this.bloom); }
      this.composer.addPass(new OutputPass());
    }
    this.tubes = []; this.inView = !observe; this.suspended = false;
    if (observe) {
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.inView = e.isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
    }
    this.resize(); stages.push(this);
  }
  lights(hemiSky, hemiGround, hemiI, keyI) {
    const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiI);
    const key = new THREE.DirectionalLight('#ffffff', keyI); key.position.set(3, 6, 6);
    const rim = new THREE.DirectionalLight('#ffe2a8', keyI * .6); rim.position.set(-5, 4, -4);
    const fill = new THREE.DirectionalLight('#cfe9ff', keyI * .35); fill.position.set(-4, 1, 5);
    this.scene.add(hemi, key, rim, fill);
  }
  resize() {
    const w = this.size ? this.size[0] : this.canvas.clientWidth, h = this.size ? this.size[1] : this.canvas.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.w = w; this.h = h;
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
    this.onResize?.(w, h);
  }
  get active() { return this.inView && !this.suspended; }
  // compile every shader this stage needs now (in parallel where the browser can), not on its first visible frame
  ensureEnv() { if (this.hasEnv) return; this.hasEnv = true; const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); }
  warm() { this.ensureEnv(); try { return this.renderer.compileAsync(this.scene, this.camera).catch(() => {}); } catch { return Promise.resolve(); } }
  // render fewer pixels when the machine can't keep up; never below 1 pixel per CSS pixel
  scaleDown() { const pr = this.renderer.getPixelRatio(); if (pr <= 1.01) return false; this.renderer.setPixelRatio(Math.max(1, pr * .8)); this.resize(); return true; }
  frame(t, dt) {
    this.ensureEnv();
    this.onFrame?.(t, dt);
    for (const tb of this.tubes) tb.update(t, dt);
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
let looping = false;
export function startLoop() {
  if (looping) return; looping = true;
  let last = performance.now(), ema = 16.7, cool = 3;
  const loop = (now) => {
    const raw = Math.min(100, now - last), dt = Math.min(.05, raw / 1000); last = now;
    const t = now / 1000;
    for (const s of stages) if (s.active) s.frame(t, dt);
    // slower than about 45 frames a second for a while: draw the visible stages at a lower resolution
    ema = ema * .94 + raw * .06; cool = Math.max(0, cool - dt);
    if (ema > 22 && !cool) { let any = false; for (const s of stages) if (s.active) any = s.scaleDown() || any; cool = any ? 2 : 6; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
