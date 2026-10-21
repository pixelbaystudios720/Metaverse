import React, { useState } from 'react'
import { CharacterType } from '../characters/MemeCharacterMesh'
import { ChatMessage, LeaderboardUser } from '../../types'

interface HUDLayoutProps {
  onTeleport: (x: number, y: number, z: number) => void
  onOpenAvatarSelect: () => void
  onOpenProfile: () => void
  playerName?: string
  currentCharacter: CharacterType
  coinScore: number
  coinTimeLeft: number
  isCoinActive: boolean
  onStartCoinGame: () => void
  potatoActive: boolean
  potatoTimeLeft: number
  potatoHolderName: string
  onStartPotatoRound: () => void
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  leaderboard: LeaderboardUser[]
  nearDoor?: 'coin' | 'potato' | null
  onEnterDoor?: () => void
  currentZoneName?: string
}

export const HUDLayout: React.FC<HUDLayoutProps> = ({
  onTeleport,
  onOpenAvatarSelect,
  onOpenProfile,
  playerName = 'Alex',
  currentCharacter,
  coinScore,
  coinTimeLeft,
  isCoinActive,
  onStartCoinGame,
  potatoActive,
  potatoTimeLeft,
  potatoHolderName,
  onStartPotatoRound,
  messages,
  onSendMessage,
  leaderboard,
  nearDoor,
  onEnterDoor,
  currentZoneName = 'Central Plaza',
}) => {
  const [chatInput, setChatInput] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    onSendMessage(chatInput.trim())
    setChatInput('')
  }

  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden font-sans">
      {/* 1. TOP-LEFT PROFILE PILL MATCHING REFERENCE SCREENSHOT EXACTLY */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3.5 transition">
          {/* User Avatar Circle */}
          <div
            onClick={onOpenAvatarSelect}
            className="w-10 h-10 rounded-full bg-cyan-600/30 border-2 border-cyan-400 flex items-center justify-center text-lg shadow-inner cursor-pointer hover:scale-105 transition"
            title="Click to customize avatar & skin tone"
          >
            {currentCharacter === 'chibi_agent' ? '🐱' : currentCharacter === 'muse_mascot' ? '🌱' : '👤'}
          </div>

          {/* User Details & XP Bar */}
          <div
            onClick={onOpenProfile}
            className="flex flex-col cursor-pointer hover:opacity-90 transition"
            title="Click to view profile & link X"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{playerName}</span>
              <span className="text-[10px] font-bold text-cyan-400">Level 1</span>
            </div>
            {/* Progress Bar & XP */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-cyan-400 rounded-full"></div>
              </div>
              <span className="text-[9px] font-mono text-slate-400 font-bold">980 XP</span>
            </div>
          </div>

          {/* Hamburger Menu Button */}
          <button
            id="hud-hamburger-btn"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition cursor-pointer border border-slate-700 ml-1"
          >
            ☰
          </button>
        </div>

        {/* Dropdown Menu when hamburger is clicked */}
        {isMenuOpen && (
          <div className="mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-2 shadow-2xl w-56 space-y-1 text-xs">
            <button
              onClick={() => {
                onOpenProfile()
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-white transition flex items-center gap-2 cursor-pointer font-bold"
            >
              <span>👤</span> Player Profile & 𝕏
            </button>
            <button
              onClick={() => {
                onOpenAvatarSelect()
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-cyan-300 transition flex items-center gap-2 cursor-pointer font-bold"
            >
              <span>🌱</span> 3D Avatar & Skin Tone
            </button>
            <button
              onClick={() => {
                onTeleport(0, 1.5, 7.8)
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition flex items-center gap-2 cursor-pointer"
            >
              <span>🏛️</span> Central Plaza
            </button>
            <button
              id="hud-menu-coin-btn"
              onClick={() => {
                onStartCoinGame()
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-amber-300 transition flex items-center gap-2 cursor-pointer font-bold"
            >
              <span>🪙</span> Play Coin Catcher
            </button>
            <button
              id="hud-menu-potato-btn"
              onClick={() => {
                onStartPotatoRound()
                setIsMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-orange-400 transition flex items-center gap-2 cursor-pointer font-bold"
            >
              <span>🔥</span> Play Hot Potato
            </button>
          </div>
        )}
      </div>

      {/* 2. TOP-RIGHT CIRCULAR RADAR & ZONE PILL MATCHING REFERENCE SCREENSHOT EXACTLY */}
      <div className="absolute top-4 right-4 flex flex-col items-center gap-1.5">
        {/* Glowing Circular Radar */}
        <div className="w-18 h-18 rounded-full bg-slate-950/85 backdrop-blur-md border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 relative flex items-center justify-center overflow-hidden">
          {/* Subtle Radar Ring Grid */}
          <div className="w-12 h-12 rounded-full border border-cyan-500/30"></div>
          <div className="w-6 h-6 rounded-full border border-cyan-500/40"></div>
          {/* Center Player Red Blip */}
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-sm shadow-rose-500 animate-pulse"></div>
          {/* Green / Cyan Bot Blips */}
          <div className="absolute top-3 left-4 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <div className="absolute bottom-4 right-3 w-1.5 h-1.5 rounded-full bg-cyan-300"></div>
          <div className="absolute top-5 right-5 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
        </div>

        {/* Location Zone Pill with Pink Pin */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1 shadow-md flex items-center gap-1.5">
          <span className="text-[10px] text-rose-400">📍</span>
          <span className="text-[10px] font-bold text-white tracking-wide">
            {currentZoneName}
          </span>
        </div>
      </div>

      {/* 3. DOOR INTERACTION PROMPT (When player walks up to Arcade Doors) */}
      {nearDoor && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-40 animate-bounce">
          <div
            onClick={onEnterDoor}
            className={`cursor-pointer px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border-2 flex items-center gap-3.5 transition transform hover:scale-105 ${
              nearDoor === 'coin'
                ? 'bg-amber-500/90 border-amber-300 text-slate-950'
                : 'bg-rose-600/90 border-rose-300 text-white'
            }`}
          >
            <span className="text-2xl">{nearDoor === 'coin' ? '🪙' : '🔥'}</span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {nearDoor === 'coin' ? 'ENTER COIN CATCHER' : 'ENTER POTATO RUN'}
              </div>
              <div className="text-[11px] opacity-90 font-medium">
                Press <span className="font-bold underline">[E]</span> or click to play!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM-LEFT CHAT PANEL MATCHING REFERENCE SCREENSHOT EXACTLY */}
      <div className="absolute bottom-4 left-4 pointer-events-auto select-none">
        {/* Mobile Chat Toggle Button */}
        <div className="sm:hidden mb-2">
          <button
            onClick={() => setIsMobileChatOpen((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center text-sm shadow-xl cursor-pointer"
          >
            💬
          </button>
        </div>

        {/* Chat Box (Always visible on desktop, toggleable on mobile) */}
        <div
          className={`${
            isMobileChatOpen ? 'flex' : 'hidden sm:flex'
          } bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl w-68 flex-col gap-2`}
        >
          {/* Chat Messages */}
          <div className="space-y-1 text-xs">
            <div className="leading-snug">
              <span className="font-bold text-cyan-400 mr-1.5 text-[11px]">NovaStar :</span>
              <span className="text-slate-200 text-[11px]">Nice game!</span>
            </div>
            <div className="leading-snug">
              <span className="font-bold text-pink-400 mr-1.5 text-[11px]">PixelQueen :</span>
              <span className="text-slate-200 text-[11px]">Let's play again!</span>
            </div>
            <div className="leading-snug">
              <span className="font-bold text-yellow-400 mr-1.5 text-[11px]">ShadowX :</span>
              <span className="text-slate-200 text-[11px]">gg everyone 🔥</span>
            </div>
            {messages.slice(-2).map((m) => (
              <div key={m.id} className="leading-snug">
                <span className="font-bold text-emerald-400 mr-1.5 text-[11px]">{m.sender} :</span>
                <span className="text-slate-200 text-[11px]">{m.text}</span>
              </div>
            ))}
          </div>

          {/* Chat Input Pill with Cyan Send Button */}
          <form onSubmit={handleSend} className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="w-7 h-7 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center text-xs font-bold transition cursor-pointer shadow-md shadow-cyan-400/20"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
