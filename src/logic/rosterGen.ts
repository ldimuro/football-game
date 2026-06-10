import { loadTeamMeta, loadTeamRoster } from './dataLoader'
import { playerCost } from './playerValue'
import { createPracticeSquadPlayer } from './practiceSquad'
import type {
  Roster, RosterPosition, Player, TeamUnit, TeamMeta, TeamRosterData, IndividualPosition,
  QBStats, WRStats, RBStats, KStats,
} from '../types'

let metaCache: TeamMeta[] | null = null

async function getMeta(): Promise<TeamMeta[]> {
  if (!metaCache) metaCache = await loadTeamMeta()
  return metaCache
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const UNIT_POSITIONS = new Set<RosterPosition>(['OLine', 'DLine', 'Secondary'])
const PLAYER_POSITION_MAP: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR', WR2: 'WR', RB: 'RB', K: 'K',
  OLine: 'OLine', DLine: 'DLine', Secondary: 'Secondary',
}

export async function generateRandomSlot(position: RosterPosition, retries = 5): Promise<Player | TeamUnit> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  const targetPos = PLAYER_POSITION_MAP[position]

  if (UNIT_POSITIONS.has(position)) {
    const match = units.find(u => u.position === targetPos)
    if (match) return match
  } else {
    const matches = players.filter(p => p.position === targetPos)
    if (matches.length > 0) return pickRandom(matches)
  }

  if (retries <= 0) throw new Error(`Could not find a player for position ${position}`)
  return generateRandomSlot(position, retries - 1)
}

const INDIVIDUAL_ROSTER_POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K']
const UNIT_ROSTER_POSITIONS: RosterPosition[] = ['OLine', 'DLine', 'Secondary']

export async function generateRandomRoster(): Promise<Roster> {
  const shuffled = [...INDIVIDUAL_ROSTER_POSITIONS].sort(() => Math.random() - 0.5)
  const practiceSquadPosition = shuffled[shuffled.length - 1]
  const generatedPositions = [...shuffled.slice(0, -1), ...UNIT_ROSTER_POSITIONS]

  const slots: Partial<Record<RosterPosition, Player | TeamUnit>> = {
    [practiceSquadPosition]: createPracticeSquadPlayer(PLAYER_POSITION_MAP[practiceSquadPosition] as IndividualPosition),
  }
  let remainingBudget = 150

  for (const pos of generatedPositions) {
    let best = await generateRandomSlot(pos)
    let bestCost = playerCost(best.rating)

    for (let attempt = 1; attempt < 5; attempt++) {
      if (bestCost <= remainingBudget) break
      const candidate = await generateRandomSlot(pos)
      const candidateCost = playerCost(candidate.rating)
      if (candidateCost < bestCost) {
        best = candidate
        bestCost = candidateCost
      }
    }

    slots[pos] = best
    remainingBudget = Math.max(0, remainingBudget - bestCost)
  }

  return {
    QB: slots.QB as Player,
    WR1: slots.WR1 as Player,
    WR2: slots.WR2 as Player,
    RB: slots.RB as Player,
    K: slots.K as Player,
    OLine: slots.OLine as TeamUnit,
    DLine: slots.DLine as TeamUnit,
    Secondary: slots.Secondary as TeamUnit,
  }
}

const SHOP_POSITION_POOL: RosterPosition[] = [
  'QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary',
]

export async function generateShopOffer(remainingCoins: number): Promise<(Player | TeamUnit)[]> {
  const shuffled = [...SHOP_POSITION_POOL].sort(() => Math.random() - 0.5)
  const positions = shuffled.slice(0, 3)
  const offer: (Player | TeamUnit)[] = []

  for (const pos of positions) {
    let slot = await generateRandomSlot(pos)
    for (let attempt = 1; attempt < 5; attempt++) {
      if (playerCost(slot.rating) <= remainingCoins) break
      slot = await generateRandomSlot(pos)
    }
    offer.push(slot)
  }

  return offer
}

function bestBy<T extends Player | TeamUnit>(items: T[], scoreFn: (item: T) => number): T | null {
  if (items.length === 0) return null
  return items.reduce((best, item) => (scoreFn(item) > scoreFn(best) ? item : best))
}

/** Builds a representative roster from a team's full season data, picking the top performer at each position. */
export function selectTopRoster(data: TeamRosterData): Roster {
  const { players, units } = data
  const qbs = players.filter(p => p.position === 'QB')
  const wrs = [...players.filter(p => p.position === 'WR')]
    .sort((a, b) => (b.stats as WRStats).recYPG - (a.stats as WRStats).recYPG)
  const rbs = players.filter(p => p.position === 'RB')
  const ks = players.filter(p => p.position === 'K')

  return {
    QB: bestBy(qbs, p => (p.stats as QBStats).passYPG),
    WR1: wrs[0] ?? null,
    WR2: wrs[1] ?? null,
    RB: bestBy(rbs, p => (p.stats as RBStats).rushYPG),
    K: bestBy(ks, p => (p.stats as KStats).fgAccuracy),
    OLine: units.find(u => u.position === 'OLine') ?? null,
    DLine: units.find(u => u.position === 'DLine') ?? null,
    Secondary: units.find(u => u.position === 'Secondary') ?? null,
  }
}
