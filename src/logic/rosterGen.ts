import { loadTeamMeta, loadTeamRoster } from './dataLoader'
import { rng } from './rng'
import { playerCost } from './playerValue'
import { createPracticeSquadPlayer, createPracticeSquadUnit } from './practiceSquad'
import { assignDie } from './diceGen'
import { assignAbility, forceAssignAbility, generateAbsorbTarget } from './abilityGen'
import {
  SHOP_SLOTS,
  SETUP_GOOD_MIN_RATING, SETUP_GOOD_MAX_RATING,
  SETUP_GREAT_MIN_RATING, SETUP_GREAT_MAX_RATING,
  SETUP_ELITE_MIN_RATING,
  SETUP_ABILITY_MIN, SETUP_ABILITY_MAX,
} from './gameConstants'
import type {
  Roster, RosterPosition, Player, TeamUnit, TeamMeta, TeamRosterData, IndividualPosition, UnitPosition,
  QBStats, WRStats, RBStats, KStats,
} from '../types'

let metaCache: TeamMeta[] | null = null

async function getMeta(): Promise<TeamMeta[]> {
  if (!metaCache) metaCache = await loadTeamMeta()
  return metaCache
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function withAbsorbTarget<T extends Player | TeamUnit>(player: T): T {
  if (player.ability === 'absorb') {
    return { ...player, abilityTarget: generateAbsorbTarget() } as T
  }
  return player
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
    if (match) return withAbsorbTarget({ ...match, die: assignDie(match.rating), ability: assignAbility(match.position as UnitPosition) })
  } else {
    const matches = players.filter(p => p.position === targetPos)
    if (matches.length > 0) {
      const picked = pickRandom(matches)
      return withAbsorbTarget({ ...picked, die: assignDie(picked.rating), ability: assignAbility(picked.position) })
    }
  }

  if (retries <= 0) throw new Error(`Could not find a player for position ${position}`)
  return generateRandomSlot(position, retries - 1)
}

const INDIVIDUAL_ROSTER_POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K']
const UNIT_ROSTER_POSITIONS: RosterPosition[] = ['OLine', 'DLine', 'Secondary']
const ALL_ROSTER_POSITIONS: RosterPosition[] = [...INDIVIDUAL_ROSTER_POSITIONS, ...UNIT_ROSTER_POSITIONS]

const GENERATED_SLOT_COUNT = 3

/** Generates a slot whose rating falls within [minRating, maxRating]. Returns without an ability. */
async function generateSlotInTier(
  position: RosterPosition,
  minRating: number,
  maxRating: number,
  retries = 15,
): Promise<Player | TeamUnit> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  const targetPos = PLAYER_POSITION_MAP[position]
  const inTier = (r: number | undefined) => r !== undefined && r >= minRating && r <= maxRating

  if (UNIT_POSITIONS.has(position)) {
    const match = units.find(u => u.position === targetPos && inTier(u.rating))
    if (match) return { ...match, die: assignDie(match.rating), ability: undefined }
  } else {
    const matches = players.filter(p => p.position === targetPos && inTier(p.rating))
    if (matches.length > 0) {
      const picked = pickRandom(matches)
      return { ...picked, die: assignDie(picked.rating), ability: undefined }
    }
  }

  if (retries <= 0) {
    // Fallback: accept any player at this position
    const slot = await generateRandomSlot(position)
    return { ...slot, ability: undefined }
  }
  return generateSlotInTier(position, minRating, maxRating, retries - 1)
}

export async function generateRandomRoster(): Promise<Roster> {
  const shuffled = [...ALL_ROSTER_POSITIONS].sort(() => rng() - 0.5)
  const generatedPositions = shuffled.slice(0, GENERATED_SLOT_COUNT)
  const practiceSquadPositions = shuffled.slice(GENERATED_SLOT_COUNT)

  const slots: Partial<Record<RosterPosition, Player | TeamUnit>> = {}
  for (const pos of practiceSquadPositions) {
    const slot = UNIT_POSITIONS.has(pos)
      ? createPracticeSquadUnit(PLAYER_POSITION_MAP[pos] as UnitPosition)
      : createPracticeSquadPlayer(PLAYER_POSITION_MAP[pos] as IndividualPosition)
    slot.die = assignDie(slot.rating)
    const ab = assignAbility(slot.position as IndividualPosition | UnitPosition)
    slot.ability = ab
    if (ab === 'absorb') slot.abilityTarget = generateAbsorbTarget()
    slots[pos] = slot
  }

  // One player per tier, shuffled across the 3 generated positions
  const tierBounds: [number, number][] = (
    [
      [SETUP_GOOD_MIN_RATING, SETUP_GOOD_MAX_RATING],
      [SETUP_GREAT_MIN_RATING, SETUP_GREAT_MAX_RATING],
      [SETUP_ELITE_MIN_RATING, 99],
    ] as [number, number][]
  ).sort(() => rng() - 0.5)

  const generatedSlots: (Player | TeamUnit)[] = []
  for (let i = 0; i < generatedPositions.length; i++) {
    const [minRating, maxRating] = tierBounds[i]
    const slot = await generateSlotInTier(generatedPositions[i], minRating, maxRating)
    generatedSlots.push(slot)
    slots[generatedPositions[i]] = slot
  }

  // Guarantee 1–2 of the 3 starting players have an ability
  const abilityCount = SETUP_ABILITY_MIN + Math.floor(rng() * (SETUP_ABILITY_MAX - SETUP_ABILITY_MIN + 1))
  const abilityIndices = [...Array(generatedPositions.length).keys()]
    .sort(() => rng() - 0.5)
    .slice(0, abilityCount)
  for (const idx of abilityIndices) {
    const pos = generatedPositions[idx]
    const base = generatedSlots[idx]
    slots[pos] = withAbsorbTarget({ ...base, ability: forceAssignAbility(base.position as IndividualPosition | UnitPosition) })
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
  const shuffled = [...SHOP_POSITION_POOL].sort(() => rng() - 0.5)
  const positions = shuffled.slice(0, SHOP_SLOTS)
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

  function withExtras<T extends Player | TeamUnit>(slot: T | null): T | null {
    return slot ? withAbsorbTarget({ ...slot, die: assignDie(slot.rating), ability: assignAbility(slot.position) } as T) : null
  }

  return {
    QB: withExtras(bestBy(qbs, p => (p.stats as QBStats).passYPG)),
    WR1: withExtras(wrs[0] ?? null),
    WR2: withExtras(wrs[1] ?? null),
    RB: withExtras(bestBy(rbs, p => (p.stats as RBStats).rushYPG)),
    K: withExtras(bestBy(ks, p => (p.stats as KStats).fgAccuracy)),
    OLine: withExtras(units.find(u => u.position === 'OLine') ?? null),
    DLine: withExtras(units.find(u => u.position === 'DLine') ?? null),
    Secondary: withExtras(units.find(u => u.position === 'Secondary') ?? null),
  }
}
