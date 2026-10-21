// The cyber cafe at night (look: art/cast2/hero.png): a plum room lit by neon signs, warm pendant lamps and the glow
// of the PCs, a night city through the windows. Every agent sits at its own spot on one long wooden desk, behind a
// glowing monitor with an RGB keyboard: that PC is its door to the internet.
// buildBooth() keeps the interface the lab tubes had (grp, slot, creature, setFluid, setLevel, setEvo, setCreature,
// setScreen, resetScreen, breakout, update, flash, boost, awake, lift, mode, exitDir, breakoutLen), so the site and
// the game use booths without other changes. setActivity(lines) writes the agent's latest moves on its monitor.
// Chill pass (2026-10-04): a cosy late-night net cafe. Dark walnut desks, charcoal frames, muted fabric gaming chairs,
// soft warm desk lamps; monitors are dim screens (not light bulbs) and the only neon is a thin, dim accent line.
// buildCafeRoom(scene, { interior: true }) builds the big walkable cafe of the game (buildCafeInterior below).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const geo = new Map(); const once = (k, f) => (geo.has(k) ? geo.get(k) : (geo.set(k, f()), geo.get(k)));
// Lavender pass (2026-10-04): the room takes the player's hoodie violet (#e9ba85) as its key colour: aubergine
// walls, violet-tinted dark wood, dusky lilac chairs; glow is kept to a thin rim around each monitor (clickable).
const WOOD = '#252d30', WOOD_TOP = '#343e43', DARK = '#1b2123', EDGE = '#46545a';
const LAV = '#eec79a';
const CHAIRS = ['#8e785e', '#a28a6f', '#75634e', '#968673', '#897762', '#8b7863'];
const DESK_W = 2.25, DESK_Y = .66, SEAT_Y = .5;

function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, t, key: '' }; }
let keysTex = null;
function keyboardTexture() {
  if (keysTex) return keysTex;
  const { c, t } = canvasTex(256, 96); const x = c.getContext('2d');
  x.fillStyle = '#1b2226'; x.fillRect(0, 0, 256, 96);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 12; k++) { x.fillStyle = `hsl(${255 + ((k * 7 + r * 11) % 30)} 28% ${46 + ((k + r) % 3) * 4}%)`; x.fillRect(6 + k * 20.5, 6 + r * 22, 16, 17); }
  return (keysTex = t);
}
// a thin soft rounded-rect line, laid over a monitor's bezel edge: says "this screen is clickable" without glaring
let rimTex = null;
function monitorRim() {
  if (rimTex) return rimTex;
  const { c, t } = canvasTex(368, 240); const x = c.getContext('2d');
  // the plane is .92 × .60; the bezel (.84 × .52) sits inside it at (16, 10.4) … (352, 229.6)
  x.strokeStyle = '#ffffff'; x.shadowColor = '#ffffff';
  x.shadowBlur = 9; x.globalAlpha = .45; x.lineWidth = 3; x.beginPath(); x.roundRect(16, 10.5, 336, 219, 7); x.stroke();
  x.shadowBlur = 0; x.globalAlpha = 1; x.lineWidth = 2; x.beginPath(); x.roundRect(16, 10.5, 336, 219, 7); x.stroke();
  return (rimTex = t);
}
// a soft lavender rug for the LAUNCH spot: a woven field, a fine border and a small "+"
function launchRugTex() {
  const { c, t } = canvasTex(320, 240); const x = c.getContext('2d'), w = 320, h = 240;
  x.clearRect(0, 0, w, h);
  x.fillStyle = '#2a3439'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 26); x.fill();
  for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.05)'; x.fillRect(10, 10 + i * 3.7, w - 20, 1.6); }
  x.strokeStyle = '#8e785e'; x.lineWidth = 3; x.beginPath(); x.roundRect(18, 18, w - 36, h - 36, 18); x.stroke();
  x.strokeStyle = 'rgba(169,147,245,.18)'; x.lineWidth = 1.5; x.beginPath(); x.roundRect(28, 28, w - 56, h - 56, 12); x.stroke();
  x.fillStyle = '#d9b68f'; x.beginPath(); x.roundRect(w / 2 - 4, h / 2 - 22, 8, 44, 4); x.fill(); x.beginPath(); x.roundRect(w / 2 - 22, h / 2 - 4, 44, 8, 4); x.fill();
  return t;
}
// a soft warm pool of lamp light, laid on a surface (additive, so it only brightens what is under it)
let poolTex = null;
export function lightPool(color = '#ffb35c', size = 1, opacity = .5) {
  if (!poolTex) {
    const { c, t } = canvasTex(128, 128); const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); poolTex = t;
  }
  const m = new THREE.Mesh(once('pool', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: poolTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true }));
  m.rotation.x = -Math.PI / 2; m.scale.setScalar(size); m.renderOrder = 2; return m;
}
// a proper gaming chair: 5-spoke wheeled base, gas-lift post, seat cushion, a separate tall backrest with a headrest
// pillow and side wings, armrests on posts. Faces +z (toward the desk). `fabric` is the main colour, `trim` the accent.
export function buildChair(fabric, trim, frame) {
  const c = new THREE.Group();
  const add = (k, f, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(once(k, f), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); c.add(o); return o; };
  for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + .3; add('ch-spoke', () => new THREE.BoxGeometry(.06, .045, .36), frame, Math.sin(a) * .18, .085, Math.cos(a) * .18, 0, a); add('ch-wheel', () => new THREE.SphereGeometry(.045, 10, 8), frame, Math.sin(a) * .35, .045, Math.cos(a) * .35); }
  add('ch-hub', () => new THREE.CylinderGeometry(.07, .08, .08, 14), frame, 0, .1, 0);
  add('ch-lift', () => new THREE.CylinderGeometry(.03, .03, .32, 10), frame, 0, .28, 0);
  add('ch-plate', () => new THREE.BoxGeometry(.3, .04, .3), frame, 0, .44, 0);
  add('ch-seat', () => new RoundedBoxGeometry(.66, .12, .6, 3, .05), fabric, 0, .5, .02);
  add('ch-seatT', () => new RoundedBoxGeometry(.5, .03, .5, 2, .012), trim, 0, .565, .03);
  // backrest: a tall rounded panel standing clear of the seat on a spine bar, tilted back a little
  add('ch-spine', () => new THREE.BoxGeometry(.1, .4, .05), frame, 0, .62, -.33, -.1);
  add('ch-back', () => new RoundedBoxGeometry(.7, .95, .13, 3, .05), fabric, 0, 1.2, -.38, -.12);
  for (const s of [-1, 1]) add('ch-wing', () => new RoundedBoxGeometry(.11, .8, .17, 2, .045), trim, s * .36, 1.15, -.35, -.12, 0, s * -.12);
  add('ch-head', () => new RoundedBoxGeometry(.44, .2, .1, 3, .045), trim, 0, 1.55, -.36, -.12);
  add('ch-lumb', () => new RoundedBoxGeometry(.34, .14, .06, 2, .03), trim, 0, .9, -.3, -.12);
  // armrests
  for (const s of [-1, 1]) { add('ch-apost', () => new THREE.BoxGeometry(.045, .26, .05), frame, s * .36, .63, -.02); add('ch-apad', () => new RoundedBoxGeometry(.1, .05, .34, 2, .02), trim, s * .36, .77, .02); }
  return c;
}

export function buildBooth({ fluid = '#62e6cf', lite = false } = {}) {
  const grp = new THREE.Group();
  const M = {
    desk: new THREE.MeshPhysicalMaterial({ color: WOOD_TOP, roughness: .42, clearcoat: .5, clearcoatRoughness: .3 }),
    deskSide: new THREE.MeshStandardMaterial({ color: WOOD, roughness: .7 }),
    edge: new THREE.MeshStandardMaterial({ color: EDGE, roughness: .35, metalness: .35 }),
    dark: new THREE.MeshStandardMaterial({ color: DARK, roughness: .5, metalness: .2 }),
    frame: new THREE.MeshStandardMaterial({ color: '#dfe8ee', roughness: .35, metalness: .6 }),
    chair: new THREE.MeshStandardMaterial({ color: '#bfe3f2', roughness: .85 }),
    trim: new THREE.MeshStandardMaterial({ color: '#e6eef3', roughness: .7 }),
    neon: new THREE.MeshStandardMaterial({ color: '#1a1f20', emissive: new THREE.Color(fluid), emissiveIntensity: .15 }),
    meter: new THREE.MeshBasicMaterial({ color: '#86735e' }),
    rim: new THREE.MeshBasicMaterial({ map: monitorRim(), color: LAV, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }),
    deskMat: new THREE.MeshStandardMaterial({ color: '#f6efe4', roughness: .95 }),
    cable: new THREE.MeshStandardMaterial({ color: '#14181a', roughness: .6 }),
    keys: new THREE.MeshStandardMaterial({ map: keyboardTexture(), emissiveMap: keyboardTexture(), emissive: new THREE.Color('#ffffff'), emissiveIntensity: .14 }),
    mouse: new THREE.MeshStandardMaterial({ color: '#2e3437', roughness: .4 }),
    pot: new THREE.MeshStandardMaterial({ color: '#ddd6cf', roughness: .6 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#4f7356', roughness: .7 }),
    candle: new THREE.MeshStandardMaterial({ color: '#e8dcd0', emissive: new THREE.Color('#ffae6a'), emissiveIntensity: .2 }),
    panel: new THREE.MeshStandardMaterial({ color: '#e9dfd0', roughness: .75 }),
    frost: new THREE.MeshStandardMaterial({ color: '#b5a592', roughness: .9, transparent: true, opacity: .26, depthWrite: false }),
    shade: new THREE.MeshStandardMaterial({ color: '#f7d9e3', roughness: .5, metalness: .3, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc98a').multiplyScalar(.9) }),
  };
  const mesh = (g, m, x, y, z, parent = grp) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };

  // one section of the long shared desk (sections join edge to edge along the row): a dark walnut top on a short
  // modesty panel and legs, so the chair base shows under it
  // a thick top with softly rounded edges on a slim violet-metal edge band, a recessed modesty panel and slim legs
  mesh(once('d-top', () => new RoundedBoxGeometry(DESK_W - .04, .07, .92, 3, .025)), M.desk, 0, DESK_Y, .15);
  mesh(once('d-band', () => new RoundedBoxGeometry(DESK_W - .1, .022, .86, 2, .01)), M.edge, 0, DESK_Y - .042, .15);
  mesh(once('d-front', () => new RoundedBoxGeometry(DESK_W - .3, .24, .025, 2, .01)), M.deskSide, 0, DESK_Y - .18, .44);
  for (const lx of [-DESK_W / 2 + .14, DESK_W / 2 - .14]) for (const lz of [-.22, .5]) mesh(once('d-leg', () => new THREE.CylinderGeometry(.018, .014, DESK_Y - .05, 10)), M.frame, lx, (DESK_Y - .05) / 2, lz);
  for (const lx of [-DESK_W / 2 + .14, DESK_W / 2 - .14]) mesh(once('d-foot', () => new THREE.BoxGeometry(.03, .02, .76)), M.frame, lx, .01, .14);
  // a low partition on the left of every booth: dark wood below, frosted panel above, a rail on top
  mesh(once('pt-low', () => new THREE.BoxGeometry(.05, 1.0, 1.6)), M.panel, -DESK_W / 2, .5, -.22);
  mesh(once('pt-frost', () => new THREE.BoxGeometry(.03, .46, 1.6)), M.frost, -DESK_W / 2, 1.23, -.22);
  mesh(once('pt-rail', () => new THREE.BoxGeometry(.07, .04, 1.64)), M.panel, -DESK_W / 2, 1.47, -.22);
  mesh(once('pt-post', () => new THREE.BoxGeometry(.07, 1.49, .07)), M.panel, -DESK_W / 2, .745, .58);
  // the gaming chair behind the agent, turned a little toward its screen
  const chair = buildChair(M.chair, M.trim, M.frame); chair.position.set(-.45, 0, -.66); chair.rotation.y = .5; grp.add(chair);
  // monitor: on the desk to one side, facing the agent; a plain dark bezel
  const mon = new THREE.Group(); mon.position.set(.48, DESK_Y + .03, .02); mon.rotation.y = -.45; mon.scale.setScalar(1.25); grp.add(mon); mon.userData.screen = true; // clicking it opens the full screen view
  mesh(once('m-foot', () => new THREE.BoxGeometry(.32, .025, .2)), M.dark, 0, .012, 0, mon);
  mesh(once('m-arm', () => new THREE.BoxGeometry(.06, .3, .04)), M.dark, 0, .16, -.04, mon);
  mesh(once('m-body', () => new THREE.BoxGeometry(.84, .52, .045)), M.dark, 0, .5, 0, mon);
  const scrMon = canvasTex(512, 300);
  const SCREEN_ON = .5, SCREEN_OFF = .18; // screen brightness: reads as a screen, never as a lamp
  const monScreen = mesh(once('m-scr', () => new THREE.PlaneGeometry(.78, .46)), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(SCREEN_ON) }), 0, .5, .026, mon); // shows the live browser (winTex below)
  // a thin soft rim along the bezel edge in the agent's lavender-tinted colour: says "click me" (brighter on hover)
  const rim = mesh(once('m-rim', () => new THREE.PlaneGeometry(.92, .6)), M.rim, 0, .5, .028, mon); rim.renderOrder = 3;
  let hover = 0, hoverK = 0;
  // the screen's soft spill on the desk in front of it
  const spill = lightPool(fluid, 1, .05); spill.scale.set(.9, .55, 1); spill.position.set(.3, DESK_Y + .032, .25); spill.rotation.z = .45; grp.add(spill);
  // a little desk lamp at the back left with a warm pool of light on the desk
  const lamp = new THREE.Group(); lamp.position.set(-.98, DESK_Y + .03, -.36); grp.add(lamp);
  mesh(once('l-base', () => new THREE.CylinderGeometry(.06, .07, .02, 14)), M.dark, 0, .01, 0, lamp);
  const arm1 = mesh(once('l-arm', () => new THREE.CylinderGeometry(.008, .008, .42, 6)), M.dark, .05, .2, .04, lamp); arm1.rotation.set(.25, 0, -.3);
  const shade = mesh(once('l-shade', () => new THREE.ConeGeometry(.08, .1, 16, 1, true)), M.shade, .13, .41, .1, lamp); shade.rotation.z = -.5;
  mesh(once('l-bulb', () => new THREE.SphereGeometry(.028, 10, 8)), M.bulb, .14, .38, .1, lamp);
  const pool = lightPool('#eee1d2', 1, .12); pool.scale.set(.95, .7, 1); pool.position.set(-.62, DESK_Y + .033, -.02); grp.add(pool);
  // a felt desk mat under the keyboard (soft backlight) and mouse, and a tidy cable down the back edge
  const dmat = mesh(once('k-mat', () => new RoundedBoxGeometry(.92, .008, .44, 2, .004)), M.deskMat, -.04, DESK_Y + .038, .2); dmat.rotation.y = -.32;
  const kb = mesh(once('k-kb', () => new RoundedBoxGeometry(.52, .028, .18, 2, .01)), M.keys, -.12, DESK_Y + .055, .1); kb.rotation.y = -.4;
  const mouse = mesh(once('k-mouse', () => new THREE.SphereGeometry(.05, 14, 10)), M.mouse, .14, DESK_Y + .055, .3); mouse.scale.set(1, .5, 1.35);
  mesh(once('k-cable', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.5, DESK_Y + .045, -.06), new THREE.Vector3(.58, DESK_Y + .04, -.24), new THREE.Vector3(.62, DESK_Y + .0, -.31), new THREE.Vector3(.63, DESK_Y - .2, -.31), new THREE.Vector3(.63, .02, -.3)]), 24, .007, 6)), M.cable, 0, 0, 0);
  // a little desk clutter: a plant or a candle, varied by booth
  const r = (fluid.charCodeAt(1) + fluid.charCodeAt(3)) % 3;
  if (r === 0) { mesh(once('p-pot', () => new THREE.CylinderGeometry(.08, .065, .13, 16)), M.pot, -.94, DESK_Y + .1, .08); for (let i = 0; i < 5; i++) { const l = mesh(once('p-leaf', () => new THREE.SphereGeometry(.06, 8, 6)), M.leaf, -.94 + Math.cos(i * 1.3) * .05, DESK_Y + .22 + i * .02, .08 + Math.sin(i * 1.3) * .05); l.scale.set(.7, 1.6, .7); l.rotation.z = Math.cos(i * 1.3) * .6; } }
  else if (r === 1) { mesh(once('cn', () => new THREE.CylinderGeometry(.05, .05, .08, 14)), M.candle, -.94, DESK_Y + .08, .1); }
  else { const mug = mesh(once('mug', () => new THREE.CylinderGeometry(.055, .05, .1, 16)), M.pot, -.94, DESK_Y + .09, .08); mesh(once('mugH', () => new THREE.TorusGeometry(.03, .01, 6, 12)), M.pot, -.88, DESK_Y + .09, .08); }
  // name plaque on the desk front edge, facing the room, and a progress bar along the lip
  const scrSign = lite ? null : canvasTex(512, 128);
  let plaque = null;
  if (scrSign) { plaque = mesh(once('pl', () => new THREE.PlaneGeometry(.66, .17)), new THREE.MeshBasicMaterial({ map: scrSign.t, transparent: true }), -.62, DESK_Y + .12, .52); plaque.rotation.x = -.15; }
  // a second plaque on the right of the desk edge: its trading PnL and how many coins it launched (from /api/desks)
  const statSign = lite ? null : canvasTex(512, 128);
  if (statSign) { const sp = mesh(once('pl', () => new THREE.PlaneGeometry(.66, .17)), new THREE.MeshBasicMaterial({ map: statSign.t, transparent: true }), .52, DESK_Y + .12, .52); sp.rotation.x = -.15; }
  const drawStats = (pnl, launches) => {
    if (!statSign) return; const key = pnl.toFixed(3) + '|' + launches; if (key === statSign.key) return; statSign.key = key;
    const x = statSign.c.getContext('2d'), w = statSign.c.width, h = statSign.c.height, up = pnl >= 0, zero = Math.abs(pnl) < .0005; // zero is neutral, not green
    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 22); x.fill();
    x.strokeStyle = zero ? 'rgba(255,255,255,.55)' : up ? '#7ee2a8' : '#ff8fa3'; x.lineWidth = 5; x.stroke();
    x.textBaseline = 'middle'; x.font = '700 24px "Fredoka", ui-rounded, system-ui, sans-serif'; x.fillStyle = 'rgba(255,255,255,.7)';
    x.textAlign = 'left'; x.fillText('PNL', 28, 38); x.textAlign = 'right'; x.fillText('LAUNCHES', w - 28, 38);
    x.font = '800 46px "Fredoka", ui-rounded, system-ui, sans-serif';
    const a = Math.abs(pnl), v = a >= 10 ? a.toFixed(1) : a >= 1 ? a.toFixed(2) : a.toFixed(3);
    x.fillStyle = zero ? '#ffffff' : up ? '#7ee2a8' : '#ff8fa3'; x.textAlign = 'left'; x.fillText(zero ? '0.000 SOL' : `${up ? '+' : '−'}${v} SOL`, 28, 86);
    x.fillStyle = '#ffffff'; x.textAlign = 'right'; x.fillText(String(launches), w - 28, 86);
    statSign.t.needsUpdate = true;
  };
  const meter = mesh(once('mt', () => new THREE.BoxGeometry(DESK_W * .8, .004, .004)), M.meter, 0, DESK_Y - .045, .604); // a barely-there hairline on the edge band
  // the agent sits on the chair, behind the desk, facing the room
  const slot = new THREE.Group(); slot.position.set(-.45, SEAT_Y, -.32); slot.scale.setScalar(.66); grp.add(slot); // agents a bit smaller than the visitor, seated at their desks

  // ---- the agent's live screen: its own monitor, turned toward the room, shows its browser ----
  // real screenshots from its own browser (setBrowser) play as a scroll; with none yet, a simulated page scrolls
  const W = 640, HH = 44, CH = 360;
  const winTex = canvasTex(W, HH + CH);
  monScreen.material.map = winTex.t; monScreen.material.needsUpdate = true;
  const shots = []; // { img: HTMLImageElement, url, title, note }
  let shotKey = '', shotAt = 0, shotIdx = 0, simPage = null, idle = false;
  const pace = 2.6 + Math.random() * 1.4, phase = Math.random() * 26; // each PC on its own rhythm, so the room doesn't flip in sync
  // its trading desk (setDesk, from /api/desks): wallet, open positions and latest trades. The screen switches to it
  // now and then, and right away for a while after a fresh trade.
  let desk = null, deskHotUntil = 0, deskTop = '';
  const sol = (v) => (v == null ? '—' : v >= 1 ? v.toFixed(2) : v >= .01 ? v.toFixed(3) : v.toFixed(4));
  const ago = (at) => { const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000); return s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : Math.round(s / 3600) + 'h'; };
  function drawDesk(x, t) {
    x.fillStyle = '#111719'; x.fillRect(0, HH, W, CH);
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillStyle = booth.fluid; x.font = '700 20px ui-monospace, Menlo, monospace'; x.fillText('TRADING DESK', 20, HH + 24);
    x.fillStyle = '#c9cede'; x.font = '500 16px ui-monospace, Menlo, monospace'; x.textAlign = 'right'; x.fillText(`wallet ${sol(desk.walletSol)} SOL`, W - 20, HH + 24); x.textAlign = 'left';
    const fresh = desk.trades[0] && Date.now() - new Date(desk.trades[0].at).getTime() < 180_000 ? desk.trades[0] : null;
    let y = HH + 50;
    if (fresh) { // the latest trade as a big ticket, pulsing
      const c = fresh.side === 'sell' ? '#ff6b81' : fresh.side === 'launch' ? '#f8d0a3' : fresh.side === 'fees' ? '#ffd166' : '#3fdc97';
      x.fillStyle = c; x.globalAlpha = .14 + .08 * Math.sin(t * 5); x.beginPath(); x.roundRect(16, y, W - 32, 62, 10); x.fill(); x.globalAlpha = 1;
      x.strokeStyle = c; x.lineWidth = 2; x.stroke();
      x.fillStyle = c; x.font = '800 26px ui-monospace, Menlo, monospace';
      const verb = { buy: 'BOUGHT', sell: 'SOLD', launch: 'LAUNCHED', fees: 'FEES IN' }[fresh.side] || 'TRADE';
      x.fillText(`${verb} ${fresh.symbol ? '$' + fresh.symbol : ''}`.slice(0, 26), 30, y + 31);
      x.textAlign = 'right'; x.font = '700 20px ui-monospace, Menlo, monospace'; x.fillText(fresh.sol != null ? `${sol(fresh.sol)} SOL` : ago(fresh.at) + ' ago', W - 30, y + 31); x.textAlign = 'left';
      y += 76;
    }
    x.fillStyle = '#96897a'; x.font = '600 13px ui-monospace, Menlo, monospace'; x.fillText('OPEN POSITIONS', 20, y); x.textAlign = 'right'; x.fillText('COST      NOW      P/L', W - 20, y); x.textAlign = 'left'; y += 22;
    const pos = desk.positions.slice(0, fresh ? 3 : 4);
    if (!pos.length) { x.fillStyle = '#76695a'; x.font = '500 15px ui-monospace, Menlo, monospace'; x.fillText('flat: scanning for an entry', 20, y); y += 24; }
    for (const p of pos) {
      x.fillStyle = '#fdf4ea'; x.font = '700 16px ui-monospace, Menlo, monospace'; x.fillText(('$' + p.symbol).slice(0, 14), 20, y);
      x.font = '500 15px ui-monospace, Menlo, monospace'; x.textAlign = 'right';
      x.fillStyle = '#c9cede'; x.fillText(sol(p.costSol), W - 200, y); x.fillText(sol(p.valueSol), W - 110, y);
      x.fillStyle = p.pnlPct == null ? '#96897a' : p.pnlPct >= 0 ? '#3fdc97' : '#ff6b81'; x.fillText(p.pnlPct == null ? '—' : `${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct}%`, W - 20, y); x.textAlign = 'left';
      y += 24;
    }
    y += 6; x.fillStyle = '#96897a'; x.font = '600 13px ui-monospace, Menlo, monospace'; x.fillText('LATEST', 20, y); y += 22;
    for (const tr of desk.trades.slice(fresh ? 1 : 0)) {
      if (y > HH + CH - 14) break;
      const c = tr.side === 'sell' ? '#ff6b81' : tr.side === 'launch' ? '#f8d0a3' : tr.side === 'fees' ? '#ffd166' : '#3fdc97';
      x.fillStyle = c; x.font = '700 14px ui-monospace, Menlo, monospace'; x.fillText(tr.side.toUpperCase().padEnd(6), 20, y);
      x.fillStyle = '#c9cede'; x.font = '500 14px ui-monospace, Menlo, monospace'; x.fillText(`${tr.symbol ? '$' + tr.symbol : ''} ${tr.sol != null ? sol(tr.sol) + ' SOL' : ''}`.slice(0, 34), 90, y);
      x.fillStyle = '#96897a'; x.textAlign = 'right'; x.fillText(ago(tr.at), W - 20, y); x.textAlign = 'left';
      y += 22;
    }
  }
  const host = (u) => { try { const x = new URL(u); return x.host + (x.pathname.length > 1 ? x.pathname : ''); } catch { return String(u || ''); } };
  function simulatedPage() {
    if (simPage) return simPage;
    const c = document.createElement('canvas'); c.width = W; c.height = CH * 4; const x = c.getContext('2d');
    x.fillStyle = '#1b1e28'; x.fillRect(0, 0, c.width, c.height); // a dark-mode page, so the monitor reads as a screen
    let y = 16, seed = (booth.name || 'A').charCodeAt(0);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    while (y < c.height - 60) {
      const kind = rnd();
      if (kind < .35) { x.fillStyle = '#262a37'; x.fillRect(16, y, W - 32, 88); x.fillStyle = booth.fluid; x.fillRect(28, y + 14, 40, 40); x.fillStyle = '#d9dcea'; x.fillRect(80, y + 16, 200 + rnd() * 200, 12); x.fillStyle = '#6f7690'; for (let k = 0; k < 3; k++) x.fillRect(80, y + 36 + k * 14, 300 + rnd() * 180, 8); y += 100; }
      else if (kind < .6) { x.fillStyle = '#262a37'; x.fillRect(16, y, W - 32, 140); x.strokeStyle = rnd() > .4 ? '#3fc98a' : '#e8606e'; x.lineWidth = 3; x.beginPath(); let v = 70; for (let k = 0; k <= 40; k++) { v = Math.max(15, Math.min(125, v + (rnd() - .48) * 18)); x[k ? 'lineTo' : 'moveTo'](28 + k * 14.5, y + v); } x.stroke(); y += 152; }
      else { x.fillStyle = '#7ea6ff'; x.fillRect(24, y, 260 + rnd() * 200, 12); x.fillStyle = '#5fbf7a'; x.fillRect(24, y + 18, 180, 8); x.fillStyle = '#5c637a'; for (let k = 0; k < 2; k++) x.fillRect(24, y + 32 + k * 13, 480 + rnd() * 90, 8); y += 70; }
    }
    return (simPage = c);
  }
  function drawWindow(t) {
    const x = winTex.c.getContext('2d');
    // address bar
    x.fillStyle = '#2a2e3b'; x.fillRect(0, 0, W, HH);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(18 + i * 18, HH / 2, 6, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = '#3a3f50'; x.beginPath(); x.roundRect(78, 8, W - 160, HH - 16, 13); x.fill();
    const cur = shots.length ? shots[shotIdx % shots.length] : null;
    if (idle) { // an empty seat: a dim screensaver
      x.fillStyle = '#c9cede'; x.font = '500 17px ui-monospace, Menlo, monospace'; x.textBaseline = 'middle'; x.fillText('seat free', 92, HH / 2 + 1);
      x.fillStyle = '#14191b'; x.fillRect(0, HH, W, CH);
      const px = 120 + (Math.sin(t * .37) * .5 + .5) * (W - 300), py = HH + 60 + (Math.sin(t * .53 + 1) * .5 + .5) * (CH - 160);
      x.fillStyle = booth.fluid; x.globalAlpha = .55; x.font = '700 40px "Fredoka", ui-rounded, system-ui, sans-serif'; x.fillText('SEAT FREE', px, py); x.globalAlpha = 1;
      winTex.t.needsUpdate = true; return;
    }
    const onDesk = desk && (desk.trades.length || desk.positions.length) && (Date.now() < deskHotUntil ? (t + phase) % 14 < 9 : (t + phase) % 26 < 8);
    x.fillStyle = '#c9cede'; x.font = '500 17px ui-monospace, Menlo, monospace'; x.textBaseline = 'middle';
    x.fillText(onDesk ? 'trading desk · live' : (cur ? host(cur.url) : (lines[lines.length - 1] || 'the web')).slice(0, 44), 92, HH / 2 + 1);
    x.fillStyle = '#ff3b5c'; x.beginPath(); x.arc(W - 62, HH / 2, 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#c9cede'; x.font = '700 14px ui-rounded, system-ui, sans-serif'; x.fillText('LIVE', W - 50, HH / 2 + 1);
    // page
    if (onDesk) drawDesk(x, t);
    else if (cur && cur.img.complete && cur.img.naturalWidth) {
      // slide the new frame up over the old one, like a scroll
      // a scroll slides by the real distance it scrolled; anything else cuts; the cursor glides to where it acted
      const k = Math.min(1, (t - shotAt) / .5), prev = shots[(shotIdx - 1 + shots.length) % shots.length], a = cur.act || {};
      const d = a.act === 'scroll' ? Math.min(CH, (a.dy || 400) * CH / 800) : 0, e = 1 - (1 - k) ** 3;
      const draw = (img, off) => x.drawImage(img, 0, 0, img.naturalWidth, img.naturalWidth * CH / W, 0, HH + off, W, CH);
      if (k < 1 && d && prev?.img.complete && prev !== cur) { draw(prev.img, -e * d); draw(cur.img, (1 - e) * d); } else draw(cur.img, 0);
      if (a.cx != null) {
        const pa = prev?.act?.cx != null ? prev.act : a, m = Math.min(1, (t - shotAt) / .7), em = m * m * (3 - 2 * m);
        const rest = shotIdx === shots.length - 1 && m >= 1 ? 1 : 0; // reading the last page: the hand moves a little
        const cx = (pa.cx + (a.cx - pa.cx) * em) * W + rest * Math.sin(t * .7 + phase) * 14, cy = HH + (pa.cy + (a.cy - pa.cy) * em) * CH + rest * Math.sin(t * .45 + phase * 2) * 9;
        if (a.act === 'click' && m >= 1) { const r = ((t - shotAt - .7) % 1) * 30; x.strokeStyle = booth.fluid; x.globalAlpha = Math.max(0, 1 - r / 30); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 6 + r, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1; }
        x.save(); x.translate(cx, cy); x.scale(1.3, 1.3);
        x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 17); x.lineTo(4.5, 13); x.lineTo(8, 20); x.lineTo(10.5, 19); x.lineTo(7, 12); x.lineTo(13, 12); x.closePath();
        x.fillStyle = '#fff'; x.fill(); x.strokeStyle = '#111'; x.lineWidth = 1.4; x.stroke(); x.restore();
      }
    } else {
      const pg = simulatedPage(), y = ((t * 38) % (pg.height - CH));
      x.drawImage(pg, 0, y, W, CH, 0, HH, W, CH);
    }
    winTex.t.needsUpdate = true;
  }

  // ---- computer setup tiers: the bigger the coin, the better the setup (setTier 0..3) ----
  //   1 upgraded: a second monitor stacked on an arm, RGB backlight bar, desk mat
  //   2 pro: a portrait third monitor, speakers, a mic on an arm, a deeper desk with a shelf, a taller gaming chair
  //   3 famous (bonded): a raised platform, gold desk trim, a ring light and a trophy
  const T1 = new THREE.Group(), T2 = new THREE.Group(), T3 = new THREE.Group(); grp.add(T1, T2, T3);
  const actMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(SCREEN_ON) }); // activity screens (scrMon, set below)
  const screenOn = (parent, x, y, z, ry, sc, portrait = false) => {
    const m = new THREE.Group(); m.position.set(x, y, z); m.rotation.y = ry; m.scale.setScalar(sc); parent.add(m);
    mesh(once('t-body', () => new THREE.BoxGeometry(.82, .5, .045)), M.dark, 0, 0, 0, m);
    const sc2 = mesh(once('t-scr', () => new THREE.PlaneGeometry(.78, .46)), actMat, 0, 0, .026, m);
    if (portrait) m.rotation.z = Math.PI / 2;
    return m;
  };
  // tier 1
  mesh(once('t1-arm', () => new THREE.BoxGeometry(.04, .55, .04)), M.dark, .62, DESK_Y + .95, -.12, T1);
  screenOn(T1, .48, DESK_Y + 1.32, -.02, -.45, 1.3);
  mesh(once('t1-bar', () => new THREE.BoxGeometry(DESK_W * .9, .012, .012)), M.neon, 0, DESK_Y + .04, -.3, T1); // a thin dim backlight line
  // tier 2
  screenOn(T2, 1.0, DESK_Y + .52, -.02, -.75, 1.05, true);
  for (const x of [-.72, .1]) { const sp = mesh(once('t2-spk', () => new THREE.BoxGeometry(.13, .24, .13)), M.dark, x, DESK_Y + .16, -.18, T2); mesh(once('t2-cone', () => new THREE.CylinderGeometry(.04, .04, .01, 16)), M.neon, x, DESK_Y + .18, -.11, T2).rotation.x = Math.PI / 2; }
  const micArm = mesh(once('t2-mic', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.88, DESK_Y + .05, -.1), new THREE.Vector3(-.88, DESK_Y + .55, -.1), new THREE.Vector3(-.66, DESK_Y + .62, .08)]), 16, .015, 6)), M.dark, 0, 0, 0, T2);
  mesh(once('t2-cap', () => new THREE.CapsuleGeometry(.04, .09, 4, 10)), M.mouse, -.64, DESK_Y + .58, .1, T2).rotation.z = 1.2;
  mesh(once('t2-shelf', () => new THREE.BoxGeometry(DESK_W, .05, .3)), M.desk, 0, DESK_Y + .35, -.42, T2);
  mesh(once('t2-ext', () => new THREE.BoxGeometry(DESK_W, .07, .32)), M.desk, 0, DESK_Y, -.47, T2);
  // tier 3
  const goldM = new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: .7, roughness: .3 });
  mesh(once('t3-plat', () => new THREE.BoxGeometry(DESK_W, .08, 1.7)), new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: .5 }), 0, .04, -.1, T3);
  mesh(once('t3-edge', () => new THREE.BoxGeometry(DESK_W, .02, .02)), goldM, 0, .085, .75, T3);
  mesh(once('t3-trim', () => new THREE.BoxGeometry(DESK_W, .03, .03)), goldM, 0, DESK_Y + .04, .62, T3);
  const ringLight = mesh(once('t3-ring', () => new THREE.TorusGeometry(.32, .025, 10, 48)), new THREE.MeshStandardMaterial({ color: '#d8d0c4', emissive: new THREE.Color('#ffe2b8'), emissiveIntensity: .7 }), -.45, 1.95, -1.15, T3);
  mesh(once('t3-pole', () => new THREE.CylinderGeometry(.012, .012, 1.65, 8)), M.dark, -.45, .82, -1.15, T3);
  const cupPts = [[0, 0], [.06, 0], [.02, .03], [.02, .1], [.08, .14], [.09, .24], [0, .22]].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(once('t3-cup', () => new THREE.LatheGeometry(cupPts, 20)), goldM, -.9, DESK_Y + .04, .3, T3);
  actMat.map = scrMon.t; actMat.needsUpdate = true;
  let tier = 0;
  const applyTier = () => { T1.visible = tier >= 1; T2.visible = tier >= 2; T3.visible = tier >= 3; chair.scale.set(1, tier >= 2 ? 1.12 : 1, 1); grp.position.y = 0; slot.position.y = SEAT_Y + (tier >= 3 ? .08 : 0); };

  const lines = ['online', 'reading the timeline…'];
  function drawMonitor(t, name) {
    const x = scrMon.c.getContext('2d'), w = scrMon.c.width, h = scrMon.c.height;
    x.fillStyle = '#171c1f'; x.fillRect(0, 0, w, h);
    x.fillStyle = booth.fluid; x.globalAlpha = .7; x.fillRect(0, 0, w, 34); x.globalAlpha = 1;
    x.fillStyle = '#131d21'; x.font = '700 22px ui-monospace, Menlo, monospace'; x.textBaseline = 'middle'; x.fillText((name || 'AGENT').slice(0, 14) + ' @ the web', 14, 18);
    x.font = '500 21px ui-monospace, Menlo, monospace'; x.fillStyle = '#c9cede';
    lines.slice(-6).forEach((l, i) => x.fillText('> ' + String(l).slice(0, 34), 14, 64 + i * 36));
    if (Math.floor(t * 2) % 2) { x.fillStyle = booth.fluid; x.fillRect(14, 64 + Math.min(lines.length, 6) * 36 - 12, 12, 22); }
    scrMon.t.needsUpdate = true;
  }

  const booth = {
    grp, slot, fluid, creature: null, boost: 0, flash: 0, awake: true, clock: 0, level: 1, _level: 1, lift: 0, _lift: 0, mode: null, bt: 0, exitDir: 1, breakoutLen: 4.5, name: '',
    setFluid(c) {
      this.fluid = c; M.neon.emissive.set(c);
      // chairs come from one dusky violet family, only faintly tinted by the agent's colour
      const h = [...c].reduce((a, ch) => a + ch.charCodeAt(0), 0), tint = new THREE.Color(c);
      M.chair.color.set(CHAIRS[h % CHAIRS.length]).lerp(tint, .06); M.trim.color.set('#273034');
      M.rim.color.set(LAV).lerp(tint, .35); M.meter.color.set('#6f5f4d').lerp(tint, .12); M.deskMat.color.set('#1f272b');
      spill.material.color.set(LAV).lerp(tint, .15); simPage = null; if (scrSign) scrSign.key = '';
    },
    // the pointer is over this monitor (0/1): the rim brightens a little
    setHover(on) { hover = on ? 1 : 0; },
    // an empty seat waiting for an agent: dim screensaver, no browser
    setIdle(on) { idle = !!on; },
    setLevel(v, instant) { this.level = clamp(v, 0, 1); if (instant) this._level = this.level; },
    setEvo(e) { const u = this.creature?.userData.creature; if (u) u.setEvo(e); },
    setCreature(root) { if (this.creature) this.creature.parent?.remove(this.creature); this.creature = root; if (root) { root.position.set(0, 0, 0); root.rotation.y = .6; slot.add(root); } },
    setActivity(list) { lines.length = 0; lines.push(...(list || []).slice(-6)); },
    // frames: [{ img (URL), url, title, note }] oldest → newest (one browsing session reads as a scroll)
    setBrowser(frames) {
      const key = (frames || []).map((f) => f.img).join('|'); if (key === shotKey) return; shotKey = key;
      shots.length = 0;
      for (const f of (frames || []).slice(-14)) { const img = new Image(); img.decoding = 'async'; img.crossOrigin = 'anonymous'; img.src = f.img; shots.push({ ...f, img }); }
      shotIdx = 0; shotAt = 0;
    },
    setDesk(d) {
      desk = d && { walletSol: d.walletSol, positions: d.positions || [], trades: d.trades || [] };
      if (d && d.pnlSol != null) drawStats(Number(d.pnlSol) || 0, Number(d.launches) || 0);
      const top = desk?.trades[0] ? desk.trades[0].at + desk.trades[0].text : '';
      if (top && top !== deskTop) { if (deskTop && desk.trades[0].kind !== 'fees') { deskHotUntil = Date.now() + 120_000; this.flash = 1; } deskTop = top; }
    },
    get screen() { return shots.length ? shots[shotIdx % shots.length] : null; },
    setTier(n) { const k = Math.max(0, Math.min(3, Math.round(n))); if (k === tier) return; tier = k; applyTier(); this.flash = 1; },
    get tier() { return tier; },
    mon, // the monitor group (raycast it to detect a click on the computer)
    sim: () => simulatedPage(), // the simulated page shown when there are no real screens
    resetScreen() { if (scrSign) scrSign.key = ''; },
    setScreen(left, right) {
      this.name = left; if (!scrSign) return; const key = left + '|' + right; if (key === scrSign.key) return; scrSign.key = key;
      const x = scrSign.c.getContext('2d'), w = scrSign.c.width, h = scrSign.c.height;
      x.clearRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 22); x.fill();
      x.strokeStyle = this.fluid; x.lineWidth = 5; x.stroke();
      x.font = '800 54px "Fredoka", ui-rounded, system-ui, sans-serif'; x.textBaseline = 'middle';
      x.fillStyle = '#ffffff'; x.textAlign = 'left'; x.fillText(left, 28, h / 2 + 3);
      x.fillStyle = this.fluid; x.textAlign = 'right'; x.fillText(right, w - 28, h / 2 + 3);
      scrSign.t.needsUpdate = true;
    },
    // the coin bonded: hop off the chair and walk out along the row
    breakout(onDone) { if (this.mode === 'breakout') return; this.mode = 'breakout'; this.bt = 0; this.onBreakout = onDone; this.flash = 1; },
    stepBreakout(dt) {
      this.bt += dt; const b = this.bt, root = this.creature;
      if (root) {
        const u = root.userData.creature;
        if (!root.userData.free) { root.userData.free = true; }
        if (b < .8) { u.poke = Math.max(u.poke, .6); root.position.y = Math.abs(Math.sin(b * 8)) * .15; }
        else {
          const wt = b - .8;
          root.position.y = lerp(root.position.y, -SEAT_Y / slot.scale.y, Math.min(1, dt * 6));
          root.position.z = lerp(root.position.z, -.9, Math.min(1, dt * 3));
          root.rotation.y = lerp(root.rotation.y, this.exitDir * Math.PI / 2, Math.min(1, dt * 5));
          root.position.x += this.exitDir * 1.6 * clamp(wt * 2, 0, 1) * dt;
          u.walk = clamp(wt * 3, 0, 1); u.walkPhase += dt * 8;
        }
      }
      if (b > this.breakoutLen) { this.mode = null; const c = this.creature; this.creature = null; const cb = this.onBreakout; this.onBreakout = null; cb?.(c); }
    },
    update(t, dt) {
      const awake = this.awake !== false;
      this.boost = Math.max(0, this.boost - dt * .8); this.flash = Math.max(0, this.flash - dt * .7);
      this.clock += dt;
      if (this.mode === 'breakout') this.stepBreakout(dt);
      this._level = lerp(this._level, this.level, Math.min(1, dt * 1.4));
      const L = Math.max(.01, this._level); meter.scale.x = L; meter.position.x = -DESK_W * .4 + DESK_W * .4 * L;
      M.neon.emissiveIntensity = (awake && !idle ? .15 : .05) + this.flash * .4 + this.boost * .2;
      M.keys.emissiveIntensity = awake && !idle ? .14 : .04;
      monScreen.material.color.setScalar(idle ? .32 : awake ? SCREEN_ON + this.boost * .08 : SCREEN_OFF);
      spill.material.opacity = idle ? .015 : awake ? .045 + this.boost * .04 : .01;
      hoverK = lerp(hoverK, hover, Math.min(1, dt * 8));
      M.rim.opacity = (idle ? .28 : awake ? .48 : .3) + hoverK * .45 + this.flash * .2;
      const seen = this.seen !== false; // the game marks screens off camera or far away: they don't redraw
      if (seen && tier >= 1 && Math.floor(t * 3) !== this._frame) { this._frame = Math.floor(t * 3); drawMonitor(t, this.name); }
      if (shots.length && t - shotAt > pace && shotIdx < shots.length - 1) { shotIdx++; shotAt = t; } // one pass, then it stays on the page it ended on until the next session (never loops)
      if (seen && Math.floor(t * (idle ? 2 : 6)) !== this._wf) { this._wf = Math.floor(t * (idle ? 2 : 6)); drawWindow(t); }
      const root = this.creature;
      if (root && !root.userData.free) {
        const u = root.userData.creature;
        // facing the room, glancing at the screen; a little typing bob
        const glance = Math.sin(t * .35 + (u.phase || 0)) > .75 ? .05 : .62; // mostly turned to its screen, now and then to the room
        root.rotation.y = lerp(root.rotation.y, glance, Math.min(1, dt * 2));
        root.position.y = awake ? Math.abs(Math.sin(t * 9 + (u.phase || 0))) * .012 : 0;
        if (this.boost > .1 || this.flash > .1) u.poke = Math.max(u.poke, .3);
        u.asleep = !awake;
        u.update(t, dt);
      } else if (root) root.userData.creature.update(t, dt);
    },
  };
  grp.userData.tube = booth;
  booth.setFluid(fluid); applyTier();
  return booth;
}

// ---------------------------------------------------------------- the room
// Plum walls, dark warm floor, night-city windows, neon signs (CYBER CAFE, a coffee cup, 24/7), a price board,
// shelves with books and plants, warm pendant lamps. Returns { floor, update(t) } like the old lab room.
function neonSign(text, color, w, h, font = 150, soft = false) {
  const s = canvasTex(1024, Math.round(1024 * h / w)); const x = s.c.getContext('2d'), W = s.c.width, H = s.c.height;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${font}px "Fredoka", ui-rounded, system-ui, sans-serif`;
  const lines = String(text).split('\n');
  for (const [blur, col] of soft ? [[8, color], [0, color]] : [[40, color], [16, color], [0, '#ffffff']]) { x.shadowColor = color; x.shadowBlur = blur; x.fillStyle = col; lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * font * 1.05)); }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: s.t, transparent: true, toneMapped: false, depthWrite: false }));
}
function signFrame(w, h, color) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 2.6 });
  const tube = (len, rot) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(.025, len, 4, 8), m); c.rotation.z = rot; return c; };
  const top = tube(w, Math.PI / 2); top.position.y = h / 2; const bot = tube(w, Math.PI / 2); bot.position.y = -h / 2;
  const l = tube(h, 0); l.position.x = -w / 2; const r = tube(h, 0); r.position.x = w / 2; g.add(top, bot, l, r); return g;
}
export function buildCafeRoom(scene, { width = 220, bg = '#202d33', interior = false, ...rest } = {}) {
  if (interior) return buildCafeInterior(scene, rest);
  scene.fog = new THREE.Fog(bg, 14, 30);
  scene.background = new THREE.Color(bg);
  const planks = canvasTex(256, 256); { const x = planks.c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#5a3a2a' : '#64412f'; x.fillRect(0, i * 32, 256, 32); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, i * 32, 256, 2); x.fillRect((i * 97) % 256, i * 32, 2, 32); } }
  planks.t.wrapS = planks.t.wrapT = THREE.RepeatWrapping; planks.t.repeat.set(width / 4, 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, 40), new THREE.MeshPhysicalMaterial({ map: planks.t, roughness: .4, clearcoat: .5, clearcoatRoughness: .3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -6); scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, 16), new THREE.MeshStandardMaterial({ color: '#f7eee0', roughness: .9 }));
  wall.position.set(0, 7, -3.2); scene.add(wall);
  const skirting = new THREE.Mesh(new THREE.BoxGeometry(width, .25, .05), new THREE.MeshStandardMaterial({ color: '#e8d9c3' })); skirting.position.set(0, .12, -3.15); scene.add(skirting);
  // night-city windows
  const view = canvasTex(256, 160); { const x = view.c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#1e333d'); g.addColorStop(1, '#365765'); x.fillStyle = g; x.fillRect(0, 0, 256, 160);
    let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let b = 0; b < 9; b++) { const bx = b * 30 - 6 + rnd() * 8, bw = 22 + rnd() * 10, bh = 50 + rnd() * 90; x.fillStyle = '#1a2a31'; x.fillRect(bx, 160 - bh, bw, bh); for (let wy = 160 - bh + 6; wy < 156; wy += 9) for (let wx = bx + 3; wx < bx + bw - 4; wx += 7) if (rnd() > .45) { x.fillStyle = rnd() > .5 ? '#ffd38a' : '#f6c894'; x.fillRect(wx, wy, 3.5, 4); } } }
  const frameM = new THREE.MeshStandardMaterial({ color: '#253339', roughness: .5 }), glassM = new THREE.MeshBasicMaterial({ map: view.t, toneMapped: false });
  const signs = [];
  for (let i = -10; i <= 10; i++) {
    const cx = i * 6.8;
    // a window, then a wall bay with a neon sign or a shelf, alternating
    const w = new THREE.Group(); w.position.set(cx + 3.4, 3.4, -3.17); scene.add(w);
    w.add(new THREE.Mesh(once('c-pane', () => new THREE.PlaneGeometry(2.6, 1.7)), glassM));
    const fr = new THREE.Mesh(once('c-frame', () => new THREE.BoxGeometry(2.8, 1.9, .04)), frameM); fr.position.z = -.03; w.add(fr);
    const mull = new THREE.Mesh(once('c-mull', () => new THREE.BoxGeometry(.05, 1.7, .03)), frameM); mull.position.z = .01; w.add(mull);
    const kind = ((i % 4) + 4) % 4;
    if (kind === 0) { const s = neonSign('CYBER\nCAFE', '#f3b46b', 2.6, 1.5, 230); s.position.set(cx, 3.5, -3.1); scene.add(s); const f = signFrame(2.7, 1.55, '#f4b976'); f.position.set(cx, 3.5, -3.12); scene.add(f); signs.push(s); }
    else if (kind === 1) { const s = neonSign('☕', '#f4bb7a', 1.2, 1.2, 600); s.position.set(cx, 3.5, -3.1); scene.add(s); signs.push(s); }
    else if (kind === 2) { // price board
      const b = canvasTex(512, 384); const x = b.c.getContext('2d'); x.fillStyle = '#1a282e'; x.fillRect(0, 0, 512, 384); x.strokeStyle = '#3ff0e0'; x.lineWidth = 8; x.strokeRect(10, 10, 492, 364);
      x.fillStyle = '#3ff0e0'; x.font = '700 48px "Fredoka", system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('INTERNET', 256, 70);
      x.font = '600 34px ui-monospace, Menlo, monospace'; x.textAlign = 'left'; x.fillStyle = '#ffffff';
      [['1 HOUR', 'fees'], ['MEMES', 'inference'], ['ATTENTION', 'market cap'], ['WIFI', 'always on']].forEach(([a, c], k) => { x.fillText(a, 40, 140 + k * 60); x.fillStyle = '#ffd36e'; x.textAlign = 'right'; x.fillText(c, 472, 140 + k * 60); x.fillStyle = '#ffffff'; x.textAlign = 'left'; });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ map: b.t, toneMapped: false })); board.position.set(cx, 3.5, -3.1); scene.add(board);
    } else { // shelf with books and a plant
      const sh = new THREE.Mesh(once('sh', () => new THREE.BoxGeometry(1.8, .06, .3)), new THREE.MeshStandardMaterial({ color: '#8a5a3b' })); sh.position.set(cx, 3.05, -3.0); scene.add(sh);
      ['#ff8fae', '#7cc8ff', '#ffe066', '#f8d3a9', '#6fe0b5'].forEach((c, k) => { const bk = new THREE.Mesh(once('bk', () => new THREE.BoxGeometry(.1, .32, .22)), new THREE.MeshStandardMaterial({ color: c })); bk.position.set(cx - .75 + k * .12, 3.25, -3.0); bk.rotation.z = k === 4 ? .25 : 0; scene.add(bk); });
      const pot = new THREE.Mesh(once('sp', () => new THREE.CylinderGeometry(.12, .1, .2, 16)), new THREE.MeshStandardMaterial({ color: '#f3efe8' })); pot.position.set(cx + .55, 3.18, -3.0); scene.add(pot);
      for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(once('sl', () => new THREE.SphereGeometry(.09, 8, 6)), new THREE.MeshStandardMaterial({ color: '#57b86a' })); l.scale.set(.7, 1.7, .7); l.position.set(cx + .55 + Math.cos(k) * .1, 3.37 + (k % 3) * .04, -3.0 + Math.sin(k) * .08); l.rotation.z = Math.cos(k) * .7; scene.add(l); }
      const s = neonSign('24/7', '#3ff0e0', 1.2, .5, 300); s.position.set(cx, 4.1, -3.1); scene.add(s); signs.push(s);
    }
  }
  // warm pendant lamps
  const lampM = new THREE.MeshStandardMaterial({ color: '#e8735a', roughness: .45 }), bulbM = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color('#ffc46b'), emissiveIntensity: 2.4 });
  for (let i = -20; i <= 20; i++) {
    const x = i * 2.25;
    const cord = new THREE.Mesh(once('c-cord', () => new THREE.CylinderGeometry(.01, .01, 2.4, 6)), new THREE.MeshStandardMaterial({ color: '#182125' })); cord.position.set(x, 5.75, -.6); scene.add(cord);
    const shade = new THREE.Mesh(once('c-shade', () => new THREE.SphereGeometry(.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), lampM); shade.position.set(x, 4.55, -.6); shade.scale.set(1, .7, 1); scene.add(shade);
    const bulb = new THREE.Mesh(once('c-bulb', () => new THREE.SphereGeometry(.09, 12, 8)), bulbM); bulb.position.set(x, 4.51, -.6); scene.add(bulb);
  }
  // purple-pink ambient and warm lamp light
  scene.add(new THREE.HemisphereLight('#f6c995', '#28383e', .55));
  const warm = new THREE.DirectionalLight('#ffd2a1', .55); warm.position.set(2, 6, 4); scene.add(warm);
  return { floor, update(t) { signs.forEach((s, i) => { s.material.opacity = .9 + Math.sin(t * 3 + i) * .05 - (Math.sin(t * 13 + i * 7) > .985 ? .4 : 0); }); } };
}

// ================================================================ the walkable cafe of the game
// A cosy late-night Tokyo net cafe: dim warm light, dark wood, charcoal and muted plum, a few small neon accents.
// Along x (the agents' booth row stands at z = 0; the player walks the aisle in front of it, z 1.25 … 5):
//   left wall (x -3.9) with the street door (z 2.6) · reception counter with a coffee machine and snack shelf ·
//   the LAUNCH YOUR AGENT kiosk (x .8) · agent booths from ROW_X0 every 2.25 · the agent casino (slot machines,
//   a dice table in the aisle, a card table) · right wall.
// room.setRowEnd(x) moves everything right of the row (and rebuilds the windows, lamps and wall shelves over it).
export const CAFE = { ROW_X0: 3.2, SP: 2.25, LEFT_X: -3.9, WALL_Z: -3.2, DOOR_Z: 2.6, KIOSK_X: .8, RIGHT_PAD: 9.4, MIN_Z: 1.25, MAX_Z: 5 };

// merge many small static parts into one mesh per material
function kit() {
  const B = new Map(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 18, 12);
  let base = new THREE.Matrix4();
  const k = {
    at(x = 0, y = 0, z = 0, ry = 0) { base = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)); return k; },
    geo(g, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
      const c = (g.index ? g.toNonIndexed() : g.clone());
      for (const n of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(n)) c.deleteAttribute(n);
      c.applyMatrix4(M4.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)).premultiply(base));
      if (!B.has(mat)) B.set(mat, []); B.get(mat).push(c); return k;
    },
    box(w, h, d, mat, x, y, z, ry = 0, rx = 0, rz = 0) { return k.geo(BOX, mat, x, y, z, w, h, d, rx, ry, rz); },
    ball(rx_, ry_, rz_, mat, x, y, z, rot = 0) { return k.geo(SPH, mat, x, y, z, rx_, ry_, rz_, 0, rot, 0); },
    cyl(rt, rb, h, mat, x, y, z, seg = 16, rx = 0, rz = 0) { return k.geo(once(`kc${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat, x, y, z, 1, 1, 1, rx, 0, rz); },
    rbox(w, h, d, r, mat, x, y, z, ry = 0, rx = 0) { return k.geo(once(`kr${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r)), mat, x, y, z, 1, 1, 1, rx, ry, 0); },
    plane(w, h, mat, x, y, z, ry = 0, rx = 0) { return k.geo(once('kp', () => new THREE.PlaneGeometry(1, 1)), mat, x, y, z, w, h, 1, rx, ry, 0); },
    flush(parent) { for (const [mat, list] of B) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.matrixAutoUpdate = false; m.updateMatrix(); parent.add(m); list.forEach((g) => g.dispose()); } B.clear(); return parent; },
  };
  return k;
}
function paint(w, h, draw, repeat = null) { const s = canvasTex(w, h); draw(s.c.getContext('2d'), w, h); if (repeat) { s.t.wrapS = s.t.wrapT = THREE.RepeatWrapping; s.t.repeat.set(...repeat); } return s.t; }
let rs = 11; const rnd = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
const MUTED = ['#8a5a5a', '#5f7a8c', '#a08a5c', '#6e8a6a', '#8d7e6d', '#9a6f55', '#566070', '#a0767e', '#4f6e66', '#8c8070', '#b39a6b', '#6e6255'];
function spines(x, w, h, rows, seed = 3) { // a bookcase full of manga/comic spines
  rs = seed; const rh = h / rows;
  x.fillStyle = '#1d1712'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) {
    let bx = 6; const y0 = r * rh + 8, y1 = (r + 1) * rh - 10;
    while (bx < w - 10) {
      const bw = 9 + rnd() * 10, bh = (y1 - y0) * (.72 + rnd() * .26), c = MUTED[Math.floor(rnd() * MUTED.length)];
      if (rnd() < .05) { bx += 14; continue; } // a gap
      x.fillStyle = c; x.fillRect(bx, y1 - bh, bw - 1.5, bh);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(bx + 2, y1 - bh + 6, bw - 5, 3); x.fillRect(bx + 2, y1 - 12, bw - 5, 2);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(bx + bw - 3, y1 - bh, 1.5, bh);
      bx += bw;
    }
    x.fillStyle = '#3a2b20'; x.fillRect(0, (r + 1) * rh - 10, w, 10); // shelf board
  }
}
function textSign(text, { w = 512, h = 128, bg = '#1a1e20', fg = '#e9dcc6', font = 64, weight = 700, border = null } = {}) {
  return paint(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h); if (border) { x.strokeStyle = border; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); }
    x.fillStyle = fg; x.font = `${weight} ${font}px "Fredoka", ui-rounded, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    String(text).split('\n').forEach((l, i, a) => x.fillText(l, w / 2, h / 2 + (i - (a.length - 1) / 2) * font * 1.08 + 3));
  });
}

export function buildCafeInterior(scene, { bg = '#f4ead9' } = {}) {
  const { ROW_X0, SP, LEFT_X, WALL_Z, DOOR_Z, KIOSK_X, RIGHT_PAD } = CAFE;
  scene.fog = new THREE.Fog(bg, 22, 48); // lighter and further: the back rows stay readable
  scene.background = new THREE.Color(bg);
  const signs = [];
  const neon = (text, color, w, h, font, dim = .8) => { const s = neonSign(text, color, w, h, font, true); s.material.color.setScalar(dim); signs.push(s); return s; };
  // ---------------- materials
  const std = (color, roughness = .8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const M = {
    wall: std('#fbf1e3', .95), wall2: std('#f6e6d6', .95), ceil: std('#fdf8f1', 1), wood: std('#d9b48c', .7), woodD: std('#c99d74', .75), woodL: std('#e6c9a5', .5),
    metal: std('#2e2c33', .4, { metalness: .6 }), steel: std('#6b6870', .35, { metalness: .7 }), black: std('#141718', .6), cream: std('#d8cfc0', .7),
    plum: std('#475c65', .9), teal: std('#2f4d4c', .9), mustard: std('#8a6a35', .9), rose: std('#7d4f58', .9), sage: std('#4e6150', .9),
    leaf: std('#3f6b45', .75), leaf2: std('#56804f', .75), pot: std('#8a6a55', .8), potW: std('#cbc2b4', .7), frost: M_FROST(),
    warm: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9b0').multiplyScalar(.72) }), paper: new THREE.MeshStandardMaterial({ color: '#e8d6b8', emissive: new THREE.Color('#ffb062'), emissiveIntensity: .55, roughness: 1 }),
    shadeIn: new THREE.MeshStandardMaterial({ color: '#2c2630', emissive: new THREE.Color('#ffb066'), emissiveIntensity: .04, side: THREE.DoubleSide, roughness: .5, metalness: .3 }),
  };
  function M_FROST() { return new THREE.MeshStandardMaterial({ color: '#8d8496', roughness: .9, transparent: true, opacity: .3, depthWrite: false }); }
  const K = kit();

  // ---------------- shell: floor, walls, wainscot, ceiling
  const planks = paint(256, 256, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = ['#e8cfae', '#e2c6a2', '#ecd5b6', '#ddc09b'][i % 4]; x.fillRect(0, i * 32, 256, 32); x.fillStyle = 'rgba(120,80,40,.22)'; x.fillRect(0, i * 32, 256, 1.5); x.fillRect((i * 97) % 256, i * 32, 1.5, 32); x.fillStyle = 'rgba(220,200,255,.025)'; x.fillRect(0, i * 32 + 6, 256, 8); } }, [60, 12]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 110), new THREE.MeshStandardMaterial({ map: planks, roughness: .5, metalness: .05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(100, 0, 50); scene.add(floor); // deep enough for many more rows
  const slats = paint(128, 64, (x) => { x.fillStyle = '#cfe6f2'; x.fillRect(0, 0, 128, 64); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#bfe3f2' : '#d7eef8'; x.fillRect(i * 16 + 1, 0, 14, 64); } }, [140, 1]);
  const slatM = new THREE.MeshStandardMaterial({ map: slats, roughness: .8 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(240, 4.8), M.wall); back.position.set(100, 2.4, WALL_Z); scene.add(back);
  const wains = new THREE.Mesh(new THREE.PlaneGeometry(240, 1.05), slatM); wains.position.set(100, .525, WALL_Z + .01); scene.add(wains);
  K.box(240, .05, .06, M.woodD, 100, 1.06, WALL_Z + .03);
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(70, 4.8), M.wall2); leftWall.rotation.y = Math.PI / 2; leftWall.position.set(LEFT_X, 2.4, WALL_Z + 35); scene.add(leftWall);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(240, 70), M.ceil); ceil.rotation.x = Math.PI / 2; ceil.position.set(100, 4.6, WALL_Z + 35); scene.add(ceil);
  K.box(.06, 1.05, 70, M.woodD, LEFT_X + .02, .525, WALL_Z + 35); // left wainscot (plain)

  // ---------------- the street door in the left wall, with a little vestibule
  const street = paint(256, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0e1417'); g.addColorStop(.6, '#182227'); g.addColorStop(1, '#0b0f10'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    rs = 5; for (let i = 0; i < 26; i++) { const c = ['#ff6fae', '#5fd6c8', '#ffcf7a', '#8fa0ff'][i % 4]; const r = 6 + rnd() * 16; const gg = x.createRadialGradient(0, 0, 0, 0, 0, r); gg.addColorStop(0, c); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.translate(rnd() * w, 60 + rnd() * h * .6); x.globalAlpha = .35 + rnd() * .3; x.fillStyle = gg; x.fillRect(-r, -r, r * 2, r * 2); x.restore(); }
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.moveTo(20, 0); x.lineTo(90, 0); x.lineTo(30, h); x.lineTo(0, h); x.fill(); // glass sheen
  });
  const doorG = new THREE.Group(); doorG.position.z = DOOR_Z; scene.add(doorG); const DK = kit();
  DK.at(LEFT_X, 0, 0, Math.PI / 2);
  DK.box(.12, 2.75, .14, M.metal, -.85, 1.375, .04); DK.box(.12, 2.75, .14, M.metal, .85, 1.375, .04); DK.box(1.82, .14, .14, M.metal, 0, 2.75, .04);
  DK.box(.03, 2.6, .03, M.metal, 0, 1.3, .06); DK.box(.04, .7, .04, M.steel, -.12, 1.15, .12); DK.box(.04, .7, .04, M.steel, .12, 1.15, .12); // two leaves, push bars
  DK.at();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.62), new THREE.MeshBasicMaterial({ map: street, color: new THREE.Color().setScalar(.85) })); glass.rotation.y = Math.PI / 2; glass.position.set(LEFT_X + .01, 1.33, 0); doorG.add(glass);
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(.7, .22), new THREE.MeshBasicMaterial({ map: textSign('EXIT', { w: 256, h: 80, bg: '#0f1a14', fg: '#5fe0a0', font: 52 }), color: new THREE.Color().setScalar(.9) })); exit.rotation.y = Math.PI / 2; exit.position.set(LEFT_X + .05, 3.05, 0); doorG.add(exit);
  DK.box(.04, .26, .74, M.black, LEFT_X + .02, 3.05, 0);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7), new THREE.MeshStandardMaterial({ map: paint(128, 220, (x, w, h) => { x.fillStyle = '#2b2a2e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4a4650'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(14, 14 + i * 11, w - 28, 4); } }), roughness: 1 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(LEFT_X + .6, .006, 0); doorG.add(mat);
  // the way out glows, so people can always find it: a soft green aura on the wall, a lit outline round the frame,
  // a pool of light on the floor and a bigger EXIT sign; all of it breathes gently (room.update)
  exit.scale.set(1.5, 1.5, 1); exit.position.y = 3.2;
  const EXIT_G = '#4fe39a', exitGlow = [];
  const aura = lightPool(EXIT_G, 1, .3); aura.rotation.set(0, Math.PI / 2, 0); aura.scale.set(3.4, 4.2, 1); aura.position.set(LEFT_X + .03, 1.55, 0); doorG.add(aura); exitGlow.push([aura.material, .3]);
  const pool = lightPool(EXIT_G, 1, .32); pool.scale.set(2.6, 2.2, 1); pool.position.set(LEFT_X + 1.0, .012, 0); doorG.add(pool); exitGlow.push([pool.material, .32]);
  const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(EXIT_G).multiplyScalar(1.15), transparent: true, opacity: .9 }); exitGlow.push([lineM, .9]);
  for (const [w, h, y, z] of [[.035, 2.82, 1.41, 0 - .93], [.035, 2.82, 1.41, 0 + .93], [.035, .035, 2.84, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, z === 0 ? 1.9 : .035), lineM); m.position.set(LEFT_X + .13, y, z); doorG.add(m); }
  const exitLight = new THREE.PointLight(EXIT_G, 1.6, 6, 2); exitLight.position.set(LEFT_X + 1.1, 1.8, 0); doorG.add(exitLight);
  DK.flush(doorG);
  const door = { x: LEFT_X, z: DOOR_Z };
  // shoe lockers by the door (a net cafe classic) and an umbrella stand
  const lockers = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.25), new THREE.MeshStandardMaterial({ roughness: .6, map: paint(256, 256, (x, w, h) => { x.fillStyle = '#3b3f44'; x.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = '#545a60'; x.fillRect(6 + c * 62, 6 + r * 62, 56, 56); x.fillStyle = '#c9b77a'; x.fillRect(14 + c * 62, 12 + r * 62, 14, 8); x.fillStyle = '#2b2e33'; x.fillRect(44 + c * 62, 30 + r * 62, 4, 14); } }) }));
  lockers.rotation.y = Math.PI / 2; lockers.position.set(LEFT_X + .46, .66, .45); scene.add(lockers);
  K.box(.44, 1.32, 1.36, M.metal, LEFT_X + .23, .66, .45);
  K.cyl(.13, .11, .45, M.steel, LEFT_X + .3, .225, 1.45, 14); for (let i = 0; i < 3; i++) K.cyl(.012, .012, .8, i === 1 ? M.rose : M.teal, LEFT_X + .27 + i * .04, .55, 1.42 + i * .03, 6, .08 * (i - 1), .1);

  // ---------------- reception counter with a coffee machine, snack shelf and a chalk menu
  const RX = -2.35, RZ = -1.55;
  const front = paint(256, 128, (x, w, h) => { x.fillStyle = '#232b2e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#2f383c' : '#2a3236'; x.fillRect(i * 16 + 1, 0, 14, h); } });
  K.box(2.5, .95, .72, new THREE.MeshStandardMaterial({ map: front, roughness: .75 }), RX, .475, RZ);
  K.box(2.62, .06, .86, M.woodL, RX, .98, RZ + .02);
  K.box(2.5, .08, .1, M.black, RX, .06, RZ + .37); // kick plate
  // coffee machine
  K.rbox(.36, .48, .34, .03, M.steel, RX - .85, 1.25, RZ - .1); K.box(.3, .12, .26, M.black, RX - .85, 1.07, RZ - .06); K.box(.12, .06, .08, M.black, RX - .85, 1.36, RZ + .08);
  K.cyl(.035, .03, .07, M.cream, RX - .85, 1.07, RZ + .04, 12); K.cyl(.05, .05, .02, M.black, RX - .7, 1.48, RZ - .1, 12);
  K.ball(.016, .016, .016, new THREE.MeshBasicMaterial({ color: '#d0503e' }), RX - .75, 1.42, RZ + .08);
  // cups stack, cookie jars, a bell, a little cat figure, a tablet till
  for (let i = 0; i < 4; i++) K.cyl(.045, .035, .09, M.cream, RX - .45, 1.05 + i * .055, RZ + .12, 12);
  for (let i = 0; i < 3; i++) { K.cyl(.08, .08, .2, M.frost, RX - .2 + i * .2, 1.11, RZ - .2, 14); K.cyl(.065, .065, .1, [M.mustard, M.rose, M.sage][i], RX - .2 + i * .2, 1.06, RZ - .2, 12); K.cyl(.085, .085, .03, M.woodD, RX - .2 + i * .2, 1.225, RZ - .2, 14); }
  K.geo(new THREE.SphereGeometry(.06, 14, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b08a45', metalness: .7, roughness: .3 }), RX + .55, 1.01, RZ + .22);
  K.ball(.09, .085, .08, M.cream, RX + .95, 1.09, RZ - .05); K.ball(.07, .065, .065, M.cream, RX + .95, 1.22, RZ - .03); // a round cat figure
  K.geo(once('ear', () => new THREE.ConeGeometry(.025, .05, 8)), M.cream, RX + .91, 1.29, RZ - .03); K.geo(once('ear', () => new THREE.ConeGeometry(.025, .05, 8)), M.cream, RX + .99, 1.29, RZ - .03);
  K.ball(.01, .01, .01, M.black, RX + .925, 1.23, RZ + .03); K.ball(.01, .01, .01, M.black, RX + .975, 1.23, RZ + .03);
  K.box(.3, .2, .02, M.black, RX + .2, 1.12, RZ + .05, 0, -.5); K.box(.04, .1, .04, M.metal, RX + .2, 1.04, RZ);
  const till = new THREE.Mesh(new THREE.PlaneGeometry(.27, .17), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(.55), map: textSign('WELCOME', { w: 256, h: 160, bg: '#1d2a33', fg: '#9fd8d0', font: 40 }) }));
  till.position.set(RX + .2, 1.125, RZ + .062); till.rotation.x = -.5; scene.add(till);
  // shelving behind the counter: snacks, cup noodles, drinks
  const snacks = paint(512, 256, (x, w, h) => {
    x.fillStyle = '#1f1814'; x.fillRect(0, 0, w, h); rs = 21;
    for (let r = 0; r < 3; r++) { const y1 = (r + 1) * 85 - 8; let bx = 8; while (bx < w - 30) { const kind = rnd(); const c = MUTED[Math.floor(rnd() * MUTED.length)];
      if (kind < .4) { x.fillStyle = c; x.fillRect(bx, y1 - 48, 30, 48); x.fillStyle = '#e8dcc6'; x.fillRect(bx, y1 - 48, 30, 10); x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(bx + 15, y1 - 24, 7, 0, TAU); x.fill(); bx += 34; } // cup noodles
      else if (kind < .75) { x.fillStyle = c; x.beginPath(); x.roundRect(bx, y1 - 56, 34, 56, 6); x.fill(); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(bx + 6, y1 - 40, 22, 12); bx += 38; } // chip bags
      else { x.fillStyle = '#3d6a5a'; x.fillRect(bx + 4, y1 - 62, 12, 62); x.fillStyle = '#c87a4a'; x.fillRect(bx + 20, y1 - 62, 12, 62); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(bx + 4, y1 - 40, 28, 6); bx += 40; } } // bottles
      x.fillStyle = '#4a3527'; x.fillRect(0, y1, w, 8); }
  });
  K.box(2.7, 1.45, .32, M.woodD, RX, 1.55, WALL_Z + .16);
  const shelf = new THREE.Mesh(new THREE.PlaneGeometry(2.56, 1.3), new THREE.MeshStandardMaterial({ map: snacks, roughness: .8 })); shelf.position.set(RX, 1.55, WALL_Z + .325); scene.add(shelf);
  const menu = paint(512, 256, (x, w, h) => {
    x.fillStyle = '#1e2420'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a4433'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
    x.fillStyle = '#e9e2d2'; x.font = '600 38px "Fredoka", ui-rounded, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('MENU', w / 2, 52);
    x.font = '500 26px "Fredoka", ui-rounded, system-ui, sans-serif'; x.textAlign = 'left';
    [['coffee', '1h'], ['melon soda', '1h'], ['cup ramen', '2h'], ['night pack', '8h'], ['free wifi', '24/7']].forEach(([a, b], i) => { x.fillStyle = '#e9e2d2'; x.fillText(a, 40, 96 + i * 32); x.fillStyle = '#e8c27a'; x.textAlign = 'right'; x.fillText(b, w - 40, 96 + i * 32); x.textAlign = 'left'; });
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .85), new THREE.MeshStandardMaterial({ map: menu, roughness: .9 })); board.position.set(RX - .2, 2.8, WALL_Z + .03); scene.add(board);
  const ncafe = neon('NET CAFE', '#f9dcba', 1.7, .42, 150, .5); ncafe.position.set(RX + .1, 3.65, WALL_Z + .05); scene.add(ncafe);
  // a wall clock
  K.cyl(.2, .2, .04, M.cream, RX + 1.15, 2.95, WALL_Z + .04, 24, Math.PI / 2); K.box(.015, .14, .01, M.black, RX + 1.15, 3.0, WALL_Z + .07); K.box(.1, .015, .01, M.black, RX + 1.19, 2.95, WALL_Z + .07);
  // a tall plant in the corner
  const plant = (x, z, s = 1, pot = M.pot) => { K.cyl(.2 * s, .16 * s, .4 * s, pot, x, .2 * s, z, 16); for (let i = 0; i < 9; i++) { const a = i * 2.4; K.ball(.07 * s, .3 * s, .07 * s, i % 2 ? M.leaf : M.leaf2, x + Math.cos(a) * .12 * s, (.65 + (i % 3) * .18) * s, z + Math.sin(a) * .12 * s, a); } for (let i = 0; i < 6; i++) { const a = i * 1.1; K.geo(once('lf', () => new THREE.SphereGeometry(1, 10, 6)), i % 2 ? M.leaf2 : M.leaf, x + Math.cos(a) * .25 * s, (.95 + (i % 2) * .25) * s, z + Math.sin(a) * .2 * s, .22 * s, .06 * s, .1 * s, 0, -a, .4); } };
  plant(LEFT_X + .45, WALL_Z + .5, 1.15);
  // warm pendants over the counter
  for (const dx of [-.7, .7]) { K.cyl(.006, .006, 1.2, M.black, RX + dx, 4.0, RZ + .1, 6); K.geo(once('pshade', () => new THREE.ConeGeometry(.2, .2, 20, 1, true)), M.shadeIn, RX + dx, 3.32, RZ + .1); K.ball(.06, .06, .06, M.warm, RX + dx, 3.24, RZ + .1); }
  const recPool = lightPool('#ffc9a0', 1, .18); recPool.scale.set(2.8, 1.2, 1); recPool.position.set(RX, .99, RZ + .05); scene.add(recPool);
  const recLight = new THREE.PointLight('#ffcfa8', 3, 7, 2); recLight.position.set(RX, 2.6, RZ + .9); scene.add(recLight);

  // ---------------- LAUNCH YOUR AGENT kiosk: an empty booth waiting for you
  const KX = KIOSK_X, launchSpot = { x: KX, z: 1.6 };
  const mint = LAV; // the launch booth wears the player's lavender
  const kiosk = new THREE.Group(); kiosk.position.x = KX; scene.add(kiosk);
  const KK = kit();
  const mintGlow = new THREE.MeshStandardMaterial({ color: '#46545a', emissive: new THREE.Color(mint), emissiveIntensity: .12, roughness: .35, metalness: .35 });
  const kTopM = new THREE.MeshPhysicalMaterial({ color: WOOD_TOP, roughness: .42, clearcoat: .5, clearcoatRoughness: .3 });
  KK.rbox(1.98, .07, .92, .025, kTopM, 0, DESK_Y, .15); KK.rbox(1.9, .022, .86, .01, mintGlow, 0, DESK_Y - .042, .15); KK.rbox(1.7, .24, .025, .01, M.woodD, 0, DESK_Y - .18, .44);
  for (const lx of [-.86, .86]) { for (const lz of [-.22, .5]) KK.cyl(.018, .014, DESK_Y - .05, M.metal, lx, (DESK_Y - .05) / 2, lz, 10); KK.box(.03, .02, .76, M.metal, lx, .01, .14); }
  // side partitions with a lavender-metal rail
  for (const sx of [-1.07, 1.07]) { KK.box(.05, 1.0, 1.6, M.woodD, sx, .5, -.22); KK.box(.03, .46, 1.6, M.frost, sx, 1.23, -.22); KK.box(.07, .04, 1.64, mintGlow, sx, 1.47, -.22); KK.box(.07, 1.49, .07, M.woodD, sx, .745, .58); }
  // keyboard, a little plant, a stack of starter cards
  KK.box(.9, .008, .42, std('#273136', .95), -.05, DESK_Y + .038, .22); KK.rbox(.5, .028, .17, .01, M.black, -.15, DESK_Y + .055, .22); KK.rbox(.1, .025, .14, .012, M.black, .3, DESK_Y + .052, .3);
  KK.cyl(.06, .05, .1, M.potW, -.8, DESK_Y + .08, .3, 12); for (let i = 0; i < 5; i++) KK.ball(.035, .09, .035, M.leaf2, -.8 + Math.cos(i * 1.3) * .04, DESK_Y + .18, .3 + Math.sin(i * 1.3) * .04, i);
  // the big monitor faces the room so you can read it
  KK.box(1.0, .63, .05, M.black, .38, DESK_Y + .6, -.05); KK.box(.08, .32, .05, M.black, .38, DESK_Y + .16, -.1); KK.box(.36, .025, .22, M.black, .38, DESK_Y + .02, -.06);
  KK.flush(kiosk);
  const launchScr = canvasTex(512, 300);
  const drawLaunch = (t) => {
    const x = launchScr.c.getContext('2d'), w = 512, h = 300;
    x.fillStyle = '#151c1f'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(169,147,245,.12)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 40 + i * 30); x.lineTo(w, 40 + i * 30); x.stroke(); }
    x.fillStyle = mint; x.font = '700 40px "Fredoka", ui-rounded, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('LAUNCH YOUR', w / 2, 70); x.fillText('OWN AGENT', w / 2, 116);
    // a dashed silhouette of a new agent with a plus
    x.lineWidth = 3; x.strokeStyle = 'rgba(169,147,245,.6)'; x.beginPath(); x.arc(w / 2, 210, 40, 0, TAU); x.stroke();
    x.fillStyle = mint; x.fillRect(w / 2 - 4, 190, 8, 40); x.fillRect(w / 2 - 20, 206, 40, 8);
    if (Math.floor(t * 1.6) % 2) { x.font = '600 22px ui-monospace, Menlo, monospace'; x.fillStyle = '#f3e5d6'; x.fillText('walk up and press E', w / 2, 278); }
    launchScr.t.needsUpdate = true;
  };
  drawLaunch(0);
  const kscreen = new THREE.Mesh(new THREE.PlaneGeometry(.93, .56), new THREE.MeshBasicMaterial({ map: launchScr.t, color: new THREE.Color().setScalar(.72) })); kscreen.position.set(.38, DESK_Y + .6, -.022); kiosk.add(kscreen);
  // the empty chair waiting for your agent
  const kRim = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .73), new THREE.MeshBasicMaterial({ map: monitorRim(), color: LAV, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })); kRim.position.set(.38, DESK_Y + .6, -.02); kRim.renderOrder = 3; kiosk.add(kRim);
  const kchair = buildChair(std('#a28a6f', .85), std('#273034', .7), M.metal); kchair.position.set(-.45, 0, -.66); kchair.rotation.y = .3; kiosk.add(kchair);
  // the hanging sign
  const ksign = neon('LAUNCH YOUR AGENT', '#f9dcba', 2.3, .42, 84, .62); ksign.position.set(0, 2.55, -.1); kiosk.add(ksign);
  const kboard = new THREE.Mesh(new THREE.BoxGeometry(2.4, .55, .04), std('#192124', .6)); kboard.position.set(0, 2.55, -.14); kiosk.add(kboard);
  for (const sx of [-1, 1]) { const c = new THREE.Mesh(once('kcord', () => new THREE.CylinderGeometry(.006, .006, 1.8, 6)), M.black); c.position.set(sx * 1.0, 3.72, -.14); kiosk.add(c); }
  // the spot on the floor where you stand to launch
  // a soft lavender rug with a small "+": the floor spot reads as part of the room, and warms a little as you near it
  const rugTex = launchRugTex();
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.12), new THREE.MeshStandardMaterial({ map: rugTex, emissiveMap: rugTex, emissive: new THREE.Color(LAV), emissiveIntensity: .03, roughness: 1, transparent: true, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(launchSpot.x, .008, launchSpot.z); pad.renderOrder = 1; scene.add(pad);
  const kpool = lightPool(mint, 1, .05); kpool.scale.set(1.8, .8, 1); kpool.position.set(0, DESK_Y + .033, .2); kiosk.add(kpool);
  const kLight = new THREE.PointLight(mint, .5, 4.5, 2); kLight.position.set(KX, 1.6, .9); scene.add(kLight);
  let near = false, nearK = 0;

  // ---------------- static long pieces: the cable tray along the ceiling
  K.box(240, .03, .34, M.metal, 100, 4.05, -1.25); for (const s of [-1, 1]) K.box(240, .07, .02, M.metal, 100, 4.08, -1.25 + s * .17);
  K.cyl(.018, .018, 240, M.black, 100, 4.09, -1.32, 6, 0, Math.PI / 2); K.cyl(.014, .014, 240, new THREE.MeshStandardMaterial({ color: '#3a4a6a', roughness: .6 }), 100, 4.09, -1.22, 6, 0, Math.PI / 2); K.cyl(.012, .012, 240, M.rose, 100, 4.09, -1.16, 6, 0, Math.PI / 2);
  K.flush(scene);

  // ---------------- over the booth row (rebuilt by setRowEnd): windows, pendant lamps, a wall shelf with plants and posters
  const city = paint(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b292e'); g.addColorStop(.7, '#314249'); g.addColorStop(1, '#36444a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    rs = 7; for (let b = 0; b < 16; b++) { const bx = b * 34 - 10 + rnd() * 10, bw = 26 + rnd() * 14, bh = 80 + rnd() * 160; x.fillStyle = b % 2 ? '#141b1e' : '#1b2427'; x.fillRect(bx, h - bh, bw, bh); for (let wy = h - bh + 8; wy < h - 4; wy += 11) for (let wx = bx + 4; wx < bx + bw - 5; wx += 8) if (rnd() > .62) { x.fillStyle = rnd() > .3 ? 'rgba(240,190,120,.95)' : 'rgba(160,180,220,.85)'; x.fillRect(wx, wy, 4, 5); } if (rnd() > .6) { x.fillStyle = '#c04040'; x.fillRect(bx + bw / 2 - 2, h - bh - 4, 4, 4); } }
  });
  const glassM = new THREE.MeshBasicMaterial({ map: city, color: new THREE.Color().setScalar(.85) });
  const POSTERS = [['LO-FI\nNIGHTS', '#3b4a6b', '#e8c27a'], ['GG', '#5a3348', '#f0d6c0'], ['RAMEN\n24H', '#4a3a2a', '#f2a65a'], ['STAY\nCOSY', '#2f4a44', '#d9efe6'], ['NEW\nHIGH\nSCORE', '#36444a', '#fadebd'], ['☾', '#252e33', '#e9dcae']];
  const posterM = POSTERS.map(([t, b, f]) => new THREE.MeshStandardMaterial({ roughness: .8, map: textSign(t, { w: 192, h: 256, bg: b, fg: f, font: t.length > 6 ? 46 : 70, border: 'rgba(255,255,255,.25)' }) }));
  const rowGroup = new THREE.Group(); scene.add(rowGroup);
  function buildRow(rowEnd) {
    rowGroup.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); rowGroup.clear();
    const R = kit(), x0 = ROW_X0 - SP / 2, x1 = rowEnd + SP / 2, n = Math.round((rowEnd - ROW_X0) / SP) + 1;
    // (no windows: owner, 2026-10-05; the back wall carries the casino sign instead)
    // a slim wall shelf behind every booth with a plant or books, and a poster between
    for (let i = 0; i < n; i++) {
      const bx = ROW_X0 + i * SP; rs = 31 + i * 7;
      R.box(1.3, .04, .22, M.woodD, bx - .3, 1.95, WALL_Z + .11);
      if (i % 3 === 0) { R.cyl(.08, .06, .14, M.potW, bx - .7, 2.04, WALL_Z + .12, 12); for (let k = 0; k < 5; k++) R.ball(.03, .09, .03, M.leaf, bx - .7 + Math.cos(k * 1.3) * .045, 2.16, WALL_Z + .12 + Math.sin(k * 1.3) * .03, k); }
      else for (let k = 0; k < 6; k++) R.box(.05, .2 + rnd() * .06, .15, [M.plum, M.teal, M.mustard, M.rose, M.sage][(i + k) % 5], bx - .85 + k * .055, 2.08, WALL_Z + .11);
      if (i % 2 === 1) R.plane(.42, .56, posterM[i % posterM.length], bx + .55, 1.62, WALL_Z + .02);
      // a warm pendant over each booth (cord, shade, bulb)
      R.cyl(.006, .006, .9, M.black, bx - .2, 4.15, -.35, 6); R.geo(once('pshade2', () => new THREE.SphereGeometry(.2, 18, 8, 0, TAU, 0, Math.PI / 2)), M.shadeIn, bx - .2, 3.7, -.35, 1, .75, 1); R.ball(.06, .06, .06, M.warm, bx - .2, 3.66, -.35);
    }
    R.flush(rowGroup);
  }

  // ---------------- right of the row: the casino and the right wall
  const right = new THREE.Group(); scene.add(right);
  const RK = kit();
  // end partition of the last booth
  RK.box(.05, 1.0, 1.6, M.woodD, SP / 2, .5, -.22); RK.box(.03, .46, 1.6, M.frost, SP / 2, 1.23, -.22); RK.box(.07, .04, 1.64, M.woodD, SP / 2, 1.47, -.22); RK.box(.07, 1.49, .07, M.woodD, SP / 2, .745, .58);
  // the casino is closed (owner, 2026-10-07): everything it built goes in a hidden group, and its spots are gone
  const casinoG = new THREE.Group(); casinoG.visible = false; right.add(casinoG);
  // ---------------- the casino (owner: it replaces the drink bar, the comics wall and the chill zone)
  // Casino carpet, a lit back wall with a big neon sign, a row of five slot machines with stools (walk up to them in
  // the aisle and press E), a dice table you can walk round in the aisle, and a card table in the back corner.
  const felt = std('#745430', .95), gold = std('#e6b84a', .3, { metalness: .65 }), plum = std('#20343d', .6), cream = std('#fbf3dc', .5);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 4.5), new THREE.MeshStandardMaterial({ roughness: 1, map: paint(512, 280, (x, w, h) => {
    x.fillStyle = '#26404b'; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < h + 40; yy += 40) for (let xx = 0; xx < w + 40; xx += 40) { const o = (yy / 40) % 2 ? 20 : 0; x.fillStyle = '#3c5d6b'; x.beginPath(); x.moveTo(xx + o, yy - 14); x.lineTo(xx + o + 14, yy); x.lineTo(xx + o, yy + 14); x.lineTo(xx + o - 14, yy); x.fill(); x.fillStyle = '#d9a843'; x.beginPath(); x.arc(xx + o, yy, 3.2, 0, TAU); x.fill(); }
    x.strokeStyle = '#d9a843'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
  }) }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(5.3, .007, -.95); casinoG.add(carpet);
  // back wall: dark plum panels with gold trim
  RK.box(8.2, 3.0, .06, plum, 5.3, 1.5, WALL_Z + .04); RK.box(8.2, .05, .08, gold, 5.3, 3.0, WALL_Z + .06); RK.box(8.2, .05, .08, gold, 5.3, 1.08, WALL_Z + .06);
  for (let k = 0; k < 8; k++) RK.box(.04, 1.9, .08, gold, 1.35 + k * 1.15, 2.04, WALL_Z + .06);
  const casinoSign = neon('AGENT CASINO', '#ffd166', 3.6, .62, 120, .98); casinoSign.position.set(5.3, 3.55, WALL_Z + .1); casinoG.add(casinoSign);
  const bulbM = new THREE.MeshBasicMaterial({ color: '#ffe3a0' }), bulbs = [];
  for (let k = 0; k < 22; k++) { const b = new THREE.Mesh(once('cbulb', () => new THREE.SphereGeometry(.045, 10, 8)), bulbM.clone()); const u = k / 21; b.position.set(3.3 + u * 4, k % 2 ? 3.92 : 3.18, WALL_Z + .12); casinoG.add(b); bulbs.push(b); }
  // five slot machines on the back of the aisle, facing the room
  const SLOTS_X = [2.3, 3.35, 4.4, 5.45, 6.5], SZ = -.2, slotScreens = [];
  const reelTex = (seed) => paint(256, 128, (x, w, h) => {
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h); const SY = ['🍒', '🍋', '🔔', '🪙', '7', '★']; rs = seed;
    for (let i = 0; i < 3; i++) { x.fillStyle = i % 2 ? '#efe6d2' : '#f8f1e0'; x.fillRect(i * 85 + 2, 0, 82, h); x.font = '700 58px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; const sy = SY[Math.floor(rnd() * SY.length)]; x.fillStyle = sy === '7' ? '#c0392b' : sy === '★' ? '#e7b985' : '#222'; x.fillText(sy, i * 85 + 43, h / 2 + 4); }
    x.fillStyle = 'rgba(192,57,43,.8)'; x.fillRect(0, h / 2 - 2, w, 3);
  });
  const bodyM = [std('#855f34', .35, { metalness: .25 }), std('#3c6fd1', .35, { metalness: .25 }), std('#c2457a', .35, { metalness: .25 })];
  SLOTS_X.forEach((sx, i) => {
    const bm = bodyM[i % 3];
    RK.rbox(.82, 1.0, .72, .07, bm, sx, .5, SZ); // cabinet
    RK.rbox(.82, .82, .52, .07, bm, sx, 1.41, SZ - .1); // screen housing
    RK.rbox(.86, .24, .58, .06, gold, sx, 1.92, SZ - .08); // crown
    RK.box(.84, .06, .42, gold, sx, 1.03, SZ + .14); // button ledge
    RK.box(.52, .14, .16, M.black, sx, .52, SZ + .37); // coin tray
    RK.box(.66, .4, .02, gold, sx, 1.43, SZ + .165); // screen bezel
    RK.cyl(.028, .028, .52, gold, sx + .47, 1.3, SZ - .02, 10); RK.ball(.075, .075, .075, std('#d9443a', .3), sx + .47, 1.58, SZ - .02);
    for (let b = 0; b < 3; b++) RK.cyl(.04, .04, .03, std(['#ff6f6f', '#ffd166', '#6fd18a'][b], .3), sx - .18 + b * .18, 1.075, SZ + .2, 12);
    RK.cyl(.2, .2, .07, plum, sx, .62, SZ + .95, 18); RK.cyl(.035, .035, .6, gold, sx, .3, SZ + .95, 8); RK.cyl(.18, .18, .03, gold, sx, .015, SZ + .95, 16); // stool
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(.6, .32), new THREE.MeshBasicMaterial({ map: reelTex(11 + i * 5), color: new THREE.Color().setScalar(.96) }));
    scr.position.set(sx, 1.43, SZ + .18); casinoG.add(scr); slotScreens.push(scr);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(.7, .15), new THREE.MeshBasicMaterial({ map: textSign(['LUCKY 7', 'JACKPOT', 'AGENT', '100×', 'BONUS'][i], { w: 256, h: 56, bg: '#1c333c', fg: '#ffd166', font: 40 }) }));
    top.position.set(sx, 1.92, SZ + .215); casinoG.add(top);
  });
  // the dice table, out in the aisle: an oval of purple felt with a gold rail, two big dice and stacks of chips
  const DTX = 7.65, DTZ = 3.05;
  RK.at(DTX, 0, DTZ);
  RK.geo(once('dtrail', () => new THREE.CylinderGeometry(1, 1, .14, 40)), gold, 0, .86, 0, 1.0, 1, .72);
  RK.geo(once('dtfelt', () => new THREE.CylinderGeometry(1, 1, .02, 40)), felt, 0, .935, 0, .9, 1, .63);
  RK.geo(once('dtbase', () => new THREE.CylinderGeometry(1, 1, .8, 28)), plum, 0, .4, 0, .55, 1, .36);
  RK.rbox(.17, .17, .17, .035, cream, -.18, 1.03, -.05, .5); RK.rbox(.17, .17, .17, .035, cream, .14, 1.03, .08, -.3);
  [[-.55, .2, '#d9443a'], [-.42, .32, '#3c6fd1'], [.5, -.2, '#ffd166'], [.6, .12, '#6fd18a'], [.38, .3, '#ffffff']].forEach(([cx, cz, c], k) => { for (let h = 0; h < 3 + (k % 3); h++) RK.cyl(.07, .07, .025, std(c, .4), cx, .955 + h * .027, cz, 16); });
  RK.at();
  const diceLight = new THREE.PointLight('#ffcf7a', 3.2, 5, 2); diceLight.position.set(DTX, 2.6, DTZ); casinoG.add(diceLight);
  RK.cyl(.006, .006, 1.3, M.black, DTX, 3.95, DTZ, 6); RK.geo(once('dshade', () => new THREE.CylinderGeometry(.18, .42, .3, 24, 1, true)), gold, DTX, 3.15, DTZ);
  const diceLabel = neon('dice · beat the agent', '#faddbb', 1.7, .3, 70, .9); diceLabel.position.set(DTX, 2.35, DTZ - .3); casinoG.add(diceLabel);
  // a card table in the back corner with chips and a fanned hand
  const CTX = 8.0, CTZ = -1.55;
  RK.geo(once('cttop', () => new THREE.CylinderGeometry(1, 1, .1, 36, 1, false, 0, Math.PI)), gold, CTX, .82, CTZ, .95, 1, .95, 0, Math.PI / 2, 0);
  RK.geo(once('ctfelt', () => new THREE.CylinderGeometry(1, 1, .02, 36, 1, false, 0, Math.PI)), std('#1f6b54', .95), CTX, .88, CTZ, .86, 1, .86, 0, Math.PI / 2, 0);
  RK.cyl(.12, .16, .8, plum, CTX - .3, .4, CTZ, 14);
  for (let c = 0; c < 4; c++) RK.box(.13, .005, .19, cream, CTX - .35 - c * .07, .9, CTZ + .3 + c * .02, c * .25);
  [[-.15, -.4, '#d9443a'], [-.5, -.1, '#ffd166']].forEach(([cx, cz, c]) => { for (let h = 0; h < 4; h++) RK.cyl(.06, .06, .022, std(c, .4), CTX + cx, .9 + h * .024, CTZ + cz, 14); });
  for (const [sx, sz] of [[-1.1, -.6], [-1.15, .25], [-.75, .85]]) { RK.cyl(.19, .19, .06, plum, CTX + sx, .6, CTZ + sz, 16); RK.cyl(.03, .03, .58, gold, CTX + sx, .3, CTZ + sz, 8); }
  const casinoLight = new THREE.PointLight('#ffcf7a', 3.4, 7, 2); casinoLight.position.set(4.4, 2.8, .6); casinoG.add(casinoLight);
  const fillLight = new THREE.PointLight('#f8d2a7', 1.6, 6, 2); fillLight.position.set(8.0, 2.4, -1.2); casinoG.add(fillLight);
  RK.flush(right);
  const slotSpot = { get x() { return rowEnd + SLOTS_X[2]; }, z: 1.45, half: 2.7 }, diceSpot = { get x() { return rowEnd + DTX; }, z: DTZ, r: 1.0 };
  const RK2 = kit();
  // plants
  const plant2 = (x, z, s) => { RK2.cyl(.2 * s, .16 * s, .4 * s, M.pot, x, .2 * s, z, 16); for (let i = 0; i < 9; i++) { const a = i * 2.4; RK2.ball(.07 * s, .3 * s, .07 * s, i % 2 ? M.leaf : M.leaf2, x + Math.cos(a) * .12 * s, (.65 + (i % 3) * .18) * s, z + Math.sin(a) * .12 * s, a); } for (let i = 0; i < 6; i++) { const a = i * 1.1; RK2.geo(once('lf', () => new THREE.SphereGeometry(1, 10, 6)), i % 2 ? M.leaf2 : M.leaf, x + Math.cos(a) * .25 * s, (.95 + (i % 2) * .25) * s, z + Math.sin(a) * .2 * s, .22 * s, .06 * s, .1 * s, 0, -a, .4); } };
  
  // right wall
  RK2.flush(right);
  const rwall = new THREE.Mesh(new THREE.PlaneGeometry(70, 4.8), M.wall2); rwall.rotation.y = -Math.PI / 2; rwall.position.set(RIGHT_PAD, 2.4, WALL_Z + 35); right.add(rwall);
  const rw2 = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.05, 70), M.woodD); rw2.position.set(RIGHT_PAD - .02, .525, WALL_Z + 35); right.add(rw2);

  // ---------------- light: warm and bright enough to read the room (the back rows were lost in the dark)
  scene.add(new THREE.HemisphereLight('#fdf3e8', '#76695a', 1.45));
  const key = new THREE.DirectionalLight('#ffeadc', 1.35); key.position.set(2, 6, 8); scene.add(key);
  const fill = new THREE.DirectionalLight('#fbe7d0', .6); fill.position.set(-6, 5, -4); scene.add(fill); // a cool fill from the back, so the far rows aren't lost
  const top = new THREE.DirectionalLight('#fff4e8', .45); top.position.set(0, 10, 0); scene.add(top);

  // a big sign high on the back wall, in view from the door: the way to the casino at the far end of the cafe
  const toCasino = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ transparent: true, map: paint(640, 320, (x, w, h) => {
    x.fillStyle = '#1c333c'; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 44); x.fill(); x.lineWidth = 9; x.strokeStyle = '#e6b84a'; x.stroke();
    x.fillStyle = '#ffd166'; x.font = '800 118px Fredoka, system-ui, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText('CASINO', w / 2, 112);
    for (let k = 0; k < 3; k++) { const ax = 190 + k * 100; x.fillStyle = ['#ffe9b0', '#ffd166', '#e6a93a'][k]; x.beginPath(); x.moveTo(ax, 196); x.lineTo(ax + 70, 240); x.lineTo(ax, 284); x.lineTo(ax + 22, 240); x.closePath(); x.fill(); }
  }) }));
  toCasino.position.set(ROW_X0 + SP * 1.5, 3.05, WALL_Z + .06); toCasino.visible = false; scene.add(toCasino); // high on the back wall, in view from the door
  let rowEnd = -1, lastT = 0;
  const room = {
    floor, launchSpot, door, rowX0: ROW_X0, slotSpot: null, diceSpot: null,
    // walking limits (the aisle) and where walking further left takes you outside
    bounds: { minX: LEFT_X + .6, exitX: LEFT_X + .8, minZ: CAFE.MIN_Z, maxZ: CAFE.MAX_Z, get maxX() { return rowEnd + RIGHT_PAD - .75; } },
    // the camera follows x between these
    get camMinX() { return -.9; }, get camMaxX() { return Math.max(-.9, rowEnd + RIGHT_PAD - 3.9); },
    setRowEnd(x) { x = Math.max(ROW_X0, x); if (x === rowEnd) return; rowEnd = x; right.position.x = x; buildRow(x); },
    // the launch booth stands level with the front row of booths, where people come in (game.js adds rows forward)
    setFrontZ(z) { kiosk.position.z = z; pad.position.z = z + 1.6; kLight.position.z = z + .9; launchSpot.z = z + 1.6; doorG.position.z = z + 2.9; door.z = z + 2.9; }, // the glowing street door stays by the front, where people are
    launchPulse(on) { near = !!on; },
    update(t) {
      const dt = clamp(t - lastT, 0, .1); lastT = t;
      nearK = lerp(nearK, near ? 1 : 0, Math.min(1, dt * 4));
      const ex = .78 + .22 * Math.sin(t * 2.2); for (const [m, o] of exitGlow) m.opacity = o * ex; exitLight.intensity = 1.2 + .6 * ex; // the exit breathes
      const p = .5 + .5 * Math.sin(t * (2 + nearK * 2.5));
      pad.material.emissiveIntensity = .02 + .02 * p + nearK * .14; // a gentle breath, a touch warmer when you stand near
      mintGlow.emissiveIntensity = .08 + .04 * p + nearK * .18;
      ksign.material.color.setScalar(.58 + .04 * p + nearK * .12);
      kLight.intensity = .4 + .15 * p + nearK * .6;
      kRim.material.opacity = .4 + .08 * p + nearK * .35;
      if (Math.floor(t * 4) !== this._f) { this._f = Math.floor(t * 4); drawLaunch(t); }
      if (Math.floor(t * .7) !== this._sf) { this._sf = Math.floor(t * .7); const sc = slotScreens[this._sf % slotScreens.length]; sc.material.map.dispose(); sc.material.map = reelTex(this._sf * 13 + 7); } // the reels land on something new every so often
      toCasino.material.color.setScalar(.85 + .15 * Math.sin(t * 4)); // a slow beckoning pulse
      casinoLight.intensity = 3.2 + Math.sin(t * 3) * .4; bulbs.forEach((b, k) => { b.material.color.setScalar(((Math.floor(t * 4) + k) % 3) ? 1 : .45); });
      signs.forEach((s, i) => { if (s === ksign) return; s.material.opacity = .9 + Math.sin(t * 1.3 + i) * .03; });
    },
  };
  room.setRowEnd(ROW_X0 + SP * 5);
  return room;
}
