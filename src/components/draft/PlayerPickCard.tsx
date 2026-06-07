import { Badge } from '../ui/Badge'
import { StatBar } from '../ui/StatBar'
import type { Player, TeamUnit, QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats } from '../../types'

interface PlayerPickCardProps {
  item: Player | TeamUnit
  selected: boolean
  onClick: () => void
}

function renderStats(item: Player | TeamUnit) {
  const s = item.stats
  if ('passYPG' in s) { const q = s as QBStats; return <StatBar label="Pass YPG" value={q.passYPG.toFixed(1)} /> }
  if ('recYPG' in s) { const w = s as WRStats; return <StatBar label="Rec YPG" value={w.recYPG.toFixed(1)} /> }
  if ('rushYPG' in s) { const r = s as RBStats; return <StatBar label="Rush YPG" value={r.rushYPG.toFixed(1)} /> }
  if ('fgAccuracy' in s) { const k = s as KStats; return <StatBar label="FG Acc" value={(k.fgAccuracy * 100).toFixed(1) + '%'} /> }
  if ('sacksAllowedPerGame' in s) { const o = s as OLineStats; return <StatBar label="Rank" value={`#${o.normalizedRank}`} /> }
  if ('sacksPerGame' in s) { const d = s as DLineStats; return <StatBar label="Rank" value={`#${d.normalizedRank}`} /> }
  const sec = s as SecondaryStats; return <StatBar label="Rank" value={`#${sec.normalizedRank}`} />
}

export function PlayerPickCard({ item, selected, onClick }: PlayerPickCardProps) {
  const name = 'name' in item ? item.name : `${item.team} ${item.position}`
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-950 ring-1 ring-indigo-500'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
        }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-white">{name}</p>
        <Badge label={item.position} color="blue" />
      </div>
      {renderStats(item)}
    </div>
  )
}
