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
}

const DOWN_LABELS = ['1st', '2nd', '3rd', '4th']

export function GameHUD({
  quarter, driveIndex, down, driveProgress,
  userScore, opponentScore, possession, opponentLabel,
}: GameHUDProps) {
  const driveInQuarter = (driveIndex % 4) + 1
  const downLabel = DOWN_LABELS[down - 1] ?? `${down}th`
  const possessionLabel = possession === 'user' ? 'Your ball' : 'Their ball'

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-6 pt-4 pb-8">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Q{quarter}</span>
          <span className="text-xs text-gray-500">Drive {driveInQuarter}/4</span>
          <span className="text-xs text-gray-500">{downLabel} Down</span>
          <span className="text-xs text-gray-500">{possessionLabel}</span>
        </div>
        <div className="text-right tabular-nums">
          <p className="text-xs text-gray-500 mb-0.5">Your Team — {opponentLabel}</p>
          <p className="text-2xl font-bold text-white">
            {userScore} <span className="text-gray-600">—</span> {opponentScore}
          </p>
        </div>
      </div>
      <DriveProgressBar progress={driveProgress} />
    </div>
  )
}
