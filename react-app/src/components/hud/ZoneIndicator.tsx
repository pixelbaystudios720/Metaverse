import React from 'react'
import { Zone, BotState } from '../../types'

interface ZoneIndicatorProps {
  currentZone: Zone
  playerPos: [number, number, number]
  bots: BotState[]
}

export const ZoneIndicator: React.FC<ZoneIndicatorProps> = ({
  currentZone,
  playerPos,
  bots,
}) => {
  // Minimap scaling: Map range (-70 to 70) to minimap canvas size (120px)
  const mapSize = 130
  const worldRange = 140

  const toMapCoord = (x: number, z: number) => {
    const normX = (x + 70) / worldRange
    const normZ = (z + 70) / worldRange
    return {
      cx: Math.max(4, Math.min(mapSize - 4, normX * mapSize)),
      cy: Math.max(4, Math.min(mapSize - 4, normZ * mapSize)),
    }
  }

  const playerDot = toMapCoord(playerPos[0], playerPos[2])

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 pointer-events-none select-none">
      {/* Sector Badge Card */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl min-w-[210px]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] tracking-wider font-semibold uppercase text-cyan-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            ACTIVE SECTOR
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {playerPos[0].toFixed(0)}, {playerPos[2].toFixed(0)}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          {currentZone === 'Plaza' && '🏛️ Central Plaza'}
          {currentZone === 'Arcade' && '🕹️ Arcade Portal'}
          {currentZone === 'Park' && '🌳 Social Park'}
          {currentZone === 'Coin Catcher' && '🪙 Coin Catcher'}
          {currentZone === 'Hot Potato' && '🔥 Potato Run Arena'}
        </h2>
      </div>

      {/* Radar Minimap */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-xl w-[152px]">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1 px-1">
          <span>RADAR</span>
          <span className="text-emerald-400 font-mono">60 FPS</span>
        </div>
        <div
          className="relative bg-slate-950/90 rounded-lg border border-slate-800 overflow-hidden"
          style={{ width: `${mapSize}px`, height: `${mapSize}px` }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:26px_26px] opacity-40"></div>

          {/* Central Plaza Circle */}
          <div
            className="absolute rounded-full border border-cyan-500/40 bg-cyan-500/10"
            style={{
              left: `${toMapCoord(-18, -18).cx}px`,
              top: `${toMapCoord(-18, -18).cy}px`,
              width: `${(36 / worldRange) * mapSize}px`,
              height: `${(36 / worldRange) * mapSize}px`,
            }}
          />

          {/* Arcade Zone (North) */}
          <div
            className="absolute rounded border border-rose-500/40 bg-rose-500/10 text-[7px] text-rose-300 flex items-center justify-center font-bold"
            style={{
              left: `${toMapCoord(-13, -50).cx}px`,
              top: `${toMapCoord(-13, -50).cy}px`,
              width: `${(26 / worldRange) * mapSize}px`,
              height: `${(18 / worldRange) * mapSize}px`,
            }}
          >
            ARCADE
          </div>

          {/* Social Park Zone (South) */}
          <div
            className="absolute rounded border border-emerald-500/40 bg-emerald-500/10 text-[7px] text-emerald-300 flex items-center justify-center font-bold"
            style={{
              left: `${toMapCoord(-18, 25).cx}px`,
              top: `${toMapCoord(-18, 25).cy}px`,
              width: `${(36 / worldRange) * mapSize}px`,
              height: `${(30 / worldRange) * mapSize}px`,
            }}
          >
            PARK
          </div>

          {/* Coin Catcher Zone (West-North) */}
          <div
            className="absolute rounded border border-amber-500/40 bg-amber-500/10 text-[7px] text-amber-300 flex items-center justify-center font-bold"
            style={{
              left: `${toMapCoord(-55, -30).cx}px`,
              top: `${toMapCoord(-55, -30).cy}px`,
              width: `${(28 / worldRange) * mapSize}px`,
              height: `${(22 / worldRange) * mapSize}px`,
            }}
          >
            COINS
          </div>

          {/* Hot Potato Arena Zone (West-South) */}
          <div
            className="absolute rounded border border-orange-500/40 bg-orange-500/10 text-[7px] text-orange-300 flex items-center justify-center font-bold"
            style={{
              left: `${toMapCoord(-55, 10).cx}px`,
              top: `${toMapCoord(-55, 10).cy}px`,
              width: `${(28 / worldRange) * mapSize}px`,
              height: `${(24 / worldRange) * mapSize}px`,
            }}
          >
            POTATO
          </div>

          {/* Bot Dots */}
          {bots.map((bot) => {
            if (bot.eliminated) return null
            const bpos = toMapCoord(bot.position[0], bot.position[2])
            return (
              <div
                key={bot.id}
                className="absolute w-2 h-2 -translate-x-1 -translate-y-1 rounded-full border border-slate-900 shadow-sm"
                style={{
                  left: `${bpos.cx}px`,
                  top: `${bpos.cy}px`,
                  backgroundColor: bot.color,
                }}
              />
            )
          })}

          {/* Player Dot */}
          <div
            className="absolute w-3 h-3 -translate-x-1.5 -translate-y-1.5 rounded-full bg-cyan-400 border-2 border-white shadow-md shadow-cyan-500/50"
            style={{
              left: `${playerDot.cx}px`,
              top: `${playerDot.cy}px`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
