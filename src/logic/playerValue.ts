import type { Player, TeamUnit } from '../types'
import { PRACTICE_SQUAD_ID_PREFIX } from './practiceSquad'

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
