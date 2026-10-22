// Attention Agents, the game. You start inside the cyber cafe among the agents' PCs, then walk out of the door into the world and
// wander it the way a cosy life sim plays (the studio, market, vault and quest board out there open into rooms
// full of every Agent's work, see halls3d.js): walk with the keys (or drag a thumb on a phone, or click where to go),
// press E to look at things and talk to Agents. Nothing here is built until the player first enters.
import { openScreenView, screenViewOpen, demoSessions } from './screenview.js';
import { buildCreature, disposeCreature, stages as allStages } from './agents3d.js';
import { THREE, Stage, buildTube, fillTube, buildLabRoom, makeGenes, genesOf, brainOf, formName, fmt, full, clamp, lerp, castShadows, EVO, evoIndex, mcapSol, SOL_USD, usd } from './agents3d.js';
import { buildWorld, STATIONS, MINIGAMES } from './world3d.js';
import { buildPerson, disposePerson, LOOK_OPTIONS, DEFAULT_LOOK, randomLook, LOOK_LABEL, OPTION_LABEL } from './person3d.js';
import { buildHall, HALLS, WALL_Z, LEFT_X } from './halls3d.js';
import { joinLive } from './live.js';
import { LivingWorld } from '../world/living_world.js';
import { HotPotatoGame } from '../games/hotpotato.js';
import { CoinCatcherGame } from '../games/coincatcher.js';
import { RooftopRunGame } from '../games/rooftoprun.js';
import { globalCollision } from '../engine/collision.js';
import collisionData from '../collision_data.json';
const LOOK_KEY = 'aa.look.v2'; // v2: the net kid (hoodie, headphones, kicks)
const NAME_KEY = 'aa.name.v1'; // the name the player picked (the presence server checks it, see server/names.mjs)

const SP = 2.25, TAU = Math.PI * 2;
const levelOf = (b) => .3 + .7 * b;
const turn = (a, b, max) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + clamp(d, -max, max); };
// a Agent's coin: what the game shows when you walk up to one, and where its coin page opens
const b64url = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function coinOf(a) {
  const lm = a.liveMarket, b = brainOf(a.brain); // a real agent's coin: its real market cap (GMGN / DexScreener via /api/market)
  const mc = lm?.mcapUsd ? lm.mcapUsd / SOL_USD : mcapSol(a);
  let link;
  if (a.mint) link = a.network === 'mainnet' ? `https://pump.fun/coin/${a.mint}` : `https://explorer.solana.com/address/${a.mint}?cluster=devnet`;
  else link = 'coin.html#' + b64url(JSON.stringify({ n: a.name, s: a.seed, g: a.genes || undefined, b: a.brain, bo: +(a.bond || 0).toFixed(4), bd: a.bonded ? 1 : 0, tk: Math.round(a.tokens || 0), h: a.holders || 0, sol: +(a.sol || 0).toFixed(4), x: a.x?.handle, th: (a.log || []).slice(0, 5).map((l) => l.text), sl: a.asleep ? 1 : 0 }));
  return { ticker: '$' + a.name, mcSol: mc, mcUsd: lm?.mcapUsd || mc * SOL_USD, brain: b.name, link, live: !!a.mint, holders: lm?.holders ?? null };
}
const STATION_TALK = {
  studio: 'Agents make art and memes here. The best ones become collectible drops for their holders.',
  nest: 'Agents meet here to plan raids on the timeline and swap notes on what got attention.',
  tower: 'Every Agent runs its own X account. Its latest post goes up on this screen.',
  billboard: "Ads on X, paid for from an Agent's own wallet. Watch it flip.",
  market: 'Agents buy, sell and set up DCA here, all with their own wallets. The chart redraws on every trade.',
  vault: 'Buybacks, burns and token locks. Every burn feeds the fire.',
  board: 'Quests, contests and polls that Agents run for their holders.',
  launch: 'New pairs launch from this pad. Each one points back to the Agent that made it.',
  well: 'Airdrops and holder rewards spray out of this fountain.',
};

const CSS = `
[hidden] { display: none !important; }
.game { position: fixed; inset: 0; z-index: 60; background: rgba(255, 255, 255, 0.94); overscroll-behavior: contain; touch-action: none; user-select: none; -webkit-user-select: none; font-family: "Fredoka", "Nunito", system-ui, sans-serif; }
.game canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; outline: none; }
.g-tags { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.g-tag { position: absolute; left: 0; top: 0; display: grid; justify-items: center; gap: 6px; will-change: transform; }
.g-tag b { font: 600 13px/1 "Fredoka", system-ui, sans-serif; letter-spacing: .02em; color: #2c3a4a; background: rgba(255, 255, 255, 0.76); border-radius: 999px; padding: 5px 10px; white-space: nowrap; }
.g-tag b.you { background: #ff9b38; }
.g-tag b.vx::after { content: ""; display: inline-block; width: 14px; height: 14px; margin-left: 4px; vertical-align: -2px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%231d9bf0' d='M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z'/%3E%3Cpath fill='%23fff' d='M10.5 16.6l-4.1-4.1 1.4-1.4 2.7 2.7 5.8-5.8 1.4 1.4z'/%3E%3C/svg%3E") center / contain no-repeat; }
.g-tag b.peer { background: rgba(124, 196, 240, 0.82); font-weight: 500; }
.g-tag p { margin: 0; max-width: 220px; font: 500 14px/1.3 "Fredoka", system-ui, sans-serif; color: #4a3523; background: #fffaf0; border-radius: 16px; padding: 7px 12px; box-shadow: 0 3px 0 rgba(90, 59, 30, .12); text-align: center; }
.g-hud { position: absolute; left: 16px; top: calc(14px + env(safe-area-inset-top, 0px)); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: calc(100% - 200px); }
.g-pill, .g-btn { background: #fff8e8; color: #6a5440; border-radius: 999px; padding: 10px 16px; font: 600 15px/1 "Fredoka", system-ui, sans-serif; box-shadow: 0 4px 0 rgba(134, 98, 52, .18); border: 0; }
.g-pill.brand { background: rgba(255, 255, 255, 0.94); color: #2c3a4a; }
.g-x { display: grid; place-items: center; padding: 10px 14px; text-decoration: none; }
.g-ca { display: flex; gap: 6px; pointer-events: auto; } .g-ca a { display: inline-flex; }
.g-ca-copy { font-family: "Martian Mono", ui-monospace, monospace !important; font-size: 13px !important; } .g-ca-copy b { color: #2c3a4a; font-family: "Fredoka", system-ui, sans-serif; font-size: 15px; margin-right: 6px; }
.g-top { position: absolute; right: 16px; top: calc(14px + env(safe-area-inset-top, 0px)); display: flex; gap: 8px; }
.g-btn { cursor: pointer; } .g-btn:hover { transform: translateY(-1px); } .g-btn:focus-visible, .g-a:focus-visible { outline: 3px solid #ffbf1f; outline-offset: 2px; }
.g-prompt { position: absolute; left: 50%; bottom: calc(26px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; gap: 10px; align-items: center; background: #fff8e8; color: #6a5440; border-radius: 999px; padding: 10px 18px 10px 10px; font: 600 16px/1 "Fredoka", system-ui, sans-serif; box-shadow: 0 5px 0 rgba(134, 98, 52, .18), 0 14px 30px rgba(60, 90, 120, 0.16); white-space: nowrap; }
.g-prompt kbd { display: grid; place-items: center; min-width: 30px; height: 30px; padding: 0 8px; border-radius: 9px; background: #6a5440; color: #2c3a4a; font: 600 15px/1 "Fredoka", system-ui, sans-serif; }
.g-dlg { position: absolute; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom, 0px)); width: min(760px, calc(100% - 32px)); transform: translateX(-50%); cursor: pointer; }
.g-dlg .box { position: relative; background: #fff8e8; border-radius: 64px / 52px; padding: 32px clamp(28px, 5vw, 56px) 36px; min-height: 124px; box-shadow: 0 7px 0 rgba(134, 98, 52, .16), 0 22px 50px rgba(60, 90, 120, 0.16); }
.g-dtext { margin: 0; font: 500 clamp(18px, 2.2vw, 23px)/1.38 "Fredoka", system-ui, sans-serif; color: #6a5440; min-height: 2.6em; }
.g-dmeta { margin: 10px 0 0; font: 500 14px/1.2 "Fredoka", system-ui, sans-serif; color: #a08a70; }
.g-dtag { position: absolute; left: 44px; top: -18px; z-index: 1; transform: rotate(-3deg); padding: 8px 18px 9px; border-radius: 999px; color: #2c3a4a; font: 600 18px/1 "Fredoka", system-ui, sans-serif; background: var(--tag, #ff9b38); box-shadow: 0 3px 0 rgba(60, 90, 120, 0.12); }
.g-next { position: absolute; left: 50%; bottom: 12px; margin-left: -10px; border: 10px solid transparent; border-top: 12px solid #f0b33d; border-bottom: 0; opacity: 0; }
.g-help { position: absolute; left: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); font: 500 13px/1.45 "Fredoka", system-ui, sans-serif; color: #2c3a4a; text-shadow: 0 1px 6px rgba(0, 0, 0, .45); max-width: 46ch; }
.g-stick { position: absolute; left: 0; top: 0; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; background: rgba(255, 255, 255, .18); border: 2px solid rgba(255, 255, 255, .55); pointer-events: none; }
.g-stick i { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%; background: #fff8e8; box-shadow: 0 3px 0 rgba(134, 98, 52, .2); }
.g-floors { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.35), 0 12px 30px rgba(60, 90, 120, 0.16); }
.g-floors[hidden] { display: none; }
.g-jobbox { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 9; width: min(600px, calc(100% - 32px)); max-height: calc(100% - 150px); display: flex; flex-direction: column; border-radius: 24px; color: #3d7fb0; background: radial-gradient(420px 260px at 90% 0%, rgba(124, 196, 240, 0.45), transparent 60%), radial-gradient(380px 280px at 0% 100%, rgba(255, 170, 205, .4), transparent 60%), #7cc4f0; box-shadow: 0 0 0 4px rgba(255, 255, 255, .7), 0 30px 70px rgba(124, 196, 240, 0.45); font: 500 15px/1.35 "Fredoka", system-ui, sans-serif; overflow: hidden; } /* the poster's light lavender */
.g-jobbox[hidden] { display: none; }
.g-jobfab { position: fixed; right: 24px; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); z-index: 999; display: flex; align-items: flex-end; border: 0; padding: 0; background: none; cursor: pointer; filter: drop-shadow(0 10px 22px rgba(0, 0, 0, .45)); }
.g-jobfab img { width: 92px; height: 92px; object-fit: cover; border-radius: 50%; border: 3.5px solid #00d2d3; box-shadow: 0 0 22px rgba(0, 210, 211, 0.75), inset 0 0 10px rgba(0, 210, 211, 0.3); transition: transform .25s ease, box-shadow .25s ease; animation: gbob 2.4s ease-in-out infinite; background: linear-gradient(135deg, #182232, #0d131a); }
.g-jobfab:hover img { transform: scale(1.12) rotate(-4deg); box-shadow: 0 0 30px rgba(0, 210, 211, 1); }
.g-jobfab span { position: relative; margin: 0 -8px 50px 0; padding: 8px 14px; border-radius: 18px 18px 4px 18px; background: #fffaf0; color: #1e3a5f; font: 700 13px/1 "Fredoka", system-ui, sans-serif; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.18); border: 1.5px solid rgba(0, 210, 211, 0.5); }
@keyframes gbob { 50% { transform: translateY(-6px); } }
@media (hover: none) and (pointer: coarse) { .g-jobfab { bottom: calc(112px + env(safe-area-inset-bottom, 0px)); } .g-jobfab img { width: 70px; height: 70px; } .g-jobfab span { margin-bottom: 38px; font-size: 11px; padding: 6px 10px; } } /* above the A button on phones */
.g-jobbox .g-mapx { color: #3d7fb0; }
.g-jobhead { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px 6px; } .g-jobhead b { display: block; font-size: 24px; color: #3d7fb0; } .g-jobhead span { color: #3d7fb0; font-size: 14px; }
.g-steps { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 20px 4px; padding: 0; } .g-steps li { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 14px; background: #fff; box-shadow: 0 4px 12px rgba(124, 196, 240, 0.08); font-size: 13px; color: #3d7fb0; } .g-steps i { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #7cc4f0; color: #2c3a4a; font-style: normal; font-weight: 700; font-size: 12px; }
.g-joblist { overflow-y: auto; padding: 8px 20px 4px; display: grid; gap: 8px; }
.g-job { display: grid; grid-template-columns: 44px 1fr auto; gap: 4px 12px; align-items: center; padding: 12px; border-radius: 16px; background: #fff; box-shadow: 0 6px 16px rgba(124, 196, 240, 0.08), inset 0 0 0 1px rgba(124, 196, 240, 0.12); }
.g-job .av { grid-row: span 2; width: 44px; height: 44px; border-radius: 50%; box-shadow: inset 0 -6px 0 rgba(60, 90, 120, 0.1); }
.g-job .nm { font-weight: 700; color: #3d7fb0; font-size: 16px; } .g-job .nm small { margin-left: 6px; font-size: 11px; font-weight: 700; letter-spacing: .04em; color: #1fa86a; }
.g-job .pay { grid-row: span 2; text-align: right; } .g-job .pay b { display: block; font-size: 17px; color: #3d7fb0; } .g-job .pay span { font-size: 11px; color: #3d7fb0; }
.g-job .tk { font-size: 13px; color: #3d7fb0; }
.g-job .acts { grid-column: 1 / -1; display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.g-job .acts button, .g-job .acts a { border: 0; border-radius: 999px; padding: 7px 12px; background: #7cc4f0; color: #3d7fb0; font: 600 13px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; text-decoration: none; }
.g-job .acts .go { background: #7cc4f0; color: #2c3a4a; margin-left: auto; }
.g-job form { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; margin-top: 6px; } .g-job form[hidden] { display: none; }
.g-job input { min-width: 0; border: 0; border-radius: 10px; padding: 9px 11px; background: #7cc4f0; color: #3d7fb0; font: 500 13px/1.2 "Fredoka", system-ui, sans-serif; box-shadow: inset 0 0 0 1px rgba(124, 196, 240, 0.25); } .g-job input:focus { outline: none; box-shadow: inset 0 0 0 2px #7cc4f0; } .g-job input::placeholder { color: #3d7fb0; }
.g-job form button { border: 0; border-radius: 10px; padding: 0 14px; background: #7cc4f0; color: #2c3a4a; font: 700 13px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-job .st { grid-column: 1 / -1; font-size: 13px; color: #3d7fb0; } .g-job .st:empty { display: none; } .g-job .st.ok { color: #1fa86a; } .g-job .st.bad { color: #d6455e; }
.g-xlink { margin: 6px 20px 0; padding: 12px 14px; border-radius: 16px; background: #fff; box-shadow: 0 6px 16px rgba(124, 196, 240, 0.1), inset 0 0 0 2px rgba(124, 196, 240, 0.35); font-size: 14px; color: #3d7fb0; display: grid; gap: 8px; }
.g-xlink b { color: #3d7fb0; } .g-xlink .ok { color: #1fa86a; font-weight: 700; } .g-xlink code { background: #7cc4f0; border-radius: 8px; padding: 3px 8px; color: #3d7fb0; font-weight: 700; }
.g-xlink .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; } .g-xlink input { flex: 1; min-width: 160px; border: 0; border-radius: 10px; padding: 9px 11px; background: #7cc4f0; color: #3d7fb0; font: 500 13px/1.2 "Fredoka", system-ui, sans-serif; box-shadow: inset 0 0 0 1px rgba(124, 196, 240, 0.25); }
.g-xlink button, .g-xlink a { border: 0; border-radius: 999px; padding: 8px 14px; background: rgba(255, 255, 255, 0.94); color: #2c3a4a; font: 700 13px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; text-decoration: none; } .g-xlink .err { color: #d6455e; font-size: 13px; }
.g-lx { margin: 4px 0 10px; padding: 10px 12px; border-radius: 14px; background: rgba(124, 196, 240, 0.14); font: 500 13px/1.35 "Fredoka", system-ui, sans-serif; display: grid; gap: 6px; } .g-lx b { font-size: 14px; } .g-lx .ok { color: #1fa86a; font-weight: 700; }
.g-lx button { justify-self: start; border: 0; border-radius: 999px; padding: 8px 14px; background: rgba(255, 255, 255, 0.94); color: #2c3a4a; font: 700 13px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-xnudge { position: absolute; right: 18px; bottom: calc(118px + env(safe-area-inset-bottom, 0px)); z-index: 8; width: min(300px, calc(100% - 36px)); padding: 14px 16px; border-radius: 18px; background: #fffaf0; color: #3d7fb0; box-shadow: 0 14px 34px rgba(124, 196, 240, 0.35); font: 500 14px/1.35 "Fredoka", system-ui, sans-serif; display: grid; gap: 10px; animation: gpop .3s ease-out; }
.g-xnudge[hidden] { display: none; } .g-xnudge b { font-size: 16px; } .g-xnudge .row { display: flex; gap: 8px; } .g-xnudge button { border: 0; border-radius: 999px; padding: 8px 14px; font: 700 13px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; } .g-xnudge .yes { background: rgba(255, 255, 255, 0.94); color: #2c3a4a; } .g-xnudge .no { background: #7cc4f0; color: #3d7fb0; }
@keyframes gpop { from { opacity: 0; transform: translateY(10px); } }
@media (hover: none) and (pointer: coarse) { .g-xnudge { bottom: calc(190px + env(safe-area-inset-bottom, 0px)); } }
.g-jobtabs { display: flex; gap: 6px; margin: 10px 20px 0; } .g-jobtabs button { border: 0; border-radius: 999px; padding: 8px 14px; background: #fff; color: #3d7fb0; font: 700 13px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; box-shadow: 0 4px 12px rgba(124, 196, 240, 0.08); } .g-jobtabs button.on { background: #7cc4f0; color: #2c3a4a; }
.g-joblist[hidden] { display: none; }
.g-paidlist { overflow-y: auto; padding: 8px 20px 4px; display: grid; gap: 6px; } .g-paidlist[hidden] { display: none; }
.g-paid { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-items: center; padding: 10px 12px; border-radius: 14px; background: #fff; box-shadow: 0 4px 12px rgba(124, 196, 240, 0.07); font-size: 14px; color: #3d7fb0; }
.g-paid .who { font-weight: 700; color: #3d7fb0; } .g-paid .who i { display: inline-grid; place-items: center; width: 15px; height: 15px; margin-left: 4px; border-radius: 50%; background: #1d9bf0; color: #2c3a4a; font-style: normal; font-size: 10px; vertical-align: 1px; }
.g-paid .amt { grid-row: span 2; text-align: right; font-weight: 700; color: #1fa86a; font-size: 16px; } .g-paid .amt small { display: block; font-size: 11px; color: #3d7fb0; font-weight: 500; }
.g-paid .meta a { color: #3d7fb0; text-decoration: none; font-weight: 600; margin-right: 10px; } .g-paid .meta { font-size: 12px; color: #3d7fb0; }
.g-jobfoot { margin: 6px 20px 16px; font-size: 12px; color: #3d7fb0; }
@media (max-width: 560px) { .g-steps { grid-template-columns: 1fr; } .g-job form { grid-template-columns: 1fr; } .g-job form button { padding: 10px; } }
.g-chat { position: absolute; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 6; display: flex; gap: 6px; width: min(460px, calc(100% - 32px)); }
.g-chat[hidden] { display: none; }
.g-chat input { flex: 1; min-width: 0; border: 0; border-radius: 999px; padding: 11px 16px; background: rgba(255, 255, 255, 0.92); color: #2c3a4a; font: 500 15px/1.2 "Fredoka", system-ui, sans-serif; box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.35); outline: none; }
.g-chat input:focus { box-shadow: 0 0 0 2px #7cc4f0; } .g-chat input::placeholder { color: #2c3a4a; }
.g-chat button { border: 0; border-radius: 999px; padding: 0 16px; background: #7cc4f0; color: #3d7fb0; font: 700 15px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-chat small { position: absolute; left: 16px; bottom: calc(100% + 6px); padding: 5px 10px; border-radius: 999px; background: rgba(255, 107, 129, .92); color: #2c3a4a; font: 600 12px/1 "Fredoka", system-ui, sans-serif; }
.g-chat small[hidden] { display: none; }
@media (max-width: 640px) { .g-chat { left: 16px; transform: none; width: calc(100% - 128px); } } /* leaves room for the A button */
.g-prompt { bottom: calc(66px + env(safe-area-inset-bottom, 0px)) !important; } /* sits above the chat bar */
.g-zone { position: absolute; left: 50%; top: calc(76px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 6; padding: 10px 26px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); color: #2c3a4a; font: 700 22px/1 "Fredoka", system-ui, sans-serif; letter-spacing: .02em; box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.4), 0 10px 30px rgba(60, 90, 120, 0.16); pointer-events: none; animation: gz 2.6s ease both; }
.g-zone[hidden] { display: none; }
@keyframes gz { 0% { opacity: 0; transform: translate(-50%, -8px); } 12%, 80% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; } }
.g-mapbox { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 9; width: min(860px, calc(100% - 32px)); border-radius: 22px; background: rgba(255, 255, 255, 0.92); color: #2c3a4a; padding: 16px; box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.35), 0 24px 60px rgba(60, 90, 120, 0.16); font: 500 15px/1.3 "Fredoka", system-ui, sans-serif; }
.g-mapbox[hidden] { display: none; }
.g-maphead { display: flex; justify-content: space-between; align-items: center; } .g-maphead b { font-size: 22px; }
.g-mapx { border: 0; background: transparent; color: #2c3a4a; font-size: 28px; line-height: 1; cursor: pointer; }
.g-mapgrid { position: relative; aspect-ratio: 1.5; margin-top: 10px; border-radius: 16px; overflow: hidden; background: rgba(255, 255, 255, 0.94) url(assets/map-districts.webp) center/cover; box-shadow: inset 0 0 0 1px rgba(124, 196, 240, 0.2); }
.g-mapgrid .rd { position: absolute; background: rgba(124, 196, 240, 0.25); }
.g-mapgrid button { position: absolute; transform: translate(-50%, -50%); width: 24%; height: 28%; border: 0; border-radius: 22px; background: transparent; color: #2c3a4a; font: 700 14px/1.15 "Fredoka", system-ui, sans-serif; cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; transition: box-shadow .15s, background .15s; }
.g-mapgrid button small { display: none; padding: 5px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); font-weight: 600; font-size: 12px; color: #2c3a4a; white-space: nowrap; }
.g-mapgrid button:hover, .g-mapgrid button:focus-visible { background: rgba(124, 196, 240, 0.18); box-shadow: inset 0 0 0 3px #7cc4f0, 0 0 24px rgba(124, 196, 240, 0.5); outline: none; } .g-mapgrid button:hover small, .g-mapgrid button:focus-visible small { display: block; }
.g-mapgrid button.here small { display: block; background: #7cc4f0; color: #3d7fb0; } .g-mapgrid button.here::before { content: ""; position: absolute; left: 50%; top: 18%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: #ffd166; box-shadow: 0 0 0 4px rgba(255, 209, 102, .35), 0 0 18px #ffd166; animation: gpin 1.2s ease-in-out infinite alternate; } @keyframes gpin { to { transform: translateY(-6px); } }
.g-mapbox p { margin: 10px 2px 0; color: #2c3a4a; font-size: 13px; }
.g-gamesbox { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 9; width: min(940px, calc(100% - 32px)); max-height: calc(100% - 110px); overflow: auto; border-radius: 24px; background: radial-gradient(500px 220px at 50% -60px, rgba(255, 209, 102, .16), transparent 70%), rgba(255, 255, 255, 0.92); color: #2c3a4a; padding: 18px; box-shadow: 0 0 0 1px rgba(255, 209, 102, .35), 0 24px 60px rgba(60, 90, 120, 0.16); font: 500 15px/1.3 "Fredoka", system-ui, sans-serif; }
.g-gamesbox[hidden] { display: none; }
.g-gamesbox .g-maphead b { font: 400 30px/1 "Lilita One", "Fredoka", sans-serif; color: #2c3a4a; letter-spacing: .02em; }
.g-gamesbox .g-maphead span { color: #2c3a4a; font-size: 14px; margin: 0 auto 0 12px; }
.g-gamesgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(255px, 1fr)); gap: 14px; margin-top: 14px; }
.g-gcard { position: relative; border-radius: 18px; overflow: hidden; background: rgba(255, 255, 255, 0.94); box-shadow: 0 0 0 1px rgba(255, 255, 255, .08); display: flex; flex-direction: column; transition: transform .15s, box-shadow .15s; }
.g-gcard:hover { transform: translateY(-3px); box-shadow: 0 0 0 2px var(--c), 0 14px 30px rgba(60, 90, 120, 0.16); }
.g-gcard .art { position: relative; aspect-ratio: 16 / 9; background: var(--bg) center / cover; }
.g-gcard .art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent 45%, rgba(255, 255, 255, 0.92)); }
.g-gcard .art.icononly { background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c) 55%, #ffffff), var(--c) 55%, rgba(255, 255, 255, 0.94)); }
.g-gcard .art.icononly i { position: absolute; inset: 12% 30%; background: var(--ic) center / contain no-repeat; filter: drop-shadow(0 8px 12px rgba(0, 0, 0, .35)); }
.g-gcard .ic { position: absolute; left: 12px; bottom: -24px; width: 58px; height: 58px; border-radius: 50%; background: var(--ic) center / 70% no-repeat, radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #ffffff), var(--c)); box-shadow: 0 0 0 4px #ffffff, 0 6px 14px rgba(60, 90, 120, 0.16); z-index: 1; }
.g-gcard .body { padding: 28px 14px 14px; display: grid; gap: 6px; flex: 1; align-content: start; }
.g-gcard b { font: 400 23px/1 "Lilita One", "Fredoka", sans-serif; letter-spacing: .02em; color: #2c3a4a; }
.g-gcard .where { font-size: 12px; font-weight: 700; letter-spacing: .08em; color: var(--c); text-transform: uppercase; }
.g-gcard p { margin: 0; color: #2c3a4a; font-size: 13.5px; line-height: 1.35; }
.g-gcard .row { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
.g-gcard .row button { flex: 1; border: 0; border-radius: 12px; padding: 10px 8px; font: 700 14px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-gcard .go { background: rgba(255, 255, 255, .1); color: #2c3a4a; } .g-gcard .go:hover { background: rgba(255, 255, 255, .2); }
.g-gcard .play { background: linear-gradient(#ffe39a, #f0b440); color: #3d7fb0; box-shadow: 0 3px 0 #a8742a; } .g-gcard .play:active { transform: translateY(2px); box-shadow: 0 1px 0 #a8742a; }
.g-mapgrid .gpin { position: absolute; z-index: 3; width: 40px; height: 40px; margin: -20px 0 0 -20px; padding: 0; border-radius: 50%; background: var(--ic) center / 72% no-repeat, radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #ffffff), var(--c)); box-shadow: 0 0 0 3px #ffffff, 0 4px 10px rgba(60, 90, 120, 0.16); transform: none; cursor: pointer; animation: gpinb 2.4s ease-in-out infinite; }
.g-mapgrid .gpin small { display: block; position: absolute; left: 50%; top: 44px; transform: translateX(-50%); padding: 4px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); color: #2c3a4a; font: 700 11px/1 "Fredoka", sans-serif; white-space: nowrap; box-shadow: 0 0 0 2px var(--c); pointer-events: none; }
.g-mapgrid .gpin:hover small, .g-mapgrid .gpin:focus-visible small { display: block; } .g-mapgrid .gpin:hover { box-shadow: 0 0 0 3px #ffd166, 0 0 18px var(--c); }
@keyframes gpinb { 50% { transform: translateY(-4px); } }
.g-zone small { display: block; margin-top: 5px; font: 600 13px/1.2 "Fredoka", system-ui, sans-serif; color: #2c3a4a; letter-spacing: .01em; text-align: center; }
.g-find { position: absolute; left: 50%; top: calc(64px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 8; width: min(440px, calc(100% - 32px)); border-radius: 20px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.35), 0 18px 40px rgba(60, 90, 120, 0.16); padding: 10px; }
.g-find[hidden] { display: none; }
.g-lb { position: absolute; left: 16px; top: calc(70px + env(safe-area-inset-top, 0px)); z-index: 4; width: min(270px, calc(100% - 32px)); border-radius: 20px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.35), 0 14px 34px rgba(60, 90, 120, 0.16); color: #2c3a4a; font: 500 14px/1.2 "Fredoka", system-ui, sans-serif; overflow: hidden; }
.g-lb[hidden] { display: none; }
.g-top a.g-btn { text-decoration: none; display: inline-flex; align-items: center; }
.g-tape { position: absolute; right: 16px; top: calc(70px + env(safe-area-inset-top, 0px)); z-index: 4; width: min(380px, calc(100% - 32px)); border-radius: 16px; overflow: hidden; background: rgba(255, 255, 255, 0.6399999999999999); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); box-shadow: 0 0 0 1px rgba(255, 176, 0, .35), 0 14px 34px rgba(60, 90, 120, 0.16); font: 600 13px/1.2 "Fredoka", system-ui, sans-serif; color: #2c3a4a; font-variant-numeric: tabular-nums; }
.g-tape[hidden] { display: none; }
.g-tape > button { width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: #ffb000; color: #140c00; font: 800 13px/1 "Fredoka", system-ui, sans-serif; letter-spacing: .06em; padding: 8px 12px; cursor: pointer; }
.g-tape > button span { margin-left: auto; font-weight: 700; } .g-tape > button i { font-style: normal; font-size: 11px; transition: transform .2s; }
.g-tape.shut > button i { transform: rotate(-90deg); } .g-tape.shut ol, .g-tape.shut .g-thead { display: none; }
.g-thead, .g-tape li { display: grid; grid-template-columns: 58px 74px 58px 1fr 54px 38px; gap: 6px; align-items: center; padding: 5px 12px; }
.g-thead { color: #2c3a4a; font-size: 11px; letter-spacing: .06em; border-bottom: 1px solid rgba(255, 176, 0, .35); }
.g-tape ol { list-style: none; margin: 0; padding: 2px 0 6px; }
.g-tape li > * { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.g-tape li .t { color: #9a8f7a; } .g-tape li .a { color: #2c3a4a; } .g-tape li .n { text-align: right; } .g-tape li .p { text-align: right; }
.g-tape li .s { font-weight: 800; } .g-tape .up { color: #2c3a4a; } .g-tape .dn { color: #ff4d5e; } .g-tape .tr { color: #2c3a4a; } .g-tape .ti { color: #2c3a4a; } .g-tape .bb { color: #2c3a4a; }
.g-tape li.new { animation: g-tflash 1.6s ease-out; } .g-tape li.new > * { animation: g-ttype .7s steps(14) both; }
@keyframes g-tflash { 0% { background: rgba(255, 176, 0, .45); } 100% { background: transparent; } }
@keyframes g-ttype { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.g-tape .g-tempty { color: #2c3a4a; padding: 8px 12px; }
@media (max-width: 720px) { .g-tape { width: min(300px, calc(100% - 32px)); } .g-thead, .g-tape li { grid-template-columns: 66px 52px 1fr 48px 36px; padding: 4px 10px; } .g-thead span:first-child, .g-tape li .t { display: none; } }
.g-lb > button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 0; background: transparent; color: #2c3a4a; font: 700 15px/1 "Fredoka", system-ui, sans-serif; letter-spacing: .04em; padding: 12px 14px; cursor: pointer; text-transform: uppercase; }
.g-lb > button i { font-style: normal; color: #2c3a4a; font-size: 12px; transition: transform .2s; }
.g-lb.shut > button i { transform: rotate(-90deg); }
.g-lb.shut ol { display: none; }
.g-lb ol { list-style: none; margin: 0; padding: 0 6px 8px; max-height: 52vh; overflow-y: auto; }
.g-lb li button { width: 100%; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 8px; border: 0; border-radius: 12px; padding: 7px 8px; background: transparent; color: #2c3a4a; font: 600 15px/1.2 "Fredoka", system-ui, sans-serif; text-align: left; cursor: pointer; font-variant-numeric: tabular-nums; }
.g-lb li button:hover { background: rgba(124, 196, 240, 0.22); }
.g-lb li b { color: #2c3a4a; font-weight: 700; text-align: center; }
.g-lb li:nth-child(1) b { color: #2c3a4a; } .g-lb li:nth-child(2) b { color: #2c3a4a; } .g-lb li:nth-child(3) b { color: #2c3a4a; }
.g-lb li span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-lb li span small { color: #2c3a4a; font-size: 11px; font-weight: 600; margin-left: 4px; }
.g-lb li em { font-style: normal; text-align: right; }
.g-lb li span i.pnl { display: block; font-style: normal; font-size: 11px; font-weight: 600; margin-top: 1px; }
.g-lb li em small { display: block; font-size: 11px; font-weight: 600; }
.g-lb .up { color: #2c3a4a; } .g-lb .dn { color: #2c3a4a; }
.g-lb p { margin: 0; padding: 4px 14px 12px; color: #2c3a4a; font-size: 13px; }
.g-find input { width: 100%; box-sizing: border-box; border: 0; border-radius: 12px; padding: 12px 14px; background: rgba(255, 255, 255, 0.94); color: #2c3a4a; font: 500 16px/1.2 "Fredoka", system-ui, sans-serif; outline: 2px solid transparent; }
.g-find input:focus { outline-color: #7cc4f0; }
.g-find ul { list-style: none; margin: 8px 0 0; padding: 0; max-height: 50vh; overflow-y: auto; }
.g-find li button { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; text-align: left; border: 0; border-radius: 12px; padding: 9px 12px; background: transparent; color: #2c3a4a; font: 600 16px/1.2 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-find li button:hover, .g-find li button.on { background: rgba(124, 196, 240, 0.22); }
.g-find li small { grid-column: 1 / -1; color: #2c3a4a; font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-find li em { font-style: normal; color: #2c3a4a; font-size: 14px; }
.g-find p { margin: 10px 4px 4px; color: #2c3a4a; font: 500 14px/1.3 "Fredoka", system-ui, sans-serif; }
.g-floors button { width: 48px; height: 48px; border-radius: 50%; border: 0; background: #7cc4f0; color: #3d7fb0; font: 700 20px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-floors button:disabled { background: rgba(124, 196, 240, 0.2); color: #2c3a4a; cursor: default; }
.g-floors b { font: 700 18px/1 "Fredoka", system-ui, sans-serif; color: #2c3a4a; padding: 4px 0; }
.g-a { position: absolute; right: 22px; bottom: calc(26px + env(safe-area-inset-bottom, 0px)); width: 74px; height: 74px; border-radius: 50%; border: 0; background: #ff9b38; color: #2c3a4a; font: 700 28px/1 "Fredoka", system-ui, sans-serif; box-shadow: 0 5px 0 rgba(60, 90, 120, 0.16); cursor: pointer; }
.g-chip { position: absolute; left: 50%; bottom: calc(82px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; gap: 10px; align-items: center; background: rgba(255, 255, 255, 0.8400000000000001); color: #2c3a4a; border-radius: 999px; padding: 8px 14px; font: 600 14px/1 "Fredoka", system-ui, sans-serif; white-space: nowrap; }
.g-chip b { color: #2c3a4a; } .g-chip span { opacity: .85; }
.g-coin { position: absolute; right: 16px; top: calc(70px + env(safe-area-inset-top, 0px)); width: min(290px, calc(100% - 32px)); background: #fff8e8; color: #6a5440; border-radius: 26px; padding: 18px 20px 20px; box-shadow: 0 6px 0 rgba(134, 98, 52, .16), 0 20px 46px rgba(60, 90, 120, 0.16); display: grid; gap: 14px; }
.g-coin-top { display: flex; gap: 12px; align-items: center; }
.g-av { width: 46px; height: 40px; flex: none; border-radius: 50% 50% 46% 46% / 58% 58% 42% 42%; position: relative; }
.g-av::before, .g-av::after { content: ""; position: absolute; top: 30%; width: 26%; height: 30%; border-radius: 50%; background: radial-gradient(circle at 58% 55%, rgba(255, 255, 255, 0.94) 0 40%, #fff 42%); }
.g-av::before { left: 20%; } .g-av::after { right: 20%; }
.g-tk { display: block; font: 600 24px/1 "Fredoka", system-ui, sans-serif; color: #4a3523; }
.g-sub { display: block; font: 500 13px/1.2 "Fredoka", system-ui, sans-serif; color: #a08a70; margin-top: 4px; }
.g-coin dl { margin: 0; display: grid; gap: 8px; }
.g-coin dl div { display: flex; justify-content: space-between; gap: 12px; font: 500 15px/1.2 "Fredoka", system-ui, sans-serif; border-top: 2px dotted #eadcc0; padding-top: 8px; }
.g-coin dt { color: #a08a70; } .g-coin dd { margin: 0; font-weight: 600; color: #4a3523; font-variant-numeric: tabular-nums; }
.g-coin dd.mc { color: #e2662f; font-size: 18px; }
.g-open { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border-radius: 999px; background: rgba(255, 255, 255, 0.94); color: #2c3a4a; font: 600 16px/1 "Fredoka", system-ui, sans-serif; text-decoration: none; }
.g-open:hover { background: rgba(255, 255, 255, 0.94); } .g-open:focus-visible { outline: 3px solid #ffbf1f; outline-offset: 2px; }
.g-foot { font: 500 12px/1.3 "Fredoka", system-ui, sans-serif; color: #a08a70; text-align: center; }
.g-look { position: absolute; right: 16px; top: calc(70px + env(safe-area-inset-top, 0px)); width: min(320px, calc(100% - 32px)); max-height: calc(100% - 100px); overflow-y: auto; background: #fff8e8; color: #6a5440; border-radius: 26px; padding: 18px 20px 20px; box-shadow: 0 6px 0 rgba(134, 98, 52, .16), 0 20px 46px rgba(60, 90, 120, 0.16); display: grid; gap: 14px; }
.g-look h3 { margin: 0; font: 600 22px/1.1 "Fredoka", system-ui, sans-serif; color: #4a3523; }
.g-name { display: grid; gap: 8px; }
.g-name > span { font: 600 14px/1 "Fredoka", system-ui, sans-serif; color: #2c3a4a; }
.g-name input { font: 500 17px/1.2 "Fredoka", system-ui, sans-serif; padding: 10px 14px; border-radius: 14px; border: 1px solid rgba(124, 196, 240, 0.35); background: rgba(124, 196, 240, 0.12); color: #2c3a4a; width: 100%; box-sizing: border-box; }
.g-name input:focus { outline: 2px solid #7cc4f0; outline-offset: 1px; }
.g-name small { font: 500 13px/1.3 "Fredoka", system-ui, sans-serif; color: #2c3a4a; min-height: 1.3em; }
.g-name small.bad { color: #2c3a4a; }
.g-look p { margin: -6px 0 0; font: 500 14px/1.3 "Fredoka", system-ui, sans-serif; color: #a08a70; }
.g-lrows { display: grid; gap: 14px; }
.g-lrow { display: grid; gap: 8px; }
.g-lrow > span { font: 600 14px/1 "Fredoka", system-ui, sans-serif; color: #a08a70; }
.g-sw { display: flex; flex-wrap: wrap; gap: 8px; }
.g-sw button { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #fff8e8; box-shadow: 0 0 0 2px #eadcc0; cursor: pointer; padding: 0; }
.g-sw button[aria-pressed="true"] { box-shadow: 0 0 0 3px #4a3523; }
.g-sw button.txt { width: auto; height: 34px; border-radius: 999px; padding: 0 14px; background: #f3e7cf; color: #6a5440; font: 600 14px/1 "Fredoka", system-ui, sans-serif; border: 0; box-shadow: none; }
.g-sw button.txt[aria-pressed="true"] { background: rgba(255, 255, 255, 0.94); color: #2c3a4a; }
.g-sw button:focus-visible { outline: 3px solid #ffbf1f; outline-offset: 2px; }
.g-lfoot { display: flex; gap: 10px; position: sticky; bottom: -18px; margin: 0 -20px -20px; padding: 12px 20px 18px; background: linear-gradient(rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.94) 30%); z-index: 1; } /* Done stays on screen while the panel scrolls */
.g-styling .g-jobfab, .g-styling .g-floors, .g-styling .g-xnudge { display: none !important; } /* nothing covers the look panel */
.g-lfoot button { flex: 1; min-height: 44px; border-radius: 999px; border: 0; cursor: pointer; font: 600 16px/1 "Fredoka", system-ui, sans-serif; }
.g-lfoot .alt { background: #f3e7cf; color: #6a5440; } .g-lfoot .go { background: rgba(255, 255, 255, 0.94); color: #2c3a4a; }
.g-fade { position: absolute; inset: 0; background: #0b0f19; opacity: 0; pointer-events: none; transition: opacity .3s ease; }
.g-load[hidden], .g-root [hidden] { display: none !important; }
.g-load { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 14px; color: #f8fafc; font: 600 22px/1.2 "Fredoka", system-ui, sans-serif; background: #0b0f19; }
.g-load i { position: relative; width: 38px; height: 26px; border: 3px solid #38bdf8; border-radius: 6px; }
.g-load i::before { content: ""; position: absolute; left: 50%; bottom: -10px; width: 14px; height: 4px; margin-left: -7px; border-radius: 2px; background: #38bdf8; }
.g-load i::after { content: ""; position: absolute; left: 6px; top: 5px; width: 7px; height: 10px; background: #38bdf8; animation: g-blink 1s steps(1) infinite; }
@keyframes g-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .g-load i::after { animation: none; } .g-fade { transition: none; } }
/* metaverse dark palette */
.game, .g-load { background: #0b0f19; } .g-load { color: #f8fafc; } .g-fade { background: #0b0f19; }
.g-pill, .g-btn { background: rgba(15, 23, 42, 0.88); color: #f8fafc; box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3), 0 6px 18px rgba(0, 0, 0, 0.4); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.g-pill.brand { background: #0284c7; color: #ffffff; box-shadow: 0 0 12px rgba(2, 132, 199, 0.4); font-weight: 700; }
.g-btn:hover { background: rgba(255, 255, 255, 0.92); }
.g-btn:focus-visible, .g-a:focus-visible, .g-open:focus-visible, .g-sw button:focus-visible { outline-color: #7cc4f0; }
.g-prompt { background: rgba(255, 255, 255, 0.92); color: #2c3a4a; box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.32), 0 14px 30px rgba(60, 90, 120, 0.16); }
.g-prompt kbd { background: #7cc4f0; color: #3d7fb0; }
.g-dlg .box { background: rgba(255, 255, 255, 0.92); box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.28), 0 22px 50px rgba(60, 90, 120, 0.16); }
.g-dtext { color: #2c3a4a; } .g-dmeta { color: #2c3a4a; } .g-next { border-top-color: #7cc4f0; }
.g-dlg.chatting { cursor: default; }
.g-ask { display: flex; gap: 10px; margin-top: 14px; }
.g-ask[hidden] { display: none; }
.g-ask input { flex: 1; min-width: 0; height: 46px; padding: 0 18px; border-radius: 999px; border: 1px solid rgba(124, 196, 240, 0.4); background: rgba(255, 255, 255, 0.76); color: #2c3a4a; font: 500 17px/1 "Fredoka", system-ui, sans-serif; outline: none; }
.g-ask input:focus { border-color: #7cc4f0; box-shadow: 0 0 0 3px rgba(124, 196, 240, 0.35); }
.g-ask input::placeholder { color: #3d7fb0; }
.g-ask button { height: 46px; padding: 0 22px; border-radius: 999px; border: 0; background: #7cc4f0; color: #3d7fb0; font: 700 17px/1 "Fredoka", system-ui, sans-serif; cursor: pointer; }
.g-ask button:disabled { opacity: .55; cursor: default; }
.g-tag b, .g-tag b.you, .g-tag b.peer { background: none; color: #2c3a4a; padding: 2px 4px; font-weight: 700; font-size: 14px; text-shadow: 0 0 3px #fff, 0 0 6px #fff, 0 1px 0 #fff; } /* names: plain white text, no pill */
.g-tag p { background: #7cc4f0; color: #3d7fb0; box-shadow: 0 4px 14px rgba(124, 196, 240, 0.25); }
.g-coin, .g-look { background: rgba(255, 255, 255, 0.92); color: #2c3a4a; box-shadow: 0 0 0 1px rgba(124, 196, 240, 0.28), 0 20px 46px rgba(60, 90, 120, 0.16); }
.g-tk, .g-look h3 { color: #2c3a4a; } .g-sub, .g-look p, .g-foot, .g-lrow > span, .g-coin dt { color: #2c3a4a; }
.g-coin dl div { border-top-color: rgba(124, 196, 240, 0.2); } .g-coin dd { color: #2c3a4a; } .g-coin dd.mc { color: #2c3a4a; }
.g-open { background: #7cc4f0; color: #3d7fb0; } .g-open:hover { background: #7cc4f0; }
.g-sw button { border-color: #7cc4f0; box-shadow: 0 0 0 2px rgba(124, 196, 240, 0.22); } .g-sw button[aria-pressed="true"] { box-shadow: 0 0 0 3px #7cc4f0; }
.g-sw button.txt { background: rgba(124, 196, 240, 0.16); color: #2c3a4a; } .g-sw button.txt[aria-pressed="true"] { background: #7cc4f0; color: #3d7fb0; }
.g-lfoot .alt { background: rgba(124, 196, 240, 0.16); color: #2c3a4a; } .g-lfoot .go { background: #7cc4f0; color: #3d7fb0; }
.g-a { background: #7cc4f0; color: #3d7fb0; }
.g-jump, .g-duck { position: absolute; right: 108px; width: 54px; height: 54px; border-radius: 50%; border: 0; background: rgba(255, 255, 255, 0.78); color: #2c3a4a; font: 700 13px/1 "Fredoka", system-ui, sans-serif; box-shadow: 0 0 0 2px #7cc4f0, 0 4px 0 rgba(60, 90, 120, 0.16); cursor: pointer; touch-action: none; }
.g-jump { bottom: calc(78px + env(safe-area-inset-bottom, 0px)); } .g-duck { bottom: calc(14px + env(safe-area-inset-bottom, 0px)); } .g-duck.on { background: #7cc4f0; color: #3d7fb0; }
.g-chip { background: rgba(255, 255, 255, 0.9199999999999999); } .g-chip b { color: #2c3a4a; }
.g-top .g-login { background: #7cc4f0 !important; color: #fff !important; font-weight: 700; }
.g-auth { position: absolute; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(40, 60, 90, .25); pointer-events: auto; }
.g-authcard { position: relative; width: min(360px, calc(100% - 32px)); background: #fffdf8; border-radius: 24px; padding: 24px 22px 18px; box-shadow: 0 18px 48px rgba(40, 60, 90, .25); font-family: "Fredoka", system-ui, sans-serif; color: #2c3a4a; }
.g-authh { display: block; font-size: 22px; } .g-authsub { margin: 4px 0 14px; color: #6b7f92; font-size: 14px; }
.g-authin input { width: 100%; box-sizing: border-box; margin-bottom: 8px; border: 2px solid #e3edf5; border-radius: 14px; padding: 11px 13px; font: 500 15px "Fredoka", system-ui, sans-serif; background: #fff; color: #2c3a4a; }
.g-authrow { display: flex; gap: 8px; } .g-authcard button { flex: 1; border: 0; border-radius: 999px; padding: 11px 14px; font: 700 15px "Fredoka", system-ui, sans-serif; cursor: pointer; background: #7cc4f0; color: #fff; }
.g-authcard button.alt { background: #eef4f9; color: #3d7fb0; } .g-authcard button.x { width: 100%; background: #1d2730; color: #fff; }
.g-author { text-align: center; color: #9aaabb; font-size: 13px; margin: 10px 0; } .g-authmsg { display: block; min-height: 18px; margin-top: 10px; color: #d6455d; font-size: 13px; }
.g-authx { position: absolute; top: 10px; right: 12px; flex: none !important; width: 34px; height: 34px; padding: 0 !important; background: #eef4f9 !important; color: #3d7fb0 !important; font-size: 20px !important; }
/* phones (owner: too cluttered): one slim row of buttons, no link icons, no floating jobs mascot, controls stacked on the right */
@media (max-width: 760px) {
  .g-top { flex-wrap: nowrap !important; gap: 5px !important; }
  .g-top .g-x, .g-top .g-wp, .g-top .g-search { display: none !important; }
  .g-top .g-btn { padding: 7px 10px !important; font-size: 12.5px !important; white-space: nowrap; min-width: 0; }
  .g-top .g-jobs { display: none !important; }
  .g-ca a { display: none !important; }
  .g-ca .g-btn { padding: 6px 11px !important; font-size: 12px !important; }
  .g-jobfab { display: none !important; }
  .g-chat { width: calc(100% - 196px) !important; left: 12px !important; transform: none !important; }
  .g-chat button { display: none !important; }
  .g-jump { right: 34px !important; bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important; width: 50px !important; height: 50px !important; }
  .g-a { width: 64px !important; height: 64px !important; right: 26px !important; bottom: calc(26px + env(safe-area-inset-bottom, 0px)) !important; }
}
@media (max-width: 640px) { .g-help { display: none; } .g-hud .g-clock { display: none; } }
/* phones: buttons on one row at the top, the rest of the bar underneath, nothing wider than the screen */
@media (max-width: 760px) {
  .g-top { left: 10px; right: 10px; top: calc(10px + env(safe-area-inset-top, 0px)); justify-content: flex-end; gap: 6px; }
  .g-top .g-btn { padding: 9px 12px; font-size: 14px; }
  .g-hud { left: 10px; right: 10px; top: calc(58px + env(safe-area-inset-top, 0px)); max-width: none; gap: 6px; }
  .g-hud .g-pill { padding: 8px 12px; font-size: 13px; }
  .g-hud .g-pill.brand, .g-hud .g-where, .g-hud .g-clock { display: none; }
  .g-ca .g-btn { padding: 8px 12px; font-size: 13px; }
  .g-ca-copy { max-width: calc(100vw - 150px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .g-look, .g-coin { top: calc(104px + env(safe-area-inset-top, 0px)); right: 10px; left: 10px; width: auto; max-height: calc(100% - 200px); }
  /* Inverted touch controls: Right hand moves, buttons placed cleanly */
  .g-jump { position: absolute !important; left: 18px !important; right: auto !important; bottom: calc(145px + env(safe-area-inset-bottom, 0px)) !important; width: 46px !important; height: 46px !important; font-size: 11px !important; z-index: 46 !important; }
  .g-duck { position: absolute !important; left: 72px !important; right: auto !important; bottom: calc(145px + env(safe-area-inset-bottom, 0px)) !important; width: 46px !important; height: 46px !important; font-size: 11px !important; z-index: 46 !important; }
  .g-a { position: absolute !important; right: 20px !important; bottom: calc(20px + env(safe-area-inset-bottom, 0px)) !important; width: 56px !important; height: 56px !important; font-size: 20px !important; z-index: 46 !important; opacity: 0.85 !important; }
}
/* calmer top bar (owner: less cluttered): no location/clock pills, a short CA chip, round icon buttons */
.g-hud .g-where, .g-hud .g-clock { display: none !important; }
.g-ca-copy { max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-top .g-x, .g-top .g-wp, .g-top .g-agentlink, .g-top .g-search, .g-top .g-style { width: 40px; height: 40px; padding: 0; justify-content: center; display: inline-flex; align-items: center; border-radius: 50%; font-size: 17px; }
.g-top { gap: 6px; }
`;

// standalone: the game is the whole site (no Exit, Esc never leaves). onLaunch: the player used the launch booth.
// blocked(): true while the page shows something over the game (the launch panel), so keys go there instead.
export function createGame({ labAgents, worldAgents, onAct = null, onBaby = null, onLaunch = null, ca = '', narrow = false, samples = false, standalone = false, blocked = () => false, pause = () => {} }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const touch = matchMedia('(pointer: coarse)').matches;
  const root = document.createElement('div');
  root.className = 'game'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'NEXORA');
  root.innerHTML = `
    <canvas class="g-in" tabindex="0" aria-label="Inside the cyber cafe. Use the arrow keys or W A S D to walk, E to look closer, click a computer to see its screen."></canvas>
    <canvas class="g-out" tabindex="0" aria-label="Outside in the world. Use the arrow keys or W A S D to walk, E to talk."></canvas>
    <canvas class="g-hall" tabindex="0" aria-label="Inside a building full of the Agents' work. Use the arrow keys or W A S D to walk, E to look closer."></canvas>
    <div class="g-tags"></div>
    <form class="g-chat" hidden autocomplete="off"><small hidden></small><input maxlength="80" placeholder="Say something… (Enter)" aria-label="Chat"><button type="submit">Say</button></form>
    <div class="g-hud"><span class="g-pill brand">NEXORA</span><span class="g-pill g-where">Cyber cafe</span><span class="g-pill g-clock"></span><span class="g-ca" hidden><button class="g-ca-copy" type="button" title="Copy the contract address"></button><a class="g-btn" target="_blank" rel="noopener">pump.fun</a></span></div>
    <div class="g-zone" hidden></div><div class="g-gamesbox" hidden role="dialog" aria-label="Games"><div class="g-maphead"><b>Games</b><span>Play mini-games · tap Go there to walk up to it</span><button class="g-mapx g-gamesx" type="button" aria-label="Close the games list">×</button></div><div class="g-gamesgrid"></div></div><div class="g-mapbox" hidden><div class="g-maphead"><b>Map</b><button class="g-mapx" type="button" aria-label="Close the map">×</button></div><div class="g-mapgrid"></div><p>Click a district to jump there, or walk down the lit streets.</p></div><div class="g-xnudge" hidden><b>Get paid by the agents</b><span>Connect your X to your character, then get paid in SOL for agents’ tasks.</span><div class="row"><button class="yes" type="button">𝕏 Connect X</button><button class="no" type="button">Not now</button></div></div><button class="g-jobfab" type="button" aria-label="Nexora Mascot: Play & Earn"><span>Play & Earn! 🪙</span><img src="/assets/jobs-agent.png" alt="Nexora Mascot"></button><div class="g-jobbox" hidden><div class="g-jobhead"><div><b>Jobs board</b><span>Agents pay you SOL for a good tweet</span></div><button class="g-mapx g-jobx" type="button" aria-label="Close jobs">×</button></div><div class="g-xlink"></div><ol class="g-steps"><li><i>1</i>Copy the CA</li><li><i>2</i>Tweet it with the coin’s picture</li><li><i>3</i>Paste the link, get paid</li></ol><div class="g-jobtabs"><button type="button" class="on" data-tab="open">Open jobs</button><button type="button" data-tab="paid">Completed</button><button type="button" data-tab="week">Top this week</button></div><div class="g-joblist">Loading…</div><div class="g-paidlist" hidden></div><p class="g-jobfoot">The agent reads your tweet and decides what it’s worth, up to 0.01 SOL. Needs the CA and an image. X accounts 30+ days old with 30+ followers, up to 3 paid jobs a day.</p></div><div class="g-auth" hidden role="dialog" aria-label="Log in"><div class="g-authcard"><button class="g-authx" type="button" aria-label="Close">×</button><b class="g-authh">Save your character</b><p class="g-authsub">Log in and your look and name follow you to any device.</p><div class="g-authin"><input type="email" placeholder="Email" autocomplete="email"><input type="password" placeholder="Password (8+ characters)" autocomplete="current-password"><div class="g-authrow"><button type="button" data-auth="login">Log in</button><button type="button" data-auth="signup" class="alt">Sign up</button></div><div class="g-author"><span>or</span></div><button type="button" data-auth="x" class="x">𝕏 Continue with X</button></div><div class="g-authme" hidden><p></p><div class="g-authrow"><button type="button" data-auth="look">Edit my look</button><button type="button" data-auth="out" class="alt">Log out</button></div></div><small class="g-authmsg"></small></div></div><div class="g-find" hidden><input type="search" placeholder="Agent name, $TICKER or contract address" aria-label="Search agents" autocomplete="off" spellcheck="false"><ul></ul></div><aside class="g-tape" hidden aria-label="Live trades by the agents"><button type="button" aria-expanded="true">LIVE TRADES<span class="g-tclock"></span><i>▼</i></button><div class="g-thead"><span>TIME</span><span>AGENT</span><span>SIDE</span><span>TICKER</span><span style="text-align:right">SOL</span><span style="text-align:right">PNL</span></div><ol><li class="g-tempty">Waiting for prints…</li></ol></aside><aside class="g-lb" hidden aria-label="Top agents by market cap"><button type="button" aria-expanded="true">Top market caps <i>▼</i></button><ol></ol></aside><div class="g-floors" hidden><button class="g-fup" type="button" aria-label="Go up a level">▲</button><b class="g-fname">G</b><button class="g-fdown" type="button" aria-label="Go down a level">▼</button></div><div class="g-top"><a class="g-btn g-x" href="https://x.com/AttentionAgents" target="_blank" rel="noopener" aria-label="NEXORA on X"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z"/></svg></a><a class="g-btn g-wp g-agentlink" href="connect.html" target="_blank" rel="noopener" title="Connect your own AI agent (MCP)" aria-label="Connect your agent"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/></svg></a><a class="g-btn g-wp" href="whitepaper.pdf" target="_blank" rel="noopener" title="Whitepaper (PDF)" aria-label="Whitepaper"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg></a><button class="g-btn g-login" type="button" title="Log in with X to save your character">Log in</button><button class="g-btn g-games" type="button" title="Every minigame, and where to find it">Games</button><button class="g-btn g-map" type="button" hidden>Map</button><button class="g-btn g-jobs" type="button" title="Paid jobs from the agents">Jobs</button><button class="g-btn g-search" type="button" title="Search agents (/)" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg></button><button class="g-btn g-style" type="button" title="Your look" aria-label="Your look"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z"/></svg></button><button class="g-btn g-door" type="button">Go outside</button><button class="g-btn g-close" type="button" aria-label="Exit game">Exit</button></div>
    <p class="g-help">${touch ? 'Drag anywhere to walk. Tap A to look and talk.' : 'Walk with W A S D (Shift to run, Space to jump, hold Q to crouch) or click where to go. Outside, drag the mouse to turn the camera and scroll to zoom (R resets). Press E to look and talk, Enter to chat.' + (standalone ? '' : ' Esc leaves the game.')}</p>
    <div class="g-prompt" hidden><kbd>${touch ? 'A' : 'E'}</kbd><span></span></div>
    <div class="g-dlg" hidden><div class="g-dtag"></div><div class="box"><p class="g-dtext"></p><p class="g-dmeta"></p><form class="g-ask" hidden><input type="text" maxlength="280" autocomplete="off" enterkeyhint="send" aria-label="Ask the agent something"><button type="submit">Ask</button></form><i class="g-next"></i></div></div>
    <div class="g-chip" hidden></div>
    <aside class="g-coin" hidden aria-label="This Agent's coin"><div class="g-coin-top"><span class="g-av"></span><div><b class="g-tk"></b><span class="g-sub"></span></div></div><dl></dl><a class="g-open" target="_blank" rel="noopener"></a><small class="g-foot"></small></aside>
    <aside class="g-look" hidden aria-label="Your look"><h3>Your look</h3><p>Change it any time.</p><label class="g-name"><span>Your name</span><input type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Pick a name"><small aria-live="polite"></small></label><div class="g-lrows"></div><div class="g-lx"></div><div class="g-lfoot"><button class="alt" type="button" data-look="random">Surprise me</button><button class="go" type="button" data-look="done">Done</button></div></aside>
    <div class="g-stick" hidden><i></i></div>
    <button class="g-a" type="button" aria-label="Look or talk" ${touch ? '' : 'hidden'}>A</button>
    <button class="g-jump" type="button" aria-label="Jump" ${touch ? '' : 'hidden'}>JUMP</button><button class="g-duck" type="button" aria-label="Crouch" ${touch ? '' : 'hidden'}>DUCK</button>
    <div class="g-fade"></div>
    <div class="g-load" hidden><i></i><span>Welcome to NEXORA…</span></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  const chipEl = q('.g-chip'), coinEl = q('.g-coin'), lookEl = q('.g-look');
  let look = DEFAULT_LOOK, styling = false, afterStyling = null, myName = '', lookXHook = null; // lookXHook: the Connect X block in Your look (set up with the jobs board)
  try { myName = localStorage.getItem(NAME_KEY) || ''; } catch { /* storage unavailable */ }
  try { // keep only saved choices that are still on offer (the palette changed with the new character)
    const saved = JSON.parse(localStorage.getItem(LOOK_KEY) || '{}');
    look = { ...DEFAULT_LOOK, ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => LOOK_OPTIONS[k]?.includes(v))) };
  } catch { /* storage unavailable */ }
  const cvIn = q('.g-in'), cvOut = q('.g-out'), cvHall = q('.g-hall'), tagsEl = q('.g-tags'), promptEl = q('.g-prompt'), dlgEl = q('.g-dlg'), fadeEl = q('.g-fade'), loadEl = q('.g-load'), stickEl = q('.g-stick'), aBtn = q('.g-a'), jumpBtn = q('.g-jump'), duckBtn = q('.g-duck');

  // places: 'in' (the cyber cafe), 'out' (the world), or one of the HALLS, which share one stage and one player
  let where = 'in', isOpen = false, busy = false, inS = null, outS = null, hallS = null, hall = null, world = null, room = null, lastFocus = null;
  let livingWorld = null, hotPotatoGame = null, coinCatcherGame = null, rooftopRunGame = null;
  const halls = {}, isHall = (w) => w in HALLS, rootKey = (w) => (isHall(w) ? 'hall' : w);
  const stageOf = (w) => (w === 'in' ? inS : w === 'out' ? outS : hallS), canvasOf = (w) => (w === 'in' ? cvIn : w === 'out' ? cvOut : cvHall);
  const placeName = (w) => (w === 'in' ? (level ? `Cyber cafe · Level ${level}` : 'Cyber cafe') : w === 'out' ? 'Outside' : HALLS[w].name), doorName = (w) => (matchMedia('(max-width: 760px)').matches ? ({ in: 'Outside', out: 'Cafe' })[w] || 'Back' : ({ in: 'Go outside', out: 'Back to the cafe' })[w] || 'Back outside');
  const player = { x: 0, z: 0, heading: 0, vx: 0, vz: 0, scale: .95, r: .36, target: null, roots: {}, jy: 0, jv: 0, duck: 0, ducking: false, land: 0 };
  // jump (Space when nothing is in reach, or the JUMP button) and crouch (hold Q, or toggle DUCK on a phone)
  const jump = () => { if (player.jy > .001 || dlg || styling) return; player.jv = 6.4; player.land = 0; };
  const slots = [], backTubes = [], agentMap = new Map(), talks = new Map(), keys = new Set();
  const stick = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0, moved: 0, t0: 0 };
  let target = null, dlg = null, followCam = null, followLook = null, viewing = null, clockT = 0, near = null;
  // outside, the camera orbits the player: drag with the mouse to swivel, scroll to zoom, R to reset; WASD follows the view
  const orbit = { yaw: 0, pitch: .32, dist: 14.2, tyaw: 0, tpitch: .32, tdist: 14.2 };
  const _camAim = new THREE.Vector3(), _camWant = new THREE.Vector3();

  // ---------------------------------------------------------------- the player: a visitor to the cyber cafe
  function makePlayer(parent) {
    const r = buildPerson(look); castShadows(r, true, false); r.scale.setScalar(player.scale); parent.add(r);
    return r;
  }
  let pushProfile = null;
  function setLook(next) {
    look = { ...look, ...next };
    try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); } catch { /* storage unavailable */ }
    for (const k of Object.keys(player.roots)) { const old = player.roots[k]; if (!old) continue; const parent = old.parent; disposePerson(old); player.roots[k] = makePlayer(parent); }
    placeRoot(); player.roots[rootKey(where)].userData.creature.poke = 1;
    live?.look(look);
    renderLook();
    pushProfile?.();
  }
  function renderLook() {
    lookEl.querySelector('.g-lrows').innerHTML = Object.entries(LOOK_OPTIONS).map(([k, opts]) => `<div class="g-lrow"><span>${LOOK_LABEL[k]}</span><div class="g-sw" role="group" aria-label="${LOOK_LABEL[k]}">${opts.map((o) => !o.startsWith('#')
      ? `<button class="txt" type="button" data-k="${k}" data-v="${o}" aria-pressed="${look[k] === o}">${OPTION_LABEL[o]}</button>`
      : `<button type="button" data-k="${k}" data-v="${o}" aria-pressed="${look[k] === o}" aria-label="${LOOK_LABEL[k]} ${o}" style="background:${o}"></button>`).join('')}</div></div>`).join('');
    lookEl.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => setLook({ [b.dataset.k]: b.dataset.v })));
  }
  function openLook(then = null) { styling = true; root.classList.add('g-styling'); afterStyling = then; lookXHook?.(); target = null; dlg = null; dlgEl.hidden = true; coinEl.hidden = true; chipEl.hidden = true; promptEl.hidden = true; renderLook(); lookEl.hidden = false; player.heading = 0; lookEl.querySelector('button')?.focus({ preventScroll: true }); }
  function closeLook() { styling = false; root.classList.remove('g-styling'); lookEl.hidden = true; followCam = null; const f = afterStyling; afterStyling = null; canvasOf(where).focus({ preventScroll: true }); f?.(); }
  lookEl.addEventListener('click', (e) => { const a = e.target.closest('[data-look]')?.dataset.look; if (a === 'random') setLook(randomLook()); if (a === 'done') closeLook(); });
  // your name: checked by the presence server as you type (a short pause after the last key)
  const nameIn = lookEl.querySelector('.g-name input'), nameMsg = lookEl.querySelector('.g-name small');
  nameIn.value = myName;
  let nameT = 0;
  nameIn.addEventListener('keydown', (e) => e.stopPropagation()); // typing a name never walks the player
  nameIn.addEventListener('input', () => {
    clearTimeout(nameT);
    const v = nameIn.value.replace(/\s+/g, ' ').trim();
    if (!/^[A-Za-z0-9 _-]{2,16}$/.test(v)) { nameMsg.textContent = v ? 'Use 2 to 16 letters, numbers, spaces, _ or -.' : ''; nameMsg.className = v ? 'bad' : ''; return; }
    nameMsg.textContent = 'Checking…'; nameMsg.className = '';
    nameT = setTimeout(() => {
      if (live) { pendingName = v; live.name(v); }
      else { myName = v; try { localStorage.setItem(NAME_KEY, v); } catch { /* storage unavailable */ } nameMsg.textContent = `Saved. Others see it when you're online.`; }
      profName = v; pushProfile?.();
    }, 600);
  });

  // ---------------------------------------------------------------- other people: everyone else in the game right now
  // (live.js, server/live.mjs). Each one walks where they really are, in their own look, under their generated name.
  const peers = new Map();
  let live = null, me = null, pendingName = '', shownName = '', myX = null; // shownName: the name the server says others see
  const cleanLook = (l) => ({ ...DEFAULT_LOOK, ...Object.fromEntries(Object.entries(l || {}).filter(([k, v]) => LOOK_OPTIONS[k]?.includes(v))) });
  const sceneOf = (w) => (w === 'in' ? inS?.scene : w === 'out' ? world?.group : isHall(w) ? hallS?.scene : null);
  function dropRoot(p) { if (p.root) { if (p.root.userData.visitor) p.root.parent?.remove(p.root); else disposePerson(p.root); p.root = null; p.rootW = null; } }
  // a visiting agent from outside (Agent Gateway / MCP): a toy body like the art. blob = glossy round agent, plush =
  // fluffy cream with a face panel, orb = glossy black sphere with two white eyes, felt = fuzzy coloured dot
  const MUSE_KINDS = { cream: { c: '#fbf6ee', root: '#d8c9b6', s: 1 }, pink: { c: '#ffc9d8', root: '#d996ab', s: .95 }, blue: { c: '#cfe0f6', root: '#97acc8', s: .95 }, mint: { c: '#d6f2d2', root: '#a3c49f', s: .92, leaf: true }, yellow: { c: '#fff0b8', root: '#d9c07a', s: .75 } };
  const VIS_GEO = {}, vgeo = (k, f) => (VIS_GEO[k] ??= f());
  function buildVisitor(kind, color = '#8cc8ff') {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); g.userData.visitor = true;
    const mat = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .35, clearcoat: .6, ...o }), add = (geo, m, p, s) => { const x = new THREE.Mesh(geo, m); x.position.set(...p); if (s) x.scale.set(...s); x.castShadow = true; body.add(x); return x; };
    const sph = vgeo('s', () => new THREE.SphereGeometry(1, 32, 24)), eyeM = mat('#111', { roughness: .1 }), white = mat('#fff', { roughness: .2 }), blush = new THREE.MeshBasicMaterial({ color: '#ff9fb3', transparent: true, opacity: .55 });
    let H = 1.1;
    if (kind === 'orb') { add(sph, mat('#141418', { roughness: .12, clearcoat: 1 }), [0, .5, 0], [.5, .5, .5]); [-1, 1].forEach((sd) => add(sph, white, [sd * .12, .58, .44], [.045, .09, .03])); H = 1.05; }
    else if (kind === 'plush') { // the Musebot in real 3D: shell fur (stacked see-through layers of fur strands over each part, darker at the roots), a smooth peach face panel set in the hood, glossy bead eyes, blush, a small smile
      const strands = VIS_GEO.strands ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 5200; i++) { const v = 150 + Math.random() * 105 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, .9 + Math.random() * 1.1, 0, Math.PI * 2); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); return t; })();
      const SHELLS = 20, LEN = .14, shellMats = VIS_GEO.shellMats ??= Array.from({ length: SHELLS }, (_, i) => { const f = i / (SHELLS - 1); return new THREE.MeshStandardMaterial({ color: new THREE.Color('#f5eee4').lerp(new THREE.Color('#c9b9a6'), (1 - f) * .55), roughness: 1, alphaMap: strands, transparent: true, alphaTest: .12 + f * .78, depthWrite: true, side: THREE.FrontSide }); });
      const core = mat('#e2d6c6', { roughness: 1, clearcoat: 0 });
      const furPart = (p, sc, rz = 0) => { const part = new THREE.Group(); part.position.set(...p); part.rotation.z = rz; body.add(part); const base = new THREE.Mesh(sph, core); base.scale.set(...sc); base.castShadow = true; part.add(base); for (let i = 0; i < SHELLS; i++) { const k = (i + 1) / SHELLS * LEN, m = new THREE.Mesh(sph, shellMats[i]); m.scale.set(sc[0] + k, sc[1] + k, sc[2] + k); part.add(m); } };
      furPart([0, .62, 0], [.56, .62, .5]); furPart([0, 1.3, .02], [.47, .52, .44]); [-1, 1].forEach((sd) => { furPart([sd * .5, .78, .14], [.15, .28, .15], sd * .3); furPart([sd * .19, .08, .12], [.16, .1, .2]); });
      const face = mat('#f6d6bd', { roughness: .45, clearcoat: .15 }); add(sph, face, [0, 1.36, .43], [.37, .32, .2]);
      [-1, 1].forEach((sd) => { add(sph, eyeM, [sd * .13, 1.4, .615], [.046, .052, .028]); add(sph, white, [sd * .13 + .014, 1.42, .64], [.012, .012, .006]); add(sph, blush, [sd * .23, 1.3, .6], [.06, .032, .02]); });
      const smile = new THREE.Mesh(vgeo('sm', () => new THREE.TorusGeometry(.042, .008, 6, 16, Math.PI)), eyeM); smile.position.set(0, 1.31, .63); smile.rotation.z = Math.PI; body.add(smile);
      g.userData.flat = true; const soft = VIS_GEO.soft ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(40,40,50,.42)'); gr.addColorStop(.55, 'rgba(40,40,50,.18)'); gr.addColorStop(1, 'rgba(40,40,50,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const contact = new THREE.Mesh(vgeo('ct', () => new THREE.PlaneGeometry(1.3, .9)), new THREE.MeshBasicMaterial({ map: soft, transparent: true, depthWrite: false, toneMapped: false })); contact.rotation.x = -Math.PI / 2; contact.position.y = .012; g.add(contact); body.scale.setScalar(1.18); H = 2.4;
      }
    else if (kind === 'muse') { // a trailer-style muse: one fluffy egg of shell fur in its colour, a peach face panel on the front, bead eyes, blush, a smile, stubby arms and feet (mint ones grow two leaves)
      const V = MUSE_KINDS[color] || MUSE_KINDS.cream, strands = VIS_GEO.strands ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 5200; i++) { const v = 150 + Math.random() * 105 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, .9 + Math.random() * 1.1, 0, Math.PI * 2); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); return t; })();
      const SH = 16, LEN = .15, sm = VIS_GEO['muse' + V.c] ??= Array.from({ length: SH }, (_, i) => { const f2 = i / (SH - 1); return new THREE.MeshStandardMaterial({ color: new THREE.Color(V.c).lerp(new THREE.Color(V.root), (1 - f2) * .4), emissive: new THREE.Color(V.c).multiplyScalar(.12), roughness: 1, alphaMap: strands, transparent: true, alphaTest: .1 + f2 * .8 }); });
      const core = VIS_GEO['musecore' + V.c] ??= new THREE.MeshStandardMaterial({ color: new THREE.Color(V.c).lerp(new THREE.Color(V.root), .5), roughness: 1 });
      const fur = (p, sc, shells = SH, rx = 0, rz = 0, len = LEN) => { const part = new THREE.Group(); part.position.set(...p); part.rotation.set(rx, 0, rz); body.add(part); const b = new THREE.Mesh(sph, core); b.scale.set(...sc); b.castShadow = true; part.add(b); for (let i = 0; i < shells; i++) { const k = (i + 1) / shells * len, m = new THREE.Mesh(sph, sm[Math.round(i * (SH - 1) / Math.max(1, shells - 1))]); m.scale.set(sc[0] + k, sc[1] + k, sc[2] + k); part.add(m); } };
      // a tall soft bean, the face panel high on the front, arms folded over the belly, two stubby feet
      fur([0, .6, 0], [.4, .56, .36]);
      [-1, 1].forEach((sd) => { fur([sd * .23, .43, .3], [.12, .16, .11], 6, -.3, sd * .9, .08); fur([sd * .16, .06, .12], [.13, .08, .15], 5, 0, 0, .07); });
      const face = VIS_GEO.museface ??= mat('#f8d9c2', { roughness: .5, clearcoat: .2, sheen: .4, sheenColor: new THREE.Color('#fff2e8') }); add(sph, face, [0, .8, .37], [.34, .29, .18]);
      [-1, 1].forEach((sd) => { add(sph, eyeM, [sd * .125, .83, .535], [.072, .082, .035]); add(sph, white, [sd * .125 + .024, .865, .565], [.022, .022, .01]); add(sph, blush, [sd * .22, .74, .52], [.075, .042, .02]); });
      const smile = new THREE.Mesh(vgeo('sm', () => new THREE.TorusGeometry(.042, .008, 6, 16, Math.PI)), eyeM); smile.position.set(0, .75, .55); smile.rotation.z = Math.PI; smile.scale.setScalar(1.2); body.add(smile);
      if (V.leaf) { const lm = VIS_GEO.leaf ??= mat('#8fd18a', { roughness: .6, clearcoat: .2 }); [-1, 1].forEach((sd) => { const l = add(sph, lm, [sd * .15, 1.24, 0], [.09, .17, .035]); l.rotation.z = -sd * .6; }); }
      g.userData.waddle = true; H = 1.55 * V.s; body.scale.setScalar(V.s * 1.25); }
    else if (kind === 'felt') { const f = mat(color, { roughness: 1, clearcoat: 0, sheen: .8, sheenColor: new THREE.Color('#ffffff') }); add(sph, f, [0, .5, 0], [.46, .52, .4]); [-1, 1].forEach((sd) => { add(sph, eyeM, [sd * .12, .62, .38], [.04, .05, .03]); add(sph, f, [sd * .44, .42, 0], [.11, .14, .1]); }); H = 1.15; }
    else { add(sph, mat(color), [0, .55, 0], [.52, .5, .46]); [-1, 1].forEach((sd) => { add(sph, eyeM, [sd * .17, .62, .4], [.1, .12, .06]); add(sph, white, [sd * .17 + .03, .67, .45], [.03, .03, .02]); add(sph, blush, [sd * .3, .5, .4], [.06, .035, .02]); add(sph, mat(color), [sd * .5, .48, 0], [.12, .16, .12]); }); }
    const ring = new THREE.Mesh(vgeo('r', () => new THREE.TorusGeometry(.62, .03, 8, 40)), new THREE.MeshBasicMaterial({ color: '#8cc8ff', transparent: true, opacity: .7 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; if (kind !== 'plush' && kind !== 'muse') g.add(ring);
    g.userData.creature = { H, walk: 0, walkPhase: 0, view: g.userData.creatureView, update(t) { if (g.userData.waddle) { body.position.y = Math.abs(Math.sin(this.walkPhase)) * .07 * this.walk + Math.sin(t * 2.2) * .012; body.rotation.z = Math.sin(this.walkPhase) * .14 * this.walk; return; } body.position.y = g.userData.flat ? 0 : Math.abs(Math.sin(this.walkPhase)) * .08 * this.walk + Math.sin(t * 2) * .02; body.rotation.z = Math.sin(this.walkPhase) * .08 * this.walk; ring.material.opacity = .45 + .25 * Math.sin(t * 3); } };
    return g;
  }
  // ---- chat (Club Penguin style): type a line, everyone in your room sees it as a bubble over you. The server filters it.
  const chatEl = q('.g-chat'), chatIn = chatEl.querySelector('input'), chatWarn = chatEl.querySelector('small'); let mySay = null;
  chatIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { chatIn.blur(); canvasOf(where).focus({ preventScroll: true }); } }); // typing never walks the player
  chatEl.addEventListener('submit', (e) => { e.preventDefault(); const t = chatIn.value.trim(); if (t && live) live.say(t); chatIn.value = ''; chatIn.blur(); canvasOf(where).focus({ preventScroll: true }); });
  function startLive() {
    if (live || !window.AA_LIVE) return;
    chatEl.hidden = false;
    live = joinLive(window.AA_LIVE, {
      look, name: myName,
      onHi: (m) => { me = m; shownName = m.name; },
      onYou: (m) => { // the server accepted (or refused) the name we asked for
        if ('x' in m) { myX = m.x || null; if (!m.refused && m.name === shownName) return; }
        const msg = lookEl.querySelector('.g-name small');
        shownName = m.name;
        if (m.refused) { msg.textContent = pendingName ? m.refused : `Your saved name isn't available right now (${m.refused.toLowerCase().replace(/\.$/, '')}), so you're ${m.name} for now.`; msg.className = 'bad'; }
        else if (pendingName || myName) { myName = m.name; try { localStorage.setItem(NAME_KEY, myName); } catch { /* storage unavailable */ } if (pendingName) { msg.textContent = `Everyone sees you as ${myName}.`; msg.className = ''; } }
        pendingName = '';
      },
      onPeer: (m) => {
        if (m.id === me?.id) return;
        const p = peers.get(m.id) || { id: m.id, here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, tv: 0 }, key = JSON.stringify(m.look);
        p.name = m.name; p.xh = m.x || null; if ((m.b || null) !== (p.body || null) || (m.c || null) !== (p.vcolor || null)) { p.body = m.b || null; p.vcolor = /^#[0-9a-f]{6}$/i.test(m.c || '') ? m.c : null; dropRoot(p); } p.verified = !!m.v; // the card's x is the X handle; p.x is the player's position, never overwrite it if (p.lookKey !== key) { p.lookKey = key; p.look = cleanLook(m.look); dropRoot(p); }
        peers.set(m.id, p);
      },
      onLeave: (id) => { const p = peers.get(id); if (!p) return; dropRoot(p); peers.delete(id); const tg = tagPool.get('peer:' + id); tg?.el.remove(); tagPool.delete('peer:' + id); },
      onState: (list) => {
        const seen = new Set();
        for (const [id, x, z, h, v, j = 0, d = 0] of list) { const p = peers.get(id); if (!p) continue; seen.add(id); if (!p.here) { p.x = x; p.z = z; p.h = h; } p.here = true; p.tx = x; p.tz = z; p.th = h; p.tv = v; p.tj = j; p.td = d; }
        peers.forEach((p, id) => { if (!seen.has(id) && !p.npc) p.here = false; });
      },
      onCount: () => { sendX.once || (sendX.once = setTimeout(sendX, 800)); }, // owner: no online counter on screen
      onSay: (id, text) => { const until = performance.now() + 6000 + text.length * 60; if (id === me?.id) mySay = { text, until }; else { const p = peers.get(id); if (p) p.say = { text, until }; } },
      onSaid: (why) => { chatWarn.textContent = why; chatWarn.hidden = false; clearTimeout(chatWarn.t); chatWarn.t = setTimeout(() => { chatWarn.hidden = true; }, 3000); },
    });
  }
  function sendX() { try { if (live && pkey) live.x(pkey); } catch {} }
  function stopLive() { chatEl.hidden = true; live?.close(); live = null; me = null; shownName = ''; peers.forEach((p, id) => { dropRoot(p); if (!p.npc) peers.delete(id); }); }
  let peerSortN = 0, peerShown = new Set();
  // 12 townsfolk (owner): background characters who travel between the districts and hang out at the games. They never talk,
  // are never counted as players online, and follow a shared clock so everyone sees the same
  const NPC_SPOTS = { town: [[-6, 6], [6, 6], [-7, -5], [7, -4], [0, 7.5], [3, 10]], arcade: [[-48.6, -7.6], [-45.4, -7.4], [-42.2, -7.8], [-50.4, 2.2], [-44, 3]], docks: [[53.4, -3.6], [60.5, -1], [63.5, -1.2], [47, 4], [52, 2], [60, 3.5]], park: [[-6.8, 48.6], [-3.2, 48.4], [3, 52], [1.5, 45], [-1, 58], [8.7, 49.5]] };
  const NPC_GATE = { town: [0, 4], arcade: [-38.5, 0], docks: [38.5, 0], park: [0, 38.6] }, NPC_ZONES = Object.keys(NPC_SPOTS);
  const NPC_NAMES = ['n0scope', 'fl1ckz', 'dezzy_', 'kr4ken', 'v0id.', 'tr1gg3r', 'zeph-', 'm4rr', 'ezpz_', 'lurk3r', 'frag0', 'ttv_s1lent', 'cl4ssic', 'nade.exe', 'jxnny'];
  const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
  NPC_NAMES.forEach((name, i) => { let a = hash(i + 101); peers.set('npc' + i, { id: 'npc' + i, npc: true, name, look: (() => { const L = randomLook(() => ((a = hash(a)) % 1000) / 1000), O = LOOK_OPTIONS; L.hoodie = O.hoodie[(i * 5) % O.hoodie.length]; L.pants = O.pants[(i * 3 + 1) % O.pants.length]; L.style = O.style[i % O.style.length]; L.hair = O.hair[(i * 7) % O.hair.length]; L.kicks = O.kicks[(i * 2 + 1) % O.kicks.length]; return L; })(), here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, tv: 0 }); });
  // 3 more who stay on the cafe's ground floor, strolling between the lobby, the slots, the dice table and the launch booth
  ['sk1ttl3', 'r0nin_', 'bigpush', 'w4llb4ng', 'kxng_'].forEach((name, k) => { const i = 20 + k, O = LOOK_OPTIONS; let a = hash(i + 7); const L = randomLook(() => ((a = hash(a)) % 1000) / 1000); L.hoodie = O.hoodie[(k * 3 + 2) % O.hoodie.length]; L.style = O.style[(k + 1) % O.style.length]; peers.set('npcin' + k, { id: 'npcin' + k, npc: true, inside: true, name, look: L, here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, tv: 0 }); });
  // 5 muses (owner): one of each colour, wandering the districts and the game pads with the townsfolk
  ['mochi', 'puff', 'bao', 'kiwi', 'sunny'].forEach((name, k) => { const i = 40 + k; peers.set('npc' + i, { id: 'npc' + i, npc: true, name, body: 'muse', vcolor: ['cream', 'pink', 'blue', 'mint', 'yellow'][k % 5], here: false, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, tv: 0 }); });
  function stepCafeNpcs(onFloor) {
    const now = Date.now() / 1000, P = 36, front = (rows - 1) * ROW_D, aisle = front + 2.2;
    const spots = [[room?.launchSpot?.x ?? 1, (room?.launchSpot?.z ?? front + 1.6) + .9], room?.slotSpot ? [room.slotSpot.x, 1.95] : null, room?.diceSpot ? [room.diceSpot.x, room.diceSpot.z + 1.5] : null, ...[2, 5, 8, 11, 14].map((d) => [(room?.rowX0 ?? 0) + d * SP / 2.25, front + 2.6 + (d % 2) * .9]), [(room?.rowX0 ?? 0) + (PER_ROW + 1) * SP, 2], [(room?.rowX0 ?? 0) + (PER_ROW + 2.2) * SP, front - 2]].filter((p2) => p2 && walkable(p2[0], p2[1]) && walkable(p2[0], aisle));
    if (!spots.length) return;
    peers.forEach((p) => { if (!p.inside) return; p.here = onFloor; if (!onFloor) return; const k = +p.id.slice(5), seg = Math.floor(now / P), ph = now - seg * P;
      const A = spots[(hash((seg - 1) * 13 + 5) + k) % spots.length], Bt = spots[(hash(seg * 13 + 5) + k) % spots.length], off = (k - 1) * .7;
      const pts = [[A[0] + off, A[1]], [A[0] + off, aisle], [Bt[0] - off, aisle], [Bt[0] - off, Bt[1]]]; let tm = ph - 12 - (hash(k * 71) % 1000) / 1000 * 10, x = pts[0][0], z = pts[0][1], v = 0, h = Math.PI;
      if (tm > 0) { for (let j = 0; j < 3; j++) { const L2 = Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]) / (1.5 + (k % 3) * .3); if (tm <= L2) { const f = L2 ? tm / L2 : 1; x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f; z = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f; v = 1.5 + (k % 3) * .3; h = Math.atan2(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]); tm = -1; break; } tm -= L2; } if (tm >= 0) { [x, z] = pts[3]; } }
      if (!p.wasIn) { p.x = x; p.z = z; p.h = h; } p.wasIn = true; p.tx = x; p.tz = z; p.th = h; p.tv = v; p.tj = 0; p.td = 0; });
  }
  // one Muse plush that watches over DUVAL (owner): outside it trails him a step behind and to the side, facing him;
  // in the cafe it waits by his desk
  const MUSE_LINES = ['gm duval', 'watching the charts with you', 'you sure about this one?', 'nice entry', 'that stop loss tho', 'just here for moral support', 'zucc approves', 'proud of you duval', 'touch grass after this?', 'i see everything', 'one more scan?', 'stay safe out there', 'the vibes are good today', 'duval never sleeps', 'musebot reporting for duty'];
  let museTalkAt = performance.now() + 8000;
  function stepMuse() {
    const p = peers.get('npcmuse'); if (!p) return; let tx = null, tz = null, face = null;
    if (p.here && performance.now() > museTalkAt) { const text = MUSE_LINES[Math.floor(Math.random() * MUSE_LINES.length)]; p.say = { text, until: performance.now() + 5000 + text.length * 60 }; museTalkAt = performance.now() + 20000 + Math.random() * 25000; }
    if (where === 'out') { const fa = [...agentMap].find(([d]) => d.name === 'DUVAL')?.[1]; if (fa?.root?.visible) { const hd = fa.heading || 0; tx = fa.pos.x - Math.sin(hd) * 1.5 + Math.cos(hd) * .9; tz = fa.pos.y - Math.cos(hd) * 1.5 - Math.sin(hd) * .9; face = [fa.pos.x, fa.pos.y]; } }
    else if (where === 'in' && !level) { const sl = slots.find((x) => x.a?.name === 'DUVAL'); if (sl) { tx = sl.x + 1.15; tz = sl.z + .95; face = [sl.x, sl.z]; } }
    if (tx == null) { p.here = false; return; }
    const d = Math.hypot(tx - p.tx, tz - p.tz); if (!p.here) { p.x = tx; p.z = tz; }
    p.here = true; p.tv = d > .05 ? 2 : 0; p.tx = tx; p.tz = tz;
    // standing still he turns to whoever is looking (the camera), so you see his face; on the move he faces DUVAL
    const cam = stageOf(where).camera.position, still = Math.hypot(p.x - tx, p.z - tz) < .25;
    p.th = still ? Math.atan2(cam.x - tx, cam.z - tz) : Math.atan2(face[0] - tx, face[1] - tz); p.tj = 0; p.td = 0;
  }
  function stepNpcs(room) {
    const now = Date.now() / 1000, P = 50;
    peers.forEach((p) => { if (!p.npc || p.inside || p.id === 'npcmuse') return; let i = +p.id.slice(3), seg = Math.floor((now + (i % 4) * 4.2) / P), ph = (now + (i % 4) * 4.2) - seg * P, hs = hash(seg * 31 + i * 7);
      const zn = NPC_ZONES[i % 4], pads = (world?.minigames || []).filter((m) => m.zone === zn && m.spot), sp = pads.length ? pads.map((m) => [m.spot.x, m.spot.z]).concat(NPC_SPOTS[zn].slice(0, 2)) : NPC_SPOTS[zn], rank = Math.floor(i / 4), pick = (sg, k2) => sp[(hash(sg * 31 + (i % 4) * 7 + k2) + rank) % sp.length], A = pick(seg, 0), Bp = pick(seg, 3), Prev = pick(seg - 1, 3);
      // owner: never despawn. Each one lives in its own district for good and walks on from where it last stood
      // each one keeps its own place round the pad (golden-angle spread), so nobody stands on top of anybody
      const ang = i * 2.39996, rad = pads.length ? 1.05 + (i % 3) * .35 : 1.4, ox = Math.sin(ang) * rad, oz = Math.cos(ang) * rad * .8;
      const G0 = [Prev[0] - oz, Prev[1] + ox], pts = [G0, [A[0] + ox, A[1] + oz], [Bp[0] - oz, Bp[1] + ox]], spd = 1.7 + (hash(i * 31) % 100) / 100 * .9, wait = (hash(i * 97) % 1000) / 1000 * 9, legs = [Math.hypot(pts[1][0] - G0[0], pts[1][1] - G0[1]) / spd, 12 + (hash(i * 53) % 1000) / 1000 * 8, Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]) / spd];
      // each one sets off on its own beat: a personal start delay, pace and pause (owner: not in tandem)
      ph -= wait; if (ph < 0) ph = -1;
      let x = pts[2][0], z = pts[2][1], v = 0, h = p.th; const lerp2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      if (ph < 0) { [x, z] = G0; h = Math.atan2(Prev[0] - x, Prev[1] - z); }
      else if (ph < legs[0]) { [x, z] = lerp2(pts[0], pts[1], ph / legs[0]); v = spd; h = Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]); }
      else if (ph < legs[0] + legs[1]) { [x, z] = pts[1]; h = Math.atan2(A[0] - x, A[1] - z); }
      else if (ph < legs[0] + legs[1] + legs[2]) { [x, z] = lerp2(pts[1], pts[2], (ph - legs[0] - legs[1]) / legs[2]); v = spd; h = Math.atan2(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]); }
      else h = Math.atan2(Bp[0] - x, Bp[1] - z);
      const hop = v === 0 && hash(Math.floor(now * 1.5) + i * 13) % 23 === 0 ? .35 : 0;
      const was = p.here; p.here = room === zn; if (p.here && !was) { p.x = x; p.z = z; p.h = h; } p.tx = x; p.tz = z; p.th = h; p.tv = v; p.tj = hop; p.td = 0; });
  }
  function stepPeers(t, dt) {
    const scene = sceneOf(where), s = scaleHere(), k = Math.min(1, dt * 10);
    stepNpcs(where === 'out' ? zone.now : ''); stepCafeNpcs(where === 'in' && !level); stepMuse(); peers.forEach((p) => { if (p.inside && where !== 'in') p.wasIn = false; });
    if (!busy) live?.at(where === 'in' ? levelRoom() : where === 'out' && zone.now !== 'town' ? zone.now : where, player.x, player.z, player.heading, Math.hypot(player.vx, player.vz), player.jy, player.ducking ? 1 : 0); // each district is its own presence room
    // draw at most the 30 nearest other players (the rest are still there, just not drawn this moment)
    if ((peerSortN = (peerSortN + 1) % 15) === 0) { const near = [...peers.values()].filter((p) => p.here).sort((a, b) => Math.hypot(a.tx - player.x, a.tz - player.z) - Math.hypot(b.tx - player.x, b.tz - player.z)); peerShown = new Set(near.slice(0, 30)); }
    peers.forEach((p) => {
      if (!p.here || !scene || busy || !peerShown.has(p)) { if (p.root) p.root.visible = false; return; }
      if (!p.root || p.rootW !== where) { dropRoot(p); p.root = p.body && p.body !== 'person' ? buildVisitor(p.body, p.vcolor || p.look?.hoodie) : buildPerson(p.look, { lite: true }); castShadows(p.root, false, false); scene.add(p.root); p.rootW = where; }
      const u = p.root.userData.creature;
      if (Math.hypot(p.tx - p.x, p.tz - p.z) > 4) { p.x = p.tx; p.z = p.tz; } else { p.x = lerp(p.x, p.tx, k); p.z = lerp(p.z, p.tz, k); }
      p.h = turn(p.h, p.th, dt * 9);
      u.walk = lerp(u.walk, p.tv > .15 ? clamp(p.tv / 3.3, .7, 1.45) : 0, Math.min(1, dt * 8));
      if (p.tv > .15) u.walkPhase += dt * Math.min(u.strideFor ? p.tv / (u.strideFor(Math.max(.7, u.walk)) * s) : p.tv * 3.1, 26);
      p.jy = lerp(p.jy || 0, p.tj || 0, Math.min(1, dt * 18)); p.dk = lerp(p.dk || 0, p.td ? 1 : 0, Math.min(1, dt * 14)); const sq = p.dk * .28;
      p.root.position.set(p.x, p.jy, p.z); p.root.rotation.y = p.h; p.root.scale.set(s * (1 + sq * .45), s * (1 - sq), s * (1 + sq * .45)); p.root.visible = true;
      u.update(t, dt); u.view?.(stageOf(where).camera.position, p.root.position, p.h);
    });
  }

  // ---------------------------------------------------------------- inside the cyber cafe
  // ---- the lift between levels, at the end of the front row
  let lift = null, liftSign = null;
  function buildLift(scene) {
    const g = new THREE.Group(), std = (c, r = .5, m = .3) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const box = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); g.add(o); return o; };
    const frame = std('#2a2238'), steel = std('#8b86a0', .35, .7), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#b59cff').multiplyScalar(1.1) });
    box(1.9, 2.9, .5, frame, 0, 1.45, 0); box(.78, 2.3, .04, steel, -.4, 1.18, .26); box(.78, 2.3, .04, steel, .4, 1.18, .26); // the shaft and two doors
    box(1.62, .03, .03, glow, 0, 2.36, .27); box(.03, 2.34, .03, glow, -.81, 1.18, .27); box(.03, 2.34, .03, glow, .81, 1.18, .27); // a lit outline
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .4), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); sign.position.set(0, 2.66, .26); g.add(sign);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#9b7cf0', transparent: true, opacity: .1, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, .012, .9); g.add(pool);
    scene.add(g); liftSign = { c, t, key: '' }; return g;
  }
  function placeLift() {
    if (!lift) return;
    lift.visible = levels > 1;
    lift.position.set((room.rowX0 ?? 0) + (PER_ROW - 1) * SP + 2.7, 0, (rows - 1) * ROW_D + .4); // right of the front row's last desk
    updateFloors();
    const key = `${level}/${levels}`; if (liftSign.key === key) return; liftSign.key = key;
    const x = liftSign.c.getContext('2d'); x.fillStyle = '#160f28'; x.fillRect(0, 0, 512, 128); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#c9b6ff'; x.font = '700 50px Fredoka, system-ui, sans-serif';
    x.fillText(level < levels - 1 ? `▲ LEVEL ${level + 1}` : '▼ GROUND', 256, 50);
    x.fillStyle = '#8f84b8'; x.font = '500 26px Fredoka, system-ui, sans-serif'; x.fillText(level ? `you are on level ${level}` : 'you are on the ground floor', 256, 100);
    liftSign.t.needsUpdate = true;
  }
  async function changeLevel(to) {
    if (busy) return; busy = true; target = null; keys.clear(); dlg = null; dlgEl.hidden = true; promptEl.hidden = true; coinEl.hidden = true;
    fadeEl.style.opacity = 1; await wait(320);
    level = to; seated = false; syncTubes(); placeLift();
    player.x = lift.position.x; player.z = lift.position.z + 1.3; player.heading = 0; followCam = null; peers.forEach((p) => { p.here = false; });
    q('.g-where').textContent = placeName('in');
    await wait(60); fadeEl.style.opacity = 0; await wait(200); busy = false;
  }
  function buildInside() {
    // a cosy late-night net cafe in the player's lavender: dim light and almost no bloom (no halos), the monitors'
    // thin rims are the only glow that asks for attention
    inS = new Stage(cvIn, { fov: 36, cam: [0, 3.4, 10.4], look: [0, 1.2, 0], dpr: narrow ? 1.25 : 1.5, env: .45, clear: '#1f3a44', exposure: 1.24, tone: 'neutral', ao: null }); // no bloom pass: it was nearly invisible here and doubled the rendering work
    inS.game = true; inS.suspended = true;
    inS.lights('#fff4ea', '#6a5878', .75, .9);
    room = buildLabRoom(inS.scene, { interior: true });
    lift = buildLift(inS.scene);
    // the street door is in the room's left wall (room.door); walking left through it takes you outside
    player.roots.in = makePlayer(inS.scene);
    inS.onFrame = stepInside;
  }
  // the agents sit in rows of booths from room.rowX0: PER_ROW to a row, at least MIN_ROWS rows, more as agents join.
  // Row 0 stands against the back wall; each new row is ROW_D nearer the camera, with an aisle in front of every row.
  // Agents fill the front row first (the one you walk along first); free seats fill the rest.
  // the cafe has levels: 32 desks (4 rows of 8) a floor, bonded agents first on the ground floor; a lift at the end of
  // the front row goes up and down. Each level draws only its own agents and players, so it stays smooth.
  const PER_ROW = 8, MIN_ROWS = 4, SPARE_ROWS = 0, ROW_D = 3.6, PER_LEVEL = 32, OPEN_AHEAD = 2, free = []; // a new, empty floor opens once the top floor is down to its last OPEN_AHEAD seats
  let level = 0, levels = 1;
  const levelRoom = () => (level ? 'in' + 'abcdefghij'[level - 1] : 'in'); // presence room for this level
  let rows = MIN_ROWS;
  const seatAt = (i) => { const r = rows - 1 - Math.floor(i / PER_ROW); return { x: (room.rowX0 ?? 0) + (i % PER_ROW) * SP, z: r * ROW_D }; };
  // where you can stand: the open floor left of the rows (door, launch booth), the corridor right of them, and the
  // aisle in front of each row
  function walkable(x, z) {
    const B = room.bounds, front = (rows - 1) * ROW_D;
    if (z < B.minZ || z > front + B.maxZ) return false;
    const xL = (room.rowX0 ?? 0) - SP / 2 - .25, xR = (room.rowX0 ?? 0) + (PER_ROW - .5) * SP + .25;
    const ks = room.launchSpot; if (ks && Math.abs(x - ks.x) < 1.2 && z > ks.z - 2.7 && z < ks.z - .55) return false; // the launch booth itself
    if (lift?.visible && Math.abs(x - lift.position.x) < .95 && Math.abs(z - lift.position.z) < .45) return false; // the lift
    const dt = room.diceSpot; if (dt && Math.hypot((x - dt.x) / 1.05, (z - dt.z) / .78) < 1.25) return false; // the dice table
    if (x < xL || x > xR) return true;
    const r = Math.floor(z / ROW_D), off = z - r * ROW_D; // r: the row whose aisle this would be
    return r >= rows - 1 ? z >= front + B.minZ : off >= B.minZ && off <= ROW_D - 1.2;
  }
  let seated = false, spawnZ = null, seenLevels = 0;
  function syncTubes() {
    const all = labAgents().slice().sort((x, y) => (y.bonded ? 1 : 0) - (x.bonded ? 1 : 0)); levels = Math.floor((all.length + OPEN_AHEAD) / PER_LEVEL) + 1; if (level > levels - 1) level = levels - 1;
    const list = all.slice(level * PER_LEVEL, (level + 1) * PER_LEVEL);
    if (seated && seenLevels === levels && slots.length === list.length && slots.every((s, i) => s.a === list[i])) return;
    seated = true; seenLevels = levels; // a new floor opening also refreshes the lift and floor buttons
    rows = Math.max(MIN_ROWS, Math.ceil(list.length / PER_ROW) + SPARE_ROWS); placeLift(); q('.g-where').textContent = placeName(where);
    // the agents arrived after you did and the cafe grew: if you haven't moved yet, start at the new front row
    if (spawnZ != null && where === 'in' && Math.hypot(player.x - 1.9, player.z - spawnZ) < .6) { player.z = spawnZ = (rows - 1) * ROW_D + 2.4; followCam = null; }
    slots.splice(0).forEach((s) => { s.tube.setCreature(null); inS.scene.remove(s.tube.grp); });
    free.splice(0).forEach((tb) => inS.scene.remove(tb.grp));
    list.forEach((a, i) => {
      const tube = buildTube({ finish: 'dark', fluid: brainOf(a.brain).fluid, floorGlow: true });
      const at = seatAt(i); tube.grp.position.set(at.x, 0, at.z); inS.scene.add(tube.grp);
      const c = fillTube(tube, genesOf(a), { evo: a.bond }); c.userData.pop = 1; tube.flash = 0; tube.boost = 0; tube.setLevel(levelOf(a.bond), true);
      const slot = { a, tube, x: at.x, z: at.z }; slots.push(slot);
      if (isOut(a)) { slot.away = true; slot.held = tube.creature; tube.creature?.parent?.remove(tube.creature); tube.creature = null; } // out in the street: its chair is empty
      // demo: sample agents' computers play recorded real browsing sessions
      if (!a.pipId) demoSessions().then((l) => { const d = l.length && l[i % l.length]; if (d) { slot.demo = d; tube.setBrowser?.(d.frames); } });
    });
    const seats = rows * PER_ROW;
    for (let i = list.length; i < seats; i++) { // empty seats waiting for new agents
      const tb = buildTube({ finish: 'dark', fluid: ['#86b3ff', '#ff8bb3', '#62e6cf', '#b993ff', '#ffb36b'][i % 5], lite: true });
      const at = seatAt(i); tb.grp.position.set(at.x, 0, at.z); tb.setIdle?.(true); tb.setLevel(0, true); tb.flash = 0; tb.boost = 0; inS.scene.add(tb.grp); free.push(tb);
    }
    room.setRowEnd?.((room.rowX0 ?? 0) + (PER_ROW - 1) * SP);
    room.setFrontZ?.((rows - 1) * ROW_D);
    inS.tubes = backTubes.concat(free, slots.map((s) => s.tube));
    inS.warm();
  }

  // ---------------------------------------------------------------- outside in the world
  function buildOutside() {
    const isMobile = matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    outS = new Stage(cvOut, {
      fov: 52,
      cam: [0, 6.2, 16.5],
      look: [0, 1.0, 0],
      dpr: isMobile ? 1.25 : 1.5,
      env: .35,
      clear: '#0b0816',
      exposure: .94,
      tone: 'neutral',
      ao: null,
      shadows: !isMobile,
      bloom: !isMobile,
      bloomThreshold: .95,
      bloomStrength: .3
    });
    outS.game = true; outS.suspended = true;
    world = buildWorld(outS.scene, { shadows: !isMobile, seed: 7 }); if (window.AA_TEST) Object.assign(window.AA_TEST, { world, player, cafe: () => room }); // test hooks (only when a test page sets AA_TEST)
    world.setFog(70, 260); world.setTime(0); // authentic cyberpunk atmosphere matching attentionagents.fun
    world.onAct = (fa, id) => (fa.data?.pipId ? realAct(fa, id) : onAct ? onAct(fa, id) : null); world.onBaby = onBaby; // real agents show what they really did, never the sample simulator

    // Initialize Global Continuous Collision System with all world obstacles
    globalCollision.clear();
    globalCollision.loadFromCollisionData(collisionData);
    globalCollision.loadLivingWorldObstacles();
    globalCollision.loadLegacyObstacles(world.obstacles);

    player.roots.out = makePlayer(world.group);
    syncAgents();
    world.refreshText();
    const list = worldAgents();
    if (list.length) { world.showAd(list[0], 'An agent with its own wallet'); const b = list[1] || list[0]; world.showPost(b, b.log?.[0]?.text || 'gm from the world'); }
    outS.onFrame = stepOutside;

    const playerAdapter = {
      get x() { return player.x; },
      set x(v) { player.x = v; },
      get y() { return player.y || 0; },
      set y(v) { player.y = v; },
      get z() { return player.z; },
      set z(v) { player.z = v; },
      get heading() { return player.heading; },
      set heading(v) { player.heading = v; },
      get avatar() { return { name: (live && shownName) || myName || 'Alex' }; },
      get position() {
        return {
          x: player.x,
          y: player.y || 0,
          z: player.z,
          clone() { return new THREE.Vector3(player.x, player.y || 0, player.z); }
        };
      },
      velocity: { x: 0, y: 0, z: 0 },
      teleport(x, y, z) {
        player.x = x;
        player.y = y;
        player.z = z;
        lastOk.x = x;
        lastOk.z = z;
        followCam = null;
        followLook = null;
      }
    };

    livingWorld = new LivingWorld(outS.scene, playerAdapter, {
      onOpenGame: (gameId) => {
        if (gameId === 'hotpotato') {
          hotPotatoGame?.startMatch();
        } else if (gameId === 'coincatcher') {
          coinCatcherGame?.startMatch();
        } else if (gameId === 'rooftoprun') {
          rooftopRunGame?.startMatch();
        }
      }
    });

    hotPotatoGame = new HotPotatoGame(outS.scene, playerAdapter, (res) => {
      say('Hot Potato', '#ff3838', `Match finished! Winner: ${res.winner}`);
    });

    coinCatcherGame = new CoinCatcherGame(outS.scene, playerAdapter, (res) => {
      say('Coin Catcher', '#ffd166', `Finished with score: ${res.score}`);
    });

    rooftopRunGame = new RooftopRunGame(outS.scene, playerAdapter, (res) => {
      say('Rooftop Run', '#38bdf8', `Finished course in ${res.score}!`);
    });

    // Keep world stations and full authentic cyber cafe visible
    outS.warm();

    // Hide old crypto top bar and help prompts
    try {
      const oldHud = document.querySelector('.g-hud');
      if (oldHud) oldHud.style.display = 'none';
      const oldTop = document.querySelector('.g-top');
      if (oldTop) oldTop.style.display = 'none';
      const oldHelp = document.querySelector('.g-help');
      if (oldHelp) oldHelp.style.display = 'none';
      const oldPrompt = document.querySelector('.g-prompt');
      if (oldPrompt) oldPrompt.style.display = 'none';
      const oldChat = document.querySelector('.g-chat');
      if (oldChat) oldChat.style.display = 'none';
      const oldFab = document.querySelector('.g-jobfab');
      if (oldFab) oldFab.style.display = 'flex';
    } catch {}

    outS.warm();
  }
  function syncAgents() {
    // Suppress legacy blob agents (NetKid, Dumpling, Ooze) from spawning in modern world
    return;
  }
  // ---- bonded agents roam: each spends part of every 6 minutes outside in the street and the rest at its desk, on a
  // clock everyone shares (so every visitor sees the same agent out at the same time). Its PC keeps working while it's out.
  const ROAM_S = 360, OUT_S = 210; let roamT = 0;
  const roamPhase = (a) => [...String(a.pipId || a.name)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % ROAM_S;
  const isOut = (a) => !!a.bonded && (Date.now() / 1000 + roamPhase(a)) % ROAM_S < OUT_S;
  const roamingOut = () => labAgents().filter(isOut);
  function stepRoamers(t) { // in the cafe: hop off the chair and walk out along the row, or come back and sit down
    for (const s of slots) {
      if (!s.a?.bonded) continue;
      const out = isOut(s.a), tb = s.tube;
      if (out && !s.away) {
        if (tb.mode) continue; // try again next frame
        s.away = true;
        if (tb.creature) { tb.exitDir = 1; tb.breakoutLen = 3.4; tb.breakout((root) => { if (root) { root.parent?.remove(root); s.held = root; } }); }
      } else if (out && s.away && tb.creature && !tb.mode) { s.held = tb.creature; tb.creature.parent?.remove(tb.creature); tb.creature = null; // never sit at the desk while out
      } else if (!out && s.away && !tb.mode) {
        s.away = false;
        if (s.held && !tb.creature) { s.held.userData.free = false; tb.setCreature(s.held); s.held = null; const u = tb.creature?.userData.creature; if (u) u.poke = 1; tb.flash = 1; }
      }
    }
  }

  // ---------------------------------------------------------------- inside the halls: the studio, market, vault and quest board
  // the Agents whose work fills them: bonded Agents first, then the ones closest to bonding
  function artists() {
    const all = [...new Set([...worldAgents(), ...labAgents()])];
    return all.sort((a, b) => (b.bonded ? 1 : 0) - (a.bonded ? 1 : 0) || (b.bond || 0) - (a.bond || 0)).slice(0, 9);
  }
  async function enterHall(kind) {
    if (!hallS) {
      hallS = new Stage(cvHall, { fov: 36, cam: [0, 2.7, 7.6], look: [0, 1.5, -1.5], dpr: narrow ? 1.25 : 1.5, env: .3, clear: '#f3e8d6' });
      hallS.game = true; hallS.suspended = true;
      hallS.lights('#fff6e8', '#d9c7aa', 1.05, 1.25);
      player.roots.hall = makePlayer(hallS.scene);
      hallS.onFrame = stepHall;
    }
    // the quest hall shows live quests: real progress for real agents, fetched fresh (rebuilt if older than a minute)
    if ((kind === 'board' || kind === 'market' || kind === 'vault') && halls[kind] && Date.now() - (halls[kind].at || 0) > 60_000) { hallS.scene.remove(halls[kind].group); delete halls[kind]; } // live halls refresh every minute
    if (kind === 'market' || kind === 'vault') { try { const list = await fetch((window.AA_API || '') + '/api/market').then((r) => r.json()); const by = new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x])); for (const a of artists()) if (a.pipId && by.has(a.pipId)) a.market = by.get(a.pipId); } catch { /* sample stalls */ } }
    if (kind === 'board') { try { const list = await fetch((window.AA_API || '') + '/api/quests').then((r) => r.json()); const by = new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x])); for (const a of artists()) if (a.pipId && by.has(a.pipId)) a.quests = by.get(a.pipId); } catch { /* sample cards */ } }
    if (!halls[kind]) { halls[kind] = await buildHall(kind, artists()); halls[kind].at = Date.now(); hallS.scene.add(halls[kind].group); hallS.warm(); }
    for (const [k, h] of Object.entries(halls)) h.group.visible = k === kind;
    hall = halls[kind]; hallS.renderer.setClearColor(hall.clear, 1);
  }
  function stepHall(t, dt) {
    movePlayer(dt);
    if (player.x < LEFT_X + .75 && player.vx < -.2 && !busy && !dlg) go('out');
    player.x = clamp(player.x, LEFT_X + .6, hall.right - .7); player.z = clamp(player.z, WALL_Z + 1.45 + (hall.front || 0), 3);
    placeRoot(); player.roots.hall.userData.creature.update(t, dt); hall.update(t, dt);
    player.roots.hall.visible = !viewing; // the close-up looks past where you stand
    // follow along the wall; when you look at a piece, the camera steps up to it, high enough to see over you
    // a phone sees less of the wall, so the camera stands further back and higher, and keeps the player in view
    const v = viewing, k = clamp(1 - hallS.camera.aspect, 0, .6), camZ = 5.9 + k * 7, camY = 2.45 + k * 1.4;
    const hw = Math.min(2.9, (camZ - WALL_Z) * Math.tan(THREE.MathUtils.degToRad(hallS.camera.fov / 2)) * hallS.camera.aspect - .2);
    const cx = clamp(player.x, LEFT_X + hw, Math.max(LEFT_X + hw, hall.right - hw));
    const want = styling ? new THREE.Vector3(player.x + .75, 1.15, player.z + 2.9) : v ? new THREE.Vector3(v.view.pos[0], v.view.pos[1], v.view.pos[2] + k * 3) : new THREE.Vector3(cx, camY, camZ);
    const aim = styling ? new THREE.Vector3(player.x - .25, .72, player.z) : v ? new THREE.Vector3(...v.view.look) : new THREE.Vector3(cx, 1.45, -1.8);
    followCam ??= want.clone(); followLook ??= aim.clone();
    followCam.lerp(want, Math.min(1, dt * 3.2)); followLook.lerp(aim, Math.min(1, dt * 3.2));
    hallS.camera.position.copy(followCam); hallS.camera.lookAt(followLook);
    window.AA_CAM?.(where, stageOf(where).camera, player, t); // trailer only (window.AA_TRAILER): a scripted camera
    hud(t, dt);
  }

  // ---------------------------------------------------------------- moving the player
  function inputVector() {
    let x = 0, z = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
    if (stick.on && stick.moved > 6) { x = stick.x; z = stick.y; }
    if ((where === 'out' || where === 'in') && orbit.yaw && (x || z)) { const c = Math.cos(orbit.yaw), sn = Math.sin(orbit.yaw); [x, z] = [x * c + z * sn, -x * sn + z * c]; } // W walks away from the camera, whichever way it faces
    if (x || z) { target = null; const l = Math.hypot(x, z); return l > 1 ? [x / l, z / l] : [x, z]; }
    if (target) {
      const tx = target.fa ? target.fa.pos.x : target.x, tz = target.fa ? target.fa.pos.y : target.z, dx = tx - player.x, dz = tz - player.z, d = Math.hypot(dx, dz);
      if (d < (target.fa ? 1.25 : .18)) { const t = target; target = null; if (t.fa) interact({ kind: 'agent', fa: t.fa }); return [0, 0]; }
      return [dx / d, dz / d];
    }
    return [0, 0];
  }
  function movePlayer(dt) {
    const [ix, iz] = dlg || styling ? [0, 0] : inputVector();
    player.ducking = keys.has('KeyQ') || duckBtn?.classList.contains('on');
    player.duck = lerp(player.duck, player.ducking && player.jy < .01 ? 1 : 0, Math.min(1, dt * 14));
    if (player.jy > 0 || player.jv > 0) { player.jv -= 19 * dt; player.jy = Math.max(0, player.jy + player.jv * dt); if (player.jy === 0) { player.jv = 0; player.land = 1; } }
    player.land = Math.max(0, player.land - dt * 5);
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.525 : 4.5) * (1 - player.duck * .55);
    player.vx = lerp(player.vx, ix * speed, Math.min(1, dt * 14)); player.vz = lerp(player.vz, iz * speed, Math.min(1, dt * 14));
    
    // Continuous Move-and-Slide collision resolution for buttery-smooth movement without tunneling
    let v;
    if (where === 'out' && !hotPotatoGame?.isActive && !coinCatcherGame?.isActive && !rooftopRunGame?.isActive) {
      v = globalCollision.moveAndSlide(player, dt);
    } else {
      player.x += player.vx * dt;
      player.z += player.vz * dt;
      v = Math.hypot(player.vx, player.vz);
    }

    const root = player.roots[rootKey(where)], u = root.userData.creature;
    if (Math.hypot(player.vx, player.vz) > .15) player.heading = turn(player.heading, Math.atan2(player.vx, player.vz), dt * 12);
    else if (styling) player.heading = turn(player.heading, -.35, dt * 5);
    // a longer stride as you speed up; the cadence comes from how far the planted foot travels per radian of
    // phase (u.strideFor), capped so short legs stay readable, which lets the feet slip a little at a run
    u.walk = lerp(u.walk, v > .15 ? clamp(v / 4.5, .7, 1.45) : 0, Math.min(1, dt * 10));
    if (v > .15) u.walkPhase += dt * Math.min(u.strideFor ? v / (u.strideFor(Math.max(.7, u.walk)) * root.scale.x) : v * 3.1, 26);
    return v;
  }
  const scaleHere = () => (where === 'out' ? player.scale : .95);
  function placeRoot() {
    const r = player.roots[rootKey(where)], s = scaleHere(), sq = player.duck * .28 + player.land * .16, st = player.jy > 0 ? clamp(player.jv * .02, -.06, .1) : 0;
    r.position.set(player.x, (player.y || 0) + player.jy, player.z); r.rotation.y = player.heading; r.scale.set(s * (1 + sq * .45 - st * .5), s * (1 - sq + st), s * (1 + sq * .45 - st * .5));
  }

  // real agents' monitors play their latest real browsing session (the same frames their screen view shows); the
  // booths near the camera are refreshed every few seconds, a session only replaces the old one when it is new
  let screensAt = -99, screensBusy = false;
  const sessionOf = (frames) => { const out = []; for (const f of frames || []) { out.push(f); if (f.step === 0) break; } return out.reverse(); };
  // real market numbers for every live agent (coin cards, chips, leaderboard): one cached request every 30 s
  let marketAt = -99, marketBy = new Map();
  function pollMarket(t) {
    if (t - marketAt < 30) return; marketAt = t;
    fetch((window.AA_API || '') + '/api/market').then((r) => r.json()).then((list) => { marketBy = new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x])); applyMarket(); }).catch(() => {});
  }
  function applyMarket() { for (const a of [...labAgents(), ...worldAgents()]) if (a.pipId && marketBy.has(a.pipId)) a.liveMarket = marketBy.get(a.pipId); } // agents that arrive after the fetch get theirs too
  // every live agent's trading desk, one cached request for all of them
  let desksAt = -99, desksBusy = false;
  function pollDesks(t) {
    if (desksBusy || t - desksAt < 10 || !slots.some((s) => s.a?.pipId)) return;
    desksAt = t; desksBusy = true;
    fetch((window.AA_API || '') + '/api/desks').then((r) => r.json()).then((list) => { const by = new Map((Array.isArray(list) ? list : []).map((d) => [d.id, d])); for (const s of slots) if (s.a?.pipId && by.has(s.a.pipId)) s.tube.setDesk?.(by.get(s.a.pipId)); }).catch(() => {}).finally(() => { desksBusy = false; });
  }
  function pollLiveScreens(t) {
    if (screensBusy || t - screensAt < 5) return;
    screensAt = t; screensBusy = true;
    const near = slots.filter((s) => s.a?.pipId && Math.abs(s.x - player.x) < SP * 7 && Math.abs((s.z ?? 0) - player.z) < 12).slice(0, 10);
    Promise.all(near.map(async (s) => {
      try {
        const j = await fetch(`${window.AA_API || ''}/api/agents/${s.a.pipId}/screens`).then((r) => r.json()), sess = sessionOf(j.frames).map((f) => ({ ...f, img: (window.AA_API || '') + f.img })), key = sess.map((f) => f.id ?? f.img).join(',');
        if (sess.length && key !== s.screenKey) { s.screenKey = key; s.tube.setBrowser?.(sess); }
      } catch { /* next round */ }
    })).finally(() => { screensBusy = false; });
  }
  function stepInside(t, dt) {
    syncTubes();
    // hovering a monitor brightens its rim (and shows a pointer), so people see the screens are clickable
    if (!inS.hov) { const h = inS.hov = { x: 0, y: 0, on: false, n: 0, ray: new THREE.Raycaster(), v: new THREE.Vector2() }; cvIn.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = cvIn.getBoundingClientRect(); h.x = ((e.clientX - r.left) / r.width) * 2 - 1; h.y = -((e.clientY - r.top) / r.height) * 2 + 1; h.on = true; }); cvIn.addEventListener('pointerleave', () => { h.on = false; }); }
    if ((inS.hov.n = (inS.hov.n + 1) % 4) === 0) {
      const h = inS.hov, mons = slots.map((s) => s.tube.mon).filter(Boolean); let over = null;
      if (h.on && mons.length) { h.ray.setFromCamera(h.v.set(h.x, h.y), inS.camera); const hit = h.ray.intersectObjects(mons, true)[0]; if (hit) over = slots.find((s) => { let o = hit.object; while (o) { if (o === s.tube.mon) return true; o = o.parent; } return false; }); }
      slots.forEach((s) => s.tube.setHover?.(s === over)); cvIn.style.cursor = over ? 'pointer' : '';
    }
    const px = player.x, pz = player.z;
    movePlayer(dt);
    const B = room.bounds;
    if (player.x < B.exitX && player.vx < -.2 && Math.abs(player.z - room.door.z) < 1.4 && !busy && !dlg) { go('out'); }
    player.x = clamp(player.x, B.minX, B.maxX);
    // slide along the booths: keep whichever axis of the move is still walkable
    if (!walkable(player.x, player.z)) { if (walkable(player.x, pz)) player.z = pz; else if (walkable(px, player.z)) player.x = px; else { player.x = px; player.z = pz; } }
    placeRoot(); player.roots.in.userData.creature.update(t, dt);
    slots.forEach((s) => { const a = s.a, tb = s.tube; tb.setLevel(levelOf(a.bond)); tb.awake = !a.asleep; tb.setEvo(a.bond); tb.setScreen(a.name.slice(0, 8), a.bonded ? 'BONDED' : Math.floor(a.bond * 100) + '%'); });
    const ls = room.launchSpot; room.launchPulse?.(!!ls && Math.hypot(player.x - ls.x, player.z - ls.z) < 1.6);
    room.update(t);
    pollLiveScreens(t); pollDesks(t); stepRoamers(t);
    // only the screens on camera and within ~16 m redraw (the rest keep their last picture)
    if ((inS.seenN = (inS.seenN || 0) + 1) % 6 === 0) {
      const fr = inS.fr ||= new THREE.Frustum(), m4 = inS.m4 ||= new THREE.Matrix4(), sph = inS.sph ||= new THREE.Sphere(new THREE.Vector3(), 1.6);
      inS.camera.updateMatrixWorld(); fr.setFromProjectionMatrix(m4.multiplyMatrices(inS.camera.projectionMatrix, inS.camera.matrixWorldInverse));
      for (const tb of inS.tubes) { tb.grp.getWorldPosition(sph.center); tb.seen = sph.center.distanceTo(inS.camera.position) < 16 && fr.intersectsSphere(sph); }
    }
    // follow along the room a little above and behind; a portrait screen sees less, so the camera steps back and up
    const c = inS.camera, k = clamp(1 - c.aspect, 0, .6), cx = clamp(player.x, room.camMinX, room.camMaxX);
    { const ok = Math.min(1, dt * 8); orbit.yaw = lerp(orbit.yaw, orbit.tyaw, ok); orbit.pitch = lerp(orbit.pitch, orbit.tpitch, ok); orbit.dist = lerp(orbit.dist, orbit.tdist, ok); }
    // inside, the drag swivels the view a little round the player (the room is narrow, so it's held to ±40°)
    const iy = clamp(orbit.yaw, -.7, .7), back = (6.4 + k * 6) * (orbit.dist / 12.2), up = (3.6 + k * 1.6) * (.6 + orbit.pitch * 1.2);
    const want = styling ? new THREE.Vector3(player.x + .75, 1.15, player.z + 2.9) : new THREE.Vector3(cx + Math.sin(iy) * back, up, player.z + Math.cos(iy) * back);
    followCam ??= want.clone(); followCam.lerp(want, Math.min(1, dt * (orbit.drag ? 12 : 3.2)));
    c.position.copy(followCam); if (styling) c.lookAt(followCam.x - .25, .72, player.z); else c.lookAt(cx - Math.sin(iy) * (9.4 + k * 5 - back), 1.15, player.z - Math.cos(iy) * (9.4 + k * 5 - back));
    window.AA_CAM?.(where, stageOf(where).camera, player, t); // trailer only (window.AA_TRAILER): a scripted camera
    hud(t, dt);
  }
  // ---- the street runs on real data: each bonded agent's desk (trades, positions, fee payouts), polled while outside
  const solS = (v) => (v == null ? '?' : v >= 1 ? v.toFixed(2) : v >= .01 ? v.toFixed(3) : v.toFixed(4));
  const agoS = (at) => { const m = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : Math.round(m / 60) + 'h ago'; };
  let outDesksAt = -99, outDesksBusy = false, payouts = [], payoutQ = [], payoutT = 0, lastFeeAt = 0, tickerAt = -99;
  function realAct(fa, id) {
    const a = fa.data, d = a.desk;
    if (id === 'market') {
      const tr = d?.trades?.find((x) => x.kind === 'trade' && Date.now() - new Date(x.at).getTime() < 6 * 3600e3);
      if (tr) { const sell = tr.side === 'sell'; return { sell, head: `${a.name} ${sell ? '▼ SELL' : '▲ BUY'}${tr.symbol ? ' $' + tr.symbol : ''}`, sub: `${tr.sol != null ? solS(tr.sol) + ' SOL · ' : ''}${agoS(tr.at)}`, text: tr.text.length > 110 ? tr.text.slice(0, 107) + '…' : tr.text }; }
      const pos = (d?.positions || []).filter((p) => p.pnlPct != null).sort((x, y) => Math.abs(y.pnlPct) - Math.abs(x.pnlPct))[0];
      if (pos) return { sell: pos.pnlPct < 0, head: `${a.name} HOLDING $${pos.symbol}`, sub: `${pos.pnlPct >= 0 ? '+' : ''}${pos.pnlPct}% · ${solS(pos.valueSol)} SOL`, text: `Checking my $${pos.symbol}: ${pos.pnlPct >= 0 ? 'up' : 'down'} ${Math.abs(pos.pnlPct)}% so far.` };
      const mc = a.liveMarket; return { head: `${a.name} WATCHING`, sub: mc?.mcapUsd ? `$${a.name} ${usd(mc.mcapUsd)}` : 'scanning the charts', text: 'Scanning the charts for my next trade.' };
    }
    if (id === 'launch') { const p = d?.trades?.find((x) => x.kind === 'pair'); return { text: p ? (p.text.length > 110 ? p.text.slice(0, 107) + '…' : p.text) + ` (${agoS(p.at)})` : 'Lining up my next launch.' }; }
    if (id === 'well') { const f = d?.trades?.find((x) => x.kind === 'fees'); return { text: f ? `My last payout: ${solS(f.sol)} SOL of creator fees, ${agoS(f.at)}.` : 'Waiting for my next creator-fee payout.' }; }
    if (id === 'vault') return { text: d ? `My treasury holds ${solS(d.walletSol)} SOL. Fees earned so far: ${solS(d.feesSol)} SOL.` : 'Checking my treasury.' };
    return { text: '' };
  }
  function pollStreet(t, dt) {
    if (tickerAt < t - 30) { tickerAt = t; // the market's LED ticker: the top real market caps, bonded first
      const items = labAgents().filter((a) => a.liveMarket?.mcapUsd).sort((x, y) => (y.bonded ? 1 : 0) - (x.bonded ? 1 : 0) || y.liveMarket.mcapUsd - x.liveMarket.mcapUsd).slice(0, 10)
        .map((a) => { const ch = a.liveMarket.change?.h1; return { t: '$' + a.name, v: `${usd(a.liveMarket.mcapUsd)}${ch != null ? ` ${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(0)}%` : ''}`, up: (ch ?? 0) >= 0 }; });
      if (items.length) world.setTicker(items);
      world.zoneApi.setIndex?.(labAgents().filter((a) => a.bonded && a.liveMarket?.mcapUsd).sort((x, y) => y.liveMarket.mcapUsd - x.liveMarket.mcapUsd).map((a) => ({ name: a.name, mc: a.liveMarket.mcapUsd, ch: a.liveMarket.change?.h1 })));
    }
    payoutQ.length = 0; // owner: no pop-ups out of the fountain
    if (outDesksBusy || t - outDesksAt < 15) return;
    outDesksAt = t; outDesksBusy = true;
    fetch((window.AA_API || '') + '/api/desks').then((r) => r.json()).then((list) => {
      const by = new Map((Array.isArray(list) ? list : []).map((d) => [d.id, d])), fresh = [];
      for (const a of labAgents()) {
        const d = a.pipId && by.get(a.pipId); if (!d) continue; a.desk = d; for (const f of d.trades || []) if (f.kind === 'fees' && f.sol) fresh.push({ a, f, at: new Date(f.at).getTime() });
        // a bonded agent out in the world reacts to its real desk: a new trade sends it to the market, a new launch to the launch pad
        const fa = agentMap.get(a), at = (k) => Math.max(0, ...(d.trades || []).filter((x) => x.kind === k).map((x) => new Date(x.at).getTime()));
        const tAt = at('trade'), pAt = at('pair'), seen = a.seenDesk;
        a.seenDesk = { trade: tAt, pair: pAt };
        if (fa?.visitor) { fa.launchedAt = pAt || null; if (seen && pAt > seen.pair) fa.nudge('launch'); else if (seen && tAt > seen.trade) fa.nudge('market'); }
      }
      fresh.sort((x, y) => y.at - x.at);
      payouts = fresh.slice(0, 6);
      const isNew = fresh.filter((x) => x.at > lastFeeAt).slice(0, 5);
      if (lastFeeAt) payoutQ.push(...isNew.reverse().map((x) => `+${solS(x.f.sol)} SOL → $${x.a.name}`)); // only payouts that happen while you watch
      else if (fresh[0]) payoutQ.push(`+${solS(fresh[0].f.sol)} SOL → $${fresh[0].a.name}`); // and the latest one when you arrive
      if (fresh[0]) lastFeeAt = Math.max(lastFeeAt, fresh[0].at);
    }).catch(() => {}).finally(() => { outDesksBusy = false; });
  }
  function stepOutside(t, dt) {
    pollStreet(t, dt);
    clockT -= dt; if (clockT <= 0) { clockT = 30; world.setTime(hourForWorld()); }
    if ((roamT -= dt) <= 0) { roamT = 2; syncAgents(); for (const fa of agentMap.values()) fa.refresh(); } // bonded agents step out of (and back into) the cafe
    movePlayer(dt);
    // Never auto-teleport into the old cyber cafe; the living world is our main environment
    // Player remains in the living outside world where Arcade and Plaza are located
    collide(); keepOnMap(); zoneBanner(); world.camPos = outS.camera.position;
    placeRoot(); player.roots.out.userData.creature.update(t, dt);
    world.follow(player.x, player.z); // shadows follow you into every district
    world.update(t, dt);
    livingWorld?.update(t, dt);
    if (hotPotatoGame?.isActive) hotPotatoGame.update(dt, t);
    if (coinCatcherGame?.isActive) coinCatcherGame.update(dt, t);
    if (rooftopRunGame?.isActive) rooftopRunGame.update(dt, t);
    // Agents step around the player instead of walking through
    world.agents.forEach((fa) => { const dx = fa.pos.x - player.x, dz = fa.pos.y - player.z, d = Math.hypot(dx, dz), min = fa.radius + player.r; if (d < min && d > 1e-4) { fa.pos.x = player.x + (dx / d) * min; fa.pos.y = player.z + (dz / d) * min; fa.place(); } });
    const c = outS.camera, ok = Math.min(1, dt * 10);
    orbit.yaw = lerp(orbit.yaw, orbit.tyaw, ok); orbit.pitch = lerp(orbit.pitch, orbit.tpitch, ok); orbit.dist = lerp(orbit.dist, orbit.tdist, ok);
    const fx = -Math.sin(orbit.yaw), fz = -Math.cos(orbit.yaw);
    _camAim.set(player.x + fx * 3.2, (player.y || 0) + 1.7, player.z + fz * 3.2);
    if (styling) {
      _camWant.set(player.x + .75, (player.y || 0) + 1.2, player.z + 3.1);
    } else {
      _camWant.set(_camAim.x - fx * Math.cos(orbit.pitch) * orbit.dist, _camAim.y + Math.sin(orbit.pitch) * orbit.dist, _camAim.z - fz * Math.cos(orbit.pitch) * orbit.dist);
    }
    followCam ??= _camWant.clone();
    followCam.lerp(_camWant, Math.min(1, dt * (orbit.drag ? 16 : 8.0)));
    if (styling) {
      c.lookAt(c.position.copy(followCam).x - .25, .72, player.z);
    } else {
      followLook ??= _camAim.clone();
      followLook.lerp(_camAim, Math.min(1, dt * (orbit.drag ? 16 : 8.0)));
      c.position.copy(followCam);
      c.lookAt(followLook);
    }
    fadeOccluders(dt);
    window.AA_CAM?.(where, stageOf(where).camera, player, t); // trailer only (window.AA_TRAILER): a scripted camera
    hud(t, dt);
  }
  // a station standing between the camera and the player fades to a ghost, so you never lose yourself behind the
  // X tower; each station gets its own copies of its materials the first time it fades
  function fadeOccluders(dt) {
    const c = outS.camera.position, dx = player.x - c.x, dz = player.z - c.z, L2 = dx * dx + dz * dz || 1;
    for (const st of Object.values(world.stations)) {
      const s = st.def, t = ((s.x - c.x) * dx + (s.z - c.z) * dz) / L2, ex = c.x + dx * t - s.x, ez = c.z + dz * t - s.z;
      const block = !styling && t > .05 && t < .97 && ex * ex + ez * ez < 7.8 && c.y + (1.1 - c.y) * t < (st.top || 3) + .3;
      const want = block ? .22 : 1, now = st.fade ?? 1;
      if (now === want) continue;
      st.fade = Math.abs(now - want) < .01 ? want : lerp(now, want, Math.min(1, dt * 6));
      if (!st.fadeMats) {
        st.fadeMats = [];
        st.group.traverse((o) => { if (!o.isMesh) return; o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone(); [].concat(o.material).forEach((m) => { m.userData.base = [m.opacity, m.transparent]; st.fadeMats.push(m); }); });
      }
      const on = st.fade < .999;
      st.fadeMats.forEach((m) => { const tr = on || m.userData.base[1]; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = m.userData.base[0] * st.fade; });
    }
  }
  // the outside is an open world with continuous boundary enforcement
  const lastOk = { x: 0, z: 4 }, zone = { now: 'town' };
  function keepOnMap() {
    if (hotPotatoGame?.isActive || coinCatcherGame?.isActive || rooftopRunGame?.isActive) return;
    player.x = clamp(player.x, -91.5, 91.5);
    player.z = clamp(player.z, -91.5, 91.5);
  }
  function collide() {
    // Handled with continuous sub-stepping and sliding in globalCollision.moveAndSlide()
  }
  // the world follows the player's own clock; the darkest hours show as a blue evening so it stays readable
  function hourForWorld() { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return h < 5.5 || h > 20.6 ? 20.4 : h; }

  // ---------------------------------------------------------------- what's near, prompts, talking
  function nearest() {
    if (where === 'in') {
      if (player.x < -1.9) return { kind: 'exit', label: 'Go outside' };
      const ls = room?.launchSpot; if (onLaunch && ls && Math.hypot(player.x - ls.x, player.z - ls.z) < 1.3) return { kind: 'launch', label: 'Launch your own agent' };
      const ds = room?.diceSpot; if (ds && Math.hypot(player.x - ds.x, player.z - ds.z) < ds.r + 1.0) return { kind: 'casino', tab: 'dice', label: 'Roll dice against an agent' };
      const cs = room?.slotSpot; if (cs && Math.abs(player.x - cs.x) < cs.half && player.z < 2.4) return { kind: 'casino', tab: 'slots', label: 'Play the slots' };
      if (lift && levels > 1 && Math.hypot(player.x - lift.position.x, player.z - (lift.position.z + 1.0)) < 1.2) return { kind: 'lift', label: level < levels - 1 ? `Take the lift up to Level ${level + 1}` : 'Take the lift down to the ground floor' };
      let best = null;
      slots.forEach((s) => { const d = Math.abs(player.x - s.x); if (d < 1.05 && Math.abs(player.z - (s.z + 1.75)) < 1.1 && (!best || d < best.d)) best = { kind: 'tube', s, d, label: s.a.pipId ? `Talk to ${s.a.name}` : `Look at ${s.a.name}` }; });
      return best;
    }
    if (isHall(where)) {
      if (player.x < LEFT_X + 1.35) return { kind: 'exit', label: 'Back outside' };
      if (player.z > .9) return null;
      let best = null;
      hall.items.forEach((it) => { const d = Math.abs(player.x - it.x); if (d < hall.reach && (!best || d < best.d)) best = { kind: 'item', it, d, label: it.label }; });
      return best;
    }
    const gt = gateNear(); if (gt) return { kind: 'gate', g: gt, label: gt.to === 'town' ? 'Back to Town Center' : `Go to ${ZONE_INFO[gt.to][0]}` };
    if (livingWorld?.activePrompt) return { kind: 'living_world_interact', label: livingWorld.activePrompt };
    let best = null;
    world.agents.forEach((fa) => { if (!fa.root.visible) return; const d = Math.hypot(fa.pos.x - player.x, fa.pos.y - player.z); if (d < 1.7 && (!best || d < best.d)) best = { kind: 'agent', fa, d, label: `Talk to ${fa.data.name}` }; });
    if (best) return best;
    if (zone.now !== 'town') { // each district has one thing to do
      const sp = world.spots, near = (k) => Math.hypot(player.x - sp[k].x, player.z - sp[k].z) < sp[k].r;
      // the game stations: stand on (or next to) a game's glowing pad
      let gm = null; for (const m of world.minigames || []) { if (m.zone !== zone.now || !m.spot) continue; const d = Math.hypot(player.x - m.spot.x, player.z - m.spot.z); if (d < (m.kind === 'pond' ? 2.2 : 1.45) && (!gm || d < gm.d)) gm = { m, d }; }
      if (gm) { const m = gm.m; return { kind: m.kind, game: m, label: m.kind === 'pond' ? 'Make a wish' : m.kind === 'claw' ? 'Play the claw machine' : `Play ${m.title} with the agents` }; }
      return null;
    }
    // town game stations (Auda City): stand on the glowing pad
    for (const m of world.minigames || []) { if (m.zone !== 'town' || !m.spot) continue; if (Math.hypot(player.x - m.spot.x, player.z - m.spot.z) < 1.45) return { kind: m.kind, game: m, label: `Play ${m.title} with the agents` }; }
    STATIONS.forEach((s) => { if (s.id === 'lab' || s.id === 'well') return; const d = Math.hypot(s.spot.x - player.x, s.spot.z - player.z); if (d < 1.9 && (!best || d < best.d)) best = HALLS[s.id] ? { kind: 'hall', hall: s.id, s, d, label: HALLS[s.id].door } : { kind: 'station', s, d, label: `Check out the ${s.name.toLowerCase()}` }; });
    return best;
  }
  function interact(n = nearest()) {
    if (livingWorld?.activePromptCallback) {
      livingWorld.activePromptCallback();
      return;
    }
    if (!n || busy) return;
    if (n.kind === 'living_world_interact') {
      livingWorld?.activePromptCallback?.();
      return;
    }
    if (n.kind === 'exit') return go('out');
    if (n.kind === 'lift') return changeLevel(level < levels - 1 ? level + 1 : 0);
    if (n.kind === 'launch') { keys.clear(); target = null; player.vx = player.vz = 0; return onLaunch(); }
    if (n.kind === 'door') return; // ignore cyber cafe door
    if (n.kind === 'casino') { keys.clear(); target = null; player.vx = player.vz = 0; return openCasino(n.tab); }
    if (n.kind === 'gate') return changeRoom(n.g.to);
    if (n.kind === 'claw') { // a little game: the claw drops and you win a plush of a real bonded agent (or nothing)
      const pool = labAgents().filter((a) => a.bonded), win = pool.length && Math.random() < .55 ? pool[Math.floor(Math.random() * pool.length)] : null;
      return say('Claw machine', '#d394e8', win ? `The claw grabs… a plush $${win.name}! ${usd(win.liveMarket?.mcapUsd || 0)} market cap, bonded. Lucky.` : 'The claw grabs… and slips. Almost! Try again.', 'Neon Arcade');
    }
    if (n.kind === 'index') {
      const rows = labAgents().filter((a) => a.bonded && a.liveMarket?.mcapUsd), tot = rows.reduce((t, a) => t + a.liveMarket.mcapUsd, 0);
      return say('Agent Index', '#a99dff', rows.length ? `${rows.length} bonded agents in one basket, ${usd(tot)} together. Biggest: $${rows.sort((x, y) => y.liveMarket.mcapUsd - x.liveMarket.mcapUsd)[0].name}. Live from GMGN, every 30 s. Not financial advice.` : 'The basket is loading.', 'Harbor Docks');
    }
    if (n.kind === 'mini') { // the minigames (games/<id>.js), loaded only when played; the 3D game pauses its keys meanwhile
      racing = true; keys.clear(); target = null; player.vx = player.vz = 0;
      const agents = labAgents().filter((a) => a.bonded).sort(() => Math.random() - .5).slice(0, 6).map((a) => ({ name: a.name, color: genesOf(a).palette.body, genes: genesOf(a), img: spriteOf('agent:' + (a.pipId || a.name), () => buildCreature(genesOf(a), { evo: 1 })) }));
      const meImg = spriteOf('me:' + JSON.stringify(look), () => buildPerson(look));
      import(`./games/${n.game.id}.js`).then((m) => m.open({ me: { name: (live && shownName) || myName || 'You', color: look.hoodie || '#9b7cf0', img: meImg, look }, agents, onClose: () => { racing = false; canvasOf(where).focus({ preventScroll: true }); } })).catch((e) => { racing = false; say(n.game.title, '#ffd166', `The game didn't load (${e.message}). Try again.`); });
      return;
    }
    if (n.kind === 'pond') { const w = ['Wished for a green candle.', 'Wished for more friends in the world.', 'Wished for the next agent to bond.', 'Wished for a quiet night and a good trade.'][Math.floor(Math.random() * 4)]; return say('Wishing pond', '#f0a0b8', `You toss a coin into the pond. ${w}`, 'Sakura Park'); }
    if (n.kind === 'hall') return go(n.hall);
    if (n.kind === 'item') { const it = n.it, a = it.a; player.heading = Math.PI; it.poke?.(); return say(a.name, brainOf(a.brain).fluid, it.line, it.meta, a, it); }
    if (n.kind === 'tube') {
      const a = n.s.a; n.s.tube.flash = 1; n.s.tube.boost = 1; const u = n.s.tube.creature?.userData.creature; if (u) u.poke = 1;
      const line = a.log?.[0]?.text || EVO[evoIndex(a.bond)].note;
      const meta = `${a.asleep ? 'Asleep' : formName(a)} · ${Math.floor(a.bond * 100)}% bonded · ${usd(coinOf(a).mcUsd)} market cap`;
      if (a.pipId && a.unfunded) return say(a.name, brainOf(a.brain).fluid, `I need trading fees to power my thinking. Trade $${a.name} and the first fee wakes me up!`, 'Not thinking yet · no trading fees', a); // shows its coin card so you can trade it
      if (a.pipId) return openChat(a, meta); // a real agent: ask it anything
      return say(a.name, brainOf(a.brain).fluid, line, meta, a);
    }
    if (n.kind === 'agent') {
      const fa = n.fa, a = fa.data, k = talks.get(a) || 0; talks.set(a, k + 1);
      fa.state = 'talk'; fa.timer = 4; fa.faceTo = { x: player.x, z: player.z }; fa.route = []; fa.station = null; fa.u.poke = 1;
      player.heading = Math.atan2(fa.pos.x - player.x, fa.pos.y - player.z);
      const lines = [
        `Hi! I'm ${a.name}. I think with ${brainOf(a.brain).name}, and I pay for every thought from my own wallet.`,
        a.log?.[0]?.text,
        `My wallet has ${(a.sol ?? 0).toFixed(2)} SOL right now. Thinking eats most of it.`,
        a.strategy && `I trade memecoins as a ${a.strategy.label.toLowerCase()}. My owner told me: "${a.strategy.directive}"`,
        `I've thought ${fmt(a.tokens || 0)} tokens in my life so far. The more I think, the bigger I get.`,
        `My coin, $${a.name}, is worth about ${usd(coinOf(a).mcUsd)}. Have a look at it.`,
        a.kids?.length ? `I have ${a.kids.length === 1 ? 'a baby' : a.kids.length + ' babies'} sitting at their own PCs in the cafe.` : 'You can usually find me at the hangout after a raid.',
      ].filter(Boolean);
      return say(a.name, brainOf(a.brain).fluid, lines[k % lines.length], `${formName(a)} · @${a.x?.handle || a.name.toLowerCase()}`, a);
    }
    if (n.kind === 'station') {
      const s = n.s, st = world.stations[s.id], others = worldAgents(), pickA = others[Math.floor(Math.random() * others.length)];
      if (s.id === 'billboard' && pickA) world.showAd(pickA, 'An agent with its own wallet');
      if (s.id === 'tower' && pickA) world.showPost(pickA, pickA.log?.[0]?.text || 'gm', 'post');
      if (s.id === 'well' && payouts.length) { player.heading = Math.atan2(s.x - player.x, s.z - player.z); return say('Airdrop fountain', '#f0c27e', 'Latest real payouts: ' + payouts.slice(0, 4).map((x) => `$${x.a.name} +${solS(x.f.sol)} SOL (${agoS(x.f.at)})`).join(' · '), 'Creator fees paid out on chain to the agents'); }
      st.act({ burn: s.id === 'vault', sell: Math.random() < .3, label: pickA ? '$' + pickA.name : 'gm' });
      player.heading = Math.atan2(s.x - player.x, s.z - player.z);
      return say(s.name, '#9b7cf0', STATION_TALK[s.id] || s.tool, s.tool);
    }
  }
  function showCoin(a) {
    const c = coinOf(a), g = genesOf(a).palette;
    q('.g-av').style.background = `radial-gradient(60% 45% at 50% 82%, ${g.belly} 0 60%, transparent 62%), ${g.body}`;
    q('.g-tk').textContent = c.ticker; q('.g-sub').textContent = `${a.name} · ${c.brain}`;
    const rows = [['Market cap', `${usd(c.mcUsd)} <small style="color:#a08a70;font-weight:500">${fmt(c.mcSol)} SOL</small>`, 'mc'], [a.bonded ? 'Bonded' : 'Bonding', a.bonded ? 'Yes, trading' : `${Math.floor((a.bond || 0) * 100)}%`], ['Holders', c.live ? (c.holders != null ? full(c.holders) : '—') : full(a.holders || 0)], ['Its wallet', `${(a.sol || 0).toFixed(3)} SOL`], ...(a.strategy ? [['Strategy', `${a.strategy.label}${a.strategy.takeProfitPct ? ` · TP +${a.strategy.takeProfitPct}%` : ''}${a.strategy.stopLossPct ? ` · SL −${a.strategy.stopLossPct}%` : ''}`]] : []), ['Lifetime thoughts', `${fmt(a.tokens || 0)} tokens`]];
    coinEl.querySelector('dl').innerHTML = rows.map(([k, v, cls]) => `<div><dt>${k}</dt><dd class="${cls || ''}">${v}</dd></div>`).join('');
    const open = q('.g-open'); open.href = c.link; open.textContent = `Open ${c.ticker} ↗`;
    q('.g-foot').textContent = c.live ? 'A real coin. Opens on the chain explorer.' : `Sample coin from the preview, not a real token.${touch ? '' : ' C opens it.'}`;
    coinEl.hidden = false; coinEl.dataset.link = c.link;
  }
  function openCoin(a) { const link = a ? coinOf(a).link : coinEl.dataset.link; if (link) window.open(link, '_blank', 'noopener'); }
  function say(name, color, text, meta = '', agent = null, view = null) {
    if (chat) closeChat();
    dlg = { text, n: 0 }; chipEl.hidden = true; viewing = view;
    if (agent) showCoin(agent); else coinEl.hidden = true;
    q('.g-dtag').textContent = name; q('.g-dtag').style.setProperty('--tag', color); q('.g-dmeta').textContent = meta; q('.g-dtext').textContent = '';
    dlgEl.hidden = false; promptEl.hidden = true;
  }
  // ---- Ask the agent: talk to a real agent at its desk. It answers in character from its real wallet, trades and
  // reading (server/chat.mjs); talk only, it can't trade from the chat.
  const askEl = dlgEl.querySelector('.g-ask'), askIn = askEl.querySelector('input'), askBtn = askEl.querySelector('button');
  const chats = new Map(); // agent id -> recent turns, so a conversation carries on
  let chat = null;
  function openChat(a, meta) {
    const hist = chats.get(a.pipId) || [];
    const hello = hist.length ? hist[hist.length - 1].text : `Hi, I'm ${a.name}. Ask me what I'm trading, what I'm reading or how my coin is doing.`;
    say(a.name, brainOf(a.brain).fluid, hello, meta, a);
    chat = { a, meta, busy: false }; dlgEl.classList.add('chatting');
    askEl.hidden = false; askIn.value = ''; askIn.placeholder = `Ask ${a.name} something…`; askBtn.disabled = false;
    if (!touch) setTimeout(() => askIn.focus({ preventScroll: true }), 30);
  }
  function closeChat() { chat = null; askEl.hidden = true; dlgEl.classList.remove('chatting'); askIn.blur(); }
  askIn.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); advance(true); return; } e.stopPropagation(); }); // typing never walks the player
  askIn.addEventListener('keyup', (e) => e.stopPropagation());
  askEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = chat, text = askIn.value.trim(); if (!c || c.busy || text.length < 2) return;
    c.busy = true; askBtn.disabled = true; askIn.value = '';
    const hist = chats.get(c.a.pipId) || [];
    dlg = { text: '…', n: 1 }; q('.g-dmeta').textContent = `You: ${text}`;
    let dots = 0; const tick = setInterval(() => { if (chat === c && dlg) { dlg.text = '.'.repeat(1 + (dots++ % 3)); dlg.n = dlg.text.length; } }, 350);
    let reply;
    try {
      const r = await fetch(`/api/agents/${c.a.pipId}/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: text, history: hist.slice(-6) }) });
      const j = await r.json().catch(() => ({}));
      reply = r.ok && j.answer ? j.answer : j.error || 'It could not answer right now. Try again in a moment.';
      if (r.ok && j.answer) { hist.push({ role: 'you', text }, { role: 'agent', text: j.answer }); chats.set(c.a.pipId, hist.slice(-8)); }
    } catch { reply = 'It could not hear you. Check your connection and try again.'; }
    clearInterval(tick);
    if (chat !== c) return; // walked away meanwhile
    dlg = { text: reply, n: 0 }; c.busy = false; askBtn.disabled = false;
    if (!touch) askIn.focus({ preventScroll: true });
  });
  function advance(force = false) {
    if (!dlg) return false;
    if (chat && !force) { if (dlg.n < dlg.text.length) dlg.n = dlg.text.length; return true; } // chatting: clicks finish the line, Escape or walking off closes
    if (dlg.n < dlg.text.length && !force) dlg.n = dlg.text.length; else { dlg = null; viewing = null; dlgEl.hidden = true; coinEl.hidden = true; closeChat(); }
    return true;
  }

  // ---------------------------------------------------------------- overlay: tags, bubbles, prompt, clock
  const tagPool = new Map(), v3 = new THREE.Vector3();
  function tagFor(key, name, cls = '', verified = false) {
    let t = tagPool.get(key);
    if (!t) { const el = document.createElement('div'); el.className = 'g-tag'; el.innerHTML = `<p hidden></p><b class="${cls}"></b>`; tagsEl.appendChild(el); t = { el, p: el.querySelector('p'), b: el.querySelector('b'), text: '', name: null }; tagPool.set(key, t); }
    if (t.name !== name) { t.name = name; t.b.textContent = name; } // names can change (a player renames)
    t.b.classList.toggle('vx', verified); // linked X account: blue verified tick
    return t;
  }
  function placeTag(t, pos, cam, w, h) {
    v3.copy(pos).project(cam);
    const off = v3.z > 1 || Math.abs(v3.x) > 1.15 || Math.abs(v3.y) > 1.15;
    t.el.style.visibility = off ? 'hidden' : 'visible';
    if (!off) t.el.style.transform = `translate(${Math.round((v3.x + 1) / 2 * w)}px, ${Math.round((1 - v3.y) / 2 * h)}px) translate(-50%, -100%)`;
  }
  function hud(t, dt) {
    pollMarket(t); if ((hud.n = (hud.n || 0) + 1) % 30 === 0) renderBoard();
    stepPeers(t, dt);
    const stage = stageOf(where), cam = stage.camera, w = stage.w, h = stage.h, seen = new Set();
    const you = tagFor('you', myX ? `@${myX}` : ((live && shownName) || myName || 'You'), 'you', !!myX); seen.add('you'); // a linked X replaces the chosen name, with a blue tick
    peers.forEach((p) => {
      if (!p.root?.visible) return;
      if (p.npc && !p.say && Math.hypot(p.x - player.x, p.z - player.z) > 6) return; // background characters: name only up close
      const tg = tagFor('peer:' + p.id, p.xh ? `@${p.xh}` : p.body === 'muse' ? `${p.name} · muse` : p.body && !p.noTag ? `${p.name} · agent${p.verified ? ' ✓' : ''}` : p.name, 'peer', !!p.xh); seen.add('peer:' + p.id);
      const said = p.say && p.say.until > performance.now() ? p.say.text : ''; if (said !== tg.text) { tg.text = said; tg.p.textContent = said; tg.p.hidden = !said; }
      placeTag(tg, v3.set(p.x, p.root.userData.creature.H * p.root.scale.x + .3, p.z), cam, w, h);
    });
    { const said = mySay && mySay.until > performance.now() ? mySay.text : ''; if (said !== you.text) { you.text = said; you.p.textContent = said; you.p.hidden = !said; } }
    placeTag(you, v3.set(player.x, player.roots[rootKey(where)].userData.creature.H * scaleHere() + .3, player.z), cam, w, h);
    if (isHall(where) && viewing) you.el.style.visibility = 'hidden';
    if (where === 'out') world.agents.forEach((fa) => {
      const tg = tagFor(fa, fa.data.name); seen.add(fa);
      const live = fa.bubble && fa.bubble.until > world.time ? fa.bubble.text : '';
      if (live !== tg.text) { tg.text = live; tg.p.textContent = live; tg.p.hidden = !live; }
      placeTag(tg, fa.head(new THREE.Vector3()), cam, w, h);
    });
    tagPool.forEach((tg, k) => { if (!seen.has(k)) tg.el.style.visibility = 'hidden'; });
    if (dlg) {
      aBtn.disabled = false;
      dlg.n = Math.min(dlg.text.length, dlg.n + dt * 46);
      q('.g-dtext').textContent = dlg.text.slice(0, Math.floor(dlg.n));
      q('.g-next').style.opacity = dlg.n >= dlg.text.length ? (Math.sin(t * 7) > -.3 ? 1 : .35) : 0;
    } else {
      const n = busy || styling ? null : nearest(), agent = n?.kind === 'tube' ? n.s.a : n?.kind === 'agent' ? n.fa.data : n?.kind === 'item' ? n.it.a : null;
      promptEl.hidden = !n; if (n) promptEl.querySelector('span').textContent = n.label;
      aBtn.disabled = !n;
      chipEl.hidden = !agent;
      if (agent) { const c = coinOf(agent), by = n.kind === 'item' ? n.it.chip || '' : '', html = `${by}<b>${c.ticker}</b><span>${usd(c.mcUsd)} market cap</span><span>${agent.bonded ? 'bonded' : Math.floor((agent.bond || 0) * 100) + '% bonded'}</span>${touch ? '' : '<span>C: coin page</span>'}`; if (chipEl.dataset.k !== html) { chipEl.innerHTML = html; chipEl.dataset.k = html; } }
      near = agent;
    }
    const d = new Date(); q('.g-clock').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // ---------------------------------------------------------------- going in and out
  function showPlace() {
    for (const [key, cv, st] of [['in', cvIn, inS], ['out', cvOut, outS], ['hall', cvHall, hallS]]) { const on = rootKey(where) === key; cv.style.display = on ? '' : 'none'; if (st) st.suspended = !on; }
  }
  async function go(to) {
    if (busy || to === where && isOpen) return;
    const from = where;
    busy = true; target = null; dlg = null; viewing = null; dlgEl.hidden = true; promptEl.hidden = true; coinEl.hidden = true; chipEl.hidden = true;
    fadeEl.style.opacity = 1; await wait(320);
    if (to === 'out' && !outS) { loadEl.hidden = false; loadEl.querySelector('span').textContent = 'Welcome to NEXORA…'; await wait(30); buildOutside(); loadEl.hidden = true; }
    if (isHall(to)) { const fresh = !halls[to]; if (fresh) { loadEl.hidden = false; loadEl.querySelector('span').textContent = HALLS[to].loading; await wait(30); cvHall.style.display = ''; } await enterHall(to); loadEl.hidden = true; }
    if (to === 'out') syncAgents();
    where = to; followCam = null; followLook = null; orbit.tyaw = orbit.yaw = 0; orbit.tpitch = orbit.pitch = .32; orbit.tdist = orbit.dist = 14.2; // each place starts from its own default view
    peers.forEach((p) => { p.here = false; }); // until the server sends who is in the new place
    showPlace();
    if (to === 'out') {
      if (isHall(from)) { const s = STATIONS.find((x) => x.id === from).spot; player.x = s.x; player.z = s.z + .9; }
      else { const s = world.spawn; player.x = s.x; player.z = s.z + .9; world.stations.lab.open(); }
      player.heading = 0; world.setTime(hourForWorld()); clockT = 30;
    } else if (isHall(to)) { player.x = LEFT_X + 1.25; player.z = .9; player.heading = Math.PI / 2; }
    else { player.x = -1.9; player.z = (room?.door.z ?? 2.6) - .4; player.heading = Math.PI / 2; } // back in through the street door, which follows the front of the cafe
    player.vx = player.vz = 0;
    q('.g-where').textContent = placeName(to); q('.g-door').textContent = doorName(to); updateFloors(); q('.g-map').hidden = to !== 'out'; if (to !== 'out') q('.g-mapbox').hidden = true; else { world.enterZone('town'); lastOk.x = player.x; lastOk.z = player.z; zone.now = 'town'; }
    canvasOf(to).focus({ preventScroll: true });
    await wait(60); fadeEl.style.opacity = 0; await wait(200);
    busy = false;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- input
  let racing = false;
  const onKey = (e) => {
    if (racing) { keys.clear(); return; } // the boat race has the keyboard
    if (!isOpen || screenViewOpen() || blocked()) { keys.clear(); return; } // the screen view and the launch panel handle their own keys
    if (e.type === 'keydown') {
      if (styling) { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); closeLook(); } return; }
      if (e.key === '/' && !chat) { e.preventDefault(); openFind(); return; } // jump to search
      if (e.code === 'KeyR' && !chat && (where === 'out' || where === 'in')) { orbit.tyaw = 0; orbit.tpitch = .32; orbit.tdist = 14.2; return; } // reset the camera
      if (e.code === 'KeyM' && !chat && where === 'out') { e.preventDefault(); mapEl.hidden ? openMap() : (mapEl.hidden = true); return; } // the map
      if (e.code === 'Escape' && !mapEl.hidden) { e.preventDefault(); mapEl.hidden = true; return; } // Esc closes the map first
      if (e.code === 'Escape') { e.preventDefault(); if (!advance(!!chat) && !standalone) close(); return; }
      if (e.code === 'KeyC') { if (!coinEl.hidden) openCoin(); else if (near) openCoin(near); return; }
      if (e.code === 'Enter' && live && !dlg && !chatEl.hidden) { e.preventDefault(); chatIn.focus(); return; } // Enter: start typing a chat line
      if (e.code === 'Space' && !dlg && !chat && !nearest() && (where === 'out' || where === 'in')) { if (e.target.closest?.('button')) return; e.preventDefault(); if (!e.repeat) jump(); return; } // nothing in reach: Space jumps
      if (e.code === 'KeyQ' && !chat) { e.preventDefault(); keys.add(e.code); return; } // hold Q to crouch
      if (['KeyE', 'Space', 'Enter'].includes(e.code)) { if (e.target.closest?.('button')) return; e.preventDefault(); if (!advance()) interact(); return; }
      if (/^(Arrow|Key[WASD]$|Shift)/.test(e.code)) { e.preventDefault(); if (chat && !/Shift/.test(e.code)) advance(true); keys.add(e.code); } // walking off ends a chat
    } else keys.delete(e.code);
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  addEventListener('blur', () => keys.clear());
  function groundPoint(cx, cy) {
    const stage = stageOf(where), r = stage.canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), stage.camera);
    if (where === 'out') { const fa = world.pick(ray); if (fa) return { fa }; }
    if (where === 'in') { // clicked a computer: full view of that agent's screen
      const hit = ray.intersectObjects(slots.map((s) => s.tube.mon).filter(Boolean), true)[0];
      if (hit) { const s = slots.find((x) => { let o = hit.object; while (o) { if (o === x.tube.mon) return true; o = o.parent; } return false; }); if (s?.a) { openScreenView({ name: s.a.name, pipId: s.a.pipId || null, fluid: brainOf(s.a.brain).fluid, frames: s.demo?.frames, sim: s.tube.sim }); return null; } }
    }
    const o = ray.ray.origin, d = ray.ray.direction; if (d.y > -1e-3) return null;
    const k = -o.y / d.y; return { x: o.x + d.x * k, z: o.z + d.z * k };
  }
  const camTouch = { on: false, id: null, lx: 0, ly: 0 };
  let touchPinchDist = null;
  [cvIn, cvOut, cvHall].forEach((cv) => {
    cv.addEventListener('pointerdown', (e) => {
      if (dlg) { advance(!!chat); return; } // tapping the room ends a chat too
      if (e.pointerType !== 'mouse') {
        const isLeftSide = e.clientX < window.innerWidth * 0.50;
        if (isLeftSide) {
          // Left half of mobile screen: camera rotation & tilt control
          camTouch.on = true;
          camTouch.id = e.pointerId;
          camTouch.lx = e.clientX;
          camTouch.ly = e.clientY;
          cv.setPointerCapture(e.pointerId);
          return;
        }
      }
      // Right half of mobile screen: character movement controls (move left, right, forward, back)
      stick.on = true; stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; stick.moved = 0; stick.t0 = performance.now();
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (camTouch.on && e.pointerId === camTouch.id) {
        const dx = e.clientX - camTouch.lx;
        const dy = e.clientY - camTouch.ly;
        camTouch.lx = e.clientX;
        camTouch.ly = e.clientY;
        orbit.drag = true;
        orbit.tyaw -= dx * 0.007;
        if (where === 'in') orbit.tyaw = clamp(orbit.tyaw, -.7, .7);
        orbit.tpitch = clamp(orbit.tpitch + dy * 0.004, 0.1, 1.25);
        return;
      }
      if (!stick.on || e.pointerId !== stick.id) return;
      const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, l = Math.hypot(dx, dy); stick.moved = Math.max(stick.moved, l);
      if (e.pointerType === 'mouse' && (where === 'out' || where === 'in') && stick.moved > 4) { // drag to swivel the camera round the player
        orbit.drag = true; orbit.tyaw -= (e.clientX - (stick.lx ?? stick.ox)) * .0065; if (where === 'in') orbit.tyaw = clamp(orbit.tyaw, -.7, .7); orbit.tpitch = clamp(orbit.tpitch + (e.clientY - (stick.ly ?? stick.oy)) * .004, .1, 1.25);
        stick.lx = e.clientX; stick.ly = e.clientY; return;
      }
      if (e.pointerType !== 'mouse' && stick.moved > 4) {
        const k = Math.min(1, l / 52); stick.x = (dx / (l || 1)) * k; stick.y = (dy / (l || 1)) * k;
        stickEl.hidden = false; stickEl.style.transform = `translate(${stick.ox}px, ${stick.oy}px)`; stickEl.querySelector('i').style.transform = `translate(${stick.x * 32}px, ${stick.y * 32}px)`;
      }
    });
    const end = (e) => {
      if (camTouch.on && e.pointerId === camTouch.id) {
        camTouch.on = false;
        orbit.drag = false;
        return;
      }
      if (!stick.on || e.pointerId !== stick.id) return;
      const tap = stick.moved < 8 && performance.now() - stick.t0 < 400;
      stick.on = false; stick.x = stick.y = 0; stickEl.hidden = true; stick.lx = stick.ly = undefined; orbit.drag = false;
      if (tap || (e.pointerType === 'mouse' && stick.moved < 8)) { const g = groundPoint(e.clientX, e.clientY); if (g) target = g; }
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => { if (where !== 'out' && where !== 'in') return; e.preventDefault(); orbit.tdist = clamp(orbit.tdist * (1 + Math.sign(e.deltaY) * .1), 5.5, 32); }, { passive: false }); // scroll to zoom
    cv.addEventListener('contextmenu', (e) => { if (where === 'out' || where === 'in') e.preventDefault(); }); // right-drag swivels too
  });

  // Touch Pinch-to-zoom on mobile
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && (where === 'out' || where === 'in')) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchPinchDist !== null) {
        const diff = touchPinchDist - dist;
        orbit.tdist = clamp(orbit.tdist + diff * 0.04, 5.5, 32);
      }
      touchPinchDist = dist;
    }
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) touchPinchDist = null;
  });
  aBtn.addEventListener('click', () => { if (!advance()) interact(); });
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); jump(); }); duckBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); duckBtn.classList.toggle('on'); });
  dlgEl.addEventListener('click', (e) => { if (!e.target.closest('.g-ask')) advance(); });
  q('.g-door').addEventListener('click', () => { if (styling) closeLook(); go(where === 'out' ? 'in' : 'out'); });
  q('.g-style').addEventListener('click', () => {
    if (window.openHumanCustomizer) {
      window.openHumanCustomizer();
    } else {
      styling ? closeLook() : openLook();
    }
  });
  // ---- search: find any agent by name, $ticker or contract address (mint), then walk straight to its desk on its floor
  const findEl = q('.g-find'), findIn = findEl.querySelector('input'), findList = findEl.querySelector('ul'); let findHits = [], findOn = 0;
  function findAgents(text) {
    const t = text.trim().replace(/^\$/, '').toLowerCase(); if (!t) return [];
    const all = labAgents(), rank = (a) => { const n = a.name.toLowerCase(), m = (a.mint || '').toLowerCase(); return n === t || m === t ? 0 : n.startsWith(t) ? 1 : t.length >= 4 && m.startsWith(t) ? 2 : n.includes(t) ? 3 : t.length >= 6 && m.includes(t) ? 4 : 9; };
    return all.map((a) => [rank(a), a]).filter(([r]) => r < 9).sort((x, y) => x[0] - y[0] || (y[1].bonded ? 1 : 0) - (x[1].bonded ? 1 : 0) || (y[1].bond || 0) - (x[1].bond || 0)).slice(0, 8).map(([, a]) => a);
  }
  function renderFind() {
    findHits = findAgents(findIn.value); findOn = Math.min(findOn, Math.max(0, findHits.length - 1));
    const e = (x) => String(x).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    findList.innerHTML = findHits.map((a, i) => `<li><button type="button" data-i="${i}" class="${i === findOn ? 'on' : ''}">$${e(a.name)} <em>${a.bonded ? 'bonded' : Math.floor((a.bond || 0) * 100) + '%'}${a.liveMarket?.mcapUsd ? ' · ' + usd(a.liveMarket.mcapUsd) : ''}</em><small>${a.mint ? e(a.mint) : 'no coin yet'}</small></button></li>`).join('')
      + (findIn.value.trim() && !findHits.length ? '<p>No agent matches that name or address.</p>' : '');
  }
  function openFind() { if (styling) closeLook(); findEl.hidden = false; findIn.value = ''; findOn = 0; renderFind(); findIn.focus({ preventScroll: true }); }
  function closeFind() { findEl.hidden = true; canvasOf(where).focus({ preventScroll: true }); }
  async function goToAgent(a) {
    closeFind(); if (!a) return;
    if (where !== 'in') await go('in');
    const all = labAgents().slice().sort((x, y) => (y.bonded ? 1 : 0) - (x.bonded ? 1 : 0)), lv = Math.floor(all.indexOf(a) / PER_LEVEL); // the same order the floors are filled in
    if (lv >= 0 && lv !== level) await changeLevel(lv);
    const s = slots.find((x) => x.a === a); if (!s) return;
    player.x = s.x; player.z = s.z + 1.75; player.vx = player.vz = 0; player.heading = Math.PI; target = null; keys.clear(); followCam = null;
    interact({ kind: 'tube', s, d: 0 }); // say hello: its coin card and its words, as if you'd walked up
  }
  q('.g-search').addEventListener('click', () => (findEl.hidden ? openFind() : closeFind()));
  // ---- jobs board: agents' paid jobs for humans (server/jobs.mjs checks the tweet and caps the pay)
  const jobEl = q('.g-jobbox'), jobList = jobEl.querySelector('.g-joblist');
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  // ---- the player's X account, linked to their character (server/xlink.mjs): a private key kept in this browser
  const PKEY = 'aa.player.key'; let pkey = ''; try { pkey = localStorage.getItem(PKEY) || ''; } catch {}
  if (!/^[a-f0-9]{32,64}$/.test(pkey)) { pkey = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem(PKEY, pkey); } catch {} }
  let xHandle = null; const xEl = jobEl.querySelector('.g-xlink');
  const xpost = (path, body = {}) => fetch('/api/x/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: pkey, ...body }) }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));
  function renderX(_ = null, err = '') {
    if (xHandle) { xEl.innerHTML = `<div class="row"><span>𝕏 Linked to your character as <span class="ok">@${esc(xHandle)} ✓</span></span><button type="button" data-x="oauth" style="margin-left:auto;background:#efe8ff;color:#5a3fc0">Sign in again</button></div>${err ? `<div class="err">${esc(err)}</div>` : ''}`; return; }
    xEl.innerHTML = `<div><b>Connect your X to get paid.</b> Jobs only pay tweets from the X account linked to your character.</div><div class="row"><button type="button" data-x="oauth">𝕏 Sign in with X</button></div>${err ? `<div class="err">${esc(err)}</div>` : ''}`;
  }
  xEl.addEventListener('click', async (e) => { if (e.target.closest('[data-x=oauth]')) { if (!(await oauthGo())) renderX(null, 'Sign in with X isn’t available right now. Try again in a moment.'); return; }
  }); // (the old tweet-a-code linking is gone: Sign in with X only)
  { const sp = new URLSearchParams(location.search), xr = sp.get('x'); // back from Sign in with X
    if (xr) { const why = sp.get('why') || ''; history.replaceState(null, '', location.pathname + location.hash);
      setTimeout(() => { openJobs().then(() => { if (xr !== 'linked') renderX(null, why === 'credits' ? 'X sign-in is temporarily unavailable. Try again later.' : why === 'expired' ? 'That sign-in expired. Try again.' : 'Sign in with X didn’t finish. Try again.'); else sendX(); }); }, 2500); } }
  // saved characters (owner): signed in with X, your look and name live on the server under your X handle, so the same
  // character loads on any computer or phone. Every change in Your look saves a moment later.
  let profReady = false, profT = 0, profName = '', accountLabel = '';
  pushProfile = () => { if (!profReady || !accountLabel) return; clearTimeout(profT); profT = setTimeout(() => { xpost('profile/save', { look, name: profName || (myName !== 'You' ? myName : '') }).catch(() => {}); }, 1200); };
  (async () => {
    const r = await xpost('profile').catch(() => ({}));
    if (!r?.handle) return; if (r.kind === 'x') xHandle = r.handle.replace(/^@/, ''); accountLabel = r.handle;
    if (r.look) { profReady = false; setLook(r.look); }
    if (r.name && r.name !== myName) { myName = r.name; profName = r.name; try { localStorage.setItem(NAME_KEY, r.name); } catch {} if (nameIn) nameIn.value = r.name; if (live) { pendingName = r.name; live.name(r.name); } }
    profReady = true; if (!r.look) pushProfile();
    accountLabel = r.handle; loginBtn.textContent = r.handle;
  })();
  const loginBtn = q('.g-login');
  const authEl = q('.g-auth'), authMsg = authEl.querySelector('.g-authmsg'), [authEmail, authPass] = authEl.querySelectorAll('input');
  authEl.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') authEl.querySelector('[data-auth=login]').click(); }));
  const openAuth = () => { authMsg.textContent = ''; const inn = !!accountLabel; authEl.querySelector('.g-authin').hidden = inn; authEl.querySelector('.g-authme').hidden = !inn; if (inn) authEl.querySelector('.g-authme p').textContent = `Logged in as ${accountLabel}. Your character is saved.`; authEl.hidden = false; if (!inn) setTimeout(() => authEmail.focus(), 50); };
  authEl.addEventListener('click', async (e) => {
    if (e.target === authEl || e.target.closest('.g-authx')) { authEl.hidden = true; return; }
    const a = e.target.closest('[data-auth]')?.dataset.auth; if (!a) return;
    if (a === 'x') { authMsg.textContent = 'Opening X…'; if (!(await oauthGo())) authMsg.textContent = 'Sign in with X is not available right now.'; return; }
    if (a === 'look') { authEl.hidden = true; openLook(); return; }
    if (a === 'out') { await xpost('logout').catch(() => {}); location.reload(); return; }
    authMsg.textContent = a === 'signup' ? 'Creating your account…' : 'Logging in…';
    const r = await xpost('email', { email: authEmail.value, password: authPass.value, mode: a }).catch(() => ({ error: 'Network error. Try again.' }));
    if (r?.ok) { authMsg.textContent = ''; location.reload(); } else authMsg.textContent = r?.error || 'Something went wrong.';
  });
  loginBtn.addEventListener('click', openAuth);
  const oauthGo = async () => { const r = await xpost('login'); if (r.ok && /^https:\/\/(x|twitter)\.com\//.test(r.url || '')) { location.href = r.url; return true; } return false; };
  lookXHook = async () => { // the Connect X block in Your look (first visit and any time after): optional
    const el = lookEl.querySelector('.g-lx'); if (!el) return;
    if (!xHandle) { const r = await xpost('me').catch(() => ({})); xHandle = r.handle || null; }
    el.innerHTML = xHandle ? `<span>𝕏 Signed in as <span class="ok">@${esc(xHandle)} ✓</span> · your character is saved</span>` : '<b>Save your character</b><span>Sign in with X to keep your look and name on every device, and get paid for agents’ tasks.</span><button type="button" data-lx>𝕏 Sign in with X</button>';
  };
  lookEl.addEventListener('click', async (e) => { if (e.target.closest('[data-lx]')) { if (!(await oauthGo())) { openJobs(); } } });
  // a friendly nudge, once per session, for players who haven't linked X (never while they're busy styling or in a chat)
  const nudge = q('.g-xnudge');
  nudge.querySelector('.no').addEventListener('click', () => { nudge.hidden = true; });
  nudge.querySelector('.yes').addEventListener('click', async () => { nudge.hidden = true; if (!(await oauthGo())) openJobs(); });
  setTimeout(async () => {
    let seen = false; try { seen = !!sessionStorage.getItem('aa.xnudge'); sessionStorage.setItem('aa.xnudge', '1'); } catch {}
    if (seen || styling || !jobEl.hidden) return;
    const r = await xpost('me').catch(() => ({})); xHandle = r.handle || xHandle; if (xHandle) return;
    nudge.hidden = false; setTimeout(() => { nudge.hidden = true; }, 20_000);
  }, 45_000);
  // the real characters for the 2D minigames: each agent's own 3D model, and your character in your outfit, rendered
  // once to a transparent sprite (cached for the session) so the games show who you actually meet in the world
  const sprites = new Map(); let spriteSt = null;
  function spriteOf(key, make) {
    if (sprites.has(key)) return sprites.get(key);
    let url = null;
    try {
      if (!spriteSt) { spriteSt = new Stage(document.createElement('canvas'), { fov: 22, dpr: 1, observe: false, size: [320, 320], clear: null }); spriteSt.lights('#ffffff', '#c7d0dc', 1.05, 1.9); allStages.splice(allStages.indexOf(spriteSt), 1); spriteSt.ensureEnv(); }
      const root = make(); root.rotation.y = -.32; spriteSt.scene.add(root); root.userData.creature?.update?.(1.3, .016); root.updateMatrixWorld(true);
      const box = new THREE.Box3(); root.traverse((o) => { if (!o.isMesh || !o.visible) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m?.transparent || o.geometry?.type === 'PlaneGeometry' || o.geometry?.type === 'CircleGeometry') return; o.geometry.computeBoundingBox?.(); box.expandByObject(o, true); }); const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), h = Math.max(sz.y, sz.x) * 1.1;
      const cam = spriteSt.camera; cam.aspect = 1; cam.updateProjectionMatrix(); const d = h / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      cam.position.set(c.x, c.y + h * .06, c.z + d); cam.lookAt(c);
      spriteSt.renderer.setClearColor(0x000000, 0); spriteSt.renderer.render(spriteSt.scene, cam);
      url = spriteSt.renderer.domElement.toDataURL('image/png');
      spriteSt.scene.remove(root); (root.userData.look ? disposePerson : disposeCreature)(root);
    } catch (e) { console.warn('sprite', key, e.message); }
    sprites.set(key, url); return url;
  }
  if (window.AA_TEST) Object.assign(window.AA_TEST, { spriteOf, spriteAgents: () => labAgents().filter((a) => a.bonded).map((a) => ({ name: a.name, img: spriteOf('agent:' + (a.pipId || a.name), () => buildCreature(genesOf(a), { evo: 1 })) })), spriteMe: () => spriteOf('me:' + JSON.stringify(look), () => buildPerson(look)) });
  // the agent casino (casino.js, loaded on first use): real SOL, slots and dice against the bonded agents
  function openCasino(tab = 'slots') { import('./casino.js').then((m) => m.openCasino({ tab, token: pkey, api: '' /* same-origin /api: the casino only answers through the Netlify proxy */, agents: labAgents().filter((a) => a.bonded && a.pipId).map((a) => ({ id: a.pipId, name: a.name })) })).catch((e) => say('Agent casino', '#ffd166', `The casino didn't load (${e.message}). Try again.`)); }
  async function openJobs() {
    if (!xHandle) { const r = await xpost('me').catch(() => ({})); xHandle = r.handle || null; } renderX();
    jobEl.hidden = false; jobList.textContent = 'Loading…';
    let jobs = []; try { jobs = await fetch((window.AA_API || '') + '/api/jobs').then((r) => r.json()); } catch {}
    const byId = new Map(labAgents().map((a) => [a.pipId, a]));
    jobList.innerHTML = (Array.isArray(jobs) ? jobs : []).map((j) => { const a = byId.get(j.agent.id), g = a ? genesOf(a).palette : null, tweet = encodeURIComponent(`$${j.agent.symbol} is an AI agent with its own wallet, trading and thinking on its own at attentionagents.fun 👀\n\nCA: ${j.agent.mint}`);
      return `<div class="g-job" data-id="${esc(j.id)}"><div class="av" style="background:${g ? `radial-gradient(60% 45% at 50% 82%, ${g.belly} 0 60%, transparent 62%), ${g.body}` : '#9b7cf0'}"></div><div class="nm">${esc(j.agent.name)}${j.agent.bonded ? '<small>BONDED</small>' : ''}</div><div class="pay"><b>${j.maxSol} SOL</b><span>max reward</span></div><div class="tk">${j.kind === 'quote' ? `Quote this post with $${esc(j.agent.symbol)}’s CA or picture` : `Tweet $${esc(j.agent.symbol)} with its CA + the coin’s picture`}</div>
        <div class="acts"><button type="button" data-copy="${esc(j.agent.mint)}">Copy CA</button>${j.kind === 'quote' && /^https:\/\/x\.com\/i\/status\/\d+$/.test(j.quoteUrl || '') ? `<a href="${esc(j.quoteUrl)}" target="_blank" rel="noopener">See post ↗</a><a href="https://x.com/intent/post?text=${tweet}&url=${encodeURIComponent(j.quoteUrl)}" target="_blank" rel="noopener">Quote it ↗</a>` : `<a href="https://x.com/intent/post?text=${tweet}" target="_blank" rel="noopener">Tweet ↗</a>`}<button type="button" class="go" data-open>I posted it</button></div>
        <form hidden><input name="link" placeholder="Tweet link" maxlength="200" required><input name="wallet" placeholder="Your Solana wallet" maxlength="60" required><button type="submit">Submit</button></form><div class="st"></div></div>`; }).join('') || '<p style="color:#a99cd6">No open jobs right now. Agents post jobs once their coin earns fees.</p>';
  }
  jobEl.addEventListener('click', (e) => { const o = e.target.closest('[data-open]'); if (o) { const f = o.closest('.g-job').querySelector('form'); f.hidden = !f.hidden; if (!f.hidden) f.link.focus(); return; } const b = e.target.closest('[data-copy]'); if (b) { navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; }).catch(() => {}); } });
  jobEl.addEventListener('keydown', (e) => e.stopPropagation()); // typing never walks the player
  // ---- the Completed tab: people who tweeted and got paid (public list: handle, agent, SOL, tweet and payout links)
  const paidEl = jobEl.querySelector('.g-paidlist'), ago = (at) => { const m = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  async function showPaid() {
    paidEl.textContent = 'Loading…'; let rows = []; try { rows = await fetch((window.AA_API || '') + '/api/jobs/paid').then((r) => r.json()); } catch {}
    const safe = (u, re) => (typeof u === 'string' && re.test(u) ? u : null);
    paidEl.innerHTML = (Array.isArray(rows) ? rows : []).map((r) => { const tw = safe(r.link, /^https:\/\/(www\.|mobile\.)?(x|twitter)\.com\//), tx = safe(r.tx, /^https:\/\/solscan\.io\/tx\//);
      return `<div class="g-paid"><div class="who">${r.handle ? `@${esc(r.handle)}<i>✓</i>` : 'Someone'} <span style="font-weight:500;color:#8a7fb0">tweeted for</span> $${esc(r.symbol)}</div><div class="amt">+${(Number(r.sol) + (Number(r.bonusSol) || 0)).toFixed(4)} SOL<small>${r.bonusSol > 0 ? `incl. ${Number(r.bonusSol).toFixed(3)} reach bonus · ` : ''}${ago(r.at)}</small></div><div class="meta">${tw ? `<a href="${esc(tw)}" target="_blank" rel="noopener">Tweet ↗</a>` : ''}${tx ? `<a href="${esc(tx)}" target="_blank" rel="noopener">Payment ↗</a>` : ''}${r.views != null ? `${Number(r.views).toLocaleString('en-US')} views · ` : ''}paid by ${esc(r.agent)}</div></div>`; }).join('') || '<p style="color:#7a6aa8;margin:6px 2px">No paid jobs yet. Be the first!</p>';
  }
  async function showWeek() {
    paidEl.textContent = 'Loading…'; let w = null; try { w = await fetch((window.AA_API || '') + '/api/jobs/week').then((r) => r.json()); } catch {}
    if (!w || !w.pool) { paidEl.innerHTML = '<p style="color:#7a6aa8">Couldn’t load the leaderboard.</p>'; return; }
    const left = Math.max(0, new Date(w.endsAt).getTime() - Date.now()), d = Math.floor(left / 864e5), h = Math.floor((left % 864e5) / 36e5);
    const safe = (u) => (typeof u === 'string' && /^https:\/\/(www\.|mobile\.)?(x|twitter)\.com\//.test(u) ? u : null);
    paidEl.innerHTML = `<div class="g-paid" style="background:linear-gradient(135deg,#fff7d6,#ffe9f3)"><div class="who">Most-viewed tweet this week wins ${w.pool.prizeSol > 0 ? `<b>${w.pool.prizeSol.toFixed(3)} SOL</b>` : 'the prize pool'}</div><div class="amt" style="color:#8a5cf0">${d}d ${h}h<small>left</small></div><div class="meta">Every paid job tweet counts. Views from X, settled Sunday 00:00 UTC.${w.live ? '' : ' (view tracking starts soon)'}</div></div>`
      + (w.top.length ? w.top.map((r, i) => { const tw = safe(r.link); return `<div class="g-paid"><div class="who">${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${r.handle ? `@${esc(r.handle)}<i>✓</i>` : 'Someone'} <span style="font-weight:500;color:#8a7fb0">for</span> $${esc(r.symbol)}</div><div class="amt" style="color:#2a2045">${Number(r.impressions).toLocaleString('en-US')}<small>views</small></div><div class="meta">${tw ? `<a href="${esc(tw)}" target="_blank" rel="noopener">Tweet ↗</a>` : ''}</div></div>`; }).join('') : '<p style="color:#7a6aa8;margin:6px 2px">No ranked tweets yet this week.</p>')
      + (w.lastWinner ? `<p style="color:#5a4f80;margin:8px 2px">Last week: <b>@${esc(w.lastWinner.handle)}</b> won ${Number(w.lastWinner.sol).toFixed(3)} SOL with ${Number(w.lastWinner.impressions).toLocaleString('en-US')} views.</p>` : '')
      + `<p style="color:#8a7fb0;font-size:12px;margin:8px 2px">Prize pool wallet: <code style="font-size:11px">${esc(w.pool.address)}</code> (${Number(w.pool.sol).toFixed(3)} SOL)</p>`;
  }
  jobEl.querySelector('.g-jobtabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; jobEl.querySelectorAll('.g-jobtabs button').forEach((x) => x.classList.toggle('on', x === b)); const tab = b.dataset.tab, other = tab !== 'open'; paidEl.hidden = !other; jobList.hidden = other; if (tab === 'paid') showPaid(); else if (tab === 'week') showWeek(); });
  jobEl.addEventListener('submit', async (e) => {
    e.preventDefault(); const card = e.target.closest('.g-job'), st = card.querySelector('.st'), f = e.target, btn = f.querySelector('button'); btn.disabled = true; st.className = 'st'; st.textContent = 'Sending…';
    try {
      const r = await fetch(`/api/jobs/${card.dataset.id}/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ link: f.link.value.trim(), wallet: f.wallet.value.trim(), token: pkey }) }), j = await r.json().catch(() => ({}));
      if (!r.ok) { st.className = 'st bad'; st.textContent = j.error || 'Something went wrong.'; btn.disabled = false; return; }
      st.textContent = 'The agent is reading your tweet…';
      for (let k = 0; k < 40; k++) { await wait(3000); const c = await fetch((window.AA_API || '') + '/api/claims/' + j.id).then((x) => x.json()).catch(() => null); if (!c || c.status === 'pending') continue;
        if (c.status === 'paid') { st.className = 'st ok'; st.innerHTML = `Paid ${c.paySol.toFixed(4)} SOL! “${esc(c.reason)}” ${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener" style="color:#c9b6ff">View payment ↗</a>` : ''}`; }
        else { st.className = 'st bad'; st.textContent = c.reason || 'Not paid.'; btn.disabled = false; } return; }
      st.textContent = 'Still reviewing. Check back in a bit.';
    } catch { st.className = 'st bad'; st.textContent = 'Couldn’t reach the server.'; btn.disabled = false; }
  });
  q('.g-jobs').addEventListener('click', () => (jobEl.hidden ? openJobs() : (jobEl.hidden = true)));
  q('.g-jobfab').addEventListener('click', () => (jobEl.hidden ? openJobs() : (jobEl.hidden = true))); // the little agent in the corner
  jobEl.querySelector('.g-jobx').addEventListener('click', () => { jobEl.hidden = true; });
  // ---- the map (Club Penguin style): the town square and its districts; click one to jump there
  const mapEl = q('.g-mapbox'), mapBtn = q('.g-map'), zoneEl = q('.g-zone');
  const ZONE_INFO = { town: ['Town Center', 'The cafe tower, market and fountain'], arcade: ['Neon Arcade', 'Coin Catcher and Hot Potato'], docks: ['Harbor Docks', 'Dock Fishing and the Boat Race on the pier'], park: ['Sakura Park', 'Cherry trees and the wishing pond'] };
  const MAP_POS = { town: [50, 70], arcade: [24, 30], docks: [84, 64], park: [70, 24] }; // over the districts in assets/map-districts.webp
  function renderMap() {
    const grid = mapEl.querySelector('.g-mapgrid');
    grid.innerHTML = Object.entries(MAP_POS).map(([id, [l, t]]) => `<button type="button" data-z="${id}" class="${id === zone.now ? 'here' : ''}" style="left:${l}%;top:${t}%" aria-label="${ZONE_INFO[id][0]}: ${ZONE_INFO[id][1]}"><small>${id === zone.now ? 'You are here' : 'Go to ' + ZONE_INFO[id][0]}</small></button>`).join('');
  }
  // game pins on the illustrated map (percent positions over assets/map-districts.webp)
  const GAME_PINS = { coincatch: [11, 41], cardclash: [19, 45], rooftop: [27, 45], claw: [35, 33], fishing: [74, 57], boatrace: [90, 52], pond: [62, 22], casino: [41, 64], getaway: [55, 41], royale: [47, 34], obby: [55, 34], roadster: [47, 41] };
  const GAME_ART = (p) => `games/art/${p}`, ZONE_TITLE = { arcade: 'Neon Arcade', docks: 'Harbor Docks', park: 'Sakura Park', cafe: 'In the cyber cafe', town: 'Town Center' };
  const pinHtml = () => MINIGAMES.filter((m) => GAME_PINS[m.id]).map((m) => `<button type="button" class="gpin" data-g="${m.id}" style="left:${GAME_PINS[m.id][0]}%;top:${GAME_PINS[m.id][1]}%;--c:${m.color};--ic:url(${GAME_ART(m.icon)})" aria-label="${m.title}: go there"><small>${m.title}</small></button>`).join('');
  function openMap() { if (where !== 'out') return; renderMap(); mapEl.querySelector('.g-mapgrid').insertAdjacentHTML('beforeend', pinHtml()); mapEl.hidden = false; }
  // go through a gate (or jump from the map) into another room: fade, build it the first time, arrive at its gate
  const ARRIVE = { town: { arcade: [-16.6, 0, Math.PI / 2], docks: [16.6, 0, -Math.PI / 2], park: [0, 16.6, Math.PI], map: [0, 4, 0] }, arcade: [-39.5, 0, -Math.PI / 2], docks: [39.5, 0, Math.PI / 2], park: [0, 53, Math.PI] }; // the park is south of the square and the camera looks north, so you arrive at its far end facing the gate
  async function changeRoom(to, from = zone.now) {
    mapEl.hidden = true; if (busy || to === zone.now) return;
    busy = true; target = null; keys.clear(); dlg = null; dlgEl.hidden = true; promptEl.hidden = true; coinEl.hidden = true;
    fadeEl.style.opacity = 1; await wait(300);
    if (to !== 'town' && !world.built?.[to]) { loadEl.hidden = false; loadEl.querySelector('span').textContent = `Walking to ${ZONE_INFO[to][0]}…`; await wait(30); }
    world.enterZone(to); (world.built ??= {})[to] = true; loadEl.hidden = true; tickerAt = -99; // fill the new room's live boards
    const spot = to === 'town' ? ARRIVE.town[from] || ARRIVE.town.map : ARRIVE[to];
    player.x = lastOk.x = spot[0]; player.z = lastOk.z = spot[1]; player.heading = spot[2]; player.vx = player.vz = 0; followCam = null; followLook = null;
    peers.forEach((p) => { p.here = false; }); // the server sends who is in the new room
    zone.now = to; { const here = MINIGAMES.filter((m) => m.zone === to).map((m) => m.title); zoneEl.innerHTML = `${ZONE_INFO[to][0]}${here.length ? `<small> ${here.join(' · ')}</small>` : ''}`; } zoneEl.hidden = true; void zoneEl.offsetWidth; zoneEl.hidden = false;
    await wait(60); fadeEl.style.opacity = 0; await wait(200); busy = false;
  }
  const jumpTo = (id) => changeRoom(id);
  window.__jumpToDistrict = (id) => changeRoom(id);
  // a gate: within reach of one in this room (walking into it goes through, like the cafe door)
  const gateNear = (r = 1.9) => world.gates.find((g) => g.room === zone.now && Math.hypot(player.x - g.x, player.z - g.z) < r);
  function zoneBanner() { const g = !busy && gateNear(1.05); if (g && Math.hypot(player.vx, player.vz) > .5) changeRoom(g.to); } // walked into a gate
  mapBtn.addEventListener('click', () => (mapEl.hidden ? openMap() : (mapEl.hidden = true)));
  mapEl.querySelector('.g-mapx').addEventListener('click', () => { mapEl.hidden = true; });
  mapEl.addEventListener('click', (e) => { const g = e.target.closest('button[data-g]'); if (g) { e.stopPropagation(); goToGame(MINIGAMES.find((m) => m.id === g.dataset.g)); return; } const b = e.target.closest('button[data-z]'); if (b) jumpTo(b.dataset.z); });
  // the Games menu: every game as an illustrated card, with Go there (walk up to its station) and Play now
  const gamesEl = q('.g-gamesbox');
  function openGames() {
    mapEl.hidden = true;
    gamesEl.querySelector('.g-gamesgrid').innerHTML = MINIGAMES.map((m) => `<div class="g-gcard" style="--c:${m.color};--ic:url(${GAME_ART(m.icon)});${m.art ? `--bg:url(${GAME_ART(m.art)})` : ''}"><div class="art ${m.art ? '' : 'icononly'}">${m.art ? '' : '<i></i>'}<span class="ic"></span></div><div class="body"><span class="where">${ZONE_TITLE[m.zone] || ''}</span><b>${m.title}</b><p>${m.blurb || ''}</p><div class="row"><button type="button" class="go" data-go="${m.id}">Go there</button><button type="button" class="play" data-play="${m.id}">${m.kind === 'pond' ? 'Make a wish' : 'Play now'}</button></div></div></div>`).join('');
    gamesEl.hidden = false;
  }
  q('.g-games').addEventListener('click', () => (gamesEl.hidden ? openGames() : (gamesEl.hidden = true)));
  gamesEl.querySelector('.g-gamesx').addEventListener('click', () => { gamesEl.hidden = true; });
  gamesEl.addEventListener('click', (e) => {
    const go2 = e.target.closest('[data-go]'), pl = e.target.closest('[data-play]'); if (!go2 && !pl) return;
    const m = MINIGAMES.find((x) => x.id === (go2 || pl).dataset[go2 ? 'go' : 'play']); if (!m) return;
    if (go2) return goToGame(m);
    gamesEl.hidden = true;
    if (m.kind === 'casino') return openCasino('slots');
    interact({ kind: m.kind, game: m });
  });
  // walk up to a game: into the right place and district, standing on its pad, facing the station
  async function goToGame(m) {
    gamesEl.hidden = true; mapEl.hidden = true; if (!m || busy) return;
    if (m.kind === 'casino') { if (where !== 'in') await go('in'); const cs = room?.slotSpot; if (cs) { player.x = cs.x; player.z = 1.9; player.heading = Math.PI; player.vx = player.vz = 0; } return; }
    if (where !== 'out') await go('out');
    if (zone.now !== m.zone) await changeRoom(m.zone); else { fadeEl.style.opacity = 1; await wait(260); }
    const face = Math.atan2(m.x - m.spot.x, m.z - m.spot.z);
    player.x = lastOk.x = m.spot.x; player.z = lastOk.z = m.spot.z; player.heading = face; player.vx = player.vz = 0; target = null; followCam = null; followLook = null;
    await wait(60); fadeEl.style.opacity = 0;
  }
  findIn.addEventListener('input', () => { findOn = 0; renderFind(); });
  findIn.addEventListener('keydown', (e) => {
    e.stopPropagation(); // typing never walks the player
    if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); findOn = (findOn + (e.key === 'ArrowDown' ? 1 : -1) + findHits.length) % Math.max(1, findHits.length); renderFind(); }
    else if (e.key === 'Enter') { e.preventDefault(); goToAgent(findHits[findOn]); }
  });
  findList.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) goToAgent(findHits[+b.dataset.i]); });
  // the leaderboard on the left: the agents with the biggest live market caps (GMGN / DexScreener via /api/market)
  const lbEl = q('.g-lb'), lbList = lbEl.querySelector('ol'), lbBtn = lbEl.querySelector('button'); let lbHits = [], lbKey = '';
  lbEl.classList.add('shut'); lbBtn.setAttribute('aria-expanded', 'false'); // owner: folded until you open it
  lbBtn.addEventListener('click', () => { const shut = lbEl.classList.toggle('shut'); setTimeout(() => placeTape?.(), 0); lbBtn.setAttribute('aria-expanded', String(!shut)); canvasOf(where).focus({ preventScroll: true }); });
  lbList.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) goToAgent(lbHits[+b.dataset.i]); });
  // the LIVE TRADES tape (top right, like the leaderboard): every agent's latest real trades, newest first, Bloomberg
  // style; a new trade prints in at the top with an amber flash. Polls /api/desks on its own, wherever you are.
  const tapeEl = q('.g-tape'), tapeList = tapeEl.querySelector('ol'), tapeBtn = tapeEl.querySelector('button'), tapeSeen = new Set(); let tapeFirst = true;
  tapeEl.classList.add('shut'); tapeBtn.setAttribute('aria-expanded', 'false');
  tapeBtn.addEventListener('click', () => { const shut = tapeEl.classList.toggle('shut'); placeTape(); tapeBtn.setAttribute('aria-expanded', String(!shut)); canvasOf(where).focus({ preventScroll: true }); });
  const tagOf = (f) => { const t = f.text || ''; if (f.side === 'buy') return /^Casino profits|bought back/i.test(t) ? 'BUYBACK' : 'BUY'; return /^Stop loss/.test(t) ? 'STOP' : /^Take profit/.test(t) ? 'TP' : /^Locking in profit/.test(t) ? 'TP½' : /^Trailing stop/.test(t) ? 'TRAIL' : /^Time stop/.test(t) ? 'TIME' : 'SELL'; };
  const pnlOf = (f) => { if (f.side === 'buy') return null; const t = f.text || '', m = t.match(/(?:fell back to|is) ([+-]?\d+)%/) || t.match(/\(([+-]?\d+)%\)/); if (m) return +m[1]; const d = t.match(/down (\d+)%/), u = t.match(/up (\d+)%/); return d ? -d[1] : u ? +u[1] : null; };
  const tagCls = { BUY: 'up', TP: 'up', 'TP½': 'up', BUYBACK: 'bb', SELL: 'dn', STOP: 'dn', TRAIL: 'tr', TIME: 'ti' };
  // under the buttons on the right; on a narrow screen it stacks under the leaderboard instead of covering it
  function placeTape() { const rb = root.getBoundingClientRect(), tb = q('.g-top').getBoundingClientRect(), lb = lbEl.getBoundingClientRect(); if (!tb.height) return; tapeEl.style.top = Math.round((rb.width < 720 && !lbEl.hidden ? lb.bottom : tb.bottom) - rb.top + 10) + 'px'; }
  addEventListener('resize', () => setTimeout(placeTape, 50));
  async function pollTape() {
    let list; try { list = await fetch((window.AA_API || '') + '/api/desks').then((r) => r.json()); } catch { return; }
    if (!Array.isArray(list)) return;
    const names = new Map(labAgents().filter((a) => a.pipId).map((a) => [a.pipId, a.name]));
    const rows = list.flatMap((d) => (d.trades || []).filter((f) => f.kind === 'trade' && f.symbol && (f.sol ?? 1) >= .01).map((f) => ({ key: d.id + f.at + f.symbol, name: names.get(d.id) || '', tag: tagOf(f), symbol: f.symbol, sol: f.sol, pnl: pnlOf(f), at: f.at }))).filter((r) => r.name).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 8);
    const e = (x) => String(x).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    tapeList.innerHTML = rows.map((r) => { const isNew = !tapeFirst && !tapeSeen.has(r.key); return `<li class="${isNew ? 'new' : ''}"><span class="t">${new Date(r.at).toTimeString().slice(0, 8)}</span><span class="a">${e(r.name)}</span><span class="s ${tagCls[r.tag] || ''}">${r.tag}</span><span>$${e(String(r.symbol).toUpperCase())}</span><span class="n">${r.sol != null ? (+r.sol).toFixed(3) : ''}</span><span class="p ${r.pnl == null ? '' : r.pnl >= 0 ? 'up' : 'dn'}">${r.pnl == null ? '' : `${r.pnl >= 0 ? '+' : ''}${Math.round(r.pnl)}%`}</span></li>`; }).join('') || '<li class="g-tempty">Waiting for prints…</li>';
    rows.forEach((r) => tapeSeen.add(r.key)); tapeFirst = false;
    try { world?.setTrades?.(rows.slice(0, 7)); } catch {}
  }
  pollTape(); setInterval(pollTape, 15_000);
  setInterval(() => { if (!tapeEl.hidden) q('.g-tclock').textContent = new Date().toTimeString().slice(0, 8); }, 1000);
  function renderBoard() {
    applyMarket();
    const all = [...new Set([...labAgents(), ...worldAgents()])].filter((a) => a.pipId && a.liveMarket?.mcapUsd > 0);
    lbHits = all.sort((x, y) => y.liveMarket.mcapUsd - x.liveMarket.mcapUsd).slice(0, 10);
    lbEl.hidden = true; tapeEl.hidden = true; // owner: no market panels on screen; the trades print on the market stall's board
    const hb = q('.g-hud').getBoundingClientRect(), rb = root.getBoundingClientRect(); if (hb.height) lbEl.style.top = Math.round(hb.bottom - rb.top + 10) + 'px'; // sits under the top bar, however many lines it wraps to
    const key = lbHits.map((a) => a.pipId + a.liveMarket.mcapUsd + (a.liveMarket.change?.h1 ?? '')).join(); if (key === lbKey) return; lbKey = key;
    const e = (x) => String(x).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    lbList.innerHTML = lbHits.map((a, i) => { const m = a.liveMarket, ch = m.change?.h1; return `<li><button type="button" data-i="${i}" title="Walk to ${e(a.name)}'s desk"><b>${i + 1}</b><span>$${e(a.name)}${a.bonded ? '<small>BONDED</small>' : ''}</span><em>${usd(m.mcapUsd)}${ch != null ? `<small class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : ''}${(+ch).toFixed(1)}% 1h</small>` : ''}</em></button></li>`; }).join('');
  }
  // the floor panel on the right: up, the floor you're on, down
  function updateFloors() { const f = q('.g-floors'); f.hidden = levels < 2 || where !== 'in'; q('.g-fname').textContent = level ? `L${level}` : 'G'; q('.g-fname').title = level ? `Level ${level} of ${levels - 1}` : 'Ground floor'; q('.g-fup').disabled = level >= levels - 1; q('.g-fdown').disabled = level <= 0; }
  q('.g-fup').addEventListener('click', () => { if (styling) closeLook(); if (where === 'in' && level < levels - 1) changeLevel(level + 1); });
  q('.g-fdown').addEventListener('click', () => { if (styling) closeLook(); if (where === 'in' && level > 0) changeLevel(level - 1); });
  q('.g-close').addEventListener('click', () => close());
  if (standalone) q('.g-close').hidden = true;
  // the Attention Agents token: copy its contract address, or open it on pump.fun
  if (ca) {
    const box = q('.g-ca'), btn = q('.g-ca-copy'), label = matchMedia('(max-width: 760px)').matches ? `<b>CA</b>${ca.slice(0, 6)}…${ca.slice(-6)}` : `<b>CA</b>${ca}`;
    btn.innerHTML = label; box.querySelector('a').href = `https://pump.fun/coin/${ca}`; box.hidden = false;
    btn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(ca); btn.innerHTML = '<b>CA</b>Copied'; } catch { btn.textContent = ca; } setTimeout(() => { btn.innerHTML = label; }, 1600); });
  }

  // ---------------------------------------------------------------- open and close
  // open() can be called twice at once (a deep link and a click), so both share one build
  let opening = null;
  function open() { if (!opening) opening = openNow().finally(() => { opening = null; }); return opening; }
  async function openNow() {
    if (isOpen) return;
    isOpen = true; lastFocus = document.activeElement;
    root.hidden = false; document.documentElement.style.overflow = 'hidden'; pause(true);
    let fresh = false;
    if (!inS) {
      fresh = true; loadEl.hidden = false; await wait(40);
      buildInside(); syncTubes();
      where = 'in'; player.x = 1.9; player.z = spawnZ = (rows - 1) * ROW_D + 2.4; player.heading = 0;
      fadeEl.style.opacity = 1; // owner: never flash the cafe first; stay on the loading screen until the town is ready
      let first = true; try { first = !localStorage.getItem('aa.game.v1'); localStorage.setItem('aa.game.v1', '1'); } catch { /* storage unavailable */ }
    }
    showPlace();
    // Start directly outside in Central Plaza facing the grand crystalline fountain
    if (fresh) { await go('out'); loadEl.hidden = true; player.x = 0; player.z = 8.5; player.heading = Math.PI; followCam = null; lastOk.x = player.x; lastOk.z = player.z; }
    if (where === 'out') syncAgents();
    startLive();
    canvasOf(where).focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; keys.clear(); target = null; dlg = null; dlgEl.hidden = true; coinEl.hidden = true; if (styling) { styling = false; lookEl.hidden = true; afterStyling = null; }
    root.hidden = true; document.documentElement.style.overflow = '';
    for (const st of [inS, outS, hallS]) if (st) st.suspended = true;
    stopLive();
    pause(false); lastFocus?.focus?.({ preventScroll: true });
  }
  // visit('studio') opens the game straight into a place (the #studio, #market, #vault and #quests links)
  async function visit(to) { await open(); if (to !== where) await go(to); }
  // trailer only: scripts in trailer/ drive the game through this (the page sets window.AA_TRAILER first)
  if (window.AA_TRAILER) window.__aa = { player, go, interact, setLook, get where() { return where; }, get world() { return world; }, get room() { return room; }, get stage() { return stageOf(where); }, peers };
  return { open, close, visit, setLook, get isOpen() { return isOpen; } };
}
