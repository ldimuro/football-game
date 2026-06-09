import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateRandomRoster, generateRandomSlot, generateShopOffer } from './rosterGen'
import { playerCost } from './playerValue'
import type { TeamRosterData } from '../types'

vi.mock('./dataLoader', () => ({
  loadTeamMeta: vi.fn().mockResolvedValue([
    { team: 'KC', year: 2022 },
    { team: 'NE', year: 2019 },
  ]),
  loadTeamRoster: vi.fn().mockResolvedValue({
    players: [
      { id: 'qb1', name: 'QB', position: 'QB', team: 'KC', year: 2022,
        stats: { passYPG: 300, avgTDPerGame: 1.8, avgINTPerGame: 0.3, completionPct: 0.64, qbr: 70 } },
      { id: 'wr1', name: 'WR', position: 'WR', team: 'KC', year: 2022,
        stats: { recYPG: 80, tdPerGame: 0.4, avgTargetsPerGame: 6.0, avgCatchesPerGame: 4.0 } },
      { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022,
        stats: { rushYPG: 70, recYPG: 18.0, tdPerGame: 0.4, rushAttPerGame: 14.0 } },
      { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022,
        stats: { fgAccuracy: 0.9, avgKickDistance: 38.0, avgMissDistance: 47.0, longestMadeKick: 55 } },
    ],
    units: [
      { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
        stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 } },
      { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
        stats: { rushYPCAllowed: 4.0, rushYPGAllowed: 105.0, sackPct: 0.07, rushTDPerGameAllowed: 0.5, blitzPct: 0.25, pressurePct: 0.22, normalizedRank: 10 } },
      { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
        stats: { completionPctAllowed: 0.63, yardsPerAttemptAllowed: 6.8, passYPGAllowed: 220.0, passTDPerGameAllowed: 1.4, interceptionsPerGame: 0.9, normalizedRank: 11 } },
    ],
  } as TeamRosterData),
}))

describe('generateRandomSlot', () => {
  it('returns a QB for the QB slot', async () => {
    const result = await generateRandomSlot('QB')
    expect(result.position).toBe('QB')
  })

  it('returns a WR player for WR1 slot', async () => {
    const result = await generateRandomSlot('WR1')
    expect(result.position).toBe('WR')
  })

  it('returns a WR player for WR2 slot', async () => {
    const result = await generateRandomSlot('WR2')
    expect(result.position).toBe('WR')
  })

  it('returns an OLine unit for the OLine slot', async () => {
    const result = await generateRandomSlot('OLine')
    expect(result.position).toBe('OLine')
  })
})

describe('generateRandomRoster', () => {
  it('fills all 8 roster slots', async () => {
    const roster = await generateRandomRoster()
    expect(roster.QB).not.toBeNull()
    expect(roster.WR1).not.toBeNull()
    expect(roster.WR2).not.toBeNull()
    expect(roster.RB).not.toBeNull()
    expect(roster.K).not.toBeNull()
    expect(roster.OLine).not.toBeNull()
    expect(roster.DLine).not.toBeNull()
    expect(roster.Secondary).not.toBeNull()
  })

  it('puts a QB in the QB slot', async () => {
    const roster = await generateRandomRoster()
    expect(roster.QB?.position).toBe('QB')
  })
})

describe('generateRandomRoster (budget-aware)', () => {
  it('total coin cost never exceeds 100', async () => {
    const roster = await generateRandomRoster()
    const slots = [
      roster.QB, roster.WR1, roster.WR2, roster.RB,
      roster.K, roster.OLine, roster.DLine, roster.Secondary,
    ]
    const total = slots.reduce((sum, s) => sum + playerCost(s?.rating), 0)
    expect(total).toBeLessThanOrEqual(100)
  })
})

describe('generateShopOffer', () => {
  it('returns exactly 3 items', async () => {
    const offer = await generateShopOffer(100)
    expect(offer).toHaveLength(3)
  })

  it('all 3 items are defined', async () => {
    const offer = await generateShopOffer(100)
    expect(offer[0]).toBeDefined()
    expect(offer[1]).toBeDefined()
    expect(offer[2]).toBeDefined()
  })

  it('returns 3 items even when coins are low', async () => {
    const offer = await generateShopOffer(0)
    expect(offer).toHaveLength(3)
  })
})
