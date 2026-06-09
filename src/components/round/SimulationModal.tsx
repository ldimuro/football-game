import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import type { DriveOutcome, DriveResult } from '../../types'

const OUTCOME_LABELS: Record<DriveOutcome, string> = {
  TD: 'Touchdown',
  FG: 'Field Goal',
  Punt: 'Punt',
  Turnover: 'Turnover',
  DefTD: 'Def. Touchdown',
  Safety: 'Safety',
}

const OUTCOME_COLORS: Record<DriveOutcome, string> = {
  TD: 'text-green-400',
  FG: 'text-blue-400',
  Punt: 'text-gray-500',
  Turnover: 'text-red-400',
  DefTD: 'text-orange-400',
  Safety: 'text-yellow-400',
}

interface DriveRowProps {
  drive: DriveResult
  userScore: number
  oppScore: number
}

function DriveRow({ drive, userScore, oppScore }: DriveRowProps) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_1fr_auto] gap-x-3 items-center py-2 border-b border-gray-800 text-sm">
      <span className="text-gray-600 text-xs font-mono">Q{drive.quarter}</span>
      <span className={drive.possession === 'user' ? 'text-indigo-400' : 'text-gray-400'}>
        {drive.possession === 'user' ? 'Your offense' : 'Opp. offense'}
      </span>
      <span className={OUTCOME_COLORS[drive.outcome]}>{OUTCOME_LABELS[drive.outcome]}</span>
      <span className="text-right text-gray-400 text-xs tabular-nums whitespace-nowrap">
        {userScore}–{oppScore}
      </span>
    </div>
  )
}

export function SimulationModal() {
  const { simulationResult, advanceRound, isLoading } = useGameStore()
  if (!simulationResult) return null

  const { userTeamLabel, opponentTeamLabel, drives, userScore, opponentScore, winner } = simulationResult

  let runningUser = 0
  let runningOpp = 0
  const rows = drives.map((drive, i) => {
    if (drive.scoringTeam === 'user') runningUser += drive.points
    else if (drive.scoringTeam === 'opponent') runningOpp += drive.points
    return { drive, runningUser, runningOpp, key: i }
  })

  const winnerText = winner === 'user' ? 'YOU WIN' : winner === 'opponent' ? 'YOU LOSE' : 'TIE GAME'
  const winnerColor = winner === 'user' ? 'text-green-400' : winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-800">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Game Result</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold text-sm">{userTeamLabel}</span>
            <span className="text-3xl font-bold text-white tabular-nums">
              {userScore} <span className="text-gray-600">—</span> {opponentScore}
            </span>
            <span className="text-gray-400 font-bold text-sm">{opponentTeamLabel}</span>
          </div>
          <p className={`text-center text-lg font-bold tracking-widest ${winnerColor}`}>{winnerText}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Drive Log</p>
          {rows.map(({ drive, runningUser, runningOpp, key }) => (
            <DriveRow key={key} drive={drive} userScore={runningUser} oppScore={runningOpp} />
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end">
          <Button onClick={advanceRound} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
