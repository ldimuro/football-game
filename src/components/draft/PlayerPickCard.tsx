import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { DieFaces } from '../ui/DieFaces'
import { renderStats } from '../roster/PlayerCard'
import { getTeamColor } from '../../logic/teamColors'
import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
import type { Player, TeamUnit } from '../../types'

interface PlayerPickCardProps {
  item: Player | TeamUnit
  selected: boolean
  onClick: () => void
}

export function PlayerPickCard({ item, selected, onClick }: PlayerPickCardProps) {
  const [tab, setTab] = useState<'die' | 'stats'>('die')
  const name = 'name' in item ? item.name : `${item.team} ${item.position}`
  const isAllPro = 'is_all_pro' in item && item.is_all_pro
  const isAwardWinner = ('is_mvp' in item && item.is_mvp) || ('is_opy' in item && item.is_opy) || ('is_dpy' in item && item.is_dpy)

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
      </div>

      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700 mb-2">
        <button
          onClick={e => { e.stopPropagation(); setTab('die') }}
          className={`text-xs pb-1.5 font-semibold transition-colors ${tab === 'die' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Die
        </button>
        <button
          onClick={e => { e.stopPropagation(); setTab('stats') }}
          className={`text-xs pb-1.5 font-semibold transition-colors ${tab === 'stats' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Stats
        </button>
      </div>

      {tab === 'die' && item.die && <DieFaces faces={item.die} />}
      {tab === 'die' && !item.die && <p className="text-xs text-gray-400">—</p>}
      {tab === 'die' && item.ability && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {ABILITY_DISPLAY[item.ability] ?? item.ability}
        </p>
      )}
      {tab === 'stats' && renderStats(item, { showRank: true })}
    </div>
  )
}
