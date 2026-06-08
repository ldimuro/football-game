import { StatBar } from '../ui/StatBar'
import { computeAggregateStats } from '../../logic/stats'
import type { Roster } from '../../types'

export function TeamStatsSummary({ roster }: { roster: Roster }) {
  const stats = computeAggregateStats(roster)
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Your Team</h3>
      <StatBar label="Pass YPG" value={stats.passYPG.toFixed(1)} />
      <StatBar label="Rush YPG" value={stats.rushYPG.toFixed(1)} />
      <StatBar label="O-Line Rank" value={`#${stats.oLineRank}`} />
      <StatBar label="D-Line Rank" value={`#${stats.dLineRank}`} />
      <StatBar label="Secondary Rank" value={`#${stats.secondaryRank}`} />
    </div>
  )
}
