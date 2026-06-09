import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useGameStore } from './store/gameStore'

vi.mock('./store/gameStore', () => ({
  useGameStore: vi.fn(),
}))

const baseState = {
  phase: 'setup', round: 1, roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  setupRerollsRemaining: 3, draftRerollAvailable: true,
  currentOpponent: null, currentOpponentRoster: null, currentWeather: null, currentDraftOffer: null,
  seasonLog: [], isLoading: false,
  initGame: vi.fn().mockResolvedValue(undefined),
  rerollSetupSlot: vi.fn(), confirmSetup: vi.fn(), viewDraftOffer: vi.fn(),
  rerollDraftOfferTeam: vi.fn(), rerollDraftOfferYear: vi.fn(), draftPlayer: vi.fn(), skipDraft: vi.fn(),
}

describe('App', () => {
  it('renders SetupScreen in setup phase', () => {
    vi.mocked(useGameStore).mockReturnValue({ ...baseState, phase: 'setup' } as any)
    render(<App />)
    expect(screen.getByText(/Starting Roster/i)).toBeInTheDocument()
  })

  it('renders RoundHub in round-hub phase', () => {
    vi.mocked(useGameStore).mockReturnValue({
      ...baseState,
      phase: 'round-hub',
      currentOpponent: { team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1, qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8 },
      currentOpponentRoster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
      currentWeather: 'Clear',
    } as any)
    render(<App />)
    expect(screen.getByText(/Week/i)).toBeInTheDocument()
  })

  it('renders CompleteScreen in complete phase', () => {
    vi.mocked(useGameStore).mockReturnValue({ ...baseState, phase: 'complete', seasonLog: [] } as any)
    render(<App />)
    expect(screen.getByText(/Season Complete/i)).toBeInTheDocument()
  })
})
