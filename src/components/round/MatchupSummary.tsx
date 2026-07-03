import { getTeamColor } from '../../logic/teamColors'
import { computeRatingStats } from '../../logic/stats'
import type { WeatherCondition, Roster } from '../../types'

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

interface StatColumn {
  label: string
  userVal: string
  oppVal: string
  userBetter: boolean
  oppBetter: boolean
  bold?: boolean
  separator?: boolean
}

function StatTable({ columns }: { columns: StatColumn[] }) {
  const cellClass = (col: StatColumn, better: boolean) =>
    `text-center tabular-nums px-3 py-2 whitespace-nowrap ${col.bold ? 'text-sm font-bold' : 'text-sm font-semibold'} ${better ? 'text-green-500 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'} ${col.separator ? 'border-l border-gray-200 dark:border-gray-700' : ''}`

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-0" />
            {columns.map(col => (
              <th
                key={col.label}
                className={`text-center px-3 pb-2 text-xs uppercase tracking-wider whitespace-nowrap ${col.bold ? 'font-bold text-gray-600 dark:text-gray-300' : 'font-normal text-gray-400 dark:text-gray-500'} ${col.separator ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-100 dark:border-gray-800">
            <td className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider pr-3 py-2 whitespace-nowrap">Your Team</td>
            {columns.map(col => (
              <td key={col.label} className={cellClass(col, col.userBetter)}>{col.userVal}</td>
            ))}
          </tr>
          <tr className="border-t border-gray-100 dark:border-gray-800">
            <td className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pr-3 py-2 whitespace-nowrap">Opponent</td>
            {columns.map(col => (
              <td key={col.label} className={cellClass(col, col.oppBetter)}>{col.oppVal}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function fmtMean(val: number | null): string {
  return val !== null ? val.toFixed(1) : '—'
}

function fmtStat(val: number | null): string {
  if (val === null) return '—'
  return val % 1 === 0 ? String(val) : val.toFixed(1)
}

function hi(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && a > b
}

function statsColumns(
  prefix: string,
  userStats: ReturnType<typeof computeRatingStats>,
  oppStats: ReturnType<typeof computeRatingStats>,
  separator?: boolean,
): StatColumn[] {
  return [
    {
      label: `${prefix} Mean`,
      userVal: fmtMean(userStats.mean),
      oppVal: fmtMean(oppStats.mean),
      userBetter: hi(userStats.mean, oppStats.mean),
      oppBetter: hi(oppStats.mean, userStats.mean),
      separator,
    },
    {
      label: `${prefix} Med`,
      userVal: fmtStat(userStats.median),
      oppVal: fmtStat(oppStats.median),
      userBetter: hi(userStats.median, oppStats.median),
      oppBetter: hi(oppStats.median, userStats.median),
    },
    {
      label: `${prefix} Mode`,
      userVal: fmtStat(userStats.mode),
      oppVal: fmtStat(oppStats.mode),
      userBetter: hi(userStats.mode, oppStats.mode),
      oppBetter: hi(oppStats.mode, userStats.mode),
    },
  ]
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

  const ratings = (slots: RosterKey[], roster: Roster) => slots.map(k => roster[k]?.rating ?? null)

  const userOff = computeRatingStats(ratings(OFF_SLOTS, userRoster))
  const oppOff  = computeRatingStats(ratings(OFF_SLOTS, opponentRoster))
  const userDef = computeRatingStats(ratings(DEF_SLOTS, userRoster))
  const oppDef  = computeRatingStats(ratings(DEF_SLOTS, opponentRoster))
  const userAll = computeRatingStats(ratings(ALL_SLOTS, userRoster))
  const oppAll  = computeRatingStats(ratings(ALL_SLOTS, opponentRoster))

  const columns: StatColumn[] = [
    ...statsColumns('OFF', userOff, oppOff),
    ...statsColumns('DEF', userDef, oppDef, true),
    ...statsColumns('All', userAll, oppAll, true),
    {
      label: 'T.O. #',
      userVal: userTurnoverNumbers.join(', '),
      oppVal: opponentTurnoverNumbers.join(', '),
      userBetter: false,
      oppBetter: false,
      separator: true,
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
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

      <StatTable columns={columns} />
    </div>
  )
}
