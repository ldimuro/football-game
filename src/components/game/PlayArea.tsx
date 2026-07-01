import { computeAdvantageBonus } from '../../logic/gameEngine'
import { PlayerRollCard } from './PlayerRollCard'
import type { Player, TeamUnit } from '../../types'

interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string
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
  kicker: Player | TeamUnit | null
}

const PLAY_CALL_LABELS: Record<string, string> = {
  run: 'RUN',
  pass: 'PASS',
  'run-stop': 'RUN STOP',
  'pass-stop': 'PASS STOP',
}

const ADVANTAGE_LABELS: Record<string, string> = {
  'run-run-stop': 'Run Stuffed',
  'run-pass-stop': 'Open Field',
  'pass-pass-stop': 'Pass Coverage',
  'pass-run-stop': 'Missed Coverage',
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
  kicker,
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

  // Advantage breakdown (only when both calls known and all rolls in)
  const offTotal = offRolls.length > 0 && offRolls.every(r => r !== null)
    ? (offRolls as number[]).reduce((a, b) => a + b, 0)
    : null
  const defTotal = defRolls.length > 0 && defRolls.every(r => r !== null)
    ? (defRolls as number[]).reduce((a, b) => a + b, 0)
    : null
  const advKey = offensePlayCall && defensePlayCall
    ? `${offensePlayCall}-${defensePlayCall}`
    : null
  const advLabel = advKey ? ADVANTAGE_LABELS[advKey] : null
  const bonus = offensePlayCall && defensePlayCall
    ? computeAdvantageBonus(offensePlayCall, defensePlayCall)
    : null

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
            {offTotal !== null && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{offTotal}</span>
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
            {defTotal !== null && phase !== 'rolling-offense' && phase !== 'rolling-defense' && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{defTotal}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Advantage breakdown — shown in show-play-result */}
      {phase === 'show-play-result' && yardsGained !== null && offTotal !== null && defTotal !== null && advLabel && bonus !== null && (
        <div className="bg-gray-900 rounded-xl p-4 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Offense</span>
            <span className="text-white font-bold tabular-nums">{offTotal}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Defense</span>
            <span className="text-white font-bold tabular-nums">{defTotal}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-gray-400">{advLabel}</span>
            <span className={`font-bold tabular-nums ${bonus < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {bonus >= 0 ? '+' : ''}{bonus}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between">
            <span className="text-gray-300 font-semibold">Net yards</span>
            <span className={`text-lg font-bold tabular-nums ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {yardsGained >= 0 ? '+' : ''}{yardsGained}
            </span>
          </div>
        </div>
      )}

      {/* Kicker card + FG attempt */}
      {(phase === 'fg-roll' || phase === 'fg-result') && fgDifficulty !== null && (
        <div className="flex flex-col items-center gap-4">
          {kicker && (
            <div className="w-full max-w-xs">
              <PlayerRollCard
                player={kicker}
                roll={fgRoll}
                isNext={phase === 'fg-roll' && fgRoll === null}
              />
            </div>
          )}
          <div className="text-center bg-gray-900 rounded-lg p-4 w-full max-w-xs">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Need to beat</p>
            <p className="text-2xl font-bold text-yellow-400">{fgDifficulty}</p>
          </div>
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
