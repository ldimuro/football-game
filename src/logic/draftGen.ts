import { loadTeamMeta, loadTeamRoster, loadTeamStats } from './dataLoader'
import type { DraftOffer, TeamStats, TeamMeta } from '../types'

let metaCache: TeamMeta[] | null = null

async function getMeta(): Promise<TeamMeta[]> {
  if (!metaCache) metaCache = await loadTeamMeta()
  return metaCache
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function generateDraftOffer(): Promise<DraftOffer> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  return { team, year, players, units }
}

export async function generateOpponent(): Promise<TeamStats> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  return loadTeamStats(year, team)
}
