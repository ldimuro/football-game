import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DraftOffer } from './DraftOffer'
import { useGameStore } from '../../store/gameStore'

const mockOffer = {
  team: 'NE', year: 2019,
  players: [
    { id: 'qb_brady', name: 'Tom Brady', position: 'QB' as const, team: 'NE', year: 2019,
      stats: { passYPG: 240, avgTDPerGame: 1.74, avgINTPerGame: 0.39, completionPct: 0.64, qbr: 61 } },
    { id: 'wr_edelman', name: 'Julian Edelman', position: 'WR' as const, team: 'NE', year: 2019,
      stats: { recYPG: 72, tdPerGame: 0.35, avgTargetsPerGame: 6.0, avgCatchesPerGame: 4.0 } },
  ],
  units: [
    { id: 'sec_ne', position: 'Secondary' as const, team: 'NE', year: 2019,
      stats: { completionPctAllowed: 0.571, yardsPerAttemptAllowed: 5.9, passYPGAllowed: 195.0, passTDPerGameAllowed: 1.1, interceptionsPerGame: 1.2, normalizedRank: 1 } },
  ],
}

const mockRoster = {
  QB: { id: 'qb_old', name: 'Old QB', position: 'QB' as const, team: 'KC', year: 2022,
    stats: { passYPG: 317, avgTDPerGame: 2.01, avgINTPerGame: 0.33, completionPct: 0.64, qbr: 74 } },
  WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null,
}

beforeEach(() => {
  useGameStore.setState({
    phase: 'draft-offer', round: 3, roster: mockRoster as any,
    currentDraftOffer: mockOffer, draftRerollAvailable: true,
    currentOpponent: null, currentWeather: null,
    seasonLog: [], isLoading: false, setupRerollsRemaining: 0,
    initGame: vi.fn(), rerollSetupSlot: vi.fn(), confirmSetup: vi.fn(),
    viewDraftOffer: vi.fn(),
    rerollDraftOfferTeam: vi.fn().mockResolvedValue(undefined),
    rerollDraftOfferYear: vi.fn().mockResolvedValue(undefined),
    draftPlayer: vi.fn().mockResolvedValue(undefined),
    skipDraft: vi.fn().mockResolvedValue(undefined),
  })
})

describe('DraftOffer', () => {
  it('shows the offering team and year', () => {
    render(<DraftOffer />)
    expect(screen.getByText(/NE/)).toBeInTheDocument()
    expect(screen.getByText(/2019/)).toBeInTheDocument()
  })

  it('shows all players and units in the offer', () => {
    render(<DraftOffer />)
    expect(screen.getByText('Tom Brady')).toBeInTheDocument()
    expect(screen.getByText('Julian Edelman')).toBeInTheDocument()
    expect(screen.getByText(/NE Secondary/i)).toBeInTheDocument()
  })

  it('enables Select Player after selecting a non-WR player', async () => {
    render(<DraftOffer />)
    await userEvent.click(screen.getByText('Tom Brady'))
    expect(screen.getByRole('button', { name: /select player/i })).not.toBeDisabled()
  })

  it('shows the confirm-pick comparison modal after clicking Select Player on a non-WR player', async () => {
    render(<DraftOffer />)
    await userEvent.click(screen.getByText('Tom Brady'))
    await userEvent.click(screen.getByRole('button', { name: /select player/i }))
    expect(screen.getByText(/confirm your pick/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm pick/i })).toBeInTheDocument()
  })

  it('calls skipDraft when Skip is clicked', async () => {
    const skipFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ skipDraft: skipFn } as any)
    render(<DraftOffer />)
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(skipFn).toHaveBeenCalledTimes(1)
  })

  it('calls rerollDraftOfferTeam when Re-Roll Team is clicked', async () => {
    const rerollFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ rerollDraftOfferTeam: rerollFn } as any)
    render(<DraftOffer />)
    await userEvent.click(screen.getByRole('button', { name: /re-roll team/i }))
    expect(rerollFn).toHaveBeenCalledTimes(1)
  })

  it('calls rerollDraftOfferYear when Re-Roll Year is clicked', async () => {
    const rerollFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ rerollDraftOfferYear: rerollFn } as any)
    render(<DraftOffer />)
    await userEvent.click(screen.getByRole('button', { name: /re-roll year/i }))
    expect(rerollFn).toHaveBeenCalledTimes(1)
  })

  it('shows SlotChooser when a WR is selected and Select Player is clicked', async () => {
    render(<DraftOffer />)
    await userEvent.click(screen.getByText('Julian Edelman'))
    await userEvent.click(screen.getByRole('button', { name: /select player/i }))
    expect(screen.getByText(/WR1/)).toBeInTheDocument()
    expect(screen.getByText(/WR2/)).toBeInTheDocument()
  })
})
