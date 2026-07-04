import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot, generateShopOffer } from '../logic/rosterGen'
import { generateAbilityShopOffer, generateAbsorbTarget } from '../logic/abilityGen'
import {
  generateDraftOffer, generateOpponent,
  rerollDraftOfferTeam as genOfferNewTeam, rerollDraftOfferYear as genOfferNewYear,
} from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import { playerCost, slotCost, abilityCost } from '../logic/playerValue'
import { CAP_SPACE } from '../logic/gameConstants'
import { getRandomRule, getRuleOverrides, getDefaultOverrides } from '../logic/leagueRules'
import type { LeagueRule } from '../logic/leagueRules'
import type { ColorScheme } from '../logic/diceGen'
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
  activeRule: LeagueRule | null
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  simulationHistory: SimulationResult[]
  dieColorScheme: ColorScheme

  initGame: () => Promise<void>
  setDieColorScheme: (scheme: ColorScheme) => void
  rerollSetupSlot: (position: RosterPosition) => Promise<void>
  confirmSetup: () => Promise<void>
  viewDraftOffer: () => void
  rerollDraftOfferTeam: () => Promise<void>
  rerollDraftOfferYear: () => Promise<void>
  draftPlayer: (id: string, targetPosition: RosterPosition) => void
  skipDraft: () => void
  startGame: () => void
  recordGameResult: (result: SimulationResult, allGameRolls: number[]) => void
  abilityShopOffer: string[] | null
  abilityShopComplete: boolean
  advanceRound: () => Promise<void>
  buyFromShop: (buyId: string, sellPosition: RosterPosition) => void
  buyAbility: (abilityId: string, targetPosition: RosterPosition) => void
  sellPlayer: (position: RosterPosition) => void
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

function rosterCost(roster: Roster): number {
  return Object.values(roster).reduce(
    (sum: number, slot) => sum + slotCost(slot), 0
  )
}

function coinsForRoster(roster: Roster): number {
  return CAP_SPACE - rosterCost(roster)
}

function generateTurnoverNumbers(dual: boolean): number[] {
  const first = Math.ceil(Math.random() * 20)
  if (!dual) return [first]
  let second = Math.ceil(Math.random() * 20)
  while (second === first) second = Math.ceil(Math.random() * 20)
  return [first, second]
}

async function buildNextRoundData(remainingCoins: number, activeRule: LeagueRule | null = null) {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer, shopOffer] = await Promise.all([
    generateOpponent(),
    generateDraftOffer(),
    generateShopOffer(remainingCoins),
  ])
  const abilityShopOffer = generateAbilityShopOffer()
  const weather = activeRule?.id === 'ice-age' ? 'Snow' as const : generateWeather()
  return { opponent, opponentRoster, draftOffer, weather, shopOffer, abilityShopOffer }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
  coins: 0,
  shopOffer: null,
  shopComplete: false,
  pendingShopBoughtId: null,
  abilityShopOffer: null,
  abilityShopComplete: false,
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
  activeRule: null,
  userTurnoverNumbers: [],
  opponentTurnoverNumbers: [],
  simulationHistory: [],
  dieColorScheme: 'rwg' as ColorScheme,

  setDieColorScheme: (scheme) => set({ dieColorScheme: scheme }),

  initGame: async () => {
    set({ isLoading: true })
    const roster = await generateRandomRoster()
    const coins = coinsForRoster(roster)
    const activeRule = getRandomRule()
    const { dualTurnoverNumbers } = activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()
    set({
      roster, phase: 'setup', round: 1, setupRerollsRemaining: 3, seasonLog: [],
      coins, shopOffer: null, shopComplete: false, pendingShopBoughtId: null, isLoading: false,
      abilityShopOffer: null, abilityShopComplete: false,
      activeRule, simulationHistory: [],
      userTurnoverNumbers: generateTurnoverNumbers(dualTurnoverNumbers),
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
    const { roster, activeRule } = get()
    const coins = coinsForRoster(roster)
    const { dualTurnoverNumbers } = activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()
    const { opponent, opponentRoster, draftOffer, weather, shopOffer, abilityShopOffer } = await buildNextRoundData(coins, activeRule)
    set({
      phase: 'round-hub',
      coins,
      shopOffer,
      shopComplete: false,
      abilityShopOffer,
      abilityShopComplete: false,
      currentOpponent: opponent,
      currentOpponentRoster: opponentRoster,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      opponentTurnoverNumbers: generateTurnoverNumbers(dualTurnoverNumbers),
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

  startGame: () => {
    set({ phase: 'game' })
  },

  recordGameResult: (result: SimulationResult, allGameRolls: number[]) => {
    const { simulationHistory, roster } = get()

    // Count season-relevant events from this game
    const offTDs = result.drives.filter(d => d.possession === 'user' && d.outcome === 'TD').length
    const defTOs = result.drives.filter(
      d => d.possession === 'opponent' && (d.outcome === 'Turnover' || d.outcome === 'DefTD')
    ).length

    // Update ability counters for each roster slot
    const updatedRoster = { ...roster } as typeof roster
    const positions: (keyof typeof roster)[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
    for (const pos of positions) {
      const slot = roster[pos]
      if (!slot?.ability) continue
      let increment = 0
      if (slot.ability === 'td-merchant' && ['QB', 'WR1', 'WR2', 'RB'].includes(pos)) {
        increment = offTDs
      } else if (slot.ability === 'to-merchant' && ['DLine', 'Secondary'].includes(pos)) {
        increment = defTOs
      } else if (slot.ability === 'absorb' && slot.abilityTarget !== undefined) {
        increment = allGameRolls.filter(r => r === slot.abilityTarget).length
      }
      if (increment > 0) {
        updatedRoster[pos] = { ...slot, abilityCounter: (slot.abilityCounter ?? 0) + increment } as never
      }
    }

    set({
      roster: updatedRoster,
      simulationResult: result,
      simulationHistory: [...simulationHistory, result],
      phase: 'round-hub',
    })
  },

  advanceRound: async () => {
    const {
      round, seasonLog, currentOpponent, currentWeather,
      pendingDraftedId, simulationResult, pendingShopBoughtId, coins, activeRule,
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
        abilityShopComplete: false,
      })
      return
    }

    set({ isLoading: true })
    const { opponent, opponentRoster, draftOffer, weather, shopOffer, abilityShopOffer } = await buildNextRoundData(coins, activeRule)
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
      abilityShopOffer,
      abilityShopComplete: false,
      opponentTurnoverNumbers: generateTurnoverNumbers(
        activeRule ? getRuleOverrides(activeRule).dualTurnoverNumbers : false
      ),
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
    const refund = slotCost(currentSlot)
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
      coins: coins + slotCost(player),
    })
  },

  buyAbility: (abilityId, targetPosition) => {
    const { roster, abilityShopOffer, coins } = get()
    if (!abilityShopOffer || !abilityShopOffer.includes(abilityId)) return
    const cost = abilityCost(abilityId)
    if (cost > coins) return
    const currentSlot = roster[targetPosition]
    if (!currentSlot) return
    const updatedSlot = {
      ...currentSlot,
      ability: abilityId,
      abilityTarget: abilityId === 'absorb' ? generateAbsorbTarget() : currentSlot.abilityTarget,
      abilityCounter: undefined,  // reset counter when ability changes
    }
    set({
      roster: { ...roster, [targetPosition]: updatedSlot },
      coins: coins - cost,
      abilityShopComplete: true,
    })
  },
}))
