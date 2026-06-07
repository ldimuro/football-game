import { describe, it, expect, vi } from 'vitest'
import { generateDraftOffer, generateOpponent } from './draftGen'

vi.mock('./dataLoader', () => ({
  loadTeamMeta: vi.fn().mockResolvedValue([{ team: 'KC', year: 2022 }]),
  loadTeamRoster: vi.fn().mockResolvedValue({
    players: [
      { id: 'qb1', name: 'QB', position: 'QB', team: 'KC', year: 2022,
        stats: { passYPG: 300, tdRatio: 0.06, intRatio: 0.01, qbr: 70 }, eraNormFactor: 1.0 },
    ],
    units: [
      { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
        stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 }, eraNormFactor: 1.0 },
    ],
  }),
  loadTeamStats: vi.fn().mockResolvedValue({
    team: 'KC', year: 2022,
    offenseRank: 3, defenseRank: 11,
    qbAvgYPG: 300, rbAvgYPG: 90, wrAvgYPG: 140, defPointsAllowed: 21,
  }),
}))

describe('generateDraftOffer', () => {
  it('returns an offer with team, year, players, and units', async () => {
    const offer = await generateDraftOffer()
    expect(offer.team).toBe('KC')
    expect(offer.year).toBe(2022)
    expect(Array.isArray(offer.players)).toBe(true)
    expect(Array.isArray(offer.units)).toBe(true)
  })
})

describe('generateOpponent', () => {
  it('returns team stats with required fields', async () => {
    const stats = await generateOpponent()
    expect(stats.team).toBe('KC')
    expect(typeof stats.offenseRank).toBe('number')
    expect(typeof stats.defPointsAllowed).toBe('number')
  })
})
