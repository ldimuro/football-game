import { computeRosterSummary } from '../../logic/stats'
import { rankColorClass } from '../../logic/statColors'
import type { Roster } from '../../types'

function SummaryStat({ label, value, valueClassName = 'text-gray-900 dark:text-white' }: { label: string, value: string, valueClassName?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${valueClassName}`}>{value}</span>
    </div>
  )
}

export function RosterSummary({ roster }: { roster: Roster }) {
  const s = computeRosterSummary(roster)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Roster Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryStat label="Total Off. YPG" value={s.totalOffensiveYPG.toFixed(1)} />
        <SummaryStat label="TDs/Game" value={s.totalTDsPerGame.toFixed(2)} />
        <SummaryStat
          label="O-Line Rank"
          value={s.oLineRank !== null ? `#${s.oLineRank}` : '-'}
          valueClassName={s.oLineRank !== null ? rankColorClass(s.oLineRank) : undefined}
        />
        <SummaryStat
          label="D-Line Rank"
          value={s.dLineRank !== null ? `#${s.dLineRank}` : '-'}
          valueClassName={s.dLineRank !== null ? rankColorClass(s.dLineRank) : undefined}
        />
        <SummaryStat
          label="Secondary Rank"
          value={s.secondaryRank !== null ? `#${s.secondaryRank}` : '-'}
          valueClassName={s.secondaryRank !== null ? rankColorClass(s.secondaryRank) : undefined}
        />
        <SummaryStat label="Roster Filled" value={`${s.rosterFilled}/${s.rosterSize}`} />
        <SummaryStat label="All-Pros" value={`${s.allProCount} ⭐️`} />
        <SummaryStat label="Award Winners" value={String(s.awardWinnerCount)} valueClassName={s.awardWinnerCount > 0 ? 'text-yellow-500 dark:text-yellow-400' : undefined} />
      </div>
    </div>
  )
}
