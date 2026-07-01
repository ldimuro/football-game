import { DriveProgressBar } from './DriveProgressBar'

interface GameHUDProps {
  quarter: number
  driveIndex: number
  down: number
  driveProgress: number
  userScore: number
  opponentScore: number
  possession: 'user' | 'opponent'
  opponentLabel: string
  pendingYards?: number | null
}

const DOWN_LABELS = ['1st', '2nd', '3rd', '4th']

export function GameHUD({
  quarter, driveIndex, down, driveProgress,
  userScore, opponentScore, possession, opponentLabel, pendingYards,
}: GameHUDProps) {
  const driveInQuarter = (driveIndex % 4) + 1
  const downLabel = DOWN_LABELS[down - 1] ?? `${down}th`
  const pendingProgress = pendingYards != null
    ? Math.min(100, Math.max(0, driveProgress + pendingYards))
    : undefined

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-6 pt-4 pb-8">
      {/* Centered score */}
      <div className="text-center mb-3">
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
          Your Team — {opponentLabel}
        </p>
        <p className="text-4xl font-bold text-white tabular-nums">
          {userScore} <span className="text-gray-600">—</span> {opponentScore}
        </p>
      </div>

      {/* Game state chips */}
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        <span className="bg-indigo-900/60 text-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
          Q{quarter}
        </span>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
          Drive {driveInQuarter}/4
        </span>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
          {downLabel} Down
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          possession === 'user'
            ? 'bg-indigo-900/60 text-indigo-300'
            : 'bg-amber-900/60 text-amber-300'
        }`}>
          {possession === 'user' ? 'Your ball' : 'Their ball'}
        </span>
      </div>

      <DriveProgressBar progress={driveProgress} pendingProgress={pendingProgress} />
    </div>
  )
}
