// src/components/game/GameScreen.tsx
import { useReducer, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { GameHUD } from './GameHUD'
import { PlayArea } from './PlayArea'
import { Button } from '../ui/Button'
import {
  rollDie, computeAdvantageBonus, computeYardsGained,
  computeFGDifficulty, getOffensePlayers, getDefensePlayers, getPlayerDie,
} from '../../logic/gameEngine'
import type { Roster, Player, TeamUnit, DriveResult, DriveOutcome, SimulationResult } from '../../types'

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
    driveProgress: 20,
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
  }
}

function buildDriveResult(
  state: GameState,
  outcome: DriveOutcome,
  points: number,
): DriveResult {
  const quarter = Math.floor(state.driveIndex / 4) + 1
  const scoringTeam = points > 0 ? state.possession : null
  return { possession: state.possession, quarter, outcome, scoringTeam, points }
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
        phase: 'rolling-offense',
      }
    }

    case 'ROLL': {
      const { side, index, value } = action
      if (side === 'offense') {
        const newOffRolls = [...state.offRolls]
        newOffRolls[index] = value
        const allDone = newOffRolls.every(r => r !== null)
        return {
          ...state,
          offRolls: newOffRolls,
          phase: allDone ? 'rolling-defense' : 'rolling-offense',
        }
      }
      const newDefRolls = [...state.defRolls]
      newDefRolls[index] = value
      const allDone = newDefRolls.every(r => r !== null)
      if (!allDone) return { ...state, defRolls: newDefRolls }
      const bonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
      const yards = computeYardsGained(
        state.offRolls as number[],
        newDefRolls as number[],
        bonus,
      )
      return { ...state, defRolls: newDefRolls, yardsGained: yards, phase: 'show-play-result' }
    }

    case 'RESOLVE_PLAY': {
      const { nextOpponentPlayCall } = action
      if (state.yardsGained === null) return state
      const newProgress = Math.min(100, Math.max(0, state.driveProgress + state.yardsGained))

      if (newProgress >= 100) {
        const driveResult = buildDriveResult({ ...state, driveProgress: newProgress }, 'TD', 7)
        return {
          ...state,
          driveProgress: newProgress,
          userScore: state.possession === 'user' ? state.userScore + 7 : state.userScore,
          opponentScore: state.possession === 'opponent' ? state.opponentScore + 7 : state.opponentScore,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'TD',
          phase: 'drive-end',
        }
      }

      if (state.down >= 4) {
        if (newProgress >= 65) {
          return {
            ...state,
            driveProgress: newProgress,
            fgDifficulty: computeFGDifficulty(newProgress),
            phase: 'fg-roll',
          }
        }
        const driveResult = buildDriveResult({ ...state, driveProgress: newProgress }, 'Punt', 0)
        return {
          ...state,
          driveProgress: newProgress,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'Punt',
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
        phase: nextPhase,
      }
    }

    case 'FG_ROLL': {
      const { value } = action
      if (state.fgDifficulty === null) return state
      const made = value >= state.fgDifficulty
      const driveResult = buildDriveResult(state, made ? 'FG' : 'FG-missed', made ? 3 : 0)
      return {
        ...state,
        fgRoll: value,
        driveOutcome: made ? 'FG' : 'FG-missed',
        userScore: (made && state.possession === 'user') ? state.userScore + 3 : state.userScore,
        opponentScore: (made && state.possession === 'opponent') ? state.opponentScore + 3 : state.opponentScore,
        driveHistory: [...state.driveHistory, driveResult],
        phase: 'fg-result',
      }
    }

    case 'ADVANCE_DRIVE': {
      const nextDriveIndex = state.driveIndex + 1
      if (nextDriveIndex >= 16) {
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

function makeInitialState(): GameState {
  return {
    driveIndex: 0,
    possession: 'user',
    down: 1,
    driveProgress: 20,
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
  const { roster, currentOpponentRoster, currentOpponent, recordGameResult } = useGameStore()
  const [state, dispatch] = useReducer(gameReducer, undefined, makeInitialState)

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
      />

      <div className="flex-1 overflow-y-auto">
        {/* Choice panels */}
        {state.phase === 'choose-offense' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your play</p>
            <div className="flex gap-4">
              <Button onClick={() => handleOffPlay('run')}>🏃 Run</Button>
              <Button onClick={() => handleOffPlay('pass')}>🏈 Pass</Button>
              {state.driveProgress >= 65 && (
                <Button onClick={handleKickFG}>🦵 Kick FG</Button>
              )}
            </div>
          </div>
        )}

        {state.phase === 'choose-wr' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your wide receiver</p>
            <div className="flex gap-4">
              <Button onClick={() => handleWRChoice('WR1')}>
                {userRoster.WR1 ? `WR1: ${'name' in userRoster.WR1 ? userRoster.WR1.name : 'WR1'}` : 'WR1'}
              </Button>
              <Button onClick={() => handleWRChoice('WR2')}>
                {userRoster.WR2 ? `WR2: ${'name' in userRoster.WR2 ? userRoster.WR2.name : 'WR2'}` : 'WR2'}
              </Button>
            </div>
          </div>
        )}

        {state.phase === 'choose-defense' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Opponent plays: <span className="text-white font-bold">{(state.opponentPlayCall ?? 'run').toUpperCase()}</span>
            </p>
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
            offensePlayCall={state.offensePlayCall}
            defensePlayCall={state.defensePlayCall}
            opponentPlayCall={state.opponentPlayCall}
            yardsGained={state.yardsGained}
            fgRoll={state.fgRoll}
            fgDifficulty={state.fgDifficulty}
            driveOutcome={state.driveOutcome}
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
