// Attention Agents in 3D: ONE simple, cute body for every agent (a glossy gumdrop with big shiny eyes, blush, nub
// feet and arms), so they read as one family and are easy to draw. Agents differ by candy colour and one small
// cyber-cafe accessory. Original design (art/cast2).
// buildAgent(genes, opts) returns a Group with the userData.creature contract the game uses:
// { mats, poke, update(t, dt), walk, walkPhase, wander, look (Vector2), asleep, H, halo, c, rs, evo, setEvo, setTier, tier }.
import * as THREE from 'three';
import { meshSDF, ellipsoid, roundCone, smin, smax, len3 } from './sdf.js';

// accessories (kept under the old name SPECIES so callers don't change)
export const SPECIES = ['headphones', 'cap', 'beanie', 'glasses', 'headset', 'bow', 'star', 'plain'];
export const COLORS = [
  { name: 'Mint', body: '#6fe0b5', deep: '#2fa37c' }, { name: 'Peach', body: '#ffb38a', deep: '#e07a4a' },
  { name: 'Lavender', body: '#b9a2ff', deep: '#7a5fe0' }, { name: 'Sky', body: '#7cc8ff', deep: '#3d8fd6' },
  { name: 'Lemon', body: '#ffe066', deep: '#e0b020' }, { name: 'Bubblegum', body: '#ff9ec7', deep: '#e0598f' },
  { name: 'Lime', body: '#b5e86b', deep: '#79b52c' }, { name: 'Coral', body: '#ff8578', deep: '#d94a3f' },
];
export const SPECIES_INFO = Object.fromEntries(SPECIES.map((s) => [s, { name: s[0].toUpperCase() + s.slice(1) }]));
export const speciesOf = (seed) => SPECIES[Math.abs(Math.floor(seed)) % SPECIES.length];
export const colorOf = (seed) => COLORS[Math.abs(Math.floor(seed * 7 + 3)) % COLORS.length];

const geoCache = new Map();
const cached = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const SPH = cached('sph', () => new THREE.SphereGeometry(1, 32, 24));
const LOW = cached('sphlow', () => new THREE.SphereGeometry(1, 16, 12));

// the body: a gumdrop — wide soft base, round dome, flat-ish bottom, two nub feet. ~1.25 tall.
const H = 1.22, CY = .6, HEAD = { y: .82, r: .56 }, TOP = 1.22;
function bodyGeo() {
  return cached('gum', () => {
    const f = (x, y, z) => {
      // a soft rounded-rectangle: straight-ish sides, round top, wide flat base (like art/cast2/family.png)
      const zz = z / .86;
      const body = smax(roundCone(x, y, zz, 0, .4, 0, 0, .72, 0, .58, .54), -(y - .03), .05); // capsule, base trimmed flat
      const feet = Math.min(ellipsoid(x - .26, y - .07, z - .12, .15, .09, .17), ellipsoid(x + .26, y - .07, z - .12, .15, .09, .17));
      return smin(body, feet, .08);
    };
    const m = meshSDF(f, [-.68, -.05, -.62], [.68, 1.32, .62], .02), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
    g.setIndex(new THREE.BufferAttribute(m.index, 1));
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  });
}
// a point on the body surface (approx.) in direction (x, y, z) from the centre — for eyes, blush, mouth
const onBody = (obj, x, y, z, out = 0) => { const d = new THREE.Vector3(x, y - CY, z).normalize(); obj.position.copy(new THREE.Vector3(x, y, z).addScaledVector(d, out)); obj.lookAt(obj.position.clone().add(d)); return obj; };

function eye(M) {
  const grp = new THREE.Group(), ball = new THREE.Group(); grp.add(ball);
  const r = .15;
  const iris = new THREE.Mesh(SPH, M.eye); iris.scale.set(r, r * 1.18, r * .55); ball.add(iris);
  const s1 = new THREE.Mesh(LOW, M.shine); s1.scale.setScalar(r * .36); s1.position.set(r * .32, r * .4, r * .5);
  const s2 = new THREE.Mesh(LOW, M.shine); s2.scale.setScalar(r * .16); s2.position.set(-r * .3, -r * .3, r * .52);
  ball.add(s1, s2);
  const lid = new THREE.Mesh(cached('lid', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), M.skin);
  lid.scale.set(r * 1.12, r * 1.3, r * .7); lid.rotation.x = -1.25; grp.add(lid);
  return { grp, ball, lid, shine: [s1, s2] };
}

// ---------------------------------------------------------------- accessories
const ACC = {
  headphones(g, M) {
    const band = new THREE.Mesh(cached('hpBand', () => new THREE.TorusGeometry(.62, .05, 12, 40, Math.PI)), M.accent); band.position.y = HEAD.y - .1; g.add(band);
    for (const s of [-1, 1]) { const cup = new THREE.Mesh(cached('hpCup', () => new THREE.CylinderGeometry(.15, .15, .1, 24)), M.acc); cup.rotation.z = Math.PI / 2; cup.position.set(s * .6, HEAD.y - .12, 0); g.add(cup);
      const pad = new THREE.Mesh(cached('hpPad', () => new THREE.CylinderGeometry(.11, .11, .04, 20)), M.accent); pad.rotation.z = Math.PI / 2; pad.position.set(s * .66, HEAD.y - .12, 0); g.add(pad); }
    return TOP + .06;
  },
  cap(g, M) {
    const dome = new THREE.Mesh(cached('capDome', () => new THREE.SphereGeometry(.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), M.acc); dome.scale.set(1.2, .72, 1.08); dome.position.y = HEAD.y + .12; g.add(dome);
    const brim = new THREE.Mesh(cached('capBrim', () => new THREE.CylinderGeometry(.3, .3, .03, 24, 1, false, -Math.PI / 2, Math.PI)), M.acc); brim.position.set(0, HEAD.y + .14, -.5); brim.rotation.x = -.12; g.add(brim);
    const btn = new THREE.Mesh(LOW, M.accent); btn.scale.setScalar(.05); btn.position.y = HEAD.y + .43; g.add(btn);
    return TOP + .02;
  },
  beanie(g, M) {
    const dome = new THREE.Mesh(cached('bnDome', () => new THREE.SphereGeometry(.52, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), M.acc); dome.scale.set(1.16, .86, 1.04); dome.position.y = HEAD.y + .1; g.add(dome);
    const rib = new THREE.Mesh(cached('bnRib', () => new THREE.TorusGeometry(.6, .08, 12, 40)), M.acc); rib.rotation.x = Math.PI / 2; rib.scale.set(1, .88, 1); rib.position.y = HEAD.y + .1; g.add(rib);
    const pom = new THREE.Mesh(SPH, M.accent); pom.scale.setScalar(.0); pom.position.y = HEAD.y + .5; g.add(pom);
    return TOP + .14;
  },
  glasses(g, M) {
    for (const s of [-1, 1]) { const rim = new THREE.Mesh(cached('glRim', () => new THREE.TorusGeometry(.16, .022, 10, 32)), M.dark); rim.position.set(s * .27, .58, .7); g.add(rim); }
    const bridge = new THREE.Mesh(cached('glBr', () => new THREE.CylinderGeometry(.015, .015, .1, 8)), M.dark); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, .6, .72); g.add(bridge);
    return TOP;
  },
  headset(g, M) {
    const band = new THREE.Mesh(cached('hsBand', () => new THREE.TorusGeometry(.62, .04, 10, 40, Math.PI)), M.accent); band.position.y = HEAD.y - .1; g.add(band);
    const cup = new THREE.Mesh(cached('hpCup', () => new THREE.CylinderGeometry(.15, .15, .1, 24)), M.dark); cup.rotation.z = Math.PI / 2; cup.position.set(.6, HEAD.y - .12, 0); g.add(cup);
    const boom = new THREE.Mesh(cached('hsBoom', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.62, HEAD.y - .16, .08), new THREE.Vector3(.62, .42, .45), new THREE.Vector3(.3, .38, .68)]), 16, .018, 6)), M.dark); g.add(boom);
    const mic = new THREE.Mesh(LOW, M.accent); mic.scale.setScalar(.05); mic.position.set(.28, .38, .7); g.add(mic);
    return TOP + .04;
  },
  bow(g, M) {
    for (const s of [-1, 1]) { const loop = new THREE.Mesh(SPH, M.pink); loop.scale.set(.17, .11, .07); loop.position.set(.3 + s * .13, HEAD.y + .34, .26); loop.rotation.z = s * .35; g.add(loop); }
    const knot = new THREE.Mesh(LOW, M.pink); knot.scale.setScalar(.06); knot.position.set(.3, HEAD.y + .34, .3); g.add(knot);
    return TOP + .08;
  },
  star(g, M) {
    const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .05 : .11; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const st = new THREE.Mesh(cached('starSt', () => new THREE.ExtrudeGeometry(s, { depth: .015, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2 })), M.gold);
    onBody(st, .32, 1.02, .5, .0); g.add(st);
    return TOP;
  },
  plain() { return TOP; },
};

// ---------------------------------------------------------------- the agent
// genes: { seed, species? (accessory), color? }  opts: { evo 0..1 bonding progress, age (2 = legend) }
export function buildAgent(genes, { evo = 1, age = 0 } = {}) {
  const acc = SPECIES.includes(genes.species) ? genes.species : speciesOf(genes.seed || 0);
  const col = (genes.color && COLORS.find((c) => c.name === genes.color)) || colorOf(genes.seed || 0);
  const mats = [], P = (m) => (mats.push(m), m);
  const body = new THREE.Color(col.body);
  const M = {
    skin: P(new THREE.MeshPhysicalMaterial({ color: body, roughness: .28, clearcoat: 1, clearcoatRoughness: .08, sheen: .5, sheenColor: new THREE.Color('#ffffff'), emissive: body.clone(), emissiveIntensity: .06 })),
    eye: P(new THREE.MeshPhysicalMaterial({ color: '#2a1d3a', roughness: .15, clearcoat: 1 })),
    shine: P(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })),
    blush: P(new THREE.MeshStandardMaterial({ color: '#ff7f9d', transparent: true, opacity: .55, roughness: 1, depthWrite: false })),
    mouth: P(new THREE.MeshStandardMaterial({ color: '#5a1a2e', roughness: .6 })),
    tongue: P(new THREE.MeshStandardMaterial({ color: '#ff7f98', roughness: .5 })),
    acc: P(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col.deep), roughness: .35, clearcoat: .7 })),
    accent: P(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .4, clearcoat: .5 })),
    dark: P(new THREE.MeshPhysicalMaterial({ color: '#2f3350', roughness: .35, clearcoat: .6 })),
    pink: P(new THREE.MeshPhysicalMaterial({ color: '#ff6fa8', roughness: .3, clearcoat: .8 })),
    gold: P(new THREE.MeshPhysicalMaterial({ color: '#ffc531', metalness: .6, roughness: .25, clearcoat: .8 })),
    sparkle: P(new THREE.MeshStandardMaterial({ color: '#e6ddff', emissive: new THREE.Color('#b9a6ff'), emissiveIntensity: .25, transparent: true, opacity: .55 })), // soft, never a glare
    ring: P(new THREE.MeshBasicMaterial({ color: '#c9b4ff', transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide })),
    gem: P(new THREE.MeshPhysicalMaterial({ color: '#ff3d6e', roughness: .05, clearcoat: 1, emissive: new THREE.Color('#ff3d6e'), emissiveIntensity: .4 })),
    beam: P(new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide })),
  };
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const u = { g: { ...genes, species: acc, color: col.name }, species: acc, color: col, mats, rig, eyes: [], arms: [], poke: 0, look: new THREE.Vector2(), wander: true, asleep: false, walk: 0, walkPhase: 0, H, halo: null, phase: ((genes.seed || 1) % 97) / 15 };
  root.userData.creature = u;
  rig.add(new THREE.Mesh(bodyGeo(), M.skin));
  // face: big eyes low and wide, blush under them, a small open smile between
  for (const s of [-1, 1]) {
    const e = eye(M); onBody(e.grp, s * .27, .58, .62, -.05); rig.add(e.grp); u.eyes.push(e);
    const b = new THREE.Mesh(SPH, M.blush); b.scale.set(.085, .05, .02); onBody(b, s * .43, .47, .55, -.01); rig.add(b);
  }
  // a little "ω" mouth
  const mouth = new THREE.Group();
  const w = new THREE.CatmullRomCurve3([[-.09, .025], [-.06, -.02], [-.025, -.02], [0, .01], [.025, -.02], [.06, -.02], [.09, .025]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  mouth.add(new THREE.Mesh(cached('omega', () => new THREE.TubeGeometry(w, 40, .013, 6)), M.mouth));
  onBody(mouth, 0, .47, .7, -.03); rig.add(mouth); u.mouth = mouth;
  // nub arms
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * .58, .45, .04); rig.add(pivot);
    const arm = new THREE.Mesh(SPH, M.skin); arm.scale.set(.11, .15, .11); arm.position.set(s * .02, -.05, 0); pivot.add(arm);
    u.arms.push({ pivot, side: s });
  }
  const top = ACC[acc](rig, M);

  // ---- fame: market cap is attention. Each tier is visibly bigger and flashier.
  //   0 Rookie · 1 Rising (sparkles) · 2 Famous (gold medallion, glowing floor ring) · 3 Legend (crown, spotlight)
  const fx = { sparkles: [] };
  const star = cached('fameStar2', () => new THREE.OctahedronGeometry(.032, 0));
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(star, M.sparkle); m.visible = false; root.add(m); fx.sparkles.push(m); }
  { const g = new THREE.Group(); const chain = new THREE.Mesh(cached('chain', () => new THREE.TorusGeometry(.17, .018, 8, 32, Math.PI)), M.gold); chain.rotation.z = Math.PI; chain.position.y = .12; g.add(chain);
    const coin = new THREE.Mesh(cached('medal', () => new THREE.CylinderGeometry(.09, .09, .025, 24)), M.gold); coin.rotation.x = Math.PI / 2; g.add(coin);
    g.position.set(0, .2, .63); g.scale.setScalar(.8); g.visible = false; rig.add(g); fx.medal = g; }
  { const r = new THREE.Mesh(cached('fameRing', () => new THREE.RingGeometry(.6, .78, 48)), M.ring); r.rotation.x = -Math.PI / 2; r.position.y = .02; r.visible = false; root.add(r); fx.ring = r; }
  { const g = new THREE.Group();
    g.add(new THREE.Mesh(cached('crownBand', () => new THREE.CylinderGeometry(.19, .21, .1, 24, 1, true)), M.gold));
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(cached('crownSpike', () => new THREE.ConeGeometry(.05, .14, 10)), M.gold); const a = i / 5 * Math.PI * 2; sp.position.set(Math.sin(a) * .19, .11, Math.cos(a) * .19); g.add(sp); const gem = new THREE.Mesh(LOW, M.gem); gem.scale.setScalar(.03); gem.position.set(Math.sin(a) * .2, .0, Math.cos(a) * .2); g.add(gem); }
    g.position.set(0, top + .08, 0); g.rotation.z = -.12; g.visible = false; rig.add(g); fx.crown = g; }
  { const b = new THREE.Mesh(cached('beam', () => new THREE.CylinderGeometry(.35, 1.1, 6, 32, 1, true)), M.beam); b.position.y = 3; b.visible = false; root.add(b); fx.beam = b; }
  const SCALE = [.85, 1, 1.15, 1.32];
  u.tier = 0;
  u.setTier = (n) => {
    n = Math.max(0, Math.min(3, Math.round(n))); u.tier = n; root.scale.setScalar(SCALE[n]);
    fx.sparkles.forEach((m, i) => { m.visible = n >= 2 && i < (n === 2 ? 1 : 2); }); // a faint mote or two, from Famous up
    fx.medal.visible = n >= 2; fx.ring.visible = n >= 2; fx.crown.visible = n >= 3; fx.beam.visible = n >= 3;
    M.skin.emissiveIntensity = [.06, .09, .12, .16][n];
  };
  u.c = new THREE.Vector3(0, CY, 0); u.rs = .62;
  u.setEvo = (e) => { const k = Math.max(0, Math.min(1, e)); u.evo = k; u.setTier(k >= 1 ? (age >= 2 ? 3 : 2) : k >= .25 ? 1 : 0); };
  u.setEvo(evo);

  u.strideFor = (w) => .3 + .1 * w;
  u.update = (t, dt) => {
    u.poke = Math.max(0, u.poke - dt * 2.4); const pk = u.poke, w = u.walk, wp = u.walkPhase, ph = u.phase;
    const br = Math.sin(t * (u.asleep ? 1.1 : 2.1) + ph);
    const sq = 1 + br * .03 + pk * .18 * Math.sin(pk * 9) + Math.abs(Math.sin(wp)) * .06 * w;
    rig.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    rig.position.y = Math.abs(Math.sin(wp)) * .14 * w;
    rig.rotation.z = Math.sin(t * .8 + ph) * .04 + Math.sin(wp) * .1 * w;
    rig.rotation.x = .06 * w;
    if (u.wander) u.look.set(Math.sin(t * .53 + ph * 1.7) * .6, Math.sin(t * .41 + ph * 2.3) * .35);
    const period = 3.1 + ((genes.seed || 0) % 9) * .3, bp = ((t + ph * 3) % period) / .2;
    let close = bp < 1 ? Math.sin(bp * Math.PI) : 0; if (u.asleep) close = 1;
    for (const ey of u.eyes) { ey.lid.rotation.x = -1.25 + close * 2.5; ey.ball.rotation.y = u.look.x * .3; ey.ball.rotation.x = -u.look.y * .25; ey.shine.forEach((s) => { s.visible = close < .6; }); }
    u.mouth.scale.set(1, u.asleep ? .3 : 1 + pk * .8, 1);
    for (const a of u.arms) { a.pivot.rotation.z = a.side * (.2 + pk * 1.2 + Math.sin(t * 2.2 + ph + a.side) * .12); a.pivot.rotation.x = Math.sin(wp + (a.side > 0 ? Math.PI : 0)) * .8 * w; }
    fx.sparkles.forEach((m, i) => { if (!m.visible) return; const a = t * 1.6 + i * Math.PI / 2; m.position.set(Math.cos(a) * .8, H * .6 + Math.sin(t * 2 + i) * .2, Math.sin(a) * .8); m.rotation.y = t * 3; });
    if (fx.ring.visible) fx.ring.material.opacity = .15 + Math.sin(t * 2.4) * .04;
    if (fx.medal.visible) fx.medal.rotation.y = Math.sin(t * 1.3) * .25;
  };
  return root;
}
export function disposeAgent(root) { if (!root) return; root.parent?.remove(root); root.userData.creature.mats.forEach((m) => { m.map?.dispose?.(); m.dispose(); }); }
export { len3 };
