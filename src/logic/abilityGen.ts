import type { IndividualPosition, UnitPosition, RosterPosition } from '../types'
import { ENABLED_ABILITIES, ABILITY_RARITY_WEIGHTS, SHOP_SLOTS } from './gameConstants'
import { ABILITY_RARITY } from './abilityEngine'

export const ABILITY_RATE = 0.4

export const ALL_ABILITY_IDS = [
  // 'evens', 'odds', 'evil-evens', 'evil-odds',
  // 'blessed-evens', 'blessed-odds',
  'second-half', 'clutch',
  'rain-man', 'snow-man',
  'comeback-kid', 'two-minute-drill',
  'warming-up', 'elevate', 'absorb',
]

export const POSITION_ABILITY_IDS: Record<string, string[]> = {
  QB:        ['play-action', 'in-rhythm', 'patience-qb', 'td-merchant', 'dual-threat-qb'],
  WR:        ['basketball-player', 'yac', 'td-merchant', 'patience-wr', 'feed-the-beast-wr'],
  RB:        ['workhorse', 'fresh-legs', 'goal-line', 'td-merchant', 'patience-rb', 'feed-the-beast-rb', 'dual-threat-rb'],
  K:         ['long-leg', 'money-ball'],
  OLine:     ['air-raid', 'ground-and-pound', 'psychic'],
  DLine:     ['bull-rush', 'brick-wall', 'stack-the-box', 'psychic', 'bend-dont-break', 'to-merchant'],
  Secondary: ['bend-dont-break', 'on-an-island', 'no-fly-zone', 'psychic', 'to-merchant'],
}

const POSITION_ROSTER_MAP: Record<string, RosterPosition[]> = {
  QB:        ['QB'],
  WR:        ['WR1', 'WR2'],
  RB:        ['RB'],
  K:         ['K'],
  OLine:     ['OLine'],
  DLine:     ['DLine'],
  Secondary: ['Secondary'],
}

const POSITION_READABLE: Record<string, string> = {
  QB: 'QB', WR: 'WR', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

const ALL_ROSTER_POSITIONS: RosterPosition[] = [
  'QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary',
]

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

/** Returns a random die value (1–12) to track for the Absorb ability. */
export function generateAbsorbTarget(): number {
  return Math.floor(Math.random() * 12) + 1
}

/** Returns SHOP_SLOTS unique ability IDs sampled from ENABLED_ABILITIES using rarity weights. */
export function generateAbilityShopOffer(): string[] {
  const pool = [...ENABLED_ABILITIES]
  const offer: string[] = []
  while (offer.length < SHOP_SLOTS && pool.length > 0) {
    const picked = weightedPick(pool)
    offer.push(picked)
    pool.splice(pool.indexOf(picked), 1)
  }
  return offer
}

/** Returns the roster positions that can receive the given ability. */
export function compatibleRosterPositions(abilityId: string): RosterPosition[] {
  if (ALL_ABILITY_IDS.includes(abilityId)) return [...ALL_ROSTER_POSITIONS]
  const result: RosterPosition[] = []
  for (const [pos, ids] of Object.entries(POSITION_ABILITY_IDS)) {
    if (ids.includes(abilityId)) {
      result.push(...(POSITION_ROSTER_MAP[pos] ?? []))
    }
  }
  return result
}

/**
 * Returns a human-readable label for which players can use this ability.
 * General abilities → "Any Player". Position-specific → e.g. "QB" or "O-Line, D-Line, Secondary".
 */
export function abilityPositionLabel(abilityId: string): string {
  if (ALL_ABILITY_IDS.includes(abilityId)) return 'Any Player'
  const seen = new Set<string>()
  const labels: string[] = []
  for (const [pos, ids] of Object.entries(POSITION_ABILITY_IDS)) {
    if (ids.includes(abilityId)) {
      const label = POSITION_READABLE[pos] ?? pos
      if (!seen.has(label)) { seen.add(label); labels.push(label) }
    }
  }
  return labels.join(', ') || 'Any Player'
}
