// src/components/game/GameScreen.tsx
import { useReducer, useEffect, useRef } from 'react'
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
  TD_POINTS,
  FG_POINTS,
  TD_YARD,
  FG_RANGE_YARD,
} from '../../logic/gameConstants'
import type { Roster, Player, TeamUnit, DriveResult, DriveOutcome, SimulationResult, WeatherCondition } from '../../types'
import {
  computeRollBonus, computePostRollBonus, isPostRollAbility,
} from '../../logic/abilityEngine'
import type { AbilityContext } from '../../logic/abilityEngine'

function isPlayer(p: Player | TeamUnit): p is Player {
  return 'name' in p
}

// ─── Internal types ────────────────────────────────────────────────────────────

type PlayPhase =
  | 'choose-offense'
  | 'choose-wr'
  | 'choose-defense'
  | 'rolling-offense'
  | 'rolling-defense'
  | 'show-play-result'
  | 'drive-end'
  | 'fg-roll'
  | 'fg-result'
  | 'game-over'

interface GameState {
  driveIndex: number
  possession: 'user' | 'opponent'
  down: number
  driveProgress: number
  userScore: number
  opponentScore: number
  driveHistory: DriveResult[]
  phase: PlayPhase
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  selectedWR: 'WR1' | 'WR2' | null
  opponentPlayCall: 'run' | 'pass' | null
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | null
  weather: WeatherCondition
  userPlayHistory: ('run' | 'pass')[]
  opponentPlayHistory: ('run' | 'pass')[]
  userRunsThisDrive: number
  opponentRunsThisDrive: number
  wr1YacActive: boolean
  wr2YacActive: boolean
  offBonuses: (number | null)[]
  defBonuses: (number | null)[]
}

type GameAction =
  // For run: opponentDefCall required; for pass: omit it (set in CHOOSE_WR instead)
  | { type: 'CHOOSE_OFF_PLAY'; call: 'run' | 'pass'; opponentDefCall?: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
  // CHOOSE_WR: defPlayers already in state from CHOOSE_OFF_PLAY(pass); only offPlayers changes
  | { type: 'CHOOSE_WR'; wr: 'WR1' | 'WR2'; opponentDefCall: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[] }
  | { type: 'CHOOSE_DEF_PLAY'; call: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
  | { type: 'ROLL'; side: 'offense' | 'defense'; index: number; value: number }
  | { type: 'RESOLVE_PLAY'; nextOpponentPlayCall: 'run' | 'pass' }
  | { type: 'FG_ROLL'; value: number }
  | { type: 'ADVANCE_DRIVE'; nextOpponentPlayCall: 'run' | 'pass' }
  | { type: 'KICK_FG' }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function randomPlayCall(): 'run' | 'pass' {
  return Math.random() < 0.5 ? 'run' : 'pass'
}

function randomDefCall(): 'run-stop' | 'pass-stop' {
  return Math.random() < 0.5 ? 'run-stop' : 'pass-stop'
}

function driveReset(): Partial<GameState> {
  return {
    down: 1,
    driveProgress: STARTING_YARD_LINE,
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
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
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
    offBonuses: [],
    defBonuses: [],
  }
}

function buildDriveResult(
  state: GameState,
  outcome: DriveOutcome,
  points: number,
): DriveResult {
  const quarter = Math.floor(state.driveIndex / DRIVES_PER_QUARTER) + 1
  const scoringTeam = points > 0 ? state.possession : null
  return { possession: state.possession, quarter, outcome, scoringTeam, points }
}

function buildAbilityContext(
  side: 'offense' | 'defense',
  state: GameState,
  allOffRolls: (number | null)[],
  allDefRolls: (number | null)[],
): AbilityContext {
  const quarter = Math.floor(state.driveIndex / 4) + 1
  const playerTeamIsUser =
    (side === 'offense' && state.possession === 'user') ||
    (side === 'defense' && state.possession === 'opponent')
  const playerTeamIsLosing = playerTeamIsUser
    ? state.userScore < state.opponentScore
    : state.opponentScore < state.userScore
  const isLastTeamDrive =
    side === 'offense' && (
      (state.possession === 'user' && state.driveIndex === 14) ||
      (state.possession === 'opponent' && state.driveIndex === 15)
    )
  const ownPlayHistory = state.possession === 'user' ? state.userPlayHistory : state.opponentPlayHistory
  const oppPlayHistory = state.possession === 'user' ? state.opponentPlayHistory : state.userPlayHistory
  const ownRunsThisDrive = state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive
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
  players.forEach((player, i) => {
    if (player.ability && isPostRollAbility(player.ability)) {
      const ctx = buildAbilityContext(side, state, allOffRolls, allDefRolls)
      result[i] = computePostRollBonus(player.ability, ctx)
    }
  })
  return result
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CHOOSE_OFF_PLAY': {
      const { call, opponentDefCall, offPlayers, defPlayers } = action
      if (call === 'pass') {
        // opponentDefCall is set later in CHOOSE_WR to avoid generating two random values
        return {
          ...state,
          offensePlayCall: 'pass',
          defPlayers,
          defBonuses: new Array(defPlayers.length).fill(null),
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
        phase: 'rolling-offense',
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
        phase: 'rolling-offense',
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
        phase: 'rolling-offense',
      }
    }

    case 'ROLL': {
      const { side, index, value } = action
      if (side === 'offense') {
        const newOffRolls = [...state.offRolls]
        newOffRolls[index] = value
        const player = state.offPlayers[index]

        // Roll-time bonus for this player
        let newOffBonuses = [...state.offBonuses]
        if (player.ability && !isPostRollAbility(player.ability)) {
          const isWR = isPlayer(player) && player.position === 'WR'
          const wrYacActive = isWR
            ? (state.selectedWR === 'WR1' ? state.wr1YacActive : state.wr2YacActive)
            : false
          const ctx = { ...buildAbilityContext('offense', state, newOffRolls, state.defRolls), wrYacActive }
          newOffBonuses[index] = computeRollBonus(player.ability, value, ctx)
        }

        // YAC activation: if WR rolls 12+, mark their slot active for future plays
        let newWr1YacActive = state.wr1YacActive
        let newWr2YacActive = state.wr2YacActive
        if (isPlayer(player) && player.position === 'WR' && value >= 12) {
          if (state.selectedWR === 'WR1') newWr1YacActive = true
          else newWr2YacActive = true
        }

        // Re-evaluate Blessed bonuses for all players now that rolls have changed
        newOffBonuses = recomputeBlessed(state.offPlayers, newOffBonuses, 'offense', state, newOffRolls, state.defRolls)
        const newDefBonuses = recomputeBlessed(state.defPlayers, [...state.defBonuses], 'defense', state, newOffRolls, state.defRolls)

        const allDone = newOffRolls.every(r => r !== null)
        return {
          ...state,
          offRolls: newOffRolls,
          offBonuses: newOffBonuses,
          defBonuses: newDefBonuses,
          wr1YacActive: newWr1YacActive,
          wr2YacActive: newWr2YacActive,
          phase: allDone ? 'rolling-defense' : 'rolling-offense',
        }
      }

      // Defense side
      const newDefRolls = [...state.defRolls]
      newDefRolls[index] = value
      const player = state.defPlayers[index]

      // Roll-time bonus for this player
      let newDefBonuses = [...state.defBonuses]
      if (player.ability && !isPostRollAbility(player.ability)) {
        const ctx = buildAbilityContext('defense', state, state.offRolls, newDefRolls)
        newDefBonuses[index] = computeRollBonus(player.ability, value, ctx)
      }

      // Re-evaluate Blessed bonuses
      const newOffBonuses = recomputeBlessed(state.offPlayers, [...state.offBonuses], 'offense', state, state.offRolls, newDefRolls)
      newDefBonuses = recomputeBlessed(state.defPlayers, newDefBonuses, 'defense', state, state.offRolls, newDefRolls)

      const allDone = newDefRolls.every(r => r !== null)
      if (!allDone) {
        return { ...state, defRolls: newDefRolls, defBonuses: newDefBonuses, offBonuses: newOffBonuses }
      }
      const bonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
      const yards = computeYardsGained(
        state.offRolls as number[],
        newDefRolls as number[],
        bonus,
      )
      return {
        ...state,
        defRolls: newDefRolls,
        defBonuses: newDefBonuses,
        offBonuses: newOffBonuses,
        yardsGained: yards,
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

      const newProgress = Math.min(100, Math.max(0, state.driveProgress + state.yardsGained))

      if (newProgress >= TD_YARD) {
        const driveResult = buildDriveResult({ ...state, driveProgress: newProgress }, 'TD', TD_POINTS)
        return {
          ...state,
          driveProgress: newProgress,
          userScore: state.possession === 'user' ? state.userScore + TD_POINTS : state.userScore,
          opponentScore: state.possession === 'opponent' ? state.opponentScore + TD_POINTS : state.opponentScore,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'TD',
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userRunsThisDrive: newUserRunsThisDrive,
          opponentRunsThisDrive: newOppRunsThisDrive,
          phase: 'drive-end',
        }
      }

      if (state.down >= 4) {
        if (newProgress >= FG_RANGE_YARD) {
          return {
            ...state,
            driveProgress: newProgress,
            fgDifficulty: computeFGDifficulty(newProgress),
            userPlayHistory: newUserPlayHistory,
            opponentPlayHistory: newOppPlayHistory,
            userRunsThisDrive: newUserRunsThisDrive,
            opponentRunsThisDrive: newOppRunsThisDrive,
            phase: 'fg-roll',
          }
        }
        const driveResult = buildDriveResult({ ...state, driveProgress: newProgress }, 'Punt', 0)
        return {
          ...state,
          driveProgress: newProgress,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'Punt',
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userRunsThisDrive: newUserRunsThisDrive,
          opponentRunsThisDrive: newOppRunsThisDrive,
          phase: 'drive-end',
        }
      }

      // Next down — same drive, same possession
      const nextPhase: PlayPhase = state.possession === 'user' ? 'choose-offense' : 'choose-defense'
      return {
        ...state,
        ...playReset(),
        driveProgress: newProgress,
        down: state.down + 1,
        opponentPlayCall: state.possession === 'opponent' ? nextOpponentPlayCall : state.opponentPlayCall,
        userPlayHistory: newUserPlayHistory,
        opponentPlayHistory: newOppPlayHistory,
        userRunsThisDrive: newUserRunsThisDrive,
        opponentRunsThisDrive: newOppRunsThisDrive,
        phase: nextPhase,
      }
    }

    case 'FG_ROLL': {
      const { value } = action
      if (state.fgDifficulty === null) return state
      const made = value >= state.fgDifficulty
      const driveResult = buildDriveResult(state, made ? 'FG' : 'FG-missed', made ? FG_POINTS : 0)
      return {
        ...state,
        fgRoll: value,
        driveOutcome: made ? 'FG' : 'FG-missed',
        userScore: (made && state.possession === 'user') ? state.userScore + FG_POINTS : state.userScore,
        opponentScore: (made && state.possession === 'opponent') ? state.opponentScore + FG_POINTS : state.opponentScore,
        driveHistory: [...state.driveHistory, driveResult],
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
      return {
        ...state,
        ...driveReset(),
        driveIndex: nextDriveIndex,
        possession: nextPossession,
        opponentPlayCall: nextPossession === 'opponent' ? action.nextOpponentPlayCall : null,
        phase: nextPhase,
      }
    }

    case 'KICK_FG': {
      return {
        ...state,
        fgDifficulty: computeFGDifficulty(state.driveProgress),
        phase: 'fg-roll',
      }
    }

    default:
      return state
  }
}

// ─── Initial state ─────────────────────────────────────────────────────────────

function makeInitialState(weather: WeatherCondition): GameState {
  return {
    driveIndex: 0,
    possession: 'user',
    down: 1,
    driveProgress: STARTING_YARD_LINE,
    userScore: 0,
    opponentScore: 0,
    driveHistory: [],
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
    weather,
    userPlayHistory: [],
    opponentPlayHistory: [],
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
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
  const { roster, currentOpponentRoster, currentOpponent, recordGameResult, currentWeather } = useGameStore()
  const [state, dispatch] = useReducer(gameReducer, currentWeather ?? 'Clear', makeInitialState)

  const opponentLabel = currentOpponent
    ? `${currentOpponent.team} '${String(currentOpponent.year).slice(2)}`
    : 'Opponent'
  const quarter = Math.floor(state.driveIndex / 4) + 1

  // When game ends, push result to store (triggers SimulationModal)
  useEffect(() => {
    if (state.phase === 'game-over') {
      const result = buildSimulationResult(state, opponentLabel)
      recordGameResult(result)
    }
  }, [state.phase, state.userScore, state.opponentScore, state.driveHistory, opponentLabel, recordGameResult])

  const userRoster: Roster = roster
  const oppRoster: Roster = currentOpponentRoster ?? {
    QB: null, WR1: null, WR2: null, RB: null,
    K: null, OLine: null, DLine: null, Secondary: null,
  }

  function handleStep() {
    switch (state.phase) {
      case 'rolling-offense': {
        const idx = state.offRolls.findIndex(r => r === null)
        if (idx === -1) return
        const player = state.offPlayers[idx]
        dispatch({ type: 'ROLL', side: 'offense', index: idx, value: rollDie(getPlayerDie(player)) })
        break
      }
      case 'rolling-defense': {
        const idx = state.defRolls.findIndex(r => r === null)
        if (idx === -1) return
        const player = state.defPlayers[idx]
        dispatch({ type: 'ROLL', side: 'defense', index: idx, value: rollDie(getPlayerDie(player)) })
        break
      }
      case 'show-play-result':
        dispatch({ type: 'RESOLVE_PLAY', nextOpponentPlayCall: randomPlayCall() })
        break
      case 'fg-roll': {
        const kicker = state.possession === 'user' ? userRoster.K : oppRoster.K
        const die = kicker ? getPlayerDie(kicker) : [5, 5, 5, 5, 5, 5]
        dispatch({ type: 'FG_ROLL', value: rollDie(die) })
        break
      }
      case 'drive-end':
      case 'fg-result':
        dispatch({ type: 'ADVANCE_DRIVE', nextOpponentPlayCall: randomPlayCall() })
        break
    }
  }

  function handleOffPlay(call: 'run' | 'pass') {
    if (call === 'pass') {
      // opponentDefCall is generated in handleWRChoice so it's one random value per play
      const defPlayers = getDefensePlayers(oppRoster, 'pass')
      dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'pass', offPlayers: [], defPlayers })
    } else {
      const opponentDefCall = randomDefCall()
      const offPlayers = getOffensePlayers(userRoster, 'run', 'WR1')
      const defPlayers = getDefensePlayers(oppRoster, 'run')
      dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'run', opponentDefCall, offPlayers, defPlayers })
    }
  }

  function handleWRChoice(wr: 'WR1' | 'WR2') {
    const opponentDefCall = randomDefCall()
    const offPlayers = getOffensePlayers(userRoster, 'pass', wr)
    // defPlayers already in state from CHOOSE_OFF_PLAY(pass)
    dispatch({ type: 'CHOOSE_WR', wr, opponentDefCall, offPlayers })
  }

  function handleDefPlay(call: 'run-stop' | 'pass-stop') {
    const oppPlay = state.opponentPlayCall ?? 'run'
    const offPlayers = getOffensePlayers(oppRoster, oppPlay, 'WR1')
    const defPlayers = getDefensePlayers(userRoster, oppPlay)
    dispatch({ type: 'CHOOSE_DEF_PLAY', call, offPlayers, defPlayers })
  }

  function handleKickFG() {
    dispatch({ type: 'KICK_FG' })
  }

  const showStep = ['rolling-offense', 'rolling-defense', 'show-play-result', 'drive-end', 'fg-roll', 'fg-result'].includes(state.phase)

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
        pendingYards={state.yardsGained}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Choice panels */}
        {state.phase === 'choose-offense' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your play</p>
            <div className="flex gap-4">
              <Button onClick={() => handleOffPlay('run')}>🏃 Run</Button>
              <Button onClick={() => handleOffPlay('pass')}>🏈 Pass</Button>
              {state.driveProgress >= FG_RANGE_YARD && (
                <Button onClick={handleKickFG}>🦵 Kick FG</Button>
              )}
            </div>
          </div>
        )}

        {state.phase === 'choose-wr' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your wide receiver</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-6">
              {(['WR1', 'WR2'] as const).map(slot => {
                const wr = userRoster[slot]
                return (
                  <button
                    key={slot}
                    onClick={() => handleWRChoice(slot)}
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
            </div>
          </div>
        )}

        {state.phase === 'choose-defense' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your defense</p>
            <div className="flex gap-4">
              <Button onClick={() => handleDefPlay('run-stop')}>🛑 Run Stop</Button>
              <Button onClick={() => handleDefPlay('pass-stop')}>✋ Pass Stop</Button>
            </div>
          </div>
        )}

        {/* Play area (shown during rolling and result phases) */}
        {!['choose-offense', 'choose-wr', 'choose-defense', 'game-over'].includes(state.phase) && (
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
      </div>

      {/* Step button */}
      {showStep && (
        <div className="border-t border-gray-800 p-4 flex justify-end">
          <Button onClick={handleStep}>Step →</Button>
        </div>
      )}
    </div>
  )
}
