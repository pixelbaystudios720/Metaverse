import React from 'react'

export const ControlsGuide: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-none select-none">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 shadow-xl text-slate-200">
        <div className="text-[10px] tracking-wider font-semibold uppercase text-slate-400 mb-2">
          CONTROLS GUIDE
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono text-cyan-300">
              WASD
            </kbd>
            <span className="text-slate-300">Move</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono text-cyan-300">
              Space
            </kbd>
            <span className="text-slate-300">Jump</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono text-cyan-300">
              Shift
            </kbd>
            <span className="text-slate-300">Sprint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono text-cyan-300">
              Mouse
            </kbd>
            <span className="text-slate-300">Orbit Look</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <kbd className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/50 rounded text-[11px] font-mono text-amber-300">
              E
            </kbd>
            <span className="text-amber-200">Interact / Sit / Pass Potato</span>
          </div>
        </div>
      </div>
    </div>
  )
}
