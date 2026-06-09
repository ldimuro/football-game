import { describe, it, expect } from 'vitest'
import { computeAggregateStats } from './stats'
import type { Roster } from '../types'

const emptyRoster: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

describe('computeAggregateStats', () => {
  it('returns zeros and mid-ranks for an empty roster', () => {
    const stats = computeAggregateStats(emptyRoster)
    expect(stats.passYPG).toBe(0)
    expect(stats.rushYPG).toBe(0)
    expect(stats.oLineRank).toBe(16)
    expect(stats.dLineRank).toBe(16)
    expect(stats.secondaryRank).toBe(16)
  })

  it('reads passYPG from QB stats', () => {
    const roster: Roster = {
      ...emptyRoster,
      QB: {
        id: 'q1', name: 'Test QB', position: 'QB', team: 'XX', year: 2020,
        stats: { passYPG: 280, avgTDPerGame: 1.5, avgINTPerGame: 0.6, completionPct: 0.64, qbr: 60 },
      },
    }
    expect(computeAggregateStats(roster).passYPG).toBe(280)
  })

  it('reads rushYPG from RB stats', () => {
    const roster: Roster = {
      ...emptyRoster,
      RB: {
        id: 'r1', name: 'Test RB', position: 'RB', team: 'XX', year: 2020,
        stats: { rushYPG: 95, recYPG: 18.0, tdPerGame: 0.5, rushAttPerGame: 14.0 },
      },
    }
    expect(computeAggregateStats(roster).rushYPG).toBe(95)
  })

  it('reads unit ranks from roster units', () => {
    const roster: Roster = {
      ...emptyRoster,
      OLine: {
        id: 'o1', position: 'OLine', team: 'XX', year: 2020,
        stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 7 },
      },
      DLine: {
        id: 'd1', position: 'DLine', team: 'XX', year: 2020,
        stats: { sacksPerGame: 3, rushYPCAllowed: 4.0, rushTDPctAllowed: 0.04, normalizedRank: 9 },
      },
      Secondary: {
        id: 's1', position: 'Secondary', team: 'XX', year: 2020,
        stats: { completionPctAllowed: 0.62, yardsPerAttemptAllowed: 6.5, passYPGAllowed: 215.0, passTDPerGameAllowed: 1.3, interceptionsPerGame: 1.0, normalizedRank: 5 },
      },
    }
    const agg = computeAggregateStats(roster)
    expect(agg.oLineRank).toBe(7)
    expect(agg.dLineRank).toBe(9)
    expect(agg.secondaryRank).toBe(5)
  })
})
