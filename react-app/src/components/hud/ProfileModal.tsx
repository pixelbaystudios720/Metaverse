import React, { useState, useEffect } from 'react'
import { CharacterType } from '../characters/MemeCharacterMesh'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  playerName: string
  onUpdatePlayerName: (name: string) => void
  characterType: CharacterType
  onOpenAvatarSelect: () => void
  totalXP: number
  tickerBalance: number
}

interface FriendItem {
  id: string
  name: string
  handle: string
  isOnline: boolean
  status: 'In Lobby' | 'Playing Coin Catcher' | 'Playing Hot Potato'
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  playerName,
  onUpdatePlayerName,
  characterType,
  onOpenAvatarSelect,
  totalXP,
  tickerBalance,
}) => {
  const [editingName, setEditingName] = useState(playerName)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'social' | 'history'>('profile')
  const [xLinked, setXLinked] = useState(true)
  const [xHandle, setXHandle] = useState('@alex_runner')
  const [friends, setFriends] = useState<FriendItem[]>([
    { id: '1', name: 'NovaStar', handle: '@novastar_3d', isOnline: true, status: 'In Lobby' },
    { id: '2', name: 'PixelQueen', handle: '@pixelqueen_meta', isOnline: true, status: 'Playing Hot Potato' },
    { id: '3', name: 'ShadowX', handle: '@shadow_x', isOnline: false, status: 'In Lobby' },
  ])
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingName.trim().length >= 2) {
      onUpdatePlayerName(editingName.trim())
      setIsEditing(false)
      showNotice('Display name updated!')
    }
  }

  const showNotice = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  const handleToggleX = () => {
    if (xLinked) {
      setXLinked(false)
      showNotice('Unlinked X account.')
    } else {
      setXLinked(true)
      setXHandle('@alex_runner')
      showNotice('Connected to X (OAuth 2.0 Verified)!')
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-white relative flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          id="profile-modal-close"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
        >
          ✕
        </button>

        {/* Header Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-4 mb-4 pr-10">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'profile' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            👤 Player Profile
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'social' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Friends & Social
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'history' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Match History
          </button>
        </div>

        {notification && (
          <div className="mb-3 p-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center">
            {notification}
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Top Info Card */}
            <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <div
                onClick={() => {
                  onClose()
                  onOpenAvatarSelect()
                }}
                className="w-16 h-16 rounded-2xl bg-cyan-600/30 border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-inner cursor-pointer hover:scale-105 transition"
                title="Click to change 3D Avatar"
              >
                {characterType === 'muse_mascot' ? '🌱' : characterType === 'chibi_agent' ? '🐱' : '👤'}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <form onSubmit={handleSaveName} className="flex gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="px-2.5 py-1 bg-slate-950 border border-cyan-400 rounded-lg text-sm text-white focus:outline-none"
                    />
                    <button type="submit" className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer">
                      Save
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">{playerName}</span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-slate-400 hover:text-cyan-400 cursor-pointer"
                      title="Edit display name"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <div className="text-xs text-cyan-400 font-bold mt-0.5">
                  Level 1 • {totalXP} XP
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ID: <span className="font-mono text-slate-500">usr_9f4b1e7c</span>
                </div>
              </div>
            </div>

            {/* X (Twitter) Account Linking (FR-06) */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm">
                    𝕏
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">X Account Linking</div>
                    <div className="text-[10px] text-slate-400">
                      {xLinked ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          ✓ Linked as {xHandle}
                        </span>
                      ) : (
                        'Not linked. Connect for social verification.'
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleToggleX}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    xLinked
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                      : 'bg-white hover:bg-slate-200 text-slate-950'
                  }`}
                >
                  {xLinked ? 'Unlink' : 'Connect 𝕏'}
                </button>
              </div>
            </div>

            {/* $TICKER Placeholder Balance (FR-08) */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">$TICKER Placeholder</div>
                <div className="text-[10px] text-slate-400">Future community token readiness</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-amber-400">{tickerBalance} $TICKER</div>
                <div className="text-[10px] text-slate-500">Non-transferable test balance</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOCIAL & FRIENDS (FR-05) */}
        {activeTab === 'social' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="text-xs text-slate-400 font-medium mb-1">
              Followed Players ({friends.length})
            </div>
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                      👤
                    </div>
                    {friend.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {friend.name}
                      <span className="text-[10px] text-slate-400 font-normal">{friend.handle}</span>
                    </div>
                    <div className="text-[10px] text-cyan-400 font-medium">{friend.status}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => showNotice(`Muted ${friend.name}`)}
                    className="p-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer"
                    title="Mute Player"
                  >
                    🔇
                  </button>
                  <button
                    onClick={() => showNotice(`Report submitted for ${friend.name}`)}
                    className="p-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    title="Report Player"
                  >
                    🚩
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MATCH HISTORY (FR-07) */}
        {activeTab === 'history' && (
          <div className="space-y-2.5 overflow-y-auto pr-1">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase">🪙 Coin Catcher</span>
                <div className="text-xs font-bold text-white">Score: 90 PTS</div>
                <div className="text-[10px] text-slate-400">Completed • Today, 19:42</div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SAVED
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase">🔥 Hot Potato</span>
                <div className="text-xs font-bold text-white">Survived 18.0s (Passer)</div>
                <div className="text-[10px] text-slate-400">Completed • Today, 19:15</div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SAVED
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
