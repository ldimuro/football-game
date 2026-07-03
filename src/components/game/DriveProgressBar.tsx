import { DRIVE_PROGRESS_TRANSITION_MS } from '../../logic/gameConstants'

interface DriveProgressBarProps {
  progress: number
  pendingProgress?: number
  tdYard: number
  fgRangeYard: number
  rzYard: number
}

export function DriveProgressBar({ progress, pendingProgress, tdYard, fgRangeYard, rzYard }: DriveProgressBarProps) {
  const rawProgress = Math.max(0, pendingProgress ?? progress)
  const displayProgress = (rawProgress / tdYard) * 100

  return (
    <div className="relative w-full">
      {/* Floating "Yd N" label above bar at current position */}
      <div className="relative h-5 mb-1">
        <span
          className="absolute bottom-0 text-xs font-bold text-white -translate-x-1/2 transition-all"
          style={{ left: `clamp(5%, ${Math.min(100, displayProgress)}%, 95%)`, transitionDuration: `${DRIVE_PROGRESS_TRANSITION_MS}ms` }}
        >
          Yd {Math.round(rawProgress)}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${Math.min(100, displayProgress)}%`, transitionDuration: `${DRIVE_PROGRESS_TRANSITION_MS}ms` }}
        />
        {/* Marker lines rendered inside overflow-hidden so they span the full bar height */}
        <div className="absolute top-0 h-full w-0.5 bg-yellow-400 opacity-80" style={{ left: `${(fgRangeYard / tdYard) * 100}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-red-400 opacity-80" style={{ left: `${(rzYard / tdYard) * 100}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-green-400 opacity-80" style={{ left: `100%` }} />
      </div>

      {/* Labels below bar */}
      <div className="relative h-5 mt-1">
        <span className="absolute text-xs text-yellow-400 -translate-x-1/2" style={{ left: `${(fgRangeYard / tdYard) * 100}%` }}>FG {fgRangeYard}</span>
        <span className="absolute text-xs text-red-400 -translate-x-1/2" style={{ left: `${(rzYard / tdYard) * 100}%` }}>RZ {rzYard}</span>
        <span className="absolute text-xs text-green-400 -translate-x-1/2" style={{ left: `100%` }}>TD</span>
      </div>
    </div>
  )
}
