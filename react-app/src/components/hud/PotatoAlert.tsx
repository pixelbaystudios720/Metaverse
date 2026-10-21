import React from 'react'

interface PotatoAlertProps {
  active: boolean
  isPlayerHolder: boolean
  holderName: string
  timeLeft: number
  isExploding: boolean
}

export const PotatoAlert: React.FC<PotatoAlertProps> = ({
  active,
  isPlayerHolder,
  holderName,
  timeLeft,
  isExploding,
}) => {
  if (!active && !isExploding) return null

  if (isExploding) {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none">
        <div className="bg-red-600 border-4 border-yellow-300 rounded-2xl px-8 py-4 shadow-2xl animate-ping flex flex-col items-center">
          <span className="text-3xl font-black text-white">💥 BOOOOOOOM! 💥</span>
          <span className="text-sm font-bold text-yellow-200 mt-1">
            {holderName} EXPLODED!
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none">
      <div
        className={`rounded-2xl px-6 py-2.5 shadow-2xl border-2 flex items-center gap-4 transition-all duration-300 ${
          isPlayerHolder
            ? 'bg-red-950/90 border-red-500 animate-pulse shadow-red-500/50'
            : 'bg-slate-900/90 border-amber-500/80 shadow-amber-500/30'
        }`}
      >
        <span className="text-2xl animate-spin">🔥</span>
        <div className="flex flex-col">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            {isPlayerHolder ? '⚠️ YOU HOLD THE POTATO! PASS IT!' : 'HOT POTATO ROUND IN PROGRESS'}
          </div>
          <div className="text-sm font-extrabold text-white">
            Carrier:{' '}
            <span className={isPlayerHolder ? 'text-red-400' : 'text-amber-300'}>
              {isPlayerHolder ? 'YOU! (Run into someone or press E)' : holderName}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-700">
          <span className="text-[9px] text-slate-400 uppercase font-bold">DETONATION</span>
          <span
            className={`text-xl font-mono font-black ${
              timeLeft <= 5 ? 'text-red-500 animate-bounce' : 'text-amber-400'
            }`}
          >
            {timeLeft.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  )
}
