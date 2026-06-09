import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadTeamMeta, loadTeamRoster, loadTeamStats } from './dataLoader'
import type { TeamMeta, TeamRosterData, TeamStats } from '../types'

const mockMeta: TeamMeta[] = [{ team: 'KC', year: 2022 }]

const mockRoster: TeamRosterData = {
  players: [
    {
      id: 'p1', name: 'Test QB', position: 'QB', team: 'KC', year: 2022,
      stats: { passYPG: 300, avgTDPerGame: 1.8, avgINTPerGame: 0.3, completionPct: 0.64, qbr: 70 },
    },
  ],
  units: [],
}

const mockTeamStats: TeamStats = {
  team: 'KC', year: 2022,
  offenseRank: 3, defenseRank: 11,
  qbAvgYPG: 300, rbAvgYPG: 90, wrAvgYPG: 140, defPointsAllowed: 21,
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('loadTeamMeta', () => {
  it('fetches /data/meta.json and returns parsed JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMeta),
    } as Response)

    const result = await loadTeamMeta()
    expect(fetch).toHaveBeenCalledWith('/data/meta.json')
    expect(result).toEqual(mockMeta)
  })
})

describe('loadTeamRoster', () => {
  it('fetches the correct path and returns roster data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRoster),
    } as Response)

    const result = await loadTeamRoster(2022, 'KC')
    expect(fetch).toHaveBeenCalledWith('/data/players/2022/KC.json')
    expect(result.players).toHaveLength(1)
  })
})

describe('loadTeamStats', () => {
  it('fetches the correct path and returns team stats', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamStats),
    } as Response)

    const result = await loadTeamStats(2022, 'KC')
    expect(fetch).toHaveBeenCalledWith('/data/teams/2022/KC.json')
    expect(result.offenseRank).toBe(3)
  })
})
