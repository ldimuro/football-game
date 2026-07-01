import { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { DieFaces } from '../ui/DieFaces'
import { getTeamColor } from '../../logic/teamColors'
import { getPlayerDie } from '../../logic/gameEngine'
import type { Player, TeamUnit } from '../../types'

function getPositionLabel(player: Player | TeamUnit): string {
  const p = player.position
  if (p === 'OLine') return 'O-Line'
  if (p === 'DLine') return 'D-Line'
  return p
}

export function PlayerRollCard({
  player,
  roll,
  isNext,
}: {
  player: Player | TeamUnit
  roll: number | null
  isNext: boolean
}) {
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (roll === null) {
      setDisplayValue(null)
      setIsAnimating(false)
      return
    }
    // Animate: cycle random die faces for 600ms then settle on actual roll
    const die = getPlayerDie(player)
    setIsAnimating(true)
    let elapsed = 0
    const DURATION = 600
    const INTERVAL = 60
    const id = setInterval(() => {
      elapsed += INTERVAL
      setDisplayValue(die[Math.floor(Math.random() * die.length)])
      if (elapsed >= DURATION) {
        clearInterval(id)
        setDisplayValue(roll)
        setIsAnimating(false)
      }
    }, INTERVAL)
    return () => clearInterval(id)
  }, [roll]) // player doesn't change during a play; roll is the trigger

  const name = 'name' in player ? player.name : `${player.team} ${getPositionLabel(player)}`
  const posLabel = getPositionLabel(player)
  const isUnit = !('name' in player)

  return (
    <div
      className={`border-2 rounded-lg p-2 flex flex-col gap-1.5 bg-white dark:bg-gray-900 ${
        isNext ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-950' : ''
      }`}
      style={{ borderColor: getTeamColor(player.team) }}
    >
      {/* Header: name (left) + roll number (right) */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide shrink-0">
              {posLabel}
            </span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight truncate">
              {name}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            <Badge label={player.team} />
            <Badge label={String(player.year)} color="blue" />
            {isUnit && <Badge label="Unit" color="gray" />}
          </div>
        </div>
        <div
          className={`text-xl font-bold tabular-nums shrink-0 transition-colors ${
            displayValue !== null
              ? isAnimating ? 'text-yellow-400' : 'text-white'
              : 'text-gray-600'
          }`}
        >
          {displayValue !== null ? displayValue : '?'}
        </div>
      </div>
      <DieFaces faces={getPlayerDie(player)} />
      {player.ability && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{player.ability}</p>
      )}
    </div>
  )
}
