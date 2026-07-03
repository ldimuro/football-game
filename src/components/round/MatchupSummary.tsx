import { getTeamColor } from '../../logic/teamColors'
import { ABILITY_DISPLAY, ABILITY_DESCRIPTIONS } from '../../logic/abilityEngine'
import { TurnoverDie } from '../ui/TurnoverDie'
import { Tooltip } from '../ui/Tooltip'
import type { WeatherCondition, Roster, Player, TeamUnit } from '../../types'

const WEATHER_CONFIG: Record<WeatherCondition, { icon: string; label: string }> = {
  Clear: { icon: '☀️', label: 'Clear' },
  Dome: { icon: '🏟️', label: 'Dome' },
  Rain: { icon: '🌧️', label: 'Rain' },
  HeavyWind: { icon: '💨', label: 'Heavy Wind' },
  Snow: { icon: '❄️', label: 'Snow' },
}

type RosterKey = keyof Roster
const OFF_SLOTS: RosterKey[] = ['QB', 'WR1', 'WR2', 'RB']
const DEF_SLOTS: RosterKey[] = ['DLine', 'Secondary']
const ALL_SLOTS: RosterKey[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']

function avgDieFace(players: (Player | TeamUnit | null | undefined)[]): number | null {
  const means = players
    .filter((p): p is Player | TeamUnit => p != null)
    .map(p => p.die && p.die.length > 0 ? p.die.reduce((a, b) => a + b, 0) / p.die.length : null)
    .filter((v): v is number => v !== null)
  if (means.length === 0) return null
  return means.reduce((a, b) => a + b, 0) / means.length
}

function mean(slots: RosterKey[], roster: Roster): number | null {
  return avgDieFace(slots.map(k => roster[k]))
}

function AbilityEmojis({ roster }: { roster: Roster }) {
  const entries = ALL_SLOTS
    .map((k, i) => ({ player: roster[k], slotIdx: i }))
    .filter(({ player }) => player?.ability)
  if (entries.length === 0) return <span>—</span>
  return (
    <span className="flex items-center justify-center gap-1 flex-wrap">
      {entries.map(({ player, slotIdx }) => {
        const id = player!.ability!
        const emoji = (ABILITY_DISPLAY[id] ?? id).split(' ')[0]
        const desc = ABILITY_DESCRIPTIONS[id]
        return desc ? (
          <Tooltip key={slotIdx} content={desc} position="bottom">
            <span className="cursor-default text-2xl">{emoji}</span>
          </Tooltip>
        ) : (
          <span key={slotIdx} className="text-2xl">{emoji}</span>
        )
      })}
    </span>
  )
}

function fmtMean(v: number | null): string {
  return v !== null ? v.toFixed(1) : '—'
}

function StatRow({
  label, userVal, oppVal, userBetter, oppBetter,
}: {
  label: string
  userVal: React.ReactNode
  oppVal: React.ReactNode
  userBetter?: boolean
  oppBetter?: boolean
}) {
  return (
    <div className="grid grid-cols-[5rem_1fr_1fr] gap-x-3 items-center py-2 border-t border-gray-100 dark:border-gray-800">
      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</span>
      <div className={`text-center text-lg font-bold tabular-nums ${userBetter ? 'text-green-500 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {userVal}
      </div>
      <div className={`text-center text-lg font-bold tabular-nums ${oppBetter ? 'text-green-500 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {oppVal}
      </div>
    </div>
  )
}

interface Props {
  userRoster: Roster
  opponentRoster: Roster
  opponentTeam: string
  opponentYear: number
  weather: WeatherCondition
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
}

export function MatchupSummary({ userRoster, opponentRoster, opponentTeam, opponentYear, weather, userTurnoverNumbers, opponentTurnoverNumbers }: Props) {
  const { icon, label: weatherLabel } = WEATHER_CONFIG[weather]
  const teamColor = getTeamColor(opponentTeam)

  const uOff = mean(OFF_SLOTS, userRoster)
  const oOff = mean(OFF_SLOTS, opponentRoster)
  const uDef = mean(DEF_SLOTS, userRoster)
  const oDef = mean(DEF_SLOTS, opponentRoster)
  const uAll = mean(ALL_SLOTS, userRoster)
  const oAll = mean(ALL_SLOTS, opponentRoster)

  const hi = (a: number | null, b: number | null) => a !== null && b !== null && a > b

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      {/* Opponent header */}
      <div className="text-center mb-5">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Opponent</p>
        <div
          className="inline-block px-3 py-1 rounded-md text-white text-xl font-bold tracking-wider ring-1 ring-inset ring-white/20 mb-1"
          style={{ backgroundColor: teamColor }}
        >
          {opponentTeam}
        </div>
        <p className="text-base text-gray-500 dark:text-gray-400 font-medium">{opponentYear}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 font-medium">
          <span>{icon}</span>
          <span className="uppercase tracking-wider">{weatherLabel}</span>
        </div>
      </div>

      {/* Comparison table */}
      <div>
        {/* Column headers */}
        <div className="grid grid-cols-[5rem_1fr_1fr] gap-x-3 pb-2">
          <div />
          <div className="text-center text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Your Team</div>
          <div className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{opponentTeam}</div>
        </div>

        <StatRow label="OFF"  userVal={fmtMean(uOff)} oppVal={fmtMean(oOff)} userBetter={hi(uOff, oOff)} oppBetter={hi(oOff, uOff)} />
        <StatRow label="DEF"  userVal={fmtMean(uDef)} oppVal={fmtMean(oDef)} userBetter={hi(uDef, oDef)} oppBetter={hi(oDef, uDef)} />
        <StatRow label="All"  userVal={fmtMean(uAll)} oppVal={fmtMean(oAll)} userBetter={hi(uAll, oAll)} oppBetter={hi(oAll, uAll)} />

        <StatRow
          label="Abilities"
          userVal={<AbilityEmojis roster={userRoster} />}
          oppVal={<AbilityEmojis roster={opponentRoster} />}
        />

        <StatRow
          label="T.O.#"
          userVal={
            <div className="flex justify-center gap-1">
              {userTurnoverNumbers.map(n => <TurnoverDie key={n} value={n} />)}
            </div>
          }
          oppVal={
            <div className="flex justify-center gap-1">
              {opponentTurnoverNumbers.map(n => <TurnoverDie key={n} value={n} />)}
            </div>
          }
        />
      </div>
    </div>
  )
}
