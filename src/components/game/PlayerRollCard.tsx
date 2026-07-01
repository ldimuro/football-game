import { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { DieFaces } from '../ui/DieFaces'
import { getTeamColor } from '../../logic/teamColors'
import { getPlayerDie } from '../../logic/gameEngine'
import { ROLL_ANIMATION_DURATION_MS, ROLL_ANIMATION_INTERVAL_MS } from '../../logic/gameConstants'
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
    // Animate: cycle random die faces then settle on actual roll
    const die = getPlayerDie(player)
    setIsAnimating(true)
    let elapsed = 0
    const id = setInterval(() => {
      elapsed += ROLL_ANIMATION_INTERVAL_MS
      setDisplayValue(die[Math.floor(Math.random() * die.length)])
      if (elapsed >= ROLL_ANIMATION_DURATION_MS) {
        clearInterval(id)
        setDisplayValue(roll)
        setIsAnimating(false)
      }
    }, ROLL_ANIMATION_INTERVAL_MS)
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
      <div>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          {posLabel}
        </span>
        <p className="text-gray-900 dark:text-white font-semibold text-xs mt-0.5 leading-tight">{name}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          <Badge label={player.team} />
          <Badge label={String(player.year)} color="blue" />
          {isUnit && <Badge label="Unit" color="gray" />}
        </div>
      </div>
      <DieFaces faces={getPlayerDie(player)} />
      {player.ability && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{player.ability}</p>
      )}
      <div
        className={`text-center text-2xl font-bold tabular-nums transition-colors ${
          displayValue !== null
            ? isAnimating ? 'text-yellow-400' : 'text-white'
            : 'text-gray-600'
        }`}
      >
        {displayValue !== null ? displayValue : '?'}
      </div>
    </div>
  )
}
