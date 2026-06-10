import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot, generateShopOffer } from '../logic/rosterGen'
import {
  generateDraftOffer, generateOpponent,
  rerollDraftOfferTeam as genOfferNewTeam, rerollDraftOfferYear as genOfferNewYear,
} from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import { simulateGame as runSimulation } from '../logic/gameSimulator'
import { playerCost } from '../logic/playerValue'
import type {
  GamePhase, Roster, RosterPosition, Player, TeamUnit,
  DraftOffer, TeamStats, WeatherCondition, RoundRecord, SimulationResult,
} from '../types'

interface GameStore {
  phase: GamePhase
  round: number
  roster: Roster
  coins: number
  shopOffer: (Player | TeamUnit)[] | null
  shopComplete: boolean
  pendingShopBoughtId: string | null
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
  buyFromShop: (buyId: string, sellPosition: RosterPosition) => void
  sellPlayer: (position: RosterPosition) => void
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

function rosterCost(roster: Roster): number {
  return Object.values(roster).reduce(
    (sum: number, slot) => sum + (slot ? playerCost(slot.rating) : 0), 0
  )
}

function coinsForRoster(roster: Roster): number {
  return 200 - rosterCost(roster)
}

async function buildNextRoundData(remainingCoins: number) {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer, shopOffer] = await Promise.all([
    generateOpponent(),
    generateDraftOffer(),
    generateShopOffer(remainingCoins),
  ])
  const weather = generateWeather()
  return { opponent, opponentRoster, draftOffer, weather, shopOffer }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
  coins: 0,
  shopOffer: null,
  shopComplete: false,
  pendingShopBoughtId: null,
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
    const coins = coinsForRoster(roster)
    set({
      roster, phase: 'setup', round: 1, setupRerollsRemaining: 3, seasonLog: [],
      coins, shopOffer: null, shopComplete: false, pendingShopBoughtId: null, isLoading: false,
    })
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
    const { roster } = get()
    const coins = coinsForRoster(roster)
    const { opponent, opponentRoster, draftOffer, weather, shopOffer } = await buildNextRoundData(coins)
    set({
      phase: 'round-hub',
      coins,
      shopOffer,
      shopComplete: false,
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
    const {
      round, seasonLog, currentOpponent, currentWeather,
      pendingDraftedId, simulationResult, pendingShopBoughtId, coins,
    } = get()
    if (!currentOpponent || !currentWeather) return

    const record: RoundRecord = {
      round,
      opponentTeam: currentOpponent.team,
      opponentYear: currentOpponent.year,
      draftedId: pendingDraftedId,
      weather: currentWeather,
      result: simulationResult?.winner === 'user' ? 'win'
        : simulationResult?.winner === 'opponent' ? 'loss' : 'tie',
      shopBoughtId: pendingShopBoughtId,
    }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({
        seasonLog: newLog, phase: 'complete',
        simulationResult: null, draftComplete: false, pendingDraftedId: null,
        shopComplete: false, pendingShopBoughtId: null,
      })
      return
    }

    set({ isLoading: true })
    const { opponent, opponentRoster, draftOffer, weather, shopOffer } = await buildNextRoundData(coins)
    set({
      seasonLog: newLog,
      round: round + 1,
      currentOpponent: opponent,
      currentOpponentRoster: opponentRoster,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      shopOffer,
      draftRerollAvailable: true,
      draftComplete: false,
      simulationResult: null,
      pendingDraftedId: null,
      shopComplete: false,
      pendingShopBoughtId: null,
      isLoading: false,
    })
  },

  buyFromShop: (buyId, sellPosition) => {
    const { roster, shopOffer, coins } = get()
    if (!shopOffer) return
    const newPlayer = shopOffer.find(p => p.id === buyId)
    if (!newPlayer) return
    const newCost = playerCost(newPlayer.rating)
    const currentSlot = roster[sellPosition]
    const refund = currentSlot ? playerCost(currentSlot.rating) : 0
    if (newCost - refund > coins) return
    set({
      roster: { ...roster, [sellPosition]: newPlayer },
      coins: coins - newCost + refund,
      shopComplete: true,
      pendingShopBoughtId: buyId,
    })
  },

  sellPlayer: (position) => {
    const { roster, coins } = get()
    const player = roster[position]
    if (!player) return
    set({
      roster: { ...roster, [position]: null },
      coins: coins + playerCost(player.rating),
    })
  },
}))
