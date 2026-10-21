import React, { useState } from 'react'
import { ChatMessage, LeaderboardUser } from '../../types'

interface ChatAndLeaderboardProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  leaderboard: LeaderboardUser[]
}

export const ChatAndLeaderboard: React.FC<ChatAndLeaderboardProps> = ({
  messages,
  onSendMessage,
  leaderboard,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard'>('chat')
  const [inputVal, setInputVal] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim()) return
    onSendMessage(inputVal.trim())
    setInputVal('')
  }

  return (
    <div className="absolute bottom-4 right-4 z-20 w-80 pointer-events-auto select-none">
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl flex flex-col h-72">
        {/* Header Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 Cafe Hub Chat
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs">
          {activeTab === 'chat' ? (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-1.5 rounded-lg ${
                    msg.isSystem
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]'
                      : 'bg-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-bold text-cyan-300">{msg.sender}</span>
                    <span className="text-slate-500">{msg.time}</span>
                  </div>
                  <div className="break-words leading-relaxed">{msg.text}</div>
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((user) => (
                <div
                  key={user.rank}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                        user.rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : user.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : user.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {user.rank}
                    </span>
                    <span className="font-medium text-slate-200">{user.name}</span>
                    {user.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {user.badge}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    {user.score} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        {activeTab === 'chat' && (
          <form onSubmit={handleSend} className="p-2 border-t border-slate-800 bg-slate-950/80 flex gap-1.5">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type message & Enter..."
              className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
