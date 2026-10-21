import React, { useState, useEffect } from 'react'

export interface GameEntryModalProps {
  isOpen: boolean
  onClose: () => void
  gameType: 'coin' | 'potato'
  onConfirmStart: () => void
  playerName?: string
}

export const GameEntryModal: React.FC<GameEntryModalProps> = ({
  isOpen,
  onClose,
  gameType,
  onConfirmStart,
  playerName = 'Alex',
}) => {
  const [matchState, setMatchState] = useState<'waiting' | 'starting'>('waiting')
  const [countdown, setCountdown] = useState(3)
  const [roomCode] = useState(() =>
    gameType === 'coin' ? `CC-${Math.floor(1000 + Math.random() * 9000)}` : `HP-${Math.floor(1000 + Math.random() * 9000)}`
  )

  useEffect(() => {
    if (isOpen) {
      setMatchState('waiting')
      setCountdown(3)
    }
  }, [isOpen, gameType])

  useEffect(() => {
    if (matchState !== 'starting') return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      onConfirmStart()
    }
  }, [matchState, countdown, onConfirmStart])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && matchState === 'waiting') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, matchState, onClose])

  if (!isOpen) return null

  const isCoin = gameType === 'coin'

  const gameInfo = isCoin
    ? {
        title: 'Coin Catcher Arena',
        badge: 'TIMED ITEM RUSH',
        icon: '🪙',
        color: '#facc15',
        bgGradient: 'from-amber-950/40 to-slate-900',
        borderColor: 'border-amber-400/40',
        accentText: 'text-amber-400',
        accentBg: 'bg-amber-500',
        description:
          'Dash around the outdoor glass court collecting glowing cyber coins before the 45-second timer expires. Compete for the highest score on the global leaderboard!',
        rules: [
          { label: 'Match Duration', value: '45 Seconds (Fixed Round)' },
          { label: 'Scoring Rule', value: '+10 PTS per coin collected' },
          { label: 'Win Condition', value: 'Highest score at clock expiry' },
          { label: 'Participant Limit', value: '1 to 4 Players per Room' },
          { label: 'Server Validation', value: 'Proximity pickup verified authoritatively' },
        ],
        rewards: 'Earn +2 XP and 1.5 $TICKER for each point scored.',
      }
    : {
        title: 'Hot Potato (Potato Run)',
        badge: 'ELIMINATION SURVIVAL',
        icon: '🔥',
        color: '#f43f5e',
        bgGradient: 'from-rose-950/40 to-slate-900',
        borderColor: 'border-rose-400/40',
        accentText: 'text-rose-400',
        accentBg: 'bg-rose-500',
        description:
          'Enter the authentic basketball court arena! One player is randomly tagged with the flaming potato. Run up to another player or bot and press [E] to pass it before the countdown timer hits 0.0s and explodes!',
        rules: [
          { label: 'Explosion Clock', value: '18.0 Seconds Detonation Timer' },
          { label: 'Pass Mechanic', value: 'Press [E] within 4.0m to pass the potato' },
          { label: 'Bot AI Behavior', value: 'Pursuit when holding / Fleeing when tagged' },
          { label: 'Elimination Rule', value: 'Holding potato at 0.0s triggers blast' },
          { label: 'Participant Limit', value: '4 Players / Bots on Court' },
        ],
        rewards: 'Survive round: +50 PTS & 100 XP. Eliminated: -25 PTS.',
      }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md select-none p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl flex flex-col text-white relative overflow-hidden"
      >
        {/* Subtle Top Accent Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: gameInfo.color }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-md border ${gameInfo.borderColor}`}
              style={{ backgroundColor: `${gameInfo.color}15` }}
            >
              {gameInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  {gameInfo.title}
                </h2>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${gameInfo.borderColor} ${gameInfo.accentText}`}
                >
                  {gameInfo.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official mini-game rules & matchmaking entry (PRD FR-04).
              </p>
            </div>
          </div>
          {matchState === 'waiting' && (
            <button
              id="game-entry-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer border border-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Starting Countdown Overlay if active */}
        {matchState === 'starting' ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              MATCH STARTING IN
            </div>
            <div className="text-7xl font-black text-white font-mono animate-bounce drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              Synchronizing authoritative game room {roomCode}...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Game Overview Banner */}
            <div
              className={`p-3.5 rounded-2xl border ${gameInfo.borderColor} bg-gradient-to-b ${gameInfo.bgGradient}`}
            >
              <p className="text-xs text-slate-300 leading-relaxed">
                {gameInfo.description}
              </p>
            </div>

            {/* Official Rules Breakdown (per PRD FR-04) */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                <span>📋 OFFICIAL MATCH SPECIFICATIONS</span>
                <span className="text-cyan-400 font-mono">ROOM #{roomCode}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {gameInfo.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col bg-slate-900/60 p-2 rounded-xl border border-slate-800"
                  >
                    <span className="text-[10px] font-medium text-slate-400">
                      {rule.label}
                    </span>
                    <span className="font-bold text-slate-200">{rule.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Roster / Participants */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-300">Room Participants:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {playerName} (You)
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    TOFU
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    LUMEN
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    WISP
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                4/4 READY
              </span>
            </div>

            {/* Rewards Callout */}
            <div className="text-[11px] text-slate-400 flex items-center gap-2 px-1">
              <span>🎁</span>
              <span>{gameInfo.rewards}</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Back to Lobby
              </button>
              <button
                id="game-entry-start-btn"
                onClick={() => setMatchState('starting')}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs text-slate-950 transition cursor-pointer shadow-lg hover:brightness-110 flex items-center justify-center gap-2 ${gameInfo.accentBg}`}
              >
                <span>⚡</span>
                <span>START MATCH NOW</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
