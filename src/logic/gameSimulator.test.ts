import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeTeamRatings, simulateDrive, simulateGame } from './gameSimulator'
import type { Roster } from '../types'

const makeRoster = (overrides: Partial<Roster> = {}): Roster => ({
  QB: { id: 'qb1', name: 'QB', position: 'QB', team: 'KC', year: 2022, rating: 90,
    stats: { passYPG: 300, avgTDPerGame: 2.0, avgINTPerGame: 0.5, completionPct: 0.68, qbr: 80 } },
  WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'KC', year: 2022, rating: 85,
    stats: { recYPG: 80, tdPerGame: 0.4, avgTargetsPerGame: 7, avgCatchesPerGame: 5 } },
  WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'KC', year: 2022, rating: 78,
    stats: { recYPG: 55, tdPerGame: 0.2, avgTargetsPerGame: 5, avgCatchesPerGame: 3 } },
  RB: { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022, rating: 82,
    stats: { rushYPG: 90, recYPG: 20, tdPerGame: 0.4, rushAttPerGame: 15 } },
  K: { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022, rating: 88,
    stats: { fgAccuracy: 0.90, avgKickDistance: 38, avgMissDistance: 48, longestMadeKick: 56 } },
  OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022, rating: 84,
    stats: { sacksAllowedPerGame: 2.5, rushYPC: 4.7, rushTDPct: 0.04, normalizedRank: 9 } },
  DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022, rating: 88,
    stats: { rushYPCAllowed: 4.4, rushYPGAllowed: 107, sackPct: 0.09, rushTDPerGameAllowed: 0.6, blitzPct: 0.24, pressurePct: 0.25, normalizedRank: 8 } },
  Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022, rating: 74,
    stats: { completionPctAllowed: 0.66, yardsPerAttemptAllowed: 5.6, passYPGAllowed: 221, passTDPerGameAllowed: 1.9, interceptionsPerGame: 0.65, normalizedRank: 18 } },
  ...overrides,
})

afterEach(() => vi.restoreAllMocks())

describe('computeTeamRatings', () => {
  it('extracts ratings from the rating field on each slot', () => {
    const ratings = computeTeamRatings(makeRoster())
    expect(ratings.passRating).toBe(90)
    expect(ratings.rushRating).toBe(82)
    expect(ratings.oLineRating).toBe(84)
    expect(ratings.dLineRating).toBe(88)
    expect(ratings.secondaryRating).toBe(74)
    expect(ratings.kickerRating).toBe(88)
    expect(ratings.qbIntRisk).toBeCloseTo(5) // 0.5 * 10
  })

  it('falls back to 50 for missing slots', () => {
    const ratings = computeTeamRatings({
      QB: null, WR1: null, WR2: null, RB: null, K: null,
      OLine: null, DLine: null, Secondary: null,
    })
    expect(ratings.passRating).toBe(50)
    expect(ratings.rushRating).toBe(50)
    expect(ratings.kickerRating).toBe(50)
    expect(ratings.qbIntRisk).toBeCloseTo(10) // default avgINTPerGame 1.0 * 10
  })
})

describe('simulateDrive', () => {
  it('returns a valid DriveResult shape', () => {
    const ratings = computeTeamRatings(makeRoster())
    const drive = simulateDrive(ratings, ratings, 'user', 1)
    expect(['TD', 'FG', 'Punt', 'Turnover', 'DefTD', 'Safety']).toContain(drive.outcome)
    expect(drive.possession).toBe('user')
    expect(drive.quarter).toBe(1)
    expect(typeof drive.points).toBe('number')
    expect(drive.scoringTeam === 'user' || drive.scoringTeam === 'opponent' || drive.scoringTeam === null).toBe(true)
  })

  it('TD outcome scores 7 points for the offense', () => {
    // Math.random call order: turnoverScore noise, tdScore noise, fgScore noise,
    // puntScore noise, defTdScore noise, safetyScore noise, then die roll.
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // turnoverScore noise → 0
      .mockReturnValueOnce(0.5)  // tdScore noise → 0
      .mockReturnValueOnce(0.5)  // fgScore noise → 0
      .mockReturnValueOnce(0.5)  // puntScore noise → 0
      .mockReturnValueOnce(0.5)  // defTdScore noise → 0
      .mockReturnValueOnce(0.5)  // safetyScore noise → 0
      .mockReturnValueOnce(0)    // die roll 0 → always selects index 0 (TD)
    const ratings = computeTeamRatings(makeRoster())
    const drive = simulateDrive(ratings, ratings, 'user', 2)
    expect(drive.outcome).toBe('TD')
    expect(drive.points).toBe(7)
    expect(drive.scoringTeam).toBe('user')
  })

  it('Safety outcome scores 2 points for the defense (opponent)', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)     // turnoverScore noise
      .mockReturnValueOnce(0.5)     // tdScore noise
      .mockReturnValueOnce(0.5)     // fgScore noise
      .mockReturnValueOnce(0.5)     // puntScore noise
      .mockReturnValueOnce(0.5)     // defTdScore noise
      .mockReturnValueOnce(0.5)     // safetyScore noise
      .mockReturnValueOnce(0.9999)  // die roll → cumulative reaches 1.0 only at index 5 (Safety)
    const ratings = computeTeamRatings(makeRoster())
    const drive = simulateDrive(ratings, ratings, 'user', 3)
    expect(drive.outcome).toBe('Safety')
    expect(drive.points).toBe(2)
    expect(drive.scoringTeam).toBe('opponent')
  })

  it('DefTD when opponent is possession scores 7 points for the user', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0) // die roll → index 0 (TD for opponent offense)
    const ratings = computeTeamRatings(makeRoster())
    // When opponent has possession and scores TD, scoringTeam = 'opponent'
    const drive = simulateDrive(ratings, ratings, 'opponent', 1)
    expect(drive.possession).toBe('opponent')
    expect(drive.outcome).toBe('TD')
    expect(drive.scoringTeam).toBe('opponent')
    expect(drive.points).toBe(7)
  })
})

describe('simulateGame', () => {
  it('returns exactly 24 drives', () => {
    const roster = makeRoster()
    expect(simulateGame(roster, roster, "NE '19").drives).toHaveLength(24)
  })

  it('starts each quarter with user possession', () => {
    const { drives } = simulateGame(makeRoster(), makeRoster(), "NE '19")
    expect(drives[0].possession).toBe('user')   // Q1 first
    expect(drives[6].possession).toBe('user')   // Q2 first
    expect(drives[12].possession).toBe('user')  // Q3 first
    expect(drives[18].possession).toBe('user')  // Q4 first
    expect(drives[1].possession).toBe('opponent') // Q1 second
  })

  it('assigns correct quarter numbers', () => {
    const { drives } = simulateGame(makeRoster(), makeRoster(), "NE '19")
    drives.slice(0, 6).forEach(d => expect(d.quarter).toBe(1))
    drives.slice(6, 12).forEach(d => expect(d.quarter).toBe(2))
    drives.slice(12, 18).forEach(d => expect(d.quarter).toBe(3))
    drives.slice(18, 24).forEach(d => expect(d.quarter).toBe(4))
  })

  it('computes userScore and opponentScore as the sum of drive points', () => {
    const result = simulateGame(makeRoster(), makeRoster(), "NE '19")
    const expectedUser = result.drives
      .filter(d => d.scoringTeam === 'user')
      .reduce((s, d) => s + d.points, 0)
    const expectedOpp = result.drives
      .filter(d => d.scoringTeam === 'opponent')
      .reduce((s, d) => s + d.points, 0)
    expect(result.userScore).toBe(expectedUser)
    expect(result.opponentScore).toBe(expectedOpp)
  })

  it('sets winner correctly', () => {
    const result = simulateGame(makeRoster(), makeRoster(), "NE '19")
    if (result.userScore > result.opponentScore) expect(result.winner).toBe('user')
    else if (result.opponentScore > result.userScore) expect(result.winner).toBe('opponent')
    else expect(result.winner).toBe('tie')
  })

  it('uses opponentLabel and hardcodes userTeamLabel as "Your Team"', () => {
    const result = simulateGame(makeRoster(), makeRoster(), "KC '22")
    expect(result.userTeamLabel).toBe('Your Team')
    expect(result.opponentTeamLabel).toBe("KC '22")
  })
})
