import React from 'react'

interface GameDrawerProps {
  onTeleport: (x: number, y: number, z: number) => void
  coinScore: number
  coinTimeLeft: number
  isCoinActive: boolean
  onStartCoinGame: () => void
  onResetCoinGame: () => void
  potatoActive: boolean
  potatoTimeLeft: number
  potatoHolderName: string
  onStartPotatoRound: () => void
}

export const GameDrawer: React.FC<GameDrawerProps> = ({
  onTeleport,
  coinScore,
  coinTimeLeft,
  isCoinActive,
  onStartCoinGame,
  onResetCoinGame,
  potatoActive,
  potatoTimeLeft,
  potatoHolderName,
  onStartPotatoRound,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-3 pointer-events-auto select-none max-w-sm">
      {/* Quick Travel / Teleport Drawer */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-wider font-semibold uppercase text-cyan-400">
            FAST TRAVEL
          </span>
          <span className="text-[10px] text-slate-400">Hub Teleport</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTeleport(0, 1.5, 0)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer border border-slate-700 hover:border-cyan-500/50"
          >
            🏛️ Plaza
          </button>
          <button
            onClick={() => onTeleport(0, 1.5, -30)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer border border-slate-700 hover:border-rose-500/50"
          >
            🕹️ Arcade
          </button>
          <button
            onClick={() => onTeleport(0, 1.5, 30)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer border border-slate-700 hover:border-emerald-500/50"
          >
            🌳 Park
          </button>
          <button
            onClick={() => onTeleport(-42, 1.5, -20)}
            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-medium transition cursor-pointer border border-amber-500/40"
          >
            🪙 Coins
          </button>
          <button
            onClick={() => onTeleport(-42, 1.5, 20)}
            className="px-2.5 py-1 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 hover:text-orange-200 rounded-lg text-xs font-medium transition cursor-pointer border border-orange-500/40"
          >
            🔥 Potato Court
          </button>
        </div>
      </div>

      {/* Mini-Games Status Card */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            MINI-GAME STATUS
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-medium">
            LIVE 3D
          </span>
        </div>

        {/* 1. Coin Catcher Mini-Game */}
        <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <span>🪙</span> Coin Catcher (West)
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {coinScore} PTS
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span>Time: <strong className="text-white font-mono">{coinTimeLeft}s</strong></span>
            <span>Status: {isCoinActive ? <span className="text-emerald-400 font-semibold">Active</span> : <span className="text-slate-500">Idle</span>}</span>
          </div>
          <div className="flex gap-1.5">
            {!isCoinActive ? (
              <button
                onClick={onStartCoinGame}
                className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-bold transition cursor-pointer shadow-md shadow-amber-500/20"
              >
                Start 45s Rush
              </button>
            ) : (
              <button
                onClick={onResetCoinGame}
                className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition cursor-pointer border border-slate-700"
              >
                Reset Coins
              </button>
            )}
          </div>
        </div>

        {/* 2. Hot Potato Arena Event */}
        <div className="p-2.5 bg-slate-950/60 rounded-lg border border-orange-900/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
              <span className="animate-bounce">🔥</span> Potato Run Arena
            </span>
            {potatoActive && (
              <span className="text-xs font-mono font-bold text-orange-400 animate-pulse">
                {potatoTimeLeft.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mb-2">
            {potatoActive ? (
              <span>Carrier: <strong className="text-amber-300">{potatoHolderName}</strong></span>
            ) : (
              <span>Basketball court tag • Pass or Explode!</span>
            )}
          </div>
          <button
            onClick={onStartPotatoRound}
            className="w-full py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold transition cursor-pointer shadow-md shadow-orange-600/25 flex items-center justify-center gap-1.5"
          >
            <span>🔥</span> {potatoActive ? 'Reset Round' : 'Launch Hot Potato Round'}
          </button>
        </div>
      </div>
    </div>
  )
}
