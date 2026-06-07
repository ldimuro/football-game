import type { TeamMeta, TeamRosterData, TeamStats } from '../types'

export async function loadTeamMeta(): Promise<TeamMeta[]> {
  const res = await fetch('/data/meta.json')
  return res.json()
}

export async function loadTeamRoster(year: number, team: string): Promise<TeamRosterData> {
  const res = await fetch(`/data/players/${year}/${team}.json`)
  return res.json()
}

export async function loadTeamStats(year: number, team: string): Promise<TeamStats> {
  const res = await fetch(`/data/teams/${year}/${team}.json`)
  return res.json()
}
