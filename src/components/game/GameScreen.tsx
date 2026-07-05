// src/components/game/GameScreen.tsx
import { useReducer, useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { GameHUD } from './GameHUD'
import { PlayArea } from './PlayArea'
import { PlayerRollCard } from './PlayerRollCard'
import { Button } from '../ui/Button'
import {
  rollDie, computeAdvantageBonus, computeYardsGained,
  computeFGDifficulty, getOffensePlayers, getDefensePlayers, getPlayerDie,
} from '../../logic/gameEngine'
import {
  DRIVES_PER_GAME,
  DRIVES_PER_QUARTER,
  STARTING_YARD_LINE,
  FG_ROLL_SCAN_DURATION_MS,
} from '../../logic/gameConstants'
import { getRuleOverrides, getDefaultOverrides } from '../../logic/leagueRules'
import { rng } from '../../logic/rng'
import type { RuleOverrides } from '../../logic/leagueRules'
import { drawHand, applyCardYards, CARDS } from '../../logic/playbookCards'
import { RosterGrid } from '../roster/RosterGrid'
import type { Roster, Player, TeamUnit, DriveResult, DriveOutcome, SimulationResult, WeatherCondition, PlaybookCard } from '../../types'
import {
  computeRollBonus, computePostRollBonus, isPostRollAbility,
} from '../../logic/abilityEngine'
import type { AbilityContext } from '../../logic/abilityEngine'

function isPlayer(p: Player | TeamUnit): p is Player {
  return 'name' in p
}

function checkFeedTheBeastTrigger(
  totalRuns: number,
  totalPasses: number,
  wr1Plays: number,
  wr2Plays: number,
): { rbTrigger: boolean; wr1Trigger: boolean; wr2Trigger: boolean } {
  const total = totalRuns + totalPasses
  if (total < 4) return { rbTrigger: false, wr1Trigger: false, wr2Trigger: false }
  return {
    rbTrigger: totalPasses === 0,
    wr1Trigger: totalRuns === 0 && wr1Plays === total,
    wr2Trigger: totalRuns === 0 && wr2Plays === total,
  }
}

// ─── Internal types ────────────────────────────────────────────────────────────

type PlayPhase =
  | 'choose-offense'
  | 'choose-wr'
  | 'choose-runner'
  | 'choose-defense'
  | 'fourth-down-choice'
  | 'rolling-pairs'
  | 'show-play-result'
  | 'drive-end'
  | 'fg-roll'
  | 'fg-result'
  | 'turnover'
  | 'game-over'

interface GameState {
  driveIndex: number
  possession: 'user' | 'opponent'
  down: number
  driveProgress: number
  userScore: number
  opponentScore: number
  driveHistory: DriveResult[]
  downHistory: { playCall: 'run' | 'pass', yardsGained: number }[]
  phase: PlayPhase
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  selectedWR: 'WR1' | 'WR2' | 'RB' | null
  opponentPlayCall: 'run' | 'pass' | null
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | 'Turnover' | 'TurnoverOnDowns' | 'Safety' | null
  weather: WeatherCondition
  userPlayHistory: ('run' | 'pass')[]
  opponentPlayHistory: ('run' | 'pass')[]
  userRunsThisDrive: number
  opponentRunsThisDrive: number
  wr1YacActive: boolean
  wr2YacActive: boolean
  offBonuses: (number | null)[]
  defBonuses: (number | null)[]
  currentDriveYards: number
  currentDrivePassYards: number
  currentDriveRushYards: number
  currentDriveNegativePlays: number
  userPassPlaysThisDrive: number
  opponentPassPlaysThisDrive: number
  userFeedTheBeast: { RB: number; WR1: number; WR2: number }
  opponentFeedTheBeast: { RB: number; WR1: number; WR2: number }
  userDriveWR1Plays: number
  userDriveWR2Plays: number
  opponentDriveWR1Plays: number
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  tdPoints: number
  fgPoints: number
  tdYard: number
  fgRangeYard: number
  userFgRangeYard: number
  opponentFgRangeYard: number
  activeFgPoints: number | null  // overrides fgPoints for the current FG kick; null = use fgPoints
  userKickerAbility: string | undefined
  opponentKickerAbility: string | undefined
  rzYard: number
  maxDowns: number
  noPuntingRule: boolean
  pick2Rule: boolean
  wentForIt: boolean
  turnoverYardLine: number | null
  nextDriveStartYard: number
  userAbsorbHits: number
  userHand: PlaybookCard[]
  activeCard: PlaybookCard | null
  cardBonus: number
  deepShotFallback: { off: (Player | TeamUnit)[]; def: (Player | TeamUnit)[] } | null
}

type GameAction =
  // For run: opponentDefCall required; for pass: omit it (set in CHOOSE_WR instead)
  | { type: 'CHOOSE_OFF_PLAY'; call: 'run' | 'pass'; opponentDefCall?: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[]; card: PlaybookCard }
  // CHOOSE_WR: defPlayers already in state from CHOOSE_OFF_PLAY(pass); only offPlayers changes
  | { type: 'CHOOSE_WR'; wr: 'WR1' | 'WR2' | 'RB'; opponentDefCall: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; deepShotFallback?: { off: (Player | TeamUnit)[]; def: (Player | TeamUnit)[] } }
  | { type: 'SHOW_RUNNER_CHOICE'; card: PlaybookCard }
  | { type: 'CHOOSE_RUNNER'; runner: 'QB' | 'RB'; opponentDefCall: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
  | { type: 'CHOOSE_DEF_PLAY'; call: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
  | { type: 'ROLL_PAIR'; offIndex: number; offValue: number; defIndex: number | null; defValue: number | null }
  | { type: 'RESOLVE_PLAY'; nextOpponentPlayCall: 'run' | 'pass' }
  | { type: 'FG_ROLL_START'; value: number }
  | { type: 'FG_ROLL'; value: number }
  | { type: 'ADVANCE_DRIVE'; nextOpponentPlayCall: 'run' | 'pass' }
  | { type: 'KICK_FG'; effectiveFgRangeYard: number; effectiveFgPoints: number }
  | { type: 'FOURTH_DOWN_GO_FOR_IT' }
  | { type: 'FOURTH_DOWN_PUNT' }
  | { type: 'BACK_TO_PLAY_CHOICE' }
  | { type: 'DEEP_SHOT_SWITCH'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function randomPlayCall(): 'run' | 'pass' {
  return rng() < 0.5 ? 'run' : 'pass'
}

function randomDefCall(): 'run-stop' | 'pass-stop' {
  return rng() < 0.5 ? 'run-stop' : 'pass-stop'
}

function driveReset(maxDowns: number): Partial<GameState> {
  return {
    down: 1,
    driveProgress: STARTING_YARD_LINE,
    downHistory: [],
    wentForIt: false,
    offensePlayCall: null,
    defensePlayCall: null,
    selectedWR: null,
    offPlayers: [],
    defPlayers: [],
    offRolls: [],
    defRolls: [],
    yardsGained: null,
    fgRoll: null,
    fgDifficulty: null,
    driveOutcome: null,
    activeFgPoints: null,
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
    currentDriveYards: 0,
    currentDrivePassYards: 0,
    currentDriveRushYards: 0,
    currentDriveNegativePlays: 0,
    userPassPlaysThisDrive: 0,
    opponentPassPlaysThisDrive: 0,
    userDriveWR1Plays: 0,
    userDriveWR2Plays: 0,
    opponentDriveWR1Plays: 0,
    turnoverYardLine: null,
    userHand: drawHand(maxDowns),
    activeCard: null,
    cardBonus: 0,
    deepShotFallback: null,
  }
}

function playReset(): Partial<GameState> {
  return {
    offensePlayCall: null,
    defensePlayCall: null,
    selectedWR: null,
    offPlayers: [],
    defPlayers: [],
    offRolls: [],
    defRolls: [],
    yardsGained: null,
    driveOutcome: null,
    wentForIt: false,
    offBonuses: [],
    defBonuses: [],
    activeCard: null,
    cardBonus: 0,
    deepShotFallback: null,
  }
}

function buildDriveResult(
  state: GameState,
  outcome: DriveOutcome,
  points: number,
  stats?: {
    yards: number
    passYards: number
    rushYards: number
    runPlays: number
    passPlays: number
    negativePlays: number
    scoringPlayerName?: string
    scoringPlayerPos?: 'RB' | 'WR'
    fgRoll?: number
    fgDifficulty?: number
  },
): DriveResult {
  const quarter = Math.floor(state.driveIndex / DRIVES_PER_QUARTER) + 1
  const scoringTeam = points > 0 ? state.possession : null
  return { possession: state.possession, quarter, outcome, scoringTeam, points, ...stats }
}

function buildAbilityContext(
  side: 'offense' | 'defense',
  state: GameState,
  allOffRolls: (number | null)[],
  allDefRolls: (number | null)[],
): AbilityContext {
  const quarter = Math.floor(state.driveIndex / DRIVES_PER_QUARTER) + 1
  const playerTeamIsUser =
    (side === 'offense' && state.possession === 'user') ||
    (side === 'defense' && state.possession === 'opponent')
  const playerTeamIsLosing = playerTeamIsUser
    ? state.userScore < state.opponentScore
    : state.opponentScore < state.userScore
  const isLastTeamDrive =
    side === 'offense' && (
      (state.possession === 'user' && state.driveIndex === DRIVES_PER_GAME - 2) ||
      (state.possession === 'opponent' && state.driveIndex === DRIVES_PER_GAME - 1)
    )
  // side-relative: own = evaluating player's team, opp = the other team
  const offenseHistory = state.possession === 'user' ? state.userPlayHistory : state.opponentPlayHistory
  const defenseHistory = state.possession === 'user' ? state.opponentPlayHistory : state.userPlayHistory
  const ownPlayHistory = side === 'offense' ? offenseHistory : defenseHistory
  const oppPlayHistory = side === 'offense' ? defenseHistory : offenseHistory
  const offenseRunsThisDrive = state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive
  const ownRunsThisDrive = side === 'offense' ? offenseRunsThisDrive : 0  // defense has no runs this drive
  const olineIdx = state.offPlayers.findIndex(p => p.position === 'OLine')
  const olineRoll = olineIdx >= 0 ? (allOffRolls[olineIdx] ?? null) : null
  const wrPlayer = state.offPlayers.find(p => isPlayer(p) && p.position === 'WR') as Player | undefined
  return {
    quarter,
    driveIndex: state.driveIndex,
    possession: state.possession,
    playerSide: side,
    playerTeamIsLosing,
    isLastTeamDrive,
    driveProgress: state.driveProgress,
    rzYard: state.rzYard,
    down: state.down,
    playCall: state.offensePlayCall!,
    weather: state.weather,
    ownPlayHistory,
    oppPlayHistory,
    ownRunsThisDrive,
    wrYacActive: false,   // overridden per-player below for WRs
    olineRoll,
    opponentWRRating: wrPlayer?.rating,
    allOffRolls,
    allDefRolls,
    downHistory: state.downHistory,
    feedTheBeastBonus: 0,   // overridden per-player in ROLL_PAIR (Task 4)
    abilityCounter: 0,      // overridden per-player in ROLL_PAIR (Task 3)
  }
}

function recomputeBlessed(
  players: (Player | TeamUnit)[],
  bonuses: (number | null)[],
  side: 'offense' | 'defense',
  state: GameState,
  allOffRolls: (number | null)[],
  allDefRolls: (number | null)[],
): (number | null)[] {
  const result = [...bonuses]
  const baseCtx = buildAbilityContext(side, state, allOffRolls, allDefRolls)  // hoisted
  players.forEach((player, i) => {
    if (player.ability && isPostRollAbility(player.ability)) {
      const ctx = { ...baseCtx, abilityCounter: player.abilityCounter ?? 0 }
      result[i] = computePostRollBonus(player.ability, ctx)
    }
  })
  return result
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CHOOSE_OFF_PLAY': {
      const { call, opponentDefCall, offPlayers, defPlayers, card } = action
      if (call === 'pass') {
        // opponentDefCall is set later in CHOOSE_WR to avoid generating two random values
        return {
          ...state,
          offensePlayCall: 'pass',
          defPlayers,
          defBonuses: new Array(defPlayers.length).fill(null),
          activeCard: card,
          phase: 'choose-wr',
        }
      }
      return {
        ...state,
        offensePlayCall: 'run',
        defensePlayCall: opponentDefCall ?? 'run-stop',
        offPlayers,
        defPlayers,
        offRolls: new Array(offPlayers.length).fill(null),
        defRolls: new Array(defPlayers.length).fill(null),
        offBonuses: new Array(offPlayers.length).fill(null),
        defBonuses: new Array(defPlayers.length).fill(null),
        activeCard: card,
        phase: 'rolling-pairs',
      }
    }

    case 'CHOOSE_WR': {
      // defPlayers already set in state from CHOOSE_OFF_PLAY(pass)
      const { wr, opponentDefCall, offPlayers } = action
      return {
        ...state,
        selectedWR: wr,
        defensePlayCall: opponentDefCall,
        offPlayers,
        offRolls: new Array(offPlayers.length).fill(null),
        defRolls: new Array(state.defPlayers.length).fill(null),
        offBonuses: new Array(offPlayers.length).fill(null),
        defBonuses: new Array(state.defPlayers.length).fill(null),
        deepShotFallback: action.deepShotFallback ?? null,
        phase: 'rolling-pairs',
      }
    }

    case 'SHOW_RUNNER_CHOICE': {
      return { ...state, phase: 'choose-runner', activeCard: action.card }
    }

    case 'CHOOSE_RUNNER': {
      const { opponentDefCall, offPlayers, defPlayers } = action
      return {
        ...state,
        offensePlayCall: 'run',
        defensePlayCall: opponentDefCall,
        offPlayers,
        defPlayers,
        offRolls: new Array(offPlayers.length).fill(null),
        defRolls: new Array(defPlayers.length).fill(null),
        offBonuses: new Array(offPlayers.length).fill(null),
        defBonuses: new Array(defPlayers.length).fill(null),
        phase: 'rolling-pairs',
      }
    }

    case 'CHOOSE_DEF_PLAY': {
      const { call, offPlayers, defPlayers } = action
      return {
        ...state,
        offensePlayCall: state.opponentPlayCall ?? 'run',
        defensePlayCall: call,
        offPlayers,
        defPlayers,
        offRolls: new Array(offPlayers.length).fill(null),
        defRolls: new Array(defPlayers.length).fill(null),
        offBonuses: new Array(offPlayers.length).fill(null),
        defBonuses: new Array(defPlayers.length).fill(null),
        phase: 'rolling-pairs',
      }
    }

    case 'ROLL_PAIR': {
      const { offIndex, offValue, defIndex, defValue } = action

      // Apply offense roll
      const newOffRolls = [...state.offRolls]
      newOffRolls[offIndex] = offValue

      // Apply defense roll (if this row has a paired def player)
      const newDefRolls = [...state.defRolls]
      if (defIndex !== null && defValue !== null) {
        newDefRolls[defIndex] = defValue
      }

      // Roll-time bonus for the offense player
      const offPlayer = state.offPlayers[offIndex]
      let newOffBonuses = [...state.offBonuses]
      if (offPlayer.ability && !isPostRollAbility(offPlayer.ability)) {
        const isWR = isPlayer(offPlayer) && offPlayer.position === 'WR'
        const wrYacActive = isWR
          ? (state.selectedWR === 'WR1' ? state.wr1YacActive : state.wr2YacActive)
          : false
        const offAbilityCounter = (offPlayer.abilityCounter ?? 0) +
          (offPlayer.ability === 'absorb' && state.possession === 'user' ? state.userAbsorbHits : 0)
        // Look up FTB bonus for this specific player
        let offFtbBonus = 0
        if (state.possession === 'user') {
          if (isPlayer(offPlayer) && offPlayer.ability === 'feed-the-beast-rb' && offPlayer.position === 'RB') {
            offFtbBonus = state.userFeedTheBeast.RB
          } else if (isPlayer(offPlayer) && offPlayer.ability === 'feed-the-beast-wr' && offPlayer.position === 'WR') {
            offFtbBonus = state.selectedWR === 'WR1' ? state.userFeedTheBeast.WR1 : state.userFeedTheBeast.WR2
          }
        } else {
          if (isPlayer(offPlayer) && offPlayer.ability === 'feed-the-beast-rb' && offPlayer.position === 'RB') {
            offFtbBonus = state.opponentFeedTheBeast.RB
          } else if (isPlayer(offPlayer) && offPlayer.ability === 'feed-the-beast-wr' && offPlayer.position === 'WR') {
            offFtbBonus = state.opponentFeedTheBeast.WR1
          }
        }
        const ctx = {
          ...buildAbilityContext('offense', state, newOffRolls, newDefRolls),
          wrYacActive,
          feedTheBeastBonus: offFtbBonus,
          abilityCounter: offAbilityCounter,
        }
        newOffBonuses[offIndex] = computeRollBonus(offPlayer.ability, offValue, ctx)
      }

      // YAC activation: only the WR who HAS the yac ability can trigger it
      let newWr1YacActive = state.wr1YacActive
      let newWr2YacActive = state.wr2YacActive
      if (isPlayer(offPlayer) && offPlayer.position === 'WR' && offPlayer.ability === 'yac' && offValue >= 12 && state.selectedWR !== null) {
        if (state.selectedWR === 'WR1') newWr1YacActive = true
        else newWr2YacActive = true
      }

      // Roll-time bonus for the paired defense player
      let newDefBonuses = [...state.defBonuses]
      if (defIndex !== null && defValue !== null) {
        const defPlayer = state.defPlayers[defIndex]
        if (defPlayer.ability && !isPostRollAbility(defPlayer.ability)) {
          const defAbilityCounter = (defPlayer.abilityCounter ?? 0) +
            (defPlayer.ability === 'absorb' && state.possession === 'opponent' ? state.userAbsorbHits : 0)
          const defCtx = {
            ...buildAbilityContext('defense', state, newOffRolls, newDefRolls),
            wrYacActive: false,
            feedTheBeastBonus: 0,
            abilityCounter: defAbilityCounter,
          }
          newDefBonuses[defIndex] = computeRollBonus(defPlayer.ability, defValue, defCtx)
        }
      }

      // Re-evaluate Blessed bonuses across all players
      newOffBonuses = recomputeBlessed(state.offPlayers, newOffBonuses, 'offense', state, newOffRolls, newDefRolls)
      newDefBonuses = recomputeBlessed(state.defPlayers, newDefBonuses, 'defense', state, newOffRolls, newDefRolls)

      // Turnover check: offense player rolled the defense's turnover number
      const defTurnoverNums = state.possession === 'user' ? state.opponentTurnoverNumbers : state.userTurnoverNumbers
      if (defTurnoverNums.includes(offValue)) {
        const driveResult = buildDriveResult(state, 'Turnover', 0, {
          yards: state.currentDriveYards,
          passYards: state.currentDrivePassYards,
          rushYards: state.currentDriveRushYards,
          runPlays: state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive,
          passPlays: state.possession === 'user' ? state.userPassPlaysThisDrive : state.opponentPassPlaysThisDrive,
          negativePlays: state.currentDriveNegativePlays,
        })
        return {
          ...state,
          offRolls: newOffRolls,
          defRolls: newDefRolls,
          offBonuses: newOffBonuses,
          defBonuses: newDefBonuses,
          wr1YacActive: newWr1YacActive,
          wr2YacActive: newWr2YacActive,
          driveOutcome: 'Turnover',
          turnoverYardLine: state.driveProgress,
          nextDriveStartYard: Math.min(state.tdYard - 1, Math.max(1, state.tdYard - state.driveProgress)),
          userScore: (state.possession === 'opponent' && state.pick2Rule) ? state.userScore + 2 : state.userScore,
          opponentScore: (state.possession === 'user' && state.pick2Rule) ? state.opponentScore + 2 : state.opponentScore,
          driveHistory: [...state.driveHistory, driveResult],
          // Check if the user's off or def player has absorb and hit their target
          userAbsorbHits: state.userAbsorbHits + (
            (state.possession === 'user' && offPlayer.ability === 'absorb' && offValue === offPlayer.abilityTarget) ? 1 : 0
          ) + (
            (defIndex !== null && defValue !== null && state.possession === 'opponent') ? (() => {
              const dp = state.defPlayers[defIndex]
              return dp.ability === 'absorb' && defValue === dp.abilityTarget ? 1 : 0
            })() : 0
          ),
          phase: 'turnover',
        }
      }

      // Track absorb hits for this roll pair
      let absorbHitsDelta = 0
      if (state.possession === 'user' && offPlayer.ability === 'absorb' && offValue === offPlayer.abilityTarget) {
        absorbHitsDelta += 1
      }
      if (defIndex !== null && defValue !== null && state.possession === 'opponent') {
        const dp = state.defPlayers[defIndex]
        if (dp.ability === 'absorb' && defValue === dp.abilityTarget) absorbHitsDelta += 1
      }

      // All rows rolled when every off and def slot is filled
      const allDone = newOffRolls.every(r => r !== null) && newDefRolls.every(r => r !== null)
      if (!allDone) {
        return {
          ...state,
          offRolls: newOffRolls,
          defRolls: newDefRolls,
          offBonuses: newOffBonuses,
          defBonuses: newDefBonuses,
          wr1YacActive: newWr1YacActive,
          wr2YacActive: newWr2YacActive,
          userAbsorbHits: state.userAbsorbHits + absorbHitsDelta,
          phase: 'rolling-pairs',
        }
      }

      // Compute final yards and show result
      const bonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
      const yards = computeYardsGained(newOffRolls as number[], newDefRolls as number[], bonus)
      return {
        ...state,
        offRolls: newOffRolls,
        defRolls: newDefRolls,
        offBonuses: newOffBonuses,
        defBonuses: newDefBonuses,
        wr1YacActive: newWr1YacActive,
        wr2YacActive: newWr2YacActive,
        yardsGained: yards,
        userAbsorbHits: state.userAbsorbHits + absorbHitsDelta,
        phase: 'show-play-result',
      }
    }

    case 'RESOLVE_PLAY': {
      const { nextOpponentPlayCall } = action
      if (state.yardsGained === null) return state

      // Track play history and run counters (carries across drives)
      const newUserPlayHistory = state.possession === 'user'
        ? [...state.userPlayHistory, state.offensePlayCall!]
        : state.userPlayHistory
      const newOppPlayHistory = state.possession === 'opponent'
        ? [...state.opponentPlayHistory, state.offensePlayCall!]
        : state.opponentPlayHistory
      const newUserRunsThisDrive = state.possession === 'user' && state.offensePlayCall === 'run'
        ? state.userRunsThisDrive + 1
        : state.userRunsThisDrive
      const newOppRunsThisDrive = state.possession === 'opponent' && state.offensePlayCall === 'run'
        ? state.opponentRunsThisDrive + 1
        : state.opponentRunsThisDrive

      // Box score accumulators for this play
      const newDriveYards = state.currentDriveYards + state.yardsGained
      const newDrivePassYards = state.currentDrivePassYards + (state.offensePlayCall === 'pass' ? state.yardsGained : 0)
      const newDriveRushYards = state.currentDriveRushYards + (state.offensePlayCall === 'run' ? state.yardsGained : 0)
      const newNegativePlays = state.currentDriveNegativePlays + (state.yardsGained < 0 ? 1 : 0)
      const newUserPassPlays = state.possession === 'user' && state.offensePlayCall === 'pass'
        ? state.userPassPlaysThisDrive + 1 : state.userPassPlaysThisDrive
      const newOppPassPlays = state.possession === 'opponent' && state.offensePlayCall === 'pass'
        ? state.opponentPassPlaysThisDrive + 1 : state.opponentPassPlaysThisDrive
      const newUserDriveWR1Plays = state.possession === 'user' && state.offensePlayCall === 'pass' && state.selectedWR === 'WR1'
        ? state.userDriveWR1Plays + 1 : state.userDriveWR1Plays
      const newUserDriveWR2Plays = state.possession === 'user' && state.offensePlayCall === 'pass' && state.selectedWR === 'WR2'
        ? state.userDriveWR2Plays + 1 : state.userDriveWR2Plays
      const newOpponentDriveWR1Plays = state.possession === 'opponent' && state.offensePlayCall === 'pass'
        ? state.opponentDriveWR1Plays + 1 : state.opponentDriveWR1Plays

      const rawProgress = state.driveProgress + state.yardsGained

      // Safety: offense driven back behind their own goal line
      if (rawProgress < 0) {
        const runPlays = state.possession === 'user' ? newUserRunsThisDrive : newOppRunsThisDrive
        const passPlays = state.possession === 'user' ? newUserPassPlays : newOppPassPlays
        const driveResult = buildDriveResult(
          state,
          'Safety',
          2,
          { yards: newDriveYards, passYards: newDrivePassYards, rushYards: newDriveRushYards, runPlays, passPlays, negativePlays: newNegativePlays + 1 },
        )
        let newUserFeedTheBeast = state.userFeedTheBeast
        let newOpponentFeedTheBeast = state.opponentFeedTheBeast
        if (state.possession === 'user') {
          const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(newUserRunsThisDrive, newUserPassPlays, newUserDriveWR1Plays, newUserDriveWR2Plays)
          newUserFeedTheBeast = { RB: state.userFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.userFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.userFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
        } else {
          const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(newOppRunsThisDrive, newOppPassPlays, newOpponentDriveWR1Plays, 0)
          newOpponentFeedTheBeast = { RB: state.opponentFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.opponentFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.opponentFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
        }
        return {
          ...state,
          yardsGained: null,
          // defending team scores 2
          userScore: state.possession === 'opponent' ? state.userScore + 2 : state.userScore,
          opponentScore: state.possession === 'user' ? state.opponentScore + 2 : state.opponentScore,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'Safety',
          nextDriveStartYard: STARTING_YARD_LINE,
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userFeedTheBeast: newUserFeedTheBeast,
          opponentFeedTheBeast: newOpponentFeedTheBeast,
          phase: 'drive-end',
        }
      }

      const newProgress = Math.min(state.tdYard, Math.max(0, rawProgress))

      if (newProgress >= state.tdYard) {
        // Attribute the TD to the ball carrier
        let scoringPlayerName: string | undefined
        let scoringPlayerPos: 'RB' | 'WR' | undefined
        if (state.offensePlayCall === 'run') {
          const rb = state.offPlayers.find(p => isPlayer(p) && p.position === 'RB') as Player | undefined
          scoringPlayerName = rb?.name
          scoringPlayerPos = 'RB'
        } else {
          const wr = state.offPlayers.find(p => isPlayer(p) && p.position === 'WR') as Player | undefined
          scoringPlayerName = wr?.name
          scoringPlayerPos = 'WR'
        }
        const runPlays = state.possession === 'user' ? newUserRunsThisDrive : newOppRunsThisDrive
        const passPlays = state.possession === 'user' ? newUserPassPlays : newOppPassPlays
        const driveResult = buildDriveResult(
          { ...state, driveProgress: newProgress },
          'TD',
          state.tdPoints,
          { yards: newDriveYards, passYards: newDrivePassYards, rushYards: newDriveRushYards, runPlays, passPlays, negativePlays: newNegativePlays, scoringPlayerName, scoringPlayerPos },
        )
        let newUserFeedTheBeastTD = state.userFeedTheBeast
        let newOpponentFeedTheBeastTD = state.opponentFeedTheBeast
        if (state.possession === 'user') {
          const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(newUserRunsThisDrive, newUserPassPlays, newUserDriveWR1Plays, newUserDriveWR2Plays)
          newUserFeedTheBeastTD = { RB: state.userFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.userFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.userFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
        } else {
          const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(newOppRunsThisDrive, newOppPassPlays, newOpponentDriveWR1Plays, 0)
          newOpponentFeedTheBeastTD = { RB: state.opponentFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.opponentFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.opponentFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
        }
        return {
          ...state,
          yardsGained: null,
          driveProgress: newProgress,
          userScore: state.possession === 'user' ? state.userScore + state.tdPoints : state.userScore,
          opponentScore: state.possession === 'opponent' ? state.opponentScore + state.tdPoints : state.opponentScore,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'TD',
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userRunsThisDrive: newUserRunsThisDrive,
          opponentRunsThisDrive: newOppRunsThisDrive,
          userFeedTheBeast: newUserFeedTheBeastTD,
          opponentFeedTheBeast: newOpponentFeedTheBeastTD,
          phase: 'drive-end',
        }
      }

      if (state.down >= state.maxDowns) {
        if (state.wentForIt) {
          // Turnover on downs — opponent gets ball at the spot
          const runPlays = state.possession === 'user' ? newUserRunsThisDrive : newOppRunsThisDrive
          const passPlays = state.possession === 'user' ? newUserPassPlays : newOppPassPlays
          const driveResult = buildDriveResult(
            { ...state, driveProgress: newProgress },
            'TurnoverOnDowns',
            0,
            { yards: newDriveYards, passYards: newDrivePassYards, rushYards: newDriveRushYards, runPlays, passPlays, negativePlays: newNegativePlays },
          )
          let newUserFeedTheBeastTOD = state.userFeedTheBeast
          let newOpponentFeedTheBeastTOD = state.opponentFeedTheBeast
          if (state.possession === 'user') {
            const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(newUserRunsThisDrive, newUserPassPlays, newUserDriveWR1Plays, newUserDriveWR2Plays)
            newUserFeedTheBeastTOD = { RB: state.userFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.userFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.userFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
          } else {
            const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(newOppRunsThisDrive, newOppPassPlays, newOpponentDriveWR1Plays, 0)
            newOpponentFeedTheBeastTOD = { RB: state.opponentFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.opponentFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.opponentFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
          }
          return {
            ...state,
            yardsGained: null,
            driveProgress: newProgress,
            nextDriveStartYard: Math.min(state.tdYard - 1, Math.max(1, state.tdYard - newProgress)),
            driveHistory: [...state.driveHistory, driveResult],
            driveOutcome: 'TurnoverOnDowns',
            userPlayHistory: newUserPlayHistory,
            opponentPlayHistory: newOppPlayHistory,
            userFeedTheBeast: newUserFeedTheBeastTOD,
            opponentFeedTheBeast: newOpponentFeedTheBeastTOD,
            phase: 'drive-end',
          }
        }
        if (state.possession === 'user') {
          // User played all downs — now offer Punt / FG / Go For It
          const newDownHistory = [...state.downHistory, { playCall: state.offensePlayCall!, yardsGained: state.yardsGained }]
          return {
            ...state,
            ...playReset(),
            driveProgress: newProgress,
            downHistory: newDownHistory,
            currentDriveYards: newDriveYards,
            currentDrivePassYards: newDrivePassYards,
            currentDriveRushYards: newDriveRushYards,
            currentDriveNegativePlays: newNegativePlays,
            userPassPlaysThisDrive: newUserPassPlays,
            opponentPassPlaysThisDrive: newOppPassPlays,
            userPlayHistory: newUserPlayHistory,
            opponentPlayHistory: newOppPlayHistory,
            userRunsThisDrive: newUserRunsThisDrive,
            opponentRunsThisDrive: newOppRunsThisDrive,
            userDriveWR1Plays: newUserDriveWR1Plays,
            userDriveWR2Plays: newUserDriveWR2Plays,
            opponentDriveWR1Plays: newOpponentDriveWR1Plays,
            phase: 'fourth-down-choice',
          }
        }
        // Opponent: auto-FG if in range, otherwise auto-punt
        if (newProgress >= state.opponentFgRangeYard) {
          const inRZ = newProgress >= state.rzYard
          const activeFgPoints = (state.opponentKickerAbility === 'money-ball' && inRZ)
            ? 5 : state.fgPoints
          // Flush accumulated stats into state so FG_ROLL can read them
          return {
            ...state,
            yardsGained: null,
            driveProgress: newProgress,
            fgDifficulty: computeFGDifficulty(newProgress, state.opponentFgRangeYard, state.tdYard),
            activeFgPoints,
            userPlayHistory: newUserPlayHistory,
            opponentPlayHistory: newOppPlayHistory,
            userRunsThisDrive: newUserRunsThisDrive,
            opponentRunsThisDrive: newOppRunsThisDrive,
            currentDriveYards: newDriveYards,
            currentDrivePassYards: newDrivePassYards,
            currentDriveRushYards: newDriveRushYards,
            currentDriveNegativePlays: newNegativePlays,
            userPassPlaysThisDrive: newUserPassPlays,
            opponentPassPlaysThisDrive: newOppPassPlays,
            userDriveWR1Plays: newUserDriveWR1Plays,
            userDriveWR2Plays: newUserDriveWR2Plays,
            opponentDriveWR1Plays: newOpponentDriveWR1Plays,
            phase: 'fg-roll',
          }
        }
        const runPlays = newOppRunsThisDrive
        const passPlays = newOppPassPlays
        const driveResult = buildDriveResult(
          { ...state, driveProgress: newProgress },
          'Punt',
          0,
          { yards: newDriveYards, passYards: newDrivePassYards, rushYards: newDriveRushYards, runPlays, passPlays, negativePlays: newNegativePlays },
        )
        const { rbTrigger: oppPuntRB, wr1Trigger: oppPuntWR1, wr2Trigger: oppPuntWR2 } = checkFeedTheBeastTrigger(newOppRunsThisDrive, newOppPassPlays, newOpponentDriveWR1Plays, 0)
        const newOpponentFeedTheBeastPunt = { RB: state.opponentFeedTheBeast.RB + (oppPuntRB ? 5 : 0), WR1: state.opponentFeedTheBeast.WR1 + (oppPuntWR1 ? 5 : 0), WR2: state.opponentFeedTheBeast.WR2 + (oppPuntWR2 ? 5 : 0) }
        return {
          ...state,
          yardsGained: null,
          driveProgress: newProgress,
          nextDriveStartYard: state.noPuntingRule
            ? Math.min(state.tdYard - 1, Math.max(1, state.tdYard - newProgress))
            : STARTING_YARD_LINE,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'Punt',
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userRunsThisDrive: newUserRunsThisDrive,
          opponentRunsThisDrive: newOppRunsThisDrive,
          opponentFeedTheBeast: newOpponentFeedTheBeastPunt,
          phase: 'drive-end',
        }
      }

      // Next down — same drive, same possession
      const nextDown = state.down + 1
      const nextPhase: PlayPhase = state.possession === 'user' ? 'choose-offense' : 'choose-defense'
      const newDownHistory = [...state.downHistory, { playCall: state.offensePlayCall!, yardsGained: state.yardsGained }]
      return {
        ...state,
        ...playReset(),
        driveProgress: newProgress,
        down: nextDown,
        downHistory: newDownHistory,
        opponentPlayCall: state.possession === 'opponent' ? nextOpponentPlayCall : state.opponentPlayCall,
        userPlayHistory: newUserPlayHistory,
        opponentPlayHistory: newOppPlayHistory,
        userRunsThisDrive: newUserRunsThisDrive,
        opponentRunsThisDrive: newOppRunsThisDrive,
        currentDriveYards: newDriveYards,
        currentDrivePassYards: newDrivePassYards,
        currentDriveRushYards: newDriveRushYards,
        currentDriveNegativePlays: newNegativePlays,
        userPassPlaysThisDrive: newUserPassPlays,
        opponentPassPlaysThisDrive: newOppPassPlays,
        userDriveWR1Plays: newUserDriveWR1Plays,
        userDriveWR2Plays: newUserDriveWR2Plays,
        opponentDriveWR1Plays: newOpponentDriveWR1Plays,
        phase: nextPhase,
      }
    }

    case 'FG_ROLL_START': {
      // Kick has been rolled — animation plays in PlayerRollCard. Result is applied
      // after FG_ROLL_SCAN_DURATION_MS via a setTimeout in handleStep.
      return { ...state, fgRoll: action.value }
    }

    case 'FG_ROLL': {
      const { value } = action
      if (state.fgDifficulty === null) return state
      const runPlays = state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive
      const passPlays = state.possession === 'user' ? state.userPassPlaysThisDrive : state.opponentPassPlaysThisDrive

      // Blocked kick: kicker rolled the defense's turnover number
      const defTurnoverNums = state.possession === 'user' ? state.opponentTurnoverNumbers : state.userTurnoverNumbers
      if (defTurnoverNums.includes(value)) {
        const driveResult = buildDriveResult(state, 'Turnover', 0, {
          yards: state.currentDriveYards, passYards: state.currentDrivePassYards, rushYards: state.currentDriveRushYards, runPlays, passPlays, negativePlays: state.currentDriveNegativePlays,
        })
        return {
          ...state,
          fgRoll: value,
          driveOutcome: 'Turnover',
          turnoverYardLine: state.driveProgress,
          nextDriveStartYard: Math.min(state.tdYard - 1, Math.max(1, state.tdYard - state.driveProgress)),
          userScore: (state.possession === 'opponent' && state.pick2Rule) ? state.userScore + 2 : state.userScore,
          opponentScore: (state.possession === 'user' && state.pick2Rule) ? state.opponentScore + 2 : state.opponentScore,
          driveHistory: [...state.driveHistory, driveResult],
          // FG kicker absorb tracking skipped — kicker rolling absorb is niche and
          // abilityTarget is not easily accessible from reducer state.
          phase: 'turnover',
        }
      }

      const made = value >= state.fgDifficulty
      const effectivePts = state.activeFgPoints ?? state.fgPoints
      const driveResult = buildDriveResult(
        state,
        made ? 'FG' : 'FG-missed',
        made ? effectivePts : 0,
        { yards: state.currentDriveYards, passYards: state.currentDrivePassYards, rushYards: state.currentDriveRushYards, runPlays, passPlays, negativePlays: state.currentDriveNegativePlays, fgRoll: value, fgDifficulty: state.fgDifficulty },
      )
      // FTB check at FG drive-end (made or missed)
      let newUserFeedTheBeastFG = state.userFeedTheBeast
      let newOpponentFeedTheBeastFG = state.opponentFeedTheBeast
      if (state.possession === 'user') {
        const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(state.userRunsThisDrive, state.userPassPlaysThisDrive, state.userDriveWR1Plays, state.userDriveWR2Plays)
        newUserFeedTheBeastFG = { RB: state.userFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.userFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.userFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
      } else {
        const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(state.opponentRunsThisDrive, state.opponentPassPlaysThisDrive, state.opponentDriveWR1Plays, 0)
        newOpponentFeedTheBeastFG = { RB: state.opponentFeedTheBeast.RB + (rbTrigger ? 5 : 0), WR1: state.opponentFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0), WR2: state.opponentFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0) }
      }
      return {
        ...state,
        fgRoll: value,
        driveOutcome: made ? 'FG' : 'FG-missed',
        userScore: (made && state.possession === 'user') ? state.userScore + effectivePts : state.userScore,
        opponentScore: (made && state.possession === 'opponent') ? state.opponentScore + effectivePts : state.opponentScore,
        driveHistory: [...state.driveHistory, driveResult],
        userFeedTheBeast: newUserFeedTheBeastFG,
        opponentFeedTheBeast: newOpponentFeedTheBeastFG,
        phase: 'fg-result',
      }
    }

    case 'ADVANCE_DRIVE': {
      const nextDriveIndex = state.driveIndex + 1
      if (nextDriveIndex >= DRIVES_PER_GAME) {
        return { ...state, driveIndex: nextDriveIndex, phase: 'game-over' }
      }
      const nextPossession: 'user' | 'opponent' = nextDriveIndex % 2 === 0 ? 'user' : 'opponent'
      const nextPhase: PlayPhase = nextPossession === 'user' ? 'choose-offense' : 'choose-defense'
      const startYard = state.nextDriveStartYard
      return {
        ...state,
        ...driveReset(state.maxDowns),
        driveProgress: startYard,
        nextDriveStartYard: STARTING_YARD_LINE,
        driveIndex: nextDriveIndex,
        possession: nextPossession,
        opponentPlayCall: nextPossession === 'opponent' ? action.nextOpponentPlayCall : null,
        phase: nextPhase,
      }
    }

    case 'KICK_FG': {
      return {
        ...state,
        fgDifficulty: computeFGDifficulty(state.driveProgress, action.effectiveFgRangeYard, state.tdYard),
        activeFgPoints: action.effectiveFgPoints,
        phase: 'fg-roll',
      }
    }

    case 'FOURTH_DOWN_GO_FOR_IT': {
      return { ...state, wentForIt: true, phase: 'choose-offense' }
    }

    case 'FOURTH_DOWN_PUNT': {
      const runPlays = state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive
      const passPlays = state.possession === 'user' ? state.userPassPlaysThisDrive : state.opponentPassPlaysThisDrive
      const driveResult = buildDriveResult(state, 'Punt', 0, {
        yards: state.currentDriveYards,
        passYards: state.currentDrivePassYards,
        rushYards: state.currentDriveRushYards,
        runPlays,
        passPlays,
        negativePlays: state.currentDriveNegativePlays,
      })
      // FTB check — FOURTH_DOWN_PUNT is always user possession
      const { rbTrigger: puntRB, wr1Trigger: puntWR1, wr2Trigger: puntWR2 } = checkFeedTheBeastTrigger(
        state.userRunsThisDrive, state.userPassPlaysThisDrive, state.userDriveWR1Plays, state.userDriveWR2Plays,
      )
      const newUserFeedTheBeastPunt = {
        RB:  state.userFeedTheBeast.RB  + (puntRB  ? 5 : 0),
        WR1: state.userFeedTheBeast.WR1 + (puntWR1 ? 5 : 0),
        WR2: state.userFeedTheBeast.WR2 + (puntWR2 ? 5 : 0),
      }
      return {
        ...state,
        driveHistory: [...state.driveHistory, driveResult],
        driveOutcome: 'Punt',
        nextDriveStartYard: STARTING_YARD_LINE,
        userFeedTheBeast: newUserFeedTheBeastPunt,
        phase: 'drive-end',
      }
    }

    case 'BACK_TO_PLAY_CHOICE':
      return {
        ...state,
        phase: 'choose-offense',
        offensePlayCall: null,
        defensePlayCall: null,
        defPlayers: [],
        defBonuses: [],
        offPlayers: [],
        offBonuses: [],
        selectedWR: null,
        activeCard: null,
        deepShotFallback: null,
      }

    case 'DEEP_SHOT_SWITCH': {
      const { offPlayers, defPlayers } = action
      return {
        ...state,
        offPlayers,
        defPlayers,
        offRolls: new Array(offPlayers.length).fill(null),
        defRolls: new Array(defPlayers.length).fill(null),
        offBonuses: new Array(offPlayers.length).fill(null),
        defBonuses: new Array(defPlayers.length).fill(null),
        phase: 'rolling-pairs',
      }
    }

    default:
      return state
  }
}

// ─── Initial state ─────────────────────────────────────────────────────────────

function makeInitialState({ weather, userTurnoverNumbers, opponentTurnoverNumbers, overrides, userFgRangeYard, opponentFgRangeYard, userKickerAbility, opponentKickerAbility }: {
  weather: WeatherCondition
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  overrides: RuleOverrides
  userFgRangeYard: number
  opponentFgRangeYard: number
  userKickerAbility: string | undefined
  opponentKickerAbility: string | undefined
}): GameState {
  return {
    driveIndex: 0,
    possession: 'user',
    down: 1,
    driveProgress: STARTING_YARD_LINE,
    userScore: 0,
    opponentScore: 0,
    driveHistory: [],
    downHistory: [],
    phase: 'choose-offense',
    offensePlayCall: null,
    defensePlayCall: null,
    selectedWR: null,
    opponentPlayCall: null,
    offPlayers: [],
    defPlayers: [],
    offRolls: [],
    defRolls: [],
    yardsGained: null,
    fgRoll: null,
    fgDifficulty: null,
    driveOutcome: null,
    activeFgPoints: null,
    weather,
    userTurnoverNumbers,
    opponentTurnoverNumbers,
    tdPoints: overrides.tdPoints,
    fgPoints: overrides.fgPoints,
    tdYard: overrides.tdYard,
    fgRangeYard: overrides.fgRangeYard,
    userFgRangeYard,
    opponentFgRangeYard,
    userKickerAbility,
    opponentKickerAbility,
    rzYard: overrides.rzYard,
    maxDowns: overrides.maxDowns,
    noPuntingRule: overrides.noPuntingRule,
    pick2Rule: overrides.pick2Rule,
    wentForIt: false,
    turnoverYardLine: null,
    nextDriveStartYard: STARTING_YARD_LINE,
    userAbsorbHits: 0,
    userHand: drawHand(overrides.maxDowns),
    activeCard: null,
    cardBonus: 0,
    deepShotFallback: null,
    userPlayHistory: [],
    opponentPlayHistory: [],
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
    currentDriveYards: 0,
    currentDrivePassYards: 0,
    currentDriveRushYards: 0,
    currentDriveNegativePlays: 0,
    userPassPlaysThisDrive: 0,
    opponentPassPlaysThisDrive: 0,
    userFeedTheBeast: { RB: 0, WR1: 0, WR2: 0 },
    opponentFeedTheBeast: { RB: 0, WR1: 0, WR2: 0 },
    userDriveWR1Plays: 0,
    userDriveWR2Plays: 0,
    opponentDriveWR1Plays: 0,
  }
}

// ─── Build final SimulationResult ─────────────────────────────────────────────

function buildSimulationResult(
  state: GameState,
  opponentLabel: string,
): SimulationResult {
  const winner =
    state.userScore > state.opponentScore ? 'user'
    : state.opponentScore > state.userScore ? 'opponent'
    : 'tie'
  return {
    userTeamLabel: 'Your Team',
    opponentTeamLabel: opponentLabel,
    drives: state.driveHistory,
    userScore: state.userScore,
    opponentScore: state.opponentScore,
    winner,
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function GameScreen() {
  const { roster, currentOpponentRoster, currentOpponent, recordGameResult, currentWeather, userTurnoverNumbers, opponentTurnoverNumbers, activeRule } = useGameStore()
  const overrides = activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()
  const baseFgRangeYard = overrides.fgRangeYard
  const userFgRangeYard = roster.K?.ability === 'long-leg'
    ? baseFgRangeYard - 5 : baseFgRangeYard
  const computedOppRoster = currentOpponentRoster ?? {
    QB: null, WR1: null, WR2: null, RB: null,
    K: null, OLine: null, DLine: null, Secondary: null,
  }
  const opponentFgRangeYard = computedOppRoster.K?.ability === 'long-leg'
    ? baseFgRangeYard - 5 : baseFgRangeYard
  const [state, dispatch] = useReducer(
    gameReducer,
    {
      weather: currentWeather ?? 'Clear',
      userTurnoverNumbers,
      opponentTurnoverNumbers,
      overrides,
      userFgRangeYard,
      opponentFgRangeYard,
      userKickerAbility: roster.K?.ability,
      opponentKickerAbility: computedOppRoster.K?.ability,
    },
    makeInitialState,
  )

  const opponentLabel = currentOpponent
    ? `${currentOpponent.team} '${String(currentOpponent.year).slice(2)}`
    : 'Opponent'
  const quarter = Math.floor(state.driveIndex / 4) + 1
  const [rosterModal, setRosterModal] = useState<'user' | 'opp' | null>(null)
  const fgRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When game ends, push result to store (triggers SimulationModal)
  useEffect(() => {
    if (state.phase === 'game-over') {
      const result = buildSimulationResult(state, opponentLabel)
      recordGameResult(result, state.userAbsorbHits)
    }
  }, [state.phase, state.userScore, state.opponentScore, state.driveHistory, opponentLabel, recordGameResult])

  const userRoster: Roster = roster
  const oppRoster: Roster = computedOppRoster
  const activeFgRangeYard = state.possession === 'user' ? state.userFgRangeYard : state.opponentFgRangeYard

  function handleStep() {
    switch (state.phase) {
      case 'rolling-pairs': {
        // off[0] is always solo (QB/RB); off[1] pairs with def[0] (OLine/DLine); off[2] pairs with def[1] (WR/Secondary)
        const offIdx = state.offRolls.findIndex(r => r === null)
        if (offIdx === -1) return
        const offPlayer = state.offPlayers[offIdx]
        const offValue = rollDie(getPlayerDie(offPlayer))

        const defIdx = offIdx - 1  // off[1]→def[0], off[2]→def[1]; off[0] is solo
        const defPlayer = defIdx >= 0 && defIdx < state.defPlayers.length ? state.defPlayers[defIdx] : null
        const defValue = defPlayer ? rollDie(getPlayerDie(defPlayer)) : null

        dispatch({ type: 'ROLL_PAIR', offIndex: offIdx, offValue, defIndex: defPlayer ? defIdx : null, defValue })
        break
      }
      case 'show-play-result':
        dispatch({ type: 'RESOLVE_PLAY', nextOpponentPlayCall: randomPlayCall() })
        break
      case 'fg-roll': {
        if (state.fgRoll !== null) break // animation already playing
        const kicker = state.possession === 'user' ? userRoster.K : oppRoster.K
        const die = kicker ? getPlayerDie(kicker) : [5, 5, 5, 5, 5, 5]
        const value = rollDie(die)
        dispatch({ type: 'FG_ROLL_START', value })
        if (fgRevealTimerRef.current) clearTimeout(fgRevealTimerRef.current)
        fgRevealTimerRef.current = setTimeout(() => {
          dispatch({ type: 'FG_ROLL', value })
          fgRevealTimerRef.current = null
        }, FG_ROLL_SCAN_DURATION_MS)
        break
      }
      case 'drive-end':
      case 'fg-result':
      case 'turnover':
        dispatch({ type: 'ADVANCE_DRIVE', nextOpponentPlayCall: randomPlayCall() })
        break
    }
  }

  function handleOffPlay(call: 'run' | 'pass') {
    if (call === 'run' && userRoster.QB?.ability === 'dual-threat-qb') {
      dispatch({ type: 'SHOW_RUNNER_CHOICE', card: CARDS['dive'] })
      return
    }
    if (call === 'pass') {
      // opponentDefCall is generated in handleReceiverChoice so it's one random value per play
      const defPlayers = getDefensePlayers(oppRoster, 'pass')
      dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'pass', offPlayers: [], defPlayers, card: CARDS['quick-pass'] })
    } else {
      const opponentDefCall = randomDefCall()
      const offPlayers = getOffensePlayers(userRoster, 'run', 'WR1')
      const defPlayers = getDefensePlayers(oppRoster, 'run')
      dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'run', opponentDefCall, offPlayers, defPlayers, card: CARDS['dive'] })
    }
  }

  function handleRunnerChoice(runner: 'QB' | 'RB') {
    const opponentDefCall = randomDefCall()
    const offPlayers: (Player | TeamUnit)[] = runner === 'QB'
      ? [userRoster.QB, userRoster.OLine].filter(Boolean) as (Player | TeamUnit)[]
      : getOffensePlayers(userRoster, 'run', 'WR1')
    const defPlayers = getDefensePlayers(oppRoster, 'run')
    dispatch({ type: 'CHOOSE_RUNNER', runner, opponentDefCall, offPlayers, defPlayers })
  }

  function handleReceiverChoice(slot: 'WR1' | 'WR2' | 'RB') {
    const opponentDefCall = randomDefCall()
    if (slot === 'RB') {
      // RB acts as receiver — [QB, OLine, RB]
      const offPlayers = [userRoster.QB, userRoster.OLine, userRoster.RB].filter(Boolean) as (Player | TeamUnit)[]
      dispatch({ type: 'CHOOSE_WR', wr: 'RB', opponentDefCall, offPlayers })
    } else {
      const offPlayers = getOffensePlayers(userRoster, 'pass', slot)
      // defPlayers already in state from CHOOSE_OFF_PLAY(pass)
      dispatch({ type: 'CHOOSE_WR', wr: slot, opponentDefCall, offPlayers })
    }
  }

  function handleDefPlay(call: 'run-stop' | 'pass-stop') {
    const oppPlay = state.opponentPlayCall ?? 'run'
    const offPlayers = getOffensePlayers(oppRoster, oppPlay, 'WR1')
    const defPlayers = getDefensePlayers(userRoster, oppPlay)
    dispatch({ type: 'CHOOSE_DEF_PLAY', call, offPlayers, defPlayers })
  }

  function handleKickFG() {
    const kicker = state.possession === 'user' ? userRoster.K : oppRoster.K
    const activeFgRangeYardForKick = state.possession === 'user' ? state.userFgRangeYard : state.opponentFgRangeYard
    const inRZ = state.driveProgress >= state.rzYard
    const effectiveFgPoints = (kicker?.ability === 'money-ball' && inRZ) ? 5 : state.fgPoints
    dispatch({ type: 'KICK_FG', effectiveFgRangeYard: activeFgRangeYardForKick, effectiveFgPoints })
  }

  const showStep = ['rolling-pairs', 'show-play-result', 'drive-end', 'fg-result', 'turnover'].includes(state.phase)
    || (state.phase === 'fg-roll' && state.fgRoll === null)

  // Keep handleStep always up-to-date in a ref so the keydown listener never captures a stale closure
  const handleStepRef = useRef(handleStep)
  // Intentionally runs after every render to keep ref pointing at the latest handleStep closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleStepRef.current = handleStep })

  useEffect(() => {
    if (!showStep) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleStepRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showStep])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <GameHUD
        quarter={quarter}
        driveIndex={state.driveIndex}
        down={state.down}
        driveProgress={state.driveProgress}
        userScore={state.userScore}
        opponentScore={state.opponentScore}
        possession={state.possession}
        opponentLabel={opponentLabel}
        pendingYards={['rolling-pairs', 'show-play-result'].includes(state.phase) ? state.yardsGained : null}
        activeRule={activeRule}
        tdYard={state.tdYard}
        fgRangeYard={activeFgRangeYard}
        rzYard={state.rzYard}
        downHistory={state.downHistory}
        maxDowns={state.maxDowns}
      />

      {/* Roster buttons + Step */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
        <button
          onClick={() => setRosterModal('user')}
          className="text-xs font-semibold text-gray-400 hover:text-white px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          My Roster
        </button>
        <button
          onClick={() => setRosterModal('opp')}
          className="text-xs font-semibold text-gray-400 hover:text-white px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          OPP Roster
        </button>
        {showStep && (
          <Button onClick={handleStep} className="ml-auto">Step →</Button>
        )}
      </div>

      {/* Roster modal */}
      {rosterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col" onClick={() => setRosterModal(null)}>
          <div
            className="bg-gray-950 flex-1 overflow-y-auto mt-16 rounded-t-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {rosterModal === 'user' ? 'My Roster' : `${opponentLabel} Roster`}
              </h2>
              <button
                onClick={() => setRosterModal(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {rosterModal === 'user' ? (
                <RosterGrid roster={userRoster} />
              ) : (
                <RosterGrid
                  roster={oppRoster}
                  dangerTurnoverNumbers={state.userTurnoverNumbers}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Choice panels */}
        {state.phase === 'choose-offense' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your play</p>
            <div className="flex gap-4">
              <Button size="lg" onClick={() => handleOffPlay('run')}>🏃 Run</Button>
              <Button size="lg" onClick={() => handleOffPlay('pass')}>🏈 Pass</Button>
              {state.driveProgress >= activeFgRangeYard && (
                <Button size="lg" onClick={handleKickFG}>🦵 Kick FG (beat {computeFGDifficulty(state.driveProgress, activeFgRangeYard, state.tdYard)})</Button>
              )}
            </div>
          </div>
        )}

        {state.phase === 'choose-wr' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your receiver</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-6">
              {(['WR1', 'WR2'] as const).map(slot => {
                const wr = userRoster[slot]
                return (
                  <button
                    key={slot}
                    onClick={() => handleReceiverChoice(slot)}
                    className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
                  >
                    {wr ? (
                      <PlayerRollCard player={wr} roll={null} isNext={false} />
                    ) : (
                      <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                        {slot} — Empty
                      </div>
                    )}
                  </button>
                )
              })}
              {userRoster.RB?.ability === 'dual-threat-rb' && (
                <button
                  onClick={() => handleReceiverChoice('RB')}
                  className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
                >
                  <PlayerRollCard player={userRoster.RB} roll={null} isNext={false} />
                </button>
              )}
            </div>
            <button
              onClick={() => dispatch({ type: 'BACK_TO_PLAY_CHOICE' })}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
            >
              ← Back
            </button>
          </div>
        )}

        {state.phase === 'choose-runner' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your runner</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-6">
              {([
                { slot: 'QB' as const, player: userRoster.QB },
                { slot: 'RB' as const, player: userRoster.RB },
              ]).map(({ slot, player }) => (
                <button
                  key={slot}
                  onClick={() => handleRunnerChoice(slot)}
                  className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
                >
                  {player ? (
                    <PlayerRollCard player={player} roll={null} isNext={false} />
                  ) : (
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                      {slot} — Empty
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => dispatch({ type: 'BACK_TO_PLAY_CHOICE' })}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
            >
              ← Back
            </button>
          </div>
        )}

        {state.phase === 'choose-defense' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your defense</p>
            <div className="flex gap-4">
              <Button size="lg" onClick={() => handleDefPlay('run-stop')}>🛑 Run Stop</Button>
              <Button size="lg" onClick={() => handleDefPlay('pass-stop')}>✋ Pass Stop</Button>
            </div>
          </div>
        )}

        {state.phase === 'fourth-down-choice' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold text-amber-400">
              4th Down — What do you do?
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" onClick={() => dispatch({ type: 'FOURTH_DOWN_GO_FOR_IT' })}>
                🏃 Go For It
              </Button>
              {!state.noPuntingRule && (
                <Button size="lg" variant="secondary" onClick={() => dispatch({ type: 'FOURTH_DOWN_PUNT' })}>
                  📤 Punt
                </Button>
              )}
              {state.driveProgress >= activeFgRangeYard && (
                <Button size="lg" variant="secondary" onClick={handleKickFG}>
                  🦵 Attempt FG (beat {computeFGDifficulty(state.driveProgress, activeFgRangeYard, state.tdYard)})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Play area (shown during rolling and result phases) */}
        {!['choose-offense', 'choose-wr', 'choose-runner', 'choose-defense', 'fourth-down-choice', 'game-over'].includes(state.phase) && (
          <PlayArea
            possession={state.possession}
            phase={state.phase}
            offPlayers={state.offPlayers}
            defPlayers={state.defPlayers}
            offRolls={state.offRolls}
            defRolls={state.defRolls}
            offBonuses={state.offBonuses}
            defBonuses={state.defBonuses}
            offensePlayCall={state.offensePlayCall}
            defensePlayCall={state.defensePlayCall}
            opponentPlayCall={state.opponentPlayCall}
            yardsGained={state.yardsGained}
            fgRoll={state.fgRoll}
            fgDifficulty={state.fgDifficulty}
            driveOutcome={state.driveOutcome}
            kicker={state.possession === 'user' ? userRoster.K : oppRoster.K}
          />
        )}

        {/* Turnover field-position info */}
        {state.phase === 'turnover' && state.turnoverYardLine !== null && (
          <div className="flex justify-center py-2 text-sm text-gray-400">
            Next drive starts at the{' '}
            <span className="text-white font-bold mx-1">{state.nextDriveStartYard}</span>
            yd line
          </div>
        )}
      </div>


    </div>
  )
}
