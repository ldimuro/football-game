import leagueAverages from '../data/leagueAverages.json'

export type ColorTier = 'green' | 'orange' | 'red'

export const TIER_CLASSES: Record<ColorTier, string> = {
  green: 'text-green-400',
  orange: 'text-orange-400',
  red: 'text-red-400',
}

const AROUND_AVERAGE_BAND = 0.1

/** Whether a higher value is considered better for each stat field. Fields not
 * listed here (e.g. ranks) are colored by their own scale, not vs. league average. */
const HIGHER_IS_BETTER: Record<string, boolean> = {
  passYPG: true,
  avgTDPerGame: true,
  avgINTPerGame: false,
  completionPct: true,
  qbr: true,
  recYPG: true,
  tdPerGame: true,
  avgTargetsPerGame: true,
  avgCatchesPerGame: true,
  rushYPG: true,
  rushAttPerGame: true,
  fgAccuracy: true,
  avgKickDistance: true,
  avgMissDistance: false,
  longestMadeKick: true,
  sacksAllowedPerGame: false,
  rushYPC: true,
  rushTDPct: true,
  rushYPCAllowed: false,
  rushYPGAllowed: false,
  sackPct: true,
  rushTDPerGameAllowed: false,
  blitzPct: true,
  pressurePct: true,
  completionPctAllowed: false,
  yardsPerAttemptAllowed: false,
  passYPGAllowed: false,
  passTDPerGameAllowed: false,
  interceptionsPerGame: true,
}

export function rankColorClass(rank: number): string {
  if (rank <= 10) return TIER_CLASSES.green
  if (rank <= 20) return TIER_CLASSES.orange
  return TIER_CLASSES.red
}

function leagueAverage(year: number, position: string, field: string): number | null {
  const yearAverages = (leagueAverages as Record<string, Record<string, Record<string, number>>>)[String(year)]
  const value = yearAverages?.[position]?.[field]
  return value === undefined ? null : value
}

/** Color class for a stat value relative to its league average for that
 * year/position, or `undefined` to leave it unstyled (no average available). */
export function statColorClass(year: number, position: string, field: string, value: number | null): string | undefined {
  if (value === null) return undefined
  const direction = HIGHER_IS_BETTER[field]
  if (direction === undefined) return undefined

  const avg = leagueAverage(year, position, field)
  if (avg === null || avg === 0) return undefined

  const diff = (value - avg) / Math.abs(avg)
  if (Math.abs(diff) <= AROUND_AVERAGE_BAND) return undefined
  const isBetter = direction ? diff > 0 : diff < 0
  return isBetter ? TIER_CLASSES.green : TIER_CLASSES.red
}
