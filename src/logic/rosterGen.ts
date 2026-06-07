import { loadTeamMeta, loadTeamRoster } from './dataLoader'
import type { Roster, RosterPosition, Player, TeamUnit, TeamMeta } from '../types'

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

export async function generateRandomRoster(): Promise<Roster> {
  const positions: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
  const slots = await Promise.all(positions.map(pos => generateRandomSlot(pos)))
  return {
    QB: slots[0] as Player,
    WR1: slots[1] as Player,
    WR2: slots[2] as Player,
    RB: slots[3] as Player,
    K: slots[4] as Player,
    OLine: slots[5] as TeamUnit,
    DLine: slots[6] as TeamUnit,
    Secondary: slots[7] as TeamUnit,
  }
}
