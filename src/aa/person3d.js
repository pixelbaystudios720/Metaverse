// The player: a chibi "net kid", a regular of the cyber cafe. Our own design: an oversized hoodie (hood up by
// default, a soft round hood framing the face), big over-ear headphones whose cups carry a glowing LED ring,
// baggy joggers gathered at the ankle and chunky high-top sneakers on a cream sole with a thin glowing stripe.
// The head is about 44% of their height, like the cute Agents. The hood, hoodie, sleeves, joggers, shoes and hair
// are sculpted with signed-distance shapes (sdf.js), so the hood has a real opening with a rolled rim, the
// sleeves have open cuffs the hands peek out of and the shoes have a toe cap and a high collar. Matte cloth, soft
// shading; the LED bits are unlit and brighter than white so the bloom outside picks them up.
// It has the same interface the Agents have (walk, walkPhase, poke, update, H), so the game can drive either;
// `strideFor` tells the game how far one radian of walk phase carries the feet.
// `look` is a flat object of short strings (it goes over the network): colours are '#rrggbb', the rest are words.
import { THREE, clamp } from './agents3d.js';
import { meshSDF, chain, ellipsoid, roundCone, smin, smax, smooth, mix, len2, len3 } from './sdf.js';
import { HumanAvatarManager, CHARACTER_CATALOG } from '../player/human_avatar_system.js';

export const LOOK_OPTIONS = {
  skin: ['#ffc7a6', '#f6b896', '#eaab83', '#d08f63', '#ad7049', '#7d5136'],
  hair: ['#3b2a24', '#735442', '#e2b766', '#c8613d', '#f2a3b8', '#8f7ad9', '#6fd3e0'],
  style: ['hood', 'ears', 'down'],
  hoodie: ['#8f7cf2', '#ff9ec0', '#6fd6bd', '#ffd36e', '#7cb8ff', '#e8e4dc', '#3a3c52'],
  pants: ['#33364d', '#4b4e5c', '#9aa0b4', '#6b7a45', '#1f1e26', '#c9b8a0'],
  kicks: ['#dcd8d0', '#2c2a33', '#ff6f91', '#ffd36e', '#7fd6c2', '#6aa8ff', '#e2574c'],
  glow: ['#3ff0e0', '#ff4fd8', '#b47cff', '#7dff6a', '#ffb13b', '#ff4a5e'],
};
export const LOOK_LABEL = { skin: 'Skin', hair: 'Hair', style: 'Hood', hoodie: 'Hoodie', pants: 'Joggers', kicks: 'Kicks', glow: 'Glow' };
export const OPTION_LABEL = { hood: 'Hood up', ears: 'Cat hood', down: 'Hood down' };
export const DEFAULT_LOOK = { skin: '#ffc7a6', hair: '#3b2a24', style: 'hood', hoodie: '#8f7cf2', pants: '#33364d', kicks: '#dcd8d0', glow: '#b47cff' };
export function randomLook(r = Math.random) { const o = {}; for (const [k, v] of Object.entries(LOOK_OPTIONS)) o[k] = v[Math.floor(r() * v.length)]; return o; }

const HEAD = { x: .3, y: .275, z: .28 }, HC = 1.06;  // head radii and the head centre's height
const HIP = .29, ANK = .1, LEG = HIP - ANK;          // leg pivot (inside the joggers), ankle height
const TILT = .4, SH = { x: .138, y: .64 };           // arms angle away from the body; shoulder pivots
const UPPER = .14, FORE = .1, BEND = .32;            // arm lengths and the relaxed elbow
const A = .7, AMAX = .85;                            // leg swing at a full walk (walk = 1), radians; a run sets walk above 1
// the outside of the hood (and of the hair when the hood is down): the headphones sit on it
const HO = { x: .365, y: .35, z: .355, cy: .015, cz: -.015 };
const CUP = { x: .398, y: -.035, r: .098, w: .036 };  // ear cup centre (x), height, radius and half-thickness
const PI = Math.PI;
const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
const SPH = () => once('sph', () => new THREE.SphereGeometry(1, 32, 24));
// lite (other players, see buildPerson): the same shapes sampled half as finely, about a quarter of the triangles
let LITE = false;
function geo(key, f, min, max, h) {
  if (LITE) { key += '~lite'; h *= 2; }
  return once(key, () => {
    const m = meshSDF(f, min, max, h), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.position, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3)); g.setIndex(new THREE.BufferAttribute(m.index, 1));
    g.name = key; g.computeBoundingSphere(); return g;
  });
}
// an ellipse in 2D (a close bound, like ellipsoid)
const ell2 = (x, z, rx, rz) => { const k0 = len2(x / rx, z / rz), k1 = len2(x / (rx * rx), z / (rz * rz)); return k1 === 0 ? -Math.min(rx, rz) : (k0 * (k0 - 1)) / k1; };
// a slab between heights y0 and y1 whose outline is the 2D distance d2, with rounded edges of radius rr
const slab = (d2, y, y0, y1, rr) => { const a = d2 + rr, b = Math.abs(y - (y0 + y1) / 2) - (y1 - y0) / 2 + rr; return Math.min(Math.max(a, b), 0) + len2(Math.max(a, 0), Math.max(b, 0)) - rr; };

// ------------------------------------------------------------------------------------------------ hair
// A point on the head, at azimuth th (0 = the face, +x = the character's left) and elevation ph, pushed `off`
// out along the surface normal.
function onHead(th, ph, off = 0) {
  const x = HEAD.x * Math.cos(ph) * Math.sin(th), y = HEAD.y * Math.sin(ph), z = HEAD.z * Math.cos(ph) * Math.cos(th);
  const nx = x / HEAD.x ** 2, ny = y / HEAD.y ** 2, nz = z / HEAD.z ** 2, l = len3(nx, ny, nz);
  return [x + (nx / l) * off, y + (ny / l) * off, z + (nz / l) * off];
}
// A lock: a tapered chain of round cones along a curve over the head. It is broad at the root, narrows to a
// rounded tip, and its top sits `t0` above the skin until it leaves the crown, then settles to `t1` at the tip.
function lock([[a0, b0], [a1, b1], [a2, b2]], r0, { rt = .014, t0 = .074, t1 = .03, fall = .4, n = 8 } = {}) {
  const pts = [];
  for (let s = 0; s <= n; s++) {
    const u = s / n, w0 = (1 - u) ** 2, w1 = 2 * u * (1 - u), w2 = u * u;
    const th = w0 * a0 + w1 * a1 + w2 * a2, ph = w0 * b0 + w1 * b1 + w2 * b2;
    const r = rt + (r0 - rt) * Math.pow(1 - u * u, .9), top = mix(t0, t1, smooth(fall, 1, u));
    pts.push([...onHead(th, ph, top - r), r]);
  }
  return chain(pts);
}
// hood down: short, swept hair with a soft V at the nape (the cups cover the ears)
const SWEPT = () => [
  lock([[.55, 1.2], [.1, .82], [-.52, .17]], .09, { t1: .032 }),
  lock([[.9, 1.1], [.45, .75], [-.08, .3]], .08),
  lock([[1.2, .95], [.9, .65], [.45, .4]], .07),
  lock([[-.25, 1.1], [-.7, .7], [-.98, .02]], .08, { t1: .032 }),
  lock([[-1.15, .6], [-1.25, .2], [-1.32, -.24]], .075, { rt: .02, t1: .034 }),
  lock([[1.15, .6], [1.25, .2], [1.33, -.2]], .075, { rt: .02, t1: .034 }),
  lock([[PI, .8], [PI, 0], [PI, -.9]], .12, { rt: .03, t1: .075, fall: .5, n: 11 }),
  lock([[PI - .6, .75], [PI - .65, 0], [PI - .75, -.74]], .11, { rt: .028, t1: .068, fall: .5, n: 11 }),
  lock([[PI + .6, .75], [PI + .65, 0], [PI + .75, -.74]], .11, { rt: .028, t1: .068, fall: .5, n: 11 }),
  lock([[PI - 1.15, .65], [PI - 1.2, .1], [PI - 1.3, -.45]], .09, { rt: .024, t1: .055, fall: .5 }),
  lock([[PI + 1.15, .65], [PI + 1.2, .1], [PI + 1.3, -.45]], .09, { rt: .024, t1: .055, fall: .5 }),
];
const hairGeo = () => geo('hair', (() => {
  const locks = SWEPT(), line = (a) => mix(mix(.86, -.1, smooth(.5, 1.3, a)), -.8, smooth(1.9, 2.8, a));
  return (x, y, z) => {
    let d = ellipsoid(x, y - .006, z + .006, HEAD.x + .064, HEAD.y + .064, HEAD.z + .064);
    d = smin(d, ellipsoid(x, y + .1, z + .05, HEAD.x - .03, .3, HEAD.z + .03), .05);
    const ph = Math.atan2(y / HEAD.y, len2(x / HEAD.x, z / HEAD.z));
    d = smax(d, (line(Math.abs(Math.atan2(x, z))) - ph) * .3, .035);             // the cap stops at a smooth hairline
    for (const L of locks) d = smin(d, L.d(x, y, z, .05), .022);
    return d;
  };
})(), [-.46, -.5, -.46], [.46, .5, .46], .008);
// hood up: only a soft fringe peeks out from under the rim and falls over the forehead
const fringeGeo = () => geo('fringe', (() => {
  const locks = [
    ...[-.8, -.42, -.04, .34, .72].map((th, i) => lock([[th * .7 + .12, 1.1], [th * .9 + .02, .62], [th - .16, [.3, .16, .1, .18, .3][i]]], .092, { t0: .06, t1: .04, rt: .006, fall: .3, n: 8 })),
  ];
  return (x, y, z) => {
    let d = smax(ellipsoid(x, y, z, HEAD.x + .03, HEAD.y + .03, HEAD.z + .03), .15 - y, .03); // a thin cap under the hood
    for (const L of locks) d = smin(d, L.d(x, y, z, .05), .03);
    return d;
  };
})(), [-.36, -.06, -.36], [.36, .34, .36], .0095);

// ------------------------------------------------------------------------------------------------ hood and headphones
// the hood: a soft round shell over the head with an oval opening for the face, a rolled rim around it, and a
// drape down the back of the neck that disappears into the hoodie. The cat hood adds two rounded ears.
const hoodGeo = (ears) => geo('hood-' + (ears ? 'ears' : 'plain'), (x, y, z) => {
  const yo = y - HO.cy, zo = z - HO.cz, out = ellipsoid(x, yo, zo, HO.x, HO.y, HO.z);
  let d = out;
  d = smin(d, ellipsoid(x, y + .25, z + .13, .25, .12, .16), .08);                  // the drape behind the neck
  d += .0045 * (1 - smooth(.004, .014, Math.abs(x))) * smooth(.0, .08, -z);    // a seam over the crown and down the back
  d = smax(d, -ellipsoid(x, yo + .004, zo - .004, HO.x - .034, HO.y - .036, HO.z - .034), .012); // hollow
  d = smax(d, len2(x, (z + .02) * 1.04) - (.37 + (y + .1) * .55), .05);            // narrowing to the neck
  const e = ell2(x, y + .07, .262, y < -.07 ? .3 : .218);                           // the face opening, open under the chin
  d = smax(d, -Math.max(e, -z - .02), .014);
  d = smin(d, Math.max(len2(e, out + .016) - .025, -z - .04), .016);                 // its rolled rim
  if (ears) for (const sd of [-1, 1]) {
    const ear = roundCone(x, y, z, sd * .16, .24, .03, sd * .24, .405, .035, .085, .026);
    d = smin(d, smax(ear, -roundCone(x, y, z - .05, sd * .17, .27, .03, sd * .232, .385, .035, .05, .012), .01), .045); // ears with a soft dimple in front
  }
  return smax(d, -.34 - y, .02);                                                    // ends inside the hoodie
}, [-.42, -.42, -.42], [.42, .48, .42], .0105);
// the hood down: a soft roll round the back of the neck
const hoodDownGeo = () => geo('hood-down', (x, y, z) => {
  const t = smax(len2(len2(x * .95, z + .02) - .125, (y - .755) * 1.15) - .046, z - .03, .05);
  return smin(t, ellipsoid(x, y - .665, z + .165, .165, .115, .07), .05);
}, [-.24, .54, -.3], [.24, .86, .14], .006);
// over-ear headphones: two soft pucks joined by a padded band that sits a little behind the crown
const phonesGeo = () => geo('phones', (x, y, z) => {
  const ax = Math.abs(x), qy = y - CUP.y;
  const r = len2(qy, z) - CUP.r + .022, w = Math.abs(ax - CUP.x) - CUP.w + .022;
  const cup = Math.min(Math.max(r, w), 0) + len2(Math.max(r, 0), Math.max(w, 0)) - .022;
  const T = .22, zp = z * Math.cos(T) + qy * Math.sin(T);
  let band = smax(Math.abs(ellipsoid(x, y - HO.cy, z - HO.cz, HO.x + .03, HO.y + .03, HO.z + .03)) - .017, Math.abs(zp) - .03, .016);
  band = smax(band, -.01 - qy, .02);
  return smin(cup, band, .03);
}, [-.47, -.17, -.24], [.47, .44, .16], .0075);

// ------------------------------------------------------------------------------------------------ clothes
// the hoodie: roomy, softly tapered, a fuller ribbed hem, a kangaroo pocket and a little collar
const hoodieGeo = () => geo('hoodie', (x, y, z) => {
  let d = roundCone(x, y, z / .86, 0, .45, 0, 0, .63, 0, .2, .148) * .86;
  d = smin(d, ellipsoid(x, y - .615, z + .005, .182, .1, .135), .05);              // round shoulders
  d = smax(d, .33 - y, .018);                                                       // the hem
  d -= .008 * (1 - smooth(.36, .378, y));                                           // ...in a fuller rib band
  const pw = .118 - (y - .39) * .32, pm = smooth(-.012, .006, -Math.max(Math.abs(x) - pw, y - .52, .392 - y));
  d -= .009 * pm * smooth(.0, .06, z);                                              // the pocket
  d = smin(d, len2(len2(x, z - .004) - .084, y - .768) - .026, .02);                // the collar
  return d;
}, [-.32, .3, -.26], [.32, .82, .26], .0075);
// the joggers' seat: one shape that splits into two legs (the swinging legs carry on from there)
const pantsGeo = () => geo('pants', (x, y, z) => {
  const body = smax((len2(x / .175, z / .135) - 1) * .135, .3 - y, .03);
  const legs = Math.min(...[-1, 1].map((sd) => roundCone(x, y, z, sd * .09, .36, 0, sd * .092, .27, 0, .074, .066)));
  let d = smin(body, legs, .03);
  d = smax(d, .27 - y, .01); d = smax(d, y - .42, .01);
  return d;
}, [-.26, .2, -.2], [.26, .46, .2], .008);
// a jogger leg (unit height, the hip at +.5 and the ankle at -.5): baggy, bunched above an elastic cuff
const legGeo = () => once('leg', () => new THREE.LatheGeometry([[0, 1], [.05, .98], [.072, .9], [.073, .5], [.071, .25], [.074, .02], [.07, -.06], [.058, -.1], [.062, -.13], [.062, -.27], [.056, -.31], [.05, -.5], [0, -.56]].map(([r, y]) => new THREE.Vector2(r, y)), 28));
// a chunky high-top (ankle at the origin, toe along +z): a rounded upper with a high padded collar
const shoeGeo = () => geo('kick', (x, y, z) => {
  let d = smin(ellipsoid(x, y + .042, z + .028, .074, .06, .074), ellipsoid(x, y + .05, z - .056, .077, .048, .102), .04);
  d = smin(d, roundCone(x, y, z, 0, -.04, -.012, 0, .012, -.016, .066, .063), .03);  // the high top
  d = smax(d, y - .03, .022);                                                       // its soft, padded top edge
  d = smax(d, -.074 - y, .006);                                                     // it sits on the sole
  d = smax(d, -ellipsoid(x, y - .04, z + .014, .05, .03, .05), .012);              // the ankle opening
  return d;
}, [-.12, -.1, -.15], [.12, .07, .2], .006);
const SOLE = (x, z) => smin(ell2(x, z + .03, .08, .078), ell2(x, z - .06, .083, .1), .04);
// a thick cream sole with a rubber toe cap
const soleGeo = () => geo('kick-sole', (x, y, z) => {
  const sole = slab(SOLE(x, z), y, -.1, -.068, .01);
  const cap = smax(ellipsoid(x, y + .062, z - .098, .08, .042, .074), .05 - z, .02);
  return smin(sole, cap, .012);
}, [-.11, -.11, -.14], [.11, -.02, .2], .0055);
// a cream padded collar round the ankle opening and two laces across the top of the foot
const trimGeo = () => geo('kick-trim', (x, y, z) => {
  const collar = len2(len2(x, (z + .014) * .97) - .056, y - .022) - .0125;
  const laces = Math.min(...[[.002, .064], [-.002, .092]].map(([ly, lz]) => roundCone(x, y, z, -.026, ly, lz, .026, ly, lz, .0068, .0068)));
  return Math.min(collar, laces);
}, [-.08, -.02, -.09], [.08, .045, .12], .0038);
// the glowing stripe round the sole
const stripeGeo = () => once('kick-stripe', () => {
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 2 * PI, dx = Math.sin(a), dz = Math.cos(a); let lo = 0, hi = .2;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (SOLE(dx * m, .02 + dz * m) < 0) lo = m; else hi = m; }
    pts.push(new THREE.Vector3(dx * (lo + .001), -.084, .02 + dz * (lo + .001)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, .0042, 6, true);
});
// a sleeve (shoulder at the origin, hanging along -y, built for the left side; the right side mirrors it):
// roomy, bent at the elbow, a fuller cuff and an open end the hand peeks out of
const ARM = (() => { const ey = -UPPER, fy = -Math.cos(BEND), fz = Math.sin(BEND); return { ey, fy, fz, wy: ey + fy * FORE, wz: fz * FORE }; })();
const sleeveGeo = () => geo('sleeve', (x, y, z) => {
  const { ey, fy, fz, wy, wz } = ARM;
  let d = smin(roundCone(x, y, z, 0, .02, 0, 0, ey, 0, .066, .058), roundCone(x, y, z, 0, ey, 0, 0, wy, wz, .058, .061), .03);
  const qy = y - wy, qz = z - wz, along = qy * fy + qz * fz;                        // > 0 past the wrist
  d -= .007 * smooth(-.036, -.026, along);                                          // the cuff
  d = smax(d, along, .01);                                                          // the opening
  const radial = len3(x, qy - along * fy, qz - along * fz);
  return smax(d, -Math.max(radial - .045, -.035 - along), .006);                   // hollow near it: a real edge
}, [-.1, -.32, -.1], [.1, .1, .16], .0055);
// a mitten hand with the thumb forward, half hidden in the cuff
const handGeo = () => geo('hand', (x, y, z) => {
  const { fy, fz, wy, wz } = ARM, hy = wy + fy * .03, hz = wz + fz * .03, qy = y - hy, qz = z - hz, al = qy * fy + qz * fz, pe = qy * -fz + qz * fy;
  return smin(ellipsoid(x, al, pe, .043, .048, .04), ellipsoid(x + .026, y - (hy + .004), z - (hz + .03), .018, .022, .018), .014);
}, [-.07, -.34, -.03], [.07, -.18, .16], .0045);

// ------------------------------------------------------------------------------------------------ the person
// lite: a lighter build for the other people in the game (live presence); it looks the same from the game camera
export function buildPerson(look = DEFAULT_LOOK, { seed = 7, lite = false } = {}) {
  if (!lite) {
    try {
      const raw = localStorage.getItem('aa_human_avatar_config');
      const cfg = raw ? JSON.parse(raw) : { characterId: 'man_uploaded' };
      const charId = cfg?.characterId || 'man_uploaded';

      if (charId === 'chibi_netkid') {
        const mergedLook = {
          ...DEFAULT_LOOK,
          ...look,
          skin: cfg.skinColor || look.skin,
          hair: cfg.hairColor || look.hair,
          style: cfg.style || look.style || 'ears',
          hoodie: cfg.topColor || look.hoodie,
          pants: cfg.bottomColor || look.pants,
          kicks: cfg.shoeColor || look.kicks,
          glow: cfg.glowColor || look.glow
        };
        LITE = lite;
        try { return makePerson(mergedLook, seed); } finally { LITE = false; }
      }

      const charDef = CHARACTER_CATALOG.find(c => c.id === charId) || CHARACTER_CATALOG.find(c => c.id === 'man_uploaded');
      if (charDef) {
        const root = new THREE.Group();
        const manager = new HumanAvatarManager();

        manager.instantiateAvatar(charDef.id, cfg).then((avatar) => {
          root.add(avatar.root);
          root.userData.avatarInstance = avatar;
        }).catch((err) => {
          console.error('Failed to load avatar in buildPerson:', err);
        });

        const u = {
          strideFor: (W) => 0.45,
          rig: root,
          mats: [],
          H: charDef.targetHeight || 1.8,
          walk: 0,
          walkPhase: 0,
          poke: 0,
          wander: false,
          look: new THREE.Vector2(),
          phase: 0,
          update(t, dt) {
            if (root.userData.avatarInstance) {
              const isMoving = u.walk > 0.05;
              const isRunning = u.walk > 0.8;
              root.userData.avatarInstance.update(dt, isMoving, isRunning);
            }
          }
        };
        root.userData.creature = u;
        root.userData.look = look;
        return root;
      }
    } catch (e) {
      console.warn('Could not load custom avatar for buildPerson:', e);
    }
  }

  LITE = lite;
  try { return makePerson({ ...DEFAULT_LOOK, ...look }, seed); } finally { LITE = false; }
}
export function makePerson(look, seed = 7) {
  const mats = [];
  const M = (color, roughness = .86, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, envMapIntensity: .5, ...o }); mats.push(m); return m; };
  // the skin lights itself a little, so its shadows stay peachy rather than grey
  const skinM = M(look.skin, .62, { emissive: new THREE.Color(look.skin), emissiveIntensity: .16 }), hairM = M(look.hair, .66);
  const hoodieM = M(look.hoodie, .9, { emissive: new THREE.Color(look.hoodie), emissiveIntensity: .08 }), pantsM = M(look.pants, .92), kickM = M(look.kicks, .7), soleM = M('#e2d8c8', .9);
  const gearM = M('#2b2c3b', .42, { envMapIntensity: .9 }), cordM = M('#f7f3ec', .8);
  const eyeM = M('#2a1c17', .4, { envMapIntensity: .8 }), mouthM = M('#5b3527', .6), noseM = M(new THREE.Color(look.skin).lerp(new THREE.Color('#ff8f80'), .35), .7);
  // the LEDs: unlit and brighter than white, so they read as light and the bloom catches them
  const g = new THREE.Color(look.glow), lum = .2126 * g.r + .7152 * g.g + .0722 * g.b;
  const glowM = new THREE.MeshBasicMaterial({ color: g.multiplyScalar(clamp(1.6 / Math.max(lum, .01), 1.3, 7)) });
  const shineM = new THREE.MeshBasicMaterial({ color: '#ffffff' }), blushM = new THREE.MeshStandardMaterial({ color: '#ff8fa0', roughness: 1, transparent: true, opacity: .62, depthWrite: false });
  const softGlowM = new THREE.MeshBasicMaterial({ color: g.clone().multiplyScalar(.6) });
  mats.push(glowM, softGlowM, shineM, blushM);
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const add = (geom, mat, parent, [x, y, z] = [0, 0, 0], s = 1, r) => { const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s); if (r) m.rotation.set(...r); parent.add(m); return m; };
  const style = OPTION_LABEL[look.style] ? look.style : DEFAULT_LOOK.style, hoodUp = style !== 'down';

  // legs pivot inside the joggers' seat so the swing never shows the top of the leg; shoes hang from the ankles
  const legs = [-1, 1].map((sd) => {
    const hip = new THREE.Group(); hip.position.set(sd * .092, HIP, 0); rig.add(hip);
    const leg = add(legGeo(), pantsM, hip, [0, -LEG / 2, 0], [1, LEG, 1]);
    const shoe = new THREE.Group(); shoe.position.y = -LEG; hip.add(shoe);
    const turn = new THREE.Group(); turn.rotation.y = sd * .12; turn.position.x = sd * .01; shoe.add(turn); // toes turned out a little
    add(shoeGeo(), kickM, turn); add(soleGeo(), soleM, turn); add(trimGeo(), soleM, turn); add(stripeGeo(), glowM, turn);
    return { hip, leg, shoe };
  });
  const body = new THREE.Group(); rig.add(body);
  add(pantsGeo(), pantsM, body);
  add(hoodieGeo(), hoodieM, body);
  if (!hoodUp) add(hoodDownGeo(), hoodieM, body);
  add(SPH(), skinM, body, [0, .772, -.005], [.072, .06, .066]); // the neck, mostly hidden under the chin
  // drawstrings hang from the collar and swing as you walk; their tips glow
  const cords = [-1, 1].map((sd) => {
    const p = new THREE.Group(); p.position.set(sd * .042, hoodUp ? .752 : .76, hoodUp ? .142 : .1); body.add(p);
    add(once('cord', () => new THREE.CylinderGeometry(.0065, .0065, .1, 8)), cordM, p, [0, -.05, 0]);
    add(SPH(), softGlowM, p, [0, -.104, 0], [.011, .016, .011]);
    return p;
  });
  const arms = [-1, 1].map((sd) => {
    const sh = new THREE.Group(); sh.position.set(sd * SH.x, SH.y, 0); sh.rotation.z = sd * TILT; body.add(sh);
    add(sleeveGeo(), hoodieM, sh, [0, 0, 0], [sd, 1, 1]);
    add(handGeo(), skinM, sh, [0, 0, 0], [sd, 1, 1]);
    return { sh, sd };
  });

  // the head: gently flattened, a friendly face in its lower half, framed by the hood
  const head = new THREE.Group(); head.position.set(0, HC, 0); rig.add(head);
  add(LITE ? SPH() : once('headsph', () => new THREE.SphereGeometry(1, 64, 48)), skinM, head, [0, 0, 0], [HEAD.x, HEAD.y, HEAD.z]);
  if (hoodUp) { add(hoodGeo(style === 'ears'), hoodieM, head); add(fringeGeo(), hairM, head); } else add(hairGeo(), hairM, head);
  const phones = new THREE.Group(); head.add(phones);
  add(phonesGeo(), gearM, phones);
  [-1, 1].forEach((sd) => {
    add(once('ledring', () => new THREE.TorusGeometry(.064, .0105, 10, 40)), glowM, phones, [sd * (CUP.x + CUP.w - .002), CUP.y, 0], 1, [0, PI / 2, 0]);
    add(SPH(), gearM, phones, [sd * (CUP.x + CUP.w - .004), CUP.y, 0], [.012, .036, .036]);
  });
  const face = new THREE.Group(); head.add(face);
  const surf = (x, y) => HEAD.z * Math.sqrt(Math.max(0, 1 - (x / HEAD.x) ** 2 - (y / HEAD.y) ** 2));
  const onFace = (x, y, out = 0) => { const p = new THREE.Vector3(x, y, surf(x, y)), n = new THREE.Vector3(p.x / HEAD.x ** 2, p.y / HEAD.y ** 2, p.z / HEAD.z ** 2).normalize(); return { p: p.addScaledVector(n, out), n }; };
  // sits a feature on the face: its z axis along the surface normal, its y axis kept upright
  const stick = (geom, mat, x, y, out, s, spin = 0) => {
    const { p, n } = onFace(x, y, out), m = add(geom, mat, face, [p.x, p.y, p.z], s), ax = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, n.clone().cross(ax), n)); m.rotateZ(spin); return m;
  };
  const EYE = [.035, .063, .011]; // big, tall, set low and wide: the cute part
  const eyes = [-1, 1].map((sd) => {
    const e = stick(SPH(), eyeM, sd * .125, -.07, -.003, EYE);
    stick(SPH(), shineM, sd * .125 + .012, -.07 + .025, .007, [.0135, .0155, .004]); // a big sparkle
    stick(SPH(), shineM, sd * .125 - .012, -.07 - .024, .006, [.0065, .0065, .003]); // and a small one
    return e;
  });
  if (!hoodUp) stick(once('brow', () => new THREE.TorusGeometry(.022, .005, 6, 14, PI * .7)), mouthM, .13, .052, .001, 1, PI / 2 - PI * .35 - .1);
  stick(SPH(), noseM, 0, -.106, -.002, [.012, .0095, .009]);
  stick(once('mouth', () => new THREE.TorusGeometry(.024, .0064, 8, 20, PI * .74)), mouthM, 0, -.133, 0, 1, -PI / 2 - PI * .37);
  [-1, 1].forEach((sd) => stick(SPH(), blushM, sd * .168, -.12, -.002, [.05, .034, .01]));

  const u = {
    // how far one radian of walk phase carries the body at a given walk (the planted foot covers 2·LEG·tan(swing)
    // per half cycle); game.js divides speed by this to get a cadence
    strideFor: (W) => (2 * LEG * .96 * Math.tan(Math.min(AMAX, A * W))) / PI,
    rig, mats, H: style === 'ears' ? 1.52 : 1.47, walk: 0, walkPhase: 0, poke: 0, wander: true, look: new THREE.Vector2(), phase: (seed % 17) / 5,
    update(t, dt) {
      u.poke = Math.max(0, u.poke - dt * 2.4);
      const W = u.walk, w = Math.min(1, W), p = u.walkPhase, s = Math.sin(p), c = Math.cos(p), hop = Math.sin(u.poke * PI);
      // each leg spends half the cycle planted, its foot sliding back under the body at a steady speed, and half
      // swinging forward with the foot lifted (a Hermite curve that leaves and lands at the stance speed). The body
      // sinks half of what straight legs would need and the legs stretch for the rest, so the planted sole stays on
      // the ground.
      const tn = Math.tan(Math.min(AMAX, A * W)), gait = [0, .5].map((off) => {
        const q = (((p / (2 * PI) + off) % 1) + 1) % 1;
        if (q < .5) return { x: -1 + 4 * q, lift: 0 };
        const r = (q - .5) * 2; return { x: 8 * r ** 3 - 12 * r * r + 2 * r + 1, lift: Math.sin(PI * r) * w };
      });
      const kStance = Math.cos(Math.atan((gait[0].lift ? gait[1] : gait[0]).x * tn)), dip = .5 * LEG * (1 - kStance);
      rig.position.y = -dip + hop * .05;
      legs.forEach((L, i) => {
        const g = W > .02 ? gait[i] : { x: 0, lift: 0 }, a = Math.atan(g.x * tn), reach = (LEG - dip) / Math.cos(a) - g.lift * .06;
        L.hip.rotation.x = a;
        L.leg.scale.y = reach; L.leg.position.y = -reach / 2; L.shoe.position.y = -reach;
        L.shoe.rotation.x = -a - g.lift * .14;
      });
      arms.forEach((a, i) => {
        a.sh.rotation.x = (i ? 1 : -1) * s * .24 * w;                                    // a swing, opposite the legs
        a.sh.rotation.z = a.sd * (TILT + Math.sin(t * 1.6 + u.phase + i) * .015 * (1 - w) + hop * .1);
      });
      body.rotation.y = s * .05 * w;
      // the big head and hood bob with each step; the headphones follow a beat late
      const bob = Math.abs(c), bobLate = Math.abs(Math.cos(p - .5));
      head.position.y = HC + Math.sin(t * 2.1 + u.phase) * .004 * (1 - w) + bob * .012 * w;
      head.rotation.y = u.wander ? Math.sin(t * .45 + u.phase) * .2 * (1 - w) : 0;
      head.rotation.z = Math.sin(t * .7 + u.phase) * .03 * (1 - w) + s * .025 * w;
      head.rotation.x = -.04 * w;
      phones.position.y = (bobLate - bob) * .007 * w + hop * .01;
      cords.forEach((cd, i) => { cd.rotation.x = -.14 - Math.abs(s) * .12 * w - hop * .3; cd.rotation.z = Math.sin(p - .6 + i * .3) * .22 * w; });
      const period = 3.8, bp = ((t + u.phase) % period) / .16, blink = bp < 1 ? Math.sin(bp * PI) : 0;
      eyes.forEach((e) => { e.scale.y = EYE[1] * clamp(1 - blink * .9, .1, 1); });
    },
  };
  root.userData.creature = u; root.userData.look = look;
  return root;
}
export function disposePerson(root) { if (!root) return; root.parent?.remove(root); root.userData.creature?.mats.forEach((m) => m.dispose()); }
