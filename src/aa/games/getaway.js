// Auda City (id: getaway): a free-roam toy city in its own three.js scene. Walk, run, jump, hop into any car and
// drive it, cause cartoon trouble with chunky toy blasters, and outrun the police, who are the real agents in little
// police caps (on foot and in blue-white toy cruisers with flashing light bars). Wanted level 0-5 stars, cops shoot
// cartoon tracers back at 2+ stars, a health bar, and everyone who is "taken out" flops, flashes and pops into stars
// and coins with a poof, then respawns (cops at the station, civilians on the sidewalk, you at the clinic).
// No blood, no gore, no real brands. Best run in localStorage aa.getaway.best.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2, FONT = 'Fredoka, system-ui, sans-serif';
// the road grid: centre lines at these x and z, 10 m of asphalt each, sidewalks out to 8 m, the city edge at 177 m,
// the beach and the sea to the east (sand out to SHORE, then the pier)
const R = [-160, -120, -80, -40, 0, 40, 80, 120, 160], NR = R.length, RH = 5, LANE = 2.5, EDGE = 165, WALL = 177, SHORE = 196;
const PIER = { x0: SHORE - 2.5, x1: 213, z: 4.5 };
// districts by block (i = x index, j = z index, 0..7)
const DIST = (i, j) => (i === 7 ? 'beach' : j <= 1 ? 'homes' : j >= 6 ? 'docks' : i <= 1 ? 'park' : i <= 5 ? 'downtown' : 'mid');
const DIST_NAME = { beach: 'the Beachfront', homes: 'Sunny Homes', docks: 'the Docks', park: 'Puddle Park', downtown: 'Downtown', mid: 'Midtown' };
const districtAt = (x, z) => (x > EDGE ? 'beach' : DIST(clampI(Math.floor((x + 160) / 40)), clampI(Math.floor((z + 160) / 40))));
const clampI = (v) => (v < 0 ? 0 : v > 7 ? 7 : v);
// stunt ramps on road centre lines (the traffic lanes run beside them): [axis, road, start, dir]
const RAMPS = [['x', 0, 52, 1], ['z', -120, -28, 1], ['x', 120, -68, -1], ['z', 80, 92, 1], ['x', -80, 132, 1], ['z', 160, -108, -1], ['z', -40, -148, 1], ['x', 40, -28, -1], ['x', -120, -92, 1], ['z', 120, 12, 1]]
  .map(([ax, road, s, dir]) => ({ x0: ax === 'x' ? s : road, z0: ax === 'x' ? road : s, dx: ax === 'x' ? dir : 0, dz: ax === 'z' ? dir : 0, L: 8, H: 1.9, W: 3 }));
const rampAt = (x, z) => { for (const r of RAMPS) { const ox = x - r.x0, oz = z - r.z0, u = ox * r.dx + oz * r.dz; if (u < 0 || u > r.L) continue; if (Math.abs(ox * -r.dz + oz * r.dx) <= r.W / 2) return { r, u, h: r.H * u / r.L }; } return null; };
const STATION = { x: -20, z: 20, door: { x: -6.6, z: 20 } }, CLINIC = { x: 20, z: -20, door: { x: 6.6, z: -20 } }, BANK = { x: 20, z: 20 }, GAS = { x: -20, z: -20 };
const HEAT = [1, 4, 9, 16, 26], FOOT_N = [0, 2, 3, 4, 5, 6], CAR_N = [0, 1, 1, 2, 3, 3];
const PASTEL = ['#ffb3c7', '#ffd88a', '#a9e3ae', '#a8cdff', '#cfb6ff', '#ffc49a', '#9fe3da', '#ffe58a', '#f5a9d4', '#b3dbff'];
const CAR_COLS = ['#ff9ec0', '#8cc8ff', '#ffd36e', '#7fd6c2', '#c9a6ff', '#ffb38a', '#b8e07a', '#ff8f8f', '#9fe3f0'];
const SKIN = ['#ffd2b3', '#f6b896', '#e2a074', '#c6875a', '#9c6644', '#ffe0c8'];
const FALLBACK = [{ name: 'DUVAL', color: '#8cc8ff' }, { name: 'CUPSEY', color: '#ff8fb8' }, { name: 'BWAM', color: '#b8e07a' }, { name: 'ANSEM', color: '#ffd166' }];
const WEAPONS = [
  { id: 'pistol', name: 'Pop Pistol', dmg: 34, rate: .26, mag: 12, reload: 1.1, spread: .02, auto: false, col: '#ff9f43', col2: '#3fc7b0' },
  { id: 'smg', name: 'Fizz SMG', dmg: 15, rate: .09, mag: 30, reload: 1.5, spread: .06, auto: true, col: '#8ad65a', col2: '#b48cff' },
];
const SAY = { hit: ['ow!', 'hey!', 'rude!', 'oof'], cop: ['stop right there!', 'freeze!', 'pull over!', 'halt!', 'you\'re nicked!', 'in the name of the toy law!', 'hands where i can see em!', 'nice try, buddy', 'backup! backup!'], civ: ['eek!', 'help!', 'run!!', 'not my day', 'aaah!', 'my ice cream!!', 'mommy!', 'nope nope nope'],
  scream: ['eek!', 'aaah!', 'run!!', 'yikes!', 'take cover!', 'not again!', 'waaah!'],
  chat: ['nice weather!', 'did you see that?', 'lol', 'totally', 'no way!', '$AUDACITY to the moon', 'i love this city', 'brb, ice cream', 'same', 'wild day huh', 'my cat can drive', 'so true'],
  jog: ['huff huff', 'on my 5th lap', 'feel the burn!', 'cardio!'], dance: ['woo!', 'this song slaps', 'party at the beach!', 'dance dance!', 'ayyy'],
  bus: ['bus is late again', 'any minute now...', 'i could walk tbh'], sit: ['ahh, relaxing', 'nice view', 'feeding the ducks'],
  vendor: ['ice cream!', 'get your snacks!', 'fresh lemonade!', 'two scoops, one price!'], honk: ['hey!', 'beep beep yourself!', 'watch it!', 'eep!', 'rude!!'],
  me: ['hi!', 'what a day', 'catch me if you can', 'vroom vroom', 'nice city', 'boop', 'who wants $AUDACITY?', 'i am speed'], wave: ['hi!', 'hello!', 'hey there!', 'wave!', 'yo!'] };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const hexOk = (h) => typeof h === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.trim());
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const isRoad = (x, z) => Math.abs(x) < EDGE && Math.abs(z) < EDGE && (R.some((r) => Math.abs(x - r) < RH) || R.some((r) => Math.abs(z - r) < RH));
const groundAt = (x, z) => { const g = isRoad(x, z) ? 0 : .14, ra = rampAt(x, z); return ra && ra.h > g ? ra.h : g; };

export function open({ me = {}, agents = [], onClose = () => {}, _test = null } = {}) {
  if (!me || typeof me !== 'object') me = {};
  const tst = _test && typeof _test === 'object' ? _test : null;
  const myName = String(me.name || 'You').slice(0, 16);
  const pool = (Array.isArray(agents) ? agents : []).filter((a) => a && typeof a === 'object' && a.name).slice(0, 6);
  for (const f of FALLBACK) if (pool.length < 3 && !pool.some((p) => p.name === f.name)) pool.push({ ...f });
  const crew = pool.map((a, i) => ({ name: String(a.name).toUpperCase().slice(0, 12), color: hexOk(a.color) ? a.color.trim() : CAR_COLS[i % CAR_COLS.length], img: a.img || null, genes: a.genes || null }));
  const mobile = (matchMedia?.('(pointer: coarse)').matches) || innerWidth < 720;

  // ---------------------------------------------------------------- DOM + HUD
  if (!document.querySelector('link[href*="family=Fredoka"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap'; document.head.appendChild(l); }
  const wrap = document.createElement('div');
  wrap.className = 'gw';
  const star = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
  wrap.innerHTML = `<style>
.gw{position:fixed;inset:0;z-index:2147483000;background:#cfeaff;font-family:${FONT};color:#3b2f5c;user-select:none;-webkit-user-select:none;overflow:hidden;-webkit-tap-highlight-color:transparent}
.gw canvas.gw-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
.gw .card{background:rgba(255,255,255,.93);border-radius:18px;box-shadow:0 6px 22px rgba(90,70,150,.18),0 0 0 1.5px rgba(255,255,255,.9) inset}
.gw-top{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center}
.gw-ca{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 5px;font-weight:700;font-size:14px}.gw-ca img{width:28px;height:28px;border-radius:50%}.gw-ca b{color:#e0469a}.gw-ca button{border:0;background:#f3eefc;color:#3b2f5c;border-radius:999px;padding:4px 10px;font:600 13px ${FONT};cursor:pointer}.gw-ca a{color:#3d7fb0;text-decoration:none;font-size:13px}
@media (max-width:700px){.gw-ca a,.gw-ca b{display:none}}
.gw-title{padding:8px 16px;font-weight:700;font-size:17px;letter-spacing:.3px;display:flex;align-items:center;gap:8px}
.gw-title i{width:10px;height:10px;border-radius:50%;background:#ff6b81;box-shadow:0 0 0 3px #ffd6de}
.gw-btn{width:40px;height:40px;border:0;border-radius:50%;cursor:pointer;font:700 18px/1 ${FONT};color:#3b2f5c;display:grid;place-items:center}
.gw-btn:hover{transform:scale(1.06)}
.gw-x{position:absolute;top:12px;right:12px}.gw-mute{position:absolute;top:12px;right:60px}
.gw-map{position:absolute;top:12px;left:12px;padding:6px;line-height:0}
.gw-map canvas{width:164px;height:164px;border-radius:14px}
.gw-right{position:absolute;top:62px;right:12px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:300px}
.gw-stars{padding:7px 10px;display:flex;gap:3px}
.gw-stars svg{width:26px;height:26px;fill:#fff;stroke:#c9bfe6;stroke-width:1.6;stroke-linejoin:round;transition:transform .2s}
.gw-stars svg.on{fill:#ffc94a;stroke:#d08a00;filter:drop-shadow(0 2px 3px rgba(208,138,0,.35))}
.gw-stars.blink svg.on{animation:gwb .5s steps(2) infinite}
.gw-stars svg.pop{animation:gwpop .45s ease}
@keyframes gwb{50%{fill:#fff3cf;stroke:#e5c47a}}@keyframes gwpop{40%{transform:scale(1.5) rotate(18deg)}}
.gw-stats{padding:7px 12px;font-size:13px;font-weight:600;display:flex;gap:10px}
.gw-stats b{color:#ff6b81}
.gw-feed{display:flex;flex-direction:column;gap:5px;align-items:flex-end}
.gw-feed div{background:rgba(255,255,255,.93);border-radius:12px;padding:5px 10px;font-size:13px;font-weight:600;box-shadow:0 4px 14px rgba(90,70,150,.15);animation:gwin .25s ease}
.gw-feed div b{color:#ff6b81}.gw-feed div em{font-style:normal;color:#5b7cf0}
@keyframes gwin{from{transform:translateX(20px);opacity:0}}
.gw-hp{position:absolute;left:12px;bottom:14px;padding:9px 12px;display:flex;align-items:center;gap:9px;font-weight:700}
.gw-hp .heart{width:22px;height:22px;fill:#ff6b81}
.gw-hp .bar{width:150px;height:14px;border-radius:9px;background:#f1ecf8;overflow:hidden;box-shadow:0 0 0 1.5px #e6def5 inset}
.gw-hp .bar i{display:block;height:100%;width:100%;border-radius:9px;background:linear-gradient(#8ff0b4,#3fcf86);transition:width .15s}
.gw-hp.low .bar i{background:linear-gradient(#ffb0bd,#ff6b81)}
.gw-wpn{position:absolute;right:12px;bottom:14px;padding:9px 14px;display:flex;align-items:center;gap:12px}
.gw-wpn canvas{width:84px;height:44px}
.gw-wpn .nm{font-weight:700;font-size:14px}.gw-wpn .am{font-weight:700;font-size:22px;line-height:1}.gw-wpn .am small{font-size:13px;color:#9a8fbf}
.gw-wpn .ks{font-size:11px;color:#9a8fbf;font-weight:600}
.gw-cross{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;left:50%;top:50%}
.gw-cross:before,.gw-cross:after{content:"";position:absolute;left:50%;top:50%;background:#fff;box-shadow:0 0 0 1.5px rgba(59,47,92,.55);border-radius:2px}
.gw-cross:before{width:14px;height:3px;margin:-1.5px 0 0 -7px}.gw-cross:after{width:3px;height:14px;margin:-7px 0 0 -1.5px}
.gw-cross.hm:before,.gw-cross.hm:after{background:#ff6b81;transform:rotate(45deg) scale(1.5)}
.gw-prompt{position:absolute;left:50%;bottom:86px;transform:translateX(-50%);padding:8px 16px;font-weight:600;font-size:15px;display:none;white-space:nowrap}
.gw-prompt kbd{display:inline-block;min-width:22px;padding:2px 6px;border-radius:7px;background:#3b2f5c;color:#fff;font:700 13px ${FONT};margin:0 3px}
.gw-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:12px;font-weight:600;color:#6f6496;background:rgba(255,255,255,.75);padding:5px 12px;border-radius:12px;white-space:nowrap}
.gw-toast{position:absolute;left:50%;top:70px;transform:translateX(-50%);padding:8px 18px;font-weight:700;font-size:17px;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}
.gw-toast.on{opacity:1;transform:translateX(-50%) translateY(6px)}
.gw-hurt{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px 30px rgba(255,107,129,.55);opacity:0;transition:opacity .35s}
.gw-bust{position:absolute;left:50%;top:58%;width:220px;margin-left:-110px;height:12px;border-radius:8px;background:rgba(255,255,255,.9);overflow:hidden;display:none;box-shadow:0 4px 14px rgba(90,70,150,.2)}
.gw-bust i{display:block;height:100%;background:linear-gradient(90deg,#6b8cff,#ff6b81);width:0}
.gw-modal{position:absolute;inset:0;display:none;place-items:center;background:rgba(207,234,255,.45);backdrop-filter:blur(3px)}
.gw-modal .card{padding:24px 28px;text-align:center;max-width:min(430px,calc(100vw - 32px));animation:gwcard .4s cubic-bezier(.2,1.6,.4,1)}
@keyframes gwcard{from{transform:scale(.6) rotate(-6deg);opacity:0}}
.gw-modal h1{margin:0 0 6px;font-size:52px;line-height:1;letter-spacing:2px;color:#ff6b81;text-shadow:0 4px 0 #ffd6de}
.gw-modal h1.blue{color:#5b7cf0;text-shadow:0 4px 0 #d6e0ff}
.gw-modal p{margin:6px 0;font-size:15px;font-weight:500;color:#5d5288}
.gw-modal .row{display:flex;justify-content:center;gap:10px;margin:14px 0 6px;flex-wrap:wrap}
.gw-modal .row div{background:#f6f2ff;border-radius:14px;padding:8px 12px;min-width:80px}
.gw-modal .row b{display:block;font-size:22px;color:#3b2f5c}.gw-modal .row span{font-size:12px;color:#8a7fb4;font-weight:600}
.gw-modal button{margin-top:12px;border:0;border-radius:16px;padding:11px 24px;font:700 17px ${FONT};color:#fff;background:linear-gradient(#ff8fa0,#ff6b81);box-shadow:0 5px 0 #d94f66;cursor:pointer}
.gw-modal button:active{transform:translateY(3px);box-shadow:0 2px 0 #d94f66}
.gw-modal .keys{display:grid;grid-template-columns:auto auto;gap:5px 14px;text-align:left;margin:12px auto 0;font-size:14px;font-weight:500;width:max-content}
.gw-modal .keys kbd{display:inline-block;padding:1px 7px;border-radius:7px;background:#3b2f5c;color:#fff;font:700 12px ${FONT};margin-right:3px}
.gw-touch{position:absolute;inset:0;pointer-events:none;display:none}
.gw.touch .gw-touch{display:block}.gw.touch .gw-hint{display:none}
.gw-joy{position:absolute;left:22px;bottom:70px;width:132px;height:132px;border-radius:50%;background:rgba(255,255,255,.45);box-shadow:0 0 0 2px rgba(255,255,255,.8) inset;pointer-events:auto;touch-action:none}
.gw-joy i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 4px 12px rgba(90,70,150,.25)}
.gw-tb{position:absolute;width:62px;height:62px;border-radius:50%;border:0;pointer-events:auto;touch-action:none;font:700 13px ${FONT};color:#3b2f5c;background:rgba(255,255,255,.9);box-shadow:0 5px 14px rgba(90,70,150,.25)}
.gw-tb.fire{width:84px;height:84px;background:linear-gradient(#ff9fae,#ff6b81);color:#fff;font-size:15px}
.gw.touch .gw-hp{bottom:auto;top:184px;left:12px;padding:6px 10px}.gw.touch .gw-hp .bar{width:100px}
.gw.touch .gw-wpn{bottom:auto;top:auto;right:12px;bottom:auto;top:184px;padding:6px 10px}.gw.touch .gw-wpn canvas{display:none}
.gw.touch .gw-map canvas{width:120px;height:120px}
.gw.touch .gw-right{top:58px}
.gw.touch .gw-stars svg{width:20px;height:20px}
.gw.touch .gw-title{display:none}
.gw.touch .gw-prompt{bottom:auto;top:250px}
.gw-area{position:absolute;top:186px;left:12px;padding:4px 12px;font-size:13px;font-weight:700;color:#6f6496}
.gw.touch .gw-area{top:150px;font-size:11px}
.gw-nitro{position:absolute;left:12px;bottom:66px;padding:6px 12px;display:none;align-items:center;gap:8px;font-weight:700;font-size:12px;color:#5b7cf0}
.gw-nitro .bar{width:120px;height:10px;border-radius:7px;background:#eef0fb;overflow:hidden;box-shadow:0 0 0 1.5px #dfe4fb inset}
.gw-nitro .bar i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,#7fd6ff,#5b7cf0,#c9a6ff);width:100%}
.gw-nitro.on .bar i{background:linear-gradient(90deg,#ffd36e,#ff8f6b,#ff6b81)}
.gw.touch .gw-nitro{bottom:auto;top:218px}
.gw-race{position:absolute;top:118px;left:50%;transform:translateX(-50%);padding:6px 16px;font-weight:700;font-size:15px;display:none;gap:14px;align-items:center;white-space:nowrap}
.gw-race b{font-size:22px;color:#ff6b81;font-variant-numeric:tabular-nums}.gw-race span{color:#8a7fb4;font-size:13px}
.gw-stunt{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font:700 46px ${FONT};color:#ffcf4a;text-shadow:0 4px 0 #d08a00,0 8px 18px rgba(90,70,150,.35);pointer-events:none;opacity:0;white-space:nowrap;text-align:center;letter-spacing:1px}
.gw-stunt small{display:block;font-size:18px;color:#fff;text-shadow:0 2px 0 #b48cff}
.gw-stunt.on{animation:gwst 1.6s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes gwst{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(-8deg)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.1) rotate(3deg)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
.gw.touch .gw-stunt{font-size:32px}
.gw-topbox{position:absolute;top:224px;left:12px;padding:10px 14px;display:none;min-width:190px}
.gw.touch .gw-topbox{top:250px}
.gw .hd{font-weight:700;font-size:14px;margin-bottom:6px}.gw .hd small{font-size:11px;color:#9a8fbf;margin-left:6px}
.gw-top10{list-style:none;margin:0;padding:0;font-size:13px;text-align:left}
.gw-top10 li{display:flex;gap:8px;padding:3px 6px;border-radius:8px}.gw-top10 li:nth-child(odd){background:#f6f2ff}
.gw-top10 span{width:18px;color:#9a8fbf;font-weight:700}.gw-top10 b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gw-top10 em{font-style:normal;font-weight:700;color:#ff6b81}
.gw-topcard{margin:10px auto 0;max-width:280px}
.gw-topbtn{position:absolute;top:12px;right:108px;font-size:12px}
.gw.locked canvas.gw-cv{cursor:none}
</style>
<canvas class="gw-cv"></canvas>
<div class="gw-hurt"></div>
<div class="gw-top"><div class="gw-title card"><i></i>Auda City</div><div class="gw-ca card"><img alt="" src="${new URL('./art/world/heat-icon.png', import.meta.url).href}"><b>$AUDACITY</b><button type="button" class="gw-cacopy" title="Copy the contract address">J8ve…Bskpump</button><a href="https://pump.fun/coin/J8vePKao82HCFJLY4LZNkehiPKhqifjmBhL64Bskpump" target="_blank" rel="noopener">pump.fun</a></div></div>
<button class="gw-btn gw-mute card" aria-label="Toggle sound"></button>
<button class="gw-btn gw-x card" aria-label="Close Auda City">✕</button>
<div class="gw-map card"><canvas width="328" height="328"></canvas></div>
<div class="gw-right"><div class="gw-stars card">${star.repeat(5)}</div><div class="gw-stats card"></div><div class="gw-feed"></div></div>
<div class="gw-hp card"><svg class="heart" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.2 0 3.6 1.3 5.4 3.2 1.8-1.9 3.2-3.2 5.4-3.2 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z"/></svg><div class="bar"><i></i></div><span class="hpn">100</span></div>
<div class="gw-wpn card"><canvas width="168" height="88"></canvas><div><div class="nm"></div><div class="am"></div><div class="ks">1 · 2 swap · R reload</div></div></div>
<div class="gw-cross"></div>
<div class="gw-bust"><i></i></div>
<div class="gw-prompt card"></div>
<div class="gw-toast card"></div>
<div class="gw-area card"></div>
<div class="gw-topbox card"></div>
<button class="gw-btn gw-topbtn card" aria-label="Top players">TOP</button>
<div class="gw-nitro card"><span>NITRO</span><div class="bar"><i></i></div></div>
<div class="gw-race card"></div>
<div class="gw-stunt"></div>
<div class="gw-hint">WASD move · Shift run / nitro · Space jump / handbrake · E car · H honk · Q radio · X wave · Click/G shoot · F punch · 1/2 weapon · R reload · Esc quit</div>
<div class="gw-touch"><div class="gw-joy"><i></i></div>
<button class="gw-tb fire" data-b="fire" style="right:22px;bottom:96px">FIRE</button>
<button class="gw-tb" data-b="punch" style="right:118px;bottom:70px">PUNCH</button>
<button class="gw-tb" data-b="jump" style="right:112px;bottom:146px">JUMP</button>
<button class="gw-tb" data-b="car" style="right:30px;bottom:196px">CAR</button>
<button class="gw-tb" data-b="swap" style="right:104px;bottom:222px;width:52px;height:52px;font-size:11px">SWAP</button>
<button class="gw-tb" data-b="reload" style="right:44px;bottom:274px;width:52px;height:52px;font-size:11px">RELOAD</button>
<button class="gw-tb" data-b="nitro" style="left:24px;bottom:214px;width:58px;height:58px;font-size:11px;background:linear-gradient(#9fd8ff,#5b7cf0);color:#fff">NITRO</button>
<button class="gw-tb" data-b="honk" style="left:92px;bottom:214px;width:52px;height:52px;font-size:11px">HONK</button></div>
<div class="gw-modal"><div class="card"></div></div>`;
  document.body.appendChild(wrap);
  if (mobile) wrap.classList.add('touch');
  const $ = (s) => wrap.querySelector(s);
  const cv = $('.gw-cv'), mapCv = $('.gw-map canvas'), mctx = mapCv.getContext('2d'), starEls = [...wrap.querySelectorAll('.gw-stars svg')], starBox = $('.gw-stars');
  const statsEl = $('.gw-stats'), feedEl = $('.gw-feed'), hpEl = $('.gw-hp'), hpBar = $('.gw-hp .bar i'), hpNum = $('.gw-hp .hpn'), wpnName = $('.gw-wpn .nm'), wpnAmmo = $('.gw-wpn .am'), wpnCv = $('.gw-wpn canvas');
  const crossEl = $('.gw-cross'), promptEl = $('.gw-prompt'), toastEl = $('.gw-toast'), hurtEl = $('.gw-hurt'), bustEl = $('.gw-bust'), bustBar = $('.gw-bust i'), modal = $('.gw-modal'), modalCard = $('.gw-modal .card'), muteBtn = $('.gw-mute'), closeBtn = $('.gw-x');
  const topEl = $('.gw-topbox'), topBtn = $('.gw-topbtn'), areaEl = $('.gw-area'), nitroEl = $('.gw-nitro'), nitroBar = $('.gw-nitro .bar i'), raceEl = $('.gw-race'), stuntEl = $('.gw-stunt');

  // ---------------------------------------------------------------- renderer + scene
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe8fb', 150, 430);
  const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.environment = envTex; scene.environmentIntensity = .28;
  const camera = new THREE.PerspectiveCamera(60, 1, .1, 900);
  const hemi = new THREE.HemisphereLight('#a9d6ff', '#b08f6a', .5); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe9c9', 1.85); sun.castShadow = true;
  const SH = mobile ? 34 : 46; Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 220 });
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const disposables = new Set(), track = (o) => { disposables.add(o); return o; };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return track(t); };
  const matCache = new Map(), std = (color, o = {}) => { const k = color + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, track(new THREE.MeshStandardMaterial({ color, roughness: .7, ...o }))); return matCache.get(k); };
  const gloss = (color) => { const k = 'g' + color; if (!matCache.has(k)) matCache.set(k, track(new THREE.MeshPhysicalMaterial({ color, roughness: .3, metalness: .05, clearcoat: 1, clearcoatRoughness: .12 }))); return matCache.get(k); };
  const basic = (color, o = {}) => track(new THREE.MeshBasicMaterial({ color, ...o }));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };
  const geo = (g) => track(g);

  // sky dome with a soft gradient, puffy clouds, distant hills
  { const g = geo(new THREE.SphereGeometry(500, 32, 16)), p = g.attributes.position, cols = [], top = new THREE.Color('#4aa8ff'), hor = new THREE.Color('#cdeafd'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const k = clamp(p.getY(i) / 500, 0, 1); c.copy(hor).lerp(top, Math.pow(k, .55)); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const sky = new THREE.Mesh(g, basic('#ffffff', { vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -1; scene.add(sky); }
  const clouds = [];
  { const cg = geo(new THREE.SphereGeometry(1, 14, 10)), cm = std('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: .35 });
    for (let i = 0; i < 11; i++) { const g = new THREE.Group(); g.position.set(rnd(-380, 380), rnd(80, 120), rnd(-380, 380)); for (let k = 0; k < 5; k++) { const m = mesh(cg, cm, (k - 2) * rnd(5, 7), rnd(-1, 2), rnd(-3, 3), g, false); m.scale.set(rnd(7, 11), rnd(5, 7), rnd(6, 9)); } scene.add(g); clouds.push(g); } }
  { const hg = geo(new THREE.SphereGeometry(1, 20, 12)); for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; if (Math.cos(a) > .5) continue; const r = 340 + rnd(0, 40); const m = mesh(hg, std(i % 2 ? '#b6e39b' : '#a5d98e', { roughness: 1 }), Math.cos(a) * r, -18, Math.sin(a) * r, scene, false); m.scale.set(rnd(50, 80), rnd(35, 55), rnd(50, 80)); } }

  // ---------------------------------------------------------------- the city
  const boxes = [], posts = [];
  const addBoxCol = (x, z, w, d) => boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  // ground: grass beyond, asphalt city, water to the east
  mesh(geo(new THREE.PlaneGeometry(1400, 1400)).rotateX(-Math.PI / 2), std('#bfe6a5', { roughness: 1 }), 0, -.05, 0, scene, false);
  const asphalt = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#7d8498'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '80,80,110'},.06)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping; asphalt.repeat.set(84, 84);
  mesh(geo(new THREE.PlaneGeometry(2 * EDGE + 4, 2 * EDGE + 4)).rotateX(-Math.PI / 2), std('#ffffff', { map: asphalt, roughness: .85 }), 0, 0, 0, scene, false);
  const water = mesh(geo(new THREE.PlaneGeometry(700, 1400)).rotateX(-Math.PI / 2), std('#78d0ea', { roughness: .12, metalness: .1, envMapIntensity: 1.3 }), SHORE + 350, -.02, 0, scene, false);
  water.receiveShadow = true;
  const worldUV = (g, k) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / k, p.getZ(i) / k + p.getY(i) / k); return g; };
  const sandTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#f8e6ba'; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(210,170,110,.18)' : 'rgba(255,255,255,.35)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  const sandM = std('#ffffff', { map: sandTex, roughness: 1 });
  // the beach: sand from the boardwalk to the sea
  { const g = new THREE.BoxGeometry(SHORE + 3 - 177, .8, 2 * WALL + 40); g.translate((SHORE + 3 + 177) / 2, -.26, 0); mesh(geo(worldUV(g, 5)), sandM, 0, 0, 0, scene, false); }
  // the boardwalk: planks running across
  { const bt = canvasTex(64, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e2b97f' : '#efcd9a'; x.fillRect(0, i * 32, w, 30); x.fillStyle = 'rgba(120,80,40,.25)'; x.fillRect(0, i * 32 + 30, w, 2); } });
    bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(1, WALL); const g = new THREE.BoxGeometry(6, .3, 2 * WALL); g.translate(174, .01, 0); mesh(geo(g), std('#ffffff', { map: bt, roughness: .9 }), 0, 0, 0, scene, false); }
  // raised sidewalks with lawns on every block, and the outer ring
  { const parts = [], lawns = [], sands = [];
    const bx = (x0, x1, z0, z1, list) => { const g = new THREE.BoxGeometry(x1 - x0, .14, z1 - z0); g.translate((x0 + x1) / 2, .07, (z0 + z1) / 2); list.push(g); };
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const a = R[i], b = R[j], d = DIST(i, j), sz = d === 'park' ? 27 : 24; bx(a + RH, a + 40 - RH, b + RH, b + 40 - RH, parts); const lg = new THREE.PlaneGeometry(sz, sz).rotateX(-Math.PI / 2); lg.translate(a + 20, .145, b + 20); (d === 'beach' ? sands : lawns).push(lg); }
    bx(-WALL, EDGE, EDGE, WALL, parts); bx(-WALL, EDGE, -WALL, -EDGE, parts); bx(-WALL, -EDGE, -EDGE, EDGE, parts); bx(EDGE, 171, -WALL, WALL, parts);
    { const sg = mergeGeometries(sands); worldUV(sg, 5); mesh(geo(sg), sandM, 0, 0, 0, scene, false); }
    for (const [x0, x1, z0, z1] of [[-WALL + 1, EDGE, EDGE + 3, WALL - 1], [-WALL + 1, EDGE, -WALL + 1, -EDGE - 3], [-WALL + 1, -EDGE - 3, -EDGE - 3, EDGE + 3]]) { const lg = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2); lg.translate((x0 + x1) / 2, .145, (z0 + z1) / 2); lawns.push(lg); }
    const swTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#fbf3e6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#eadfcb'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); });
    swTex.wrapS = swTex.wrapT = THREE.RepeatWrapping;
    const sw = mergeGeometries(parts); { const p = sw.attributes.position, uv = sw.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.5, p.getZ(i) / 2.5 + p.getY(i)); }
    mesh(geo(sw), std('#ffffff', { map: swTex, roughness: .9 }), 0, 0, 0, scene, false);
    const lawnTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#c6eaa6'; x.fillRect(0, 0, w, h); x.fillStyle = '#bde39b'; x.fillRect(0, 0, w / 2, h); for (let i = 0; i < 80; i++) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 3); } });
    lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping;
    const lw = mergeGeometries(lawns); { const p = lw.attributes.position, uv = lw.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6); }
    mesh(geo(lw), std('#ffffff', { map: lawnTex, roughness: 1 }), 0, 0, 0, scene, false); }
  // lane markings: dashed centre lines and zebra crossings, all one instanced quad
  { const marks = []; const dash = (x, z, w, d) => marks.push([x, z, w, d]);
    for (const r of R) for (let s = -EDGE + 2; s < EDGE - 2; s += 5) { if (R.some((q) => Math.abs(s - q) < RH + 4)) continue; dash(s, r, 2.4, .22); dash(r, s, .22, 2.4); }
    for (const a of R) for (const b of R) for (const [dx, dz] of [[RH + 1.2, 0], [-RH - 1.2, 0], [0, RH + 1.2], [0, -RH - 1.2]]) { const x = a + dx, z = b + dz; if (Math.abs(x) > EDGE - 1 || Math.abs(z) > EDGE - 1) continue; for (let k = -3; k <= 3; k++) dx ? dash(x, z + k * 1.3, 1.8, .6) : dash(x + k * 1.3, z, .6, 1.8); }
    const im = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), std('#ffffff', { roughness: .8 }), marks.length), o = new THREE.Object3D();
    marks.forEach(([x, z, w, d], i) => { o.position.set(x, .02, z); o.scale.set(w, 1, d); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.receiveShadow = true; scene.add(im); }

  // buildings: one merged mesh with a tiling window texture tinted by vertex colour
  const winTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(0, h - 10, w, 10);
    x.fillStyle = '#e9e4ef'; x.beginPath(); x.roundRect(62, 52, 132, 128, 22); x.fill();
    const g = x.createLinearGradient(0, 62, 0, 172); g.addColorStop(0, '#9fd2ff'); g.addColorStop(1, '#6aa6e8'); x.fillStyle = g; x.beginPath(); x.roundRect(72, 62, 112, 108, 16); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(84, 150); x.lineTo(130, 72); x.lineTo(150, 72); x.lineTo(104, 150); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(124, 62, 8, 108); x.fillRect(72, 112, 112, 6);
    x.fillStyle = 'rgba(0,0,0,.08)'; x.beginPath(); x.roundRect(58, 182, 140, 12, 6); x.fill();
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const bParts = [], plain = [];
  const tint = (g, color) => { const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const wallBox = (x, y, z, w, h, d, color, windows = true, col = true) => {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; if (!windows || f === 2 || f === 3) { uv.setXY(i, .02, .02); continue; } const ext = f < 2 ? d : w; uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(ext / 4)), uv.getY(i) * Math.max(1, Math.round(h / 4))); }
    g.translate(x, y + h / 2, z); bParts.push(tint(g, color)); if (col) addBoxCol(x, z, w, d);
  };
  const solid = (x, y, z, w, h, d, color, rad = 0) => { const g = rad ? new RoundedBoxGeometry(w, h, d, 2, rad) : new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); plain.push(tint(g, color)); };
  const shade = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#5b4f7a'), k).getHexString();
  const palms = [], bushes = [], lamps = [], trees = [], benches = [], stops = [], carts = [], parkedSpots = [], boomboxes = [], citySigns = [];
  let pond = null;
  const special = new Set(['3,4', '4,3', '4,4', '3,3']);
  const rng = (() => { let a = 1234567; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const rpick = (a) => a[Math.floor(rng() * a.length)];
  // a box rotated by ry around (x, z), placed at local (lx, ly, lz); local +z is the facing direction
  const part = (x, z, ry, lx, ly, lz, w, h, d, color, rad = 0) => { const c = Math.cos(ry), s = Math.sin(ry), g = rad ? new RoundedBoxGeometry(w, h, d, 2, rad) : new THREE.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x + lx * c + lz * s, ly + h / 2, z - lx * s + lz * c); plain.push(tint(g, color)); };
  const local = (x, z, ry, lx, lz) => ({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) });
  const cyl = (x, y, z, r0, r1, h, color, seg = 12) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y + h / 2, z); plain.push(tint(g, color)); };
  const cone = (x, y, z, r, h, color, seg = 10, rot = 0) => { const g = new THREE.ConeGeometry(r, h, seg); if (rot) g.rotateY(rot); g.translate(x, y + h / 2, z); plain.push(tint(g, color)); };
  const bench = (x, z, ry, col = '#ff9ec0') => { part(x, z, ry, 0, .42, 0, 1.9, .1, .55, col, .04); part(x, z, ry, 0, .55, -.27, 1.9, .55, .09, col, .04); for (const sx of [-.78, .78]) part(x, z, ry, sx, .14, 0, .12, .3, .5, '#ffffff'); for (const sx of [-.45, .45]) { const p = local(x, z, ry, sx, .08); benches.push({ x: p.x, z: p.z, h: ry }); } };
  const busStop = (x, z, ry) => { part(x, z, ry, 0, 2.5, -.35, 3.8, .14, 1.7, '#5b7cf0', .05); part(x, z, ry, 0, .3, -1.05, 3.6, 2.2, .07, '#cfeeff'); for (const sx of [-1.8, 1.8]) part(x, z, ry, sx, .14, -1.05, .12, 2.4, .12, '#ffffff'); part(x, z, ry, 0, .42, -.8, 2.6, .1, .42, '#ffd36e', .04); part(x, z, ry, 2.3, .14, .1, .1, 2.9, .1, '#ffffff'); stops.push({ x, z, ry }); };
  const cart = (x, z, ry, col) => { part(x, z, ry, 0, .35, 0, 2.1, 1, 1.1, col, .15); part(x, z, ry, 0, 1.35, 0, 2.2, .1, 1.2, '#ffffff', .04); cyl(x, 1.4, z, .05, .05, 1.4, '#ffffff', 6); cone(x, 2.8, z, 1.5, .55, rpick(['#ff8fa0', '#8cc8ff', '#ffd36e']), 10); for (const sx of [-.8, .8]) { const p = local(x, z, ry, sx, .45); cyl(p.x, .14, p.z, .22, .22, .2, '#3c3a4c', 10); } posts.push({ x, z, r: 1.1 }); const v = local(x, z, ry, 0, -1.2); carts.push({ x: v.x, z: v.z, h: ry }); };
  const umbrella = (x, z, col) => { cyl(x, .14, z, .05, .05, 2.2, '#ffffff', 6); cone(x, 2.2, z, 1.6, .6, col, 8); const g = new THREE.SphereGeometry(.12, 8, 6); g.translate(x, 2.85, z); plain.push(tint(g, '#ffffff')); };
  const ROOFS = ['#ff8fa0', '#8cc8ff', '#b48cff', '#7fd6c2', '#ffb38a', '#ff8fb8'], BOXES = ['#ff8f8f', '#8cc8ff', '#ffd36e', '#7fd6c2', '#c9a6ff', '#ffb38a', '#b8e07a'];
  let dockSign = false;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const cx = R[i] + 20, cz = R[j] + 20, dist = DIST(i, j);
    if (special.has(`${i},${j}`)) continue;
    if (dist === 'downtown' || dist === 'mid') {
      const down = dist === 'downtown';
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const lx = cx + sx * 6, lz = cz + sz * 6;
        if (rng() < (down ? .1 : .22)) { palms.push([lx + rnd(-2, 2), lz + rnd(-2, 2)], [lx - 3, lz + 3]); bushes.push([lx + 3, lz - 2], [lx - 2, lz - 3]); bench(lx, lz + 3.5, 0, '#8cc8ff'); continue; }
        const w = 8.5 + rng() * 2.5, d = 8.5 + rng() * 2.5, h = down ? Math.round(14 + rng() * 30) : Math.round(6 + rng() * 12), col = PASTEL[Math.floor(rng() * PASTEL.length)];
        wallBox(lx, .14, lz, w, h, d, col);
        solid(lx, .14 + h, lz, w + .4, .5, d + .4, shade(col, .12));
        if (down && h > 22 && rng() < .75) {
          const h2 = Math.round(5 + rng() * 12), w2 = w * .62, d2 = d * .62, c2 = rpick(PASTEL);
          wallBox(lx, .64 + h, lz, w2, h2, d2, c2, true, false); solid(lx, .64 + h + h2, lz, w2 + .4, .5, d2 + .4, shade(c2, .15));
          if (rng() < .55) { cyl(lx, 1.14 + h + h2, lz, .12, .2, 6, '#ffffff', 8); const g = new THREE.SphereGeometry(.4, 10, 8); g.translate(lx, 7.3 + h + h2, lz); plain.push(tint(g, '#ff6b81')); }
        } else if (rng() < .6) solid(lx + rnd(-2, 2), .64 + h, lz + rnd(-2, 2), 2.2, 1.1, 1.6, '#dfe4ee', .2);
        const aw = CAR_COLS[Math.floor(rng() * CAR_COLS.length)];
        solid(lx + sx * (w / 2 + .45), 3, lz, .9, .25, w * .55, aw, .1);
        solid(lx, 3, lz + sz * (d / 2 + .45), w * .55, .25, .9, aw, .1);
        solid(lx + sx * (w / 2 + .03), .14, lz, .1, 2.4, 1.4, '#7c6aa8');
      }
    } else if (dist === 'homes') {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const lx = cx + sx * 8, lz = cz + sz * 8, w = 6.6 + rng() * 1.2, h = rng() < .45 ? 6.2 : 3.6, col = PASTEL[Math.floor(rng() * PASTEL.length)];
        wallBox(lx, .14, lz, w, h, w, col);
        const rh = 2.2 + rng() * .9, rg = new THREE.ConeGeometry(w * .8, rh, 4); rg.rotateY(Math.PI / 4); rg.translate(lx, .14 + h + rh / 2, lz); plain.push(tint(rg, rpick(ROOFS)));
        solid(lx, .14, lz + sz * (w / 2 + .03), 1.2, 2.2, .12, '#7c6aa8');
        solid(lx + sx * w * .2, .14 + h + .2, lz - sz * w * .15, .7, 2.1, .7, shade(col, .25));
        bushes.push([lx + sx * (w / 2 + 1.4), lz + sz * 1.5], [lx - sx * 1.6, lz + sz * (w / 2 + 1.4)]);
        // a little picket fence along the road side
        for (let k = -3; k <= 3; k++) solid(lx + k * 1.1, .14, cz + sz * 14.2, .14, .7, .14, '#ffffff');
        solid(lx, .5, cz + sz * 14.2, 7.4, .1, .08, '#ffffff');
      }
      trees.push([cx + rnd(-1, 1), cz + rnd(-1.5, 1.5)]);
      if (rng() < .7) parkedSpots.push([cx + (rng() < .5 ? -2 : 2), cz + (rng() < .5 ? 9.5 : -9.5), rng() < .5 ? 0 : Math.PI]);
    } else if (dist === 'docks') {
      const wc = rpick(['#cfd8e6', '#d8e6f0', '#e6dccf', '#c9e3dd', '#e3d6f0']);
      wallBox(cx, .14, cz - 6, 22, 9, 13, wc, false); solid(cx, 9.14, cz - 6, 22.6, .6, 13.6, shade(wc, .2));
      for (let k = -2; k <= 2; k++) solid(cx + k * 4.4, 9.74, cz - 6, 1.6, .5, 12, '#bfe6ff', .1);
      solid(cx, .14, cz - 12.56, 7, 5.6, .12, '#9aa3b8'); for (let k = 0; k < 5; k++) solid(cx, .6 + k * 1.05, cz - 12.64, 7, .12, .04, '#c8cedd');
      solid(cx + 8, .14, cz - 12.56, 1.2, 2.3, .12, '#7c6aa8');
      if (!dockSign) { dockSign = true; citySigns.push(['DOCKS', '#5b7cf0', '#ffffff', cx, 7.3, cz - 12.7, Math.PI, 9, 2.8]); }
      for (let k = 0; k < 3; k++) { const x = cx - 10 + k * 3.2, z = cz + 9.5; solid(x, .14, z, 2.8, 2.7, 6.2, rpick(BOXES), .08); addBoxCol(x, z, 2.8, 6.2); if (rng() < .6) solid(x, 2.86, z, 2.8, 2.7, 6.2, rpick(BOXES), .08); }
      for (let k = 0; k < 3; k++) { const x = cx + 3 + k * 1.5, z = cz + 10; solid(x, .14, z, 1.2, 1.2, 1.2, '#e2b97f', .08); posts.push({ x, z, r: .8 }); }
      if ((i + j) % 2 === 0) { solid(cx + 11.5, .14, cz + 10.5, 1.4, 17, 1.4, '#ffcf4a'); solid(cx + 6, 17.14, cz + 10.5, 15, 1, 1.2, '#ffcf4a'); solid(cx + 12.6, 16.2, cz + 10.5, 2.4, 2, 2.4, '#ff8f6b', .2); solid(cx + .5, 10.2, cz + 10.5, .08, 7, .08, '#3b2f5c'); solid(cx + .5, 9.6, cz + 10.5, .8, .6, .8, '#ff6b81', .15); posts.push({ x: cx + 11.5, z: cz + 10.5, r: 1.1 }); }
      if (rng() < .6) parkedSpots.push([cx + 5, cz + 3.4, Math.PI / 2]);
      lamps.push([cx - 13.5, cz + 2, 0]);
    } else if (dist === 'park') {
      const hasPond = i === 1 && j === 3;
      if (hasPond) { pond = { x: cx, z: cz, r: 9 }; posts.push({ x: cx, z: cz, r: 9.2 }); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .3; bench(cx + Math.sin(a) * 11.4, cz + Math.cos(a) * 11.4, a + Math.PI, '#e9b97f'); } }
      else { bench(cx - 4, cz, Math.PI / 2, '#e9b97f'); bench(cx + 4, cz, -Math.PI / 2, '#e9b97f'); if (rng() < .5) bench(cx, cz + 5, Math.PI, '#e9b97f'); }
      for (let k = 0; k < 10; k++) { const x = cx + rnd(-12, 12), z = cz + rnd(-12, 12); if (hasPond && Math.hypot(x - cx, z - cz) < 13.5) continue; if (Math.abs(x - cx) < 6 && Math.abs(z - cz) < 7) continue; trees.push([x, z]); }
      for (let k = 0; k < 5; k++) bushes.push([cx + rnd(-12, 12), cz + (rng() < .5 ? -1 : 1) * rnd(8, 12)]);
      if (i === 0 && j === 5) cart(cx + 13.2, cz - 4, -Math.PI / 2, '#fff1f4');
    } else if (dist === 'beach') {
      for (const [ox, oz] of [[-6, -7], [6, 7]]) { const x = cx + ox, z = cz + oz, kc = rpick(PASTEL); wallBox(x, .14, z, 6, 4, 6, kc, false); solid(x, 4.14, z, 6.6, .4, 6.6, shade(kc, .15)); const aw = rpick(['#ff8fa0', '#8cc8ff', '#ffd36e']); solid(x + 3.5, 2.6, z, 1.2, .2, 5, aw, .08); solid(x - 3.5, 2.6, z, 1.2, .2, 5, aw, .08); solid(x + 3.05, .14, z, .1, 2.2, 1.4, '#7c6aa8'); }
      for (let k = 0; k < 4; k++) palms.push([cx + rnd(-12, 12), cz + rnd(-12, 12) * (k % 2 ? 1 : -1)]);
      umbrella(cx + 9, cz - 9, '#ff8fa0'); umbrella(cx - 9, cz + 9, '#7fd6c2');
    }
  }
  // the beach strip: umbrellas, towels, a lifeguard tower, a volleyball net, boomboxes for the dancers
  for (let z = -165; z <= 165; z += 15) { if (Math.abs(z) < 9) continue; const x = 182 + rnd(0, 9); umbrella(x, z + rnd(-3, 3), rpick(['#ff8fa0', '#8cc8ff', '#ffd36e', '#7fd6c2', '#c9a6ff'])); solid(x + 1.4, .14, z + rnd(-1, 1), 1, .04, 2, rpick(['#ff9ec0', '#9fe3f0', '#ffe58a', '#b8e07a'])); }
  { const lx = 189, lz = 46; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) solid(lx + a, .14, lz + b, .2, 2.6, .2, '#ffffff'); solid(lx, 2.6, lz, 2.6, .2, 2.6, '#e9b97f'); solid(lx, 2.8, lz, 2.2, 1.6, 2.2, '#ff6b81', .1); solid(lx, 4.4, lz, 2.8, .2, 2.8, '#ffffff', .08); posts.push({ x: lx, z: lz, r: 1.6 }); }
  { const vz = -100; for (const sz of [-4.5, 4.5]) { cyl(186, .14, vz + sz, .07, .07, 2.6, '#ffffff', 6); posts.push({ x: 186, z: vz + sz, r: .2 }); } solid(186, 1.8, vz, .04, .8, 9, '#ffffff'); }
  for (const [x, z] of [[186, -40], [186, 82]]) { solid(x, .14, z, 1.1, .7, .45, '#c9a6ff', .12); for (const sx of [-.32, .32]) { const g = new THREE.CylinderGeometry(.18, .18, .05, 12).rotateX(Math.PI / 2); g.translate(x + sx, .5, z + .23); plain.push(tint(g, '#3b2f5c')); } boomboxes.push({ x, z }); }
  cart(173.2, 24, -Math.PI / 2, '#fff1f4'); cart(173.2, -70, -Math.PI / 2, '#eafff6');
  cart(46.8, 30, Math.PI / 2, '#fff8e0');
  for (let k = 0; k < 14; k++) { const a = rnd(0, TAU); bench(175.6, -150 + k * 23 + rnd(-2, 2), Math.PI / 2, '#8cc8ff'); }
  // bus stops beside the roads (facing -x toward the road)
  for (const [i, j] of [[4, 2], [5, 5], [2, 4], [6, 1], [3, 6], [7, 3], [1, 5], [5, 0]]) busStop(R[i] + 7.3, R[j] + 20 + 4, -Math.PI / 2);
  // police station (blue + white, big star), clinic (heart), bank (columns + coin), gas station (canopy + pumps)
  wallBox(STATION.x, .14, STATION.z, 16, 9, 14, '#dfe9ff'); solid(STATION.x, 9.14, STATION.z, 16.6, .7, 14.6, '#5b7cf0'); solid(STATION.x + 8.1, .14, STATION.z, .3, 3.2, 4, '#5b7cf0');
  solid(STATION.x + 8.3, 3.4, STATION.z, 1.6, .3, 6, '#ffffff', .1);
  wallBox(CLINIC.x, .14, CLINIC.z, 16, 12, 14, '#fff1f4'); solid(CLINIC.x, 12.14, CLINIC.z, 16.6, .7, 14.6, '#ff8fa0'); solid(CLINIC.x - 8.1, .14, CLINIC.z, .3, 3.2, 4, '#ff8fa0');
  wallBox(BANK.x, .14, BANK.z, 14, 8, 12, '#fff3d6', false); solid(BANK.x, 8.14, BANK.z, 15, .8, 13, '#ffd36e');
  for (let k = -2; k <= 2; k++) { const g = new THREE.CylinderGeometry(.42, .5, 6.4, 12); g.translate(BANK.x - 7.8, .14 + 3.2 + .4, BANK.z + k * 2.6); plain.push(tint(g, '#ffffff')); }
  solid(BANK.x - 8, .14, BANK.z, 2, .4, 12.6, '#f3ead6'); solid(BANK.x - 8.2, 6.9, BANK.z, 1.8, .8, 13, '#ffe7a6');
  solid(GAS.x + 4, .14, GAS.z, 8, 5, 10, '#d9f4ec'); addBoxCol(GAS.x + 4, GAS.z, 8, 10); solid(GAS.x + 4, 5.14, GAS.z, 8.4, .5, 10.4, '#3fc7b0');
  solid(GAS.x - 5, 5.2, GAS.z, 11, .7, 14, '#ffffff', .2); solid(GAS.x - 5, 5.9, GAS.z, 11.2, .35, 14.2, '#ff8fa0', .1);
  for (const [dx, dz] of [[-4.6, -6], [-4.6, 6], [4, -6], [4, 6]]) { solid(GAS.x - 5 + dx * .9, .14, GAS.z + dz, .4, 5.1, .4, '#ffffff'); posts.push({ x: GAS.x - 5 + dx * .9, z: GAS.z + dz, r: .35 }); }
  for (const dz of [-3, 3]) { solid(GAS.x - 5, .14, GAS.z + dz, 1.1, 1.8, .8, '#ff8fa0', .15); solid(GAS.x - 5, 1.6, GAS.z + dz, .9, .4, .82, '#ffffff', .1); posts.push({ x: GAS.x - 5, z: GAS.z + dz, r: .8 }); }
  for (const [x, z] of [[STATION.x - 4, STATION.z - 10], [CLINIC.x + 3, CLINIC.z + 10], [BANK.x + 4, BANK.z - 10], [GAS.x + 8, GAS.z + 9]]) palms.push([x, z]);
  // outer ring: palms along the lawns, hedges at the edge
  for (let s = -EDGE; s <= EDGE + 2; s += 12) { palms.push([s + rnd(-2, 2), EDGE + 7 + rnd(-1, 2)], [s + rnd(-2, 2), -EDGE - 7 - rnd(-1, 2)]); if (Math.abs(s) < EDGE - 4) palms.push([-EDGE - 7 - rnd(-1, 2), s + rnd(-2, 2)]); }
  for (let s = -WALL + 3; s <= 168; s += 4) { solid(s, .14, WALL - .2, 3.6, 1.1, 1, '#9fd88a', .45); solid(s, .14, -WALL + .2, 3.6, 1.1, 1, '#9fd88a', .45); if (s < WALL - 3) solid(-WALL + .2, .14, s, 1, 1.1, 3.6, '#9fd88a', .45); }
  // street palms + lamps along sidewalks (not where a bus stop or a cart stands)
  const busy = (x, z) => stops.some((q) => Math.abs(q.x - x) < 4 && Math.abs(q.z - z) < 4) || carts.some((q) => Math.hypot(q.x - x, q.z - z) < 4);
  for (const r of R) for (let s = -EDGE + 9; s <= EDGE - 9; s += 13) { if (R.some((q) => Math.abs(s - q) < 9)) continue; const odd = Math.abs(Math.round(s / 13)) % 2; const pts = odd ? [[s, r + 6.6, 0], [r - 6.6, s, 1]] : [[s, r - 6.6, 0], [r + 6.6, s, 1]]; for (const [x, z, ax] of pts) { if (busy(x, z) || Math.abs(z) > EDGE || Math.abs(x) > EDGE) continue; odd ? palms.push([x, z]) : lamps.push([x, z, ax]); } }
  // pier: plank deck, posts, rails and a little striped lighthouse
  const pierTex = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#e9c48e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e2b97f' : '#efcd9a'; x.fillRect(i * 32, 0, 30, h); } x.fillStyle = 'rgba(120,80,40,.25)'; for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 30, 0, 2, h); });
  pierTex.wrapS = pierTex.wrapT = THREE.RepeatWrapping; pierTex.repeat.set(5, 1.5);
  mesh(geo(new THREE.BoxGeometry(PIER.x1 - PIER.x0 + 4, .4, PIER.z * 2 + .6)), std('#ffffff', { map: pierTex, roughness: .9 }), (PIER.x0 + PIER.x1) / 2 + 2, -.06, 0);
  for (let x = PIER.x0 + 2; x <= PIER.x1 + 2; x += 4) for (const z of [-PIER.z - .1, PIER.z + .1]) { solid(x, -1.4, z, .4, 2.6, .4, '#c99a62', .1); solid(x, .14, z, .25, 1.1, .25, '#ffffff', .08); }
  for (const z of [-PIER.z - .1, PIER.z + .1]) solid((PIER.x0 + PIER.x1) / 2 + 2, 1.05, z, PIER.x1 - PIER.x0 + 4, .14, .18, '#ffffff', .06);
  { const LX = PIER.x1 + 1, LH = [['#ffffff', 0], ['#ff8fa0', 2.2], ['#ffffff', 4.4], ['#ff8fa0', 6.6]];
    LH.forEach(([c, y], k) => { const g = new THREE.CylinderGeometry(1.7 - (k + 1) * .14, 1.7 - k * .14, 2.2, 20); g.translate(LX, .14 + y + 1.1, 0); plain.push(tint(g, c)); });
    solid(LX, 8.94, 0, 2.6, .3, 2.6, '#5b7cf0', .1); const lg = new THREE.CylinderGeometry(.8, .8, 1.3, 16); lg.translate(LX, 9.24 + .65, 0); plain.push(tint(lg, '#fff6c4')); const cg = new THREE.ConeGeometry(1.2, 1.2, 16); cg.translate(LX, 10.54 + .6, 0); plain.push(tint(cg, '#ff6b81'));
    posts.push({ x: LX, z: 0, r: 2.1 }); }
  // stunt ramps: candy wedges with white stripes
  RAMPS.forEach((r, k) => { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(r.L, 0), new THREE.Vector2(r.L, r.H)]), g = new THREE.ExtrudeGeometry(sh, { depth: r.W, bevelEnabled: false }); g.translate(0, 0, -r.W / 2); g.rotateY(Math.atan2(r.dx, r.dz) - Math.PI / 2); g.translate(r.x0, .01, r.z0); plain.push(tint(g, k % 2 ? '#ff8fb8' : '#ffd36e'));
    for (let q = 1; q < 4; q++) { const u = r.L * q / 4, y = r.H * u / r.L, sg = new THREE.BoxGeometry(.5, .06, r.W + .02); sg.rotateZ(Math.atan2(r.H, r.L)); sg.rotateY(Math.atan2(r.dx, r.dz) - Math.PI / 2); sg.translate(r.x0 + r.dx * u, y + .04, r.z0 + r.dz * u); plain.push(tint(sg, '#ffffff')); } });
  { const B = mesh(geo(mergeGeometries(bParts)), std('#ffffff', { map: winTex, vertexColors: true, roughness: .78 })); B.castShadow = true;
    const P = mesh(geo(mergeGeometries(plain.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute('uv'); return g; }))), std('#ffffff', { vertexColors: true, roughness: .55 })); P.castShadow = true; }
  // signs (canvas text on rounded boards)
  const signTex = (text, bg, fg, w = 512, h = 160, icon = null) => canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 40); x.fill(); x.lineWidth = 10; x.strokeStyle = '#ffffff'; x.stroke();
    x.fillStyle = fg; x.font = `700 ${h * .5}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2 + (icon ? h * .3 : 0), h / 2 + 4);
    if (icon) { x.save(); x.translate(w / 2 - x.measureText(text).width / 2 - h * .15, h / 2); icon(x, h * .3); x.restore(); }
  });
  const sign = (tex, x, y, z, ry, w, h) => { const m = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h)), basic('#ffffff', { map: tex, transparent: true })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const starPath = (x, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); };
  const heartPath = (x, r) => { x.beginPath(); x.moveTo(0, r * .9); x.bezierCurveTo(-r * 1.6, -r * .2, -r * .6, -r * 1.3, 0, -r * .4); x.bezierCurveTo(r * .6, -r * 1.3, r * 1.6, -r * .2, 0, r * .9); x.fill(); };
  sign(signTex('POLICE', '#5b7cf0', '#ffffff', 512, 160, (x, r) => { x.fillStyle = '#ffd36e'; starPath(x, r); }), STATION.x + 8.12, 6.6, STATION.z, Math.PI / 2, 7, 2.2);
  sign(signTex('CLINIC', '#ff8fa0', '#ffffff', 512, 160, (x, r) => { x.fillStyle = '#ffffff'; heartPath(x, r); }), CLINIC.x - 8.12, 8.4, CLINIC.z, -Math.PI / 2, 7, 2.2);
  sign(signTex('BANK', '#ffd36e', '#7a5200', 512, 160, (x, r) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill(); x.fillStyle = '#e0a020'; x.beginPath(); x.arc(0, 0, r * .7, 0, TAU); x.fill(); }), BANK.x - 9.15, 7.3, BANK.z, -Math.PI / 2, 6, 1.9);
  sign(signTex('GAS', '#3fc7b0', '#ffffff', 384, 160), GAS.x - 5, 5.55, GAS.z - 7.15, Math.PI, 4.2, 1.75);
  sign(signTex('GAS', '#3fc7b0', '#ffffff', 384, 160), GAS.x - 5, 5.55, GAS.z + 7.15, 0, 4.2, 1.75);
  for (const [t, bg, fg, x, y, z, ry, w, h] of citySigns) sign(signTex(t, bg, fg), x, y, z, ry, w, h);
  { const bt = signTex('BUS', '#5b7cf0', '#ffffff', 256, 160); for (const st of stops) { const p = local(st.x, st.z, st.ry, 2.3, .1); for (const sd of [0, Math.PI]) sign(bt, p.x, 2.75, p.z, st.ry + Math.PI / 2 + sd, .9, .56); } }
  // the race start: a checkered arch over the road
  const RACE_START = { x: -20, z: 80 };
  { const ck = canvasTex(512, 96, (x, w, h) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 2 ? '#3b2f5c' : '#ffffff'; x.fillRect(i * 16, j * 16, 16, 16); } x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(156, 14, 200, 68, 30); x.fill(); x.fillStyle = '#ff6b81'; x.font = `700 46px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RACE', 256, 50); });
    for (const sz of [RACE_START.z - 6.3, RACE_START.z + 6.3]) { cyl(RACE_START.x, .14, sz, .2, .24, 7.6, '#ffffff', 10); posts.push({ x: RACE_START.x, z: sz, r: .35 }); const g = new THREE.SphereGeometry(.4, 12, 8); g.translate(RACE_START.x, 7.9, sz); plain.push(tint(g, '#ff6b81')); }
    for (const sd of [Math.PI / 2, -Math.PI / 2]) sign(ck, RACE_START.x + Math.sin(sd) * .06, 6.8, RACE_START.z, sd, 13, 2.4); }
  // the big gold coin on the bank roof, spinning
  const coin = new THREE.Mesh(geo(new THREE.CylinderGeometry(2, 2, .5, 32).rotateX(Math.PI / 2)), std('#ffcf4a', { metalness: .6, roughness: .25, emissive: '#7a5200', emissiveIntensity: .25 })); coin.position.set(BANK.x, 12, BANK.z); coin.castShadow = true; scene.add(coin);
  const badge = new THREE.Mesh(geo(new THREE.CylinderGeometry(2, 2, .4, 5).rotateX(Math.PI / 2)), std('#ffd36e', { metalness: .5, roughness: .3 })); badge.position.set(STATION.x, 11.6, STATION.z); badge.castShadow = true; scene.add(badge);

  // instanced palms, bushes, lamps (canopies can be hidden when they block the camera)
  const canopies = [], ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  { const trunkG = geo(new THREE.CylinderGeometry(.17, .3, 5.4, 8).translate(0, 2.7, 0)), leafG = geo(new THREE.SphereGeometry(1, 10, 6).scale(.55, .1, 1.9).translate(0, 0, 1.7));
    const tr = new THREE.InstancedMesh(trunkG, std('#c99a62', { roughness: .9 }), palms.length), lf = new THREE.InstancedMesh(leafG, std('#6cc46c', { roughness: .7 }), palms.length * 7), o = new THREE.Object3D();
    palms.forEach(([x, z], i) => { const s = .85 + ((i * 37) % 10) / 30; o.position.set(x, .14, z); o.rotation.set(0, i, ((i % 3) - 1) * .06); o.scale.setScalar(s); o.updateMatrix(); tr.setMatrixAt(i, o.matrix);
      for (let k = 0; k < 7; k++) { o.position.set(x, .14 + 5.3 * s, z); o.rotation.set(0, 0, 0); o.rotateY(k * TAU / 7 + i); o.rotateX(.42 + (k % 2) * .18); o.scale.setScalar(s); o.updateMatrix(); lf.setMatrixAt(i * 7 + k, o.matrix); lf.setColorAt(i * 7 + k, new THREE.Color(k % 2 ? '#7fd17a' : '#5fb966')); }
      posts.push({ x, z, r: .4 }); });
    tr.castShadow = lf.castShadow = true; scene.add(tr, lf);
    palms.forEach(([x, z], i) => { canopies.push({ x, z, top: 5.4, m: lf, idx: [0, 1, 2, 3, 4, 5, 6].map((k) => i * 7 + k) }); canopies.push({ x, z, top: 5.4, m: tr, idx: [i] }); });
    const bg = geo(new THREE.SphereGeometry(1, 12, 8)), bm = new THREE.InstancedMesh(bg, std('#8fd47e', { roughness: .9 }), bushes.length); bushes.forEach(([x, z], i) => { o.position.set(x, .4, z); o.rotation.set(0, 0, 0); o.scale.set(1.3, .9, 1.1); o.updateMatrix(); bm.setMatrixAt(i, o.matrix); }); bm.castShadow = true; scene.add(bm);
    const poleG = geo(new THREE.CylinderGeometry(.08, .12, 5, 8).translate(0, 2.5, 0)), headG = geo(new THREE.SphereGeometry(.32, 12, 8).scale(1, .6, 1));
    const pm = new THREE.InstancedMesh(poleG, std('#ffffff', { roughness: .4 }), lamps.length), hm = new THREE.InstancedMesh(headG, std('#fff6d0', { emissive: '#ffe9a0', emissiveIntensity: .8 }), lamps.length);
    lamps.forEach(([x, z], i) => { o.position.set(x, .14, z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); o.position.y = 5.2; o.updateMatrix(); hm.setMatrixAt(i, o.matrix); posts.push({ x, z, r: .25 }); });
    pm.castShadow = true; scene.add(pm, hm);
    // round park trees
    const ttG = geo(new THREE.CylinderGeometry(.2, .3, 2.6, 8).translate(0, 1.3, 0)), tcG = geo(new THREE.SphereGeometry(1, 14, 10));
    const tt = new THREE.InstancedMesh(ttG, std('#c99a62', { roughness: .9 }), trees.length), tc = new THREE.InstancedMesh(tcG, std('#ffffff', { roughness: .85 }), trees.length * 2);
    trees.forEach(([x, z], i) => { const s = .9 + ((i * 53) % 10) / 22; o.position.set(x, .14, z); o.rotation.set(0, i, 0); o.scale.setScalar(s); o.updateMatrix(); tt.setMatrixAt(i, o.matrix);
      o.position.set(x, .14 + 3.5 * s, z); o.scale.set(2.2 * s, 2 * s, 2.2 * s); o.updateMatrix(); tc.setMatrixAt(i * 2, o.matrix); tc.setColorAt(i * 2, new THREE.Color(['#7fd17a', '#8fd47e', '#a5d98e', '#ffb3c7'][i % 4]));
      o.position.set(x + .6 * s, .14 + 4.6 * s, z - .3 * s); o.scale.setScalar(1.3 * s); o.updateMatrix(); tc.setMatrixAt(i * 2 + 1, o.matrix); tc.setColorAt(i * 2 + 1, new THREE.Color(['#8fdc86', '#a3e08f', '#b6e39b', '#ffc8d6'][i % 4]));
      posts.push({ x, z, r: .45 }); });
    tt.castShadow = tc.castShadow = true; scene.add(tt, tc);
    trees.forEach(([x, z], i) => { canopies.push({ x, z, top: 3.2, m: tc, idx: [i * 2, i * 2 + 1] }); canopies.push({ x, z, top: 3.2, m: tt, idx: [i] }); });
    for (const c of canopies) c.mats = c.idx.map((k) => { const m4 = new THREE.Matrix4(); c.m.getMatrixAt(k, m4); return m4; }); }
  // the park pond with lily pads and a family of toy ducks
  const ducks = [];
  if (pond) { const rim = mesh(geo(new THREE.CylinderGeometry(pond.r + .7, pond.r + .9, .22, 40)), std('#f3e3bd', { roughness: 1 }), pond.x, .1, pond.z, scene, false); rim.receiveShadow = true;
    const pw = mesh(geo(new THREE.CircleGeometry(pond.r, 40).rotateX(-Math.PI / 2)), std('#7fd3ee', { roughness: .1, metalness: .1, envMapIntensity: 1.3 }), pond.x, .23, pond.z, scene, false); pw.receiveShadow = true;
    const lp = geo(new THREE.CircleGeometry(.6, 12).rotateX(-Math.PI / 2)), lpm = std('#7fd17a', { roughness: .8 }); for (let k = 0; k < 7; k++) { const a = rnd(0, TAU), r = rnd(2, pond.r - 1.2); mesh(lp, lpm, pond.x + Math.cos(a) * r, .25, pond.z + Math.sin(a) * r, scene, false); }
    const db = geo(new THREE.SphereGeometry(.32, 12, 9)), dh = geo(new THREE.SphereGeometry(.2, 10, 8)), dk = geo(new THREE.ConeGeometry(.08, .18, 8).rotateX(Math.PI / 2)), ym = std('#ffe066', { roughness: .5 }), om = std('#ff9f43'), deG = geo(new THREE.SphereGeometry(.05, 8, 6)), deM = std('#2a1c2e', { roughness: .3 });
    for (let k = 0; k < 5; k++) { const g = new THREE.Group(), sc = k ? .6 : 1; mesh(db, ym, 0, .2, 0, g).scale.set(1, .8, 1.25); mesh(dh, ym, 0, .5, .3, g); mesh(dk, om, 0, .48, .55, g, false); for (const sx of [-1, 1]) mesh(deG, deM, sx * .1, .56, .45, g, false); g.scale.setScalar(sc); scene.add(g); ducks.push({ g, a: -k * .45, r: 4.5 }); } }
  // collision grid: buildings and posts bucketed by 16 m cells
  const GRID = 16, cellsB = new Map(), cellsP = new Map(), NONE = [];
  { const put = (map, x0, x1, z0, z1, it) => { for (let i = Math.floor(x0 / GRID); i <= Math.floor(x1 / GRID); i++) for (let j = Math.floor(z0 / GRID); j <= Math.floor(z1 / GRID); j++) { const k = i * 1000 + j; if (!map.has(k)) map.set(k, []); map.get(k).push(it); } };
    for (const b of boxes) put(cellsB, b.x0 - 2, b.x1 + 2, b.z0 - 2, b.z1 + 2, b);
    for (const p of posts) put(cellsP, p.x - p.r - 2, p.x + p.r + 2, p.z - p.r - 2, p.z + p.r + 2, p); }

  // ---------------------------------------------------------------- sprites + tags
  const tagTex = (text, color) => canvasTex(512, 112, (x, w, h) => {
    x.font = `700 46px ${FONT}`; const tw = Math.min(w - 20, x.measureText(text).width + 56);
    x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect((w - tw) / 2, 14, tw, 80, 40); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc((w - tw) / 2 + 30, 54, 11, 0, TAU); x.fill();
    x.fillStyle = '#3b2f5c'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2 + 10, 56, tw - 60);
  });
  const glowTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const starTex = canvasTex(64, 64, (x) => { x.translate(32, 32); x.fillStyle = '#ffd34a'; starPath(x, 28); x.fillStyle = '#fff7c8'; starPath(x, 12); });
  const coinTex = canvasTex(64, 64, (x) => { x.fillStyle = '#e0a020'; x.beginPath(); x.arc(32, 32, 28, 0, TAU); x.fill(); x.fillStyle = '#ffd34a'; x.beginPath(); x.arc(32, 32, 21, 0, TAU); x.fill(); x.fillStyle = '#fff3b0'; x.fillRect(29, 18, 6, 28); });
  const flashTex = canvasTex(128, 128, (x) => { x.translate(64, 64); const g = x.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(.35, 'rgba(255,220,90,.9)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; for (let i = 0; i < 8; i++) { x.rotate(TAU / 8); x.beginPath(); x.moveTo(0, -12); x.lineTo(i % 2 ? 40 : 62, 0); x.lineTo(0, 12); x.fill(); } x.beginPath(); x.arc(0, 0, 26, 0, TAU); x.fill(); });
  const loadTex = (src) => { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; return track(t); };

  // ---------------------------------------------------------------- cars
  const CG = {
    body: geo(new RoundedBoxGeometry(2.0, .72, 3.9, 3, .3)), cab: geo(new RoundedBoxGeometry(1.7, .62, 2.0, 3, .26)), roof: geo(new RoundedBoxGeometry(1.76, .14, 1.9, 2, .07)),
    bump: geo(new RoundedBoxGeometry(2.06, .24, .3, 2, .1)), wheel: geo(new THREE.CylinderGeometry(.42, .42, .34, 20).rotateZ(Math.PI / 2)), hub: geo(new THREE.CylinderGeometry(.2, .2, .36, 12).rotateZ(Math.PI / 2)),
    lamp: geo(new THREE.SphereGeometry(.14, 10, 8)), bar: geo(new RoundedBoxGeometry(1.3, .16, .42, 2, .06)), barL: geo(new RoundedBoxGeometry(.52, .2, .36, 2, .08)), door: geo(new RoundedBoxGeometry(2.04, .4, 1.9, 2, .12)),
    head: geo(new THREE.SphereGeometry(.3, 14, 10)),
    box: geo(new RoundedBoxGeometry(1.96, 1.2, 2.2, 3, .2)), stripe: geo(new RoundedBoxGeometry(2.0, .18, 2.24, 2, .08)), cone: geo(new THREE.ConeGeometry(.42, 1.0, 14).rotateX(Math.PI)), scoop: geo(new THREE.SphereGeometry(.42, 14, 10)),
  };
  const glassM = track(new THREE.MeshPhysicalMaterial({ color: '#cfeeff', roughness: .05, metalness: .1, transparent: true, opacity: .55, clearcoat: 1 }));
  const tyreM = std('#3c3a4c', { roughness: .8 }), hubM = std('#ffffff', { roughness: .4 }), headM = std('#fffbe6', { emissive: '#fff6c8', emissiveIntensity: .9 }), tailM = std('#ff8fa0', { emissive: '#ff6b81', emissiveIntensity: .6 });
  const redM = basic('#ff3b5c'), blueM = basic('#3b6bff'), offM = std('#d7d9e6', { roughness: .3 });
  const policeTex = signTex('POLICE', '#ffffff', '#5b7cf0', 384, 96), iceTex = signTex('ICE CREAM', '#ffffff', '#ff6b81', 512, 140);
  const cars = [];
  function makeCar(color, police = false, driverImg = null, icecream = false) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const bm = police ? gloss('#ffffff') : gloss(color);
    mesh(CG.body, bm, 0, .82, 0, body);
    if (icecream) { const cb = mesh(CG.cab, glassM, 0, 1.44, .85, body); cb.scale.z = .5; const rf = mesh(CG.roof, bm, 0, 1.78, .85, body); rf.scale.z = .5;
      mesh(CG.box, gloss('#ffb3c7'), 0, 1.75, -.75, body); mesh(CG.stripe, gloss('#ffffff'), 0, 1.45, -.75, body, false);
      mesh(CG.cone, std('#e9b97f', { roughness: .8 }), 0, 3.0, -.75, body); mesh(CG.scoop, gloss('#ff9ec0'), 0, 3.45, -.75, body); mesh(CG.scoop, gloss('#fff3d6'), 0, 3.85, -.75, body).scale.setScalar(.8);
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.9, .55)), basic('#ffffff', { map: iceTex, transparent: true })); p.position.set(sx * 1.0, 1.95, -.75); p.rotation.y = sx * Math.PI / 2; body.add(p); } }
    else { mesh(CG.cab, glassM, 0, 1.44, -.25, body); mesh(CG.roof, bm, 0, 1.78, -.25, body); }
    mesh(CG.bump, gloss('#ffffff'), 0, .56, 1.92, body); mesh(CG.bump, gloss('#ffffff'), 0, .56, -1.92, body);
    for (const sx of [-1, 1]) { mesh(CG.lamp, headM, sx * .62, .9, 1.9, body, false); mesh(CG.lamp, tailM, sx * .66, .92, -1.9, body, false); }
    const lights = [];
    if (police) {
      mesh(CG.door, gloss('#5b7cf0'), 0, .66, -.1, body);
      mesh(CG.bar, std('#3b3f5c', { roughness: .4 }), 0, 1.93, -.25, body, false);
      const r = mesh(CG.barL, offM, .34, 2.05, -.25, body, false), b = mesh(CG.barL, offM, -.34, 2.05, -.25, body, false);
      const gr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff4060', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), gb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#4070ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      track(gr.material); track(gb.material); gr.scale.setScalar(1.5); gb.scale.setScalar(1.5); gr.position.set(.36, 2.1, -.25); gb.position.set(-.36, 2.1, -.25); body.add(gr, gb); gr.visible = gb.visible = false;
      lights.push({ r, b, gr, gb });
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.5, .38)), basic('#ffffff', { map: policeTex, transparent: true })); p.position.set(sx * 1.035, .74, -.1); p.rotation.y = sx * Math.PI / 2; body.add(p); }
    }
    let driver = null;
    if (driverImg) { const sm = new THREE.SpriteMaterial({ map: loadTex(driverImg), transparent: true }); track(sm); driver = new THREE.Sprite(sm); driver.scale.set(1.0, 1.0, 1); driver.position.set(.38, 1.45, -.15); body.add(driver); }
    else if (!police) { driver = new THREE.Group(); mesh(CG.head, std(pick(SKIN)), 0, 0, 0, driver, false); const hair = mesh(CG.head, std(pick(['#3b2a24', '#735442', '#e2b766', '#c8613d', '#8f7ad9'])), 0, .08, -.04, driver, false); hair.scale.set(1.05, .8, 1.05); driver.position.set(.4, 1.42, -.1); body.add(driver); }
    const wheels = [];
    for (const [sx, sz] of [[1, 1.28], [-1, 1.28], [1, -1.28], [-1, -1.28]]) { const piv = new THREE.Group(); piv.position.set(sx * .98, .42, sz); const w = new THREE.Group(); mesh(CG.wheel, tyreM, 0, 0, 0, w); mesh(CG.hub, hubM, 0, 0, 0, w, false); piv.add(w); root.add(piv); wheels.push({ piv, w, front: sz > 0 }); }
    scene.add(root);
    return { root, body, wheels, lights, driverMesh: driver };
  }
  function addCar(x, z, h, color, kind, crewIdx = -1, icecream = false) {
    const ag = crewIdx >= 0 ? crew[crewIdx % crew.length] : null;
    const v = makeCar(color, kind === 'police', ag?.img || null, icecream);
    const car = { ...v, x, z, h, vx: 0, vz: 0, w: 0, steer: 0, thr: 0, hb: false, kind, color, police: kind === 'police', agent: ag, driver: kind === 'parked' ? null : kind, A: null, B: null, wp: [], wpi: 0, stun: 0, stuck: 0, rev: 0, mode: 'patrol', ramT: 0, honkT: 0, lastAcc: 0, siren: false, route: 0, y: 0, vy: 0, air: false, icecream };
    if (kind === 'police' && !ag?.img && v.driverMesh == null) {
      const g = new THREE.Group(); mesh(CG.head, std(ag?.color || '#8cc8ff'), 0, 0, 0, g, false); g.position.set(.4, 1.42, -.1); v.body.add(g); car.driverMesh = g;
    }
    cars.push(car); return car;
  }
  const NODE = (i, j) => ({ x: R[i], z: R[j] });
  const neighbors = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && a < NR && b >= 0 && b < NR);
  function setSegment(car, A, B) {
    car.A = A; car.B = B; const a = NODE(...A), b = NODE(...B), L = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / L, dz = (b.z - a.z) / L, ox = -dz * LANE, oz = dx * LANE;
    car.wp = [{ x: a.x + dx * 7 + ox, z: a.z + dz * 7 + oz }, { x: b.x - dx * 7.5 + ox, z: b.z - dz * 7.5 + oz }]; car.wpi = 0;
  }
  function nearestSeg(car) {
    let best = null, bd = 1e9;
    for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) { const n = NODE(i, j), d = Math.hypot(n.x - car.x, n.z - car.z); if (d < bd) { bd = d; best = [i, j]; } }
    const fx = Math.sin(car.h), fz = Math.cos(car.h);
    let nb = neighbors(...best).sort((p, q) => { const P = NODE(...p), Q = NODE(...q); return ((Q.x - car.x) * fx + (Q.z - car.z) * fz) / Math.hypot(Q.x - car.x, Q.z - car.z) - ((P.x - car.x) * fx + (P.z - car.z) * fz) / Math.hypot(P.x - car.x, P.z - car.z); })[0];
    setSegment(car, best, nb); car.wpi = 1;
  }
  // traffic, parked cars and the police cruisers
  { let n = 0;
    const traffic = (i, j, k, l, icecream = false) => { const a = NODE(i, j), b = NODE(k, l), c = addCar(lerp(a.x, b.x, .5), lerp(a.z, b.z, .5), Math.atan2(b.x - a.x, b.z - a.z), icecream ? '#fff3f8' : CAR_COLS[n++ % CAR_COLS.length], 'traffic', -1, icecream); setSegment(c, [i, j], [k, l]); c.wpi = 1; const L = Math.hypot(b.x - a.x, b.z - a.z); c.x += (-(b.z - a.z) / L) * LANE; c.z += ((b.x - a.x) / L) * LANE; return c; };
    const used = new Set();
    for (let t = 0; t < 30; t++) { let i, j, k, l, key, tries = 0; do { i = Math.floor(rng() * NR); j = Math.floor(rng() * NR); [k, l] = rpick(neighbors(i, j)); key = `${Math.min(i, k)},${Math.min(j, l)},${i === k ? 'z' : 'x'},${i * 100 + j}`; } while (used.has(key) && ++tries < 20); used.add(key); traffic(i, j, k, l); }
    traffic(6, 3, 6, 4, true).speedT = 6; traffic(2, 1, 3, 1, true).speedT = 6; traffic(7, 5, 7, 6, true).speedT = 6;
    parkedSpots.push([175, 120, 0], [175, -118, Math.PI]);
    parkedSpots.forEach(([x, z, h], k) => addCar(x, z, h, CAR_COLS[(k + 3) % CAR_COLS.length], 'parked'));
    for (let k = 0; k < 3; k++) { const c = addCar(-3.4, 14 + k * 6, 0, '#ffffff', 'police', k + 1); c.home = { x: -3.4, z: 14 + k * 6 }; nearestSeg(c); }
    for (const [x, z, h] of [[-80 + 2.5, -120, Math.PI], [120 - 2.5, 100, 0], [40 + 2.5, 140, Math.PI]]) { const c = addCar(x, z, h, '#ffffff', 'police', cars.length); nearestSeg(c); }
  }


  // ---------------------------------------------------------------- characters
  const people = [];
  const PG = { body: geo(new THREE.CapsuleGeometry(.3, .45, 6, 12)), head: geo(new THREE.SphereGeometry(.32, 16, 12)), limb: geo(new THREE.CapsuleGeometry(.09, .32, 4, 8).translate(0, -.2, 0)), eye: geo(new THREE.SphereGeometry(.045, 8, 6)), blob: geo(new THREE.SphereGeometry(.55, 20, 14)) };
  const eyeM = std('#2a1c2e', { roughness: .3 }), blushM = std('#ff9fb4', { roughness: .8 });
  const HAIR = ['#3b2a24', '#735442', '#e2b766', '#c8613d', '#f2a3b8', '#8f7ad9', '#ffffff', '#9fd8ff'], PANTS = ['#5b6488', '#7a5c9e', '#4b7a78', '#3b2f5c', '#9fb4ff', '#ffb38a'];
  const CIVC = ['#ff9ec0', '#8cc8ff', '#ffd36e', '#7fd6c2', '#c9a6ff', '#ffb38a', '#b8e07a', '#ff8f8f', '#9fe3f0', '#ffffff', '#ffe58a', '#f5a9d4'];
  const hatG = { cap: geo(new THREE.SphereGeometry(.34, 14, 8, 0, TAU, 0, Math.PI / 2)), brim: geo(new THREE.CylinderGeometry(.2, .2, .03, 14, 1, false, -Math.PI / 2, Math.PI)), sun: geo(new THREE.CylinderGeometry(.62, .62, .04, 20)), bun: geo(new THREE.SphereGeometry(.15, 10, 8)), band: geo(new THREE.TorusGeometry(.31, .05, 6, 18)), shades: geo(new RoundedBoxGeometry(.44, .1, .06, 2, .03)) };
  function makeCiv(seed, opt = {}) {
    const R3 = (k) => { const x = Math.sin(seed * 9301 + k * 49297) * 233280; return x - Math.floor(x); };
    const root = new THREE.Group(), shirt = opt.shirt || CIVC[Math.floor(R3(1) * CIVC.length)], skin = SKIN[Math.floor(R3(2) * SKIN.length)], hairC = HAIR[Math.floor(R3(3) * HAIR.length)];
    const legs = [], arms = [];
    const bodyM = mesh(PG.body, std(shirt, { roughness: .8 }), 0, .82, 0, root); if (R3(7) < .3) bodyM.scale.set(1.12, 1, 1.1);
    const hd = new THREE.Group(); hd.position.y = 1.4; root.add(hd);
    mesh(PG.head, std(skin, { roughness: .6 }), 0, 0, 0, hd);
    const hair = mesh(PG.head, std(hairC, { roughness: .7 }), 0, .08, -.05, hd, false); hair.scale.set(1.06, .82, 1.04);
    for (const sx of [-1, 1]) { mesh(PG.eye, eyeM, sx * .11, .02, .29, hd, false); const bl = mesh(PG.eye, blushM, sx * .19, -.06, .26, hd, false); bl.scale.set(1.3, .7, .5); }
    const hat = opt.hat || ['none', 'none', 'cap', 'bun', 'sun', 'none', 'cap', 'band'][Math.floor(R3(4) * 8)];
    if (hat === 'cap') { const hc = std(CIVC[Math.floor(R3(5) * CIVC.length)]); mesh(hatG.cap, hc, 0, .1, -.02, hd, false); const b = mesh(hatG.brim, hc, 0, .12, .2, hd, false); b.scale.set(1, 1, 1.4); }
    else if (hat === 'bun') mesh(hatG.bun, std(hairC), 0, .32, -.12, hd, false);
    else if (hat === 'sun') { mesh(hatG.sun, std('#ffe8a8'), 0, .22, 0, hd, false); mesh(hatG.cap, std('#ffe8a8'), 0, .16, 0, hd, false).scale.setScalar(.9); }
    else if (hat === 'band') { const b = mesh(hatG.band, std('#ff6b81'), 0, .1, 0, hd, false); b.rotation.x = Math.PI / 2; }
    if (opt.shades || R3(6) < .12) mesh(hatG.shades, std('#3b2f5c', { roughness: .2 }), 0, .03, .3, hd, false);
    const pants = std(PANTS[Math.floor(R3(8) * PANTS.length)]), sleeve = std(shirt);
    for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * .13, .5, 0); mesh(PG.limb, pants, 0, 0, 0, p, false); root.add(p); legs.push(p); const a = new THREE.Group(); a.position.set(sx * .36, 1.05, 0); a.rotation.z = sx * .25; mesh(PG.limb, sleeve, 0, 0, 0, a, false); root.add(a); arms.push(a); }
    if (opt.cone) { const c = new THREE.Group(); mesh(CG.cone, std('#e9b97f'), 0, -.05, 0, c, false).scale.setScalar(.3); mesh(CG.scoop, gloss(pick(['#ff9ec0', '#fff3d6', '#b8e07a'])), 0, .12, 0, c, false).scale.setScalar(.3); c.position.set(0, -.42, .08); arms[1].add(c); }
    const u = { H: 1.75, walk: 0, walkPhase: 0, legs, arms, hd,
      update() { const s = Math.sin(u.walkPhase) * .7 * Math.min(1, u.walk); legs[0].rotation.x = s; legs[1].rotation.x = -s; arms[0].rotation.x = -s * .8; arms[1].rotation.x = s * .8; arms[0].rotation.z = -.25; arms[1].rotation.z = .25; hd.position.y = 1.4 + Math.abs(Math.cos(u.walkPhase)) * .04 * u.walk; hd.rotation.set(0, 0, 0); },
      pose(kind, t) {
        if (kind === 'sit') { legs[0].rotation.x = legs[1].rotation.x = -1.45; arms[0].rotation.x = arms[1].rotation.x = -.5; return -.08; }
        if (kind === 'dance') { const b = t * 8; legs[0].rotation.x = Math.sin(b) * .5; legs[1].rotation.x = -Math.sin(b) * .5; arms[0].rotation.z = -2.4 + Math.sin(b) * .5; arms[1].rotation.z = 2.4 + Math.sin(b + 1) * .5; arms[0].rotation.x = arms[1].rotation.x = 0; hd.rotation.z = Math.sin(b * .5) * .2; return Math.abs(Math.sin(b)) * .14; }
        if (kind === 'chat') { const g = Math.max(0, Math.sin(t * 1.3)); arms[1].rotation.x = -g * 1.1 - Math.sin(t * 7) * .15 * g; hd.rotation.z = Math.sin(t * 2) * .1; hd.rotation.x = Math.sin(t * 3.1) * .06; return 0; }
        if (kind === 'vendor') { arms[1].rotation.z = 2.6 + Math.sin(t * 6) * .35; return 0; }
        if (kind === 'wave') { arms[1].rotation.z = 2.6 + Math.sin(t * 12) * .4; return 0; }
        if (kind === 'bus') { if (Math.sin(t * .5) > .8) { arms[0].rotation.x = -1.4; hd.rotation.x = .3; } hd.rotation.y = Math.sin(t * .4) * .5; return 0; }
        if (kind === 'cheer') { arms[0].rotation.z = -2.8; arms[1].rotation.z = 2.8; return Math.abs(Math.sin(t * 9)) * .3; }
        return 0;
      } };
    root.scale.setScalar(opt.scale || 1);
    return { root, u };
  }
  function makeBlob(color) {
    const root = new THREE.Group(); const b = mesh(PG.blob, gloss(color), 0, .55, 0, root); b.scale.set(1, .95, 1);
    for (const sx of [-1, 1]) { const e = mesh(PG.eye, eyeM, sx * .18, .68, .5, root, false); e.scale.setScalar(2.2); }
    const u = { H: 1.15, walk: 0, walkPhase: 0, update(t) { b.position.y = .55 + Math.abs(Math.sin(u.walkPhase)) * .12 * u.walk; b.scale.y = .95 + Math.sin(t * 3) * .02; } };
    return { root, u };
  }
  // the police cap: navy crown, flat top, black visor, gold badge; plus a gold star on the chest
  const capM = std('#34407a', { roughness: .55 }), visorM = std('#1f2238', { roughness: .3 }), goldM = std('#ffcf4a', { metalness: .6, roughness: .25, emissive: '#7a5200', emissiveIntensity: .3 });
  const capG = { crown: geo(new THREE.CylinderGeometry(.24, .21, .17, 20)), top: geo(new THREE.CylinderGeometry(.29, .27, .08, 20)), visor: geo(new THREE.CylinderGeometry(.24, .24, .03, 20, 1, false, -Math.PI / 2, Math.PI)), badge: geo(new THREE.CylinderGeometry(.06, .06, .03, 5).rotateX(Math.PI / 2)), band: geo(new THREE.CylinderGeometry(.245, .245, .05, 20)) };
  function capOn(parent, y, s, zf) {
    const g = new THREE.Group(); g.position.set(0, y, 0); g.scale.setScalar(s); g.rotation.x = -.12;
    mesh(capG.crown, capM, 0, .08, 0, g); mesh(capG.top, capM, 0, .19, 0, g); mesh(capG.band, std('#1f2238'), 0, .02, 0, g); const v = mesh(capG.visor, visorM, 0, .0, .1, g); v.scale.set(1, 1, .9); mesh(capG.badge, goldM, 0, .1, .23, g, false);
    parent.add(g);
    const st = mesh(capG.badge, goldM, -.0, 0, 0, parent, false); st.scale.setScalar(1.6 * s); st.position.set(.12 * s * 2, y * .5, zf);
    return g;
  }
  function addPerson(kind, ent) {
    const p = { kind, x: 0, z: 0, y: 0, vy: 0, h: 0, vx: 0, vz: 0, hp: 100, max: 100, state: 'idle', koT: 0, flash: 0, sayT: 0, speed: 0, ...ent };
    people.push(p); return p;
  }
  let modulesP = null;
  const person = addPerson('player', { x: 6.6, z: 4, h: Math.PI / 2, max: 100 });
  const cops = [], civs = [];
  // civilians: walkers, joggers, chatting pairs, bench sitters, beach dancers, bus riders and street vendors
  { const plan = [], sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
    sh(benches.slice()).slice(0, 14).forEach((b) => plan.push({ act: 'sit', anchor: { x: b.x, z: b.z, h: b.h } }));
    for (const st of stops) { const n = 1 + Math.floor(rng() * 2); for (let k = 0; k < n; k++) { const q = local(st.x, st.z, st.ry, -1.2 + k * 1.3 + rnd(-.2, .2), .35); plan.push({ act: 'bus', anchor: { x: q.x, z: q.z, h: st.ry } }); } }
    for (const bb of boomboxes) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rnd(-.2, .2), r = 2.4 + rnd(0, 1.4), x = bb.x + Math.sin(a) * r, z = bb.z + Math.cos(a) * r; plan.push({ act: 'dance', anchor: { x, z, h: Math.atan2(bb.x - x, bb.z - z) }, opt: { shades: rng() < .5, hat: rng() < .4 ? 'sun' : undefined } }); }
    for (const c of carts) plan.push({ act: 'vendor', anchor: { x: c.x, z: c.z, h: c.h }, opt: { shirt: '#ffffff', hat: 'cap' } });
    for (let k = 0; k < 8; k++) { const i = Math.floor(rng() * 8), j = Math.floor(rng() * 8); if (special.has(`${i},${j}`)) { k--; continue; } const cx = R[i] + 20, cz = R[j] + 20, sd = rng() < .5 ? -1 : 1, along = rnd(-9, 9); const ax = rng() < .5; const x = ax ? cx + along : cx + sd * 13.6, z = ax ? cz + sd * 13.6 : cz + along;
      for (const o of [-1, 1]) plan.push({ act: 'chat', anchor: ax ? { x: x + o * .6, z, h: -o * Math.PI / 2 } : { x, z: z + o * .6, h: o > 0 ? Math.PI : 0 }, opt: { cone: rng() < .3 } }); }
    for (let k = 0; k < 9; k++) plan.push({ act: 'jog', opt: { hat: 'band', shirt: pick(['#ff8f8f', '#7fd6c2', '#8cc8ff', '#ffd36e']) } });
    while (plan.length < 90) plan.push({ act: 'walk', opt: { cone: rng() < .12, scale: rng() < .15 ? .72 : undefined } });
    plan.forEach((pl, i) => { const v = makeCiv(i + 1, pl.opt || {}); scene.add(v.root); const c = addPerson('civ', { ...v, max: 60, hp: 60, seed: i, act: pl.act, anchor: pl.anchor || null, sc: pl.opt?.scale || 1, pose: null, waveT: 0, fleeFrom: null }); civRespawn(c, true); civs.push(c); }); }
  crew.forEach((ag, i) => { const c = addPerson('cop', { agent: ag, max: 100, hp: 100, role: i % 2 ? 'shoot' : 'bust', shootT: rnd(.5, 2), route: null, routeT: 0 }); copHome(c, i); cops.push(c); });
  function civRespawn(c, first = false) {
    if (c.anchor) Object.assign(c, { x: c.anchor.x + (first ? 0 : rnd(-6, 6)), z: c.anchor.z + (first ? 0 : rnd(-6, 6)), h: c.anchor.h });
    else {
      let i = Math.floor(Math.random() * 8), j = Math.floor(Math.random() * 8);
      // most respawns land near the player so the streets around you stay lively
      if (!first && Math.random() < .65) { const p = player.car || person; i = clampI(Math.floor((p.x + 160) / 40) + Math.round(rnd(-2, 2))); j = clampI(Math.floor((p.z + 160) / 40) + Math.round(rnd(-2, 2))); }
      c.block = [R[i] + 20, R[j] + 20]; c.corner = Math.floor(Math.random() * 4); c.dir = Math.random() < .5 ? 1 : 3;
      const cs = civCorners(c), a = cs[c.corner], b = cs[(c.corner + c.dir) % 4], t = first ? Math.random() : 0; c.x = lerp(a.x, b.x, t); c.z = lerp(a.z, b.z, t); c.corner = (c.corner + c.dir) % 4;
    }
    Object.assign(c, { hp: c.max, state: 'walk', y: 0, vy: 0, flee: 0, pose: null }); c.root.visible = true; c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(c.sc || 1);
  }
  function civCorners(c) { const [cx, cz] = c.block, o = 13.4; return [{ x: cx - o, z: cz - o }, { x: cx + o, z: cz - o }, { x: cx + o, z: cz + o }, { x: cx - o, z: cz + o }]; }
  function copHome(c, i = cops.indexOf(c)) { Object.assign(c, { x: STATION.door.x - rnd(0, 1.5), z: STATION.door.z + (i - 2) * 1.6, hp: c.max, state: 'patrol', y: 0, vy: 0, h: Math.PI / 2, patrolT: rnd(3, 8), goal: null }); if (c.root) { c.root.visible = true; c.root.rotation.set(0, 0, 0); } }
  // the player's toy guns: chunky rounded shapes in candy colours
  function makeGun(wp) {
    const g = new THREE.Group();
    if (wp.id === 'pistol') { mesh(geo(new RoundedBoxGeometry(.14, .17, .44, 2, .05)), gloss(wp.col), 0, 0, .08, g); mesh(geo(new THREE.CylinderGeometry(.06, .06, .18, 12).rotateX(Math.PI / 2)), gloss(wp.col2), 0, .02, .36, g); mesh(geo(new RoundedBoxGeometry(.12, .24, .13, 2, .04)), gloss('#b48cff'), 0, -.15, -.04, g).rotation.x = -.25; mesh(geo(new RoundedBoxGeometry(.06, .06, .1, 1, .02)), gloss('#ffd36e'), 0, .11, .2, g); }
    else { mesh(geo(new RoundedBoxGeometry(.16, .2, .66, 2, .06)), gloss(wp.col), 0, 0, .1, g); mesh(geo(new THREE.CylinderGeometry(.065, .065, .22, 12).rotateX(Math.PI / 2)), gloss('#ff8fb8'), 0, .02, .5, g); mesh(geo(new RoundedBoxGeometry(.1, .3, .12, 2, .04)), gloss(wp.col2), 0, -.22, .12, g).rotation.x = .2; mesh(geo(new RoundedBoxGeometry(.11, .18, .12, 2, .04)), gloss('#ffd36e'), 0, -.14, -.12, g).rotation.x = -.3; mesh(geo(new RoundedBoxGeometry(.08, .14, .26, 2, .04)), gloss('#ffd36e'), 0, 0, -.32, g); }
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, .02, wp.id === 'pistol' ? .47 : .63); g.add(muzzle); g.userData.muzzle = muzzle;
    return g;
  }
  const guns = WEAPONS.map(makeGun);
  const ammo = WEAPONS.map((w) => w.mag);
  let wIdx = 0, reloadT = 0, fireCd = 0, triggerHeld = false, firedThisPress = false;

  async function loadModels() {
    let A = null, P = null;
    try { [A, P] = await Promise.all([import('../agents3d.js').catch(() => null), import('../person3d.js').catch(() => null)]); } catch {}
    if (closed) return;
    // the player
    let pv = null;
    try { if (P?.buildPerson) { const root = P.buildPerson(me.look || P.DEFAULT_LOOK); pv = { root, u: root.userData.creature }; } } catch (e) { console.warn('getaway: person fallback', e); }
    if (!pv) pv = makeBlob(hexOk(me.color) ? me.color : '#9b7cf0');
    pv.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    person.root = pv.root; person.u = pv.u; scene.add(pv.root);
    guns.forEach((g, i) => { g.position.set(-.3, .78, .32); g.visible = i === wIdx; pv.root.add(g); });
    // the cops: the real agent creatures in caps
    for (const c of cops) {
      let v = null;
      try { if (A?.buildCreature) { const genes = c.agent.genes || A.makeGenes(hashStr(c.agent.name) % 100000); const root = A.buildCreature(genes, { evo: 1 }); v = { root, u: root.userData.creature }; } } catch (e) { console.warn('getaway: creature fallback', e); }
      if (!v) v = makeBlob(c.agent.color);
      const holder = new THREE.Group(); holder.add(v.root);
      v.root.updateMatrixWorld(true);
      // size by the creature's own height (its halo and beam would skew a bounding box), body mesh for the front
      const body = v.root.getObjectByProperty('isMesh', true), bb = new THREE.Box3().setFromObject(body || v.root), hgt = v.u?.H || Math.max(.3, bb.max.y - bb.min.y), s = 1.3 / hgt;
      v.root.scale.multiplyScalar(s);
      // the top of the solid parts (body + species hat), so the police cap sits on top of everything
      const solidBox = new THREE.Box3(); v.root.updateMatrixWorld(true); v.root.traverse((o) => { if (o.isMesh && o.visible && !o.material.transparent && !o.material.isMeshBasicMaterial) solidBox.expandByObject(o); });
      const top = solidBox.isEmpty() ? hgt * s : Math.min(solidBox.max.y, hgt * s * 1.35), front = Math.min(bb.max.z, hgt * .6) * s;
      capOn(holder, top - .06, 1.3, front + .02);
      v.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(`${c.agent.name} · police`, c.agent.color), transparent: true, depthWrite: false })); track(tag.material); tag.scale.set(2.6, .57, 1); tag.position.y = top + .7; holder.add(tag);
      const gun = makeGun(WEAPONS[0]); gun.scale.setScalar(.9); gun.position.set(-.38, top * .45, .3); holder.add(gun);
      scene.add(holder); c.root = holder; c.u = v.u; c.top = top; c.gun = gun; c.tag = tag;
    }
    ready = true; if (tst) tst.ready = true;
  }
  let ready = false;

  // ---------------------------------------------------------------- particles, tracers, flashes
  const tracers = [], bursts = [], puffs = [], flashes = [], skids = [];
  { const tg = geo(new THREE.BoxGeometry(1, 1, 1));
    for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(tg, basic('#fff2a0', { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); tracers.push({ m, life: 0 }); }
    for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 3 ? starTex : coinTex, transparent: true, depthWrite: false, fog: false, toneMapped: false })); track(s.material); s.visible = false; scene.add(s); bursts.push({ s, life: 0, v: new THREE.Vector3() }); }
    const pg = geo(new THREE.SphereGeometry(1, 14, 10));
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(pg, std('#ffffff', { transparent: true, roughness: 1, emissive: '#ffffff', emissiveIntensity: .4 })); m.material = m.material.clone(); track(m.material); m.visible = false; scene.add(m); puffs.push({ m, life: 0, max: 1, v: new THREE.Vector3(), s0: 1 }); }
    for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); track(s.material); s.visible = false; scene.add(s); flashes.push({ s, life: 0 }); } }
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  function tracer(a, b, color = '#fff2a0') {
    const t = tracers.find((q) => q.life <= 0) || tracers[0]; t.life = .09; t.m.visible = true; t.m.material.color.set(color);
    const len = a.distanceTo(b); t.m.position.copy(a).add(b).multiplyScalar(.5); t.m.scale.set(.07, .07, len); t.m.lookAt(b);
  }
  function flash(p, s = 1) { const f = flashes.find((q) => q.life <= 0) || flashes[0]; f.life = .06; f.s.visible = true; f.s.position.copy(p); f.s.scale.setScalar(.9 * s); f.s.material.rotation = Math.random() * TAU; }
  function puff(x, y, z, n = 6, size = .6, color = '#ffffff', spread = 1.5) {
    for (let i = 0; i < n; i++) { const p = puffs.find((q) => q.life <= 0); if (!p) return; p.life = p.max = rnd(.45, .8); p.m.visible = true; p.m.position.set(x + rnd(-.3, .3), y + rnd(-.2, .3), z + rnd(-.3, .3)); p.v.set(rnd(-1, 1) * spread, rnd(.4, 1.6), rnd(-1, 1) * spread); p.s0 = size * rnd(.7, 1.3); p.m.material.color.set(color); p.m.material.emissive.set(color); }
  }
  function burst(x, y, z, n = 18) {
    for (let i = 0; i < n; i++) { const b = bursts.find((q) => q.life <= 0); if (!b) return; b.life = rnd(.8, 1.3); b.s.visible = true; b.s.position.set(x, y, z); const a = rnd(0, TAU), sp = rnd(3, 7); b.v.set(Math.cos(a) * sp, rnd(4, 9), Math.sin(a) * sp); b.s.scale.setScalar(rnd(.35, .6)); }
    puff(x, y, z, 8, .6, '#ffffff', 2);
  }

  // ---------------------------------------------------------------- audio
  let ac = null, master = null, nbuf = null, muted = false, sirenNode = null, engineNode = null;
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
    pistol() { noise(.14, { vol: .5, f: 2600, slide: -2000 }); tone(170, .14, { type: 'triangle', vol: .4, slide: -100 }); tone(1200, .05, { type: 'square', vol: .05, slide: 600 }); },
    smg() { noise(.07, { vol: .35, f: 3200, slide: -2200 }); tone(220, .07, { type: 'triangle', vol: .25, slide: -120 }); },
    copShot() { noise(.1, { vol: .22, f: 1800, slide: -1200 }); tone(320, .08, { type: 'square', vol: .05, slide: -200 }); },
    hit() { tone(1500, .05, { type: 'square', vol: .1 }); tone(2100, .06, { vol: .12, delay: .03 }); },
    ko() { noise(.4, { vol: .35, f: 3500, type: 'bandpass', slide: -3000, q: 2 }); [880, 1175, 1568, 2093].forEach((f, i) => tone(f, .2, { type: 'triangle', vol: .14, delay: .1 + i * .07 })); },
    punch() { tone(130, .16, { vol: .55, slide: -70 }); noise(.08, { vol: .35, f: 900 }); },
    whiff() { noise(.12, { vol: .12, f: 1500, type: 'bandpass', slide: 1500 }); },
    hurt() { tone(360, .18, { type: 'sawtooth', vol: .12, slide: -180 }); },
    reload() { tone(700, .04, { type: 'square', vol: .1 }); tone(1000, .05, { type: 'square', vol: .1, delay: .3 }); },
    empty() { tone(1800, .03, { type: 'square', vol: .06 }); },
    crash() { noise(.45, { vol: .55, f: 900, slide: -700 }); tone(80, .35, { type: 'triangle', vol: .45, slide: -30 }); },
    door() { tone(240, .06, { type: 'square', vol: .08 }); tone(180, .08, { type: 'square', vol: .08, delay: .08 }); },
    star() { tone(660, .1, { type: 'triangle', vol: .2 }); tone(990, .16, { type: 'triangle', vol: .2, delay: .08 }); },
    lost() { [990, 880, 660].forEach((f, i) => tone(f, .16, { type: 'triangle', vol: .16, delay: i * .1 })); },
    busted() { [523, 392, 330, 262].forEach((f, i) => tone(f, .28, { type: 'square', vol: .1, delay: i * .16 })); },
    swap() { tone(500, .05, { type: 'triangle', vol: .12 }); tone(750, .06, { type: 'triangle', vol: .12, delay: .05 }); },
    honk() { tone(370, .25, { type: 'square', vol: .07 }); tone(466, .25, { type: 'square', vol: .06 }); },
    jump() { tone(420, .14, { type: 'triangle', vol: .12, slide: 300 }); },
    coin() { tone(988, .06, { type: 'square', vol: .06 }); tone(1319, .12, { type: 'square', vol: .06, delay: .06 }); },
    nitro() { noise(.6, { vol: .25, f: 600, slide: 2400, type: 'bandpass', q: 1.5 }); tone(140, .5, { type: 'sawtooth', vol: .06, slide: 220 }); },
    whoosh() { noise(.5, { vol: .3, f: 400, slide: 1800, type: 'bandpass', q: 2 }); tone(300, .4, { type: 'triangle', vol: .12, slide: 500 }); },
    land() { tone(90, .3, { type: 'triangle', vol: .45, slide: -40 }); noise(.25, { vol: .35, f: 700, slide: -500 }); [784, 988, 1175, 1568].forEach((f, i) => tone(f, .14, { type: 'square', vol: .06, delay: .12 + i * .07 })); },
    pop() { tone(660, .08, { type: 'sine', vol: .18, slide: 400 }); },
    jingleHonk() { [784, 988, 1175].forEach((f, i) => tone(f, .1, { type: 'triangle', vol: .12, delay: i * .08 })); },
    loot() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .16, { type: 'triangle', vol: .14, delay: i * .06 })); noise(.3, { vol: .15, f: 3000, type: 'highpass' }); },
    rush() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, .18, { type: 'square', vol: .07, delay: i * .1 })); },
    cp() { tone(880, .08, { type: 'square', vol: .08 }); tone(1320, .14, { type: 'square', vol: .08, delay: .07 }); },
    go() { tone(1047, .4, { type: 'square', vol: .1 }); },
    beep() { tone(523, .18, { type: 'square', vol: .08 }); },
  };
  function loops() {
    const a = audio(); if (!a || sirenNode) return;
    const mk = (type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type; g.gain.value = 0; o.connect(g).connect(master); o.start(); return { o, g }; };
    sirenNode = mk('triangle'); engineNode = mk('sawtooth'); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; engineNode.o.disconnect(); engineNode.o.connect(lp).connect(engineNode.g);
  }
  function loopsSet(siren, sv, eng, ev) {
    if (!ac || !sirenNode) return; const t = ac.currentTime;
    sirenNode.g.gain.setTargetAtTime(muted || paused ? 0 : sv * .07, t, .1); sirenNode.o.frequency.setTargetAtTime(siren ? (Math.floor(T * 1.6) % 2 ? 960 : 720) : 700, t, .03);
    engineNode.g.gain.setTargetAtTime(muted || paused || !eng ? 0 : .05 + ev * .05, t, .1); engineNode.o.frequency.setTargetAtTime(55 + ev * 110, t, .08);
  }
  const paintMute = () => { muteBtn.innerHTML = muted ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="#3b2f5c"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="#3b2f5c" stroke-width="2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20" fill="#3b2f5c"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="#3b2f5c" stroke-width="2" stroke-linecap="round"/></svg>'; };
  paintMute();

  // ---------------------------------------------------------------- game state
  let nitro = 1, radio = 0, T = 0, heat = 0, stars = 0, unseenT = 0, seen = false, koCount = 0, civKo = 0, maxT = 0, wantedT = 0, bustT = 0, hurtT = 0, shake = 0, state = 'help', cardT = 0, assignT = 0;
  let locked = false, unlockAt = 0, camYaw = Math.PI / 2, camPitch = .22, camDist = 5, dragT = 9, aimHold = 0, aimYaw = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let best = { score: 0, ko: 0, max: 0 }; try { best = { ...best, ...JSON.parse(localStorage.getItem('aa.getaway.best') || '{}') }; } catch {}
  const runScore = () => koCount * 100 + civKo * 10 + Math.floor(maxT) * 5 + Math.floor(wantedT) + stunts * 15;
  function saveBest() { const s = runScore(); if (s > (best.score || 0)) { best = { score: s, ko: koCount, max: Math.floor(maxT) }; try { localStorage.setItem('aa.getaway.best', JSON.stringify(best)); } catch {} return true; } return false; }

  let toastTimer = 0;
  function toast(html, ms = 1800) { toastEl.innerHTML = html; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms); }
  function feed(html) { const d = document.createElement('div'); d.innerHTML = html; feedEl.prepend(d); while (feedEl.children.length > 4) feedEl.lastChild.remove(); setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 450); }, 4200); }
  function setStars(n, why) {
    n = clamp(n, 0, 5); if (n === stars) return; const up = n > stars; stars = n;
    starEls.forEach((s, i) => { s.classList.toggle('on', i < stars); if (up && i === stars - 1) { s.classList.remove('pop'); void s.getBoundingClientRect(); s.classList.add('pop'); } });
    if (up) { sfx.star(); if (why) toast(`<span style="color:#ff6b81">+${'★'.repeat(1)}</span> ${esc(why)}`); }
  }
  function crime(amount, why) { heat = Math.min(40, heat + amount); unseenT = 0; let n = 0; HEAT.forEach((h) => { if (heat >= h) n++; }); if (n > stars) setStars(n, why); }

  // ---------------------------------------------------------------- collisions
  function pushOut(o, r) {
    let hitN = null; const ck = Math.floor(o.x / GRID) * 1000 + Math.floor(o.z / GRID);
    for (const b of cellsB.get(ck) || NONE) {
      if (o.x < b.x0 - r || o.x > b.x1 + r || o.z < b.z0 - r || o.z > b.z1 + r) continue;
      const qx = clamp(o.x, b.x0, b.x1), qz = clamp(o.z, b.z0, b.z1); let dx = o.x - qx, dz = o.z - qz, d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d < 1e-5) { const pen = [o.x - b.x0, b.x1 - o.x, o.z - b.z0, b.z1 - o.z], m = Math.min(...pen), k = pen.indexOf(m); dx = [-1, 1, 0, 0][k]; dz = [0, 0, -1, 1][k]; o.x += dx * (m + r); o.z += dz * (m + r); }
      else { dx /= d; dz /= d; o.x += dx * (r - d); o.z += dz * (r - d); }
      hitN = { x: dx, z: dz };
    }
    for (const p of cellsP.get(ck) || NONE) { const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz), rr = r + p.r; if (d < rr && d > 1e-5) { o.x += (dx / d) * (rr - d); o.z += (dz / d) * (rr - d); hitN = { x: dx / d, z: dz / d }; } }
    return hitN;
  }
  function clampWorld(o, r, px) {
    let hit = null; const lim = WALL - .8 - r, east = SHORE - .6 - r;
    if (o.x > east) {
      // past the waterline only the pier holds you up
      if (px > east + .01 || Math.abs(o.z) < PIER.z - r) {
        if (Math.abs(o.z) > PIER.z - r) { const sg = Math.sign(o.z); o.z = sg * (PIER.z - r); hit = { x: 0, z: -sg }; }
        if (o.x > PIER.x1 + 3 - r) { o.x = PIER.x1 + 3 - r; hit = { x: -1, z: 0 }; }
        return hit;
      }
      o.x = east; hit = { x: -1, z: 0 };
    }
    if (o.x < -lim) { o.x = -lim; hit = { x: 1, z: 0 }; }
    if (o.z > lim) { o.z = lim; hit = { x: 0, z: -1 }; } if (o.z < -lim) { o.z = -lim; hit = { x: 0, z: 1 }; }
    return hit;
  }
  // 2D segment vs buildings: the first hit distance (or Infinity)
  function rayBoxes(ax, az, dx, dz, maxT) {
    let best = maxT; const ex = ax + dx * maxT, ez = az + dz * maxT, mnx = Math.min(ax, ex), mxx = Math.max(ax, ex), mnz = Math.min(az, ez), mxz = Math.max(az, ez);
    for (const b of boxes) {
      if (b.x1 < mnx || b.x0 > mxx || b.z1 < mnz || b.z0 > mxz) continue;
      let t0 = 0, t1 = best;
      for (const [o, d, lo, hi] of [[ax, dx, b.x0, b.x1], [az, dz, b.z0, b.z1]]) { if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { t0 = 1; t1 = 0; break; } continue; } let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) break; }
      if (t0 <= t1 && t0 < best) best = t0;
    }
    return best;
  }
  const los = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); return L < .01 || rayBoxes(a.x, a.z, dx / L, dz / L, L) >= L - .01; };

  // ---------------------------------------------------------------- car physics
  function carStep(c, dt) {
    let crash = 0;
    const bump = (nfx, nfz, px) => { for (const k of [1.05, -1.05]) {
      const o = { x: c.x + nfx * k, z: c.z + nfz * k }, n = pushOut(o, 1.08) || clampWorld(o, 1.08, px + nfx * k);
      if (n) { c.x = o.x - nfx * k; c.z = o.z - nfz * k; const vn = c.vx * n.x + c.vz * n.z; if (vn < 0) { c.vx -= n.x * vn * 1.45; c.vz -= n.z * vn * 1.45; crash = Math.max(crash, -vn); } } } };
    if (c.air) {
      // airborne off a ramp: ballistic, no grip, a little lazy spin
      const px = c.x; c.vy -= 21 * dt; c.y += c.vy * dt; c.x += c.vx * dt; c.z += c.vz * dt; c.h += c.w * dt * .4; c.airT += dt;
      bump(Math.sin(c.h), Math.cos(c.h), px);
      const ra = rampAt(c.x, c.z), g = ra ? ra.h : 0;
      if (c.y <= g) { c.y = g; c.air = false; c.vy = 0; c.vx *= .9; c.vz *= .9; if (c === player.car) stuntLand(c); else puff(c.x, .3, c.z, 4, .5); }
      c.speed = Math.hypot(c.vx, c.vz); c.vf = c.vx * Math.sin(c.h) + c.vz * Math.cos(c.h); c.vl = 0; c.acc = 0;
      return crash;
    }
    const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx;
    let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz; const v0 = vf;
    const thr = c.stun > 0 ? 0 : c.thr, boost = c.nitroOn && thr > 0, MAX = (c.police ? 27 : c.icecream ? 19 : 24) + (boost ? 13 : 0);
    if (thr > 0) vf += thr * (vf < 0 ? 30 : 15 * (1 - clamp(vf / MAX, 0, 1) * .7)) * dt;
    else if (thr < 0) vf += thr * (vf > .5 ? 32 : 10) * dt;
    if (boost) vf += 26 * dt;
    if (vf < -9) vf = -9; if (vf > MAX) vf = lerp(vf, MAX, Math.min(1, dt * 3));
    vf *= 1 - (thr === 0 ? 1.1 : .25) * dt; if (thr === 0 && Math.abs(vf) < .3) vf = 0;
    const grip = c.hb ? 1.4 : 8.5; vl *= Math.exp(-grip * dt);
    if (c.hb) vf *= 1 - .9 * dt;
    c.steer = lerp(c.steer, c.stun > 0 ? 0 : c.steerIn || 0, Math.min(1, dt * 7));
    const sp = Math.abs(vf), yaw = c.steer * 2.3 * clamp(vf / 5, -1, 1) * (1 - .4 * clamp(sp / MAX, 0, 1)) * (c.hb ? 1.5 : 1);
    c.w = lerp(c.w, yaw, Math.min(1, dt * 10)); c.h += c.w * dt;
    const nfx = Math.sin(c.h), nfz = Math.cos(c.h);
    c.vx = nfx * vf + -nfz * vl; c.vz = nfz * vf + nfx * vl;
    const px = c.x; c.x += c.vx * dt; c.z += c.vz * dt;
    // two circles along the body against the buildings and the edge of the world
    bump(nfx, nfz, px);
    // ramps: ride the slope, and leave the top fast enough to fly
    const ra = rampAt(c.x, c.z);
    if (ra) { c.y = ra.h; c.onRamp = ra.r; }
    else if (c.onRamp) { const r = c.onRamp, u = (c.x - r.x0) * r.dx + (c.z - r.z0) * r.dz, along = c.vx * r.dx + c.vz * r.dz; c.onRamp = null; c.y = 0;
      if (u > r.L - .6 && along > 5) { c.air = true; c.y = r.H; c.vy = along * r.H / r.L * 1.1 + 3.2; c.airT = 0; c.lx = c.x; c.lz = c.z; c.airBoost = !!c.nitroOn; if (c === player.car) stuntLaunch(c); } }
    else c.y = 0;
    c.speed = Math.hypot(c.vx, c.vz); c.vf = vf; c.vl = vl; c.acc = (vf - v0) / Math.max(dt, 1e-3);
    return crash;
  }
  function carVisual(c, dt) {
    const far = Math.abs(c.x - camera.position.x) > 230 || Math.abs(c.z - camera.position.z) > 230; c.root.visible = !far; if (far) return;
    c.root.position.set(c.x, c.air || c.y > 0 ? c.y : isRoad(c.x, c.z) ? 0 : .084, c.z); c.root.rotation.y = c.h;
    c.body.rotation.z = lerp(c.body.rotation.z, clamp(-(c.vl || 0) * .02 - c.w * (c.vf || 0) * .006, -.12, .12), Math.min(1, dt * 8));
    const pitch = c.air ? clamp(-c.vy * .03, -.45, .35) : c.onRamp ? -Math.atan2(c.onRamp.H, c.onRamp.L) * (Math.sin(c.h) * c.onRamp.dx + Math.cos(c.h) * c.onRamp.dz) : clamp(-(c.acc || 0) * .003, -.06, .06);
    c.body.rotation.x = lerp(c.body.rotation.x, pitch, Math.min(1, dt * (c.air || c.onRamp ? 10 : 6)));
    if (c.flames) { const on = !!(c.nitroOn && c.thr > 0); c.flames.forEach((f) => { f.visible = on; if (on) { f.scale.set(.7 + Math.random() * .3, 1.1 + Math.random() * .7, 1); f.material.rotation = Math.random() * .4 - .2; } }); }
    for (const w of c.wheels) { w.w.rotation.x += (c.vf || 0) * dt / .42; if (w.front) w.piv.rotation.y = c.steer * .5; }
    if (c.police) { const on = c.siren, ph = Math.floor(T * 7) % 2; const L = c.lights[0]; L.r.material = on && ph ? redM : offM; L.b.material = on && !ph ? blueM : offM; L.gr.visible = on && !!ph; L.gb.visible = on && !ph; }
    if (Math.abs(c.vl || 0) > 4.5 && c.speed > 8 && Math.random() < .5) { const bx = c.x - Math.sin(c.h) * 1.6, bz = c.z - Math.cos(c.h) * 1.6; puff(bx + rnd(-.8, .8), .3, bz, 1, .35, '#f0eef6', .4); }
  }
  // traffic + patrol driving: follow lane waypoints, stop for anything in front
  function driveAI(c, dt, speedT = 9) {
    if (!c.wp.length) nearestSeg(c);
    let wp = c.wp[c.wpi]; const dx = wp.x - c.x, dz = wp.z - c.z, d = Math.hypot(dx, dz);
    if (d < 3.6) { if (c.wpi === 0) c.wpi = 1; else { const opts = neighbors(...c.B).filter(([a, b]) => !(a === c.A[0] && b === c.A[1])); setSegment(c, c.B, pick(opts.length ? opts : [c.A])); } wp = c.wp[c.wpi]; }
    const want = Math.atan2(wp.x - c.x, wp.z - c.z), da = angDiff(c.h, want);
    c.steerIn = clamp(da * 2.2, -1, 1);
    let target = c.wpi === 0 ? speedT * .55 : speedT; if (Math.abs(da) > .5) target = Math.min(target, 5);
    const fx = Math.sin(c.h), fz = Math.cos(c.h); let blocked = false;
    const check = (x, z, rad) => { const ox = x - c.x, oz = z - c.z, ahead = ox * fx + oz * fz, side = Math.abs(ox * -fz + oz * fx); if (ahead > 0 && ahead < 8.5 && side < rad) blocked = true; };
    for (const o of cars) if (o !== c) check(o.x, o.z, 2.1);
    for (const p of people) if (p.root?.visible && p.state !== 'gone' && !(p === person && player.car)) check(p.x, p.z, 1.6);
    if (blocked) { target = 0; c.blockT = (c.blockT || 0) + dt; if (c.blockT > 2.5 && c.honkT <= 0 && Math.hypot(c.x - person.x, c.z - person.z) < 16) { sfx.honk(); c.honkT = 5; } } else c.blockT = 0;
    c.honkT -= dt;
    const vf = c.vf || 0; c.thr = target > vf + .5 ? clamp((target - vf) * .4, 0, 1) : target < vf - .5 ? -clamp((vf - target) * .25, .2, 1) : 0; c.hb = false;
  }
  function chaseAI(c, dt) {
    const tgt = player.car || person, cansee = los(c, tgt);
    c.routeT -= dt;
    if (!cansee && c.routeT <= 0) { c.routeT = .6; let best = null, bd = 1e9; for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) { const n = NODE(i, j); if (Math.abs(n.x - c.x) > 85 || Math.abs(n.z - c.z) > 85) continue; if (!los(n, tgt) || !los(c, n)) continue; const d = Math.hypot(n.x - c.x, n.z - c.z) + Math.hypot(n.x - tgt.x, n.z - tgt.z); if (d < bd) { bd = d; best = n; } } c.goal = best; }
    const g = cansee || !c.goal ? tgt : c.goal, dist = Math.hypot(tgt.x - c.x, tgt.z - c.z);
    const want = Math.atan2(g.x - c.x, g.z - c.z), da = angDiff(c.h, want);
    if (c.rev > 0) { c.rev -= dt; c.thr = -1; c.steerIn = -Math.sign(da) || 1; c.hb = false; return; }
    c.steerIn = clamp(da * 2.6, -1, 1); c.hb = Math.abs(da) > 1.2 && c.speed > 10;
    const slow = !player.car && dist < 9;
    c.thr = slow ? (c.vf > 1 ? -1 : 0) : Math.abs(da) > 2.2 ? .5 : 1;
    if (c.speed < 1.2 && !slow) { c.stuck += dt; if (c.stuck > 1.1) { c.rev = .9; c.stuck = 0; } } else c.stuck = 0;
  }

  // ---------------------------------------------------------------- player
  const player = { car: null, punchT: 0, punchCd: 0, onGround: true, down: 0, emoteCd: 0 };
  const keys = new Set(); const joy = { x: 0, y: 0, on: false }; const touchBtn = new Set();
  function nearestCar() { let best = null, bd = 3.6; for (const c of cars) { const d = Math.hypot(c.x - person.x, c.z - person.z); if (d < bd) { bd = d; best = c; } } return best; }
  function enterCar(c) {
    if (!c) return; player.car = c; sfx.door();
    if (c.driver === 'traffic' && c.driverMesh) { c.driverMesh.visible = false; if (c.speed > 1) crime(1.2, 'carjacked a ride'); else crime(.6, 'took a car'); feed(`you jacked a <em>${c.color === '#ffffff' ? 'car' : 'toy car'}</em>`); }
    if (c.police) { if (c.driverMesh) c.driverMesh.visible = false; crime(3, 'stole a police car'); }
    c.driver = 'player'; person.root && (person.root.visible = false);
    if (!c.mine) { const g = new THREE.Group(); mesh(CG.head, std((me.look && me.look.skin) || '#ffd2b3'), 0, 0, 0, g, false); const hood = mesh(CG.head, std((me.look && me.look.hoodie) || (hexOk(me.color) ? me.color : '#8f7cf2'), { roughness: .9 }), 0, .04, -.06, g, false); hood.scale.set(1.12, 1.08, 1.1); g.position.set(.4, 1.42, -.1); c.body.add(g); c.mine = g; }
    c.mine.visible = true; camDist = 11; dragT = 9;
    if (!c.flames) { c.flames = [-.55, .55].map((sx) => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: '#ffb347', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); track(f.material); f.center.set(.5, 1); f.position.set(sx, .62, -2.05); f.visible = false; c.body.add(f); return f; }); c.flames.forEach((f) => { f.material.rotation = Math.PI; }); }
    if (c.icecream) feed('you got the <em>ice cream truck</em>! jingle on');
  }
  function exitCar() {
    const c = player.car; if (!c) return; sfx.door(); if (c.mine) c.mine.visible = false; c.nitroOn = false; player.car = null; c.driver = null; c.thr = 0; c.hb = false; c.steerIn = 0; c.siren = false;
    const lx = Math.cos(c.h), lz = -Math.sin(c.h); person.x = c.x + lx * 2.1; person.z = c.z + lz * 2.1; pushOut(person, .4); person.vx = person.vz = 0; person.h = c.h; if (person.root) person.root.visible = true; camDist = 5;
  }
  function weapon() { return WEAPONS[wIdx]; }
  function swapWeapon(i) { if (i === wIdx) return; wIdx = i; reloadT = 0; guns.forEach((g, k) => { g.visible = k === wIdx && !player.car; }); sfx.swap(); }
  function reload() { const w = weapon(); if (reloadT > 0 || ammo[wIdx] === w.mag) return; reloadT = w.reload; sfx.reload(); }
  function shoot() {
    const w = weapon();
    if (reloadT > 0 || fireCd > 0) return;
    if (ammo[wIdx] <= 0) { sfx.empty(); reload(); fireCd = .25; return; }
    ammo[wIdx]--; fireCd = w.rate; if (ammo[wIdx] === 0) setTimeout(() => { if (!closed) reload(); }, 180);
    const inCar = !!player.car, src = inCar ? player.car : person;
    let yaw = inCar ? player.car.h : camYaw;
    if (!inCar) { aimHold = .7; aimYaw = yaw; }
    // a gentle aim assist toward the nearest target in a narrow cone
    let ax = 0, az = 0; const origin = new THREE.Vector3();
    if (inCar) origin.set(src.x + Math.sin(yaw) * 2.3, 1.2, src.z + Math.cos(yaw) * 2.3);
    else if (guns[wIdx].visible) guns[wIdx].userData.muzzle.getWorldPosition(origin); else origin.set(src.x, 1.1, src.z);
    ax = origin.x; az = origin.z;
    // on foot with a mouse: aim exactly through the crosshair (camera ray -> world point), fire from the muzzle at it
    let aimY = null;
    if (!inCar && !mobile) { const P = aimPoint(); yaw = Math.atan2(P.x - ax, P.z - az); aimY = { y: P.y, d: Math.hypot(P.x - ax, P.z - az) }; }
    let lock = null, la = inCar || mobile ? .2 : 0;
    for (const p of people) { if (!la) break; if (p === person || p.state === 'ko' || p.state === 'gone' || !p.root?.visible) continue; const d = Math.hypot(p.x - src.x, p.z - src.z); if (d > 45) continue; const a = Math.abs(angDiff(yaw, Math.atan2(p.x - src.x, p.z - src.z))); if (a < la && los(src, p)) { la = a; lock = p; } }
    if (lock) yaw = Math.atan2(lock.x - ax, lock.z - az);
    yaw += rnd(-w.spread, w.spread);
    const dx = Math.sin(yaw), dz = Math.cos(yaw), range = 60;
    let tHit = rayBoxes(ax, az, dx, dz, range), hit = null;
    for (const p of people) { if (p === person || p.state === 'ko' || p.state === 'gone' || !p.root?.visible) continue; const ox = p.x - ax, oz = p.z - az, along = ox * dx + oz * dz; if (along < 0 || along > tHit) continue; const perp = Math.abs(ox * dz - oz * dx); if (perp < .55) { tHit = along; hit = p; } }
    let carHit = null;
    for (const c of cars) { if (c === player.car) continue; const ox = c.x - ax, oz = c.z - az, along = ox * dx + oz * dz; if (along < 0 || along > tHit) continue; if (Math.abs(ox * dz - oz * dx) < 1.4) { tHit = along - 1; carHit = c; hit = null; } }
    // other players (PvP): the nearest one on the line takes the shot
    let pHit = null; for (const o of others.values()) { if (!o.here || !o.root) continue; const ox = o.x - ax, oz = o.z - az, along = ox * dx + oz * dz; if (along < 0 || along > tHit) continue; if (Math.abs(ox * dz - oz * dx) < (o.d ? 1.4 : .8)) { tHit = along; pHit = o; hit = null; carHit = null; } }
    const end = new THREE.Vector3(ax + dx * tHit, hit ? 1.0 : aimY ? lerp(origin.y, aimY.y, clamp(tHit / Math.max(aimY.d, .1), 0, 1.5)) : origin.y, az + dz * tHit);
    live?.pvp({ t: 'fx', x0: ax, z0: az, x1: end.x, z1: end.z });
    if (pHit) { live?.pvp({ t: 'hit', id: pHit.id, dmg: w.dmg }); crossEl.classList.add('hm'); clearTimeout(crossEl._t); crossEl._t = setTimeout(() => crossEl.classList.remove('hm'), 140); sfx.hit(); puff(end.x, 1.1, end.z, 3, .25, '#ffe7f0', .7); }
    tracer(origin, end, w.id === 'smg' ? '#c8ff9a' : '#fff2a0'); flash(origin, w.id === 'smg' ? .8 : 1);
    w.id === 'smg' ? sfx.smg() : sfx.pistol(); shake = Math.max(shake, w.id === 'smg' ? .05 : .1); panic(src.x, src.z, 28);
    if (hit) damage(hit, w.dmg, dx, dz, 'shot'); else if (carHit) { puff(end.x, end.y, end.z, 2, .25, '#fff7d0', .6); sfx.hit(); if (carHit.police) { crime(.8, 'shot at a police car'); carHit.stun = .3; } else if (carHit.driver === 'traffic') { carHit.stun = 1.5; crime(.4, 'shot at a car'); } }
    else if (tHit < range) puff(end.x, 1, end.z, 2, .22, '#f3ecff', .5);
    // gunfire near anyone counts as trouble
    if (!hit && stars === 0) { const near = people.some((p) => p !== person && p.state !== 'ko' && p.state !== 'gone' && Math.hypot(p.x - person.x, p.z - person.z) < 25); if (near && Math.random() < .25) crime(1, 'shots fired downtown'); }
  }
  const aimDir = new THREE.Vector3();
  function aimPoint() {
    camera.getWorldDirection(aimDir); const o = camera.position, d = aimDir; let best = 140;
    if (d.y < -1e-3) best = Math.min(best, -o.y / d.y);
    const hz = Math.hypot(d.x, d.z); if (hz > 1e-3) best = Math.min(best, rayBoxes(o.x, o.z, d.x / hz, d.z / hz, best * hz) / hz);
    const test = (x, y, z, r) => { const vx = x - o.x, vy = y - o.y, vz = z - o.z, t = vx * d.x + vy * d.y + vz * d.z; if (t < 2 || t > best) return; const qx = o.x + d.x * t - x, qy = o.y + d.y * t - y, qz = o.z + d.z * t - z; if (qx * qx + qy * qy + qz * qz < r * r) best = t; };
    for (const p of people) { if (p === person || p.state === 'ko' || p.state === 'gone' || !p.root?.visible) continue; test(p.x, .5, p.z, .6); test(p.x, 1.2, p.z, .6); }
    for (const c of cars) if (c !== player.car && c.root.visible) test(c.x, .9, c.z, 1.5);
    for (const q of others.values()) if (q.here) test(q.x, 1, q.z, .8);
    return { x: o.x + d.x * best, y: Math.max(0, o.y + d.y * best), z: o.z + d.z * best };
  }
  function tryFire() { if (state !== 'play' || person.state === 'down' || !ready) return; if (!weapon().auto && firedThisPress) return; if (fireCd <= 0 && reloadT <= 0) { shoot(); firedThisPress = true; } else if (reloadT > 0 && !weapon().auto) firedThisPress = false; }
  function punch() {
    if (player.car || player.punchCd > 0 || person.state === 'down') return; player.punchT = .28; player.punchCd = .42;
    const fx = Math.sin(person.h), fz = Math.cos(person.h); let any = false;
    for (const p of people) { if (p === person || p.state === 'ko' || p.state === 'gone' || !p.root?.visible) continue; const ox = p.x - person.x, oz = p.z - person.z, d = Math.hypot(ox, oz); if (d < 1.9 && (ox * fx + oz * fz) / Math.max(d, .01) > .3) { damage(p, 34, fx, fz, 'punch'); any = true; } }
    for (const o of others.values()) { if (!o.here || o.d) continue; const ox = o.x - person.x, oz = o.z - person.z, d = Math.hypot(ox, oz); if (d < 1.9 && (ox * fx + oz * fz) / Math.max(d, .01) > .3) { live?.pvp({ t: 'hit', id: o.id, dmg: 25 }); any = true; } }
    any ? sfx.punch() : sfx.whiff();
  }
  function damage(p, dmg, dx, dz, how) {
    if (p.state === 'ko' || p.state === 'gone') return;
    p.hp -= dmg; p.flash = .14; p.vx += dx * (how === 'punch' ? 7 : 2.5); p.vz += dz * (how === 'punch' ? 7 : 2.5);
    crossEl.classList.add('hm'); clearTimeout(crossEl._t); crossEl._t = setTimeout(() => crossEl.classList.remove('hm'), 140); sfx.hit();
    puff(p.x, 1.1, p.z, 2, .25, '#ffe7f0', .8);
    if (p.kind === 'cop') { crime(1.5, `attacked officer ${p.agent.name}`); p.state = 'chase'; if (p.sayT <= 0) { say(p, pick(SAY.cop)); } }
    else if (p.kind === 'civ') { crime(1, 'bonked a pedestrian'); p.flee = 8; if (p.sayT <= 0) say(p, pick(SAY.civ)); }
    if (p.hp <= 0) knockOut(p, how);
  }
  function knockOut(p, how) {
    p.state = 'ko'; p.koT = 0; p.hp = 0; p.spin = rnd(8, 14) * (Math.random() < .5 ? -1 : 1); p.vy = 5; sfx.ko(); shake = Math.max(shake, .25); p.pose = null; panic(p.x, p.z, 22);
    if (p.kind === 'cop') { koCount++; crime(3.5, `knocked out officer ${p.agent.name}`); feed(`you knocked out <b>${esc(p.agent.name)}</b> · police`); }
    else if (p.kind === 'civ') { civKo++; crime(2, 'knocked out a pedestrian'); feed('you knocked out a <em>pedestrian</em>'); }
  }
  // speech bubbles over heads (DOM, projected)
  const bubbles = [];
  function say(p, text) { p.sayT = 3; const d = document.createElement('div'); d.className = 'card'; d.style.cssText = 'position:absolute;padding:4px 10px;font-size:13px;font-weight:700;border-radius:12px;pointer-events:none;transform:translate(-50%,-100%);white-space:nowrap'; d.textContent = text; wrap.appendChild(d); bubbles.push({ d, p, life: 2.2 }); }

  // civilians scatter from trouble (gunfire, crashes, knockouts), some with a little scream
  function panic(x, z, r, scream = true) {
    let n = 0;
    for (const c of civs) { if (c.state === 'ko' || c.state === 'gone' || c.far) continue; const d = Math.hypot(c.x - x, c.z - z); if (d > r) continue;
      c.flee = Math.max(c.flee, rnd(4, 7)); c.fleeFrom = { x, z }; if (scream && n < 3 && c.sayT <= 0 && Math.random() < .45) { say(c, pick(SAY.scream)); n++; } }
  }
  function honk() {
    const c = player.car; if (!c || c.honkCd > 0) return; c.honkCd = .45; c.icecream ? sfx.jingleHonk() : sfx.honk();
    const fx = Math.sin(c.h), fz = Math.cos(c.h); let n = 0;
    for (const p of civs) { if (p.state === 'ko' || p.state === 'gone' || p.far) continue; const ox = p.x - c.x, oz = p.z - c.z, d = Math.hypot(ox, oz); if (d > 16) continue;
      if ((ox * fx + oz * fz) / Math.max(d, .01) > .2) { p.vy = 4; p.flee = Math.max(p.flee, 1.4); p.fleeFrom = { x: c.x, z: c.z }; if (n < 2 && p.sayT <= 0 && Math.random() < .6) { say(p, pick(SAY.honk)); n++; } } }
  }
  function emote() {
    if (player.car || person.state === 'down' || player.emoteCd > 0) return; say(person, pick(SAY.me)); player.emoteCd = 1.2; sfx.pop();
    let n = 0; for (const p of civs) { if (p.state === 'ko' || p.state === 'gone' || p.far || p.flee > 0) continue; if (Math.hypot(p.x - person.x, p.z - person.z) < 9 && n < 3) { n++; const q = p; setTimeout(() => { if (!closed && q.state !== 'ko' && q.state !== 'gone') { say(q, pick(SAY.wave)); q.waveT = 1.6; } }, 400 + n * 350); } }
  }
  // stunts: slow-mo off the lip, points on landing
  let slowT = 0, timeScale = 1;
  function stuntLaunch(c) { slowT = 1.0; sfx.whoosh(); shake = Math.max(shake, .12); puff(c.x, .4, c.z, 5, .5); }
  function stuntLand(c) {
    const dist = Math.hypot(c.x - c.lx, c.z - c.lz), pts = Math.max(3, Math.round(c.airT * 10 + dist / 3 + (c.airBoost ? 5 : 0)));
    heatCoins += pts; stunts++; slowT = 0; shake = Math.max(shake, .35); sfx.land(); puff(c.x, .4, c.z, 10, .7, '#ffffff', 2.4); burst(c.x, 1.4, c.z, 12);
    stuntEl.innerHTML = `STUNT +${pts}<small>${Math.round(dist)} m · ${c.airT.toFixed(1)} s air${c.airBoost ? ' · NITRO' : ''} · $AUDACITY</small>`; stuntEl.classList.remove('on'); void stuntEl.offsetWidth; stuntEl.classList.add('on');
    if (dist > (bestJump || 0)) { bestJump = Math.round(dist); try { localStorage.setItem('aa.getaway.jump', String(bestJump)); } catch {} feed(`new best jump: <b>${bestJump} m</b>`); }
    let n = 0; for (const p of civs) { if (p.far || p.state === 'ko' || p.state === 'gone' || n > 2) continue; if (Math.hypot(p.x - c.x, p.z - c.z) < 30 && p.sayT <= 0) { say(p, pick(['wow!', 'sick jump!', 'whoa!!', '10/10', 'do it again!'])); p.waveT = 1.4; n++; } }
  }
  let stunts = 0, bestJump = 0; try { bestJump = +localStorage.getItem('aa.getaway.jump') || 0; } catch {}
  function hurtPlayer(dmg, why) {
    if (person.state === 'down' || state !== 'play') return;
    person.hp -= player.car ? dmg * .5 : dmg; hurtT = .5; shake = Math.max(shake, .18); sfx.hurt(); player.regenT = 5;
    if (person.hp <= 0) { person.hp = 0; playerDown(why); }
  }
  function playerDown(why) {
    if (lastHitBy && performance.now() - lastHitAt < 3000) { live?.pvp({ t: 'ko', by: lastHitBy }); lastHitBy = null; }
    if (heatCoins > 1) { const n = Math.floor(heatCoins / 2); heatCoins -= n; window.__heatDrop?.(person.x, person.z, Math.min(n, 30)); feed(`you dropped <b>${n}</b> $AUDACITY`); }
    if (player.car) exitCar(); person.state = 'down'; person.koT = 0; person.spin = 9; person.vy = 5; sfx.ko(); state = 'down'; cardT = 1.4;
    feed(`<b>${esc(why || 'the police')}</b> knocked you out`);
  }
  function busted() {
    if (player.car) exitCar(); state = 'busted'; cardT = .6; sfx.busted(); feed('<b>BUSTED</b> by the city police');
  }
  function showCard(kind) {
    const isBust = kind === 'busted', newBest = saveBest(); postScore();
    modalCard.innerHTML = `<h1 class="${isBust ? 'blue' : ''}">${isBust ? 'BUSTED' : 'KNOCKED OUT'}</h1>
      <p>${isBust ? 'The agents cuffed you with a toy pair of handcuffs. Back to the station.' : 'You flopped over and saw stars. The clinic patched you up.'}</p>
      <div class="row"><div><b>${koCount}</b><span>cops knocked out</span></div><div><b>${fmtT(maxT)}</b><span>time at 5 stars</span></div><div><b>${runScore()}</b><span>score</span></div></div>
      <p>${newBest ? '<b style="color:#ff6b81">New best run!</b>' : `Best: ${best.score || 0} pts · ${best.ko || 0} cops · ${fmtT(best.max || 0)} at 5 stars`}</p>
      <div class="gw-topcard"><div class="hd">Top players</div>${topHtml()}</div>
      <button type="button" class="gw-again">Back to the streets</button>`;
    modal.style.display = 'grid'; modalCard.querySelector('.gw-again').onclick = respawn;
  }
  function respawn() {
    modal.style.display = 'none'; const at = state === 'busted' ? STATION.door : CLINIC.door;
    Object.assign(person, { x: at.x, z: at.z, y: 0, vy: 0, vx: 0, vz: 0, hp: 100, state: 'idle', h: state === 'busted' ? Math.PI / 2 : -Math.PI / 2 });
    if (person.root) { person.root.visible = true; person.root.rotation.set(0, person.h, 0); }
    camYaw = person.h; posted = false; stunts = 0; heat = 0; setStars(0); unseenT = 0; bustT = 0; koCount = 0; civKo = 0; maxT = 0; wantedT = 0; ammo[0] = WEAPONS[0].mag; ammo[1] = WEAPONS[1].mag; reloadT = 0;
    cops.forEach((c, i) => { if (c.state !== 'ko' && c.state !== 'gone') { c.state = 'patrol'; } if (Math.hypot(c.x - at.x, c.z - at.z) < 10) { c.x = STATION.x - 10 + i; } });
    cars.filter((c) => c.police).forEach((c) => { c.mode = 'patrol'; c.siren = false; if (c.driver === null || c.driver === 'player') return; if (Math.hypot(c.x - at.x, c.z - at.z) < 12) { c.x += 20; } });
    state = 'play';
  }

  // ---------------------------------------------------------------- input
  const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyG', 'KeyR', 'Digit1', 'Digit2', 'KeyM', 'Enter', 'Tab']);
  function onKey(e) {
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); if (e.type !== 'keydown') return; if (document.pointerLockElement === cv || performance.now() - unlockAt < 150) { document.exitPointerLock?.(); return; } close(); return; }
    if (!GAME_KEYS.has(e.code) && !e.code.startsWith('Key')) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keyup') { keys.delete(e.code); if (e.code === 'KeyG') triggerHeld = false; return; }
    if (e.repeat && e.code !== 'KeyG') return;
    keys.add(e.code); loops();
    if (state === 'help') { startPlay(); }
    if (state === 'busted' || state === 'down') { if (modal.style.display === 'grid' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE')) respawn(); return; }
    if (state !== 'play') return;
    if (e.code === 'KeyE') { if (player.car) exitCar(); else enterCar(nearestCar()); guns.forEach((g, k) => { g.visible = k === wIdx && !player.car; }); }
    else if (e.code === 'KeyF') punch();
    else if (e.code === 'KeyG') { triggerHeld = true; firedThisPress = false; tryFire(); }
    else if (e.code === 'KeyR') reload();
    else if (e.code === 'Digit1') swapWeapon(0); else if (e.code === 'Digit2') swapWeapon(1);
    else if (e.code === 'KeyM') toggleMute();
    else if (e.code === 'KeyH') honk(); else if (e.code === 'KeyQ') cycleRadio(); else if (e.code === 'KeyX') emote();
    else if (e.code === 'KeyT') { topOpen = !topOpen; topEl.style.display = topOpen ? 'block' : 'none'; if (topOpen) fetchTop().then(paintTop); }
    else if (e.code === 'Space' && !player.car && player.onGround && person.state !== 'down') { person.vy = 6.6; player.onGround = false; sfx.jump(); }
  }
  function toggleMute() { muted = !muted; try { localStorage.setItem('aa.games.mute', muted ? '1' : '0'); } catch {} paintMute(); if (!muted) { audio(); loops(); } }
  let drag = null;
  function onDown(e) {
    loops();
    if (state === 'help') { startPlay(); return; }
    if (e.pointerType === 'touch' && e.clientX < innerWidth * .4) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, btn: e.button, touch: e.pointerType === 'touch' };
    try { if (!locked) cv.setPointerCapture?.(e.pointerId); } catch {}
    if (e.pointerType === 'mouse' && state === 'play' && !locked && cv.requestPointerLock) { try { const r = cv.requestPointerLock(); r?.catch?.(() => {}); } catch {} }
    if (e.pointerType === 'mouse' && e.button === 0 && state === 'play') { triggerHeld = true; firedThisPress = false; tryFire(); }
  }
  function onMove(e) {
    if (locked || !drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    camYaw -= dx * (drag.touch ? .008 : .0055); camPitch = clamp(camPitch + dy * .004, .05, 1.15); dragT = 0;
  }
  function onUp(e) { if (drag && drag.id === e.pointerId) { drag = null; triggerHeld = false; } }
  const onWheel = (e) => { e.preventDefault(); camDist = clamp(camDist + e.deltaY * .01, 4, 18); };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // pointer lock: the mouse turns the camera like a proper third-person shooter
  const onLock = () => { const was = locked; locked = document.pointerLockElement === cv; if (was && !locked) { unlockAt = performance.now(); triggerHeld = false; } wrap.classList.toggle('locked', locked); };
  const onMouse = (e) => { if (!locked) return; camYaw -= e.movementX * .0026; camPitch = clamp(camPitch + e.movementY * .0021, -.35, 1.15); dragT = 0; };
  const onMouseUp = (e) => { if (locked && e.button === 0) triggerHeld = false; };
  document.addEventListener('pointerlockchange', onLock); document.addEventListener('mousemove', onMouse); document.addEventListener('mouseup', onMouseUp);
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const onBlur = () => { keys.clear(); triggerHeld = false; drag = null; }; addEventListener('blur', onBlur);
  let paused = false; const onVis = () => { paused = document.hidden; last = 0; if (paused) onBlur(); loopsSet(false, 0, false, 0); }; document.addEventListener('visibilitychange', onVis);
  const onResize = () => { const w = wrap.clientWidth || innerWidth, h = wrap.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 72 : 60; camera.updateProjectionMatrix(); }; addEventListener('resize', onResize); onResize();
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  topBtn.addEventListener('click', (e) => { e.stopPropagation(); topOpen = !topOpen; topEl.style.display = topOpen ? 'block' : 'none'; if (topOpen) fetchTop().then(paintTop); });
  // touch: joystick + buttons
  const joyEl = $('.gw-joy'), joyKnob = $('.gw-joy i');
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; joyKnob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { e.preventDefault(); loops(); if (state === 'help') startPlay(); joy.on = true; joy.id = e.pointerId; joyEl.setPointerCapture?.(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (joy.on && e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = 0; joyKnob.style.transform = ''; }; joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  wrap.querySelectorAll('.gw-tb').forEach((b) => {
    const k = b.dataset.b;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); loops(); if (state === 'help') { startPlay(); return; } if (state !== 'play') { if (modal.style.display === 'grid') respawn(); return; } touchBtn.add(k);
      if (k === 'fire') { triggerHeld = true; firedThisPress = false; tryFire(); } else if (k === 'punch') punch(); else if (k === 'jump') { if (player.car) return; if (player.onGround) { person.vy = 6.6; player.onGround = false; sfx.jump(); } } else if (k === 'car') { if (player.car) exitCar(); else enterCar(nearestCar()); guns.forEach((g, i) => { g.visible = i === wIdx && !player.car; }); } else if (k === 'swap') swapWeapon(1 - wIdx); else if (k === 'reload') reload(); else if (k === 'honk') honk(); });
    const up = () => { touchBtn.delete(k); if (k === 'fire') triggerHeld = false; }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  function startPlay() { if (state !== 'help') return; state = 'play'; modal.style.display = 'none'; }
  modalCard.innerHTML = `<h1 style="font-size:40px">Auda City</h1><p>Free roam the toy city. The agents are the cops.</p>
    <div class="keys">${mobile ? '<span>Stick</span><span>move / drive</span><span>Drag right side</span><span>look around</span><span>FIRE · PUNCH · JUMP</span><span>cause trouble</span><span>CAR</span><span>get in / out</span><span>NITRO · HONK</span><span>boost · beep</span>' : '<span><kbd>WASD</kbd></span><span>move · drive</span><span><kbd>Shift</kbd></span><span>run</span><span><kbd>Space</kbd></span><span>jump · handbrake</span><span><kbd>E</kbd></span><span>get in / out of a car</span><span><kbd>Click</kbd><kbd>G</kbd></span><span>shoot toy blaster</span><span><kbd>F</kbd></span><span>punch</span><span><kbd>1</kbd><kbd>2</kbd><kbd>R</kbd></span><span>weapon · reload</span><span><kbd>Mouse</kbd></span><span>aim (click to lock, Esc frees)</span><span><kbd>Shift</kbd> in car</span><span>NITRO</span><span><kbd>H</kbd> <kbd>Q</kbd> <kbd>X</kbd></span><span>honk · radio · wave</span><span><kbd>T</kbd></span><span>top players</span>'}</div>
    <p style="margin-top:12px">Trouble raises your stars. Lose the cops for 20 s to cool off. Hit the candy ramps for stunts, grab loot crates, race through the checkered arch, and chase the golden AUDACITY RUSH.</p><button type="button">Let's go</button>`;
  modal.style.display = 'grid'; modalCard.querySelector('button').onclick = startPlay;

  // ---------------------------------------------------------------- minimap
  const MAP = { x0: -182, z0: -182, k: 2, size: 0 };
  const mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = Math.ceil((PIER.x1 + 8 - MAP.x0) * MAP.k);
  { const x = mapBase.getContext('2d'), k = MAP.k, X = (v) => (v - MAP.x0) * k, Z = (v) => (v - MAP.z0) * k;
    x.fillStyle = '#c6eaa6'; x.fillRect(0, 0, mapBase.width, mapBase.height);
    x.fillStyle = '#9fdcef'; x.fillRect(X(SHORE), 0, mapBase.width, mapBase.height); x.fillStyle = '#f8e6ba'; x.fillRect(X(171), Z(-WALL - 6), (SHORE - 171) * k, (2 * WALL + 12) * k);
    x.fillStyle = '#e9c48e'; x.fillRect(X(171), Z(-WALL), 6 * k, 2 * WALL * k);
    x.fillStyle = '#fbf3e6'; x.fillRect(X(-WALL), Z(-WALL), (171 + WALL) * k, 2 * WALL * k);
    x.fillStyle = '#e9c48e'; x.fillRect(X(PIER.x0), Z(-PIER.z), (PIER.x1 + 3 - PIER.x0) * k, PIER.z * 2 * k);
    const DC = { downtown: '#e9e1f7', mid: '#d9eec6', homes: '#d3efbd', docks: '#dfe3ea', park: '#b4e39a', beach: '#f8e6ba' };
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = DC[DIST(i, j)]; x.fillRect(X(R[i] + 7), Z(R[j] + 7), 26 * k, 26 * k); }
    if (pond) { x.fillStyle = '#9fdcef'; x.beginPath(); x.arc(X(pond.x), Z(pond.z), pond.r * k, 0, TAU); x.fill(); }
    x.fillStyle = '#b5bccf'; for (const r of R) { x.fillRect(X(-EDGE), Z(r - RH), 2 * EDGE * k, 2 * RH * k); x.fillRect(X(r - RH), Z(-EDGE), 2 * RH * k, 2 * EDGE * k); }
    for (const b of boxes) { x.fillStyle = '#d5cbea'; x.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k); }
    x.fillStyle = '#ffd36e'; for (const r of RAMPS) { x.save(); x.translate(X(r.x0 + r.dx * 4), Z(r.z0 + r.dz * 4)); x.rotate(Math.atan2(r.dz, r.dx)); x.fillRect(-4 * k, -1.5 * k, 8 * k, 3 * k); x.restore(); }
    const mark = (p, c) => { x.fillStyle = c; x.fillRect(X(p.x - 8), Z(p.z - 7), 16 * k, 14 * k); };
    mark(STATION, '#9fb4ff'); mark(CLINIC, '#ffb8c4'); mark(BANK, '#ffe08a'); x.fillStyle = '#9fe7d6'; x.fillRect(X(GAS.x - 11), Z(GAS.z - 7), 22 * k, 14 * k);
    for (let q = 0; q < 6; q++) { x.fillStyle = q % 2 ? '#3b2f5c' : '#ffffff'; x.fillRect(X(RACE_START.x - 1), Z(RACE_START.z - 6 + q * 2), 2 * k, 2 * k); } }
  function drawMap() {
    const W = mapCv.width, cx = W / 2, s = 1.75 * (W / 328), p = player.car || person, cos = Math.cos(camYaw), sin = Math.sin(camYaw);
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, W, W); mctx.save(); mctx.beginPath(); mctx.roundRect(0, 0, W, W, 26); mctx.clip();
    mctx.fillStyle = '#c6eaa6'; mctx.fillRect(0, 0, W, W);
    const k = MAP.k, a = -s * cos / k, c = s * sin / k, b = -s * sin / k, d = -s * cos / k;
    mctx.setTransform(a, b, c, d, cx + s * (-cos * (MAP.x0 - p.x) + sin * (MAP.z0 - p.z)), cx + s * (-sin * (MAP.x0 - p.x) - cos * (MAP.z0 - p.z)));
    mctx.drawImage(mapBase, 0, 0); mctx.setTransform(1, 0, 0, 1, 0, 0);
    const toM = (x, z) => { const dx = x - p.x, dz = z - p.z; return [cx + s * (-cos * dx + sin * dz), cx + s * (-sin * dx - cos * dz)]; };
    const dot = (x, z, r, col, ring = '#fff') => { const [u, v] = toM(x, z); if (u < -10 || v < -10 || u > W + 10 || v > W + 10) return; mctx.fillStyle = ring; mctx.beginPath(); mctx.arc(u, v, r + 2.5, 0, TAU); mctx.fill(); mctx.fillStyle = col; mctx.beginPath(); mctx.arc(u, v, r, 0, TAU); mctx.fill(); };
    { const [u, v] = toM(STATION.x, STATION.z); mctx.fillStyle = '#5b7cf0'; mctx.font = `700 ${18 * W / 328}px ${FONT}`; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('★', u, v); const [u2, v2] = toM(CLINIC.x, CLINIC.z); mctx.fillStyle = '#ff6b81'; mctx.fillText('♥', u2, v2); }
    for (const c of cars) if (c !== player.car && !c.police) dot(c.x, c.z, 4, '#a39cc0');
    const blink = Math.floor(T * 4) % 2;
    for (const c of cars) if (c.police && c !== player.car) dot(c.x, c.z, 6.5, stars && c.mode === 'chase' ? (blink ? '#ff4060' : '#4070ff') : '#5b7cf0');
    for (const c of cops) if (c.state !== 'gone' && c.state !== 'ko') dot(c.x, c.z, 5.5, stars && c.state === 'chase' ? (blink ? '#4070ff' : '#ff4060') : '#5b7cf0');
    const edge = (x, z, col, label) => { let [u, v] = toM(x, z); const dx = u - cx, dy = v - cx, R0 = cx - 16, L = Math.hypot(dx, dy); const out = L > R0; if (out) { u = cx + dx / L * R0; v = cx + dy / L * R0; } mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(u, v, 13 * W / 328, 0, TAU); mctx.fill(); mctx.fillStyle = col; mctx.beginPath(); mctx.arc(u, v, 10 * W / 328, 0, TAU); mctx.fill(); mctx.fillStyle = '#fff'; mctx.font = `700 ${13 * W / 328}px ${FONT}`; mctx.fillText(label, u, v + 1); };
    for (const c of cars) if (c.icecream && c !== player.car) dot(c.x, c.z, 5, '#ff9ec0');
    for (const c of crates) if (c.on) dot(c.x, c.z, 5, '#b48cff');
    if (race.on) { const [x, z] = RACE_CP[race.i]; edge(x, z, '#ff6b81', String(race.i + 1)); } else edge(RACE_START.x, RACE_START.z, '#3b2f5c', '⚑');
    if (rush.on) edge(rush.x, rush.z, blink ? '#ffb300' : '#ffd34a', '$');
    // you: an arrow pointing where you face
    const hh = (player.car ? player.car.h : person.h) - camYaw; mctx.save(); mctx.translate(cx, cx); mctx.rotate(-hh); mctx.fillStyle = '#ffffff'; mctx.beginPath(); mctx.moveTo(0, -15); mctx.lineTo(11, 11); mctx.lineTo(0, 5); mctx.lineTo(-11, 11); mctx.closePath(); mctx.fill(); mctx.fillStyle = '#ff6b81'; mctx.beginPath(); mctx.moveTo(0, -10); mctx.lineTo(7, 7); mctx.lineTo(0, 3); mctx.lineTo(-7, 7); mctx.closePath(); mctx.fill(); mctx.restore();
    if (stars) { mctx.strokeStyle = blink ? 'rgba(255,64,96,.6)' : 'rgba(64,112,255,.6)'; mctx.lineWidth = 8; mctx.strokeRect(4, 4, W - 8, W - 8); }
    mctx.restore();
  }
  function drawWeaponIcon() {
    const x = wpnCv.getContext('2d'), w = weapon(); x.clearRect(0, 0, 168, 88); x.save(); x.translate(84, 44);
    const rr = (a, b, c, d, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(a, b, c, d, r); x.fill(); };
    if (w.id === 'pistol') { rr(-50, -16, 80, 26, 10, w.col); rr(28, -12, 26, 16, 6, w.col2); rr(-44, 4, 26, 34, 8, '#b48cff'); rr(-6, -24, 12, 9, 3, '#ffd36e'); }
    else { rr(-62, -14, 112, 26, 10, w.col); rr(48, -10, 22, 16, 6, '#ff8fb8'); rr(-8, 8, 20, 34, 7, w.col2); rr(-46, 6, 20, 24, 7, '#ffd36e'); rr(-76, -10, 20, 18, 6, '#ffd36e'); }
    x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(-40, -12, 50, 5); x.restore();
  }
  let lastW = -1;

  // ---------------------------------------------------------------- update
  function updatePlayer(dt) {
    player.punchCd -= dt; player.punchT -= dt; aimHold -= dt; fireCd -= dt; player.emoteCd -= dt; if (player.car) player.car.honkCd = (player.car.honkCd || 0) - dt;
    if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) ammo[wIdx] = weapon().mag; }
    player.regenT = (player.regenT || 0) - dt; if (player.regenT <= 0 && person.hp < 100 && person.state !== 'down') person.hp = Math.min(100, person.hp + dt * 8);
    if (triggerHeld) tryFire();
    const up = keys.has('KeyW') || keys.has('ArrowUp'), dn = keys.has('KeyS') || keys.has('ArrowDown'), lf = keys.has('KeyA') || keys.has('ArrowLeft'), rt = keys.has('KeyD') || keys.has('ArrowRight');
    let mf = (up ? 1 : 0) - (dn ? 1 : 0), ms = (rt ? 1 : 0) - (lf ? 1 : 0);
    if (joy.on) { mf = -joy.y; ms = joy.x; }
    const c = player.car;
    if (c) {
      c.thr = state === 'play' ? clamp(mf, -1, 1) : 0; c.steerIn = state === 'play' ? -clamp(ms, -1, 1) : 0; c.hb = keys.has('Space') || touchBtn.has('jump');
      const wantN = state === 'play' && (keys.has('ShiftLeft') || keys.has('ShiftRight') || touchBtn.has('nitro')) && c.thr > 0, was = c.nitroOn;
      c.nitroOn = wantN && nitro > .02; nitro = clamp(nitro + (c.nitroOn ? -.3 : .06) * dt, 0, 1); if (c.nitroOn && !was) sfx.nitro();
      person.x = c.x; person.z = c.z;
      return;
    }
    if (person.state === 'down') return;
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || (joy.on && Math.hypot(joy.x, joy.y) > .85), canMove = state === 'play';
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    let dx = fx * mf + rx * ms, dz = fz * mf + rz * ms; const m = Math.hypot(dx, dz); if (m > 1) { dx /= m; dz /= m; }
    const spd = (run ? 7.4 : 4.3) * (canMove ? 1 : 0), k = Math.min(1, dt * (player.onGround ? 12 : 3));
    person.vx = lerp(person.vx, dx * spd, k); person.vz = lerp(person.vz, dz * spd, k);
    const px = person.x; person.x += person.vx * dt; person.z += person.vz * dt;
    pushOut(person, .42); clampWorld(person, .42, px);
    person.vy -= 20 * dt; person.y += person.vy * dt; if (person.y <= 0) { person.y = 0; person.vy = 0; player.onGround = true; }
    if (aimHold > 0 || locked) person.h += angDiff(person.h, camYaw) * Math.min(1, dt * 18);
    else if (m > .1) person.h += angDiff(person.h, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
  }
  function updatePeople(dt) {
    const tgt = player.car || person;
    for (const p of people) {
      if (p === person) continue;
      if (!p.root) continue;
      p.sayT -= dt; p.flash -= dt;
      if (p.state === 'ko') { koAnim(p, dt); continue; }
      if (p.state === 'gone') { p.koT += dt; if (p.koT > (p.kind === 'cop' ? 10 : 8)) { if (p.kind === 'cop') { copHome(p); feed(`officer <b>${esc(p.agent.name)}</b> is back on duty`); } else civRespawn(p); p.root.visible = true; puff(p.x, .6, p.z, 6, .5); } continue; }
      let gx = p.x, gz = p.z, spd = 0;
      if (p.kind === 'civ') {
        p.dist = Math.hypot(p.x - tgt.x, p.z - tgt.z); p.far = p.dist > 95; p.root.visible = !p.far; p.waveT -= dt;
        if (p.flee > 0) { p.flee -= dt; const f = p.fleeFrom || tgt, ax = p.x - f.x, az = p.z - f.z, d = Math.hypot(ax, az) || 1; gx = p.x + ax / d * 5; gz = p.z + az / d * 5; spd = 6; p.pose = null; }
        else if (!p.anchor) { const cs = civCorners(p), q = cs[p.corner]; if (Math.hypot(q.x - p.x, q.z - p.z) < 1) p.corner = (p.corner + (p.dir || 1)) % 4; gx = cs[p.corner].x; gz = cs[p.corner].z; spd = p.act === 'jog' ? 3.7 : 1.45 + (p.seed % 5) * .08; p.pose = null; }
        else { const a = p.anchor; if (Math.hypot(a.x - p.x, a.z - p.z) > .45) { gx = a.x; gz = a.z; spd = 1.9; p.pose = null; } else { p.pose = p.act; p.vx = p.vz = 0; p.h += angDiff(p.h, a.h) * Math.min(1, dt * 6); } }
        if (!p.far && p.flee <= 0 && p.sayT <= 0 && p.dist < 22 && state === 'play') {
          const line = { chat: 'chat', jog: 'jog', dance: 'dance', bus: 'bus', sit: 'sit', vendor: 'vendor' }[p.act];
          if (line && p.pose !== null || p.act === 'jog') { if (Math.random() < dt * (p.act === 'chat' ? .14 : .05)) say(p, pick(SAY[line])); }
          else if (p.act === 'walk' && !player.car && !stars && p.dist < 5 && Math.random() < dt * .6) { say(p, pick(SAY.wave)); p.waveT = 1.6; }
        }
      } else {
        const dist = Math.hypot(tgt.x - p.x, tgt.z - p.z), canSee = dist < 60 && los(p, tgt);
        if (p.state === 'chase' && stars > 0) {
          p.routeT -= dt;
          if (!canSee && p.routeT <= 0) { p.routeT = .5; let bn = null, bd = 1e9; for (let i = 0; i < NR; i++) for (let j = 0; j < NR; j++) for (const [ox, oz] of [[6.5, 6.5], [-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5]]) { const n = { x: R[i] + ox, z: R[j] + oz }; if (Math.abs(n.x - p.x) > 70 || Math.abs(n.z - p.z) > 70) continue; if (!los(n, tgt) || !los(p, n)) continue; const dd = Math.hypot(n.x - p.x, n.z - p.z) + Math.hypot(n.x - tgt.x, n.z - tgt.z); if (dd < bd) { bd = dd; bn = n; } } p.goal = bn; }
          const g = canSee || !p.goal ? tgt : p.goal; gx = g.x; gz = g.z;
          const keep = p.role === 'shoot' && stars >= 2 ? (stars >= 4 ? 6 : 9) : 0;
          spd = canSee && dist < keep ? 0 : stars >= 3 ? 6.6 : 6.1;
          // shoot back at 2+ stars
          p.shootT -= dt;
          if (stars >= 2 && canSee && dist < 26 && p.shootT <= 0 && state === 'play' && person.state !== 'down') {
            p.shootT = Math.max(.55, 1.7 - stars * .2) * rnd(.8, 1.3); p.aimT = .4;
            const acc = (.28 + .07 * stars) * (player.car && player.car.speed > 10 ? .5 : 1) * (dist > 15 ? .7 : 1), hit = Math.random() < acc;
            const mz = new THREE.Vector3(); p.gun.userData.muzzle.getWorldPosition(mz);
            const end = new THREE.Vector3(tgt.x + (hit ? 0 : rnd(-1.6, 1.6)), hit ? 1 : rnd(.4, 1.8), tgt.z + (hit ? 0 : rnd(-1.6, 1.6)));
            tracer(mz, end, '#9fc2ff'); flash(mz, .7); if (dist < 40) sfx.copShot(); panic(p.x, p.z, 18);
            if (hit) hurtPlayer(6 + stars, `officer ${p.agent.name}`);
          }
          if (p.sayT <= 0 && canSee && dist < 18 && Math.random() < dt * .25) say(p, pick(SAY.cop));
        } else {
          // patrol: stroll around near the station
          p.patrolT -= dt;
          if (!p.goal || p.patrolT <= 0 || Math.hypot(p.goal.x - p.x, p.goal.z - p.z) < 1) { p.patrolT = rnd(4, 9); p.goal = { x: STATION.door.x + rnd(-1, 1.6), z: STATION.door.z + rnd(-12, 12) }; }
          gx = p.goal.x; gz = p.goal.z; spd = 1.6;
        }
      }
      const dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz);
      const k = Math.min(1, dt * 8); const tvx = d > .3 ? dx / d * spd : 0, tvz = d > .3 ? dz / d * spd : 0;
      p.vx = lerp(p.vx, tvx, k); p.vz = lerp(p.vz, tvz, k);
      const px = p.x; p.x += p.vx * dt; p.z += p.vz * dt; if (!p.pose && !p.far) { pushOut(p, .42); clampWorld(p, .42, px); }
      p.vy -= 20 * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0) p.vy = 0;
      const sp = Math.hypot(p.vx, p.vz); p.speed = sp;
      if (p.kind === 'cop' && p.state === 'chase' && stars > 0 && (p.aimT > 0 || (p.role === 'shoot' && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 12))) p.h += angDiff(p.h, Math.atan2(tgt.x - p.x, tgt.z - p.z)) * Math.min(1, dt * 10);
      else if (sp > .3) p.h += angDiff(p.h, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * 10);
      p.aimT = (p.aimT || 0) - dt;
    }
    // separation between people so crowds don't stack
    for (let i = 0; i < people.length; i++) { const a = people[i]; if (a.far || a.state === 'ko' || a.state === 'gone' || (a === person && player.car)) continue;
      for (let j = i + 1; j < people.length; j++) { const b = people[j]; if (b.far || b.state === 'ko' || b.state === 'gone' || (b === person && player.car) || (a.pose && b.pose)) continue; const dx = b.x - a.x, dz = b.z - a.z; if (dx > .8 || dx < -.8 || dz > .8 || dz < -.8) continue; const d = Math.hypot(dx, dz); if (d < .8 && d > 1e-4) { const k = (.8 - d) / 2, ka = a.pose ? 0 : b.pose ? 2 * k : k, kb = b.pose ? 0 : a.pose ? 2 * k : k; a.x -= dx / d * ka; a.z -= dz / d * ka; b.x += dx / d * kb; b.z += dz / d * kb; } } }
  }
  function koAnim(p, dt) {
    p.koT += dt; const r = p.root;
    if (p.koT < .75) { const e = Math.min(1, p.koT / .45); r.rotation.x = -Math.PI / 2 * e * (p.kind === 'player' ? .95 : 1); r.rotation.y += p.spin * dt * (1 - e * .6); p.vy -= 20 * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0 && p.vy < 0) p.vy = -p.vy * .35; p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= .92; p.vz *= .92; r.position.set(p.x, groundAt(p.x, p.z) + p.y + .25 * e, p.z); r.scale.setScalar((p.sc || 1) * (1 + Math.sin(p.koT * 30) * .04)); flashMats(r, Math.floor(p.koT * 16) % 2 ? .9 : 0); }
    else if (p.kind !== 'player') { flashMats(r, 0); r.visible = false; r.scale.setScalar(p.sc || 1); burst(p.x, 1, p.z); p.state = 'gone'; p.koT = 0; }
    else if (r.visible) { flashMats(r, 0); r.visible = false; burst(p.x, 1, p.z); }
  }
  function flashMats(root, k) {
    root.traverse((o) => { if (!o.isMesh || !o.material || !o.material.emissive) return; const m = o.material; if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.getHex(); m.userData.ei = m.emissiveIntensity; } if (k > 0) { m.emissive.set('#ffffff'); m.emissiveIntensity = k; } else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.ei; } });
  }
  function updateCars(dt) {
    // who chases: the closest police cars, more at higher stars
    const want = CAR_N[stars], pol = cars.filter((c) => c.police && c.driver === 'police');
    const tgt = player.car || person;
    pol.sort((a, b) => Math.hypot(a.x - tgt.x, a.z - tgt.z) - Math.hypot(b.x - tgt.x, b.z - tgt.z)).forEach((c, i) => {
      const m = i < want ? 'chase' : 'patrol';
      if (m !== c.mode) { c.mode = m; if (m === 'patrol') nearestSeg(c); }
      // far behind: teleport the cruiser to a corner out of sight
      if (m === 'chase' && Math.hypot(c.x - tgt.x, c.z - tgt.z) > 95) { const opts = []; for (let a = 0; a < NR; a++) for (let b = 0; b < NR; b++) { const n = NODE(a, b), d = Math.hypot(n.x - tgt.x, n.z - tgt.z); if (d > 40 && d < 75) opts.push(n); } if (opts.length) { const n = pick(opts); c.x = n.x; c.z = n.z; c.vx = c.vz = 0; c.h = Math.atan2(tgt.x - n.x, tgt.z - n.z); } }
    });
    for (const c of cars) {
      c.stun -= dt; c.ramT -= dt;
      if (c.driver === 'traffic') driveAI(c, dt, c.speedT || 9);
      else if (c.driver === 'police') { if (c.mode === 'chase' && stars > 0) chaseAI(c, dt); else driveAI(c, dt, 8); c.siren = c.mode === 'chase' && stars > 0; }
      else if (c.driver !== 'player') { c.thr = 0; c.steerIn = 0; c.hb = true; }
      const crash = carStep(c, dt);
      if (c === player.car && crash > 7) { panic(c.x, c.z, 18); sfx.crash(); shake = Math.max(shake, clamp(crash / 30, .1, .5)); puff(c.x + Math.sin(c.h) * 2, .7, c.z + Math.cos(c.h) * 2, 4, .5); }
    }
    // car vs car: two circles each
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j]; if (Math.abs(a.x - b.x) > 5 || Math.abs(a.z - b.z) > 5 || Math.abs(a.y - b.y) > 1.2) continue;
      for (const ka of [1.05, -1.05]) for (const kb of [1.05, -1.05]) {
        const ax = a.x + Math.sin(a.h) * ka, az = a.z + Math.cos(a.h) * ka, bx = b.x + Math.sin(b.h) * kb, bz = b.z + Math.cos(b.h) * kb, dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
        if (d >= 2.15 || d < 1e-4) continue;
        const nx = dx / d, nz = dz / d, pen = (2.15 - d) / 2; a.x -= nx * pen; a.z -= nz * pen; b.x += nx * pen; b.z += nz * pen;
        const vn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (vn < 0) { const j2 = -1.3 * vn / 2; a.vx -= nx * j2; a.vz -= nz * j2; b.vx += nx * j2; b.vz += nz * j2;
          if (-vn > 5 && (a === player.car || b === player.car)) { const o = a === player.car ? b : a; sfx.crash(); shake = Math.max(shake, clamp(-vn / 25, .12, .45)); puff((ax + bx) / 2, .8, (az + bz) / 2, 5, .5); if (o.ramT <= 0) { o.ramT = 2; o.stun = 1.6; crime(o.police ? 1.8 : .8, o.police ? 'rammed a police car' : 'rammed a car'); } }
        }
      }
    }
    // cars vs people: fast cars knock people out, slow ones nudge them aside
    for (const c of cars) {
      if (c.speed < .5 || c.y > 1.2) continue;
      for (const p of people) {
        if (p.state === 'ko' || p.state === 'gone' || (p === person && player.car) || p.state === 'down') continue;
        const ox = p.x - c.x, oz = p.z - c.z, fx = Math.sin(c.h), fz = Math.cos(c.h), along = ox * fx + oz * fz, side = ox * -fz + oz * fx;
        if (Math.abs(along) > 2.4 || Math.abs(side) > 1.4 || p.y > 1.2) continue;
        const push = 1.45 - Math.abs(side), sg = Math.sign(side) || 1; p.x += -fz * sg * push; p.z += fx * sg * push;
        if (c.speed > 6) {
          p.vx = c.vx * .6 - fz * sg * 4; p.vz = c.vz * .6 + fx * sg * 4;
          if (p === person) { hurtPlayer(c.speed * 1.4, c.police ? 'a police car' : 'a car'); person.vy = 4; }
          else if (c === player.car) { p.hp = 0; knockOut(p, 'car'); }
          else if (c.police && p.kind === 'civ') { /* cops brake for pedestrians */ }
        }
      }
    }
  }
  function updateWanted(dt) {
    if (state !== 'play') return;
    const tgt = player.car || person;
    // assign foot chasers
    assignT -= dt;
    if (assignT <= 0) { assignT = .8; const n = FOOT_N[stars]; const live = cops.filter((c) => c.state !== 'ko' && c.state !== 'gone' && c.root).sort((a, b) => Math.hypot(a.x - tgt.x, a.z - tgt.z) - Math.hypot(b.x - tgt.x, b.z - tgt.z));
      live.forEach((c, i) => { const ch = i < n; if (ch && c.state !== 'chase') { c.state = 'chase'; c.routeT = 0; } else if (!ch && c.state === 'chase') { c.state = 'patrol'; c.goal = null; } if (ch && Math.hypot(c.x - tgt.x, c.z - tgt.z) > 70) { for (let tries = 0; tries < 20; tries++) { const a = rnd(0, TAU), r = rnd(30, 45), x = tgt.x + Math.cos(a) * r, z = tgt.z + Math.sin(a) * r; if (Math.abs(x) > EDGE - 8 || Math.abs(z) > EDGE - 8) continue; const o = { x, z }; if (pushOut(o, .5)) continue; c.x = x; c.z = z; break; } } }); }
    if (stars > 0) {
      wantedT += dt; if (stars === 5) maxT += dt;
      seen = false;
      for (const c of cops) if (c.state === 'chase' && c.root) { const d = Math.hypot(c.x - tgt.x, c.z - tgt.z); if (d < 12 || (d < 50 && los(c, tgt))) { seen = true; break; } }
      if (!seen) for (const c of cars) if (c.police && c.mode === 'chase' && c.driver === 'police') { const d = Math.hypot(c.x - tgt.x, c.z - tgt.z); if (d < 12 || (d < 55 && los(c, tgt))) { seen = true; break; } }
      if (seen) unseenT = 0; else { unseenT += dt; if (unseenT >= 20) { unseenT = 0; setStars(stars - 1); heat = stars ? HEAT[stars - 1] : 0; if (!stars) { sfx.lost(); toast('You lost the cops. Stars cleared.'); feed('the agents <em>lost your trail</em>'); } else toast(`Cooling off: ${stars} star${stars > 1 ? 's' : ''}`); } }
      starBox.classList.toggle('blink', !seen);
      // busted: a cop on foot grabs you when you're on foot, or you're boxed in at low speed in a car
      let grab = false;
      if (!player.car) { for (const c of cops) if (c.state === 'chase' && Math.hypot(c.x - person.x, c.z - person.z) < 1.25) grab = true; }
      else if (player.car.speed < 2.5) { for (const c of cops) if (c.state === 'chase' && Math.hypot(c.x - player.car.x, c.z - player.car.z) < 3) grab = true; for (const c of cars) if (c.police && c.mode === 'chase' && c !== player.car && Math.hypot(c.x - player.car.x, c.z - player.car.z) < 4.6) grab = true; }
      bustT = grab ? bustT + dt : Math.max(0, bustT - dt * 1.5);
      if (bustT > (player.car ? 1.6 : .9)) { bustT = 0; busted(); }
    } else { starBox.classList.remove('blink'); bustT = 0; seen = false; }
    bustEl.style.display = bustT > .05 ? 'block' : 'none'; bustBar.style.width = `${clamp(bustT / (player.car ? 1.6 : .9), 0, 1) * 100}%`;
  }
  function updateFx(dt) {
    for (const t of tracers) if (t.life > 0) { t.life -= dt; t.m.material.opacity = clamp(t.life / .09, 0, 1); if (t.life <= 0) t.m.visible = false; }
    for (const f of flashes) if (f.life > 0) { f.life -= dt; if (f.life <= 0) f.s.visible = false; }
    for (const b of bursts) if (b.life > 0) { b.life -= dt; b.v.y -= 16 * dt; b.s.position.addScaledVector(b.v, dt); if (b.s.position.y < .2) { b.s.position.y = .2; b.v.y *= -.4; b.v.x *= .7; b.v.z *= .7; } b.s.material.opacity = clamp(b.life * 2, 0, 1); b.s.material.rotation += dt * 4; if (b.life <= 0) b.s.visible = false; }
    for (const p of puffs) if (p.life > 0) { p.life -= dt; const k = 1 - p.life / p.max; p.m.position.addScaledVector(p.v, dt); p.m.scale.setScalar(p.s0 * (.4 + k * 1.1)); p.m.material.opacity = (1 - k) * .85; if (p.life <= 0) p.m.visible = false; }
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.life -= dt; if (b.life <= 0 || !b.p.root?.visible) { b.d.remove(); bubbles.splice(i, 1); continue; } tmpV.set(b.p.x, (b.p.top || 1.8) + 1.25, b.p.z).project(camera); if (tmpV.z > 1) { b.d.style.display = 'none'; continue; } b.d.style.display = ''; b.d.style.left = `${(tmpV.x * .5 + .5) * wrap.clientWidth}px`; b.d.style.top = `${(-tmpV.y * .5 + .5) * wrap.clientHeight}px`; b.d.style.opacity = clamp(b.life * 3, 0, 1); }
    coin.rotation.y += dt * 1.6; badge.rotation.y -= dt * .8;
    for (const c of clouds) { c.position.x += dt * 1.2; if (c.position.x > 400) c.position.x = -400; }
    water.material.color.setHSL(.53, .65, .7 + Math.sin(T * .6) * .015);
  }
  function syncVisuals(dt) {
    for (const p of people) {
      if (!p.root || p.state === 'ko' || p.state === 'gone') continue;
      if (p === person && (player.car || person.state === 'down')) continue;
      p.root.position.set(p.x, groundAt(p.x, p.z) + p.y, p.z); p.root.rotation.y = p.h;
      const u = p.u, sp = p === person ? Math.hypot(person.vx, person.vz) : p.speed || 0, sc = p.root.scale.x || 1;
      if (p.kind === 'civ' && !p.root.visible) continue;
      if (u) { u.walk = lerp(u.walk || 0, sp > .2 ? clamp(sp / 3.3, .7, 1.45) : 0, Math.min(1, dt * 8)); if (sp > .2) u.walkPhase += dt * Math.min(u.strideFor ? sp / (u.strideFor(Math.max(.7, u.walk)) * sc) : sp * 3.1, 26); try { u.update?.(T, dt); } catch {}
        if (u.pose && (p.pose || p.waveT > 0)) p.root.position.y += u.pose(p.pose || 'wave', T + p.seed * 1.7) * sc; }
      if (p.flash > 0) flashMats(p.root, .8); else if (p.flash > -dt * 1.5) flashMats(p.root, 0);
    }
    if (person.root && player.punchT > 0 && !player.car) { const k = Math.sin((player.punchT / .28) * Math.PI); person.root.position.x += Math.sin(person.h) * k * .25; person.root.position.z += Math.cos(person.h) * k * .25; person.root.rotation.y += k * .4; }
    for (const c of cars) carVisual(c, dt);
  }
  let canT = 0;
  function updateCamera(dt) {
    const c = player.car, p = c || person; dragT += dt;
    if (c && dragT > 1.4 && c.speed > 2 && !locked) { const back = c.vf < -1 ? c.h + Math.PI : c.h; camYaw += angDiff(camYaw, back) * Math.min(1, dt * 2.5); }
    else if (c && locked && dragT > 2.5 && c.speed > 4) { camYaw += angDiff(camYaw, c.vf < -1 ? c.h + Math.PI : c.h) * Math.min(1, dt * 1.2); }
    const onFoot = !c && person.state !== 'down';
    const tY = (c ? 1.4 + (c.y || 0) : 1.55) + (person.state === 'down' ? -.8 : 0) + (c ? 0 : person.y * .6), dist = c ? Math.max(camDist, 9.5) + c.speed * .08 : camDist;
    // over the shoulder on foot: the look point sits to the right of the player
    const sh = onFoot ? .8 : 0, rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    const look = tmpV.set(p.x + rx * sh, groundAt(p.x, p.z) + tY, p.z + rz * sh);
    const want = tmpV2.set(look.x - Math.sin(camYaw) * Math.cos(camPitch) * dist, look.y + Math.sin(camPitch) * dist + (onFoot ? .1 : .5), look.z - Math.cos(camYaw) * Math.cos(camPitch) * dist);
    // pull in when a building is between camera and player
    const ddx = want.x - look.x, ddz = want.z - look.z, L = Math.hypot(ddx, ddz); if (L > .1) { const th = rayBoxes(look.x, look.z, ddx / L, ddz / L, L); if (th < L) { const k = Math.max(.25, (th - .6) / L); want.x = look.x + ddx * k; want.z = look.z + ddz * k; want.y = lerp(look.y, want.y, k); } }
    if (want.y < .5) want.y = .5;
    if (camPos.lengthSq() === 0) camPos.copy(want); camPos.lerp(want, Math.min(1, dt * (c ? 6 : 18))); camLook.lerp(look, Math.min(1, dt * (c ? 14 : 30))); if (camLook.lengthSq() === 0) camLook.copy(look);
    camera.position.copy(camPos); shake *= Math.exp(-dt * 7); if (shake > .005) camera.position.add(tmpV2.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake));
    camera.lookAt(camLook);
    const baseFov = camera.aspect < 1 ? 72 : 60;
    if (c) { camera.fov = lerp(camera.fov, (camera.aspect < 1 ? 74 : 62) + c.speed * .35 + (c.nitroOn ? 12 : 0), Math.min(1, dt * 3)); camera.updateProjectionMatrix(); }
    else if (Math.abs(camera.fov - baseFov) > .05) { camera.fov = lerp(camera.fov, baseFov, Math.min(1, dt * 3)); camera.updateProjectionMatrix(); }
    sun.position.set(Math.round(p.x) + 40, 70, Math.round(p.z) + 28); sun.target.position.set(Math.round(p.x), 0, Math.round(p.z)); sun.target.updateMatrixWorld();
    // hide palm/tree canopies that sit between the camera and the player, fade name tags right next to the camera
    canT -= dt; if (canT <= 0) { canT = .1; const cx = camera.position.x, cz = camera.position.z, lx = p.x - cx, lz = p.z - cz, LL = Math.hypot(lx, lz) || 1;
      for (const q of canopies) { const ox = q.x - cx, oz = q.z - cz; let hide = false; if (Math.abs(ox) < 16 && Math.abs(oz) < 16) { const t = clamp((ox * lx + oz * lz) / LL, 0, LL), px = cx + lx / LL * t - q.x, pz = cz + lz / LL * t - q.z; hide = Math.hypot(px, pz) < 3 && camera.position.y < q.top + 4 || Math.hypot(ox, oz) < 3.2; }
        if (hide !== !!q.hidden) { q.hidden = hide; q.idx.forEach((k, n) => q.m.setMatrixAt(k, hide ? ZERO : q.mats[n])); q.m.instanceMatrix.needsUpdate = true; } } }
    for (const cp of cops) if (cp.tag) { const d = camera.position.distanceTo(cp.root.position); cp.tag.material.opacity = clamp((d - 3) / 3, 0, 1); cp.tag.visible = d > 3; }
    others.forEach((o) => { if (o.tag && o.root) { const d = camera.position.distanceTo(o.root.position); o.tag.material.opacity = clamp((d - 3) / 3, 0, 1); o.tag.visible = d > 3; } });
  }
  let hudT = 0;
  function updateHud(dt) {
    hudT -= dt; if (hudT > 0) return; hudT = .05;
    hpBar.style.width = `${person.hp}%`; hpNum.textContent = Math.ceil(person.hp); hpEl.classList.toggle('low', person.hp < 35);
    hurtT -= .05; hurtEl.style.opacity = hurtT > 0 ? Math.min(1, hurtT * 2.5) : person.hp < 25 && state === 'play' ? .35 + Math.sin(T * 6) * .15 : 0;
    const w = weapon(); if (lastW !== wIdx) { lastW = wIdx; drawWeaponIcon(); wpnName.textContent = w.name; }
    wpnAmmo.innerHTML = reloadT > 0 ? '<small>reloading…</small>' : `${ammo[wIdx]} <small>/ ${w.mag}</small>`;
    statsEl.innerHTML = `<span>$AUDACITY <b>${heatCoins}</b></span><span>Cops <b>${koCount}</b></span><span>5★ <b>${fmtT(maxT)}</b></span><span>Best <b>${best.score || 0}</b></span>`;
    if (player.car) { nitroEl.style.display = 'flex'; nitroBar.style.width = `${nitro * 100}%`; nitroEl.classList.toggle('on', !!player.car.nitroOn); } else nitroEl.style.display = 'none';
    raceEl.style.display = race.on ? 'flex' : 'none'; if (race.on) raceEl.innerHTML = `RACE <b>${fmtR(race.t)}</b><span>ring ${race.i + 1}/${RACE_CP.length}${race.best ? ` · best ${fmtR(race.best)}` : ''}</span>`;
    { const p = player.car || person, d = districtAt(p.x, p.z); if (d !== areaEl._d) { areaEl._d = d; const n = DIST_NAME[d].replace(/^the /, ''); areaEl.textContent = n.charAt(0).toUpperCase() + n.slice(1); } }
    // crosshair: dead centre with a mouse (that is exactly where shots go), projected on touch
    if (!player.car && state === 'play' && !mobile) { crossEl.style.display = ''; crossEl.style.left = '50%'; crossEl.style.top = '50%'; }
    else if (!player.car && state === 'play') { tmpV.set(person.x + Math.sin(camYaw) * 18, 1.1, person.z + Math.cos(camYaw) * 18).project(camera); crossEl.style.display = ''; crossEl.style.left = `${(tmpV.x * .5 + .5) * 100}%`; crossEl.style.top = `${(-tmpV.y * .5 + .5) * 100}%`; } else crossEl.style.display = 'none';
    let pr = '';
    if (state === 'play') { if (player.car) pr = mobile ? 'Tap <kbd>CAR</kbd> to get out' : '<kbd>E</kbd> get out · <kbd>Space</kbd> handbrake'; else { const c = nearestCar(); if (c) pr = mobile ? `Tap <kbd>CAR</kbd> to ${c.police ? 'steal the police car' : 'drive'}` : `<kbd>E</kbd> ${c.police ? 'steal the police car' : c.driver === 'traffic' ? 'carjack' : 'drive'}`; } }
    if (state === 'play' && !race.on && race.cd <= 0) { const p = player.car || person, d = Math.hypot(p.x - RACE_START.x, p.z - RACE_START.z); if (d < 16) pr = player.car ? 'Drive through the <b>RACE</b> arch to start a time trial' : pr || 'Grab a car and drive through the <b>RACE</b> arch'; }
    promptEl.style.display = pr ? 'block' : 'none'; if (pr && promptEl._v !== pr) { promptEl.innerHTML = pr; promptEl._v = pr; }
    drawMap();
  }

  // ---------------------------------------------------------------- loop
  let raf = 0, last = 0, closed = false;
  function step(dt, rdt = dt) {
    T += dt; stepLoot(dt); stepRush(dt); stepRace(dt); stepMusic(rdt);
    for (const d of ducks) { d.a += dt * .25; d.g.position.set(pond.x + Math.cos(d.a) * d.r, .23 + Math.sin(T * 2 + d.a) * .03, pond.z + Math.sin(d.a) * d.r); d.g.rotation.y = -d.a; }
    if (state === 'play' || state === 'busted' || state === 'down') updatePlayer(dt);
    updateCars(dt); updatePeople(dt); updateWanted(dt);
    if (person.state === 'down' && person.root) koAnim(person, dt);
    if ((state === 'busted' || state === 'down') && cardT > 0) { cardT -= dt; if (cardT <= 0) showCard(state); }
    syncVisuals(dt); updateFx(dt); updateCamera(dt); updateHud(dt);
    stepOthers(dt); stepHeat(dt);
    const near = Math.min(...cars.filter((c) => c.siren).map((c) => Math.hypot(c.x - person.x, c.z - person.z)), 999);
    loopsSet(near < 999, clamp(1 - near / 70, 0, 1), !!player.car, player.car ? clamp(player.car.speed / 25, 0, 1) : 0);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (paused) { last = 0; return; }
    const dt = Math.min(.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
    slowT -= dt; timeScale = lerp(timeScale, slowT > 0 ? .33 : 1, Math.min(1, dt * 9));
    if (ready) step(dt * timeScale, dt);
    renderer.render(scene, camera);
  }
  // ---------------------------------------------------------------- multiplayer: everyone in Auda City sees each other
  // (the live presence service, room "getaway"; d = 1 means that player is driving)
  const others = new Map(); let live = null, Pmod = null, liveT = 0, myId = null, lastHitBy = null, lastHitAt = 0, pvpKo = 0;
  const otherCar = (color) => { const g = new THREE.Group(); mesh(geo(new THREE.BoxGeometry(2, .8, 4)), gloss(color), 0, .7, 0, g); mesh(geo(new THREE.BoxGeometry(1.7, .6, 2)), gloss('#dff3ff'), 0, 1.35, -.2, g); for (const [x, z] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) mesh(geo(new THREE.CylinderGeometry(.42, .42, .3, 14)).rotateZ(Math.PI / 2), std('#2c2c34'), x, .42, z, g); return g; };
  function otherRoot(o) {
    if (o.root) { scene.remove(o.root); o.root = null; }
    const g = new THREE.Group(); let body = null;
    try { if (Pmod?.buildPerson) body = Pmod.buildPerson(o.look && Object.keys(o.look).length ? o.look : Pmod.DEFAULT_LOOK, { lite: true }); } catch {}
    if (!body) body = makeBlob('#9b7cf0').root;
    g.add(body); o.u = body.userData?.creature;
    o.car = otherCar(hexOk(o.look?.hoodie) ? o.look.hoodie : '#ff9ec0'); o.car.visible = false; g.add(o.car);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(o.name || 'player', '#8f7cf2'), transparent: true, depthWrite: false })); track(tag.material); tag.scale.set(2.6, .57, 1); tag.position.y = 2.3; g.add(tag); o.tag = tag; o.body = body;
    scene.add(g); o.root = g;
  }
  (async () => {
    const url = window.AA_LIVE || 'wss://live-production-a047.up.railway.app/live';
    try { [Pmod] = await Promise.all([import('../person3d.js')]); const L = await import('../live.js'); if (closed) return;
      live = L.joinLive(url, { look: me.look || {}, name: (me.name && me.name !== 'You') ? me.name : '',
        onHi: (m) => { myId = m.id; setTimeout(() => live?.pvp({ t: 'coinsync' }), 1500); },
        onPvp: (m) => onPvp(m),
        onPeer: (m) => { const o = others.get(m.id) || { id: m.id, here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, v: 0, d: 0 }; const key = JSON.stringify(m.look); o.name = m.name; if (o.key !== key) { o.key = key; o.look = m.look; otherRoot(o); } others.set(m.id, o); },
        onLeave: (id) => { const o = others.get(id); if (o?.root) scene.remove(o.root); others.delete(id); },
        onState: (list) => { const seen = new Set(); for (const [id, x, z, h, v, j = 0, d = 0] of list) { const o = others.get(id); if (!o) continue; seen.add(id); if (!o.here) { o.x = x; o.z = z; o.h = h; } o.here = true; o.tx = x; o.tz = z; o.th = h; o.v = v; o.d = d; } others.forEach((o, id) => { if (!seen.has(id)) o.here = false; }); } });
    } catch (e) { console.warn('getaway: multiplayer off', e); }
  })();
  function onPvp(m) {
    if (m.t === 'coins') { window.__heatShared?.(m); return; }
    if (m.t === 'hit') { if (state !== 'play' || person.state === 'down') return; lastHitBy = m.from; lastHitAt = performance.now(); hurtPlayer(m.dmg, m.name || 'a player'); }
    else if (m.t === 'fx') { const a = m.a || []; if (a.length === 4) tracer(new THREE.Vector3(a[0], 1.1, a[1]), new THREE.Vector3(a[2], 1.1, a[3]), '#ffb3c7'); }
    else if (m.t === 'ko') { const o = others.get(m.id); if (o?.root) puff(o.x, 1.1, o.z, 10, .5, '#ffe7f0', 1.2);
      if (m.by && m.by === myId) { pvpKo++; koCount++; feed(`you knocked out <b>${esc(m.name || 'a player')}</b> · player`); sfx.ko(); }
      else if (m.id !== myId) feed(`<b>${esc(m.byName || 'someone')}</b> knocked out <b>${esc(m.name || 'a player')}</b>`); }
  }
  function stepOthers(dt) {
    if (live && (liveT -= dt) <= 0) { liveT = .1; const o = player.car || person; live.at('getaway', o.x, o.z, o.h || 0, player.car ? Math.abs(player.car.speed || 0) : Math.hypot(person.vx || 0, person.vz || 0), 0, player.car ? 1 : 0); }
    const k = Math.min(1, dt * 10);
    others.forEach((o) => { if (!o.root) return; o.root.visible = o.here; if (!o.here) return;
      if (Math.hypot(o.tx - o.x, o.tz - o.z) > 8) { o.x = o.tx; o.z = o.tz; } else { o.x += (o.tx - o.x) * k; o.z += (o.tz - o.z) * k; }
      let dh = o.th - o.h; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU; o.h += dh * k;
      o.root.position.set(o.x, 0, o.z); o.body.rotation.y = o.h; o.car.rotation.y = o.h; o.body.visible = !o.d; o.car.visible = !!o.d; o.tag.position.y = o.d ? 2.6 : 2.3;
      if (o.u) { o.u.walk = o.v > .3 && !o.d ? Math.min(1.4, o.v / 3) : 0; if (o.v > .3) o.u.walkPhase = (o.u.walkPhase || 0) + dt * o.v * 3; try { o.u.update?.(performance.now() / 1000, dt); } catch {} } });
  }
  // $AUDACITY coins (in-game points, not real tokens): spinning coins on the streets; run or drive through them; get knocked
  // out and you drop half for others to grab
  let heatCoins = 0; const heatPicks = [];
  { const tex = track(new THREE.TextureLoader().load(new URL('./art/world/heat-icon.png', import.meta.url).href)); tex.colorSpace = THREE.SRGBColorSpace;
    const hm = track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })), rim = gloss('#ffcf3a'), cg = geo(new THREE.CylinderGeometry(.62, .62, .12, 28)), fg = geo(new THREE.CircleGeometry(.56, 28));
    const makeCoin = (x, z, dropped = false) => { const g = new THREE.Group(); const body = new THREE.Mesh(cg, rim); body.rotation.x = Math.PI / 2; g.add(body); for (const sd of [1, -1]) { const f = new THREE.Mesh(fg, hm); f.position.z = sd * .065; if (sd < 0) f.rotation.y = Math.PI; g.add(f); } g.position.set(x, 1.1, z); scene.add(g); heatPicks.push({ g, x, z, t: Math.random() * 6, gone: 0, dropped }); };
    for (let i = 0; i < 130; i++) { let x, z, k = 0; do { x = rnd(-EDGE + 3, EDGE - 3); z = rnd(-EDGE + 3, EDGE - 3); } while ((!isRoad(x, z) || rampAt(x, z)) && ++k < 50); makeCoin(x, z); }
    window.__heatMake = makeCoin;
    window.__heatDrop = (x, z, n) => { if (live) live.pvp({ t: 'drop', x, z, n }); else for (let i = 0; i < n; i++) makeCoin(x + rnd(-3, 3), z + rnd(-3, 3), true); };
    // shared drops from the server: id -> coin
    window.__heatShared = (m) => { (m.all || m.add || []).forEach(([id, x, z]) => { if (heatPicks.some((c) => c.sid === id)) return; makeCoin(x, z, true); heatPicks[heatPicks.length - 1].sid = id; });
      (m.del || []).forEach((id) => { const i = heatPicks.findIndex((c) => c.sid === id); if (i >= 0) { const c = heatPicks[i]; puff(c.x, 1.1, c.z, 4, .3, '#ffe27a', .8); scene.remove(c.g); heatPicks.splice(i, 1); } if (m.by === myId) heatCoins++; }); };
  }
  function stepHeat(dt) {
    const src = player.car || person, r = player.car ? 2.6 : 1.5;
    for (let i = heatPicks.length - 1; i >= 0; i--) { const c = heatPicks[i]; c.t += dt;
      if (c.gone > 0) { c.gone -= dt; c.g.visible = false; continue; }
      const far = Math.abs(c.x - src.x) > 120 || Math.abs(c.z - src.z) > 120; c.g.visible = !far; if (far) continue;
      c.g.rotation.y = c.t * 2.4; c.g.position.y = 1.1 + Math.sin(c.t * 3) * .15;
      if (c.sid) { if (!c.asked && state === 'play' && person.state !== 'down' && Math.hypot(c.x - src.x, c.z - src.z) < r) { c.asked = true; live?.pvp({ t: 'grab', id: c.sid }); setTimeout(() => { c.asked = false; }, 1500); } continue; }
      if (state === 'play' && person.state !== 'down' && Math.hypot(c.x - src.x, c.z - src.z) < r) { heatCoins++; sfx.coin?.(); puff(c.x, 1.1, c.z, 4, .3, '#ffe27a', .8);
        if (c.dropped) { scene.remove(c.g); heatPicks.splice(i, 1); } else { c.g.visible = false; c.gone = 25; } }
    }
  }
  // ---------------------------------------------------------------- loot crates, AUDACITY RUSH, the checkpoint race, radio + jingles
  const crates = [];
  { const bg = geo(new RoundedBoxGeometry(1.3, 1.1, 1.3, 3, .16)), rg1 = geo(new THREE.BoxGeometry(1.34, 1.14, .24)), rg2 = geo(new THREE.BoxGeometry(.24, 1.14, 1.34)), bow = geo(new THREE.SphereGeometry(.22, 10, 8));
    for (let k = 0; k < 12; k++) { const g = new THREE.Group(); mesh(bg, gloss(pick(['#c9a6ff', '#8cc8ff', '#ff9ec0', '#7fd6c2'])), 0, .55, 0, g); mesh(rg1, gloss('#ffcf4a'), 0, .55, 0, g, false); mesh(rg2, gloss('#ffcf4a'), 0, .55, 0, g, false); for (const sx of [-1, 1]) mesh(bow, gloss('#ff6b81'), sx * .18, 1.18, 0, g, false).scale.set(1, .7, .7);
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false })); track(st.material); st.scale.setScalar(.7); st.position.y = 1.9; g.add(st); scene.add(g); const c = { g, st, on: false, t: 0 }; placeCrate(c); crates.push(c); } }
  function placeCrate(c) {
    for (let tries = 0; tries < 40; tries++) { const i = Math.floor(Math.random() * 8), j = Math.floor(Math.random() * 8); if (special.has(`${i},${j}`)) continue; const x = R[i] + (Math.random() < .5 ? 6.9 : 33.1), z = R[j] + 20 + rnd(-8, 8), o = { x, z };
      if (pushOut(o, 1.1) || crates.some((q) => q !== c && q.on && Math.hypot(q.x - x, q.z - z) < 40)) continue; c.x = x; c.z = z; break; }
    c.on = true; c.g.position.set(c.x, .14, c.z); c.g.visible = true;
  }
  function stepLoot(dt) {
    const src = player.car || person, r = player.car ? 2.9 : 1.7;
    for (const c of crates) {
      if (!c.on) { c.t -= dt; if (c.t <= 0) placeCrate(c); continue; }
      const d = Math.hypot(c.x - src.x, c.z - src.z); c.g.visible = d < 150; if (!c.g.visible) continue;
      c.g.rotation.y += dt * .8; c.st.position.y = 1.9 + Math.sin(T * 3 + c.x) * .15;
      if (d < r && state === 'play' && person.state !== 'down') { const n = 8 + Math.floor(Math.random() * 13); heatCoins += n; nitro = 1; c.on = false; c.t = 45; c.g.visible = false; sfx.loot(); burst(c.x, 1, c.z, 16); toast(`<span style="color:#b48cff">LOOT!</span> +${n} $AUDACITY · nitro refilled`); }
    }
  }
  // AUDACITY RUSH: every ~2 minutes a golden pile drops somewhere, marked on the map with a light beam
  const rush = { t: 70, on: false, x: 0, z: 0, life: 0, g: new THREE.Group() };
  { const cg = geo(new THREE.CylinderGeometry(.55, .55, .14, 20)), cm = std('#ffcf4a', { metalness: .6, roughness: .25, emissive: '#a36b00', emissiveIntensity: .45 });
    for (let lv = 0; lv < 6; lv++) { const n = 12 - lv * 2; for (let k = 0; k < n; k++) { const a = k / n * TAU + lv, rr = (5 - lv) * .32; const m = mesh(cg, cm, Math.cos(a) * rr, .1 + lv * .16, Math.sin(a) * rr, rush.g, false); m.rotation.set(rnd(-.3, .3), 0, rnd(-.3, .3)); } }
    const beam = new THREE.Mesh(geo(new THREE.CylinderGeometry(1.3, 1.3, 80, 16, 1, true)), basic('#ffd34a', { transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.y = 40; rush.g.add(beam);
    const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, fog: false })); track(st.material); st.scale.setScalar(2.4); st.position.y = 3.2; rush.g.add(st); rush.star = st; rush.g.visible = false; scene.add(rush.g); }
  function startRush() {
    const src = player.car || person; let x = 0, z = 0;
    for (let tries = 0; tries < 60; tries++) { const beach = Math.random() < .15; x = beach ? rnd(180, 192) : pick(R) + (Math.random() < .5 ? 0 : 0); z = rnd(-EDGE + 8, EDGE - 8); if (!beach && Math.random() < .5) [x, z] = [z, pick(R)]; const d = Math.hypot(x - src.x, z - src.z); if (d > 70 && d < 175 && !rampAt(x, z)) break; }
    Object.assign(rush, { on: true, x, z, life: 60 }); rush.g.position.set(x, groundAt(x, z), z); rush.g.visible = true; sfx.rush();
    const where = DIST_NAME[districtAt(x, z)]; feed(`<b>AUDACITY RUSH!</b> a golden pile dropped in <em>${where}</em>`); toast(`<span style="color:#e0a020">★ AUDACITY RUSH ★</span> golden $AUDACITY in ${where} · 60 s`, 3200);
  }
  function stepRush(dt) {
    if (state !== 'play') return;
    if (!rush.on) { rush.t -= dt; if (rush.t <= 0) startRush(); return; }
    rush.life -= dt; rush.g.rotation.y += dt * .6; rush.star.position.y = 3.2 + Math.sin(T * 3) * .3; rush.star.material.rotation += dt;
    const src = player.car || person;
    if (person.state !== 'down' && Math.hypot(rush.x - src.x, rush.z - src.z) < (player.car ? 3.4 : 2.2)) {
      heatCoins += 50; rush.on = false; rush.g.visible = false; rush.t = rnd(110, 130); sfx.loot(); sfx.rush(); for (let k = 0; k < 3; k++) burst(rush.x + rnd(-1, 1), 1.2, rush.z + rnd(-1, 1), 18);
      stuntEl.innerHTML = 'AUDACITY RUSH +50<small>the golden pile is yours · the cops noticed</small>'; stuntEl.classList.remove('on'); void stuntEl.offsetWidth; stuntEl.classList.add('on'); feed('you grabbed the <b>AUDACITY RUSH</b> · +50 $AUDACITY'); crime(2.5, 'grabbed the AUDACITY RUSH');
    } else if (rush.life <= 0) { rush.on = false; rush.g.visible = false; rush.t = rnd(110, 130); feed('the <b>AUDACITY RUSH</b> pile vanished'); }
  }
  // the checkpoint race: drive through the RACE arch, hit every ring, back to the arch
  const RACE_CP = [[40, 80], [120, 40], [120, -80], [40, -120], [-80, -120], [-120, -40], [-120, 40], [-80, 120], [-40, 80], [RACE_START.x, RACE_START.z]];
  const race = { on: false, i: 0, t: 0, cd: 0, best: 0 }; try { race.best = +(JSON.parse(localStorage.getItem('aa.getaway.race') || '{}').best) || 0; } catch {}
  const ringM = basic('#ff6b81', { transparent: true, opacity: .85 }), ring2M = basic('#ffcf4a', { transparent: true, opacity: .35 });
  const ring = mesh(geo(new THREE.TorusGeometry(5.4, .32, 10, 40)), ringM, 0, 0, 0, scene, false), ring2 = mesh(geo(new THREE.TorusGeometry(5.4, .22, 8, 40)), ring2M, 0, 0, 0, scene, false); ring.visible = ring2.visible = false;
  const fmtR = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const placeRing = (m, k) => { const [x, z] = RACE_CP[k], [px, pz] = k ? RACE_CP[k - 1] : [RACE_START.x, RACE_START.z]; m.position.set(x, 4.9, z); m.rotation.set(0, Math.atan2(x - px, z - pz), 0); m.visible = true; };
  function stepRace(dt) {
    race.cd -= dt; const src = player.car || person;
    if (!race.on) { if (player.car && race.cd <= 0 && state === 'play' && Math.abs(src.x - RACE_START.x) < 2.5 && Math.abs(src.z - RACE_START.z) < 6) { Object.assign(race, { on: true, i: 0, t: 0 }); placeRing(ring, 0); placeRing(ring2, 1); sfx.go(); toast('<span style="color:#ff6b81">RACE!</span> hit all 10 rings, then back to the arch', 2600); feed('race started · <em>go go go</em>'); } return; }
    if (state !== 'play') { race.on = false; ring.visible = ring2.visible = false; feed('race cancelled'); return; }
    race.t += dt; ring.scale.setScalar(1 + Math.sin(T * 6) * .04);
    const [x, z] = RACE_CP[race.i];
    if (Math.hypot(src.x - x, src.z - z) < 7.5) {
      race.i++;
      if (race.i >= RACE_CP.length) { race.on = false; race.cd = 6; ring.visible = ring2.visible = false; sfx.loot(); const nb = !race.best || race.t < race.best; if (nb) { race.best = race.t; try { localStorage.setItem('aa.getaway.race', JSON.stringify({ best: race.t })); } catch {} } heatCoins += 25;
        stuntEl.innerHTML = `FINISH ${fmtR(race.t)}<small>${nb ? 'new best time!' : `best ${fmtR(race.best)}`} · +25 $AUDACITY</small>`; stuntEl.classList.remove('on'); void stuntEl.offsetWidth; stuntEl.classList.add('on'); feed(`race finished in <b>${fmtR(race.t)}</b>`); }
      else { sfx.cp(); placeRing(ring, race.i); if (race.i + 1 < RACE_CP.length) placeRing(ring2, race.i + 1); else ring2.visible = false; }
    }
  }
  // radio stations (Q in a car) and the ice cream truck jingle
  const RADIO = [
    { name: 'Bubblegum FM', step: .15, type: 'square', mel: [659, 0, 784, 0, 880, 784, 659, 0, 587, 0, 659, 0, 523, 0, 0, 0, 659, 0, 784, 0, 1047, 988, 880, 0, 784, 0, 659, 0, 587, 0, 0, 0], bass: [131, 131, 175, 175, 196, 196, 131, 131, 131, 131, 175, 175, 196, 196, 196, 196] },
    { name: 'Lo-Fi Lagoon', step: .22, type: 'sine', mel: [523, 0, 0, 659, 0, 0, 784, 0, 698, 0, 0, 587, 0, 0, 523, 0, 494, 0, 0, 587, 0, 0, 784, 0, 659, 0, 0, 523, 0, 0, 0, 0], bass: [131, 131, 110, 110, 87, 87, 98, 98] },
  ];
  const ICE = [784, 659, 784, 880, 784, 659, 523, 0, 587, 659, 698, 659, 587, 523, 587, 0];
  let radioT = 0, radioI = 0, jingleT = 0, jingleI = 0;
  function cycleRadio() { radio = (radio + 1) % (RADIO.length + 1); radioI = 0; radioT = 0; feed(radio ? `radio: <em>${RADIO[radio - 1].name}</em>` : 'radio <em>off</em>'); }
  function stepMusic(rdt) {
    if (muted || paused) return;
    if (player.car && radio > 0 && state === 'play') { const st = RADIO[radio - 1]; radioT -= rdt; while (radioT <= 0) { const n = st.mel[radioI % st.mel.length]; if (n) tone(n, st.step * .9, { type: st.type, vol: st.type === 'sine' ? .09 : .035 }); if (radioI % 2 === 0) { const b = st.bass[(radioI >> 1) % st.bass.length]; if (b) tone(b, st.step * 1.8, { type: 'triangle', vol: .08 }); } radioI++; radioT += st.step; } }
    let bd = 1e9, tr = null; for (const c of cars) if (c.icecream) { const d = c === player.car ? 0 : Math.hypot(c.x - person.x, c.z - person.z); if (d < bd) { bd = d; tr = c; } }
    if (tr && bd < 38 && !(player.car === tr && radio > 0)) { const v = 1 - bd / 38; jingleT -= rdt; while (jingleT <= 0) { const n = ICE[jingleI % ICE.length]; if (n) { tone(n, .2, { type: 'sine', vol: .09 * v }); tone(n * 2, .08, { type: 'triangle', vol: .025 * v }); } jingleI++; jingleT += .19; } }
  }
  // the leaderboard: post the run when it ends, show the top 10
  const API = '/api/getaway'; // same-origin: Netlify proxies /api to the agents service
  let topList = null, topOpen = false;
  async function fetchTop() { try { const r = await fetch(`${API}/top`, { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); const a = Array.isArray(j) ? j : Array.isArray(j?.top) ? j.top : null; if (a) topList = a.slice(0, 10); } catch {} return topList; }
  function topHtml() { if (!topList || !topList.length) return '<p style="font-size:13px;color:#9a8fbf">No top players yet.</p>'; return `<ol class="gw-top10">${topList.map((r, i) => `<li><span>${i + 1}</span><b>${esc(String(r.name || 'player').slice(0, 16))}</b><em>${Math.floor(+r.score || 0)}</em></li>`).join('')}</ol>`; }
  let posted = false;
  function postScore() {
    if (posted) return; posted = true; const score = runScore(); if (score <= 0) return;
    try { fetch(`${API}/score`, { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ name: myName, score, cops: koCount, heat: heatCoins, t: Math.round(T) }) }).then(() => fetchTop().then(paintTop)).catch(() => {}); } catch {}
  }
  function paintTop() { topEl.innerHTML = `<div class="hd">Top players <small>T</small></div>${topHtml()}`; const s = modalCard.querySelector('.gw-topcard'); if (s) s.innerHTML = `<div class="hd">Top players</div>${topHtml()}`; }
  fetchTop().then(paintTop);
  document.querySelector('.gw-cacopy')?.addEventListener('click', async (e) => { e.stopPropagation(); const b = e.currentTarget; try { await navigator.clipboard.writeText('J8vePKao82HCFJLY4LZNkehiPKhqifjmBhL64Bskpump'); b.textContent = 'copied!'; } catch { b.textContent = 'J8vePKao82HCFJLY4LZNkehiPKhqifjmBhL64Bskpump'; } setTimeout(() => { b.textContent = 'J8ve…Bskpump'; }, 1600); });
  loadModels().catch((e) => { console.warn('getaway: models', e); ready = true; });
  raf = requestAnimationFrame(loop);

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    try { live?.close(); } catch {}
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur); removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis); document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('mousemove', onMouse); document.removeEventListener('mouseup', onMouseUp); try { if (document.pointerLockElement === cv) document.exitPointerLock(); } catch {}
    try { saveBest(); postScore(); } catch {}
    try { if (sirenNode) { sirenNode.o.stop(); engineNode.o.stop(); } } catch {} try { ac?.close(); } catch {}
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); }); });
    disposables.forEach((d) => d.dispose?.()); envTex.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    wrap.remove();
    try { onClose({ score: runScore(), ko: koCount, best }); } catch {}
  }
  if (tst) {
    tst.peek = () => ({ state, stars, heat: +heat.toFixed(2), hp: Math.round(person.hp), inCar: !!player.car, x: +person.x.toFixed(1), z: +person.z.toFixed(1), car: player.car ? { x: +player.car.x.toFixed(1), z: +player.car.z.toFixed(1), speed: +player.car.speed.toFixed(1) } : null, ko: koCount, civKo, maxT, cops: cops.map((c) => ({ n: c.agent.name, s: c.state, x: Math.round(c.x), z: Math.round(c.z), hp: c.hp })), chasers: cars.filter((c) => c.police && c.mode === 'chase').length, cars: cars.length, ready, ammo: ammo[wIdx], weapon: weapon().id, unseenT: +unseenT.toFixed(1), seen });
    tst.tp = (x, z, h) => { const o = player.car || person; o.x = x; o.z = z; if (h != null) { o.h = h; camYaw = h; } };
    tst.heat = (n) => crime(n, 'test');
    tst.enter = () => { let best = null, bd = 1e9; for (const c of cars) { if (c.police) continue; const d = Math.hypot(c.x - person.x, c.z - person.z); if (d < bd) { bd = d; best = c; } } enterCar(best); guns.forEach((g) => { g.visible = false; }); return !!best; };
    tst.cam = (yaw, pitch, dist) => { camYaw = yaw; if (pitch != null) camPitch = pitch; if (dist != null) camDist = dist; dragT = 0; };
    tst.copNear = (d = 6) => { const c = cops.find((q) => q.state !== 'ko' && q.state !== 'gone'); if (!c) return null; camera.getWorldDirection(aimDir); const hz = Math.hypot(aimDir.x, aimDir.z) || 1, k = Math.hypot(person.x - camera.position.x, person.z - camera.position.z) + d; c.x = camera.position.x + aimDir.x / hz * k; c.z = camera.position.z + aimDir.z / hz * k; c.state = 'chase'; return c.agent.name; };
    tst.hurt = (n) => hurtPlayer(n, 'a test');
    tst.ramp = (k = 0, back = 26) => { const r = RAMPS[k], c = player.car; if (!c) return false; c.x = r.x0 - r.dx * back; c.z = r.z0 - r.dz * back; c.h = Math.atan2(r.dx, r.dz); c.vx = r.dx * 24; c.vz = r.dz * 24; camYaw = c.h; return true; };
    tst.rush = () => { rush.t = 0; }; tst.rushAt = () => (rush.on ? { x: rush.x, z: rush.z } : null);
    tst.race = () => ({ on: race.on, i: race.i, t: race.t, cp: RACE_CP[race.i] }); tst.raceCp = () => RACE_CP;
    tst.crates = () => crates.filter((c) => c.on).map((c) => ({ x: c.x, z: c.z })); tst.nitro = () => nitro; tst.stunts = () => stunts; tst.coins = () => heatCoins;
    tst.civs = () => civs.map((c) => ({ act: c.act, x: Math.round(c.x), z: Math.round(c.z), pose: c.pose, vis: c.root.visible }));
    tst.aim = () => aimPoint(); tst.timeScale = () => timeScale;
    tst.keys = keys; tst.start = startPlay; tst.shoot = shoot; tst.punch = punch; tst.respawn = respawn;
  }
  return { close };
}
