import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { useGameStore } from './gameStore'
import type { Roster } from '../types'

const { mockRoster } = vi.hoisted(() => {
  const mockRoster: Roster = {
  QB: { id: 'qb1', name: 'Test QB', position: 'QB', team: 'KC', year: 2022,
    stats: { passYPG: 300, tdRatio: 0.06, intRatio: 0.01, qbr: 70 }, eraNormFactor: 1.0 },
  WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 80, tdPerGame: 0.4 }, eraNormFactor: 1.0 },
  WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 50, tdPerGame: 0.2 }, eraNormFactor: 1.0 },
  RB: { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022,
    stats: { rushYPG: 80, tdPerGame: 0.4 }, eraNormFactor: 1.0 },
  K: { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022,
    stats: { fgAccuracy: 0.9 }, eraNormFactor: 1.0 },
  OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
    stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 }, eraNormFactor: 1.0 },
  DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
    stats: { sacksPerGame: 3, rushYPCAllowed: 4.0, rushTDPctAllowed: 0.04, normalizedRank: 10 }, eraNormFactor: 1.0 },
  Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
    stats: { completionPctAllowed: 0.63, yardsPerAttemptAllowed: 6.8, tdPctAllowed: 0.038, intPct: 0.027, normalizedRank: 11 }, eraNormFactor: 1.0 },
  }
  return { mockRoster }
})

vi.mock('../logic/rosterGen', () => ({
  generateRandomRoster: vi.fn().mockResolvedValue(mockRoster),
  generateRandomSlot: vi.fn().mockResolvedValue(mockRoster.QB),
}))

vi.mock('../logic/draftGen', () => ({
  generateDraftOffer: vi.fn().mockResolvedValue({
    team: 'NE', year: 2019, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  generateOpponent: vi.fn().mockResolvedValue({
    team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
    qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
  }),
}))

vi.mock('../logic/weatherGen', () => ({
  generateWeather: vi.fn().mockReturnValue('Clear'),
}))

const INITIAL_STATE = {
  phase: 'setup' as const,
  round: 1,
  roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,
}

beforeEach(() => {
  useGameStore.setState(INITIAL_STATE)
})

describe('initGame', () => {
  it('populates roster and sets phase to setup', async () => {
    await act(async () => { await useGameStore.getState().initGame() })
    const state = useGameStore.getState()
    expect(state.phase).toBe('setup')
    expect(state.roster.QB).not.toBeNull()
    expect(state.setupRerollsRemaining).toBe(3)
  })
})

describe('rerollSetupSlot', () => {
  it('decrements setupRerollsRemaining', async () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster })
    await act(async () => { await useGameStore.getState().rerollSetupSlot('QB') })
    expect(useGameStore.getState().setupRerollsRemaining).toBe(2)
  })

  it('does not decrement when rerolls are exhausted', async () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, setupRerollsRemaining: 0 })
    await act(async () => { await useGameStore.getState().rerollSetupSlot('QB') })
    expect(useGameStore.getState().setupRerollsRemaining).toBe(0)
  })
})

describe('confirmSetup', () => {
  it('transitions to round-hub and sets opponent and weather', async () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster })
    await act(async () => { await useGameStore.getState().confirmSetup() })
    const state = useGameStore.getState()
    expect(state.phase).toBe('round-hub')
    expect(state.currentOpponent).not.toBeNull()
    expect(state.currentWeather).toBe('Clear')
  })
})

describe('viewDraftOffer', () => {
  it('transitions to draft-offer phase', () => {
    useGameStore.setState({ ...INITIAL_STATE, phase: 'round-hub' })
    useGameStore.getState().viewDraftOffer()
    expect(useGameStore.getState().phase).toBe('draft-offer')
  })
})

describe('rerollDraftOffer', () => {
  it('replaces the draft offer and marks reroll as used', async () => {
    const initialOffer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: initialOffer, draftRerollAvailable: true })
    await act(async () => { await useGameStore.getState().rerollDraftOffer() })
    const state = useGameStore.getState()
    expect(state.draftRerollAvailable).toBe(false)
    expect(state.currentDraftOffer?.team).toBe('NE')
  })

  it('does nothing if reroll already used', async () => {
    const offer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: offer, draftRerollAvailable: false })
    await act(async () => { await useGameStore.getState().rerollDraftOffer() })
    expect(useGameStore.getState().currentDraftOffer?.team).toBe('KC')
  })
})

describe('draftPlayer', () => {
  it('places the player into the target slot and logs the round', async () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer, currentOpponent: {
        team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
        qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
      }, currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().draftPlayer('qb1', 'QB') })
    const state = useGameStore.getState()
    expect(state.seasonLog).toHaveLength(1)
    expect(state.seasonLog[0].draftedId).toBe('qb1')
  })

  it('transitions to complete phase on round 17', async () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, round: 17, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer,
      currentOpponent: { team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1, qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8 },
      currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().draftPlayer('qb1', 'QB') })
    expect(useGameStore.getState().phase).toBe('complete')
  })
})

describe('skipDraft', () => {
  it('logs the round with draftedId null and advances', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentOpponent: { team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1, qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8 },
      currentWeather: 'Rain', currentDraftOffer: { team: 'NE', year: 2019, players: [], units: [] },
    })
    await act(async () => { await useGameStore.getState().skipDraft() })
    const state = useGameStore.getState()
    expect(state.seasonLog[0].draftedId).toBeNull()
    expect(state.round).toBe(2)
  })
})
