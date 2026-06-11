import type {
  Player, TeamUnit, IndividualPosition, UnitPosition,
  QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats,
} from '../types'

export const PRACTICE_SQUAD_RATING = 60
export const PRACTICE_SQUAD_ID_PREFIX = 'practice-squad-'

const PRACTICE_SQUAD_PLAYER_STATS: Record<IndividualPosition, QBStats | WRStats | RBStats | KStats> = {
  QB: { passYPG: 180, avgTDPerGame: 0.8, avgINTPerGame: 1.2, completionPct: 0.58, qbr: 40 },
  WR: { recYPG: 25, tdPerGame: 0.1, avgTargetsPerGame: 3.5, avgCatchesPerGame: 2.0 },
  RB: { rushYPG: 25, recYPG: 8, tdPerGame: 0.1, rushAttPerGame: 6 },
  K: { fgAccuracy: 0.70, avgKickDistance: 35, avgMissDistance: 42, longestMadeKick: 48 },
}

const PRACTICE_SQUAD_UNIT_STATS: Record<UnitPosition, OLineStats | DLineStats | SecondaryStats> = {
  OLine: { sacksAllowedPerGame: 3.2, rushYPC: 3.6, rushTDPct: 0.02, normalizedRank: 25 },
  DLine: { rushYPCAllowed: 4.9, rushYPGAllowed: 135, sackPct: 0.05, rushTDPerGameAllowed: 1.2, blitzPct: 0.18, pressurePct: 0.16, normalizedRank: 25 },
  Secondary: { completionPctAllowed: 0.70, yardsPerAttemptAllowed: 6.9, passYPGAllowed: 240, passTDPerGameAllowed: 1.8, interceptionsPerGame: 0.5, normalizedRank: 25 },
}

/** Placeholder roster slot for individual positions that haven't been filled with a real player yet. */
export function createPracticeSquadPlayer(position: IndividualPosition): Player {
  return {
    id: `${PRACTICE_SQUAD_ID_PREFIX}${position.toLowerCase()}`,
    name: 'Practice Squad',
    position,
    team: 'FA',
    year: 2024,
    stats: PRACTICE_SQUAD_PLAYER_STATS[position],
    rating: PRACTICE_SQUAD_RATING,
  }
}

/** Placeholder roster slot for unit positions that haven't been filled with a real unit yet. */
export function createPracticeSquadUnit(position: UnitPosition): TeamUnit {
  return {
    id: `${PRACTICE_SQUAD_ID_PREFIX}${position.toLowerCase()}`,
    position,
    team: 'FA',
    year: 2024,
    stats: PRACTICE_SQUAD_UNIT_STATS[position],
    rating: PRACTICE_SQUAD_RATING,
  }
}
