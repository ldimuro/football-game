import type { IndividualPosition, UnitPosition } from '../types'

export const ABILITY_RATE = 0.4

const ALL_ABILITY_IDS = [
  'evens', 'odds', 'evil-evens', 'evil-odds',
  'blessed-evens', 'blessed-odds',
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

export function assignAbility(position: IndividualPosition | UnitPosition): string | undefined {
  if (Math.random() >= ABILITY_RATE) return undefined
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific]
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Always returns an ability, ignoring ABILITY_RATE. Use for guaranteed ability assignment. */
export function forceAssignAbility(position: IndividualPosition | UnitPosition): string {
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific]
  return pool[Math.floor(Math.random() * pool.length)]
}
