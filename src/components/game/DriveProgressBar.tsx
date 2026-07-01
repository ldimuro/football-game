interface DriveProgressBarProps {
  progress: number
  pendingProgress?: number
}

export function DriveProgressBar({ progress, pendingProgress }: DriveProgressBarProps) {
  const displayProgress = Math.min(100, Math.max(0, pendingProgress ?? progress))

  return (
    <div className="relative w-full">
      {/* Floating "Yd N" label above bar at current position */}
      <div className="relative h-5 mb-1">
        <span
          className="absolute bottom-0 text-xs font-bold text-white -translate-x-1/2 transition-all duration-300"
          style={{ left: `${displayProgress}%` }}
        >
          Yd {Math.round(displayProgress)}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${displayProgress}%` }}
        />
        {/* Marker lines rendered inside overflow-hidden so they span the full bar height */}
        <div className="absolute top-0 h-full w-0.5 bg-yellow-400 opacity-80" style={{ left: '65%' }} />
        <div className="absolute top-0 h-full w-0.5 bg-red-400 opacity-80" style={{ left: '80%' }} />
        <div className="absolute top-0 h-full w-0.5 bg-green-400 opacity-80" style={{ left: '99.5%' }} />
      </div>

      {/* Labels below bar */}
      <div className="relative h-5 mt-1">
        <span className="absolute text-xs text-yellow-400 -translate-x-1/2" style={{ left: '65%' }}>FG 65</span>
        <span className="absolute text-xs text-red-400 -translate-x-1/2" style={{ left: '80%' }}>RZ 80</span>
        <span className="absolute text-xs text-green-400 -translate-x-1/2" style={{ left: '99.5%' }}>TD</span>
      </div>
    </div>
  )
}
