import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot } from '../logic/rosterGen'
import { generateDraftOffer, generateOpponent } from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import type {
  GamePhase, Roster, RosterPosition, Player, TeamUnit,
  DraftOffer, TeamStats, WeatherCondition, RoundRecord,
} from '../types'

interface GameStore {
  phase: GamePhase
  round: number
  roster: Roster
  setupRerollsRemaining: number
  draftRerollAvailable: boolean
  currentOpponent: TeamStats | null
  currentWeather: WeatherCondition | null
  currentDraftOffer: DraftOffer | null
  seasonLog: RoundRecord[]
  isLoading: boolean

  initGame: () => Promise<void>
  rerollSetupSlot: (position: RosterPosition) => Promise<void>
  confirmSetup: () => Promise<void>
  viewDraftOffer: () => void
  rerollDraftOffer: () => Promise<void>
  draftPlayer: (id: string, targetPosition: RosterPosition) => Promise<void>
  skipDraft: () => Promise<void>
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

async function buildNextRoundData() {
  const [opponent, draftOffer] = await Promise.all([generateOpponent(), generateDraftOffer()])
  const weather = generateWeather()
  return { opponent, draftOffer, weather }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,

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
    const { opponent, draftOffer, weather } = await buildNextRoundData()
    set({
      phase: 'round-hub',
      currentOpponent: opponent,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      isLoading: false,
    })
  },

  viewDraftOffer: () => set({ phase: 'draft-offer' }),

  rerollDraftOffer: async () => {
    if (!get().draftRerollAvailable) return
    set({ isLoading: true })
    const draftOffer = await generateDraftOffer()
    set({ currentDraftOffer: draftOffer, draftRerollAvailable: false, isLoading: false })
  },

  draftPlayer: async (id, targetPosition) => {
    const { roster, currentDraftOffer, currentOpponent, currentWeather, round, seasonLog } = get()
    if (!currentDraftOffer || !currentOpponent || !currentWeather) return

    const allItems = [...currentDraftOffer.players, ...currentDraftOffer.units]
    const selected = allItems.find(item => item.id === id) as Player | TeamUnit | undefined
    if (!selected) return

    const record: RoundRecord = {
      round, opponentTeam: currentOpponent.team, opponentYear: currentOpponent.year,
      draftedId: id, weather: currentWeather,
    }
    const newRoster = { ...roster, [targetPosition]: selected }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({ roster: newRoster, seasonLog: newLog, phase: 'complete' })
      return
    }

    set({ isLoading: true })
    const { opponent, draftOffer, weather } = await buildNextRoundData()
    set({
      roster: newRoster, seasonLog: newLog,
      round: round + 1, currentOpponent: opponent, currentWeather: weather,
      currentDraftOffer: draftOffer, draftRerollAvailable: true,
      phase: 'round-hub', isLoading: false,
    })
  },

  skipDraft: async () => {
    const { currentOpponent, currentWeather, round, seasonLog } = get()
    if (!currentOpponent || !currentWeather) return

    const record: RoundRecord = {
      round, opponentTeam: currentOpponent.team, opponentYear: currentOpponent.year,
      draftedId: null, weather: currentWeather,
    }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({ seasonLog: newLog, phase: 'complete' })
      return
    }

    set({ isLoading: true })
    const { opponent, draftOffer, weather } = await buildNextRoundData()
    set({
      seasonLog: newLog, round: round + 1,
      currentOpponent: opponent, currentWeather: weather,
      currentDraftOffer: draftOffer, draftRerollAvailable: true,
      phase: 'round-hub', isLoading: false,
    })
  },
}))
