import type { IndividualPosition, UnitPosition } from '../types'
import { ENABLED_ABILITIES, ABILITY_RARITY_WEIGHTS } from './gameConstants'
import { ABILITY_RARITY } from './abilityEngine'

export const ABILITY_RATE = 0.4

const ALL_ABILITY_IDS = [
  // 'evens', 'odds', 'evil-evens', 'evil-odds',
  // 'blessed-evens', 'blessed-odds',
  'second-half', 'clutch',
  'rain-man', 'snow-man',
  'comeback-kid', 'two-minute-drill',
]

const POSITION_ABILITY_IDS: Record<string, string[]> = {
  QB:        ['play-action', 'in-rhythm'],
  WR:        ['basketball-player', 'yac'],
  RB:        ['workhorse', 'fresh-legs', 'goal-line'],
  K:         [],
  OLine:     ['air-raid', 'ground-and-pound', 'psychic'],
  DLine:     ['bull-rush', 'brick-wall', 'stack-the-box', 'psychic', 'bend-dont-break'],
  Secondary: ['bend-dont-break', 'on-an-island', 'no-fly-zone', 'psychic'],
}

function weightedPick(pool: string[]): string {
  const weights = pool.map(id => ABILITY_RARITY_WEIGHTS[ABILITY_RARITY[id] ?? 'Common'])
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export function assignAbility(position: IndividualPosition | UnitPosition): string | undefined {
  if (Math.random() >= ABILITY_RATE) return undefined
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific].filter(id => ENABLED_ABILITIES.has(id))
  if (pool.length === 0) return undefined
  return weightedPick(pool)
}

/** Always returns an ability, ignoring ABILITY_RATE. Use for guaranteed ability assignment. */
export function forceAssignAbility(position: IndividualPosition | UnitPosition): string | undefined {
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific].filter(id => ENABLED_ABILITIES.has(id))
  if (pool.length === 0) return undefined
  return weightedPick(pool)
}
