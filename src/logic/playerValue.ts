import type { Player, TeamUnit } from '../types'
import { PRACTICE_SQUAD_ID_PREFIX } from './practiceSquad'
import { ABILITY_SHOP_COSTS } from './gameConstants'
import { ABILITY_RARITY } from './abilityEngine'

export function playerCost(rating: number | undefined): number {
  if (rating === undefined) return 5
  if (rating >= 93) return 30
  if (rating >= 85) return 20
  if (rating >= 75) return 15
  if (rating >= 65) return 10
  return 5
}

/** Coin cost of a roster slot. Empty slots and Practice Squad placeholders cost 0. */
export function slotCost(slot: Player | TeamUnit | null | undefined): number {
  if (!slot) return 0
  if (slot.id.startsWith(PRACTICE_SQUAD_ID_PREFIX)) return 0
  return playerCost(slot.rating)
}

export function abilityCost(abilityId: string): number {
  const rarity = ABILITY_RARITY[abilityId] ?? 'Common'
  return ABILITY_SHOP_COSTS[rarity]
}
