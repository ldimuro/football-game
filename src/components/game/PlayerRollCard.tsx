import { useState, useEffect, useRef } from 'react'
import { Badge } from '../ui/Badge'
import { DieFaces } from '../ui/DieFaces'
import { getTeamColor } from '../../logic/teamColors'
import { getPlayerDie } from '../../logic/gameEngine'
import { ABILITY_DISPLAY, ABILITY_DESCRIPTIONS, ABILITY_RARITY } from '../../logic/abilityEngine'
import type { AbilityRarity } from '../../logic/abilityEngine'
import { Tooltip } from '../ui/Tooltip'
import {
  ROLL_ANIMATION_DURATION_MS, ROLL_ANIMATION_INTERVAL_MS,
  FG_ROLL_SCAN_INTERVAL_MS, FG_ROLL_SCAN_DURATION_MS,
  ROLL_JUMP_THRESHOLD,
  ABILITY_FLASH_COLOR, ABILITY_FLASH_DURATION_MS,
} from '../../logic/gameConstants'
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
  bonus,
  dangerFaces,
  fgAnimation,
}: {
  player: Player | TeamUnit
  roll: number | null
  isNext: boolean
  bonus?: number | null
  dangerFaces?: number[]
  fgAnimation?: boolean
}) {
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null)
  const [isJumping, setIsJumping] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const bonusRef = useRef(bonus)
  const hasFlashedRef = useRef(false)

  useEffect(() => {
    if (roll === null) {
      setDisplayValue(null)
      setIsAnimating(false)
      setHighlightedIdx(null)
      setIsJumping(false)
      setIsFlashing(false)
      hasFlashedRef.current = false
      return
    }

    const die = getPlayerDie(player)

    if (fgAnimation) {
      // Ping-pong scan: sweep left↔right across die faces, then land on rolled value
      const targetIdx = Math.max(0, die.findIndex(v => v === roll))
      let idx = 0
      let dir = 1
      let elapsed = 0
      setIsAnimating(true)
      setHighlightedIdx(0)
      setDisplayValue(die[0])

      const id = setInterval(() => {
        elapsed += FG_ROLL_SCAN_INTERVAL_MS
        if (elapsed >= FG_ROLL_SCAN_DURATION_MS) {
          clearInterval(id)
          setHighlightedIdx(targetIdx)
          setDisplayValue(roll)
          setIsAnimating(false)
          return
        }
        idx += dir
        if (idx >= die.length - 1) { idx = die.length - 1; dir = -1 }
        if (idx <= 0) { idx = 0; dir = 1 }
        setHighlightedIdx(idx)
        setDisplayValue(die[idx])
      }, FG_ROLL_SCAN_INTERVAL_MS)

      return () => clearInterval(id)
    } else {
      // Standard random-cycling animation
      setIsAnimating(true)
      let elapsed = 0
      const id = setInterval(() => {
        elapsed += ROLL_ANIMATION_INTERVAL_MS
        setDisplayValue(die[Math.floor(Math.random() * die.length)])
        if (elapsed >= ROLL_ANIMATION_DURATION_MS) {
          clearInterval(id)
          setDisplayValue(roll)
          const idx = die.findIndex(v => v === roll)
          setHighlightedIdx(idx >= 0 ? idx : null)
          setIsAnimating(false)
        }
      }, ROLL_ANIMATION_INTERVAL_MS)
      return () => clearInterval(id)
    }
  }, [roll]) // player and fgAnimation don't change mid-play

  // Keep bonusRef current so the jump check can read it without being in the roll effect's deps
  bonusRef.current = bonus

  // Trigger jump and ability flash when roll settles
  useEffect(() => {
    if (!isAnimating && displayValue !== null) {
      const total = displayValue + (bonusRef.current ?? 0)
      if (total >= ROLL_JUMP_THRESHOLD) setIsJumping(true)
      if (bonusRef.current && !hasFlashedRef.current) {
        hasFlashedRef.current = true
        setIsFlashing(true)
      }
    }
  }, [isAnimating, displayValue])

  const name = 'name' in player ? player.name : `${player.team} ${getPositionLabel(player)}`
  const posLabel = getPositionLabel(player)
  const isUnit = !('name' in player)
  const abilityDisplay = player.ability ? (ABILITY_DISPLAY[player.ability] ?? player.ability) : null
  const abilityEmoji = abilityDisplay ? abilityDisplay.split(' ')[0] : null
  const abilityName = abilityDisplay ? abilityDisplay.split(' ').slice(1).join(' ') : null

  return (
    <div
      className={`border-2 rounded-lg p-2 flex flex-col gap-1.5 bg-white dark:bg-gray-900 ${
        isNext ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-950' : ''
      } ${isFlashing ? 'animate-ability-flash' : ''}`}
      style={{
        borderColor: getTeamColor(player.team),
        '--ability-flash-color': ABILITY_FLASH_COLOR,
        '--ability-flash-duration': `${ABILITY_FLASH_DURATION_MS}ms`,
      } as React.CSSProperties}
      onAnimationEnd={(e) => { if (e.animationName === 'ability-flash') setIsFlashing(false) }}
    >
      <div className="flex items-start justify-between">
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
        {abilityEmoji && (() => {
          const desc = player.ability ? ABILITY_DESCRIPTIONS[player.ability] : undefined
          const rarity = (player.ability ? (ABILITY_RARITY[player.ability] ?? 'Common') : 'Common') as AbilityRarity
          const rarityColor = rarity === 'Rare' ? 'text-red-500 dark:text-red-400'
            : rarity === 'Uncommon' ? 'text-orange-500 dark:text-orange-400'
            : 'text-green-600 dark:text-green-400'
          const rarityBadgeColor = rarity === 'Rare' ? 'red' : rarity === 'Uncommon' ? 'orange' : 'green'
          const tooltipContent = (
            <div className="flex flex-col items-center gap-1">
              <Badge label={rarity} color={rarityBadgeColor} />
              {desc && <span>{desc}</span>}
            </div>
          )
          const inner = (
            <div className="text-right leading-none cursor-default">
              <div className="text-3xl">{abilityEmoji}</div>
              {abilityName && <div className={`text-[10px] font-semibold mt-0.5 ${rarityColor}`}>{abilityName}</div>}
            </div>
          )
          return <Tooltip content={tooltipContent} position="bottom">{inner}</Tooltip>
        })()}
      </div>
      <DieFaces faces={getPlayerDie(player)} dangerFaces={dangerFaces} highlightedIndex={highlightedIdx} />
      <div className="flex items-center justify-center gap-1.5">
        <div
          className={`text-center text-2xl font-bold tabular-nums transition-colors ${
            displayValue !== null
              ? isAnimating ? 'text-yellow-400' : 'text-white'
              : 'text-gray-600'
          } ${isJumping ? 'animate-roll-jump' : ''}`}
          onAnimationEnd={() => setIsJumping(false)}
        >
          {displayValue !== null ? displayValue : '?'}
        </div>
        {displayValue !== null && bonus !== null && bonus !== undefined && bonus !== 0 && (
          <span className={`text-2xl font-bold tabular-nums ${bonus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {bonus >= 0 ? `+${bonus}` : `${bonus}`}
          </span>
        )}
      </div>
    </div>
  )
}
