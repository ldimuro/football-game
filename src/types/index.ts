export type IndividualPosition = 'QB' | 'WR' | 'RB' | 'K'
export type UnitPosition = 'OLine' | 'DLine' | 'Secondary'
export type RosterPosition = 'QB' | 'WR1' | 'WR2' | 'RB' | 'K' | 'OLine' | 'DLine' | 'Secondary'
export type GamePhase = 'setup' | 'round-hub' | 'draft-offer' | 'complete'
export type WeatherCondition = 'Clear' | 'Rain' | 'Snow' | 'HeavyWind' | 'Dome'

export interface QBStats {
  passYPG: number
  avgTDPerGame: number
  avgINTPerGame: number
  completionPct: number
  qbr: number
}

export interface WRStats {
  recYPG: number
  tdPerGame: number
  avgTargetsPerGame: number | null
  avgCatchesPerGame: number
}

export interface RBStats {
  rushYPG: number
  recYPG: number
  tdPerGame: number
  rushAttPerGame: number
}

export interface KStats {
  fgAccuracy: number
  avgKickDistance: number
  avgMissDistance: number
  longestMadeKick: number
}

export interface OLineStats {
  sacksAllowedPerGame: number
  rushYPC: number
  rushTDPct: number
  normalizedRank: number
}

export interface DLineStats {
  rushYPCAllowed: number
  rushYPGAllowed: number
  sackPct: number
  rushTDPerGameAllowed: number
  blitzPct: number | null
  pressurePct: number | null
  normalizedRank: number
}

export interface SecondaryStats {
  completionPctAllowed: number
  yardsPerAttemptAllowed: number
  passYPGAllowed: number
  passTDPerGameAllowed: number
  interceptionsPerGame: number
  normalizedRank: number
}

export interface Player {
  id: string
  name: string
  position: IndividualPosition
  team: string
  year: number
  stats: QBStats | WRStats | RBStats | KStats
  eraNormFactor: number
  is_all_pro?: boolean
  is_mvp?: boolean
  is_opy?: boolean
  is_dpy?: boolean
}

export interface TeamUnit {
  id: string
  position: UnitPosition
  team: string
  year: number
  stats: OLineStats | DLineStats | SecondaryStats
  eraNormFactor: number
}

export interface TeamMeta {
  team: string
  year: number
}

export interface TeamStats {
  team: string
  year: number
  offenseRank: number
  defenseRank: number
  qbAvgYPG: number
  rbAvgYPG: number
  wrAvgYPG: number
  defPointsAllowed: number
}

export interface DraftOffer {
  team: string
  year: number
  players: Player[]
  units: TeamUnit[]
}

export interface RoundRecord {
  round: number
  opponentTeam: string
  opponentYear: number
  draftedId: string | null
  weather: WeatherCondition
}

export interface Roster {
  QB: Player | null
  WR1: Player | null
  WR2: Player | null
  RB: Player | null
  K: Player | null
  OLine: TeamUnit | null
  DLine: TeamUnit | null
  Secondary: TeamUnit | null
}

export interface AggregateStats {
  passYPG: number
  rushYPG: number
  oLineRank: number
  dLineRank: number
  secondaryRank: number
}

export interface RosterSummary {
  totalOffensiveYPG: number
  totalTDsPerGame: number
  oLineRank: number | null
  dLineRank: number | null
  secondaryRank: number | null
  allProCount: number
  awardWinnerCount: number
  rosterFilled: number
  rosterSize: number
}

export interface TeamRosterData {
  players: Player[]
  units: TeamUnit[]
}
