import { useState } from 'react'
import { getTeamColor } from '../../logic/teamColors'
import type { WeatherCondition, Roster, QBStats, WRStats, RBStats, OLineStats, DLineStats, SecondaryStats, RosterPosition } from '../../types'

type View = 'ypg' | 'ratings'

const WEATHER_CONFIG: Record<WeatherCondition, { icon: string; label: string }> = {
  Clear: { icon: '☀️', label: 'Clear' },
  Dome: { icon: '🏟️', label: 'Dome' },
  Rain: { icon: '🌧️', label: 'Rain' },
  HeavyWind: { icon: '💨', label: 'Heavy Wind' },
  Snow: { icon: '❄️', label: 'Snow' },
}

const POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR 1', WR2: 'WR 2', RB: 'RB', K: 'Kicker',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

function fmt(val: number | null, dec = 1): string {
  return val === null ? '—' : val.toFixed(dec)
}

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
                className={`text-center px-3 pb-2 uppercase tracking-wider whitespace-nowrap ${col.bold ? 'text-xs font-bold text-gray-600 dark:text-gray-300' : 'text-xs text-gray-400 dark:text-gray-500'} ${col.separator ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
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

function getYPGData(roster: Roster) {
  const qb = roster.QB?.stats as QBStats | undefined
  const wr1 = roster.WR1?.stats as WRStats | undefined
  const wr2 = roster.WR2?.stats as WRStats | undefined
  const rb = roster.RB?.stats as RBStats | undefined
  const sec = roster.Secondary?.stats as SecondaryStats | undefined
  const dLine = roster.DLine?.stats as DLineStats | undefined

  const recYPG = (wr1?.recYPG ?? 0) + (wr2?.recYPG ?? 0) + (rb?.recYPG ?? 0)
  const rushYPG = rb?.rushYPG ?? 0
  const passYPG = qb?.passYPG ?? 0

  return {
    totalYPG: passYPG + recYPG + rushYPG,
    recYPG,
    rushYPG,
    passAllowed: sec?.passYPGAllowed ?? null,
    rushAllowed: dLine?.rushYPGAllowed ?? null,
  }
}

function avg(vals: (number | null)[]): number | null {
  const valid = vals.filter((v): v is number => v !== null)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

interface Props {
  userRoster: Roster
  opponentRoster: Roster
  opponentTeam: string
  opponentYear: number
  weather: WeatherCondition
}

export function MatchupSummary({ userRoster, opponentRoster, opponentTeam, opponentYear, weather }: Props) {
  const [view, setView] = useState<View>('ypg')
  const { icon, label: weatherLabel } = WEATHER_CONFIG[weather]
  const teamColor = getTeamColor(opponentTeam)

  const user = getYPGData(userRoster)
  const opp = getYPGData(opponentRoster)

  const userRatings = POSITIONS.map(pos => (userRoster[pos]?.rating ?? null) as number | null)
  const oppRatings = POSITIONS.map(pos => (opponentRoster[pos]?.rating ?? null) as number | null)
  const userAvg = avg(userRatings)
  const oppAvg = avg(oppRatings)

  // indices: QB=0, WR1=1, WR2=2, RB=3 | DLine=6, Secondary=7
  const userAvgOff = avg([userRatings[0], userRatings[1], userRatings[2], userRatings[3]])
  const oppAvgOff = avg([oppRatings[0], oppRatings[1], oppRatings[2], oppRatings[3]])
  const userAvgDef = avg([userRatings[6], userRatings[7]])
  const oppAvgDef = avg([oppRatings[6], oppRatings[7]])

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

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
        <button
          onClick={() => setView('ypg')}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
            view === 'ypg'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Yards Per Game
        </button>
        <button
          onClick={() => setView('ratings')}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
            view === 'ratings'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Ratings
        </button>
      </div>

      {view === 'ypg' && (
        <StatTable columns={[
          {
            label: 'Total YPG',
            userVal: fmt(user.totalYPG),
            oppVal: fmt(opp.totalYPG),
            userBetter: user.totalYPG > opp.totalYPG,
            oppBetter: opp.totalYPG > user.totalYPG,
          },
          {
            label: 'Receiving',
            userVal: fmt(user.recYPG),
            oppVal: fmt(opp.recYPG),
            userBetter: user.recYPG > opp.recYPG,
            oppBetter: opp.recYPG > user.recYPG,
          },
          {
            label: 'Rushing',
            userVal: fmt(user.rushYPG),
            oppVal: fmt(opp.rushYPG),
            userBetter: user.rushYPG > opp.rushYPG,
            oppBetter: opp.rushYPG > user.rushYPG,
          },
          {
            label: 'Pass Allowed',
            userVal: fmt(user.passAllowed),
            oppVal: fmt(opp.passAllowed),
            userBetter: user.passAllowed !== null && opp.passAllowed !== null && user.passAllowed < opp.passAllowed,
            oppBetter: user.passAllowed !== null && opp.passAllowed !== null && opp.passAllowed < user.passAllowed,
          },
          {
            label: 'Rush Allowed',
            userVal: fmt(user.rushAllowed),
            oppVal: fmt(opp.rushAllowed),
            userBetter: user.rushAllowed !== null && opp.rushAllowed !== null && user.rushAllowed < opp.rushAllowed,
            oppBetter: user.rushAllowed !== null && opp.rushAllowed !== null && opp.rushAllowed < user.rushAllowed,
          },
        ]} />
      )}

      {view === 'ratings' && (
        <StatTable columns={[
          ...POSITIONS.map((pos, i) => {
            const u = userRatings[i]
            const o = oppRatings[i]
            return {
              label: POSITION_LABELS[pos],
              userVal: u !== null ? String(u) : '—',
              oppVal: o !== null ? String(o) : '—',
              userBetter: u !== null && o !== null && u > o,
              oppBetter: u !== null && o !== null && o > u,
            }
          }),
          {
            label: 'Avg Off',
            userVal: userAvgOff !== null ? userAvgOff.toFixed(1) : '—',
            oppVal: oppAvgOff !== null ? oppAvgOff.toFixed(1) : '—',
            userBetter: userAvgOff !== null && oppAvgOff !== null && userAvgOff > oppAvgOff,
            oppBetter: userAvgOff !== null && oppAvgOff !== null && oppAvgOff > userAvgOff,
            separator: true,
          },
          {
            label: 'Avg Def',
            userVal: userAvgDef !== null ? userAvgDef.toFixed(1) : '—',
            oppVal: oppAvgDef !== null ? oppAvgDef.toFixed(1) : '—',
            userBetter: userAvgDef !== null && oppAvgDef !== null && userAvgDef > oppAvgDef,
            oppBetter: userAvgDef !== null && oppAvgDef !== null && oppAvgDef > userAvgDef,
          },
          {
            label: 'Average',
            userVal: userAvg !== null ? userAvg.toFixed(1) : '—',
            oppVal: oppAvg !== null ? oppAvg.toFixed(1) : '—',
            userBetter: userAvg !== null && oppAvg !== null && userAvg > oppAvg,
            oppBetter: userAvg !== null && oppAvg !== null && oppAvg > userAvg,
            bold: true,
            separator: true,
          },
        ]} />
      )}
    </div>
  )
}
