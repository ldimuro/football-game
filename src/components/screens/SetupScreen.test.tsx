import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupScreen } from './SetupScreen'
import { useGameStore } from '../../store/gameStore'
import type { Roster } from '../../types'

const mockRoster: Roster = {
  QB: { id: 'qb1', name: 'Patrick Mahomes', position: 'QB', team: 'KC', year: 2022,
    stats: { passYPG: 317, tdRatio: 0.067, intRatio: 0.011, qbr: 74 }, eraNormFactor: 1.08 },
  WR1: { id: 'wr1', name: 'Travis Kelce', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 84, tdPerGame: 0.47 }, eraNormFactor: 1.18 },
  WR2: { id: 'wr2', name: 'Mecole Hardman', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 38, tdPerGame: 0.24 }, eraNormFactor: 0.82 },
  RB: { id: 'rb1', name: 'Isiah Pacheco', position: 'RB', team: 'KC', year: 2022,
    stats: { rushYPG: 62, tdPerGame: 0.41 }, eraNormFactor: 0.94 },
  K: { id: 'k1', name: 'Harrison Butker', position: 'K', team: 'KC', year: 2022,
    stats: { fgAccuracy: 0.923 }, eraNormFactor: 1.05 },
  OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
    stats: { sacksAllowedPerGame: 2.1, rushYPC: 4.8, rushTDPct: 0.052, normalizedRank: 8 }, eraNormFactor: 1.0 },
  DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
    stats: { rushYPCAllowed: 4.1, rushYPGAllowed: 106.0, sackPct: 0.072, rushTDPerGameAllowed: 0.48, blitzPct: 0.24, pressurePct: 0.21, normalizedRank: 10 }, eraNormFactor: 1.0 },
  Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
    stats: { completionPctAllowed: 0.634, yardsPerAttemptAllowed: 6.8, passYPGAllowed: 220.0, passTDPerGameAllowed: 1.4, interceptionsPerGame: 0.9, normalizedRank: 11 }, eraNormFactor: 1.0 },
}

beforeEach(() => {
  useGameStore.setState({
    phase: 'setup', round: 1, roster: mockRoster,
    setupRerollsRemaining: 3, draftRerollAvailable: true,
    currentOpponent: null, currentWeather: null, currentDraftOffer: null,
    seasonLog: [], isLoading: false,
    initGame: vi.fn(), rerollSetupSlot: vi.fn(), confirmSetup: vi.fn(),
    viewDraftOffer: vi.fn(), rerollDraftOffer: vi.fn(),
    draftPlayer: vi.fn(), skipDraft: vi.fn(),
  })
})

describe('SetupScreen', () => {
  it('shows all 8 position labels', () => {
    render(<SetupScreen />)
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('WR1')).toBeInTheDocument()
    expect(screen.getByText('WR2')).toBeInTheDocument()
    expect(screen.getByText('RB')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('O-Line')).toBeInTheDocument()
    expect(screen.getByText('D-Line')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
  })

  it('shows the reroll count', () => {
    render(<SetupScreen />)
    expect(screen.getByText(/3 re-rolls/i)).toBeInTheDocument()
  })

  it('calls rerollSetupSlot when re-roll button clicked', async () => {
    const rerollFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ rerollSetupSlot: rerollFn } as any)
    render(<SetupScreen />)
    const rerollBtns = screen.getAllByRole('button', { name: /re-roll/i })
    await userEvent.click(rerollBtns[0])
    expect(rerollFn).toHaveBeenCalledTimes(1)
  })

  it('disables re-roll buttons when rerolls exhausted', () => {
    useGameStore.setState({ setupRerollsRemaining: 0 } as any)
    render(<SetupScreen />)
    const rerollBtns = screen.getAllByRole('button', { name: /re-roll/i })
    rerollBtns.forEach(btn => expect(btn).toBeDisabled())
  })

  it('calls confirmSetup when Start Season clicked', async () => {
    const confirmFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ confirmSetup: confirmFn } as any)
    render(<SetupScreen />)
    await userEvent.click(screen.getByRole('button', { name: /start season/i }))
    expect(confirmFn).toHaveBeenCalledTimes(1)
  })
})
