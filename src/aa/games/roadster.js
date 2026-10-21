// Flying Tesla Roadster (id: roadster): fly a cherry-red electric roadster (no maker's logo) with a spacesuit dummy at
// the wheel, high above an endless sea of clouds at sunset. Fly through the glowing ring course against the clock,
// scoop up floating coins, and see every other player's roadster flying live (server/live.mjs carries altitude, roll
// and pitch for the "fly" room). Real players only. Best ring time goes to the leaderboard at /api/roadster.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TITLE = 'Flying Tesla Roadster';
const TAU = Math.PI * 2, FONT = 'Fredoka, system-ui, sans-serif';
const LIM = 200, CEIL = 260, FLOOR = 8; // the sky box (the presence server clamps x/z to ±220)
const SPEED = 46, BOOST = 92;
const NAMES = ['DUVAL', 'CUPSEY', 'BWAM', 'ANSEM', 'MOCHI', 'PIXEL'];
const PAINT = ['#ff6fa8', '#8cc8ff', '#b8e07a', '#ffd166', '#c9a6ff'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = (s) => `${Math.floor(Math.max(0, s) / 60)}:${(Math.max(0, s) % 60).toFixed(2).padStart(5, '0')}`;
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function open({ me = {}, agents = [], onClose = () => {}, _test = null } = {}) {
  if (!me || typeof me !== 'object') me = {};
  const tst = _test && typeof _test === 'object' ? _test : null;
  const myName = String(me.name || 'You').slice(0, 16);
  const mobile = (matchMedia?.('(pointer: coarse)').matches) || innerWidth < 720;
  let closed = false, raf = 0;
  let fpv = true; try { const v = localStorage.getItem('aa.roadster.view'); if (v != null) fpv = v === 'fp'; } catch {}
  const FOVS = [{ n: 'Normal', v: 64, h: 78 }, { n: 'Wide', v: 74, h: 96 }, { n: 'Ultra', v: 84, h: 112 }]; let fovI = mobile ? 1 : 0; try { const v = localStorage.getItem('aa.roadster.fov'); if (v != null) fovI = Math.min(2, Math.max(0, +v)); } catch {}
  let invert = !mobile; try { const v = localStorage.getItem('aa.roadster.invert'); if (v != null) invert = v === '1'; } catch {}

  // ---------------------------------------------------------------- page
  const css = document.createElement('style');
  css.textContent = `
.fr{position:fixed;inset:0;z-index:9000;background:#ffb98a;font-family:${FONT};color:#2c3a4a;user-select:none;-webkit-user-select:none}
.fr canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.fr .card{background:rgba(255,255,255,.9);border-radius:18px;box-shadow:0 8px 24px rgba(90,50,80,.2)}
.fr-top{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:12px;align-items:center;padding:8px 16px;font-weight:700;font-size:15px;white-space:nowrap}
.fr-top b{font-size:21px;color:#d6336c;font-variant-numeric:tabular-nums}
.fr-x{position:absolute;top:12px;right:12px;border:0;width:40px;height:40px;border-radius:50%;font:700 18px ${FONT};color:#3b4a5c;cursor:pointer}
.fr-spd{position:absolute;left:14px;bottom:14px;padding:8px 14px;font-weight:700;font-size:14px}.fr-spd b{font-size:22px;color:#d6336c}
.fr-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-size:13px;font-weight:600;color:#55697c;padding:6px 14px;white-space:nowrap}
.fr-big{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-size:44px;font-weight:700;color:#fff;text-shadow:0 4px 0 rgba(120,40,80,.35),0 10px 24px rgba(120,40,80,.3);opacity:0;transition:opacity .25s;pointer-events:none;text-align:center;white-space:nowrap}.fr-big small{display:block;font-size:19px}
.fr-modal{position:absolute;inset:0;display:grid;place-items:center;background:rgba(255,190,160,.45)}
.fr-modal .card{padding:24px 28px;text-align:center;max-width:430px;width:calc(100% - 32px)}
.fr-modal h1{margin:0 0 6px;font-size:34px;color:#c2255c}.fr-modal p{margin:6px 0;color:#55697c}.fr-modal .num{font-size:48px;font-weight:700;color:#d6336c}
.fr-modal button{border:0;border-radius:999px;padding:12px 24px;margin:12px 5px 0;font:700 16px ${FONT};cursor:pointer;background:#ff5d8f;color:#fff}.fr-modal button.alt{background:#f3eef3;color:#3b4a5c}
.fr-top10{margin:10px 0 0;padding:0;list-style:none;text-align:left;font-size:14px}.fr-top10 li{display:flex;gap:8px;padding:3px 0;border-top:1px solid #f1e6ee}.fr-top10 span{width:20px;color:#a0909c}.fr-top10 b{flex:1}.fr-top10 em{font-style:normal;font-variant-numeric:tabular-nums}
.fr-hp{position:absolute;top:62px;left:50%;transform:translateX(-50%);width:220px;height:12px;padding:3px;border-radius:999px}.fr-hp i{display:block;height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#5dffb0,#7fd6ff);transition:width .15s}
.fr-feed{position:absolute;right:14px;top:62px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;pointer-events:none}.fr-feed div{background:rgba(255,255,255,.88);border-radius:12px;padding:5px 10px;font-size:13px;font-weight:600}
.fr.hurt canvas{filter:saturate(1.4) hue-rotate(-12deg) brightness(1.05)}
.fr-lb{position:absolute;left:14px;top:12px;min-width:190px;padding:10px 12px;font-size:13px}.fr-lb .hd{font-weight:700;color:#c2255c;margin-bottom:6px;display:flex;align-items:center;gap:6px}.fr-lb .hd i{width:8px;height:8px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 0 0 rgba(255,59,92,.6);animation:frp 1.4s infinite}@keyframes frp{to{box-shadow:0 0 0 8px rgba(255,59,92,0)}}
.fr-lb ol{margin:0;padding:0;list-style:none}.fr-lb li{display:flex;gap:8px;padding:3px 0;border-top:1px solid #f1e6ee}.fr-lb li span{width:16px;color:#a0909c}.fr-lb li b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px}.fr-lb li em{font-style:normal;font-weight:700;color:#d6336c}.fr-lb li.me b{color:#d6336c}
.fr.touch .fr-lb{top:auto;bottom:190px;left:12px;min-width:150px;font-size:11px;padding:7px 9px}
.fr-lock{position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border:3px solid #ffd166;border-radius:10px;display:none;pointer-events:none;transition:border-color .15s}.fr-lock span{position:absolute;left:50%;top:-24px;transform:translateX(-50%);font-weight:700;font-size:13px;color:#ffd166;text-shadow:0 1px 3px rgba(0,0,0,.4)}.fr-lock.on{border-color:#ff3b5c}.fr-lock.on span{color:#ff3b5c}
.fr-ms{position:absolute;left:14px;bottom:62px;padding:6px 12px;font-weight:700;font-size:13px}.fr-ms b{color:#d6336c;font-size:18px}
.fr-mslbtn{position:absolute;right:124px;bottom:122px;width:62px;height:62px;border-radius:50%;border:0;background:#ff3b5c;color:#fff;font:700 11px ${FONT};pointer-events:auto;touch-action:none;box-shadow:0 5px 14px rgba(120,30,50,.3)}
.fr-fov{position:absolute;top:12px;right:60px;border:0;height:40px;padding:0 12px;border-radius:999px;font:700 13px ${FONT};color:#3b4a5c;cursor:pointer}
.fr-lb .hd{cursor:pointer}.fr-lb .hd small{margin-left:auto;font-size:11px;color:#a0909c;font-weight:600}
.fr-legal{margin-top:12px;font-size:11px;color:#9a8a96}
.fr-touch{position:absolute;inset:0;pointer-events:none;display:none}.fr.touch .fr-touch{display:block}.fr.touch .fr-hint{display:none}
.fr-joy{position:absolute;left:22px;bottom:44px;width:128px;height:128px;border-radius:50%;background:rgba(255,255,255,.4);box-shadow:0 0 0 2px rgba(255,255,255,.85) inset;pointer-events:auto;touch-action:none}
.fr-joy i{position:absolute;left:39px;top:39px;width:50px;height:50px;border-radius:50%;background:#fff}
.fr-boost{position:absolute;right:24px;bottom:56px;width:88px;height:88px;border-radius:50%;border:0;background:#ff5d8f;color:#fff;font:700 15px ${FONT};pointer-events:auto;touch-action:none;box-shadow:0 6px 16px rgba(120,40,80,.3)}
.fr-fire{position:absolute;right:124px;bottom:40px;width:72px;height:72px;border-radius:50%;border:0;background:#ffd166;color:#5a3a00;font:700 14px ${FONT};pointer-events:auto;touch-action:none;box-shadow:0 6px 16px rgba(120,80,0,.3)}
.fr-roll,.fr-flare{position:absolute;width:58px;height:58px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#3b4a5c;font:700 12px ${FONT};pointer-events:auto;touch-action:none;box-shadow:0 5px 14px rgba(90,50,80,.25)}.fr-roll{right:34px;bottom:156px}.fr-flare{right:104px;bottom:196px}
.fr-view{position:absolute;top:12px;right:178px;border:0;height:40px;padding:0 12px;border-radius:999px;font:700 13px ${FONT};color:#3b4a5c;cursor:pointer}.fr.touch .fr-view{top:98px;right:10px;height:34px;font-size:11px}
.fr.touch .fr-top{left:10px;transform:none;font-size:11px;gap:7px;padding:6px 10px;max-width:calc(100% - 70px)}.fr.touch .fr-top b{font-size:14px}.fr.touch .fr-fov{top:58px;right:10px;height:34px;font-size:11px}.fr.touch .fr-hp{top:100px;width:160px}
.fr.touch .fr-spd{bottom:auto;top:62px}`;
  document.head.appendChild(css);
  const wrap = document.createElement('div'); wrap.className = 'fr'; if (mobile) wrap.classList.add('touch');
  wrap.innerHTML = `<canvas></canvas>
<div class="fr-top card"><span>Rings <b class="rg">0/12</b></span><span>Time <b class="tm">0:00.00</b></span><span>FTR <b class="cn">0</b></span><span>KOs <b class="ko">0</b></span></div><div class="fr-hp card"><i></i></div><div class="fr-feed"></div><div class="fr-lock"><span>LOCK</span></div><div class="fr-ms card">MSL <b class="msn">4</b></div><div class="fr-lb card"><div class="hd"><i></i><span class="lbt">LIVE · in the sky</span><small>tap: all-time</small></div><ol></ol></div>
<div class="fr-spd card">Speed <b class="sp">0</b> km/h</div>
<button class="fr-x card" title="Leave (Esc)">✕</button><button class="fr-fov card" title="Field of view (V)">FOV</button><button class="fr-view card" title="Camera (C)">VIEW</button>
<div class="fr-big"></div>
<div class="fr-hint card">W/↑ dive · S/↓ climb · A/D turn · Shift boost · Space shoot · M missile · B roll · F flares · Esc</div>
<div class="fr-touch"><div class="fr-joy"><i></i></div><button class="fr-boost">BOOST</button><button class="fr-fire">FIRE</button><button class="fr-roll">ROLL</button><button class="fr-mslbtn">MISSILE</button><button class="fr-flare">FLARE</button></div>
<div class="fr-modal"><div class="card"><h1>${TITLE}</h1><p>Fly a cherry-red roadster above the clouds. Hit all 12 rings as fast as you can, grab coins, and race real players in the sky.</p><div class="fr-topcard"></div><button class="go">Fly</button><button class="alt bye">Leave</button><div><button class="alt inv" style="font-size:13px;padding:8px 16px">Controls: …</button><button class="alt vw" style="font-size:13px;padding:8px 16px">View: …</button></div><div class="fr-legal">Fan-made game. Not affiliated with or endorsed by Tesla, Inc.</div></div></div>`;
  document.body.appendChild(wrap);
  const $ = (s) => wrap.querySelector(s);
  const cv = $('canvas'), bigEl = $('.fr-big'), modal = $('.fr-modal'), modalCard = modal.querySelector('.card');

  // ---------------------------------------------------------------- three
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.environment = envTex; scene.environmentIntensity = .7;
  const camera = new THREE.PerspectiveCamera(64, 1, .05, 3000);
  const disposables = []; const track = (d) => { disposables.push(d); return d; };
  // sunset sky dome
  { const g = track(new THREE.SphereGeometry(1500, 32, 16)), m = track(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color('#3f6fd8') }, mid: { value: new THREE.Color('#ff9a8b') }, low: { value: new THREE.Color('#ffd3a5') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > .05 ? mix(mid, top, smoothstep(.05, .55, h)) : mix(low, mid, smoothstep(-.2, .05, h)); gl_FragColor = vec4(c, 1.); }' }));
    scene.add(new THREE.Mesh(g, m)); }
  // the sun, low on the horizon
  const sunDir = new THREE.Vector3(-.55, .12, -.83).normalize();
  { const s = new THREE.Mesh(track(new THREE.SphereGeometry(70, 32, 16)), track(new THREE.MeshBasicMaterial({ color: '#fff1c2', toneMapped: false }))); s.position.copy(sunDir).multiplyScalar(1300); scene.add(s);
    const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(.3, 'rgba(255,190,140,.4)'); g.addColorStop(1, 'rgba(255,150,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; })())), transparent: true, depthWrite: false })));
    glow.scale.set(700, 700, 1); glow.position.copy(s.position); scene.add(glow); }
  scene.fog = new THREE.Fog('#ffc4a8', 260, 1200);
  scene.add(new THREE.HemisphereLight('#ffe6d6', '#8a7aa8', 1.15));
  const sun = new THREE.DirectionalLight('#fff0dd', 2.4); sun.position.copy(sunDir).multiplyScalar(100); scene.add(sun);

  // a sea of clouds below: instanced puffs that follow the player in tiles, so it never ends
  const CLOUD_N = mobile ? 520 : 900, cloudGeo = track(new THREE.IcosahedronGeometry(1, 2)), cloudMat = track(new THREE.MeshStandardMaterial({ color: '#fff4ee', roughness: 1, emissive: '#ffd9c8', emissiveIntensity: .25, flatShading: false }));
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, CLOUD_N); scene.add(clouds);
  const cloudData = Array.from({ length: CLOUD_N }, () => ({ x: rnd(-700, 700), z: rnd(-700, 700), y: rnd(-14, 2), s: rnd(10, 30), sy: rnd(.35, .6) }));
  const dm = new THREE.Object3D();
  function placeClouds(px, pz) { cloudData.forEach((c, i) => { let x = c.x, z = c.z; x = px + ((((x - px) + 700) % 1400) + 1400) % 1400 - 700; z = pz + ((((z - pz) + 700) % 1400) + 1400) % 1400 - 700; dm.position.set(x, c.y, z); dm.scale.set(c.s, c.s * c.sy, c.s); dm.updateMatrix(); clouds.setMatrixAt(i, dm.matrix); }); clouds.instanceMatrix.needsUpdate = true; }
  // a few big floating cloud islands to fly around
  for (let i = 0; i < 14; i++) { const g = new THREE.Group(), n = 5 + Math.floor(Math.random() * 5); for (let k = 0; k < n; k++) { const m = new THREE.Mesh(cloudGeo, cloudMat); m.scale.set(rnd(10, 22), rnd(7, 13), rnd(10, 20)); m.position.set(rnd(-20, 20), rnd(-5, 8), rnd(-20, 20)); g.add(m); } g.position.set(rnd(-LIM, LIM), rnd(50, 170), rnd(-LIM, LIM)); scene.add(g); }

  // ---------------------------------------------------------------- the roadster (no maker's logo)
  function makeRoadster(paint = '#c4122f', withDummy = true) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const car = track(new THREE.MeshPhysicalMaterial({ color: paint, metalness: .55, roughness: .22, clearcoat: 1, clearcoatRoughness: .08 }));
    const black = track(new THREE.MeshStandardMaterial({ color: '#16161a', roughness: .5 })), glass = track(new THREE.MeshPhysicalMaterial({ color: '#1a2230', roughness: .05, metalness: .2, transparent: true, opacity: .55 }));
    const tyre = track(new THREE.MeshStandardMaterial({ color: '#1b1b1f', roughness: .8 })), rim = track(new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: .8, roughness: .3 }));
    const add = (geo, mat, p, s, r) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); body.add(m); return m; };
    // low wedge body: lower tub, rounded nose and tail, side scoops
    add(track(new RoundedBoxGeometry(2.0, .55, 4.3, 4, .26)), car, [0, .55, 0]);
    add(track(new RoundedBoxGeometry(1.86, .42, 1.5, 4, .2)), car, [0, .74, 1.35], null, [-.12, 0, 0]);
    add(track(new RoundedBoxGeometry(1.9, .45, 1.2, 4, .2)), car, [0, .76, -1.45], null, [.08, 0, 0]);
    add(track(new RoundedBoxGeometry(.1, .18, .8, 2, .05)), black, [1.0, .55, -.6]); add(track(new RoundedBoxGeometry(.1, .18, .8, 2, .05)), black, [-1.0, .55, -.6]);
    // windscreen frame + glass, open cockpit, two seats
    add(track(new RoundedBoxGeometry(1.7, .5, .08, 2, .04)), glass, [0, 1.12, .55], null, [-.55, 0, 0]);
    add(track(new RoundedBoxGeometry(1.5, .12, 1.4, 2, .05)), black, [0, .86, -.25]);
    [-.4, .4].forEach((x) => { add(track(new RoundedBoxGeometry(.6, .55, .18, 2, .08)), black, [x, 1.1, -.85], null, [.2, 0, 0]); });
    // lights: thin headlights and a red light bar
    [-.68, .68].forEach((x) => add(track(new RoundedBoxGeometry(.42, .08, .06, 2, .03)), track(new THREE.MeshBasicMaterial({ color: '#fff7e6', toneMapped: false })), [x, .68, 2.15]));
    add(track(new RoundedBoxGeometry(1.6, .07, .05, 2, .02)), track(new THREE.MeshBasicMaterial({ color: '#ff2a4a', toneMapped: false })), [0, .78, -2.15]);
    // wheels
    const wg = track(new THREE.CylinderGeometry(.42, .42, .3, 20)), rg2 = track(new THREE.CylinderGeometry(.24, .24, .32, 12));
    [[-1, 1.35], [1, 1.35], [-1, -1.35], [1, -1.35]].forEach(([sx, z]) => { add(wg, tyre, [sx * .98, .42, z], null, [0, 0, Math.PI / 2]); add(rg2, rim, [sx * 1.0, .42, z], null, [0, 0, Math.PI / 2]); });
    if (withDummy) { // the spacesuit dummy, one arm on the door
      const before = body.children.length;
      const suit = track(new THREE.MeshStandardMaterial({ color: '#f4f4f6', roughness: .6 })), visor = track(new THREE.MeshPhysicalMaterial({ color: '#111', metalness: .6, roughness: .08, clearcoat: 1 }));
      add(track(new RoundedBoxGeometry(.5, .55, .35, 3, .15)), suit, [-.4, 1.25, -.75]);
      add(track(new THREE.SphereGeometry(.26, 20, 14)), suit, [-.4, 1.7, -.72]);
      add(track(new THREE.SphereGeometry(.2, 20, 14, 0, Math.PI)), visor, [-.4, 1.72, -.6], [1, .8, .6]);
      add(track(new RoundedBoxGeometry(.14, .14, .6, 2, .06)), suit, [-.82, 1.12, -.5], null, [0, -.3, 0]);
      body.children.slice(before).forEach((m) => { m.userData.dummy = true; });
    }
    const flame = new THREE.Mesh(track(new THREE.ConeGeometry(.28, 1.4, 14)), track(new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: .0, toneMapped: false })));
    flame.rotation.x = -Math.PI / 2; flame.position.set(0, .7, -2.9); body.add(flame);
    body.traverse((o) => { if (o.isMesh) o.castShadow = false; }); body.scale.setScalar(1.35);
    return { g, body, flame };
  }
  const tagTex = (text, color) => { const c = document.createElement('canvas'); c.width = 512; c.height = 112; const x = c.getContext('2d'); x.font = `700 46px ${FONT}`; const tw = Math.min(492, x.measureText(text).width + 56); x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect((512 - tw) / 2, 14, tw, 80, 40); x.fill(); x.fillStyle = color; x.beginPath(); x.arc((512 - tw) / 2 + 30, 54, 11, 0, TAU); x.fill(); x.fillStyle = '#2c3a4a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 266, 56, tw - 60); const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tagSprite = (text, color) => { const s = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tagTex(text, color), transparent: true, depthWrite: false }))); s.scale.set(7, 1.5, 1); s.position.y = 3.6; return s; };

  // ---------------------------------------------------------------- the player
  const pl = { x: 0, y: 90, z: 120, yaw: Math.PI, pitch: 0, roll: 0, speed: SPEED, boost: 0, ...makeRoadster('#c4122f') };
  scene.add(pl.g);
  // first-person cockpit (owner: show the windscreen and the wheel): frame, pillars, tinted glass, dash, wheel and gloves
  const cockpit = new THREE.Group(); pl.body.add(cockpit); cockpit.visible = false;
  { const frame = track(new THREE.MeshStandardMaterial({ color: '#1a1a1f', roughness: .4, metalness: .3 })), dash = track(new THREE.MeshStandardMaterial({ color: '#232329', roughness: .7 }));
    const glassM = track(new THREE.MeshPhysicalMaterial({ color: '#bfe3ff', transparent: true, opacity: .14, roughness: .05, metalness: 0, depthWrite: false, side: THREE.DoubleSide }));
    const c = (geo, mat, p, r) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (r) m.rotation.set(...r); cockpit.add(m); return m; };
    // windscreen: raked glass between two A-pillars and a header bar
    c(track(new THREE.PlaneGeometry(1.86, .78)), glassM, [0, 1.42, .58], [-.62, Math.PI, 0]);
    [-.95, .95].forEach((x) => c(track(new RoundedBoxGeometry(.07, .9, .07, 2, .03)), frame, [x, 1.4, .57], [-.62, 0, 0]));
    c(track(new RoundedBoxGeometry(1.96, .07, .09, 2, .03)), frame, [0, 1.78, .33]);
    c(track(new RoundedBoxGeometry(1.96, .08, .1, 2, .03)), frame, [0, 1.04, .82]);
    // dashboard with two glowing gauges
    c(track(new RoundedBoxGeometry(1.8, .26, .5, 3, .08)), dash, [0, 1.0, .46], [.15, 0, 0]);
    const gauge = track(new THREE.MeshBasicMaterial({ color: '#7fd8ff', toneMapped: false }));
    [-.58, -.22].forEach((x) => c(track(new THREE.CircleGeometry(.09, 24)), gauge, [x, 1.1, .24], [-.3, Math.PI, 0]));
    // steering wheel in front of the driver (left seat), turned by your steering
    const wheel = new THREE.Group(); wheel.position.set(-.4, 1.2, .08); wheel.rotation.x = -.35; cockpit.add(wheel);
    wheel.add(new THREE.Mesh(track(new THREE.TorusGeometry(.2, .028, 10, 32)), frame));
    [0, 2.1, 4.2].forEach((a) => { const sp = new THREE.Mesh(track(new RoundedBoxGeometry(.03, .2, .02, 1, .01)), frame); sp.rotation.z = a; sp.position.set(Math.sin(a) * .09, Math.cos(a) * .09, 0); wheel.add(sp); });
    wheel.add(new THREE.Mesh(track(new THREE.CylinderGeometry(.05, .05, .04, 16)).rotateX(Math.PI / 2), frame));
    const glove = track(new THREE.MeshStandardMaterial({ color: '#f4f4f6', roughness: .6 }));
    [-.19, .19].forEach((x) => { const g2 = new THREE.Mesh(track(new THREE.SphereGeometry(.055, 12, 10)), glove); g2.position.set(x, .02, .02); wheel.add(g2); });
    pl.wheel = wheel; }

  // ---------------------------------------------------------------- the ring course and coins
  const RING_N = 12, rings = [];
  const ringMat = track(new THREE.MeshBasicMaterial({ color: '#ffd166', toneMapped: false })), ringNext = track(new THREE.MeshBasicMaterial({ color: '#5dffb0', toneMapped: false })), ringDone = track(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .25 }));
  const ringGeo = track(new THREE.TorusGeometry(9, .7, 12, 48));
  for (let i = 0; i < RING_N; i++) { const a = (i / RING_N) * TAU, r = 120 + Math.sin(i * 1.7) * 40, x = Math.sin(a) * r, z = Math.cos(a) * r - 10, y = 70 + Math.sin(i * 1.3) * 40 + (i % 3) * 18;
    const m = new THREE.Mesh(ringGeo, ringMat); m.position.set(x, y, z); m.lookAt(Math.sin(a + .3) * r, y, Math.cos(a + .3) * r - 10); scene.add(m); rings.push({ m, x, y, z, done: false }); }
  const coins = [], coinGeo = track(new THREE.CylinderGeometry(2.4, 2.4, .4, 32)), coinMat = track(new THREE.MeshStandardMaterial({ color: '#ffcf3a', metalness: .9, roughness: .25, emissive: '#ff9f00', emissiveIntensity: .35 }));
  const ftrTex = track(new THREE.TextureLoader().load(new URL('./art/world/ftr-coin.png', import.meta.url).href)); ftrTex.colorSpace = THREE.SRGBColorSpace;
  const ftrFace = track(new THREE.MeshStandardMaterial({ map: ftrTex, metalness: .3, roughness: .35, emissive: '#ffffff', emissiveMap: ftrTex, emissiveIntensity: .35 })), coinMats = [coinMat, ftrFace, ftrFace];
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(coinGeo, coinMats); m.rotation.x = Math.PI / 2; const c = { m, x: rnd(-LIM, LIM), y: rnd(30, 200), z: rnd(-LIM, LIM), t: 0 }; m.position.set(c.x, c.y, c.z); scene.add(m); coins.push(c); }

  // ---------------------------------------------------------------- agents cruising the sky
  const roster = []; // owner: real players only, no bot roadsters
  const bots = roster.map((a, i) => { const r = makeRoadster(PAINT[i % PAINT.length], true); r.g.add(tagSprite(String(a.name || NAMES[i]).toUpperCase().slice(0, 12), PAINT[i % PAINT.length])); scene.add(r.g); return { ...r, name: String(a.name || NAMES[i]).toUpperCase().slice(0, 12), hp: 60, a: rnd(0, TAU), r: rnd(70, 170), y: rnd(60, 180), w: rnd(.08, .16) * (Math.random() < .5 ? -1 : 1), ph: rnd(0, TAU) }; });

  // ---------------------------------------------------------------- input
  const keys = {}; const joy = { x: 0, y: 0, id: null }; let boostHeld = false;
  const onKey = (e) => {
    const down = e.type === 'keydown', k = e.key.toLowerCase();
    if (down && k === 'escape') { e.preventDefault(); close(); return; }
    if (state !== 'play') { if (down && (k === ' ' || k === 'enter')) { e.preventDefault(); start(); } return; }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    keys[k] = down; e.stopPropagation();
    if (down && !e.repeat && k === 'b') doRoll(); if (down && !e.repeat && k === 'f') dropFlares(); if (down && !e.repeat && k === 'm') fireMissile(); if (down && !e.repeat && k === 'v') cycleFov(); if (down && !e.repeat && k === 'c') toggleView();
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const onBlur = () => { for (const k in keys) keys[k] = false; }; addEventListener('blur', onBlur);
  const joyEl = $('.fr-joy'), knob = joyEl.querySelector('i');
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(); let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2); const L = Math.hypot(dx, dy); if (L > 1) { dx /= L; dy /= L; } joy.x = dx; joy.y = dy; knob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`; };
  joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  const bEl = $('.fr-boost'); bEl.addEventListener('pointerdown', (e) => { e.preventDefault(); boostHeld = true; }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => bEl.addEventListener(t, () => { boostHeld = false; }));
  $('.fr-x').addEventListener('click', () => close());
  const fovBtn = $('.fr-fov'), paintFov = () => { fovBtn.textContent = 'FOV · ' + FOVS[fovI].n; }; paintFov();
  const cycleFov = () => { fovI = (fovI + 1) % FOVS.length; try { localStorage.setItem('aa.roadster.fov', String(fovI)); } catch {} paintFov(); };
  fovBtn.addEventListener('click', (e) => { e.stopPropagation(); cycleFov(); });
  const viewBtn = $('.fr-view'), paintView = () => { viewBtn.textContent = fpv ? 'VIEW · cockpit' : 'VIEW · chase'; const v2 = modal.querySelector('.vw'); if (v2) v2.textContent = fpv ? 'View: first person (C)' : 'View: third person (C)'; }; paintView();
  modal.querySelector('.vw')?.addEventListener('click', () => toggleView());
  function toggleView() { fpv = !fpv; try { localStorage.setItem('aa.roadster.view', fpv ? 'fp' : 'chase'); } catch {} paintView(); }
  viewBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleView(); });
  const invBtn = modal.querySelector('.inv'), paintInv = () => { if (invBtn) invBtn.textContent = invert ? 'Controls: flight-sim (up = dive)' : 'Controls: normal (up = climb)'; };
  invBtn?.addEventListener('click', () => { invert = !invert; try { localStorage.setItem('aa.roadster.invert', invert ? '1' : '0'); } catch {} paintInv(); paintHint(); });
  modal.querySelector('.go').addEventListener('click', () => start());
  modal.querySelector('.bye').addEventListener('click', () => close());
  const onResize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', onResize); onResize();

  // ---------------------------------------------------------------- sound
  let ac = null, engine = null;
  const tone = (f, d = .12, type = 'sine', v = .1, slide = 0) => { try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d); } catch {} };
  function startEngine() { try { ac = ac || new AudioContext(); const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = .025; o.connect(f).connect(g).connect(ac.destination); o.start(); engine = { o, g }; } catch {} }

  // ---------------------------------------------------------------- the run
  const ROLL_D = .7; let rollT = 0, rollDir = 1, rollCd = 0, flareCd = 0, dodgeT = 0;
  let state = 'menu', runT = 0, ringI = 0, coinsN = 0, finishT = 0, T = 0, timeScale = 1;
  let best = 0; try { best = +localStorage.getItem('aa.roadster.best') || 0; } catch {}
  const big = (t, s = '', ms = 1300) => { bigEl.innerHTML = `${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}`; bigEl.style.opacity = 1; clearTimeout(big.t); big.t = setTimeout(() => { bigEl.style.opacity = 0; }, ms); };
  function start() {
    if (state === 'play') return;
    modal.style.display = 'none'; state = 'play'; runT = 0; ringI = 0; coinsN = 0; finishT = 0; posted = false;
    Object.assign(pl, { x: 0, y: 90, z: 140, yaw: Math.PI, pitch: 0, roll: 0, speed: SPEED }); hp = 100; deadT = 0; pl.g.visible = true; msl = 4; mslReload = 0;
    rings.forEach((r) => { r.done = false; r.m.material = ringMat; r.m.scale.setScalar(1); }); rings[0].m.material = ringNext;
    coins.forEach((c) => { c.m.visible = true; c.t = 0; });
    if (!engine) startEngine(); big('FLY!', 'follow the green ring', 1100); betty('start', 'Systems online. Weapons hot.', 1);
  }
  function finish() {
    state = 'done'; finishT = runT; tone(523, .3, 'triangle', .12); setTimeout(() => tone(784, .4, 'triangle', .12), 160);
    const nb = !best || finishT < best; if (nb) { best = finishT; try { localStorage.setItem('aa.roadster.best', String(best)); } catch {} }
    postScore();
    modalCard.innerHTML = `<h1>Course done!</h1><div class="num">${fmtT(finishT)}</div><p>${coinsN} FTR${nb ? ' · new best!' : ` · best ${fmtT(best)}`}</p><div class="fr-topcard"><b>Fastest pilots</b>${topHtml()}</div><button class="go">Fly again</button><button class="alt bye">Leave</button><div class="fr-legal">Fan-made game. Not affiliated with or endorsed by Tesla, Inc.</div>`;
    modalCard.querySelector('.go').addEventListener('click', () => { state = 'menu'; start(); }); modalCard.querySelector('.bye').addEventListener('click', () => close());
    setTimeout(() => { if (!closed) modal.style.display = 'grid'; }, 900);
  }

  // ---------------------------------------------------------------- flight
  const fwd = new THREE.Vector3(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
  function stepPlayer(dt) {
    const up = (invert ? 1 : -1) * ((keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.y), turn = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0) - joy.x;
    const boosting = keys.shift || boostHeld;
    pl.pitch += up * dt * 1.6; pl.pitch = Math.atan2(Math.sin(pl.pitch), Math.cos(pl.pitch)); if (!up && Math.abs(pl.pitch) < 1.1) pl.pitch *= 1 - dt * .9;
    // barrel roll (B): a full spin with a sideways juke
    if (rollT > 0) { rollT -= dt; const k = 1 - rollT / ROLL_D; pl.spin = k * TAU * rollDir; const side = Math.sin(k * Math.PI) * 14 * dt * rollDir; pl.x += Math.cos(pl.yaw) * side; pl.z -= Math.sin(pl.yaw) * side; if (rollT <= 0) pl.spin = 0; }
    rollCd -= dt; flareCd -= dt; dodgeT -= dt;
    pl.roll += (turn * .85 - pl.roll) * Math.min(1, dt * 4);
    pl.yaw += turn * dt * 1.25;
    const target = boosting ? BOOST : SPEED; pl.speed += (target - pl.speed) * Math.min(1, dt * (boosting ? 1.6 : 1));
    fwd.set(Math.sin(pl.yaw) * Math.cos(pl.pitch), Math.sin(pl.pitch), Math.cos(pl.yaw) * Math.cos(pl.pitch));
    pl.x += fwd.x * pl.speed * dt; pl.y += fwd.y * pl.speed * dt; pl.z += fwd.z * pl.speed * dt;
    // soft walls: past the edge the car is turned gently back toward the middle
    const out = Math.max(Math.abs(pl.x), Math.abs(pl.z)) - LIM; if (out > 0) { const home = Math.atan2(-pl.x, -pl.z); pl.yaw += angDiff(pl.yaw, home) * Math.min(1, dt * (.6 + out * .05)); }
    if (pl.y < FLOOR) { pl.y = FLOOR; if (Math.sin(pl.pitch) < .15) pl.pitch = .15; } if (pl.y > CEIL) pl.y = CEIL;
    pl.x = clamp(pl.x, -218, 218); pl.z = clamp(pl.z, -218, 218);
    pl.g.position.set(pl.x, pl.y, pl.z); e3.set(-pl.pitch, pl.yaw, -pl.roll - (pl.spin || 0), 'YXZ'); pl.g.quaternion.setFromEuler(e3);
    pl.flame.material.opacity = boosting ? .75 + Math.random() * .2 : 0; pl.flame.scale.set(1, boosting ? 1 + Math.random() * .4 : 1, 1);
    if (engine) { engine.o.frequency.value = 60 + pl.speed * 1.6; engine.g.gain.value = .018 + (boosting ? .02 : 0); }
    // rings: fly through the next one
    const r = rings[ringI]; if (r && Math.hypot(pl.x - r.x, pl.y - r.y, pl.z - r.z) < 9.5) { r.done = true; r.m.material = ringDone; ringI++; tone(660 + ringI * 30, .15, 'triangle', .12); if (ringI >= RING_N) finish(); else { rings[ringI].m.material = ringNext; big(`${ringI}/${RING_N}`, '', 600); } }
    // coins
    for (const c of coins) if (c.m.visible && Math.hypot(pl.x - c.x, pl.y - c.y, pl.z - c.z) < 5) { c.m.visible = false; c.t = 25; coinsN++; tone(988, .1, 'square', .05); }
  }
  function stepWorld(dt) {
    for (const c of coins) { c.m.rotation.z += dt * 2; if (!c.m.visible && (c.t -= dt) <= 0) c.m.visible = true; }
    rings.forEach((r, i) => { if (i === ringI && state === 'play') r.m.scale.setScalar(1 + Math.sin(T * 5) * .06); });
    for (const b of bots) { if (b.fixed) continue; b.a += b.w * dt; const x = Math.sin(b.a) * b.r, z = Math.cos(b.a) * b.r, y = b.y + Math.sin(T * .5 + b.ph) * 14; b.g.position.set(x, y, z); const yaw = b.a + (b.w > 0 ? Math.PI / 2 : -Math.PI / 2); e3.set(-Math.cos(T * .5 + b.ph) * .15, yaw, (b.w > 0 ? -1 : 1) * .35, 'YXZ'); b.g.quaternion.setFromEuler(e3); }
  }

  // ---------------------------------------------------------------- multiplayer
  const others = new Map(); let live = null, liveT = 0;
  (async () => {
    const url = window.AA_LIVE || 'wss://live-production-a047.up.railway.app/live';
    try { const L = await import('../live.js'); if (closed) return;
      live = L.joinLive(url, { look: me.look || {}, name: (me.name && me.name !== 'You') ? me.name : '', onHi: (m) => { myId = m.id; }, onPvp: (m) => onPvp(m),
        onPeer: (m) => { if (others.has(m.id)) { others.get(m.id).name = m.name; return; } const r = makeRoadster('#c4122f', true); r.g.add(tagSprite(String(m.name || 'player').slice(0, 14), '#ff5d8f')); r.g.visible = false; scene.add(r.g); others.set(m.id, { ...r, name: m.name, here: false, x: 0, y: 90, z: 0, h: 0, rl: 0, p: 0, t: null }); },
        onLeave: (id) => { const o = others.get(id); if (o) scene.remove(o.g); others.delete(id); },
        onState: (list) => { const seen = new Set(); for (const s of list) { const o = others.get(s[0]); if (!o || s.length < 10) continue; seen.add(s[0]); o.t = { x: s[1], z: s[2], h: s[3], y: s[7], r: s[8], p: s[9] }; if (!o.here) { o.x = s[1]; o.z = s[2]; o.y = s[7]; o.h = s[3]; } o.here = true; } others.forEach((o, id) => { if (!seen.has(id) && !o.fake) o.here = false; }); } });
    } catch (e) { console.warn('roadster: multiplayer off', e); }
  })();
  function stepOthers(dt) {
    if (live && state === 'play' && (liveT -= dt) <= 0) { liveT = .1; live.at('fly', pl.x, pl.z, pl.yaw, pl.speed / 10, 0, 0, { y: pl.y, r: pl.roll, p: pl.pitch }); }
    const k = Math.min(1, dt * 8);
    others.forEach((o) => { o.g.visible = o.here && !!o.t; if (!o.g.visible) return;
      o.x += (o.t.x - o.x) * k; o.y += (o.t.y - o.y) * k; o.z += (o.t.z - o.z) * k; o.h += angDiff(o.h, o.t.h) * k; o.rl += (o.t.r - o.rl) * k; o.p += (o.t.p - o.p) * k;
      o.g.position.set(o.x, o.y, o.z); e3.set(-o.p, o.h, -o.rl, 'YXZ'); o.g.quaternion.setFromEuler(e3); });
  }

  // ---------------------------------------------------------------- leaderboard (lower time is better)
  const API = '/api/roadster'; let topList = null, posted = false;
  async function fetchTop() { try { const r = await fetch(`${API}/top`, { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (Array.isArray(j?.top)) topList = j.top.slice(0, 10); } } catch {} return topList; }
  function topHtml() { if (!topList || !topList.length) return '<p style="font-size:13px;color:#a0909c">No times yet. Be the first.</p>'; return `<ol class="fr-top10">${topList.map((r, i) => `<li><span>${i + 1}</span><b>${esc(String(r.name || 'pilot').slice(0, 16))}</b><em>${fmtT((+r.ms || 0) / 1000)}</em></li>`).join('')}</ol>`; }
  function postScore() { if (posted || !finishT) return; posted = true; try { fetch(`${API}/score`, { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ name: myName, ms: Math.round(finishT * 1000), coins: coinsN }) }).then(() => fetchTop()).catch(() => {}); } catch {} }
  Promise.all([fetchTop(), fetchAces()]).then(() => { const s = modalCard.querySelector('.fr-topcard'); if (s && state === 'menu') s.innerHTML = `<b>Top aces · all-time KOs</b><ol class="fr-top10">${acesHtml()}</ol><b style="display:block;margin-top:8px">Fastest pilots</b>${topHtml()}`; });

  // ---------------------------------------------------------------- combat: laser bolts, health, knockouts
  let hp = 100, kos = 0, firing = false, fireCd = 0, myId = null, lastHitBy = null, lastHitAt = 0, deadT = 0;
  const bolts = [], boltGeo = track(new THREE.CylinderGeometry(.18, .18, 6, 6)); boltGeo.rotateX(Math.PI / 2);
  const boltMine = track(new THREE.MeshBasicMaterial({ color: '#7fffd4', toneMapped: false })), boltTheirs = track(new THREE.MeshBasicMaterial({ color: '#ff5d8f', toneMapped: false }));
  const sparkGeo = track(new THREE.BoxGeometry(.6, .6, .6)), sparks = [];
  const sparkMats = ['#ffd166', '#ff5d8f', '#ffffff', '#ff9f43'].map((c) => track(new THREE.MeshBasicMaterial({ color: c, toneMapped: false })));
  function boom(x, y, z, n = 26) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sparkGeo, sparkMats[i % 4]); m.position.set(x, y, z); scene.add(m); sparks.push({ m, v: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(10, 30)), t: rnd(.6, 1.1) }); } tone(90, .5, 'sawtooth', .12, -60); }
  const feedEl = $('.fr-feed'), hpEl = $('.fr-hp i'), koEl = $('.ko');
  const feed = (html) => { const d = document.createElement('div'); d.innerHTML = html; feedEl.prepend(d); setTimeout(() => d.remove(), 4000); while (feedEl.children.length > 4) feedEl.lastChild.remove(); };
  function shoot(from, yaw, pitch, mine, owner) {
    const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    [-1.1, 1.1].forEach((side) => { const m = new THREE.Mesh(boltGeo, mine ? boltMine : boltTheirs); const p = from.clone().add(new THREE.Vector3(Math.cos(yaw) * side, .6, -Math.sin(yaw) * side)).addScaledVector(d, 4); m.position.copy(p); m.lookAt(p.clone().add(d)); scene.add(m); bolts.push({ m, d, t: 1.1, mine, owner }); });
    if (mine) tone(880, .07, 'square', .04, -500);
  }
  const hitR = 5.5;
  function stepCombat(dt) {
    fireCd -= dt;
    if (state === 'play' && deadT <= 0 && (firing || keys[' ']) && fireCd <= 0) { fireCd = .16; shoot(pl.g.position, pl.yaw, pl.pitch, true); if (live) live.pvp({ t: 'fx', x0: pl.x, z0: pl.z, x1: pl.x + Math.sin(pl.yaw) * 100, z1: pl.z + Math.cos(pl.yaw) * 100 }); }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t -= dt; b.m.position.addScaledVector(b.d, 260 * dt); const p = b.m.position; let hit = false;
      if (b.mine) {
        for (const bot of bots) if (bot.alive !== false && bot.g.position.distanceTo(p) < hitR) { hit = true; bot.hp = (bot.hp ?? 60) - 12; if (bot.hp <= 0) { bot.alive = false; bot.g.visible = false; boom(p.x, p.y, p.z); kos++; feed(`<b>You</b> popped <b>${esc(bot.name)}</b>`); setTimeout(() => { bot.hp = 60; bot.alive = true; bot.g.visible = true; bot.a = rnd(0, TAU); }, 3000); } break; }
        if (!hit) others.forEach((o, id) => { if (!hit && o.g.visible && o.g.position.distanceTo(p) < hitR) { hit = true; live?.pvp({ t: 'hit', id, dmg: 12 }); tone(1200, .05, 'square', .05); } });
      } else if (state === 'play' && deadT <= 0 && b.owner !== 'peer' && pl.g.position.distanceTo(p) < hitR) { hit = true; hurt(6, b.owner); }
      if (hit || b.t <= 0) { scene.remove(b.m); bolts.splice(i, 1); } }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(Math.max(.01, s.t)); if (s.t <= 0) { scene.remove(s.m); sparks.splice(i, 1); } }
    // the agents fire back now and then when you're in front of them
    if (state === 'play' && deadT <= 0) for (const bot of bots) { if (bot.alive === false) continue; bot.cd = (bot.cd ?? rnd(1, 3)) - dt; const d = bot.g.position.distanceTo(pl.g.position); if (bot.cd <= 0 && d < 90) { bot.cd = rnd(1.6, 3.2); const dir = pl.g.position.clone().sub(bot.g.position).normalize(); shoot(bot.g.position, Math.atan2(dir.x, dir.z), Math.asin(dir.y), false, bot.name); } }
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) { hp = 100; pl.g.visible = true; Object.assign(pl, { x: rnd(-120, 120), y: 150, z: rnd(-120, 120), pitch: 0 }); feed('you respawned'); } }
    hpEl.style.width = Math.max(0, hp) + '%'; koEl.textContent = kos;
  }
  function hurt(dmg, by) { if (deadT > 0 || dodgeT > 0) return; hp -= dmg; wrap.classList.add('hurt'); setTimeout(() => wrap.classList.remove('hurt'), 120); tone(160, .12, 'square', .07, -60);
    if (hp <= 0) { deadT = 2; pl.g.visible = false; boom(pl.x, pl.y, pl.z, 40); feed(`<b>${esc(by || 'someone')}</b> popped <b>you</b>`); if (live) live.pvp({ t: 'ko', by: lastHitBy && performance.now() - lastHitAt < 5000 ? lastHitBy : '' }); } }
  const tally = new Map(); // player id -> knockouts this session (everyone in the room hears every knockout)
  function onPvp(m) {
    if (m.t === 'hit') { if (state !== 'play') return; lastHitBy = m.from; lastHitAt = performance.now(); hurt(m.dmg, m.name || 'a player'); }
    else if (m.t === 'ms') { if (state !== 'play' || deadT > 0) return; const o = others.get(m.from); const from = o?.g.visible ? o.g.position.clone() : new THREE.Vector3(m.x, m.y, m.z); spawnMissile(from, { obj: pl.g }, false, { from: m.from, name: m.name }); betty('inbound', 'Warning. Missile inbound.', 1); alarm(1400, 1000, 5); }
    else if (m.t === 'fx') { const o = others.get(m.id); if (o?.g.visible) shoot(o.g.position, o.h, o.p, false, 'peer'); }
    else if (m.t === 'ko') { if (m.by) tally.set(m.by, (tally.get(m.by) || 0) + 1); const o = others.get(m.id); if (o) boom(o.x, o.y, o.z, 30); if (m.by && m.by === myId) { betty('splash', 'Splash one.', 1); kos++; feed(`<b>You</b> popped <b>${esc(m.name || 'a player')}</b>`); tone(660, .2, 'triangle', .1); } else if (m.id !== myId) feed(`<b>${esc(m.byName || 'the sky')}</b> popped <b>${esc(m.name || 'a player')}</b>`); }
  }
  cv.addEventListener('pointerdown', (e) => { if (!mobile && state === 'play') firing = true; });
  addEventListener('pointerup', () => { firing = false; });
  $('.fr-roll').addEventListener('pointerdown', (e) => { e.preventDefault(); doRoll(); }); $('.fr-flare').addEventListener('pointerdown', (e) => { e.preventDefault(); dropFlares(); });
  const fireBtn = $('.fr-fire'); fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); firing = true; }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => fireBtn.addEventListener(t, () => { firing = false; }));

  // barrel roll and flares: both make incoming lasers miss for a moment
  function doRoll() { if (state !== 'play' || deadT > 0 || rollCd > 0) return; rollT = ROLL_D; rollCd = 1.4; rollDir = ((keys.d || keys.arrowright) ? -1 : 1); dodgeT = ROLL_D; tone(300, .35, 'sawtooth', .05, 400); }
  const flareMat = track(new THREE.MeshBasicMaterial({ color: '#fff2b0', toneMapped: false })), flareGeo = track(new THREE.SphereGeometry(.7, 10, 8)), flares = [];
  function dropFlares() { if (state !== 'play' || deadT > 0 || flareCd > 0) return; flareCd = 6; dodgeT = 2; betty('flare', 'Flares.', 1);
    const back2 = new THREE.Vector3(-Math.sin(pl.yaw), 0, -Math.cos(pl.yaw));
    for (let i = 0; i < 10; i++) setTimeout(() => { if (closed) return; const m = new THREE.Mesh(flareGeo, flareMat); m.position.copy(pl.g.position).addScaledVector(back2, 3); scene.add(m); const v = back2.clone().multiplyScalar(rnd(18, 30)).add(new THREE.Vector3((i % 2 ? 1 : -1) * rnd(8, 18), rnd(-6, 4), 0)); flares.push({ m, v, t: 2.2 }); tone(2200 - i * 90, .05, 'square', .03); }, i * 70); }
  function stepFlares(dt) { for (let i = flares.length - 1; i >= 0; i--) { const f2 = flares[i]; f2.t -= dt; f2.v.y -= 9 * dt; f2.m.position.addScaledVector(f2.v, dt); f2.m.scale.setScalar(.6 + Math.random() * .8); if (f2.t <= 0) { scene.remove(f2.m); flares.splice(i, 1); } } }
  const lbList = $('.fr-lb ol'); let lbT = 0, lbKey = '', lbMode = 'live', aces = [];
  async function fetchAces() { try { const r = await fetch('/api/roadster/kos', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (Array.isArray(j?.top)) aces = j.top; } } catch {} lbKey = ''; }
  fetchAces(); const acesTimer = setInterval(fetchAces, 15000);
  const acesHtml = () => aces.length ? aces.slice(0, 10).map((r, i) => `<li><span>${i + 1}</span><b>${esc(r.name)}</b><em>${r.kos} KO</em></li>`).join('') : '<li><b style="color:#a0909c;font-weight:600">no knockouts yet</b></li>';
  $('.fr-lb .hd').addEventListener('click', (e) => { e.stopPropagation(); lbMode = lbMode === 'live' ? 'all' : 'live'; $('.lbt').textContent = lbMode === 'live' ? 'LIVE · in the sky' : 'ALL-TIME · top aces'; $('.fr-lb .hd small').textContent = lbMode === 'live' ? 'tap: all-time' : 'tap: live'; lbKey = ''; lbT = 0; });
  function paintLive(dt) { if ((lbT -= dt) > 0) return; lbT = .5;
    if (lbMode === 'all') { const key = 'all' + JSON.stringify(aces); if (key !== lbKey) { lbKey = key; lbList.innerHTML = acesHtml(); } return; }
    const rows = [{ id: myId, name: myName === 'You' ? 'You' : myName, k: myId ? tally.get(myId) || 0 : kos, me: true }];
    others.forEach((o, id) => { if (o.here) rows.push({ id, name: o.name || 'pilot', k: tally.get(id) || 0 }); });
    rows.sort((a, b) => b.k - a.k || (b.me ? 1 : 0) - (a.me ? 1 : 0));
    const key = rows.map((r) => r.id + ':' + r.k + r.name).join(); if (key === lbKey) return; lbKey = key;
    lbList.innerHTML = rows.slice(0, 8).map((r, i) => `<li class="${r.me ? 'me' : ''}"><span>${i + 1}</span><b>${esc(r.name)}${r.me && r.name !== 'You' ? ' (you)' : ''}</b><em>${r.k} KO</em></li>`).join('') + (rows.length < 2 ? '<li><b style="color:#a0909c;font-weight:600">waiting for pilots…</b></li>' : '');
  }
  // ---------------------------------------------------------------- lock-on missiles
  // Keep a player in front of the nose for a moment to lock; M (or right-click) fires a homing missile. The target is
  // told and simulates the same missile chasing them: flares or a barrel roll in time make it miss (the target decides).
  const lockEl = $('.fr-lock'), msnEl = $('.msn'); let lockId = null, lockHold = 0, msl = 4, mslReload = 0;
  const missiles = [], mslGeo = track(new THREE.CylinderGeometry(.22, .22, 2.4, 8)); mslGeo.rotateX(Math.PI / 2);
  const mslMat = track(new THREE.MeshStandardMaterial({ color: '#e8eef5', metalness: .5, roughness: .3, emissive: '#ff6a3d', emissiveIntensity: .2 }));
  const smokeGeo = track(new THREE.SphereGeometry(.7, 8, 6)), smokeMat = track(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false })), smokes = [];
  const scr = new THREE.Vector3();
  function stepLock(dt) {
    if (state !== 'play' || deadT > 0) { lockEl.style.display = 'none'; lockId = null; return; }
    let best = null, bestDot = .955; const f = new THREE.Vector3(Math.sin(pl.yaw) * Math.cos(pl.pitch), Math.sin(pl.pitch), Math.cos(pl.yaw) * Math.cos(pl.pitch));
    others.forEach((o, id) => { if (!o.g.visible) return; const d = o.g.position.clone().sub(pl.g.position), L = d.length(); if (L > 160) return; const dot = d.normalize().dot(f); if (dot > bestDot) { bestDot = dot; best = id; } });
    if (best !== lockId) { lockId = best; lockHold = 0; } else if (best) lockHold += dt;
    if (!lockId) { lockEl.style.display = 'none'; return; }
    scr.copy(others.get(lockId).g.position).project(camera); lockEl.style.display = 'block'; lockEl.style.left = ((scr.x + 1) / 2 * innerWidth) + 'px'; lockEl.style.top = ((1 - scr.y) / 2 * innerHeight) + 'px';
    const on = lockHold > 1; lockEl.classList.toggle('on', on); lockEl.querySelector('span').textContent = on ? 'LOCKED' : 'LOCK…';
  }
  function fireMissile() {
    if (state !== 'play' || deadT > 0 || msl <= 0 || !lockId || lockHold <= 1) { if (msl <= 0) betty('nomsl', 'Out of missiles.', 3); return; }
    msl--; if (!mslReload) mslReload = 8; const tgt = others.get(lockId);
    spawnMissile(pl.g.position.clone(), { obj: tgt.g }, true); live?.pvp({ t: 'ms', id: lockId, x: pl.x, y: pl.y, z: pl.z }); betty('fox', 'Fox two.', 1); tone(180, .6, 'sawtooth', .07, 500);
  }
  function spawnMissile(from, target, mine, info = {}) {
    const m = new THREE.Mesh(mslGeo, mslMat); m.position.copy(from).add(new THREE.Vector3(0, -1, 0)); scene.add(m);
    const v = new THREE.Vector3(Math.sin(pl.yaw), 0, Math.cos(pl.yaw)).multiplyScalar(mine ? 70 : 40); if (!mine) v.copy(target.obj.position).sub(from).normalize().multiplyScalar(40);
    missiles.push({ m, v, target, mine, t: 7, from: info.from, name: info.name, smokeT: 0 });
  }
  function stepMissiles(dt) {
    if (mslReload > 0 && (mslReload -= dt) <= 0) { msl = Math.min(4, msl + 1); mslReload = msl < 4 ? 8 : 0; }
    msnEl.textContent = msl;
    for (let i = missiles.length - 1; i >= 0; i--) { const M = missiles[i]; M.t -= dt;
      const tp = M.target.obj.position, want = tp.clone().sub(M.m.position), dist = want.length(); want.normalize().multiplyScalar(110);
      // flares pull the missile off: it goes for the flares instead
      if (!M.mine && dodgeT > 0 && !M.fooled) { M.fooled = true; betty('evade', 'Missile evaded.', 2); }
      if (!M.fooled) M.v.lerp(want, Math.min(1, dt * 2.2)); else M.v.y -= 20 * dt;
      M.m.position.addScaledVector(M.v, dt); M.m.lookAt(M.m.position.clone().add(M.v));
      if ((M.smokeT -= dt) <= 0) { M.smokeT = .04; const sm = new THREE.Mesh(smokeGeo, smokeMat); sm.position.copy(M.m.position); scene.add(sm); smokes.push({ m: sm, t: .9 }); }
      let gone = M.t <= 0;
      if (!gone && !M.fooled && dist < 3.5) { gone = true; boom(M.m.position.x, M.m.position.y, M.m.position.z, 30);
        if (!M.mine) { lastHitBy = M.from; lastHitAt = performance.now(); hurt(45, M.name || 'a missile'); } }
      if (gone) { scene.remove(M.m); missiles.splice(i, 1); } }
    for (let i = smokes.length - 1; i >= 0; i--) { const s2 = smokes[i]; s2.t -= dt; s2.m.scale.setScalar(1 + (.9 - s2.t) * 2.5); if (s2.t <= 0) { scene.remove(s2.m); smokes.splice(i, 1); } }
  }
  cv.addEventListener('contextmenu', (e) => { e.preventDefault(); fireMissile(); });
  $('.fr-mslbtn').addEventListener('pointerdown', (e) => { e.preventDefault(); fireMissile(); });
  // ---------------------------------------------------------------- cockpit voice: "Betty" warnings like a fighter jet
  const betty = (() => { let voice = null; const pick = () => { const vs = speechSynthesis?.getVoices?.() || []; voice = vs.find((v) => /samantha|zira|female|google us english/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null; };
    try { pick(); speechSynthesis.onvoiceschanged = pick; } catch {}
    const last = {}; return (key, text, cd = 5) => { const now = performance.now(); if ((last[key] || 0) > now) return; last[key] = now + cd * 1000; try { const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.rate = 1.12; u.pitch = 1.15; u.volume = .9; speechSynthesis.speak(u); } catch {} }; })();
  const alarm = (f1, f2, n = 3) => { for (let i = 0; i < n; i++) { setTimeout(() => tone(f1, .11, 'square', .07), i * 260); setTimeout(() => tone(f2, .11, 'square', .07), i * 260 + 130); } };
  let lockT = 0, burner = null;
  function stepCockpit(dt) {
    if (state !== 'play' || deadT > 0) return;
    if (pl.y < 30 && Math.sin(pl.pitch) < -.05) { betty('pull', 'Pull up. Pull up.', 3.5); if (!stepCockpit.al || performance.now() > stepCockpit.al) { stepCockpit.al = performance.now() + 1600; alarm(1100, 800, 4); } }
    else if (pl.y > CEIL - 14 && Math.sin(pl.pitch) > .05) betty('alt', 'Altitude. Altitude.', 5);
    if (hp > 0 && hp <= 35) betty('hull', 'Warning. Hull critical.', 9);
    // who's in front of the guns, who's on your six
    let ahead = null, six = null; const f = new THREE.Vector3(Math.sin(pl.yaw), 0, Math.cos(pl.yaw));
    others.forEach((o) => { if (!o.g.visible) return; const d = o.g.position.clone().sub(pl.g.position), L = d.length(); if (L > 90) return; const dot = d.normalize().dot(f); if (dot > .93) ahead = o; else if (dot < -.85 && L < 60) six = o; });
    if (ahead) { lockT += dt; if (lockT > .6) { betty('lock', 'Target locked.', 6); if (!stepCockpit.lt || performance.now() > stepCockpit.lt) { stepCockpit.lt = performance.now() + 900; tone(1600, .08, 'sine', .06); setTimeout(() => tone(1600, .08, 'sine', .06), 120); } } } else lockT = 0;
    if (six) betty('six', 'Warning. Bandit on your six.', 8);
    // afterburner roar while boosting
    const boosting = keys.shift || boostHeld;
    try { if (boosting && !burner && ac) { const len = ac.sampleRate, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = buf; src.loop = true; flt.type = 'lowpass'; flt.frequency.value = 420; g.gain.value = .0; src.connect(flt).connect(g).connect(ac.destination); src.start(); burner = { src, g }; }
      if (burner) burner.g.gain.value += ((boosting ? .14 : 0) - burner.g.gain.value) * Math.min(1, dt * 6); } catch {}
  }

  // ---------------------------------------------------------------- loop
  const rgEl = $('.rg'), tmEl = $('.tm'), cnEl = $('.cn'), spEl = $('.sp');
  const camQ = new THREE.Quaternion(), camPos = new THREE.Vector3(0, 100, 160), camLook = new THREE.Vector3(), back = new THREE.Vector3();
  let last = performance.now(), cloudT = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000) * timeScale; last = now; T += dt;
    if (state === 'play') { runT += dt; if (deadT <= 0) stepPlayer(dt); }
    else { pl.yaw += dt * .25; pl.g.position.set(pl.x, pl.y + Math.sin(T) * 1.5, pl.z); e3.set(0, pl.yaw, -.3, 'YXZ'); pl.g.quaternion.setFromEuler(e3); }
    stepWorld(dt); stepOthers(dt); stepCombat(dt); stepCockpit(dt); stepFlares(dt); paintLive(dt); stepLock(dt); stepMissiles(dt);
    if ((cloudT -= dt) <= 0) { cloudT = .5; placeClouds(pl.x, pl.z); }
    // chase camera: behind and a little above, leaning into turns
    const fpNow = fpv && state === 'play' && deadT <= 0;
    pl.body.children.forEach((m) => { if (m.userData.dummy) m.visible = !fpNow; }); cockpit.visible = fpNow; if (pl.wheel) pl.wheel.rotation.z = pl.roll * 1.6;
    if (fpNow) { // in the driver's seat: eye just above the windscreen line, rolling and looping with the car
      camera.position.set(-.4 * 1.35, 1.62 * 1.35, -.62 * 1.35).applyQuaternion(pl.g.quaternion).add(pl.g.position); camPos.copy(camera.position);
      camLook.set(-.4 * 1.35, 1.45 * 1.35, 20).applyQuaternion(pl.g.quaternion).add(pl.g.position); camera.up.set(0, 1, 0).applyQuaternion(pl.g.quaternion); camera.lookAt(camLook);
    } else {
    e3.set(-pl.pitch, pl.yaw, 0, 'YXZ'); camQ.setFromEuler(e3); back.set(0, 3.6, camera.aspect < 1 ? -13.5 : -11).applyQuaternion(camQ);
    camPos.lerp(new THREE.Vector3(pl.x + back.x, pl.y + back.y, pl.z + back.z), 1 - Math.exp(-dt * 16));
    camera.position.copy(camPos); camLook.set(0, 1.5, 10).applyQuaternion(camQ).add(pl.g.position); camera.up.set(0, 1, 0).applyQuaternion(camQ); camera.lookAt(camLook); }
    { const P = FOVS[fovI], hv = 2 * Math.atan(Math.tan((P.h * Math.PI / 180) / 2) / camera.aspect) * 180 / Math.PI, base = Math.min(118, Math.max(P.v, hv)), want = base + (state === 'play' && (keys.shift || boostHeld) ? 12 : 0); camera.fov += (want - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    rgEl.textContent = `${ringI}/${RING_N}`; tmEl.textContent = fmtT(state === 'play' ? runT : finishT); cnEl.textContent = coinsN; spEl.textContent = Math.round(pl.speed * 3.6 * 2.2);
    renderer.render(scene, camera);
  }
  placeClouds(0, 0); raf = requestAnimationFrame(loop);
  function paintHint() { const h = $('.fr-hint'); if (h) h.textContent = (invert ? 'W/↑ dive · S/↓ climb' : 'W/↑ climb · S/↓ dive') + ' · A/D turn · Shift boost · Space shoot · M missile · B roll · F flares · C view · Esc'; }
  paintInv(); paintHint();
  if (mobile) $('.fr-hint').style.display = 'none';

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    clearInterval(acesTimer); try { live?.close(); } catch {} try { speechSynthesis.cancel(); burner?.src.stop(); engine?.o.stop(); ac?.close(); } catch {}
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('blur', onBlur); removeEventListener('resize', onResize);
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
    disposables.forEach((d) => d.dispose?.()); envTex.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    wrap.remove(); css.remove();
    try { onClose({ time: finishT, coins: coinsN, best }); } catch {}
  }
  if (tst) {
    tst.ready = true; tst.start = start; tst.keys = keys; tst.timeScale = (k) => { timeScale = k; };
    tst.peek = () => ({ state, x: +pl.x.toFixed(1), y: +pl.y.toFixed(1), z: +pl.z.toFixed(1), ringI, coinsN, speed: Math.round(pl.speed) });
    tst.fire = (on) => { firing = on; }; tst.hp = () => hp; tst.kos = () => kos; tst.botAhead = () => { const b = bots[0]; if (!b) return; b.alive = true; b.g.visible = true; b.fixed = true; b.g.position.set(pl.x + Math.sin(pl.yaw) * 40, pl.y + .6, pl.z + Math.cos(pl.yaw) * 40); };
    tst.fakeTarget = () => { const r = makeRoadster('#8cc8ff', true); scene.add(r.g); r.g.position.set(pl.x + Math.sin(pl.yaw) * 140, pl.y, pl.z + Math.cos(pl.yaw) * 140); others.set('t1', { ...r, fake: true, name: 'Target', here: true, x: r.g.position.x, y: r.g.position.y, z: r.g.position.z, h: 0, rl: 0, p: 0, t: { x: r.g.position.x, y: r.g.position.y, z: r.g.position.z, h: 0, r: 0, p: 0 } }); }; tst.fire2 = () => fireMissile(); tst.msl = () => ({ msl, lockId, lockHold: +lockHold.toFixed(2), flying: missiles.length, n: others.size, dbg: [...others.values()].map((o) => [o.g.visible, o.here, +o.g.position.distanceTo(pl.g.position).toFixed(1)]) });
    tst.incoming = () => spawnMissile(pl.g.position.clone().add(new THREE.Vector3(0, 0, 80)), { obj: pl.g }, false, { from: 'x', name: 'Rival' });
    tst.myId = () => myId; tst.lb = () => $('.fr-lb').innerText;
    tst.roll = () => doRoll(); tst.flares = () => dropFlares(); tst.pitch = () => pl.pitch;
    tst.toCoin = (i) => { const c = coins[i]; c.m.visible = true; Object.assign(pl, { x: c.x, y: c.y - 1, z: c.z - 16, yaw: 0, pitch: 0, speed: 0 }); };
    tst.toRing = (i) => { const r = rings[i]; Object.assign(pl, { x: r.x, y: r.y, z: r.z }); };
  }
  return { close };
}
