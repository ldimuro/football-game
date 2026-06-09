import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { useGameStore } from './gameStore'
import type { Roster } from '../types'

const { mockRoster } = vi.hoisted(() => {
  const mockRoster: Roster = {
    QB: { id: 'qb1', name: 'Test QB', position: 'QB', team: 'KC', year: 2022,
      stats: { passYPG: 300, avgTDPerGame: 1.8, avgINTPerGame: 0.3, completionPct: 0.64, qbr: 70 } },
    WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'KC', year: 2022,
      stats: { recYPG: 80, tdPerGame: 0.4, avgTargetsPerGame: 6.0, avgCatchesPerGame: 4.0 } },
    WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'KC', year: 2022,
      stats: { recYPG: 50, tdPerGame: 0.2, avgTargetsPerGame: 6.0, avgCatchesPerGame: 4.0 } },
    RB: { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022,
      stats: { rushYPG: 80, recYPG: 18.0, tdPerGame: 0.4, rushAttPerGame: 14.0 } },
    K: { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022,
      stats: { fgAccuracy: 0.9, avgKickDistance: 38.0, avgMissDistance: 47.0, longestMadeKick: 55 } },
    OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
      stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 } },
    DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
      stats: { rushYPCAllowed: 4.0, rushYPGAllowed: 105.0, sackPct: 0.07, rushTDPerGameAllowed: 0.5, blitzPct: 0.25, pressurePct: 0.22, normalizedRank: 10 } },
    Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
      stats: { completionPctAllowed: 0.63, yardsPerAttemptAllowed: 6.8, passYPGAllowed: 220.0, passTDPerGameAllowed: 1.4, interceptionsPerGame: 0.9, normalizedRank: 11 } },
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
  rerollDraftOfferTeam: vi.fn().mockResolvedValue({
    team: 'NE', year: 2022, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  rerollDraftOfferYear: vi.fn().mockResolvedValue({
    team: 'KC', year: 2019, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  generateOpponent: vi.fn().mockResolvedValue({
    stats: {
      team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
      qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
    },
    roster: mockRoster,
  }),
}))

vi.mock('../logic/weatherGen', () => ({
  generateWeather: vi.fn().mockReturnValue('Clear'),
}))

vi.mock('../logic/gameSimulator', () => ({
  simulateGame: vi.fn().mockReturnValue({
    userTeamLabel: 'Your Team',
    opponentTeamLabel: "NE '19",
    drives: [],
    userScore: 21,
    opponentScore: 14,
    winner: 'user' as const,
  }),
}))

const mockOpponent = {
  team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
  qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
}

const INITIAL_STATE = {
  phase: 'setup' as const,
  round: 1,
  roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentOpponentRoster: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,
  draftComplete: false,
  simulationResult: null,
  pendingDraftedId: null,
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

describe('rerollDraftOfferTeam', () => {
  it('replaces the draft offer and marks reroll as used', async () => {
    const initialOffer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: initialOffer, draftRerollAvailable: true })
    await act(async () => { await useGameStore.getState().rerollDraftOfferTeam() })
    const state = useGameStore.getState()
    expect(state.draftRerollAvailable).toBe(false)
    expect(state.currentDraftOffer?.team).toBe('NE')
  })

  it('does nothing if reroll already used', async () => {
    const offer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: offer, draftRerollAvailable: false })
    await act(async () => { await useGameStore.getState().rerollDraftOfferTeam() })
    expect(useGameStore.getState().currentDraftOffer?.team).toBe('KC')
  })
})

describe('rerollDraftOfferYear', () => {
  it('replaces the draft offer and marks reroll as used', async () => {
    const initialOffer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: initialOffer, draftRerollAvailable: true })
    await act(async () => { await useGameStore.getState().rerollDraftOfferYear() })
    const state = useGameStore.getState()
    expect(state.draftRerollAvailable).toBe(false)
    expect(state.currentDraftOffer?.year).toBe(2019)
  })

  it('does nothing if reroll already used', async () => {
    const offer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: offer, draftRerollAvailable: false })
    await act(async () => { await useGameStore.getState().rerollDraftOfferYear() })
    expect(useGameStore.getState().currentDraftOffer?.team).toBe('KC')
  })
})

describe('draftPlayer', () => {
  it('places the player into the target slot and sets draftComplete', () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer, currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    useGameStore.getState().draftPlayer('qb1', 'QB')
    const state = useGameStore.getState()
    expect(state.roster.QB?.id).toBe('qb1')
    expect(state.draftComplete).toBe(true)
    expect(state.pendingDraftedId).toBe('qb1')
    expect(state.phase).toBe('round-hub')
  })

  it('does not advance the round', () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer, currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    useGameStore.getState().draftPlayer('qb1', 'QB')
    expect(useGameStore.getState().round).toBe(1)
  })
})

describe('skipDraft', () => {
  it('sets draftComplete and returns to round-hub without advancing round', () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Rain',
      currentDraftOffer: { team: 'NE', year: 2019, players: [], units: [] },
    })
    useGameStore.getState().skipDraft()
    const state = useGameStore.getState()
    expect(state.draftComplete).toBe(true)
    expect(state.pendingDraftedId).toBeNull()
    expect(state.phase).toBe('round-hub')
    expect(state.round).toBe(1)
  })
})

describe('simulateGame', () => {
  it('sets simulationResult from the simulator module', () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponentRoster: mockRoster, currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    useGameStore.getState().simulateGame()
    const state = useGameStore.getState()
    expect(state.simulationResult).not.toBeNull()
    expect(state.simulationResult?.userTeamLabel).toBe('Your Team')
    expect(state.simulationResult?.opponentTeamLabel).toBe("NE '19")
  })

  it('does nothing if opponent roster is missing', () => {
    useGameStore.setState({ ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster })
    useGameStore.getState().simulateGame()
    expect(useGameStore.getState().simulationResult).toBeNull()
  })
})

describe('advanceRound', () => {
  it('increments round and resets draftComplete, simulationResult, pendingDraftedId', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear',
      draftComplete: true,
      simulationResult: { userTeamLabel: 'Your Team', opponentTeamLabel: "NE '19", drives: [], userScore: 21, opponentScore: 14, winner: 'user' as const },
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    const state = useGameStore.getState()
    expect(state.round).toBe(2)
    expect(state.draftComplete).toBe(false)
    expect(state.simulationResult).toBeNull()
    expect(state.pendingDraftedId).toBeNull()
    expect(state.phase).toBe('round-hub')
  })

  it('logs a round record using pendingDraftedId', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear', pendingDraftedId: 'qb1',
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    const { seasonLog } = useGameStore.getState()
    expect(seasonLog).toHaveLength(1)
    expect(seasonLog[0].draftedId).toBe('qb1')
    expect(seasonLog[0].round).toBe(1)
    expect(seasonLog[0].opponentTeam).toBe('NE')
  })

  it('logs a null draftedId when no draft was made', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().seasonLog[0].draftedId).toBeNull()
  })

  it('resets draftRerollAvailable to true', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear', draftRerollAvailable: false,
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().draftRerollAvailable).toBe(true)
  })

  it('transitions to complete phase on round 17', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, round: 17, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().phase).toBe('complete')
  })
})
