import { Badge } from '../ui/Badge'
import { renderStats, ratingTier } from '../roster/PlayerCard'
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
  const isAwardWinner = ('is_mvp' in item && item.is_mvp) || ('is_opy' in item && item.is_opy) || ('is_dpy' in item && item.is_dpy)
  const rating = item.rating
  const tier = rating !== undefined ? ratingTier(rating) : null
  return (
    <div
      onClick={onClick}
      style={{ borderColor: getTeamColor(item.team) }}
      className={`cursor-pointer rounded-lg border-2 p-3 transition-all
        ${selected ? 'ring-1 ring-indigo-500 bg-indigo-100 dark:bg-indigo-950' : isAwardWinner ? 'bg-yellow-400/20' : 'bg-white dark:bg-gray-900 hover:brightness-125'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}{isAllPro && ' ⭐️'}</p>
          <Badge label={item.position} color="blue" />
        </div>
        {tier && <span className={`text-2xl leading-none ${tier.className}`}>{rating}</span>}
      </div>
      {renderStats(item, { showRank: true })}
    </div>
  )
}
