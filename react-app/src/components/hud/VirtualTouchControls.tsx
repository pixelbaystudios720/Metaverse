import React, { useRef } from 'react'

interface VirtualTouchControlsProps {
  onInteract: () => void
  isSitting?: boolean
}

export const VirtualTouchControls: React.FC<VirtualTouchControlsProps> = ({
  onInteract,
}) => {
  const activeKeys = useRef<{ [key: string]: boolean }>({})

  const triggerKey = (key: string, isDown: boolean) => {
    activeKeys.current[key] = isDown
    const eventType = isDown ? 'keydown' : 'keyup'
    window.dispatchEvent(new KeyboardEvent(eventType, { key, bubbles: true }))
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex justify-between items-end p-4 pb-6 sm:hidden">
      {/* 1. Virtual D-PAD (Bottom-Left) */}
      <div className="pointer-events-auto flex flex-col items-center gap-1 bg-slate-950/40 backdrop-blur-md p-2 rounded-3xl border border-slate-700/60 shadow-2xl">
        {/* Forward */}
        <button
          onTouchStart={(e) => {
            e.preventDefault()
            triggerKey('w', true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            triggerKey('w', false)
          }}
          className="w-13 h-13 rounded-2xl bg-slate-800/90 active:bg-cyan-500 text-white active:text-slate-950 flex items-center justify-center font-black text-lg border border-slate-700 shadow-md transition"
        >
          ▲
        </button>

        {/* Left - Center - Right */}
        <div className="flex items-center gap-1">
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              triggerKey('a', true)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              triggerKey('a', false)
            }}
            className="w-13 h-13 rounded-2xl bg-slate-800/90 active:bg-cyan-500 text-white active:text-slate-950 flex items-center justify-center font-black text-lg border border-slate-700 shadow-md transition"
          >
            ◀
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
            MOVE
          </div>
          <button
            onTouchStart={(e) => {
              e.preventDefault()
              triggerKey('d', true)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              triggerKey('d', false)
            }}
            className="w-13 h-13 rounded-2xl bg-slate-800/90 active:bg-cyan-500 text-white active:text-slate-950 flex items-center justify-center font-black text-lg border border-slate-700 shadow-md transition"
          >
            ▶
          </button>
        </div>

        {/* Backward */}
        <button
          onTouchStart={(e) => {
            e.preventDefault()
            triggerKey('s', true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            triggerKey('s', false)
          }}
          className="w-13 h-13 rounded-2xl bg-slate-800/90 active:bg-cyan-500 text-white active:text-slate-950 flex items-center justify-center font-black text-lg border border-slate-700 shadow-md transition"
        >
          ▼
        </button>
      </div>

      {/* 2. Virtual Action Buttons (Bottom-Right) */}
      <div className="pointer-events-auto flex items-center gap-2 mb-2">
        {/* Action / Interact / Pass Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault()
            onInteract()
          }}
          onClick={onInteract}
          className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 active:from-amber-600 active:to-amber-500 text-slate-950 font-black text-sm flex flex-col items-center justify-center shadow-xl border border-amber-300 transition"
        >
          <span className="text-base">⚡</span>
          <span className="text-[10px] tracking-tight">ACTION</span>
        </button>

        {/* Jump Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault()
            triggerKey(' ', true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            triggerKey(' ', false)
          }}
          className="w-14 h-14 rounded-3xl bg-slate-800/90 active:bg-cyan-500 text-white active:text-slate-950 font-black text-xs flex flex-col items-center justify-center border border-slate-700 shadow-xl transition"
        >
          <span className="text-base">⬆</span>
          <span className="text-[9px]">JUMP</span>
        </button>
      </div>
    </div>
  )
}
