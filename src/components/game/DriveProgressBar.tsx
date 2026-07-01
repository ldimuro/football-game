interface DriveProgressBarProps {
  progress: number
}

export function DriveProgressBar({ progress }: DriveProgressBarProps) {
  return (
    <div className="relative w-full">
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {/* FG Range marker at 65% */}
      <div className="absolute top-0 h-4 w-0.5 bg-yellow-400" style={{ left: '65%' }} />
      {/* Redzone marker at 80% */}
      <div className="absolute top-0 h-4 w-0.5 bg-red-400" style={{ left: '80%' }} />
      {/* TD marker at 100% */}
      <div className="absolute top-0 h-4 w-0.5 bg-green-400" style={{ left: '99.5%' }} />
      {/* Labels below bar */}
      <div className="relative h-5 mt-1">
        <span className="absolute text-xs text-yellow-400 -translate-x-1/2" style={{ left: '65%' }}>FG</span>
        <span className="absolute text-xs text-red-400 -translate-x-1/2" style={{ left: '80%' }}>RZ</span>
        <span className="absolute text-xs text-green-400 -translate-x-1/2" style={{ left: '99.5%' }}>TD</span>
      </div>
    </div>
  )
}
