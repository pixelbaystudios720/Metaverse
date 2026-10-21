import React from 'react'

export interface MatchResultData {
  gameType: 'coin' | 'potato'
  title: string
  isVictory: boolean
  score: number
  stats: { label: string; value: string | number }[]
  earnedXP: number
  earnedTicker: number
}

interface MatchResultsModalProps {
  isOpen: boolean
  data: MatchResultData | null
  onPlayAgain: () => void
  onReturnToLobby: () => void
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  isOpen,
  data,
  onPlayAgain,
  onReturnToLobby,
}) => {
  if (!isOpen || !data) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500/50 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden">
        {/* Glow Header Accent */}
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${data.isVictory ? 'from-amber-400 via-emerald-400 to-cyan-400' : 'from-rose-500 via-orange-500 to-yellow-500'}`} />

        {/* Title & Badge */}
        <div className="text-center mt-2 mb-4">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-cyan-950/80 border border-cyan-400/40 text-cyan-300">
            {data.gameType === 'coin' ? '🪙 COIN CATCHER MATCH' : '🔥 HOT POTATO MATCH'}
          </span>
          <h2 className="text-2xl font-black mt-2 tracking-tight">
            {data.isVictory ? '🏆 MATCH COMPLETED!' : '💥 ROUND OVER!'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Authoritative Server Validated Results</p>
        </div>

        {/* Big Score / Placement Card */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 text-center my-4 shadow-inner">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Final Score</div>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-300 to-yellow-400 mt-1">
            {data.score} <span className="text-lg font-bold text-slate-300">PTS</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 my-4">
          {data.stats.map((stat, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium">{stat.label}</div>
              <div className="text-sm font-bold text-white mt-0.5">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Reward Pills */}
        <div className="flex items-center justify-center gap-3 my-4 bg-slate-900/50 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
            <span>⭐</span> +{data.earnedXP} XP
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <span>🪙</span> +{data.earnedTicker} $TICKER
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
          >
            🏛️ Lobby
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-white shadow-lg shadow-cyan-500/25 transition cursor-pointer"
          >
            🔄 Play Again
          </button>
        </div>
      </div>
    </div>
  )
}
