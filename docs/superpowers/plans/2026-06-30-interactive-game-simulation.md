# Interactive Game Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auto-simulation with an interactive, step-by-step dice-rolling game played across 16 drives (4 quarters, user/opp/user/opp each quarter), using the existing die arrays on each player.

**Architecture:** A new `'game'` GamePhase renders a full-screen `GameScreen` component. All in-game state (quarter, drive, down, progress, rolls) lives in a local `useReducer` inside `GameScreen`, keeping the global store lean. When all 16 drives finish, `GameScreen` calls `recordGameResult()` on the store to write the `SimulationResult` and return to `'round-hub'`, where the existing `SimulationModal` displays results unchanged.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, Vitest + @testing-library/react

## Global Constraints

- All components use Tailwind CSS with dark-mode classes (`dark:`)
- Die arrays (`player.die: number[]`) are always length 6; use `[5,5,5,5,5,5]` as fallback when null/undefined
- Drive progress clamped to `[0, 100]`; starts at 20 each drive
- FG difficulty formula: `Math.max(1, 80 - driveProgress)`
- Advantage bonus: correct defensive guess = −5 to offense; wrong guess = +5 to offense
- 16 total drives: driveIndex 0–15, possession = `driveIndex % 2 === 0 ? 'user' : 'opponent'`
- Quarter = `Math.floor(driveIndex / 4) + 1`
- DriveResult uses existing type; `outcome` from new engine is `'TD' | 'FG' | 'Punt'` only
- Missed FG maps to `outcome: 'Punt'` in `DriveResult` (0 points, no scoring team)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/logic/gameEngine.ts` | Pure game logic functions |
| Create | `src/logic/gameEngine.test.ts` | Unit tests for game engine |
| Modify | `src/types/index.ts` | Add `'game'` to `GamePhase` |
| Modify | `src/store/gameStore.ts` | Add `startGame`, `recordGameResult`; remove `simulateGame` |
| Modify | `src/App.tsx` | Render `<GameScreen />` for `phase === 'game'` |
| Modify | `src/components/round/RoundHub.tsx` | Call `startGame` instead of `simulateGame` |
| Create | `src/components/game/DriveProgressBar.tsx` | Progress bar with FG/RZ/TD markers |
| Create | `src/components/game/GameHUD.tsx` | Sticky header: quarter, drive, down, score, progress bar |
| Create | `src/components/game/PlayArea.tsx` | Two-column player display with roll reveals |
| Create | `src/components/game/GameScreen.tsx` | Full state machine via `useReducer`; wires all game components |

---

## Task 1: Game Engine Pure Logic

**Files:**
- Create: `src/logic/gameEngine.ts`
- Create: `src/logic/gameEngine.test.ts`

**Interfaces:**
- Produces:
  - `rollDie(die: number[]): number`
  - `computeAdvantageBonus(offCall: 'run' | 'pass', defCall: 'run-stop' | 'pass-stop'): number`
  - `computeYardsGained(offRolls: number[], defRolls: number[], bonus: number): number`
  - `computeFGDifficulty(progress: number): number`
  - `getOffensePlayers(roster: Roster, play: 'run' | 'pass', wr: 'WR1' | 'WR2'): (Player | TeamUnit)[]`
  - `getDefensePlayers(roster: Roster, play: 'run' | 'pass'): (Player | TeamUnit)[]`
  - `getPlayerDie(player: Player | TeamUnit): number[]`

- [ ] **Step 1: Write failing tests**

```typescript
// src/logic/gameEngine.test.ts
import { describe, it, expect } from 'vitest'
import {
  rollDie, computeAdvantageBonus, computeYardsGained,
  computeFGDifficulty, getOffensePlayers, getDefensePlayers, getPlayerDie,
} from './gameEngine'
import type { Roster } from '../types'

const mockRoster: Roster = {
  QB: { id: 'qb', name: 'QB', position: 'QB', team: 'T', year: 2022, stats: {} as any, die: [10,10,10,10,10,10] },
  WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'T', year: 2022, stats: {} as any, die: [8,8,8,8,8,8] },
  WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'T', year: 2022, stats: {} as any, die: [6,6,6,6,6,6] },
  RB: { id: 'rb', name: 'RB', position: 'RB', team: 'T', year: 2022, stats: {} as any, die: [9,9,9,9,9,9] },
  K: { id: 'k', name: 'K', position: 'K', team: 'T', year: 2022, stats: {} as any, die: [7,7,7,7,7,7] },
  OLine: { id: 'ol', position: 'OLine', team: 'T', year: 2022, stats: {} as any, die: [5,5,5,5,5,5] },
  DLine: { id: 'dl', position: 'DLine', team: 'T', year: 2022, stats: {} as any, die: [4,4,4,4,4,4] },
  Secondary: { id: 'sec', position: 'Secondary', team: 'T', year: 2022, stats: {} as any, die: [3,3,3,3,3,3] },
}

describe('rollDie', () => {
  it('returns a value from the die array', () => {
    const die = [5, 10, 15]
    for (let i = 0; i < 20; i++) {
      expect(die).toContain(rollDie(die))
    }
  })
  it('uses fallback when die is empty', () => {
    const result = rollDie([])
    expect(result).toBe(5)
  })
})

describe('computeAdvantageBonus', () => {
  it('returns -5 when defense guesses correctly (run vs run-stop)', () => {
    expect(computeAdvantageBonus('run', 'run-stop')).toBe(-5)
  })
  it('returns -5 when defense guesses correctly (pass vs pass-stop)', () => {
    expect(computeAdvantageBonus('pass', 'pass-stop')).toBe(-5)
  })
  it('returns +5 when defense guesses wrong (run vs pass-stop)', () => {
    expect(computeAdvantageBonus('run', 'pass-stop')).toBe(5)
  })
  it('returns +5 when defense guesses wrong (pass vs run-stop)', () => {
    expect(computeAdvantageBonus('pass', 'run-stop')).toBe(5)
  })
})

describe('computeYardsGained', () => {
  it('subtracts def from off and adds bonus', () => {
    expect(computeYardsGained([10, 8], [5], 5)).toBe(18)  // (10+8) - 5 + 5
  })
  it('can produce negative yards', () => {
    expect(computeYardsGained([2], [10], -5)).toBe(-13)
  })
})

describe('computeFGDifficulty', () => {
  it('returns 15 at progress 65', () => {
    expect(computeFGDifficulty(65)).toBe(15)
  })
  it('returns 1 at progress 95', () => {
    expect(computeFGDifficulty(95)).toBe(1)
  })
  it('clamps to minimum 1 for progress >= 80', () => {
    expect(computeFGDifficulty(100)).toBe(1)
  })
})

describe('getOffensePlayers', () => {
  it('returns RB and OLine for run play', () => {
    const players = getOffensePlayers(mockRoster, 'run', 'WR1')
    expect(players.map(p => p.id)).toEqual(['rb', 'ol'])
  })
  it('returns QB, OLine, WR1 for pass play with WR1', () => {
    const players = getOffensePlayers(mockRoster, 'pass', 'WR1')
    expect(players.map(p => p.id)).toEqual(['qb', 'ol', 'wr1'])
  })
  it('returns QB, OLine, WR2 for pass play with WR2', () => {
    const players = getOffensePlayers(mockRoster, 'pass', 'WR2')
    expect(players.map(p => p.id)).toEqual(['qb', 'ol', 'wr2'])
  })
  it('filters out null slots', () => {
    const roster = { ...mockRoster, RB: null }
    const players = getOffensePlayers(roster, 'run', 'WR1')
    expect(players.map(p => p.id)).toEqual(['ol'])
  })
})

describe('getDefensePlayers', () => {
  it('returns DLine only for run defense', () => {
    const players = getDefensePlayers(mockRoster, 'run')
    expect(players.map(p => p.id)).toEqual(['dl'])
  })
  it('returns DLine and Secondary for pass defense', () => {
    const players = getDefensePlayers(mockRoster, 'pass')
    expect(players.map(p => p.id)).toEqual(['dl', 'sec'])
  })
})

describe('getPlayerDie', () => {
  it('returns the player die when present', () => {
    expect(getPlayerDie(mockRoster.QB!)).toEqual([10,10,10,10,10,10])
  })
  it('returns fallback when die is undefined', () => {
    const player = { ...mockRoster.QB!, die: undefined }
    expect(getPlayerDie(player)).toEqual([5,5,5,5,5,5])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic/gameEngine.test.ts
```
Expected: multiple FAIL with "Cannot find module './gameEngine'"

- [ ] **Step 3: Implement gameEngine.ts**

```typescript
// src/logic/gameEngine.ts
import type { Roster, Player, TeamUnit } from '../types'

const FALLBACK_DIE = [5, 5, 5, 5, 5, 5]

export function getPlayerDie(player: Player | TeamUnit): number[] {
  return player.die && player.die.length > 0 ? player.die : FALLBACK_DIE
}

export function rollDie(die: number[]): number {
  if (die.length === 0) return FALLBACK_DIE[0]
  return die[Math.floor(Math.random() * die.length)]
}

export function computeAdvantageBonus(
  offCall: 'run' | 'pass',
  defCall: 'run-stop' | 'pass-stop',
): number {
  const defCorrect =
    (offCall === 'run' && defCall === 'run-stop') ||
    (offCall === 'pass' && defCall === 'pass-stop')
  return defCorrect ? -5 : 5
}

export function computeYardsGained(
  offRolls: number[],
  defRolls: number[],
  bonus: number,
): number {
  const offSum = offRolls.reduce((a, b) => a + b, 0)
  const defSum = defRolls.reduce((a, b) => a + b, 0)
  return offSum - defSum + bonus
}

export function computeFGDifficulty(progress: number): number {
  return Math.max(1, 80 - progress)
}

export function getOffensePlayers(
  roster: Roster,
  play: 'run' | 'pass',
  wr: 'WR1' | 'WR2',
): (Player | TeamUnit)[] {
  if (play === 'run') {
    return [roster.RB, roster.OLine].filter(Boolean) as (Player | TeamUnit)[]
  }
  const wrPlayer = wr === 'WR1' ? roster.WR1 : roster.WR2
  return [roster.QB, roster.OLine, wrPlayer].filter(Boolean) as (Player | TeamUnit)[]
}

export function getDefensePlayers(
  roster: Roster,
  play: 'run' | 'pass',
): (Player | TeamUnit)[] {
  if (play === 'run') {
    return [roster.DLine].filter(Boolean) as (Player | TeamUnit)[]
  }
  return [roster.DLine, roster.Secondary].filter(Boolean) as (Player | TeamUnit)[]
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/logic/gameEngine.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/gameEngine.ts src/logic/gameEngine.test.ts
git commit -m "feat: add game engine pure logic functions"
```

---

## Task 2: Types, Store, and Routing Wiring

**Files:**
- Modify: `src/types/index.ts:4`
- Modify: `src/store/gameStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/round/RoundHub.tsx`

**Interfaces:**
- Consumes: `SimulationResult` (existing type)
- Produces:
  - Store action `startGame(): void`
  - Store action `recordGameResult(result: SimulationResult): void`

- [ ] **Step 1: Update GamePhase type**

In `src/types/index.ts`, change line 4:
```typescript
// Before:
export type GamePhase = 'setup' | 'round-hub' | 'draft-offer' | 'complete'

// After:
export type GamePhase = 'setup' | 'round-hub' | 'draft-offer' | 'game' | 'complete'
```

- [ ] **Step 2: Write failing store test**

In `src/store/gameStore.test.ts`, add:
```typescript
describe('startGame', () => {
  it('transitions phase to game', () => {
    const store = useGameStore.getState()
    // set to round-hub first
    useGameStore.setState({ phase: 'round-hub' })
    store.startGame()
    expect(useGameStore.getState().phase).toBe('game')
  })
})

describe('recordGameResult', () => {
  it('sets simulationResult and returns to round-hub', () => {
    const store = useGameStore.getState()
    useGameStore.setState({ phase: 'game' })
    const result: SimulationResult = {
      userTeamLabel: 'Your Team',
      opponentTeamLabel: 'KC',
      drives: [],
      userScore: 14,
      opponentScore: 7,
      winner: 'user',
    }
    store.recordGameResult(result)
    const state = useGameStore.getState()
    expect(state.phase).toBe('round-hub')
    expect(state.simulationResult).toEqual(result)
  })
})
```

Run:
```bash
npx vitest run src/store/gameStore.test.ts
```
Expected: FAIL — `startGame is not a function` / `recordGameResult is not a function`

- [ ] **Step 3: Update gameStore.ts**

In `src/store/gameStore.ts`:

1. **Remove** `simulateGame` from the `GameStore` interface and the implementation block entirely.

2. **Add** to the `GameStore` interface (in the actions section):
```typescript
startGame: () => void
recordGameResult: (result: SimulationResult) => void
```

3. **Add** to the `create<GameStore>` implementation block:
```typescript
startGame: () => {
  set({ phase: 'game' })
},

recordGameResult: (result: SimulationResult) => {
  set({ simulationResult: result, phase: 'round-hub' })
},
```

- [ ] **Step 4: Run store tests**

```bash
npx vitest run src/store/gameStore.test.ts
```
Expected: PASS (or existing tests still pass + new ones pass)

- [ ] **Step 5: Update RoundHub.tsx**

In `src/components/round/RoundHub.tsx`:

Change the destructure:
```typescript
// Before:
const {
  round, roster, currentOpponent, currentOpponentRoster, currentWeather,
  viewDraftOffer, simulateGame, draftComplete, isLoading, seasonLog,
  coins, shopComplete,
} = useGameStore()

// After:
const {
  round, roster, currentOpponent, currentOpponentRoster, currentWeather,
  viewDraftOffer, startGame, draftComplete, isLoading, seasonLog,
  coins, shopComplete,
} = useGameStore()
```

Change the button:
```typescript
// Before:
<Button onClick={simulateGame} disabled={isLoading}>
  Simulate Game
</Button>

// After:
<Button onClick={startGame} disabled={isLoading}>
  Simulate Game
</Button>
```

- [ ] **Step 6: Update App.tsx**

Add import and phase branch:
```typescript
// Add import at top (with other screen imports):
import { GameScreen } from './components/game/GameScreen'
```

In the main render, change the phase-conditional block (inside the `{showRoster ? ... : <>...</>}` section):
```typescript
// Before:
{phase === 'setup' && <SetupScreen />}
{phase === 'round-hub' && <RoundHub />}
{phase === 'draft-offer' && <DraftOffer />}
{phase === 'complete' && <CompleteScreen />}

// After:
{phase === 'setup' && <SetupScreen />}
{phase === 'round-hub' && <RoundHub />}
{phase === 'draft-offer' && <DraftOffer />}
{phase === 'game' && <GameScreen />}
{phase === 'complete' && <CompleteScreen />}
```

Also update the nav bar condition so it hides during the game phase:
```typescript
// Before:
{phase !== 'setup' && phase !== 'complete' ? (

// After:
{phase !== 'setup' && phase !== 'complete' && phase !== 'game' ? (
```

- [ ] **Step 7: Create placeholder GameScreen so App compiles**

Create `src/components/game/GameScreen.tsx` with just enough to compile (full implementation in Task 5):
```typescript
// src/components/game/GameScreen.tsx
export function GameScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Game loading…</p>
    </div>
  )
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/store/gameStore.ts src/App.tsx src/components/round/RoundHub.tsx src/components/game/GameScreen.tsx
git commit -m "feat: wire game phase into store and routing"
```

---

## Task 3: DriveProgressBar and GameHUD

**Files:**
- Create: `src/components/game/DriveProgressBar.tsx`
- Create: `src/components/game/GameHUD.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `DriveProgressBar({ progress: number })`
  - `GameHUD({ quarter, driveIndex, down, driveProgress, userScore, opponentScore, possession, opponentLabel })`

- [ ] **Step 1: Implement DriveProgressBar**

```typescript
// src/components/game/DriveProgressBar.tsx
interface DriveProgressBarProps {
  progress: number
}

export function DriveProgressBar({ progress }: DriveProgressBarProps) {
  return (
    <div className="relative w-full">
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {/* FG Range marker at 65% */}
      <div className="absolute top-0 h-4 w-0.5 bg-yellow-400" style={{ left: '65%' }} />
      {/* Redzone marker at 80% */}
      <div className="absolute top-0 h-4 w-0.5 bg-red-400" style={{ left: '80%' }} />
      {/* TD marker at 100% */}
      <div className="absolute top-0 h-4 w-0.5 bg-green-400" style={{ left: '99.5%' }} />
      {/* Labels below bar */}
      <div className="relative h-5 mt-1">
        <span className="absolute text-xs text-yellow-400 -translate-x-1/2" style={{ left: '65%' }}>FG</span>
        <span className="absolute text-xs text-red-400 -translate-x-1/2" style={{ left: '80%' }}>RZ</span>
        <span className="absolute text-xs text-green-400 -translate-x-1/2" style={{ left: '99.5%' }}>TD</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement GameHUD**

```typescript
// src/components/game/GameHUD.tsx
import { DriveProgressBar } from './DriveProgressBar'

interface GameHUDProps {
  quarter: number
  driveIndex: number
  down: number
  driveProgress: number
  userScore: number
  opponentScore: number
  possession: 'user' | 'opponent'
  opponentLabel: string
}

const DOWN_LABELS = ['1st', '2nd', '3rd', '4th']

export function GameHUD({
  quarter, driveIndex, down, driveProgress,
  userScore, opponentScore, possession, opponentLabel,
}: GameHUDProps) {
  const driveInQuarter = (driveIndex % 4) + 1
  const downLabel = DOWN_LABELS[down - 1] ?? `${down}th`
  const possessionLabel = possession === 'user' ? 'Your ball' : 'Their ball'

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-6 pt-4 pb-8">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Q{quarter}</span>
          <span className="text-xs text-gray-500">Drive {driveInQuarter}/4</span>
          <span className="text-xs text-gray-500">{downLabel} Down</span>
          <span className="text-xs text-gray-500">{possessionLabel}</span>
        </div>
        <div className="text-right tabular-nums">
          <p className="text-xs text-gray-500 mb-0.5">Your Team — {opponentLabel}</p>
          <p className="text-2xl font-bold text-white">
            {userScore} <span className="text-gray-600">—</span> {opponentScore}
          </p>
        </div>
      </div>
      <DriveProgressBar progress={driveProgress} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/game/DriveProgressBar.tsx src/components/game/GameHUD.tsx
git commit -m "feat: add DriveProgressBar and GameHUD components"
```

---

## Task 4: PlayArea Component

**Files:**
- Create: `src/components/game/PlayArea.tsx`

**Interfaces:**
- Consumes: `DieFaces` from `src/components/ui/DieFaces.tsx`, `getPlayerDie` from `src/logic/gameEngine.ts`
- Produces: `PlayArea(props: PlayAreaProps)`

```typescript
interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string  // one of the PlayPhase strings defined in GameScreen
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  opponentPlayCall: 'run' | 'pass' | null
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | null
}
```

- [ ] **Step 1: Implement PlayArea**

```typescript
// src/components/game/PlayArea.tsx
import type { Player, TeamUnit } from '../../types'
import { DieFaces } from '../ui/DieFaces'
import { getPlayerDie } from '../../logic/gameEngine'

interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string  // one of the PlayPhase strings defined in GameScreen
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  opponentPlayCall: 'run' | 'pass' | null
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | null
}

function getPlayerLabel(player: Player | TeamUnit): string {
  if ('name' in player) return `${player.name} (${player.position})`
  return `${player.team} ${player.position}`
}

function PlayerRollCard({
  player,
  roll,
  isNext,
}: {
  player: Player | TeamUnit
  roll: number | null
  isNext: boolean
}) {
  return (
    <div className={`bg-gray-900 border rounded-lg p-3 flex flex-col gap-2 transition-colors ${
      isNext ? 'border-indigo-500' : 'border-gray-800'
    }`}>
      <p className="text-xs text-gray-400 font-medium">{getPlayerLabel(player)}</p>
      <DieFaces faces={getPlayerDie(player)} />
      <div className={`text-center text-2xl font-bold tabular-nums ${
        roll !== null ? 'text-white' : 'text-gray-700'
      }`}>
        {roll !== null ? roll : '?'}
      </div>
    </div>
  )
}

const PLAY_CALL_LABELS: Record<string, string> = {
  run: 'RUN',
  pass: 'PASS',
  'run-stop': 'RUN STOP',
  'pass-stop': 'PASS STOP',
}

const OUTCOME_LABELS: Record<string, string> = {
  TD: '🏈 TOUCHDOWN!',
  FG: '✅ FIELD GOAL!',
  'FG-missed': '❌ FG MISSED',
  Punt: '📤 PUNT',
}

const OUTCOME_COLORS: Record<string, string> = {
  TD: 'text-green-400',
  FG: 'text-blue-400',
  'FG-missed': 'text-red-400',
  Punt: 'text-gray-400',
}

export function PlayArea({
  possession, phase,
  offPlayers, defPlayers,
  offRolls, defRolls,
  offensePlayCall, defensePlayCall, opponentPlayCall,
  yardsGained, fgRoll, fgDifficulty, driveOutcome,
}: PlayAreaProps) {
  const offLabel = possession === 'user' ? 'Your Offense' : 'Opp Offense'
  const defLabel = possession === 'user' ? 'Opp Defense' : 'Your Defense'

  const offRollingIdx = phase === 'rolling-offense'
    ? offRolls.findIndex(r => r === null)
    : -1
  const defRollingIdx = phase === 'rolling-defense'
    ? defRolls.findIndex(r => r === null)
    : -1

  const showMatchup = offensePlayCall !== null || defensePlayCall !== null || opponentPlayCall !== null
  const matchupOff = offensePlayCall ?? opponentPlayCall
  const matchupDef = defensePlayCall

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* Play call matchup badge */}
      {showMatchup && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {matchupOff && (
            <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupOff]}
            </span>
          )}
          {matchupOff && matchupDef && <span className="text-gray-600">vs</span>}
          {matchupDef && (
            <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupDef]}
            </span>
          )}
        </div>
      )}

      {/* Player columns */}
      {(offPlayers.length > 0 || defPlayers.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Offense column */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{offLabel}</p>
            <div className="flex flex-col gap-2">
              {offPlayers.map((player, i) => (
                <PlayerRollCard
                  key={player.id}
                  player={player}
                  roll={offRolls[i] ?? null}
                  isNext={offRollingIdx === i}
                />
              ))}
            </div>
            {phase !== 'rolling-offense' && offRolls.length > 0 && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{(offRolls as number[]).reduce((a, b) => a + b, 0)}</span>
              </p>
            )}
          </div>

          {/* Defense column */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{defLabel}</p>
            <div className="flex flex-col gap-2">
              {defPlayers.map((player, i) => (
                <PlayerRollCard
                  key={player.id}
                  player={player}
                  roll={defRolls[i] ?? null}
                  isNext={defRollingIdx === i}
                />
              ))}
            </div>
            {phase !== 'rolling-offense' && phase !== 'rolling-defense' && defRolls.length > 0 && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{(defRolls as number[]).reduce((a, b) => a + b, 0)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Yards result */}
      {yardsGained !== null && (
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Yards Gained</p>
          <p className={`text-3xl font-bold tabular-nums ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {yardsGained >= 0 ? '+' : ''}{yardsGained}
          </p>
        </div>
      )}

      {/* FG attempt */}
      {(phase === 'fg-roll' || phase === 'fg-result') && fgDifficulty !== null && (
        <div className="text-center bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">FG Attempt — Need to beat</p>
          <p className="text-2xl font-bold text-yellow-400">{fgDifficulty}</p>
          {fgRoll !== null && (
            <p className="mt-2 text-lg text-white font-bold tabular-nums">Kicker rolled: {fgRoll}</p>
          )}
        </div>
      )}

      {/* Drive outcome */}
      {driveOutcome && (
        <div className="text-center">
          <p className={`text-2xl font-bold ${OUTCOME_COLORS[driveOutcome] ?? 'text-white'}`}>
            {OUTCOME_LABELS[driveOutcome] ?? driveOutcome}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/game/PlayArea.tsx
git commit -m "feat: add PlayArea component for interactive game display"
```

---

## Task 5: GameScreen State Machine

**Files:**
- Modify: `src/components/game/GameScreen.tsx` (replace placeholder)

**Interfaces:**
- Consumes:
  - `GameHUD({ quarter, driveIndex, down, driveProgress, userScore, opponentScore, possession, opponentLabel })`
  - `PlayArea(props: PlayAreaProps)`
  - `rollDie`, `computeAdvantageBonus`, `computeYardsGained`, `computeFGDifficulty`, `getOffensePlayers`, `getDefensePlayers`, `getPlayerDie` from `src/logic/gameEngine.ts`
  - `useGameStore` → `roster`, `currentOpponentRoster`, `currentOpponent`, `recordGameResult`
  - `DriveResult`, `SimulationResult`, `Roster`, `Player`, `TeamUnit` from `src/types`
- Produces: complete interactive game loop ending with `recordGameResult(SimulationResult)`

- [ ] **Step 1: Implement GameScreen.tsx**

```typescript
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
import type { Roster, Player, TeamUnit, DriveResult, SimulationResult } from '../../types'

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
  outcome: 'TD' | 'FG' | 'Punt',
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
      const quarter = Math.floor(state.driveIndex / 4) + 1

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
        if (newProgress >= 60) {
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
      const driveResult = buildDriveResult(state, made ? 'FG' : 'Punt', made ? 3 : 0)
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
  }, [state.phase])

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass

- [ ] **Step 4: Smoke-test in browser**

```bash
npm run dev
```

Walk through a full game:
1. From Round Hub, click "Simulate Game" → game screen appears with HUD
2. Click "Run" → two player cards appear, Step reveals each roll → yards shown → Step advances down
3. Click "Pass" → WR choice appears → pick WR → three player cards appear
4. Verify progress bar fills and markers appear at 65/80/100
5. Let a drive reach 4th down with progress ≥ 65 → FG attempt appears → Step reveals kicker roll → outcome shown
6. After 16 drives, SimulationModal appears with full drive log
7. Click "Continue →" → returns to Round Hub

- [ ] **Step 5: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: implement interactive game simulation with step-by-step dice rolling"
```
