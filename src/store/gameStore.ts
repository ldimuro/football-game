import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot } from '../logic/rosterGen'
import {
  generateDraftOffer, generateOpponent,
  rerollDraftOfferTeam as genOfferNewTeam, rerollDraftOfferYear as genOfferNewYear,
} from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import { simulateGame as runSimulation } from '../logic/gameSimulator'
import type {
  GamePhase, Roster, RosterPosition, Player, TeamUnit,
  DraftOffer, TeamStats, WeatherCondition, RoundRecord, SimulationResult,
} from '../types'

interface GameStore {
  phase: GamePhase
  round: number
  roster: Roster
  setupRerollsRemaining: number
  draftRerollAvailable: boolean
  currentOpponent: TeamStats | null
  currentOpponentRoster: Roster | null
  currentWeather: WeatherCondition | null
  currentDraftOffer: DraftOffer | null
  seasonLog: RoundRecord[]
  isLoading: boolean
  draftComplete: boolean
  simulationResult: SimulationResult | null
  pendingDraftedId: string | null

  initGame: () => Promise<void>
  rerollSetupSlot: (position: RosterPosition) => Promise<void>
  confirmSetup: () => Promise<void>
  viewDraftOffer: () => void
  rerollDraftOfferTeam: () => Promise<void>
  rerollDraftOfferYear: () => Promise<void>
  draftPlayer: (id: string, targetPosition: RosterPosition) => void
  skipDraft: () => void
  simulateGame: () => void
  advanceRound: () => Promise<void>
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

async function buildNextRoundData() {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer] = await Promise.all([generateOpponent(), generateDraftOffer()])
  const weather = generateWeather()
  return { opponent, opponentRoster, draftOffer, weather }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
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

  initGame: async () => {
    set({ isLoading: true })
    const roster = await generateRandomRoster()
    set({ roster, phase: 'setup', round: 1, setupRerollsRemaining: 3, seasonLog: [], isLoading: false })
  },

  rerollSetupSlot: async (position) => {
    const { setupRerollsRemaining, roster } = get()
    if (setupRerollsRemaining <= 0) return
    set({ isLoading: true })
    const newSlot = await generateRandomSlot(position)
    set({
      roster: { ...roster, [position]: newSlot },
      setupRerollsRemaining: setupRerollsRemaining - 1,
      isLoading: false,
    })
  },

  confirmSetup: async () => {
    set({ isLoading: true })
    const { opponent, opponentRoster, draftOffer, weather } = await buildNextRoundData()
    set({
      phase: 'round-hub',
      currentOpponent: opponent,
      currentOpponentRoster: opponentRoster,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      isLoading: false,
    })
  },

  viewDraftOffer: () => set({ phase: 'draft-offer' }),

  rerollDraftOfferTeam: async () => {
    const { draftRerollAvailable, currentDraftOffer } = get()
    if (!draftRerollAvailable || !currentDraftOffer) return
    set({ isLoading: true })
    const draftOffer = await genOfferNewTeam(currentDraftOffer.team, currentDraftOffer.year)
    set({ currentDraftOffer: draftOffer, draftRerollAvailable: false, isLoading: false })
  },

  rerollDraftOfferYear: async () => {
    const { draftRerollAvailable, currentDraftOffer } = get()
    if (!draftRerollAvailable || !currentDraftOffer) return
    set({ isLoading: true })
    const draftOffer = await genOfferNewYear(currentDraftOffer.team, currentDraftOffer.year)
    set({ currentDraftOffer: draftOffer, draftRerollAvailable: false, isLoading: false })
  },

  draftPlayer: (id, targetPosition) => {
    const { roster, currentDraftOffer } = get()
    if (!currentDraftOffer) return

    const allItems = [...currentDraftOffer.players, ...currentDraftOffer.units]
    const selected = allItems.find(item => item.id === id) as Player | TeamUnit | undefined
    if (!selected) return

    set({
      roster: { ...roster, [targetPosition]: selected },
      draftComplete: true,
      pendingDraftedId: id,
      phase: 'round-hub',
    })
  },

  skipDraft: () => {
    set({ draftComplete: true, pendingDraftedId: null, phase: 'round-hub' })
  },

  simulateGame: () => {
    const { roster, currentOpponentRoster, currentOpponent } = get()
    if (!currentOpponentRoster || !currentOpponent) return
    const opponentLabel = `${currentOpponent.team} '${String(currentOpponent.year).slice(2)}`
    const result = runSimulation(roster, currentOpponentRoster, opponentLabel)
    set({ simulationResult: result })
  },

  advanceRound: async () => {
    const { round, seasonLog, currentOpponent, currentWeather, pendingDraftedId, simulationResult } = get()
    if (!currentOpponent || !currentWeather) return

    const record: RoundRecord = {
      round,
      opponentTeam: currentOpponent.team,
      opponentYear: currentOpponent.year,
      draftedId: pendingDraftedId,
      weather: currentWeather,
      result: simulationResult?.winner === 'user' ? 'win' : simulationResult?.winner === 'opponent' ? 'loss' : 'tie',
    }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({
        seasonLog: newLog, phase: 'complete',
        simulationResult: null, draftComplete: false, pendingDraftedId: null,
      })
      return
    }

    set({ isLoading: true })
    const { opponent, opponentRoster, draftOffer, weather } = await buildNextRoundData()
    set({
      seasonLog: newLog,
      round: round + 1,
      currentOpponent: opponent,
      currentOpponentRoster: opponentRoster,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      draftComplete: false,
      simulationResult: null,
      pendingDraftedId: null,
      isLoading: false,
    })
  },
}))
