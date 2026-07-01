import type { Player, TeamUnit } from '../../types'
import { DieFaces } from '../ui/DieFaces'
import { getPlayerDie } from '../../logic/gameEngine'

interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string  // one of the PlayPhase strings defined in GameScreen
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  opponentPlayCall: 'run' | 'pass' | null
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | null
}

function getPlayerLabel(player: Player | TeamUnit): string {
  if ('name' in player) return `${player.name} (${player.position})`
  return `${player.team} ${player.position}`
}

function PlayerRollCard({
  player,
  roll,
  isNext,
}: {
  player: Player | TeamUnit
  roll: number | null
  isNext: boolean
}) {
  return (
    <div className={`bg-gray-900 border rounded-lg p-3 flex flex-col gap-2 transition-colors ${
      isNext ? 'border-indigo-500' : 'border-gray-800'
    }`}>
      <p className="text-xs text-gray-400 font-medium">{getPlayerLabel(player)}</p>
      <DieFaces faces={getPlayerDie(player)} />
      <div className={`text-center text-2xl font-bold tabular-nums ${
        roll !== null ? 'text-white' : 'text-gray-700'
      }`}>
        {roll !== null ? roll : '?'}
      </div>
    </div>
  )
}

const PLAY_CALL_LABELS: Record<string, string> = {
  run: 'RUN',
  pass: 'PASS',
  'run-stop': 'RUN STOP',
  'pass-stop': 'PASS STOP',
}

const OUTCOME_LABELS: Record<string, string> = {
  TD: '🏈 TOUCHDOWN!',
  FG: '✅ FIELD GOAL!',
  'FG-missed': '❌ FG MISSED',
  Punt: '📤 PUNT',
}

const OUTCOME_COLORS: Record<string, string> = {
  TD: 'text-green-400',
  FG: 'text-blue-400',
  'FG-missed': 'text-red-400',
  Punt: 'text-gray-400',
}

export function PlayArea({
  possession, phase,
  offPlayers, defPlayers,
  offRolls, defRolls,
  offensePlayCall, defensePlayCall, opponentPlayCall,
  yardsGained, fgRoll, fgDifficulty, driveOutcome,
}: PlayAreaProps) {
  const offLabel = possession === 'user' ? 'Your Offense' : 'Opp Offense'
  const defLabel = possession === 'user' ? 'Opp Defense' : 'Your Defense'

  const offRollingIdx = phase === 'rolling-offense'
    ? offRolls.findIndex(r => r === null)
    : -1
  const defRollingIdx = phase === 'rolling-defense'
    ? defRolls.findIndex(r => r === null)
    : -1

  const showMatchup = offensePlayCall !== null || defensePlayCall !== null || opponentPlayCall !== null
  const matchupOff = offensePlayCall ?? opponentPlayCall
  const matchupDef = defensePlayCall

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* Play call matchup badge */}
      {showMatchup && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {matchupOff && (
            <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupOff]}
            </span>
          )}
          {matchupOff && matchupDef && <span className="text-gray-600">vs</span>}
          {matchupDef && (
            <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupDef]}
            </span>
          )}
        </div>
      )}

      {/* Player columns */}
      {(offPlayers.length > 0 || defPlayers.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Offense column */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{offLabel}</p>
            <div className="flex flex-col gap-2">
              {offPlayers.map((player, i) => (
                <PlayerRollCard
                  key={player.id}
                  player={player}
                  roll={offRolls[i] ?? null}
                  isNext={offRollingIdx === i}
                />
              ))}
            </div>
            {phase !== 'rolling-offense' && offRolls.length > 0 && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{(offRolls as number[]).reduce((a, b) => a + b, 0)}</span>
              </p>
            )}
          </div>

          {/* Defense column */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{defLabel}</p>
            <div className="flex flex-col gap-2">
              {defPlayers.map((player, i) => (
                <PlayerRollCard
                  key={player.id}
                  player={player}
                  roll={defRolls[i] ?? null}
                  isNext={defRollingIdx === i}
                />
              ))}
            </div>
            {phase !== 'rolling-offense' && phase !== 'rolling-defense' && defRolls.length > 0 && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{(defRolls as number[]).reduce((a, b) => a + b, 0)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Yards result */}
      {yardsGained !== null && (
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Yards Gained</p>
          <p className={`text-3xl font-bold tabular-nums ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {yardsGained >= 0 ? '+' : ''}{yardsGained}
          </p>
        </div>
      )}

      {/* FG attempt */}
      {(phase === 'fg-roll' || phase === 'fg-result') && fgDifficulty !== null && (
        <div className="text-center bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">FG Attempt — Need to beat</p>
          <p className="text-2xl font-bold text-yellow-400">{fgDifficulty}</p>
          {fgRoll !== null && (
            <p className="mt-2 text-lg text-white font-bold tabular-nums">Kicker rolled: {fgRoll}</p>
          )}
        </div>
      )}

      {/* Drive outcome */}
      {driveOutcome && (
        <div className="text-center">
          <p className={`text-2xl font-bold ${OUTCOME_COLORS[driveOutcome] ?? 'text-white'}`}>
            {OUTCOME_LABELS[driveOutcome] ?? driveOutcome}
          </p>
        </div>
      )}
    </div>
  )
}
