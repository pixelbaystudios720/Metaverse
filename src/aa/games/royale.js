// Agent Royale (id: royale): a cute toy-island battle royale in its own three.js scene. Everyone boards the balloon
// bus, jumps, skydives and glides down onto the island, then loots glowing chests and floor loot (five toy blasters in
// five rarities, ammo, shield soda and med kits), chops wood with a candy pickaxe, builds walls, floors and ramps, and
// fights the agents (AI players) while the pink storm closes in. Last one standing is the champion. Knocked-out
// players flop and pop into stars and coins and drop their loot. No blood, no gore, no real brands.
// Real players in the "royale" room see each other and can tag each other (server/live.mjs relays hit/ko/fx);
// every player runs their own bot match. Best run in localStorage aa.royale.best.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2, FONT = 'Fredoka, system-ui, sans-serif';
// the island: a heightmap on a 2 m grid from -220 to 220; the sea is at y = 0
const HN = 220, HS = 2, H0 = -HN * HS / 2, G = 4, LV = 4;
const POIS = [
  { id: 'plaza', name: 'Neon Plaza', x: 6, z: 4, r: 36 },
  { id: 'cove', name: 'Candy Cove', x: -112, z: 104, r: 32 },
  { id: 'farm', name: 'Bubble Farm', x: -108, z: -66, r: 34 },
  { id: 'peaks', name: 'Pixel Peaks', x: 96, z: -92, r: 17 },
  { id: 'docks', name: 'Coral Docks', x: 128, z: 74, r: 26 },
  { id: 'woods', name: 'Sprinkle Woods', x: -14, z: -122, r: 26 },
  { id: 'lane', name: 'Lollipop Lane', x: 34, z: 118, r: 26 },
];
const RAR = [
  { n: 'Common', c: '#b9bccb', d: '#8d90a3', m: 1 }, { n: 'Uncommon', c: '#62d36f', d: '#2f9e45', m: 1.07 }, { n: 'Rare', c: '#4fa3ff', d: '#2a6fd6', m: 1.14 },
  { n: 'Epic', c: '#b26bff', d: '#7d3fd4', m: 1.22 }, { n: 'Legendary', c: '#ffb52e', d: '#d98400', m: 1.3 },
];
const AMMO = { light: { n: 'Light ammo', c: '#8cc8ff', mag: 30 }, medium: { n: 'Medium ammo', c: '#7fd6a0', mag: 30 }, shells: { n: 'Shells', c: '#ff9f6b', mag: 8 }, heavy: { n: 'Heavy ammo', c: '#c9a6ff', mag: 6 } };
// eff: the range where the toy is still accurate; pd: how far an agent likes to stand when it fights with it
const WPN = {
  pistol: { name: 'Blaster Pistol', ammo: 'light', dmg: 24, rate: .2, mag: 16, reload: 1.2, spread: .022, auto: false, eff: 45, range: 120, pd: 14, col: '#ff9f43', snd: 'pistol' },
  rifle: { name: 'Burst Rifle', ammo: 'medium', dmg: 26, rate: .55, burst: 3, gap: .075, mag: 30, reload: 2.1, spread: .014, auto: true, eff: 70, range: 200, pd: 24, col: '#6fb7ff', snd: 'rifle' },
  shotgun: { name: 'Foam Shotgun', ammo: 'shells', dmg: 12, pellets: 9, rate: .95, mag: 5, reload: 2.4, spread: .085, auto: false, eff: 14, range: 40, pd: 5, col: '#ff8fb8', snd: 'shotgun' },
  smg: { name: 'Bubble SMG', ammo: 'light', dmg: 14, rate: .075, mag: 30, reload: 1.8, spread: .05, auto: true, eff: 28, range: 90, pd: 10, col: '#8ad65a', snd: 'smg' },
  sniper: { name: 'Zoom Popper', ammo: 'heavy', dmg: 105, rate: 1.5, mag: 1, reload: 2.2, spread: .07, adsSpread: .0015, auto: false, eff: 200, range: 320, pd: 48, col: '#b48cff', scope: true, snd: 'sniper' },
};
const WTYPES = Object.keys(WPN);
const HEALS = { shield: { name: 'Shield Soda', time: 2, max: 3, c: '#5fb8ff' }, med: { name: 'Med Kit', time: 3.5, max: 2, c: '#ff6b81' } };
const PASTEL = ['#ffb3c7', '#ffd88a', '#a9e3ae', '#a8cdff', '#cfb6ff', '#ffc49a', '#9fe3da', '#ffe58a', '#f5a9d4', '#b3dbff'];
const BOT_COLS = ['#8cc8ff', '#ff8fb8', '#b8e07a', '#ffd166', '#c9a6ff', '#7fd6c2', '#ffb38a', '#9fe3f0', '#ff9f9f', '#f5a9d4'];
const NAMES = ['MOCHI', 'PIXEL', 'BLIP', 'ZORP', 'NOODLE', 'TOFU', 'BOBA', 'FIZZ', 'KIWI', 'PUDDING', 'SPROUT', 'JELLY', 'MUFFIN', 'WISP', 'NUGGET', 'PEBBLE', 'TAFFY', 'GUMMY', 'COMET', 'BEEP', 'SUSHI', 'WAFFLE', 'LUMI', 'DUMPLING', 'POPCORN', 'BISCUIT', 'MARSH', 'DOODLE'];
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#b8e07a' }, { name: 'ANSEM', color: '#ffd166' }];
const VERBS = ['bonked', 'popped', 'booped', 'zapped', 'fizzed', 'sploshed'];
// the storm: each phase waits, then shrinks to r; damage per second outside rises
const PHASES = [{ wait: 75, shrink: 40, r: 125, dmg: 1 }, { wait: 45, shrink: 30, r: 68, dmg: 2 }, { wait: 35, shrink: 25, r: 34, dmg: 4 }, { wait: 25, shrink: 20, r: 15, dmg: 7 }, { wait: 15, shrink: 25, r: 0, dmg: 12 }];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const hexOk = (h) => typeof h === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.trim());
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const wrand = (w) => { let s = 0; for (const v of w) s += v; let r = Math.random() * s; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1; };
const coastR = (a) => 184 + 12 * Math.sin(3 * a + 1) + 7 * Math.sin(5 * a + 2) + 4 * Math.sin(9 * a + .5);
// a bump of height hgt and width sig at (x0, z0)
const bump = (x, z, x0, z0, hgt, sig) => { const dx = x - x0, dz = z - z0; return hgt * Math.exp(-(dx * dx + dz * dz) / (2 * sig * sig)); };
function baseH(x, z) {
  const r = Math.hypot(x, z), R = coastR(Math.atan2(z, x)), land = smooth(clamp((R - r) / 26, 0, 1));
  let h = -3.6 + 7.4 * land;
  h += land * land * (1.5 * Math.sin(x * .031 + 1.3) * Math.cos(z * .027 - .4) + .8 * Math.sin(x * .07 + z * .05));
  h += land * (bump(x, z, 96, -92, 25, 32) + bump(x, z, 52, -136, 11, 18) + bump(x, z, -152, 12, 9, 20) + bump(x, z, 140, -20, 7, 16) + bump(x, z, -60, 150, 5, 14));
  return h;
}
for (const p of POIS) p.h = Math.max(1.7, baseH(p.x, p.z));
function terrainH(x, z) {
  let h = baseH(x, z); const land = smooth(clamp((coastR(Math.atan2(z, x)) - Math.hypot(x, z)) / 26, 0, 1));
  for (const p of POIS) { const d = Math.hypot(x - p.x, z - p.z); if (d > p.r * 1.35) continue; const k = 1 - smooth(clamp((d - p.r * .8) / (p.r * .55), 0, 1)); h = lerp(h, p.h, k * land); }
  return h;
}

export function open({ me = {}, agents = [], onClose = () => {}, _test = null } = {}) {
  if (!me || typeof me !== 'object') me = {};
  const tst = _test && typeof _test === 'object' ? _test : null;
  const myName = String(me.name || 'You').slice(0, 16);
  const mobile = (matchMedia?.('(pointer: coarse)').matches) || innerWidth < 720;
  const N_BOTS = mobile ? 17 : 24;
  const pool = (Array.isArray(agents) ? agents : []).filter((a) => a && typeof a === 'object' && a.name).slice(0, 12);
  for (const f of FALLBACK) if (pool.length < 3 && !pool.some((p) => p.name === f.name)) pool.push({ ...f });
  const crew = pool.map((a, i) => ({ name: String(a.name).toUpperCase().slice(0, 12), color: hexOk(a.color) ? a.color.trim() : BOT_COLS[i % BOT_COLS.length], genes: a.genes || null, real: true }));
  for (const n of NAMES) { if (crew.length >= N_BOTS) break; if (!crew.some((c) => c.name === n)) crew.push({ name: n, color: BOT_COLS[crew.length % BOT_COLS.length], genes: null, real: false }); }

  // ---------------------------------------------------------------- DOM + HUD
  if (!document.querySelector('link[href*="family=Fredoka"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap'; document.head.appendChild(l); }
  const wrap = document.createElement('div');
  wrap.className = 'ry';
  const ICO = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.2 0 3.6 1.3 5.4 3.2 1.8-1.9 3.2-3.2 5.4-3.2 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/></svg>',
    ppl: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
    storm: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 110 10 5 5 0 010-10z" fill-rule="evenodd"/></svg>',
  };
  wrap.innerHTML = `<style>
.ry{position:fixed;inset:0;z-index:2147483000;background:#cfeaff;font-family:${FONT};color:#3b2f5c;user-select:none;-webkit-user-select:none;overflow:hidden;-webkit-tap-highlight-color:transparent}
.ry canvas.ry-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
.ry.locked canvas.ry-cv{cursor:none}
.ry .card{background:rgba(255,255,255,.93);border-radius:18px;box-shadow:0 6px 22px rgba(90,70,150,.18),0 0 0 1.5px rgba(255,255,255,.9) inset}
.ry-btn{width:40px;height:40px;border:0;border-radius:50%;cursor:pointer;font:700 18px/1 ${FONT};color:#3b2f5c;display:grid;place-items:center}
.ry-btn:hover{transform:scale(1.06)}
.ry-x{position:absolute;top:12px;right:12px}.ry-mute{position:absolute;top:12px;right:60px}.ry-topbtn{position:absolute;top:12px;right:108px;font-size:12px}
.ry-map{position:absolute;top:12px;left:12px;padding:6px;line-height:0;cursor:pointer}
.ry-map canvas{width:164px;height:164px;border-radius:14px}
.ry-zone{position:absolute;top:190px;left:12px;padding:4px 12px;font-size:13px;font-weight:700;color:#6f6496}
.ry-ca{position:absolute;top:226px;left:12px;display:flex;align-items:center;gap:8px;padding:5px 12px;font-weight:700;font-size:13px;pointer-events:auto;white-space:nowrap}.ry-ca b{color:#e0469a}.ry-ca button{border:0;background:#f3eefc;color:#3b2f5c;border-radius:999px;padding:4px 10px;font:600 13px ${FONT};cursor:pointer}.ry-ca a{color:#3d7fb0;text-decoration:none}
.ry.touch .ry-ca{top:158px;font-size:11px;padding:3px 9px}
.ry-stormbox{position:absolute;top:12px;left:50%;transform:translateX(-50%);padding:7px 16px 7px 10px;display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;white-space:nowrap}
.ry-stormbox svg{width:22px;height:22px;fill:#b06bff}
.ry-stormbox b{color:#b06bff;font-variant-numeric:tabular-nums;font-size:18px}
.ry-stormbox small{color:#9a8fbf;font-size:12px}
.ry-stormbox.closing svg{animation:ryspin 2s linear infinite}.ry-stormbox.closing b{color:#e0469a}
@keyframes ryspin{to{transform:rotate(360deg)}}
.ry-right{position:absolute;top:62px;right:12px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:330px}
.ry-count{padding:7px 12px;display:flex;gap:14px;font-weight:700;font-size:17px}
.ry-count span{display:flex;align-items:center;gap:5px}.ry-count svg{width:20px;height:20px}
.ry-count .al svg{fill:#5b7cf0}.ry-count .el svg{fill:#ffb52e}
.ry-count small{font-size:11px;color:#9a8fbf;font-weight:600}
.ry-feed{display:flex;flex-direction:column;gap:5px;align-items:flex-end}
.ry-feed div{background:rgba(255,255,255,.93);border-radius:12px;padding:5px 10px;font-size:13px;font-weight:600;box-shadow:0 4px 14px rgba(90,70,150,.15);animation:ryin .25s ease}
.ry-feed div b{color:#ff6b81}.ry-feed div em{font-style:normal;color:#8a7fb4;font-size:12px}.ry-feed div.me{background:#fff4d6}.ry-feed div i{font-style:normal;color:#5b7cf0}
@keyframes ryin{from{transform:translateX(20px);opacity:0}}
.ry-vit{position:absolute;left:12px;bottom:14px;padding:9px 12px;display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:14px}
.ry-vit .row{display:flex;align-items:center;gap:8px}
.ry-vit svg{width:20px;height:20px}.ry-vit .hp svg{fill:#ff6b81}.ry-vit .sh svg{fill:#4fa3ff}
.ry-vit .bar{width:170px;height:14px;border-radius:9px;background:#f1ecf8;overflow:hidden;box-shadow:0 0 0 1.5px #e6def5 inset}
.ry-vit .bar i{display:block;height:100%;width:100%;border-radius:9px;transition:width .15s}
.ry-vit .hp .bar i{background:linear-gradient(#8ff0b4,#3fcf86)}.ry-vit .sh .bar i{background:linear-gradient(#9fd2ff,#4fa3ff)}
.ry-vit.low .hp .bar i{background:linear-gradient(#ffb0bd,#ff6b81)}
.ry-vit span{min-width:28px;text-align:right;font-variant-numeric:tabular-nums}
.ry-hot{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:7px;align-items:flex-end}
.ry-sl{position:relative;width:62px;height:62px;border-radius:14px;background:rgba(255,255,255,.88);box-shadow:0 4px 14px rgba(90,70,150,.18),0 0 0 2px rgba(255,255,255,.95) inset;display:grid;place-items:center;transition:transform .12s;cursor:pointer}
.ry-sl img{width:52px;height:35px;object-fit:contain;pointer-events:none}
.ry-sl kbd{position:absolute;left:5px;top:3px;font:700 11px ${FONT};color:#8a7fb4}
.ry-sl b{position:absolute;right:6px;bottom:2px;font-size:12px;color:#3b2f5c}
.ry-sl.on{transform:translateY(-8px) scale(1.08);box-shadow:0 8px 18px rgba(90,70,150,.28),0 0 0 3px #fff inset,0 0 0 3px #3b2f5c}
.ry-sl.r0{background:linear-gradient(#e4e6ee,#c3c6d4)}.ry-sl.r1{background:linear-gradient(#bff0c4,#7fd88a)}.ry-sl.r2{background:linear-gradient(#c4e1ff,#78b8ff)}.ry-sl.r3{background:linear-gradient(#e2c8ff,#b984ff)}.ry-sl.r4{background:linear-gradient(#ffe2a6,#ffbc45)}
.ry-sl.pk{width:54px;height:54px}
.ry-sl .chan{position:absolute;left:4px;right:4px;bottom:4px;height:5px;border-radius:3px;background:rgba(255,255,255,.6);overflow:hidden;display:none}
.ry-ammo{position:absolute;right:12px;bottom:14px;padding:8px 14px;text-align:right;min-width:150px}
.ry-ammo .nm{font-weight:700;font-size:14px}.ry-ammo .nm em{font-style:normal;font-size:12px}
.ry-ammo .am{font-weight:700;font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}.ry-ammo .am small{font-size:14px;color:#9a8fbf}
.ry-mats{position:absolute;right:12px;bottom:96px;padding:6px 12px;display:flex;align-items:center;gap:7px;font-weight:700;font-size:16px}
.ry-mats i{width:22px;height:16px;border-radius:4px;background:repeating-linear-gradient(#f1c58e 0 4px,#e2a868 4px 5px);box-shadow:0 0 0 1.5px #c98a4c inset}
.ry-build{position:absolute;left:50%;bottom:96px;transform:translateX(-50%);padding:6px 8px;display:none;gap:6px;align-items:center;font-weight:700;font-size:13px}
.ry-build div{padding:6px 12px;border-radius:12px;background:#f3eefc;display:flex;align-items:center;gap:6px}
.ry-build div.on{background:#5b7cf0;color:#fff}
.ry-build kbd{font:700 11px ${FONT};background:#3b2f5c;color:#fff;border-radius:6px;padding:1px 6px}
.ry-build .lbl{background:none;color:#5b7cf0;padding:6px 6px}
.ry.building .ry-build{display:flex}.ry.building .ry-hint{display:none}
.ry-cross{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;pointer-events:none;left:50%;top:50%}
.ry-cross:before,.ry-cross:after{content:"";position:absolute;left:50%;top:50%;background:#fff;box-shadow:0 0 0 1.5px rgba(59,47,92,.55);border-radius:2px}
.ry-cross:before{width:16px;height:3px;margin:-1.5px 0 0 -8px}.ry-cross:after{width:3px;height:16px;margin:-8px 0 0 -1.5px}
.ry-cross.hm:before,.ry-cross.hm:after{background:#ff6b81;transform:rotate(45deg) scale(1.5)}
.ry-cross.hd:before,.ry-cross.hd:after{background:#ffb52e;transform:rotate(45deg) scale(1.8)}
.ry-cross.wide:before{width:30px;margin-left:-15px}.ry-cross.wide:after{height:30px;margin-top:-15px}
.ry-scope{position:absolute;inset:0;pointer-events:none;display:none;background:radial-gradient(circle at 50% 50%,transparent 0,transparent 31vmin,rgba(59,47,92,.85) 31.3vmin)}
.ry-scope:before,.ry-scope:after{content:"";position:absolute;background:rgba(59,47,92,.7)}.ry-scope:before{left:50%;top:19vh;bottom:19vh;width:2px;margin-left:-1px}.ry-scope:after{top:50%;left:calc(50% - 31vmin);right:calc(50% - 31vmin);height:2px;margin-top:-1px}
.ry-prompt{position:absolute;left:50%;bottom:170px;transform:translateX(-50%);padding:8px 16px;font-weight:600;font-size:15px;display:none;white-space:nowrap}
.ry-prompt kbd{display:inline-block;min-width:22px;padding:2px 6px;border-radius:7px;background:#3b2f5c;color:#fff;font:700 13px ${FONT};margin:0 3px}
.ry-prompt .r{font-weight:700}
.ry-chan{position:absolute;left:50%;top:60%;transform:translateX(-50%);padding:8px 14px;display:none;flex-direction:column;align-items:center;gap:6px;font-weight:700;font-size:14px}
.ry-chan .bar{width:200px;height:10px;border-radius:7px;background:#eef0fb;overflow:hidden}
.ry-chan .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#9fd2ff,#5b7cf0)}
.ry-hint{position:absolute;left:12px;bottom:110px;font-size:12px;font-weight:600;color:#6f6496;background:rgba(255,255,255,.75);padding:5px 12px;border-radius:12px;white-space:nowrap}
.ry-toast{position:absolute;left:50%;top:64px;transform:translateX(-50%);padding:8px 18px;font-weight:700;font-size:17px;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;white-space:nowrap}
.ry-toast.on{opacity:1;transform:translateX(-50%) translateY(6px)}
.ry-hurt{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px 30px rgba(255,107,129,.55);opacity:0;transition:opacity .35s}
.ry-tint{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(190,110,255,.12),rgba(160,70,230,.45));opacity:0;transition:opacity .6s}
.ry-big{position:absolute;left:50%;top:28%;transform:translate(-50%,-50%);font:700 44px ${FONT};color:#ffcf4a;text-shadow:0 4px 0 #d08a00,0 8px 18px rgba(90,70,150,.35);pointer-events:none;opacity:0;white-space:nowrap;text-align:center;letter-spacing:1px}
.ry-big small{display:block;font-size:18px;color:#fff;text-shadow:0 2px 0 #b48cff}
.ry-big.purple{color:#d9b8ff;text-shadow:0 4px 0 #7d3fd4,0 8px 18px rgba(90,70,150,.35)}
.ry-big.on{animation:rybig 1.8s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes rybig{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-8deg)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.1) rotate(3deg)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
.ry-dmg{position:absolute;pointer-events:none;font:700 20px ${FONT};color:#fff;text-shadow:0 2px 0 #3b2f5c,0 0 6px rgba(59,47,92,.4);transform:translate(-50%,-50%);white-space:nowrap}
.ry-dmg.sh{color:#9fd2ff}.ry-dmg.hd{color:#ffcf4a;font-size:26px}
.ry-busbar{position:absolute;left:50%;top:70px;transform:translateX(-50%);padding:9px 18px;display:none;flex-direction:column;align-items:center;gap:6px;font-weight:700;font-size:16px;white-space:nowrap}
.ry-busbar kbd{display:inline-block;min-width:22px;padding:2px 8px;border-radius:7px;background:#3b2f5c;color:#fff;font:700 13px ${FONT};margin:0 3px}
.ry-busbar .bar{width:240px;height:8px;border-radius:6px;background:#eef0fb;overflow:hidden}.ry-busbar .bar i{display:block;height:100%;background:linear-gradient(90deg,#ffb3c7,#b06bff);width:0}
.ry-alt{position:absolute;right:24px;top:50%;transform:translateY(-50%);padding:8px 10px;display:none;font-weight:700;font-size:14px;text-align:center}
.ry-alt b{display:block;font-size:22px}
.ry-bigmap{position:absolute;inset:0;display:none;place-items:center;background:rgba(207,234,255,.45);backdrop-filter:blur(3px)}
.ry-bigmap .card{padding:10px;line-height:0;position:relative}
.ry-bigmap canvas{width:min(560px,calc(100vw - 48px),calc(100vh - 80px));height:min(560px,calc(100vw - 48px),calc(100vh - 80px));border-radius:14px}
.ry-bigmap .x{position:absolute;right:-12px;top:-12px}
.ry-modal{position:absolute;inset:0;display:none;place-items:center;background:rgba(207,234,255,.45);backdrop-filter:blur(3px);overflow:auto}
.ry-modal .card{padding:22px 28px;text-align:center;max-width:min(470px,calc(100vw - 32px));animation:rycard .4s cubic-bezier(.2,1.6,.4,1);margin:16px 0}
@keyframes rycard{from{transform:scale(.6) rotate(-6deg);opacity:0}}
.ry-modal h1{margin:0 0 6px;font-size:46px;line-height:1;letter-spacing:1.5px;color:#9b7cf0;text-shadow:0 4px 0 #e2d6ff}
.ry-modal h1.win{font-size:40px;color:#ffb52e;text-shadow:0 4px 0 #ffe7b0,0 10px 24px rgba(255,181,46,.35)}
.ry-modal h1.out{color:#ff6b81;text-shadow:0 4px 0 #ffd6de}
.ry-modal .num{font-size:74px;line-height:1;font-weight:700;color:#ffb52e;text-shadow:0 5px 0 #d98400;margin:4px 0 2px}
.ry-modal p{margin:6px 0;font-size:15px;font-weight:500;color:#5d5288}
.ry-modal .row{display:flex;justify-content:center;gap:10px;margin:14px 0 6px;flex-wrap:wrap}
.ry-modal .row div{background:#f6f2ff;border-radius:14px;padding:8px 12px;min-width:80px}
.ry-modal .row b{display:block;font-size:22px;color:#3b2f5c}.ry-modal .row span{font-size:12px;color:#8a7fb4;font-weight:600}
.ry-modal button{margin:12px 4px 0;border:0;border-radius:16px;padding:11px 24px;font:700 17px ${FONT};color:#fff;background:linear-gradient(#b89cff,#8f6bf0);box-shadow:0 5px 0 #6a4bc7;cursor:pointer}
.ry-modal button.sec{background:linear-gradient(#fff,#f1ecfb);color:#5b4f7a;box-shadow:0 5px 0 #d6cdee}
.ry-modal button:active{transform:translateY(3px);box-shadow:0 2px 0 #6a4bc7}
.ry-modal .keys{display:grid;grid-template-columns:auto auto;gap:5px 14px;text-align:left;margin:12px auto 0;font-size:14px;font-weight:500;width:max-content;max-width:100%}
.ry-modal .keys kbd{display:inline-block;padding:1px 7px;border-radius:7px;background:#3b2f5c;color:#fff;font:700 12px ${FONT};margin-right:3px}
.ry-topcard{margin:10px auto 0;max-width:280px}
.ry .hd{font-weight:700;font-size:14px;margin-bottom:6px}.ry .hd small{font-size:11px;color:#9a8fbf;margin-left:6px}
.ry-top10{list-style:none;margin:0;padding:0;font-size:13px;text-align:left}
.ry-top10 li{display:flex;gap:8px;padding:3px 6px;border-radius:8px}.ry-top10 li:nth-child(odd){background:#f6f2ff}
.ry-top10 span{width:18px;color:#9a8fbf;font-weight:700}.ry-top10 b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ry-top10 em{font-style:normal;font-weight:700;color:#9b7cf0}
.ry-topbox{position:absolute;top:224px;left:12px;padding:10px 14px;display:none;min-width:190px}
.ry-touch{position:absolute;inset:0;pointer-events:none;display:none}
.ry.touch .ry-touch{display:block}.ry.touch .ry-hint{display:none}
.ry-joy{position:absolute;left:22px;bottom:150px;width:124px;height:124px;border-radius:50%;background:rgba(255,255,255,.45);box-shadow:0 0 0 2px rgba(255,255,255,.8) inset;pointer-events:auto;touch-action:none}
.ry-joy i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 4px 12px rgba(90,70,150,.25)}
.ry-tb{position:absolute;width:58px;height:58px;border-radius:50%;border:0;pointer-events:auto;touch-action:none;font:700 12px ${FONT};color:#3b2f5c;background:rgba(255,255,255,.9);box-shadow:0 5px 14px rgba(90,70,150,.25)}
.ry-tb.fire{width:80px;height:80px;background:linear-gradient(#ff9fae,#ff6b81);color:#fff;font-size:15px}
.ry-tb.bld.on{background:#5b7cf0;color:#fff}
.ry.touch .ry-map canvas{width:108px;height:108px}
.ry.touch .ry-zone{top:128px;font-size:11px;padding:3px 9px}
.ry.touch .ry-stormbox{top:10px;font-size:12px;padding:5px 10px 5px 7px;left:auto;right:58px;transform:none}.ry.touch .ry-stormbox b{font-size:14px}.ry.touch .ry-stormbox small{display:none}
.ry.touch .ry-mute,.ry.touch .ry-topbtn{display:none}
.ry.touch .ry-right{top:52px}.ry.touch .ry-count{font-size:14px;padding:5px 10px}
.ry.touch .ry-feed div{font-size:11px;padding:4px 8px}
.ry.touch .ry-vit{bottom:auto;top:160px;left:12px;padding:6px 9px;gap:4px;font-size:12px}.ry.touch .ry-vit .bar{width:84px;height:10px}.ry.touch .ry-vit svg{width:15px;height:15px}
.ry.touch .ry-hot{bottom:10px;gap:4px}.ry.touch .ry-sl{width:46px;height:46px;border-radius:11px}.ry.touch .ry-sl img{width:40px;height:26px}.ry.touch .ry-sl.pk{width:40px;height:40px}.ry.touch .ry-sl kbd{display:none}
.ry.touch .ry-ammo{bottom:auto;top:160px;right:12px;padding:5px 10px;min-width:0}.ry.touch .ry-ammo .am{font-size:18px}.ry.touch .ry-ammo .nm{font-size:11px}
.ry.touch .ry-mats{bottom:auto;top:222px;right:12px;font-size:13px;padding:4px 10px}
.ry.touch .ry-build{bottom:70px;font-size:11px}
.ry.touch .ry-prompt{bottom:auto;top:270px;font-size:13px}
.ry.touch .ry-big{font-size:30px}
.ry.touch .ry-busbar{top:150px;font-size:13px}
.ry.touch .ry-modal h1{font-size:34px}.ry.touch .ry-modal .num{font-size:56px}
</style>
<canvas class="ry-cv"></canvas>
<div class="ry-tint"></div><div class="ry-hurt"></div><div class="ry-scope"></div>
<div class="ry-map card"><canvas width="328" height="328"></canvas></div>
<div class="ry-zone card"></div>
<div class="ry-stormbox card">${ICO.storm}<span class="t"></span></div>
<div class="ry-ca card"><b>CA</b><button type="button" title="Copy the contract address" onclick="navigator.clipboard?.writeText('HvP63MU4UVx6iHWuYEDtGKVqNWjjTjRdYqdZ9NHcpump').then(()=>{this.textContent='copied!';setTimeout(()=>{this.textContent='HvP6…Hcpump'},1500)}).catch(()=>{this.textContent='HvP63MU4UVx6iHWuYEDtGKVqNWjjTjRdYqdZ9NHcpump'})">HvP6…Hcpump</button><a href="https://pump.fun/coin/HvP63MU4UVx6iHWuYEDtGKVqNWjjTjRdYqdZ9NHcpump" target="_blank" rel="noopener">pump.fun</a></div>
<button class="ry-btn ry-mute card" aria-label="Toggle sound"></button>
<button class="ry-btn ry-x card" aria-label="Close Agent Royale">✕</button>
<button class="ry-btn ry-topbtn card" aria-label="Top players">TOP</button>
<div class="ry-right"><div class="ry-count card"><span class="al">${ICO.ppl}<b>0</b></span><span class="el">${ICO.star}<b>0</b></span></div><div class="ry-feed"></div></div>
<div class="ry-topbox card"></div>
<div class="ry-vit card"><div class="row sh">${ICO.shield}<div class="bar"><i></i></div><span></span></div><div class="row hp">${ICO.heart}<div class="bar"><i></i></div><span></span></div></div>
<div class="ry-build card"><span class="lbl">BUILD</span><div data-p="wall"><kbd>Z</kbd>Wall</div><div data-p="floor"><kbd>X</kbd>Floor</div><div data-p="ramp"><kbd>C</kbd>Ramp</div><span class="lbl">10 wood</span></div>
<div class="ry-hot"></div>
<div class="ry-mats card"><i></i><span>0</span></div>
<div class="ry-ammo card"><div class="nm"></div><div class="am"></div></div>
<div class="ry-cross"></div>
<div class="ry-prompt card"></div>
<div class="ry-chan card"><span></span><div class="bar"><i></i></div></div>
<div class="ry-busbar card"></div>
<div class="ry-alt card"><b>0</b>m</div>
<div class="ry-toast card"></div>
<div class="ry-big"></div>
<div class="ry-hint">WASD move · Shift sprint · Space jump · Click shoot · Right-click aim · R reload · E open / pick up · 1-5 slots · F pickaxe · Q build (Z wall · X floor · C ramp) · M map</div>
<div class="ry-touch"><div class="ry-joy"><i></i></div>
<button class="ry-tb fire" data-b="fire" style="right:20px;bottom:150px">FIRE</button>
<button class="ry-tb" data-b="jump" style="right:112px;bottom:118px">JUMP</button>
<button class="ry-tb" data-b="use" style="right:28px;bottom:244px">E</button>
<button class="ry-tb bld" data-b="build" style="right:108px;bottom:196px;width:52px;height:52px;font-size:11px">BUILD</button>
<button class="ry-tb" data-b="piece" style="right:100px;bottom:262px;width:48px;height:48px;font-size:10px">PIECE</button>
<button class="ry-tb" data-b="reload" style="right:34px;bottom:316px;width:48px;height:48px;font-size:10px">RELOAD</button></div>
<div class="ry-bigmap"><div class="card"><canvas width="1040" height="1040"></canvas><button class="ry-btn x card" aria-label="Close map">✕</button></div></div>
<div class="ry-modal"><div class="card"></div></div>`;
  document.body.appendChild(wrap);
  if (mobile) wrap.classList.add('touch');
  const $ = (s) => wrap.querySelector(s);
  const cv = $('.ry-cv'), mapCv = $('.ry-map canvas'), mctx = mapCv.getContext('2d'), zoneEl = $('.ry-zone'), stormEl = $('.ry-stormbox'), stormTxt = $('.ry-stormbox .t');
  const aliveEl = $('.ry-count .al b'), elimEl = $('.ry-count .el b'), feedEl = $('.ry-feed'), vitEl = $('.ry-vit'), hpBar = $('.ry-vit .hp .bar i'), hpNum = $('.ry-vit .hp span'), shBar = $('.ry-vit .sh .bar i'), shNum = $('.ry-vit .sh span');
  const hotEl = $('.ry-hot'), matsEl = $('.ry-mats span'), ammoNm = $('.ry-ammo .nm'), ammoAm = $('.ry-ammo .am'), ammoBox = $('.ry-ammo'), buildEl = $('.ry-build'), crossEl = $('.ry-cross'), scopeEl = $('.ry-scope');
  const promptEl = $('.ry-prompt'), chanEl = $('.ry-chan'), chanTxt = $('.ry-chan span'), chanBar = $('.ry-chan .bar i'), busEl = $('.ry-busbar'), altEl = $('.ry-alt'), altNum = $('.ry-alt b'), toastEl = $('.ry-toast'), bigEl = $('.ry-big');
  const hurtEl = $('.ry-hurt'), tintEl = $('.ry-tint'), bigMap = $('.ry-bigmap'), bigCv = $('.ry-bigmap canvas'), bctx = bigCv.getContext('2d'), modal = $('.ry-modal'), modalCard = $('.ry-modal .card');
  const muteBtn = $('.ry-mute'), closeBtn = $('.ry-x'), topBtn = $('.ry-topbtn'), topEl = $('.ry-topbox');

  // ---------------------------------------------------------------- renderer + scene
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const FOG = new THREE.Color('#cfe8fb'), FOG_STORM = new THREE.Color('#c9a3f0');
  scene.fog = new THREE.Fog(FOG.clone(), 220, 720);
  const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.environment = envTex; scene.environmentIntensity = .28;
  const camera = new THREE.PerspectiveCamera(62, 1, .1, 1600);
  const hemi = new THREE.HemisphereLight('#a9d6ff', '#c8a98a', .8); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe9c9', 1.85); sun.castShadow = true;
  const SH = mobile ? 36 : 50; Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 260 });
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .05; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const disposables = new Set(), track = (o) => { disposables.add(o); return o; };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return track(t); };
  const matCache = new Map(), std = (color, o = {}) => { const k = color + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, track(new THREE.MeshStandardMaterial({ color, roughness: .7, ...o }))); return matCache.get(k); };
  const gloss = (color) => { const k = 'g' + color; if (!matCache.has(k)) matCache.set(k, track(new THREE.MeshPhysicalMaterial({ color, roughness: .3, metalness: .05, clearcoat: 1, clearcoatRoughness: .12 }))); return matCache.get(k); };
  const basic = (color, o = {}) => track(new THREE.MeshBasicMaterial({ color, ...o }));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };
  const geo = (g) => track(g);
  const GC = {}, gg = (k, f) => GC[k] || (GC[k] = geo(f()));
  const tint = (g0, color) => { const g = g0.index ? g0.toNonIndexed() : g0; if (g !== g0) g0.dispose(); const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const shade = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#5b4f7a'), k).getHexString();
  const lighten = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
  const starPath = (x, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); };

  // sky dome, puffy clouds
  { const g = geo(new THREE.SphereGeometry(900, 32, 16)), p = g.attributes.position, cols = [], top = new THREE.Color('#4aa8ff'), hor = new THREE.Color('#cdeafd'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const k = clamp(p.getY(i) / 900, 0, 1); c.copy(hor).lerp(top, Math.pow(k, .55)); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const sky = new THREE.Mesh(g, basic('#ffffff', { vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -1; scene.add(sky); }
  const clouds = [];
  { const cg = geo(new THREE.SphereGeometry(1, 14, 10)), cm = std('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: .35 });
    for (let i = 0; i < 16; i++) { const g = new THREE.Group(); g.position.set(rnd(-500, 500), rnd(140, 190), rnd(-500, 500)); for (let k = 0; k < 5; k++) { const m = mesh(cg, cm, (k - 2) * rnd(6, 8), rnd(-1, 2), rnd(-3, 3), g, false); m.scale.set(rnd(8, 13), rnd(5, 8), rnd(7, 10)); } scene.add(g); clouds.push(g); } }

  // ---------------------------------------------------------------- the island
  const HM = new Float32Array((HN + 1) * (HN + 1));
  for (let j = 0; j <= HN; j++) for (let i = 0; i <= HN; i++) HM[j * (HN + 1) + i] = terrainH(H0 + i * HS, H0 + j * HS);
  function groundAt(x, z) {
    const fx = (x - H0) / HS, fz = (z - H0) / HS; if (fx < 0 || fz < 0 || fx >= HN || fz >= HN) return -3.6;
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * (HN + 1) + i;
    return (HM[k] * (1 - tx) + HM[k + 1] * tx) * (1 - tz) + (HM[k + HN + 1] * (1 - tx) + HM[k + HN + 2] * tx) * tz;
  }
  const poiAt = (x, z, pad = 1) => POIS.find((p) => Math.hypot(x - p.x, z - p.z) < p.r * pad) || null;
  const GROUND_COL = { sand: new THREE.Color('#f8e6ba'), sand2: new THREE.Color('#f3d9a0'), grass: new THREE.Color('#b4e39a'), grass2: new THREE.Color('#9fd98a'), high: new THREE.Color('#cfe8a6'), rock: new THREE.Color('#d6cbe6'), snow: new THREE.Color('#ffffff'), pave: new THREE.Color('#f1e6f7'), pave2: new THREE.Color('#e6d9f2'), farm: new THREE.Color('#d9e9a0'), farm2: new THREE.Color('#c9d98a'), wet: new THREE.Color('#e9d29a') };
  function groundColor(x, z, h, c) {
    const n = Math.sin(x * .13) * Math.cos(z * .11) * .5 + .5;
    const coast = coastR(Math.atan2(z, x)) - Math.hypot(x, z);
    if (h < .5) c.copy(GROUND_COL.wet).lerp(GROUND_COL.sand2, clamp(h + .5, 0, 1));
    else if (coast < 12 + n * 4) c.copy(GROUND_COL.sand).lerp(GROUND_COL.sand2, n * .5);
    else { c.copy(GROUND_COL.grass).lerp(GROUND_COL.grass2, n); if (h > 9) c.lerp(GROUND_COL.high, clamp((h - 9) / 6, 0, 1)); if (h > 17) c.lerp(GROUND_COL.rock, clamp((h - 17) / 5, 0, 1)); if (h > 24) c.lerp(GROUND_COL.snow, clamp((h - 24) / 2, 0, 1)); }
    const p = poiAt(x, z, .82);
    if (p?.id === 'plaza') c.copy(GROUND_COL.pave).lerp(GROUND_COL.pave2, ((Math.floor(x / 4) + Math.floor(z / 4)) & 1) * .6);
    else if (p?.id === 'farm' && x > p.x - 4) c.copy(GROUND_COL.farm).lerp(GROUND_COL.farm2, (Math.floor(z / 3) & 1) * .7);
    else if (p?.id === 'cove' || p?.id === 'docks') c.lerp(GROUND_COL.sand, .55);
    return c;
  }
  const terrain = (() => {
    const g = new THREE.PlaneGeometry(HN * HS, HN * HS, HN, HN).rotateX(-Math.PI / 2), p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), i = Math.round((x - H0) / HS), j = Math.round((z - H0) / HS), h = HM[j * (HN + 1) + i]; p.setY(k, h); groundColor(x, z, h, c); cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = mesh(geo(g), std('#ffffff', { vertexColors: true, roughness: .95 }), 0, 0, 0, scene, false); m.receiveShadow = true; return m; })();
  const water = mesh(geo(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2)), track(new THREE.MeshStandardMaterial({ color: '#5cc8ee', roughness: .1, metalness: .1, transparent: true, opacity: .84, envMapIntensity: 1.3 })), 0, 0, 0, scene, false);
  // a soft foam ring where the sand meets the sea
  { const pts = []; for (let k = 0; k <= 180; k++) { const a = k / 180 * TAU; let lo = 120, hi = 230; for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (groundAt(Math.cos(a) * m, Math.sin(a) * m) > 0) lo = m; else hi = m; } pts.push([Math.cos(a), Math.sin(a), lo]); }
    const pos = [], idx = []; pts.forEach(([cx, sz, r], k) => { pos.push(cx * (r - .4), .05, sz * (r - .4), cx * (r + 2.6), .05, sz * (r + 2.6)); if (k < pts.length - 1) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    mesh(geo(g), basic('#ffffff', { transparent: true, opacity: .55, depthWrite: false }), 0, 0, 0, scene, false); }

  // ---------------------------------------------------------------- solids: every box you bump into, stand on or shoot (spatial hash)
  const CELL = 8, hash = new Map(); let stamp = 1;
  const hk = (i, j) => (i + 500) * 2000 + (j + 500);
  function indexSolid(s, on = true) {
    for (let i = Math.floor(s.x0 / CELL); i <= Math.floor(s.x1 / CELL); i++) for (let j = Math.floor(s.z0 / CELL); j <= Math.floor(s.z1 / CELL); j++) { const k = hk(i, j); let a = hash.get(k); if (on) { if (!a) hash.set(k, a = []); a.push(s); } else if (a) { const n = a.indexOf(s); if (n >= 0) a.splice(n, 1); } }
  }
  const addSolid = (x0, x1, y0, y1, z0, z1, kind = 'world', ref = null) => { const s = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), kind, ref, st: 0 }; indexSolid(s); return s; };
  function nearSolids(x, z, r, fn) {
    const st = ++stamp;
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) { const a = hash.get(hk(i, j)); if (!a) continue; for (const s of a) { if (s.st === st) continue; s.st = st; fn(s); } }
  }
  const rampH = (s, x, z) => { const p = s.ref; let t; if (p.dir === 0) t = (z - s.z0) / G; else if (p.dir === 1) t = (x - s.x0) / G; else if (p.dir === 2) t = (s.z1 - z) / G; else t = (s.x1 - x) / G; return p.y0 + LV * clamp(t, 0, 1); };
  // the surface under a point at height y (terrain, a roof or floor you can step up on, a ramp)
  function supportAt(x, z, y, step = .55) {
    let g = groundAt(x, z);
    nearSolids(x, z, .3, (s) => {
      if (x < s.x0 - .25 || x > s.x1 + .25 || z < s.z0 - .25 || z > s.z1 + .25) return;
      if (s.kind === 'ramp') { if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) return; const h = rampH(s, x, z); if (h <= y + step + .35 && h > g) g = h; return; }
      if (s.y1 <= y + step && s.y1 > g) g = s.y1;
    });
    return g;
  }
  // push a body of radius r out of every wall it overlaps; returns true if it bumped something
  function pushOut(a, r, hgt = 1.7) {
    let hit = false;
    nearSolids(a.x, a.z, r + .5, (s) => {
      if (s.kind === 'ramp' || s.kind === 'deco') return;
      if (a.y + hgt <= s.y0 + .05 || a.y + .55 >= s.y1) return;
      const cx = clamp(a.x, s.x0, s.x1), cz = clamp(a.z, s.z0, s.z1); let dx = a.x - cx, dz = a.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) return;
      hit = true;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; a.x += dx * k; a.z += dz * k; }
      else { const l = a.x - s.x0, rr = s.x1 - a.x, b = a.z - s.z0, f = s.z1 - a.z, m = Math.min(l, rr, b, f); if (m === l) a.x = s.x0 - r; else if (m === rr) a.x = s.x1 + r; else if (m === b) a.z = s.z0 - r; else a.z = s.z1 + r; }
    });
    return hit;
  }
  // the lowest ceiling over a point above y (so jumps bonk floors)
  function ceilingAt(x, z, y) { let c = 1e9; nearSolids(x, z, .2, (s) => { if (s.kind === 'ramp' || s.kind === 'deco') return; if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) return; if (s.y0 > y + .3 && s.y0 < c) c = s.y0; }); return c; }
  const slab = (o, d, lo, hi, r) => { if (Math.abs(d) < 1e-9) return o >= lo && o <= hi; let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const t = a; a = b; b = t; } if (a > r[0]) r[0] = a; if (b < r[1]) r[1] = b; return r[0] <= r[1]; };
  const RB = [0, 0];
  const rayBox = (ox, oy, oz, dx, dy, dz, s, maxT) => { RB[0] = 0; RB[1] = maxT; if (!slab(ox, dx, s.x0, s.x1, RB) || !slab(oy, dy, s.y0, s.y1, RB) || !slab(oz, dz, s.z0, s.z1, RB)) return -1; return RB[0]; };
  // the first thing a ray hits: terrain, a solid (world, tree, piece, ramp) or nothing; actors are tested separately
  function raySolid(o, d, maxT) {
    let best = maxT, hit = null;
    // terrain: march, then refine
    if (d.y < .6) { const stepL = 2; let prev = 0; for (let t = stepL; t <= best + stepL; t += stepL) { const tt = Math.min(t, best), y = o.y + d.y * tt; if (y < groundAt(o.x + d.x * tt, o.z + d.z * tt)) { let lo = prev, hi = tt; for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (o.y + d.y * m < groundAt(o.x + d.x * m, o.z + d.z * m)) hi = m; else lo = m; } best = hi; hit = { kind: 'ground' }; break; } prev = tt; if (tt >= best) break; } }
    // solids: walk the hash along the ray
    const st = ++stamp, hz = Math.hypot(d.x, d.z), n = Math.ceil(best * Math.max(hz, .05) / (CELL / 2)) + 1;
    for (let k = 0; k <= n; k++) {
      const t = Math.min(best, k * CELL / 2 / Math.max(hz, .05)), px = o.x + d.x * t, pz = o.z + d.z * t;
      for (let i = Math.floor((px - 4) / CELL); i <= Math.floor((px + 4) / CELL); i++) for (let j = Math.floor((pz - 4) / CELL); j <= Math.floor((pz + 4) / CELL); j++) {
        const a = hash.get(hk(i, j)); if (!a) continue;
        for (const s of a) { if (s.st === st) continue; s.st = st; if (s.kind === 'deco') continue;
          let t0 = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, s, best); if (t0 < 0) continue;
          if (s.kind === 'ramp') { let ok = false; for (let q = 0; q < 8; q++) { const tq = t0 + q * .6; if (tq > best) break; const x = o.x + d.x * tq, z = o.z + d.z * tq; if (x < s.x0 - .01 || x > s.x1 + .01 || z < s.z0 - .01 || z > s.z1 + .01) break; if (o.y + d.y * tq <= rampH(s, x, z) + .2) { t0 = tq; ok = true; break; } } if (!ok) continue; }
          if (t0 < best) { best = t0; hit = { kind: s.kind, s }; } }
      }
      if (k * CELL / 2 / Math.max(hz, .05) > best) break;
    }
    return { t: best, hit };
  }

  // ---------------------------------------------------------------- building the world: one merged mesh of tinted boxes
  const parts = [], glossParts = [];
  const box = (x, y, z, w, h, d, color, { col = true, rad = 0, gl = false, kind = 'world' } = {}) => { const g = rad ? new RoundedBoxGeometry(w, h, d, 2, rad) : new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); (gl ? glossParts : parts).push(tint(g, color)); if (col) return addSolid(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, kind); return null; };
  const cyl = (x, y, z, r0, r1, h, color, seg = 12, gl = false) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y + h / 2, z); (gl ? glossParts : parts).push(tint(g, color)); };
  const cone = (x, y, z, r, h, color, seg = 4, rot = Math.PI / 4) => { const g = new THREE.ConeGeometry(r, h, seg); g.rotateY(rot); g.translate(x, y + h / 2, z); parts.push(tint(g, color)); };
  const sph = (x, y, z, r, color, gl = true) => { const g = new THREE.SphereGeometry(r, 14, 10); g.translate(x, y, z); (gl ? glossParts : parts).push(tint(g, color)); };
  const lootSpots = [], chestSpots = [], houses = [];
  const ROOFS = ['#ff8fa0', '#8cc8ff', '#b48cff', '#7fd6c2', '#ffb38a', '#ff8fb8', '#ffd36e'];
  // a little house you can walk into: four walls with a doorway (door: 0 +z, 1 +x, 2 -z, 3 -x), windows, a pitched or flat roof
  function house(cx, cz, w, d, door, color, roof, { flat = false, H = 3.6, chest = .75, base = null } = {}) {
    const y = base ?? Math.max(groundAt(cx - w / 2, cz - d / 2), groundAt(cx + w / 2, cz - d / 2), groundAt(cx - w / 2, cz + d / 2), groundAt(cx + w / 2, cz + d / 2), groundAt(cx, cz)) + .05;
    const T = .32, low = Math.min(groundAt(cx - w / 2, cz - d / 2), groundAt(cx + w / 2, cz + d / 2), groundAt(cx, cz)) - .6;
    box(cx, low, cz, w + .3, y - low + .14, d + .3, '#f3e3cc'); // foundation + floor
    const sides = [[0, d / 2, w, true], [1, w / 2, d, false], [2, -d / 2, w, true], [3, -w / 2, d, false]];
    for (const [s, off, len, alongX] of sides) {
      const wx = alongX ? cx : cx + off, wz = alongX ? cz + off : cz;
      const piece = (a, b, y0, y1, c = color) => { const m = (a + b) / 2, L = b - a; if (L <= .01) return; alongX ? box(cx + m, y + y0, wz, L, y1 - y0, T, c) : box(wx, y + y0, cz + m, T, y1 - y0, L, c); };
      if (s === door) { piece(-len / 2, -.9, .14, H); piece(.9, len / 2, .14, H); piece(-.9, .9, 2.6, H); box(alongX ? cx : wx + Math.sign(off) * .05, y + .14, alongX ? wz + Math.sign(off) * .05 : cz, alongX ? 2.1 : T + .12, .16, alongX ? T + .12 : 2.1, '#ffffff', { col: false }); }
      else {
        piece(-len / 2, len / 2, .14, H);
        // windows on the walls without a door
        const nW = Math.max(1, Math.floor(len / 4.2));
        for (let k = 0; k < nW; k++) { const u = -len / 2 + (k + .5) * len / nW, gx = alongX ? cx + u : wx + Math.sign(off) * (T / 2 + .02), gz = alongX ? wz + Math.sign(off) * (T / 2 + .02) : cz + u;
          box(gx, y + 1.35, gz, alongX ? 1.25 : .06, 1.05, alongX ? .06 : 1.25, '#bfe6ff', { col: false, gl: true }); box(gx, y + 1.25, gz, alongX ? 1.45 : .1, .12, alongX ? .1 : 1.45, '#ffffff', { col: false }); }
      }
    }
    // the ceiling slab (you can stand on it) and the roof
    box(cx, y + H, cz, w + .5, .28, d + .5, shade(color, .12));
    if (flat) { box(cx, y + H + .28, cz, w + .5, .5, .25, roof, { col: false }); box(cx + w * .2, y + H + .28, cz - d * .15, 1.4, .8, 1.1, '#dfe4ee', { col: false, rad: .15 }); }
    else { const rh = 1.6 + Math.min(w, d) * .18, g = new THREE.ConeGeometry(Math.hypot(w, d) / 2 + .5, rh, 4); g.rotateY(Math.PI / 4); g.scale(1, 1, d / w); g.translate(cx, y + H + .28 + rh / 2, cz); parts.push(tint(g, roof)); addSolid(cx - w / 4, cx + w / 4, y + H + .28, y + H + .28 + rh * .5, cz - d / 4, cz + d / 4); }
    const inX = (k) => cx + (k * (w / 2 - 1.1)), inZ = (k) => cz + (k * (d / 2 - 1.1));
    // the chest goes in the corner away from the door; floor loot in the middle
    const away = [[0, -1], [-1, 0], [0, 1], [1, 0]][door], side = Math.random() < .5 ? -1 : 1;
    if (Math.random() < chest) chestSpots.push({ x: away[0] ? inX(away[0]) : inX(side), z: away[1] ? inZ(away[1]) : inZ(side), y: y + .14, h: Math.atan2(-away[0], -away[1]), house: true, via: doorPt(cx, cz, w, d, door, 2.2) });
    lootSpots.push({ x: cx + rnd(-w / 5, w / 5), z: cz + rnd(-d / 5, d / 5), y: y + .14, via: doorPt(cx, cz, w, d, door, 2.2) });
    houses.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y, door: doorPt(cx, cz, w, d, door, 2.2), inside: doorPt(cx, cz, w, d, door, -1.4) });
  }
  const doorPt = (cx, cz, w, d, door, out) => [{ x: cx, z: cz + d / 2 + out }, { x: cx + w / 2 + out, z: cz }, { x: cx, z: cz - d / 2 - out }, { x: cx - w / 2 - out, z: cz }][door];
  const facing = (x, z, tx, tz) => { const dx = tx - x, dz = tz - z; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 0 : 2); };
  const trees = [], rocks = [], bushes = [], signs = [], lamps = [];
  const P = Object.fromEntries(POIS.map((p) => [p.id, p]));
  // Neon Plaza: a ring of shops round a fountain, neon signs, lamps
  { const p = P.plaza, y = p.h;
    cyl(p.x, y, p.z, 5.2, 5.6, .7, '#ffffff'); cyl(p.x, y + .7, p.z, 4.6, 4.6, .1, '#8fe3ff', 24, true); cyl(p.x, y, p.z, 1, 1.2, 2.6, '#c9a6ff', 12, true); sph(p.x, y + 3.1, p.z, 1.1, '#ff9ec0');
    addSolid(p.x - 4.6, p.x + 4.6, y, y + .7, p.z - 4.6, p.z + 4.6);
    const shops = [[-18, -16, 0, 10, 8, 'BOBA'], [0, -20, 0, 12, 8, 'ARCADE'], [18, -16, 0, 10, 8, 'SNACKS'], [-21, 4, 1, 8, 12, 'TOYS'], [21, 4, 3, 8, 12, 'PIXELS'], [-15, 21, 2, 10, 8, 'GAMES'], [15, 21, 2, 10, 8, 'NEON']];
    for (const [dx, dz, door, w, d, label] of shops) { const col = pick(PASTEL); house(p.x + dx, p.z + dz, w, d, door, col, pick(ROOFS), { flat: true, H: 4.4, base: y + .05 }); signs.push({ x: p.x + dx, z: p.z + dz, w, d, door, y: y + 4.4, label }); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + .2; lamps.push([p.x + Math.cos(a) * 10, p.z + Math.sin(a) * 10]); }
    for (let k = 0; k < 6; k++) lootSpots.push({ x: p.x + rnd(-12, 12), z: p.z + rnd(-12, 12) });
    chestSpots.push({ x: p.x + 7, z: p.z + 7, h: 0 }, { x: p.x - 7, z: p.z - 9, h: 0 }); }
  // Candy Cove: striped beach houses, umbrellas, lollipop trees
  { const p = P.cove;
    const spots = [[-14, -12, 0], [0, -16, 0], [14, -12, 0], [-18, 4, 1], [18, 6, 3], [-6, 16, 2], [8, 14, 2]];
    for (const [dx, dz, door] of spots) house(p.x + dx, p.z + dz, 7.5, 7.5, door, pick(['#ffd6e4', '#fff1c9', '#d6f0ff', '#e6dbff']), pick(['#ff8fb8', '#ff9f9f', '#8cc8ff']), { flat: Math.random() < .3 });
    for (let k = 0; k < 7; k++) { const a = rnd(0, TAU), r = rnd(4, 10), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = groundAt(x, z); cyl(x, y, z, .06, .06, 2.4, '#ffffff', 6); cone(x, y + 2.3, z, 1.7, .6, pick(['#ff8fa0', '#8cc8ff', '#ffd36e', '#b8e07a']), 10, 0); }
    for (let k = 0; k < 8; k++) { const a = rnd(0, TAU), r = rnd(12, 28); trees.push({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, t: 'lolly' }); }
    for (let k = 0; k < 5; k++) lootSpots.push({ x: p.x + rnd(-10, 10), z: p.z + rnd(-10, 10) });
    chestSpots.push({ x: p.x + 3, z: p.z + 2, h: 0 }); }
  // Bubble Farm: a big barn, silos, hay, fences, floating bubbles
  { const p = P.farm;
    house(p.x - 12, p.z - 4, 14, 11, 1, '#ff9f9f', '#ffffff', { H: 5.2, chest: 1 });
    house(p.x - 14, p.z + 16, 7, 7, 1, '#fff1c9', '#ff8fa0');
    for (const [dx, dz] of [[-2, -14], [3, -14]]) { const x = p.x + dx, z = p.z + dz, y = groundAt(x, z); cyl(x, y, z, 2, 2, 9, '#dfe4ee', 16, true); sph(x, y + 9, z, 2, '#8cc8ff'); addSolid(x - 1.8, x + 1.8, y, y + 9, z - 1.8, z + 1.8); }
    for (let k = 0; k < 8; k++) { const x = p.x + rnd(2, 22), z = p.z + rnd(-20, 20), y = groundAt(x, z); const g = new THREE.CylinderGeometry(.8, .8, 1.3, 14).rotateZ(Math.PI / 2); g.translate(x, y + .8, z); parts.push(tint(g, '#ffe08a')); addSolid(x - .65, x + .65, y, y + 1.6, z - .8, z + .8); }
    for (let k = -8; k <= 8; k++) { for (const fz of [-24, 24]) { const x = p.x + k * 3, z = p.z + fz, y = groundAt(x, z); box(x, y, z, .18, 1.1, .18, '#ffffff', { col: false }); } }
    for (const fz of [-24, 24]) { const z = p.z + fz; for (let k = -8; k < 8; k++) { const x = p.x + k * 3 + 1.5, y = groundAt(x, z); box(x, y + .55, z, 3, .14, .1, '#ffffff', { col: false }); } }
    for (let k = 0; k < 4; k++) lootSpots.push({ x: p.x + rnd(-6, 18), z: p.z + rnd(-16, 16) });
    chestSpots.push({ x: p.x + 8, z: p.z + 10, h: 0 }); }
  // Pixel Peaks: cabins on a plateau at the top of the hill, blocky trees down the slopes
  { const p = P.peaks;
    for (const [dx, dz, door] of [[-8, -6, 0], [7, -7, 3], [-6, 8, 1], [8, 7, 2]]) house(p.x + dx, p.z + dz, 6.5, 6.5, door, pick(['#e6dbff', '#d6f0ff', '#ffe6d6']), pick(['#8cc8ff', '#b48cff', '#7fd6c2']));
    { const x = p.x, z = p.z, y = groundAt(x, z); box(x, y, z, .6, 14, .6, '#ffffff'); sph(x, y + 14.4, z, .6, '#ff6b81'); for (let k = 1; k < 5; k++) box(x, y + k * 3, z, 2.2 - k * .3, .18, .18, '#ff8fb8', { col: false }); }
    for (let k = 0; k < 26; k++) { const a = rnd(0, TAU), r = rnd(20, 52); trees.push({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, t: 'pixel' }); }
    for (let k = 0; k < 3; k++) lootSpots.push({ x: p.x + rnd(-4, 4), z: p.z + rnd(-4, 4) });
    chestSpots.push({ x: p.x + 2.5, z: p.z + 2.5, h: 0 }); }
  // Coral Docks: warehouses, stacked toy containers, a wooden pier out over the sea
  { const p = P.docks;
    house(p.x - 8, p.z - 10, 12, 9, 1, '#d6f0ff', '#8cc8ff', { flat: true, H: 5 });
    house(p.x - 10, p.z + 10, 9, 9, 1, '#ffe6d6', '#ffb38a', { flat: true, H: 4.5 });
    const CC = ['#ff8f8f', '#8cc8ff', '#ffd36e', '#7fd6c2', '#c9a6ff'];
    for (const [dx, dz, st] of [[6, -6, 2], [6, 0, 1], [10, 6, 2], [4, 12, 1], [-2, 2, 1]]) for (let k = 0; k < st; k++) { const x = p.x + dx, z = p.z + dz, y = groundAt(x, z) + k * 2.6; box(x, y, z, 2.6, 2.6, 5.6, pick(CC), { rad: .12 }); }
    // the pier: from the shore out east
    let x0 = p.x + 14; const py = 1.6; while (groundAt(x0, p.z) > py - .3 && x0 < p.x + 40) x0 += 2;
    box((x0 + p.x + 74) / 2 - 2, py - .3, p.z, p.x + 74 - x0 + 4, .3, 7, '#e2b97f');
    for (let x = x0; x < p.x + 74; x += 5) for (const sz of [-3.2, 3.2]) cyl(x, -4, p.z + sz, .25, .25, py + 3.7, '#c99a64', 8);
    box(p.x + 70, py, p.z, 3, 2.2, 3, '#ffffff', { rad: .2 });
    chestSpots.push({ x: p.x + 66, z: p.z + 2, y: py, h: Math.PI }, { x: p.x + 2, z: p.z - 3, h: 0 });
    for (let k = 0; k < 4; k++) lootSpots.push({ x: p.x + rnd(-4, 12), z: p.z + rnd(-14, 14) });
    lootSpots.push({ x: p.x + 50, z: p.z, y: py }); }
  // Sprinkle Woods: rainbow trees and two cabins
  { const p = P.woods;
    house(p.x - 4, p.z - 4, 6.5, 6.5, 0, '#fff1c9', '#b48cff'); house(p.x + 9, p.z + 6, 6, 6, 3, '#d6f0ff', '#ff8fb8');
    for (let k = 0; k < 46; k++) { const a = rnd(0, TAU), r = rnd(9, 46); trees.push({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, t: 'sprinkle' }); }
    for (let k = 0; k < 3; k++) lootSpots.push({ x: p.x + rnd(-8, 8), z: p.z + rnd(-8, 8) }); }
  // Lollipop Lane: a row of suburban houses with picket fences
  { const p = P.lane;
    for (let k = 0; k < 5; k++) { const dx = -20 + k * 10, side = k % 2 ? 1 : -1; house(p.x + dx, p.z + side * 8, 7, 7, side > 0 ? 2 : 0, pick(PASTEL), pick(ROOFS)); for (let f = -3; f <= 3; f++) { const x = p.x + dx + f * 1.1, z = p.z + side * 3.2, y = groundAt(x, z); box(x, y, z, .14, .75, .14, '#ffffff', { col: false }); } }
    for (let k = 0; k < 6; k++) trees.push({ x: p.x + rnd(-26, 26), z: p.z + pick([-18, 18]) + rnd(-3, 3), t: 'lolly' });
    for (let k = 0; k < 3; k++) lootSpots.push({ x: p.x + rnd(-20, 20), z: p.z + rnd(-2, 2) }); }
  // lone huts and sheds dotted around the island
  for (let k = 0, tries = 0; k < 9 && tries < 400; tries++) { const a = rnd(0, TAU), r = rnd(30, 150), x = Math.cos(a) * r, z = Math.sin(a) * r; if (poiAt(x, z, 1.5) || groundAt(x, z) < 2.4 || houses.some((h) => Math.hypot(h.x0 - x, h.z0 - z) < 40)) continue; house(x, z, 6, 6, Math.floor(Math.random() * 4), pick(PASTEL), pick(ROOFS), { chest: .9 }); k++; }
  // trees, rocks and bushes all over (away from towns and the beach)
  for (let k = 0, tries = 0; k < 230 && tries < 4000; tries++) { const x = rnd(-185, 185), z = rnd(-185, 185), h = groundAt(x, z); if (h < 2.6 || poiAt(x, z, 1.05) || houses.some((q) => x > q.x0 - 3 && x < q.x1 + 3 && z > q.z0 - 3 && z < q.z1 + 3)) continue; trees.push({ x, z, t: h > 16 ? 'pixel' : Math.random() < .2 ? 'sprinkle' : 'round' }); k++; }
  for (let k = 0, tries = 0; k < 60 && tries < 2000; tries++) { const x = rnd(-185, 185), z = rnd(-185, 185), h = groundAt(x, z); if (h < .8 || poiAt(x, z, .9)) continue; rocks.push({ x, z, s: rnd(.8, 2.2) }); k++; }
  for (let k = 0, tries = 0; k < 140 && tries < 3000; tries++) { const x = rnd(-185, 185), z = rnd(-185, 185), h = groundAt(x, z); if (h < 2.4 || poiAt(x, z, .8)) continue; bushes.push({ x, z, s: rnd(.7, 1.3) }); k++; }
  for (const t of trees) { t.y = groundAt(t.x, t.z); t.hp = 5; t.s = rnd(.85, 1.25); }
  // lamps
  for (const [x, z] of lamps) { const y = groundAt(x, z); cyl(x, y, z, .1, .14, 4, '#ffffff', 8); sph(x, y + 4.2, z, .38, '#fff3b0'); addSolid(x - .15, x + .15, y, y + 4, z - .15, z + .15); }
  // merge the static world
  const worldMat = std('#ffffff', { vertexColors: true, roughness: .62 }), worldGloss = track(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .28, clearcoat: 1, clearcoatRoughness: .15 }));
  if (parts.length) { const m = mesh(geo(mergeGeometries(parts)), worldMat); m.castShadow = true; }
  if (glossParts.length) mesh(geo(mergeGeometries(glossParts)), worldGloss);
  parts.length = 0; glossParts.length = 0;
  // neon shop signs: glowing canvas plates over each door
  const neonTex = (label, col) => canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#3b2f5c'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 30); x.fill(); x.font = `700 74px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 24; x.fillStyle = '#ffffff'; x.fillText(label, w / 2, h / 2 + 4); x.shadowBlur = 0; x.lineWidth = 6; x.strokeStyle = col; x.beginPath(); x.roundRect(10, 10, w - 20, h - 20, 26); x.stroke(); });
  for (const s of signs) { const col = pick(['#ff6bd6', '#6bd6ff', '#ffd36e', '#9bff8f', '#c49bff']); const m = new THREE.Mesh(gg('sign', () => new THREE.PlaneGeometry(4, 1)), basic('#ffffff', { map: neonTex(s.label, col), toneMapped: false }));
    const o = [[0, s.d / 2 + .2, 0], [s.w / 2 + .2, 0, Math.PI / 2], [0, -s.d / 2 - .2, Math.PI], [-s.w / 2 - .2, 0, -Math.PI / 2]][s.door]; m.position.set(s.x + o[0], s.y - .9, s.z + o[1]); m.rotation.y = o[2]; scene.add(m); }
  // instanced trees: trunks + canopies (round candy, sprinkle, lollipop, pixel cubes), rocks and bushes
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const tmpO = new THREE.Object3D(), tmpC = new THREE.Color();
  const trunkIM = new THREE.InstancedMesh(gg('trunk', () => new THREE.CylinderGeometry(.28, .4, 1, 8).translate(0, .5, 0)), std('#c99a64', { roughness: .9 }), trees.length);
  const kinds = { round: { g: () => new THREE.IcosahedronGeometry(1, 2), cols: ['#9fdc7c', '#8fd08a', '#b4e39a', '#7fcf8f'] }, sprinkle: { g: () => new THREE.IcosahedronGeometry(1, 2), cols: ['#ffb3c7', '#c9a6ff', '#8cc8ff', '#ffd88a', '#a9e3ae'] }, lolly: { g: () => new THREE.SphereGeometry(1, 16, 10).scale(1, 1, .45), cols: ['#ff8fb8', '#ffd36e', '#8cc8ff', '#b8e07a'] }, pixel: { g: () => new RoundedBoxGeometry(1.6, 1.6, 1.6, 2, .12), cols: ['#7fcf8f', '#9fdc7c', '#6fc3a0'] } };
  const canIM = {};
  for (const [k, v] of Object.entries(kinds)) { const list = trees.filter((t) => t.t === k); if (!list.length) continue; const im = new THREE.InstancedMesh(gg('can' + k, v.g), track(new THREE.MeshPhysicalMaterial({ roughness: .4, clearcoat: .6, clearcoatRoughness: .3 })), list.length); im.castShadow = true; im.receiveShadow = true; list.forEach((t, i) => { t.cim = im; t.ci = i; im.setColorAt(i, tmpC.set(pick(v.cols))); }); scene.add(im); canIM[k] = im; }
  function placeTree(t, wob = 0) {
    const s = t.s, h = t.t === 'lolly' ? 3.4 * s : t.t === 'pixel' ? 2.4 * s : 2.6 * s;
    if (t.hp <= 0) { trunkIM.setMatrixAt(t.i, ZERO); t.cim.setMatrixAt(t.ci, ZERO); }
    else {
      tmpO.position.set(t.x, t.y - .2, t.z); tmpO.rotation.set(wob * .12, 0, wob * .08); tmpO.scale.set(s * (t.t === 'lolly' ? .4 : 1), h + .2, s * (t.t === 'lolly' ? .4 : 1)); tmpO.updateMatrix(); trunkIM.setMatrixAt(t.i, tmpO.matrix);
      const cs = t.t === 'round' ? 2.3 * s : t.t === 'sprinkle' ? 2.1 * s : t.t === 'lolly' ? 1.5 * s : 1.5 * s;
      tmpO.position.set(t.x + wob * .25, t.y + h + cs * (t.t === 'lolly' ? .9 : .7), t.z); tmpO.rotation.set(0, t.t === 'pixel' ? t.x : 0, 0); tmpO.scale.setScalar(cs); if (t.t === 'round' || t.t === 'sprinkle') tmpO.scale.y = cs * 1.1; tmpO.updateMatrix(); t.cim.setMatrixAt(t.ci, tmpO.matrix);
      if (t.t === 'pixel') { /* a second stacked cube is implied by the scale */ }
    }
    trunkIM.instanceMatrix.needsUpdate = true; t.cim.instanceMatrix.needsUpdate = true;
  }
  trees.forEach((t, i) => { t.i = i; placeTree(t); t.solid = addSolid(t.x - .45, t.x + .45, t.y - 1, t.y + 5 * t.s, t.z - .45, t.z + .45, 'tree', t); });
  trunkIM.castShadow = true; trunkIM.receiveShadow = true; scene.add(trunkIM);
  { const im = new THREE.InstancedMesh(gg('rock', () => new THREE.DodecahedronGeometry(1, 0)), std('#d9d2e6', { roughness: .75, flatShading: true }), rocks.length); rocks.forEach((r, i) => { const y = groundAt(r.x, r.z); tmpO.position.set(r.x, y + r.s * .35, r.z); tmpO.rotation.set(rnd(0, 3), rnd(0, 3), 0); tmpO.scale.set(r.s * 1.2, r.s * .8, r.s); tmpO.updateMatrix(); im.setMatrixAt(i, tmpO.matrix); addSolid(r.x - r.s * .9, r.x + r.s * .9, y - 1, y + r.s, r.z - r.s * .9, r.z + r.s * .9, 'rock'); }); im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  { const im = new THREE.InstancedMesh(gg('bush', () => new THREE.IcosahedronGeometry(1, 1)), track(new THREE.MeshPhysicalMaterial({ roughness: .45, clearcoat: .5 })), bushes.length); bushes.forEach((b, i) => { const y = groundAt(b.x, b.z); tmpO.position.set(b.x, y + b.s * .5, b.z); tmpO.rotation.set(0, rnd(0, 3), 0); tmpO.scale.set(b.s * 1.3, b.s, b.s * 1.3); tmpO.updateMatrix(); im.setMatrixAt(i, tmpO.matrix); im.setColorAt(i, tmpC.set(pick(['#a5dd8a', '#b8e79a', '#ffc7d9', '#c9b6ff']))); }); im.castShadow = true; scene.add(im); }
  // floating bubbles over the farm
  const bubbles = [];
  { const bm = track(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, transmission: 0, transparent: true, opacity: .35, iridescence: 1, iridescenceIOR: 1.3, clearcoat: 1 })), bg = gg('bub', () => new THREE.SphereGeometry(1, 20, 14));
    for (let k = 0; k < 18; k++) { const m = mesh(bg, bm, P.farm.x + rnd(-24, 24), P.farm.h + rnd(3, 14), P.farm.z + rnd(-24, 24), scene, false); m.scale.setScalar(rnd(.6, 1.6)); bubbles.push({ m, y0: m.position.y, t: rnd(0, 6) }); } }
  // a little boat bobbing near the docks
  const boat = new THREE.Group(); { mesh(gg('boatb', () => new RoundedBoxGeometry(3, 1, 7, 3, .4)), gloss('#ffffff'), 0, .3, 0, boat); mesh(gg('boatc', () => new RoundedBoxGeometry(2, 1.2, 2.4, 2, .3)), gloss('#8cc8ff'), 0, 1.3, -.6, boat); boat.position.set(P.docks.x + 62, 0, P.docks.z + 14); scene.add(boat); }

  // ---------------------------------------------------------------- sprites + textures
  const tagTex = (text, color) => canvasTex(512, 112, (x, w) => {
    x.font = `700 46px ${FONT}`; const tw = Math.min(w - 20, x.measureText(text).width + 56);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect((w - tw) / 2, 14, tw, 80, 40); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc((w - tw) / 2 + 30, 54, 11, 0, TAU); x.fill();
    x.fillStyle = '#3b2f5c'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2 + 10, 56, tw - 60);
  });
  const glowTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const starTex = canvasTex(64, 64, (x) => { x.translate(32, 32); x.fillStyle = '#ffd34a'; starPath(x, 28); x.fillStyle = '#fff7c8'; starPath(x, 12); });
  const coinTex = canvasTex(64, 64, (x) => { x.fillStyle = '#e0a020'; x.beginPath(); x.arc(32, 32, 28, 0, TAU); x.fill(); x.fillStyle = '#ffd34a'; x.beginPath(); x.arc(32, 32, 21, 0, TAU); x.fill(); x.fillStyle = '#fff3b0'; x.fillRect(29, 18, 6, 28); });
  const flashTex = canvasTex(128, 128, (x) => { x.translate(64, 64); const g = x.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(.35, 'rgba(255,220,90,.9)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; for (let i = 0; i < 8; i++) { x.rotate(TAU / 8); x.beginPath(); x.moveTo(0, -12); x.lineTo(i % 2 ? 40 : 62, 0); x.lineTo(0, 12); x.fill(); } x.beginPath(); x.arc(0, 0, 26, 0, TAU); x.fill(); });
  const sparkTex = canvasTex(64, 64, (x) => { x.translate(32, 32); x.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(0, -30); x.quadraticCurveTo(3, -3, 30, 0); x.quadraticCurveTo(3, 3, 0, 30); x.fill(); } });
  const plankTex = canvasTex(128, 128, (x, w, h) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#f6d2a2' : '#fbdcb0'; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(160,100,50,.25)'; x.fillRect(0, i * 32 + 30, w, 2); x.fillStyle = 'rgba(160,100,50,.18)'; x.fillRect((i * 47) % w, i * 32, 2, 30); } x.strokeStyle = '#e8b47a'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#d39a5c'; for (const [a, b] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]]) { x.beginPath(); x.arc(a, b, 4, 0, TAU); x.fill(); } });

  // ---------------------------------------------------------------- the storm
  const stormTex = canvasTex(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,170,230,.0)'); g.addColorStop(.25, 'rgba(220,120,255,.55)'); g.addColorStop(1, 'rgba(160,80,240,.8)'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${rnd(.05, .22)})`; x.fillRect(rnd(0, w), rnd(0, h), rnd(2, 6), rnd(20, 90)); } });
  stormTex.wrapS = stormTex.wrapT = THREE.RepeatWrapping; stormTex.repeat.set(24, 1);
  const stormWall = mesh(geo(new THREE.CylinderGeometry(1, 1, 1, 128, 1, true).translate(0, .5, 0)), track(new THREE.MeshBasicMaterial({ map: stormTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false, color: '#ffffff' })), 0, -20, 0, scene, false);
  stormWall.renderOrder = 2;
  const storm = { phase: 0, mode: 'wait', t: PHASES[0].wait, cur: { x: 0, z: 0, r: 320 }, from: { x: 0, z: 0, r: 320 }, next: { x: 0, z: 0, r: 125 }, tick: 1, dmg: 1 };
  function pickNext() { const ph = PHASES[storm.phase]; const roam = Math.max(0, storm.cur.r - ph.r) * (storm.phase === 0 ? .35 : .85), a = rnd(0, TAU), d = Math.sqrt(Math.random()) * roam; let x = storm.cur.x + Math.cos(a) * d, z = storm.cur.z + Math.sin(a) * d;
    for (let k = 0; k < 12 && groundAt(x, z) < 1.5; k++) { x *= .8; z *= .8; } storm.next = { x, z, r: ph.r }; }
  function stepStorm(dt) {
    storm.t -= dt;
    if (storm.mode === 'wait') { if (storm.t <= 0) { storm.mode = 'shrink'; storm.from = { ...storm.cur }; storm.t = PHASES[storm.phase].shrink; storm.dmg = PHASES[storm.phase].dmg; if (state === 'play') { big('THE STORM IS CLOSING', 'purple', `phase ${storm.phase + 1} · get inside the white circle`); sfx.storm(); } } }
    else if (storm.mode === 'shrink') { const ph = PHASES[storm.phase], k = smooth(clamp(1 - storm.t / ph.shrink, 0, 1)); storm.cur.x = lerp(storm.from.x, storm.next.x, k); storm.cur.z = lerp(storm.from.z, storm.next.z, k); storm.cur.r = lerp(storm.from.r, storm.next.r, k);
      if (storm.t <= 0) { storm.cur = { ...storm.next }; storm.phase++; if (storm.phase < PHASES.length) { storm.mode = 'wait'; storm.t = PHASES[storm.phase].wait; pickNext(); } else { storm.mode = 'done'; storm.t = 0; } } }
    stormWall.position.set(storm.cur.x, -20, storm.cur.z); stormWall.scale.set(Math.max(.5, storm.cur.r), 260, Math.max(.5, storm.cur.r)); stormTex.offset.x += dt * .01; stormTex.offset.y = (stormTex.offset.y - dt * .06) % 1;
    stormTex.repeat.x = Math.max(2, Math.round(storm.cur.r / 12)); stormWall.visible = storm.cur.r < 250;
    // storm damage, once a second
    storm.tick -= dt; if (storm.tick <= 0) { storm.tick = 1; for (const a of actors) if (a.alive && a.phase === 'ground' && outside(a)) dmgActor(a, storm.dmg, null, 'the storm', { storm: true }); }
  }
  const outside = (a, c = storm.cur) => Math.hypot(a.x - c.x, a.z - c.z) > c.r;

  // ---------------------------------------------------------------- weapon models (chunky candy toys)
  function makeGun(type, r) {
    const g = new THREE.Group(), W = WPN[type], M = gloss(W.col), Rm = gloss(RAR[r].c), D = gloss('#5b4f7a'), Y = gloss('#ffd36e');
    const B = (w, h, d, rr, m, x, y, z, rx = 0) => { const me = mesh(gg(`rb${w},${h},${d},${rr}`, () => new RoundedBoxGeometry(w, h, d, 2, rr)), m, x, y, z, g, false); me.rotation.x = rx; return me; };
    const C = (rr, len, m, x, y, z) => mesh(gg(`cy${rr},${len}`, () => new THREE.CylinderGeometry(rr, rr, len, 12).rotateX(Math.PI / 2)), m, x, y, z, g, false);
    let mz = .5;
    if (type === 'pistol') { B(.14, .17, .44, .05, M, 0, 0, .08); C(.06, .18, Rm, 0, .02, .36); B(.12, .24, .13, .04, D, 0, -.15, -.04, -.25); B(.06, .06, .1, .02, Y, 0, .11, .2); mz = .47; }
    else if (type === 'smg') { B(.16, .2, .6, .06, M, 0, 0, .1); C(.07, .2, Rm, 0, .02, .5); B(.1, .3, .12, .04, Rm, 0, -.22, .14, .2); B(.11, .18, .12, .04, D, 0, -.14, -.12, -.3); const b = mesh(gg('smgb', () => new THREE.SphereGeometry(.09, 12, 8)), gloss('#e6f6ff'), 0, .16, .05, g, false); b.scale.set(1, 1, 1.4); mz = .62; }
    else if (type === 'rifle') { B(.14, .2, .86, .06, M, 0, 0, .12); C(.045, .44, D, 0, .03, .7); B(.12, .2, .32, .05, M, 0, -.02, -.44); B(.1, .3, .14, .04, Rm, 0, -.22, .16, .15); B(.1, .2, .12, .04, D, 0, -.16, -.1, -.3); C(.05, .22, Rm, 0, .16, .1); mz = .93; }
    else if (type === 'shotgun') { B(.18, .22, .64, .07, M, 0, 0, .06); C(.06, .5, D, -.05, .04, .56); C(.06, .5, D, .05, .04, .56); B(.2, .14, .22, .05, Rm, 0, -.1, .46); B(.14, .22, .34, .06, M, 0, -.06, -.36, .15); B(.1, .2, .12, .04, Y, 0, -.18, -.08, -.3); mz = .82; }
    else { B(.13, .18, .95, .05, M, 0, 0, .1); C(.04, .6, D, 0, .03, .86); C(.07, .4, Rm, 0, .2, .1); B(.12, .22, .34, .05, M, 0, -.03, -.52); B(.1, .2, .12, .04, D, 0, -.15, -.1, -.3); C(.03, .1, Y, 0, .2, .32); mz = 1.15; }
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, .03, mz); g.add(muzzle); g.userData.muzzle = muzzle;
    return g;
  }
  function makePickaxe() {
    const g = new THREE.Group(); const h = mesh(gg('pkh', () => new THREE.CylinderGeometry(.04, .045, .9, 8)), gloss('#ffffff'), 0, .2, 0, g, false);
    for (let k = 0; k < 4; k++) mesh(gg('pks', () => new THREE.TorusGeometry(.047, .012, 4, 10).rotateX(Math.PI / 2)), gloss('#ff6b81'), 0, -.15 + k * .2, 0, g, false);
    const head = mesh(gg('pkhd', () => new RoundedBoxGeometry(.62, .12, .14, 2, .05)), gloss('#c9a6ff'), 0, .62, 0, g, false); head.rotation.z = .12; mesh(gg('pkc', () => new THREE.SphereGeometry(.09, 10, 8)), gloss('#ffd36e'), 0, .62, 0, g, false);
    h.castShadow = true; return g;
  }
  function makeHeal(type) {
    const g = new THREE.Group();
    if (type === 'shield') { mesh(gg('bot', () => new THREE.CylinderGeometry(.16, .18, .36, 14)), gloss('#5fb8ff'), 0, .18, 0, g, false); mesh(gg('botn', () => new THREE.CylinderGeometry(.06, .1, .14, 10)), gloss('#5fb8ff'), 0, .43, 0, g, false); mesh(gg('botc', () => new THREE.CylinderGeometry(.07, .07, .06, 10)), gloss('#ffffff'), 0, .52, 0, g, false); mesh(gg('botl', () => new THREE.CylinderGeometry(.165, .165, .1, 14)), gloss('#ffffff'), 0, .2, 0, g, false); }
    else { mesh(gg('mk', () => new RoundedBoxGeometry(.5, .32, .36, 2, .06)), gloss('#ffffff'), 0, .16, 0, g, false); mesh(gg('mkx', () => new THREE.BoxGeometry(.06, .1, .2)), gloss('#ff6b81'), 0, .34, 0, g, false); mesh(gg('mky', () => new THREE.BoxGeometry(.2, .1, .06)), gloss('#ff6b81'), 0, .34, 0, g, false); }
    return g;
  }
  const makeAmmo = (type) => { const g = new THREE.Group(); mesh(gg('ammo', () => new RoundedBoxGeometry(.42, .26, .3, 2, .05)), gloss(AMMO[type].c), 0, .13, 0, g, false); mesh(gg('ammol', () => new RoundedBoxGeometry(.44, .07, .32, 1, .02)), gloss('#ffffff'), 0, .2, 0, g, false); return g; };

  // hotbar icons: little 2D drawings of each item
  const iconCache = {};
  function iconOf(it) {
    const k = it.k === 'gun' ? it.w : it.k === 'heal' ? 'h' + it.h : 'pick'; if (iconCache[k]) return iconCache[k];
    const c = document.createElement('canvas'); c.width = 120; c.height = 80; const x = c.getContext('2d');
    const R = (a, b, w, h, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(a, b, w, h, r); x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(59,47,92,.55)'; x.stroke(); };
    x.translate(0, 4);
    if (it.k === 'gun') { const W = WPN[it.w], col = W.col;
      if (it.w === 'pistol') { R(28, 22, 54, 18, 7, col); R(78, 25, 14, 11, 4, '#ffd36e'); R(34, 36, 15, 26, 6, '#b48cff'); }
      else if (it.w === 'smg') { R(18, 22, 74, 20, 8, col); R(88, 26, 14, 12, 4, '#ff8fb8'); R(52, 40, 13, 26, 5, '#5b4f7a'); R(30, 38, 13, 18, 5, '#ffd36e'); x.fillStyle = '#e6f6ff'; x.beginPath(); x.arc(56, 18, 7, 0, TAU); x.fill(); }
      else if (it.w === 'rifle') { R(6, 24, 26, 16, 6, col); R(28, 20, 66, 20, 7, col); R(92, 26, 22, 7, 3, '#5b4f7a'); R(58, 38, 12, 24, 5, '#5b4f7a'); R(40, 12, 22, 9, 4, '#ffd36e'); }
      else if (it.w === 'shotgun') { R(4, 28, 30, 18, 7, col); R(30, 22, 52, 22, 8, col); R(80, 22, 34, 8, 4, '#5b4f7a'); R(80, 32, 34, 8, 4, '#5b4f7a'); R(70, 40, 22, 12, 5, '#ffd36e'); }
      else { R(2, 26, 26, 16, 6, col); R(24, 24, 64, 16, 6, col); R(86, 28, 32, 6, 3, '#5b4f7a'); R(40, 10, 36, 11, 5, '#3b2f5c'); R(46, 38, 12, 20, 5, '#5b4f7a'); } }
    else if (it.k === 'heal') { if (it.h === 'shield') { R(46, 20, 30, 46, 10, '#5fb8ff'); R(52, 8, 18, 14, 5, '#ffffff'); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(52, 28, 6, 26); } else { R(30, 22, 62, 42, 9, '#ffffff'); x.fillStyle = '#ff6b81'; x.fillRect(55, 30, 12, 26); x.fillRect(48, 37, 26, 12); } }
    else { x.save(); x.translate(60, 38); x.rotate(-.7); R(-5, -28, 10, 64, 4, '#ffffff'); x.fillStyle = '#ff6b81'; for (let i = 0; i < 4; i++) x.fillRect(-5, -20 + i * 15, 10, 5); R(-30, -36, 60, 12, 6, '#c9a6ff'); x.restore(); }
    return (iconCache[k] = c.toDataURL());
  }

  // ---------------------------------------------------------------- particles, tracers, flashes, damage numbers
  const tracers = [], bursts = [], puffs = [], flashes = [];
  { const tg = geo(new THREE.BoxGeometry(1, 1, 1));
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(tg, basic('#fff2a0', { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); tracers.push({ m, life: 0 }); }
    for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 3 ? starTex : coinTex, transparent: true, depthWrite: false, fog: false, toneMapped: false })); track(s.material); s.visible = false; scene.add(s); bursts.push({ s, life: 0, v: new THREE.Vector3() }); }
    const pg = geo(new THREE.SphereGeometry(1, 12, 8));
    for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(pg, std('#ffffff', { transparent: true, roughness: 1, emissive: '#ffffff', emissiveIntensity: .4 })); m.material = m.material.clone(); track(m.material); m.visible = false; scene.add(m); puffs.push({ m, life: 0, max: 1, v: new THREE.Vector3(), s0: 1 }); }
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); track(s.material); s.visible = false; scene.add(s); flashes.push({ s, life: 0 }); } }
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();
  function tracer(a, b, color = '#fff2a0', w = .07) {
    const t = tracers.find((q) => q.life <= 0) || tracers[0]; t.life = .09; t.m.visible = true; t.m.material.color.set(color);
    const len = a.distanceTo(b); t.m.position.copy(a).add(b).multiplyScalar(.5); t.m.scale.set(w, w, Math.max(.01, len)); t.m.lookAt(b);
  }
  function flash(p, s = 1) { const f = flashes.find((q) => q.life <= 0) || flashes[0]; f.life = .06; f.s.visible = true; f.s.position.copy(p); f.s.scale.setScalar(.9 * s); f.s.material.rotation = Math.random() * TAU; }
  function puff(x, y, z, n = 6, size = .6, color = '#ffffff', spread = 1.5) {
    for (let i = 0; i < n; i++) { const p = puffs.find((q) => q.life <= 0); if (!p) return; p.life = p.max = rnd(.45, .8); p.m.visible = true; p.m.position.set(x + rnd(-.3, .3), y + rnd(-.2, .3), z + rnd(-.3, .3)); p.v.set(rnd(-1, 1) * spread, rnd(.4, 1.6), rnd(-1, 1) * spread); p.s0 = size * rnd(.7, 1.3); p.m.material.color.set(color); p.m.material.emissive.set(color); }
  }
  function burst(x, y, z, n = 18) {
    for (let i = 0; i < n; i++) { const b = bursts.find((q) => q.life <= 0); if (!b) return; b.life = rnd(.8, 1.3); b.s.visible = true; b.s.position.set(x, y, z); const a = rnd(0, TAU), sp = rnd(3, 7); b.v.set(Math.cos(a) * sp, rnd(4, 9), Math.sin(a) * sp); b.s.scale.setScalar(rnd(.35, .6)); }
    puff(x, y, z, 8, .6, '#ffffff', 2);
  }
  const dmgEls = []; for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'ry-dmg'; d.style.display = 'none'; wrap.appendChild(d); dmgEls.push({ d, life: 0, p: new THREE.Vector3() }); }
  function dmgNum(p, n, cls = '') { const e = dmgEls.find((q) => q.life <= 0) || dmgEls[0]; e.life = .8; e.p.copy(p); e.p.x += rnd(-.3, .3); e.d.className = 'ry-dmg ' + cls; e.d.textContent = Math.round(n); e.d.style.display = ''; }

  // ---------------------------------------------------------------- audio
  let ac = null, master = null, nbuf = null, muted = false, windNode = null;
  try { muted = localStorage.getItem('aa.games.mute') === '1'; } catch {}
  function audio() {
    if (muted) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .45; master.connect(ac.destination); nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch { return null; } }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone(f, dur, { type = 'sine', vol = .3, slide = 0, delay = 0 } = {}) {
    const a = audio(); if (!a) return; const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + .02);
  }
  function noise(dur, { vol = .3, f = 1200, type = 'lowpass', slide = 0, delay = 0, q = 1 } = {}) {
    const a = audio(); if (!a) return; const t0 = a.currentTime + delay, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = nbuf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0); if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); s.connect(fl).connect(g).connect(master); s.start(t0, Math.random() * .5); s.stop(t0 + dur + .02);
  }
  const sfx = {
    pistol(v = 1) { noise(.14, { vol: .45 * v, f: 2600, slide: -2000 }); tone(170, .14, { type: 'triangle', vol: .35 * v, slide: -100 }); },
    smg(v = 1) { noise(.07, { vol: .3 * v, f: 3200, slide: -2200 }); tone(240, .07, { type: 'triangle', vol: .2 * v, slide: -120 }); tone(900, .05, { vol: .05 * v, slide: 600 }); },
    rifle(v = 1) { noise(.1, { vol: .4 * v, f: 2000, slide: -1500 }); tone(140, .1, { type: 'triangle', vol: .3 * v, slide: -60 }); },
    shotgun(v = 1) { noise(.3, { vol: .6 * v, f: 1400, slide: -1200 }); tone(90, .25, { type: 'triangle', vol: .5 * v, slide: -40 }); noise(.1, { vol: .2 * v, f: 4000, type: 'bandpass', delay: .02 }); },
    sniper(v = 1) { noise(.4, { vol: .55 * v, f: 3000, slide: -2800 }); tone(520, .35, { type: 'square', vol: .06 * v, slide: -400 }); tone(1600, .08, { vol: .12 * v, slide: 1200 }); },
    hit() { tone(1500, .05, { type: 'square', vol: .1 }); tone(2100, .06, { vol: .12, delay: .03 }); },
    head() { tone(2400, .06, { type: 'square', vol: .1 }); tone(3200, .1, { vol: .14, delay: .04 }); },
    shieldHit() { tone(1800, .05, { type: 'triangle', vol: .12, slide: 600 }); noise(.05, { vol: .1, f: 5000, type: 'highpass' }); },
    ko() { noise(.4, { vol: .35, f: 3500, type: 'bandpass', slide: -3000, q: 2 }); [880, 1175, 1568, 2093].forEach((f, i) => tone(f, .2, { type: 'triangle', vol: .14, delay: .1 + i * .07 })); },
    elim() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, .14, { type: 'square', vol: .08, delay: i * .06 })); },
    hurt() { tone(360, .18, { type: 'sawtooth', vol: .12, slide: -180 }); },
    reload() { tone(700, .04, { type: 'square', vol: .1 }); tone(1000, .05, { type: 'square', vol: .1, delay: .3 }); },
    empty() { tone(1800, .03, { type: 'square', vol: .06 }); },
    swap() { tone(500, .05, { type: 'triangle', vol: .12 }); tone(750, .06, { type: 'triangle', vol: .12, delay: .05 }); },
    jump() { tone(420, .14, { type: 'triangle', vol: .12, slide: 300 }); },
    land() { tone(90, .25, { type: 'triangle', vol: .4, slide: -40 }); noise(.2, { vol: .3, f: 700, slide: -500 }); },
    glide() { noise(.6, { vol: .25, f: 500, slide: 1400, type: 'bandpass', q: 1.5 }); tone(330, .2, { type: 'triangle', vol: .1, slide: 200 }); },
    leap() { noise(.5, { vol: .3, f: 400, slide: 1800, type: 'bandpass', q: 2 }); tone(300, .4, { type: 'triangle', vol: .12, slide: 500 }); },
    chest() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .2, { type: 'triangle', vol: .13, delay: i * .06 })); noise(.4, { vol: .15, f: 3000, type: 'highpass' }); },
    pickup() { tone(660, .06, { type: 'triangle', vol: .14 }); tone(990, .1, { type: 'triangle', vol: .14, delay: .05 }); },
    ammo() { tone(880, .04, { type: 'square', vol: .05 }); tone(1100, .05, { type: 'square', vol: .05, delay: .04 }); },
    chop() { tone(200, .08, { type: 'triangle', vol: .35, slide: -80 }); noise(.08, { vol: .3, f: 1600 }); },
    whiff() { noise(.12, { vol: .12, f: 1500, type: 'bandpass', slide: 1500 }); },
    build() { tone(260, .07, { type: 'square', vol: .08 }); noise(.1, { vol: .25, f: 1100 }); tone(520, .06, { type: 'triangle', vol: .1, delay: .05 }); },
    crack() { noise(.35, { vol: .4, f: 900, slide: -600 }); tone(120, .2, { type: 'triangle', vol: .3, slide: -60 }); },
    nope() { tone(220, .1, { type: 'square', vol: .06 }); tone(180, .12, { type: 'square', vol: .06, delay: .08 }); },
    sip() { [600, 700, 820, 960].forEach((f, i) => tone(f, .08, { type: 'sine', vol: .12, delay: i * .08 })); },
    healed() { [523, 784, 1047].forEach((f, i) => tone(f, .14, { type: 'triangle', vol: .12, delay: i * .07 })); },
    storm() { noise(1.2, { vol: .35, f: 300, slide: 900, type: 'bandpass', q: 1.2 }); [330, 311, 294].forEach((f, i) => tone(f, .4, { type: 'sawtooth', vol: .05, delay: i * .22 })); },
    zap() { noise(.15, { vol: .18, f: 2400, type: 'bandpass', q: 3 }); tone(160, .15, { type: 'sawtooth', vol: .06, slide: -60 }); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .26, { type: 'square', vol: .08, delay: i * .13 })); for (let i = 0; i < 6; i++) noise(.3, { vol: .2, f: 3000, type: 'highpass', delay: .9 + i * .25 }); },
    lose() { [523, 440, 392, 330].forEach((f, i) => tone(f, .3, { type: 'triangle', vol: .12, delay: i * .18 })); },
    beep() { tone(523, .18, { type: 'square', vol: .08 }); },
  };
  const sfxAt = (name, x, z, max = 140) => { const d = Math.hypot(x - camera.position.x, z - camera.position.z); if (d > max) return; sfx[name]?.(clamp(1 - d / max, .05, 1) * .8); };
  function wind(on, v) {
    const a = audio(); if (!a) return;
    if (!windNode) { const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = nbuf; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = 500; fl.Q.value = .7; g.gain.value = 0; s.connect(fl).connect(g).connect(master); s.start(); windNode = { s, fl, g }; }
    windNode.g.gain.setTargetAtTime(on && !muted && !paused ? v * .2 : 0, a.currentTime, .2); windNode.fl.frequency.setTargetAtTime(300 + v * 900, a.currentTime, .2);
  }
  const paintMute = () => { muteBtn.innerHTML = muted ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="#3b2f5c"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="#3b2f5c" stroke-width="2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20" fill="#3b2f5c"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="#3b2f5c" stroke-width="2" stroke-linecap="round"/></svg>'; };
  paintMute();

  // ---------------------------------------------------------------- the balloon bus
  const bus = { g: new THREE.Group(), x: 0, z: 0, y: 115, dx: 1, dz: 0, t: 0, len: 520, speed: 24, on: false, ejectAt: 0 };
  { const g = bus.g, body = new THREE.Group(); g.add(body); bus.body = body;
    const busTex = canvasTex(512, 160, (x, w, h) => { x.fillStyle = '#a9e6d6'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff6e0'; x.fillRect(0, 0, w, 74); for (let i = 0; i < 5; i++) { x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(22 + i * 96, 14, 80, 54, 14); x.fill(); const gr = x.createLinearGradient(0, 18, 0, 64); gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(1, '#8cc0f0'); x.fillStyle = gr; x.beginPath(); x.roundRect(28 + i * 96, 20, 68, 42, 10); x.fill(); } x.fillStyle = '#c9a6ff'; x.fillRect(0, 80, w, 14); x.font = `700 40px ${FONT}`; x.fillStyle = '#5b4f7a'; x.textAlign = 'center'; x.fillText('AGENT ROYALE', w / 2, 136); });
    const bm = [gloss('#a9e6d6'), gloss('#a9e6d6'), gloss('#fff6e0'), gloss('#c9a6ff'), std('#ffffff', { map: busTex, roughness: .4 }), std('#ffffff', { map: busTex, roughness: .4 })];
    const b = new THREE.Mesh(geo(new RoundedBoxGeometry(3.6, 3.4, 9, 3, .7)), gloss('#a9e6d6')); b.castShadow = true; body.add(b);
    for (const sd of [-1, 1]) { const side = new THREE.Mesh(gg('busside', () => new THREE.PlaneGeometry(8.2, 2.6)), bm[4]); side.position.set(sd * 1.81, .1, 0); side.rotation.y = sd * Math.PI / 2; body.add(side); }
    mesh(geo(new RoundedBoxGeometry(3.7, .5, 9.1, 2, .2)), gloss('#c9a6ff'), 0, -1.4, 0, body);
    for (const sz of [-1, 1]) { mesh(geo(new RoundedBoxGeometry(3, 1.3, .2, 2, .1)), gloss('#bfe6ff'), 0, .6, sz * 4.52, body, false); for (const sx of [-1, 1]) mesh(gg('bushl', () => new THREE.SphereGeometry(.28, 12, 8)), std('#fffbe6', { emissive: '#fff6c8', emissiveIntensity: .9 }), sx * 1.1, -.6, sz * 4.55, body, false); }
    for (const [sx, sz] of [[1, 2.8], [-1, 2.8], [1, -2.8], [-1, -2.8]]) { const w = mesh(gg('busw', () => new THREE.CylinderGeometry(.7, .7, .5, 18).rotateZ(Math.PI / 2)), gloss('#8f7cf0'), sx * 1.75, -1.6, sz, body); mesh(gg('bush2', () => new THREE.CylinderGeometry(.3, .3, .52, 12).rotateZ(Math.PI / 2)), gloss('#ffffff'), sx * 1.75, -1.6, sz, body, false); w.castShadow = true; }
    // the balloon: candy stripes
    const balTex = canvasTex(512, 256, (x, w, h) => { const cols = ['#ffd6e4', '#c9e6ff', '#fff1c9', '#e2d6ff']; for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % 4]; x.fillRect(i * w / 12, 0, w / 12 + 1, h); } });
    const bal = mesh(geo(new THREE.SphereGeometry(8, 32, 22)), track(new THREE.MeshPhysicalMaterial({ map: balTex, roughness: .35, clearcoat: .8, emissive: '#ffffff', emissiveMap: balTex, emissiveIntensity: .3 })), 0, 14, 0, g); bal.scale.set(1, 1.12, 1); bal.castShadow = true;
    mesh(geo(new THREE.TorusGeometry(3.2, .35, 10, 28).rotateX(Math.PI / 2)), gloss('#c9a6ff'), 0, 5.6, 0, g);
    mesh(geo(new THREE.CylinderGeometry(1.2, 1.6, 1, 18)), gloss('#fff3b0'), 0, 5.1, 0, g, false);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: '#ffb347', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); track(flame.material); flame.scale.setScalar(2.4); flame.position.y = 4.6; g.add(flame); bus.flame = flame;
    for (const [sx, sz] of [[1, 3.5], [-1, 3.5], [1, -3.5], [-1, -3.5]]) { const a = new THREE.Vector3(sx * 1.5, 1.6, sz), b2 = new THREE.Vector3(sx * 2.9, 5.6, sz * .55), m = new THREE.Mesh(gg('rope', () => new THREE.CylinderGeometry(.06, .06, 1, 6)), std('#e8c48e')); m.position.copy(a).add(b2).multiplyScalar(.5); m.scale.y = a.distanceTo(b2); m.lookAt(b2); m.rotateX(Math.PI / 2); g.add(m); }
    const prop = new THREE.Group(); for (let k = 0; k < 3; k++) { const bl = mesh(gg('blade', () => new RoundedBoxGeometry(.4, 1.8, .1, 1, .05)), gloss('#ffd36e'), 0, .9, 0, prop, false); bl.parent.remove(bl); const p2 = new THREE.Group(); p2.rotation.z = k / 3 * TAU; p2.add(bl); prop.add(p2); } prop.position.set(0, 0, -4.8); body.add(prop); bus.prop = prop;
    // a waving flag
    const flagTex = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#ff8fb8'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = `700 60px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★', w / 2, h / 2 + 4); });
    mesh(gg('pole', () => new THREE.CylinderGeometry(.05, .05, 2.2, 6)), gloss('#ffffff'), 0, 2.8, -3.6, body, false);
    const flag = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.6, .8, 8, 1)), track(new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }))); flag.position.set(0, 3.4, -4.4); flag.rotation.y = Math.PI / 2; body.add(flag); bus.flag = flag;
    g.visible = false; scene.add(g); }
  function startBus() {
    const a = rnd(0, TAU), off = rnd(-55, 55); bus.dx = Math.cos(a); bus.dz = Math.sin(a);
    const ox = -bus.dz * off, oz = bus.dx * off; bus.x0 = ox - bus.dx * 260; bus.z0 = oz - bus.dz * 260; bus.t = 0; bus.on = true; bus.g.visible = true;
    // eject everyone before the bus leaves the island
    let e = 260; for (let s = 440; s > 260; s -= 4) { const x = bus.x0 + bus.dx * s, z = bus.z0 + bus.dz * s; if (groundAt(x, z) > 1) { e = s; break; } } bus.ejectAt = e - 6;
    bus.x = bus.x0; bus.z = bus.z0;
  }
  function stepBus(dt) {
    if (!bus.on) return; bus.t += dt; const s = bus.t * bus.speed; bus.x = bus.x0 + bus.dx * s; bus.z = bus.z0 + bus.dz * s; bus.y = 115 + Math.sin(bus.t * .8) * .8;
    bus.g.position.set(bus.x, bus.y, bus.z); bus.g.rotation.y = Math.atan2(bus.dx, bus.dz); bus.body.rotation.z = Math.sin(bus.t * 1.3) * .03; bus.prop.rotation.z += dt * 14; bus.flame.scale.setScalar(2.2 + Math.sin(T * 30) * .3);
    const fp = bus.flag.geometry.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(x * 3 - T * 8) * .15 * (x + .8)); } fp.needsUpdate = true;
    if (s >= bus.ejectAt) { for (const a of actors) if (a.alive && a.phase === 'bus') leap(a, true); }
    if (s > 560) { bus.on = false; bus.g.visible = false; }
  }
  const busProg = () => clamp(bus.t * bus.speed / bus.ejectAt, 0, 1);

  // ---------------------------------------------------------------- loot: chests, floor items, ammo
  const chests = [], floor = [];
  const chestG = { base: gg('chb', () => new RoundedBoxGeometry(1.3, .7, .85, 3, .12)), lid: gg('chl', () => new RoundedBoxGeometry(1.34, .36, .89, 3, .14).translate(0, .18, .42)), band: gg('chband', () => new THREE.BoxGeometry(.2, .76, .9)), lock: gg('chlock', () => new RoundedBoxGeometry(.24, .26, .12, 2, .05)) };
  const chestM = { gold: track(new THREE.MeshPhysicalMaterial({ color: '#ffcf4a', roughness: .25, metalness: .35, clearcoat: 1, emissive: '#a36b00', emissiveIntensity: .35 })), wood: gloss('#c98ae8'), open: std('#d9cfe8') };
  for (const s of chestSpots) {
    const g = new THREE.Group(), y = s.y ?? groundAt(s.x, s.z);
    mesh(chestG.base, chestM.wood, 0, .35, 0, g); for (const sx of [-.4, .4]) mesh(chestG.band, chestM.gold, sx, .36, 0, g, false);
    const lid = new THREE.Group(); lid.position.set(0, .7, -.42); mesh(chestG.lid, chestM.wood, 0, 0, 0, lid); mesh(chestG.lock, chestM.gold, 0, .1, .88, lid, false); g.add(lid);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd34a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7 })); track(glow.material); glow.scale.setScalar(3.2); glow.position.y = .6; g.add(glow);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: '#fff3b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); track(sp.material); sp.scale.setScalar(.6); g.add(sp);
    g.position.set(s.x, y, s.z); g.rotation.y = s.h || 0; scene.add(g);
    chests.push({ x: s.x, z: s.z, y, g, lid, glow, sp, open: false, t: 0, via: s.via || null });
  }
  const beamG = gg('beam', () => new THREE.CylinderGeometry(.1, .26, 3.2, 10, 1, true).translate(0, 1.6, 0)), beamM = RAR.map((r) => track(new THREE.MeshBasicMaterial({ color: r.c, transparent: true, opacity: .26, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
  const ringG = gg('lring', () => new THREE.RingGeometry(.35, .6, 24).rotateX(-Math.PI / 2)), ringM = RAR.map((r) => track(new THREE.MeshBasicMaterial({ color: r.c, transparent: true, opacity: .7, depthWrite: false })));
  function rollGun(boost = 0) { const w = WTYPES[wrand([30, 22, 20, 22, 8])], r = clamp(wrand([40, 30, 18, 9, 3]) + boost, 0, 4); return { k: 'gun', w, r, clip: WPN[w].mag }; }
  function rollHeal() { return { k: 'heal', h: Math.random() < .6 ? 'shield' : 'med', n: 1 }; }
  function dropItem(it, x, y, z, vx = 0, vz = 0) {
    const g = new THREE.Group(), r = it.k === 'gun' ? it.r : it.k === 'heal' ? 2 : 0;
    let model;
    if (it.k === 'gun') { model = makeGun(it.w, it.r); model.scale.setScalar(1.7); model.rotation.y = Math.PI / 2; }
    else if (it.k === 'heal') { model = makeHeal(it.h); model.scale.setScalar(1.6); }
    else { model = makeAmmo(it.a); model.scale.setScalar(1.6); }
    const spin = new THREE.Group(); spin.add(model); spin.position.y = .55; g.add(spin);
    let beam = null; if (it.k !== 'ammo') { beam = new THREE.Mesh(beamG, beamM[r]); beam.renderOrder = 3; g.add(beam); }
    const ring = new THREE.Mesh(ringG, ringM[r]); ring.position.y = .06; g.add(ring);
    g.position.set(x, y, z); scene.add(g);
    const f = { it, x, y, z, g, spin, beam, t: rnd(0, 6), vx, vz, vy: vx || vz ? 5 : 0, settle: !!(vx || vz) }; floor.push(f); return f;
  }
  const removeFloor = (f) => { scene.remove(f.g); const i = floor.indexOf(f); if (i >= 0) floor.splice(i, 1); };
  function openChest(c, by) {
    if (c.open) return; c.open = true; c.t = 0; c.glow.visible = false; c.sp.visible = false;
    const fwd = c.g.rotation.y, fx = Math.sin(fwd), fz = Math.cos(fwd);
    const items = [rollGun(1)]; const g0 = items[0]; items.push({ k: 'ammo', a: WPN[g0.w].ammo, n: AMMO[WPN[g0.w].ammo].mag });
    if (Math.random() < .6) items.push(rollHeal()); if (Math.random() < .35) items.push(rollGun());
    items.forEach((it, i) => { const a = (i - (items.length - 1) / 2) * .7; dropItem(it, c.x + fx * .6, c.y + .6, c.z + fz * .6, (fx * Math.cos(a) - fz * Math.sin(a)) * 2.2, (fz * Math.cos(a) + fx * Math.sin(a)) * 2.2); });
    if (by === me_) { wood = Math.min(999, wood + 30); toast('<span style="color:#ffb52e">CHEST!</span> +30 wood'); }
    else if (by) by.wood = (by.wood || 0) + 30;
    if (Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 60) { sfx.chest(); burst(c.x, c.y + 1, c.z, 10); }
  }
  function resetLoot() {
    for (const f of floor.slice()) removeFloor(f);
    for (const c of chests) { c.claim = null; c.open = false; c.lid.rotation.x = 0; c.glow.visible = true; c.sp.visible = true; }
    for (const s of lootSpots) { if (Math.random() < .25) continue; const x = s.x, z = s.z, y = s.y ?? groundAt(x, z); const r = Math.random(); dropItem(r < .55 ? rollGun() : r < .75 ? rollHeal() : (() => { const a = pick(Object.keys(AMMO)); return { k: 'ammo', a, n: AMMO[a].mag }; })(), x, y, z); }
    // a few lone items out in the wild
    for (let k = 0, tries = 0; k < 26 && tries < 600; tries++) { const x = rnd(-170, 170), z = rnd(-170, 170), y = groundAt(x, z); if (y < 1.8) continue; dropItem(Math.random() < .6 ? rollGun() : rollHeal(), x, y, z); k++; }
  }

  // ---------------------------------------------------------------- building
  const pieces = [];
  const pieceG = { wall: gg('pw', () => new THREE.BoxGeometry(G, LV, .28)), floor: gg('pf', () => new THREE.BoxGeometry(G, .28, G)), ramp: gg('pr', () => new THREE.BoxGeometry(G, .28, Math.hypot(G, LV))) };
  const pieceMats = [0, 1, 2].map((k) => track(new THREE.MeshStandardMaterial({ map: plankTex, color: ['#ffffff', '#f0d6d6', '#e9b9c2'][k], roughness: .75 })));
  const ghostM = { ok: track(new THREE.MeshBasicMaterial({ color: '#7fb8ff', transparent: true, opacity: .38, depthWrite: false })), no: track(new THREE.MeshBasicMaterial({ color: '#ff8fa0', transparent: true, opacity: .32, depthWrite: false })) };
  const ghost = { wall: new THREE.Mesh(pieceG.wall, ghostM.ok), floor: new THREE.Mesh(pieceG.floor, ghostM.ok), ramp: new THREE.Mesh(pieceG.ramp, ghostM.ok) };
  Object.values(ghost).forEach((m) => { m.visible = false; m.renderOrder = 4; scene.add(m); });
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const yawDir = (yaw) => { const s = Math.sin(yaw), c = Math.cos(yaw); return Math.abs(s) > Math.abs(c) ? (s > 0 ? 1 : 3) : (c > 0 ? 0 : 2); };
  const cellOf = (v) => Math.floor(v / G);
  function pieceKey(type, i, j, dir, y0) { if (type === 'wall') { if (dir === 2) { j--; dir = 0; } else if (dir === 3) { i--; dir = 1; } } const lv = Math.round(y0 * 2); return type === 'floor' ? `f${i},${j},${lv}` : type === 'ramp' ? `r${i},${j},${lv}` : `w${i},${j},${dir},${lv}`; }
  // where a piece would go for someone standing at (x, y, z) facing yaw
  function planPiece(type, x, y, z, yaw, lookDown = false) {
    const dir = yawDir(yaw), pi = cellOf(x), pj = cellOf(z);
    let i = pi, j = pj;
    if (type !== 'wall' && !lookDown) { i += DIRS[dir][0]; j += DIRS[dir][1]; }
    // the height at the edge between our cell and the target
    let ex = clamp(x, pi * G + .05, pi * G + G - .05), ez = clamp(z, pj * G + .05, pj * G + G - .05);
    if (dir === 0) ez = pj * G + G - .05; else if (dir === 1) ex = pi * G + G - .05; else if (dir === 2) ez = pj * G + .05; else ex = pi * G + .05;
    let y0 = type === 'wall' || lookDown ? y : supportAt(ex, ez, y + .8, 1.2);
    if (type === 'wall' && lookDown) y0 = y;
    // snap to nearby build levels
    let bestD = .7; for (const p of pieces) { if (Math.abs(p.i - i) > 2 || Math.abs(p.j - j) > 2) continue; for (const lv of [p.y0, p.y0 + LV, p.y0 - LV]) { const d = Math.abs(lv - y0); if (d < bestD) { bestD = d; y0 = lv; } } }
    y0 = Math.round(y0 * 20) / 20;
    return { type, i, j, dir, y0, key: pieceKey(type, i, j, dir, y0) };
  }
  function placePiece(pl, owner) {
    if (pieces.some((p) => p.key === pl.key)) return null;
    const { type, i, j, dir, y0 } = pl, m = new THREE.Mesh(pieceG[type], pieceMats[0]); m.castShadow = true; m.receiveShadow = true;
    let s;
    if (type === 'wall') { const ex = dir === 1 ? i * G + G : dir === 3 ? i * G : i * G + G / 2, ez = dir === 0 ? j * G + G : dir === 2 ? j * G : j * G + G / 2; m.position.set(ex, y0 + LV / 2, ez); m.rotation.y = dir % 2 ? Math.PI / 2 : 0; s = dir % 2 ? addSolid(ex - .15, ex + .15, y0, y0 + LV, j * G, j * G + G, 'piece') : addSolid(i * G, i * G + G, y0, y0 + LV, ez - .15, ez + .15, 'piece'); }
    else if (type === 'floor') { m.position.set(i * G + G / 2, y0 - .14, j * G + G / 2); s = addSolid(i * G, i * G + G, y0 - .3, y0, j * G, j * G + G, 'piece'); }
    else { m.position.set(i * G + G / 2, y0 + LV / 2, j * G + G / 2); m.rotation.order = 'YXZ'; m.rotation.y = dir * Math.PI / 2; m.rotation.x = -Math.atan2(LV, G); s = addSolid(i * G, i * G + G, y0, y0 + LV, j * G, j * G + G, 'ramp'); }
    scene.add(m);
    const p = { ...pl, m, s, hp: 45, max: type === 'wall' ? 150 : 140, grow: 0, owner }; s.ref = p; if (type === 'ramp') s.ref = p; pieces.push(p);
    if (Math.hypot(m.position.x - camera.position.x, m.position.z - camera.position.z) < 80) sfx.build();
    return p;
  }
  function hitPiece(p, dmg) {
    p.hp -= dmg; p.m.material = pieceMats[p.hp / p.max > .6 ? 0 : p.hp / p.max > .3 ? 1 : 2]; p.shake = .15;
    if (p.hp <= 0) breakPiece(p);
  }
  function breakPiece(p) {
    const i = pieces.indexOf(p); if (i < 0) return; pieces.splice(i, 1); scene.remove(p.m); indexSolid(p.s, false);
    puff(p.m.position.x, p.m.position.y, p.m.position.z, 7, .7, '#f6d2a2', 2); sfxAt('crack', p.m.position.x, p.m.position.z, 90);
  }
  function stepPieces(dt) {
    for (const p of pieces) { if (p.grow < 1) { p.grow = Math.min(1, p.grow + dt * 4); const k = .3 + .7 * smooth(p.grow); p.m.scale.set(k, k, k); }
      if (p.hp < p.max && p.fill !== false) { p.hp = Math.min(p.max, p.hp + dt * p.max * .6); if (p.hp >= p.max) p.fill = false; }
      if (p.shake > 0) { p.shake -= dt; const o = Math.sin(T * 80) * p.shake * .25; p.m.position.x += o * .1; } }
  }
  function updateGhost() {
    for (const m of Object.values(ghost)) m.visible = false;
    if (!buildMode || state !== 'play' || me_.phase !== 'ground' || !me_.alive) return null;
    const pl = planPiece(piece, me_.x, me_.y, me_.z, camYaw, camPitch > .78); const m = ghost[piece], ok = wood >= 10 && !pieces.some((p) => p.key === pl.key);
    const { i, j, dir, y0 } = pl; m.material = ok ? ghostM.ok : ghostM.no; m.visible = true; m.rotation.set(0, 0, 0);
    if (piece === 'wall') { const ex = dir === 1 ? i * G + G : dir === 3 ? i * G : i * G + G / 2, ez = dir === 0 ? j * G + G : dir === 2 ? j * G : j * G + G / 2; m.position.set(ex, y0 + LV / 2, ez); m.rotation.y = dir % 2 ? Math.PI / 2 : 0; }
    else if (piece === 'floor') m.position.set(i * G + G / 2, y0 - .14, j * G + G / 2);
    else { m.position.set(i * G + G / 2, y0 + LV / 2, j * G + G / 2); m.rotation.order = 'YXZ'; m.rotation.y = dir * Math.PI / 2; m.rotation.x = -Math.atan2(LV, G); }
    return ok ? pl : null;
  }

  // ---------------------------------------------------------------- actors (you + the agents)
  const actors = [];
  const glider = { canopy: gg('glc', () => { const g = new RoundedBoxGeometry(4.6, .16, 1.7, 2, .07), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) - x * x * .11 + Math.cos(z * 1.6) * .14); } g.computeVertexNormals(); return g; }), bar: gg('glb', () => new THREE.CylinderGeometry(.04, .04, 1.3, 6).rotateZ(Math.PI / 2)), string: gg('gls', () => new THREE.CylinderGeometry(.015, .015, 1, 4)) };
  function makeGlider(color) {
    const g = new THREE.Group(), stripeTex = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#ffffff' : color; x.fillRect(i * w / 7, 0, w / 7 + 1, h); } x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, w, 8); });
    const c = mesh(glider.canopy, track(new THREE.MeshPhysicalMaterial({ map: stripeTex, roughness: .4, clearcoat: .7, side: THREE.DoubleSide })), 0, 2.55, 0, g); c.castShadow = true;
    mesh(glider.bar, gloss('#ffffff'), 0, 1.75, .15, g, false);
    for (const sx of [-1, 1]) for (const sz of [-.4, .4]) { const s = mesh(glider.string, std('#ffffff'), sx * 1.2, 2.05, .15 + sz * .5, g, false); s.scale.y = 1.25; s.rotation.z = sx * 1.05; }
    g.visible = false; return g;
  }
  function mkActor(o) { const a = { id: actors.length, name: 'agent', isBot: true, x: 0, y: 115, z: 0, h: 0, vx: 0, vy: 0, vz: 0, hp: 100, sh: 0, alive: true, phase: 'bus', holder: null, root: null, u: null, gunMesh: null, gunKey: '', kills: 0, wood: 0, flash: 0, onGround: false, color: '#9b7cf0', top: 1.6, ...o }; actors.push(a); return a; }
  const me_ = mkActor({ name: myName, isBot: false, color: hexOk(me.color) ? me.color : '#8f7cf2' });
  const bots = crew.slice(0, N_BOTS).map((c) => mkActor({ name: c.name, color: c.color, agent: c, skill: rnd(.38, .62) }));
  // your stuff
  const inv = [null, null, null, null, null], ammo = { light: 0, medium: 0, shells: 0, heavy: 0 };
  let sel = -1, wood = 0, elims = 0, buildMode = false, piece = 'wall', reloadT = 0, fireCd = 0, burstLeft = 0, burstT = 0, triggerHeld = false, firedThisPress = false, ads = false, chan = null, swingT = 0, swingCd = 0, buildCd = 0, invDirty = true;
  const curItem = () => (sel >= 0 ? inv[sel] : null), curGun = () => { const it = curItem(); return it && it.k === 'gun' ? it : null; };

  // ---------------------------------------------------------------- game state
  let T = 0, matchT = 0, state = 'help', cardT = 0, shake = 0, hurtT = 0, place = 0, endShown = false, killer = null;
  let locked = false, unlockAt = 0, camYaw = 0, camPitch = .25, camDist = 4.4, dragT = 9;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let best = { score: 0, wins: 0, elims: 0 }; try { best = { ...best, ...JSON.parse(localStorage.getItem('aa.royale.best') || '{}') }; } catch {}
  const aliveN = () => actors.reduce((n, a) => n + (a.alive ? 1 : 0), 0);
  const runScore = () => Math.max(0, (actors.length + 1 - (place || aliveN()))) * 10 + elims * 30 + (place === 1 ? 200 : 0);
  let toastTimer = 0;
  function toast(html, ms = 1800) { toastEl.innerHTML = html; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms); }
  function feed(html, mine = false) { const d = document.createElement('div'); if (mine) d.className = 'me'; d.innerHTML = html; feedEl.prepend(d); while (feedEl.children.length > 5) feedEl.lastChild.remove(); setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 450); }, 5200); }
  function big(text, cls = '', small = '') { bigEl.className = 'ry-big ' + cls; bigEl.innerHTML = `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`; void bigEl.offsetWidth; bigEl.classList.add('on'); }

  // ---------------------------------------------------------------- damage + eliminations
  function dmgActor(t, dmg, by, wName, { head = false, at = null, storm: st = false } = {}) {
    if (!t.alive || dmg <= 0) return;
    let left = dmg, shDmg = 0; if (!st && t.sh > 0) { shDmg = Math.min(t.sh, left); t.sh -= shDmg; left -= shDmg; }
    t.hp -= left; t.flash = .12;
    if (by) { t.lastBy = by; t.lastW = wName; t.lastAt = T; }
    if (by === me_ && at) { dmgNum(at, dmg, head ? 'hd' : shDmg > 0 && left <= 0 ? 'sh' : ''); hitMark(head); head ? sfx.head() : shDmg > 0 ? sfx.shieldHit() : sfx.hit(); }
    if (t === me_) { hurtT = .5; shake = Math.max(shake, st ? .05 : .16); st ? sfx.zap() : sfx.hurt(); if (chan && !st) { cancelChan(); } }
    if (t.isBot && by && by !== t) botHurt(t, by);
    if (t.hp <= 0) eliminate(t, by, wName);
  }
  function hitMark(head) { crossEl.classList.add(head ? 'hd' : 'hm'); clearTimeout(crossEl._t); crossEl._t = setTimeout(() => crossEl.classList.remove('hm', 'hd'), 150); }
  function eliminate(t, by, wName) {
    t.alive = false; t.hp = 0; t.phase = 'out'; t.koT = 0; t.spin = rnd(8, 14) * (Math.random() < .5 ? -1 : 1); t.vy = 5; t.flash = 0;
    if (!by && t.lastBy && T - t.lastAt < 8 && t.lastBy.alive) { by = t.lastBy; wName = t.lastW; }
    if (by && by !== t) by.kills++;
    const near = Math.hypot(t.x - camera.position.x, t.z - camera.position.z) < 120; if (near) sfx.ko();
    // drop everything
    if (t.isBot) { const its = []; if (t.gun) its.push({ ...t.gun, clip: WPN[t.gun.w].mag }); if (t.gun) its.push({ k: 'ammo', a: WPN[t.gun.w].ammo, n: AMMO[WPN[t.gun.w].ammo].mag }); if (t.heals > 0) its.push({ k: 'heal', h: 'shield', n: Math.min(2, t.heals) }); its.forEach((it, i) => { const a = i / its.length * TAU; dropItem(it, t.x, t.y + .5, t.z, Math.cos(a) * 2, Math.sin(a) * 2); }); }
    else { const its = inv.filter(Boolean); for (const [a, n] of Object.entries(ammo)) if (n > 0) its.push({ k: 'ammo', a, n }); its.forEach((it, i) => { const a = i / Math.max(1, its.length) * TAU; dropItem(it, t.x, t.y + .5, t.z, Math.cos(a) * 2.2, Math.sin(a) * 2.2); }); }
    const nm = (a) => (a === me_ ? 'You' : esc(a.name));
    if (by && by !== t) feed(`<b>${nm(by)}</b> ${pick(VERBS)} <b>${nm(t)}</b> <em>${esc(wName || '')}</em>`, by === me_ || t === me_);
    else feed(`<b>${nm(t)}</b> <i>got swept up by the storm</i>`, t === me_);
    if (by === me_ && t !== me_) { elims++; sfx.elim(); big(`ELIMINATED ${t.name}`, '', `${elims} elimination${elims > 1 ? 's' : ''} · ${aliveN()} left`); }
    if (t === me_) { place = aliveN() + 1; killer = by && by !== t ? by : null; state = 'dead'; cardT = 1.8; buildMode = false; wrap.classList.remove('building'); cancelChan(); if (lastHitBy && performance.now() - lastHitAt < 4000) { live?.pvp({ t: 'ko', by: lastHitBy }); lastHitBy = null; } else live?.pvp({ t: 'ko', by: '' }); sfx.lose(); }
    else if (me_.alive && aliveN() === 1 && state === 'play') { place = 1; state = 'won'; cardT = 1.2; sfx.win(); for (let k = 0; k < 5; k++) setTimeout(() => { if (!closed) burst(me_.x + rnd(-3, 3), me_.y + 3 + rnd(0, 3), me_.z + rnd(-3, 3), 18); }, k * 260); }
  }

  // ---------------------------------------------------------------- models
  const holderOf = (a) => { const h = new THREE.Group(); h.add(a.root); const gl = makeGlider(a.color); h.add(gl); a.glider = gl; scene.add(h); a.holder = h; };
  function setGunMesh(a, it) {
    const key = it ? `${it.w}${it.r}` : a.isBot ? '' : (sel < 0 && !buildMode ? 'pick' : '');
    if (key === a.gunKey) return; a.gunKey = key; if (a.gunMesh) { a.gunMesh.parent?.remove(a.gunMesh); a.gunMesh = null; }
    if (!key) return;
    const g = key === 'pick' ? makePickaxe() : makeGun(it.w, it.r);
    if (a.isBot) { g.scale.setScalar(.95); g.position.set(-.36, a.top * .45, .32); a.holder.add(g); }
    else { if (key === 'pick') { g.position.set(-.34, .95, .2); g.rotation.x = .9; } else g.position.set(-.3, .78, .32); a.root.add(g); }
    a.gunMesh = g;
  }
  function makeBlob(color) {
    const root = new THREE.Group(); const b = mesh(gg('blob', () => new THREE.SphereGeometry(.55, 20, 14)), gloss(color), 0, .55, 0, root); b.scale.set(1, .95, 1);
    for (const sx of [-1, 1]) { const e = mesh(gg('eye', () => new THREE.SphereGeometry(.045, 8, 6)), std('#2a1c2e'), sx * .18, .68, .5, root, false); e.scale.setScalar(2.2); }
    const u = { H: 1.15, walk: 0, walkPhase: 0, update(t) { b.position.y = .55 + Math.abs(Math.sin(u.walkPhase)) * .12 * u.walk; } };
    return { root, u };
  }
  let ready = false, modelsDone = false;
  async function loadModels() {
    let A = null, Pm = null;
    try { [A, Pm] = await Promise.all([import('../agents3d.js').catch(() => null), import('../person3d.js').catch(() => null)]); } catch {}
    if (closed) return;
    let pv = null;
    try { if (Pm?.buildPerson) { const root = Pm.buildPerson(me.look || Pm.DEFAULT_LOOK); pv = { root, u: root.userData.creature }; } } catch (e) { console.warn('royale: person fallback', e); }
    if (!pv) pv = makeBlob(me_.color);
    pv.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    me_.root = pv.root; me_.u = pv.u; me_.top = 1.75; holderOf(me_);
    let n = 0;
    for (const b of bots) {
      let v = null;
      try { if (A?.buildCreature) { const genes = b.agent.genes || A.makeGenes(hashStr(b.agent.name) % 100000); const root = A.buildCreature(genes, { evo: 1 }); v = { root, u: root.userData.creature }; } } catch (e) { if (!n++) console.warn('royale: creature fallback', e); }
      if (!v) v = makeBlob(b.color);
      const inner = new THREE.Group(); inner.add(v.root); v.root.updateMatrixWorld(true);
      const body = v.root.getObjectByProperty('isMesh', true), bb = new THREE.Box3().setFromObject(body || v.root), hgt = v.u?.H || Math.max(.3, bb.max.y - bb.min.y), s = 1.45 / hgt;
      v.root.scale.multiplyScalar(s); v.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      b.root = inner; b.u = v.u; b.top = 1.45 * 1.1; holderOf(b);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(b.name, b.color), transparent: true, depthWrite: false })); track(tag.material); tag.scale.set(2.4, .53, 1); tag.position.y = b.top + .7; b.holder.add(tag); b.tag = tag;
      if (tst) tst.loaded = (tst.loaded || 0) + 1;
    }
    modelsDone = true; ready = true; if (tst) tst.ready = true;
  }

  // ---------------------------------------------------------------- the match
  function newMatch() {
    T = 0; matchT = 0; place = 0; endShown = false; killer = null; elims = 0; posted = false;
    Object.assign(storm, { phase: 0, mode: 'wait', t: PHASES[0].wait, cur: { x: 0, z: 0, r: 320 }, from: { x: 0, z: 0, r: 320 }, tick: 1, dmg: 1 }); pickNext();
    for (const p of pieces.slice()) breakPiece(p);
    for (const t of trees) if (t.hp <= 0 || t.hp < 5) { t.hp = 5; placeTree(t); indexSolid(t.solid, false); indexSolid(t.solid); }
    resetLoot(); startBus();
    inv.fill(null); for (const k in ammo) ammo[k] = 0; sel = -1; wood = 0; buildMode = false; wrap.classList.remove('building'); reloadT = 0; burstLeft = 0; chan = null; invDirty = true;
    for (const a of actors) { Object.assign(a, { alive: true, hp: 100, sh: 0, phase: 'bus', x: bus.x, y: bus.y, z: bus.z, vx: 0, vy: 0, vz: 0, kills: 0, flash: 0, lastBy: null, gun: null, heals: 0, wood: a.isBot ? 40 : 0, target: null, goal: null, mode: 'roam' });
      if (a.holder) { a.holder.visible = false; a.holder.rotation.set(0, 0, 0); a.holder.scale.setScalar(1); a.glider.visible = false; }
      if (a.isBot) { const tgt = Math.random() < .8 ? pick(POIS) : { x: rnd(-140, 140), z: rnd(-140, 140), r: 10 }; a.drop = { x: tgt.x + rnd(-1, 1) * (tgt.r || 10) * .6, z: tgt.z + rnd(-1, 1) * (tgt.r || 10) * .6 }; const s = ((a.drop.x - bus.x0) * bus.dx + (a.drop.z - bus.z0) * bus.dz) - rnd(30, 60); a.jumpAt = clamp(s, 40, bus.ejectAt - 10); a.thinkT = rnd(0, .4); a.strafe = 1; a.stuckT = 0; a.buildCd = 0; a.fireCd = 1; a.react = 0; a.burst = 0; a.healT = 0; } }
    if (me_.holder) setGunMesh(me_, null);
    for (const a of actors) if (a.isBot && a.holder) setGunMesh(a, null);
    camYaw = Math.atan2(bus.dx, bus.dz) + .9; camPitch = .35; camDist = 30; modal.style.display = 'none'; feedEl.innerHTML = '';
    state = 'play'; big('BOARD THE BALLOON BUS', 'purple', mobile ? 'tap JUMP to leap out' : 'press SPACE to jump out');
  }
  function leap(a, forced = false) {
    if (a.phase !== 'bus') return;
    a.phase = 'sky'; a.x = bus.x + rnd(-1, 1); a.z = bus.z + rnd(-1, 1); a.y = bus.y - 3; a.vy = -2; a.vx = bus.dx * 8; a.vz = bus.dz * 8; a.h = Math.atan2(bus.dx, bus.dz); a.skyT = 0;
    if (a.holder) a.holder.visible = true;
    if (a === me_) { sfx.leap(); camDist = 7; camPitch = .45; if (forced) toast('The bus dropped you off. Glide!'); }
  }

  // ---------------------------------------------------------------- your actions
  function select(i) {
    if (state !== 'play' || !me_.alive || me_.phase !== 'ground') { if (i !== sel) { sel = i; invDirty = true; } return; }
    if (i === sel && !buildMode) return; if (buildMode) { buildMode = false; wrap.classList.remove('building'); }
    sel = i; reloadT = 0; burstLeft = 0; cancelChan(); invDirty = true; sfx.swap(); setGunMesh(me_, curGun());
  }
  function reload() { const g = curGun(); if (!g || reloadT > 0) return; const W = WPN[g.w]; if (g.clip >= W.mag || ammo[W.ammo] <= 0) { if (ammo[W.ammo] <= 0 && g.clip <= 0) toast(`Out of ${AMMO[W.ammo].n.toLowerCase()}`); return; } reloadT = W.reload / (1 + g.r * .04); sfx.reload(); }
  function finishReload() { const g = curGun(); if (!g) return; const W = WPN[g.w], need = W.mag - g.clip, n = Math.min(need, ammo[W.ammo]); g.clip += n; ammo[W.ammo] -= n; invDirty = true; }
  const aimDir = new THREE.Vector3();
  // the world point under the crosshair (walls, ground, bodies), so shots go exactly where you aim
  function aimPoint(maxT = 400) {
    camera.getWorldDirection(aimDir); const o = camera.position, d = aimDir;
    const camToMe = Math.max(0, (me_.x - o.x) * d.x + (me_.y + 1.2 - o.y) * d.y + (me_.z - o.z) * d.z);
    const so = tmpV3.copy(o).addScaledVector(d, camToMe * .9);
    const r = raySolid(so, d, maxT); let best = r.t + camToMe * .9;
    for (const a of actors) { if (a === me_ || !a.alive || a.phase === 'bus') continue; const t = raySpheres(o, d, a, best); if (t != null) best = t; }
    for (const q of others.values()) if (q.here && !q.d) { const t = raySpheres(o, d, { x: q.x, y: q.y || groundAt(q.x, q.z), z: q.z }, best); if (t != null) best = t; }
    return tmpV2.copy(o).addScaledVector(d, best);
  }
  // a body as two spheres (legs/body and head)
  function raySpheres(o, d, a, maxT) {
    let best = null;
    for (const [hy, r] of [[.6, .5], [1.25, .5]]) { const cx = a.x - o.x, cy = a.y + hy - o.y, cz = a.z - o.z, t = cx * d.x + cy * d.y + cz * d.z; if (t < .5 || t > maxT) continue; const qx = cx - d.x * t, qy = cy - d.y * t, qz = cz - d.z * t, q2 = qx * qx + qy * qy + qz * qz; if (q2 > r * r) continue; const tt = t - Math.sqrt(r * r - q2); if (best == null || tt < best) best = tt; }
    return best;
  }
  function shotRay(o, d, range, shooter) {
    const r = raySolid(o, d, range); let best = r.t, hit = r.hit ? { ...r.hit, t: r.t } : null;
    for (const a of actors) { if (a === shooter || !a.alive || a.phase === 'bus') continue; const t = raySpheres(o, d, a, best); if (t != null && t < best) { best = t; hit = { kind: 'actor', a, t, head: o.y + d.y * t > a.y + 1.32 }; } }
    if (shooter === me_) for (const q of others.values()) { if (!q.here || q.d) continue; const t = raySpheres(o, d, { x: q.x, y: q.y || groundAt(q.x, q.z), z: q.z }, best); if (t != null && t < best) { best = t; hit = { kind: 'peer', q, t }; } }
    return { t: best, hit };
  }
  const muzzlePos = (a, out) => { if (a.gunMesh?.userData.muzzle && a.holder?.visible) { a.gunMesh.userData.muzzle.getWorldPosition(out); return out; } return out.set(a.x, a.y + 1.1, a.z); };
  function fire() {
    const g = curGun(); if (!g) return; const W = WPN[g.w];
    if (reloadT > 0 || fireCd > 0) return;
    if (g.clip <= 0) { sfx.empty(); reload(); fireCd = .25; return; }
    cancelChan();
    if (W.burst) { burstLeft = W.burst; burstT = 0; fireCd = W.rate; return; }
    shootOnce(g, W); fireCd = W.rate;
  }
  function shootOnce(g, W) {
    if (g.clip <= 0) return; g.clip--; invDirty = true; if (g.clip === 0) setTimeout(() => { if (!closed && curGun() === g) reload(); }, 220);
    const P = aimPoint(W.range), origin = muzzlePos(me_, new THREE.Vector3());
    const moving = Math.hypot(me_.vx, me_.vz) > 1, air = !me_.onGround;
    const sp = (ads ? (W.adsSpread ?? W.spread * .45) : W.spread) * (moving ? 1.4 : 1) * (air ? 1.6 : 1);
    const base = tmpV3.copy(P).sub(origin).normalize();
    // touch: a gentle pull toward a body near the crosshair
    if (mobile) { let bestA = .09, lock = null; for (const t of actors) { if (t === me_ || !t.alive || t.phase === 'bus') continue; const v = new THREE.Vector3(t.x - origin.x, t.y + 1 - origin.y, t.z - origin.z), L = v.length(); if (L > W.range) continue; const ang = v.divideScalar(L).angleTo(base); if (ang < bestA) { bestA = ang; lock = v; } } if (lock) base.copy(lock); }
    const n = W.pellets || 1, dmgEach = W.dmg * RAR[g.r].m;
    const hitAgg = new Map();
    for (let k = 0; k < n; k++) {
      const d = new THREE.Vector3(base.x + rnd(-sp, sp), base.y + rnd(-sp, sp) * .7, base.z + rnd(-sp, sp)).normalize();
      const r = shotRay(origin, d, W.range, me_), end = origin.clone().addScaledVector(d, r.t);
      if (k < 3 || !(W.pellets)) tracer(origin, end, W.col === '#6fb7ff' ? '#c9e6ff' : '#fff2a0', W.scope ? .1 : .07);
      const fall = W.pellets ? clamp(1.3 - r.t / W.eff * .7, .25, 1) : r.t > W.eff ? clamp(1 - (r.t - W.eff) / W.range, .5, 1) : 1;
      if (r.hit?.kind === 'actor') { const prev = hitAgg.get(r.hit.a) || { dmg: 0, head: false, at: end }; prev.dmg += dmgEach * fall * (r.hit.head ? (W.scope ? 2 : 1.5) : 1); prev.head ||= r.hit.head; hitAgg.set(r.hit.a, prev); }
      else if (r.hit?.kind === 'peer') { live?.pvp({ t: 'hit', id: r.hit.q.id, dmg: Math.round(dmgEach * fall) }); hitMark(false); sfx.hit(); }
      else if (r.hit?.kind === 'piece') { hitPiece(r.hit.s.ref, dmgEach * fall); puff(end.x, end.y, end.z, 1, .2, '#f6d2a2', .5); }
      else if (r.hit?.kind === 'ramp') { hitPiece(r.hit.s.ref, dmgEach * fall); }
      else if (r.hit?.kind === 'tree') { puff(end.x, end.y, end.z, 1, .25, '#b4e39a', .5); }
      else if (r.hit) puff(end.x, end.y, end.z, 1, .2, '#f3ecff', .4);
      if (k === 0) live?.pvp({ t: 'fx', x0: origin.x, z0: origin.z, x1: end.x, z1: end.z });
    }
    for (const [a, h] of hitAgg) dmgActor(a, h.dmg, me_, W.name, { head: h.head, at: h.at.clone().setY(a.y + 1.6) });
    flash(origin, W.pellets ? 1.3 : 1); sfx[W.snd](); shake = Math.max(shake, W.pellets ? .14 : W.scope ? .2 : .05);
    camPitch = clamp(camPitch - (W.scope ? .03 : W.pellets ? .025 : .006), -.6, 1.2);
    me_.aimHold = .8;
  }
  function tryFire() {
    if (state !== 'play' || !me_.alive || me_.phase !== 'ground' || !ready) return;
    if (buildMode) { if (buildCd <= 0) { build(); buildCd = .14; } return; }
    const it = curItem();
    if (!it) { swing(); return; }
    if (it.k === 'heal') { if (!firedThisPress) startHeal(it); firedThisPress = true; return; }
    const W = WPN[it.w];
    if (!W.auto && firedThisPress) return; fire(); firedThisPress = true;
  }
  function swing() {
    if (swingCd > 0) return; swingCd = .42; swingT = .3;
    // what's right in front of you: a tree, a build piece, a body
    camera.getWorldDirection(aimDir); const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const o = new THREE.Vector3(me_.x, me_.y + 1.1, me_.z), d = new THREE.Vector3(fx, clamp(aimDir.y, -.6, .6), fz).normalize();
    const r = shotRay(o, d, 2.6, me_);
    let did = false;
    if (r.hit?.kind === 'actor') { dmgActor(r.hit.a, 20, me_, 'Candy Pickaxe', { at: o.clone().addScaledVector(d, r.t).setY(r.hit.a.y + 1.6) }); did = true; }
    else if (r.hit?.kind === 'piece' || r.hit?.kind === 'ramp') { hitPiece(r.hit.s.ref, 50); did = true; sfx.chop(); }
    else { let tree = r.hit?.kind === 'tree' ? r.hit.s.ref : null; if (!tree) nearSolids(me_.x, me_.z, 2.4, (s) => { if (s.kind !== 'tree' || tree) return; const t = s.ref, dx = t.x - me_.x, dz = t.z - me_.z, dd = Math.hypot(dx, dz); if (dd < 2.4 && (dx * fx + dz * fz) / dd > .4) tree = t; });
      if (tree && tree.hp > 0) { chopTree(tree); did = true; } }
    if (!did) sfx.whiff();
  }
  function chopTree(t) {
    t.hp--; const gain = 7 + Math.floor(Math.random() * 3); wood = Math.min(999, wood + gain); sfx.chop(); puff(t.x, t.y + 2.4, t.z, 4, .5, '#b4e39a', 1.6); invDirty = true;
    dmgNum(new THREE.Vector3(t.x, t.y + 2.2, t.z), gain, 'sh');
    if (t.hp <= 0) { placeTree(t); indexSolid(t.solid, false); puff(t.x, t.y + 2, t.z, 8, .8, '#b4e39a', 2.2); sfx.crack(); } else { t.wob = 1; }
  }
  function build() {
    const pl = updateGhost(); if (!pl) { if (wood < 10) { sfx.nope(); toast('Need 10 wood · hit trees with the pickaxe (F)'); } return; }
    if (placePiece(pl, me_)) { wood -= 10; invDirty = true; }
  }
  function toggleBuild(on = !buildMode) {
    if (state !== 'play' || !me_.alive || me_.phase !== 'ground') return;
    buildMode = on; wrap.classList.toggle('building', buildMode); cancelChan(); reloadT = 0; burstLeft = 0; invDirty = true; sfx.swap();
    setGunMesh(me_, buildMode ? null : curGun());
  }
  function choosePiece(p) { piece = p; if (!buildMode) toggleBuild(true); buildEl.querySelectorAll('[data-p]').forEach((d) => d.classList.toggle('on', d.dataset.p === piece)); }
  function startHeal(it) {
    const H = HEALS[it.h];
    if (it.h === 'shield' && me_.sh >= 100) { toast('Shield is full'); sfx.nope(); return; }
    if (it.h === 'med' && me_.hp >= 100) { toast('Health is full'); sfx.nope(); return; }
    chan = { it, t: 0, max: H.time, label: H.name }; sfx.sip();
  }
  function cancelChan() { chan = null; }
  function stepChan(dt) {
    if (!chan) return; chan.t += dt;
    if (chan.t >= chan.max) { const it = chan.it; if (it.h === 'shield') me_.sh = Math.min(100, me_.sh + 50); else me_.hp = Math.min(100, me_.hp + 60); it.n--; if (it.n <= 0) { const i = inv.indexOf(it); if (i >= 0) inv[i] = null; } invDirty = true; sfx.healed(); chan = null; puff(me_.x, me_.y + 1, me_.z, 6, .4, it.h === 'shield' ? '#9fd2ff' : '#ffb3c7', 1.2); }
  }
  // E: open the chest or pick up the item in front of you
  function nearestInteract() {
    if (me_.phase !== 'ground' || !me_.alive) return null;
    let best = null, bd = 2.6;
    for (const c of chests) { if (c.open) continue; const d = Math.hypot(c.x - me_.x, c.z - me_.z) + Math.abs(c.y - me_.y) * .5; if (d < bd) { bd = d; best = { c }; } }
    for (const f of floor) { if (f.it.k === 'ammo' || f.settle) continue; const d = Math.hypot(f.x - me_.x, f.z - me_.z) + Math.abs(f.y - me_.y) * .5; if (d < bd - .2) { bd = d; best = { f }; } }
    return best;
  }
  function interact() {
    const n = nearestInteract(); if (!n) return;
    if (n.c) { openChest(n.c, me_); return; }
    pickup(n.f);
  }
  function pickup(f) {
    const it = f.it;
    if (it.k === 'heal') { const same = inv.find((q) => q && q.k === 'heal' && q.h === it.h && q.n < HEALS[it.h].max); if (same) { const add = Math.min(it.n, HEALS[it.h].max - same.n); same.n += add; it.n -= add; if (it.n <= 0) removeFloor(f); sfx.pickup(); invDirty = true; return; } }
    let slot = inv.indexOf(null);
    if (slot < 0) { slot = sel >= 0 ? sel : 0; const old = inv[slot]; dropItem(old, me_.x, me_.y + .4, me_.z, Math.sin(camYaw + 2) * 1.5, Math.cos(camYaw + 2) * 1.5); }
    inv[slot] = it; removeFloor(f); sfx.pickup(); invDirty = true;
    if (it.k === 'gun') toast(`<span style="color:${RAR[it.r].d}">${RAR[it.r].n}</span> ${WPN[it.w].name}`, 1400);
    if (sel < 0 || slot === sel || !inv[sel]) select(slot); else if (sel === slot) setGunMesh(me_, curGun());
  }

  // ---------------------------------------------------------------- bots: drop, loot, roam, fight, build, flee the storm
  const vis = (a, b) => { const o = tmpV.set(a.x, a.y + 1.4, a.z), dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz); if (L < .5) return true; const d = tmpV2.set(dx / L, dy / L, dz / L); return raySolid(o, d, L).t >= L - .6; };
  function botHurt(b, by) {
    if (!b.target || Math.random() < .6) { b.target = by; b.react = Math.min(b.react || 0, .2); }
    if (b.wood >= 10 && b.buildCd <= 0 && b.phase === 'ground' && Math.random() < .55) {
      b.buildCd = rnd(4, 7); const yaw = Math.atan2(by.x - b.x, by.z - b.z), pl = planPiece('wall', b.x, b.y, b.z, yaw);
      if (placePiece(pl, b)) b.wood -= 10;
      if (b.wood >= 10 && Math.random() < .35) { const pl2 = planPiece('ramp', b.x, b.y, b.z, yaw + Math.PI); if (placePiece(pl2, b)) b.wood -= 10; }
    }
  }
  function botThink(b) {
    const W = b.gun ? WPN[b.gun.w] : null;
    // targets: the nearest enemy we could see
    let tgt = null, td = W ? Math.min(75, W.eff * 1.6 + 20) : 14;
    for (const a of actors) { if (a === b || !a.alive || a.phase !== 'ground') continue; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d > td) continue; if (a === me_ && d > 50 && Math.random() < .5) continue; tgt = a; td = d; }
    if (b.target && (!b.target.alive || b.target.phase !== 'ground' || Math.hypot(b.target.x - b.x, b.target.z - b.z) > 90)) b.target = null;
    if (tgt && (!b.target || td < Math.hypot(b.target.x - b.x, b.target.z - b.z) * .6)) { if (b.target !== tgt) b.react = tgt === me_ ? rnd(.5, .9) : rnd(.2, .5); b.target = tgt; }
    // storm: get inside
    const c = storm.mode === 'wait' && storm.t < 30 ? storm.next : storm.cur, dc = Math.hypot(b.x - c.x, b.z - c.z);
    if (dc > c.r - 3) { if (b.mode !== 'rotate' || !b.goal) { const a = Math.atan2(b.z - c.z, b.x - c.x) + rnd(-.5, .5), rr = c.r * rnd(.2, .6); b.goal = { x: c.x + Math.cos(a) * rr, z: c.z + Math.sin(a) * rr }; } b.mode = 'rotate'; if (!b.target || Math.hypot(b.target.x - b.x, b.target.z - b.z) > 14) return; }
    if (b.target && b.gun) { b.mode = 'fight'; return; }
    if (b.target && !b.gun && td < 3) { b.mode = 'fight'; return; }
    // heal up
    if (b.heals > 0 && b.sh < 50 && !b.target) { b.mode = 'heal'; return; }
    // loot: chests and better guns nearby
    if (!b.gun || b.gun.r < 2 || b.heals < 1 || Math.random() < .3) {
      let lb = null, ld = b.gun ? 45 : 90;
      for (const ch of chests) { if (ch.open || ch.claim && ch.claim !== b && ch.claim.alive) continue; const d = Math.hypot(ch.x - b.x, ch.z - b.z); if (d < ld && inZone(ch)) { ld = d; lb = { c: ch }; } }
      for (const f of floor) { if (f.settle) continue; const it = f.it; if (it.k === 'ammo' || (it.k === 'gun' && b.gun && it.r <= b.gun.r) || (it.k === 'heal' && b.heals >= 3)) continue; const d = Math.hypot(f.x - b.x, f.z - b.z) * (it.k === 'gun' ? .8 : 1.2); if (d < ld && inZone(f)) { ld = d; lb = { f }; } }
      if (lb) { b.mode = 'loot'; b.loot = lb; if (lb.c) lb.c.claim = b; const p = lb.c || lb.f; b.goal = { x: p.x, z: p.z, via: lb.c?.via || viaFor(p) }; return; }
    }
    // roam inside the zone
    if (b.mode !== 'roam' || !b.goal || Math.hypot(b.goal.x - b.x, b.goal.z - b.z) < 3) { const z = storm.next, a = rnd(0, TAU), rr = Math.sqrt(Math.random()) * z.r * .8; b.goal = { x: z.x + Math.cos(a) * rr, z: z.z + Math.sin(a) * rr }; for (let k = 0; k < 6 && groundAt(b.goal.x, b.goal.z) < 1.5; k++) { b.goal.x *= .8; b.goal.z *= .8; } }
    b.mode = 'roam';
  }
  const inZone = (p) => Math.hypot(p.x - storm.next.x, p.z - storm.next.z) < storm.next.r + (storm.mode === 'wait' ? 20 : 0) || storm.phase === 0;
  const viaFor = (p) => { for (const h of houses) if (p.x > h.x0 && p.x < h.x1 && p.z > h.z0 && p.z < h.z1) return h.door; return null; };
  const inHouse = (x, z) => houses.find((h) => x > h.x0 - .1 && x < h.x1 + .1 && z > h.z0 - .1 && z < h.z1 + .1) || null;
  function botShoot(b, t) {
    const W = WPN[b.gun.w], d = Math.hypot(t.x - b.x, t.z - b.z), near = Math.hypot(b.x - camera.position.x, b.z - camera.position.z) < 160;
    const mv = Math.hypot(t.vx, t.vz) > 4 ? .8 : 1;
    let p = b.skill * clamp(1.2 - d / W.eff, .1, .95) * mv * (t === me_ ? .5 : 1) * (t.phase !== 'ground' ? .5 : 1) * (t.onGround === false ? .75 : 1);
    if (t === me_ && ads === false && Math.hypot(me_.vx, me_.vz) > 6) p *= .85;
    const o = near ? muzzlePos(b, new THREE.Vector3()) : new THREE.Vector3(b.x, b.y + 1.1, b.z);
    const n = W.pellets || 1; let dmg = 0;
    for (let k = 0; k < n; k++) {
      const hit = Math.random() < p, aim = new THREE.Vector3(t.x + (hit ? rnd(-.2, .2) : rnd(-1.8, 1.8)), t.y + (hit ? rnd(.6, 1.3) : rnd(.2, 2.4)), t.z + (hit ? rnd(-.2, .2) : rnd(-1.8, 1.8)));
      let end = aim, blocked = false;
      if (near || t === me_) { const dir = aim.clone().sub(o), L = dir.length(); dir.divideScalar(L); const r = raySolid(o, dir, L); if (r.t < L - .3) { end = o.clone().addScaledVector(dir, r.t); blocked = true; if (r.hit?.kind === 'piece' || r.hit?.kind === 'ramp') hitPiece(r.hit.s.ref, W.dmg * RAR[b.gun.r].m); } }
      if (hit && !blocked) dmg += W.dmg * RAR[b.gun.r].m * (W.pellets ? clamp(1.3 - d / W.eff * .7, .25, 1) : 1);
      if (near && k < 2) tracer(o, end, t === me_ ? '#ffb3c7' : '#d9c9ff');
    }
    if (near) { flash(o, .8); sfxAt(W.snd, b.x, b.z, 150); }
    if (dmg > 0) dmgActor(t, dmg, b, W.name);
  }
  function stepBot(b, dt) {
    b.thinkT -= dt; b.fireCd -= dt; b.buildCd -= dt; b.react -= dt;
    if (b.thinkT <= 0) { b.thinkT = rnd(.25, .45); botThink(b); }
    let gx = b.x, gz = b.z, spd = 0, face = null;
    const sprint = 6.6, walk = 4.4;
    if (b.mode === 'fight' && b.target) {
      const t = b.target, d = Math.hypot(t.x - b.x, t.z - b.z), W = b.gun ? WPN[b.gun.w] : null, pd = W ? W.pd : 1.5;
      face = Math.atan2(t.x - b.x, t.z - b.z);
      if (Math.random() < dt * .7) b.strafe = -b.strafe;
      const ax = (t.x - b.x) / (d || 1), az = (t.z - b.z) / (d || 1), rad = d > pd + 4 ? 1 : d < pd - 3 ? -1 : 0;
      gx = b.x + ax * rad * 4 + -az * b.strafe * 3; gz = b.z + az * rad * 4 + ax * b.strafe * 3; spd = rad > 0 && d > pd + 15 ? sprint : walk * .9;
      if (W && b.react <= 0 && b.fireCd <= 0 && d < W.range) {
        if (W.burst && b.burst <= 0) b.burst = W.burst;
        if (b.burst > 0) { b.burst--; b.fireCd = b.burst > 0 ? W.gap : W.rate * rnd(1.1, 1.6); } else b.fireCd = W.rate * (W.auto ? rnd(1, 1.4) : rnd(1.4, 2.4)) + (W.scope ? rnd(.5, 1.5) : 0);
        if (Math.hypot(b.x - camera.position.x, b.z - camera.position.z) > 220 || vis(b, t)) botShoot(b, t); else { b.strafe = -b.strafe; gx = t.x; gz = t.z; spd = walk; }
      }
      if (!W && d < 2.2 && b.fireCd <= 0) { b.fireCd = .5; dmgActor(t, 20, b, 'Candy Pickaxe'); b.swingT = .3; }
      if (b.onGround && Math.random() < dt * .35) { b.vy = 7; b.onGround = false; }
    } else if (b.mode === 'heal') {
      b.healT += dt; spd = 0; if (b.healT > 2.2) { b.healT = 0; b.heals--; b.sh = Math.min(100, b.sh + 50); b.mode = 'roam'; }
    } else if (b.goal) {
      let g = b.goal;
      // go round to the door of a house first
      if (g.via && !inHouse(b.x, b.z) && Math.hypot(g.via.x - b.x, g.via.z - b.z) > 1.2) g = g.via;
      gx = g.x; gz = g.z; spd = b.mode === 'rotate' ? sprint : Math.hypot(gx - b.x, gz - b.z) > 25 ? sprint : walk;
      if (b.mode === 'loot' && b.loot) {
        const p = b.loot.c || b.loot.f, d = Math.hypot(p.x - b.x, p.z - b.z);
        if (b.loot.c && b.loot.c.open || b.loot.f && !floor.includes(b.loot.f)) { b.loot = null; b.goal = null; b.thinkT = 0; }
        else if (d < 1.6) { if (b.loot.c) openChest(b.loot.c, b); else botTake(b, b.loot.f); b.loot = null; b.goal = null; b.thinkT = .3; }
      }
    }
    if (b.healT > 0 && b.mode !== 'heal') b.healT = 0;
    // grab good stuff we walk over
    for (const f of floor) { if (f.settle || Math.abs(f.x - b.x) > 1.4 || Math.abs(f.z - b.z) > 1.4) continue; const it = f.it; if ((it.k === 'gun' && (!b.gun || it.r > b.gun.r)) || (it.k === 'heal' && b.heals < 3)) { botTake(b, f); break; } }
    moveBody(b, gx, gz, spd, dt, face);
    // stuck: hop, then sidestep
    const moved = Math.hypot(b.x - (b.px ?? b.x), b.z - (b.pz ?? b.z)); b.px = b.x; b.pz = b.z;
    if (spd > 1 && moved < spd * dt * .25) { b.stuckT += dt; if (b.stuckT > .6 && b.onGround) { b.vy = 7.5; b.onGround = false; } if (b.stuckT > 1.6) { b.stuckT = 0; const a = rnd(0, TAU); b.goal = { x: b.x + Math.cos(a) * 8, z: b.z + Math.sin(a) * 8 }; b.mode = 'roam'; b.loot = null; } } else b.stuckT = Math.max(0, b.stuckT - dt);
  }
  function botTake(b, f) {
    const it = f.it; if (!floor.includes(f)) return;
    if (it.k === 'gun') { if (b.gun && b.gun.r >= it.r) return; if (b.gun) { const old = b.gun; dropItem({ ...old, clip: WPN[old.w].mag }, b.x, b.y + .4, b.z, rnd(-1, 1), rnd(-1, 1)); } b.gun = { k: 'gun', w: it.w, r: it.r }; setGunMesh(b, b.gun); }
    else if (it.k === 'heal') b.heals = (b.heals || 0) + it.n;
    removeFloor(f);
  }
  // walking: steer toward (gx, gz) at spd, gravity, collisions; used by bots (you have your own controls)
  function moveBody(a, gx, gz, spd, dt, face = null) {
    const dx = gx - a.x, dz = gz - a.z, d = Math.hypot(dx, dz), k = Math.min(1, dt * (a.onGround ? 10 : 3));
    const tvx = d > .3 ? dx / d * spd : 0, tvz = d > .3 ? dz / d * spd : 0;
    a.vx = lerp(a.vx, tvx, k); a.vz = lerp(a.vz, tvz, k);
    stepBody(a, dt);
    const sp = Math.hypot(a.vx, a.vz);
    if (face != null) a.h += angDiff(a.h, face) * Math.min(1, dt * 10); else if (sp > .3) a.h += angDiff(a.h, Math.atan2(a.vx, a.vz)) * Math.min(1, dt * 10);
  }
  function stepBody(a, dt) {
    const px = a.x, pz = a.z; a.x += a.vx * dt; a.z += a.vz * dt;
    pushOut(a, .42);
    // keep out of the deep sea
    if (groundAt(a.x, a.z) < -1.3 && supportAt(a.x, a.z, a.y) < -1.3) { a.x = px; a.z = pz; a.vx *= -.2; a.vz *= -.2; }
    a.vy -= 22 * dt; const ny = a.y + a.vy * dt;
    if (a.vy > 0) { const c = ceilingAt(a.x, a.z, a.y); if (ny + 1.75 > c) { a.vy = 0; } }
    a.y += a.vy * dt;
    const g = supportAt(a.x, a.z, a.y - a.vy * dt);
    if (a.y <= g) { if (!a.onGround && a.vy < -14 && a === me_) { sfx.land(); } a.y = g; a.vy = 0; a.onGround = true; }
    else if (a.y - g > .15) a.onGround = false;
    else if (a.vy <= 0) { a.y = g; a.vy = 0; a.onGround = true; }
  }
  // skydiving + gliding (everyone): toward an input direction (you) or the drop point (agents)
  function stepAir(a, dt, ix, iz, dive = 0) {
    a.skyT = (a.skyT || 0) + dt;
    const g = supportAt(a.x, a.z, a.y), above = a.y - g;
    if (a.phase === 'sky') {
      a.vy = lerp(a.vy, dive > 0 ? -44 : -30, Math.min(1, dt * 1.5)); const hs = 15;
      a.vx = lerp(a.vx, ix * hs, Math.min(1, dt * 2)); a.vz = lerp(a.vz, iz * hs, Math.min(1, dt * 2));
      if (above < 42 || a.wantGlide && a.skyT > 1 && above < 110) { a.phase = 'glide'; a.wantGlide = false; if (a.glider) a.glider.visible = true; if (a === me_) { sfx.glide(); camDist = 6.5; } else sfxAt('glide', a.x, a.z, 60); }
    } else {
      a.vy = lerp(a.vy, dive > 0 ? -8.5 : dive < 0 ? -4.5 : -6, Math.min(1, dt * 2)); const hs = 12.5;
      a.vx = lerp(a.vx, ix * hs, Math.min(1, dt * 1.6)); a.vz = lerp(a.vz, iz * hs, Math.min(1, dt * 1.6));
    }
    a.x += a.vx * dt; a.z += a.vz * dt; a.y += a.vy * dt;
    const sp = Math.hypot(a.vx, a.vz); if (sp > .5) a.h += angDiff(a.h, Math.atan2(a.vx, a.vz)) * Math.min(1, dt * 4);
    if (a.phase === 'glide') pushOut(a, .5);
    const g2 = supportAt(a.x, a.z, a.y + 1);
    if (a.y <= g2) { a.y = g2; a.vy = 0; a.phase = 'ground'; a.onGround = true; if (a.glider) a.glider.visible = false; if (a.holder) a.holder.rotation.x = 0;
      if (a === me_) { sfx.land(); puff(a.x, a.y + .2, a.z, 6, .5, '#ffffff', 1.6); camDist = 4.4; if (sel < 0) setGunMesh(me_, null); toast(`Landed in <b>${esc(zoneName(a.x, a.z))}</b>`, 1600); } else if (Math.hypot(a.x - camera.position.x, a.z - camera.position.z) < 50) puff(a.x, a.y + .2, a.z, 4, .4); }
  }
  const zoneName = (x, z) => { const p = POIS.find((q) => Math.hypot(x - q.x, z - q.z) < q.r * 1.3); if (p) return p.name; const g = groundAt(x, z); return g < 2 ? 'the Beach' : g > 14 ? 'the Hills' : 'the Meadows'; };
  function stepBots(dt) {
    for (const b of bots) {
      if (!b.alive) continue;
      if (b.phase === 'bus') { if (bus.on && bus.t * bus.speed >= b.jumpAt) leap(b); else { b.x = bus.x; b.y = bus.y; b.z = bus.z; } continue; }
      if (b.phase === 'sky' || b.phase === 'glide') { const dx = b.drop.x - b.x, dz = b.drop.z - b.z, d = Math.hypot(dx, dz) || 1, k = clamp(d / 10, 0, 1); stepAir(b, dt, dx / d * k, dz / d * k, d > 60 ? 0 : 1); continue; }
      stepBot(b, dt);
    }
    // separation so bots don't stack
    for (let i = 0; i < actors.length; i++) { const a = actors[i]; if (!a.alive || a.phase !== 'ground') continue;
      for (let j = i + 1; j < actors.length; j++) { const b = actors[j]; if (!b.alive || b.phase !== 'ground') continue; const dx = b.x - a.x, dz = b.z - a.z; if (dx > .9 || dx < -.9 || dz > .9 || dz < -.9 || Math.abs(a.y - b.y) > 1.5) continue; const d = Math.hypot(dx, dz); if (d < .9 && d > 1e-4) { const k = (.9 - d) / 2; a.x -= dx / d * k; a.z -= dz / d * k; b.x += dx / d * k; b.z += dz / d * k; } } }
  }

  // ---------------------------------------------------------------- your movement
  const keys = new Set(); const joy = { x: 0, y: 0, on: false }; const touchBtn = new Set();
  function updatePlayer(dt) {
    fireCd -= dt; swingCd -= dt; swingT -= dt; buildCd -= dt; me_.aimHold = (me_.aimHold || 0) - dt;
    if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) finishReload(); }
    if (burstLeft > 0) { burstT -= dt; if (burstT <= 0) { const g = curGun(); if (g && g.clip > 0) { shootOnce(g, WPN[g.w]); burstLeft--; burstT = WPN[g.w].gap; } else burstLeft = 0; } }
    if (triggerHeld) tryFire();
    stepChan(dt);
    const up = keys.has('KeyW') || keys.has('ArrowUp'), dn = keys.has('KeyS') || keys.has('ArrowDown'), lf = keys.has('KeyA') || keys.has('ArrowLeft'), rt = keys.has('KeyD') || keys.has('ArrowRight');
    let mf = (up ? 1 : 0) - (dn ? 1 : 0), ms = (rt ? 1 : 0) - (lf ? 1 : 0);
    if (joy.on) { mf = -joy.y; ms = joy.x; }
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    let dx = fx * mf + rx * ms, dz = fz * mf + rz * ms; const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m; }
    if (me_.phase === 'bus') { me_.x = bus.x; me_.y = bus.y; me_.z = bus.z; return; }
    if (me_.phase === 'sky' || me_.phase === 'glide') { stepAir(me_, dt, dx, dz, mf > 0 ? 1 : mf < 0 ? -1 : 0); return; }
    if (!me_.alive || state !== 'play') { me_.vx *= .8; me_.vz *= .8; stepBody(me_, dt); return; }
    const run = (keys.has('ShiftLeft') || keys.has('ShiftRight') || (joy.on && Math.hypot(joy.x, joy.y) > .85)) && !ads && !chan;
    const spd = (run ? 7.2 : 4.6) * (ads ? .6 : 1) * (chan ? .5 : 1), k = Math.min(1, dt * (me_.onGround ? 12 : 3));
    me_.vx = lerp(me_.vx, dx * spd, k); me_.vz = lerp(me_.vz, dz * spd, k);
    stepBody(me_, dt);
    if (me_.aimHold > 0 || locked || ads || buildMode) me_.h += angDiff(me_.h, camYaw) * Math.min(1, dt * 18);
    else if (m > .1) me_.h += angDiff(me_.h, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
  }
  function jump() {
    if (state !== 'play' || !me_.alive) return;
    if (me_.phase === 'bus') { if (bus.on && bus.t > 1.2) leap(me_); return; }
    if (me_.phase === 'sky') { me_.wantGlide = true; return; }
    if (me_.phase === 'ground' && me_.onGround) { me_.vy = 7.6; me_.onGround = false; sfx.jump(); }
  }

  // ---------------------------------------------------------------- input
  const GAME_KEYS = new Set(['Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit0', 'Enter', 'Tab']);
  function onKey(e) {
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); if (e.type !== 'keydown') return; if (bigMap.style.display === 'grid') { bigMap.style.display = 'none'; return; } if (document.pointerLockElement === cv || performance.now() - unlockAt < 150) { document.exitPointerLock?.(); return; } close(); return; }
    if (!GAME_KEYS.has(e.code) && !e.code.startsWith('Key')) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keyup') { keys.delete(e.code); return; }
    if (e.repeat) return;
    keys.add(e.code); audio();
    if (state === 'help') { if (e.code === 'Enter' || e.code === 'Space') startPlay(); return; }
    if (state === 'end') { if (e.code === 'Enter') newMatch(); return; }
    if (e.code === 'KeyM') { toggleMap(); return; }
    if (e.code === 'KeyT') { toggleTop(); return; }
    if (state !== 'play') return;
    if (e.code === 'Space') jump();
    else if (e.code === 'KeyE') interact();
    else if (e.code === 'KeyR') reload();
    else if (e.code === 'KeyF' || e.code === 'Digit0') select(-1);
    else if (e.code.startsWith('Digit')) select(+e.code.slice(5) - 1);
    else if (e.code === 'KeyQ' || e.code === 'KeyB') toggleBuild();
    else if (e.code === 'KeyZ') choosePiece('wall'); else if (e.code === 'KeyX') choosePiece('floor'); else if (e.code === 'KeyC') choosePiece('ramp');
  }
  function toggleMute() { muted = !muted; try { localStorage.setItem('aa.games.mute', muted ? '1' : '0'); } catch {} paintMute(); if (!muted) audio(); }
  function toggleMap(on = bigMap.style.display !== 'grid') { bigMap.style.display = on ? 'grid' : 'none'; if (on) drawBigMap(); }
  let drag = null;
  function onDown(e) {
    audio();
    if (state === 'help') { startPlay(); return; }
    if (e.pointerType === 'touch' && e.clientX < innerWidth * .4) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, btn: e.button, touch: e.pointerType === 'touch' };
    try { if (!locked) cv.setPointerCapture?.(e.pointerId); } catch {}
    if (e.pointerType === 'mouse' && state === 'play' && !locked && cv.requestPointerLock) { try { const r = cv.requestPointerLock(); r?.catch?.(() => {}); } catch {} }
    if (e.pointerType === 'mouse' && e.button === 2) { ads = true; return; }
    if (e.pointerType === 'mouse' && e.button === 0 && state === 'play') { triggerHeld = true; firedThisPress = false; tryFire(); }
  }
  function onMove(e) {
    if (locked || !drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    const s = ads && curGun() && WPN[curGun().w].scope ? .35 : 1;
    camYaw -= dx * (drag.touch ? .008 : .0055) * s; camPitch = clamp(camPitch + dy * .004 * s, -.6, 1.2); dragT = 0;
  }
  function onUp(e) { if (e.button === 2) ads = false; if (drag && drag.id === e.pointerId) { drag = null; triggerHeld = false; } }
  const onWheel = (e) => { e.preventDefault(); if (state !== 'play') return; if (me_.phase !== 'ground') { camDist = clamp(camDist + e.deltaY * .02, 5, 40); return; } const dir = e.deltaY > 0 ? 1 : -1;
    if (buildMode) { const L = ['wall', 'floor', 'ramp']; choosePiece(L[(L.indexOf(piece) + dir + 3) % 3]); return; }
    const now = performance.now(); if (now - (onWheel.t || 0) < 90) return; onWheel.t = now; let i = sel; for (let k = 0; k < 6; k++) { i += dir; if (i > 4) i = -1; if (i < -1) i = 4; if (i === -1 || inv[i]) break; } select(i); };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  const onLock = () => { const was = locked; locked = document.pointerLockElement === cv; if (was && !locked) { unlockAt = performance.now(); triggerHeld = false; ads = false; } wrap.classList.toggle('locked', locked); };
  const onMouse = (e) => { if (!locked) return; const s = ads && curGun() && WPN[curGun().w].scope ? .3 : ads ? .7 : 1; camYaw -= e.movementX * .0026 * s; camPitch = clamp(camPitch + e.movementY * .0021 * s, -.6, 1.2); dragT = 0; };
  const onMouseDown = (e) => { if (!locked) return; if (e.button === 2) ads = true; };
  const onMouseUp = (e) => { if (!locked) return; if (e.button === 0) triggerHeld = false; if (e.button === 2) ads = false; };
  document.addEventListener('pointerlockchange', onLock); document.addEventListener('mousemove', onMouse); document.addEventListener('mousedown', onMouseDown); document.addEventListener('mouseup', onMouseUp);
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const onBlur = () => { keys.clear(); triggerHeld = false; drag = null; ads = false; }; addEventListener('blur', onBlur);
  let paused = false; const onVis = () => { paused = document.hidden; last = 0; if (paused) onBlur(); }; document.addEventListener('visibilitychange', onVis);
  const onResize = () => { const w = wrap.clientWidth || innerWidth, h = wrap.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }; addEventListener('resize', onResize); onResize();
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  topBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleTop(); });
  $('.ry-map').addEventListener('click', (e) => { e.stopPropagation(); toggleMap(true); });
  bigMap.addEventListener('click', () => toggleMap(false));
  hotEl.addEventListener('pointerdown', (e) => { const s = e.target.closest('.ry-sl'); if (!s) return; e.stopPropagation(); e.preventDefault(); select(+s.dataset.i); });
  buildEl.addEventListener('pointerdown', (e) => { const d = e.target.closest('[data-p]'); if (!d) return; e.stopPropagation(); choosePiece(d.dataset.p); });
  let topOpen = false; function toggleTop() { topOpen = !topOpen; topEl.style.display = topOpen ? 'block' : 'none'; if (topOpen) fetchTop().then(paintTop); }
  // touch: joystick + buttons
  const joyEl = $('.ry-joy'), joyKnob = $('.ry-joy i');
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; joyKnob.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); if (state === 'help') startPlay(); joy.on = true; joy.id = e.pointerId; joyEl.setPointerCapture?.(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (joy.on && e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = 0; joyKnob.style.transform = ''; }; joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  wrap.querySelectorAll('.ry-tb').forEach((b) => {
    const k = b.dataset.b;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); audio(); if (state === 'help') { startPlay(); return; } if (state !== 'play') return; touchBtn.add(k);
      if (k === 'fire') { triggerHeld = true; firedThisPress = false; tryFire(); } else if (k === 'jump') jump(); else if (k === 'use') interact(); else if (k === 'reload') reload(); else if (k === 'build') toggleBuild(); else if (k === 'piece') { const L = ['wall', 'floor', 'ramp']; choosePiece(L[(L.indexOf(piece) + 1) % 3]); } });
    const up = () => { touchBtn.delete(k); if (k === 'fire') triggerHeld = false; }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
  function startPlay() { if (state !== 'help') return; if (!ready) { modalCard.querySelector('button').textContent = 'Loading the agents…'; startWhenReady = true; return; } newMatch(); }
  let startWhenReady = false;
  const keysHtml = mobile ? '<span>Stick</span><span>move · steer the glider</span><span>Drag right side</span><span>look around</span><span>JUMP</span><span>leap from the bus · jump · open glider</span><span>FIRE · E</span><span>shoot / swing · open chests, pick up</span><span>BUILD · PIECE</span><span>build mode · wall / floor / ramp</span><span>Tap a slot</span><span>switch item</span>'
    : '<span><kbd>WASD</kbd></span><span>move · steer the glider</span><span><kbd>Mouse</kbd></span><span>aim (click to lock, Esc frees)</span><span><kbd>Click</kbd> <kbd>Right-click</kbd></span><span>shoot · aim down sights</span><span><kbd>Space</kbd></span><span>jump out of the bus · jump · glider</span><span><kbd>Shift</kbd></span><span>sprint</span><span><kbd>E</kbd> <kbd>R</kbd></span><span>open chest / pick up · reload</span><span><kbd>1</kbd>-<kbd>5</kbd> <kbd>Wheel</kbd></span><span>items · <kbd>F</kbd> candy pickaxe (chop wood)</span><span><kbd>Q</kbd></span><span>build mode: <kbd>Z</kbd> wall <kbd>X</kbd> floor <kbd>C</kbd> ramp</span><span><kbd>M</kbd> <kbd>T</kbd></span><span>map · top players</span>';
  modalCard.innerHTML = `<h1>AGENT ROYALE</h1><p>Board the balloon bus with ${N_BOTS} agents, drop onto the island, loot, build and be the last one standing. The pink storm keeps shrinking!</p>
    <div class="keys">${keysHtml}</div><button type="button">Board the bus</button>`;
  modal.style.display = 'grid'; modalCard.querySelector('button').onclick = startPlay;

  // ---------------------------------------------------------------- minimap + big map
  const MAPW = 440, mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = 520;
  { const x = mapBase.getContext('2d'), k = mapBase.width / MAPW, img = x.createImageData(mapBase.width, mapBase.height), c = new THREE.Color();
    for (let j = 0; j < mapBase.height; j++) for (let i = 0; i < mapBase.width; i++) { const wx = i / k - MAPW / 2, wz = j / k - MAPW / 2, h = groundAt(wx, wz), o = (j * mapBase.width + i) * 4;
      if (h < 0) { const dd = clamp(-h / 3.6, 0, 1); c.set('#9fe0f3').lerp(new THREE.Color('#7fc6ea'), dd); } else { groundColor(wx, wz, h, c); const sh = clamp((groundAt(wx + 2, wz + 2) - h) * -.08, -.12, .12); c.offsetHSL(0, 0, sh); }
      img.data[o] = c.r * 255; img.data[o + 1] = c.g * 255; img.data[o + 2] = c.b * 255; img.data[o + 3] = 255; }
    x.putImageData(img, 0, 0);
    x.fillStyle = 'rgba(255,255,255,.85)'; for (const h of houses) x.fillRect((h.x0 + MAPW / 2) * k, (h.z0 + MAPW / 2) * k, (h.x1 - h.x0) * k, (h.z1 - h.z0) * k);
    x.fillStyle = 'rgba(120,180,110,.55)'; for (const t of trees) { x.beginPath(); x.arc((t.x + MAPW / 2) * k, (t.z + MAPW / 2) * k, 1.6, 0, TAU); x.fill(); } }
  function drawCircles(x, W, X, Z, k) {
    // storm outside: purple shade
    x.save(); x.fillStyle = 'rgba(176,107,255,.38)'; x.beginPath(); x.rect(0, 0, W, W); x.arc(X(storm.cur.x), Z(storm.cur.z), Math.max(0, storm.cur.r * k), 0, TAU, true); x.fill('evenodd'); x.restore();
    x.strokeStyle = '#b06bff'; x.lineWidth = Math.max(2, W / 160); x.beginPath(); x.arc(X(storm.cur.x), Z(storm.cur.z), Math.max(0, storm.cur.r * k), 0, TAU); x.stroke();
    if (storm.mode !== 'done') { x.strokeStyle = '#ffffff'; x.setLineDash([W / 60, W / 90]); x.lineWidth = Math.max(2, W / 200); x.beginPath(); x.arc(X(storm.next.x), Z(storm.next.z), Math.max(1, storm.next.r * k), 0, TAU); x.stroke(); x.setLineDash([]); }
  }
  function drawMarker(x, X, Z, s) {
    x.save(); x.translate(X(me_.x), Z(me_.z)); x.rotate(-camYaw + Math.PI); x.fillStyle = '#ff6b81'; x.strokeStyle = '#fff'; x.lineWidth = s * .35; x.beginPath(); x.moveTo(0, -s * 1.3); x.lineTo(s, s); x.lineTo(0, s * .45); x.lineTo(-s, s); x.closePath(); x.stroke(); x.fill(); x.restore();
  }
  function drawBusLine(x, X, Z) { if (!bus.on) return; x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(X(bus.x0), Z(bus.z0)); x.lineTo(X(bus.x0 + bus.dx * 540), Z(bus.z0 + bus.dz * 540)); x.stroke(); x.setLineDash([]); x.fillStyle = '#ffd36e'; x.strokeStyle = '#5b4f7a'; x.lineWidth = 2; x.beginPath(); x.arc(X(bus.x), Z(bus.z), 7, 0, TAU); x.fill(); x.stroke(); }
  function drawMap() {
    const W = mapCv.width, x = mctx, k = W / MAPW, X = (v) => (v + MAPW / 2) * k, Z = (v) => (v + MAPW / 2) * k;
    x.clearRect(0, 0, W, W); x.drawImage(mapBase, 0, 0, W, W); drawCircles(x, W, X, Z, k); drawBusLine(x, X, Z);
    others.forEach((o) => { if (!o.here) return; x.fillStyle = '#8f7cf2'; x.beginPath(); x.arc(X(o.x), Z(o.z), 4, 0, TAU); x.fill(); });
    drawMarker(x, X, Z, 7);
  }
  function drawBigMap() {
    const W = bigCv.width, x = bctx, k = W / MAPW, X = (v) => (v + MAPW / 2) * k, Z = (v) => (v + MAPW / 2) * k;
    x.clearRect(0, 0, W, W); x.drawImage(mapBase, 0, 0, W, W); drawCircles(x, W, X, Z, k); drawBusLine(x, X, Z);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 30px ${FONT}`; x.lineJoin = 'round';
    for (const p of POIS) { x.lineWidth = 8; x.strokeStyle = 'rgba(59,47,92,.75)'; x.strokeText(p.name, X(p.x), Z(p.z) - p.r * k - 6); x.fillStyle = '#ffffff'; x.fillText(p.name, X(p.x), Z(p.z) - p.r * k - 6); }
    others.forEach((o) => { if (!o.here) return; x.fillStyle = '#8f7cf2'; x.beginPath(); x.arc(X(o.x), Z(o.z), 9, 0, TAU); x.fill(); });
    drawMarker(x, X, Z, 16);
  }

  // ---------------------------------------------------------------- visuals per frame
  function syncActor(a, dt) {
    if (!a.holder) return;
    if (a.phase === 'bus') { a.holder.visible = false; return; }
    if (a.phase === 'out') { koAnim(a, dt); return; }
    const far = Math.hypot(a.x - camera.position.x, a.z - camera.position.z) > (a.phase === 'ground' ? 170 : 260);
    a.holder.visible = !far; if (far) return;
    a.holder.position.set(a.x, a.y, a.z); a.holder.rotation.y = a.h;
    const tilt = a.phase === 'sky' ? 1.15 : a.phase === 'glide' ? .25 : 0; a.root.rotation.x = lerp(a.root.rotation.x, tilt, Math.min(1, dt * 5));
    if (a.phase === 'sky') { a.root.rotation.z = Math.sin(T * 3 + a.id) * .15; a.root.position.y = .8; } else { a.root.rotation.z = 0; a.root.position.y = a.phase === 'glide' ? .2 : 0; }
    if (a.glider) { a.glider.visible = a.phase === 'glide'; if (a.glider.visible) a.glider.rotation.z = Math.sin(T * 1.7 + a.id) * .06 + clamp(angDiff(a.h, Math.atan2(a.vx, a.vz)) * .4, -.3, .3); }
    const u = a.u, sp = a.phase === 'ground' ? Math.hypot(a.vx, a.vz) : 0;
    if (u) { u.walk = lerp(u.walk || 0, sp > .2 ? clamp(sp / 3.3, .7, 1.45) : 0, Math.min(1, dt * 8)); if (sp > .2) u.walkPhase = (u.walkPhase || 0) + dt * Math.min(u.strideFor ? sp / u.strideFor(Math.max(.7, u.walk)) : sp * 3.1, 26); try { u.update?.(T, dt); } catch {} }
    if (a.flash > 0) { a.flash -= dt; flashMats(a.root, .8); } else if (a.flash > -1) { a.flash = -2; flashMats(a.root, 0); }
    if (a.gunMesh && a.gunKey === 'pick') { const s = swingT > 0 && a === me_ ? Math.sin((swingT / .3) * Math.PI) : 0; a.gunMesh.rotation.x = .9 - s * 1.8; }
    if (a.gunMesh && a.isBot) { a.gunMesh.visible = a.phase === 'ground'; }
    if (a.tag) { const d = camera.position.distanceTo(a.holder.position); a.tag.visible = d > 3 && d < 45; a.tag.material.opacity = clamp((d - 3) / 3, 0, 1) * clamp((45 - d) / 8, 0, 1); }
  }
  function koAnim(a, dt) {
    a.koT += dt; const r = a.holder; if (!r) return;
    if (a.koT < .8) { const e = Math.min(1, a.koT / .45); r.visible = true; r.rotation.x = -Math.PI / 2 * e; r.rotation.y += a.spin * dt * (1 - e * .6); a.vy -= 20 * dt; a.y += a.vy * dt; const g = supportAt(a.x, a.z, a.y + .5); if (a.y < g) { a.y = g; a.vy = -a.vy * .35; } r.position.set(a.x, a.y + .25 * e, a.z); r.scale.setScalar(1 + Math.sin(a.koT * 30) * .04); flashMats(a.root, Math.floor(a.koT * 16) % 2 ? .9 : 0); if (a.glider) a.glider.visible = false; }
    else if (r.visible) { flashMats(a.root, 0); r.visible = false; r.scale.setScalar(1); if (Math.hypot(a.x - camera.position.x, a.z - camera.position.z) < 150) burst(a.x, a.y + 1, a.z, 22); }
  }
  function flashMats(root, k) {
    root.traverse((o) => { if (!o.isMesh || !o.material || !o.material.emissive) return; const m = o.material; if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.getHex(); m.userData.ei = m.emissiveIntensity; } if (k > 0) { m.emissive.set('#ffffff'); m.emissiveIntensity = k; } else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.ei; } });
  }
  function updateFx(dt) {
    for (const t of tracers) if (t.life > 0) { t.life -= dt; t.m.material.opacity = clamp(t.life / .09, 0, 1); if (t.life <= 0) t.m.visible = false; }
    for (const f of flashes) if (f.life > 0) { f.life -= dt; if (f.life <= 0) f.s.visible = false; }
    for (const b of bursts) if (b.life > 0) { b.life -= dt; b.v.y -= 16 * dt; b.s.position.addScaledVector(b.v, dt); const g = groundAt(b.s.position.x, b.s.position.z) + .2; if (b.s.position.y < g) { b.s.position.y = g; b.v.y *= -.4; b.v.x *= .7; b.v.z *= .7; } b.s.material.opacity = clamp(b.life * 2, 0, 1); b.s.material.rotation += dt * 4; if (b.life <= 0) b.s.visible = false; }
    for (const p of puffs) if (p.life > 0) { p.life -= dt; const k = 1 - p.life / p.max; p.m.position.addScaledVector(p.v, dt); p.m.scale.setScalar(p.s0 * (.4 + k * 1.1)); p.m.material.opacity = (1 - k) * .85; if (p.life <= 0) p.m.visible = false; }
    for (const e of dmgEls) if (e.life > 0) { e.life -= dt; e.p.y += dt * 1.4; tmpV.copy(e.p).project(camera); if (tmpV.z > 1 || e.life <= 0) { e.d.style.display = 'none'; continue; } e.d.style.display = ''; e.d.style.left = `${(tmpV.x * .5 + .5) * wrap.clientWidth}px`; e.d.style.top = `${(-tmpV.y * .5 + .5) * wrap.clientHeight}px`; e.d.style.opacity = clamp(e.life * 3, 0, 1); }
    for (const c of clouds) { c.position.x += dt * 1.6; if (c.position.x > 520) c.position.x = -520; }
    for (const b of bubbles) { b.t += dt; b.m.position.y = b.y0 + Math.sin(b.t * .7) * 1.2; b.m.position.x += Math.sin(b.t * .3) * dt * .4; }
    boat.position.y = Math.sin(T * 1.3) * .15; boat.rotation.z = Math.sin(T * 1.1) * .04;
    water.material.color.setHSL(.54, .78, .64 + Math.sin(T * .6) * .015);
    for (const t of trees) if (t.wob > 0) { t.wob -= dt * 3; placeTree(t, Math.sin(t.wob * 20) * t.wob); if (t.wob <= 0) { t.wob = 0; placeTree(t); } }
    // chests: lid pops open, sparkle twinkles
    const cx = camera.position.x, cz = camera.position.z;
    for (const c of chests) { const near = Math.abs(c.x - cx) < 140 && Math.abs(c.z - cz) < 140; c.g.visible = near; if (!near) continue;
      if (c.open) { if (c.t < 1) { c.t += dt * 3; c.lid.rotation.x = -1.9 * smooth(clamp(c.t, 0, 1)); } continue; }
      c.glow.material.opacity = .45 + Math.sin(T * 4 + c.x) * .2; c.sp.position.set(Math.sin(T * 1.7 + c.z) * .5, .9 + Math.sin(T * 2.3) * .3, Math.cos(T * 1.3) * .3); c.sp.material.rotation = T * 2; c.sp.scale.setScalar(.35 + Math.abs(Math.sin(T * 3 + c.x)) * .45); }
    // floor loot: spin, bob, settle when tossed
    for (const f of floor) {
      if (f.settle) { f.vy -= 20 * dt; f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt; const g = supportAt(f.x, f.z, f.y + .3); if (f.y <= g) { f.y = g; if (f.vy < -2) { f.vy *= -.3; f.vx *= .5; f.vz *= .5; } else { f.vx = f.vz = f.vy = 0; f.settle = false; } } f.g.position.set(f.x, f.y, f.z); }
      const near = Math.abs(f.x - cx) < 110 && Math.abs(f.z - cz) < 110; f.g.visible = near; if (!near) continue;
      if (f.beam) f.beam.visible = Math.hypot(f.x - cx, f.z - cz) > 3.5 && Math.hypot(f.x - me_.x, f.z - me_.z) > 1.2; f.t += dt; f.spin.rotation.y = f.t * 1.4; f.spin.position.y = .55 + Math.sin(f.t * 2.4) * .1;
    }
  }
  // auto-grab ammo you walk over
  function stepAmmoPickup() {
    if (me_.phase !== 'ground' || !me_.alive) return;
    for (let i = floor.length - 1; i >= 0; i--) { const f = floor[i]; if (f.it.k !== 'ammo' || f.settle) continue; if (Math.hypot(f.x - me_.x, f.z - me_.z) < 1.4 && Math.abs(f.y - me_.y) < 1.5) { ammo[f.it.a] = Math.min(999, ammo[f.it.a] + f.it.n); removeFloor(f); sfx.ammo(); invDirty = true; toast(`+${f.it.n} <span style="color:${AMMO[f.it.a].c}">${AMMO[f.it.a].n}</span>`, 900); } }
  }
  function updateCamera(dt) {
    dragT += dt;
    const p = me_, onFoot = p.phase === 'ground' && p.alive;
    let look, dist = camDist, pitch = camPitch;
    if (p.phase === 'bus') { look = tmpV.set(bus.x, bus.y + 4, bus.z); dist = clamp(camDist, 18, 40); if (dragT > 3) camYaw += dt * .08; }
    else if (state === 'dead' || state === 'end' && !p.alive) { const t = killer && killer.alive ? killer : p; look = tmpV.set(t.x, t.y + 1.2, t.z); dist = 9; camYaw += dt * .25; pitch = .5; }
    else { const sh = onFoot ? (ads ? .9 : .75) : 0, rx = -Math.cos(camYaw), rz = Math.sin(camYaw); look = tmpV.set(p.x + rx * sh, p.y + (onFoot ? 1.55 : 1.2), p.z + rz * sh); dist = onFoot ? (ads ? 2.4 : camDist) : p.phase === 'sky' ? Math.max(camDist, 7) : Math.max(camDist, 7.5); if (p.phase === 'glide') pitch = Math.min(camPitch, .12); if (!onFoot && dragT > 1.2 && Math.hypot(p.vx, p.vz) > 2) camYaw += angDiff(camYaw, p.h) * Math.min(1, dt * 1.5); }
    const want = tmpV2.set(look.x - Math.sin(camYaw) * Math.cos(pitch) * dist, look.y + Math.sin(pitch) * dist + (onFoot ? .1 : .5), look.z - Math.cos(camYaw) * Math.cos(pitch) * dist);
    // pull in when something is between camera and you
    if (onFoot || state === 'dead') { const d = tmpV3.copy(want).sub(look), L = d.length(); if (L > .1) { d.divideScalar(L); const r = raySolid(look, d, L); if (r.t < L) { const k = Math.max(.15, (r.t - .35) / L); want.copy(look).addScaledVector(d, L * k); } } }
    const gy = groundAt(want.x, want.z) + .4; if (want.y < gy) want.y = gy; if (want.y < .4) want.y = .4;
    if (camPos.lengthSq() === 0) camPos.copy(want); camPos.lerp(want, Math.min(1, dt * (onFoot ? 22 : 6))); camLook.lerp(look, Math.min(1, dt * (onFoot ? 30 : 8))); if (camLook.lengthSq() === 0) camLook.copy(look);
    camera.position.copy(camPos); shake *= Math.exp(-dt * 7); if (shake > .005) camera.position.add(tmpV3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake));
    camera.lookAt(camLook);
    const g = curGun(), scoped = ads && onFoot && g && WPN[g.w].scope && !buildMode;
    const baseFov = camera.aspect < 1 ? 74 : 62, wantFov = scoped ? 18 : ads && onFoot ? baseFov - 14 : p.phase === 'sky' ? baseFov + 10 : baseFov;
    if (Math.abs(camera.fov - wantFov) > .05) { camera.fov = lerp(camera.fov, wantFov, Math.min(1, dt * (scoped ? 14 : 6))); camera.updateProjectionMatrix(); }
    scopeEl.style.display = scoped && camera.fov < 28 ? 'block' : 'none'; if (me_.root) me_.root.visible = !(scoped && camera.fov < 28);
    const fp = p.phase === 'bus' ? bus : p; sun.position.set(Math.round(fp.x) + 40, fp.y + 70, Math.round(fp.z) + 28); sun.target.position.set(Math.round(fp.x), fp.y, Math.round(fp.z)); sun.target.updateMatrixWorld();
    // the sky turns purple inside the storm
    const inStorm = p.alive && p.phase !== 'bus' && Math.hypot(camera.position.x - storm.cur.x, camera.position.z - storm.cur.z) > storm.cur.r;
    scene.fog.color.lerp(inStorm ? FOG_STORM : FOG, Math.min(1, dt * 2)); scene.fog.near = lerp(scene.fog.near, inStorm ? 20 : 220, Math.min(1, dt * 2)); scene.fog.far = lerp(scene.fog.far, inStorm ? 160 : 720, Math.min(1, dt * 2));
    tintEl.style.opacity = inStorm ? 1 : 0;
  }
  let hudT = 0, lastHot = '';
  function paintHot() {
    const pk = `<div class="ry-sl pk${sel < 0 && !buildMode ? ' on' : ''}" data-i="-1"><img alt="" src="${iconOf({ k: 'pick' })}"><kbd>F</kbd></div>`;
    const sl = inv.map((it, i) => { if (!it) return `<div class="ry-sl${sel === i && !buildMode ? ' on' : ''}" data-i="${i}"><kbd>${i + 1}</kbd></div>`;
      const r = it.k === 'gun' ? it.r : 2, n = it.k === 'gun' ? it.clip : it.n; return `<div class="ry-sl r${r}${sel === i && !buildMode ? ' on' : ''}" data-i="${i}"><img alt="" src="${iconOf(it)}"><kbd>${i + 1}</kbd><b>${n}</b></div>`; }).join('');
    const html = pk + sl; if (html !== lastHot) { hotEl.innerHTML = html; lastHot = html; }
  }
  function updateHud(dt) {
    hudT -= dt; if (hudT > 0) return; hudT = .05;
    hpBar.style.width = `${me_.hp}%`; hpNum.textContent = Math.ceil(me_.hp); shBar.style.width = `${me_.sh}%`; shNum.textContent = Math.ceil(me_.sh); vitEl.classList.toggle('low', me_.hp < 35);
    hurtT -= .05; hurtEl.style.opacity = hurtT > 0 ? Math.min(1, hurtT * 2.5) : me_.hp < 25 && me_.alive && state === 'play' ? .35 + Math.sin(T * 6) * .15 : 0;
    aliveEl.textContent = aliveN(); elimEl.textContent = elims;
    if (invDirty) { invDirty = false; paintHot(); matsEl.textContent = wood; }
    const g = curGun(); ammoBox.style.display = g && !buildMode ? '' : 'none';
    if (g) { const W = WPN[g.w]; ammoNm.innerHTML = `${W.name} <em style="color:${RAR[g.r].d}">${RAR[g.r].n}</em>`; ammoAm.innerHTML = reloadT > 0 ? '<small>reloading…</small>' : `${g.clip} <small>/ ${ammo[W.ammo]}</small>`; }
    // storm box
    let st = ''; if (storm.mode === 'wait') st = `${storm.phase === 0 ? 'Storm forms in' : 'Storm shrinks in'} <b>${fmtT(storm.t)}</b> <small>phase ${storm.phase + 1}/${PHASES.length}</small>`; else if (storm.mode === 'shrink') st = `Storm closing <b>${fmtT(storm.t)}</b> <small>${storm.dmg} dmg/s</small>`; else st = 'Final circle <b>0:00</b>';
    if (st !== stormTxt._v) { stormTxt.innerHTML = st; stormTxt._v = st; } stormEl.classList.toggle('closing', storm.mode === 'shrink');
    // zone name
    { const z = me_.phase === 'bus' ? 'On the balloon bus' : zoneName(me_.x, me_.z); if (z !== zoneEl._v) { zoneEl._v = z; zoneEl.textContent = z; } }
    // the bus banner + altitude
    if (me_.phase === 'bus' && state === 'play') { busEl.style.display = 'flex'; const t = mobile ? 'Tap <kbd>JUMP</kbd> to leap out' : 'Press <kbd>Space</kbd> to jump out'; const html = `<span>${t}</span><div class="bar"><i style="width:${busProg() * 100}%"></i></div>`; busEl.innerHTML = html; } else busEl.style.display = 'none';
    if ((me_.phase === 'sky' || me_.phase === 'glide') && state === 'play') { altEl.style.display = 'block'; altNum.textContent = Math.max(0, Math.round(me_.y - groundAt(me_.x, me_.z))); } else altEl.style.display = 'none';
    // crosshair
    const onFoot = state === 'play' && me_.alive && me_.phase === 'ground';
    crossEl.style.display = onFoot && !(scopeEl.style.display === 'block') ? '' : 'none'; crossEl.classList.toggle('wide', !!(g && WPN[g.w].pellets) && !buildMode);
    // channel bar
    if (chan) { chanEl.style.display = 'flex'; chanTxt.textContent = `${chan.label}…`; chanBar.style.width = `${clamp(chan.t / chan.max, 0, 1) * 100}%`; } else chanEl.style.display = 'none';
    // prompt
    let pr = '';
    if (onFoot) { const n = nearestInteract(); if (n?.c) pr = mobile ? 'Tap <kbd>E</kbd> to open the chest' : '<kbd>E</kbd> open chest'; else if (n?.f) { const it = n.f.it; const nm = it.k === 'gun' ? `<span class="r" style="color:${RAR[it.r].d}">${RAR[it.r].n}</span> ${WPN[it.w].name}` : `${HEALS[it.h].name}${it.n > 1 ? ` ×${it.n}` : ''}`; pr = `${mobile ? 'Tap <kbd>E</kbd>' : '<kbd>E</kbd>'} pick up ${nm}`; }
      else if (sel < 0 && !buildMode && wood < 10 && T < 60) pr = 'Swing at trees to collect wood';
    }
    if (me_.phase === 'sky' && state === 'play') pr = mobile ? 'Tap <kbd>JUMP</kbd> to open the glider early' : '<kbd>W</kbd> dive · <kbd>Space</kbd> open the glider early';
    promptEl.style.display = pr ? 'block' : 'none'; if (pr && promptEl._v !== pr) { promptEl.innerHTML = pr; promptEl._v = pr; }
    touchBuildBtn?.classList.toggle('on', buildMode);
    drawMap(); if (bigMap.style.display === 'grid') drawBigMap();
  }
  const touchBuildBtn = wrap.querySelector('.ry-tb.bld');
  buildEl.querySelectorAll('[data-p]').forEach((d) => d.classList.toggle('on', d.dataset.p === piece));

  // ---------------------------------------------------------------- the end cards
  function showEnd() {
    endShown = true; state = 'end'; postScore(); const won = place === 1; const s = runScore();
    if (s > (best.score || 0) || won) { best = { score: Math.max(s, best.score || 0), wins: (best.wins || 0) + (won ? 1 : 0), elims: Math.max(elims, best.elims || 0) }; try { localStorage.setItem('aa.royale.best', JSON.stringify(best)); } catch {} }
    try { document.exitPointerLock?.(); } catch {}
    modalCard.innerHTML = won ? `<div class="num">#1</div><h1 class="win">AGENT ROYALE CHAMPION</h1><p>Last one standing on the island. The agents bow to you.</p>`
      : `<h1 class="out">ELIMINATED</h1><div class="num">#${place}</div><p>${killer ? `<b>${esc(killer.name)}</b> got you with a ${esc(me_.lastW || 'toy')}.` : 'The storm swept you away.'}</p>`;
    modalCard.innerHTML += `<div class="row"><div><b>#${place}</b><span>placed</span></div><div><b>${elims}</b><span>eliminations</span></div><div><b>${fmtT(matchT)}</b><span>survived</span></div><div><b>${s}</b><span>score</span></div></div>
      <p style="font-size:13px">Best ${best.score || 0} pts · ${best.wins || 0} win${best.wins === 1 ? '' : 's'}</p>
      <div class="ry-topcard"><div class="hd">Top players</div>${topHtml()}</div>
      <button type="button" class="again">Play again</button><button type="button" class="sec quit">Leave</button>`;
    modal.style.display = 'grid'; modalCard.querySelector('.again').onclick = () => newMatch(); modalCard.querySelector('.quit').onclick = () => close();
  }

  // ---------------------------------------------------------------- loop
  let raf = 0, last = 0, closed = false, timeScale = 1;
  function step(dt) {
    T += dt; if (state === 'play' || state === 'dead') matchT += state === 'play' ? dt : 0;
    if (state !== 'help') { stepBus(dt); stepStorm(dt); }
    if (state === 'play' || state === 'dead' || state === 'won' || state === 'end') { updatePlayer(dt); stepBots(dt); stepPieces(dt); stepAmmoPickup(); }
    if ((state === 'dead' || state === 'won') && cardT > 0) { cardT -= dt; if (cardT <= 0) showEnd(); }
    for (const a of actors) syncActor(a, dt);
    updateFx(dt); updateCamera(dt); updateGhost(); updateHud(dt); stepOthers(dt);
    wind(me_.phase === 'sky' || me_.phase === 'glide', me_.phase === 'sky' ? 1 : .4);
    if (startWhenReady && ready && state === 'help') { startWhenReady = false; newMatch(); }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (paused) { last = 0; return; }
    const dt = Math.min(.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
    step(dt * timeScale);
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- multiplayer: real players in the royale room
  const others = new Map(); let live = null, Pmod = null, liveT = 0, myId = null, lastHitBy = null, lastHitAt = 0;
  function otherRoot(o) {
    if (o.root) { scene.remove(o.root); o.root = null; }
    const g = new THREE.Group(); let body = null;
    try { if (Pmod?.buildPerson) body = Pmod.buildPerson(o.look && Object.keys(o.look).length ? o.look : Pmod.DEFAULT_LOOK, { lite: true }); } catch {}
    if (!body) body = makeBlob('#9b7cf0').root;
    g.add(body); o.u = body.userData?.creature;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(o.name || 'player', '#8f7cf2'), transparent: true, depthWrite: false })); track(tag.material); tag.scale.set(2.6, .57, 1); tag.position.y = 2.3; g.add(tag); o.tag = tag; o.body = body;
    scene.add(g); o.root = g;
  }
  (async () => {
    const url = window.AA_LIVE || 'wss://live-production-a047.up.railway.app/live';
    try { [Pmod] = await Promise.all([import('../person3d.js')]); const L = await import('../live.js'); if (closed) return;
      live = L.joinLive(url, { look: me.look || {}, name: (me.name && me.name !== 'You') ? me.name : '',
        onHi: (m) => { myId = m.id; },
        onPvp: (m) => onPvp(m),
        onPeer: (m) => { const o = others.get(m.id) || { id: m.id, here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, v: 0, d: 0 }; const key = JSON.stringify(m.look); o.name = m.name; if (o.key !== key) { o.key = key; o.look = m.look; otherRoot(o); } others.set(m.id, o); },
        onLeave: (id) => { const o = others.get(id); if (o?.root) scene.remove(o.root); others.delete(id); },
        onState: (list) => { const seen = new Set(); for (const [id, x, z, h, v, j = 0, d = 0] of list) { const o = others.get(id); if (!o) continue; seen.add(id); if (!o.here) { o.x = x; o.z = z; o.h = h; } o.here = true; o.tx = x; o.tz = z; o.th = h; o.v = v; o.j = j; o.d = d; } others.forEach((o, id) => { if (!seen.has(id)) o.here = false; }); } });
    } catch (e) { console.warn('royale: multiplayer off', e); }
  })();
  function onPvp(m) {
    if (m.t === 'hit') { if (state !== 'play' || !me_.alive || me_.phase !== 'ground') return; lastHitBy = m.from; lastHitAt = performance.now(); const o = others.get(m.from); dmgActor(me_, m.dmg, o ? { name: m.name || o.name || 'a player', alive: true, kills: 0, x: o.x, z: o.z, isBot: false, peer: true, y: groundAt(o.x, o.z) } : null, 'a toy blaster'); }
    else if (m.t === 'fx') { const a = m.a || []; if (a.length === 4) { const y0 = groundAt(a[0], a[1]) + 1.2, y1 = groundAt(a[2], a[3]) + 1; tracer(new THREE.Vector3(a[0], y0, a[1]), new THREE.Vector3(a[2], y1, a[3]), '#ffb3c7'); } }
    else if (m.t === 'ko') { const o = others.get(m.id); if (o?.root) { puff(o.x, (o.y || 0) + 1.1, o.z, 10, .5, '#ffe7f0', 1.2); burst(o.x, (o.y || 0) + 1, o.z, 14); }
      if (m.by && m.by === myId) { elims++; sfx.elim(); feed(`<b>You</b> ${pick(VERBS)} <b>${esc(m.name || 'a player')}</b> <em>player</em>`, true); big(`ELIMINATED ${String(m.name || 'A PLAYER').toUpperCase()}`, '', 'a real player!'); }
      else if (m.id !== myId) feed(`<b>${esc(m.byName || 'the storm')}</b> ${m.byName ? pick(VERBS) : 'swept up'} <b>${esc(m.name || 'a player')}</b> <em>player</em>`); }
  }
  function stepOthers(dt) {
    // d = 1 while you are on the bus or in the air (others hide you); j = height above the ground (0..3)
    if (live && (liveT -= dt) <= 0) { liveT = .1; const air = me_.phase !== 'ground' || !me_.alive; live.at('royale', me_.x, me_.z, me_.h || 0, Math.hypot(me_.vx || 0, me_.vz || 0), clamp(me_.y - groundAt(me_.x, me_.z), 0, 3), air ? 1 : 0); }
    const k = Math.min(1, dt * 10);
    others.forEach((o) => { if (!o.root) return; o.root.visible = o.here && !o.d; if (!o.root.visible) return;
      if (Math.hypot(o.tx - o.x, o.tz - o.z) > 8) { o.x = o.tx; o.z = o.tz; } else { o.x += (o.tx - o.x) * k; o.z += (o.tz - o.z) * k; }
      let dh = o.th - o.h; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU; o.h += dh * k;
      o.y = groundAt(o.x, o.z) + (o.j || 0); o.root.position.set(o.x, o.y, o.z); o.body.rotation.y = o.h;
      if (o.u) { o.u.walk = o.v > .3 ? Math.min(1.4, o.v / 3) : 0; if (o.v > .3) o.u.walkPhase = (o.u.walkPhase || 0) + dt * o.v * 3; try { o.u.update?.(performance.now() / 1000, dt); } catch {} }
      if (o.tag) { const d = camera.position.distanceTo(o.root.position); o.tag.material.opacity = clamp((d - 3) / 3, 0, 1); o.tag.visible = d > 3; } });
  }

  // ---------------------------------------------------------------- the leaderboard
  const API = '/api/royale';
  let topList = null;
  async function fetchTop() { try { const r = await fetch(`${API}/top`, { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); const a = Array.isArray(j) ? j : Array.isArray(j?.top) ? j.top : null; if (a) topList = a.slice(0, 10); } catch {} return topList; }
  function topHtml() { if (!topList || !topList.length) return '<p style="font-size:13px;color:#9a8fbf">No top players yet.</p>'; return `<ol class="ry-top10">${topList.map((r, i) => `<li><span>${i + 1}</span><b>${esc(String(r.name || 'player').slice(0, 16))}</b><em>${Math.floor(+r.score || 0)}</em></li>`).join('')}</ol>`; }
  let posted = false;
  function postScore() {
    if (posted || !place) return; posted = true; const score = runScore();
    try { fetch(`${API}/score`, { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ name: myName, score, elims, place }) }).then(() => fetchTop().then(paintTop)).catch(() => {}); } catch {}
  }
  function paintTop() { topEl.innerHTML = `<div class="hd">Top players <small>T</small></div>${topHtml()}`; const s = modalCard.querySelector('.ry-topcard'); if (s) s.innerHTML = `<div class="hd">Top players</div>${topHtml()}`; }
  fetchTop().then(paintTop);
  loadModels().catch((e) => { console.warn('royale: models', e); ready = true; if (tst) tst.ready = true; });
  raf = requestAnimationFrame(loop);

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    try { live?.close(); } catch {}
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur); removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis); document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('mousemove', onMouse); document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('mouseup', onMouseUp); try { if (document.pointerLockElement === cv) document.exitPointerLock(); } catch {}
    try { if (place) postScore(); } catch {}
    try { windNode?.s.stop(); } catch {} try { ac?.close(); } catch {}
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); }); });
    disposables.forEach((d) => d.dispose?.()); envTex.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    wrap.remove();
    try { onClose({ score: runScore(), elims, place, best }); } catch {}
  }
  if (tst) {
    tst.peek = () => ({ state, phase: me_.phase, alive: aliveN(), hp: Math.round(me_.hp), sh: Math.round(me_.sh), x: +me_.x.toFixed(1), y: +me_.y.toFixed(1), z: +me_.z.toFixed(1), wood, elims, place, sel, inv: inv.map((q) => q && (q.k === 'gun' ? `${q.w}:${q.r}:${q.clip}` : `${q.h}x${q.n}`)), ammo: { ...ammo }, build: buildMode, piece, pieces: pieces.length, storm: { phase: storm.phase, mode: storm.mode, t: +storm.t.toFixed(1), r: Math.round(storm.cur.r) }, bus: bus.on ? +busProg().toFixed(2) : null, chests: chests.filter((c) => !c.open).length, floor: floor.length, ready, bots: bots.map((b) => ({ n: b.name, p: b.phase, m: b.mode, a: b.alive, g: b.gun ? b.gun.w : null, x: Math.round(b.x), z: Math.round(b.z), hp: Math.round(b.hp) })) });
    tst.start = startPlay; tst.newMatch = newMatch; tst.jump = jump; tst.keys = keys;
    tst.tp = (x, z, y) => { me_.x = x; me_.z = z; me_.y = y ?? supportAt(x, z, 200); me_.vx = me_.vy = me_.vz = 0; };
    tst.land = (x, z, y) => { if (me_.phase === 'bus') leap(me_); me_.phase = 'ground'; me_.onGround = true; if (me_.glider) me_.glider.visible = false; me_.root.rotation.x = 0; tst.tp(x, z, y); camDist = 4.4; };
    tst.cam = (yaw, pitch, dist) => { camYaw = yaw; if (pitch != null) camPitch = pitch; if (dist != null) camDist = dist; dragT = 0; };
    tst.give = (w = 'rifle', r = 3) => { const i = inv.indexOf(null); inv[i < 0 ? 0 : i] = WPN[w] ? { k: 'gun', w, r, clip: WPN[w].mag } : { k: 'heal', h: w, n: 2 }; if (WPN[w]) ammo[WPN[w].ammo] += 60; invDirty = true; select(i < 0 ? 0 : i); };
    tst.wood = (n) => { wood = n; invDirty = true; };
    tst.chestNear = () => { let b = null, bd = 1e9; for (const c of chests) { if (c.open) continue; const d = Math.hypot(c.x - me_.x, c.z - me_.z); if (d < bd) { bd = d; b = c; } } return b ? { x: b.x, z: b.z, y: b.y, h: b.g.rotation.y } : null; };
    tst.interact = interact; tst.fire = () => { firedThisPress = false; tryFire(); }; tst.select = select; tst.build = (p) => { choosePiece(p); build(); }; tst.toggleBuild = toggleBuild;
    tst.botNear = (d = 8, gun = 'smg', side = 0) => { const b = bots.find((q) => q.alive && q.phase !== 'out'); if (!b) return null; b.phase = 'ground'; if (b.holder) { b.holder.visible = true; b.glider.visible = false; b.root.rotation.x = 0; } camera.getWorldDirection(aimDir); const hz = Math.hypot(aimDir.x, aimDir.z) || 1, k = Math.hypot(me_.x - camera.position.x, me_.z - camera.position.z) + d, a = Math.atan2(aimDir.x, aimDir.z) + side; b.x = camera.position.x + Math.sin(a) * k; b.z = camera.position.z + Math.cos(a) * k; b.y = supportAt(b.x, b.z, me_.y + 3); b.gun = gun ? { k: 'gun', w: gun, r: 2 } : null; setGunMesh(b, b.gun); b.target = me_; b.mode = 'fight'; b.react = .5; return b.name; };
    tst.landAll = () => { for (const b of bots) if (b.alive && b.phase !== 'ground') { const a = rnd(0, TAU), r = rnd(20, 120); b.phase = 'ground'; b.x = Math.cos(a) * r; b.z = Math.sin(a) * r; b.y = supportAt(b.x, b.z, 200); if (b.holder) { b.holder.visible = true; b.glider.visible = false; b.root.rotation.x = 0; } } bus.on = false; bus.g.visible = false; };
    tst.killBots = (leave = 0) => { const live2 = bots.filter((b) => b.alive); live2.slice(leave).forEach((b) => dmgActor(b, 999, me_, 'Burst Rifle')); };
    tst.heal = () => { me_.hp = 100; me_.sh = 100; }; tst.hurt = (n) => dmgActor(me_, n, bots.find((b) => b.alive) || null, 'Foam Shotgun');
    tst.storm = (phase, mode = 'wait', t = 10) => { storm.phase = phase; storm.mode = mode; storm.t = t; if (mode === 'shrink') { storm.from = { ...storm.cur }; } pickNext(); };
    tst.stormAt = (x, z, r) => { storm.cur = { x, z, r }; };
    tst.timeScale = (k) => { timeScale = k; };
    tst.map = toggleMap; tst.pieces = () => pieces.map((p) => `${p.type}@${p.i},${p.j} d${p.dir} y${p.y0.toFixed(2)}`); tst.aim = () => { const p = aimPoint(); return { x: p.x, y: p.y, z: p.z }; }; tst.ads = (on) => { ads = on; };
    tst.fps = () => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); });
  }
  return { close };
}
