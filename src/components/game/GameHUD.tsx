import { Tooltip } from '../ui/Tooltip'
import type { LeagueRule } from '../../logic/leagueRules'
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
  activeRule: LeagueRule | null
  tdYard: number
  fgRangeYard: number
  rzYard: number
  downHistory: { playCall: 'run' | 'pass', yardsGained: number }[]
  maxDowns: number
}

export function GameHUD({
  quarter, driveIndex, down, driveProgress,
  userScore, opponentScore, possession, opponentLabel, pendingYards,
  activeRule, tdYard, fgRangeYard, rzYard,
  downHistory, maxDowns,
}: GameHUDProps) {
  const driveInQuarter = (driveIndex % 4) + 1
  const pendingProgress = pendingYards != null
    ? Math.min(100, Math.max(0, driveProgress + pendingYards))
    : undefined

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-6 pt-4 pb-8">
      {/* Score with possession indicator */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Your Team</p>
          <div className="flex items-center justify-end gap-1">
            <span className={`text-4xl leading-none ${possession === 'user' ? '' : 'invisible'}`}>🏈</span>
            <span className="text-4xl font-bold text-white tabular-nums">{userScore}</span>
          </div>
        </div>
        <span className="text-4xl font-bold text-gray-600">—</span>
        <div className="text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{opponentLabel}</p>
          <div className="flex items-center gap-1">
            <span className="text-4xl font-bold text-white tabular-nums">{opponentScore}</span>
            <span className={`text-4xl leading-none ${possession === 'opponent' ? '' : 'invisible'}`}>🏈</span>
          </div>
        </div>
      </div>

      {/* Game state chips */}
      <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
        <span className="bg-indigo-900/60 text-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
          Q{quarter}
        </span>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
          Drive {driveInQuarter}/4
        </span>
        <div className="flex items-end gap-1.5">
          {Array.from({ length: maxDowns }, (_, i) => {
            const downNum = i + 1
            const isCurrent = downNum === down
            const entry = downHistory[i]
            const yds = entry?.yardsGained
            return (
              <div key={downNum} className="flex flex-col items-center gap-0.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : entry
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-800/50 text-gray-600'
                }`}>
                  {downNum}
                </div>
                {entry && (
                  <div className="text-[10px] leading-tight text-center tabular-nums">
                    <span className={entry.playCall === 'run' ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>
                      {entry.playCall === 'run' ? 'R' : 'P'}
                    </span>
                    <span className={yds! > 0 ? 'text-green-400' : yds! < 0 ? 'text-red-400' : 'text-gray-500'}>
                      {yds! >= 0 ? `+${yds}` : `${yds}`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* League rule */}
      {activeRule && (
        <div className="flex items-center justify-center mb-3">
          <Tooltip text={activeRule.description}>
            <span className="text-base font-semibold text-indigo-400 cursor-default">{activeRule.emoji} {activeRule.name}</span>
          </Tooltip>
        </div>
      )}

      <DriveProgressBar progress={driveProgress} pendingProgress={pendingProgress} tdYard={tdYard} fgRangeYard={fgRangeYard} rzYard={rzYard} />
    </div>
  )
}
