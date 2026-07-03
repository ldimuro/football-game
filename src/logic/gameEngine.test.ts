// src/logic/gameEngine.test.ts
import { describe, it, expect } from 'vitest'
import {
  rollDie, computeAdvantageBonus, computeYardsGained,
  computeFGDifficulty, getOffensePlayers, getDefensePlayers, getPlayerDie,
} from './gameEngine'
import type { Roster } from '../types'

const mockRoster: Roster = {
  QB: { id: 'qb', name: 'QB', position: 'QB', team: 'T', year: 2022, stats: {} as any, die: [10,10,10,10,10,10] },
  WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'T', year: 2022, stats: {} as any, die: [8,8,8,8,8,8] },
  WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'T', year: 2022, stats: {} as any, die: [6,6,6,6,6,6] },
  RB: { id: 'rb', name: 'RB', position: 'RB', team: 'T', year: 2022, stats: {} as any, die: [9,9,9,9,9,9] },
  K: { id: 'k', name: 'K', position: 'K', team: 'T', year: 2022, stats: {} as any, die: [7,7,7,7,7,7] },
  OLine: { id: 'ol', position: 'OLine', team: 'T', year: 2022, stats: {} as any, die: [5,5,5,5,5,5] },
  DLine: { id: 'dl', position: 'DLine', team: 'T', year: 2022, stats: {} as any, die: [4,4,4,4,4,4] },
  Secondary: { id: 'sec', position: 'Secondary', team: 'T', year: 2022, stats: {} as any, die: [3,3,3,3,3,3] },
}

describe('rollDie', () => {
  it('returns a value from the die array', () => {
    const die = [5, 10, 15]
    for (let i = 0; i < 20; i++) {
      expect(die).toContain(rollDie(die))
    }
  })
  it('uses fallback when die is empty', () => {
    const result = rollDie([])
    expect(result).toBe(5)
  })
})

describe('computeAdvantageBonus', () => {
  it('returns -5 when defense guesses correctly (run vs run-stop)', () => {
    expect(computeAdvantageBonus('run', 'run-stop')).toBe(-5)
  })
  it('returns -5 when defense guesses correctly (pass vs pass-stop)', () => {
    expect(computeAdvantageBonus('pass', 'pass-stop')).toBe(-5)
  })
  it('returns +5 when defense guesses wrong (run vs pass-stop)', () => {
    expect(computeAdvantageBonus('run', 'pass-stop')).toBe(5)
  })
  it('returns +5 when defense guesses wrong (pass vs run-stop)', () => {
    expect(computeAdvantageBonus('pass', 'run-stop')).toBe(5)
  })
})

describe('computeYardsGained', () => {
  it('subtracts def from off and adds bonus', () => {
    expect(computeYardsGained([10, 8], [5], 5)).toBe(18)  // (10+8) - 5 + 5
  })
  it('can produce negative yards', () => {
    expect(computeYardsGained([2], [10], -5)).toBe(-13)
  })
})

describe('computeFGDifficulty', () => {
  it('returns 15 at progress 60 (minimum range)', () => {
    expect(computeFGDifficulty(60)).toBe(15)
  })
  it('returns 7 at progress 82', () => {
    // round(15 - ((82-60)/39)*14) = round(15 - 7.9) = 7
    expect(computeFGDifficulty(82)).toBe(7)
  })
  it('returns 1 at progress 99 (max range)', () => {
    expect(computeFGDifficulty(99)).toBe(1)
  })
  it('clamps to 1 at progress 100', () => {
    expect(computeFGDifficulty(100)).toBe(1)
  })
  it('scales correctly when fgRangeYard=50 (Altitude rule)', () => {
    // At fgRangeYard=50: difficulty = 15 (MAX)
    expect(computeFGDifficulty(50, 50)).toBe(15)
  })
  it('returns MIN when fgRangeYard=35 and progress=99', () => {
    expect(computeFGDifficulty(99, 35)).toBe(1)
  })
})

describe('getOffensePlayers', () => {
  it('returns RB and OLine for run play', () => {
    const players = getOffensePlayers(mockRoster, 'run', 'WR1')
    expect(players.map(p => p.id)).toEqual(['rb', 'ol'])
  })
  it('returns QB, OLine, WR1 for pass play with WR1', () => {
    const players = getOffensePlayers(mockRoster, 'pass', 'WR1')
    expect(players.map(p => p.id)).toEqual(['qb', 'ol', 'wr1'])
  })
  it('returns QB, OLine, WR2 for pass play with WR2', () => {
    const players = getOffensePlayers(mockRoster, 'pass', 'WR2')
    expect(players.map(p => p.id)).toEqual(['qb', 'ol', 'wr2'])
  })
  it('filters out null slots', () => {
    const roster = { ...mockRoster, RB: null }
    const players = getOffensePlayers(roster, 'run', 'WR1')
    expect(players.map(p => p.id)).toEqual(['ol'])
  })
})

describe('getDefensePlayers', () => {
  it('returns DLine only for run defense', () => {
    const players = getDefensePlayers(mockRoster, 'run')
    expect(players.map(p => p.id)).toEqual(['dl'])
  })
  it('returns DLine and Secondary for pass defense', () => {
    const players = getDefensePlayers(mockRoster, 'pass')
    expect(players.map(p => p.id)).toEqual(['dl', 'sec'])
  })
})

describe('getPlayerDie', () => {
  it('returns the player die when present', () => {
    expect(getPlayerDie(mockRoster.QB!)).toEqual([10,10,10,10,10,10])
  })
  it('returns fallback when die is undefined', () => {
    const player = { ...mockRoster.QB!, die: undefined }
    expect(getPlayerDie(player)).toEqual([5,5,5,5,5,5])
  })
})
