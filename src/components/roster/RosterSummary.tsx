import { computeRosterSummary } from '../../logic/stats'
import { useGameStore } from '../../store/gameStore'
import type { Roster } from '../../types'

function ratingColor(val: number | null): string {
  if (val === null) return 'text-gray-400 dark:text-gray-500'
  if (val >= 85) return 'text-green-500 dark:text-green-400'
  if (val >= 70) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

function SummaryStat({ label, value, valueClassName = 'text-gray-900 dark:text-white' }: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${valueClassName}`}>{value}</span>
    </div>
  )
}

function fmt(val: number | null): string {
  return val !== null ? val.toFixed(1) : '—'
}

export function RosterSummary({ roster }: { roster: Roster }) {
  const s = computeRosterSummary(roster)
  const { coins } = useGameStore()

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Roster Summary</h3>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-x-4 gap-y-4">
        <SummaryStat label="Total Off. YPG" value={s.totalOffensiveYPG.toFixed(1)} />
        <SummaryStat label="TDs / Game" value={s.totalTDsPerGame.toFixed(2)} />

        <div className="col-span-2 sm:col-span-6 h-px bg-gray-100 dark:bg-gray-800" />

        <SummaryStat
          label="Avg Off. Rank"
          value={fmt(s.avgOffRating)}
          valueClassName={ratingColor(s.avgOffRating)}
        />
        <SummaryStat
          label="Avg Def. Rank"
          value={fmt(s.avgDefRating)}
          valueClassName={ratingColor(s.avgDefRating)}
        />
        <SummaryStat
          label="O-Line"
          value={fmt(s.oLineRating)}
          valueClassName={ratingColor(s.oLineRating)}
        />
        <SummaryStat
          label="D-Line"
          value={fmt(s.dLineRating)}
          valueClassName={ratingColor(s.dLineRating)}
        />
        <SummaryStat
          label="Secondary"
          value={fmt(s.secondaryRating)}
          valueClassName={ratingColor(s.secondaryRating)}
        />
        <SummaryStat
          label="Avg Rank"
          value={fmt(s.avgRating)}
          valueClassName={ratingColor(s.avgRating)}
        />

        <div className="col-span-2 sm:col-span-6 h-px bg-gray-100 dark:bg-gray-800" />

        <SummaryStat label="All-Pros" value={`${s.allProCount} ⭐️`} />
        <SummaryStat
          label="Award Winners"
          value={String(s.awardWinnerCount)}
          valueClassName={s.awardWinnerCount > 0 ? 'text-yellow-500 dark:text-yellow-400' : undefined}
        />
        <SummaryStat label="Roster Filled" value={`${s.rosterFilled}/${s.rosterSize}`} />
        <SummaryStat
          label="Cap Space"
          value={`${coins} / 100`}
          valueClassName={
            coins < 20 ? 'text-red-500 dark:text-red-400'
            : coins < 50 ? 'text-yellow-500 dark:text-yellow-400'
            : 'text-green-500 dark:text-green-400'
          }
        />
      </div>
    </div>
  )
}
