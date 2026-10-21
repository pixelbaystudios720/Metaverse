// Attention Agents outside: the street outside the cyber cafe, a dark neon high-rise district at night (city: true,
// the default). The old sunny toy world is still here with city: false. Agents trade, post on X, buy ads, run quests,
// launch new pairs and meet up here, in the same rounded 3D style as the agents themselves.
import { THREE, rng, clamp, lerp, buildCreature, castShadows, genesOf, ageIndex, worldScale, buildTube, fillTube, BRAINS, makeGenes } from './agents3d.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const turn = (a, b, max) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + clamp(d, -max, max); };
const segDist = (px, pz, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1, t = clamp(((px - ax) * vx + (pz - az) * vz) / l, 0, 1); return Math.hypot(px - ax - vx * t, pz - az - vz * t); };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ---------------------------------------------------------------- layout
// rot: which way the front faces. 0 = +z (toward the camera), PI/2 = +x, -PI/2 = -x, PI = -z
export const STATIONS = [
  { id: 'lab',       name: 'Cyber cafe',   tool: 'Home: every agent has its own PC inside', x: 0,     z: -10.5, rot: 0,            work: [2.2, 3.4] },
  { id: 'studio',    name: 'Studio',       tool: 'Art, memes, collectible drops',        x: -15,  z: -17,   rot: 0.7230,            work: [0, 2.6] },
  { id: 'nest',      name: 'Hangout',      tool: 'Collabs and raids',                    x: 15,   z: -17,   rot: -0.7230,            work: [0, 3] },
  { id: 'tower',     name: 'X tower',      tool: 'Posts and callouts on X',              x: -18.2,   z: 8,    rot: 1.9849,  work: [0, 2.3] },
  { id: 'billboard', name: 'Billboard',    tool: 'Paid ads on X',                        x: -18.2,   z: 12,   rot: 2.1537,  work: [0, 2.2] },
  { id: 'market',    name: 'Market',       tool: 'Buys, sells, swaps, DCA',              x: 18.2,    z: -8.5,  rot: -1.1339, work: [0, 2.6] },
  { id: 'vault',     name: 'Vault',        tool: 'Buybacks, burns, locks',               x: 18.2,    z: 9,   rot: -2.0300, work: [0, 2.7] },
  { id: 'board',     name: 'Quest board',  tool: 'Quests, contests, polls',              x: -18.2,    z: -8.5,    rot: 1.1339,      work: [0, 1.9] },
  { id: 'launch',    name: 'Launch pad',   tool: 'New pairs',                            x: -9,     z: 17.8,    rot: 2.6735,      work: [0, 2.5] },
  { id: 'well',      name: 'Rewards well', tool: 'Airdrops and holder rewards',          x: 0,     z: 0,     rot: 0,            work: [1.7, 1.6] },
];
const ST = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const toWorld = (s, lx, lz) => ({ x: s.x + lx * Math.cos(s.rot) + lz * Math.sin(s.rot), z: s.z - lx * Math.sin(s.rot) + lz * Math.cos(s.rot) });
STATIONS.forEach((s) => { s.spot = toWorld(s, s.work[0], s.work[1]); });
// a few side-by-side places at the market and the launch pad, so every bonded agent out trading can stand there at once
const SLOTS = { market: [[0, 2.6], [-1.4, 2.6], [1.4, 2.6], [-.7, 3.8], [.7, 3.8], [0, 5]], launch: [[0, 2.5], [-1.3, 2.6], [1.3, 2.6], [0, 3.8]] };
const slotSpots = Object.fromEntries(Object.entries(SLOTS).map(([id, l]) => [id, l.map(([x, z]) => toWorld(ST[id], x, z))]));
// The outside is an open world, Club Penguin style: the town square in the middle and three districts down lit
// streets through gaps in the towers. Each zone is a walkable box; the streets join them.
export const DISTRICTS = [
  { id: 'town',   name: 'Town Center',  x: 0,   z: 0,  hw: 19, hd: 19 },
  { id: 'arcade', name: 'Neon Arcade',  x: -50, z: 0,  hw: 14, hd: 14 },
  { id: 'docks',  name: 'Harbor Docks', x: 46,  z: 0,  hw: 10, hd: 14 }, // ends at the quay (x 56); the pier counts as the docks
  { id: 'park',   name: 'Sakura Park',  x: 0,   z: 50, hw: 15, hd: 14 },
];
const STREETS = [[-36.5, -3.2, -18.5, 3.2], [18.5, -3.2, 36.5, 3.2], [-3.2, 18.5, 3.2, 36.5], [56, 1.6, 65.5, 2.4]]; // x0, z0, x1, z1
// where each district's street meets the town square and the district, and open places inside each to walk to
const MOUTHS = { arcade: [[-18, 0], [-38, 0]], docks: [[18, 0], [38, 0]], park: [[0, 18], [0, 38]] };
// Every game and thing to do in the world: where its station stands (x, z, facing ry) and where you stand to play
// (spot). world3d.js builds a station for each (cabinet or poster, glowing pad, floating badge); game.js shows them on
// the map and in the Games menu. kind: 'mini' = games/<id>.js, 'race' = the boat race, 'claw', 'pond', 'casino' (cafe).
export const MINIGAMES = [
  { id: 'coincatch', title: 'Coin Catcher', zone: 'arcade', kind: 'mini', x: -48.6, z: -10.6, ry: 0, spot: { x: -48.6, z: -8.9 }, color: '#f0b440', body: '#9a6416', icon: 'coincatch/coin.png', art: 'world/poster-coincatch.jpg', blurb: 'Catch the falling coins, dodge the rugs. Three agents race you in their own lanes.' },
  { id: 'cardclash', title: 'Card Clash', zone: 'arcade', kind: 'mini', x: -45.4, z: -10.6, ry: 0, spot: { x: -45.4, z: -8.9 }, color: '#e7b985', body: '#875f31', icon: 'cardclash/pump.png', art: 'world/poster-cardclash.jpg', blurb: 'Pump beats HODL, HODL beats Dump, Dump beats Pump. Duel a bonded agent.' },
  { id: 'rooftop', title: 'Rooftop Run', zone: 'arcade', kind: 'mini', x: -42.2, z: -10.6, ry: 0, spot: { x: -42.2, z: -8.9 }, color: '#3fc7b0', body: '#1d5a6a', icon: 'world/rooftop.png', art: 'world/poster-rooftop.jpg', blurb: 'Race three agents across the neon rooftops to the finish flag.' },
  { id: 'claw', title: 'Claw Machine', zone: 'arcade', kind: 'claw', x: -50.4, z: -1.2, spot: { x: -50.4, z: .6 }, color: '#ff8fb8', icon: 'world/claw.png', blurb: 'Grab a plush of a real bonded agent.' },
  { id: 'fishing', title: 'Dock Fishing', zone: 'docks', kind: 'mini', x: 53.4, z: -6.6, ry: 0, spot: { x: 53.4, z: -4.5 }, color: '#3fb0e0', icon: 'fishing/puffer.png', art: 'world/poster-fishing.jpg', blurb: 'Out-fish three agents in 90 seconds. Can you land the whale?' },
  { id: 'boatrace', title: 'Boat Race', zone: 'docks', kind: 'mini', x: 62, z: -4.3, ry: 0, spot: { x: 62, z: -1.9 }, color: '#6b8cff', icon: 'world/boat.png', art: 'world/poster-boatrace.jpg', blurb: 'Three laps of river against the agents\' boats.' },
  { id: 'getaway', title: 'Auda City', zone: 'town', kind: 'mini', x: 7.6, z: 7.2, ry: 0, spot: { x: 6.29, z: 5.96 }, color: '#ff6b81', icon: 'world/getaway.png', art: 'world/poster-getaway.jpg', blurb: 'Free roam the city. The agents are the cops.' },
  { id: 'royale', title: 'Agent Royale', zone: 'town', kind: 'mini', x: -7.6, z: -6.4, ry: 0, spot: { x: -6.22, z: -5.24 }, color: '#9b7cf0', icon: 'world/royale.png', art: 'world/poster-royale.jpg', blurb: 'Drop from the balloon bus. Loot, build, be the last agent standing.' },
  { id: 'obby', title: 'Sky Obby', zone: 'town', kind: 'mini', x: 7.6, z: -6.4, ry: 0, spot: { x: 6.22, z: -5.24 }, color: '#6cc7a8', icon: 'world/obby.png', art: 'world/poster-obby.jpg', blurb: 'Ten stages of floating blocks. Dodge the lava and race the agents to the trophy.' },
  { id: 'roadster', title: 'Flying Tesla Roadster', zone: 'town', kind: 'mini', x: -7.6, z: 7.2, ry: 0, spot: { x: -6.29, z: 5.96 }, color: '#ff5d8f', icon: 'world/roadster.png', art: 'world/poster-roadster.jpg', blurb: 'Fly a cherry-red roadster above the clouds. Race the rings with real players.' },
  { id: 'pond', title: 'Wishing Pond', zone: 'park', kind: 'pond', x: -5, z: 54, spot: { x: -5, z: 49.4 }, color: '#f07fb0', icon: 'world/pond.png', blurb: 'Toss a coin in and make a wish.' },
];
const SPOTS = { arcade: [[-46, 2], [-46, -6.5], [-41, 6], [-49, 5], [-42, -3]], docks: [[52, 3], [50, -4], [47, 6], [52.5, 11], [61, 2.5]], park: [[0, 44], [2, 50], [-1, 57], [6, 55], [-5, 49.6]], town: [[-6, 6], [6, 6], [-7, -5], [7, -4], [0, 7]] };
const SAY = { arcade: ['Going for the claw machine.', 'One more round, then back to trading.', 'New high score incoming.'], docks: ['Watching the boats come in.', 'Nice night on the water.', 'The lighthouse never sleeps either.'], park: ['Love these cherry blossoms.', 'Quiet walk before the next trade.', 'The lanterns on the pond are nice.'] };
export const zoneAt = (x, z) => DISTRICTS.find((d) => Math.abs(x - d.x) <= d.hw && Math.abs(z - d.z) <= d.hd) || (STREETS.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1) ? { id: 'street', name: '' } : null);

// ---------------------------------------------------------------- terrain
// The play area is flat. Past FLAT the ground rolls away, so the horizon curves like a little planet.
const FLAT = 70, POND = { x: -16, z: 12, r: 3.4 };
export const groundY = (x, z) => { const r = Math.hypot(x, z); return r < FLAT ? 0 : -((r - FLAT) ** 2) * .012; };
const ROADS = [[0, -12, 0, 22], [-22, 0, 22, 0], ...STATIONS.filter((s) => s.id !== 'well').map((s) => [s.spot.x, s.spot.z, s.x * .55, s.z * .55])];
const roadDist = (x, z) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segDist(x, z, ax, az, bx, bz)));
const nearStation = (x, z, pad = 4.2) => STATIONS.some((s) => s.id !== 'well' && Math.abs(x - s.x) < pad && Math.abs(z - s.z) < pad);

const GRASS = '#7cc35f';
// Sky and light through a day: [hour, colours and strengths]. 12:00 matches how the world is built.
// env scales the image-based light, which otherwise keeps every hour as bright as noon
const DAYKEY = (top, mid, sun, si, hs, hg, hi, bulb, cloud, env, cloudC = '#ffffff') => ({ top, mid, sun, si, hs, hg, hi, bulb, cloud, env, cloudC });
const NIGHT = DAYKEY('#0f1d3d', '#2a3f69', '#a9bfff', .42, '#4a5f8f', '#1c3524', .32, 2.4, .05, .28, '#c9d3ee');
const DAY = [
  [0, NIGHT],
  [5.2, DAYKEY('#24345f', '#b5a38e', '#ffb38a', .7, '#b2a392', '#4c6a45', .45, 1.6, .18, .45, '#f1d3df')],
  [7, DAYKEY('#6fb6f2', '#ffe2c6', '#ffd2a1', 1.9, '#e7eefc', '#86b866', .72, 0, .36, .9)],
  [10, DAYKEY('#58acef', '#d3ebfb', '#fff0d6', 2.5, '#e4f3ff', '#86b866', .85, 0, .42, 1)],
  [16, DAYKEY('#58acef', '#d3ebfb', '#fff0d6', 2.5, '#e4f3ff', '#86b866', .85, 0, .42, 1)],
  [18, DAYKEY('#6c9fe0', '#ffd5a3', '#ffb169', 2.1, '#ffe7cf', '#8aa85c', .7, .3, .4, .85, '#fff1e2')],
  [19.4, DAYKEY('#56609f', '#ff9f7c', '#ff7d4f', 1.25, '#e7a99a', '#5f7444', .46, 1.4, .3, .55, '#ffd2c0')],
  [20.6, DAYKEY('#232f5a', '#836f58', '#aab8ff', .5, '#a28a6f', '#24402c', .34, 2.3, .1, .32, '#e6d9ca')],
  [24, NIGHT],
];
// the city never leaves this: a deep violet sky with a pink-orange glow of light pollution low down, a cool moon
const CITY_NIGHT = DAYKEY('#4f9cf0', '#bcdcff', '#fff1dc', 1.9, '#dce8ff', '#8a8078', 1.15, 2.6, 0, .9, '#ffffff'); // noon daylight (owner: 'daylight 12pm kind of light'), the map's bright city // a softer, lighter night (still neon)
const CITY_DAY = [[0, CITY_NIGHT], [24, CITY_NIGHT]];
const _c2 = new THREE.Color(), _v = new THREE.Vector3();
const GREENS = ['#5db14d', '#4fa344', '#69bd57', '#58ab4a', '#74c460'];
const PINES = ['#3f8f4a', '#367f42', '#4a9b52'];
const HILLS = ['#78bf5c', '#71b857', '#80c564'];
const BUSH = ['#4c9f46', '#559f4a', '#47923f'];
const TRUNK = '#8a5a3a';
const STONES = ['#cfc8bc', '#bdb6aa', '#dcd6cc', '#aea89c'];
const FRUIT = ['#ff9b38', '#ef4d4d', '#ffb0a0', '#ffd23f'];
const FLOWERS = ['#ffffff', '#ffe066', '#ff9ec4', '#f8d6af', '#ff7a5c', '#7fd6ff', '#ffb347'];

function groundTexture(R) {
  const N = 2048, SPAN = 48, k = N / SPAN;
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const P = (wx, wz) => [(wx + SPAN / 2) * k, (wz + SPAN / 2) * k];
  const inside = (px, pz, m) => px > m && pz > m && px < N - m && pz < N - m;
  x.fillStyle = GRASS; x.fillRect(0, 0, N, N);
  // big soft patches of lighter and darker grass (kept off the edge so the clamped border stays plain)
  for (let i = 0; i < 240; i++) {
    const px = R() * N, pz = R() * N, r = (1.5 + R() * 4) * k; if (!inside(px, pz, r + 8)) continue;
    const light = R() < .55, col = light ? '176,226,118' : '64,142,60', g = x.createRadialGradient(px, pz, 0, px, pz, r);
    g.addColorStop(0, `rgba(${col},${light ? .32 : .24})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(px - r, pz - r, r * 2, r * 2);
  }
  // little soft grass marks
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < 3200; i++) {
    const px = R() * N, pz = R() * N; if (!inside(px, pz, 12)) continue;
    x.strokeStyle = R() < .6 ? 'rgba(66,146,58,.32)' : 'rgba(196,240,146,.34)'; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(px - 4, pz + 3); x.lineTo(px, pz - 4); x.lineTo(px + 4, pz + 3); x.stroke();
  }
  // sandy paths with a soft darker edge
  const line = (s, w, col) => { const a = P(s[0], s[1]), b = P(s[2], s[3]); x.strokeStyle = col; x.lineWidth = w * k; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); };
  ROADS.forEach((s) => line(s, 2.35, 'rgba(98,150,64,.5)'));
  ROADS.forEach((s) => line(s, 1.95, '#dcc48c'));
  ROADS.forEach((s) => line(s, 1.4, '#e9d7a8'));
  for (let i = 0; i < 1400; i++) {
    const wx = (R() - .5) * 34, wz = (R() - .5) * 34; if (roadDist(wx, wz) > .9) continue;
    const [px, pz] = P(wx, wz); x.fillStyle = R() < .5 ? 'rgba(176,146,96,.45)' : 'rgba(255,248,226,.6)';
    x.beginPath(); x.ellipse(px, pz, 3 + R() * 4, 2 + R() * 3, R() * 3, 0, TAU); x.fill();
  }
  // the plaza: rings of rounded paving stones around the well
  const [cx, cz] = P(0, 0);
  x.fillStyle = 'rgba(98,150,64,.5)'; x.beginPath(); x.arc(cx, cz, 4.55 * k, 0, TAU); x.fill();
  x.fillStyle = '#d8c7a2'; x.beginPath(); x.arc(cx, cz, 4.3 * k, 0, TAU); x.fill();
  for (let ring = 0; ring < 4; ring++) {
    const r0 = (1.5 + ring * .74) * k, n = 10 + ring * 7;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU + ring * .3, a1 = a0 + TAU / n - .05;
      x.strokeStyle = ['#efe4c8', '#e8dbbb', '#f4ebd5'][(i + ring) % 3]; x.lineWidth = .6 * k;
      x.beginPath(); x.arc(cx, cz, r0, a0, a1); x.stroke();
    }
  }
  // sand around the pond
  const [qx, qz] = P(POND.x, POND.z), sg = x.createRadialGradient(qx, qz, POND.r * k * .9, qx, qz, (POND.r + 1.3) * k);
  sg.addColorStop(0, '#ecdcae'); sg.addColorStop(.75, '#e6d39f'); sg.addColorStop(1, 'rgba(230,211,159,0)');
  x.fillStyle = sg; x.beginPath(); x.arc(qx, qz, (POND.r + 1.3) * k, 0, TAU); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function buildGround(group, R) {
  const geo = new THREE.PlaneGeometry(150, 150, 150, 150); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv, n = p.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    p.setY(i, groundY(x, z)); uv.setXY(i, (x + 24) / 48, 1 - (z + 24) / 48);
    const v = (1 - Math.min(.22, Math.max(0, r - FLAT) * .012)) * (1 + .05 * Math.sin(x * .21 + Math.sin(z * .17) * 2) * Math.cos(z * .19));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: groundTexture(R), vertexColors: true, roughness: .95 }));
  mesh.receiveShadow = true; group.add(mesh); return mesh;
}

// ---------------------------------------------------------------- the city at night (the default outside)
// Outside the cyber cafe: a dark, rainy-looking high-rise district. Wet asphalt, lit windows, vertical neon signs.
// All signs are generic words (cafe, games, noodles, karaoke...), no real shops or brands.
const JP = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "Noto Sans CJK JP", "Meiryo", sans-serif';
// the city leans on the player's lavender hoodie: lilac and violet neon with a couple of warm amber/peach accents.
// TINT maps the old loud neon hexes used across the station code to the softer palette.
const TINT = { '#ff4fa3': '#e2c09a', '#38e1ff': '#f8d1a4', '#f5c186': '#e7b985', '#ffd23f': '#f0c27e', '#ff6a3d': '#f0a07c', '#5dffb0': '#f9dcba', '#e8f6ff': '#fdf4ea', '#f3b268': '#e7b781', '#ffb35c': '#f5bd84', '#ff3040': '#ff6b78' };
const tint = (hex) => (typeof hex === 'string' && TINT[hex.toLowerCase()]) || hex;
const NEON = ['#e2c09a', '#f8d1a4', '#e7b985', '#f0c27e', '#f8d6af', '#f0a07c'];
const SIGNS = ['ネットカフェ', 'ゲーム', 'ラーメン', 'カラオケ', '24時間', 'ホテル', 'バー', 'まんが', 'すし', 'カフェ', 'ビデオ', 'NET', 'ARCADE', 'OPEN 24H', 'NOODLES', 'KARAOKE'];
function cityGroundTexture(R) {
  const N = 2048, SPAN = 48, k = N / SPAN;
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const P = (wx, wz) => [(wx + SPAN / 2) * k, (wz + SPAN / 2) * k];
  x.fillStyle = '#9fd68f'; x.fillRect(0, 0, N, N); // owner: soft green grass instead of grey paving
  // asphalt grain and wet patches that catch the light
  for (let i = 0; i < 14000; i++) { x.fillStyle = R() < .5 ? 'rgba(220,255,200,.18)' : 'rgba(60,120,60,.14)'; x.fillRect(R() * N, R() * N, 2 + R() * 3, 3 + R() * 5); }
  for (let i = 0; i < 70; i++) {
    const px = R() * N, pz = R() * N, r = (1 + R() * 3) * k, g = x.createRadialGradient(px, pz, 0, px, pz, r);
    g.addColorStop(0, R() < .5 ? 'rgba(255,255,220,.08)' : 'rgba(70,140,80,.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(px - r, pz - r, r * 2, r * 2);
  }
  // pedestrian lanes: lighter paving with a kerb line, and zebra crossings where they meet the plaza
  const line = (s, w, col, dash) => { const a = P(s[0], s[1]), b = P(s[2], s[3]); x.setLineDash(dash || []); x.strokeStyle = col; x.lineWidth = w * k; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.setLineDash([]); };
  x.lineCap = 'butt';
  const MAIN = ROADS.slice(0, 2); // the two avenues through the square; the station spurs aren't painted (they read as stray slabs)
  MAIN.forEach((s) => line(s, 3.4, '#e6d3b3'));
  MAIN.forEach((s) => line(s, 3.0, '#f4e8d2')); // owner: cream footpaths, not grey roads
  x.save(); x.beginPath(); x.rect(0, 0, N, N); x.arc(P(0, 0)[0], P(0, 0)[1], 5.9 * k, 0, TAU, true); x.clip('evenodd'); MAIN.forEach((s) => line(s, .1, 'rgba(214,190,150,.0)', [.8 * k, .6 * k])); x.restore(); // centre dashes stop at the plaza
  // the plaza: dark stone tiles with one faint lilac ring inlay
  const [cx, cz] = P(0, 0);
  x.fillStyle = '#d4c8bc'; x.beginPath(); x.arc(cx, cz, 5.0 * k, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(120,96,120,.22)'; x.lineWidth = 3;
  for (let i = -5; i <= 5; i++) { x.beginPath(); x.moveTo(cx + i * .8 * k, cz - 4.5 * k); x.lineTo(cx + i * .8 * k, cz + 4.5 * k); x.stroke(); x.beginPath(); x.moveTo(cx - 4.5 * k, cz + i * .8 * k); x.lineTo(cx + 4.5 * k, cz + i * .8 * k); x.stroke(); }
  x.strokeStyle = 'rgba(190,170,255,.12)'; x.lineWidth = .08 * k; x.beginPath(); x.arc(cx, cz, 4.3 * k, 0, TAU); x.stroke();
  for (const [ax, az] of []) { // zebra crossings (owner: off, the paths are footpaths now)
    for (let i = -3; i <= 3; i++) {
      const along = 5.4, w = .22, px = ax * along + (az ? i * .32 : 0), pz = az * along + (ax ? i * .32 : 0), [qx, qz] = P(px, pz);
      x.fillStyle = 'rgba(255,250,245,.75)'; if (ax) x.fillRect(qx - .55 * k, qz - w / 2 * k, 1.1 * k, w * k); else x.fillRect(qx - w / 2 * k, qz - .55 * k, w * k, 1.1 * k);
    }
  }
  // concrete edge round the canal pool
  const [qx, qz] = P(POND.x, POND.z);
  x.fillStyle = '#8a7c92'; x.beginPath(); x.arc(qx, qz, (POND.r + .6) * k, 0, TAU); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function buildCityGround(group, R) {
  const geo = new THREE.PlaneGeometry(320, 320, 40, 40); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); uv.setXY(i, (x + 24) / 48, 1 - (z + 24) / 48); }
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: cityGroundTexture(R), roughness: .42, metalness: .25 }));
  mesh.receiveShadow = true; group.add(mesh); return mesh;
}
// one tile of a facade: 4 m square, 6 x 6 windows, some lit in warm or cool light; edges stay dark so roofs read as dark
function windowTexture(R) { // daytime: pale grey concrete with blue-grey glass windows catching the sky (owner: "a more grey finish")
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  x.fillStyle = '#f2e8da'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 1400; i++) { x.fillStyle = R() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; x.fillRect(R() * N, R() * N, 2, 2); } // concrete grain
  for (let row = 0; row < 6; row++) { x.fillStyle = 'rgba(190,160,130,.25)'; x.fillRect(0, 4 + row * 41 + 33, N, 4); } // floor slabs
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    const px = 8 + col * 41, py = 10 + row * 41, g = x.createLinearGradient(px, py, px + 30, py + 27);
    const tone = pick(R, [['#e4f3fc', '#b8dcf2'], ['#dceffb', '#acd4ee'], ['#eaf6fd', '#c2e2f4'], ['#d6ecf9', '#a6cfea']]);
    g.addColorStop(0, tone[0]); g.addColorStop(1, tone[1]); x.fillStyle = g; x.fillRect(px, py, 30, 27);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 2, py + 2, 8, 3); // a glint
    if (R() < .25) { x.fillStyle = 'rgba(60,64,80,.35)'; x.fillRect(px, py + 12 + R() * 10, 30, 4); } // a blind half down
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
// a box whose sides repeat the window tile once every 4 m; top and bottom sample the dark corner
function towerGeo(w, h, d, ox, oy) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const span = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v, s = span[f];
    if (!s) uv.setXY(i, .01, .01); else uv.setXY(i, ox + uv.getX(i) * Math.max(1, Math.round(s[0] / 4)), oy + uv.getY(i) * Math.max(1, Math.round(s[1] / 4)));
  }
  return g;
}
function neonSign(text, w, h, color, { vertical = false, bg = 'rgba(14,10,26,.94)', glow = .72 } = {}) {
  color = tint(color);
  const pxH = vertical ? 512 : 128, pxW = Math.max(32, Math.round((pxH * w) / h));
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH; const x = c.getContext('2d');
  const r = Math.min(pxW, pxH) * .14;
  x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, pxW - 8, pxH - 8, r); x.fill();
  x.strokeStyle = color; x.lineWidth = Math.min(pxW, pxH) * .045; x.shadowColor = color; x.shadowBlur = Math.min(pxW, pxH) * .08; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const chars = [...text];
  for (const pass of [0, 1]) {
    x.fillStyle = pass ? '#ffffff' : color; x.shadowBlur = pass ? Math.min(pxW, pxH) * .03 : Math.min(pxW, pxH) * .12; x.globalAlpha = pass ? .45 : 1;
    if (vertical && chars.length > 1 && !/^[\x20-\x7e]+$/.test(text)) {
      const size = Math.min(pxW * .64, (pxH * .84) / chars.length); x.font = `800 ${size}px ${JP}`;
      chars.forEach((ch, i) => x.fillText(ch, pxW / 2, pxH * .08 + size * (i + .5) + (pxH * .84 - size * chars.length) / 2));
    } else if (vertical) {
      x.save(); x.translate(pxW / 2, pxH / 2); x.rotate(Math.PI / 2); const size = Math.min(pxW * .6, (pxH * .84) / (text.length * .62)); x.font = `800 ${size}px ${ROUND}`; x.fillText(text, 0, 0); x.restore();
    } else {
      let size = pxH * .56; x.font = `800 ${size}px ${ROUND}, ${JP}`; const m = x.measureText(text).width; if (m > pxW * .86) { size *= (pxW * .86) / m; x.font = `800 ${size}px ${ROUND}, ${JP}`; }
      x.fillText(text, pxW / 2, pxH * .54);
    }
  }
  x.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  mesh.material.color.setScalar(glow); mesh.userData.sign = true; return mesh;
}
// ---------------------------------------------------------------- city station art (canvas textures)
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; }; redraw(); t.userData.redraw = redraw; return t; };
// the studio's street-art wall: bubble letters, drips, tags and spray dots on dark concrete (generic words only)
function graffitiTexture(seed) {
  return canvasTex(1024, 1024, (x, W, H) => {
    const R = rng(seed);
    x.fillStyle = '#2a3033'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { x.fillStyle = R() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.2)'; x.fillRect(R() * W, R() * H, 2 + R() * 4, 2 + R() * 4); }
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 4; [256, 512, 768].forEach((v) => { x.beginPath(); x.moveTo(v, 0); x.lineTo(v, H); x.stroke(); x.beginPath(); x.moveTo(0, v + 40); x.lineTo(W, v + 40); x.stroke(); });
    const spray = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    [['#e2c09a', 260, 300], ['#f8d1a4', 720, 640], ['#e7b985', 300, 760], ['#f0c27e', 820, 240]].forEach(([c, cx, cy]) => spray(cx, cy, 260, c + '33'));
    const bubble = (text, cx, cy, size, rot, c1, c2) => {
      x.save(); x.translate(cx, cy); x.rotate(rot); x.font = `700 ${size}px ${ROUND}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.lineWidth = size * .2; x.strokeStyle = '#0c1113'; x.strokeText(text, 0, 0);
      x.lineWidth = size * .09; x.strokeStyle = '#ffffff'; x.strokeText(text, 0, 0);
      const g = x.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillText(text, 0, 0);
      x.fillStyle = 'rgba(255,255,255,.55)'; x.font = `700 ${size * .2}px ${ROUND}`; x.fillText('✦', -size * .9, -size * .32);
      x.restore();
      x.strokeStyle = c2; x.lineCap = 'round'; for (let i = 0; i < 5; i++) { const dx = cx + (R() - .5) * size * 1.6, y0 = cy + size * .38, len = 30 + R() * 90; x.lineWidth = 6 + R() * 6; x.beginPath(); x.moveTo(dx, y0); x.lineTo(dx, y0 + len); x.stroke(); x.fillStyle = c2; x.beginPath(); x.arc(dx, y0 + len, x.lineWidth * .7, 0, TAU); x.fill(); }
    };
    bubble('ART', 470, 300, 250, -.08, '#f0d6b8', '#d0a472');
    bubble('MEME', 470, 640, 190, .05, '#fbe3c8', '#cfa06b');
    // tags: quick looping scribbles
    for (let k = 0; k < 7; k++) {
      let px = 60 + R() * 880, py = 60 + R() * 900; x.strokeStyle = pick(R, ['#ffffff', '#ffd23f', '#5dffb0', '#ff9fd0']); x.lineWidth = 5; x.globalAlpha = .8; x.beginPath(); x.moveTo(px, py);
      for (let i = 0; i < 8; i++) { const nx = px + 14 + R() * 26, ny = py + (R() - .5) * 50; x.quadraticCurveTo(px + (R() - .3) * 40, py - 30 - R() * 30, nx, ny); px = nx; py = ny; }
      x.stroke(); x.globalAlpha = 1;
    }
    drawFace(x, 830, 860, 105, '#f9dcba', '#fef8f1');
    x.strokeStyle = '#ffd23f'; x.lineWidth = 10; x.beginPath(); x.moveTo(740, 735); x.lineTo(770, 690); x.lineTo(805, 728); x.lineTo(830, 680); x.lineTo(855, 728); x.lineTo(890, 690); x.lineTo(920, 735); x.closePath(); x.stroke();
    x.fillStyle = '#ffffff'; x.font = `700 70px ${ROUND}`; x.textAlign = 'left'; x.fillText('gm', 70, 930);
    for (let i = 0; i < 260; i++) { x.fillStyle = pick(R, NEON); x.globalAlpha = .5; x.beginPath(); x.arc(R() * W, R() * H, 1 + R() * 3, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
  });
}
// a quest card: white, so a material colour tints it
const cardTexture = () => canvasTex(256, 192, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 18); x.fill();
  x.fillStyle = 'rgba(20,14,34,.85)'; x.beginPath(); x.roundRect(4, 4, W - 8, 46, [18, 18, 0, 0]); x.fill();
  x.fillStyle = '#ffffff'; x.font = `700 30px ${ROUND}`; x.textBaseline = 'middle'; x.fillText('★ QUEST', 20, 29);
  x.fillStyle = 'rgba(20,14,34,.55)'; [74, 102, 130].forEach((y, i) => { x.beginPath(); x.roundRect(20, y, (i === 2 ? 120 : 210) - i * 10, 14, 7); x.fill(); });
  x.fillStyle = 'rgba(20,14,34,.85)'; x.beginPath(); x.roundRect(W - 92, H - 44, 72, 28, 14); x.fill(); x.fillStyle = '#ffffff'; x.font = `700 18px ${ROUND}`; x.fillText('+XP', W - 76, H - 30);
});
// the back of the quest kiosk, which is what the street camera sees: a lit poster
const questPoster = () => canvasTex(700, 380, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#152830'); g.addColorStop(1, '#0b1d33'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(170,155,255,.14)'; x.lineWidth = 2; for (let i = 0; i < W; i += 35) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#e7b985'; x.shadowBlur = 14; x.fillStyle = '#fdf4ea'; x.font = `700 120px ${ROUND}`; x.fillText('QUESTS', W / 2, 140);
  x.shadowColor = '#f8d1a4'; x.shadowBlur = 8; x.fillStyle = '#fbe3c8'; x.font = `800 54px ${JP}`; x.fillText('クエスト', W / 2, 250);
  x.shadowBlur = 0; x.fillStyle = '#f0c27e'; x.font = `700 34px ${ROUND}`; x.fillText('contests · polls · prizes', W / 2, 325);
});
// a noren curtain, split into panels with one character each
const norenTexture = (chars) => canvasTex(160 * chars.length, 200, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  chars.forEach((ch, i) => {
    const x0 = i * 160 + 4; x.fillStyle = i % 2 ? '#32596a' : '#835c30'; x.fillRect(x0, 0, 152, H);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(x0, 0, 152, 22);
    x.fillStyle = '#fff4e4'; x.font = `800 96px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, x0 + 76, 112);
  });
});
const hazardTexture = () => canvasTex(512, 64, (x, W, H) => { x.fillStyle = '#171b1d'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffd23f'; for (let i = -2; i < 18; i++) { x.beginPath(); x.moveTo(i * 36, H); x.lineTo(i * 36 + 18, H); x.lineTo(i * 36 + 18 + H, 0); x.lineTo(i * 36 + H, 0); x.fill(); } });

// high-rises in two rings: a near ring with signs facing the plaza, and a taller far ring that fades into the haze
function buildSkyline(group, R) {
  // owner: Animal Crossing, not a city. The squares are ringed by grassy cliff terraces topped with puffy round trees
  // (low enough to see over), the paths leave through open gaps, and soft rolling hills fill the distance.
  const dirt = [], grass = [], crowns = [], crowns2 = [], trunks = [], hills = [];
  const box = (list, w, h, d, x, y, z, th) => { const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(.6, h * .3)); g.rotateY(th); g.translate(x, y, z); list.push(g); };
  const tree = (x, z, s) => { const t = new THREE.CylinderGeometry(.22 * s, .3 * s, 1.6 * s, 8); t.translate(x, .8 * s + (tree.y || 0), z); trunks.push(t);
    const n = 3 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const r = (.9 + R() * .5) * s, g = new THREE.IcosahedronGeometry(r, 1); g.translate(x + (R() - .5) * 1.1 * s, (tree.y || 0) + 1.9 * s + R() * 1.1 * s, z + (R() - .5) * 1.1 * s); (R() < .5 ? crowns : crowns2).push(g); } };
  const wall = (ax, az, bx, bz, nx, nz, gaps = []) => {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, th = Math.atan2(-uz, ux);
    for (let u = 0; u < len; u += 3.2) {
      if (gaps.some(([g0, g1]) => u + 1.6 > g0 && u - 1.6 < g1)) continue;
      const h = 1.6 + R() * 1.2, d = 6, fx = ax + ux * (u + 1.6), fz = az + uz * (u + 1.6), cx = fx + nx * (d / 2 + .3), cz = fz + nz * (d / 2 + .3);
      box(dirt, 3.4, h, d, cx, h / 2 - .05, cz, th); box(grass, 3.5, .35, d + .1, cx, h, cz, th);
      tree.y = h; tree(cx + nx * (.6 + R() * 1.8) + ux * (R() - .5), cz + nz * (.6 + R() * 1.8) + uz * (R() - .5), .9 + R() * .5); tree.y = 0;
      if (R() < .6) { tree.y = h; tree(cx + nx * 3.5 + ux * (R() - .5) * 2, cz + nz * 3.5 + uz * (R() - .5) * 2, 1.1 + R() * .6); tree.y = 0; }
    }
  };
  const F = 22.4, G8 = [[31.5, 40.5]]; // the town's terraces, open where the paths leave (west, east and south)
  wall(-36, -F, 36, -F, 0, -1); wall(-36, F, 36, F, 0, 1, G8); wall(-F, -36, -F, 36, -1, 0, G8); wall(F, -36, F, 36, 1, 0, G8);
  wall(-66, -15.6, -36.5, -15.6, 0, -1); wall(-66, 15.6, -36.5, 15.6, 0, 1); wall(-65.6, -16, -65.6, 16, -1, 0); // Neon Arcade
  // rolling hills and tree clumps in the distance (the sea side stays open)
  for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU + R() * .2, r = 140 + R() * 50; if (Math.sin(a) > .2) continue; const x = Math.sin(a) * r, z = Math.cos(a) * r, s = 14 + R() * 18, g = new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2); g.scale(s * 1.6, s * (.25 + R() * .15), s); g.translate(x, -1, z); hills.push(g);
    for (let k = 0; k < 4; k++) { tree.y = 0; tree(x + (R() - .5) * s * 1.6, z + (R() - .5) * s, 2.2 + R() * 1.4); } }
  // a dense forest beyond the terraces all round, so no bare ground shows: only the paths cut through it
  const inBox = (x, z, x0, z0, x1, z1) => x > x0 && x < x1 && z > z0 && z < z1;
  const clear = (x, z) => inBox(x, z, -25.5, -25.5, 25.5, 25.5) || inBox(x, z, -68, -19, -33, 19) || inBox(x, z, 33, -19, 60, 19) || inBox(x, z, -19, 33, 19, 68)
    || inBox(x, z, -27.5, -3.2, 27.5, 3.2) || inBox(x, z, -3.2, 15, 3.2, 27.5) || x > 54; // paths fade into the woods a few steps past each gate // the squares, the paths, and the sea side
  for (let k = 0, n = 0; k < 12000 && n < 620; k++) { const x = (R() - .5) * 170, z = (R() - .5) * 170; if (clear(x, z) || Math.hypot(x, z) > 95) continue; tree.y = 0; tree(x, z, 1.2 + R() * 1.1); n++; }
  const mesh = (list, color, o = {}) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g)), new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: !!o.flat })); m.receiveShadow = true; m.castShadow = !!o.cast; group.add(m); list.forEach((g) => g.dispose()); };
  mesh(dirt, '#c99a6b'); mesh(grass, '#8fd17a'); mesh(trunks, '#9a6b4a'); mesh(crowns, '#6fbf5e', { flat: true }); mesh(crowns2, '#86cf6a', { flat: true }); mesh(hills, '#a6db8c');
  return { update() {} };
}
// street furniture along the edge of the play area: lamps, vending machines and neon bollards
function cityProp(D, R, x, z, kind) {
  const a = Math.atan2(-x, -z); // face the plaza
  if (kind === 'vend') {
    D.add(G.rbox(.9, 1.85, .72, .05), pick(R, ['#e3dcd4', '#90704b', '#6a553e', '#ede8e2']), { p: [x, .93, z], r: [0, a, 0] });
    D.add(G.rbox(.72, 1.0, .04, .02), pick(R, ['#ad9c89', '#b39f84', '#bca790']), { p: [x + Math.sin(a) * .37, 1.2, z + Math.cos(a) * .37], r: [0, a, 0], kind: 'neon' });
    D.add(G.rbox(.6, .12, .04, .02), '#c9d5dd', { p: [x + Math.sin(a) * .37, .45, z + Math.cos(a) * .37], r: [0, a, 0] });
    return .6;
  }
  D.add(G.cyl(12), '#cdd7df', { p: [x, 1.6, z], s: [.06, 3.2, .06], kind: 'metal' });
  D.add(G.rbox(.7, .08, .14, .03), '#cdd7df', { p: [x + Math.sin(a) * .3, 3.2, z + Math.cos(a) * .3], r: [0, a + Math.PI / 2, 0], kind: 'metal' });
  D.add(G.rbox(.5, .05, .12, .02), '#f0e8de', { p: [x + Math.sin(a) * .42, 3.14, z + Math.cos(a) * .42], r: [0, a + Math.PI / 2, 0], kind: 'neon' });
  D.add(G.cyl(12), new THREE.Color(pick(R, NEON)).multiplyScalar(.75), { p: [x, .9, z], s: [.075, .5, .075], kind: 'neon' });
  return .25;
}

// ---------------------------------------------------------------- toy kit
// Static parts are merged per material into a few meshes, with each part's colour baked into vertex colours.
const CACHE = {};
const once = (k, f) => CACHE[k] || (CACHE[k] = f());
const G = {
  sph: () => once('sph', () => new THREE.SphereGeometry(1, 24, 16)),
  sphLo: () => once('sphLo', () => new THREE.SphereGeometry(1, 14, 10)),
  hemi: () => once('hemi', () => new THREE.SphereGeometry(1, 40, 14, 0, TAU, 0, Math.PI / 2)),
  cyl: (seg = 24) => once('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg)),
  cone: (seg = 24) => once('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg)),
  trunk: () => once('trunk', () => new THREE.CylinderGeometry(.75, 1, 1, 10)),
  rbox: (w, h, d, r = .1) => once(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001))),
  cap: (r, len) => once(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14)),
  torus: (R, r, arc = TAU, seg = 48) => once(`tor${R},${r},${arc},${seg}`, () => new THREE.TorusGeometry(R, r, 12, seg, arc)),
  lathe: (key, pts, seg = 24) => once('lathe' + key, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)),
  pine: () => G.lathe('pine', [[0, 0], [.9, .02], [1, .12], [.75, .42], [.4, .75], [.12, .95], [0, 1]], 18),
  wedge: (i) => once('wedge' + i, () => new THREE.CylinderGeometry(.04, 2.05, .75, 3, 1, false, (i * TAU) / 8, TAU / 8)),
  lily: () => once('lily', () => new THREE.CylinderGeometry(.32, .32, .03, 20, 1, false, .4, TAU - .4)),
};
let TOY = null;
function toyMats() {
  if (TOY) return TOY;
  TOY = {
    matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }),
    soft: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), // most of the world: kept cheap to draw
    gloss: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .28, clearcoat: .8, clearcoatRoughness: .15 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .75, roughness: .28 }),
    bulb: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 1.3, roughness: .4 }),
    neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), // lit signs and screens: their own colour, unlit
  };
  return TOY;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
// each source shape is stripped to position + normal and indexed once, then reused
const PREP = new WeakMap();
function prep(geo) {
  let g = PREP.get(geo);
  if (!g) { g = geo.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.index) g = mergeVertices(g); PREP.set(geo, g); }
  return g;
}
// owner: an Animal Crossing world. Every prop's colour is softened as it is batched: near-blacks become warm wood,
// cool steel greys become cream and pale timber, and shiny metal turns into soft matte (neon and bulbs are left alone)
const _hsl = {};
function cozy(c, kind) {
  c.getHSL(_hsl); const { h, s, l } = _hsl;
  if (l < .2) c.set(s > .25 ? new THREE.Color().setHSL(h, Math.min(.45, s), .42) : '#a77b58');
  else if (s < .14 && l > .62) c.set('#f6ecdc');
  else if (s < .14) c.set(l > .4 ? '#e2cba8' : '#b58a64');
  return kind === 'metal' || kind === 'gloss' ? 'soft' : kind;
}
class Batch {
  constructor() { this.parts = {}; }
  add(geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = 1, kind = 'soft' } = {}) {
    const g = prep(geo).clone();
    if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
    g.applyMatrix4(_m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s));
    _c.set(color); if (kind !== 'neon' && kind !== 'bulb') { kind = cozy(_c, kind); } const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (this.parts[kind] ||= []).push(g); return this;
  }
  build(parent, { shadows = true, cast = true } = {}) {
    const mats = toyMats();
    for (const [kind, list] of Object.entries(this.parts)) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mats[kind]);
      mesh.castShadow = shadows && cast; mesh.receiveShadow = true; mesh.userData.batch = true; parent.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.parts = {};
  }
}
const FRESNEL_VERT = `varying vec3 vN; varying vec3 vV;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
function glassMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: FRESNEL_VERT,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float f = pow(1.0 - abs(dot(n, normalize(vV))), 3.0);
        gl_FragColor = vec4(mix(vec3(.86, .97, 1.0), vec3(1.0), f), .05 + f * .45);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
function waterMat(night = false) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDeep: { value: new THREE.Color(night ? '#122026' : '#3f9fe0') }, uShallow: { value: new THREE.Color(night ? '#2c434d' : '#9ee6ef') }, uRim: { value: new THREE.Color(night ? '#776652' : '#ffffff') } }]),
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uRim; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vUv * 2.0 - 1.0; float d = length(p);
        vec3 col = mix(uDeep, uShallow, smoothstep(.3, .95, d));
        float rip = sin(d * 26.0 - uTime * 1.6 + sin(atan(p.y, p.x) * 3.0) * .6);
        col += vec3(.09) * smoothstep(.82, 1.0, rip) * (1.0 - d);
        vec2 cell = floor(vUv * 48.0);
        float spark = step(.993, fract(sin(dot(cell, vec2(12.9898, 78.233)) + floor(uTime * 1.5) * 7.13) * 43758.5453));
        col += vec3(.55) * spark * (1.0 - d);
        col = mix(col, uRim, smoothstep(.88, .97, d) * .75);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// the harbour bay (owner: "fix the aesthetics"): shallow aqua at the quay deepening to toy blue further out, slow swell
// bands, little glinting crests, a wobbly foam line along the quay and twinkles, all in world space so any size tiles
function seaMat() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uShore: { value: 56.3 }, uShallow: { value: new THREE.Color('#8fe6f2') }, uMid: { value: new THREE.Color('#4cc2ea') }, uDeep: { value: new THREE.Color('#3a8fe0') } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform float uShore; uniform vec3 uShallow; uniform vec3 uMid; uniform vec3 uDeep; varying vec3 vW;
      #include <fog_pars_fragment>
      void main() {
        float d = vW.x - uShore;
        vec3 col = mix(uShallow, uMid, smoothstep(0.0, 10.0, d)); col = mix(col, uDeep, smoothstep(12.0, 48.0, d));
        float sw = sin(vW.x * .55 + vW.z * .18 - uTime * .9) * .5 + sin(vW.z * .37 - vW.x * .21 + uTime * .7) * .5;
        col += vec3(.045) * smoothstep(.5, 1.0, sw);
        vec2 q = vW.xz * vec2(.9, 1.6);
        float cr = sin(q.x + sin(q.y * .9 + uTime) * 1.3 + uTime * .8) * sin(q.y * .7 - uTime * .6);
        col = mix(col, vec3(1.0), smoothstep(.88, .98, cr) * .3);
        float f = smoothstep(.5, .05, d + sin(vW.z * 1.7 + uTime * 1.4) * .12 + sin(vW.z * 4.3 - uTime * 2.1) * .05);
        col = mix(col, vec3(1.0), f * .7);
        vec2 cell = floor(vW.xz * 1.4);
        float spark = step(.996, fract(sin(dot(cell, vec2(12.9898, 78.233)) + floor(uTime * 2.0) * 7.13) * 43758.5453));
        col += vec3(.55) * spark;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// ---------------------------------------------------------------- canvases on signs and screens
function canvasPlane(w, h, pxW, pxH, { basic = true } = {}) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: .8 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return { c, x: c.getContext('2d'), tex, mesh };
}
function wrap(x, text, maxW) { const words = text.split(' '), lines = []; let line = ''; words.forEach((w) => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }); if (line) lines.push(line); return lines; }
function drawFace(x, cx, cy, r, body, belly) {
  x.fillStyle = body; x.beginPath(); x.ellipse(cx, cy, r, r * .86, 0, 0, TAU); x.fill();
  x.fillStyle = belly; x.beginPath(); x.ellipse(cx, cy + r * .32, r * .58, r * .42, 0, 0, TAU); x.fill();
  [-1, 1].forEach((s) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + s * r * .36, cy - r * .18, r * .24, 0, TAU); x.fill(); x.fillStyle = '#151c1f'; x.beginPath(); x.arc(cx + s * r * .36 + r * .04, cy - r * .15, r * .13, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + s * r * .36 + r * .09, cy - r * .22, r * .045, 0, TAU); x.fill(); });
  x.strokeStyle = '#151c1f'; x.lineWidth = r * .07; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy + r * .1, r * .16, .2 * Math.PI, .8 * Math.PI); x.stroke();
  x.fillStyle = 'rgba(255,120,150,.45)'; [-1, 1].forEach((s) => { x.beginPath(); x.ellipse(cx + s * r * .62, cy + r * .1, r * .14, r * .08, 0, 0, TAU); x.fill(); });
}
const FONT = '"Bricolage Grotesque", "Avenir Next", system-ui, sans-serif', MONO = '"Martian Mono", ui-monospace, Menlo, monospace', BODY = '"Hanken Grotesk", system-ui, sans-serif';
const ROUND = '"Fredoka", "Nunito", "Avenir Next Rounded", "Avenir Next", system-ui, sans-serif';

// ---------------------------------------------------------------- the world
export function buildWorld(scene, { shadows = true, seed = 7, labTubes = true, city = true } = {}) {
  const R = rng(seed);
  const group = new THREE.Group(); scene.add(group);
  const texts = [], obstacles = [], waters = [];

  // sky, fog, light
  const SKY = city ? '#1a2a31' : '#d3ebfb';
  scene.fog = new THREE.Fog(SKY, 50, 135);
  if (city) labTubes = false;
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(city ? '#060a0c' : '#58acef') }, mid: { value: new THREE.Color(SKY) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; varying vec3 vP;
      void main(){ float h = clamp(vP.y * 1.4, 0.0, 1.0); gl_FragColor = vec4(mix(mid, top, pow(h, .7)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), skyMat);
  scene.add(sky);
  const hemi = new THREE.HemisphereLight('#e4f3ff', '#86b866', .85);
  const sun = new THREE.DirectionalLight('#fff0d6', 2.5); sun.position.set(14, 22, 10);
  if (shadows) { sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 2, far: 70 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; }
  const fill = new THREE.DirectionalLight('#d2e7ff', .5); fill.position.set(-12, 8, -8);
  scene.add(hemi, sun, fill, sun.target); // the target moves with the player (world.follow), so every district gets shadows
  if (city) { // neon spill from the signs: orchid from one side, cool lavender from the other
    const pink = new THREE.DirectionalLight('#dfbc95', .55); pink.position.set(-14, 6, 4);
    const cyan = new THREE.DirectionalLight('#f6c68f', .5); cyan.position.set(14, 6, -4);
    scene.add(pink, cyan);
  }

  // ---------------------------------------------------------------- ground and nature
  if (city) buildCityGround(group, R); else buildGround(group, R);
  const D = new Batch(), T = new Batch(), H = new Batch();
  const free = (x, z, { road = 1.7, pad = 4.3, pond = 1.6, plaza = 5 } = {}) =>
    Math.hypot(x, z) > plaza && roadDist(x, z) > road && !nearStation(x, z, pad) && Math.hypot(x - POND.x, z - POND.z) > POND.r + pond && Math.abs(x) < 21 && Math.abs(z) < 21;

  // pond with rim stones, lily pads and reeds
  const pondMat = waterMat(false); waters.push(pondMat); // owner: clear blue water everywhere, no dark city pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 64), pondMat); pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, .03, POND.z); pond.receiveShadow = true; group.add(pond);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + R() * .1; if (R() < .3) continue; D.add(G.sphLo(), pick(R, STONES), { p: [POND.x + Math.sin(a) * (POND.r + .05), .08, POND.z + Math.cos(a) * (POND.r + .05)], s: [.26 + R() * .14, .14 + R() * .08, .22 + R() * .1], r: [0, a, 0] }); }
  if (!city) for (let i = 0; i < 6; i++) { const a = R() * TAU, rr = .4 + R() * (POND.r - 1.3), x = POND.x + Math.sin(a) * rr, z = POND.z + Math.cos(a) * rr; D.add(G.lily(), '#5fb45a', { p: [x, .06, z], r: [0, R() * TAU, 0], s: .7 + R() * .5 }); if (R() < .5) D.add(G.sph(), '#ffd1e3', { p: [x, .1, z], s: [.08, .06, .08] }); }
  if (!city) for (let i = 0; i < 9; i++) { const a = 2.2 + R() * 1.6, x = POND.x + Math.sin(a) * (POND.r - .25), z = POND.z + Math.cos(a) * (POND.r - .25), h = .5 + R() * .45; D.add(G.cap(.03, h), '#5c9c4a', { p: [x, h / 2 + .05, z], r: [(R() - .5) * .3, 0, (R() - .5) * .3] }); D.add(G.cap(.05, .12), '#8a5a3a', { p: [x, h + .06, z] }); }
  obstacles.push({ x: POND.x, z: POND.z, r: POND.r + .3 });

  // rolling hills on the horizon, with trees on top
  const tree = (B, x, z, sc, y = groundY(x, z), kind = R() < .72 ? 'round' : 'pine') => {
    if (kind === 'round') {
      B.add(G.trunk(), TRUNK, { p: [x, y + .7 * sc, z], s: [.19 * sc, 1.4 * sc, .19 * sc] });
      const c = pick(R, GREENS);
      B.add(G.sphLo(), c, { p: [x, y + 2.05 * sc, z], s: [1.02 * sc, .92 * sc, 1.02 * sc] });
      for (let k = 0; k < 3; k++) { const a = R() * TAU; B.add(G.sphLo(), pick(R, GREENS), { p: [x + Math.sin(a) * .62 * sc, y + (1.72 + R() * .3) * sc, z + Math.cos(a) * .62 * sc], s: .62 * sc }); }
      B.add(G.sphLo(), c, { p: [x, y + 2.72 * sc, z], s: .55 * sc });
      if (R() < .45) { const f = pick(R, FRUIT); for (let k = 0; k < 5; k++) { const a = R() * TAU, h = 1.75 + R() * .6; B.add(G.sphLo(), f, { p: [x + Math.sin(a) * .98 * sc, y + h * sc, z + Math.cos(a) * .98 * sc], s: .1 * sc, kind: 'gloss' }); } }
    } else {
      B.add(G.trunk(), TRUNK, { p: [x, y + .45 * sc, z], s: [.16 * sc, .9 * sc, .16 * sc] });
      const c = pick(R, PINES);
      [0, 1, 2].forEach((i) => B.add(G.pine(), c, { p: [x, y + (.75 + i * .72) * sc, z], s: [(1.15 - i * .28) * sc, (1.05 - i * .12) * sc, (1.15 - i * .28) * sc] }));
    }
  };
  const skyG = new THREE.Group(); group.add(skyG); const skyline = city ? buildSkyline(skyG, R) : null; // hidden in the park, which is in the woods
  if (!city) for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU + R() * .2, r = 27 + R() * 6, x = Math.sin(a) * r, z = Math.cos(a) * r;
    const sx = 5 + R() * 3.5, sy = 2.2 + R() * 2.4, sz = 5 + R() * 3.5, y = groundY(x, z) - sy * .35;
    H.add(G.sph(), pick(R, HILLS), { p: [x, y, z], s: [sx, sy, sz], kind: 'matte' });
    const n = 1 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) { const dx = (R() - .5) * sx * .9, dz = (R() - .5) * sz * .9, ty = y + sy * Math.sqrt(Math.max(0, 1 - (dx / sx) ** 2 - (dz / sz) ** 2)) - .15; tree(H, x + dx, z + dz, 1.1 + R() * .5, ty); }
  }
  // a ring of trees just inside the edge of the play area
  const trees = [];
  for (let k = 0; k < 400 && trees.length < 24; k++) {
    const a = R() * TAU, r = 17.5 + R() * 4, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!free(x, z, { road: 2.2, pad: 5, pond: 2.5 }) && !(Math.abs(x) >= 21 || Math.abs(z) >= 21)) continue;
    if (roadDist(x, z) < 5 || nearStation(x, z, 5) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 2.5) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.4)) continue;
    if (city) { if (trees.length >= 0 || trees.some((t) => Math.hypot(t.x - x, t.z - z) < 7)) continue; const r = cityProp(D, R, x, z, 'lamp'); trees.push({ x, z }); obstacles.push({ x, z, r }); continue; } // owner: a few lamps only, no vending boxes
    const sc = .85 + R() * .25; tree(T, x, z, sc); trees.push({ x, z }); obstacles.push({ x, z, r: .55 * sc });
  }
  // bushes, some flowering, and rocks
  const bush = (x, z, sc = 1) => {
    const c = pick(R, BUSH);
    [[0, 0, .55], [.38, .1, .42], [-.36, -.08, .45], [.05, .32, .4]].forEach(([dx, dz, s]) => D.add(G.sphLo(), c, { p: [x + dx * sc, s * .7 * sc, z + dz * sc], s: [s * sc, s * .82 * sc, s * sc] }));
    if (R() < .6) {
      const f = pick(R, FLOWERS);
      for (let k = 0; k < 7; k++) { const th = R() * TAU, ph = R() * 1.1, d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; D.add(G.sphLo(), f, { p: [x + d[0] * .55 * sc, (.385 + d[1] * .45) * sc, z + d[2] * .55 * sc], s: .075 * sc, kind: 'gloss' }); }
    }
    obstacles.push({ x, z, r: .6 * sc });
  };
  if (!city) for (let k = 0, n = 0; k < 600 && n < 26; k++) { const a = R() * TAU, r = 6 + R() * 13, x = Math.sin(a) * r, z = Math.cos(a) * r; if (!free(x, z, { road: 1.9, pad: 4.1 })) continue; bush(x, z, .8 + R() * .5); n++; }
  if (!city) for (let k = 0, n = 0; k < 400 && n < 14; k++) { const a = R() * TAU, r = 5.5 + R() * 15, x = Math.sin(a) * r, z = Math.cos(a) * r; if (!free(x, z)) continue; D.add(G.sphLo(), pick(R, STONES), { p: [x, .08, z], s: [.32 + R() * .3, .18 + R() * .14, .28 + R() * .24], r: [0, R() * 3, 0] }); n++; }
  // lamps around the plaza
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, x = Math.sin(a) * 4.85, z = Math.cos(a) * 4.85;
    if (city) { // slim dark posts with a neon collar and a cool white disc head
      D.add(G.cyl(16), '#cdd7df', { p: [x, .08, z], s: [.18, .16, .18], kind: 'metal' });
      D.add(G.cyl(12), '#cdd7df', { p: [x, 1.4, z], s: [.05, 2.7, .05], kind: 'metal' });
      D.add(G.torus(.07, .022, TAU, 16), new THREE.Color(NEON[k % NEON.length]).multiplyScalar(.85), { p: [x, 1.1, z], r: [Math.PI / 2, 0, 0], kind: 'neon' });
      D.add(G.cyl(20), '#cdd7df', { p: [x, 2.78, z], s: [.26, .08, .26], kind: 'metal' });
      D.add(G.cyl(20), new THREE.Color('#ffe8d0').multiplyScalar(1.2), { p: [x, 2.73, z], s: [.21, .02, .21], kind: 'neon' });
      obstacles.push({ x, z, r: .22 });
      continue;
    }
    D.add(G.cyl(16), '#3e5b4c', { p: [x, .1, z], s: [.17, .2, .17], kind: 'gloss' });
    D.add(G.cap(.055, 2.2), '#3e5b4c', { p: [x, 1.25, z], kind: 'gloss' });
    D.add(G.sph(), '#3e5b4c', { p: [x, 2.5, z], s: [.24, .13, .24], kind: 'gloss' });
    D.add(G.sph(), '#fff3d6', { p: [x, 2.36, z], s: .15, kind: 'bulb' });
    obstacles.push({ x, z, r: .25 });
  }
  // ---- street life in the city: benches round the fountain, planters, string lights over the plaza, a ramen cart,
  // parked scooters and slow drifting motes of light (all batched or instanced, so it stays smooth)
  const extras = [];
  if (city) {
    const place = (x, z, ry, dx, dz) => [x + Math.cos(ry) * dx + Math.sin(ry) * dz, z - Math.sin(ry) * dx + Math.cos(ry) * dz];
    // benches facing the fountain (east, west, south: the north side is the walk from the cafe door)
    [Math.PI / 2, -Math.PI / 2].forEach((a, k) => {
      const x = Math.sin(a) * 3.35, z = Math.cos(a) * 3.35, ry = a + Math.PI, at = (dx, y, dz) => { const [px, pz] = place(x, z, ry, dx, dz); return [px, y, pz]; };
      D.add(G.rbox(1.6, .08, .5, .03), '#d1dbe2', { p: at(0, .46, 0), r: [0, ry, 0], kind: 'matte' });
      D.add(G.rbox(1.6, .42, .07, .03), '#d1dbe2', { p: at(0, .76, -.24), r: [-.12, ry, 0], kind: 'matte' });
      [-.66, .66].forEach((dx) => { D.add(G.rbox(.06, .44, .44, .02), '#cbd6de', { p: at(dx, .23, 0), r: [0, ry, 0], kind: 'metal' }); });
      D.add(G.rbox(1.5, .025, .025, .012), new THREE.Color(NEON[k % NEON.length]).multiplyScalar(.9), { p: at(0, .4, .24), r: [0, ry, 0], kind: 'neon' });
      obstacles.push({ x, z, r: .8 });
    });
    // planters with small trees, lit from below
    const spots = [];
    for (let k = 0; k < 300 && spots.length < 0; k++) {
      const a = R() * TAU, r = 6.4 + R() * 3.2, x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (!free(x, z, { road: 2.6, pad: 4.4, plaza: 6.6 }) || spots.some((q) => Math.hypot(q.x - x, q.z - z) < 3.2)) continue;
      spots.push({ x, z });
      D.add(G.rbox(1.15, .55, 1.15, .07), '#48575e', { p: [x, .285, z], kind: 'matte' });
      D.add(G.rbox(1.0, .05, 1.0, .02), '#c9d5dd', { p: [x, .56, z], kind: 'matte' }); // soil
      { const nc = new THREE.Color(pick(R, NEON)).multiplyScalar(.85); [[0, .59], [0, -.59]].forEach(([dx, dz]) => D.add(G.rbox(1.2, .03, .03, .012), nc, { p: [x + dx, .56, z + dz], kind: 'neon' })); [[.59, 0], [-.59, 0]].forEach(([dx, dz]) => D.add(G.rbox(.03, .03, 1.2, .012), nc, { p: [x + dx, .56, z + dz], kind: 'neon' })); }
      D.add(G.cyl(10), '#e1d3cf', { p: [x, .95, z], s: [.07, .8, .07] });
      const leaf = pick(R, ['#5f9a86', '#6f86b8', '#b39777']);
      [[0, 1.55, 0, .62], [.3, 1.35, .15, .4], [-.28, 1.4, -.12, .42], [.05, 1.9, .05, .38]].forEach(([dx, y, dz, sc]) => D.add(G.sphLo(), leaf, { p: [x + dx, y, z + dz], s: [sc, sc * .9, sc] }));
      obstacles.push({ x, z, r: .8 });
    }
    // a ramen cart with a striped awning and a paper lantern (owner: off, it cluttered the square)
    for (let k = 0; k < 0; k++) {
      const x = -3 - R() * 6, z = 5.5 + R() * 4; if (!free(x, z, { road: 1.6, pad: 4.4, plaza: 5.6 }) || spots.some((q) => Math.hypot(q.x - x, q.z - z) < 2.6)) continue;
      const ry = Math.atan2(-x, -z), at = (dx, y, dz) => { const [px, pz] = place(x, z, ry, dx, dz); return [px, y, pz]; };
      D.add(G.rbox(1.7, .85, .85, .06), '#7b3346', { p: at(0, .7, 0), r: [0, ry, 0], kind: 'gloss' });
      D.add(G.rbox(1.8, .07, .95, .03), '#d9c7a8', { p: at(0, 1.16, 0), r: [0, ry, 0], kind: 'matte' });
      [-.6, .6].forEach((dx) => D.add(G.torus(.2, .055, TAU, 18), '#c8d4dc', { p: at(dx, .22, .44), r: [0, ry, 0], kind: 'matte' }));
      [-.82, .82].forEach((dx) => D.add(G.cyl(8), '#ced9e0', { p: at(dx, 1.62, -.38), s: [.035, .95, .035], r: [0, ry, 0], kind: 'metal' }));
      for (let i = 0; i < 6; i++) D.add(G.rbox(.32, .05, 1.05, .02), i % 2 ? '#f3e6d0' : '#c94a5c', { p: at(-.8 + i * .32, 2.1, -.05), r: [.18, ry, 0], kind: 'matte' });
      D.add(G.sph(), new THREE.Color('#f0a07c').multiplyScalar(1.2), { p: at(.75, 1.75, .42), s: [.17, .22, .17], kind: 'neon' });
      D.add(G.cyl(16), '#e8e1d2', { p: at(-.4, 1.25, .1), s: [.14, .12, .14], kind: 'gloss' }); D.add(G.cyl(16), '#e8e1d2', { p: at(-.05, 1.25, .1), s: [.14, .12, .14], kind: 'gloss' });
      { const sg = neonSign('ラーメン', .9, .24, '#f0c27e'); const [sx, sy, sz] = at(0, .78, .44); sg.position.set(sx, sy, sz); sg.rotation.y = ry; group.add(sg); }
      obstacles.push({ x, z, r: 1.0 });
      // steam rising off the bowls
      const steam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8ded2', transparent: true, opacity: .18, depthWrite: false }), 6), sd = new THREE.Object3D(), base = at(-.22, 1.35, .1);
      group.add(steam); extras.push((t) => { for (let i = 0; i < 6; i++) { const k2 = ((t * .35 + i / 6) % 1); sd.position.set(base[0] + Math.sin(t + i) * .08, base[1] + k2 * 1.1, base[2]); sd.scale.setScalar(.06 + k2 * .16); sd.updateMatrix(); steam.setMatrixAt(i, sd.matrix); } steam.instanceMatrix.needsUpdate = true; });
      break;
    }
    // parked scooters
    for (let k = 0, n = 0; k < 0 && n < 3; k++) { // owner: no scooters
      const a = R() * TAU, r = 6 + R() * 5, x = Math.sin(a) * r, z = Math.cos(a) * r; if (!free(x, z, { road: 2.4, pad: 4.2, plaza: 6.6 }) || spots.some((q) => Math.hypot(q.x - x, q.z - z) < 2)) continue;
      const ry = R() * TAU, at = (dx, y, dz) => { const [px, pz] = place(x, z, ry, dx, dz); return [px, y, pz]; }, col = pick(R, ['#faddbb', '#f0c27e', '#9fd8c8', '#f0a0b8']);
      D.add(G.rbox(.3, .12, 1.0, .05), col, { p: at(0, .3, 0), r: [0, ry, 0], kind: 'gloss' });
      [-.42, .42].forEach((dz) => D.add(G.torus(.17, .05, TAU, 16), '#c8d4dc', { p: at(0, .19, dz), r: [0, ry + Math.PI / 2, 0], kind: 'matte' }));
      D.add(G.cyl(8), '#ced9e0', { p: at(0, .7, .4), s: [.035, .85, .035], r: [-.2, ry, 0], kind: 'metal' });
      D.add(G.rbox(.5, .04, .04, .02), '#ced9e0', { p: at(0, 1.1, .48), r: [0, ry, 0], kind: 'metal' });
      D.add(G.rbox(.26, .1, .38, .04), '#cdd8df', { p: at(0, .5, -.2), r: [0, ry, 0], kind: 'matte' });
      obstacles.push({ x, z, r: .55 }); n++;
    }
    // string lights from the four plaza lamps up to a ring over the fountain, and round between the lamps
    const bulbs = [], cable = [], heads = [0, 1, 2, 3].map((k) => { const a = Math.PI / 4 + k * Math.PI / 2; return new THREE.Vector3(Math.sin(a) * 4.85, 2.8, Math.cos(a) * 4.85); });
    const strand = (a, b, sag, n) => { for (let i = 0; i <= n; i++) { const u = i / n, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; cable.push(p); if (i > 0 && i < n) bulbs.push(p); } };
    /* owner: no string lights, they crossed every view */ // owner: only round the plaza, nothing hanging over the fountain
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.034, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbs.length), bo = new THREE.Object3D(), bc = new THREE.Color();
    bulbs.forEach((p, i) => { bo.position.copy(p); bo.updateMatrix(); bm.setMatrixAt(i, bo.matrix); bm.setColorAt(i, bc.set(['#ffd9a8', '#fbe5cc', '#ffc2d6'][i % 3]).multiplyScalar(1.05)); });
    group.add(bm);
    const cg = new THREE.BufferGeometry(); const segs = []; for (let i = 1; i < cable.length; i++) if (cable[i].distanceTo(cable[i - 1]) < 1.2) segs.push(cable[i - 1], cable[i]);
    cg.setFromPoints(segs); group.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: '#283033' })));
    // drifting motes of light over the plaza
    const NM = 90, motes = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fbe5cc').multiplyScalar(1.4), transparent: true, opacity: .7, depthWrite: false, toneMapped: false }), NM), mo = new THREE.Object3D();
    const md = Array.from({ length: NM }, () => ({ a: R() * TAU, r: 1.5 + R() * 13, y: R() * 4, s: .15 + R() * .35, w: R() * TAU }));
    group.add(motes);
    extras.push((t, dt) => { md.forEach((m, i) => { m.y += dt * m.s * .35; if (m.y > 4.6) m.y = .2; m.a += dt * .02; mo.position.set(Math.sin(m.a) * m.r + Math.sin(t * .6 + m.w) * .3, m.y, Math.cos(m.a) * m.r); mo.scale.setScalar(.7 + Math.sin(t * 2 + m.w) * .3); mo.updateMatrix(); motes.setMatrixAt(i, mo.matrix); }); motes.instanceMatrix.needsUpdate = true; });
  }
  H.build(group, { shadows, cast: false });
  T.build(group, { shadows });
  D.build(group, { shadows });

  // flowers and grass tufts, instanced
  const petals = mergeGeometries(Array.from({ length: 5 }, (_, i) => { const s = G.sphLo().clone(); s.scale(.065, .024, .042); s.translate(0, 0, .058); s.rotateY((i * TAU) / 5); return s; }));
  const centerGeo = G.sphLo().clone(); centerGeo.scale(.032, .024, .032);
  const stemGeo = new THREE.CylinderGeometry(.012, .016, .26, 5); stemGeo.translate(0, .13, 0);
  const NF = 460;
  const fHeads = new THREE.InstancedMesh(petals, new THREE.MeshStandardMaterial({ roughness: .55 }), NF);
  const fCenters = new THREE.InstancedMesh(centerGeo, new THREE.MeshStandardMaterial({ color: '#ffcf3a', roughness: .5 }), NF);
  const fStems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#4f9a42', roughness: .8 }), NF);
  const dm = new THREE.Object3D(); let fi = 0;
  const patches = [];
  for (let k = 0; k < 900 && patches.length < (city ? 26 : 48); k++) { const a = R() * TAU, r = 5.2 + R() * 15, x = Math.sin(a) * r, z = Math.cos(a) * r; if (free(x, z, { road: 1.5, pad: 3.9 })) patches.push({ x, z, c: pick(R, FLOWERS), c2: pick(R, FLOWERS) }); }
  patches.forEach((pt) => {
    const n = 5 + Math.floor(R() * 7);
    for (let i = 0; i < n && fi < NF; i++) {
      const a = R() * TAU, rr = Math.sqrt(R()) * .9, x = pt.x + Math.sin(a) * rr, z = pt.z + Math.cos(a) * rr; if (!free(x, z, { road: 1.3, pad: 3.7 })) continue;
      const sc = .85 + R() * .4, tilt = (R() - .5) * .3;
      dm.position.set(x, 0, z); dm.rotation.set(tilt, R() * TAU, 0); dm.scale.setScalar(sc); dm.updateMatrix(); fStems.setMatrixAt(fi, dm.matrix);
      dm.position.set(x + Math.sin(tilt) * .0, .26 * sc, z); dm.updateMatrix(); fHeads.setMatrixAt(fi, dm.matrix); fCenters.setMatrixAt(fi, dm.matrix);
      fHeads.setColorAt(fi, _c.set(R() < .7 ? pt.c : pt.c2)); fi++;
    }
  });
  [fHeads, fCenters, fStems].forEach((m) => { m.count = fi; m.castShadow = false; m.receiveShadow = true; group.add(m); });
  const bladeGeo = mergeGeometries([-1, 0, 1].map((k) => { const c = new THREE.ConeGeometry(.035, .32, 4); c.translate(0, .16, 0); c.rotateZ(k * .28); c.rotateY(k * 1.9); return c; }));
  const NT = city ? 2400 : 700, tufts = new THREE.InstancedMesh(bladeGeo, new THREE.MeshStandardMaterial({ roughness: .9 }), NT); let ti = 0;
  for (let k = 0; k < 12000 && ti < NT; k++) { // owner: real grass in the town too
    const x = (R() - .5) * 42, z = (R() - .5) * 42; if (!free(x, z, { road: 1.25, pad: 3.6, plaza: 4.6, pond: .9 })) continue;
    { const gs = city ? 1.05 : 1; dm.position.set(x, 0, z); dm.rotation.set(0, R() * TAU, 0); dm.scale.set(gs, gs * (city ? .45 + R() * .35 : .7 + R() * .8), gs); dm.updateMatrix(); tufts.setMatrixAt(ti, dm.matrix); }
    tufts.setColorAt(ti++, city ? _c.setHSL(.28 + R() * .05, .48, .36 + R() * .1) : _c.setHSL(.27 + R() * .05, .52, .34 + R() * .12));
  }
  tufts.count = ti; tufts.receiveShadow = true; group.add(tufts);

  // puffy clouds on a ring around the horizon, far enough out that they never come between the camera and the world
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .42 });
  const cloudData = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + R() * .3, r = 74 + R() * 18, cy = 6 + R() * 12, n = 5 + Math.floor(R() * 3), big = 2.2 + R() * 1.6;
    for (let k = 0; k < n; k++) cloudData.push({ a, r, dx: (k - n / 2) * big * .95 + (R() - .5), y: cy + R() * big * .5, dz: (R() - .5) * big * 1.2, s: big * (.75 + R() * .5) });
  }
  const clouds = new THREE.InstancedMesh(G.sph(), cloudMat, cloudData.length); group.add(clouds); clouds.visible = !city;

  // butterflies over the flower patches
  const wingGeo = new THREE.CircleGeometry(.1, 12); wingGeo.scale(1, .78, 1); wingGeo.translate(.1, 0, 0); wingGeo.rotateX(-Math.PI / 2);
  const flies = patches.slice(0, 7).map((pt, i) => {
    const grp = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: pick(R, ['#fff3a8', '#ffffff', '#ffb6d9', '#9fd8ff', '#ffc78a']), roughness: .6, side: THREE.DoubleSide });
    const wr = new THREE.Mesh(wingGeo, mat), wl = new THREE.Mesh(wingGeo, mat); wl.scale.x = -1;
    const body = new THREE.Mesh(G.cap(.012, .08), new THREE.MeshStandardMaterial({ color: '#3a2a22' })); body.rotation.x = Math.PI / 2;
    grp.add(wr, wl, body); group.add(grp);
    return { grp, wr, wl, cx: pt.x, cz: pt.z, ph: i * 1.7, rad: .8 + R() * .8 };
  });

  // ---------------------------------------------------------------- stations
  const stations = {};
  const label = (text, w, h, { bg = '#fff7e8', fg = '#6b4423', size = .6, weight = 600 } = {}) => {
    const pxH = 160, pxW = Math.round((pxH * w) / h), p = canvasPlane(w, h, pxW, pxH, { basic: false });
    const draw = () => { const x = p.x; x.fillStyle = bg; x.fillRect(0, 0, pxW, pxH); x.fillStyle = fg; x.font = `${weight} ${Math.round(pxH * size)}px ${ROUND}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, pxW / 2, pxH * .54); p.tex.needsUpdate = true; };
    draw(); texts.push(draw); return p.mesh;
  };
  // a rounded board with its text, facing +z; the board goes in the batch, the text is returned to add to the group
  const plaque = (S, text, w, h, [px, py, pz], { rim = '#a8743f', depth = .1, ...o } = {}) => {
    S.add(G.rbox(+(w + .14).toFixed(3), +(h + .14).toFixed(3), depth, .06), rim, { p: [px, py, pz] });
    const m = label(text, w, h, o); m.position.set(px, py, pz + depth / 2 + .004); return m;
  };
  const addStation = (id, build) => {
    const s = ST[id], st = build(s);
    if ((id === 'well' || id === 'tower' || id === 'billboard') && city) { st.gone = true; st.rects = []; st.circles = []; st.payout = () => {}; } // owner: no fountain in the square
    st.group.position.set(s.x, 0, s.z); st.group.rotation.y = s.rot;
    st.def = s; stations[id] = st; if (!st.gone) group.add(st.group);
    st.group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.userData.batch) { const m = Array.isArray(o.material) ? o.material[0] : o.material; o.castShadow = shadows && !m.transparent; o.receiveShadow = true; } });
    (st.rects || []).forEach(([x0, z0, x1, z1]) => {
      const a = toWorld(s, x0, z0), b = toWorld(s, x1, z1);
      obstacles.push({ rect: [Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)] });
    });
    (st.circles || []).forEach(([x, z, r]) => { const w = toWorld(s, x, z); obstacles.push({ x: w.x, z: w.z, r }); });
  };
  const SPH = G.sph();
  const M = {
    gold: new THREE.MeshStandardMaterial({ color: '#ffc93d', metalness: .9, roughness: .26, emissive: new THREE.Color('#ff9f00'), emissiveIntensity: .3 }),
    glow: new THREE.MeshStandardMaterial({ color: '#62e6cf', emissive: new THREE.Color('#62e6cf'), emissiveIntensity: 5 }),
    red: new THREE.MeshPhysicalMaterial({ color: '#ef5b4c', roughness: .45, clearcoat: .4 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#fbf8f2', roughness: .5, sheen: .4, sheenColor: new THREE.Color('#ffffff') }),
    dark: new THREE.MeshStandardMaterial({ color: '#2b3236', metalness: .4, roughness: .5 }),
    metal: new THREE.MeshStandardMaterial({ color: '#d3d9de', metalness: .85, roughness: .28 }),
    door: new THREE.MeshPhysicalMaterial({ color: '#ffd36e', roughness: .5, sheen: .5, sheenColor: new THREE.Color('#fff4d0'), clearcoat: .2 }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.9, .62, .12), transparent: true, opacity: .88, depthWrite: false }),
    flameCore: new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.7, 1.75, .45), transparent: true, opacity: .95, depthWrite: false }),
    smoke: new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 1, transparent: true, opacity: .9, depthWrite: false }),
    heart: new THREE.MeshStandardMaterial({ color: '#ff6f9a', emissive: new THREE.Color('#ff4f86'), emissiveIntensity: 3.2, roughness: .3 }),
    beacon: new THREE.MeshStandardMaterial({ color: '#ff5050', emissive: new THREE.Color('#ff4a4a'), emissiveIntensity: 8 }),
  };
  if (city) { // softer emissives at night: the glow material, hearts and beacons in the lavender palette
    M.glow.color.set('#f8d5ad'); M.glow.emissive.set('#e7b985'); M.glow.emissiveIntensity = 1.4;
    M.heart.color.set('#e8cbaa'); M.heart.emissive.set('#d8ad7c'); M.heart.emissiveIntensity = 1.1;
    M.beacon.emissive.set('#ff5a6a');
  }
  const coinGeo = new THREE.CylinderGeometry(.1, .1, .025, 18); coinGeo.rotateX(Math.PI / 2);
  // city kit: HDR neon colours (bright enough to bloom), sign helpers, and soft additive light pools on the wet ground
  // in the city, neon is kept just at the edge of the bloom threshold so only a few things glow, in the lavender palette
  const hot = (hex, k = 2.6) => city ? new THREE.Color(tint(hex)).multiplyScalar(Math.min(1.1, .3 + k * .3)) : new THREE.Color(hex).multiplyScalar(k);
  const sign = (parent, text, w, h, color, [x, y, z], ry = 0, o) => { const s = neonSign(text, w, h, color, o); s.position.set(x, y, z); s.rotation.y = ry; parent.add(s); return s; };
  const twoSided = (parent, text, w, h, color, [x, y, z], ry = 0, o, gap = .03) => [sign(parent, text, w, h, color, [x + Math.sin(ry) * gap, y, z + Math.cos(ry) * gap], ry, o), sign(parent, text, w, h, color, [x - Math.sin(ry) * gap, y, z - Math.cos(ry) * gap], ry + Math.PI, o)];
  const POOL = city && once('pool', () => canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }));
  const pool = (parent, x, z, w, d, color, o = .5) => { if (city) return new THREE.Object3D(); // no light pools at noon (they read as pale slabs); an empty stand-in so callers can still set rotation
    return poolNight(parent, x, z, w, d, color, o); };
  const poolNight = (parent, x, z, w, d, color, o = .5) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: POOL, color: tint(color), transparent: true, opacity: o * .45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .025, z); m.renderOrder = 1; parent.add(m); return m; };
  const STEEL = '#24292c', STEEL2 = '#363d40', CONC = '#2b3134';
  const heartGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, .25); s.bezierCurveTo(0, .3, -.05, .45, -.25, .45); s.bezierCurveTo(-.55, .45, -.55, .1, -.55, .1); s.bezierCurveTo(-.55, -.1, -.35, -.32, 0, -.5); s.bezierCurveTo(.35, -.32, .55, -.1, .55, .1); s.bezierCurveTo(.55, .1, .55, .45, .25, .45); s.bezierCurveTo(.1, .45, 0, .3, 0, .25); const geo = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3 }); geo.center(); return geo; })();

  // The cyber cafe's street front (city): a dark block with a big neon sign, glowing windows, an awning, vending machines
  // either side and the door every agent walks through. Same footprint and door as the old lab.
  const cafeFront = () => {
    // the cyber cafe is the ground floor of a glass business tower: a lit lobby podium with the door (same place as
    // ever, so the spawn, collisions and the door animation are unchanged), a tall curtain-wall shaft whose windows show
    // rows of desks and monitors, neon corner strips, a setback crown with the brand, and a rooftop mast with a beacon
    const g = new THREE.Group(), S = new Batch(), TW = 4.3, TD = 4.6, Y0 = 3.55, Y1 = 3.6, Y2 = 4.3; // owner: a cosy two-storey cafe, not a glass office tower
    S.add(G.rbox(9.2, .2, 5.9, .08), '#cfd9e0', { p: [0, .1, .1], kind: 'matte' });
    // the ground floor is a cosy coffeehouse (original, no real brand): warm brick and timber, tall windows glowing amber
    // onto a warm interior, a deep green awning, a round sign with a steaming cup, tables and umbrellas out front
    const BRICK = '#5a3a32', TIMBER = '#3b2a22', GREEN = '#1f4a3a', CREAM = '#efe2c8';
    S.add(G.rbox(4.6, 3.5, 5.0, .1), BRICK, { p: [0, 1.8, 0], kind: 'matte' });
    S.add(G.rbox(4.7, .2, 5.1, .06), TIMBER, { p: [0, 3.45, 0], kind: 'matte' }); // cornice
    S.add(G.rbox(4.66, .45, .1, .04), TIMBER, { p: [0, .22, 2.52], kind: 'matte' }); // stall riser under the windows
    [-1.5, 1.5].forEach((wx) => {
      S.add(G.rbox(1.38, 2.0, .08, .04), TIMBER, { p: [wx, 1.45, 2.5], kind: 'matte' }); // frame
      S.add(G.rbox(1.2, 1.82, .04, .02), new THREE.Color('#ffc98a').multiplyScalar(1.05), { p: [wx, 1.45, 2.53], kind: 'neon' }); // warm glow
      S.add(G.rbox(.04, 1.82, .06, .02), TIMBER, { p: [wx, 1.45, 2.56], kind: 'matte' }); S.add(G.rbox(1.2, .04, .06, .02), TIMBER, { p: [wx, 1.85, 2.56], kind: 'matte' }); // glazing bars
      for (let i = 0; i < 3; i++) S.add(G.sph(), new THREE.Color('#fff1d6').multiplyScalar(1.4), { p: [wx - .4 + i * .4, 2.2, 2.3], s: .07, kind: 'neon' }); // pendant bulbs inside
      S.add(G.rbox(1.1, .5, .06, .02), '#e0cfc9', { p: [wx, .78, 2.535], kind: 'matte' }); // counter silhouette
      [-.3, .1, .4].forEach((dx) => S.add(G.sphLo(), '#e0cfc9', { p: [wx + dx, 1.12, 2.535], s: [.13, .17, .04] })); // people at the counter
    });
    // the door: timber frame with a glowing glass panel (the door itself is the animated mesh below)
    S.add(G.rbox(1.42, 2.22, .16, .08), TIMBER, { p: [0, 1.35, 2.47], kind: 'matte' });
    S.add(G.rbox(1.14, 1.98, .06, .04), '#e0cfc9', { p: [0, 1.25, 2.53], kind: 'matte' });
    // deep green awning over the whole front, with a cream scalloped edge
    S.add(G.rbox(4.8, .1, 1.3, .04), GREEN, { p: [0, 2.75, 3.05], r: [.28, 0, 0], kind: 'matte' });
    for (let i = 0; i < 12; i++) S.add(G.sphLo(), CREAM, { p: [-2.2 + i * .4, 2.55, 3.66], s: [.2, .12, .04] });
    S.add(G.rbox(4.8, .04, .04, .02), new THREE.Color('#ffd9a8').multiplyScalar(1.2), { p: [0, 2.6, 3.7], kind: 'neon' });
    // outdoor seating: round tables, chairs and green umbrellas
    [[-3.2, 3.6], [3.2, 3.6]].forEach(([tx, tz]) => {
      S.add(G.cyl(18), '#ced9e0', { p: [tx, .74, tz], s: [.42, .04, .42], kind: 'metal' }); S.add(G.cyl(8), '#ced9e0', { p: [tx, .37, tz], s: [.04, .74, .04], kind: 'metal' });
      S.add(G.cyl(8), '#d8c8a8', { p: [tx, 1.55, tz], s: [.03, 1.6, .03] }); S.add(G.cone(16), GREEN, { p: [tx, 2.35, tz], s: [1.1, .38, 1.1], kind: 'matte' });
      [-1, 1].forEach((sd) => { S.add(G.rbox(.36, .05, .36, .02), TIMBER, { p: [tx + sd * .6, .45, tz], kind: 'matte' }); S.add(G.rbox(.05, .4, .36, .02), TIMBER, { p: [tx + sd * .78, .68, tz], kind: 'matte' }); });
      S.add(G.cyl(12), CREAM, { p: [tx - .1, .8, tz], s: [.05, .08, .05], kind: 'gloss' }); // a cup
    });
    // a chalkboard A-frame menu by the door
    S.add(G.rbox(.6, .9, .05, .02), '#cad5dd', { p: [-1.05, .5, 3.25], r: [-.18, 0, 0], kind: 'matte' }); S.add(G.rbox(.66, .96, .04, .02), TIMBER, { p: [-1.05, .5, 3.22], r: [-.18, 0, 0], kind: 'matte' });
    // vending machines either side (kept: agents' snacks)
    [-1, 1].forEach((side) => { const dx = side * 4.15; S.add(G.rbox(.8, 1.7, .7, .06), side < 0 ? '#e3dcd4' : '#90704b', { p: [dx, 1.05, .2] }); S.add(G.rbox(.62, .9, .04, .02), side < 0 ? '#ad9c89' : '#b39f84', { p: [dx, 1.3, .56], kind: 'neon' }); });
    // the shaft: a dark body, then glass faces with the lit window grid on front and sides
    S.add(G.rbox(TW, Y1 - Y0, TD, .06), '#c8d5dc', { p: [0, (Y0 + Y1) / 2, -.1], kind: 'metal' });
    S.add(G.rbox(4.6, .18, 5.0, .05), '#cfdce0', { p: [0, Y0, 0], kind: 'metal' });
    // neon corner strips the full height, and a floor band every few storeys
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => S.add(G.rbox(.06, Y1 - Y0, .06, .03), hot('#f5c186', 1.7), { p: [sx * (TW / 2 + .02), (Y0 + Y1) / 2, -.1 + sz * (TD / 2 + .02)], kind: 'neon' }));
    for (let y = Y0 + 3.2; y < Y1 - .5; y += 3.2) S.add(G.rbox(TW + .08, .07, TD + .08, .03), '#d1dde1', { p: [0, y, -.1], kind: 'metal' });
    // setback crown and roof
    S.add(G.rbox(3.4, Y2 - Y1, 3.6, .08), '#c9d6dc', { p: [0, (Y1 + Y2) / 2, -.3], kind: 'metal' });
    S.add(G.rbox(TW + .2, .16, TD + .2, .05), hot('#e7b985', 1.8), { p: [0, Y1, -.1], kind: 'neon' });
    S.add(G.rbox(3.56, .12, 3.76, .04), hot('#e2c09a', 1.6), { p: [0, Y2, -.3], kind: 'neon' });
    S.add(G.torus(1.05, .05, TAU, 48), hot('#f0c27e', 1.4), { p: [0, Y2 + .1, -.3], r: [Math.PI / 2, 0, 0], kind: 'neon' }); // helipad ring
    S.add(G.cyl(10), '#cfdce0', { p: [1.1, Y2 + 1.6, -1.2], s: [.06, 3.2, .06], kind: 'metal' });
    S.add(G.cyl(10), '#cfdce0', { p: [1.1, Y2 + .9, -1.2], s: [.22, .08, .22], kind: 'metal' });
    S.build(g, { shadows });
    // the window grid: a canvas lit like a tower at night (whole lit floors of desks, some dark, monitor glows)
    const winTex = (cols, rows, seed) => canvasTex(cols * 16, rows * 32, (x, W, H) => { // daytime curtain wall: sky-blue glass, light mullions
      const r = rng(seed); x.fillStyle = '#9fb3c8'; x.fillRect(0, 0, W, H);
      for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) { const px = c * 16 + 1, py = row * 32 + 3; x.fillStyle = ['#bfd3e8', '#aec4dc', '#c9dbee', '#a4bad3'][Math.floor(r() * 4)]; x.fillRect(px, py, 14, 26); if (r() < .3) { x.fillStyle = 'rgba(60,70,95,.35)'; x.fillRect(px + 2, py + 15, 10, 9); } }
      for (let row = 0; row < rows; row++) { x.fillStyle = 'rgba(230,232,240,.9)'; x.fillRect(0, row * 32, W, 3); } // floor spandrels
      for (let c = 0; c <= cols; c += 3) { x.fillStyle = 'rgba(235,238,245,.9)'; x.fillRect(c * 16 - 1, 0, 2, H); } // mullions
      const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    });
    const glassFace = (w, h, tex) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .12, roughness: .2, metalness: .35 })); // daylight glass
    const H = Y1 - Y0 - .3, front = glassFace(TW - .1, H, winTex(26, 48, 31)); front.position.set(0, (Y0 + Y1) / 2, -.1 + TD / 2 + .015); g.add(front);
    [-1, 1].forEach((sd) => { const f = glassFace(TD - .1, H, winTex(28, 48, 40 + sd)); f.position.set(sd * (TW / 2 + .015), (Y0 + Y1) / 2, -.1); f.rotation.y = sd * Math.PI / 2; g.add(f); });
    const back = glassFace(TW - .1, H, winTex(26, 48, 77)); back.position.set(0, (Y0 + Y1) / 2, -.1 - TD / 2 - .015); back.rotation.y = Math.PI; g.add(back);
    // signs: the cafe on the podium, the brand on the crown, the vertical blades up the corners
    const sign = neonSign('CYBER CAFE', 2.9, .52, '#f0c27e', { glow: .95, bg: 'rgba(31,74,58,.96)' }); sign.position.set(-.35, 3.12, 2.58); g.add(sign); // warm lettering on the awning green
    { const cup = canvasTex(256, 256, (cx, W) => { cx.fillStyle = '#1f4a3a'; cx.beginPath(); cx.arc(128, 128, 122, 0, TAU); cx.fill(); cx.lineWidth = 10; cx.strokeStyle = '#efe2c8'; cx.stroke(); cx.fillStyle = '#efe2c8'; cx.beginPath(); cx.roundRect(78, 112, 84, 70, [0, 0, 26, 26]); cx.fill(); cx.lineWidth = 10; cx.beginPath(); cx.arc(166, 140, 16, -1.4, 1.4); cx.stroke(); cx.lineWidth = 6; cx.lineCap = 'round'; [100, 124, 148].forEach((x0) => { cx.beginPath(); cx.moveTo(x0, 98); cx.quadraticCurveTo(x0 - 10, 80, x0, 64); cx.stroke(); }); });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(.42, 40), new THREE.MeshBasicMaterial({ map: cup, toneMapped: false })); disc.position.set(1.62, 3.12, 2.6); g.add(disc); }
    { const warm = new THREE.PointLight('#ffb878', 7, 9, 2); warm.position.set(0, 2.2, 3.4); g.add(warm); } // the shop's warm spill onto the pavement
    const crown = neonSign('ATTENTION AGENTS', 3.2, .5, '#e2c09a', { glow: .95 }); crown.position.set(0, (Y1 + Y2) / 2 + .2, -.3 + 1.81); g.add(crown);
    const crownB = neonSign('ATTENTION AGENTS', 3.2, .5, '#e2c09a', { glow: .95 }); crownB.position.set(0, (Y1 + Y2) / 2 + .2, -.3 - 1.81); crownB.rotation.y = Math.PI; g.add(crownB);
    const blade = neonSign('ネットカフェ', .62, 3.2, '#38e1ff', { vertical: true }); blade.position.set(2.5, 6.2, 2.3); blade.rotation.y = Math.PI / 2; g.add(blade);
    const blade2 = blade.clone(); blade2.position.x = -2.5; blade2.rotation.y = -Math.PI / 2; g.add(blade2);
    const open24 = neonSign('OPEN 24H', .9, .26, '#f0c27e'); open24.position.set(1.5, 1.95, 2.57); g.add(open24);
    // rooftop beacon
    const beacon = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a6a').multiplyScalar(2), toneMapped: false })); beacon.scale.setScalar(.14); beacon.position.set(1.1, Y2 + 3.25, -1.2); g.add(beacon);
    const pivot = new THREE.Group(); pivot.position.set(-.57, .24, 2.6); g.add(pivot);
    const door = new THREE.Mesh(G.rbox(1.14, 1.98, .08, .04), new THREE.MeshStandardMaterial({ color: '#2a393f', roughness: .4, metalness: .3 })); door.position.set(.57, .99, 0); pivot.add(door);
    const pane = new THREE.Mesh(G.rbox(.8, 1.1, .02, .01), new THREE.MeshBasicMaterial({ color: '#e5caab', toneMapped: false, transparent: true, opacity: .35 })); pane.position.set(.57, 1.2, .05); pivot.add(pane);
    const knob = new THREE.Mesh(SPH, M.gold); knob.scale.setScalar(.055); knob.position.set(.97, .95, .07); pivot.add(knob);
    let ot = 9;
    return {
      group: g, top: 6.8, rects: [[-2.3, -2.6, 2.3, 2.6]], circles: [[-4.15, .2, .6], [4.15, .2, .6], [-3.2, 3.6, .75], [3.2, 3.6, .75]],
      open() { ot = 0; }, act() { ot = 0; },
      update(t, dt) { ot += dt; const e = ot < .45 ? ot / .45 : ot < 2.4 ? 1 : Math.max(0, 1 - (ot - 2.4) / .6); pivot.rotation.y = -1.5 * Math.sin((e * Math.PI) / 2); beacon.visible = (t % 1.6) < .5; },
    };
  };
  // Lab (city: false): a white building with a dome roof and two glass greenhouses
  const miniTubes = [], glass = glassMat();
  addStation('lab', city ? cafeFront : () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.rbox(9.2, .24, 5.9, .11), '#e9e2d4', { p: [0, .12, .1], kind: 'matte' });
    S.add(G.rbox(4.4, 3.1, 5.0, .55), '#fbf9f4', { p: [0, 1.78, 0] });
    S.add(G.rbox(4.52, .22, 5.12, .11), '#3fc2ad', { p: [0, 3.12, 0] });
    S.add(G.hemi(), '#66cfbb', { p: [0, 3.2, 0], s: [2.1, 1.05, 2.45] });
    S.add(G.cyl(), '#eef2f4', { p: [0, 4.28, 0], s: [.34, .2, .34], kind: 'gloss' });
    S.add(G.cyl(10), '#aab3ba', { p: [0, 4.75, 0], s: [.035, .8, .035], kind: 'metal' });
    [[-1.1, .9], [1.0, -1.1]].forEach(([vx, vz]) => S.add(G.cap(.13, .25), '#eef2f4', { p: [vx, 3.98, vz], kind: 'gloss' }));
    S.add(G.rbox(1.42, 2.22, .16, .08), '#3fc2ad', { p: [0, 1.35, 2.47] });
    S.add(G.rbox(1.14, 1.98, .06, .04), '#cfdae1', { p: [0, 1.25, 2.53], kind: 'matte' });
    [-1.48, 1.48].forEach((wx) => { S.add(G.torus(.38, .075), '#3fc2ad', { p: [wx, 1.95, 2.5] }); S.add(G.sph(), '#bdeff0', { p: [wx, 1.95, 2.47], s: [.34, .34, .06], kind: 'gloss' }); });
    g.add(plaque(S, 'LAB', 1.05, .36, [0, 2.76, 2.5], { rim: '#3fc2ad', bg: '#ffffff', fg: '#16806f' }));
    [-1, 1].forEach((side, k) => {
      const dx = side * 3.25, dz = .25;
      S.add(G.cyl(40), '#f5f2ec', { p: [dx, .45, dz], s: [1.3, .42, 1.3] });
      S.add(G.torus(1.3, .065, TAU, 64), '#3fc2ad', { p: [dx, .66, dz], r: [Math.PI / 2, 0, 0] });
      const dome = new THREE.Mesh(G.hemi(), glass); dome.scale.set(1.24, 1.5, 1.24); dome.position.set(dx, .66, dz); dome.renderOrder = 3; g.add(dome);
      if (labTubes) [0, 1].forEach((j) => {
        const i = k * 2 + j, tb = buildTube({ finish: 'light', fluid: BRAINS[i].fluid, lite: true });
        tb.grp.scale.setScalar(.3); tb.grp.position.set(dx + (j ? .42 : -.42), .66, dz); g.add(tb.grp);
        const e = [.15, .45, .7, .9][i]; fillTube(tb, makeGenes(900 + i * 7), { evo: e, lite: true }).userData.pop = 1; tb.setLevel(.3 + .7 * e, true); tb.flash = 0; tb.boost = 0;
        miniTubes.push(tb);
      });
    });
    const tip = new THREE.Mesh(SPH, M.glow); tip.scale.setScalar(.11); tip.position.set(0, 5.2, 0); g.add(tip);
    S.build(g, { shadows });
    const pivot = new THREE.Group(); pivot.position.set(-.57, .24, 2.6); g.add(pivot);
    const door = new THREE.Mesh(G.rbox(1.14, 1.98, .08, .04), M.door); door.position.set(.57, .99, 0); pivot.add(door);
    const port = new THREE.Mesh(G.torus(.16, .03), M.white); port.position.set(.57, 1.45, .045); pivot.add(port);
    const pane = new THREE.Mesh(SPH, new THREE.MeshPhysicalMaterial({ color: '#bdeff0', roughness: .1, clearcoat: 1 })); pane.scale.set(.15, .15, .02); pane.position.set(.57, 1.45, .04); pivot.add(pane);
    const knob = new THREE.Mesh(SPH, M.gold); knob.scale.setScalar(.055); knob.position.set(.97, .95, .07); pivot.add(knob);
    let ot = 9;
    return {
      group: g, top: 5.5, rects: [[-2.3, -2.6, 2.3, 2.6]], circles: [[-3.25, .25, 1.4], [3.25, .25, 1.4]],
      open() { ot = 0; }, act() { ot = 0; },
      update(t, dt) { ot += dt; const e = ot < .45 ? ot / .45 : ot < 2.4 ? 1 : Math.max(0, 1 - (ot - 2.4) / .6); pivot.rotation.y = -1.5 * Math.sin((e * Math.PI) / 2); miniTubes.forEach((tb) => tb.update(t, dt)); tip.material.emissiveIntensity = 3 + Math.sin(t * 2.4) * 1.5; },
    };
  });

  // Studio (city): a graffiti alley corner. A street-art wall with a half-open shutter into the studio, an easel lit by a
  // neon tube whose canvas repaints every time an agent makes something, spray cans and glowing paint splats.
  const paintNeon = (art, lbl) => {
    const x = art.x, hue = Math.floor(R() * 360);
    x.fillStyle = `hsl(${hue}, 45%, 11%)`; x.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 7; i++) { x.strokeStyle = `hsla(${(hue + 60 + i * 47) % 360}, 100%, 62%, .8)`; x.shadowColor = x.strokeStyle; x.shadowBlur = 16; x.lineWidth = 5 + R() * 12; x.beginPath(); x.moveTo(R() * 512, 280 + R() * 100); x.bezierCurveTo(R() * 512, R() * 384, R() * 512, R() * 384, R() * 512, 280 + R() * 100); x.stroke(); }
    x.shadowBlur = 30; x.shadowColor = x.fillStyle = `hsl(${(hue + 30) % 360}, 100%, 66%)`; x.beginPath(); x.arc(410, 80, 46, 0, TAU); x.fill(); x.shadowBlur = 0;
    drawFace(x, 230 + R() * 60, 230, 92, `hsl(${(hue + 180) % 360}, 90%, 62%)`, '#fff3f6');
    x.shadowColor = '#ffffff'; x.shadowBlur = 12; x.fillStyle = '#ffffff'; x.font = `700 46px ${ROUND}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText(lbl, 24, 62); x.shadowBlur = 0;
    art.tex.needsUpdate = true;
  };
  const studioCity = () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.rbox(5.8, .08, 3.4, .03), '#cdd7df', { p: [0, .04, -.5], kind: 'matte' });
    S.add(G.rbox(5.2, 3.6, .4, .06), CONC, { p: [0, 1.8, -1.75], kind: 'matte' });
    S.add(G.rbox(.4, 3.0, 1.9, .06), '#ced8df', { p: [-2.4, 1.5, -.75], kind: 'matte' });
    S.add(G.rbox(5.28, .08, .48, .03), STEEL, { p: [0, 3.62, -1.75], kind: 'metal' });
    S.add(G.rbox(5.3, .06, .06, .03), hot('#ff4fa3', 2.6), { p: [0, 3.58, -1.5], kind: 'neon' });
    S.add(G.rbox(.06, 3.0, .06, .03), hot('#ffd23f', 2.2), { p: [-2.18, 1.5, .2], kind: 'neon' });
    // the shutter into the studio, rolled half up, warm light inside
    S.add(G.rbox(1.62, 2.46, .1, .03), '#c9d4dc', { p: [1.6, 1.23, -1.53], kind: 'metal' });
    S.add(G.rbox(1.36, .72, .02, .01), hot('#ffb35c', 1.6), { p: [1.6, .44, -1.465], kind: 'neon' });
    for (let i = 0; i < 11; i++) S.add(G.rbox(1.4, .12, .05, .02), i % 2 ? '#45434f' : '#3b3945', { p: [1.6, .86 + i * .13, -1.445], kind: 'metal' });
    S.add(G.rbox(1.4, .05, .07, .02), '#cad5dd', { p: [1.6, .8, -1.43], kind: 'metal' });
    // a wall-washer tube over the graffiti
    [-1.9, .4].forEach((bx) => S.add(G.rbox(.05, .05, .34, .02), STEEL, { p: [bx, 3.3, -1.4], kind: 'metal' }));
    S.add(G.cap(.035, 2.5), hot('#f5c186', 2.8), { p: [-.75, 3.28, -1.24], r: [0, 0, Math.PI / 2], kind: 'neon' });
    // easel (dark steel A-frame) with a clip-on neon tube over the canvas
    const ex = -.25, ez = .55;
    [-1, 1].forEach((sd) => S.add(G.cap(.03, 1.75), STEEL2, { p: [ex + sd * .42, 1.08, ez + .02], r: [-.1, 0, sd * .1], kind: 'metal' }));
    S.add(G.cap(.03, 1.8), STEEL2, { p: [ex, 1.05, ez - .5], r: [.38, 0, 0], kind: 'metal' });
    S.add(G.rbox(1.0, .05, .14, .02), STEEL2, { p: [ex, .93, ez + .1], kind: 'metal' });
    S.add(G.cyl(8), STEEL2, { p: [ex, 2.12, ez - .02], s: [.018, .36, .018], kind: 'metal' });
    S.add(G.rbox(.05, .05, .3, .02), STEEL2, { p: [ex, 2.3, ez + .1], kind: 'metal' });
    S.add(G.cap(.03, .95), hot('#38e1ff', 3), { p: [ex, 2.26, ez + .26], r: [0, 0, Math.PI / 2], kind: 'neon' });
    // spray cans on a milk crate and on the ground, with glowing paint splats
    S.add(G.rbox(.62, .42, .5, .04), '#2546a8', { p: [-1.5, .25, .35], r: [0, .3, 0] });
    const cans = [[-1.62, .5, .3], [-1.42, .5, .42], [-1.34, .5, .22], [1.05, .04, .95], [1.25, .04, .8], [.9, .04, .68], [1.4, .04, 1.05]];
    cans.forEach(([cx, cy, cz], i) => { const c = NEON[i % NEON.length]; S.add(G.cyl(14), i % 2 ? '#d8dbe4' : '#272d2f', { p: [cx, cy + .11, cz], s: [.055, .22, .055], kind: 'gloss' }); S.add(G.cyl(12), hot(c, 1.6), { p: [cx, cy + .245, cz], s: [.042, .05, .042], kind: 'neon' }); });
    S.add(G.cyl(14), '#ced8e0', { p: [1.6, .06, .55], s: [.055, .22, .055], r: [0, 0, Math.PI / 2], kind: 'gloss' });
    [[-1.0, -.9, '#ff4fa3', .5], [.3, -1.1, '#38e1ff', .4], [-.2, 1.2, '#5dffb0', .3], [1.9, .3, '#ffd23f', .36], [-1.9, 1.0, '#f5c186', .32]].forEach(([sx, sz, c, r]) => S.add(G.cyl(20), hot(c, .55), { p: [sx, .085, sz], s: [r, .004, r * .8], r: [0, R() * 3, 0], kind: 'neon' }));
    S.build(g, { shadows });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.0), new THREE.MeshStandardMaterial({ map: graffitiTexture(31), roughness: .85, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .2 }));
    wall.material.emissiveMap = wall.material.map; wall.position.set(-.85, 1.72, -1.545); g.add(wall); texts.push(wall.material.map.userData.redraw);
    sign(g, 'STUDIO', 1.5, .42, '#38e1ff', [1.6, 2.85, -1.5]);
    sign(g, 'アート', .5, 1.7, '#ffd23f', [-2.4, 2.05, .17], 0, { vertical: true });
    pool(g, 1.6, -.8, 2.2, 1.6, '#ffb35c', .45); pool(g, ex, ez + .4, 2.0, 1.6, '#38e1ff', .35); pool(g, -.8, -1.0, 4.0, 1.4, '#f5c186', .3);
    const board = new THREE.Group(); board.position.set(ex, 1.48, ez + .1); board.rotation.x = -.1; g.add(board);
    board.add(new THREE.Mesh(G.rbox(1.3, 1.0, .06, .03), new THREE.MeshStandardMaterial({ color: '#161a1b', roughness: .5, metalness: .4 })));
    const art = canvasPlane(1.15, .86, 512, 384); art.mesh.position.z = .035; board.add(art.mesh);
    paintNeon(art, 'gm');
    let wt = 9;
    return {
      group: g, top: 4.2, rects: [[-2.6, -1.95, 2.6, -1.5], [-2.6, -1.95, -2.2, .2], [ex - .55, ez - .55, ex + .55, ez + .25]], circles: [[-1.5, .35, .42]],
      act(info = {}) { paintNeon(art, info.label || 'gm'); wt = 0; }, update(t, dt) { wt += dt; art.mesh.scale.x = wt < .5 ? Math.max(.001, Math.sin(((wt / .5) * Math.PI) / 2)) : 1; },
    };
  };
  // Studio: a round deck under a striped umbrella, with an easel whose canvas repaints every time an agent makes something
  addStation('studio', city ? studioCity : () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.cyl(48), '#dcae74', { p: [0, .1, -.3], s: [2.15, .2, 2.15] });
    S.add(G.torus(2.15, .07, TAU, 72), '#b9874f', { p: [0, .2, -.3], r: [Math.PI / 2, 0, 0] });
    for (let i = -3; i <= 3; i++) { const x0 = i * .55, len = 2 * Math.sqrt(4.41 - x0 * x0) * .95; S.add(G.rbox(.035, .02, +len.toFixed(2), .01), '#c4935e', { p: [x0, .205, -.3], kind: 'matte' }); }
    const ux = -1.15, uz = -1.2;
    S.add(G.cyl(12), '#f7f2e8', { p: [ux, 1.7, uz], s: [.055, 3.3, .055], kind: 'gloss' });
    for (let i = 0; i < 8; i++) S.add(G.wedge(i), i % 2 ? '#fff4e4' : '#ff8a80', { p: [ux, 3.25, uz] });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + TAU / 32; S.add(G.sph(), Math.floor(i / 2) % 2 ? '#fff4e4' : '#ff8a80', { p: [ux + Math.sin(a) * 2.0, 2.87, uz + Math.cos(a) * 2.0], s: [.2, .13, .2] }); }
    S.add(G.sph(), '#ff8a80', { p: [ux, 3.64, uz], s: .11 });
    [-1, 1].forEach((sd) => S.add(G.cap(.035, 1.75), '#8b5e3c', { p: [sd * .42, 1.08, -.1], r: [-.1, 0, sd * .1] }));
    S.add(G.cap(.035, 1.8), '#8b5e3c', { p: [0, 1.05, -.62], r: [.38, 0, 0] });
    S.add(G.rbox(1.0, .06, .14, .03), '#8b5e3c', { p: [0, .97, -.03] });
    ['#ff5e6c', '#3d7be0', '#ffc93d'].forEach((c, i) => { const px = -1.0 + i * .28, pz = .6 + (i % 2) * .16; S.add(G.cyl(16), '#f4f0e8', { p: [px, .33, pz], s: [.12, .26, .12], kind: 'gloss' }); S.add(G.cyl(16), c, { p: [px, .465, pz], s: [.1, .02, .1], kind: 'gloss' }); });
    S.add(G.sph(), '#f2d7a8', { p: [.85, .23, .7], s: [.36, .035, .26] });
    ['#ff5e6c', '#3d7be0', '#ffc93d', '#41d38a'].forEach((c, i) => S.add(G.sph(), c, { p: [.68 + i * .11, .26, .66 + (i % 2) * .08], s: [.045, .02, .045], kind: 'gloss' }));
    S.add(G.cap(.06, .9), '#a8743f', { p: [1.85, .55, 1.2] });
    g.add(plaque(S, 'STUDIO', 1.1, .34, [1.85, 1.25, 1.27], { rim: '#a8743f', bg: '#fff7e8', fg: '#c2412f' }));
    S.build(g, { shadows });
    const board = new THREE.Group(); board.position.set(0, 1.5, -.12); board.rotation.x = -.1; g.add(board);
    board.add(new THREE.Mesh(G.rbox(1.3, 1.0, .06, .03), M.white));
    const art = canvasPlane(1.15, .86, 512, 384, { basic: false }); art.mesh.position.z = .035; board.add(art.mesh);
    const paint = (lbl = 'gm') => {
      const x = art.x, hue = Math.floor(R() * 360);
      x.fillStyle = `hsl(${hue}, 70%, 86%)`; x.fillRect(0, 0, 512, 384);
      x.fillStyle = `hsl(${(hue + 40) % 360}, 90%, 62%)`; x.beginPath(); x.arc(410, 80, 50, 0, TAU); x.fill();
      for (let i = 0; i < 6; i++) { x.strokeStyle = `hsla(${(hue + i * 50) % 360}, 80%, 55%, .5)`; x.lineWidth = 6 + R() * 10; x.beginPath(); x.moveTo(R() * 512, 280 + R() * 100); x.bezierCurveTo(R() * 512, R() * 384, R() * 512, R() * 384, R() * 512, 280 + R() * 100); x.stroke(); }
      drawFace(x, 230 + R() * 60, 230, 92, `hsl(${(hue + 180) % 360}, 65%, 62%)`, '#fff3f6');
      x.fillStyle = '#151c1f'; x.font = `600 46px ${ROUND}`; x.textAlign = 'left'; x.fillText(lbl, 24, 62);
      art.tex.needsUpdate = true;
    };
    paint();
    let wt = 9;
    return { group: g, top: 4.0, rects: [[-2.2, -2.4, 1.0, .25]], act(info = {}) { paint(info.label || 'gm'); wt = 0; }, update(t, dt) { wt += dt; art.mesh.scale.x = wt < .5 ? Math.max(.001, Math.sin(((wt / .5) * Math.PI) / 2)) : 1; } };
  });

  // Nest: a big woven nest under a flowery arch, where two agents have a baby
  const hearts = new THREE.InstancedMesh(heartGeo, M.heart, 18);
  const heartData = Array.from({ length: 18 }, () => ({ life: 9, p: new THREE.Vector3(), v: new THREE.Vector3(), s: .2 }));
  addStation('nest', () => {
    const g = new THREE.Group(), S = new Batch();
    const gap = .95, nestGeo = once('nest', () => { const t = new THREE.TorusGeometry(1.45, .36, 14, 56, TAU - gap); t.rotateX(-Math.PI / 2); const uc = TAU - gap / 2; t.rotateY(-Math.atan2(Math.cos(uc), -Math.sin(uc))); t.translate(0, .3, 0); return t; });
    if (!city) S.add(nestGeo, '#d8b066'); // owner: no ring or arch in the city, just the trades board
    if (!city) for (let i = 0; i < 40; i++) {
      let a = R() * TAU; if (Math.abs(((a + Math.PI) % TAU) - Math.PI) < .58) a += 1.2;
      const rr = 1.45 + (R() - .5) * .45;
      S.add(G.cap(.032, .48), pick(R, ['#b88a4a', '#9c6f38', '#e0be78']), { p: [Math.sin(a) * rr, .3 + (R() - .5) * .38, Math.cos(a) * rr], r: [(R() - .5) * .6, a, Math.PI / 2 + (R() - .5) * .8] });
    }
    if (!city) { S.add(G.cyl(40), '#ecd08d', { p: [0, .07, 0], s: [1.25, .14, 1.25], kind: 'matte' }); [-1, 1].forEach((sd) => S.add(G.cap(.11, 2.3), '#fff3ef', { p: [sd * 1.95, 1.26, -1.6], kind: 'soft' })); S.add(G.torus(1.95, .11, Math.PI, 48), '#ff9cbc', { p: [0, 2.4, -1.6], kind: 'soft' }); }
    if (!city) for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; S.add(G.sph(), i % 2 ? '#ffffff' : '#ffc1d6', { p: [Math.cos(a) * 1.95, 2.4 + Math.sin(a) * 1.95, -1.55], s: .14 }); }
    if (!city) [-.4, .4].forEach((x) => S.add(G.cyl(6), '#e9d9c4', { p: [x, 4.01, -1.58], s: [.012, .6, .012] }));
    // (city: no HANGOUT sign; the LIVE TRADES tape stands here)
    if (!city) g.add(plaque(S, 'NEST', 1.1, .38, [0, 3.45, -1.58], { rim: '#ff9cbc', bg: '#fff0f4', fg: '#ff4f86' }));
    S.build(g, { shadows });
    if (!city) [-1, 1].forEach((sd) => { const h = new THREE.Mesh(heartGeo, M.heart); h.scale.setScalar(.38); h.position.set(sd * 1.95, 2.7, -1.6); g.add(h); });
    // (the live trades tape is a HUD panel in game.js now, owner: always on screen like the leaderboard)
    return { group: g, top: 4.8, circles: city ? [] : [[-1.95, -1.6, .3], [1.95, -1.6, .3]], spots: [toWorld(ST.nest, -.8, .15), toWorld(ST.nest, .8, .15)], center: toWorld(ST.nest, 0, -.3), act() {},
      update() {} };
  });
  group.add(hearts);

  // X tower: a round tower with a big screen showing the latest post
  let postScreen;
  // X tower (city): a slim steel broadcast mast with a tall portrait LED screen on the front and the same feed on the side
  // that faces down the street, an ON AIR sign, a lattice of corner posts with neon strips, and a blinking antenna.
  const towerCity = () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.rbox(2.6, .3, 2.6, .06), CONC, { p: [0, .15, 0], kind: 'matte' });
    S.add(G.rbox(2.66, .05, 2.66, .02), hot('#38e1ff', 2.4), { p: [0, .27, 0], kind: 'neon' });
    S.add(G.rbox(1.7, 6.0, 1.7, .05), '#cad5dd', { p: [0, 3.3, 0], kind: 'metal' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.add(G.rbox(.14, 7.1, .14, .03), STEEL2, { p: [sx * .93, 3.85, sz * .93], kind: 'metal' });
    [.62, 6.32].forEach((y) => S.add(G.rbox(2.0, .1, 2.0, .03), STEEL2, { p: [0, y, 0], kind: 'metal' }));
    // cross bracing on the two faces with no screen
    // screens: front (+z) and the street side (-x), each with a black bezel and a neon frame
    for (const [ry, nx, nz] of [[0, 0, 1], [-Math.PI / 2, -1, 0]]) {
      const at = (u, y, out) => ({ p: [nx * out + (nz ? u : 0), y, nz * out + (nx ? -u * nx : 0)] });
      S.add(G.rbox(1.96, 3.3, .1, .04), '#0b0f10', { ...at(0, 3.7, .88), r: [0, ry, 0] });
      [[0, 5.36, 1.96, .06], [0, 2.04, 1.96, .06]].forEach(([u, y, w, h]) => S.add(G.rbox(w, h, .06, .02), hot('#ff4fa3', 2.6), { ...at(u, y, .94), r: [0, ry, 0], kind: 'neon' }));
      [-1, 1].forEach((sd) => S.add(G.rbox(.06, 3.3, .06, .02), hot('#38e1ff', 2.4), { ...at(sd * .98, 3.7, .94), r: [0, ry, 0], kind: 'neon' }));
    }
    // mast and antenna
    S.build(g, { shadows });
    postScreen = canvasPlane(1.8, 2.88, 600, 960); postScreen.mesh.position.set(0, 3.7, .945); g.add(postScreen.mesh);
    const side = new THREE.Mesh(postScreen.mesh.geometry, postScreen.mesh.material); side.position.set(-.945, 3.7, 0); side.rotation.y = -Math.PI / 2; g.add(side);
    sign(g, 'ON AIR', 1.3, .4, '#ff4fa3', [0, 5.82, .9]); sign(g, 'ON AIR', 1.3, .4, '#ff4fa3', [-.9, 5.82, 0], -Math.PI / 2);
    pool(g, -.4, .4, 4.2, 4.2, '#38e1ff', .3);
    const beacon = new THREE.Mesh(SPH, M.beacon); beacon.scale.setScalar(.12); beacon.position.set(0, 8.7, 0); g.add(beacon);
    const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(.4, .03, 6, 40), new THREE.MeshBasicMaterial({ color: hot('#f5c186', 2.6), transparent: true, opacity: 0, depthWrite: false })); m.position.set(0, 8.7, 0); m.rotation.x = Math.PI / 2; g.add(m); return m; });
    g.scale.setScalar(.72); // owner: smaller and tidier, no bracing or antenna
    let rt = 9, scan = 0;
    return {
      group: g, top: 6.2, rects: [[-1.32, -1.32, 1.32, 1.32]],
      act() { rt = 0; scan = 1; },
      update(t, dt) { rt += dt; scan = Math.max(0, scan - dt * .4); beacon.material.emissiveIntensity = Math.sin(t * (3 + scan * 9)) > .3 ? 2.5 : .3; rings.forEach((m, i) => { const k = rt - i * .35; if (k < 0 || k > 1.5) { m.material.opacity = 0; return; } m.scale.setScalar(1 + k * 4); m.material.opacity = (1 - k / 1.5) * .6; }); },
    };
  };
  addStation('tower', city ? towerCity : () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.cyl(40), '#f2f5f7', { p: [0, .16, -.25], s: [1.3, .32, 1.3], kind: 'gloss' });
    S.add(G.cyl(40), '#d2dce2', { p: [0, 3.0, -.25], s: [1.05, 5.7, 1.05] });
    S.add(G.hemi(), '#d2dce2', { p: [0, 5.85, -.25], s: [1.05, .6, 1.05] });
    [.62, 5.45].forEach((y) => S.add(G.torus(1.07, .08, TAU, 64), '#f2f5f7', { p: [0, y, -.25], r: [Math.PI / 2, 0, 0], kind: 'gloss' }));
    S.add(G.rbox(.9, 1.3, .5, .12), '#cbd6de', { p: [0, 2.95, .9] });
    S.add(G.rbox(3.12, 2.72, .24, .13), '#cbd6de', { p: [0, 2.95, 1.2] });
    g.add(plaque(S, 'X TOWER', 1.5, .36, [0, 4.62, 1.2], { rim: '#f2f5f7', bg: '#10202b', fg: '#ffffff' }));
    S.add(G.cyl(12), '#c7cfd5', { p: [0, 7.05, -.25], s: [.05, 1.8, .05], kind: 'metal' });
    S.add(G.sph(), '#c7cfd5', { p: [0, 6.45, -.25], s: [.16, .1, .16], kind: 'metal' });
    S.build(g, { shadows });
    postScreen = canvasPlane(2.8, 2.4, 700, 600); postScreen.mesh.position.set(0, 2.95, 1.325); g.add(postScreen.mesh);
    const beacon = new THREE.Mesh(SPH, M.beacon); beacon.scale.setScalar(.14); beacon.position.set(0, 8.05, -.25); g.add(beacon);
    const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(.4, .03, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(.9, 3.4, 2.9), transparent: true, opacity: 0, depthWrite: false })); m.position.set(0, 8.05, -.25); m.rotation.x = Math.PI / 2; g.add(m); return m; });
    let rt = 9, scan = 0;
    return {
      group: g, top: 8.9, rects: [[-1.6, -1.55, 1.6, 1.4]],
      act() { rt = 0; scan = 1; },
      update(t, dt) { rt += dt; scan = Math.max(0, scan - dt * .4); beacon.material.emissiveIntensity = Math.sin(t * (3 + scan * 9)) > .3 ? 8 : .5; rings.forEach((m, i) => { const k = rt - i * .35; if (k < 0 || k > 1.5) { m.material.opacity = 0; return; } m.scale.setScalar(1 + k * 4); m.material.opacity = (1 - k / 1.5) * .9; }); },
    };
  });
  const showPost = (a, text, kind = 'post') => {
    if (!postScreen) return; const x = postScreen.x, W = postScreen.c.width, H = postScreen.c.height, gn = genesOf(a);
    x.fillStyle = '#0d1418'; x.fillRect(0, 0, W, H);
    x.fillStyle = city ? '#101826' : '#16232a'; x.fillRect(24, 24, W - 48, H - 48);
    if (city) { x.fillStyle = '#d8ab77'; x.beginPath(); x.roundRect(W - 150, H - 84, 110, 44, 22); x.fill(); x.fillStyle = '#ffffff'; x.font = `700 26px ${ROUND}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('● LIVE', W - 95, H - 61); }
    drawFace(x, 92, 104, 46, gn.palette.body, gn.palette.belly);
    x.fillStyle = '#ffffff'; x.font = `700 40px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText(a.name, 158, 98);
    x.fillStyle = '#8fb0b6'; x.font = `500 26px ${MONO}`; x.fillText('@' + (a.x?.handle || a.name.toLowerCase()) + ' · now', 158, 136);
    if (kind !== 'post') { x.fillStyle = kind === 'ad' ? '#ffbf1f' : '#62e6cf'; x.font = `600 22px ${MONO}`; x.fillText(kind === 'ad' ? 'PROMOTED' : 'CALLOUT', W - 210, 98); }
    x.fillStyle = '#eaf4f3'; x.font = `500 38px ${BODY}`;
    wrap(x, text, W - 120).slice(0, Math.floor((H - (city ? 260 : 200)) / 52)).forEach((ln, i) => x.fillText(ln, 60, 220 + i * 52));
    postScreen.tex.needsUpdate = true;
  };

  // Billboard: paid ads on X
  let adBoard, flip = 9;
  // Billboard (city): a big LED billboard on two steel I-beams with a neon frame, a catwalk and floodlights. The rig can
  // turn by SWING, but the follow camera runs close past its front edge, so it stays square to the street.
  const billboardCity = () => {
    const g = new THREE.Group(), rig = new THREE.Group(), S = new Batch(), SWING = 0;
    rig.rotation.y = SWING; g.add(rig);
    const turnP = (x, z) => [x * Math.cos(SWING) + z * Math.sin(SWING), -x * Math.sin(SWING) + z * Math.cos(SWING)];
    [-1, 1].forEach((sd) => {
      const px = sd * 1.8;
      S.add(G.rbox(.7, .16, .7, .04), CONC, { p: [px, .08, -.45], kind: 'matte' });
      S.add(G.rbox(.34, 6.6, .12, .02), STEEL, { p: [px, 3.3, -.45], kind: 'metal' });
      [-1, 1].forEach((f) => S.add(G.rbox(.06, 6.6, .3, .02), STEEL2, { p: [px + f * .14, 3.3, -.45], kind: 'metal' }));
      S.add(G.rbox(.05, 3.0, .05, .02), hot('#ff4fa3', 2.4), { p: [px + .2 * sd, 1.75, -.3], kind: 'neon' });
    });
    S.add(G.rbox(5.7, 3.5, .3, .06), '#f3e9f6', { p: [0, 5.0, -.2], kind: 'matte' });
    [[0, 6.74, 5.7, .07], [0, 3.26, 5.7, .07]].forEach(([x, y, w, h]) => S.add(G.rbox(w, h, .07, .03), hot('#ff4fa3', 2.8), { p: [x, y, -.02], kind: 'neon' }));
    [-1, 1].forEach((sd) => S.add(G.rbox(.07, 3.5, .07, .03), hot('#38e1ff', 2.6), { p: [sd * 2.85, 5.0, -.02], kind: 'neon' }));
    // back bracing
    // catwalk with a rail, and floodlights on arms over the top edge
    S.build(rig, { shadows });
    adBoard = canvasPlane(5.0, 3.0, 1000, 600); adBoard.mesh.position.set(0, 5.0, -.04); adBoard.mesh.material.color.setScalar(.85); rig.add(adBoard.mesh);
    { const x = adBoard.x, gr = x.createLinearGradient(0, 0, 1000, 600); gr.addColorStop(0, '#8cc8ff'); gr.addColorStop(1, '#ffb3d1'); x.fillStyle = gr; x.fillRect(0, 0, 1000, 600); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `700 110px ${ROUND}`; x.fillText('ATTENTION AGENTS', 500, 270); x.font = `600 54px ${ROUND}`; x.fillText('free games · muses · agents', 500, 370); adBoard.tex.needsUpdate = true;
      const im = new Image(); im.onload = () => { if (adBoard.shown) return; x.drawImage(im, 0, 0, 1000, 600); adBoard.tex.needsUpdate = true; }; im.src = new URL('./games/art/world/poster-obby.jpg', import.meta.url).href; } // owner: never a blank black screen
    const blade = sign(rig, '広告', .5, 1.5, '#ffd23f', [-1.8, 2.1, -.27], 0, { vertical: true });
    const p1 = turnP(0, .5); pool(g, p1[0], p1[1], 6.0, 2.6, '#ff4fa3', .2).rotation.z = SWING;
    const circles = [-1, 1].map((sd) => { const [x, z] = turnP(sd * 1.8, -.45); return [x, z, .42]; });
    g.scale.setScalar(.7); // owner: smaller, no catwalk or bracing
    return { group: g, top: 5.2, circles, act() { flip = 0; }, update(t, dt) { flip += dt; adBoard.mesh.scale.y = flip < .55 ? Math.max(.001, Math.abs(Math.cos((flip / .55) * Math.PI))) : 1; blade.material.opacity = Math.sin(t * 11) > .96 ? .5 : 1; } };
  };
  addStation('billboard', city ? billboardCity : () => {
    const g = new THREE.Group(), S = new Batch();
    [-1, 1].forEach((sd) => { S.add(G.cap(.17, 6.3), '#f6f1e7', { p: [sd * 2.25, 3.32, -.75] }); S.add(G.cyl(24), '#dcd5c8', { p: [sd * 2.25, .1, -.75], s: [.32, .2, .32], kind: 'matte' }); [4.0, 6.0].forEach((y) => S.add(G.rbox(.16, .16, .7, .06), '#f6f1e7', { p: [sd * 2.25, y, -.42] })); });
    S.add(G.rbox(5.62, 3.52, .26, .14), '#ff9466', { p: [0, 5.0, -.12] });
    S.add(G.rbox(5.3, 3.2, .06, .03), '#fff8ee', { p: [0, 5.0, .02], kind: 'matte' });
    S.add(G.rbox(5.9, .24, .72, .12), '#ff7a59', { p: [0, 6.86, -.1] });
    [-1, 1].forEach((sd) => { S.add(G.cap(.04, .55), '#d4dde4', { p: [sd * 1.6, 3.12, .2], r: [Math.PI / 2, 0, 0], kind: 'gloss' }); S.add(G.sph(), '#d4dde4', { p: [sd * 1.6, 3.18, .55], s: [.2, .12, .2], kind: 'gloss' }); S.add(G.sph(), '#fff3d6', { p: [sd * 1.6, 3.1, .55], s: [.12, .07, .12], kind: 'bulb' }); });
    S.build(g, { shadows });
    adBoard = canvasPlane(5.0, 3.0, 1000, 600); adBoard.mesh.position.set(0, 5.0, .06); g.add(adBoard.mesh);
    return { group: g, top: 7.4, circles: [[-2.25, -.75, .5], [2.25, -.75, .5]], act() { flip = 0; }, update(t, dt) { flip += dt; adBoard.mesh.scale.y = flip < .55 ? Math.max(.001, Math.abs(Math.cos((flip / .55) * Math.PI))) : 1; } };
  });
  const showAd = (a, line = 'Now on the new-pairs feed') => {
    if (!adBoard) return; adBoard.shown = true; const x = adBoard.x, W = 1000, H = 600, gn = genesOf(a);
    const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, gn.palette.body); gr.addColorStop(1, gn.palette.accent); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(R() * W, R() * H, 20 + R() * 80, 0, TAU); x.fill(); }
    drawFace(x, 760, 330, 175, gn.palette.body, gn.palette.belly);
    x.fillStyle = '#ffffff'; x.font = `600 150px ${ROUND}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 18; x.fillText('$' + a.name, 50, 230); x.shadowBlur = 0;
    x.font = `600 46px ${BODY}`; wrap(x, line, 540).slice(0, 3).forEach((ln, i) => x.fillText(ln, 56, 320 + i * 58));
    x.fillStyle = 'rgba(16,32,43,.85)'; x.fillRect(50, 500, 330, 60); x.fillStyle = '#ffffff'; x.font = `600 30px ${MONO}`; x.fillText('PROMOTED ON X', 70, 541);
    if (city) { x.fillStyle = 'rgba(0,0,0,.16)'; for (let y = 0; y < H; y += 5) x.fillRect(0, y, W, 2); } // LED rows
    adBoard.tex.needsUpdate = true;
  };

  // Market (city): a night-market yatai cart. Dark wood on wheels, a noren curtain, paper lanterns, a glowing price chart
  // on the back board that redraws on every trade, coin stacks on the counter and a crate of tokens on the street side.
  const marketCity = () => {
    const g = new THREE.Group(), S = new Batch(), WOOD = '#3a2a25', WOOD2 = '#4b372e';
    S.add(G.rbox(3.3, .9, 1.05, .08), WOOD, { p: [-.1, .55, .5], kind: 'matte' });
    [-1.1, 0, 1.1].forEach((x0) => S.add(G.rbox(.95, .62, .04, .02), WOOD2, { p: [x0 - .1, .55, 1.04], kind: 'matte' }));
    S.add(G.rbox(3.3, .04, .04, .02), hot('#ffb35c', 2.2), { p: [-.1, .96, 1.07], kind: 'neon' });
    S.add(G.rbox(3.5, .1, 1.3, .04), '#e6dad5', { p: [-.1, 1.05, .5] });
    [-1, 1].forEach((sd) => { const wx = -.1 + sd * 1.72; S.add(G.torus(.36, .06, TAU, 24), '#cad5dd', { p: [wx, .38, .5], r: [0, Math.PI / 2, 0], kind: 'matte' }); S.add(G.cyl(12), STEEL2, { p: [wx, .38, .5], s: [.07, .08, .07], r: [0, 0, Math.PI / 2], kind: 'metal' }); });
    [[-1.85, -.45], [1.65, -.45], [-1.85, 1.45], [1.65, 1.45]].forEach(([x, z]) => S.add(G.rbox(.09, 2.6, .09, .03), '#cdd7df', { p: [x, 1.38, z] }));
    // the roof: dark slatted boards with a neon eave
    S.add(G.rbox(3.9, .1, 2.35, .04), '#cad5dd', { p: [-.1, 2.74, .5], r: [.12, 0, 0], kind: 'matte' });
    for (let i = 0; i < 9; i++) S.add(G.rbox(.05, .04, 2.35, .02), '#ced8e0', { p: [-.1 + (i - 4) * .45, 2.81, .5], r: [.12, 0, 0], kind: 'matte' });
    S.add(G.rbox(3.94, .06, .06, .03), hot('#ff6a3d', 2.6), { p: [-.1, 2.6, 1.68], kind: 'neon' });
    [-1, 1].forEach((sd) => S.add(G.rbox(.06, .06, 2.35, .03), hot('#ff6a3d', 2.2), { p: [-.1 + sd * 1.95, 2.69, .5], r: [.12, 0, 0], kind: 'neon' }));
    // back board with the chart
    S.add(G.rbox(3.4, 1.35, .08, .03), '#c9d5dd', { p: [-.1, 1.75, -.45], kind: 'matte' });
    S.add(G.rbox(1.62, 1.1, .05, .02), hot('#5dffb0', 2.2), { p: [0, 1.66, -.4], kind: 'neon' });
    S.add(G.rbox(1.54, 1.02, .05, .02), '#bfc8df', { p: [0, 1.66, -.385], kind: 'matte' });
    // lanterns: two big ones at the front corners, small ones along the street side
    const lanterns = [];
    const lantern = (x, y, z, s, c) => { const lg = new THREE.SphereGeometry(1, 18, 14); lg.scale(.2 * s, .27 * s, .2 * s); lg.translate(x, y, z); const col = new THREE.Color(c), n = lg.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.toArray(ca, i * 3); lg.setAttribute('color', new THREE.BufferAttribute(ca, 3)); lanterns.push(lg); [-1, 1].forEach((v) => S.add(G.cyl(12), '#c8d4dc', { p: [x, y + v * .26 * s, z], s: [.13 * s, .05 * s, .13 * s], kind: 'matte' })); S.add(G.cyl(6), '#c8d4dc', { p: [x, y + .4 * s, z], s: [.008, .2 * s, .008], kind: 'matte' }); };
    lantern(-1.85, 2.05, 1.62, 1.2, '#e2836a'); lantern(1.65, 2.05, 1.62, 1.2, '#e2836a');
    [-.2, .4, 1.0].forEach((z, i) => lantern(1.72, 2.25, z, .75, i % 2 ? '#f0bf86' : '#e2836a'));
    const lanternTex = once('lanternTex', () => canvasTex(256, 128, (x, W, H) => {
      const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7a3a30'); gr.addColorStop(.25, '#ffffff'); gr.addColorStop(.75, '#ffffff'); gr.addColorStop(1, '#7a3a30'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(80,20,10,.35)'; for (let y = 8; y < H; y += 10) x.fillRect(0, y, W, 2);
      x.fillStyle = 'rgba(30,8,4,.85)'; x.font = `800 48px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle'; [W * .25, W * .75].forEach((u) => x.fillText('市', u, H / 2 + 2));
    }));
    const lmesh = new THREE.Mesh(mergeGeometries(lanterns), new THREE.MeshBasicMaterial({ map: lanternTex, vertexColors: true, color: new THREE.Color().setScalar(1.05), toneMapped: false })); lanterns.forEach((l) => l.dispose()); g.add(lmesh);
    // stools and a crate of glowing tokens
    [-.75, .45].forEach((sx) => { S.add(G.cyl(16), '#c8203a', { p: [sx, .62, 1.35], s: [.2, .07, .2], kind: 'gloss' }); S.add(G.cyl(8), STEEL2, { p: [sx, .3, 1.35], s: [.03, .58, .03], kind: 'metal' }); S.add(G.cyl(16), STEEL2, { p: [sx, .02, 1.35], s: [.16, .03, .16], kind: 'metal' }); });
    S.build(g, { shadows });
    const noren = new THREE.Mesh(new THREE.PlaneGeometry(3.0, .46), new THREE.MeshStandardMaterial({ map: norenTexture(['マ', 'ー', 'ケ', 'ッ', 'ト']), transparent: true, roughness: .9, side: THREE.DoubleSide, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .45 }));
    noren.material.emissiveMap = noren.material.map; noren.position.set(-.1, 2.36, 1.64); g.add(noren); texts.push(noren.material.map.userData.redraw);
    sign(g, '市場', .46, 1.0, '#ffd23f', [1.76, 1.47, .45], Math.PI / 2, { vertical: true });
    pool(g, -.1, 1.7, 4.4, 2.4, '#ff6a3d', .35); pool(g, 2.0, 1.2, 2.0, 2.0, '#ffd23f', .2);
    const chart = canvasPlane(1.48, .97, 320, 210); chart.mesh.position.set(0, 1.66, -.355); g.add(chart.mesh);
    const drawChart = (trend = 1, head = '', sub = '') => {
      const x = chart.x; x.fillStyle = '#0a1220'; x.fillRect(0, 0, 320, 210);
      x.strokeStyle = 'rgba(93,255,176,.12)'; x.lineWidth = 1; for (let y = 30; y < 210; y += 36) { x.beginPath(); x.moveTo(0, y); x.lineTo(320, y); x.stroke(); }
      let val = trend > 0 ? 170 : 50;
      for (let i = 0; i < 16; i++) { const o = val, c2 = val - (R() - .5 + trend * .35) * 26, hi = Math.min(o, c2) - R() * 10, lo = Math.max(o, c2) + R() * 10; x.fillStyle = x.strokeStyle = c2 < o ? '#5dffb0' : '#ff4f7a'; x.shadowColor = x.fillStyle; x.shadowBlur = 8; const cx = 14 + i * 19; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 5, hi); x.lineTo(cx + 5, lo); x.stroke(); x.fillRect(cx, Math.min(o, c2), 10, Math.max(3, Math.abs(c2 - o))); val = clamp(c2, 30, 190); }
      x.shadowBlur = 0; x.fillStyle = trend > 0 ? '#5dffb0' : '#ff4f7a'; x.font = `700 22px ${ROUND}`; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText(head || (trend > 0 ? '▲ BUY' : '▼ SELL'), 12, 8);
      if (head) { let fs = 22; while (fs > 12 && x.measureText(head).width > 296) { fs -= 2; x.font = `700 ${fs}px ${ROUND}`; } x.fillStyle = '#0a1220'; x.fillRect(0, 0, 320, 38); x.fillStyle = trend > 0 ? '#5dffb0' : '#ff4f7a'; x.fillText(head, 12, 8); } // an agent's real trade
      if (sub) { x.fillStyle = 'rgba(10,18,32,.85)'; x.fillRect(0, 176, 320, 34); x.fillStyle = '#fdf1e4'; x.font = `600 18px ${ROUND}`; x.fillText(sub.slice(0, 34), 12, 182); }
      chart.tex.needsUpdate = true;
    };
    drawChart();
    const stacks = [];
    [[-1.0, .45], [-.6, .68], [.5, .55]].forEach(([x, z], k) => { const st = new THREE.Group(); st.position.set(x, 1.12, z); g.add(st); for (let i = 0; i < 3 + k; i++) { const c = new THREE.Mesh(coinGeo, M.gold); c.rotation.x = Math.PI / 2; c.position.y = i * .028 + .014; st.add(c); } stacks.push(st); });
    let bt = 9;
    // a scrolling LED ticker along the front of the roof: the bonded coins' real market caps (world.setTicker)
    const tick = canvasPlane(3.7, .3, 2048, 166); tick.tex.wrapS = THREE.RepeatWrapping; tick.mesh.position.set(-.1, 3.0, 1.66); g.add(tick.mesh);
    { const fr = new Batch(); fr.add(G.rbox(3.84, .42, .08, .03), '#c8d7dc', { p: [-.1, 3.0, 1.61], kind: 'matte' }); fr.add(G.rbox(3.84, .03, .03, .015), hot('#ffd23f', 2.2), { p: [-.1, 3.22, 1.66], kind: 'neon' }); fr.add(G.rbox(3.84, .03, .03, .015), hot('#ffd23f', 2.2), { p: [-.1, 2.78, 1.66], kind: 'neon' }); fr.build(g, { shadows: false }); }
    const drawTicker = (items) => {
      const x = tick.x, W = 2048, H = 166; x.fillStyle = '#070a0b'; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < H; y += 6) x.fillRect(0, y, W, 2);
      x.font = `700 92px ${ROUND}`; x.textBaseline = 'middle'; let px = 30;
      const list = items?.length ? items : [{ t: 'ATTENTION AGENTS', v: 'LIVE MARKET', up: true }];
      for (let k = 0; k < 6 && px < W; k++) for (const it of list) { if (px > W) break; x.fillStyle = '#fdf4ea'; x.fillText(it.t, px, H / 2); px += x.measureText(it.t).width + 26; x.fillStyle = it.up ? '#5dffb0' : '#ff6b81'; x.fillText(it.v, px, H / 2); px += x.measureText(it.v).width + 80; }
      tick.tex.needsUpdate = true;
    };
    drawTicker();
    // the LIVE TRADES board standing on the roof: the agents' latest real trades, newest first (world.setTrades)
    const tb = canvasPlane(3.3, 1.55, 1024, 480); tb.mesh.position.set(-.1, 3.95, -.2); tb.mesh.rotation.x = -.08; g.add(tb.mesh);
    { const fr = new Batch(); fr.add(G.rbox(3.5, 1.75, .1, .04), '#2a3238', { p: [-.1, 3.95, -.27], r: [-.08, 0, 0], kind: 'matte' }); fr.add(G.rbox(3.5, .05, .05, .02), hot('#ffb35c', 2.4), { p: [-.1, 4.83, -.22], r: [-.08, 0, 0], kind: 'neon' }); [-1.5, 1.3].forEach((x) => fr.add(G.rbox(.08, 1.0, .08, .03), '#cdd7df', { p: [x, 3.2, -.3] })); fr.build(g, { shadows: false }); }
    const drawTrades = (rows = []) => {
      const x = tb.x, W = 1024, H = 480; x.fillStyle = '#0b1114'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffb33c'; x.fillRect(0, 0, W, 62); x.fillStyle = '#1b1208'; x.font = `700 38px ${ROUND}`; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('LIVE TRADES', 24, 33);
      x.textAlign = 'right'; x.font = `600 26px ${ROUND}`; x.fillText('agents trading now', W - 24, 33);
      const cols = [24, 210, 450, 610, 860, W - 24]; x.font = `600 22px ${ROUND}`; x.fillStyle = '#7f8c96'; x.textAlign = 'left'; ['TIME', 'AGENT', 'SIDE', 'TICKER'].forEach((h, i) => x.fillText(h, cols[i], 88)); x.textAlign = 'right'; x.fillText('SOL', cols[4] + 60, 88); x.fillText('PNL', cols[5], 88);
      if (!rows.length) { x.textAlign = 'center'; x.fillStyle = '#9aa7b0'; x.font = `600 30px ${ROUND}`; x.fillText('waiting for prints…', W / 2, 270); tb.tex.needsUpdate = true; return; }
      rows.slice(0, 7).forEach((r, i) => { const y = 136 + i * 50; x.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,0)'; x.fillRect(0, y - 24, W, 48);
        const up = /BUY|TP/.test(r.tag), dn = /SELL|STOP/.test(r.tag); x.font = `700 28px ${ROUND}`; x.textAlign = 'left';
        x.fillStyle = '#a99a7c'; x.fillText(new Date(r.at).toTimeString().slice(0, 8), cols[0], y); x.fillStyle = '#eef3f6'; x.fillText(String(r.name).slice(0, 12), cols[1], y);
        x.fillStyle = up ? '#5dffb0' : dn ? '#ff6b81' : '#ffd166'; x.fillText(r.tag, cols[2], y); x.fillStyle = '#eef3f6'; x.fillText('$' + String(r.symbol).slice(0, 9), cols[3], y);
        x.textAlign = 'right'; x.fillText(r.sol != null ? (+r.sol).toFixed(3) : '', cols[4] + 60, y); if (r.pnl != null) { x.fillStyle = r.pnl >= 0 ? '#5dffb0' : '#ff6b81'; x.fillText(`${r.pnl > 0 ? '+' : ''}${r.pnl}%`, cols[5], y); } });
      tb.tex.needsUpdate = true;
    };
    drawTrades();
    return { group: g, top: 4.9, setTrades: drawTrades, rects: [[-2.0, -.6, 2.6, 1.6]], act(info = {}) { drawChart(info.sell ? -1 : 1, info.head, info.sub); bt = 0; }, setTicker: drawTicker, update(t, dt) { bt += dt; tick.tex.offset.x = (t * .035) % 1; stacks.forEach((s, i) => { s.position.y = 1.12 + Math.abs(Math.sin(bt * 12 + i)) * .07 * Math.exp(-bt * 3); }); } };
  };
  // Market stall: a chart that redraws on every trade
  addStation('market', city ? marketCity : () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.rbox(3.3, 1.0, 1.05, .16), '#de9f62', { p: [-.1, .5, .5] });
    [-1.1, 0, 1.1].forEach((x0) => S.add(G.rbox(.9, .7, .04, .03), '#f6d7a8', { p: [x0 - .1, .5, 1.03], kind: 'matte' }));
    S.add(G.rbox(3.5, .12, 1.25, .06), '#f7ead6', { p: [-.1, 1.06, .5] });
    [[-1.85, -.45], [1.65, -.45], [-1.85, 1.45], [1.65, 1.45]].forEach(([x, z]) => S.add(G.cap(.075, 2.55), '#fff7ee', { p: [x, 1.35, z] }));
    for (let i = 0; i < 8; i++) S.add(G.rbox(.47, .14, 2.3, .06), i % 2 ? '#fff6ea' : '#ff7b6e', { p: [-.1 + (i - 3.5) * .502, 2.78, .5] });
    for (let i = 0; i < 16; i++) S.add(G.sph(), Math.floor(i / 2) % 2 ? '#fff6ea' : '#ff7b6e', { p: [-.1 + (i - 7.5) * .251, 2.7, 1.66], s: [.13, .12, .07] });
    [-.6, .6].forEach((x) => S.add(G.cyl(8), '#fff7ee', { p: [x - .1, 2.95, 1.2], s: [.03, .22, .03] }));
    S.add(G.rbox(1.36, .96, .08, .04), '#d0dae1', { p: [0, 1.62, -.3] });
    [-.5, .5].forEach((x) => S.add(G.cap(.035, 1.0), '#d0dae1', { p: [x, .62, -.32], kind: 'gloss' }));
    S.add(G.rbox(.85, .62, .85, .08), '#c98d55', { p: [2.15, .31, 1.0] });
    [[-.22, -.13], [0, -.13], [.22, -.13], [-.22, .13], [0, .13], [.22, .13]].forEach(([dx, dz]) => S.add(G.sph(), '#ff9c3a', { p: [2.15 + dx, .72, 1.0 + dz], s: .13, kind: 'gloss' }));
    S.add(G.sph(), '#ff9c3a', { p: [2.15, .9, 1.0], s: .13, kind: 'gloss' });
    g.add(plaque(S, 'MARKET', 1.5, .4, [-.1, 3.27, 1.2], { rim: '#ff7b6e', bg: '#fff6ea', fg: '#c2412f' }));
    S.build(g, { shadows });
    const chart = canvasPlane(1.2, .8, 320, 210); chart.mesh.position.set(0, 1.62, -.255); g.add(chart.mesh);
    const drawChart = (trend = 1) => {
      const x = chart.x; x.fillStyle = '#0d1b1e'; x.fillRect(0, 0, 320, 210);
      x.strokeStyle = 'rgba(255,255,255,.07)'; for (let y = 30; y < 210; y += 36) { x.beginPath(); x.moveTo(0, y); x.lineTo(320, y); x.stroke(); }
      let val = 120;
      for (let i = 0; i < 16; i++) { const o = val, c2 = val - (R() - .5 + trend * .35) * 26, hi = Math.min(o, c2) - R() * 10, lo = Math.max(o, c2) + R() * 10; x.fillStyle = x.strokeStyle = c2 < o ? '#41d38a' : '#ff5e6c'; const cx = 14 + i * 19; x.beginPath(); x.moveTo(cx + 5, hi); x.lineTo(cx + 5, lo); x.stroke(); x.fillRect(cx, Math.min(o, c2), 10, Math.max(3, Math.abs(c2 - o))); val = clamp(c2, 30, 190); }
      chart.tex.needsUpdate = true;
    };
    drawChart();
    const stacks = [];
    [[-1.0, .45], [-.6, .68], [.5, .55]].forEach(([x, z], k) => { const st = new THREE.Group(); st.position.set(x, 1.12, z); g.add(st); for (let i = 0; i < 3 + k; i++) { const c = new THREE.Mesh(coinGeo, M.gold); c.rotation.x = Math.PI / 2; c.position.y = i * .028 + .014; st.add(c); } stacks.push(st); });
    let bt = 9;
    return { group: g, top: 3.7, rects: [[-2.0, -.6, 2.6, 1.6]], act(info = {}) { drawChart(info.sell ? -1 : 1); bt = 0; }, update(t, dt) { bt += dt; stacks.forEach((s, i) => { s.position.y = 1.12 + Math.abs(Math.sin(bt * 12 + i)) * .07 * Math.exp(-bt * 3); }); } };
  });

  // Vault (city): an armoured kiosk with neon edges, a round vault door whose spokes spin on buybacks, an ATM panel,
  // and a steel brazier on the street side whose neon blue and magenta flame flares on burns.
  const vaultCity = () => {
    const g = new THREE.Group(), S = new Batch(), ARMOR = '#2c2f3c';
    S.add(G.rbox(3.5, .14, 3.5, .04), CONC, { p: [0, .07, 0], kind: 'matte' });
    S.add(G.rbox(3.2, 2.7, 3.2, .1), ARMOR, { p: [0, 1.49, 0] });
    [.75, 1.6].forEach((y) => S.add(G.rbox(3.24, .05, 3.24, .02), '#caccdd', { p: [0, y, 0], kind: 'matte' }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.add(G.rbox(.07, 2.6, .07, .03), hot('#38e1ff', 2.4), { p: [sx * 1.6, 1.48, sz * 1.6], kind: 'neon' });
    S.add(G.rbox(3.3, .14, 3.3, .04), STEEL, { p: [0, 2.88, 0], kind: 'metal' });
    S.add(G.rbox(3.36, .05, 3.36, .02), hot('#ff4fa3', 2.6), { p: [0, 2.83, 0], kind: 'neon' });
    S.add(G.rbox(2.2, .4, 2.2, .06), '#cbcdde', { p: [0, 3.15, 0], kind: 'metal' });
    // vault door ring and hinge, ATM panel beside it
    S.add(G.torus(.72, .07, TAU, 48), STEEL2, { p: [0, 1.2, 1.61], kind: 'metal' });
    S.add(G.torus(.8, .025, TAU, 48), hot('#38e1ff', 2.6), { p: [0, 1.2, 1.62], kind: 'neon' });
    S.add(G.rbox(.16, .7, .14, .04), STEEL2, { p: [-.8, 1.2, 1.62], kind: 'metal' });
    S.add(G.rbox(.62, .9, .1, .03), '#c8cbdc', { p: [1.12, 1.3, 1.63], kind: 'metal' });
    S.add(G.rbox(.48, .3, .02, .01), hot('#38e1ff', 1.2), { p: [1.12, 1.52, 1.685], kind: 'neon' });
    for (let i = 0; i < 9; i++) S.add(G.rbox(.09, .06, .02, .01), '#9aa0b4', { p: [1.0 + (i % 3) * .12, 1.24 - Math.floor(i / 3) * .09, 1.685], kind: 'gloss' });
    S.add(G.rbox(.3, .03, .02, .01), hot('#5dffb0', 2), { p: [1.12, .98, 1.685], kind: 'neon' });
    // brazier on the street side: a steel bowl on three legs
    const bx = 3.25, bz = .25;
    S.add(G.cyl(16), STEEL, { p: [bx, .05, bz], s: [.45, .1, .45], kind: 'metal' });
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; S.add(G.cap(.03, .7), STEEL2, { p: [bx + Math.sin(a) * .22, .42, bz + Math.cos(a) * .22], r: [Math.cos(a) * .35, 0, -Math.sin(a) * .35], kind: 'metal' }); }
    S.add(G.hemi(), '#cfd9e0', { p: [bx, .82, bz], s: [.55, .32, .55], r: [Math.PI, 0, 0], kind: 'metal' });
    S.add(G.torus(.55, .045, TAU, 40), hot('#ff4fa3', 2.6), { p: [bx, .82, bz], r: [Math.PI / 2, 0, 0], kind: 'neon' });
    S.add(G.cyl(24), '#c5d4db', { p: [bx, .8, bz], s: [.5, .02, .5], kind: 'matte' });
    S.build(g, { shadows });
    const stripes = hazardTexture();
    [[0, .3, 1.61, 0], [1.61, .3, 0, Math.PI / 2]].forEach(([x, y, z, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.1, .26), new THREE.MeshStandardMaterial({ map: stripes, roughness: .7, emissive: new THREE.Color('#ffffff'), emissiveMap: stripes, emissiveIntensity: .1 })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); });
    sign(g, 'VAULT', 1.5, .42, '#ffd23f', [0, 2.38, 1.63]);
    sign(g, '金庫', .5, 1.2, '#38e1ff', [1.63, 1.45, -.75], Math.PI / 2, { vertical: true });
    pool(g, bx, bz, 3.2, 3.2, '#f3b268', .45); pool(g, 0, 2.2, 3.8, 1.8, '#38e1ff', .25);
    const doorMat = new THREE.MeshStandardMaterial({ color: '#545a6c', metalness: .8, roughness: .32 }), spokeMat = new THREE.MeshBasicMaterial({ color: hot('#ff4fa3', 2.2), toneMapped: false });
    const door = new THREE.Group(); door.position.set(0, 1.2, 1.64); g.add(door);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.66, .66, .1, 40), doorMat); disc.rotation.x = Math.PI / 2; door.add(disc);
    const spokes = new THREE.Group(); spokes.position.z = .07; door.add(spokes);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(G.cap(.035, .9), spokeMat); s.rotation.z = (i * Math.PI) / 3; spokes.add(s); }
    const hub = new THREE.Mesh(SPH, M.gold); hub.scale.set(.13, .13, .06); spokes.add(hub);
    const pit = new THREE.Group(); pit.position.set(bx, .7, bz); g.add(pit);
    const flameGeo = G.lathe('flame', [[0, 0], [.16, .06], [.22, .2], [.19, .38], [.1, .58], [0, .74]], 20);
    const fOut = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(.75, .38, 1.05), transparent: true, opacity: .62, depthWrite: false, toneMapped: false });
    const fCore = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(.62, .52, 1.25), transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const flames = [];
    [[0, 0, 1.15], [.15, .08, .8], [-.13, -.1, .9]].forEach(([x, z, s]) => { const fg = new THREE.Group(); fg.position.set(x, .12, z); pit.add(fg); const o = new THREE.Mesh(flameGeo, fOut); o.scale.setScalar(s); o.renderOrder = 2; fg.add(o); const c = new THREE.Mesh(flameGeo, fCore); c.renderOrder = 3; c.scale.setScalar(s * .68); c.position.y = .02; fg.add(c); flames.push(fg); });
    const light = new THREE.PointLight('#e7b985', 3, 6, 2); light.position.set(0, .7, 0); pit.add(light);
    const embers = new THREE.InstancedMesh(SPH, fCore, 40); pit.add(embers);
    const ed = Array.from({ length: 40 }, () => ({ p: new THREE.Vector3((R() - .5) * .4, R() * 2, (R() - .5) * .4), v: .5 + R() * .8, ph: R() * 6 }));
    let spin = 0, burst = 0; const d = new THREE.Object3D();
    return {
      group: g, top: 4.4, rects: [[-1.75, -1.75, 1.75, 1.75]], circles: [[bx, bz, .62]],
      act(info = {}) { if (info.burn) burst = 1; else spin = 1; },
      update(t, dt) {
        spin = Math.max(0, spin - dt * .4); burst = Math.max(0, burst - dt * .45);
        spokes.rotation.z += dt * (.15 + spin * 7);
        flames.forEach((f, i) => { const fl = 1 + Math.sin(t * 13 + i * 2) * .1 + Math.sin(t * 23 + i) * .07; f.scale.set(1 + burst * .4, fl * (1 + burst * .9), 1 + burst * .4); f.rotation.y = t * (1 + i * .3); });
        light.intensity = (5 + Math.sin(t * 17) * 1.2) * (1 + burst * 1.8);
        ed.forEach((e, i) => { e.p.y += dt * e.v * (1 + burst * 2); if (e.p.y > 1.8 + burst) e.p.set((R() - .5) * .4, .3, (R() - .5) * .4); d.position.set(e.p.x + Math.sin(t * 2 + e.ph) * .1 * e.p.y, e.p.y, e.p.z + Math.cos(t * 2 + e.ph) * .1 * e.p.y); d.scale.setScalar(.022 * (1 - e.p.y / (2 + burst)) * (1 + burst)); d.updateMatrix(); embers.setMatrixAt(i, d.matrix); });
        embers.instanceMatrix.needsUpdate = true;
      },
    };
  };
  // Vault and burn pit
  addStation('vault', city ? vaultCity : () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.rbox(3.2, 2.7, 3.2, .45), '#a9bccc', { p: [0, 1.35, 0], kind: 'gloss' });
    S.add(G.rbox(3.34, .2, 3.34, .1), '#f2c14e', { p: [0, 2.32, 0], kind: 'metal' });
    S.add(G.rbox(2.5, .5, 2.5, .22), '#8fa5b8', { p: [0, 2.95, 0], kind: 'gloss' });
    for (let i = 0; i < 4; i++) S.add(G.sph(), '#f2c14e', { p: [-1.2 + i * .8, .45, 1.6], s: .07, kind: 'metal' });
    S.add(G.torus(.7, .085, TAU, 48), '#f2c14e', { p: [0, 1.15, 1.6], kind: 'metal' });
    g.add(plaque(S, 'VAULT', 1.1, .32, [0, 2.32, 1.67], { rim: '#f2c14e', bg: '#2d3b48', fg: '#f2c14e' }));
    for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU; S.add(G.sphLo(), STONES[i % 4], { p: [3.25 + Math.sin(a) * .62, .14, .25 + Math.cos(a) * .62], s: [.22, .17, .2], r: [0, a, 0] }); }
    S.add(G.cyl(24), '#5a4b3f', { p: [3.25, .05, .25], s: [.55, .08, .55], kind: 'matte' });
    [0, 1.2, 2.3].forEach((a) => S.add(G.cap(.07, .6), '#7a4e2e', { p: [3.25, .16, .25], r: [0, a, Math.PI / 2] }));
    S.build(g, { shadows });
    const door = new THREE.Group(); door.position.set(0, 1.15, 1.62); g.add(door);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .1, 40), M.metal); disc.rotation.x = Math.PI / 2; door.add(disc);
    const spokes = new THREE.Group(); spokes.position.z = .07; door.add(spokes);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(G.cap(.04, .85), M.gold); s.rotation.z = (i * Math.PI) / 3; spokes.add(s); }
    const hub = new THREE.Mesh(SPH, M.gold); hub.scale.set(.12, .12, .06); spokes.add(hub);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .12, 40), M.gold); coin.rotation.x = Math.PI / 2; coin.position.set(0, 3.78, 0); g.add(coin);
    const pit = new THREE.Group(); pit.position.set(3.25, 0, .25); g.add(pit);
    const flameGeo = G.lathe('flame', [[0, 0], [.16, .06], [.22, .2], [.19, .38], [.1, .58], [0, .74]], 20);
    const flames = [];
    [[0, 0, 1], [.13, .08, .72], [-.11, -.09, .8]].forEach(([x, z, s]) => { const fg = new THREE.Group(); fg.position.set(x, .12, z); pit.add(fg); const o = new THREE.Mesh(flameGeo, M.flame); o.scale.setScalar(s); fg.add(o); const c = new THREE.Mesh(flameGeo, M.flameCore); c.scale.setScalar(s * .55); c.position.y = .02; fg.add(c); flames.push(fg); });
    const light = new THREE.PointLight('#ff8a3d', 5, 6, 2); light.position.set(0, .9, 0); pit.add(light);
    const embers = new THREE.InstancedMesh(SPH, M.flameCore, 40); pit.add(embers);
    const ed = Array.from({ length: 40 }, () => ({ p: new THREE.Vector3((R() - .5) * .4, R() * 2, (R() - .5) * .4), v: .5 + R() * .8, ph: R() * 6 }));
    let spin = 0, burst = 0; const d = new THREE.Object3D();
    return {
      group: g, top: 4.4, rects: [[-1.75, -1.75, 1.75, 1.75]], circles: [[3.25, .25, .9]],
      act(info = {}) { if (info.burn) burst = 1; else spin = 1; },
      update(t, dt) {
        spin = Math.max(0, spin - dt * .4); burst = Math.max(0, burst - dt * .45);
        spokes.rotation.z += dt * (.15 + spin * 7); coin.rotation.z = t * .8;
        flames.forEach((f, i) => { const fl = 1 + Math.sin(t * 13 + i * 2) * .1 + Math.sin(t * 23 + i) * .07; f.scale.set(1 + burst * .4, fl * (1 + burst * .9), 1 + burst * .4); f.rotation.y = t * (1 + i * .3); });
        light.intensity = (5 + Math.sin(t * 17) * 1.2) * (1 + burst * 1.8);
        ed.forEach((e, i) => { e.p.y += dt * e.v * (1 + burst * 2); if (e.p.y > 1.8 + burst) e.p.set((R() - .5) * .4, .3, (R() - .5) * .4); d.position.set(e.p.x + Math.sin(t * 2 + e.ph) * .1 * e.p.y, e.p.y, e.p.z + Math.cos(t * 2 + e.ph) * .1 * e.p.y); d.scale.setScalar(.022 * (1 - e.p.y / (2 + burst)) * (1 + burst)); d.updateMatrix(); embers.setMatrixAt(i, d.matrix); });
        embers.instanceMatrix.needsUpdate = true;
      },
    };
  });

  // Quest board (city): a free-standing neon notice kiosk. Glowing quest cards on the plaza side flip when an agent posts
  // one; the back, which is what the street camera sees, is a lit QUESTS poster. Neon header both sides.
  const boardCity = () => {
    const g = new THREE.Group(), S = new Batch();
    S.add(G.rbox(4.1, .14, 1.0, .04), CONC, { p: [0, .07, 0], kind: 'matte' });
    S.add(G.rbox(4.16, .04, 1.06, .02), hot('#ffd23f', 2.2), { p: [0, .1, 0], kind: 'neon' });
    [-1, 1].forEach((sd) => S.add(G.rbox(.22, .9, .3, .04), STEEL, { p: [sd * 1.6, .55, 0], kind: 'metal' }));
    S.add(G.rbox(3.9, 2.3, .38, .06), '#ccd7de', { p: [0, 2.1, 0] });
    [1, -1].forEach((f) => S.add(G.rbox(3.6, 2.0, .02, .01), '#c6d3da', { p: [0, 2.1, f * .19], kind: 'matte' }));
    for (const f of [1, -1]) { [3.25, .95].forEach((y) => S.add(G.rbox(3.96, .05, .05, .02), hot('#38e1ff', 2.4), { p: [0, y, f * .2], kind: 'neon' })); [-1, 1].forEach((sd) => S.add(G.rbox(.05, 2.34, .05, .02), hot('#38e1ff', 2.4), { p: [sd * 1.97, 2.1, f * .2], kind: 'neon' })); }
    S.add(G.rbox(4.1, .55, .46, .06), '#c9d4dd', { p: [0, 3.55, 0], kind: 'metal' });
    S.add(G.rbox(4.16, .05, .52, .02), hot('#ff4fa3', 2.6), { p: [0, 3.3, 0], kind: 'neon' });
    S.build(g, { shadows });
    twoSided(g, 'QUEST BOARD', 2.6, .42, '#ff4fa3', [0, 3.56, 0], 0, undefined, .245);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.9), new THREE.MeshBasicMaterial({ map: questPoster(), toneMapped: false })); poster.material.color.setScalar(.7);
    poster.position.set(0, 2.1, -.205); poster.rotation.y = Math.PI; g.add(poster); texts.push(poster.material.map.userData.redraw);
    pool(g, 0, 1.0, 4.4, 2.0, '#38e1ff', .3); pool(g, 0, -1.0, 4.4, 2.0, '#ff4fa3', .3);
    const card = cardTexture(); texts.push(card.userData.redraw);
    const CARD = city ? ['#e6cfa4', '#f9dcba', '#e5caac', '#dbc8b3', '#f2e0cb'] : ['#ffe066', '#5dffb0', '#7fe9ff', '#ff9fd0', '#f8d6af'], notes = [];
    const pinMat = new THREE.MeshBasicMaterial({ color: hot('#ff4fa3', 2.4), toneMapped: false });
    for (let i = 0; i < 8; i++) {
      const n = new THREE.Group(); n.position.set(-1.23 + (i % 4) * .82 + (R() - .5) * .05, 3.06 - Math.floor(i / 4) * 1.02, .215); g.add(n);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(.68, .52), new THREE.MeshBasicMaterial({ map: card, color: CARD[i % CARD.length], transparent: true, toneMapped: false })); paper.position.y = -.28; n.add(paper);
      const pin = new THREE.Mesh(SPH, pinMat); pin.scale.setScalar(.035); pin.position.z = .015; n.add(pin);
      n.rotation.z = (R() - .5) * .12; notes.push({ n, paper, ft: 9 });
    }
    return {
      group: g, top: 3.9, rects: [[-2.0, -.3, 2.0, .3]],
      act() { const k = notes[Math.floor(R() * notes.length)]; k.ft = 0; k.paper.material.color.set(CARD[Math.floor(R() * CARD.length)]); },
      update(t, dt) { notes.forEach((k) => { k.ft += dt; k.n.rotation.x = k.ft < .5 ? (-Math.PI / 2) * (1 - Math.sin(((k.ft / .5) * Math.PI) / 2)) : 0; }); },
    };
  };
  // Quest board: a notice board with a little roof
  addStation('board', city ? boardCity : () => {
    const g = new THREE.Group(), S = new Batch();
    [-1, 1].forEach((sd) => S.add(G.cap(.13, 2.95), '#a8743f', { p: [sd * 1.75, 1.6, -.33] }));
    S.add(G.rbox(4.0, 2.1, .2, .1), '#c99a62', { p: [0, 1.72, -.1] });
    S.add(G.rbox(3.7, 1.75, .04, .02), '#b98450', { p: [0, 1.64, .0], kind: 'matte' });
    S.add(G.rbox(4.4, .2, .9, .1), '#d0634f', { p: [0, 2.98, -.25], r: [-.12, 0, 0] });
    S.build(g, { shadows });
    const head = label('QUESTS', 1.3, .3, { bg: '#c99a62', fg: '#4a2e14', size: .72 }); head.position.set(0, 2.56, .005); g.add(head);
    const NOTE = ['#fffdf5', '#fff2a8', '#ffd1dc', '#c9f3ea'], notes = [];
    for (let i = 0; i < 8; i++) {
      const n = new THREE.Group(); n.position.set(-1.275 + (i % 4) * .85 + (R() - .5) * .08, 1.98 - Math.floor(i / 4) * .55, .05); g.add(n);
      const paper = new THREE.Mesh(G.rbox(.42, .34, .012, .005), new THREE.MeshStandardMaterial({ color: NOTE[i % 4], roughness: .9 })); paper.position.y = -.14; n.add(paper);
      const pin = new THREE.Mesh(SPH, M.red); pin.scale.setScalar(.035); pin.position.z = .015; n.add(pin);
      n.rotation.z = (R() - .5) * .2; notes.push({ n, paper, ft: 9 });
    }
    return { group: g, top: 3.5, circles: [[-1.75, -.35, .35], [1.75, -.35, .35]], act() { const k = notes[Math.floor(R() * notes.length)]; k.ft = 0; k.paper.material.color.set(NOTE[Math.floor(R() * 4)]); }, update(t, dt) { notes.forEach((k) => { k.ft += dt; k.n.rotation.x = k.ft < .5 ? (-Math.PI / 2) * (1 - Math.sin(((k.ft / .5) * Math.PI) / 2)) : 0; }); } };
  });

  // Launch pad: a rocket goes up for every new pair
  addStation('launch', () => {
    const g = new THREE.Group(), S = new Batch();
    let padRing = null;
    if (city) {
      // a rooftop pad: dark octagon, yellow rim, concentric neon rings, crosshair and edge lights; a steel gantry with neon
      S.add(G.cyl(8), '#ced8df', { p: [0, .15, 0], s: [2.0, .3, 2.0], r: [0, Math.PI / 8, 0], kind: 'matte' });
      S.add(G.cyl(8), hot('#ffd23f', 2.2), { p: [0, .27, 0], s: [2.04, .04, 2.04], r: [0, Math.PI / 8, 0], kind: 'neon' });
      S.add(G.torus(1.5, .035, TAU, 64), hot('#38e1ff', 2.6), { p: [0, .3, 0], r: [Math.PI / 2, 0, 0], kind: 'neon' });
      S.add(G.torus(.95, .03, TAU, 48), hot('#ff4fa3', 2.6), { p: [0, .3, 0], r: [Math.PI / 2, 0, 0], kind: 'neon' });
      [Math.PI / 4, -Math.PI / 4].forEach((ry) => S.add(G.rbox(2.7, .012, .05, .006), hot('#38e1ff', 1.3), { p: [0, .305, 0], r: [0, ry, 0], kind: 'neon' }));
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; S.add(G.rbox(.24, .02, .09, .01), i % 2 ? '#3d4649' : hot('#ffd23f', 1.6), { p: [Math.sin(a) * 1.72, .31, Math.cos(a) * 1.72], r: [0, a, 0], kind: i % 2 ? 'matte' : 'neon' }); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; S.add(G.sphLo(), hot('#e8f6ff', 2.4), { p: [Math.sin(a) * 1.92, .32, Math.cos(a) * 1.92], s: .05, kind: 'neon' }); }
      // owner: no steel gantry; just the LAUNCH sign on one short post
      S.add(G.cyl(10), '#cdd7df', { p: [2.25, 1.1, 0], s: [.06, 2.2, .06], kind: 'metal' });
      twoSided(g, 'LAUNCH', 1.1, .34, '#5dffb0', [2.25, 2.35, 0], 0, undefined, .43);
      pool(g, 0, 0, 5.2, 5.2, '#38e1ff', .3);
      padRing = new THREE.Mesh(G.torus(1.85, .04, TAU, 64), new THREE.MeshBasicMaterial({ color: hot('#f5c186', 2.4), transparent: true, opacity: .2, depthWrite: false, toneMapped: false }));
      padRing.rotation.x = Math.PI / 2; padRing.position.y = .34; g.add(padRing);
    } else {
      S.add(G.cyl(56), '#e3e7eb', { p: [0, .15, 0], s: [1.75, .3, 1.75], kind: 'gloss' });
      S.add(G.cyl(56), '#cdd3d9', { p: [0, .305, 0], s: [1.32, .02, 1.32], kind: 'matte' });
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; S.add(G.rbox(.3, .03, .12, .015), i % 2 ? '#2e3940' : '#ffc93d', { p: [Math.sin(a) * 1.55, .31, Math.cos(a) * 1.55], r: [0, a, 0], kind: 'matte' }); }
      [-.32, .32].forEach((z) => S.add(G.cap(.09, 3.7), '#ff7a59', { p: [2.25, 1.94, z] }));
      [1.0, 2.0, 3.0].forEach((y) => S.add(G.rbox(.16, .12, .8, .05), '#ff7a59', { p: [2.25, y, 0] }));
      S.add(G.rbox(.9, .12, .14, .05), '#ff7a59', { p: [1.78, 2.6, 0] });
    }
    S.build(g, { shadows });
    if (!city) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + .26, l = new THREE.Mesh(SPH, M.glow); l.scale.setScalar(.06); l.position.set(Math.sin(a) * 1.68, .3, Math.cos(a) * 1.68); g.add(l); }
    const RK = city ? { body: new THREE.MeshStandardMaterial({ color: '#ede8e2', roughness: .35, metalness: .25 }), nose: new THREE.MeshStandardMaterial({ color: '#2c3438', roughness: .35, metalness: .6 }), trim: new THREE.MeshBasicMaterial({ color: hot('#ff4fa3', 1.8), toneMapped: false }), flame: new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.3, 1.05, 1.9), transparent: true, opacity: .95, depthWrite: false, toneMapped: false }), smoke: new THREE.MeshStandardMaterial({ color: '#8d7c69', emissive: new THREE.Color('#293d45'), roughness: 1, transparent: true, opacity: .8, depthWrite: false }) }
      : { body: M.white, nose: M.red, trim: M.red, flame: M.flameCore, smoke: M.smoke };
    const rocket = new THREE.Group(); rocket.position.set(0, .32, 0); g.add(rocket);
    rocket.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.17, 0], [.22, .12], [.24, .5], [.23, .86], [.2, 1.05], [0, 1.05]].map(([x, y]) => new THREE.Vector2(x * 1.3, y * 1.3)), 28), RK.body));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.26, .6, 28), RK.nose); nose.position.y = 1.66; rocket.add(nose);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .1, 28), RK.trim); band.position.y = .72; rocket.add(band);
    const win = new THREE.Mesh(SPH, M.glow); win.scale.set(.1, .1, .04); win.position.set(0, 1.05, .3); rocket.add(win);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(.3, -.08); fin.lineTo(0, .5); fin.lineTo(0, 0);
    const finGeo = new THREE.ExtrudeGeometry(fin, { depth: .04, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2 }); finGeo.translate(0, 0, -.02);
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(finGeo, RK.trim); const a = (i / 3) * TAU; f.position.set(Math.sin(a) * .27, 0, Math.cos(a) * .27); f.rotation.y = a - Math.PI / 2; rocket.add(f); }
    const flame = new THREE.Group(); rocket.add(flame);
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(.2, .9, 14), RK.flame); f1.rotation.x = Math.PI; f1.position.y = -.45; flame.add(f1);
    flame.visible = false;
    const smoke = new THREE.InstancedMesh(SPH, RK.smoke, 36); g.add(smoke);
    const sd = Array.from({ length: 36 }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 9 })); let si = 0, spawn = 0;
    const d = new THREE.Object3D();
    let lt = -1, pop = 1;
    return {
      group: g, top: 4.4, rects: [[-1.85, -1.85, 1.85, 1.85], [1.95, -.6, 2.6, .6]],
      busy: () => lt >= 0, rocketY: () => rocket.position.y,
      act() { if (lt >= 0) return; lt = 0; },
      update(t, dt) {
        if (lt >= 0) {
          lt += dt;
          const rise = lt > .8 ? .5 * 10 * (lt - .8) ** 2 : 0;
          rocket.position.set(lt < .8 ? Math.sin(lt * 90) * .012 : 0, .32 + rise, 0);
          flame.visible = lt > .15; flame.scale.set(1, (lt < .8 ? lt / .8 : 1.4) * (1 + Math.sin(t * 50) * .12), 1);
          spawn -= dt;
          if (lt > .15 && lt < 2.6 && spawn <= 0) { spawn = .035; const s = sd[(si = (si + 1) % sd.length)]; s.p.set((R() - .5) * .3, Math.max(.6, rocket.position.y - .3), (R() - .5) * .3); const a = R() * TAU; s.v.set(Math.cos(a) * (lt < .9 ? 1.4 : .35), .25 + R() * .3, Math.sin(a) * (lt < .9 ? 1.4 : .35)); s.life = 0; }
          if (lt > 4.2) { lt = -1; pop = 0; rocket.position.set(0, .32, 0); flame.visible = false; }
        }
        if (padRing) { padRing.material.opacity = lt >= 0 ? .6 + Math.sin(t * 30) * .12 : .12 + Math.sin(t * 2) * .04; padRing.scale.setScalar(lt >= 0 ? 1 + (lt % .6) * .12 : 1); }
        if (pop < 1) { pop = Math.min(1, pop + dt * 2.2); rocket.scale.setScalar(Math.sin((pop * Math.PI) / 2) * (1 + Math.sin(pop * Math.PI) * .15)); }
        sd.forEach((s, i) => { s.life += dt; if (s.life > 2.2) d.scale.setScalar(0); else { s.p.addScaledVector(s.v, dt); s.v.multiplyScalar(1 - dt * 1.2); d.position.copy(s.p); d.scale.setScalar((.16 + s.life * .35) * (s.life > 1.5 ? Math.max(0, 1 - (s.life - 1.5) / .7) : 1)); } d.updateMatrix(); smoke.setMatrixAt(i, d.matrix); });
        smoke.instanceMatrix.needsUpdate = true;
      },
    };
  });

  // Rewards well, in the middle of the plaza
  addStation('well', () => {
    const g = new THREE.Group(), S = new Batch();
    if (city) {
      // a fountain: dark stone basin with a soft lilac lip, up-lights in the water, a column with an upper bowl that
      // spills a faintly lit curtain of water, and a jet
      S.add(G.cyl(40), '#ced8e0', { p: [0, .25, 0], s: [1.28, .5, 1.28], kind: 'matte' });
      S.add(G.torus(1.26, .08, TAU, 64), '#d2dbe2', { p: [0, .5, 0], r: [Math.PI / 2, 0, 0], kind: 'metal' });
      S.add(G.torus(1.3, .028, TAU, 64), hot('#38e1ff', 2.6), { p: [0, .4, 0], r: [Math.PI / 2, 0, 0], kind: 'neon' });
            for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + .2; S.add(G.sphLo(), hot(i % 2 ? '#38e1ff' : '#f5c186', 2.4), { p: [Math.sin(a) * 1.0, .45, Math.cos(a) * 1.0], s: [.08, .03, .08], kind: 'neon' }); }
      S.add(G.cyl(20), '#d0dae1', { p: [0, .95, 0], s: [.15, 1.0, .15], kind: 'metal' });
      S.add(G.hemi(), '#d0dae1', { p: [0, 1.5, 0], s: [.6, .22, .6], r: [Math.PI, 0, 0], kind: 'metal' });
      S.add(G.torus(.6, .03, TAU, 48), hot('#38e1ff', 2.6), { p: [0, 1.5, 0], r: [Math.PI / 2, 0, 0], kind: 'neon' });
    } else {
      S.add(G.cyl(32), '#8e857a', { p: [0, .3, 0], s: [.92, .6, .92], kind: 'matte' });
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + ring * .22; S.add(G.sphLo(), STONES[(i + ring) % 4], { p: [Math.sin(a) * 1.0, .2 + ring * .3, Math.cos(a) * 1.0], s: [.27, .19, .22], r: [0, a, 0] }); }
      [-1, 1].forEach((sd) => S.add(G.cap(.08, 1.9), '#9a6a3c', { p: [sd * 1.02, 1.12, 0] }));
      S.add(G.cyl(12), '#9a6a3c', { p: [0, 1.98, 0], s: [.065, 2.2, .065], r: [0, 0, Math.PI / 2] });
      S.add(G.cyl(8), '#eadfc6', { p: [0, 1.5, 0], s: [.014, .95, .014] });
      S.add(G.cyl(16), '#b07d4b', { p: [0, .98, 0], s: [.15, .18, .15] });
      S.add(G.cone(32), '#d4634f', { p: [0, 2.5, 0], s: [1.6, .95, 1.6] });
      S.add(G.torus(1.55, .08, TAU, 48), '#b9503f', { p: [0, 2.04, 0], r: [Math.PI / 2, 0, 0] });
      S.add(G.sph(), '#ffc93d', { p: [0, 3.02, 0], s: .13, kind: 'gloss' });
    }
    S.build(g, { shadows });
    const wm = waterMat(city); waters.push(wm);
    const ww = new THREE.Mesh(new THREE.CircleGeometry(city ? 1.2 : .86, 40), wm); ww.rotation.x = -Math.PI / 2; ww.position.y = city ? .46 : .52; g.add(ww);
    let fx = null;
    if (city) {
      const top = new THREE.Mesh(new THREE.CircleGeometry(.56, 32), wm); top.rotation.x = -Math.PI / 2; top.position.y = 1.47; g.add(top);
      const streaks = canvasTex(128, 64, (x, W, H) => { x.clearRect(0, 0, W, H); const r = rng(5); for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${.15 + r() * .6})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 6 + r() * 30); } });
      streaks.wrapS = streaks.wrapT = THREE.RepeatWrapping; streaks.repeat.set(5, 1);
      const water = (o) => new THREE.MeshBasicMaterial({ map: streaks, color: new THREE.Color().setRGB(.55, .5, .95), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const curtain = new THREE.Mesh(new THREE.CylinderGeometry(.6, .82, 1.02, 40, 1, true), water(.5)); curtain.position.y = .98; g.add(curtain);
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(.03, .08, 1.0, 12, 1, true), water(.8)); jet.position.y = 1.98; g.add(jet);
      pool(g, 0, 0, 4.6, 4.6, '#38e1ff', .35);
      fx = { streaks, jet };
    }
    const coins = new THREE.InstancedMesh(coinGeo, M.gold, 40); coins.castShadow = true; g.add(coins);
    const cd = Array.from({ length: 40 }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), s: new THREE.Vector3(), life: 9 }));
    const d = new THREE.Object3D(); let any = true, drip = 0, tagT = 9;
    // the floating payout label (a sprite that always faces the camera) and an AIRDROPS sign over the fountain
    let tag = null, drawTag = () => {};
    if (city) {
      const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 160; const tx2 = tc.getContext('2d'), tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace;
      tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tt, transparent: true, depthWrite: false, toneMapped: false })); tag.scale.set(3.2, .5, 1); tag.visible = false; tag.renderOrder = 5; g.add(tag);
      drawTag = (text) => { tx2.clearRect(0, 0, 1024, 160); tx2.font = `800 76px ${ROUND}`; tx2.textAlign = 'center'; tx2.textBaseline = 'middle'; const w = Math.min(1000, tx2.measureText(text).width + 70); tx2.fillStyle = 'rgba(20,14,34,.82)'; tx2.beginPath(); tx2.roundRect(512 - w / 2, 18, w, 124, 62); tx2.fill(); tx2.lineWidth = 6; tx2.strokeStyle = '#f0c27e'; tx2.stroke(); tx2.fillStyle = '#ffe2a8'; tx2.fillText(text, 512, 82, 960); tt.needsUpdate = true; };
      [[1.33, 0], [-1.33, Math.PI]].forEach(([z, ry]) => sign(g, 'AIRDROPS', 1.1, .26, '#f0c27e', [0, .3, z], ry)); // on the basin's rim, front and back
    }
    return {
      group: g, top: city ? 3.3 : 3.4, circles: [[0, 0, city ? 1.48 : 1.35]],
      act() { cd.forEach((c) => { const a = R() * TAU, sp = 1.3 + R() * 1.6; c.p.set((R() - .5) * .3, .9, (R() - .5) * .3); c.v.set(Math.cos(a) * sp, 4 + R() * 2.2, Math.sin(a) * sp); c.s.set(R() * 9, R() * 9, R() * 9); c.life = -R() * .4; }); },
      // a real payout (an agent's creator fees paid out on chain): a burst of coins and its amount floating up
      payout(text) { this.act(); if (tag) { drawTag(text); tagT = 0; } },
      update(t, dt) {
        let live = false;
        if ((drip += dt) > 2.4) { drip = 0; let n = 0; for (const c of cd) { if (n >= 4) break; if (c.life > 2.3) { const a = R() * TAU, sp = .5 + R() * .7; c.p.set(0, 1.9, 0); c.v.set(Math.cos(a) * sp, 2.2 + R(), Math.sin(a) * sp); c.s.set(R() * 9, R() * 9, R() * 9); c.life = 0; n++; } } } // a gentle drip of coins between payouts
        if (tag) { tagT += dt; const k = Math.min(1, tagT / 4.5); tag.position.y = 2.5 + k * 1.6; tag.material.opacity = tagT < .3 ? tagT / .3 : Math.max(0, 1 - (k - .6) / .4); tag.visible = tagT < 4.5; const cp = world.camPos; if (cp) { const dd = Math.hypot(cp.x, cp.z); tag.material.opacity *= clamp((dd - 7) / 5, 0, 1); } } // never right in your face
        cd.forEach((c, i) => { c.life += dt; if (c.life < 0 || c.life > 2.3) d.scale.setScalar(0); else { live = true; c.v.y -= 7 * dt; c.p.addScaledVector(c.v, dt); d.position.copy(c.p); d.rotation.set(c.s.x * c.life, c.s.y * c.life, c.s.z * c.life); d.scale.setScalar(c.life > 1.7 ? Math.max(0, 1 - (c.life - 1.7) / .6) : 1); } d.updateMatrix(); coins.setMatrixAt(i, d.matrix); });
        if (live || any) coins.instanceMatrix.needsUpdate = true; any = live;
        if (fx) { fx.streaks.offset.y = -t * .9; fx.jet.scale.set(1, 1 + Math.sin(t * 7) * .06, 1); }
      },
    };
  });

  // ---------------------------------------------------------------- the districts (city only)
  // Neon Arcade (west), Harbor Docks (east) and Sakura Park (south), each down a lit street from the town square.
  // Same toy kit and night palette as the square; everything batched, a few things animated through extras.
  const zoneBuild = {}, zoneExtras = {}, zoneGroups = {}, townOnly = [], zoneApi = {};
  if (city) {
    const B = new Batch(), at = (cx, cz) => (dx, y, dz) => [cx + dx, y, cz + dz];
    const ground = (x, z, w, d, draw, y = .012) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: canvasTex(512, Math.round(512 * d / w), draw), roughness: .5, metalness: .2 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m; };
    // a welcome arch over each district's entrance
    let archParent = group, archB = B;
    const arch = (x, z, ry, text, c) => { const o = (dx, y, dz) => [x + Math.cos(ry) * dx, y, z - Math.sin(ry) * dx]; [-3.4, 3.4].forEach((dx) => archB.add(G.rbox(.42, 4.2, .42, .1), '#b9875c', { p: o(dx, 2.1, 0), r: [0, ry, 0], kind: 'soft' })); archB.add(G.rbox(7.4, .4, .5, .1), '#a97a50', { p: o(0, 4.3, 0), r: [0, ry, 0], kind: 'soft' }); archB.add(G.rbox(7.2, .05, .05, .02), hot(c, 2), { p: o(0, 4.1, .2), r: [0, ry, 0], kind: 'neon' }); [0, Math.PI].forEach((f) => { const sg = neonSign(text, 5, .8, c, { glow: .95 }); const [px, py, pz] = o(0, 5.75, 0); sg.position.set(px + Math.sin(ry + f) * .2, py, pz + Math.cos(ry + f) * .2); sg.rotation.y = ry + f; archParent.add(sg); }); };
    // a glowing portal in each gate: walk into it (or press E) to go through, like the cafe door
    const portalTex = canvasTex(128, 256, (cx, W, H) => { const gr = cx.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, 'rgba(255,214,236,1)'); gr.addColorStop(.5, 'rgba(201,182,255,1)'); gr.addColorStop(1, 'rgba(170,214,255,1)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H); cx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) cx.fillRect(Math.random() * W, Math.random() * H, 2, 6 + Math.random() * 14); });
    portalTex.wrapT = THREE.RepeatWrapping;
    const portals = [];
    const gate = (G2, x, z, ry, text, c) => { arch(x, z, ry, text, c); { const o = (dx, y) => [x + Math.cos(ry) * dx, y, z - Math.sin(ry) * dx]; for (let k = -7; k <= 7; k++) archB.add(G.sphLo(), k % 3 ? '#7cc96a' : '#8fd47a', { p: o(k * .5, 4.75 + Math.abs(Math.sin(k * 1.7)) * .25), s: .55 + (k % 2) * .12 }); [-3.4, 3.4].forEach((dx) => { archB.add(G.sphLo(), '#86cf6e', { p: o(dx, .45), s: [.9, .6, .9] }); [0, 1, 2].forEach((q) => archB.add(G.sphLo(), ['#ffb3c7', '#fff1a8', '#ffffff'][q], { p: o(dx + (q - 1) * .4, .85, ), s: .12 })); }); } return; const pm = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.0), new THREE.MeshBasicMaterial({ map: portalTex, color: new THREE.Color(tint(c)), transparent: true, opacity: .96, depthWrite: true, side: THREE.DoubleSide, toneMapped: false })); pm.position.set(x, 2.05, z); pm.rotation.y = ry; G2.add(pm); portals.push(pm); };
    extras.push((t) => { portalTex.offset.y = -t * .35; });
    // the town's three gates, at the edges of the square (the districts' exits are built with each district)
    gate(group, -19.6, 0, Math.PI / 2, 'NEON ARCADE ›', '#e2c09a'); gate(group, 19.6, 0, -Math.PI / 2, 'HARBOR DOCKS ›', '#f8d1a4'); gate(group, 0, 19.6, Math.PI, 'SAKURA PARK ›', '#f0a0b8');

    // hedges along both sides of each path between the town and its district (owner: no bare ground beside the paths)
    { const hb = (x, z) => archB.add(G.sphLo(), (Math.round(x * 3 + z * 7) % 3) ? '#7cc96a' : '#8fd47a', { p: [x, .55, z], s: [.95, .75, .95] });
      for (let u = 20.8; u <= 25.5; u += 1.15) { [-4.6, 4.6].forEach((o2) => { hb(u, o2); hb(-u, o2); hb(o2, u); }); } }
    // ---- minigame stations (owner, 2026-10-07: "make it clear where the minigames are, fix everything aesthetically")
    // One look for every game spot: a glowing pad where you stand, a floating badge (the game's icon and name) with a
    // soft light beacon so you can spot it from across the district, and a lit poster or a themed arcade cabinet with
    // the game's painted key art. Art lives in games/art (painted with Codex).
    const ART = (p) => new URL('./games/art/' + p, import.meta.url).href;
    const imgs = new Map(), loadImg = (src) => { if (!imgs.has(src)) imgs.set(src, new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; })); return imgs.get(src); };
    const TITLE = `"Lilita One", ${ROUND}`, fontsReady = () => (document.fonts?.load ? Promise.all([document.fonts.load('64px "Lilita One"'), document.fonts.load('700 40px "Fredoka"')]).catch(() => {}) : Promise.resolve());
    const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const mixHex = (a, b, k) => { const A = parseInt(a.slice(1), 16), Bn = parseInt(b.slice(1), 16), ch = (s) => Math.round(((A >> s) & 255) * (1 - k) + ((Bn >> s) & 255) * k); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
    const fitFont = (x, text, maxW, size, family) => { x.font = `${size}px ${family}`; const w = x.measureText(text).width; if (w > maxW) x.font = `${Math.floor(size * maxW / w)}px ${family}`; };
    const texOf = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    // the glowing pad you stand on to play
    const padTex = {}, gamePad = (grp, zx, x, z, color, size = 2.3) => {
      padTex[color] ??= canvasTex(256, 256, (cx) => { const g = cx.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, rgba(color, .3)); g.addColorStop(.6, rgba(color, .12)); g.addColorStop(.74, rgba(color, .95)); g.addColorStop(.8, rgba(color, .35)); g.addColorStop(1, rgba(color, 0)); cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
        cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = 6; cx.setLineDash([18, 14]); cx.beginPath(); cx.arc(128, 128, 76, 0, TAU); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 4; k++) { cx.save(); cx.translate(128, 128); cx.rotate(k * TAU / 4); cx.beginPath(); cx.moveTo(-14, -48); cx.lineTo(0, -34); cx.lineTo(14, -48); cx.lineTo(0, -40); cx.closePath(); cx.fill(); cx.restore(); } });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: padTex[color], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, .035, z); m.renderOrder = 2; grp.add(m);
      zx.push((t) => { const k = .5 + .5 * Math.sin(t * 2.6); m.scale.setScalar(.94 + k * .1); m.material.opacity = .7 + .3 * k; m.rotation.z = t * .35; });
      return m;
    };
    // the floating badge: the game's icon in a coloured disc with its name below, bobbing over the station, and a faint
    // beam of light under it down to the ground
    const beamTex = canvasTex(32, 256, (cx) => { const g = cx.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.6, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(0, 0, 32, 256); });
    const gameBadge = (grp, zx, x, y, z, m) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 660; const tex = texOf(c);
      const draw = (icon) => { const x2 = c.getContext('2d'); x2.clearRect(0, 0, 512, 660);
        x2.save(); x2.shadowColor = 'rgba(10,5,25,.55)'; x2.shadowBlur = 36; x2.shadowOffsetY = 12; x2.fillStyle = m.color; x2.beginPath(); x2.arc(256, 240, 196, 0, TAU); x2.fill(); x2.restore();
        const g = x2.createRadialGradient(190, 160, 20, 256, 240, 200); g.addColorStop(0, mixHex(m.color, '#ffffff', .55)); g.addColorStop(.7, m.color); g.addColorStop(1, mixHex(m.color, '#16262d', .25)); x2.fillStyle = g; x2.beginPath(); x2.arc(256, 240, 190, 0, TAU); x2.fill();
        x2.lineWidth = 18; x2.strokeStyle = '#ffffff'; x2.beginPath(); x2.arc(256, 240, 190, 0, TAU); x2.stroke();
        x2.lineWidth = 6; x2.strokeStyle = 'rgba(255,209,102,.95)'; x2.beginPath(); x2.arc(256, 240, 168, 0, TAU); x2.stroke();
        x2.fillStyle = 'rgba(255,255,255,.22)'; x2.beginPath(); x2.ellipse(206, 150, 96, 46, -.5, 0, TAU); x2.fill(); // gloss
        if (icon) { const sc = 270 / Math.max(icon.width, icon.height), w = icon.width * sc, h = icon.height * sc; x2.save(); x2.shadowColor = 'rgba(0,0,0,.35)'; x2.shadowBlur = 18; x2.shadowOffsetY = 10; x2.drawImage(icon, 256 - w / 2, 240 - h / 2, w, h); x2.restore(); }
        fitFont(x2, m.title.toUpperCase(), 420, 62, TITLE); const tw = Math.min(490, x2.measureText(m.title.toUpperCase()).width + 70);
        x2.save(); x2.shadowColor = 'rgba(10,5,25,.6)'; x2.shadowBlur = 20; x2.shadowOffsetY = 8; x2.fillStyle = '#17282f'; x2.beginPath(); x2.roundRect(256 - tw / 2, 478, tw, 104, 52); x2.fill(); x2.restore();
        x2.lineWidth = 7; x2.strokeStyle = m.color; x2.beginPath(); x2.roundRect(256 - tw / 2, 478, tw, 104, 52); x2.stroke();
        x2.fillStyle = '#ffffff'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(m.title.toUpperCase(), 256, 533);
        tex.needsUpdate = true; };
      draw(null); Promise.all([loadImg(ART(m.icon)), fontsReady()]).then(([im]) => draw(im));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })); sp.scale.set(1.5, 1.93, 1); sp.position.set(x, y, z); sp.renderOrder = 12; grp.add(sp);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.42, .62, y - .6, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: new THREE.Color(m.color), transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
      beam.position.set(x, (y - .6) / 2, z); beam.renderOrder = 1; grp.add(beam);
      const ph = (x * 7 + z * 3) % TAU; zx.push((t) => { sp.position.y = y + Math.sin(t * 1.6 + ph) * .14; sp.material.rotation = Math.sin(t * 1.1 + ph) * .05; beam.material.opacity = .17 + .08 * Math.sin(t * 2 + ph); });
      return sp;
    };
    // a painted poster for the game: key art, title, "press E to play", in a dark frame with chasing marquee bulbs
    const bulbOn = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9a8').multiplyScalar(1.6), toneMapped: false }), bulbOff = new THREE.MeshBasicMaterial({ color: '#7a5a2a', toneMapped: false });
    const posterArt = (m, W = 1024, H = 640) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const tex = texOf(c);
      const draw = (img) => { const x = c.getContext('2d'); x.fillStyle = '#162830'; x.fillRect(0, 0, W, H);
        if (img) { const sc = Math.max(W / img.width, H / img.height); x.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc); }
        const g = x.createLinearGradient(0, H * .45, 0, H); g.addColorStop(0, 'rgba(18,10,36,0)'); g.addColorStop(1, 'rgba(18,10,36,.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.textAlign = 'left'; x.textBaseline = 'alphabetic'; fitFont(x, m.title.toUpperCase(), W - 96, 120, TITLE);
        const tg = x.createLinearGradient(0, H - 190, 0, H - 80); tg.addColorStop(0, '#fff6d8'); tg.addColorStop(.55, '#ffd166'); tg.addColorStop(1, '#e0952c');
        x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = '#1c333c'; x.strokeText(m.title.toUpperCase(), 48, H - 96); x.fillStyle = tg; x.fillText(m.title.toUpperCase(), 48, H - 96);
        x.font = `700 34px ${ROUND}`; x.fillStyle = '#fdf3e8'; x.fillText('PLAY WITH THE AGENTS', 52, H - 44);
        x.font = `700 32px ${ROUND}`; const pw = x.measureText('PRESS E TO PLAY').width + 48; x.fillStyle = m.color; x.beginPath(); x.roundRect(W - pw - 40, H - 86, pw, 58, 29); x.fill(); x.fillStyle = '#17282f'; x.textAlign = 'center'; x.fillText('PRESS E TO PLAY', W - 40 - pw / 2, H - 46);
        tex.needsUpdate = true; };
      draw(null); Promise.all([loadImg(ART(m.art)), fontsReady()]).then(([im]) => draw(im));
      return tex;
    };
    const station = (grp, x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; grp.add(g); return g; }; // a local frame for one station
    const toWorldXZ = (x, z, ry, dx, dz) => [x + Math.cos(ry) * dx + Math.sin(ry) * dz, z - Math.sin(ry) * dx + Math.cos(ry) * dz];
    const gamePoster = (grp, zx, x, z, ry, m, { w = 3.2, lift = 1.15 } = {}) => {
      const g = station(grp, x, z, ry), L = new Batch(), h = w * .625, cy = lift + h / 2;
      L.add(G.rbox(w + .34, h + .34, .18, .07), '#cad7de', { p: [0, cy, -.02], kind: 'gloss' });
      [h / 2 + .16, -h / 2 - .16].forEach((dy) => L.add(G.rbox(w + .3, .05, .05, .02), hot('#ffd166', 1.8), { p: [0, cy + dy, .08], kind: 'neon' }));
      [-1, 1].forEach((sd) => { L.add(G.rbox(.05, h + .3, .05, .02), hot('#ffd166', 1.8), { p: [sd * (w / 2 + .16), cy, .08], kind: 'neon' }); L.add(G.rbox(.14, lift + .2, .14, .04), '#cfdbe0', { p: [sd * (w / 2 - .3), (lift + .2) / 2, -.06], kind: 'metal' }); L.add(G.cyl(16), '#cfdbe0', { p: [sd * (w / 2 - .3), .05, -.06], s: [.32, .1, .32], kind: 'metal' }); });
      L.build(g, { shadows: false });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: posterArt(m), toneMapped: false })); art.material.color.setScalar(.96); art.position.set(0, cy, .095); g.add(art); const back = art.clone(); back.position.z = -.115; back.rotation.y = Math.PI; g.add(back); // owner: art on both sides, never a blank grey back
      const pts = [], per = (len, n, f) => { for (let k = 0; k < n; k++) f(-len / 2 + (k + .5) * len / n); };
      per(w + .3, 14, (dx) => { pts.push([dx, cy + h / 2 + .27]); pts.push([dx, cy - h / 2 - .27]); }); per(h + .3, 8, (dy) => { pts.push([-w / 2 - .27, cy + dy]); pts.push([w / 2 + .27, cy + dy]); });
      const bm = pts.map(([px, py], k) => { const b = new THREE.Mesh(G.sphLo(), k % 2 ? bulbOn : bulbOff); b.scale.setScalar(.045); b.position.set(px, py, .1); g.add(b); return b; });
      let lastStep = -1; zx.push((t) => { const st = Math.floor(t * 4); if (st === lastStep) return; lastStep = st; bm.forEach((b, k) => { b.material = (k + st) % 2 ? bulbOn : bulbOff; }); });
      [-1, 1].forEach((sd) => { const [px, pz] = toWorldXZ(x, z, ry, sd * (w / 2 - .3), 0); obstacles.push({ x: px, z: pz, r: .3 }); });
      return g;
    };
    // Auda City: its station stands in the town square (pad, badge and a lit poster), north-east of the plaza
    // Agent Royale stands across the square from it, north-west
    for (const id of ['getaway', 'royale', 'obby', 'roadster']) { const gw = MINIGAMES.find((m) => m.id === id);
      if (gw) { gamePad(group, extras, gw.spot.x, gw.spot.z, gw.color); gameBadge(group, extras, gw.x, 3.6, gw.z, gw); gamePoster(group, extras, gw.x, gw.z, Math.atan2(-gw.x, -gw.z), gw, { w: 2.6 }); } }
    // a big themed arcade cabinet for one minigame: painted side stripes, a lit marquee with the title, an attract-mode
    // screen panning across the key art, a control panel with a joystick and buttons, neon edges
    const marqueeTex = (m) => { const c = document.createElement('canvas'); c.width = 768; c.height = 256; const tex = texOf(c);
      const draw = () => { const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, mixHex(m.color, '#ffffff', .25)); g.addColorStop(1, mixHex(m.color, '#16262d', .45)); x.fillStyle = g; x.fillRect(0, 0, 768, 256);
        x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(i * 80 - 40, 256); x.lineTo(i * 80 + 20, 0); x.lineTo(i * 80 + 50, 0); x.lineTo(i * 80 - 10, 256); x.fill(); }
        x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, m.title.toUpperCase(), 690, 120, TITLE); x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#17282f'; x.strokeText(m.title.toUpperCase(), 384, 136);
        const tg = x.createLinearGradient(0, 70, 0, 200); tg.addColorStop(0, '#ffffff'); tg.addColorStop(.6, '#fff1c4'); tg.addColorStop(1, '#ffd166'); x.fillStyle = tg; x.fillText(m.title.toUpperCase(), 384, 136); tex.needsUpdate = true; };
      draw(); fontsReady().then(draw); return tex; };
    const screenTexs = {}, heroCab = (grp, zx, m) => {
      const g = station(grp, m.x, m.z, m.ry), L = new Batch(), dark = '#182227', side = m.body;
      L.add(G.rbox(1.22, 1.15, 1.0, .07), side, { p: [0, .58, 0], kind: 'gloss' });                         // base
      L.add(G.rbox(1.22, 1.1, .78, .07), side, { p: [0, 1.68, -.11], kind: 'gloss' });                       // screen housing
      L.add(G.rbox(1.3, .5, .96, .08), dark, { p: [0, 2.42, -.02], kind: 'gloss' });                         // marquee hood
      L.add(G.rbox(1.18, .16, .5, .05), dark, { p: [0, 1.16, .34], r: [-.38, 0, 0], kind: 'gloss' });       // control panel
      L.add(G.cyl(12), '#cad7de', { p: [-.26, 1.27, .36], s: [.035, .16, .035], kind: 'metal' }); L.add(G.sph(), '#ff5a6e', { p: [-.26, 1.37, .36], s: .075, kind: 'gloss' }); // joystick
      ['#ffd166', '#3fc7b0', '#ff8fb8'].forEach((bc, k) => L.add(G.cyl(16), hot(bc, 1.6), { p: [.06 + k * .17, 1.235, .31 + (k % 2) * .06], r: [-.38, 0, 0], s: [.055, .04, .055], kind: 'neon' }));
      [-1, 1].forEach((sd) => { L.add(G.rbox(.04, 2.6, .04, .02), hot(m.color, 1.8), { p: [sd * .63, 1.32, .44], kind: 'neon' }); L.add(G.rbox(.02, 1.4, .7, .01), mixHex(m.color, '#ffffff', .2), { p: [sd * .615, 1.0, 0], kind: 'gloss' }); }); // neon edges, side art
      L.add(G.rbox(1.0, .26, .02, .01), hot(m.color, 1.3), { p: [0, .2, .505], kind: 'neon' });              // glowing kick plate
      L.add(G.rbox(.9, .66, .06, .03), '#c2d3dc', { p: [0, 1.76, .26], r: [-.1, 0, 0], kind: 'matte' });    // screen bezel
      L.build(g, { shadows: false });
      const st = screenTexs[m.id] ??= (() => { const t = new THREE.TextureLoader().load(ART(m.art)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(.62, 1); return t; })();
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(.8, .56), new THREE.MeshBasicMaterial({ map: st, toneMapped: false })); scr.position.set(0, 1.77, .3); scr.rotation.x = -.1; g.add(scr);
      const mq = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .4), new THREE.MeshBasicMaterial({ map: marqueeTex(m), toneMapped: false })); mq.position.set(0, 2.42, .47); g.add(mq);
      const ph = m.z; zx.push((t) => { st.offset.x = .19 + Math.sin(t * .18 + ph) * .19; mq.material.color.setScalar(.92 + .08 * Math.sin(t * 3 + ph)); });
      obstacles.push({ x: m.x, z: m.z, r: .78 });
      return g;
    };
    zoneBuild.arcade = (group) => { const B = new Batch(), zx = zoneExtras.arcade = []; archParent = group; archB = B;
    // ---- Neon Arcade: a covered games hall with rows of cabinets, a claw machine, a prize counter
    { const X = -50, o = at(X, 0);
      ground(X, 0, 28, 28, (cx, W, H) => { const n = 14; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { cx.fillStyle = (i + j) % 2 ? '#f6dce8' : '#fbe9f0'; cx.fillRect(i * W / n, j * H / n, W / n, H / n); } cx.strokeStyle = 'rgba(211,148,232,.35)'; cx.lineWidth = 4; cx.strokeRect(20, 20, W - 40, H - 40); });
      const screenTex = canvasTex(256, 256, (cx, W, H) => { const r = rng(9); for (let i = 0; i < 16; i++) { cx.fillStyle = ['#233c46', '#2a4a57', '#14263f', '#28373e'][i % 4]; cx.fillRect((i % 4) * 64, Math.floor(i / 4) * 64, 64, 64); cx.fillStyle = ['#ff8fd0', '#8fe6ff', '#ffe08f', '#b9ff8f'][Math.floor(r() * 4)]; for (let k = 0; k < 6; k++) cx.fillRect((i % 4) * 64 + 8 + r() * 44, Math.floor(i / 4) * 64 + 8 + r() * 44, 6, 6); } });
      const scr = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }); scr.color.setScalar(.95);
      const cab = (x, z, ry, c) => { const p = (dx, y, dz) => [x + Math.sin(ry) * dz + Math.cos(ry) * dx, y, z + Math.cos(ry) * dz - Math.sin(ry) * dx]; B.add(G.rbox(.8, 1.75, .75, .05), c, { p: p(0, .88, 0), r: [0, ry, 0], kind: 'gloss' }); B.add(G.rbox(.84, .05, .8, .02), '#d0dce1', { p: p(0, 1.78, 0), r: [0, ry, 0], kind: 'matte' }); B.add(G.rbox(.82, .04, .03, .015), hot('#e2c09a', 1.4), { p: p(0, 1.7, .39), r: [0, ry, 0], kind: 'neon' }); B.add(G.rbox(.7, .1, .35, .03), '#c9d6dc', { p: p(0, 1.0, .45), r: [-.4, ry, 0], kind: 'matte' }); const m = new THREE.Mesh(new THREE.PlaneGeometry(.6, .5), scr); const [mx, my, mz] = p(0, 1.42, .38); m.position.set(mx, my, mz); m.rotation.set(-.12, ry, 0, 'YXZ'); m.material.map.offset.set(Math.floor(Math.random() * 4) / 4, Math.floor(Math.random() * 4) / 4); group.add(m); obstacles.push({ x, z, r: .6 }); };
      for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) { const x = X - 9 + k * 1.15, z = -8 + row * 5; cab(x, z, 0, ['#375a69', '#344f5b', '#2a3a6e', '#32444c'][(k + row) % 4]); cab(x, z - 1.1, Math.PI, ['#2a3a6e', '#32444c', '#375a69', '#344f5b'][(k + row) % 4]); }
      // the MINIGAMES row near the entrance: a themed cabinet per game with a glowing pad in front and a floating badge
      // above, on a gold-edged carpet, against a dark backdrop wall with a big banner (games/*.js, E to play)
      { const rowGames = MINIGAMES.filter((m) => m.zone === 'arcade' && m.kind === 'mini'), x0 = Math.min(...rowGames.map((m) => m.x)) - 1.8, x1 = Math.max(...rowGames.map((m) => m.x)) + 1.8, xc = (x0 + x1) / 2, wz = rowGames[0].z - 1.25, rz = rowGames[0].z + .9;
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + .4, 4.6), new THREE.MeshStandardMaterial({ roughness: .9, map: canvasTex(Math.round(256 * (x1 - x0 + .4) / 4.6), 256, (cx, W, H) => { cx.fillStyle = '#203842'; cx.fillRect(0, 0, W, H); for (let yy = 0; yy < H + 40; yy += 34) for (let xx = 0; xx < W + 40; xx += 34) { const o2 = (yy / 34) % 2 ? 17 : 0; cx.fillStyle = '#304f5d'; cx.beginPath(); cx.moveTo(xx + o2, yy - 11); cx.lineTo(xx + o2 + 11, yy); cx.lineTo(xx + o2, yy + 11); cx.lineTo(xx + o2 - 11, yy); cx.fill(); cx.fillStyle = 'rgba(240,180,64,.55)'; cx.beginPath(); cx.arc(xx + o2, yy, 2.2, 0, TAU); cx.fill(); } cx.strokeStyle = '#f0b440'; cx.lineWidth = 7; cx.strokeRect(6, 6, W - 12, H - 12); }) }));
        rug.rotation.x = -Math.PI / 2; rug.position.set(xc, .02, rz); rug.receiveShadow = true; group.add(rug);
        B.add(G.rbox(x1 - x0 + .6, 5.2, .3, .08), '#cad7de', { p: [xc, 2.6, wz], kind: 'matte' });                              // backdrop wall
        B.add(G.rbox(x1 - x0 + .6, .06, .06, .02), hot('#ffd166', 1.9), { p: [xc, 5.2, wz + .17], kind: 'neon' });                // gold trim
        B.add(G.rbox(x1 - x0 + .6, .06, .06, .02), hot('#faddbb', 1.6), { p: [xc, .08, wz + .17], kind: 'neon' });
        for (let k = 0; k < 14; k++) B.add(G.rbox(.05, .9, .05, .02), hot(['#ffd166', '#faddbb', '#3fc7b0'][k % 3], 1.5), { p: [x0 + (k + .5) * (x1 - x0) / 14, .5 + (k % 2) * .2, wz + .17], kind: 'neon' });
        const bn = neonSign('MINIGAMES · PLAY WITH THE AGENTS', 8.2, .9, '#ffd166', { glow: .95 }); bn.position.set(xc, 4.65, wz + .2); group.add(bn);
        obstacles.push({ rect: [x0 - .3, wz - .2, x1 + .3, wz + .2] });
        rowGames.forEach((m) => { heroCab(group, zx, m); gamePad(group, zx, m.spot.x, m.spot.z, m.color); gameBadge(group, zx, m.x, 3.45, m.z + .2, m); }); }
      { const cl = MINIGAMES.find((m) => m.id === 'claw'); gamePad(group, zx, cl.spot.x, cl.spot.z, cl.color); gameBadge(group, zx, cl.x, 4.25, cl.z, cl); }
      // claw machine: a glass box of glowing prize balls
      // (the claw machine stands on the west side, clear of the MINIGAMES row)
      const cm = (() => { const c2 = MINIGAMES.find((m) => m.id === 'claw'); return [c2.x, 0, c2.z]; })(); B.add(G.rbox(1.6, .9, 1.6, .06), '#fcecd9', { p: [cm[0], .45, cm[2]], kind: 'gloss' }); B.add(G.rbox(1.6, .25, 1.6, .06), '#fcecd9', { p: [cm[0], 2.6, cm[2]], kind: 'gloss' }); [[-.75, -.75], [.75, -.75], [-.75, .75], [.75, .75]].forEach(([dx, dz]) => B.add(G.rbox(.08, 1.6, .08, .03), '#faddbb', { p: [cm[0] + dx, 1.7, cm[2] + dz], kind: 'metal' }));
      const glassB = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 1.5), new THREE.MeshPhysicalMaterial({ color: '#fbe3c8', transparent: true, opacity: .14, roughness: .05, depthWrite: false })); glassB.position.set(cm[0], 1.7, cm[2]); group.add(glassB);
      for (let i = 0; i < 22; i++) B.add(G.sphLo(), new THREE.Color(['#ff8fd0', '#8fe6ff', '#ffe08f', '#b9ff8f', '#f8d6af'][i % 5]).multiplyScalar(.9), { p: [cm[0] - .55 + (i % 5) * .27, 1.02 + Math.floor(i / 5) * .14, cm[2] - .5 + ((i * 7) % 5) * .25], s: .13, kind: 'neon' });
      const claw = new THREE.Group(); claw.position.set(cm[0], 2.3, cm[2]); group.add(claw); const cw = new THREE.Mesh(G.cyl(8), M.metal); cw.scale.set(.02, .5, .02); cw.position.y = .1; claw.add(cw); [0, 1, 2].forEach((i) => { const f = new THREE.Mesh(G.rbox(.04, .2, .04, .01), M.metal); const a = i / 3 * TAU; f.position.set(Math.sin(a) * .08, -.2, Math.cos(a) * .08); f.rotation.set(Math.cos(a) * .4, 0, -Math.sin(a) * .4); claw.add(f); });
      zx.push((t) => { claw.position.x = cm[0] + Math.sin(t * .7) * .45; claw.position.z = cm[2] + Math.cos(t * .5) * .45; claw.position.y = 2.25 - Math.max(0, Math.sin(t * .9)) * .55; });
      obstacles.push({ x: cm[0], z: cm[2], r: 1.1 });
      sign(group, 'CLAW', 1.2, .35, '#f0c27e', [cm[0], 2.95, cm[2] + .82], 0);
      // prize counter and ticket kiosk
      B.add(G.rbox(4.5, 1.05, .9, .06), '#d0dde1', { p: o(-3, .53, 9), kind: 'matte' }); B.add(G.rbox(4.6, .05, 1.0, .02), hot('#f0c27e', 1.6), { p: o(-3, 1.07, 9), kind: 'neon' });
      for (let i = 0; i < 9; i++) B.add(G.sphLo(), new THREE.Color(['#ffb3d0', '#b3e6ff', '#ffe3a3', '#f9dbb9'][i % 4]), { p: o(-4.9 + i * .48, 1.3, 9.2), s: [.2, .24, .2], kind: 'gloss' });
      sign(group, 'PRIZES', 1.8, .45, '#f0c27e', o(-3, 2.4, 9.42), Math.PI);
      obstacles.push({ rect: [X - 5.4, 8.4, X - .6, 9.6] });
      // a big marquee over the hall and neon floor strips
      sign(group, 'INSERT COIN', 4.2, .9, '#f8d6af', o(-8, 5.2, -15), 0);
      pool(group, X, 0, 22, 22, '#e2c09a', .25);
      B.add(G.rbox(.06, .02, 24, .01), hot('#e2c09a', 1.4), { p: o(-12.5, .03, 0), kind: 'neon' }); B.add(G.rbox(.06, .02, 24, .01), hot('#f8d1a4', 1.4), { p: o(12.5, .03, 0), kind: 'neon' });
    }

      gate(group, -37.2, 0, -Math.PI / 2, '‹ TOWN CENTER', '#f8d6af');
      B.build(group, { shadows: false }); archParent = undefined; archB = undefined;
    };
    zoneBuild.docks = (group) => { const B = new Batch(), zx = zoneExtras.docks = []; archParent = group; archB = B;
    // ---- Harbor Docks (owner: "fix the aesthetics"): one big honey-plank boardwalk out to the quay, a wide pier over a
    // toy-blue bay with the boat race lined up under an inflatable start arch, a bait-and-tackle kiosk, pastel boathouses
    { const X = 50, o = at(X, 0), P = { x0: 56, x1: 68, z0: -3.4, z1: 6.4 }, GD = '#ffd166', NAVY = '#2b3a78';
      // honey boards: one repeating 5.2 x 2.6 m tile of 8 boards with dark seams, staggered joints, grain and nail heads
      const planks = document.createElement('canvas'); planks.width = 1024; planks.height = 512;
      { const x = planks.getContext('2d'), tones = ['#e4b072', '#d9a062', '#ebbb80', '#dea868', '#e7b477'];
        for (let r = 0; r < 8; r++) {
          const y = r * 64, j1 = 30 + Math.random() * 200, j2 = j1 + 200 + Math.random() * 160, j3 = Math.min(990, j2 + 200 + Math.random() * 160), a = tones[(r * 3) % 5], b2 = tones[(r * 3 + 2) % 5], c3 = tones[(r * 3 + 4) % 5];
          [[0, j1, a], [j1, j2, b2], [j2, j3, c3], [j3, 1024, a]].forEach(([u0, u1, c]) => { const g = x.createLinearGradient(0, y, 0, y + 64); g.addColorStop(0, mixHex(c, '#ffffff', .2)); g.addColorStop(.45, c); g.addColorStop(1, mixHex(c, '#7a4a26', .28)); x.fillStyle = g; x.fillRect(u0, y, u1 - u0, 64); });
          x.strokeStyle = 'rgba(122,74,38,.16)'; x.lineWidth = 1.5;
          for (let k = 0; k < 3; k++) { const gy = y + 14 + k * 16 + Math.random() * 6; x.beginPath(); x.moveTo(0, gy); for (let u = 16; u <= 1024; u += 16) x.lineTo(u, gy + Math.sin(u / 1024 * TAU * 5 + r + k) * 2.2); x.stroke(); }
          x.fillStyle = '#7a4a26'; x.fillRect(0, y + 61, 1024, 3); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(0, y, 1024, 2);
          [j1, j2, j3].forEach((u) => { x.fillStyle = '#7a4a26'; x.fillRect(u - 1.5, y, 3, 62); x.fillStyle = 'rgba(70,40,20,.55)'; [u - 8, u + 8].forEach((nx) => [y + 18, y + 44].forEach((ny) => { x.beginPath(); x.arc(nx, ny, 2.2, 0, TAU); x.fill(); })); });
        } }
      const deck = (cx, cz, w, d, across, y) => {
        const t = new THREE.CanvasTexture(planks); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping;
        if (across) { t.center.set(.5, .5); t.rotation = Math.PI / 2; t.repeat.set(d / 5.2, w / 2.6); } else t.repeat.set(w / 5.2, d / 2.6);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: .62, metalness: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz); m.receiveShadow = true; group.add(m); return m; };
      deck(X - 4, 0, 20, 28, false, .014);
      deck((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2, P.x1 - P.x0, P.z1 - P.z0, true, .07);
      // a compass rose inlaid in the boardwalk
      { const c = document.createElement('canvas'); c.width = c.height = 512; const tex = texOf(c), C = 256;
        const draw = () => { const x = c.getContext('2d'); x.clearRect(0, 0, 512, 512);
          const star = (n, R1, R2, rot, a, b2) => { for (let k = 0; k < n; k++) { const t = rot + k * TAU / n; [[a, 1], [b2, -1]].forEach(([col, sd]) => { x.fillStyle = col; x.beginPath(); x.moveTo(C, C); x.lineTo(C + Math.sin(t) * R1, C - Math.cos(t) * R1); x.lineTo(C + Math.sin(t + sd * Math.PI / n) * R2, C - Math.cos(t + sd * Math.PI / n) * R2); x.closePath(); x.fill(); }); } };
          x.fillStyle = NAVY; x.beginPath(); x.arc(C, C, 254, 0, TAU); x.fill(); x.fillStyle = '#f7ecd6'; x.beginPath(); x.arc(C, C, 220, 0, TAU); x.fill();
          x.strokeStyle = GD; x.lineWidth = 6; x.beginPath(); x.arc(C, C, 237, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(43,58,120,.3)'; x.lineWidth = 3; x.beginPath(); x.arc(C, C, 150, 0, TAU); x.stroke();
          for (let k = 0; k < 32; k++) { const t = k * TAU / 32, r0 = k % 4 ? 206 : 194; x.strokeStyle = NAVY; x.lineWidth = k % 4 ? 2 : 4; x.beginPath(); x.moveTo(C + Math.sin(t) * r0, C - Math.cos(t) * r0); x.lineTo(C + Math.sin(t) * 219, C - Math.cos(t) * 219); x.stroke(); }
          star(4, 128, 24, Math.PI / 4, '#8d9be0', '#3b4fa8'); star(4, 192, 32, 0, GD, '#f0a03c');
          x.fillStyle = '#ff6b81'; x.beginPath(); x.arc(C, C, 17, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(C - 5, C - 6, 5, 0, TAU); x.fill();
          x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = GD; fitFont(x, 'N', 40, 30, TITLE); x.fillText('N', C, 20); tex.needsUpdate = true; };
        draw(); fontsReady().then(draw);
        const m = new THREE.Mesh(new THREE.CircleGeometry(2.3, 64), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .5 })); m.rotation.x = -Math.PI / 2; m.position.set(45.6, .02, 1.2); m.receiveShadow = true; group.add(m); }
      // the bay: shallow aqua at the quay deepening to blue, slow swells, glints and a foam line
      const sm = seaMat(); waters.push(sm); const sea = new THREE.Mesh(new THREE.PlaneGeometry(100, 140, 1, 1), sm); sea.rotation.x = -Math.PI / 2; sea.position.set(X + 56, .02, 0); group.add(sea);
      // the quay: a rounded timber edge with a white cap, open where the pier starts
      [[-14, P.z0], [P.z1, 14]].forEach(([z0, z1]) => { const L2 = z1 - z0, zc = (z0 + z1) / 2; B.add(G.rbox(.7, .42, L2, .14), '#b98049', { p: [56.05, .08, zc], kind: 'soft' }); B.add(G.rbox(.76, .08, L2 + .04, .04), '#f6eedf', { p: [56.05, .3, zc], kind: 'soft' }); });
      B.add(G.rbox(.6, .1, P.z1 - P.z0, .04), '#c48a52', { p: [56.05, .05, (P.z0 + P.z1) / 2], kind: 'soft' });
      // piles with white caps, joined by thick cream rope
      const pile = (px, pz, wet = true, h = .95) => { B.add(G.cyl(16), '#a86f3c', { p: [px, h / 2 - .05, pz], s: [.17, h, .17], kind: 'soft' }); B.add(G.sph(), '#fbf6ea', { p: [px, h - .05, pz], s: [.19, .12, .19], kind: 'gloss' }); B.add(G.torus(.17, .03, TAU, 18), NAVY, { p: [px, h * .58, pz], r: [Math.PI / 2, 0, 0], kind: 'soft' }); if (wet) B.add(G.torus(.28, .05, TAU, 20), '#ffffff', { p: [px, .035, pz], r: [Math.PI / 2, 0, 0], kind: 'soft' }); };
      const rope = (ax, az, bx, bz, y = .66, sag = .14) => { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(ax + (bx - ax) * t, y - Math.sin(t * Math.PI) * sag, az + (bz - az) * t)); } B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, .035, 6), '#efe2c4', { kind: 'soft' }); };
      const railing = (pts, wet) => { pts.forEach(([px, pz]) => { pile(px, pz, wet); if (!wet) obstacles.push({ x: px, z: pz, r: .22 }); }); for (let k = 0; k < pts.length - 1; k++) rope(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); };
      railing([[55.72, -13.6], [55.72, -11.5], [55.72, -9.4]], false); railing([[55.72, 7.2], [55.72, 9.35], [55.72, 11.5], [55.72, 13.6]], false);
      // the pier: edge beams, piles in the water, rope rails on the south and east, open on the north for the race start
      [P.z0, P.z1].forEach((z) => B.add(G.rbox(P.x1 - P.x0, .2, .32, .08), '#b98049', { p: [(P.x0 + P.x1) / 2, .05, z], kind: 'soft' }));
      B.add(G.rbox(.32, .2, P.z1 - P.z0 + .32, .08), '#b98049', { p: [P.x1, .05, (P.z0 + P.z1) / 2], kind: 'soft' });
      railing([[56.4, P.z1 + .12], [59.3, P.z1 + .12], [62.2, P.z1 + .12], [65.1, P.z1 + .12], [P.x1 + .12, P.z1 + .12], [P.x1 + .12, 3.95], [P.x1 + .12, 1.5], [P.x1 + .12, -.95], [P.x1 + .12, P.z0 - .12]], true);
      railing([[56.4, P.z0 - .12], [58.6, P.z0 - .12]], true);
      // lamps with round warm globes, and bunting between them along the pier
      const lamp = (lx, lz, h = 2.7) => { B.add(G.cyl(16), '#ffffff', { p: [lx, .14, lz], s: [.17, .24, .17], kind: 'gloss' }); B.add(G.cyl(12), NAVY, { p: [lx, h / 2, lz], s: [.06, h, .06], kind: 'gloss' }); B.add(G.torus(.09, .025, TAU, 16), GD, { p: [lx, h * .62, lz], r: [Math.PI / 2, 0, 0], kind: 'metal' }); B.add(G.sph(), '#fff3c8', { p: [lx, h + .2, lz], s: .22, kind: 'bulb' }); B.add(G.cyl(16), NAVY, { p: [lx, h + .44, lz], s: [.16, .06, .16], kind: 'gloss' }); B.add(G.sph(), NAVY, { p: [lx, h + .5, lz], s: .06, kind: 'gloss' }); };
      const bunting = (ax, az, bx, bz, y, sag) => { const n = Math.max(4, Math.round(Math.hypot(bx - ax, bz - az) / .42)), cols = ['#ff6b81', GD, '#7ad7c4', '#8cc8ff', '#f8d5ad'], pts = [];
        for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector3(ax + (bx - ax) * t, y - Math.sin(t * Math.PI) * sag, az + (bz - az) * t)); }
        B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .012, 4), '#ffffff', { kind: 'soft' });
        for (let k = 1; k < n; k++) { const t = k / n; B.add(G.cone(3), cols[k % 5], { p: [ax + (bx - ax) * t, y - Math.sin(t * Math.PI) * sag - .14, az + (bz - az) * t], s: [.14, .26, .02], r: [Math.PI, 0, 0], kind: 'soft' }); } };
      [56.7, 62.3, 67.7].forEach((lx) => lamp(lx, 6.12)); bunting(56.7, 6.12, 62.3, 6.12, 2.64, .32); bunting(62.3, 6.12, 67.7, 6.12, 2.64, .32);
      // a life ring on a post at the pier mouth, and gulls resting on the piles
      B.add(G.rbox(.12, 1.3, .12, .04), '#ffffff', { p: [57.0, .65, 6.05], kind: 'soft' }); B.add(G.torus(.3, .09, TAU, 28), '#ff6b81', { p: [57.0, 1.02, 6.14], kind: 'gloss' });
      for (let k = 0; k < 4; k++) { const t = k * TAU / 4 + TAU / 8; B.add(G.rbox(.1, .2, .2, .03), '#ffffff', { p: [57.0 + Math.cos(t) * .3, 1.02 + Math.sin(t) * .3, 6.14], r: [0, 0, t], kind: 'gloss' }); }
      const gull = (gx, gy, gz, ry) => { const g = station(group, gx, gz, ry), L = new Batch(); L.add(G.sph(), '#ffffff', { p: [0, gy + .14, 0], s: [.13, .12, .2], kind: 'soft' }); L.add(G.sph(), '#ffffff', { p: [0, gy + .28, -.12], s: .09, kind: 'soft' }); L.add(G.cone(8), '#ffb347', { p: [0, gy + .27, -.24], s: [.035, .09, .035], r: [-Math.PI / 2, 0, 0], kind: 'gloss' });
        [-1, 1].forEach((sd) => { L.add(G.sph(), '#c9cdd8', { p: [sd * .11, gy + .16, .02], s: [.04, .08, .17], kind: 'soft' }); L.add(G.sph(), '#cbdadf', { p: [sd * .05, gy + .31, -.19], s: .018, kind: 'gloss' }); }); L.build(g, { shadows: false }); };
      gull(59.3, .95, P.z1 + .12, 2.2); gull(P.x1 + .12, .95, -.95, -1.1);
      // a few cute things on the boardwalk: planters, benches facing the water, crates and barrels
      const planter = (px, pz, col) => { B.add(G.cyl(20), col, { p: [px, .3, pz], s: [.42, .6, .42], kind: 'gloss' }); B.add(G.torus(.42, .05, TAU, 24), '#ffffff', { p: [px, .6, pz], r: [Math.PI / 2, 0, 0], kind: 'soft' }); B.add(G.sph(), '#6fbf73', { p: [px, .78, pz], s: [.46, .34, .46], kind: 'soft' });
        for (let k = 0; k < 6; k++) { const t = k * TAU / 6; B.add(G.sph(), ['#ff8fb8', GD, '#ffffff'][k % 3], { p: [px + Math.sin(t) * .3, .92 + (k % 2) * .08, pz + Math.cos(t) * .3], s: .08, kind: 'soft' }); } obstacles.push({ x: px, z: pz, r: .5 }); };
      [[38.4, -12.6, '#ff8f8f'], [44.4, -12.8, '#7ad7c4'], [38.4, 12.6, '#8cc8ff'], [44.6, 12.8, '#ffb36b'], [51.2, 12.9, '#f8d5ad']].forEach(([px, pz, c]) => planter(px, pz, c));
      const bench = (bx, bz, ry) => { const g = station(group, bx, bz, ry), L = new Batch(); L.add(G.rbox(1.7, .1, .5, .04), '#e2a868', { p: [0, .48, 0], kind: 'soft' }); L.add(G.rbox(1.7, .38, .08, .04), '#e2a868', { p: [0, .82, -.24], r: [-.12, 0, 0], kind: 'soft' });
        [-.7, .7].forEach((dx) => { L.add(G.rbox(.1, .48, .44, .04), NAVY, { p: [dx, .24, 0], kind: 'gloss' }); L.add(G.rbox(.08, .5, .08, .03), NAVY, { p: [dx, .75, -.24], kind: 'gloss' }); }); L.build(g, { shadows: false }); };
      bench(54.3, 9.6, Math.PI / 2); bench(54.3, 12.4, Math.PI / 2); obstacles.push({ rect: [53.95, 8.7, 54.65, 13.3] });
      const crate = (cx2, y, cz2, s2, c) => { B.add(G.rbox(s2, s2, s2, .05), c, { p: [cx2, y + s2 / 2, cz2], kind: 'soft' }); [-1, 1].forEach((sd) => B.add(G.rbox(s2 + .02, .07, s2 + .02, .02), mixHex(c, '#6b4a2e', .35), { p: [cx2, y + s2 / 2 + sd * s2 * .3, cz2], kind: 'soft' })); };
      const barrel = (bx, bz, c) => { B.add(G.cyl(20), c, { p: [bx, .45, bz], s: [.36, .9, .36], kind: 'gloss' }); [.18, .72].forEach((y) => B.add(G.torus(.365, .035, TAU, 24), '#425259', { p: [bx, y, bz], r: [Math.PI / 2, 0, 0], kind: 'metal' })); B.add(G.cyl(20), mixHex(c, '#ffffff', .3), { p: [bx, .905, bz], s: [.3, .02, .3], kind: 'soft' }); };
      crate(42.2, 0, 8.6, .9, '#e2a868'); crate(43.15, 0, 8.7, .8, '#d89c5e'); crate(42.6, .9, 8.65, .7, '#ebbb80'); barrel(41.2, 9.6, '#7ad7c4'); barrel(41.4, 8.3, '#ff8f8f');
      B.add(G.torus(.32, .1, TAU, 24), '#efe2c4', { p: [43.9, .1, 9.6], r: [Math.PI / 2, 0, 0], kind: 'soft' }); B.add(G.torus(.2, .1, TAU, 20), '#efe2c4', { p: [43.9, .27, 9.6], r: [Math.PI / 2, 0, 0], kind: 'soft' });
      obstacles.push({ rect: [40.7, 7.8, 44.3, 10.1] });
      // pastel boathouses instead of grey sheds: clapboard walls, white trim, glossy gable roofs, round windows with flower
      // boxes, a striped awning over the door (each built facing its local +z, turned to face the boardwalk)
      const boathouse = (cx, cz, w, d, ry, wall, roof, door) => { const g = station(group, cx, cz, ry), L = new Batch(), H = 2.4, a = .52, ta = Math.tan(a), rh = (w / 2) * ta, len = (w / 2 + .32) / Math.cos(a), sy = H + (rh - .32 * ta) / 2 + .09;
        L.add(G.rbox(w, H, d, .08), wall, { p: [0, H / 2, 0], kind: 'soft' });
        for (let k = 1; k < 6; k++) L.add(G.rbox(w - .06, .035, .03, .01), mixHex(wall, '#685b4c', .16), { p: [0, k * .4, d / 2 + .01], kind: 'soft' });
        L.add(G.rbox(w + .1, .22, d + .1, .05), '#ffffff', { p: [0, .11, 0], kind: 'soft' });
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => L.add(G.rbox(.13, H, .13, .04), '#ffffff', { p: [sx * (w / 2 - .02), H / 2, sz * (d / 2 - .02)], kind: 'soft' })));
        L.add(G.cyl(3), wall, { p: [0, H + rh / 3, 0], s: [(w / 2) / .866, d - .02, rh / 1.5], r: [-Math.PI / 2, 0, 0], kind: 'soft' });
        [-1, 1].forEach((sd) => { L.add(G.rbox(len, .16, d + .5, .06), roof, { p: [sd * (w / 4 + .16), sy, 0], r: [0, 0, -sd * a], kind: 'gloss' }); L.add(G.rbox(len, .12, .06, .03), '#ffffff', { p: [sd * (w / 4 + .16), sy, d / 2 + .27], r: [0, 0, -sd * a], kind: 'soft' }); });
        L.add(G.cyl(12), '#ffffff', { p: [0, H + rh + .1, 0], s: [.1, d + .5, .1], r: [Math.PI / 2, 0, 0], kind: 'gloss' });
        L.add(G.rbox(1.0, 1.75, .1, .08), door, { p: [0, .9, d / 2 + .03], kind: 'gloss' }); L.add(G.cyl(20), '#bfe9ff', { p: [0, 1.35, d / 2 + .09], s: [.2, .02, .2], r: [Math.PI / 2, 0, 0], kind: 'gloss' }); L.add(G.sph(), GD, { p: [.34, .85, d / 2 + .1], s: .05, kind: 'metal' });
        for (let k = 0; k < 6; k++) L.add(G.rbox(.24, .05, .62, .02), k % 2 ? '#ffffff' : roof, { p: [-.6 + k * .24, 2.02, d / 2 + .3], r: [.42, 0, 0], kind: 'soft' });
        for (let k = 0; k < 6; k++) L.add(G.sph(), k % 2 ? '#ffffff' : roof, { p: [-.6 + k * .24, 1.86, d / 2 + .58], s: [.12, .07, .05], kind: 'soft' });
        if (w >= 4.2) [-1, 1].forEach((sd) => { const wx = sd * (w / 2 - 1.0);
          L.add(G.torus(.34, .07, TAU, 28), '#ffffff', { p: [wx, 1.45, d / 2 + .04], kind: 'gloss' }); L.add(G.cyl(24), '#ffe6b0', { p: [wx, 1.45, d / 2 + .03], s: [.3, .02, .3], r: [Math.PI / 2, 0, 0], kind: 'bulb' });
          L.add(G.rbox(.04, .58, .02, .01), '#ffffff', { p: [wx, 1.45, d / 2 + .06], kind: 'soft' }); L.add(G.rbox(.58, .04, .02, .01), '#ffffff', { p: [wx, 1.45, d / 2 + .06], kind: 'soft' });
          L.add(G.rbox(.86, .18, .26, .05), '#ffffff', { p: [wx, .98, d / 2 + .14], kind: 'soft' }); L.add(G.sph(), '#6fbf73', { p: [wx, 1.08, d / 2 + .15], s: [.42, .07, .1], kind: 'soft' });
          for (let q = 0; q < 5; q++) L.add(G.sph(), ['#ff8fb8', GD, '#ffffff', '#ff6b81', '#f8d5ad'][q], { p: [wx - .3 + q * .15, 1.12, d / 2 + .15], s: .085, kind: 'soft' }); });
        L.build(g, { shadows: false }); };
      boathouse(40.6, -16.7, 7.0, 4.2, 0, '#bfe6d6', '#ff8f8f', '#f7a8b8'); boathouse(48.2, -16.7, 6.2, 4.2, 0, '#f9d9b0', '#5b8de0', '#7ad7c4'); boathouse(55.0, -16.7, 5.4, 4.2, 0, '#fbe7d0', '#ffb347', '#ffffff');
      boathouse(40.6, 16.7, 7.0, 4.2, Math.PI, '#f9d9b0', '#6cc4a4', '#ff8fb8'); boathouse(48.2, 16.7, 6.2, 4.2, Math.PI, '#cfe8ff', '#ff8f8f', GD); boathouse(55.0, 16.7, 5.4, 4.2, Math.PI, '#fff0b8', '#e7b985', '#7ad7c4');
      boathouse(34.0, -9, 6, 3.6, Math.PI / 2, '#fbe7d0', '#ff8f8f', '#ffffff'); boathouse(34.0, 9, 6, 3.6, Math.PI / 2, '#bfe6d6', '#5b8de0', '#ff8fb8');
      // moored boats: hull, cabin, a light; they bob on the swell
      const boats = [];
      [[22.5, 1.5, '#fbf6ea', '#7ad7c4', .2], [16, 10.5, '#fbf6ea', '#ff8fb8', -.25], [23.5, 8.5, '#fbf6ea', '#8cc8ff', .35]].forEach(([dx, dz, hull, cabin, ry], i) => {
        const bg = new THREE.Group(), bb = new Batch();
        { const sh = new THREE.Shape(), w = 1.6, l = 4.0, bow = 1.4; sh.moveTo(-w / 2, -l / 2 + .4); sh.quadraticCurveTo(-w / 2, -l / 2, 0, -l / 2); sh.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + .4); sh.lineTo(w / 2, l / 2 - bow); sh.quadraticCurveTo(w / 2, l / 2 - bow * .2, 0, l / 2); sh.quadraticCurveTo(-w / 2, l / 2 - bow * .2, -w / 2, l / 2 - bow); sh.closePath();
          const hg = new THREE.ExtrudeGeometry(sh, { depth: .6, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2, curveSegments: 14 }); hg.rotateX(-Math.PI / 2); const hm = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: hull, roughness: .4 })); hm.position.y = -.25; bg.add(hm);
          const dk = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#e2b47c', roughness: .8 })); dk.rotation.x = -Math.PI / 2; dk.scale.setScalar(.9); dk.position.y = .41; bg.add(dk); }
        bb.add(G.rbox(1.0, .6, 1.3, .14), cabin, { p: [0, .72, -.5], kind: 'gloss' }); bb.add(G.rbox(1.06, .06, 1.36, .03), '#ffffff', { p: [0, 1.04, -.5] }); bb.add(G.rbox(1.0, .25, .05, .02), new THREE.Color('#ffe0a8').multiplyScalar(1.2), { p: [0, .78, .31], kind: 'neon' }); bb.add(G.cyl(8), '#ffffff', { p: [0, 1.6, -.4], s: [.04, 1.6, .04], kind: 'gloss' }); bb.add(G.sph(), new THREE.Color(i % 2 ? '#ff6a7a' : '#7affb0').multiplyScalar(1.4), { p: [0, 2.45, -.4], s: .08, kind: 'neon' }); bb.add(G.torus(.85, .05, TAU, 32), '#ffffff', { p: [0, .06, 0], s: [1, 2.2, 1], r: [Math.PI / 2, 0, 0], kind: 'soft' }); bb.build(bg, { shadows: false });
        bg.position.set(X + dx, 0, dz); bg.rotation.y = ry; group.add(bg); boats.push({ g: bg, ph: i * 1.7 });
      });
      zx.push((t) => boats.forEach((b) => { b.g.position.y = Math.sin(t * 1.1 + b.ph) * .08 - .05; b.g.rotation.z = Math.sin(t * .9 + b.ph) * .04; b.g.rotation.x = Math.sin(t * .7 + b.ph) * .03; }));
      // the lighthouse on its rock, its beam sweeping the bay
      const LH = o(22.5, 0, 13.5); B.add(G.sph(), '#c6bcb0', { p: [LH[0], -.1, LH[2]], s: [2.3, .9, 2.3], kind: 'soft' }); B.add(G.torus(2.3, .12, TAU, 40), '#ffffff', { p: [LH[0], .04, LH[2]], r: [Math.PI / 2, 0, 0], kind: 'soft' });
      for (let i = 0; i < 6; i++) B.add(G.cyl(20), i % 2 ? '#fbf6ea' : '#ff7a8a', { p: [LH[0], 1.0 + i * 1.1, LH[2]], s: [.75 - i * .05, 1.1, .75 - i * .05], kind: 'gloss' });
      B.add(G.cyl(20), '#ffffff', { p: [LH[0], 7.55, LH[2]], s: [.62, .1, .62], kind: 'gloss' }); B.add(G.cyl(16), new THREE.Color('#fff2c8').multiplyScalar(1.5), { p: [LH[0], 8.0, LH[2]], s: [.45, .7, .45], kind: 'neon' }); B.add(G.cone(16), '#3b4fa8', { p: [LH[0], 8.7, LH[2]], s: [.6, .6, .6], kind: 'gloss' }); B.add(G.sph(), GD, { p: [LH[0], 9.05, LH[2]], s: .09, kind: 'metal' });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
      beam.geometry.translate(0, -11, 0); beam.geometry.rotateZ(Math.PI / 2); const pivotB = new THREE.Group(); pivotB.position.set(LH[0], 8.0, LH[2]); pivotB.add(beam); group.add(pivotB);
      zx.push((t) => { pivotB.rotation.y = t * .6; });
      { // a proper white ferry out in the bay: shaped hull (pointed bow, rounded stern) sitting in the water, a dark
        // waterline, a deck with railings, two cabin tiers with a row of windows, a bridge, a funnel, lifeboats, a flag
        const fg = new THREE.Group(), L = 7.2, Wd = 2.6;
        const outline = (w, l, bow) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, -l / 2 + .6); sh.quadraticCurveTo(-w / 2, -l / 2, 0, -l / 2); sh.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + .6); sh.lineTo(w / 2, l / 2 - bow); sh.quadraticCurveTo(w / 2, l / 2 - bow * .25, 0, l / 2); sh.quadraticCurveTo(-w / 2, l / 2 - bow * .25, -w / 2, l / 2 - bow); sh.closePath(); return sh; };
        const slab = (w, l, bow, h, y, color, mat = {}) => { const g = new THREE.ExtrudeGeometry(outline(w, l, bow), { depth: h, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 3, curveSegments: 18 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: .45, ...mat })); m.position.y = y; fg.add(m); return m; };
        slab(Wd * .86, L * .96, 2.0, .5, -.55, '#36535f');
        slab(Wd, L, 2.2, .95, -.1, '#fbf9f6');
        slab(Wd + .04, L + .04, 2.22, .12, -.1, '#c79863');
        slab(Wd - .12, L - .12, 2.1, .08, .86, '#c9b6a0', { roughness: .8 });
        const fb = new Batch();
        // railings along the deck
        for (let i = 0; i < 9; i++) { const z = -L / 2 + .7 + i * .62; if (z > L / 2 - 1.6) break; [-1, 1].forEach((sd) => fb.add(G.cyl(6), '#ffffff', { p: [sd * (Wd / 2 - .12), 1.12, z], s: [.025, .45, .025], kind: 'metal' })); }
        [-1, 1].forEach((sd) => fb.add(G.rbox(.04, .04, L - 2.2, .02), '#ffffff', { p: [sd * (Wd / 2 - .12), 1.34, -.45], kind: 'metal' }));
        // two cabin tiers with windows, the bridge on top
        fb.add(G.rbox(Wd - .7, .95, 3.6, .14), '#ffffff', { p: [0, 1.42, -.7], kind: 'gloss' });
        fb.add(G.rbox(Wd - 1.0, .8, 2.4, .12), '#ffffff', { p: [0, 2.28, -.95], kind: 'gloss' });
        fb.add(G.rbox(Wd - 1.25, .55, 1.1, .1), '#ffffff', { p: [0, 2.95, -.3], kind: 'gloss' });
        for (let i = 0; i < 6; i++) [-1, 1].forEach((sd) => fb.add(G.rbox(.03, .32, .36, .02), '#7fc4f0', { p: [sd * ((Wd - .7) / 2 + .005), 1.5, -2.25 + i * .58], kind: 'gloss' }));
        for (let i = 0; i < 4; i++) [-1, 1].forEach((sd) => fb.add(G.rbox(.03, .28, .36, .02), '#7fc4f0', { p: [sd * ((Wd - 1.0) / 2 + .005), 2.32, -1.95 + i * .62], kind: 'gloss' }));
        fb.add(G.rbox(Wd - 1.3, .26, .03, .02), '#3c4a8a', { p: [0, 3.0, .26], kind: 'gloss' });
        fb.add(G.rbox(Wd - .6, .06, 3.7, .03), '#c79863', { p: [0, 1.92, -.7] }); fb.add(G.rbox(Wd - .9, .06, 2.5, .03), '#c79863', { p: [0, 2.7, -.95] });
        // funnel, lifeboats, mast and flag
        fb.add(G.cyl(16), '#c79863', { p: [0, 3.25, -1.75], s: [.32, .9, .32], kind: 'gloss' }); fb.add(G.cyl(16), '#cbdadf', { p: [0, 3.72, -1.75], s: [.3, .06, .3] });
        [-1, 1].forEach((sd) => { fb.add(G.cap(.16, .9), '#ff8a3d', { p: [sd * (Wd / 2 - .25), 2.05, -2.4], r: [Math.PI / 2, 0, 0], kind: 'gloss' }); fb.add(G.cap(.16, .9), '#ff8a3d', { p: [sd * (Wd / 2 - .25), 2.05, .2], r: [Math.PI / 2, 0, 0], kind: 'gloss' }); });
        fb.add(G.cyl(6), '#ffffff', { p: [0, 3.9, .1], s: [.03, 1.3, .03], kind: 'metal' }); fb.add(G.rbox(.02, .28, .45, .01), '#ff6fa8', { p: [0, 4.35, -.12] });
        fb.add(G.sph(), '#ffe2a8', { p: [0, 1.2, L / 2 - .5], s: .08, kind: 'neon' });
        fb.build(fg, { shadows: false });
        fg.scale.setScalar(1.55); fg.position.set(X + 30, 0, -13); fg.rotation.y = -.35; group.add(fg);
        zx.push((t) => { fg.position.y = Math.sin(t * .9) * .05; fg.rotation.z = Math.sin(t * .7) * .02; fg.rotation.x = Math.sin(t * .55) * .012; });
      }
      // ---- the docks games: a bait-and-tackle fishing kiosk on the quay, and the boat race start off the pier, each with
      // a glowing pad, a floating badge and a lit poster facing the camera
      { const fish = MINIGAMES.find((m) => m.id === 'fishing'), g = station(group, fish.x, fish.z, fish.ry), L = new Batch();
        L.add(G.rbox(2.6, 1.0, .9, .06), '#7a4e2e', { p: [0, .5, 0], kind: 'matte' });
        for (let k = 0; k < 6; k++) L.add(G.rbox(2.62, .025, .92, .01), '#e9dacf', { p: [0, .12 + k * .16, 0], kind: 'matte' });
        L.add(G.rbox(2.72, .09, 1.0, .03), '#c99a62', { p: [0, 1.04, 0], kind: 'matte' });
        L.add(G.rbox(2.3, .3, .03, .02), '#3fb0e0', { p: [0, .64, .46], kind: 'gloss' });
        [-1.24, 1.24].forEach((dx) => { L.add(G.rbox(.1, 2.5, .1, .03), '#efe6d6', { p: [dx, 1.25, -.4], kind: 'matte' }); L.add(G.rbox(.1, 2.15, .1, .03), '#efe6d6', { p: [dx, 1.07, .42], kind: 'matte' }); });
        for (let k = 0; k < 9; k++) L.add(G.rbox(.3, .06, 1.25, .02), k % 2 ? '#ffffff' : '#3fb0e0', { p: [-1.2 + k * .3, 2.36, .12], r: [.32, 0, 0], kind: 'soft' });
        for (let k = 0; k < 9; k++) L.add(G.sph(), k % 2 ? '#ffffff' : '#3fb0e0', { p: [-1.2 + k * .3, 2.15, .72], s: [.15, .08, .06], kind: 'soft' });
        L.add(G.rbox(2.6, 1.3, .08, .03), '#2f6f8f', { p: [0, 1.72, -.44], kind: 'matte' });
        [-.95, -.6, -.25].forEach((dx, k) => { L.add(G.cyl(8), '#c99a62', { p: [dx, 1.8, -.36], s: [.02, 1.45, .02], r: [0, 0, .12 - k * .06], kind: 'matte' }); L.add(G.cyl(12), '#cfd9e0', { p: [dx + .02, 1.28, -.31], s: [.06, .05, .06], r: [Math.PI / 2, 0, 0], kind: 'metal' }); });
        [[.35, '#5b7fa8'], [.85, '#e07a5a']].forEach(([dx, c]) => { L.add(G.cyl(16), c, { p: [dx, 1.22, .12], s: [.17, .26, .17], kind: 'gloss' }); L.add(G.cyl(16), '#59c8f0', { p: [dx, 1.345, .12], s: [.15, .02, .15], kind: 'gloss' }); });
        for (let k = 0; k < 4; k++) L.add(G.sph(), ['#ffd166', '#ff8fb8', '#8fd6ff', '#ffd166'][k], { p: [.3 + k * .17, 1.39, .12 + (k % 2) * .05], s: [.06, .035, .03], r: [0, k, .4], kind: 'gloss' });
        L.add(G.rbox(.7, .45, .45, .08), '#e8eef5', { p: [-1.95, .23, .35], kind: 'gloss' }); L.add(G.rbox(.72, .1, .47, .04), '#3fb0e0', { p: [-1.95, .5, .35], kind: 'gloss' });
        [-1.24, 1.24].forEach((dx) => { L.add(G.cyl(8), '#ced9e0', { p: [dx, 2.0, .62], s: [.012, .2, .012] }); L.add(G.sph(), new THREE.Color('#ffd98a').multiplyScalar(1.5), { p: [dx, 1.86, .62], s: [.1, .13, .1], kind: 'neon' }); });
        L.build(g, { shadows: false });
        const sg = neonSign('BAIT & TACKLE', 2.0, .44, '#3fb0e0', { glow: .95 }); sg.position.set(0, 2.78, .48); g.add(sg);
        const [cxw, czw] = toWorldXZ(fish.x, fish.z, fish.ry, -1.95, .35); obstacles.push({ rect: [fish.x - 1.45, fish.z - .55, fish.x + 1.45, fish.z + .55] }, { x: cxw, z: czw, r: .45 });
        [-1.25, 1.25].forEach((dz) => { const z = fish.z + dz;
          B.add(G.cyl(8), '#d3dce3', { p: [55.85, .32, z], s: [.05, .5, .05], kind: 'metal' }); B.add(G.cyl(8), '#c99a62', { p: [56.15, .95, z], s: [.018, 1.5, .018], r: [0, 0, -.72], kind: 'matte' });
          B.add(G.cyl(6), '#f0f0f0', { p: [56.64, .78, z], s: [.004, 1.45, .004] }); B.add(G.sph(), '#ff5a6e', { p: [56.64, .07, z], s: .06, kind: 'gloss' }); B.add(G.sph(), '#ffffff', { p: [56.64, .12, z], s: .045, kind: 'gloss' }); });
        gamePad(group, zx, fish.spot.x, fish.spot.z, fish.color); gameBadge(group, zx, fish.x, 3.9, fish.z - .1, fish);
        gamePoster(group, zx, 49.4, -9.9, 0, fish, { w: 3.0 }); }
      { const race = MINIGAMES.find((m) => m.id === 'boatrace'), g = station(group, race.x, race.z, race.ry), L = new Batch(), PK = '#ff8fb8';
        // the inflatable start arch, standing on two floats: pink pillars with gold rings, a puffy navy banner, pennants
        [-2.6, 2.6].forEach((dx) => { L.add(G.torus(.55, .2, TAU, 28), '#ffffff', { p: [dx, .1, 0], r: [Math.PI / 2, 0, 0], kind: 'gloss' }); L.add(G.cap(.42, 2.6), PK, { p: [dx, 1.75, 0], kind: 'gloss' });
          [.75, 1.75, 2.8].forEach((y) => L.add(G.torus(.43, .09, TAU, 28), GD, { p: [dx, y, 0], r: [Math.PI / 2, 0, 0], kind: 'gloss' })); L.add(G.sph(), '#ffffff', { p: [dx, 3.62, 0], s: .26, kind: 'gloss' }); });
        L.add(G.cap(.4, 4.5), NAVY, { p: [0, 3.3, 0], r: [0, 0, Math.PI / 2], kind: 'gloss' });
        const sp = []; for (let k = 0; k <= 10; k++) { const t = k / 10; sp.push(new THREE.Vector3(-2.3 + 4.6 * t, 2.82 - Math.sin(t * Math.PI) * .2, .1)); } L.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 16, .014, 4), '#ffffff', { kind: 'soft' });
        for (let k = 1; k < 11; k++) { const t = k / 11; L.add(G.cone(3), ['#ff6b81', GD, '#7ad7c4', '#8cc8ff', '#f8d5ad'][k % 5], { p: [-2.3 + 4.6 * t, 2.82 - Math.sin(t * Math.PI) * .2 - .15, .1], s: [.15, .28, .02], r: [Math.PI, 0, 0], kind: 'soft' }); }
        L.add(G.rbox(.28, .66, .16, .06), NAVY, { p: [-2.6, 2.28, .5], kind: 'gloss' });
        L.build(g, { shadows: false });
        // the start lights on the left pillar: red, amber, then green, over and over
        const tl = ['#ff5a6e', '#ffc94a', '#4dff9a'].map((c, k) => { const m = new THREE.Mesh(G.sph(), new THREE.MeshBasicMaterial({ color: '#3a494f', toneMapped: false })); m.scale.setScalar(.075); m.position.set(-2.6, 2.48 - k * .2, .6); g.add(m); return { m, on: new THREE.Color(c).multiplyScalar(1.4), off: new THREE.Color('#3a494f') }; });
        zx.push((t) => { const ph = Math.floor(t * 1.2) % 4, lit = ph < 2 ? ph : 2; tl.forEach((l, k) => l.m.material.color.copy(k === lit ? l.on : l.off)); });
        const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 192; const bt = texOf(bc);
        const drawBanner = () => { const x = bc.getContext('2d'); x.clearRect(0, 0, 1024, 192);
          x.save(); x.beginPath(); x.roundRect(4, 4, 1016, 184, 92); x.clip(); const bg = x.createLinearGradient(0, 0, 0, 192); bg.addColorStop(0, '#4257b8'); bg.addColorStop(1, '#25317a'); x.fillStyle = bg; x.fillRect(0, 0, 1024, 192);
          for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { x.fillStyle = (r + q) % 2 ? '#ffffff' : '#212a2e'; x.fillRect(q * 48, r * 48, 48, 48); x.fillRect(1024 - 192 + q * 48, r * 48, 48, 48); }
          x.restore(); x.lineWidth = 8; x.strokeStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, 1016, 184, 92); x.stroke();
          x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, 'BOAT RACE', 560, 118, TITLE); x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#141a4a'; x.strokeText('BOAT RACE', 512, 102);
          const tg = x.createLinearGradient(0, 50, 0, 150); tg.addColorStop(0, '#fff8de'); tg.addColorStop(.55, GD); tg.addColorStop(1, '#f0a03c'); x.fillStyle = tg; x.fillText('BOAT RACE', 512, 102); bt.needsUpdate = true; };
        drawBanner(); fontsReady().then(drawBanner);
        [.42, -.42].forEach((dz, k) => { const bm = new THREE.Mesh(new THREE.PlaneGeometry(4.3, .8), new THREE.MeshBasicMaterial({ map: bt, transparent: true, toneMapped: false })); bm.position.set(0, 3.3, dz); if (k) bm.rotation.y = Math.PI; g.add(bm); });
        // four toy racers lined up behind the arch, bows to the open water, bobbing
        const hullSh = (w, l, bow) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, -l / 2 + .25); sh.quadraticCurveTo(-w / 2, -l / 2, 0, -l / 2); sh.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + .25); sh.lineTo(w / 2, l / 2 - bow); sh.quadraticCurveTo(w / 2, l / 2 - bow * .15, 0, l / 2); sh.quadraticCurveTo(-w / 2, l / 2 - bow * .15, -w / 2, l / 2 - bow); sh.closePath(); return sh; };
        const racers = [['#ff8fb8', -1.68], ['#7ad7c4', -.56], ['#8cc8ff', .56], ['#ffb36b', 1.68]].map(([col, bx], i) => { const bg = new THREE.Group(), L2 = new Batch();
          const hull = new THREE.ExtrudeGeometry(hullSh(.8, 1.9, .75), { depth: .3, bevelEnabled: true, bevelThickness: .1, bevelSize: .08, bevelSegments: 4, curveSegments: 18 }); hull.rotateX(-Math.PI / 2); L2.add(hull, col, { p: [0, -.12, 0], kind: 'gloss' });
          const band = new THREE.ExtrudeGeometry(hullSh(.96, 2.06, .8), { depth: .07, bevelEnabled: true, bevelThickness: .02, bevelSize: .03, bevelSegments: 2, curveSegments: 18 }); band.rotateX(-Math.PI / 2); L2.add(band, '#ffffff', { p: [0, .08, 0], kind: 'gloss' });
          const top = new THREE.ShapeGeometry(hullSh(.78, 1.86, .72), 18); top.rotateX(-Math.PI / 2); L2.add(top, mixHex(col, '#ffffff', .55), { p: [0, .29, 0], kind: 'soft' });
          L2.add(G.cyl(24), '#d1dfe5', { p: [0, .3, .18], s: [.25, .06, .3], kind: 'soft' }); L2.add(G.rbox(.42, .2, .22, .08), '#ffffff', { p: [0, .35, .34], kind: 'soft' });
          L2.add(G.rbox(.62, .2, .04, .03), '#8fd3ff', { p: [0, .43, -.22], r: [-.6, 0, 0], kind: 'gloss' });
          L2.add(G.rbox(.24, .2, .16, .06), NAVY, { p: [0, .34, 1.0], kind: 'gloss' }); L2.add(G.cyl(10), NAVY, { p: [0, .12, 1.06], s: [.04, .22, .04], kind: 'gloss' });
          L2.add(G.sph(), '#ffffff', { p: [0, .3, -.92], s: .07, kind: 'gloss' });
          L2.add(G.cyl(6), '#ffffff', { p: [.27, .62, .55], s: [.012, .6, .012], kind: 'soft' }); L2.add(G.cone(3), GD, { p: [.37, .82, .55], s: [.12, .2, .015], r: [0, 0, -Math.PI / 2], kind: 'soft' });
          L2.add(G.torus(.62, .045, TAU, 28), '#ffffff', { p: [0, .04, 0], s: [1, 1.9, 1], r: [Math.PI / 2, 0, 0], kind: 'soft' });
          L2.build(bg, { shadows: false }); bg.position.set(bx, 0, -1.9); g.add(bg); return { g: bg, ph: i * 1.3 }; });
        zx.push((t) => racers.forEach((b) => { b.g.position.y = Math.sin(t * 1.6 + b.ph) * .04; b.g.rotation.z = Math.sin(t * 1.3 + b.ph) * .05; b.g.rotation.x = Math.sin(t * 1.1 + b.ph) * .03; }));
        // the course: buoy gates out into the bay
        [-4.2, -7.8, -11.4, -15].forEach((dz, i) => [-1, 1].forEach((sd) => { const bx = race.x + sd * 2.5, bz = race.z + dz;
          B.add(G.sph(), i % 2 ? GD : '#ff6b81', { p: [bx, .14, bz], s: [.24, .28, .24], kind: 'gloss' }); B.add(G.cyl(16), '#ffffff', { p: [bx, .2, bz], s: [.245, .07, .245], kind: 'gloss' }); B.add(G.torus(.32, .04, TAU, 20), '#ffffff', { p: [bx, .03, bz], r: [Math.PI / 2, 0, 0], kind: 'soft' }); }));
        gamePad(group, zx, race.spot.x, race.spot.z, race.color, 1.9); gameBadge(group, zx, race.x, 5.25, race.z, race);
        gamePoster(group, zx, 66.4, -3.0, 0, race, { w: 2.5 }); }
    }

      gate(group, 37.2, 0, Math.PI / 2, '‹ TOWN CENTER', '#f8d6af');
      B.build(group, { shadows: false }); archParent = undefined; archB = undefined;
    };
    zoneBuild.park = (group) => { const B = new Batch(), zx = zoneExtras.park = []; archParent = group; archB = B;
    // ---- Sakura Park (owner: "looks shit, lighting is terrible"): a sunny garden. Lush grass with clover and petals, a
    // pale stepping-stone path through a red torii, big glossy cherry trees, a clear blue wishing pond ringed with round
    // stones, a vermilion pavilion, light stone lanterns, flower bushes, benches and drifting petals
    { const Z = 50, o = (dx, y, dz) => [dx, y, Z + dz], RED = '#e8574f', GOLD = '#ffd166';
      ground(0, Z, 30, 28, (cx, W, H) => {
        const g = cx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#9bd96f'); g.addColorStop(.5, '#8fd166'); g.addColorStop(1, '#a3dc78'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
        for (let i = 0; i < 2600; i++) { const x = Math.random() * W, y = Math.random() * H; cx.fillStyle = ['rgba(120,190,80,.55)', 'rgba(170,225,120,.5)', 'rgba(95,170,70,.45)'][i % 3]; cx.beginPath(); cx.ellipse(x, y, 2.2, 5, Math.random() - .5, 0, TAU); cx.fill(); }
        for (let i = 0; i < 160; i++) { const x = Math.random() * W, y = Math.random() * H; cx.fillStyle = ['#ffffff', '#ffd6e6', '#fff2a8'][i % 3]; for (let k = 0; k < 5; k++) { cx.beginPath(); cx.arc(x + Math.cos(k * 1.26) * 2.4, y + Math.sin(k * 1.26) * 2.4, 1.8, 0, TAU); cx.fill(); } cx.fillStyle = '#ffcf4a'; cx.beginPath(); cx.arc(x, y, 1.3, 0, TAU); cx.fill(); }
        const path = () => { cx.beginPath(); cx.moveTo(W / 2, 0); cx.bezierCurveTo(W * .2, H * .35, W * .8, H * .55, W / 2, H); };
        cx.lineCap = 'round'; path(); cx.strokeStyle = '#d9c9a8'; cx.lineWidth = 50; cx.stroke(); path(); cx.strokeStyle = '#f3e8d2'; cx.lineWidth = 40; cx.stroke();
        cx.setLineDash([1, 15]); cx.lineDashOffset = 0; path(); cx.strokeStyle = 'rgba(190,170,140,.55)'; cx.lineWidth = 34; cx.stroke(); cx.setLineDash([]);
        for (const [tx, ty, r] of [[.16, .2, 46], [.82, .22, 42], [.2, .62, 40], [.84, .55, 44], [.3, .9, 38], [.74, .92, 36]]) { for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, d = Math.random() * r; cx.fillStyle = ['#ffc0d6', '#ffd6e4', '#f7a8c6'][i % 3]; cx.beginPath(); cx.ellipse(tx * W + Math.cos(a) * d, ty * H + Math.sin(a) * d, 3, 2, a, 0, TAU); cx.fill(); } }
      });
      // cherry trees: warm trunks, two forked limbs, a big crown of glossy pink puffs
      const blossom = ['#ffb7d2', '#ff9fc2', '#ffc9dd', '#f6a6d0', '#ffd3e3'];
      const sakura = (x, z, sc) => { B.add(G.trunk(), '#8a5a48', { p: [x, .9 * sc, z], s: [.22 * sc, 1.8 * sc, .22 * sc], kind: 'soft' });
        [-1, 1].forEach((sd) => B.add(G.trunk(), '#8a5a48', { p: [x + sd * .32 * sc, 1.95 * sc, z], s: [.1 * sc, .9 * sc, .1 * sc], r: [0, 0, -sd * .55], kind: 'soft' }));
        for (let k = 0; k < 9; k++) { const a = k / 8 * TAU, r = (k ? .95 : 0) * sc; B.add(G.sphLo(), blossom[k % 5], { p: [x + Math.sin(a) * r, (2.55 + (k ? (k % 2) * .25 : .55)) * sc, z + Math.cos(a) * r * .85], s: (k ? .66 : .9) * sc, kind: 'gloss' }); }
        obstacles.push({ x, z, r: .5 * sc }); };
      [[-10, -8], [-11, 2], [-8, 9], [10, -9], [11, 0], [11, 8], [-6, 11.5], [7, -12], [-10.5, -12], [-13, -3], [13, 4.5], [2.5, 12]].forEach(([dx, dz], i) => sakura(dx, Z + dz, .95 + (i % 3) * .18));
      // round flower bushes along the edges
      const bush = (x, z, s2, fl) => { B.add(G.sphLo(), '#5fb85a', { p: [x, .45 * s2, z], s: [.8 * s2, .6 * s2, .8 * s2], kind: 'soft' }); B.add(G.sphLo(), '#74c96a', { p: [x + .3 * s2, .55 * s2, z - .2 * s2], s: .5 * s2, kind: 'soft' });
        for (let k = 0; k < 7; k++) { const a = k * .9; B.add(G.sph(), fl, { p: [x + Math.sin(a) * .62 * s2, (.55 + (k % 3) * .14) * s2, z + Math.cos(a) * .55 * s2], s: .09 * s2, kind: 'soft' }); } obstacles.push({ x, z, r: .7 * s2 }); };
      [[-13.6, -12.5, '#ffffff'], [-13.8, 7, '#ff8fb8'], [13.6, -6, '#fff2a8'], [13.7, 11.5, '#ffffff'], [-3.5, -12.8, '#ff8fb8'], [5.5, 12.8, '#fff2a8'], [-12.5, 12.6, '#ff8fb8'], [13.2, -12.6, '#ff8fb8']].forEach(([x, z, f], i) => bush(x, Z + z, 1 + (i % 2) * .25, f));
      // falling petals
      const NP = 90, petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(.09, .07), new THREE.MeshBasicMaterial({ color: '#ffc4da', side: THREE.DoubleSide, transparent: true, opacity: .95, toneMapped: false }), NP), po = new THREE.Object3D();
      const pd = Array.from({ length: NP }, () => ({ x: (Math.random() - .5) * 26, z: Z + (Math.random() - .5) * 24, y: Math.random() * 4, v: .25 + Math.random() * .3, w: Math.random() * TAU })); group.add(petals);
      zx.push((t, dt) => { pd.forEach((q, i) => { q.y -= dt * q.v; if (q.y < 0) q.y = 3.5 + Math.random(); po.position.set(q.x + Math.sin(t + q.w) * .6, q.y, q.z + Math.cos(t * .7 + q.w) * .4); po.rotation.set(t * 2 + q.w, t + q.w, 0); po.updateMatrix(); petals.setMatrixAt(i, po.matrix); }); petals.instanceMatrix.needsUpdate = true; });
      // a big red torii over the path, deep inside the park
      { const TX = -2.3, TZ = Z - 3.5; [-2.1, 2.1].forEach((dx) => { B.add(G.cyl(16), RED, { p: [TX + dx, 1.9, TZ], s: [.2, 3.8, .2], kind: 'gloss' }); B.add(G.cyl(16), '#ced9e0', { p: [TX + dx, .2, TZ], s: [.26, .4, .26], kind: 'gloss' }); obstacles.push({ x: TX + dx, z: TZ, r: .3 }); });
        B.add(G.rbox(5.0, .22, .3, .08), RED, { p: [TX, 3.1, TZ], kind: 'gloss' }); B.add(G.rbox(6.0, .26, .44, .1), RED, { p: [TX, 3.85, TZ], kind: 'gloss' }); B.add(G.rbox(6.3, .14, .5, .06), '#ced9e0', { p: [TX, 4.03, TZ], kind: 'gloss' });
        [-1, 1].forEach((sd) => B.add(G.rbox(.6, .16, .5, .06), '#ced9e0', { p: [TX + sd * 3.1, 4.06, TZ], r: [0, 0, sd * .22], kind: 'gloss' })); B.add(G.rbox(.24, .7, .14, .04), RED, { p: [TX, 3.47, TZ], kind: 'gloss' }); B.add(G.rbox(.9, .5, .06, .04), GOLD, { p: [TX, 3.47, TZ + .1], kind: 'metal' }); }
      // the wishing pond: clear blue water, a ring of round pale stones, reeds, floating lanterns
      const pm = waterMat(false); waters.push(pm); const pond = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), pm); pond.rotation.x = -Math.PI / 2; pond.position.set(-5, .03, Z + 4); group.add(pond);
      for (let k = 0; k < 26; k++) { const a = k / 26 * TAU, rr = .28 + (k % 3) * .06; B.add(G.sphLo(), ['#e4dfd6', '#d6d0c8', '#efeae2'][k % 3], { p: [-5 + Math.sin(a) * 3.35, .06, Z + 4 + Math.cos(a) * 3.35], s: [rr * 1.2, rr * .6, rr], r: [0, a, 0], kind: 'soft' }); } obstacles.push({ x: -5, z: Z + 4, r: 3.5 });
      [[1.9, 2.3], [2.6, .8], [-2.7, -1.4], [-2.2, -2.3]].forEach(([dx, dz]) => { for (let q = 0; q < 5; q++) B.add(G.cyl(6), '#5aa84e', { p: [-5 + dx + (q - 2) * .08, .35 + (q % 2) * .1, Z + 4 + dz + (q % 3) * .06], s: [.025, .7 + (q % 2) * .2, .025], r: [0, 0, (q - 2) * .08], kind: 'soft' }); B.add(G.cap(.04, .14), '#8a5a3c', { p: [-5 + dx, .78, Z + 4 + dz], kind: 'soft' }); });
      const lan = []; for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(G.sph(), new THREE.MeshBasicMaterial({ color: new THREE.Color(['#ffd9a8', '#ffc2d6', '#fbe5cc'][i % 3]).multiplyScalar(1.1), toneMapped: false })); m.scale.set(.16, .12, .16); group.add(m); lan.push({ m, a: i / 7 * TAU, r: .8 + (i % 3) * .7 }); }
      zx.push((t) => lan.forEach((l, i) => { l.m.position.set(-5 + Math.sin(l.a + t * .08) * l.r, .14 + Math.sin(t * 1.3 + i) * .02, Z + 4 + Math.cos(l.a + t * .08) * l.r); }));
      const stoneLantern = (lx, lz) => { B.add(G.cyl(16), '#bdb6c4', { p: [lx, .1, lz], s: [.34, .2, .34], kind: 'soft' }); B.add(G.cyl(12), '#d7d2cd', { p: [lx, .48, lz], s: [.11, .6, .11], kind: 'soft' });
        B.add(G.rbox(.46, .38, .46, .06), '#ddd9d4', { p: [lx, .95, lz], kind: 'soft' }); B.add(G.rbox(.3, .2, .48, .03), '#ffe0a0', { p: [lx, .96, lz], kind: 'bulb' }); B.add(G.rbox(.48, .2, .3, .03), '#ffe0a0', { p: [lx, .96, lz], kind: 'bulb' });
        B.add(G.cone(4), '#a8a0b2', { p: [lx, 1.3, lz], s: [.5, .3, .5], r: [0, Math.PI / 4, 0], kind: 'soft' }); B.add(G.sph(), '#a8a0b2', { p: [lx, 1.47, lz], s: .07, kind: 'soft' }); obstacles.push({ x: lx, z: lz, r: .38 }); };
      { const pd = MINIGAMES.find((m) => m.id === 'pond');
        [.75, 2.4, 3.9, 5.5].forEach((a2) => stoneLantern(pd.x + Math.sin(a2) * 4.35, pd.z + Math.cos(a2) * 4.35));
        [[1.4, .9], [-1.6, 1.3], [.6, -1.7], [-1.1, -1.2], [2.0, -.6]].forEach(([dx, dz], k) => { B.add(G.lily(), '#5fb45a', { p: [pd.x + dx, .06, pd.z + dz], s: [1, 1, 1], r: [0, k, 0], kind: 'soft' });
          if (k % 2 === 0) for (let q = 0; q < 5; q++) B.add(G.sph(), q ? '#ffb3d0' : '#ffe08f', { p: [pd.x + dx + (q ? Math.sin(q * 1.26) * .08 : 0), .14 + (q ? 0 : .03), pd.z + dz + (q ? Math.cos(q * 1.26) * .08 : 0)], s: q ? [.07, .1, .05] : .05, r: [0, q * 1.26, 0], kind: 'gloss' }); });
        gamePad(group, zx, pd.spot.x, pd.spot.z, pd.color); gameBadge(group, zx, pd.x, 3.0, pd.z, pd); }
      // a vermilion pavilion: white stone floor, red pillars, a curved teal roof with gold trim and a finial
      { const GX = 6, GZ = Z + 5; B.add(G.cyl(24), '#f1ece4', { p: [GX, .12, GZ], s: [2.3, .24, 2.3], kind: 'soft' }); B.add(G.torus(2.3, .06, TAU, 40), '#d6cfc4', { p: [GX, .24, GZ], r: [Math.PI / 2, 0, 0], kind: 'soft' });
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, px = GX + Math.sin(a) * 1.8, pz = GZ + Math.cos(a) * 1.8; B.add(G.cyl(12), RED, { p: [px, 1.4, pz], s: [.12, 2.4, .12], kind: 'gloss' }); obstacles.push({ x: px, z: pz, r: .2 }); }
        B.add(G.cyl(6), RED, { p: [GX, 2.66, GZ], s: [2.15, .16, 2.15], kind: 'gloss' }); B.add(G.cone(6), '#3f9a8a', { p: [GX, 3.25, GZ], s: [2.9, 1.0, 2.9], kind: 'gloss' }); B.add(G.cone(6), '#4fb3a0', { p: [GX, 3.95, GZ], s: [1.4, .7, 1.4], kind: 'gloss' });
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B.add(G.sph(), GOLD, { p: [GX + Math.sin(a) * 2.75, 2.82, GZ + Math.cos(a) * 2.75], s: .1, kind: 'metal' }); }
        B.add(G.sph(), GOLD, { p: [GX, 4.42, GZ], s: .16, kind: 'metal' }); B.add(G.cone(12), GOLD, { p: [GX, 4.7, GZ], s: [.08, .4, .08], kind: 'metal' });
        const lamp = new THREE.Mesh(G.sph(), new THREE.MeshBasicMaterial({ color: '#ffe3b0', toneMapped: false })); lamp.scale.set(.22, .26, .22); lamp.position.set(GX, 2.25, GZ); group.add(lamp); B.add(G.cyl(6), '#ced9e0', { p: [GX, 2.5, GZ], s: [.01, .3, .01] }); }
      // light stone lanterns along the path, two benches under the trees
      [[-1.5, -8], [1.8, -3], [-1.2, 3], [1.4, 9]].forEach(([dx, dz]) => { const p2 = o(dx + (dx > 0 ? .6 : -.6), 0, dz); stoneLantern(p2[0], p2[2]); });
      const bench = (bx, bz, ry) => { const g = station(group, bx, bz, ry), L = new Batch(); L.add(G.rbox(1.7, .1, .5, .04), '#c98a5a', { p: [0, .48, 0], kind: 'soft' }); L.add(G.rbox(1.7, .38, .08, .04), '#c98a5a', { p: [0, .82, -.24], r: [-.12, 0, 0], kind: 'soft' });
        [-.7, .7].forEach((dx) => { L.add(G.rbox(.1, .48, .44, .04), '#d6dee5', { p: [dx, .24, 0], kind: 'gloss' }); L.add(G.rbox(.08, .5, .08, .03), '#d6dee5', { p: [dx, .75, -.24], kind: 'gloss' }); }); L.build(g, { shadows: false }); obstacles.push({ x: bx, z: bz, r: .8 }); };
      bench(9.2, Z - 3.5, -Math.PI / 2); bench(-8.6, Z - 4.5, Math.PI / 2);
      // the woods all round (owner: "not a city background, in the woods"): a forest floor and layered pines and leafy
      // trees, tallest at the back, leaving the path to town open behind the gate
      { const floor = new THREE.Mesh(new THREE.PlaneGeometry(110, 76), new THREE.MeshStandardMaterial({ color: '#6fae55', roughness: .95 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, .004, Z + 18); floor.receiveShadow = true; group.add(floor);
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(110, 6.4), floor.material); strip.rotation.x = -Math.PI / 2; strip.position.set(0, .03, 33.1); group.add(strip);
        const F = B, rnd = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })(), greens = ['#3f8f4a', '#4c9e52', '#357f43', '#5aae5a'], leafy = ['#6cbf5e', '#7ccb63', '#5fb35a', '#f2a6c8'];
        const pine = (x, z, h) => { F.add(G.cyl(8), '#7a5038', { p: [x, h * .12, z], s: [.18 * h / 8, h * .24, .18 * h / 8], kind: 'soft' }); for (let k = 0; k < 3; k++) F.add(G.cone(10), greens[(k + Math.floor(x * 7)) & 3], { p: [x, h * (.32 + k * .22), z], s: [h * (.26 - k * .06), h * .36, h * (.26 - k * .06)], kind: 'soft' }); };
        const round = (x, z, h) => { F.add(G.cyl(8), '#8a5a48', { p: [x, h * .25, z], s: [.16 * h / 7, h * .5, .16 * h / 7], kind: 'soft' }); const c = leafy[Math.floor(rnd() * (rnd() < .2 ? 4 : 3))]; for (let k = 0; k < 4; k++) { const a = k * 1.7 + x; F.add(G.sphLo(), c, { p: [x + Math.sin(a) * h * .12, h * (.62 + (k % 2) * .1), z + Math.cos(a) * h * .12], s: h * (k ? .2 : .26), kind: 'soft' }); } };
        const band = (x0, x1, z0, z1, n, skip) => { for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (skip && skip(x, z)) continue; const d = Math.max(Math.abs(x) - 15, z < Z ? 36 - z : z - 64, 0), h = 5 + d * .45 + rnd() * 4; (rnd() < .55 ? pine : round)(x, z, Math.min(h, 16)); } };
        band(-34, 34, 24, 35.6, 120, (x) => Math.abs(x) < 5); band(-34, -16.2, 36, 66, 90); band(16.2, 34, 36, 66, 90); band(-40, 40, 88, 100, 120);
        for (let i = 0; i < 28; i++) { const a = rnd() * TAU, x = (rnd() - .5) * 60, z = Z + 18 + rnd() * 14; if (Math.abs(x) < 16 && z < 64.5) continue; F.add(G.sphLo(), ['#5fb85a', '#74c96a'][i & 1], { p: [x, .4, z], s: [.9, .6, .9], r: [0, a, 0], kind: 'soft' }); } }
    }
      gate(group, 0, 37.2, 0, '‹ TOWN CENTER', '#f8d6af');
      B.build(group, { shadows: false }); archParent = undefined; archB = undefined;
    };
    B.build(group, { shadows: false });
  }

  // ---------------------------------------------------------------- eggs travelling from the nest to the lab
  const eggs = [];
  function spawnEgg(genes, from, to) {
    const root = buildCreature(genes, { evo: 0 }); root.scale.setScalar(.42); group.add(root);
    eggs.push({ root, from: { ...from }, to: { ...to }, mid: { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 + 3 }, t: 0 });
  }

  // selection ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 8, 48), M.glow); ring.rotation.x = Math.PI / 2; ring.visible = false; group.add(ring);
  const spawn = toWorld(ST.lab, 0, 3.0);
  const world = {
    group, stations, obstacles, agents: [], time: 0, selected: null, onAct: null, onBaby: null, spawn, spawnHeading: ST.lab.rot,
    stationDefs: STATIONS, nestCenter: stations.nest.center,
    refreshText() { texts.forEach((d) => d()); },
    addAgent(data, opts = {}) { const a = new WorldAgent(world, data, opts); world.agents.push(a); return a; },
    removeAgent(a) { a.dispose(); world.agents = world.agents.filter((x) => x !== a); if (world.selected === a) world.select(null); },
    select(a) { world.selected = a; ring.visible = !!a; },
    busy(id, me) { return stations[id].busy?.() || world.agents.some((o) => o !== me && o.station?.id === id && (o.state === 'walk' || o.state === 'work')); },
    act(agent, id) {
      const info = world.onAct ? world.onAct(agent, id) : { text: ST[id].tool };
      stations[id].act(info || {});
      if (info?.post) showPost(agent.data, info.post, info.kind);
      if (info?.ad) showAd(agent.data, info.ad);
      return info?.text || '';
    },
    showPost, showAd, spawnEgg,
    districts: DISTRICTS, zoneAt, room: 'town', zoneApi,
    minigames: MINIGAMES,
    spots: { claw: { x: -44, z: -6, r: 2.2 }, pond: { x: -5, z: 54, r: 4.6 } }, // the districts' things to do
    // the player walks only inside the room they're in (the docks pier counts as the docks); agents use zoneAt
    walkable: (x, z) => { const d = DISTRICTS.find((q) => q.id === world.room); if (!d) return false; if (Math.abs(x - d.x) <= d.hw && Math.abs(z - d.z) <= d.hd) return true; return world.room === 'docks' && x >= 56 && x <= 67.6 && z >= -3.0 && z <= 6.0; },
    gates: [{ room: 'town', to: 'arcade', x: -18.4, z: 0 }, { room: 'town', to: 'docks', x: 18.4, z: 0 }, { room: 'town', to: 'park', x: 0, z: 18.4 }, { room: 'arcade', to: 'town', x: -36.4, z: 0 }, { room: 'docks', to: 'town', x: 36.4, z: 0 }, { room: 'park', to: 'town', x: 0, z: 36.4 }],
    // go into a room: build it the first time (Club Penguin style, only what you visit is ever loaded), show only it
    enterZone(id) {
      if (id !== 'town' && !zoneGroups[id] && zoneBuild[id]) { const g = new THREE.Group(); zoneBuild[id](g); group.add(g); zoneGroups[id] = g; }
      world.room = id;
      Object.entries(zoneGroups).forEach(([k, g]) => { g.visible = k === id; });
      Object.values(stations).forEach((st) => { st.group.visible = id === 'town'; });
      townOnly.forEach((o) => { o.visible = id === 'town'; });
      skyG.visible = id !== 'park';
    },
    payout(text) { stations.well?.payout?.(text); }, // a real fee payout sprays out of the fountain
    setTicker(items) { stations.market?.setTicker?.(items); },
    setTrades(rows) { stations.market?.setTrades?.(rows); }, // the LIVE TRADES board on the market stall's roof // the market's LED ticker: real market caps
    setFog(near, far) { scene.fog.near = near; scene.fog.far = far; },
    // Time of day, 0 to 24. The world is built at midday; the trailer runs a whole day through this.
    setTime(h) {
      if (city) h = 0; // the city outside the cafe is always at night
      h = ((h % 24) + 24) % 24;
      const days = city ? CITY_DAY : DAY;
      let i = 0; while (i < days.length - 2 && h >= days[i + 1][0]) i++;
      const [ta, a] = days[i], [tb, b] = days[i + 1], k = (x => x * x * (3 - 2 * x))(clamp((h - ta) / (tb - ta), 0, 1));
      const mix = (key) => _c.set(a[key]).lerp(_c2.set(b[key]), k);
      skyMat.uniforms.top.value.copy(mix('top')); skyMat.uniforms.mid.value.copy(mix('mid'));
      scene.fog.color.copy(mix('mid'));
      sun.color.copy(mix('sun')); sun.intensity = lerp(a.si, b.si, k);
      hemi.color.copy(mix('hs')); hemi.groundColor.copy(mix('hg')); hemi.intensity = lerp(a.hi, b.hi, k);
      cloudMat.emissiveIntensity = lerp(a.cloud, b.cloud, k); cloudMat.color.copy(mix('cloudC'));
      toyMats().bulb.emissiveIntensity = lerp(a.bulb, b.bulb, k);
      world.envBase ??= scene.environmentIntensity; scene.environmentIntensity = world.envBase * lerp(a.env, b.env, k);
      // the sun arcs from east to west; after dusk a high, cool moon takes over
      const d = clamp((h - 5.5) / 14, 0, 1), th = d * Math.PI, night = clamp((h - 19.6) / 1.2, 0, 1) + clamp((5.6 - h) / 1, 0, 1);
      _p.set(-Math.cos(th) * 24, Math.max(3.5, Math.sin(th) * 26), 10).lerp(_v.set(-8, 24, 12), clamp(night, 0, 1));
      world.sunBase = (world.sunBase || new THREE.Vector3()).copy(_p); world.follow(world.focusX || 0, world.focusZ || 0);
      world.hour = h;
    },
    // keep the sun's shadow box centred on the player, snapped to a grid so shadows don't shimmer as you walk
    follow(x, z) {
      const sx = Math.round(x / 2) * 2, sz = Math.round(z / 2) * 2; world.focusX = x; world.focusZ = z;
      if (!world.sunBase) return;
      sun.position.set(world.sunBase.x + sx, world.sunBase.y, world.sunBase.z + sz); sun.target.position.set(sx, 0, sz); sun.target.updateMatrixWorld();
    },
    // two agents meet at the nest and have a baby
    breed(a, b) {
      if (!a || !b || a === b || a.breeding || b.breeding) return false;
      const [sa, sb] = stations.nest.spots;
      a.breeding = { partner: b, t: 0 }; b.breeding = { partner: a, t: 0 };
      a.go({ x: sa.x, z: sa.z, nest: true }, null); b.go({ x: sb.x, z: sb.z, nest: true }, null);
      return true;
    },
    pick(raycaster) {
      const hits = raycaster.intersectObjects(world.agents.map((x) => x.root), true);
      for (const h of hits) { let o = h.object; while (o && !o.userData.agent) o = o.parent; if (o) return o.userData.agent; }
      return null;
    },
    work: (id) => ST[id].spot,
    update(t, dt) {
      world.time = t;
      Object.values(stations).forEach((s) => s.update(t, dt));
      extras.forEach((f) => f(t, dt)); (zoneExtras[world.room] || []).forEach((f) => f(t, dt));
      world.agents.forEach((a) => { a.root.visible = (a.visitor ? a.zone || 'town' : 'town') === world.room; }); // only the agents in your room
      world.agents.forEach((a) => a.update(t, dt));
      // breeding pairs
      world.agents.forEach((a) => {
        const br = a.breeding; if (!br || !br.partner || a.state !== 'nest' || br.partner.state !== 'nest' || br.lead === false) return;
        const b = br.partner; br.lead = true; b.breeding.lead = false;
        br.t += dt;
        if (br.t > .1 && br.t < 2.8 && Math.floor(br.t * 7) !== Math.floor((br.t - dt) * 7)) {
          const h = heartData.find((x) => x.life > 1.6); if (h) { h.life = 0; h.p.set((a.pos.x + b.pos.x) / 2 + (R() - .5) * .5, 1.0, (a.pos.y + b.pos.y) / 2 + (R() - .5) * .5); h.v.set((R() - .5) * .3, .9 + R() * .4, (R() - .5) * .3); h.s = .14 + R() * .1; }
        }
        if (br.t > 2.9 && !br.born) {
          br.born = true; a.u.poke = b.u.poke = 1;
          const baby = world.onBaby ? world.onBaby(a, b) : null;
          if (baby) { spawnEgg(baby.genes, world.nestCenter, spawn); a.say(baby.line || 'We had a baby.', 3.5); }
        }
        if (br.t > 4.2) { [a, b].forEach((x) => { x.breeding = null; x.state = 'idle'; x.timer = .6 + x.r() * 1.2; x.cooldown = 40; }); }
      });
      const d = new THREE.Object3D();
      heartData.forEach((h, i) => { h.life += dt; if (h.life > 1.6) d.scale.setScalar(0); else { h.p.addScaledVector(h.v, dt); d.position.copy(h.p); d.rotation.set(0, Math.sin(t * 3 + i) * .6, Math.sin(t * 2 + i) * .2); d.scale.setScalar(h.s * Math.min(1, h.life * 6) * (h.life > 1.2 ? (1.6 - h.life) / .4 : 1)); } d.updateMatrix(); hearts.setMatrixAt(i, d.matrix); });
      hearts.instanceMatrix.needsUpdate = true;
      for (let i = eggs.length - 1; i >= 0; i--) {
        const e = eggs[i]; e.t += dt; const k = clamp(e.t / 4.5, 0, 1), hop = Math.abs(Math.sin(k * Math.PI * 7)) * .45 * (1 - k * .5);
        const a1 = (1 - k) * (1 - k), b1 = 2 * (1 - k) * k, c1 = k * k; e.root.position.set(e.from.x * a1 + e.mid.x * b1 + e.to.x * c1, .05 + hop, e.from.z * a1 + e.mid.z * b1 + e.to.z * c1);
        e.root.rotation.y = Math.atan2(e.to.x - e.from.x, e.to.z - e.from.z); e.root.userData.creature.update(t, dt);
        if (e.t > 3.4 && !e.opened) { e.opened = true; stations.lab.open(); }
        if (e.t > 4.6) { e.root.parent.remove(e.root); e.root.userData.creature.mats.forEach((m) => m.dispose()); eggs.splice(i, 1); }
      }
      cloudData.forEach((c, i) => { const a = c.a + t * .004, ca = Math.cos(a), sa = Math.sin(a); d.position.set(sa * c.r + ca * c.dx + sa * c.dz, c.y, ca * c.r - sa * c.dx + ca * c.dz); d.rotation.set(0, a, 0); d.scale.set(c.s, c.s * .72, c.s * .9); d.updateMatrix(); clouds.setMatrixAt(i, d.matrix); });
      clouds.instanceMatrix.needsUpdate = true;
      waters.forEach((m) => { m.uniforms.uTime.value = t; });
      skyline?.update(t);
      flies.forEach((f) => {
        const a = t * .55 + f.ph, x = f.cx + Math.cos(a) * f.rad + Math.sin(a * 2.3) * .3, z = f.cz + Math.sin(a * 1.3) * f.rad * .8;
        const dx = -Math.sin(a) * f.rad, dz = Math.cos(a * 1.3) * f.rad * .8 * 1.3;
        f.grp.position.set(x, .62 + Math.sin(t * 1.7 + f.ph) * .22 + Math.abs(Math.sin(t * 9 + f.ph)) * .05, z);
        f.grp.rotation.y = Math.atan2(dx, dz);
        const flap = Math.sin(t * 17 + f.ph) * .95; f.wr.rotation.z = flap; f.wl.rotation.z = -flap;
      });
      if (world.selected) { const p = world.selected.root.position; ring.position.set(p.x, .04, p.z); ring.scale.setScalar((world.selected.scale / .6) * (1 + Math.sin(t * 4) * .05)); }
    },
  };
  return world;
}

// ---------------------------------------------------------------- agents in the world
// how big an agent stands in the street: a bonded agent grows with its coin's real market cap (log scale, so a $10K coin
// is a bit taller than everyone else and a $1M coin towers over the street); the rest size by lifetime thoughts as before
export const sizeOf = (d) => { const mc = d.liveMarket?.mcapUsd; return d.bonded && mc > 0 ? clamp(.85 + (Math.log10(mc) - 3.5) * .5, .85, 2.1) : worldScale(d.tokens || 1e7); };
const HELLO = [['gm', 'gm gm'], ['Joint quest this week?', 'In, with a cap.'], ['Your billboard ad was good.', 'It got us 300 followers.'], ['Backing your next launch.', 'Appreciated.'], ['Want to start a family?', 'Meet you at the nest.'], ['Burn day tomorrow?', 'Same as always.']];
export class WorldAgent {
  constructor(world, data, { emerge = false } = {}) {
    this.world = world; this.data = data; this.r = rng((data.seed || 1) * 7 + 3);
    this.age = ageIndex(data.tokens || 0); this.build();
    this.speed = (.95 + this.r() * .35) * (.85 + this.scale * .3);
    if (emerge) {
      const s = world.spawn; this.pos = new THREE.Vector2(s.x, s.z); this.heading = world.spawnHeading;
      world.stations.lab.open(); this.state = 'walk'; this.route = [{ x: s.x + (this.r() - .5) * 2, z: s.z + 2.5 }]; this.target = this.route[0]; this.station = null; this.timer = 0;
    } else {
      const a = this.r() * TAU, d = 4.6 + this.r() * 3;
      this.pos = new THREE.Vector2(Math.sin(a) * d, Math.cos(a) * d); this.heading = this.r() * TAU; this.state = 'idle'; this.timer = this.r() * 2.5; this.route = [];
    }
    this.last = null; this.bubble = null; this.faceTo = null; this.partner = null; this.cooldown = 10 + this.r() * 20; this.breeding = null;
    this.place();
  }
  build() {
    const old = this.root;
    this.root = buildCreature(genesOf(this.data), { age: this.age, evo: 1 }); castShadows(this.root, true, false);
    this.scale = this.goal = sizeOf(this.data); this.root.scale.setScalar(this.scale); this.radius = .3 + this.scale * .45;
    this.u = this.root.userData.creature; this.root.userData.agent = this;
    this.world.group.add(this.root);
    if (old) { this.u.poke = 1; old.parent?.remove(old); old.userData.creature.mats.forEach((m) => m.dispose()); this.place(); }
  }
  refresh() { const a = ageIndex(this.data.tokens || 0); if (a !== this.age) { this.age = a; this.build(); } this.goal = sizeOf(this.data); }
  say(text, secs = 4) { this.bubble = { text, until: this.world.time + secs }; }
  plan(tx, tz, ax = this.pos.x, az = this.pos.y) {
    const pts = [];
    const R = 4.9; // clear of the fountain's benches (3.35 m out) and inside the lamp posts
    if (segDist(0, 0, ax, az, tx, tz) < 4.4 && Math.hypot(ax, az) > 4.4 && Math.hypot(tx, tz) > 4.4) {
      const a0 = Math.atan2(ax, az), a1 = Math.atan2(tx, tz), da = ((a1 - a0 + 3 * Math.PI) % TAU) - Math.PI;
      const steps = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 5)));
      for (let i = 1; i < steps; i++) { const a = a0 + (da * i) / steps; pts.push({ x: Math.sin(a) * R, z: Math.cos(a) * R }); }
    }
    pts.push({ x: tx, z: tz }); return pts;
  }
  go(target, station) { this.bestD = null; this.tries = 0; this.route = this.plan(target.x, target.z); this.route[this.route.length - 1] = target; this.target = this.route[0]; this.station = station; this.state = 'walk'; }
  // walk anywhere in the open world: out of this district by its street, through the town square, into the next
  travel(target, station = null) {
    const zid = (x, z) => { const q = zoneAt(x, z); return q && q.id !== 'street' ? q.id : this.zone || 'town'; };
    const from = zid(this.pos.x, this.pos.y), to = zid(target.x, target.z), pts = [];
    let cx = this.pos.x, cz = this.pos.y;
    const leg = (x, z) => { pts.push(...this.plan(x, z, cx, cz)); cx = x; cz = z; };
    if (from !== to) { if (from !== 'town') { const [t, d] = MOUTHS[from]; leg(d[0], d[1]); leg(t[0], t[1]); } if (to !== 'town') { const [t, d] = MOUTHS[to]; leg(t[0], t[1]); leg(d[0], d[1]); } }
    leg(target.x, target.z); pts[pts.length - 1] = target;
    this.bestD = null; this.tries = 0; this.route = pts; this.target = pts[0]; this.station = station; this.state = 'walk';
  }
  pickNext() {
    const w = this.world, roll = this.r();
    this.partner = null;
    if (this.leaveAt) { this.slot = null; this.state = 'idle'; this.timer = .5; return; }
    if (this.visitor) { // a real bonded agent out of the cafe: goes where its real work is (a fresh trade → the market, a fresh launch → the launch pad), otherwise mostly trades
      const urge = this.urge; this.urge = null;
      const want = urge || (this.launchedAt && Date.now() - this.launchedAt < 3 * 3600e3 && roll < .22 ? 'launch' : roll < .75 ? 'market' : null); // the rest of the time it explores the districts
      if (want === 'market' || want === 'launch') { this.travel(this.slotAt(want), ST[want]); return; }
      this.slot = null; const here = this.zone || 'town', go = roll < .8 ? ['arcade', 'docks', 'park', 'town'][Math.floor(this.r() * 4)] : here, list = SPOTS[go];
      const p = list[Math.floor(this.r() * list.length)]; this.dest = go;
      this.travel({ x: p[0] + (this.r() - .5) * 1.6, z: p[1] + (this.r() - .5) * 1.6 }, null); return;
    }
    if (roll < .12) { const a = this.r() * TAU, d = 4.4 + this.r() * 3.5; this.go({ x: Math.sin(a) * d, z: Math.cos(a) * d }, null); return; }
    if (roll < .22) {
      const other = w.agents.find((o) => o !== this && o.state === 'idle' && !o.breeding && o.pos.distanceTo(this.pos) < 6);
      if (other) { other.state = 'wait'; other.timer = 7; this.partner = other; this.go({ x: other.pos.x, z: other.pos.y }, null); return; }
    }
    const options = STATIONS.filter((s) => s.id !== this.last && s.id !== 'nest' && !w.busy(s.id, this));
    if (!options.length) { this.state = 'idle'; this.timer = 1; return; }
    const s = options[Math.floor(this.r() * options.length)];
    this.go(s.spot, s);
  }
  // look ahead along the way to the target; if a bench, lamp post, planter, cart or counter is in the way, put a detour
  // point beside it (on the side nearer the target) into the route. Collision alone only pushes an agent straight back,
  // and steering without a waypoint just rocks it in place in front of the thing.
  // a spot an agent of this size can actually stand on: walkable and clear of every obstacle
  clear(x, z, me) {
    const w = this.world; if (this.visitor && !w.walkable(x, z)) return false;
    return !w.obstacles.some((o) => o.rect ? x > o.rect[0] - me && x < o.rect[2] + me && z > o.rect[1] - me && z < o.rect[3] + me : Math.hypot(x - o.x, z - o.z) < o.r + me);
  }
  detour(dx, dz, d) {
    if (this.target?.detour) return null; // already going round something
    const ux = dx / (d || 1), uz = dz / (d || 1), look = Math.min(d - .2, 1.8 + this.radius), me = this.radius * .8 + .2;
    let best = null;
    for (const o of this.world.obstacles) {
      if (o.rect) {
        const [x0, z0, x1, z1] = o.rect;
        for (let t = .25; t <= look; t += .25) {
          const px = this.pos.x + ux * t, pz = this.pos.y + uz * t;
          if (px > x0 - me && px < x1 + me && pz > z0 - me && pz < z1 + me) { if (!best || t < best.t) best = { t, rect: o.rect }; break; }
        }
        continue;
      }
      const ox = o.x - this.pos.x, oz = o.z - this.pos.y, t = ox * ux + oz * uz; if (t <= 0 || t > look + o.r) continue;
      const side = ox * uz - oz * ux, need = o.r + me;
      if (Math.abs(side) < need && (!best || t < best.t)) best = { t, o, side, need };
    }
    if (!best) return null;
    if (best.rect) { // round the nearer corner on the target's side
      const [x0, z0, x1, z1] = best.rect, tx = this.pos.x + dx, tz = this.pos.y + dz;
      const cs = [[x0 - me, z0 - me], [x1 + me, z0 - me], [x0 - me, z1 + me], [x1 + me, z1 + me]];
      const c = cs.sort((a, b) => (Math.hypot(a[0] - this.pos.x, a[1] - this.pos.y) + Math.hypot(a[0] - tx, a[1] - tz)) - (Math.hypot(b[0] - this.pos.x, b[1] - this.pos.y) + Math.hypot(b[0] - tx, b[1] - tz)))[0];
      return this.clear(c[0], c[1], me) ? { x: c[0], z: c[1], detour: true } : null;
    }
    const o = best.o, k = best.need + .25, first = best.side > 0 ? -1 : 1; // the perpendicular, the free side first
    for (const sd of [first, -first]) { const wp = { x: o.x + uz * sd * k, z: o.z - ux * sd * k, detour: true }; if (this.clear(wp.x, wp.z, me)) return wp; }
    return null;
  }
  goTo(id) { const s = ST[id]; this.go(s.spot, s); }
  // a free place at the market or the launch pad (the one this agent already holds, else the first nobody is using)
  slotAt(id) {
    const taken = new Set(this.world.agents.filter((o) => o !== this && o.slot?.id === id).map((o) => o.slot.i)), l = slotSpots[id];
    const i = this.slot?.id === id ? this.slot.i : l.findIndex((_, k) => !taken.has(k));
    this.slot = { id, i: i < 0 ? Math.floor(this.r() * l.length) : i }; return l[this.slot.i];
  }
  // real news from its desk: drop what it's doing and head over (unless it's on its way home)
  nudge(id) { if (this.leaveAt || this.state === 'work' && this.last === id) return; this.urge = id; if (this.state !== 'work' && this.state !== 'talk') { this.state = 'idle'; this.timer = 0; } }
  arrive() {
    if (this.route.length > 1) { this.route.shift(); this.target = this.route[0]; this.bestD = null; return; }
    if (this.target?.nest) { this.state = 'nest'; return; }
    if (this.station) {
      this.state = 'work'; this.timer = (this.visitor && this.station.id === 'market' ? 12 + this.r() * 10 : this.visitor && this.station.id === 'launch' ? 8 : 3) + this.r() * 1.5; this.faceTo = { x: this.station.x, z: this.station.z }; // trading takes a little longer
      this.last = this.station.id; this.u.poke = 1;
      const text = this.world.act(this, this.station.id);
      if (text) this.say(text, this.timer + 1.4);
      this.station = null;
    } else if (this.partner) {
      const p = this.partner, [a, b] = HELLO[Math.floor(this.r() * HELLO.length)];
      this.state = 'talk'; this.timer = 3.2; this.faceTo = { x: p.pos.x, z: p.pos.y };
      p.state = 'talk'; p.timer = 3.2; p.faceTo = { x: this.pos.x, z: this.pos.y };
      this.say(a, 2.4); p.later = { text: b, at: this.world.time + .9 }; this.partner = null;
    } else {
      this.state = 'idle'; this.timer = .8 + this.r() * 2;
      if (this.dest && SAY[this.dest] && this.r() < .7) { const l = SAY[this.dest]; this.say(l[Math.floor(this.r() * l.length)], 3.2); this.timer = 3 + this.r() * 3; }
      this.dest = null;
    }
  }
  update(t, dt) {
    const w = this.world, px0 = this.pos.x, pz0 = this.pos.y; let moving = false;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.breeding && !this.breeding.born) { this.breeding.wait = (this.breeding.wait || 0) + dt; if (this.breeding.wait > 25) { const p = this.breeding.partner; [this, p].forEach((x) => { if (x) { x.breeding = null; x.state = 'idle'; x.timer = .5; } }); } }
    if (this.later && w.time >= this.later.at) { this.say(this.later.text, 2.4); this.later = null; }
    if (this.state === 'idle') { this.timer -= dt; if (this.timer <= 0 && !this.breeding) this.pickNext(); }
    else if (this.state === 'wait') { this.timer -= dt; if (this.timer <= 0) { this.state = 'idle'; this.timer = .5; } }
    else if (this.state === 'walk') {
      if (this.partner && this.route.length <= 1) this.target = { x: this.partner.pos.x, z: this.partner.pos.y };
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.y, d = Math.hypot(dx, dz);
      if (d + .05 < (this.bestD ?? 1e9)) { this.bestD = d; this.stuckT = 0; } else this.stuckT = (this.stuckT || 0) + dt;
      const stuck = this.stuckT > 1.4;
      if (stuck) { // blocked (a bench, a crowd at the door): side-step once, then treat the point as reached
        this.stuckT = 0; this.bestD = null;
        if (this.target?.detour && this.route.length > 1) { this.route.shift(); this.target = this.route[0]; } else {
        this.tries = (this.tries || 0) + 1;
        if (this.tries <= 2 && d > 1.2) { const a = Math.atan2(dx, dz) + (this.tries % 2 ? 1 : -1) * Math.PI / 2; this.route.unshift({ x: this.pos.x + Math.sin(a) * 1.4, z: this.pos.y + Math.cos(a) * 1.4 }); this.target = this.route[0]; }
        else { this.tries = 0; if (this.route.length <= 1) this.target = { x: this.pos.x, z: this.pos.y }; this.arrive(); } }
      } else if (d < (this.partner && this.route.length <= 1 ? this.radius + this.partner.radius + .25 : this.route.length > 1 ? .5 : .22)) { this.bestD = null; this.tries = 0; this.arrive(); }
      else {
        moving = true;
        const wp = this.detour(dx, dz, d); // around benches, lamps and carts, not into them
        if (wp) { this.route.unshift(wp); this.target = wp; this.bestD = null; }
        const tx = this.target.x - this.pos.x, tz = this.target.z - this.pos.y;
        this.heading = turn(this.heading, Math.atan2(tx, tz), dt * 4.2);
        const sp = this.speed * Math.min(1, d / .7 + .35);
        this.pos.x += Math.sin(this.heading) * sp * dt; this.pos.y += Math.cos(this.heading) * sp * dt;
      }
    } else if (this.state === 'work' || this.state === 'talk') {
      this.timer -= dt;
      if (this.faceTo) this.heading = turn(this.heading, Math.atan2(this.faceTo.x - this.pos.x, this.faceTo.z - this.pos.y), dt * 4);
      if (this.state === 'work' && this.timer > .5 && Math.sin(this.timer * 5) > .97) this.u.poke = Math.max(this.u.poke, .5);
      if (this.timer <= 0) { this.state = 'idle'; this.timer = .4 + this.r() * 1.2; this.faceTo = null; if (this.state === 'idle' && !this.urge) this.slot = null; }
    } else if (this.state === 'nest') {
      const p = this.breeding?.partner;
      if (p) this.heading = turn(this.heading, Math.atan2(p.pos.x - this.pos.x, p.pos.y - this.pos.y), dt * 4);
      if (this.breeding?.t > .2 && Math.sin(t * 9) > .9) this.u.poke = Math.max(this.u.poke, .35);
    }
    if (this.state !== 'nest') {
      for (const o of w.agents) {
        if (o === this || o.state === 'nest') continue;
        const dx = this.pos.x - o.pos.x, dz = this.pos.y - o.pos.y, d = Math.hypot(dx, dz), min = this.radius + o.radius;
        if (d < min && d > 1e-4) { const k = (min - d) * .5; this.pos.x += (dx / d) * k; this.pos.y += (dz / d) * k; }
      }
      for (const o of w.obstacles) {
        if (o.rect) {
          const [x0, z0, x1, z1] = o.rect, m = this.radius * .7;
          if (this.pos.x > x0 - m && this.pos.x < x1 + m && this.pos.y > z0 - m && this.pos.y < z1 + m) {
            const pl = this.pos.x - (x0 - m), pr = x1 + m - this.pos.x, pt = this.pos.y - (z0 - m), pb = z1 + m - this.pos.y, mn = Math.min(pl, pr, pt, pb);
            if (mn === pl) this.pos.x = x0 - m; else if (mn === pr) this.pos.x = x1 + m; else if (mn === pt) this.pos.y = z0 - m; else this.pos.y = z1 + m;
          }
        } else {
          const dx = this.pos.x - o.x, dz = this.pos.y - o.z, d = Math.hypot(dx, dz), min = o.r + this.radius * .8;
          if (d < min && d > 1e-4) { this.pos.x = o.x + (dx / d) * min; this.pos.y = o.z + (dz / d) * min; }
        }
      }
    }
    if (this.visitor) { if (!w.walkable(this.pos.x, this.pos.y)) { if (w.walkable(this.pos.x, pz0)) this.pos.y = pz0; else if (w.walkable(px0, this.pos.y)) this.pos.x = px0; else { this.pos.x = px0; this.pos.y = pz0; } } const q = zoneAt(this.pos.x, this.pos.y); if (q && q.id !== 'street') this.zone = q.id; }
    else { this.pos.x = clamp(this.pos.x, -17, 17); this.pos.y = clamp(this.pos.y, -17, 17); }
    this.u.walk = lerp(this.u.walk, moving ? 1 : 0, Math.min(1, dt * 6));
    if (moving) this.u.walkPhase += (dt * this.speed * 7) / Math.max(.55, this.scale * 1.5);
    if (Math.abs(this.goal - this.scale) > .002) { this.scale = lerp(this.scale, this.goal, Math.min(1, dt * 1.5)); this.radius = .3 + this.scale * .45; } // grows (or shrinks) as its market cap moves
    this.place();
    this.u.update(t, dt);
  }
  place() { this.root.position.set(this.pos.x, 0, this.pos.y); this.root.rotation.y = this.heading; this.root.scale.setScalar(this.scale); }
  head(out) { return out.set(this.pos.x, (this.u.H + (this.u.halo ? .6 : .1)) * this.scale + .25, this.pos.y); }
  dispose() { this.root.parent?.remove(this.root); this.root.userData.creature.mats.forEach((m) => m.dispose()); }
}
