import React from 'react'

interface InteractionPromptProps {
  promptText: string | null
}

export const InteractionPrompt: React.FC<InteractionPromptProps> = ({ promptText }) => {
  if (!promptText) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30">
      <div className="bg-slate-900/90 backdrop-blur-md border border-amber-400/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-bounce">
        <kbd className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg text-sm font-black shadow-md">
          E
        </kbd>
        <span className="text-sm font-bold text-white tracking-wide">
          {promptText}
        </span>
      </div>
    </div>
  )
}
