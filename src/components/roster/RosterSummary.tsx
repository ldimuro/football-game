import { computeRatingStats } from '../../logic/stats'
import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
import { useGameStore } from '../../store/gameStore'
import type { Roster } from '../../types'

function ratingColor(val: number | null): string {
  if (val === null) return 'text-gray-400 dark:text-gray-500'
  if (val >= 85) return 'text-green-500 dark:text-green-400'
  if (val >= 70) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

function fmtStat(val: number | null, dec: 0 | 1 = 0): string {
  if (val === null) return '—'
  if (dec === 1) return val.toFixed(1)
  return val % 1 === 0 ? String(val) : val.toFixed(1)
}

function abilityEmoji(abilityId: string): string {
  return (ABILITY_DISPLAY[abilityId] ?? abilityId).split(' ')[0]
}

export function RosterSummary({ roster }: { roster: Roster }) {
  const { coins } = useGameStore()

  const slots = [roster.QB, roster.WR1, roster.WR2, roster.RB, roster.K, roster.OLine, roster.DLine, roster.Secondary]

  const offStats = computeRatingStats([roster.QB, roster.WR1, roster.WR2, roster.RB].map(s => s?.rating ?? null))
  const defStats = computeRatingStats([roster.DLine, roster.Secondary].map(s => s?.rating ?? null))
  const allStats = computeRatingStats(slots.map(s => s?.rating ?? null))

  const abilities = slots
    .filter(s => s?.ability)
    .map(s => ({ emoji: abilityEmoji(s!.ability!), label: ABILITY_DISPLAY[s!.ability!] ?? s!.ability! }))

  const capColor = coins < 20
    ? 'text-red-500 dark:text-red-400'
    : coins < 50
    ? 'text-yellow-500 dark:text-yellow-400'
    : 'text-green-500 dark:text-green-400'

  const rows = [
    { label: 'OFF', stats: offStats },
    { label: 'DEF', stats: defStats },
    { label: 'All', stats: allStats },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Roster Summary</h3>

      {/* Mean / Median / Mode table */}
      <table className="w-full mb-5">
        <thead>
          <tr>
            <th className="text-left pb-2" />
            {(['Mean', 'Median', 'Mode'] as const).map(col => (
              <th key={col} className="text-center text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide pb-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, stats }) => (
            <tr key={label} className="border-t border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</td>
              <td className={`py-2 text-center text-xl font-bold tabular-nums ${ratingColor(stats.mean)}`}>
                {fmtStat(stats.mean, 1)}
              </td>
              <td className={`py-2 text-center text-xl font-bold tabular-nums ${ratingColor(stats.median)}`}>
                {fmtStat(stats.median)}
              </td>
              <td className={`py-2 text-center text-xl font-bold tabular-nums ${ratingColor(stats.mode)}`}>
                {fmtStat(stats.mode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cap Space */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mb-4 flex items-baseline gap-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cap Space</span>
        <span className={`text-xl font-bold tabular-nums ${capColor}`}>{coins}</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">/ 200</span>
      </div>

      {/* Abilities */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center gap-3">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Abilities</span>
        {abilities.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
        ) : (
          <span className="flex gap-2 flex-wrap">
            {abilities.map((a, i) => (
              <span key={i} title={a.label} className="text-xl cursor-default select-none">{a.emoji}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
