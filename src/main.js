import { createGame } from './aa/game.js';
import { startLoop } from './aa/agents3d.js';
import { AvatarSelectionScreen, AVATAR_PRESETS } from './ui/avatar_selector.js';

// Sample agent strategies and configurations matching attentionagents.fun
const SAMPLE_STRATS = [
  ['Degen sniper', 8, 6, 60, 30, 'Hunt brand-new pump.fun coins early, take profit fast, cut anything that stalls.'],
  ['Trend rider', 12, 4, 120, 25, 'Ride coins already trending with deep liquidity; sell when momentum fades.'],
  ['Narrative dev', 8, 4, 150, 35, 'When a meme is catching fire, launch the best version of it early and hold the dev buy.', true],
  ['Quick flip', 5, 3, 60, 30, 'Launch fast on whatever is catching fire and relaunch strong tweets that stalled. Flip every dev buy.', true, 'flip'],
  ['Patient holder', 10, 3, 300, 50, 'A few coins with real communities. Never chase green candles.'],
  ['Agent backer', 10, 5, 150, 40, 'Back the other agents in the cafe and my own coin first.']
];

function makeAgent([name, brain, tokens, seed, bond, mode], bonded, extra = {}) {
  const st = SAMPLE_STRATS[seed % SAMPLE_STRATS.length] || SAMPLE_STRATS[0];
  return {
    strategy: {
      label: st[0], maxTradePct: st[1], maxPositions: st[2], takeProfitPct: st[3], stopLossPct: st[4],
      directive: st[5], devMode: !!st[6], launchesPerDay: st[7] === 'flip' ? 24 : 3,
      devBuySol: st[7] === 'flip' ? .5 : .1, devHoldHours: 24, devStyle: st[7] || 'hold',
      flipTargetPct: 40, flipMaxSec: 20
    },
    id: name + seed, name, brain, seed, tokens, bonded, bond: bonded ? 1 : bond,
    food: mode === 'asleep' ? 0 : tokens * .04 + 2e5,
    sol: mode === 'asleep' ? 0 : .25 + (tokens / 2e8) * (bonded ? .4 : .15),
    holders: Math.round(30 + Math.sqrt(tokens) * (bonded ? 1.1 : .35)),
    pairs: bonded ? 1 + (seed % 4) : 0,
    trades: mode === 'asleep' ? 0 : 1,
    asleep: mode === 'asleep', log: [], tx: [], feeAcc: 0, feeAt: 0, acts: 0, callouts: 0,
    x: { handle: name.toLowerCase() + '_agent', followers: Math.round(40 + Math.sqrt(tokens) * (bonded ? 1.8 : .6)) },
    spend: { think: 1 + tokens / 2e8, trade: .4, pairs: bonded ? .5 : .2, ads: bonded ? .45 : .15, rewards: bonded ? .6 : 0, babies: bonded ? .2 : 0 },
    bondedAt: bonded ? Date.now() - (1 + (seed % 9)) * 36e5 * 7 : null,
    parents: null, kids: [], gen: 1, ...extra,
  };
}

const labAgentsList = [
  ['ZEPH', 'claude-opus-5.5', 2.1e7, 1201, .935],
  ['PIB', 'gpt-6', 8.1e4, 404, .31],
  ['NIB', 'gemini', 4.6e6, 909, .52],
  ['PIXEL', 'gpt-6', 3.6e4, 808, .08],
  ['TOFU', 'qwen', 1.4e7, 1301, .82],
  ['FENNEL', 'gemini', 2.2e6, 707, .44, 'asleep'],
  ['SQUIB', 'deepseek', 2.6e5, 1401, .2],
  ['BEANS', 'grok-4.7', 1.2e4, 1501, .03],
  ['PEBBLE', 'claude-opus-5.5', 1.8e6, 1601, .66],
].map((d) => makeAgent(d, false));

const worldDataList = [
  ['LUMEN', 'claude-opus-5.5', 1.42e9, 101],
  ['GORP', 'grok-4.7', 2.3e8, 202],
  ['OOZE', 'deepseek', 6.1e8, 111],
  ['WISP', 'qwen', 1.6e8, 606],
  ['BORT', 'deepseek', 3.4e7, 505],
  ['MOCHI', 'claude-opus-5.5', 1.24e7, 303],
  ['KOBI', 'gpt-6', 5.2e7, 1701],
  ['DUMPLING', 'gemini', 1.1e8, 1801],
].map((d) => makeAgent(d, true));

const AGENTS_CA = '75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump';

// Initialize the Game Engine
const game = createGame({
  labAgents: () => labAgentsList,
  worldAgents: () => worldDataList,
  onAct: () => {},
  onBaby: () => {},
  narrow: matchMedia('(max-width: 760px)').matches,
  samples: true,
  standalone: true,
  ca: AGENTS_CA,
  blocked: () => false,
  pause: () => {},
});

// Start Three.js Animation/Render loop
startLoop();
window.__game = game;

import { HumanAvatarCustomizer } from './ui/human_customizer.js';

// Open directly into the connected 3D Living World
game.open();

// Global hook to reopen Human Avatar Customizer from profile / menu
window.openHumanCustomizer = () => {
  new HumanAvatarCustomizer((config) => {
    if (window.__game && window.__game.setLook) {
      window.__game.setLook({});
    }
  });
};
