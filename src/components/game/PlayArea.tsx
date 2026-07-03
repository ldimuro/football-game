import { computeAdvantageBonus } from '../../logic/gameEngine'
import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
import { PlayerRollCard } from './PlayerRollCard'
import type { Player, TeamUnit } from '../../types'

interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  offBonuses?: (number | null)[]
  defBonuses?: (number | null)[]
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
  offBonuses = [],
  defBonuses = [],
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

      {/* Player columns — hidden during FG phases, which show the kicker card instead */}
      {(offPlayers.length > 0 || defPlayers.length > 0) && phase !== 'fg-roll' && phase !== 'fg-result' && (
        <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto w-full">
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
                  bonus={offBonuses[i] ?? null}
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
                  bonus={defBonuses[i] ?? null}
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
      {phase === 'show-play-result' && yardsGained !== null && offTotal !== null && defTotal !== null && advLabel && bonus !== null && (() => {
        // Collect every ability that fired this play (non-zero bonus)
        const activatedAbilities: { label: string; bonus: number; side: 'off' | 'def' }[] = []
        offPlayers.forEach((p, i) => {
          const b = offBonuses[i]
          if (p.ability && b !== null && b !== undefined && b !== 0) {
            activatedAbilities.push({ label: ABILITY_DISPLAY[p.ability] ?? p.ability, bonus: b, side: 'off' })
          }
        })
        defPlayers.forEach((p, i) => {
          const b = defBonuses[i]
          if (p.ability && b !== null && b !== undefined && b !== 0) {
            activatedAbilities.push({ label: ABILITY_DISPLAY[p.ability] ?? p.ability, bonus: b, side: 'def' })
          }
        })
        return (
          <div className="max-w-xl mx-auto w-full">
            <div className="bg-gray-900 rounded-xl p-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Offense</span>
                <span className="text-white font-bold tabular-nums">{offTotal}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Defense</span>
                <span className="text-white font-bold tabular-nums">{defTotal}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">{advLabel}</span>
                <span className={`font-bold tabular-nums ${bonus < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {bonus >= 0 ? '+' : ''}{bonus}
                </span>
              </div>
              {activatedAbilities.map(({ label, bonus: ab, side }, i) => (
                <div key={i} className="flex justify-between mb-2">
                  <span className="text-violet-400 font-semibold">{label} <span className="text-gray-500 font-normal text-xs">({side === 'off' ? 'OFF' : 'DEF'})</span></span>
                  <span className={`font-bold tabular-nums ${ab >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {ab >= 0 ? '+' : ''}{ab}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-2 flex justify-between mt-1">
                <span className="text-gray-300 font-semibold">Net yards</span>
                <span className={`text-lg font-bold tabular-nums ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {yardsGained >= 0 ? '+' : ''}{yardsGained}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Kicker card + FG attempt */}
      {(phase === 'fg-roll' || phase === 'fg-result') && fgDifficulty !== null && (
        <div className="max-w-xl mx-auto w-full flex flex-col gap-4">
          {kicker ? (
            <PlayerRollCard
              player={kicker}
              roll={fgRoll}
              isNext={phase === 'fg-roll' && fgRoll === null}
            />
          ) : fgRoll !== null ? (
            <div className="text-center text-2xl font-bold text-white tabular-nums">
              Rolled: {fgRoll}
            </div>
          ) : null}
          <div className="text-center bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Need to beat</p>
            <p className="text-2xl font-bold text-yellow-400">{fgDifficulty}</p>
          </div>
        </div>
      )}

      {/* Drive outcome */}
      {driveOutcome && (
        <div className="max-w-xl mx-auto w-full text-center">
          <p className={`text-2xl font-bold ${OUTCOME_COLORS[driveOutcome] ?? 'text-white'}`}>
            {OUTCOME_LABELS[driveOutcome] ?? driveOutcome}
          </p>
        </div>
      )}
    </div>
  )
}
