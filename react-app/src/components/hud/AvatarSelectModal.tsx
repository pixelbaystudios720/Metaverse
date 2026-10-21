import React, { useState } from 'react'
import {
  CharacterType,
  CHARACTER_PRESETS,
  SKIN_TONES,
  OUTFIT_COLORS,
} from '../characters/MemeCharacterMesh'

interface AvatarSelectModalProps {
  isOpen: boolean
  onClose: () => void
  currentType: CharacterType
  onSelectType: (type: CharacterType) => void
  currentSkinColor: string
  onSelectSkinColor: (color: string) => void
  currentTopColor: string
  onSelectTopColor: (color: string) => void
}

const BOTTOM_COLORS = [
  { name: 'Dark Slate', color: '#1f2937' },
  { name: 'Midnight Navy', color: '#1e1b4b' },
  { name: 'Khaki Sand', color: '#d97706' },
  { name: 'Charcoal Black', color: '#111827' },
  { name: 'Cyber Blue', color: '#0284c7' },
  { name: 'Olive Green', color: '#3f6212' },
]

const SHOE_COLORS = [
  { name: 'Neon Mint', color: '#6fd6bd' },
  { name: 'Electric Cyan', color: '#38bdf8' },
  { name: 'Crimson Red', color: '#ef4444' },
  { name: 'Clean White', color: '#f8fafc' },
  { name: 'Gold Yellow', color: '#f59e0b' },
  { name: 'Hot Pink', color: '#ec4899' },
]

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = ({
  isOpen,
  onClose,
  currentType,
  onSelectType,
  currentSkinColor,
  onSelectSkinColor,
  currentTopColor,
  onSelectTopColor,
}) => {
  const [bottomColor, setBottomColor] = useState(BOTTOM_COLORS[0].color)
  const [shoeColor, setShoeColor] = useState(SHOE_COLORS[0].color)
  const [glowHeadphones, setGlowHeadphones] = useState(true)

  if (!isOpen) return null

  const activePreset =
    CHARACTER_PRESETS.find((p) => p.id === currentType) || CHARACTER_PRESETS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md select-none p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full p-6 shadow-2xl flex flex-col max-h-[94vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl shadow-sm">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Avatar Customizer
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  attentionagents.fun
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customize your 3D persona, skin tones, and cyber streetwear options.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer border border-slate-700"
          >
            ✕
          </button>
        </div>

        {/* 2-Column Layout matching User Diagram: [ characters ] | [ options ] (taller) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-hidden min-h-0">
          {/* ========================================================= */}
          {/* LEFT BOX: CHARACTERS (md:col-span-5)                      */}
          {/* ========================================================= */}
          <div className="md:col-span-5 flex flex-col bg-slate-800/80 border border-slate-700/90 rounded-2xl p-4 shadow-lg overflow-hidden">
            {/* Box Label */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>👤</span> CHARACTERS
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {CHARACTER_PRESETS.length} MODELS
              </span>
            </div>

            {/* Active Character Showcase Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/40 rounded-xl p-3.5 mb-3.5 flex items-center gap-3.5 shadow-md">
              <div className="w-16 h-16 rounded-xl bg-cyan-950/60 border border-cyan-400/30 flex items-center justify-center text-3xl shadow-inner relative">
                {activePreset.icon}
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    {activePreset.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold truncate">
                    {activePreset.title}
                  </span>
                </div>
                <div className="text-sm font-black text-white truncate">
                  {activePreset.name}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {activePreset.description}
                </p>
              </div>
            </div>

            {/* Character Selection Scrollable Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {CHARACTER_PRESETS.map((preset) => {
                const isSelected = currentType === preset.id
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onSelectType(preset.id)
                      if (!currentSkinColor) onSelectSkinColor(preset.defaultConfig.skinColor)
                      if (!currentTopColor) onSelectTopColor(preset.defaultConfig.topColor)
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                      {preset.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white truncate">
                          {preset.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {preset.title}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 hover:text-slate-300">
                          CHOOSE
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT BOX: OPTIONS (md:col-span-7, TALLER / MORE DEPTH)   */}
          {/* ========================================================= */}
          <div className="md:col-span-7 flex flex-col bg-slate-800/80 border border-slate-700/90 rounded-2xl p-4 shadow-lg overflow-hidden">
            {/* Box Label */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span>⚙️</span> OPTIONS
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                PALETTES & ACCESSORIES
              </span>
            </div>

            {/* Scrollable Options Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Option 1: Skin Tone Customization */}
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🎨</span> Skin Tone Palette
                  </span>
                  <span className="text-[11px] font-medium text-cyan-400">
                    {SKIN_TONES.find((s) => s.color === currentSkinColor)?.name || 'Custom Tone'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SKIN_TONES.map((tone) => {
                    const isActive = currentSkinColor === tone.color
                    return (
                      <button
                        key={tone.color}
                        onClick={() => onSelectSkinColor(tone.color)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 font-bold shadow-sm'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-slate-700 shrink-0 shadow"
                          style={{ backgroundColor: tone.color }}
                        />
                        <span className="truncate">{tone.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Option 2: Streetwear Hoodie & Top Color */}
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>👕</span> Hoodie & Outfit Color
                  </span>
                  <span className="text-[11px] font-medium text-purple-400">
                    {OUTFIT_COLORS.find((o) => o.color === currentTopColor)?.name || 'Custom Color'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OUTFIT_COLORS.map((outfit) => {
                    const isActive = currentTopColor === outfit.color
                    return (
                      <button
                        key={outfit.color}
                        onClick={() => onSelectTopColor(outfit.color)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                          isActive
                            ? 'border-purple-400 bg-purple-950/40 text-purple-200 font-bold shadow-sm'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-slate-700 shrink-0 shadow"
                          style={{ backgroundColor: outfit.color }}
                        />
                        <span className="truncate">{outfit.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Option 3: Baggy Joggers / Pants Color */}
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>👖</span> Baggy Joggers / Bottoms
                  </span>
                  <span className="text-[11px] font-medium text-amber-400">
                    {BOTTOM_COLORS.find((b) => b.color === bottomColor)?.name || 'Selected'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BOTTOM_COLORS.map((bot) => {
                    const isActive = bottomColor === bot.color
                    return (
                      <button
                        key={bot.color}
                        onClick={() => setBottomColor(bot.color)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                          isActive
                            ? 'border-amber-400 bg-amber-950/40 text-amber-200 font-bold shadow-sm'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-slate-700 shrink-0 shadow"
                          style={{ backgroundColor: bot.color }}
                        />
                        <span className="truncate">{bot.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Option 4: Chunky Sneakers / Footwear */}
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>👟</span> Chunky Kicks / Shoes
                  </span>
                  <span className="text-[11px] font-medium text-emerald-400">
                    {SHOE_COLORS.find((s) => s.color === shoeColor)?.name || 'Selected'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SHOE_COLORS.map((shoe) => {
                    const isActive = shoeColor === shoe.color
                    return (
                      <button
                        key={shoe.color}
                        onClick={() => setShoeColor(shoe.color)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200 font-bold shadow-sm'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-slate-700 shrink-0 shadow"
                          style={{ backgroundColor: shoe.color }}
                        />
                        <span className="truncate">{shoe.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Option 5: Cyber Neon Accessories */}
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🎧</span> LED Cyber Headphones Glow
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Emits vibrant cyan light rings around ears in 3D
                  </div>
                </div>
                <button
                  onClick={() => setGlowHeadphones((g) => !g)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    glowHeadphones
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {glowHeadphones ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            {/* Options Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <button
                onClick={() => {
                  onSelectSkinColor(activePreset.defaultConfig.skinColor)
                  onSelectTopColor(activePreset.defaultConfig.topColor)
                  setBottomColor(BOTTOM_COLORS[0].color)
                  setShoeColor(SHOE_COLORS[0].color)
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
              >
                Reset Default
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Save & Apply Avatar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
