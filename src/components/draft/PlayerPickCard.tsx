import { Badge } from '../ui/Badge'
import { renderStats } from '../roster/PlayerCard'
import { getTeamColor } from '../../logic/teamColors'
import type { Player, TeamUnit } from '../../types'

interface PlayerPickCardProps {
  item: Player | TeamUnit
  selected: boolean
  onClick: () => void
}

export function PlayerPickCard({ item, selected, onClick }: PlayerPickCardProps) {
  const name = 'name' in item ? item.name : `${item.team} ${item.position}`
  const isAllPro = 'is_all_pro' in item && item.is_all_pro
  const isAwardWinner = ('is_mvp' in item && item.is_mvp) || ('is_opy' in item && item.is_opy)
  return (
    <div
      onClick={onClick}
      style={{ borderLeftColor: getTeamColor(item.team) }}
      className={`cursor-pointer rounded-lg border border-l-4 p-3 transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-950 ring-1 ring-indigo-500'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
        }
        ${isAwardWinner ? 'ring-2 ring-yellow-400' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-white">{name}{isAllPro && ' ⭐️'}</p>
        <Badge label={item.position} color="blue" />
      </div>
      {renderStats(item)}
    </div>
  )
}
