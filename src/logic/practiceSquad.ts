import type { Player, IndividualPosition, QBStats, WRStats, RBStats, KStats } from '../types'

export const PRACTICE_SQUAD_RATING = 60
export const PRACTICE_SQUAD_ID_PREFIX = 'practice-squad-'

const PRACTICE_SQUAD_STATS: Record<IndividualPosition, QBStats | WRStats | RBStats | KStats> = {
  QB: { passYPG: 180, avgTDPerGame: 0.8, avgINTPerGame: 1.2, completionPct: 0.58, qbr: 40 },
  WR: { recYPG: 25, tdPerGame: 0.1, avgTargetsPerGame: 3.5, avgCatchesPerGame: 2.0 },
  RB: { rushYPG: 25, recYPG: 8, tdPerGame: 0.1, rushAttPerGame: 6 },
  K: { fgAccuracy: 0.70, avgKickDistance: 35, avgMissDistance: 42, longestMadeKick: 48 },
}

/** Placeholder roster slot for positions that haven't been filled with a real player yet. */
export function createPracticeSquadPlayer(position: IndividualPosition): Player {
  return {
    id: `${PRACTICE_SQUAD_ID_PREFIX}${position.toLowerCase()}`,
    name: 'Practice Squad',
    position,
    team: 'FA',
    year: 2024,
    stats: PRACTICE_SQUAD_STATS[position],
    rating: PRACTICE_SQUAD_RATING,
  }
}
